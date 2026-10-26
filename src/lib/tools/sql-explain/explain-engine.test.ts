import { describe, it, expect } from 'vitest';
import {
	parseExplain,
	planSummary,
	cardinality,
	explainFindings,
	comparePlans,
	EXPLAIN_LIMITS
} from './explain-engine';
import { smallPlan, complexPlan } from './fixtures';
const input = (node: Record<string, unknown>, extra = {}) =>
	JSON.stringify({ Plan: { 'Node Type': 'Seq Scan', ...node }, ...extra });
describe('EXPLAIN structured parsing and semantics', () => {
	it('normalizes stable paths, root metadata, zeroes, unknown nodes and workers', () => {
		const d = parseExplain(
			input(
				{
					'Node Type': 'Future Scan',
					'Total Cost': 0,
					Workers: [{ 'Worker Number': 0, 'Actual Rows': 0 }],
					Plans: [
						{ 'Node Type': 'CTE Scan', 'Parent Relationship': 'InitPlan', 'Subplan Name': 'CTE x' }
					]
				},
				{ Settings: { random_page_cost: '2' }, JIT: { Options: { Inlining: true } } }
			)
		);
		expect(d.nodes.map((n) => n.id)).toEqual(['0/Plan', '0/Plan/Plans/0']);
		expect(d.nodes[0].raw.Plans).toBeUndefined();
		expect(d.nodes[1].raw['Parent Relationship']).toBe('InitPlan');
		expect(planSummary(d).estimatedCost).toBe(0);
		expect(d.plans[0].metadata.JIT).toBeTruthy();
	});
	it('keeps average rows, aggregate volume, inclusive times and buffers distinct', () => {
		const d = parseExplain(
			input(
				{
					'Plan Rows': 2,
					'Actual Rows': 10,
					'Actual Loops': 20,
					'Actual Total Time': 3,
					'Shared Hit Blocks': 100,
					Plans: [
						{
							'Node Type': 'Index Scan',
							'Actual Total Time': 2,
							'Actual Loops': 20,
							'Shared Hit Blocks': 90
						}
					]
				},
				{ 'Planning Time': 1, 'Execution Time': 70 }
			)
		);
		expect(cardinality(d.nodes[0])).toMatchObject({ ratio: 5, aggregateRows: 200 });
		expect(planSummary(d)).toMatchObject({
			executionMs: 70,
			planningMs: 1,
			rootBuffers: { 'Shared Hit Blocks': 100 }
		});
	});
	it('supports estimated-only and timing-off without inventing numbers', () => {
		expect(planSummary(parseExplain(input({ 'Total Cost': 50 })))).toMatchObject({
			analyzed: false,
			estimatedCost: 50,
			executionMs: undefined
		});
		const d = parseExplain(input({ 'Actual Loops': 1, 'Actual Rows': 3 }));
		expect(planSummary(d).analyzed).toBe(true);
		expect(d.nodes[0].raw['Actual Total Time']).toBeUndefined();
	});
	it.each([
		[0, 0, 1, 'Both zero'],
		[0, 10, 1, 'Estimate zero; observed positive'],
		[20, 0, 0, 'Not executed']
	])('handles zero policy %s/%s/%s', (estimated, actual, loops, state) => {
		const c = cardinality(
			parseExplain(input({ 'Plan Rows': estimated, 'Actual Rows': actual, 'Actual Loops': loops }))
				.nodes[0]
		);
		expect(c.state).toBe(state);
		expect(c.ratio).toBeUndefined();
	});
	it('retains all documents and missing buffers', () => {
		const d = parseExplain(
			JSON.stringify([{ Plan: { 'Node Type': 'Limit' } }, { Plan: { 'Node Type': 'ModifyTable' } }])
		);
		expect(d.plans).toHaveLength(2);
		expect(planSummary(d, 1).rootBuffers).toEqual({});
	});
	it.each([
		'{',
		'[]',
		'null',
		'{"Plan":[]}',
		'{"Plan":{"Node Type":4}}',
		input({ 'Plan Rows': '2' }),
		input({ 'Actual Loops': -1 }),
		input({ Plans: [null] }),
		input({ Workers: [{ 'Actual Rows': '3' }] })
	])('rejects malformed shape without partial output %s', (text) =>
		expect(() => parseExplain(text)).toThrow()
	);
	it('enforces bytes, depth, node count and string budgets', () => {
		expect(() => parseExplain(' '.repeat(EXPLAIN_LIMITS.bytes + 1))).toThrow(/limit/);
		let n: Record<string, unknown> = { 'Node Type': 'Limit' };
		for (let i = 0; i < 130; i++) n = { 'Node Type': 'Limit', Plans: [n] };
		expect(() => parseExplain(input(n))).toThrow(/128/);
		expect(() =>
			parseExplain(
				input({ Plans: Array.from({ length: 5000 }, () => ({ 'Node Type': 'Result' })) })
			)
		).toThrow(/5,000/);
		expect(() => parseExplain(input({ Filter: 'x'.repeat(131073) }))).toThrow(/128 KiB/);
	});
	it('findings cite evidence and avoid universal index/bottleneck claims', () => {
		const d = parseExplain(complexPlan),
			f = explainFindings(d);
		expect(f.some((x) => x.kind === 'Cardinality')).toBe(true);
		expect(f.some((x) => x.kind === 'Disk / batching')).toBe(true);
		expect(f.every((x) => x.evidence && x.uncertainty && x.investigate)).toBe(true);
		expect(JSON.stringify(f)).not.toMatch(/missing index|proven bottleneck/i);
	});
	it('comparison does not pair structurally different nodes or invent missing zeros', () => {
		const a = parseExplain(smallPlan),
			b = parseExplain(input({ 'Node Type': 'Index Scan' }));
		const c = comparePlans(a, b);
		expect(c.structureChanged).toBe(true);
		expect(c.matches[0].matched).toBe(false);
		expect(c.metrics.find((x) => x.metric === 'executionMs')?.delta).toBeUndefined();
		expect(comparePlans(a, a).metrics[0].delta).toBe(0);
	});
	it('parallel workers remain metadata, not summed wall time', () => {
		const d = parseExplain(
			input(
				{
					'Node Type': 'Gather',
					'Workers Planned': 4,
					'Workers Launched': 2,
					Workers: [{ 'Actual Total Time': 10 }, { 'Actual Total Time': 20 }]
				},
				{ 'Execution Time': 15 }
			)
		);
		expect(planSummary(d).executionMs).toBe(15);
		expect(explainFindings(d)[0].kind).toBe('Parallel workers');
	});
});
describe('documented text subset', () => {
	it('parses indentation, decimals, buffers and timing', () => {
		const d = parseExplain(
			'Nested Loop  (cost=0.00..50.00 rows=2 width=8) (actual time=0.1..4.0 rows=2 loops=1)\n  ->  Index Scan using idx on synthetic  (cost=0.00..5.00 rows=1 width=8) (actual time=0.1..1.0 rows=1 loops=2)\n        Index Cond: (id = 1)\n        Buffers: shared hit=4 read=2\nPlanning Time: 0.2 ms\nExecution Time: 4.5 ms'
		);
		expect(d.format).toBe('text');
		expect(d.nodes).toHaveLength(2);
		expect(d.nodes[1].raw['Shared Read Blocks']).toBe(2);
		expect(planSummary(d).executionMs).toBe(4.5);
	});
	it('preserves uninterpreted lines and rejects ambiguous trees', () => {
		expect(
			parseExplain(
				'Result  (cost=0.00..1.00 rows=1 width=4)\n  Custom Metadata: synthetic'
			).diagnostics.join()
		).toContain('Custom Metadata');
		expect(() =>
			parseExplain(
				'Result  (cost=0.00..1.00 rows=1 width=4)\nResult  (cost=0.00..1.00 rows=1 width=4)'
			)
		).toThrow(/Ambiguous/);
	});
});
