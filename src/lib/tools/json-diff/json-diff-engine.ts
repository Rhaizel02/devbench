import { validateJson, jsonPath, type JsonValue } from '../json-studio/json-engine';
import { ToolError, assertTextLimit } from '../tool-errors';
export type JsonChange = {
	kind: 'added' | 'removed' | 'changed';
	path: string;
	hasBefore: boolean;
	hasAfter: boolean;
	before?: JsonValue;
	after?: JsonValue;
};
export type JsonDiffResult = { changes: JsonChange[]; truncated: boolean; visited: number };
function parse(input: string, side: string): JsonValue {
	assertTextLimit(input);
	const result = validateJson(input);
	if (result.status === 'empty') throw new ToolError(side + ' input is empty. Enter a JSON value.');
	if (result.status === 'invalid')
		throw new ToolError(
			side +
				': ' +
				result.message +
				(result.line ? ' Line ' + result.line + ', column ' + result.column + '.' : '')
		);
	const stack = [{ value: result.value, depth: 0 }];
	let nodes = 0;
	while (stack.length) {
		const item = stack.pop()!;
		if (++nodes > 100000 || item.depth > 128)
			throw new ToolError(side + ': comparison supports up to 100,000 nodes and 128 levels.');
		if (item.value !== null && typeof item.value === 'object')
			for (const child of Object.values(item.value))
				stack.push({ value: child, depth: item.depth + 1 });
	}
	return result.value;
}
export function compareJson(left: string, right: string, maximumChanges = 1000): JsonDiffResult {
	let before: JsonValue | undefined;
	let after: JsonValue | undefined;
	const errors: string[] = [];
	try {
		before = parse(left, 'Left');
	} catch (error) {
		if (!(error instanceof ToolError)) throw error;
		errors.push(error.message);
	}
	try {
		after = parse(right, 'Right');
	} catch (error) {
		if (!(error instanceof ToolError)) throw error;
		errors.push(error.message);
	}
	if (errors.length) throw new ToolError(errors.join('\n'));
	const stack: {
		before: JsonValue | undefined;
		after: JsonValue | undefined;
		hasBefore: boolean;
		hasAfter: boolean;
		path: string;
		depth: number;
	}[] = [{ before, after, hasBefore: true, hasAfter: true, path: '$', depth: 0 }];
	const changes: JsonChange[] = [];
	let visited = 0;
	while (stack.length) {
		if (changes.length >= maximumChanges) return { changes, truncated: true, visited };
		const item = stack.pop()!;
		if (++visited > 100000 || item.depth > 128)
			throw new ToolError(
				'Comparison limit reached (100,000 nodes / 128 levels). Reduce the JSON size or depth.'
			);
		if (!item.hasBefore || !item.hasAfter) {
			changes.push({ ...item, kind: item.hasBefore ? 'removed' : 'added' });
			continue;
		}
		const a = item.before!;
		const b = item.after!;
		if (Object.is(a, b)) continue;
		const aContainer = a !== null && typeof a === 'object';
		const bContainer = b !== null && typeof b === 'object';
		if (!aContainer || !bContainer || Array.isArray(a) !== Array.isArray(b)) {
			changes.push({ ...item, kind: 'changed' });
			continue;
		}
		const keys =
			Array.isArray(a) && Array.isArray(b)
				? Array.from({ length: Math.max(a.length, b.length) }, (_, index) => index)
				: [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			const hasBefore = Object.hasOwn(a, key);
			const hasAfter = Object.hasOwn(b, key);
			const path = jsonPath(item.path, key);
			if (path.length > 4096)
				throw new ToolError(
					'A JSONPath exceeds 4,096 characters. Shorten property names or reduce nesting.'
				);
			stack.push({
				before: (a as unknown as Record<string | number, JsonValue>)[key],
				after: (b as unknown as Record<string | number, JsonValue>)[key],
				hasBefore,
				hasAfter,
				path,
				depth: item.depth + 1
			});
		}
	}
	return { changes, truncated: false, visited };
}
