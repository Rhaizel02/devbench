import { describe, expect, it } from 'vitest';
import { compareJson } from './json-diff/json-diff-engine';
import { jsonToYaml, yamlToJson } from './json-yaml/yaml-engine';
import { encodeBase64, decodeBase64 } from './base64-toolkit/base64-engine';
import { inspectUrl, rebuildUrl, encodeComponent, decodeComponent } from './url-toolkit/url-engine';
describe('JSON structural comparison', () => {
	it('ignores object order and compares arrays by index', () => {
		expect(compareJson('{"a":1,"b":2}', '{"b":2,"a":1}').changes).toEqual([]);
		expect(
			compareJson('[1,2]', '[2,1,3]').changes.map(({ kind, path }) => ({ kind, path }))
		).toEqual([
			{ kind: 'changed', path: '$[0]' },
			{ kind: 'changed', path: '$[1]' },
			{ kind: 'added', path: '$[2]' }
		]);
	});
	it('distinguishes null from missing, escaped keys and scalar types', () => {
		expect(compareJson('{"a":null}', '{}').changes[0]).toMatchObject({
			kind: 'removed',
			hasBefore: true,
			hasAfter: false,
			before: null
		});
		expect(
			compareJson(JSON.stringify({ 'a"b': [true] }), JSON.stringify({ 'a"b': [false] })).changes[0]
				.path
		).toBe('$["a\\"b"][0]');
		expect(compareJson('1', '"1"').changes[0].kind).toBe('changed');
		expect(compareJson('null', 'null').changes).toHaveLength(0);
	});
	it('validates left and right independently and retains no native parse snippets', () => {
		expect(() => compareJson('{"synthetic-private":,}', '[1,]')).toThrow(/Left:.*\nRight:/);
		expect(() => compareJson('', 'null')).toThrow('Left input is empty');
	});
	it('caps changes and nesting rather than overflowing', () => {
		expect(compareJson('[1,2,3]', '[4,5,6]', 2)).toMatchObject({
			truncated: true,
			changes: expect.any(Array)
		});
		expect(() => compareJson('['.repeat(200) + '0' + ']'.repeat(200), '0')).toThrow('128 levels');
		expect(() => compareJson('"' + 'a'.repeat(1024 * 1024) + '"', '0')).toThrow('limit');
	});
});
describe('safe JSON and YAML conversions', () => {
	const value = {
		greeting: 'café 世界 👋',
		quoted: 'x: y # literal',
		multiline: 'first\nsecond\n',
		values: [true, null, 2.5],
		day: '2026-10-25'
	};
	it('roundtrips nested JSON-compatible values and Unicode', () =>
		expect(JSON.parse(yamlToJson(jsonToYaml(JSON.stringify(value))))).toEqual(value));
	it('keeps core-schema dates as strings', () =>
		expect(yamlToJson('day: 2026-10-25')).toContain('"2026-10-25"'));
	it.each([
		'a: [1,',
		'a: 1\na: 2',
		'!!js/function anything',
		'value: !!timestamp 2026-10-25',
		'1: value',
		'a: .nan',
		'a: .inf',
		'a: 9007199254740993',
		'a: &ref [1]\nb: *ref',
		'!!set { a: null }'
	])('rejects malformed or unsupported YAML safely', (input) =>
		expect(() => yamlToJson(input)).toThrow()
	);
	it('does not invoke prototype setters or accept invalid JSON', () => {
		const output = JSON.parse(yamlToJson('"__proto__": {"injected": true}'));
		expect(Object.hasOwn(output, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).injected).toBeUndefined();
		expect(() => jsonToYaml('{"a":1,}')).toThrow();
	});
});
describe('Base64 UTF-8 codec', () => {
	it.each(['café', '👩🏽‍💻 世界', 'a\u0000b', '\ufeffhello', '', '𐐷'])(
		'roundtrips text in both alphabets',
		(input) => {
			for (const urlSafe of [false, true])
				for (const padding of [false, true])
					expect(decodeBase64(encodeBase64(input, { urlSafe, padding }), { urlSafe })).toBe(input);
		}
	);
	it('handles explicit whitespace and padding policies', () => {
		expect(decodeBase64(' Y2 Fm\n w6k= ')).toBe('café');
		expect(decodeBase64('YQ')).toBe('a');
		expect(() => decodeBase64('YQ', { allowMissingPadding: false })).toThrow('padding');
		expect(() => decodeBase64('Y Q==', { ignoreWhitespace: false })).toThrow('alphabet');
	});
	it.each(['a', 'Y===', 'YQ=', 'YQ===', 'YQ==x', 'Y?==', '/w==', 'ZE=='])(
		'rejects malformed encoding or non-UTF8 bytes',
		(input) => expect(() => decodeBase64(input)).toThrow()
	);
	it('rejects mismatched alphabets and unpaired surrogates', () => {
		expect(() => decodeBase64('____')).toThrow();
		expect(() => decodeBase64('////', { urlSafe: true })).toThrow();
		expect(() => encodeBase64('\ud800')).toThrow('surrogate');
	});
});
describe('URL toolkit', () => {
	it('separates component decoding from query + semantics', () => {
		expect(decodeComponent('a+b')).toBe('a+b');
		expect(decodeComponent(encodeComponent('café +/?&'))).toBe('café +/?&');
		expect(inspectUrl('https://example.com/?a=one+two&a=&=x').query).toEqual([
			{ key: 'a', value: 'one two' },
			{ key: 'a', value: '' },
			{ key: '', value: 'x' }
		]);
	});
	it('rebuilds repeated/empty parameters and redacts credentials by default', () => {
		const source = 'https://name:secret@example.com:8443/p?tag=a&tag=b&empty=#part';
		const parsed = inspectUrl(source);
		expect(parsed.port).toBe('8443');
		expect(rebuildUrl(source, parsed.query)).toBe(
			'https://REDACTED:REDACTED@example.com:8443/p?tag=a&tag=b&empty=#part'
		);
		expect(rebuildUrl(source, [{ key: 'new', value: 'a + b' }], true)).toBe(
			'https://name:secret@example.com:8443/p?new=a+%2B+b#part'
		);
	});
	it.each(['relative/path', 'https://', 'https://example.com/%ZZ', 'https://example.com/?a=%FF'])(
		'rejects invalid absolute URLs and escapes',
		(input) => expect(() => inspectUrl(input)).toThrow()
	);
	it('rejects malformed component escapes and caps parameter counts', () => {
		expect(() => decodeComponent('%E0%A4%A')).toThrow();
		expect(() =>
			inspectUrl('https://example.com/?' + Array.from({ length: 2001 }, () => 'a=1').join('&'))
		).toThrow('2,000');
	});
});
