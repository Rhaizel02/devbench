<script lang="ts">
	import { onDestroy } from 'svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import {
		datasetPreset,
		presetNames,
		newField,
		fieldTypes,
		DATA_LIMITS,
		type DatasetSpec,
		type DatasetResult,
		type FieldType
	} from './dataset-engine';
	import { startDataset } from './dataset-client';
	import { errorMessage } from '../tool-errors';
	let spec = $state<DatasetSpec>(datasetPreset(0)),
		preset = $state(0),
		selected = $state(0),
		serial = 0,
		report = $state<DatasetResult | null>(null),
		reportKey = $state(''),
		error = $state(''),
		errorKey = $state(''),
		busy = $state(false),
		format = $state<'json' | 'csv'>('json'),
		csvCollection = $state(''),
		previewPage = $state(0);
	let pending: ReturnType<typeof startDataset> | undefined,
		ticket = 0,
		runKey = '';
	const key = $derived(JSON.stringify(spec));
	const current = $derived(reportKey === key ? report : null);
	const currentError = $derived(errorKey === key ? error : '');
	const collection = $derived(spec.collections[selected] ?? spec.collections[0]);
	const previewFields = $derived(
		spec.collections
			.find((c) => c.name === (csvCollection || collection.name))
			?.fields.map((f) => f.name) ?? []
	);
	const output = $derived(
		current
			? format === 'json'
				? current.json
				: (current.csv[csvCollection || spec.collections[0].name] ?? null)
			: null
	);
	const preview = $derived(output === null ? '' : output.slice(0, 16000));
	const previewRows = $derived(
		current?.collections[csvCollection || collection.name]?.slice(
			previewPage * 10,
			previewPage * 10 + 10
		) ?? []
	);
	$effect(() => {
		if (busy && key !== runKey) {
			ticket++;
			pending?.cancel();
			busy = false;
		}
	});
	$effect(() => {
		const names = spec.collections.map((c) => c.name);
		if (!names.includes(csvCollection)) csvCollection = names[0] ?? '';
	});
	onDestroy(() => {
		ticket++;
		pending?.cancel();
	});
	async function generate() {
		pending?.cancel();
		const operation = ++ticket,
			snapshot = key;
		runKey = snapshot;
		busy = true;
		error = '';
		report = null;
		previewPage = 0;
		try {
			const value = $state.snapshot(spec);
			if (!value.seed)
				value.seed = Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) =>
					n.toString(16)
				).join('-');
			pending = startDataset(value);
			const result = await pending.promise;
			if (operation === ticket && key === snapshot) {
				report = result;
				reportKey = snapshot;
				csvCollection = value.collections[0].name;
			}
		} catch (e) {
			if (operation === ticket) {
				error = errorMessage(e);
				errorKey = snapshot;
			}
		} finally {
			if (operation === ticket) busy = false;
		}
	}
	function reset() {
		ticket++;
		pending?.cancel();
		busy = false;
		report = null;
		error = '';
		spec = datasetPreset(0);
		selected = 0;
		preset = 0;
		format = 'json';
		csvCollection = '';
		previewPage = 0;
	}
	function loadPreset() {
		ticket++;
		pending?.cancel();
		busy = false;
		spec = datasetPreset(preset);
		selected = 0;
		report = null;
		error = '';
		csvCollection = '';
		previewPage = 0;
	}
	function addCollection() {
		if (spec.collections.length >= DATA_LIMITS.collections) return;
		const id = 'collection-' + ++serial;
		spec.collections.push({
			id,
			name: 'collection_' + serial,
			rows: 10,
			fields: [{ ...newField('id', 'id', 'integer'), unique: true }]
		});
		spec.output = 'collections';
		selected = spec.collections.length - 1;
	}
	function removeCollection() {
		if (spec.collections.length === 1) return;
		spec.collections.splice(selected, 1);
		selected = 0;
		if (spec.collections.length === 1) spec.output = 'array';
	}
	function changeType(index: number, type: FieldType) {
		const before = collection.fields[index];
		collection.fields[index] = {
			...newField(before.id, before.name, type),
			...(type === 'reference'
				? {
						collectionId: spec.collections.find((c) => c.id !== collection.id)?.id ?? '',
						fieldId: 'id'
					}
				: {})
		};
	}
</script>

<section class="dataset" aria-label="Structured dataset generator">
	<div class="dataset-heading">
		<div>
			<span class="subtle-tag">STRUCTURED DATASETS · V2</span>
			<h2>Fixtures with relationships.</h2>
			<p class="tool-help">
				Define a schema, generate locally, inspect ten rows at a time, export the full result.
			</p>
		</div>
		<div class="action-group">
			<button class="button primary" disabled={busy} onclick={generate}
				>{busy ? 'Generating…' : 'Generate dataset'}</button
			><button class="button" disabled={!busy} onclick={() => pending?.cancel()}
				>Cancel dataset</button
			><button class="text-button" onclick={reset}>Reset dataset</button>
		</div>
	</div>
	<div class="tool-options">
		<label
			>Preset<select aria-label="Dataset preset" bind:value={preset}
				>{#each presetNames as name, index (index)}<option value={index}>{name}</option
					>{/each}</select
			></label
		><button class="button" onclick={loadPreset}>Load dataset preset</button><label
			>Seed<input
				class="field-input"
				aria-label="Dataset seed"
				bind:value={spec.seed}
				maxlength="128"
				placeholder="Blank = fresh random seed"
			/></label
		><label
			>JSON envelope<select aria-label="Dataset JSON envelope" bind:value={spec.output}
				><option value="array">Single collection array</option><option value="collections"
					>Related collections</option
				><option value="page">Paginated API response</option></select
			></label
		>
	</div>
	<p class="tool-help">
		Seeded values are reproducible synthetic fixtures, not security randomness. Memory only; edits
		invalidate results.
	</p>
	<div class="collection-tabs" role="group" aria-label="Dataset collections">
		{#each spec.collections as c, index (c.id)}<button
				class="button"
				aria-pressed={selected === index}
				onclick={() => {
					selected = index;
					previewPage = 0;
				}}>{c.name} · {c.rows}</button
			>{/each}<button class="button" disabled={spec.collections.length >= 5} onclick={addCollection}
			>Add collection</button
		>
	</div>
	<section class="schema-panel" aria-label="Collection schema">
		<div class="tool-options">
			<label
				>Collection name<input
					class="field-input"
					aria-label="Collection name"
					bind:value={collection.name}
					maxlength="64"
				/></label
			><label
				>Rows<input
					class="field-input"
					aria-label="Collection rows"
					type="number"
					min="1"
					max="5000"
					bind:value={collection.rows}
				/></label
			><button
				class="text-button"
				disabled={spec.collections.length === 1}
				onclick={removeCollection}>Remove collection</button
			><button
				class="button"
				disabled={collection.fields.length >= 24}
				onclick={() => collection.fields.push(newField('field-' + ++serial, 'field_' + serial))}
				>Add field</button
			>
		</div>
		{#each collection.fields as field, index (field.id)}<details class="schema-field">
				<summary
					><span
						><span aria-hidden="true">› </span>{field.name}
						<span class="subtle-tag">{field.type}</span></span
					><span class="field-policy"
						>{field.unique ? 'Unique · ' : ''}{field.required
							? 'Required'
							: 'Optional'}{field.nullable ? ' · Nullable' : ''}{field.type === 'reference'
							? ' → ' +
								(spec.collections.find((c) => c.id === field.collectionId)?.name ?? 'missing')
							: ''}</span
					></summary
				>
				<div class="field-options">
					<label
						>Name<input
							class="field-input"
							aria-label={'Field ' + (index + 1) + ' name'}
							bind:value={field.name}
							maxlength="64"
						/></label
					><label
						>Type<select
							aria-label={'Field ' + (index + 1) + ' type'}
							value={field.type}
							onchange={(e) => changeType(index, e.currentTarget.value as FieldType)}
							>{#each fieldTypes as type (type)}<option value={type}>{type}</option>{/each}</select
						></label
					><label
						>Value<select aria-label={'Field ' + (index + 1) + ' mode'} bind:value={field.mode}
							><option value="generated">Generated</option><option value="fixed"
								>Fixed JSON scalar</option
							></select
						></label
					>
					<label class="check"
						><input
							type="checkbox"
							aria-label={'Field ' + (index + 1) + ' required'}
							bind:checked={field.required}
						/>Required</label
					><label class="check"
						><input
							type="checkbox"
							aria-label={'Field ' + (index + 1) + ' nullable'}
							bind:checked={field.nullable}
						/>Nullable</label
					><label class="check"
						><input
							type="checkbox"
							aria-label={'Field ' + (index + 1) + ' unique'}
							bind:checked={field.unique}
						/>Unique</label
					>
					{#if field.mode === 'fixed'}<label class="wide"
							>Fixed value (JSON scalar)<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' fixed JSON'}
								bind:value={field.fixed}
								maxlength="2048"
							/></label
						>
					{:else if field.type === 'string'}<label
							>Length<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' length'}
								type="number"
								min="1"
								max="256"
								bind:value={field.length}
							/></label
						><label
							>ASCII prefix<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' prefix'}
								bind:value={field.prefix}
								maxlength="64"
							/></label
						>
					{:else if field.type === 'integer' || field.type === 'decimal'}<label
							>Minimum<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' minimum'}
								type="number"
								bind:value={field.min}
								step="any"
							/></label
						><label
							>Maximum<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' maximum'}
								type="number"
								bind:value={field.max}
								step="any"
							/></label
						>{#if field.type === 'decimal'}<label
								>Decimal places<input
									class="field-input"
									aria-label={'Field ' + (index + 1) + ' decimals'}
									type="number"
									min="0"
									max="4"
									bind:value={field.decimals}
								/></label
							>{/if}
					{:else if field.type === 'enum'}<label class="wide"
							>Distinct values, one per line<textarea
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' enum values'}
								bind:value={field.values}
								rows="3"></textarea></label
						>
					{:else if field.type === 'date' || field.type === 'datetime'}<label
							>From UTC ISO<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' start'}
								bind:value={field.start}
							/></label
						><label
							>To UTC ISO<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' end'}
								bind:value={field.end}
							/></label
						>
					{:else if field.type === 'ean13' || field.type === 'gtin14'}<label
							>Numeric prefix<input
								class="field-input"
								aria-label={'Field ' + (index + 1) + ' prefix'}
								bind:value={field.prefix}
								maxlength="13"
							/></label
						>
					{:else if field.type === 'reference'}<label
							>Parent collection<select
								aria-label={'Field ' + (index + 1) + ' parent collection'}
								bind:value={field.collectionId}
								><option value="">Choose parent</option
								>{#each spec.collections as parent (parent.id)}<option value={parent.id}
										>{parent.name}</option
									>{/each}</select
							></label
						><label
							>Unique parent key<select
								aria-label={'Field ' + (index + 1) + ' parent key'}
								bind:value={field.fieldId}
								><option value="">Choose key</option
								>{#each spec.collections.find((c) => c.id === field.collectionId)?.fields ?? [] as key (key.id)}<option
										value={key.id}>{key.name}{key.unique ? ' · unique' : ''}</option
									>{/each}</select
							></label
						>{/if}
					<button
						class="text-button"
						disabled={collection.fields.length === 1}
						aria-label={'Remove field ' + (index + 1)}
						onclick={() => collection.fields.splice(index, 1)}>Remove field</button
					>
				</div>
			</details>{/each}
	</section>
	{#if currentError}<p class="parse-error" role="alert">{currentError}</p>{/if}
	<section class="result-section" aria-label="Dataset result">
		<div class="section-bar">
			<h2>Generated data</h2>
			{#if current}<span class="tool-help"
					>{current.rows} rows · {current.fields} fields · {current.bytes.toLocaleString('en-US')} UTF-8
					bytes · seed {current.seed}</span
				>{:else}<span class="tool-help"
					>{report
						? 'Schema changed. Generate again.'
						: 'No current dataset. Generate to inspect results.'}</span
				>{/if}
		</div>
		<div class="tool-options">
			<label
				>Export format<select aria-label="Dataset export format" bind:value={format}
					><option value="json">JSON</option><option value="csv">CSV · one collection</option
					></select
				></label
			><label
				>Preview / CSV collection<select
					aria-label="Dataset result collection"
					bind:value={csvCollection}
					onchange={() => (previewPage = 0)}
					>{#each spec.collections as c (c.id)}<option value={c.name}>{c.name}</option
						>{/each}</select
				></label
			>
		</div>
		{#if current}<p class="tool-help">
				Generation order: {current.order.join(' → ')}. Preview rows {previewPage * 10 +
					1}–{previewPage * 10 + previewRows.length}.
			</p>
			<div class="table-scroll">
				<table>
					<thead
						><tr
							>{#each previewFields as name (name)}<th>{name}</th>{/each}</tr
						></thead
					><tbody
						>{#each previewRows as row, index (index)}<tr
								>{#each previewFields as name (name)}<td
										>{row[name] === undefined ? '(omitted)' : JSON.stringify(row[name])}</td
									>{/each}</tr
							>{/each}</tbody
					>
				</table>
			</div>
			<div class="action-group">
				<button class="text-button" disabled={!previewPage} onclick={() => previewPage--}
					>Previous rows</button
				><button
					class="text-button"
					disabled={(previewPage + 1) * 10 >=
						(current.collections[csvCollection || collection.name]?.length ?? 0)}
					onclick={() => previewPage++}>Next rows</button
				>
			</div>{/if}
		<div class="editor-panel short-editor">
			<CodeEditor
				value={preview}
				readonly
				label="Dataset output"
				language={format === 'json' ? 'json' : 'plain'}
			/>
		</div>
		{#if output && output.length > 16000}<p class="tool-help">
				Code preview truncated at 16,000 UTF-16 units; copy/download includes the full bounded
				result.
			</p>{/if}<OutputActions
			text={output}
			filename={format === 'json'
				? 'devbench-dataset.json'
				: 'devbench-' + (csvCollection || collection.name) + '.csv'}
			mime={format === 'json' ? 'application/json' : 'text/csv;charset=utf-8'}
		/>
	</section>
	<p class="tool-help">
		Limits: 5 collections, 24 fields each, 5,000 rows each / 10,000 total, 4 MiB JSON or each CSV.
		Optional fields omit about 10%; nullable generated fields use about 10% null. Unique constraints
		ignore omitted/null values and validate full requested cardinality conservatively. Foreign keys
		target required unique non-null fields; cycles reject. CSV quotes every cell and prefixes
		spreadsheet formula-like cells with an apostrophe, including headers. JSON stays unchanged.
		Structurally valid GTINs for testing only. Valid checksum does not imply GS1 assignment or
		identification of a real product.
	</p>
</section>

<style>
	.dataset {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.dataset-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}
	.dataset-heading h2 {
		font-size: 20px;
		margin: 8px 0;
		letter-spacing: -0.03em;
	}
	.collection-tabs {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.collection-tabs [aria-pressed='true'] {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.schema-panel {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 12px;
		min-width: 0;
	}
	.schema-field {
		border-top: 1px solid var(--color-border);
		padding: 12px 0;
	}
	.schema-field summary {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
		font-size: 13px;
		list-style: revert;
	}
	.field-policy {
		color: var(--color-muted);
		font-size: 11px;
	}
	.field-options {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 14px;
	}
	.field-options label {
		min-width: 140px;
		flex: 1;
	}
	.field-options .wide {
		flex-basis: 100%;
	}
	.field-options .check {
		display: flex;
		flex-direction: row;
		align-items: center;
		min-width: 90px;
		flex: 0;
	}
	.field-options input,
	.field-options select,
	.field-options textarea {
		max-width: 100%;
		width: 100%;
	}
	.field-options input[type='checkbox'] {
		width: auto;
	}
	.dataset :global(.tool-options label) {
		min-width: 0;
	}
	.table-scroll {
		overflow: auto;
		max-height: 310px;
		max-width: 100%;
	}
	.table-scroll table {
		border-collapse: collapse;
		width: 100%;
		font:
			11px 'JetBrains Mono',
			monospace;
	}
	.table-scroll td,
	.table-scroll th {
		border-bottom: 1px solid var(--color-border);
		padding: 9px;
		text-align: left;
		max-width: 240px;
		overflow-wrap: anywhere;
	}
	.dataset :global(.short-editor) {
		min-height: 200px;
	}
	.dataset :global(.section-bar) {
		flex-wrap: wrap;
	}
	.dataset :global(input),
	.dataset :global(select) {
		max-width: 100%;
	}
	@media (max-width: 800px) {
		.dataset-heading {
			align-items: start;
			flex-direction: column;
		}
		.schema-field summary {
			flex-wrap: wrap;
		}
		.field-options label {
			flex-basis: 100%;
		}
		.dataset :global(.tool-options) {
			gap: 12px;
		}
		.dataset :global(button) {
			min-height: 44px;
		}
		.dataset :global(.tool-options label) {
			max-width: 100%;
		}
		.dataset :global(.section-bar span) {
			overflow-wrap: anywhere;
		}
	}
</style>
