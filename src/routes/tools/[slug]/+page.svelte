<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Component } from 'svelte';
	import type { PageProps } from './$types';
	import { ArrowLeft, Star, Construction } from '@lucide/svelte';
	import { toolWorkspaces } from '#lib/tools/tool-workspaces.js';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { release } from '#lib/release.js';
	let { data }: PageProps = $props();
	const app = useAppState();
	let Workspace = $state<Component | null>(null);
	let loadedSlug = $state('');
	let request = 0;
	let loadError = $state(false);
	async function loadWorkspace() {
		const ticket = ++request;
		const slug = data.tool.slug;
		Workspace = null;
		loadedSlug = '';
		loadError = false;
		try {
			const loaded = await toolWorkspaces[slug]();
			if (request === ticket && data.tool.slug === slug) {
				Workspace = loaded.default;
				loadedSlug = slug;
			}
		} catch {
			if (request === ticket) loadError = true;
		}
	}
	$effect(() => {
		if (data.tool.status === 'available') void loadWorkspace();
	});
</script>

<svelte:head><title>{data.tool.name} — DevBench</title></svelte:head>
<div
	class="workspace-page"
	data-workspace={loadedSlug}
	class:canvas-workspace={data.tool.slug === 'architecture-canvas'}
>
	{#if data.tool.slug === 'architecture-canvas'}
		<div class="canvas-meta">
			<span>Architecture Canvas {release.canvas}</span><button
				class="button"
				aria-pressed={app.preferences.favorites.includes(data.tool.id)}
				onclick={() => app.toggleFavorite(data.tool.id)}
				><Star size={14} />{app.preferences.favorites.includes(data.tool.id)
					? 'Pinned'
					: 'Pin tool'}</button
			>
		</div>
	{:else}
		<div class="breadcrumb">
			<a href={resolve('/')}>Tools</a><span>/</span><span>{data.tool.category}</span><span>/</span
			><span>{data.tool.name}</span>
		</div>
		<div class="workspace-heading">
			<div>
				<h1>{data.tool.name}</h1>
				<p>{data.tool.description}</p>
			</div>
			<button
				class="button favorite-workspace"
				aria-pressed={app.preferences.favorites.includes(data.tool.id)}
				onclick={() => app.toggleFavorite(data.tool.id)}
				><Star size={15} />{app.preferences.favorites.includes(data.tool.id)
					? 'Pinned'
					: 'Pin tool'}</button
			>
		</div>
	{/if}
	{#if data.tool.status === 'available'}
		{#if Workspace && loadedSlug === data.tool.slug}{#key data.tool.id}<Workspace
				/>{/key}{:else if loadError}<div class="notice error-message" role="alert">
				The editor could not be loaded.<button class="button" onclick={loadWorkspace}
					>Try again</button
				>
			</div>{:else}<p class="empty" role="status">Loading workspace…</p>{/if}
	{:else}<section class="coming-later">
			<Construction size={36} strokeWidth={1.2} /><span class="subtle-tag">Coming later</span>
			<h2>A place on the workbench.</h2>
			<p>{data.tool.name} is planned for a future block. This tool is not available yet.</p>
			<a class="button primary" href={resolve('tools/json-studio/')}>Open JSON Studio</a><a
				class="text-button"
				href={resolve('/')}><ArrowLeft size={14} />Back to all tools</a
			>
		</section>{/if}
</div>

<style>
	.canvas-workspace {
		padding: 0;
		max-width: none;
	}
	.canvas-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 24px 0;
		font-size: 10px;
		color: var(--color-muted);
	}
	.canvas-meta .button {
		font-size: 11px;
		min-height: 32px;
		padding: 5px 8px;
	}
	@media (max-width: 800px) {
		.canvas-meta {
			padding: 10px 16px 0;
		}
		.canvas-meta .button {
			min-height: 40px;
		}
	}
</style>
