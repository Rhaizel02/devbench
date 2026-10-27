import { defineConfig } from '@playwright/test';
const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalURL ? new URL(externalURL).href : 'http://127.0.0.1:4173';
const productionOnly = process.env.PLAYWRIGHT_PRODUCTION === '1';
export default defineConfig({
	testDir: './tests',
	testIgnore: '**/offline/**',
	testMatch: productionOnly ? '**/production.spec.ts' : '**/*.spec.ts',
	fullyParallel: false,
	workers: 1,
	timeout: externalURL ? 120_000 : 30_000,
	reporter: process.env.PLAYWRIGHT_JSON_REPORT
		? [['list'], ['json', { outputFile: process.env.PLAYWRIGHT_JSON_REPORT }]]
		: 'list',
	outputDir: externalURL ? 'test-results/production' : 'test-results',
	use: {
		baseURL,
		browserName:
			process.env.PLAYWRIGHT_BROWSER === 'firefox'
				? 'firefox'
				: process.env.PLAYWRIGHT_BROWSER === 'webkit'
					? 'webkit'
					: 'chromium',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: externalURL
		? undefined
		: {
				command: 'node scripts/serve-static.mjs',
				port: 4173,
				reuseExistingServer: !process.env.CI
			}
});
