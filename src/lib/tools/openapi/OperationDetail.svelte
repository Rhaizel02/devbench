<script lang="ts">
	import type { Contract, Operation, MediaType } from './model';
	let {
		contract,
		operation: op,
		onSchema
	}: { contract: Contract; operation: Operation; onSchema: (path: string) => void } = $props();
</script>

{#snippet mediaTypes(media: MediaType[])}
	{#each media as m, rowIndex1 (rowIndex1)}<div class="media">
			<strong>{m.name}</strong>{#if m.schemaPath}<button
					class="text-button"
					onclick={() => onSchema(m.schemaPath!)}>Open schema</button
				>{/if}{#if m.encoding}<span>Custom encoding declared</span
				>{/if}{#each m.examples as example, rowIndex2 (rowIndex2)}<details>
					<summary>{example.name} · {example.source}</summary>
					<pre>{example.unavailable ?? JSON.stringify(example.value, null, 2)}</pre>
				</details>{/each}
		</div>{/each}
{/snippet}
<article class="operation-detail" aria-label="Operation details">
	<div class="section-bar">
		<h2><span class="subtle-tag">{op.method.toUpperCase()}</span> {op.route}</h2>
		{#if op.deprecated}<span>Deprecated</span>{/if}
	</div>
	<h3>{op.summary || op.operationId || 'Operation'}</h3>
	<p class="tool-help">{op.operationId} · {op.tags.join(' · ') || 'Untagged'}</p>
	<p>{op.description}</p>
	{#if op.unresolved}<p role="note">
			Unresolved inputs — request preparation may be unavailable.
		</p>{/if}
	<h3>Servers · {op.serverSource}</h3>
	{#each op.servers as server, rowIndex3 (rowIndex3)}<p>
			<code>{server.url}</code>
			{server.description}
		</p>
		{#each Object.entries(server.variables) as [name, v], rowIndex4 (rowIndex4)}<p
				class="tool-help"
			>
				{name}: default {v.default}{v.enum ? ' · ' + v.enum.join(' / ') : ''}
			</p>{/each}{:else}<p>
			Default relative server /. Request preparation requires an explicit base.
		</p>{/each}
	<h3>Parameters <span class="tool-help">{op.parameters.length}</span></h3>
	{#each op.parameters as p, rowIndex5 (rowIndex5)}<details class="detail-row" open>
			<summary
				><strong>{p.name}</strong> · {p.in} · {p.required ? 'required' : 'optional'}{p.deprecated
					? ' · deprecated'
					: ''}</summary
			>
			<p>{p.description}</p>
			<p class="tool-help">
				{p.style} · explode {String(p.explode)} · allowReserved {String(p.allowReserved)}
			</p>
			{#if p.schemaPath}<button class="text-button" onclick={() => onSchema(p.schemaPath!)}
					>Open schema</button
				>{/if}{#each p.examples as ex, rowIndex6 (rowIndex6)}<p>
					{ex.source}: <code>{JSON.stringify(ex.value) ?? ex.unavailable}</code>
				</p>{/each}{@render mediaTypes(p.content)}
		</details>{:else}<p>No declared parameters.</p>{/each}
	<h3>Request body {op.requestBody?.required ? '· required' : ''}</h3>
	{#if op.requestBody}<p>{op.requestBody.description}</p>
		{@render mediaTypes(op.requestBody.content)}{:else}<p>No declared body.</p>{/if}
	<h3>Responses</h3>
	{#each op.responses as response, rowIndex7 (rowIndex7)}<details class="detail-row" open>
			<summary><strong>{response.status}</strong> · {response.description}</summary
			>{@render mediaTypes(
				response.content
			)}{#each response.headers as header, rowIndex8 (rowIndex8)}<p>
					Header <strong>{header.name}</strong> · {header.description}
				</p>
				{#if header.schemaPath}<button
						class="text-button"
						onclick={() => onSchema(header.schemaPath!)}>Open header schema</button
					>{/if}{#each header.examples as ex, rowIndex9 (rowIndex9)}<pre>{ex.source}: {JSON.stringify(
							ex.value
						)}</pre>{/each}{/each}
		</details>{:else}<p>No responses declared (allowed by OpenAPI 3.1).</p>{/each}
	<h3>Effective security · {op.securitySource}</h3>
	{#if !op.security.length}<p>
			No security requirement declared for this operation. This is contract metadata, not a security
			assessment.
		</p>{/if}
	{#each op.security as requirement, i (i)}<div class="detail-row">
			<strong>Alternative {i + 1} · OR</strong
			>{#each Object.entries(requirement) as [name, scopes], rowIndex11 (rowIndex11)}{@const scheme =
					contract.securitySchemes.find((s) => s.name === name)}
				<p>
					{name} · {scheme?.type ?? 'undeclared'}{scheme?.parameterName
						? ' · ' + scheme.in + ' ' + scheme.parameterName
						: ''} · scopes: {scopes.join(', ') || 'none'}
				</p>{:else}<p>Anonymous alternative.</p>{/each}{#if Object.keys(requirement).length > 1}<p>
					All schemes in this alternative are required (AND).
				</p>{/if}
		</div>{/each}
</article>

<style>
	.operation-detail {
		min-width: 0;
	}
	h2,
	h3,
	p,
	code,
	summary {
		overflow-wrap: anywhere;
	}
	h3 {
		font-size: 14px;
		margin: 24px 0 12px;
	}
	p {
		white-space: pre-wrap;
	}
	.detail-row,
	.media {
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border);
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 180px;
		overflow: auto;
		font-size: 12px;
	}
	.section-bar h2 {
		font-size: 16px;
	}
	summary {
		cursor: pointer;
	}
	.media > strong {
		margin-right: 12px;
	}
</style>
