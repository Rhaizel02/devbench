# DevBench V2.2 — stable release

## Integration and identity

User-authorized stable promotion through `integration/devbench-v22-release`, starting at main `c3cd929a5aea231991973abd5744def9d13cf740`. The complete source RC `070ebef5f453751e93ad0b2900d7aa6d8124ffbf` is a descendant of main (0 main-only commits, 18 feature-only commits at preparation); integration fast-forwards and preserves its normal merges. No squash, rebase, force push or separate remerge of the older RC branches.

Source RC CI [40420069361](https://github.com/Rhaizel02/devbench/actions/runs/40420069361) is verified green for that exact SHA. This historical result does not replace the stable integration and main checks below.

Protected source heads at preparation:

- `feature/canvas-workflow-v22`: `070ebef5f453751e93ad0b2900d7aa6d8124ffbf`.
- `feature/architecture-canvas-v20`: `a289fcfd9f54e35e0cd60b8c6a3123cbe88457d2`.
- `feature/data-diagnostics-v21`: `c180ad5e703c24560035a32ded6f17c8a6b5cbfc`.

Stable adjustments are limited to current app/Canvas display versions, the active Canvas route header and current release documentation. Historical introduction versions and RC acceptance reports remain intact. Build SHA is statically embedded from Cloudflare's commit metadata or local Git HEAD, available in the app version and Canvas heading titles. No Canvas model, serializer, physical database version or migration changes are introduced by this release preparation.

## Included product and compatibility

**30 available tools**, with unique existing IDs/slugs and lazy static routes. Architecture Canvas **2.1**, PostgreSQL EXPLAIN Analyzer, XML Toolkit, Pipeline Builder **V2**, Test Data Generator **V2** and OpenAPI Explorer are included in the preserved history. Home/search/palette/favorites/recents use the existing registry; no new tool or feature is added here.

Canvas reads JSON v1/v2/v3 and exports schema3, with frozen legacy/rich fixtures, semantic roundtrip checks, rollback on invalid import, immutable original preservation, IndexedDB autosave/concurrent-write protection and quota recovery. Existing projects remain on the same origin and database. Production and preview origins have independent browser databases; explicit portable JSON backups remain recommended. Only Canvas may persist document payloads; the other 29 tools remain memory-only.

Critical coverage includes marquee, atomic groups/multiple properties, visual front/back order and hit testing, midpoint connector curvature, Focus/hierarchy, undo/redo, local raster images and PNG; PostgreSQL per-loop/inclusive metric semantics, plan comparison, DTD/XXE rejection, XPath and ordered XML/JSON roundtrip; Pipeline recipe compatibility/configuration-only exports; dataset uniqueness/foreign keys; OpenAPI parser/Contract Diff/redacted one-shot HTTP handoff.

## Release gates

| Gate                                            | Evidence / result                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Updated main and RC ancestry                    | Verified main ancestor, no main-only commits; integration fast-forward to source RC                                                           |
| Clean install, check, lint, units, static build | Clean npm ci: 260 packages, 0 vulnerabilities; check 0 errors/0 warnings; lint; 479 units/31 files; adapter-static build, 30 tool directories |
| Complete Chromium suite                         | 59 passed / 2 explicitly skipped historical remote audits, complete final Chromium run (3.4 min)                                              |
| Exact integration commit CI                     | Pending publication                                                                                                                           |
| Safe main promotion and exact main CI           | Pending integration acceptance and remote refetch                                                                                             |
| Cloudflare main deployment                      | Pending exact published main commit                                                                                                           |
| Normal-TLS production smoke                     | Pending; no certificate bypass is permitted                                                                                                   |
| Original source branches / clean tree           | Pending final remote comparison                                                                                                               |

Production target: [devbench-aw3.pages.dev](https://devbench-aw3.pages.dev). CI success, Cloudflare deployment success and real HTTPS functional smoke are separate gates; none is inferred from another. Stable production must show **V2.2** and **Architecture Canvas 2.1**, with the exact published build SHA. Unknown routes must produce a real HTTP404.

Initial full browser run exposed a false positive in the new stable-label assertion: substring RC also occurs inside ARCHITECTURE. The assertion now requires the exact stable heading, without changing product behavior or weakening coverage. Targeted formatting/lint checks and the complete rerun passed (59 flows, 2 historical remote skips). Generated historical screenshots were restored rather than replacing RC evidence with a later run.

## Scope, limits and decision

No open P0/P1 was observed in the accepted RC; stable integration remains **NO-GO pending the gates above**. Existing P2 does not block promotion: physical touch/stylus, expanded cross-browser/assistive-technology review; sampled geometric marquee boundaries; bounded linear pipelines; one-collection CSV with documented formula-protection normalization; XML's conservative whitespace policy and documented PostgreSQL text subset. No WCAG certification or universal format compatibility is claimed.

Historical implementation evidence is retained in [Canvas acceptance](CANVAS_UX_V22_ACCEPTANCE.md), [Canvas compatibility and design](ARCHITECTURE_CANVAS_V20.md), [Data Diagnostics acceptance](DATA_DIAGNOSTICS_V21_ACCEPTANCE.md), [Pipeline V2](PIPELINE_V2.md) and [Test Data V2](TEST_DATA_V2.md). This report records stable release evidence without rewriting those RC reports.
