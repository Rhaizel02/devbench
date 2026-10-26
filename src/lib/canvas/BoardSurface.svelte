<script lang="ts">
	import { Stage, Layer, Rect, Line, Circle } from 'svelte-konva';
	import type { Stage as KonvaStage } from 'konva/lib/Stage';
	import type { KonvaEventObject } from 'konva/lib/Node';
	import { onMount, untrack } from 'svelte';
	import CanvasFigure from './CanvasFigure.svelte';
	import CanvasConnection from './CanvasConnection.svelte';
	import {
		LIMITS,
		anchorAt,
		endpoint,
		expandGroups,
		localToWorld,
		moveSelection,
		resizeElement,
		screenToWorld,
		worldToLocal,
		zoomAt,
		strokeElement,
		newId,
		type Diagram,
		type Point,
		type Viewport,
		type Style,
		type Element,
		type Connection
	} from './model';
	import {
		connectorControl,
		documentBounds,
		marqueeSelection,
		rectangle,
		rotateSelection,
		scaleSelection,
		selectionBounds,
		type Box
	} from './operations';
	export type Mode = 'select' | 'pan' | Exclude<Element['kind'], 'image'> | 'line' | 'arrow';
	let {
		diagram,
		view,
		mode,
		style,
		selection,
		busy = false,
		sharedChildren = [],
		bitmaps,
		onSelect,
		onCommit,
		onViewport,
		onText,
		onChild,
		onMeasure,
		onStatus,
		onFocus,
		onCreated = () => {}
	}: {
		diagram: Diagram;
		view: Viewport;
		mode: Mode;
		style: Style;
		selection: string[];
		busy?: boolean;
		sharedChildren?: string[];
		bitmaps?: Map<string, ImageBitmap>;
		onSelect: (ids: string[]) => void;
		onCommit: (diagram: Diagram) => void;
		onViewport: (view: Viewport) => void;
		onText: (id: string) => void;
		onChild: (id: string) => void;
		onMeasure: (width: number, height: number) => void;
		onStatus: (message: string) => void;
		onFocus: () => void;
		onCreated?: () => void;
	} = $props();
	let width = $state(0),
		height = $state(0),
		stage = $state<{ node: KonvaStage }>(),
		host: HTMLDivElement;
	let draft = $state.raw<Diagram | null>(null),
		marquee = $state<Box | null>(null),
		labelColor = $state('#ededf0');
	type Gesture = {
		kind: 'create' | 'move' | 'resize' | 'rotate' | 'endpoint' | 'control' | 'pan' | 'marquee';
		start: Point;
		screen: Point;
		original: Diagram;
		ids: string[];
		view: Viewport;
		id?: string;
		end?: 'start' | 'end';
		shift: boolean;
		pointerId: number;
	};
	let gesture: Gesture | null = null,
		points: Point[] = [];
	let space = $state(false);
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Pointer bookkeeping must not trigger a render per sample.
	const pointers = new Map<number, Point>();
	let pinch: { view: Viewport; mid: Point; distance: number; world: Point } | null = null;
	const shown = $derived(draft ?? diagram);
	const entities = $derived(
		[
			...shown.elements.map((value) => ({ type: 'element' as const, value })),
			...shown.connections.map((value) => ({ type: 'connection' as const, value }))
		].sort((a, b) => a.value.z - b.value.z)
	);
	const validSelection = $derived(
		selection.filter(
			(id) => shown.elements.some((e) => e.id === id) || shown.connections.some((c) => c.id === id)
		)
	);
	const selectedBox = $derived(
		validSelection.length ? selectionBounds(shown, validSelection) : null
	);
	$effect(() => {
		const w = width,
			h = height;
		if (w && h) untrack(() => onMeasure(w, h));
	});
	onMount(() => {
		const update = () =>
			(labelColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--color-text')
				.trim());
		update();
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
		return () => {
			observer.disconnect();
			pointers.clear();
		};
	});
	function screen(event: PointerEvent): Point {
		const b = host.getBoundingClientRect();
		return { x: event.clientX - b.x, y: event.clientY - b.y };
	}
	const z = () =>
		Math.max(0, ...diagram.elements.map((e) => e.z), ...diagram.connections.map((e) => e.z)) + 1;
	function capture(e: PointerEvent) {
		try {
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* Some synthetic events have no active capture. */
		}
	}
	function release(e: PointerEvent) {
		try {
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* Already cancelled or released. */
		}
	}
	function down(event: KonvaEventObject<PointerEvent>) {
		const e = event.evt;
		if (busy || e.button > 1) return;
		e.preventDefault();
		onFocus();
		const p = screen(e);
		pointers.set(e.pointerId, p);
		capture(e);
		if (pointers.size >= 2) {
			gesture = null;
			draft = null;
			marquee = null;
			points = [];
			const [a, b] = [...pointers.values()],
				mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
			pinch = {
				view: { ...view },
				mid,
				distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
				world: screenToWorld(mid, view)
			};
			return;
		}
		const world = screenToWorld(p, view),
			id = event.target.findAncestor('.entity', true)?.id(),
			handle = event.target.name();
		let kind: Gesture['kind'] = 'create',
			ids = selection;
		if (mode === 'pan' || space || e.button === 1) kind = 'pan';
		else if (handle === 'resize-selection') kind = 'resize';
		else if (handle === 'rotate-selection') kind = 'rotate';
		else if (handle.startsWith('control-')) {
			kind = 'control';
			ids = [handle.slice(8)];
		} else if (handle.startsWith('start-') || handle.startsWith('end-')) {
			kind = 'endpoint';
			ids = [handle.slice(handle.indexOf('-') + 1)];
		} else if (mode === 'select') {
			if (!id) {
				kind = e.pointerType === 'touch' ? 'pan' : 'marquee';
				if (!e.shiftKey) onSelect([]);
			} else {
				const unit = expandGroups(diagram, [id]);
				ids = e.shiftKey
					? unit.every((id) => selection.includes(id))
						? selection.filter((id) => !unit.includes(id))
						: [...new Set([...selection, ...unit])]
					: selection.includes(id)
						? selection
						: unit;
				onSelect(ids);
				if (!ids.includes(id)) {
					release(e);
					pointers.delete(e.pointerId);
					return;
				}
				kind = 'move';
			}
		}
		gesture = {
			kind,
			start: world,
			screen: p,
			original: diagram,
			ids: [...ids],
			view: { ...view },
			id: kind === 'create' ? newId('item') : ids[0],
			end: handle.startsWith('start-') ? 'start' : 'end',
			shift: e.shiftKey,
			pointerId: e.pointerId
		};
		points = [world];
		if (kind === 'create') onSelect([]);
	}
	function move(event: KonvaEventObject<PointerEvent>) {
		const e = event.evt,
			p = screen(e);
		if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
		if (pinch && pointers.size >= 2) {
			e.preventDefault();
			const [a, b] = [...pointers.values()],
				mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
				zoom = Math.max(
					0.2,
					Math.min(4, (pinch.view.zoom * Math.hypot(b.x - a.x, b.y - a.y)) / pinch.distance)
				);
			onViewport({ zoom, x: mid.x - pinch.world.x * zoom, y: mid.y - pinch.world.y * zoom });
			return;
		}
		const g = gesture;
		if (!g || busy || g.pointerId !== e.pointerId) return;
		e.preventDefault();
		const world = screenToWorld(p, g.view),
			dx = world.x - g.start.x,
			dy = world.y - g.start.y;
		if (Math.hypot(p.x - g.screen.x, p.y - g.screen.y) < 2 && !draft && !marquee) return;
		if (g.kind === 'pan') {
			onViewport({ ...g.view, x: g.view.x + p.x - g.screen.x, y: g.view.y + p.y - g.screen.y });
			return;
		}
		if (g.kind === 'marquee') {
			marquee = rectangle(g.start, world);
			onSelect(marqueeSelection(g.original, marquee, g.ids, g.shift));
			return;
		}
		if (g.kind === 'move') {
			draft = moveSelection(g.original, g.ids, { x: dx, y: dy });
			return;
		}
		if (g.kind === 'rotate') {
			const b = selectionBounds(g.original, g.ids),
				center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
			let angle =
				((Math.atan2(world.y - center.y, world.x - center.x) -
					Math.atan2(g.start.y - center.y, g.start.x - center.x)) *
					180) /
				Math.PI;
			if (e.shiftKey) angle = Math.round(angle / 15) * 15;
			draft = rotateSelection(g.original, g.ids, angle, center);
			return;
		}
		if (g.kind === 'resize') {
			if (g.ids.length === 1) {
				const element = g.original.elements.find((e) => e.id === g.id);
				if (element) {
					const p = worldToLocal(element, world),
						resized = resizeElement(element, p.x, p.y),
						theta = ((element.rotation ?? 0) * Math.PI) / 180;
					// Keep the opposite rotated corner fixed while changing the center.
					const dw = (resized.width - element.width) / 2,
						dh = (resized.height - element.height) / 2;
					const next = {
						...resized,
						x: element.x + dw * Math.cos(theta) - dh * Math.sin(theta) - dw,
						y: element.y + dw * Math.sin(theta) + dh * Math.cos(theta) - dh
					};
					draft = {
						...g.original,
						elements: g.original.elements.map((e) => (e.id === g.id ? next : e))
					};
					return;
				}
			}
			const b = selectionBounds(g.original, g.ids),
				factor = Math.max(
					0.01,
					Math.max((world.x - b.x) / Math.max(1, b.width), (world.y - b.y) / Math.max(1, b.height))
				);
			try {
				draft = scaleSelection(g.original, g.ids, factor);
			} catch {
				onStatus('Resize exceeds figure limits.');
			}
			return;
		}
		if (g.kind === 'endpoint' || g.kind === 'control') {
			draft = {
				...g.original,
				connections: g.original.connections.map((c) =>
					c.id === g.id
						? g.kind === 'control'
							? { ...c, control: world }
							: { ...c, [g.end!]: anchorAt(g.original, world) }
						: c
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
			draft = {
				...g.original,
				elements: [...g.original.elements, strokeElement(g.id!, points, style, z())]
			};
			return;
		}
		if (mode === 'line' || mode === 'arrow') {
			const c: Connection = {
				id: g.id!,
				kind: mode,
				start: anchorAt(g.original, g.start),
				end: anchorAt(g.original, world),
				style: { ...style },
				z: z()
			};
			draft = { ...g.original, connections: [...g.original.connections, c] };
			return;
		}
		if (mode === 'select' || mode === 'pan') return;
		draft = {
			...g.original,
			elements: [
				...g.original.elements,
				{
					id: g.id!,
					kind: mode,
					label: '',
					...rectangle(g.start, world),
					width: Math.max(1, Math.abs(dx)),
					height: Math.max(1, Math.abs(dy)),
					style: { ...style },
					z: z()
				}
			]
		};
	}
	function finish(event: KonvaEventObject<PointerEvent>) {
		const e = event.evt;
		pointers.delete(e.pointerId);
		release(e);
		if (pinch) {
			if (pointers.size < 2) {
				pinch = null;
				gesture = null;
				draft = null;
			}
			return;
		}
		const g = gesture;
		if (!g || g.pointerId !== e.pointerId) return;
		let next = draft;
		if (g.kind === 'create' && mode === 'text' && !next)
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
		if (next) {
			if (next.elements.length > LIMITS.elements || next.connections.length > LIMITS.connections)
				onStatus('Diagram limit: 500 figures and 500 connectors.');
			else {
				onCommit(next);
				onSelect(g.kind === 'create' ? [g.id!] : g.ids);
				if (g.kind === 'create') {
					if (mode === 'text') onText(g.id!);
					if (mode !== 'stroke') onCreated();
				}
			}
		}
		gesture = null;
		draft = null;
		marquee = null;
		points = [];
	}
	export function cancel() {
		if (gesture?.kind === 'marquee') onSelect(gesture.ids);
		gesture = null;
		draft = null;
		marquee = null;
		points = [];
		pinch = null;
		pointers.clear();
	}
	export function exportPNG(): string {
		if (!stage) throw Error('Canvas is not ready.');
		if (diagram.elements.some((e) => e.assetId && !bitmaps?.has(e.assetId)))
			throw Error(
				'Local images are still loading. Wait for them before exporting PNG; JSON backup remains available.'
			);
		const b = documentBounds(diagram),
			w = Math.ceil(b.width + 64),
			h = Math.ceil(b.height + 64);
		if (w > 4096 || h > 4096 || w * h > 12_000_000)
			throw Error('PNG exceeds 4,096 px or 12 megapixels. Export project JSON instead.');
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
			copy.find('.selection').forEach((n) => n.destroy());
			copy.draw();
			return copy.toDataURL({ pixelRatio: 1 });
		} finally {
			copy.destroy();
		}
	}
	function spaceKey(event: KeyboardEvent, pressed: boolean) {
		const target = event.target as HTMLElement;
		if (target.matches('input,textarea,select') || target.isContentEditable) return;
		if (
			event.code === 'Space' &&
			(host.contains(document.activeElement) || document.activeElement?.closest('.canvas-host'))
		) {
			event.preventDefault();
			space = pressed;
		}
	}
</script>

<svelte:window
	onkeydown={(e) => spaceKey(e, true)}
	onkeyup={(e) => {
		if (e.code === 'Space') space = false;
	}}
	onblur={() => {
		space = false;
		cancel();
	}}
/>
<div
	class="surface"
	data-testid="board-surface"
	bind:this={host}
	bind:clientWidth={width}
	bind:clientHeight={height}
	style:cursor={busy
		? 'wait'
		: mode === 'pan' || space
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
			onpointercancel={cancel}
			onwheel={(event) => {
				event.evt.preventDefault();
				if (busy || gesture) return;
				const p = stage?.node.getPointerPosition();
				if (!p) return;
				if (event.evt.ctrlKey || event.evt.metaKey)
					onViewport(zoomAt(view, Math.exp(-event.evt.deltaY * 0.005), p));
				else onViewport({ ...view, x: view.x - event.evt.deltaX, y: view.y - event.evt.deltaY });
			}}
			onpointerdblclick={(event) => {
				const id = event.target.findAncestor('.entity', true)?.id(),
					e = diagram.elements.find((e) => e.id === id);
				if (mode === 'select' && e) {
					if (e.childDiagramId) onChild(e.id);
					else onText(e.id);
				}
			}}
		>
			<Layer
				>{#each entities as item (item.value.id)}{#if item.type === 'element'}<CanvasFigure
							element={item.value}
							zoom={view.zoom}
							{labelColor}
							shared={sharedChildren.includes(item.value.childDiagramId ?? '')}
							bitmap={bitmaps?.get(item.value.assetId ?? '')}
						/>{:else}<CanvasConnection
							connection={item.value}
							diagram={shown}
							zoom={view.zoom}
						/>{/if}{/each}</Layer
			>
			<Layer name="selection">
				{#if marquee}<Rect
						{...marquee}
						fill="rgba(32,191,169,0.08)"
						stroke="#20bfa9"
						strokeWidth={1 / view.zoom}
						listening={false}
					/>{/if}
				{#if selectedBox}{@const b = selectedBox}
					<Rect
						x={b.x - 5 / view.zoom}
						y={b.y - 5 / view.zoom}
						width={b.width + 10 / view.zoom}
						height={b.height + 10 / view.zoom}
						stroke="#20bfa9"
						strokeWidth={1 / view.zoom}
						dash={selection.length > 1 ? [] : [4 / view.zoom, 4 / view.zoom]}
						listening={false}
					/>
					{#if mode === 'select' && shown.elements.some((e) => selection.includes(e.id))}
						{@const single =
							selection.length === 1
								? shown.elements.find((e) => e.id === selection[0])
								: undefined}
						{@const corner = single
							? localToWorld(single, { x: single.width, y: single.height })
							: { x: b.x + b.width, y: b.y + b.height }}
						<Rect
							name="resize-selection"
							x={corner.x - 7 / view.zoom}
							y={corner.y - 7 / view.zoom}
							width={14 / view.zoom}
							height={14 / view.zoom}
							fill="#20bfa9"
							stroke="#ffffff"
							strokeWidth={1 / view.zoom}
						/>
						<Line
							points={[
								b.x + b.width / 2,
								b.y - 5 / view.zoom,
								b.x + b.width / 2,
								b.y - 28 / view.zoom
							]}
							stroke="#20bfa9"
							strokeWidth={1 / view.zoom}
							listening={false}
						/>
						<Circle
							name="rotate-selection"
							x={b.x + b.width / 2}
							y={b.y - 32 / view.zoom}
							radius={7 / view.zoom}
							fill="#20bfa9"
							stroke="#ffffff"
							strokeWidth={1 / view.zoom}
						/>
					{/if}
				{/if}
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
					{#if c.geometry === 'curve' || c.geometry === 'elbow'}{@const p = connectorControl(
							shown,
							c
						)}<Circle
							name={'control-' + c.id}
							x={p.x}
							y={c.geometry === 'elbow' ? (a.y + b.y) / 2 : p.y}
							radius={7 / view.zoom}
							fill="#ffffff"
							stroke="#20bfa9"
							strokeWidth={2 / view.zoom}
						/>{/if}
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
