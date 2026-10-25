import { v1Tools } from '#lib/tools/tool-registry.js';
export type Theme = 'dark' | 'light' | 'system';
export type Preferences = {
	theme: Theme;
	favorites: string[];
	recent: { toolId: string; visitedAt: number }[];
};
export const STORAGE_KEY = 'devbench.preferences.v1';
export const defaultPreferences = (): Preferences => ({ theme: 'dark', favorites: [], recent: [] });
const ids = new Set(v1Tools.map((tool) => tool.id));
export function sanitizePreferences(value: unknown): Preferences {
	const defaults = defaultPreferences();
	if (!value || typeof value !== 'object') return defaults;
	const data = value as Record<string, unknown>;
	return {
		theme: data.theme === 'light' || data.theme === 'system' ? data.theme : 'dark',
		favorites: Array.isArray(data.favorites)
			? [
					...new Set(
						data.favorites.filter((id): id is string => typeof id === 'string' && ids.has(id))
					)
				]
			: [],
		recent: Array.isArray(data.recent)
			? data.recent
					.filter(
						(item): item is { toolId: string; visitedAt: number } =>
							!!item &&
							typeof item === 'object' &&
							ids.has(item.toolId) &&
							Number.isFinite(item.visitedAt) &&
							item.visitedAt > 0
					)
					.map(({ toolId, visitedAt }) => ({ toolId, visitedAt }))
					.filter(
						(item, index, list) => list.findIndex((other) => other.toolId === item.toolId) === index
					)
					.slice(0, 6)
			: []
	};
}
export function loadPreferences(storage: Pick<Storage, 'getItem'>): Preferences {
	try {
		return sanitizePreferences(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null'));
	} catch {
		return defaultPreferences();
	}
}
export function savePreferences(storage: Pick<Storage, 'setItem'>, value: Preferences): boolean {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(sanitizePreferences(value)));
		return true;
	} catch {
		return false;
	}
}
