import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { countText } from '../src/lib/tools/string-toolkit/text-count';
import { validateGTIN } from '../src/lib/tools/test-data/gtin-engine';
import { tools } from '../src/lib/tools/tool-registry';
import { evidencePath, targetOrigin } from './support/environment';

async function layouts(page: Page, scene: string) {
	const measured = [];
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
		for (const theme of ['dark', 'light']) {
			await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
			await page.evaluate(() => document.fonts.ready);
			for (const editor of await page.locator('.cm-editor:visible').all()) {
				await editor.scrollIntoViewIfNeeded();
				await page.evaluate(
					() =>
						new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
				);
			}
			await page.evaluate(() => {
				(document.activeElement as HTMLElement)?.blur();
				scrollTo(0, 0);
			});
			const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
			expect(documentWidth).toBeLessThanOrEqual(width);
			measured.push({ scene, width, theme, documentWidth });
			if ((width === 1440 && theme === 'dark') || (width === 390 && theme === 'light'))
				await page.screenshot({
					path: evidencePath('v13-' + scene + '-' + theme + '-' + width + '.png'),
					fullPage: true,
					animations: 'disabled'
				});
		}
	}
	await mkdir(evidencePath('.'), { recursive: true });
	await writeFile(
		evidencePath('v13-' + scene + '-checks.json'),
		JSON.stringify(measured, null, 2) + '\n'
	);
}

function observe(page: Page) {
	const requests: string[] = [],
		consoleMessages: string[] = [],
		errors: string[] = [],
		failed: string[] = [];
	page.on('request', (request) =>
		requests.push(request.method() + ' ' + request.url() + (request.postData() ?? ''))
	);
	page.on('console', (message) => consoleMessages.push(message.type() + ': ' + message.text()));
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('response', (response) => {
		if (response.status() >= 400) failed.push(response.url());
	});
	return async (payloads: string[]) => {
		await page.waitForLoadState('networkidle');
		const state = await page.evaluate(async () => ({
			local: { ...localStorage },
			session: { ...sessionStorage },
			url: location.href,
			history: history.state,
			cookies: document.cookie,
			caches: await caches.keys(),
			databases: await indexedDB.databases()
		}));
		expect(Object.keys(state.local).every((key) => key === 'devbench.preferences.v1')).toBe(true);
		expect(state.cookies).toBe('');
		expect(state.caches).toEqual([]);
		expect(state.databases).toEqual([]);
		for (const payload of payloads)
			expect(JSON.stringify(state) + requests.join('') + consoleMessages.join('')).not.toContain(
				payload
			);
		expect(requests.filter((value) => !value.startsWith('GET ' + targetOrigin + '/'))).toEqual([]);
		expect(errors).toEqual([]);
		expect(failed).toEqual([]);
		expect(consoleMessages.filter((value) => value.startsWith('error:'))).toEqual([]);
	};
}

test('V1.3 live Unicode counter preserves transforms, handles limits without truncating, resets and stays private', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const assertPrivate = observe(page);
	expect((await page.goto('/tools/string-toolkit/'))?.status()).toBe(200);
	const input = page.getByRole('textbox', { name: 'String input', exact: true });
	await expect(page.getByTestId('count-characters')).toHaveText('0');
	const unicode = 'e\u0301👨‍👩‍👧‍👦\n\nCafé 世界';
	await input.fill(unicode);
	for (const [name, value] of Object.entries(countText(unicode))) {
		const id = {
			characters: 'characters',
			withoutWhitespace: 'without-whitespace',
			words: 'words',
			lines: 'lines',
			bytes: 'bytes',
			utf16: 'utf16'
		}[name];
		if (id) await expect(page.getByTestId('count-' + id)).toHaveText(String(value));
	}
	await page.getByLabel('Character limit', { exact: true }).fill('2');
	await expect(page.getByTestId('character-budget')).toHaveText(
		'11 used · 0 remaining · 9 exceeded'
	);
	await expect(input).toContainText('Café 世界');
	await page.getByRole('button', { name: 'Transform text', exact: true }).click();
	await page.getByRole('button', { name: 'Copy slug', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('é-café-世界');
	await layouts(page, 'string-counter');
	await input.fill('é'.repeat(32769));
	await expect(page.getByRole('status').filter({ hasText: '64 KiB' })).toBeVisible();
	await expect(page.getByTestId('count-characters')).toHaveCount(0);
	await expect(input).toContainText('é'.repeat(100));
	const marker = 'synthetic-v13-private-700a';
	await input.fill(marker);
	await expect(page.getByTestId('count-characters')).toHaveText(String(marker.length));
	await assertPrivate([marker]);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(input).toHaveText('');
	await expect(page.getByTestId('count-characters')).toHaveText('0');
	expect((await page.reload())?.status()).toBe(200);
	await expect(input).toHaveText('');
});

test('V1.3 text generator joins navigation, produces verified lengths and real downloads, invalidates and reloads empty', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const assertPrivate = observe(page);
	expect(tools).toHaveLength(27);
	await page.goto('/');
	await expect(page.getByText('27 tools · 27 available', { exact: true })).toBeVisible();
	await page.keyboard.press('Control+k');
	await page.getByRole('combobox', { name: 'Find a tool', exact: true }).fill('lorem');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/test-data-generator/);
	await page.getByRole('button', { name: 'Pin tool', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByLabel('Text amount', { exact: true }).fill('57');
	await page.getByRole('button', { name: 'Generate text', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	const output = await page.evaluate(() => navigator.clipboard.readText());
	expect(countText(output).characters).toBe(57);
	const downloaded = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const file = await downloaded;
	expect(file.suggestedFilename()).toBe('devbench-test-text.txt');
	expect(await readFile((await file.path())!, 'utf8')).toBe(output);
	await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(countText(await page.evaluate(() => navigator.clipboard.readText())).characters).toBe(57);
	await layouts(page, 'test-text');
	await page.getByLabel('Text length mode', { exact: true }).selectOption('maximum');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByLabel('Text amount', { exact: true }).fill('1');
	await page.getByRole('button', { name: 'Generate text', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('');
	await page.getByLabel('Text amount', { exact: true }).fill('32769');
	await page.getByRole('button', { name: 'Generate text', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('32,768');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await assertPrivate([output]);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Generated text', exact: true })).toHaveCount(0);
	expect((await page.reload())?.status()).toBe(200);
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('link', { name: 'Tools', exact: true }).click();
	await expect(
		page.getByRole('link', { name: /Test Data Generator.*Open workspace/ }).first()
	).toBeVisible();
	expect((await page.request.get('/tools/unknown-v13-tool/')).status()).toBe(404);
});

test('V1.3 GTIN batch and manual validation preserve zeroes, validate checksums, export and reject exhaustion privately', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const assertPrivate = observe(page);
	expect((await page.goto('/tools/test-data-generator/'))?.status()).toBe(200);
	await page.getByLabel('Test data utility', { exact: true }).selectOption('gtin');
	await expect(
		page.getByText(
			'Structurally valid GTINs for testing only. Valid checksum does not imply GS1 assignment or identification of a real product.',
			{ exact: true }
		)
	).toBeVisible();
	await page.getByLabel('GTIN format', { exact: true }).selectOption('gtin14');
	await page.getByLabel('GTIN quantity', { exact: true }).fill('10');
	await page.getByLabel('GTIN prefix', { exact: true }).fill('00');
	await page.getByRole('button', { name: 'Generate GTINs', exact: true }).click();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	// The Windows clipboard exposes LF text as CRLF; validate each unchanged identifier.
	const batch = (await page.evaluate(() => navigator.clipboard.readText())).split(/\r?\n/);
	expect(new Set(batch).size).toBe(10);
	expect(
		batch.every((value) => value.startsWith('00') && validateGTIN(value, 'gtin14').valid)
	).toBe(true);
	await page.getByRole('button', { name: 'Copy GTIN 1', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(batch[0]);
	await page.getByLabel('GTIN export format', { exact: true }).selectOption('csv');
	const downloaded = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const file = await downloaded;
	expect(file.suggestedFilename()).toBe('devbench-gtins.csv');
	expect(await readFile((await file.path())!, 'utf8')).toBe(
		'"gtin"\n' + batch.map((value) => '"' + value + '"').join('\n')
	);
	await page.getByLabel('Manual GTIN', { exact: true }).fill('09506000134352');
	await page.getByRole('button', { name: 'Validate GTIN', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Valid length' })).toBeVisible();
	await page.getByLabel('Manual GTIN', { exact: true }).fill('09506000134353');
	await expect(page.getByRole('button', { name: 'Copy validated GTIN', exact: true })).toHaveCount(
		0
	);
	await page.getByRole('button', { name: 'Validate GTIN', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Invalid GS1');
	await page.getByLabel('Manual GTIN', { exact: true }).fill('0000000000000');
	await page.getByRole('button', { name: 'Complete check digit', exact: true }).click();
	await page.getByRole('button', { name: 'Copy validated GTIN', exact: true }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('00000000000000');
	await layouts(page, 'gtin');
	await page.getByLabel('GTIN quantity', { exact: true }).fill('11');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByLabel('GTIN prefix', { exact: true }).fill('000000000000');
	await page.getByRole('button', { name: 'Generate GTINs', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Not enough distinct');
	const marker = 'synthetic-gtin-private-v13-417a';
	await page.getByLabel('Manual GTIN', { exact: true }).fill(marker);
	await page.getByRole('button', { name: 'Validate GTIN', exact: true }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'ASCII digits' })).toBeVisible();
	await assertPrivate([marker, ...batch]);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByLabel('Manual GTIN', { exact: true })).toHaveValue('');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	expect((await page.reload())?.status()).toBe(200);
	await page.getByLabel('Test data utility', { exact: true }).selectOption('gtin');
	await expect(page.getByLabel('Manual GTIN', { exact: true })).toHaveValue('');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
});
