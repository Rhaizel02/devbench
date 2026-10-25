import { test, expect } from '@playwright/test';

test('cron DST, Unicode transforms and parameter-first SQL lists work in the browser', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/cron-explorer/');
	await page.getByLabel('Cron syntax', { exact: true }).selectOption('spring');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByLabel('Occurrence count', { exact: true }).fill('2');
	await page.getByRole('button', { name: 'Explore schedule', exact: true }).click();
	await expect(page.getByText('2024-10-27T00:30:00.000Z', { exact: true })).toBeVisible();
	await expect(page.getByText('2024-10-27T01:30:00.000Z', { exact: true })).toBeVisible();
	await page
		.getByRole('button', { name: 'Copy occurrence 2024-10-27T01:30:00.000Z', exact: true })
		.click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		'2024-10-27T01:30:00.000Z'
	);
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({ path: 'screenshots/actual/21-cron-dark-desktop.png', fullPage: true });
	await page.goto('/tools/string-toolkit/');
	await page
		.getByRole('textbox', { name: 'String input', exact: true })
		.fill('Café XMLHttpRequest 世界');
	await page.getByRole('button', { name: 'Transform text', exact: true }).click();
	await page.getByRole('button', { name: 'Copy camelCase', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('caféXmlHttpRequest世界');
	await page.goto('/tools/sql-in-builder/');
	await page
		.getByRole('textbox', { name: 'SQL IN values', exact: true })
		.fill("a\n'); DROP TABLE synthetic; --\na");
	await page.getByRole('button', { name: 'Build IN list', exact: true }).click();
	await page.getByRole('button', { name: 'Copy SQL snippet', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('IN ($1, $2)');
	await page.getByRole('button', { name: 'Copy bound parameters', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual([
		'a',
		"'); DROP TABLE synthetic; --"
	]);
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({ path: 'screenshots/actual/22-sql-in-light-mobile.png', fullPage: true });
	await page.getByLabel('SQL IN value type', { exact: true }).selectOption('numbers');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Build IN list', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Invalid numeric');
});

test('Quick Paste transfers once to explicit destinations and never stores or sends payloads', async ({
	page
}) => {
	const requests: string[] = [],
		logs: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	const jwt =
		Buffer.from('{"alg":"none"}').toString('base64url') +
		'.' +
		Buffer.from('{"sub":"synthetic-quick-private"}').toString('base64url') +
		'.';
	const cases = [
		{ input: jwt, name: 'JWT Inspector', label: 'JWT input', search: 'JWT Inspector' },
		{
			input: 'https://example.com/?marker=synthetic-quick-private',
			name: 'URL Toolkit',
			label: 'URL input',
			search: 'URL Toolkit'
		},
		{
			input: "SELECT 'synthetic-quick-private' AS value;",
			name: 'SQL Formatter',
			label: 'SQL input',
			search: 'SQL Formatter'
		},
		{
			input: '1700000000000',
			name: 'Timestamp Converter (milliseconds)',
			label: 'Timestamp input',
			search: 'Timestamp Converter'
		}
	];
	for (const item of cases) {
		await page.goto('/');
		await page.getByLabel('Quick Paste input', { exact: true }).fill(item.input);
		await expect(page).toHaveURL(/\/$/);
		if (item.search === 'Timestamp Converter') {
			await expect(
				page.getByRole('button', { name: 'Open in JSON Studio', exact: true })
			).toBeVisible();
			await expect(
				page.getByRole('button', { name: 'Open in Timestamp Converter (seconds)', exact: true })
			).toBeVisible();
			await page.setViewportSize({ width: 390, height: 844 });
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
		}
		await page.getByRole('button', { name: 'Open in ' + item.name, exact: true }).click();
		const input = page.getByRole('textbox', { name: item.label, exact: true });
		if (item.search === 'Timestamp Converter') {
			await expect(input).toHaveValue(item.input);
			await expect(page.getByLabel('Timestamp input format', { exact: true })).toHaveValue(
				'milliseconds'
			);
		} else await expect(input).toContainText(item.input);
		await page.getByRole('link', { name: 'Tools', exact: true }).click();
		await expect(page.getByLabel('Quick Paste input', { exact: true })).toBeVisible();
		await page.keyboard.press('Control+k');
		await page.getByRole('combobox', { name: 'Find a tool', exact: true }).fill(item.search);
		await page.keyboard.press('Enter');
		if (item.search === 'Timestamp Converter') await expect(input).toHaveValue('');
		else await expect(input).toHaveText('');
	}
	const saved = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href
		})
	);
	expect(saved).not.toContain('synthetic-quick-private');
	expect(saved).not.toContain(jwt);
	expect(requests.join('')).not.toContain('synthetic-quick-private');
	expect(requests.join('')).not.toContain(jwt);
	expect(logs.join('')).not.toContain('synthetic-quick-private');
});
