import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tools } from '../src/lib/tools/tool-registry.ts';
const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const base = new URL(externalURL ?? 'http://127.0.0.1:4173').origin;
const evidenceDirectory = externalURL ? 'screenshots/production' : 'screenshots/actual';
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
/** @type {string[]} */ const errors = [];
/** @type {string[]} */ const failedResources = [];
/** @type {string[]} */ const external = [];
/** @type {string[]} */ const consoleErrors = [];
page.on('console', (message) => {
	if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
	if (response.status() >= 400 && !response.url().includes('/not-a-tool/'))
		failedResources.push(response.url());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => failedResources.push(request.url()));
page.on('request', (request) => {
	if (!request.url().startsWith(base + '/')) external.push(request.url());
});
const scenes = [
	{ slug: 'home', action: null },
	{ slug: 'json-studio', action: 'Format JSON' },
	{ slug: 'json-query', action: 'Run query' },
	{ slug: 'json-schema', action: 'Validate document' },
	{ slug: 'http-request', action: 'Generate request code' },
	{ slug: 'http-headers', action: 'Inspect headers' },
	{ slug: 'log-inspector', action: 'Inspect logs' },
	{ slug: 'environment-comparator', action: 'Compare environments' },
	{ slug: 'pipeline-builder', action: 'Run pipeline' }
];
const measurements = [];
const routes = [];
await mkdir(evidenceDirectory, { recursive: true });
try {
	for (const tool of tools) {
		if (!externalURL) await access('build/tools/' + tool.slug + '/index.html');
		assert.equal((await page.goto(base + '/tools/' + tool.slug + '/'))?.status(), 200);
		await page.locator('.studio-actions button').first().waitFor();
		await page.waitForLoadState('networkidle');
		assert.equal((await page.reload())?.status(), 200);
		await page.locator('.studio-actions button').first().waitFor();
		await page.waitForLoadState('networkidle');
		routes.push({ slug: tool.slug, direct: 200, refresh: 200 });
	}
	assert.equal((await page.request.get(base + '/tools/not-a-tool/')).status(), 404);
	let captures = 0;
	for (const scene of scenes) {
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto(base + (scene.slug === 'home' ? '/' : '/tools/' + scene.slug + '/'));
		if (scene.action) {
			await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
			await page.getByRole('button', { name: scene.action, exact: true }).click();
			await page
				.getByRole('button', { name: 'Copy output', exact: true })
				.waitFor({ state: 'visible' });
			await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
		}
		await page.waitForLoadState('networkidle');
		for (const width of [390, 768, 1440]) {
			await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
			for (const theme of ['dark', 'light']) {
				await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
				await page.evaluate(() => document.fonts.ready);
				for (const editor of await page.locator('.cm-editor:visible').all()) {
					await editor.scrollIntoViewIfNeeded();
					await page.evaluate(
						() =>
							new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
					);
				}
				await page.evaluate(() => {
					(document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur();
					scrollTo(0, 0);
				});
				const measured = await page.evaluate(() => ({
					viewport: innerWidth,
					document: document.documentElement.scrollWidth
				}));
				assert.ok(measured.document <= width, scene.slug + ' ' + width + ' ' + theme + ' overflow');
				measurements.push({ slug: scene.slug, width, theme, ...measured });
				const baseline =
					['home', 'json-studio'].includes(scene.slug) &&
					(width === 1440 || (width === 390 && theme === 'dark'));
				const representative =
					!['home', 'json-studio'].includes(scene.slug) &&
					((width === 1440 && theme === 'dark') ||
						(scene.slug === 'pipeline-builder' && width === 390 && theme === 'light'));
				if (baseline || representative) {
					await page.screenshot({
						path: evidenceDirectory + '/v12-' + scene.slug + '-' + theme + '-' + width + '.png',
						fullPage: true,
						animations: 'disabled'
					});
					captures++;
				}
			}
		}
	}
	assert.deepEqual(errors, []);
	assert.deepEqual(external, []);
	assert.deepEqual(failedResources, []);
	assert.deepEqual(consoleErrors, []);
	await writeFile(
		evidenceDirectory + '/v12-checks.json',
		JSON.stringify(
			{
				scope: externalURL ? 'published HTTPS deployment' : 'local static build only',
				baseURL: base,
				checkedAt: new Date().toISOString(),
				browser: browser.version(),
				routes,
				unknownRoute: 404,
				measurements,
				captures,
				errors,
				external,
				failedResources,
				consoleErrors,
				node: process.version
			},
			null,
			2
		) + '\n'
	);
	process.stdout.write(
		captures +
			' captures; ' +
			measurements.length +
			' layouts; ' +
			routes.length +
			' direct/refresh routes; no overflow/runtime errors/external resources.\n'
	);
} finally {
	await browser.close();
}
