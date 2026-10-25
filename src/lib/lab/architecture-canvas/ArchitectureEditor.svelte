<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import {
		MousePointer2,
		Pencil,
		Move,
		Square,
		Type,
		ArrowUpRight,
		Trash2,
		ZoomIn,
		ZoomOut,
		Scan,
		ChevronRight,
		Layers
	} from '@lucide/svelte';
	import KonvaSurface from './KonvaSurface.svelte';
	import { createDemoProject } from './seed';
	import {
		getDiagram,
		addElement,
		moveElement,
		connectElements,
		deleteSelection,
		childDestination,
		screenToWorld,
		zoomAt,
		fitViewport,
		portalViewport,
		strokeElement,
		type Diagram,
		type Point,
		type Viewport,
		type Connection
	} from './model';
	let project = $state(createDemoProject());
	let path = $state([project.rootDiagramId]);
	let selectedId = $state('');
	let mode = $state<'select' | 'draw' | 'connect' | 'pan'>('select');
	let connectFrom = $state('');
	let connectionKind = $state<Connection['kind']>('arrow');
	let status = $state('Select Pedidos, then open its diagram or zoom into it.');
	let error = $state('');
	let busy = $state(false);
	let preview = $state<Viewport | null>(null);
	let size = $state({ width: 900, height: 520 });
	let editorRoot: HTMLDivElement;
	let canvasHost: HTMLDivElement;
	let frame = 0,
		disposed = false;
	const initialized = new SvelteSet<string>();
	const diagram = $derived(getDiagram(project, path[path.length - 1]));
	const selected = $derived(diagram.elements.find((element) => element.id === selectedId));
	const selectedConnection = $derived(
		diagram.connections.find((connection) => connection.id === selectedId)
	);
	const view = $derived(preview ?? diagram.viewport);
	function update(next: Diagram) {
		project.diagrams = project.diagrams.map((value) => (value.id === next.id ? next : value));
	}
	function action(operation: () => void) {
		try {
			error = '';
			operation();
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'This operation could not be completed.';
		}
	}
	function focusCanvas() {
		canvasHost?.focus({ preventScroll: true });
	}
	function setMode(next: typeof mode) {
		if (busy) return;
		mode = next;
		connectFrom = '';
		status =
			next === 'connect'
				? 'Choose a source node, then a target node.'
				: next === 'draw'
					? 'Drag on the canvas to draw. Switch to Select to move the stroke.'
					: next === 'pan'
						? 'Drag to pan. Scroll over the canvas to zoom.'
						: 'Select, drag, or use arrow keys to move an element.';
	}
	function pick(id: string) {
		if (busy) return;
		action(() => {
			selectedId = id;
			if (mode === 'connect') {
				const target = diagram.elements.find(
					(element) => element.id === id && element.kind !== 'stroke'
				);
				if (!target) {
					connectFrom = '';
					return;
				}
				if (!connectFrom) {
					connectFrom = id;
					status = 'Source: ' + target.label + '. Choose the target.';
				} else {
					update(
						connectElements(diagram, {
							id: 'connection-' + crypto.randomUUID(),
							from: connectFrom,
							to: id,
							kind: connectionKind
						})
					);
					connectFrom = '';
					status = 'Connection created. Choose another source, or switch to Select.';
				}
			}
		});
	}
	function add(kind: 'rectangle' | 'text') {
		if (busy) return;
		action(() => {
			const center = screenToWorld({ x: size.width / 2, y: size.height / 2 }, diagram.viewport);
			const element = {
				id: 'element-' + crypto.randomUUID(),
				kind,
				label: kind === 'rectangle' ? 'New component' : 'Annotation',
				x: center.x - 90,
				y: center.y - 45,
				width: kind === 'rectangle' ? 180 : 300,
				height: kind === 'rectangle' ? 106 : 64
			};
			update(addElement(diagram, element));
			selectedId = element.id;
			mode = 'select';
			connectFrom = '';
			status = 'Element created. Edit its label in Selection or drag it on the canvas.';
			focusCanvas();
		});
	}
	function move(id: string, point: Point) {
		if (!busy) action(() => update(moveElement(diagram, id, point)));
	}
	function setViewport(next: Viewport) {
		if (!busy) update({ ...diagram, viewport: next });
	}
	function measure(width: number, height: number) {
		size = { width, height };
		if (!initialized.has(diagram.id)) {
			initialized.add(diagram.id);
			update({ ...diagram, viewport: fitViewport(diagram.elements, width, height) });
		}
	}
	function fit() {
		if (!busy) setViewport(fitViewport(diagram.elements, size.width, size.height));
	}
	function zoom(factor: number) {
		if (!busy)
			setViewport(zoomAt(diagram.viewport, factor, { x: size.width / 2, y: size.height / 2 }));
	}
	function remove() {
		if (busy || !selectedId) return;
		update(deleteSelection(diagram, selectedId));
		selectedId = '';
		connectFrom = '';
		status = 'Selection deleted; incident connections removed.';
		focusCanvas();
	}
	function rename(label: string) {
		if (selected && !busy)
			update({
				...diagram,
				elements: diagram.elements.map((element) =>
					element.id === selectedId ? { ...element, label: label.slice(0, 200) } : element
				)
			});
	}
	function cancel() {
		cancelAnimationFrame(frame);
		preview = null;
		busy = false;
		connectFrom = '';
		status = 'Interaction cancelled.';
	}
	function enter(id: string, visual = false) {
		if (busy) return;
		action(() => {
			const destination = childDestination(project, diagram.id, id);
			const open = () => {
				if (disposed) return;
				path = [...path, destination];
				selectedId = '';
				connectFrom = '';
				preview = null;
				busy = false;
				mode = 'select';
				status = 'Opened ' + getDiagram(project, destination).title + '.';
				void tick().then(() => {
					if (!disposed) focusCanvas();
				});
			};
			if (!visual || matchMedia('(prefers-reduced-motion: reduce)').matches) {
				open();
				return;
			}
			const element = diagram.elements.find((value) => value.id === id)!;
			const start = { ...diagram.viewport },
				target = portalViewport(element, size.width, size.height),
				began = performance.now();
			busy = true;
			// The launching button becomes disabled; keep Escape and keyboard focus in the canvas.
			focusCanvas();
			status = 'Zoom transition into ' + getDiagram(project, destination).title + '…';
			const animate = (now: number) => {
				if (disposed) return;
				const progress = Math.min(1, (now - began) / 440),
					eased = 1 - (1 - progress) ** 3;
				preview = {
					x: start.x + (target.x - start.x) * eased,
					y: start.y + (target.y - start.y) * eased,
					zoom: start.zoom + (target.zoom - start.zoom) * eased
				};
				if (progress < 1) frame = requestAnimationFrame(animate);
				else open();
			};
			frame = requestAnimationFrame(animate);
		});
	}
	function backTo(index: number) {
		if (busy) return;
		path = path.slice(0, index + 1);
		selectedId = '';
		connectFrom = '';
		status = 'Returned to ' + diagram.title + '.';
		void tick().then(() => {
			if (!disposed) focusCanvas();
		});
	}
	function key(event: KeyboardEvent) {
		if (
			!editorRoot?.contains(event.target as Node) ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey
		)
			return;
		const target = event.target as HTMLElement;
		if (target.matches('input,textarea,select') || target.isContentEditable) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
			return;
		}
		if (busy) return;
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			remove();
			return;
		}
		if (target === canvasHost && event.key === 'Enter' && selected?.childDiagramId) {
			event.preventDefault();
			enter(selected.id, event.shiftKey);
			return;
		}
		const modes: Record<string, typeof mode> = { v: 'select', d: 'draw', c: 'connect', h: 'pan' };
		if (modes[event.key.toLowerCase()]) {
			setMode(modes[event.key.toLowerCase()]);
			return;
		}
		if (
			target === canvasHost &&
			['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
		) {
			event.preventDefault();
			const step = event.shiftKey ? 1 : 10,
				dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
				dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
			if (selected) move(selected.id, { x: selected.x + dx, y: selected.y + dy });
			else
				setViewport({
					...diagram.viewport,
					x: diagram.viewport.x - dx * 3,
					y: diagram.viewport.y - dy * 3
				});
		}
	}
	onDestroy(() => {
		disposed = true;
		cancelAnimationFrame(frame);
	});
</script>

<svelte:window onkeydown={key} />
<div class="canvas-page" bind:this={editorRoot}>
	<div class="lab-heading">
		<div>
			<div class="eyebrow">LAB / TECHNICAL PREVIEW</div>
			<h1>Architecture Canvas</h1>
			<p>Explore the system. Sketch the details.</p>
		</div>
		<a class="button" href={resolve('/')}>Back to tools</a>
	</div>
	<nav class="diagram-breadcrumb" aria-label="Diagram breadcrumb">
		{#each path as id, index (id)}{#if index > 0}<ChevronRight
					size={14}
					aria-hidden="true"
				/>{/if}<button
				aria-current={index === path.length - 1 ? 'page' : undefined}
				disabled={busy || index === path.length - 1}
				onclick={() => backTo(index)}>{getDiagram(project, id).title}</button
			>{/each}<span class="subtle-tag">Level {path.length} / 3 demo</span>
	</nav>
	<div class="canvas-toolbar" aria-label="Canvas tools">
		<div class="tool-group">
			<button
				class:chosen={mode === 'select'}
				aria-pressed={mode === 'select'}
				disabled={busy}
				onclick={() => setMode('select')}
				title="Select (V)"><MousePointer2 size={16} />Select</button
			><button
				class:chosen={mode === 'draw'}
				aria-pressed={mode === 'draw'}
				disabled={busy}
				onclick={() => setMode('draw')}
				title="Draw (D)"><Pencil size={16} />Draw</button
			><button
				class:chosen={mode === 'connect'}
				aria-pressed={mode === 'connect'}
				disabled={busy}
				onclick={() => setMode('connect')}
				title="Connect (C)"><ArrowUpRight size={16} />Connect</button
			><button
				class:chosen={mode === 'pan'}
				aria-pressed={mode === 'pan'}
				disabled={busy}
				onclick={() => setMode('pan')}
				title="Pan (H)"><Move size={16} />Pan</button
			>
		</div>
		<div class="tool-group">
			<button disabled={busy} onclick={() => add('rectangle')}><Square size={16} />Rectangle</button
			><button disabled={busy} onclick={() => add('text')}><Type size={16} />Text</button><button
				disabled={busy || !selectedId}
				onclick={remove}
				aria-label="Delete selection"><Trash2 size={16} /></button
			>
		</div>
		<div class="tool-group camera-tools">
			<button aria-label="Zoom out" disabled={busy} onclick={() => zoom(1 / 1.2)}
				><ZoomOut size={16} /></button
			><output aria-label="Camera zoom" data-x={view.x} data-y={view.y} data-zoom={view.zoom}
				>{Math.round(view.zoom * 100)}%</output
			><button aria-label="Zoom in" disabled={busy} onclick={() => zoom(1.2)}
				><ZoomIn size={16} /></button
			><button aria-label="Fit diagram" disabled={busy} onclick={fit}><Scan size={16} /></button>
		</div>
	</div>
	{#if mode === 'connect'}<div class="connect-options">
			<label
				>Connection <select aria-label="Connection style" bind:value={connectionKind}
					><option value="arrow">Arrow</option><option value="line">Line</option></select
				></label
			><span>{connectFrom ? 'Choose the target node.' : 'Choose the source node.'}</span>
		</div>{/if}
	{#if error}<p class="parse-error" role="alert">{error}</p>{/if}
	<div class="canvas-layout">
		<div class="canvas-shell">
			<div class="canvas-caption">
				<span>{diagram.title}</span><output aria-label="Diagram statistics"
					>{diagram.elements.length} elements · {diagram.connections.length} connections</output
				>
			</div>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (This canvas has real keyboard controls via the scoped window listener and a DOM outline companion.) -->
			<div
				class="canvas-viewport"
				bind:this={canvasHost}
				tabindex="0"
				role="application"
				aria-label="Architecture canvas"
				aria-describedby="canvas-shortcuts"
				aria-busy={busy}
			>
				{#key diagram.id}<KonvaSurface
						{diagram}
						{view}
						{mode}
						{selectedId}
						{busy}
						onSelect={pick}
						onMove={move}
						onViewport={setViewport}
						onStroke={(points) =>
							action(() => {
								const element = strokeElement('stroke-' + crypto.randomUUID(), points);
								update(addElement(diagram, element));
								selectedId = element.id;
								status = 'Freehand stroke added to this diagram.';
							})}
						onOpen={(id) => enter(id)}
						onMeasure={measure}
						onStatus={(message) => (status = message)}
						onFocus={focusCanvas}
					/>{/key}
			</div>
			<p id="canvas-shortcuts" class="shortcut-help">
				V select · D draw · C connect · H pan · Arrows move / pan · Del remove · Enter open ·
				Shift+Enter zoom into
			</p>
		</div>
		<aside class="canvas-inspector" aria-label="Diagram outline and selection">
			<div class="inspector-heading">
				<Layers size={15} />
				<h2>In this diagram</h2>
			</div>
			<div class="outline" aria-label="Elements">
				{#each diagram.elements as element (element.id)}<button
						class:selected={selectedId === element.id}
						aria-pressed={selectedId === element.id}
						disabled={busy}
						data-element-id={element.id}
						data-x={element.x}
						data-y={element.y}
						onclick={() => pick(element.id)}
						><span>{element.label || '(untitled)'}</span>{#if element.childDiagramId}<span
								class="child-mark"
								aria-label="Contains child diagram">↳</span
							>{/if}</button
					>{/each}
			</div>
			<div class="selection-panel">
				<h2>Selection</h2>
				{#if selected}<p class="selection-type">
						{selected.kind === 'stroke'
							? 'Freehand stroke'
							: selected.kind === 'rectangle'
								? 'Component'
								: 'Text annotation'}
					</p>
					{#if selected.kind !== 'stroke'}<label
							>Label<input
								class="field-input"
								aria-label="Selected element label"
								value={selected.label}
								maxlength="200"
								disabled={busy}
								oninput={(event) => rename(event.currentTarget.value)}
							/></label
						>{/if}
					<p class="position" aria-label="Selected position">
						X {Math.round(selected.x)} · Y {Math.round(selected.y)}
					</p>
					{#if selected.childDiagramId}<div class="child-actions">
							<p>Contains {getDiagram(project, selected.childDiagramId).title}</p>
							<button class="button" disabled={busy} onclick={() => enter(selected.id)}
								>Open child diagram</button
							><button
								class="button primary"
								disabled={busy}
								onclick={() => enter(selected.id, true)}>Zoom into child</button
							>
						</div>{/if}{:else if selectedConnection}<p>
						{selectedConnection.kind === 'arrow' ? 'Arrow' : 'Line'} selected. Delete removes this connection.
					</p>{:else}<p class="muted">Choose a component, annotation or connection.</p>{/if}
			</div>
			<details class="connection-list">
				<summary>Connections ({diagram.connections.length})</summary
				>{#each diagram.connections as connection (connection.id)}<button
						data-connection-id={connection.id}
						disabled={busy}
						class:selected={selectedId === connection.id}
						onclick={() => (selectedId = connection.id)}
						>{diagram.elements.find((element) => element.id === connection.from)?.label} → {diagram.elements.find(
							(element) => element.id === connection.to
						)?.label}</button
					>{/each}
			</details>
		</aside>
	</div>
	<div class="canvas-footer">
		<p role="status">{status}</p>
		<span>Session only · No autosave</span>
	</div>
	<p class="spike-note">
		Experimental: the zoom portal is a camera transition followed by opening a child diagram, not
		continuous semantic zoom. Each level keeps its edits and camera until you leave or reload.
	</p>
</div>

<style>
	.canvas-page {
		padding: 24px;
		max-width: 2000px;
		margin: auto;
	}
	.lab-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		margin-bottom: 18px;
	}
	h1 {
		font-size: 24px;
		line-height: 32px;
		margin: 5px 0;
		font-weight: 600;
	}
	.lab-heading p {
		margin: 0;
		color: var(--color-muted);
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 1.5px;
		color: var(--color-accent);
	}
	.diagram-breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 42px;
		margin-bottom: 12px;
	}
	.diagram-breadcrumb button {
		padding: 8px 4px;
		color: var(--color-muted);
	}
	.diagram-breadcrumb button[aria-current='page'] {
		color: var(--color-text);
		opacity: 1;
	}
	.diagram-breadcrumb .subtle-tag {
		margin-left: auto;
	}
	.canvas-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 8px;
		background: var(--color-rail);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		margin-bottom: 12px;
	}
	.tool-group {
		display: flex;
		align-items: center;
		gap: 4px;
		padding-right: 8px;
		border-right: 1px solid var(--color-border);
	}
	.canvas-toolbar button {
		display: flex;
		gap: 7px;
		align-items: center;
		padding: 9px 10px;
		border-radius: 4px;
		font-size: 13px;
		min-height: 36px;
	}
	.canvas-toolbar button:hover,
	.canvas-toolbar .chosen {
		background: var(--color-selection);
		color: var(--color-accent);
	}
	.camera-tools {
		margin-left: auto;
		border: 0;
		padding: 0;
	}
	.camera-tools output {
		width: 50px;
		text-align: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
	}
	.canvas-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 228px;
		gap: 12px;
		align-items: start;
	}
	.canvas-shell,
	.canvas-inspector {
		border: 1px solid var(--color-border);
		border-radius: 5px;
		overflow: hidden;
		min-width: 0;
	}
	.canvas-caption {
		display: flex;
		gap: 8px;
		justify-content: space-between;
		background: var(--color-rail);
		padding: 12px;
		font-size: 13px;
	}
	.canvas-caption output {
		color: var(--color-muted);
		font-size: 12px;
	}
	.canvas-viewport {
		height: clamp(420px, calc(100dvh - 380px), 760px);
		outline: none;
		min-width: 0;
	}
	.canvas-viewport:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}
	.shortcut-help {
		padding: 10px 12px;
		margin: 0;
		border-top: 1px solid var(--color-border);
		color: var(--color-muted);
		font-size: 11px;
		line-height: 1.7;
	}
	.inspector-heading {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 14px 12px;
		background: var(--color-rail);
	}
	h2 {
		margin: 0;
		font-size: 13px;
		font-weight: 500;
	}
	.outline {
		padding: 8px;
		max-height: 240px;
		overflow: auto;
	}
	.outline button,
	.connection-list button {
		display: flex;
		gap: 8px;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		padding: 9px 8px;
		width: 100%;
		border: 1px solid transparent;
		border-radius: 4px;
		font-size: 12px;
	}
	.outline button span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.outline button:hover,
	.selected {
		background: var(--color-rail);
		border-color: var(--color-border) !important;
	}
	.outline .selected,
	.child-mark {
		color: var(--color-accent);
	}
	.selection-panel {
		padding: 14px 12px;
		border-top: 1px solid var(--color-border);
	}
	.selection-panel label {
		display: block;
		font-size: 12px;
		color: var(--color-muted);
	}
	.selection-panel input {
		width: 100%;
		margin-top: 7px;
	}
	.selection-panel p {
		font-size: 12px;
		line-height: 1.6;
	}
	.position {
		font-family: 'JetBrains Mono', monospace;
		color: var(--color-muted);
	}
	.selection-type,
	.muted {
		color: var(--color-muted);
	}
	.child-actions {
		border-top: 1px solid var(--color-border);
		margin-top: 14px;
	}
	.child-actions button {
		width: 100%;
		margin-bottom: 8px;
		font-size: 12px;
	}
	.connection-list {
		padding: 12px;
		border-top: 1px solid var(--color-border);
		font-size: 12px;
	}
	.connection-list button {
		overflow-wrap: anywhere;
	}
	.canvas-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		margin-top: 12px;
		color: var(--color-muted);
	}
	.canvas-footer p {
		margin: 0;
		color: var(--color-accent);
	}
	.spike-note {
		font-size: 12px;
		color: var(--color-muted);
		line-height: 1.7;
		margin-bottom: 0;
	}
	.connect-options {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
		margin-bottom: 12px;
		font-size: 13px;
		color: var(--color-muted);
	}
	.connect-options label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	@media (max-width: 1100px) {
		.canvas-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.canvas-inspector {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.inspector-heading,
		.connection-list {
			grid-column: 1/-1;
		}
		.selection-panel {
			border-top: 0;
			border-left: 1px solid var(--color-border);
		}
		.canvas-viewport {
			height: 460px;
		}
	}
	@media (max-width: 767px) {
		.canvas-page {
			padding: 16px 12px;
		}
		.lab-heading {
			align-items: flex-start;
		}
		h1 {
			font-size: 22px;
		}
		.lab-heading > a {
			font-size: 12px;
			padding: 8px;
		}
		.eyebrow {
			font-size: 9px;
		}
		.diagram-breadcrumb button {
			min-height: 44px;
		}
		.diagram-breadcrumb .subtle-tag {
			margin-left: 0;
		}
		.canvas-toolbar button {
			min-height: 44px;
			font-size: 14px;
			padding: 8px;
		}
		.tool-group {
			border: 0;
			padding: 0;
			flex-wrap: wrap;
		}
		.camera-tools {
			margin-left: 0;
		}
		.canvas-viewport {
			height: 420px;
		}
		.canvas-caption {
			flex-wrap: wrap;
		}
		.canvas-inspector {
			display: block;
		}
		.outline button,
		.connection-list button {
			min-height: 44px;
			font-size: 14px;
		}
		.selection-panel {
			border-left: 0;
			border-top: 1px solid var(--color-border);
		}
		.shortcut-help,
		.spike-note,
		.canvas-footer,
		.selection-panel p,
		.selection-panel label,
		.child-actions button {
			font-size: 14px;
		}
	}
</style>
