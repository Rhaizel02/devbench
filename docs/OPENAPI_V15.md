# OpenAPI Contract Workbench V1.5

Estado: desarrollo en `feature/openapi-explorer-v15`. No se declara RC ni GO antes de implementar y verificar H2–H6. Contrato [V15_OPENAPI_GOAL.md](../V15_OPENAPI_GOAL.md), recuperación [GOAL_PROGRESS_V15.md](../GOAL_PROGRESS_V15.md).

## Base integrada

Canvas V1.4 se integra conservando commits y código completo: main `666dc73207ba0a2a9f26c686e1ad2e2a796f670f`, merge de la rama de integración con RC `9f81acc`. CI main [40233753793](https://github.com/Rhaizel02/devbench/actions/runs/40233753793) comprobada correcta después de validar integración/local. 27 entradas, 256 unitarios y 36 flujos Chromium; dos auditorías remotas históricas omitidas. Código Canvas, DTO/migraciones/IndexedDB/exportaciones sin cambios respecto a la RC.

V1.5 parte de ese main y no tiene autorización de merge. BACK-10 / Backend / `/tools/openapi-explorer/` se incorpora como entrada 28 cuando exista un explorador funcional; no se anuncia una herramienta disponible a partir de tipos o un placeholder.

## Arquitectura decidida

`src/lib/tools/openapi/model.ts` contiene tipos y presupuestos, sin UI, storage ni renderer. Parser/modelo/referencias, generación de borrador y diff son módulos TypeScript separados y concretos. Un worker desechable procesa parse/diff con timeout/cancel y ticket de revisión; no es una plataforma de plugins. Input/resultados/borradores en memoria por instancia. Solo Canvas conserva excepción IndexedDB; OpenAPI no comparte ese gestor de proyectos ni persiste especificaciones.

Motores existentes leídos: `json-engine` ofrece JSON estricto, errores sin fragmentos de input y JSON Pointer; `yaml-engine` rechaza aliases/tags no compatibles/keys no string/valores no finitos; `schema-engine` interpreta Draft 2020-12 con restricciones propias. No se usa ese último como supuesto validador universal de OAS 3.0. Se reutilizan primitivas/semánticas apropiadas y se documentan diferencias. HTTP Builder ya tiene `RequestDraft`, redacción completa de cuerpos por defecto, cURL/fetch/Java/Spring y consumo único de `pendingPaste`. El nuevo flujo debe entregar un snapshot redactado compatible, sin transportar credenciales implícitas.

El renderer utilizará componentes/tokens existentes, listas/detalle y tabs responsivas, CodeMirror cliente y árbol progresivo. Descripciones/Markdown del contrato se muestran como texto, nunca HTML interpretado ni imágenes remotas. Las referencias son destinos internos del modelo o texto externo no resuelto; nunca descargan recursos.

## Semántica y fuentes normativas

Se consultaron [OpenAPI 3.0.4](https://spec.openapis.org/oas/v3.0.4.html) y [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html). El producto cubre familias 3.0.x/3.1.x; 3.2 y Swagger 2.0 se rechazan. `info.version` es versión del contrato/API, distinta de `openapi`.

La familia 3.0 emplea su subconjunto de Schema Object y `nullable`; 3.1 admite el dialecto basado en JSON Schema 2020-12, tipos con null y boolean schemas. Siblings de referencias y URI scopes requieren interpretación contextual. No se prometerá conformance completa ni validación de valores de todos los dialectos por mostrar un schema. Los estilos/explode tienen combinaciones definidas y no definidas; el generador debe bloquear las no soportadas, no aproximarlas silenciosamente. La seguridad efectiva de operación reemplaza la raíz; alternativas OR y requisitos AND se muestran sin ejecutar autenticación.

## Puertas pendientes

H2 parser/referencias y pruebas, H3 explorador, H4 preview/handoff HTTP, H5 comparación/export seguro y H6 aceptación de 28 entradas, UX/privacidad/capturas, instalación limpia y CI completa. Los límites iniciales se declaran en el modelo (2 MiB, 64 niveles, 100.000 nodos, 2.000 operaciones, 4.000 esquemas, worker 2 s/3,5 s diff); se comprobarán con pruebas. No hay resultados inventados de funciones aún no implementadas.

## H2 implemented

Local JSON / safe YAML parsing supports OAS 3.0.x and 3.1.x. Strict JSON mode rejects trailing commas; Auto may identify YAML-compatible flow syntax as YAML. Swagger 2 / OAS 3.2 rejected. Internal URI-fragment JSON Pointers resolve own properties with percent / tilde escapes. Bare reference cycles, missing/external references, anchors and URI scopes remain explicit diagnostics; nothing is fetched. Reference Object siblings follow the 3.0 / 3.1 distinction. Schema-only 3.1 documents are supported. This is structural inspection, not a universal conformance validator.

Budgets: 2 MiB source, 64 levels, 100,000 nodes, 2,000 operations, 4,000 subschemas, 12,000 refs, 200 diagnostics, 256 KiB text values, 8 MiB worker result, 2 s cancellable worker. YAML aliases / custom executable tags rejected. Integers outside JavaScript safe precision rejected; quote large IDs. Decimal IEEE-754 precision applies. Payloads stay in component/worker memory.
