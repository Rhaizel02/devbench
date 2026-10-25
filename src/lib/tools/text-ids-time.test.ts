import { describe, expect, it, vi } from 'vitest';
import { compareText } from './text-diff/text-diff-engine';
import { generateIds } from './id-generator/id-engine';
import { convertTimestamp } from './timestamp-converter/timestamp-engine';
describe('faithful, bounded line diff', () => {
	it('handles added/removed/changed/equal Unicode lines and final newline', () => {
		expect(compareText('', '').identical).toBe(true);
		expect(compareText('', 'hello\n').rows[0]).toMatchObject({
			kind: 'added',
			right: { number: 1, ending: 'LF', text: 'hello' }
		});
		expect(compareText('hello\n', '').rows[0].kind).toBe('removed');
		const diff = compareText('same\ncafé\n', 'same\n世界');
		expect(diff.rows.map((row) => row.kind)).toEqual(['unchanged', 'changed']);
		expect(diff.report).toContain('-café\n+世界\n\\ No newline at end of file\n');
		expect(compareText('🌍\n', '🌍\n').identical).toBe(true);
	});
	it('distinguishes CRLF/LF and ignores only trailing spaces/tabs, retaining originals', () => {
		expect(compareText('a\r\n', 'a\n').identical).toBe(false);
		const diff = compareText(' a \t\r\n', ' a\r\n', true);
		expect(diff.identical).toBe(true);
		expect(diff.rows[0].left?.raw).toBe(' a \t\r\n');
		expect(diff.rows[0].right?.raw).toBe(' a\r\n');
		expect(compareText(' a\n', 'a\n', true).identical).toBe(false);
		expect(compareText('a', 'a\n', true).identical).toBe(false);
	});
	it('rejects line/byte/complexity limits without unbounded work', () => {
		expect(() => compareText('a\n'.repeat(2001), '')).toThrow('2,000 lines');
		expect(() => compareText('a'.repeat(131073), '')).toThrow('limit');
		expect(() =>
			compareText(
				Array.from({ length: 1001 }, (_, i) => 'a' + i).join('\n'),
				Array.from({ length: 1001 }, (_, i) => 'b' + i).join('\n')
			)
		).toThrow('budget');
	});
});
describe('cryptographic identifier layouts', () => {
	const time = 1700000000123;
	it('sets UUID v4/v7 version/variant bits and 48-bit timestamp', () => {
		const random = vi.spyOn(crypto, 'getRandomValues');
		for (const kind of ['uuid-v4', 'uuid-v7'] as const) {
			const ids = generateIds(kind, 100, time);
			expect(new Set(ids).size).toBe(100);
			for (const id of ids) {
				expect(id).toMatch(
					kind === 'uuid-v4'
						? /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/
						: /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/
				);
				if (kind === 'uuid-v7') expect(parseInt(id.replace(/-/g, '').slice(0, 12), 16)).toBe(time);
			}
		}
		expect(random).toHaveBeenCalledTimes(200);
		random.mockRestore();
	});
	it('encodes ULID timestamp and secure 80-bit randomness; caps batches', () => {
		const ids = generateIds('ulid', 120, time);
		expect(ids).toHaveLength(100);
		expect(new Set(ids).size).toBe(100);
		const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
		for (const id of ids) {
			expect(id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
			expect([...id.slice(0, 10)].reduce((sum, char) => sum * 32 + alphabet.indexOf(char), 0)).toBe(
				time
			);
		}
		expect(generateIds('ulid', 1, time + 1)[0] > ids[0]).toBe(true);
		expect(generateIds('uuid-v4', 0)).toHaveLength(1);
		expect(() => generateIds('ulid', 1, -1)).toThrow('48-bit');
		expect(() => generateIds('uuid-v7', NaN)).toThrow('finite');
	});
});
describe('strict instant conversion', () => {
	it('keeps exact negative/fractional epochs and explicit unit/range limits', () => {
		for (const [input, milliseconds] of [
			['-0.001', '-1'],
			['1.005', '1005'],
			['-1.125', '-1125'],
			['0', '0']
		]) {
			const result = convertTimestamp(input, 'seconds');
			expect(result.epochMilliseconds).toBe(milliseconds);
			expect(result.epochSeconds).toBe(input);
		}
		expect(convertTimestamp('8640000000000000', 'milliseconds').utc).toBe(
			'+275760-09-13T00:00:00.000Z'
		);
		for (const input of ['1e3', 'Infinity', '1.1234', '8640000000001'])
			expect(() => convertTimestamp(input, 'seconds')).toThrow();
		expect(() => convertTimestamp('1.2', 'milliseconds')).toThrow('integer milliseconds');
	});
	it('validates leap days and calendar fields rather than normalizing them', () => {
		expect(convertTimestamp('2024-02-29T13:00:00.123+01:00', 'iso').utc).toBe(
			'2024-02-29T12:00:00.123Z'
		);
		expect(convertTimestamp('0000-02-29T00:00:00Z', 'iso').utc).toBe('0000-02-29T00:00:00.000Z');
		for (const input of [
			'2023-02-29T00:00:00Z',
			'1900-02-29T00:00:00Z',
			'2024-04-31T00:00:00Z',
			'2024-01-01T24:00:00Z',
			'2024-01-01T00:00:60Z',
			'2024-01-01T00:00:00+24:00',
			'2024-10-27T02:30:00'
		])
			expect(() => convertTimestamp(input, 'iso')).toThrow();
	});
	it('displays IANA DST gaps/overlaps correctly, without guessing wall-clock input', () => {
		const first = convertTimestamp('2024-10-27T02:30:00+02:00', 'iso', 'Europe/Madrid');
		const second = convertTimestamp('2024-10-27T02:30:00+01:00', 'iso', 'Europe/Madrid');
		expect(Number(second.epochMilliseconds) - Number(first.epochMilliseconds)).toBe(3600000);
		expect(first.zoned).toContain('GMT+02:00');
		expect(second.zoned).toContain('GMT+01:00');
		expect(convertTimestamp('2024-03-31T00:59:59Z', 'iso', 'Europe/Madrid').zoned).toContain(
			'01:59:59'
		);
		expect(convertTimestamp('2024-03-31T01:00:00Z', 'iso', 'Europe/Madrid').zoned).toContain(
			'03:00:00'
		);
		expect(() => convertTimestamp('0', 'seconds', 'Invalid/Timezone')).toThrow('IANA');
	});
});
