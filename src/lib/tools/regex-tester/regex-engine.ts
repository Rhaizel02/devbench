import { ToolError, assertTextLimit } from '../tool-errors';
export type RegexInput = {
	pattern: string;
	flags: string;
	text: string;
	replacement: string;
	replace: boolean;
};
export type RegexMatch = {
	text: string;
	start: number;
	end: number;
	captures: (string | null)[];
	groups: Record<string, string | null>;
};
export type RegexResult = { matches: RegexMatch[]; truncated: boolean; replacement: string | null };
export function validateRegexInput(input: RegexInput) {
	assertTextLimit(input.pattern, 4096);
	assertTextLimit(input.text, 100000);
	assertTextLimit(input.replacement, 10000);
	if (
		!/^[dgimsuvy]*$/.test(input.flags) ||
		new Set(input.flags).size !== input.flags.length ||
		(input.flags.includes('u') && input.flags.includes('v'))
	)
		throw new ToolError(
			'Invalid or duplicate ECMAScript flags (d g i m s u v y). u and v cannot be combined.'
		);
}
// Called only by the dedicated browser worker. Unit tests use bounded non-hostile patterns.
export function evaluateRegex(input: RegexInput): RegexResult {
	validateRegexInput(input);
	let regex: RegExp;
	try {
		regex = new RegExp(input.pattern, input.flags);
	} catch {
		throw new ToolError('Invalid ECMAScript regular expression or unsupported flags.');
	}
	const matches: RegexMatch[] = [];
	let match: RegExpExecArray | null;
	const repeat = regex.global || regex.sticky;
	const unicode = regex.unicode || regex.unicodeSets;
	let truncated = false;
	let resultSize = 0;
	while ((match = regex.exec(input.text))) {
		if (matches.length >= 1000) {
			truncated = true;
			break;
		}
		matches.push({
			text: match[0],
			start: match.index,
			end: match.index + match[0].length,
			captures: match.slice(1).map((value) => value ?? null),
			groups: Object.fromEntries(
				Object.entries(match.groups ?? {}).map(([key, value]) => [key, value ?? null])
			)
		});
		resultSize += match.reduce((sum, value) => sum + (value?.length ?? 0), 0);
		if (resultSize > 1024 * 1024)
			throw new ToolError('Captured result text exceeds 1 MiB. Narrow the pattern or input.');
		if (!repeat) break;
		if (!match[0].length) {
			const point = input.text.codePointAt(regex.lastIndex);
			regex.lastIndex += unicode && point !== undefined && point > 0xffff ? 2 : 1;
		}
	}
	let replacement: string | null = null;
	if (input.replace) {
		if (truncated)
			throw new ToolError(
				'Replacement exceeds the 1,000-match limit. Narrow the pattern or input.'
			);
		let output = '';
		let cursor = 0;
		for (const match of matches) {
			// Sticky without global still replaces once, matching String.replace semantics.
			if (!regex.global && cursor > 0) break;
			const part = input.replacement.replace(
				/\$(\$|&|`|'|\d{1,2}|<[^>]*>)/g,
				(token, code: string) => {
					if (code === '$') return '$';
					if (code === '&') return match.text;
					if (code === '`') return input.text.slice(0, match.start);
					if (code === "'") return input.text.slice(match.end);
					if (code.startsWith('<'))
						return Object.keys(match.groups).length
							? (match.groups[code.slice(1, -1)] ?? '')
							: token;
					const n = Number(code);
					if (n > 0 && n <= match.captures.length) return match.captures[n - 1] ?? '';
					const first = Number(code[0]);
					if (code.length === 2 && first > 0 && first <= match.captures.length)
						return (match.captures[first - 1] ?? '') + code[1];
					return token;
				}
			);
			output += input.text.slice(cursor, match.start) + part;
			cursor = match.end;
			if (output.length > 1024 * 1024) throw new ToolError('Replacement output exceeds 1 MiB.');
			if (!regex.global) break;
		}
		replacement = output + input.text.slice(cursor);
		if (replacement.length > 1024 * 1024) throw new ToolError('Replacement output exceeds 1 MiB.');
	}
	return { matches, truncated, replacement };
}
