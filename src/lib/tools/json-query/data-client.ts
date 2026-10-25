import type { DataTask } from './data.worker';
import { ToolError } from '../tool-errors';
export function startDataTask<T>(task: DataTask): { promise: Promise<T>; cancel: () => void } {
	const worker = new Worker(new URL('./data.worker.ts', import.meta.url), { type: 'module' });
	let stop: () => void = () => {};
	const promise = new Promise<T>((resolve, reject) => {
		const finish = () => {
			clearTimeout(timer);
			worker.terminate();
		};
		const timer = setTimeout(() => {
			finish();
			reject(
				new ToolError(
					'Operation exceeded 1.5 seconds. Worker terminated; simplify the input or schema and retry.'
				)
			);
		}, 1500);
		stop = () => {
			finish();
			reject(new ToolError('Operation cancelled.'));
		};
		worker.onmessage = (event) => {
			finish();
			if (event.data.error) reject(new ToolError(event.data.error));
			else resolve(event.data.result);
		};
		worker.onerror = (event) => {
			event.preventDefault();
			finish();
			reject(new ToolError('Worker failed. Simplify the input and retry.'));
		};
		worker.postMessage(task);
	});
	return { promise, cancel: () => stop() };
}
