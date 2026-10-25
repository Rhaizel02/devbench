import { test, expect, type Page } from '@playwright/test';
import { sampleContract } from '../src/lib/tools/openapi/fixtures';
import { evidencePath } from './support/environment';
import { mkdir } from 'node:fs/promises';
async function load(page: Page) {
	await page.goto('/tools/openapi-explorer/');
	await page.getByRole('button', { name: 'Synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Parse contract', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Synthetic Orders API' })).toBeVisible();
}
test('OpenAPI import, real exploration, reference navigation, errors, invalidation and clean reload', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await load(page);
	await expect(
		page
			.getByLabel('Operations', { exact: true })
			.getByRole('button', { name: /GET.*orders/ })
			.first()
	).toBeVisible();
	await page.getByLabel('Search operations', { exact: true }).fill('createOrder');
	await page.getByRole('button', { name: /POST.*Create an order/ }).click();
	await expect(page.getByRole('heading', { name: 'Request body · required' })).toBeVisible();
	await page.getByRole('button', { name: 'Open schema', exact: true }).first().click();
	await page.getByRole('button', { name: 'Open referenced schema', exact: true }).click();
	await expect(page.getByRole('button', { name: 'properties.quantity' })).toBeVisible();
	await page.getByRole('button', { name: 'Order', exact: true }).click();
	await page.getByRole('button', { name: 'properties.parent' }).click();
	await page.getByRole('button', { name: 'Open referenced schema', exact: true }).click();
	await page.getByRole('button', { name: 'properties.parent' }).click();
	await expect(page.getByText('Recursive edge', { exact: false })).toBeVisible();
	await page.getByRole('button', { name: 'Input', exact: true }).click();
	await page
		.getByRole('textbox', { name: 'OpenAPI source', exact: true })
		.fill('{"openapi":"3.2.0"}');
	await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Parse contract', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('unsupported');
	await page.getByLabel('Import OpenAPI file', { exact: true }).setInputFiles({
		name: 'synthetic.yaml',
		mimeType: 'text/yaml',
		buffer: Buffer.from(
			'openapi: 3.1.1\ninfo: {title: Imported contract, version: "1"}\ncomponents:\n  schemas:\n    Flag: {type: boolean}\n'
		)
	});
	await page.getByRole('button', { name: 'Parse contract', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Imported contract' })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'OpenAPI source', exact: true })).toBeEmpty();
	expect(errors).toEqual([]);
});
test('OpenAPI responsive themes and local-only payload lifecycle', async ({ page }) => {
	const traffic: string[] = [],
		messages: string[] = [],
		errors: string[] = [];
	page.on('request', (r) => traffic.push(r.method() + ' ' + r.url() + (r.postData() ?? '')));
	page.on('console', (m) => messages.push(m.type() + ':' + m.text()));
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/tools/openapi-explorer/');
	const payload = sampleContract();
	(payload.info as Record<string, string>).description = 'PRIVATE_OPENAPI_7539';
	await page
		.getByRole('textbox', { name: 'OpenAPI source', exact: true })
		.fill(JSON.stringify(payload));
	await page.getByRole('button', { name: 'Parse contract', exact: true }).click();
	await expect(page.getByText('PRIVATE_OPENAPI_7539', { exact: true })).toBeVisible();
	await mkdir(evidencePath('.'), { recursive: true });
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 1000 });
		for (const theme of ['dark', 'light']) {
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			await page.evaluate(() => document.fonts.ready);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
				width
			);
			await page.screenshot({
				path: evidencePath(`v15-explorer-${theme}-${width}.png`),
				fullPage: true,
				animations: 'disabled'
			});
		}
	}
	const state = await page.evaluate(async () => ({
		local: { ...localStorage },
		session: { ...sessionStorage },
		cookies: document.cookie,
		url: location.href,
		history: history.state,
		databases: await indexedDB.databases(),
		caches: await caches.keys()
	}));
	expect(JSON.stringify(state) + traffic.join('') + messages.join('')).not.toContain(
		'PRIVATE_OPENAPI_7539'
	);
	expect(state.databases).toEqual([]);
	expect(state.session).toEqual({});
	expect(state.cookies).toBe('');
	expect(traffic.every((t) => t.startsWith('GET http://127.0.0.1:4173/'))).toBe(true);
	expect(messages.filter((m) => m.startsWith('error:'))).toEqual([]);
	expect(errors).toEqual([]);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'OpenAPI source', exact: true })).toBeEmpty();
});
