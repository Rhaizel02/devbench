import { ToolError } from '../tool-errors';
import { completeGTIN, validateGTIN } from './gtin-engine';
export const DATA_LIMITS = {
	collections: 5,
	fields: 24,
	rows: 5000,
	totalRows: 10000,
	bytes: 4 * 1024 * 1024,
	string: 256
};
export const fieldTypes = [
	'string',
	'integer',
	'decimal',
	'boolean',
	'uuid',
	'date',
	'datetime',
	'enum',
	'ean13',
	'gtin14',
	'null',
	'reference'
] as const;
export type FieldType = (typeof fieldTypes)[number];
export type Scalar = string | number | boolean | null;
export type DataField = {
	id: string;
	name: string;
	type: FieldType;
	required: boolean;
	nullable: boolean;
	unique: boolean;
	mode: 'generated' | 'fixed';
	fixed: string;
	min: number;
	max: number;
	length: number;
	decimals: number;
	values: string;
	prefix: string;
	start: string;
	end: string;
	collectionId: string;
	fieldId: string;
};
export type Collection = { id: string; name: string; rows: number; fields: DataField[] };
export type DatasetSpec = {
	seed: string;
	output: 'array' | 'collections' | 'page';
	collections: Collection[];
};
export type DatasetResult = {
	collections: Record<string, Record<string, Scalar>[]>;
	json: string;
	csv: Record<string, string>;
	rows: number;
	fields: number;
	bytes: number;
	seed: string;
	order: string[];
};
const bytes = (text: string) => new TextEncoder().encode(text).length;
function fail(message: string): never {
	throw new ToolError(message);
}
const badNames = new Set(['__proto__', 'constructor', 'prototype']);
function name(value: string, kind: string) {
	if (
		typeof value !== 'string' ||
		!value.trim() ||
		value.length > 64 ||
		Array.from(value).some((c) => c.charCodeAt(0) < 32) ||
		badNames.has(value)
	)
		fail(kind + ' name must be 1–64 printable characters and cannot be a prototype key.');
}
function whole(n: number, min: number, max: number, label: string) {
	if (!Number.isSafeInteger(n) || n < min || n > max)
		fail(label + ' must be an integer from ' + min + ' to ' + max + '.');
}
function fixedValue(f: DataField): Scalar {
	let value: unknown;
	try {
		value = JSON.parse(f.fixed);
	} catch {
		fail('Field ' + f.name + ': fixed value must be a JSON scalar (quote strings).');
	}
	if (
		(typeof value !== 'string' &&
			typeof value !== 'number' &&
			typeof value !== 'boolean' &&
			value !== null) ||
		(typeof value === 'number' && !Number.isFinite(value))
	)
		fail('Fixed values must be finite JSON scalars.');
	if (value === null && !f.nullable && f.type !== 'null')
		fail('Enable nullable for a null fixed value.');
	if (typeof value === 'string' && bytes(value) > 1024) fail('Fixed string exceeds 1 KiB.');

	if (value !== null) {
		const textTypes = ['string', 'enum', 'uuid', 'date', 'datetime', 'ean13', 'gtin14'];
		if (
			(textTypes.includes(f.type) && typeof value !== 'string') ||
			(f.type === 'integer' && !Number.isSafeInteger(value)) ||
			(f.type === 'decimal' && typeof value !== 'number') ||
			(f.type === 'boolean' && typeof value !== 'boolean') ||
			f.type === 'null' ||
			f.type === 'reference'
		)
			fail('Fixed value does not match the selected field type.');
		if ((f.type === 'ean13' || f.type === 'gtin14') && !validateGTIN(String(value), f.type).valid)
			fail('Fixed GTIN has an invalid length or checksum.');
		if (
			f.type === 'uuid' &&
			!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))
		)
			fail('Fixed UUID must be a valid version4 UUID.');
		if (
			f.type === 'date' &&
			(!/^\d{4}-\d\d-\d\d$/.test(String(value)) ||
				!Number.isFinite(Date.parse(String(value))) ||
				new Date(String(value)).toISOString().slice(0, 10) !== value)
		)
			fail('Fixed date must be a valid ISO date.');
		if (
			f.type === 'datetime' &&
			(!Number.isFinite(Date.parse(String(value))) ||
				new Date(String(value)).toISOString() !== value)
		)
			fail('Fixed datetime must be canonical UTC ISO with milliseconds.');
	}
	return value as Scalar;
}
function dateRange(f: DataField) {
	const a = Date.parse(f.start),
		b = Date.parse(f.end);
	if (
		!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(f.start) ||
		!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(f.end) ||
		!Number.isFinite(a) ||
		!Number.isFinite(b) ||
		a > b ||
		new Date(a).toISOString().slice(0, 10) !== f.start.slice(0, 10) ||
		new Date(b).toISOString().slice(0, 10) !== f.end.slice(0, 10)
	)
		fail('Date bounds must be valid UTC ISO datetimes in ascending order.');
	return [a, b];
}
function enums(f: DataField) {
	const values = f.values.split('\n');
	if (
		values.length > 1000 ||
		values.some((v) => !v.length || v.length > 256) ||
		new Set(values).size !== values.length
	)
		fail('Enum needs 1–1,000 distinct nonempty lines (≤256 characters each).');
	return values;
}
function cardinality(f: DataField): number {
	if (f.mode === 'fixed') return 1;
	switch (f.type) {
		case 'null':
			return 1;
		case 'boolean':
			return 2;
		case 'integer':
			return f.max - f.min + 1;
		case 'decimal':
			return Math.round((f.max - f.min) * 10 ** f.decimals) + 1;
		case 'enum':
			return enums(f).length;
		case 'date': {
			const [a, b] = dateRange(f);
			return Math.floor(b / 86400000) - Math.ceil(a / 86400000) + 1;
		}
		case 'datetime': {
			const [a, b] = dateRange(f);
			return b - a + 1;
		}
		case 'string':
			return 36 ** (f.length - f.prefix.length);
		case 'ean13':
			return 10 ** (12 - f.prefix.length);
		case 'gtin14':
			return 10 ** (13 - f.prefix.length);
		default:
			return Infinity;
	}
}
export function validateDataset(spec: DatasetSpec): Collection[] {
	if (
		!spec ||
		!Array.isArray(spec.collections) ||
		spec.collections.length < 1 ||
		spec.collections.length > DATA_LIMITS.collections
	)
		fail('Choose 1–5 collections.');
	if (
		typeof spec.seed !== 'string' ||
		spec.seed.length > 128 ||
		!['array', 'collections', 'page'].includes(spec.output)
	)
		fail('Invalid seed or JSON envelope.');
	const collectionIds = new Set<string>(),
		collectionNames = new Set<string>();
	let total = 0;
	for (const c of spec.collections) {
		name(c.id, 'Collection ID');
		name(c.name, 'Collection');
		if (collectionIds.has(c.id) || collectionNames.has(c.name))
			fail('Collection IDs and names must be distinct.');
		collectionIds.add(c.id);
		collectionNames.add(c.name);
		whole(c.rows, 1, DATA_LIMITS.rows, 'Rows');
		total += c.rows;
		if (!Array.isArray(c.fields) || !c.fields.length || c.fields.length > DATA_LIMITS.fields)
			fail('Choose 1–24 fields per collection.');
		const ids = new Set(),
			names = new Set();
		for (const f of c.fields) {
			name(f.id, 'Field ID');
			name(f.name, 'Field');
			if (ids.has(f.id) || names.has(f.name))
				fail('Field IDs and names must be distinct within a collection.');
			ids.add(f.id);
			names.add(f.name);
			if (
				!fieldTypes.includes(f.type) ||
				!['generated', 'fixed'].includes(f.mode) ||
				[f.required, f.nullable, f.unique].some((v) => typeof v !== 'boolean')
			)
				fail('Invalid field type or policy.');
			if (
				typeof f.prefix !== 'string' ||
				f.prefix.length > 64 ||
				typeof f.fixed !== 'string' ||
				f.fixed.length > 2048 ||
				typeof f.values !== 'string' ||
				f.values.length > 256000
			)
				fail('Field options exceed their limits.');
			if (f.mode === 'fixed') fixedValue(f);
			else if (f.type === 'integer' || f.type === 'decimal') {
				if (
					!Number.isFinite(f.min) ||
					!Number.isFinite(f.max) ||
					f.min > f.max ||
					Math.abs(f.min) > 1e9 ||
					Math.abs(f.max) > 1e9
				)
					fail('Numeric bounds must be finite, ascending and within ±1 billion.');
				if (f.type === 'integer') {
					whole(f.min, -1e9, 1e9, 'Minimum');
					whole(f.max, -1e9, 1e9, 'Maximum');
				} else {
					whole(f.decimals, 0, 4, 'Decimal places');
					const factor = 10 ** f.decimals;
					if (
						Math.abs(Math.round(f.min * factor) - f.min * factor) > 1e-5 ||
						Math.abs(Math.round(f.max * factor) - f.max * factor) > 1e-5
					)
						fail('Decimal bounds must fit the selected precision.');
				}
			} else if (f.type === 'string') {
				whole(f.length, 1, DATA_LIMITS.string, 'String length');
				if (!/^[\x20-\x7e]*$/.test(f.prefix) || f.prefix.length > f.length)
					fail(
						'Generated prefixes are ASCII and cannot exceed the string length; use a fixed value or enum for Unicode.'
					);
			} else if (f.type === 'ean13' || f.type === 'gtin14') {
				if (!/^\d*$/.test(f.prefix) || f.prefix.length > (f.type === 'ean13' ? 12 : 13))
					fail('Invalid GTIN numeric prefix.');
			} else if (f.type === 'date' || f.type === 'datetime') dateRange(f);
			else if (f.type === 'enum') enums(f);
			if (
				f.mode === 'generated' &&
				f.type === 'reference' &&
				(f.nullable || !f.required || f.unique)
			)
				fail('Foreign keys are required, non-null and may repeat (one-to-many).');
			if (f.type === 'reference' && f.mode === 'fixed')
				fail('Foreign keys must use generated references.');
			if (cardinality(f) < 1) fail('No values fit the selected range.');
			if (f.unique && c.rows > cardinality(f))
				fail('Field ' + f.name + ': requested rows exceed the distinct value space.');
		}
	}
	if (total > DATA_LIMITS.totalRows) fail('Dataset exceeds 10,000 total rows.');
	const order: Collection[] = [],
		seen = new Set<string>(),
		visiting = new Set<string>();
	function visit(c: Collection) {
		if (visiting.has(c.id)) fail('Collection references contain a cycle.');
		if (seen.has(c.id)) return;
		visiting.add(c.id);
		for (const f of c.fields.filter((f) => f.mode === 'generated' && f.type === 'reference')) {
			const parent = spec.collections.find((p) => p.id === f.collectionId),
				key = parent?.fields.find((p) => p.id === f.fieldId);
			if (!parent || !key)
				fail('Foreign key ' + f.name + ' references a missing collection or field.');
			if (!key.unique || key.nullable || !key.required || key.type === 'null')
				fail('Foreign keys must target a required, unique, non-null field.');
			visit(parent);
		}
		visiting.delete(c.id);
		seen.add(c.id);
		order.push(c);
	}
	spec.collections.forEach(visit);
	return order;
}
function random(seed: string) {
	let state = 2166136261;
	for (const c of seed) state = Math.imul(state ^ c.codePointAt(0)!, 16777619);
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let n = Math.imul(state ^ (state >>> 15), 1 | state);
		n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
		return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
	};
}
/** Spreadsheet protection is an explicit CSV-only prefix; JSON retains original values. */
export function csvCell(value: Scalar | undefined) {
	let s = value === null || value === undefined ? '' : String(value);
	const first = Array.from(s).find((c) => c.charCodeAt(0) > 32 && !/\s/u.test(c));
	if (first && '=+-@'.includes(first)) s = "'" + s;
	return '"' + s.replaceAll('"', '""') + '"';
}
export function datasetCsv(rows: Record<string, Scalar>[], fields: string[]) {
	return (
		fields.map(csvCell).join(',') +
		'\r\n' +
		rows.map((row) => fields.map((f) => csvCell(row[f])).join(',')).join('\r\n')
	);
}
export function generateDataset(spec: DatasetSpec): DatasetResult {
	const order = validateDataset(spec),
		rng = random(spec.seed),
		integer = (max: number) => Math.floor(rng() * max),
		collections: Record<string, Record<string, Scalar>[]> = Object.create(null);
	let used = 0;
	for (const c of order) {
		const prepared = c.fields.map((f) => ({
			f,
			space: cardinality(f),
			offset: integer(Math.min(cardinality(f), 1e9)),
			values: f.type === 'enum' ? enums(f) : [],
			range: f.type === 'date' || f.type === 'datetime' ? dateRange(f) : []
		}));
		const rows: Record<string, Scalar>[] = [];
		for (let i = 0; i < c.rows; i++) {
			const row: Record<string, Scalar> = Object.create(null);
			for (const { f, space, offset, values, range } of prepared) {
				if (!f.required && rng() < 0.1) continue;
				let value: Scalar;
				if (f.mode === 'fixed') value = fixedValue(f);
				else if (f.type === 'null' || (f.nullable && rng() < 0.1)) value = null;
				else {
					const n = f.unique ? (offset + i) % space : integer(space);
					switch (f.type) {
						case 'string': {
							const size = f.length - f.prefix.length;
							let suffix = '';
							if (f.unique)
								suffix = size ? (offset + i).toString(36).padStart(size, '0').slice(-size) : '';
							else
								for (let j = 0; j < size; j++)
									suffix += 'abcdefghijklmnopqrstuvwxyz0123456789'[integer(36)];
							value = f.prefix + suffix;
							break;
						}
						case 'integer':
							value = f.min + n;
							break;
						case 'decimal':
							value = Number((f.min + n / 10 ** f.decimals).toFixed(f.decimals));
							break;
						case 'boolean':
							value = n === 1;
							break;
						case 'enum':
							value = values[n];
							break;
						case 'uuid': {
							const b = Array.from({ length: 16 }, () => integer(256));
							b[6] = (b[6] & 15) | 64;
							b[8] = (b[8] & 63) | 128;
							const h = b.map((n) => n.toString(16).padStart(2, '0')).join('');
							value =
								h.slice(0, 8) +
								'-' +
								h.slice(8, 12) +
								'-' +
								h.slice(12, 16) +
								'-' +
								h.slice(16, 20) +
								'-' +
								h.slice(20);
							break;
						}
						case 'date':
							value = new Date(Math.ceil(range[0] / 86400000) * 86400000 + n * 86400000)
								.toISOString()
								.slice(0, 10);
							break;
						case 'datetime':
							value = new Date(range[0] + n).toISOString();
							break;
						case 'ean13':
						case 'gtin14': {
							const digits = (f.type === 'ean13' ? 12 : 13) - f.prefix.length;
							const suffix = digits ? String(n).padStart(digits, '0') : '';
							value = completeGTIN(f.prefix + suffix, f.type);
							break;
						}
						case 'reference': {
							const parent = spec.collections.find((p) => p.id === f.collectionId)!,
								key = parent.fields.find((p) => p.id === f.fieldId)!;
							const source = collections[parent.name];
							value = source[integer(source.length)][key.name];
							break;
						}
						default:
							fail('Unsupported generator.');
					}
				}
				row[f.name] = value;
			}
			used += bytes(JSON.stringify(row));
			if (used > DATA_LIMITS.bytes)
				fail('Dataset exceeds the 4 MiB output budget. Reduce rows or field lengths.');
			rows.push(row);
		}
		for (const f of c.fields.filter((f) => f.unique)) {
			const values = rows.map((r) => r[f.name]).filter((v) => v !== null && v !== undefined);
			if (new Set(values).size !== values.length)
				fail(
					'Field ' +
						f.name +
						': uniqueness could not be satisfied; use a larger value space or a different type.'
				);
		}
		collections[c.name] = rows;
	}
	const first = collections[spec.collections[0].name],
		envelope =
			spec.output === 'collections'
				? collections
				: spec.output === 'page'
					? {
							content: first,
							page: { number: 0, size: first.length, totalElements: first.length, totalPages: 1 }
						}
					: first;
	if (spec.output !== 'collections' && spec.collections.length > 1)
		fail('Choose Related collections to export every collection.');
	const json = JSON.stringify(envelope, null, 2),
		csv = Object.fromEntries(
			spec.collections.map((c) => [
				c.name,
				datasetCsv(
					collections[c.name],
					c.fields.map((f) => f.name)
				)
			])
		);
	const length = bytes(json);
	if (length > DATA_LIMITS.bytes || Object.values(csv).some((s) => bytes(s) > DATA_LIMITS.bytes))
		fail('Serialized output exceeds 4 MiB. Reduce the schema or row count.');
	return {
		collections,
		json,
		csv,
		rows: spec.collections.reduce((n, c) => n + c.rows, 0),
		fields: spec.collections.reduce((n, c) => n + c.fields.length, 0),
		bytes: length,
		seed: spec.seed,
		order: order.map((c) => c.name)
	};
}
export function newField(id: string, name = 'field', type: FieldType = 'string'): DataField {
	return {
		id,
		name,
		type,
		required: true,
		nullable: false,
		unique: false,
		mode: 'generated',
		fixed: '"synthetic"',
		min: 1,
		max: 10000,
		length: 16,
		decimals: 2,
		values: 'draft\npaid\nshipped',
		prefix: '',
		start: '2026-01-01T00:00:00.000Z',
		end: '2026-12-31T00:00:00.000Z',
		collectionId: '',
		fieldId: ''
	};
}
export const presetNames = [
	'Customers',
	'Orders (related to customers)',
	'Products',
	'API paginated response',
	'Inventory'
] as const;
export function datasetPreset(index: number): DatasetSpec {
	const id = newField('id', 'id', 'integer');
	id.unique = true;
	const customers: Collection = {
		id: 'customers',
		name: 'customers',
		rows: 12,
		fields: [
			id,
			{ ...newField('name', 'name'), prefix: 'Customer-', length: 16 },
			{ ...newField('active', 'active', 'boolean') }
		]
	};
	if (index === 1) {
		const ref = {
			...newField('customer', 'customer_id', 'reference'),
			collectionId: 'customers',
			fieldId: 'id'
		};
		return {
			seed: 'devbench-orders',
			output: 'collections',
			collections: [
				customers,
				{
					id: 'orders',
					name: 'orders',
					rows: 30,
					fields: [
						{ ...id },
						ref,
						{ ...newField('total', 'total', 'decimal'), min: 1, max: 250, decimals: 2 },
						newField('status', 'status', 'enum'),
						newField('created', 'created_at', 'datetime')
					]
				}
			]
		};
	}
	if (index === 2 || index === 4)
		return {
			seed: 'devbench-products',
			output: 'array',
			collections: [
				{
					id: 'products',
					name: index === 4 ? 'inventory' : 'products',
					rows: 20,
					fields: [
						{ ...id },
						{ ...newField('sku', 'sku', 'ean13'), unique: true, prefix: '0' },
						{ ...newField('label', 'label'), prefix: 'Item-', length: 14 },
						{ ...newField('price', 'price', 'decimal'), min: 0.01, max: 999.99 },
						{ ...newField('stock', 'stock', 'integer'), min: 0, max: 1000 }
					]
				}
			]
		};
	return {
		seed: 'devbench-customers',
		output: index === 3 ? 'page' : 'array',
		collections: [customers]
	};
}
