import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
	buildRequest,
	generateRequest,
	importCurl,
	parseHeaderLines,
	redactRequest
} from './http-request/http-engine';
import { inspectHeaders } from './http-headers/headers-engine';
describe('HTTP request generation without execution', () => {
	it('preserves empty cURL fields and rejects NUL command arguments', () => {
		const request = buildRequest('POST', 'https://example.invalid/', 'X-Empty:', '', 'abc', 'text');
		expect(importCurl(generateRequest(request, 'curl', true))).toEqual(request);
		expect(() => generateRequest({ ...request, body: '\0' }, 'curl', true)).toThrow(/NUL/);
		expect(generateRequest({ ...request, body: 'x'.repeat(65536) }, 'java', true)).toContain(
			'String.join'
		);
	});
	it('preserves duplicate query/header order, explicit body and UTF-8 escaping', () => {
		const r = buildRequest(
			'POST',
			'https://example.invalid/?q=a&q=b',
			'X-Demo: one\nx-demo: two',
			'q=c=d\nempty=',
			JSON.stringify({ text: '雪\n"quote" \\ apostrophe\'' }),
			'json'
		);
		expect(new URL(r.url).searchParams.getAll('q')).toEqual(['a', 'b', 'c=d']);
		expect(r.headers.map((h) => h.value)).toEqual(['one', 'two']);
		const curl = generateRequest(r, 'curl', true);
		expect(importCurl(curl)).toEqual(r);
		const js = generateRequest(r, 'fetch', true);
		expect(
			ts.transpileModule(js, {
				reportDiagnostics: true,
				compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
			}).diagnostics
		).toEqual([]);
		expect(generateRequest(r, 'java', true)).toContain('import java.net.http.HttpRequest;');
		expect(generateRequest(r, 'spring', true)).toContain('.uri(URI.create(');
	});
	it('redacts secrets by default and only explicit generation includes them', () => {
		const r = buildRequest(
			'POST',
			'https://example.invalid/?token=synthetic-secret&x=a',
			'Authorization: synthetic-secret\nCookie: synthetic-secret\nX-Api-Key: synthetic-secret',
			'',
			'synthetic-secret',
			'text'
		);
		for (const target of ['curl', 'fetch', 'java', 'spring'] as const) {
			expect(generateRequest(r, target)).not.toContain('synthetic-secret');
			expect(generateRequest(r, target, true)).toContain('synthetic-secret');
		}
		expect(redactRequest(r).headers.every((h) => h.value === 'REDACTED')).toBe(true);
	});
	it('rejects injection, unsupported requests and malformed JSON without echoing input', () => {
		expect(() => parseHeaderLines('X: a\nnot-a-field')).toThrow(/line 2/);
		expect(() => parseHeaderLines('X: a\rInjected: true')).toThrow(/Malformed/);
		for (const url of [
			'file:///x',
			'https://u:p@example.invalid',
			'https://example.invalid/#fragment'
		])
			expect(() => buildRequest('GET', url, '', '', '', 'none')).toThrow();
		expect(() => buildRequest('GET\nX', 'https://example.invalid', '', '', '', 'none')).toThrow();
		expect(() =>
			buildRequest('POST', 'https://example.invalid', '', '', '{"a":1,}', 'json')
		).toThrow(/strict JSON/);
		expect(() =>
			generateRequest(buildRequest('GET', 'https://example.invalid', '', '', 'x', 'text'), 'fetch')
		).toThrow(/GET\/HEAD/);
		expect(() => importCurl('curl --upload-file secret https://example.invalid')).toThrow(
			/Unsupported/
		);
		expect(() => importCurl('curl https://example.invalid -H "X:"')).toThrow(/removal/);
		expect(() =>
			buildRequest('POST', 'https://example.invalid', '', '', 'x'.repeat(65537), 'text')
		).toThrow(/limit/);
	});
});
describe('HTTP header interpretation', () => {
	it('preserves repetitions/case and explains cache intent without fake guarantees', () => {
		const report = inspectHeaders(
			'HTTP/1.1 200 OK\nCache-Control: public, private, no-store, max-age=600\nETag: W/"a"\nset-cookie: a=secret; Secure; HttpOnly\nSet-Cookie: b=other; SameSite=Lax'
		);
		expect(report.count).toBe(4);
		expect(report.warnings).toHaveLength(2);
		expect(report.headers[1].explanation).toContain('weak');
		expect(report.raw).not.toContain('secret');
		expect(report.raw).not.toContain('other');
		expect(report.headers[2].details).toEqual(['secure', 'httponly']);
	});
	it('parses CSP directive/policy boundaries, quoted commas, duplicates and report-only', () => {
		const report = inspectHeaders(
			"Content-Security-Policy: default-src 'self'; script-src 'none'; script-src https://example.invalid, img-src 'self'\nContent-Security-Policy-Report-Only: default-src 'none'"
		);
		expect(report.headers[0].details).toHaveLength(2);
		expect(report.warnings).toContain(
			'Duplicate CSP directive: the later occurrence in that policy is ignored.'
		);
		expect(report.headers[1].explanation).toContain('does not enforce');
	});
	it('reports contextual CORS and sensitive values, request context and malformed fields', () => {
		const input =
			'access-control-allow-origin: *\nAccess-Control-Allow-Credentials: true\nAuthorization: marker';
		expect(inspectHeaders(input, 'request').warnings[0]).toContain('credentialed');
		expect(JSON.stringify(inspectHeaders(input))).not.toContain('marker');
		expect(inspectHeaders(input, 'request', true).raw).toContain('marker');
		expect(() => inspectHeaders(' folded')).toThrow(/Malformed/);
		expect(() => inspectHeaders('Cache-Control: foo="unterminated')).toThrow(/Unclosed/);
	});
});
