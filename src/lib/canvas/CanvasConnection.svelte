<script lang="ts">
	import { Group, Line, Path } from 'svelte-konva';
	import { endpoint, type Connection, type Diagram, type Point } from './model';
	import { connectorControl, connectorVertices } from './operations';
	import { connectionPaths } from './sketch';
	let {
		connection: c,
		diagram,
		zoom
	}: { connection: Connection; diagram: Diagram; zoom: number } = $props();
	const vertices = $derived(connectorVertices(diagram, c));
	const path = $derived.by(() => {
		const a = endpoint(diagram, c.start),
			b = endpoint(diagram, c.end),
			p = connectorControl(diagram, c);
		return c.geometry === 'curve'
			? `M ${a.x} ${a.y} Q ${p.x} ${p.y} ${b.x} ${b.y}`
			: vertices.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
	});
	const paths = $derived(c.style.sketch ? connectionPaths(path, c.style, c.id) : []);
	const heads = $derived(c.heads ?? (c.kind === 'arrow' ? 'end' : 'none'));
	function triangle(tip: Point, previous: Point) {
		const a = Math.atan2(tip.y - previous.y, tip.x - previous.x),
			length = 12 + c.style.width;
		return [
			tip.x,
			tip.y,
			tip.x - length * Math.cos(a - 0.4),
			tip.y - length * Math.sin(a - 0.4),
			tip.x - length * Math.cos(a + 0.4),
			tip.y - length * Math.sin(a + 0.4)
		];
	}
</script>

<Group id={c.id} name="entity">
	<Line
		points={vertices.flatMap((p) => [p.x, p.y])}
		stroke={c.style.sketch ? 'rgba(0,0,0,0.001)' : c.style.stroke}
		strokeWidth={c.style.width}
		dash={c.style.dashed ? [9, 6] : []}
		hitStrokeWidth={18 / zoom}
		lineCap="round"
		lineJoin="round"
	/>
	{#each paths as path, i (i)}<Path
			data={path.d}
			stroke={path.stroke}
			strokeWidth={path.strokeWidth}
			dash={c.style.dashed ? [9, 6] : []}
			listening={false}
			lineCap="round"
			lineJoin="round"
		/>{/each}
	{#if heads === 'end' || heads === 'both'}<Line
			points={triangle(vertices.at(-1)!, vertices.at(-2)!)}
			closed
			fill={c.style.stroke}
			stroke={c.style.stroke}
			strokeWidth={0.5}
			listening={false}
		/>{/if}
	{#if heads === 'both'}<Line
			points={triangle(vertices[0], vertices[1])}
			closed
			fill={c.style.stroke}
			stroke={c.style.stroke}
			strokeWidth={0.5}
			listening={false}
		/>{/if}
</Group>
