# V2.3 offline acceptance

Functional acceptance: **GO for RC review**, not a merge to main. Base main3b03a3ecd29d89f3dc423f57b70e48b49a904875 remains unchanged. The canonical-host checkpoint3c7e55c3247581b7d8001de6a319dd8bb93843ee has [green exact CI40499834623](https://github.com/Rhaizel02/devbench/actions/runs/40499834623) and real HTTPS/offline acceptance at [its immutable preview](https://68629055.devbench-aw3.pages.dev). Final delivery must additionally pass its own post-push CI and SHA check; an earlier green checkpoint does not substitute for that gate. See [release identity and closure](DEVBENCH_V23_RELEASE.md).

## Method

`npm run test:offline` builds two actual adapter-static artifacts with distinct explicit identities, serves them on a loopback secure context and uses real Chromium service workers and workers. The harness compresses textual resources with gzip. No fake worker implementation, lifecycle mock or network interception supplies the principal offline result. A fixture prepares only Home, disconnects the entire browser context, then reuses functional operations from the existing release tests. A separate test cold-navigates all30 workspaces and waits for real lazy component and CodeMirror readiness.

All cache keys and response bytes are compared with the trusted original build inventory, including SHA256, rather than accepting any cache merely because its name starts with DevBench. IndexedDB inspection permits Canvas documents only; ephemeral markers are checked against stores, metadata storage, requests, logs, URLs/history and cookies. Intentional transport/admission probes contain no document data and are distinguished from application-generated transmissions.

## Acceptance matrix

| Requirement                          | Implementation                                                | Evidence                                                             | Gate                                    |
| ------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- |
| Complete static preparation          | Native worker + adapter inventory, exact bytes/MIME           | offline/pwa.spec; inventory/cold-catalog JSON                        | Pass locally and HTTPS                  |
| All30 unvisited lazy workspaces      | Registry-driven route loop, real CodeMirror/workers           | cold-catalog and reused release/V1.2/V1.3/diagnostics/workflow tests | Pass                                    |
| Privacy                              | Static-only admission and byte equality                       | cache hashes + storage/marker inspection                             | Pass                                    |
| Query/auth/method/external exclusion | Pure policy and real offline fetch probes                     | policy.test + offline/pwa.spec                                       | Pass                                    |
| Incomplete/evicted cache             | 503 recovery document; exact static repair                    | offline/pwa.spec, incomplete screenshot                              | Pass                                    |
| Real two-build lifecycle             | Candidate waiting, Later, explicit apply, old-client affinity | offline/update.spec                                                  | Pass, including mid-download disconnect |
| Canvas guard/rescue                  | Existing autosave flush/export callbacks checked twice        | offline/update.spec                                                  | Pass                                    |
| Quota                                | Honest error, no complete marker, retry                       | offline/quota.spec, CDP quota override                               | Pass                                    |
| Canvas compatibility and assets      | Unchanged schema/persistence; frozen imports and local raster | offline/canvas.spec plus real Canvas regressions                     | Pass                                    |
| Concurrent saves                     | Existing revision compare-and-swap                            | architecture-canvas stale-tab test offline                           | Pass                                    |
| Responsive/platform controls         | Existing tokens + safe areas; install capability gating       | real1440/768/390 dark/light captures                                 | Pass emulation; native installation P2  |
| Firebase alternative                 | Static config/no rewrites/host headers                        | firebase.json and hosting document                                   | Prepared, not deployed                  |

## Thirty-tool operation coverage

Every route below returned200 and loaded its real workspace/CodeMirror in the disconnected cold-navigation test. The public immutable preview independently repeats all30 cold routes, then the six worker/Canvas groups listed in `v23-public-smoke.json`. Operations in the table are the disconnected local functional flows; do not interpret them as30 independent public-production audits.

| Slug                   | Representative operation verified offline                                                            | Functional evidence                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| json-studio            | Format, minify, real clipboard and exact JSON download                                               | release matrix; offline/pwa.spec    |
| json-diff              | Compare documents, error/reset/reload                                                                | release matrix                      |
| json-yaml              | JSON→YAML→JSON semantic roundtrip, clipboard and reset                                               | release matrix; offline/pwa.spec    |
| base64-toolkit         | UTF-8 Base64 encoding and invalid/empty states                                                       | release matrix                      |
| url-toolkit            | Parse URL/query data without navigating to it                                                        | release matrix                      |
| jwt-inspector          | Decode synthetic JWT locally                                                                         | release matrix                      |
| hash-generator         | Compute cryptographic text digest                                                                    | release matrix                      |
| sql-formatter          | Format SQL and reject malformed text                                                                 | release matrix                      |
| regex-tester           | Real regex worker, invalid expression and reset                                                      | release matrix                      |
| text-diff              | Compare text and copy result                                                                         | release matrix                      |
| id-generator           | Generate IDs with Web Crypto                                                                         | release matrix                      |
| timestamp-converter    | Convert strict timestamp and reject invalid input                                                    | release matrix                      |
| json-csv               | Convert records, copy/reset/reload                                                                   | release matrix                      |
| json-code              | Infer code types from JSON                                                                           | release matrix                      |
| curl-inspector         | Parse/redact cURL, reject shell constructs                                                           | release matrix                      |
| cron-explorer          | Evaluate schedule locally                                                                            | release matrix                      |
| string-toolkit         | Transform text, Unicode counts/limits                                                                | release matrix; V1.3 flows          |
| sql-in-builder         | Build parameterized IN values                                                                        | release matrix                      |
| json-query             | Actual JSONPath query                                                                                | V1.2 operation matrix               |
| json-schema            | Validate document against schema                                                                     | V1.2 operation matrix               |
| http-request           | Generate request code; redacted OpenAPI handoff                                                      | V1.2 and OpenAPI flows              |
| http-headers           | Inspect headers locally                                                                              | V1.2 operation matrix               |
| log-inspector          | Inspect synthetic log data                                                                           | V1.2 operation matrix               |
| environment-comparator | Compare environment text                                                                             | V1.2 operation matrix               |
| pipeline-builder       | Import/export recipes, execute XML/text transforms, cancel, inspect/download                         | V1.2; Pipeline V2 flows             |
| test-data-generator    | Unicode text/GTIN; related datasets/FKs and JSON/CSV                                                 | V1.3; Dataset V2 flows              |
| architecture-canvas    | Hierarchy, selection/groups/curves/rotation, independent duplicate, rasters/save/reload/JSON/PNG/CAS | Canvas V2/V2.2; offline/canvas.spec |
| openapi-explorer       | Local file/schema exploration, diff, request-code copy/download/redacted handoff                     | OpenAPI flows                       |
| sql-explain-analyzer   | JSON/text plans, real metrics, tree/filter/compare/export                                            | Data Diagnostics flow               |
| xml-toolkit            | SOAP namespaces, XPath, conservative format, reversible XML/JSON, handoffs, DTD rejection            | Data Diagnostics flow               |

Raw operation evidence: [18-tool matrix](../screenshots/actual/v23-offline-release-matrix.json), [V1.2 matrix](../screenshots/actual/v23-offline-v12-operation-matrix.json), [cold routes](../screenshots/actual/v23-cold-catalog.json), [public HTTPS smoke](../screenshots/actual/v23-public-smoke.json). Worker files are real packaged scripts; their8file partition totals650,142bytes in the measured local artifact.

## Updates, persistence and failure reproduction

The two-artifact harness first prepares A, starts downloading B with controlled slow transport, observes partial B entries, disconnects the whole context, and confirms B has no completion marker while A remains usable. It also injects an actual503 resource response, retries, observes B waiting, postpones, then explicitly acknowledges reload. Canvas JSON stays semantically equal. Another A tab retains its private in-memory input without reload and starts the previously unvisited XML worker under the new active worker. Both version caches remain, while an unrelated cache's static sentinel survives. [Measured retained versions](../screenshots/actual/v23-two-build-update.json).

Storage failure is tested two ways: Chromium's actual Cache Storage quota override denies preparation; resetting quota allows retry. An explicitly simulated Canvas IndexedDB put failure blocks activation/reload and offers a real rescue JSON, then Retry storage recovers. A removed bootstrap entry makes Ready false and an offline navigation return503; reconnect repairs only verified assets without changing the saved project. Domain model, serializer, schemas and IndexedDB physical version have zero diff from stable main.

Resolved P1: on the first public checkpoint Cloudflare returned308 for `/404.html` and `/offline-unavailable.html`; strict preparation correctly failed. The finalizer now precaches portable directory-index recovery URLs and rejects non-index HTML inventory entries. The original host404 remains intact. The controlled host reproduces those redirects. The corrected public checkpoint prepared all189resources in7,638ms observed browser/driver-inclusive time, verified all cache bytes, and executed the worker/Canvas flows with zero page errors/failed requests. This is not a universal download-time promise.

## Visual evidence and measurements

Actual Chromium screenshots live in `screenshots/actual/v23-*`: Home online/offline, Ready at1440/768/390 in both themes, cache/quota errors, update available/deferred/save-rescue, public Ready/Canvas and disconnected OpenAPI/EXPLAIN/XML/Pipeline/datasets. Canvas Focus at all three widths/both themes and levels2/3 remains usable. Screenshots were inspected for controls/overlap/focus/overflow. The platform panel is explicitly opened and closable; it is not a persistent banner. No unexpected document horizontal overflow in the tested layouts. [Measured bytes and initial/deferred partitions](../screenshots/actual/v23-storage-measurements.json), [preparation/layout observations](../screenshots/actual/v23-preparation.json).

Only Canvas may retain project payloads in its existing IndexedDB. All inspected Cache Storage bodies equal known static bytes. Intentional query/auth/POST/external probes fail offline and create no cache keys. Handoffs remain explicit, one-use and memory-only. Browser/provider infrastructure behavior is not a claim of device-wide traffic monitoring; no synthetic private marker was observed in unauthorized channels.

## Limits of evidence

Chromium automation and mobile/touch emulation are not physical Android/iOS installation or OS-window certification. Native install availability depends on actual browser capabilities; no synthetic beforeinstallprompt event is used as proof. CDP quota is a browser-enforced test quota, while Canvas put failure is an explicitly injected deterministic storage fault. They are not claims about filling a physical disk. Browser-managed eviction and user-cleared site data can remove resources/projects. Export JSON backups before clearing browser data or changing origin.

Two loopback builds prove lifecycle behavior under controlled transport. Exact deployed branch HTTPS and Cloudflare headers must be verified separately; CI/deployment success alone does not prove public offline operation. No TLS bypass is allowed. Firebase credentials/deployment, physical device coverage and expanded cross-browser installation remain documented P2 unless actually performed.
