export type JsonValue =
	null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonResult =
	| { status: 'empty' }
	| { status: 'valid'; value: JsonValue; output: string }
	| { status: 'invalid'; message: string; line?: number; column?: number };
export const MAX_BYTES = 5 * 1024 * 1024;
export const TREE_MAX_DEPTH = 128;
export function validateJson(input: string): JsonResult {
	if (!input.trim()) return { status: 'empty' };
	if (new TextEncoder().encode(input).length > MAX_BYTES)
		return {
			status: 'invalid',
			message: 'Input exceeds the 5 MiB limit. Reduce the input before processing.'
		};
	try {
		return { status: 'valid', value: JSON.parse(input) as JsonValue, output: input };
	} catch (error) {
		// Native messages can contain snippets of the input. Return only safe location metadata.
		const native = error instanceof Error ? error.message : '';
		const position = /position (\d+)/.exec(native);
		const location = /line (\d+) column (\d+)/.exec(native);
		let line: number | undefined;
		let column: number | undefined;
		if (position) {
			const before = input.slice(0, Number(position[1]));
			line = before.split('\n').length;
			column = before.length - before.lastIndexOf('\n');
		} else if (location) {
			line = Number(location[1]);
			column = Number(location[2]);
		}
		return {
			status: 'invalid',
			message:
				'Invalid JSON. Check quotes, commas and matching brackets. Trailing commas are not allowed.',
			line,
			column
		};
	}
}
function transform(input: string, indent?: 2 | 4 | 'tab'): JsonResult {
	const result = validateJson(input);
	if (result.status !== 'valid') return result;
	try {
		return {
			...result,
			output: JSON.stringify(result.value, null, indent === 'tab' ? '\t' : indent)
		};
	} catch {
		return {
			status: 'invalid',
			message: 'This JSON is too deeply nested to transform. Reduce its depth.'
		};
	}
}
export const formatJson = (input: string, indent: 2 | 4 | 'tab' = 2) => transform(input, indent);
export const minifyJson = (input: string) => transform(input);
export const jsonPath = (parent: string, key: string | number) =>
	typeof key === 'number' ? `${parent}[${key}]` : `${parent}[${JSON.stringify(key)}]`;
export const jsonPointer = (parent: string, key: string | number) =>
	`${parent}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
export type TreeRow = {
	path: string;
	pointer: string;
	label: string;
	value: JsonValue;
	depth: number;
	branch: boolean;
};
export function treeRows(
	value: JsonValue,
	expanded: ReadonlySet<string>,
	query = '',
	limit = 500
): { rows: TreeRow[]; truncated: boolean } {
	const stack: TreeRow[] = [
		{
			path: '$',
			pointer: '',
			label: '$',
			value,
			depth: 0,
			branch: value !== null && typeof value === 'object'
		}
	];
	const rows: TreeRow[] = [];
	const term = query.toLowerCase();
	let visited = 0;
	let omitted = false;
	while (stack.length && rows.length < limit && visited < 50000) {
		const row = stack.pop()!;
		visited++;
		const text = row.branch ? row.label : `${row.label} ${String(row.value)}`;
		if (!term || `${row.path} ${text}`.toLowerCase().includes(term)) rows.push(row);
		if (row.branch && (term || expanded.has(row.path))) {
			if (row.depth >= TREE_MAX_DEPTH) {
				omitted = true;
				continue;
			}
			const entries = Object.entries(row.value as object);
			const available = Math.max(0, 50000 - visited - stack.length);
			if (entries.length > available) omitted = true;
			for (let i = Math.min(entries.length, available) - 1; i >= 0; i--) {
				const [key, child] = entries[i];
				const actualKey = Array.isArray(row.value) ? Number(key) : key;
				stack.push({
					path: jsonPath(row.path, actualKey),
					pointer: jsonPointer(row.pointer, actualKey),
					label: key,
					value: child,
					depth: row.depth + 1,
					branch: child !== null && typeof child === 'object'
				});
			}
		}
	}
	return { rows, truncated: omitted || stack.length > 0 || visited >= 50000 };
}
