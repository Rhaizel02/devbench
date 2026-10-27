import { self } from '$app/service-worker';
import { version } from '$app/env';
import { immutable, assets, prerendered } from '$app/manifest';
import {
	CACHE_PREFIX,
	INVENTORY_PATH,
	validInventory,
	validVersion,
	requestEligible,
	destinationAllowed,
	responseAllowed,
	safeCacheError,
	type StaticInventory,
	type StaticEntry,
	type OfflineStatus
} from '../lib/pwa/policy';

// Replaced only after adapter-static finishes, from the actual public build bytes.
const inventory: StaticInventory = JSON.parse('__DEVBENCH_STATIC_INVENTORY_V23__');
const cacheName = CACHE_PREFIX + version;
const origin = self.location.origin;
const metadataURL = origin + INVENTORY_PATH;
const declared = [...immutable, ...assets, ...prerendered].map(
	({ path }) => '/' + path.replace(/^\//, '')
);
const clientVersions = new Map<string, string>();
let completed = 0,
	preparation: Promise<void> | undefined;

async function identify(id: string): Promise<string | undefined> {
	if (!id) return;
	if (clientVersions.has(id)) return clientVersions.get(id);
	const client = await self.clients.get(id);
	if (!client || client.type !== 'window') return;
	return new Promise((resolve) => {
		const channel = new MessageChannel();
		const timer = setTimeout(() => {
			channel.port1.close();
			resolve(undefined);
		}, 1500);
		channel.port1.onmessage = ({ data }) => {
			clearTimeout(timer);
			channel.port1.close();
			if (validVersion(data?.build)) {
				clientVersions.set(id, data.build);
				resolve(data.build);
			} else resolve(undefined);
		};
		client.postMessage({ type: 'DEVBENCH_IDENTIFY' }, [channel.port2]);
	});
}
async function broadcast(data: object) {
	for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
		client.postMessage({ type: 'DEVBENCH_OFFLINE', ...data });
}
async function readInventory(name: string): Promise<StaticInventory | undefined> {
	if (!name.startsWith(CACHE_PREFIX)) return;
	try {
		const response = await (await caches.open(name)).match(metadataURL);
		const value: unknown = response ? await response.json() : undefined;
		if (validInventory(value) && name === CACHE_PREFIX + value.version) return value;
	} catch {
		/* Partial/evicted caches are never complete inventories. */
	}
}
async function status(build = version): Promise<OfflineStatus> {
	const name = CACHE_PREFIX + build;
	const cache = await caches.open(name);
	const metadata = await readInventory(name);
	const target = build === version ? inventory : metadata;
	if (!target) return { version: build, ready: false, completed: 0, total: 0, bytes: 0 };
	const keys = new Set((await cache.keys()).map((key) => new URL(key.url).pathname));
	const present = target.entries.filter((entry) => keys.has(entry.path)).length;
	return {
		version: build,
		completed: build === version && preparation ? completed : present,
		total: target.entries.length,
		bytes: target.bytes,
		ready:
			!!metadata &&
			JSON.stringify(metadata) === JSON.stringify(target) &&
			present === target.entries.length &&
			keys.size === target.entries.length + 1
	};
}
async function verifyResponse(entry: StaticEntry, response: Response): Promise<Response> {
	if (!responseAllowed(response, entry.kind)) throw new Error('Static response rejected.');
	const bytes = await response.arrayBuffer();
	const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	if (bytes.byteLength !== entry.bytes || digest !== entry.sha256)
		throw new Error('Static integrity mismatch.');
	const headers = new Headers(response.headers);
	// Fetch already decoded transport compression. A reconstructed byte body must not retain
	// the old wire encoding/length (Cloudflare and the compressed test harness use gzip/Brotli).
	for (const name of ['content-encoding', 'content-length', 'transfer-encoding'])
		headers.delete(name);
	return new Response(bytes, { status: 200, headers });
}
async function obtain(entry: StaticEntry): Promise<Response> {
	return verifyResponse(
		entry,
		await fetch(origin + entry.path, { cache: 'no-store', credentials: 'omit', redirect: 'error' })
	);
}
async function prepare() {
	if (preparation) return preparation;
	preparation = (async () => {
		if (!validInventory(inventory) || inventory.version !== version)
			throw new Error('Invalid build inventory.');
		const paths = new Set(inventory.entries.map((entry) => entry.path));
		for (const path of declared) {
			if (['/_headers', '/_redirects', '/service-worker.js', INVENTORY_PATH].includes(path))
				continue;
			if (!paths.has(path)) throw new Error('Build inventory coverage mismatch.');
		}
		const existing = await readInventory(cacheName);
		if (existing && JSON.stringify(existing) !== JSON.stringify(inventory))
			throw new Error('Build identity reused.');
		if ((await status()).ready) return;
		const cache = await caches.open(cacheName);
		completed = 0;
		let next = 0;
		const attempts = await Promise.allSettled(
			Array.from({ length: 6 }, async () => {
				while (next < inventory.entries.length) {
					const entry = inventory.entries[next++];
					const cached = await cache.match(origin + entry.path);
					let verified = false;
					if (cached) {
						try {
							await verifyResponse(entry, cached);
							verified = true;
						} catch {
							/* Repair only this known static entry. */
						}
					}
					if (!verified) await cache.put(origin + entry.path, await obtain(entry));
					completed++;
					if (completed % 8 === 0 || completed === inventory.entries.length)
						await broadcast({
							preparing: true,
							version,
							completed,
							total: inventory.entries.length
						});
				}
			})
		);
		const failure = attempts.find((attempt) => attempt.status === 'rejected');
		if (failure?.status === 'rejected') throw failure.reason;
		await cache.put(
			metadataURL,
			new Response(JSON.stringify(inventory), { headers: { 'Content-Type': 'application/json' } })
		);
	})().finally(() => {
		preparation = undefined;
	});
	return preparation;
}
async function cleanup() {
	const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
	const builds = await Promise.all(clients.map((client) => identify(client.id)));
	if (builds.some((build) => !build)) return; // Unknown tabs may still need any retained build.
	const keep = new Set([version, ...builds]);
	const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
	let rollbackKept = false;
	for (const name of names.reverse()) {
		const data = await readInventory(name);
		if (data && keep.has(data.version)) continue;
		if (data && !rollbackKept) {
			rollbackKept = true;
			continue;
		}
		await caches.delete(name);
	}
}
self.addEventListener('install', (event) => {
	event.waitUntil(
		prepare().catch(async (error) => {
			await broadcast({ error: safeCacheError(error), version });
			throw error; // Redundant candidate; the previous active worker remains usable.
		})
	);
});
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const builds = await Promise.all(clients.map((client) => identify(client.id)));
			if (clients.length && builds.every((build) => build === version) && (await status()).ready)
				await self.clients.claim(); // Only a verified first/same-build control transition.
			await cleanup();
			await broadcast({ activated: true, version });
		})()
	);
});
self.addEventListener('message', (event) => {
	const source = event.source;
	if (!source || !('url' in source) || new URL(source.url).origin !== origin || !event.ports[0])
		return;
	const port = event.ports[0];
	event.waitUntil(
		(async () => {
			try {
				if (event.data?.type === 'STATUS')
					port.postMessage({
						...(await status(validVersion(event.data.build) ? event.data.build : version)),
						activeVersion: version
					});
				else if (event.data?.type === 'PREPARE') {
					await prepare();
					port.postMessage(await status());
				} else if (event.data?.type === 'APPLY' && (await status()).ready) {
					port.postMessage({ applying: true, version });
					await self.skipWaiting(); // Sole explicit activation path; never causes a page reload here.
				} else port.postMessage({ error: 'Unknown or unavailable offline action.' });
			} catch (error) {
				port.postMessage({ error: safeCacheError(error), version });
			}
		})()
	);
});
async function inventories() {
	const result: { name: string; data: StaticInventory }[] = [];
	for (const name of await caches.keys()) {
		const data = await readInventory(name);
		if (data) result.push({ name, data });
	}
	return result;
}
async function unavailable() {
	await broadcast({ incomplete: true });
	return new Response(
		'Offline application resources are incomplete. Reconnect and retry preparation or check for an update. Your document has not been changed.',
		{ status: 503, headers: { 'Content-Type': 'text/plain' } }
	);
}
async function serve(request: Request, clientId: string, resultingClientId: string) {
	const path = new URL(request.url).pathname;
	const builds = await inventories();
	const known =
		path === INVENTORY_PATH ||
		builds.some(({ data }) => data.entries.some((entry) => entry.path === path));
	if (request.mode !== 'navigate' && !known) return fetch(request); // No admission or caching of arbitrary subresources.
	if (request.mode === 'navigate') {
		if (resultingClientId) clientVersions.set(resultingClientId, version);
		const entry = inventory.entries.find((item) => item.path === path && item.kind === 'html');
		const cache = await caches.open(cacheName);
		if (!entry) {
			const notFound = await cache.match(origin + '/404.html');
			return new Response(notFound ? await notFound.arrayBuffer() : 'Not found', {
				status: 404,
				headers: { 'Content-Type': 'text/html' }
			});
		}
		if (!(await status()).ready) {
			try {
				await prepare();
			} catch {
				const notice = await cache.match(origin + '/offline-unavailable.html');
				return new Response(
					notice
						? await notice.arrayBuffer()
						: 'Offline resources are incomplete. Reconnect and retry.',
					{ status: 503, headers: { 'Content-Type': 'text/html' } }
				);
			}
		}
		return (await cache.match(origin + path)) ?? unavailable();
	}
	const candidates = builds.flatMap(({ data }) =>
		data.entries.filter((entry) => entry.path === path)
	);
	// Kit chunks may consist solely of a hash (without a basename/dot prefix).
	// Shared recovery is safe only inside the declared immutable inventory and with identical digests.
	const hashed =
		path.startsWith('/_app/immutable/') &&
		candidates.length > 0 &&
		candidates.every((entry) => entry.sha256 === candidates[0].sha256);
	const wanted = hashed ? undefined : await identify(clientId);
	for (const { name, data } of builds.reverse()) {
		if (!hashed && data.version !== wanted) continue;
		if (path === INVENTORY_PATH) return (await caches.open(name)).match(metadataURL);
		const entry = data.entries.find((item) => item.path === path);
		if (!entry || !destinationAllowed(request.destination, entry.kind)) continue;
		const cache = await caches.open(name);
		const cached = await cache.match(origin + path);
		if (cached) return cached;
		try {
			// A repair downloads a clean, declared static URL and verifies this build's exact bytes.
			const repaired = await obtain(entry);
			await cache.put(origin + path, repaired.clone());
			return repaired;
		} catch {
			return unavailable();
		}
	}
	return unavailable();
}
self.addEventListener('fetch', (event) => {
	if (!requestEligible(event.request, origin)) return;
	const path = new URL(event.request.url).pathname;
	// Unknown subresources never enter caching. Retained hashed chunks are admitted by their own inventories.
	if (
		event.request.mode !== 'navigate' &&
		path !== INVENTORY_PATH &&
		!inventory.entries.some((entry) => entry.path === path) &&
		!path.startsWith('/_app/immutable/')
	)
		return;
	event.respondWith(
		serve(event.request, event.clientId, event.resultingClientId).then(
			(response) => response ?? unavailable()
		)
	);
});
