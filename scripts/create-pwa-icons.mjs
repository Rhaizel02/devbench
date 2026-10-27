// Development-only rasterization of our own vector mark; no network or new graphics dependency.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile('static/icons/devbench.svg', 'utf8');
const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	/** @type {Array<[number, string, boolean]>} */
	const variants = [
		[192, 'devbench-192.png', false],
		[512, 'devbench-512.png', false],
		[512, 'devbench-maskable-512.png', true]
	];
	for (const [size, name, maskable] of variants) {
		const png = await page.evaluate(
			async ({ svg, size, maskable }) => {
				const canvas = document.createElement('canvas');
				canvas.width = canvas.height = size;
				const context = canvas.getContext('2d');
				if (!context) throw new Error('Canvas unavailable for icon rendering.');
				context.fillStyle = '#0e0e10';
				context.fillRect(0, 0, size, size);
				const image = new Image();
				image.src = 'data:image/svg+xml;base64,' + btoa(svg);
				await image.decode();
				const pad = maskable ? Math.round(size * 0.1) : 0;
				context.drawImage(image, pad, pad, size - pad * 2, size - pad * 2);
				return canvas.toDataURL('image/png').split(',')[1];
			},
			{ svg, size, maskable }
		);
		await writeFile('static/icons/' + name, Buffer.from(png, 'base64'));
	}
} finally {
	await browser.close();
}
