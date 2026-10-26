import { describe, it, expect } from 'vitest';
import {
	generateDataset,
	datasetPreset,
	newField,
	validateDataset,
	datasetCsv,
	type DatasetSpec
} from './dataset-engine';
import { validateGTIN } from './gtin-engine';
describe('structured synthetic datasets', () => {
	it.each([0, 1, 2, 3, 4])('generates editable preset %s with bounded output', (index) => {
		const r = generateDataset(datasetPreset(index));
		expect(r.rows).toBeGreaterThan(0);
		expect(r.bytes).toBeLessThan(4 * 1024 * 1024);
		expect(() => JSON.parse(r.json)).not.toThrow();
	});
	it('is deterministic per seed, changes with a different seed, preserves all foreign keys and dependency order', () => {
		const spec = datasetPreset(1);
		spec.collections.reverse();
		const a = generateDataset(spec);
		expect(generateDataset(spec)).toEqual(a);
		expect(a.order).toEqual(['customers', 'orders']);
		const ids = new Set(a.collections.customers.map((r) => r.id));
		expect(a.collections.orders.every((r) => ids.has(r.customer_id))).toBe(true);
		spec.seed += '2';
		expect(generateDataset(spec).json).not.toBe(a.json);
	});
	it('generates all supported scalar types, leading-zero GTIN strings, bounded precision and UTC dates', () => {
		const spec = datasetPreset(0),
			c = spec.collections[0];
		c.rows = 80;
		c.fields = [
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
			'null'
		].map((type, index) => ({
			...newField('f' + index, type, type as ReturnType<typeof newField>['type']),
			...(type === 'ean13' || type === 'gtin14' ? { prefix: '000' } : {}),
			...(type === 'null' ? { nullable: true } : {})
		}));
		const r = generateDataset(spec);
		for (const row of r.collections.customers) {
			expect(typeof row.string).toBe('string');
			expect(String(row.string)).toHaveLength(16);
			expect(row.integer).toBeGreaterThanOrEqual(1);
			expect(row.integer).toBeLessThanOrEqual(10000);
			expect(Number.isSafeInteger(row.integer)).toBe(true);
			expect(row.decimal).toBeGreaterThanOrEqual(1);
			expect(Number(row.decimal!.toString())).toBe(row.decimal);
			expect(typeof row.boolean).toBe('boolean');
			expect(row.uuid).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			);
			expect(row.date).toMatch(/^2026-\d\d-\d\d$/);
			expect(row.datetime).toMatch(/^2026-.*Z$/);
			expect(['draft', 'paid', 'shipped']).toContain(row.enum);
			expect(String(row.ean13).startsWith('000')).toBe(true);
			expect(validateGTIN(String(row.ean13), 'ean13').valid).toBe(true);
			expect(validateGTIN(String(row.gtin14), 'gtin14').valid).toBe(true);
			expect(row.null).toBeNull();
		}
	});
	it('guarantees finite-space uniqueness without collision retries and rejects impossible requests', () => {
		const spec = datasetPreset(0),
			c = spec.collections[0];
		c.rows = 36;
		c.fields = [{ ...newField('x', 'x'), length: 1, unique: true }];
		expect(new Set(generateDataset(spec).collections.customers.map((r) => r.x)).size).toBe(36);
		c.rows = 37;
		expect(() => generateDataset(spec)).toThrow(/distinct/);
		c.rows = 2;
		c.fields = [{ ...newField('b', 'b', 'boolean'), unique: true }];
		expect(new Set(generateDataset(spec).collections.customers.map((r) => r.b)).size).toBe(2);
		c.fields = [{ ...newField('e', 'e', 'enum'), values: '雪\ncafé', unique: true }];
		expect(new Set(generateDataset(spec).collections.customers.map((r) => r.e))).toEqual(
			new Set(['雪', 'café'])
		);
	});
	it('preserves fixed Unicode, escaping/newlines and explicitly protects CSV cells and headers', () => {
		const rows = [{ '=header': ' \t=SUM(1,2)', text: 'café "雪"\nline', null: null }];
		const csv = datasetCsv(rows, ['=header', 'text', 'null']);
		expect(csv).toContain('"\'=header"');
		expect(csv).toContain('"\' \t=SUM(1,2)"');
		expect(csv).toContain('"café ""雪""\nline"');
		const spec = datasetPreset(0);
		spec.collections[0].fields = [
			{ ...newField('x', '=header'), mode: 'fixed', fixed: JSON.stringify('雪 👩🏽‍💻 & <tag>') }
		];
		const r = generateDataset(spec);
		expect(JSON.parse(r.json)[0]['=header']).toBe('雪 👩🏽‍💻 & <tag>');
	});
	it('supports optional omission and nullable generated values without dropping required keys', () => {
		const spec = datasetPreset(0);
		spec.collections[0].rows = 200;
		spec.collections[0].fields = [
			newField('id', 'id'),
			{ ...newField('optional', 'optional'), required: false },
			{ ...newField('nullable', 'nullable'), nullable: true }
		];
		const rows = generateDataset(spec).collections.customers;
		expect(rows.every((r) => Object.hasOwn(r, 'id'))).toBe(true);
		expect(rows.some((r) => !Object.hasOwn(r, 'optional'))).toBe(true);
		expect(rows.some((r) => r.nullable === null)).toBe(true);
	});
	it.each([
		'cycle',
		'missing',
		'duplicate',
		'prototype',
		'nonunique-key',
		'nullable-key',
		'unsafe-number',
		'empty-enum',
		'invalid-date',
		'large-rows',
		'large-fields',
		'large-output',
		'wrong-fixed-type'
	])('rejects %s atomically', (kind) => {
		const spec = datasetPreset(1),
			parent = spec.collections[0],
			child = spec.collections[1];
		if (kind === 'cycle')
			parent.fields.push({
				...newField('ref', 'ref', 'reference'),
				collectionId: 'orders',
				fieldId: 'id'
			});
		if (kind === 'missing') child.fields[1].fieldId = 'absent';
		if (kind === 'duplicate') parent.fields[1].name = parent.fields[0].name;
		if (kind === 'prototype') parent.name = '__proto__';
		if (kind === 'nonunique-key') parent.fields[0].unique = false;
		if (kind === 'nullable-key') parent.fields[0].nullable = true;
		if (kind === 'unsafe-number') parent.fields[0].max = Number.MAX_SAFE_INTEGER + 1;
		if (kind === 'empty-enum') child.fields[3].values = '';
		if (kind === 'invalid-date') child.fields[4].start = '2026-02-30T00:00:00.000Z';
		if (kind === 'large-rows') parent.rows = 5001;
		if (kind === 'large-fields')
			parent.fields = Array.from({ length: 25 }, (_, i) => newField('f' + i, 'f' + i));
		if (kind === 'large-output') {
			spec.collections = [
				{
					id: 'huge',
					name: 'huge',
					rows: 5000,
					fields: Array.from({ length: 24 }, (_, i) => ({
						...newField('f' + i, 'f' + i),
						length: 256
					}))
				}
			];
			spec.output = 'array';
		}
		if (kind === 'wrong-fixed-type') {
			parent.fields[0].mode = 'fixed';
			parent.fields[0].fixed = '"not a number"';
		}
		const before = JSON.stringify(spec);
		expect(() => generateDataset(spec)).toThrow();
		expect(JSON.stringify(spec)).toBe(before);
	});
	it('handles exact zero-suffix strings and full GTIN prefixes, and rejects date ranges with no calendar day', () => {
		const spec: DatasetSpec = {
			seed: 'x',
			output: 'array',
			collections: [
				{
					id: 'c',
					name: 'c',
					rows: 1,
					fields: [
						{ ...newField('s', 's'), length: 1, prefix: 'X', unique: true },
						{ ...newField('gt', 'gt', 'ean13'), prefix: '000000000000', unique: true }
					]
				}
			]
		};
		expect(generateDataset(spec).collections.c[0]).toEqual({ s: 'X', gt: '0000000000000' });
		spec.collections[0].fields = [
			{
				...newField('d', 'd', 'date'),
				start: '2026-01-01T12:00:00.000Z',
				end: '2026-01-01T13:00:00.000Z'
			}
		];
		expect(() => validateDataset(spec)).toThrow();
	});
});
