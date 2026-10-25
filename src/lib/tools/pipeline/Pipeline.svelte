<script lang="ts">
	import { onDestroy } from 'svelte';
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import {
		operations,
		pipelineRecipe,
		type PipelineStep,
		type PipelineResult,
		type Operation
	} from './pipeline-engine';
	import { startPipeline } from './pipeline-client';
	import { ToolError } from '../tool-errors';
	let input = $state('');
	let counter = 1;
	let recipeIndex = $state(0);
	let steps = $state<(PipelineStep & { uid: number })[]>([
		{ uid: 0, operation: 'json-format', indent: 2, padding: true }
	]);
	let report = $state<PipelineResult | null>(null);
	let reportKey = $state('');
	let preview = $state<number | null>(null);
	let running = $state(false);
	let pending: ReturnType<typeof startPipeline> | undefined;
	const revision = $derived(JSON.stringify(steps));
	const key = $derived(JSON.stringify([input, revision]));
	const currentReport = $derived(reportKey === key ? report : null);
	onDestroy(() => pending?.cancel());
	async function transform(text: string) {
		pending?.cancel();
		const snapshot = key;
		preview = null;
		running = true;
		try {
			pending = startPipeline(text, $state.snapshot(steps));
			const result = await pending.promise;
			report = result;
			reportKey = snapshot;
			if (result.output === null) {
				const index = result.steps.findIndex((step) => step.status === 'failed');
				throw new ToolError('Step ' + (index + 1) + ' failed: ' + result.steps[index].error);
			}
			return result.output;
		} finally {
			running = false;
		}
	}
	function reset() {
		pending?.cancel();
		steps = [];
		report = null;
		preview = null;
		running = false;
	}
	function example() {
		steps = pipelineRecipe(recipeIndex).steps.map((step) => ({ ...step, uid: counter++ }));
	}
	function move(index: number, delta: number) {
		const updated = [...steps];
		[updated[index], updated[index + delta]] = [updated[index + delta], updated[index]];
		steps = updated;
	}
</script>

<TextWorkspace
	bind:input
	{transform}
	{revision}
	action="Run pipeline"
	inputLabel="Pipeline input"
	outputLabel="Pipeline output"
	filename="pipeline-output.txt"
	allowEmpty
	onReset={reset}
	onExample={example}
	sample={pipelineRecipe(recipeIndex).input}
>
	{#snippet options()}<label
			>Recipe <select aria-label="Synthetic pipeline recipe" bind:value={recipeIndex}
				><option value={0}>Base64 Decode → JSON Format</option><option value={1}
					>URL Decode → JSON Format</option
				><option value={2}>YAML → JSON → JSONPath Extract</option></select
			></label
		><span class="tool-help">Choose a recipe, then Load synthetic example.</span><button
			class="button"
			disabled={running || steps.length >= 8}
			onclick={() =>
				(steps = [
					...steps,
					{ uid: counter++, operation: 'json-format', indent: 2, padding: true }
				])}>Add step</button
		><button class="button" disabled={!running} onclick={() => pending?.cancel()}
			>Cancel running pipeline</button
		>
		<div class="pipeline-steps" aria-label="Ordered pipeline steps">
			{#each steps as step, index (step.uid)}<div class="pipeline-step">
					<strong>{index + 1}</strong><label
						>Operation <select
							aria-label={'Step ' + (index + 1) + ' operation'}
							bind:value={step.operation}
							>{#each Object.entries(operations) as [operation, label] (operation)}<option
									value={operation as Operation}>{label}</option
								>{/each}</select
						></label
					>{#if step.operation === 'jsonpath'}<label
							>JSONPath <input
								class="field-input"
								aria-label={'Step ' + (index + 1) + ' JSONPath'}
								bind:value={step.query}
							/></label
						>{/if}{#if step.operation === 'json-format'}<label
							>Indent <select
								aria-label={'Step ' + (index + 1) + ' indent'}
								bind:value={step.indent}
								><option value={2}>2 spaces</option><option value={4}>4 spaces</option><option
									value="tab">Tab</option
								></select
							></label
						>{/if}{#if step.operation.startsWith('base64-')}<label
							><input type="checkbox" bind:checked={step.urlSafe} />URL-safe</label
						><label
							><input type="checkbox" bind:checked={step.padding} />{step.operation ===
							'base64-encode'
								? 'Include padding'
								: 'Require padding'}</label
						>{/if}<button
						class="text-button"
						aria-label={'Move step ' + (index + 1) + ' up'}
						disabled={index === 0 || running}
						onclick={() => move(index, -1)}>↑</button
					><button
						class="text-button"
						aria-label={'Move step ' + (index + 1) + ' down'}
						disabled={index === steps.length - 1 || running}
						onclick={() => move(index, 1)}>↓</button
					><button
						class="text-button"
						aria-label={'Remove step ' + (index + 1)}
						disabled={running}
						onclick={() => (steps = steps.filter((item) => item.uid !== step.uid))}>Remove</button
					>
				</div>{/each}
		</div>{/snippet}
	{#snippet help()}{#if currentReport}<section
				class="result-section"
				aria-label="Pipeline step results"
			>
				<h2>Step results</h2>
				{#each currentReport.steps as step, index (index)}<div class="section-bar">
						<span>Step {index + 1} · {operations[step.operation]} · {step.status}</span
						>{#if step.status === 'success'}<button
								class="text-button"
								onclick={() => (preview = preview === index ? null : index)}
								>Preview step {index + 1}</button
							>{/if}{#if step.error}<p class="parse-error">{step.error}</p>{/if}
					</div>{/each}{#if preview !== null && currentReport.steps[preview]?.output !== undefined}<div
						class="editor-panel short-editor"
					>
						<CodeEditor
							value={currentReport.steps[preview].output!}
							readonly
							label={'Intermediate step ' + (preview + 1)}
							language="plain"
						/>
					</div>{/if}
			</section>{/if}
		<p>
			Linear local transformations only. Execute manually; no scripts, branches, loops, network or
			saved recipes. 1–8 steps, 1 MiB input and each intermediate/final output, 4 MiB cumulative
			input/output, 1.5-second interruptible worker deadline. Stops at the first failure and marks
			later steps not run. JSON uses the bounded query engine shape limits and native number
			precision. Base64 decodes UTF-8 and ignores ASCII whitespace; padding policy is explicit. URL
			component decoding keeps + literal. YAML aliases/custom tags and unsupported types reject.
			Intermediate previews appear only on request. Reset clears input, steps, results and previews.
		</p>{/snippet}
</TextWorkspace>

<style>
	.pipeline-steps {
		width: 100%;
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	.pipeline-step {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 12px;
		padding: 12px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		min-width: 0;
	}
	.pipeline-step input,
	.pipeline-step select {
		max-width: 100%;
	}
	.pipeline-step label {
		min-width: 0;
	}
</style>
