# PostgreSQL EXPLAIN Analyzer — V2.1 RC

Route: `/tools/sql-explain-analyzer/` · BACK-11 · Backend. Browser-only plan inspection; no PostgreSQL connection, SQL execution or query transmission. Obtain plans consciously: `EXPLAIN ANALYZE` executes the statement, including possible effects of writes. The copyable instruction is a template for the user's own database, never an executable action here.

## Inputs and architecture

Primary format: PostgreSQL `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT JSON)`, or estimated-only `EXPLAIN (FORMAT JSON)`. Accept a nonempty array of documents or one object containing `Plan`; multiple documents have a plan selector. Every node requires a nonempty `Node Type`; unknown types are displayed generically. No PostgreSQL version is detected or claimed universally compatible. Fixtures exercise the stable PostgreSQL JSON fields described in the official documentation, including decimal actual rows.

The pure TypeScript parser produces `PlanDocument`, a list of root documents with metadata and a flat `PlanNode` array. IDs are original tree paths; children refer to IDs. Raw node metadata excludes recursive `Plans` to avoid quadratic copies. Workers, CTE/SubPlan/InitPlan, Settings, Triggers and JIT remain inert attributes, not interpreted code. Known numeric fields are optional but must be finite, non-negative numbers when present. Absence, zero and invalid values are distinct. Parse failure produces no partial current plan.

Limits: 2 MiB UTF-8 per input; 1–100 root documents, 5,000 execution nodes total, 128 plan levels, 100,000 metadata values / 300 JSON levels, 128 KiB strings. A dedicated, disposable worker has a three-second analysis budget or five-second comparison budget. Cancel, source edits, reset and teardown terminate it; operation tickets reject obsolete answers. Results are bounded to 8 MiB. The outline renders 200 rows initially, with explicit additional batches.

## Interpretation

| Display           | Contract                                                                         |
| ----------------- | -------------------------------------------------------------------------------- |
| Estimated cost    | Original root `Total Cost`, abstract planner units, never ms                     |
| Execution         | Root-document `Execution Time`, not a sum or fallback from node timings          |
| Planning          | Independent `Planning Time`; unavailable when absent                             |
| Node time         | Original `Actual Total Time`, per loop and inclusive of descendants              |
| Actual rows       | Average rows per execution, as PostgreSQL reports them                           |
| Aggregate rows    | Approximation `Actual Rows × Actual Loops`; finite values only                   |
| Cardinality ratio | `Actual Rows / Plan Rows` per execution, not aggregate rows divided by estimates |
| Buffers           | Original inclusive counters; root counters are not sums of the tree              |
| Parallel work     | Workers planned/launched and raw worker metadata; no naive wall-time addition    |

Cardinality is unavailable when observations/loops are missing or loops are zero. Estimate zero and actual zero is labeled “Both zero”; estimate zero with positive observations has no finite ratio and is explicitly labeled. Overflowing derived values remain unavailable. TIMING OFF can still have observed rows/loops; timings remain unavailable. Estimated-only output is clearly marked.

Findings separate observed evidence from cautious heuristics: cardinality differences of at least 10× and 100 rows, repeated nested-loop children, temp writes/external sorts/hash batches, large scans/filter rejection, worker shortfall and inclusive I/O concentration. Each includes exact evidence, node, uncertainty and investigation. These are not severity scores or guaranteed optimization advice. A Seq Scan does not imply a missing index; parent time does not prove an exclusive bottleneck; reads alone do not diagnose cache quality.

Authoritative semantics: [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [EXPLAIN options](https://www.postgresql.org/docs/current/sql-explain.html). Costs, loops, buffers, measurement overhead and timing options follow those sources. Cache, LIMIT, data, parameters, statistics and instrumentation affect interpretation.

## Text subset and comparison

Text recognizes one unambiguous space-indented root, arrow children, cost/rows/width, actual time/rows/loops or TIMING OFF rows/loops, never-executed nodes, common `on`/`using` descriptions, filter/index/join conditions, buffer counters and Planning/Execution Time. Planning-section buffers are not attributed to execution nodes. Unknown lines are retained as bounded diagnostics. Tabs, ambiguous roots/children and unrecognized cost-bearing node syntax are rejected with FORMAT JSON guidance. Not a universal PostgreSQL text grammar: JSON is the fidelity contract.

Compare accepts two local documents, displaying independent trees, summaries and absolute/percentage differences where both metrics exist. A zero baseline has no percentage. Structure signatures include ordered node types, relations, indexes and child counts; pairing requires identical path and signature. Different structures are not guessed into correspondence. The first root document from each input is compared; this limitation is visible. Export is structured JSON containing observations and warnings. A 10 ms versus 20 ms observation does not prove production regression.

## Evidence and acceptance

Engine tests: `explain-engine.test.ts`. Browser acceptance: `tests/data-diagnostics-v21.spec.ts`, including local file import, realistic synthetic Spring/orders JOIN + sort + poor cardinality, selection, derived ratio/volume, findings, comparison export bytes, estimated-only, TIMING OFF text, reset and reload. Screenshots use the `screenshots/actual/v21-explain-*` prefix. Final gate, exact commit/CI, measured latencies and acceptance status are recorded in `GOAL_PROGRESS_V21.md`; implementation alone is not a release claim.

P2: broader PostgreSQL version/text dialect fixtures and dedicated Firefox/WebKit/assistive-technology QA. No query optimizer, index prescription, exclusive-time reconstruction or CAD/graph framework is included.
