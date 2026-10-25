import { ToolError } from '../tool-errors';
import type { TextStatistics } from './text-count';
export function startTextCount(input: string) {
	const worker = new Worker(new URL('./count.worker.ts', import.meta.url), { type: 'module' });
	let stop = () => {};
	const promise = new Promise<TextStatistics>((resolve, reject) => {
		const finish = () => {
			clearTimeout(timer);
			worker.terminate();
		};
		const timer = setTimeout(() => {
			finish();
			reject(new ToolError('Counting timed out. Reduce the input and retry.'));
		}, 1500);
		stop = () => {
			finish();
			reject(new ToolError('Counting cancelled.'));
		};
		worker.onmessage = (event) => {
			finish();
			if (event.data.error) reject(new ToolError(event.data.error));
			else resolve(event.data.result);
		};
		worker.onerror = (event) => {
			event.preventDefault();
			finish();
			reject(new ToolError('Counting worker is unavailable.'));
		};
		worker.postMessage(input);
	});
	return { promise, cancel: () => stop() };
}
