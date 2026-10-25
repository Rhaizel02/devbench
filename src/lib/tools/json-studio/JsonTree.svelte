<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { ChevronRight, ChevronDown, Copy } from '@lucide/svelte';
	import { treeRows, jsonPath, TREE_MAX_DEPTH, type JsonValue } from './json-engine';
	let {
		value,
		oncopy,
		onerror
	}: {
		value: JsonValue;
		oncopy: (text: string, description: string) => Promise<void>;
		onerror: (message: string) => void;
	} = $props();
	const expanded = new SvelteSet(['$']);
	let query = $state('');
	let limit = $state(500);
	const tree = $derived(treeRows(value, expanded, query, limit));
	const rowLabel = (value: JsonValue) =>
		value === null ? 'null' : typeof value === 'string' ? JSON.stringify(value) : String(value);
	function toggle(path: string) {
		if (expanded.has(path)) expanded.delete(path);
		else expanded.add(path);
	}
	async function copyValue(value: JsonValue) {
		try {
			await oncopy(JSON.stringify(value), 'Value copied');
		} catch {
			onerror('This value is too deeply nested to copy. Use Copy output in Code view.');
		}
	}
	function expandAll() {
		expanded.clear();
		const stack = [{ value, path: '$', depth: 0 }];
		let count = 0;
		while (stack.length && count++ < 50000) {
			const node = stack.pop()!;
			if (node.value === null || typeof node.value !== 'object' || node.depth >= TREE_MAX_DEPTH)
				continue;
			expanded.add(node.path);
			const entries = Object.entries(node.value);
			const available = Math.max(0, 50000 - count - stack.length);
			for (const [key, child] of entries.slice(0, available)) {
				stack.push({
					value: child,
					depth: node.depth + 1,
					path: jsonPath(node.path, Array.isArray(node.value) ? Number(key) : key)
				});
			}
		}
	}
</script>

<div class="tree-toolbar">
	<label class="sr-only" for="tree-search">Search JSON tree</label>
	<input id="tree-search" type="search" bind:value={query} placeholder="Find keys or values…" />
	<button class="text-button" onclick={expandAll}>Expand all</button>
	<button class="text-button" onclick={() => expanded.clear()}>Collapse all</button>
</div>
<div class="json-tree" aria-label="JSON tree">
	{#each tree.rows as row (row.path)}
		<div class="tree-row" style:padding-left={Math.min(row.depth, 12) * 16 + 8 + 'px'}>
			{#if row.branch}
				<button
					class="tree-toggle"
					aria-label={(expanded.has(row.path) ? 'Collapse ' : 'Expand ') + row.path}
					aria-expanded={expanded.has(row.path)}
					onclick={() => toggle(row.path)}
				>
					{#if expanded.has(row.path)}<ChevronDown size={14} />{:else}<ChevronRight
							size={14}
						/>{/if}
				</button>
			{:else}<span class="tree-spacer"></span>{/if}
			<button
				class="tree-label"
				title={row.path}
				aria-label={'Copy property name ' + row.path}
				onclick={() => oncopy(row.label, 'Property name copied')}>{row.label}</button
			>
			<span class="muted">:</span>
			<span class="tree-value"
				>{row.branch
					? (Array.isArray(row.value) ? 'Array' : 'Object') +
						' (' +
						Object.keys(row.value as object).length +
						')'
					: rowLabel(row.value)}</span
			>
			<div class="tree-actions">
				<button
					class="icon-button"
					aria-label={'Copy JSONPath ' + row.path}
					onclick={() => oncopy(row.path, 'JSONPath copied')}><Copy size={12} /></button
				>
				<button
					class="text-button"
					aria-label={'Copy JSON Pointer ' + row.path}
					onclick={() => oncopy(row.pointer, 'JSON Pointer copied')}>/</button
				>
				<button
					class="text-button"
					aria-label={'Copy value ' + row.path}
					onclick={() => copyValue(row.value)}>Value</button
				>
			</div>
		</div>
	{/each}
	{#if !tree.rows.length}<p class="empty">No keys or values match your search.</p>{/if}
	{#if tree.truncated}<div class="tree-limit">
			<p>
				Showing a bounded view: up to 50,000 scanned nodes and 128 levels of depth. Use Code view
				for the complete result.
			</p>
			{#if limit < 5000}<button class="button" onclick={() => (limit += 500)}
					>Show more nodes</button
				>{/if}
		</div>{/if}
</div>
