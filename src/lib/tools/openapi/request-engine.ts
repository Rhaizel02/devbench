import type { Contract, Operation, Parameter, JsonValue } from './model';
import { nodeAt, object, resolveReference } from './references';
import {
	buildRequest,
	redactRequest,
	sensitiveHeader,
	type RequestDraft
} from '../http-request/http-engine';
import { ToolError } from '../tool-errors';
const enc = (v: string) =>
	encodeURIComponent(v).replace(
		/[!'()*]/g,
		(c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
	);
function scalar(v: JsonValue): string {
	if (v === null || typeof v === 'object')
		throw new ToolError(
			'Use non-null scalar parameter members; nested/null serialization is unsupported.'
		);
	return String(v);
}
export function serializeParameter(
	p: Parameter,
	value: JsonValue
): { path?: string; query?: string[]; header?: string; cookie?: string } {
	const name = enc(p.name),
		array = Array.isArray(value),
		record = object(value),
		kind = array ? 'array' : record ? 'object' : 'scalar';
	const members = array
		? value.map(scalar)
		: record
			? Object.entries(record).flatMap(([k, v]) => [k, scalar(v)])
			: [scalar(value)];
	const encoded = members.map(enc),
		pairs = record ? Object.entries(record).map(([k, v]) => [enc(k), enc(scalar(v))]) : [];
	if (p.allowReserved)
		throw new ToolError('allowReserved: true is not supported. Review encoding before transfer.');
	if (p.in === 'path') {
		if (!['simple', 'label', 'matrix'].includes(p.style))
			throw new ToolError('Unsupported path serialization style.');
		const joined =
			kind === 'object' && p.explode
				? pairs.map(([k, v]) => k + '=' + v).join(p.style === 'label' ? '.' : ',')
				: encoded.join(p.style === 'label' && p.explode ? '.' : ',');
		if (p.style === 'simple') return { path: joined };
		if (p.style === 'label') return { path: '.' + joined };
		return {
			path:
				p.explode && kind === 'array'
					? encoded.map((v) => ';' + name + '=' + v).join('')
					: p.explode && kind === 'object'
						? pairs.map(([k, v]) => ';' + k + '=' + v).join('')
						: ';' + name + '=' + encoded.join(',')
		};
	}
	if (p.in === 'header') {
		if (p.style !== 'simple' || members.some((v) => /[\r\n,=]/.test(v)))
			throw new ToolError(
				'Header simple style requires members without CR/LF, commas or equals signs.'
			);
		return {
			header:
				record && p.explode
					? Object.entries(record)
							.map(([k, v]) => k + '=' + scalar(v))
							.join(',')
					: members.join(',')
		};
	}
	if (p.in === 'cookie') {
		if (p.style !== 'form' || kind !== 'scalar')
			throw new ToolError('Cookie generation supports scalar form parameters only.');
		return { cookie: name + '=' + encoded[0] };
	}
	if (p.style === 'form')
		return {
			query: array
				? p.explode
					? encoded.map((v) => name + '=' + v)
					: [name + '=' + encoded.join(',')]
				: record
					? p.explode
						? pairs.map(([k, v]) => k + '=' + v)
						: [name + '=' + encoded.join(',')]
					: [name + '=' + encoded[0]]
		};
	if (['spaceDelimited', 'pipeDelimited'].includes(p.style) && array && !p.explode)
		return { query: [name + '=' + encoded.join(p.style === 'spaceDelimited' ? '%20' : '%7C')] };
	if (p.style === 'deepObject' && record && p.explode)
		return { query: pairs.map(([k, v]) => name + '%5B' + k + '%5D=' + v) };
	throw new ToolError(
		'Unsupported query style/explode/value combination; no request was generated.'
	);
}
export function credentialNames(c: Contract, op: Operation): string[] {
	return c.securitySchemes
		.filter((s) => op.security.some((r) => Object.hasOwn(r, s.name)) && s.type === 'apiKey')
		.flatMap((s) => (s.parameterName ? [s.parameterName] : []));
}
export function isCredential(c: Contract, op: Operation, name: string) {
	return (
		sensitiveHeader(name) ||
		credentialNames(c, op).some((n) => n.toLowerCase() === name.toLowerCase())
	);
}
function scrub(value: JsonValue, names: string[]): JsonValue {
	if (Array.isArray(value)) return value.map((v) => scrub(v, names));
	const o = object(value);
	if (!o) return value;
	return Object.fromEntries(
		Object.entries(o).map(([k, v]) => [
			k,
			sensitiveHeader(k) || names.includes(k.toLowerCase()) ? 'REDACTED' : scrub(v, names)
		])
	);
}
export function schemaSample(
	c: Contract,
	path: string,
	warnings: string[],
	seen = new Set<string>(),
	depth = 0
): JsonValue {
	if (depth > 8 || seen.size > 100) {
		warnings.push('Sample truncated at recursion/size budget.');
		return null;
	}
	if (seen.has(path)) {
		warnings.push('Recursive schema sample stopped; not a validated instance.');
		return null;
	}
	seen = new Set([...seen, path]);
	const raw = nodeAt(c.root, path),
		s = object(raw);
	if (!s) {
		warnings.push('Boolean/unknown schema has no inferred sample.');
		return null;
	}
	if (typeof s.$ref === 'string') {
		const ref = resolveReference(c.root, s.$ref, path);
		if (ref.status !== 'internal' || !ref.resolvedTarget) {
			warnings.push('Unresolved reference; supply a value manually.');
			return null;
		}
		if (c.family === '3.1' && Object.keys(s).some((k) => k !== '$ref' && k !== 'description'))
			warnings.push('Reference siblings need manual review; sample is illustrative.');
		return schemaSample(c, ref.resolvedTarget, warnings, seen, depth + 1);
	}
	if (s.$id !== undefined || s.$dynamicRef !== undefined) {
		warnings.push('URI scopes/dynamic references need a manual sample.');
		return null;
	}
	if (s.example !== undefined) return s.example;
	if (s.default !== undefined) return s.default;
	if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
	if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
	if (s.allOf || s.oneOf || s.anyOf) {
		warnings.push('Composition requires a manual sample.');
		return null;
	}
	const type = Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type;
	if (type === 'object' || s.properties) {
		const props = object(s.properties) ?? {};
		const entries = Object.entries(props)
			.slice(0, 30)
			.filter(([, v]) => object(v)?.readOnly !== true)
			.map(([key]) => [
				key,
				sensitiveHeader(key)
					? 'REDACTED'
					: schemaSample(
							c,
							path +
								'/properties/' +
								encodeURIComponent(key.replace(/~/g, '~0').replace(/\//g, '~1')),
							warnings,
							seen,
							depth + 1
						)
			]);
		return Object.fromEntries(entries);
	}
	if (type === 'array' && s.items !== undefined)
		return [schemaSample(c, path + '/items', warnings, seen, depth + 1)];
	if (type === 'integer' || type === 'number') return typeof s.minimum === 'number' ? s.minimum : 1;
	if (type === 'boolean') return true;
	if (type === 'null') return null;
	return 'synthetic-value';
}
export type RequestOptions = {
	server: number;
	variables: Record<string, string>;
	base: string;
	values: Record<string, string>;
	media: string;
	body: string;
};
export function requestDefaults(
	c: Contract,
	op: Operation
): { options: RequestOptions; warnings: string[] } {
	const warnings = ['Samples are illustrative local data, not schema-validated instances.'];
	const values: Record<string, string> = {};
	for (const p of op.parameters) {
		if (isCredential(c, op, p.name)) {
			values[p.key] = '';
			warnings.push('Credential parameter ' + p.name + ' was not populated.');
			continue;
		}
		const explicit = p.examples.find((e) => e.value !== undefined);
		const v = explicit
			? explicit.value!
			: p.schemaPath
				? schemaSample(c, p.schemaPath, warnings)
				: 'synthetic-value';
		values[p.key] = JSON.stringify(
			scrub(
				v,
				credentialNames(c, op).map((n) => n.toLowerCase())
			)
		);
	}
	const media =
		op.requestBody?.content.find((m) => /json$|\+json$/.test(m.name)) ?? op.requestBody?.content[0];
	const explicit = media?.examples.find((e) => e.value !== undefined);
	const v =
		explicit?.value ??
		(media?.schemaPath ? schemaSample(c, media.schemaPath, warnings) : undefined);
	return {
		options: {
			server: 0,
			variables: Object.fromEntries(
				Object.entries(op.servers[0]?.variables ?? {}).map(([k, v]) => [k, v.default])
			),
			base: 'https://api.example.test',
			values,
			media: media?.name ?? '',
			body:
				v === undefined
					? ''
					: media?.name.startsWith('text/') && typeof v === 'string'
						? v
						: JSON.stringify(
								scrub(
									v,
									credentialNames(c, op).map((n) => n.toLowerCase())
								),
								null,
								2
							)
		},
		warnings
	};
}
export function prepareRequest(c: Contract, op: Operation, o: RequestOptions): RequestDraft {
	if (op.unresolved)
		throw new ToolError('Unresolved operation inputs prevent safe request preparation.');
	let server = op.servers[o.server]?.url ?? '/';
	const definition = op.servers[o.server];
	server = server.replace(/\{([^{}]+)\}/g, (_, key: string) => {
		const v = o.variables[key] ?? definition?.variables[key]?.default;
		if (v === undefined) throw new ToolError('Missing server variable.');
		const choices = definition?.variables[key]?.enum;
		if (choices && !choices.includes(v))
			throw new ToolError('Server variable must match its enum.');
		if (/[\s?#@{}]/.test(v))
			throw new ToolError('Server variable contains unsupported delimiters.');
		return v;
	});
	let base: URL;
	try {
		base = new URL(server, o.base);
	} catch {
		throw new ToolError('Enter a valid absolute HTTP(S) base for relative servers.');
	}
	if (
		base.search ||
		base.hash ||
		base.username ||
		base.password ||
		!['http:', 'https:'].includes(base.protocol)
	)
		throw new ToolError('Server must use HTTP(S), with no query, fragment or userinfo.');
	let route = op.route;
	const queries: string[] = [],
		headers: { name: string; value: string }[] = [],
		cookies: string[] = [];
	for (const p of op.parameters) {
		const text = o.values[p.key] ?? '';
		if (!text.trim()) {
			if (p.required) throw new ToolError('Provide required parameter: ' + p.name);
			continue;
		}
		let value: JsonValue;
		try {
			value = JSON.parse(text);
		} catch {
			throw new ToolError('Parameter ' + p.name + ' must be JSON (quote strings).');
		}
		let parameter = p;
		if (p.content.length) {
			if (p.content.length !== 1 || !/^application\/(?:[\w.-]+\+)?json$/.test(p.content[0].name))
				throw new ToolError('Parameter content supports JSON only.');
			value = JSON.stringify(value);
			parameter = { ...p, style: p.in === 'path' || p.in === 'header' ? 'simple' : 'form' };
		}
		const result = serializeParameter(parameter, value);
		if (result.path !== undefined) route = route.split('{' + p.name + '}').join(result.path);
		queries.push(...(result.query ?? []));
		if (result.header !== undefined) headers.push({ name: p.name, value: result.header });
		if (result.cookie !== undefined) cookies.push(result.cookie);
	}
	if (/[{}]/.test(route)) throw new ToolError('Unresolved path parameter.');
	if (cookies.length) headers.push({ name: 'Cookie', value: cookies.join('; ') });
	let body: string | null = null;
	if (o.media) {
		const media = op.requestBody?.content.find((m) => m.name === o.media);
		if (!media || media.encoding)
			throw new ToolError(
				'Unknown media type or custom body encoding; supply through HTTP Builder manually.'
			);
		const json = /^application\/(?:[\w.-]+\+)?json$/.test(media.name);
		if (!json && !media.name.startsWith('text/'))
			throw new ToolError(
				'Only JSON/text request bodies are supported. Multipart/binary bodies require manual preparation.'
			);
		if (o.body.trim()) {
			body = o.body;
			if (json) {
				try {
					JSON.parse(body);
				} catch {
					throw new ToolError('Request body must be strict JSON.');
				}
			}
			headers.push({ name: 'Content-Type', value: media.name });
		} else if (op.requestBody?.required) throw new ToolError('Required request body is empty.');
	} else if (op.requestBody?.required)
		throw new ToolError('Select a required request body media type.');
	return buildRequest(
		op.method.toUpperCase(),
		base.href.replace(/\/$/, '') + route + (queries.length ? '?' + queries.join('&') : ''),
		headers.map((h) => h.name + ': ' + h.value).join('\n'),
		'',
		body ?? '',
		body === null ? 'none' : 'text'
	);
}
export function redactContractRequest(
	c: Contract,
	op: Operation,
	request: RequestDraft
): RequestDraft {
	const safe = redactRequest(request),
		names = credentialNames(c, op).map((n) => n.toLowerCase()),
		url = new URL(safe.url);
	for (const key of [...url.searchParams.keys()])
		if (names.includes(key.toLowerCase())) url.searchParams.set(key, 'REDACTED');
	return {
		...safe,
		url: url.href,
		headers: safe.headers.map((h) => ({
			...h,
			value: names.includes(h.name.toLowerCase()) ? 'REDACTED' : h.value
		}))
	};
}
