# B1 validation report

## V2.0 — puerta de aceptación actual

OpenAPI V1.5 integrado en main `c3cd929a5aea231991973abd5744def9d13cf740`: instalación limpia/check/lint/310unitarios/build/41Chromium passed, dos auditorías remotas históricas omitidas; CI integración40240617689 success y CI main40241056802 success (attempt2, con fallo intermitente de editor documentado). Canvas2 permanece aislado y conserva28 entradas. Checkpoints `f3b48bb` CI40242343863 y `65d9d01` CI40243308896 success; H8 a172b4b tuvo un fallo de formato en una prueba, corregido; código final9a4a02846c23fb45f6d352dbb701db1ecceb4364 pasó CI40259451245 completa(348unitarios,47browser/2históricos remotos skipped).

Pruebas nuevas cubren fixtures v1/v2 completos/roundtrip, grupos inválidos/IDs/ciclos/anchors/undo, copia independiente DAG con descendiente editable e imagen compartida inmutable, CAS/futuro con misma revisión, originales legacy, rollback/import/reload, raster real/encodings/límites/codec/timeouts/cierre de caché, cuota/rescate y píxel PNG exacto. Chromium verifica marquee/Shift/Escape/group/move/resize/handle+numeric rotation, curvas/elbows/head styles, direct/zoom hierarchy y cámaras, cuatro escenas representativas, seis layouts de temas, pinch CDP, privacidad y desmontaje. Puerta final: npmci258paquetes/0vulnerabilidades, check0/0, lint, build estático28rutas+lab,348unitarios/24archivos y CI exacta con47browser passed/2skipped históricos. Local full browser148.6s sin unexpected/flaky; ajustes finales recibieron unitarios/build/flows relevantes y luego CI completa. Informe/matriz: [Canvas2](docs/ARCHITECTURE_CANVAS_V20.md); capturas y métricas `screenshots/actual/canvas-v20-*`. Sin certificación WCAG/FPS ni auditoría exhaustiva de producción: hubo intentos anteriores ERR_CERT_AUTHORITY_INVALID, pero el smoke final normal HTTPS del código9a4a028 pasó creación/edición/grupos/export/reload/privacy/unmount sin bypass.

## V1.5 OpenAPI — historical acceptance

Canvas H0 integration is complete: main `666dc73207ba0a2a9f26c686e1ad2e2a796f670f`, exact CI 40233753793 success, preserving the complete RC history. OpenAPI stays on `feature/openapi-explorer-v15`; **28 entries**, existing 27 retained. H2/H3/H4 CIs 40235203199 / 40235471677 / 40235751268 succeeded. H5 and final exact-SHA CI are tracked in GOAL_PROGRESS_V15.md.

Selective checks: check 0 errors/warnings; 54 OpenAPI units; five Chromium flows pass. The new browser flows exercise imported/pasted contracts, filtering, internal refs/cycles/breadcrumbs, four code targets, real clipboard/download, invalidation/errors/reset/reload, redacted one-shot HTTP handoff, directional diff/export, keyboard palette/favorites and a real 404. Explorer/schema/request/diff cover 390/768/1440 dark/light with no measured horizontal page overflow. Synthetic descriptions/remote refs do not produce external requests or DOM HTML. OpenAPI leaves no payload in URLs/history/localStorage/sessionStorage/cookies/IndexedDB/cache/console. Same-origin static GETs are legitimate resources; Canvas keeps its independent documented local-project exception.

Full clean installation/regression results and final GO/NO-GO will be appended only after completion. Evidence and exact limitations: [OPENAPI_V15](docs/OPENAPI_V15.md), `screenshots/actual/v15-*.png` and layout JSON files. Previous validation sections below preserve historical entry counts, branch states and dates; their old main statements do not describe the current release.

## V1.4 — Architecture Canvas Release Candidate

RC on `feature/architecture-canvas-v14`, **27 entries**, lazy/prerendered `/tools/architecture-canvas/` and retained lab. `main` remains V1.3. Check: 0 errors/warnings. Lint and build pass. **256 unit tests / 16 files** pass, including full v1 migration (Unicode IDs, text child links and anchored text connections), v2 roundtrip/hostile imports/cycles/history/autosave failures. **36 local Chromium flows pass**, with the two historical explicitly remote production-audit flows skipped. After the final migration extension, all units and the seven Canvas flows pass again; final CI repeats the complete suite on the pushed commit.

Seven Canvas flows cover drawing/styles/direct text/resize/undo/multiselect/ink/adjustable anchored and free connectors/downloaded JSON+PNG; manual three-level creation, portal/direct/reduced motion/Escape/camera reload/cycles/orphans; six themes/layouts, real CDP touch gestures, keyboard and teardown; actual IDB projects, invalid import preservation/roundtrip/new IDs/confirmation; quota rescue+retry; catalog/pinning/deep reload/404 and representative workload; two-tab stale-write rejection preserving both the newer disk record and a rescue copy of the stale edit.

Representative workload: **300 figures, 20 strokes (400 points), 200 arrows**. Latest measured wall-clock import-to-ready ~1.08 s (includes autosave debounce), move ~652 ms, wheel zoom ~101 ms. These are automated interaction durations, not FPS or a scale guarantee. Exact evidence, nine actual screenshots, all static slugs and lazy-chunk bytes: [canvas-v14-validation.json](screenshots/actual/canvas-v14-validation.json), [performance](screenshots/actual/canvas-v14-performance.json), [RC report](docs/ARCHITECTURE_CANVAS_V14.md). P0/P1 open: none in the verified scope. P2/limitations are explicit in the report; CI/Cloudflare are checked by exact SHA after push, with no production-audit claim.

### Milestone history

Architecture Canvas remains on `/lab/architecture-canvas/` until the RC gate. H1/H2 CI passed on `fadb2f998200d1ae03886f6b127306932dae0671` / `a586324ffc4ff45c9263e9d68af1d163cfbd689e`. H3 selective validation: 36 relevant unit tests (25 new Canvas + 11 spike), check without diagnostics, static build and five real Chromium flows. These cover drag/text/styles/ink/connectors/resize/history/JSON+PNG, a manually built three-level hierarchy, camera persistence/reload/orphans/cycle rejection, six responsive themes, local project roundtrip/import/deletion and injected quota failure with rescue export/retry. Quality/CI outcomes and final acceptance are tracked in [GOAL_PROGRESS_V14.md](GOAL_PROGRESS_V14.md); no full RC GO is claimed yet.

Canvas-only exception: its own projects persist in IndexedDB `devbench.canvas.v2`. Browser tests find the synthetic marker there as intended and reject it in URLs/history/localStorage/sessionStorage/cookies/requests/console; requests are same-origin static GETs. Other tools retain the previous memory-only policy. See [implementation and limits](docs/ARCHITECTURE_CANVAS_V14.md). The following reports preserve historical releases, including their old entry counts.

## V1.3 — Text & Test Data Utilities acceptance (2026-10-25)

Started from clean `main` / `origin/main` **`c2f0e9954e13f61af44badd74de6b7b376b92d40`**, after reading AGENTS, ARCHITECTURE, FEATURES, DESIGN and ROADMAP. The existing Svelte 5 / SvelteKit 3 / strict TypeScript / adapter-static / Tailwind 4 stack and dependencies are unchanged. **26 available entries**, all 25 previous slugs retained, with lazy `/tools/test-data-generator/` (UTIL-03, Utilities). No Home/navigation redesign or V1.4 functionality.

String Toolkit keeps its seven transformations. Live counts run in a debounced, cancellable worker (120 ms / 1.5 s / 64 KiB), with a character budget that never truncates input. Graphemes, Unicode whitespace, word/line rules, UTF-8/UTF-16 and the labeled code-point fallback are specified in UI/README. Unit tests cover composed/combined accents, joined emoji, flags, skin tones, CRLF/trailing/empty lines, apostrophes/CJK, fallback, byte limits and conversion regressions.

Text generation uses local ASCII Lorem Ipsum/readable corpora; exact/max visual lengths are actually checked with the shared counter. Zero/tiny limits, trailing-period replacement, whole-word maximum mode, word counts, all paragraph separators, regeneration and bounds pass. GTIN tests cover known EAN-13/GTIN-14 checksums, strict ASCII/length/whitespace rejection, leading zeros, invalid checksums, actual Web Crypto, 1,000-item uniqueness and full/exhausted suffix spaces. No commercial assignment is inferred; the required testing-only warning is visible. No barcode images or network services.

On bundled **Node 24.22.1**: check **0 errors/warnings**, lint, **220 unit tests / 14 files**, and static build pass. Build output contains **26** tool `index.html` files. The complete local Chromium suite passes **29 flows** (the 26 original flows plus three new ones); the two explicitly external V1.2 production checks are skipped. The original 18-tool and seven-tool V1.2 operation/copy/reset/reload/privacy matrices pass, including all recipes and handoffs. No exhaustive production audit was repeated.

The three new flows verify real clipboard text, actual TXT/CSV downloads read back from disk, numeric batch checksums/leading zeros, individual copy, exact/max lengths, invalidation, reset, errors and reload without payloads. Navigation includes Home count, palette entry, pinning and returning to Home. Synthetic marker/GTIN/text payloads are absent from URLs/history/local/session storage, cookies, Cache API, IndexedDB, requests and console. Only sanitized preference metadata persists; no page/console errors or failed resource responses were observed in the new flows. On Windows, clipboard LF becomes CRLF; the batch test recognizes either separator without modifying identifiers.

**18** layout checks pass: String counter, generated text and GTIN × dark/light × **390/768/1440 px**. Six actual synthetic captures were visually inspected. A constrained output panel discovered during that review was enlarged so the GTIN editor and export actions remain usable on mobile; result counts also remain visible on mobile. Evidence: [v13-acceptance.json](screenshots/actual/v13-acceptance.json), [counter measurements](screenshots/actual/v13-string-counter-checks.json), [text measurements](screenshots/actual/v13-test-text-checks.json), [GTIN measurements](screenshots/actual/v13-gtin-checks.json).

| View                   | Dark desktop                                                   | Light mobile                                                  |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| String Toolkit counter | [1440 px](screenshots/actual/v13-string-counter-dark-1440.png) | [390 px](screenshots/actual/v13-string-counter-light-390.png) |
| Generated text         | [1440 px](screenshots/actual/v13-test-text-dark-1440.png)      | [390 px](screenshots/actual/v13-test-text-light-390.png)      |
| EAN-13 / GTIN-14       | [1440 px](screenshots/actual/v13-gtin-dark-1440.png)           | [390 px](screenshots/actual/v13-gtin-light-390.png)           |

**P0/P1: none open.** P2: broader cross-browser/physical-device/screen-reader coverage remains for later blocks; this is not accessibility certification. Code-point fallback, ASCII corpora, bounded generation, regeneration overlap and CSV text-column import are intentional documented limits. No separate P2 polishing round. README, FEATURES and ROADMAP describe implemented V1.3 behavior. Commit/push and the exact final CI result are checked at delivery; Actions repeats the same installation/quality/browser gates. To reproduce: `npm run check`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`; focused V1.3 UI: `npx playwright test tests/v13-text-test-data.spec.ts` after building.

The following sections preserve the completed V1.2 and earlier acceptance. Their production evidence is point-in-time and is not relabeled as V1.3 evidence.

The published V1.2 deployment was separately audited on 2026-10-25 against HTTPS Cloudflare Pages. See [PRODUCTION_VALIDATION.md](PRODUCTION_VALIDATION.md) for the actual version, 25-route operation matrix, privacy/network evidence, browser limitations and acceptance decision. The local results below remain historical.

## V1.2 final local acceptance — 2026-10-25

This section is current V1.2 evidence; the B1/V1/V1.1 sections below remain historical. All 24 individual tools plus Pipeline Builder are available with 25 unique lazy/prerendered routes. No prior slug was removed. `GOAL_PROGRESS_V12.md` records milestone commits and CI; final matching CI is a required publication gate.

Published implementation: **b4910fc5b64602eb137dc934ee36c4a33a4c8ca7**. Its [exact CI run](https://github.com/Rhaizel02/devbench/actions/runs/40187197456) completed successfully, including clean install/check/lint/195 unit tests/build/all 26 browser flows. This closing metadata change preserves that evidence; its final HEAD synchronization/CI is checked before the completion report.

On bundled Node **24.22.1**, a clean `npm ci`, check (**zero errors/warnings**), lint, **195 unit tests in 13 files**, and static build pass. The complete **26 Chromium browser flows** pass, including the original 18-tool operation/copy/reset/reload matrix and all seven new entries. JSON Query/Schema validation/inference, true clipboard/download contents, JSONPath normalized paths and zero matches, strict invalid/large inputs, internal-only references, escaping, redaction, Java logs, dotenv metadata exports, every committed handoff and all three pipeline recipes are exercised. A hostile schema regex terminates its worker and permits retry. Pipeline order, first failure/not-run states, intermediate preview opt-in, reset and byte/work limits pass. No arbitrary expression execution or network operation is introduced.

Actual Java request code copied from the UI, including Unicode, quotes/backslashes/newlines and a near-64-KiB body, compiles with javac 17. Generated JavaScript receives TypeScript syntax diagnostics. Spring output is a documented imports/method-statements fragment for Framework 6.1+ / Boot 3.2+; bodies use explicit UTF-8 bytes. It was checked against official APIs, without installing Spring or claiming runtime execution. Client-specific header/CORS/default behavior remains documented.

The V1.2 release test checks synthetic secret markers across localStorage/sessionStorage, URL/history, requests and console; cookies, Cache API and IndexedDB remain empty. Only sanitized application preferences persist. The original release test additionally enforces SvelteKit's exact harmless navigation/scroll metadata and empty snapshot containers. New tools reset/reload cleanly; transfers are explicit, instance-local, consumed once and cleared on leaving the target. HTTP handoffs carry redacted code only; no JWT/environment value handoff exists. Environment outputs never contain values, including after editor reveal. Blocked storage/clipboard and hostile regex responsiveness remain covered by the original regressions.

`npm run capture:v12` verifies **25 direct and refreshed static pages**, missing-slug **404**, and **54** no-overflow scenes (Home, JSON Studio and seven V1.2 workspaces × dark/light × 390/768/1440). It saves **14** real synthetic captures under `screenshots/actual/v12-*`; `v12-checks.json` reports zero page errors, console errors, failed resources or external requests. Representative Home/Studio, query/schema, HTTP, logs, hidden environments and mobile/desktop pipeline views were visually reviewed against the approved zinc/teal tokens, local fonts, sidebar and split/mobile tab geometry. This is Chromium/emulated viewport coverage, not accessibility certification.

Full and production-only npm audits both exit 0 with **zero findings**, recorded in `screenshots/actual/v12-dependency-audit.json`. The installed interpreted schema validator has zero runtime dependencies; official meta-schemas are bundled locally and never downloaded because of user input. Numeric overflow is rejected in bounded V1.2 JSON parsing rather than silently serializing infinity as null. Finite values retain native JavaScript precision and duplicate-key behavior.

`.node-version` contains **24.22.1**, and Actions uses it. Cloudflare configuration remains repository root / `npm run build` / `build` with adapter-static. Manual `NODE_VERSION` settings can override runtime selection; no Cloudflare account/build/deployment or public production Playwright audit has been accessed or verified. That audit is reserved for a later Goal.

No known P0/P1 after local acceptance. P2: broader Firefox/WebKit/screen-reader coverage and optional density/compact-control refinements. Intentional limits: explicit JSONPath subset; interpreted schema compliance exceptions, no remote/ID/dynamic references; common Java log and single-line dotenv formats; client-specific generated HTTP behavior; eight-step/1.5-second bounded pipelines with no saved recipes or scripts. All exact limits are in README/workspaces. Historical acceptance below is unchanged.

Validated locally on 2026-10-25. Runtime: Node 24.22.1; npm 10.9.2. No global runtime changes.

## Results

| Check              | Result                                                          |
| ------------------ | --------------------------------------------------------------- |
| `npm ci`           | Passed; lockfile installation, 0 audit vulnerabilities reported |
| `npm run check`    | Passed; 0 errors and 0 warnings                                 |
| `npm run lint`     | Passed; Prettier and ESLint                                     |
| `npm run test`     | Passed; 30 tests in 3 files                                     |
| `npm run build`    | Passed; adapter-static output in `build/`                       |
| `npm run test:e2e` | Passed; all 3 Chromium smoke scenarios                          |
| `npm run capture`  | Passed; 8 browser screenshots plus measured checks              |

The project has been pushed to the user-provided [Rhaizel02/devbench repository](https://github.com/Rhaizel02/devbench). GitHub Actions also passed on the B1 implementation commit: [CI run 40148574031](https://github.com/Rhaizel02/devbench/actions/runs/40148574031). Website deployment remains outside B1.

## Functionality exercised

- Strict invalid JSON `{"a":1,}`: error, preserved input, no valid badge and copy disabled. Valid `{"a":1,"b":[true,null]}`: formatting, tree expansion, path copying, clipboard contents and downloaded JSON contents verified. Root `null` succeeds.
- Format indentation 2/4/tab, minification, Unicode, scalar roots, contextual errors, UTF-8 byte limits, 10,000-element arrays and deep nesting covered by engine tests.
- Tree path escaping, search, collapse/expand, rendered-node limits and depth limits covered by tests. Strings and literals use theme-aware syntax colors after visual review.
- Quick Paste transfers only on explicit action and is consumed once. Leaving JSON Studio through client navigation clears the input before reopening.
- Storage contains only the permitted preference key and sanitized metadata. Synthetic payload markers are absent from storage, URLs, requests and browser logs.
- Favorites, light theme, keyboard command palette, drawer Escape/focus return and mobile panel tabs exercised in Chromium.
- System preference responds to light/dark media changes. All twelve tool deep links return 200 on the static server; an unknown slug returns 404.
- Browser capture sessions recorded no runtime exceptions or external resource requests.

## Visual review

Compared actual Home and JSON Studio against references 01–06. Retained shared branding, teal tokens, 248px desktop sidebar, editor split and mobile tabs. Initial favorites/recent sections are honest empty states rather than mockup data. Mockup validation and telemetry claims were removed.

Actual captures in `screenshots/actual/`:

- `01-home-dark-desktop.png`, `02-home-light-desktop.png` — 1440px.
- `03-home-mobile.png` — 390px.
- `04-json-dark-desktop.png`, `05-json-light-desktop.png` — 1440px.
- `06-json-mobile.png` — 390px.
- `07-home-tablet.png`, `08-json-tablet.png` — 768px.

Measured document width equals viewport width in all eight scenes. `checks.json` records the measurements. Only synthetic data is used in screenshots.

## Priorities and limits

- **P0/P1:** no known open blockers after the checks above. This is selective browser coverage, not an exhaustive accessibility certification.
- **P2:** an already saved light/system theme may briefly show the initial dark palette before hydration. Mobile toolbars wrap to preserve readable controls. Further density/pixel alignment tuning can follow in a later block.
- Tree intentionally limits rendering to 500–5,000 nodes, scanning to 50,000 nodes and depth to 128. The complete output remains available in Code view and download.
- JSON uses native JavaScript number precision and duplicate-key behavior; this is documented in README.
- Clipboard and browser-initiated downloads depend on browser permissions/settings; failures are not reported as success.
- The other eleven V1 tools remain Coming later, and V1.1 remains informational.

## Handoff

B1 source is available locally and on GitHub. `origin` is configured as `https://github.com/Rhaizel02/devbench.git`, and `main` tracks `origin/main`. The final commit is reported in the completion message and can be inspected with `git rev-parse HEAD`. Publishing the source repository does not deploy the website.

Next block: JSON Diff, JSON ↔ YAML, Base64 Toolkit and URL Toolkit, following `ROADMAP.md`.

## Milestone A — 2026-10-25

JSON Diff, JSON ↔ YAML, Base64 Toolkit and URL Toolkit are implemented. Node 24 checks: check (0 errors/warnings), lint, 70 unit tests, static build and all 5 browser flows pass. Browser flows verify clipboard/download contents, Unicode roundtrip, missing versus null, current-output invalidation, URL credentials redaction/query editing, memory cleanup and synthetic payload privacy. Width checks pass at 390/768/1440 px. Real captures 09–12 cover new dual-input and URL workspaces in dark/light and mobile/desktop; reviewed against existing tokens and shell geometry. Original B1 evidence above remains historical.

## Milestone B — 2026-10-25

JWT Inspector, Hash Generator, SQL Formatter and Regex Tester bring the working total to 9/18. Node 24 check has zero errors/warnings; 95 unit tests and all 7 browser flows pass; static build succeeds. Tests cover strict compact JWT/Base64url/UTF-8/claim types and times, independent hash vectors for all SHA variants, three SQL dialects/comments/quotes/placeholders/indentation, zero-width Unicode regex matching and native-compatible replacement previews. A real browser test runs `(a+)+$` against a failing synthetic input, observes the worker terminate after its 500 ms budget, confirms main-thread heartbeat/theme responsiveness and successfully retries. Inspector screenshots 13–14 cover dark desktop/light mobile; no overflow at 390/768/1440. No known P0/P1.

## Milestone C — 2026-10-25

All 12 V1 tools now work. Added bounded jsdiff-based text comparison, secure UUID v4/v7 and ULID batches, and strict epoch/ISO conversion with explicit offsets and IANA displays. Check has zero errors/warnings; lint, 103 unit tests, static build and all 9 browser flows pass. Tests cover CRLF/LF/final newline, original trailing whitespace preservation, diff budgets, cryptographic source/version/variant/timestamp bits, leap years, invalid dates, exact negative/fractional epochs, Madrid DST gaps/overlaps and date limits. Browser verifies actual copying, option invalidation, all 12 tool actions/deep routes, command palette, favorites, payload cleanup and 404. Real captures 15–17 cover dark desktop/light mobile diff and light tablet timestamp output. Saved theme is selected before stylesheet rendering; payloads remain restricted to interface memory.

## Milestone D — 2026-10-25

JSON ↔ CSV, JSON → Code and cURL Inspector bring the working total to 15/18 with real static routes and the Code category. Check (0 errors/warnings), lint, 135 unit tests, static build and all 11 browser flows pass. Browser confirms CSV quoting/Unicode/download contents and delimiter control, observed optional type fields and current-output invalidation, cURL redaction/reveal, rejected shell constructs, memory cleanup and confidential marker privacy. Generated TypeScript passes real strict semantic diagnostics; the synthetic Java output copied from the browser compiled successfully with javac 17.0.12 using --release 17. Captures 18–20 inspected: light code editor desktop/mobile and dark request table tablet. CSV loss, formula risk, Java binding/fallback limitations and the bounded POSIX cURL subset are disclosed. Payloads are never executed; Java compilation here used only the synthetic verification fixture, outside the application. No known P0/P1 after D acceptance.

## Milestone E — 2026-10-25

All 18 approved V1/V1.1 tools are implemented. Added explicit Unix/Spring cron enumeration, Unicode casing/separators, parameter-first SQL IN and one-shot local Quick Paste for JSON/JWT/URL/SQL/timestamps, with numeric ambiguity and unit selection exposed. Check (0 errors/warnings), lint, 148 unit tests, static build and all 13 browser flows pass. Cron tests cover day-field OR/AND, seconds-first Spring, names/ranges/lists/steps, Sunday 0/7, impossible dates, unsupported modifiers, Madrid and Lord Howe gap/overlap correction, a cursor between repeated instants and fractional-hour transitions. SQL tests cover malicious values, quote/backslash policies, CSV multiline fields, NULL/blank/deduplication rules and precision/underflow rejection. Browser verifies actual clipboard values, default placeholders/separate parameters, current-output invalidation, all Quick Paste destinations, one-shot cleanup and confidential marker privacy. Captures 21–22 inspected (dark cron desktop and light SQL IN mobile). F release verification remains mandatory; implementation completion alone does not close the autonomous goal.

## Milestone F — final local release verification (2026-10-25)

Fresh `npm ci` on bundled Node **24.22.1** succeeded without changing the global runtime. `npm run check` reports **0 errors and 0 warnings**; `npm run lint`, **149 unit tests in 8 files**, static build and **all 16 Chromium flows** pass. Tests include the matrix for all **18** direct tool routes: actual transformation/generation, clipboard contents, reset, direct reload, valid/informative empty behavior and invalid input where applicable. Unknown routes return 404; all 18 generated tool directories contain index.html and no unknown-tool file exists. Generated TypeScript receives strict semantic checks; the synthetic Java fixture copied from the UI was separately compiled with Java 17.

The full privacy test inspects localStorage/sessionStorage, history, URLs, cookies, Cache API, IndexedDB, requests and console logs with synthetic confidential markers. No marker leaves interface memory without the explicit clipboard/download action; there are no external runtime requests or uncaught browser errors. Application localStorage contains only sanitized preferences. SvelteKit writes internal navigation indices/scroll positions to sessionStorage during reload; tests enforce the exact harmless shape and empty snapshot containers. Workspace input/output is never captured in these snapshots. This framework behavior is disclosed in README/architecture.

Real browser cases prove the hostile regex worker is terminated, the main thread remains responsive and retry succeeds; invalid flags/patterns and zero-width Unicode matching are covered. Large diff/CSV inputs stop at their documented caps. Blocked storage/clipboard leave transformations and themes usable and never show a false success. Keyboard flows exercise command palette, drawer focus return and mobile input/output tabs. Regex replacement missing named captures now match native behavior even for inherited property names.

`npm run capture` saved 12 current images plus **32 no-overflow measurements**. The new workspaces cover every dark/light × 390/768/1440 combination for JSON Diff, JWT Inspector, JSON → Code and cURL Inspector. Representative new final images are 23–26; earlier stage screenshots remain available, and the original reference PNGs are untouched. CodeMirror mount/font measurement and visiting each editor before full-page capture avoid unmeasured offscreen gutters. Actual layout retains the approved teal/zinc tokens, local fonts, 248px desktop rail, split panels and mobile tabs; no pixel-identical claim is made.

`npm audit --omit=dev` and the full `npm audit` both exit 0 with **zero findings**. The full audit also covers dependencies declared under devDependencies but bundled into the browser, including CodeMirror. No speculative dependency upgrades were made. This is a point-in-time audit, not a security certification.

Evidence: `screenshots/actual/release-matrix.json`, `checks.json`, `dependency-audit.json`, final captures 23–26, test sources and milestone commits. README/FEATURES/ROADMAP/architecture now describe the actual 18 tools, privacy, static build and precise limitations. DESIGN tokens remain unchanged. **P0/P1: none known. P2: optional density/alignment refinements and broader Firefox/WebKit/screen-reader QA; Chromium is the verified browser.** Final commit publication and its CI result are recorded in GOAL_PROGRESS and the completion message. Hosting remains a separate user decision.

Published F implementation: `c0b1676cc9030f07d1cd956d680f8cc07504695c`. Its complete GitHub Actions job passed every step, including all 16 Chromium flows: [CI run 40161871703](https://github.com/Rhaizel02/devbench/actions/runs/40161871703). The following closing checkpoint changes development metadata only; the final pushed SHA and matching CI are confirmed in the completion message.

### V1.5 final local gate

Clean npm ci: 253 packages, zero audit vulnerabilities. Full suite: 41 Chromium flows pass, 2 explicitly remote historical audits skipped, zero flaky/unexpected tests (109.6 s). After the final credential/reference guard: check 0 errors/warnings, lint, **310 units / 20 files**, static build **28 tool directories**, and five relevant OpenAPI flows pass again. Final exact-SHA CI still must be verified before delivery. Evidence: screenshots/actual/v15-h6-validation.json; full detailed local runner JSON is in ignored work/v15-h6-browser.json. No open P0/P1; declared unsupported cases and dedicated assistive/cross-browser coverage are P2.

### V1.5 RC decision and preview

GO for RC review, no open P0/P1; final delivery waits for exact-SHA CI. H5 CI 40236155232 completed/success. H6 code checkpoint 0fb03867f6810fc3f79a91f7bbdd5755be99d18c published by Cloudflare (immutable ec293ed4.devbench-aw3.pages.dev, branch feature-openapi-explorer-v15.devbench-aw3.pages.dev). Normal Playwright HTTPS navigation failed before rendering with ERR_CERT_AUTHORITY_INVALID; no TLS bypass and no remote test pass claimed. Evidence v15-preview-check.json records URL/SHA/error. The final commit SHA and CI status are supplied in the delivery response. No V1.5 merge to main.
