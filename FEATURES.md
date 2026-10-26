# DevBench — Alcance funcional cerrado

## V2.0 RC — Architecture Canvas 2.0 (28 entradas, sin nueva ruta)

OpenAPI V1.5 está integrado en main `c3cd929a5aea231991973abd5744def9d13cf740`; Canvas2 vive únicamente en `feature/architecture-canvas-v20`, sin merge. DRAW-01 conserva `/tools/architecture-canvas/` y el alias lab, lazy/prerender y las 28 entradas existentes.

Selección rectangular por contención completa en coordenadas del documento, Shift XOR, Escape/Ctrl+A y outline; grupos planos, duplicación/capas/resize uniforme/rotación y seis alineaciones/distribución H/V. Rough.js4.6.6 sobre Konva, semilla estable, clean/soft/expressive, sólido/transparente/hachure; tinta acotada/suavizada y un historial por gesto. Conectores rectos, curva cuadrática, elbow ortogonal, control editable, puntas ninguna/final/ambas, estilos y anchors locales rotados. Duplicación de grupos remapea conexiones internas; externas quedan válidas y la geometría de elbows sigue ejes del lienzo.

Jerarquía mantiene apertura directa/zoom/breadcrumb/cámaras/huérfanos/ciclos/reduced-motion. **Duplicate copia independientemente el subárbol DAG por defecto**, conservando compartición dentro de la copia sin duplicar dos veces un origen; la acción linked comparte explícitamente el hijo, muestra ⇉ y aviso. IDs nuevos, límite/validación antes de aceptar y undo/redo atómicos.

Schema3 lee v1/v2 con fixtures congelados, IndexedDB físico sin migración destructiva, ningún rewrite al abrir y original legacy inmutable en primer save real. CAS evita conflictos y también protege schemas futuros con revisiones externas equivocadas. Import como proyecto nuevo; backup raw/original recuperable. Solo Canvas persiste documentos; OpenAPI y las otras herramientas no heredan esa excepción.

Raster PNG/JPEG/WebP local y estático, validación firma/MIME/chunks/base64/dimensiones+decode antes de reemplazar estado, 1MiB/4MP por archivo y 4MiB/8MP por proyecto, JSON autocontenido16MiB (legacy8MiB), PNG4096px/12MP. Sin SVG/URLs/animación/fetch. Movimiento/resize/rotación/grupos/capas/undo, recursos inmutables compartidos, cierre de bitmaps y rescate/retry de cuota. Controles móviles siete+More, pan/zoom centrado con mouse/trackpad/touch y pointer capture. Pruebas/capturas/límites reales: [informe V2](docs/ARCHITECTURE_CANVAS_V20.md). No grupos anidados, lasso, presión ni CAD routing. Las secciones siguientes son históricas y no sustituyen este contrato.

## V1.5 — OpenAPI Contract Workbench (histórico integrado)

BACK-10 / Backend / `/tools/openapi-explorer/` is available as entry **28**, lazy and prerendered from the same registry used by Home/search/palette/favorites/recents. All 27 preceding tools remain. JSON/YAML paste/local-file import, OAS 3.0.x/3.1.x structural parser, contextual errors, bounded cancellable workers and internal-reference graph. Unsupported 3.2/Swagger 2, remote refs/URI scopes and complex encodings are explicit; no fetch or conformance guarantee.

Explorer includes real metadata/servers/tags/security, searchable/filterable operation details and progressive schema navigation. HTTP preparation includes server precedence/variables, supported parameter serialization, editable samples/body/overrides, explicit preview, four reused generators and always-redacted one-shot Builder handoff. Diff compares two local contracts, explains directional changes with four cautious severity classes and exports safe metadata-only JSON/Markdown reports. Inputs/results stay in memory; reset/reload/teardown clear them. Canvas alone keeps its documented IndexedDB exception. Full support and limits: [OpenAPI report](docs/OPENAPI_V15.md). The following release sections are historical; V1.4 is now integrated in main and V1.5 was subsequently integrated into main under the V2 authorization.


## V1.4 Release Candidate — Architecture Canvas

Rama aislada `feature/architecture-canvas-v14`. **27 entradas disponibles**: las 26 anteriores más DRAW-01, Utilities, `/tools/architecture-canvas/`, lazy/prerender y catálogo/paleta/favoritos/recientes comunes. Lab `/lab/architecture-canvas/` permanece. Pizarra con rectángulo/redondeado, elipse, rombo, texto directo, flecha/línea y lápiz; preview/Escape, colores HEX/presets, relleno/transparencia, trazo, fuente/tamaño y sketch estable. Selección Shift, movimiento, resize, duplicado, capas, undo/redo y extremos libres/anclados ajustables. Jerarquía creada/asociada por usuario, breadcrumb y portal al mismo hijo, cámaras persistentes, reduced motion, ciclos rechazados y huérfanos recuperables/borrados con confirmación.

Excepción de privacidad explícita: **solo Canvas** guarda proyectos en IndexedDB `devbench.canvas.v2`. El resto sigue en memoria. Hasta 20 proyectos locales, autosave 600 ms, cuota/bloqueo/reintento y rescate JSON; concurrencia entre pestañas rechaza sobrescrituras obsoletas. Import v1/v2 siempre como proyecto nuevo, conservando IDs internos y datos v1; futuras versiones/JSON hostil no sustituyen el abierto. PNG transparente sin controles, 4.096 px/eje y 12 MP. JSON 8 MiB, 100 diagramas, 500 figuras/conexiones por diagrama, 2.000 puntos/trazo y 100.000 totales. Historial 30 estados/~20 MiB. No backend, URLs con datos, telemetría ni APIs externas. Evidencia y límites en `GOAL_PROGRESS_V14.md` y `docs/ARCHITECTURE_CANVAS_V14.md`.

## V1.3 — Text & Test Data Utilities

26 entradas disponibles: las 25 anteriores y UTIL-03 **Test Data Generator**, categoría Utilities, ruta estática `/tools/test-data-generator/`, carga diferida y registro común para Home/búsqueda/favoritos/recientes/paleta. Sin rediseños ni funciones V1.4.

TEXT-02 conserva las siete conversiones y añade estadísticas en vivo: grafemas (`Intl.Segmenter`; fallback etiquetado como puntos de código), sin whitespace, palabras, líneas, UTF-8 y UTF-16. Límite informativo 0–1.000.000 con utilizados/restantes/excedidos sin truncar. Worker cancelable tras 120 ms, plazo 1,5 s y límite original 64 KiB. Reglas precisas de Unicode, espacios, apóstrofes, CJK y líneas vacías en UI/README; no se promete segmentación lingüística.

UTIL-03 ofrece corpus locales Lorem Ipsum/texto sintético legible, longitud visual exacta/máxima, palabras o párrafos de tres frases. Límites: 32.768 caracteres/bytes, 2.000 palabras o 50 párrafos. Exacto puede cortar palabras y sustituye whitespace final por puntos; máximo conserva palabras completas y puede quedar vacío. Separación por línea en blanco, salto o espacio. Copia/descarga, regeneración y reset reales; sin IA ni APIs.

También genera/valida EAN-13 y GTIN-14 numéricos y completa GS1 módulo 10 desde 12/13 dígitos. Web Crypto, lotes únicos de 1–1.000, ceros iniciales conservados y prefijo opcional con error por espacio insuficiente. Copia individual (20 primeros), lote completo y TXT/CSV. Únicamente estructura/checksum: no asignación GS1, disponibilidad comercial, servicios externos o imágenes de barras. Advertencia visible: “Structurally valid GTINs for testing only. Valid checksum does not imply GS1 assignment or identification of a real product.”

Inputs/resultados por instancia en memoria; las opciones editadas invalidan resultados. Cambiar utilidad o abandonar elimina datos. Solo se guardan IDs/fechas/tema saneados. README y VALIDATION registran límites y aceptación; las secciones siguientes conservan el histórico.

## V1.2 delivery

FLOW-01 Pipeline Builder and compatible explicit Send to Tool handoffs are implemented. Nine fixed operations reuse existing engines in a bounded, interruptible linear worker. No custom scripts, network, persisted recipes or automatic secret transfers.

BACK-08 Log & Stack Trace Inspector and BACK-09 Environment Comparator are implemented. Common Java log formats are bounded and unknown text is retained. Environment values remain concealed until explicit reveal; exports are always key/status metadata only.

BACK-06 HTTP Request Builder and BACK-07 HTTP Headers Inspector are implemented with local-only generation/parsing, redaction by default and documented client restrictions. No requests are executed.

DATA-05 JSON Query Explorer and DATA-06 JSON Schema Lab are implemented. Exact bounded syntax, interpreted validation, internal-only references and conservative inference limits are documented in README and the workspaces. V1.2 milestone commits and acceptance are tracked separately in GOAL_PROGRESS_V12.md; the V1/V1.1 scope below is historical and preserved.

> Estado: alcance funcional aprobado para V1 + V1.1. Nombre de trabajo: **DevBench**. Producto: herramienta web personal y proyecto de portfolio. Fecha: 2026-10-25.

## 1. Objetivo del producto

Workbench web para desarrolladores, especialmente útil en tareas cotidianas de backend y depuración. Debe abrir rápido, funcionar sin iniciar sesión y permitir pegar → transformar/inspeccionar → copiar en muy pocos pasos.

**Principios innegociables**
- **Local-first y privacidad:** procesar todo el contenido en el navegador. No subir JSON, JWT, SQL, textos ni secretos a ningún servidor.
- **Sin backend en V1/V1.1:** Svelte 5 + SvelteKit + TypeScript, compilación estática mediante Vite. Ver `ARCHITECTURE.md` (ADR-001) para el stack cerrado. PWA/offline queda en backlog hasta después de V1 estable.
- **Herramientas de verdad:** cada entrada genera un resultado real, sin botones decorativos ni resultados simulados en producción.
- **Rapidez:** sin pantallas intermedias, anuncios, login ni modales innecesarios.
- **Trazabilidad del alcance:** 12 herramientas V1 + 6 herramientas V1.1. Lo demás es backlog, no compromiso.
- **Portfolio:** repo público con arquitectura clara, accesibilidad, tests selectivos y una interfaz singular y pulida.

## 2. Las 12 herramientas V1

| ID | Herramienta | Contrato funcional mínimo |
|---|---|---|
| DATA-01 | JSON Studio | Validar, pretty-print con indentación ajustable, minificar, árbol expandible, búsqueda textual, copiar propiedad y ruta JSONPath sencilla. Error de parseo contextual sin perder input. |
| DATA-02 | JSON Diff | Dos entradas JSON, comparación estructural, cambios añadidos/eliminados/modificados, ruta de cada cambio; orden de claves sin falsos positivos. Arrays respetan orden. |
| DATA-03 | JSON ↔ YAML | Conversión bidireccional con mensajes de error claros; manejo seguro de tipos comunes. |
| ENC-01 | Base64 Toolkit | UTF-8 ↔ Base64; modo URL-safe opcional; errores de decodificación. |
| ENC-02 | URL Toolkit | Percent encode/decode, descomponer esquema/host/ruta/query/fragmento; editar query params y reconstruir. |
| SEC-01 | JWT Inspector | Decodificar JWT compacto sin verificar por defecto; header/payload, claims exp/nbf/iat, hora local/UTC, aviso explícito «decode ≠ verification»; sin persistir tokens. |
| SEC-02 | Hash Generator | SHA-256/384/512 con Web Crypto sobre texto introducido; formato hexadecimal; sin afirmar que el hash cifra el contenido. |
| BACK-01 | SQL Formatter | Formatear SQL seleccionando PostgreSQL/MySQL/SQLite; opciones de estilo (mayúsculas keywords, indentación), sin ejecutar consultas. |
| BACK-02 | Regex Tester | Expresión + flags + texto de prueba; coincidencias, rangos y grupos capturados; sustitución opcional; prevenir bloqueo con límites razonables. |
| TEXT-01 | Text Diff | Vista lado a lado o unificada de diferencias por línea, con controles para ignorar espacios finales. |
| UTIL-01 | ID Generator | Generación criptográficamente segura de UUID v4, UUID v7 y ULID; múltiples IDs y copia. |
| UTIL-02 | Timestamp Converter | Epoch segundos/milisegundos, ISO 8601, interpretación local/UTC, zonas horarias IANA y copia de formatos. |

## 3. Las 6 herramientas V1.1

| ID | Herramienta | Contrato funcional mínimo |
|---|---|---|
| DATA-04 | JSON ↔ CSV | JSON array de objetos ↔ CSV, elección de delimitador y encabezados; comunicar limitaciones de estructuras anidadas. |
| CODE-01 | JSON → Code | Inferir Java records y TypeScript interfaces, nombres configurables, campos opcionales y arrays; mostrar advertencia si hay datos insuficientes para inferir tipos. |
| BACK-03 | cURL Inspector | Parsear argumentos habituales de cURL en método, URL, headers, cuerpo. No enviar peticiones; no ejecutar shell ni JavaScript del input. |
| BACK-04 | Cron Explorer | Expresiones de 5 campos Unix y 6 campos Spring, explicación textual y próximas ejecuciones con zona horaria explícita. |
| TEXT-02 | String Toolkit | camelCase, PascalCase, snake_case, kebab-case, MAYÚSCULAS/minúsculas y slug; opciones para separadores. |
| BACK-05 | SQL IN Builder | Lista multilínea/CSV → lista para IN con modo strings/numbers, escapes literales por dialecto y salida parametrizada preferente. Advertir sobre SQL injection al construir SQL manualmente. |

## 4. Funcionalidades transversales

### Imprescindibles V1
- En el **Bloque 1**, Quick Paste es un detector heurístico **básico** (JSON/JWT/URL/SQL), sin prometer interpretación avanzada de Smart Input. Solo JSON Studio consume el dato transferido hasta que las otras herramientas estén implementadas.
- Home utilitario con buscador de herramientas, acceso a categorías y utilidades recientes.
- `Ctrl/Cmd + K`: command palette global; navegación por teclado; `Esc` para cerrar.
- Favoritos y preferencias en `localStorage`, exclusivamente metadatos inocuos (IDs de herramientas, tema, opciones no sensibles).
- Tema oscuro y claro; sistema de tokens consistente.
- Editor de código con numeración de líneas, resaltado adecuado y accesibilidad. Preferir un componente maduro antes que un editor casero.
- En todas las herramientas aplicables: ejemplos sintéticos explícitamente etiquetados, limpiar entrada, copiar, descargar, intercambiar entrada/salida cuando tenga sentido.
- Mensajes de error situados junto al input, estados vacíos explicativos, información de lo que hace la herramienta.
- URLs compartibles para abrir **la herramienta**, sin codificar el payload de usuario en enlaces.
- Layout desktop de trabajo y layout móvil útil sin scroll horizontal.

### V1.1 si no interfiere con la entrega
- Smart Input avanzado en Home: heurísticas locales para detectar JSON/JWT/SQL/URL/timestamp, mostrar varias sugerencias cuando exista ambigüedad y pedir confirmación antes de transferir datos a otra herramienta.
- PWA y disponibilidad offline (tras haber cacheado recursos), solo si no complica demasiado el stack.

### Backlog no comprometido
- Pipelines de transformaciones (primero secuencia lineal, luego nodos si se justifica).
- OpenAPI explorer y herramientas de logs.
- Presets importables/exportables sin datos secretos.
- Inspector de planes `EXPLAIN`, herramientas de redes.

## 5. Privacidad y seguridad

- No enviar inputs a APIs, analítica, almacenamiento remoto ni telemetría.
- No guardar entradas/salidas en `localStorage`, IndexedDB, cachés PWA ni URLs; tampoco tokens JWT.
- La previsualización debe tratar todo contenido como texto no fiable: no evaluar input, no ejecutar expresiones dinámicas arbitrarias, no renderizar HTML sin sanitizar.
- Las herramientas de inspección no deben presentarse como validadores de seguridad: en JWT distinguir claramente decodificación de verificación de firma.
- Utilizar generadores criptográficamente seguros (`crypto.getRandomValues`) cuando corresponda.
- Los errores no deben emitir a logs payloads sensibles.

## 6. Reglas de implementación

- Stack: Svelte 5 + SvelteKit 3 + TypeScript estricto + Vite + adapter-static, componentes compartidos, bibliotecas pequeñas especializadas solo cuando sean necesarias.
- Un registro tipado para herramientas (id, slug, ruta, categoría, nombre, keywords, icono y disponibilidad). SvelteKit se encarga de cargar cada página de forma diferida; no duplicar ese enrutado con un plugin de imports.
- Separar `core` puro (funciones de transformación comprobables) de UI Svelte.
- No incorporar Spring Boot por costumbre; reevaluarlo solo si hay funciones que necesiten servidor.
- Tests de lógica en parsers/conversores/casos límite; tests visuales/manuales y accesibilidad en la UI. Priorizar profundidad en JWT/regex/SQL parser frente a snapshots masivos.
- Commits por bloque coherente, `push` al remoto si está configurado; Codex debe proporcionar hash del commit final, resultados de pruebas y asuntos pendientes.

## 7. Definición de terminado V1

- Las 12 herramientas son funcionales y tienen casos de error, vacío, copiar y al menos un ejemplo válido.
- Home, navegación, favoritos y command palette operativos; diseño coherente oscuro/claro y móvil.
- Todas las transformaciones se ejecutan sin llamadas de red de datos de usuario.
- Sin P0/P1 abiertos, build limpio y tests relevantes pasando.
- README del repositorio explica objetivo, privacidad, arquitectura, instalación y capturas reales.

## Estado de implementación — cierre V1/V1.1 (2026-10-25)

Las 18 herramientas del alcance original están implementadas y marcadas `available` en `src/lib/tools/tool-registry.ts`; las rutas prerender y el directorio usan ese mismo registro. Los contratos de las secciones 2–3 se conservan. El alcance de entrega se amplió mediante `DEV_BENCH_AUTONOMOUS_GOAL.md`, sin añadir PWA, backend, autenticación, telemetría ni despliegue.

| IDs | Estado y evidencia |
|---|---|
| DATA-01/02/03/04 | JSON Studio, JSON Diff, JSON ↔ YAML y JSON ↔ CSV disponibles |
| ENC-01/02 | Base64 Toolkit y URL Toolkit disponibles |
| SEC-01/02 | JWT Inspector (sin verificar firma) y Hash Generator disponibles |
| BACK-01/02/03/04/05 | SQL Formatter, Regex Tester aislado, cURL Inspector, Cron Explorer y SQL IN Builder disponibles |
| TEXT-01/02 | Text Diff y String Toolkit disponibles |
| UTIL-01/02 | ID Generator y Timestamp Converter disponibles |
| CODE-01 | TypeScript y Java records disponibles |

Quick Paste ofrece destinos implementados por clic explícito, consume el dato una vez y distingue segundos/milisegundos cuando el número es ambiguo. Las limitaciones precisas de formato, precisión, cron avanzado, CSV e inferencia están en README y en cada workspace. `screenshots/actual/release-matrix.json` registra operaciones, copia real, reset, recarga y estados vacíos/erróneos de las 18 rutas; `VALIDATION.md` conserva el historial B1 y la evidencia por hito.
