import { test, expect, type Page } from './support/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { evidencePath } from './support/environment';
async function open(page: Page) {
	await page.goto('/tools/test-data-generator/');
	await page.getByLabel('Test data utility', { exact: true }).selectOption('dataset');
	await expect(page.getByRole('button', { name: 'Generate dataset', exact: true })).toBeVisible();
}
async function download(page: Page) {
	const d = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	return readFile((await (await d).path())!, 'utf8');
}
async function shot(page: Page, name: string) {
	await mkdir(evidencePath('.'), { recursive: true });
	await page.evaluate(async () => {
		(document.activeElement as HTMLElement)?.blur();
		await document.fonts.ready;
		scrollTo(0, 0);
	});
	await page.screenshot({
		path: evidencePath('v22-' + name + '.png'),
		fullPage: true,
		animations: 'disabled'
	});
}
test('Dataset V2 actual related schema, valid FK, exact JSON clipboard/download and CSV safety/errors/reset', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await open(page);
	await page.getByLabel('Dataset preset', { exact: true }).selectOption('1');
	await page.getByRole('button', { name: 'Load dataset preset', exact: true }).click();
	await page.getByRole('button', { name: 'orders · 30', exact: true }).click();
	await page.locator('.schema-field').nth(1).locator('summary').click();
	await expect(page.getByLabel('Field 2 parent collection', { exact: true })).toHaveValue(
		'customers'
	);
	await expect(page.getByLabel('Field 2 parent key', { exact: true })).toHaveValue('id');
	await shot(page, 'dataset-related-schema');
	await page.getByRole('button', { name: 'Generate dataset', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
	const text = await download(page),
		data = JSON.parse(text);
	expect(data.customers).toHaveLength(12);
	expect(data.orders).toHaveLength(30);
	const ids = new Set(data.customers.map((r: { id: number }) => r.id));
	expect(data.orders.every((r: { customer_id: number }) => ids.has(r.customer_id))).toBe(true);
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(data);
	await page.getByLabel('Dataset result collection', { exact: true }).selectOption('orders');
	await page.getByRole('button', { name: 'Next rows', exact: true }).click();
	await expect(page.getByLabel('Dataset result', { exact: true })).toContainText(
		'Preview rows 11–20'
	);
	await shot(page, 'dataset-related-json');
	await page.getByLabel('Dataset preset', { exact: true }).selectOption('0');
	await page.getByRole('button', { name: 'Load dataset preset', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByLabel('Collection rows', { exact: true }).fill('3');
	await page.locator('.schema-field').nth(1).locator('summary').click();
	await page.getByLabel('Field 2 name', { exact: true }).fill('=column');
	await page.getByLabel('Field 2 mode', { exact: true }).selectOption('fixed');
	await page.getByLabel('Field 2 fixed JSON', { exact: true }).fill(JSON.stringify('=SUM(1,2)'));
	await page.getByRole('button', { name: 'Generate dataset', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
	expect(JSON.parse(await download(page))[0]['=column']).toBe('=SUM(1,2)');
	await page.getByLabel('Dataset export format', { exact: true }).selectOption('csv');
	const csv = await download(page);
	expect(csv).toContain('"\'=column"');
	expect(csv).toContain('"\'=SUM(1,2)"');
	await shot(page, 'dataset-csv-protection');
	await page.locator('.schema-field').nth(0).locator('summary').click();
	await page.getByLabel('Field 1 maximum', { exact: true }).fill('2');
	await page.getByRole('button', { name: 'Generate dataset', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('distinct value space');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await shot(page, 'dataset-error');
	await page.getByRole('button', { name: 'Reset dataset', exact: true }).click();
	await expect(page.getByLabel('Collection rows', { exact: true })).toHaveValue('12');
	await page.reload();
	await page.getByLabel('Test data utility', { exact: true }).selectOption('dataset');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
});
test('Workflow V2 actual themes, responsive layouts, metadata/catalog, memory-only privacy and observed dataset budgets', async ({
	page
}) => {
	test.setTimeout(60000);
	const marker = 'DATASET_PRIVATE_V22_雪',
		requests: string[] = [],
		errors: string[] = [],
		consoleText: string[] = [];
	page.on('request', (r) => requests.push(r.url() + ' ' + (r.postData() ?? '')));
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => consoleText.push(m.text()));
	await open(page);
	await page.getByLabel('Dataset seed', { exact: true }).fill(marker);
	await page.getByRole('button', { name: 'Generate dataset', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
	expect(await download(page)).not.toContain(marker);
	const measures: Record<string, number> = {};
	for (const rows of [20, 1000, 5000]) {
		await page.getByLabel('Collection rows', { exact: true }).fill(String(rows));
		const t = performance.now();
		await page.getByRole('button', { name: 'Generate dataset', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
		measures[String(rows)] = Math.round(performance.now() - t);
		expect(JSON.parse(await download(page))).toHaveLength(rows);
	}
	await writeFile(
		evidencePath('v22-dataset-performance.json'),
		JSON.stringify(
			{
				kind: 'Observed Playwright click-to-enabled end-to-end latency; not pure generation/FPS',
				milliseconds: measures
			},
			null,
			2
		)
	);
	for (const width of [1440, 768, 390])
		for (const theme of ['dark', 'light']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await shot(page, 'dataset-' + width + '-' + theme);
		}
	expect(requests.join(' ')).not.toContain(marker);
	expect(consoleText.join(' ')).not.toContain(marker);
	expect(
		await page.evaluate(() =>
			JSON.stringify({
				local: { ...localStorage },
				session: { ...sessionStorage },
				cookie: document.cookie,
				state: history.state
			})
		)
	).not.toContain(marker);
	expect(await page.evaluate(async () => await indexedDB.databases())).toEqual([]);
	expect(page.url()).not.toContain(marker);
	await page.goto('/tools/pipeline-builder/');
	await page.getByLabel('Synthetic pipeline recipe').selectOption('2');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: 'Preview step 2', exact: true }).click();
	for (const width of [1440, 768, 390])
		for (const theme of ['dark', 'light']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await shot(page, 'pipeline-' + width + '-' + theme);
		}
	await page.goto('/');
	await expect(page.locator('.directory-tool')).toHaveCount(30);
	expect(errors).toEqual([]);
});
