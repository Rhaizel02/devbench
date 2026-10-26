import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { Element, Style } from './model';
export function stableSeed(id: string): number {
	let hash = 2166136261;
	for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
	return ((hash >>> 0) % 2147483646) + 1;
}
function options(style: Style, seed: number, span = 0): Options {
	return {
		seed,
		roughness: style.sketch ? (style.roughness ?? 0.8) : 0,
		stroke: style.stroke,
		strokeWidth: style.width,
		fill: style.fill === 'transparent' ? undefined : style.fill,
		fillStyle: style.fillPattern ?? 'solid',
		fillWeight: Math.max(0.5, style.width / 2),
		// Bound hatch density even for the largest valid imported geometry.
		hachureGap: Math.max(12, span / 80),
		disableMultiStroke: !style.sketch,
		disableMultiStrokeFill: true,
		preserveVertices: true
	};
}
/** Stateless deterministic paths. Signature excludes position/selection/camera to avoid drag regeneration. */
export function figureSignature(e: Element): string {
	return JSON.stringify([e.kind, e.width, e.height, e.style, e.seed ?? stableSeed(e.id)]);
}
export function figurePaths(signature: string) {
	const [kind, w, h, style, seed] = JSON.parse(signature) as [
		Element['kind'],
		number,
		number,
		Style,
		number
	];
	const g = rough.generator(),
		o = options(style, seed, Math.max(w, h));
	if (kind === 'text' || kind === 'stroke' || kind === 'image') return [];
	const r = Math.min(18, h / 4, w / 4);
	const draw =
		kind === 'ellipse'
			? g.ellipse(w / 2, h / 2, w, h, o)
			: kind === 'diamond'
				? g.polygon(
						[
							[w / 2, 0],
							[w, h / 2],
							[w / 2, h],
							[0, h / 2]
						],
						o
					)
				: kind === 'rounded'
					? g.path(
							`M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0`,
							o
						)
					: g.rectangle(0, 0, w, h, o);
	return g.toPaths(draw);
}
export function connectionPaths(path: string, style: Style, id: string) {
	const g = rough.generator();
	return g.toPaths(
		g.path(path, { ...options({ ...style, fill: 'transparent' }, stableSeed(id)), fill: undefined })
	);
}
