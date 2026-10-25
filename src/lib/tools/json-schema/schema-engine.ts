import { Validator, type Schema } from '@cfworker/json-schema';
import core from './meta/core.json';
import applicator from './meta/applicator.json';
import unevaluated from './meta/unevaluated.json';
import validation from './meta/validation.json';
import metadata from './meta/meta-data.json';
import format from './meta/format-annotation.json';
import content from './meta/content.json';
import meta from './meta/schema.json';
import { boundedJson } from '../json-query/query-engine';
import { ToolError } from '../tool-errors';
import type { JsonValue } from '../json-studio/json-engine';

const maps = ['$defs', 'properties', 'patternProperties', 'dependentSchemas'];
const singles = [
	'items',
	'contains',
	'additionalProperties',
	'unevaluatedProperties',
	'unevaluatedItems',
	'propertyNames',
	'not',
	'if',
	'then',
	'else'
];
const lists = ['prefixItems', 'allOf', 'anyOf', 'oneOf'];
function inspectSchema(root: JsonValue) {
	const validator = new Validator(meta as Schema, '2020-12', false);
	for (const definition of [core, applicator, unevaluated, validation, metadata, format, content])
		validator.addSchema(definition as Schema);
	const stack: JsonValue[] = [root];
	let count = 0;
	while (stack.length) {
		const schema = stack.pop()!;
		if (++count > 2000) throw new ToolError('Schema exceeds 2,000 subschemas.');
		if (typeof schema === 'boolean') continue;
		if (
			!schema ||
			typeof schema !== 'object' ||
			Array.isArray(schema) ||
			!validator.validate(schema).valid
		)
			throw new ToolError(
				'Invalid schema: a keyword has an invalid value or a subschema is not an object/boolean.'
			);
		if ('$dynamicRef' in schema || '$recursiveRef' in schema || '$id' in schema)
			throw new ToolError(
				'Schema IDs and dynamic/recursive reference keywords are unsupported. Use local #/$defs/... references.'
			);
		if (schema.$schema && schema.$schema !== 'https://json-schema.org/draft/2020-12/schema')
			throw new ToolError('Select JSON Schema Draft 2020-12.');
		if ('$ref' in schema) {
			const ref = schema.$ref;
			if (typeof ref !== 'string' || (ref !== '#' && !ref.startsWith('#/')))
				throw new ToolError(
					'External references and anchors are disabled. Use an internal JSON Pointer reference.'
				);
			let target: JsonValue | undefined = root;
			for (const token of ref
				.slice(2)
				.split('/')
				.filter(() => ref !== '#')) {
				let key: string;
				try {
					key = decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~');
				} catch {
					throw new ToolError('Invalid schema reference encoding.');
				}
				target =
					target && typeof target === 'object' && Object.hasOwn(target, key)
						? (target as Record<string, JsonValue>)[key]
						: undefined;
			}
			if (
				target === undefined ||
				(typeof target !== 'boolean' &&
					(!target || typeof target !== 'object' || Array.isArray(target)))
			)
				throw new ToolError('Schema reference does not point to a local subschema.');
		}
		for (const key of maps)
			if (schema[key] && typeof schema[key] === 'object' && !Array.isArray(schema[key]))
				stack.push(...Object.values(schema[key]));
		for (const key of singles) if (Object.hasOwn(schema, key)) stack.push(schema[key]);
		for (const key of lists) if (Array.isArray(schema[key])) stack.push(...schema[key]);
	}
}
export function validateDocument(schemaText: string, documentText: string) {
	let schema: JsonValue;
	try {
		schema = boundedJson(schemaText);
	} catch {
		throw new ToolError('Invalid schema JSON or schema size/depth limit exceeded.');
	}
	inspectSchema(schema);
	let document: JsonValue;
	try {
		document = boundedJson(documentText);
	} catch {
		throw new ToolError('Invalid document JSON or document size/depth limit exceeded.');
	}
	try {
		const result = new Validator(schema as Schema | boolean, '2020-12', false).validate(document);
		return {
			valid: result.valid,
			errorCount: result.errors.length,
			errors: result.errors.slice(0, 100).map((error) => ({
				path: error.instanceLocation,
				keyword: error.keyword,
				message: error.error
			}))
		};
	} catch {
		throw new ToolError('Schema could not be evaluated. Check local references and recursion.');
	}
}
export function inferSchema(text: string, multiple = false): string {
	const value = boundedJson(text);
	const samples = multiple ? (Array.isArray(value) ? value : null) : [value];
	if (!samples || !samples.length || samples.length > 100)
		throw new ToolError('Multiple examples must be a JSON array containing 1–100 samples.');
	function infer(values: JsonValue[], depth = 0): Schema {
		if (depth > 32) throw new ToolError('Inference depth limit: 32 levels.');
		if (!values.length) return {};
		const groups = new Map<string, JsonValue[]>();
		for (const value of values) {
			const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
			groups.set(type, [...(groups.get(type) ?? []), value]);
		}
		const variants: Schema[] = [];
		for (const [type, group] of groups) {
			if (type === 'object') {
				const objects = group as Record<string, JsonValue>[];
				const keys = [...new Set(objects.flatMap(Object.keys))];
				variants.push({
					type: 'object',
					properties: Object.fromEntries(
						keys.map((key) => [
							key,
							infer(
								objects.filter((o) => Object.hasOwn(o, key)).map((o) => o[key]),
								depth + 1
							)
						])
					),
					required: keys.filter((key) => objects.every((o) => Object.hasOwn(o, key)))
				});
			} else if (type === 'array')
				variants.push({ type: 'array', items: infer((group as JsonValue[][]).flat(), depth + 1) });
			else
				variants.push({
					type:
						type === 'number' && group.every((v) => Number.isInteger(v))
							? 'integer'
							: (type as Schema['type'])
				});
		}
		return variants.length === 1 ? variants[0] : { anyOf: variants };
	}
	return JSON.stringify(
		{ $schema: 'https://json-schema.org/draft/2020-12/schema', ...infer(samples) },
		null,
		2
	);
}
