import { test, expect } from '@playwright/test';
import { CACHE_PREFIX } from '../../src/lib/pwa/policy';

test('PWA actual Cache Storage quota rejection is recoverable and never reports Ready', async ({
	page,
	context,
	request,
	baseURL
}) => {
	await request.post('/__pwa_test__/control', { data: { active: 'a' } });
	await page.goto('/');
	const cdp = await context.newCDPSession(page);
	await cdp.send('Storage.overrideQuotaForOrigin', { origin: baseURL!, quotaSize: 1024 });
	try {
		await page.getByRole('button', { name: 'Offline and install', exact: true }).click();
		await page.getByRole('button', { name: 'Prepare offline', exact: true }).click();
		await expect(page.getByRole('alert')).toContainText(/quota|download|resources/i, {
			timeout: 90_000
		});
		await expect(page.locator('[data-offline-state="ready"]')).toHaveCount(0);
		expect(
			await page.evaluate(async (prefix) => {
				for (const name of await caches.keys())
					if (
						name.startsWith(prefix) &&
						(await (await caches.open(name)).match('/offline-build.json'))
					)
						return true;
				return false;
			}, CACHE_PREFIX)
		).toBe(false);
		await page.screenshot({ path: 'screenshots/actual/v23-cache-quota-error.png', fullPage: true });
	} finally {
		await cdp.send('Storage.overrideQuotaForOrigin', { origin: baseURL! });
		await cdp.detach();
	}
	await page.getByRole('button', { name: 'Retry offline preparation', exact: true }).click();
	await expect(page.locator('[data-offline-state="ready"]')).toBeVisible({ timeout: 90_000 });
});
