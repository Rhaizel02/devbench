import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEFAULT_STYLE, emptyProject, type Project } from '../src/lib/canvas/model';
import { evidencePath } from './support/environment';
async function settle(page: Page) {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
			)
	);
}
function board(name: string, count: number, connections: number, multilevel = false): Project {
	const p = emptyProject('bench-project', 'bench-root', name),
		d = p.diagrams[0];
	d.elements = Array.from({ length: count }, (_, i) => ({
		id: 'bench-node-' + i,
		kind: 'rounded' as const,
		label: 'Component ' + i,
		x: 40 + (i % 12) * 180,
		y: 120 + Math.floor(i / 12) * 120,
		width: 128,
		height: 68,
		rotation: i % 7 === 3 ? 24 : 0,
		style: { ...DEFAULT_STYLE, fill: i < 4 ? '#d6f5ed' : 'transparent' },
		z: 500 + i
	}));
	d.connections = Array.from({ length: connections }, (_, i) => ({
		id: 'bench-edge-' + i,
		kind: 'arrow' as const,
		start: { x: 0, y: 0, elementId: d.elements[i % count].id, u: 1, v: 0.5 },
		end: { x: 0, y: 0, elementId: d.elements[(i + 1) % count].id, u: 0, v: 0.5 },
		geometry: i % 3 === 0 ? ('curve' as const) : ('straight' as const),
		style: { ...DEFAULT_STYLE },
		z: i
	}));
	d.groups = [
		{
			id: 'bench-group',
			memberIds: ['bench-node-0', 'bench-node-1', ...(connections ? ['bench-edge-0'] : [])]
		}
	];
	if (count === 300)
		for (let i = 0; i < 20; i++)
			d.elements.push({
				id: 'bench-ink-' + i,
				kind: 'stroke',
				label: 'Synthetic ink',
				x: 20 + i * 70,
				y: 50,
				width: 60,
				height: 25,
				rotation: 0,
				points: [
					{ x: 0, y: 10 },
					{ x: 20, y: 0 },
					{ x: 40, y: 20 },
					{ x: 60, y: 12 }
				],
				style: { ...DEFAULT_STYLE },
				z: 900 + i
			});
	if (multilevel) {
		for (let level = 1; level <= 2; level++) {
			const child = {
				id: 'bench-child-' + level,
				title: 'Nested ' + level,
				viewport: { x: 30, y: 60, zoom: 0.9 },
				elements: d.elements.slice(0, 8).map((e, i) => ({
					...e,
					id: `child-${level}-${i}`,
					childDiagramId: level === 1 && i === 0 ? 'bench-child-2' : undefined
				})),
				connections: [],
				groups: [
					{ id: 'child-group-' + level, memberIds: [`child-${level}-0`, `child-${level}-1`] }
				]
			};
			p.diagrams.push(child);
		}
		d.elements[0].childDiagramId = 'bench-child-1';
	}
	return p;
}
test('V2 representative scene budgets and real visual acceptance captures (driver latency, not FPS)', async ({
	page
}) => {
	test.setTimeout(60000);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/architecture-canvas/');
	await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
	const records = [];
	for (const [name, count, connections, nested] of [
		['Small20', 20, 0, false],
		['Medium100', 100, 80, false],
		['Large300', 300, 200, false],
		['Multilevel', 24, 12, true]
	] as const) {
		const p = board(name, count, connections, nested);
		await page.getByRole('button', { name: 'Projects', exact: true }).click();
		const start = performance.now();
		await page.getByLabel('Import project JSON', { exact: true }).setInputFiles({
			name: 'synthetic-budget.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(p))
		});
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await settle(page);
		const importReadyMs = performance.now() - start;
		await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
		const first = page.locator('[data-element-id="bench-node-0"]'),
			camera = page.getByLabel('Camera zoom', { exact: true }),
			b = (await page.getByTestId('board-surface').boundingBox())!;
		await page.evaluate(() => scrollTo(0, 0));
		const surface = (await page.getByTestId('board-surface').boundingBox())!,
			x = surface.x + Number(await camera.getAttribute('data-x')) + 104,
			y = surface.y + Number(await camera.getAttribute('data-y')) + 154;
		const moveStart = performance.now();
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 30, y + 15, { steps: 12 });
		await page.mouse.up();
		await expect(first).toHaveAttribute('data-x', '70');
		await settle(page);
		const dragDriverMs = performance.now() - moveStart,
			saveStart = performance.now();
		await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
		const saveIncludingDebounceMs = performance.now() - saveStart;
		await page.mouse.move(b.x + 400, b.y + 300);
		const panStart = performance.now(),
			oldY = Number(await camera.getAttribute('data-y'));
		await page.mouse.wheel(0, 60);
		await expect(camera).toHaveAttribute('data-y', String(oldY - 60));
		await settle(page);
		const panDriverMs = performance.now() - panStart;
		const zoomStart = performance.now();
		await page.keyboard.down('Control');
		await page.mouse.wheel(0, -50);
		await page.keyboard.up('Control');
		await expect
			.poll(async () => Number(await camera.getAttribute('data-zoom')))
			.toBeGreaterThan(1);
		await settle(page);
		const zoomDriverMs = performance.now() - zoomStart;
		records.push({
			name,
			figures: count,
			ink: count === 300 ? 20 : 0,
			connections,
			diagrams: p.diagrams.length,
			rotated: true,
			curves: connections > 0,
			importReadyMs,
			dragDriverMs,
			saveIncludingDebounceMs,
			panDriverMs,
			zoomDriverMs,
			measurement:
				'Playwright end-to-end driver/DOM latency; save includes 600ms debounce; not FPS/render-only'
		});
		expect(importReadyMs).toBeLessThan(15000);
		expect(dragDriverMs).toBeLessThan(5000);
		expect(zoomDriverMs).toBeLessThan(5000);
	}
	await mkdir(evidencePath('.'), { recursive: true });
	await writeFile(
		evidencePath('canvas-v20-performance.json'),
		JSON.stringify(records, null, 2) + '\n'
	);
	// A portable synthetic document opened by the actual importer, never a screenshot mockup.
	const p = emptyProject('visual-project', 'visual-root', 'Order fulfilment · architecture'),
		d = p.diagrams[0];
	d.title = 'System overview';
	const nodes = [
		['gateway', 'API Gateway', 80, 120, 'rounded', '#dcecf9'],
		['orders', 'Order Service', 360, 120, 'rectangle', '#d6f5ed'],
		['database', 'Postgres', 640, 120, 'ellipse', '#efe2fa'],
		['events', 'OrderCreated', 360, 350, 'diamond', '#fff0d4'],
		['worker', 'Fulfilment worker', 680, 350, 'rounded', '#f9dce4']
	] as const;
	d.elements = nodes.map(([id, label, x, y, kind, fill], i) => ({
		id,
		label,
		x,
		y,
		kind,
		width: 180,
		height: 96,
		rotation: i === 3 ? -7 : 0,
		seed: 120 + i,
		style: {
			...DEFAULT_STYLE,
			stroke: '#687b8d',
			fill,
			roughness: 1.3,
			fillPattern: i === 1 ? 'hachure' : 'solid'
		},
		z: 20 + i
	}));
	d.elements.push({
		id: 'visual-note',
		kind: 'text',
		label: 'One order, one transaction.\nKeep side effects explicit.',
		x: 80,
		y: 350,
		width: 230,
		height: 120,
		style: { ...DEFAULT_STYLE, stroke: '#8899aa', fontSize: 18 },
		z: 25
	});
	d.connections = [
		{
			id: 'request',
			kind: 'arrow',
			start: { x: 0, y: 0, elementId: 'gateway', u: 1, v: 0.5 },
			end: { x: 0, y: 0, elementId: 'orders', u: 0, v: 0.5 },
			style: { ...DEFAULT_STYLE },
			z: 1
		},
		{
			id: 'storage',
			kind: 'arrow',
			geometry: 'elbow',
			start: { x: 0, y: 0, elementId: 'orders', u: 1, v: 0.5 },
			end: { x: 0, y: 0, elementId: 'database', u: 0, v: 0.5 },
			style: { ...DEFAULT_STYLE },
			z: 2
		},
		{
			id: 'publish',
			kind: 'arrow',
			geometry: 'curve',
			control: { x: 600, y: 290 },
			start: { x: 0, y: 0, elementId: 'orders', u: 0.8, v: 1 },
			end: { x: 0, y: 0, elementId: 'events', u: 1, v: 0.3 },
			style: { ...DEFAULT_STYLE, stroke: '#20bfa9' },
			z: 3
		},
		{
			id: 'consume',
			kind: 'arrow',
			start: { x: 0, y: 0, elementId: 'events', u: 1, v: 0.5 },
			end: { x: 0, y: 0, elementId: 'worker', u: 0, v: 0.5 },
			style: { ...DEFAULT_STYLE, dashed: true },
			z: 4
		}
	];
	await page.getByRole('button', { name: 'Projects', exact: true }).click();
	await page.getByLabel('Import project JSON', { exact: true }).setInputFiles({
		name: 'synthetic-architecture.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(p))
	});
	await expect(page.getByRole('heading', { name: p.title, exact: true })).toBeVisible();
	for (const width of [1440, 768, 390])
		for (const theme of ['dark', 'light']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			await page.getByRole('button', { name: 'Fit diagram', exact: true }).click();
			if (width === 390) await page.getByLabel('Camera zoom', { exact: true }).click();
			await expect(page.locator('[data-save-state="saved"]')).toBeVisible();
			await page.evaluate(async () => {
				await document.fonts.ready;
				scrollTo(0, 0);
				(document.activeElement as HTMLElement)?.blur();
			});
			await settle(page);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.screenshot({
				path: evidencePath(`canvas-v20-${width}-${theme}.png`),
				fullPage: true,
				animations: 'disabled'
			});
		}
});
