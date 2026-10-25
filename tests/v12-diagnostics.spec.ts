import { evidencePath } from './support/environment';
import { test, expect } from '@playwright/test';
test('logs group entries, retain exceptions, filter explicitly and copy selected entry', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/tools/log-inspector/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Inspect logs', exact: true }).click();
	await expect(page.getByText('Possible deepest reported cause:', { exact: false })).toContainText(
		'java.net.ConnectException'
	);
	await page.getByRole('button', { name: 'Copy log entry at line 2', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Suppressed:');
	await page.getByRole('combobox', { name: 'Level', exact: true }).selectOption('ERROR');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Inspect logs', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).visibleCount).toBe(
		1
	);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Java / Spring logs', exact: true })).toHaveText(
		''
	);
});
test('environment inputs are hidden and no secret enters exports, storage, URL, network or errors', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const marker = 'synthetic-env-secret-v12-489a';
	const requests: string[] = [];
	const logs: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	await page.goto('/tools/environment-comparator/');
	await page
		.getByRole('textbox', { name: 'Environment A input', exact: true })
		.fill('TOKEN=' + marker + '\nSAME=1\nONLY_A=');
	await page
		.getByRole('textbox', { name: 'Environment B input', exact: true })
		.fill('TOKEN=other\nSAME=1\nONLY_B=');
	await expect(page.getByRole('textbox', { name: 'Environment A input', exact: true })).toHaveCSS(
		'color',
		'rgba(0, 0, 0, 0)'
	);
	await page.getByRole('button', { name: 'Compare environments', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: '2 common' })).toBeVisible();
	await page.getByRole('checkbox', { name: 'Reveal values in both editors', exact: true }).check();
	await expect(
		page.getByRole('textbox', { name: 'Environment A input', exact: true })
	).toContainText(marker);
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	const output = await page.evaluate(() => navigator.clipboard.readText());
	expect(output).not.toContain(marker);
	expect(JSON.parse(output).rows).toHaveLength(4);
	await page
		.getByRole('checkbox', { name: 'Reveal values in both editors', exact: true })
		.uncheck();
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	}
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await page.screenshot({ path: evidencePath('30-env-light-mobile.png'), fullPage: true });
	const metadata = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state
		})
	);
	expect(metadata + requests.join('') + logs.join('')).not.toContain(marker);
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'Environment A input', exact: true })).toHaveValue(
		''
	);
	await page
		.getByRole('textbox', { name: 'Environment A input', exact: true })
		.fill('TOKEN="' + marker);
	await page.getByRole('button', { name: 'Compare environments', exact: true }).click();
	await expect(page.getByRole('alert')).not.toContainText(marker);
});
