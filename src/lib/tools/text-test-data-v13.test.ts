import { describe, it, expect, vi } from 'vitest';
import { countText, characterBudget } from './string-toolkit/text-count';
import { transformStrings } from './string-toolkit/string-engine';
import { generateText, type TextOptions } from './test-data/text-engine';
import {
	completeGTIN,
	gs1CheckDigit,
	generateGTINBatch,
	validateGTIN,
	exportGTINs,
	type GtinKind
} from './test-data/gtin-engine';
import { secureRandomIndex } from './test-data/random';
import { searchTools, tools } from './tool-registry';

describe('Unicode text statistics and character budgets', () => {
	it('defines empty text, UTF-8 bytes and UTF-16 separately', () => {
		expect(countText('')).toEqual({
			characters: 0,
			withoutWhitespace: 0,
			words: 0,
			lines: 0,
			bytes: 0,
			utf16: 0,
			graphemes: true
		});
		expect(countText('A😀é')).toMatchObject({
			characters: 3,
			withoutWhitespace: 3,
			words: 2,
			lines: 1,
			bytes: 7,
			utf16: 4
		});
	});
	it('counts combining accents, joined emoji, flags and skin tones as clusters', () => {
		expect(countText('e\u0301👨‍👩‍👧‍👦🇪🇸👍🏽')).toMatchObject({
			characters: 4,
			withoutWhitespace: 4,
			words: 1
		});
		expect(countText('👨‍👩‍👧‍👦').bytes).toBe(25);
		expect(countText('e\u0301').bytes).toBe(3);
	});
	it('defines whitespace, blank lines, trailing lines and Unicode word boundaries', () => {
		expect(countText('a\r\n\r\nb\n')).toMatchObject({
			characters: 5,
			withoutWhitespace: 2,
			words: 2,
			lines: 4,
			bytes: 7
		});
		expect(countText(' \t\u00a0\u2003\n')).toMatchObject({
			withoutWhitespace: 0,
			words: 0,
			lines: 2
		});
		expect(countText("don't café 世界 hello-world 👋 42").words).toBe(6);
		expect(countText('a\rb\u2028c\u2029').lines).toBe(4);
	});
	it('labels the code-point fallback honestly and leaves inputs untouched', () => {
		expect(countText('e\u0301😀', false)).toMatchObject({
			characters: 3,
			utf16: 4,
			graphemes: false
		});
		const input = 'Cafe\u0301 XMLHttpRequest 世界';
		countText(input);
		expect(transformStrings(input).camelCase).toBe('caféXmlHttpRequest世界');
		expect(input).toContain('e\u0301');
		expect(transformStrings(input, true).slug).toBe('cafe-xml-http-request-世界');
	});
	it('caps UTF-8 work at the existing 64 KiB boundary', () => {
		expect(countText('é'.repeat(32768)).bytes).toBe(65536);
		expect(() => countText('é'.repeat(32769))).toThrow('limit');
		expect(() => countText('a'.repeat(65537))).toThrow('limit');
	});
	it('reports used/remaining/excess without truncating and validates limits', () => {
		expect(characterBudget(4, 3)).toEqual({ used: 4, remaining: 0, exceeded: 1 });
		expect(characterBudget(0, 0)).toEqual({ used: 0, remaining: 0, exceeded: 0 });
		expect(characterBudget(2, 10)).toEqual({ used: 2, remaining: 8, exceeded: 0 });
		for (const limit of [NaN, Infinity, -1, 1.5, 1000001])
			expect(() => characterBudget(1, limit)).toThrow('whole number');
	});
});

describe('bounded local text generation', () => {
	const options: TextOptions = {
		style: 'lorem',
		unit: 'exact',
		amount: 280,
		separator: 'blank-line'
	};
	for (const style of ['lorem', 'readable'] as const) {
		it('verifies exact and maximum visual lengths for ' + style, () => {
			for (const amount of [0, 1, 2, 5, 6, 10, 54, 55, 56, 280, 32768]) {
				const exact = generateText({ ...options, style, amount }, () => 0);
				expect(countText(exact.text).characters).toBe(amount);
				expect(exact.stats.bytes).toBeLessThanOrEqual(32768);
				expect(exact.text).not.toMatch(/\s$/u);
				const maximum = generateText({ ...options, style, amount, unit: 'maximum' }, () => 0);
				expect(maximum.stats.characters).toBeLessThanOrEqual(amount);
				expect(maximum.text).not.toMatch(/\s$/u);
			}
		});
	}
	it('makes tiny exact requests explicit and maximum requests whole-word only', () => {
		expect(generateText({ ...options, amount: 1 }, () => 0).text).toBe('L');
		expect(generateText({ ...options, amount: 6 }, () => 0).text).toBe('Lorem.');
		expect(generateText({ ...options, amount: 4, unit: 'maximum' }, () => 0).text).toBe('');
		expect(generateText({ ...options, amount: 7, unit: 'maximum' }, () => 0).text).toBe('Lorem');
	});
	it('emits requested words/paragraphs with all three separators and zero', () => {
		for (const amount of [0, 1, 31, 2000])
			expect(generateText({ ...options, unit: 'words', amount }, () => 0).stats.words).toBe(amount);
		for (const [separator, gap] of [
			['blank-line', '\n\n'],
			['line', '\n'],
			['space', ' ']
		] as const) {
			const text = generateText(
				{ ...options, unit: 'paragraphs', amount: 3, separator },
				() => 0
			).text;
			expect(text).toBe(
				Array(3)
					.fill(Array(3).fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.').join(' '))
					.join(gap)
			);
		}
		expect(
			generateText({ ...options, unit: 'paragraphs', amount: 50 }, () => 0).stats.bytes
		).toBeLessThanOrEqual(32768);
		expect(generateText({ ...options, unit: 'paragraphs', amount: 0 }, () => 0).text).toBe('');
	});
	it('samples again on regeneration without claiming uniqueness', () => {
		const first = generateText(options, () => 0),
			second = generateText(options, () => 1);
		expect(first.text).not.toBe(second.text);
		expect(second.stats.characters).toBe(280);
		expect(generateText(options, () => 0).text).toBe(first.text);
	});
	it('rejects unsupported settings, unbounded/fractional amounts and broken randomness', () => {
		for (const amount of [-1, NaN, Infinity, 1.1, 32769])
			expect(() => generateText({ ...options, amount }, () => 0)).toThrow('whole number');
		expect(() => generateText({ ...options, unit: 'words', amount: 2001 }, () => 0)).toThrow();
		expect(() => generateText({ ...options, unit: 'paragraphs', amount: 51 }, () => 0)).toThrow();
		expect(() =>
			generateText({ ...options, style: 'unknown' as TextOptions['style'] }, () => 0)
		).toThrow('supported');
		expect(() => generateText(options, () => -1)).toThrow('Random');
	});
});

describe('GS1 modulo 10 numeric fixtures', () => {
	it.each([
		['ean13', '629104150021', '6291041500213'],
		['ean13', '400638133393', '4006381333931'],
		['gtin14', '0950600013435', '09506000134352'],
		['gtin14', '1001234500001', '10012345000017'],
		['ean13', '000000000000', '0000000000000'],
		['gtin14', '0000000000000', '00000000000000']
	] as const)('completes and validates %s %s', (kind, body, full) => {
		expect(gs1CheckDigit(body)).toBe(full.at(-1));
		expect(completeGTIN(body, kind)).toBe(full);
		expect(validateGTIN(full, kind).valid).toBe(true);
		expect(validateGTIN(full.slice(0, -1) + ((Number(full.at(-1)) + 1) % 10), kind).valid).toBe(
			false
		);
	});
	it('rejects non-digits, numeric coercion, wrong lengths, whitespace and Unicode digits', () => {
		for (const value of [
			'',
			' 6291041500213',
			'6291041500213\n',
			'６２９１０４１５００２１３',
			'6.291041500213e12',
			'629104150021',
			'12345678901234',
			'-6291041500213'
		])
			expect(validateGTIN(value, 'ean13').valid).toBe(false);
		for (const body of ['', '6291041500213', '62910415002a', ' 629104150021', '629104150021\n'])
			expect(() => completeGTIN(body, 'ean13')).toThrow();
		expect(() => gs1CheckDigit('123')).toThrow();
	});
	it.each(['ean13', 'gtin14'] as GtinKind[])(
		'generates unique bounded %s batches with leading zeros',
		(kind) => {
			const batch = generateGTINBatch(kind, 1000, '00', () => 0);
			expect(new Set(batch).size).toBe(1000);
			expect(
				batch.every((value) => value.startsWith('00') && validateGTIN(value, kind).valid)
			).toBe(true);
			expect(exportGTINs(batch, 'txt').split('\n')).toEqual(batch);
			expect(exportGTINs(batch, 'csv')).toContain('"' + batch[0] + '"');
		}
	);
	it('fills a small suffix space without collision retries and reports exhaustion', () => {
		const random = vi.fn(() => 0);
		const batch = generateGTINBatch('ean13', 10, '00000000000', random);
		expect(random).toHaveBeenCalledTimes(10);
		expect(new Set(batch).size).toBe(10);
		expect(() => generateGTINBatch('ean13', 11, '00000000000', random)).toThrow('Not enough');
		expect(generateGTINBatch('ean13', 1, '000000000000', () => 0)).toEqual(['0000000000000']);
		expect(() => generateGTINBatch('ean13', 2, '000000000000', random)).toThrow('Not enough');
	});
	it('rejects bad quantities/prefixes, unavailable randomness and invalid random values', () => {
		for (const count of [0, -1, 1.5, NaN, Infinity, 1001])
			expect(() => generateGTINBatch('ean13', count, '', () => 0)).toThrow('Quantity');
		for (const prefix of ['-1', 'a', '１２', '0000000000000', '00\n'])
			expect(() => generateGTINBatch('ean13', 1, prefix, () => 0)).toThrow('Prefix');
		expect(() => generateGTINBatch('ean13', 1, '', (bound) => bound)).toThrow('Random');
		vi.stubGlobal('crypto', undefined);
		try {
			expect(() => secureRandomIndex(10)).toThrow('unavailable');
		} finally {
			vi.unstubAllGlobals();
		}
	});
	it('uses actual Web Crypto to sample both supported identifier spaces', () => {
		for (const kind of ['ean13', 'gtin14'] as const) {
			const batch = generateGTINBatch(kind, 100, '', secureRandomIndex);
			expect(new Set(batch).size).toBe(100);
			expect(batch.every((value) => validateGTIN(value, kind).valid)).toBe(true);
		}
	});
});

it('exposes exactly 26 available entries and finds the new utilities by their real functions', () => {
	expect(tools.filter((tool) => tool.status === 'available')).toHaveLength(26);
	for (const term of ['lorem', 'ean', 'gtin', 'test data'])
		expect(searchTools(term).some((tool) => tool.slug === 'test-data-generator')).toBe(true);
	expect(searchTools('counter').some((tool) => tool.slug === 'string-toolkit')).toBe(true);
});
