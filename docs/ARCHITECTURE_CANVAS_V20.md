# Architecture Canvas 2.0 — implementation evidence

Status: implementation in progress, not an accepted RC. Contract: [V20 goal](../V20_ARCHITECTURE_CANVAS_GOAL.md); recovery log: [progress](../GOAL_PROGRESS_V20.md). Canvas2 stays on `feature/architecture-canvas-v20` for human review.

## Accepted integration gate

OpenAPI V1.5 is on main at `c3cd929a5aea231991973abd5744def9d13cf740`, fast-forward from `666dc732`, preserving feature history through `c51c73b`. Product source exactly matches the accepted RC. Clean install, check, lint, 310 unit tests, static build and 41 browser flows passed locally (two historical remote audits skipped). Integration CI [40240617689](https://github.com/Rhaizel02/devbench/actions/runs/40240617689) passed. Main CI [40241056802](https://github.com/Rhaizel02/devbench/actions/runs/40241056802) passed on attempt 2: attempt 1 had an intermittent OpenAPI editor invalidation assertion failure; ten isolated local repetitions passed without source changes. Record as P2 test/editor-loading race to monitor, not a fabricated product fix. Cloudflare check succeeded. Chromium HTTPS still fails `ERR_CERT_AUTHORITY_INVALID`; no TLS bypass or public acceptance claimed.

## Visual direction

The canvas is the primary workspace. Compress heading/project status/breadcrumb; toolbar floats with recognizable shape, arrow, text and pencil tools. Selection exposes small contextual controls; properties/projects/outline open on demand. Keep DevBench's zinc/teal tokens and local fonts. Diagram colors carry document meaning without changing shell accent. No gradients or ornamental animation. Short child-camera transitions respect reduced motion.

Master states to evaluate in real Chromium: empty ready board; colored/sketch architecture; multiple/group selection; contextual figure/connector editing; child breadcrumb; mobile controls. Baseline inspected at 1440×1000: surface 1142×608, at x273/y288. At 390×844: 356×472, x17/y350.6875. No baseline overflow or page errors. [Desktop baseline](../screenshots/actual/canvas-v20-before-1440.png), [mobile baseline](../screenshots/actual/canvas-v20-before-390.png). Final screenshots and comparison remain pending.

## Model and storage

Schema v3 adds optional rotation/seed, flat diagram groups, connector geometry/control/heads and a bounded local-raster resource model. Legacy defaults retain their exact semantics. The frozen v1/v2 reader remains explicit; pure migration changes schema version only and adds no storage side effects. V1/V2 fixtures were exported with the unchanged `c3cd929` reader before implementation and exercise Unicode, text children, ink, styles, edges, cameras and recoverable orphans.

Physical IndexedDB remains `devbench.canvas.v2`, version 1, store `projects`. Opening a saved document does not schedule a rewritten migration. The first actual migrated save atomically preserves the original legacy JSON in the row, retaining it across subsequent edits. Revision compare-and-swap remains mandatory. Saved/raw and original backups can be downloaded even if this app cannot parse a future schema. Failed imports never replace the current project. Current implementation tests and final acceptance matrix are recorded as checkpoints mature; image resource fields are preparatory, not a claim of completed image support.

## Acceptance matrix (live)

| Requirement                                                      | Implementation/evidence                  | Result                                                  |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| H0 main 28 tools                                                 | exact SHA and CI above                   | Pass                                                    |
| Legacy migration                                                 | frozen fixtures, migration-v20.test.ts   | 37 Canvas unit tests passed at initial model checkpoint |
| No automatic legacy rewrite / immutable recovery / future schema | canvas-v20-data.spec.ts                  | Pending browser run                                     |
| Selection/groups/rotation/sketch/connectors                      | domain + renderer work follows data gate | Pending                                                 |
| Hierarchy independent clone                                      | planned atomic DAG copy                  | Pending                                                 |
| Local images/touch                                               | bounded safe gate, no remote sources     | Pending                                                 |
| Final visual/performance/privacy/full regression                 | real Chromium and exact final CI         | Pending                                                 |

Open P0/P1: none confirmed; unimplemented core milestones mean **NO-GO for RC acceptance** until verified. P2: historical remote TLS trust block, intermittent H0 test loading race, physical touch and dedicated assistive-technology testing not performed.
