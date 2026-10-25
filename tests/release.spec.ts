import { evidencePath } from './support/environment';
import { targetOrigin } from './support/environment';
import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { tools } from '../src/lib/tools/tool-registry';

test('release matrix: all 18 static tools operate, copy, reset, reload and handle invalid/empty input privately', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const marker = 'synthetic-private-release-98fa';
	const requests: string[] = [],
		logs: string[] = [],
		errors: string[] = [];
	page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	page.on('pageerror', (error) => errors.push(error.message));
	const jwt =
		Buffer.from('{"alg":"none"}').toString('base64url') +
		'.' +
		Buffer.from(JSON.stringify({ sub: marker })).toString('base64url') +
		'.';
	const cases: {
		slug: string;
		action: string;
		label?: string;
		value?: string;
		invalid?: string;
		invalidLabel?: string;
		native?: boolean;
		emptyValid?: boolean;
	}[] = [
		{
			slug: 'json-studio',
			action: 'Format JSON',
			label: 'JSON input',
			value: JSON.stringify({ marker }),
			invalid: '{"a":,}'
		},
		{
			slug: 'json-diff',
			action: 'Compare JSON',
			label: 'Left JSON input',
			value: JSON.stringify({ marker }),
			invalid: '['
		},
		{
			slug: 'json-yaml',
			action: 'Convert',
			label: 'JSON input',
			value: JSON.stringify({ marker }),
			invalid: '['
		},
		{
			slug: 'base64-toolkit',
			action: 'Encode Base64',
			label: 'UTF-8 input',
			value: marker,
			emptyValid: true
		},
		{
			slug: 'url-toolkit',
			action: 'Inspect URL',
			label: 'URL input',
			value: 'https://example.com/?marker=' + marker,
			invalid: 'relative/path'
		},
		{ slug: 'jwt-inspector', action: 'Decode JWT', label: 'JWT input', value: jwt, invalid: 'a.b' },
		{
			slug: 'hash-generator',
			action: 'Calculate hash',
			label: 'Text to hash',
			value: marker,
			emptyValid: true
		},
		{
			slug: 'sql-formatter',
			action: 'Format SQL',
			label: 'SQL input',
			value: "SELECT '" + marker + "' AS value;",
			invalid: "SELECT 'unclosed"
		},
		{
			slug: 'regex-tester',
			action: 'Test regex',
			label: 'Regex test text',
			value: marker,
			invalidLabel: 'Regex pattern',
			invalid: '[',
			emptyValid: true
		},
		{
			slug: 'text-diff',
			action: 'Compare text',
			label: 'Left text input',
			value: marker,
			emptyValid: true
		},
		{
			slug: 'id-generator',
			action: 'Generate IDs',
			invalidLabel: 'ID batch size',
			invalid: '',
			native: true,
			emptyValid: true
		},
		{
			slug: 'timestamp-converter',
			action: 'Convert timestamp',
			label: 'Timestamp input',
			value: '1700000000',
			invalid: marker,
			native: true
		},
		{
			slug: 'json-csv',
			action: 'Convert',
			label: 'JSON records input',
			value: JSON.stringify([{ marker }]),
			invalid: '{'
		},
		{
			slug: 'json-code',
			action: 'Infer types',
			label: 'JSON sample input',
			value: JSON.stringify({ [marker]: 'sample' }),
			invalid: '{'
		},
		{
			slug: 'curl-inspector',
			action: 'Inspect cURL',
			label: 'cURL input',
			value: `curl 'https://example.com/?api_key=${marker}' -H 'Authorization: ${marker}'`,
			invalid: 'curl $(unsupported)'
		},
		{
			slug: 'cron-explorer',
			action: 'Explore schedule',
			label: 'Cron expression',
			value: '* * * * *',
			invalid: '* *',
			native: true
		},
		{
			slug: 'string-toolkit',
			action: 'Transform text',
			label: 'String input',
			value: marker,
			emptyValid: true
		},
		{
			slug: 'sql-in-builder',
			action: 'Build IN list',
			label: 'SQL IN values',
			value: marker,
			invalid: ''
		}
	];
	expect(tools.filter((tool) => tool.version === 'V1' || tool.version === 'V1.1')).toHaveLength(18);
	expect(tools.every((tool) => tool.status === 'available')).toBe(true);
	const matrix: Record<string, unknown>[] = [];
	for (const item of cases) {
		const tool = tools.find((tool) => tool.slug === item.slug)!;
		expect((await page.goto('/tools/' + item.slug + '/'))?.status()).toBe(200);
		await expect(page).toHaveTitle(tool.name + ' — DevBench');
		const action = page.getByRole('button', { name: item.action, exact: true });
		await expect(action).toBeVisible();
		if (item.slug === 'json-diff')
			await page.getByRole('textbox', { name: 'Right JSON input', exact: true }).fill('{}');
		if (item.label)
			await page.getByRole('textbox', { name: item.label, exact: true }).fill(item.value!);
		await action.click();
		const copy = page.getByRole('button', { name: 'Copy output', exact: true });
		const noCurrentCopy = async () => {
			await expect
				.poll(async () => (await copy.count()) === 0 || (await copy.isDisabled()))
				.toBe(true);
		};
		await expect(copy).toBeEnabled();
		await copy.click();
		expect((await page.evaluate(() => navigator.clipboard.readText())).length).toBeGreaterThan(0);
		await page.getByRole('button', { name: 'Reset', exact: true }).click();
		await noCurrentCopy();
		await page.reload();
		await expect(action).toBeVisible();
		await noCurrentCopy();
		if (item.label) {
			const input = page.getByRole('textbox', { name: item.label, exact: true });
			if (item.native) await expect(input).toHaveValue('');
			else await expect(input).toHaveText('');
		}
		const disabled = await action.isDisabled();
		if (!disabled) {
			await action.click();
			if (item.slug === 'json-studio')
				await expect(
					page.getByText('Paste JSON into the input to get started.', { exact: true })
				).toBeVisible();
			else if (item.emptyValid) await expect(copy).toBeEnabled();
			else await expect(page.getByRole('alert')).toBeVisible();
		}
		if (item.invalid !== undefined) {
			await page
				.getByRole(item.invalidLabel === 'ID batch size' ? 'spinbutton' : 'textbox', {
					name: item.invalidLabel ?? item.label!,
					exact: true
				})
				.fill(item.invalid);
			await action.click();
			await expect(page.getByRole('alert')).toBeVisible();
			await noCurrentCopy();
		}
		matrix.push({
			id: tool.id,
			slug: tool.slug,
			direct: 200,
			operation: 'passed',
			clipboard: 'passed',
			reset: 'passed',
			reload: 'passed',
			empty:
				item.slug === 'json-studio'
					? 'informative empty state'
					: disabled
						? 'action disabled'
						: item.emptyValid
							? 'valid empty result'
							: 'actionable error',
			invalid:
				item.invalid !== undefined ? 'passed' : 'all text accepted; byte limits tested separately'
		});
	}
	expect((await page.request.get('/tools/unknown-release-tool/')).status()).toBe(404);
	const state = await page.evaluate(async () => ({
		local: { ...localStorage },
		session: { ...sessionStorage },
		history: history.state,
		url: location.href,
		cookie: document.cookie,
		caches: await caches.keys(),
		databases: await indexedDB.databases()
	}));
	expect(Object.keys(state.local)).toEqual(['devbench.preferences.v1']);
	expect(
		Object.keys(state.session).every((key) =>
			['sveltekit:history-info', 'sveltekit:navigation-snapshot', 'sveltekit:snapshot'].includes(
				key
			)
		)
	).toBe(true);
	for (const [key, metadata] of Object.entries(state.session)) {
		const value = JSON.parse(metadata);
		if (key === 'sveltekit:history-info')
			for (const position of Object.values(value) as {
				resetIndex: number;
				scroll: { x: number; y: number };
			}[]) {
				expect(Object.keys(position).sort()).toEqual(['resetIndex', 'scroll']);
				expect(Object.keys(position.scroll).sort()).toEqual(['x', 'y']);
				expect(
					[position.resetIndex, position.scroll.x, position.scroll.y].every(Number.isFinite)
				).toBe(true);
			}
		else expect(value).toEqual({});
	}
	expect(state.cookie).toBe('');
	expect(state.caches).toEqual([]);
	expect(state.databases).toEqual([]);
	expect(JSON.stringify(state)).not.toContain(marker);
	expect(JSON.stringify(state)).not.toContain(jwt);
	expect(requests.join('')).not.toContain(marker);
	expect(requests.join('')).not.toContain(jwt);
	expect(logs.join('')).not.toContain(marker);
	expect(errors).toEqual([]);
	expect(requests.filter((url) => !url.startsWith(targetOrigin + '/'))).toEqual([]);
	await mkdir(evidencePath('.'), { recursive: true });
	await writeFile(
		evidencePath('release-matrix.json'),
		JSON.stringify(
			{
				tools: matrix,
				privacy: 'passed: storage/history/URL/cookies/Cache API/IndexedDB/requests/logs',
				externalRequests: 0,
				runtimeErrors: 0,
				unknownRoute: 404
			},
			null,
			2
		) + '\n'
	);
});

test('large diff/CSV inputs reject before processing and the interface stays usable', async ({
	page
}) => {
	await page.goto('/tools/text-diff/');
	await page
		.getByRole('textbox', { name: 'Left text input', exact: true })
		.fill('x'.repeat(131073));
	await page.getByRole('button', { name: 'Compare text', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('limit');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await page.goto('/tools/json-csv/');
	await page.getByLabel('CSV conversion direction', { exact: true }).selectOption('csv-json');
	await page
		.getByRole('textbox', { name: 'CSV input', exact: true })
		.fill('header\n' + 'x'.repeat(1024 * 1024));
	await page.getByRole('button', { name: 'Convert', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('limit');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'CSV input', exact: true })).toHaveText('');
});

test('blocked preferences and clipboard report real failures while transformation still works', async ({
	page
}) => {
	await page.addInitScript(() => {
		Storage.prototype.getItem = () => {
			throw new DOMException('Blocked', 'SecurityError');
		};
		Storage.prototype.setItem = () => {
			throw new DOMException('Blocked', 'SecurityError');
		};
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: () => Promise.reject(new DOMException('Blocked', 'NotAllowedError')) }
		});
	});
	await page.goto('/tools/base64-toolkit/');
	await page
		.getByRole('textbox', { name: 'UTF-8 input', exact: true })
		.fill('synthetic blocked-permission example');
	await page.getByRole('button', { name: 'Encode Base64', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	await expect(
		page.getByText('Clipboard blocked. Select and copy the output manually.', { exact: true })
	).toBeVisible();
	await expect(page.getByText('Copied', { exact: true })).toHaveCount(0);
	await expect(page.locator('.storage-warning')).toContainText('could not be saved');
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole('tab', { name: 'Output', exact: true }).focus();
	await page.keyboard.press('Home');
	await expect(page.getByRole('tab', { name: 'Input', exact: true })).toBeFocused();
	await page.keyboard.press('End');
	await expect(page.getByRole('tab', { name: 'Output', exact: true })).toBeFocused();
});
