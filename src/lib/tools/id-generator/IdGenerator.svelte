<script lang="ts">
	import OutputActions from '#lib/components/OutputActions.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { generateIds, type IdKind } from './id-engine';
	import { errorMessage } from '../tool-errors';
	let kind = $state<IdKind>('uuid-v4');
	let count = $state(1);
	let ids = $state<string[]>([]);
	let generatedKey = $state('');
	let error = $state('');
	const key = $derived(kind + ':' + count);
	const current = $derived(key === generatedKey ? ids : []);
	function generate() {
		error = '';
		try {
			ids = generateIds(kind, count);
			generatedKey = key;
		} catch (reason) {
			ids = [];
			error = errorMessage(reason);
		}
	}
	function reset() {
		ids = [];
		error = '';
	}
</script>

<div class="tool-options">
	<label
		>Format<select aria-label="ID format" bind:value={kind}
			><option value="uuid-v4">UUID v4</option><option value="uuid-v7">UUID v7</option><option
				value="ulid">ULID</option
			></select
		></label
	><label
		>Batch size<input
			class="field-input"
			type="number"
			min="1"
			max="100"
			step="1"
			aria-label="ID batch size"
			bind:value={count}
		/></label
	>
</div>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={generate}>Generate IDs</button>
	</div>
	<button class="text-button" onclick={reset}>Reset</button>
</div>
{#if error}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="Generated identifiers">
	<div class="section-bar">
		<h2>Generated identifiers</h2>
		<span role="status">{current.length} IDs</span>
	</div>
	{#each current as id, index (index)}<div class="value-row">
			<code>{id}</code><CopyButton text={id} label={'Copy ID ' + (index + 1)} />
		</div>{:else}<p class="empty">
			Generate a real identifier or a batch. Results stay in this workspace.
		</p>{/each}
	<OutputActions text={current.length ? current.join('\n') : null} filename="devbench-ids.txt" />
</section>
<div class="tool-help">
	<p>
		Uses crypto.getRandomValues. UUID v4 has 122 random bits; UUID v7 has a 48-bit epoch-millisecond
		prefix and 74 random bits; ULID has a 48-bit timestamp and 80 random bits encoded with Crockford
		Base32. Batch size is clamped to 1–100. UUID v7 and ULID sort by their timestamp; order within
		one millisecond and monotonicity across clock changes are not guaranteed. These are identifiers,
		not authentication secrets. No absolute uniqueness claim.
	</p>
</div>
