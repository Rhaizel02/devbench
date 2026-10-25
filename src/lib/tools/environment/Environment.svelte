<script lang="ts">
	import SecretEditor from './SecretEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { compareEnvironments, type EnvRow } from './env-engine';
	import { errorMessage } from '../tool-errors';
	let left = $state(''),
		right = $state('');
	let reveal = $state(false);
	let keysOnly = $state(false);
	let filter = $state('all');
	let search = $state('');
	let descending = $state(false);
	let result = $state<ReturnType<typeof compareEnvironments> | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	let limit = $state(100);
	const key = $derived(JSON.stringify([left, right, keysOnly]));
	const current = $derived(key === resultKey ? result : null);
	const rows = $derived(
		(current?.rows ?? [])
			.filter(
				(row) =>
					(filter === 'all' || filter === row.status) &&
					row.key.toLowerCase().includes(search.toLowerCase())
			)
			.sort((a, b) => (descending ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)))
	);
	const exported = $derived(
		current
			? JSON.stringify(
					{
						rows: rows.map((row: EnvRow) => ({ key: row.key, status: row.status })),
						warnings: current.warnings,
						counts: current.counts
					},
					null,
					2
				)
			: null
	);
	function compare() {
		try {
			result = compareEnvironments(left, right, keysOnly);
			resultKey = key;
			error = '';
			limit = 100;
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
		reveal = false;
		keysOnly = false;
		filter = 'all';
		search = '';
		descending = false;
	}
	function example() {
		reset();
		left = 'APP_MODE=development\nAPI_TOKEN=synthetic-a\nCOMMON="café=雪"\nONLY_A=yes';
		right = 'APP_MODE=production\nAPI_TOKEN=synthetic-b\nCOMMON="café=雪"\nONLY_B=yes';
	}
</script>

<div class="studio-actions">
	<button class="button primary" onclick={compare}>Compare environments</button>
	<div class="action-group">
		<button class="text-button" onclick={example}>Load synthetic example</button><button
			class="text-button"
			onclick={reset}>Reset</button
		>
	</div>
</div>
<div class="tool-options">
	<label><input type="checkbox" bind:checked={reveal} />Reveal values in both editors</label><label
		><input type="checkbox" bind:checked={keysOnly} />Compare keys only</label
	>
</div>
<div class="dual-inputs">
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>Environment A</h2>
			<span class="subtle-tag">256 KiB</span>
		</div>
		<SecretEditor bind:value={left} label="Environment A input" {reveal} />
	</div>
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>Environment B</h2>
			<span class="subtle-tag">256 KiB</span>
		</div>
		<SecretEditor bind:value={right} label="Environment B input" {reveal} />
	</div>
</div>
{#if error && errorKey === key}<p role="alert" class="parse-error">{error}</p>{/if}
<section class="result-section" aria-label="Environment comparison">
	<div class="section-bar">
		<h2>Keys and comparison states</h2>
		<label
			>Filter <select bind:value={filter}
				><option value="all">All</option
				>{#each ['same', 'different', 'only-a', 'only-b', 'common'] as status (status)}<option
						value={status}>{status}</option
					>{/each}</select
			></label
		><label>Search keys <input class="field-input" bind:value={search} /></label><button
			class="text-button"
			onclick={() => (descending = !descending)}>Sort {descending ? 'Z–A' : 'A–Z'}</button
		>
	</div>
	{#if current}<p role="status">
			{current.counts.common} common · {current.counts.onlyA} only A · {current.counts.onlyB} only B ·
			{current.counts.different} different
		</p>
		{#each [...current.warnings.a, ...current.warnings.b] as warning, index (index)}<p
				class="tool-help"
			>
				{warning}
			</p>{/each}{#each rows.slice(0, limit) as row (row.key)}<div class="section-bar">
				<code>{row.key}</code><span>{row.status}</span>
			</div>{/each}{#if rows.length > limit}<button class="button" onclick={() => (limit += 100)}
				>Show 100 more keys</button
			>{/if}{:else}<p class="tool-help">
			{result
				? 'Inputs changed. Compare again.'
				: 'Paste both environments and compare. Values remain hidden by default.'}
		</p>{/if}<OutputActions text={exported} filename="environment-key-states.json" />
</section>
<p class="tool-help">
	Exports always contain key names and comparison states only, even while values are revealed. No
	transfer to other tools. Supports KEY=value, optional export, blank lines, full-line comments,
	whitespace-before-# inline comments, literal single quotes and double-quoted
	\n/\r/\t/quote/backslash escapes. Values may contain =. Last duplicate wins with a warning.
	Multiline assignments are unsupported. Substitutions remain literal and are never expanded; no
	file is read. 256 KiB / 5,000 lines per editor. Inputs/results are memory-only and cleared when
	leaving.
</p>
