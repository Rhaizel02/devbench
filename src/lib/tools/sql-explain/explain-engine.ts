import { assertTextLimit, ToolError } from '../tool-errors';

export const EXPLAIN_LIMITS = {
	bytes: 2 * 1024 * 1024,
	nodes: 5000,
	depth: 128,
	values: 100000,
	string: 128 * 1024
};
type Attributes = Record<string, unknown>;
export type PlanNode = {
	id: string;
	parent?: string;
	depth: number;
	children: string[];
	type: string;
	relation?: string;
	index?: string;
	alias?: string;
	raw: Attributes;
};
export type PlanDocument = {
	format: 'json' | 'text';
	plans: { root: string; metadata: Attributes }[];
	nodes: PlanNode[];
	diagnostics: string[];
};
export type Finding = {
	node: string;
	kind: string;
	evidence: string;
	reason: string;
	investigate: string;
	uncertainty: string;
};
const numbers = [
	'Startup Cost',
	'Total Cost',
	'Plan Rows',
	'Plan Width',
	'Actual Startup Time',
	'Actual Total Time',
	'Actual Rows',
	'Actual Loops',
	'Shared Hit Blocks',
	'Shared Read Blocks',
	'Shared Dirtied Blocks',
	'Shared Written Blocks',
	'Local Hit Blocks',
	'Local Read Blocks',
	'Local Dirtied Blocks',
	'Local Written Blocks',
	'Temp Read Blocks',
	'Temp Written Blocks',
	'I/O Read Time',
	'I/O Write Time',
	'Temp I/O Read Time',
	'Temp I/O Write Time',
	'Rows Removed by Filter',
	'Rows Removed by Join Filter',
	'Workers Planned',
	'Workers Launched',
	'Sort Space Used',
	'Hash Batches',
	'Hash Buckets',
	'Planning Time',
	'Execution Time'
];
export const metric = (raw: Attributes, name: string): number | undefined =>
	typeof raw[name] === 'number' ? (raw[name] as number) : undefined;
const object = (value: unknown): value is Attributes =>
	!!value && typeof value === 'object' && !Array.isArray(value);
function fail(path: string, detail: string): never {
	throw new ToolError(`${path}: ${detail}`);
}
function bounded(value: unknown) {
	const stack = [{ value, depth: 0 }];
	let count = 0;
	while (stack.length) {
		const item = stack.pop()!;
		if (++count > EXPLAIN_LIMITS.values || item.depth > 300)
			fail('$', 'JSON metadata budget exceeded (100,000 values / 300 levels).');
		if (
			typeof item.value === 'string' &&
			new TextEncoder().encode(item.value).length > EXPLAIN_LIMITS.string
		)
			fail('$', 'A string exceeds 128 KiB.');
		if (typeof item.value === 'number' && !Number.isFinite(item.value))
			fail('$', 'Numbers must be finite.');
		if (item.value && typeof item.value === 'object')
			for (const child of Object.values(item.value))
				stack.push({ value: child, depth: item.depth + 1 });
	}
}
function validateNumbers(raw: Attributes, path: string) {
	for (const key of numbers)
		if (
			key in raw &&
			(typeof raw[key] !== 'number' || !Number.isFinite(raw[key]) || (raw[key] as number) < 0)
		)
			fail(path, `${key} must be a finite non-negative number.`);
}

export function parseExplain(input: string): PlanDocument {
	assertTextLimit(input, EXPLAIN_LIMITS.bytes);
	if (!input.trim()) throw new ToolError('Enter a PostgreSQL EXPLAIN plan.');
	if (!/^\s*[[{]/.test(input)) return parseExplainText(input);
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		throw new ToolError('Invalid JSON. Export PostgreSQL EXPLAIN with FORMAT JSON.');
	}
	bounded(value);
	return normalize(value, 'json', []);
}
function normalize(
	value: unknown,
	format: PlanDocument['format'],
	diagnostics: string[]
): PlanDocument {
	const roots = Array.isArray(value) ? value : [value];
	if (!roots.length || roots.length > 100) fail('$', 'Expected 1–100 plan documents.');
	const doc: PlanDocument = { format, plans: [], nodes: [], diagnostics };
	roots.forEach((root, i) => {
		if (!object(root) || !object(root.Plan)) fail(`$[${i}].Plan`, 'Expected a plan object.');
		validateNumbers(root, `$[${i}]`);
		const metadata = Object.fromEntries(Object.entries(root).filter(([key]) => key !== 'Plan'));
		const rootId = `${i}/Plan`;
		doc.plans.push({ root: rootId, metadata });
		const stack: { raw: Attributes; id: string; parent?: PlanNode; depth: number }[] = [
			{ raw: root.Plan, id: rootId, depth: 0 }
		];
		while (stack.length) {
			const item = stack.pop()!;
			if (doc.nodes.length >= EXPLAIN_LIMITS.nodes || item.depth > EXPLAIN_LIMITS.depth)
				fail(item.id, 'Plan exceeds 5,000 nodes / 128 levels.');
			if (typeof item.raw['Node Type'] !== 'string' || !item.raw['Node Type'].trim())
				fail(item.id, 'Node Type must be a non-empty string.');
			validateNumbers(item.raw, item.id);
			for (const key of ['Relation Name', 'Index Name', 'Alias'])
				if (key in item.raw && typeof item.raw[key] !== 'string')
					fail(item.id, `${key} must be a string.`);
			if ('Workers' in item.raw) {
				if (!Array.isArray(item.raw.Workers)) fail(item.id, 'Workers must be an array.');
				for (const worker of item.raw.Workers) {
					if (!object(worker)) fail(item.id, 'Worker metadata must be an object.');
					validateNumbers(worker, item.id + '/Workers');
				}
			}
			const raw = Object.fromEntries(Object.entries(item.raw).filter(([key]) => key !== 'Plans'));
			const node: PlanNode = {
				id: item.id,
				parent: item.parent?.id,
				depth: item.depth,
				children: [],
				type: item.raw['Node Type'],
				relation: item.raw['Relation Name'] as string | undefined,
				index: item.raw['Index Name'] as string | undefined,
				alias: item.raw.Alias as string | undefined,
				raw
			};
			item.parent?.children.push(node.id);
			doc.nodes.push(node);
			if ('Plans' in item.raw) {
				if (!Array.isArray(item.raw.Plans)) fail(item.id, 'Plans must be an array.');
				for (let j = item.raw.Plans.length - 1; j >= 0; j--) {
					const child: unknown = item.raw.Plans[j];
					if (!object(child)) fail(item.id + '/Plans/' + j, 'Expected node object.');
					stack.push({
						raw: child,
						id: item.id + '/Plans/' + j,
						parent: node,
						depth: item.depth + 1
					});
				}
			}
		}
	});
	return doc;
}

export function parseExplainText(input: string): PlanDocument {
	assertTextLimit(input, EXPLAIN_LIMITS.bytes);
	const roots: Attributes[] = [];
	let current: Attributes | undefined;
	const stack: { indent: number; node: Attributes }[] = [];
	const diagnostics: string[] = [];
	let count = 0;
	let footer = false;
	const n = '(\\d+(?:\\.\\d+)?)';
	const nodePattern = new RegExp(
		'^(\\s*)(?:->\\s*)?(.+?)\\s+\\(cost=' +
			n +
			'\\.\\.' +
			n +
			' rows=' +
			n +
			' width=' +
			n +
			'\\)(?:\\s+\\(actual time=' +
			n +
			'\\.\\.' +
			n +
			' rows=' +
			n +
			' loops=' +
			n +
			'\\)|\\s+\\(actual rows=' +
			n +
			' loops=' +
			n +
			'\\)|\\s+\\(never executed\\))?\\s*$'
	);
	const lines = input.split(/\r?\n/);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (!line.trim()) continue;
		if (line.includes('\t'))
			fail(`Line ${lineIndex + 1}`, 'Tabs make text hierarchy ambiguous; use FORMAT JSON.');
		const match = nodePattern.exec(line);
		if (match) {
			footer = false;
			if (++count > EXPLAIN_LIMITS.nodes) fail('$', 'Text plan exceeds 5,000 nodes.');
			const indent = match[1].length;
			const desc = match[2];
			let type = desc,
				relation: string | undefined,
				index: string | undefined;
			const using = /^(.*?) using (.*?) on (.*)$/.exec(desc),
				on = /^(.*?) on (.*)$/.exec(desc);
			if (using) [, type, index, relation] = using;
			else if (on) [, type, relation] = on;
			const node: Attributes = {
				'Node Type': type,
				'Startup Cost': +match[3],
				'Total Cost': +match[4],
				'Plan Rows': +match[5],
				'Plan Width': +match[6]
			};
			if (relation) node['Relation Name'] = relation;
			if (index) node['Index Name'] = index;
			if (match[7])
				Object.assign(node, {
					'Actual Startup Time': +match[7],
					'Actual Total Time': +match[8],
					'Actual Rows': +match[9],
					'Actual Loops': +match[10]
				});
			else if (match[11])
				Object.assign(node, { 'Actual Rows': +match[11], 'Actual Loops': +match[12] });
			else if (line.includes('(never executed)'))
				Object.assign(node, { 'Actual Rows': 0, 'Actual Loops': 0 });
			while (stack.length && stack.at(-1)!.indent >= indent) stack.pop();
			if (stack.length) {
				if (!line.trimStart().startsWith('->'))
					fail(`Line ${lineIndex + 1}`, 'Ambiguous child hierarchy; use FORMAT JSON.');
				const p = stack.at(-1)!.node;
				((p.Plans ??= []) as Attributes[]).push(node);
			} else {
				if (roots.length || line.trimStart().startsWith('->'))
					fail(`Line ${lineIndex + 1}`, 'Ambiguous root; use FORMAT JSON.');
				current = { Plan: node };
				roots.push(current);
			}
			stack.push({ indent, node });
			continue;
		}
		const time = /^\s*(Planning|Execution) Time:\s*(\d+(?:\.\d+)?) ms\s*$/.exec(line);
		if (time && current) {
			footer = true;
			current[time[1] + ' Time'] = +time[2];
			continue;
		}
		if (/^\s*(Planning|JIT|Triggers):/.test(line)) footer = true;
		if (line.includes('(cost=') || line.trimStart().startsWith('->'))
			fail(`Line ${lineIndex + 1}`, 'Unrecognized plan-node syntax; use FORMAT JSON.');
		const attributeIndent = line.length - line.trimStart().length;
		const owner = [...stack].reverse().find((item) => item.indent < attributeIndent)?.node;
		const condition =
			/^\s*(Filter|Index Cond|Join Filter|Hash Cond|Merge Cond|Recheck Cond):\s*(.*)$/.exec(line);
		if (condition && owner && !footer) {
			owner[condition[1]] = condition[2];
			continue;
		}
		const buffers = /^\s*Buffers:\s*(.*)$/.exec(line);
		if (buffers && owner && !footer) {
			let family = 'Shared';
			const tokens = buffers[1].split(/\s+/);
			let understood = true;
			for (const token of tokens) {
				if (['shared', 'local', 'temp'].includes(token))
					family = token[0].toUpperCase() + token.slice(1);
				else {
					const pair = /^(hit|read|dirtied|written)=(\d+)$/.exec(token);
					if (pair)
						owner[`${family} ${pair[1][0].toUpperCase() + pair[1].slice(1)} Blocks`] = +pair[2];
					else understood = false;
				}
			}
			if (understood) continue;
		}
		if (diagnostics.length < 100)
			diagnostics.push(`Line ${lineIndex + 1}: not interpreted: ${line.trim().slice(0, 500)}`);
	}
	if (!roots.length)
		throw new ToolError('Text subset not recognized. Use EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON).');
	bounded(roots);
	return normalize(roots, 'text', [
		'Text subset only. Unknown lines remain diagnostics; use FORMAT JSON for full fidelity.',
		...diagnostics
	]);
}

export function cardinality(node: PlanNode): {
	ratio?: number;
	state: string;
	aggregateRows?: number;
} {
	const estimated = metric(node.raw, 'Plan Rows'),
		actual = metric(node.raw, 'Actual Rows'),
		loops = metric(node.raw, 'Actual Loops');
	if (loops === 0) return { state: 'Not executed' };
	if (estimated === undefined || actual === undefined || loops === undefined)
		return { state: 'Unavailable' };
	const total = actual * loops,
		aggregateRows = Number.isFinite(total) ? total : undefined;
	if (estimated === 0)
		return {
			state: actual === 0 ? 'Both zero' : 'Estimate zero; observed positive',
			aggregateRows
		};
	return {
		ratio: Number.isFinite(actual / estimated) ? actual / estimated : undefined,
		state: Number.isFinite(actual / estimated)
			? 'Observed / estimated rows per execution'
			: 'Ratio exceeds finite numeric range',
		aggregateRows
	};
}
export function planSummary(doc: PlanDocument, index = 0) {
	const plan = doc.plans[index];
	if (!plan) throw new ToolError('Select an existing plan.');
	const root = doc.nodes.find((n) => n.id === plan.root)!;
	const nodes = doc.nodes.filter((n) => n.id === root.id || n.id.startsWith(root.id + '/'));
	return {
		analyzed: nodes.some((n) => metric(n.raw, 'Actual Loops') !== undefined),
		executionMs: metric(plan.metadata, 'Execution Time'),
		planningMs: metric(plan.metadata, 'Planning Time'),
		estimatedCost: metric(root.raw, 'Total Cost'),
		estimatedRows: metric(root.raw, 'Plan Rows'),
		observedRows: metric(root.raw, 'Actual Rows'),
		loops: metric(root.raw, 'Actual Loops'),
		nodeCount: nodes.length,
		scans: nodes.filter((n) => /Scan/.test(n.type)).length,
		joins: nodes.filter((n) => /Join|Nested Loop/.test(n.type)).length,
		rootBuffers: Object.fromEntries(
			Object.entries(root.raw).filter(([k]) => /Blocks$|I\/O .*Time$/.test(k))
		),
		workers: nodes
			.filter((n) => 'Workers Planned' in n.raw || 'Workers Launched' in n.raw)
			.map((n) => ({
				node: n.id,
				planned: metric(n.raw, 'Workers Planned'),
				launched: metric(n.raw, 'Workers Launched')
			}))
	};
}
export function explainFindings(doc: PlanDocument): Finding[] {
	const findings: Finding[] = [];
	for (const node of doc.nodes) {
		const r = node.raw,
			c = cardinality(node),
			rows = metric(r, 'Actual Rows'),
			estimated = metric(r, 'Plan Rows'),
			loops = metric(r, 'Actual Loops');
		const add = (kind: string, evidence: string, reason: string, investigate: string) =>
			findings.push({
				node: node.id,
				kind,
				evidence,
				reason,
				investigate,
				uncertainty:
					'A single plan is evidence for investigation, not proof of a production bottleneck. Cache, parameters, statistics and instrumentation matter.'
			});
		if (
			rows !== undefined &&
			estimated !== undefined &&
			loops !== undefined &&
			loops !== 0 &&
			Math.abs(rows - estimated) >= 100 &&
			(c.ratio === undefined ? estimated === 0 && rows > 0 : c.ratio >= 10 || c.ratio <= 0.1)
		)
			add(
				'Cardinality',
				`Plan Rows ${estimated}; Actual Rows ${rows}; Actual Loops ${loops ?? 'absent'}`,
				'Observed and estimated rows per execution differ substantially.',
				'Inspect statistics, correlated predicates and representative parameter values.'
			);
		if (
			node.type === 'Nested Loop' &&
			node.children.some(
				(id) => (metric(doc.nodes.find((n) => n.id === id)!.raw, 'Actual Loops') ?? 0) >= 100
			)
		)
			add(
				'Repeated loop',
				'A direct child reports at least 100 Actual Loops.',
				'Repeated inner work can be relevant; loops alone do not establish inefficiency.',
				'Inspect inner rows, access conditions and total query context.'
			);
		if (
			(metric(r, 'Temp Written Blocks') ?? 0) > 0 ||
			/external/i.test(String(r['Sort Method'] ?? '')) ||
			r['Sort Space Type'] === 'Disk' ||
			(metric(r, 'Hash Batches') ?? 0) > 1
		)
			add(
				'Disk / batching',
				`Temp Written Blocks ${metric(r, 'Temp Written Blocks') ?? 'absent'}; Sort Method ${r['Sort Method'] ?? 'absent'}; Hash Batches ${metric(r, 'Hash Batches') ?? 'absent'}`,
				'Temporary work or hash batching is reported.',
				'Inspect data volume and memory settings under representative concurrency.'
			);
		const removed = metric(r, 'Rows Removed by Filter');
		if (removed !== undefined && removed >= 1000 && rows !== undefined && removed > rows * 9)
			add(
				'Filtering',
				`Rows Removed by Filter ${removed}; Actual Rows ${rows}`,
				'Many candidate rows were rejected (per-execution counters).',
				'Inspect predicate selectivity and access paths; an index is not automatically beneficial.'
			);
		if (node.type === 'Seq Scan' && rows !== undefined && rows + (removed ?? 0) >= 10000)
			add(
				'Sequential scan',
				`Actual Rows ${rows}; Rows Removed by Filter ${removed ?? 'absent'}`,
				'A substantial sequential scan may be relevant; it can also be optimal.',
				'Check table size, selected fraction and total workload before considering alternatives.'
			);
		const planned = metric(r, 'Workers Planned'),
			launched = metric(r, 'Workers Launched');
		if (planned !== undefined && launched !== undefined && launched < planned)
			add(
				'Parallel workers',
				`Workers Planned ${planned}; Workers Launched ${launched}`,
				'Fewer workers launched than planned.',
				'Inspect worker availability and concurrent workload; do not sum worker timings as wall time.'
			);
		const root = doc.nodes.find(
			(n) => n.id === doc.plans.find((p) => node.id.startsWith(p.root))?.root
		);
		const read = metric(r, 'Shared Read Blocks'),
			rootRead = root && metric(root.raw, 'Shared Read Blocks');
		if (
			read !== undefined &&
			rootRead !== undefined &&
			rootRead > 0 &&
			read >= 100 &&
			read / rootRead >= 0.5
		)
			add(
				'I/O context',
				`Shared Read Blocks ${read}; root ${rootRead}`,
				'This inclusive subtree accounts for at least half the reported root reads.',
				'Inspect I/O timing if collected; reads do not by themselves prove a cache problem.'
			);
	}
	if (!doc.nodes.some((n) => metric(n.raw, 'Actual Loops') !== undefined))
		findings.push({
			node: doc.plans[0].root,
			kind: 'Insufficient observations',
			evidence: 'Actual Loops absent.',
			reason: 'Estimated-only plan; runtime findings are unavailable.',
			investigate: 'Obtain ANALYZE output only when executing the statement is appropriate.',
			uncertainty: 'Planner costs are abstract units, not milliseconds.'
		});
	return findings.slice(0, 1000);
}
export function comparePlans(before: PlanDocument, after: PlanDocument) {
	const measures = (doc: PlanDocument) => {
		const s = planSummary(doc),
			root = doc.nodes.find((n) => n.id === doc.plans[0].root)!;
		return {
			...s,
			sharedHit: metric(root.raw, 'Shared Hit Blocks'),
			sharedRead: metric(root.raw, 'Shared Read Blocks'),
			tempRead: metric(root.raw, 'Temp Read Blocks'),
			tempWritten: metric(root.raw, 'Temp Written Blocks'),
			aggregateRows: cardinality(root).aggregateRows
		};
	};
	const a = measures(before),
		b = measures(after);
	const keys = [
		'executionMs',
		'planningMs',
		'estimatedCost',
		'estimatedRows',
		'observedRows',
		'nodeCount',
		'loops',
		'aggregateRows',
		'sharedHit',
		'sharedRead',
		'tempRead',
		'tempWritten'
	] as const;
	const metrics = keys.map((key) => {
		const previous = a[key],
			next = b[key];
		return {
			metric: key,
			before: previous,
			after: next,
			delta:
				previous !== undefined && next !== undefined && Number.isFinite(next - previous)
					? next - previous
					: undefined,
			percent:
				previous !== undefined &&
				next !== undefined &&
				previous !== 0 &&
				Number.isFinite(((next - previous) / previous) * 100)
					? ((next - previous) / previous) * 100
					: undefined
		};
	});
	const signature = (n: PlanNode) =>
		JSON.stringify([
			n.type,
			n.relation ?? null,
			n.index ?? null,
			n.alias ?? null,
			n.raw['Join Type'] ?? null,
			n.raw.Strategy ?? null,
			n.raw['Parent Relationship'] ?? null,
			n.raw['Subplan Name'] ?? null,
			n.children.length
		]);
	const matches = before.nodes.map((n) => {
		const other = after.nodes.find((m) => m.id === n.id && signature(m) === signature(n));
		return { before: n.id, after: other?.id, matched: !!other };
	});
	return {
		before: a,
		after: b,
		metrics,
		matches,
		structureChanged:
			JSON.stringify(before.nodes.map(signature)) !== JSON.stringify(after.nodes.map(signature)),
		warning:
			'Only the selected first plan in each document is compared. Matching requires identical path/type/relation/index/child count. Differences are observations, not proof of production improvement or regression. Cache, parameters, data and settings may differ. Buffers remain root-inclusive counters.'
	};
}
