import { describe, it, expect } from 'vitest';
import v1 from './fixtures/legacy-v1.json';
import v2 from './fixtures/legacy-v2.json';
import v3 from './fixtures/frozen-v20-v3.json';
import { parseProject, serializeProject } from './serialization';
import { parseLegacyProject } from './legacy-serialization';
import { reorder } from './operations';
import { History } from './history';
describe('V2.2 frozen backup compatibility', () => {
	it.each([v1, v2, v3])(
		'preserves the complete source semantics, repeated roundtrip and history',
		(source) => {
			const expected =
				source.schemaVersion === 3
					? source
					: { ...parseLegacyProject(JSON.stringify(source)), schemaVersion: 3 };
			const project = parseProject(JSON.stringify(source));
			expect(project).toEqual(expected);
			expect(parseProject(serializeProject(parseProject(serializeProject(project))))).toEqual(
				project
			);
			const history = new History();
			history.record(project);
			const reordered = {
				...project,
				diagrams: project.diagrams.map((d, i) => (i ? d : reorder(d, [d.elements[0].id], false)))
			};
			expect(history.undo(reordered)).toEqual(project);
			expect(history.redo(project)).toEqual(reordered);
			expect(parseProject(serializeProject(reordered))).toEqual(reordered);
		}
	);
	it('rejects an invalid v3 reference without modifying the open rich document', () => {
		const current = parseProject(JSON.stringify(v3)),
			before = serializeProject(current),
			bad = structuredClone(v3);
		bad.diagrams[0].elements[0].childDiagramId = 'missing-child';
		expect(() => parseProject(JSON.stringify(bad))).toThrow();
		expect(serializeProject(current)).toBe(before);
		expect(current.assets).toEqual(v3.assets);
	});
});
