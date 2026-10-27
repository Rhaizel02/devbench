# DevBench — Roadmap

## V2.3 RC — Platform & Offline

Native static-only PWA, explicit complete preparation covering all30 tools, safe deferred updates with Canvas rescue/save guards and old-client retention. No new tools or document schema. Branch feature/platform-offline-v23 remains separate from stable main. Firebase configuration/docs prepared as an independent optional host. [Progress](GOAL_PROGRESS_V23.md), [architecture](docs/PWA_ARCHITECTURE_V23.md), [acceptance](docs/PWA_OFFLINE_ACCEPTANCE_V23.md).

P2: physical Android/iOS and OS-installed-window verification; expanded Firefox/WebKit installation coverage; actual Firebase publication without configured credentials. Browser installability checks and emulation must be distinguished from these manual platform checks. No new scope is implied by this backlog.

## V2.2 — Canvas experience and workflow studio

Stable release integration: integration/devbench-v22-release → main, preserving the complete feature/canvas-workflow-v22 history and **30 available tools**. Canvas2.1, Data DiagnosticsV2.1, PipelineV2 and Test DataV2 are included. The original RC branches remain intact; historical reports below retain their original branch states.

- **Canvas2.1:** intersecting box selection (B also supports touch), atomic groups/multi-style mixed states, actual native scene layering, direct midpoint bending and viewport Focus with a collapsible left desktop inspector. Schema3 and v1/v2/v3 backups remain compatible; only Canvas persists documents.
- **PipelineV2:** ordered/duplicate/enabled steps, accessible reorder plus drag/drop, configuration-only versioned recipe import/export, five built-ins, text/literal/JSONPath/XML operations, real cancellation and bounded intermediate inspection.
- **Test DataV2:** editable scalar schemas, seeded fixtures, five presets, related one-to-many collections with validated foreign keys, bounded JSON/page/CSV, formula-protected CSV. Lorem and standalone cryptographic GTIN functionality remain.

Stable release evidence: [integration, tests, CI and production](docs/DEVBENCH_V22_RELEASE.md). Supporting reports: [Canvas audit](docs/CANVAS_UX_AUDIT_V22.md), [RC acceptance](docs/CANVAS_UX_V22_ACCEPTANCE.md), [Pipeline](docs/PIPELINE_V2.md), [datasets](docs/TEST_DATA_V2.md). Historical RC evidence remains unchanged; current app/Canvas display versions and build SHA come from src/lib/release.ts.


## V2.1 Data Diagnostics RC

Implemented on `feature/data-diagnostics-v21` from OpenAPI-integrated main: BACK-11 PostgreSQL EXPLAIN Analyzer and DATA-07 XML Toolkit, 30 available entries. Local plan evidence/comparison and safe XML/XPath/ordered conversion, with bounded workers and memory-only handoffs. [SQL](docs/SQL_EXPLAIN_V21.md), [XML](docs/XML_TOOLKIT_V21.md), [acceptance gates](GOAL_PROGRESS_V21.md). No main merge without acceptance. Canvas 2.0 remains separately pending; none of its code/data schema enters this branch.

P2: broader PostgreSQL/text/XML conformance corpora, alternate XML encodings/1.1 and dedicated cross-browser/assistive-technology QA. No promises of XSD/XSLT, remote query execution, automatic indexing advice or unbounded XPath. The following sections retain historical release states.


## V2.0 — estado actual

H0 integrado y aceptado: OpenAPI V1.5 en main `c3cd929a5aea231991973abd5744def9d13cf740`, 28 entradas y CI exacta. Canvas2 se desarrolla en `feature/architecture-canvas-v20` y queda como RC para revisión humana; **no se fusiona a main**. H1–H8 implementados: pizarra canvas-first, schema3 compatible v1/v2, selección rectangular, grupos/alineación, Rough.js, rotación/curvas/elbows, duplicación independiente de subárboles y raster local/touch. H9 aceptado sobre código9a4a028: instalación limpia,348unitarios,47flujos/2remotos históricos omitidos, capturas, métricas, privacidad y CI40259451245 verde; smoke HTTPS real pasó. Estado verificable: [progreso V2](GOAL_PROGRESS_V20.md), [matriz y evidencia](docs/ARCHITECTURE_CANVAS_V20.md).

P2 posteriores: lasso opcional/presión y dispositivos físicos, aceptación asistiva y Firefox/WebKit dedicada, grupos anidados solo con modelo/pruebas adecuados, controles de curvas más ricos y routing con obstáculos. Evaluar metadatos en la lista de proyectos cerca del presupuesto máximo, sin introducir una nueva arquitectura de persistencia preventiva. Los bloqueos TLS anteriores quedan documentados; el smoke final HTTPS pasó sin bypass. Pulir centrado/color de errores del diálogo Projects (P2 observado). Sin colaboración/backend/CRDT/IA ni import `.excalidraw` en esta RC. Los estados de ramas anteriores son historia.

## V1.5 integration history

Canvas V1.4 integrated intact into main at `666dc73207ba0a2a9f26c686e1ad2e2a796f670f`, verified by CI. OpenAPI Contract Workbench adds the 28th entry on `feature/openapi-explorer-v15`: bounded local parsing/exploration, request preview/handoff and contract diff. The later V2 authorization integrated V1.5 into main c3cd929a after validation. [Contract](V15_OPENAPI_GOAL.md), [progress](GOAL_PROGRESS_V15.md), [implementation/limits](docs/OPENAPI_V15.md) and VALIDATION contain acceptance evidence.

P2: dedicated assistive/cross-browser coverage; additional explicitly unsupported OpenAPI serialization/dialects, richer compatibility semantics and webhook/callback navigation. Do not broaden this RC or treat zero reported breaks as guaranteed compatibility. Prior release counts and branch statements below are historical.


## V1.4 — Architecture Canvas RC, rama aislada

DRAW-01 es la entrada 27: pizarra de formas/tinta/texto, estilos, transformaciones e historial; jerarquía creada por usuario con apertura directa/portal y huérfanos; proyectos locales IndexedDB con autosave, importación migrada v1/v2, rescate JSON y PNG. Lab sigue disponible. Se conserva main V1.3 y sus 26 slugs, sin merge ni force push. Contrato/evidencia/aceptación en `V14_ARCHITECTURE_CANVAS_GOAL.md`, `GOAL_PROGRESS_V14.md` y `docs/ARCHITECTURE_CANVAS_V14.md`.

P2: validación asistiva dedicada y paridad Firefox/WebKit, interacción avanzada con lápiz/multitáctil y mediciones de documentos mayores/largas sesiones. Routing CAD, colaboración, presión, imágenes, rotación y agrupación avanzada no forman parte de esta RC. La transición visual no es zoom semántico infinito. Los apartados siguientes conservan el histórico V1.3/V1.2.

## V1.3 — Text & Test Data Utilities

26 entradas disponibles. TEXT-02 añade contador Unicode en vivo y límite informativo sin alterar conversiones. UTIL-03 Test Data Generator incorpora corpus locales exactos/máximos/por palabras/párrafos y generación/validación numérica EAN-13 / GTIN-14 con checksum, lotes únicos Web Crypto y exportación. UI/README documentan límites de entrada, fallback, corte de palabras, espacios finales y ausencia de asignación GS1. Motores puros y carga diferida; memoria por instancia y metadatos únicamente en persistencia. Aceptación y capturas en VALIDATION.md.

P0/P1 se corrigen antes del cierre. P2 para próximos bloques: ampliación de pruebas de lector de pantalla/navegadores y ajustes menores de densidad. El fallback de puntos de código y los límites explícitos son comportamiento documentado. V1.4 y Architecture Canvas permanecen fuera de esta entrega.

La auditoría pública V1.2 ya está completada en [PRODUCTION_VALIDATION.md](PRODUCTION_VALIDATION.md). Los bloques siguientes conservan su estado histórico; no atribuir ese informe de producción a V1.3.

## Histórico hasta V1.2

Las 12 herramientas V1, 6 V1.1 y 6 individuales V1.2 más Pipeline Builder están implementadas: 25 entradas utilizables. Los estados `available` dependen de motores y pantallas reales. `GOAL_PROGRESS_V12.md` y `screenshots/actual/v12-checks.json` documentan V1.2; la matriz `release-matrix.json` y la tabla siguiente conservan V1/V1.1. `VALIDATION.md` conserva evidencia histórica y por hito.

| Bloque / hito | Contenido | Estado |
|---|---|---|
| B1 | Base SvelteKit estática, shell/Home, temas, favoritos, recientes, paleta, Quick Paste básico y JSON Studio | Completo |
| B2 / A | JSON Diff, JSON ↔ YAML, Base64 Toolkit, URL Toolkit | Completo |
| B3 / B | JWT Inspector, Hash Generator, SQL Formatter, Regex Tester | Completo |
| B4 / C | Text Diff, ID Generator, Timestamp Converter e integración V1 | Completo: 12/12 V1 |
| B5 / D | JSON ↔ CSV, JSON → Code, cURL Inspector | Completo |
| B6 / E | Cron Explorer, String Toolkit, SQL IN Builder y Quick Paste con múltiples destinos | Completo: 18/18 |
| F | Matriz de release, privacidad, responsive/temas, instalación limpia, dependencias, documentación y CI final | Completo; [CI validada](https://github.com/Rhaizel02/devbench/actions/runs/40161871703) y evidencia en VALIDATION.md |

## Checkpoints publicados

- [A — datos/codificación](https://github.com/Rhaizel02/devbench/commit/100d6a5063a8bafba416bb6a41d530ebe6a26fcd)
- [B — seguridad/backend](https://github.com/Rhaizel02/devbench/commit/71ccb7062f3900438fb6bdd45734bbc618deacd6)
- [C — V1 completo](https://github.com/Rhaizel02/devbench/commit/7bd59ab3d68b06967ca48802b3dc5dc2a4e04e12)
- [D — datos/código/cURL](https://github.com/Rhaizel02/devbench/commit/772d3f790a85f2189caf5ab2570e668de578d6fb)
- [E — 18 herramientas](https://github.com/Rhaizel02/devbench/commit/b3cc31ed524bdb67df348c4b6667e50fa29d8ec7)

Las limitaciones de CSV, inferencia, cron avanzado, fechas, SQL literal y privacidad se documentan expresamente en README/workspaces. Solo se corrigen P0/P1 antes de cerrar; pequeños ajustes de densidad/alineación son P2.

## V1.2 — Backend & Connected Workbench

| Hito | Alcance | Estado |
|---|---|---|
| A | JSON Query Explorer, JSON Schema Lab | Publicado y CI verde |
| B | HTTP Request Builder, HTTP Headers Inspector | Publicado; regresión de relevancia de paleta corregida y verificada en C |
| C | Log & Stack Trace Inspector, Environment Comparator | Publicado y CI verde |
| D | Handoffs explícitos en memoria y Pipeline Builder | Publicado y CI verde |
| E | 25 rutas, instalación limpia, privacidad, temas/tamaños, Node/Cloudflare y cierre | Publicado y CI verde; evidencia en GOAL_PROGRESS_V12.md |

Fuera de V1.2: auditoría exhaustiva contra Cloudflare público (Goal posterior), PWA/offline, OpenAPI, EXPLAIN, backend/usuarios y recetas persistentes. El pipeline actual es lineal, local y acotado, sin scripts, ramas o requests. No se accede a la cuenta Cloudflare ni se afirma verificación de producción.
