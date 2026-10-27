import { describe, expect, it } from 'vitest';
import {
	CACHE_PREFIX,
	destinationAllowed,
	requestEligible,
	responseAllowed,
	safeCacheError,
	validInventory,
	validVersion
} from './policy';
const origin = 'https://devbench.example';
const fixture = () => ({
	format: 1,
	version: 'build-a',
	bytes: 12,
	entries: [{ path: '/tools/json-studio/', bytes: 12, sha256: 'a'.repeat(64), kind: 'html' }]
});
describe('static-only offline admission', () => {
	it('allows an exact static GET, with no query or private authorization', () => {
		expect(requestEligible(new Request(origin + '/_app/immutable/app.hash.js'), origin)).toBe(true);
	});
	it.each(['?private=MARKER', '?', '?v=2'])(
		'does not normalize queries into static cache keys: %s',
		(query) => {
			// URL.search is empty for a bare ?. Inspect the URL serialization too.
			const allowed = requestEligible(
				new Request(origin + '/manifest.webmanifest' + query),
				origin
			);
			expect(allowed).toBe(false);
		}
	);
	it('rejects cross-origin, mutating methods, auth and Range', () => {
		for (const request of [
			new Request('https://other.example/a'),
			new Request(origin + '/', { method: 'POST', body: 'MARKER' }),
			new Request(origin + '/', { headers: { authorization: 'secret' } }),
			new Request(origin + '/', { headers: { range: 'bytes=0-1' } })
		])
			expect(requestEligible(request, origin)).toBe(false);
	});
	it('keeps destination checks separate from path authorization', () => {
		expect(destinationAllowed('worker', 'js')).toBe(true);
		expect(destinationAllowed('script', 'html')).toBe(false);
		expect(destinationAllowed('document', 'json')).toBe(false);
		expect(destinationAllowed('manifest', 'json')).toBe(true);
	});
	it('admits only successful expected MIME responses', () => {
		expect(
			responseAllowed(
				new Response('x', {
					headers: { 'Content-Type': 'text/javascript; charset=utf-8', Vary: 'Accept-Encoding' }
				}),
				'js'
			)
		).toBe(true);
		expect(
			responseAllowed(
				new Response('x', { status: 404, headers: { 'Content-Type': 'text/javascript' } }),
				'js'
			)
		).toBe(false);
		expect(
			responseAllowed(new Response('<html>', { headers: { 'Content-Type': 'text/html' } }), 'js')
		).toBe(false);
	});
	it.each([
		['Cache-Control', 'private, max-age=0'],
		['Cache-Control', 'no-store'],
		['Vary', '*'],
		['Vary', 'Cookie']
	])('rejects private/nonstatic response headers: %s %s', (name, value) => {
		expect(
			responseAllowed(
				new Response('x', { headers: { 'Content-Type': 'application/json', [name]: value } }),
				'json'
			)
		).toBe(false);
	});
	it('validates static manifest identity, checksums and exact measured byte sum', () => {
		expect(validInventory(fixture())).toBe(true);
		expect(validInventory({ ...fixture(), bytes: 0 })).toBe(false);
		expect(validInventory({ ...fixture(), version: '../private' })).toBe(false);
		expect(validVersion('a'.repeat(40))).toBe(true);
		expect(validVersion('payload?secret')).toBe(false);
		expect(CACHE_PREFIX).toBe('devbench-static-v23-');
	});
	it('rejects duplicate/hostile/query paths and nonstatic metadata keys', () => {
		const sample = fixture();
		expect(
			validInventory({ ...sample, entries: [...sample.entries, ...sample.entries], bytes: 24 })
		).toBe(false);
		for (const path of [
			'//other.example/',
			'/a?MARKER',
			'/a#MARKER',
			'/a/../',
			'/offline-build.json',
			'/service-worker.js',
			'/a%2Fb'
		])
			expect(validInventory({ ...sample, entries: [{ ...sample.entries[0], path }] })).toBe(false);
	});
	it('rejects oversized inventories before accepting stored build metadata', () => {
		expect(
			validInventory({
				...fixture(),
				entries: Array.from({ length: 2049 }, (_, i) => ({
					...fixture().entries[0],
					path: '/' + i
				}))
			})
		).toBe(false);
		expect(
			validInventory({
				...fixture(),
				entries: [{ ...fixture().entries[0], bytes: 20 * 1024 * 1024 }],
				bytes: 20 * 1024 * 1024
			})
		).toBe(false);
	});
	it('errors distinguish quota without reflecting arbitrary document content', () => {
		expect(safeCacheError(new DOMException('MARKER', 'QuotaExceededError'))).toContain('quota');
		expect(safeCacheError(new Error('PRIVATE_DOCUMENT_MARKER'))).not.toContain('MARKER');
	});
});
