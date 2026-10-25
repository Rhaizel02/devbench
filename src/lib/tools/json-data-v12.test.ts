import { describe, it, expect } from 'vitest';
import { boundedJson, queryJson } from './json-query/query-engine';
import { inferSchema, validateDocument } from './json-schema/schema-engine';

describe('bounded JSONPath subset', () => {
	const document = JSON.stringify({
		items: [
			{ price: 2, name: '雪' },
			{ price: 30, name: null }
		],
		'a/b~': { 'quote"': false },
		__proto__: null
	});
	it('handles filters, Unicode, arrays and normalized paths', () => {
		expect(queryJson(document, '$.items[?(@.price < 10)]')[0].value).toEqual({
			price: 2,
			name: '雪'
		});
		expect(queryJson(document, '$.items[-1].name')[0].value).toBeNull();
		expect(queryJson(document, '$..name').map((m) => m.value)).toEqual(['雪', null]);
		expect(queryJson(document, '$.items[*]')).toHaveLength(2);
		const escapedPath = '$[' + JSON.stringify('a/b~') + '][' + JSON.stringify('quote"') + ']';
		expect(queryJson(document, escapedPath)[0]).toEqual({
			value: false,
			path: escapedPath,
			pointer: '/a~1b~0/quote"'
		});
	});
	it('distinguishes no results and preserves scalar roots', () => {
		expect(queryJson(document, '$.missing')).toEqual([]);
		expect(queryJson('null', '$')[0].value).toBeNull();
		expect(queryJson('[null,1,false]', '$[?(@ == null)]')).toHaveLength(1);
		expect(queryJson('{}', '$.constructor')).toEqual([]);
	});
	it.each(['$.items[?((globalThis.attack=1))]', '$..[', '$.items[0:4]', 'x', '$[?(@.x === 1)]'])(
		'rejects unsupported expressions %s',
		(query) => expect(() => queryJson(document, query)).toThrow()
	);
	it('bounds input, depth, results and evaluation work', () => {
		expect(() => boundedJson(' '.repeat(1024 * 1024 + 1))).toThrow(/limit/);
		expect(() => boundedJson('['.repeat(66) + '0' + ']'.repeat(66))).toThrow(/levels/);
		expect(() => queryJson(JSON.stringify(Array(2001).fill(0)), '$[*]')).toThrow(/result limit/);
		expect(() => queryJson('{"a":1,}', '$')).toThrow(/Invalid JSON/);
		const nested = JSON.stringify(Array.from({ length: 1000 }, () => ({ a: [1, 2, 3] })));
		expect(() => queryJson(nested, '$..*..*..*..*..*..*')).toThrow();
	});
});
describe('local Draft 2020-12 validation and conservative inference', () => {
	it('supports nested constraints, required and multiple errors', () => {
		const schema = JSON.stringify({
			type: 'object',
			properties: {
				name: { type: 'string' },
				items: { type: 'array', items: { type: 'integer' } }
			},
			required: ['name', 'items']
		});
		expect(validateDocument(schema, '{"name":"ok","items":[1]}').valid).toBe(true);
		const result = validateDocument(schema, '{"name":2,"items":[false]}');
		expect(result.valid).toBe(false);
		expect(result.errorCount).toBeGreaterThanOrEqual(2);
		expect(result.errors.some((e) => e.path.includes('name'))).toBe(true);
	});
	it('uses internal references, boolean schemas and null', () => {
		expect(
			validateDocument(
				'{"$defs":{"value":{"type":["null","integer"]}},"$ref":"#/$defs/value"}',
				'null'
			).valid
		).toBe(true);
		expect(validateDocument('false', 'null').valid).toBe(false);
		expect(validateDocument('true', '[]').valid).toBe(true);
	});
	it.each([
		'{"type":"mystery"}',
		'{"required":3}',
		'{"properties":{"a":7}}',
		'{"$ref":"https://example.invalid/schema"}',
		'{"$ref":"#/$defs/missing"}',
		'{"$dynamicRef":"#x"}'
	])('rejects invalid or unsupported schema %s', (schema) =>
		expect(() => validateDocument(schema, '{}')).toThrow()
	);
	it('distinguishes invalid schema JSON, invalid documents and nonconformance', () => {
		expect(() => validateDocument('{', '{}')).toThrow(/schema JSON/);
		expect(() => validateDocument('{}', '{')).toThrow(/document JSON/);
		expect(validateDocument('{"type":"string"}', '2').valid).toBe(false);
	});
	it('infers optional nested shapes, unions and unconstrained empty arrays without unjustified restrictions', () => {
		const inferred = JSON.parse(
			inferSchema('[{"name":"x","maybe":null,"list":[]},{"name":2,"list":[true]}]', true)
		);
		expect(inferred.required).toEqual(['name', 'list']);
		expect(inferred.properties.name.anyOf).toHaveLength(2);
		expect(inferred.properties.list.items).toEqual({ type: 'boolean' });
		expect(JSON.parse(inferSchema('[]')).items).toEqual({});
		expect(inferred.properties.name.format).toBeUndefined();
		expect(validateDocument(JSON.stringify(inferred), '{"name":"ok","list":[]}').valid).toBe(true);
		expect(() => inferSchema('[]', true)).toThrow(/1–100/);
	});
});
