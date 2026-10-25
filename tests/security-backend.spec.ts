import { evidencePath } from './support/environment';
import { test, expect } from '@playwright/test';

test('JWT is decoded without verification, hashes and dialect formatting are real', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/tools/jwt-inspector/');
	await expect(page.getByRole('note')).toHaveText('Decoded only — signature NOT verified.');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Decode JWT', exact: true }).click();
	await expect(page.getByText('Claimed expiration has passed', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
		'signature NOT verified'
	);
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	}
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({ path: evidencePath('13-jwt-dark-desktop.png'), fullPage: true });
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({ path: evidencePath('14-jwt-light-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/hash-generator/');
	await page.getByRole('textbox', { name: 'Text to hash', exact: true }).fill('abc');
	await page.getByRole('button', { name: 'Calculate hash', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Hex digest', exact: true })).toHaveText(
		'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
	);
	await page.goto('/tools/sql-formatter/');
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('button', { name: 'Format SQL', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Formatted SQL', exact: true })).toContainText(
		'SELECT'
	);
	await expect(page.getByRole('textbox', { name: 'Formatted SQL', exact: true })).toContainText(
		'$1'
	);
	await page.getByLabel('SQL dialect', { exact: true }).selectOption('sqlite');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
});

test('catastrophic regex terminates its worker, keeps UI responsive and permits retry', async ({
	page
}) => {
	await page.addInitScript(() => {
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			terminate() {
				document.documentElement.dataset.terminations = String(
					Number(document.documentElement.dataset.terminations ?? 0) + 1
				);
				super.terminate();
			}
		};
	});
	await page.goto('/tools/regex-tester/');
	const pattern = page.getByRole('textbox', { name: 'Regex pattern', exact: true });
	await pattern.fill('(a+)+$');
	await page
		.getByRole('textbox', { name: 'Regex test text', exact: true })
		.fill('a'.repeat(5000) + '!');
	await page.evaluate(() => {
		const id = setInterval(() => {
			document.documentElement.dataset.beats = String(
				Number(document.documentElement.dataset.beats ?? 0) + 1
			);
		}, 25);
		setTimeout(() => clearInterval(id), 2000);
	});
	await page.getByRole('button', { name: 'Test regex', exact: true }).click();
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.getByRole('alert')).toContainText('worker was terminated', { timeout: 5000 });
	expect(
		await page.evaluate(() => Number(document.documentElement.dataset.terminations))
	).toBeGreaterThanOrEqual(1);
	expect(await page.evaluate(() => Number(document.documentElement.dataset.beats))).toBeGreaterThan(
		5
	);
	await page.getByRole('button', { name: 'Load synthetic example', exact: true }).click();
	await page.getByRole('checkbox', { name: 'Replacement preview', exact: true }).check();
	await page.getByRole('button', { name: 'Test regex', exact: true }).click();
	await expect(page.getByText('3 matches.', { exact: true })).toBeVisible();
	await expect(page.locator('.result-code').last()).toHaveText(
		'Synthetic example: [café] [world] [café]'
	);
	await pattern.fill('[');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Test regex', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Invalid ECMAScript');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(pattern).toHaveValue('');
});
