<script lang="ts">
	import { onMount, type Component } from 'svelte';
	let Editor = $state<Component | null>(null);
	let failed = $state(false);
	onMount(() => {
		let active = true;
		void import('#lib/canvas/CanvasEditor.svelte')
			.then((module) => {
				if (active) Editor = module.default;
			})
			.catch(() => {
				if (active) failed = true;
			});
		return () => {
			active = false;
		};
	});
</script>

<svelte:head
	><title>Architecture Canvas Lab — DevBench</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
{#if Editor}<Editor />{:else}<div class="workspace-page">
		<h1>Architecture Canvas</h1>
		<p role="status">
			{failed
				? 'The experimental editor could not be loaded. Reload to retry.'
				: 'Loading the experimental editor…'}
		</p>
	</div>{/if}
