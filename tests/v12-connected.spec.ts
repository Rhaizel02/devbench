import { test, expect } from '@playwright/test';
test('three recipes execute, intermediate preview is explicit, reordering fails at the right step and reset clears everything', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/tools/pipeline-builder/');
	for (const recipe of ['0', '1', '2']) {
		await page.getByLabel('Synthetic pipeline recipe').selectOption(recipe);
		await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
		await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
		await page.getByRole('button', { name: 'Copy output', exact: true }).click();
		const output = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
		expect(
			recipe === '2' ? output : output.items.map((item: { name: string }) => item.name)
		).toEqual(['Notebook', 'Pen']);
		await expect(
			page.getByRole('textbox', { name: 'Intermediate step 1', exact: true })
		).toHaveCount(0);
		await page.getByRole('button', { name: 'Preview step 1', exact: true }).click();
		await expect(
			page.getByRole('textbox', { name: 'Intermediate step 1', exact: true })
		).toBeVisible();
	}
	await page.getByLabel('Synthetic pipeline recipe').selectOption('0');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Move step 1 down', exact: true }).click();
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Step 1 failed');
	await expect(page.getByText('Step 2 · Base64 Decode · not-run', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Pipeline input', exact: true })).toHaveText('');
	await expect(page.getByLabel('Ordered pipeline steps').locator('select')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Preview step 1', exact: true })).toHaveCount(0);
});
test('JSON handoffs consume once, invalidate stale results and never persist payloads', async ({
	page
}) => {
	const marker = 'synthetic-handoff-v12-private-992d';
	const requests: string[] = [],
		logs: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	await page.goto('/tools/json-studio/');
	await page
		.getByRole('textbox', { name: 'JSON input', exact: true })
		.fill(JSON.stringify([{ name: marker }]));
	await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
	await page.getByRole('button', { name: 'JSON Query Explorer', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON document', exact: true })).toContainText(
		marker
	);
	await page.getByLabel('JSONPath expression').fill('$[*]');
	await page.getByRole('button', { name: 'Run query', exact: true }).click();
	await page.getByRole('button', { name: 'JSON ↔ CSV', exact: true }).click();
	await expect(
		page.getByRole('textbox', { name: 'JSON records input', exact: true })
	).toContainText(marker);
	const metadata = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state
		})
	);
	expect(metadata + requests.join('') + logs.join('')).not.toContain(marker);
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Quick Paste input', exact: true })).toBeVisible();
	await page.keyboard.press('Control+k');
	await page
		.getByRole('combobox', { name: 'Find a tool', exact: true })
		.fill('JSON Query Explorer');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('textbox', { name: 'JSON document', exact: true })).toHaveText('');
	for (const destination of ['JSON Studio', 'JSON Schema Lab']) {
		await page.goto('/tools/json-query/');
		await page
			.getByRole('textbox', { name: 'JSON document', exact: true })
			.fill(JSON.stringify([{ name: marker }]));
		await page.getByLabel('JSONPath expression').fill('$[*]');
		await page.getByRole('button', { name: 'Run query', exact: true }).click();
		await page.getByRole('button', { name: destination, exact: true }).click();
		await expect(
			page.getByRole('textbox', {
				name: destination === 'JSON Studio' ? 'JSON input' : 'JSON document',
				exact: true
			})
		).toContainText(marker);
	}
	await page.goto('/tools/base64-toolkit/');
	await page.getByLabel('Base64 direction').selectOption('decode');
	await page
		.getByRole('textbox', { name: 'Base64 input', exact: true })
		.fill(Buffer.from(JSON.stringify({ name: marker })).toString('base64'));
	await page.getByRole('button', { name: 'Decode Base64', exact: true }).click();
	await page.getByRole('button', { name: 'JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toContainText(
		marker
	);
	await page.goto('/tools/json-yaml/');
	await page.getByLabel('Conversion direction').selectOption('yaml-json');
	await page.getByRole('textbox', { name: 'YAML input', exact: true }).fill('name: ' + marker);
	await page.getByRole('button', { name: 'Convert', exact: true }).click();
	await page.getByRole('button', { name: 'JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toContainText(
		marker
	);
	await page.goto('/tools/json-schema/');
	await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption('infer');
	await page
		.getByRole('textbox', { name: 'JSON document', exact: true })
		.fill('{"name":"synthetic"}');
	await page.getByRole('button', { name: 'Infer schema', exact: true }).click();
	await page.getByRole('button', { name: 'JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toContainText(
		'$schema'
	);
});
test('HTTP handoffs are explicitly redacted; logs transfer as plain text', async ({ page }) => {
	await page.goto('/tools/http-request/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Generate request code', exact: true }).click();
	await page.getByRole('button', { name: 'cURL Inspector', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'cURL input', exact: true })).not.toContainText(
		'synthetic-token'
	);
	await page.getByRole('button', { name: 'Inspect cURL', exact: true }).click();
	await page.getByRole('button', { name: 'HTTP Request Builder', exact: true }).click();
	await expect(page.getByLabel('Request URL')).toHaveValue(/example.invalid/);
	await expect(
		page.getByRole('textbox', { name: 'Request headers', exact: true })
	).not.toContainText('synthetic-token');
	await page.goto('/tools/log-inspector/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Inspect logs', exact: true }).click();
	await page.getByRole('button', { name: 'Text Diff', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Left text input', exact: true })).toContainText(
		'Synthetic'
	);
});
