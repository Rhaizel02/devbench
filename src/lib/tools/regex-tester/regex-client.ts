import { ToolError } from '../tool-errors';
import { validateRegexInput, type RegexInput, type RegexResult } from './regex-engine';
export function startRegex(
	input: RegexInput,
	timeout = 500
): { promise: Promise<RegexResult>; cancel: () => void } {
	validateRegexInput(input);
	let worker: Worker;
	try {
		worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' });
	} catch {
		throw new ToolError('Regex worker could not start. Check browser support and reload.');
	}
	let timer: ReturnType<typeof setTimeout>;
	let rejectPending: (reason: Error) => void;
	let settled = false;
	const finish = () => {
		settled = true;
		clearTimeout(timer);
		worker.terminate();
	};
	const promise = new Promise<RegexResult>((resolve, reject) => {
		rejectPending = reject;
		timer = setTimeout(() => {
			finish();
			reject(
				new ToolError(
					'Regex timed out after 500 ms. The worker was terminated. Simplify the pattern or shorten the text, then retry.'
				)
			);
		}, timeout);
		worker.onmessage = (event: MessageEvent<{ result?: RegexResult; error?: string }>) => {
			finish();
			if (event.data.result) resolve(event.data.result);
			else reject(new ToolError(event.data.error ?? 'Regex worker failed.'));
		};
		worker.onerror = (event) => {
			event.preventDefault();
			finish();
			reject(new ToolError('Regex worker failed. Retry with a simpler expression.'));
		};
		worker.postMessage(input);
	});
	return {
		promise,
		cancel() {
			if (!settled) {
				finish();
				rejectPending(new ToolError('Regex cancelled. The worker was terminated.'));
			}
		}
	};
}
