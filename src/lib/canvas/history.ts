import { clone, LIMITS, type Project } from './model';
export class History {
	private past: Project[] = [];
	private future: Project[] = [];
	get canUndo() {
		return this.past.length > 0;
	}
	get canRedo() {
		return this.future.length > 0;
	}
	record(before: Project) {
		this.past.push(clone(before));
		this.future = [];
		while (
			this.past.length > LIMITS.history ||
			(this.past.length > 1 && JSON.stringify(this.past).length > 20 * 1024 * 1024)
		)
			this.past.shift();
	}
	undo(current: Project): Project {
		const next = this.past.pop();
		if (!next) return current;
		this.future.push(clone(current));
		return next;
	}
	redo(current: Project): Project {
		const next = this.future.pop();
		if (!next) return current;
		this.past.push(clone(current));
		return next;
	}
	clear() {
		this.past = [];
		this.future = [];
	}
}
