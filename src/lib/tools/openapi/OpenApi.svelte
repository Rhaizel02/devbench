<script lang="ts">
	import { onDestroy } from 'svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import { errorMessage } from '../tool-errors';
	import { startOpenApiTask } from './openapi-client';
	import { sampleContract } from './fixtures';
	import type { Contract, InputFormat } from './model';
	import { HTTP_METHODS, OPENAPI_LIMITS } from './model';
	import OperationDetail from './OperationDetail.svelte';
	import SchemaBrowser from './SchemaBrowser.svelte';
	import RequestPanel from './RequestPanel.svelte';
	import DiffPanel from './DiffPanel.svelte';
	let input = $state(''),
		format = $state<InputFormat>('auto');
	let result = $state<{ input: string; format: InputFormat; contract: Contract } | null>(null);
	let error = $state(''),
		busy = $state(false),
		view = $state('input'),
		search = $state(''),
		method = $state(''),
		tag = $state(''),
		deprecated = $state(false),
		selected = $state(''),
		schemaInitial = $state('');
	let pending: ReturnType<typeof startOpenApiTask<Contract>> | undefined;
	let ticket = 0,
		disposed = false;
	const contract = $derived(
		result?.input === input && result?.format === format ? result.contract : null
	);
	const operations = $derived(
		contract?.operations.filter(
			(op) =>
				(!method || op.method === method) &&
				(!tag || op.tags.includes(tag)) &&
				(!deprecated || op.deprecated) &&
				`${op.id} ${op.operationId} ${op.summary} ${op.tags.join(' ')}`
					.toLowerCase()
					.includes(search.toLowerCase())
		) ?? []
	);
	const operation = $derived(operations.find((op) => op.id === selected) ?? operations[0]);
	$effect(() => {
		void [input, format];
		ticket++;
		pending?.cancel();
		busy = false;
		result = null;
		error = '';
	});
	onDestroy(() => {
		disposed = true;
		ticket++;
		pending?.cancel();
	});
	async function parse() {
		pending?.cancel();
		const current = ++ticket;
		const snapshot = input,
			sourceFormat = format;
		busy = true;
		error = '';
		result = null;
		try {
			pending = startOpenApiTask({ kind: 'parse', input: snapshot, format: sourceFormat });
			const c = await pending.promise;
			if (!disposed && current === ticket && input === snapshot && format === sourceFormat) {
				result = { input: snapshot, format: sourceFormat, contract: c };
				view = 'explore';
				selected = '';
				schemaInitial = '';
			}
		} catch (e) {
			if (!disposed && current === ticket) error = errorMessage(e);
		} finally {
			if (!disposed && current === ticket) busy = false;
		}
	}
	function reset() {
		ticket++;
		pending?.cancel();
		input = '';
		result = null;
		error = '';
		busy = false;
		view = 'input';
		search = '';
		method = '';
		tag = '';
		deprecated = false;
		schemaInitial = '';
	}
	async function importFile(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const current = ++ticket;
		pending?.cancel();
		result = null;
		error = '';
		busy = false;
		try {
			if (file.size > OPENAPI_LIMITS.bytes) throw Error('File exceeds the 2 MiB contract limit.');
			const text = await file.text();
			if (!disposed && current === ticket) {
				input = text;
				view = 'input';
			}
		} catch (e) {
			if (!disposed && current === ticket) error = errorMessage(e);
		}
		(event.target as HTMLInputElement).value = '';
	}
	function openSchema(path: string) {
		schemaInitial = path;
		view = 'schemas';
	}
</script>

<div class="openapi">
	<div class="tool-options">
		<button
			class="button"
			onclick={() => {
				input = JSON.stringify(sampleContract(), null, 2);
				view = 'input';
			}}>Synthetic example</button
		><button class="button" onclick={reset}>Reset</button><label class="import"
			>Import local file <input
				type="file"
				aria-label="Import OpenAPI file"
				accept=".json,.yaml,.yml,application/json,text/yaml"
				onchange={importFile}
			/></label
		>
	</div>
	<div class="view-switch" role="group" aria-label="Contract workspace">
		<button
			class="button"
			disabled={!contract}
			aria-pressed={view === 'compare'}
			onclick={() => (view = 'compare')}>Compare</button
		>
		<button class="button" aria-pressed={view === 'input'} onclick={() => (view = 'input')}
			>Input</button
		><button
			class="button"
			disabled={!contract}
			aria-pressed={view === 'explore'}
			onclick={() => (view = 'explore')}>Explore</button
		><button
			class="button"
			disabled={!contract}
			aria-pressed={view === 'schemas'}
			onclick={() => (view = 'schemas')}>Schemas</button
		>
	</div>
	{#if error}<p role="alert" class="parse-error">{error}</p>{/if}
	{#if busy}<p role="status">
			Processing locally… <button
				class="text-button"
				onclick={() => {
					ticket++;
					pending?.cancel();
					busy = false;
					error = 'Operation cancelled. Input preserved.';
				}}>Cancel</button
			>
		</p>{/if}
	{#if view === 'input' || !contract}
		<div class="editor-panel">
			<div class="editor-panel-header">
				<h2>OpenAPI contract</h2>
				<label
					>Format <select aria-label="Contract format" bind:value={format}
						><option value="auto">Auto</option><option value="json">Strict JSON</option><option
							value="yaml">YAML</option
						></select
					></label
				>
			</div>
			<CodeEditor bind:value={input} label="OpenAPI source" language="yaml" />
			<div class="input-footer">
				<span>2 MiB · OpenAPI 3.0.x / 3.1.x</span><button
					class="button primary"
					disabled={busy || !input.trim()}
					onclick={parse}>Parse contract</button
				>
			</div>
		</div>
	{:else}
		<header class="contract-summary">
			<div>
				<h2>{contract.title} <span class="tool-help">{contract.version}</span></h2>
				<p>{contract.description}</p>
			</div>
			<span class="subtle-tag">OAS {contract.openapi} · {contract.format.toUpperCase()}</span>
			<p class="tool-help">
				{contract.statistics.operations} operations · {contract.statistics.schemas} component schemas
				· {contract.statistics.references} references · {contract.statistics.externalReferences} external
				· {contract.statistics.bytes.toLocaleString()} bytes
			</p>
		</header>
		<details class="contract-metadata">
			<summary>Contract servers, tags and security schemes</summary>
			{#each contract.servers as server, i (i)}<p>
					<code>{server.url}</code>
					{server.description}
				</p>{:else}<p>No root servers declared.</p>{/each}
			{#each contract.tags as tag (tag.name)}<p>
					<strong>{tag.name}</strong>
					{tag.description}
				</p>{/each}
			{#each contract.securitySchemes as scheme (scheme.name)}<details>
					<summary>{scheme.name} · {scheme.type}</summary>
					<pre>{JSON.stringify(scheme.details, null, 2).slice(0, 12000)}</pre>
				</details>{/each}
		</details>
		{#if contract.issues.length}<details class="diagnostics">
				<summary>{contract.issues.length} diagnostics (up to 200)</summary
				>{#each contract.issues as issue, rowIndex1 (rowIndex1)}<p>
						<code>{issue.path}</code> — {issue.message}
					</p>{/each}
			</details>{/if}
		{#if view === 'explore'}
			<div class="explorer">
				<aside class="operation-list" aria-label="Operations">
					<input
						class="field-input"
						type="search"
						aria-label="Search operations"
						placeholder="Search method, path, tags…"
						bind:value={search}
					/>
					<div class="tool-options">
						<select aria-label="Filter method" bind:value={method}
							><option value="">All methods</option
							>{#each HTTP_METHODS as m, rowIndex2 (rowIndex2)}<option value={m}
									>{m.toUpperCase()}</option
								>{/each}</select
						><select aria-label="Filter tag" bind:value={tag}
							><option value="">All tags</option
							>{#each [...new Set(contract.operations.flatMap((op) => op.tags))] as t, rowIndex3 (rowIndex3)}<option
									>{t}</option
								>{/each}</select
						>
					</div>
					<label><input type="checkbox" bind:checked={deprecated} /> Deprecated only</label>
					<p class="tool-help">{operations.length} matching operations</p>
					{#each operations as op, rowIndex4 (rowIndex4)}<button
							class="operation"
							aria-pressed={op.id === operation?.id}
							onclick={() => (selected = op.id)}
							><span class="subtle-tag">{op.method.toUpperCase()}</span><code>{op.route}</code><span
								>{op.summary || op.operationId}</span
							></button
						>{:else}<p>No matching operations. Schema-only contracts have no endpoints.</p>{/each}
				</aside>
				<div class="detail-panel">
					{#if operation}<button class="button primary" onclick={() => (view = 'request')}
							>Prepare request</button
						><OperationDetail {contract} {operation} onSchema={openSchema} />{:else}<p>
							Select another filter or explore component schemas.
						</p>{/if}
				</div>
			</div>
		{:else if view === 'compare'}<DiffPanel baseline={input} {format} />
		{:else if view === 'request' && operation}<div class="detail-panel">
				<RequestPanel {contract} {operation} />
			</div>
		{:else if view === 'schemas'}<div class="explorer">
				<aside class="operation-list" aria-label="Component schemas">
					{#each contract.schemas as schema, rowIndex5 (rowIndex5)}<button
							class="operation"
							onclick={() => (schemaInitial = schema.path)}>{schema.name}</button
						>{:else}<p>No component schemas.</p>{/each}
				</aside>
				<div class="detail-panel">
					{#key schemaInitial}<SchemaBrowser
							{contract}
							initial={schemaInitial || undefined}
						/>{/key}
				</div>
			</div>{/if}
	{/if}
	<p class="tool-help privacy-note">
		Local memory only. No API calls, OAuth, URL imports or external reference downloads. Structural
		inspection, not a universal OpenAPI conformance validator. 2-second worker budget; reset or
		leave to clear. Descriptions are untrusted plain text.
	</p>
</div>

<style>
	.contract-metadata {
		padding: 12px 0;
		overflow-wrap: anywhere;
	}
	.contract-metadata pre {
		white-space: pre-wrap;
		max-height: 240px;
		overflow: auto;
		font-size: 12px;
	}
	.openapi {
		min-width: 0;
	}
	.view-switch {
		display: flex;
		gap: 8px;
		margin: 16px 0;
		flex-wrap: wrap;
	}
	.view-switch [aria-pressed='true'] {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.import {
		max-width: 100%;
		overflow: hidden;
	}
	.import input {
		max-width: 100%;
		font-size: 12px;
	}
	.input-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		gap: 12px;
		color: var(--color-muted);
		font-size: 12px;
	}
	.contract-summary {
		padding: 16px 0;
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: 12px;
	}
	.contract-summary div {
		flex: 1;
		min-width: 0;
	}
	.contract-summary p {
		margin: 8px 0;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
	.contract-summary > .tool-help {
		width: 100%;
		white-space: normal;
	}
	h2 {
		font-size: 18px;
		overflow-wrap: anywhere;
	}
	.explorer {
		display: grid;
		grid-template-columns: minmax(210px, 30%) minmax(0, 1fr);
		border: 1px solid var(--color-border);
		background: var(--color-panel);
		min-height: 520px;
	}
	.operation-list {
		padding: 16px;
		border-right: 1px solid var(--color-border);
		min-width: 0;
	}
	.operation-list > .field-input {
		width: 100%;
	}
	.operation-list .tool-options {
		margin: 12px 0;
		gap: 8px;
	}
	.operation {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		padding: 14px 4px;
		width: 100%;
		border: 0;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		color: var(--color-text);
		background: transparent;
		overflow-wrap: anywhere;
	}
	.operation code {
		overflow-wrap: anywhere;
		font-size: 12px;
	}
	.operation > span:last-child:not(:first-child) {
		width: 100%;
		font-size: 12px;
		color: var(--color-muted);
	}
	.operation[aria-pressed='true'] {
		border-left: 2px solid var(--color-accent);
		padding-left: 10px;
		background: var(--color-bg);
	}
	.detail-panel {
		padding: 20px;
		min-width: 0;
		overflow: hidden;
	}
	.diagnostics {
		padding: 12px 0;
		font-size: 12px;
	}
	.diagnostics p {
		overflow-wrap: anywhere;
	}
	.privacy-note {
		margin-top: 16px;
	}
	.editor-panel :global(.cm-editor) {
		min-height: 360px;
		max-height: 560px;
	}
	.editor-panel-header {
		flex-wrap: wrap;
	}
	button,
	select {
		cursor: pointer;
	}
	@media (max-width: 767px) {
		.explorer {
			grid-template-columns: minmax(0, 1fr);
		}
		.operation-list {
			border-right: 0;
			border-bottom: 1px solid var(--color-border);
			max-height: 350px;
			overflow: auto;
		}
		.detail-panel {
			padding: 16px;
		}
		.operation,
		button {
			min-height: 44px;
		}
		.input-footer {
			flex-wrap: wrap;
		}
		.tool-options {
			flex-wrap: wrap;
		}
		.import input {
			font-size: 14px;
		}
		.diagnostics {
			font-size: 14px;
		}
	}
</style>
