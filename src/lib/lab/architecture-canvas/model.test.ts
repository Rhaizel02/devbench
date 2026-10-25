import { it, expect } from 'vitest';
import { createDemoProject } from './seed';
import {
	validateProject,
	getDiagram,
	addElement,
	moveElement,
	connectElements,
	deleteSelection,
	childDestination,
	screenToWorld,
	zoomAt,
	strokeElement,
	fitViewport,
	connectionPoints,
	type Project
} from './model';
import { tools } from '../../tools/tool-registry';

it('uses stable versioned, JSON-serializable, isolated data for all three levels', () => {
	const first = createDemoProject(),
		second = createDemoProject();
	expect(() => validateProject(first)).not.toThrow();
	expect(JSON.parse(JSON.stringify(first))).toEqual(second);
	expect(childDestination(first, 'commerce', 'orders')).toBe('orders-diagram');
	expect(childDestination(first, 'orders-diagram', 'service')).toBe('service-diagram');
	first.diagrams[0].elements[0].label = 'edited';
	expect(second.diagrams[0].elements[0].label).toBe('API');
	expect(tools).toHaveLength(28);
	expect(tools.some((tool) => tool.slug === 'architecture-canvas')).toBe(true);
});
it.each([
	'missing-child',
	'cycle',
	'duplicate',
	'dangling-edge',
	'version',
	'bad-viewport'
] as const)('rejects invalid project: %s', (kind) => {
	const project = createDemoProject();
	if (kind === 'missing-child') project.diagrams[0].elements[0].childDiagramId = 'missing';
	if (kind === 'cycle') project.diagrams[2].elements[0].childDiagramId = 'commerce';
	if (kind === 'duplicate') project.diagrams[1].elements[0].id = 'api';
	if (kind === 'dangling-edge') project.diagrams[0].connections[0].to = 'missing';
	if (kind === 'version') (project as unknown as { schemaVersion: number }).schemaVersion = 2;
	if (kind === 'bad-viewport') project.diagrams[0].viewport.zoom = 0;
	expect(() => validateProject(project)).toThrow();
});
it('keeps node edits, connections and cameras independent of other diagrams', () => {
	const project = createDemoProject(),
		before = structuredClone(project.diagrams[1]);
	let diagram = getDiagram(project, 'commerce');
	diagram = addElement(diagram, {
		id: 'new',
		kind: 'rectangle',
		label: 'New',
		x: 30,
		y: 400,
		width: 180,
		height: 106
	});
	diagram = moveElement(diagram, 'new', { x: 70, y: 420 });
	diagram = connectElements(diagram, { id: 'new-edge', from: 'api', to: 'new', kind: 'line' });
	project.diagrams[0] = { ...diagram, viewport: { x: -100, y: 30, zoom: 0.8 } };
	expect(project.diagrams[0].elements.at(-1)).toMatchObject({ x: 70, y: 420 });
	expect(project.diagrams[1]).toEqual(before);
	expect(() => validateProject(project)).not.toThrow();
	const deleted = deleteSelection(project.diagrams[0], 'new');
	expect(deleted.connections).toHaveLength(2);
	expect(deleted.elements.some((element) => element.id === 'new')).toBe(false);
	expect(deleteSelection(diagram, 'new-edge').elements).toHaveLength(diagram.elements.length);
});
it('rejects cross-diagram, reflexive and duplicate connections', () => {
	const diagram = createDemoProject().diagrams[0];
	for (const [from, to] of [
		['api', 'controller'],
		['api', 'api'],
		['api', 'overview-ink'],
		['api', 'orders']
	])
		expect(() => connectElements(diagram, { id: 'edge', from, to, kind: 'arrow' })).toThrow();
	expect(() => moveElement(diagram, 'api', { x: Infinity, y: 0 })).toThrow();
	expect(() => childDestination(createDemoProject(), 'commerce', 'inventory')).toThrow('no child');
});
it('normalizes freehand points so strokes move like other elements', () => {
	const stroke = strokeElement('ink', [
		{ x: 100, y: 90 },
		{ x: 150, y: 70 },
		{ x: 180, y: 105 }
	]);
	expect(stroke).toMatchObject({
		x: 100,
		y: 70,
		width: 80,
		height: 35,
		points: [
			{ x: 0, y: 20 },
			{ x: 50, y: 0 },
			{ x: 80, y: 35 }
		]
	});
	expect(() => strokeElement('ink', [{ x: 0, y: 0 }])).toThrow();
	expect(() => strokeElement('ink', Array(2001).fill({ x: 0, y: 0 }))).toThrow();
});
it('keeps the zoom anchor fixed, clamps zoom, and fits geometry without library data', () => {
	const view = { x: 24, y: -12, zoom: 0.8 },
		anchor = { x: 320, y: 180 };
	expect(screenToWorld(anchor, zoomAt(view, 1.5, anchor))).toEqual(screenToWorld(anchor, view));
	expect(zoomAt(view, 100, anchor).zoom).toBe(3);
	expect(zoomAt(view, 0.001, anchor).zoom).toBe(0.25);
	const diagram = createDemoProject().diagrams[0],
		fit = fitViewport(diagram.elements, 360, 420);
	expect(fit.zoom).toBeGreaterThanOrEqual(0.25);
	expect(fit.zoom).toBeLessThan(1);
	expect(connectionPoints(diagram, diagram.connections[0])).toEqual([210, 183, 310, 183]);
	expect(() =>
		validateProject(JSON.parse(JSON.stringify(createDemoProject())) as Project)
	).not.toThrow();
});
