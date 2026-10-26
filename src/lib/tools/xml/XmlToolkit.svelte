<script lang="ts">
	import { onDestroy } from 'svelte';
	import CodeEditor from '#lib/components/CodeEditor.svelte';
	import OutputActions from '#lib/components/OutputActions.svelte';
	import SendResult from '#lib/components/SendResult.svelte';
	import DiagnosticTree from '#lib/components/DiagnosticTree.svelte';
	import type { XmlRow, XPathResultData, xmlStats } from './xml-engine';
	import type { XmlTask } from './xml.worker';
	import { xmlSample, soapSample } from './fixtures';
	import { runDiagnosticTask } from '../diagnostics/task-client';
	import { readDiagnosticFile } from '../diagnostics/files';
	import { errorMessage } from '../tool-errors';
	import '../diagnostics/diagnostics.css';
	type Result = {
		output?: string;
		json?: boolean;
		rows?: XmlRow[];
		stats?: ReturnType<typeof xmlStats>;
		valid?: boolean;
		xpath?: XPathResultData;
	};
	let input = $state(''),
		jsonInput = $state(''),
		view = $state('source'),
		indent = $state<2 | 4>(2),
		reindent = $state(false),
		expression = $state('//o:order'),
		bindings = $state([{ prefix: 'o', uri: 'urn:devbench:orders' }]),
		selected = $state(''),
		mobile = $state('tree'),
		error = $state(''),
		busy = $state(false);
	let result = $state<Result | null>(null),
		pending: ReturnType<typeof runDiagnosticTask<Result>> | undefined;
	let ticket = 0,
		fileTicket = 0;
	$effect(() => {
		void [input, jsonInput, indent, reindent, expression, JSON.stringify(bindings)];
		ticket++;
		pending?.cancel();
		busy = false;
		result = null;
		error = '';
	});
	onDestroy(() => {
		ticket++;
		fileTicket++;
		pending?.cancel();
		result = null;
	});
	const node = $derived(result?.rows?.find((r) => r.id === selected) ?? result?.rows?.[0]);
	async function run(kind: XmlTask['kind']) {
		pending?.cancel();
		const current = ++ticket;
		busy = true;
		error = '';
		result = null;
		try {
			const namespaces: Record<string, string> = Object.create(null);
			for (const binding of bindings) {
				if (!binding.prefix && !binding.uri) continue;
				if (Object.hasOwn(namespaces, binding.prefix)) throw new Error('duplicate');
				namespaces[binding.prefix] = binding.uri;
			}
			pending = runDiagnosticTask<Result>(
				new Worker(new URL('./xml.worker.ts', import.meta.url), { type: 'module' }),
				{
					kind,
					input: kind === 'from-json' ? jsonInput : input,
					indent,
					reindent,
					expression,
					namespaces
				},
				kind === 'xpath' ? 1500 : 3000
			);
			const data = await pending.promise;
			if (current !== ticket) return;
			result = data;
			if (kind === 'tree' || kind === 'validate') {
				view = 'tree';
				selected = data.rows?.[0]?.id ?? '';
			} else if (kind === 'xpath') view = 'xpath';
			else if (kind === 'structured' || kind === 'simple' || kind === 'from-json') view = 'convert';
			else view = 'source';
		} catch (e) {
			if (current === ticket)
				error =
					e instanceof Error && e.message === 'duplicate'
						? 'Namespace prefixes must be unique.'
						: errorMessage(e);
		} finally {
			if (current === ticket) busy = false;
		}
	}
	function reset() {
		ticket++;
		fileTicket++;
		pending?.cancel();
		input = '';
		jsonInput = '';
		result = null;
		error = '';
		busy = false;
		view = 'source';
		indent = 2;
		reindent = false;
		expression = '//o:order';
		bindings = [{ prefix: 'o', uri: 'urn:devbench:orders' }];
		selected = '';
		mobile = 'tree';
	}
	function example(soap = false) {
		reset();
		input = soap ? soapSample : xmlSample;
		if (soap) {
			expression = '//o:Order[@status="paid"]/o:Customer';
			bindings = [
				{ prefix: 'o', uri: 'urn:devbench:orders' },
				{ prefix: 'soap', uri: 'http://schemas.xmlsoap.org/soap/envelope/' }
			];
		}
	}
	async function load(file: File | undefined) {
		const current = ++fileTicket,
			snapshot = input;
		try {
			const text = await readDiagnosticFile(file);
			if (current === fileTicket && input === snapshot && text !== undefined) input = text;
		} catch (e) {
			if (current === fileTicket) error = errorMessage(e);
		}
	}
	function takeOutput() {
		if (!result?.output) return;
		const text = result.output;
		if (result.json) jsonInput = text;
		else input = text;
	}
</script>

<div class="diagnostic-workspace">
	<div class="studio-actions">
		<div class="action-group">
			<button class="button primary" onclick={() => run('validate')} disabled={busy}
				>Check well-formed XML</button
			><button class="button" onclick={() => run('format')} disabled={busy}>Format XML</button
			><button class="button" onclick={() => run('minify')} disabled={busy}>Minify XML</button
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
			<button class="button" onclick={() => example()}>XML example</button><button
				class="button"
				onclick={() => example(true)}>SOAP example</button
			><button class="text-button" onclick={reset}>Reset</button>
		</div>
	</div>
	<div class="editor-panel">
		<div class="editor-panel-header">
			<h2>XML source</h2>
			<span class="subtle-tag">2 MiB · XML 1.0 · UTF-8</span>
		</div>
		<CodeEditor bind:value={input} label="XML source" language="plain" />
	</div>
	<div class="tool-options">
		<label
			>Local XML file<input
				aria-label="Local XML file"
				type="file"
				accept=".xml,.txt,application/xml,text/xml"
				onchange={(e) => {
					void load(e.currentTarget.files?.[0]);
					e.currentTarget.value = '';
				}}
			/></label
		><label
			>Indent<select aria-label="XML indentation" bind:value={indent}
				><option value={2}>2 spaces</option><option value={4}>4 spaces</option></select
			></label
		><label><input type="checkbox" bind:checked={reindent} />Reindent element-only data</label>
	</div>
	<p class="diagnostic-note">
		Local, in-memory processing. DTD/entities disabled. Well-formed XML check; XSD validation: not
		supported. XPath 1.0.
	</p>
	<p class="diagnostic-note">
		{reindent
			? 'Reindentation changes whitespace between data elements. Mixed content and xml:space="preserve" remain untouched.'
			: 'Conservative format/minify preserves every text node, including whitespace. Enable reindentation only when element-only whitespace is formatting in your data.'}
		Serialization normalizes quoting and markup; original bytes are not preserved.
	</p>
	{#if error}<p class="parse-error" role="alert">{error}</p>{/if}{#if busy}<p role="status">
			Processing locally…
		</p>{/if}
	<div class="diagnostic-tabs" aria-label="XML views">
		{#each ['source', 'tree', 'xpath', 'convert'] as tab (tab)}<button
				class="button"
				aria-pressed={view === tab}
				onclick={() => (view = tab)}
				>{tab === 'source'
					? 'Source / output'
					: tab === 'tree'
						? 'Tree'
						: tab === 'xpath'
							? 'XPath'
							: 'XML ↔ JSON'}</button
			>{/each}
	</div>
	{#if view === 'tree'}
		<div class="tool-options">
			<button class="button" onclick={() => run('tree')} disabled={busy}>Explore XML tree</button
			>{#if result?.valid}<span role="status">Well-formed XML</span>{/if}
		</div>
		{#if result?.rows && result.stats}<dl class="diagnostic-summary">
				<div>
					<dt>Nodes</dt>
					<dd>{result.stats.nodes}</dd>
				</div>
				<div>
					<dt>Elements</dt>
					<dd>{result.stats.elements}</dd>
				</div>
				<div>
					<dt>Attributes</dt>
					<dd>{result.stats.attributes}</dd>
				</div>
				<div>
					<dt>Maximum depth</dt>
					<dd>{result.stats.depth}</dd>
				</div>
			</dl>
			<div class="diagnostic-tabs diagnostic-mobile-tabs">
				<button class="button" aria-pressed={mobile === 'tree'} onclick={() => (mobile = 'tree')}
					>Outline</button
				><button
					class="button"
					aria-pressed={mobile === 'detail'}
					onclick={() => (mobile = 'detail')}>Node detail</button
				>
			</div>
			<div class="diagnostic-split">
				<section class="diagnostic-panel" class:diagnostic-mobile-hidden={mobile !== 'tree'}>
					<h2>XML tree</h2>
					<DiagnosticTree rows={result.rows} bind:selected label="XML tree" />
				</section>
				<section class="diagnostic-panel" class:diagnostic-mobile-hidden={mobile !== 'detail'}>
					<h2>Selected XML node</h2>
					{#if node}<p class="diagnostic-note">
							Positional XPath, relative to the document. Attribute selections highlight their owner
							element.
						</p>
						<pre>{node.path}</pre>
						<OutputActions text={node.path} filename="xml-node-path.txt" />
						<pre>{node.value}</pre>
						{#if node.attributes}<dl class="diagnostic-attributes">
								{#each node.attributes as a (a.name)}<dt>{a.name}</dt>
									<dd>
										{a.value.slice(0, 600)}{a.value.length > 600 ? '… (truncated)' : ''}
									</dd>{/each}
							</dl>{/if}{/if}
				</section>
			</div>
			{#if result.stats.namespaces.length}<section class="diagnostic-panel">
					<h2>Declared namespaces</h2>
					<dl class="diagnostic-attributes">
						{#each result.stats.namespaces as ns (ns.prefix + ns.uri)}<dt>
								{ns.prefix || '(default)'}
							</dt>
							<dd>{ns.uri}</dd>{/each}
					</dl>
					<p class="diagnostic-note">
						Bindings can change in nested scopes. Configure an XPath prefix for each URI you want to
						query.
					</p>
				</section>{/if}
		{:else}<p class="diagnostic-note">
				Explore the source to inspect nodes, namespaces, attributes and text.
			</p>{/if}
	{:else if view === 'xpath'}
		<section class="diagnostic-panel">
			<h2>XPath 1.0 explorer</h2>
			<label
				>Expression<input
					aria-label="XPath expression"
					bind:value={expression}
					style="width:100%"
				/></label
			>
			<p class="diagnostic-note">
				Evaluation is explicit, never on typing. Default namespaces require a prefix in XPath:
				//o:order, not //order. Maximum 1,000 matches / 1 MiB result, 1.5-second worker budget.
			</p>
			<h2>XPath namespace bindings</h2>
			{#each bindings as binding, i (i)}<div class="namespace-row">
					<input
						aria-label={'Namespace prefix ' + (i + 1)}
						placeholder="Prefix"
						bind:value={binding.prefix}
					/><input
						aria-label={'Namespace URI ' + (i + 1)}
						placeholder="Namespace URI"
						bind:value={binding.uri}
					/><button
						class="button"
						aria-label={'Remove namespace ' + (i + 1)}
						onclick={() => (bindings = bindings.filter((_, j) => j !== i))}>Remove</button
					>
				</div>{/each}
			<div class="tool-options">
				<button
					class="button"
					onclick={() => (bindings = [...bindings, { prefix: '', uri: '' }])}
					disabled={bindings.length >= 100}>Add namespace</button
				><button class="button primary" onclick={() => run('xpath')} disabled={busy}
					>Evaluate XPath</button
				>
			</div>
			{#if result?.xpath}<h2>XPath result · {result.xpath.type}</h2>
				{#if result.xpath.type === 'nodes'}<p>{result.xpath.matches?.length ?? 0} matches</p>
					{#each result.xpath.matches as match (match.path)}<article class="diagnostic-finding">
							<button
								class="text-button"
								onclick={() => {
									selected = match.treeId ?? '';
									view = 'tree';
									mobile = 'detail';
								}}>Inspect {match.path}</button
							>
							<pre>{match.value.slice(0, 4000)}{match.value.length > 4000
									? '… (preview truncated)'
									: ''}</pre>
						</article>{/each}{:else}<pre>{String(result.xpath.value)}</pre>{/if}<OutputActions
					text={JSON.stringify(result.xpath, null, 2)}
					filename="xpath-results.json"
					mime="application/json"
				/>{/if}
		</section>
	{:else if view === 'convert'}
		<section class="diagnostic-panel">
			<h2>XML ↔ JSON</h2>
			<p class="diagnostic-note">
				Structured mode is a versioned, ordered node tree preserving namespaces, attributes, text,
				CDATA, comments and processing instructions. It reconstructs supported XML semantics, not
				original bytes. Data projection is one-way and potentially lossy.
			</p>
			<div class="tool-options">
				<button class="button primary" onclick={() => run('structured')} disabled={busy}
					>XML → structured JSON</button
				><button class="button" onclick={() => run('simple')} disabled={busy}
					>XML → data JSON (lossy)</button
				>
			</div>
		</section>
		<div class="editor-panel">
			<div class="editor-panel-header">
				<h2>Structured JSON source</h2>
				<span class="subtle-tag">devbench.xml v1 · 8 MiB</span>
			</div>
			<CodeEditor bind:value={jsonInput} label="Structured XML JSON source" language="json" />
		</div>
		<div class="tool-options">
			<button class="button" onclick={() => run('from-json')} disabled={busy}
				>Structured JSON → XML</button
			>
		</div>
	{/if}
	{#if result?.output !== undefined && (view === 'source' || view === 'convert')}<section
			class="diagnostic-result-editor"
		>
			<div class="editor-panel">
				<div class="editor-panel-header">
					<h2>{result.json ? 'JSON result' : 'XML result'}</h2>
					<span class="subtle-tag">Current output</span>
				</div>
				{#key result.json}<CodeEditor
						value={result.output}
						readonly
						label="XML Toolkit output"
						language={result.json ? 'json' : 'plain'}
					/>{/key}
			</div>
			<div class="tool-options">
				<OutputActions
					text={result.output}
					filename={result.json ? 'xml-conversion.json' : 'xml-output.xml'}
					mime={result.json ? 'application/json' : 'application/xml;charset=utf-8'}
				/><button class="button" onclick={takeOutput}
					>{result.json
						? 'Use JSON result as structured input'
						: 'Use XML result as source'}</button
				>
			</div>
			{#if result.json}<SendResult source="DATA-07" text={result.output} />{/if}
		</section>{/if}
	{#if !input && !jsonInput && !busy}<section class="diagnostic-panel">
			<h2>Inspect XML without sending it anywhere</h2>
			<p class="diagnostic-note">
				Paste XML, choose a local file or load a synthetic SOAP example. Imported XML is always
				data, never active HTML, SVG or script.
			</p>
		</section>{/if}
</div>
