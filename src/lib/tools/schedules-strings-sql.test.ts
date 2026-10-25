import { describe, it, expect } from 'vitest';
import { exploreCron } from './cron-explorer/cron-engine';
import { transformStrings } from './string-toolkit/string-engine';
import { buildSqlIn, type SqlInOptions } from './sql-in-builder/sql-in-engine';
describe('explicit Unix and Spring schedules', () => {
	it('uses Unix OR and Spring AND day rules, seconds first and Sunday 0/7', () => {
		const unix = exploreCron('0 9 1 * MON', 'unix', 'UTC', 2, '2024-05-01T10:00:00Z');
		expect(unix.occurrences[0].utc).toBe('2024-05-06T09:00:00.000Z');
		expect(
			exploreCron('0 0 9 1 * MON', 'spring', 'UTC', 1, '2024-05-01T10:00:00Z').occurrences[0].utc
		).toBe('2024-07-01T09:00:00.000Z');
		expect(
			exploreCron('*/15 * * * * *', 'spring', 'UTC', 2, '2024-01-01T00:00:00Z').occurrences.map(
				(o) => o.utc
			)
		).toEqual(['2024-01-01T00:00:15.000Z', '2024-01-01T00:00:30.000Z']);
		for (const sunday of ['0', '7', 'SUN'])
			expect(
				exploreCron('0 0 9 ? * ' + sunday, 'spring', 'UTC', 1, '2024-05-01T00:00:00Z')
					.occurrences[0].utc
			).toBe('2024-05-05T09:00:00.000Z');
	});
	it('handles lists/ranges/steps, names, leap days and impossible calendars within a horizon', () => {
		expect(
			exploreCron(
				'0,30 9-10 * JUL MON-FRI',
				'unix',
				'UTC',
				3,
				'2024-07-01T08:59:59Z'
			).occurrences.map((o) => o.utc)
		).toEqual(['2024-07-01T09:00:00.000Z', '2024-07-01T09:30:00.000Z', '2024-07-01T10:00:00.000Z']);
		expect(
			exploreCron('0 0 29 2 *', 'unix', 'UTC', 1, '2023-03-01T00:00:00Z').occurrences[0].utc
		).toBe('2024-02-29T00:00:00.000Z');
		expect(exploreCron('0 0 31 2 *', 'unix', 'UTC', 2, '2024-01-01T00:00:00Z')).toMatchObject({
			occurrences: [],
			limited: true
		});
	});
	it('skips DST gaps and lists both overlap instants, including a cursor between them', () => {
		const first = exploreCron('0 30 2 * * *', 'spring', 'Europe/Madrid', 2, '2024-10-26T23:00:00Z');
		expect(first.occurrences.map((o) => o.utc)).toEqual([
			'2024-10-27T00:30:00.000Z',
			'2024-10-27T01:30:00.000Z'
		]);
		expect(
			exploreCron('0 30 2 * * *', 'spring', 'Europe/Madrid', 1, '2024-10-27T01:00:00Z')
				.occurrences[0].utc
		).toBe('2024-10-27T01:30:00.000Z');
		expect(
			exploreCron('0 30 2 * * *', 'spring', 'Europe/Madrid', 1, '2024-03-30T23:00:00Z')
				.occurrences[0].utc
		).toBe('2024-04-01T00:30:00.000Z');
		expect(first.occurrences[0].zoned).toContain('GMT+02:00');
		expect(first.occurrences[1].zoned).toContain('GMT+01:00');
	});
	it('supports half-hour DST overlaps and advancing second-resolution iteration', () => {
		expect(
			exploreCron('0 15,30 2 * * *', 'spring', 'Australia/Lord_Howe', 1, '2024-10-05T12:00:00Z')
				.occurrences[0].utc
		).toBe('2024-10-05T15:30:00.000Z');
		expect(
			exploreCron(
				'0 15,30 2 * * *',
				'spring',
				'Australia/Lord_Howe',
				20,
				'2024-10-01T00:00:00Z'
			).occurrences.map((item) => item.utc)
		).toContain('2024-10-05T15:30:00.000Z');
		expect(
			exploreCron(
				'0 45 1 * * *',
				'spring',
				'Australia/Lord_Howe',
				2,
				'2024-04-06T14:00:00Z'
			).occurrences.map((o) => o.utc)
		).toEqual(['2024-04-06T14:45:00.000Z', '2024-04-06T15:15:00.000Z']);
		expect(
			exploreCron(
				'* * * * * *',
				'spring',
				'Europe/Madrid',
				2,
				'2024-10-27T01:00:00Z'
			).occurrences.map((o) => o.utc)
		).toEqual(['2024-10-27T01:00:01.000Z', '2024-10-27T01:00:02.000Z']);
	});
	it('rejects unsupported modifiers, question placement, bad fields and zones', () => {
		for (const expression of [
			'0 0 0 L * *',
			'0 0 0 1W * *',
			'0 0 0 * * MON#1',
			'? * * * * *',
			'*/0 * * * * *',
			'0 0 25 * * *',
			'* * * * *',
			'0 0 0 * * * 2026'
		])
			expect(() => exploreCron(expression, 'spring', 'UTC', 1, '2024-01-01T00:00:00Z')).toThrow();
		expect(() => exploreCron('0 0 * * ?', 'unix', 'UTC', 1, '2024-01-01T00:00:00Z')).toThrow('?');
		expect(() => exploreCron('* * * * *', 'unix', 'Bad/Zone', 1, '2024-01-01T00:00:00Z')).toThrow(
			'IANA'
		);
	});
});
describe('Unicode string policies', () => {
	it('separates acronyms/camel case/punctuation and keeps digits', () =>
		expect(transformStrings('XMLHttpRequest HTTP2Server foo_bar')).toMatchObject({
			camelCase: 'xmlHttpRequestHttp2ServerFooBar',
			PascalCase: 'XmlHttpRequestHttp2ServerFooBar',
			snake_case: 'xml_http_request_http2_server_foo_bar',
			'kebab-case': 'xml-http-request-http2-server-foo-bar'
		}));
	it('preserves Unicode by default and makes mark stripping optional/lossy', () => {
		expect(transformStrings('Cafe\u0301 世界 Привет').slug).toBe('café-世界-привет');
		expect(transformStrings('Café 世界', true).slug).toBe('cafe-世界');
		expect(transformStrings('a \n b!').UPPERCASE).toBe('A \n B!');
		expect(transformStrings('  --  ').camelCase).toBe('');
		expect(transformStrings('').slug).toBe('');
		expect(() => transformStrings('a'.repeat(65537))).toThrow('limit');
	});
});
describe('parameter-first SQL lists and explicit literal policies', () => {
	const defaults: SqlInOptions = {
		inputMode: 'lines',
		delimiter: ',',
		valueType: 'strings',
		dialect: 'postgresql',
		format: 'parameters',
		deduplicate: true,
		trim: false,
		blanks: 'omit',
		nullTokens: false
	};
	it('keeps malicious input out of SQL and preserves parameter order/deduplication', () => {
		const result = buildSqlIn("a\n'); DROP TABLE users; --\na\ncafé", defaults);
		expect(result.sql).toBe('IN ($1, $2, $3)');
		expect(result.parameters).toEqual(['a', "'); DROP TABLE users; --", 'café']);
		expect(buildSqlIn('a\na', { ...defaults, dialect: 'mysql', deduplicate: false }).sql).toBe(
			'IN (?, ?)'
		);
	});
	it('parses quoted CSV/multiline fields, significant empty values and explicit NULL policy', () => {
		expect(
			buildSqlIn('"a,b","two\nlines","a""b"', { ...defaults, inputMode: 'csv' }).parameters
		).toEqual(['a,b', 'two\nlines', 'a"b']);
		expect(
			buildSqlIn(' NULL \n\nx', { ...defaults, trim: true, nullTokens: true, blanks: 'null' })
				.parameters
		).toEqual([null, 'x']);
		expect(buildSqlIn('\na', { ...defaults, blanks: 'keep' }).parameters).toEqual(['', 'a']);
		expect(() => buildSqlIn('\n', defaults)).toThrow('No values');
	});
	it('validates entire numeric strings and rejects precision loss/underflow', () => {
		expect(
			buildSqlIn('1\n1.0\n-2.5\n1e2', { ...defaults, valueType: 'numbers' }).parameters
		).toEqual([1, -2.5, 100]);
		for (const input of [
			'1); DROP TABLE x',
			'0x10',
			'+1',
			'01',
			'NaN',
			'Infinity',
			'9007199254740993',
			'1e400',
			'1e-400',
			'0.1234567890123456'
		])
			expect(() => buildSqlIn(input, { ...defaults, valueType: 'numbers' })).toThrow();
	});
	it('escapes explicit dialect literals without depending on MySQL backslash settings', () => {
		expect(buildSqlIn("a'b\\c", { ...defaults, format: 'literals' }).sql).toBe("IN (E'a''b\\\\c')");
		expect(buildSqlIn("a'b\\c", { ...defaults, format: 'literals', dialect: 'sqlite' }).sql).toBe(
			"IN ('a''b\\c')"
		);
		expect(buildSqlIn("a'b", { ...defaults, format: 'literals', dialect: 'mysql' }).sql).toBe(
			"IN (CONVERT(X'612762' USING utf8mb4))"
		);
		expect(() => buildSqlIn('x\0y', defaults)).toThrow('NUL');
		expect(() => buildSqlIn('a\n'.repeat(2001), defaults)).toThrow('2,000');
	});
});
