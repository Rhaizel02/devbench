import { validateJson, type JsonValue } from '../json-studio/json-engine';
import { ToolError, assertTextLimit } from '../tool-errors';
type Field = { key: string; optional: boolean; shape: Shape };
type ObjectShape = { kind: 'object'; name: string; fields: Field[] };
type Shape =
	| { kind: 'string' | 'number' | 'boolean' | 'null' | 'unknown' }
	| ObjectShape
	| { kind: 'array'; item: Shape }
	| { kind: 'union'; options: Shape[] };
const javaReserved = new Set(
	'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null _ record sealed permits non-sealed var yield when clone finalize getClass hashCode notify notifyAll toString wait'.split(
		' '
	)
);
const builtinTypes = new Set([
	'String',
	'Object',
	'Boolean',
	'Double',
	'Long',
	'Integer',
	'Short',
	'Byte',
	'Character',
	'Float',
	'Number',
	'Class',
	'List',
	'BigDecimal',
	'Record',
	'System',
	'Math',
	'Enum',
	'Thread',
	'Throwable',
	'Exception',
	'Error',
	'Void'
]);
export function generatedTypeName(input: string): string {
	let name =
		input
			.replace(/[^A-Za-z0-9_$]+/g, ' ')
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join('') || 'Generated';
	if (!/^[A-Za-z_$]/.test(name)) name = 'Type' + name;
	if (name === '_') name = 'Generated';
	if (builtinTypes.has(name)) name += 'Type';
	return name.slice(0, 80);
}
const typeName = generatedTypeName;
function javaField(input: string): string {
	let name = input.replace(/[^A-Za-z0-9_$]/g, '_') || 'field';
	if (!/^[A-Za-z_$]/.test(name)) name = 'field_' + name;
	if (javaReserved.has(name)) name += '_';
	return name.slice(0, 100);
}
export function inferCode(
	input: string,
	language: 'typescript' | 'java',
	requestedName = 'Root'
): string {
	assertTextLimit(input, 128 * 1024);
	assertTextLimit(requestedName, 256);
	if (!['typescript', 'java'].includes(language)) throw new ToolError('Choose TypeScript or Java.');
	const parsed = validateJson(input);
	if (parsed.status !== 'valid') throw new ToolError('Enter strict JSON to infer code.');
	const stack = [{ value: parsed.value, depth: 0 }];
	let visited = 0;
	while (stack.length) {
		const { value, depth } = stack.pop()!;
		if (++visited > 20000 || depth > 32)
			throw new ToolError('Inference supports up to 20,000 nodes and 32 levels.');
		if (value !== null && typeof value === 'object') {
			for (const key of Object.keys(value))
				if (key.length > 256)
					throw new ToolError('Inference property names must be at most 256 characters.');
			for (const child of Object.values(value)) stack.push({ value: child, depth: depth + 1 });
		}
	}
	const names = new Set<string>();
	const objects: ObjectShape[] = [];
	function unique(base: string) {
		const seed = typeName(base);
		let result = seed,
			suffix = 2;
		while (names.has(result)) result = seed + suffix++;
		names.add(result);
		return result;
	}
	function infer(values: JsonValue[], base: string): Shape {
		if (!values.length) return { kind: 'unknown' };
		const groups = new Map<string, JsonValue[]>();
		for (const value of values) {
			const category = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
			const group = groups.get(category) ?? [];
			group.push(value);
			groups.set(category, group);
		}
		const options: Shape[] = [];
		for (const [kind, group] of groups) {
			if (kind === 'object') {
				const samples = group as Record<string, JsonValue>[];
				const node: ObjectShape = { kind: 'object', name: unique(base), fields: [] };
				objects.push(node);
				const keys = [...new Set(samples.flatMap((sample) => Object.keys(sample)))];
				if (keys.length > 200) throw new ToolError('An inferred object exceeds 200 properties.');
				for (const key of keys) {
					const present = samples.filter((sample) => Object.hasOwn(sample, key));
					node.fields.push({
						key,
						optional: present.length !== samples.length,
						shape: infer(
							present.map((sample) => sample[key]),
							node.name + typeName(key)
						)
					});
				}
				options.push(node);
			} else if (kind === 'array')
				options.push({
					kind: 'array',
					item: infer((group as JsonValue[][]).flat(), base + 'Item')
				});
			else options.push({ kind: kind as 'string' | 'number' | 'boolean' | 'null' });
		}
		return options.length === 1 ? options[0] : { kind: 'union', options };
	}
	const rootName = typeName(requestedName);
	const isObjectRoot =
		parsed.value !== null && typeof parsed.value === 'object' && !Array.isArray(parsed.value);
	if (!isObjectRoot) names.add(rootName);
	const root = infer([parsed.value], rootName);
	function ts(shape: Shape): string {
		if (shape.kind === 'object') return shape.name;
		if (shape.kind === 'array') return 'Array<' + ts(shape.item) + '>';
		if (shape.kind === 'union') return '(' + shape.options.map(ts).join(' | ') + ')';
		return shape.kind;
	}
	function java(shape: Shape): string {
		if (shape.kind === 'object') return shape.name;
		if (shape.kind === 'array') return 'List<' + java(shape.item) + '>';
		return shape.kind === 'string'
			? 'String'
			: shape.kind === 'number'
				? 'BigDecimal'
				: shape.kind === 'boolean'
					? 'Boolean'
					: 'Object';
	}
	if (language === 'typescript') {
		const definitions = objects.map(
			(object) =>
				'export interface ' +
				object.name +
				' {\n' +
				object.fields
					.map(
						(field) =>
							'  ' +
							JSON.stringify(field.key) +
							(field.optional ? '?' : '') +
							': ' +
							ts(field.shape) +
							';'
					)
					.join('\n') +
				'\n}'
		);
		if (!isObjectRoot) definitions.unshift('export type ' + rootName + ' = ' + ts(root) + ';');
		return (
			'// Inferred from samples, not a runtime validator. Empty arrays use unknown; null-only samples stay null.\n' +
			definitions.join('\n\n') +
			'\n'
		);
	}
	function components(fields: Field[]): string {
		const used = new Set<string>();
		return fields
			.map((field) => {
				const base = javaField(field.key);
				let name = base,
					suffix = 2;
				while (used.has(name)) name = base + '_' + suffix++;
				used.add(name);
				const commentKey = JSON.stringify(field.key)
					.replace(/\\/g, '[backslash]')
					.replace(/[\r\n\u2028\u2029]/g, '[line break]');
				return (
					'    // JSON key: ' +
					commentKey +
					(field.optional ? ' (absent in some samples; nullable)' : '') +
					'\n    ' +
					java(field.shape) +
					' ' +
					name
				);
			})
			.join(',\n');
	}
	const rootFields =
		root.kind === 'object' ? root.fields : [{ key: 'value', optional: false, shape: root }];
	const children = objects
		.filter((object) => object !== root)
		.map(
			(object) => '  public record ' + object.name + '(\n' + components(object.fields) + '\n  ) {}'
		);
	return (
		'// Java 17+. Names may be sanitized; JSON-key comments are informational, not binding annotations.\n// Empty/all-null/heterogeneous values use Object; missing fields use nullable reference types.\nimport java.math.BigDecimal;\nimport java.util.List;\n\npublic record ' +
		rootName +
		'(\n' +
		components(rootFields) +
		'\n) {\n' +
		children.join('\n\n') +
		'\n}\n'
	);
}
