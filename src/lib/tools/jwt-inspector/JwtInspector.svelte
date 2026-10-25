<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import { inspectJwt, syntheticJwt, JWT_NOTICE, type JwtInspection } from './jwt-engine';
	import { errorMessage, previewJson } from '../tool-errors';
	let input = $state('');
	let result = $state<JwtInspection | null>(null);
	let inspectedInput = $state('');
	let error = $state('');
	let errorInput = $state('');
	const current = $derived(inspectedInput === input ? result : null);
	const output = $derived(current ? JSON.stringify(current, null, 2) : null);
	function decode() {
		error = '';
		try {
			result = inspectJwt(input);
			inspectedInput = input;
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorInput = input;
		}
	}
	function reset() {
		input = '';
		result = null;
		error = '';
	}
	function example() {
		reset();
		input = syntheticJwt();
	}
</script>

<p class="security-notice" role="note">{JWT_NOTICE}</p>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={decode}>Decode JWT</button>
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
		<h2>Compact JWT</h2>
		<span class="subtle-tag">64 KiB limit</span>
	</div>
	<CodeEditor bind:value={input} label="JWT input" language="plain" />
</div>
{#if error && errorInput === input}<div class="parse-error" role="alert">{error}</div>{/if}
{#if current}
	<section class="result-section" aria-label="JWT interpretation">
		<div class="section-bar">
			<h2>Unverified header and claims</h2>
			<span>As of {current.inspectedAt}</span>
		</div>
		<dl class="inspection-grid">
			<dt>Algorithm</dt>
			<dd>{current.header.alg === undefined ? '(missing)' : previewJson(current.header.alg)}</dd>
			<dt>Type</dt>
			<dd>{current.header.typ === undefined ? '(missing)' : previewJson(current.header.typ)}</dd>
		</dl>
		{#each current.warnings as warning (warning)}<p class="security-notice">{warning}</p>{/each}
		{#each current.claims as claim (claim.name)}<div class="diff-change">
				<div class="diff-change-heading">
					<strong>{claim.name}</strong><span>{claim.note}</span>
				</div>
				<pre class="result-code">{previewJson(claim.value)}</pre>
				{#if claim.utc}<dl class="inspection-grid">
						<dt>UTC</dt>
						<dd>{claim.utc}</dd>
						<dt>Browser local</dt>
						<dd>{claim.local}</dd>
					</dl>{/if}
			</div>{:else}<p class="empty">
				No standard claims to interpret. The decoded payload is shown below.
			</p>{/each}
	</section>
	<div class="dual-inputs inspector-editors">
		<div class="editor-panel">
			<div class="editor-panel-header"><h2>Header</h2></div>
			<CodeEditor
				value={JSON.stringify(current.header, null, 2)}
				readonly
				label="Decoded JWT header"
			/>
		</div>
		<div class="editor-panel">
			<div class="editor-panel-header"><h2>Payload</h2></div>
			<CodeEditor
				value={JSON.stringify(current.payload, null, 2)}
				readonly
				label="Decoded JWT payload"
			/>
		</div>
	</div>
{:else}<p class="empty">
		Decode a compact token to inspect its header, payload and claimed timestamps.
	</p>{/if}
<OutputActions
	text={output}
	filename="devbench-decoded-jwt.json"
	mime="application/json;charset=utf-8"
/>
<div class="tool-help">
	<p>
		Compact three-segment tokens only. Header and payload must contain strict UTF-8 JSON; the
		signature is binary and never verified. Decoded claims are untrusted. Timestamp notes compare
		claimed epoch seconds with the displayed inspection time; decode again to refresh. Missing
		claims are omitted and unusual types are described. Limits: 64 KiB, 10,000 nodes, 64 levels.
		Native JSON precision and duplicate-key rules apply.
	</p>
</div>
