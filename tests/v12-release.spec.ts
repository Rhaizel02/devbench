import { targetOrigin } from './support/environment';
import { test, expect } from '@playwright/test';
import { tools } from '../src/lib/tools/tool-registry';
import { mkdir, writeFile } from 'node:fs/promises';
import { evidencePath } from './support/environment';
test('all seven V1.2 routes operate, reset, reload and keep payloads out of persistence and network', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const marker = 'synthetic-v12-release-secret-847cb';
	const requests: string[] = [],
		logs: string[] = [],
		errors: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	page.on('pageerror', (error) => errors.push(error.message));
	expect(tools).toHaveLength(27);
	const cases = [
		{
			slug: 'json-query',
			action: 'Run query',
			label: 'JSON document',
			value: JSON.stringify({ name: marker })
		},
		{
			slug: 'json-schema',
			action: 'Validate document',
			label: 'JSON document',
			value: JSON.stringify({ name: marker })
		},
		{
			slug: 'http-request',
			action: 'Generate request code',
			label: 'Request body',
			value: JSON.stringify({ name: marker })
		},
		{
			slug: 'http-headers',
			action: 'Inspect headers',
			label: 'HTTP header block',
			value: 'Authorization: Bearer ' + marker + '\nCache-Control: no-store'
		},
		{
			slug: 'log-inspector',
			action: 'Inspect logs',
			label: 'Java / Spring logs',
			value: 'INFO demo.App : ' + marker
		},
		{
			slug: 'environment-comparator',
			action: 'Compare environments',
			label: 'Environment A input',
			value: 'TOKEN=' + marker,
			native: true
		},
		{
			slug: 'pipeline-builder',
			action: 'Run pipeline',
			label: 'Pipeline input',
			value: Buffer.from(JSON.stringify({ name: marker })).toString('base64')
		}
	];
	const results = [];
	for (const item of cases) {
		expect((await page.goto('/tools/' + item.slug + '/'))?.status()).toBe(200);
		await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
		await page.getByRole('textbox', { name: item.label, exact: true }).fill(item.value);
		await page.getByRole('button', { name: item.action, exact: true }).click();
		await page.getByRole('button', { name: 'Copy output', exact: true }).click();
		const copied = await page.evaluate(() => navigator.clipboard.readText());
		expect(copied.length).toBeGreaterThan(0);
		if (['environment-comparator', 'http-request', 'http-headers'].includes(item.slug))
			expect(copied).not.toContain(marker);
		const state = await page.evaluate(async () => ({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state,
			caches: await caches.keys(),
			databases: (await indexedDB.databases()).map((db) => db.name)
		}));
		expect(JSON.stringify(state)).not.toContain(marker);
		expect(Object.keys(state.local).every((key) => key === 'devbench.preferences.v1')).toBe(true);
		expect(state.caches).toEqual([]);
		expect(state.databases).toEqual([]);
		expect(await context.cookies()).toEqual([]);
		const copy = page.getByRole('button', { name: 'Copy output', exact: true });
		const noCurrentCopy = async () => {
			await expect
				.poll(async () => (await copy.count()) === 0 || (await copy.isDisabled()))
				.toBe(true);
		};
		await page.getByRole('textbox', { name: item.label, exact: true }).fill(item.value + ' ');
		await noCurrentCopy();
		await page.getByRole('button', { name: 'Reset', exact: true }).click();
		await noCurrentCopy();
		const editor = page.getByRole('textbox', { name: item.label, exact: true });
		if (item.native) await expect(editor).toHaveValue('');
		else await expect(editor).toHaveText('');
		expect((await page.reload())?.status()).toBe(200);
		await noCurrentCopy();
		if (item.native) await expect(editor).toHaveValue('');
		else await expect(editor).toHaveText('');
		results.push({
			slug: item.slug,
			operation: item.action,
			copy: 'passed',
			staleResult: 'passed',
			reset: 'passed',
			reload: 200,
			privacy: 'passed'
		});
	}
	expect(requests.join('') + logs.join('')).not.toContain(marker);
	expect(requests.filter((url) => !url.startsWith(targetOrigin + '/'))).toEqual([]);
	expect(errors).toEqual([]);
	expect((await page.goto('/tools/not-a-tool/'))?.status()).toBe(404);
	if (process.env.PLAYWRIGHT_BASE_URL) {
		await mkdir(evidencePath('.'), { recursive: true });
		await writeFile(
			evidencePath('v12-operation-matrix.json'),
			JSON.stringify(results, null, 2) + '\n'
		);
	}
});
