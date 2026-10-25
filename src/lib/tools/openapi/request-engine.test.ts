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
