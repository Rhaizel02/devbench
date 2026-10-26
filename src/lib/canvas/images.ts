import { fail, type Asset, type Project } from './model';
export const IMAGE_LIMITS = {
	bytes: 1024 * 1024,
	pixels: 4_000_000,
	dimension: 4096,
	projectBytes: 4 * 1024 * 1024,
	projectPixels: 8_000_000
};
function ascii(bytes: Uint8Array, offset: number, length: number) {
	return String.fromCharCode(...bytes.slice(offset, offset + length));
}
/** Header limits run before bitmap allocation; actual browser decoding is a second gate. */
export function inspectRaster(bytes: Uint8Array): {
	mime: Asset['mime'];
	width: number;
	height: number;
} {
	if (!bytes.length || bytes.length > IMAGE_LIMITS.bytes)
		fail('Local image limit: 1 MiB per file.');
	const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let mime: Asset['mime'],
		width = 0,
		height = 0;
	if (bytes.length >= 33 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
		mime = 'image/png';
		if (data.getUint32(8) !== 13 || ascii(bytes, 12, 4) !== 'IHDR') fail('Invalid PNG header.');
		width = data.getUint32(16);
		height = data.getUint32(20);
		let end = false;
		for (let at = 8; at + 12 <= bytes.length;) {
			const length = data.getUint32(at),
				type = ascii(bytes, at + 4, 4);
			if (length > bytes.length - at - 12) fail('Truncated PNG image.');
			if (type === 'acTL') fail('Animated images are not supported.');
			if (type === 'IHDR' && at !== 8) fail('Repeated PNG header.');
			at += length + 12;
			if (type === 'IEND') {
				if (length !== 0 || at !== bytes.length) fail('Invalid PNG ending.');
				end = true;
				break;
			}
		}
		if (!end) fail('PNG ending is missing.');
	} else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216) {
		mime = 'image/jpeg';
		if (bytes.at(-2) !== 255 || bytes.at(-1) !== 217) fail('JPEG ending is missing.');
		for (let at = 2; at < bytes.length;) {
			if (bytes[at++] !== 255) fail('Invalid JPEG marker.');
			while (bytes[at] === 255) at++;
			const marker = bytes[at++];
			if (marker === 0xda || marker === 0xd9) break;
			if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
			if (at + 2 > bytes.length) fail('Truncated JPEG image.');
			const length = data.getUint16(at);
			if (length < 2 || at + length > bytes.length) fail('Invalid JPEG segment.');
			if (
				[0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
					marker
				)
			) {
				if (length < 8) fail('Invalid JPEG frame.');
				if (width || height) fail('Multiple JPEG frames are not supported.');
				height = data.getUint16(at + 3);
				width = data.getUint16(at + 5);
			}
			at += length;
		}
	} else if (bytes.length >= 20 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
		mime = 'image/webp';
		if (data.getUint32(4, true) + 8 !== bytes.length) fail('Invalid WebP size.');
		let frame = false;
		const frameSize = (w: number, h: number) => {
			if (frame) fail('Multiple WebP frames are not supported.');
			if (width && (width !== w || height !== h)) fail('WebP canvas and frame dimensions differ.');
			width = w;
			height = h;
			frame = true;
		};
		for (let at = 12; at + 8 <= bytes.length;) {
			const type = ascii(bytes, at, 4),
				length = data.getUint32(at + 4, true),
				p = at + 8;
			if (p + length > bytes.length) fail('Truncated WebP image.');
			if (type === 'ANIM' || type === 'ANMF') fail('Animated images are not supported.');
			if (type === 'VP8X') {
				if (length < 10 || bytes[p] & 2) fail('Invalid or animated WebP.');
				if (width || height) fail('Repeated WebP canvas header.');
				width = 1 + bytes[p + 4] + (bytes[p + 5] << 8) + (bytes[p + 6] << 16);
				height = 1 + bytes[p + 7] + (bytes[p + 8] << 8) + (bytes[p + 9] << 16);
			} else if (type === 'VP8 ') {
				if (length < 10 || bytes[p + 3] !== 0x9d || bytes[p + 4] !== 1 || bytes[p + 5] !== 0x2a)
					fail('Invalid WebP frame.');
				frameSize(data.getUint16(p + 6, true) & 0x3fff, data.getUint16(p + 8, true) & 0x3fff);
			} else if (type === 'VP8L') {
				if (length < 5 || bytes[p] !== 0x2f) fail('Invalid lossless WebP.');
				const bits = data.getUint32(p + 1, true);
				frameSize((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
			}
			at = p + length + (length % 2);
		}
		if (!frame) fail('WebP raster frame is missing.');
	} else fail('Choose a raster PNG, JPEG or WebP file. SVG and remote URLs are not supported.');
	if (
		!width ||
		!height ||
		width > IMAGE_LIMITS.dimension ||
		height > IMAGE_LIMITS.dimension ||
		width * height > IMAGE_LIMITS.pixels
	)
		fail('Image limit: 4,096 px per side and 4 megapixels.');
	return { mime, width, height };
}
export function assetBytes(asset: Pick<Asset, 'data'>): Uint8Array {
	if (
		asset.data.length > Math.ceil(IMAGE_LIMITS.bytes / 3) * 4 ||
		asset.data.length % 4 ||
		!/^[A-Za-z0-9+/]+={0,2}$/.test(asset.data)
	)
		fail('Invalid image encoding.');
	let binary: string;
	try {
		binary = atob(asset.data);
	} catch {
		fail('Invalid image encoding.');
	}
	if (btoa(binary) !== asset.data) fail('Non-canonical image encoding.');
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
export function validateAssetEncoding(asset: Asset): Uint8Array {
	const bytes = assetBytes(asset),
		actual = inspectRaster(bytes);
	if (actual.mime !== asset.mime || actual.width !== asset.width || actual.height !== asset.height)
		fail('Image content does not match its type or dimensions.');
	return bytes;
}
export async function decodeAsset(asset: Asset): Promise<ImageBitmap> {
	const bytes = validateAssetEncoding(asset);
	let expired = false,
		timer: ReturnType<typeof setTimeout> | undefined;
	const decoding = createImageBitmap(
		new Blob([bytes as Uint8Array<ArrayBuffer>], { type: asset.mime }),
		{ imageOrientation: 'none' }
	).then((bitmap) => {
		if (expired) {
			bitmap.close();
			throw Error('Local image decoding timed out.');
		}
		return bitmap;
	});
	let bitmap: ImageBitmap;
	try {
		bitmap = await Promise.race([
			decoding,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					expired = true;
					reject(Error('Local image decoding timed out.'));
				}, 4000);
			})
		]);
	} catch {
		fail('This local image could not be decoded safely. The open board was not replaced.');
	} finally {
		clearTimeout(timer);
	}
	if (bitmap.width !== asset.width || bitmap.height !== asset.height) {
		bitmap.close();
		fail('Decoded image dimensions differ from its header.');
	}
	return bitmap;
}
/** Preflight before replacing any project, including file import and IndexedDB load. */
export async function verifyProjectImages(project: Project): Promise<void> {
	for (const a of project.assets ?? []) {
		const bitmap = await decodeAsset(a);
		bitmap.close();
	}
}
export async function readLocalImage(file: File, id: string): Promise<Asset> {
	if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
		fail('Choose a PNG, JPEG or WebP raster image.');
	if (file.size > IMAGE_LIMITS.bytes) fail('Local image limit: 1 MiB per file.');
	const bytes = new Uint8Array(await file.arrayBuffer()),
		info = inspectRaster(bytes);
	if (info.mime !== file.type) fail('Image MIME and contents do not match.');
	let binary = '';
	for (let i = 0; i < bytes.length; i += 8192)
		binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
	const asset: Asset = { id, ...info, data: btoa(binary) },
		bitmap = await decodeAsset(asset);
	bitmap.close();
	return asset;
}
/** One cache per mounted editor. No object URLs, fetch, global payloads or history bitmaps. */
export class LocalImageCache {
	private entries = new Map<string, { asset: Asset; bitmap: ImageBitmap }>();
	private generation = 0;
	private closed = false;
	async update(assets: Asset[]): Promise<Map<string, ImageBitmap> | null> {
		if (this.closed) return null;
		const generation = ++this.generation,
			next = new Map<string, { asset: Asset; bitmap: ImageBitmap }>(),
			created: ImageBitmap[] = [];
		try {
			for (const asset of assets) {
				const existing = this.entries.get(asset.id);
				if (
					existing &&
					existing.asset.data === asset.data &&
					existing.asset.mime === asset.mime &&
					existing.asset.width === asset.width &&
					existing.asset.height === asset.height
				)
					next.set(asset.id, existing);
				else {
					const bitmap = await decodeAsset(asset);
					created.push(bitmap);
					next.set(asset.id, { asset, bitmap });
				}
				if (this.closed || generation !== this.generation) {
					created.forEach((b) => b.close());
					return null;
				}
			}
			for (const [id, entry] of this.entries)
				if (next.get(id)?.bitmap !== entry.bitmap) entry.bitmap.close();
			this.entries = next;
			return new Map([...next].map(([id, e]) => [id, e.bitmap]));
		} catch (reason) {
			created.forEach((b) => b.close());
			throw reason;
		}
	}
	close() {
		this.closed = true;
		this.generation++;
		this.entries.forEach((e) => e.bitmap.close());
		this.entries.clear();
	}
}
