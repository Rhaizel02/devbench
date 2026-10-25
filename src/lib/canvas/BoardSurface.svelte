<script lang="ts">
	import { Stage, Layer, Group, Rect, Ellipse, Line, Arrow, Text, Circle } from 'svelte-konva';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import type { KonvaEventObject } from 'konva/lib/Node';
	import { onMount, untrack } from 'svelte';
	import {
		FONT_FAMILIES,
		labelInk,
		LIMITS,
		anchorAt,
		endpoint,
		moveSelection,
		resizeElement,
		screenToWorld,
		zoomAt,
		strokeElement,
		sketchPath,
		bounds,
		newId,
		type Diagram,
		type Point,
		type Viewport,
		type Style,
		type Element,
		type Connection
	} from './model';
	export type Mode = 'select' | 'pan' | Element['kind'] | 'line' | 'arrow';
	let {
		diagram,
		view,
		mode,
		style,
		selection,
		busy = false,
		onSelect,
		onCommit,
		onViewport,
		onText,
		onChild,
		onMeasure,
		onStatus,
		onFocus
	}: {
		diagram: Diagram;
		view: Viewport;
		mode: Mode;
		style: Style;
		selection: string[];
		busy?: boolean;
		onSelect: (ids: string[]) => void;
		onCommit: (d: Diagram) => void;
		onViewport: (v: Viewport) => void;
		onText: (id: string) => void;
		onChild: (id: string) => void;
		onMeasure: (w: number, h: number) => void;
		onStatus: (message: string) => void;
		onFocus: () => void;
	} = $props();
	let width = $state(0),
		height = $state(0),
		stage = $state<{ node: KonvaStage }>(),
		draft = $state.raw<Diagram | null>(null);
	type Gesture = {
		kind: 'create' | 'move' | 'resize' | 'endpoint' | 'pan';
		start: Point;
		screen: Point;
		original: Diagram;
		ids: string[];
		view: Viewport;
		end?: 'start' | 'end';
		id?: string;
	};
	let gesture: Gesture | null = null;
	let points: Point[] = [];
	let labelColor = $state('#ededf0');
	onMount(() => {
		const update = () => {
			labelColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--color-text')
				.trim();
		};
		update();
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
		return () => observer.disconnect();
	});
	const shown = $derived(draft ?? diagram);
	const entities = $derived(
		[
			...shown.elements.map((e) => ({ type: 'element' as const, value: e })),
			...shown.connections.map((c) => ({ type: 'connection' as const, value: c }))
		].sort((a, b) => a.value.z - b.value.z)
	);
	$effect(() => {
		const w = width,
			h = height;
		if (w && h) untrack(() => onMeasure(w, h));
	});
	const pointer = () => stage?.node.getPointerPosition() ?? null;
	const z = () =>
		Math.max(0, ...diagram.elements.map((e) => e.z), ...diagram.connections.map((c) => c.z)) + 1;
	function down(event: KonvaEventObject<PointerEvent>) {
		if (busy || event.evt.isPrimary === false || event.evt.button > 1) return;
		event.evt.preventDefault();
		onFocus();
		const screen = pointer();
		if (!screen) return;
		const world = screenToWorld(screen, view);
		const group = event.target.findAncestor('.entity', true),
			id = group?.id();
		const handle = event.target.name();
		let kind: Gesture['kind'] = 'create',
			ids = selection;
		if (mode === 'pan' || event.evt.button === 1) kind = 'pan';
		else if (handle.startsWith('resize-')) {
			kind = 'resize';
			ids = [handle.slice(7)];
		} else if (handle.startsWith('start-') || handle.startsWith('end-')) {
			kind = 'endpoint';
			ids = [handle.slice(handle.indexOf('-') + 1)];
		} else if (mode === 'select') {
			if (!id) {
				onSelect([]);
				return;
			}
			ids = event.evt.shiftKey
				? selection.includes(id)
					? selection.filter((x) => x !== id)
					: [...selection, id]
				: selection.includes(id)
					? selection
					: [id];
			onSelect(ids);
			if (!ids.includes(id)) return;
			kind = 'move';
		}
		gesture = {
			kind,
			start: world,
			screen,
			original: diagram,
			ids: [...ids],
			view: { ...view },
			id: kind === 'create' ? newId('item') : ids[0],
			end: handle.startsWith('start-') ? 'start' : 'end'
		};
		points = [world];
		if (kind === 'create') onSelect([]);
	}
	function move() {
		if (!gesture || busy) return;
		const screen = pointer();
		if (!screen) return;
		const g = gesture,
			world = screenToWorld(screen, g.view),
			dx = world.x - g.start.x,
			dy = world.y - g.start.y;
		if (g.kind === 'pan') {
			onViewport({
				...g.view,
				x: g.view.x + screen.x - g.screen.x,
				y: g.view.y + screen.y - g.screen.y
			});
			return;
		}
		if (g.kind === 'move') {
			draft = moveSelection(g.original, g.ids, { x: dx, y: dy });
			return;
		}
		if (g.kind === 'resize') {
			draft = {
				...g.original,
				elements: g.original.elements.map((e) =>
					e.id === g.id ? resizeElement(e, world.x - e.x, world.y - e.y) : e
				)
			};
			return;
		}
		if (g.kind === 'endpoint') {
			draft = {
				...g.original,
				connections: g.original.connections.map((c) =>
					c.id === g.id ? { ...c, [g.end!]: anchorAt(g.original, world) } : c
				)
			};
			return;
		}
		if (mode === 'stroke') {
			if (points.length >= LIMITS.points) {
				onStatus('Stroke limit: 2,000 points. Release and start another.');
				return;
			}
			if (Math.hypot(world.x - points.at(-1)!.x, world.y - points.at(-1)!.y) * view.zoom < 2)
				return;
			points.push(world);
			if (points.length > 1)
				draft = {
					...g.original,
					elements: [...g.original.elements, strokeElement(g.id!, points, style, z())]
				};
			return;
		}
		if (mode === 'line' || mode === 'arrow') {
			const connection: Connection = {
				id: g.id!,
				kind: mode,
				start: anchorAt(g.original, g.start),
				end: anchorAt(g.original, world),
				style: { ...style },
				z: z()
			};
			draft = { ...g.original, connections: [...g.original.connections, connection] };
			return;
		}
		if (mode === 'select' || mode === 'pan') return;
		const element: Element = {
			id: g.id!,
			kind: mode,
			label: '',
			x: Math.min(g.start.x, world.x),
			y: Math.min(g.start.y, world.y),
			width: Math.max(1, Math.abs(dx)),
			height: Math.max(1, Math.abs(dy)),
			style: { ...style },
			z: z()
		};
		draft = { ...g.original, elements: [...g.original.elements, element] };
	}
	function finish() {
		const g = gesture;
		if (!g) return;
		let next = draft;
		if (g.kind === 'create' && mode === 'text' && !next) {
			next = {
				...g.original,
				elements: [
					...g.original.elements,
					{
						id: g.id!,
						kind: 'text',
						label: '',
						x: g.start.x,
						y: g.start.y,
						width: 260,
						height: 70,
						style: { ...style },
						z: z()
					}
				]
			};
		}
		if (next) {
			if (next.elements.length > LIMITS.elements || next.connections.length > LIMITS.connections)
				onStatus('Diagram limit: 500 figures and 500 connectors.');
			else {
				onCommit(next);
				onSelect(g.kind === 'create' ? [g.id!] : g.ids);
				if (g.kind === 'create' && mode === 'text') onText(g.id!);
			}
		}
		gesture = null;
		draft = null;
		points = [];
	}
	export function cancel() {
		gesture = null;
		draft = null;
		points = [];
	}
	export function exportPNG(): string {
		if (!stage) throw new Error('Canvas is not ready.');
		const b = bounds(diagram),
			w = Math.ceil(b.width + 64),
			h = Math.ceil(b.height + 64);
		if (w > 4096 || h > 4096 || w * h > 12_000_000)
			throw new Error('PNG exceeds 4,096 px or 12 megapixels. Export project JSON instead.');
		const copy = stage.node.clone({
			container: document.createElement('div'),
			width: w,
			height: h,
			x: 32 - b.x,
			y: 32 - b.y,
			scaleX: 1,
			scaleY: 1
		}) as KonvaStage;
		try {
			copy.find('.selection').forEach((node) => node.destroy());
			copy.draw();
			return copy.toDataURL({ pixelRatio: 1 });
		} finally {
			copy.destroy();
		}
	}
</script>

<div
	class="surface"
	data-testid="board-surface"
	bind:clientWidth={width}
	bind:clientHeight={height}
	style:cursor={busy
		? 'wait'
		: mode === 'pan'
			? 'grab'
			: mode === 'select'
				? 'default'
				: 'crosshair'}
	style:background-position={`${view.x}px ${view.y}px`}
	style:background-size={`${24 * view.zoom}px ${24 * view.zoom}px`}
>
	{#if width && height}<Stage
			bind:this={stage}
			{width}
			{height}
			x={view.x}
			y={view.y}
			scaleX={view.zoom}
			scaleY={view.zoom}
			onpointerdown={down}
			onpointermove={move}
			onpointerup={finish}
			onpointerleave={finish}
			onpointercancel={cancel}
			onwheel={(event) => {
				event.evt.preventDefault();
				if (!busy && !gesture) {
					const p = pointer();
					if (p) onViewport(zoomAt(view, event.evt.deltaY > 0 ? 1 / 1.12 : 1.12, p));
				}
			}}
			onpointerdblclick={(event) => {
				const id = event.target.findAncestor('.entity', true)?.id();
				const e = diagram.elements.find((e) => e.id === id);
				if (mode === 'select' && e) {
					if (e.childDiagramId) onChild(e.id);
					else onText(e.id);
				}
			}}
		>
			<Layer>
				{#each entities as item (item.value.id)}
					{#if item.type === 'element'}{@const e = item.value}
						<Group id={e.id} name="entity" x={e.x} y={e.y}>
							{#if e.kind === 'stroke'}<Line
									points={e.points?.flatMap((p) => [p.x, p.y]) ?? []}
									stroke={e.style.stroke}
									strokeWidth={e.style.width}
									dash={e.style.dashed ? [9, 6] : []}
									lineCap="round"
									lineJoin="round"
									tension={0.3}
									hitStrokeWidth={18 / view.zoom}
								/>
							{:else}
								{#if e.kind === 'ellipse'}<Ellipse
										x={e.width / 2}
										y={e.height / 2}
										radiusX={e.width / 2}
										radiusY={e.height / 2}
										fill={e.style.fill}
										stroke={e.style.stroke}
										strokeWidth={e.style.width}
										dash={e.style.dashed ? [9, 6] : []}
									/>
									{#if e.style.sketch}<Ellipse
											x={e.width / 2 + 1}
											y={e.height / 2 + 1}
											radiusX={Math.max(1, e.width / 2 - 1.5)}
											radiusY={Math.max(1, e.height / 2 - 1)}
											stroke={e.style.stroke}
											strokeWidth={0.6}
											opacity={0.5}
											listening={false}
										/>{/if}
								{:else if e.kind === 'diamond'}<Line
										points={[
											e.width / 2,
											0,
											e.width,
											e.height / 2,
											e.width / 2,
											e.height,
											0,
											e.height / 2
										]}
										closed
										fill={e.style.fill}
										stroke={e.style.stroke}
										strokeWidth={e.style.width}
										dash={e.style.dashed ? [9, 6] : []}
									/>
								{:else}<Rect
										width={e.width}
										height={e.height}
										fill={e.kind === 'text' ? 'rgba(0,0,0,0.001)' : e.style.fill}
										stroke={e.kind === 'text' ? undefined : e.style.stroke}
										strokeWidth={e.style.width}
										dash={e.style.dashed ? [9, 6] : []}
										cornerRadius={e.kind === 'rounded' ? Math.min(18, e.height / 4) : 2}
									/>{/if}
								{#if e.style.sketch && ['rectangle', 'diamond'].includes(e.kind)}<Line
										points={sketchPath(e.kind, e.width, e.height)}
										closed
										stroke={e.style.stroke}
										strokeWidth={0.6}
										opacity={0.5}
										listening={false}
									/>{/if}
								<Text
									x={e.kind === 'text' ? 0 : 12}
									y={e.kind === 'text' ? 0 : Math.max(12, (e.height - e.style.fontSize * 1.3) / 2)}
									width={Math.max(1, e.width - (e.kind === 'text' ? 0 : 24))}
									height={Math.max(1, e.height - 8)}
									text={e.label || (e.childDiagramId ? 'Diagram' : '')}
									fontFamily={FONT_FAMILIES[e.style.font]}
									fontSize={e.style.fontSize}
									fill={e.kind === 'text' ? e.style.stroke : labelInk(e.style.fill, labelColor)}
									lineHeight={1.3}
									align={e.kind === 'text' ? 'left' : 'center'}
									listening={false}
								/>
								{#if e.childDiagramId}<Text
										x={e.width - 26}
										y={8}
										text="↳"
										fill={e.style.stroke}
										fontSize={18}
										listening={false}
									/>{/if}
							{/if}
						</Group>
					{:else}{@const c = item.value}{@const a = endpoint(shown, c.start)}{@const b = endpoint(
							shown,
							c.end
						)}
						<Group id={c.id} name="entity">
							{#if c.kind === 'arrow'}<Arrow
									points={[a.x, a.y, b.x, b.y]}
									stroke={c.style.stroke}
									fill={c.style.stroke}
									strokeWidth={c.style.width}
									dash={c.style.dashed ? [9, 6] : []}
									pointerLength={12}
									pointerWidth={10}
									lineCap="round"
									hitStrokeWidth={18 / view.zoom}
								/>
							{:else}<Line
									points={[a.x, a.y, b.x, b.y]}
									stroke={c.style.stroke}
									strokeWidth={c.style.width}
									dash={c.style.dashed ? [9, 6] : []}
									lineCap="round"
									hitStrokeWidth={18 / view.zoom}
								/>{/if}
						</Group>
					{/if}
				{/each}
			</Layer>
			<Layer name="selection">
				{#each shown.elements.filter((e) => selection.includes(e.id)) as e (e.id)}
					<Rect
						x={e.x - 5 / view.zoom}
						y={e.y - 5 / view.zoom}
						width={e.width + 10 / view.zoom}
						height={e.height + 10 / view.zoom}
						stroke="#20bfa9"
						strokeWidth={1 / view.zoom}
						dash={[4 / view.zoom, 4 / view.zoom]}
						listening={false}
					/>
					{#if selection.length === 1 && mode === 'select'}<Rect
							name={'resize-' + e.id}
							x={e.x + e.width - 6 / view.zoom}
							y={e.y + e.height - 6 / view.zoom}
							width={12 / view.zoom}
							height={12 / view.zoom}
							fill="#20bfa9"
							stroke="#ffffff"
							strokeWidth={1 / view.zoom}
						/>{/if}
				{/each}
				{#each shown.connections.filter((c) => selection.includes(c.id)) as c (c.id)}{@const a =
						endpoint(shown, c.start)}{@const b = endpoint(shown, c.end)}
					<Circle
						name={'start-' + c.id}
						x={a.x}
						y={a.y}
						radius={7 / view.zoom}
						fill="#20bfa9"
						stroke="#ffffff"
						strokeWidth={1 / view.zoom}
					/>
					<Circle
						name={'end-' + c.id}
						x={b.x}
						y={b.y}
						radius={7 / view.zoom}
						fill="#20bfa9"
						stroke="#ffffff"
						strokeWidth={1 / view.zoom}
					/>
				{/each}
			</Layer>
		</Stage>{/if}
</div>

<style>
	.surface {
		width: 100%;
		height: 100%;
		min-width: 0;
		overflow: hidden;
		touch-action: none;
		background-color: var(--color-bg);
		background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
	}
</style>
