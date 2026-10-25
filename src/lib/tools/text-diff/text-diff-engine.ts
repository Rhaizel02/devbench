import { diffArrays } from 'diff';
import { ToolError, assertTextLimit } from '../tool-errors';
export type DiffLine = {
	number: number;
	text: string;
	ending: 'LF' | 'CRLF' | 'none';
	raw: string;
};
export type TextDiffRow = {
	kind: 'unchanged' | 'added' | 'removed' | 'changed';
	left?: DiffLine;
	right?: DiffLine;
};
function tokenize(text: string): string[] {
	return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}
function line(raw: string, number: number): DiffLine {
	const ending = raw.endsWith('\r\n') ? 'CRLF' : raw.endsWith('\n') ? 'LF' : 'none';
	return {
		raw,
		number,
		ending,
		text: raw.slice(0, raw.length - (ending === 'CRLF' ? 2 : ending === 'LF' ? 1 : 0))
	};
}
function key(text: string) {
	const value = line(text, 0);
	return (
		value.text.replace(/[ \t]+$/, '') +
		(value.ending === 'CRLF' ? '\r\n' : value.ending === 'LF' ? '\n' : '')
	);
}
export function compareText(
	left: string,
	right: string,
	ignoreTrailing = false
): { rows: TextDiffRow[]; report: string; identical: boolean } {
	assertTextLimit(left, 128 * 1024);
	assertTextLimit(right, 128 * 1024);
	const a = tokenize(left),
		b = tokenize(right);
	if (a.length > 2000 || b.length > 2000)
		throw new ToolError('Text diff supports up to 2,000 lines per side.');
	const changes = diffArrays(a, b, {
		comparator: (a, b) => (ignoreTrailing ? key(a) === key(b) : a === b),
		timeout: 300,
		maxEditLength: 1000
	});
	if (!changes)
		throw new ToolError(
			'Diff exceeded the 300 ms / 1,000-edit budget. Compare smaller or more similar texts.'
		);
	const rows: TextDiffRow[] = [];
	let ai = 0,
		bi = 0;
	for (let ci = 0; ci < changes.length; ci++) {
		const change = changes[ci];
		if (change.removed && changes[ci + 1]?.added) {
			const added = changes[++ci];
			for (let index = 0; index < Math.max(change.value.length, added.value.length); index++) {
				const oldLine = index < change.value.length ? line(a[ai], ++ai) : undefined;
				const newLine = index < added.value.length ? line(b[bi], ++bi) : undefined;
				rows.push({
					kind: oldLine && newLine ? 'changed' : oldLine ? 'removed' : 'added',
					left: oldLine,
					right: newLine
				});
			}
		} else
			for (let i = 0; i < change.value.length; i++) {
				if (change.added) rows.push({ kind: 'added', right: line(b[bi], ++bi) });
				else if (change.removed) rows.push({ kind: 'removed', left: line(a[ai], ++ai) });
				else rows.push({ kind: 'unchanged', left: line(a[ai], ++ai), right: line(b[bi], ++bi) });
			}
	}
	let report = '--- Left\n+++ Right\n';
	const append = (prefix: string, value: DiffLine) => {
		report +=
			prefix + value.raw + (value.ending === 'none' ? '\n\\ No newline at end of file\n' : '');
	};
	for (const row of rows) {
		if (row.kind === 'unchanged') append(' ', row.left!);
		else {
			if (row.left) append('-', row.left);
			if (row.right) append('+', row.right);
		}
	}
	return { rows, report, identical: rows.every((row) => row.kind === 'unchanged') };
}
