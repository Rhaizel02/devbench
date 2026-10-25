import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { jsonToCsv, csvToJson, type CsvOptions } from './json-csv/csv-engine';
import { inferCode, generatedTypeName } from './json-code/code-engine';
import { inspectCurl } from './curl-inspector/curl-engine';
const csv: CsvOptions = { delimiter: ',', header: true, quoteAll: false, nested: 'reject' };
describe('explicit CSV conversion policies', () => {
	it('preserves quoted separators/quotes/multiline CRLF/Unicode and BOM', () => {
		const records = [
			{ name: 'café 世界', text: 'one,"two"\r\nthree' },
			{ name: '', text: '=1+1' }
		];
		const output = jsonToCsv(JSON.stringify(records), csv);
		expect(output).toContain('"one,""two""\r\nthree"');
		expect(JSON.parse(csvToJson('\ufeff' + output + '\r\n', csv))).toEqual(records);
		expect(output).toContain('=1+1');
	});
	it.each([',', ';', '\t', '|'] as const)(
		'uses selected delimiters and optional headers/quoting',
		(delimiter) => {
			const options = { ...csv, delimiter, header: false, quoteAll: true };
			expect(JSON.parse(csvToJson(jsonToCsv('[{"a":"x","b":"y"}]', options), options))).toEqual([
				{ column1: 'x', column2: 'y' }
			]);
		}
	);
	it('makes null/missing/empty loss and nested stringify intentional', () => {
		expect(JSON.parse(csvToJson(jsonToCsv('[{"a":null},{"b":true},{"a":""}]', csv), csv))).toEqual([
			{ a: '', b: '' },
			{ a: '', b: 'true' },
			{ a: '', b: '' }
		]);
		expect(() => jsonToCsv('[{"a":{"x":1}}]', csv)).toThrow('explicitly enabled');
		expect(
			JSON.parse(csvToJson(jsonToCsv('[{"a":{"x":1}}]', { ...csv, nested: 'stringify' }), csv))
		).toEqual([{ a: '{"x":1}' }]);
		expect(JSON.parse(csvToJson('value\n""\nnext\n', csv))).toEqual([
			{ value: '' },
			{ value: 'next' }
		]);
	});
	it.each(['a,a\n1,2', ',b\n1,2', 'a,b\n1', 'a\n"unclosed'])(
		'rejects malformed headers, widths and quoting',
		(input) => expect(() => csvToJson(input, csv)).toThrow()
	);
	it('protects prototype keys and enforces cell/row/column/input limits', () => {
		const records = JSON.parse(csvToJson('__proto__,constructor\nsafe,value', csv));
		expect(Object.hasOwn(records[0], '__proto__')).toBe(true);
		expect(() => jsonToCsv('[{"a":"' + 'x'.repeat(65537) + '"}]', csv)).toThrow('limit');
		expect(() => csvToJson('a\n' + 'x\n'.repeat(5001), csv)).toThrow('5,000');
		expect(() => csvToJson(Array.from({ length: 201 }, (_, i) => 'c' + i).join(','), csv)).toThrow(
			'200'
		);
		expect(() => jsonToCsv('[]', csv)).toThrow('infer');
	});
});
describe('usable code inferred from finite sample evidence', () => {
	it('merges object-array samples and infers nested/nullable/heterogeneous/empty shapes', () => {
		const output = inferCode(
			'[{"id":1,"name":"x","child":{"ok":true}},{"id":2,"nil":null,"items":[],"mixed":[1,"x"]}]',
			'typescript'
		);
		expect(output).toContain('export type Root = Array<RootItem>');
		expect(output).toContain('"id": number;');
		expect(output).toContain('"name"?: string;');
		expect(output).toContain('"items"?: Array<unknown>');
		expect(output).toContain('Array<(number | string)>');
		expect(inferCode('{"id":1}', 'typescript')).not.toContain('"id"?');
	});
	it('produces TypeScript passing real strict semantic diagnostics for hostile keys and name collisions', () => {
		const sample = JSON.stringify({
			'a-b': { 'x"\n': 1 },
			a_b: { class: null },
			'42': [true, 'x'],
			['__proto__']: 'value'
		});
		const source = inferCode(sample, 'typescript', '123 odd-root');
		const filename = '/__devbench_generated_synthetic.ts';
		const options: ts.CompilerOptions = {
			strict: true,
			noEmit: true,
			target: ts.ScriptTarget.ES2022,
			types: []
		};
		const host = ts.createCompilerHost(options);
		const original = host.getSourceFile.bind(host);
		host.getSourceFile = (file, target, ...rest) =>
			file === filename
				? ts.createSourceFile(file, source, target, true)
				: original(file, target, ...rest);
		const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
		expect(diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual(
			[]
		);
	});
	it('generates Java records with boxed nullability, unique safe fields and nested types', () => {
		const output = inferCode(
			'[{"a-b":{"x":1},"a_b":true,"class":null,"toString":"x","_":1},{"a-b":{"x":2},"a_b":false}]',
			'java',
			'String'
		);
		expect(output).toContain('public record StringType(');
		expect(output).toContain('List<StringTypeItem> value');
		expect(output).toContain('Boolean a_b_2');
		expect(output).toContain('Object class_');
		expect(output).toContain('String toString_');
		expect(output).toContain('BigDecimal __');
		expect(output).toContain('absent in some samples; nullable');
		expect(generatedTypeName('_')).toBe('Generated');
		expect(inferCode('null', 'java')).toContain('Object value');
	});
	it('bounds recursion, key sizes and input without executing generated text', () => {
		expect(() => inferCode('['.repeat(33) + '0' + ']'.repeat(33), 'java')).toThrow('32 levels');
		expect(() => inferCode(JSON.stringify({ ['x'.repeat(257)]: 1 }), 'typescript')).toThrow(
			'256 characters'
		);
		expect(() => inferCode('{"a":1,}', 'typescript')).toThrow('strict JSON');
	});
});
describe('parse-only bounded POSIX cURL subset', () => {
	const command =
		"curl 'https://user:secret@example.com/p?tag=a&tag=b&api_key=synthetic-secret' -H 'Authorization: Bearer synthetic-secret' -H 'Cookie: token=synthetic-secret' -H 'Content-Type: application/json' --data-raw '{\"secret\":\"synthetic-secret\"}'";
	it('redacts credentials, sensitive repeated query/header values and bodies by default', () => {
		const result = inspectCurl(command);
		expect(result.method).toBe('POST');
		expect(JSON.stringify(result)).not.toContain('synthetic-secret');
		expect(result.target).toContain('REDACTED:REDACTED');
		expect(result.query.slice(0, 2)).toEqual([
			{ key: 'tag', value: 'a' },
			{ key: 'tag', value: 'b' }
		]);
		expect(inspectCurl(command, true).body).toBe('{"secret":"synthetic-secret"}');
	});
	it('handles common literal quotes, escapes, continuations, method and -G semantics', () => {
		expect(
			inspectCurl("curl 'https://example.com/' -H 'X-Note: it'\\''s'", true).headers[0].value
		).toBe("it's");
		expect(
			inspectCurl('curl https://example.com/ \\\n -X PATCH --data-raw @literal', true)
		).toMatchObject({ method: 'PATCH', body: '@literal' });
		const result = inspectCurl(
			"curl 'https://example.com/?a=1' -G -d 'x=hello+world' --data 'empty=' -X HEAD",
			true
		);
		expect(result.method).toBe('HEAD');
		expect(result.body).toBeNull();
		expect(result.query).toContainEqual({ key: 'x', value: 'hello world' });
		expect(result.query).toContainEqual({ key: 'empty', value: '' });
		expect(
			inspectCurl("curl --url=https://example.com '-HX-Empty;' -H 'X-Remove:'", true).headers
		).toEqual([
			{ name: 'X-Empty', value: '', action: 'set' },
			{ name: 'X-Remove', value: '', action: 'remove' }
		]);
	});
	it.each([
		'curl https://example.com | sh',
		'curl https://example.com; echo bad',
		'curl $(echo bad)',
		'curl `echo bad`',
		'curl "$HOME"',
		'curl https://example.com > file',
		'curl https://example.com -d @secret.txt',
		'curl https://example.com --data-binary @-',
		'curl https://example.com -H @headers',
		'curl https://example.com --next https://other.com',
		'curl https://example.com https://other.com',
		'Invoke-WebRequest https://example.com',
		'curl file:///secret.txt',
		"curl 'https://example.com",
		'curl https://example.com -X'
	])('rejects unsupported or unsafe constructs without executing or reading anything', (input) =>
		expect(() => inspectCurl(input)).toThrow()
	);
});
