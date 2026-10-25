import { afterEach, it, expect, vi } from 'vitest';
import { startOpenApiTask } from './openapi-client';
class FakeWorker {
	static last: FakeWorker;
	terminate = vi.fn();
	postMessage = vi.fn();
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onerror: ((event: { preventDefault: () => void }) => void) | null = null;
	constructor() {
		FakeWorker.last = this;
	}
}
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});
it('terminates cancelled workers and does not accept a late result', async () => {
	vi.stubGlobal('Worker', FakeWorker);
	const task = startOpenApiTask({ kind: 'parse', input: '{}', format: 'json' });
	const rejected = expect(task.promise).rejects.toThrow('cancelled');
	task.cancel();
	FakeWorker.last.onmessage?.({ data: { result: { title: 'late' } } });
	await rejected;
	expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(1);
});
it('enforces separate parser and diff wall-clock budgets and terminates failures', async () => {
	vi.stubGlobal('Worker', FakeWorker);
	vi.useFakeTimers();
	let task = startOpenApiTask({ kind: 'parse', input: '{}', format: 'json' });
	let rejected = expect(task.promise).rejects.toThrow('budget');
	await vi.advanceTimersByTimeAsync(2000);
	await rejected;
	expect(FakeWorker.last.terminate).toHaveBeenCalled();
	task = startOpenApiTask({
		kind: 'diff',
		input: '{}',
		format: 'auto',
		after: '{}',
		afterFormat: 'auto'
	});
	rejected = expect(task.promise).rejects.toThrow('budget');
	await vi.advanceTimersByTimeAsync(3500);
	await rejected;
	expect(FakeWorker.last.terminate).toHaveBeenCalled();
});
