<script lang="ts">
	import { onDestroy } from 'svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { startOpenApiTask } from './openapi-client';
	import { exportDiff } from './diff-engine';
	import { evolvedContract } from './fixtures';
	import { OPENAPI_LIMITS, type ContractDiff, type InputFormat } from './model';
	import { errorMessage } from '../tool-errors';
	let { baseline, format }: { baseline: string; format: InputFormat } = $props();
	let after = $state(''),
		afterFormat = $state<InputFormat>('auto'),
		error = $state(''),
		busy = $state(false),
		severity = $state(''),
		category = $state(''),
		exportFormat = $state<'json' | 'markdown'>('json');
	let result = $state<{ revision: string; diff: ContractDiff } | null>(null);
	let pending: ReturnType<typeof startOpenApiTask<ContractDiff>> | undefined;
	let ticket = 0,
		disposed = false;
	const revision = $derived(JSON.stringify([baseline, format, after, afterFormat]));
	const current = $derived(result?.revision === revision ? result.diff : null);
	const output = $derived(current ? exportDiff(current, exportFormat) : null);
	const changes = $derived(
		current?.changes.filter(
			(c) => (!severity || c.severity === severity) && (!category || c.category === category)
		) ?? []
	);
	$effect(() => {
		void revision;
		ticket++;
		pending?.cancel();
		result = null;
		busy = false;
		error = '';
	});
	onDestroy(() => {
		disposed = true;
		ticket++;
		pending?.cancel();
	});
	async function compare() {
		pending?.cancel();
		const currentTicket = ++ticket,
			snapshot = revision;
		result = null;
		error = '';
		busy = true;
		try {
			pending = startOpenApiTask<ContractDiff>({
				kind: 'diff',
				input: baseline,
				format,
				after,
				afterFormat
			});
			const diff = await pending.promise;
			if (!disposed && ticket === currentTicket && snapshot === revision)
				result = { revision: snapshot, diff };
		} catch (e) {
			if (!disposed && ticket === currentTicket) error = errorMessage(e);
		} finally {
			if (!disposed && ticket === currentTicket) busy = false;
		}
	}
	async function importFile(event: Event) {
		const input = event.target as HTMLInputElement,
			file = input.files?.[0];
		if (!file) return;
		const current = ++ticket;
		pending?.cancel();
		result = null;
		try {
			if (file.size > OPENAPI_LIMITS.bytes) throw Error('File exceeds 2 MiB.');
			const text = await file.text();
			if (!disposed && current === ticket) after = text;
		} catch (e) {
			if (!disposed && current === ticket) error = errorMessage(e);
		}
		input.value = '';
	}
</script>

<section aria-label="Contract comparison">
	<h3>Contract diff · before → after</h3>
	<p class="tool-help">
		Before: the current parsed contract. After: paste or import another local contract. 2 MiB each,
		3.5-second worker, 2,000 changes. A clean report does not guarantee backward compatibility.
	</p>
	<div class="tool-options">
		<button class="button" onclick={() => (after = JSON.stringify(evolvedContract(), null, 2))}
			>Synthetic evolution</button
		><button
			class="button"
			onclick={() => {
				after = '';
				result = null;
				error = '';
			}}>Clear comparison</button
		><label
			>Import after contract <input
				aria-label="Import comparison file"
				type="file"
				accept=".json,.yaml,.yml"
				onchange={importFile}
			/></label
		><label
			>After format<select aria-label="Comparison format" bind:value={afterFormat}
				><option value="auto">Auto</option><option value="json">Strict JSON</option><option
					value="yaml">YAML</option
				></select
			></label
		>
	</div>
	<div class="editor-panel">
		<div class="editor-panel-header"><h2>After contract</h2></div>
		<CodeEditor bind:value={after} label="After OpenAPI source" language="yaml" />
	</div>
	<div class="tool-options">
		<button class="button primary" disabled={busy || !after.trim()} onclick={compare}
			>Compare contracts</button
		>{#if busy}<span role="status">Comparing locally…</span><button
				class="button"
				onclick={() => {
					ticket++;
					pending?.cancel();
					busy = false;
					error = 'Comparison cancelled. Inputs preserved.';
				}}>Cancel comparison</button
			>{/if}
	</div>
	{#if error}<p role="alert" class="parse-error">{error}</p>{/if}
	{#if current}<h3>Comparison results</h3>
		<p role="status">
			{current.counts.breaking} breaking · {current.counts.potential} potential · {current.counts[
				'compatible-limited'
			]} compatible-limited · {current.counts.indeterminate} indeterminate
		</p>
		<div class="tool-options">
			<select aria-label="Diff severity" bind:value={severity}
				><option value="">All severities</option
				>{#each Object.keys(current.counts) as value (value)}<option>{value}</option>{/each}</select
			><select aria-label="Diff category" bind:value={category}
				><option value="">All categories</option
				>{#each [...new Set(current.changes.map((c) => c.category))] as value (value)}<option
						>{value}</option
					>{/each}</select
			><label
				>Report format<select aria-label="Diff export format" bind:value={exportFormat}
					><option value="json">JSON</option><option value="markdown">Markdown</option></select
				></label
			>
		</div>
		<OutputActions
			text={output}
			filename={exportFormat === 'json' ? 'openapi-diff.json' : 'openapi-diff.md'}
			mime={exportFormat === 'json' ? 'application/json' : 'text/markdown'}
		/>
		{#each changes.slice(0, 300) as change, i (i)}<div class="change">
				<span class="subtle-tag">{change.severity}</span><strong>{change.category}</strong><code
					>{change.path}</code
				>
				<p>{change.message}</p>
			</div>{:else}<p>No matching changes.</p>{/each}{#if changes.length > 300}<p>
				First 300 matching changes displayed. Export contains all changes.
			</p>{/if}{#each current.limitations as limitation (limitation)}<p class="tool-help">
				{limitation}
			</p>{/each}{/if}
</section>

<style>
	section {
		min-width: 0;
	}
	h3 {
		font-size: 15px;
	}
	.tool-options {
		flex-wrap: wrap;
		margin: 16px 0;
	}
	input,
	select {
		max-width: 100%;
	}
	.change {
		padding: 14px 0;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.change code {
		width: 100%;
		font-size: 12px;
		overflow-wrap: anywhere;
	}
	.change p {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.editor-panel :global(.cm-editor) {
		min-height: 240px;
		max-height: 360px;
	}
	@media (max-width: 767px) {
		input,
		select,
		button {
			min-height: 44px;
		}
		.change code {
			font-size: 14px;
		}
	}
</style>
