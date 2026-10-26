# DevBench V2.0 — contrato completo de implementación

Este archivo conserva íntegramente el prompt del usuario y desarrolla el plan aprobado. Es un contrato de implementación H0–H9, no una entrega documental. Releer junto con GOAL_PROGRESS_V20.md después de interrupciones, inspeccionar Git/CI y continuar el hito incompleto. No marcar Goal completo por crear estos documentos.

## Prompt original íntegro

Escritura
/goal DEVBENCH V2.0 — OPENAPI V1.5 INTEGRATION + ARCHITECTURE CANVAS 2.0
MISIÓN: completar dos entregables reales y verificables: (1) integrar OpenAPI Explorer V1.5 en main sin regresiones; (2) desarrollar Architecture Canvas 2.0, convirtiendo el editor actual en una pizarra de arquitectura mucho más cercana a Excalidraw, preservando su navegación jerárquica y TODOS los proyectos/backups existentes.
Este es un GOAL DE IMPLEMENTACIÓN, no de planificación. Trabaja autónomamente hasta completar el alcance o encontrar un bloqueo P0/P1 demostrable. No solicites nuevos prompts por decisiones técnicas menores. Emplea el razonamiento y las herramientas necesarios para entregar una implementación sólida; no generes tests, documentación o refactors artificiales solo para consumir tokens. 0. INSTRUCCIÓN CRÍTICA: PERSISTIR Y SEGUIR EL PROMPT
Antes de modificar producto:
Lee ESTE PROMPT COMPLETO. Si Codex ha convertido el pegado largo en un attachment pasted-text-*.txt, localiza y lee ese archivo íntegramente.
Guarda el contrato en V20_ARCHITECTURE_CANVAS_GOAL.md, incorporando íntegramente los requisitos aquí escritos.
Amplía el documento hasta superar 18.000 caracteres sustantivos, desarrollando arquitectura, modelo de datos, decisiones UX, hitos, criterios de aceptación, casos límite, riesgos y dependencias entre funcionalidades.
Crea GOAL_PROGRESS_V20.md, con estado de los hitos, commit SHA, pruebas, hallazgos, deuda P2 y próxima acción concreta.
Ambos documentos deben permitir continuar después de una compactación de contexto sin perder requisitos.
Tras generar los documentos, CONTINÚA IMPLEMENTANDO. No consideres cumplido el Goal por haber creado el Markdown.
Si cambia el contexto, lee ambos MD, inspecciona HEAD/status/CI y retoma el siguiente hito incompleto.
Mantén ambos archivos actualizados en commits verificables. Evita repetir trabajo ya aceptado.

1. REPOSITORIO Y CONTEXTO
   Repositorio: Rhaizel02/devbench.
   Estado de referencia:
   main V1.4: 666dc73207ba0a2a9f26c686e1ad2e2a796f670f.
   OpenAPI V1.5 RC: rama feature/openapi-explorer-v15, SHA c51c73b089e7a8fb578eb74b3a3557e1d1dae433.
   Actualmente 27 herramientas en main y 28 en la rama V1.5.
   Architecture Canvas existente: Konva + svelte-konva, Svelte 5, proyectos IndexedDB, import/export JSON v1/v2, PNG, navegación multinivel y edición básica.
   OpenAPI RC: parser 3.0/3.1, explorador, schemas, HTTP preview, redacción/handoff y Contract Diff.
   V1.5 ya pasó 310 tests unitarios y 41 flujos Playwright; 2 auditorías remotas históricas omitidas.
   NO presupongas que los SHAs siguen siendo HEAD: haz fetch e inspecciona el estado real.
   Lee:
   AGENTS.md
   ARCHITECTURE.md
   DESIGN.md
   FEATURES.md
   ROADMAP.md
   VALIDATION.md
   docs/ARCHITECTURE_CANVAS_V14.md
   docs/OPENAPI_V15.md
   V15_OPENAPI_GOAL.md y GOAL_PROGRESS_V15.md
   Motores y componentes existentes de src/lib/canvas/
   Tests Canvas y OpenAPI
   Registro de herramientas y lazy imports
   Stack innegociable: Svelte 5, SvelteKit 3, TypeScript strict, Vite, Tailwind 4, adapter-static y Cloudflare Pages.
   Mantén el sitio estático, sin backend, autenticación, colaboración online, telemetría ni llamadas remotas desde Canvas.
   NO introducir React ni sustituir el editor por @excalidraw/excalidraw. Queremos una experiencia inspirada en Excalidraw, no añadir un segundo runtime o reescribir el producto. Konva continuará siendo la base salvo evidencia técnica excepcional, documentada y justificada.
2. ESTRATEGIA DE RAMAS Y COMMITS
   Fase A: integrar V1.5.
   Crear integration/openapi-v15 desde main actualizado. Incorporar los commits de feature/openapi-explorer-v15 sin perder historial ni reimplementar funcionalidades.
   Verificar la integración completa antes de promoverla a main. Corregir problemas P0/P1 reales si aparecen. No bloquear por P2 ya documentados.
   Autorización explícita: una vez validada la integración, actualizar main y hacer push al remoto sin force push. Preferir avance fast-forward cuando la topología lo permita; si se requiere merge commit, conservar el historial y explicar la decisión. No reescribir commits.
   Confirmar CI y registrar SHA final de main.
   Fase B: desarrollar Canvas 2.0.
   Crear feature/architecture-canvas-v20 desde el main recién integrado. TODO Canvas 2.0 irá en esta rama.
   NO fusionar Canvas 2.0 en main al terminar. Quedará como Release Candidate pendiente de revisión humana.
   No alterar el resto de las 28 herramientas salvo cambios estrictamente necesarios de integración, navegación o regresiones.
   H0 — INTEGRACIÓN OPENAPI V1.5
   Objetivo: main estable con las 28 herramientas.
   Comprobar:
   OpenAPI Explorer está registrado una sola vez.
   Ruta /tools/openapi-explorer/ prerenderizada y lazy-loaded.
   Búsqueda, paleta, favoritos, recientes y navegación mantienen el contrato anterior.
   Los 27 workspaces previos funcionan.
   Architecture Canvas conserva IndexedDB y lectura de JSON v1/v2.
   OpenAPI no persiste payloads y mantiene referencias externas sin fetch.
   Transferencia OpenAPI → HTTP Request Builder de un solo uso, explícita y redactada.
   Contract Diff sigue operativo.
   No duplicar versiones/rutas/componentes ni perder pruebas existentes.
   Ejecutar instalación limpia cuando corresponda, check, lint, tests, build y Playwright relevantes. Verificar CI del commit de integración y del main actualizado.
   Registrar el SHA exacto, pruebas realizadas y decisión GO/NO-GO.
   No comenzar Canvas 2.0 si main no ha superado esta puerta.
   H1 — DISEÑO DE PRODUCTO Y BASE VISUAL
   Antes de modificar masivamente UI, inspecciona las capturas de V1.4 y el editor real en Chromium.
   La dirección es inequívoca:
   ARCHITECTURE CANVAS 2.0 DEBE SENTIRSE COMO EXCALIDRAW.
   Debe servir para pensar visualmente, bocetar sistemas, organizar componentes, dibujar relaciones y navegar entre niveles de arquitectura.
   NO debe parecer prioritariamente:
   Un editor de nodos tipo React Flow.
   Un diagrama empresarial rígido.
   Un formulario técnico con una superficie gráfica secundaria.
   Principios UX:
   El lienzo domina la pantalla.
   Toolbar compacta, contextual y fácilmente reconocible.
   La mayor parte de acciones habituales requiere uno o dos gestos.
   Dibujar, conectar, seleccionar, escribir y recolorear resulta inmediato.
   Los paneles no consumen espacio permanentemente.
   Teclado, ratón, trackpad, touch y stylus tienen comportamientos coherentes.
   Responsive real, no simplemente reducir de tamaño el editor de escritorio.
   Claro/oscuro consistentes con DESIGN.md.
   Animaciones cortas, funcionales y compatibles con reduced-motion.
   No introducir ruido visual, gradients gratuitos ni animaciones decorativas.
   Documenta una dirección visual concreta en DESIGN.md o documento de diseño asociado, reutilizando los tokens existentes.
   Define y prueba primero los estados maestros:
   Lienzo vacío, listo para dibujar.
   Diagrama de arquitectura con formas/flechas/colores.
   Selección múltiple y agrupación.
   Edición contextual de formas/conexiones.
   Navegación entre diagramas hijos.
   Editor móvil con controles adaptados.
   Producir capturas reales de la base y de las pantallas principales durante la implementación. No aceptar una UI solo porque los tests DOM pasen.
   H2 — MODELO V2.0 Y RETROCOMPATIBILIDAD ABSOLUTA
   ESTE ES EL HITO MÁS SENSIBLE.
   Los usuarios pueden tener proyectos guardados en IndexedDB o exportados como JSON v1/v2. Ninguna evolución del modelo puede perderlos.
   Invariantes:
   Importar todo JSON válido v1/v2 existente sin perder figuras, texto, tinta, conexiones, colores, jerarquía, IDs internos ni viewport.
   No exigir que el usuario regenere backups antiguos.
   No hacer migraciones destructivas de IndexedDB.
   Nunca borrar la base local para solucionar incompatibilidades.
   IDs de proyectos, diagramas y elementos deben mantenerse estables salvo copias explícitas.
   Un error de importación no puede sustituir ni corromper el proyecto abierto.
   Schema futuro/desconocido debe rechazarse sin modificar documentos.
   La validación de límites se aplica antes de aceptar cambios.
   La serialización de ida y vuelta debe conservar semántica y asociaciones.
   Las pruebas de regresión con backups congelados son obligatorias.
   Diseña la evolución a schema v3 SOLO si los nuevos campos lo justifican. Si es necesario, crea migraciones puras v1→v2→v3 y conserva lectura v1/v2. No cambies silenciosamente la semántica del formato v2.
   Estudia la representación adecuada de:
   Rotación.
   Grupos.
   Conectores con geometría avanzada.
   Estilo sketch y semillas deterministas.
   Imágenes locales, si se implementan.
   Referencias entre nodos y diagramas hijos.
   Decide si los grupos serán entidades explícitas o asociaciones por IDs, justificando simplicidad, serialización y operaciones sobre múltiples elementos.
   No añadir un framework genérico de comandos o DI. Mantén TypeScript puro para modelo, validadores y transformaciones.
   Antes de conectar la nueva UI, implementar tests sobre:
   Migración desde fixtures reales v1/v2.
   Rollback ante import inválido.
   IDs duplicados.
   Referencias inexistentes/ciclos.
   Relaciones de grupos inválidas.
   Undo/redo sobre cambios estructurales.
   Export/import con características nuevas.
   Autosave, errores de cuota y cambios concurrentes en pestañas.
   Eliminación de nodos con subdiagramas.
   Si existe la posibilidad de pérdida de datos, se considera P1 y se corrige antes de avanzar.
   H3 — MARQUEE / LASSO Y SELECCIÓN AVANZADA
   Implementar selección de varios elementos arrastrando un recuadro desde una zona libre del lienzo.
   Comportamiento:
   Select + drag sobre vacío dibuja un rectángulo de selección visible.
   Al soltar, selecciona las formas incluidas según una regla geométrica documentada.
   Shift añade o alterna elementos, con comportamiento coherente.
   Click en vacío deselecciona.
   Escape cancela el recuadro sin crear historial innecesario.
   No interferir con pan ni creación de formas.
   Selección precisa independientemente de zoom/pan.
   El rectángulo no forma parte del documento exportado.
   Compatible con selección por outline DOM.
   Selección de conectores e ink según reglas explícitas.
   Al mover varios elementos se conservan las posiciones relativas.
   Añadir una selección por trazo libre solamente si resulta viable sin comprometer la implementación principal; la selección rectangular fiable es obligatoria.
   Atajos y visualización:
   Ctrl/Cmd+A selecciona elementos del diagrama actual.
   Shift mantiene su semántica.
   Delete elimina la selección respetando las reglas de subdiagramas.
   Handles y bounding box de selección múltiple.
   Controles contextualizados según el conjunto seleccionado.
   Probar selección cruzando distintos cuadrantes, zoom extremo, elementos parcialmente solapados, conectores, grupo y Canvas de tamaño móvil.
   H4 — AGRUPAR, DESAGRUPAR Y ALINEAR
   Implementar una experiencia de agrupación comparable a una pizarra moderna.
   Requisitos:
   Seleccionar varias figuras y agruparlas.
   Desagrupar.
   Mover un grupo como una unidad.
   Redimensionar el grupo sin romper geometría de sus miembros.
   Duplicar grupo con IDs nuevos.
   Borrar grupo sin dejar referencias corruptas.
   Reordenar capas respetando el grupo.
   Undo/redo de todas estas acciones.
   Import/export y autosave conservan grupos.
   Etiquetas y estilos individuales permanecen intactos.
   Los conectores internos remapean sus extremos cuando se duplica el grupo.
   Los conectores externos conservan referencias válidas y comportamiento documentado.
   Agrupar/desagrupar no elimina diagramas hijos.
   Atajos estándar cuando sea razonable: Ctrl/Cmd+G para agrupar; Ctrl/Cmd+Shift+G para desagrupar.
   Añadir alineación útil: izquierda, centro, derecha, arriba, medio, abajo y distribución horizontal/vertical, si encaja sin crear una interfaz recargada.
   Evitar grupos anidados complejos en la primera iteración salvo que el modelo los soporte correctamente y estén cubiertos por pruebas. Priorizar grupos simples y fiables sobre un árbol de agrupaciones frágil.
   Las transformaciones deben conservar la integridad de anchors y childDiagramId.
   H5 — ESTÉTICA SKETCH, FORMAS Y EXPERIENCIA DE DIBUJO
   El estilo actual tiene una aproximación sketch muy limitada.
   Objetivo: acercarlo considerablemente a una sensación Excalidraw sin copiar su marca ni activos.
   Evaluar técnicamente Rough.js frente a implementación propia. Tomar la decisión después de comprobar:
   Compatibilidad con Konva/SvelteKit.
   Licencia.
   Peso de bundle.
   Rendimiento con cientos de elementos.
   Renderizado determinista.
   Exportación PNG coherente.
   Integración con hit-testing y transformaciones.
   Preferir Rough.js si mejora significativamente la calidad sin añadir complejidad innecesaria. No sustituir Konva como motor de interacción.
   Mejoras:
   Contornos con irregularidad controlada.
   Intensidad sketch configurable, incluida opción limpia.
   Semilla estable por elemento para evitar cambios entre renders.
   Líneas dibujadas a mano más naturales.
   Rellenos sólido, transparente y tramado cuando sea viable.
   Grosor y estilo de trazo consistentes.
   Colores de borde/relleno diferenciados y fáciles de cambiar.
   Mejor calidad de flechas y cabezas.
   Texto legible en ambos temas.
   Paleta rápida y estilos repetibles.
   La prioridad es calidad visual, no una explosión de opciones.
   Revisar la experiencia de lápiz:
   Captura fluida de puntos.
   Suavizado moderado.
   Límites de memoria.
   No crear miles de acciones de historial por un trazo.
   Trazos exportables y persistentes.
   Renderizar con resultados estables al cambiar zoom/tema.
   La estética debe poder mezclar diagramas limpios de arquitectura con anotaciones informales.
   No introducir ruido aleatorio por frame.
   H6 — ROTACIÓN Y CONEXIONES INTELIGENTES
   ROTACIÓN:
   Rotar rectángulos, elipses, rombos y otros elementos compatibles con handle visible.
   Rotación individual y de selección/grupo cuando el modelo lo admita.
   Geometría persistida con precisión suficiente.
   Undo/redo.
   Export JSON/PNG correcto.
   Hit-testing, selección, resize y bounding boxes coherentes con la rotación.
   No romper el texto ni cambiar involuntariamente el centro del elemento.
   CONECTORES:
   Mantener flechas/líneas rectas existentes.
   Añadir líneas curvas y conectores ortogonales/elbow cuando sean viables.
   Control de extremos de flechas.
   Estilos de punta: ninguna, final y ambas.
   Trazo continuo/discontinuo, color y grosor.
   Anchors ligados a figuras, incluidos elementos rotados.
   Al mover o redimensionar figuras, las conexiones siguen sus anchors.
   Al mover grupos, los enlaces internos mantienen su relación.
   Al duplicar/borrar, ningún anchor queda inválido.
   Poder crear flechas libres sin seleccionar previamente nodos.
   Control points fáciles de editar.
   No introducir un algoritmo de auto-routing CAD pesado.
   Si una conexión no puede mantener su geometría con una operación, mostrar una limitación explícita o aplicar un fallback determinista. Nunca dejar referencias silenciosamente corruptas.
   H7 — DIAGRAMAS HIJOS Y DUPLICACIÓN SEMÁNTICA
   La jerarquía es el diferenciador fundamental de DevBench.
   Conservar:
   Crear diagrama hijo desde una figura.
   Entrar directamente.
   Entrar mediante zoom animado.
   Breadcrumb.
   Cámara propia por nivel.
   Huérfanos recuperables.
   Detección de ciclos.
   Escape/reduced-motion.
   Autosave/import/export de toda la estructura.
   MEJORA OBLIGATORIA: duplicación de figuras con hijos.
   Actualmente copiar una figura puede conservar la referencia al mismo subdiagrama. Eso puede resultar sorprendente.
   Definir dos acciones claramente diferenciadas:
   Duplicar figura reutilizando el MISMO subdiagrama (referencia compartida).
   Duplicar figura y crear una COPIA INDEPENDIENTE de su subárbol.
   Elegir una opción predeterminada segura y mostrar la diferencia al usuario cuando proceda. Una referencia compartida debe estar claramente identificada y no presentarse como copia independiente.
   La copia profunda debe:
   Crear IDs nuevos para diagramas y elementos copiados.
   Preservar nombres, posiciones, estilos, tinta y cámaras.
   Remapear conexiones internas.
   Remapear enlaces entre niveles.
   Gestionar referencias compartidas sin duplicar varias veces el mismo origen.
   Rechazar ciclos y superar validación.
   Respetar límites de tamaño.
   Ser una transacción de undo/redo.
   Guardarse y recuperarse correctamente.
   Agrupar, rotar o mover figuras que poseen hijos no debe afectar los datos internos del subdiagrama.
   Prueba de aceptación obligatoria: crear una arquitectura de tres niveles, duplicar una rama completa, editar el descendiente duplicado y comprobar que la arquitectura original permanece inalterada.
   H8 — IMÁGENES LOCALES Y USABILIDAD TÁCTIL
   IMÁGENES:
   Implementar inserción de imágenes locales de forma acotada si la arquitectura resultante permite hacerlo sin comprometer backups o persistencia. Es una funcionalidad deseada de Canvas 2.0, pero NO puede sacrificar la integridad de datos para incluirla.
   Soportar inicialmente raster PNG/JPEG/WebP.
   Requisitos:
   Archivo seleccionado explícitamente por usuario.
   Sin URLs externas ni fetch.
   Sin SVG sin sanitizar.
   Validación MIME/contenido/tamaño.
   Decodificación y límites de dimensiones/memoria.
   Resize y movimiento.
   Integración con selección, agrupación, capas y undo/redo.
   Export PNG.
   Backup JSON portable que incluya el recurso o manifiesto autocontenido equivalente.
   Import de backups viejos sin asumir imágenes.
   Gestionar quota exceeded e imágenes corruptas sin perder el proyecto.
   Evitar leaks de Object URLs y referencias de memoria.
   Mantener presupuesto razonable de proyecto y exportación.
   Si esta parte provoca un riesgo P1 no resuelto, documenta la razón y no publiques una versión que corrompa los proyectos. Terminar el resto de Canvas 2.0 tiene preferencia sobre una integración de imágenes insegura.
   TOUCH:
   Pan natural.
   Pinch-to-zoom centrado correctamente.
   Tap y selección.
   Gestos que no disparen accidentalmente creación o borrado.
   Controles principales accesibles en 390 px.
   Touch-action y pointer capture correctos.
   Stylus compatible en la medida que Pointer Events permita; presión avanzada no obligatoria.
   No bloquear el scroll exterior cuando el gesto no se ha iniciado dentro de Canvas.
   Los controles no deben depender de hover.
   Validar con emulación Chromium y documentar la diferencia con dispositivos físicos.
   H9 — UX POLISH Y PRODUCTO COMPLETO
   Revisar el flujo real de trabajo, no solo las herramientas aisladas.
   Escenarios obligatorios:
   Crear un proyecto vacío.
   Dibujar una arquitectura de API/backend/base de datos.
   Asignar colores y etiquetas visuales.
   Conectar nodos con varios estilos.
   Seleccionar varios nodos y agrupar.
   Duplicar/recolocar el grupo.
   Rotar elementos.
   Crear diagramas hijos.
   Navegar tres niveles.
   Duplicar independientemente un subárbol.
   Reorganizar y deshacer cambios.
   Recargar y recuperar exactamente el proyecto.
   Exportar/importar JSON.
   Exportar PNG.
   Usar la misma herramienta en móvil.
   Revisar específicamente:
   Overlays/toolbar sobre contenido.
   Selección poco visible.
   Handles demasiado pequeños.
   Atajos que secuestran inputs.
   Doble submit.
   Estados loading/saving/error.
   Truncados y overflow.
   Foco tras diálogos.
   Zoom/pan mientras se selecciona.
   Control de capas.
   Acciones no disponibles según contexto.
   Cambio claro/oscuro.
   Mensajes de error comprensibles.
   Teclado y reduced-motion.
   Contraste.
   Documento vacío.
   Documentos grandes.
   Cambio entre proyectos y pestañas concurrentes.
   Priorizar accesibilidad real con labels, roles, outline DOM y foco visible. No declarar certificación WCAG sin haberla verificado.
   No rediseñar globalmente DevBench. La página Canvas debe conservar coherencia con el shell y favorecer el lienzo.
3. PRESUPUESTOS DE RENDIMIENTO
   No optimizar prematuramente, pero tampoco ignorar los límites de Konva.
   Analizar qué provoca rerenders:
   Cambios de selección.
   Drag.
   Zoom.
   Dibujo libre.
   Transformación de grupos.
   Conexiones ancladas.
   Cargas de imágenes.
   Autosave.
   Historial.
   Evitar serializar documentos completos en cada mousemove o puntero.
   Una acción continua debe constituir una transacción de historial, no cientos.
   Reutilizar estructuras y cachés solo donde aporten beneficio medible. Limpiar recursos al desmontar componentes. Evitar stores globales de payloads.
   Medir escenarios representativos:
   Diagrama pequeño: 20 figuras.
   Mediano: 100 figuras y 80 conexiones.
   Grande dentro de límites soportados: 300 figuras, 200 conexiones y trazos.
   Proyecto multinivel con varios diagramas y grupos.
   Al menos una escena con rotación y curvas.
   Registrar tiempos de carga/import, drag, zoom y guardado, distinguiendo mediciones de interacción automatizada de FPS real.
   No inventar resultados ni presentar tiempos de driver como métricas puras de render.
4. PRIVACIDAD Y SEGURIDAD
   DevBench mantiene su principio browser-only.
   Excepción existente: Architecture Canvas persiste sus propios proyectos en IndexedDB; el resto de herramientas no tiene autorización para persistir payloads.
   Obligatorio:
   Ningún documento Canvas en URLs, logs, telemetría o requests.
   No incorporar imágenes remotas.
   No guardar payloads Canvas en localStorage/sessionStorage.
   No permitir HTML/script ejecutable desde etiquetas/imports.
   No confundir archivos locales con recursos públicos.
   No eliminar información silenciosamente por cambios de schema.
   No introducir dependencias de red para dibujar.
   Exportación e importación con límites explícitos.
   Redacción de errores sin volcar contenido del documento.
   Datos de Canvas separados de los workspaces anteriores.
   Conservar garantías de privacidad de OpenAPI.
   No usar autenticación ni servicios externos.
   Probar explícitamente con marcadores sintéticos que datos no salen por rutas inesperadas.
5. PRUEBAS POR RIESGO
   No ejecutar cientos de pruebas redundantes por cambios puramente visuales. Emplear pruebas selectivas en cada hito.
   Pruebas rigurosas obligatorias para:
   Migraciones.
   Compatibilidad de backup.
   Persistencia.
   Autosave concurrente.
   Undo/redo.
   Duplicación profunda.
   Relaciones de grupos.
   Referencias/anchors.
   Importación hostil.
   Images/data encoding si se implementan.
   Eliminación y recuperación de huérfanos.
   Límites de tamaño.
   Playwright para:
   Marquee/selección múltiple.
   Agrupar/desagrupar.
   Movimiento, resize, rotación.
   Flechas/conectores.
   Colores/sketch/texto.
   Tres niveles desde proyecto nuevo.
   Duplicación independiente.
   Import/export reales y reload.
   Touch básico.
   Privacidad.
   Errores y recuperación.
   Integración con catálogo.
   Regresiones selectivas del OpenAPI Explorer y HTTP Request Builder.
   Al finalizar, ejecutar instalación limpia, check, lint, unitarios, build y suite Playwright completa. Esperar CI exacta del commit publicado antes de declararla verde.
   Si un fallo solo afecta polish menor, clasificar P2 y continuar. Si afecta datos, integridad, seguridad o funcionalidades centrales, P0/P1 y corregir.
6. ENTREGABLES Y EVIDENCIA
   Hitos:
   H0: OpenAPI V1.5 integrado y validado en main.
   H1: dirección visual, evaluación UX y arquitectura V2.0.
   H2: modelo/evolución de schema/backups.
   H3: marquee y selección.
   H4: grupos y alineación.
   H5: estética sketch y dibujo.
   H6: rotación y conectores.
   H7: jerarquía y duplicación profunda.
   H8: imágenes locales/touch.
   H9: polish, regresiones, release y aceptación.
   Organiza commits según unidades funcionales coherentes. No necesitas un commit por microcambio, pero sí checkpoints suficientes para reanudar y revertir.
   Cada checkpoint:
   Actualizar GOAL_PROGRESS_V20.md.
   Registrar alcance real y pruebas ejecutadas.
   Registrar hallazgos y límites.
   Commit.
   Push a la rama remota correspondiente.
   Comprobar CI en puntos de integración importantes.
   Continuar automáticamente con el siguiente hito.
   Documentos finales:
   V20_ARCHITECTURE_CANVAS_GOAL.md
   GOAL_PROGRESS_V20.md
   docs/ARCHITECTURE_CANVAS_V20.md
   DESIGN.md actualizado si hay nuevos tokens o decisiones de componentes.
   FEATURES.md y ROADMAP.md actualizados.
   README/VALIDATION actualizados solo en las secciones pertinentes.
   Capturas reales:
   Desktop 1440 claro/oscuro.
   Tablet 768 claro/oscuro.
   Móvil 390 claro/oscuro.
   Canvas con colores, sketch y flechas.
   Agrupación/selección múltiple.
   Rotación y conexiones.
   Diagrama hijo nivel 2.
   Diagrama hijo nivel 3.
   Duplicación independiente de subárbol.
   Imagen local si se implementa.
   Estados de error relevantes.
   Todas deben provenir de la app funcional en Chromium, no de mockups o referencias.
   Crear una matriz de aceptación con requisito → implementación → evidencia → resultado.
7. LÍMITES DEL GOAL
   Fuera de alcance obligatorio:
   Colaboración multiusuario.
   Backend y sincronización cloud.
   Autenticación.
   CRDT.
   Zoom semántico continuo/infinito.
   Importar/exportar formato nativo .excalidraw.
   Routing CAD complejo.
   IA generativa.
   Editor completo de Excalidraw React.
   Lienzo ilimitado sin presupuestos.
   Certificación WCAG ficticia.
   Rediseño de todo DevBench.
   No añadir funciones aleatorias para gastar tokens.
   Se permite dedicar tiempo real a diseño, evaluación técnica, refactorización local justificada, implementación, tests de riesgo y revisión visual iterativa.
   Los P2 no bloquean entrega. Los fixes pequeños pueden integrarse en el siguiente checkpoint.
8. CONDICIONES EXACTAS DE CIERRE
   El Goal solo se considera completo cuando:
   A. OpenAPI V1.5 está en main, con 28 herramientas y CI validada.
   B. Architecture Canvas 2.0 funciona en feature/architecture-canvas-v20, preservando las 28 entradas anteriores.
   C. Los proyectos y backups antiguos v1/v2 continúan siendo importables sin pérdida de datos.
   D. La pizarra incluye selección rectangular, grupos, estilo sketch mejorado, rotación y conexiones mejoradas.
   E. La navegación jerárquica sigue intacta y existe duplicación explícita de subdiagramas independientes.
   F. La persistencia, historial e import/export funcionan con las nuevas estructuras.
   G. Los tests críticos y la CI final pasan.
   H. Las capturas reales muestran una evolución visual convincente hacia una experiencia Excalidraw-like.
   I. Se documentan decisiones y P2 pendientes. Las imágenes locales y gestos avanzados deben declararse implementados, parcialmente soportados o pendientes con evidencia; no ocultar alcance incumplido.
   J. Todo el código está commiteado y subido. Sin archivos de trabajo olvidados ni cambios pendientes.
   K. El commit final tiene SHA identificado y CI verificada.
   L. NO se fusiona Canvas 2.0 a main sin revisión humana posterior.
   La preview Cloudflare debe publicarse si el pipeline habitual lo permite. Si la comprobación HTTPS remota vuelve a dar ERR_CERT_AUTHORITY_INVALID, registrar el bloqueo exacto, no desactivar TLS y no afirmar que la prueba pública pasó.
9. INFORME FINAL DE CODEX
   Entrega una respuesta breve pero precisa:
   SHA de integración OpenAPI en main.
   SHA final Canvas 2.0.
   Estado de ramas y push.
   Funcionalidades nuevas realmente implementadas.
   Decisiones relevantes: Rough.js/renderer, grupos, rotación, imágenes y schema.
   Evidencia de compatibilidad v1/v2 y persistencia.
   Tests unitarios/Playwright y CI.
   Capturas y rutas del informe.
   Estado de preview/HTTPS.
   P0/P1 abiertos y P2 documentados.
   Recomendación GO/NO-GO para revisar la RC.
   No declares GO si una característica central está incompleta o existe riesgo de pérdida de datos.
   RECUERDA: estamos construyendo una herramienta de portfolio seria y útil, no simplemente acumulando funciones. Queremos que Architecture Canvas 2.0 se sienta como una auténtica pizarra visual para diseñar sistemas, con una capacidad de navegación jerárquica que la diferencie claramente de otras herramientas.
   EMPIEZA AHORA: lee el prompt completo, persístelo en Markdown, inspecciona el repositorio, planifica los hitos y EJECÚTALOS hasta terminar.

## Desarrollo del plan aprobado: decisiones ejecutables

### Puertas Git y recuperación

La inspección previa al trabajo confirmó main 666dc732 y RC c51c73b, sin modificaciones locales, con main como ancestro de la RC y CI 40237359833 completed/success. Crear integration/openapi-v15 desde main y guardar este archivo y progreso antes de incorporar producto. Los dos archivos nuevos no existen en la RC, por lo que pueden mantenerse sin commit durante el fast-forward y commitearse inmediatamente después; así se conserva la topología autorizada sin provocar un merge artificial. Actualizar AGENTS para expresar la nueva autorización H0, que supera exclusivamente la antigua prohibición de integrar OpenAPI. Preservar commits de V1.5, no cherry-pick ni reimplementación. Verificar integración y main por SHA exacto antes de empezar Canvas 2.0.

Si main cambia en remoto durante la validación, inspeccionar topología: fast-forward cuando siga siendo posible; de otro modo merge preservando ambos historiales y repetir controles relevantes. Nunca force push. La rama de Canvas se crea solo después de superar CI de main. El catálogo conserva exactamente 28 herramientas; Canvas 2.0 evoluciona DRAW-01, no añade una entrada número 29 ni otro runtime. Las rutas existentes y el alias lab siguen funcionando con carga diferida/prerender.

Cada reanudación comienza leyendo ambos documentos, git status y el último checkpoint/CI real. Las secciones históricas no sustituyen el estado actual del encabezado. Un proceso de pruebas sin output no demuestra que esté parado: comprobar session/proceso antes de reiniciarlo. Los resultados se anotan solo después de terminar, con comandos y evidencia reales. No completar por cansancio ni presupuesto. Los errores de entorno se distinguen de fallos del producto.

### Modelo v3 independiente y compatibilidad

Los nuevos campos justifican schema v3. Mantener lectores históricos y migraciones puras, sin cambiar silenciosamente el significado de v2. Añadir rotación del elemento respecto a su centro, semilla sketch estable, geometría explícita de conector, grupos por IDs y recursos raster autocontenidos. Los IDs son opacos: conservar Unicode y enlaces válidos heredados, incluido texto con hijos y anchors a texto. Los nuevos generadores usan UUID; las migraciones no regeneran IDs. No usar formatos serializados Konva.

Congelar fixtures v1/v2 contra el código publicado antes de modificar lectores. La lectura legacy no se vuelve más restrictiva por introducir v3; comprobar especialmente extremos de geometría, puntos, tamaños y claves. Validar originales/migrados con comparaciones semánticas de cada figura, estilo, trazo, conexión, viewport y asociación. Los defaults v3 son rotación cero, sin grupos/recursos, conector recto, puntas derivadas del tipo antiguo y semilla derivada determinísticamente del ID. No reinterpretar coordenadas antiguas como centros: x/y siguen siendo el origen del rectángulo local sin rotación.

La base física devbench.canvas.v2 y object store projects se conservan. Abrir un documento no debe reescribir su JSON simplemente por migrarlo en memoria. En el primer guardado de una edición v3, conservar el JSON histórico original en un campo del mismo registro, dentro de la misma transacción CAS que compara revisión. No sobrescribir esa copia en guardados posteriores. Las revisiones siguen impidiendo que una pestaña vieja pise cambios ajenos o recree un proyecto borrado. Una importación explícita crea otro ID de proyecto, manteniendo los IDs internos. Un parse/decode fallido nunca sustituye el documento abierto. Proyectos desconocidos/corruptos quedan recuperables mediante descarga del JSON almacenado; no guardar un demo encima del registro ilegible.

El parser construye DTOs de campos permitidos desde unknown; rechaza referencias rotas, duplicados, ciclos y valores no finitos antes de aceptar. Grupos simples son entidades por diagrama con id y memberIds, mínimo dos miembros, sin anidamiento ni pertenencia múltiple. Los miembros son figuras/tinta/imágenes/conexiones del mismo diagrama. Al borrar miembros, disolver un grupo que quede con menos de dos, sin borrar hijos. Los recursos pertenecen al proyecto, no a un navegador global.

El historial registra una transacción por gesto y por acción estructural. Con imágenes, no structuredClone ni stringify de los bytes por cada mousemove: snapshots de estructura con recursos inmutables compartidos, y contabilidad del presupuesto de historial incluyendo undo y redo. Las transacciones prueban candidato y límites antes de publicarlo o programar autosave. El autosave mantiene debounce/serialización ordenada y reporta Saved solo después de completar la transacción. El presupuesto inicial v3 es 16 MiB por documento; los límites legacy no se reducen para forzar ese presupuesto y cualquier adaptación necesaria se demuestra con fixtures. PNG conserva 4.096 px/eje y 12 MP, con error explícito y JSON de respaldo cuando exceda.

### Geometría, selección y grupos

Separar funciones puras de geometría local/mundo, rotación, bounds, rutas de conectores y selección. El renderer y la UI deben usar esas mismas funciones para no divergir en hit-testing, handles, anchors y PNG. Bounds de figuras rotadas incluyen sus esquinas transformadas; curvas incluyen extremos geométricos; tinta usa puntos reales y grosor. La apariencia irregular no altera la geometría de interacción. El viewport no forma parte de transformaciones del documento.

Marquee selecciona unidades completamente contenidas en los límites geométricos del rectángulo, inclusivamente y en las cuatro direcciones. Grupos se seleccionan como unidad; mediante acción de editar miembros/outline se pueden seleccionar figuras individuales. Shift alterna frente a la selección inicial. Un click vacío limpia; Escape cancela sin historial; la selección se dibuja en capa no exportable. El umbral inicial separa click de arrastre y no interfiere con mano/creación. Los handles mantienen tamaño constante en píxeles de pantalla.

Mover grupos conserva relaciones; escalar selección múltiple/grupos será proporcional para evitar cizalla de figuras rotadas, manteniendo estilos y etiquetas individuales. Rotar se aplica alrededor del centro común, con snap de 15 grados al mantener Shift; resize individual opera en coordenadas locales. Reordenar capas mueve el bloque de miembros sin intercalarlo con otras unidades. Alineación usa bounds de las unidades seleccionadas; distribución requiere tres o más. Ctrl/Cmd+G agrupa y Ctrl/Cmd+Shift+G desagrupa; inputs/contenteditable no reciben atajos de Canvas. Borrar selección elimina conectores incidentes como ya hacía el editor, y undo restaura todo. Los subdiagramas permanecen como huérfanos recuperables.

Anchors conservan elementId y u/v locales normalizados; endpoint se obtiene mediante la transformación rotada. Añadir recta, curva cuadrática con control editable y elbow ortogonal con quiebre editable. Las puntas serán ninguna/final/ambas, independientes del estilo del trazo. Conectores libres se dibujan sin seleccionar nodos. Al transformar un conjunto, controles internos se transforman con él; extremos anclados a elementos externos permanecen en sus figuras. Elbow se recalcula ortogonalmente de forma determinista cuando una rotación impida mantener la misma ruta; anunciar la limitación, nunca fabricar referencias. No usar routing CAD.

### Renderer y experiencia visual

Mantener Konva/svelte-konva para interacción y adoptar Rough.js 4.6.6, MIT, fijada en lockfile. Su generador produce instrucciones/path deterministas reutilizables sin depender de React ni de un DOM remoto. Usar los paths dentro de Konva y geometría analítica para hit-testing. Comparar el contorno previo con las escenas nuevas y medir el incremento real del chunk comprimido; no presentar el tamaño npm instalado como descarga final. Fuentes primarias consultadas: https://github.com/rough-stuff/rough y https://konvajs.org/docs/shapes/Custom.html.

Ofrecer limpio, sketch suave e intenso; borde/relleno separados; transparente/sólido/hachure acotado; trazo continuo/discontinuo. La semilla se guarda y no depende del tema, zoom o frame. Cachear solo por geometría/estilo/semilla; selección, pan y zoom no regeneran paths. Acotar densidad de hachure en figuras grandes para evitar millones de segmentos. Texto usa fuentes locales existentes, no copia marca ni activos Excalidraw. El lápiz consume puntos coalescidos con muestreo/suavizado moderado y límites visibles; no crea historial por muestra.

El lienzo domina altura disponible, con cabecera compacta, proyecto/guardado y breadcrumb. En escritorio, toolbar flotante y propiedades/outline bajo demanda. En móvil, fila inferior de siete accesos: Select, Hand, Shapes, Arrow, Text, Pencil, More. Shapes agrupa variantes; More y panel inferior contienen acciones secundarias. Controles >=44 px, sin hover obligatorio. Los paneles no deben tapar permanentemente la superficie. Crear vuelve a Select salvo bloqueo explícito de herramienta. Mantener tokens teal del shell y colores de documento independientes. Ayuda breve y herramientas reconocibles, sin formularios permanentes ni animaciones decorativas.

### Jerarquía, copia independiente y recursos

El predeterminado seguro de duplicación será copia independiente; acción secundaria claramente nombrada reutiliza hijo compartido. Mostrar distintivo cuando un diagrama tiene varios padres. Deep clone usa mapas de IDs y recorre el DAG alcanzable una vez: cada origen se copia una vez aunque varias referencias lo alcancen. Remapear diagramas/elementos/conexiones/grupos y childDiagramId, conservar cámaras/estilos/tinta/nombres. Los recursos raster inmutables pueden compartirse dentro del mismo proyecto sin alterar independencia estructural. Hacer preflight de tamaño/IDs antes de publicar una única transacción undo/redo. Agrupar o rotar al padre nunca transforma el contenido de su hijo.

Imágenes inicialmente PNG/JPEG/WebP estáticas: selección local explícita; validar MIME, firma, bytes, dimensiones y decodificación real antes de cambiar estado. Presupuestos iniciales: 1 MiB por archivo, 4 MP por imagen, 4 MiB de archivos raster/8 MP decodificados por proyecto. Guardar recurso base64 autocontenido y referencias por ID, no URLs Blob ni enlaces remotos en el DTO. No SVG/GIF/animaciones. Bitmap solo del diagrama montado, con recursos liberados al salir. Importar JSON con imágenes exige validar/decodificar recursos antes de sustituir documento; una imagen corrupta o cuota insuficiente conserva el proyecto previo y permite rescate. La función solo se anuncia si pasa esta puerta; ante riesgo P1 irresuelto se omiten controles y se documenta alcance pendiente sin sacrificar el resto.

Touch usa pointer IDs y captura correcta. Segundo contacto cancela borrador sin commit e inicia pinch/pan centrado en el centro del gesto. Mano/botón central/Space permiten pan; trackpad desplaza y Ctrl/Cmd+rueda hace zoom. No capturar scroll exterior. Stylus usa Pointer Events/coalesced events; presión avanzada no necesaria. Probar emulación CDP de dedos, pinch y cancel, sin afirmar pruebas en dispositivos físicos.

### Matriz de aceptación y cierre

H0 requiere integración+main con 28 rutas y CI exacta; ningún código Canvas2 antes de aceptar. H1 documenta dirección y estados maestros con base Chromium real. H2 valida schema/migración/persistencia antes de UI. H3–H8 introducen capacidades en checkpoints probados. H9 audita los escenarios completos desde proyecto vacío hasta backup/reload, además de privacidad y regresiones OpenAPI/HTTP.

Unitarios prioritarios: fixtures congelados, rollback, campos hostiles, global IDs, grupos y relaciones, anchors rotados, deep copy DAG/ciclos/límites, historia transaccional, autosave ordenado/cuota/concurrencia, recursos corruptos y roundtrips. Browser: marquee cuatro direcciones/zoom/Shift/Escape/outline, grupos/alineación/resize/rotación/conectores, estilos/tinta, tres niveles creados manualmente, copia independiente con original inalterado, JSON/PNG descargados e importados realmente, guardado/reload, touch, errores/rescate y marcadores ausentes de tráfico/URLs/logs/storage fuera de IndexedDB Canvas.

Medir escenas 20 figuras, 100/80 conexiones, 300/200+tinta, multinivel/grupos y rotación/curvas. Registrar tiempos de import/carga, drag, zoom y guardado como wall-clock de interacciones automatizadas, no FPS/heap puros. Revisar imágenes reales en desktop/tablet/móvil y ambos temas. No acumular screenshots sin inspección ni tests DOM que no prueben operaciones.

Al cerrar: npm ci con Node 24.22.1 local sin tocar global; check/lint/test/build y Playwright completos; arreglar P0/P1, documentar P2 sin rondas artificiales. Informe final con matriz requisito/implementación/evidencia/resultado, comparativa visual, límites y GO/NO-GO. Publicación Cloudflare debe corresponder al SHA real; TLS nunca se ignora. Commit/push limpios, CI exacta correcta y Canvas2 sin merge a main son condiciones obligatorias. El informe y las capturas son evidencia del producto, no sustitutos de capacidades ausentes.

## Decisiones implementadas tras los checkpoints H1–H8

El formato elegido es schema3 con nuevos campos opcionales y defaults equivalentes a legacy; lector v1/v2 conserva límites anteriores y solo la migración pura cambia la versión. Base física IndexedDB y revision CAS permanecen. Abrir no guarda una reescritura; primer cambio guarda JSON original de manera atómica e inmutable, con recuperación raw/original. También se rechaza guardar sobre un schema futuro aun con revisión no incrementada. Grupos planos por IDs, pivote central y resize uniforme; semilla por elemento/ID con Rough.js4.6.6 MIT. Curvas cuadráticas y elbows ortogonales deterministas, sin CAD routing. Copia DAG independiente es predeterminada y linked es acción secundaria explícita.

Las imágenes locales se implementan, no se dejan implícitas: raster PNG/JPEG/WebP autocontenido en assets de schema3, firma/MIME/chunks/dimensiones/base64 canónico antes de reservar bitmap, preflight de decodificación antes de reemplazar proyectos, límites 1MiB y4MP por archivo /4MiB y8MP por proyecto, sin SVG/animación/URLs/fetch. Recursos inmutables compartidos por duplicados; caché solo por editor, limpieza al desmontar y ante timeout/cancelación/error. PNG exige recursos cargados; errores conservan documento/rescate. Touch incluye pan/pinch CDP; dispositivos físicos/presión siguen P2. Pruebas y evidencia exactas en GOAL_PROGRESS_V20.md y docs/ARCHITECTURE_CANVAS_V20.md; estos checkpoints no sustituyen la puerta final H9 ni autorizan merge de Canvas2 a main.

H9 conserva también la geometría visible de tinta legacy cuyo conjunto de puntos exceda su caja declarada y orienta cabezas mediante el segmento no degenerado más cercano. Tests específicos demostraron ambos casos; no se recortan datos ni se migran dimensiones implícitamente. La puerta limpia local fue ejecutada y el siguiente paso es CI del código final/documentación de aceptación; ver progreso para resultados exactos, sin atribuirlos a builds distintos.

El presupuesto de H5 incluye densidad de tramado adaptativa al tamaño de figura: la separación nunca baja de12unidades y aumenta con span/80. Una prueba de regresión con figura20000x20000 mantiene los paths bajo100000caracteres, evitando multiplicar una densidad fija sobre escenas grandes. No cambia DTOs ni requiere migración, no altera figuras normales. Esta guarda se valida antes de cerrar H9.

## Aceptación de implementación H0–H9

Código Canvas2 final9a4a02846c23fb45f6d352dbb701db1ecceb4364 aceptado por CI40259451245(348unitarios,47browser,2auditorías remotas históricas skipped), instalación limpia/check/lint/build y smoke real HTTPS con privacidad/recarga/unmount. Main de integraciónOpenAPI es c3cd929a5aea231991973abd5744def9d13cf740,28entradas. No merge Canvas2. Informe/matriz/capturas/P2 en docs/ARCHITECTURE_CANVAS_V20.md y progreso. El cierre documental no cambia implementación; SHA/CI del commit publicado final se verifican para entrega. Próximo paso de producto es revisión humana, no más funcionalidades.
