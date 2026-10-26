import { describe, it, expect } from 'vitest';
import {
	runPipeline,
	parseRecipe,
	exportRecipe,
	pipelineRecipe,
	type PipelineStep
} from './pipeline-engine';
describe('Pipeline V2 configuration and bounded operations', () => {
	it('roundtrips only configuration, strips UI identity and preserves disabled steps', () => {
		const steps = [
			{ uid: 19, operation: 'text-trim' as const, enabled: false },
			{ operation: 'text-case' as const, casing: 'upper' as const }
		];
		const text = exportRecipe('Fixture', 'Configuration only', steps);
		expect(text).not.toContain('uid');
		expect(parseRecipe(text).steps).toEqual([
			{ operation: 'text-trim', enabled: false },
			{ operation: 'text-case', casing: 'upper' }
		]);
		expect(runPipeline(' a ', parseRecipe(text).steps)).toEqual({
			steps: [
				{ operation: 'text-trim', status: 'skipped' },
				{ operation: 'text-case', status: 'success', output: ' A ' }
			],
			output: ' A '
		});
	});
	it('uses literal replacement, no regex execution, and preserves Unicode', () => {
		expect(
			runPipeline('  café.* 雪  ', [
				{ operation: 'text-trim' },
				{ operation: 'text-replace', find: '.*', replacement: '!' },
				{ operation: 'text-case', casing: 'upper' }
			]).output
		).toBe('CAFÉ! 雪');
		expect(
			runPipeline('a', [
				{ operation: 'text-replace', find: '', replacement: 'x' },
				{ operation: 'text-trim' }
			]).steps.map((s) => s.status)
		).toEqual(['failed', 'not-run']);
		expect(
			runPipeline('a'.repeat(1000), [
				{ operation: 'text-replace', find: 'a', replacement: 'x'.repeat(2048) }
			]).output
		).toBeNull();
	});
	it('unwraps a single JSONPath result explicitly; old extraction remains an array', () => {
		expect(runPipeline('{"x":{"n":2}}', [{ operation: 'jsonpath', query: '$.x' }]).output).toBe(
			'[\n  {\n    "n": 2\n  }\n]'
		);
		expect(
			runPipeline('{"x":{"n":2}}', [{ operation: 'jsonpath', query: '$.x', unwrap: true }]).output
		).toBe('{\n  "n": 2\n}');
	});
	it('reuses safe XML and rejects DTD without a successful final result', () => {
		const xml = '<r>Hello <b>雪</b> !</r>';
		expect(
			runPipeline(xml, [{ operation: 'xml-format', indent: 4 }, { operation: 'xml-minify' }]).output
		).toBe(xml);
		expect(
			runPipeline('<!DOCTYPE r SYSTEM "https://example.invalid"><r/>', [
				{ operation: 'xml-format' }
			]).output
		).toBeNull();
	});
	it.each([0, 1, 2, 3, 4])('executes actual built-in recipe %s', (i) => {
		const r = pipelineRecipe(i);
		expect(runPipeline(r.input, r.steps).output).not.toBeNull();
	});
	it.each([
		'{"format":"devbench.pipeline","version":2,"name":"x","description":"","steps":[]}',
		'{"format":"devbench.pipeline","version":1,"name":"x","description":"","steps":[{"operation":"text-trim","__proto__":{}}]}',
		'{"format":"devbench.pipeline","version":1,"name":"x","description":"","steps":[{"operation":"text-trim","enabled":"false"}]}',
		'{"format":"devbench.pipeline","version":1,"name":"x","description":"","steps":[{"operation":"eval"}]}',
		'null'
	])('rejects hostile/unsupported configuration transactionally', (text) => {
		const before = exportRecipe('Current', '', [{ operation: 'text-trim' }]);
		expect(() => parseRecipe(text)).toThrow();
		expect(parseRecipe(before).name).toBe('Current');
	});
	it('bounds recipe text, option text and intermediate/cumulative output', () => {
		expect(() => parseRecipe(' '.repeat(65537))).toThrow();
		expect(() =>
			exportRecipe('x', '', [{ operation: 'jsonpath', query: 'x'.repeat(2049) }])
		).toThrow();
		expect(() =>
			runPipeline(
				'',
				Array.from({ length: 9 }, () => ({ operation: 'text-trim' }) as PipelineStep)
			)
		).toThrow();
		expect(
			runPipeline(
				'x'.repeat(1024 * 1024),
				Array.from({ length: 4 }, () => ({ operation: 'text-trim' }))
			).output
		).toBeNull();
	});
});
