import { ToolError } from '../tool-errors';
// A worker belongs to one invocation, never to a shared SSR module or workspace cache.
export function runDiagnosticTask<T>(
	worker: Worker,
	task: unknown,
	budget = 3000
): { promise: Promise<T>; cancel: () => void } {
	let cancel = () => {};
	const promise = new Promise<T>((resolve, reject) => {
		let settled = false;
		const finish = () => {
			settled = true;
			clearTimeout(timer);
			worker.terminate();
		};
		const timer = setTimeout(() => {
			finish();
			reject(
				new ToolError(
					'Processing budget exceeded. Worker terminated; reduce the input or query and retry.'
				)
			);
		}, budget);
		cancel = () => {
			if (!settled) {
				finish();
				reject(new ToolError('Operation cancelled. Input is preserved.'));
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
			if (settled) return;
			finish();
			reject(new ToolError('Processing failed. Input is preserved.'));
		};
		worker.postMessage(task);
	});
	return { promise, cancel: () => cancel() };
}
