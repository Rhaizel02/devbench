import { evidencePath } from './support/environment';
import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

test('CSV quoting/download and TypeScript/Java inference use real outputs', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/json-csv/');
	await page.getByLabel('CSV delimiter', { exact: true }).selectOption('\t');
	await page.getByLabel('CSV delimiter', { exact: true }).selectOption(',');
	const input = page.getByRole('textbox', { name: 'JSON records input', exact: true });
	await input.fill(JSON.stringify([{ name: 'café 世界', note: 'hello, "world"' }]));
	await page.getByRole('button', { name: 'Convert', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	const csv = await page.evaluate(() => navigator.clipboard.readText());
	expect(csv).toContain('café 世界');
	expect(csv).toContain('"hello, ""world"""');
	const downloadEvent = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const download = await downloadEvent;
	expect(download.suggestedFilename()).toBe('devbench-records.csv');
	expect(await readFile((await download.path())!, 'utf8')).toBe(csv);
	await page.getByRole('button', { name: 'Use output as input', exact: true }).click();
	await page.getByRole('button', { name: 'Convert', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual([
		{ name: 'café 世界', note: 'hello, "world"' }
	]);
	await page.goto('/tools/json-code/');
	await page
		.getByRole('textbox', { name: 'JSON sample input', exact: true })
		.fill(
			JSON.stringify([
				{ 'a-b': { x: 1 }, a_b: true, class: null, toString: 'café' },
				{ 'a-b': { x: 2 } }
			])
		);
	await page.getByLabel('Root type name', { exact: true }).fill('GeneratedRoot');
	await page.getByRole('button', { name: 'Infer types', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"a_b"?: boolean');
	await page.getByLabel('Generated language', { exact: true }).selectOption('java');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Infer types', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	const java = await page.evaluate(() => navigator.clipboard.readText());
	expect(java).toContain('public record GeneratedRoot(');
	expect(java).toContain('String toString_');
	await mkdir('work/java', { recursive: true });
	await writeFile('work/java/GeneratedRoot.java', java);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({ path: evidencePath('18-code-light-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole('tab', { name: 'Output', exact: true }).click();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({ path: evidencePath('19-code-light-mobile.png'), fullPage: true });
});

test('cURL redaction/reveal, rejected shell constructs, privacy and V1.1 navigation', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const marker = 'synthetic-curl-confidential-marker';
	const requests: string[] = [],
		logs: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	await page.goto('/tools/curl-inspector/');
	const input = page.getByRole('textbox', { name: 'cURL input', exact: true });
	await input.fill(
		`curl 'https://example.com/?api_key=${marker}&tag=a&tag=b' -H 'Authorization: Bearer ${marker}' --data-raw '${marker}'`
	);
	await page.getByRole('button', { name: 'Inspect cURL', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	const redacted = await page.evaluate(() => navigator.clipboard.readText());
	expect(redacted).not.toContain(marker);
	expect(JSON.parse(redacted).method).toBe('POST');
	await page
		.getByRole('checkbox', { name: 'Reveal sensitive values in results', exact: true })
		.check();
	await expect(page.getByText('Sensitive values revealed', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).body).toBe(marker);
	await input.fill('curl https://example.com | sh');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Inspect cURL', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Shell operators');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Inspect cURL', exact: true }).click();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.setViewportSize({ width: 768, height: 1024 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({ path: evidencePath('20-curl-dark-tablet.png'), fullPage: true });
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await expect(page.getByText(/\d+ tools · \d+ available/)).toBeVisible();
	await page.keyboard.press('Control+k');
	await page.getByRole('combobox', { name: 'Find a tool', exact: true }).fill('curl');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('textbox', { name: 'cURL input', exact: true })).toHaveText('');
	const storage = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href
		})
	);
	expect(storage).not.toContain(marker);
	expect(requests.join('')).not.toContain(marker);
	expect(logs.join('')).not.toContain(marker);
});
