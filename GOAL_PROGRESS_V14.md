# Progreso DevBench V1.4

## Reanudación

Leer V14_ARCHITECTURE_CANVAS_GOAL.md y este archivo, consultar Goal activo, HEAD/status y evidencia antes de continuar. Objetivo completo: RC A–E; no basta el spike. No fusionar main.

## Base comprobada

- 2026-10-25: HEAD inicial limpio `476ca84edec75d9904ef531e9f514646722291ae`, rama spike.
- Creada `feature/architecture-canvas-v14` desde ese SHA. Main permanece `fa0490f5872262614ba9fe0370377295f3112fae`.
- Stack y normas inspeccionados; Canvas tiene autorización explícita para persistir sus propios proyectos en IndexedDB. Resto de herramientas sin excepción.

## Hitos

| Hito                        | Estado       | Evidencia / siguiente acción                                                                                |
| --------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| H0 contrato                 | Aceptado     | `007fccfe6125765c7dea60fcf592bd9c9cd1626f`; contrato de 14.862 bytes, push y CI 40211787379 correctos.      |
| H1 dominio + almacenamiento | Implementado | 24 tests selectivos pasan; check 0 errores/avisos, lint y build correctos. Pendiente CI del commit de hito. |
| H2 pizarra                  | Pendiente    | Herramientas por arrastre, edición directa, propiedades y transformaciones.                                 |
| H3 proyectos + jerarquía    | Pendiente    | Integración IndexedDB, gestión e import/export, hijos creados por usuario.                                  |
| H4 RC                       | Pendiente    | Entrada 27 solo al aceptar A–D, capturas, suite/CI e informe.                                               |

## Incidencias y aceptación

H1 incorpora DTO v2, parser que reconstruye campos permitidos con límites 8 MiB/100 diagramas/500 figuras/500 conexiones/2.000 puntos por trazo/100.000 totales, migración v1 y roundtrip, anclajes, transformaciones y jerarquía independientes del renderer. Historial de 30 estados y presupuesto de 20 MiB. Almacenamiento exclusivo `devbench.canvas.v2`, transacciones confirmadas, autosave serial y debounce, reintento tras error. La UI aún no usa este motor: A–E no aceptados por esta evidencia aislada.

Vitest: 24/24 en `src/lib/canvas/canvas.test.ts` (migración, importación hostil, geometría, ciclos, historial, autosave lento/debounce/cuota/bloqueo). `check` 0 errores/avisos; `lint` y `build` completos pasan. Rutas públicas siguen en 26 y lab conserva el spike mientras se construye la pizarra.

Sin auditoría de RC ejecutada todavía. El error de certificado al abrir la preview del spike se conserva como antecedente, no como fallo atribuido al producto ni validación de esta RC.

Próxima acción: comprobar CI H1 e implementar H2, con creación por arrastre, edición directa y selección múltiple sobre el DTO nuevo. H3 integrará el motor de persistencia con proyectos; H4 registra entrada 27 solamente al aceptar A–D.
