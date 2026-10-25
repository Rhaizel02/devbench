import { countText } from './text-count';
import { errorMessage } from '../tool-errors';
self.onmessage = (event: MessageEvent<string>) => {
	try {
		self.postMessage({ result: countText(event.data) });
	} catch (error) {
		self.postMessage({ error: errorMessage(error) });
	}
};
