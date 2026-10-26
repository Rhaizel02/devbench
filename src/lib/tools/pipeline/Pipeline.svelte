<script lang="ts">
	import { onDestroy } from 'svelte';
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import {
		operations,
		pipelineRecipe,
		parseRecipe,
		exportRecipe,
		type PipelineStep,
		type PipelineResult,
		type Operation
	} from './pipeline-engine';
	import { startPipeline } from './pipeline-client';
	import { errorMessage } from '../tool-errors';
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

	let recipeName = $state('Untitled recipe'),
		description = $state(''),
		recipeFeedback = $state(''),
		recipeError = $state(''),
		activeStep = $state<number | null>(null),
		runKey = '';
	const configuration = $derived.by(() => {
		try {
			return exportRecipe(recipeName, description, steps);
		} catch {
			return null;
		}
	});
	$effect(() => {
		const latest = key;
		if (running && latest !== runKey) pending?.cancel();
	});
	function loadRecipe() {
		example();
		report = null;
		preview = null;
		recipeName = ['Base64 JSON', 'URL JSON', 'YAML names', 'Text cleanup', 'Extract JSON items'][
			recipeIndex
		];
		description = 'Local synthetic recipe; input is kept until you explicitly load its example.';
	}
	function duplicateStep(index: number) {
		if (steps.length >= 8) return;
		steps = [
			...steps.slice(0, index + 1),
			{ ...steps[index], uid: counter++ },
			...steps.slice(index + 1)
		];
	}
	function changeOperation(index: number, operation: Operation) {
		steps = steps.map((step, i) =>
			i === index
				? {
						uid: step.uid,
						enabled: step.enabled,
						operation,
						...(operation === 'json-format' ? { indent: 2 as const } : {}),
						...(operation === 'text-case' ? { casing: 'lower' as const } : {})
					}
				: step
		);
	}
	async function importRecipe(event: Event) {
		const control = event.currentTarget as HTMLInputElement,
			file = control.files?.[0];
		if (!file) return;
		try {
			if (file.size > 64 * 1024) throw new ToolError('Recipe file exceeds 64 KiB.');
			const next = parseRecipe(await file.text());
			recipeName = next.name;
			description = next.description;
			steps = next.steps.map((step) => ({ ...step, uid: counter++ }));
			report = null;
			preview = null;
			recipeError = '';
			recipeFeedback = 'Configuration imported. Input stays in memory and is unchanged.';
		} catch (error) {
			recipeError = errorMessage(error);
		} finally {
			control.value = '';
		}
	}
	async function recipeAction(copy: boolean) {
		if (!configuration) return;
		try {
			if (copy) await navigator.clipboard.writeText(configuration);
			else {
				const url = URL.createObjectURL(new Blob([configuration], { type: 'application/json' }));
				const a = document.createElement('a');
				a.href = url;
				a.download = 'devbench-recipe.json';
				a.click();
				setTimeout(() => URL.revokeObjectURL(url), 1000);
			}
			recipeError = '';
			recipeFeedback = copy
				? 'Recipe copied (configuration only).'
				: 'Recipe download started (configuration only).';
		} catch {
			recipeError = copy
				? 'Clipboard blocked. Use recipe download.'
				: 'Recipe download could not start.';
		}
	}
	let dragged: number | null = null;
	function drop(index: number) {
		if (dragged === null || dragged === index) return;
		const next = [...steps],
			item = next.splice(dragged, 1)[0];
		next.splice(index, 0, item);
		steps = next;
		dragged = null;
	}
	onDestroy(() => pending?.cancel());
	async function transform(text: string) {
		pending?.cancel();
		const snapshot = key;
		runKey = snapshot;
		activeStep = null;
		preview = null;
		running = true;
		try {
			pending = startPipeline(text, $state.snapshot(steps), (index) => (activeStep = index));
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
			activeStep = null;
		}
	}
	function reset() {
		pending?.cancel();
		steps = [];
		recipeName = 'Untitled recipe';
		description = '';
		recipeFeedback = '';
		recipeError = '';
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

<div class="pipeline-workspace">
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
					><option value={2}>YAML → JSON → JSONPath Extract</option><option value={3}
						>Text cleanup</option
					><option value={4}>JSON → Extract items → Minify</option></select
				></label
			><span class="tool-help"
				>Preview the steps with Load recipe. Load synthetic example also replaces the input.</span
			><button class="button" onclick={loadRecipe}>Load recipe</button><button
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
			<details class="recipe-configuration">
				<summary>Recipe configuration · import / export</summary>
				<div class="tool-options">
					<label
						>Name<input
							class="field-input"
							aria-label="Recipe name"
							maxlength="80"
							bind:value={recipeName}
						/></label
					><label
						>Description<input
							class="field-input"
							aria-label="Recipe description"
							maxlength="600"
							bind:value={description}
						/></label
					><label
						>Import JSON<input
							type="file"
							aria-label="Import recipe JSON"
							accept=".json,application/json"
							onchange={importRecipe}
						/></label
					><button class="button" disabled={!configuration} onclick={() => recipeAction(true)}
						>Copy recipe</button
					><button class="button" disabled={!configuration} onclick={() => recipeAction(false)}
						>Download recipe</button
					><button
						class="button"
						onclick={() => {
							recipeName = recipeName.slice(0, 73) + ' copy';
							steps = steps.map((step) => ({ ...step, uid: counter++ }));
							recipeFeedback = 'Recipe duplicated in this session; no payload is stored.';
						}}>Duplicate recipe</button
					>
				</div>
				<p class="tool-help">
					Version 1 configuration only. No input, results or automatic persistence. Maximum 8 steps
					/ 64 KiB.
				</p>
			</details>
			{#if recipeError}<p class="parse-error" role="alert">{recipeError}</p>{/if}
			<p class="tool-help" role="status">{recipeFeedback}</p>
			<div class="pipeline-steps" aria-label="Ordered pipeline steps">
				{#each steps as step, index (step.uid)}<!-- svelte-ignore a11y_no_static_element_interactions (Accessible move up/down alternatives are adjacent.) -->
					<div
						class="pipeline-step"
						class:step-disabled={step.enabled === false}
						class:step-active={running && activeStep === index}
						ondragover={(e) => e.preventDefault()}
						ondrop={() => drop(index)}
					>
						<button
							class="step-grip"
							draggable="true"
							ondragstart={() => (dragged = index)}
							ondragend={() => (dragged = null)}
							aria-label={'Drag step ' + (index + 1)}
							title="Drag to reorder; keyboard users can use Move up/down">⠿</button
						>
						<strong>{index + 1}</strong><label
							>Operation <select
								aria-label={'Step ' + (index + 1) + ' operation'}
								value={step.operation}
								onchange={(event) => changeOperation(index, event.currentTarget.value as Operation)}
								>{#each Object.entries(operations) as [operation, label] (operation)}<option
										value={operation as Operation}>{label}</option
									>{/each}</select
							></label
						><label class="step-toggle"
							><input
								type="checkbox"
								aria-label={'Enable step ' + (index + 1)}
								checked={step.enabled !== false}
								onchange={(event) => (step.enabled = event.currentTarget.checked)}
							/>Enabled</label
						>{#if running && activeStep === index}<span role="status">Running…</span
							>{/if}{#if step.operation === 'jsonpath'}<label
								>JSONPath <input
									class="field-input"
									aria-label={'Step ' + (index + 1) + ' JSONPath'}
									bind:value={step.query}
								/></label
							>{/if}{#if step.operation === 'jsonpath'}<label
								><input type="checkbox" bind:checked={step.unwrap} />Unwrap one match</label
							>{/if}{#if step.operation === 'text-case'}<label
								>Case<select aria-label={'Step ' + (index + 1) + ' case'} bind:value={step.casing}
									><option value="lower">Lowercase</option><option value="upper">Uppercase</option
									></select
								></label
							>{/if}{#if step.operation === 'text-replace'}<label
								>Find literal<input
									class="field-input"
									aria-label={'Step ' + (index + 1) + ' find'}
									bind:value={step.find}
									maxlength="2048"
								/></label
							><label
								>Replace with<input
									class="field-input"
									aria-label={'Step ' + (index + 1) + ' replacement'}
									bind:value={step.replacement}
									maxlength="2048"
								/></label
							>{/if}{#if step.operation === 'json-format' || step.operation === 'xml-format'}<label
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
							aria-label={'Duplicate step ' + (index + 1)}
							disabled={steps.length >= 8}
							onclick={() => duplicateStep(index)}>Duplicate</button
						><button
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
				Linear local transformations only. Execute manually; no scripts, branches, loops or network.
				Recipes are configuration-only files, explicitly exported/imported. 1–8 steps, 1 MiB input
				and each intermediate/final output, 4 MiB cumulative input/output, 1.5-second interruptible
				worker deadline. Stops at the first failure and marks later steps not run. JSON uses the
				bounded query engine shape limits and native number precision. Base64 decodes UTF-8 and
				ignores ASCII whitespace; padding policy is explicit. URL component decoding keeps +
				literal. YAML aliases/custom tags and unsupported types reject. Literal replace never
				evaluates regex. XML operations preserve text and reject DTD/entities. Intermediate previews
				appear only on request. Reset clears input, steps, results and previews.
			</p>{/snippet}
	</TextWorkspace>
</div>

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
	.recipe-configuration {
		width: 100%;
		border: 1px solid var(--color-border);
		padding: 10px;
		border-radius: 6px;
	}
	.recipe-configuration summary {
		cursor: pointer;
		font-size: 12px;
	}
	.step-disabled {
		opacity: 0.65;
	}
	.step-active {
		border-color: var(--color-accent);
	}
	.step-grip {
		cursor: grab;
		min-width: 36px;
		min-height: 36px;
	}
	.pipeline-step input {
		max-width: 100%;
	}
	.pipeline-step .step-toggle {
		flex-direction: row;
		align-items: center;
	}
	.pipeline-step strong {
		font-family: 'JetBrains Mono', monospace;
		color: var(--color-accent);
	}
	@media (max-width: 600px) {
		.pipeline-step {
			gap: 10px;
		}
		.pipeline-step button {
			min-height: 44px;
		}
		.recipe-configuration input {
			max-width: 100%;
		}
		.recipe-configuration label {
			width: 100%;
		}
	}
	.pipeline-workspace {
		min-width: 0;
	}
	.pipeline-workspace :global(.editor-split) {
		min-height: 330px;
		height: 380px;
	}
	.pipeline-workspace :global(.short-editor) {
		min-height: 160px;
		height: 180px;
	}
	@media (min-width: 1200px) {
		.pipeline-workspace :global(.studio) {
			display: grid;
			grid-template-columns: 330px minmax(0, 1fr);
			gap: 16px;
			align-items: start;
		}
		.pipeline-workspace :global(.studio > .tool-options) {
			grid-column: 1;
			grid-row: 1/4;
			max-height: calc(100dvh - 210px);
			overflow: auto;
			align-content: start;
			padding-right: 6px;
		}
		.pipeline-workspace :global(.studio > .studio-actions) {
			grid-column: 2;
			grid-row: 1;
		}
		.pipeline-workspace :global(.studio > .editor-split) {
			grid-column: 2;
			grid-row: 2;
		}
		.pipeline-workspace :global(.studio > .tool-help) {
			grid-column: 2;
			grid-row: 3;
		}
		.pipeline-workspace :global(.studio > .studio-footer) {
			grid-column: 1/-1;
		}
		.pipeline-step {
			gap: 8px;
		}
		.pipeline-step > label:not(.step-toggle) {
			flex: 1;
			min-width: 170px;
		}
		.recipe-configuration .tool-options > label {
			display: flex;
			flex-direction: column;
			align-items: start;
			width: 100%;
		}
	}
</style>
