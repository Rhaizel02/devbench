import { parseExplain, explainFindings, planSummary, comparePlans } from './explain-engine';
import { assertTextLimit, errorMessage } from '../tool-errors';
export type ExplainTask = { input: string; after?: string };
self.onmessage = (event: MessageEvent<ExplainTask>) => {
	try {
		const doc = parseExplain(event.data.input);
		const after = event.data.after === undefined ? undefined : parseExplain(event.data.after);
		const result =
			after !== undefined
				? {
						before: doc,
						after,
						comparison: comparePlans(doc, after)
					}
				: { doc, summary: planSummary(doc), findings: explainFindings(doc) };
		assertTextLimit(JSON.stringify(result), 8 * 1024 * 1024);
		self.postMessage({ result });
	} catch (e) {
		self.postMessage({ error: errorMessage(e) });
	}
};
