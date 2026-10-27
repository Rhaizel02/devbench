export const CACHE_PREFIX = 'devbench-static-v23-';
export const INVENTORY_PATH = '/offline-build.json';
export type Kind = 'html' | 'js' | 'css' | 'json' | 'font' | 'image' | 'text';
export type StaticEntry = { path: string; bytes: number; sha256: string; kind: Kind };
export type StaticInventory = { format: 1; version: string; entries: StaticEntry[]; bytes: number };
export type OfflineStatus = {
	version: string;
	ready: boolean;
	completed: number;
	total: number;
	bytes: number;
	error?: string;
};
export function validVersion(value: unknown): value is string {
	return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(value);
}
export function validInventory(value: unknown): value is StaticInventory {
	if (!value || typeof value !== 'object') return false;
	const data = value as StaticInventory;
	if (data.format !== 1 || !validVersion(data.version) || !Array.isArray(data.entries))
		return false;
	if (!data.entries.length || data.entries.length > 2048) return false;
	const paths = new Set<string>();
	let bytes = 0;
	for (const entry of data.entries) {
		if (
			!entry ||
			typeof entry.path !== 'string' ||
			!/^\/[a-zA-Z0-9_./~-]*$/.test(entry.path) ||
			entry.path.includes('//') ||
			entry.path.split('/').some((p) => p === '.' || p === '..') ||
			paths.has(entry.path) ||
			entry.path === INVENTORY_PATH ||
			entry.path === '/service-worker.js' ||
			!Number.isSafeInteger(entry.bytes) ||
			entry.bytes < 0 ||
			entry.bytes > 16 * 1024 * 1024 ||
			!['html', 'js', 'css', 'json', 'font', 'image', 'text'].includes(entry.kind) ||
			!/^[a-f0-9]{64}$/.test(entry.sha256)
		)
			return false;
		paths.add(entry.path);
		bytes += entry.bytes;
	}
	return bytes === data.bytes && bytes <= 32 * 1024 * 1024;
}
export function requestEligible(request: Request, origin: string): boolean {
	const url = new URL(request.url);
	return (
		request.method === 'GET' &&
		!request.url.includes('?') &&
		url.origin === origin &&
		/^https?:$/.test(url.protocol) &&
		!url.search &&
		!url.hash &&
		!request.headers.has('authorization') &&
		!request.headers.has('range')
	);
}
export function destinationAllowed(destination: RequestDestination, kind: Kind): boolean {
	if (!destination) return true; // clean, allowlisted fetches, including Kit navigation payloads
	if (kind === 'html') return destination === 'document' || destination === 'iframe';
	if (kind === 'js') return ['script', 'worker', 'sharedworker'].includes(destination);
	if (kind === 'css') return destination === 'style';
	if (kind === 'font') return destination === 'font';
	if (kind === 'image') return destination === 'image';
	return kind === 'json' && destination === 'manifest';
}
export function responseAllowed(response: Response, kind: Kind): boolean {
	if (
		response.status !== 200 ||
		response.redirected ||
		['opaque', 'opaqueredirect'].includes(response.type)
	)
		return false;
	if (/(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get('cache-control') ?? ''))
		return false;
	if (
		(response.headers.get('vary') ?? '')
			.split(',')
			.some((v) => v.trim() && v.trim().toLowerCase() !== 'accept-encoding')
	)
		return false;
	const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	const types: Record<Kind, RegExp> = {
		html: /^text\/html$/,
		js: /^(?:text|application)\/(?:javascript|ecmascript)$/,
		css: /^text\/css$/,
		json: /^application\/(?:json|manifest\+json)$/,
		font: /^(?:font\/(?:woff2?|ttf|otf)|application\/(?:font-woff|x-font-ttf))$/,
		image: /^image\/(?:png|svg\+xml|x-icon|vnd.microsoft.icon|webp|jpeg)$/,
		text: /^text\/plain$/
	};
	return types[kind].test(mime);
}
export function safeCacheError(error: unknown): string {
	return error instanceof Error && error.name === 'QuotaExceededError'
		? 'Storage quota exceeded. Free space and retry; Canvas projects have not been deleted.'
		: 'Offline resources are unavailable or changed. Check your connection or updates, then retry. Your work is unchanged.';
}
