import { defineConfig } from '@playwright/test';
process.env.DEVBENCH_OFFLINE_MODE = '1';
process.env.PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4175';
export default defineConfig({
	testDir: './tests',
	testMatch: [
		'**/offline/*.spec.ts',
		'**/release.spec.ts',
		'**/v12-release.spec.ts',
		'**/v13-text-test-data.spec.ts',
		'**/architecture-canvas.spec.ts',
		'**/canvas-v20.spec.ts',
		'**/canvas-v22.spec.ts',
		'**/openapi-v15.spec.ts',
		'**/data-diagnostics-v21.spec.ts',
		'**/pipeline-v2.spec.ts',
		'**/dataset-v2.spec.ts'
	],
	grep: /(PWA |release matrix:|all seven V1.2 routes|V1.3 |a stale tab|manual hierarchy:|V2 real marquee|V2 independent three-level|V2 local raster|V2 dark\/light|V2.2 bend|V2.2 focus|OpenAPI comparison|OpenAPI editable preview|OpenAPI import,|EXPLAIN real analysis|XML SOAP,|Pipeline V2 |Test Data V2 |Dataset V2 )/,
	workers: 1,
	fullyParallel: false,
	maxFailures: 1,
	timeout: 90_000,
	outputDir: 'test-results/offline',
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4175',
		browserName: 'chromium',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'node scripts/serve-offline-tests.mjs',
		port: 4175,
		reuseExistingServer: false
	}
});
