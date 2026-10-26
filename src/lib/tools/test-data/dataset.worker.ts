import { generateDataset, type DatasetSpec } from './dataset-engine';
import { errorMessage } from '../tool-errors';
self.onmessage = (event: MessageEvent<DatasetSpec>) => {
	try {
		self.postMessage({ result: generateDataset(event.data) });
	} catch (error) {
		self.postMessage({ error: errorMessage(error) });
	}
};
