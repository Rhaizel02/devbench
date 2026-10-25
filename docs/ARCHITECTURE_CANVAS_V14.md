# Architecture Canvas V1.4 — implementación y aceptación RC

Estado: desarrollo en `feature/architecture-canvas-v14`; no es todavía una RC aceptada. Contrato completo en [V14_ARCHITECTURE_CANVAS_GOAL.md](../V14_ARCHITECTURE_CANVAS_GOAL.md), progreso y puertas pendientes en [GOAL_PROGRESS_V14.md](../GOAL_PROGRESS_V14.md).

## Renderer y estética

Se conserva Konva 10.9.0 + svelte-konva 1.0.1. [Rough.js](https://roughjs.com/) ofrece primitivas sketch para Canvas/SVG y texturas de relleno. Para la RC se escogen contornos propios deterministas: segunda línea muy suave en rectángulos/rombos/elipses y polilíneas suavizadas para tinta. No hay dependencia adicional, ruido por frame, recursos ni marca de terceros. No se promete el conjunto de pinceles de Excalidraw. Rectángulos redondeados conservan geometría limpia; los bordes y rellenos explícitos no cambian con el tema. Los rótulos de figuras eligen tinta legible sobre el relleno o tema; el color del texto libre lo elige el usuario.

El lienzo es protagonista. Toolbar flotante compacta, inspector opcional, edición directa de texto, viewport inicial al 100% y pan en móvil. Fit es explícito; puede mostrar el conjunto a escala pequeña, acompañado por acceso a 100%. Nunca sustituye el viewport guardado al cambiar de tamaño. Los controles DOM permiten operar sin acertar un píxel de Canvas.

## Implementación de pizarra (H2)

Rectángulos, redondeados, elipses, rombos, texto, flechas/líneas libres o ancladas y lápiz. Creación con preview por arrastre y cancelación Escape. Doble clic abre edición directa o el hijo existente. Selección Shift, movimiento conjunto, resize desde esquina y dimensiones, duplicado, borrado, orden delante/detrás e historial acotado. Un gesto se confirma como una transacción. Undo/redo limpia selección; volver a seleccionar antes de duplicar es intencional.

Extremos de conexiones ajustables con círculos visibles. Los anclajes se expresan como coordenadas normalizadas en el contorno de la caja de la figura y siguen movimiento/resize. No hay routing CAD, puertos ni intersección exacta de contornos curvos. La tinta tiene límite de 2.000 puntos por trazo, con aviso real. El proyecto admite 100 diagramas, 500 figuras y 500 conexiones por diagrama, 100.000 puntos totales y JSON de 8 MiB. Se valida al confirmar la operación, no en cada muestra de puntero.

HEX usa seis dígitos, relleno acepta transparente; presets, grosor, trazo discontinuo, familia/tamaño y sketch se aplican al elemento o selección. Los atajos se limitan al editor y respetan inputs/texto directo. Outline y controles con labels complementan Canvas; no se afirma certificación WCAG.

## Datos e historial (H1)

DTO schema v2 puro en `src/lib/canvas/model.ts`; `serialization.ts` reconstruye campos permitidos desde unknown y migra el spike v1 antes de aceptar datos. IDs y diagramas sin enlace se conservan. Se rechazan JSON hostil, versiones futuras, ciclos, IDs repetidos, anclajes rotos y datos fuera de límites. El historial mantiene como máximo 30 estados y aproximadamente 20 MiB de snapshots; se descarta redo al editar después de undo.

`persistence.ts` contiene almacenamiento Canvas separado y autosave ordenado con debounce. Su integración de UI, recarga e importación aún debe aceptarse en H3; no afirmar guardado del editor a partir de sus tests unitarios aislados.

## Evidencia por hito

H1: 24 pruebas unitarias, check sin diagnósticos, lint/build y CI completos. H2: tres flujos Playwright selectivos sobre build estático pasan: estilos/texto/creación/resize/undo/duplicado/selección múltiple/tinta/conectores y descargas reales JSON/PNG; tres niveles creados manualmente, cámara conservada, zoom directo/animado y ciclos; seis vistas 1440/768/390 en oscuro/claro con 100%, sin overflow, pan por teclado/puntero y desmontaje sin canvas restante. Los flujos inspeccionan consola, solicitudes y canales de privacidad; no son una auditoría remota.

Capturas H2 en `screenshots/actual/canvas-v14-*`: son evidencia del estado del hito, se actualizarán con la RC integrada. La aceptación completa A–E y decisión final GO/NO-GO siguen pendientes.
