# V2.1 workbench direction

Use the existing zinc/teal tokens, Geist UI and JetBrains Mono values. Keep the global shell unchanged. The input editor occupies a bounded first panel; explicit Analyze/Format/Evaluate actions produce an inspectable workspace. No fictitious latency or security badges.

SQL: compact summary metrics above a split, vertically scrolling tree and node inspector. Tabs select Plan, Findings and Compare. A metric selector changes the visible numeric annotation, never inventing an exclusive-time heatmap. Dense aligned rows retain node type, relation, original units and a selected state. Findings link to their evidence node. Comparisons have separate trees and an exportable metric table. On mobile, tree/detail use tabs and comparisons stack.

XML: Source, Tree, XPath and Convert tabs with explicit actions and persistent-in-memory source. A bounded output editor reuses OutputActions. Namespace bindings are editable labeled controls. Tree results are text, not inserted imported markup. Mixed content, whitespace policy and conversion fidelity are visible beside the relevant controls. Errors retain input and invalidate actions for previous output.

Both tools: empty state explains the next action; synthetic examples are clearly marked. Cancel stops a worker, reset clears memory, and editing invalidates source-dependent results. Render at most 200 tree rows initially with explicit Show more. Keyboard arrows, Home/End and expand/collapse operate on the visible tree. Focus indication is not color alone. Mobile controls meet 44px targets, page content has min-width:0 and no horizontal page overflow. Actual Chromium captures at 390, 768 and 1440 pixels, in both themes, are the acceptance evidence.

No Canvas domain/schema/persistence changes. No localStorage/sessionStorage/IndexedDB payloads, URL payloads, network parsing or console input. Static worker chunks are legitimate resource requests. Imported labels and attributes are Svelte text interpolations only.
