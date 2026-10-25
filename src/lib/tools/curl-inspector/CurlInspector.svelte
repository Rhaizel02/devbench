<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { inspectCurl, type CurlInspection } from './curl-engine';
	import { errorMessage } from '../tool-errors';
	let queryLimit = $state(100);
	let input = $state('');
	let reveal = $state(false);
	let result = $state<CurlInspection | null>(null);
	let resultKey = $state('');
	let errorKey = $state('');
	let error = $state('');
	const key = $derived(JSON.stringify([input, reveal]));
	const current = $derived(key === resultKey ? result : null);
	function inspect() {
		error = '';
		queryLimit = 100;
		try {
			result = inspectCurl(input, reveal);
			resultKey = key;
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
		}
	}
	function reset() {
		input = '';
		reveal = false;
		result = null;
		error = '';
	}
	function example() {
		reset();
		input =
			"curl 'https://example.com/items?tag=one&tag=two&api_key=synthetic-key' -X POST -H 'Authorization: Bearer synthetic-example' -H 'Content-Type: application/json' --data-raw '{\"name\":\"Synthetic café\"}'";
	}
</script>

<p class="security-notice">
	Parse only. No command or request is executed. Sensitive headers, query keys, credentials and
	bodies are redacted in results by default.
</p>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={inspect}>Inspect cURL</button>
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
		<h2>Original cURL command</h2>
		<span class="subtle-tag">128 KiB · POSIX subset</span>
	</div>
	<CodeEditor bind:value={input} label="cURL input" language="plain" />
</div>
<div class="tool-options">
	<label class="check-option"
		><input
			type="checkbox"
			checked={reveal}
			onchange={(event) => {
				reveal = event.currentTarget.checked;
				if (result) inspect();
			}}
		/>Reveal sensitive values in results</label
	>
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="Parsed HTTP request">
	<div class="section-bar">
		<h2>Parsed request</h2>
		<span
			>{current
				? current.redacted
					? 'Redacted preview'
					: 'Sensitive values revealed'
				: 'Awaiting input'}</span
		>
	</div>
	{#if current}<div class="value-row">
			<strong>{current.method}</strong><code>{current.target}</code><CopyButton
				text={current.target}
				label="Copy target URL"
			/>
		</div>
		<div class="section-bar"><h2>Headers</h2></div>
		{#each current.headers as item, index (index)}<div class="value-row">
				<strong>{item.name}</strong><code
					>{item.action === 'remove' ? '(remove header)' : item.value || '(empty value)'}</code
				>
			</div>{:else}<p class="empty">No explicit headers.</p>{/each}
		<div class="section-bar"><h2>Query parameters</h2></div>
		{#each current.query.slice(0, queryLimit) as pair, index (index)}<div class="value-row">
				<strong>{pair.key || '(empty key)'}</strong><code>{pair.value || '(empty value)'}</code>
			</div>{:else}<p class="empty">No query parameters.</p>{/each}
		{#if current.query.length > queryLimit}<button
				class="button"
				onclick={() => (queryLimit += 100)}>Show 100 more query parameters</button
			>{/if}
		<div class="section-bar">
			<h2>Body</h2>
			<span>{current.bodyBytes} UTF-8 bytes</span>
		</div>
		<pre class="result-code">{current.body ?? '(no body)'}</pre>
	{:else}<p class="empty">
			Paste one literal cURL command and inspect its method, target, headers and body.
		</p>{/if}
	<OutputActions
		text={current ? JSON.stringify(current, null, 2) : null}
		filename="devbench-curl-inspection.json"
		mime="application/json;charset=utf-8"
	/>
</section>
<div class="tool-help">
	<p>
		Supports one HTTP(S) URL, -X/--request, -H/--header, -d/--data, --data-raw, literal
		--data-binary, -G/--get and --url. Common POSIX quotes, escapes and backslash line continuations
		are parsed. File/stdin references, expansions, operators, redirects, multiple commands and
		unsupported flags are rejected. --data-raw treats a leading @ literally. Multiple data arguments
		join with &amp;; -G moves data into the query. Query decoding uses + as space. PowerShell is a
		different syntax and is not supported.
	</p>
	<p>
		Original input stays visible above. Result redaction cannot identify every secret in URL paths
		or custom field names; review before sharing. All bodies and fragments are hidden until explicit
		reveal. Limits: 1,000 arguments, 200 headers and 64 KiB body. This is inspection, not a complete
		curl emulator.
	</p>
</div>
