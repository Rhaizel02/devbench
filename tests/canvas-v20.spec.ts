import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { evidencePath } from './support/environment';
import type { Project } from '../src/lib/canvas/model';
import rasters from '../src/lib/canvas/fixtures/local-rasters.json' with { type: 'json' };
async function ready(page: Page) {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
}
async function fresh(page: Page) {
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('New board name').fill('Synthetic V2 architecture');
	await page.getByRole('button', { name: 'Create project', exact: true }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
	await page.evaluate(() => scrollTo(0, 0));
	const b = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(b.x + from.x, b.y + from.y);
	await page.mouse.down();
	await page.mouse.move(b.x + to.x, b.y + to.y, { steps: 12 });
	await page.mouse.up();
}
async function shape(page: Page, tool: string, x: number, y: number, label: string, fill: string) {
	await page.getByRole('button', { name: tool, exact: true }).click();
	await drag(page, { x, y }, { x: x + 160, y: y + 90 });
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByLabel('Selected element label').fill(label);
	await page.getByLabel('Selected element label').press('Tab');
	await page.getByRole('button', { name: 'Fill ' + fill, exact: true }).click();
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
}
async function json(page: Page): Promise<Project> {
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'JSON', exact: true }).click();
	return JSON.parse(await readFile((await (await download).path())!, 'utf8'));
}
async function outline(page: Page) {
	const d = page.locator('details.outline');
	if ((await d.getAttribute('open')) === null) await d.locator('summary').click();
}
async function screenshot(page: Page, name: string) {
	await mkdir(evidencePath('.'), { recursive: true });
	await page.evaluate(async () => {
		await document.fonts.ready;
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({ path: evidencePath(name), fullPage: true, animations: 'disabled' });
}
test('V2 real marquee, group movement/resize/rotation, copy, ungroup, connectors, sketch and history', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await ready(page);
	await fresh(page);
	await screenshot(page, 'canvas-v20-empty.png');
	await shape(page, 'Rounded rectangle', 100, 160, 'API Gateway', '#dcecf9');
	await shape(page, 'Rectangle', 360, 180, 'Order Service', '#d6f5ed');
	await shape(page, 'Ellipse', 680, 190, 'Postgres', '#efe2fa');
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	await drag(page, { x: 80, y: 140 }, { x: 540, y: 290 });
	await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toContainText(
		'2 selected'
	);
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+g');
	let p = await json(page),
		d = p.diagrams[0];
	expect(d.groups).toHaveLength(1);
	const ids = d.groups![0].memberIds;
	await screenshot(page, 'canvas-v20-group-selection.png');
	const before = d.elements.filter((e) => ids.includes(e.id));
	await drag(page, { x: 180, y: 205 }, { x: 230, y: 245 });
	p = await json(page);
	d = p.diagrams[0];
	expect(d.elements.find((e) => e.id === before[0].id)!.x).toBeCloseTo(before[0].x + 50);
	expect(d.elements.find((e) => e.id === before[1].id)!.x).toBeCloseTo(before[1].x + 50);
	await drag(page, { x: 570, y: 310 }, { x: 620, y: 350 });
	p = await json(page);
	d = p.diagrams[0];
	expect(d.elements[0].width).toBeGreaterThan(160);
	expect(d.elements[0].width / d.elements[0].height).toBeCloseTo(160 / 90);
	// Numeric and visible-handle rotation are both real transactions.
	const members = d.elements.filter((e) => ids.includes(e.id)),
		minX = Math.min(...members.map((e) => e.x)),
		minY = Math.min(...members.map((e) => e.y)),
		maxX = Math.max(...members.map((e) => e.x + e.width)),
		maxY = Math.max(...members.map((e) => e.y + e.height));
	const camera = page.getByLabel('Camera zoom', { exact: true }),
		vx = Number(await camera.getAttribute('data-x')),
		vy = Number(await camera.getAttribute('data-y')),
		zoom = Number(await camera.getAttribute('data-zoom'));
	await drag(
		page,
		{ x: vx + ((minX + maxX) / 2) * zoom, y: vy + minY * zoom - 32 },
		{ x: vx + maxX * zoom + 70, y: vy + ((minY + maxY) / 2) * zoom }
	);
	p = await json(page);
	expect(
		p.diagrams[0].elements
			.filter((e) => ids.includes(e.id))
			.every((e) => Math.abs(e.rotation ?? 0) > 80)
	).toBe(true);
	await page.getByRole('button', { name: 'Edit selection properties', exact: true }).click();
	await page.getByLabel('Selection rotation').fill('15');
	await page.getByLabel('Selection rotation').press('Tab');
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	p = await json(page);
	expect(
		p.diagrams[0].elements
			.filter((e) => ids.includes(e.id))
			.every((e) => Math.abs(e.rotation ?? 0) > 0)
	).toBe(true);
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+d');
	p = await json(page);
	expect(p.diagrams[0].groups).toHaveLength(2);
	expect(p.diagrams[0].elements).toHaveLength(5);
	await page.getByRole('application').focus();
	await page.keyboard.press('Delete');
	expect((await json(page)).diagrams[0].elements).toHaveLength(3);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	expect((await json(page)).diagrams[0].elements).toHaveLength(5);
	// Undo returns no selection; select the copied group through the DOM outline.
	await outline(page);
	p = await json(page);
	const copyId = p.diagrams[0].groups![1].memberIds[0];
	await page.locator(`[data-element-id="${copyId}"] button`).first().click();
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+Shift+g');
	expect((await json(page)).diagrams[0].groups).toHaveLength(1);
	await page.getByRole('button', { name: 'Arrow', exact: true }).click();
	await drag(page, { x: 270, y: 440 }, { x: 790, y: 470 });
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByLabel('Connector geometry').selectOption('curve');
	await page.getByLabel('Arrow heads').selectOption('both');
	await page.getByLabel('Line style').selectOption('dashed');
	await screenshot(page, 'canvas-v20-connector-properties.png');
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	p = await json(page);
	expect(p.diagrams[0].connections.at(-1)).toMatchObject({
		geometry: 'curve',
		heads: 'both',
		style: { dashed: true }
	});
	const edge = p.diagrams[0].connections.at(-1)!,
		a = edge.start,
		b = edge.end,
		control = { x: (a.x + b.x) / 2 - (b.y - a.y) * 0.25, y: (a.y + b.y) / 2 + (b.x - a.x) * 0.25 },
		v = p.diagrams[0].viewport;
	await drag(
		page,
		{ x: v.x + control.x * v.zoom, y: v.y + control.y * v.zoom },
		{ x: v.x + control.x * v.zoom + 40, y: v.y + control.y * v.zoom - 30 }
	);
	p = await json(page);
	expect(p.diagrams[0].connections.at(-1)?.control).toEqual({
		x: control.x + 40 / v.zoom,
		y: control.y - 30 / v.zoom
	});
	await page.getByRole('button', { name: 'Pencil', exact: true }).click();
	await drag(page, { x: 340, y: 540 }, { x: 620, y: 560 });
	p = await json(page);
	expect(p.diagrams[0].elements.at(-1)?.kind).toBe('stroke');
	await screenshot(page, 'canvas-v20-rotation-connections.png');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const saved = await json(page);
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(await json(page)).toEqual(saved);
	expect(errors).toEqual([]);
});
test('V2 independent three-level duplicate changes its descendant while original stays intact; linked action is explicit', async ({
	page
}) => {
	await ready(page);
	await outline(page);
	await page.locator('[data-element-id="orders"] button').first().click();
	await page
		.getByRole('button', { name: 'Duplicate selection independently', exact: true })
		.click();
	let p = await json(page);
	expect(p.diagrams).toHaveLength(5);
	const root = p.diagrams.find((d) => d.id === 'commerce')!,
		copy = root.elements.find(
			(e) => e.id !== 'orders' && e.childDiagramId && e.label === 'Pedidos'
		)!;
	expect(copy.childDiagramId).not.toBe('orders-diagram');
	const copiedChild = p.diagrams.find((d) => d.id === copy.childDiagramId)!,
		service = copiedChild.elements.find((e) => e.childDiagramId)!;
	await page
		.locator(`[data-element-id="${copy.id}"]`)
		.getByRole('button', { name: 'Open Pedidos child', exact: true })
		.click();
	await screenshot(page, 'canvas-v20-level-two.png');
	await page
		.locator(`[data-element-id="${service.id}"]`)
		.getByRole('button', { name: 'Zoom into Service child', exact: true })
		.click();
	await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'false');
	await screenshot(page, 'canvas-v20-level-three.png');
	const leaf = p.diagrams.find((d) => d.id === service.childDiagramId)!,
		first = leaf.elements[0];
	await page
		.locator(`[data-element-id="${first.id}"]`)
		.getByRole('button', { name: 'Edit ' + first.label, exact: true })
		.click();
	await page.getByLabel('Edit text on canvas').fill('Independent synthetic descendant');
	await page.keyboard.press('Control+Enter');
	p = await json(page);
	expect(p.diagrams.find((d) => d.id === 'service-diagram')!.elements[0].label).toBe('Validación');
	expect(p.diagrams.find((d) => d.id === leaf.id)!.elements[0].label).toBe(
		'Independent synthetic descendant'
	);
	await screenshot(page, 'canvas-v20-independent-subtree.png');
	await page
		.getByRole('navigation', { name: 'Diagram breadcrumb' })
		.getByRole('button', { name: 'E-commerce', exact: true })
		.click();
	await page.locator('[data-element-id="orders"] button').first().click();
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByRole('button', { name: 'Duplicate with shared child', exact: true }).click();
	await expect(page.getByText(/Child diagrams are shared/)).toBeVisible();
	p = await json(page);
	expect(p.diagrams).toHaveLength(5);
	expect(p.diagrams[0].elements.filter((e) => e.childDiagramId === 'orders-diagram')).toHaveLength(
		2
	);
});
test('V2 dark/light responsive toolbar, real touch pinch, keyboard marquee cancellation and payload privacy', async ({
	page
}) => {
	const requests: string[] = [],
		messages: string[] = [];
	page.on('request', (r) => requests.push(r.url() + (r.postData() ?? '')));
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') messages.push(m.text());
	});
	page.on('pageerror', (e) => messages.push(e.message));
	await ready(page);
	const marker = 'synthetic-v20-private-785';
	await fresh(page);
	await shape(page, 'Rectangle', 320, 190, marker, '#d6f5ed');
	for (const width of [1440, 768, 390])
		for (const theme of ['dark', 'light']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			if (width === 390 && theme === 'dark')
				await screenshot(page, 'canvas-v20-mobile-controls.png');
		}
	await expect(page.getByRole('button', { name: 'More drawing tools', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'More drawing tools', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Ellipse', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'More drawing tools', exact: true }).click();
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	const b = (await page.getByTestId('board-surface').boundingBox())!,
		camera = page.getByLabel('Camera zoom', { exact: true }),
		before = Number(await camera.getAttribute('data-zoom')),
		touch = await page.context().newCDPSession(page);
	await touch.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [
			{ x: b.x + 100, y: b.y + 180, id: 1 },
			{ x: b.x + 200, y: b.y + 180, id: 2 }
		]
	});
	await touch.send('Input.dispatchTouchEvent', {
		type: 'touchMove',
		touchPoints: [
			{ x: b.x + 70, y: b.y + 180, id: 1 },
			{ x: b.x + 230, y: b.y + 180, id: 2 }
		]
	});
	await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await touch.detach();
	await expect
		.poll(async () => Number(await camera.getAttribute('data-zoom')))
		.toBeGreaterThan(before);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+a');
	const selected = await json(page);
	const surface = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(surface.x + 10, surface.y + 100);
	await page.mouse.down();
	await page.mouse.move(surface.x + 200, surface.y + 400);
	await page.keyboard.press('Escape');
	await page.mouse.up();
	expect(await json(page)).toEqual(selected);
	const meta = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			cookie: document.cookie,
			url: location.href,
			history: history.state
		})
	);
	expect(meta + requests.join('') + messages.join('')).not.toContain(marker);
	expect(messages).toEqual([]);
	expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
});
test('V2 local raster decode, quota recovery, actual PNG pixels, portable backups and corrupt-image rollback', async ({
	page
}) => {
	const requests: string[] = [],
		errors: string[] = [];
	page.on('request', (r) => requests.push(r.url() + (r.postData() ?? '')));
	page.on('pageerror', (e) => errors.push(e.message));
	await ready(page);
	await fresh(page);
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.evaluate(() => {
		(window as unknown as { denyImages: boolean }).denyImages = true;
		const put = IDBObjectStore.prototype.put;
		IDBObjectStore.prototype.put = function (value, ...args) {
			if (
				(window as unknown as { denyImages: boolean }).denyImages &&
				value?.json?.includes('"assets"')
			)
				throw new DOMException('Synthetic quota', 'QuotaExceededError');
			return put.call(this, value, ...args);
		};
	});
	await page.getByLabel('Insert local image', { exact: true }).setInputFiles({
		name: 'synthetic.png',
		mimeType: 'image/png',
		buffer: Buffer.from(rasters[0].data, 'base64')
	});
	await expect(page.locator('[data-kind="image"][data-image-ready="true"]')).toHaveCount(1);
	await expect(page.locator('[data-save-state="error"]')).toBeVisible();
	await screenshot(page, 'canvas-v20-quota-rescue.png');
	let p = await json(page);
	expect(p.assets?.[0].data).toBe(rasters[0].data);
	await page.evaluate(() => ((window as unknown as { denyImages: boolean }).denyImages = false));
	await page.getByRole('button', { name: 'Retry storage', exact: true }).click();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const png = page.waitForEvent('download');
	await page.getByRole('button', { name: 'PNG', exact: true }).click();
	const bytes = await readFile((await (await png).path())!);
	const pixel = await page.evaluate(async (data) => {
		const image = await createImageBitmap(
				new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: 'image/png' })
			),
			c = document.createElement('canvas');
		c.width = image.width;
		c.height = image.height;
		const ctx = c.getContext('2d')!;
		ctx.drawImage(image, 0, 0);
		const result = [...ctx.getImageData(72, 62, 1, 1).data];
		image.close();
		return result;
	}, bytes.toString('base64'));
	expect(pixel).toEqual([251, 191, 36, 255]);
	for (const asset of rasters.slice(1))
		await page.getByLabel('Insert local image', { exact: true }).setInputFiles({
			name: 'synthetic.' + (asset.mime === 'image/jpeg' ? 'jpg' : 'webp'),
			mimeType: asset.mime,
			buffer: Buffer.from(asset.data, 'base64')
		});
	await expect(page.locator('[data-kind="image"][data-image-ready="true"]')).toHaveCount(3);
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+a');
	await page.keyboard.press('Control+g');
	await page.keyboard.press('Control+d');
	p = await json(page);
	expect(p.diagrams[0].elements).toHaveLength(6);
	expect(p.assets).toHaveLength(3);
	await page.getByRole('application').focus();
	await page.keyboard.press('Delete');
	expect((await json(page)).assets).toHaveLength(3);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await screenshot(page, 'canvas-v20-local-images.png');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const backup = await json(page);
	await page.reload();
	await expect(page.locator('[data-kind="image"][data-image-ready="true"]')).toHaveCount(6);
	expect(await json(page)).toEqual(backup);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	const broken = structuredClone(backup),
		raw = Buffer.from(rasters[0].data, 'base64');
	broken.assets![0].data = Buffer.concat([
		raw.subarray(0, 33),
		raw.subarray(raw.length - 12)
	]).toString('base64');
	await page.getByLabel('Import project JSON', { exact: true }).setInputFiles({
		name: 'bad-image.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(broken))
	});
	await expect(page.getByRole('dialog')).toContainText('could not be decoded safely');
	await screenshot(page, 'canvas-v20-corrupt-image-error.png');
	await page.getByRole('button', { name: 'Close projects', exact: true }).click();
	expect(await json(page)).toEqual(backup);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Import project JSON', { exact: true }).setInputFiles({
		name: 'portable.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(backup))
	});
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.locator('[data-kind="image"][data-image-ready="true"]')).toHaveCount(6);
	p = await json(page);
	expect(p.id).not.toBe(backup.id);
	expect(p.assets).toEqual(backup.assets);
	expect(p.diagrams).toEqual(backup.diagrams);
	await page.getByLabel('Insert local image', { exact: true }).setInputFiles({
		name: 'bad.svg',
		mimeType: 'image/svg+xml',
		buffer: Buffer.from('<svg onload="alert(1)"></svg>')
	});
	await expect(page.getByRole('status')).toContainText('PNG, JPEG or WebP');
	const meta = await page.evaluate(() =>
		JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			cookies: document.cookie,
			history: history.state
		})
	);
	expect(meta + requests.join('')).not.toContain(rasters[0].data);
	expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
	expect(errors).toEqual([]);
});
