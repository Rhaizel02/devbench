import { assertTextLimit, ToolError } from '../tool-errors';
import { inspectCurl } from '../curl-inspector/curl-engine';
export type Header = { name: string; value: string };
export type RequestDraft = { method: string; url: string; headers: Header[]; body: string | null };
export type CodeTarget = 'curl' | 'fetch' | 'java' | 'spring';
export const sensitiveHeader = (name: string) =>
	/authorization|cookie|api[-_]?key|token|secret|password|credential/i.test(name);
const token = /^[!#$%&'*+.^_`|~\w-]+$/;
export function parseHeaderLines(input: string): Header[] {
	assertTextLimit(input, 65536);
	const headers: Header[] = [];
	for (const [index, line] of input.split(/\r?\n/).entries()) {
		if (!line.trim()) continue;
		const colon = line.indexOf(':');
		if (
			colon < 1 ||
			!token.test(line.slice(0, colon)) ||
			Array.from(line).some((character) => {
				const code = character.charCodeAt(0);
				return (code < 32 && code !== 9) || code === 127;
			})
		)
			throw new ToolError(
				'Malformed header at line ' +
					(index + 1) +
					'. Use Name: value; folded lines are unsupported.'
			);
		headers.push({ name: line.slice(0, colon), value: line.slice(colon + 1).trim() });
	}
	if (headers.length > 200) throw new ToolError('Maximum 200 headers.');
	return headers;
}
export function buildRequest(
	method: string,
	url: string,
	headerText: string,
	queryText: string,
	body: string,
	bodyMode: 'none' | 'text' | 'json'
): RequestDraft {
	assertTextLimit(url, 8192);
	assertTextLimit(queryText, 32768);
	assertTextLimit(body, 65536);
	if (
		Array.from(url).some(
			(character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127
		)
	)
		throw new ToolError(
			'URL contains whitespace or control characters. Percent-encode them explicitly.'
		);
	if (!token.test(method) || method.length > 32)
		throw new ToolError('Use a valid literal HTTP method (maximum 32 characters).');
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new ToolError('Enter an absolute HTTP(S) URL.');
	}
	if (!['http:', 'https:'].includes(parsed.protocol))
		throw new ToolError('Only HTTP(S) URLs are supported.');
	if (parsed.username || parsed.password)
		throw new ToolError(
			'URL userinfo is unsupported by fetch. Move credentials into an explicit Authorization header.'
		);
	if (parsed.hash)
		throw new ToolError('Remove the URL fragment; fragments are not part of HTTP requests.');
	let target = url;
	const pairs: [string, string][] = [];
	for (const [index, line] of queryText.split(/\r?\n/).entries()) {
		if (!line.trim()) continue;
		const equals = line.indexOf('=');
		if (equals < 0)
			throw new ToolError(
				'Query line ' +
					(index + 1) +
					' needs key=value. Values are literal text, not percent-encoded.'
			);
		pairs.push([line.slice(0, equals), line.slice(equals + 1)]);
	}
	if (pairs.length > 200) throw new ToolError('Maximum 200 added query parameters.');
	if (pairs.length)
		target +=
			(target.includes('?') ? (target.endsWith('?') || target.endsWith('&') ? '' : '&') : '?') +
			new URLSearchParams(pairs).toString();
	const headers = parseHeaderLines(headerText);
	if (bodyMode === 'json') {
		try {
			JSON.parse(body);
		} catch {
			throw new ToolError('Body is not strict JSON. Input has been preserved.');
		}
	}
	return { method, url: target, headers, body: bodyMode === 'none' ? null : body };
}
export function importCurl(input: string): RequestDraft {
	const request = inspectCurl(input, true);
	if (
		request.headers.some(
			(header) => header.action !== 'set' && header.name.toLowerCase() !== 'content-type'
		)
	)
		throw new ToolError(
			'cURL header-removal options cannot be imported into this builder (except Content-Type suppression).'
		);
	return {
		method: request.method,
		url: request.target,
		headers: request.headers
			.filter((header) => header.action === 'set')
			.map(({ name, value }) => ({ name, value })),
		body: request.body
	};
}
export function redactRequest(request: RequestDraft): RequestDraft {
	const url = new URL(request.url);
	url.username = '';
	url.password = '';
	url.hash = '';
	for (const key of [...url.searchParams.keys()])
		if (sensitiveHeader(key)) {
			const values = [...url.searchParams].map(
				([name, value]) => [name, name === key ? 'REDACTED' : value] as [string, string]
			);
			url.search = new URLSearchParams(values).toString();
		}
	return {
		...request,
		url: url.href,
		headers: request.headers.map((h) => ({
			...h,
			value: sensitiveHeader(h.name) ? 'REDACTED' : h.value
		})),
		body: request.body === null ? null : '[REDACTED body]'
	};
}
export const posixQuote = (value: string) => "'" + value.replace(/'/g, () => "'\"'\"'") + "'";
const quote = (value: string) =>
	JSON.stringify(value).replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
const javaQuote = (value: string): string => {
	if (value.length <= 8000) return quote(value);
	const chunks: string[] = [];
	for (let index = 0; index < value.length; index += 4000)
		chunks.push(quote(value.slice(index, index + 4000)));
	return 'String.join("", ' + chunks.join(', ') + ')';
};
export function generateRequest(request: RequestDraft, target: CodeTarget, reveal = false): string {
	const r = reveal ? request : redactRequest(request);
	if (target === 'curl' && r.body?.includes('\0'))
		throw new ToolError('POSIX command arguments cannot contain NUL bytes. Choose another target.');
	if (target === 'curl')
		return [
			'curl --request ' + posixQuote(r.method) + ' --url ' + posixQuote(r.url),
			...r.headers.map((h) => '--header ' + posixQuote(h.name + (h.value ? ': ' + h.value : ';'))),
			...(r.body !== null && !r.headers.some((h) => h.name.toLowerCase() === 'content-type')
				? ["--header 'Content-Type:'"]
				: []),
			...(r.body === null ? [] : ['--data-raw ' + posixQuote(r.body)])
		].join(' \\\n  ');
	if (target === 'fetch') {
		if (r.body !== null && ['GET', 'HEAD'].includes(r.method.toUpperCase()))
			throw new ToolError(
				'Fetch does not support GET/HEAD bodies. Choose cURL/Java or change the request explicitly.'
			);
		return (
			'// Browser fetch: CORS and forbidden-header rules still apply. Repeated fields may be combined.\nconst response = await fetch(' +
			quote(r.url) +
			', {\n  method: ' +
			quote(r.method) +
			',\n  headers: ' +
			JSON.stringify(
				r.headers.map((h) => [h.name, h.value]),
				null,
				2
			) +
			(r.body === null ? '' : ',\n  body: ' + quote(r.body)) +
			'\n});'
		);
	}
	if (target === 'java') {
		if (
			r.headers.some((h) => /^(connection|content-length|expect|host|upgrade)$/i.test(h.name)) ||
			r.method === 'CONNECT'
		)
			throw new ToolError(
				'Java HttpClient restricts CONNECT and some transport headers. Remove these explicitly or choose cURL.'
			);
		return (
			'import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\n\npublic class GeneratedRequest {\n  public static void main(String[] args) {\n    HttpClient client = HttpClient.newHttpClient();\n    HttpRequest request = HttpRequest.newBuilder(URI.create(' +
			javaQuote(r.url) +
			'))\n' +
			r.headers
				.map((h) => '      .header(' + javaQuote(h.name) + ', ' + javaQuote(h.value) + ')\n')
				.join('') +
			'      .method(' +
			quote(r.method) +
			', HttpRequest.BodyPublishers.' +
			(r.body === null ? 'noBody()' : 'ofString(' + javaQuote(r.body) + ')') +
			')\n      .build();\n    // Request constructed only. Send explicitly in your own application.\n  }\n}\n'
		);
	}
	return (
		'// Spring Framework 6.1+ / Spring Boot 3.2+; statements inside your application method.\nimport java.net.URI;\nimport org.springframework.http.HttpMethod;\nimport org.springframework.web.client.RestClient;\n\nRestClient client = RestClient.create();\nvar response = client.method(HttpMethod.valueOf(' +
		quote(r.method) +
		'))\n  .uri(URI.create(' +
		javaQuote(r.url) +
		'))\n  .headers(headers -> {\n' +
		r.headers
			.map((h) => '    headers.add(' + javaQuote(h.name) + ', ' + javaQuote(h.value) + ');\n')
			.join('') +
		'  })\n' +
		(r.body === null ? '' : '  .body(' + javaQuote(r.body) + ')\n') +
		'  .retrieve()\n  .toEntity(String.class);'
	);
}
