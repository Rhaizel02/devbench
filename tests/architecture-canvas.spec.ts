import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { tools } from '../src/lib/tools/tool-registry';
import { evidencePath, targetOrigin } from './support/environment';
const route = '/lab/architecture-canvas/';
async function ready(page: Page) {
	expect((await page.goto(route))?.status()).toBe(200);
	await expect(page.locator('.konvajs-content canvas').first()).toBeVisible();
	await expect(page.locator('[data-testid="konva-surface"]')).not.toHaveJSProperty(
		'clientWidth',
		0
	);
}
async function center(page: Page, id: string) {
	const node = page.locator('[data-element-id="' + id + '"]');
	const x = Number(await node.getAttribute('data-x')),
		y = Number(await node.getAttribute('data-y'));
	const zoom = Number(
		await page.getByLabel('Camera zoom', { exact: true }).getAttribute('data-zoom')
	);
	const cx = Number(await page.getByLabel('Camera zoom', { exact: true }).getAttribute('data-x'));
	const cy = Number(await page.getByLabel('Camera zoom', { exact: true }).getAttribute('data-y'));
	const bounds = (await page.getByTestId('konva-surface').boundingBox())!;
	return { x: bounds.x + cx + (x + 90) * zoom, y: bounds.y + cy + (y + 53) * zoom, zoom };
}
async function capture(page: Page, name: string, width = 1440, theme = 'dark') {
	await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
	await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
	await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
	await page.evaluate(() => document.fonts.ready);
	await page.evaluate(
		() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
	);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({
		path: evidencePath('canvas-spike-' + name + '.png'),
		fullPage: true,
		animations: 'disabled'
	});
}
function observe(page: Page) {
	const requests: string[] = [],
		logs: string[] = [],
		errors: string[] = [],
		failed: string[] = [];
	page.on('request', (request) =>
		requests.push(request.method() + ' ' + request.url() + (request.postData() ?? ''))
	);
	page.on('console', (message) => {
		if (message.type() === 'error' || message.type() === 'warning') logs.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('response', (response) => {
		if (response.status() >= 400) failed.push(response.url());
	});
	return async (marker: string) => {
		await page.waitForLoadState('networkidle');
		const state = await page.evaluate(async () => ({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state,
			cookies: document.cookie,
			caches: await caches.keys(),
			databases: await indexedDB.databases()
		}));
		expect(JSON.stringify(state) + requests.join('') + logs.join('')).not.toContain(marker);
		expect(Object.keys(state.local).every((key) => key === 'devbench.preferences.v1')).toBe(true);
		expect(state.cookies).toBe('');
		expect(state.caches).toEqual([]);
		expect(state.databases).toEqual([]);
		expect(requests.filter((value) => !value.startsWith('GET ' + targetOrigin + '/'))).toEqual([]);
		expect(logs).toEqual([]);
		expect(errors).toEqual([]);
		expect(failed).toEqual([]);
	};
}

test('canvas pointer editing: shapes, moving, connections and freehand coexist; payloads and editor disappear on leaving', async ({
	page
}) => {
	const clean = observe(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page);
	await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
	const node = page.locator('[data-element-id^="element-"]').last(),
		id = (await node.getAttribute('data-element-id'))!;
	const marker = 'synthetic-canvas-private-991a';
	await page.getByLabel('Selected element label', { exact: true }).fill(marker);
	const before = Number(await node.getAttribute('data-x')),
		start = await center(page, id);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 90, start.y + 65, { steps: 12 });
	await page.mouse.up();
	await expect
		.poll(async () => Number(await node.getAttribute('data-x')))
		.toBeGreaterThan(before + 40);
	await page.getByRole('button', { name: 'Connect', exact: true }).click();
	const source = await center(page, 'api');
	await page.mouse.click(source.x, source.y);
	const destination = await center(page, id);
	await page.mouse.click(destination.x, destination.y);
	await expect(page.locator('[data-connection-id]')).toHaveCount(3);
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	await node.click();
	await page.getByRole('button', { name: 'Delete selection', exact: true }).click();
	await expect(page.locator('[data-element-id="' + id + '"]')).toHaveCount(0);
	await expect(page.locator('[data-connection-id]')).toHaveCount(2);
	await page.getByRole('button', { name: 'Text', exact: true }).click();
	await page.getByLabel('Selected element label', { exact: true }).fill('A real annotation');
	await page.getByRole('button', { name: 'Draw', exact: true }).click();
	const box = (await page.getByTestId('konva-surface').boundingBox())!;
	await page.mouse.move(box.x + 80, box.y + box.height - 95);
	await page.mouse.down();
	for (let step = 1; step <= 14; step++)
		await page.mouse.move(
			box.x + 80 + step * 13,
			box.y + box.height - 95 + Math.sin(step / 2) * 20
		);
	await page.mouse.up();
	await expect(page.locator('[data-element-id^="stroke-"]')).toHaveCount(1);
	await expect(page.getByLabel('Diagram statistics', { exact: true })).toHaveText(
		'7 elements · 2 connections'
	);
	await page.getByRole('button', { name: 'Select', exact: true }).click();
	await page.getByRole('application', { name: 'Architecture canvas', exact: true }).focus();
	const ink = page.locator('[data-element-id^="stroke-"]'),
		inkX = Number(await ink.getAttribute('data-x'));
	await page.keyboard.press('ArrowRight');
	await expect(ink).toHaveAttribute('data-x', String(inkX + 10));
	await clean(marker);
	await page.getByRole('link', { name: 'Back to tools', exact: true }).click();
	await expect(page.locator('canvas')).toHaveCount(0);
	await ready(page);
	await expect(page.locator('[data-element-id^="element-"]')).toHaveCount(0);
	await clean(marker);
});

test('three hierarchy levels share direct and animated destinations and restore independent edits/cameras', async ({
	page
}) => {
	const clean = observe(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page);
	const camera = page.getByLabel('Camera zoom', { exact: true });
	const rootCamera = await camera.getAttribute('data-zoom');
	await page.locator('[data-element-id="orders"]').click();
	await page.getByRole('button', { name: 'Open child diagram', exact: true }).click();
	await expect(page.locator('[data-element-id="service"]')).toBeVisible();
	await page.getByRole('button', { name: 'Text', exact: true }).click();
	await page
		.getByLabel('Selected element label', { exact: true })
		.fill('Orders session annotation');
	await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
	const childCamera = {
		x: await camera.getAttribute('data-x'),
		y: await camera.getAttribute('data-y'),
		zoom: await camera.getAttribute('data-zoom')
	};
	const crumb = page.getByRole('navigation', { name: 'Diagram breadcrumb', exact: true });
	await crumb.getByRole('button', { name: 'E-commerce', exact: true }).click();
	await expect(camera).toHaveAttribute('data-zoom', rootCamera!);
	await page.locator('[data-element-id="orders"]').click();
	await page.getByRole('button', { name: 'Zoom into child', exact: true }).click();
	await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'true');
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-element-id="orders"]')).toBeVisible();
	await expect(camera).toHaveAttribute('data-zoom', rootCamera!);
	await page.getByRole('button', { name: 'Zoom into child', exact: true }).click();
	await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'true');
	await page.waitForTimeout(90);
	expect(Number(await camera.getAttribute('data-zoom'))).toBeGreaterThan(Number(rootCamera));
	await expect(page.locator('[data-element-id="service"]')).toBeVisible();
	for (const [name, value] of Object.entries(childCamera))
		await expect(camera).toHaveAttribute('data-' + name, value!);
	await expect(page.locator('[data-element-id^="element-"]')).toHaveText(
		'Orders session annotation'
	);
	await capture(page, 'orders-dark-1440');
	await page.locator('[data-element-id="service"]').click();
	await page.getByRole('application').focus();
	await page.keyboard.press('Shift+Enter');
	await expect(page.locator('[data-element-id="validation"]')).toBeVisible();
	await capture(page, 'order-service-dark-1440');
	await crumb.getByRole('button', { name: 'Pedidos', exact: true }).click();
	await expect(page.locator('[data-element-id^="element-"]')).toHaveCount(1);
	await page.locator('[data-element-id="service"]').click();
	await page.getByRole('application').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-element-id="event"]')).toBeVisible();
	await expect(crumb.getByRole('button', { name: 'OrderService', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await clean('Orders session annotation');
});

test('experimental route stays outside the tool registry, themes and responsive layouts; keyboard pan and reduced motion work', async ({
	page
}) => {
	const clean = observe(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page);
	expect(tools).toHaveLength(26);
	const results = [];
	for (const [width, theme] of [
		[1440, 'dark'],
		[1440, 'light'],
		[768, 'light'],
		[390, 'dark']
	] as const) {
		await capture(page, 'overview-' + theme + '-' + width, width, theme);
		results.push({ width, theme, overflow: false });
	}
	await mkdir(evidencePath('.'), { recursive: true });
	await writeFile(
		evidencePath('canvas-spike-layouts.json'),
		JSON.stringify(results, null, 2) + '\n'
	);
	await page.getByRole('application').focus();
	const camera = page.getByLabel('Camera zoom', { exact: true }),
		oldX = Number(await camera.getAttribute('data-x'));
	await page.keyboard.press('ArrowRight');
	await expect(camera).toHaveAttribute('data-x', String(oldX - 30));
	await page.keyboard.press('h');
	await expect(page.getByRole('button', { name: 'Pan', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	const surface = (await page.getByTestId('konva-surface').boundingBox())!;
	const beforePan = Number(await camera.getAttribute('data-x'));
	await page.mouse.move(surface.x + 40, surface.y + 40);
	await page.mouse.down();
	await page.mouse.move(surface.x + 85, surface.y + 70, { steps: 6 });
	await page.mouse.up();
	await expect
		.poll(async () => Number(await camera.getAttribute('data-x')))
		.toBeCloseTo(beforePan + 45, 0);
	const beforeZoom = Number(await camera.getAttribute('data-zoom'));
	await page.mouse.wheel(0, -100);
	await expect
		.poll(async () => Number(await camera.getAttribute('data-zoom')))
		.toBeGreaterThan(beforeZoom);
	await page.keyboard.press('v');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.locator('[data-element-id="orders"]').click();
	await page.getByRole('button', { name: 'Zoom into child', exact: true }).click();
	await expect(page.locator('[data-element-id="controller"]')).toBeVisible();
	await expect(page.getByRole('application')).toHaveAttribute('aria-busy', 'false');
	await clean('synthetic-canvas-private-unused');
});
