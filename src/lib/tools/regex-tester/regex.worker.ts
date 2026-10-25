import { evaluateRegex, type RegexInput } from './regex-engine';
import { errorMessage } from '../tool-errors';
self.onmessage = (event: MessageEvent<RegexInput>) => {
	try {
		self.postMessage({ result: evaluateRegex(event.data) });
	} catch (reason) {
		self.postMessage({ error: errorMessage(reason) });
	}
};
