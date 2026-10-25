import { describe, it, expect } from 'vitest';
import { parseContract } from './openapi-engine';
import { sampleContract } from './fixtures';
import { at, nodeAt, pointerTokens, resolveReference } from './references';
import { OPENAPI_LIMITS as L, type JsonObject, type JsonValue } from './model';
const parse = (value: unknown) => parseContract(JSON.stringify(value), 'json');
const small = (extra: JsonObject = {}) => ({
	openapi: '3.1.1',
	info: { title: 'Test', version: '1' },
	paths: {},
	...extra
});
describe('bounded OpenAPI parser', () => {
	it('extracts real operations, schemas, servers, examples and effective security', () => {
		const c = parse(sampleContract());
		expect(c.operations).toHaveLength(4);
		expect(c.schemas).toHaveLength(2);
		expect(c.operations.find((o) => o.route === '/health')?.security).toEqual([]);
		expect(c.operations[0].parameters[0].examples[0]).toMatchObject({
			source: 'default',
			value: 'pending'
		});
		expect(c.operations[0].responses[0].headers[0].name).toBe('X-Total-Count');
		expect(c.securitySchemes[0].parameterName).toBe('X-Tenant-Credential');
	});
	it('uses operation overrides and server/security precedence', () => {
		const parameter = (value: string) => ({
			name: 'q',
			in: 'query',
			schema: { type: 'string', default: value }
		});
		const operation = {
			servers: [{ url: 'https://operation.test' }],
			security: [{}],
			parameters: [parameter('new')],
			responses: { '200': { description: 'ok' } }
		};
		const c = parse(
			small({
				servers: [{ url: 'https://root.test' }],
				security: [{ key: [] }],
				paths: {
					'/a': { servers: [{ url: '/path' }], parameters: [parameter('old')], get: operation }
				}
			})
		);
		expect(c.operations[0]).toMatchObject({
			serverSource: 'operation',
			securitySource: 'operation',
			security: [{}]
		});
		expect(c.operations[0].parameters).toHaveLength(1);
		expect(c.operations[0].parameters[0].examples[0].value).toBe('new');
	});
	it('reads YAML safely and reports its detected format', () => {
		const c = parseContract(
			'openapi: 3.0.4\ninfo: {title: "Unicode café 👩🏽‍💻", version: "1"}\npaths: {}'
		);
		expect(c.format).toBe('yaml');
		expect(c.title).toContain('café');
	});
	it('distinguishes OAS 3.0 from 3.1 responses and schema semantics', () => {
		expect(
			parse(small({ components: { schemas: { Yes: true, Maybe: { type: ['string', 'null'] } } } }))
				.family
		).toBe('3.1');
		expect(parse(small({ paths: { '/a': { get: {} } } })).operations[0].responses).toEqual([]);
		expect(() => parse(small({ openapi: '3.0.4', paths: { '/a': { get: {} } } }))).toThrow(
			/require responses/
		);
		expect(() => parse(small({ openapi: '3.0.4', components: { schemas: { No: true } } }))).toThrow(
			/Boolean schemas/
		);
		expect(() =>
			parse(
				small({ openapi: '3.0.4', components: { schemas: { No: { type: ['string', 'null'] } } } })
			)
		).toThrow(/type array/);
	});
	it('preserves cycles and external refs as graph edges without fetching', () => {
		const c = parse(
			small({
				components: {
					schemas: {
						A: { $ref: '#/components/schemas/B' },
						B: { $ref: '#/components/schemas/A' },
						External: { $ref: 'https://never.example.test/schema.json' }
					}
				}
			})
		);
		expect(c.references.filter((r) => r.status === 'cycle')).toHaveLength(2);
		expect(c.statistics.externalReferences).toBe(1);
	});
	it('ignores literal refs in examples/defaults while visiting properties named value', () => {
		const c = parse(
			small({
				components: {
					schemas: {
						A: {
							example: { $ref: 'https://data.test' },
							default: { $ref: 'https://data.test' },
							properties: { value: { $ref: '#/components/schemas/Missing' } }
						}
					}
				}
			})
		);
		expect(c.references).toHaveLength(1);
		expect(c.references[0].status).toBe('missing');
	});
	it('allows schema-only 3.1 contracts without inventing endpoints', () => {
		expect(
			parse({
				openapi: '3.1.0',
				info: { title: 'Schemas', version: '1' },
				components: { schemas: { A: { type: 'string' } } }
			}).operations
		).toEqual([]);
	});
	it.each(['2.0', '3.2.0', '4.0.0', '3.1'])('rejects unsupported version %s', (openapi) =>
		expect(() => parse(small({ openapi }))).toThrow(/Supported versions/)
	);
	it.each([
		null,
		[],
		{},
		{ swagger: '2.0' },
		small({ info: { title: 1, version: '1' } }),
		small({ paths: { '/a/{id}': { get: { responses: { '200': { description: 'ok' } } } } } }),
		small({ paths: { '/a': { get: { responses: {} } } } }),
		small({ components: { schemas: { A: { exclusiveMinimum: true } } } })
	])('rejects structurally invalid contracts %#', (value) => expect(() => parse(value)).toThrow());
	it.each(['x: &a [*a]', 'x: !!js/function hi', 'x: 1\nx: 2'])(
		'rejects hostile YAML without echoing snippets',
		(input) => expect(() => parseContract(input, 'yaml')).toThrow()
	);
	it('enforces strict JSON mode and keeps parse errors free of input snippets', () => {
		try {
			parseContract('{"secret-value-123":,}', 'json');
			throw Error('must fail');
		} catch (e) {
			expect(String(e)).not.toContain('secret-value-123');
		}
	});
	it('bounds bytes, nesting, nodes, operations and schemas', () => {
		expect(() => parseContract(' '.repeat(L.bytes + 1))).toThrow(/limit/i);
		let deep: JsonValue = 0;
		for (let i = 0; i < 66; i++) deep = { a: deep };
		expect(() => parse(small({ 'x-deep': deep }))).toThrow(/64 levels/);
		expect(() => parse(small({ 'x-many': Array.from({ length: 100001 }, () => 0) }))).toThrow(
			/100,000/
		);
		expect(() =>
			parse(
				small({
					paths: Object.fromEntries(Array.from({ length: 2001 }, (_, i) => ['/p' + i, { get: {} }]))
				})
			)
		).toThrow(/Operation limit/);
		expect(() =>
			parse(
				small({
					components: {
						schemas: Object.fromEntries(
							Array.from({ length: 4001 }, (_, i) => ['S' + i, { type: 'string' }])
						)
					}
				})
			)
		).toThrow(/Schema limit/);
	});
});
describe('internal JSON Pointer references', () => {
	it('decodes URI fragments before tokens and round trips percent/slashes/Unicode', () => {
		const root = { a: { 'b/c~%雪': 42 }, list: [7] };
		const path = at(at('#', 'a'), 'b/c~%雪');
		expect(nodeAt(root, path)).toBe(42);
		expect(resolveReference(root, path).resolvedTarget).toBe(path);
		expect(pointerTokens('#%2Fa%2Fb~1c~0%25%E9%9B%AA')).toEqual(['a', 'b/c~%雪']);
		expect(nodeAt(root, '#/list/01')).toBeUndefined();
	});
	it('uses own properties and rejects malformed/anchor pointers', () => {
		expect(nodeAt({}, '#/constructor')).toBeUndefined();
		expect(resolveReference({}, '#/bad~2').status).toBe('unsupported');
		expect(resolveReference({}, '#anchor').status).toBe('unsupported');
		expect(resolveReference({}, '#/missing').status).toBe('missing');
	});
	it('applies outer 3.1 description overrides and ignores them in 3.0', () => {
		const base = small({
			components: {
				responses: {
					A: { $ref: '#/components/responses/B', description: 'middle' },
					B: { description: 'inner' }
				}
			},
			paths: {
				'/a': {
					get: { responses: { '200': { $ref: '#/components/responses/A', description: 'outer' } } }
				}
			}
		});
		expect(parse(base).operations[0].responses[0].description).toBe('outer');
		expect(parse({ ...base, openapi: '3.0.4' }).operations[0].responses[0].description).toBe(
			'inner'
		);
	});
});
