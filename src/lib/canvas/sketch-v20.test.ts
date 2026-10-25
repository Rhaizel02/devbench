import { expect, it } from 'vitest';
import { figurePaths, figureSignature, connectionPaths, stableSeed } from './sketch';
import { DEFAULT_STYLE, type Element } from './model';
it('generates deterministic sketch paths independent of movement and theme, with distinct seeds and clean/hachure options', () => {
	const e: Element = {
		id: 'synthetic',
		kind: 'rectangle',
		x: 0,
		y: 0,
		width: 200,
		height: 100,
		label: 'Private',
		style: { ...DEFAULT_STYLE, fill: '#d6f5ed', fillPattern: 'hachure' },
		z: 1
	};
	const key = figureSignature(e),
		paths = figurePaths(key);
	expect(paths.length).toBeGreaterThan(1);
	expect(figurePaths(key)).toEqual(paths);
	expect(figureSignature({ ...e, x: 42, y: -20, label: 'Different text' })).toBe(key);
	expect(figurePaths(figureSignature({ ...e, id: 'other' }))).not.toEqual(paths);
	expect(stableSeed('synthetic')).toBe(stableSeed('synthetic'));
	const clean = { ...e, style: { ...e.style, sketch: false } };
	expect(figurePaths(figureSignature(clean))).not.toEqual(paths);
	for (const kind of ['ellipse', 'diamond', 'rounded'] as const)
		expect(figurePaths(figureSignature({ ...e, kind })).length).toBeGreaterThan(0);
	expect(connectionPaths('M 0 0 Q 50 100 200 0', DEFAULT_STYLE, 'edge')).toEqual(
		connectionPaths('M 0 0 Q 50 100 200 0', DEFAULT_STYLE, 'edge')
	);
});
