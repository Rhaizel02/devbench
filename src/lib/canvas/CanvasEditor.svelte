<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		MousePointer2,
		Hand,
		Square,
		RectangleHorizontal,
		Circle,
		Diamond,
		Type,
		ArrowUpRight,
		Minus,
		Pencil,
		Undo2,
		Redo2,
		Copy,
		Trash2,
		ZoomIn,
		ZoomOut,
		Scan,
		Settings2,
		Layers,
		ChevronRight,
		Download
	} from '@lucide/svelte';
	import BoardSurface, { type Mode } from './BoardSurface.svelte';
	import CanvasProjects from './CanvasProjects.svelte';
	import { createDemoProject } from '../lab/architecture-canvas/seed';
	import {
		DEFAULT_STYLE,
		FONT_FAMILIES,
		LIMITS,
		newId,
		getDiagram,
		replaceDiagram,
		deleteSelection,
		duplicateSelection,
		moveSelection,
		resizeElement,
		zoomAt,
		fitViewport,
		associateChild,
		orphanDiagrams,
		deleteDiagram,
		type Project,
		type Diagram,
		type Viewport,
		type Style
	} from './model';
	import { parseProject, serializeProject, color } from './serialization';
	import { History } from './history';
	const initialProject = {
		...parseProject(JSON.stringify(createDemoProject())),
		id: newId('project')
	};
	let project = $state.raw<Project>(initialProject);
	let path = $state([initialProject.rootDiagramId]),
		selection = $state<string[]>([]),
		mode = $state<Mode>('select');
	let creationStyle = $state<Style>({ ...DEFAULT_STYLE }),
		properties = $state(false),
		error = $state(''),
		status = $state('Drag a shape. Double-click to write.');
	let busy = $state(false),
		loading = $state(true),
		preview = $state<Viewport | null>(null),
		size = $state({ width: 900, height: 600 });
	let editorRoot: HTMLDivElement, canvasHost: HTMLDivElement;
	let surface = $state<BoardSurface>(),
		textInput = $state<HTMLTextAreaElement>();
	let editing = $state<{ id: string; value: string } | null>(null),
		historyVersion = $state(0),
		frame = 0,
		disposed = false;
	const history = new History();
	const diagram = $derived(getDiagram(project, path.at(-1)!));
	const selected = $derived(diagram.elements.find((e) => selection.includes(e.id)));
	const selectedEdge = $derived(diagram.connections.find((c) => selection.includes(c.id)));
	const currentStyle = $derived(selected?.style ?? selectedEdge?.style ?? creationStyle);
	const view = $derived(preview ?? diagram.viewport);
	const canUndo = $derived.by(() => {
		void historyVersion;
		return history.canUndo;
	});
	const canRedo = $derived.by(() => {
		void historyVersion;
		return history.canRedo;
	});
	const tools = [
		{ id: 'select', label: 'Select', icon: MousePointer2, key: 'V' },
		{ id: 'pan', label: 'Pan', icon: Hand, key: 'H' },
		{ id: 'rectangle', label: 'Rectangle', icon: Square, key: 'R' },
		{ id: 'rounded', label: 'Rounded rectangle', icon: RectangleHorizontal, key: 'U' },
		{ id: 'ellipse', label: 'Ellipse', icon: Circle, key: 'O' },
		{ id: 'diamond', label: 'Diamond', icon: Diamond, key: 'Q' },
		{ id: 'text', label: 'Text', icon: Type, key: 'T' },
		{ id: 'arrow', label: 'Arrow', icon: ArrowUpRight, key: 'A' },
		{ id: 'line', label: 'Line', icon: Minus, key: 'L' },
		{ id: 'stroke', label: 'Pencil', icon: Pencil, key: 'P' }
	] as const;
	const colors = ['#8899aa', '#20bfa9', '#c288e8', '#e3a44c', '#ec7884', '#488ac8', '#2c3848'];
	function focusCanvas() {
		canvasHost?.focus({ preventScroll: true });
	}
	function action(operation: () => void) {
		try {
			error = '';
			operation();
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'The action could not be completed.';
		}
	}
	function changed(next: Project, record = true) {
		// Validate only at transaction boundaries, never at each pointer sample.
		const valid = parseProject(JSON.stringify(next));
		if (record) {
			history.record(project);
			historyVersion++;
		}
		project = valid;
	}
	function commit(next: Diagram) {
		action(() => changed(replaceDiagram(project, next)));
	}
	function setViewport(next: Viewport) {
		if (!busy) project = replaceDiagram(project, { ...diagram, viewport: next });
	}
	function choose(next: Mode) {
		if (busy || loading) return;
		surface?.cancel();
		mode = next;
		status =
			next === 'select'
				? 'Click to select · Shift adds · Double-click to write'
				: next === 'pan'
					? 'Drag to pan. Wheel zooms around the pointer.'
					: 'Drag on the board to create. Escape cancels.';
	}
	function setSelection(ids: string[]) {
		selection = ids;
	}
	function updateStyle(key: keyof Style, value: Style[keyof Style]) {
		action(() => {
			if ((key === 'stroke' || key === 'fill') && typeof value === 'string')
				value = color(value, key === 'fill');
			creationStyle = { ...creationStyle, [key]: value };
			if (selection.length)
				commit({
					...diagram,
					elements: diagram.elements.map((e) =>
						selection.includes(e.id) ? { ...e, style: { ...e.style, [key]: value } } : e
					),
					connections: diagram.connections.map((c) =>
						selection.includes(c.id) ? { ...c, style: { ...c.style, [key]: value } } : c
					)
				});
		});
	}
	function inputColor(key: 'stroke' | 'fill', value: string, final = false) {
		const valid = /^#[0-9a-f]{6}$/i.test(value) || (key === 'fill' && value === 'transparent');
		if ((!final && valid) || (final && !valid)) updateStyle(key, value);
	}
	function remove() {
		if (!selection.length || busy) return;
		commit(deleteSelection(diagram, selection));
		selection = [];
		focusCanvas();
	}
	function duplicate() {
		action(() => {
			const result = duplicateSelection(diagram, selection, () => newId());
			commit(result.diagram);
			selection = result.ids;
			focusCanvas();
		});
	}
	function layer(front: boolean) {
		const all = [...diagram.elements, ...diagram.connections].sort((a, b) => a.z - b.z),
			chosen = all.filter((e) => selection.includes(e.id)),
			others = all.filter((e) => !selection.includes(e.id));
		const ordered = front ? [...others, ...chosen] : [...chosen, ...others],
			index = new Map(ordered.map((e, i) => [e.id, i]));
		commit({
			...diagram,
			elements: diagram.elements.map((e) => ({ ...e, z: index.get(e.id)! })),
			connections: diagram.connections.map((e) => ({ ...e, z: index.get(e.id)! }))
		});
	}
	function undo(redo = false) {
		if (busy) return;
		surface?.cancel();
		project = redo ? history.redo(project) : history.undo(project);
		historyVersion++;
		path = path.filter((id) => project.diagrams.some((d) => d.id === id));
		if (!path.length) path = [project.rootDiagramId];
		selection = [];
	}
	function fit() {
		if (loading) return;
		setViewport(fitViewport(diagram, size.width, size.height));
		if (diagram.viewport.zoom < 0.7)
			status = 'Fit shows the whole board. Use 100% for readable labels and pan to explore.';
	}
	function openProject(next: Project) {
		cancel();
		project = next;
		path = [next.rootDiagramId];
		selection = [];
		history.clear();
		historyVersion++;
		mode = 'select';
		status = 'Canvas projects autosave in this browser. Export JSON for a backup.';
	}
	function zoom(factor: number) {
		setViewport(zoomAt(diagram.viewport, factor, { x: size.width / 2, y: size.height / 2 }));
	}
	function cancel() {
		surface?.cancel();
		cancelAnimationFrame(frame);
		busy = false;
		preview = null;
		editing = null;
		status = 'Cancelled.';
	}
	async function editText(id: string) {
		const e = diagram.elements.find((e) => e.id === id);
		if (!e || busy || e.kind === 'stroke') return;
		selection = [id];
		editing = { id, value: e.label };
		mode = 'select';
		await tick();
		textInput?.focus();
		textInput?.select();
	}
	function finishText() {
		if (!editing) return;
		const { id, value } = editing;
		editing = null;
		const previous = diagram.elements.find((e) => e.id === id);
		if (previous?.label !== value)
			commit({
				...diagram,
				elements: diagram.elements.map((e) => (e.id === id ? { ...e, label: value } : e))
			});
		focusCanvas();
	}
	function child(id: string, visual = false) {
		action(() => {
			if (busy) return;
			const e = diagram.elements.find((e) => e.id === id);
			if (!e?.childDiagramId) throw new Error('This figure has no child diagram.');
			getDiagram(project, e.childDiagramId);
			const destination = e.childDiagramId;
			const open = () => {
				if (disposed) return;
				path = [...path, destination];
				selection = [];
				preview = null;
				busy = false;
				mode = 'select';
				void tick().then(focusCanvas);
			};
			if (!visual || matchMedia('(prefers-reduced-motion: reduce)').matches) {
				open();
				return;
			}
			const start = { ...diagram.viewport },
				targetZoom = Math.min(
					4,
					Math.max(start.zoom * 1.3, Math.min(size.width / e.width, size.height / e.height) * 0.8)
				),
				target = {
					x: size.width / 2 - (e.x + e.width / 2) * targetZoom,
					y: size.height / 2 - (e.y + e.height / 2) * targetZoom,
					zoom: targetZoom
				},
				began = performance.now();
			busy = true;
			focusCanvas();
			const animate = (time: number) => {
				if (disposed) return;
				const progress = Math.min(1, (time - began) / 440),
					t = 1 - (1 - progress) ** 3;
				preview = {
					x: start.x + (target.x - start.x) * t,
					y: start.y + (target.y - start.y) * t,
					zoom: start.zoom + (target.zoom - start.zoom) * t
				};
				if (progress < 1) frame = requestAnimationFrame(animate);
				else open();
			};
			frame = requestAnimationFrame(animate);
		});
	}
	function back(index: number) {
		if (busy) return;
		path = path.slice(0, index + 1);
		selection = [];
		void tick().then(focusCanvas);
	}
	function createChild() {
		action(() => {
			if (!selected) return;
			if (project.diagrams.length >= LIMITS.diagrams)
				throw new Error('Project limit: 100 diagrams.');
			const id = newId('diagram'),
				next = {
					...project,
					diagrams: [
						...project.diagrams,
						{
							id,
							title: (selected.label || 'New diagram').slice(0, 200),
							elements: [],
							connections: [],
							viewport: { x: 40, y: 64, zoom: 1 }
						}
					]
				};
			changed(associateChild(next, diagram.id, selected.id, id));
			status = 'Child diagram created. Open it directly or zoom into it.';
		});
	}
	function assignChild(id: string) {
		action(() => {
			if (selected) changed(associateChild(project, diagram.id, selected.id, id || undefined));
		});
	}
	function renameDiagram(title: string) {
		if (title.trim()) commit({ ...diagram, title: title.trim().slice(0, 200) });
	}
	function download(content: Blob, filename: string) {
		const url = URL.createObjectURL(content);
		try {
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			status = 'Download started: ' + filename;
		} finally {
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}
	function exportJSON() {
		action(() =>
			download(
				new Blob([serializeProject(project)], { type: 'application/json' }),
				'devbench-canvas.json'
			)
		);
	}
	function exportPNG() {
		action(() => {
			if (!surface) throw new Error('Canvas is not ready.');
			const data = surface.exportPNG(),
				bytes = Uint8Array.from(atob(data.split(',')[1]), (c) => c.charCodeAt(0));
			download(new Blob([bytes], { type: 'image/png' }), 'devbench-diagram.png');
		});
	}
	function key(event: KeyboardEvent) {
		if (!editorRoot?.contains(event.target as Node) || event.altKey) return;
		const target = event.target as HTMLElement;
		if (target.matches('input,textarea,select') || target.isContentEditable) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
			return;
		}
		if (busy) return;
		if (event.ctrlKey || event.metaKey) {
			if (event.key.toLowerCase() === 'z') {
				event.preventDefault();
				undo(event.shiftKey);
			} else if (event.key.toLowerCase() === 'y') {
				event.preventDefault();
				undo(true);
			} else if (event.key.toLowerCase() === 'd') {
				event.preventDefault();
				duplicate();
			} else if (event.key.toLowerCase() === 'a') {
				event.preventDefault();
				selection = [...diagram.elements, ...diagram.connections].map((e) => e.id);
			}
			return;
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			remove();
			return;
		}
		if (target === canvasHost && event.key === 'Enter' && selected) {
			event.preventDefault();
			if (selected.childDiagramId) child(selected.id, event.shiftKey);
			else void editText(selected.id);
			return;
		}
		if (target === canvasHost && event.key.startsWith('Arrow')) {
			event.preventDefault();
			const step = event.shiftKey ? 1 : 10,
				dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0,
				dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
			if (selection.length) commit(moveSelection(diagram, selection, { x: dx, y: dy }));
			else
				setViewport({
					...diagram.viewport,
					x: diagram.viewport.x - dx * 3,
					y: diagram.viewport.y - dy * 3
				});
			return;
		}
		const tool = tools.find((t) => t.key.toLowerCase() === event.key.toLowerCase());
		if (tool) choose(tool.id);
	}
	onDestroy(() => {
		disposed = true;
		cancelAnimationFrame(frame);
	});
</script>

<svelte:window onkeydown={key} />
<div class="board-editor" bind:this={editorRoot}>
	<header class="board-heading">
		<div>
			<div class="eyebrow">ARCHITECTURE CANVAS · V1.4 LAB</div>
			<h1>{project.title}</h1>
		</div>
		<div class="heading-actions">
			<button class="button" onclick={exportJSON}><Download size={15} />JSON</button><button
				class="button"
				onclick={exportPNG}>PNG</button
			><a class="button" href={resolve('/')}>Tools</a>
		</div>
	</header>
	<CanvasProjects
		{project}
		onOpen={openProject}
		onRename={(title) => action(() => changed({ ...project, title }))}
		onReady={() => (loading = false)}
	/>
	<nav class="breadcrumbs" aria-label="Diagram breadcrumb">
		{#each path as id, i (id)}{#if i > 0}<ChevronRight size={14} />{/if}<button
				aria-current={i === path.length - 1 ? 'page' : undefined}
				disabled={busy || i === path.length - 1}
				onclick={() => back(i)}>{getDiagram(project, id).title}</button
			>{/each}
	</nav>
	<div class="board-workspace">
		<div class="floating-toolbar" role="toolbar" aria-label="Drawing tools">
			{#each tools as tool (tool.id)}<button
					class:chosen={mode === tool.id}
					aria-label={tool.label}
					aria-pressed={mode === tool.id}
					title={tool.label + ' (' + tool.key + ')'}
					disabled={busy}
					onclick={() => choose(tool.id)}
					><tool.icon size={19} /><span class="key-hint">{tool.key}</span></button
				>{/each}<span class="toolbar-separator"></span><button
				aria-label="Undo"
				title="Undo (Ctrl/⌘ Z)"
				disabled={!canUndo || busy}
				onclick={() => undo()}><Undo2 size={18} /></button
			><button
				aria-label="Redo"
				title="Redo (Ctrl/⌘ Shift Z)"
				disabled={!canRedo || busy}
				onclick={() => undo(true)}><Redo2 size={18} /></button
			>
		</div>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard drawing surface with an operable DOM outline and labeled controls.) -->
		<div
			class="canvas-host"
			role="application"
			aria-label="Architecture canvas"
			aria-describedby="canvas-help"
			aria-busy={busy}
			tabindex="0"
			bind:this={canvasHost}
		>
			{#key diagram.id}<BoardSurface
					bind:this={surface}
					{diagram}
					{view}
					{mode}
					style={creationStyle}
					{selection}
					busy={busy || loading}
					onSelect={setSelection}
					onCommit={commit}
					onViewport={setViewport}
					onText={editText}
					onChild={child}
					onMeasure={(width, height) => {
						size = { width, height };
					}}
					onStatus={(message) => (status = message)}
					onFocus={focusCanvas}
				/>{/key}
			{#if editing}{@const e = diagram.elements.find((e) => e.id === editing?.id)}{#if e}<textarea
						class="direct-text"
						aria-label="Edit text on canvas"
						bind:this={textInput}
						bind:value={editing.value}
						maxlength={LIMITS.label}
						style:left={`${view.x + e.x * view.zoom}px`}
						style:top={`${view.y + e.y * view.zoom}px`}
						style:width={`${Math.max(140, e.width * view.zoom)}px`}
						style:height={`${Math.max(70, e.height * view.zoom)}px`}
						style:font-family={FONT_FAMILIES[e.style.font]}
						style:font-size={`${e.style.fontSize * view.zoom}px`}
						style:color={e.kind === 'text' ? e.style.stroke : 'var(--color-text)'}
						onblur={finishText}
						onkeydown={(event) => {
							if (event.key === 'Escape') {
								event.stopPropagation();
								editing = null;
								focusCanvas();
							} else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
								event.preventDefault();
								finishText();
							}
						}}></textarea>{/if}{/if}
		</div>
		<div class="viewport-tools">
			<button aria-label="Zoom out" onclick={() => zoom(1 / 1.2)}><ZoomOut size={17} /></button
			><button
				aria-label="Camera zoom"
				data-zoom={view.zoom}
				data-x={view.x}
				data-y={view.y}
				onclick={() => setViewport({ ...diagram.viewport, zoom: 1 })}
				>{Math.round(view.zoom * 100)}%</button
			><button aria-label="Zoom in" onclick={() => zoom(1.2)}><ZoomIn size={17} /></button><button
				aria-label="Fit diagram"
				onclick={fit}><Scan size={17} /></button
			><button
				aria-label="Toggle properties"
				aria-expanded={properties}
				onclick={() => (properties = !properties)}><Settings2 size={17} /></button
			>
		</div>
		{#if properties}<aside class="properties" aria-label="Drawing properties">
				<div class="panel-title">
					<strong>{selection.length ? selection.length + ' selected' : 'Next shape'}</strong><button
						aria-label="Close properties"
						onclick={() => (properties = false)}>×</button
					>
				</div>
				<fieldset>
					<legend>Stroke</legend>
					<div class="swatches">
						{#each colors as hex (hex)}<button
								style:background={hex}
								aria-label={'Stroke ' + hex}
								aria-pressed={currentStyle.stroke === hex}
								onclick={() => updateStyle('stroke', hex)}
							></button>{/each}
					</div>
					<label
						>Stroke HEX<input
							aria-label="Stroke HEX"
							value={currentStyle.stroke}
							oninput={(event) => inputColor('stroke', event.currentTarget.value)}
							onchange={(event) => inputColor('stroke', event.currentTarget.value, true)}
						/></label
					>
				</fieldset>
				<fieldset>
					<legend>Fill</legend>
					<div class="swatches">
						<button
							class="transparent"
							aria-label="Transparent fill"
							onclick={() => updateStyle('fill', 'transparent')}>∅</button
						>{#each ['#d6f5ed', '#efe2fa', '#fff0d4', '#f9dce4', '#dcecf9'] as hex (hex)}<button
								style:background={hex}
								aria-label={'Fill ' + hex}
								aria-pressed={currentStyle.fill === hex}
								onclick={() => updateStyle('fill', hex)}
							></button>{/each}
					</div>
					<label
						>Fill HEX<input
							aria-label="Fill HEX"
							value={currentStyle.fill}
							oninput={(event) => inputColor('fill', event.currentTarget.value)}
							onchange={(event) => inputColor('fill', event.currentTarget.value, true)}
						/></label
					>
				</fieldset>
				<div class="property-row">
					<label
						>Width<select
							aria-label="Stroke width"
							value={currentStyle.width}
							onchange={(event) => updateStyle('width', Number(event.currentTarget.value))}
							>{#each [1, 2, 3, 5, 8] as value (value)}<option {value}>{value} px</option
								>{/each}</select
						></label
					><label
						>Line<select
							aria-label="Line style"
							value={currentStyle.dashed ? 'dashed' : 'solid'}
							onchange={(event) => updateStyle('dashed', event.currentTarget.value === 'dashed')}
							><option value="solid">Solid</option><option value="dashed">Dashed</option></select
						></label
					>
				</div>
				<div class="property-row">
					<label
						>Font<select
							aria-label="Font family"
							value={currentStyle.font}
							onchange={(event) => updateStyle('font', event.currentTarget.value as Style['font'])}
							><option value="sans">Sans</option><option value="mono">Mono</option><option
								value="serif">Serif</option
							></select
						></label
					><label
						>Size<select
							aria-label="Font size"
							value={currentStyle.fontSize}
							onchange={(event) => updateStyle('fontSize', Number(event.currentTarget.value))}
							>{#each [14, 16, 20, 24, 32, 48, 64] as value (value)}<option {value}>{value}</option
								>{/each}</select
						></label
					>
				</div>
				<label class="check"
					><input
						type="checkbox"
						checked={currentStyle.sketch}
						onchange={(event) => updateStyle('sketch', event.currentTarget.checked)}
					/>Soft sketch</label
				>
				{#if selected}<label
						>Label<input
							aria-label="Selected element label"
							value={selected.label}
							maxlength={LIMITS.label}
							onchange={(event) =>
								commit({
									...diagram,
									elements: diagram.elements.map((e) =>
										e.id === selected.id ? { ...e, label: event.currentTarget.value } : e
									)
								})}
						/></label
					><button class="button" onclick={() => editText(selected.id)}>Edit on canvas</button>
					<div class="property-row">
						<label
							>Width<input
								aria-label="Element width"
								type="number"
								min="16"
								max="20000"
								value={Math.round(selected.width)}
								onchange={(event) =>
									commit({
										...diagram,
										elements: diagram.elements.map((e) =>
											e.id === selected.id
												? resizeElement(e, Number(event.currentTarget.value), e.height)
												: e
										)
									})}
							/></label
						><label
							>Height<input
								aria-label="Element height"
								type="number"
								min="16"
								max="20000"
								value={Math.round(selected.height)}
								onchange={(event) =>
									commit({
										...diagram,
										elements: diagram.elements.map((e) =>
											e.id === selected.id
												? resizeElement(e, e.width, Number(event.currentTarget.value))
												: e
										)
									})}
							/></label
						>
					</div>{/if}
				{#if selection.length}<div class="property-row">
						<button class="button" aria-label="Duplicate selection" onclick={duplicate}
							><Copy size={15} />Duplicate</button
						><button class="button" aria-label="Delete selection" onclick={remove}
							><Trash2 size={15} /></button
						>
					</div>
					<div class="property-row">
						<button class="button" onclick={() => layer(true)}>To front</button><button
							class="button"
							onclick={() => layer(false)}>To back</button
						>
					</div>{/if}
				{#if selected && !['stroke', 'text'].includes(selected.kind)}<div class="child-properties">
						<strong>Nested diagram</strong><button class="button" onclick={createChild}
							>Create child diagram</button
						><label
							>Associate child<select
								aria-label="Associate child diagram"
								value={selected.childDiagramId ?? ''}
								onchange={(event) => {
									const control = event.currentTarget;
									assignChild(control.value);
									control.value = selected.childDiagramId ?? '';
								}}
								><option value="">None</option>{#each project.diagrams as d (d.id)}<option
										value={d.id}>{d.title}</option
									>{/each}</select
							></label
						>{#if selected.childDiagramId}<button class="button" onclick={() => child(selected.id)}
								>Open child diagram</button
							><button class="button" onclick={() => child(selected.id, true)}
								>Zoom into child</button
							>{/if}
					</div>{/if}
			</aside>{/if}
	</div>
	<footer class="board-status">
		<span role="status">{error || status}</span><span
			>{diagram.elements.length} figures · {diagram.connections.length} connectors</span
		>
	</footer>
	<p class="help" id="canvas-help">
		V select · H pan · R rectangle · P pencil · Shift adds selection · Ctrl/⌘ Z undo · Enter
		edit/open · Shift Enter zoom into child. Canvas only: local autosave. Export JSON for a backup.
	</p>
	<details class="outline">
		<summary><Layers size={15} />Outline & diagrams</summary><label
			>Diagram name<input
				aria-label="Diagram name"
				value={diagram.title}
				maxlength="200"
				onchange={(event) => renameDiagram(event.currentTarget.value)}
			/></label
		>
		<div class="outline-list">
			{#each diagram.elements as e (e.id)}<div
					class="outline-row"
					data-element-id={e.id}
					data-kind={e.kind}
					data-x={e.x}
					data-y={e.y}
					data-width={e.width}
					data-height={e.height}
				>
					<button
						aria-label={e.label || e.kind}
						aria-pressed={selection.includes(e.id)}
						onclick={(event) =>
							setSelection(event.shiftKey ? [...new Set([...selection, e.id])] : [e.id])}
						>{e.label || e.kind}{e.childDiagramId ? ' ↳' : ''}</button
					><button aria-label={'Edit ' + (e.label || e.kind)} onclick={() => editText(e.id)}
						>Edit</button
					>{#if e.childDiagramId}<button
							aria-label={'Open ' + (e.label || e.kind) + ' child'}
							onclick={() => child(e.id)}>Open</button
						><button
							aria-label={'Zoom into ' + (e.label || e.kind) + ' child'}
							onclick={() => child(e.id, true)}>Zoom in</button
						>{/if}
				</div>{/each}{#each diagram.connections as c (c.id)}<button
					data-connection-id={c.id}
					onclick={() => setSelection([c.id])}
					>{c.kind}{c.start.elementId ? ' · anchored' : ''}</button
				>{/each}
		</div>
		<strong>Unlinked diagrams</strong>{#each orphanDiagrams(project) as d (d.id)}<div
				class="outline-row"
			>
				<button
					onclick={() => {
						path = [project.rootDiagramId, d.id];
						selection = [];
					}}>{d.title}</button
				><button
					onclick={() => {
						if (
							confirm(
								'Delete this unlinked diagram? Its descendants will be kept as unlinked diagrams.'
							)
						)
							action(() => changed(deleteDiagram(project, d.id)));
					}}>Delete diagram</button
				>
			</div>{:else}<p class="help">
				No unlinked diagrams. Removing a figure never deletes its child content.
			</p>{/each}
	</details>
</div>

<style>
	.board-editor {
		padding: 24px;
		min-width: 0;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.board-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.board-heading h1 {
		font-size: 20px;
		line-height: 1.4;
		margin: 3px 0;
	}
	.eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--color-muted);
	}
	.heading-actions {
		display: flex;
		gap: 6px;
	}
	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 4px;
		overflow: auto;
		min-height: 36px;
	}
	.breadcrumbs button {
		white-space: nowrap;
		padding: 6px 9px;
		color: var(--color-muted);
	}
	.breadcrumbs button[aria-current] {
		color: var(--color-text);
	}
	.board-workspace {
		position: relative;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
		height: calc(100dvh - 245px);
		min-height: 510px;
	}
	.canvas-host {
		height: 100%;
		outline-offset: -3px;
		position: relative;
	}
	.floating-toolbar {
		position: absolute;
		z-index: 3;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		padding: 4px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		box-shadow: 0 3px 16px #00000012;
		max-width: calc(100% - 24px);
		overflow-x: auto;
	}
	.floating-toolbar button {
		position: relative;
		display: grid;
		place-items: center;
		min-width: 39px;
		height: 42px;
		border-radius: 6px;
	}
	.floating-toolbar button.chosen {
		background: color-mix(in srgb, var(--color-accent) 16%, transparent);
		color: var(--color-accent);
	}
	.key-hint {
		position: absolute;
		bottom: 1px;
		right: 4px;
		font-size: 8px;
		opacity: 0.5;
	}
	.toolbar-separator {
		height: 24px;
		border-left: 1px solid var(--color-border);
		margin: 0 4px;
	}
	.viewport-tools {
		position: absolute;
		left: 12px;
		bottom: 12px;
		z-index: 2;
		display: flex;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: hidden;
	}
	.viewport-tools button {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 40px;
		min-height: 40px;
		font-size: 12px;
	}
	.properties {
		position: absolute;
		left: 12px;
		top: 76px;
		width: 218px;
		max-height: calc(100% - 142px);
		overflow: auto;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 12px;
		z-index: 3;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow: 0 3px 16px #00000010;
	}
	.panel-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
	}
	.panel-title button {
		font-size: 20px;
	}
	.property-row {
		display: flex;
		gap: 8px;
		align-items: end;
	}
	.property-row > * {
		flex: 1;
		min-width: 0;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 11px;
		color: var(--color-muted);
	}
	label input,
	label select {
		width: 100%;
		min-width: 0;
		min-height: 32px;
		padding: 5px 7px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text);
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		font-size: 11px;
		color: var(--color-muted);
		margin-bottom: 7px;
	}
	.swatches {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}
	.swatches button {
		width: 23px;
		height: 23px;
		min-width: 23px;
		border: 1px solid #88888855;
		border-radius: 5px;
	}
	.swatches button[aria-pressed='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
	.swatches .transparent {
		background: var(--color-bg);
	}
	.check {
		flex-direction: row;
		align-items: center;
	}
	.check input {
		min-height: 0;
		width: auto;
	}
	.child-properties {
		display: flex;
		flex-direction: column;
		gap: 8px;
		border-top: 1px solid var(--color-border);
		padding-top: 12px;
		font-size: 12px;
	}
	.direct-text {
		position: absolute;
		z-index: 4;
		max-width: calc(100% - 8px);
		resize: none;
		line-height: 1.3;
		padding: 0 3px;
		background: var(--color-panel);
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		outline: none;
	}
	.board-status {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		font-size: 11px;
		color: var(--color-muted);
	}
	.board-status > span:first-child {
		color: var(--color-accent);
	}
	.help {
		font-size: 11px;
		color: var(--color-muted);
		line-height: 1.6;
		margin: 0;
	}
	.outline {
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 10px;
		font-size: 12px;
	}
	.outline summary {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	.outline > label {
		max-width: 300px;
		margin: 12px 0;
	}
	.outline-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 260px;
		overflow: auto;
		margin-bottom: 12px;
	}
	.outline-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.outline-row button {
		padding: 6px;
	}
	.outline-row button:first-child {
		flex: 1;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.outline-row button[aria-pressed='true'] {
		color: var(--color-accent);
	}
	.properties .button {
		padding: 7px;
		font-size: 11px;
		min-height: 32px;
	}
	@media (max-width: 800px) {
		.board-editor {
			padding: 16px;
		}
		.board-workspace {
			height: calc(100dvh - 240px);
			min-height: 540px;
		}
		.key-hint {
			display: none;
		}
		.floating-toolbar {
			left: 8px;
			right: 8px;
			top: 8px;
			transform: none;
			max-width: none;
			flex-wrap: wrap;
			justify-content: center;
		}
		.floating-toolbar button {
			min-width: 39px;
			height: 42px;
		}
		.properties {
			top: 112px;
			max-height: calc(100% - 174px);
		}
		.board-heading {
			align-items: start;
		}
		.board-heading h1 {
			font-size: 18px;
		}
		.eyebrow {
			font-size: 9px;
			letter-spacing: 0.09em;
		}
		.heading-actions .button {
			padding: 7px;
			min-height: 36px;
			font-size: 11px;
		}
		.board-status {
			flex-direction: column;
			gap: 3px;
		}
	}
	@media (max-width: 450px) {
		.floating-toolbar button {
			min-width: 42px;
			min-height: 44px;
		}
		.viewport-tools button {
			min-width: 42px;
			min-height: 44px;
		}
		.properties {
			left: 8px;
			width: 208px;
		}
		.swatches button {
			width: 26px;
			height: 26px;
		}
		.board-heading {
			flex-wrap: wrap;
		}
		.board-workspace {
			min-height: 570px;
		}
		.heading-actions {
			margin-left: auto;
		}
	}
</style>
