<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		ArrowUpRight,
		ArrowRight,
		Search,
		Star,
		Clock,
		Clipboard,
		X,
		ShieldCheck,
		SlidersHorizontal
	} from '@lucide/svelte';
	import { useAppState } from '#lib/state/app.svelte.js';
	import { tools, v1Tools, categories, searchTools, type Tool } from '#lib/tools/tool-registry.js';
	import { detectPaste } from '#lib/tools/quick-paste.js';
	import Icon from '#lib/components/Icon.svelte';
	const app = useAppState();
	let query = $state('');
	let category = $state('All categories');
	let paste = $state('');
	let pasteError = $state('');
	const detected = $derived(detectPaste(paste));
	const filtered = $derived(
		searchTools(query).filter((tool) => category === 'All categories' || tool.category === category)
	);
	const favorites = $derived(v1Tools.filter((tool) => app.preferences.favorites.includes(tool.id)));
	const recent = $derived(
		app.preferences.recent
			.map((item) => v1Tools.find((tool) => tool.id === item.toolId)!)
			.filter(Boolean)
	);
	async function sendPaste() {
		app.pendingPaste = paste;
		paste = '';
		try {
			await goto(resolve('tools/json-studio/'));
		} catch {
			app.pendingPaste = null;
			pasteError = 'Could not open JSON Studio. Please try again.';
		}
	}
	async function readClipboard() {
		try {
			paste = await navigator.clipboard.readText();
			pasteError = '';
		} catch {
			pasteError = 'Clipboard access is unavailable. Paste into the field directly.';
		}
	}
</script>

<svelte:head><title>DevBench — Your tools, one workspace</title></svelte:head>
<div class="home-page">
	<section class="page-intro">
		<div class="eyebrow">
			<span class="local-dot"></span>A LITTLE LESS FRICTION. A LITTLE MORE FLOW.
		</div>
		<h1>Your tools, one workspace<span class="accent">.</span></h1>
		<p>A local-first developer toolbox. Paste, inspect, transform. Get back to building.</p>
	</section>
	<section class="quick-panel" aria-labelledby="quick-title">
		<div class="section-bar">
			<h2 id="quick-title">
				<Clipboard size={15} />Quick Paste<span class="subtle-tag">Local detection</span>
			</h2>
			<div class="inline-actions">
				<button class="text-button clipboard-read" onclick={readClipboard}
					><Clipboard size={13} />Load clipboard</button
				><button
					class="text-button"
					onclick={() => {
						paste = '';
						pasteError = '';
					}}><X size={13} />Clear</button
				>
			</div>
		</div>
		<label for="quick-paste" class="sr-only">Quick Paste input</label><textarea
			id="quick-paste"
			bind:value={paste}
			placeholder="Paste JSON, a JWT, a URL or SQL. We'll suggest where to start."
			spellcheck="false"></textarea>
		<div class="quick-bottom">
			<div class="quick-suggestion">
				{#if detected}<span class="detected">Looks like {detected}</span
					>{#if detected === 'JSON'}<button class="button primary compact" onclick={sendPaste}
							>Open in JSON Studio<ArrowUpRight size={14} /></button
						>{:else}<span class="muted"
							>Coming later — {detected === 'JWT'
								? 'JWT Inspector'
								: detected === 'URL'
									? 'URL Toolkit'
									: 'SQL Formatter'}</span
						>{/if}{:else}<span class="muted">Your next step starts with a paste.</span>{/if}
			</div>
			<span class="privacy-caption"><ShieldCheck size={13} />Processed in your browser</span>
		</div>
		{#if pasteError}<p class="error-message" role="status">{pasteError}</p>{/if}
	</section>
	<div class="home-personal">
		<section aria-labelledby="favorites-title">
			<div class="section-heading">
				<h2 id="favorites-title"><Star size={14} />Pinned workspaces</h2>
				<span class="mono muted">{favorites.length} pinned</span>
			</div>
			<div class="pinned-grid">
				{#each favorites as tool (tool.id)}<a
						class="pinned-tool"
						href={resolve(`tools/${tool.slug}/`)}
						><Icon name={tool.icon} /><strong>{tool.name}</strong>
						<p>{tool.description}</p>
						<span class="tool-status"
							>{tool.status === 'available' ? 'Open workspace' : 'Coming later'}<ArrowUpRight
								size={14}
							/></span
						></a
					>{:else}<div class="personal-empty">
						<Star size={20} />
						<div>
							<strong>Keep your go-to tools close.</strong>
							<p>Star a tool in the directory to pin it here.</p>
						</div>
					</div>{/each}
			</div>
		</section>
		<section aria-labelledby="recent-title">
			<div class="section-heading"><h2 id="recent-title"><Clock size={14} />Recently used</h2></div>
			<div class="recent-list">
				{#each recent as tool (tool.id)}<a href={resolve(`tools/${tool.slug}/`)}
						><Icon name={tool.icon} size={15} /><span>{tool.name}</span><ArrowUpRight
							size={14}
						/></a
					>{:else}<div class="personal-empty">
						<Clock size={20} />
						<div>
							<strong>A fresh workbench.</strong>
							<p>Your recent tools will appear here.</p>
						</div>
					</div>{/each}
			</div>
		</section>
	</div>
	<section id="directory" aria-labelledby="directory-title">
		<div class="directory-heading">
			<div class="section-heading">
				<h2 id="directory-title">Tool directory</h2>
				<span class="subtle-tag">12 tools · 1 available</span>
			</div>
			<div class="directory-controls">
				<div class="directory-search">
					<Search size={14} /><label class="sr-only" for="tool-search">Search directory</label
					><input id="tool-search" bind:value={query} placeholder="Find a tool…" />
				</div>
				<label class="category-filter"
					><SlidersHorizontal size={14} /><span class="sr-only">Filter by category</span><select
						bind:value={category}
						><option>All categories</option>{#each categories as item (item)}<option>{item}</option
							>{/each}</select
					></label
				>
			</div>
		</div>
		<div class="directory-grid">
			{#each categories.filter( (item) => filtered.some((tool) => tool.category === item) ) as item (item)}<section
					class="category-panel"
				>
					<div class="category-heading">
						<h3>{item}</h3>
						<span class="mono"
							>{filtered
								.filter((tool) => tool.category === item)
								.length.toString()
								.padStart(2, '0')}</span
						>
					</div>
					{#each filtered.filter((tool) => tool.category === item) as tool (tool.id)}<div
							class="directory-tool"
						>
							<a href={resolve(`tools/${tool.slug}/`)}
								><span class="tool-name"
									><Icon
										name={tool.icon}
										size={16}
									/>{tool.name}{#if tool.status === 'available'}<span class="live-label">Ready</span
										>{/if}</span
								>
								<p>{tool.description}</p>
								<span class="tool-status"
									>{tool.status === 'available' ? 'Open workspace' : 'Coming later'}<ArrowUpRight
										size={13}
									/></span
								></a
							><button
								class="favorite-button"
								class:pinned={app.preferences.favorites.includes(tool.id)}
								aria-label={`${app.preferences.favorites.includes(tool.id) ? 'Unpin' : 'Pin'} ${tool.name}`}
								aria-pressed={app.preferences.favorites.includes(tool.id)}
								onclick={() => app.toggleFavorite(tool.id)}><Star size={14} /></button
							>
						</div>{/each}
				</section>{:else}<p class="empty">
					No tools match this search. Try a different term or category.
				</p>{/each}
		</div>
	</section>
	<section class="roadmap-section" aria-labelledby="roadmap-title">
		<div class="section-heading">
			<h2 id="roadmap-title">On the workbench</h2>
			<span class="subtle-tag">Planned for V1.1</span>
		</div>
		<div class="roadmap-grid">
			{#each tools.filter((tool: Tool) => tool.version === 'V1.1') as tool (tool.id)}<div>
					<strong>{tool.name}</strong>
					<p>{tool.description}</p>
				</div>{/each}
		</div>
	</section>
	<footer class="home-footer">
		<span><strong>DevBench</strong> · A focused developer workbench</span><a
			href={resolve('tools/json-studio/')}>Start with JSON Studio<ArrowRight size={13} /></a
		>
	</footer>
</div>
