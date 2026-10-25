# Progreso DevBench V1.4

**Estado actual: RC A–E completada.** Implementación `db08081f151ca66f8e493e0204a1534649d030ea`, push confirmado y [CI 40216614515](https://github.com/Rhaizel02/devbench/actions/runs/40216614515) verificada en verde: instalación limpia/check/lint/256 unitarios/build/36 flujos Chromium; dos auditorías históricas remotas omitidas. Main permanece intacta. El commit documental posterior registra estas verificaciones sin cambiar código de producto.

## Reanudación

Leer V14_ARCHITECTURE_CANVAS_GOAL.md y este archivo, consultar Goal activo, HEAD/status y evidencia antes de continuar. Objetivo completo: RC A–E; no basta el spike. No fusionar main.

## Base comprobada

- 2026-10-25: HEAD inicial limpio `476ca84edec75d9904ef531e9f514646722291ae`, rama spike.
- Creada `feature/architecture-canvas-v14` desde ese SHA. Main permanece `fa0490f5872262614ba9fe0370377295f3112fae`.
- Stack y normas inspeccionados; Canvas tiene autorización explícita para persistir sus propios proyectos en IndexedDB. Resto de herramientas sin excepción.

## Hitos

| Hito                        | Estado       | Evidencia / siguiente acción                                                                                              |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| H0 contrato                 | Aceptado     | `007fccfe6125765c7dea60fcf592bd9c9cd1626f`; contrato de 14.862 bytes, push y CI 40211787379 correctos.                    |
| H1 dominio + almacenamiento | Implementado | `fadb2f998200d1ae03886f6b127306932dae0671`; 24 tests, check/lint/build y CI 40212165405 correctos.                        |
| H2 pizarra                  | Implementado | `a586324ffc4ff45c9263e9d68af1d163cfbd689e`; 3 Playwright, 35 unitarios, check/lint/build y CI 40213237929 correctos.      |
| H3 proyectos + jerarquía    | Aceptado     | `83f8121522d9e70c64213f2dc29c006a648cd136`; proyectos reales, 5 Playwright, 36 unitarios; CI 40214204914 correcto.        |
| H4 RC                       | Aceptado     | `db08081f151ca66f8e493e0204a1534649d030ea`; 27 entradas, 256 unitarios, 36 flujos; CI 40216614515 y Cloudflare correctos. |

## Incidencias y aceptación

H1 incorpora DTO v2, parser que reconstruye campos permitidos con límites 8 MiB/100 diagramas/500 figuras/500 conexiones/2.000 puntos por trazo/100.000 totales, migración v1 y roundtrip, anclajes, transformaciones y jerarquía independientes del renderer. Historial de 30 estados y presupuesto de 20 MiB. Almacenamiento exclusivo `devbench.canvas.v2`, transacciones confirmadas, autosave serial y debounce, reintento tras error. En H1 la UI aún no usaba este motor: A–E no aceptados por esta evidencia aislada.

Vitest: 24/24 en `src/lib/canvas/canvas.test.ts` (migración, importación hostil, geometría, ciclos, historial, autosave lento/debounce/cuota/bloqueo). `check` 0 errores/avisos; `lint` y `build` completos pasan. Rutas públicas siguen en 26 y lab conserva el spike mientras se construye la pizarra.

Sin auditoría de RC ejecutada todavía. El error de certificado al abrir la preview del spike se conserva como antecedente, no como fallo atribuido al producto ni validación de esta RC.

Próxima acción: comprobar CI H1 e implementar H2, con creación por arrastre, edición directa y selección múltiple sobre el DTO nuevo. H3 integrará el motor de persistencia con proyectos; H4 registra entrada 27 solamente al aceptar A–D.

## H2 — pizarra implementada

BoardSurface y CanvasEditor nuevos usan DTO v2 en lab, con import cliente diferido. Se mantienen 26 entradas. Figuras de arrastre y preview/Escape, texto directo, HEX/presets/estilos, tinta, extremos ajustables/anclajes, selección Shift, movimiento, resize, duplicado, capas e historial. Los tres flujos actualizados reemplazan las pruebas UI del spike porque cambió el contrato; conservan privacidad, navegación, temas, cámaras, teclado y desmontaje, y añaden edición real y exports.

Evidencia: 35 unitarios relevantes pasan; check 0 errores/avisos, lint/build correctos; Playwright 3/3 pasa en 13,4 s. Siete capturas reales revisadas (6 tamaños/temas y edición coloreada); viewport móvil legible al 100%, sin overflow. IDs, cámara y estilo se inspeccionan además en JSON descargado. Se corrigieron doble clic de puntero y nombre accesible con indicador de hijo; el test de duplicado ahora vuelve a seleccionar tras undo/redo, cuyo contrato limpia selección.

En H2 la UI aún usaba sesión en memoria; no afirmar autoguardado integrado hasta H3. Los hijos ya se crean/asocian/renombran y rechazan ciclos desde UI; H3 debe verificar recarga, huérfanos, gestión/importaciones y fallos de almacenamiento. Decisión sketch propia y límites en docs/ARCHITECTURE_CANVAS_V14.md.

Próxima acción: CI H2 y componente CanvasProjects para abrir/listar/crear/renombrar/borrar, autosave/estado/reintento, JSON importado como proyecto nuevo y pruebas de recarga/errores.

## H3 — persistencia y proyectos integrados

CanvasProjects integra `devbench.canvas.v2`, 600 ms de debounce y transacciones ordenadas con estados Loading/Unsaved/Saving/Saved/Error. Los cambios pendientes se guardan antes de navegar/cambiar de proyecto; un fallo conserva memoria y permite reintento/export de rescate. Import v1/v2 crea nuevo proyecto y no sobrescribe el abierto; errores de archivo se distinguen de los de almacenamiento. Se crean/listan/abren/renombran/borran proyectos con confirmación; máximo 20. JSON y PNG reales del diagrama, sin seleccionar controles en PNG. Excepción Canvas documentada en normas/README.

Playwright 5/5 en 30,9 s sobre build estático: además de H2, tres niveles desde proyecto nuevo/vacío, recarga de cámara/ediciones, recuperación de huérfanos asociando una figura nueva, ciclos; IndexedDB real con marcador autorizado únicamente allí, import inválido preservando JSON exacto, roundtrip nuevo ID, nombre/borrado confirmado; cuota simulada, export de rescate válido y reintento Saved tras retirar fallo. Capturas reales manual-level-two/three y seis tamaños/temas actualizadas.

36 unitarios relevantes pasan; check 0 errores/avisos y build correctos. Lint detectó la navegación a una URL ya resuelta por SvelteKit; se añadió una excepción local explicada, sin volver a prefijar rutas. Reejecución completa de lint terminada con éxito.

Pendiente para H4: registrar entrada 27 después de consolidar H3, deep link/prerender, favoritos/paleta, táctil básico y medición representativa. Suite completa/CI final e informe GO/NO-GO aún no ejecutados. No marcar Goal completo hasta probar A–E. Main intacta, no merge.

## H4 — Release Candidate A–E

Entrada 27 DRAW-01 / Utilities incorporada tras H3; mapa lazy, SSR/prerender y ruta `/tools/architecture-canvas/`, conservando lab. Las 26 implementaciones previas no cambian. Se ajustan sus aserciones de recuento a 27 sin eliminar matrices ni controles de privacidad. Main continúa en fa0490f, sin merge/force push. Fuentes/nuevos recursos locales: Konva y wrapper MIT; sin otra dependencia.

Aceptación local: check 0 errores/avisos, lint/build y 256 unitarios (16 archivos) correctos. Suite completa Chromium: 36 flujos correctos / dos auditorías históricas remotas omitidas. Tras la extensión final de migración de texto v1, unidades completas y 7 flujos Canvas pasan; ampliar verificación de fuente/tamaño/grosor/capas/línea también pasa. CI del SHA de cierre repite toda la suite y se inspecciona antes de marcar completo el Goal.

Siete flujos Canvas cubren estilos y operaciones reales, jerarquía manual vacía de tres niveles, cámaras/recarga/ciclos/huérfanos, reduced motion/Escape, seis temas/tamaños sin overflow, teclado/foco/outline, gesto táctil CDP, proyectos/importación/no-sobrescritura/confirmaciones, cuota/rescate/reintento, catálogo/pin/deep link/reload/404, carga representativa y dos pestañas con conflicto. Se añadieron revisiones atómicas en IndexedDB para impedir sobrescribir una edición ajena; el contenido no guardado sigue exportable. La migración conserva también conexiones v1 ancladas a texto.

Se corrigió volver a breadcrumb válido al borrar el huérfano abierto y permitir Escape nativo del diálogo, sin secuestrarlo como atajo del lienzo. El lienzo desktop mantiene controles dentro del viewport; en móvil inicia al 100% con pan y controles principales de 44 px. Nueve capturas reales revisadas. Evidencia completa: screenshots/actual/canvas-v14-validation.json; carga de 300 figuras + 20 trazos/400 puntos + 200 flechas medida, sin afirmar FPS. Se restauraron solo capturas históricas regeneradas por regresiones para no reescribir su evidencia de otras versiones.

Informe docs/ARCHITECTURE_CANVAS_V14.md: matriz A–E, GO para RC, límites y P2. README/FEATURES/ROADMAP/VALIDATION actualizados. P0/P1 abiertos: ninguno en el alcance verificado. P2: certificación asistiva/paridad Firefox-WebKit, táctil avanzado y métricas de documentos enormes/largas sesiones; no nuevas iteraciones de polish. El dato persistido únicamente en IndexedDB Canvas es autorización explícita; ningún payload en URL/logs/red/localStorage. Se conserva el respaldo JSON como medio de recuperación.

Cierre de implementación: `db08081f151ca66f8e493e0204a1534649d030ea`, [CI verificada](https://github.com/Rhaizel02/devbench/actions/runs/40216614515), Cloudflare Pages successful para ese mismo SHA. Preview inmutable publicada: https://97d9bf72.devbench-aw3.pages.dev/tools/architecture-canvas/. El intento Playwright HTTPS contra esa URL se bloqueó antes de cargar por `net::ERR_CERT_AUTHORITY_INVALID`; se declara como prueba remota bloqueada y no como pasada. No se deshabilitó validación TLS ni se atribuye una causa sin evidencia. El código sí está verificado localmente y en CI; no se repite auditoría de producción.

La entrega comprueba además el check del commit documental final, cuyo SHA se comunica al usuario. No quedan funciones A–E pendientes. GO para RC en la rama; P2 y límites documentados; no fusionar main ni ampliar alcance.
