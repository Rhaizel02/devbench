<script lang="ts">
	import { Stage, Layer, Group, Rect, Text, Line, Arrow } from 'svelte-konva';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import type { KonvaEventObject } from 'konva/lib/Node';
	import { onMount, untrack } from 'svelte';
	import {
		connectionPoints,
		screenToWorld,
		zoomAt,
		LIMITS,
		type Diagram,
		type Point,
		type Viewport
	} from './model';
	let {
		diagram,
		view,
		mode,
		selectedId,
		busy,
		onSelect,
		onMove,
		onViewport,
		onStroke,
		onOpen,
		onMeasure,
		onStatus,
		onFocus
	}: {
		diagram: Diagram;
		view: Viewport;
		mode: 'select' | 'draw' | 'connect' | 'pan';
		selectedId: string;
		busy: boolean;
		onSelect: (id: string) => void;
		onMove: (id: string, point: Point) => void;
		onViewport: (view: Viewport) => void;
		onStroke: (points: Point[]) => void;
		onOpen: (id: string) => void;
		onMeasure: (width: number, height: number) => void;
		onStatus: (message: string) => void;
		onFocus: () => void;
	} = $props();
	let width = $state(0),
		height = $state(0);
	let stage: { node: KonvaStage } | undefined = $state();
	let ink = $state<Point[]>([]);
	let pan: { point: Point; view: Viewport } | null = null;
	let palette = $state({
		panel: '#1c1b1d',
		rail: '#131315',
		text: '#ededf0',
		muted: '#a1a1aa',
		accent: '#4fdbc8',
		border: '#2d2d32'
	});
	$effect(() => {
		const w = width,
			h = height;
		if (w > 0 && h > 0) untrack(() => onMeasure(w, h));
	});
	onMount(() => {
		let active = true;
		const updateTheme = () => {
			const css = getComputedStyle(document.documentElement);
			palette = {
				panel: css.getPropertyValue('--color-panel').trim(),
				rail: css.getPropertyValue('--color-rail').trim(),
				text: css.getPropertyValue('--color-text').trim(),
				muted: css.getPropertyValue('--color-muted').trim(),
				accent: css.getPropertyValue('--color-accent').trim(),
				border: css.getPropertyValue('--color-border').trim()
			};
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
		void document.fonts.ready.then(() => {
			if (active) stage?.node.batchDraw();
		});
		return () => {
			active = false;
			observer.disconnect();
			pan = null;
		};
	});
	const pointer = () => stage?.node.getPointerPosition() ?? null;
	function down(event: KonvaEventObject<PointerEvent>) {
		if (busy || event.evt.button > 1 || event.evt.isPrimary === false) return;
		onFocus();
		const point = pointer();
		if (!point) return;
		if (mode === 'draw' && event.evt.button === 0) {
			event.evt.preventDefault();
			ink = [screenToWorld(point, view)];
		} else if (mode === 'pan' || event.evt.button === 1) {
			event.evt.preventDefault();
			pan = { point, view: { ...view } };
		} else if (event.target === stage?.node) onSelect('');
	}
	function move() {
		if (busy) return;
		const point = pointer();
		if (!point) return;
		if (pan)
			onViewport({
				...pan.view,
				x: pan.view.x + point.x - pan.point.x,
				y: pan.view.y + point.y - pan.point.y
			});
		else if (ink.length) {
			if (ink.length >= LIMITS.strokePoints) {
				onStatus('Stroke reached 2,000 points. Release and start another.');
				return;
			}
			const next = screenToWorld(point, view),
				last = ink.at(-1)!;
			if (Math.hypot(next.x - last.x, next.y - last.y) * view.zoom >= 2) ink = [...ink, next];
		}
	}
	function finish() {
		if (ink.length > 1) onStroke(ink);
		ink = [];
		pan = null;
	}
	function pick(event: KonvaEventObject<PointerEvent>, id: string) {
		if (busy || mode === 'draw' || mode === 'pan' || event.evt.button !== 0) return;
		event.cancelBubble = true;
		onFocus();
		onSelect(id);
	}
	function drag(event: KonvaEventObject<Event>, id: string) {
		if (!busy) onMove(id, { x: event.target.x(), y: event.target.y() });
	}
</script>

<div
	class="surface"
	bind:clientWidth={width}
	bind:clientHeight={height}
	data-testid="konva-surface"
	style:cursor={busy ? 'wait' : mode === 'draw' ? 'crosshair' : mode === 'pan' ? 'grab' : 'default'}
	style:background-size={`${24 * view.zoom}px ${24 * view.zoom}px`}
	style:background-position={`${view.x}px ${view.y}px`}
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
			onpointercancel={() => {
				ink = [];
				pan = null;
			}}
			onwheel={(event) => {
				event.evt.preventDefault();
				if (!busy && !ink.length) {
					const anchor = pointer();
					if (anchor) onViewport(zoomAt(view, event.evt.deltaY > 0 ? 1 / 1.12 : 1.12, anchor));
				}
			}}
		>
			<Layer>
				{#each diagram.connections as connection (connection.id)}
					{#if connection.kind === 'arrow'}<Arrow
							points={connectionPoints(diagram, connection)}
							stroke={selectedId === connection.id ? palette.accent : palette.muted}
							fill={palette.muted}
							strokeWidth={selectedId === connection.id ? 2.5 : 1.5}
							pointerLength={9}
							pointerWidth={8}
							strokeScaleEnabled={false}
							hitStrokeWidth={18 / view.zoom}
							listening={mode === 'select' && !busy}
							onpointerdown={(event) => pick(event, connection.id)}
						/>
					{:else}<Line
							points={connectionPoints(diagram, connection)}
							stroke={selectedId === connection.id ? palette.accent : palette.muted}
							strokeWidth={2}
							strokeScaleEnabled={false}
							hitStrokeWidth={18 / view.zoom}
							listening={mode === 'select' && !busy}
							onpointerdown={(event) => pick(event, connection.id)}
						/>{/if}
				{/each}
				{#each diagram.elements as element (element.id)}
					<Group
						x={element.x}
						y={element.y}
						draggable={mode === 'select' && !busy}
						listening={mode !== 'draw' && !busy}
						onpointerdown={(event) => pick(event, element.id)}
						ondragstart={() => onSelect(element.id)}
						ondragmove={(event) => drag(event, element.id)}
						ondragend={(event) => drag(event, element.id)}
						ondblclick={() => {
							if (mode === 'select' && !busy && element.childDiagramId) onOpen(element.id);
						}}
					>
						{#if element.kind === 'stroke'}<Line
								points={(element.points ?? []).flatMap((point) => [point.x, point.y])}
								stroke={palette.accent}
								strokeWidth={2}
								strokeScaleEnabled={false}
								lineCap="round"
								lineJoin="round"
								hitStrokeWidth={18 / view.zoom}
							/>
							{#if selectedId === element.id}<Rect
									x={-5}
									y={-5}
									width={element.width + 10}
									height={element.height + 10}
									stroke={palette.accent}
									strokeWidth={1}
									dash={[4, 4]}
									listening={false}
								/>{/if}
						{:else}
							<Rect
								width={element.width}
								height={element.height}
								fill={element.kind === 'rectangle' ? palette.panel : undefined}
								stroke={selectedId === element.id
									? palette.accent
									: element.kind === 'rectangle'
										? palette.border
										: undefined}
								strokeWidth={selectedId === element.id ? 2 : 1}
								strokeScaleEnabled={false}
								cornerRadius={5}
							/>
							{#if element.kind === 'rectangle'}<Rect
									x={0}
									y={0}
									width={3}
									height={element.height}
									fill={element.childDiagramId ? palette.accent : palette.muted}
									cornerRadius={2}
									listening={false}
								/>{/if}
							<Text
								x={element.kind === 'rectangle' ? 16 : 0}
								y={element.kind === 'rectangle' ? 22 : 8}
								width={element.width - (element.kind === 'rectangle' ? 32 : 0)}
								height={element.kind === 'rectangle' ? 34 : element.height - 8}
								text={element.label}
								fill={element.kind === 'text' ? palette.muted : palette.text}
								fontFamily="Geist, sans-serif"
								fontSize={element.kind === 'rectangle' ? 17 : 14}
								fontStyle={element.kind === 'rectangle' ? '600' : 'normal'}
								ellipsis
							/>
							{#if element.childDiagramId}<Text
									x={16}
									y={69}
									text="↳  Contains a diagram"
									fontFamily="Geist, sans-serif"
									fontSize={12}
									fill={palette.accent}
									listening={false}
								/>{/if}
						{/if}
					</Group>
				{/each}
			</Layer>
			<Layer listening={false}
				>{#if ink.length}<Line
						points={ink.flatMap((point) => [point.x, point.y])}
						stroke={palette.accent}
						strokeWidth={2}
						strokeScaleEnabled={false}
						lineCap="round"
						lineJoin="round"
					/>{/if}</Layer
			>
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
