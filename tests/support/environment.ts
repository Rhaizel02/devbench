import path from 'node:path';
export const targetOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173')
	.origin;
export const evidenceDirectory =
	process.env.DEVBENCH_OFFLINE_MODE === '1'
		? 'work/v23-offline-regressions'
		: process.env.PLAYWRIGHT_BASE_URL
			? 'screenshots/production'
			: 'screenshots/actual';
export const evidencePath = (filename: string) => path.join(evidenceDirectory, filename);
