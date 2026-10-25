import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { evidencePath, targetOrigin } from './support/environment';
async function ready(page: Page) {
	expect((await page.goto('/lab/architecture-canvas/'))?.status()).toBe(200);
	await expect(page.locator('.konvajs-content canvas').first()).toBeVisible();
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
}
async function drag(page: Page, tool: string, x: number, y: number, dx = 180, dy = 110) {
	await page.getByRole('button', { name: tool, exact: true }).click();
	const b = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(b.x + x, b.y + y);
	await page.mouse.down();
	await page.mouse.move(b.x + x + dx, b.y + y + dy, { steps: 12 });
	await page.mouse.up();
}
async function point(page: Page, id: string, corner = false) {
	const e = page.locator('[data-element-id="' + id + '"]'),
		v = page.getByLabel('Camera zoom', { exact: true }),
		b = (await page.getByTestId('board-surface').boundingBox())!,
		zoom = Number(await v.getAttribute('data-zoom'));
	return {
		x:
			b.x +
			Number(await v.getAttribute('data-x')) +
			(Number(await e.getAttribute('data-x')) +
				Number(await e.getAttribute('data-width')) * (corner ? 1 : 0.5)) *
				zoom,
		y:
			b.y +
			Number(await v.getAttribute('data-y')) +
			(Number(await e.getAttribute('data-y')) +
				Number(await e.getAttribute('data-height')) * (corner ? 1 : 0.5)) *
				zoom
	};
}
async function outline(page: Page) {
	const details = page.locator('details.outline');
	if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
}
async function createProject(page: Page, title: string) {
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('New board name').fill(title);
	await page.getByRole('button', { name: 'Create project', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
}
async function jsonDownload(page: Page) {
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'JSON', exact: true }).click();
	return JSON.parse(await readFile((await (await download).path())!, 'utf8'));
}
function observe(page: Page) {
	const requests: string[] = [],
		errors: string[] = [];
	page.on('request', (r) => requests.push(r.method() + ' ' + r.url() + (r.postData() ?? '')));
	page.on('console', (m) => {
		if (['error', 'warning'].includes(m.type())) errors.push(m.text());
	});
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('response', (r) => {
		if (r.status() >= 400) errors.push('HTTP ' + r.status());
	});
	return async (marker: string) => {
		await page.waitForLoadState('networkidle');
		const state = await page.evaluate(() => ({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state,
			cookies: document.cookie
		}));
		expect(JSON.stringify(state) + requests.join('') + errors.join('')).not.toContain(marker);
		expect(requests.filter((r) => !r.startsWith('GET ' + targetOrigin + '/'))).toEqual([]);
		expect(errors).toEqual([]);
		expect(state.cookies).toBe('');
		expect(Object.keys(state.local).every((k) => k === 'devbench.preferences.v1')).toBe(true);
	};
}

test('whiteboard transactions: drag, text, colors, sketch shapes, ink, anchors, resize, undo and export', async ({
	page
}) => {
	const clean = observe(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page);
	await drag(page, 'Rounded rectangle', 420, 200);
	const shape = page.locator('[data-element-id^="item-"]').last(),
		id = (await shape.getAttribute('data-element-id'))!;
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	const center = await point(page, id);
	await page.mouse.dblclick(center.x, center.y);
	const marker = 'synthetic-v14-private-board-681';
	await page.getByLabel('Edit text on canvas').fill(marker);
	await page.keyboard.press('Control+Enter');
	await page.getByRole('button', { name: 'Toggle properties' }).click();
	await page.getByRole('button', { name: 'Fill #d6f5ed', exact: true }).click();
	await page.getByLabel('Stroke HEX', { exact: true }).fill('#206858');
	await page.getByLabel('Stroke HEX', { exact: true }).press('Tab');
	await page.getByLabel('Line style').selectOption('dashed');
	await page.getByLabel('Font family').selectOption('mono');
	await page.getByLabel('Element width').fill('240');
	await page.getByLabel('Element width').press('Tab');
	await expect(shape).toHaveAttribute('data-width', '240');
	await page.getByRole('button', { name: 'Close properties' }).click();
	const corner = await point(page, id, true);
	await page.mouse.move(corner.x, corner.y);
	await page.mouse.down();
	await page.mouse.move(corner.x + 40, corner.y + 30, { steps: 8 });
	await page.mouse.up();
	await expect(shape).toHaveAttribute('data-width', '280');
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect(shape).toHaveAttribute('data-width', '240');
	await page.getByRole('button', { name: 'Redo', exact: true }).click();
	await expect(shape).toHaveAttribute('data-width', '280');
	const reselect = await point(page, id);
	await page.mouse.click(reselect.x, reselect.y);
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+d');
	await expect(page.locator('[data-element-id^="item-"]')).toHaveCount(2);
	await page.keyboard.press('Delete');
	await expect(page.locator('[data-element-id^="item-"]')).toHaveCount(1);
	await drag(page, 'Ellipse', 680, 180, 130, 100);
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	const originalX = Number(await shape.getAttribute('data-x'));
	const addToSelection = await point(page, id);
	await page.keyboard.down('Shift');
	await page.mouse.click(addToSelection.x, addToSelection.y);
	await page.keyboard.up('Shift');
	await page.getByRole('application').focus();
	await page.keyboard.press('ArrowRight');
	await expect(shape).toHaveAttribute('data-x', String(originalX + 10));
	await drag(page, 'Diamond', 650, 370, 150, 120);
	await drag(page, 'Rectangle', 400, 420, 130, 70);
	await page.getByRole('button', { name: 'Pencil', exact: true }).click();
	const b = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(b.x + 320, b.y + 390);
	await page.mouse.down();
	for (let i = 0; i < 18; i++)
		await page.mouse.move(b.x + 320 + i * 12, b.y + 390 + Math.sin(i / 2) * 18);
	await page.mouse.up();
	await drag(page, 'Arrow', 650, 520, 180, -40);
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	await page.mouse.move(b.x + 830, b.y + 480);
	await page.mouse.down();
	await page.mouse.move(b.x + 860, b.y + 450, { steps: 8 });
	await page.mouse.up();
	await page.getByRole('button', { name: 'Arrow', exact: true }).click();
	const a = await point(page, id),
		api = await point(page, 'api');
	await page.mouse.move(a.x, a.y);
	await page.mouse.down();
	await page.mouse.move(api.x, api.y, { steps: 12 });
	await page.mouse.up();
	await page.getByRole('button', { name: 'Text', exact: true }).click();
	await page.mouse.click(b.x + 450, b.y + 110);
	await page.getByLabel('Edit text on canvas').fill('Local sketch · no uploads');
	await page.keyboard.press('Control+Enter');
	const count = await page.locator('[data-element-id]').count();
	await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
	await page.mouse.move(b.x + 300, b.y + 300);
	await page.mouse.down();
	await page.mouse.move(b.x + 360, b.y + 360);
	await page.keyboard.press('Escape');
	await page.mouse.up();
	await expect(page.locator('[data-element-id]')).toHaveCount(count);
	await page.screenshot({ path: evidencePath('canvas-v14-editing-dark.png'), fullPage: true });
	const result = await jsonDownload(page),
		current = result.diagrams.find((d: { id: string }) => d.id === 'commerce');
	expect(current.elements.find((e: { id: string }) => e.id === id)).toMatchObject({
		label: marker,
		width: 280,
		style: { stroke: '#206858', fill: '#d6f5ed', dashed: true, font: 'mono' }
	});
	expect(current.elements.some((e: { kind: string }) => e.kind === 'stroke')).toBe(true);
	expect(
		current.connections.some((c: { start: { elementId?: string } }) => c.start.elementId === id)
	).toBe(true);
	const png = page.waitForEvent('download');
	await page.getByRole('button', { name: 'PNG', exact: true }).click();
	const pngBytes = await readFile((await (await png).path())!);
	expect(pngBytes.subarray(1, 4).toString()).toBe('PNG');
	await clean(marker);
});

test('manual hierarchy: create three levels, same direct/zoom destination, camera restore and cycle errors', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page);
	await createProject(page, 'Manual hierarchy');
	await drag(page, 'Rectangle', 400, 200);
	await page.getByRole('button', { name: 'Toggle properties' }).click();
	await page.getByLabel('Selected element label').fill('Manual parent');
	await page.getByLabel('Selected element label').press('Tab');
	await page.getByRole('button', { name: 'Create child diagram', exact: true }).click();
	await page.getByRole('button', { name: 'Open child diagram', exact: true }).click();
	await page.getByRole('button', { name: 'Close properties' }).click();
	await drag(page, 'Diamond', 300, 180);
	await page.getByRole('button', { name: 'Toggle properties' }).click();
	await page.getByLabel('Selected element label').fill('Manual service');
	await page.getByLabel('Selected element label').press('Tab');
	await page.getByRole('button', { name: 'Create child diagram', exact: true }).click();
	await page.getByRole('button', { name: 'Open child diagram', exact: true }).click();
	await page.getByRole('button', { name: 'Close properties' }).click();
	await drag(page, 'Ellipse', 300, 220);
	await outline(page);
	await page.getByLabel('Diagram name').fill('Manual level three');
	await page.getByLabel('Diagram name').press('Tab');
	const camera = page.getByLabel('Camera zoom', { exact: true });
	await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
	const zoom = await camera.getAttribute('data-zoom'),
		crumb = page.getByRole('navigation', { name: 'Diagram breadcrumb' });
	await crumb.getByRole('button', { name: 'Overview', exact: true }).click();
	await page.getByRole('button', { name: 'Manual parent', exact: true }).click();
	await page.getByRole('button', { name: 'Toggle properties' }).click();
	await page.getByRole('button', { name: 'Zoom into child', exact: true }).click();
	await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'true');
	await page.keyboard.press('Escape');
	await expect(crumb.getByRole('button', { name: 'Overview' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('button', { name: 'Zoom into child', exact: true }).click();
	await expect(crumb.getByRole('button', { name: 'Manual parent' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('button', { name: 'Manual service', exact: true }).click();
	await page.getByRole('button', { name: 'Zoom into child', exact: true }).click();
	await expect(crumb.getByRole('button', { name: 'Manual level three' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(camera).toHaveAttribute('data-zoom', zoom!);
	await page.getByRole('button', { name: 'ellipse', exact: true }).click();
	await page.getByLabel('Associate child diagram').selectOption({ label: 'Overview' });
	await expect(page.getByRole('status')).toContainText('cycle');
	await page.screenshot({
		path: evidencePath('canvas-v14-manual-level-three.png'),
		fullPage: true
	});
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
	await page.reload();
	await ready(page);
	await outline(page);
	await page.getByRole('button', { name: 'Open Manual parent child', exact: true }).click();
	await page.screenshot({ path: evidencePath('canvas-v14-manual-level-two.png'), fullPage: true });
	await page.getByRole('button', { name: 'Open Manual service child', exact: true }).click();
	await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(1);
	await expect(camera).toHaveAttribute('data-zoom', zoom!);
	await crumb.getByRole('button', { name: 'Overview', exact: true }).click();
	await page.getByRole('button', { name: 'Manual parent', exact: true }).click();
	await page.getByRole('application').focus();
	await page.keyboard.press('Delete');
	await expect(page.getByRole('button', { name: 'Delete diagram', exact: true })).toBeVisible();
	await drag(page, 'Rectangle', 300, 200);
	await page.getByRole('button', { name: 'Toggle properties' }).click();
	await page.getByLabel('Associate child diagram').selectOption({ label: 'Manual parent' });
	await page.getByRole('button', { name: 'Open child diagram', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Manual service', exact: true })).toBeVisible();
});

test('readable responsive themes, keyboard/pointer pan and clean unmount', async ({ page }) => {
	const clean = observe(page);
	await ready(page);
	await mkdir(evidencePath('.'), { recursive: true });
	const layouts = [];
	for (const width of [1440, 768, 390])
		for (const theme of ['dark', 'light']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			await page.getByLabel('Camera zoom', { exact: true }).click();
			await page.evaluate(() => document.fonts.ready);
			await page.evaluate(
				() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
			);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await expect(page.getByLabel('Camera zoom', { exact: true })).toHaveText('100%');
			await page.screenshot({
				path: evidencePath(`canvas-v14-${width}-${theme}.png`),
				fullPage: true
			});
			layouts.push({ width, theme, zoom: 1, overflow: false });
		}
	await writeFile(evidencePath('canvas-v14-layouts.json'), JSON.stringify(layouts, null, 2) + '\n');
	await page.getByRole('application').focus();
	const v = page.getByLabel('Camera zoom', { exact: true }),
		x = Number(await v.getAttribute('data-x'));
	await page.keyboard.press('ArrowRight');
	await expect(v).toHaveAttribute('data-x', String(x - 30));
	await page.keyboard.press('h');
	const b = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(b.x + 40, b.y + 220);
	await page.mouse.down();
	await page.mouse.move(b.x + 85, b.y + 250, { steps: 5 });
	await page.mouse.up();
	expect(Number(await v.getAttribute('data-x'))).toBeCloseTo(x + 15, 0);
	await clean('synthetic-v14-unused-marker');
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await expect(page.locator('canvas')).toHaveCount(0);
});

test('local projects survive reload; import is a new roundtrip copy, invalid imports preserve current data, deletion is confirmed', async ({
	page
}) => {
	const clean = observe(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page);
	await createProject(page, 'Browser roundtrip');
	await drag(page, 'Text', 340, 180, 280, 80);
	const marker = 'synthetic-private-persisted-canvas-992';
	await page.getByLabel('Edit text on canvas').fill(marker);
	await page.keyboard.press('Control+Enter');
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
	const original = await jsonDownload(page);
	await page.reload();
	await ready(page);
	await expect(page.locator('[data-element-id] > button').first()).toHaveText(marker);
	const persisted = await page.evaluate(async () => {
		const names = (await indexedDB.databases()).map((d) => d.name);
		return {
			names,
			rows: await new Promise<unknown[]>((resolve, reject) => {
				const request = indexedDB.open('devbench.canvas.v2');
				request.onsuccess = () => {
					const db = request.result,
						read = db.transaction('projects').objectStore('projects').getAll();
					read.onsuccess = () => {
						db.close();
						resolve(read.result);
					};
					read.onerror = () => reject(new Error('read failed'));
				};
			})
		};
	});
	expect(persisted.names).toEqual(['devbench.canvas.v2']);
	expect(JSON.stringify(persisted.rows)).toContain(marker);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Import project JSON').setInputFiles({
		name: 'future.json',
		mimeType: 'application/json',
		buffer: Buffer.from('{"schemaVersion":999}')
	});
	await expect(
		page.getByRole('dialog').getByText('Unsupported project schema version.', { exact: true })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Browser roundtrip', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Close projects', exact: true }).click();
	expect(await jsonDownload(page)).toEqual(original);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Import project JSON').setInputFiles({
		name: 'roundtrip.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(original))
	});
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
	const copy = await jsonDownload(page);
	expect(copy.id).not.toBe(original.id);
	expect(copy.diagrams).toEqual(original.diagrams);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Project name', { exact: true }).fill('Imported copy');
	await page.getByLabel('Project name', { exact: true }).press('Tab');
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete project Imported copy', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Delete project Imported copy', exact: true })
	).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: 'Delete project Browser roundtrip', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Close projects', exact: true }).click();
	await clean(marker);
});

test('failed autosave keeps the board editable, exports rescue JSON and recovers on retry', async ({
	page
}) => {
	await page.addInitScript(() => {
		const original = IDBObjectStore.prototype.put;
		(window as unknown as { canvasTestFail: boolean }).canvasTestFail = true;
		IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
			if ((window as unknown as { canvasTestFail: boolean }).canvasTestFail)
				throw new DOMException('Injected quota failure', 'QuotaExceededError');
			return key === undefined ? original.call(this, value) : original.call(this, value, key);
		};
	});
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/lab/architecture-canvas/');
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'error');
	await drag(page, 'Text', 350, 200, 280, 80);
	const marker = 'synthetic-rescue-board-382';
	await page.getByLabel('Edit text on canvas').fill(marker);
	await page.keyboard.press('Control+Enter');
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'error');
	const rescued = await jsonDownload(page);
	expect(JSON.stringify(rescued)).toContain(marker);
	await page.evaluate(() => {
		(window as unknown as { canvasTestFail: boolean }).canvasTestFail = false;
	});
	await page.getByRole('button', { name: 'Retry storage', exact: true }).click();
	await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state', 'saved');
});
