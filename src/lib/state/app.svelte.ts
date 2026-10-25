import { getContext, setContext } from 'svelte';
import { defaultPreferences, type Preferences } from './preferences';
const key = Symbol('devbench-instance');
export class AppState {
	preferences = $state<Preferences>(defaultPreferences());
	pendingPaste: string | null = null;
	paletteOpen = $state(false);
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
	consumePaste() {
		const value = this.pendingPaste;
		this.pendingPaste = null;
		return value;
	}
}
export const createAppState = () => setContext(key, new AppState());
export const useAppState = () => getContext<AppState>(key);
