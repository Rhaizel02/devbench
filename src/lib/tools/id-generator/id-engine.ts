import { ToolError } from '../tool-errors';
export type IdKind = 'uuid-v4' | 'uuid-v7' | 'ulid';
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function generateIds(kind: IdKind, requested = 1, now = Date.now()): string[] {
	if (!['uuid-v4', 'uuid-v7', 'ulid'].includes(kind))
		throw new ToolError('Choose UUID v4, UUID v7 or ULID.');
	if (!Number.isFinite(requested)) throw new ToolError('Enter a finite batch size.');
	const count = Math.max(1, Math.min(100, Math.trunc(requested)));
	if (kind !== 'uuid-v4' && (!Number.isSafeInteger(now) || now < 0 || now > 0xffffffffffff))
		throw new ToolError('Identifier timestamp must fit an unsigned 48-bit millisecond value.');
	if (!globalThis.crypto?.getRandomValues)
		throw new ToolError('Secure randomness is unavailable in this browser.');
	const ids: string[] = [];
	for (let index = 0; index < count; index++) {
		let bytes: Uint8Array;
		try {
			bytes = crypto.getRandomValues(new Uint8Array(16));
		} catch {
			throw new ToolError('Secure identifier generation failed.');
		}
		if (kind !== 'uuid-v4') {
			let time = BigInt(now);
			for (let i = 5; i >= 0; i--) {
				bytes[i] = Number(time & 255n);
				time >>= 8n;
			}
		}
		if (kind === 'ulid') {
			let value = bytes.reduce((sum, byte) => sum * 256n + BigInt(byte), 0n);
			let encoded = '';
			for (let i = 0; i < 26; i++) {
				encoded = alphabet[Number(value & 31n)] + encoded;
				value >>= 5n;
			}
			ids.push(encoded);
		} else {
			bytes[6] = (bytes[6] & 0x0f) | (kind === 'uuid-v4' ? 0x40 : 0x70);
			bytes[8] = (bytes[8] & 0x3f) | 0x80;
			const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
			ids.push(
				[
					hex.slice(0, 8),
					hex.slice(8, 12),
					hex.slice(12, 16),
					hex.slice(16, 20),
					hex.slice(20)
				].join('-')
			);
		}
	}
	return ids;
}
