import { test, expect } from './support/test';
import { readFile, mkdir } from 'node:fs/promises';
import { evidencePath } from './support/environment';
test('Pipeline V2 actual configuration-only import/export, reorder/disable, bytes and privacy', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const marker = 'PRIVATE_V22_PIPELINE_雪';
	const requests: string[] = [],
		messages: string[] = [];
	page.on('request', (r) => requests.push(r.url() + ' ' + (r.postData() ?? '')));
	page.on('console', (m) => messages.push(m.text()));
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tools/pipeline-builder/');
	await expect(page.locator('.cm-content[aria-label="Pipeline input"]')).toBeVisible();
	await page
		.getByRole('textbox', { name: 'Pipeline input', exact: true })
		.fill('  ' + marker + ' fixture  ');
	await page.getByLabel('Synthetic pipeline recipe').selectOption('3');
	await page.getByRole('button', { name: 'Load recipe', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Pipeline input', exact: true })).toHaveText(
		'  ' + marker + ' fixture  '
	);
	await page.getByRole('button', { name: 'Duplicate step 2', exact: true }).click();
	await page.getByLabel('Enable step 2', { exact: true }).uncheck();
	await page.getByRole('button', { name: 'Move step 4 up', exact: true }).click();
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.getByLabel('Pipeline step results')).toContainText('skipped');
	await page.getByRole('button', { name: 'Preview step 1', exact: true }).click();
	await expect(
		page.getByRole('textbox', { name: 'Intermediate step 1', exact: true })
	).toContainText(marker);
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(
		marker.toLowerCase() + ' dataset'
	);
	const out = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	expect(await readFile((await (await out).path())!, 'utf8')).toBe(
		marker.toLowerCase() + ' dataset'
	);
	await page
		.getByRole('button', { name: 'Drag step 3', exact: true })
		.dragTo(page.locator('.pipeline-step').nth(3));
	await expect(page.getByLabel('Step 4 operation', { exact: true })).toHaveValue('text-replace');
	await page.locator('.recipe-configuration summary').click();
	await page.getByLabel('Recipe name', { exact: true }).fill('Synthetic fixture recipe');
	const dl = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download recipe', exact: true }).click();
	const config = await readFile((await (await dl).path())!, 'utf8');
	expect(config).not.toContain(marker);
	expect(JSON.parse(config)).toMatchObject({
		format: 'devbench.pipeline',
		version: 1,
		name: 'Synthetic fixture recipe'
	});
	expect(config).not.toContain('uid');
	await page.getByRole('button', { name: 'Copy recipe', exact: true }).click();
	expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(
		config
	);
	const input = await page
		.getByRole('textbox', { name: 'Pipeline input', exact: true })
		.textContent();
	await page.getByLabel('Import recipe JSON', { exact: true }).setInputFiles({
		name: 'bad.json',
		mimeType: 'application/json',
		buffer: Buffer.from(
			'{"format":"devbench.pipeline","version":1,"name":"bad","description":"","steps":[{"operation":"text-trim","__proto__":{}}]}'
		)
	});
	await expect(page.getByRole('alert')).toContainText('unknown');
	await expect(page.getByRole('textbox', { name: 'Pipeline input', exact: true })).toHaveText(
		input!
	);
	await page.getByLabel('Import recipe JSON', { exact: true }).setInputFiles({
		name: 'recipe.json',
		mimeType: 'application/json',
		buffer: Buffer.from(config)
	});
	await expect(page.getByLabel('Recipe name', { exact: true })).toHaveValue(
		'Synthetic fixture recipe'
	);
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeEnabled();
	await mkdir(evidencePath('.'), { recursive: true });
	await page.evaluate(async () => {
		(document.activeElement as HTMLElement)?.blur();
		await document.fonts.ready;
		scrollTo(0, 0);
	});
	await page.screenshot({ path: evidencePath('v22-pipeline-recipe.png'), fullPage: true });
	expect(requests.join(' ')).not.toContain(marker);
	expect(messages.join(' ')).not.toContain(marker);
	expect(page.url()).not.toContain(marker);
	expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
	expect(
		await page.evaluate(() =>
			JSON.stringify({
				local: { ...localStorage },
				session: { ...sessionStorage },
				cookie: document.cookie,
				state: history.state
			})
		)
	).not.toContain(marker);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Pipeline input', exact: true })).toHaveText('');
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'Pipeline input', exact: true })).toHaveText('');
});
test('Pipeline V2 worker cancellation, safe XML operation and source edits invalidate results', async ({
	page
}) => {
	await page.goto('/tools/pipeline-builder/');
	await expect(page.locator('.cm-content[aria-label="Pipeline input"]')).toBeVisible();
	await page
		.getByRole('textbox', { name: 'Pipeline input', exact: true })
		.fill('<r>Hello <b>雪</b> !</r>');
	await page.getByLabel('Step 1 operation', { exact: true }).selectOption('xml-minify');
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Pipeline output', exact: true })).toHaveText(
		'<r>Hello <b>雪</b> !</r>'
	);
	await page
		.getByRole('textbox', { name: 'Pipeline input', exact: true })
		.fill('<!DOCTYPE r SYSTEM "https://example.invalid"><r/>');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.locator('.parse-error').first()).toContainText('Step 1 failed');
	await page.getByLabel('Step 1 operation', { exact: true }).selectOption('text-trim');
	await page.getByRole('textbox', { name: 'Pipeline input', exact: true }).fill('  cancel me  ');
	if (process.env.DEVBENCH_OFFLINE_MODE === '1') {
		// Cached SW responses bypass page.route. Cancel the real new worker through its actual UI.
		await page.getByRole('button', { name: 'Run pipeline', exact: true }).evaluate(
			(run) =>
				new Promise<void>((resolve) => {
					const observer = new MutationObserver(cancel);
					function cancel() {
						const button = [...document.querySelectorAll('button')].find(
							(item) => item.textContent?.trim() === 'Cancel running pipeline'
						);
						if (button) {
							observer.disconnect();
							button.click();
							resolve();
						}
					}
					observer.observe(document.body, { childList: true, subtree: true });
					(run as HTMLElement).click();
					queueMicrotask(cancel);
				})
		);
	} else {
		let requested!: () => void, release!: () => void;
		const hit = new Promise<void>((r) => (requested = r)),
			gate = new Promise<void>((r) => (release = r));
		await page.route(/pipeline\.worker.*\.js/, async (route) => {
			requested();
			await gate;
			await route.continue().catch(() => {});
		});
		await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
		await hit;
		await page.getByRole('button', { name: 'Cancel running pipeline', exact: true }).click();
		release();
	}
	await expect(page.locator('.parse-error').first()).toContainText('cancelled');
	await page.unroute(/pipeline\.worker.*\.js/);
	await page.getByRole('button', { name: 'Run pipeline', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Pipeline output', exact: true })).toHaveText(
		'cancel me'
	);
	await page.getByLabel('Step 1 operation', { exact: true }).selectOption('text-case');
	await expect(page.getByRole('button', { name: 'Copy output', exact: true })).toBeDisabled();
});
