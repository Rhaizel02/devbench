<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { FolderOpen, Plus, Upload, RefreshCw } from '@lucide/svelte';
	import { emptyProject, newId, LIMITS, type Project } from './model';
	import { parseProject } from './serialization';
	import { verifyProjectImages } from './images';
	import {
		CanvasStorage,
		openCanvasDatabase,
		createAutosaver,
		type SaveState,
		type StoredProject
	} from './persistence';
	let {
		project,
		onOpen,
		onRename,
		onReady
	}: {
		project: Project;
		onOpen: (project: Project) => void;
		onRename: (title: string) => void;
		onReady: () => void;
	} = $props();
	let store: CanvasStorage | undefined,
		loaded: Project | undefined,
		disposed = false,
		skipNext = false,
		navigating = false;
	let ready = $state(false),
		saveState = $state<SaveState>('unsaved'),
		message = $state('Opening local Canvas storage…'),
		rows = $state<StoredProject[]>([]),
		working = $state(false),
		newTitle = $state('Untitled board');
	let actionMessage = $state('');
	const app = useAppState();
	let dialog = $state<HTMLDialogElement>(),
		trigger: HTMLButtonElement;
	const saver = createAutosaver(
		async (value) => {
			if (!store) throw new Error('Storage unavailable.');
			await store.save(value);
			if (!disposed) rows = await store.list();
		},
		(next, error) => {
			if (!disposed) {
				saveState = next;
				message =
					error ??
					(next === 'saved'
						? 'Saved in this browser'
						: next === 'saving'
							? 'Saving…'
							: 'Unsaved changes');
			}
		}
	);
	$effect(() => {
		const value = project;
		if (ready && store && value !== loaded) saver.schedule(value);
	});
	async function initialize(first = true) {
		working = true;
		try {
			const previous = store;
			store?.close();
			store = undefined;
			const db = await openCanvasDatabase();
			if (disposed) {
				db.close();
				return;
			}
			store = previous ? previous.reopen(db) : new CanvasStorage(db);
			rows = await store.list();
			if (first && rows.length) {
				const loaded = await store.load(rows[0].id);
				await verifyProjectImages(loaded);
				if (!disposed) acceptLoaded(loaded);
			}
			if (!disposed) {
				ready = true;
				onReady();
				if (!first) {
					saver.schedule(project);
					await saver.flush();
				}
			}
		} catch {
			if (!disposed) {
				store?.close();
				store = undefined;
				saveState = 'error';
				message =
					'Local Canvas storage is unavailable or a saved project cannot be read. Your open board stays in memory. Retry or export a rescue JSON.';
				ready = true;
				onReady();
			}
		} finally {
			if (!disposed) working = false;
		}
	}
	onMount(() => {
		app.canvasSave = async () => {
			await tick();
			return ready && !working && !!store && (await saver.flush());
		};
		void initialize();
		return () => {
			app.canvasSave = undefined;
		};
	});
	async function show() {
		dialog?.showModal();
		await tick();
	}
	function close() {
		dialog?.close();
		trigger?.focus();
	}
	async function run(operation: () => Promise<void>) {
		if (working) return;
		working = true;
		actionMessage = '';
		try {
			await operation();
		} catch (reason) {
			actionMessage =
				reason instanceof Error ? reason.message : 'Project action failed. Export a rescue JSON.';
		} finally {
			working = false;
		}
	}
	function acceptLoaded(next: Project) {
		loaded = next;
		onOpen(next);
		saveState = 'saved';
		message = 'Saved in this browser';
	}
	async function safeSwitch(next: Project, existing = false) {
		if (!(await saver.flush()))
			throw new Error(
				'Current changes are not saved. Retry or export a rescue JSON before switching projects.'
			);
		if (existing) acceptLoaded(next);
		else {
			loaded = undefined;
			onOpen(next);
		}
		close();
	}
	async function create() {
		await run(async () => {
			if (rows.length >= 20)
				throw new Error('Local project limit: 20. Export/delete a project first.');
			await safeSwitch(
				emptyProject(
					newId('project'),
					newId('diagram'),
					newTitle.trim().slice(0, 200) || 'Untitled board'
				)
			);
		});
	}
	async function open(id: string) {
		await run(async () => {
			if (!store) throw new Error('Storage unavailable. Retry or use rescue export.');
			const next = await store.load(id);
			await verifyProjectImages(next);
			await safeSwitch(next, true);
		});
	}
	async function remove(id: string) {
		if (
			!confirm(
				'Delete this Canvas project from this browser? Export a JSON copy first if you need to keep it.'
			)
		)
			return;
		await run(async () => {
			if (!store) throw new Error('Storage unavailable.');
			if (!(await saver.flush()))
				throw new Error('Save pending changes or export a rescue copy first.');
			await store.remove(id);
			rows = await store.list();
			if (id === project.id) {
				const next = rows.length
					? await store.load(rows[0].id)
					: emptyProject(newId('project'), newId('diagram'));
				await verifyProjectImages(next);
				if (rows.length) acceptLoaded(next);
				else {
					loaded = undefined;
					onOpen(next);
				}
			}
		});
	}
	async function importFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement,
			file = input.files?.[0];
		if (!file) return;
		await run(async () => {
			if (file.size > LIMITS.bytes) throw new Error('Import limit: 16 MiB (legacy v1/v2: 8 MiB).');
			if (rows.length >= 20) throw new Error('Local project limit: 20.');
			const imported = parseProject(await file.text());
			await verifyProjectImages(imported);
			const next = { ...imported, id: newId('project') };
			await safeSwitch(next);
		});
		input.value = '';
	}
	function rescue(row: StoredProject, original = false) {
		const url = URL.createObjectURL(
			new Blob([original ? (row.originalJson ?? row.json) : row.json], { type: 'application/json' })
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = original ? 'canvas-original-backup.json' : 'canvas-saved-backup.json';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		actionMessage = 'Saved backup download requested.';
	}
	beforeNavigate((navigation) => {
		if (skipNext) {
			skipNext = false;
			return;
		}
		if (!saver.dirty || navigation.willUnload) return;
		navigation.cancel();
		if (navigating) return;
		navigating = true;
		// Kit counteracts a cancelled popstate with history.go; wait for that restoration.
		const restored =
			navigation.type === 'popstate'
				? new Promise<void>((resolve) =>
						window.addEventListener('popstate', () => resolve(), { once: true })
					)
				: Promise.resolve();
		void Promise.all([saver.flush(), restored])
			.then(async ([ok]) => {
				if (
					!ok &&
					!confirm('Autosave failed. Export a rescue JSON before leaving. Leave without saving?')
				)
					return;
				if (navigation.to) {
					skipNext = true;
					if (navigation.type === 'popstate') {
						window.history.go(navigation.delta);
						return;
					}
					// eslint-disable-next-line svelte/no-navigation-without-resolve -- SvelteKit already resolved this same-app navigation destination.
					await goto(navigation.to.url);
				}
			})
			.finally(() => {
				navigating = false;
			});
	});
	function beforeUnload(event: BeforeUnloadEvent) {
		if (saver.dirty) {
			void saver.flush();
			event.preventDefault();
			event.returnValue = '';
		}
	}
	onDestroy(() => {
		disposed = true;
		void saver.dispose().finally(() => store?.close());
	});
</script>

<svelte:window onbeforeunload={beforeUnload} />
<div class="project-controls">
	<button class="button" bind:this={trigger} onclick={show}><FolderOpen size={15} />Projects</button
	><span
		class:error={saveState === 'error'}
		aria-live="polite"
		data-save-state={ready ? saveState : 'loading'}>{message}</span
	>{#if saveState === 'error'}<button
			class="button"
			disabled={working}
			onclick={() => initialize(false)}><RefreshCw size={14} />Retry storage</button
		>{/if}
</div>
<dialog bind:this={dialog} oncancel={() => trigger?.focus()} aria-label="Canvas projects">
	<div class="dialog-heading">
		<h2>Canvas projects</h2>
		<button aria-label="Close projects" onclick={close}>×</button>
	</div>
	<p class="privacy">
		These boards autosave to IndexedDB in this browser only. Canvas is the only DevBench tool that
		stores document content. Export JSON for a portable or rescue copy; browser data can be cleared.
	</p>
	<label
		>Current project name<input
			aria-label="Project name"
			value={project.title}
			maxlength="200"
			onchange={(event) => {
				const value = event.currentTarget.value.trim();
				if (value) onRename(value);
			}}
		/></label
	>
	<div class="new-project">
		<label
			>New board name<input
				aria-label="New board name"
				bind:value={newTitle}
				maxlength="200"
			/></label
		><button class="button primary" onclick={create} disabled={working}
			><Plus size={15} />Create project</button
		>
	</div>
	<label class="import"
		><Upload size={15} />Import project JSON (v1/v2/v3, ≤16 MiB)<input
			aria-label="Import project JSON"
			type="file"
			accept=".json,application/json"
			onchange={importFile}
			disabled={working}
		/></label
	>
	<p class="message" aria-live="polite">{actionMessage || message}</p>
	<div class="project-list">
		{#each rows as row (row.id)}<div class="project-row">
				<button
					disabled={working}
					aria-current={row.id === project.id ? 'true' : undefined}
					onclick={() => open(row.id)}
					>{row.title || 'Untitled board'}<span>{new Date(row.updatedAt).toLocaleString()}</span
					></button
				><button
					class="button"
					aria-label={'Download saved backup ' + row.title}
					onclick={() => rescue(row)}>Backup</button
				>
				{#if row.originalJson}<button class="button" onclick={() => rescue(row, true)}
						>Original</button
					>{/if}<button
					class="button"
					aria-label={'Delete project ' + row.title}
					disabled={working}
					onclick={() => remove(row.id)}>Delete</button
				>
			</div>{:else}<p>No saved projects yet. A failed save never discards the open board.</p>{/each}
	</div>
	<p class="privacy">
		Import creates a new project and preserves its diagram IDs. It never replaces an existing
		project. Up to 20 local projects. Saving waits 600 ms after editing; abrupt process closure
		before a confirmed save may lose the latest edit.
	</p>
</dialog>

<style>
	.project-controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		min-height: 36px;
	}
	.project-controls > span {
		font-size: 11px;
		color: var(--color-muted);
	}
	.project-controls > span.error {
		color: var(--color-error);
	}
	dialog {
		width: min(560px, calc(100vw - 32px));
		max-height: calc(100dvh - 48px);
		overflow: auto;
		padding: 22px;
		color: var(--color-text);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: 0 20px 80px #0005;
	}
	dialog::backdrop {
		background: #0007;
	}
	.dialog-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	.dialog-heading h2 {
		font-size: 19px;
		margin: 0;
	}
	.dialog-heading button {
		font-size: 24px;
		min-width: 36px;
		min-height: 36px;
	}
	.privacy {
		font-size: 12px;
		line-height: 1.6;
		color: var(--color-muted);
		margin: 12px 0;
	}
	label {
		display: flex;
		flex-direction: column;
		font-size: 12px;
		gap: 7px;
		color: var(--color-muted);
	}
	input {
		min-width: 0;
		width: 100%;
		padding: 9px;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		background: var(--color-bg);
		color: var(--color-text);
	}
	.new-project {
		display: flex;
		align-items: end;
		gap: 8px;
		margin: 16px 0;
	}
	.new-project label {
		flex: 1;
	}
	.import {
		border: 1px dashed var(--color-border);
		border-radius: 5px;
		padding: 12px;
	}
	.import input {
		font-size: 11px;
	}
	.message {
		font-size: 12px;
		color: var(--color-accent);
		line-height: 1.6;
	}
	.project-list {
		display: flex;
		flex-direction: column;
		gap: 5px;
		max-height: 260px;
		overflow: auto;
	}
	.project-row {
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid var(--color-border);
		padding: 8px 0;
	}
	.project-row > button:first-child {
		flex: 1;
		min-width: 0;
		text-align: left;
		overflow-wrap: anywhere;
		font-size: 13px;
	}
	.project-row span {
		display: block;
		font-size: 10px;
		color: var(--color-muted);
		margin-top: 5px;
	}
	.project-row [aria-current] {
		color: var(--color-accent);
	}
	@media (max-width: 450px) {
		input,
		.new-project .button,
		.dialog-heading button,
		.project-row button {
			min-height: 44px;
		}
		dialog {
			padding: 16px;
		}
		.new-project {
			align-items: stretch;
			flex-direction: column;
		}
		.project-row .button {
			min-height: 44px;
		}
		.project-controls .button {
			min-height: 44px;
		}
	}
</style>
