import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const folder = 'screenshots/actual';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const externalRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
	if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url());
});
const checks = [];
try {
	for (const scene of [
		{ name: '01-home-dark-desktop', route: '/', theme: 'dark', width: 1440, height: 1080 },
		{ name: '02-home-light-desktop', route: '/', theme: 'light', width: 1440, height: 1080 },
		{ name: '03-home-mobile', route: '/', theme: 'dark', width: 390, height: 844 },
		{
			name: '04-json-dark-desktop',
			route: '/tools/json-studio/',
			theme: 'dark',
			width: 1440,
			height: 1000
		},
		{
			name: '05-json-light-desktop',
			route: '/tools/json-studio/',
			theme: 'light',
			width: 1440,
			height: 1000
		},
		{
			name: '06-json-mobile',
			route: '/tools/json-studio/',
			theme: 'dark',
			width: 390,
			height: 844
		},
		{ name: '07-home-tablet', route: '/', theme: 'dark', width: 768, height: 1024 },
		{
			name: '08-json-tablet',
			route: '/tools/json-studio/',
			theme: 'light',
			width: 768,
			height: 1024
		}
	]) {
		await page.setViewportSize({ width: scene.width, height: scene.height });
		const response = await page.goto('http://127.0.0.1:4173' + scene.route);
		assert.ok(response);
		assert.equal(response.status(), 200);
		await page.getByLabel('Color theme', { exact: true }).selectOption(scene.theme);
		if (scene.route.includes('json-studio')) {
			await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
			await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
			if (scene.width < 768) await page.getByRole('tab', { name: 'Input', exact: true }).click();
			await page.getByRole('textbox', { name: 'JSON input', exact: true }).waitFor();
		}
		await page.evaluate(() => document.fonts.ready);
		const size = await page.evaluate(() => ({
			viewport: innerWidth,
			content: document.documentElement.scrollWidth
		}));
		assert(size.content <= size.viewport, scene.name + ' must not overflow horizontally');
		await page.screenshot({ path: folder + '/' + scene.name + '.png', fullPage: true });
		checks.push({ scene: scene.name, status: response.status(), ...size });
	}
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('http://127.0.0.1:4173/tools/json-studio/');
	await page.getByLabel('Color theme', { exact: true }).selectOption('system');
	await page.emulateMedia({ colorScheme: 'light' });
	await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
	for (const slug of [
		'json-studio',
		'json-diff',
		'json-yaml',
		'base64-toolkit',
		'url-toolkit',
		'jwt-inspector',
		'hash-generator',
		'sql-formatter',
		'regex-tester',
		'text-diff',
		'id-generator',
		'timestamp-converter'
	]) {
		assert.equal(
			(await page.request.get('http://127.0.0.1:4173/tools/' + slug + '/')).status(),
			200
		);
	}
	assert.equal((await page.request.get('http://127.0.0.1:4173/tools/not-a-tool/')).status(), 404);
	assert.deepEqual(errors, [], 'No browser runtime errors');
	assert.deepEqual(externalRequests, [], 'No external runtime resources');
	await writeFile(
		folder + '/checks.json',
		JSON.stringify(
			{
				checks,
				systemTheme: 'passed',
				knownRoutes: 12,
				unknownRoute: 404,
				browserErrors: errors,
				externalRequests
			},
			null,
			2
		) + '\n'
	);
	process.stdout.write(
		'Saved 8 real captures. Width, routes, themes, runtime errors and local resources verified.\n'
	);
} finally {
	await browser.close();
}
