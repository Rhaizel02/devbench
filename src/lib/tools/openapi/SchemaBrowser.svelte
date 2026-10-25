<script lang="ts">
	import type { Contract } from './model';
	import { at, nodeAt, object, resolveReference } from './references';
	let { contract, initial }: { contract: Contract; initial?: string } = $props();
	let trail = $state<string[]>([]);
	let limit = $state(30);
	const path = $derived(trail.at(-1) ?? initial ?? contract.schemas[0]?.path ?? '');
	const value = $derived(path ? nodeAt(contract.root, path) : undefined);
	const schema = $derived(object(value));
	const children = $derived.by(() => {
		if (!schema) return [];
		const rows: { name: string; path: string; required: boolean }[] = [];
		for (const key of ['properties', 'patternProperties', '$defs', 'dependentSchemas'])
			for (const name of Object.keys(object(schema[key]) ?? {}))
				rows.push({
					name: key + '.' + name,
					path: at(at(path, key), name),
					required:
						key === 'properties' && Array.isArray(schema.required) && schema.required.includes(name)
				});
		for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems'])
			if (Array.isArray(schema[key]))
				schema[key].forEach((_, i) =>
					rows.push({ name: key + '[' + i + ']', path: at(at(path, key), i), required: false })
				);
		for (const key of [
			'items',
			'additionalProperties',
			'not',
			'contains',
			'if',
			'then',
			'else',
			'unevaluatedProperties'
		])
			if (schema[key] !== undefined) rows.push({ name: key, path: at(path, key), required: false });
		return rows;
	});
	const reference = $derived(
		typeof schema?.$ref === 'string' ? resolveReference(contract.root, schema.$ref, path) : null
	);
	const circular = $derived(reference?.target !== undefined && trail.includes(reference.target));
	function open(next: string) {
		trail = [...trail, next];
		limit = 30;
	}
</script>

<div class="schema-browser">
	<nav aria-label="Schema breadcrumb" class="tool-options">
		<button
			class="text-button"
			onclick={() => {
				trail = [];
				limit = 30;
			}}>Schema root</button
		>{#each trail as item, i (i)}<button
				class="text-button"
				onclick={() => {
					trail = trail.slice(0, i + 1);
					limit = 30;
				}}>{decodeURIComponent(item.split('/').at(-1) ?? item)}</button
			>{/each}
	</nav>
	{#if !path}<p>
			No component schemas. Operation inline schemas can be opened from their details.
		</p>{:else}
		<code class="schema-path">{path}</code>
		{#if value === undefined}<p role="alert">
				Schema not found.
			</p>{:else if typeof value === 'boolean'}<p>
				{value
					? 'Boolean schema: accepts any JSON instance.'
					: 'Boolean schema: accepts no JSON instance.'}
			</p>{:else if schema}
			<p class="schema-kind">
				{Array.isArray(schema.type)
					? schema.type.join(' | ')
					: String(
							schema.type ?? (schema.properties ? 'object' : 'unspecified type')
						)}{schema.nullable === true ? ' · nullable (3.0)' : ''}
			</p>
			{#if typeof schema.description === 'string'}<p>{schema.description}</p>{/if}
			{#if reference}<div class="ref-box">
					<code>{reference.ref}</code>
					<p>
						{circular
							? 'Recursive edge — target already appears in this breadcrumb.'
							: (reference.message ?? 'Local reference. Open explicitly; no automatic expansion.')}
					</p>
					{#if reference.target && reference.status === 'internal' && !circular}<button
							class="button"
							onclick={() => open(reference.target!)}>Open referenced schema</button
						>{/if}{#if contract.family === '3.1'}<p class="tool-help">
							Schema $ref siblings remain additional constraints; this view does not merge them.
						</p>{/if}
				</div>{/if}
			{#each Object.entries(schema).filter( ([key]) => ['enum', 'const', 'default', 'example', 'examples', 'format', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems', 'required', 'readOnly', 'writeOnly', 'additionalProperties', '$id', '$dynamicRef'].includes(key) ) as [key, v], rowIndex2 (rowIndex2)}<div
					class="constraint"
				>
					<strong>{key}</strong>
					<pre>{JSON.stringify(v, null, 2).slice(0, 6000)}</pre>
				</div>{/each}
			<div aria-label="Schema children">
				{#each children.slice(0, limit) as child, rowIndex3 (rowIndex3)}<button
						class="schema-child"
						onclick={() => open(child.path)}
						><span>{child.name}</span><span>{child.required ? 'required' : 'open'} →</span></button
					>{/each}
			</div>
			{#if children.length > limit}<button class="button" onclick={() => (limit += 30)}
					>Show 30 more schema children</button
				>{/if}
		{/if}{/if}
</div>

<style>
	.schema-browser {
		min-width: 0;
	}
	.schema-path {
		display: block;
		overflow-wrap: anywhere;
		color: var(--color-muted);
		font-size: 12px;
	}
	.schema-kind {
		color: var(--color-accent);
	}
	.schema-child {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		width: 100%;
		padding: 12px 0;
		border: 0;
		border-bottom: 1px solid var(--color-border);
		background: transparent;
		text-align: left;
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	.schema-child span:last-child {
		color: var(--color-muted);
		white-space: nowrap;
	}
	.ref-box {
		border-left: 2px solid var(--color-accent);
		padding: 12px;
		margin: 16px 0;
	}
	.ref-box code {
		overflow-wrap: anywhere;
	}
	.constraint {
		padding: 10px 0;
		border-bottom: 1px solid var(--color-border);
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 180px;
		overflow: auto;
		font-size: 12px;
	}
	nav {
		flex-wrap: wrap;
	}
	p {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
