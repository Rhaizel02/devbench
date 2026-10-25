import { assertTextLimit, ToolError } from '../tool-errors';
import { jsonPath, jsonPointer, type JsonValue } from '../json-studio/json-engine';

export function boundedJson(text: string): JsonValue {
	assertTextLimit(text, 1024 * 1024);
	let value: JsonValue;
	try {
		value = JSON.parse(text);
	} catch {
		throw new ToolError('Invalid JSON. Check quotes, commas and brackets.');
	}
	const stack = [{ value, depth: 0 }];
	let nodes = 0;
	while (stack.length) {
		const item = stack.pop()!;
		if (++nodes > 50000 || item.depth > 64)
			throw new ToolError('JSON limit: 50,000 nodes / 64 levels.');
		if (typeof item.value === 'number' && !Number.isFinite(item.value))
			throw new ToolError('A JSON number exceeds the finite JavaScript numeric range.');
		if (item.value && typeof item.value === 'object')
			for (const child of Object.values(item.value))
				stack.push({ value: child, depth: item.depth + 1 });
	}
	return value;
}
export type Match = { value: JsonValue; path: string; pointer: string };
type Selector = {
	recursive: boolean;
	key?: string | number;
	wildcard?: boolean;
	filter?: { keys: string[]; op: string; value: JsonValue };
};
// Deliberate RFC 9535 subset. A parser, never a JavaScript evaluator.
function selectors(expression: string): Selector[] {
	if (expression.length > 2048 || expression[0] !== '$')
		throw new ToolError('Use a JSONPath starting with $ (maximum 2,048 characters).');
	let rest = expression.slice(1);
	const result: Selector[] = [];
	while (rest) {
		let recursive = false;
		if (rest.startsWith('..')) {
			recursive = true;
			rest = rest.slice(2);
		} else if (rest.startsWith('.')) rest = rest.slice(1);
		else if (!rest.startsWith('[')) throw new ToolError('Unsupported JSONPath syntax.');
		let match: RegExpExecArray | null;
		if ((match = /^(?:\[\*\]|\*)/.exec(rest))) result.push({ recursive, wildcard: true });
		else if ((match = /^\[(-?\d+)\]/.exec(rest))) result.push({ recursive, key: Number(match[1]) });
		else if ((match = /^\[("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\]/.exec(rest))) {
			let key: string;
			try {
				key =
					match[1][0] === '"'
						? JSON.parse(match[1])
						: match[1].slice(1, -1).replace(/\\(['\\])/g, '$1');
			} catch {
				throw new ToolError('Invalid quoted property. Use JSON double-quoted escapes.');
			}
			result.push({ recursive, key });
		} else if (
			(match =
				/^\[\?\(@((?:\.[A-Za-z_][\w]*)*)\s*(==|!=|<=|>=|<|>)\s*("(?:[^"\\]|\\.)*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)\)\]/.exec(
					rest
				))
		) {
			result.push({
				recursive,
				filter: {
					keys: match[1].split('.').filter(Boolean),
					op: match[2],
					value: JSON.parse(match[3])
				}
			});
		} else if ((match = /^[A-Za-z_][\w]*/.exec(rest))) result.push({ recursive, key: match[0] });
		else
			throw new ToolError(
				'Unsupported JSONPath. Use properties, indices, *, .. or [?(@.price < 10)]. Unions, slices, functions and scripts are unsupported.'
			);
		rest = rest.slice(match![0].length);
		if (result.length > 32) throw new ToolError('Maximum 32 query segments.');
	}
	return result;
}
function compare(a: JsonValue | undefined, op: string, b: JsonValue) {
	if (a === undefined) return false;
	if (op === '==') return a === b;
	if (op === '!=') return a !== b;
	if (!(
		(typeof a === 'number' && typeof b === 'number') ||
		(typeof a === 'string' && typeof b === 'string')
	))
		return false;
	return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
}
export function queryJson(text: string, expression: string): Match[] {
	const root = boundedJson(text);
	const steps = selectors(expression);
	let matches: Match[] = [{ value: root, path: '$', pointer: '' }];
	let work = 0;
	const children = (item: Match): Match[] => {
		if (!item.value || typeof item.value !== 'object') return [];
		return Object.entries(item.value).map(([key, value]) => ({
			value,
			path: jsonPath(item.path, Array.isArray(item.value) ? Number(key) : key),
			pointer: jsonPointer(item.pointer, key)
		}));
	};
	for (const step of steps) {
		const next: Match[] = [];
		for (const match of matches) {
			const queue = [match];
			while (queue.length) {
				const item = queue.pop()!;
				if (++work > 200000)
					throw new ToolError('Query work limit reached (200,000 visits). Simplify the query.');
				const entries = children(item);
				if (step.recursive) queue.push(...entries.slice().reverse());
				if (step.wildcard) next.push(...entries);
				else if (step.filter) {
					for (const child of entries) {
						let value: JsonValue | undefined = child.value;
						for (const key of step.filter.keys)
							value =
								value &&
								typeof value === 'object' &&
								!Array.isArray(value) &&
								Object.hasOwn(value, key)
									? value[key]
									: undefined;
						if (compare(value, step.filter.op, step.filter.value)) next.push(child);
					}
				} else {
					const key = step.key!;
					const container = item.value;
					if (Array.isArray(container) && typeof key === 'number') {
						const index = key < 0 ? container.length + key : key;
						if (index >= 0 && index < container.length)
							next.push({
								value: container[index],
								path: jsonPath(item.path, index),
								pointer: jsonPointer(item.pointer, index)
							});
					} else if (
						container &&
						typeof container === 'object' &&
						!Array.isArray(container) &&
						typeof key === 'string' &&
						Object.hasOwn(container, key)
					)
						next.push({
							value: container[key],
							path: jsonPath(item.path, key),
							pointer: jsonPointer(item.pointer, key)
						});
				}
				if (next.length > 2000)
					throw new ToolError('Query result limit reached (2,000 matches). Narrow the query.');
			}
		}
		matches = next;
	}
	let outputBytes = 0;
	for (const match of matches) {
		outputBytes += new TextEncoder().encode(JSON.stringify(match)).length;
		if (outputBytes > 2 * 1024 * 1024)
			throw new ToolError('Query output exceeds 2 MiB. Narrow the query.');
	}
	return matches;
}
