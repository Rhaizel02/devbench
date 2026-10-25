import { evidencePath } from './support/environment';
import { targetOrigin } from './support/environment';
import { test, expect } from '@playwright/test';

test('text diff, secure IDs and strict timestamp UI work with current outputs', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/text-diff/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Compare text', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
		'No newline at end of file'
	);
	await page.getByLabel('Text diff view', { exact: true }).selectOption('split');
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({
		path: evidencePath('15-text-diff-dark-desktop.png'),
		fullPage: true
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByLabel('Text diff view', { exact: true }).selectOption('unified');
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({
		path: evidencePath('16-text-diff-light-mobile.png'),
		fullPage: true
	});
	await page.goto('/tools/id-generator/');
	await page.getByLabel('ID batch size', { exact: true }).fill('3');
	await page.getByRole('button', { name: 'Generate IDs', exact: true }).click();
	await expect(page.locator('.value-row')).toHaveCount(3);
	await page.getByRole('button', { name: 'Copy ID 1', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
		/^[\da-f-]{14}4[\da-f-]{21}$/
	);
	await page.getByLabel('ID format', { exact: true }).selectOption('ulid');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Generate IDs', exact: true }).click();
	await expect(page.locator('.value-row code').first()).toHaveText(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
	await page.goto('/tools/timestamp-converter/');
	await page.getByLabel('Timestamp input format', { exact: true }).selectOption('iso');
	const input = page.getByLabel('Timestamp input', { exact: true });
	await input.fill('2023-02-29T12:00:00Z');
	await page.getByRole('button', { name: 'Convert timestamp', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Invalid calendar');
	await expect(input).toHaveValue('2023-02-29T12:00:00Z');
	await input.fill('2024-10-27T02:30:00+02:00');
	await page.getByLabel('Display timezone', { exact: true }).fill('Europe/Madrid');
	await page.getByRole('button', { name: 'Convert timestamp', exact: true }).click();
	await expect(page.getByText('2024-10-27T00:30:00.000Z', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Copy UTC ISO', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		'2024-10-27T00:30:00.000Z'
	);
	await page.setViewportSize({ width: 768, height: 1024 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({
		path: evidencePath('17-timestamp-light-tablet.png'),
		fullPage: true
	});
});

test('all twelve V1 tools have real deep routes, palette navigation and payload cleanup', async ({
	page
}) => {
	const errors: string[] = [],
		external: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('request', (request) => {
		if (!request.url().startsWith(targetOrigin + '/')) external.push(request.url());
	});
	const routes: [string, string][] = [
		['json-studio', 'Format JSON'],
		['json-diff', 'Compare JSON'],
		['json-yaml', 'Convert'],
		['base64-toolkit', 'Encode Base64'],
		['url-toolkit', 'Inspect URL'],
		['jwt-inspector', 'Decode JWT'],
		['hash-generator', 'Calculate hash'],
		['sql-formatter', 'Format SQL'],
		['regex-tester', 'Test regex'],
		['text-diff', 'Compare text'],
		['id-generator', 'Generate IDs'],
		['timestamp-converter', 'Convert timestamp']
	];
	for (const [slug, action] of routes) {
		expect((await page.goto('/tools/' + slug + '/'))?.status()).toBe(200);
		await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible();
		await expect(page.getByText('A place on the workbench.', { exact: true })).toHaveCount(0);
	}
	await page.goto('/tools/text-diff/');
	await page
		.getByRole('textbox', { name: 'Left text input', exact: true })
		.fill('synthetic-private-text-diff-marker');
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await expect(page.getByText(/\d+ tools · \d+ available/)).toBeVisible();
	await page.keyboard.press('Control+k');
	await page.getByRole('combobox', { name: 'Find a tool', exact: true }).fill('text diff');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('textbox', { name: 'Left text input', exact: true })).toHaveText('');
	await page.getByRole('button', { name: 'Pin tool', exact: false }).click();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toBeVisible();
	expect((await page.request.get('/tools/unknown-tool/')).status()).toBe(404);
	const stored = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href
		})
	);
	expect(stored).not.toContain('synthetic-private-text-diff-marker');
	expect(errors).toEqual([]);
	expect(external).toEqual([]);
});
