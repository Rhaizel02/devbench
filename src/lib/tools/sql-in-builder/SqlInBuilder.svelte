<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { buildSqlIn, type SqlInOptions, type SqlInResult } from './sql-in-engine';
	import { errorMessage } from '../tool-errors';
	let input = $state('');
	let inputMode = $state<SqlInOptions['inputMode']>('lines');
	let delimiter = $state<SqlInOptions['delimiter']>(',');
	let valueType = $state<SqlInOptions['valueType']>('strings');
	let dialect = $state<SqlInOptions['dialect']>('postgresql');
	let format = $state<SqlInOptions['format']>('parameters');
	let deduplicate = $state(true);
	let trim = $state(false);
	let blanks = $state<SqlInOptions['blanks']>('omit');
	let nullTokens = $state(false);
	const settings = $derived({
		inputMode,
		delimiter,
		valueType,
		dialect,
		format,
		deduplicate,
		trim,
		blanks,
		nullTokens
	});
	const key = $derived(JSON.stringify([input, settings]));
	let result = $state<SqlInResult | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	const current = $derived(key === resultKey ? result : null);
	function build() {
		error = '';
		try {
			result = buildSqlIn(input, settings);
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
		input =
			valueType === 'numbers'
				? inputMode === 'lines'
					? '1\n2\n2\n3.5'
					: ['1', '2', '2', '3.5'].join(delimiter)
				: inputMode === 'lines'
					? "Synthetic café\nO'Reilly\n世界\nSynthetic café"
					: ['Synthetic café', "O'Reilly", '世界'].join(delimiter);
	}
</script>

<p class="security-notice">
	{format === 'parameters'
		? 'Parameterized SQL is selected. Bind the separate parameter values through your database driver.'
		: 'Literal SQL explicitly selected. Review dialect and database settings; manual interpolation carries SQL injection risk.'}
</p>
<div class="tool-options">
	<label
		>Input<select aria-label="SQL IN input format" bind:value={inputMode}
			><option value="lines">Multiline values</option><option value="csv">CSV values</option
			></select
		></label
	>{#if inputMode === 'csv'}<label
			>Delimiter<select aria-label="SQL IN delimiter" bind:value={delimiter}
				><option value=",">Comma</option><option value=";">Semicolon</option><option value="&#9;"
					>Tab</option
				></select
			></label
		>{/if}
	<label
		>Values<select aria-label="SQL IN value type" bind:value={valueType}
			><option value="strings">Strings</option><option value="numbers">Numbers</option></select
		></label
	><label
		>Dialect<select aria-label="SQL IN dialect" bind:value={dialect}
			><option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option
				value="sqlite">SQLite</option
			></select
		></label
	><label
		>Output<select aria-label="SQL IN output mode" bind:value={format}
			><option value="parameters">Parameterized (recommended)</option><option value="literals"
				>Literal SQL (explicit)</option
			></select
		></label
	>
	<label
		>Empty values<select aria-label="SQL IN empty values" bind:value={blanks}
			><option value="omit">Omit</option><option value="keep">Keep empty strings</option><option
				value="null">SQL NULL</option
			></select
		></label
	><label class="check-option"
		><input type="checkbox" bind:checked={deduplicate} />Remove duplicates</label
	><label class="check-option"><input type="checkbox" bind:checked={trim} />Trim whitespace</label
	><label class="check-option"
		><input type="checkbox" bind:checked={nullTokens} />Treat exact NULL tokens as SQL NULL</label
	>
</div>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={build}>Build IN list</button>
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
		<h2>Values</h2>
		<span class="subtle-tag">128 KiB · 2,000 values</span>
	</div>
	<CodeEditor bind:value={input} label="SQL IN values" language="plain" />
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="SQL IN result">
	<div class="section-bar">
		<h2>SQL snippet</h2>
		{#if current}<CopyButton text={current.sql} label="Copy SQL snippet" />{/if}
	</div>
	{#if current}<pre class="result-code">{current.sql}</pre>
		<div class="section-bar">
			<h2>Bound parameters</h2>
			<CopyButton
				text={JSON.stringify(current.parameters, null, 2)}
				label="Copy bound parameters"
			/>
		</div>
		<pre class="result-code">{JSON.stringify(current.parameters, null, 2)}</pre>
		{#each current.warnings as warning (warning)}<p class="tool-help">{warning}</p>{/each}{:else}<p
			class="empty"
		>
			Build a parameterized IN snippet and copy parameter values separately. Nothing is executed.
		</p>{/if}<OutputActions
		text={current ? JSON.stringify(current, null, 2) : null}
		filename="devbench-sql-in.json"
		mime="application/json;charset=utf-8"
	/>
</section>
<div class="tool-help">
	<p>
		Multiline mode treats every line as one value; CSV mode supports quoted delimiters, quotes and
		multiline fields. Whitespace is preserved unless trimming is selected. NULL conversion, when
		enabled, also applies to quoted CSV NULL tokens. IN (NULL) does not match null rows. Numbers
		must be complete decimal/exponent values within safe JavaScript precision (15 significant
		digits/safe integers); NaN, Infinity and SQL fragments fail. Literal strings use PostgreSQL
		E-strings, SQLite doubled quotes, or MySQL UTF-8 hex conversion. NUL/unpaired surrogates fail.
		Limits: 8 KiB per value, 2,000 values. Empty lists are rejected. Driver placeholder conventions
		may require adaptation.
	</p>
</div>
