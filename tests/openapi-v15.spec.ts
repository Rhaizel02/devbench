import { test, expect, type Page } from '@playwright/test';
import { sampleContract } from '../src/lib/tools/openapi/fixtures';
import { evidencePath } from './support/environment';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
test('OpenAPI comparison performs directional analysis, filters, exports and invalidates stale results', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await load(page);
	await page.getByRole('button', { name: 'Compare', exact: true }).click();
	await page.getByRole('button', { name: 'Synthetic evolution', exact: true }).click();
	await page.getByRole('button', { name: 'Compare contracts', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Comparison results', exact: true })
	).toBeVisible();
	await expect(page.getByText('Operation removed.', { exact: true })).toBeVisible();
	await page.getByLabel('Diff severity', { exact: true }).selectOption('breaking');
	await expect(page.getByText('Operation added.', { exact: true })).toHaveCount(0);
	await page.getByLabel('Diff export format', { exact: true }).selectOption('markdown');
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Operation removed');
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe('openapi-diff.md');
	expect(await readFile((await download.path())!, 'utf8')).not.toContain('Synthetic notebook');
	await page.screenshot({ path: evidencePath('v15-diff-dark-1440.png'), fullPage: true });
	await page
		.getByRole('textbox', { name: 'After OpenAPI source', exact: true })
		.fill('invalid: true');
	await expect(page.getByRole('heading', { name: 'Comparison results', exact: true })).toHaveCount(
		0
	);
	await page.getByRole('button', { name: 'Compare contracts', exact: true }).click();
	await expect(page.getByRole('alert')).toBeVisible();
	await page.getByRole('button', { name: 'Clear comparison', exact: true }).click();
	await expect(
		page.getByRole('textbox', { name: 'After OpenAPI source', exact: true })
	).toBeEmpty();
});
async function load(page: Page) {
	await page.goto('/tools/openapi-explorer/');
	await page.getByRole('button', { name: 'Synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Parse contract', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Synthetic Orders API' })).toBeVisible();
}
test('OpenAPI editable preview, four code targets, verified copy/download and one-shot redacted HTTP handoff', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await load(page);
	await page.getByRole('button', { name: /POST.*Create an order/ }).click();
	await page.getByRole('button', { name: 'Prepare request', exact: true }).click();
	await page
		.getByRole('textbox', { name: 'OpenAPI request body', exact: true })
		.fill('{"name":"PRIVATE_BODY_876"}');
	await page.getByRole('button', { name: 'Preview request', exact: true }).click();
	await expect(page.getByLabel('Prepared request preview', { exact: true })).toContainText(
		'[REDACTED body]'
	);
	await expect(page.getByLabel('Prepared request preview', { exact: true })).not.toContainText(
		'PRIVATE_BODY_876'
	);
	for (const target of ['curl', 'fetch', 'java', 'spring']) {
		await page.getByLabel('OpenAPI code target', { exact: true }).selectOption(target);
		await expect(page.getByLabel('OpenAPI generated code', { exact: true })).toContainText(
			'REDACTED'
		);
	}
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('RestClient');
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const download = await downloadPromise;
	expect(await readFile((await download.path())!, 'utf8')).toContain('RestClient');
	await page.getByRole('textbox', { name: 'OpenAPI request body', exact: true }).fill('invalid');
	await expect(page.getByRole('button', { name: 'HTTP Request Builder', exact: true })).toHaveCount(
		0
	);
	await page.getByRole('button', { name: 'Preview request', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('strict JSON');
	await page
		.getByRole('textbox', { name: 'OpenAPI request body', exact: true })
		.fill('{"name":"PRIVATE_BODY_876"}');
	await page.getByRole('button', { name: 'Preview request', exact: true }).click();
	await page.screenshot({ path: evidencePath('v15-request-dark-1440.png'), fullPage: true });
	await page.getByRole('button', { name: 'HTTP Request Builder', exact: true }).click();
	await expect(page).toHaveURL(/\/tools\/http-request\/$/);
	await expect(page.getByRole('textbox', { name: 'Request body', exact: true })).toHaveText(
		'[REDACTED body]'
	);
	await expect(page.getByLabel('Request URL', { exact: true })).toHaveValue(
		'https://sandbox.example.test/v1/orders'
	);
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'Request body', exact: true })).toBeEmpty();
});
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
