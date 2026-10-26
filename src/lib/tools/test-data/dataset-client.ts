import type { DatasetSpec, DatasetResult } from './dataset-engine';
import { ToolError } from '../tool-errors';
export function startDataset(spec: DatasetSpec) {
	const worker = new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' });
	let cancel = () => {};
	const promise = new Promise<DatasetResult>((resolve, reject) => {
		let done = false;
		const finish = () => {
			if (done) return false;
			done = true;
			clearTimeout(timer);
			worker.terminate();
			return true;
		};
		const timer = setTimeout(() => {
			if (finish())
				reject(
					new ToolError(
						'Dataset exceeded 2 seconds. Worker terminated; reduce rows or field lengths.'
					)
				);
		}, 2000);
		cancel = () => {
			if (finish()) reject(new ToolError('Dataset cancelled.'));
		};
		worker.onmessage = (event) => {
			if (!finish()) return;
			if (event.data.error) reject(new ToolError(event.data.error));
			else resolve(event.data.result);
		};
		worker.onerror = (event) => {
			event.preventDefault();
			if (finish()) reject(new ToolError('Dataset worker failed. Reduce the schema and retry.'));
		};
		worker.postMessage(spec);
	});
	return { promise, cancel: () => cancel() };
}
