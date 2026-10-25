# Architecture Canvas V1.4 — implementación y aceptación RC

**GO — Release Candidate implementada y aceptada en la rama aislada `feature/architecture-canvas-v14`.** Main conserva V1.3. Ruta pública de la RC: **`/tools/architecture-canvas/`**; lab se mantiene en **`/lab/architecture-canvas/`**. 27 entradas disponibles. Contrato completo en [V14_ARCHITECTURE_CANVAS_GOAL.md](../V14_ARCHITECTURE_CANVAS_GOAL.md), evidencia por hito en [GOAL_PROGRESS_V14.md](../GOAL_PROGRESS_V14.md). El cierre comprueba CI/Cloudflare por el SHA final después del push; esos checks de GitHub son la autoridad para el estado remoto. No se atribuye a esta RC una auditoría de producción V1.2.

## Renderer y estética

Se conserva Konva 10.9.0 + svelte-konva 1.0.1. [Rough.js](https://roughjs.com/) ofrece primitivas sketch para Canvas/SVG y texturas de relleno. Para la RC se escogen contornos propios deterministas: segunda línea muy suave en rectángulos/rombos/elipses y polilíneas suavizadas para tinta. No hay dependencia adicional, ruido por frame, recursos ni marca de terceros. No se promete el conjunto de pinceles de Excalidraw. Rectángulos redondeados conservan geometría limpia; los bordes y rellenos explícitos no cambian con el tema. Los rótulos de figuras eligen tinta legible sobre el relleno o tema; el color del texto libre lo elige el usuario.

El lienzo es protagonista. Toolbar flotante compacta, inspector opcional, edición directa de texto, viewport inicial al 100% y pan en móvil. Fit es explícito; puede mostrar el conjunto a escala pequeña, acompañado por acceso a 100%. Nunca sustituye el viewport guardado al cambiar de tamaño. Los controles DOM permiten operar sin acertar un píxel de Canvas.

## Implementación de pizarra (H2)

Rectángulos, redondeados, elipses, rombos, texto, flechas/líneas libres o ancladas y lápiz. Creación con preview por arrastre y cancelación Escape. Doble clic abre edición directa o el hijo existente. Selección Shift, movimiento conjunto, resize desde esquina y dimensiones, duplicado, borrado, orden delante/detrás e historial acotado. Un gesto se confirma como una transacción. Undo/redo limpia selección; volver a seleccionar antes de duplicar es intencional.

Extremos de conexiones ajustables con círculos visibles. Los anclajes se expresan como coordenadas normalizadas en el contorno de la caja de la figura y siguen movimiento/resize. No hay routing CAD, puertos ni intersección exacta de contornos curvos. La tinta tiene límite de 2.000 puntos por trazo, con aviso real. El proyecto admite 100 diagramas, 500 figuras y 500 conexiones por diagrama, 100.000 puntos totales y JSON de 8 MiB. Se valida al confirmar la operación, no en cada muestra de puntero.

HEX usa seis dígitos, relleno acepta transparente; presets, grosor, trazo discontinuo, familia/tamaño y sketch se aplican al elemento o selección. Los atajos se limitan al editor y respetan inputs/texto directo. Outline y controles con labels complementan Canvas; no se afirma certificación WCAG.

## Datos e historial (H1)

DTO schema v2 puro en `src/lib/canvas/model.ts`; `serialization.ts` reconstruye campos permitidos desde unknown y migra el spike v1 antes de aceptar datos. IDs y diagramas sin enlace se conservan. Se rechazan JSON hostil, versiones futuras, ciclos, IDs repetidos, anclajes rotos y datos fuera de límites. El historial mantiene como máximo 30 estados y aproximadamente 20 MiB de snapshots; se descarta redo al editar después de undo.

`persistence.ts` contiene almacenamiento Canvas separado y autosave ordenado con debounce. `CanvasProjects.svelte` integra IndexedDB real: abrir/listar/crear/renombrar/borrar con confirmación, reintentar tras fallo y esperar un guardado pendiente antes de cambiar de proyecto. La navegación intenta vaciar el debounce; ante fallo ofrece cancelar o salir expresamente. El cierre abrupto antes de Saved puede perder la última edición. El límite de interfaz es de 20 proyectos locales.

Importación v1/v2 desde archivo, con parser antes de cambiar el documento. Siempre crea otro ID de proyecto y mantiene los IDs internos. Una importación inválida conserva el proyecto abierto y no transforma un error de archivo en un supuesto fallo de disco. Cuota/almacenamiento no disponible conservan el contenido en memoria y permiten export JSON de rescate. PNG usa una copia temporal del Stage, sin controles ni cambiar la cámara, fondo transparente y límites 4.096 px/eje, 12 MP.

Canvas es la excepción explícita de privacidad, documentada en AGENTS/ARCHITECTURE/DESIGN/FEATURES/README: solo su base `devbench.canvas.v2` guarda documentos. Los otros 26 workspaces mantienen sus contratos de memoria. Nada de contenido en localStorage, sessionStorage, cookies, URLs, consola o requests. Browser clearing/private browsing pueden eliminar IndexedDB; no hay sincronización remota.

## Evidencia por hito

H1: 24 pruebas unitarias, check sin diagnósticos, lint/build y CI completos. H2: tres flujos Playwright selectivos sobre build estático pasan: estilos/texto/creación/resize/undo/duplicado/selección múltiple/tinta/conectores y descargas reales JSON/PNG; tres niveles creados manualmente, cámara conservada, zoom directo/animado y ciclos; seis vistas 1440/768/390 en oscuro/claro con 100%, sin overflow, pan por teclado/puntero y desmontaje sin canvas restante. Los flujos inspeccionan consola, solicitudes y canales de privacidad; no son una auditoría remota.

H3 amplía a cinco flujos reales: jerarquía construida desde proyecto nuevo/vacío, recarga de cámaras y etiquetas, huérfano recuperado mediante otra figura, IndexedDB inspeccionado y único, gestión/renombrado/borrado confirmado, importación inválida sin cambios, roundtrip como proyecto nuevo y fallo de cuota inyectado con rescate/reintento exitoso. 25 tests de dominio nuevos y 11 del spike relevantes. El dominio también preserva IDs Unicode y enlaces válidos en anotaciones v1.

## Puerta RC — aceptación A–E

Node 24.22.1. `check`: 0 errores/avisos; `lint`, `build` y **256 tests unitarios / 16 archivos** correctos. Suite local completa: **36 flujos Chromium correctos**, dos tests históricos de auditoría remota omitidos expresamente. Después de extender la migración para anclar texto v1, se repitieron todos los unitarios y los siete flujos Canvas; estilos/tamaño/grosor/capas/línea se volvieron a comprobar al ampliar ese flujo. CI repite la suite completa sobre el SHA enviado.

| Contrato        | Evidencia inspeccionada                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A · pizarra     | Arrastre/preview/Escape para las figuras, elipse/rombo/redondeado/texto y flecha/línea; edición de texto sobre lienzo; presets/HEX, relleno, grosor, discontinuo, fuente/tamaño y sketch. JSON descargado confirma valores reales; captura coloreada y PNG reales.                                                                                                                                       |
| B · edición     | Puntero resize y movimiento, selección Shift, duplicación/borrado, orden delante/detrás, undo/redo, teclado/pan/rueda y Fit explícito. Conectores libres o anclados, extremos editables; dominio verifica remapeo y seguimiento al mover/resize. Cada gesto registra una acción.                                                                                                                         |
| C · jerarquía   | Proyecto vacío creado desde UI y tres niveles nuevos; nombre/ID/destino compartidos entre Open y Zoom; Escape y reduced motion; vuelta/recarga conservando cámara y contenido. Ciclo rechazado; hijo huérfano reasociado y borrado explícito conservando descendientes. Borrar el diagrama abierto vuelve a un breadcrumb válido.                                                                        |
| D · datos       | Parser unknown con límites, futuros/hostiles rechazados antes de sustituir estado; migración completa v1, IDs Unicode, texto con hijo y anclajes a texto; roundtrip v2. IndexedDB real, gestión de proyectos, reload, import nuevo ID, confirmación de borrado, cuota inyectada, rescate descargado y retry. Escrituras entre pestañas usan revisión en transacción y rechazan sobrescrituras obsoletas. |
| E · integración | Registro único DRAW-01 / Utilities, 27 workspaces lazy, 27 archivos HTML de herramientas y lab, 26 slugs previos intactos. Paleta/pin, deep link/reload 200 y ruta desconocida 404. Seis vistas con 100% legible, sin overflow; teclado/outline/diálogo Escape/foco y gesto táctil CDP real. Matrices anteriores pasan.                                                                                  |

El manifiesto identifica CanvasEditor como entrada dinámica: aproximadamente **209 kB JS / 64 kB gzip**, además de CSS/imports compartidos; no representa una visita fría completa. Sin Rough.js, React ni dependencia nueva respecto al spike. Licencias MIT de [Konva](../static/licenses/konva-MIT.txt) y [svelte-konva](../static/licenses/svelte-konva-MIT.txt) se incluyen como recursos locales.

Carga representativa: **300 figuras, 20 trazos/400 puntos y 200 flechas**. La última medición local registró ~1,08 s importación hasta Saved, ~652 ms de movimiento con 12 muestras y ~101 ms de rueda hasta la aserción. Son tiempos de interacción automatizada, incluidos driver/DOM/debounce; no FPS ni garantía para documentos de miles de figuras. Los valores exactos están en [performance.json](../screenshots/actual/canvas-v14-performance.json).

Privacidad observada: el marcador está en IndexedDB Canvas como se autoriza, y ausente de URL/history/localStorage/sessionStorage/cookies/consola/requests. Solo GET estáticos del origen en los flujos observados. Los tests anteriores conservan sus comprobaciones de memoria y no reciben la excepción Canvas. Salir destruye Canvas/observadores/animación; el proyecto vuelve desde IndexedDB, no desde un singleton de payloads. No se afirma una prueba de heap de larga duración.

### Capturas reales revisadas

| Vista        | Oscuro                                                | Claro                                                  |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| Desktop 1440 | [PNG](../screenshots/actual/canvas-v14-1440-dark.png) | [PNG](../screenshots/actual/canvas-v14-1440-light.png) |
| Tablet 768   | [PNG](../screenshots/actual/canvas-v14-768-dark.png)  | [PNG](../screenshots/actual/canvas-v14-768-light.png)  |
| Móvil 390    | [PNG](../screenshots/actual/canvas-v14-390-dark.png)  | [PNG](../screenshots/actual/canvas-v14-390-light.png)  |

[Edición con colores, trazos y conexiones](../screenshots/actual/canvas-v14-editing-dark.png), [segundo nivel creado a mano](../screenshots/actual/canvas-v14-manual-level-two.png), [tercer nivel creado a mano](../screenshots/actual/canvas-v14-manual-level-three.png). Son screenshots Chromium de la RC estática, no mockups. [Evidencia resumida y pruebas](../screenshots/actual/canvas-v14-validation.json).

### Incidencias, límites y decisión

**P0/P1 abiertos: ninguno en el alcance comprobado.** Se resolvieron eventos de doble clic, foco de Escape, nombres accesibles con hijos, navegación tras borrar el huérfano abierto, Escape de diálogo, preservación de enlaces v1 a texto y protección frente a otra pestaña que guardó una versión posterior. No se ocultan fallos de almacenamiento como Saved.

**P2:** no hay certificación con lector de pantalla ni aceptación Firefox/WebKit; la prueba táctil es emulación CDP, no un dispositivo físico. No se midieron FPS sostenidos ni heap de largas sesiones/documentos enormes. El spike anterior tuvo un bloqueo HTTPS por certificado al intentar comprobar la preview desde este entorno; cualquier limitación remota del cierre se declara por separado, sin convertir una publicación de Cloudflare en una prueba de navegador superada.

Límites funcionales explícitos: selección simple/Shift sin lasso, resize de esquina/dimensiones sin rotación/agrupación, conectores rectos anclados a cajas, sketch suave determinista sin texturas complejas, sin presión/pinch avanzado, imágenes, colaboración o zoom semántico infinito. Portal de cámara de 440 ms y entrada al mismo hijo. 20 proyectos locales, 8 MiB JSON, 100 diagramas, 500 figuras/500 conexiones por diagrama, 2.000 puntos/trazo, 100.000 puntos totales, historial 30 estados/~20 MiB; export PNG transparente 4.096 px/eje y 12 MP. No se exige ampliar estos límites para aceptar la RC.

**GO para revisión y uso de la RC en esta rama**, con autoguardado local y exportación verificables. Mantener copias JSON cuando el documento importe: borrar datos del navegador, una sesión privada o un cierre abrupto antes de Saved pueden perder cambios. Conflicto entre pestañas: exportar rescate y recargar la versión guardada; no hay fusión colaborativa. Main permanece intacta y la decisión de fusionar/publicar esa rama queda fuera de este cierre.
