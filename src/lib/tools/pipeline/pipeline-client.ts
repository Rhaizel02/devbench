import type { PipelineStep, PipelineResult } from './pipeline-engine';
import { ToolError } from '../tool-errors';
export function startPipeline(
	input: string,
	steps: PipelineStep[]
): { promise: Promise<PipelineResult>; cancel: () => void } {
	const worker = new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' });
	let cancel = () => {};
	const promise = new Promise<PipelineResult>((resolve, reject) => {
		const finish = () => {
			clearTimeout(timer);
			worker.terminate();
		};
		const timer = setTimeout(() => {
			finish();
			reject(
				new ToolError(
					'Pipeline exceeded 1.5 seconds. Worker terminated; reduce input or steps and retry.'
				)
			);
		}, 1500);
		cancel = () => {
			finish();
			reject(new ToolError('Pipeline cancelled.'));
		};
		worker.onmessage = (event) => {
			finish();
			if (event.data.error) reject(new ToolError(event.data.error));
			else resolve(event.data.result);
		};
		worker.onerror = (event) => {
			event.preventDefault();
			finish();
			reject(new ToolError('Pipeline worker failed. Retry with a smaller input.'));
		};
		worker.postMessage({ input, steps });
	});
	return { promise, cancel: () => cancel() };
}
