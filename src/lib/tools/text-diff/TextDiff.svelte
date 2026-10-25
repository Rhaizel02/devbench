<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { compareText } from './text-diff-engine';
	import { errorMessage } from '../tool-errors';
	let left = $state(''),
		right = $state('');
	let ignoreTrailing = $state(false);
	let view = $state('unified');
	let limit = $state(200);
	let error = $state('');
	let errorKey = $state('');
	let result = $state<ReturnType<typeof compareText> | null>(null);
	let resultKey = $state('');
	const key = $derived(JSON.stringify([left, right, ignoreTrailing]));
	const current = $derived(key === resultKey ? result : null);
	function compare() {
		error = '';
		limit = 200;
		try {
			result = compareText(left, right, ignoreTrailing);
			resultKey = key;
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
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
		left = 'Synthetic example\nhello café\nold line\n';
		right = 'Synthetic example\nhello 世界\nnew line';
	}
</script>

<div class="tool-options">
	<label
		>View<select aria-label="Text diff view" bind:value={view}
			><option value="unified">Unified</option><option value="split">Split</option></select
		></label
	><label class="check-option"
		><input type="checkbox" bind:checked={ignoreTrailing} />Ignore trailing spaces and tabs</label
	>
</div>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={compare}>Compare text</button>
	</div>
	<div class="action-group">
		<button class="text-button" onclick={example}>Load synthetic example</button><button
			class="text-button"
			onclick={reset}>Reset</button
		>
	</div>
</div>
<div class="dual-inputs">
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>Left text</h2>
			<span class="subtle-tag">128 KiB · 2,000 lines</span>
		</div>
		<CodeEditor bind:value={left} label="Left text input" language="plain" />
	</div>
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>Right text</h2>
			<span class="subtle-tag">128 KiB · 2,000 lines</span>
		</div>
		<CodeEditor bind:value={right} label="Right text input" language="plain" />
	</div>
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="Text differences">
	<div class="section-bar">
		<h2>Line differences</h2>
		{#if current}<span role="status"
				>{current.identical
					? 'No differences under selected options.'
					: current.rows.filter((row) => row.kind !== 'unchanged').length + ' changed rows.'}</span
			>{/if}
	</div>
	{#if current}
		{#each current.rows.slice(0, limit) as row, index (index)}
			{#if view === 'split'}<div class="text-diff-row split-row" data-kind={row.kind}>
					<div data-side="left">
						<span class="line-meta">{row.left?.number ?? '—'} · {row.left?.ending ?? 'absent'}</span
						>
						<pre>{row.left?.text ?? ''}</pre>
					</div>
					<div data-side="right">
						<span class="line-meta"
							>{row.right?.number ?? '—'} · {row.right?.ending ?? 'absent'}</span
						>
						<pre>{row.right?.text ?? ''}</pre>
					</div>
				</div>{:else}<div class="text-diff-row" data-kind={row.kind}>
					{#if row.kind === 'unchanged'}<div>
							<span class="line-meta">
								{row.left?.number} / {row.right?.number} · {row.left?.ending}</span
							>
							<pre> {row.left?.text}</pre>
						</div>
					{:else}{#if row.left}<div data-side="left">
								<span class="line-meta">− {row.left.number} · {row.left.ending}</span>
								<pre>-{row.left.text}</pre>
							</div>{/if}{#if row.right}<div data-side="right">
								<span class="line-meta">+ {row.right.number} · {row.right.ending}</span>
								<pre>+{row.right.text}</pre>
							</div>{/if}{/if}
				</div>{/if}
		{:else}<p class="empty">Both inputs are empty.</p>{/each}
		{#if current.rows.length > limit}<button class="button" onclick={() => (limit += 200)}
				>Show 200 more rows</button
			>{/if}
	{:else}<p class="empty">Compare two texts to see line changes. Empty input is supported.</p>{/if}
	<OutputActions text={current?.report ?? null} filename="devbench-text-diff.txt" />
</section>
<div class="tool-help">
	<p>
		Line comparison uses jsdiff with a 300 ms / 1,000-edit budget. CRLF and LF remain distinct;
		“none” marks a missing final newline. The exported unified line report preserves original line
		endings and marks a missing final newline; it is a readable report, not an applyable patch.
		Ignoring trailing spaces/tabs affects equality only; split view retains both original values,
		and unchanged report rows use the left value. Rendering starts at 200 rows.
	</p>
</div>
