# XML Toolkit — V2.1 RC

Route: `/tools/xml-toolkit/` · DATA-07 · Data. Source, output and conversion documents remain in the workspace's memory. No backend, external entities, schemas, requests, active imported DOM, XSLT application or payload persistence.

## Parsing and safety

XML 1.0 complete documents, UTF-8 local files, optional XML declaration, qualified names/namespaces, attributes, empty elements, text, CDATA, comments, PI, Unicode and mixed content. Well-formed XML is **not XSD validation**; XSD is unsupported. Unsupported encodings/versions fail explicitly. No repair or partial valid result is offered.

Chosen dependencies: exact `@xmldom/xmldom` 0.9.12 and `xpath` 0.0.35, MIT, without runtime dependencies. At evaluation time their published unpacked sizes were 440,251 and 183,222 bytes respectively; these are not delivered gzip sizes. The actual production worker bundle is measured separately. They provide inert XML DOM Core and XPath 1.0 in a terminable worker. Native DOMParser/XMLSerializer/document.evaluate were evaluated; synchronous native XPath cannot provide real timeout cancellation and browser DOM APIs are not the worker engine. No React, XML framework or hosted service was added.

Before parsing, a lexical scanner recognizes comment, CDATA, PI and quoted-attribute contexts and rejects every other `<!` declaration. DTD/DOCTYPE, custom entity declarations and obfuscated invalid declarations are disabled before a parser sees them. Declaration-looking text inside comments/CDATA stays data. A start-tag/namespace pass rejects duplicate expanded attributes before xmldom could silently replace them, including equivalent namespace aliases. XML1.0 character checks reject literal/character-reference controls. Parser warnings, errors and fatal errors all stop processing, with a custom handler that never logs source. Post-parse traversal enforces budgets. XML/HTML/SVG is rendered only as escaped Svelte text and CodeMirror content.

Limits: 2 MiB source/output XML; 50,000 nodes, 128 levels, 256 attributes per element / 50,000 total; 256 KiB values. Structured JSON input/output can grow to 8 MiB. Worker responses cap at 8 MiB. Large inspection results can reach the response cap before the source limit; reduce or split the document when this happens. Workers have a three-second processing budget, XPath 1.5 seconds, explicit Cancel, edit/reset/unmount termination and stale-result tickets. No claim that a timer interrupts synchronous main-thread work.

## Whitespace, serialization and exploration

Default Format and Minify preserve **every text node**, including whitespace. They normalize markup syntax and quotes rather than removing potentially significant character data. Minify can consequently leave indentation in place. Explicit “Reindent element-only data” applies 2/4 spaces where text is whitespace-only and element children exist; it is an assumption about data layout, not schema-derived proof. It never alters mixed content, CDATA or inherited `xml:space="preserve"`; `xml:space="default"` restores normal handling. Text and attributes are escaped, including CR references and attribute tabs/newlines.

No byte-for-byte promise: quote choice, empty-tag spelling, XML declaration encoding, original file encoding, newline/entity spelling and original formatting are not retained. Output files are UTF-8. Windows clipboard APIs can represent line breaks as CRLF; download bytes use the generated output string.

The progressive tree shows elements, text, CDATA, comments and PI, with attribute/namespace inspection, counts, depth, search and selected positional XPath. 200 rows initially; explicit additional batches. Paths use `/node()[n]` positions in the parsed document; attributes highlight their owner element. Values/previews are explicitly truncated. Copy/download actions retain the complete bounded result.

## XPath 1.0

Explicit Evaluate, configurable prefix → URI bindings, node-set/string/number/boolean outcomes, match paths/content and selection synchronized with the tree. A default XML namespace still needs an XPath prefix: `//o:order` with `o → urn:devbench:orders`. Bindings can differ across document scopes; the UI shows all declared prefix/URI pairs, while the query uses the configured URI binding.

Maximum expression 2,048 characters; 100 configured prefixes, 1,000 matches, 1 MiB serialized result and a 1.5-second worker budget. Expensive expressions terminate the worker, preserving source and allowing retry. No extensions, custom JavaScript functions, remote document loaders, XPath 2.0/3.1 or XQuery claims. Non-finite XPath numeric values are represented explicitly as strings such as `NaN`, not false zeroes.

## XML ↔ JSON contract

Reversible envelope: `{ "format": "devbench.xml", "version": 1, "declaration": { "version": "1.0" }, "children": [...] }`. Declaration is optional, with optional yes/no standalone. Ordered typed nodes:

- Element: `kind`, qualified `name`, nullable namespace URI, ordered `{name, namespace, value}` attributes and ordered `children`. Namespace declarations are attributes in the xmlns namespace.
- Text, CDATA and comment: `kind`, `value`.
- PI: `kind: "pi"`, `target`, `value`.

The inverse accepts this versioned representation only. It validates budgets, types, names, duplicate attributes, namespace consistency and reserved bindings, escapes data, reparses the produced XML and checks structural equivalence before offering success. It does not manufacture namespace prefixes. Invalid JSON or XML retains input. Arbitrary JSON objects are not presumed to have a meaningful XML root.

Data JSON is an explicitly lossy one-way projection: separate `attributes`, `text` and grouped `elements` maps; repeated elements become arrays. Containers avoid attribute/element collisions and Object.fromEntries preserves special data names without prototype mutation. Child interleaving, mixed-text positions, comments, PI and CDATA identity can be lost. This output cannot be passed to the reversible inverse as though it were a document.

Generated JSON can be handed explicitly to JSON Studio, JSON Query Explorer and JSON Diff. Every destination has its actual byte/depth/node checks, within the existing 1 MiB transfer ceiling. JSON Diff receives the left input only. The per-app channel is consumed once and never appears in navigation/storage. XML is never sent automatically.

## Evidence and limitations

Fixtures: simple orders, SOAP envelope, namespaces/default namespace, repeated elements, attributes, mixed content, preserved spacing, Unicode and CDATA. Unit tests cover malformed XML, DTD/XXE/entity expansion, duplicate expanded names, controls, budgets, serialization injection, escaping, reverse validation and XPath types/namespaces. Chromium differentially checks malformed fixtures against the native parser. Browser flows verify actual copy/download bytes, tree selection, XPath, roundtrip, three handoffs, reset/reload and privacy. Screenshots use `screenshots/actual/v21-xml-*`; final evidence and exact-SHA CI live in `GOAL_PROGRESS_V21.md`.

P2: expanded XML conformance corpora, physical assistive-technology/cross-browser QA, alternate encodings and XML1.1. These are not advertised supported. Native browser XPath is not used; worker isolation is a deliberate responsiveness/security tradeoff. No XSD, XSLT, HTML repair, SVG image rendering or external resolution.
