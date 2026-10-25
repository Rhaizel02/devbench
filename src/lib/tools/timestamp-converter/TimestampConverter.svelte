<script lang="ts">
	import { onMount } from 'svelte';
	import { useAppState } from '#lib/state/app.svelte.js';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { convertTimestamp, type TimestampMode, type TimestampResult } from './timestamp-engine';
	import { errorMessage } from '../tool-errors';
	let input = $state('');
	let mode = $state<TimestampMode>('seconds');
	const app = useAppState();
	onMount(() => {
		const paste = app.consumePaste('UTIL-02');
		if (paste) {
			input = paste.text;
			mode = paste.mode ?? 'seconds';
		}
	});
	let timeZone = $state('UTC');
	let result = $state<TimestampResult | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	const key = $derived(JSON.stringify([input, mode, timeZone]));
	const current = $derived(key === resultKey ? result : null);
	const labels: Record<keyof TimestampResult, string> = {
		epochSeconds: 'Epoch seconds',
		epochMilliseconds: 'Epoch milliseconds',
		utc: 'UTC ISO',
		browserLocal: 'Browser local',
		browserTimeZone: 'Browser timezone',
		zoned: 'Selected zone',
		timeZone: 'IANA timezone'
	};
	function convert() {
		error = '';
		try {
			result = convertTimestamp(input, mode, timeZone);
			resultKey = key;
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
		}
	}
	function reset() {
		input = '';
		result = null;
		error = '';
	}
	function example() {
		reset();
		input =
			mode === 'seconds'
				? '1709208000.123'
				: mode === 'milliseconds'
					? '1709208000123'
					: '2024-02-29T13:00:00.123+01:00';
	}
	function now() {
		reset();
		const ms = Date.now();
		input =
			mode === 'iso' ? new Date(ms).toISOString() : String(mode === 'seconds' ? ms / 1000 : ms);
	}
</script>

<div class="tool-options">
	<label
		>Input format<select aria-label="Timestamp input format" bind:value={mode}
			><option value="seconds">Epoch seconds</option><option value="milliseconds"
				>Epoch milliseconds</option
			><option value="iso">ISO with explicit offset</option></select
		></label
	><label
		>Display timezone<input
			class="field-input"
			aria-label="Display timezone"
			bind:value={timeZone}
		/></label
	><button
		class="text-button"
		onclick={() => (timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone)}
		>Use browser timezone</button
	>
</div>
<label class="field-label" for="timestamp-value">Timestamp input</label><input
	id="timestamp-value"
	class="field-input wide-input"
	bind:value={input}
	placeholder={mode === 'iso'
		? '2024-02-29T13:00:00+01:00'
		: mode === 'seconds'
			? '1709208000.123'
			: '1709208000123'}
/>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={convert}>Convert timestamp</button><button
			class="button"
			onclick={now}>Use current time</button
		>
	</div>
	<div class="action-group">
		<button class="text-button" onclick={example}>Load synthetic example</button><button
			class="text-button"
			onclick={reset}>Reset</button
		>
	</div>
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="Timestamp interpretation">
	<div class="section-bar"><h2>One instant, explicit formats</h2></div>
	{#if current}{#each Object.entries(current) as [name, value] (name)}<div
				class="value-row timestamp-row"
			>
				<span>{labels[name as keyof TimestampResult]}</span><code>{value}</code><CopyButton
					text={value}
					label={'Copy ' + labels[name as keyof TimestampResult]}
				/>
			</div>{/each}{:else}<p class="empty">
			Choose units and a display timezone, then convert an instant.
		</p>{/if}
	<OutputActions
		text={current ? JSON.stringify(current, null, 2) : null}
		filename="devbench-timestamp.json"
		mime="application/json;charset=utf-8"
	/>
</section>
<div class="tool-help">
	<p>
		Seconds accept up to three fractional digits; milliseconds must be integers. Negative epochs are
		supported. ISO input accepts four-digit years and requires Z or a numeric offset; invalid
		calendar dates, leap seconds, offset-free local times and 24:00 are rejected. IANA timezone
		affects display, not interpretation of an explicit ISO offset. DST overlaps are distinguished by
		the given offset; ambiguous or nonexistent wall-clock times are not guessed. Date range:
		±8.64e15 milliseconds. Input cap: 1,024 bytes.
	</p>
</div>
