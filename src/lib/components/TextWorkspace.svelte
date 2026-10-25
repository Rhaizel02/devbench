<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import { ArrowRight, RotateCcw, FlaskConical, ArrowLeftRight, ShieldCheck } from '@lucide/svelte';
	import CodeEditor from './CodeEditor.svelte';
	import OutputActions from './OutputActions.svelte';
	import { errorMessage } from '#lib/tools/tool-errors.js';
	let {
		input = $bindable(''),
		transform,
		revision = '',
		sample = '',
		action = 'Convert',
		inputLabel = 'Input',
		outputLabel = 'Output',
		filename = 'devbench-output.txt',
		inputLanguage = 'plain',
		outputLanguage = 'plain',
		options,
		help,
		onSwap,
		allowEmpty = false,
		inputLimitLabel = '1 MiB limit'
	}: {
		input?: string;
		transform: (input: string) => string | Promise<string>;
		revision?: string;
		sample?: string;
		action?: string;
		inputLabel?: string;
		outputLabel?: string;
		filename?: string;
		inputLanguage?: 'plain' | 'json' | 'yaml' | 'sql' | 'typescript' | 'java';
		outputLanguage?: 'plain' | 'json' | 'yaml' | 'sql' | 'typescript' | 'java';
		options?: Snippet;
		help?: Snippet;
		onSwap?: () => void;
		allowEmpty?: boolean;
		inputLimitLabel?: string;
	} = $props();
	const id = $props.id();
	let result = $state<{ input: string; revision: string; output: string } | null>(null);
	let error = $state('');
	let errorInput = $state('');
	let errorRevision = $state('');
	let busy = $state(false);
	let tab = $state<'input' | 'output'>('input');
	let operation = 0;
	let disposed = false;
	const current = $derived(result?.input === input && result.revision === revision ? result : null);
	const currentError = $derived(errorInput === input && errorRevision === revision ? error : '');
	const stale = $derived(result !== null && !current);
	onDestroy(() => {
		disposed = true;
		operation++;
		result = null;
	});
	async function run() {
		const ticket = ++operation;
		const snapshot = input;
		const settings = revision;
		error = '';
		busy = true;
		try {
			const output = await transform(snapshot);
			if (ticket !== operation || disposed || input !== snapshot || revision !== settings) return;
			result = { input: snapshot, revision: settings, output };
			tab = 'output';
		} catch (reason) {
			if (ticket !== operation || disposed) return;
			result = null;
			error = errorMessage(reason);
			errorInput = snapshot;
			errorRevision = settings;
		} finally {
			if (ticket === operation && !disposed) busy = false;
		}
	}
	function reset() {
		operation++;
		input = '';
		result = null;
		error = '';
		busy = false;
		tab = 'input';
	}
	function example() {
		reset();
		input = sample;
	}
	function swap() {
		if (!current || !onSwap) return;
		input = current.output;
		result = null;
		error = '';
		onSwap();
		tab = 'input';
	}
	function tabKey(event: KeyboardEvent) {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		tab =
			event.key === 'Home'
				? 'input'
				: event.key === 'End'
					? 'output'
					: tab === 'input'
						? 'output'
						: 'input';
		document.getElementById(id + '-tab-' + tab)?.focus();
	}
</script>

<div class="studio">
	{#if options}<div class="tool-options">{@render options()}</div>{/if}
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" disabled={busy || (!allowEmpty && !input.trim())} onclick={run}
				><ArrowRight size={15} />{busy ? 'Processing…' : action}</button
			>{#if onSwap}<button class="button" disabled={!current || busy} onclick={swap}
					><ArrowLeftRight size={14} />Use output as input</button
				>{/if}
		</div>
		<div class="action-group secondary-actions">
			<button class="text-button" onclick={example}
				><FlaskConical size={14} />Load synthetic example</button
			><button class="text-button" onclick={reset}><RotateCcw size={14} />Reset</button>
		</div>
	</div>
	<div class="mobile-tabs" role="tablist" aria-label="Workspace panels">
		<button
			id={id + '-tab-input'}
			role="tab"
			aria-controls={id + '-input'}
			aria-selected={tab === 'input'}
			tabindex={tab === 'input' ? 0 : -1}
			onclick={() => (tab = 'input')}
			onkeydown={tabKey}>Input</button
		><button
			id={id + '-tab-output'}
			role="tab"
			aria-controls={id + '-output'}
			aria-selected={tab === 'output'}
			tabindex={tab === 'output' ? 0 : -1}
			onclick={() => (tab = 'output')}
			onkeydown={tabKey}>Output</button
		>
	</div>
	<div class="editor-split">
		<div
			id={id + '-input'}
			class="editor-panel"
			class:mobile-hidden={tab !== 'input'}
			role="tabpanel"
			aria-labelledby={id + '-tab-input'}
		>
			<div class="editor-panel-header">
				<h2>{inputLabel}</h2>
				<span class="subtle-tag">{inputLimitLabel}</span>
			</div>
			{#key inputLanguage}<CodeEditor
					bind:value={input}
					label={inputLabel}
					language={inputLanguage}
				/>{/key}{#if currentError}<div class="parse-error" role="alert">{currentError}</div>{/if}
		</div>
		<div
			id={id + '-output'}
			class="editor-panel output-panel"
			class:mobile-hidden={tab !== 'output'}
			role="tabpanel"
			aria-labelledby={id + '-tab-output'}
		>
			<div class="editor-panel-header">
				<h2>{outputLabel}</h2>
				{#if current}<span class="valid-label">Current result</span>{/if}
			</div>
			<div class="output-body">
				{#if current}{#key outputLanguage}<CodeEditor
							value={current.output}
							readonly
							label={outputLabel}
							language={outputLanguage}
						/>{/key}{:else}<div class="output-empty">
						<h3>{stale ? 'Input or options have changed' : 'Ready when you are.'}</h3>
						<p>
							{stale
								? 'Run the action again to create a current result.'
								: 'Enter text and choose an action. Your result will appear here.'}
						</p>
					</div>{/if}
			</div>
			<OutputActions text={current?.output ?? null} {filename} />
		</div>
	</div>
	{#if help}<div class="tool-help">{@render help()}</div>{/if}
	<div class="studio-footer">
		<span><ShieldCheck size={13} />Runs locally. Inputs aren't uploaded or saved.</span>
	</div>
</div>
