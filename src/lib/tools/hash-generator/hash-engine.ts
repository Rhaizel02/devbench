import { ToolError, assertTextLimit } from '../tool-errors';
export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
export async function hashText(
	input: string,
	algorithm: HashAlgorithm = 'SHA-256',
	uppercase = false
): Promise<string> {
	assertTextLimit(input);
	if (!['SHA-256', 'SHA-384', 'SHA-512'].includes(algorithm))
		throw new ToolError('Choose SHA-256, SHA-384 or SHA-512.');
	if (!globalThis.crypto?.subtle)
		throw new ToolError(
			'Web Crypto is unavailable. Use a secure browser context (HTTPS or localhost).'
		);
	try {
		const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
		const hex = Array.from(new Uint8Array(digest), (byte) =>
			byte.toString(16).padStart(2, '0')
		).join('');
		return uppercase ? hex.toUpperCase() : hex;
	} catch {
		throw new ToolError('The browser could not calculate this digest.');
	}
}
