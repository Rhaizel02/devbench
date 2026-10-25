import { describe, expect, it } from 'vitest';
import {
	defaultPreferences,
	loadPreferences,
	savePreferences,
	sanitizePreferences,
	STORAGE_KEY
} from './preferences';
describe('metadata persistence', () => {
	it('drops all fields except permitted metadata', () => {
		const data = sanitizePreferences({
			theme: 'system',
			favorites: ['DATA-01', 'bad', 'DATA-01'],
			recent: [
				{ toolId: 'DATA-01', visitedAt: 100, input: 'secret' },
				{ toolId: 'bad', visitedAt: 100 }
			],
			input: 'secret',
			output: 'secret',
			jwt: 'secret'
		});
		expect(data).toEqual({
			theme: 'system',
			favorites: ['DATA-01'],
			recent: [{ toolId: 'DATA-01', visitedAt: 100 }]
		});
		let saved = '';
		expect(
			savePreferences(
				{
					setItem: (key, value) => {
						expect(key).toBe(STORAGE_KEY);
						saved = value;
					}
				},
				data
			)
		).toBe(true);
		expect(saved).not.toContain('secret');
	});
	it('survives blocked storage, malformed JSON and quota errors', () => {
		expect(
			loadPreferences({
				getItem: () => {
					throw new Error('blocked');
				}
			})
		).toEqual(defaultPreferences());
		expect(loadPreferences({ getItem: () => '{broken' })).toEqual(defaultPreferences());
		expect(
			savePreferences(
				{
					setItem: () => {
						throw new Error('quota');
					}
				},
				defaultPreferences()
			)
		).toBe(false);
	});
	it('rejects unknown themes and malformed metadata', () =>
		expect(
			sanitizePreferences({
				theme: 'neon',
				favorites: [42, null],
				recent: [null, {}, { toolId: 'DATA-01', visitedAt: 'x' }]
			})
		).toEqual(defaultPreferences()));
	it('caps and deduplicates recent tools', () =>
		expect(
			sanitizePreferences({
				recent: [
					{ toolId: 'DATA-01', visitedAt: 10 },
					{ toolId: 'DATA-01', visitedAt: 9 }
				]
			}).recent
		).toHaveLength(1));
});
