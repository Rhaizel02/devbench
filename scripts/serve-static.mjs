import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('build');
/** @type {Record<string, string>} */
const mime = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.woff2': 'font/woff2',
	'.json': 'application/json'
};
const server = createServer(async (req, res) => {
	try {
		const path = resolve(
			root,
			'.' + decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
		);
		if (path !== root && !path.startsWith(root + sep)) {
			res.writeHead(403);
			res.end();
			return;
		}
		const info = await stat(path);
		const file = info.isDirectory() ? resolve(path, 'index.html') : path;
		const body = await readFile(file);
		res.writeHead(200, {
			'Content-Type': mime[extname(file)] || 'application/octet-stream',
			'Cache-Control': 'no-store'
		});
		res.end(body);
	} catch {
		res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(await readFile(resolve(root, '404.html')).catch(() => 'Not found'));
	}
});
server.listen(4173, '127.0.0.1', () =>
	process.stdout.write('DevBench static preview: http://127.0.0.1:4173\n')
);
