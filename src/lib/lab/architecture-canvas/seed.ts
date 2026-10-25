import { validateProject, type Project, type Element, type Connection } from './model';
const box = (
	id: string,
	label: string,
	x: number,
	y: number,
	childDiagramId?: string
): Element => ({
	id,
	kind: 'rectangle',
	label,
	x,
	y,
	width: 180,
	height: 106,
	...(childDiagramId ? { childDiagramId } : {})
});
const arrow = (id: string, from: string, to: string): Connection => ({
	id,
	from,
	to,
	kind: 'arrow'
});
export function createDemoProject(): Project {
	const project: Project = {
		schemaVersion: 1,
		id: 'demo-commerce',
		title: 'E-commerce architecture',
		rootDiagramId: 'commerce',
		diagrams: [
			{
				id: 'commerce',
				title: 'E-commerce',
				viewport: { x: 40, y: 60, zoom: 1 },
				elements: [
					box('api', 'API', 30, 130),
					box('orders', 'Pedidos', 310, 130, 'orders-diagram'),
					box('inventory', 'Inventario', 590, 130),
					{
						id: 'overview-note',
						kind: 'text',
						label: 'Follow a request. Open Pedidos to explore its internals.',
						x: 30,
						y: 25,
						width: 500,
						height: 55
					},
					{
						id: 'overview-ink',
						kind: 'stroke',
						label: 'Synthetic freehand annotation',
						x: 305,
						y: 254,
						width: 190,
						height: 18,
						points: [
							{ x: 0, y: 12 },
							{ x: 40, y: 4 },
							{ x: 90, y: 15 },
							{ x: 135, y: 3 },
							{ x: 190, y: 8 }
						]
					}
				],
				connections: [
					arrow('api-orders', 'api', 'orders'),
					arrow('orders-inventory', 'orders', 'inventory')
				]
			},
			{
				id: 'orders-diagram',
				title: 'Pedidos',
				viewport: { x: 40, y: 60, zoom: 1 },
				elements: [
					box('controller', 'Controller', 30, 130),
					box('service', 'Service', 310, 130, 'service-diagram'),
					box('database', 'Database', 590, 130),
					{
						id: 'orders-note',
						kind: 'text',
						label: 'Boundary: request handling → application logic → data.',
						x: 30,
						y: 25,
						width: 520,
						height: 55
					}
				],
				connections: [
					arrow('controller-service', 'controller', 'service'),
					arrow('service-database', 'service', 'database')
				]
			},
			{
				id: 'service-diagram',
				title: 'OrderService',
				viewport: { x: 40, y: 60, zoom: 1 },
				elements: [
					box('validation', 'Validación', 30, 130),
					box('persistence', 'Persistencia', 310, 130),
					box('event', 'Evento', 590, 130),
					{
						id: 'service-note',
						kind: 'text',
						label: 'Validate the order, persist it, then publish a domain event.',
						x: 30,
						y: 25,
						width: 520,
						height: 55
					}
				],
				connections: [
					arrow('validate-save', 'validation', 'persistence'),
					arrow('save-event', 'persistence', 'event')
				]
			}
		]
	};
	validateProject(project);
	return project;
}
