// Versioned domain data only: no Konva/Svelte references or mutable singleton state.
export type Point = { x: number; y: number };
export type Viewport = Point & { zoom: number };
export type Element = Point & {
	id: string;
	kind: 'rectangle' | 'text' | 'stroke';
	label: string;
	width: number;
	height: number;
	points?: Point[];
	childDiagramId?: string;
};
export type Connection = { id: string; from: string; to: string; kind: 'arrow' | 'line' };
export type Diagram = {
	id: string;
	title: string;
	elements: Element[];
	connections: Connection[];
	viewport: Viewport;
};
export type Project = {
	schemaVersion: 1;
	id: string;
	title: string;
	rootDiagramId: string;
	diagrams: Diagram[];
};
export const LIMITS = { elements: 200, connections: 400, strokePoints: 2000 };
const finite = (value: number) => Number.isFinite(value) && Math.abs(value) <= 1_000_000;
function fail(message: string): never {
	throw new Error(message);
}
export function getDiagram(project: Project, id: string): Diagram {
	return project.diagrams.find((diagram) => diagram.id === id) ?? fail('Diagram does not exist.');
}
export function validateProject(project: Project): void {
	if (project.schemaVersion !== 1) fail('Unsupported project schema version.');
	const ids = new Set<string>();
	const claim = (id: string) => {
		if (!id || ids.has(id)) fail('IDs must be nonempty and globally unique.');
		ids.add(id);
	};
	claim(project.id);
	for (const diagram of project.diagrams) claim(diagram.id);
	getDiagram(project, project.rootDiagramId);
	for (const diagram of project.diagrams) {
		if (
			diagram.elements.length > LIMITS.elements ||
			diagram.connections.length > LIMITS.connections
		)
			fail('Diagram exceeds prototype limits.');
		if (
			![diagram.viewport.x, diagram.viewport.y].every(finite) ||
			!Number.isFinite(diagram.viewport.zoom) ||
			diagram.viewport.zoom < 0.25 ||
			diagram.viewport.zoom > 3
		)
			fail('Invalid viewport.');
		for (const element of diagram.elements) {
			claim(element.id);
			if (
				!['rectangle', 'text', 'stroke'].includes(element.kind) ||
				![element.x, element.y, element.width, element.height].every(finite) ||
				element.width <= 0 ||
				element.height <= 0 ||
				element.label.length > 200
			)
				fail('Invalid element geometry or label.');
			if (element.childDiagramId) {
				getDiagram(project, element.childDiagramId);
				if (element.kind === 'stroke') fail('Strokes cannot contain diagrams.');
			}
			if (
				element.kind === 'stroke' &&
				(!element.points ||
					element.points.length < 2 ||
					element.points.length > LIMITS.strokePoints ||
					element.points.some((point) => !finite(point.x) || !finite(point.y)))
			)
				fail('Invalid stroke.');
		}
		const nodes = new Set(
			diagram.elements.filter((element) => element.kind !== 'stroke').map((element) => element.id)
		);
		for (const connection of diagram.connections) {
			claim(connection.id);
			if (
				!['arrow', 'line'].includes(connection.kind) ||
				!nodes.has(connection.from) ||
				!nodes.has(connection.to) ||
				connection.from === connection.to
			)
				fail('Connections require two distinct nodes in the same diagram.');
		}
	}
	const visiting = new Set<string>(),
		visited = new Set<string>();
	function visit(id: string) {
		if (visiting.has(id)) fail('Hierarchy must not contain cycles.');
		if (visited.has(id)) return;
		visiting.add(id);
		for (const element of getDiagram(project, id).elements)
			if (element.childDiagramId) visit(element.childDiagramId);
		visiting.delete(id);
		visited.add(id);
	}
	for (const diagram of project.diagrams) visit(diagram.id);
}
export function addElement(diagram: Diagram, element: Element): Diagram {
	if (diagram.elements.length >= LIMITS.elements)
		fail('Prototype limit: 200 elements per diagram.');
	if (diagram.elements.some((value) => value.id === element.id)) fail('Element ID already exists.');
	return { ...diagram, elements: [...diagram.elements, element] };
}
export function moveElement(diagram: Diagram, id: string, point: Point): Diagram {
	if (!finite(point.x) || !finite(point.y)) fail('Position is outside prototype bounds.');
	return {
		...diagram,
		elements: diagram.elements.map((element) =>
			element.id === id ? { ...element, ...point } : element
		)
	};
}
export function connectElements(diagram: Diagram, connection: Connection): Diagram {
	const from = diagram.elements.find(
		(element) => element.id === connection.from && element.kind !== 'stroke'
	);
	const to = diagram.elements.find(
		(element) => element.id === connection.to && element.kind !== 'stroke'
	);
	if (!from || !to || from.id === to.id) fail('Choose two distinct nodes to connect.');
	if (diagram.connections.length >= LIMITS.connections)
		fail('Prototype limit: 400 connections per diagram.');
	if (
		diagram.connections.some(
			(value) => value.from === from.id && value.to === to.id && value.kind === connection.kind
		)
	)
		fail('That connection already exists.');
	return { ...diagram, connections: [...diagram.connections, connection] };
}
export function deleteSelection(diagram: Diagram, id: string): Diagram {
	return {
		...diagram,
		elements: diagram.elements.filter((element) => element.id !== id),
		connections: diagram.connections.filter(
			(connection) => connection.id !== id && connection.from !== id && connection.to !== id
		)
	};
}
export function childDestination(project: Project, diagramId: string, elementId: string): string {
	const element = getDiagram(project, diagramId).elements.find((value) => value.id === elementId);
	if (!element?.childDiagramId) fail('Selected element has no child diagram.');
	getDiagram(project, element.childDiagramId!);
	return element.childDiagramId!;
}
export function screenToWorld(point: Point, viewport: Viewport): Point {
	return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}
export function zoomAt(viewport: Viewport, factor: number, anchor: Point): Viewport {
	const world = screenToWorld(anchor, viewport),
		zoom = Math.max(0.25, Math.min(3, viewport.zoom * factor));
	return { x: anchor.x - world.x * zoom, y: anchor.y - world.y * zoom, zoom };
}
export function fitViewport(elements: Element[], width: number, height: number): Viewport {
	if (!elements.length) return { x: 32, y: 32, zoom: 1 };
	const left = Math.min(...elements.map((element) => element.x)),
		top = Math.min(...elements.map((element) => element.y));
	const right = Math.max(...elements.map((element) => element.x + element.width)),
		bottom = Math.max(...elements.map((element) => element.y + element.height));
	const zoom = Math.max(
		0.25,
		Math.min(1.3, (width - 64) / (right - left), (height - 80) / (bottom - top))
	);
	return {
		x: (width - (right - left) * zoom) / 2 - left * zoom,
		y: (height - (bottom - top) * zoom) / 2 - top * zoom,
		zoom
	};
}
export function portalViewport(element: Element, width: number, height: number): Viewport {
	const zoom = Math.max(
		0.25,
		Math.min(3, Math.min(width / element.width, height / element.height) * 0.8)
	);
	return {
		x: width / 2 - (element.x + element.width / 2) * zoom,
		y: height / 2 - (element.y + element.height / 2) * zoom,
		zoom
	};
}
export function strokeElement(id: string, points: Point[]): Element {
	if (points.length < 2 || points.length > LIMITS.strokePoints)
		fail('Stroke needs 2–2,000 points.');
	const x = Math.min(...points.map((point) => point.x)),
		y = Math.min(...points.map((point) => point.y));
	return {
		id,
		kind: 'stroke',
		label: 'Freehand annotation',
		x,
		y,
		width: Math.max(2, ...points.map((point) => point.x - x)),
		height: Math.max(2, ...points.map((point) => point.y - y)),
		points: points.map((point) => ({ x: point.x - x, y: point.y - y }))
	};
}
export function connectionPoints(diagram: Diagram, connection: Connection): number[] {
	const from = diagram.elements.find((element) => element.id === connection.from)!,
		to = diagram.elements.find((element) => element.id === connection.to)!;
	const center = (element: Element) => ({
		x: element.x + element.width / 2,
		y: element.y + element.height / 2
	});
	const a = center(from),
		b = center(to),
		dx = b.x - a.x,
		dy = b.y - a.y;
	const border = (element: Element) =>
		1 / Math.max(Math.abs(dx) / (element.width / 2), Math.abs(dy) / (element.height / 2), 1);
	const t1 = border(from),
		t2 = border(to);
	return [a.x + dx * t1, a.y + dy * t1, b.x - dx * t2, b.y - dy * t2];
}
