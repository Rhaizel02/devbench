import { afterEach, describe, expect, it, vi } from 'vitest';
import fixtures from './fixtures/local-rasters.json';
import {
	assetBytes,
	decodeAsset,
	inspectRaster,
	LocalImageCache,
	readLocalImage,
	validateAssetEncoding,
	verifyProjectImages
} from './images';
import { DEFAULT_STYLE, emptyProject, type Asset } from './model';
import { parseProject, serializeProject } from './serialization';
const assets = fixtures as Asset[];
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});
describe('bounded raster parsing and portable image documents', () => {
	it.each(assets)(
		'accepts actual Chromium-generated $mime headers and portable V3 roundtrip',
		(asset) => {
			const bytes = validateAssetEncoding(asset);
			expect(inspectRaster(bytes)).toEqual({ mime: asset.mime, width: 80, height: 60 });
			const p = emptyProject('p', 'd');
			p.assets = [asset];
			p.diagrams[0].elements.push({
				id: 'image',
				kind: 'image',
				assetId: asset.id,
				label: 'Local image',
				x: 0,
				y: 0,
				width: 80,
				height: 60,
				style: { ...DEFAULT_STYLE },
				z: 1
			});
			expect(parseProject(serializeProject(p))).toEqual(p);
		}
	);
	it('rejects SVG, remote text, oversized bytes, false type/dimensions and malformed base64', () => {
		for (const value of [
			'<svg onload="alert(1)">',
			'https://example.com/image.png',
			'not an image'
		])
			expect(() => inspectRaster(new TextEncoder().encode(value))).toThrow();
		expect(() => inspectRaster(new Uint8Array(1024 * 1024 + 1))).toThrow('1 MiB');
		expect(() => validateAssetEncoding({ ...assets[0], mime: 'image/jpeg' })).toThrow(
			'type or dimensions'
		);
		expect(() => validateAssetEncoding({ ...assets[0], width: 81 })).toThrow('type or dimensions');
		for (const data of ['abcd!', 'YQ=', 'YR==', 'data:image/png;base64,abc', ''])
			expect(() => assetBytes({ data })).toThrow();
	});
	it('rejects truncated chunks, image bombs and animated headers before bitmap allocation', () => {
		const png = assetBytes(assets[0]);
		expect(() => inspectRaster(png.slice(0, 40))).toThrow();
		const bomb = png.slice(),
			view = new DataView(bomb.buffer);
		view.setUint32(16, 4096);
		view.setUint32(20, 4096);
		expect(() => inspectRaster(bomb)).toThrow('4 megapixels');
		const animated = png.slice();
		animated.set(new TextEncoder().encode('acTL'), 37);
		expect(() => inspectRaster(animated)).toThrow('Animated');
		const webp = assetBytes(assets[2]);
		webp.set(new TextEncoder().encode('ANIM'), 12);
		expect(() => inspectRaster(webp)).toThrow('Animated');
		const extended = assetBytes(assets[2]);
		extended.fill(0, 24, 30); // VP8X claims 1×1 while its actual VP8 frame is 80×60.
		expect(() => inspectRaster(extended)).toThrow('canvas and frame');
	});
	it('rejects missing resources, duplicate asset IDs and aggregate decoded budgets without changing current data', () => {
		const p = emptyProject('p', 'd'),
			before = serializeProject(p);
		const bad = structuredClone(p);
		bad.assets = [assets[0], assets[0]];
		expect(() => serializeProject(bad)).toThrow('unique');
		bad.assets = [assets[0]];
		bad.diagrams[0].elements.push({
			id: 'image',
			kind: 'image',
			assetId: 'missing',
			label: 'Local image',
			x: 0,
			y: 0,
			width: 80,
			height: 60,
			style: { ...DEFAULT_STYLE },
			z: 0
		});
		expect(() => serializeProject(bad)).toThrow('missing');
		bad.diagrams[0].elements = [];
		bad.assets = Array.from({ length: 3 }, (_, i) => ({
			...assets[0],
			id: 'large-' + i,
			width: 2000,
			height: 2000
		}));
		expect(() => serializeProject(bad)).toThrow('budget');
		expect(serializeProject(p)).toBe(before);
	});
});
describe('actual decode gate and mounted-resource lifetime', () => {
	it('checks decoder dimensions, closes mismatches and rejects falsely typed local files', async () => {
		const close = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 800, height: 600, close }))
		);
		await expect(decodeAsset(assets[0])).rejects.toThrow('dimensions');
		expect(close).toHaveBeenCalledOnce();
		const file = new File([assetBytes(assets[0]) as Uint8Array<ArrayBuffer>], 'false.jpg', {
			type: 'image/jpeg'
		});
		await expect(readLocalImage(file, 'new')).rejects.toThrow('MIME');
	});
	it('times out safely and closes late-decoding images', async () => {
		vi.useFakeTimers();
		let resolve!: (value: ImageBitmap) => void;
		const close = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(() => new Promise<ImageBitmap>((r) => (resolve = r)))
		);
		const pending = expect(decodeAsset(assets[0])).rejects.toThrow('decoded safely');
		await vi.advanceTimersByTimeAsync(4000);
		await pending;
		resolve({ width: 80, height: 60, close } as unknown as ImageBitmap);
		await Promise.resolve();
		await Promise.resolve();
		expect(close).toHaveBeenCalledOnce();
	});
	it('verifies imports before replacement, cleans partial decoding, reuses unchanged resources and closes on teardown', async () => {
		const closed: ReturnType<typeof vi.fn>[] = [],
			decoder = vi.fn(async () => {
				const close = vi.fn();
				closed.push(close);
				return { width: 80, height: 60, close };
			});
		vi.stubGlobal('createImageBitmap', decoder);
		const p = emptyProject('p', 'd');
		p.assets = [assets[0]];
		await verifyProjectImages(p);
		expect(closed[0]).toHaveBeenCalledOnce();
		const cache = new LocalImageCache(),
			first = await cache.update([assets[0]]);
		expect(first?.size).toBe(1);
		await cache.update([{ ...assets[0] }]);
		expect(decoder).toHaveBeenCalledTimes(2);
		await cache.update([]);
		expect(closed[1]).toHaveBeenCalledOnce();
		cache.close();
		expect(await cache.update([assets[0]])).toBeNull();
	});
	it('closes decodes cancelled by unmount and never publishes a stale cache', async () => {
		let resolve!: (value: ImageBitmap) => void;
		const close = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(() => new Promise<ImageBitmap>((r) => (resolve = r)))
		);
		const cache = new LocalImageCache(),
			pending = cache.update([assets[0]]);
		cache.close();
		resolve({ width: 80, height: 60, close } as unknown as ImageBitmap);
		expect(await pending).toBeNull();
		expect(close).toHaveBeenCalledOnce();
	});
	it('closes new partial resources after a decode failure and retains the previous cache', async () => {
		const oldClose = vi.fn(),
			newClose = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi
				.fn()
				.mockResolvedValueOnce({ width: 80, height: 60, close: oldClose })
				.mockResolvedValueOnce({ width: 80, height: 60, close: newClose })
				.mockRejectedValueOnce(Error('Synthetic decode failure'))
		);
		const cache = new LocalImageCache();
		await cache.update([assets[0]]);
		await expect(cache.update([assets[0], assets[1], assets[2]])).rejects.toThrow('decoded safely');
		expect(newClose).toHaveBeenCalledOnce();
		expect(oldClose).not.toHaveBeenCalled();
		cache.close();
		expect(oldClose).toHaveBeenCalledOnce();
	});
});
