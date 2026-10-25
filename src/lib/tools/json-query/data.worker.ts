import { queryJson } from './query-engine';
import { validateDocument, inferSchema } from '../json-schema/schema-engine';
import { errorMessage, assertTextLimit } from '../tool-errors';
export type DataTask = {
	kind: 'query' | 'validate' | 'infer';
	input: string;
	option: string;
	multiple?: boolean;
};
self.onmessage = (event: MessageEvent<DataTask>) => {
	try {
		const task = event.data;
		const result =
			task.kind === 'query'
				? queryJson(task.input, task.option)
				: task.kind === 'validate'
					? validateDocument(task.option, task.input)
					: inferSchema(task.input, task.multiple);
		assertTextLimit(JSON.stringify(result), 2 * 1024 * 1024);
		self.postMessage({ result });
	} catch (error) {
		self.postMessage({ error: errorMessage(error) });
	}
};
