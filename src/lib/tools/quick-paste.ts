import { tools } from './tool-registry';
export const QUICK_PASTE_LIMIT = 1024 * 1024;
export type PasteSuggestion = {
	id: string;
	kind: string;
	toolId: string;
	slug: string;
	name: string;
	mode?: 'seconds' | 'milliseconds' | 'iso';
};
export function pasteTooLarge(input: string) {
	return (
		input.length > QUICK_PASTE_LIMIT || new TextEncoder().encode(input).length > QUICK_PASTE_LIMIT
	);
}
export function suggestPaste(input: string): PasteSuggestion[] {
	if (pasteTooLarge(input)) return [];
	const value = input.trim();
	if (!value) return [];
	const suggestions: PasteSuggestion[] = [];
	const add = (id: string, kind: string, mode?: PasteSuggestion['mode']) => {
		const tool = tools.find((tool) => tool.id === id && tool.status === 'available');
		if (tool)
			suggestions.push({
				id: id + (mode ?? ''),
				kind,
				toolId: id,
				slug: tool.slug,
				name: tool.name + (mode ? ' (' + mode + ')' : ''),
				mode
			});
	};
	if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(value)) add('SEC-01', 'JWT');
	if (/^https?:\/\/\S+$/i.test(value)) add('ENC-02', 'URL');
	if (/^(select|insert|update|delete|with|create|alter|drop)\b/i.test(value)) add('BACK-01', 'SQL');
	if (
		/^[{["]/.test(value) ||
		/^(true|false|null)$/.test(value) ||
		/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)
	)
		add('DATA-01', 'JSON');
	if (/^-?\d{1,16}(?:\.\d{1,3})?$/.test(value)) {
		add('UTIL-02', 'Timestamp', 'seconds');
		if (!value.includes('.')) add('UTIL-02', 'Timestamp', 'milliseconds');
	}
	if (/^\d{4}-\d{2}-\d{2}T/.test(value)) add('UTIL-02', 'Timestamp', 'iso');
	return suggestions;
}
export function detectPaste(input: string): 'JSON' | 'JWT' | 'URL' | 'SQL' | null {
	return (
		(suggestPaste(input).find((suggestion) => suggestion.kind !== 'Timestamp')?.kind as
			'JSON' | 'JWT' | 'URL' | 'SQL' | undefined) ?? null
	);
}
