<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { inferCode, generatedTypeName } from './code-engine';
	let language = $state<'typescript' | 'java'>('typescript');
	let rootName = $state('Root');
</script>

<TextWorkspace
	transform={(input) => inferCode(input, language, rootName)}
	revision={JSON.stringify([language, rootName])}
	action="Infer types"
	inputLabel="JSON sample input"
	outputLabel="Generated code"
	inputLanguage="json"
	outputLanguage={language}
	filename={language === 'java' ? generatedTypeName(rootName) + '.java' : 'devbench-types.ts'}
	inputLimitLabel="128 KiB limit"
	sample={'[{"id":1,"name":"Synthetic café","profile":{"active":true}},{"id":2,"profile":{"active":false},"tags":["世界"]}]'}
>
	{#snippet options()}<label
			>Language<select aria-label="Generated language" bind:value={language}
				><option value="typescript">TypeScript</option><option value="java">Java records</option
				></select
			></label
		><label
			>Root type<input
				class="field-input"
				aria-label="Root type name"
				bind:value={rootName}
			/></label
		>{/snippet}
	{#snippet help()}<p>
			Sample-based inference, not a schema or runtime validator. Object arrays merge observed
			fields; a field becomes optional only when missing from some sampled objects. Empty arrays use
			unknown/Object; null-only values use null/Object; heterogeneous Java values use Object.
			TypeScript uses interfaces and root aliases; Java 17+ uses a public root record with nested
			records (non-object roots get a value wrapper). Java fields use nullable boxed/reference types
			and sanitized names; JSON-key comments are informational and need manual binding/mapping. Java
			numbers use BigDecimal after native JSON numeric parsing, which cannot recover lost precision.
			Names are made unique; input is never executed. Limits: 20,000 nodes, 32 levels, 200 fields
			per object and 256 characters per property key.
		</p>{/snippet}
</TextWorkspace>
