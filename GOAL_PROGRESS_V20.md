# Progreso DevBench V2.0

**Estado actual: H0 en preparación.** Contrato completo guardado antes de modificar producto. Rama integration/openapi-v15 creada desde origin/main 666dc732. RC OpenAPI c51c73b; árbol inicial limpio. Próxima acción: incorporar RC por fast-forward, actualizar autorización AGENTS y ejecutar/verificar integración antes de promover main. No código Canvas2 hasta CI main aceptada.

## Recuperación

Leer V20_ARCHITECTURE_CANVAS_GOAL.md completo y este archivo, inspeccionar HEAD/status/remotos/CI y continuar el siguiente hito incompleto. El prompt V2 llegó íntegro en conversación; el único attachment reciente es el prompt V1.5 anterior, no reemplaza V2. No completar por producir Markdown. No fusionar Canvas2 a main.

## Hitos

| Hito              | Estado    | Evidencia / siguiente acción                                                                                                                           |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H0 OpenAPI main   | En curso  | integración desde main, RC c51c73b, CI RC 40237359833 success ya inspeccionada en planificación; volver a confirmar.                                   |
| H1 visual/base    | Pendiente | inspección previa Chromium: desktop superficie 1142x608, móvil 356x472, sin errores; capturas v14 inspeccionadas. Documentar/implementar solo tras H0. |
| H2 modelo/datos   | Pendiente | v3, lectores v1/v2, backups congelados, protección CAS/original y tests antes de UI.                                                                   |
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
