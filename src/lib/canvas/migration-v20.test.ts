import { describe, expect, it } from 'vitest';
import v1 from './fixtures/legacy-v1.json';
import v2 from './fixtures/legacy-v2.json';
import { parseProject, serializeProject } from './serialization';
import { parseLegacyProject } from './legacy-serialization';
import { History } from './history';
describe('frozen c3cd929 legacy backups → V3', () => {
	it.each([v1, v2])('preserves complete legacy semantics and roundtrips repeatedly', (source) => {
		const old = parseLegacyProject(JSON.stringify(source));
		const next = parseProject(JSON.stringify(source));
		expect(next).toEqual({ ...old, schemaVersion: 3 });
		expect(parseProject(serializeProject(next))).toEqual(next);
		expect(parseProject(serializeProject(parseProject(serializeProject(next))))).toEqual(next);
		expect(source.schemaVersion).toBeLessThan(3);
	});
	it('keeps styles, every stable ID, orphan cameras and legacy child links on text', () => {
		const p = parseProject(JSON.stringify(v2));
		expect(p.diagrams).toEqual(v2.diagrams);
		expect(p.id).toBe('legacy-示例');
		expect(p.diagrams.at(-1)?.viewport).toEqual({ x: -80, y: 91, zoom: 0.2 });
	});
	it('roundtrips V3 rotation, sketch, control points and flat groups through history', () => {
		const p = parseProject(JSON.stringify(v2)),
			d = p.diagrams[0];
		d.elements[0].rotation = 37.125;
		d.elements[0].seed = 41;
		d.elements[0].style = { ...d.elements[0].style, roughness: 1.4, fillPattern: 'hachure' };
		d.connections[0].geometry = 'curve';
		d.connections[0].heads = 'both';
		d.connections[0].control = { x: -210, y: 490 };
		d.groups = [{ id: 'group-one', memberIds: d.elements.slice(0, 2).map((e) => e.id) }];
		expect(parseProject(serializeProject(p))).toEqual(p);
		const h = new History();
		h.record(p);
		const changed = { ...p, title: 'Next' };
		expect(h.undo(changed)).toEqual(p);
		expect(h.redo(p)).toEqual(changed);
	});
	it.each([
		'missing',
		'duplicate-member',
		'nested',
		'duplicate-id',
		'one-member',
		'rotation',
		'geometry',
		'future'
	])('rejects %s transactionally', (kind) => {
		const p = parseProject(JSON.stringify(v2)),
			before = serializeProject(p),
			bad = structuredClone(p),
			d = bad.diagrams[0];
		d.groups = [{ id: 'group', memberIds: d.elements.slice(0, 2).map((e) => e.id) }];
		if (kind === 'missing') d.groups[0].memberIds.push('absent');
		if (kind === 'duplicate-member') d.groups[0].memberIds.push(d.elements[0].id);
		if (kind === 'nested') d.groups.push({ id: 'outer', memberIds: ['group', d.elements[2].id] });
		if (kind === 'duplicate-id') d.groups[0].id = d.id;
		if (kind === 'one-member') d.groups[0].memberIds.pop();
		if (kind === 'rotation') d.elements[0].rotation = Infinity;
		if (kind === 'geometry') Object.assign(d.connections[0], { geometry: 'unknown' });
		if (kind === 'future') Object.assign(bad, { schemaVersion: 99 });
		expect(() => parseProject(JSON.stringify(bad))).toThrow();
		expect(serializeProject(p)).toBe(before);
	});
});
