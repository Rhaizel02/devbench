import { validateJson } from '../json-studio/json-engine';
import { yamlToJson } from '../json-yaml/yaml-engine';
import { assertTextLimit, ToolError } from '../tool-errors';
import { at, nodeAt, object, resolveReference, scanReferences } from './references';
import {
	HTTP_METHODS,
	OPENAPI_LIMITS as L,
	type Contract,
	type JsonValue,
	type JsonObject,
	type InputFormat,
	type Issue,
	type Server,
	type Parameter,
	type Example,
	type MediaType,
	type Response,
	type ResponseHeader,
	type RequestBody,
	type Operation,
	type SecurityRequirement,
	type SecurityScheme
} from './model';
const fail = (path: string, message: string): never => {
	throw new ToolError(path + ': ' + message);
};
function record(value: JsonValue | undefined, path: string): JsonObject {
	return object(value) ?? fail(path, 'Expected an object.');
}
function text(value: JsonValue | undefined, path: string, fallback = ''): string {
	if (value === undefined) return fallback;
	if (typeof value !== 'string') return fail(path, 'Expected text.');
	return value;
}
function flag(value: JsonValue | undefined, path: string, fallback = false): boolean {
	if (value === undefined) return fallback;
	if (typeof value !== 'boolean') return fail(path, 'Expected a boolean.');
	return value;
}
function list(value: JsonValue | undefined, path: string, max = 200): JsonValue[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > max)
		return fail(path, `Expected an array of at most ${max} items.`);
	return value;
}
function stringList(value: JsonValue | undefined, path: string, max = 200): string[] {
	return list(value, path, max).map((v, i) => text(v, at(path, i)));
}
function boundedShape(root: JsonValue): number {
	const stack = [{ value: root, depth: 0, path: '#' }];
	let nodes = 0;
	while (stack.length) {
		const { value, depth, path } = stack.pop()!;
		if (++nodes > L.nodes || depth > L.depth)
			fail(path, 'Document exceeds 100,000 nodes or 64 levels.');
		if (typeof value === 'string' && value.length > L.string)
			fail(path, 'Text value exceeds 256 KiB characters.');
		if (typeof value === 'number' && !Number.isFinite(value))
			fail(path, 'Number is outside the finite JavaScript range.');
		if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value))
			fail(
				path,
				'Integer exceeds JavaScript safe precision; represent large identifiers as strings.'
			);
		if (value && typeof value === 'object')
			for (const [key, child] of Object.entries(value)) {
				if (key.length > 8192) fail(path, 'Field name exceeds 8 KiB characters.');
				stack.push({ value: child, depth: depth + 1, path: at(path, key) });
			}
	}
	return nodes;
}
function inputValue(
	input: string,
	format: InputFormat
): { value: JsonValue; format: 'json' | 'yaml' } {
	assertTextLimit(input, L.bytes);
	if (!input.trim()) throw new ToolError('Paste or import an OpenAPI contract first.');
	if (format !== 'yaml') {
		const parsed = validateJson(input);
		if (parsed.status === 'valid') return { value: parsed.value, format: 'json' };
		if (format === 'json')
			throw new ToolError(
				parsed.status === 'invalid'
					? parsed.message + (parsed.line ? ` Line ${parsed.line}, column ${parsed.column}.` : '')
					: 'Enter JSON.'
			);
	}
	return { value: JSON.parse(yamlToJson(input, L.bytes, 0)) as JsonValue, format: 'yaml' };
}
export function parseContract(input: string, format: InputFormat = 'auto'): Contract {
	const parsed = inputValue(input, format),
		nodes = boundedShape(parsed.value),
		root = record(parsed.value, '#');
	if (root.swagger !== undefined)
		fail('#/swagger', 'Swagger 2.0 is unsupported. Use OpenAPI 3.0.x or 3.1.x.');
	const openapi = text(root.openapi, '#/openapi');
	if (!/^3\.(0|1)\.\d+$/.test(openapi))
		fail(
			'#/openapi',
			'Supported versions: OpenAPI 3.0.x and 3.1.x. OpenAPI 3.2 and other versions are unsupported.'
		);
	const family = openapi.startsWith('3.0.') ? '3.0' : '3.1',
		info = record(root.info, '#/info');
	const title = text(info.title, '#/info/title'),
		version = text(info.version, '#/info/version');
	if (!title.trim() || !version.trim())
		fail('#/info', 'info.title and info.version must be nonempty text.');
	const issues: Issue[] = [],
		schemaRoots = new Set<string>();
	const issue = (path: string, message: string, severity: Issue['severity'] = 'warning') => {
		if (issues.length < L.issues) issues.push({ path, message, severity });
	};
	const references = scanReferences(root);
	for (const ref of references)
		if (ref.status !== 'internal')
			issue(
				at(ref.path, '$ref'),
				ref.message ?? 'Reference not resolved.',
				ref.status === 'missing' ? 'error' : 'warning'
			);
	const resolved = (
		raw: JsonValue | undefined,
		path: string
	): { value: JsonObject; path: string } | undefined => {
		const original = record(raw, path);
		if (original.$ref === undefined) return { value: original, path };
		if (typeof original.$ref !== 'string') return fail(at(path, '$ref'), 'Reference must be text.');
		const ref = resolveReference(root, original.$ref, path);
		if (ref.status !== 'internal' || !ref.resolvedTarget) {
			issue(path, 'Unresolved object reference: ' + (ref.message ?? ref.status));
			return undefined;
		}
		const target = object(nodeAt(root, ref.resolvedTarget));
		if (!target) {
			issue(path, 'Object reference points to a scalar/array.', 'error');
			return undefined;
		}
		let value = target;
		// Reference Object siblings: 3.0 ignored; 3.1 summary/description may override.
		if (family === '3.1')
			for (const p of [...(ref.chain ?? []).slice(0, -1).reverse(), path]) {
				const source = object(nodeAt(root, p));
				if (!source) continue;
				value = {
					...value,
					...(typeof source.summary === 'string' ? { summary: source.summary } : {}),
					...(typeof source.description === 'string' ? { description: source.description } : {})
				};
			}
		if (family === '3.0' && Object.keys(original).some((k) => k !== '$ref' && !k.startsWith('x-')))
			issue(path, 'OpenAPI 3.0 Reference Object siblings are ignored.');
		return { value, path: ref.resolvedTarget };
	};
	function servers(raw: JsonValue | undefined, path: string): Server[] {
		return list(raw, path, 100).map((item, i) => {
			const p = at(path, i),
				s = record(item, p),
				url = text(s.url, at(p, 'url'));
			if (!url) fail(p, 'Server URL is required.');
			const vars = s.variables === undefined ? {} : record(s.variables, at(p, 'variables'));
			return {
				url,
				description: text(s.description, at(p, 'description')),
				variables: Object.fromEntries(
					Object.entries(vars).map(([name, raw]) => {
						const v = record(raw, at(at(p, 'variables'), name)),
							value = text(v.default, p);
						if (v.default === undefined) fail(p, 'Server variables require a string default.');
						const values = v.enum === undefined ? undefined : stringList(v.enum, p, 1000);
						if (values && (!values.length || !values.includes(value)))
							fail(p, 'Server variable default must occur in its nonempty enum.');
						return [
							name,
							{
								default: value,
								description: text(v.description, p),
								...(values ? { enum: values } : {})
							}
						];
					})
				)
			};
		});
	}
	function security(raw: JsonValue | undefined, path: string): SecurityRequirement[] {
		return list(raw, path, 100).map((entry, i) =>
			Object.fromEntries(
				Object.entries(record(entry, at(path, i))).map(([key, value]) => [
					key,
					stringList(value, at(at(path, i), key), 100)
				])
			)
		);
	}
	function examples(source: JsonObject, path: string, schemaPath?: string): Example[] {
		if (source.example !== undefined)
			return [{ name: 'example', source: 'example', value: source.example }];
		if (source.examples !== undefined) {
			return Object.entries(record(source.examples, at(path, 'examples')))
				.slice(0, 50)
				.map(([name, raw]) => {
					const target = resolved(raw, at(at(path, 'examples'), name));
					if (!target)
						return { name, source: 'example', unavailable: 'Unresolved example reference.' };
					return target.value.value !== undefined
						? { name, source: 'example', value: target.value.value }
						: { name, source: 'example', unavailable: 'External/empty example is not fetched.' };
				});
		}
		const schema = schemaPath ? object(nodeAt(root, schemaPath)) : undefined;
		if (schema?.example !== undefined)
			return [{ name: 'schema example', source: 'example', value: schema.example }];
		if (schema?.default !== undefined)
			return [{ name: 'default', source: 'default', value: schema.default }];
		return [];
	}
	function schemaPath(source: JsonObject, path: string): string | undefined {
		if (source.schema === undefined) return undefined;
		const p = at(path, 'schema');
		schemaRoots.add(p);
		return p;
	}
	function content(raw: JsonValue | undefined, path: string): MediaType[] {
		if (raw === undefined) return [];
		return Object.entries(record(raw, path)).map(([name, value]) => {
			const p = at(path, name),
				media = record(value, p),
				schema = schemaPath(media, p);
			return {
				name,
				path: p,
				schemaPath: schema,
				examples: examples(media, p, schema),
				encoding: media.encoding !== undefined
			};
		});
	}
	function parameters(
		raw: JsonValue | undefined,
		path: string
	): { values: Parameter[]; unresolved: boolean } {
		let unresolved = false;
		const keys = new Set<string>(),
			values: Parameter[] = [];
		for (const [i, item] of list(raw, path).entries()) {
			const target = resolved(item, at(path, i));
			if (!target) {
				unresolved = true;
				continue;
			}
			const p = target.path,
				value = target.value,
				name = text(value.name, at(p, 'name')),
				location = text(value.in, at(p, 'in'));
			if (!name || !['path', 'query', 'header', 'cookie'].includes(location))
				fail(p, 'Parameter requires a name and path/query/header/cookie location.');
			const key = JSON.stringify([location, name]);
			if (keys.has(key)) fail(path, 'Duplicate parameter name/location.');
			keys.add(key);
			const required = flag(value.required, at(p, 'required'));
			if (location === 'path' && !required) fail(p, 'Path parameters must declare required: true.');
			if (location === 'header' && /^(accept|content-type|authorization)$/i.test(name)) {
				issue(p, 'Reserved header parameter is ignored by OpenAPI; use media types/security.');
				continue;
			}
			const schema = schemaPath(value, p),
				media = content(value.content, at(p, 'content'));
			if ((schema === undefined) === !media.length)
				fail(p, 'Parameter must have exactly one of schema or content.');
			if (media.length > 1) fail(p, 'Parameter content must have exactly one media type.');
			const style = text(
				value.style,
				at(p, 'style'),
				location === 'path' || location === 'header' ? 'simple' : 'form'
			);
			values.push({
				key,
				path: p,
				name,
				in: location as Parameter['in'],
				description: text(value.description, at(p, 'description')),
				required,
				deprecated: flag(value.deprecated, p),
				style,
				explode: flag(value.explode, p, style === 'form'),
				allowReserved: flag(value.allowReserved, p),
				schemaPath: schema,
				examples: examples(value, p, schema),
				content: media
			});
		}
		return { values, unresolved };
	}
	function headers(raw: JsonValue | undefined, path: string): ResponseHeader[] {
		if (raw === undefined) return [];
		return Object.entries(record(raw, path)).flatMap<ResponseHeader>(([name, item]) => {
			if (name.toLowerCase() === 'content-type') {
				issue(path, 'Response Content-Type header is described by content and ignored here.');
				return [];
			}
			const target = resolved(item, at(path, name));
			if (!target)
				return [
					{
						name,
						path: at(path, name),
						description: 'Unresolved header reference.',
						required: false,
						examples: []
					}
				];
			const value = target.value,
				p = target.path,
				schema = schemaPath(value, p);
			return [
				{
					name,
					path: p,
					description: text(value.description, p),
					required: flag(value.required, p),
					schemaPath: schema,
					examples: examples(value, p, schema)
				}
			];
		});
	}
	function responses(raw: JsonValue | undefined, path: string): Response[] {
		if (raw === undefined) {
			if (family === '3.0') fail(path, 'OpenAPI 3.0 operations require responses.');
			issue(
				path,
				'No responses declared. OpenAPI 3.1 permits this, but response analysis is incomplete.'
			);
			return [];
		}
		const entries = Object.entries(record(raw, path)).filter(([key]) => !key.startsWith('x-'));
		if (!entries.length) fail(path, 'A present responses object needs at least one response.');
		return entries.map(([status, item]) => {
			if (!/^(default|[1-5](\d\d|XX))$/.test(status))
				fail(at(path, status), 'Use an HTTP response code, uppercase range (2XX) or default.');
			const target = resolved(item, at(path, status));
			if (!target)
				return {
					status,
					path: at(path, status),
					description: 'Unresolved response reference.',
					content: [],
					headers: [],
					unresolved: 'Response reference cannot be resolved locally.'
				};
			const value = target.value,
				p = target.path;
			if (value.description === undefined)
				fail(at(p, 'description'), 'Response description is required.');
			return {
				status,
				path: p,
				description: text(value.description, at(p, 'description')),
				content: content(value.content, at(p, 'content')),
				headers: headers(value.headers, at(p, 'headers'))
			};
		});
	}
	function body(raw: JsonValue | undefined, path: string): RequestBody | undefined {
		if (raw === undefined) return undefined;
		const target = resolved(raw, path);
		if (!target)
			return {
				path,
				required: false,
				description: 'Unresolved request body.',
				content: [],
				unresolved: 'Request body reference cannot be resolved locally.'
			};
		if (target.value.content === undefined) fail(path, 'Request body content is required.');
		return {
			path: target.path,
			description: text(target.value.description, path),
			required: flag(target.value.required, path),
			content: content(target.value.content, at(target.path, 'content'))
		};
	}
	const components = root.components === undefined ? {} : record(root.components, '#/components'),
		schemaMap =
			components.schemas === undefined ? {} : record(components.schemas, '#/components/schemas');
	const schemas = Object.keys(schemaMap).map((name) => ({
		name,
		path: at('#/components/schemas', name)
	}));
	for (const schema of schemas) schemaRoots.add(schema.path);
	const schemeMap =
		components.securitySchemes === undefined
			? {}
			: record(components.securitySchemes, '#/components/securitySchemes');
	const securitySchemes: SecurityScheme[] = Object.entries(schemeMap).flatMap(([name, raw]) => {
		const target = resolved(raw, at('#/components/securitySchemes', name));
		if (!target)
			return [
				{ name, type: 'unresolved', description: 'Unresolved security scheme.', details: {} }
			];
		const s = target.value,
			type = text(s.type, target.path);
		if (!['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'].includes(type))
			fail(target.path, 'Unknown security scheme type.');
		if (type === 'mutualTLS' && family === '3.0')
			fail(target.path, 'mutualTLS security requires OpenAPI 3.1.');
		if (
			type === 'apiKey' &&
			(!['query', 'header', 'cookie'].includes(String(s.in)) ||
				typeof s.name !== 'string' ||
				!s.name)
		)
			fail(target.path, 'API key schemes require a name and query/header/cookie location.');
		return [
			{
				name,
				type,
				description: text(s.description, target.path),
				in: typeof s.in === 'string' ? s.in : undefined,
				parameterName: typeof s.name === 'string' ? s.name : undefined,
				scheme: typeof s.scheme === 'string' ? s.scheme : undefined,
				bearerFormat: typeof s.bearerFormat === 'string' ? s.bearerFormat : undefined,
				details: s
			}
		];
	});
	const rootServers = servers(root.servers, '#/servers'),
		rootSecurity = security(root.security, '#/security');
	const tags = list(root.tags, '#/tags', 1000).map((raw, i) => {
		const v = record(raw, at('#/tags', i));
		const name = text(v.name, '#/tags');
		if (!name) fail('#/tags', 'Tag name is required.');
		return { name, description: text(v.description, '#/tags') };
	});
	if (family === '3.0' && root.paths === undefined)
		fail('#/paths', 'OpenAPI 3.0 requires paths (an empty object is allowed).');
	if (
		family === '3.1' &&
		root.paths === undefined &&
		root.components === undefined &&
		root.webhooks === undefined
	)
		fail('#', 'OpenAPI 3.1 needs paths, components or webhooks.');
	const paths = root.paths === undefined ? {} : record(root.paths, '#/paths'),
		operations: Operation[] = [],
		operationIds = new Set<string>();
	for (const [route, raw] of Object.entries(paths)) {
		if (route.startsWith('x-')) continue;
		if (!route.startsWith('/') || /[\s?#]/.test(route) || route.length > 2048)
			fail(
				at('#/paths', route),
				'Path keys must begin with /, omit query/fragment/whitespace and fit 2,048 characters.'
			);
		const target = resolved(raw, at('#/paths', route));
		if (!target) continue;
		const item = target.value,
			p = target.path;
		const parentParams = parameters(item.parameters, at(p, 'parameters')),
			pathServers =
				item.servers === undefined ? undefined : servers(item.servers, at(p, 'servers'));
		for (const key of Object.keys(item))
			if (
				![...HTTP_METHODS, '$ref', 'summary', 'description', 'servers', 'parameters'].includes(
					key
				) &&
				!key.startsWith('x-')
			)
				issue(at(p, key), 'Unrecognized Path Item field; HTTP methods must be lowercase.');
		for (const method of HTTP_METHODS) {
			if (item[method] === undefined) continue;
			if (operations.length >= L.operations) fail('#/paths', 'Operation limit: 2,000.');
			const opPath = at(p, method),
				op = record(item[method], opPath),
				specific = parameters(op.parameters, at(opPath, 'parameters'));
			const combined = [
					...new Map(
						[...parentParams.values, ...specific.values].map((param) => [param.key, param])
					).values()
				],
				operationId = text(op.operationId, at(opPath, 'operationId'));
			if (operationId) {
				if (operationIds.has(operationId)) fail(opPath, 'operationId must be unique.');
				operationIds.add(operationId);
			}
			const unresolved = parentParams.unresolved || specific.unresolved;
			if (!unresolved) {
				const placeholders = [...route.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]);
				if (/[{}]/.test(route.replace(/\{[^{}]+\}/g, '')))
					fail(opPath, 'Unbalanced path template.');
				if (placeholders.some((name) => !combined.some((v) => v.in === 'path' && v.name === name)))
					fail(opPath, 'Every path template needs a declared required path parameter.');
				if (combined.some((v) => v.in === 'path' && !placeholders.includes(v.name)))
					fail(opPath, 'Path parameter is absent from the path template.');
			}
			const requestBody = body(op.requestBody, at(opPath, 'requestBody'));
			operations.push({
				id: method.toUpperCase() + ' ' + route,
				pointer: opPath,
				method,
				route,
				operationId,
				summary: text(op.summary, opPath),
				description: text(op.description, opPath),
				deprecated: flag(op.deprecated, opPath),
				tags: stringList(op.tags, opPath),
				parameters: combined,
				requestBody,
				responses: responses(op.responses, at(opPath, 'responses')),
				servers:
					op.servers !== undefined
						? servers(op.servers, at(opPath, 'servers'))
						: (pathServers ?? rootServers),
				serverSource:
					op.servers !== undefined
						? 'operation'
						: pathServers !== undefined
							? 'path'
							: root.servers !== undefined
								? 'root'
								: 'default',
				security:
					op.security === undefined ? rootSecurity : security(op.security, at(opPath, 'security')),
				securitySource:
					op.security !== undefined ? 'operation' : root.security !== undefined ? 'root' : 'none',
				unresolved: unresolved || Boolean(requestBody?.unresolved)
			});
		}
	}
	for (const category of ['parameters', 'requestBodies', 'responses', 'headers'])
		for (const [name, raw] of Object.entries(
			components[category] === undefined
				? {}
				: record(components[category], at('#/components', category))
		)) {
			const target = resolved(raw, at(at('#/components', category), name));
			if (!target) continue;
			schemaPath(target.value, target.path);
			content(target.value.content, at(target.path, 'content'));
			if (category === 'responses') headers(target.value.headers, at(target.path, 'headers'));
		}
	validateSchemas(root, schemaRoots, family, issue);
	if (root.webhooks !== undefined)
		issue(
			'#/webhooks',
			'Webhooks remain in the source/ref graph; the operation explorer lists outgoing paths only.'
		);
	if (operations.some((op) => object(nodeAt(root, op.pointer))?.callbacks !== undefined))
		issue(
			'#/paths',
			'Callbacks remain in the source/ref graph and are not expanded into outgoing operations.'
		);
	if (
		root.jsonSchemaDialect !== undefined &&
		root.jsonSchemaDialect !== 'https://spec.openapis.org/oas/3.1/dialect/base' &&
		root.jsonSchemaDialect !== 'https://json-schema.org/draft/2020-12/schema'
	)
		issue(
			'#/jsonSchemaDialect',
			'Custom JSON Schema dialect is visible, not interpreted or downloaded.'
		);
	for (const op of operations)
		for (const requirement of op.security)
			for (const scheme of Object.keys(requirement))
				if (!securitySchemes.some((s) => s.name === scheme))
					issue(op.pointer, 'Security requirement names an undeclared scheme.');
	return {
		format: parsed.format,
		openapi,
		family,
		title,
		version,
		description: text(info.description, '#/info/description'),
		root,
		servers: rootServers,
		tags,
		operations,
		schemas,
		securitySchemes,
		references,
		issues,
		statistics: {
			bytes: new TextEncoder().encode(input).length,
			nodes,
			operations: operations.length,
			schemas: schemas.length,
			references: references.length,
			externalReferences: references.filter((r) => r.status === 'external').length
		}
	};
}

function validateSchemas(
	root: JsonObject,
	roots: Set<string>,
	family: Contract['family'],
	issue: (path: string, message: string) => void
) {
	const stack = [...roots].map((path) => ({ path, booleanAllowed: family === '3.1' })),
		seen = new Set<string>();
	while (stack.length) {
		const { path, booleanAllowed } = stack.pop()!;
		if (seen.has(path)) continue;
		seen.add(path);
		if (seen.size > L.schemas) fail(path, 'Schema limit: 4,000 subschemas.');
		const raw = nodeAt(root, path);
		if (typeof raw === 'boolean') {
			if (!booleanAllowed)
				fail(
					path,
					'Boolean schemas require OpenAPI 3.1 (additionalProperties booleans are allowed in 3.0).'
				);
			continue;
		}
		const s = record(raw, path),
			types = [
				'string',
				'number',
				'integer',
				'boolean',
				'object',
				'array',
				...(family === '3.1' ? ['null'] : [])
			];
		if (s.$ref !== undefined && typeof s.$ref !== 'string') fail(path, '$ref must be text.');
		if (s.type !== undefined) {
			if (Array.isArray(s.type)) {
				if (
					family === '3.0' ||
					!s.type.length ||
					s.type.some((v) => typeof v !== 'string' || !types.includes(v))
				)
					fail(path, 'Invalid type array; OpenAPI 3.0 uses nullable rather than type unions.');
			} else if (typeof s.type !== 'string' || !types.includes(s.type))
				fail(path, 'Unsupported schema type.');
		}
		if (s.nullable !== undefined) {
			flag(s.nullable, path);
			if (family === '3.1')
				issue(path, 'nullable is a legacy annotation in 3.1; use a type union containing null.');
		}
		if (s.required !== undefined) stringList(s.required, path, 4000);
		if (s.pattern !== undefined) text(s.pattern, path);
		for (const key of [
			'minimum',
			'maximum',
			'multipleOf',
			'minLength',
			'maxLength',
			'minItems',
			'maxItems',
			'minProperties',
			'maxProperties'
		])
			if (s[key] !== undefined && typeof s[key] !== 'number')
				fail(at(path, key), 'Expected a numeric schema constraint.');
		for (const key of ['exclusiveMinimum', 'exclusiveMaximum'])
			if (s[key] !== undefined && typeof s[key] !== (family === '3.0' ? 'boolean' : 'number'))
				fail(at(path, key), 'Exclusive bounds are booleans in 3.0 and numbers in 3.1.');
		if (s.enum !== undefined && !Array.isArray(s.enum)) fail(path, 'enum must be an array.');
		if (s.$id !== undefined || s.$dynamicRef !== undefined || s.$recursiveRef !== undefined)
			issue(path, 'URI scopes/dynamic references are not interpreted; no resources are fetched.');
		for (const key of [
			'properties',
			'patternProperties',
			'$defs',
			'definitions',
			'dependentSchemas'
		])
			if (s[key] !== undefined)
				for (const name of Object.keys(record(s[key], at(path, key))))
					stack.push({ path: at(at(path, key), name), booleanAllowed: family === '3.1' });
		for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems'])
			if (s[key] !== undefined) {
				const values = list(s[key], at(path, key), 4000);
				if (!values.length) fail(at(path, key), 'Schema composition must not be empty.');
				values.forEach((_, i) =>
					stack.push({ path: at(at(path, key), i), booleanAllowed: family === '3.1' })
				);
			}
		for (const key of [
			'items',
			'contains',
			'not',
			'if',
			'then',
			'else',
			'propertyNames',
			'additionalProperties',
			'unevaluatedProperties',
			'unevaluatedItems'
		])
			if (s[key] !== undefined)
				stack.push({
					path: at(path, key),
					booleanAllowed: family === '3.1' || key === 'additionalProperties'
				});
	}
}
