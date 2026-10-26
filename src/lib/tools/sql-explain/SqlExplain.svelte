<script lang="ts">
	import { onDestroy } from 'svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import DiagnosticTree from '#lib/components/DiagnosticTree.svelte';
	import {
		type PlanDocument,
		type Finding,
		planSummary,
		cardinality,
		metric,
		comparePlans
	} from './explain-engine';
	import { smallPlan, complexPlan } from './fixtures';
	import { runDiagnosticTask } from '../diagnostics/task-client';
	import { readDiagnosticFile } from '../diagnostics/files';
	import { errorMessage, previewJson } from '../tool-errors';
	import '../diagnostics/diagnostics.css';
	type Analysis = {
		doc: PlanDocument;
		summary: ReturnType<typeof planSummary>;
		findings: Finding[];
	};
	type Comparison = {
		before: PlanDocument;
		after: PlanDocument;
		comparison: ReturnType<typeof comparePlans>;
	};
	let input = $state(''),
		after = $state(''),
		view = $state('plan'),
		error = $state(''),
		busy = $state(false),
		selected = $state(''),
		mode = $state('structure'),
		filter = $state('all'),
		planIndex = $state(0),
		mobile = $state('tree');
	let result = $state<Analysis | null>(null),
		comparison = $state<Comparison | null>(null);
	let pending: ReturnType<typeof runDiagnosticTask<Analysis | Comparison>> | undefined;
	let ticket = 0;
	let fileTicket = 0;
	let compareSelected = $state(['', '']);
	$effect(() => {
		void [input, after];
		ticket++;
		pending?.cancel();
		busy = false;
		result = null;
		comparison = null;
		error = '';
		selected = '';
	});
	onDestroy(() => {
		ticket++;
		fileTicket++;
		pending?.cancel();
		result = null;
		comparison = null;
	});
	const summary = $derived(result ? planSummary(result.doc, planIndex) : null);
	const node = $derived(
		result?.doc.nodes.find((n) => n.id === selected) ??
			result?.doc.nodes.find((n) => n.id === result?.doc.plans[planIndex]?.root)
	);
	const rows = $derived(
		(result?.doc.nodes ?? [])
			.filter(
				(n) =>
					n.id === result?.doc.plans[planIndex]?.root ||
					n.id.startsWith((result?.doc.plans[planIndex]?.root ?? 'none') + '/')
			)
			.filter(
				(n) =>
					filter === 'all' ||
					(filter === 'incomplete'
						? metric(n.raw, 'Actual Total Time') === undefined
						: filter === 'io'
							? Object.entries(n.raw).some(
									([k, v]) => /Blocks$/.test(k) && typeof v === 'number' && v > 0
								)
							: (cardinality(n).ratio ?? 1) >= 10 || (cardinality(n).ratio ?? 1) <= 0.1)
			)
			.map((n) => ({
				id: n.id,
				parent: n.parent,
				depth: n.depth,
				label: n.type + (n.relation ? ' · ' + n.relation : ''),
				search: n.index ?? '',
				branch: !!n.children.length,
				detail:
					mode === 'cost'
						? `cost ${metric(n.raw, 'Total Cost') ?? '—'} planner units`
						: mode === 'time'
							? `time ${metric(n.raw, 'Actual Total Time') ?? '—'} ms / loop (inclusive)`
							: mode === 'cardinality'
								? `rows ${metric(n.raw, 'Plan Rows') ?? '—'} estimated → ${metric(n.raw, 'Actual Rows') ?? '—'} observed / loop`
								: mode === 'io'
									? `shared hit ${metric(n.raw, 'Shared Hit Blocks') ?? '—'} · read ${metric(n.raw, 'Shared Read Blocks') ?? '—'} (inclusive)`
									: `rows ${metric(n.raw, 'Plan Rows') ?? '—'} → ${metric(n.raw, 'Actual Rows') ?? '—'} · loops ${metric(n.raw, 'Actual Loops') ?? '—'}`
			}))
	);
	async function run(compare = false) {
		pending?.cancel();
		const current = ++ticket;
		busy = true;
		error = '';
		result = null;
		comparison = null;
		try {
			pending = runDiagnosticTask<Analysis | Comparison>(
				new Worker(new URL('./explain.worker.ts', import.meta.url), { type: 'module' }),
				compare ? { input, after } : { input },
				compare ? 5000 : 3000
			);
			const data = await pending.promise;
			if (current !== ticket) return;
			if ('doc' in data) {
				result = data;
				planIndex = 0;
				selected = data.doc.plans[0].root;
				view = 'plan';
			} else {
				comparison = data;
				view = 'compare';
			}
		} catch (e) {
			if (current === ticket) error = errorMessage(e);
		} finally {
			if (current === ticket) busy = false;
		}
	}
	function reset() {
		ticket++;
		fileTicket++;
		pending?.cancel();
		input = '';
		after = '';
		result = null;
		comparison = null;
		error = '';
		busy = false;
		view = 'plan';
		selected = '';
		mode = 'structure';
		filter = 'all';
		planIndex = 0;
		mobile = 'tree';
	}
	async function load(file: File | undefined, side = false) {
		const current = ++fileTicket;
		const snapshot = side ? after : input;
		try {
			const text = await readDiagnosticFile(file);
			if (current !== fileTicket || text === undefined || snapshot !== (side ? after : input))
				return;
			if (side) after = text;
			else input = text;
		} catch (e) {
			if (current === fileTicket) error = errorMessage(e);
		}
	}
	const value = (n: number | undefined, suffix = '') =>
		n === undefined
			? '—'
			: n.toLocaleString('en-US', {
					maximumFractionDigits: 3,
					notation: Math.abs(n) >= 1e9 ? 'scientific' : 'standard'
				}) + suffix;
</script>

<div class="diagnostic-workspace">
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" onclick={() => run(false)} disabled={busy}>Analyze plan</button
			>{#if busy}<button
					class="button"
					onclick={() => {
						ticket++;
						pending?.cancel();
						busy = false;
					}}>Cancel</button
				>{/if}
		</div>
		<div class="action-group">
			<button
				class="button"
				onclick={() => {
					reset();
					input = smallPlan;
				}}>Small example</button
			><button
				class="button"
				onclick={() => {
					reset();
					input = complexPlan;
				}}>Complex example</button
			><button class="text-button" onclick={reset}>Reset</button>
		</div>
	</div>
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>PostgreSQL EXPLAIN source</h2>
			<span class="subtle-tag">2 MiB · JSON preferred</span>
		</div>
		<CodeEditor bind:value={input} label="EXPLAIN source" language="json" />
	</div>
	<div class="tool-options">
		<label
			>Local plan file<input
				type="file"
				aria-label="Local plan file"
				accept=".json,.txt,application/json,text/plain"
				onchange={(e) => {
					void load(e.currentTarget.files?.[0]);
					e.currentTarget.value = '';
				}}
			/></label
		><span class="tool-help">Local analysis only. Plans and query attributes stay in memory.</span>
	</div>
	<details class="diagnostic-note">
		<summary>How to obtain a plan safely</summary>
		<p>
			Run this yourself in PostgreSQL only when appropriate. EXPLAIN ANALYZE executes the statement;
			writes can have side effects. DevBench never connects to your database or executes SQL.
		</p>
		<pre>EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT JSON) SELECT …;</pre>
		<OutputActions
			text="EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT JSON) SELECT …;"
			filename="explain-instructions.sql"
		/>
		<p>
			For estimates without execution, use EXPLAIN (FORMAT JSON). Text support is a documented
			subset, not equivalent to JSON.
		</p>
	</details>
	{#if error}<p class="parse-error" role="alert">{error}</p>{/if}{#if busy}<p role="status">
			Analyzing locally…
		</p>{/if}
	<div class="diagnostic-tabs" aria-label="EXPLAIN views">
		<button class="button" aria-pressed={view === 'plan'} onclick={() => (view = 'plan')}
			>Plan</button
		><button class="button" aria-pressed={view === 'findings'} onclick={() => (view = 'findings')}
			>Findings{result ? ' · ' + result.findings.length : ''}</button
		><button class="button" aria-pressed={view === 'compare'} onclick={() => (view = 'compare')}
			>Compare plans</button
		>
	</div>
	{#if result && summary && view !== 'compare'}
		<div class="section-bar">
			<h2>{summary.analyzed ? 'Observed plan' : 'Estimates only'}</h2>
			{#if result.doc.plans.length > 1}<label
					>Plan<select
						aria-label="Plan document"
						bind:value={planIndex}
						onchange={() => (selected = '')}
						>{#each result.doc.plans as plan, i (plan.root)}<option value={i}>Plan {i + 1}</option
							>{/each}</select
					></label
				>{/if}<span class="subtle-tag">{result.doc.format.toUpperCase()}</span>
		</div>
		<dl class="diagnostic-summary">
			<div>
				<dt>Execution · ms</dt>
				<dd>{value(summary.executionMs)}</dd>
			</div>
			<div>
				<dt>Planning · ms</dt>
				<dd>{value(summary.planningMs)}</dd>
			</div>
			<div>
				<dt>Estimated cost · units</dt>
				<dd>{value(summary.estimatedCost)}</dd>
			</div>
			<div>
				<dt>Nodes / scans / joins</dt>
				<dd>{summary.nodeCount} / {summary.scans} / {summary.joins}</dd>
			</div>
			<div>
				<dt>Estimated → actual rows / loop</dt>
				<dd>{value(summary.estimatedRows)} → {value(summary.observedRows)}</dd>
			</div>
			<div>
				<dt>Root loops</dt>
				<dd>{value(summary.loops)}</dd>
			</div>
		</dl>
		<div class="tool-options diagnostic-note" aria-label="Root buffers and worker observations">
			<span
				title="Original root counters include descendant activity; do not add counters from other nodes."
				>Root inclusive blocks · shared hit/read: {value(
					summary.rootBuffers['Shared Hit Blocks'] as number | undefined
				)} / {value(summary.rootBuffers['Shared Read Blocks'] as number | undefined)} · temp read/write:
				{value(summary.rootBuffers['Temp Read Blocks'] as number | undefined)} / {value(
					summary.rootBuffers['Temp Written Blocks'] as number | undefined
				)}</span
			>
			{#each summary.workers.slice(0, 4) as worker (worker.node)}<span
					>Workers planned/launched ({worker.node}): {value(worker.planned)} / {value(
						worker.launched
					)}</span
				>{/each}
			{#if !summary.workers.length}<span>Worker counts: not collected.</span
				>{:else if summary.workers.length > 4}<span
					>{summary.workers.length - 4} more worker contexts; inspect nodes.</span
				>{/if}
		</div>
		{#if view === 'plan'}
			<div class="tool-options">
				<label
					>Metric<select aria-label="Plan metric" bind:value={mode}
						><option value="structure">Structure</option><option value="cost">Estimated cost</option
						><option value="time">Observed time</option><option value="cardinality"
							>Cardinality</option
						><option value="io">I/O</option></select
					></label
				><label
					>Filter<select aria-label="Plan filter" bind:value={filter}
						><option value="all">All nodes</option><option value="incomplete">No node timing</option
						><option value="ratio">High cardinality ratio</option><option value="io"
							>Reported block activity</option
						></select
					></label
				>
			</div>
			<div class="diagnostic-tabs diagnostic-mobile-tabs">
				<button class="button" aria-pressed={mobile === 'tree'} onclick={() => (mobile = 'tree')}
					>Tree</button
				><button
					class="button"
					aria-pressed={mobile === 'detail'}
					onclick={() => (mobile = 'detail')}>Node detail</button
				>
			</div>
			<div class="diagnostic-split">
				<section class="diagnostic-panel" class:diagnostic-mobile-hidden={mobile !== 'tree'}>
					<h2>Execution tree</h2>
					<DiagnosticTree {rows} bind:selected label="Plan tree" />
				</section>
				<section class="diagnostic-panel" class:diagnostic-mobile-hidden={mobile !== 'detail'}>
					<h2>Node detail{node ? ' · ' + node.type : ''}</h2>
					{#if node}<p class="diagnostic-note">{node.id}</p>
						<dl class="diagnostic-attributes">
							{#each Object.entries(node.raw).slice(0, 80) as [key, v] (key)}<dt>{key}</dt>
								<dd>
									{typeof v === 'object'
										? previewJson(v, 400)
										: String(v).slice(0, 800)}{typeof v === 'string' && v.length > 800
										? '… (truncated)'
										: ''}
								</dd>{/each}
						</dl>
						<p class="diagnostic-note">
							Cardinality: {cardinality(node).state}{cardinality(node).ratio !== undefined
								? ' · ' + value(cardinality(node).ratio) + '×'
								: ''}. Approximate aggregate rows = Actual Rows × Actual Loops: {value(
								cardinality(node).aggregateRows
							)}.
						</p>
						<OutputActions
							text={JSON.stringify({ node, derived: cardinality(node) }, null, 2)}
							filename="explain-node.json"
							mime="application/json"
						/>{/if}
				</section>
			</div>
		{:else}<section class="diagnostic-panel">
				<h2>Evidence and investigation</h2>
				{#each result.findings.filter( (f) => f.node.startsWith(result!.doc.plans[planIndex].root) ) as finding (finding.node + finding.kind)}<article
						class="diagnostic-finding"
					>
						<h3>{finding.kind}</h3>
						<button
							class="text-button"
							onclick={() => {
								selected = finding.node;
								view = 'plan';
								mobile = 'detail';
							}}>Inspect {finding.node}</button
						>
						<p><strong>Evidence:</strong> {finding.evidence}</p>
						<p>{finding.reason}</p>
						<p><strong>Investigate:</strong> {finding.investigate}</p>
						<p class="diagnostic-note">{finding.uncertainty}</p>
					</article>{/each}{#if !result.findings.length}<p>
						No heuristic findings for this plan. This does not establish optimal performance.
					</p>{/if}
			</section>{/if}
		<p class="diagnostic-note">
			Node timings are inclusive and usually averaged per loop. Estimated cost is not milliseconds.
			Root buffers include descendants; never sum all node counters. Workers do not add up to wall
			time. Missing observations stay unavailable.
		</p>
		{#if result.doc.diagnostics.length}<details class="diagnostic-note">
				<summary>Text parser diagnostics ({result.doc.diagnostics.length})</summary
				>{#each result.doc.diagnostics as d (d)}<p>{d}</p>{/each}
			</details>{/if}
	{/if}
	{#if view === 'compare'}
		<div class="editor-panel">
			<div class="editor-panel-header">
				<h2>After plan</h2>
				<span class="subtle-tag">2 MiB</span>
			</div>
			<CodeEditor bind:value={after} label="After EXPLAIN source" language="json" />
		</div>
		<div class="tool-options">
			<label
				>Local after file<input
					aria-label="Local after file"
					type="file"
					accept=".json,.txt"
					onchange={(e) => {
						void load(e.currentTarget.files?.[0], true);
						e.currentTarget.value = '';
					}}
				/></label
			><button class="button primary" onclick={() => run(true)} disabled={busy}
				>Compare locally</button
			><button
				class="button"
				onclick={() => {
					input = smallPlan;
					after = smallPlan.replace('2.1', '4.2');
				}}>Comparison example</button
			>
		</div>
		{#if comparison}<section class="diagnostic-panel">
				<h2>Comparison results</h2>
				<p class="diagnostic-note">{comparison.comparison.warning}</p>
				<p>
					Structure: {comparison.comparison.structureChanged
						? 'changed'
						: 'same signatures and branch order'}
				</p>
				<div class="diagnostic-table-wrap">
					<table>
						<thead
							><tr><th>Metric</th><th>Before</th><th>After</th><th>Delta</th><th>%</th></tr></thead
						><tbody
							>{#each comparison.comparison.metrics as m (m.metric)}<tr
									><th>{m.metric}</th><td>{value(m.before)}</td><td>{value(m.after)}</td><td
										>{value(m.delta)}</td
									><td>{value(m.percent, '%')}</td></tr
								>{/each}</tbody
						>
					</table>
				</div>
				<OutputActions
					text={JSON.stringify(comparison.comparison, null, 2)}
					filename="explain-comparison.json"
					mime="application/json"
				/>
			</section>
			<div class="diagnostic-split">
				{#each [comparison.before, comparison.after] as doc, i (i)}<section
						class="diagnostic-panel"
					>
						<h2>{i === 0 ? 'Before' : 'After'} tree</h2>
						<DiagnosticTree
							rows={doc.nodes.map((n) => ({
								id: n.id,
								parent: n.parent,
								depth: n.depth,
								label: n.type + (n.relation ? ' · ' + n.relation : ''),
								search: n.index ?? '',
								detail: `cost ${metric(n.raw, 'Total Cost') ?? '—'} · time ${metric(n.raw, 'Actual Total Time') ?? '—'} ms/loop`,
								branch: !!n.children.length
							}))}
							bind:selected={compareSelected[i]}
							label={i === 0 ? 'Before plan tree' : 'After plan tree'}
						/>
					</section>{/each}
			</div>{/if}
	{:else if !result && !busy}<section class="diagnostic-panel">
			<h2>Understand a plan, without executing SQL</h2>
			<p class="diagnostic-note">
				Paste FORMAT JSON output or load a synthetic example, then analyze. Inspect estimates,
				observations and evidence separately.
			</p>
		</section>{/if}
</div>
