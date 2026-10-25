<script lang="ts">
	import { resolve } from '$app/paths';
	import './layout.css';
	import '@fontsource/geist/400.css';
	import '@fontsource/geist/500.css';
	import '@fontsource/geist/600.css';
	import '@fontsource/jetbrains-mono/400.css';
	import { onMount, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { Menu, Search, Moon, Sun, Monitor, X, Terminal } from '@lucide/svelte';
	import type { LayoutProps } from './$types';
	import { createAppState } from '#lib/state/app.svelte.js';
	import { loadPreferences, savePreferences, type Theme } from '#lib/state/preferences.js';
	import { listedTools } from '#lib/tools/tool-registry.js';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import favicon from '#lib/assets/favicon.svg';
	let { children }: LayoutProps = $props();
	const app = createAppState();
	let ready = $state(false);
	let systemDark = $state(true);
	let drawer: HTMLDialogElement;
	let drawerTrigger: HTMLButtonElement;
	let storageWarning = $state(false);
	onMount(() => {
		try {
			app.preferences = loadPreferences(localStorage);
		} catch {
			storageWarning = true;
		}
		const currentTool = listedTools.find(
			(item) => page.url.pathname === '/tools/' + item.slug + '/'
		);
		if (currentTool) app.visit(currentTool.id);
		const media = matchMedia('(prefers-color-scheme: dark)');
		systemDark = media.matches;
		const listener = () => {
			systemDark = media.matches;
		};
		media.addEventListener('change', listener);
		ready = true;
		return () => {
			media.removeEventListener('change', listener);
			app.pendingPaste = null;
		};
	});
	afterNavigate(() => {
		const tool = listedTools.find((item) => page.url.pathname === '/tools/' + item.slug + '/');
		if (tool && ready) app.visit(tool.id);
		if (
			app.pendingPaste &&
			page.url.pathname !==
				'/tools/' + listedTools.find((tool) => tool.id === app.pendingPaste?.toolId)?.slug + '/'
		)
			app.pendingPaste = null;
	});
	$effect(() => {
		const preferences = $state.snapshot(app.preferences);
		if (!ready) return;
		document.documentElement.dataset.theme =
			preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme;
		try {
			storageWarning = !savePreferences(localStorage, preferences);
		} catch {
			storageWarning = true;
		}
	});
	function shortcut(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			if (drawer?.open) drawer.close();
			app.paletteOpen = !app.paletteOpen;
		}
	}
	async function openDrawer() {
		drawer.showModal();
		await tick();
		drawer.querySelector<HTMLElement>('a')?.focus();
	}
	function closeDrawer() {
		drawer.close();
		drawerTrigger?.focus();
	}
</script>

<svelte:head
	><link rel="icon" href={favicon} /><meta
		name="description"
		content="A local developer workbench for data, encoding, security, text and backend tools."
	/></svelte:head
>
<svelte:window onkeydown={shortcut} />
<a class="skip-link" href="#main">Skip to content</a>
<aside class="desktop-sidebar"><Sidebar /></aside>
<dialog bind:this={drawer} class="drawer" aria-label="Navigation" oncancel={closeDrawer}>
	<Sidebar close={closeDrawer} />
</dialog>
<div class="app-main">
	<header class="app-header">
		<button
			class="icon-button menu-toggle"
			bind:this={drawerTrigger}
			onclick={openDrawer}
			aria-label="Open navigation"><Menu size={20} /></button
		>
		<a href={resolve('/')} class="mobile-brand"
			><span class="brand-symbol"><Terminal size={18} strokeWidth={1.6} /></span>DevBench</a
		>
		<button class="global-search" onclick={() => (app.paletteOpen = true)}
			><Search size={15} /><span>Search tools, commands, or categories…</span><kbd>⌘ K</kbd></button
		>
		<span class="header-caption">YOUR LOCAL WORKBENCH</span>
		<div class="theme-control">
			<label class="sr-only" for="theme">Color theme</label
			>{#if app.preferences.theme === 'dark'}<Moon
					size={15}
				/>{:else if app.preferences.theme === 'light'}<Sun size={15} />{:else}<Monitor
					size={15}
				/>{/if}<select id="theme" bind:value={app.preferences.theme}
				><option value={'dark' satisfies Theme}>Dark</option><option value={'light' satisfies Theme}
					>Light</option
				><option value={'system' satisfies Theme}>System</option></select
			>
		</div>
	</header>
	{#if storageWarning}<div class="storage-warning" role="status">
			Preferences could not be saved. You can continue using the workbench.<button
				aria-label="Dismiss notice"
				onclick={() => (storageWarning = false)}><X size={14} /></button
			>
		</div>{/if}
	<main id="main" tabindex="-1">{@render children()}</main>
</div>
<CommandPalette />
