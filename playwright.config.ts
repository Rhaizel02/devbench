import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		browserName: 'chromium',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'node scripts/serve-static.mjs',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
