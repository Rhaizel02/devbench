export * from '@playwright/test';
import { test as base } from '@playwright/test';
import { prepareOffline, verifyStaticCache } from './pwa';
import { readFile } from 'node:fs/promises';
import type { StaticInventory } from '../../src/lib/pwa/policy';
export const test = base.extend({
	context: async ({ context, baseURL }, use) => {
		const offline = process.env.DEVBENCH_OFFLINE_MODE === '1';
		let inventory: StaticInventory | undefined;
		if (offline) {
			await context.request.post('/__pwa_test__/control', { data: { active: 'a' } });
			const page = await context.newPage();
			await prepareOffline(page);
			inventory = await page.evaluate(async () => (await fetch('/offline-build.json')).json());
			await context.setOffline(true);
			await page.close();
		}
		await use(context);
		if (offline && inventory) await verifyStaticCache(context, inventory, baseURL!);
	}
});
// Eager validation is deliberately avoided: ordinary online tests need no offline artifacts.
export async function offlineArtifacts() {
	return JSON.parse(await readFile('work/v23-offline-artifacts.json', 'utf8')) as {
		aRoot: string;
		bRoot: string;
		aVersion: string;
		bVersion: string;
	};
}
