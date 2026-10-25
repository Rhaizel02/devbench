import { parseContract } from './openapi-engine';
import { assertTextLimit, errorMessage } from '../tool-errors';
import { OPENAPI_LIMITS, type InputFormat } from './model';
export type OpenApiTask = { kind: 'parse'; input: string; format: InputFormat };
self.onmessage = (event: MessageEvent<OpenApiTask>) => {
	try {
		const task = event.data,
			result = parseContract(task.input, task.format);
		assertTextLimit(JSON.stringify(result), OPENAPI_LIMITS.resultBytes);
		self.postMessage({ result });
	} catch (error) {
		self.postMessage({ error: errorMessage(error) });
	}
};
