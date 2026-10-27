import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { offlineArtifacts } from '../support/test';
import { prepareOffline } from '../support/pwa';
import { CACHE_PREFIX } from '../../src/lib/pwa/policy';

async function panel(page: Page) {
	if (!(await page.getByRole('region', { name: 'Offline and installation' }).isVisible()))
		await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
}
async function waiting(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/'))?.waiting),
			{ timeout: 90_000 }
		)
		.toBe(true);
	await panel(page);
	await expect(page.getByText('DevBench has an update ready.', { exact: true })).toBeVisible();
}
async function download(page: Page, name = 'JSON') {
	await page.bringToFront();
	const restorePanel =
		name === 'JSON' &&
		(await page.getByRole('region', { name: 'Offline and installation' }).isVisible());
	if (restorePanel)
		await page.getByRole('button', { name: 'Close offline panel', exact: true }).click();
	const pending = page.waitForEvent('download');
	await page.getByRole('button', { name, exact: true }).click();
	const result = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
	if (restorePanel) await panel(page);
	return result;
}
test.beforeEach(async ({ request }) => {
	await request.post('/__pwa_test__/control', { data: { active: 'a' } });
});

test('PWA two actual builds: failed candidate, Later, old-tab lazy worker, explicit update and retained Canvas', async ({
	page,
	context,
	request
}) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	const { aVersion, bVersion, bRoot } = await offlineArtifacts();
	await prepareOffline(page);
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('New board name').fill('Two-build preserved Canvas');
	await page.getByRole('button', { name: 'Create project', exact: true }).click();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const original = await download(page);
	const old = await context.newPage();
	await old.goto('/tools/json-studio/');
	const marker = 'PRIVATE_OLD_BUILD_' + crypto.randomUUID();
	await old.locator('.cm-content[aria-label="JSON input"]').fill(JSON.stringify({ marker }));
	const inventory = JSON.parse(await readFile(bRoot + '/offline-build.json', 'utf8'));
	const failPath = inventory.entries.find((entry: { path: string }) =>
		entry.path.endsWith('.woff2')
	).path;
	await request.post('/__pwa_test__/control', { data: { active: 'b', failPath, delay: 15 } });
	await panel(page);
	await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: /Offline|download|resources|complete/i })
	).toBeVisible({ timeout: 90_000 });
	expect(
		await page.evaluate(
			async (name) => !!(await (await caches.open(name)).match('/offline-build.json')),
			CACHE_PREFIX + bVersion
		)
	).toBe(false);
	expect(await download(page)).toEqual(original);
	await old.getByRole('button', { name: 'Format JSON', exact: true }).click();
	await expect(old.locator('.cm-content[aria-label="JSON output"]')).toContainText(marker);
	await context.setOffline(true);
	await old.getByRole('button', { name: 'Minify', exact: true }).click();
	await context.setOffline(false);
	await request.post('/__pwa_test__/control', { data: { active: 'b' } });
	await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
	await waiting(page);
	await page.getByRole('button', { name: 'Later', exact: true }).click();
	await expect(
		page.getByText('Update postponed. Your current version stays available.', { exact: true })
	).toBeVisible();
	await page.screenshot({ path: 'screenshots/actual/v23-update-deferred.png', fullPage: true });
	expect(await download(page)).toEqual(original);
	await expect(old.locator('.cm-content[aria-label="JSON input"]')).toContainText(marker);
	await page.getByRole('button', { name: 'Show update', exact: true }).click();
	await page.getByRole('button', { name: 'Update', exact: true }).click();
	await page.getByRole('button', { name: 'Apply update and reload', exact: true }).click();
	await expect(page.locator('.desktop-sidebar .brand .version')).toHaveAttribute(
		'title',
		'Build ' + bVersion
	);
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(async () => (await (await fetch('/_app/version.json')).json()).version)
		)
		.toBe(bVersion);
	expect(await download(page)).toEqual(original);
	await expect(old.locator('.cm-content[aria-label="JSON input"]')).toContainText(marker);
	// Client-side navigation keeps the A runtime alive under the B worker; no document reload.
	await context.setOffline(true);
	await old.locator('a[href="/tools/xml-toolkit/"]').first().click();
	await expect(old.locator('[data-workspace="xml-toolkit"]')).toBeVisible();
	await old.locator('.cm-content').first().fill('<root><value>offline-old-runtime</value></root>');
	await old.getByRole('button', { name: 'Format XML', exact: true }).click();
	await expect(old.locator('.cm-content').last()).toContainText('offline-old-runtime');
	await expect(old.locator('.desktop-sidebar .brand .version')).toHaveAttribute(
		'title',
		'Build ' + aVersion
	);
	const names = await page.evaluate(() => caches.keys());
	expect(names.sort()).toEqual([CACHE_PREFIX + aVersion, CACHE_PREFIX + bVersion].sort());
	const snapshots = await page.evaluate(async () => {
		const output = [];
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			const metadata = await cache.match('/offline-build.json');
			if (!metadata) throw Error('Completed cache metadata missing.');
			output.push({
				name,
				entries: (await cache.keys()).length,
				bytes: (await metadata.json()).bytes
			});
		}
		return output;
	});
	await writeFile(
		'screenshots/actual/v23-two-build-update.json',
		JSON.stringify(
			{
				aVersion,
				bVersion,
				failedCandidatePreservedA: true,
				oldTabReloaded: false,
				canvasUnchanged: true,
				snapshots
			},
			null,
			2
		) + '\n'
	);
	await old.close();
	await page.screenshot({
		path: 'screenshots/actual/v23-update-applied-canvas.png',
		fullPage: true
	});
});

test('PWA Canvas failed-save update guard offers rescue and cancellation before any activation', async ({
	page,
	request
}) => {
	await prepareOffline(page);
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await request.post('/__pwa_test__/control', { data: { active: 'b' } });
	await panel(page);
	await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
	await waiting(page);
	await page.getByRole('button', { name: 'Close offline panel', exact: true }).click();
	// Deterministic storage fault, not a claim that the physical disk is full.
	await page.evaluate(() => {
		const original = IDBObjectStore.prototype.put;
		(window as unknown as { restorePut: () => void }).restorePut = () => {
			IDBObjectStore.prototype.put = original;
		};
		IDBObjectStore.prototype.put = function () {
			throw new DOMException('Simulated quota', 'QuotaExceededError');
		};
	});
	await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
	const box = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(box.x + 100, box.y + 180);
	await page.mouse.down();
	await page.mouse.move(box.x + 250, box.y + 270, { steps: 8 });
	await page.mouse.up();
	await expect(page.locator('[data-save-state="error"]')).toBeVisible();
	await panel(page);
	await page.getByRole('button', { name: 'Update', exact: true }).click();
	await page.getByRole('button', { name: 'Apply update and reload', exact: true }).click();
	await expect(page.getByText('Canvas could not save.', { exact: false })).toBeVisible();
	const rescue = await download(page, 'Export rescue JSON');
	expect(rescue.diagrams[0].elements.length).toBeGreaterThan(0);
	expect(
		await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/'))?.waiting)
	).toBe(true);
	await page.screenshot({
		path: 'screenshots/actual/v23-update-save-error-rescue.png',
		fullPage: true
	});
	await page.getByRole('button', { name: 'Keep working', exact: true }).click();
	await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut());
	await page.getByRole('button', { name: 'Close offline panel', exact: true }).click();
	await page.getByRole('button', { name: 'Retry storage', exact: true }).click();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
});
