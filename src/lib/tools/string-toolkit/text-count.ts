import { assertTextLimit, ToolError } from '../tool-errors';
export const STRING_INPUT_LIMIT = 65536;
export type TextStatistics = {
	characters: number;
	withoutWhitespace: number;
	words: number;
	lines: number;
	bytes: number;
	utf16: number;
	graphemes: boolean;
};
export function wordCount(input: string): number {
	return [
		...input.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu)
	].length;
}
export function countText(
	input: string,
	useSegmenter = typeof Intl.Segmenter === 'function'
): TextStatistics {
	if (input.length > STRING_INPUT_LIMIT)
		throw new ToolError('Input exceeds the 64 KiB counting limit. Reduce it before processing.');
	assertTextLimit(input, STRING_INPUT_LIMIT);
	let characters = 0,
		withoutWhitespace = 0;
	const segments = useSegmenter
		? new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(input)
		: input;
	for (const part of segments) {
		const segment = typeof part === 'string' ? part : part.segment;
		characters++;
		if (!/\p{White_Space}/u.test(segment)) withoutWhitespace++;
	}
	return {
		characters,
		withoutWhitespace,
		words: wordCount(input),
		lines: input === '' ? 0 : (input.match(/\r\n|[\r\n\u2028\u2029]/gu)?.length ?? 0) + 1,
		bytes: new TextEncoder().encode(input).length,
		utf16: input.length,
		graphemes: useSegmenter
	};
}
export function characterBudget(used: number, limit: number) {
	if (!Number.isSafeInteger(limit) || limit < 0 || limit > 1_000_000)
		throw new ToolError('Character limit must be a whole number from 0 to 1,000,000.');
	return { used, remaining: Math.max(0, limit - used), exceeded: Math.max(0, used - limit) };
}
