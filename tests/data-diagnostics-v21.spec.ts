import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { smallPlan, complexPlan } from '../src/lib/tools/sql-explain/fixtures';
import { soapSample } from '../src/lib/tools/xml/fixtures';
import { evidencePath } from './support/environment';
const sql = '/tools/sql-explain-analyzer/',
	xml = '/tools/xml-toolkit/';
async function source(page: Page, name: string, text: string) {
	const editor = page.getByRole('textbox', { name, exact: true });
	await expect(editor).toBeVisible();
	await page.waitForFunction(
		(name) => !!document.querySelector(`.cm-content[aria-label="${name}"]`),
		name
	);
	await editor.fill(text);
}
async function screenshot(page: Page, name: string) {
	await mkdir(evidencePath('.'), { recursive: true });
	await page.evaluate(async () => {
		await document.fonts.ready;
		(document.activeElement as HTMLElement)?.blur();
		scrollTo(0, 0);
	});
	await page.screenshot({
		path: evidencePath(`v21-${name}.png`),
		fullPage: true,
		animations: 'disabled'
	});
}
async function output(page: Page) {
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	return page.evaluate(() => navigator.clipboard.readText());
}
test('EXPLAIN real analysis, local file, findings, tree metrics, comparison bytes and errors', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.setViewportSize({ width: 1440, height: 1050 });
	expect((await page.goto(sql))?.status()).toBe(200);
	await page.reload();
	await page.getByLabel('Local plan file', { exact: true }).setInputFiles({
		name: 'synthetic-plan.json',
		mimeType: 'application/json',
		buffer: Buffer.from(complexPlan)
	});
	await page.getByRole('button', { name: 'Analyze plan', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Observed plan', exact: true })).toBeVisible();
	await expect(page.locator('.diagnostic-summary dd').filter({ hasText: /^21\.3$/ })).toBeVisible();
	await page.getByLabel('Plan metric', { exact: true }).selectOption('cardinality');
	await page.getByRole('treeitem', { name: /Seq Scan · orders/ }).click();
	await expect(
		page.getByRole('heading', { name: 'Node detail · Seq Scan', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Copy output', exact: true }).last().click();
	const node = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
	expect(node.derived.ratio).toBe(210);
	expect(node.derived.aggregateRows).toBe(4200);
	await screenshot(page, 'explain-complex-dark-1440');
	await page.getByRole('button', { name: /^Findings/ }).click();
	await expect(
		page.getByRole('heading', { name: 'Cardinality', exact: true }).first()
	).toBeVisible();
	await screenshot(page, 'explain-findings-dark-1440');
	await page.getByRole('button', { name: 'Compare plans', exact: true }).click();
	await page.getByRole('button', { name: 'Comparison example', exact: true }).click();
	await page.getByRole('button', { name: 'Compare locally', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Comparison results', exact: true })
	).toBeVisible();
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).last().click();
	const download = await downloadPromise;
	const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
	expect(report.metrics.find((m: { metric: string }) => m.metric === 'executionMs')).toMatchObject({
		before: 2.1,
		after: 4.2,
		delta: 2.1,
		percent: 100
	});
	await screenshot(page, 'explain-comparison-dark-1440');
	await source(page, 'After EXPLAIN source', '{');
	await expect(page.getByRole('heading', { name: 'Comparison results' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Compare locally', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Invalid JSON');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await source(
		page,
		'EXPLAIN source',
		JSON.stringify({ Plan: { 'Node Type': 'Future Scan', 'Total Cost': 123, 'Plan Rows': 4 } })
	);
	await page.getByRole('button', { name: 'Analyze plan', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Estimates only', exact: true })).toBeVisible();
	await expect(page.getByRole('treeitem', { name: /Future Scan/ })).toBeVisible();
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await source(
		page,
		'EXPLAIN source',
		'Result  (cost=0.00..1.00 rows=1 width=4) (actual rows=1 loops=1)\nExecution Time: 0.3 ms'
	);
	await page.getByRole('button', { name: 'Analyze plan', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Observed plan', exact: true })).toBeVisible();
	await expect(page.getByText('TEXT', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'EXPLAIN source', exact: true })).toBeEmpty();
});
test('XML SOAP, conservative formatting, namespace XPath, reversible bytes, handoffs and reset', async ({
	page,
	context
}) => {
	const entityRequests: string[] = [];
	page.on('request', (r) => {
		if (new URL(r.url()).hostname === 'synthetic.invalid') entityRequests.push(r.url());
	});
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.setViewportSize({ width: 1440, height: 1050 });
	await page.goto(xml);
	await page.getByLabel('Local XML file', { exact: true }).setInputFiles({
		name: 'soap.xml',
		mimeType: 'application/xml',
		buffer: Buffer.from(soapSample)
	});
	await page.getByRole('button', { name: 'Format XML', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'XML result', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Copy output', exact: true }).click();
	const copied = await page.evaluate(() => navigator.clipboard.readText());
	expect(copied).toContain('Ship <o:Emphasis>carefully</o:Emphasis> today.');
	expect(copied).toContain('<![CDATA[<synthetic>&literal]]>');
	await page.getByRole('button', { name: 'Check well-formed XML', exact: true }).click();
	await expect(page.getByText('Well-formed XML', { exact: true })).toBeVisible();
	await page.getByRole('treeitem', { name: /<o:Description>/ }).click();
	await expect(page.getByRole('heading', { name: 'Selected XML node' })).toBeVisible();
	await screenshot(page, 'xml-namespaces-tree-dark-1440');
	await page.getByRole('button', { name: 'XPath', exact: true }).click();
	await page
		.getByLabel('XPath expression', { exact: true })
		.fill('//o:Order[@status="paid"]/o:Customer');
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await expect(page.getByText('1 matches', { exact: true })).toBeVisible();
	await expect(page.locator('pre').filter({ hasText: 'Zoë' })).toBeVisible();
	await screenshot(page, 'xml-xpath-dark-1440');
	await page.getByRole('button', { name: /^Inspect \/node/ }).click();
	await expect(page.getByRole('treeitem', { name: /<o:Customer>/ }).first()).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await page.getByRole('button', { name: 'XPath', exact: true }).click();
	await page.getByLabel('XPath expression', { exact: true }).fill('count(//o:Order)');
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'XPath result · number' })).toBeVisible();
	await expect(page.locator('pre').filter({ hasText: /^2$/ })).toBeVisible();
	await page.getByLabel('XPath expression', { exact: true }).fill('//*[');
	await expect(page.getByRole('heading', { name: /XPath result/ })).toHaveCount(0);
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('XPath');
	await page.getByRole('button', { name: 'XML ↔ JSON', exact: true }).click();
	await page.getByRole('button', { name: 'XML → structured JSON', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'JSON result', exact: true })).toBeVisible();
	const jsonText = await output(page);
	expect(JSON.parse(jsonText).format).toBe('devbench.xml');
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	expect(await readFile((await (await downloadPromise).path())!, 'utf8')).toBe(
		jsonText.replace(/\r\n/g, '\n')
	);
	await screenshot(page, 'xml-reversible-dark-1440');
	await page.getByRole('button', { name: 'XML → data JSON (lossy)', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'JSON result', exact: true })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Use JSON result as structured input', exact: true })
	).toHaveCount(0);
	await page.getByRole('button', { name: 'XML → structured JSON', exact: true }).click();
	await page
		.getByRole('button', { name: 'Use JSON result as structured input', exact: true })
		.click();
	await page.getByRole('button', { name: 'Structured JSON → XML', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'XML result', exact: true })).toBeVisible();
	expect(await output(page)).toContain('<o:Order id="002"');
	await page.getByRole('button', { name: 'XML → structured JSON', exact: true }).click();
	await page.getByRole('button', { name: 'JSON Diff', exact: true }).click();
	await expect(page).toHaveURL(/json-diff/);
	await expect(page.getByRole('textbox', { name: 'Left JSON input', exact: true })).toContainText(
		'devbench.xml'
	);
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'Left JSON input', exact: true })).toBeEmpty();
	for (const target of ['JSON Studio', 'JSON Query Explorer']) {
		await page.goto(xml);
		await page.getByRole('button', { name: 'XML example', exact: true }).click();
		await page.getByRole('button', { name: 'XML ↔ JSON', exact: true }).click();
		await page.getByRole('button', { name: 'XML → structured JSON', exact: true }).click();
		await page.getByRole('button', { name: target, exact: true }).click();
		await expect(page.locator('.cm-content').first()).toContainText('devbench.xml');
	}
	await page.goto(xml);
	await source(page, 'XML source', '<!DOCTYPE r SYSTEM "https://synthetic.invalid/xxe"><r/>');
	await page.getByRole('button', { name: 'Check well-formed XML', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('disabled');
	expect(entityRequests).toEqual([]);
	await screenshot(page, 'xml-dtd-error-dark-1440');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'XML source', exact: true })).toBeEmpty();
	await expect(page.getByRole('alert')).toHaveCount(0);
});
test('V2.1 catalog, real responsive themes, keyboard, memory-only privacy and parser conformance', async ({
	page,
	context
}) => {
	const marker = 'V21_SYNTHETIC_PRIVATE_79';
	const leaks: string[] = [],
		errors: string[] = [],
		requests: { url: string; method: string }[] = [];
	page.on('request', (r) => {
		requests.push({ url: r.url(), method: r.method() });
		if ((r.url() + (r.postData() ?? '')).includes(marker)) leaks.push('request');
	});
	page.on('console', (m) => {
		if (m.text().includes(marker)) leaks.push('console');
	});
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/');
	await expect(page.getByText('30 tools · 30 available', { exact: true })).toBeVisible();
	await page.keyboard.press('Control+k');
	await page.getByRole('combobox', { name: 'Find a tool', exact: true }).fill('explain');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/sql-explain-analyzer/);
	await page.getByRole('button', { name: 'Pin tool', exact: true }).click();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Pinned', exact: true })).toBeVisible();
	const measurements = [];
	for (const kind of ['explain', 'xml']) {
		await page.goto(kind === 'explain' ? sql : xml);
		await source(
			page,
			kind === 'explain' ? 'EXPLAIN source' : 'XML source',
			kind === 'explain'
				? smallPlan.replace('synthetic_orders', marker)
				: `<root id="${marker}"><item>synthetic</item></root>`
		);
		await page
			.getByRole('button', {
				name: kind === 'explain' ? 'Analyze plan' : 'Check well-formed XML',
				exact: true
			})
			.click();
		await expect(
			page.getByRole('tree', { name: kind === 'explain' ? 'Plan tree' : 'XML tree', exact: true })
		).toBeVisible();
		for (const width of [390, 768, 1440])
			for (const theme of ['dark', 'light']) {
				await page.setViewportSize({ width, height: 1000 });
				await page.getByLabel('Color theme', { exact: true }).selectOption(theme);
				const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
				expect(scroll).toBeLessThanOrEqual(width);
				measurements.push({ kind, width, theme, scroll });
				await screenshot(page, `${kind}-${theme}-${width}`);
			}
		const state = await page.evaluate(async () =>
			JSON.stringify({
				url: location.href,
				history: history.state,
				local: { ...localStorage },
				session: { ...sessionStorage },
				cookies: document.cookie,
				dbs: await indexedDB.databases(),
				caches: await caches.keys()
			})
		);
		expect(state).not.toContain(marker);
		expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
		expect(await page.evaluate(() => caches.keys())).toEqual([]);
		expect(await context.cookies()).toEqual([]);
		await page.reload();
		await expect(
			page.getByRole('textbox', {
				name: kind === 'explain' ? 'EXPLAIN source' : 'XML source',
				exact: true
			})
		).toBeEmpty();
	}
	expect(leaks).toEqual([]);
	expect(errors).toEqual([]);
	expect(
		requests.every(
			(r) => r.method === 'GET' && new URL(r.url).origin === new URL(page.url()).origin
		)
	).toBe(true);
	await page.goto(xml);
	const fixtures = [
		'<r a=x/>',
		'<r a="1" a="2"/>',
		'<a></b>',
		'<p:r/>',
		'<r>&bad;</r>',
		'<r a="<"/>',
		'<r>\u0000</r>',
		'<r xmlns:a="urn:x" xmlns:b="urn:x" a:x="1" b:x="2"/>'
	];
	for (const value of fixtures) {
		const nativeValid = await page.evaluate(
			(value) =>
				!new DOMParser()
					.parseFromString(value, 'application/xml')
					.getElementsByTagName('parsererror').length,
			value
		);
		expect(nativeValid).toBe(false);
		await source(page, 'XML source', value);
		await page.getByRole('button', { name: 'Check well-formed XML', exact: true }).click();
		await expect(page.getByRole('alert')).toBeVisible();
	}
	expect((await page.goto('/tools/v21-does-not-exist/'))?.status()).toBe(404);
	await mkdir(evidencePath('.'), { recursive: true });
	await writeFile(
		evidencePath('v21-responsive-privacy.json'),
		JSON.stringify({ measurements, leaks, errors, staticRequests: requests.length }, null, 2)
	);
});

test('V2.1 measured input budgets, progressive outlines, honest formatting and worker timeout recovery', async ({
	page
}) => {
	test.setTimeout(90000);
	await page.setViewportSize({ width: 1440, height: 1000 });
	const samples: {
		tool: string;
		size: string;
		bytes: number;
		fileAndAnalysisMs: number;
		renderedRows: number;
	}[] = [];
	for (const tool of ['explain', 'xml']) {
		await page.goto(tool === 'xml' ? xml : sql);
		for (const size of ['small', 'medium', 'near-limit']) {
			const text =
				tool === 'explain'
					? size === 'small'
						? smallPlan
						: JSON.stringify({
								Plan: {
									'Node Type': 'Append',
									Plans: Array.from({ length: size === 'medium' ? 1000 : 100 }, (_, i) => ({
										'Node Type': 'Seq Scan',
										'Relation Name': 'synthetic_' + i,
										'Plan Rows': 1,
										'Total Cost': 1
									}))
								},
								...(size === 'near-limit'
									? { SyntheticMetadata: Array.from({ length: 15 }, () => 'x'.repeat(120000)) }
									: {})
							})
					: size === 'small'
						? '<r><item>synthetic</item></r>'
						: size === 'medium'
							? '<r>' + '<item id="synthetic">value</item>'.repeat(1000) + '</r>'
							: '<r>' + ('<item>' + 'x'.repeat(200000) + '</item>').repeat(9) + '</r>';
			const start = performance.now();
			await page
				.getByLabel(tool === 'xml' ? 'Local XML file' : 'Local plan file', { exact: true })
				.setInputFiles({
					name: tool === 'xml' ? 'synthetic.xml' : 'synthetic.json',
					mimeType: 'text/plain',
					buffer: Buffer.from(text)
				});
			await page
				.getByRole('button', {
					name: tool === 'xml' ? 'Check well-formed XML' : 'Analyze plan',
					exact: true
				})
				.click();
			await expect(
				page.getByRole('tree', { name: tool === 'xml' ? 'XML tree' : 'Plan tree', exact: true })
			).toBeVisible();
			const elapsed = performance.now() - start;
			const rendered = await page.getByRole('treeitem').count();
			expect(rendered).toBeLessThanOrEqual(200);
			samples.push({
				tool,
				size,
				bytes: Buffer.byteLength(text),
				fileAndAnalysisMs: Math.round(elapsed),
				renderedRows: rendered
			});
			if (size === 'medium') {
				await page.getByRole('button', { name: /^Show 200 more/ }).click();
				expect(await page.getByRole('treeitem').count()).toBe(400);
				const first = page.getByRole('treeitem').first();
				await first.focus();
				await page.keyboard.press('ArrowDown');
				await expect(page.getByRole('treeitem').nth(1)).toBeFocused();
			}
		}
	}
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await source(page, 'XML source', '<r><a/><b/></r>');
	await page.getByRole('checkbox', { name: 'Reindent element-only data', exact: true }).check();
	await page.getByLabel('XML indentation', { exact: true }).selectOption('4');
	await page.getByRole('button', { name: 'Format XML', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'XML result', exact: true })).toBeVisible();
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	expect(await readFile((await (await downloadPromise).path())!, 'utf8')).toBe(
		'<r>\n    <a/>\n    <b/>\n</r>'
	);
	await page.getByLabel('Color theme', { exact: true }).selectOption('light');
	await screenshot(page, 'xml-format-light-1440');
	await page.getByLabel('XML indentation', { exact: true }).selectOption('2');
	await expect(page.getByRole('heading', { name: 'XML result', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Minify XML', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'XML result', exact: true })).toBeVisible();
	await source(page, 'XML source', '<r>' + '<a/>'.repeat(12000) + '</r>');
	await page.getByRole('button', { name: 'XPath', exact: true }).click();
	await page.getByLabel('XPath expression', { exact: true }).fill('//a[count(//a)=12000]');
	await page.evaluate(() => {
		const state = window as unknown as { v21Heartbeat: number; v21Timer: number };
		state.v21Heartbeat = 0;
		state.v21Timer = window.setInterval(() => state.v21Heartbeat++, 10);
	});
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Worker terminated');
	const beats = await page.evaluate(() => {
		const state = window as unknown as { v21Heartbeat: number; v21Timer: number };
		clearInterval(state.v21Timer);
		return state.v21Heartbeat;
	});
	expect(beats).toBeGreaterThan(20);
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await screenshot(page, 'xml-worker-budget-error-dark-1440');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await page.getByRole('button', { name: 'XML example', exact: true }).click();
	await page.getByRole('button', { name: 'XPath', exact: true }).click();
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await expect(page.getByText('2 matches', { exact: true })).toBeVisible();
	await source(page, 'XML source', '<r>' + '<a/>'.repeat(12000) + '</r>');
	await page.getByLabel('XPath expression', { exact: true }).fill('//a[count(//a)=12000]');
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Processing locally' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await page.waitForTimeout(1600);
	await expect(page.getByRole('alert')).toHaveCount(0);
	await screenshot(page, 'xml-empty-dark-1440');
	await page.goto(sql);
	await screenshot(page, 'explain-empty-dark-1440');
	await writeFile(
		evidencePath('v21-performance.json'),
		JSON.stringify(
			{
				method:
					'Observed Chromium Playwright driver wall time: file ingestion + worker startup/parsing + serialization + UI assertion. Not pure parser time or FPS.',
				samples,
				timeoutHeartbeatTicks: beats,
				workerBudgetMs: 1500
			},
			null,
			2
		)
	);
});
