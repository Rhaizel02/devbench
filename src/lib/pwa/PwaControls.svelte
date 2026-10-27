<script lang="ts">
	import { onMount } from 'svelte';
	import { Download, WifiOff, Check, X, RefreshCw } from '@lucide/svelte';
	import { release } from '#lib/release.js';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { workerMessage, waitForActivation } from './client';
	const app = useAppState();
	type InstallEvent = Event & {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	};
	let open = $state(false),
		supported = $state(false),
		offline = $state(false),
		ready = $state(false),
		preparing = $state(false),
		completed = $state(0),
		total = $state(0),
		bytes = $state(0),
		updateReady = $state(false),
		updateDownloading = $state(false),
		deferred = $state(false),
		confirmUpdate = $state(false),
		applying = $state(false),
		rescue = $state(false),
		standalone = $state(false),
		error = $state(''),
		needsControl = $state(false);
	let installEvent = $state<InstallEvent | null>(null);
	let registration = $state<ServiceWorkerRegistration>();
	let trigger: HTMLButtonElement;
	let disposed = false,
		reloadPending = false;
	const label = $derived(
		!supported
			? 'Offline unavailable'
			: preparing
				? `Preparing ${completed}/${total || '…'}`
				: ready
					? offline
						? 'Offline ready'
						: 'Ready offline'
					: offline
						? 'Offline incomplete'
						: 'Prepare offline'
	);
	async function refresh() {
		const worker = registration?.active;
		if (!worker) return;
		try {
			const status = await workerMessage(worker, 'STATUS', release.sha);
			if (disposed) return;
			completed = status.completed ?? 0;
			total = status.total ?? 0;
			bytes = status.bytes ?? 0;
			needsControl = !!status.ready && !navigator.serviceWorker.controller;
			ready = !!status.ready && !needsControl;
			preparing = false;
		} catch (reason) {
			if (!disposed) error = (reason as Error).message;
		}
	}
	async function detectWaiting() {
		if (!registration?.waiting) return;
		try {
			const status = await workerMessage(registration.waiting, 'STATUS');
			if (!disposed) {
				updateReady = !!status.ready;
				updateDownloading = false;
			}
		} catch {
			/* An incomplete candidate is not offered as an update. */
		}
	}
	function watch(worker: ServiceWorker) {
		updateDownloading = !!registration?.active;
		if (!registration?.active) preparing = true;
		const changed = () => {
			if (disposed) return;
			if (worker.state === 'installed') void detectWaiting();
			if (worker.state === 'activated') {
				void refresh();
				updateDownloading = false;
			}
			if (worker.state === 'redundant') {
				preparing = false;
				updateDownloading = false;
				if (!error)
					error =
						'Offline download did not complete. Your current version is unchanged; retry preparation or check updates.';
			}
		};
		worker.addEventListener('statechange', changed);
		changed();
	}
	function bindRegistration(value: ServiceWorkerRegistration) {
		registration = value;
		registration.onupdatefound = () => {
			if (registration?.installing) watch(registration.installing);
		};
		if (value.installing) watch(value.installing);
		void detectWaiting();
		void refresh();
	}
	async function prepare() {
		error = '';
		preparing = true;
		completed = 0;
		try {
			if (!registration?.active)
				bindRegistration(
					await navigator.serviceWorker.register('/service-worker.js', {
						type: 'module',
						scope: '/',
						updateViaCache: 'none'
					})
				);
			else {
				await workerMessage(registration.active, 'PREPARE');
				await refresh();
			}
		} catch (reason) {
			error = (reason as Error).message;
			preparing = false;
		}
	}
	async function checkUpdates() {
		error = '';
		try {
			await registration?.update();
			await detectWaiting();
		} catch {
			error = 'Could not check updates. Your downloaded version and current work are unchanged.';
		}
	}
	async function safeToReload() {
		rescue = false;
		if (app.canvasEditing?.()) {
			error = 'Finish or cancel the active Canvas gesture or text edit before updating.';
			return false;
		}
		if (app.canvasSave && !(await app.canvasSave())) {
			error =
				'Canvas could not save. Export a rescue JSON and keep working, or retry saving before updating.';
			rescue = true;
			return false;
		}
		return true;
	}
	async function applyUpdate() {
		error = '';
		applying = true;
		try {
			if (!(await safeToReload())) return;
			if (!reloadPending && registration?.waiting) {
				const worker = registration.waiting,
					activated = waitForActivation(worker);
				await workerMessage(worker, 'APPLY');
				await activated;
				reloadPending = true;
			}
			if (!(await safeToReload())) return;
			window.location.reload(); // Sole reload path: explicit acknowledgement + two save checks.
		} catch (reason) {
			error = (reason as Error).message;
		} finally {
			applying = false;
		}
	}
	async function install() {
		const prompt = installEvent;
		if (!prompt) return;
		installEvent = null;
		try {
			await prompt.prompt();
			await prompt.userChoice;
		} catch {
			error = 'Installation was not completed. You can use the browser install menu.';
		}
	}
	function close() {
		open = false;
		trigger?.focus();
	}
	onMount(() => {
		supported = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext;
		offline = !navigator.onLine;
		const media = matchMedia('(display-mode: standalone)');
		const mode = () => {
			standalone =
				media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
		};
		mode();
		media.addEventListener('change', mode);
		const beforeInstall = (event: Event) => {
			event.preventDefault();
			installEvent = event as InstallEvent;
		};
		const installed = () => {
			installEvent = null;
			standalone = true;
		};
		const connectivity = () => {
			offline = !navigator.onLine;
			void refresh();
		};
		const visibility = () => {
			if (document.visibilityState === 'visible') void refresh();
		};
		const message = (event: MessageEvent) => {
			if (event.data?.type === 'DEVBENCH_IDENTIFY') {
				event.ports[0]?.postMessage({ build: release.sha });
				return;
			}
			if (event.data?.type !== 'DEVBENCH_OFFLINE') return;
			if (event.data.error) {
				error = event.data.error;
				preparing = false;
				updateDownloading = false;
			}
			if (event.data.preparing) {
				if (event.data.version === release.sha) {
					preparing = true;
					completed = event.data.completed;
					total = event.data.total;
				} else updateDownloading = true;
			}
			if (event.data.activated || event.data.incomplete) void refresh();
		};
		window.addEventListener('beforeinstallprompt', beforeInstall);
		window.addEventListener('appinstalled', installed);
		window.addEventListener('online', connectivity);
		window.addEventListener('offline', connectivity);
		document.addEventListener('visibilitychange', visibility);
		if (supported) {
			navigator.serviceWorker.addEventListener('message', message);
			navigator.serviceWorker.addEventListener('controllerchange', refresh);
			void navigator.serviceWorker
				.getRegistration('/')
				.then((value) => {
					if (disposed || !value) return;
					bindRegistration(value);
					if (navigator.onLine) void value.update().catch(() => {});
				})
				.catch(() => {
					error = 'Offline registration is unavailable in this browser.';
				});
		}
		return () => {
			disposed = true;
			if (registration) registration.onupdatefound = null;
			media.removeEventListener('change', mode);
			window.removeEventListener('beforeinstallprompt', beforeInstall);
			window.removeEventListener('appinstalled', installed);
			window.removeEventListener('online', connectivity);
			window.removeEventListener('offline', connectivity);
			document.removeEventListener('visibilitychange', visibility);
			if (supported) {
				navigator.serviceWorker.removeEventListener('message', message);
				navigator.serviceWorker.removeEventListener('controllerchange', refresh);
			}
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (
			open &&
			event.key === 'Escape' &&
			event.target instanceof Element &&
			event.target.closest('.platform-control')
		) {
			event.preventDefault();
			close();
		}
	}}
/>
<div class="platform-control">
	<button
		class="platform-trigger icon-button"
		bind:this={trigger}
		aria-label="Offline and install"
		aria-expanded={open}
		title={label}
		onclick={() => {
			open = !open;
			if (open) void refresh();
		}}
	>
		{#if ready}<Check size={16} />{:else}<WifiOff size={16} />{/if}<span>{label}</span>
	</button>
	{#if open}
		<section class="platform-panel" aria-label="Offline and installation">
			<div class="panel-heading">
				<strong>DevBench on your device</strong><button
					class="icon-button"
					aria-label="Close offline panel"
					onclick={close}><X size={16} /></button
				>
			</div>
			<p
				role="status"
				data-offline-state={ready
					? 'ready'
					: preparing
						? 'preparing'
						: error
							? 'error'
							: 'incomplete'}
			>
				<strong>{label}</strong>
			</p>
			{#if preparing}<progress
					value={completed}
					max={total || 1}
					aria-label="Offline preparation progress"
				></progress>{/if}
			<p class="privacy">
				All 30 tools, including their workers. Only application code, fonts and static pages are
				cached. Inputs and outputs stay in memory; Canvas keeps its existing local projects.
			</p>
			{#if bytes}<p class="privacy">
					{total} resources · {(bytes / 1024 / 1024).toFixed(2)} MiB · build {release.sha.slice(
						0,
						8
					)}
				</p>{/if}
			{#if error}<p class="platform-error" role="alert">{error}</p>{/if}
			{#if rescue && app.canvasExport}<button class="button" onclick={() => app.canvasExport?.()}
					>Export rescue JSON</button
				>{/if}
			{#if supported && !ready && !preparing}<button class="button primary" onclick={prepare}
					><Download size={15} />{error ? 'Retry offline preparation' : 'Prepare offline'}</button
				>{/if}
			{#if needsControl}<p class="privacy">
					Resources downloaded. A voluntary reload enables offline control; unsaved tool inputs will
					be cleared.
				</p>
				<button
					class="button"
					onclick={() => {
						confirmUpdate = true;
					}}>Enable offline after reload</button
				>{/if}
			{#if registration}<button class="text-button" onclick={checkUpdates}
					><RefreshCw size={14} />Check for updates</button
				>{/if}
			{#if updateDownloading}<p role="status">
					Downloading an update. Keep working on this version.
				</p>{/if}
			{#if updateReady && !deferred}
				<p role="status">DevBench has an update ready.</p>
				<button
					class="button"
					onclick={() => {
						confirmUpdate = true;
					}}>Update</button
				><button
					class="text-button"
					onclick={() => {
						deferred = true;
						confirmUpdate = false;
					}}>Later</button
				>
			{:else if updateReady}<p class="privacy">
					Update postponed. Your current version stays available.
				</p>
				<button
					class="text-button"
					onclick={() => {
						deferred = false;
					}}>Show update</button
				>{/if}
			{#if confirmUpdate}<div class="reload-confirmation">
					<p>
						Reloading clears ephemeral tool inputs and results. Canvas must save successfully first.
						Other tabs will keep their current work.
					</p>
					<button class="button primary" disabled={applying} onclick={applyUpdate}
						>{applying ? 'Checking saved work…' : 'Apply update and reload'}</button
					><button
						class="text-button"
						disabled={applying}
						onclick={() => {
							confirmUpdate = false;
							rescue = false;
						}}>Keep working</button
					>
				</div>{/if}
			{#if standalone}<p class="privacy">
					Running in standalone mode.
				</p>{:else if installEvent}<button class="button" onclick={install}
					><Download size={15} />Install DevBench</button
				>{/if}
			<details>
				<summary>Installation and storage</summary>
				<p class="privacy">
					On Chrome or Edge, use Install DevBench when offered or the browser install menu. On iOS
					Safari, use Share → Add to Home Screen. Availability depends on your browser. Prepare
					offline before disconnecting. Each domain and device has separate Canvas projects; export
					JSON backups before clearing site data or changing hosts.
				</p>
			</details>
		</section>
	{/if}
</div>

<style>
	.platform-control {
		position: relative;
	}
	.platform-trigger {
		gap: 6px;
		width: auto;
		padding: 8px;
		color: var(--color-muted);
		white-space: nowrap;
	}
	.platform-trigger span {
		font-size: 11px;
	}
	.platform-panel {
		position: absolute;
		right: 0;
		top: calc(100% + 10px);
		width: min(360px, calc(100vw - 24px));
		max-height: calc(100dvh - 90px);
		overflow: auto;
		z-index: 80;
		padding: 16px;
		border: 1px solid var(--color-border);
		background: var(--color-panel);
		border-radius: 8px;
		color: var(--color-text);
		font-size: 13px;
	}
	.panel-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.platform-panel p {
		margin: 10px 0;
		line-height: 1.55;
	}
	.platform-panel .button,
	.platform-panel .text-button {
		margin: 4px 6px 4px 0;
	}
	.platform-panel progress {
		width: 100%;
		accent-color: var(--color-accent);
	}
	.platform-error {
		color: var(--color-error);
	}
	.reload-confirmation {
		border-top: 1px solid var(--color-border);
		margin-top: 12px;
	}
	details {
		margin-top: 12px;
	}
	summary {
		cursor: pointer;
		color: var(--color-muted);
	}
	@media (max-width: 767px) {
		.platform-trigger {
			min-height: 44px;
			min-width: 44px;
		}
		.platform-trigger span {
			display: none;
		}
		.platform-panel {
			position: fixed;
			top: calc(64px + env(safe-area-inset-top));
			right: 12px;
		}
	}
</style>
