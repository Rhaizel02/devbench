import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = 'build';
// Pages canonicalizes root .html requests with a redirect. Precache a directory-index copy
// of the generated 404 instead, preserving the original host error page and strict redirect rejection.
await mkdir(join(root, 'offline-not-found'), { recursive: true });
await copyFile(join(root, '404.html'), join(root, 'offline-not-found/index.html'));
/** @type {import('../src/lib/pwa/policy').StaticEntry[]} */
const entries = [];
/** @param {string} directory */
async function walk(directory) {
	for (const item of await readdir(directory, { withFileTypes: true })) {
		const file = join(directory, item.name);
		if (item.isDirectory()) {
			await walk(file);
			continue;
		}
		const path = relative(root, file).replaceAll('\\', '/');
		if (
			['service-worker.js', 'offline-build.json', '_headers', '_redirects', '404.html'].includes(
				path
			)
		)
			continue;
		const ext = path.split('.').pop() ?? '';
		const kind =
			ext === 'html'
				? 'html'
				: ext === 'js'
					? 'js'
					: ext === 'css'
						? 'css'
						: ext === 'json' || ext === 'webmanifest'
							? 'json'
							: ['woff', 'woff2', 'ttf', 'otf'].includes(ext)
								? 'font'
								: ['png', 'svg', 'ico', 'webp', 'jpg', 'jpeg'].includes(ext)
									? 'image'
									: ext === 'txt'
										? 'text'
										: undefined;
		if (!kind) throw new Error('Unreviewed public asset extension: ' + ext);
		if (kind === 'html' && path !== 'index.html' && !path.endsWith('/index.html'))
			throw new Error('Precached HTML must use a portable directory-index URL: ' + path);
		const body = await readFile(file);
		const url = '/' + (path.endsWith('index.html') ? path.slice(0, -10) : path);
		entries.push({
			path: url,
			bytes: body.byteLength,
			sha256: createHash('sha256').update(body).digest('hex'),
			kind
		});
	}
}
await walk(root);
entries.sort((a, b) => a.path.localeCompare(b.path));
const workerFile = join(root, 'service-worker.js');
let worker = await readFile(workerFile, 'utf8');
const version = JSON.parse(await readFile(join(root, '_app/version.json'), 'utf8')).version;
if (!/^[a-zA-Z0-9_-]{1,96}$/.test(version)) throw new Error('Invalid offline build identity.');
const inventory = {
	format: 1,
	version,
	entries,
	bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0)
};
if (inventory.bytes > 32 * 1024 * 1024 || entries.length > 2048)
	throw new Error('Offline static budget exceeded.');
const token = /(["'`])__DEVBENCH_STATIC_INVENTORY_V23__\1/g;
if ([...worker.matchAll(token)].length !== 1)
	throw new Error('Native worker inventory insertion point missing.');
worker = worker.replace(token, () => JSON.stringify(JSON.stringify(inventory)));
await writeFile(workerFile, worker);
await writeFile(join(root, 'offline-build.json'), JSON.stringify(inventory));
console.log(
	`Offline inventory: ${entries.length} resources, ${inventory.bytes} bytes; ${entries.filter((e) => e.path.startsWith('/tools/') && e.kind === 'html').length} tool routes; build ${version}`
);
