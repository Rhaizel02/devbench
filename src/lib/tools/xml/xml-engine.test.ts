import { describe, it, expect, vi } from 'vitest';
import {
	parseXml,
	formatXml,
	minifyXml,
	xmlRows,
	xmlStats,
	xmlToStructured,
	structuredToXml,
	equivalentXml,
	evaluateXPath,
	xmlToSimple,
	preflightXml
} from './xml-engine';
import { xmlSample, soapSample } from './fixtures';
describe('strict inert XML', () => {
	it.each([
		xmlSample,
		soapSample,
		'<root/>',
		'<r>emoji 👩🏽‍💻 &amp; accent é</r>',
		'<r><!--kept--><?synthetic note?><![CDATA[<x/>]]></r>'
	])('parses and roundtrips admitted semantic nodes', (input) => {
		expect(equivalentXml(parseXml(input), parseXml(structuredToXml(xmlToStructured(input))))).toBe(
			true
		);
	});
	it.each([
		'<r>',
		'<a></b>',
		'<r a=x/>',
		'<r a="1" a="2"/>',
		'<p:r/>',
		'<r>&notDeclared;</r>',
		'<r/><second/>',
		'<r>\u0000</r>',
		'<r a="<"/>',
		'<r>&#0;</r>',
		'<r xmlns:a="urn:x" xmlns:b="urn:x" a:x="1" b:x="2"/>',
		'<?xml version="1.1"?><r/>'
	])('rejects malformed XML %s', (input) => expect(() => parseXml(input)).toThrow());
	it.each([
		'<!DOCTYPE r SYSTEM "https://synthetic.invalid/entity"><r/>',
		'<!DOCTYPE r [<!ENTITY x "boom">]><r>&x;</r>',
		'<!DOCTYPE r [<!ENTITY % p SYSTEM "file:///secret">%p;]><r/>',
		'<! DOCTYPE r><r/>',
		'<!doctype r><r/>',
		'<!ENTITY x "boom"><r/>'
	])('blocks declarations before parsing %s', (input) =>
		expect(() => preflightXml(input)).toThrow(/disabled/)
	);
	it('does not falsely reject inert declaration-looking comments/CDATA/PI', () => {
		expect(() =>
			parseXml('<r><!-- <!DOCTYPE x> --><![CDATA[<!ENTITY x>]]><?note <!DOCTYPE x>?></r>')
		).not.toThrow();
	});
	it('does not log malformed input through the parser default handler', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => parseXml('<r secret=synthetic/>')).toThrow();
		expect(log).not.toHaveBeenCalled();
		log.mockRestore();
	});
	it('preserves mixed content, whitespace, CDATA and inherited xml:space', () => {
		const s =
			'<r><mixed>Hello <b>world</b> !</mixed><keep xml:space="preserve"> <a/>  <b/> </keep><![CDATA[ x < y ]]><!--end--></r>';
		expect(equivalentXml(parseXml(s), parseXml(minifyXml(s)))).toBe(true);
		const f = formatXml(s, 4, true);
		expect(f).toContain('Hello <b>world</b> !');
		expect(f).toContain('> <a/>  <b/> </keep>');
		expect(f).toContain('<![CDATA[ x < y ]]>');
	});
	it('default formatting preserves every text node; explicit layout supports 2/4', () => {
		const s = '<r><a/><b/></r>';
		expect(formatXml(s)).toBe(s);
		expect(formatXml(s, 2, true)).toBe('<r>\n  <a/>\n  <b/>\n</r>');
		expect(formatXml(s, 4, true)).toContain('\n    <a/>');
		expect(minifyXml('<r> <a/> </r>')).toBe('<r> <a/> </r>');
	});
	it('preserves numeric character data and XML1.0 line rules', () => {
		const s = '<r a="&#9;&#10;&#13;">&#13;\u0085\u2028</r>';
		expect(equivalentXml(parseXml(s), parseXml(minifyXml(s)))).toBe(true);
	});
	it('retains qualified names, namespace resets, attributes, ordered children, PI and comments', () => {
		const s =
			'<?xml version="1.0" standalone="yes"?><?note safe?><r xmlns="urn:r" xmlns:x="urn:x"><x:b x:a="v"/><c xmlns="">text</c><!--kept--></r>';
		expect(equivalentXml(parseXml(s), parseXml(structuredToXml(xmlToStructured(s))))).toBe(true);
		expect(xmlStats(parseXml(s)).namespaces).toContainEqual({ prefix: 'x', uri: 'urn:x' });
		expect(xmlRows(parseXml(s)).some((r) => r.label === 'comment')).toBe(true);
	});
	it('enforces input, depth, node, attribute and value budgets', () => {
		expect(() => parseXml('<r>' + 'x'.repeat(2 * 1024 * 1024) + '</r>')).toThrow(/limit/);
		expect(() => parseXml('<r>'.repeat(131) + '</r>'.repeat(131))).toThrow(/128/);
		expect(() => parseXml('<r>' + '<a/>'.repeat(50000) + '</r>')).toThrow(/50,000/);
		expect(() =>
			parseXml('<r ' + Array.from({ length: 257 }, (_, i) => `a${i}="v"`).join(' ') + '/>')
		).toThrow(/256/);
		expect(() => parseXml('<r>' + 'x'.repeat(262145) + '</r>')).toThrow(/256 KiB/);
	});
});
describe('structured XML and data projection', () => {
	it.each([
		'{',
		'{}',
		'{"format":"devbench.xml","version":2,"children":[]}',
		'{"format":"devbench.xml","version":1,"children":[{"kind":"script","value":"x"}]}'
	])('rejects invalid structured input', (input) => expect(() => structuredToXml(input)).toThrow());
	it('rejects prefix inconsistencies and duplicate expanded attributes', () => {
		const d = parseXml('<r xmlns:x="urn:x" x:a="1"/>');
		const root = d.children[0];
		if (root.kind !== 'element') throw Error();
		root.attributes.push({ name: 'x:a', namespace: 'urn:x', value: '2' });
		expect(() => structuredToXml(JSON.stringify(d))).toThrow(/Duplicate/);
		root.attributes.pop();
		root.namespace = 'urn:wrong';
		expect(() => structuredToXml(JSON.stringify(d))).toThrow(/Namespace/);
	});
	it('escapes text and attributes rather than executing imported markup', () => {
		const d = parseXml('<r a="safe">text</r>');
		const r = d.children[0];
		if (r.kind !== 'element') throw Error();
		r.attributes[0].value = '"><script>synthetic</script>';
		r.children = [{ kind: 'text', value: '<script>alert(1)</script>' }];
		const s = structuredToXml(JSON.stringify(d));
		expect(s).toContain('&lt;script&gt;');
		expect(equivalentXml(d, parseXml(s))).toBe(true);
	});
	it('blocks comment/CDATA/PI serialization injection and prototype corruption', () => {
		for (const kind of ['comment', 'cdata', 'pi']) {
			const d = parseXml('<r/>');
			const r = d.children[0];
			if (r.kind !== 'element') throw Error();
			r.children = [
				kind === 'pi'
					? { kind: 'pi', target: 'note', value: '?><evil/><?note' }
					: {
							kind: kind as 'comment' | 'cdata',
							value: kind === 'comment' ? '--><evil/><!--' : ']]><evil/><![CDATA['
						}
			];
			expect(() => structuredToXml(JSON.stringify(d))).toThrow();
		}
		const simple = JSON.parse(
			xmlToSimple('<r __proto__="safe"><constructor>data</constructor></r>')
		);
		expect(simple.root.attributes.__proto__).toBe('safe');
		expect({}).not.toHaveProperty('polluted');
	});
});
describe('XPath 1.0 typed bounded execution', () => {
	const ns = { o: 'urn:devbench:orders', soap: 'http://schemas.xmlsoap.org/soap/envelope/' };
	it.each([
		['//o:order', 2],
		['//o:order[@id="001"]', 1],
		['//o:order[2]/@id', 1],
		['//order', 0]
	])('queries namespaced elements, predicates, positions and attributes %s', (expression, n) =>
		expect(evaluateXPath(xmlSample, expression, ns).matches).toHaveLength(n)
	);
	it('scalar types are real values, including false/zero', () => {
		expect(evaluateXPath(xmlSample, 'count(//o:order)', ns)).toEqual({ type: 'number', value: 2 });
		expect(evaluateXPath(xmlSample, 'boolean(//o:missing)', ns)).toEqual({
			type: 'boolean',
			value: false
		});
		expect(evaluateXPath(xmlSample, 'string(//o:order[1]/@id)', ns)).toEqual({
			type: 'string',
			value: '001'
		});
	});
	it('supports SOAP and maps paths to the same outline', () => {
		const result = evaluateXPath(soapSample, '//o:Order[@status="paid"]/o:Customer', ns);
		expect(result.matches?.[0].value).toContain('Zoë');
		expect(xmlRows(parseXml(soapSample)).some((r) => r.id === result.matches?.[0].treeId)).toBe(
			true
		);
	});
	it('rejects invalid expressions, prefixes and result budgets', () => {
		expect(() => evaluateXPath(xmlSample, '//*[', ns)).toThrow(/XPath/);
		expect(() => evaluateXPath(xmlSample, '//unknown:Order', {})).toThrow();
		expect(() => evaluateXPath('<r>' + '<a/>'.repeat(1001) + '</r>', '//a', {})).toThrow(/1,000/);
		expect(() => evaluateXPath(xmlSample, 'x'.repeat(2049), {})).toThrow(/2,048/);
		expect(() => evaluateXPath(xmlSample, '//*', { '': 'urn:x' })).toThrow(/prefixes/);
	});
});
