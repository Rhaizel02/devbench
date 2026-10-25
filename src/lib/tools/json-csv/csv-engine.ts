import Papa from 'papaparse';
import { validateJson, type JsonValue } from '../json-studio/json-engine';
import { ToolError, assertTextLimit } from '../tool-errors';
export type CsvOptions = {
	delimiter: ',' | ';' | '\t' | '|';
	header: boolean;
	quoteAll: boolean;
	nested: 'reject' | 'stringify';
};
function validateOptions(options: CsvOptions) {
	if (![',', ';', '\t', '|'].includes(options.delimiter))
		throw new ToolError('Choose a supported single-character delimiter.');
}
export function jsonToCsv(input: string, options: CsvOptions): string {
	assertTextLimit(input);
	validateOptions(options);
	const parsed = validateJson(input);
	if (parsed.status !== 'valid') throw new ToolError('Enter a strict JSON array of records.');
	if (
		!Array.isArray(parsed.value) ||
		parsed.value.some(
			(value) => value === null || typeof value !== 'object' || Array.isArray(value)
		)
	)
		throw new ToolError(
			'JSON input must be an array of objects. Nested values need an explicit policy.'
		);
	if (parsed.value.length > 5000)
		throw new ToolError('CSV conversion supports up to 5,000 records.');
	const records = parsed.value as Record<string, JsonValue>[];
	const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
	if (!fields.length)
		throw new ToolError('At least one record with a column is required to infer CSV fields.');
	if (fields.length > 200) throw new ToolError('CSV conversion supports up to 200 columns.');
	for (const field of fields) assertTextLimit(field, 65536);
	const data = records.map((record) =>
		fields.map((field) => {
			const value = Object.hasOwn(record, field) ? record[field] : null;
			if (value !== null && typeof value === 'object') {
				if (options.nested !== 'stringify')
					throw new ToolError(
						'Nested objects/arrays cannot be CSV cells unless JSON-stringify nesting is explicitly enabled.'
					);
				try {
					const text = JSON.stringify(value);
					assertTextLimit(text, 65536);
					return text;
				} catch (error) {
					if (error instanceof ToolError) throw error;
					throw new ToolError('Nested value is too deep to serialize.');
				}
			}
			const text = value === null ? '' : String(value);
			assertTextLimit(text, 65536);
			return text;
		})
	);
	try {
		return Papa.unparse(
			{ fields, data },
			{
				delimiter: options.delimiter,
				header: options.header,
				quotes: options.quoteAll,
				newline: '\r\n',
				escapeFormulae: false
			}
		);
	} catch {
		throw new ToolError('CSV serialization failed. Reduce the structure or cell sizes.');
	}
}
export function csvToJson(input: string, options: CsvOptions): string {
	assertTextLimit(input);
	validateOptions(options);
	if (!input.length) throw new ToolError('Enter CSV to convert.');
	const text = input.replace(/^\ufeff/, '');
	const parsed = Papa.parse<string[]>(text, {
		delimiter: options.delimiter,
		header: false,
		dynamicTyping: false,
		skipEmptyLines: false,
		preview: 5002,
		download: false
	});
	if (parsed.errors.length)
		throw new ToolError(
			'Invalid CSV quoting near record ' +
				((parsed.errors[0].row ?? 0) + 1) +
				'. Check quotes and delimiters.'
		);
	if (parsed.meta.truncated)
		throw new ToolError('CSV conversion supports up to 5,000 data records.');
	const rows = parsed.data;
	// Papa returns one extra empty record for a terminal line break; interior empty records stay significant.
	if (/[\r\n]$/.test(text) && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '') rows.pop();
	if (!rows.length) throw new ToolError('CSV has no records.');
	let fields: string[];
	if (options.header) {
		fields = rows.shift()!;
		if (fields.some((field) => !field.length) || new Set(fields).size !== fields.length)
			throw new ToolError('CSV headers must be nonempty and unique (case-sensitive).');
	} else fields = rows[0].map((_, index) => 'column' + (index + 1));
	if (fields.length > 200 || rows.length > 5000)
		throw new ToolError('CSV limit reached: 200 columns / 5,000 data records.');
	for (const field of fields) assertTextLimit(field, 65536);
	const records = rows.map((row, index) => {
		if (row.length !== fields.length)
			throw new ToolError(
				'CSV record ' +
					(index + (options.header ? 2 : 1)) +
					' has a different column count. Empty interior rows are significant.'
			);
		for (const value of row) assertTextLimit(value, 65536);
		return Object.fromEntries(fields.map((field, index) => [field, row[index]]));
	});
	return JSON.stringify(records, null, 2);
}
