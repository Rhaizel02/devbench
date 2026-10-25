import { parseContract } from './openapi-engine';
import { compareContracts } from './diff-engine';
import { assertTextLimit, errorMessage } from '../tool-errors';
import { OPENAPI_LIMITS, type InputFormat } from './model';
export type OpenApiTask =
	| { kind: 'parse'; input: string; format: InputFormat }
	| { kind: 'diff'; input: string; format: InputFormat; after: string; afterFormat: InputFormat };
self.onmessage = (event: MessageEvent<OpenApiTask>) => {
	try {
		const task = event.data,
			result =
				task.kind === 'diff'
					? compareContracts(
							parseContract(task.input, task.format),
							parseContract(task.after, task.afterFormat)
						)
					: parseContract(task.input, task.format);
		assertTextLimit(JSON.stringify(result), OPENAPI_LIMITS.resultBytes);
		self.postMessage({ result });
	} catch (error) {
		self.postMessage({ error: errorMessage(error) });
	}
};
