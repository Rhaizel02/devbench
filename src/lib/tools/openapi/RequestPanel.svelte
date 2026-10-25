<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import SendResult from '#lib/components/SendResult.svelte';
	import {
		buildRequest,
		generateRequest,
		type RequestDraft,
		type CodeTarget
	} from '../http-request/http-engine';
	import { errorMessage } from '../tool-errors';
	import type { Contract, Operation } from './model';
	import {
		requestDefaults,
		prepareRequest,
		redactContractRequest,
		isCredential,
		type RequestOptions
	} from './request-engine';
	let { contract, operation }: { contract: Contract; operation: Operation } = $props();
	let options = $state<RequestOptions | null>(null),
		warnings = $state<string[]>([]),
		error = $state(''),
		method = $state(''),
		url = $state(''),
		headers = $state(''),
		target = $state<CodeTarget>('curl'),
		reveal = $state(false);
	let preview = $state<{ revision: string; draft: RequestDraft } | null>(null);
	$effect(() => {
		const initial = requestDefaults(contract, operation);
		options = initial.options;
		warnings = initial.warnings;
		method = operation.method.toUpperCase();
		url = '';
		headers = '';
		preview = null;
		error = '';
		reveal = false;
	});
	const revision = $derived(JSON.stringify([options, method, url, headers]));
	const current = $derived(preview?.revision === revision ? preview.draft : null);
	const outputs = $derived.by(() => {
		if (!current) return null;
		try {
			const safe = redactContractRequest(contract, operation, current);
			return {
				code: generateRequest(reveal ? current : safe, target, true),
				handoff: generateRequest(safe, 'curl', true),
				request: reveal ? current : safe,
				error: ''
			};
		} catch (e) {
			return { code: null, handoff: null, request: null, error: errorMessage(e) };
		}
	});
	function prepare() {
		error = '';
		preview = null;
		try {
			if (!options) return;
			const draft = prepareRequest(contract, operation, options);
			const edited = buildRequest(
				method,
				url || draft.url,
				[...draft.headers.map((h) => h.name + ': ' + h.value), headers].filter(Boolean).join('\n'),
				'',
				draft.body ?? '',
				draft.body === null ? 'none' : 'text'
			);
			preview = { revision, draft: edited };
		} catch (e) {
			error = errorMessage(e);
		}
	}
</script>

<section aria-label="Prepare operation request">
	<h3>{operation.method.toUpperCase()} {operation.route}</h3>
	<p class="tool-help">
		Edit local samples, then preview explicitly. Nothing is sent. Blank optional parameters are
		omitted; enter values as JSON, including quotes around strings.
	</p>
	{#if options}
		<div class="tool-options">
			<label
				>Server <select
					aria-label="Request server"
					bind:value={options.server}
					onchange={() => {
						if (options)
							options.variables = Object.fromEntries(
								Object.entries(operation.servers[options.server]?.variables ?? {}).map(([k, v]) => [
									k,
									isCredential(contract, operation, k) ? '' : v.default
								])
							);
					}}
					>{#each operation.servers as server, i (i)}<option value={i}>{server.url}</option
						>{:else}<option value={0}>Relative default /</option>{/each}</select
				></label
			><label
				>Explicit base for relative servers <input
					class="field-input"
					aria-label="Relative server base"
					bind:value={options.base}
				/></label
			>
		</div>
		{#each Object.entries(operation.servers[options.server]?.variables ?? {}) as [name, variable] (name)}<label
				class="field"
				>Server variable {name}<input
					class="field-input"
					aria-label={'Server variable ' + name}
					bind:value={options.variables[name]}
				/><span class="tool-help">{variable.enum?.join(' / ') ?? 'Free value'}</span></label
			>{/each}
		{#each operation.parameters as parameter (parameter.key)}<label class="field"
				>{parameter.name} · {parameter.in} · {parameter.required ? 'required' : 'optional'}<input
					class="field-input"
					aria-label={'Parameter ' + parameter.name}
					bind:value={options.values[parameter.key]}
				/><span class="tool-help"
					>{parameter.style} / explode {String(parameter.explode)} · {parameter.examples[0]
						?.source ?? 'synthetic sample'}</span
				></label
			>{/each}
		{#if operation.requestBody}<label class="field"
				>Body media type<select aria-label="Body media type" bind:value={options.media}
					><option value="">No body</option
					>{#each operation.requestBody.content as media (media.name)}<option value={media.name}
							>{media.name}</option
						>{/each}</select
				></label
			>
			<div class="editor-panel">
				<div class="editor-panel-header"><h2>Editable request body</h2></div>
				<CodeEditor bind:value={options.body} label="OpenAPI request body" language="json" />
			</div>{/if}
		<details>
			<summary>Edit method, override URL or add headers</summary>
			<div class="tool-options">
				<label
					>Method<input
						class="field-input"
						aria-label="Prepared HTTP method"
						bind:value={method}
					/></label
				><label
					>URL override (optional)<input
						class="field-input"
						aria-label="Prepared URL override"
						bind:value={url}
					/></label
				>
			</div>
			<label class="field"
				>Additional headers · Name: value<textarea
					class="field-input"
					aria-label="Prepared additional headers"
					bind:value={headers}></textarea></label
			>
		</details>
		<details>
			<summary>Sample notes</summary>{#each [...new Set(warnings)] as warning (warning)}<p
					class="tool-help"
				>
					{warning}
				</p>{/each}
		</details>
		<button class="button primary" onclick={prepare}>Preview request</button>
	{/if}
	{#if error}<p role="alert" class="parse-error">{error}</p>{/if}
	{#if preview && !current}<p role="status">
			Options changed. Preview again before copying or transferring.
		</p>{/if}
	{#if current && outputs}<div class="request-preview">
			<h3>Request preview</h3>
			<label
				><input type="checkbox" bind:checked={reveal} /> Reveal values in preview/code — copy and download
				include them</label
			>
			<p class="tool-help">
				Handoff always redacts credentials and the entire body. Body becomes a placeholder; edit it
				in HTTP Builder before using generated code. Custom secrets in path/value names may need
				manual review.
			</p>
			{#if outputs.error}<p role="alert">{outputs.error}</p>{/if}{#if outputs.request}<pre
					aria-label="Prepared request preview">{[
						outputs.request.method + ' ' + outputs.request.url,
						...outputs.request.headers.map((h) => h.name + ': ' + h.value),
						'',
						outputs.request.body ?? '(no body)'
					].join('\n')}</pre>{/if}
			<label
				>Code target <select aria-label="OpenAPI code target" bind:value={target}
					><option value="curl">cURL</option><option value="fetch">JavaScript fetch</option><option
						value="java">Java HttpClient</option
					><option value="spring">Spring RestClient</option></select
				></label
			>
			<OutputActions
				text={outputs.code}
				filename={target === 'curl'
					? 'openapi-request.sh'
					: target === 'fetch'
						? 'openapi-request.js'
						: 'OpenApiRequest.java'}
			/>
			<pre aria-label="OpenAPI generated code">{outputs.code ??
					'Code unavailable for this target.'}</pre>
			<SendResult source="BACK-10" text={outputs.handoff} />
		</div>{/if}
</section>

<style>
	section {
		min-width: 0;
	}
	h3 {
		font-size: 15px;
		overflow-wrap: anywhere;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 16px 0;
	}
	.field-input,
	select {
		max-width: 100%;
		min-width: 0;
	}
	.field-input {
		width: 100%;
	}
	.tool-options {
		flex-wrap: wrap;
	}
	.tool-options label {
		flex: 1;
		min-width: 160px;
	}
	details {
		padding: 14px 0;
	}
	summary {
		cursor: pointer;
	}
	.request-preview {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid var(--color-border);
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: var(--color-bg);
		padding: 16px;
		max-height: 340px;
		overflow: auto;
		font-size: 12px;
	}
	.editor-panel :global(.cm-editor) {
		min-height: 160px;
		max-height: 280px;
	}
	@media (max-width: 767px) {
		button,
		select,
		input {
			min-height: 44px;
		}
		pre {
			font-size: 14px;
		}
	}
</style>
