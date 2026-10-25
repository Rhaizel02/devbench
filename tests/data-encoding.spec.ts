import { evidencePath } from './support/environment';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('structural comparison and safe YAML conversion have real, current outputs', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/tools/json-diff/');
	await page
		.getByRole('textbox', { name: 'Left JSON input', exact: true })
		.fill('{"a":null,"b":1}');
	await page.getByRole('textbox', { name: 'Right JSON input', exact: true }).fill('{"b":"1"}');
	await page.getByRole('button', { name: 'Compare JSON', exact: true }).click();
	await expect(page.getByText('2 changes.', { exact: true })).toBeVisible();
	await expect(page.getByText('(absent)', { exact: true })).toBeVisible();
	await page.getByRole('textbox', { name: 'Left JSON input', exact: true }).fill('{"a":,}');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Compare JSON', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Left:');
	await page.goto('/tools/json-yaml/');
	await page
		.getByRole('textbox', { name: 'JSON input', exact: true })
		.fill('{"text":"café 世界","a":[true,null]}');
	await page.getByRole('button', { name: 'Convert', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('text: café 世界');
	const downloadEvent = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const downloaded = await downloadEvent;
	expect(await readFile((await downloaded.path())!, 'utf8')).toContain('text: café 世界');
	await page.getByRole('button', { name: 'Use output as input', exact: true }).click();
	await page.getByRole('button', { name: 'Convert', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON output', exact: true })).toContainText(
		'"text": "café 世界"'
	);
});

test('Base64 Unicode, URL parameter editing, mobile layout and memory cleanup', async ({
	page
}) => {
	const marker = 'synthetic-encoding-private-世界';
	const requests: string[] = [];
	const logs: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	await page.goto('/tools/base64-toolkit/');
	await page.getByRole('textbox', { name: 'UTF-8 input', exact: true }).fill(marker);
	await page.getByRole('button', { name: 'Encode Base64', exact: true }).click();
	await page.getByRole('button', { name: 'Use output as input', exact: true }).click();
	await page.getByRole('button', { name: 'Decode Base64', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'UTF-8 output', exact: true })).toContainText(
		marker
	);
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await page.goto('/tools/base64-toolkit/');
	await expect(page.getByRole('textbox', { name: 'UTF-8 input', exact: true })).toHaveText('');
	await page.goto('/tools/url-toolkit/');
	await page
		.getByRole('textbox', { name: 'URL input', exact: true })
		.fill('https://user:synthetic-secret@example.com/?a=one+two&a=&empty=');
	await page.getByRole('button', { name: 'Inspect URL', exact: true }).click();
	await expect(page.locator('.result-code')).toContainText('REDACTED:REDACTED');
	await expect(page.locator('.result-code')).not.toContainText('synthetic-secret');
	await page.getByLabel('Query value 2', { exact: true }).fill('café +');
	await expect(page.locator('.result-code')).toContainText('a=caf%C3%A9+%2B');
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	}
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({ path: evidencePath('09-url-light-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({ path: evidencePath('10-url-light-mobile.png'), fullPage: true });
	await page.goto('/tools/json-diff/');
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Compare JSON', exact: true }).click();
	await page.evaluate(() => scrollTo(0, 0));
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: evidencePath('11-diff-dark-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({ path: evidencePath('12-diff-dark-desktop.png'), fullPage: true });
	const persisted = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href
		})
	);
	expect(persisted).not.toContain(marker);
	expect(requests.join('')).not.toContain(marker);
	expect(logs.join('')).not.toContain(marker);
});
