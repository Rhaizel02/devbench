# Progreso DevBench V2.0

**Estado actual: H0 aceptado; H1/H2 en implementación en feature/architecture-canvas-v20.** Main exacto c3cd929a5aea231991973abd5744def9d13cf740, integración fast-forward preservando RC c51c73b. CI integración 40240617689 success; CI main 40241056802 success (attempt 2). Próxima acción: terminar pruebas IndexedDB/migración, checkpoint y continuar selección/grupos/geometría sin fusionar Canvas2 a main.

## Recuperación

Leer V20_ARCHITECTURE_CANVAS_GOAL.md completo y este archivo, inspeccionar HEAD/status/remotos/CI y continuar el siguiente hito incompleto. El prompt V2 llegó íntegro en conversación; el único attachment reciente es el prompt V1.5 anterior, no reemplaza V2. No completar por producir Markdown. No fusionar Canvas2 a main.

## Hitos

| Hito              | Estado    | Evidencia / siguiente acción                                                                                                                           |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H0 OpenAPI main   | Aceptado  | integración desde main, RC c51c73b, CI RC 40237359833 success ya inspeccionada en planificación; volver a confirmar.                                   |
| H1 visual/base    | En curso  | inspección previa Chromium: desktop superficie 1142x608, móvil 356x472, sin errores; capturas v14 inspeccionadas. Documentar/implementar solo tras H0. |
| H2 modelo/datos   | En curso  | v3, lectores v1/v2, backups congelados, protección CAS/original y tests antes de UI.                                                                   |
| H3 selección      | Pendiente | marquee/Shift/Escape/outline/bounds.                                                                                                                   |
| H4 grupos         | Pendiente | grupos planos, resize proporcional, capas/alineación/distribución.                                                                                     |
| H5 sketch         | Pendiente | Rough.js 4.6.6 MIT, cache determinista, tinta.                                                                                                         |
| H6 geometría      | Pendiente | rotación/anchors, curvas/elbow/puntas.                                                                                                                 |
| H7 jerarquía      | Pendiente | independiente por defecto vs linked explícito, copiar DAG completo y probar tres niveles.                                                              |
| H8 imágenes/touch | Pendiente | raster acotado/portable si seguro, pointer capture/pinch.                                                                                              |
| H9 release        | Pendiente | matriz, capturas reales, mediciones, docs, instalación limpia/suite/CI exacta/push.                                                                    |

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
