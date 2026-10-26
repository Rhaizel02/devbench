import { it, expect } from 'vitest';
import { handoffTargets } from './handoffs';
import { tools, searchTools } from './tool-registry';
it('registers two independent V2.1 routes without replacing the preceding catalog', () => {
	expect(tools.filter((t) => t.version === 'V2.1').map((t) => [t.id, t.slug, t.category])).toEqual([
		['BACK-11', 'sql-explain-analyzer', 'Backend'],
		['DATA-07', 'xml-toolkit', 'Data']
	]);
	expect(tools.filter((t) => t.version !== 'V2.1')).toHaveLength(28);
	expect(searchTools('xpath')).toContainEqual(expect.objectContaining({ id: 'DATA-07' }));
	expect(searchTools('postgresql')).toContainEqual(expect.objectContaining({ id: 'BACK-11' }));
});
it('allows only compatible JSON destinations and applies their individual structural budgets', () => {
	expect(
		handoffTargets('DATA-07', '{}')
			.map((t) => t.id)
			.sort()
	).toEqual(['DATA-01', 'DATA-02', 'DATA-05']);
	const deep = '['.repeat(65) + '0' + ']'.repeat(65);
	expect(
		handoffTargets('DATA-07', deep)
			.map((t) => t.id)
			.sort()
	).toEqual(['DATA-01', 'DATA-02']);
	const deeper = '['.repeat(129) + '0' + ']'.repeat(129);
	expect(handoffTargets('DATA-07', deeper).map((t) => t.id)).toEqual(['DATA-01']);
	expect(handoffTargets('DATA-07', '<r/>')).toEqual([]);
	expect(handoffTargets('DATA-07', '{"bad":}')).toEqual([]);
});
it('enforces transfer bytes rather than UTF16 length and never offers automatic XML transport', () => {
	expect(handoffTargets('DATA-07', JSON.stringify('雪'.repeat(400000)))).toEqual([]);
	expect(handoffTargets('BACK-11', '{}')).toEqual([]);
});
