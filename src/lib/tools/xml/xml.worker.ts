import {
	parseXml,
	formatXml,
	minifyXml,
	xmlToStructured,
	structuredToXml,
	xmlToSimple,
	evaluateXPath,
	xmlRows,
	xmlStats
} from './xml-engine';
import { errorMessage, assertTextLimit } from '../tool-errors';
export type XmlTask = {
	kind: 'validate' | 'format' | 'minify' | 'tree' | 'xpath' | 'structured' | 'simple' | 'from-json';
	input: string;
	indent?: 2 | 4;
	reindent?: boolean;
	expression?: string;
	namespaces?: Record<string, string>;
};
self.onmessage = (event: MessageEvent<XmlTask>) => {
	try {
		const t = event.data;
		const result =
			t.kind === 'xpath'
				? (() => {
						const doc = parseXml(t.input);
						return {
							xpath: evaluateXPath(t.input, t.expression ?? '', t.namespaces ?? {}),
							rows: xmlRows(doc),
							stats: xmlStats(doc)
						};
					})()
				: t.kind === 'structured'
					? { output: xmlToStructured(t.input), json: true, reversible: true }
					: t.kind === 'simple'
						? { output: xmlToSimple(t.input), json: true }
						: t.kind === 'from-json'
							? { output: structuredToXml(t.input), json: false }
							: t.kind === 'tree' || t.kind === 'validate'
								? (() => {
										const doc = parseXml(t.input);
										return { rows: xmlRows(doc), stats: xmlStats(doc), valid: true };
									})()
								: {
										output:
											t.kind === 'format'
												? formatXml(t.input, t.indent ?? 2, t.reindent ?? false)
												: minifyXml(t.input),
										json: false
									};
		assertTextLimit(JSON.stringify(result), 8 * 1024 * 1024);
		self.postMessage({ result });
	} catch (e) {
		self.postMessage({ error: errorMessage(e) });
	}
};
