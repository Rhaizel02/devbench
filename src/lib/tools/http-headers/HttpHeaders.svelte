<script lang="ts">
	import TextWorkspace from '#lib/components/TextWorkspace.svelte';
	import { inspectHeaders } from './headers-engine';
	let context = $state<'request' | 'response'>('response');
	let view = $state('parsed');
	let reveal = $state(false);
	const sample =
		"HTTP/1.1 200 OK\nContent-Type: application/json; charset=utf-8\nCache-Control: public, max-age=600\nETag: W/\"synthetic\"\nVary: Origin\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true\nContent-Security-Policy: default-src 'self'; script-src 'none'\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nSet-Cookie: demo=synthetic; Secure; HttpOnly; SameSite=Lax";
</script>

<TextWorkspace
	transform={(input) => {
		const report = inspectHeaders(input, context, reveal);
		return view === 'raw' ? report.raw : JSON.stringify(report, null, 2);
	}}
	revision={JSON.stringify([context, view, reveal])}
	action="Inspect headers"
	inputLabel="HTTP header block"
	outputLabel="Header analysis"
	filename={view === 'raw' ? 'headers.txt' : 'headers.json'}
	outputLanguage={view === 'raw' ? 'plain' : 'json'}
	inputLimitLabel="64 KiB / 200 fields"
	onReset={() => (reveal = false)}
	{sample}
>
	{#snippet options()}<label
			>Context <select bind:value={context}
				><option value="response">Response headers</option><option value="request"
					>Request headers</option
				></select
			></label
		><label
			>View <select bind:value={view}
				><option value="parsed">Parsed · categories and explanations</option><option value="raw"
					>Raw · redacted by default</option
				></select
			></label
		><label
			><input type="checkbox" bind:checked={reveal} />Reveal sensitive values in analysis and
			exports</label
		>{/snippet}
	{#snippet help()}<p>
			Local analysis of one HTTP header block, with an optional start line. Case-insensitive names
			and repeated fields remain distinct. Obsolete folded lines and malformed fields are rejected
			without echoing their contents. Raw view preserves field order but normalizes whitespace. CSP
			policies/directives are parsed separately, with duplicate directive handling; unknown
			directives are retained. Cookie values are hidden by default and attribute names are
			explained. CORS depends on the actual origin, method, credentials and browser; no security
			verdict or network check is performed.
		</p>{/snippet}
</TextWorkspace>
