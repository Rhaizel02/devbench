# DevBench

A focused, local-first developer workbench. **All 18 approved V1/V1.1 tools are implemented**; final release verification is tracked in `GOAL_PROGRESS.md`. The UI is in English.

Repository: [Rhaizel02/devbench](https://github.com/Rhaizel02/devbench). Source publication is complete; static hosting can be configured separately.

## Run locally

Requires **Node 24 LTS** and npm. Install dependencies and start the development server:

```sh
npm ci
npm run dev -- --open
```

On this computer, `start-dev.ps1` selects the bundled Node 24 runtime without changing the system installation. Install dependencies first if `node_modules` is absent.

```sh
npm run check
npm run lint
npm run test
npm run build
npm run preview:static
```

The static preview is available at `http://127.0.0.1:4173/`. It serves generated files without an SPA fallback. The standard Vite preview is also available with `npm run preview`.

Browser checks:

```sh
npx playwright install chromium
npm run test:e2e
```

With the static preview running, `npm run capture` saves genuine browser screenshots and measured layout checks.

## Available tools and shell

- Home with category filtering, directory search, Ctrl/Cmd+K command palette, favorites and up to six recent tools.
- Dark (initial default), light and system themes; responsive navigation and mobile drawer.
- Quick Paste suggests JSON/JWT/URL/SQL/timestamp destinations locally. Ambiguous numbers offer JSON, seconds and milliseconds separately. Only an explicit click transfers content, once, in memory; recognition does not validate content. Limit: 1 MiB UTF-8.
- JSON Studio: strict validation; format with 2 spaces, 4 spaces or tabs; minify; CodeMirror input and read-only output; line wrapping; Code/Tree views; expand/collapse; key/value search; copy values, JSONPath or JSON Pointer; copy output; JSON download; synthetic example; reset.
- JSON Diff: structural, type-sensitive comparison, escaped JSONPath, missing versus null, filters and progressive results.
- JSON ↔ YAML: safe YAML 1.2 core conversion, syntax-aware editors, copy/download and direction swap.
- Base64 Toolkit: strict UTF-8 encoding/decoding, standard and URL-safe alphabets, explicit padding/whitespace policies.
- URL Toolkit: separate component encoding/decoding and absolute URL inspection, repeated query editing, credential redaction and reconstruction. Pasted URLs are never fetched.
- JWT Inspector: strict compact decoding, header/payload, unverified claim types and timestamps, permanent signature-not-verified notice.
- Hash Generator: SHA-256/384/512 on UTF-8 text with Web Crypto, including empty input.
- SQL Formatter: PostgreSQL/MySQL/SQLite, keyword case and indentation using sql-formatter. Formats only; no validation or execution.
- Regex Tester: ECMAScript matches, ranges, capture groups and replacement preview. Runs in a dedicated worker with real termination after 500 ms, cancel and retry.
- Text Diff: unified/split line comparison with original CRLF/LF and final-newline information, optional trailing-space comparison, report copy/download.
- ID Generator: crypto-backed UUID v4/v7 and ULID batches, individual/all copy and download.
- Timestamp Converter: strict seconds/milliseconds/ISO conversion, negative/fractional epochs, UTC/local/IANA displays, invalid calendar rejection and copyable formats.
- JSON ↔ CSV: maintained CSV parsing/quoting, delimiter and header options, multiline Unicode, explicit null/missing/nesting policies and formula warning.
- JSON → Code: sample-based TypeScript interfaces/aliases and Java 17+ records, nested objects, observed optional fields and safe unique names.
- cURL Inspector: parse-only POSIX literal subset, method/target/headers/query/body, default result redaction and explicit reveal. No commands, files or requests are executed.
- Cron Explorer: explicit 5-field Unix / 6-field Spring, IANA zones, next occurrences, AND/OR day rules, skipped DST gaps and both overlap instants.
- String Toolkit: Unicode camel/Pascal/snake/kebab/upper/lower/slug outputs, individual copy, optional lossy mark stripping.
- SQL IN Builder: multiline/CSV values, string/number/blank/NULL/deduplication policies, parameterized output by default and explicitly selected dialect literals.
- All eighteen tools have real static routes and working engines. The directory, categories, command palette and availability counts use one registry.

## Privacy

Inputs and outputs remain in interface memory. They are not uploaded, logged, placed in URLs or saved in browser storage. Navigating away or reloading clears the workspace. Quick Paste transfers once using context created for the current layout instance, with no shared mutable server payload.

Only `devbench.preferences.v1` is written to localStorage: a theme, favorite tool IDs, and recent tool IDs/timestamps. Invalid metadata is discarded; storage failures do not prevent use. Clipboard access and download are explicit actions. Clipboard failures are reported without claiming success.

SvelteKit may write internal navigation indices and scroll positions to sessionStorage during reload/navigation. Its snapshot containers remain empty; workspace contents are not captured. Release tests inspect these shapes and check that synthetic confidential markers are absent from storage, history, URLs, requests and logs.

Fonts and all runtime assets are bundled locally. There is no backend, analytics, authentication, service worker or CDN dependency. Serving the app still loads static assets over the network.

## Architecture

Svelte 5 runes, SvelteKit 3, strict TypeScript 6, Vite, Tailwind CSS 4, Lucide and CodeMirror 6. SvelteKit configuration lives in Vite; native package import aliases use explicit file extensions. An authoritative typed registry drives navigation, Home, palette and prerender entries.

Home and all implemented tool routes are prerendered with trailing slashes and build-time SSR. Tool workspaces and their libraries load lazily; CodeMirror is mounted only in the browser and destroyed on unmount. Pure TypeScript engines handle transformations, detection and preference validation separately from the UI.

`npm run build` creates `build/`, ready for static hosting. Configure Node 24, build with `npm ci` then `npm run build`, and publish the `build` directory. The host must serve each `/tools/<slug>/index.html` and return `404.html` with status 404 for unknown paths; use no SPA rewrite to the Home page. If hosting under a subpath, set the SvelteKit base path before building. No production server or hosting credentials are needed to build locally.

## Limits and behavior

- JSON Studio input limit: **5 MiB of UTF-8**; the four milestone A tools use **1 MiB**. Processing is explicit rather than automatic while typing.
- Editing invalidates the previous output immediately. Validate, Format or Minify creates a current result; syntax errors preserve the input.
- Root strings, numbers, booleans, arrays and `null` are valid JSON. Trailing commas are invalid.
- Native `JSON.parse` / `JSON.stringify` semantics apply: JavaScript numeric precision, key order and duplicate-key behavior are not a lossless JSON representation.
- Tree renders 500 matching/visible nodes initially, with progressive expansion up to 5,000. Traversal is bounded at 50,000 nodes and 128 levels of depth; indentation is visually capped. Very large documents remain usable in Code view; tree limitations are disclosed.
- Syntax locations are shown when the browser's parser supplies them. Error messages do not repeat potentially sensitive input snippets.
- JSONPath uses bracket notation, for example `$["items"][0]`; JSON Pointer escapes `~` and `/`.
- Basic text search is available through CodeMirror's native Ctrl/Cmd+F and the tree search field.

## Verification and references

`screenshots/01–08` are preserved design references. Genuine browser captures are saved in `screenshots/actual/`: [Home dark](screenshots/actual/01-home-dark-desktop.png), [JSON Studio light](screenshots/actual/05-json-light-desktop.png), [code editor light tablet](screenshots/actual/25-final-code-light-tablet.png) and [cURL dark mobile](screenshots/actual/26-final-curl-dark-mobile.png).

The final local clean install on Node 24.22.1 passed check (zero errors/warnings), lint, **149 unit tests**, static build and **16 Chromium flows**. The [18-tool acceptance matrix](screenshots/actual/release-matrix.json) records real operations, copying, reset, reload and empty/invalid states. [Layout evidence](screenshots/actual/checks.json) contains 32 measurements, including every dark/light × 390/768/1440 combination for a complex diff, security inspector, editor and request table. System themes, palette/drawer/tab keyboard behavior, payload privacy, worker termination and blocked permissions are exercised. [Dependency audit](screenshots/actual/dependency-audit.json) reports zero findings in both production and full dependency audits at verification time. GitHub Actions repeats check/lint/unit/build/browser gates on pushes.

Verification uses Chromium and emulated viewport sizes; further browser/screen-reader coverage and minor density tuning are P2 follow-ups. No known P0/P1 remains. `VALIDATION.md` preserves B1 history and appends milestone/release evidence.

## Additional tool limits

JSON Diff caps traversal at 100,000 nodes / 128 levels and results at 1,000 changes. YAML rejects aliases, unsupported tags, duplicate/non-string keys, non-finite values and unsafe YAML integers; comments are not retained. Base64 decodes text only and rejects invalid UTF-8 and noncanonical padding bits. URL query editing supports up to 2,000 rows and follows URLSearchParams normalization, including `+` as space; credentials enter exported results only after explicit reveal.

JWT caps input at 64 KiB, 10,000 decoded nodes and 64 levels; its dates describe untrusted claims at inspection time. SQL input is capped at 128 KiB, and unsupported dialect extensions produce errors without repeating the query. Regex caps pattern at 4 KiB, text at 100,000 UTF-8 bytes, replacement at 10,000 bytes, matches at 1,000 and captured/replacement text at 1 MiB. Offsets are UTF-16 indices, with an exclusive end. Zero-width Unicode matches advance by code point.

Text Diff caps each side at 128 KiB / 2,000 lines, with a 300 ms / 1,000-edit budget and progressive rendering. Its export is a readable line report, not an applyable patch. Ignoring trailing spaces/tabs keeps both originals in split view and uses the left value for unchanged report rows. ID batches are clamped to 1–100; UUID v7/ULID contain generation timestamps, with no same-millisecond or clock-change monotonicity guarantee. Timestamp input caps at 1,024 bytes: decimal seconds accept up to three fractional digits, milliseconds are integers, ISO uses four-digit years and requires an explicit offset. IANA zones affect display; offset-free wall-clock times, invalid dates, leap seconds and 24:00 are rejected.

CSV caps input at 1 MiB, records at 5,000, columns at 200 and cells at 64 KiB. CSV imports strings; null/missing/empty JSON values export as empty cells. Nested values require explicit stringification. Headers are unique/nonempty, missing-width rows fail, headerless data gets column1/column2 names. Formula-like cells are preserved with a warning, not executed or silently changed. Inferred types are samples, not validators: Java uses boxed/reference types, Object fallbacks and informational field mapping comments; TypeScript uses unknown for empty arrays. Code inference caps at 128 KiB, 20,000 nodes, 32 levels and 200 fields per object.

cURL accepts one HTTP(S) target and a documented literal subset of -X/-H/-d/--data-raw/--data-binary/-G/--url with POSIX quoting. Unsupported flags, file references, shell expansions/operators/redirects and multiple targets fail explicitly. It is not PowerShell or a full curl emulator. Results hide credentials, sensitive header/query names, fragments and all bodies until explicit reveal; original input remains visible, and arbitrary secrets in paths/custom names cannot be detected. Limits: 128 KiB, 1,000 arguments, 200 headers and 64 KiB body.

Cron supports numbers/names/lists/ranges/positive steps; Spring ? is an entire day wildcard and Sunday is 0/7. L/W/#, +, year fields and macros are explicitly unsupported. Enumeration uses Croner with field matching and fixed-offset correction around real timezone transitions; descriptions use cronstrue. Limits: 512-byte expression, 20 occurrences, five-year horizon, start year 1970–9990 and 64 rejected candidates. Browser timezone data governs results, not a real scheduler's execution policy. String transforms cap input at 64 KiB, retain non-Latin text and use NFC; optional mark stripping is lossy across scripts. SQL IN caps at 128 KiB, 2,000 values and 8 KiB/value; numbers require safe JS precision. Bind parameters through your driver; IN(NULL) does not match SQL null rows. Literal MySQL strings use UTF-8 hex conversion to avoid backslash-mode ambiguity.

See `VALIDATION.md` for B1 history and `GOAL_PROGRESS.md` for milestone evidence and remaining work. The supplied goal package notes are preserved in `docs/goal-pack/`.
