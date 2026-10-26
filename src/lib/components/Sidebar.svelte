<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { House, Star, PanelLeftClose } from '@lucide/svelte';
	import { categories, listedTools, toolHref } from '#lib/tools/tool-registry.js';
	import { useAppState } from '#lib/state/app.svelte.js';
	import Icon from './Icon.svelte';
	let { close }: { close?: () => void } = $props();
	const app = useAppState();
</script>

<div class="sidebar-inner">
	<a class="brand" href={resolve('/')} onclick={close}
		><span class="brand-symbol"><Icon name="terminal" size={18} /></span>DevBench<span
			class="version"
			>{listedTools.some((tool) => tool.version === 'V2.1')
				? 'V2.1 RC'
				: listedTools.some((tool) => tool.version === 'V1.5')
					? 'V1.5 RC'
					: listedTools.some((tool) => tool.version === 'V1.3')
						? 'V1.3'
						: listedTools.some((tool) => tool.version === 'V1.2')
							? 'V1.2'
							: listedTools.some((tool) => tool.version === 'V1.1')
								? 'V1.1'
								: 'V1'}</span
		></a
	>
	{#if close}<button class="drawer-close icon-button" onclick={close} aria-label="Close navigation"
			><PanelLeftClose size={20} /></button
		>{/if}
	<nav aria-label="Main navigation">
		<a class="nav-home" class:active={page.url.pathname === '/'} href={resolve('/')} onclick={close}
			><House size={16} />Home</a
		>
		{#each categories as category (category)}
			<div class="nav-group">
				<h2>{category}</h2>
				{#each listedTools.filter((tool) => tool.category === category) as tool (tool.id)}
					<a
						class="nav-tool"
						class:active={page.url.pathname === toolHref(tool)}
						href={resolve(`tools/${tool.slug}/`)}
						onclick={close}
						><Icon name={tool.icon} size={15} /><span>{tool.name}</span
						>{#if tool.status === 'available'}<span class="available-dot" aria-label="Available"
							></span>{/if}</a
					>
				{/each}
			</div>
		{/each}
		{#if app.preferences.favorites.length}<div class="nav-group">
				<h2><Star size={11} />Favorites</h2>
				{#each listedTools.filter( (tool) => app.preferences.favorites.includes(tool.id) ) as tool (tool.id)}<a
						class="nav-tool"
						href={resolve(`tools/${tool.slug}/`)}
						onclick={close}><Icon name={tool.icon} size={15} />{tool.name}</a
					>{/each}
			</div>{/if}
	</nav>
	<div class="sidebar-footer">
		<span class="local-dot"></span><span
			>Processed in your browser.<br /><span class="muted">Inputs aren't uploaded.</span></span
		>
	</div>
</div>
