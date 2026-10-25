import { describe, it, expect } from 'vitest';
import { compareContracts, exportDiff } from './diff-engine';
import { parseContract } from './openapi-engine';
import { sampleContract, evolvedContract } from './fixtures';
import type { JsonObject } from './model';
const parse = (v: JsonObject) => parseContract(JSON.stringify(v));
const compare = (a: JsonObject, b: JsonObject) => compareContracts(parse(a), parse(b));
function pair(direction: 'request' | 'response', schema: JsonObject): JsonObject {
	return {
		openapi: '3.1.1',
		info: { title: 'Directional API', version: '1' },
		paths: {
			'/a': {
				post: {
					...(direction === 'request'
						? { requestBody: { content: { 'application/json': { schema } } } }
						: {}),
					responses: {
						'200': {
							description: 'ok',
							...(direction === 'response' ? { content: { 'application/json': { schema } } } : {})
						}
					}
				}
			}
		}
	};
}
describe('conservative contract comparison', () => {
	it('identifies real Spring Boot endpoint, required DTO, status and enum evolution', () => {
		const d = compare(sampleContract(), evolvedContract());
		expect(d.changes.some((c) => c.category === 'endpoint' && c.severity === 'breaking')).toBe(
			true
		);
		expect(d.changes.some((c) => c.category === 'parameter' && c.severity === 'breaking')).toBe(
			true
		);
		expect(d.changes.some((c) => c.path.includes('quantity') && c.severity === 'breaking')).toBe(
			true
		);
		expect(d.changes.some((c) => c.path.endsWith('/enum') && c.severity === 'potential')).toBe(
			true
		);
	});
	it('is stable under key ordering and recursive internal references', () => {
		const a = sampleContract(),
			b = JSON.parse(JSON.stringify(a)) as JsonObject;
		b.paths = Object.fromEntries(Object.entries(b.paths as JsonObject).reverse());
		expect(compare(a, b).changes).toEqual([]);
	});
	it('does not label renamed equivalent references as wire-breaking', () => {
		const a = sampleContract(),
			b = sampleContract();
		const components = b.components as JsonObject,
			schemas = components.schemas as JsonObject;
		schemas.Renamed = schemas.Order;
		delete schemas.Order;
		const text = JSON.stringify(b).replaceAll(
			'#/components/schemas/Order',
			'#/components/schemas/Renamed'
		);
		expect(compare(a, JSON.parse(text)).counts.breaking).toBe(0);
	});
	it('treats documentation-only differences as limited annotations', () => {
		const a = sampleContract(),
			b = sampleContract();
		(b.info as JsonObject).description = '<img src="https://never.test">';
		((b.paths as JsonObject)['/health'] as JsonObject).get = {
			summary: 'Updated prose',
			security: [],
			responses: { '200': { description: 'Changed documentation' } }
		};
		const d = compare(a, b);
		expect(d.counts.breaking).toBe(0);
		expect(
			d.changes.every((c) => c.category === 'documentation' || c.category === 'metadata')
		).toBe(true);
	});
	it.each(['request', 'response'] as const)(
		'classifies enum/type/nullability direction for %s',
		(direction) => {
			const a = pair(direction, { type: 'string', enum: ['a', 'b'] }),
				b = pair(direction, { type: 'string', enum: ['a'] });
			const d = compare(a, b);
			expect(d.changes.find((c) => c.path.endsWith('/enum'))?.severity).toBe(
				direction === 'request' ? 'breaking' : 'compatible-limited'
			);
			const narrow = compare(
				pair(direction, { type: ['string', 'null'] }),
				pair(direction, { type: 'string' })
			);
			expect(narrow.changes.find((c) => c.path.endsWith('/type'))?.severity).toBe(
				direction === 'request' ? 'breaking' : 'compatible-limited'
			);
		}
	);
	it('recognizes request tightening, response guarantee removal and status changes', () => {
		const a = pair('request', {
				type: 'object',
				properties: { id: { type: 'string', minLength: 1 } }
			}),
			b = pair('request', {
				type: 'object',
				required: ['id'],
				properties: { id: { type: 'string', minLength: 3 } }
			});
		expect(compare(a, b).counts.breaking).toBeGreaterThanOrEqual(2);
		expect(
			compare(
				pair('response', {
					type: 'object',
					required: ['id'],
					properties: { id: { type: 'string' } }
				}),
				pair('response', { type: 'object', properties: { id: { type: 'string' } } })
			).counts.breaking
		).toBe(1);
		const c = sampleContract(),
			d = sampleContract();
		const op = ((d.paths as JsonObject)['/health'] as JsonObject).get as JsonObject;
		op.responses = { '204': { description: 'No content' } };
		const report = compare(c, d);
		expect(report.changes.some((c) => c.message.includes('status removed'))).toBe(true);
		expect(report.changes.some((c) => c.message.includes('status added'))).toBe(true);
	});
	it('marks compositions, unknown dialects and external references indeterminate without fetching', () => {
		const d = compare(
			pair('request', { allOf: [{ type: 'string' }] }),
			pair('request', { allOf: [{ type: 'number' }] })
		);
		expect(d.counts.indeterminate).toBeGreaterThan(0);
		const external = pair('request', { $ref: 'https://never.example.test/secret' });
		expect(compare(external, external).counts.indeterminate).toBeGreaterThan(0);
	});
	it('detects auth changes and treats reordered OR/AND requirements as equivalent', () => {
		const a = sampleContract(),
			b = sampleContract();
		const op = ((b.paths as JsonObject)['/health'] as JsonObject).get as JsonObject;
		delete op.security;
		expect(
			compare(a, b).changes.some((c) => c.category === 'security' && c.severity === 'breaking')
		).toBe(true);
		a.security = [{ b: ['x', 'y'], a: [] }, {}];
		b.security = [{}, { a: [], b: ['y', 'x'] }];
		((b.paths as JsonObject)['/health'] as JsonObject).get = (
			(a.paths as JsonObject)['/health'] as JsonObject
		).get;
		expect(compare(a, b).changes.filter((c) => c.category === 'security')).toEqual([]);
	});
	it('exports only metadata/change explanations and escapes hostile Markdown', () => {
		const a = sampleContract(),
			b = evolvedContract();
		(b.info as JsonObject).title =
			'<script>alert(1)</script> [link](https://never.test) | injected\nrow';
		const d = compare(a, b),
			json = exportDiff(d, 'json'),
			md = exportDiff(d, 'markdown');
		expect(json).not.toContain('Synthetic notebook');
		expect(json).not.toContain('X-Tenant-Credential');
		expect(md).not.toContain('<script>');
		expect(md).not.toContain('[link](');
		expect(md).toContain('&lt;script&gt;');
		expect(JSON.parse(json).counts.breaking).toBeGreaterThan(0);
	});
});
