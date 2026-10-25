import { describe, it, expect } from 'vitest';
import { inspectLogs, filterLogs } from './log-inspector/log-engine';
import { parseEnv, compareEnvironments } from './environment/env-engine';
describe('bounded Java log inspection', () => {
	it('groups Spring multiline logs and extracts levels, times, thread and logger', () => {
		const report = inspectLogs(
			'2026-01-01T12:00:00.123Z INFO 42 --- [main] demo.App : Starting\ncontinuation\n2026-01-01 12:00:01,111 ERROR 42 --- [worker] demo.App : Failure\njava.lang.IllegalStateException: outer\n\tat demo.App.run(App.java:1)\n\tSuppressed: java.io.IOException: close\n\t\tat demo.Resource.close(Resource.java:2)\nCaused by: java.net.ConnectException: inner\n\tat demo.Client.call(Client.java:3)\n\t... 2 more'
		);
		expect(report.total).toBe(2);
		expect(report.counts.INFO).toBe(1);
		expect(report.counts.ERROR).toBe(1);
		expect(report.entries[0]).toMatchObject({
			timestamp: '2026-01-01T12:00:00.123Z',
			thread: 'main',
			logger: 'demo.App',
			message: 'Starting\ncontinuation'
		});
		expect(report.exceptions.map((e) => e.kind)).toEqual(['main', 'suppressed', 'caused-by']);
		expect(report.exceptions[2].elided).toBe(2);
		expect(report.possibleDeepestCause).toBe('java.net.ConnectException');
		expect(filterLogs(report.entries, 'ERROR', 'Failure', 'worker', 'demo')).toHaveLength(1);
	});
	it('retains unknown text, time-only Logback and timestamp-free levels', () => {
		const report = inspectLogs(
			'unknown SEVERE text\nmore unknown\n12:30:01.123 [worker-1] DEBUG demo.App - hello\nWARN demo.App : cautious'
		);
		expect(report.counts).toMatchObject({ UNKNOWN: 1, DEBUG: 1, WARN: 1 });
		expect(report.entries[0].raw).toContain('more unknown');
		expect(report.entries[1]).toMatchObject({
			timestamp: '12:30:01.123',
			thread: 'worker-1',
			logger: 'demo.App'
		});
		expect(report.entries[2].timestamp).toBeNull();
	});
	it('bounds line count, length and bytes before regex parsing', () => {
		expect(() => inspectLogs('a\n'.repeat(10001))).toThrow(/10,000/);
		expect(() => inspectLogs('x'.repeat(16385))).toThrow(/16,384/);
		expect(() => inspectLogs('x'.repeat(1024 * 1024 + 1))).toThrow(/limit/);
	});
});
describe('dotenv literals and key-only exports', () => {
	it('supports equals, spaces, quotes, comments, Unicode, export and escapes', () => {
		const parsed = parseEnv(
			'# comment\nexport A = hello=world # comment\nB="a # b\\n雪"\nC=\' literal # = value \'\nEMPTY=\nD=unquoted#literal'
		);
		expect(Object.fromEntries(parsed.values)).toEqual({
			A: 'hello=world',
			B: 'a # b\n雪',
			C: ' literal # = value ',
			EMPTY: '',
			D: 'unquoted#literal'
		});
	});
	it('reports duplicates/substitutions by line without echoing values and never expands', () => {
		const parsed = parseEnv(
			'TOKEN=synthetic-secret\nTOKEN=${synthetic-secret}\nCOMMAND=$(synthetic-secret)'
		);
		expect(parsed.values.get('TOKEN')).toBe('${synthetic-secret}');
		expect(parsed.warnings).toHaveLength(3);
		expect(JSON.stringify(parsed.warnings)).not.toContain('synthetic-secret');
	});
	it('compares only metadata including absent versus empty and keys-only mode', () => {
		const report = compareEnvironments(
			'A=synthetic-secret\nB=\nCOMMON=1',
			'A=other-secret\nC=\nCOMMON=1'
		);
		expect(report.rows).toEqual([
			{ key: 'A', status: 'different' },
			{ key: 'B', status: 'only-a' },
			{ key: 'C', status: 'only-b' },
			{ key: 'COMMON', status: 'same' }
		]);
		expect(report.counts).toEqual({ common: 2, onlyA: 1, onlyB: 1, different: 1 });
		expect(JSON.stringify(report)).not.toContain('secret');
		expect(compareEnvironments('A=one', 'A=two', true).rows[0].status).toBe('common');
	});
	it.each([
		'TOKEN="synthetic-secret',
		'TOKEN="value" unexpected-secret',
		'not-an-assignment synthetic-secret',
		'1INVALID=synthetic-secret'
	])('rejects unsupported syntax without exposing values', (input) => {
		try {
			parseEnv(input);
			throw new Error('accepted');
		} catch (error) {
			expect((error as Error).message).not.toContain('secret');
			expect((error as Error).message).toContain('line 1');
		}
	});
	it('bounds environment text and lines', () => {
		expect(() => parseEnv('A=1\n'.repeat(5001))).toThrow(/5,000/);
		expect(() => parseEnv('A=' + 'x'.repeat(256 * 1024))).toThrow(/limit/);
	});
});
