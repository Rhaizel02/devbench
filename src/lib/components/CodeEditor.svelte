<script lang="ts">
	import { onMount } from 'svelte';
	import type { EditorView } from '@codemirror/view';
	let {
		value = $bindable(''),
		readonly = false,
		label,
		wrap = true,
		language = 'json'
	}: {
		value?: string;
		readonly?: boolean;
		label: string;
		wrap?: boolean;
		language?: 'json' | 'yaml' | 'sql' | 'typescript' | 'java' | 'plain';
	} = $props();
	const editorId = $props.id();
	let host: HTMLDivElement;
	let view: EditorView | undefined;
	let ready = $state(false);
	let failed = $state(false);
	let wrapChange: ((enabled: boolean) => void) | undefined;
	$effect(() => {
		const next = value;
		if (ready && view && view.state.doc.toString() !== next)
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
	});
	$effect(() => {
		wrapChange?.(wrap);
	});
	onMount(() => {
		let disposed = false;
		void Promise.all([
			import('@codemirror/view'),
			import('@codemirror/state'),
			import('@codemirror/commands'),
			language === 'json'
				? import('@codemirror/lang-json').then((module) => module.json())
				: language === 'yaml'
					? import('@codemirror/lang-yaml').then((module) => module.yaml())
					: language === 'sql'
						? import('@codemirror/lang-sql').then((module) => module.sql())
						: language === 'typescript'
							? import('@codemirror/lang-javascript').then((module) =>
									module.javascript({ typescript: true })
								)
							: language === 'java'
								? import('@codemirror/lang-java').then((module) => module.java())
								: Promise.resolve(null),
			import('@codemirror/language'),
			import('@codemirror/search'),
			import('@lezer/highlight')
		])
			.then(([v, s, c, j, l, search, highlight]) => {
				if (disposed) return;
				const wrapping = new s.Compartment();
				view = new v.EditorView({
					parent: host,
					state: s.EditorState.create({
						doc: value,
						extensions: [
							v.lineNumbers(),
							v.highlightActiveLineGutter(),
							v.highlightSpecialChars(),
							c.history(),
							v.drawSelection(),
							v.keymap.of([
								...c.defaultKeymap,
								...c.historyKeymap,
								...search.searchKeymap,
								...l.foldKeymap
							]),
							l.syntaxHighlighting(
								l.HighlightStyle.define([
									{ tag: highlight.tags.string, color: 'var(--syntax-string)' },
									{ tag: highlight.tags.propertyName, color: 'var(--color-text)' },
									{ tag: highlight.tags.number, color: 'var(--syntax-number)' },
									{
										tag: [highlight.tags.bool, highlight.tags.null],
										color: 'var(--syntax-literal)'
									}
								])
							),
							j ?? [],
							l.bracketMatching(),
							search.highlightSelectionMatches(),
							v.EditorView.contentAttributes.of({
								'aria-label': label,
								'aria-multiline': 'true',
								spellcheck: 'false'
							}),
							s.EditorState.readOnly.of(readonly),
							v.EditorView.editable.of(!readonly),
							wrapping.of(wrap ? v.EditorView.lineWrapping : []),
							v.EditorView.updateListener.of((update) => {
								if (update.docChanged && !readonly) value = update.state.doc.toString();
							}),
							v.EditorView.theme({
								'&': {
									height: '100%',
									fontSize: '13px',
									backgroundColor: 'var(--color-panel)',
									color: 'var(--color-text)'
								},
								'.cm-scroller': {
									fontFamily: '"JetBrains Mono", monospace',
									lineHeight: '1.8',
									overflow: 'auto'
								},
								'.cm-content': { padding: '16px 0', caretColor: 'var(--color-accent)' },
								'.cm-gutters': {
									backgroundColor: 'var(--color-panel)',
									color: 'var(--color-muted)',
									borderRight: '1px solid var(--color-border)'
								},
								'.cm-activeLineGutter': { backgroundColor: 'var(--color-raised)' },
								'.cm-cursor': { borderLeftColor: 'var(--color-accent)' },
								'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
									backgroundColor: 'var(--color-selection)'
								},
								'.cm-searchMatch': {
									backgroundColor: 'var(--color-selection)',
									outline: '1px solid var(--color-accent)'
								},
								'.cm-panels': { backgroundColor: 'var(--color-raised)', color: 'var(--color-text)' }
							})
						]
					})
				});
				wrapChange = (enabled) =>
					view?.dispatch({
						effects: wrapping.reconfigure(enabled ? v.EditorView.lineWrapping : [])
					});
				ready = true;
			})
			.catch(() => {
				if (!disposed) failed = true;
			});
		return () => {
			disposed = true;
			ready = false;
			view?.destroy();
			view = undefined;
			wrapChange = undefined;
		};
	});
</script>

<div class="code-editor" bind:this={host} class:editor-loading={!ready}>
	{#if !ready}<div class="editor-fallback">
			<label for={editorId}
				>{failed ? 'Code editor unavailable. Plain text mode is active.' : 'Loading editor…'}</label
			><textarea id={editorId} aria-label={label} bind:value {readonly} spellcheck="false"
			></textarea>
		</div>{/if}
</div>
