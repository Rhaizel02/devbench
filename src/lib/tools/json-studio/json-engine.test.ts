import { describe, expect, it } from 'vitest';
import {
	validateJson,
	formatJson,
	minifyJson,
	jsonPath,
	jsonPointer,
	treeRows,
	MAX_BYTES
} from './json-engine';
describe('strict JSON engine', () => {
	it.each(['null', 'true', '42', '"hello"', '[]', '{}', '{"a":1,"b":[true,null]}'])(
		'accepts JSON root %s',
		(input) => expect(validateJson(input).status).toBe('valid')
	);
	it.each(['{"a":1,}', '[1,]', "{'a':1}", 'undefined', '{"x":NaN}'])(
		'rejects invalid JSON %s',
		(input) => expect(validateJson(input).status).toBe('invalid')
	);
	it('distinguishes empty input from null', () => {
		expect(validateJson('  ')).toEqual({ status: 'empty' });
		expect(minifyJson('null')).toMatchObject({ status: 'valid', value: null, output: 'null' });
	});
	it('formats with 2, 4 and tab indentation', () => {
		for (const indent of [2, 4, 'tab'] as const) {
			const result = formatJson('{"a":1}', indent);
			expect(result).toMatchObject({
				status: 'valid',
				output: '{\n' + (indent === 'tab' ? '\t' : ' '.repeat(indent)) + '"a": 1\n}'
			});
		}
	});
	it('minifies Unicode and preserves escaped values', () =>
		expect(minifyJson(' { "hello": "世界 👋", "line": "a\\nb" } ')).toMatchObject({
			output: '{"hello":"世界 👋","line":"a\\nb"}'
		}));
	it('returns an error without a valid output or leaked input', () => {
		const result = formatJson('{"private-synthetic-marker":,}');
		expect(result.status).toBe('invalid');
		expect(result).not.toHaveProperty('output');
		expect(JSON.stringify(result)).not.toContain('private-synthetic-marker');
	});
	it('reports line and column where the engine provides a position', () =>
		expect(validateJson('{\n"a":1,\n}')).toMatchObject({ status: 'invalid', line: 3, column: 1 }));
	it('limits UTF-8 bytes rather than characters', () => {
		expect(validateJson('"' + 'a'.repeat(MAX_BYTES) + '"').status).toBe('invalid');
		expect(validateJson('"' + '界'.repeat(Math.ceil(MAX_BYTES / 3)) + '"').status).toBe('invalid');
	});
	it('supports a reasonably large array', () =>
		expect(formatJson(JSON.stringify(Array.from({ length: 10000 }, (_, i) => i))).status).toBe(
			'valid'
		));
	it('handles deeply nested formatting without throwing', () => {
		const result = formatJson('['.repeat(10000) + '0' + ']'.repeat(10000));
		expect(['valid', 'invalid']).toContain(result.status);
	});
});
describe('tree paths and bounded traversal', () => {
	it('escapes keys in JSONPath and JSON Pointer', () => {
		expect(jsonPath('$', 'a"\\b')).toBe('$["a\\"\\\\b"]');
		expect(jsonPath('$', 0)).toBe('$[0]');
		expect(jsonPointer('', 'a~/b')).toBe('/a~0~1b');
	});
	it('supports scalar roots', () =>
		expect(treeRows(null, new Set()).rows).toMatchObject([
			{ path: '$', value: null, branch: false }
		]));
	it('expands, collapses and searches nested values', () => {
		const value = { outer: [true, { needle: 'found' }] };
		expect(treeRows(value, new Set()).rows).toHaveLength(1);
		expect(treeRows(value, new Set(['$'])).rows).toHaveLength(2);
		expect(treeRows(value, new Set(), 'found').rows[0].path).toBe('$["outer"][1]["needle"]');
	});
	it('bounds rendered nodes', () => {
		const result = treeRows(
			Array.from({ length: 10000 }, (_, i) => i),
			new Set(['$']),
			'',
			500
		);
		expect(result.rows).toHaveLength(500);
		expect(result.truncated).toBe(true);
	});
	it('bounds tree depth independently of parser depth', () => {
		const value = JSON.parse('['.repeat(1000) + '0' + ']'.repeat(1000));
		const result = treeRows(value, new Set(), 'no-match');
		expect(result.rows).toHaveLength(0);
		expect(result.truncated).toBe(true);
	});
});
