import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listedTools } from '../../src/lib/tools/tool-registry';
import { CACHE_PREFIX, type StaticInventory } from '../../src/lib/pwa/policy';
import { prepareOffline, verifyStaticCache } from '../support/pwa';
import { offlineArtifacts } from '../support/test';

test.beforeEach(async ({ request }) => {
	expect((await request.post('/__pwa_test__/control', { data: { active: 'a' } })).ok()).toBe(true);
});
async function shot(page: Page, name: string) {
	await mkdir('screenshots/actual', { recursive: true });
	await page.evaluate(async () => {
		await document.fonts.ready;
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({
		path: 'screenshots/actual/v23-' + name + '.png',
		fullPage: true,
		animations: 'disabled'
	});
}
async function source(page: Page, label: string, value: string) {
	const editor = page.locator(`.cm-content[aria-label="${label}"]`);
	await expect(editor).toBeVisible();
	await editor.fill(value);
}
async function textDownload(page: Page, button: string) {
	const event = page.waitForEvent('download');
	await page.getByRole('button', { name: button, exact: true }).click();
	return readFile((await (await event).path())!, 'utf8');
}
test('PWA real preparation, manifest, static-byte cache integrity and responsive installation controls', async ({
	page,
	context,
	baseURL
}) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.addInitScript(() => {
		const state = window as unknown as { installOffers: { trusted: boolean; prompt: boolean }[] };
		state.installOffers = [];
		addEventListener('beforeinstallprompt', (event) =>
			state.installOffers.push({
				trusted: event.isTrusted,
				prompt: typeof (event as Event & { prompt?: unknown }).prompt === 'function'
			})
		);
	});
	await page.goto('/');
	await shot(page, 'home-online');
	expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
	const manifestResponse = await page.request.get('/manifest.webmanifest');
	expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
	const manifest = await manifestResponse.json();
	expect(manifest).toMatchObject({
		id: '/',
		name: 'DevBench',
		short_name: 'DevBench',
		scope: '/',
		start_url: '/',
		display: 'standalone'
	});
	for (const icon of manifest.icons) {
		const dimensions = await page.evaluate(async (url) => {
			const image = new Image();
			image.src = url;
			await image.decode();
			return `${image.naturalWidth}x${image.naturalHeight}`;
		}, icon.src);
		expect(dimensions).toBe(icon.sizes);
	}
	const started = Date.now();
	await prepareOffline(page);
	const preparationMs = Date.now() - started;
	const inventory: StaticInventory = await page.evaluate(async () =>
		(await fetch('/offline-build.json')).json()
	);
	expect(
		inventory.entries.filter((entry) => entry.path.startsWith('/tools/') && entry.kind === 'html')
	).toHaveLength(30);
	await verifyStaticCache(context, inventory, baseURL!);
	await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
	const installButtonOffered = await page
		.getByRole('button', { name: 'Install DevBench', exact: true })
		.count();
	const installOffers = await page.evaluate(
		() =>
			(window as unknown as { installOffers: { trusted: boolean; prompt: boolean }[] })
				.installOffers
	);
	if (installButtonOffered)
		expect(installOffers.some((offer) => offer.trusted && offer.prompt)).toBe(true);
	await expect(page.getByText('Installation and storage', { exact: true })).toBeVisible();
	const responsive = [];
	for (const width of [1440, 768, 390]) {
		await page.setViewportSize({ width, height: 1000 });
		for (const theme of ['dark', 'light']) {
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
			expect(documentWidth).toBeLessThanOrEqual(width);
			responsive.push({ width, theme, documentWidth });
			await shot(page, `ready-${width}-${theme}`);
		}
	}
	await page.getByRole('button', { name: 'Close offline panel', exact: true }).click();
	// Deliberate admission probes contain no user payload. They must reach the network,
	// fail while offline, and never normalize into an allowlisted cache key.
	await context.setOffline(true);
	const excluded = await page.evaluate(async () => {
		const cases: [string, RequestInit][] = [
			['/manifest.webmanifest?probe=1', {}],
			['/manifest.webmanifest?', {}],
			['/manifest.webmanifest', { method: 'POST', body: 'synthetic-admission-probe' }],
			['/manifest.webmanifest', { headers: { Authorization: 'synthetic-probe' } }],
			['/arbitrary-static-probe.json', {}],
			['https://static-probe.invalid/resource.js', {}]
		];
		return Promise.all(
			cases.map(async ([url, options]) => {
				try {
					await fetch(url, options);
					return true;
				} catch {
					return false;
				}
			})
		);
	});
	expect(excluded).toEqual([false, false, false, false, false, false]);
	await verifyStaticCache(context, inventory, baseURL!);
	await page.reload();
	await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
	await expect(page.getByText('Offline ready', { exact: true }).last()).toBeVisible();
	await shot(page, 'home-offline-ready');
	const { aRoot } = await offlineArtifacts();
	await writeFile(
		'screenshots/actual/v23-preparation.json',
		JSON.stringify(
			{
				version: inventory.version,
				resources: inventory.entries.length,
				bytes: inventory.bytes,
				workerBytes: (await readFile(join(aRoot, 'service-worker.js'))).byteLength,
				preparationMs,
				installButtonOffered,
				installOffers,
				physicalInstallationVerified: false,
				measurement: 'browser/driver-inclusive wall time, not universal throughput',
				responsive
			},
			null,
			2
		) + '\n'
	);
});

test('PWA all 30 never-visited lazy workspaces load offline; actual JSON copy/download and payload privacy', async ({
	page,
	context,
	baseURL
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await prepareOffline(page);
	const inventory: StaticInventory = await page.evaluate(async () =>
		(await fetch('/offline-build.json')).json()
	);
	await context.setOffline(true);
	const errors: string[] = [],
		failed: string[] = [],
		transmissions: string[] = [],
		logs: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('requestfailed', (request) => failed.push(request.url()));
	page.on('request', (request) => transmissions.push(request.url() + (request.postData() ?? '')));
	page.on('console', (message) => logs.push(message.text()));
	const timings = [];
	for (const tool of listedTools.filter((entry) => entry.status === 'available')) {
		const start = Date.now();
		expect((await page.goto('/tools/' + tool.slug + '/'))?.status()).toBe(200);
		await expect(page.locator(`[data-workspace="${tool.slug}"]`)).toBeVisible();
		await expect(page.locator('.code-editor.editor-loading')).toHaveCount(0);
		if (tool.slug === 'architecture-canvas')
			await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
		timings.push({ slug: tool.slug, driverNavigationMs: Date.now() - start });
	}
	expect(timings).toHaveLength(30);
	expect(errors).toEqual([]);
	expect(failed).toEqual([]);
	const marker = 'PWA_PRIVATE_' + crypto.randomUUID();
	await page.goto('/tools/json-studio/');
	await source(page, 'JSON input', JSON.stringify({ marker, values: [1, 2] }));
	await page.getByRole('button', { name: 'Format JSON', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).marker).toBe(marker);
	await page.getByRole('button', { name: 'Minify', exact: true }).click();
	expect(await textDownload(page, 'Download .json')).toBe(
		JSON.stringify({ marker, values: [1, 2] })
	);
	await shot(page, 'json-working-offline');
	const stored = await page.evaluate(async () => {
		const databases = [];
		for (const { name } of await indexedDB.databases()) {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(name!);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(Error('Database inspection failed.'));
			});
			const stores = [];
			for (const store of db.objectStoreNames)
				stores.push(
					await new Promise<unknown[]>((resolve, reject) => {
						const request = db.transaction(store).objectStore(store).getAll();
						request.onsuccess = () => resolve(request.result);
						request.onerror = () => reject(Error('Store inspection failed.'));
					})
				);
			databases.push({ name, stores });
			db.close();
		}
		return JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			history: history.state,
			url: location.href,
			cookies: document.cookie,
			databases
		});
	});
	expect(stored + logs.join('') + transmissions.join('')).not.toContain(marker);
	await verifyStaticCache(context, inventory, baseURL!); // Every key and body still equals the original static build.
	await page.reload();
	await expect(page.locator('.cm-content[aria-label="JSON input"]')).toBeEmpty();
	expect((await page.goto('/tools/no-pwa-tool-exists/'))?.status()).toBe(404);
	await writeFile(
		'screenshots/actual/v23-cold-catalog.json',
		JSON.stringify(
			{
				version: inventory.version,
				timings,
				errors,
				failed,
				markerLeaked: false,
				cacheBytesVerified: inventory.bytes
			},
			null,
			2
		) + '\n'
	);
});

test('PWA incomplete cache is not Ready, survives a genuine offline reload error and recovers without deleting Canvas', async ({
	page,
	context
}) => {
	await prepareOffline(page);
	const { aVersion } = await offlineArtifacts();
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('New board name').fill('PWA cache recovery board');
	await page.getByRole('button', { name: 'Create project', exact: true }).click();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const before = JSON.parse(await textDownload(page, 'JSON'));
	await page.evaluate(async (name) => {
		const cache = await caches.open(name);
		const key = (await cache.keys()).find((entry) =>
			/\/entry\/start\..*\.js$/.test(new URL(entry.url).pathname)
		);
		if (!key) throw Error('Bootstrap not found in real cache.');
		await cache.delete(key);
	}, CACHE_PREFIX + aVersion);
	await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
	await expect(page.locator('[data-offline-state="incomplete"]')).toBeVisible();
	await context.setOffline(true);
	const response = await page.reload();
	expect(response?.status()).toBe(503);
	await expect(
		page.getByRole('heading', { name: 'Your offline copy is incomplete.' })
	).toBeVisible();
	await shot(page, 'offline-incomplete-error');
	await context.setOffline(false);
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(JSON.parse(await textDownload(page, 'JSON'))).toEqual(before);
	await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
	await expect(page.locator('[data-offline-state="ready"]')).toBeVisible();
});
