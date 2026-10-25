import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { evidencePath, targetOrigin } from './support/environment';
import { tools } from '../src/lib/tools/tool-registry';

test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Published-deployment audit requires an explicit URL.');

const referenceCommit = '596e84fcca23655c34b5251365ca570313ceeed0';
const referenceDeployment = 'https://f90b68ea.devbench-aw3.pages.dev';
const previousDeployment = 'https://f72dc9f2.devbench-aw3.pages.dev';
const saveEvidence = async (name: string, value: unknown) => {
	await mkdir(evidencePath('.'), { recursive: true });
	await writeFile(evidencePath(name), JSON.stringify(value, null, 2) + '\n');
};

test('production provenance matches the reference deployment and distinguishes old V1.1', async ({
	request
}) => {
	const checkResponse = await request.get(
		'https://api.github.com/repos/Rhaizel02/devbench/commits/' + referenceCommit + '/check-runs',
		{ headers: { 'User-Agent': 'DevBench-production-audit' } }
	);
	expect(checkResponse.status()).toBe(200);
	const checks = (await checkResponse.json()).check_runs as {
		id: number;
		name: string;
		head_sha: string;
		conclusion: string;
		output: { summary: string };
	}[];
	const cloudflare = checks.find((check) => check.name === 'Cloudflare Pages');
	expect(cloudflare?.head_sha).toBe(referenceCommit);
	expect(cloudflare?.conclusion).toBe('success');
	expect(cloudflare?.output.summary).toContain(referenceDeployment);
	const fingerprints = [];
	const infrastructureHeaders: Record<string, string | boolean> = {};
	for (const path of ['/', '/_app/version.json', '/tools/json-query/']) {
		const stable = await request.get(targetOrigin + path);
		const reference = await request.get(referenceDeployment + path);
		expect(stable.status()).toBe(200);
		expect(reference.status()).toBe(200);
		const stableBody = await stable.body();
		if (path === '/') {
			const headers = stable.headers();
			infrastructureHeaders.server = headers.server;
			infrastructureHeaders.referrerPolicy = headers['referrer-policy'];
			infrastructureHeaders.contentTypeOptions = headers['x-content-type-options'];
			infrastructureHeaders.hasCloudflareNELHeader = Boolean(headers.nel && headers['report-to']);
		}
		expect(stableBody.equals(await reference.body())).toBe(true);
		fingerprints.push({
			path,
			status: stable.status(),
			sha256: createHash('sha256').update(stableBody).digest('hex'),
			...(path.endsWith('version.json') ? { buildVersion: stableBody.toString() } : {})
		});
	}
	const previous = await request.get(previousDeployment + '/');
	expect(previous.status()).toBe(200);
	expect(await previous.text()).toContain('V1.1');
	expect((await request.get(previousDeployment + '/tools/json-query/')).status()).toBe(404);
	for (const path of ['/tools/production-unknown-tool/', '/production-unknown-page/']) {
		expect((await request.get(targetOrigin + path)).status()).toBe(404);
	}
	await saveEvidence('provenance.json', {
		checkedAt: new Date().toISOString(),
		stableURL: targetOrigin,
		referenceCommit,
		referenceDeployment,
		cloudflareCheckID: cloudflare!.id,
		fingerprints,
		infrastructureHeaders,
		previousDeployment,
		previousVersion: 'V1.1',
		unknownTool: 404,
		unknownPage: 404
	});
});

test('production privacy and cross-browser smoke: one-shot paste, workers, recipes and keyboard', async ({
	page,
	context,
	browserName,
	browser
}) => {
	const marker = 'synthetic-production-private-f09a';
	const forbidden = [
		marker,
		Buffer.from(marker).toString('base64'),
		Buffer.from(marker).toString('base64url')
	];
	const requests: { url: string; method: string; type: string }[] = [];
	const logs: string[] = [],
		errors: string[] = [],
		failed: string[] = [];
	page.on('request', (request) => {
		const serialized =
			request.url() + JSON.stringify(request.headers()) + (request.postData() ?? '');
		for (const value of forbidden) expect(serialized).not.toContain(value);
		requests.push({ url: request.url(), method: request.method(), type: request.resourceType() });
	});
	page.on('console', (message) => logs.push(message.type() + ': ' + message.text()));
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('requestfailed', (request) => failed.push(request.url()));
	page.on('response', (response) => {
		if (response.status() >= 400) failed.push(response.status() + ' ' + response.url());
	});
	await page.addInitScript(() => {
		const historyAudit: unknown[] = [];
		Object.defineProperty(window, '__productionHistoryAudit', { value: historyAudit });
		for (const method of ['pushState', 'replaceState'] as const) {
			const original = history[method].bind(history);
			history[method] = (...args) => {
				historyAudit.push(args);
				return original(...args);
			};
		}
	});
	const assertPrivateState = async () => {
		const state = await page.evaluate(async () => ({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state,
			historyCalls: (window as unknown as { __productionHistoryAudit: unknown[] })
				.__productionHistoryAudit,
			caches: await caches.keys(),
			databases: typeof indexedDB.databases === 'function' ? await indexedDB.databases() : []
		}));
		for (const value of forbidden) expect(JSON.stringify(state)).not.toContain(value);
		expect(Object.keys(state.local).every((key) => key === 'devbench.preferences.v1')).toBe(true);
		expect(state.caches).toEqual([]);
		expect(state.databases).toEqual([]);
		expect(await context.cookies()).toEqual([]);
	};
	await page.goto('/');
	await page.getByLabel('Quick Paste input', { exact: true }).fill(JSON.stringify({ marker }));
	await expect(page).toHaveURL(targetOrigin + '/');
	await assertPrivateState();
	await page.getByRole('button', { name: 'Open in JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toContainText(
		marker
	);
	await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
	await assertPrivateState();
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await page.getByRole('link', { name: 'Start with JSON Studio', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'JSON input', exact: true })).toHaveText('');
	await page.goto('/tools/json-query/');
	await page
		.getByRole('textbox', { name: 'JSON document', exact: true })
		.fill(JSON.stringify({ marker }));
	await page.getByLabel('JSONPath expression', { exact: true }).fill('$.marker');
	await page.getByRole('button', { name: 'Run query', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Matched values', exact: true })).toContainText(
		marker
	);
	await page.getByLabel('JSONPath expression', { exact: true }).fill('$.missing');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByLabel('JSONPath expression', { exact: true }).fill('$[');
	await page.getByRole('button', { name: 'Run query', exact: true }).click();
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'JSON document', exact: true })).toContainText(
		marker
	);
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await assertPrivateState();
	await page.goto('/tools/json-schema/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Validate document', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Validation report', exact: true })).toContainText(
		'"valid": true'
	);
	await page.getByRole('textbox', { name: 'JSON document', exact: true }).fill('{"name":123}');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Validate document', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Validation report', exact: true })).toContainText(
		'"valid": false'
	);
	await page.goto('/tools/pipeline-builder/');
	for (const recipe of ['0', '1', '2']) {
		await page.getByLabel('Synthetic pipeline recipe').selectOption(recipe);
		await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
		await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
		await expect(page.getByRole('textbox', { name: 'Pipeline output', exact: true })).toContainText(
			'Notebook'
		);
	}
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
	await page.getByRole('tab', { name: 'Output', exact: true }).click();
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByRole('tab', { name: 'Input', exact: true })).toBeFocused();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await assertPrivateState();
	await page.waitForLoadState('networkidle');
	for (const value of forbidden) expect(logs.join('')).not.toContain(value);
	expect(errors).toEqual([]);
	expect(logs.filter((entry) => entry.startsWith('error:'))).toEqual([]);
	expect(failed).toEqual([]);
	expect(
		requests.filter(
			(request) => new URL(request.url).origin !== targetOrigin || request.method !== 'GET'
		)
	).toEqual([]);
	const documentPaths = new Set(['/', ...tools.map((tool) => '/tools/' + tool.slug + '/')]);
	expect(
		requests.filter((request) => {
			const url = new URL(request.url);
			return (
				url.search !== '' ||
				!(
					documentPaths.has(url.pathname) ||
					url.pathname.startsWith('/_app/immutable/') ||
					url.pathname === '/_app/version.json'
				)
			);
		})
	).toEqual([]);
	await saveEvidence('privacy-' + browserName + '.json', {
		checkedAt: new Date().toISOString(),
		baseURL: targetOrigin,
		browser: browserName,
		version: browser.version(),
		operations: [
			'one-shot Quick Paste',
			'JSONPath',
			'JSON Schema worker',
			'three pipeline recipes',
			'stale result',
			'reset',
			'mobile drawer and tabs keyboard'
		],
		payloadLeaks: 0,
		cookies: 0,
		errors,
		failedResources: failed,
		console: logs,
		requests
	});
});
