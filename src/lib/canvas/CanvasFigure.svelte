<script lang="ts">
	import { Group, Rect, Ellipse, Line, Text, Path, Image as KonvaImage } from 'svelte-konva';
	import { FONT_FAMILIES, labelInk, type Element } from './model';
	import { figurePaths, figureSignature } from './sketch';
	let {
		element: e,
		zoom,
		labelColor,
		shared = false,
		bitmap
	}: {
		element: Element;
		zoom: number;
		labelColor: string;
		shared?: boolean;
		bitmap?: ImageBitmap;
	} = $props();
	const signature = $derived(figureSignature(e));
	const paths = $derived(figurePaths(signature));
</script>

<Group
	id={e.id}
	name="entity"
	x={e.x + e.width / 2}
	y={e.y + e.height / 2}
	offsetX={e.width / 2}
	offsetY={e.height / 2}
	rotation={e.rotation ?? 0}
>
	{#if e.kind === 'stroke'}
		<Line
			points={e.points?.flatMap((p) => [p.x, p.y]) ?? []}
			stroke={e.style.stroke}
			strokeWidth={e.style.width}
			dash={e.style.dashed ? [9, 6] : []}
			lineCap="round"
			lineJoin="round"
			tension={0.3}
			hitStrokeWidth={18 / zoom}
		/>
	{:else if e.kind === 'image'}
		{#if bitmap}<KonvaImage image={bitmap} width={e.width} height={e.height} />{:else}<Rect
				width={e.width}
				height={e.height}
				stroke={e.style.stroke}
				fill="rgba(128,128,128,0.1)"
			/><Text
				text="Loading local image…"
				width={e.width}
				y={e.height / 2 - 10}
				align="center"
				fill={labelColor}
				fontSize={14}
				listening={false}
			/>{/if}
	{:else}
		{#if e.kind === 'ellipse'}<Ellipse
				x={e.width / 2}
				y={e.height / 2}
				radiusX={e.width / 2}
				radiusY={e.height / 2}
				fill="rgba(0,0,0,0.001)"
			/>
		{:else if e.kind === 'diamond'}<Line
				points={[e.width / 2, 0, e.width, e.height / 2, e.width / 2, e.height, 0, e.height / 2]}
				closed
				fill="rgba(0,0,0,0.001)"
			/>
		{:else}<Rect
				width={e.width}
				height={e.height}
				cornerRadius={e.kind === 'rounded' ? Math.min(18, e.height / 4) : 0}
				fill="rgba(0,0,0,0.001)"
			/>{/if}
		{#each paths as path, i (i)}<Path
				data={path.d}
				stroke={path.stroke === 'none' ? undefined : path.stroke}
				strokeWidth={path.strokeWidth}
				fill={path.fill === 'none' ? undefined : path.fill}
				dash={e.style.dashed ? [9, 6] : []}
				lineCap="round"
				lineJoin="round"
				listening={false}
			/>{/each}
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
				x={e.width - 30}
				y={8}
				text={shared ? '⇉' : '↳'}
				fill={e.style.stroke}
				fontSize={20}
				listening={false}
			/>{/if}
	{/if}
</Group>
