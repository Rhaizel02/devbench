# V2.1 progress

Branch: feature/data-diagnostics-v21
Base: c3cd929a5aea231991973abd5744def9d13cf740

| Milestone              | Current state                             | Evidence / next gate                                                                                   |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| H0 architecture and UX | Implemented                               | Complete original prompt (29,821 chars) plus technical elaboration; docs/DATA_DIAGNOSTICS_DESIGN.md    |
| H1 PostgreSQL parser   | Implemented                               | JSON array/object, stable paths, inert metadata, budgets, unknown node types; unit coverage            |
| H2 semantics           | Implemented                               | Per-loop rows, estimated-only/TIMING OFF, inclusive buffers/time, zero policies, conservative evidence |
| H3 SQL explorer        | Implemented; browser gate in progress     | Local file, progressive tree, detail, filters, metrics, findings; initial SQL browser flow passed      |
| H4 text / comparison   | Implemented; browser gate in progress     | Explicit subset and unknown-line diagnostics; comparison download verified in initial browser flow     |
| H5 XML security        | Implemented; conformance gate in progress | Strict onError plus lexical DTD/attribute/namespace preflight and XML1.0 character checks              |
| H6 XML transforms/tree | Implemented; browser gate in progress     | Conservative text preservation; explicit element-only reindentation; progressive outline               |
| H7 XPath               | Implemented; browser gate in progress     | Worker XPath1.0, namespace bindings, scalar/node-set, bounded results, selection                       |
| H8 conversion/handoffs | Implemented; browser gate in progress     | Versioned ordered AST; reverse validation; one-way lossy projection; three explicit targets            |
| H9 RC acceptance       | Pending                                   | Performance, final screenshots/review, clean install, complete tests, exact-SHA CI and preview         |

Current targeted unit gate: 66 tests pass across SQL/XML engines. The earlier full gate passed 374 tests before two additional security regression cases (final full gate still pending). Type check: 0 errors/warnings. Build succeeds. Lint corrections made; final repeat pending.

Findings fixed before acceptance: xmldom accepted literal forbidden XML control characters and silently replaced duplicate expanded attributes. The lexical preflight now rejects duplicates before DOM construction, including namespace aliases, and character checks reject controls/numeric references. Regression tests pass. No GO is claimed while browser conformance remains incomplete.

Browser test corrections: CodeMirror renders only the visible viewport, so innerText is not a complete output oracle; tests now inspect real clipboard/download bytes. Windows clipboard uses CRLF for line breaks; file bytes remain canonical LF. Scoped editor flex sizing corrected after visual review exposed an oversized input surface.

Open P0/P1: none known after the above fixes; acceptance gates still incomplete. P2: native XPath is not cancellable, so the implementation uses worker-local MIT XML DOM/XPath dependencies; expanded cross-browser coverage is deferred.

Browser gate: all three V2.1 flows pass against the static build (12.1s). Verified SQL analysis and comparison bytes, SOAP namespaces/XPath/roundtrip, three one-shot JSON handoffs, malformed-native-parser differential cases, reset/reload, catalog/keyboard/pinning, twelve responsive/theme combinations, no payload markers in storage/URLs/history/cookies/requests/console and static same-origin GETs only. Evidence screenshots use v21-*; responsive/privacy JSON is committed with this checkpoint.

Next exact action: publish this first functional checkpoint after check/lint/unit gate; add measured budget/recovery scenarios and complete screenshot review, then final clean-install/full-suite/CI/preview gate. Do not merge main or Canvas 2.0.

## Checkpoint A–F published

SHA `04a8509a9c849ae1d3f566a72d70f77ea511f55d`, pushed to the RC branch. Exact GitHub Actions run [40301775957](https://github.com/Rhaizel02/devbench/actions/runs/40301775957) completed/success, including the existing complete Chromium suite. This is not the final SHA gate.

Four local V2.1 browser flows now pass (19.7s): the fourth proves progressive 200→400 row rendering, keyboard tree movement, explicit 4-space formatting/download, option invalidation, minify, a real expensive XPath timeout with main-thread heartbeat (194 ticks), valid retry, explicit cancellation and reset with no late error. Observed input+worker+UI wall times and exact byte sizes are in screenshots/actual/v21-performance.json; these are not FPS or pure parser timings.

Further security fixtures found two more dependency tolerances (bare ampersands and a CDATA terminator in ordinary text), now rejected lexically. Duplicate expanded attributes are checked before parsing even with character-reference/CRLF-equivalent namespace bindings. The extended XML/handoff unit gate passes 62 tests; final full count remains to be recorded. Search includes SQL index names and complete XML content, while display previews remain bounded. Pending file imports cannot overwrite an edited source.

Next exact action: finish final source review, update pertinent release docs/acceptance matrix, run clean install/check/lint/unit/build and full Playwright once, publish the RC gate commit, then verify its exact CI and normal-TLS Cloudflare preview. No Canvas domain/schema/persistence changes; the sole Canvas test change is the catalog count assertion.

## H9 final local gate — passed

Clean npm ci with bundled Node 24.22.1: 255 installed packages, 256 audited, zero vulnerabilities. Check: 0 errors / 0 warnings. Lint passes. **395 unit tests / 23 files** pass. Static build succeeds with **30 tool directories**. Complete Chromium suite: **45 passed, 2 explicitly remote historical audits skipped**, no unexpected/flaky results (2.1 minutes). The new four flows and every previous suite pass, including OpenAPI, HTTP, all existing tool workspaces and Canvas hierarchy/persistence/quota recovery. No product changes after this gate.

H0–H8 are accepted locally; H9 local acceptance complete, published exact-SHA CI/preview gate pending. Matrix/report: docs/DATA_DIAGNOSTICS_V21_ACCEPTANCE.md. Machine-readable summary: screenshots/actual/v21-validation.json. Twelve responsive/theme scenes pass; inspected real screenshots confirm bounded editors, visible controls, aligned metrics/tree/detail and no page overflow. Historical screenshots regenerated by old tests were restored instead of rewriting previous releases' evidence.

Final observed driver file+analysis times: SQL 184/191/340 ms (438 / 85,931 / 1,808,598 bytes); XML 167/210/313 ms (29 / 33,007 / 1,800,124 bytes). These include browser automation/worker/UI overhead and are not pure parser benchmarks or universal promises. Medium trees render 200 rows initially, then 400 on request. Deliberate XPath timeout allowed 191 main-thread heartbeat ticks; retry, Cancel and Reset pass. Raw evidence is v21-performance.json.

Open P0/P1: none known in the tested scope. P2: expanded cross-browser/assistive QA and additional PostgreSQL/XML/text conformance corpora; alternate encodings/XML1.1 rejected explicitly. Core formats, semantics and privacy have tests, without claiming universal conformance. Canvas domain/schema/persistence files are byte-unchanged from main.

Next exact action: publish this tested RC checkpoint, verify its exact CI and normal-TLS Cloudflare preview, record results, and publish the closing evidence checkpoint. V2.1 stays separate from main.
