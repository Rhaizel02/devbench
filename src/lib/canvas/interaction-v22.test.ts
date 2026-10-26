import { describe, it, expect } from 'vitest';
import { DEFAULT_STYLE, emptyProject, localToWorld, type Element } from './model';
import {
	marqueeSelection,
	rectangle,
	connectorGrip,
	bendConnector,
	groupSelection
} from './operations';
const shape = (id: string, x: number, y: number, rotation = 0): Element => ({
	id,
	kind: 'rectangle',
	x,
	y,
	width: 100,
	height: 80,
	rotation,
	label: id,
	z: 0,
	style: { ...DEFAULT_STYLE }
});
describe('V2.2 selection and direct connector grips', () => {
	it('intersects partial shapes, rotated geometry and crossing paths; Shift adds, groups stay atomic', () => {
		const d = emptyProject('p', 'root').diagrams[0];
		d.elements = [shape('a', 0, 0), shape('b', 200, 0), shape('c', 400, 0, 45)];
		d.connections = [
			{
				id: 'line',
				kind: 'line',
				start: { x: -100, y: 40 },
				end: { x: 500, y: 40 },
				style: { ...DEFAULT_STYLE },
				z: 3
			}
		];
		expect(marqueeSelection(d, { x: 80, y: 20, width: 150, height: 30 }).sort()).toEqual([
			'a',
			'b',
			'line'
		]);
		expect(marqueeSelection(d, { x: 80, y: 20, width: 150, height: 30 }, [], false, true)).toEqual(
			[]
		);
		expect(marqueeSelection(d, { x: 0, y: 0, width: 2, height: 2 }, ['b'], true).sort()).toEqual([
			'a',
			'b'
		]);
		const corner = localToWorld(d.elements[2], { x: 95, y: 10 });
		expect(marqueeSelection(d, { ...corner, width: 1, height: 1 })).toContain('c');
		const grouped = groupSelection(d, ['a', 'b'], 'g');
		expect(marqueeSelection(grouped, { x: 2, y: 2, width: 5, height: 5 }).sort()).toEqual([
			'a',
			'b'
		]);
		expect(marqueeSelection(grouped, { x: 120, y: 2, width: 10, height: 5 })).toEqual([]);
		for (const [a, b] of [
			[
				{ x: -1, y: -1 },
				{ x: 301, y: 81 }
			],
			[
				{ x: 301, y: 81 },
				{ x: -1, y: -1 }
			]
		])
			expect(marqueeSelection(d, rectangle(a, b))).toEqual(['a', 'b', 'line']);
	});
	it('keeps straight midpoint stationary on conversion, then follows the quadratic path and preserves style/anchors', () => {
		const d = emptyProject('p', 'root').diagrams[0];
		d.elements = [shape('a', 0, 0), shape('b', 200, 0)];
		const c = {
			id: 'c',
			kind: 'arrow' as const,
			start: { x: 100, y: 40, elementId: 'a', u: 1, v: 0.5 },
			end: { x: 200, y: 40, elementId: 'b', u: 0, v: 0.5 },
			style: { ...DEFAULT_STYLE },
			z: 4
		};
		const grip = connectorGrip(d, c),
			next = bendConnector(d, c, grip);
		expect(grip).toEqual({ x: 150, y: 40 });
		expect(connectorGrip(d, next)).toEqual(grip);
		const bent = bendConnector(d, c, { x: 150, y: 100 });
		expect(connectorGrip(d, bent)).toEqual({ x: 150, y: 100 });
		expect(bent.start).toEqual(c.start);
		expect(bent.end).toEqual(c.end);
		expect(bent.style).toEqual(c.style);
	});
});
