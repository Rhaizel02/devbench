# DevBench — Autonomous V1.1 Completion Goal

**Execution contract:** one long-running, bounded, evidence-driven development objective for Codex Goals, optionally resumed by an external auto-resume mechanism after normal usage resets. **Not a request to evade limits, to run for an artificial duration, or to loop after completion.**

**Repository:** `https://github.com/Rhaizel02/devbench`  
**Verified starting reference (2026-10-25):** `cbb518bc0d2327fbf4da42925a79098a801832ae`  
**Existing baseline:** B1 is implemented: Svelte 5 + SvelteKit 3, TypeScript strict, Vite/static prerender, Tailwind 4, CodeMirror 6, 12 V1 routes, working JSON Studio, Home/sidebar/palette/favorites/Quick Paste. CI was green for B1. **Treat the real repository as authoritative; inspect the present HEAD before doing anything.**

## 0. Mission and unambiguous completion condition

Complete the **whole approved DevBench V1 + V1.1 product** as a genuinely working, polished, privacy-preserving developer toolbox. One of 18 tools, JSON Studio, is already implemented. Build and integrate the other **17** exactly as specified below and in `FEATURES.md`. Update the tool registry, home, command palette, routes, status and docs so they accurately reflect functionality; test the real behavior; verify the static site and its light/dark/mobile presentations. Finish with clean checks, passing relevant tests and GitHub CI, no known P0/P1, and a final **committed and pushed** HEAD hash.

**Do not mark the goal complete** until all 18 tools can be opened and used, the final verification evidence is present, and the final commit is pushed. If a genuine blocker prevents this, stop clearly with the partial progress and exact unblock condition. Never pretend that a partial goal has been completed.

This is an autonomous long task. Do not stop after the first batch, a successful build, a progress summary, or the first usage window. Continue to the next *authorized milestone* while the goal is active and the environment allows it. Do not manufacture tasks merely to exhaust quotas. Stop when the contract is met. No background daemon, quota-checking script, retry spam or unapproved quota bypass is requested.

## 1. Rules of engagement — read once, obey throughout

1. Read `AGENTS.md`, `ARCHITECTURE.md`, `FEATURES.md`, `DESIGN.md`, `ROADMAP.md`, `VALIDATION.md`, and relevant code. Preserve the accepted visual direction from `screenshots/` (Stitch references) and inspect `screenshots/actual/` (B1 reality). Requirements in this document and `FEATURES.md` supersede visually simulated behaviors in screenshots.
2. **Fixed stack:** Svelte 5 runes, SvelteKit 3, TypeScript strict, Vite, `@sveltejs/adapter-static`, Tailwind 4, CodeMirror 6 as appropriate. Do not introduce React, Vue, Next.js, backend, authentication, database, cloud functions, telemetry, generalized dependency-injection systems, monorepos, or state-management packages. Add narrow, maintained libraries only if justified by the tool and lock them through npm.
3. **Data privacy is P0:** all user data stays in browser memory while in use. No sending to external APIs, analytics, error collectors or local servers. No user payloads (text, SQL, JWT, cURL with credentials, JSON, file contents, parsed outputs) in URLs, history, localStorage, sessionStorage, IndexedDB, cookies, Cache API, logs or shared SSR singletons. Preferences keep only sanitized theme, favorite IDs and recent tool IDs/timestamps. The app must still work if storage or clipboard is blocked.
4. Do not execute pasted strings as scripts, shell commands, HTML or template expressions. No `eval`, dynamic `Function`, raw unsafe `{@html}`, fetching user-supplied URLs, or server-side processing. Sanitize/escape output by normal Svelte text rendering; prefer mature parsers. Avoid logging raw parse errors if they contain inputs. Implement input length/complexity caps for potentially expensive operations and surface honest feedback.
5. **Tool engine purity:** put transformations/parsing in testable, framework-independent TypeScript modules wherever feasible. UI is Svelte. Use a common editor/workspace component only when at least two concrete utilities benefit. Keep dynamic imports for editor-heavy tools and tool-specific libraries; do not load all 18 on Home.
6. **UX:** copy means a real clipboard write resolved successfully, download means an actual Blob/URL download, clear means inputs/results disappear. Every visible operation must work. Give actionable errors and useful empty states. Synthetic examples must be labeled. No fake green security seals, validation, measurements, speed claims or placeholder output. Tool-specific action bars and options should match the existing design vocabulary, with no ad hoc redesign.
7. **Routes:** deep-linkable, prerendered static pages for all 18 implemented slugs; 404 for invalid slugs. No catch-all SPA server. Preserve keyboard palette (Ctrl/Cmd+K), favorites, recent metadata and responsive drawer; update Home listing/status dynamically so it never says “1 available” after implementation. Expose the Code category when V1.1 tools are implemented.
8. **Control:** work only in this repository, use its configured `origin`; do not modify other projects or the local Codex runtime. Do not force-push, delete branches, reset/discard user changes or rewrite history. On detecting unexpected concurrent modifications, unresolved merge or a request for security-sensitive authorization, pause/report rather than improvise.
9. **Tests proportional to risk:** focused unit tests for parsers, converters, invalid input, Unicode, dates/DST, entropic IDs, dangerous regex, and quoting. Few high-value Playwright flows for UI, local-only privacy, routing and keyboard. Keep `npm run check`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e` green. Capture/check representative dark/light/mobile browser screenshots as applicable; don't write noisy snapshots of every variant.
10. **P0/P1/P2:** fix P0 and P1 before progressing or claiming success. Do not block a milestone for P2; add concise P2 entries to a backlog in `GOAL_PROGRESS.md` and address during the final polish if valuable. Don't launch endless refactoring/hardening cycles for tiny P2s. If an engine requires a reasonable compromise, document the precise limitation rather than pretending to support it.
11. **No unnecessary questions.** Choose sensible defaults for ordinary product/engineering choices and document them. Ask only for an actual blocker such as missing credentials/permissions, destructive action or a materially undecidable security/product tradeoff. No production deployment is requested: GitHub source publication is authorized, connecting a hosting account is not.
12. **Do not stop early at an intermediate summary.** The controlling finish line is section 0. Follow the milestones below in order, but adapt the substeps to real findings. One active coding thread/worktree per repository; don't start competing agents writing the same checkout.

## 2. Crash-safe continuation and git checkpoints

**Before starting:** inspect `git status --short`, `git branch -vv`, `git log -5 --oneline`, the remote and package scripts. Check the actual completed features instead of assuming the initial commit is still HEAD. If the worktree contains unrelated user changes, preserve them; avoid overlapping edits. Create `GOAL_PROGRESS.md` at repository root (or update it if it already exists). It must contain ONLY development metadata: checklist/status by tool and milestone, decisions, commands/test results, commits pushed, known P2, unresolved blockers, and the next concrete step. No user payloads or secrets, no verbose session transcripts.

When resuming from an interrupted turn, a usage-window reset or context compaction:

- Read `GOAL_PROGRESS.md`, `git status`, `git log`, `FEATURES.md` and the actual implementation, then check what is *really* completed.
- Do not rerun completed batches without a reason. If partially implemented, resume at the smallest coherent pending item; run relevant tests first if repository state is uncertain.
- Treat `GOAL_PROGRESS.md` as an index, not authority: verify against source, tests and commits. Correct stale statuses.
- Do not claim an automatic reset happened; just resume normal work when usage is available. Do not poll usage endpoints or invoke Codex recursively.
- At each milestone: run relevant test subset during changes; then `npm run check`, `npm run lint`, `npm run test`, `npm run build`; add selected browser verification where justified. Fix failures due to your changes. Update progress, commit a coherent milestone and `git push origin HEAD` (or appropriate tracked branch, respecting the current branch); record commit SHA and remote outcome. Verify CI if accessible. Do not create a new branch unless needed to avoid modifying shared work.
- If unable to push due to unavailable access, retain local commits, document exactly why, and **continue local implementation only if it does not risk losing changes**; do not assert the goal is complete without push.

Keep progress messages compact: completed milestone, test evidence, commit and next milestone. Do not repeatedly ask user permission for ordinary in-scope work. A successful test is not sufficient evidence that a user-visible feature is implemented; run short representative E2E flows.

## 3. Milestone A — Data and encoding (former B2)

**Deliver four working tools:**

### A1 — JSON Diff (`DATA-02`)
- Two separately editable JSON input panels, explicit Compare, clear/reset, load synthetic sample, mode to inspect added/removed/changed nodes.
- Strict JSON validation **independently** for left/right; never discard input on error. Structural, type-sensitive comparison. Object key order must not generate false differences; array index order is significant.
- Stable, unambiguous path for each change (`$["key"][0]` or JSON Pointer, with documented escaping). Show side-by-side values for modifications; when a value is absent, distinguish absent vs explicit `null`. Report “identical” honestly.
- Bounded traversal/result rendering for large nested JSON. Avoid unbounded recursive stack overflows; document numbers precision and duplicate keys inherited from JS parsing.
- Tests: reordered object keys, array edits, nested objects, scalar roots, null vs missing, escaped keys, invalid JSON, large limits.

### A2 — JSON ↔ YAML (`DATA-03`)
- Direction selector; input and output text editors; convert, reset, copy/download, examples.
- Use a maintained safe YAML parser/serializer instead of handcrafted regex. Avoid interpreting arbitrary custom tags or dangerous constructors. Display errors with context without logging sensitive input.
- JSON->YAML and YAML->JSON should preserve JSON-compatible scalars, arrays, mapping structure and Unicode. Treat unsupported YAML constructs, non-string map keys or loss of fidelity as explicit errors/warnings; do **not** silently change types (e.g. dates) and claim perfect roundtrips.
- Tests: nested values, strings containing `:`/`#`, Unicode, multiline text, invalid YAML, unsupported types and JSON constraints.

### A3 — Base64 Toolkit (`ENC-01`)
- UTF-8 text ↔ Base64, standard and URL-safe alphabets, optional padding handling. Deliberately choose/document how whitespace and missing padding are handled; strict errors for malformed encoded input.
- Implement UTF-8 using `TextEncoder`/`TextDecoder` (fatal decoding on invalid bytes). Avoid `btoa` on arbitrary Unicode text. Clear, copy, example, invert direction.
- Tests: accented text, emoji, non-BMP Unicode, binary-invalid UTF-8, zero bytes if binary mode is offered, padding variants, malformed characters/lengths, reversible examples.

### A4 — URL Toolkit (`ENC-02`)
- Distinct operations: component percent-encode/decode and structured absolute URL parsing. Do not conflate `encodeURI` with `encodeURIComponent` or force URL-safe Base64 rules here.
- Display protocol, host, port, username/password cautiously (avoid exposing credentials by default), pathname, query key/value pairs (including repeated keys), fragment; allow editing query parameters and reconstructing a valid URL.
- Preserve repeated query keys and significant empty values. Demonstrate URLSearchParams `+` space behavior and separate original URL vs decoded display; explicit errors for malformed percent sequences. Do not automatically navigate to/fetch input URLs.
- Tests: duplicate keys, Unicode, reserved characters, spaces, percent escapes, empty query values, invalid URLs.

**Milestone A acceptance:** All four routes and tools work; status badges truthful; keyboard/copy mobile flows reasonable. Commit+push with tests and progress.

## 4. Milestone B — Security, backend and performance safety (former B3)

### B1 — JWT Inspector (`SEC-01`)
- Decode *compact three-segment JWT appearance*, validate segment encoding and JSON header/payload without executing input. Show algorithm, type, standardized claims `iss/sub/aud/iat/nbf/exp` where supplied, UTC/local times and understandable status regarding **claimed timestamps**.
- Banner always says: **“Decoded only — signature NOT verified.”** Never label a token secure/trusted/authenticated. `alg: none` may be flagged as concerning but avoid pretending this validates any signature. Support invalid UTF-8, malformed base64url, bad JSON, missing claims, unusual claim types, expired/future nbf and arbitrary payloads.
- Do not persist, log, send or put token in URL. Avoid auto-copy of full token. The user may explicitly copy safe decoded fields/output in response to a click; feedback truthful.

### B2 — Hash Generator (`SEC-02`)
- SHA-256, SHA-384, SHA-512 on UTF-8 text using browser `crypto.subtle.digest` only, with uppercase/lowercase hex presentation if desired. Clear, copy result, optionally show input UTF-8 byte count.
- Explain hashes are not encryption or password storage KDFs. Handle unavailable Web Crypto/error honestly. Tests against standard known vectors, Unicode and empty input.

### B3 — SQL Formatter (`BACK-01`)
- Three verified dialects: PostgreSQL, MySQL and SQLite; choose a well-maintained formatter such as `sql-formatter` if compatible and justified. Don't write custom SQL formatter regex. Allow keyword case, indentation and optional basic formatting options.
- Preserve query semantics/comments/placeholders and input; never execute SQL, connect to database, or “fix” syntax. If a formatter cannot validate correctness, say it formats rather than validates. Show robust errors for unsupported dialect constructs. Test JSONB operators, named parameters, multiline queries, comments, quotes, common SQL dialect differences.

### B4 — Regex Tester (`BACK-02`)
- Pattern, flags, text, match list with indices/ranges/capture groups/named groups, optional replacement preview. Document JavaScript/ECMAScript regex semantics (not PCRE). Invalid patterns/flags fail safely.
- **Critical:** a regex such as `(a+)+$` on a long failing string must not indefinitely freeze the UI. Evaluate matching/replacement in a **dedicated Web Worker** or equivalent truly interruptible isolation, enforce meaningful timeout and input caps, terminate timed-out worker, allow retry. A Promise race without worker termination does *not* solve main-thread blocking. Ensure safe progress for zero-width global matches and Unicode.
- Verify timeout behavior and responsiveness via at least one real browser test in addition to focused unit tests. Display indices clearly as JavaScript string offsets when applicable, and bound total result count.

**Milestone B acceptance:** no false security verification, no main-thread catastrophic regex freeze; commit+push and relevant tests.

## 5. Milestone C — Text, identifiers, time + integrated V1 (former B4)

### C1 — Text Diff (`TEXT-01`)
- Two text inputs, unified and split modes, inserted/removed/unchanged lines, toggle to ignore trailing whitespace. Copy/export a diff when meaningful, with faithful line breaks.
- Preserve distinguishability of empty input vs deleted final newline if supported; document display limitations. Use a mature diff algorithm/library and cap excessive memory/rendering for huge inputs. Tests for added, removed, changed and equal lines, CRLF/LF, whitespace toggle and Unicode.

### C2 — ID Generator (`UTIL-01`)
- Generate one or batches of correctly formatted UUID v4, UUID v7 and ULID using `crypto.getRandomValues` or `crypto.randomUUID` where applicable. No Math.random-derived identifiers. Clamp batch size. Time-ordering of v7/ULID when applicable, but no monotonic guarantee unless explicitly implemented and tested.
- Validate version/variant bits for v4/v7, ULID Crockford alphabet and timestamp correctness, batch uniqueness in representative tests. Display copy-all and individual copy with proper feedback; no fabricated uniqueness guarantees.

### C3 — Timestamp Converter (`UTIL-02`)
- Epoch seconds/milliseconds and ISO 8601 in both directions, local/UTC and explicit IANA display timezone (via browser Intl or proven small library). Inputs include offset/time-zone semantics instead of silently interpreting ambiguous dates.
- Handle seconds vs milliseconds deliberately, negative epochs, fractional seconds if supported, valid leap days, invalid calendar dates, time-zone name validation, DST transitions, and representability range. Show exact interpretations, do not silently normalize invalid dates; copy formats.

### C4 — V1 integration hardening
- All 12 V1 status labels say available only if the real engine and UI are done. Verify Home/sidebar/palette/deep links/favorites/recent/Quick Paste and download/copy conventions across the 12.
- The existing B1 JSON Studio must continue working and its privacy tests pass. Incorporate small P2 fixes naturally (e.g., theme flash and mobile action wrap) without redesigning the app.
- Representative 390, 768, 1440 px dark/light checks and E2E; no horizontal overflow and keyboard reachability.

**Milestone C acceptance:** V1 is actually usable 12/12. Commit+push and record validation.

## 6. Milestone D — Data/code/API inspection extensions (former B5)

### D1 — JSON ↔ CSV (`DATA-04`)
- JSON array of records ↔ CSV with selectable delimiter, header row and quoting behavior. Handle quoted separators, escaped quotes, multiline fields, CRLF/LF, Unicode, BOM, missing values and repeated headers policy.
- Explicit policies for null, empty string, missing columns and nested objects/arrays (reject or stringify only when option is clearly chosen; no silent flatten). Large files bounded; user-supplied files are read locally only. Do not execute spreadsheet formula content; warn about formula injection risk when exporting to spreadsheet consumers rather than silently mutating data.
- Focus tests on RFC-style quoting and loss-of-information edge cases; say where perfect roundtrip is impossible.

### D2 — JSON → Code (`CODE-01`)
- Infer **TypeScript interfaces** and **Java records** from JSON objects/arrays. Configurable root type name and real code output for nested structures, arrays, primitives, nulls and partial/optional fields (only infer optionality with evidence, never pretend one sample proves optionality).
- Escape/sanitize arbitrary JSON keys and type identifiers, handle Java and TS reserved words, invalid identifiers, duplicate normalized names and nested-name collisions. Explicit unknown/fallback types for empty arrays/all-null/heterogeneous values where inference is underdetermined. No execute/evaluate/compile user input.
- Unit tests for edge cases and representative code syntax. Generated code must be plausibly usable, not pseudo-code dressed as Java/TS.

### D3 — cURL Inspector (`BACK-03`)
- **Parse only.** Never execute shell, requests, JavaScript, `curl`, or arbitrary URL; no network, no terminal command injection.
- Support a clear subset of cURL options: URL and `-X/--request`, `-H/--header`, `-d/--data`, `--data-raw`, `--data-binary` only where safe to parse, `-G`, relevant content headers, quoting/backslashes in common Unix-shell-style input. Detect unsupported shell constructs (`$()`, backticks, pipes, redirects, multi-command) and fail/flag rather than evaluating. Windows PowerShell dialect differences must not be silently treated as POSIX syntax.
- Show method, target, headers, query and body visibly; redact `Authorization`, `Cookie`, API keys in previews by default and never persist any data. If explicit reveal exists, it stays in memory and is clearly user-triggered.

**Milestone D acceptance:** three working V1.1 tools, registry/routes reflect reality, commit+push and tests.

## 7. Milestone E — Cron, strings, SQL snippets + Smart Input (former B6)

### E1 — Cron Explorer (`BACK-04`)
- Support **5-field Unix** and **6-field Spring** cron *explicitly*. Choose an established parser/iteration library after confirming exact syntax supported. Do not mistakenly treat 6-field Spring as 6-field Unix with year or generic Quartz.
- Show human-readable schedule interpretation and next N concrete occurrences with an **explicit IANA timezone**. Treat `?`, weekday numbering, lists/ranges/steps and day-of-month/week interplay according to the selected syntax. For advanced modifiers such as `L/W/#`, implement them correctly if the selected parser supports them; otherwise mark unsupported clearly instead of guessing.
- Bounded iteration, no unbounded search for impossible calendars; handle timezone/DST gaps and overlaps with tests. Explain when an occurrence is nonexistent or time-shifted, as applicable.

### E2 — String Toolkit (`TEXT-02`)
- Input text → camelCase, PascalCase, snake_case, kebab-case, uppercase, lowercase, slug, with optional separator policy. Correct Unicode handling as far as documented; diacritic normalization/transliteration behavior explicit. No evaluation or HTML injection.
- Keep useful output names, easy one-click copy, sensible input size caps, tests for separators, acronyms, punctuation, blank strings, accented and non-Latin text.

### E3 — SQL IN Builder (`BACK-05`)
- Multiline or CSV values → dialect-aware `IN (...)` snippet; choose strings vs numbers, duplicate handling and optional NULL handling. **Parameterized output should be the recommended/default format** (e.g., PostgreSQL `$1, $2` and relevant `?` placeholders) plus separated parameter values; literal mode only when explicitly chosen and safely escaped for selected dialect.
- Never execute SQL. Proper numeric validation; no silent acceptance of SQL fragments as numbers. Handle quotes, commas, newlines, tabs and empty entries without constructing injection-prone snippets. Do not claim that manual literal interpolation is universally safe.
- Tests for malicious strings, quote escaping, blanks, repeated values and placeholder ordering.

### E4 — Smart Input improvement (bounded extra)
- Improve the B1 Quick Paste from heuristic label to a local, honest suggestion surface for JSON, JWT, URL, SQL and timestamps; when ambiguous show multiple possible destinations. The user must confirm before transferring text to a tool, without URLs/storage. Route only to an implemented tool. The content is consumed once and cleared on navigation.
- Avoid building an AI classifier, server or an interactive flow engine. Detection must never be represented as security/format validation.

**Milestone E acceptance:** all 18 tools implemented, integrated, truthfully marked available, commit+push and tests.

## 8. Milestone F — Release quality, UX, docs and final proof (mandatory)

This stage is **not** an invitation to invent new unrelated features. Use time for correctness and presentation, not churn.

### F1. End-to-end acceptance matrix
- Verify each of **18** real tool routes on the static server; none remains “Coming later” or links to placeholder, and an unknown slug returns 404. Verify every tool has a real operation, sensible invalid/empty states and ability to copy outputs where applicable.
- Verify Home/category counts, global search/palette, favorite/recent metadata, mobile menu, quick paste, title/description, theme switching, color contrast and keyboard focus on at least representative pages.
- Verify dark/light and 390/768/1440 px on representative **new** workspaces (complex dual-input, security inspector, editor and table). Capture genuine browser screenshots and compare them with `DESIGN.md` plus previous Stitch references. Don't claim pixel-identical screenshots; fix structural layout/overflow/contrast issues, leave minor style P2s if safe.
- Validate privacy via browser interception with synthetic confidential markers: no payload in storage, URLs, logs, requests, console and saved preferences. No runtime external requests. Verify leaving/reopening a tool does not resurrect sensitive data unless explicitly still within the same visible tool session.
- Verify large/hostile input doesn't freeze UI where a user can readily trigger it (regex, huge diff, very large CSV). Enforce documented input caps and true worker cancellation where needed. Don't run uncontrolled stress tests that consume huge resources.
- Run `npm ci`, `npm run check`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e` and the existing capture/preview workflow if supported. Check the final static build has all deep-link pages.
- Check `npm audit --omit=dev` results and dependency updates **selectively**. Avoid speculative major upgrades that derail delivery. Security-relevant vulnerabilities in runtime deps merit immediate assessment; report uncertainties honestly.

### F2. Documentation
- Update `README.md` for real supported tools, local privacy, screenshots, how to start with Node 24/npm, scripts and static deployment guidance **without requiring hosting credentials**.
- Update `FEATURES.md` statuses/implementation notes without altering original product scope; update `ROADMAP.md` completed phases and evidence links. In `VALIDATION.md` append final evidence (don't erase B1 history). Keep `DESIGN.md` consistent with actual tokens; avoid rewriting entire docs just to sound impressive.
- Keep `GOAL_PROGRESS.md` concise and include the final 18/18 acceptance table, P0/P1/P2 assessment, commits and CI URL(s). The original B1 `CODEX_B1_PROMPT.md` remains historical, not a reason to recreate scaffolding.

### F3. Optional micro-polish only if core is verified
- Incorporate documented P2s where there is a clear, measurable UX improvement and low regression risk, e.g., prevent theme flash, responsive action toolbar, portable Windows startup script, clearer JSON tree collapsed/search affordances.
- **Do not** add PWA, pipelines, account system, API execution, OpenAPI explorer, analytics, backend, database, hosting deployment or experimental animation. These belong to separate future decisions and are not authorized by this Goal.

### F4. Closure
- Final commit+push. Check final `origin/main` (or tracked authorized branch) includes intended commits without overwriting unrelated work; if CI available, inspect actual status. Report **exact final SHA**, links to milestone commits/CI and a short truthful summary: 18-tool matrix, tests that actually ran, known limitations, residual P2s, and any manual tasks (e.g., deploy web hosting). No invented test execution or screenshots.
- A successful intermediate milestone does not fulfill the Goal. If all acceptance conditions are met, **complete** the Goal and stop. If blocked, report the exact blocking condition; do not keep autonomously spinning or fake completion.

## 9. Execution hints that reduce token waste

- Implement one milestone at a time; batch related files; avoid repeated context dumps, broad repo scans and re-reading long documentation every turn. `GOAL_PROGRESS.md` should keep future resumptions inexpensive.
- Don't optimize arbitrary test counts. Prefer a compact table-driven engine test for a dozen meaningful edge cases over dozens of superficial assertions. Add 1–2 real E2E flows for risky integrations, not a browser test for every checkbox.
- Trust stable browser primitives (URL, TextEncoder/TextDecoder, Web Crypto, Intl) and reputable, actively maintained format/parsing/diff libraries. Keep third-party packages small and lazy-loaded. Never write custom parsers for SQL, YAML or full cron syntax unless no trustworthy alternative exists and the limitation is explicitly bounded.
- Observe Svelte 5 runes and SvelteKit 3 configuration already in project. Avoid regressing CodeMirror SSR/mount lifecycle. Language-specific CodeMirror support should be optional and lazy, rather than painting SQL/YAML as JSON.
- Replace the original dynamic page branch that only loads JSON Studio with a small, maintainable lazy tool loader or equivalent; keep static route generation in sync with the registry. Do not create 18 copies of a giant UI or a generalized plugins platform.
- Distinguish *visual consistency* from copying Stitch screenshots literally: mock data in screenshots is not a production requirement. Prefer truthful, responsive states.
- Treat compiler, linter, tests and CI as feedback; no disabling/faking tests or removing checks to make a milestone pass. Fix flaky tests by addressing root cause or documenting a genuine external issue.
- Make progress until **this** product goal is completed or truly blocked. The target is a finished application, **not** a specified number of hours/tokens or an indefinite sequence of prompts.
