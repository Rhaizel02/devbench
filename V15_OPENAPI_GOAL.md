# DevBench V1.5 — OpenAPI Contract Workbench: contrato ejecutable

## Resultado, autoridad y recuperación

Objetivo autorizado: integrar primero la RC completa Architecture Canvas V1.4 en main y entregar después una RC real de OpenAPI Contract Workbench en su rama V1.5. No basta un plan ni un scaffold. Este contrato amplía el texto pegado por el usuario y debe leerse con GOAL_PROGRESS_V15.md después de compactaciones o interrupciones. Se conserva H0–H6 hasta aceptación demostrada o bloqueo real; no reducir alcance para cerrar una sesión. El Goal activo referencia el archivo pegado original en las attachments de Codex, cuyo contenido ya se leyó antes de operar.

Repositorio Rhaizel02/devbench, inspección inicial: main/origin-main fa0490f5872262614ba9fe0370377295f3112fae (V1.3, 26 entradas), RC origin/feature/architecture-canvas-v14 9f81acc46164e1167906ff529af557465aa755ed (27 entradas). Working tree inicialmente limpio. Verificar de nuevo ramas/remotos/CI antes de fusionar. La prohibición histórica de merge del contrato V1.4 queda superada exclusivamente por la autorización explícita H0 del usuario; no implica permiso para fusionar OpenAPI V1.5.

Stack invariable: Svelte 5, SvelteKit 3, TypeScript strict, Vite, adapter-static, Tailwind 4, Cloudflare Pages. Conservar Konva/svelte-konva, DTO v2, migración v1, IndexedDB, historial y pruebas Canvas. No sustituir por Excalidraw React. Sin backend, login, IA externa, solicitudes de API, OAuth interactivo, telemetría, importación desde URL ni descargas de referencias externas. No force push ni reescritura del historial.

## Hitos y puertas de aceptación

### H0 — integrar Canvas antes de OpenAPI

Crear rama de integración desde main e incorporar mediante merge la RC entera, preservando sus commits, recursos, documentación y tests. Guardar este contrato y progreso al comienzo. Resolver conflictos mediante inspección; no eliminar ninguna de las 26 herramientas existentes ni funcionalidades Canvas para hacer pasar checks. Inspeccionar el CI real de la RC y de la rama de integración. Ejecutar check/lint/tests/build, validar 27 entradas y regresiones críticas; incluir los flujos de IndexedDB, migración/import v1/v2, autosave, errores/rescate, export JSON/PNG y jerarquía que ya existen.

La integración se prueba antes de tocar main. Si hay P0/P1, corregir y repetir controles relevantes. Después, merge a main sin reescribir historial, push y comprobar CI de ese SHA exacto. Registrar SHA de integración y SHA de main resultante. No introducir código OpenAPI hasta superar esta puerta. La auditoría HTTPS de Canvas sigue bloqueada por certificado desde el entorno anterior: no ignorar TLS, no atribuir una causa sin evidencia y no presentar publicación de Cloudflare como una prueba remota pasada.

### H1 — base de la rama V1.5

Desde main ya integrado y verificado, crear feature/openapi-explorer-v15. Base de 27 entradas; reservar BACK-10 / Backend / `/tools/openapi-explorer/` para la nueva herramienta 28. Leer los motores HTTP, JSON, YAML, JSON Schema, handoffs y patrones de UI actuales antes de reutilizarlos. Mantener una aplicación, registro único, imports diferidos y entries prerender. No registrar como available una pantalla que solo simula funciones ni mostrar controles sin acción. La integración pública debe ser real a más tardar en H6.

Confirmar contratos de tipo que cruzan componentes: documento, operaciones, parámetros, esquemas, referencias y petición HTTP. El dominio se separa de componentes; los workers reciben datos serializables y se destruyen al cancelar/abandonar. No crear una plataforma de plugins, stores globales de contenido ni abstracciones anticipadas. Commit/push de la base y checkpoint con SHA.

### H2 — parser y modelo acotados

Aceptar contrato pegado JSON/YAML y archivo local. Soportar familias OpenAPI 3.0.x y 3.1.x con diferencias descritas. Swagger 2.0 y OAS 3.2 se rechazan claramente si no se implementan; no tratarlos como una versión soportada. Comprobar objetos raíz, info, paths/operaciones y estructuras usadas; distinguir validación estructural de la promesa imposible de certificar toda especificación o semántica de servidor.

DTO puro TypeScript con metadatos del documento, lista estable de operaciones, effective servers/security, parámetros, contenidos y respuestas; conservar acceso controlado a nodos JSON para schemas. Resolver referencias internas JSON Pointer con escapes ~0/~1, URI-fragment decoding válido y comprobación de propiedades propias. Los ciclos son aristas, no árboles expandidos. Las referencias externas se muestran como no resueltas y jamás se descargan. No convertirlas en un href activo que dispare acceso implícito ni usar resolvers de red.

Procesar en worker con límites explícitos de bytes, profundidad, cantidad de nodos, operaciones, esquemas, referencias, mensajes y tiempo. Presupuesto inicial revisable por evidencia: 2 MiB por contrato, profundidad 64, 2.000 operaciones, 4.000 entradas de esquemas, 100.000 nodos y plazo de 2 segundos para parse/exploración pesada. Comparar dos contratos conserva ambos límites y un plazo acotado separado. Los límites estructurales restringen memoria/trabajo; no afirmar un límite exacto de heap del navegador que no se mide. No expandir aliases YAML sin presupuesto ni aceptar tags ejecutables u objetos exóticos.

Errores contextualizados por ruta y, si el parser lo permite, línea/columna. No copiar a consola ni retornar en excepciones fragmentos secretos del input. El texto original se conserva al fallar. Cambiar input/opciones invalida el documento/resultados anteriores y desactiva acciones sobre salidas obsoletas. Cancelar o vencer timeout termina el worker y permite reintentar. Tests válidos/inválidos/hostiles, ciclos, pointers y límites. Commit/push y CI proporcional al riesgo.

### H3 — explorador de contrato

Interfaz inglesa y coherente con DESIGN.md: título/versiones/descripción, servidores, tags y estadísticas calculadas del DTO real. Búsqueda de operaciones por método, ruta, operationId, resumen y tags; filtros visibles por método/tag/deprecated cuando correspondan. Vacíos claros para lista sin coincidencias y contratos sin operaciones; un contrato schema-only soportado no se presenta como si tuviera endpoints.

Detalle real de operación: método, ruta, operationId, deprecated, parámetros combinados path-item/operación (operación prevalece por pareja name/in), required/default/example, requestBody, media types, status/responses, headers y seguridad efectiva. Seguridad de operación sustituye a raíz; [] elimina exigencia y {} indica alternativa anónima, sin inventar que una API es pública/segura por una sola etiqueta. Mostrar esquemas de seguridad y scopes declarados como información, nunca iniciar OAuth o verificar credenciales.

Explorador components/schemas con árbol progresivo, propiedades, required, enums, items/arrays, nullable, composiciones allOf/oneOf/anyOf y referencias. Breadcrumbs para volver a niveles; abrir un ref no causa expansión recursiva automática. Límites por nivel y acciones explícitas de mostrar más; ciclos muestran destino/explicación. JSON Schema 3.0 no es automáticamente 2020-12: nullable y restricciones de type/$ref se distinguen de unions/boolean schemas/dialecto de 3.1. Mostrar unsupported/indeterminate si el intérprete visual no puede afirmar una semántica.

Descripción/Markdown del contrato se renderiza como texto no confiable, sin HTML interpretado ni URLs de imágenes externas. Navegación de teclado real, foco visible y controles semánticos; respetar los atajos de inputs y paleta global. Desktop con lista/detalle y móvil con panels/tabs que permitan leer parámetros/respuestas sin overflow de página. Estados empty/loading/error/reset funcionales. Commit/push con tests de exploración y capturas selectivas.

### H4 — generación e integración HTTP

Cada operación puede preparar una petición editable, con preview explícita de método/URL/headers/body antes de transferir. Resolver precedencia operation.servers > pathItem.servers > root.servers y variables con defaults/enum. Si un server es relativo o falta una base de documento local, no usar silenciosamente el origen DevBench como API: solicitar/mostrar base sintética o editable y etiquetarla. Protocolos de generación http/https únicamente; no ejecutar la URL ni hacer fetch.

Parámetros path/query/header/cookie deben tener valor editable y required visible. Implementar serialización según estilos/explode realmente soportados; form/query, simple/path/header y combinaciones con arrays/objetos se especifican en docs y tests. Si un estilo/encoding no está soportado, mostrar diagnóstico y bloquear una transferencia incorrecta. No dar por hecho que concatenar todos los arrays con coma cumple OpenAPI. Evitar duplicación incorrecta de path/query y preservar percent-encoding apropiado. Considerar reglas de allowReserved solo cuando se implementen realmente.

Usar ejemplos explícitos del contrato o fixtures locales claramente sintéticos; no afirmar que una muestra generada cumple un schema arbitrario. Valores default/example se distinguen en UI. Referencias cíclicas o externas producen muestras acotadas/advertencias, no contenido inventado como validado. Cuerpos JSON/texto según tipos soportados; multipart/binarios/encoding complejo no soportados se marcan y no se simulan.

Redacción por defecto para Authorization, cookies, API keys declaradas por securitySchemes, userinfo/valores sensibles en URL y campos que detecta el motor existente. No rellenar credenciales automáticamente desde ejemplos/defaults/security. Los nombres de API key pueden ser personalizados: no depender solo de una regex de palabras secret/token. La UI puede mostrar los esquemas y placeholders; la transferencia no debe arrastrar secretos implícitos. No implementar autenticación real.

Handoff explícito local y de un solo consumo al HTTP Request Builder existente. Reutilizar su generación cURL/fetch/Java HttpClient/Spring RestClient y sus reglas de redacción; no crear cuatro generadores paralelos divergentes. Elegir un DTO de borrador validado o cURL local compatible según el contrato real del builder, sin URL/hash/query/history de aplicación ni almacenamiento de payload. El URL de destino mostrado en preview es texto de la petición, no navegación del navegador. Feedback de copia/descarga solo tras acción real; tests de datos transferidos/redactados, consumo único y reload limpio. Commit/push.

### H5 — Contract Diff

Comparar dos documentos locales usando el mismo parser y modelo. Mostrar endpoints añadidos/eliminados, cambios de parámetros/required, requestBody/content types, respuestas/status/headers, auth efectiva y schemas. Cada cambio incluye ruta estable y explicación; filtros por categoría/severidad. Exportar informe JSON/Markdown con metadatos/cambios, no una copia indiscriminada de ambos contratos ni ejemplos/credenciales. Escapar texto de Markdown para que campos del contrato no creen HTML, enlaces o tablas ejecutables inesperadas.

Clasificaciones: ruptura clara, potencial, compatibilidad limitada e indeterminado. No prometer garantías de backward compatibility. Distinguir dirección request/response: estrechar un request elimina entradas aceptadas; ampliar una respuesta puede exigir manejo nuevo al consumidor. Eliminar operación o añadir parámetro requerido son rupturas claras; composiciones complejas/cambio de dialecto/referencias no resueltas pueden ser indeterminados. Cambios descriptivos no se convierten en rupturas; conservarlos como documentación cuando proceda. Orden de claves/operaciones no debe crear diferencias falsas.

Recorrer pares de nodos con conjuntos visitados y presupuesto; referencias cíclicas o renombradas no llevan a expansión infinita ni se comparan solo por nombre de ref. Separar metadatos de restricciones semánticas. Seguridad como OR de alternativas y AND dentro de cada requisito requiere cautela; cambio no entendido se marca potencial/indeterminado, no compatible por defecto. Nunca descargar schemas para completar una comparación. Fixtures sintéticos de evolución Spring Boot: endpoints/DTO/required/status/auth, metadata-only, enums/nullable, request/response, refs/ciclos y cambios documentales. Commit/push y evidencia de casos.

### H6 — RC, documentación y entrega

28 entradas disponibles: 27 previas más BACK-10 Backend OpenAPI Contract Workbench en `/tools/openapi-explorer/`. Home/búsqueda/paleta/favoritos/recientes, mapa lazy y entries estáticas se actualizan desde registro único. Mantener rutas existentes y 404 real para desconocidas. No rediseñar Home/sidebar/Canvas, ni introducir funcionalidades ajenas para justificar V1.5. V1.5 permanece en feature/openapi-explorer-v15, sin merge a main por autorización futura.

Capturas reales 390/768/1440 en claro/oscuro bajo screenshots/actual, incluyendo exploración, schemas, preview HTTP y diff. Revisarlas visualmente; no basta medir scrollWidth. Probar navegación/foco de tabs/listas/diálogos, inputs largos y controles de 44 px en móvil cuando correspondan. Respetar reduced motion del shell. No atribuir certificación WCAG completa a smoke tests básicos.

Vitest prioriza parser/refs/YAML/JSON/OAS 3.0–3.1/límites/seguridad/serialización/generación/diff y regresiones relevantes de HTTP/YAML/schema. Playwright con contratos sintéticos: importar archivo y pegar, explorar/filtrar, navegar refs/ciclos/schema breadcrumbs, editar/generar, preview, handoff al builder y code outputs/copy/download reales, comparar versiones/export seguro, reset/invalidation/errors/cancel y privacidad. No limitarse a que renderice la página. Conservar Canvas tests para IndexedDB y las matrices de 26 herramientas anteriores.

Ejecutar npm ci, check, lint, test, build y suite completa al cerrar; CI exacta del commit final debe verificarse. La instalación limpia usa Node 24.22.1 disponible en Codex sin tocar instalación global. Cambios posteriores a un check requieren repetir solo controles que los cubren, más CI final; no repetir una auditoría de producción antigua sin motivo. README, FEATURES, ROADMAP, VALIDATION y docs/OPENAPI_V15.md describen funcionalidades reales, límites, referencias a especificaciones y decisión GO/NO-GO. No claims de conformance universal.

## Invariantes transversales

Payloads OpenAPI y borradores/diff exclusivamente en memoria por componente/contexto/worker cliente; se limpian al reset, reload o abandonar. Solo Canvas conserva su excepción IndexedDB. No guardar especificaciones en Canvas ni mezclar bases/gestores de proyecto con OpenAPI. LocalStorage solo preferencias saneadas de IDs/fechas/tema. Ningún payload en cookies, sessionStorage, caches, logs, telemetría, requests ni navegación. Los GET de módulos/fuentes/CSS locales son recursos legítimos y se distinguen de transmisiones. Las exportaciones de archivo y portapapeles son acciones explícitas autorizadas; mantener contenidos y URLs de objetos locales acotados/revocados.

Todos los campos del contrato son no confiables. Sin eval/new Function/HTML no escapado/ejecución de comandos. No consultas de servidor para validar URLs ni resolver refs. Worker sin APIs de red invocadas; dependencias deben ser locales y justificadas. Imports diferidos y browser APIs no se evalúan durante SSR/prerender. No módulo singleton con especificaciones en SSR. Tokens visuales y fuentes locales se conservan.

Cada operación async tiene identidad/ticket y cancelación: una respuesta tardía de un input anterior no se muestra como actual. Transferencias apuntan a snapshots revisadas y se consumen una vez; cambiar opciones invalida preview/generaciones anteriores. Los errores preservan inputs y no imprimen contenido confidencial. Compensar trabajo grande con worker/limites; no simplemente aumentar timeout de tests para ocultar un bloqueo de UI.

## Riesgos y clasificación

P0: fuga de contenido, ejecución de input, corrupción de proyectos Canvas, merge que pierde herramientas, sobrescritura insegura. P1: parser/generador/diff requerido inutilizable, ref recursivo que cuelga interfaz, request serializada incorrectamente sin aviso, secretos transportados implícitamente, handoff que persiste datos, rutas/controles principales rotos. Corregir antes de cerrar cada puerta.

P2: estilos OAS/dialectos declarados no soportados, mejoras menores de densidad, paridad de lectores de pantalla/navegadores y análisis semántico no garantizado que no bloquee el contrato declarado. Se documentan, no abren rondas artificiales. Si una función explícita falta, no rebautizarla P2 para terminar. Una URL inaccesible o certificado inválido se describe con error/alcance exacto, sin bypass TLS ni resultados inventados.

## Trazabilidad y condición de cierre

Commit/push por hito, estado real CI y SHA en GOAL_PROGRESS_V15.md. H0 main se modifica solo después de aceptar la integración; H1–H6 van únicamente a la rama OpenAPI. No crear remoto, desplegar manualmente ni solicitar secretos de Cloudflare si la integración actual publica previews. Verificar el check Cloudflare asociado al SHA exacto y ofrecer URL inmutable/branch real si existe, distinguiendo publicación de validación de navegador.

Auditar al final cada requisito H0–H6 frente a archivos/código, resultados de comandos, pruebas, renders, Git y estado remoto. La ausencia de errores no demuestra funciones no probadas. GO exige la herramienta completa y las 28 entradas, integración Canvas preservada, pruebas proporcionales y CI final correcta; P0/P1 resueltos, P2 honestos y ausencia de merge V1.5 a main. Entrega: SHA integración V1.4 en main, SHA final V1.5, rama, tests/CI, preview, capturas e informe con límites. No completar el Goal por cansancio/presupuesto; si continúa trabajo, conservar progreso verificable y próxima acción. Terminar únicamente tras aceptación completa o bloqueo demostrable conforme al Goal activo.
