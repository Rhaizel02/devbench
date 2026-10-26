<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	let {
		rows,
		selected = $bindable(''),
		label = 'Document tree'
	}: {
		rows: {
			id: string;
			parent?: string;
			depth: number;
			label: string;
			detail?: string;
			search?: string;
			branch: boolean;
		}[];
		selected?: string;
		label?: string;
	} = $props();
	let query = $state(''),
		closed = $state<Set<string>>(new Set<string>()),
		limit = $state(200);
	const visible = $derived.by(() => {
		const result: typeof rows = [];
		const hidden = new SvelteSet<string>();
		const wanted = new SvelteSet<string>();
		const byId = new Map(rows.map((r) => [r.id, r]));
		if (query.trim())
			for (const row of rows)
				if (
					`${row.label} ${row.detail ?? ''} ${row.search ?? ''}`
						.toLowerCase()
						.includes(query.toLowerCase())
				) {
					let r: typeof row | undefined = row;
					while (r) {
						wanted.add(r.id);
						r = r.parent ? byId.get(r.parent) : undefined;
					}
				}
		for (const row of rows) {
			if (query.trim()) {
				if (wanted.has(row.id)) result.push(row);
				continue;
			}
			if (row.parent && hidden.has(row.parent)) {
				hidden.add(row.id);
				continue;
			}
			result.push(row);
			if (closed.has(row.id)) hidden.add(row.id);
		}
		return result;
	});
	function toggle(id: string) {
		const next = new SvelteSet(closed);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		closed = next;
	}
	function key(event: KeyboardEvent, index: number) {
		const row = visible[index];
		if (!row) return;
		const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
		if (!keys.includes(event.key)) return;
		event.preventDefault();
		if (event.key === 'ArrowLeft') {
			if (row.branch && !closed.has(row.id)) {
				toggle(row.id);
				return;
			}
			const parent = visible.findIndex((r) => r.id === row.parent);
			if (parent >= 0) index = parent;
		} else if (event.key === 'ArrowRight') {
			if (row.branch && closed.has(row.id)) {
				toggle(row.id);
				return;
			}
			index = Math.min(index + 1, Math.min(limit, visible.length) - 1);
		} else
			index =
				event.key === 'Home'
					? 0
					: event.key === 'End'
						? Math.min(limit, visible.length) - 1
						: Math.max(
								0,
								Math.min(
									Math.min(limit, visible.length) - 1,
									index + (event.key === 'ArrowDown' ? 1 : -1)
								)
							);
		(event.currentTarget as HTMLElement)
			.closest('[role=tree]')
			?.querySelectorAll<HTMLElement>('[role=treeitem]')
			[index]?.focus();
	}
</script>

<div class="diagnostic-tree-controls">
	<label
		>Find nodes<input
			aria-label={label + ' search'}
			bind:value={query}
			oninput={() => (limit = 200)}
			placeholder="Name, type or content…"
		/></label
	>
	<div class="action-group">
		<button class="button" onclick={() => (closed = new SvelteSet())}>Expand all</button><button
			class="button"
			onclick={() => (closed = new SvelteSet(rows.filter((r) => r.branch).map((r) => r.id)))}
			>Collapse all</button
		>
	</div>
</div>
<div role="tree" aria-label={label} class="diagnostic-tree">
	{#each visible.slice(0, limit) as row, index (row.id)}
		<div class="diagnostic-tree-line" style:padding-left={Math.min(row.depth, 12) * 12 + 'px'}>
			{#if row.branch}<button
					class="tree-toggle"
					aria-label={(closed.has(row.id) ? 'Expand ' : 'Collapse ') + row.label.slice(0, 100)}
					onclick={() => toggle(row.id)}>{closed.has(row.id) ? '▸' : '▾'}</button
				>{:else}<span class="tree-spacer"></span>{/if}
			<button
				role="treeitem"
				aria-level={row.depth + 1}
				aria-selected={selected === row.id}
				aria-expanded={row.branch ? !closed.has(row.id) : undefined}
				tabindex={selected === row.id || (!selected && index === 0) ? 0 : -1}
				class:selected={selected === row.id}
				onclick={() => (selected = row.id)}
				onkeydown={(event) => key(event, index)}
				title={row.label}
			>
				<span>{row.label}</span>{#if row.detail}<small>{row.detail}</small>{/if}
			</button>
		</div>
	{/each}
</div>
{#if visible.length > limit}<button class="button" onclick={() => (limit += 200)}
		>Show 200 more ({visible.length - limit} remaining)</button
	>{/if}
{#if !visible.length}<p class="tool-help">No matching nodes.</p>{/if}
