<script lang="ts">
	import TextGenerator from './TextGenerator.svelte';
	import GtinGenerator from './GtinGenerator.svelte';
	let utility = $state('text');
</script>

<div class="tool-options">
	<label
		>Utility <select aria-label="Test data utility" bind:value={utility}
			><option value="text">Lorem Ipsum & synthetic text</option><option value="gtin"
				>EAN-13 / GTIN-14</option
			></select
		></label
	>
</div>
{#if utility === 'text'}<TextGenerator />{:else}<GtinGenerator />{/if}
<div class="studio-footer">
	Runs locally. Inputs and results are memory-only and cleared when leaving.
</div>
