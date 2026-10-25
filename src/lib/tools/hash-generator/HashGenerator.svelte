<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { hashText, type HashAlgorithm } from './hash-engine';
	let algorithm = $state<HashAlgorithm>('SHA-256');
	let uppercase = $state(false);
</script>

<TextWorkspace
	transform={(input) => hashText(input, algorithm, uppercase)}
	revision={algorithm + uppercase}
	action="Calculate hash"
	inputLabel="Text to hash"
	outputLabel="Hex digest"
	filename="devbench-hash.txt"
	sample="Synthetic example: café 世界"
	allowEmpty
>
	{#snippet options()}<label
			>Algorithm<select aria-label="Hash algorithm" bind:value={algorithm}>
				<option>SHA-256</option><option>SHA-384</option><option>SHA-512</option>
			</select></label
		><label class="check-option"
			><input type="checkbox" bind:checked={uppercase} />Uppercase hex</label
		>{/snippet}
	{#snippet help()}<p>
			Hashes UTF-8 text with browser Web Crypto. Empty input has a valid digest. Hashes are not
			encryption or password-storage key derivation functions. No normalization is applied to the
			input.
		</p>{/snippet}
</TextWorkspace>
