import { ToolError, assertTextLimit } from '../tool-errors';
import { countText } from '../string-toolkit/text-count';
import { choose, type RandomIndex } from './random';
export const GENERATED_TEXT_LIMIT = 32768;
export type TextOptions = {
	style: 'lorem' | 'readable';
	unit: 'exact' | 'maximum' | 'words' | 'paragraphs';
	amount: number;
	separator: 'blank-line' | 'line' | 'space';
};
const corpora = {
	lorem: [
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
		'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
		'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
		'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
		'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
	],
	readable: [
		'The sample record is ready for a local test.',
		'A small notebook keeps the fictional project notes together.',
		'Our demo team reviews the example before the next release.',
		'This paragraph contains invented content for interface testing.',
		'New test data helps us check spacing and readable layouts.',
		'Every example stays inside this browser until you copy it.'
	]
};
export function generateText(options: TextOptions, random: RandomIndex) {
	const { style, unit, amount, separator } = options;
	if (
		!Object.hasOwn(corpora, style) ||
		!['exact', 'maximum', 'words', 'paragraphs'].includes(unit) ||
		!['blank-line', 'line', 'space'].includes(separator)
	)
		throw new ToolError('Choose a supported text style, length mode and paragraph separator.');
	const maximum = unit === 'words' ? 2000 : unit === 'paragraphs' ? 50 : GENERATED_TEXT_LIMIT;
	if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum)
		throw new ToolError(
			'Amount must be a whole number from 0 to ' + maximum.toLocaleString('en-US') + '.'
		);
	const corpus = corpora[style];
	const gap = separator === 'blank-line' ? '\n\n' : separator === 'line' ? '\n' : ' ';
	const sentence = () => corpus[choose(random, corpus.length)];
	let text = '';
	if (unit === 'paragraphs') {
		text = Array.from({ length: amount }, () =>
			[sentence(), sentence(), sentence()].join(' ')
		).join(gap);
	} else if (unit === 'words') {
		const words: string[] = [];
		while (words.length < amount) words.push(...sentence().split(' '));
		text = words.slice(0, amount).join(' ');
	} else if (amount > 0) {
		let sentences = 0;
		while (text.length <= amount) {
			text += (text ? (++sentences % 3 === 0 ? gap : ' ') : '') + sentence();
		}
		const prefix = text.slice(0, amount);
		text =
			unit === 'exact'
				? prefix.replace(/\s+$/u, (spaces) => '.'.repeat(spaces.length))
				: (/\s/u.test(text[amount]) ? prefix : prefix.replace(/\S+$/u, '')).trimEnd();
	}
	assertTextLimit(text, GENERATED_TEXT_LIMIT);
	const stats = countText(text);
	if (
		(unit === 'exact' && stats.characters !== amount) ||
		(unit === 'maximum' && stats.characters > amount)
	)
		throw new ToolError('Generated text did not meet the requested visual length.');
	return { text, stats };
}
