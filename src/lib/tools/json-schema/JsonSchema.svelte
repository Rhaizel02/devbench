<script lang="ts">
	import { onDestroy } from 'svelte';
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import { startDataTask } from '../json-query/data-client';
	let mode = $state<'validate' | 'infer'>('validate');
	let multiple = $state(false);
	let schema = $state(
		'{"type":"object","properties":{"name":{"type":"string"},"items":{"type":"array","items":{"type":"integer"}}},"required":["name"]}'
	);
	let pending: ReturnType<typeof startDataTask<unknown>> | undefined;
	onDestroy(() => pending?.cancel());
	async function transform(input: string) {
		pending?.cancel();
		pending = startDataTask({ kind: mode, input, option: schema, multiple });
		const result = await pending.promise;
		return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
	}
</script>

<TextWorkspace
	sendSource="DATA-06"
	onReset={() => {
		pending?.cancel();
		schema = '';
	}}
	onExample={() =>
		(schema =
			'{"type":"object","properties":{"name":{"type":"string"},"items":{"type":"array","items":{"type":"integer"}}},"required":["name"]}')}
	{transform}
	revision={JSON.stringify([mode, schema, multiple])}
	action={mode === 'validate' ? 'Validate document' : 'Infer schema'}
	inputLabel="JSON document"
	outputLabel={mode === 'validate' ? 'Validation report' : 'Inferred schema'}
	inputLanguage="json"
	outputLanguage="json"
	filename={mode === 'validate' ? 'validation.json' : 'schema.json'}
	pasteToolId="DATA-06"
	sample={multiple
		? '[{"name":"Synthetic","items":[1,2]},{"name":null}]'
		: '{"name":"Synthetic","items":[1,2]}'}
>
	{#snippet options()}<label
			>Mode <select bind:value={mode}
				><option value="validate">Validate</option><option value="infer">Infer Schema</option
				></select
			></label
		>{#if mode === 'infer'}<label
				><input type="checkbox" bind:checked={multiple} />Array contains multiple examples</label
			>{/if}{/snippet}
	{#snippet details(output)}{#if mode === 'infer'}<button
				class="button"
				onclick={() => {
					schema = output;
					mode = 'validate';
				}}>Use inferred schema in validator</button
			>{/if}{/snippet}
	{#snippet help()}{#if mode === 'validate'}<div class="editor-panel">
				<div class="editor-panel-header"><h2>JSON Schema · Draft 2020-12</h2></div>
				<CodeEditor bind:value={schema} label="JSON Schema" language="json" />
			</div>{/if}
		<p>
			Local interpreted validation. Internal JSON Pointer references only; no remote loading, schema
			IDs or dynamic references. Invalid schema JSON, invalid document JSON and nonconforming
			documents are distinct outcomes. Up to 100 error details. 1 MiB per editor, 50,000 nodes / 64
			levels, 2,000 subschemas, 1.5-second worker budget. Inference accepts 1–100 examples, up to 32
			levels; empty arrays leave items unconstrained. Optional fields reflect only missing observed
			samples. This is an editable starting point, not a guaranteed API contract; formats and
			numeric bounds are not inferred.
		</p>{/snippet}
</TextWorkspace>
