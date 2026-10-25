<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import {
		inspectUrl,
		rebuildUrl,
		encodeComponent,
		decodeComponent,
		type UrlInspection
	} from './url-engine';
	import { errorMessage } from '../tool-errors';
	let operation = $state<'inspect' | 'encode' | 'decode'>('inspect');
	let input = $state('');
	let parsed = $state<UrlInspection | null>(null);
	let parsedInput = $state('');
	let reveal = $state(false);
	let error = $state('');
	let errorInput = $state('');
	let queryLimit = $state(50);
	const current = $derived(parsed && parsedInput === input ? parsed : null);
	const output = $derived.by(() => {
		if (!current) return null;
		try {
			return rebuildUrl(current.original, current.query, reveal);
		} catch {
			return null;
		}
	});
	function inspect() {
		error = '';
		queryLimit = 50;
		reveal = false;
		try {
			parsed = inspectUrl(input);
			parsedInput = input;
		} catch (reason) {
			parsed = null;
			error = errorMessage(reason);
			errorInput = input;
		}
	}
	function reset() {
		input = '';
		parsed = null;
		parsedInput = '';
		error = '';
		reveal = false;
	}
	function changeOperation() {
		reset();
	}
	function example() {
		reset();
		input = 'https://example.com:8443/caf%C3%A9?tag=one&tag=two&empty=&q=hello+world#section';
	}
</script>

<div class="tool-options">
	<label
		>Operation<select aria-label="URL operation" bind:value={operation} onchange={changeOperation}
			><option value="inspect">Inspect absolute URL</option><option value="encode"
				>Encode component</option
			><option value="decode">Decode component</option></select
		></label
	>
</div>
{#if operation === 'inspect'}
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" onclick={inspect}>Inspect URL</button>
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
			<h2>Original URL</h2>
			<span class="subtle-tag">1 MiB limit</span>
		</div>
		<CodeEditor bind:value={input} label="URL input" language="plain" />
	</div>
	{#if error && errorInput === input}<div class="parse-error" role="alert">{error}</div>{/if}
	{#if current}
		<section class="result-section" aria-label="URL components">
			<div class="section-bar">
				<h2>URL components</h2>
				<label class="check-option"
					><input type="checkbox" bind:checked={reveal} />Reveal credentials</label
				>
			</div>
			<dl class="inspection-grid">
				<dt>Protocol</dt>
				<dd>{current.protocol}</dd>
				<dt>Host</dt>
				<dd>{current.host}</dd>
				<dt>Hostname</dt>
				<dd>{current.hostname}</dd>
				<dt>Port</dt>
				<dd>{current.port || '(default)'}</dd>
				<dt>Username</dt>
				<dd>{current.username ? (reveal ? current.username : '(redacted)') : '(none)'}</dd>
				<dt>Password</dt>
				<dd>{current.password ? (reveal ? current.password : '(redacted)') : '(none)'}</dd>
				<dt>Path (encoded)</dt>
				<dd>{current.pathname}</dd>
				<dt>Fragment</dt>
				<dd>{current.fragment || '(none)'}</dd>
			</dl>
			<div class="section-bar">
				<h2>Query parameters</h2>
				<button
					class="button"
					disabled={current.query.length >= 2000}
					onclick={() => {
						if (parsed) parsed.query.push({ key: '', value: '' });
					}}>Add parameter</button
				>
			</div>
			<div class="query-rows">
				{#each current.query.slice(0, queryLimit) as pair, index (index)}<div class="query-row">
						<input aria-label={'Query key ' + (index + 1)} bind:value={pair.key} /><input
							aria-label={'Query value ' + (index + 1)}
							bind:value={pair.value}
						/><button
							class="icon-button"
							aria-label={'Remove query parameter ' + (index + 1)}
							onclick={() => {
								if (parsed) parsed.query.splice(index, 1);
							}}>×</button
						>
					</div>{:else}<p class="empty">No query parameters.</p>{/each}
			</div>
			{#if current.query.length > queryLimit}<button
					class="button"
					onclick={() => (queryLimit += 50)}>Show 50 more parameters</button
				>{/if}
			<div class="section-bar"><h2>Reconstructed URL</h2></div>
			<pre class="result-code">{output}</pre>
			{#if (current.username || current.password) && !reveal}<p class="tool-help">
					Credentials are redacted in the preview, copy and download. Reveal credentials explicitly
					to include them in the reconstructed URL.
				</p>{/if}
			<OutputActions text={output} filename="devbench-url.txt" />
		</section>
	{:else}<p class="empty">Inspect a URL to see its components and edit query parameters.</p>{/if}
	<div class="tool-help">
		<p>
			URLSearchParams treats + as a space in queries and re-encodes spaces as +. Repeated keys and
			empty values are preserved; encoding and default ports may be normalized. The original input
			remains above. No URL is fetched or opened.
		</p>
	</div>
{:else}
	<TextWorkspace
		transform={operation === 'encode' ? encodeComponent : decodeComponent}
		revision={operation}
		action={operation === 'encode' ? 'Encode component' : 'Decode component'}
		sample={operation === 'encode'
			? 'Synthetic example: café + / ? &'
			: 'Synthetic%20example%3A%20caf%C3%A9%20%2B%20%2F%20%3F%20%26'}
		inputLabel="Component input"
		outputLabel="Component output"
		filename="devbench-url-component.txt"
		allowEmpty
	>
		{#snippet help()}<p>
				Uses encodeURIComponent / decodeURIComponent for one component, not an entire URL. Literal +
				stays + when decoding a component. Invalid percent escapes and UTF-8 sequences produce
				errors.
			</p>{/snippet}
	</TextWorkspace>
{/if}
