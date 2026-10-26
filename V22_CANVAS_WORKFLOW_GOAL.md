# DevBench V2.2 implementation contract

## Literal user requirements

```text
/goal DEVBENCH V2.2 — CANVAS EXPERIENCE & WORKFLOW STUDIO

MISIÓN: consolidar las RC existentes en una nueva rama de trabajo y entregar tres mejoras sustanciales:

1. ARCHITECTURE CANVAS 2.1: corregir los problemas UX reportados por el usuario, implementar modo inmersivo y auditar sistemáticamente las interacciones para encontrar incongruencias.
2. PIPELINE BUILDER V2: editor de transformaciones cómodo, recetas reutilizables, nuevas operaciones útiles y mejor inspección de resultados.
3. TEST DATA GENERATOR V2: generación de datos estructurados y datasets relacionados para pruebas de APIs y bases de datos.

NO ES UN GOAL DE PLANIFICACIÓN. Debes investigar, reproducir, diseñar, implementar, probar, revisar visualmente, corregir y publicar una Release Candidate funcional.

Dedica razonamiento profundo a UX, integridad de datos y causas reales de los fallos. No generes trabajo artificial para consumir tokens. No solicites prompts intermedios por decisiones técnicas menores. Completa el trabajo autónomamente salvo bloqueo demostrable.

====================================================
H0 — CONTRATO PERSISTENTE Y ESTADO DEL REPOSITORIO
====================================================

PRIMERA ACCIÓN OBLIGATORIA:

- Lee este mensaje íntegro, incluidos todos los hitos y criterios de aceptación.
- Si Codex transforma el pegado largo en `pasted-text-*.txt` u otro adjunto, localiza y lee el archivo completo.
- Guarda literalmente los requisitos en `V22_CANVAS_WORKFLOW_GOAL.md`.
- Amplía el contrato con arquitectura, planificación, escenarios UX, decisiones, invariantes, riesgos y matriz de aceptación. Objetivo: más de 20.000 caracteres sustantivos.
- Crea `GOAL_PROGRESS_V22.md` con hitos, commits, pruebas, incidencias, decisiones y siguiente acción concreta.
- Ambos documentos serán el mecanismo de recuperación tras compactaciones.
- Si se compacta el contexto, vuelve a leerlos, inspecciona HEAD/status y continúa.
- No termines después de crear los documentos: EJECUTA TODOS LOS HITOS.

Repositorio: Rhaizel02/devbench.

Estado conocido:
- main: c3cd929a5aea231991973abd5744def9d13cf740, 28 herramientas.
- Canvas 2.0: feature/architecture-canvas-v20, SHA a289fcfd9f54e35e0cd60b8c6a3123cbe88457d2.
- Data Diagnostics V2.1: feature/data-diagnostics-v21, SHA c180ad5e703c24560035a32ded6f17c8a6b5cbfc.
- V2.1 añade SQL EXPLAIN Analyzer y XML Toolkit, alcanzando 30 herramientas.
- Ambos desarrollos están terminados técnicamente, pero NO fusionados en main.

Verifica estado remoto, SHAs y árbol real antes de modificar nada.

ESTRATEGIA DE RAMAS:

1. Crear `feature/canvas-workflow-v22` desde la RC de Data Diagnostics V2.1.
2. Incorporar mediante merge normal el código de Canvas 2.0.
3. Resolver conflictos de catálogo, pruebas, versiones, documentación y estilos conservando todas las funcionalidades.
4. NO alterar el historial de las ramas originales.
5. NO hacer merge de esta nueva rama a main.
6. NO hacer force push.
7. Verificar que la rama integrada contiene 30 herramientas antes de desarrollar nuevas funciones.
8. Ejecutar CI y pruebas relevantes tras consolidar las dos RC.

Si el merge presenta un problema real de integridad o regresión, corregirlo antes de continuar. No sustituir archivos completos de una rama por los de otra sin analizar diferencias.

Leer AGENTS.md, DESIGN.md, ARCHITECTURE.md, FEATURES.md, ROADMAP.md, VALIDATION.md y los informes de Canvas V2 y Data Diagnostics V2.1.

Stack fijo: Svelte 5, SvelteKit 3, TypeScript strict, Vite, Tailwind 4, adapter-static, Konva/svelte-konva, Rough.js y Cloudflare Pages.

No incorporar React, backend, cuentas, colaboración remota, analítica ni telemetría.

====================================================
H1 — INVESTIGACIÓN UX Y REPRODUCCIÓN DE BUGS
====================================================

ANTES DE REDISEÑAR, reproducir los problemas reales.

El usuario ha reportado:

BUG/UX-01: No consigue seleccionar varias figuras dibujando un rectángulo.
BUG/UX-02: Echa en falta un botón para trabajar a pantalla completa.
BUG/UX-03: "To front" y "To back" parecen no funcionar.
BUG/UX-04: En la versión que usa todavía aparece "ARCHITECTURE CANVAS · V1.4 RC".
BUG/UX-05: Las líneas y flechas no tienen un punto evidente para agarrarlas y curvarlas, como Excalidraw.

También solicita mejorar de manera sistemática la UI y UX, buscando problemas que no haya identificado.

INVESTIGACIÓN OBLIGATORIA:

- Examinar CanvasEditor.svelte, BoardSurface.svelte, CanvasFigure.svelte, CanvasConnection.svelte, operations.ts, model.ts y tests asociados.
- Inspeccionar el DOM, Stage y Layers de Konva.
- Reproducir las interacciones mediante Playwright con ratón y eventos pointer reales.
- Comprobar URLs/versiones de main, preview Canvas V2 y futura V2.2.
- Confirmar si los problemas son funcionales, de descubribilidad, del renderizado o de estar utilizando una versión anterior.
- No asumir que una función funciona porque exista código.
- No afirmar que un bug está corregido porque un test de modelo pase mientras el editor visual siga fallando.

Crear `docs/CANVAS_UX_AUDIT_V22.md` con:
- Escenario reproducible.
- Comportamiento esperado.
- Comportamiento observado.
- Causa o hipótesis contrastada.
- Corrección aplicada.
- Evidencia real.
- Clasificación P0/P1/P2.

Capturar el estado ANTES de los cambios mediante capturas reales, cuando sea posible.

El objetivo es corregir la experiencia, no esconder botones defectuosos o limitarse a actualizar etiquetas.

====================================================
H2 — SELECCIÓN POR RECUADRO REALMENTE UTILIZABLE
====================================================

El motor Canvas 2.0 ya contiene marqueeSelection, pero su interacción actual es poco evidente. Debe convertirse en una capacidad central del editor.

CONTRATO UX:

- En modo Select, arrastrar sobre espacio vacío dibuja visiblemente un rectángulo de selección.
- Al soltar se seleccionan los elementos intersectados, usando geometría razonable y reglas documentadas.
- Una figura parcialmente dentro del rectángulo no debe parecer ignorada inexplicablemente.
- Permitir selección estricta por contención mediante un modificador o modo claramente comunicado si aporta valor.
- Shift permite ampliar la selección sin perder lo anterior.
- Click en vacío deselecciona.
- Escape cancela el gesto, restaurando la selección anterior.
- Diferenciar claramente arrastrar para seleccionar y arrastrar para mover una figura.
- Permitir iniciar selección mediante una herramienta explícita si mejora el descubrimiento, especialmente en touch.
- Ctrl/Cmd+A selecciona todos los elementos del nivel actual, excepto cuando un campo de texto tiene el foco.
- El comportamiento debe respetar grupos como unidades.
- Los conectores y líneas también deben poder seleccionarse con reglas claras.
- Los rectángulos de selección no se exportan ni se guardan como elementos.
- La selección debe funcionar independientemente del zoom y la cámara.
- Los handles y el panel de propiedades deben reaccionar a la selección múltiple.

CASOS LÍMITE:
- Figuras rotadas.
- Figuras con bordes superpuestos.
- Conectores que cruzan el rectángulo.
- Grupos parcialmente contenidos.
- Dibujo desde derecha a izquierda.
- Zoom 25%, 100% y 300%.
- Pan previo.
- Selección después de volver de un diagrama hijo.
- Documento con cientos de elementos.
- Canvas en pantalla completa.

PRUEBA DE ACEPTACIÓN:
Crear tres figuras y una flecha, arrastrar un recuadro que intersecte dos figuras, agruparlas, moverlas, cambiarles el color y deshacer. Todo desde la interfaz real, sin inyectar directamente el estado.

====================================================
H3 — CAPAS Y ORDEN VISUAL: TO FRONT / TO BACK
====================================================

Investigar y corregir definitivamente el comportamiento de capas.

El modelo ya contiene reorder(), que modifica z. Eso no demuestra que Konva aplique el orden visible.

COMPROBAR:

- Orden de los elementos en el DTO.
- Orden de renderizado en el Layer de Konva.
- Reconciliación de keyed each de Svelte/svelte-konva.
- Cambios de orden tras mutar z sin recrear elementos.
- Interacciones entre elementos, conectores, grupos e imágenes.
- Orden visual frente a orden de hit-testing.

REQUISITOS:

- To front sitúa la selección por delante de los demás elementos.
- To back la sitúa detrás.
- El resultado es visible inmediatamente.
- No basta actualizar un número de z-index interno.
- Funciona con figuras parcialmente superpuestas.
- Funciona con flechas, imágenes y grupos.
- El orden persiste tras guardar y recargar.
- Undo/redo restaura el orden real.
- Duplicar o crear figuras nuevas no altera arbitrariamente el orden previo.
- El orden del grupo permanece coherente.
- No interferir con las capas de selección ni con los handles.
- No crear nuevas capas Konva sin una justificación concreta.

Si la reconciliación de svelte-konva no actualiza el orden de sus nodos, aplicar explícitamente el reordenamiento del scene graph o ajustar el patrón de renderizado con una solución estable.

PRUEBA OBLIGATORIA:
Dos rectángulos de colores superpuestos. Capturar el píxel/escena anterior, ejecutar To back/To front mediante botones reales, comprobar visualmente el cambio, guardar, recargar y repetir.

También verificar el orden de hit-testing en la zona superpuesta.

====================================================
H4 — FLECHAS Y LÍNEAS EDITABLES COMO EN EXCALIDRAW
====================================================

La UX actual exige pasar una línea a curva/elbow mediante el inspector antes de mostrar el control central.

QUEREMOS EDICIÓN DIRECTA.

REQUISITOS:

- Al seleccionar una línea o flecha recta, mostrar extremos editables y un handle intermedio claramente identificable.
- Arrastrar el punto intermedio de una recta la convierte en una curva editable, con geometría estable.
- No exigir abrir primero el panel de propiedades.
- El handle aparece al seleccionar, desaparece al deseleccionar y no forma parte del documento.
- Poder cambiar entre straight, curve y elbow desde controles contextuales.
- El control de una curva sigue siendo editable después de guardar y recargar.
- Los extremos pueden moverse y conectarse/desconectarse de figuras.
- Las conexiones ancladas siguen a las figuras al mover, escalar o rotar.
- Soportar cabeza de flecha ninguna/final/ambas.
- Las líneas sin flecha se comportan como líneas reales.
- Curvar una flecha no cambia involuntariamente su color, estilo ni texto asociado.
- El control debe ser suficientemente grande y fácil de alcanzar.
- Visualización y hit-testing correctos a diferentes niveles de zoom.
- Undo/redo recupera toda la geometría.
- Export PNG y JSON conservan el resultado.
- Soportar curvas con figuras rotadas y grupos.

Investigar también:
- Si cambiar de recta a curva produce saltos inesperados.
- Si la flecha se invierte cuando coinciden puntos.
- Si los codos cambian de dirección inesperadamente.
- Si los handles interceptan la selección de otros elementos.
- Si la curva exportada coincide con la visualizada.
- Si las flechas se quedan visualmente detrás de figuras de forma incorrecta.
- Si las puntas siguen bien la tangente.

PRUEBA DE ACEPTACIÓN:
Dibujar flecha recta entre dos figuras, seleccionarla, arrastrar control central para curvar, desplazar ambos nodos, modificar color y grosor, deshacer/rehacer, recargar y comprobar que permanece idéntica.

====================================================
H5 — MODO INMERSIVO / PANTALLA COMPLETA
====================================================

Implementar un botón muy visible de Fullscreen / Focus mode.

El usuario quiere disponer del máximo espacio de lienzo y acceder a las propiedades de forma parecida a Excalidraw.

DISEÑO:

MODO NORMAL:
- Mantener el editor integrado en DevBench.
- Toolbar compacta.
- Inspector contextual bajo demanda.
- El shell actual sigue disponible.

MODO INMERSIVO:
- El editor ocupa el viewport completo disponible, sin sidebar, cabecera general ni márgenes de página que resten espacio.
- Barra superior mínima con nombre del proyecto, breadcrumb y acciones esenciales.
- Toolbar accesible, centrada o ubicada según mejor ergonomía.
- Lienzo protagonista.
- Panel lateral de propiedades a la IZQUIERDA en escritorio, abierto por defecto cuando resulte útil.
- Panel contextual que cambia según selección.
- Permitir colapsar/expandir el panel.
- Ajustar área útil y controles para evitar que el panel tape contenidos críticos.
- Accesos claros a undo/redo, zoom, fit, proyectos, JSON, PNG y salir.
- No usar un modal de propiedades que bloquee el dibujo.
- En móvil, el panel debe adoptar formato drawer/bottom sheet no bloqueante cuando está cerrado, con cierre evidente y controles táctiles.

IMPLEMENTACIÓN:

Puede emplearse CSS fixed/inset para un workspace inmersivo robusto; evaluar Fullscreen API del navegador si mejora la experiencia. De existir ambas opciones, diferenciarlas con claridad y ofrecer fallback. No exigir permisos innecesarios.

Conservar:
- Cámara y nivel actual al entrar y salir.
- Selección.
- Estado de edición de elementos.
- Gestión segura del foco.
- ResizeObserver y sincronización Stage/container.
- Export PNG sin overlays.
- Autosave y recuperación.
- Navegación de diagramas hijos.
- Reduced motion.
- Barra de herramientas accesible.

Escape debe tener una precedencia clara:
1. Cancelar un gesto o edición activa.
2. Cerrar panel/modal cuando corresponda.
3. Salir del modo inmersivo.
4. No navegar accidentalmente a otro nivel ni descartar cambios.

Comprobar comportamiento con fullscreen nativo, si se usa, y con el evento fullscreenchange.

No bloquear scroll global después de salir ni dejar listeners sin limpiar.

El modo debe funcionar en 1440, 768 y 390 px y en claro/oscuro.

PRUEBA DE ACEPTACIÓN:
Abrir proyecto, entrar en fullscreen, abrir inspector, seleccionar tres elementos, cambiar color, dibujar flecha, entrar en child diagram, regresar, salir de fullscreen y verificar que estado/cámara/autosave son correctos.

====================================================
H6 — INSPECTOR CONTEXTUAL Y EDICIÓN MÚLTIPLE
====================================================

Mejorar el actual panel Stroke/Fill/Font/Sketch/etc.

El objetivo es una UI más directa y clara, no un formulario enorme.

REQUISITOS:

- En modo inmersivo desktop, panel izquierdo persistente y plegable.
- En modo normal, inspector contextual compacto.
- Presets visuales de color accesibles con pocos clics.
- Stroke y fill diferenciados.
- Transparente accesible.
- Hex editable y validado.
- Grosor, tipo de línea, sketch, fill pattern y tipografía ordenados lógicamente.
- Ajustes para conectores visibles cuando se selecciona una flecha/línea.
- Ajustes de forma cuando se selecciona una figura.
- Posición/tamaño/rotación donde sean útiles, evitando saturar.
- Herramientas de alineación y orden de capas visibles y comprensibles.

MULTISELECCIÓN:

- Si hay varios elementos, cambiar un color afecta a todos los seleccionados.
- Aplicar estilos mixtos correctamente: si algunos tienen distinto color, mostrar estado mixed en lugar de fingir que comparten el primero.
- Cambios de propiedades múltiples forman una operación coherente de historial.
- No modificar inadvertidamente elementos no seleccionados.
- No perder selección después de aplicar cambios.
- No separar grupos implícitamente.
- No mutar conexiones/hijos ajenos.
- Atajos de teclado seguros y sin interceptar inputs de texto.
- Respuesta visual inmediata.

Revisar contraste del texto sobre rellenos hachure: existen capturas anteriores con etiquetas difíciles de leer.

No reescribir DESIGN.md por completo. Añadir solo los tokens/componentes/decisiones reutilizables necesarios.

====================================================
H7 — VERSIONES, ESTADOS Y CONSISTENCIA
====================================================

Investigar la discrepancia de título reportada.

En la rama Canvas 2.0, CanvasEditor ya muestra "ARCHITECTURE CANVAS · 2.0 RC", pero el usuario afirma haber visto "V1.4 RC".

Comprobar:
- Qué muestra main.
- Qué muestra la preview de Canvas V2.
- Qué muestra la nueva preview integrada.
- Header global V1.5 RC.
- Etiquetas locales de herramienta.
- Catálogo, metadatos y descripciones.
- Contenido generado y caché del navegador.
- Posibilidad de que el usuario esté accediendo a una versión antigua.

No confundir un deployment antiguo con un bug de versión actual.

Establecer una fuente única razonable de metadatos de versión, sin convertirlo en un framework de configuración.

Diferenciar:
- Versión DevBench.
- Versión Architecture Canvas.
- Release Candidate vs release estable.

No mostrar V1.4 RC ni V1.5 RC como etiqueta de la nueva RC V2.2 si resulta incorrecto.

Añadir una forma discreta de consultar versión y SHA en interfaz si facilita diagnosticar despliegues, sin incluir datos sensibles ni consultas remotas.

Verificar que las rutas nuevas no se sirven con assets obsoletos después de un despliegue. No introducir service worker ni caché persistente en esta fase.

====================================================
H8 — AUDITORÍA COMPLETA DE UX CANVAS
====================================================

Además de los errores comunicados, buscar activamente incongruencias reales.

NO LIMITARSE A LEER CÓDIGO. UTILIZAR EL EDITOR.

Ejecutar escenarios con ratón y teclado:

A. Crear rectángulo, elipse, rombo, texto, lápiz, línea y flecha.
B. Aplicar colores, estilos y rellenos.
C. Seleccionar uno o varios elementos.
D. Mover selección y grupos.
E. Resize individual y múltiple.
F. Rotar figuras.
G. Reordenar capas.
H. Duplicar elementos.
I. Copiar y borrar grupos.
J. Undo/redo de las operaciones anteriores.
K. Crear diagramas hijos.
L. Navegar por breadcrumb, entrada directa y zoom.
M. Duplicar un subárbol independiente.
N. Importar y exportar JSON.
O. Exportar PNG.
P. Recargar y comprobar persistencia.
Q. Cambiar entre proyectos.
R. Usar fullscreen y regresar.
S. Usar documento grande.
T. Cambiar tema y tamaño de viewport.

Buscar errores específicos:
- Acciones invisibles o poco descubribles.
- Toolbar que oculta el contenido.
- Controles que no hacen nada.
- Indicadores enabled/disabled incorrectos.
- Selección que se pierde inesperadamente.
- Click-through de overlays.
- Handles mal posicionados tras rotación.
- Zoom/pan inconsistente.
- Conflictos entre scroll y gestos.
- Z-index de capas y controles.
- Texto desbordado y truncado.
- Figuras que no se pueden editar directamente.
- Pérdida de foco en diálogos.
- Atajos incompatibles con inputs.
- Menús que quedan abiertos.
- Estado saving/saved engañoso.
- Errores que dejan el editor bloqueado.
- Pérdidas de selección por cambio de propiedades.
- Inconsistencias entre escritorio, tablet y móvil.
- Elementos demasiado pequeños para touch.
- Diferencias entre exportación y representación visual.

REGLA:
Corregir directamente P0/P1 y las incongruencias P2 de bajo coste que estén relacionadas con estos flujos. Otros P2 al backlog con evidencia, sin refactorizaciones generales interminables.

Dar prioridad a problemas que un usuario real notaría en los primeros diez minutos.

====================================================
H9 — RETROCOMPATIBILIDAD CANVAS
====================================================

INVARIANTES ABSOLUTOS:

- JSON v1/v2/v3 antiguo sigue siendo importable.
- IndexedDB existente permanece legible.
- No migraciones destructivas.
- No modificar schema v3 salvo necesidad real y migración totalmente compatible.
- Guardar en V2.2 no elimina estructuras de diagramas hijos.
- Agrupaciones y conectores conservan sus referencias.
- Imágenes portables permanecen intactas.
- Undo/redo no elimina assets ajenos.
- Cambiar modo inmersivo no altera el documento.
- Reordenar capas no elimina propiedades.
- Import inválido no reemplaza un proyecto válido.
- Errores de almacenamiento mantienen rescate JSON.
- No borrar silenciosamente diagramas huérfanos.
- La copia original de backups heredados sigue accesible cuando corresponda.
- Proyectos guardados desde V2.0 se reabren en la nueva RC sin pérdida semántica.

No tocar el modelo de dominio por estética.

Utilizar fixtures de backups congelados y comparaciones completas, no solo recuentos de elementos.

Si existe riesgo de pérdida de datos, P1 y bloquear hasta corregir.

====================================================
H10 — PIPELINE BUILDER V2
====================================================

EVOLUCIONAR la herramienta existente, no crear otra entrada.

Mantener `FLOW-01` y sus rutas y operaciones existentes.

OBJETIVO UX:
Permitir construir, editar, ejecutar y reutilizar transformaciones locales con un flujo visual claro, eficiente y comprensible.

1. STEP EDITOR
- Lista ordenada de operaciones.
- Reordenar de forma cómoda mediante drag/drop si resulta fiable, conservando controles accesibles por teclado.
- Añadir y eliminar pasos fácilmente.
- Duplicar paso.
- Habilitar/deshabilitar un paso individual.
- Editar opciones contextuales.
- Estado y orden evidentes.
- Validar configuración antes de ejecutar.
- Feedback de operación activa/fallida.
- No ejecutar automáticamente mientras se editan opciones.

2. RECETAS
- Recetas incorporadas realmente útiles: Base64 JSON, URL decode, YAML JSONPath, transformaciones JSON, limpieza textual y otras basadas en operaciones disponibles.
- Guardar una receta como configuración exportable.
- Importar una receta JSON versionada.
- Descargar configuración sin payload de entrada ni resultados.
- Nombre y descripción opcional.
- Copiar/duplicar receta en la sesión.
- Validar pasos, opciones, tipos y presupuesto antes de importar.
- No evaluar código proporcionado por recetas.
- No descargar dependencias ni recursos externos.
- No introducir persistencia automática de recetas en localStorage/IndexedDB: en DevBench solo Canvas tiene autorización para guardar documentos. Las recetas del usuario se reutilizan mediante export/import explícito.
- No confundir una receta de configuración con una sesión con datos privados.

3. OPERACIONES
Conservar todas las operaciones existentes.

Añadir un conjunto pequeño pero útil de transformaciones aprovechando motores existentes:
- Operaciones de texto simples (trim, transformaciones de case, reemplazo literal seguro).
- Selección/extracción JSON más cómoda, reutilizando bounded JSONPath.
- XML format/minify seguro si la integración puede reutilizar el motor ya validado de XML Toolkit y respetar budgets.
- Alguna operación adicional de JSON o CSV solo si aporta un caso de uso claro y puede reutilizar motores actuales.

No incorporar ejecución JavaScript, shell, regex arbitrarias sin presupuesto, red, SQL ni operaciones custom inseguras.

No añadir operaciones solo para aumentar el contador.

4. EJECUCIÓN
- Pipeline lineal, acotado y explícito.
- Respetar límites de input/output y presupuesto total.
- Worker cancelable o aislamiento equivalente al motor actual.
- Cancelación real.
- Una ejecución usa snapshot inmutable de pasos/configuración.
- Editar la receta durante una ejecución no debe producir resultados de otra configuración etiquetados como actuales.
- Error por paso con explicación contextual.
- Pasos posteriores marcados como no ejecutados.
- Mostrar outputs intermedios solo bajo demanda y limitados.
- Sin persistir datos ni resultados.
- Copiar/descargar resultado final.
- Reset completo.

5. UX
- Desktop con editor de pasos y visualización de resultados.
- Móvil usable sin scroll horizontal.
- Recetas seleccionables con preview de sus operaciones.
- No requerir demasiados clics para preparar un pipeline típico.
- Dark/light.
- Feedback de errores, focus, empty/loading.
- Atajos que no interfieren con editores.

PRUEBAS:
- Compatibilidad de operaciones anteriores.
- Orden y reordenación.
- Disabled steps.
- Import/export de recetas.
- Invalid recipe, prototype keys, tamaño excesivo.
- Cancelación y stale results.
- Presupuestos.
- Transacciones de ejecución y reset.
- No persistencia.
- Navegación y copiar/descargar real.

====================================================
H11 — TEST DATA GENERATOR V2
====================================================

EVOLUCIONAR `UTIL-03`, conservando Lorem Ipsum y generador/validador EAN-13/GTIN-14 existentes.

Nueva capacidad principal: GENERADOR DE DATASETS ESTRUCTURADOS.

CASO DE USO:
Un desarrollador de Spring Boot quiere generar datos falsos para probar endpoints, listas JSON, filtros, paginación, relaciones entre clientes y pedidos, o cargar fixtures locales.

1. SCHEMAS SIMPLES
Permitir definir campos mediante UI:
- Nombre.
- Tipo.
- Opciones relevantes.
- Required/nullable.
- Valor fijo o generado.
- Reglas simples de rango/longitud.
- Lista de enums.
- Unicidad si corresponde.

Tipos prioritarios:
- string sintético.
- integer/decimal acotado.
- boolean.
- UUID.
- ISO date/datetime.
- enum.
- EAN-13/GTIN-14 como string.
- null opcional.

Reutilizar generadores existentes donde tenga sentido.

2. TABLAS / COLECCIONES
- Crear una colección con nombre y N registros.
- Vista previa de filas.
- Varias colecciones simples cuando sea viable.
- Relaciones one-to-many básicas mediante foreign key sintética, por ejemplo customers → orders.
- Referencias internas válidas.
- Orden de generación controlado.
- Errores claros ante dependencias imposibles, IDs duplicados o referencias inexistentes.
- No intentar un motor ORM ni un simulador SQL completo.

3. DATOS
- Valores claramente sintéticos.
- No descargar listas de personas reales ni datos sensibles.
- Generar nombres/etiquetas ficticias mediante corpus locales si se decide incluirlos.
- No afirmar que un identificador GTIN generado está asignado por GS1.
- Evitar secuencias imposibles con políticas de unicidad.
- Preservar ceros iniciales.
- No convertir identificadores grandes a números JS imprecisos.
- Mantener fechas y formatos consistentes.
- Permitir semilla reproducible opcional si aporta valor para fixtures, diferenciando claramente PRNG determinista de generación criptográfica.
- Nunca presentar seed reproducible como aleatoriedad apta para seguridad.

4. RESULTADOS
- JSON de array de objetos.
- JSON de colecciones relacionadas.
- CSV para datasets tabulares simples.
- Copiar y descargar.
- Vista previa limitada con resultado completo exportable dentro de presupuesto.
- Resumen número de filas/campos/tamaño.
- El formato CSV debe proteger la interpretación accidental como fórmula en hojas de cálculo; documentar cualquier transformación aplicada.
- Opcional SQL INSERT solo si puede ofrecerse escapado correcto y límites claros, sin ejecutar consultas.

5. PRESETS ÚTILES
- Customers.
- Orders.
- Products.
- API paginated response.
- Inventario simple.

Los presets son sintéticos, coherentes y editables.

6. LÍMITES
- Definir máximo de colecciones, campos, registros y bytes.
- Prevalidar cardinalidad/unicidad antes de gastar CPU.
- Errores sin resultados parciales engañosos.
- Cancelar operaciones costosas mediante worker si es necesario.
- Sin persistir datasets, templates personalizados o outputs.
- Evitar dependencias enormes como un faker completo si el corpus local es suficiente.

7. TESTS
- Tipos y rangos.
- Unicidad.
- Seed/reproducibilidad si se implementa.
- Identificadores y check digits.
- Relaciones FK.
- Referencias no válidas y ciclos.
- Serialización JSON/CSV.
- Unicode y caracteres especiales.
- Presupuestos y valores máximos.
- Descarga/copia real.
- Regresiones de Lorem y GTIN existentes.

====================================================
H12 — REVISIÓN UX CONJUNTA
====================================================

No basta terminar Canvas.

Realizar revisión visual y funcional de las tres áreas:

- Architecture Canvas 2.1.
- Pipeline Builder V2.
- Test Data Generator V2.

Revisar:
- Claridad de acciones.
- Densidad de interfaz.
- Scroll y tamaño de editores.
- Accesibilidad básica.
- Estados vacíos, busy y error.
- Consistencia de botones y menús.
- Etiquetas naturales y útiles.
- Descubribilidad de operaciones.
- Copy/download.
- Foco y teclado.
- Dark/light.
- 390/768/1440.
- Modo inmersivo Canvas.
- Gestión correcta de paneles.
- Ajuste de texto y líneas.

Inspeccionar capturas REALES de Chromium y corregir los problemas funcionales/visuales evidentes antes de dar por terminado el Goal.

No usar imágenes generadas ni mockups como prueba de funcionalidad.

====================================================
H13 — PLAN DE PRUEBAS Y CALIDAD
====================================================

PRUEBAS DE ALTO RIESGO:
- Backups Canvas v1/v2/v3.
- Integridad IndexedDB.
- Agrupaciones y referencias.
- Orden z y render real.
- Conectores anclados.
- Undo/redo.
- Import/export.
- Pipeline recipe import hostil.
- Cancelación y resultados obsoletos.
- Generación de datos relacionados y unicidad.
- Presupuestos y privacidad.

PRUEBAS DE INTERACCIÓN:
- Selección rectangular real.
- Agrupación por marquee.
- Edición múltiple de estilos.
- To front/To back visible.
- Edición directa del punto de una flecha.
- Fullscreen, inspector y retorno.
- Tres niveles de arquitectura y duplicación de subárbol.
- Export PNG/JSON y reload.
- Pipeline reorder, recipe import/export y ejecución.
- Test Data schema, FK, preview, JSON y CSV.
- Regressions de XML Toolkit y SQL EXPLAIN.
- Verificar 30 entradas sin duplicados.

PRECAUCIÓN CON TESTS:
No conformarse con tests unitarios para acciones de renderizado.
No llamar "Playwright" a una prueba que modifica stores directamente sin usar la interfaz.
No atribuir éxito a un screenshot sin comprobar acciones.
No crear cientos de tests redundantes por polish visual.
No relajar aserciones ni introducir retries globales para ocultar intermitencias.

CI:
- npm ci
- npm run check
- npm run lint
- npm run test
- npm run build
- npm run test:e2e

Ejecución selectiva por hitos y suite completa al final.

Verificar CI del SHA EXACTO publicado.

====================================================
H14 — PRIVACIDAD, PERSISTENCIA Y SEGURIDAD
====================================================

Canvas mantiene su excepción de persistencia local IndexedDB.

Pipeline y Test Data Generator NO reciben autorización para guardar automáticamente payloads ni resultados.

Prohibido:
- Telemetría.
- Backend nuevo.
- Datos de usuario en URL/hash/history.
- Datos privados en localStorage/sessionStorage.
- Envíos de payloads por HTTP.
- Ejecución de recetas como JS arbitrario.
- Importaciones HTML activas.
- XML externo/DTD/XXE.
- Archivos remotos de fixtures.
- Persistencia oculta de configuraciones sensibles.
- Errores que vuelcan documentos completos a consola.

Permitir exportación/descarga/copia solo por acción explícita.

Validar JSON de recetas con límites y schema versionado.
Proteger los datasets generados frente a fórmulas CSV peligrosas.
No permitir que la nueva UX Canvas corrompa datos.

No cambiar reglas de privacidad generales para facilitar una funcionalidad.

====================================================
H15 — CHECKPOINTS Y DOCUMENTACIÓN
====================================================

Organizar el trabajo en checkpoints grandes, coherentes y recuperables:

A. Contrato, merge técnico y baseline con 30 herramientas.
B. Canvas selección, capas y conectores.
C. Canvas fullscreen, inspector y auditoría UX.
D. Pipeline Builder V2.
E. Test Data Generator V2.
F. Revisión visual, regresiones y RC.

En cada checkpoint:
- Registrar cambios exactos.
- Ejecutar pruebas proporcionales al riesgo.
- Corregir P0/P1.
- Registrar P2 relevantes.
- Actualizar GOAL_PROGRESS_V22.md.
- Commit.
- Push.
- Registrar SHA.
- Continuar automáticamente.

No exigir CI remota tras cada ajuste de color.
Sí exigir CI tras integración y en release final.

Documentación final:
- V22_CANVAS_WORKFLOW_GOAL.md
- GOAL_PROGRESS_V22.md
- docs/CANVAS_UX_AUDIT_V22.md
- docs/CANVAS_UX_V22_ACCEPTANCE.md
- docs/PIPELINE_V2.md
- docs/TEST_DATA_V2.md
- VALIDATION.md
- ROADMAP.md
- FEATURES.md
- README, solo secciones pertinentes.

No modificar datos históricos para fingir que una entrega antigua incluía estas funcionalidades.

MATRIZ DE ACEPTACIÓN:
Cada requerimiento debe enlazar:
- Código real.
- Escenario de prueba.
- Evidencia.
- Resultado.
- Limitación/P2 si corresponde.

CAPTURAS REALES:
- Canvas modo normal.
- Canvas fullscreen desktop.
- Canvas fullscreen inspector abierto.
- Marquee sobre tres formas.
- Grupo seleccionado y cambio masivo de color.
- Elementos superpuestos antes/después de To front.
- Flecha curvada mediante handle.
- Nivel de diagrama hijo.
- Canvas móvil.
- Pipeline configurando receta.
- Pipeline con resultados intermedios.
- Test Data con schema.
- Test Data con colecciones relacionadas.
- Test Data JSON/CSV.
- Dark/light, 1440/768/390 para pantallas clave.

Guardar capturas en screenshots/actual.

====================================================
H16 — CRITERIOS DE FINALIZACIÓN
====================================================

No declarar DONE hasta cumplir:

1. La nueva rama reúne correctamente Canvas 2.0 y Data Diagnostics V2.1.
2. Hay 30 herramientas disponibles.
3. main permanece intacta.
4. Las ramas RC originales permanecen intactas.
5. Marquee funciona y es fácil de descubrir.
6. Multiselección y aplicación de propiedades funcionan.
7. To front/To back cambian el orden VISUAL.
8. Se pueden curvar flechas arrastrando un punto desde una recta.
9. Fullscreen/Focus mode funciona y ofrece inspector lateral adecuado.
10. Versiones/títulos reflejan la RC realmente desplegada.
11. La auditoría UX ha identificado y corregido los problemas más importantes.
12. Canvas v1/v2/v3 mantiene compatibilidad completa de backups.
13. Pipeline Builder V2 ofrece recetas import/export y edición mejorada.
14. Test Data Generator V2 produce datasets estructurados y relaciones correctas.
15. XML Toolkit y EXPLAIN conservan su funcionalidad.
16. Los datos privados permanecen locales.
17. Tests, check, lint, build y CI final pasan.
18. Capturas reales y documentación están publicadas.
19. No hay P0/P1 abiertos.
20. Los P2 están priorizados, no escondidos.
21. El working tree queda limpio.
22. Todo el código está en origin/feature/canvas-workflow-v22.
23. Se proporciona el SHA final exacto.
24. NO se fusiona la rama nueva en main sin aprobación posterior.

Si la preview Cloudflare está disponible, verificar la URL real y comprobar la herramienta publicada con HTTPS normal, sin desactivar validación TLS. Si hay bloqueo de certificado, documentarlo sin afirmar que el smoke pasó.

INFORME FINAL DE CODEX:

- Rama y SHA final.
- Estado del merge técnico de las dos RC.
- Problemas Canvas reproducidos y corregidos, con causa.
- Funcionalidades UX añadidas.
- Pipeline Builder V2.
- Test Data Generator V2.
- Matriz de compatibilidad v1/v2/v3.
- Resultados de pruebas y CI.
- Capturas.
- Preview.
- P0/P1 y P2.
- GO/NO-GO para revisión.

REGLA FINAL:

Esta iteración no debe limitarse a sumar botones. Debe hacer que DevBench se sienta como una herramienta bien diseñada.

Architecture Canvas debe ser cómodo para trabajar durante una sesión larga. Pipeline Builder debe permitir construir transformaciones sin fricción. Test Data Generator debe producir datos reales de prueba con relaciones coherentes.

Utiliza criterio profesional para encontrar y corregir inconsistencias que el usuario no haya identificado, pero evita refactorizaciones ajenas y hardening preventivo sin evidencia.

EMPIEZA AHORA: lee el contrato completo, persístelo en Markdown, crea la rama integrada, verifica la baseline y ejecuta H1–H16 hasta entregar la Release Candidate.
```

## Implementation architecture and acceptance elaboration

### Branch and integration gate

This contract supersedes previous prohibitions only for merging the two RCs into feature/canvas-workflow-v22. Main and both original RC heads must remain unchanged. Start from Data Diagnostics c180ad5e703c24560035a32ded6f17c8a6b5cbfc and merge Canvas a289fcfd9f54e35e0cd60b8c6a3123cbe88457d2 using a normal history-preserving merge. Do not replace conflicted files wholesale: retain XML/EXPLAIN and Canvas improvements, both dependency additions, useful tests and accurately historical reports. Catalog remains thirty entries; Canvas/Pipeline/Test Data evolve existing entries, not extra tools. After integration, check/lint/unit/build/selective browser regression and exact merge CI establish baseline before UX changes.

### Canvas data and interaction boundaries

Keep schema v3 and the existing pure domain/operations/history/persistence layers. Flat groups, local raster assets, child diagram DAGs, stable IDs and per-diagram cameras remain intact. No IndexedDB deletion, destructive migrations, implicit orphan cleanup or model changes for aesthetic reasons. Frozen v1/v2/v3 fixtures must compare full semantic documents through migration/export/import, including styles, anchors, assets, shared children, seeds and viewport. Import failure preserves current document. Quota/concurrency recovery retains rescue JSON and original legacy copies.

Pointer state must explicitly distinguish idle, shape drag, marquee, connector bend, pan, drawing and text edit. A gesture captures a selection snapshot and world-space origin; transient overlays never enter a saved document/history. Escape cancels the current gesture before touching panels or immersive mode. Marquee defaults to geometric intersection, with clearly labeled optional strict containment. Shift adds/toggles coherently; groups expand as atomic units. Rotated bounds/segments/curves must be considered in geometric tests rather than relying on unrotated DTO boxes. Selection and hit testing are validated at 25/100/300 percent zoom and after camera movement/child navigation. A drag has one final history transaction, not per-pointer serialization.

Investigate z order at three levels: DTO z, Svelte keyed reconciliation and actual Konva child indices. Test model reorder is insufficient. The visual scene graph and hit target must agree. Preserve separate overlay/interaction layers and explicitly synchronize ordered render nodes if keyed reconciliation does not reorder the native graph. Selected groups move front/back as coherent units; newly created/duplicated elements use deterministic ordering. Pixel samples with contrasting overlapping rectangles prove the action before/after, reload and undo/redo. Connections/images must participate rather than being trapped behind a separate always-lower collection.

A selected straight connector gets a visible midpoint grip. Beginning its drag converts to a curve in a single gesture while preserving endpoints, anchors, color, line width, arrows, dashes and child relationships. Control placement is world-space and follows existing model semantics. Endpoints remain editable and snapped only by explicit gesture rules. Handles are screen-sized and available without opening the inspector. Context controls allow straight/curve/elbow and none/end/both heads. UI selection overlays are not exported, whereas PNG uses identical geometry/tangents to the visible scene. Repeated/degenerate control points need deterministic fallback, never NaN or inverted arrows.

### Immersive workspace and inspector

Use a robust CSS fixed/inset immersive workspace as the baseline, without requiring native Fullscreen permissions. If native Fullscreen is added it must be clearly separate, observe fullscreenchange and preserve fallback; it is optional, not a substitute for Focus mode. Opening mode preserves project, current diagram, selection and camera; resizing stage uses the live container and does not auto-fit away the user's position. Desktop gets a compact top bar, breadcrumb, toolbar and collapsible left inspector; the usable stage excludes the panel footprint instead of hiding nodes under it. Mobile gets a closed-by-default property drawer/sheet with an obvious close button. Exit restores focus to the invoking control and restores any global scroll styling/listeners on teardown. Escape priority: active gesture/text edit, relevant panel/dialog, immersive mode; never unexpectedly navigate a child level or discard edits.

Inspector presentation depends on selection: shape, connector, ink, image or multiple. Display genuinely mixed stroke/fill/font values and let one explicit change apply to the selection without replacing unrelated properties. One property action equals one history transaction. Presets and transparent fill are direct actions; HEX validation must not silently substitute another color. Hachure/text contrast is inspected in both themes. Inputs retain normal keyboard editing; Ctrl+A/G/Delete/Space do not hijack focused text fields. Focusing a property input must not erase selection. Cheap interaction inconsistencies found during these scenarios can be fixed in the same checkpoint; unrelated P2 remain recorded.

### Version provenance

Distinguish app 2.2 RC, Canvas 2.1 RC and immutable local build SHA. Use one small release metadata module/build injection rather than duplicating string conditions across sidebar/page/editor. No runtime version fetch, telemetry, payload logging or service worker. Verify main and immutable Canvas V2 previews before diagnosing the reported V1.4 label; old deployment is evidence of provenance, not proof of a current rendering bug. Audit report keeps observed URL/SHA and screenshots. The integrated preview must display current versions and own hashed assets after reload.

### Pipeline V2 domain and execution

Retain FLOW-01 and all previous operation semantics. Extend the existing typed linear step model with stable per-session step IDs, enabled flag, duplicate/reorder controls and contextual options. Disabled steps remain in recipes and are explicitly reported as skipped, with downstream steps consuming the last executed output. Configuration edits invalidate current results and cancel a running snapshot when appropriate. Native accessible up/down controls are mandatory; drag/drop is allowed only with equivalent reliable behavior and focus retention.

Recipes are versioned configuration-only JSON: name/description and validated steps/options; never source/intermediate/final payload. Reject unknown versions/operations/options, prototype-bearing structural keys, invalid types, excessive text/depth/step count and impossible configurations before replacing the current recipe. Import is transactional; export/copy explicitly serialize an allowlist. Reusing a recipe is an explicit in-memory operation or file import, never localStorage/IndexedDB. Built-in recipes preview their actual steps before running. Pipeline remains no-eval/no-network; replacement is literal, case transformations reuse text engines, JSON extraction reuses bounded JSONPath, safe XML transformations reuse V2.1 validation. All useful old recipes remain.

One worker invocation owns an immutable source/configuration snapshot, a request ticket and a real timeout/cancel handle. Explicit Run is required. Per-step output/error status identifies the active/failed/skipped/not-run stage. Intermediate texts are retained only within bounded total budgets and displayed/copied on request; a later error cannot make a partial intermediate result look like a successful final result. Subsequent steps are not run after failure. Final copy/download is enabled only for current successful output. Reset clears recipe custom names/options as defined, source and results without touching global metadata/Canvas projects.

### Structured Test Data V2

Retain UTIL-03, Lorem and EAN/GTIN. New dataset engine is pure TypeScript plus a worker adapter if needed. Define small versioned in-memory specifications: collections with bounded row count and ordered fields; each field has a safe own name, generator type, validated options, nullable/required behavior and optional uniqueness/foreign-key reference. Scalar supported values are synthetic strings, bounded safe integers/finite decimals, booleans, UUID, ISO dates/datetimes, enum, GTIN strings and explicit null. No faker-sized library, remote corpora, personal data, database or SQL execution.

Use deterministic seeded PRNG when a seed is supplied, labeled reproducible test data rather than security randomness. Existing cryptographic GTIN/identifier generation contracts remain unchanged outside this explicitly deterministic dataset mode. UUID bits and GTIN checksums remain structurally correct. Leading zeros stay strings; integer/decimal options reject unsafe integer ranges/nonfinite values instead of silently losing precision. Date intervals are validated and output consistently in UTC ISO forms.

Foreign keys reference an existing collection and unique field. Build a dependency DAG, reject cycles/missing references/duplicate names and generate parents before children. Dependent values are sampled only from generated, non-null valid keys. Cardinality/uniqueness feasibility is prevalidated for finite spaces (booleans/enums/ranged integers), with bounded attempts or deterministic unique generation for larger domains; impossible requests fail atomically. Relationships must remain true after serialization. Presets customers/orders/products/inventory/paginated API are editable synthetic examples, not hidden immutable templates or extra tools.

Export JSON for one array, related named collections or a documented paginated envelope. CSV exports one flat collection with stable columns, proper quotes/newlines and formula protection for cells starting dangerous spreadsheet operators (including whitespace/control prefixes); disclose the exact prefix transformation and keep original JSON unchanged. No SQL INSERT is required unless separately justified by a concrete supported dialect and safe escaping. Preview is paged/capped; complete data export remains available within byte budget. All source/spec/results are memory only; no auto-persisted custom templates.

### Evidence and release acceptance

Checkpoint A proves integrated baseline and exact CI; B covers marquee/z/connectors; C immersive/inspector/versions/audit; D pipeline; E datasets; F visual/privacy/full regression/RC. Each checkpoint updates progress with exact changes, verified commands, SHA, findings and next action before push. Tests follow risk, not decorative counts. Use real pointer/mouse/key actions for Canvas acceptance, never store injection to claim interaction. Import fixtures and setup are allowed where specifically testing backup parsing, not as a substitute for creating/selecting/connecting in the UX acceptance scene.

Required evidence includes thirty tool entries, baseline and current build provenance, mouse marquee/group/style/undo, visible pixel and hit-test z changes, bend from straight, anchored rotated/group transformations, immersive entry/exit and resize/focus, three levels/deep copy, JSON/PNG/reload, legacy frozen backups/IndexedDB/quota recovery, pipeline recipe hostile import/reorder/disable/snapshot/cancel/privacy and dataset ranges/unique/FK/seed/CSV injection/export. Capture actual Chromium before/after/key states at 390/768/1440 and both themes, then inspect images and correct real problems. Record any physical-device/assistive/cross-browser limits precisely.

Final gate is clean install, check/lint/unit/build/full Playwright and exact published-SHA CI. Cloudflare immutable URL must map to the SHA from its deployment check and pass normal-TLS browser smoke if available; never bypass TLS or present a historical deployment as current. Working tree clean, all changes pushed to origin/feature/canvas-workflow-v22, original heads unchanged, no merge main. P0/P1 include data loss, broken core interactions, security/privacy leakage and corrupt persistence; resolve before GO. Document prioritized P2 with reproducible evidence and no speculative rewrites. Final report gives SHA, branch, integration ancestry, real implemented functionality, compatibility matrix, tests/CI, screenshots, preview and an honest GO/NO-GO for review.
