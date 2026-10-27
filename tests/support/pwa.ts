import { expect, type BrowserContext, type Page } from '@playwright/test';
import { CACHE_PREFIX, INVENTORY_PATH, type StaticInventory } from '../../src/lib/pwa/policy';
export async function prepareOffline(page: Page) {
	await page.goto('/');
	await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
	await page.getByRole('button', { name: 'Prepare offline', exact: true }).click();
	await expect(page.locator('[data-offline-state="ready"]')).toBeVisible({ timeout: 90_000 });
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
	await page.getByRole('button', { name: 'Close offline panel', exact: true }).click();
}
export function expectCacheNames(names: string[]) {
	if (process.env.DEVBENCH_OFFLINE_MODE === '1') {
		expect(names).toHaveLength(1);
		expect(names[0]).toMatch(/^devbench-static-v23-[a-zA-Z0-9_-]+$/);
	} else expect(names).toEqual([]);
}
/** Compare every actual cached response against the trusted static build, not just cache names. */
export async function verifyStaticCache(
	context: BrowserContext,
	inventory: StaticInventory,
	baseURL: string
) {
	const inspector = await context.newPage();
	try {
		await inspector.goto(baseURL);
		const observed = await inspector.evaluate(
			async ({ prefix, metadataPath, version }) => {
				const names = await caches.keys();
				const cache = await caches.open(prefix + version);
				const entries = [];
				for (const request of await cache.keys()) {
					const response = await cache.match(request);
					if (!response) throw Error('Missing cached response.');
					const bytes = await response.arrayBuffer();
					const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
						.map((b) => b.toString(16).padStart(2, '0'))
						.join('');
					entries.push({
						url: request.url,
						path: new URL(request.url).pathname,
						bytes: bytes.byteLength,
						hash
					});
				}
				return {
					names,
					entries,
					metadata: await (await cache.match(location.origin + metadataPath))?.json()
				};
			},
			{ prefix: CACHE_PREFIX, metadataPath: INVENTORY_PATH, version: inventory.version }
		);
		expect(observed.names).toEqual([CACHE_PREFIX + inventory.version]);
		expect(observed.metadata).toEqual(inventory);
		expect(observed.entries.map((entry) => entry.path).sort()).toEqual(
			[...inventory.entries.map((entry) => entry.path), INVENTORY_PATH].sort()
		);
		for (const entry of inventory.entries) {
			const actual = observed.entries.find((item) => item.path === entry.path)!;
			expect(actual.url).toBe(new URL(entry.path, baseURL).href);
			expect(actual.bytes).toBe(entry.bytes);
			expect(actual.hash).toBe(entry.sha256);
		}
	} finally {
		await inspector.close();
	}
}
