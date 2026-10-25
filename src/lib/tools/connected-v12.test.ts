import { describe, it, expect } from 'vitest';
import { runPipeline, pipelineRecipe, type Operation } from './pipeline/pipeline-engine';
import { handoffTargets } from './handoffs';
describe('bounded linear pipelines reuse engines', () => {
	it.each([0, 1, 2])('executes synthetic recipe %i', (index) => {
		const recipe = pipelineRecipe(index);
		const result = runPipeline(recipe.input, recipe.steps);
		expect(result.steps.every((step) => step.status === 'success')).toBe(true);
		expect(JSON.parse(result.output!)).toEqual(
			index === 2
				? ['Notebook', 'Pen']
				: {
						items: [
							{ name: 'Notebook', price: 12 },
							{ name: 'Pen', price: 3 }
						],
						text: 'café 雪'
					}
		);
	});
	it('respects ordering and stops at the exact failing step', () => {
		const good = runPipeline('eyJhIjoxfQ==', [
			{ operation: 'base64-decode' },
			{ operation: 'json-format', indent: 4 }
		]);
		expect(good.output).toBe('{\n    "a": 1\n}');
		const bad = runPipeline('eyJhIjoxfQ==', [
			{ operation: 'json-format' },
			{ operation: 'base64-decode' }
		]);
		expect(bad.output).toBeNull();
		expect(bad.steps.map((step) => step.status)).toEqual(['failed', 'not-run']);
		expect(bad.steps[0].error).toContain('Invalid JSON');
	});
	it('handles Unicode, URL-safe encoding, tab indentation and empty scalars', () => {
		expect(
			runPipeline('café 雪 🌍', [
				{ operation: 'base64-encode', urlSafe: true, padding: false },
				{ operation: 'base64-decode', urlSafe: true, padding: false }
			]).output
		).toBe('café 雪 🌍');
		expect(
			runPipeline('a+b', [{ operation: 'url-encode' }, { operation: 'url-decode' }]).output
		).toBe('a+b');
		expect(runPipeline('null', [{ operation: 'json-minify' }]).output).toBe('null');
		expect(runPipeline('{"x":1}', [{ operation: 'json-format', indent: 'tab' }]).output).toContain(
			'\n\t'
		);
		expect(runPipeline('', [{ operation: 'base64-encode' }]).output).toBe('');
	});
	it('bounds steps, bytes, outputs, accumulated work and unsafe syntax', () => {
		expect(() => runPipeline('x', [])).toThrow(/1–8/);
		expect(() => runPipeline('x', Array(9).fill({ operation: 'url-encode' }))).toThrow(/1–8/);
		expect(() => runPipeline('雪'.repeat(400000), [{ operation: 'url-encode' }])).toThrow(/limit/);
		expect(runPipeline('x'.repeat(800000), [{ operation: 'base64-encode' }]).steps[0].status).toBe(
			'failed'
		);
		expect(
			runPipeline('x'.repeat(800000), Array(8).fill({ operation: 'url-encode' })).steps.find(
				(step) => step.status === 'failed'
			)?.error
		).toContain('cumulative');
		expect(
			runPipeline('{}', [{ operation: 'jsonpath', query: '$[?(@.x.constructor())]' }]).steps[0]
				.status
		).toBe('failed');
		expect(runPipeline('x', [{ operation: 'eval' as Operation }]).steps[0].error).toContain(
			'Unsupported'
		);
	});
});
describe('real handoff compatibility', () => {
	it('offers JSON destinations only for supported current JSON, and CSV only for bounded flat records', () => {
		expect(handoffTargets('DATA-01', '{}').map((tool) => tool.id)).toEqual(['DATA-05']);
		expect(handoffTargets('DATA-05', '[{"name":"雪"}]').map((tool) => tool.id)).toContain(
			'DATA-04'
		);
		expect(handoffTargets('DATA-05', '[{"nested":{}}]').map((tool) => tool.id)).not.toContain(
			'DATA-04'
		);
		expect(handoffTargets('ENC-01', 'not JSON')).toEqual([]);
		expect(handoffTargets('SEC-01', '{}')).toEqual([]);
		expect(handoffTargets('BACK-09', '{}')).toEqual([]);
		expect(handoffTargets('DATA-01', '"' + 'x'.repeat(1024 * 1024) + '"')).toEqual([]);
	});
	it('rejects unsupported cURL transfers and supports bounded plain-text log transfer', () => {
		expect(
			handoffTargets('BACK-06', "curl 'https://example.invalid/'").map((tool) => tool.id)
		).toEqual(['BACK-03']);
		expect(handoffTargets('BACK-03', 'curl --upload-file x https://example.invalid')).toEqual([]);
		expect(handoffTargets('BACK-03', "curl 'https://user:pass@example.invalid/'")).toEqual([]);
		expect(handoffTargets('BACK-08', 'logs').map((tool) => tool.id)).toEqual(['TEXT-01']);
		expect(handoffTargets('BACK-08', 'x'.repeat(128 * 1024 + 1))).toEqual([]);
	});
});
