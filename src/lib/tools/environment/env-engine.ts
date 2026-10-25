import { assertTextLimit, ToolError } from '../tool-errors';
export type ParsedEnv = { values: Map<string, string>; warnings: string[] };
export function parseEnv(input: string): ParsedEnv {
	assertTextLimit(input, 256 * 1024);
	const lines = input.split(/\r?\n/);
	if (lines.length > 5000) throw new ToolError('Environment limit: 5,000 lines.');
	const values = new Map<string, string>();
	const warnings: string[] = [];
	for (const [index, raw] of lines.entries()) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
		if (!match)
			throw new ToolError(
				'Unsupported environment syntax at line ' +
					(index + 1) +
					'. Use KEY=value; multiline values are unsupported.'
			);
		const key = match[1];
		let value = match[2];
		if (value.startsWith('"') || value.startsWith("'")) {
			const quote = value[0];
			let end = -1;
			for (let i = 1; i < value.length; i++) {
				if (quote === '"' && value[i] === '\\') {
					i++;
					continue;
				}
				if (value[i] === quote) {
					end = i;
					break;
				}
			}
			if (end < 0 || !/^\s*(?:#.*)?$/.test(value.slice(end + 1)))
				throw new ToolError(
					'Invalid quoting or unsupported multiline value at line ' + (index + 1) + '.'
				);
			value = value.slice(1, end);
			if (quote === '"')
				value = value.replace(
					/\\([nrt"\\])/g,
					(_match, character: string) =>
						({ n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' })[character]!
				);
		} else value = value.replace(/\s+#.*$/, '').trimEnd();
		if (values.has(key))
			warnings.push('Duplicate assignment at line ' + (index + 1) + '; last value wins.');
		if (/\$\{|\$\(|`/.test(value))
			warnings.push(
				'Unresolved substitution-like text at line ' +
					(index + 1) +
					' is retained literally; nothing is expanded or executed.'
			);
		values.set(key, value);
	}
	return { values, warnings };
}
export type EnvRow = { key: string; status: 'same' | 'different' | 'only-a' | 'only-b' | 'common' };
export function compareEnvironments(a: string, b: string, keysOnly = false) {
	const left = parseEnv(a);
	const right = parseEnv(b);
	const rows: EnvRow[] = [...new Set([...left.values.keys(), ...right.values.keys()])]
		.sort()
		.map((key) => ({
			key,
			status: !left.values.has(key)
				? 'only-b'
				: !right.values.has(key)
					? 'only-a'
					: keysOnly
						? 'common'
						: left.values.get(key) === right.values.get(key)
							? 'same'
							: 'different'
		}));
	return {
		rows,
		warnings: { a: left.warnings, b: right.warnings },
		counts: {
			common: rows.filter((r) => !r.status.startsWith('only')).length,
			onlyA: rows.filter((r) => r.status === 'only-a').length,
			onlyB: rows.filter((r) => r.status === 'only-b').length,
			different: rows.filter((r) => r.status === 'different').length
		}
	};
}
