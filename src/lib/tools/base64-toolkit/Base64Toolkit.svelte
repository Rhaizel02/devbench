<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { encodeBase64, decodeBase64 } from './base64-engine';
	let direction = $state<'encode' | 'decode'>('encode');
	let urlSafe = $state(false);
	let padding = $state(true);
	let ignoreWhitespace = $state(true);
	let allowMissingPadding = $state(true);
	const codecOptions = $derived({ urlSafe, padding, ignoreWhitespace, allowMissingPadding });
	const sample = $derived(
		direction === 'encode'
			? 'Synthetic example: café 🌍 世界'
			: encodeBase64('Synthetic example: café 🌍 世界', codecOptions)
	);
	const transform = (input: string) =>
		direction === 'encode' ? encodeBase64(input, codecOptions) : decodeBase64(input, codecOptions);
</script>

<TextWorkspace
	{transform}
	revision={JSON.stringify({ direction, ...codecOptions })}
	{sample}
	action={direction === 'encode' ? 'Encode Base64' : 'Decode Base64'}
	inputLabel={direction === 'encode' ? 'UTF-8 input' : 'Base64 input'}
	outputLabel={direction === 'encode' ? 'Base64 output' : 'UTF-8 output'}
	filename="devbench-base64.txt"
	allowEmpty
	onSwap={() => (direction = direction === 'encode' ? 'decode' : 'encode')}
>
	{#snippet options()}
		<label
			>Direction<select aria-label="Base64 direction" bind:value={direction}
				><option value="encode">UTF-8 → Base64</option><option value="decode">Base64 → UTF-8</option
				></select
			></label
		>
		<label class="check-option"
			><input type="checkbox" bind:checked={urlSafe} />URL-safe alphabet</label
		>
		{#if direction === 'encode'}<label class="check-option"
				><input type="checkbox" bind:checked={padding} />Include padding</label
			>{:else}<label class="check-option"
				><input type="checkbox" bind:checked={ignoreWhitespace} />Ignore ASCII whitespace</label
			><label class="check-option"
				><input type="checkbox" bind:checked={allowMissingPadding} />Allow missing padding</label
			>{/if}
	{/snippet}
	{#snippet help()}<p>
			UTF-8 text only; invalid decoded bytes are rejected. Standard alphabet uses +/; URL-safe uses
			-_. Padding bits are validated. Optional whitespace handling ignores spaces, tabs and line
			breaks. Empty text encodes to an empty string. Base64 is encoding, not encryption.
		</p>{/snippet}
</TextWorkspace>
