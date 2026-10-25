<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Component } from 'svelte';
	import type { PageProps } from './$types';
	import { ArrowLeft, Star, Construction } from '@lucide/svelte';
	import { useAppState } from '#lib/state/app.svelte.js';
	let { data }: PageProps = $props();
	const app = useAppState();
	let Studio = $state<Component | null>(null);
	let loadError = $state(false);
	async function loadStudio() {
		loadError = false;
		try {
			Studio = (await import('#lib/tools/json-studio/JsonStudio.svelte')).default;
		} catch {
			loadError = true;
		}
	}
	$effect(() => {
		if (data.tool.slug === 'json-studio' && !Studio) void loadStudio();
	});
</script>

<svelte:head><title>{data.tool.name} — DevBench</title></svelte:head>
<div class="workspace-page">
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
	{#if data.tool.slug === 'json-studio'}
		{#if Studio}{#key data.tool.id}<Studio />{/key}{:else if loadError}<div
				class="notice error-message"
				role="alert"
			>
				The editor could not be loaded.<button class="button" onclick={loadStudio}>Try again</button
				>
			</div>{:else}<p class="empty" role="status">Loading JSON Studio…</p>{/if}
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
