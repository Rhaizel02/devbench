import { parseHeaderLines, sensitiveHeader, type Header } from '../http-request/http-engine';
import { assertTextLimit, ToolError } from '../tool-errors';
function splitQuoted(value: string, separator: string): string[] {
	const parts: string[] = [];
	let part = '',
		quoted = false,
		escaped = false;
	for (const character of value) {
		if (escaped) {
			part += character;
			escaped = false;
			continue;
		}
		if (quoted && character === '\\') {
			part += character;
			escaped = true;
			continue;
		}
		if (character === '"') quoted = !quoted;
		if (character === separator && !quoted) {
			parts.push(part.trim());
			part = '';
		} else part += character;
	}
	if (quoted) throw new ToolError('Unclosed quoted header value.');
	return [...parts, part.trim()].filter(Boolean);
}
export function inspectHeaders(
	input: string,
	context: 'request' | 'response' = 'response',
	reveal = false
) {
	assertTextLimit(input, 65536);
	const lines = input.split(/\r?\n/);
	if (/^(HTTP\/\d(?:\.\d)?\s+\d{3}|[A-Z]+\s+\S+\s+HTTP\/\d)/.test(lines[0] ?? '')) lines.shift();
	const headers = parseHeaderLines(lines.join('\n'));
	const warnings: string[] = [];
	const values = (name: string) =>
		headers.filter((h) => h.name.toLowerCase() === name).map((h) => h.value);
	const parsed = headers.map((header) => {
		const name = header.name.toLowerCase();
		let category = 'Other';
		let explanation = 'Unrecognized field retained as text.';
		let details: unknown = null;
		if (['cache-control', 'etag', 'last-modified', 'expires', 'vary'].includes(name))
			category = 'Caching';
		if (name === 'cache-control') {
			const directives = splitQuoted(header.value, ',').map((part) => {
				const i = part.indexOf('=');
				return {
					name: (i < 0 ? part : part.slice(0, i)).toLowerCase(),
					value: i < 0 ? null : part.slice(i + 1)
				};
			});
			details = directives;
			explanation =
				'no-cache permits storage but requires revalidation; no-store requests no storage. Freshness depends on dates, age and cache context.';
		}
		if (name === 'etag')
			explanation =
				'Opaque cache validator. W/ indicates a weak validator; this does not establish freshness by itself.';
		if (name === 'last-modified')
			explanation =
				'Modification date used for conditional requests; not proof that a resource is fresh.';
		if (name === 'expires')
			explanation =
				'Absolute freshness date; Cache-Control max-age takes precedence when applicable.';
		if (name === 'vary')
			explanation =
				'Caches select variants using these request fields. Vary: * prevents normal reuse.';
		if (['content-type', 'content-encoding'].includes(name)) {
			category = 'Representation';
			explanation =
				name === 'content-type'
					? 'Declared media type and parameters; content is not inspected or verified.'
					: 'Representation coding such as gzip or br; this inspector does not decompress content.';
		}
		if (name.startsWith('access-control-')) {
			category = 'CORS';
			explanation =
				'CORS depends on the requesting origin, method, credentials and preflight. No request has been tested.';
		}
		if (name === 'content-security-policy' || name === 'content-security-policy-report-only') {
			category = 'Security';
			explanation = name.endsWith('report-only')
				? 'Report-only policy: reports violations, does not enforce blocking.'
				: 'Policies are enforced together; each additional policy can restrict further. This is a parser, not a security verdict.';
			details = splitQuoted(header.value, ',').map((policy) => {
				const seen = new Set<string>();
				return splitQuoted(policy, ';').map((directive) => {
					const [directiveName, ...sources] = directive.split(/\s+/);
					const normalized = directiveName.toLowerCase();
					const ignored = seen.has(normalized);
					seen.add(normalized);
					if (!/^[a-z][a-z0-9-]*$/.test(normalized))
						warnings.push('A CSP directive name is malformed.');
					if (ignored)
						warnings.push(
							'Duplicate CSP directive: the later occurrence in that policy is ignored.'
						);
					if (sources.includes("'none'") && sources.length > 1)
						warnings.push('CSP mixes none with other sources; review the effective source list.');
					return { directive: normalized, sources, ignored };
				});
			});
		}
		if (name === 'strict-transport-security') {
			category = 'Security';
			explanation =
				'HSTS is honored over secure transport. max-age controls retention; includeSubDomains and preload have distinct deployment implications.';
			details = splitQuoted(header.value, ';');
		}
		if (name === 'set-cookie') {
			category = 'Cookies';
			explanation =
				'Each Set-Cookie field is separate. Secure restricts transport; HttpOnly restricts script access; SameSite affects cross-site sending, with browser/context-dependent rules.';
			details = splitQuoted(header.value, ';')
				.slice(1)
				.map((attribute) => attribute.split('=')[0].toLowerCase());
		}
		if (name === 'cookie' || name === 'authorization' || name === 'proxy-authorization') {
			category = 'Credentials';
			explanation = 'Sensitive credentials. Hidden by default; no authentication is performed.';
		}
		return {
			name: header.name,
			value: !reveal && sensitiveHeader(name) ? '[REDACTED]' : header.value,
			category,
			explanation,
			details
		};
	});
	const cache = values('cache-control').join(',').toLowerCase();
	const cacheNames = splitQuoted(cache, ',').map((d) => d.split('=')[0]);
	if (cacheNames.includes('public') && cacheNames.includes('private'))
		warnings.push(
			'Cache-Control contains both public and private. Review contradictory cache intent.'
		);
	if (
		cacheNames.includes('no-store') &&
		cacheNames.some((d) => ['public', 'private', 'max-age', 's-maxage'].includes(d))
	)
		warnings.push(
			'no-store makes the additional storage/freshness directives ineffective for normal storage.'
		);
	if (new Set(cacheNames).size !== cacheNames.length)
		warnings.push('Repeated Cache-Control directives: interpretation can vary; review duplicates.');
	if (values('access-control-allow-origin').length > 1)
		warnings.push(
			'Multiple Access-Control-Allow-Origin fields do not represent a valid origin allowlist.'
		);
	if (
		values('access-control-allow-origin').includes('*') &&
		values('access-control-allow-credentials').some((v) => v === 'true')
	)
		warnings.push('Wildcard allow-origin cannot authorize a credentialed browser request.');
	const safeHeaders: Header[] = parsed.map(({ name, value }) => ({ name, value }));
	return {
		context,
		count: headers.length,
		headers: parsed,
		warnings,
		raw: safeHeaders.map((h) => h.name + ': ' + h.value).join('\n')
	};
}
