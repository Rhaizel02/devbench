import { DOMParser, DOMImplementation, type Node as XmlDomNode } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import { assertTextLimit, ToolError } from '../tool-errors';

export const XML_LIMITS = {
	bytes: 2 * 1024 * 1024,
	output: 8 * 1024 * 1024,
	depth: 128,
	nodes: 50000,
	attributes: 50000,
	perElement: 256,
	value: 256 * 1024,
	matches: 1000,
	resultBytes: 1024 * 1024
};
const XMLNS = 'http://www.w3.org/2000/xmlns/',
	XML = 'http://www.w3.org/XML/1998/namespace';
type Attribute = { name: string; namespace: string | null; value: string };
export type XmlNode =
	| {
			kind: 'element';
			name: string;
			namespace: string | null;
			attributes: Attribute[];
			children: XmlNode[];
	  }
	| { kind: 'text'; value: string }
	| { kind: 'cdata'; value: string }
	| { kind: 'comment'; value: string }
	| { kind: 'pi'; target: string; value: string };
export type XmlDocument = {
	format: 'devbench.xml';
	version: 1;
	declaration?: { version: '1.0'; standalone?: 'yes' | 'no' };
	children: XmlNode[];
};
export type XmlRow = {
	id: string;
	parent?: string;
	depth: number;
	label: string;
	detail: string;
	branch: boolean;
	path: string;
	value: string;
	attributes?: Attribute[];
};
function fail(message: string): never {
	throw new ToolError(message);
}
const bytes = (s: string) => new TextEncoder().encode(s).length;
function validCharacters(s: string) {
	for (const character of s) {
		const c = character.codePointAt(0)!;
		if (!(
			c === 9 ||
			c === 10 ||
			c === 13 ||
			(c >= 32 && c <= 0xd7ff) ||
			(c >= 0xe000 && c <= 0xfffd) ||
			(c >= 0x10000 && c <= 0x10ffff)
		))
			fail('XML contains a character forbidden by XML 1.0.');
	}
}
const boundedValue = (s: string) => {
	if (bytes(s) > XML_LIMITS.value) fail('XML value exceeds 256 KiB.');
	validCharacters(s);
};

// Recognize literal contexts before any XML parser sees the input. All other <! markup is forbidden.
function tagNamespacePreflight(tag: string, parent: Map<string, string>) {
	const whitespace = (c: string) => c === ' ' || c === '\t' || c === '\r' || c === '\n';
	let i = 0;
	const name = () => {
		const start = i;
		while (i < tag.length && !whitespace(tag[i]) && !['=', '/'].includes(tag[i])) i++;
		if (start === i) fail('Invalid XML tag / attribute name.');
		return tag.slice(start, i);
	};
	const elementName = name(),
		attributes: { name: string; value: string }[] = [],
		rawNames = new Set<string>();
	while (i < tag.length) {
		if (!whitespace(tag[i])) fail('Attributes must be separated by XML whitespace.');
		while (whitespace(tag[i])) i++;
		if (i === tag.length) break;
		const n = name();
		if (rawNames.has(n)) fail('Duplicate XML attribute name.');
		rawNames.add(n);
		while (whitespace(tag[i])) i++;
		if (tag[i++] !== '=') fail('XML attributes need quoted values.');
		while (whitespace(tag[i])) i++;
		const quote = tag[i++];
		if (quote !== '"' && quote !== "'") fail('XML attributes need quoted values.');
		const start = i;
		while (i < tag.length && tag[i] !== quote) i++;
		if (i === tag.length) fail('Unterminated XML attribute.');
		attributes.push({ name: n, value: tag.slice(start, i) });
		i++;
	}
	if (attributes.length > XML_LIMITS.perElement) fail('Element exceeds 256 attributes.');
	const scope = new Map(parent);
	const decodeNamespace = (s: string) =>
		s
			.replace(/\r\n?/g, '\n')
			.replace(/[\t\n]/g, ' ')
			.replace(/&([^;]*);/g, (_, entity: string) => {
				const simple: Record<string, string> = { amp: '&', lt: '<', gt: '>', apos: "'", quot: '"' };
				if (Object.hasOwn(simple, entity)) return simple[entity];
				if (/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(entity)) {
					const code =
						entity[1] === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
					if (code > 0x10ffff) fail('Invalid character reference.');
					const value = String.fromCodePoint(code);
					validCharacters(value);
					return value;
				}
				fail('DTD and custom entities are disabled.');
			});
	for (const a of attributes)
		if (a.name === 'xmlns' || a.name.startsWith('xmlns:')) {
			const prefix = a.name === 'xmlns' ? '' : a.name.slice(6),
				uri = decodeNamespace(a.value);
			if (
				prefix === 'xmlns' ||
				(prefix === 'xml' && uri !== XML) ||
				(prefix !== 'xml' && uri === XML) ||
				uri === XMLNS ||
				(prefix && uri === '')
			)
				fail('Invalid reserved namespace binding.');
			scope.set(prefix, uri);
		}
	const elementParts = elementName.split(':');
	if (elementParts.length > 2 || (elementParts.length === 2 && !scope.has(elementParts[0])))
		fail('Undeclared or invalid XML prefix.');
	const expanded = new Set<string>();
	for (const a of attributes) {
		const parts = a.name.split(':');
		if (parts.length > 2) fail('Invalid qualified attribute name.');
		const prefix = parts.length === 2 ? parts[0] : '',
			local = parts.at(-1)!;
		const ns = a.name === 'xmlns' || prefix === 'xmlns' ? XMLNS : prefix ? scope.get(prefix) : '';
		if (ns === undefined) fail('Undeclared XML attribute prefix.');
		const key = JSON.stringify([ns, local]);
		if (expanded.has(key)) fail('Duplicate expanded attribute name. XML is not well formed.');
		expanded.add(key);
	}
	return { scope, elementName };
}
export function preflightXml(input: string) {
	assertTextLimit(input, XML_LIMITS.bytes);
	if (!input.trim()) fail('Enter a complete XML document.');
	validCharacters(input);
	let depth = 0,
		tags = 0;
	const scopes: { scope: Map<string, string>; elementName: string }[] = [];
	for (let i = 0; i < input.length; i++) {
		if (input[i] !== '<') continue;
		if (input.startsWith('<!--', i)) {
			const end = input.indexOf('-->', i + 4);
			if (end < 0) fail('Unterminated XML comment.');
			i = end + 2;
			continue;
		}
		if (input.startsWith('<![CDATA[', i)) {
			const end = input.indexOf(']]>', i + 9);
			if (end < 0) fail('Unterminated CDATA section.');
			i = end + 2;
			continue;
		}
		if (input.startsWith('<?', i)) {
			const end = input.indexOf('?>', i + 2);
			if (end < 0) fail('Unterminated processing instruction.');
			i = end + 1;
			continue;
		}
		if (input.startsWith('<!', i))
			fail(
				'DTD, DOCTYPE and entity declarations are disabled. Other markup declarations are not supported.'
			);
		let quote = '',
			end = i + 1;
		for (; end < input.length; end++) {
			const c = input[end];
			if (quote) {
				if (c === quote) quote = '';
			} else if (c === '"' || c === "'") quote = c;
			else if (c === '>') break;
		}
		if (end === input.length) fail('Unterminated XML tag or attribute.');
		if (input[i + 1] === '/') {
			depth--;
			const previous = scopes.pop();
			if (!previous || previous.elementName !== input.slice(i + 2, end).trim())
				fail('XML closing tags do not match.');
		} else {
			if (++tags > XML_LIMITS.nodes) fail('XML exceeds 50,000 nodes.');
			const selfClosing = input[end - 1] === '/';
			const scope = tagNamespacePreflight(
				input.slice(i + 1, selfClosing ? end - 1 : end),
				scopes.at(-1)?.scope ??
					new Map([
						['xml', XML],
						['', '']
					])
			);
			if (!selfClosing) {
				depth++;
				scopes.push(scope);
			}
		}
		if (depth > XML_LIMITS.depth + 1) fail('XML exceeds 128 levels.');
		i = end;
	}
}
function parseDom(input: string) {
	preflightXml(input);
	try {
		return new DOMParser({
			normalizeLineEndings: (s) => s.replace(/\r\n?/g, '\n'),
			onError: () => {
				throw new Error('Invalid XML');
			}
		}).parseFromString(input, 'application/xml');
	} catch {
		fail(
			'XML is not well formed. Check matching tags, quoted attributes, names, namespace bindings and entity references.'
		);
	}
}
export function parseXml(input: string): XmlDocument {
	const dom = parseDom(input);
	const children: XmlNode[] = [];
	let declaration: XmlDocument['declaration'];
	const decl = /^\uFEFF?<\?xml\s+([\s\S]*?)\?>/.exec(input);
	if (decl) {
		const version = /\bversion\s*=\s*(['"])(.*?)\1/.exec(decl[1])?.[2];
		if (version !== '1.0') fail('Only XML 1.0 is supported.');
		const encoding = /\bencoding\s*=\s*(['"])(.*?)\1/.exec(decl[1])?.[2];
		if (encoding && !/^utf-8$/i.test(encoding))
			fail('Use UTF-8 XML. Original file encodings are not preserved.');
		const standalone = /\bstandalone\s*=\s*(['"])(yes|no)\1/.exec(decl[1])?.[2] as
			'yes' | 'no' | undefined;
		declaration = { version: '1.0', ...(standalone ? { standalone } : {}) };
	}
	const stack: { dom: XmlDomNode; target: XmlNode[]; depth: number }[] = [];
	for (let n = dom.lastChild; n; n = n.previousSibling)
		stack.push({ dom: n, target: children, depth: 0 });
	let count = 0,
		attrs = 0;
	while (stack.length) {
		const { dom: n, target, depth } = stack.pop()!;
		if (++count > XML_LIMITS.nodes || depth > XML_LIMITS.depth)
			fail('XML exceeds 50,000 nodes / 128 levels.');
		if (n.nodeType === 1) {
			const e = n as import('@xmldom/xmldom').Element;
			const attributes: Attribute[] = [];
			const expanded = new Set<string>();
			boundedValue(e.nodeName);
			if (e.attributes.length > XML_LIMITS.perElement) fail('Element exceeds 256 attributes.');
			attrs += e.attributes.length;
			if (attrs > XML_LIMITS.attributes) fail('XML exceeds 50,000 attributes.');
			for (let i = 0; i < e.attributes.length; i++) {
				const a = e.attributes.item(i)!;
				const key = JSON.stringify([a.namespaceURI, a.localName]);
				if (expanded.has(key)) fail('Duplicate expanded attribute name. XML is not well formed.');
				expanded.add(key);
				boundedValue(a.name);
				boundedValue(a.value);
				attributes.push({ name: a.name, namespace: a.namespaceURI, value: a.value });
			}
			const element: XmlNode = {
				kind: 'element',
				name: e.nodeName,
				namespace: e.namespaceURI,
				attributes,
				children: []
			};
			target.push(element);
			for (let c = e.lastChild; c; c = c.previousSibling)
				stack.push({ dom: c, target: element.children, depth: depth + 1 });
		} else if (n.nodeType === 3 || n.nodeType === 4 || n.nodeType === 8) {
			const value = n.nodeValue ?? '';
			boundedValue(value);
			target.push({
				kind: n.nodeType === 3 ? 'text' : n.nodeType === 4 ? 'cdata' : 'comment',
				value
			});
		} else if (n.nodeType === 7) {
			const targetName = n.nodeName;
			if (targetName === 'xml') continue;
			boundedValue(n.nodeValue ?? '');
			target.push({ kind: 'pi', target: targetName, value: n.nodeValue ?? '' });
		} else fail('Unsupported XML node type. DTD/entities are disabled.');
	}
	return { format: 'devbench.xml', version: 1, ...(declaration ? { declaration } : {}), children };
}

const textEscape = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');
const attrEscape = (value: string) =>
	textEscape(value).replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
function writeNode(
	n: XmlNode,
	indent: number,
	reindent: boolean,
	depth: number,
	preserve: boolean
): string {
	if (n.kind === 'text') return textEscape(n.value);
	if (n.kind === 'cdata') return '<![CDATA[' + n.value + ']]>';
	if (n.kind === 'comment') return '<!--' + n.value + '-->';
	if (n.kind === 'pi') return '<?' + n.target + (n.value ? ' ' + n.value : '') + '?>';
	const space = n.attributes.find((a) => a.namespace === XML && a.name === 'xml:space')?.value;
	preserve = space === 'preserve' ? true : space === 'default' ? false : preserve;
	const start =
		'<' +
		n.name +
		n.attributes.map((a) => ' ' + a.name + '="' + attrEscape(a.value) + '"').join('');
	if (!n.children.length) return start + '/>';
	const layout =
		reindent &&
		!preserve &&
		n.children.some((c) => c.kind === 'element') &&
		!n.children.some((c) => c.kind === 'cdata' || (c.kind === 'text' && c.value.trim().length > 0));
	const children = layout
		? n.children.filter((c) => c.kind !== 'text' || c.value.trim())
		: n.children;
	const body = children.map((c) => writeNode(c, indent, reindent, depth + 1, preserve));
	return (
		start +
		'>' +
		(layout
			? '\n' +
				' '.repeat((depth + 1) * indent) +
				body.join('\n' + ' '.repeat((depth + 1) * indent)) +
				'\n' +
				' '.repeat(depth * indent)
			: body.join('')) +
		'</' +
		n.name +
		'>'
	);
}
export function serializeXml(doc: XmlDocument, indent: 2 | 4 = 2, reindent = false) {
	const declaration = doc.declaration
		? '<?xml version="1.0" encoding="UTF-8"' +
			(doc.declaration.standalone ? ' standalone="' + doc.declaration.standalone + '"' : '') +
			'?>'
		: '';
	const result =
		declaration + doc.children.map((n) => writeNode(n, indent, reindent, 0, false)).join('');
	assertTextLimit(result, XML_LIMITS.bytes);
	return result;
}
export function formatXml(input: string, indent: 2 | 4 = 2, reindent = false) {
	const doc = parseXml(input),
		output = serializeXml(doc, indent, reindent);
	parseXml(output);
	return output;
}
export const minifyXml = (input: string) => formatXml(input, 2, false);
export function xmlToStructured(input: string) {
	const output = JSON.stringify(parseXml(input), null, 2);
	assertTextLimit(output, XML_LIMITS.output);
	return output;
}

function jsonShape(value: unknown) {
	const stack = [{ value, depth: 0 }];
	let visited = 0;
	while (stack.length) {
		const { value: v, depth } = stack.pop()!;
		if (++visited > 500000 || depth > 300) fail('Structured JSON exceeds its node/depth budget.');
		if (v && typeof v === 'object')
			for (const child of Object.values(v)) stack.push({ value: child, depth: depth + 1 });
	}
}
const record = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
export function structuredToXml(input: string) {
	assertTextLimit(input, XML_LIMITS.output);
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		fail('Invalid JSON. Source is preserved.');
	}
	jsonShape(value);
	if (
		!record(value) ||
		value.format !== 'devbench.xml' ||
		value.version !== 1 ||
		!Array.isArray(value.children)
	)
		fail('Expected devbench.xml structured JSON version 1. Arbitrary JSON is not XML.');
	if (
		value.declaration !== undefined &&
		(!record(value.declaration) ||
			value.declaration.version !== '1.0' ||
			(value.declaration.standalone !== undefined &&
				!['yes', 'no'].includes(String(value.declaration.standalone))))
	)
		fail('Invalid XML declaration metadata.');
	const factory = new DOMImplementation().createDocument(null, '', null);
	let count = 0,
		attrs = 0;
	const stack = value.children.map((n) => ({
		n,
		depth: 0,
		namespaces: new Map<string, string>([
			['xml', XML],
			['', '']
		])
	}));
	while (stack.length) {
		const { n, depth, namespaces } = stack.pop()!;
		if (++count > XML_LIMITS.nodes || depth > XML_LIMITS.depth)
			fail('Structured XML exceeds 50,000 nodes / 128 levels.');
		if (!record(n) || typeof n.kind !== 'string') fail('Every XML node needs a supported kind.');
		if (n.kind === 'element') {
			if (
				typeof n.name !== 'string' ||
				(n.namespace !== null && typeof n.namespace !== 'string') ||
				!Array.isArray(n.attributes) ||
				!Array.isArray(n.children)
			)
				fail('Invalid element representation.');
			if (
				n.attributes.length > XML_LIMITS.perElement ||
				(attrs += n.attributes.length) > XML_LIMITS.attributes
			)
				fail('XML attribute budget exceeded.');
			const scope = new Map(namespaces),
				seen = new Set<string>();
			for (const a of n.attributes) {
				if (
					!record(a) ||
					typeof a.name !== 'string' ||
					typeof a.value !== 'string' ||
					(a.namespace !== null && typeof a.namespace !== 'string')
				)
					fail('Invalid attribute representation.');
				boundedValue(a.value);
				if (a.name === 'xmlns' || a.name.startsWith('xmlns:')) {
					if (a.namespace !== XMLNS) fail('Namespace declarations need the xmlns namespace URI.');
					const prefix = a.name === 'xmlns' ? '' : a.name.slice(6);
					if (
						prefix === 'xmlns' ||
						(prefix === 'xml' && a.value !== XML) ||
						(prefix !== 'xml' && a.value === XML) ||
						a.value === XMLNS ||
						(prefix && a.value === '')
					)
						fail('Invalid reserved namespace binding.');
					scope.set(prefix, a.value);
				}
			}
			const checkName = (name: string, ns: string | null, attribute = false) => {
				const parts = name.split(':');
				if (parts.length > 2) fail('Invalid qualified XML name.');
				const prefix = parts.length === 2 ? parts[0] : '';
				if (attribute && (name === 'xmlns' || prefix === 'xmlns')) return;
				if ((scope.get(prefix) ?? '') !== (ns ?? '') && !(attribute && !prefix && ns === null))
					fail('Namespace URI does not match the declared prefix/default binding.');
				if (attribute && !prefix && ns !== null) fail('Unprefixed attributes have no namespace.');
			};
			checkName(n.name, n.namespace as string | null);
			try {
				factory.createElementNS(n.namespace as string | null, n.name);
			} catch {
				fail('Invalid XML element name.');
			}
			for (const a of n.attributes as Attribute[]) {
				checkName(a.name, a.namespace, true);
				try {
					factory.createAttributeNS(a.namespace, a.name);
				} catch {
					fail('Invalid XML attribute name.');
				}
				const key = JSON.stringify([a.namespace, a.name.split(':').at(-1)]);
				if (seen.has(key)) fail('Duplicate expanded attribute name.');
				seen.add(key);
			}
			for (const child of n.children) stack.push({ n: child, depth: depth + 1, namespaces: scope });
		} else if (['text', 'cdata', 'comment', 'pi'].includes(n.kind)) {
			if (typeof n.value !== 'string') fail('XML node value must be a string.');
			boundedValue(n.value);
			if (n.kind === 'pi' && (typeof n.target !== 'string' || /^xml$/i.test(n.target)))
				fail('Invalid processing instruction target.');
		} else fail('Unsupported XML node kind.');
	}
	const doc = value as unknown as XmlDocument,
		output = serializeXml(doc);
	const reparsed = parseXml(output);
	if (!equivalentXml(doc, reparsed))
		fail(
			'XML cannot preserve this structured representation after serialization. Check reserved markup and normalized characters.'
		);
	return output;
}
export function equivalentXml(a: XmlDocument, b: XmlDocument) {
	const node = (n: XmlNode): unknown =>
		n.kind === 'element'
			? {
					kind: n.kind,
					name: n.name,
					namespace: n.namespace,
					attributes: n.attributes.map((a) => ({
						name: a.name,
						namespace: a.namespace,
						value: a.value
					})),
					children: n.children.map(node)
				}
			: n.kind === 'pi'
				? { kind: n.kind, target: n.target, value: n.value }
				: { kind: n.kind, value: n.value };
	const canonical = (doc: XmlDocument) =>
		JSON.stringify({
			declaration: doc.declaration
				? { version: doc.declaration.version, standalone: doc.declaration.standalone ?? null }
				: null,
			children: doc.children.map(node)
		});
	return canonical(a) === canonical(b);
}
export function xmlToSimple(input: string) {
	const doc = parseXml(input);
	const project = (n: XmlNode): unknown => {
		if (n.kind !== 'element')
			return n.kind === 'pi'
				? { kind: n.kind, target: n.target, value: n.value }
				: { kind: n.kind, value: n.value };
		const grouped = new Map<string, unknown[]>();
		for (const child of n.children) {
			if (child.kind !== 'element') continue;
			const list = grouped.get(child.name) ?? [];
			list.push(project(child));
			grouped.set(child.name, list);
		}
		return {
			name: n.name,
			namespace: n.namespace,
			attributes: Object.fromEntries(n.attributes.map((a) => [a.name, a.value])),
			text: n.children
				.filter((c) => c.kind === 'text' || c.kind === 'cdata')
				.map((c) => c.value)
				.join(''),
			elements: Object.fromEntries([...grouped].map(([k, v]) => [k, v.length === 1 ? v[0] : v]))
		};
	};
	const result = JSON.stringify(
		{
			warning:
				'Data projection: child order, mixed text positions, comments, PI and CDATA identity may be lost. Not a reversible format.',
			root: project(doc.children.find((n) => n.kind === 'element')!)
		},
		null,
		2
	);
	assertTextLimit(result, XML_LIMITS.output);
	return result;
}
export function xmlRows(doc: XmlDocument): XmlRow[] {
	const rows: XmlRow[] = [];
	const stack = doc.children
		.map((n, i) => ({
			n,
			id: `/node()[${i + 1}]`,
			depth: 0,
			parent: undefined as string | undefined
		}))
		.reverse();
	while (stack.length) {
		const { n, id, depth, parent } = stack.pop()!;
		const v =
			n.kind === 'element'
				? n.attributes.map((a) => a.name + '="' + a.value + '"').join(' ')
				: n.value;
		rows.push({
			id,
			parent,
			depth,
			label: n.kind === 'element' ? '<' + n.name + '>' : n.kind === 'pi' ? '?' + n.target : n.kind,
			detail: v.slice(0, 240) + (v.length > 240 ? '… (truncated)' : ''),
			branch: n.kind === 'element' && !!n.children.length,
			path: id,
			value: v.slice(0, 4000) + (v.length > 4000 ? '… (truncated)' : ''),
			...(n.kind === 'element' ? { attributes: n.attributes } : {})
		});
		if (n.kind === 'element')
			for (let i = n.children.length - 1; i >= 0; i--)
				stack.push({
					n: n.children[i],
					id: id + `/node()[${i + 1}]`,
					parent: id,
					depth: depth + 1
				});
	}
	return rows;
}
export function xmlStats(doc: XmlDocument) {
	const rows = xmlRows(doc);
	let elements = 0,
		attributes = 0;
	const namespaces = new Map<string, Set<string>>();
	for (const r of rows)
		if (r.attributes) {
			elements++;
			attributes += r.attributes.length;
			for (const a of r.attributes)
				if (a.namespace === XMLNS) {
					const prefix = a.name === 'xmlns' ? '' : a.name.slice(6);
					const uris = namespaces.get(prefix) ?? new Set<string>();
					uris.add(a.value);
					namespaces.set(prefix, uris);
				}
		}
	return {
		nodes: rows.length,
		elements,
		attributes,
		depth: Math.max(0, ...rows.map((r) => r.depth)),
		namespaces: [...namespaces].flatMap(([prefix, uris]) =>
			[...uris].map((uri) => ({ prefix, uri }))
		)
	};
}
export type XPathResultData = {
	type: 'nodes' | 'string' | 'number' | 'boolean';
	value?: string | number | boolean;
	matches?: { path: string; kind: string; value: string; treeId?: string }[];
};
export function evaluateXPath(
	input: string,
	expression: string,
	namespaces: Record<string, string>
): XPathResultData {
	const doc = parseDom(input);
	parseXml(input);
	if (!expression.trim() || expression.length > 2048)
		fail('Enter an XPath 1.0 expression (maximum 2,048 characters).');
	if (
		Object.keys(namespaces).length > 100 ||
		Object.entries(namespaces).some(
			([p, u]) =>
				!p ||
				!/^[_\p{L}][\p{L}\p{N}_.-]*$/u.test(p) ||
				typeof u !== 'string' ||
				u.length > 4096 ||
				p === 'xmlns' ||
				(p === 'xml' && u !== XML)
		)
	)
		fail('Use valid non-empty XPath prefixes and namespace URIs.');
	let result: unknown;
	try {
		// The package types use the browser Node interface; its engine needs only XML DOM Core.
		result = xpath.useNamespaces(namespaces)(expression, doc as unknown as Node);
	} catch {
		fail('Invalid or unsupported XPath 1.0 expression / namespace prefix.');
	}
	if (!Array.isArray(result)) {
		if (typeof result === 'number')
			return { type: 'number', value: Number.isFinite(result) ? result : String(result) };
		if (typeof result === 'boolean') return { type: 'boolean', value: result };
		const value = String(result);
		assertTextLimit(value, XML_LIMITS.resultBytes);
		return { type: 'string', value };
	}
	if (result.length > XML_LIMITS.matches)
		fail('XPath exceeds 1,000 matches. Narrow the expression.');
	const path = (n: XmlDomNode): string => {
		if (n.nodeType === 9) return '/';
		if (n.nodeType === 2) {
			const a = n as import('@xmldom/xmldom').Attr;
			return path(a.ownerElement!) + '/attribute::' + a.name;
		}
		const siblings = n.parentNode?.childNodes;
		let index = 1;
		if (siblings)
			for (let i = 0; i < siblings.length; i++) {
				const s = siblings.item(i)!;
				if (s.nodeType === 7 && s.nodeName === 'xml') continue;
				if (s === n) break;
				index++;
			}
		const parent = n.parentNode && n.parentNode.nodeType !== 9 ? path(n.parentNode) : '';
		return parent + `/node()[${index}]`;
	};
	const matches = result.map((n: XmlDomNode) => {
		const p = path(n);
		const value =
			n.nodeType === 2
				? (n.nodeValue ?? '')
				: n.nodeType === 1
					? new importSerializer().serializeToString(n)
					: (n.nodeValue ?? '');
		return {
			path: p,
			treeId: n.nodeType === 2 ? p.split('/attribute::')[0] : p,
			kind: String(n.nodeType),
			value
		};
	});
	const output: XPathResultData = { type: 'nodes', matches };
	assertTextLimit(JSON.stringify(output), XML_LIMITS.resultBytes);
	return output;
}
// Keep serializers in the inert XML implementation, never the browser's active document.
import { XMLSerializer as importSerializer } from '@xmldom/xmldom';
