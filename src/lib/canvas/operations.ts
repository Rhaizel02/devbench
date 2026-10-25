/** Document operations independent of renderer, gestures and persistence. */
import {
	bounds,
	clone,
	deleteSelection,
	duplicateSelection,
	elementCorners,
	endpoint,
	expandGroups,
	fail,
	getDiagram,
	LIMITS,
	moveSelection,
	replaceDiagram,
	rotatePoint,
	validateHierarchy,
	type Connection,
	type Diagram,
	type Point,
	type Project
} from './model';
import { parseProject } from './serialization';
export type Box = Point & { width: number; height: number };
export function rectangle(a: Point, b: Point): Box {
	return {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		width: Math.abs(a.x - b.x),
		height: Math.abs(a.y - b.y)
	};
}
export function connectorControl(d: Diagram, c: Connection): Point {
	const a = endpoint(d, c.start),
		b = endpoint(d, c.end);
	return (
		c.control ??
		(c.geometry === 'elbow'
			? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
			: { x: (a.x + b.x) / 2 - (b.y - a.y) * 0.25, y: (a.y + b.y) / 2 + (b.x - a.x) * 0.25 })
	);
}
export function connectorVertices(d: Diagram, c: Connection): Point[] {
	const a = endpoint(d, c.start),
		b = endpoint(d, c.end),
		control = connectorControl(d, c);
	if (c.geometry === 'elbow') return [a, { x: control.x, y: a.y }, { x: control.x, y: b.y }, b];
	if (c.geometry !== 'curve') return [a, b];
	return Array.from({ length: 33 }, (_, i) => {
		const t = i / 32,
			s = 1 - t;
		return {
			x: s * s * a.x + 2 * s * t * control.x + t * t * b.x,
			y: s * s * a.y + 2 * s * t * control.y + t * t * b.y
		};
	});
}
function box(points: Point[]): Box {
	if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
	const x = Math.min(...points.map((p) => p.x)),
		y = Math.min(...points.map((p) => p.y));
	return {
		x,
		y,
		width: Math.max(...points.map((p) => p.x)) - x,
		height: Math.max(...points.map((p) => p.y)) - y
	};
}
export function entityBounds(d: Diagram, id: string): Box {
	const e = d.elements.find((e) => e.id === id);
	if (e) return box(elementCorners(e));
	const c = d.connections.find((c) => c.id === id);
	if (!c) fail('Selection no longer exists.');
	const points = connectorVertices(d, c);
	if (c.geometry === 'curve') {
		const a = endpoint(d, c.start),
			b = endpoint(d, c.end),
			p = connectorControl(d, c);
		for (const axis of ['x', 'y'] as const) {
			const divisor = a[axis] - 2 * p[axis] + b[axis],
				t = (a[axis] - p[axis]) / divisor;
			if (t > 0 && t < 1)
				points.push({
					x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * p.x + t * t * b.x,
					y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * p.y + t * t * b.y
				});
		}
	}
	return box(points);
}
export function selectionBounds(d: Diagram, ids: string[]): Box {
	return box(
		ids.flatMap((id) => {
			const b = entityBounds(d, id);
			return [
				{ x: b.x, y: b.y },
				{ x: b.x + b.width, y: b.y + b.height }
			];
		})
	);
}
function contains(a: Box, b: Box) {
	return (
		b.x >= a.x - 1e-7 &&
		b.y >= a.y - 1e-7 &&
		b.x + b.width <= a.x + a.width + 1e-7 &&
		b.y + b.height <= a.y + a.height + 1e-7
	);
}
/** Full world-space geometric bounds containment; complete groups are selected as units. */
export function marqueeSelection(
	d: Diagram,
	area: Box,
	initial: string[] = [],
	toggle = false
): string[] {
	const grouped = new Set(d.groups?.flatMap((g) => g.memberIds) ?? []),
		hits: string[] = [];
	for (const g of d.groups ?? [])
		if (contains(area, selectionBounds(d, g.memberIds))) hits.push(...g.memberIds);
	for (const e of [...d.elements, ...d.connections])
		if (!grouped.has(e.id) && contains(area, entityBounds(d, e.id))) hits.push(e.id);
	if (!toggle) return hits;
	const next = new Set(initial);
	for (const id of hits)
		if (next.has(id)) next.delete(id);
		else next.add(id);
	return [...next];
}
export function groupSelection(d: Diagram, ids: string[], id: string): Diagram {
	const members = expandGroups(d, ids);
	if (members.length < 2) fail('Select at least two elements to group.');
	if (members.some((id) => ![...d.elements, ...d.connections].some((e) => e.id === id)))
		fail('Group member is missing.');
	if (
		[
			d.id,
			...d.elements.map((e) => e.id),
			...d.connections.map((e) => e.id),
			...(d.groups ?? []).map((g) => g.id)
		].includes(id)
	)
		fail('Group ID already exists.');
	const remaining = (d.groups ?? []).filter((g) => !g.memberIds.some((id) => members.includes(id)));
	return reorder({ ...d, groups: [...remaining, { id, memberIds: members }] }, members, true);
}
export function ungroupSelection(d: Diagram, ids: string[]): Diagram {
	return {
		...d,
		groups: (d.groups ?? []).filter((g) => !g.memberIds.some((id) => ids.includes(id)))
	};
}
export function reorder(d: Diagram, ids: string[], front: boolean): Diagram {
	const chosen = new Set(expandGroups(d, ids)),
		all = [...d.elements, ...d.connections].sort((a, b) => a.z - b.z);
	const a = all.filter((e) => chosen.has(e.id)),
		b = all.filter((e) => !chosen.has(e.id));
	const z = new Map((front ? [...b, ...a] : [...a, ...b]).map((e, i) => [e.id, i]));
	return {
		...d,
		elements: d.elements.map((e) => ({ ...e, z: z.get(e.id)! })),
		connections: d.connections.map((c) => ({ ...c, z: z.get(c.id)! }))
	};
}
export function rotateSelection(
	d: Diagram,
	ids: string[],
	degrees: number,
	pivot?: Point
): Diagram {
	ids = expandGroups(d, ids);
	const moving = new Set(ids),
		b = selectionBounds(d, ids);
	const center = pivot ?? { x: b.x + b.width / 2, y: b.y + b.height / 2 };
	const end = (p: Connection['start']) =>
		p.elementId && moving.has(p.elementId)
			? p
			: { ...rotatePoint(endpoint(d, p), center, degrees) };
	return {
		...d,
		elements: d.elements.map((e) => {
			if (!moving.has(e.id)) return e;
			const c = rotatePoint({ x: e.x + e.width / 2, y: e.y + e.height / 2 }, center, degrees);
			return {
				...e,
				x: c.x - e.width / 2,
				y: c.y - e.height / 2,
				rotation: ((e.rotation ?? 0) + degrees) % 360
			};
		}),
		connections: d.connections.map((c) => {
			const internal = moving.has(c.start.elementId ?? '') && moving.has(c.end.elementId ?? '');
			if (!moving.has(c.id) && !internal) return c;
			return {
				...c,
				...(moving.has(c.id) ? { start: end(c.start), end: end(c.end) } : {}),
				...(c.control ? { control: rotatePoint(c.control, center, degrees) } : {})
			};
		})
	};
}
/** Uniform group transform: no skew/shear and no change to individual labels/styles. */
export function scaleSelection(d: Diagram, ids: string[], factor: number, origin?: Point): Diagram {
	if (!Number.isFinite(factor) || factor <= 0) fail('Invalid scale.');
	ids = expandGroups(d, ids);
	const moving = new Set(ids),
		b = selectionBounds(d, ids),
		p = origin ?? b;
	const scale = (v: Point) => ({ x: p.x + (v.x - p.x) * factor, y: p.y + (v.y - p.y) * factor });
	const elements = d.elements.map((e) => {
		if (!moving.has(e.id)) return e;
		if (
			e.width * factor < 1 ||
			e.height * factor < 1 ||
			e.width * factor > 20000 ||
			e.height * factor > 20000
		)
			fail('Resize exceeds figure limits.');
		return {
			...e,
			...scale(e),
			width: e.width * factor,
			height: e.height * factor,
			points: e.points?.map((p) => ({ x: p.x * factor, y: p.y * factor }))
		};
	});
	const end = (e: Connection['start']) =>
		e.elementId && moving.has(e.elementId) ? e : { ...scale(endpoint(d, e)) };
	return {
		...d,
		elements,
		connections: d.connections.map((c) => {
			const internal = moving.has(c.start.elementId ?? '') && moving.has(c.end.elementId ?? '');
			return moving.has(c.id) || internal
				? {
						...c,
						...(moving.has(c.id) ? { start: end(c.start), end: end(c.end) } : {}),
						...(c.control ? { control: scale(c.control) } : {})
					}
				: c;
		})
	};
}
export type Alignment =
	'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'horizontal' | 'vertical';
export function alignSelection(d: Diagram, ids: string[], alignment: Alignment): Diagram {
	ids = expandGroups(d, ids);
	const grouped = new Set<string>(),
		units: string[][] = [];
	for (const g of d.groups ?? [])
		if (g.memberIds.every((id) => ids.includes(id))) {
			units.push(g.memberIds);
			g.memberIds.forEach((id) => grouped.add(id));
		}
	units.push(...ids.filter((id) => !grouped.has(id)).map((id) => [id]));
	if (units.length < 2) fail('Select at least two separate elements or groups.');
	const all = selectionBounds(d, ids),
		horizontal = ['left', 'center', 'right', 'horizontal'].includes(alignment),
		axis = horizontal ? 'x' : 'y',
		extent = horizontal ? 'width' : 'height';
	const sorted = units
		.map((ids) => ({ ids, b: selectionBounds(d, ids) }))
		.sort((a, b) => a.b[axis] - b.b[axis]);
	if ((alignment === 'horizontal' || alignment === 'vertical') && units.length < 3)
		fail('Distribution needs at least three elements or groups.');
	const total = sorted.reduce((n, u) => n + u.b[extent], 0),
		gap = (all[extent] - total) / (sorted.length - 1);
	let cursor = all[axis],
		next = d;
	for (const unit of sorted) {
		let target = all[axis];
		if (alignment === 'center' || alignment === 'middle')
			target += (all[extent] - unit.b[extent]) / 2;
		if (alignment === 'right' || alignment === 'bottom') target += all[extent] - unit.b[extent];
		if (alignment === 'horizontal' || alignment === 'vertical') {
			target = cursor;
			cursor += unit.b[extent] + gap;
		}
		next = moveSelection(
			next,
			unit.ids,
			horizontal ? { x: target - unit.b.x, y: 0 } : { x: 0, y: target - unit.b.y }
		);
	}
	return next;
}
/** Duplicate one DAG once per source diagram, preserving sharing within the independent copy. */
export function duplicateBranch(
	project: Project,
	diagramId: string,
	ids: string[],
	id: () => string,
	independent = true
): { project: Project; ids: string[] } {
	validateHierarchy(project);
	const source = getDiagram(project, diagramId),
		selected = expandGroups(source, ids);
	const duplicated = duplicateSelection(source, selected, id),
		diagramMap = new Map<string, string>(),
		copies: Diagram[] = [];
	function copyDiagram(sourceId: string): string {
		const existing = diagramMap.get(sourceId);
		if (existing) return existing;
		if (project.diagrams.length + diagramMap.size >= LIMITS.diagrams)
			fail('Independent copy exceeds the 100 diagram limit.');
		const original = getDiagram(project, sourceId),
			nextId = id();
		diagramMap.set(sourceId, nextId);
		const members = new Map(
			[...original.elements, ...original.connections].map((e) => [e.id, id()])
		);
		const copy: Diagram = {
			...clone(original),
			id: nextId,
			elements: original.elements.map((e) => ({
				...clone(e),
				id: members.get(e.id)!,
				...(e.childDiagramId ? { childDiagramId: copyDiagram(e.childDiagramId) } : {})
			})),
			connections: original.connections.map((c) => ({
				...clone(c),
				id: members.get(c.id)!,
				start: {
					...c.start,
					...(c.start.elementId ? { elementId: members.get(c.start.elementId)! } : {})
				},
				end: { ...c.end, ...(c.end.elementId ? { elementId: members.get(c.end.elementId)! } : {}) }
			})),
			...(original.groups
				? {
						groups: original.groups.map((g) => ({
							id: id(),
							memberIds: g.memberIds.map((id) => members.get(id)!)
						}))
					}
				: {})
		};
		copies.push(copy);
		return nextId;
	}
	if (independent)
		duplicated.diagram = {
			...duplicated.diagram,
			elements: duplicated.diagram.elements.map((e) =>
				duplicated.ids.includes(e.id) && e.childDiagramId
					? { ...e, childDiagramId: copyDiagram(e.childDiagramId) }
					: e
			)
		};
	const next = replaceDiagram(project, duplicated.diagram);
	next.diagrams = [...next.diagrams, ...copies];
	return { project: parseProject(JSON.stringify(next)), ids: duplicated.ids };
}
export function deleteFromProject(project: Project, diagramId: string, ids: string[]): Project {
	return replaceDiagram(project, deleteSelection(getDiagram(project, diagramId), ids));
}
export function documentBounds(d: Diagram): Box {
	if (!d.elements.length && !d.connections.length) return bounds(d);
	return selectionBounds(
		d,
		[...d.elements, ...d.connections].map((e) => e.id)
	);
}
