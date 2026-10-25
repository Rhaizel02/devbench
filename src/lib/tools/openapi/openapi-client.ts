import { ToolError, assertTextLimit } from '../tool-errors';
import { OPENAPI_LIMITS, type Contract, type ContractDiff } from './model';
import type { OpenApiTask } from './openapi.worker';
export function startOpenApiTask<T extends Contract | ContractDiff = Contract>(
	task: OpenApiTask
): {
	promise: Promise<T>;
	cancel: () => void;
} {
	assertTextLimit(task.input, OPENAPI_LIMITS.bytes);
	if (task.kind === 'diff') assertTextLimit(task.after, OPENAPI_LIMITS.bytes);
	const worker = new Worker(new URL('./openapi.worker.ts', import.meta.url), { type: 'module' });
	let cancel = () => {},
		settled = false;
	const promise = new Promise<T>((resolve, reject) => {
		const finish = () => {
			settled = true;
			clearTimeout(timer);
			worker.terminate();
		};
		const timer = setTimeout(
			() => {
				finish();
				reject(
					new ToolError(
						'Processing budget exceeded. Worker terminated; reduce the input and retry.'
					)
				);
			},
			task.kind === 'diff' ? OPENAPI_LIMITS.diffMs : OPENAPI_LIMITS.parseMs
		);
		cancel = () => {
			if (!settled) {
				finish();
				reject(new ToolError('Operation cancelled.'));
			}
		};
		worker.onmessage = (event) => {
			if (settled) return;
			finish();
			if (event.data.error) reject(new ToolError(event.data.error));
			else resolve(event.data.result as T);
		};
		worker.onerror = (event) => {
			event.preventDefault();
			if (!settled) {
				finish();
				reject(new ToolError('Contract worker failed. Input is preserved.'));
			}
		};
		worker.postMessage(task);
	});
	return { promise, cancel: () => cancel() };
}
