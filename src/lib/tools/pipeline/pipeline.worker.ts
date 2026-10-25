import { runPipeline, type PipelineStep } from './pipeline-engine';
import { errorMessage } from '../tool-errors';
self.onmessage = (event: MessageEvent<{ input: string; steps: PipelineStep[] }>) => {
	try {
		self.postMessage({ result: runPipeline(event.data.input, event.data.steps) });
	} catch (error) {
		self.postMessage({ error: errorMessage(error) });
	}
};
