# DevBench V2.3 RC — Platform & Offline

**GO for human RC review. No merge to main.** Exactly30 tools remain available; appV2.3RC and Architecture Canvas2.1. Native PWA, full static preparation, real disconnected workers and voluntary safe updates are implemented. No React, Workbox, backend, remote synchronization, telemetry SDK or new runtime dependency.

## Release identity and publication gate

Base main: `3b03a3ecd29d89f3dc423f57b70e48b49a904875`. Delivery branch: [feature/platform-offline-v23](https://github.com/Rhaizel02/devbench/tree/feature/platform-offline-v23). The final delivery SHA is the commit containing this release report/closing evidence, obtainable from that branch's commit history and reported in the closing delivery message. An exact SHA is not embedded in its own commit.

Verified functional checkpoint: **`3c7e55c3247581b7d8001de6a319dd8bb93843ee`**, [CI40499834623 green](https://github.com/Rhaizel02/devbench/actions/runs/40499834623), Cloudflare deployment68629055. [Immutable tested HTTPS preview](https://68629055.devbench-aw3.pages.dev); [moving branch preview](https://feature-platform-offline-v23.devbench-aw3.pages.dev). Stable production [devbench-aw3.pages.dev](https://devbench-aw3.pages.dev) remains on mainV2.2 until a separately accepted promotion.

The delivery is closed only after the **exact final commit**, including documentation and small install-state correction, passes its own [GitHub Actions run](https://github.com/Rhaizel02/devbench/actions?query=branch%3Afeature%2Fplatform-offline-v23) and normal-TLS preview/SHA check. The prior checkpoint's green CI is supporting evidence, not a substitute. These post-push checks are reported with their exact SHA/run/preview in the final handoff.

Checkpoints preserve normal Git history:5f3229f contract/ADR; c8ef84f native platform core; d4c56f3 complete offline/lifecycle tests;3c7e55c portable hosted recovery correction. Original RC branches and main remain intact. No force push, schema change or database deletion.

## Delivered behavior

- Header **Offline and install → Prepare offline** downloads the entire generated build inventory once. Every unvisited tool workspace, lazy editor, local font and emitted worker is covered. Ready requires complete metadata/resources plus page control; online hints alone never prove readiness.
- Static inventory admission checks exact same-origin clean GET URL, destination, MIME, redirect/cache/Vary policy and decoded body bytes/SHA256. No arbitrary runtime GET caching. No inputs/results/imports/clipboard/downloads/Canvas resources are put in Cache Storage.
- B downloads while A remains usable. Failed/interrupted B keeps A, Later postpones, and only explicit acknowledgement activates/reloads. Old live tabs keep compatible A code and their memory inputs; namespace cleanup leaves unrelated caches and Canvas IndexedDB untouched.
- Before activation and immediately before voluntary reload, Canvas checks active edits and existing autosave.flush. Failed saves block reload and offer actual rescue JSON/cancel/retry. No general input persistence was added to survive an update.
- Manifest root identity/scope/standalone and own192/512/maskable icons pass Chromium manifest/installability checks. Real install action appears only with a genuine browser install event; alternative instructions remain available. Installing an app does not falsely label its ordinary browser tab as standalone.
- Missing bootstrap resources produce a503 recovery page and safe repair, not a broken shell presented as Ready. Unknown routes remain genuine404. Cloudflare's `.html`308 behavior is handled with portable directory-index recovery assets, without relaxing redirect rejection.

Canvas keeps its existing physical IndexedDB version, revision/CAS, immutable legacy originals, domain model and serializer. v1/v2/v3 backups import semantically; rasters, groups, rotations, curved anchors, hierarchy/shared/independent descendants and per-level cameras continue to work. Other tools and their handoffs remain memory-only and clear on navigation/reload.

## Validation and observed budget

Clean local `npm ci`: zero audited vulnerabilities; check0errors/0warnings; lint;494unit tests/32files; static build;59default Chromium flows passed, with the same2historical remote-audit skips. Additional **28offline flows passed locally**:21reused functional flows and7PWA-specific cases, using real A/B static builds, genuine gzip/redirect transport, context disconnection and actual workers. Original27offline flows also passed in checkpoint CI; closing coverage explicitly verifies bidirectional YAML, pre-existing online Canvas→offline recovery and manual three-level creation. Exact delivery CI must run the complete expanded suite.

Public checkpoint smoke: valid HTTPS without certificate bypass, correct build SHA/manifest/scope,30cold disconnected workspaces and actual XML SOAP/XPath, EXPLAIN, OpenAPI, Pipeline, related datasets/FKs and Canvas image/group import→IndexedDB reload→PNG. All190cached entries (189resources + completion metadata) verified; zero page errors/failed requests. [Raw public evidence](../screenshots/actual/v23-public-smoke.json).

Observed public inventory: **189resources /6,035,821decoded bytes (about5.76MiB)**. Public complete preparation: **7,638ms**, including browser/driver/real network. Local source snapshots differ slightly by build identity/platform; the measured local artifact is6,036,007inventory bytes,6,114,933total public-build bytes, including host configuration/SW/inventory overhead. Baseline stable-product build:5,929,945bytes; measured increase184,988bytes, about3.1%. Baseline recorded the documentation-only5f3229f HEAD; its product source equals stable main.

Local partitions:8workers650,142bytes;34font files317,596bytes; initial fresh Home33responses460,787decoded bytes; deferred JS/workers2,417,480bytes. Two live versions retain about12.07MB of resource bodies plus metadata/browser bookkeeping; unknown or long-lived clients can require more than two builds. Do not interpret decoded bytes as compressed transfer size, driver durations as pure renderer timing, or these observations as device-wide performance promises. [Detailed measurements](../screenshots/actual/v23-storage-measurements.json), [preparation](../screenshots/actual/v23-preparation.json), [retained versions](../screenshots/actual/v23-two-build-update.json).

## Evidence and hosting

[Acceptance matrix,30-tool operations and limits](PWA_OFFLINE_ACCEPTANCE_V23.md), [native ADR](PWA_ARCHITECTURE_V23.md), [Firebase configuration/deployment instructions](HOSTING_ALTERNATIVE_V23.md), [continuity log](../GOAL_PROGRESS_V23.md). Real captures are in `screenshots/actual/v23-*`, including six responsive Ready themes, six Canvas Focus themes, child levels, grouped/independent structures, offline workers, update available/deferred, quota/incomplete/save-rescue and public HTTPS states. No mockups are evidence.

Cloudflare remains primary: Node24.22.1, normal branch deployment, build command **npm run build**, output **build**. Do not bypass the offline finalizer by invoking only Vite. Static headers revalidate HTML/manifest/SW and keep hashed resources immutable without overlapping Cache-Control rules. Firebase uses the same output, directory deep links and true404 with no SPA rewrite; configuration is prepared and no SDK/services/credentials/deployment were added.

## Incidents and P2

**No known open P0/P1 after the corrected hosted smoke.** The real Pages308 failure was reproduced at d4c56f3, fixed at3c7e55c and reverified publicly; the cache correctly refused readiness throughout the failure. Initial first-install update wording, decoded transport headers and incomplete-cache recovery were also corrected with real browser coverage.

P2/manual boundaries: physical Android/iOS and OS-installed windows were not available. Chromium156 persistent-profile manifest/installability had zero errors, but the runner offered no genuine beforeinstallprompt and CDP PWA.install returned **'PWA.install' wasn't found**. No native installation is claimed. Mobile/touch/responsive evidence is emulation; native keyboard/file/clipboard behavior needs physical validation. Firefox/WebKit PWA installation coverage is not certified. Firebase publication awaits a real user project/identity; no credentials were requested. OS/browser dependency installation latency in CI is infrastructure overhead, not app latency.

Minor P2: the minimal503 recovery document uses a fixed readable dark palette while application JS is unavailable; it does not restore the app's custom light preference. Normal application/platform controls and Canvas were verified in both themes. This does not affect readiness, repair or document data.

Offline readiness is not synchronization or a backup guarantee. Browsers may evict storage and users may clear it. Export Canvas JSON before clearing site data or moving domains; origins/devices have separate projects and caches. Ephemeral tool inputs intentionally disappear on reload, including an accepted update. No promise of offline persistence is made for these inputs.
