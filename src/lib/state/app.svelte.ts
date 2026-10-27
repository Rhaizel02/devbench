import { getContext, setContext } from 'svelte';
import { defaultPreferences, type Preferences } from './preferences';
const key = Symbol('devbench-instance');
export type PendingPaste = {
	toolId: string;
	text: string;
	mode?: 'seconds' | 'milliseconds' | 'iso';
};
export class AppState {
	preferences = $state<Preferences>(defaultPreferences());
	pendingPaste: PendingPaste | null = null;
	paletteOpen = $state(false);
	// Per-layout, client-only callbacks. No document enters platform messages or persistent state.
	canvasSave?: () => Promise<boolean>;
	canvasExport?: () => void;
	canvasEditing?: () => boolean;
	toggleFavorite(id: string) {
		this.preferences.favorites = this.preferences.favorites.includes(id)
			? this.preferences.favorites.filter((item) => item !== id)
			: [...this.preferences.favorites, id];
	}
	visit(id: string) {
		this.preferences.recent = [
			{ toolId: id, visitedAt: Date.now() },
			...this.preferences.recent.filter((item) => item.toolId !== id)
		].slice(0, 6);
	}
	consumePaste(toolId: string) {
		const value = this.pendingPaste;
		this.pendingPaste = null;
		return value?.toolId === toolId ? value : null;
	}
}
export const createAppState = () => setContext(key, new AppState());
export const useAppState = () => getContext<AppState>(key);
