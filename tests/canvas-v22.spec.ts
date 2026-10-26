import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { evidencePath } from './support/environment';
import type { Project } from '../src/lib/canvas/model';
async function ready(page: Page) {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('New board name').fill('Workflow V2.2 synthetic board');
	await page.getByRole('button', { name: 'Create project', exact: true }).click();
}
async function drag(page: Page, x: number, y: number, xx: number, yy: number) {
	const b = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.move(b.x + x, b.y + y);
	await page.mouse.down();
	await page.mouse.move(b.x + xx, b.y + yy, { steps: 12 });
	await page.mouse.up();
}
async function click(page: Page, x: number, y: number) {
	const b = (await page.getByTestId('board-surface').boundingBox())!;
	await page.mouse.click(b.x + x, b.y + y);
}
async function json(page: Page): Promise<Project> {
	const d = page.waitForEvent('download');
	await page.getByRole('button', { name: 'JSON', exact: true }).click();
	return JSON.parse(await readFile((await (await d).path())!, 'utf8'));
}
async function shot(page: Page, name: string) {
	await mkdir(evidencePath('.'), { recursive: true });
	await page.screenshot({
		path: evidencePath('v22-' + name + '.png'),
		fullPage: true,
		animations: 'disabled'
	});
}
async function shape(page: Page, x: number, y: number, color: string) {
	await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
	await drag(page, x, y, x + 160, y + 90);
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByRole('button', { name: 'Fill ' + color, exact: true }).click();
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
}
test('V2.2 partial marquee, atomic group styles, focus inspector, child navigation and preserved viewport', async ({
	page
}) => {
	await ready(page);
	await shape(page, 100, 200, '#dcecf9');
	await shape(page, 360, 200, '#d6f5ed');
	await shape(page, 680, 200, '#efe2fa');
	await page.getByRole('button', { name: 'Arrow', exact: true }).click();
	await drag(page, 260, 245, 360, 245);
	await drag(page, 80, 170, 500, 240);
	await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toContainText(
		'2 selected'
	);
	await shot(page, 'partial-marquee');
	await page.getByRole('button', { name: 'Group selection', exact: true }).click();
	await drag(page, 170, 245, 200, 285);
	await page.getByRole('button', { name: 'Edit selection properties', exact: true }).click();
	await expect(page.getByLabel('Fill HEX')).toHaveAttribute('placeholder', 'Mixed');
	await page.getByRole('button', { name: 'Fill #fff0d4', exact: true }).click();
	let p = await json(page);
	expect(p.diagrams[0].elements.slice(0, 2).map((e) => e.style.fill)).toEqual([
		'#fff0d4',
		'#fff0d4'
	]);
	expect(p.diagrams[0].elements[2].style.fill).toBe('#efe2fa');
	await shot(page, 'group-mixed-properties');
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	p = await json(page);
	expect(p.diagrams[0].elements.slice(0, 2).map((e) => e.style.fill)).toEqual([
		'#dcecf9',
		'#d6f5ed'
	]);
	const before = p.diagrams[0].viewport;
	await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
	await expect(page.locator('.board-editor')).toHaveClass(/immersive/);
	await expect(page.getByRole('complementary', { name: 'Drawing properties' })).toBeVisible();
	const sb = (await page.getByTestId('board-surface').boundingBox())!,
		pb = (await page.getByRole('complementary', { name: 'Drawing properties' }).boundingBox())!;
	expect(sb.x).toBeGreaterThanOrEqual(pb.x + pb.width - 1);
	expect((await json(page)).diagrams[0].viewport).toEqual(before);
	await shot(page, 'focus-desktop-inspector');
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	await page.getByRole('application').focus();
	await page.keyboard.press('Control+a');
	await page.getByRole('button', { name: 'Edit selection properties', exact: true }).click();
	await page.getByRole('button', { name: 'Stroke #20bfa9', exact: true }).click();
	expect((await json(page)).diagrams[0].elements.every((e) => e.style.stroke === '#20bfa9')).toBe(
		true
	);
	await page.getByRole('application').focus();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('complementary', { name: 'Drawing properties' })).toBeHidden();
	await expect(page.locator('.board-editor')).toHaveClass(/immersive/);
	await page.keyboard.press('Escape');
	await expect(page.locator('.board-editor')).not.toHaveClass(/immersive/);
	expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const saved = await json(page);
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(await json(page)).toEqual(saved);
});
test('V2.2 To front/back changes real pixels, native hit-testing, history and saved order', async ({
	page
}) => {
	await ready(page);
	await shape(page, 140, 180, '#dcecf9');
	await shape(page, 230, 225, '#d6f5ed');
	await click(page, 160, 220);
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	const pixel = () =>
		page.evaluate(() => {
			const c = document.querySelector('[data-testid="board-surface"] canvas') as HTMLCanvasElement;
			return [...c.getContext('2d')!.getImageData(280, 260, 1, 1).data];
		});
	expect(await pixel()).toEqual([214, 245, 237, 255]);
	await shot(page, 'layer-before');
	await page.getByRole('button', { name: 'To front', exact: true }).click();
	await expect.poll(pixel).toEqual([220, 236, 249, 255]);
	await shot(page, 'layer-after-front');
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	await click(page, 280, 260);
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await expect(page.getByLabel('Fill HEX')).toHaveValue('#dcecf9');
	await page.getByRole('button', { name: 'To back', exact: true }).click();
	await expect.poll(pixel).toEqual([214, 245, 237, 255]);
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await expect.poll(pixel).toEqual([220, 236, 249, 255]);
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	await expect.poll(pixel).toEqual([220, 236, 249, 255]);
	// Cross-type native order: a clean connector, a two-figure group and a decoded local raster.
	await page.getByRole('button', { name: 'Line', exact: true }).click();
	await drag(page, 120, 260, 480, 260);
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByLabel('Sketch intensity', { exact: true }).selectOption('0');
	await page.getByLabel('Stroke width', { exact: true }).selectOption('8');
	await page.getByRole('button', { name: 'Stroke #20bfa9', exact: true }).click();
	await expect.poll(pixel).toEqual([32, 191, 169, 255]);
	await page.getByRole('button', { name: 'To back', exact: true }).click();
	await expect.poll(pixel).toEqual([220, 236, 249, 255]);
	await page.getByRole('button', { name: 'To front', exact: true }).click();
	await expect.poll(pixel).toEqual([32, 191, 169, 255]);
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	await click(page, 160, 220);
	await page.keyboard.down('Shift');
	await click(page, 360, 300);
	await page.keyboard.up('Shift');
	await page.getByRole('button', { name: 'Group selection', exact: true }).click();
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByRole('button', { name: 'To front', exact: true }).click();
	await expect.poll(pixel).toEqual([220, 236, 249, 255]);
	await page.getByRole('button', { name: 'To back', exact: true }).click();
	await expect.poll(pixel).toEqual([32, 191, 169, 255]);
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	const raster = JSON.parse(
		await readFile('src/lib/canvas/fixtures/local-rasters.json', 'utf8')
	)[0];
	const imageUpload = page.getByLabel('Insert local image', { exact: true });
	await imageUpload.setInputFiles({
		name: 'local.png',
		mimeType: 'image/png',
		buffer: Buffer.from(raster.data, 'base64')
	});
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const imageProject = await json(page),
		d = imageProject.diagrams[0],
		image = d.elements.find((e) => e.kind === 'image')!,
		v = d.viewport;
	await drag(
		page,
		v.x + (image.x + image.width / 2) * v.zoom,
		v.y + (image.y + image.height / 2) * v.zoom,
		280,
		260
	);
	const imagePixel = await pixel();
	expect(imagePixel).not.toEqual([32, 191, 169, 255]);
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await page.getByRole('button', { name: 'To back', exact: true }).click();
	await expect.poll(pixel).toEqual([32, 191, 169, 255]);
	await page.getByRole('button', { name: 'To front', exact: true }).click();
	await expect.poll(pixel).toEqual(imagePixel);
});
test('V2.2 bend a straight anchored arrow on its visible midpoint, move nodes and preserve reload/export', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await ready(page);
	await shape(page, 100, 200, '#dcecf9');
	await shape(page, 600, 200, '#d6f5ed');
	await page.getByRole('button', { name: 'Arrow', exact: true }).click();
	await drag(page, 260, 245, 600, 245);
	const straight = await json(page),
		camera = straight.diagrams[0].viewport;
	await drag(page, 430, 245, 430, 355);
	let p = await json(page);
	expect(p.diagrams[0].connections[0]).toMatchObject({
		geometry: 'curve',
		control: { x: (430 - camera.x) / camera.zoom, y: (465 - camera.y) / camera.zoom }
	});
	expect(p.diagrams[0].connections[0].start.elementId).toBe(p.diagrams[0].elements[0].id);
	await shot(page, 'direct-bend');
	await drag(page, 160, 240, 190, 270);
	await drag(page, 650, 240, 680, 270);
	p = await json(page);
	expect(p.diagrams[0].elements.map((e, i) => e.x - straight.diagrams[0].elements[i].x)).toEqual([
		30 / camera.zoom,
		30 / camera.zoom
	]);
	await click(page, 430, 370);
	await page.getByRole('button', { name: 'Toggle properties', exact: true }).click();
	await expect(page.getByLabel('Fill HEX')).toHaveCount(0);
	await expect(page.getByLabel('Font family')).toHaveCount(0);
	await page.getByLabel('Connector geometry').selectOption('curve');
	await page.getByLabel('Arrow heads').selectOption('both');
	await page.getByLabel('Stroke width').selectOption('5');
	await page.getByRole('button', { name: 'Stroke #20bfa9', exact: true }).click();
	await page.getByRole('button', { name: 'Close properties', exact: true }).click();
	await page.getByRole('button', { name: 'Undo', exact: true }).click();
	await page.getByRole('button', { name: 'Redo', exact: true }).click();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const saved = await json(page);
	await page.reload();
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	expect(await json(page)).toEqual(saved);
	const dl = page.waitForEvent('download');
	await page.getByRole('button', { name: 'PNG', exact: true }).click();
	expect((await readFile((await (await dl).path())!)).subarray(1, 4).toString()).toBe('PNG');
	expect(errors).toEqual([]);
});
test('V2.2 focus three-level navigation, theme/responsive evidence and unmount cleanup', async ({
	page
}) => {
	await ready(page);
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page
		.getByLabel('Import project JSON', { exact: true })
		.setInputFiles('src/lib/canvas/fixtures/frozen-v20-v3.json');
	await expect(page.getByRole('dialog')).toBeHidden();
	await shot(page, 'normal-board');
	await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
	const outline = page.locator('details.outline');
	await outline.locator('summary').click();
	await page.getByRole('button', { name: 'Open Pedidos child', exact: true }).click();
	await expect(page.getByRole('navigation', { name: 'Diagram breadcrumb' })).toContainText(
		'Pedidos'
	);
	await shot(page, 'focus-level-two');
	const rows = page.locator('.outline-row button');
	const names = await rows.allTextContents();
	expect(names.some((n) => n.includes('Service'))).toBe(true);
	await rows
		.filter({ hasText: /Service/ })
		.first()
		.click();
	await page.getByRole('button', { name: 'Open child diagram', exact: true }).click();
	await expect(page.getByRole('navigation', { name: 'Diagram breadcrumb' })).toContainText(
		'OrderService'
	);
	await shot(page, 'focus-level-three');
	await page
		.getByRole('navigation', { name: 'Diagram breadcrumb' })
		.getByRole('button')
		.first()
		.click();
	await page.getByRole('button', { name: 'Exit focus mode', exact: true }).click();
	for (const width of [1440, 768, 390])
		for (const theme of ['dark', 'light']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
			await expect(page.locator('.board-editor')).toHaveClass(/immersive/);
			await expect(
				page.getByRole('button', { name: 'Exit focus mode', exact: true })
			).toBeInViewport();
			if (width < 1000)
				await expect(page.getByRole('complementary', { name: 'Drawing properties' })).toBeHidden();
			await shot(page, 'focus-' + width + '-' + theme);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.getByRole('button', { name: 'Exit focus mode', exact: true }).click();
		}
	await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
	await page.getByRole('button', { name: 'More drawing tools', exact: true }).click();
	await page.getByRole('button', { name: 'Box select', exact: true }).click();
	const b = (await page.getByTestId('board-surface').boundingBox())!,
		cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [{ x: b.x + 20, y: b.y + 120 }]
	});
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchMove',
		touchPoints: [{ x: b.x + 330, y: b.y + 340 }]
	});
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Select', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await cdp.detach();
	await page.goto('/tools/xml-toolkit/');
	expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
	expect(await page.locator('.app-header').evaluate((e) => (e as HTMLElement).inert)).toBe(false);
});
