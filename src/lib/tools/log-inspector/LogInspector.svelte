<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { inspectLogs, filterLogs } from './log-engine';
	let level = $state('ALL'),
		text = $state(''),
		thread = $state(''),
		logger = $state(''),
		view = $state('structured');
	let report = $state<ReturnType<typeof inspectLogs> | null>(null);
	const sample =
		'2026-01-15T10:30:00.123Z INFO 123 --- [main] demo.App : Starting synthetic example\n2026-01-15T10:30:01.123Z ERROR 123 --- [main] demo.App : Request failed\njava.lang.IllegalStateException: Synthetic failure\n\tat demo.App.run(App.java:42)\n\tSuppressed: java.io.IOException: Synthetic close failure\n\t\tat demo.Resource.close(Resource.java:12)\nCaused by: java.net.ConnectException: Synthetic connection failure\n\tat demo.Client.connect(Client.java:20)\n\t... 2 more';
	function transform(input: string) {
		report = inspectLogs(input);
		const entries = filterLogs(report.entries, level, text, thread, logger);
		return view === 'original'
			? entries.map((e) => e.raw).join('\n')
			: JSON.stringify({ ...report, entries, visibleCount: entries.length }, null, 2);
	}
</script>

<TextWorkspace
	{transform}
	revision={JSON.stringify([level, text, thread, logger, view])}
	action="Inspect logs"
	inputLabel="Java / Spring logs"
	outputLabel="Log analysis"
	filename={view === 'original' ? 'logs.txt' : 'logs.json'}
	outputLanguage={view === 'original' ? 'plain' : 'json'}
	pasteToolId="BACK-08"
	onReset={() => {
		report = null;
		level = 'ALL';
		text = '';
		thread = '';
		logger = '';
	}}
	inputLimitLabel="1 MiB / 10,000 lines"
	{sample}
>
	{#snippet options()}<label
			>Level <select bind:value={level}
				>{#each ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'UNKNOWN'] as item (item)}<option
						value={item}>{item}</option
					>{/each}</select
			></label
		><label>Text <input class="field-input" bind:value={text} /></label><label
			>Thread <input class="field-input" bind:value={thread} /></label
		><label>Logger <input class="field-input" bind:value={logger} /></label><label
			>View <select bind:value={view}
				><option value="structured">Structured</option><option value="original"
					>Original filtered text</option
				></select
			></label
		>{/snippet}
	{#snippet details()}{#if report}<div class="tool-help">
				<p role="status">
					{report.total} entries · {report.counts.ERROR} ERROR · {report.counts.WARN} WARN · {report
						.counts.INFO} INFO · {report.counts.DEBUG} DEBUG · {report.counts.TRACE} TRACE · {report
						.counts.UNKNOWN} UNKNOWN
				</p>
				{#if report.possibleDeepestCause}<p>
						Possible deepest reported cause: <code>{report.possibleDeepestCause}</code>. This does
						not establish the functional root cause.
					</p>{/if}{#each filterLogs(report.entries, level, text, thread, logger).slice(0, 50) as entry (entry.line)}<div
						class="section-bar"
					>
						<span>Line {entry.line} · {entry.level}</span><CopyButton
							text={entry.raw}
							label={'Copy log entry at line ' + entry.line}
						/>
					</div>{/each}
				<p>First 50 entry copy controls shown; complete filtered output is available below.</p>
			</div>{/if}{/snippet}
	{#snippet help()}<p>
			Recognizes common ISO Java/Spring Boot level-first logs and time-of-day [thread] LEVEL Logback
			lines. Unknown text remains attached to the preceding entry, or in an initial UNKNOWN entry.
			Extracts Java exception names, frames, caused-by and suppressed sections; no external
			class/path links or automatic diagnosis. 1 MiB, 10,000 lines, 16,384 characters per line.
			Filters run explicitly with Inspect logs; editing filters invalidates the previous result.
		</p>{/snippet}
</TextWorkspace>
