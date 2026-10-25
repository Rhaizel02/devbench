import { clone, type Project } from './model';
import { parseProject, serializeProject } from './serialization';
export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error';
export type StoredProject = {
	id: string;
	title: string;
	updatedAt: number;
	json: string;
	revision?: number;
	/** Immutable rescue copy, captured atomically on the first real legacy edit. */
	originalJson?: string;
};
export class CanvasConflictError extends Error {
	constructor() {
		super(
			'Canvas changed or was deleted in another tab. Export a rescue JSON, then reload to open the newer saved version.'
		);
	}
}
/** This database is the explicit Canvas-only exception to DevBench's memory-only policy. */
export async function openCanvasDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = factory.open('devbench.canvas.v2', 1);
		let settled = false;
		const timeout = setTimeout(() => {
			settled = true;
			reject(
				new Error('Canvas storage is blocked. Close other tabs and retry, or export a rescue copy.')
			);
		}, 3000);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains('projects'))
				request.result.createObjectStore('projects', { keyPath: 'id' });
		};
		request.onblocked = () => {
			clearTimeout(timeout);
			settled = true;
			reject(new Error('Canvas storage is blocked by another tab. Export a rescue copy.'));
		};
		request.onerror = () => {
			clearTimeout(timeout);
			settled = true;
			reject(new Error('Canvas storage is unavailable. Your board remains in memory.'));
		};
		request.onsuccess = () => {
			clearTimeout(timeout);
			if (settled) {
				request.result.close();
				return;
			}
			settled = true;
			request.result.onversionchange = () => request.result.close();
			resolve(request.result);
		};
	});
}
export class CanvasStorage {
	constructor(
		private db: IDBDatabase,
		private versions = new Map<string, number>()
	) {}
	reopen(db: IDBDatabase) {
		return new CanvasStorage(db, new Map(this.versions));
	}
	private transaction<T>(
		mode: IDBTransactionMode,
		operation: (store: IDBObjectStore) => IDBRequest<T>
	): Promise<T> {
		return new Promise((resolve, reject) => {
			try {
				const tx = this.db.transaction('projects', mode),
					request = operation(tx.objectStore('projects'));
				let result: T;
				request.onsuccess = () => {
					result = request.result;
				};
				tx.oncomplete = () => resolve(result);
				tx.onerror = tx.onabort = () =>
					reject(
						new Error(
							'Canvas could not save to this browser (quota, permissions or closed storage). Export a rescue copy and retry.'
						)
					);
			} catch {
				reject(new Error('Canvas storage is unavailable. Export a rescue copy and retry.'));
			}
		});
	}
	async list(): Promise<StoredProject[]> {
		return ((await this.transaction('readonly', (s) => s.getAll())) as StoredProject[]).sort(
			(a, b) => b.updatedAt - a.updatedAt
		);
	}
	async load(id: string): Promise<Project> {
		const row = (await this.transaction('readonly', (s) => s.get(id))) as StoredProject | undefined;
		if (!row) throw new Error('Project no longer exists.');
		const parsed = parseProject(row.json);
		this.versions.set(id, row.revision ?? 0);
		return parsed;
	}
	async save(project: Project): Promise<void> {
		const row: StoredProject = {
			id: project.id,
			title: project.title,
			updatedAt: Date.now(),
			json: serializeProject(project)
		};
		await new Promise<void>((resolve, reject) => {
			let conflict = false,
				next = 0;
			try {
				const tx = this.db.transaction('projects', 'readwrite'),
					store = tx.objectStore('projects'),
					read = store.get(project.id);
				tx.oncomplete = () => {
					this.versions.set(project.id, next);
					resolve();
				};
				tx.onerror = tx.onabort = () =>
					reject(
						conflict
							? new CanvasConflictError()
							: new Error(
									'Canvas could not save (quota, permissions or closed storage). Export a rescue copy and retry.'
								)
					);
				read.onsuccess = () => {
					try {
						const current = read.result as StoredProject | undefined,
							known = this.versions.get(project.id),
							actual = current?.revision ?? 0;
						if (current?.json === row.json) {
							next = actual;
							return;
						}
						if ((current && known !== actual) || (!current && known !== undefined)) {
							conflict = true;
							tx.abort();
							return;
						}
						next = actual + 1;
						const originalJson =
							current?.originalJson ??
							(current && JSON.parse(current.json).schemaVersion < 3 ? current.json : undefined);
						store.put({ ...row, revision: next, ...(originalJson ? { originalJson } : {}) });
					} catch {
						tx.abort();
					}
				};
			} catch {
				reject(new Error('Canvas storage is unavailable. Export a rescue copy and retry.'));
			}
		});
	}
	async remove(id: string): Promise<void> {
		await this.transaction('readwrite', (s) => s.delete(id));
		this.versions.delete(id);
	}
	close() {
		this.db.close();
	}
}
/** Serial writer: edits during a write queue a newer snapshot; failures retain dirty state. */
export function createAutosaver(
	write: (project: Project) => Promise<void>,
	notify: (state: SaveState, message?: string) => void,
	delay = 600
) {
	let timer: ReturnType<typeof setTimeout> | undefined,
		revision = 0,
		saved = 0,
		latest: Project | undefined,
		running: Promise<boolean> | undefined,
		disposed = false;
	async function flush(): Promise<boolean> {
		clearTimeout(timer);
		if (running) {
			const ok = await running;
			return ok ? flush() : false;
		}
		if (!latest || saved === revision) return true;
		const target = revision,
			snapshot = clone(latest);
		notify('saving');
		running = (async () => {
			try {
				await write(snapshot);
				saved = target;
				notify(saved === revision ? 'saved' : 'unsaved');
				return true;
			} catch (reason) {
				notify(
					'error',
					reason instanceof CanvasConflictError
						? reason.message
						: 'Autosave failed. Keep this tab open, retry or export a rescue JSON.'
				);
				return false;
			}
		})();
		const ok = await running;
		running = undefined;
		if (ok && saved !== revision && !disposed) return flush();
		return ok;
	}
	return {
		schedule(project: Project) {
			latest = project;
			revision++;
			notify('unsaved');
			clearTimeout(timer);
			if (!disposed) timer = setTimeout(() => void flush(), delay);
		},
		flush,
		get dirty() {
			return saved !== revision;
		},
		async dispose() {
			clearTimeout(timer);
			const ok = await flush();
			disposed = true;
			return ok;
		}
	};
}
