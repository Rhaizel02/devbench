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
