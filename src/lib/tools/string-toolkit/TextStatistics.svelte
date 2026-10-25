<script lang="ts">
	import { startTextCount } from './count-client';
	import { characterBudget, STRING_INPUT_LIMIT, type TextStatistics } from './text-count';
	import { errorMessage } from '../tool-errors';
	let { input }: { input: string } = $props();
	let limit = $state<number | undefined>(280);
	let measured = $state<{ input: string; stats: TextStatistics } | null>(null);
	let error = $state('');
	const stats = $derived(measured?.input === input ? measured.stats : null);
	const budget = $derived.by(() => {
		try {
			return characterBudget(stats?.characters ?? 0, limit ?? NaN);
		} catch {
			return null;
		}
	});
	$effect(() => {
		const snapshot = input;
		error = '';
		if (snapshot.length > STRING_INPUT_LIMIT) {
			error = 'Input exceeds the 64 KiB counting limit. Reduce it before processing.';
			return;
		}
		let active = true;
		let task: ReturnType<typeof startTextCount> | undefined;
		const timer = setTimeout(() => {
			try {
				task = startTextCount(snapshot);
				void task.promise
					.then((value) => {
						if (active) measured = { input: snapshot, stats: value };
					})
					.catch((reason) => {
						if (active) error = errorMessage(reason);
					});
			} catch {
				if (active) error = 'Counting worker is unavailable.';
			}
		}, 120);
		return () => {
			active = false;
			clearTimeout(timer);
			task?.cancel();
		};
	});
</script>

<section
	class="text-statistics result-section"
	aria-label="Live text statistics"
	aria-busy={!stats && !error}
>
	<div class="section-bar">
		<h2>Text statistics</h2>
		<label
			>Character limit <input
				class="field-input"
				aria-label="Character limit"
				type="number"
				min="0"
				max="1000000"
				step="1"
				bind:value={limit}
			/></label
		>
	</div>
	{#if error}<p class="error-message" role="status">{error} The input is kept in full.</p>
	{:else if stats}<dl>
			<div>
				<dt>{stats.graphemes ? 'Visual characters' : 'Code points (fallback)'}</dt>
				<dd data-testid="count-characters">{stats.characters}</dd>
			</div>
			<div>
				<dt>Without whitespace</dt>
				<dd data-testid="count-without-whitespace">{stats.withoutWhitespace}</dd>
			</div>
			<div>
				<dt>Words</dt>
				<dd data-testid="count-words">{stats.words}</dd>
			</div>
			<div>
				<dt>Lines</dt>
				<dd data-testid="count-lines">{stats.lines}</dd>
			</div>
			<div>
				<dt>UTF-8 bytes</dt>
				<dd data-testid="count-bytes">{stats.bytes}</dd>
			</div>
			<div>
				<dt>UTF-16 code units</dt>
				<dd data-testid="count-utf16">{stats.utf16}</dd>
			</div>
		</dl>
		{#if budget}<p
				role="status"
				class:error-message={budget.exceeded > 0}
				data-testid="character-budget"
			>
				{budget.used} used · {budget.remaining} remaining · {budget.exceeded} exceeded
			</p>{/if}
	{:else}<p class="empty" role="status">Updating counts…</p>{/if}
	{#if !budget}<p class="error-message">
			Character limit must be a whole number from 0 to 1,000,000.
		</p>{/if}
	<details class="tool-help">
		<summary>Counting rules</summary>
		<p>
			Informational only; input is never truncated. Counts include whitespace and line breaks.
			Intl.Segmenter counts grapheme clusters (combined emoji and accents count as one; CRLF counts
			as one). Without Segmenter, the label changes to Unicode code points; combined sequences may
			count separately. “Without whitespace” excludes clusters containing Unicode whitespace,
			including tabs and line breaks. Words are Unicode letter/number runs with combining marks and
			internal apostrophes; hyphens separate words, emoji/punctuation alone do not count, and
			unspaced CJK runs count as one. Empty text has 0 lines; otherwise CRLF, CR, LF, U+2028 and
			U+2029 separate lines, including trailing empty lines. The counter does not normalize text;
			CodeMirror normalizes pasted line endings to LF, so statistics describe the editor content.
			Counts update after a 120 ms pause in a cancellable worker; 64 KiB UTF-8 input cap.
		</p>
	</details>
</section>

<style>
	.text-statistics {
		margin-block: 16px;
	}
	.section-bar {
		flex-wrap: wrap;
		gap: 12px;
	}
	label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	input {
		width: 110px;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
		gap: 12px;
		padding: 12px;
		margin: 0;
	}
	dt {
		color: var(--color-muted);
		font-size: 12px;
	}
	dd {
		margin: 4px 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 18px;
	}
	p,
	details {
		padding: 0 12px 12px;
		margin: 0;
	}
	@media (max-width: 767px) {
		dt {
			font-size: 14px;
		}
	}
</style>
