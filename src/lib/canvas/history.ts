import { clone, LIMITS, type Project } from './model';
type Entry = { project: Project; size: number };
/** Snapshots at transaction boundaries only; immutable asset strings are budgeted once. */
export class History {
	private past: Entry[] = [];
	private future: Entry[] = [];
	get canUndo() {
		return this.past.length > 0;
	}
	get canRedo() {
		return this.future.length > 0;
	}
	private snapshot(project: Project): Entry {
		const document: Project = clone({ ...project, assets: undefined });
		if (project.assets) document.assets = project.assets.map((asset) => ({ ...asset }));
		const size =
			JSON.stringify({
				...document,
				assets: document.assets?.map((a) => ({ ...a, data: undefined }))
			}).length * 2;
		return { project: document, size };
	}
	private trim() {
		const bytes = () => {
			const all = [...this.past, ...this.future];
			const data = new Set(all.flatMap((e) => e.project.assets?.map((a) => a.data) ?? []));
			return (
				all.reduce((n, e) => n + e.size, 0) +
				[...data].reduce((n, value) => n + value.length * 2, 0)
			);
		};
		while (
			this.past.length + this.future.length > LIMITS.history ||
			(this.past.length + this.future.length > 1 && bytes() > 20 * 1024 * 1024)
		) {
			if (this.past.length) this.past.shift();
			else this.future.shift();
		}
	}
	record(before: Project) {
		this.past.push(this.snapshot(before));
		this.future = [];
		this.trim();
	}
	undo(current: Project): Project {
		const next = this.past.pop();
		if (!next) return current;
		this.future.push(this.snapshot(current));
		this.trim();
		return next.project;
	}
	redo(current: Project): Project {
		const next = this.future.pop();
		if (!next) return current;
		this.past.push(this.snapshot(current));
		this.trim();
		return next.project;
	}
	clear() {
		this.past = [];
		this.future = [];
	}
}
