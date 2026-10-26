import { describe, expect, it } from 'vitest';
import {
	DEFAULT_STYLE,
	anchorAt,
	deleteSelection,
	duplicateSelection,
	emptyProject,
	endpoint,
	expandGroups,
	localToWorld,
	moveSelection,
	orphanDiagrams,
	type Element
} from './model';
import {
	alignSelection,
	connectorVertices,
	headTangent,
	duplicateBranch,
	entityBounds,
	groupSelection,
	marqueeSelection,
	rectangle,
	reorder,
	rotateSelection,
	scaleSelection,
	selectionBounds,
	ungroupSelection
} from './operations';
import { parseProject, serializeProject } from './serialization';
import { History } from './history';
import rasterFixtures from './fixtures/local-rasters.json';
import type { Asset } from './model';
const shape = (id: string, x = 0, y = 0): Element => ({
	id,
	kind: 'rectangle',
	x,
	y,
	width: 100,
	height: 60,
	label: id,
	style: { ...DEFAULT_STYLE },
	z: 1
});
function scene() {
	const p = emptyProject('p', 'root');
	p.diagrams[0].elements = [shape('a'), shape('b', 200, 100), shape('c', 400, 200)];
	p.diagrams[0].connections = [
		{
			id: 'ab',
			kind: 'arrow',
			start: { x: 100, y: 30, elementId: 'a', u: 1, v: 0.5 },
			end: { x: 200, y: 130, elementId: 'b', u: 0, v: 0.5 },
			control: { x: 140, y: 0 },
			geometry: 'curve',
			style: { ...DEFAULT_STYLE },
			z: 0
		}
	];
	return p;
}
describe('world geometry and rectangular selection', () => {
	it('bounds actual legacy ink points and skips duplicate connector vertices for heads', () => {
		const d = scene().diagrams[0];
		d.elements.push({
			...shape('legacy-ink'),
			kind: 'stroke',
			width: 10,
			height: 10,
			points: [
				{ x: -20, y: 0 },
				{ x: 120, y: 40 }
			]
		});
		expect(entityBounds(d, 'legacy-ink')).toEqual({ x: -20, y: 0, width: 140, height: 40 });
		expect(marqueeSelection(d, { x: 0, y: 0, width: 10, height: 10 })).not.toContain('legacy-ink');
		expect(
			headTangent([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 60 },
				{ x: 100, y: 60 }
			])
		).toEqual({ x: 100, y: 0 });
		expect(
			headTangent([
				{ x: 0, y: 0 },
				{ x: 0, y: 0 }
			])
		).toBeUndefined();
	});
	it('contains full geometry inclusively in every drag quadrant and Shift toggles', () => {
		const d = scene().diagrams[0],
			corners = [
				{ x: -1, y: -1 },
				{ x: 301, y: 161 }
			];
		for (const [a, b] of [
			[corners[0], corners[1]],
			[corners[1], corners[0]],
			[
				{ x: -1, y: 161 },
				{ x: 301, y: -1 }
			],
			[
				{ x: 301, y: -1 },
				{ x: -1, y: 161 }
			]
		])
			expect(marqueeSelection(d, rectangle(a, b)).sort()).toEqual(['a', 'ab', 'b']);
		expect(marqueeSelection(d, { x: 50, y: 0, width: 20, height: 20 })).toEqual([]);
		expect(marqueeSelection(d, { x: 0, y: 0, width: 100, height: 60 }, ['a', 'b'], true)).toEqual([
			'b'
		]);
	});
	it('uses rotated corners for bounds and local rotated anchors after move/resize', () => {
		let d = scene().diagrams[0];
		d.elements[0].rotation = 90;
		const b = entityBounds(d, 'a');
		expect(b.x).toBeCloseTo(20);
		expect(b.y).toBeCloseTo(-20);
		expect(b.width).toBeCloseTo(60);
		expect(b.height).toBeCloseTo(100);
		const p = localToWorld(d.elements[0], { x: 100, y: 30 }),
			end = anchorAt(d, p);
		expect(end.elementId).toBe('a');
		expect(end.u).toBe(1);
		expect(endpoint(d, end).x).toBeCloseTo(50);
		expect(endpoint(d, end).y).toBeCloseTo(80);
		d = moveSelection(d, ['a'], { x: 10, y: 20 });
		expect(endpoint(d, end).x).toBeCloseTo(60);
		expect(endpoint(d, end).y).toBeCloseTo(100);
	});
	it('curves include exact extrema and elbows stay world-orthogonal after rotation', () => {
		const d = scene().diagrams[0],
			edge = d.connections[0];
		expect(connectorVertices(d, edge)).toHaveLength(33);
		expect(entityBounds(d, 'ab').y).toBeLessThan(30);
		edge.geometry = 'elbow';
		const next = rotateSelection(d, ['a', 'b', 'ab'], 43),
			points = connectorVertices(next, next.connections[0]);
		for (let i = 1; i < points.length; i++)
			expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true);
	});
});
describe('flat groups, transforms and integrity', () => {
	it('groups as units, uniform resize, rotation, ungroup and deletion preserve valid references', () => {
		let d = groupSelection(scene().diagrams[0], ['a', 'b', 'ab'], 'g');
		expect(expandGroups(d, ['a']).sort()).toEqual(['a', 'ab', 'b']);
		expect(marqueeSelection(d, { x: 0, y: 0, width: 100, height: 60 })).toEqual([]);
		const moved = moveSelection(d, ['a'], { x: 40, y: 20 });
		expect(moved.elements[1].x).toBe(240);
		expect(moved.connections[0].control).toEqual({ x: 180, y: 20 });
		const scaled = scaleSelection(d, ['a'], 2, { x: 0, y: 0 });
		expect(scaled.elements[1]).toMatchObject({ x: 400, y: 200, width: 200, height: 120 });
		expect(scaled.connections[0].control).toEqual({ x: 280, y: 0 });
		expect(endpoint(scaled, scaled.connections[0].start)).toEqual({ x: 200, y: 60 });
		const rotated = rotateSelection(d, ['a'], 90);
		expect(rotated.elements[0].rotation).toBe(90);
		expect(rotated.elements[1].rotation).toBe(90);
		expect(ungroupSelection(d, ['a']).groups).toEqual([]);
		d = deleteSelection(d, ['b']);
		expect(d.elements.map((e) => e.id)).toEqual(['c']);
		expect(d.connections).toEqual([]);
		expect(d.groups).toEqual([]);
	});
	it('duplicates complete groups and internal connectors with fresh remapped IDs', () => {
		const d = groupSelection(scene().diagrams[0], ['a', 'b', 'ab'], 'g');
		let i = 0;
		const copy = duplicateSelection(d, ['a'], () => `copy-${++i}`);
		expect(copy.diagram.groups).toHaveLength(2);
		const group = copy.diagram.groups![1];
		expect(group.memberIds).toHaveLength(3);
		const nodes = copy.diagram.elements.slice(3),
			edge = copy.diagram.connections[1];
		expect(edge.start.elementId).toBe(nodes[0].id);
		expect(edge.end.elementId).toBe(nodes[1].id);
		expect(edge.control).toEqual({ x: 164, y: 24 });
		const p = scene();
		p.diagrams[0] = copy.diagram;
		expect(() => serializeProject(p)).not.toThrow();
	});
	it('keeps external edges valid, removes incident edges and dissolves undersized groups', () => {
		let d = scene().diagrams[0];
		d.connections.push({
			...d.connections[0],
			id: 'ac',
			end: { x: 400, y: 230, elementId: 'c', u: 0, v: 0.5 }
		});
		d = groupSelection(d, ['a', 'b'], 'g');
		let i = 0;
		const copy = duplicateSelection(d, ['a'], () => `n-${++i}`);
		expect(copy.diagram.connections.find((c) => c.id === 'ac')?.start.elementId).toBe('a');
		const deleted = deleteSelection(d, ['c']);
		expect(deleted.connections.map((c) => c.id)).toEqual(['ab']);
		expect(deleted.groups).toHaveLength(1);
	});
	it('reorders groups contiguously and aligns/distributes groups as units', () => {
		let d = scene().diagrams[0];
		d = alignSelection(d, ['a', 'b', 'c'], 'top');
		expect(d.elements.map((e) => e.y)).toEqual([0, 0, 0]);
		d.elements[1].x = 140;
		d = alignSelection(d, ['a', 'b', 'c'], 'horizontal');
		expect(d.elements[1].x).toBe(200);
		d = groupSelection(d, ['a', 'b'], 'g');
		const front = reorder(d, ['a'], true);
		expect(front.elements[0].z).toBeGreaterThan(front.elements[2].z);
		expect(front.elements[1].z).toBe(front.elements[0].z + 1);
		expect(() => alignSelection(d, ['a', 'b'], 'left')).toThrow('two separate');
		expect(selectionBounds(d, ['a', 'b']).width).toBe(300);
	});
});
describe('independent hierarchical copy', () => {
	it('copies image nodes in independent children while sharing immutable portable resources', () => {
		const p = scene();
		p.assets = [rasterFixtures[0] as Asset];
		p.diagrams[0].elements[0].childDiagramId = 'image-child';
		p.diagrams.push({
			id: 'image-child',
			title: 'Local reference',
			viewport: { x: 12, y: 30, zoom: 0.8 },
			connections: [],
			elements: [{ ...shape('image-node'), kind: 'image', assetId: p.assets[0].id }]
		});
		let i = 0;
		const next = duplicateBranch(p, 'root', ['a'], () => `image-copy-${++i}`).project;
		expect(next.assets).toEqual(p.assets);
		const child = next.diagrams.find((d) => d.id !== 'root' && d.id !== 'image-child')!;
		expect(child.elements[0].id).not.toBe('image-node');
		expect(child.elements[0].assetId).toBe(p.assets[0].id);
		child.elements[0].x += 120;
		expect(p.diagrams[1].elements[0].x).toBe(0);
		expect(() => serializeProject(next)).not.toThrow();
	});
	function nested() {
		const p = scene();
		p.diagrams[0].elements[0].childDiagramId = 'child';
		p.diagrams[0].elements[1].childDiagramId = 'child';
		p.diagrams.push({
			...p.diagrams[0],
			id: 'child',
			title: 'Orders',
			elements: [{ ...shape('service'), childDiagramId: 'leaf' }],
			connections: []
		});
		p.diagrams.push({
			...p.diagrams[0],
			id: 'leaf',
			title: 'OrderService',
			elements: [shape('validation')],
			connections: []
		});
		return p;
	}
	it('copies a shared DAG once, remaps every internal ID and edits descendants independently', () => {
		const p = nested(),
			before = serializeProject(p);
		let i = 0;
		const result = duplicateBranch(p, 'root', ['a', 'b'], () => `clone-${++i}`),
			next = result.project;
		expect(next.diagrams).toHaveLength(5);
		const roots = next.diagrams[0].elements.filter((e) => result.ids.includes(e.id));
		expect(roots[0].childDiagramId).toBe(roots[1].childDiagramId);
		expect(roots[0].childDiagramId).not.toBe('child');
		const child = next.diagrams.find((d) => d.id === roots[0].childDiagramId)!;
		expect(child.viewport).toEqual(p.diagrams[1].viewport);
		const leaf = next.diagrams.find((d) => d.id === child.elements[0].childDiagramId)!;
		leaf.elements[0].label = 'Independent edit';
		expect(next.diagrams.find((d) => d.id === 'leaf')!.elements[0].label).toBe('validation');
		expect(serializeProject(p)).toBe(before);
		expect(parseProject(serializeProject(next))).toEqual(next);
		const history = new History();
		history.record(p);
		expect(history.undo(next)).toEqual(p);
		expect(history.redo(p)).toEqual(next);
	});
	it('linked duplicate stays explicit; removing child figures leaves recoverable diagrams', () => {
		const p = nested();
		let i = 0;
		const result = duplicateBranch(p, 'root', ['a'], () => `linked-${++i}`, false);
		expect(result.project.diagrams).toHaveLength(3);
		expect(result.project.diagrams[0].elements.at(-1)?.childDiagramId).toBe('child');
		p.diagrams[0] = deleteSelection(p.diagrams[0], ['a', 'b']);
		expect(orphanDiagrams(p).map((d) => d.id)).toEqual(['child']);
	});
	it('rejects cycles, duplicate IDs and limit overflow without touching the source', () => {
		const p = nested(),
			before = serializeProject(p);
		expect(() => duplicateBranch(p, 'root', ['a'], () => p.id)).toThrow();
		expect(serializeProject(p)).toBe(before);
		const cyclic = nested();
		cyclic.diagrams[2].elements[0].childDiagramId = 'root';
		expect(() => duplicateBranch(cyclic, 'root', ['a'], () => `x`)).toThrow('cycle');
		const large = nested();
		for (let i = 3; i < 100; i++)
			large.diagrams.push({
				id: `d${i}`,
				title: 'Empty',
				elements: [],
				connections: [],
				viewport: { x: 0, y: 0, zoom: 1 }
			});
		let i = 0;
		expect(() => duplicateBranch(large, 'root', ['a'], () => `copy-${++i}`)).toThrow('100 diagram');
	});
});
