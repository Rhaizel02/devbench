import { expect, it } from 'vitest';
import { detectPaste } from './quick-paste';
it('suggests local destinations without claiming validation', () => {
	expect(detectPaste('{"a":1,}')).toBe('JSON');
	expect(detectPaste('null')).toBe('JSON');
	expect(detectPaste('eyJ.aGVsbG8.c2ln')).toBe('JWT');
	expect(detectPaste('https://example.com')).toBe('URL');
	expect(detectPaste('SELECT * FROM example')).toBe('SQL');
	expect(detectPaste('')).toBeNull();
	expect(detectPaste('some text')).toBeNull();
});
