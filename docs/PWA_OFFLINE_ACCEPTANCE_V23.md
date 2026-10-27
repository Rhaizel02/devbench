# V2.3 offline acceptance

Status: implementation acceptance in progress on feature/platform-offline-v23. Base main3b03a3ecd29d89f3dc423f57b70e48b49a904875 remains unchanged. This report is completed with final commit/CI/preview evidence before RC closure; intermediate observations below are not a production certification.

## Method

`npm run test:offline` builds two actual adapter-static artifacts with distinct explicit identities, serves them on a loopback secure context and uses real Chromium service workers and workers. The harness compresses textual resources with gzip. No fake worker implementation, lifecycle mock or network interception supplies the principal offline result. A fixture prepares only Home, disconnects the entire browser context, then reuses functional operations from the existing release tests. A separate test cold-navigates all30 workspaces and waits for real lazy component and CodeMirror readiness.

All cache keys and response bytes are compared with the trusted original build inventory, including SHA256, rather than accepting any cache merely because its name starts with DevBench. IndexedDB inspection permits Canvas documents only; ephemeral markers are checked against stores, metadata storage, requests, logs, URLs/history and cookies. Intentional transport/admission probes contain no document data and are distinguished from application-generated transmissions.

## Acceptance matrix

| Requirement                          | Implementation                                                | Evidence                                                             | Gate                               |
| ------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Complete static preparation          | Native worker + adapter inventory, exact bytes/MIME           | offline/pwa.spec; inventory/cold-catalog JSON                        | Initial pass; final repeat pending |
| All30 unvisited lazy workspaces      | Registry-driven route loop, real CodeMirror/workers           | cold-catalog and reused release/V1.2/V1.3/diagnostics/workflow tests | Initial pass                       |
| Privacy                              | Static-only admission and byte equality                       | cache hashes + storage/marker inspection                             | Initial pass                       |
| Query/auth/method/external exclusion | Pure policy and real offline fetch probes                     | policy.test + offline/pwa.spec                                       | Final browser gate pending         |
| Incomplete/evicted cache             | 503 recovery document; exact static repair                    | offline/pwa.spec, incomplete screenshot                              | Initial pass                       |
| Real two-build lifecycle             | Candidate waiting, Later, explicit apply, old-client affinity | offline/update.spec                                                  | Pending                            |
| Canvas guard/rescue                  | Existing autosave flush/export callbacks checked twice        | offline/update.spec                                                  | Pending                            |
| Quota                                | Honest error, no complete marker, retry                       | offline/quota.spec, CDP quota override                               | Pending                            |
| Canvas compatibility and assets      | Unchanged schema/persistence; frozen imports and local raster | offline/canvas.spec plus real Canvas regressions                     | Pending                            |
| Concurrent saves                     | Existing revision compare-and-swap                            | architecture-canvas stale-tab test offline                           | Pass observed                      |
| Responsive/platform controls         | Existing tokens + safe areas; install capability gating       | real1440/768/390 dark/light captures                                 | Initial pass; final review pending |
| Firebase alternative                 | Static config/no rewrites/host headers                        | firebase.json and hosting document                                   | Prepared, not deployed             |

## Limits of evidence

Chromium automation and mobile/touch emulation are not physical Android/iOS installation or OS-window certification. Native install availability depends on actual browser capabilities; no synthetic beforeinstallprompt event is used as proof. CDP quota is a browser-enforced test quota, while Canvas put failure is an explicitly injected deterministic storage fault. They are not claims about filling a physical disk. Browser-managed eviction and user-cleared site data can remove resources/projects. Export JSON backups before clearing browser data or changing origin.

Two loopback builds prove lifecycle behavior under controlled transport. Exact deployed branch HTTPS and Cloudflare headers must be verified separately; CI/deployment success alone does not prove public offline operation. No TLS bypass is allowed. Firebase credentials/deployment, physical device coverage and expanded cross-browser installation remain documented P2 unless actually performed.
