import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('JSONPath real paths, values, clipboard/download, invalidation and direct routes', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/tools/json-query/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Run query', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: '2 results' })).toBeVisible();
	await page.getByRole('button', { name: 'Copy JSON Pointer', exact: true }).first().click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/products/0');
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual([
		{ name: 'Notebook', price: 12 },
		{ name: 'Pen', price: 3 }
	]);
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const downloaded = await download;
	expect(downloaded.suggestedFilename()).toBe('query-results.json');
	expect(JSON.parse(await readFile((await downloaded.path())!, 'utf8'))).toHaveLength(2);
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		for (const theme of ['dark', 'light']) {
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
		}
	}
	await page.screenshot({ path: 'screenshots/actual/27-query-light-desktop.png', fullPage: true });
	await page.getByLabel('JSONPath expression').fill('$.missing');
	await page.getByLabel('Query example', { exact: true }).selectOption('$');
	await expect(page.getByLabel('JSONPath expression')).toHaveValue('$');
	await page.getByLabel('JSONPath expression').fill('$.missing');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Run query', exact: true }).click();
	await expect(page.getByText('0 results — query succeeded with no matches.')).toBeVisible();
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'JSON document', exact: true })).toHaveText('');
});

test('Schema validation, inference and hostile pattern termination stay local', async ({
	page
}) => {
	const errors: string[] = [];
	const external: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('request', (request) => {
		if (!request.url().startsWith('http://127.0.0.1:4173')) external.push(request.url());
	});
	await page.goto('/tools/json-schema/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Validate document', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Validation report', exact: true })).toContainText(
		'"valid": true'
	);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await page.screenshot({ path: 'screenshots/actual/28-schema-dark-mobile.png', fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page
		.getByRole('textbox', { name: 'JSON Schema', exact: true })
		.fill('{"type":"string","pattern":"(a+)+$"}');
	await page
		.getByRole('textbox', { name: 'JSON document', exact: true })
		.fill(JSON.stringify('a'.repeat(10000) + '!'));
	await page.getByRole('button', { name: 'Validate document', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Worker terminated');
	await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption('infer');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Infer schema', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Inferred schema', exact: true })).toContainText(
		'required'
	);
	await page.getByRole('button', { name: 'Use inferred schema in validator', exact: true }).click();
	await page.getByRole('button', { name: 'Validate document', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Validation report', exact: true })).toContainText(
		'"valid": true'
	);
	expect(errors).toEqual([]);
	expect(external).toEqual([]);
});
