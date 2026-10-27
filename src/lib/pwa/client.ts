import type { OfflineStatus } from './policy';
export type WorkerReply = Partial<OfflineStatus> & { applying?: boolean; activeVersion?: string };
export function workerMessage(
	worker: ServiceWorker,
	type: 'STATUS' | 'PREPARE' | 'APPLY',
	build?: string
): Promise<WorkerReply> {
	return new Promise((resolve, reject) => {
		const channel = new MessageChannel();
		const timer = setTimeout(
			() => {
				channel.port1.close();
				reject(new Error('Offline status is unavailable. Retry when the browser is ready.'));
			},
			type === 'PREPARE' ? 120_000 : 10_000
		);
		channel.port1.onmessage = ({ data }) => {
			clearTimeout(timer);
			channel.port1.close();
			if (data?.error) reject(new Error(String(data.error)));
			else resolve(data as WorkerReply);
		};
		worker.postMessage({ type, ...(build ? { build } : {}) }, [channel.port2]);
	});
}
export function waitForActivation(worker: ServiceWorker): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			worker.removeEventListener('statechange', changed);
			reject(
				new Error('Update activation is taking longer than expected. Keep working and retry.')
			);
		}, 15_000);
		function changed() {
			if (worker.state !== 'activated' && worker.state !== 'redundant') return;
			clearTimeout(timer);
			worker.removeEventListener('statechange', changed);
			if (worker.state === 'activated') resolve();
			else reject(new Error('The new version could not activate. Your current work is unchanged.'));
		}
		worker.addEventListener('statechange', changed);
		changed();
	});
}
