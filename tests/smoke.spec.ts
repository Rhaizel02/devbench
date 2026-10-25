import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('strict JSON, real output, tree paths, clipboard and download', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const response = await page.goto('/tools/json-studio/');
	expect(response?.status()).toBe(200);
	const input = page.getByRole('textbox', { name: 'JSON input', exact: true });
	await input.fill('{"a":1,"b":[true,null]}');
	await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON output', exact: true })).toContainText(
		'"a": 1'
	);
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"a": 1');
	const downloadEvent = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download .json', exact: true }).click();
	const downloaded = await downloadEvent;
	expect(downloaded.suggestedFilename()).toBe('devbench-output.json');
	expect(JSON.parse(await readFile((await downloaded.path())!, 'utf8'))).toEqual({
		a: 1,
		b: [true, null]
	});
	await page.getByRole('button', { name: 'Tree', exact: true }).click();
	await page.getByRole('button', { name: 'Expand all', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Copy JSONPath $["b"][1]', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Copy JSONPath $["b"][1]', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('$["b"][1]');
	await input.fill('{"a":1,}');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Validate', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Invalid JSON');
	await expect(input).toContainText('{"a":1,}');
	await expect(page.getByText('Valid JSON', { exact: true })).toHaveCount(0);
	await input.fill('null');
	await page.getByRole('button', { name: 'Minify', exact: true }).click();
	await expect(page.getByText('Valid JSON', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toHaveText('');
	expect((await page.request.get('/tools/nonexistent-tool/')).status()).toBe(404);
});
test('navigation, themes, palette, favorites, responsive drawer and tabs', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Pin JSON Studio', exact: true }).click();
	await expect(
		page.getByRole('link', { name: /JSON Studio.*Open workspace/ }).first()
	).toBeVisible();
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.keyboard.press('Control+k');
	await page.getByRole('combobox', { name: 'Find a tool', exact: true }).fill('json studio');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/json-studio/);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
	await page.getByRole('tab', { name: 'Output', exact: true }).click();
	await expect(page.locator('#panel-output')).toBeVisible();
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByRole('tab', { name: 'Input', exact: true })).toBeFocused();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.goto('/tools/sql-formatter/');
	await expect(
		page.getByText('SQL Formatter is planned for a future block.', { exact: false })
	).toBeVisible();
});
test('one-shot Quick Paste and payload-free storage, URLs, requests and logs', async ({ page }) => {
	const marker = 'synthetic-private-marker';
	const requests: string[] = [];
	const logs: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	await page.goto('/');
	await page.getByLabel('Quick Paste input', { exact: true }).fill(JSON.stringify({ marker }));
	await page.getByRole('button', { name: 'Open in JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toContainText(
		marker
	);
	await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
	const storage = await page.evaluate(() => ({
		local: { ...localStorage },
		session: { ...sessionStorage },
		url: location.href
	}));
	expect(Object.keys(storage.local)).toEqual(['devbench.preferences.v1']);
	expect(storage.session).toEqual({});
	expect(JSON.stringify(storage)).not.toContain(marker);
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await page.getByRole('link', { name: 'Start with JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toHaveText('');
	expect(requests.join('')).not.toContain(marker);
	expect(logs.join('')).not.toContain(marker);
});
