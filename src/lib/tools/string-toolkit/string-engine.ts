import { assertTextLimit } from '../tool-errors';
export function transformStrings(input: string, stripMarks = false) {
	assertTextLimit(input, 65536);
	const normalized = stripMarks
		? input.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
		: input.normalize('NFC');
	const separated = normalized
		.replace(/([\p{Lu}\p{Lt}]+)([\p{Lu}\p{Lt}][\p{Ll}])/gu, '$1 $2')
		.replace(/([\p{Ll}\p{N}])([\p{Lu}\p{Lt}])/gu, '$1 $2');
	const words = separated
		.split(/[^\p{L}\p{N}\p{M}]+/u)
		.filter((word) => /[\p{L}\p{N}]/u.test(word))
		.map((word) => word.toLowerCase());
	const title = (word: string) => {
		const letters = [...word];
		return (letters[0]?.toUpperCase() ?? '') + letters.slice(1).join('');
	};
	return {
		camelCase: (words[0] ?? '') + words.slice(1).map(title).join(''),
		PascalCase: words.map(title).join(''),
		snake_case: words.join('_'),
		'kebab-case': words.join('-'),
		UPPERCASE: normalized.toUpperCase(),
		lowercase: normalized.toLowerCase(),
		slug: words.join('-')
	};
}
