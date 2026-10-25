import { parseDocument, stringify, isMap, isSeq, isAlias, isScalar, LineCounter } from 'yaml';
import { validateJson } from '../json-studio/json-engine';
import { ToolError, assertTextLimit, TEXT_LIMIT } from '../tool-errors';
const allowedTags = new Set([
	'tag:yaml.org,2002:str',
	'tag:yaml.org,2002:null',
	'tag:yaml.org,2002:bool',
	'tag:yaml.org,2002:int',
	'tag:yaml.org,2002:float',
	'tag:yaml.org,2002:seq',
	'tag:yaml.org,2002:map'
]);
function validateShape(value: unknown) {
	const stack = [{ value, depth: 0 }];
	let visited = 0;
	while (stack.length) {
		const item = stack.pop()!;
		const value = item.value;
		if (++visited > 100000 || item.depth > 128)
			throw new ToolError('Conversion limit reached (100,000 nodes / 128 levels).');
		if (value === null || typeof value === 'string' || typeof value === 'boolean') continue;
		if (typeof value === 'number') {
			if (!Number.isFinite(value))
				throw new ToolError('Non-finite numbers cannot be represented in JSON.');
			continue;
		}
		if (
			typeof value !== 'object' ||
			(!Array.isArray(value) &&
				Object.getPrototypeOf(value) !== Object.prototype &&
				Object.getPrototypeOf(value) !== null)
		)
			throw new ToolError('This value cannot be represented faithfully in JSON.');
		for (const child of Object.values(value)) stack.push({ value: child, depth: item.depth + 1 });
	}
}
export function jsonToYaml(input: string): string {
	assertTextLimit(input);
	const result = validateJson(input);
	if (result.status !== 'valid')
		throw new ToolError(result.status === 'empty' ? 'Enter JSON to convert.' : result.message);
	validateShape(result.value);
	try {
		return stringify(result.value, { indent: 2, lineWidth: 100, aliasDuplicateObjects: false });
	} catch {
		throw new ToolError('Could not serialize this JSON structure as YAML.');
	}
}
export function yamlToJson(input: string, maximum = TEXT_LIMIT, indentation: 0 | 2 = 2): string {
	assertTextLimit(input, maximum);
	if (!input.trim()) throw new ToolError('Enter YAML to convert.');
	const lineCounter = new LineCounter();
	try {
		const document = parseDocument(input, {
			schema: 'core',
			version: '1.2',
			customTags: [],
			uniqueKeys: true,
			prettyErrors: false,
			lineCounter,
			logLevel: 'silent'
		});
		if (document.errors.length) {
			const position = lineCounter.linePos(document.errors[0].pos[0]);
			throw new ToolError(
				'Invalid YAML at line ' +
					position.line +
					', column ' +
					position.col +
					'. Check indentation, quoting and duplicate keys.'
			);
		}
		if (document.warnings.length)
			throw new ToolError(
				'YAML contains unsupported tags or constructs. Use JSON-compatible YAML 1.2.'
			);
		const stack: { node: unknown; depth: number }[] = [{ node: document.contents, depth: 0 }];
		let visited = 0;
		while (stack.length) {
			const { node, depth } = stack.pop()!;
			if (++visited > 100000 || depth > 128)
				throw new ToolError('Conversion limit reached (100,000 nodes / 128 levels).');
			if (isAlias(node))
				throw new ToolError(
					'YAML aliases are not supported. Expand aliases explicitly before converting.'
				);
			if ((isScalar(node) || isMap(node) || isSeq(node)) && node.tag && !allowedTags.has(node.tag))
				throw new ToolError('This YAML tag is not JSON-compatible.');
			if (isMap(node)) {
				for (const pair of node.items) {
					if (!isScalar(pair.key) || typeof pair.key.value !== 'string')
						throw new ToolError(
							'YAML mapping keys must be strings. Quote numeric or boolean keys explicitly.'
						);
					stack.push({ node: pair.value, depth: depth + 1 });
				}
			} else if (isSeq(node)) {
				for (const child of node.items) stack.push({ node: child, depth: depth + 1 });
			} else if (
				isScalar(node) &&
				typeof node.value === 'number' &&
				Number.isInteger(node.value) &&
				!Number.isSafeInteger(node.value)
			)
				throw new ToolError(
					'A YAML integer exceeds JavaScript safe precision. Quote it to preserve its exact digits.'
				);
		}
		const value: unknown = document.toJS({ mapAsMap: false, maxAliasCount: 0 });
		validateShape(value);
		return JSON.stringify(value, null, indentation);
	} catch (error) {
		if (error instanceof ToolError) throw error;
		throw new ToolError(
			'YAML could not be converted safely. Check the structure and reduce excessive nesting.'
		);
	}
}
