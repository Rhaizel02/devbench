<script lang="ts">
	import { onMount } from 'svelte';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { ArrowLeftRight, RotateCcw, FlaskConical } from '@lucide/svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { compareJson, type JsonDiffResult } from './json-diff-engine';
	import { errorMessage, previewJson } from '../tool-errors';
	let left = $state('');
	let right = $state('');
	const app = useAppState();
	onMount(() => {
		left = app.consumePaste('DATA-02')?.text ?? left;
	});
	let result = $state<{ left: string; right: string; comparison: JsonDiffResult } | null>(null);
	let error = $state('');
	let failedLeft = $state('');
	let failedRight = $state('');
	let filter = $state('all');
	let limit = $state(100);
	const current = $derived(
		result?.left === left && result.right === right ? result.comparison : null
	);
	const visible = $derived(
		current?.changes.filter((change) => filter === 'all' || change.kind === filter) ?? []
	);
	const currentError = $derived(failedLeft === left && failedRight === right ? error : '');
	const exportText = $derived(current ? JSON.stringify(current.changes, null, 2) : null);
	function compare() {
		error = '';
		limit = 100;
		try {
			result = { left, right, comparison: compareJson(left, right) };
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			failedLeft = left;
			failedRight = right;
		}
	}
	function reset() {
		left = '';
		right = '';
		result = null;
		error = '';
	}
	function example() {
		reset();
		left = '{"name":"Synthetic example","items":[1,2],"optional":null}';
		right = '{"items":[1,3,4],"name":"Synthetic example","enabled":true}';
	}
</script>

<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={compare}
			><ArrowLeftRight size={15} />Compare JSON</button
		>
	</div>
	<div class="action-group">
		<button class="text-button" onclick={example}
			><FlaskConical size={14} />Load synthetic example</button
		><button class="text-button" onclick={reset}><RotateCcw size={14} />Reset</button>
	</div>
</div>
<div class="dual-inputs">
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>Left JSON</h2>
			<span class="subtle-tag">1 MiB limit</span>
		</div>
		<CodeEditor bind:value={left} label="Left JSON input" />
	</div>
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>Right JSON</h2>
			<span class="subtle-tag">1 MiB limit</span>
		</div>
		<CodeEditor bind:value={right} label="Right JSON input" />
	</div>
</div>
{#if currentError}<div class="parse-error" role="alert">{currentError}</div>{/if}
<section class="result-section" aria-labelledby="diff-results">
	<div class="section-bar">
		<h2 id="diff-results">Structural changes</h2>
		<label class="result-filter"
			>Show<select aria-label="Change type" bind:value={filter}
				><option value="all">All changes</option><option value="added">Added</option><option
					value="removed">Removed</option
				><option value="changed">Changed</option></select
			></label
		>
	</div>
	{#if current}<p class="result-summary" role="status">
			{current.changes.length === 0
				? 'Identical JSON values.'
				: current.changes.length +
					(current.truncated ? '+' : '') +
					' changes.'}{#if current.truncated}
				Showing the first 1,000 changes.{/if}
		</p>
		{#each visible.slice(0, limit) as change (change.path)}<div class="diff-change">
				<div class="diff-change-heading">
					<span class="change-kind" data-kind={change.kind}>{change.kind}</span><code
						>{change.path}</code
					>
				</div>
				<div class="diff-values">
					<div>
						<span class="muted">Before</span>
						<pre>{change.hasBefore ? previewJson(change.before) : '(absent)'}</pre>
					</div>
					<div>
						<span class="muted">After</span>
						<pre>{change.hasAfter ? previewJson(change.after) : '(absent)'}</pre>
					</div>
				</div>
			</div>{/each}
		{#if visible.length > limit}<button class="button" onclick={() => (limit += 100)}
				>Show 100 more changes</button
			>{/if}
	{:else}<p class="empty">
			Compare two JSON values to inspect added, removed and changed nodes.
		</p>{/if}
	<OutputActions
		text={exportText}
		filename="devbench-json-diff.json"
		mime="application/json;charset=utf-8"
	/>
</section>
<div class="tool-help">
	<p>
		Object key order is ignored; array positions matter. Paths use escaped bracket JSONPath. Absent
		values differ from null. Native JavaScript numeric precision and duplicate-key behavior apply.
		Comparison is bounded to 100,000 nodes, 128 levels and 1,000 changes; value previews are
		truncated.
	</p>
</div>
