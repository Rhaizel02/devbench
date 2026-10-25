<script lang="ts">
	import { Copy } from '@lucide/svelte';
	let { text, label = 'Copy value' }: { text: string; label?: string } = $props();
	let copied = $state<string | null>(null);
	let error = $state(false);
	async function copy() {
		const snapshot = text;
		try {
			await navigator.clipboard.writeText(snapshot);
			if (text === snapshot) {
				copied = snapshot;
				error = false;
			}
		} catch {
			copied = null;
			error = true;
		}
	}
</script>

<button class="text-button" aria-label={label} onclick={copy}
	><Copy size={14} />{copied === text ? 'Copied' : 'Copy'}</button
>
<span class="sr-only" role="status"
	>{error
		? 'Clipboard blocked. Select and copy the value manually.'
		: copied === text
			? 'Copied'
			: ''}</span
>
