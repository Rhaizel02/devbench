# OpenAPI Contract Workbench V1.5

Release candidate on `feature/openapi-explorer-v15`; **28 available entries**. Route: `/tools/openapi-explorer/`, BACK-10 / Backend. V1.5 is not merged into main. Final clean-install/suite/CI acceptance is recorded in [progress](../GOAL_PROGRESS_V15.md) and [validation](../VALIDATION.md); this report distinguishes local verification from publication.

## Integrated base and milestones

Canvas V1.4 was merged intact into main at **666dc73207ba0a2a9f26c686e1ad2e2a796f670f**, preserving the RC history/DTO/migrations/IndexedDB/export code. Integration CI [40233336583](https://github.com/Rhaizel02/devbench/actions/runs/40233336583) and main CI [40233753793](https://github.com/Rhaizel02/devbench/actions/runs/40233753793) succeeded. Before main: 256 unit tests and 36 Chromium flows passed; two explicitly remote historical audits were skipped.

V1.5 starts from that main, in its own branch. Checkpoints: H1 `1be1c21` (types/budgets), H2 `8dea18f` (parser), H3 `1bea08e` (explorer), H4 `2670712` (HTTP), H5 `6c080af` (diff). H1–H5 have verified successful CI (H5: 40236155232); H6 code/evidence checkpoint is 0fb03867f6810fc3f79a91f7bbdd5755be99d18c, workflow 40237058370. The delivery message supplies the final closure SHA and its exact CI outcome. No force push or history rewrite.

## Implemented workflow

1. Paste JSON/YAML or import a local file. Auto identifies JSON first, then safe YAML; Strict JSON rejects trailing commas. A synthetic Spring Boot-style Orders fixture is bundled locally. Parse is explicit, cancellable and preserves the source on failure.
2. Inspect title/API version/OAS version/description, root and effective servers, variables, tags and security schemes. Search operations by method/path/operationId/summary/tags; filter method/tag/deprecated. Operation details show inherited/overridden parameters, required/default/examples, bodies/media, status/responses/headers and effective OR/AND security. Empty/schema-only contracts remain truthful.
3. Open component or inline schemas. Progressive children (30 at a time), properties/required/enums/items/nullable/compositions, explicit reference navigation and breadcrumbs prevent automatic recursive expansion. A cycle is a graph edge. Descriptions and external URLs are inert plain text.
4. Prepare an operation request. Edit JSON-valued parameters, servers/variables, explicit relative base, media/body and optional method/URL/header overrides. Click **Preview request** before code/copy/download/handoff become available. Changing inputs invalidates the preview. cURL, fetch, Java HttpClient and Spring RestClient reuse the existing HTTP engine; no request is executed.
5. Compare the parsed baseline with another pasted/imported contract. Filter changes by severity/category and export JSON or escaped Markdown. Reset, errors, stale results, cancel, copy/download and clean reload are real browser-tested flows.

## Architecture and privacy

`model.ts` defines serializable DTOs independent of Svelte. `references.ts`, `openapi-engine.ts`, `request-engine.ts` and `diff-engine.ts` are pure TypeScript. Client components own source/results/edits; disposable workers handle parse/diff and terminate on cancel, timeout or teardown. Revision identities reject late results. The registry supplies Home, search, palette, pin/recent metadata and prerender entries; the workspace/editor are loaded lazily.

No backend, URL import, OAuth execution, API calls, external resolvers, telemetry or payload persistence. Worker messages are local communication; same-origin module/font/CSS GETs are static resources. OpenAPI never uses Canvas's IndexedDB exception. Reset, reload or leaving clears its in-memory content. Only explicit copy/download/handoff can move reviewed data.

Handoff is local, explicit and one-shot to HTTP Request Builder. It always carries a redacted cURL snapshot, never application URL/hash/history/storage. Credentials are not populated automatically. Sensitive names plus API-key names declared by effective security schemes are redacted. Cookies and every body are redacted by default; the body becomes `[REDACTED body]`, so users must replace it in Builder before using code. An explicit reveal checkbox affects preview/code/copy/download, **not** handoff. Arbitrary secrets in paths/custom fields cannot be identified reliably; manual review remains necessary.

## Support and explicit limits

The implementation follows [OpenAPI 3.0.4](https://spec.openapis.org/oas/v3.0.4.html), [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) and [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901). Structural inspection is not a universal OpenAPI/JSON Schema conformance certificate.

- Supports families 3.0.x / 3.1.x; clearly rejects Swagger 2.0 / OAS 3.2. OAS 3.0 requires operation responses; 3.1 permits omission. Present response maps need at least one response. Schema-only 3.1 documents are supported.
- OAS 3.0 uses its Schema Object subset/nullable; 3.1 uses JSON Schema-based unions/boolean schemas. Reference Object siblings differ by family; 3.1 Schema `$ref` siblings remain extra constraints, not a naive merged replacement.
- Internal URI-fragment JSON Pointers decode percent escapes before token splitting and validate tilde escapes/own properties. Missing targets, cycles, external refs, named anchors and URI scopes are visible diagnostics. External refs are never fetched; `$id` scopes/dynamic refs are not resolved as root pointers.
- Per source: **2 MiB**, 64 levels, 100,000 nodes, 2,000 operations, 4,000 subschemas, 12,000 refs, 200 diagnostics, 256 KiB string values. Worker result: 8 MiB. Parse deadline: 2 s; two-contract diff: 3.5 s. These bound work/structure, not an unmeasured exact browser heap. YAML aliases/executable tags and unsafe integers are rejected; quote large IDs. IEEE-754 decimal precision applies.
- Examples/defaults are labeled separately from synthetic samples. Samples are illustrative, not proven schema-valid. Recursive/composed/scoped schemas need review/manual values. Sampling stops after depth 8 / 300 visits / 30 properties per object. HTTP Builder limits still apply: URL 8 KiB, headers/body 64 KiB and 200 headers.
- Supported serialization: path simple/label/matrix (scalar, flat array/object); header simple with unambiguous members; query form (scalar, flat arrays/objects), flat deepObject with explode, spaceDelimited/pipeDelimited arrays without explode; scalar form cookies. JSON parameter content is supported. Values are percent-encoded by location, and nonsensitive query encoding is preserved during redaction.
- Explicitly blocks unknown style/explode combinations, nested/null parameter members, allowReserved, complex cookies, ambiguous header delimiters, dot-segment path values, unresolved inputs, custom body encoding and multipart/binary bodies. Credential-bearing server variables/path parameters and Path Item reference siblings are explicitly blocked for request generation. Server precedence is operation > path > root; relative/default servers display an editable synthetic base `https://api.example.test`, never DevBench's origin.
- Webhooks/callbacks remain source/reference data with warnings, not outgoing operation rows. Exotic dialects, dynamic anchors and remote schemas are not interpreted.

## Diff semantics

Direction is **before → after**. Removed endpoints/required request additions are clear breaking changes. Request type/enum/size tightening removes accepted inputs; response widening can demand new client cases. Response guarantee removal is breaking. Security is OR across alternatives and AND within each requirement; uncertain changes remain potential. Schemas are compared through internal targets with visited pairs; equivalent renamed refs do not become wire-breaking by name alone.

Classes: `breaking`, `potential`, `compatible-limited`, `indeterminate`. Descriptive changes are annotations, not breaking assertions. Unknown constraints, complex composition, unresolved refs and dialect changes require review. Key ordering does not create changes. Shared component constraints have no single request/response direction, so are conservative. No server/runtime behavior or generated clients are executed.

The analyzer bounds 50,000 schema-pair visits, depth 128 and 2,000 changes. Reports contain title/version/OAS metadata, change paths/categories/explanations/counts/limitations, **not full contracts or example bodies**. Markdown escapes HTML, links/table delimiters, markup and newlines. A report with zero breaking changes is not a universal compatibility guarantee.

## Evidence

Selective acceptance: 54 OpenAPI units (parser/references/hostile YAML/JSON/limits, worker termination, serialization/redaction/sampling, directional diff/cycles/exports), plus five real Chromium flows. Clean npm ci completed with zero vulnerabilities; check/lint/build pass, 310 units in 20 files pass, and the complete Chromium suite passes 41 flows (2 explicitly remote historical audits skipped, no flaky/unexpected tests). Five relevant OpenAPI flows pass again after final guards/preview layout. See VALIDATION and progress.

- [Explorer dark desktop](../screenshots/actual/v15-explorer-dark-1440.png), [light desktop](../screenshots/actual/v15-explorer-light-1440.png)
- [Tablet dark](../screenshots/actual/v15-explorer-dark-768.png), [tablet light](../screenshots/actual/v15-explorer-light-768.png)
- [Mobile dark](../screenshots/actual/v15-explorer-dark-390.png), [mobile light](../screenshots/actual/v15-explorer-light-390.png)
- [Schema navigation](../screenshots/actual/v15-schemas-dark-1440.png), [HTTP preview](../screenshots/actual/v15-request-dark-1440.png), [contract diff](../screenshots/actual/v15-diff-dark-1440.png)

Request, schema and diff layout measurements cover all six viewport/theme combinations in `screenshots/actual/v15-*-checks.json`. Browser tests verify clipboard contents, actual downloaded bytes, local-only traffic/storage, keyboard palette/activation, favorites, deep links/404, invalidation/reset and clean reload. Screenshots use synthetic data and have been visually reviewed; no WCAG or cross-browser certification is implied.

## Findings and release decision

No open P0/P1 from selective acceptance. During implementation, branching schema samples were bounded with a shared visit budget; redaction was corrected to preserve nonsensitive query encoding; dot-segment generation is blocked because URL normalization would change routes. Regression tests protect the first two fixes. P2: dedicated screen-reader/Firefox/WebKit coverage, additional OAS dialect/serialization cases explicitly blocked above, richer semantic compatibility analysis and callback/webhook exploration. These do not imply unsupported cases were silently accepted.

**GO for RC review**: required workflows implemented, 28 entries and full local checks pass, with no open P0/P1. Final exact-SHA CI is checked before delivery; its final SHA/status is provided with the handoff. This is not a production browser certification. V1.5 stays unmerged until user acceptance.

Cloudflare published H6 code checkpoint 0fb0386 at [immutable preview](https://ec293ed4.devbench-aw3.pages.dev); [branch preview](https://feature-openapi-explorer-v15.devbench-aw3.pages.dev) follows the release branch. Normal Playwright navigation to the immutable HTTPS deployment failed before rendering with **ERR_CERT_AUTHORITY_INVALID**, without TLS bypass. Evidence: screenshots/actual/v15-preview-check.json. This is an environment limitation with no unverified attribution; publication is verified, remote behavior is not claimed. No manual deploy or secrets were requested.
