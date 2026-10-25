<script lang="ts">
	import { onDestroy } from 'svelte';
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { startDataTask } from './data-client';
	import type { Match } from './query-engine';
	let query = $state('$');
	let matches = $state<Match[]>([]);
	let pending: ReturnType<typeof startDataTask<Match[]>> | undefined;
	onDestroy(() => pending?.cancel());
	async function transform(input: string) {
		pending?.cancel();
		pending = startDataTask<Match[]>({ kind: 'query', input, option: query });
		matches = await pending.promise;
		return JSON.stringify(
			matches.map((m) => m.value),
			null,
			2
		);
	}
</script>

<TextWorkspace
	sendSource="DATA-05"
	onReset={() => {
		pending?.cancel();
		matches = [];
		query = '$';
	}}
	onExample={() => (query = '$.products[?(@.price < 20)]')}
	{transform}
	revision={query}
	action="Run query"
	inputLabel="JSON document"
	outputLabel="Matched values"
	inputLanguage="json"
	outputLanguage="json"
	filename="query-results.json"
	pasteToolId="DATA-05"
	sample={'{"products":[{"name":"Notebook","price":12},{"name":"Pen","price":3},{"name":"Lamp","price":35}],"available":null}'}
>
	{#snippet options()}<label
			>JSONPath <input aria-label="JSONPath expression" bind:value={query} /></label
		><label
			>Query example <select
				aria-label="Query example"
				onchange={(event) => (query = event.currentTarget.value)}
				><option value="$.products[?(@.price < 20)]">Numeric filter</option><option
					value="$.available">Simple property</option
				><option value="$.products[0]">Array index</option><option value="$..name"
					>Descendant</option
				><option value="$.products[*]">Wildcard</option></select
			></label
		>{/snippet}
	{#snippet details()}<div class="tool-help">
			<p role="status">
				{matches.length} results{matches.length === 0 ? ' — query succeeded with no matches.' : ''}
			</p>
			{#each matches.slice(0, 100) as match, index (index)}<div class="section-bar">
					<code>{match.path}</code><CopyButton text={match.path} label="Copy JSONPath" /><CopyButton
						text={match.pointer}
						label="Copy JSON Pointer"
					/>
				</div>{/each}{#if matches.length > 100}<p>
					First 100 paths shown. All matched values are included below.
				</p>{/if}
		</div>{/snippet}
	{#snippet help()}<p>
			RFC 9535 subset: properties (JSON double-quoted escapes or simple single quotes), indices
			including negative indices, wildcard, descendants and scalar comparisons such as [?(@.price
			&lt; 20)]. No unions, slices, functions, logical operators or scripts. 1 MiB, 50,000 nodes, 64
			levels, 32 segments, 2,000 results, 200,000 visits, 2 MiB output and 1.5-second worker limit.
			Native JSON number precision applies.
		</p>{/snippet}
</TextWorkspace>
