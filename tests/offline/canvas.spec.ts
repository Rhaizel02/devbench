import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { prepareOffline } from '../support/pwa';
import { parseProject } from '../../src/lib/canvas/serialization';
import type { Project } from '../../src/lib/canvas/model';

async function json(page: Page): Promise<Project> {
	const pending = page.waitForEvent('download');
	await page.getByRole('button', { name: 'JSON', exact: true }).click();
	return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
test('PWA Canvas frozen v1/v2/v3 semantic backups, offline local image, reload, history and JSON/PNG export', async ({
	page,
	context,
	request
}) => {
	await request.post('/__pwa_test__/control', { data: { active: 'a' } });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await prepareOffline(page);
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page
		.getByLabel('Import project JSON')
		.setInputFiles('src/lib/canvas/fixtures/frozen-v20-v3.json');
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const onlineProject = await json(page);
	await context.setOffline(true);
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(await json(page)).toEqual(onlineProject);
	for (const fixture of ['legacy-v1.json', 'legacy-v2.json', 'frozen-v20-v3.json']) {
		const file = 'src/lib/canvas/fixtures/' + fixture;
		const expected = parseProject(await readFile(file, 'utf8'));
		await page.getByRole('button', { name: 'Projects', exact: true }).click();
		await page.getByLabel('Import project JSON').setInputFiles(file);
		await expect(page.getByRole('dialog')).toBeHidden();
		await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
		const imported = await json(page);
		expect(imported.id).not.toBe(expected.id); // Existing explicit import-as-copy contract.
		expect(imported.diagrams).toEqual(expected.diagrams);
		expect(imported.assets).toEqual(expected.assets);
		await page.reload();
		await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
		expect(await json(page)).toEqual(imported);
	}
	const raster = JSON.parse(
		await readFile('src/lib/canvas/fixtures/local-rasters.json', 'utf8')
	)[0];
	await page.getByLabel('Insert local image', { exact: true }).setInputFiles({
		name: 'offline.png',
		mimeType: 'image/png',
		buffer: Buffer.from(raster.data, 'base64')
	});
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const withImage = await json(page);
	expect(withImage.assets?.some((asset) => asset.data === raster.data)).toBe(true);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	expect((await json(page)).diagrams[0].elements.length).toBe(
		withImage.diagrams[0].elements.length - 1
	);
	await page.getByRole('button', { name: 'Redo', exact: true }).click();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(await json(page)).toEqual(withImage);
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(await json(page)).toEqual(withImage);
	const png = page.waitForEvent('download');
	await page.getByRole('button', { name: 'PNG', exact: true }).click();
	expect((await readFile((await (await png).path())!)).subarray(1, 4).toString()).toBe('PNG');
	await page.screenshot({
		path: 'screenshots/actual/v23-canvas-offline-image.png',
		fullPage: true
	});
	// A portable exported project is imported offline, with its entire resource manifest intact.
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Import project JSON').setInputFiles({
		name: 'offline-backup.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(withImage))
	});
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const copy = await json(page);
	expect(copy.id).not.toBe(withImage.id);
	expect(copy.diagrams).toEqual(withImage.diagrams);
	expect(copy.assets).toEqual(withImage.assets);
});
