import {
	LIMITS,
	DEFAULT_STYLE,
	validateHierarchy,
	fail,
	type Project,
	type Element,
	type Connection,
	type Point,
	type Endpoint,
	type Style,
	type Viewport
} from './model';
import {
	validateProject as validateV1,
	connectionPoints,
	type Project as ProjectV1
} from '../lab/architecture-canvas/model';
type Obj = Record<string, unknown>;
function object(value: unknown): Obj {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object.');
	return value as Obj;
}
function text(value: unknown, max = LIMITS.label): string {
	if (typeof value !== 'string' || value.length > max) fail('Invalid or oversized text.');
	return value;
}
function id(value: unknown): string {
	const result = text(value, 120);
	if (!result || !/^[\w.-]+$/.test(result)) fail('Invalid ID.');
	return result;
}
function number(value: unknown, min = -1e6, max = 1e6): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
		fail('Invalid numeric value.');
	return value;
}
function list(value: unknown, max: number): unknown[] {
	if (!Array.isArray(value) || value.length > max) fail('Collection exceeds document limits.');
	return value;
}
function point(value: unknown): Point {
	const p = object(value);
	return { x: number(p.x), y: number(p.y) };
}
function viewport(value: unknown): Viewport {
	const p = object(value);
	return { ...point(p), zoom: number(p.zoom, 0.2, 4) };
}
export function color(value: unknown, transparent = false): string {
	if (transparent && value === 'transparent') return value;
	const result = text(value, 7);
	if (!/^#[0-9a-f]{6}$/i.test(result)) fail('Use a six-digit HEX color, for example #20bfa9.');
	return result;
}
function style(value: unknown): Style {
	const s = object(value);
	if (
		typeof s.dashed !== 'boolean' ||
		typeof s.sketch !== 'boolean' ||
		!['sans', 'mono', 'serif'].includes(String(s.font))
	)
		fail('Invalid style.');
	return {
		stroke: color(s.stroke),
		fill: color(s.fill, true),
		width: number(s.width, 1, 12),
		font: s.font as Style['font'],
		fontSize: number(s.fontSize, 12, 96),
		dashed: s.dashed,
		sketch: s.sketch
	};
}
function end(value: unknown): Endpoint {
	const p = object(value);
	return {
		...point(p),
		...(p.elementId !== undefined
			? { elementId: id(p.elementId), u: number(p.u, 0, 1), v: number(p.v, 0, 1) }
			: {})
	};
}
function safeTree(value: unknown, depth = 0): void {
	if (depth > 20) fail('Document nesting exceeds 20 levels.');
	if (value && typeof value === 'object')
		for (const [key, child] of Object.entries(value)) {
			if (['__proto__', 'prototype', 'constructor'].includes(key))
				fail('Unsafe document property.');
			safeTree(child, depth + 1);
		}
}
/** Builds a fresh whitelisted DTO; hostile/future input never mutates an open document. */
export function parseProject(input: string): Project {
	if (new TextEncoder().encode(input).length > LIMITS.bytes)
		fail('Project exceeds the 8 MiB import limit.');
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		fail('Invalid project JSON.');
	}
	safeTree(value);
	const root = object(value);
	if (root.schemaVersion === 1) return migrateV1(root);
	if (root.schemaVersion !== 2) fail('Unsupported project schema version.');
	return parseV2(root);
}
function parseV2(root: Obj): Project {
	let totalPoints = 0;
	const claimIds = new Set<string>();
	function claim(value: unknown) {
		const key = id(value);
		if (claimIds.has(key)) fail('IDs must be globally unique.');
		claimIds.add(key);
		return key;
	}
	const project: Project = {
		schemaVersion: 2,
		id: claim(root.id),
		title: text(root.title, 200),
		rootDiagramId: id(root.rootDiagramId),
		diagrams: []
	};
	project.diagrams = list(root.diagrams, LIMITS.diagrams).map((raw) => {
		const d = object(raw),
			diagramId = claim(d.id);
		const elements: Element[] = list(d.elements, LIMITS.elements).map((raw) => {
			const e = object(raw);
			if (
				!['rectangle', 'rounded', 'ellipse', 'diamond', 'text', 'stroke'].includes(String(e.kind))
			)
				fail('Unsupported figure type.');
			const result: Element = {
				...point(e),
				id: claim(e.id),
				kind: e.kind as Element['kind'],
				label: text(e.label),
				width: number(e.width, 1, 20000),
				height: number(e.height, 1, 20000),
				z: number(e.z, 0, 1e6),
				style: style(e.style)
			};
			if (e.childDiagramId !== undefined) {
				if (['stroke', 'text'].includes(result.kind)) fail('Only figures may contain diagrams.');
				result.childDiagramId = id(e.childDiagramId);
			}
			if (e.points !== undefined) {
				result.points = list(e.points, LIMITS.points).map(point);
				totalPoints += result.points.length;
			}
			if (result.kind === 'stroke' && (!result.points || result.points.length < 2))
				fail('A stroke needs at least two points.');
			return result;
		});
		const nodes = new Set(
			elements.filter((e) => !['stroke', 'text'].includes(e.kind)).map((e) => e.id)
		);
		const connections: Connection[] = list(d.connections, LIMITS.connections).map((raw) => {
			const c = object(raw);
			if (c.kind !== 'line' && c.kind !== 'arrow') fail('Unsupported connector.');
			const result: Connection = {
				id: claim(c.id),
				kind: c.kind,
				start: end(c.start),
				end: end(c.end),
				style: style(c.style),
				z: number(c.z, 0, 1e6)
			};
			for (const e of [result.start, result.end])
				if (e.elementId && !nodes.has(e.elementId))
					fail('Connector anchor does not exist in this diagram.');
			return result;
		});
		return {
			id: diagramId,
			title: text(d.title, 200),
			elements,
			connections,
			viewport: viewport(d.viewport)
		};
	});
	if (totalPoints > LIMITS.totalPoints) fail('Project exceeds 100,000 ink points.');
	validateHierarchy(project);
	return project;
}
function migrateV1(root: Obj): Project {
	// Parse every field before invoking the old typed validator; never cast untrusted raw JSON.
	const old: ProjectV1 = {
		schemaVersion: 1,
		id: id(root.id),
		title: text(root.title, 200),
		rootDiagramId: id(root.rootDiagramId),
		diagrams: list(root.diagrams, LIMITS.diagrams).map((raw) => {
			const d = object(raw);
			return {
				id: id(d.id),
				title: text(d.title, 200),
				viewport: viewport(d.viewport),
				elements: list(d.elements, 200).map((raw) => {
					const e = object(raw);
					if (!['rectangle', 'text', 'stroke'].includes(String(e.kind)))
						fail('Invalid v1 element.');
					return {
						...point(e),
						id: id(e.id),
						kind: e.kind as 'rectangle' | 'text' | 'stroke',
						label: text(e.label, 200),
						width: number(e.width, 1, 20000),
						height: number(e.height, 1, 20000),
						...(e.childDiagramId !== undefined ? { childDiagramId: id(e.childDiagramId) } : {}),
						...(e.points !== undefined ? { points: list(e.points, 2000).map(point) } : {})
					};
				}),
				connections: list(d.connections, 400).map((raw) => {
					const c = object(raw);
					if (c.kind !== 'arrow' && c.kind !== 'line') fail('Invalid v1 connector.');
					return { id: id(c.id), from: id(c.from), to: id(c.to), kind: c.kind };
				})
			};
		})
	};
	validateV1(old);
	const migrated: Project = {
		...old,
		schemaVersion: 2,
		diagrams: old.diagrams.map((d) => ({
			...d,
			elements: d.elements.map((e, i) => ({
				...e,
				style: { ...DEFAULT_STYLE, stroke: e.kind === 'stroke' ? '#20bfa9' : '#8899aa' },
				z: i + 1
			})),
			connections: d.connections.map((c, i) => {
				const [x1, y1, x2, y2] = connectionPoints(d, c),
					from = d.elements.find((e) => e.id === c.from)!,
					to = d.elements.find((e) => e.id === c.to)!;
				// Legacy text anchors are retained as free endpoints; geometry and IDs are preserved.
				const anchor = (node: typeof from, x: number, y: number): Endpoint =>
					node.kind === 'text'
						? { x, y }
						: {
								x,
								y,
								elementId: node.id,
								u: (x - node.x) / node.width,
								v: (y - node.y) / node.height
							};
				return {
					id: c.id,
					kind: c.kind,
					start: anchor(from, x1, y1),
					end: anchor(to, x2, y2),
					style: { ...DEFAULT_STYLE },
					z: i
				};
			})
		}))
	};
	return parseV2(migrated as unknown as Obj);
}
export function serializeProject(project: Project): string {
	const result = JSON.stringify(project, null, 2);
	parseProject(result);
	return result;
}
