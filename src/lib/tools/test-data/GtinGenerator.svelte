<script lang="ts">
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import {
		completeGTIN,
		generateGTINBatch,
		validateGTIN,
		exportGTINs,
		type GtinKind
	} from './gtin-engine';
	import { secureRandomIndex } from './random';
	import { errorMessage } from '../tool-errors';
	let kind = $state<GtinKind>('ean13');
	let quantity = $state<number | undefined>(5);
	let prefix = $state('');
	let format = $state<'txt' | 'csv'>('txt');
	let result = $state<string[] | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	let manual = $state('');
	let inspected = $state<{ key: string; valid: boolean; message: string; value: string } | null>(
		null
	);
	const key = $derived(JSON.stringify([kind, quantity, prefix]));
	const current = $derived(key === resultKey ? result : null);
	const exported = $derived(current ? exportGTINs(current, format) : null);
	const manualKey = $derived(JSON.stringify([kind, manual]));
	const validation = $derived(inspected?.key === manualKey ? inspected : null);
	function generate() {
		try {
			result = generateGTINBatch(kind, quantity ?? NaN, prefix, secureRandomIndex);
			resultKey = key;
			error = '';
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
		}
	}
	function inspect(complete: boolean) {
		try {
			const value = complete ? completeGTIN(manual, kind) : manual;
			inspected = { key: manualKey, ...validateGTIN(value, kind), value };
		} catch (reason) {
			inspected = { key: manualKey, valid: false, message: errorMessage(reason), value: '' };
		}
	}
	function reset() {
		kind = 'ean13';
		quantity = 5;
		prefix = '';
		format = 'txt';
		result = null;
		manual = '';
		inspected = null;
		error = '';
	}
	function example() {
		reset();
		prefix = '00';
		manual = '0000000000000';
	}
</script>

<section aria-label="GTIN generator and validator">
	<p class="notice">
		Structurally valid GTINs for testing only. Valid checksum does not imply GS1 assignment or
		identification of a real product.
	</p>
	<div class="tool-options">
		<label
			>Format <select aria-label="GTIN format" bind:value={kind}
				><option value="ean13">EAN-13</option><option value="gtin14">GTIN-14</option></select
			></label
		>
		<label
			>Quantity <input
				class="field-input"
				aria-label="GTIN quantity"
				type="number"
				min="1"
				max="1000"
				step="1"
				bind:value={quantity}
			/></label
		>
		<label
			>Fixed prefix (optional) <input
				class="field-input gtin-prefix"
				aria-label="GTIN prefix"
				inputmode="numeric"
				bind:value={prefix}
			/></label
		>
	</div>
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" onclick={generate}>Generate GTINs</button><button
				class="button"
				disabled={!current}
				onclick={generate}>Regenerate</button
			>
		</div>
		<div class="action-group">
			<button class="text-button" onclick={example}>Load synthetic example</button><button
				class="text-button"
				onclick={reset}>Reset</button
			>
		</div>
	</div>
	{#if error && errorKey === key}<p class="parse-error" role="alert">{error}</p>{/if}
	<div class="editor-panel short-editor gtin-output">
		<div class="editor-panel-header">
			<h2>Generated GTINs</h2>
		</div>
		{#if current}<p class="result-summary" role="status">
				{current.length} unique identifiers
			</p>{/if}
		{#if current}<CodeEditor
				value={exported ?? ''}
				label="Generated GTINs"
				readonly
				language="plain"
			/>{:else}<p class="empty">
				{result
					? 'Options changed. Generate a current batch.'
					: 'Generate a local numeric batch. Up to 1,000 identifiers.'}
			</p>{/if}
		<div class="tool-options export-options">
			<label
				>Export <select aria-label="GTIN export format" bind:value={format}
					><option value="txt">TXT</option><option value="csv">CSV</option></select
				></label
			>
		</div>
		<OutputActions
			text={exported}
			filename={'devbench-gtins.' + format}
			mime={format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'}
		/>
	</div>
	{#if current}<div class="individual-gtins" aria-label="Individual GTIN copy">
			{#each current.slice(0, 20) as value, index (value)}<div class="value-row">
					<code>{value}</code><CopyButton text={value} label={'Copy GTIN ' + (index + 1)} />
				</div>{/each}{#if current.length > 20}<p class="tool-help">
					Individual copy shows the first 20; Copy output and Download include the entire batch.
				</p>{/if}
		</div>{/if}
	<section class="result-section" aria-label="Manual GTIN validation">
		<div class="section-bar"><h2>Validate or complete</h2></div>
		<div class="tool-options manual-gtin">
			<label
				>Digits <input
					class="field-input"
					aria-label="Manual GTIN"
					inputmode="numeric"
					bind:value={manual}
				/></label
			><button class="button" onclick={() => inspect(false)}>Validate GTIN</button><button
				class="button"
				onclick={() => inspect(true)}>Complete check digit</button
			>
		</div>
		{#if validation}<div class="tool-help">
				<p class:error-message={!validation.valid} role={validation.valid ? 'status' : 'alert'}>
					{validation.message}
				</p>
				{#if validation.valid}<div class="value-row">
						<code>{validation.value}</code><CopyButton
							text={validation.value}
							label="Copy validated GTIN"
						/>
					</div>{/if}
			</div>{/if}
	</section>
	<div class="tool-help">
		<p>
			ASCII digits only; no trimming or numeric conversion of identifiers. EAN-13 uses 12 body
			digits plus one GS1 modulo 10 check digit; GTIN-14 uses 13 plus one. Complete check digit
			takes only the body. Optional fixed prefix is a testing constraint, not a GS1 company prefix
			claim. Batches contain 1–1,000 unique identifiers; insufficient suffix space is an error. Web
			Crypto samples without replacement; a fully fixed body has only one possible result.
			Regeneration can overlap earlier batches. TXT/CSV preserve leading zeros as text; import CSV
			columns as text in spreadsheets. No GS1 lookup, allocation checks or barcode images.
		</p>
	</div>
</section>

<style>
	.gtin-output {
		height: 360px;
	}
	.export-options,
	.manual-gtin {
		padding: 12px;
	}
	.gtin-prefix {
		max-width: 180px;
	}
	.individual-gtins {
		max-height: 240px;
		overflow: auto;
		margin-block: 16px;
	}
	code {
		overflow-wrap: anywhere;
	}
</style>
