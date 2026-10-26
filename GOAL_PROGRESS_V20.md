# Progreso DevBench V2.0

**Estado actual: H0 aceptado; H1–H8 implementados en feature/architecture-canvas-v20; H9 en curso.** Main c3cd929a5aea231991973abd5744def9d13cf740 permanece separado. Checkpoints Canvas f3b48bb (CI40242343863 success) y 65d9d01 (CI40243308896 success). Próxima acción: publicar H8, instalación limpia y controles/suite completa, revisar capturas finales y cerrar matriz/docs/CI exacta. NO declarar RC aceptada hasta esa puerta.

## Recuperación

Leer V20_ARCHITECTURE_CANVAS_GOAL.md completo y este archivo, inspeccionar HEAD/status/remotos/CI y continuar el siguiente hito incompleto. El prompt V2 llegó íntegro en conversación; el único attachment reciente es el prompt V1.5 anterior, no reemplaza V2. No completar por producir Markdown. No fusionar Canvas2 a main.

## Hitos

| Hito              | Estado       | Evidencia / siguiente acción                                                                                                                           |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H0 OpenAPI main   | Aceptado     | integración desde main, RC c51c73b, CI RC 40237359833 success ya inspeccionada en planificación; volver a confirmar.                                   |
| H1 visual/base    | Implementado | inspección previa Chromium: desktop superficie 1142x608, móvil 356x472, sin errores; capturas v14 inspeccionadas. Documentar/implementar solo tras H0. |
| H2 modelo/datos   | Implementado | v3, lectores v1/v2, backups congelados, protección CAS/original y tests antes de UI.                                                                   |
| H3 selección      | Implementado | marquee/Shift/Escape/outline/bounds.                                                                                                                   |
| H4 grupos         | Implementado | grupos planos, resize proporcional, capas/alineación/distribución.                                                                                     |
| H5 sketch         | Implementado | Rough.js 4.6.6 MIT, cache determinista, tinta.                                                                                                         |
| H6 geometría      | Implementado | rotación/anchors, curvas/elbow/puntas.                                                                                                                 |
| H7 jerarquía      | Implementado | independiente por defecto vs linked explícito, copiar DAG completo y probar tres niveles.                                                              |
| H8 imágenes/touch | Implementado | raster acotado/portable si seguro, pointer capture/pinch.                                                                                              |
| H9 release        | En curso     | matriz, capturas reales, mediciones, docs, instalación limpia/suite/CI exacta/push.                                                                    |

## Inspección y decisiones ya tomadas

Plan aprobado leído y prompt completo preservado en el contrato. Leídos AGENTS, arquitectura/diseño/funcionalidades/roadmap/validación, informes V14/V15, metas/progreso V15 y componentes/motores/tests Canvas, registro/lazy. No delegación solicitada; trabajar en este agente. Stack cerrado y ninguna nueva herramienta de catálogo.

Base técnica: modelo v2 sin rotación/grupos/assets; parser v1→v2; IndexedDB devbench.canvas.v2 versión1/store projects, revisión CAS; autosaver600ms serial; History30/~20MiB. BoardSurface draft por gesto; pan cambia viewport; click vacío actualmente limpia selección; múltiples se mueven pero no hay transformador de grupo. Nuevos campos justifican v3; no alterar semántica v2.

Rough.js versión oficial actual comprobada 4.6.6, MIT; 169684 bytes unpacked, NO confundir con incremento bundle. Konva seguirá interacción y geometría, Rough paths deterministas. Plan define resize proporcional de grupos, puntas/curva/elbow, copia independiente por defecto y recursos raster inmutables autocontenidos. Fuentes oficiales en contrato. No claims de benchmark nuevos.

P0/P1 abiertos: ninguno confirmado al inicio. Riesgos que deben probarse: pérdida legacy por nuevos límites, autosave al abrir, snapshot de imágenes, anchors rotados, copia DAG y concurrencia. P2 heredados: aceptación asistiva dedicada/Firefox/WebKit/dispositivos físicos; certificado HTTPS ERR_CERT_AUTHORITY_INVALID previo, sin bypass ni prueba pública afirmada.

## Checkpoints

Inicial: main 666dc73207ba0a2a9f26c686e1ad2e2a796f670f; RC c51c73b089e7a8fb578eb74b3a3557e1d1dae433. Fetch confirmado sin cambios remotos. El Goal activo es implementar H0–H9 completos, no el plan anterior. Aún no se han ejecutado nuevos controles de integración ni modificado producto.

## Checkpoint H0 aceptado y H1/H2 en curso

Main c3cd929a5aea231991973abd5744def9d13cf740 con 28 herramientas: npm ci 0 vulnerabilidades; check 0/0; lint; 310 unitarios; build estático; 41 Playwright passed / 2 históricos remotos skipped. Integración CI 40240617689 success. Main CI 40241056802 attempt1 falló aserción Explore-disabled después de montar editor; diez repeticiones locales aisladas passed sin cambios; attempt2 success exacto mismo SHA. Registrar P2 race de carga/test a vigilar, no afirmar fix ni ocultar intento1. Cloudflare check success; HTTPS Chromium estable bloqueado ERR_CERT_AUTHORITY_INVALID, sin bypass.

Rama Canvas creada desde main aceptado. Capturas reales base1440/390 guardadas; dirección visual e informe incremental en docs/ARCHITECTURE_CANVAS_V20.md. Backups v1/v2 congelados antes de cambiar lector. Modelo schema3 con lector legacy independiente/presupuestos anteriores, campos opcionales nuevos, grupos planos validados, migración pura sin efectos. Persistencia conserva base física, CAS y backup original inmutable en primer guardado migrado; abrir no debe reescribir. Descarga raw/original para recuperación de schema futuro. Historial limita ambas pilas y no serializa datos raster repetidamente. 37 unitarios Canvas passed; check0/0 antes del último ajuste; build/browser selectivos en ejecución (no aceptados todavía). Imágenes son DTO preparatorio, no funcionalidad terminada. Sin P0/P1 confirmado; NO-GO de RC hasta completar hitos centrales.

Checkpoint de base H1/H2: 47 pruebas Canvas (25 anteriores + 12 migración + 10 operaciones) passed; check 0/0; eslint selectivo passed. Build estático passed. Siete flujos Canvas anteriores passed; nuevo flujo IndexedDB passed tras ajustar selector ambiguo (ningún fallo de datos). Migración v1/v2→v3, raw/original rescue, copia DAG independiente/linked, geometría rotada y motores de grupos/alineación/selection implementados. Motores todavía NO conectados a UI; H3–H7 no se consideran completados. Siguiente: renderer/gestos y UI de pizarra, pruebas visuales reales. CI del checkpoint pendiente tras push.

Checkpoint renderer H1/H3–H7 en aceptación: f3b48bb799296946f1d2488537eb7dd2394d1797 CI 40242343863 success. Konva + Rough.js4.6.6 MIT, sin React. Contornos/path deterministas por semilla, clean/soft/expressive/hachure, hit-testing geométrico separado. Marquee cuatro cuadrantes/Shift XOR/Escape; grupos planos, movimiento/resize uniforme/rotación handle y numérica/capas/alineación; curvas/elbows/puntas/control; copia independiente DAG por defecto y linked explícita con indicador compartido. Pointer capture, pan rueda, Ctrl/Cmd-wheel zoom, Space/middle pan, touch pan/pinch probados CDP. Toolbar390 siete acciones con menú More, contexto/propiedades bajo demanda. UI conectada, 48 unitarios Canvas y check0/0 passed. Browser legado7/8 inicial: único fallo esperaba wheel zoom sin Ctrl (contrato cambiado), test adaptado al gesto aprobado; volvió a pasar. Tres flujos nuevos passed con grupos/resize/handle-rotation/copia tres niveles/reload/themes390-768-1440/pinch/privacy. Ajuste de prueba: verificar mensaje linked antes de exportJSON porque export cambia status. Capturas reales generadas e inspeccionadas desktop/group/mobile; reducción encabezado tras revisión móvil. Build passed. Próximo: checkpoint UI/CI, H8 raster seguro y H9 mediciones/escenarios/evidencia final; aún NO-GO RC final.

## Checkpoint H8 raster seguro y evidencia H9

65d9d01917a1ee80eba0022daa03882d78cc8506 CI40243308896 success. Soporte real PNG/JPEG/WebP local: MIME/firma/dimensiones/chunks/base64 canónico y decodificación real antes de aceptar; rechazo SVG/animación/URLs; 1MiB/4MP por imagen, 4MiB/8MP por proyecto. Backup v3 autocontenido, duplicados comparten recurso inmutable, bitmap cache por editor con timeout/cierre/reutilización/cancelación, ningún ObjectURL de imagen ni fetch. Borrado de último uso elimina ese recurso con undo, sin limpiar recursos ajenos silenciosamente. Proyectos inválidos no sustituyen abierto; PNG no exporta placeholders. Test real pasó cuota/retry/rescate, píxel PNG exacto, PNG/JPEG/WebP, duplicado/grupo, reload/import y rollback de PNG con header válido pero datos ausentes. 61 unitarios Canvas passed (incluidos CAS schema futuro con misma revisión y clones con imágenes), cinco browser selectivos + mediciones passed; check/lint selectivos finales en ejecución antes de checkpoint.

Mediciones reales iniciales, latencia de driver/DOM (NO FPS): Small20 import119ms/drag276ms, Medium100+80 import171ms/drag371ms, Large300+200+20ink import241ms/drag616ms, 3 niveles import130ms/drag271ms; pan84–147ms/zoom98–114ms; save840–852ms incluye debounce600ms. Archivo canvas-v20-performance.json. Capturas finales curatoriales mediante importer real; evitar que la prueba de privacidad las sobrescriba (su captura móvil lleva nombre propio). Capturas de quota/import corrupto añadidas para próxima suite. Ningún P0/P1 abierto confirmado. H9 pendiente instalación limpia + suite completa + revisión visual final + matriz/documentos + push/CI exacta/previewTLS. No fusionar a main.
