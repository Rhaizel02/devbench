import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
test('request code stays local, redacts secrets, imports cURL and produces real language outputs', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const external: string[] = [];
	page.on('request', (r) => {
		if (!r.url().startsWith('http://127.0.0.1:4173')) external.push(r.url());
	});
	await page.goto('/tools/http-request/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Generate request code', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	let code = await page.evaluate(() => navigator.clipboard.readText());
	expect(code).toContain('REDACTED');
	expect(code).not.toContain('synthetic-token');
	await page
		.getByRole('checkbox', {
			name: 'Reveal secrets in generated code — copy/download will include them',
			exact: true
		})
		.check();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	for (const target of ['curl', 'fetch', 'java', 'spring']) {
		if (target === 'java')
			await page
				.getByRole('textbox', { name: 'Request body', exact: true })
				.fill(JSON.stringify({ text: '雪\n"quote" \\ apostrophe\'', large: 'x'.repeat(65400) }));
		await page.getByLabel('Code target').selectOption(target);
		await page.getByRole('button', { name: 'Generate request code', exact: true }).click();
		await page.getByRole('button', { name: 'Copy output', exact: true }).click();
		code = await page.evaluate(() => navigator.clipboard.readText());
		expect(code).toContain('synthetic-token');
		if (target === 'java') {
			await mkdir('work/http-java', { recursive: true });
			await writeFile('work/http-java/GeneratedRequest.java', code);
		}
	}
	await page.getByText('Import a literal cURL command', { exact: true }).click();
	await page
		.getByRole('textbox', { name: 'Import cURL command', exact: true })
		.fill("curl 'https://example.invalid/?a=1&a=2' -X PUT -H 'X-Demo: one' --data-raw 'hello'");
	await page.getByRole('button', { name: 'Import cURL', exact: true }).click();
	await expect(page.getByLabel('HTTP method')).toHaveValue('PUT');
	await expect(page.getByRole('textbox', { name: 'Request body', exact: true })).toHaveText(
		'hello'
	);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByLabel('Request URL')).toHaveValue('');
	await expect(page.getByRole('textbox', { name: 'Request headers', exact: true })).toHaveText('');
	expect(external).toEqual([]);
});
test('header categories and contextual warnings are real and raw exports remain redacted', async ({
	page
}) => {
	await page.goto('/tools/http-headers/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Inspect headers', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Header analysis', exact: true })).toContainText(
		'Caching'
	);
	await page.getByRole('combobox', { name: 'View', exact: true }).selectOption('raw');
	await page.getByRole('button', { name: 'Inspect headers', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Header analysis', exact: true })).toContainText(
		'Set-Cookie: [REDACTED]'
	);
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	}
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await page.screenshot({ path: 'screenshots/actual/29-headers-dark-desktop.png', fullPage: true });
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'HTTP header block', exact: true })).toHaveText(
		''
	);
});
