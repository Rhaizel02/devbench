import { ToolError } from '../tool-errors';
export type RandomIndex = (upperExclusive: number) => number;
export const secureRandomIndex: RandomIndex = (upperExclusive) => {
	if (!Number.isSafeInteger(upperExclusive) || upperExclusive < 1)
		throw new ToolError('Random range must be a positive safe integer.');
	if (!globalThis.crypto?.getRandomValues)
		throw new ToolError('Secure randomness is unavailable in this browser.');
	const range = 2 ** 53;
	const cutoff = Math.floor(range / upperExclusive) * upperExclusive;
	for (let attempt = 0; attempt < 32; attempt++) {
		let bytes: Uint32Array;
		try {
			bytes = globalThis.crypto.getRandomValues(new Uint32Array(2));
		} catch {
			throw new ToolError('Secure random generation failed.');
		}
		const value = (bytes[0] & 0x1fffff) * 2 ** 32 + bytes[1];
		if (value < cutoff) return value % upperExclusive;
	}
	throw new ToolError('Secure random generation could not sample this range. Retry.');
};
export function choose(random: RandomIndex, upperExclusive: number) {
	const value = random(upperExclusive);
	if (!Number.isSafeInteger(value) || value < 0 || value >= upperExclusive)
		throw new ToolError('Random source returned an invalid value.');
	return value;
}
