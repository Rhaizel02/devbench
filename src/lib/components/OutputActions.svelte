<script lang="ts">
	import { Copy, Download } from '@lucide/svelte';
	let {
		text,
		filename = 'devbench-output.txt',
		mime = 'text/plain;charset=utf-8'
	}: { text: string | null; filename?: string; mime?: string } = $props();
	let message = $state('');
	let messageFor = $state<string | null>(null);
	let failed = $state(false);
	async function copy() {
		if (text === null) return;
		const snapshot = text;
		try {
			await navigator.clipboard.writeText(snapshot);
			if (text === snapshot) {
				messageFor = snapshot;
				message = 'Copied';
				failed = false;
			}
		} catch {
			if (text !== snapshot) return;
			messageFor = snapshot;
			message = 'Clipboard blocked. Select and copy the output manually.';
			failed = true;
		}
	}
	function download() {
		if (text === null) return;
		messageFor = text;
		try {
			const url = URL.createObjectURL(new Blob([text], { type: mime }));
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			message = 'Download started';
			failed = false;
		} catch {
			message = 'Download could not be started.';
			failed = true;
		}
	}
</script>

<div class="output-actions">
	<span role="status" class:error-message={failed} class="output-feedback"
		>{messageFor === text ? message : ''}</span
	><button class="text-button" disabled={text === null} onclick={copy}
		><Copy size={14} />Copy output</button
	><button class="text-button" disabled={text === null} onclick={download}
		><Download size={14} />Download</button
	>
</div>
