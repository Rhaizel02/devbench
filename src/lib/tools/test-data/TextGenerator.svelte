<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { generateText, type TextOptions } from './text-engine';
	import { secureRandomIndex } from './random';
	import { errorMessage } from '../tool-errors';
	let style = $state<TextOptions['style']>('lorem');
	let unit = $state<TextOptions['unit']>('exact');
	let amount = $state<number | undefined>(280);
	let separator = $state<TextOptions['separator']>('blank-line');
	let result = $state<ReturnType<typeof generateText> | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	const key = $derived(JSON.stringify([style, unit, amount, separator]));
	const current = $derived(key === resultKey ? result : null);
	function generate() {
		try {
			result = generateText({ style, unit, amount: amount ?? NaN, separator }, secureRandomIndex);
			resultKey = key;
			error = '';
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
		}
	}
	function reset() {
		style = 'lorem';
		unit = 'exact';
		amount = 280;
		separator = 'blank-line';
		result = null;
		error = '';
	}
	function example() {
		reset();
		style = 'readable';
	}
</script>

<section aria-label="Synthetic text generator">
	<div class="tool-options">
		<label
			>Style <select aria-label="Text style" bind:value={style}
				><option value="lorem">Classic Lorem Ipsum</option><option value="readable"
					>Readable synthetic text</option
				></select
			></label
		>
		<label
			>Length <select aria-label="Text length mode" bind:value={unit}
				><option value="exact">Exact visual characters</option><option value="maximum"
					>Maximum visual characters</option
				><option value="words">Words</option><option value="paragraphs"
					>Paragraphs (3 sentences each)</option
				></select
			></label
		>
		<label
			>Amount <input
				class="field-input"
				aria-label="Text amount"
				type="number"
				min="0"
				max={unit === 'words' ? 2000 : unit === 'paragraphs' ? 50 : 32768}
				step="1"
				bind:value={amount}
			/></label
		>
		<label
			>Paragraph separation <select aria-label="Paragraph separation" bind:value={separator}
				><option value="blank-line">Blank line</option><option value="line">Single newline</option
				><option value="space">Single space</option></select
			></label
		>
	</div>
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" onclick={generate}>Generate text</button><button
				class="button"
				disabled={!current}
				onclick={generate}>Regenerate</button
			>
		</div>
		<div class="action-group">
			<button class="text-button" onclick={example}>Load synthetic example</button><button
				class="text-button"
				onclick={reset}>Reset</button
			>
		</div>
	</div>
	{#if error && errorKey === key}<p class="parse-error" role="alert">{error}</p>{/if}
	<div class="editor-panel short-editor">
		<div class="editor-panel-header">
			<h2>Generated text</h2>
		</div>
		{#if current}<p class="result-summary" role="status">
				{current.stats.characters} visual characters · {current.stats.words} words
			</p>{/if}
		{#if current}<CodeEditor
				value={current.text}
				label="Generated text"
				readonly
				language="plain"
			/>{:else}<p class="empty">
				{result
					? 'Options changed. Generate a current result.'
					: 'Choose a length, then generate local test text.'}
			</p>{/if}
		<OutputActions text={current?.text ?? null} filename="devbench-test-text.txt" />
	</div>
	<details class="tool-help">
		<summary>Length rules and limits</summary>
		<p>
			Local ASCII corpora; visual counts use the same rules as String Toolkit, so graphemes and code
			points agree for generated text. Exact mode can cut a word; trailing whitespace is replaced
			with the same number of periods to meet the exact length without trailing spaces. Maximum mode
			keeps whole whitespace-separated words and may produce empty text when the first word does not
			fit. Zero produces an empty result. Words mode emits exactly the requested number of words
			separated by spaces; paragraphs mode emits three sentences per paragraph with the chosen
			separator. Character modes separate every three sentences; words mode ignores paragraph
			separation. Regeneration samples the local corpus again and may repeat, especially for small
			lengths. No trailing whitespace. Limits: 32,768 characters/UTF-8 bytes, 2,000 words or 50
			paragraphs. No AI service is used.
		</p>
	</details>
</section>

<style>
	.short-editor {
		height: 260px;
	}
</style>
