<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import { buildRequest, generateRequest, importCurl, type CodeTarget } from './http-engine';
	import { errorMessage } from '../tool-errors';
	let method = $state('POST');
	let url = $state('https://api.example.invalid/items');
	let headers = $state('Content-Type: application/json');
	let query = $state('');
	let bodyMode = $state<'none' | 'text' | 'json'>('json');
	let target = $state<CodeTarget>('curl');
	let reveal = $state(false);
	let body = $state('');
	let command = $state('');
	let importError = $state('');
	function loadCommand() {
		try {
			const r = importCurl(command);
			method = r.method;
			url = r.url;
			headers = r.headers.map((h) => h.name + ': ' + h.value).join('\n');
			query = '';
			body = r.body ?? '';
			bodyMode = r.body === null ? 'none' : 'text';
			reveal = false;
			importError = '';
		} catch (error) {
			importError = errorMessage(error);
		}
	}
	function reset() {
		method = 'GET';
		url = '';
		headers = '';
		query = '';
		command = '';
		importError = '';
		reveal = false;
		bodyMode = 'none';
	}
	function example() {
		method = 'POST';
		url = 'https://api.example.invalid/items?tag=a&tag=b';
		headers = 'Content-Type: application/json\nAuthorization: Bearer synthetic-token';
		bodyMode = 'json';
	}
</script>

<TextWorkspace
	bind:input={body}
	transform={(input) =>
		generateRequest(buildRequest(method, url, headers, query, input, bodyMode), target, reveal)}
	revision={JSON.stringify([method, url, headers, query, bodyMode, target, reveal])}
	allowEmpty
	action="Generate request code"
	inputLabel="Request body"
	outputLabel="Generated request code"
	filename={target === 'java'
		? 'GeneratedRequest.java'
		: target === 'curl'
			? 'request.sh'
			: target === 'fetch'
				? 'request.js'
				: 'spring-request.java'}
	outputLanguage={target === 'java' || target === 'spring'
		? 'java'
		: target === 'fetch'
			? 'typescript'
			: 'plain'}
	inputLimitLabel="64 KiB body limit"
	onReset={reset}
	onExample={example}
	sample={'{"name":"Synthetic café","enabled":true}'}
>
	{#snippet options()}<label
			>Method <input class="field-input" aria-label="HTTP method" bind:value={method} /></label
		><label>URL <input class="field-input" aria-label="Request URL" bind:value={url} /></label
		><label
			>Body <select aria-label="Body type" bind:value={bodyMode}
				><option value="none">None</option><option value="text">Text</option><option value="json"
					>JSON</option
				></select
			></label
		><label
			>Generate <select aria-label="Code target" bind:value={target}
				><option value="curl">cURL POSIX</option><option value="fetch">JavaScript fetch</option
				><option value="java">Java HttpClient (11+)</option><option value="spring"
					>Spring RestClient (6.1+)</option
				></select
			></label
		><label
			><input type="checkbox" bind:checked={reveal} />Reveal secrets in generated code —
			copy/download will include them</label
		>{/snippet}
	{#snippet help()}<div class="dual-inputs">
			<div class="editor-panel">
				<div class="editor-panel-header"><h2>Headers · one Name: value per line</h2></div>
				<CodeEditor bind:value={headers} label="Request headers" language="plain" />
			</div>
			<div class="editor-panel">
				<div class="editor-panel-header"><h2>Append query · literal key=value per line</h2></div>
				<CodeEditor bind:value={query} label="Additional query parameters" language="plain" />
			</div>
		</div>
		<details>
			<summary>Import a literal cURL command</summary><CodeEditor
				bind:value={command}
				label="Import cURL command"
				language="plain"
			/><button class="button" onclick={loadCommand}>Import cURL</button>{#if importError}<p
					role="alert"
				>
					{importError}
				</p>{/if}
		</details>
		<p role="note">
			Code generation only. No request is sent. Sensitive header/query names and every body are
			redacted by default. Inputs remain visible; custom names/path secrets cannot be detected
			reliably. Repeated fields remain ordered; fetch/browser rules may combine or reject headers.
			Java transport-header restrictions are reported. GET/HEAD bodies are unsupported for fetch.
			Added query values use URLSearchParams encoding; imported cURL uses the Inspector's normalized
			literal subset and implicit content-type behavior. Nothing is silently executed. Limits: URL 8
			KiB; added query 32 KiB / 200 pairs; headers 64 KiB / 200 fields; body 64 KiB. Spring output
			is an imports-plus-method-statements fragment for Spring 6.1+ / Boot 3.2+.
		</p>{/snippet}
</TextWorkspace>
