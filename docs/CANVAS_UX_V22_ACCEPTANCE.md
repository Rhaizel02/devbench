# V2.2 acceptance — Canvas and workflow studio

Release candidate on `feature/canvas-workflow-v22`; no merge to main. Exact published checkpoint SHAs, final CI/preview and open gates live in `GOAL_PROGRESS_V22.md`.

## Acceptance matrix

| Requirement                              | Real implementation                                                                      | Test / evidence                                                                                                         | Current result                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| H0 preserve both RCs / 30 entries        | normal merge cf916ab; unchanged registry identities                                      | integration CI40412271206, catalog30 browser assertion                                                                  | Pass                                                             |
| H1 investigate actual symptoms           | Canvas audit with pointer/pixel/provenance reproduction                                  | v22-before-audit.json + before screenshots                                                                              | Pass                                                             |
| H2 partial/reverse/rotated box selection | operations.ts intersection clipping/polygons/paths; Box select B; additive Shift         | interaction-v22 units; actual marquee/group/style/undo; touch B                                                         | Pass — complete local suite                                      |
| H3 visible order / hit-testing           | BoardSurface native content Layer order after tick                                       | exact overlap RGBA before/after, click selection, undo/reload; connector/group/image ordering                           | Pass — real pixel/hit-test/history/reload, connector/group/image |
| H4 direct bend                           | connectorGrip / bendConnector; same v3 quadratic control                                 | straight→curve midpoint drag, anchored movement, heads/width/color/history/reload/PNG                                   | Pass                                                             |
| H5 Focus and left panel                  | CSS viewport workspace, stage footprint excludes desktop panel, dismissible mobile panel | 1440/768/390 both themes; Escape precedence, hierarchy2/3, camera/reload/unmount                                        | Pass                                                             |
| H6 coherent multiedit                    | explicit mixed fields, property-only patches, HEX commit boundary                        | real two-shape recolor/undo and selected-only stroke                                                                    | Pass                                                             |
| H7 actual release provenance             | release.ts appV2.2RC/Canvas2.1RC/buildSHA, static Vite injection                         | normal HTTPS mainV1.4 vs immutable Canvas2.0 evidence; final preview gate                                               | Pass — exact source SHA and HTTPS interactions verified          |
| H8 full practical flow                   | retained shapes/ink/resize/rotation/group/copies/hierarchy/images/exports                | original Canvas2 real flows plus new acceptance; inspected real captures                                                | Pass — full local suite                                          |
| H9 no backup loss                        | unchanged schema3 / IndexedDB CAS; frozen rich v3 and legacyv1/v2                        | complete semantic equality through roundtrip/history; invalid reference rollback; existing data/quota/original fixtures | Pass locally                                                     |
| H10 PipelineV2                           | typed engine, recipe codec, actual worker and contextual Svelte UI                       | 15 focused units +2 new and3 existing connected browser flows; exact bytes/cancel/privacy                               | Pass locally                                                     |
| H11 datasets                             | pure generator/validator, DAG/unique keys, worker and schema UI                          | 24 focused units +2 browser flows; real FK/CSV/JSON/clipboard/error/reset                                               | Pass locally                                                     |
| H12 themes / responsive                  | existing tokens, compact desktop Pipeline, mobile field layouts                          | v22-focus/dataset/pipeline-{1440,768,390}-{dark,light}.png; no horizontal page overflow                                 | Pass locally                                                     |
| H13 complete quality                     | clean install/check/lint/unit/build/fullPlaywright                                       | final logs and exact SHA CI in progress                                                                                 | Pending final gate                                               |
| H14 privacy                              | Canvas-only IndexedDB; other workspaces instance memory                                  | synthetic marker request/URL/history/storage/cookies/console checks, no active DOM data                                 | Selective pass                                                   |
| H15 recovery / publication               | contract + progress + checkpoint commits / branch push                                   | branch history and source heads                                                                                         | Checkpoints published; final pending                             |
| H16 RC closure                           | no main/source RC changes, clean tree, exact final CI/HTTPS                              | final progress record                                                                                                   | Pending final gate                                               |

## Evidence paths

Actual Chromium screenshots under `screenshots/actual/`:

- Before: v22-before-partial-marquee, before-z-order, before-straight-arrow.
- Canvas: v22-partial-marquee, group-mixed-properties, layer-before/after-front, direct-bend, normal-board, focus-desktop-inspector, focus-level-two/three, focus-width-theme.
- Pipeline: v22-pipeline-recipe and pipeline-width-theme (real intermediate preview).
- Data: v22-dataset-related-schema, related-json, csv-protection, error and dataset-width-theme.

These are real application captures; no mockups or injected stores are claimed as user interactions. Legacy compatibility fixture import is explicitly a backup test setup. Performance JSON reports driver-inclusive observations, never FPS.

## Limits and P2

- Review RC only; neither product acceptance nor main merge is automatic. Main production legitimately remains the old version until accepted.
- Browser evidence is Chromium/Pointer Events emulation. Physical touch/stylus, additional browsers and screen-reader review remain P2; no WCAG certification claim.
- Box selection samples curves32segments and ellipses48segments; excludes stroke/head thickness. No CAD-exact lasso or nested group model. Explicit strict containment remains a domain option, not another visible control.
- Focus is a viewport CSS workspace, not native browser Fullscreen API. Existing camera is preserved; use Fit/pan deliberately when the viewport is smaller.
- Flat CSV is one collection, and spreadsheet safety can make formula-like/negative cells textual; original JSON is unchanged. No SQL/ORM/remote datasets or saved custom templates.
- Pipeline remains8 linear steps with1MiB per value/4MiB cumulative/1.5s deadline. No arbitrary scripts or auto-saved recipes.
- Local projects still require explicit JSON backups for portable recovery. Origin-scoped IndexedDB does not transfer automatically between production and preview URLs; no database deletion or backup regeneration is needed.

Local release gate passed: clean npm ci (zero vulnerabilities), check0/0, lint,479 unit cases across31 files, static build,59 Chromium passes/2 explicitly skipped historical remote audits. Final published-SHA CI and immutable HTTPS preview remain the external acceptance gate. Any observed data-integrity/privacy/core interaction P0/P1 blocks closure.

## Observed performance and historical evidence

Current Canvas measurements are preserved separately in v22-canvas-performance.json (20 figures;100/80 edges;300/200 edges/ink;multilevel). Measurements include driver/DOM and save debounce, not FPS. Old screenshots/measurements regenerated by the suite are restored to their committed historical versions; only the v22 evidence describes this release. No document model, serializer or persistence source differs from the merged original Canvas2 branch.

## Published source and HTTPS acceptance

Source checkpoint **de8db484b16c4cd808778d021dd37ba65827e6e9** passed [CI40417819594](https://github.com/Rhaizel02/devbench/actions/runs/40417819594), job121904425519:479units and59Chromium flows,2historical remote audits skipped. Cloudflare successfully published [immutable preview f034d0ac](https://f034d0ac.devbench-aw3.pages.dev). Chromium normal-TLS smoke verified exact buildSHA/appV2.2RC/Canvas2.1RC,30available, real marquee/group/recolor/Focus/bend/reload, an executing Pipeline text recipe with exact download, related dataset JSON with actual FK membership, reset, privacy markers, clean console/resources and real404. Raw record and3public screenshots: screenshots/actual/v22-preview-full*. No TLS override.229 navigation/resource requests were observed; this is not a zero-network claim.

Public screenshot review prompted the final narrow inspector-visibility refinement (UX-06): no inactive fill/font controls for connectors, paint/font for images or sketch/font for ink. No data/model change. Check/build and4Canvas browser flows pass after it. All source and evidence are published on the RC branch; the exact final artifact commit is identified by Git HEAD and its required GitHub CI check. The agent waits for that exact check and verifies the final HTTPS build before delivery; source checkpoint CI is not substituted for final CI.

**Recommendation: GO for human RC review once the exact final branch-head CI check is green.** No open P0/P1 observed. This recommendation never authorizes merging to main; physical device/assistive/cross-browser work and other explicitly listed P2 remain outside the verified evidence.

### Delivery source and test-readiness follow-up

Latest functional source36ce3b73e7ba75add0f325e9d2b3aa9568f0bc73 passed full normal-TLS public smoke at b033715c, with exact build metadata and the refined contextual inspector. Three captures and structured record are v22-preview-final*. Its CI exposed one intermittent legacy OpenAPI test assertion (58other flows passed,2historical skips), so delivery was held.20targeted investigative executions passed (10before/10after explicit final-editor readiness); a deliberately delayed editor dependency preserved fallback text and correct parsing. Product defect not reproduced; test synchronization hypothesis is documented as such. The original invalidation assertion remains and an input-content assertion was added. No product code changes in this follow-up. Final exact HEAD CI must pass before GO delivery; no failed check is substituted with source-checkpoint evidence.
