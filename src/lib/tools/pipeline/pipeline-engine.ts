import { encodeBase64, decodeBase64 } from '../base64-toolkit/base64-engine';
import { encodeComponent, decodeComponent } from '../url-toolkit/url-engine';
import { formatJson, minifyJson } from '../json-studio/json-engine';
import { jsonToYaml, yamlToJson } from '../json-yaml/yaml-engine';
import { boundedJson, queryJson } from '../json-query/query-engine';
import { formatXml, minifyXml } from '../xml/xml-engine';
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
	jsonpath: 'JSONPath Extract',
	'text-trim': 'Text Trim',
	'text-case': 'Text Case',
	'text-replace': 'Literal Replace',
	'xml-format': 'XML Format (preserve text)',
	'xml-minify': 'XML Conservative Minify'
} as const;
export type Operation = keyof typeof operations;
export type PipelineStep = {
	operation: Operation;
	enabled?: boolean;
	unwrap?: boolean;
	casing?: 'upper' | 'lower';
	find?: string;
	replacement?: string;
	query?: string;
	indent?: 2 | 4 | 'tab';
	urlSafe?: boolean;
	padding?: boolean;
};
export type StepResult = {
	operation: Operation;
	status: 'success' | 'failed' | 'not-run' | 'skipped';
	output?: string;
	error?: string;
};
export type PipelineResult = { steps: StepResult[]; output: string | null };
export function runPipeline(
	input: string,
	steps: PipelineStep[],
	onProgress?: (index: number) => void
): PipelineResult {
	assertTextLimit(input);
	if (steps.length < 1 || steps.length > 8) throw new ToolError('Choose 1–8 pipeline steps.');
	validateSteps(steps);
	const results: StepResult[] = [];
	let value = input;
	let cumulative = new TextEncoder().encode(input).length;
	for (const [index, step] of steps.entries()) {
		if (step.enabled === false) {
			results.push({ operation: step.operation, status: 'skipped' });
			continue;
		}
		onProgress?.(index);
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

				case 'jsonpath': {
					const matches = queryJson(value, step.query ?? '$').map((m) => m.value);
					value = JSON.stringify(
						step.unwrap && matches.length === 1 ? matches[0] : matches,
						null,
						2
					);
					break;
				}
				case 'text-trim':
					value = value.trim();
					break;
				case 'text-case':
					value = step.casing === 'upper' ? value.toUpperCase() : value.toLowerCase();
					break;
				case 'text-replace': {
					const find = step.find ?? '',
						replacement = step.replacement ?? '';
					if (!find) throw new ToolError('Literal search must not be empty.');
					let count = 0,
						pos = 0;
					while ((pos = value.indexOf(find, pos)) !== -1) {
						count++;
						pos += find.length;
					}
					const size =
						new TextEncoder().encode(value).length +
						count *
							(new TextEncoder().encode(replacement).length -
								new TextEncoder().encode(find).length);
					if (size > 1024 * 1024) throw new ToolError('Replacement output exceeds 1 MiB.');
					value = value.split(find).join(replacement);
					break;
				}
				case 'xml-format':
					value = formatXml(value, step.indent === 4 ? 4 : 2);
					break;
				case 'xml-minify':
					value = minifyXml(value);
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
	if (index === 3)
		return {
			input: '  Synthetic Fixture  \n',
			steps: [
				{ operation: 'text-trim' },
				{ operation: 'text-case', casing: 'lower' },
				{ operation: 'text-replace', find: 'fixture', replacement: 'dataset' }
			]
		};
	if (index === 4)
		return {
			input: json,
			steps: [
				{ operation: 'jsonpath', query: '$.items', unwrap: true },
				{ operation: 'json-minify' }
			]
		};
	return {
		input: 'items:\n  - name: Notebook\n    price: 12\n  - name: Pen\n    price: 3\n',
		steps: [{ operation: 'yaml-json' }, { operation: 'jsonpath', query: '$.items[*].name' }]
	};
}

export type PipelineRecipe = {
	format: 'devbench.pipeline';
	version: 1;
	name: string;
	description: string;
	steps: PipelineStep[];
};
const optionKeys = [
	'operation',
	'enabled',
	'query',
	'indent',
	'urlSafe',
	'padding',
	'unwrap',
	'casing',
	'find',
	'replacement'
] as const;
const danger = new Set(['__proto__', 'constructor', 'prototype']);
function plain(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function validateSteps(steps: PipelineStep[]) {
	if (!Array.isArray(steps) || steps.length < 1 || steps.length > 8)
		throw new ToolError('Choose 1–8 pipeline steps.');
	for (const [i, step] of steps.entries()) {
		if (!plain(step) || !Object.hasOwn(operations, step.operation))
			throw new ToolError('Step ' + (i + 1) + ': unsupported operation.');
		for (const [key, value] of Object.entries(step)) {
			if (key === 'uid') continue; // UI-local identity; export always strips it.
			if (danger.has(key) || !optionKeys.includes(key as (typeof optionKeys)[number]))
				throw new ToolError('Step ' + (i + 1) + ': unknown option.');
			if (value === undefined) continue;
			if (['enabled', 'urlSafe', 'padding', 'unwrap'].includes(key) && typeof value !== 'boolean')
				throw new ToolError('Step ' + (i + 1) + ': expected boolean option.');
			if (
				['query', 'find', 'replacement'].includes(key) &&
				(typeof value !== 'string' || value.length > 2048)
			)
				throw new ToolError(
					'Step ' + (i + 1) + ': text option exceeds 2,048 characters or has invalid type.'
				);
			if (key === 'indent' && ![2, 4, 'tab'].includes(value as number))
				throw new ToolError('Invalid indentation.');
			if (key === 'casing' && !['upper', 'lower'].includes(value as string))
				throw new ToolError('Choose upper or lower case.');
		}
	}
}
export function exportRecipe(name: string, description: string, steps: PipelineStep[]): string {
	validateSteps(steps);
	const recipe: PipelineRecipe = {
		format: 'devbench.pipeline',
		version: 1,
		name,
		description,
		steps: steps.map(
			(step) =>
				Object.fromEntries(
					optionKeys.filter((key) => step[key] !== undefined).map((key) => [key, step[key]])
				) as PipelineStep
		)
	};
	const text = JSON.stringify(recipe, null, 2);
	parseRecipe(text);
	return text;
}
export function parseRecipe(text: string): PipelineRecipe {
	assertTextLimit(text, 64 * 1024);
	let r: unknown;
	try {
		r = JSON.parse(text);
	} catch {
		throw new ToolError('Recipe must be valid JSON.');
	}
	if (
		!plain(r) ||
		Object.keys(r).some(
			(key) => !['format', 'version', 'name', 'description', 'steps'].includes(key)
		) ||
		r.format !== 'devbench.pipeline' ||
		r.version !== 1
	)
		throw new ToolError('Expected a devbench.pipeline version 1 configuration.');
	if (
		typeof r.name !== 'string' ||
		r.name.length > 80 ||
		typeof r.description !== 'string' ||
		r.description.length > 600
	)
		throw new ToolError('Recipe name ≤80 and description ≤600 characters are required strings.');
	if (
		!Array.isArray(r.steps) ||
		r.steps.some(
			(step) =>
				!plain(step) ||
				Object.keys(step).some(
					(key) => danger.has(key) || !optionKeys.includes(key as (typeof optionKeys)[number])
				)
		)
	)
		throw new ToolError('Recipe contains unknown step options.');
	validateSteps(r.steps as PipelineStep[]);
	return r as PipelineRecipe;
}
