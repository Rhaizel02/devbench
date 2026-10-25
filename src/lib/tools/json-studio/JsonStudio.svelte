<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Braces,
		Check,
		AlignLeft,
		Minimize2,
		Copy,
		Download,
		RotateCcw,
		FlaskConical,
		FileCode2,
		Network,
		ShieldCheck,
		AlertCircle
	} from '@lucide/svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import { useAppState } from '#lib/state/app.svelte.js';
	import JsonTree from './JsonTree.svelte';
	import { validateJson, formatJson, minifyJson, type JsonResult } from './json-engine';
	const app = useAppState();
	let input = $state('');
	let result = $state<JsonResult>({ status: 'empty' });
	let indent = $state<2 | 4 | 'tab'>(2);
	let mode = $state<'code' | 'tree'>('code');
	let tab = $state<'input' | 'output'>('input');
	let wrap = $state(true);
	let feedback = $state('');
	let feedbackError = $state(false);
	let processedInput = $state<string | null>(null);
	const current = $derived(processedInput === input && result.status === 'valid' ? result : null);
	const error = $derived(processedInput === input && result.status === 'invalid' ? result : null);
	const bytes = $derived(new TextEncoder().encode(input).length);
	const lines = $derived(input ? input.split('\n').length : 0);
	const output = $derived(current?.output ?? '');
	const stale = $derived(processedInput !== null && processedInput !== input);
	onMount(() => {
		input = app.consumePaste() ?? '';
		return () => {
			input = '';
			result = { status: 'empty' };
			processedInput = null;
		};
	});
	function run(action: 'validate' | 'format' | 'minify') {
		feedback = '';
		result =
			action === 'validate'
				? validateJson(input)
				: action === 'format'
					? formatJson(input, indent)
					: minifyJson(input);
		processedInput = input;
		if (result.status === 'valid') {
			if (action !== 'validate') tab = 'output';
		}
		if (result.status === 'empty') {
			feedback = 'Paste JSON into the input to get started.';
			feedbackError = false;
		}
	}
	async function copy(text: string, message: string) {
		try {
			await navigator.clipboard.writeText(text);
			feedback = message;
			feedbackError = false;
		} catch {
			feedback = 'Could not copy. Select the text and copy it manually.';
			feedbackError = true;
		}
	}
	function download() {
		if (!current) return;
		const url = URL.createObjectURL(
			new Blob([current.output], { type: 'application/json;charset=utf-8' })
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'devbench-output.json';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		feedback = 'Download started';
		feedbackError = false;
	}
	function reset() {
		input = '';
		result = { status: 'empty' };
		processedInput = null;
		feedback = '';
		mode = 'code';
		tab = 'input';
	}
	function example() {
		input = JSON.stringify(
			{
				project: 'DevBench',
				environment: 'synthetic example',
				version: 1,
				features: ['format', 'explore', 'copy'],
				settings: { local: true, region: null },
				greeting: 'Hello, 世界 👋'
			},
			null,
			2
		);
		result = { status: 'empty' };
		processedInput = null;
		feedback = 'Synthetic example loaded';
		feedbackError = false;
		tab = 'input';
	}
	function tabKey(event: KeyboardEvent) {
		if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			tab =
				event.key === 'Home'
					? 'input'
					: event.key === 'End'
						? 'output'
						: tab === 'input'
							? 'output'
							: 'input';
			document.getElementById('tab-' + tab)?.focus();
		}
	}
</script>

<div class="studio">
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" onclick={() => run('format')}
				><AlignLeft size={15} />Format JSON</button
			><button class="button" onclick={() => run('minify')}><Minimize2 size={15} />Minify</button
			><button class="button" onclick={() => run('validate')}><Check size={15} />Validate</button>
		</div>
		<div class="action-group secondary-actions">
			<label class="indent-label"
				>Indent<select aria-label="Indentation" bind:value={indent}
					><option value={2}>2 spaces</option><option value={4}>4 spaces</option><option value="tab"
						>Tab</option
					></select
				></label
			><button class="text-button" onclick={example}
				><FlaskConical size={14} />Load synthetic example</button
			><button class="text-button" onclick={reset}><RotateCcw size={14} />Reset</button>
		</div>
	</div>
	<div class="mobile-tabs" role="tablist" aria-label="Editor panel">
		<button
			role="tab"
			id="tab-input"
			aria-controls="panel-input"
			aria-selected={tab === 'input'}
			tabindex={tab === 'input' ? 0 : -1}
			onclick={() => (tab = 'input')}
			onkeydown={tabKey}>Input</button
		><button
			role="tab"
			id="tab-output"
			aria-controls="panel-output"
			aria-selected={tab === 'output'}
			tabindex={tab === 'output' ? 0 : -1}
			onclick={() => (tab = 'output')}
			onkeydown={tabKey}>Output</button
		>
	</div>
	<div class="editor-split">
		<div
			class="editor-panel"
			class:mobile-hidden={tab !== 'input'}
			id="panel-input"
			role="tabpanel"
			aria-labelledby="tab-input"
		>
			<div class="editor-panel-header">
				<h2 id="input-heading"><Braces size={14} />Input<span class="subtle-tag">JSON</span></h2>
				<label class="wrap-control"><input type="checkbox" bind:checked={wrap} />Wrap</label>
			</div>
			<CodeEditor bind:value={input} label="JSON input" {wrap} />
			{#if error}<div class="parse-error" role="alert">
					<AlertCircle size={17} />
					<div>
						<strong>{error.message}</strong>{#if error.line}<p>
								Line {error.line}, column {error.column}. Check the input around this position.
							</p>{/if}
					</div>
				</div>{/if}
			<div class="editor-panel-footer">
				<span>{bytes.toLocaleString('en-US')} bytes · {lines} lines</span><span>5 MiB limit</span>
			</div>
		</div>
		<div
			class="editor-panel output-panel"
			class:mobile-hidden={tab !== 'output'}
			id="panel-output"
			role="tabpanel"
			aria-labelledby="tab-output"
		>
			<div class="editor-panel-header">
				<h2 id="output-heading">
					Output{#if current}<span class="valid-label"><Check size={11} />Valid JSON</span>{/if}
				</h2>
				<div class="view-switch" aria-label="Output view">
					<button
						aria-pressed={mode === 'code'}
						class:chosen={mode === 'code'}
						onclick={() => (mode = 'code')}><FileCode2 size={13} />Code</button
					><button
						aria-pressed={mode === 'tree'}
						class:chosen={mode === 'tree'}
						onclick={() => (mode = 'tree')}><Network size={13} />Tree</button
					>
				</div>
			</div>
			<div class="output-body">
				{#if current}{#if mode === 'code'}<CodeEditor
							value={output}
							readonly
							label="JSON output"
							{wrap}
						/>{:else}{#key output}<JsonTree
								value={current.value}
								oncopy={copy}
								onerror={(message) => {
									feedback = message;
									feedbackError = true;
								}}
							/>{/key}{/if}{:else}<div class="output-empty">
						<Braces size={34} strokeWidth={1} />
						<h3>
							{stale
								? 'Input has changed'
								: error
									? 'Let’s check that JSON'
									: 'A little clarity, right here.'}
						</h3>
						<p>
							{stale
								? 'Validate, format or minify again to generate a current result.'
								: error
									? 'Fix the input, then run an action again. Your original text is preserved.'
									: 'Paste your JSON and choose an action. The result will appear here.'}
						</p>
					</div>{/if}
			</div>
			<div class="output-actions">
				<span class="mono muted">{current ? 'Current result' : 'No current result'}</span><button
					class="text-button"
					disabled={!current}
					onclick={() => current && copy(current.output, 'Output copied')}
					><Copy size={14} />Copy output</button
				><button class="text-button" disabled={!current} onclick={download}
					><Download size={14} />Download .json</button
				>
			</div>
		</div>
	</div>
	<div class="studio-footer">
		<span><ShieldCheck size={13} />Runs locally in your browser. Inputs aren't uploaded.</span><span
			class:error-message={feedbackError}
			class="feedback"
			role="status"
			aria-live="polite">{feedback}</span
		>
	</div>
</div>
