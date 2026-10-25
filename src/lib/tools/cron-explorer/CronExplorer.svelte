<script lang="ts">
	import { exploreCron, type CronSyntax, type CronResult } from './cron-engine';
	import { errorMessage } from '../tool-errors';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	let expression = $state('');
	let syntax = $state<CronSyntax>('unix');
	let timeZone = $state('UTC');
	let count = $state(5);
	let start = $state('');
	let result = $state<CronResult | null>(null);
	let resultKey = $state('');
	let error = $state('');
	let errorKey = $state('');
	const key = $derived(JSON.stringify([expression, syntax, timeZone, count, start]));
	const current = $derived(key === resultKey ? result : null);
	function explore() {
		error = '';
		try {
			result = exploreCron(expression, syntax, timeZone, count, start || new Date().toISOString());
			resultKey = key;
		} catch (reason) {
			result = null;
			error = errorMessage(reason);
			errorKey = key;
		}
	}
	function reset() {
		expression = '';
		start = '';
		result = null;
		error = '';
	}
	function example() {
		reset();
		expression = syntax === 'unix' ? '30 2 * * *' : '0 30 2 * * *';
		timeZone = 'Europe/Madrid';
		start = '2024-10-26T23:00:00Z';
	}
</script>

<div class="tool-options">
	<label
		>Syntax<select aria-label="Cron syntax" bind:value={syntax}
			><option value="unix">Unix · 5 fields</option><option value="spring">Spring · 6 fields</option
			></select
		></label
	><label
		>Timezone<input class="field-input" aria-label="Cron timezone" bind:value={timeZone} /></label
	><label
		>Next occurrences<input
			class="field-input"
			type="number"
			min="1"
			max="20"
			aria-label="Occurrence count"
			bind:value={count}
		/></label
	>
</div>
<label class="field-label" for="cron-expression">Cron expression</label><input
	id="cron-expression"
	class="field-input wide-input"
	bind:value={expression}
	placeholder={syntax === 'unix' ? '*/15 9-17 * * MON-FRI' : '0 */15 9-17 * * MON-FRI'}
/>
<label class="field-label" for="cron-start"
	>Start after (ISO with offset; blank uses current time at click)</label
><input
	id="cron-start"
	class="field-input wide-input"
	bind:value={start}
	placeholder="2024-10-26T23:00:00Z"
/>
<div class="studio-actions">
	<div class="action-group">
		<button class="button primary" onclick={explore}>Explore schedule</button>
	</div>
	<div class="action-group">
		<button class="text-button" onclick={example}>Load synthetic example</button><button
			class="text-button"
			onclick={reset}>Reset</button
		>
	</div>
</div>
{#if error && errorKey === key}<div class="parse-error" role="alert">{error}</div>{/if}
<section class="result-section" aria-label="Schedule interpretation">
	<div class="section-bar"><h2>Schedule interpretation</h2></div>
	{#if current}<p class="schedule-description">{current.description}</p>
		<p class="tool-help">{current.dayRule}</p>
		<dl class="inspection-grid">
			{#each current.fields as field (field.name)}<dt>{field.name}</dt>
				<dd>{field.value}</dd>{/each}
		</dl>
		<div class="section-bar">
			<h2>Next occurrences</h2>
			<span>{current.timeZone}</span>
		</div>
		{#each current.occurrences as occurrence (occurrence.utc)}<div class="occurrence-row">
				<div><code>{occurrence.zoned}</code><span>{occurrence.utc}</span></div>
				<CopyButton text={occurrence.utc} label={'Copy occurrence ' + occurrence.utc} />
			</div>{:else}<p class="empty">
				No occurrence found inside the five-year search horizon.
			</p>{/each}
		{#if current.limited}<p class="security-notice">
				Fewer than requested found before {current.horizon}. This does not prove the expression can
				never match.
			</p>{/if}
		<p class="tool-help">{current.dstPolicy}</p>
	{:else}<p class="empty">
			Choose syntax and timezone to inspect the next matching instants. No task is scheduled.
		</p>{/if}
	<OutputActions
		text={current ? JSON.stringify(current, null, 2) : null}
		filename="devbench-cron.json"
		mime="application/json;charset=utf-8"
	/>
</section>
<div class="tool-help">
	<p>
		Uses Croner for parsing/iteration and cronstrue for description; the field table and explicit
		day rule govern interpretation. Unix has five fields; Spring has seconds first, AND day matching
		and ? only as an entire day wildcard. Sunday is 0 or 7, not Quartz weekday numbering. Lists,
		ranges, names and positive steps are supported. L/W/#, +, year fields and macros are explicitly
		unsupported. DST gaps are skipped and both matching overlap instants are shown. Limits: 512-byte
		expression, 1–20 results, five-year horizon, start year 1970–9990 and 64 rejected calendar
		candidates. Uses browser IANA timezone data; no timers or jobs are created.
	</p>
</div>
