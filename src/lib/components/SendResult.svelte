<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { handoffTargets } from '#lib/tools/handoffs.js';
	let { source, text }: { source: string; text: string | null } = $props();
	const app = useAppState();
	let error = $state('');
	let errorFor = $state<string | null>(null);
	const targets = $derived(text === null ? [] : handoffTargets(source, text));
	async function send(id: string) {
		const snapshot = text;
		const target =
			snapshot === null
				? undefined
				: handoffTargets(source, snapshot).find((tool) => tool.id === id);
		if (!target || snapshot === null) return;
		app.pendingPaste = { toolId: id, text: snapshot };
		try {
			await goto(resolve(`tools/${target.slug}/`));
		} catch {
			app.pendingPaste = null;
			error = 'Could not open the destination. Your result remains here.';
			errorFor = snapshot;
		}
	}
</script>

{#if targets.length}<div
		class="tool-options handoff-actions"
		aria-label="Open current result in another tool"
	>
		<span
			>{['BACK-03', 'BACK-06', 'BACK-10'].includes(source)
				? 'Open redacted result in…'
				: 'Open result in…'}</span
		>{#each targets as target (target.id)}<button class="button" onclick={() => send(target.id)}
				>{target.name}</button
			>{/each}<span class="tool-help">One transfer, in memory only.</span>
	</div>{:else if text !== null && text.length > 1024 * 1024}<p class="tool-help">
		Result exceeds the 1 MiB transfer limit.
	</p>{/if}
{#if errorFor === text && error}<p role="alert" class="parse-error">{error}</p>{/if}
