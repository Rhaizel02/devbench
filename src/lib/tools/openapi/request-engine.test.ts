import { describe, it, expect } from 'vitest';
import { parseContract } from './openapi-engine';
import { sampleContract } from './fixtures';
import {
	serializeParameter,
	requestDefaults,
	prepareRequest,
	redactContractRequest,
	schemaSample
} from './request-engine';
import { generateRequest, importCurl } from '../http-request/http-engine';
import type { Parameter, JsonValue } from './model';
function p(extra: Partial<Parameter> = {}): Parameter {
	return {
		key: 'x',
		path: '#',
		name: 'id',
		in: 'path',
		description: '',
		required: true,
		deprecated: false,
		style: 'simple',
		explode: false,
		allowReserved: false,
		examples: [],
		content: [],
		...extra
	};
}
describe('OpenAPI request serialization', () => {
	it('never auto-populates credential server variables and blocks ambiguous ref siblings', () => {
		const raw = sampleContract();
		raw.servers = [
			{ url: 'https://example.test/{token}', variables: { token: { default: 'DO_NOT_AUTOFILL' } } }
		];
		const c = parseContract(JSON.stringify(raw)),
			op = c.operations[0],
			{ options } = requestDefaults(c, op);
		expect(options.variables.token).toBe('');
		expect(() => prepareRequest(c, op, options)).toThrow(/Credential-bearing/);
		const referenced = sampleContract();
		const paths = referenced.paths as Record<string, JsonValue>;
		referenced['x-item'] = paths['/orders'];
		delete paths['/orders'];
		paths['/ref'] = { $ref: '#/x-item', servers: [{ url: 'https://override.test' }] };
		const contract = parseContract(JSON.stringify(referenced));
		expect(contract.operations.filter((o) => o.route === '/ref').every((o) => o.unresolved)).toBe(
			true
		);
		expect(contract.issues.some((i) => i.message.includes('siblings are not merged'))).toBe(true);
	});
	it('bounds branching reference samples and preserves nonsensitive query wire encoding', () => {
		const raw = sampleContract(),
			schemas = (raw.components as Record<string, JsonValue>).schemas as Record<string, JsonValue>;
		for (let i = 0; i < 8; i++)
			schemas['Branch' + i] = {
				type: 'object',
				properties: Object.fromEntries(
					Array.from({ length: 25 }, (_, n) => [
						'p' + n,
						(i === 7
							? { type: 'string' }
							: { $ref: '#/components/schemas/Branch' + (i + 1) }) as JsonValue
					])
				)
			};
		const c = parseContract(JSON.stringify(raw)),
			warnings: string[] = [];
		const value = schemaSample(c, '#/components/schemas/Branch0', warnings);
		expect(JSON.stringify(value).length).toBeLessThan(40000);
		expect(warnings.join(' ')).toContain('budget');
		const safe = redactContractRequest(c, c.operations[0], {
			method: 'GET',
			url: 'https://example.test/a?tags=a,b&token=SECRET&sp=a%20b',
			headers: [],
			body: null
		});
		expect(safe.url).toBe('https://example.test/a?tags=a,b&token=REDACTED&sp=a%20b');
	});
	it.each([
		[p(), 'a/b ?', 'a%2Fb%20%3F'],
		[p(), ['a', 'b'], 'a,b'],
		[p({ explode: true }), { role: 'admin', active: true }, 'role=admin,active=true'],
		[p({ style: 'label', explode: true }), ['a', 'b'], '.a.b'],
		[p({ style: 'matrix', explode: true }), ['a', 'b'], ';id=a;id=b'],
		[p({ style: 'matrix', explode: true }), { a: 1, b: 2 }, ';a=1;b=2']
	] as [Parameter, JsonValue, string][])(
		'serializes supported path forms %#',
		(param, value, path) => expect(serializeParameter(param, value)).toEqual({ path })
	);
	it('serializes query forms, flat deepObject and delimited arrays', () => {
		expect(
			serializeParameter(p({ in: 'query', style: 'form', explode: true }), ['a b', 'c&d']).query
		).toEqual(['id=a%20b', 'id=c%26d']);
		expect(
			serializeParameter(p({ in: 'query', style: 'form', explode: false }), { a: 1, b: 2 }).query
		).toEqual(['id=a,1,b,2']);
		expect(
			serializeParameter(p({ in: 'query', style: 'deepObject', explode: true }), { a: 1 }).query
		).toEqual(['id%5Ba%5D=1']);
		expect(
			serializeParameter(p({ in: 'query', style: 'pipeDelimited' }), ['a', 'b']).query
		).toEqual(['id=a%7Cb']);
		expect(serializeParameter(p({ in: 'header' }), ['a', 'b']).header).toBe('a,b');
		expect(serializeParameter(p({ in: 'cookie', style: 'form' }), 'a b').cookie).toBe('id=a%20b');
	});
	it('blocks unsupported or unsafe combinations rather than guessing', () => {
		for (const [param, value] of [
			[p({ in: 'query', allowReserved: true }), 'x'],
			[p({ in: 'cookie', style: 'form' }), ['a']],
			[p({ in: 'query', style: 'deepObject', explode: true }), { a: { b: 1 } }],
			[p({ in: 'header' }), 'bad\r\nHeader: value']
		] as [Parameter, JsonValue][])
			expect(() => serializeParameter(param, value)).toThrow();
	});
	it('prepares synthetic requests, required values and redacted handoffs using existing generators', () => {
		const c = parseContract(JSON.stringify(sampleContract())),
			op = c.operations.find((o) => o.operationId === 'createOrder')!,
			{ options } = requestDefaults(c, op);
		const request = prepareRequest(c, op, options);
		expect(request.url).toBe('https://sandbox.example.test/v1/orders');
		expect(JSON.parse(request.body!)).toEqual({ name: 'Synthetic notebook', quantity: 1 });
		const safe = redactContractRequest(c, op, request);
		expect(safe.body).toBe('[REDACTED body]');
		expect(importCurl(generateRequest(safe, 'curl', true))).toMatchObject({
			body: '[REDACTED body]'
		});
		for (const target of ['curl', 'fetch', 'java', 'spring'] as const)
			expect(generateRequest(safe, target, true)).not.toContain('Synthetic notebook');
		options.body = '';
		expect(() => prepareRequest(c, op, options)).toThrow(/Required request body/);
	});
	it('does not populate credentials, and redacts custom security names without regex matches', () => {
		const raw = sampleContract();
		const c = parseContract(JSON.stringify(raw));
		c.securitySchemes[0].parameterName = 'tenant';
		const op = c.operations[0];
		op.parameters = [
			p({
				name: 'tenant',
				key: 'tenant',
				in: 'query',
				style: 'form',
				required: false,
				examples: [{ name: 'ex', source: 'example', value: 'MUST_NOT_COPY' }]
			})
		];
		const { options } = requestDefaults(c, op);
		expect(options.values.tenant).toBe('');
		options.values.tenant = '"SYNTHETIC_SECRET"';
		const req = prepareRequest(c, op, options);
		const safe = redactContractRequest(c, op, req);
		expect(safe.url).not.toContain('SYNTHETIC_SECRET');
		expect(safe.url).toContain('REDACTED');
	});
	it('handles relative servers explicitly and validates enum/unsupported media', () => {
		const c = parseContract(JSON.stringify(sampleContract())),
			op = c.operations[0],
			{ options } = requestDefaults(c, op);
		options.variables.environment = 'wrong';
		expect(() => prepareRequest(c, op, options)).toThrow(/enum/);
		op.servers = [{ url: '/api', description: '', variables: {} }];
		options.base = 'https://explicit.example.test';
		expect(prepareRequest(c, op, options).url).toContain(
			'https://explicit.example.test/api/orders'
		);
	});
	it('bounds recursive samples without asserting schema validity', () => {
		const c = parseContract(JSON.stringify(sampleContract())),
			warnings: string[] = [];
		expect(schemaSample(c, '#/components/schemas/Order', warnings)).toMatchObject({ parent: null });
		expect(warnings.join('')).toContain('Recursive');
	});
});
