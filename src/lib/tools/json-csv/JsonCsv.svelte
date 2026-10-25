<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { jsonToCsv, csvToJson, type CsvOptions } from './csv-engine';
	let direction = $state<'json-csv' | 'csv-json'>('json-csv');
	let delimiter = $state<CsvOptions['delimiter']>(',');
	let header = $state(true);
	let quoteAll = $state(false);
	let nested = $state<CsvOptions['nested']>('reject');
	const settings = $derived({ delimiter, header, quoteAll, nested });
	const sample = $derived(
		direction === 'json-csv'
			? '[{"name":"Synthetic café","note":"Hello, world","active":true},{"name":"世界","note":"Two\\nlines","active":false}]'
			: [
					'name' + delimiter + 'note',
					'Synthetic café' + delimiter + '"Hello, world"',
					'世界' + delimiter + '"Two\nlines"'
				].join('\r\n')
	);
</script>

<p class="security-notice">
	CSV is lossy: null, missing fields and empty strings export as empty cells; CSV values import as
	strings. Spreadsheet consumers may execute formula-like cells. Output is not altered to prevent
	formulas.
</p>
<TextWorkspace
	pasteToolId="DATA-04"
	transform={(input) =>
		direction === 'json-csv' ? jsonToCsv(input, settings) : csvToJson(input, settings)}
	revision={JSON.stringify({ direction, ...settings })}
	action="Convert"
	inputLabel={direction === 'json-csv' ? 'JSON records input' : 'CSV input'}
	outputLabel={direction === 'json-csv' ? 'CSV output' : 'JSON records output'}
	inputLanguage={direction === 'json-csv' ? 'json' : 'plain'}
	outputLanguage={direction === 'json-csv' ? 'plain' : 'json'}
	filename={direction === 'json-csv' ? 'devbench-records.csv' : 'devbench-records.json'}
	{sample}
	onSwap={() => (direction = direction === 'json-csv' ? 'csv-json' : 'json-csv')}
>
	{#snippet options()}<label
			>Direction<select aria-label="CSV conversion direction" bind:value={direction}
				><option value="json-csv">JSON → CSV</option><option value="csv-json">CSV → JSON</option
				></select
			></label
		>
		<label
			>Delimiter<select aria-label="CSV delimiter" bind:value={delimiter}
				><option value=",">Comma</option><option value=";">Semicolon</option><option value="&#9;"
					>Tab</option
				><option value="|">Pipe</option></select
			></label
		>
		<label class="check-option"><input type="checkbox" bind:checked={header} />Header row</label>
		{#if direction === 'json-csv'}<label class="check-option"
				><input type="checkbox" bind:checked={quoteAll} />Quote all fields</label
			><label
				>Nested values<select aria-label="CSV nesting policy" bind:value={nested}
					><option value="reject">Reject</option><option value="stringify"
						>JSON-stringify explicitly</option
					></select
				></label
			>{/if}{/snippet}
	{#snippet help()}<p>
			Papa Parse handles quoted separators, doubled quotes, multiline fields, CRLF/LF and BOM.
			Import keeps string values and requires equal column counts; headers must be unique and
			nonempty. Without a header, names are column1, column2, … . Export columns use first-seen key
			order across records and CRLF endings; quoting preserves delimiter/newline/quote content. One
			terminal line break is ignored on import; interior empty records are significant. Nested cells
			require explicit JSON-stringification and import as strings. Limits: 1 MiB input, 5,000 data
			records, 200 columns and 64 KiB per cell. An empty record array cannot infer columns.
		</p>{/snippet}
</TextWorkspace>
