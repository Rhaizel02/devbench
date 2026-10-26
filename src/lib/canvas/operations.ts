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
	localToWorld,
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
/** Skip duplicate elbow vertices so a zero-length last segment cannot reverse a head. */
export function headTangent(vertices: Point[], start = false): Point | undefined {
	const tip = start ? vertices[0] : vertices.at(-1);
	if (!tip) return undefined;
	const candidates = start ? vertices.slice(1) : vertices.slice(0, -1).reverse();
	return candidates.find((p) => Math.hypot(p.x - tip.x, p.y - tip.y) > 1e-7);
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
/** Segment/box clipping, including border contact; independent of camera/zoom. */
function segmentHits(a: Point, b: Point, area: Box): boolean {
	let lo = 0,
		hi = 1;
	for (const axis of ['x', 'y'] as const) {
		const delta = b[axis] - a[axis],
			min = area[axis],
			max = min + (axis === 'x' ? area.width : area.height);
		if (Math.abs(delta) < 1e-9) {
			if (a[axis] < min - 1e-7 || a[axis] > max + 1e-7) return false;
		} else {
			const t1 = (min - a[axis]) / delta,
				t2 = (max - a[axis]) / delta;
			lo = Math.max(lo, Math.min(t1, t2));
			hi = Math.min(hi, Math.max(t1, t2));
			if (lo > hi + 1e-7) return false;
		}
	}
	return true;
}
function polygonContains(points: Point[], p: Point) {
	let inside = false;
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const a = points[i],
			b = points[j];
		if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
			inside = !inside;
	}
	return inside;
}
function entityIntersects(d: Diagram, id: string, area: Box) {
	const e = d.elements.find((e) => e.id === id),
		c = d.connections.find((c) => c.id === id);
	let points: Point[] = [];
	const closed = e && e.kind !== 'stroke';
	if (e) {
		if (e.kind === 'ellipse')
			points = Array.from({ length: 48 }, (_, i) =>
				localToWorld(e, {
					x: (e.width / 2) * (1 + Math.cos((i * Math.PI) / 24)),
					y: (e.height / 2) * (1 + Math.sin((i * Math.PI) / 24))
				})
			);
		else if (e.kind === 'diamond')
			points = [
				{ x: e.width / 2, y: 0 },
				{ x: e.width, y: e.height / 2 },
				{ x: e.width / 2, y: e.height },
				{ x: 0, y: e.height / 2 }
			].map((p) => localToWorld(e, p));
		else points = elementCorners(e);
	} else if (c) points = connectorVertices(d, c);
	if (points.some((p) => contains(area, { ...p, width: 0, height: 0 }))) return true;
	for (let i = 1; i < points.length; i++)
		if (segmentHits(points[i - 1], points[i], area)) return true;
	return !!(
		closed &&
		points.length &&
		(segmentHits(points.at(-1)!, points[0], area) || polygonContains(points, area))
	);
}
/** Intersect paths/rotated outlines, not empty group bounds. Shift adds; strict is explicit containment. */
export function marqueeSelection(
	d: Diagram,
	area: Box,
	initial: string[] = [],
	add = false,
	strict = false
): string[] {
	const hit = (id: string) =>
		strict ? contains(area, entityBounds(d, id)) : entityIntersects(d, id, area);
	const grouped = new Set(d.groups?.flatMap((g) => g.memberIds) ?? []),
		hits: string[] = [];
	for (const g of d.groups ?? [])
		if (strict ? contains(area, selectionBounds(d, g.memberIds)) : g.memberIds.some(hit))
			hits.push(...g.memberIds);
	for (const e of [...d.elements, ...d.connections])
		if (!grouped.has(e.id) && hit(e.id)) hits.push(e.id);
	return [...new Set([...(add ? initial : []), ...hits])];
}
/** Visible midpoint lies on the path; v3 control remains the quadratic pole for backup compatibility. */
export function connectorGrip(d: Diagram, c: Connection): Point {
	const a = endpoint(d, c.start),
		b = endpoint(d, c.end),
		p = connectorControl(d, c);
	if (c.geometry === 'elbow') return { x: p.x, y: (a.y + b.y) / 2 };
	if (c.geometry === 'curve') return { x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 };
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
export function bendConnector(d: Diagram, c: Connection, grip: Point): Connection {
	if (c.geometry === 'elbow') return { ...c, control: grip };
	const a = endpoint(d, c.start),
		b = endpoint(d, c.end);
	return {
		...c,
		geometry: 'curve',
		control: { x: 2 * grip.x - (a.x + b.x) / 2, y: 2 * grip.y - (a.y + b.y) / 2 }
	};
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
