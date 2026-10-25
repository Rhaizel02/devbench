<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	let {
		value = $bindable(''),
		label,
		reveal
	}: { value?: string; label: string; reveal: boolean } = $props();
	const id = $props.id();
</script>

{#if reveal}<CodeEditor bind:value {label} language="plain" />{:else}<div class="secret-editor">
		<p {id}>
			Content hidden · {value.length} characters. Paste or type below; reveal explicitly to inspect.
		</p>
		<textarea
			aria-label={label}
			bind:value
			spellcheck="false"
			autocomplete="off"
			autocapitalize="off"
			aria-describedby={id}></textarea>
	</div>{/if}

<style>
	.secret-editor {
		padding: 12px;
		color: var(--color-muted);
		font-size: 12px;
	}
	textarea {
		display: block;
		width: 100%;
		min-height: 220px;
		resize: vertical;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		color: transparent;
		text-shadow: none;
		caret-color: var(--color-accent);
		-webkit-text-security: disc;
		forced-color-adjust: none;
	}
	textarea::selection {
		color: transparent;
		background: var(--color-border);
	}
</style>
