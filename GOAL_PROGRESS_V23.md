# DevBench V2.3 — implementation progress

## Baseline and authority

- Full attached user contract read and preserved verbatim inside V23_PLATFORM_OFFLINE_GOAL.md, with implementation continuity notes. No missing continuation remains.
- Base origin/main: 3b03a3ecd29d89f3dc423f57b70e48b49a904875; main stable V2.2 / Canvas2.1,30tools. Working tree clean before branch creation.
- Branch: feature/platform-offline-v23. Never merge to main or modify original RC branches. Canvas domain/schema/serialization/database remain unchanged.
- Baseline exact CI40443766716 was green at stable release; fetch/check again during baseline checkpoint.

## Milestones

| Milestone                        | State                      | Evidence / next gate                                                                                       |
| -------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| H0 contract and continuity       | Done                       | Complete attachment33,546bytes + substantive implementation notes; this log                                |
| H1 architecture comparison       | Done                       | docs/PWA_ARCHITECTURE_V23.md; Kit3 native manifest/context, strict integrity inventory and client affinity |
| H2 manifest/install              | Pass locally               | Real capability-driven installation; local original icons                                                  |
| H3 strict static cache           | Pass locally               | Exact inventory/URL/response admission and no payload persistence                                          |
| H4 complete precache             | Pass locally               | All30routes, lazy chunks, workers and fonts                                                                |
| H5 state UX                      | Pass locally               | Verified readiness/progress/error and nonblocking controls                                                 |
| H6 safe update                   | Pass locally               | Two real builds, waiting/defer/explicit apply, failure rollback, old clients                               |
| H7 Canvas offline                | Pass locally               | Existing schema1/2/3, images/groups/hierarchy/history/save/export/reload/CAS                               |
| H8 ephemeral tools offline       | Pass locally               | Real representative operations for all30 tools and marker privacy                                          |
| H9 installed/responsive          | Emulation pass / native P2 | Both themes390/768/1440; distinguish physical install/emulation                                            |
| H10 Firebase                     | Prepared / no deployment   | Config/documentation mandatory; no credentials requested                                                   |
| H11 measured storage/performance | Pending                    | Inventory actual bytes, baseline delta, preparation/navigation/retention                                   |
| H12 real offline tests           | Pass locally               | Production build, real SW and workers, setOffline, two builds                                              |
| H13 visual review                | Pending                    | Actual screenshots and inspection                                                                          |
| H14 invariants                   | Pass locally               | Cache/URL/storage privacy and no regressions                                                               |
| H15 checkpoints/CI               | In progress                | Publish coherent checkpoints, exact final CI                                                               |
| H16 documentation                | In progress                | Architecture, acceptance, hosting, release, pertinent current docs                                         |
| H17 RC publication               | Pending                    | Exact final preview/CI, clean tree, main untouched, GO/NO-GO                                               |

## Risks and decisions

Native SvelteKit3 SW selected after installed-source/official-documentation review; no Workbox/new runtime dependencies. Native manifest + post-adapter static SHA256 inventory finalization, transactional preparation, exact path/response admission, per-client in-memory build identification and conservative retention are designed in docs/PWA_ARCHITECTURE_V23.md. Strict static-only allowlist, no broad runtime caching and no unconditional skipWaiting/claim. Preserve old clients' resources and treat Canvas save/failed-save rescue as a platform guard, without schema change. Firebase real deployment is optional and currently unauthenticated/not published. Physical Android/installed window evidence must not be claimed from emulation.

## Tests / commits

Current local gate:494 unit cases/32files;27 real offline Chromium flows pass, including all30 workspaces/operations and two actual builds. Check/lint and default full suite are repeated at the final clean gate. Previous core c8ef84f CI40493296808 was green; final exact CI remains pending. Checkpoint identity is the commit containing this log; inspect git log when resuming.

## Next action

Publish the offline-acceptance checkpoint after check/lint; finish storage/bundle measurements and visual evidence, then clean npm ci/check/lint/units/build/default Playwright and offline suite. Verify exact published CI and Cloudflare HTTPS preparation/workers/Canvas, finish release report, commit/push and keep main untouched.

## Checkpoint C — real offline acceptance in progress

Published core c8ef84fa11da265a06b8ed08fb5ddd4c3da0c6f9 has exact green CI40493296808. Working source now contains real A/B static-artifact harness, gzip transport, actual context disconnection, strict original-build cache-byte verification and reuse of existing functional tests. No mocked workers. Initial run16/17 passed; legacy Pipeline cancellation awaited a network route now correctly served by the SW, so its offline variant cancels the actual worker immediately after the Run state transition instead. Current expanded run is in progress, not accepted yet.

New evidence already demonstrated: all30 previously unvisited workspaces and CodeMirror initialize offline; genuine JSON copy/download; full cache key/body equality; synthetic marker absent from URL/history/requests/logs/cookies/local/session/IndexedDB; offline404; missing bootstrap produces honest503 and reconnect repairs without changing saved Canvas JSON. Preliminary preparation:189resources, about6.04MB uncompressed, around1.2s browser/driver-inclusive on this machine. Final values must be measured from final artifacts.

Corrected after actual visual review: first installation could be offered as an update due to installed-state timing; waiting now requires an existing active worker. A tab whose peer already activated a newer worker gets an explicit guarded reload offer through activeVersion metadata. Fetch-decoded gzip/Brotli bodies have wire Content-Encoding/Length removed before reconstruction. Hosting Cache-Control rules no longer overlap immutable headers on Cloudflare. Mobile safe-area padding uses existing geometry at zero insets. Canvas domain/persistence/serialization remain untouched.

Next gate: finish real A/B failure/defer/old-tab/update, failed Canvas-save rescue and actual CDP cache-quota tests; complete frozen legacy/image/offline export flows. Run proportional check/lint, publish coherent test checkpoint, then final documentation/measurements/clean full quality gate and exact CI/preview. Do not count earlier artifacts carrying c8 identity as the immutable c8 published source: these are explicitly local working-tree builds with a test identity.

Checkpoint C local acceptance:27/27 real offline flows pass (work/v23-offline-third.log),494/494 units pass. Includes browser-enforced1KiB Cache Storage quota denial/retry, static-only query/auth/POST/external probes, all30 cold lazy workspaces, all representative tools, v1/v2/v3 semantic imports, local raster/PNG/portable JSON/reload, groups/rotation/curves/hierarchy/independent duplicate/CAS, failed Canvas-save rescue and two actual builds (failed candidate, Later, explicit activation, retained old-tab XML worker without reload). Earlier failures were fixed test-harness assumptions: hardcoded4173 privacy origin and clicking a Canvas export through an open platform popover. No forced clicks, skipped tests or weakened privacy assertions were used.

Native installation boundary: Chromium156 persistent-profile installability and manifest report no errors; no genuine beforeinstallprompt was offered in this runner and PWA.install CDP returns "'PWA.install' wasn't found". Therefore no OS installation/physical Android claim. Manifest/install controls and mobile layouts are verified; OS/physical checks remain P2. Evidence screenshots/actual/v23-installability.json. Current existing default CI will now also run the actual offline suite.

## Checkpoint D — deployed-host gate and canonical recovery pages

Checkpoint C d4c56f31b956c2b625d288da4f9a552e57d21959 is pushed. Clean npm ci (zero vulnerabilities), check0/0, lint,494units, static build and59default Chromium passes +2historical remote-audit skips completed locally. Exact CI40497714321 is still running at this entry.

Real normal-TLS preview https://436c9f6d.devbench-aw3.pages.dev loads correct SHA/30catalog/manifest/worker and real404, but full offline preparation failed its strict admission: Cloudflare redirects /404.html→/404 and /offline-unavailable.html→/offline-unavailable with308. All187other inventory resources matched their remote bytes. This is a reproducible P1 hosting compatibility defect, not a certificate block; NO-GO until corrected/reverified. Raw diagnosis work/v23-host-diagnosis.json and initial public-smoke JSON record failure honestly.

Correction in progress: preserve host404.html, produce an explicit directory-index offline-not-found copy in the finalizer and move incomplete recovery to its own static directory index. Precache canonical slash URLs on both hosts; keep redirect rejection/integrity unchanged. Native asset declarations use the same build-only directory-index canonicalization. Controlled server now reproduces Pages' .html redirect behavior; browser acceptance asserts no redirecting .html resource is in inventory. Rebuild and run actual offline gates, check/lint, commit/push correction and verify the exact new public preview. No Canvas domain/schema/persistence changes.

Corrected source passes27/27 offline flows against the compressed/redirecting host harness. Two additional focused update cases pass after adding a real context disconnection during partial B download and an unrelated static-cache preservation sentinel. Check0/0 and lint pass. A stale generated asset captured during an overlapping in-progress build was avoided by moving only the verified generated build/output directories into an ignored backup folder, preserving their contents, then rebuilding from settled sources. No user projects/database/files were deleted. Finalizer now rejects non-index HTML precache entries early. CI offline acceptance stops after the first failure to avoid repeating a broken shared preparation fixture; no retries/skips hide failures.

Measured CI40497714321 browser installation took10m15s (11:40:05–11:50:20UTC), while unit/build gates were short. Add a lockfile/OS-keyed cache for the existing Playwright binaries; keep actual install/dependency verification and both browser suites. This is CI preparation overhead only, no runtime dependency or product redesign. Next: publish canonical-host fix, normal-TLS public preparation/30cold routes/actual workers/Canvas smoke, finish final evidence/release doc and wait for exact final CI.

## Checkpoint B — native platform core (working tree)

Architecture checkpoint5f3229f4f814c00a6e97150dfb4b2d0a8d372782 is published. Current implementation adds native Kit3 worker/manual registration, original192/512/maskable assets, manifest, SHA256 post-adapter inventory, strict static-only admission, full preparation/status/install/update controls and per-layout Canvas editing/save/export callbacks. Canvas domain/schema/serializer/history/database are unchanged. Firebase config/documentation is prepared, not deployed.

Observed baseline before product changes:180files /5,929,945bytes,317,596font bytes,2,565,760JS bytes,111,913CSS bytes (work/v23-baseline-size.json). This pre-platform product source equals stable main3b03a3e; the command recorded documentation-only HEAD5f3229f at completion, not a new stable main. Native build now yields188precache resources /6,033,831bytes /30tool routes, excluding the worker/inventory's own digest loop. These are preliminary build observations, not final RC measurements.

Checks: svelte-check0errors/0warnings and worker TypeScript pass before the subsequent small native-resource routing fix;15policy unit cases pass. First complete real browser preparation claimed its same-build client, then context.setOffline(true) loaded never-visited JSON Studio/CodeMirror on a full document navigation with no page errors. Raw work/v23-first-smoke.log and work/v23-first-offline-{ready,json}.png are intermediate evidence, not acceptance of all30tools or safe updates.

Findings corrected: local server's text-license MIME was application/octet-stream, properly rejected by strict admission (server now serves text/plain); Vite minifier emits backtick literals (finalizer insertion recognizes all quote forms); native Kit chunk filenames may be only hashes, so immutable recovery now uses actual declared inventories/digest agreement and binds document resultingClientId before hydration instead of relying on a basename-dot regex. False Ready from incomplete install was never accepted. Need retained-build/two-tab/failure tests to validate this routing beyond first install.

Next exact action: add production-build PWA coverage/strict-cache tests and a two-artifact controlled-server lifecycle harness; reuse representative existing30-tool flows under a real preprepared/offline fixture. Add incomplete-cache recovery, verify Canvas update-save guard/rescue and responsive standalone states. Then type/lint/full policy checks, checkpoint commit/push, continue offline acceptance. No claim of physical installation, two-build safety, all-tool offline or finalCI yet.

Checkpoint B gate: latest check0errors/0warnings including separate worker tsc, lint and15pure policy tests pass; complete production build/finalizer and actual initial preparation + cold offline JSON/CodeMirror smoke pass. Core published checkpoint is the commit containing this paragraph. Safe multi-build activation, all30operations, Canvas reload/export and finalCI remain mandatory next gates.
