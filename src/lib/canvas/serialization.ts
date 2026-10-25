import { LIMITS, fail, type Project, type Point, type Style, type Asset } from './model';
import { parseLegacyProject, type LegacyProject } from './legacy-serialization';
export { color } from './legacy-serialization';
type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object.');
	return value as Obj;
};
const numeric = (value: unknown, min: number, max: number): number => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
		fail('Invalid numeric value.');
	return value;
};
const list = (value: unknown, max: number): unknown[] => {
	if (!Array.isArray(value) || value.length > max) fail('Collection exceeds document limits.');
	return value;
};
const identifier = (value: unknown): string => {
	if (typeof value !== 'string' || !value.trim() || value.length > 120) fail('Invalid ID.');
	return value;
};
const point = (value: unknown): Point => {
	const p = object(value);
	return { x: numeric(p.x, -1e6, 1e6), y: numeric(p.y, -1e6, 1e6) };
};
function tree(value: unknown, depth = 0) {
	if (depth > 20) fail('Document nesting exceeds 20 levels.');
	if (value && typeof value === 'object')
		for (const [key, child] of Object.entries(value)) {
			if (['__proto__', 'prototype', 'constructor'].includes(key))
				fail('Unsafe document property.');
			tree(child, depth + 1);
		}
}
export function migrateV2ToV3(legacy: LegacyProject): Project {
	// A fresh DTO, with old geometry/IDs/associations untouched. No storage side effect.
	return { ...structuredClone(legacy), schemaVersion: 3 };
}
function extras(value: unknown): Pick<Style, 'roughness' | 'fillPattern'> {
	const s = object(value);
	if (s.fillPattern !== undefined && s.fillPattern !== 'solid' && s.fillPattern !== 'hachure')
		fail('Invalid fill pattern.');
	return {
		...(s.roughness !== undefined ? { roughness: numeric(s.roughness, 0, 2) } : {}),
		...(s.fillPattern !== undefined ? { fillPattern: s.fillPattern as Style['fillPattern'] } : {})
	};
}
/** Pure, whitelisted parsing. All mutation happens only after the complete DTO validates. */
export function parseProject(input: string): Project {
	if (new TextEncoder().encode(input).length > LIMITS.bytes)
		fail('Project exceeds the 16 MiB import limit.');
	let raw: unknown;
	try {
		raw = JSON.parse(input);
	} catch {
		fail('Invalid project JSON.');
	}
	tree(raw);
	const root = object(raw);
	if (root.schemaVersion === 1 || root.schemaVersion === 2)
		return migrateV2ToV3(parseLegacyProject(input));
	if (root.schemaVersion !== 3) fail('Unsupported project schema version.');
	const diagrams = list(root.diagrams, LIMITS.diagrams).map(object);
	// Reuse the frozen core validator without passing assets or V3-only fields into V2.
	const core = {
		schemaVersion: 2,
		id: root.id,
		title: root.title,
		rootDiagramId: root.rootDiagramId,
		diagrams: diagrams.map((d) => ({
			...d,
			groups: undefined,
			elements: list(d.elements, LIMITS.elements).map((raw) => {
				const e = object(raw);
				return { ...e, kind: e.kind === 'image' ? 'rectangle' : e.kind };
			})
		}))
	};
	const parsed = migrateV2ToV3(parseLegacyProject(JSON.stringify(core), LIMITS.bytes));
	const ids = new Set([
		parsed.id,
		...parsed.diagrams.flatMap((d) => [
			d.id,
			...d.elements.map((e) => e.id),
			...d.connections.map((c) => c.id)
		])
	]);
	const claim = (value: unknown) => {
		const id = identifier(value);
		if (ids.has(id)) fail('IDs must be globally unique.');
		ids.add(id);
		return id;
	};
	if (root.assets !== undefined) {
		let bytes = 0,
			pixels = 0;
		parsed.assets = list(root.assets, 32).map((raw) => {
			const a = object(raw);
			if (!['image/png', 'image/jpeg', 'image/webp'].includes(String(a.mime)))
				fail('Unsupported local image type.');
			if (
				typeof a.data !== 'string' ||
				!/^[A-Za-z0-9+/]+={0,2}$/.test(a.data) ||
				a.data.length % 4 !== 0
			)
				fail('Invalid image encoding.');
			const size =
				(a.data.length / 4) * 3 - (a.data.endsWith('==') ? 2 : a.data.endsWith('=') ? 1 : 0);
			if (size > 1024 * 1024) fail('Image exceeds 1 MiB.');
			const width = numeric(a.width, 1, 4096),
				height = numeric(a.height, 1, 4096);
			if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > 4_000_000)
				fail('Image exceeds 4 megapixels.');
			bytes += size;
			pixels += width * height;
			return { id: claim(a.id), mime: a.mime as Asset['mime'], data: a.data, width, height };
		});
		if (bytes > 4 * 1024 * 1024 || pixels > 8_000_000)
			fail('Project image budget exceeded (4 MiB / 8 megapixels).');
	}
	const assets = new Set(parsed.assets?.map((a) => a.id));
	parsed.diagrams = parsed.diagrams.map((d, index) => {
		const source = diagrams[index];
		const elements = d.elements.map((e, i) => {
			const value = object((source.elements as unknown[])[i]);
			if (
				value.kind === 'image' &&
				(value.childDiagramId !== undefined || value.points !== undefined)
			)
				fail('Images cannot contain diagrams or ink.');
			if (value.kind === 'image' && !assets.has(identifier(value.assetId)))
				fail('Image resource is missing.');
			if (value.kind !== 'image' && value.assetId !== undefined)
				fail('Only images can reference image resources.');
			return {
				...e,
				...(value.kind === 'image'
					? { kind: 'image' as const, assetId: identifier(value.assetId) }
					: {}),
				...(value.rotation !== undefined
					? { rotation: numeric(value.rotation, -36000, 36000) }
					: {}),
				...(value.seed !== undefined ? { seed: numeric(value.seed, 1, 2147483647) } : {}),
				style: { ...e.style, ...extras(value.style) }
			};
		});
		const connections = d.connections.map((c, i) => {
			const value = object((source.connections as unknown[])[i]);
			if (
				value.geometry !== undefined &&
				!['straight', 'curve', 'elbow'].includes(String(value.geometry))
			)
				fail('Unsupported connector geometry.');
			if (value.heads !== undefined && !['none', 'end', 'both'].includes(String(value.heads)))
				fail('Unsupported arrow heads.');
			return {
				...c,
				...(value.geometry !== undefined ? { geometry: value.geometry as typeof c.geometry } : {}),
				...(value.heads !== undefined ? { heads: value.heads as typeof c.heads } : {}),
				...(value.control !== undefined ? { control: point(value.control) } : {}),
				style: { ...c.style, ...extras(value.style) }
			};
		});
		const members = new Set([...elements, ...connections].map((e) => e.id)),
			grouped = new Set<string>();
		const groups =
			source.groups === undefined
				? undefined
				: list(source.groups, 500).map((raw) => {
						const g = object(raw),
							groupId = claim(g.id),
							memberIds = list(g.memberIds, 1000).map(identifier);
						if (memberIds.length < 2) fail('A group needs at least two members.');
						for (const id of memberIds) {
							if (!members.has(id) || grouped.has(id))
								fail('Invalid, repeated or nested group membership.');
							grouped.add(id);
						}
						return { id: groupId, memberIds };
					});
		return { ...d, elements, connections, ...(groups !== undefined ? { groups } : {}) };
	});
	return parsed;
}
export function serializeProject(project: Project): string {
	const result = JSON.stringify(project, null, 2);
	parseProject(result);
	return result;
}
