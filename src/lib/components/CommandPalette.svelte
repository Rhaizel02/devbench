<script lang="ts">
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { Search, ArrowUpRight } from '@lucide/svelte';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { searchTools } from '#lib/tools/tool-registry.js';
	import Icon from './Icon.svelte';
	const app = useAppState();
	let dialog: HTMLDialogElement;
	let input: HTMLInputElement;
	let query = $state('');
	let selected = $state(0);
	let returnFocus: HTMLElement | null = null;
	const results = $derived(searchTools(query));
	$effect(() => {
		if (!dialog) return;
		if (app.paletteOpen && !dialog.open) {
			returnFocus = document.activeElement as HTMLElement;
			query = '';
			selected = 0;
			dialog.showModal();
			void tick().then(() => input?.focus());
		} else if (!app.paletteOpen && dialog.open) dialog.close();
	});
	function close() {
		app.paletteOpen = false;
		returnFocus?.focus();
	}
	function open(index: number) {
		const tool = results[index];
		if (!tool) return;
		close();
		void goto(resolve(`tools/${tool.slug}/`));
	}
	function keydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selected = Math.min(selected + 1, results.length - 1);
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selected = Math.max(0, selected - 1);
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			open(selected);
		}
		void tick().then(() =>
			document.getElementById('command-' + selected)?.scrollIntoView({ block: 'nearest' })
		);
	}
</script>

<dialog
	bind:this={dialog}
	class="command-dialog"
	onclose={close}
	oncancel={close}
	aria-labelledby="palette-title"
>
	<form onsubmit={(event) => event.preventDefault()}>
		<div class="command-search">
			<Search size={20} /><label id="palette-title" class="sr-only" for="command-query"
				>Find a tool</label
			><input
				id="command-query"
				bind:this={input}
				bind:value={query}
				onkeydown={keydown}
				oninput={() => (selected = 0)}
				placeholder="Find a tool…"
				role="combobox"
				aria-expanded="true"
				aria-controls="command-results"
				aria-activedescendant={results.length ? 'command-' + selected : undefined}
				autocomplete="off"
			/><button class="key" onclick={close}>Esc</button>
		</div>
		<div id="command-results" role="listbox" aria-label="Tools" class="command-results">
			{#each results as tool, index (tool.id)}
				<button
					id={'command-' + index}
					role="option"
					aria-selected={selected === index}
					class:chosen={selected === index}
					class="command-item"
					onclick={() => open(index)}
					><Icon name={tool.icon} /><span
						><strong>{tool.name}</strong><small>{tool.category}</small></span
					><span class="command-status"
						>{tool.status === 'planned' ? 'Coming later' : 'Open tool'}</span
					><ArrowUpRight size={15} /></button
				>
			{:else}<p class="empty">No tools match this search.</p>{/each}
		</div>
		<div class="command-footer"><span>↑ ↓ to navigate</span><span>↵ to open</span></div>
	</form>
</dialog>
