import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const previewUrl = process.env.V21_PREVIEW_URL;
if (!previewUrl) throw new Error('V21_PREVIEW_URL is required.');
const origin = new URL(previewUrl).origin;
const evidenceDirectory = process.env.V21_EVIDENCE_DIR ?? 'screenshots/actual';
if (!origin.startsWith('https://')) throw new Error('An HTTPS preview URL is required.');
const marker = 'V21_REMOTE_SYNTHETIC_8d1';
/** @type {{url:string,expectedSha:string|undefined,tlsBypass:boolean,passed:boolean,checks:string[],errors:string[],failedRequests:{url:string,error?:string}[],leaks:string[],externalRequests:string[],blockedBy?:string}} */
const report = {
	url: origin,
	expectedSha: process.env.V21_EXPECTED_SHA,
	tlsBypass: false,
	passed: false,
	checks: [],
	errors: [],
	failedRequests: [],
	leaks: [],
	externalRequests: []
};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', (error) => report.errors.push(error.message));
page.on('console', (message) => {
	if (message.text().includes(marker)) report.leaks.push('console');
});
page.on('request', (request) => {
	if ((request.url() + (request.postData() ?? '')).includes(marker)) report.leaks.push('request');
	if (new URL(request.url()).origin !== origin || request.method() !== 'GET')
		report.externalRequests.push(request.url());
});
page.on('requestfailed', (request) =>
	report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText })
);
await mkdir(evidenceDirectory, { recursive: true });
try {
	const home = await page.goto(origin, { timeout: 60000 });
	if (home?.status() !== 200) throw new Error('Home did not return 200.');
	await page.getByText('30 tools · 30 available', { exact: true }).waitFor();
	report.checks.push('HTTPS home 200; 30 available entries');
	const sql = await page.goto(origin + '/tools/sql-explain-analyzer/');
	if (sql?.status() !== 200) throw new Error('SQL deep link did not return 200.');
	await page.waitForSelector('.cm-content[aria-label="EXPLAIN source"]');
	await page.getByRole('textbox', { name: 'EXPLAIN source', exact: true }).fill(
		JSON.stringify({
			Plan: {
				'Node Type': 'Seq Scan',
				'Relation Name': marker,
				'Total Cost': 30,
				'Plan Rows': 1,
				'Actual Rows': 500,
				'Actual Loops': 1,
				'Actual Total Time': 2
			},
			'Execution Time': 2.5
		})
	);
	await page.getByRole('button', { name: 'Analyze plan', exact: true }).click();
	await page.getByRole('heading', { name: 'Observed plan', exact: true }).waitFor();
	await page.getByRole('treeitem', { name: new RegExp(marker) }).waitFor();
	await page.getByLabel('Color theme', { exact: true }).selectOption('dark');
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({
		path: path.join(evidenceDirectory, 'v21-preview-explain-dark-1440.png'),
		fullPage: true
	});
	report.checks.push('SQL deep link, real synthetic plan analysis and tree');
	await page.reload();
	await page.waitForSelector('.cm-content[aria-label="EXPLAIN source"]');
	if ((await page.getByRole('textbox', { name: 'EXPLAIN source', exact: true }).innerText()).trim())
		throw new Error('SQL payload survived reload.');
	const xml = await page.goto(origin + '/tools/xml-toolkit/');
	if (xml?.status() !== 200) throw new Error('XML deep link did not return 200.');
	await page.getByRole('button', { name: 'SOAP example', exact: true }).click();
	await page.getByRole('button', { name: 'XPath', exact: true }).click();
	await page.getByRole('button', { name: 'Evaluate XPath', exact: true }).click();
	await page.getByText('1 matches', { exact: true }).waitFor();
	await page.getByRole('button', { name: 'XML ↔ JSON', exact: true }).click();
	await page.getByRole('button', { name: 'XML → structured JSON', exact: true }).click();
	await page
		.getByRole('button', { name: 'Use JSON result as structured input', exact: true })
		.click();
	await page.getByRole('button', { name: 'Structured JSON → XML', exact: true }).click();
	await page.getByRole('heading', { name: 'XML result', exact: true }).waitFor();
	await page.evaluate(() => scrollTo(0, 0));
	await page.screenshot({
		path: path.join(evidenceDirectory, 'v21-preview-xml-dark-1440.png'),
		fullPage: true
	});
	report.checks.push('XML deep link, namespace XPath and reversible SOAP conversion');
	await page
		.getByRole('textbox', { name: 'XML source', exact: true })
		.fill('<r>\u00a0<a/>\u2003<b/></r>');
	await page.getByRole('checkbox', { name: 'Reindent element-only data', exact: true }).check();
	await page.getByRole('button', { name: 'Format XML', exact: true }).click();
	await page.getByRole('heading', { name: 'XML result', exact: true }).waitFor();
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download', exact: true }).click();
	const downloaded = await downloadPromise,
		downloadPath = await downloaded.path();
	if (!downloadPath || (await readFile(downloadPath, 'utf8')) !== '<r>\u00a0<a/>\u2003<b/></r>')
		throw new Error('Significant XML Unicode whitespace was not preserved.');
	report.checks.push(
		'Significant Unicode whitespace preserved under explicit reindentation; actual XML download bytes verified'
	);
	const state = await page.evaluate(async () =>
		JSON.stringify({
			url: location.href,
			history: history.state,
			local: { ...localStorage },
			session: { ...sessionStorage },
			cookies: document.cookie,
			databases: await indexedDB.databases(),
			caches: await caches.keys()
		})
	);
	if (state.includes(marker)) report.leaks.push('persistence/url');
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	if (
		report.errors.length ||
		report.failedRequests.length ||
		report.leaks.length ||
		report.externalRequests.length
	)
		throw new Error('Public smoke detected errors, data leakage or unexpected resources.');
	report.checks.push(
		'reload clears SQL; no marker in persistence/URL/history/console/requests; own static GETs only'
	);
	report.passed = true;
} catch (error) {
	report.blockedBy = error instanceof Error ? error.message : 'Preview verification failed.';
	process.exitCode = 1;
} finally {
	await browser.close();
	await writeFile(
		path.join(evidenceDirectory, 'v21-preview-check.json'),
		JSON.stringify(report, null, 2) + '\n'
	);
	console.log(JSON.stringify(report));
}
