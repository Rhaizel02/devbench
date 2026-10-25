import { ToolError } from '../tool-errors';
import { OPENAPI_LIMITS, type JsonValue, type JsonObject, type Reference } from './model';
export const object = (value: JsonValue | undefined): JsonObject | undefined =>
	value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
export const at = (parent: string, key: string | number) =>
	parent + '/' + encodeURIComponent(String(key).replace(/~/g, '~0').replace(/\//g, '~1'));
/** Decode the URI fragment BEFORE splitting JSON Pointer tokens (RFC 6901 section 6). */
export function pointerTokens(pointer: string): string[] {
	if (!pointer.startsWith('#') || pointer.length > 8192)
		throw new ToolError('Use an internal JSON Pointer fragment of at most 8 KiB.');
	let fragment: string;
	try {
		fragment = decodeURIComponent(pointer.slice(1));
	} catch {
		throw new ToolError('Invalid percent encoding in reference.');
	}
	if (!fragment) return [];
	if (!fragment.startsWith('/'))
		throw new ToolError('Named anchors are visible but are not resolved; use a JSON Pointer.');
	return fragment
		.slice(1)
		.split('/')
		.map((token) => {
			if (/~(?![01])/.test(token)) throw new ToolError('Invalid JSON Pointer escape.');
			return token.replace(/~1/g, '/').replace(/~0/g, '~');
		});
}
export function nodeAt(root: JsonValue, pointer: string): JsonValue | undefined {
	let value: JsonValue | undefined = root;
	for (const token of pointerTokens(pointer)) {
		if (!value || typeof value !== 'object' || !Object.hasOwn(value, token)) return undefined;
		if (Array.isArray(value) && !/^(0|[1-9]\d*)$/.test(token)) return undefined;
		value = (value as Record<string, JsonValue>)[token];
	}
	return value;
}
export function canonicalPointer(pointer: string): string {
	return pointerTokens(pointer).reduce((path, key) => at(path, key), '#');
}
export function resolveReference(root: JsonValue, ref: string, path = '#'): Reference {
	const result: Reference = { path, ref, status: 'internal', chain: [] };
	const scoped = (pointer: string) => {
		const tokens = pointerTokens(pointer);
		let parent = '#';
		for (const [index, token] of ['', ...tokens].entries()) {
			if (index) parent = at(parent, token);
			if (object(nodeAt(root, parent))?.$id !== undefined) return true;
		}
		return false;
	};
	if (scoped(path))
		return {
			...result,
			status: 'unsupported',
			message: 'References under $id URI scopes are not interpreted.'
		};
	let current = ref;
	const seen = new Set<string>();
	for (let step = 0; step < 64; step++) {
		if (!current.startsWith('#'))
			return {
				...result,
				status: 'external',
				message: 'External references are never downloaded.'
			};
		let target: string;
		try {
			target = canonicalPointer(current);
		} catch {
			return {
				...result,
				status: 'unsupported',
				message: 'Malformed pointer or unsupported named anchor.'
			};
		}
		result.target ??= target;
		if (scoped(target))
			return {
				...result,
				status: 'unsupported',
				message: 'Reference target uses an unsupported $id URI scope.'
			};
		if (seen.has(target))
			return { ...result, status: 'cycle', message: 'Cyclic reference chain; not expanded.' };
		seen.add(target);
		result.chain!.push(target);
		const value = nodeAt(root, target);
		if (value === undefined)
			return { ...result, status: 'missing', message: 'Internal target does not exist.' };
		const record = object(value);
		if (record && typeof record.$ref === 'string') {
			current = record.$ref;
			continue;
		}
		return { ...result, resolvedTarget: target };
	}
	return { ...result, status: 'unsupported', message: 'Reference chain exceeds 64 hops.' };
}
/** Reference scan respects schema/data contexts: a literal $ref inside an example is data. */
export function scanReferences(root: JsonObject): Reference[] {
	type Mode = 'generic' | 'schema' | 'schema-map' | 'schema-list' | 'example-map' | 'example';
	const result: Reference[] = [],
		stack: { value: JsonValue; path: string; mode: Mode }[] = [
			{ value: root, path: '#', mode: 'generic' }
		];
	while (stack.length) {
		const { value, path, mode } = stack.pop()!;
		if (Array.isArray(value)) {
			value.forEach((child, i) =>
				stack.push({
					value: child,
					path: at(path, i),
					mode: mode === 'schema-list' ? 'schema' : 'generic'
				})
			);
			continue;
		}
		const record = object(value);
		if (!record) continue;
		if (mode !== 'schema-map' && mode !== 'example-map' && typeof record.$ref === 'string') {
			if (result.length >= OPENAPI_LIMITS.references)
				throw new ToolError('Reference limit: 12,000.');
			result.push(resolveReference(root, record.$ref, path));
		}
		for (const [key, child] of Object.entries(record)) {
			if (mode === 'schema-map') {
				stack.push({ value: child, path: at(path, key), mode: 'schema' });
				continue;
			}
			if (mode === 'example-map') {
				stack.push({ value: child, path: at(path, key), mode: 'example' });
				continue;
			}
			if (
				key.startsWith('x-') ||
				key === '$ref' ||
				key === 'example' ||
				key === 'default' ||
				key === 'enum' ||
				key === 'const' ||
				(mode === 'example' && key === 'value')
			)
				continue;
			let next: Mode = 'generic';
			if (mode === 'schema') {
				if (
					['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'].includes(
						key
					)
				)
					next = 'schema-map';
				else if (['allOf', 'oneOf', 'anyOf', 'prefixItems'].includes(key)) next = 'schema-list';
				else if (
					[
						'items',
						'additionalProperties',
						'contains',
						'not',
						'if',
						'then',
						'else',
						'unevaluatedProperties',
						'unevaluatedItems',
						'propertyNames'
					].includes(key)
				)
					next = 'schema';
				else continue;
			} else if (key === 'schema') next = 'schema';
			else if (key === 'schemas' && path === '#/components') next = 'schema-map';
			else if (key === 'examples') next = 'example-map';
			stack.push({ value: child, path: at(path, key), mode: next });
		}
	}
	return result;
}
