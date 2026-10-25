import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { inspectJwt, syntheticJwt, JWT_NOTICE } from './jwt-inspector/jwt-engine';
import { encodeBase64 } from './base64-toolkit/base64-engine';
import { hashText, type HashAlgorithm } from './hash-generator/hash-engine';
import { formatSql, type SqlOptions } from './sql-formatter/sql-engine';
import { evaluateRegex, validateRegexInput, type RegexInput } from './regex-tester/regex-engine';
const token = (payload: unknown, header: unknown = { alg: 'HS256', typ: 'JWT' }) =>
	[header, payload]
		.map((v) => encodeBase64(JSON.stringify(v), { urlSafe: true, padding: false }))
		.join('.') + '.__8';
describe('JWT decoding never verifies', () => {
	it('decodes Unicode and binary signatures, warns about claimed times and unusual types', () => {
		const result = inspectJwt(
			token({ sub: '世界', iss: 1, aud: ['a', 2], exp: 100, nbf: 300, iat: 250 }),
			200000
		);
		expect(result.notice).toBe(JWT_NOTICE);
		expect(result.header.alg).toBe('HS256');
		expect(result.claims.find((c) => c.name === 'exp')).toMatchObject({
			note: 'Claimed expiration has passed',
			utc: '1970-01-01T00:01:40.000Z'
		});
		expect(result.claims.find((c) => c.name === 'nbf')?.note).toContain('future');
		expect(result.claims.find((c) => c.name === 'iat')?.note).toContain('future');
		expect(result.claims.find((c) => c.name === 'iss')?.note).toBe('Unusual claim type');
	});
	it('handles absent claims, scalar payloads, alg none, empty signatures and invalid dates honestly', () => {
		expect(inspectJwt(token({})).claims).toEqual([]);
		expect(inspectJwt(token(null)).warnings).toContain(
			'Payload is not a claims object; decoded JSON is shown without interpreting claims.'
		);
		expect(inspectJwt(syntheticJwt()).warnings.join(' ')).toContain('unsecured');
		for (const exp of ['100', null, 1e100])
			expect(inspectJwt(token({ exp })).claims[0].note).toContain('Unusual timestamp');
	});
	it.each([
		'a.b',
		'a.b.c.d',
		'e30=.e30.x',
		'e30.e30.A',
		'_w.e30.',
		'e30.e3s.',
		'W10.e30.',
		'e30.e30.ZE'
	])('rejects malformed compact tokens without parser snippets', (input) =>
		expect(() => inspectJwt(input)).toThrow()
	);
	it('rejects excessive nesting and bytes', () => {
		expect(() =>
			inspectJwt(token({ a: JSON.parse('['.repeat(70) + '0' + ']'.repeat(70)) }))
		).toThrow('64 levels');
		expect(() => inspectJwt('a'.repeat(65537))).toThrow('limit');
	});
});
describe('Web Crypto text hashes', () => {
	it.each(['SHA-256', 'SHA-384', 'SHA-512'] as HashAlgorithm[])(
		'matches independent vectors including empty and Unicode',
		async (algorithm) => {
			for (const input of ['', 'abc', 'café 🌍 世界'])
				expect(await hashText(input, algorithm)).toBe(
					createHash(algorithm.replace('-', '').toLowerCase()).update(input, 'utf8').digest('hex')
				);
		}
	);
	it('supports uppercase and a known SHA-256 vector', async () => {
		expect(await hashText('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
		expect(await hashText('abc', 'SHA-256', true)).toBe((await hashText('abc')).toUpperCase());
	});
});
describe('maintained SQL formatting with no parameter interpolation', () => {
	const defaults: SqlOptions = { dialect: 'postgresql', keywordCase: 'upper', indent: '2' };
	it.each([
		[
			'postgresql',
			"-- synthetic comment\nselect profile->>'name', data ? 'key' from users where id = $1 and name = :name;"
		],
		['mysql', "select `strange name`, 'it\\'s' from `users` where id = ?;"],
		[
			'sqlite',
			"/* synthetic comment */ select \"odd name\", 'it''s' from users where id = :id and name = @name;"
		]
	] as const)('preserves comments, operators, quoted values and placeholders', (dialect, input) => {
		const output = formatSql(input, { ...defaults, dialect });
		expect(output).toContain('SELECT');
		expect(output).toContain('\n');
		for (const fragment of input.match(
			/\$1|:name|:id|@name|`strange name`|'it''s'|synthetic comment|->>|'key'/g
		) ?? [])
			expect(output).toContain(fragment);
		expect(formatSql(output, { ...defaults, dialect })).toBe(output);
	});
	it('applies keyword case/indent and reports malformed input without leaking values', () => {
		expect(
			formatSql('SELECT a,b FROM t', { ...defaults, keywordCase: 'lower', indent: '4' })
		).toContain('select\n    a,');
		expect(formatSql('select a from t', { ...defaults, indent: 'tab' })).toContain('\n\ta');
		expect(() => formatSql("select 'synthetic-private", defaults)).toThrow(
			'SQL could not be formatted'
		);
		expect(() => formatSql('', defaults)).toThrow();
		expect(() => formatSql('a'.repeat(131073), defaults)).toThrow('limit');
	});
});
describe('bounded worker regex engine', () => {
	const input: RegexInput = {
		pattern: '(?<word>café)|(world)',
		flags: 'gu',
		text: 'café world café',
		replace: false,
		replacement: ''
	};
	it('returns UTF-16 ranges, null captures and named groups', () => {
		const result = evaluateRegex(input);
		expect(result.matches).toHaveLength(3);
		expect(result.matches[0]).toMatchObject({
			start: 0,
			end: 4,
			captures: ['café', null],
			groups: { word: 'café' }
		});
		expect(result.matches[1].groups.word).toBeNull();
	});
	it('advances zero-width matches over Unicode code points and caps results', () => {
		expect(
			evaluateRegex({ ...input, pattern: '(?:)', text: '🌍a' }).matches.map((m) => m.start)
		).toEqual([0, 2, 3]);
		expect(evaluateRegex({ ...input, pattern: '.', text: 'a'.repeat(1100) })).toMatchObject({
			truncated: true,
			matches: expect.any(Array)
		});
		expect(evaluateRegex({ ...input, pattern: '.', text: 'a'.repeat(1100) }).matches).toHaveLength(
			1000
		);
	});
	it.each([
		"$$-$&-$`-$'-$1-$2-$10-$01-$99-$<word>",
		'plain',
		'$0',
		'$<missing>-$<toString>-$<__proto__>'
	])('matches native replacement semantics for bounded patterns', (replacement) => {
		expect(evaluateRegex({ ...input, replace: true, replacement }).replacement).toBe(
			input.text.replace(new RegExp(input.pattern, input.flags), replacement)
		);
		expect(
			evaluateRegex({ ...input, pattern: '(?<=a)b', text: 'ab', replace: true, replacement })
				.replacement
		).toBe('ab'.replace(/(?<=a)b/gu, replacement));
	});
	it('handles sticky and non-global replacement; invalid flags/patterns/limits safely', () => {
		expect(
			evaluateRegex({
				...input,
				pattern: '.',
				flags: 'y',
				text: 'abc',
				replace: true,
				replacement: 'x'
			}).replacement
		).toBe('xbc');
		for (const flags of ['gg', 'uv', 'x'])
			expect(() => evaluateRegex({ ...input, flags })).toThrow('flags');
		expect(() => evaluateRegex({ ...input, pattern: '[' })).toThrow('Invalid ECMAScript');
		expect(() => validateRegexInput({ ...input, text: 'a'.repeat(100001) })).toThrow('limit');
		expect(() =>
			evaluateRegex({
				...input,
				pattern: 'a',
				text: 'a'.repeat(1000),
				replace: true,
				replacement: 'x'.repeat(2000)
			})
		).toThrow('Replacement output exceeds');
	});
});
