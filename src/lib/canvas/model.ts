/** Versioned document data. No renderer, storage or framework types. */
export type Point = { x: number; y: number };
export type Viewport = Point & { zoom: number };
export type Style = {
	stroke: string;
	fill: string;
	width: number;
	dashed: boolean;
	font: 'sans' | 'mono' | 'serif';
	fontSize: number;
	sketch: boolean;
};
export type Element = Point & {
	id: string;
	kind: 'rectangle' | 'rounded' | 'ellipse' | 'diamond' | 'text' | 'stroke';
	label: string;
	width: number;
	height: number;
	points?: Point[];
	childDiagramId?: string;
	style: Style;
	z: number;
};
export type Endpoint = Point & { elementId?: string; u?: number; v?: number };
export type Connection = {
	id: string;
	kind: 'line' | 'arrow';
	start: Endpoint;
	end: Endpoint;
	style: Style;
	z: number;
};
export type Diagram = {
	id: string;
	title: string;
	elements: Element[];
	connections: Connection[];
	viewport: Viewport;
};
export type Project = {
	schemaVersion: 2;
	id: string;
	title: string;
	rootDiagramId: string;
	diagrams: Diagram[];
};
export const LIMITS = {
	bytes: 8 * 1024 * 1024,
	diagrams: 100,
	elements: 500,
	connections: 500,
	points: 2000,
	totalPoints: 100000,
	label: 10000,
	history: 30
};
export const DEFAULT_STYLE: Style = {
	stroke: '#8899aa',
	fill: 'transparent',
	width: 2,
	dashed: false,
	font: 'sans',
	fontSize: 20,
	sketch: true
};
export const FONT_FAMILIES = {
	sans: 'Geist, sans-serif',
	mono: '"JetBrains Mono", monospace',
	serif: 'Georgia, serif'
};
export function labelInk(fill: string, themeText: string): string {
	if (fill === 'transparent') return themeText;
	const rgb = [1, 3, 5]
		.map((i) => parseInt(fill.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.4 ? '#18181b' : '#ededf0';
}
export function fail(message: string): never {
	throw new Error(message);
}
export const clone = <T>(value: T): T => structuredClone(value);
export const newId = (prefix = 'item') => prefix + '-' + crypto.randomUUID();
export function emptyProject(id: string, rootId: string, title = 'Untitled board'): Project {
	return {
		schemaVersion: 2,
		id,
		title,
		rootDiagramId: rootId,
		diagrams: [
			{
				id: rootId,
				title: 'Overview',
				elements: [],
				connections: [],
				viewport: { x: 48, y: 64, zoom: 1 }
			}
		]
	};
}
export function getDiagram(project: Project, id: string): Diagram {
	return project.diagrams.find((d) => d.id === id) ?? fail('Diagram does not exist.');
}
export function replaceDiagram(project: Project, diagram: Diagram): Project {
	return { ...project, diagrams: project.diagrams.map((d) => (d.id === diagram.id ? diagram : d)) };
}
export function endpoint(diagram: Diagram, end: Endpoint): Point {
	const node = diagram.elements.find((e) => e.id === end.elementId);
	return node
		? { x: node.x + node.width * (end.u ?? 0.5), y: node.y + node.height * (end.v ?? 0.5) }
		: { x: end.x, y: end.y };
}
export function anchorAt(diagram: Diagram, point: Point): Endpoint {
	const node = [...diagram.elements]
		.sort((a, b) => b.z - a.z)
		.find(
			(e) =>
				e.kind !== 'stroke' &&
				e.kind !== 'text' &&
				point.x >= e.x - 12 &&
				point.x <= e.x + e.width + 12 &&
				point.y >= e.y - 12 &&
				point.y <= e.y + e.height + 12
		);
	if (!node) return { ...point };
	let u = Math.max(0, Math.min(1, (point.x - node.x) / node.width)),
		v = Math.max(0, Math.min(1, (point.y - node.y) / node.height));
	const distances = [u, 1 - u, v, 1 - v],
		side = distances.indexOf(Math.min(...distances));
	if (side === 0) u = 0;
	else if (side === 1) u = 1;
	else if (side === 2) v = 0;
	else v = 1;
	return { ...point, elementId: node.id, u, v };
}
export function moveSelection(diagram: Diagram, ids: string[], delta: Point): Diagram {
	const moving = new Set(ids);
	const shift = (end: Endpoint) =>
		moving.has(end.elementId ?? '')
			? end
			: {
					...end,
					x: end.x + delta.x,
					y: end.y + delta.y,
					elementId: undefined,
					u: undefined,
					v: undefined
				};
	return {
		...diagram,
		elements: diagram.elements.map((e) =>
			moving.has(e.id) ? { ...e, x: e.x + delta.x, y: e.y + delta.y } : e
		),
		connections: diagram.connections.map((c) =>
			moving.has(c.id) ? { ...c, start: shift(c.start), end: shift(c.end) } : c
		)
	};
}
export function deleteSelection(diagram: Diagram, ids: string[]): Diagram {
	const removing = new Set(ids);
	return {
		...diagram,
		elements: diagram.elements.filter((e) => !removing.has(e.id)),
		connections: diagram.connections.filter(
			(c) =>
				!removing.has(c.id) &&
				!removing.has(c.start.elementId ?? '') &&
				!removing.has(c.end.elementId ?? '')
		)
	};
}
export function duplicateSelection(
	diagram: Diagram,
	ids: string[],
	id: () => string
): { diagram: Diagram; ids: string[] } {
	const mapping = new Map(ids.map((key) => [key, id()]));
	const z =
		Math.max(0, ...diagram.elements.map((e) => e.z), ...diagram.connections.map((c) => c.z)) + 1;
	const elements = diagram.elements
		.filter((e) => mapping.has(e.id))
		.map((e, i) => ({ ...clone(e), id: mapping.get(e.id)!, x: e.x + 24, y: e.y + 24, z: z + i }));
	const ends = (end: Endpoint): Endpoint => ({
		...end,
		x: end.x + 24,
		y: end.y + 24,
		elementId: end.elementId ? (mapping.get(end.elementId) ?? end.elementId) : undefined
	});
	const connections = diagram.connections
		.filter(
			(c) =>
				mapping.has(c.id) ||
				(mapping.has(c.start.elementId ?? '') && mapping.has(c.end.elementId ?? ''))
		)
		.map((c, i) => ({
			...clone(c),
			id: mapping.get(c.id) ?? id(),
			start: ends(c.start),
			end: ends(c.end),
			z: z + elements.length + i
		}));
	if (
		diagram.elements.length + elements.length > LIMITS.elements ||
		diagram.connections.length + connections.length > LIMITS.connections
	)
		fail('Diagram limit reached.');
	return {
		diagram: {
			...diagram,
			elements: [...diagram.elements, ...elements],
			connections: [...diagram.connections, ...connections]
		},
		ids: [...elements, ...connections].map((e) => e.id)
	};
}
export function resizeElement(element: Element, width: number, height: number): Element {
	const w = Math.max(16, Math.min(20000, width)),
		h = Math.max(16, Math.min(20000, height));
	return {
		...element,
		width: w,
		height: h,
		points: element.points?.map((p) => ({
			x: (p.x * w) / element.width,
			y: (p.y * h) / element.height
		}))
	};
}
export function associateChild(
	project: Project,
	diagramId: string,
	elementId: string,
	childId: string | undefined
): Project {
	const diagram = getDiagram(project, diagramId),
		element = diagram.elements.find((e) => e.id === elementId);
	if (!element || element.kind === 'stroke' || element.kind === 'text')
		fail('Choose a figure for the child diagram.');
	if (childId) getDiagram(project, childId);
	const next = replaceDiagram(project, {
		...diagram,
		elements: diagram.elements.map((e) =>
			e.id === elementId ? { ...e, childDiagramId: childId } : e
		)
	});
	validateHierarchy(next);
	return next;
}
export function validateHierarchy(project: Project) {
	const visiting = new Set<string>(),
		visited = new Set<string>();
	function visit(id: string) {
		if (visiting.has(id)) fail('A child diagram cannot create a hierarchy cycle.');
		if (visited.has(id)) return;
		visiting.add(id);
		for (const e of getDiagram(project, id).elements) if (e.childDiagramId) visit(e.childDiagramId);
		visiting.delete(id);
		visited.add(id);
	}
	getDiagram(project, project.rootDiagramId);
	for (const d of project.diagrams) visit(d.id);
}
export function orphanDiagrams(project: Project): Diagram[] {
	const linked = new Set(
		project.diagrams.flatMap((d) =>
			d.elements.flatMap((e) => (e.childDiagramId ? [e.childDiagramId] : []))
		)
	);
	return project.diagrams.filter((d) => d.id !== project.rootDiagramId && !linked.has(d.id));
}
export function deleteDiagram(project: Project, id: string): Project {
	if (id === project.rootDiagramId) fail('The overview diagram cannot be deleted.');
	getDiagram(project, id);
	return {
		...project,
		diagrams: project.diagrams
			.filter((d) => d.id !== id)
			.map((d) => ({
				...d,
				elements: d.elements.map((e) =>
					e.childDiagramId === id ? { ...e, childDiagramId: undefined } : e
				)
			}))
	};
}
export function screenToWorld(point: Point, view: Viewport): Point {
	return { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom };
}
export function zoomAt(view: Viewport, factor: number, point: Point): Viewport {
	const world = screenToWorld(point, view),
		zoom = Math.max(0.2, Math.min(4, view.zoom * factor));
	return { x: point.x - world.x * zoom, y: point.y - world.y * zoom, zoom };
}
export function bounds(diagram: Diagram) {
	const points = diagram.elements
		.flatMap((e) => [
			{ x: e.x, y: e.y },
			{ x: e.x + e.width, y: e.y + e.height }
		])
		.concat(
			diagram.connections.flatMap((c) => [endpoint(diagram, c.start), endpoint(diagram, c.end)])
		);
	if (!points.length) return { x: 0, y: 0, width: 400, height: 300 };
	const x = Math.min(...points.map((p) => p.x)),
		y = Math.min(...points.map((p) => p.y));
	return {
		x,
		y,
		width: Math.max(1, ...points.map((p) => p.x - x)),
		height: Math.max(1, ...points.map((p) => p.y - y))
	};
}
export function fitViewport(diagram: Diagram, width: number, height: number): Viewport {
	const b = bounds(diagram),
		zoom = Math.max(0.2, Math.min(1.2, (width - 64) / b.width, (height - 64) / b.height));
	return {
		x: (width - b.width * zoom) / 2 - b.x * zoom,
		y: (height - b.height * zoom) / 2 - b.y * zoom,
		zoom
	};
}
export function strokeElement(id: string, points: Point[], style: Style, z: number): Element {
	if (points.length < 2 || points.length > LIMITS.points) fail('A stroke needs 2–2,000 points.');
	const x = Math.min(...points.map((p) => p.x)),
		y = Math.min(...points.map((p) => p.y));
	return {
		id,
		kind: 'stroke',
		label: 'Freehand',
		x,
		y,
		width: Math.max(1, ...points.map((p) => p.x - x)),
		height: Math.max(1, ...points.map((p) => p.y - y)),
		points: points.map((p) => ({ x: p.x - x, y: p.y - y })),
		style: { ...style },
		z
	};
}
/** Deterministic small second contour: stable across repaint, zoom and export. */
export function sketchPath(kind: Element['kind'], width: number, height: number): number[] {
	if (kind === 'diamond')
		return [
			width / 2 + 1,
			1,
			width - 1,
			height / 2 + 1,
			width / 2 - 1,
			height - 1,
			1,
			height / 2 - 1
		];
	return [1, 1, width - 1, 2, width - 2, height - 1, 2, height - 2];
}
