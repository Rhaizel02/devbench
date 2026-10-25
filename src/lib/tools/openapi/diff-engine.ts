import {
	OPENAPI_LIMITS,
	type Contract,
	type ContractDiff,
	type ContractChange,
	type ChangeSeverity,
	type JsonValue,
	type JsonObject,
	type MediaType,
	type Operation
} from './model';
import { at, nodeAt, object, resolveReference } from './references';
import { ToolError } from '../tool-errors';
export function stable(value: unknown): string {
	if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
	if (value && typeof value === 'object')
		return (
			'{' +
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => JSON.stringify(k) + ':' + stable(v))
				.join(',') +
			'}'
		);
	return JSON.stringify(value) ?? 'undefined';
}
const documentation = [
	'description',
	'summary',
	'title',
	'deprecated',
	'externalDocs',
	'example',
	'examples'
];
type Direction = 'request' | 'response' | 'shared';
export function compareContracts(before: Contract, after: Contract): ContractDiff {
	const changes: ContractChange[] = [],
		visited = new Set<string>();
	let visits = 0;
	const add = (
		path: string,
		category: ContractChange['category'],
		severity: ChangeSeverity,
		message: string
	) => {
		if (changes.length >= OPENAPI_LIMITS.changes)
			throw new ToolError('Diff exceeds 2,000 changes. Compare smaller contracts.');
		changes.push({ path, category, severity, message });
	};
	const doc = (a: JsonObject, b: JsonObject, path: string) => {
		if (documentation.some((k) => stable(a[k]) !== stable(b[k])))
			add(
				path,
				'documentation',
				'compatible-limited',
				'Documentation/annotations changed; no compatibility assertion is inferred.'
			);
	};
	const directional = (direction: Direction, tightens: boolean): ChangeSeverity =>
		direction === 'shared'
			? 'indeterminate'
			: direction === 'request'
				? tightens
					? 'breaking'
					: 'compatible-limited'
				: tightens
					? 'compatible-limited'
					: 'potential';
	function resolve(
		c: Contract,
		path: string
	): { value: JsonValue | undefined; path: string; uncertain: boolean } {
		const raw = nodeAt(c.root, path),
			o = object(raw);
		if (!o) return { value: raw, path, uncertain: false };
		if (o.$id !== undefined || o.$dynamicRef !== undefined || o.$recursiveRef !== undefined)
			return { value: raw, path, uncertain: true };
		if (typeof o.$ref !== 'string') return { value: raw, path, uncertain: false };
		const r = resolveReference(c.root, o.$ref, path);
		if (r.status !== 'internal' || !r.resolvedTarget)
			return { value: undefined, path, uncertain: true };
		const value = nodeAt(c.root, r.resolvedTarget);
		const siblings = Object.keys(o).some((k) => k !== '$ref' && !documentation.includes(k));
		return { value, path: r.resolvedTarget, uncertain: c.family === '3.1' && siblings };
	}
	function schema(
		ap: string | undefined,
		bp: string | undefined,
		path: string,
		direction: Direction,
		depth = 0
	) {
		if (++visits > 50000 || depth > 128)
			throw new ToolError('Schema comparison visit/depth budget exceeded.');
		if (!ap || !bp) {
			if (ap !== bp)
				add(
					path,
					'schema',
					'indeterminate',
					'Schema declaration added/removed; unspecified constraints cannot prove compatibility.'
				);
			return;
		}
		const key = stable([ap, bp, direction]);
		if (visited.has(key)) return;
		visited.add(key);
		const a = resolve(before, ap),
			b = resolve(after, bp);
		if (a.uncertain || b.uncertain) {
			add(
				path,
				'schema',
				'indeterminate',
				'Reference, URI scope or $ref siblings require manual semantic review.'
			);
			return;
		}
		const targetKey = stable([a.path, b.path, direction]);
		if (targetKey !== key && visited.has(targetKey)) return;
		visited.add(targetKey);
		if (typeof a.value === 'boolean' || typeof b.value === 'boolean') {
			if (stable(a.value) !== stable(b.value))
				add(
					path,
					'schema',
					typeof a.value === 'boolean' && typeof b.value === 'boolean'
						? directional(direction, b.value === false)
						: 'indeterminate',
					'Boolean schema constraints changed.'
				);
			return;
		}
		const av = object(a.value),
			bv = object(b.value);
		if (!av || !bv) {
			add(path, 'schema', 'indeterminate', 'Missing/non-object schema target.');
			return;
		}
		doc(av, bv, path);
		const types = (s: JsonObject, c: Contract) => {
			const list = s.type === undefined ? [] : Array.isArray(s.type) ? s.type : [s.type];
			return [
				...list,
				...(c.family === '3.0' && s.nullable === true && s.type !== undefined ? ['null'] : [])
			]
				.map(String)
				.sort();
		};
		const ta = types(av, before),
			tb = types(bv, after);
		if (stable(ta) !== stable(tb)) {
			const removed = ta.some((t) => !tb.includes(t)),
				added = tb.some((t) => !ta.includes(t));
			add(
				at(path, 'type'),
				'schema',
				!ta.length || !tb.length || (removed && added)
					? 'indeterminate'
					: directional(direction, removed),
				'Accepted/emitted type set changed (including nullable).'
			);
		}
		const enumSet = (s: JsonObject) =>
			Array.isArray(s.enum) ? s.enum.map(stable).sort() : undefined;
		const ea = enumSet(av),
			eb = enumSet(bv);
		if (stable(ea) !== stable(eb)) {
			const removed = ea?.some((v) => !eb?.includes(v)) ?? false,
				added = eb?.some((v) => !ea?.includes(v)) ?? false;
			add(
				at(path, 'enum'),
				'schema',
				ea && eb && removed && added
					? 'indeterminate'
					: directional(direction, eb !== undefined && (ea === undefined || removed)),
				'Enum restriction changed; direction is relative to the request/response consumer.'
			);
		}
		const ra = new Set(Array.isArray(av.required) ? av.required.map(String) : []),
			rb = new Set(Array.isArray(bv.required) ? bv.required.map(String) : []);
		for (const name of new Set([...ra, ...rb]))
			if (ra.has(name) !== rb.has(name))
				add(
					at(at(path, 'required'), name),
					'schema',
					direction === 'response'
						? rb.has(name)
							? 'compatible-limited'
							: 'breaking'
						: directional(direction, rb.has(name)),
					rb.has(name) ? 'Property is now required.' : 'Property is no longer guaranteed/required.'
				);
		const pa = object(av.properties) ?? {},
			pb = object(bv.properties) ?? {};
		for (const name of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
			const p = at(at(path, 'properties'), name);
			if (!Object.hasOwn(pa, name))
				add(
					p,
					'schema',
					direction === 'shared'
						? 'indeterminate'
						: direction === 'request'
							? rb.has(name)
								? 'breaking'
								: 'compatible-limited'
							: 'potential',
					'Property added. Additional-property and client handling still require review.'
				);
			else if (!Object.hasOwn(pb, name))
				add(
					p,
					'schema',
					direction === 'response' && ra.has(name) ? 'breaking' : 'potential',
					'Property removed. Unknown-property handling is not universally inferred.'
				);
			else
				schema(
					at(at(a.path, 'properties'), name),
					at(at(b.path, 'properties'), name),
					p,
					direction,
					depth + 1
				);
		}
		for (const key of [
			'minimum',
			'maximum',
			'minLength',
			'maxLength',
			'minItems',
			'maxItems',
			'minProperties',
			'maxProperties'
		])
			if (stable(av[key]) !== stable(bv[key])) {
				const old = av[key],
					next = bv[key],
					lower = key.startsWith('min');
				const tightening =
					next !== undefined &&
					(old === undefined ||
						(typeof old === 'number' &&
							typeof next === 'number' &&
							(lower ? next > old : next < old)));
				add(
					at(path, key),
					'schema',
					directional(direction, tightening),
					'Numeric/size constraint changed.'
				);
			}
		if (av.items !== undefined || bv.items !== undefined)
			schema(
				av.items !== undefined ? at(a.path, 'items') : undefined,
				bv.items !== undefined ? at(b.path, 'items') : undefined,
				at(path, 'items'),
				direction,
				depth + 1
			);
		const handled = new Set([
			...documentation,
			'$ref',
			'type',
			'nullable',
			'enum',
			'required',
			'properties',
			'minimum',
			'maximum',
			'minLength',
			'maxLength',
			'minItems',
			'maxItems',
			'minProperties',
			'maxProperties',
			'items'
		]);
		for (const key of new Set([...Object.keys(av), ...Object.keys(bv)]))
			if (!handled.has(key) && stable(av[key]) !== stable(bv[key]))
				add(
					at(path, key),
					'schema',
					'indeterminate',
					'Constraint/extension changed; this keyword is not proven compatible by the bounded analyzer.'
				);
	}
	function media(a: MediaType[], b: MediaType[], path: string, direction: Direction) {
		const am = new Map(a.map((v) => [v.name, v])),
			bm = new Map(b.map((v) => [v.name, v]));
		for (const name of new Set([...am.keys(), ...bm.keys()])) {
			const old = am.get(name),
				next = bm.get(name),
				p = at(path, name);
			if (!old)
				add(
					p,
					direction === 'request' ? 'request' : 'response',
					direction === 'request' ? 'compatible-limited' : 'potential',
					'Media type added.'
				);
			else if (!next)
				add(
					p,
					direction === 'request' ? 'request' : 'response',
					'breaking',
					'Previously declared media type removed.'
				);
			else {
				schema(old.schemaPath, next.schemaPath, at(p, 'schema'), direction);
				if (old.encoding !== next.encoding)
					add(p, 'request', 'indeterminate', 'Custom encoding declaration changed.');
			}
		}
	}
	const security = (op: Operation) =>
		stable(
			op.security
				.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [...v].sort()])))
				.map(stable)
				.sort()
		);
	const aops = new Map(before.operations.map((op) => [op.id, op])),
		bops = new Map(after.operations.map((op) => [op.id, op]));
	for (const id of new Set([...aops.keys(), ...bops.keys()])) {
		const a = aops.get(id),
			b = bops.get(id),
			path = at('#/operations', id);
		if (!a) {
			add(path, 'endpoint', 'compatible-limited', 'Operation added.');
			continue;
		}
		if (!b) {
			add(path, 'endpoint', 'breaking', 'Operation removed.');
			continue;
		}
		if (a.unresolved || b.unresolved)
			add(path, 'endpoint', 'indeterminate', 'Operation includes unresolved inputs.');
		if (a.description !== b.description || a.summary !== b.summary || a.deprecated !== b.deprecated)
			add(path, 'documentation', 'compatible-limited', 'Operation documentation changed.');
		if (a.operationId !== b.operationId)
			add(
				path,
				'metadata',
				'potential',
				'operationId changed; generated client method names may change.'
			);
		if (stable(a.servers) !== stable(b.servers))
			add(path, 'metadata', 'potential', 'Effective server declaration changed.');
		if (security(a) !== security(b))
			add(
				at(path, 'security'),
				'security',
				!a.security.length && b.security.length && !b.security.some((r) => !Object.keys(r).length)
					? 'breaking'
					: 'potential',
				'Effective authentication alternatives changed (OR alternatives / AND schemes).'
			);
		const ap = new Map(a.parameters.map((p) => [p.key, p])),
			bp = new Map(b.parameters.map((p) => [p.key, p]));
		for (const key of new Set([...ap.keys(), ...bp.keys()])) {
			const old = ap.get(key),
				next = bp.get(key),
				p = at(at(path, 'parameters'), key);
			if (!old) {
				add(
					p,
					'parameter',
					next!.required ? 'breaking' : 'compatible-limited',
					'Parameter added' + (next!.required ? ' and required.' : '.')
				);
				continue;
			}
			if (!next) {
				add(
					p,
					'parameter',
					'potential',
					'Parameter removed; server handling of previous inputs needs review.'
				);
				continue;
			}
			if (old.required !== next.required)
				add(
					p,
					'parameter',
					next.required ? 'breaking' : 'compatible-limited',
					'Parameter requirement changed.'
				);
			if (
				stable([old.style, old.explode, old.allowReserved]) !==
				stable([next.style, next.explode, next.allowReserved])
			)
				add(p, 'parameter', 'breaking', 'Parameter wire serialization changed.');
			schema(old.schemaPath, next.schemaPath, at(p, 'schema'), 'request');
			media(old.content, next.content, at(p, 'content'), 'request');
			if (old.description !== next.description)
				add(p, 'documentation', 'compatible-limited', 'Parameter documentation changed.');
		}
		if (Boolean(a.requestBody) !== Boolean(b.requestBody))
			add(
				at(path, 'requestBody'),
				'request',
				b.requestBody?.required ? 'breaking' : a.requestBody ? 'potential' : 'compatible-limited',
				'Request body declaration added/removed.'
			);
		if (a.requestBody && b.requestBody) {
			if (a.requestBody.required !== b.requestBody.required)
				add(
					at(path, 'requestBody'),
					'request',
					b.requestBody.required ? 'breaking' : 'compatible-limited',
					'Request body requirement changed.'
				);
			media(a.requestBody.content, b.requestBody.content, at(path, 'requestBody'), 'request');
			if (a.requestBody.unresolved || b.requestBody.unresolved)
				add(path, 'request', 'indeterminate', 'Unresolved request body reference.');
		}
		const ar = new Map(a.responses.map((r) => [r.status, r])),
			br = new Map(b.responses.map((r) => [r.status, r]));
		for (const status of new Set([...ar.keys(), ...br.keys()])) {
			const old = ar.get(status),
				next = br.get(status),
				p = at(at(path, 'responses'), status);
			if (!old) {
				add(p, 'response', 'potential', 'Response status added; clients may need another case.');
				continue;
			}
			if (!next) {
				add(p, 'response', 'breaking', 'Declared response status removed.');
				continue;
			}
			if (old.unresolved || next.unresolved)
				add(p, 'response', 'indeterminate', 'Unresolved response reference.');
			media(old.content, next.content, p, 'response');
			const ah = new Map(old.headers.map((h) => [h.name.toLowerCase(), h])),
				bh = new Map(next.headers.map((h) => [h.name.toLowerCase(), h]));
			for (const name of new Set([...ah.keys(), ...bh.keys()])) {
				const x = ah.get(name),
					y = bh.get(name),
					hp = at(at(p, 'headers'), name);
				if (!x || !y)
					add(
						hp,
						'response',
						x?.required ? 'breaking' : 'potential',
						'Response header declaration added/removed.'
					);
				else {
					if (x.required !== y.required)
						add(
							hp,
							'response',
							y.required ? 'compatible-limited' : 'breaking',
							'Response header guarantee changed.'
						);
					schema(x.schemaPath, y.schemaPath, hp, 'response');
				}
			}
			if (old.description !== next.description)
				add(p, 'documentation', 'compatible-limited', 'Response documentation changed.');
		}
	}
	const as = new Map(before.schemas.map((s) => [s.name, s])),
		bs = new Map(after.schemas.map((s) => [s.name, s]));
	for (const name of new Set([...as.keys(), ...bs.keys()])) {
		const a = as.get(name),
			b = bs.get(name);
		if (a && b) schema(a.path, b.path, at('#/components/schemas', name), 'shared');
		else
			add(
				at('#/components/schemas', name),
				'schema',
				'potential',
				'Named component added/removed; a rename alone does not prove a wire break.'
			);
	}
	if (
		stable(before.securitySchemes.map((s) => [s.name, s.details])) !==
		stable(after.securitySchemes.map((s) => [s.name, s.details]))
	)
		add(
			'#/components/securitySchemes',
			'security',
			'potential',
			'Security scheme declarations changed. Compare transport and scopes manually.'
		);
	if (
		before.openapi !== after.openapi ||
		stable(before.root.jsonSchemaDialect) !== stable(after.root.jsonSchemaDialect)
	)
		add(
			'#/openapi',
			'metadata',
			'indeterminate',
			'OpenAPI version or JSON Schema dialect changed.'
		);
	if (
		before.title !== after.title ||
		before.version !== after.version ||
		before.description !== after.description
	)
		add('#/info', 'documentation', 'compatible-limited', 'Contract metadata changed.');
	if ([...before.references, ...after.references].some((r) => r.status !== 'internal'))
		add(
			'#/references',
			'schema',
			'indeterminate',
			'Unresolved/cyclic bare reference chains prevent complete analysis. External resources were not fetched.'
		);
	const counts: Record<ChangeSeverity, number> = {
		breaking: 0,
		potential: 0,
		'compatible-limited': 0,
		indeterminate: 0
	};
	for (const c of changes) counts[c.severity]++;
	return {
		before: { title: before.title, version: before.version, openapi: before.openapi },
		after: { title: after.title, version: after.version, openapi: after.openapi },
		changes,
		counts,
		limitations: [
			'Directional bounded structural analysis, not a backward-compatibility guarantee.',
			'Unknown keywords, complex composition, dialects and unresolved references require manual review.',
			'No server behavior, runtime payloads or generated clients were executed.'
		]
	};
}
function markdown(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/[\\`*_{}[\]()#+.!|~]/g, '\\$&')
		.replace(/[\r\n]+/g, ' ');
}
export function exportDiff(diff: ContractDiff, format: 'json' | 'markdown'): string {
	if (format === 'json') return JSON.stringify(diff, null, 2);
	return [
		'# Local OpenAPI contract comparison',
		'',
		markdown(diff.before.title) +
			' ' +
			markdown(diff.before.version) +
			' → ' +
			markdown(diff.after.title) +
			' ' +
			markdown(diff.after.version),
		'',
		...diff.limitations.map((v) => '- ' + markdown(v)),
		'',
		'| Severity | Category | Path | Explanation |',
		'| --- | --- | --- | --- |',
		...diff.changes.map(
			(c) => '| ' + [c.severity, c.category, c.path, c.message].map(markdown).join(' | ') + ' |'
		)
	].join('\n');
}
