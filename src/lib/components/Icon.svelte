<script lang="ts">
	import {
		Braces,
		GitCompareArrows,
		ArrowLeftRight,
		Binary,
		Link,
		Shield,
		Hash,
		Database,
		Regex,
		Fingerprint,
		Clock,
		Terminal,
		Text,
		ArrowUpRight
	} from '@lucide/svelte';
	let { name, size = 18 }: { name: string; size?: number } = $props();
	const icons = {
		braces: Braces,
		diff: GitCompareArrows,
		swap: ArrowLeftRight,
		binary: Binary,
		link: Link,
		shield: Shield,
		hash: Hash,
		database: Database,
		regex: Regex,
		fingerprint: Fingerprint,
		clock: Clock,
		terminal: Terminal,
		text: Text
	};
	const Current = $derived(icons[name as keyof typeof icons] ?? ArrowUpRight);
</script>

<Current {size} strokeWidth={1.6} aria-hidden="true" />
