<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { jsonToYaml, yamlToJson } from './yaml-engine';
	let direction = $state<'json-yaml' | 'yaml-json'>('json-yaml');
	const sample = $derived(
		direction === 'json-yaml'
			? '{"project":"Synthetic example","enabled":true,"items":["café","世界"],"optional":null}'
			: 'project: Synthetic example\nenabled: true\nitems:\n  - café\n  - 世界\noptional: null\n'
	);
	const transform = (input: string) =>
		direction === 'json-yaml' ? jsonToYaml(input) : yamlToJson(input);
</script>

<TextWorkspace
	{transform}
	revision={direction}
	{sample}
	action="Convert"
	inputLabel={direction === 'json-yaml' ? 'JSON input' : 'YAML input'}
	outputLabel={direction === 'json-yaml' ? 'YAML output' : 'JSON output'}
	inputLanguage={direction === 'json-yaml' ? 'json' : 'yaml'}
	outputLanguage={direction === 'json-yaml' ? 'yaml' : 'json'}
	filename={direction === 'json-yaml' ? 'devbench-output.yaml' : 'devbench-output.json'}
	onSwap={() => (direction = direction === 'json-yaml' ? 'yaml-json' : 'json-yaml')}
>
	{#snippet options()}<label
			>Direction<select aria-label="Conversion direction" bind:value={direction}
				><option value="json-yaml">JSON → YAML</option><option value="yaml-json">YAML → JSON</option
				></select
			></label
		>{/snippet}
	{#snippet help()}<p>
			YAML 1.2 core schema. String keys only; aliases, custom tags, duplicate keys, non-finite
			numbers and unsafe integers are rejected. Unquoted dates remain strings. Comments and
			formatting are not preserved. Limit: 100,000 nodes / 128 levels.
		</p>{/snippet}
</TextWorkspace>
