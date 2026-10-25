import Papa from 'papaparse';
import { ToolError, assertTextLimit } from '../tool-errors';
export type SqlInOptions = {
	inputMode: 'lines' | 'csv';
	delimiter: ',' | ';' | '\t';
	valueType: 'strings' | 'numbers';
	dialect: 'postgresql' | 'mysql' | 'sqlite';
	format: 'parameters' | 'literals';
	deduplicate: boolean;
	trim: boolean;
	blanks: 'omit' | 'keep' | 'null';
	nullTokens: boolean;
};
export type SqlInResult = {
	sql: string;
	parameters: (string | number | null)[];
	count: number;
	warnings: string[];
};
export function buildSqlIn(input: string, options: SqlInOptions): SqlInResult {
	assertTextLimit(input, 128 * 1024);
	if (
		!['postgresql', 'mysql', 'sqlite'].includes(options.dialect) ||
		!['strings', 'numbers'].includes(options.valueType) ||
		!['parameters', 'literals'].includes(options.format) ||
		!['lines', 'csv'].includes(options.inputMode) ||
		![',', ';', '\t'].includes(options.delimiter)
	)
		throw new ToolError('Choose supported SQL IN options.');
	let raw: string[];
	if (options.inputMode === 'csv') {
		const parsed = Papa.parse<string[]>(input, {
			delimiter: options.delimiter,
			header: false,
			dynamicTyping: false,
			skipEmptyLines: false,
			preview: 2002,
			download: false
		});
		if (parsed.errors.length)
			throw new ToolError('Invalid CSV quoting. Quote commas/newlines and double embedded quotes.');
		if (parsed.meta.truncated) throw new ToolError('SQL IN input exceeds 2,000 values.');
		if (/[\r\n]$/.test(input) && parsed.data.at(-1)?.length === 1 && parsed.data.at(-1)?.[0] === '')
			parsed.data.pop();
		raw = parsed.data.flat();
	} else raw = input.split(/\r\n|\n|\r/);
	if (raw.length > 2000) throw new ToolError('SQL IN input exceeds 2,000 values.');
	const values: (string | number | null)[] = [];
	const literalValues: string[] = [];
	const seen = new Set<string>();
	for (const original of raw) {
		const text = options.trim ? original.trim() : original;
		assertTextLimit(text, 8192);
		if (!text.length && options.blanks === 'omit') continue;
		let value: string | number | null = text;
		if (
			(!text.length && options.blanks === 'null') ||
			(options.nullTokens && text.toUpperCase() === 'NULL')
		)
			value = null;
		else if (options.valueType === 'numbers') {
			if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text))
				throw new ToolError(
					'Invalid numeric value. Use complete decimal numbers, not SQL fragments; choose trimming or an empty-value policy explicitly.'
				);
			value = Number(text);
			const significant = text.split(/[eE]/)[0].replace(/[^\d]/g, '').replace(/^0+/, '').length;
			if (
				!Number.isFinite(value) ||
				(Number.isInteger(value) && !Number.isSafeInteger(value)) ||
				significant > 15 ||
				(value === 0 && /[1-9]/.test(text.split(/[eE]/)[0]))
			)
				throw new ToolError(
					'Numeric value exceeds safe JavaScript precision (15 significant digits / safe integers). Use strings for precision-sensitive values.'
				);
		} else {
			if (text.includes('\0'))
				throw new ToolError('NUL characters are unsupported in SQL string values.');
			for (const character of text) {
				const point = character.codePointAt(0)!;
				if (point >= 0xd800 && point <= 0xdfff)
					throw new ToolError('SQL text contains an unpaired Unicode surrogate.');
			}
		}
		const identity = typeof value + ':' + value;
		if (options.deduplicate && seen.has(identity)) continue;
		seen.add(identity);
		values.push(value);
		if (value === null) literalValues.push('NULL');
		else if (typeof value === 'number') literalValues.push(text);
		else if (options.dialect === 'mysql')
			literalValues.push(
				"CONVERT(X'" +
					Array.from(new TextEncoder().encode(value), (byte) =>
						byte.toString(16).padStart(2, '0')
					).join('') +
					"' USING utf8mb4)"
			);
		else
			literalValues.push(
				(options.dialect === 'postgresql' ? 'E' : '') +
					"'" +
					(options.dialect === 'postgresql' ? value.replace(/\\/g, '\\\\') : value).replace(
						/'/g,
						"''"
					) +
					"'"
			);
	}
	if (!values.length) throw new ToolError('No values remain. Empty IN lists are not generated.');
	const warnings = [
		'Bind parameters through your database driver; never interpolate them manually. This tool does not execute SQL.'
	];
	if (options.format === 'literals')
		warnings.push(
			'Literal SQL was explicitly selected. Review dialect and database settings; parameter binding is recommended. MySQL strings use UTF-8 hex conversion to avoid backslash-mode ambiguity.'
		);
	if (values.includes(null))
		warnings.push(
			'IN (NULL) does not match SQL NULL rows. Add an explicit IS NULL condition where appropriate.'
		);
	return {
		sql:
			'IN (' +
			(options.format === 'parameters'
				? values.map((_, index) => (options.dialect === 'postgresql' ? '$' + (index + 1) : '?'))
				: literalValues
			).join(', ') +
			')',
		parameters: options.format === 'parameters' ? values : [],
		count: values.length,
		warnings
	};
}
