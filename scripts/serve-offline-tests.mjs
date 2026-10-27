// Loopback-only test harness. This file is never part of the public static build.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const artifacts = JSON.parse(await readFile('work/v23-offline-artifacts.json', 'utf8'));
let active = 'a',
	failPath = '',
	delay = 0;
/** @type {Record<string, string>} */
const mime = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.txt': 'text/plain',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff'
};
createServer(async (request, response) => {
	const url = new URL(request.url ?? '/', 'http://127.0.0.1:4175');
	if (url.pathname === '/__pwa_test__/control' && request.method === 'POST') {
		let text = '';
		for await (const chunk of request) {
			text += chunk;
			if (text.length > 1024) {
				response.writeHead(413).end();
				return;
			}
		}
		try {
			const options = JSON.parse(text);
			if (!['a', 'b'].includes(options.active)) throw Error('Unknown test artifact.');
			active = options.active;
			failPath = typeof options.failPath === 'string' ? options.failPath : '';
			delay =
				Number.isInteger(options.delay) && options.delay >= 0 && options.delay <= 200
					? options.delay
					: 0;
			response
				.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
				.end('{}');
		} catch {
			response.writeHead(400).end();
		}
		return;
	}
	const root = resolve(active === 'a' ? artifacts.aRoot : artifacts.bRoot);
	try {
		if (url.pathname.endsWith('.html')) {
			response.writeHead(308, { Location: url.pathname.slice(0, -5) }).end();
			return;
		}
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			response.writeHead(405).end();
			return;
		}
		if (failPath && url.pathname === failPath) {
			response
				.writeHead(503, { 'Content-Type': 'text/plain' })
				.end('Controlled test transport failure');
			return;
		}
		if (delay) await new Promise((done) => setTimeout(done, delay)); // Controlled slow transport, not an assertion wait.
		const path = resolve(root, '.' + decodeURIComponent(url.pathname));
		if (path !== root && !path.startsWith(root + sep)) {
			response.writeHead(403).end();
			return;
		}
		const info = await stat(path);
		const file = info.isDirectory() ? resolve(path, 'index.html') : path;
		const body = await readFile(file);
		const compressed = /\.(?:js|css|html|json|webmanifest|txt|svg)$/.test(file);
		response.writeHead(200, {
			'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
			'Cache-Control': 'no-cache',
			...(compressed ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {})
		});
		response.end(request.method === 'HEAD' ? undefined : compressed ? gzipSync(body) : body);
	} catch {
		response.writeHead(404, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
		response.end(await readFile(resolve(root, '404.html')));
	}
}).listen(4175, '127.0.0.1', () =>
	process.stdout.write('DevBench two-build offline harness: http://127.0.0.1:4175\n')
);
