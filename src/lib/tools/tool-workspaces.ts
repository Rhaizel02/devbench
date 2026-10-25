import type { Component } from 'svelte';
export const toolWorkspaces: Record<string, () => Promise<{ default: Component }>> = {
	'json-studio': () => import('./json-studio/JsonStudio.svelte'),
	'json-diff': () => import('./json-diff/JsonDiff.svelte'),
	'json-yaml': () => import('./json-yaml/JsonYaml.svelte'),
	'base64-toolkit': () => import('./base64-toolkit/Base64Toolkit.svelte'),
	'url-toolkit': () => import('./url-toolkit/UrlToolkit.svelte')
};
