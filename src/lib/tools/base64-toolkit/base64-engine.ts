import { ToolError, assertTextLimit } from '../tool-errors';
export type Base64Options = {
	urlSafe?: boolean;
	padding?: boolean;
	ignoreWhitespace?: boolean;
	allowMissingPadding?: boolean;
};
function encodeBytes(bytes: Uint8Array): string {
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += 4096)
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 4096));
	return btoa(binary);
}
export function encodeBase64(input: string, options: Base64Options = {}): string {
	assertTextLimit(input);
	for (const character of input) {
		const code = character.codePointAt(0)!;
		if (code >= 0xd800 && code <= 0xdfff)
			throw new ToolError('Text contains an unpaired UTF-16 surrogate. Use valid Unicode text.');
	}
	let output = encodeBytes(new TextEncoder().encode(input));
	if (options.urlSafe) output = output.replace(/\+/g, '-').replace(/\//g, '_');
	return options.padding === false ? output.replace(/=+$/, '') : output;
}
export function decodeBase64(input: string, options: Base64Options = {}): string {
	assertTextLimit(input);
	const normalized = options.ignoreWhitespace === false ? input : input.replace(/[ \t\r\n]/g, '');
	const pattern = options.urlSafe ? /^([A-Za-z0-9_-]*)(={0,2})$/ : /^([A-Za-z0-9+/]*)(={0,2})$/;
	const match = pattern.exec(normalized);
	if (!match) throw new ToolError('Invalid Base64 alphabet or misplaced padding.');
	const body = match[1];
	const padding = match[2];
	if (body.length % 4 === 1) throw new ToolError('Invalid Base64 length.');
	const requiredPadding = (4 - (body.length % 4)) % 4;
	if (
		(padding && padding.length !== requiredPadding) ||
		(padding && normalized.length % 4 !== 0) ||
		(!padding && requiredPadding && options.allowMissingPadding === false)
	)
		throw new ToolError('Invalid or missing Base64 padding.');
	try {
		const standard = body.replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(standard + '='.repeat(requiredPadding));
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		if (encodeBytes(bytes).replace(/=+$/, '') !== standard)
			throw new ToolError('Non-canonical Base64 padding bits.');
		return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
	} catch (error) {
		if (error instanceof ToolError) throw error;
		throw new ToolError('Decoded bytes are not valid UTF-8 text.');
	}
}
