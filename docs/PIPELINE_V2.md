# Pipeline Builder V2

Existing FLOW-01 and route `/tools/pipeline-builder/` evolve without additional catalog entries. No new dependencies. Pure typed engine, cancellable dedicated worker, Svelte UI reusing TextWorkspace/CodeEditor/output actions. Desktop separates step configuration from execution/results; tablet/mobile stack with accessible Move up/down alternatives to native drag/drop.

## Recipes

`devbench.pipeline`, version1, name≤80, description≤600,1–8 typed steps. Import/export/copy/duplicate is explicit and configuration-only: source, results, intermediate values and UI identities are excluded by an allowlist.64KiB recipe limit; unknown versions/operations/options, prototype structural keys and invalid scalar options reject before replacing the current configuration. All steps—including disabled ones—remain ordered. No automatic storage or code evaluation.

Load recipe shows its actual steps and keeps the current input. Load synthetic example explicitly resets and replaces input. Five built-ins cover Base64JSON,URLJSON,YAML names,text cleanup and JSON item extraction/minification. Reset clears source, custom metadata, steps and results. Duplicating a recipe only copies session configuration.

## Operations and execution

All previous Base64/URL/JSON/YAML/boundedJSONPath operations remain. New trim, upper/lower, literal replacement (no regex), optional single-match JSONPath unwrapping and safe XML format/conservative minify reuse existing engines. XML format/minify conservatively normalize syntax while preserving all text; they can produce identical output and do not offer a misleading indentation control. XML rejects DTD/entities; this is not XSD validation. Replacement predicts UTF-8 output expansion before allocating it. Text options≤2048characters. No shell/JS/network/SQL.

One worker owns a structured-clone snapshot. A step reports active/success/failed/skipped/not-run. Disabled steps pass the preceding successful value through. First failure prevents final output and subsequent execution. Editing source/configuration cancels an active worker and invalidates results; no stale output is copyable. Explicit intermediate previews stay within the existing budgets.1MiB source and each output,4MiB cumulative,1.5second terminating deadline. Errors do not log payloads.

## Verification

`pipeline-v2.test.ts`:15 focused cases for old/new actual recipes, disabled status, configuration allowlist, hostile import, literal Unicode, JSONPath unwrapping, XML rejection and budgets. `tests/pipeline-v2.spec.ts`:real editor input, preserved-source recipe load, duplicate/reorder/disable, exact clipboard/download bytes, recipe file roundtrip without payload, invalid import rollback, reset/reload/privacy, actual worker cancellation and error recovery. Three existing connected-workflow/handoff browser flows also passed. Current local browser checkpoint:5/5. Final responsive evidence and exact CI are tracked in GOAL_PROGRESS_V22.md.

P2: linear only; no branches/loops/custom scripting, recipe auto-save or remote registry. Native HTML drag/drop supplements keyboard controls; physical touch drag/drop is not certified. Limits are intentional.

The complete479-case unit suite exposed a legacy error-contract regression: an unsupported operation threw before producing a per-step report. The engine again returns a failed step with the existing error wording; recipe import and UI still prevalidate the complete configuration before running. The original regression assertion was retained and now passes.
