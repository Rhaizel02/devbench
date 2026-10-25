import { encodeBase64, decodeBase64 } from '../base64-toolkit/base64-engine';
import { encodeComponent, decodeComponent } from '../url-toolkit/url-engine';
import { formatJson, minifyJson } from '../json-studio/json-engine';
import { jsonToYaml, yamlToJson } from '../json-yaml/yaml-engine';
import { boundedJson, queryJson } from '../json-query/query-engine';
import { assertTextLimit, ToolError, errorMessage } from '../tool-errors';
export const operations = {
	'base64-encode': 'Base64 Encode',
	'base64-decode': 'Base64 Decode',
	'url-encode': 'URL component Encode',
	'url-decode': 'URL component Decode',
	'json-format': 'JSON Format',
	'json-minify': 'JSON Minify',
	'json-yaml': 'JSON → YAML',
	'yaml-json': 'YAML → JSON',
	jsonpath: 'JSONPath Extract'
} as const;
export type Operation = keyof typeof operations;
export type PipelineStep = {
	operation: Operation;
	query?: string;
	indent?: 2 | 4 | 'tab';
	urlSafe?: boolean;
	padding?: boolean;
};
export type StepResult = {
	operation: Operation;
	status: 'success' | 'failed' | 'not-run';
	output?: string;
	error?: string;
};
export type PipelineResult = { steps: StepResult[]; output: string | null };
export function runPipeline(input: string, steps: PipelineStep[]): PipelineResult {
	assertTextLimit(input);
	if (steps.length < 1 || steps.length > 8) throw new ToolError('Choose 1–8 pipeline steps.');
	const results: StepResult[] = [];
	let value = input;
	let cumulative = new TextEncoder().encode(input).length;
	for (const [index, step] of steps.entries()) {
		try {
			if (!Object.hasOwn(operations, step.operation))
				throw new ToolError('Unsupported pipeline operation.');
			switch (step.operation) {
				case 'base64-encode':
					value = encodeBase64(value, { urlSafe: step.urlSafe, padding: step.padding ?? true });
					break;
				case 'base64-decode':
					value = decodeBase64(value, {
						urlSafe: step.urlSafe,
						allowMissingPadding: step.padding === false,
						ignoreWhitespace: true
					});
					break;
				case 'url-encode':
					value = encodeComponent(value);
					break;
				case 'url-decode':
					value = decodeComponent(value);
					break;
				case 'json-format':
				case 'json-minify': {
					boundedJson(value);
					const result =
						step.operation === 'json-format'
							? formatJson(value, step.indent ?? 2)
							: minifyJson(value);
					if (result.status !== 'valid') throw new ToolError('Invalid JSON for this step.');
					value = result.output;
					break;
				}
				case 'json-yaml':
					boundedJson(value);
					value = jsonToYaml(value);
					break;
				case 'yaml-json':
					value = yamlToJson(value);
					boundedJson(value);
					break;
				case 'jsonpath':
					value = JSON.stringify(
						queryJson(value, step.query ?? '$').map((match) => match.value),
						null,
						2
					);
					break;
			}
			assertTextLimit(value);
			cumulative += new TextEncoder().encode(value).length;
			if (cumulative > 4 * 1024 * 1024)
				throw new ToolError('Pipeline work/output budget exceeded (4 MiB cumulative).');
			results.push({ operation: step.operation, status: 'success', output: value });
		} catch (error) {
			results.push({ operation: step.operation, status: 'failed', error: errorMessage(error) });
			for (const remaining of steps.slice(index + 1))
				results.push({ operation: remaining.operation, status: 'not-run' });
			return { steps: results, output: null };
		}
	}
	return { steps: results, output: value };
}
export function pipelineRecipe(index: number): { input: string; steps: PipelineStep[] } {
	const json =
		'{"items":[{"name":"Notebook","price":12},{"name":"Pen","price":3}],"text":"café 雪"}';
	if (index === 0)
		return {
			input: encodeBase64(json),
			steps: [
				{ operation: 'base64-decode', padding: true },
				{ operation: 'json-format', indent: 2 }
			]
		};
	if (index === 1)
		return {
			input: encodeComponent(json),
			steps: [{ operation: 'url-decode' }, { operation: 'json-format', indent: 2 }]
		};
	return {
		input: 'items:\n  - name: Notebook\n    price: 12\n  - name: Pen\n    price: 3\n',
		steps: [{ operation: 'yaml-json' }, { operation: 'jsonpath', query: '$.items[*].name' }]
	};
}
