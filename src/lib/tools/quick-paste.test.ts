import { expect, it } from 'vitest';
import { detectPaste, suggestPaste, pasteTooLarge } from './quick-paste';
it('suggests local destinations without claiming validation', () => {
	expect(detectPaste('{"a":1,}')).toBe('JSON');
	expect(detectPaste('null')).toBe('JSON');
	expect(detectPaste('eyJ.aGVsbG8.c2ln')).toBe('JWT');
	expect(detectPaste('https://example.com')).toBe('URL');
	expect(detectPaste('SELECT * FROM example')).toBe('SQL');
	expect(detectPaste('')).toBeNull();
	expect(detectPaste('some text')).toBeNull();
});
it('keeps numeric ambiguity explicit and suggests only implemented destinations', () => {
	expect(suggestPaste('1700000000000').map((item) => [item.toolId, item.mode])).toEqual([
		['DATA-01', undefined],
		['UTIL-02', 'seconds'],
		['UTIL-02', 'milliseconds']
	]);
	expect(suggestPaste('2024-10-27T02:30:00+02:00')).toMatchObject([
		{ toolId: 'UTIL-02', mode: 'iso' }
	]);
	expect(suggestPaste('SELECT * FROM synthetic')[0].slug).toBe('sql-formatter');
	expect(suggestPaste('https://example.com/')[0].slug).toBe('url-toolkit');
});
it('bounds heuristic work by UTF-8 bytes without truncating or interpreting content', () => {
	const oversized = '🌍'.repeat(262145);
	expect(pasteTooLarge(oversized)).toBe(true);
	expect(suggestPaste(oversized)).toEqual([]);
	expect(suggestPaste('not a recognized format')).toEqual([]);
});
