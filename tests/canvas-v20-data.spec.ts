import { test, expect } from '@playwright/test';
import legacy from '../src/lib/canvas/fixtures/legacy-v2.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';
test('V2 saved projects open without rewrite, preserve immutable originals after edits and recover unknown schemas', async ({
	page
}) => {
	const source = JSON.stringify(legacy, null, 2);
	await page.addInitScript(
		({ source, id }) => {
			const request = indexedDB.open('devbench.canvas.v2', 1);
			request.onupgradeneeded = () =>
				request.result.createObjectStore('projects', { keyPath: 'id' });
			request.onsuccess = () => {
				const tx = request.result.transaction('projects', 'readwrite');
				const store = tx.objectStore('projects');
				const existing = store.get(id);
				existing.onsuccess = () => {
					if (!existing.result)
						store.put({
							id,
							title: 'Frozen legacy',
							json: source,
							updatedAt: Date.now(),
							revision: 1
						});
				};
				tx.oncomplete = () => request.result.close();
			};
		},
		{ source, id: legacy.id }
	);
	const stored = () =>
		page.evaluate(
			(id) =>
				new Promise<Record<string, unknown>>((resolve) => {
					const r = indexedDB.open('devbench.canvas.v2', 1);
					r.onsuccess = () => {
						const tx = r.result.transaction('projects', 'readonly'),
							get = tx.objectStore('projects').get(id);
						get.onsuccess = () => resolve(get.result);
						tx.oncomplete = () => r.result.close();
					};
				}),
			legacy.id
		);
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.waitForTimeout(900);
	expect(await stored()).toMatchObject({ json: source, revision: 1 });
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Project name', { exact: true }).fill('Migrated V3');
	await page.getByLabel('Project name', { exact: true }).press('Tab');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	let row = await stored();
	expect(row.originalJson).toBe(source);
	expect(JSON.parse(row.json as string)).toMatchObject({
		schemaVersion: 3,
		title: 'Migrated V3',
		diagrams: legacy.diagrams
	});
	await page.getByRole('button', { name: 'Close projects', exact: true }).click();
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Project name', { exact: true }).fill('Second edit');
	await page.getByLabel('Project name', { exact: true }).press('Tab');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	row = await stored();
	expect(row.originalJson).toBe(source);
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Original', exact: true }).click();
	expect(await readFile((await (await download).path())!, 'utf8')).toBe(source);
	await page.getByRole('button', { name: 'Close projects', exact: true }).click();
	// Simulate a newer app's row; this app must not erase or overwrite it.
	const future = JSON.stringify({ ...legacy, schemaVersion: 99 });
	await page.evaluate(
		({ id, future }) =>
			new Promise<void>((resolve) => {
				const r = indexedDB.open('devbench.canvas.v2', 1);
				r.onsuccess = () => {
					const tx = r.result.transaction('projects', 'readwrite');
					tx.objectStore('projects').put({
						id,
						title: 'Future document',
						json: future,
						revision: 8,
						updatedAt: Date.now()
					});
					tx.oncomplete = () => {
						r.result.close();
						resolve();
					};
				};
			}),
		{ id: legacy.id, future }
	);
	await page.reload();
	await expect(page.locator('[data-save-state="error"]')).toContainText(
		'Local Canvas storage is unavailable'
	);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	const recovery = page.waitForEvent('download');
	await page
		.getByRole('button', { name: 'Download saved backup Future document', exact: true })
		.click();
	expect(await readFile((await (await recovery).path())!, 'utf8')).toBe(future);
	expect(await stored()).toMatchObject({ json: future, revision: 8 });
});
