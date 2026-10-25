<script lang="ts">
	import { onDestroy } from 'svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { startRegex } from './regex-client';
	import { type RegexInput, type RegexResult } from './regex-engine';
	import { errorMessage } from '../tool-errors';
	let pattern = $state('');
	let flags = $state('g');
	let text = $state('');
	let replace = $state(false);
	let replacement = $state('');
	let busy = $state(false);
	let result = $state<RegexResult | null>(null);
	let error = $state('');
	let resultKey = $state('');
	let errorKey = $state('');
	let limit = $state(50);
	const settings = $derived({ pattern, flags, text, replace, replacement });
	const key = $derived(JSON.stringify(settings));
	const current = $derived(resultKey === key ? result : null);
	let job: ReturnType<typeof startRegex> | null = null;
	let ticket = 0;
	function cancel() {
		ticket++;
		job?.cancel();
		job = null;
		busy = false;
	}
	onDestroy(cancel);
	async function run() {
		cancel();
		const request = ++ticket;
		const snapshot = key;
		error = '';
		result = null;
		busy = true;
		limit = 50;
		try {
			job = startRegex($state.snapshot(settings) as RegexInput);
			const value = await job.promise;
			if (request === ticket && snapshot === key) {
				result = value;
				resultKey = snapshot;
			}
		} catch (reason) {
			if (request === ticket) {
				error = errorMessage(reason);
				errorKey = snapshot;
			}
		} finally {
			if (request === ticket) {
				busy = false;
				job = null;
			}
		}
	}
	function reset() {
		cancel();
		pattern = '';
		flags = 'g';
		text = '';
		replacement = '';
		replace = false;
		result = null;
		error = '';
	}
	function example() {
		reset();
		pattern = '(?<word>café|world)';
		flags = 'gu';
		text = 'Synthetic example: café world café';
		replacement = '[$<word>]';
	}
</script>

<div class="tool-options regex-options">
	<label
		>Pattern<input
			aria-label="Regex pattern"
			bind:value={pattern}
			placeholder="ECMAScript pattern, without / delimiters"
		/></label
	>
	<label>Flags<input aria-label="Regex flags" bind:value={flags} /></label>
	<label class="check-option"
		><input type="checkbox" bind:checked={replace} />Replacement preview</label
	>
	{#if replace}<label
			>Replacement<input aria-label="Regex replacement" bind:value={replacement} /></label
		>{/if}
</div>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" disabled={busy} onclick={run}>Test regex</button
		>{#if busy}<button class="button" onclick={cancel}>Cancel</button>{/if}
	</div>
	<div class="action-group">
		<button class="text-button" onclick={example}>Load synthetic example</button><button
			class="text-button"
			onclick={reset}>Reset</button
		>
	</div>
</div>
<div class="editor-panel short-editor">
	<div class="editor-panel-header">
		<h2>Test text</h2>
		<span class="subtle-tag">100,000 UTF-8 bytes</span>
	</div>
	<CodeEditor bind:value={text} label="Regex test text" language="plain" />
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
{#if busy}<p class="empty" role="status">Evaluating in an isolated worker…</p>{/if}
<section class="result-section" aria-label="Regex results">
	<div class="section-bar">
		<h2>Matches</h2>
		<span class="muted">UTF-16 string offsets · end exclusive</span>
	</div>
	{#if current}<p class="result-summary" role="status">
			{current.matches.length}{current.truncated ? '+' : ''} matches{current.truncated
				? ' (1,000-match limit reached)'
				: ''}.
		</p>
		{#each current.matches.slice(0, limit) as match, index (index)}<div class="diff-change">
				<div class="diff-change-heading">
					<span class="change-kind">{index + 1}</span><code>[{match.start}, {match.end})</code>
				</div>
				<pre class="result-code">{JSON.stringify(
						{ text: match.text, captures: match.captures, namedGroups: match.groups },
						null,
						2
					)}</pre>
			</div>{/each}
		{#if current.matches.length > limit}<button class="button" onclick={() => (limit += 50)}
				>Show 50 more matches</button
			>{/if}
		{#if current.replacement !== null}<div class="section-bar"><h2>Replacement preview</h2></div>
			<pre class="result-code">{current.replacement}</pre>{/if}
	{:else}<p class="empty">
			Run a pattern to inspect matches and capture groups. An empty pattern matches between
			characters.
		</p>{/if}
	<OutputActions
		text={current ? (current.replacement ?? JSON.stringify(current.matches, null, 2)) : null}
		filename="devbench-regex.txt"
	/>
</section>
<div class="tool-help">
	<p>
		JavaScript / ECMAScript semantics, not PCRE. Pattern: 4 KiB; test text: 100,000 UTF-8 bytes;
		replacement: 10,000 bytes. A dedicated worker is terminated after 500 ms or on cancel/exit.
		Zero-width Unicode matches advance by code point. At most 1,000 matches and 1 MiB replacement
		output. Replacement supports $$, $&amp;, $`, $', $1–$99 and $&lt;name&gt;; unmatched captures
		are empty. Edit invalidates results; run again after a timeout.
	</p>
</div>
