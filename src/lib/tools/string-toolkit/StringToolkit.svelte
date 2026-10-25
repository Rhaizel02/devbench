<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { transformStrings } from './string-engine';
	import { errorMessage } from '../tool-errors';
	let input = $state('');
	let stripMarks = $state(false);
	let result = $state<ReturnType<typeof transformStrings> | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	const key = $derived(JSON.stringify([input, stripMarks]));
	const current = $derived(key === resultKey ? result : null);
	function transform() {
		error = '';
		try {
			result = transformStrings(input, stripMarks);
			resultKey = key;
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
		}
	}
	function reset() {
		input = '';
		result = null;
		error = '';
	}
	function example() {
		reset();
		input = 'Synthetic XMLHttpRequest — Café 世界 HTTP2Server';
	}
</script>

<div class="tool-options">
	<label class="check-option"
		><input type="checkbox" bind:checked={stripMarks} />Strip combining marks (lossy)</label
	>
</div>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={transform}>Transform text</button>
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
		<h2>Source text</h2>
		<span class="subtle-tag">64 KiB limit</span>
	</div>
	<CodeEditor bind:value={input} label="String input" language="plain" />
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="String transformations">
	<div class="section-bar"><h2>Case and separator transforms</h2></div>
	{#if current}{#each Object.entries(current) as [name, value] (name)}<div
				class="value-row string-result"
			>
				<strong>{name}</strong>
				<pre>{value || '(empty)'}</pre>
				<CopyButton text={value} label={'Copy ' + name} />
			</div>{/each}{:else}<p class="empty">
			Transform text to get seven named outputs with individual copy.
		</p>{/if}<OutputActions
		text={current ? JSON.stringify(current, null, 2) : null}
		filename="devbench-strings.json"
		mime="application/json;charset=utf-8"
	/>
</section>
<div class="tool-help">
	<p>
		NFC normalization; Unicode letters, numbers and combining marks are retained. Case transitions
		split camelCase and acronyms such as XMLHttp; punctuation/whitespace split words. Snake uses _,
		kebab/slug use -, camel/Pascal join words. Upper/lower preserve normalized punctuation and
		whitespace. Slugs retain non-Latin text; no transliteration. Optional mark stripping removes
		combining marks across scripts and can change meaning. Unicode case expansions use JavaScript
		casing. Empty strings are valid.
	</p>
</div>
