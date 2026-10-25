import type { Component } from 'svelte';
export const toolWorkspaces: Record<string, () => Promise<{ default: Component }>> = {
	'json-studio': () => import('./json-studio/JsonStudio.svelte'),
	'json-diff': () => import('./json-diff/JsonDiff.svelte'),
	'json-yaml': () => import('./json-yaml/JsonYaml.svelte'),
	'base64-toolkit': () => import('./base64-toolkit/Base64Toolkit.svelte'),
	'url-toolkit': () => import('./url-toolkit/UrlToolkit.svelte'),
	'jwt-inspector': () => import('./jwt-inspector/JwtInspector.svelte'),
	'hash-generator': () => import('./hash-generator/HashGenerator.svelte'),
	'sql-formatter': () => import('./sql-formatter/SqlFormatter.svelte'),
	'regex-tester': () => import('./regex-tester/RegexTester.svelte'),
	'text-diff': () => import('./text-diff/TextDiff.svelte'),
	'id-generator': () => import('./id-generator/IdGenerator.svelte'),
	'timestamp-converter': () => import('./timestamp-converter/TimestampConverter.svelte')
};
