import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDemoProject } from '../lab/architecture-canvas/seed';
import { parseProject, serializeProject } from './serialization';
import {
	DEFAULT_STYLE,
	LIMITS,
	emptyProject,
	associateChild,
	deleteDiagram,
	orphanDiagrams,
	duplicateSelection,
	deleteSelection,
	moveSelection,
	resizeElement,
	endpoint,
	anchorAt,
	sketchPath,
	type Element
} from './model';
import { History } from './history';
import { createAutosaver, openCanvasDatabase, CanvasStorage } from './persistence';
const figure = (id = 'shape'): Element => ({
	id,
	kind: 'rounded',
	x: 10,
	y: 20,
	width: 200,
	height: 100,
	label: 'Unicode 👨‍👩‍👦 café <script>',
	style: { ...DEFAULT_STYLE, fill: '#ffeebb' },
	z: 1
});
function project() {
	const p = emptyProject('project', 'root');
	p.diagrams[0].elements.push(figure());
	return p;
}
afterEach(() => vi.useRealTimers());
describe('versioned documents and hostile imports', () => {
	it('migrates the complete v1 spike preserving every ID, label, point, camera and hierarchy', () => {
		const source = createDemoProject();
		source.diagrams[0].connections.push({
			id: 'legacy-text-edge',
			from: 'api',
			to: source.diagrams[0].elements.find((e) => e.kind === 'text')!.id,
			kind: 'line'
		});
		const result = parseProject(JSON.stringify(source));
		expect(result.schemaVersion).toBe(3);
		expect(result.id).toBe(source.id);
		expect(result.rootDiagramId).toBe(source.rootDiagramId);
		for (const d of source.diagrams) {
			const migrated = result.diagrams.find((x) => x.id === d.id)!;
			expect(Math.min(...migrated.elements.map((e) => e.z))).toBeGreaterThan(
				Math.max(...migrated.connections.map((c) => c.z))
			);
			expect(migrated.title).toBe(d.title);
			expect(migrated.viewport).toEqual(d.viewport);
			for (const e of d.elements)
				expect(migrated.elements.find((x) => x.id === e.id)).toMatchObject(e);
			for (const c of d.connections) {
				const edge = migrated.connections.find((x) => x.id === c.id)!;
				expect(edge.kind).toBe(c.kind);
				expect(edge.start.elementId).toBe(c.from);
				expect(edge.end.elementId).toBe(c.to);
			}
		}
		expect(parseProject(serializeProject(result))).toEqual(result);
	});
	it('roundtrips all shapes, styles, free/anchored endpoints and orphan diagrams', () => {
		const p = project();
		p.diagrams[0].elements.push({
			...figure('ink'),
			kind: 'stroke',
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 }
			]
		});
		p.diagrams.push({ ...p.diagrams[0], id: 'orphan', elements: [], connections: [] });
		p.diagrams[0].connections.push({
			id: 'edge',
			kind: 'arrow',
			start: anchorAt(p.diagrams[0], { x: 10, y: 50 }),
			end: { x: 400, y: 300 },
			style: { ...DEFAULT_STYLE, dashed: true, font: 'mono' },
			z: 2
		});
		expect(parseProject(serializeProject(p))).toEqual(p);
	});
	it('preserves legacy Unicode IDs and child links on v1 text annotations', () => {
		const source = createDemoProject();
		source.id = 'legacy-示例';
		const note = source.diagrams[0].elements.find((e) => e.kind === 'text')!;
		note.childDiagramId = 'service-diagram';
		const result = parseProject(JSON.stringify(source));
		expect(result.id).toBe(source.id);
		expect(result.diagrams[0].elements.find((e) => e.id === note.id)?.childDiagramId).toBe(
			'service-diagram'
		);
	});
	it.each([
		'future',
		'duplicate',
		'missing-child',
		'cycle',
		'dangling-anchor',
		'nonfinite',
		'style',
		'oversized-label',
		'too-many-diagrams',
		'ink-limit'
	] as const)('rejects %s without mutating current document', (kind) => {
		const current = project(),
			before = serializeProject(current),
			bad = structuredClone(current);
		if (kind === 'future') (bad as unknown as { schemaVersion: number }).schemaVersion = 99;
		if (kind === 'duplicate') bad.diagrams[0].elements.push(figure());
		if (kind === 'missing-child') bad.diagrams[0].elements[0].childDiagramId = 'absent';
		if (kind === 'cycle') bad.diagrams[0].elements[0].childDiagramId = 'root';
		if (kind === 'dangling-anchor')
			bad.diagrams[0].connections.push({
				id: 'edge',
				kind: 'line',
				start: { x: 0, y: 0, elementId: 'absent', u: 0, v: 0 },
				end: { x: 4, y: 4 },
				style: DEFAULT_STYLE,
				z: 1
			});
		if (kind === 'nonfinite') bad.diagrams[0].elements[0].x = Infinity;
		if (kind === 'style') bad.diagrams[0].elements[0].style.fill = 'url(https://invalid.example)';
		if (kind === 'oversized-label')
			bad.diagrams[0].elements[0].label = 'x'.repeat(LIMITS.label + 1);
		if (kind === 'too-many-diagrams') bad.diagrams = Array(101).fill(bad.diagrams[0]);
		if (kind === 'ink-limit')
			bad.diagrams[0].elements.push({
				...figure('ink'),
				kind: 'stroke',
				points: Array(2001).fill({ x: 0, y: 0 })
			});
		expect(() => parseProject(JSON.stringify(bad))).toThrow();
		expect(serializeProject(current)).toBe(before);
	});
	it('rejects prototype keys, deep JSON, invalid syntax, byte limits and malformed v1 before typed code', () => {
		for (const text of [
			'{"schemaVersion":2,"__proto__":{"polluted":true}}',
			'{"constructor":{}}',
			'[',
			'['.repeat(22) + '0' + ']'.repeat(22),
			' '.repeat(LIMITS.bytes + 1),
			'{}',
			'{"schemaVersion":1,"diagrams":[null]}'
		])
			expect(() => parseProject(text)).toThrow();
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});
});
describe('editing, hierarchy and history', () => {
	it('keeps anchors on moved/resized figures and translates free endpoints with selected lines', () => {
		let d = project().diagrams[0];
		const start = anchorAt(d, { x: 12, y: 50 });
		expect(start).toMatchObject({ elementId: 'shape', u: 0 });
		d.connections.push({
			id: 'edge',
			kind: 'arrow',
			start,
			end: { x: 500, y: 80 },
			style: DEFAULT_STYLE,
			z: 3
		});
		d = moveSelection(d, ['shape', 'edge'], { x: 50, y: 20 });
		expect(endpoint(d, d.connections[0].start)).toEqual({ x: 60, y: 70 });
		expect(d.connections[0].end).toMatchObject({ x: 550, y: 100 });
		d.elements[0] = resizeElement(d.elements[0], 400, 200);
		expect(endpoint(d, d.connections[0].start)).toEqual({ x: 60, y: 100 });
		expect(deleteSelection(d, ['shape']).connections).toEqual([]);
	});
	it('duplicates internal edges with fresh stable IDs and preserves originals', () => {
		const d = project().diagrams[0];
		d.elements.push({ ...figure('second'), x: 400 });
		d.connections.push({
			id: 'edge',
			kind: 'line',
			start: anchorAt(d, { x: 210, y: 70 }),
			end: anchorAt(d, { x: 400, y: 70 }),
			style: DEFAULT_STYLE,
			z: 2
		});
		let counter = 0;
		const copy = duplicateSelection(d, ['shape', 'second'], () => `copy-${++counter}`);
		expect(copy.diagram.elements).toHaveLength(4);
		expect(copy.diagram.connections).toHaveLength(2);
		expect(copy.diagram.connections[1].start.elementId).toBe('copy-1');
		expect(copy.diagram.connections[1].end.elementId).toBe('copy-2');
		expect(d.elements).toHaveLength(2);
	});
	it('creates three levels, rejects cycles including orphan subgraphs and retains orphan content on delete', () => {
		let p = project();
		p.diagrams.push(
			{ ...p.diagrams[0], id: 'child', elements: [figure('inner')] },
			{ ...p.diagrams[0], id: 'grandchild', elements: [figure('deep')] }
		);
		p = associateChild(p, 'root', 'shape', 'child');
		p = associateChild(p, 'child', 'inner', 'grandchild');
		expect(() => associateChild(p, 'grandchild', 'deep', 'root')).toThrow('cycle');
		p = {
			...p,
			diagrams: p.diagrams.map((d) => (d.id === 'root' ? deleteSelection(d, ['shape']) : d))
		};
		expect(orphanDiagrams(p).map((d) => d.id)).toEqual(['child']);
		p = deleteDiagram(p, 'child');
		expect(orphanDiagrams(p).map((d) => d.id)).toEqual(['grandchild']);
		expect(p.diagrams[1].elements[0].label).toContain('café');
		expect(() => deleteDiagram(p, 'root')).toThrow();
		expect(() => associateChild(p, 'grandchild', 'deep', 'missing')).toThrow();
	});
	it('undo/redo isolates snapshots, clears redo after editing and bounds history', () => {
		const history = new History();
		let p = project();
		history.record(p);
		p = { ...p, title: 'Changed' };
		const previous = history.undo(p);
		expect(previous.title).toBe('Untitled board');
		expect(history.canRedo).toBe(true);
		expect(history.redo(previous).title).toBe('Changed');
		history.undo(p);
		history.record(previous);
		expect(history.canRedo).toBe(false);
		for (let i = 0; i < 40; i++) history.record({ ...p, title: String(i) });
		let count = 0;
		while (history.canUndo) {
			p = history.undo(p);
			count++;
		}
		expect(count).toBe(LIMITS.history);
		history.clear();
		expect(history.canRedo).toBe(false);
	});
	it('uses deterministic sketch contours rather than frame-dependent noise', () => {
		expect(sketchPath('rectangle', 200, 100)).toEqual(sketchPath('rectangle', 200, 100));
		expect(sketchPath('diamond', 200, 100)).toHaveLength(8);
	});
});
describe('ordered autosave and storage failures', () => {
	it('never overwrites a future schema even if an external writer kept the revision number', async () => {
		const p = project(),
			read = {} as IDBRequest,
			put = vi.fn();
		const tx = {
			objectStore: () => ({ get: () => read, put }),
			abort: () => tx.onabort?.(new Event('abort')),
			onabort: null as ((event: Event) => void) | null,
			onerror: null,
			oncomplete: null
		};
		const store = new CanvasStorage(
			{ transaction: () => tx } as unknown as IDBDatabase,
			new Map([[p.id, 1]])
		);
		const saving = store.save(p);
		Object.defineProperty(read, 'result', {
			value: { id: p.id, revision: 1, json: JSON.stringify({ ...p, schemaVersion: 99 }) }
		});
		read.onsuccess?.(new Event('success'));
		await expect(saving).rejects.toThrow('another tab');
		expect(put).not.toHaveBeenCalled();
	});
	it('debounces edits and writes the most recent version once', async () => {
		vi.useFakeTimers();
		const write = vi.fn(async () => {}),
			notify = vi.fn(),
			save = createAutosaver(write, notify, 100);
		save.schedule(project());
		save.schedule({ ...project(), title: 'Newest' });
		await vi.advanceTimersByTimeAsync(99);
		expect(write).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(write).toHaveBeenCalledTimes(1);
		expect(write.mock.calls[0]).toMatchObject([{ title: 'Newest' }]);
		expect(save.dirty).toBe(false);
		expect(notify).toHaveBeenLastCalledWith('saved');
	});
	it('serializes slow writes so older data never overwrites later edits', async () => {
		let release: () => void = () => {};
		const values: string[] = [];
		const save = createAutosaver(
			async (p) => {
				values.push(p.title);
				if (values.length === 1)
					await new Promise<void>((resolve) => {
						release = resolve;
					});
			},
			() => {},
			10000
		);
		save.schedule(project());
		const flush = save.flush();
		save.schedule({ ...project(), title: 'Second' });
		release();
		expect(await flush).toBe(true);
		expect(values).toEqual(['Untitled board', 'Second']);
		expect(save.dirty).toBe(false);
		await save.dispose();
	});
	it.each(['QuotaExceededError', 'InvalidStateError'])(
		'retains unsaved state on %s and can retry/export',
		async (name) => {
			const write = vi
					.fn<(p: ReturnType<typeof project>) => Promise<void>>()
					.mockRejectedValueOnce(new DOMException('failure', name))
					.mockResolvedValueOnce(undefined),
				notify = vi.fn(),
				p = project(),
				save = createAutosaver(write, notify);
			save.schedule(p);
			expect(await save.flush()).toBe(false);
			expect(save.dirty).toBe(true);
			expect(notify).toHaveBeenLastCalledWith('error', expect.stringContaining('rescue'));
			expect(parseProject(serializeProject(p))).toEqual(p);
			expect(await save.flush()).toBe(true);
			expect(save.dirty).toBe(false);
			await save.dispose();
		}
	);
	it('reports blocked DB and closes a delayed success connection', async () => {
		const request = {} as IDBOpenDBRequest,
			close = vi.fn();
		const opening = openCanvasDatabase({ open: () => request } as unknown as IDBFactory);
		request.onblocked?.(new Event('blocked') as IDBVersionChangeEvent);
		await expect(opening).rejects.toThrow('blocked');
		Object.defineProperty(request, 'result', { value: { close } });
		request.onsuccess?.(new Event('success'));
		expect(close).toHaveBeenCalled();
	});
	it('does not claim success if a storage transaction aborts', async () => {
		const tx = { objectStore: () => ({ get: () => ({}) }) } as unknown as IDBTransaction;
		const storage = new CanvasStorage({ transaction: () => tx } as unknown as IDBDatabase);
		const saving = storage.save(project());
		tx.onabort?.(new Event('abort'));
		await expect(saving).rejects.toThrow('quota');
	});
});
