# V23 — Platform & Offline implementation contract

## Original user contract (complete, verbatim)

```text
/goal DEVBENCH V2.3 — PLATFORM & OFFLINE: PWA INSTALABLE, 30 HERRAMIENTAS OFFLINE, ACTUALIZACIONES SEGURAS Y HOSTING ALTERNATIVO

# MISIÓN

Convertir DevBench V2.2 estable en una Progressive Web App instalable, fiable y plenamente utilizable sin conexión, manteniendo su arquitectura local-first, las 30 herramientas existentes y la integridad absoluta de los proyectos Architecture Canvas.

Entregar una Release Candidate V2.3 funcional, con pruebas reales de desconexión, actualizaciones seguras, experiencia de instalación, preparación de Firebase Hosting como alternativa y documentación verificable.

NO ES UN GOAL DE PLANIFICACIÓN: debes INVESTIGAR, DISEÑAR, IMPLEMENTAR, PROBAR, REVISAR VISUALMENTE, CORREGIR Y PUBLICAR el resultado.

Trabaja autónomamente hasta completar el alcance o identificar un bloqueo real P0/P1. No solicites nuevos prompts para decisiones técnicas menores.

Dedica todo el razonamiento y las iteraciones que sean necesarios para construir una solución sólida. No generes trabajo artificial únicamente para consumir tokens.

====================================================
H0 — PERSISTENCIA DEL PROMPT Y CONTINUIDAD
====================================================

PRIMERA ACCIÓN OBLIGATORIA:

1. Lee íntegramente este prompt.
2. Si Codex transforma el texto pegado en un attachment `pasted-text-*.txt` u otro fichero, localízalo y lee su contenido COMPLETO.
3. Guarda el contrato íntegro en `V23_PLATFORM_OFFLINE_GOAL.md`.
4. Amplía ese documento hasta superar 18.000 caracteres sustantivos, incorporando decisiones arquitectónicas, diagramas de estados, estrategia de caché, hitos, dependencias, casos límite, aceptación, riesgos y pruebas.
5. Crea `GOAL_PROGRESS_V23.md`, registrando hitos, estado, pruebas, commits SHA, riesgos, hallazgos y siguiente acción concreta.
6. Ambos documentos deben permitir continuar tras compactaciones de contexto.
7. No finalices tras crearlos: continúa IMPLEMENTANDO el producto.
8. Si se compacta el contexto, vuelve a leer ambos Markdown, inspecciona el último commit, Git status y la CI y continúa desde el siguiente hito incompleto.

No dupliques trabajo ya verificado y no inventes resultados.

====================================================
1 — REPOSITORIO Y ESTADO CONFIRMADO
====================================================

Repositorio: Rhaizel02/devbench.

DevBench V2.2 ESTABLE ya está integrado, publicado y verificado en main.

SHA confirmado:
3b03a3ecd29d89f3dc423f57b70e48b49a904875

Situación actual:
- 30 herramientas disponibles en main.
- Architecture Canvas 2.1 estable.
- OpenAPI Contract Workbench.
- PostgreSQL EXPLAIN Analyzer.
- XML Toolkit.
- Pipeline Builder V2.
- Test Data Generator V2.
- Todas las herramientas anteriores.
- CI de main verde.
- Producción Cloudflare operativa y con HTTPS válido.
- Backups Canvas v1/v2/v3 compatibles.
- Sin P0/P1 abiertos conocidos.

IMPORTANTE: YA NO HAY QUE INTEGRAR V2.2.

ESTRATEGIA DE RAMAS:

1. Hacer fetch del remoto.
2. Confirmar HEAD actual de origin/main, estado de CI y working tree.
3. Crear `feature/platform-offline-v23` DESDE main actualizado.
4. Todos los desarrollos V2.3 irán a esta rama.
5. NO fusionar V2.3 en main.
6. NO modificar las antiguas ramas RC.
7. NO force push ni reescritura destructiva de historial.
8. Mantener la compatibilidad con los despliegues anteriores.

Si main ha avanzado, utilizar su HEAD real, comprobar los cambios y continuar sobre la versión estable actual, sin perder las 30 herramientas.

Antes de modificar código, inspeccionar:

- AGENTS.md.
- ARCHITECTURE.md.
- DESIGN.md.
- FEATURES.md.
- ROADMAP.md.
- VALIDATION.md.
- package.json.
- vite.config.ts.
- svelte.config.js/ts.
- Configuración de adapter-static.
- GitHub Actions.
- Configuración Cloudflare.
- src/lib/release.ts.
- Tool registry y rutas prerenderizadas.
- Lazy imports de herramientas.
- CodeMirror y mecanismos de carga diferida.
- Workers de OpenAPI, SQL, XML, Pipeline y Test Data.
- Persistencia IndexedDB, serializer, importación y backups de Canvas.
- Tests Playwright actuales.

STACK:

Svelte 5, SvelteKit 3, TypeScript strict, Vite, Tailwind 4, adapter-static, Cloudflare Pages y workers TypeScript.

No introducir React, backend, autenticación, sincronización remota, Firestore, telemetría, cuentas ni suscripciones.

OBJETIVO DE CATÁLOGO:
Conservar exactamente las 30 entradas existentes. Esta versión añade capacidades de plataforma, no nuevas herramientas.

====================================================
H1 — DECISIÓN ARQUITECTÓNICA DE PWA
====================================================

Investigar la solución más sencilla, mantenible y segura para hacer DevBench completamente offline.

Comparar:

A. Service worker nativo de SvelteKit.

B. Integración @vite-pwa/sveltekit con Workbox.

Consultar las documentaciones oficiales actuales, en particular:

https://svelte.dev/docs/kit/service-workers
https://vite-pwa-org.netlify.app/frameworks/sveltekit
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

Evaluar:

- Compatibilidad con las versiones reales instaladas.
- adapter-static y prerender.
- Manifest de builds.
- Precarga de rutas.
- Lazy-loaded chunks.
- Web Workers.
- Política de caché estricta.
- Versionado de recursos.
- Lifecycle y actualizaciones.
- Service worker waiting/active.
- Scope bajo Cloudflare y Firebase.
- Impacto en bundle.
- Tamaño de nuevas dependencias.
- Facilidad de testing.
- Soporte para rollback ante actualizaciones incompletas.

PREFERENCIA: service worker nativo de SvelteKit si resuelve bien el problema.

No introducir Workbox por inercia ni utilizar simultáneamente dos estrategias de service worker.

Documentar la decisión y sus trade-offs en:

`docs/PWA_ARCHITECTURE_V23.md`

Diseñar la arquitectura antes de implementar de forma masiva.

====================================================
H2 — PWA INSTALABLE Y MANIFEST
====================================================

Crear una PWA correctamente identificada:

- name: DevBench.
- short_name: DevBench.
- description: workbench local-first para desarrolladores.
- start_url y scope correctos.
- id de aplicación estable y coherente con el origen.
- display: standalone.
- theme_color y background_color consistentes.
- Iconos 192x192 y 512x512.
- Iconos maskable donde proceda.
- Favicon y recursos con MIME adecuados.
- Metadatos de tema y viewport.
- Diseño compatible con safe areas de móviles.

Crear iconos propios coherentes con la identidad visual de DevBench. No utilizar marcas ni assets de otras aplicaciones.

INSTALACIÓN:

Añadir una entrada discreta de instalación cuando el navegador realmente lo permita.

- Capturar correctamente beforeinstallprompt.
- No mostrar un botón que no pueda funcionar.
- Mostrar instrucciones alternativas si el navegador no admite el evento.
- Detectar modo standalone cuando sea viable.
- No molestar repetidamente al usuario con diálogos.
- No solicitar notificaciones ni permisos adicionales.
- No registrar dispositivos ni recopilar estadísticas.
- No añadir una pantalla de onboarding compleja.

Validar instalación en Chromium desktop y emulación móvil. Si no hay acceso a un Android físico, indicarlo explícitamente.

No afirmar instalación real en plataformas que solo hayan sido simuladas.

====================================================
H3 — SEGURIDAD Y MODELO DE CACHÉ
====================================================

ESTE HITO ES CRÍTICO.

DevBench procesa datos que pueden ser privados: JSON, XML, SQL, JWT, contratos OpenAPI, variables, cabeceras y diagramas.

El service worker NUNCA debe crear persistencia oculta de esos datos.

REGLA PRINCIPAL:

CACHE STORAGE SOLAMENTE PUEDE ALMACENAR RECURSOS ESTÁTICOS PROPIOS DE LA APLICACIÓN.

RECURSOS ADMITIDOS:

- HTML estático prerenderizado.
- JS y CSS compilados propios.
- Chunks de lazy imports.
- Workers empaquetados.
- Fuentes locales.
- Iconos.
- Manifest.
- Assets de aplicación conocidos.
- Página 404 estática y recursos expresamente autorizados.

PROHIBIDO CACHEAR:

- JSON o XML del usuario.
- SQL y planes proporcionados.
- JWT y cabeceras privadas.
- Variables de entorno.
- Contratos OpenAPI importados.
- Resultados de herramientas.
- Archivos importados por File API.
- Imágenes locales de proyectos Canvas.
- Backups de Canvas.
- Descargas generadas.
- Requests con información de usuario.
- Cualquier respuesta externa no incluida expresamente.
- API responses dinámicas.
- POST, PUT, PATCH o DELETE.
- URLs arbitrarias.
- Recursos de CDN no autorizados.
- Credenciales o datos del portapapeles.

No utilizar una estrategia runtime-cache genérica basada únicamente en "cualquier GET devuelve 200".

Implementar allowlist estricta a partir del build real y sus assets/rutas autorizados.

Considerar:
- Origin.
- Método HTTP.
- Path.
- Search parameters.
- Request destination.
- Redirecciones.
- Esquemas de URL.
- Vary.
- MIME esperado.
- Cabeceras de caché.
- Respuestas fallidas.

No transformar URLs arbitrarias en claves de caché conocidas mediante normalizaciones inseguras.

El service worker debe ignorar peticiones fuera de su ámbito permitido.

IMPORTANTE:
Los recursos estáticos y el código pueden vivir en Cache Storage. Los payloads de las herramientas deben seguir únicamente en memoria, excepto la persistencia IndexedDB que Canvas ya utiliza y que está expresamente autorizada.

No instalar mecanismos de logging de contenido.

No introducir storage de resultados para ofrecer "historial offline".

====================================================
H4 — PRECACHE Y COBERTURA COMPLETA DE LAS 30 HERRAMIENTAS
====================================================

OBJETIVO:

Tras abrir DevBench y completar su preparación offline, todas las herramientas deben poder abrirse y funcionar SIN INTERNET, incluso si el usuario no las había visitado previamente.

El precache debe incluir:

- Home.
- Catálogo.
- Rutas prerenderizadas.
- Workspaces.
- JS chunks.
- CSS.
- Web Workers.
- Tipografías.
- Manifest/iconos.
- Recursos compartidos necesarios.

La fuente de verdad será el manifiesto de build y el registro real de herramientas.

NO mantener manualmente 30 URLs duplicadas en una constante que pueda quedar desactualizada.

VALIDACIÓN:

Extraer los slugs de las herramientas disponibles y comprobar que sus rutas tienen cobertura offline.

Casos especialmente relevantes:

CANVAS:
- Konva y Rough.js.
- Editor.
- Historial.
- IndexedDB.
- Exportación PNG.
- Imágenes locales.
- Diagramas jerárquicos.

OPENAPI:
- JSON/YAML.
- Parser.
- Schemas.
- Contract Diff.
- HTTP preview.
- CodeMirror.
- Workers.

SQL:
- EXPLAIN JSON.
- Planes textuales admitidos.
- Árbol y comparaciones.
- Workers.

XML:
- Parser.
- XPath.
- Conversiones.
- Worker.

PIPELINE:
- Recetas.
- Transformaciones.
- XML/JSON.
- Worker.
- Cancelación.

TEST DATA:
- Schemas.
- Generación de datasets.
- Relaciones.
- Semillas.
- Worker.
- Exportaciones.

RESTO:
Verificar carga y operación representativa de las herramientas anteriores.

No declarar éxito porque la Home funcione offline.

No declarar éxito únicamente porque las rutas devuelvan HTML si después falla un import dinámico.

Medir el presupuesto real del precache: archivos y bytes.

Si un bundle es demasiado grande para una preparación fiable, optimizar o plantear una estrategia explícita de preparación offline, sin perder descubribilidad ni crear un sistema complejo.

La UX preferida es una única preparación sencilla y completa.

====================================================
H5 — ESTADOS Y EXPERIENCIA OFFLINE
====================================================

Definir estados distinguibles:

1. Online y aplicación funcionando.
2. Preparación offline pendiente.
3. Descargando recursos.
4. Preparación offline completada.
5. Sin conexión y preparada.
6. Sin conexión y preparación incompleta.
7. Error por espacio/cuota/cache.
8. Actualización disponible.
9. Actualización descargándose.
10. Actualización lista para aplicar.

No usar navigator.onLine como única garantía de conectividad ni como prueba de cache completa.

Diseñar UI discreta:

- Indicador de disponibilidad offline.
- Acción Prepare offline / Retry si hace falta.
- Progreso o estado comprensible.
- Error recuperable.
- Avisos de actualización poco intrusivos.
- Sin banners enormes.
- Sin modales repetidos.
- Sin bloquear la edición.

No afirmar "Ready offline" hasta comprobar correctamente la instalación/preparación.

El modo offline debe conservar:
- Navegación.
- Catálogo.
- Búsqueda y paleta.
- Favoritos y recientes.
- Cambio de tema.
- Copy/clipboard cuando lo permita el navegador.
- Importación local de archivos.
- Descarga de resultados.
- Workers.
- Canvas y sus proyectos locales.

Los errores offline deben distinguir falta de recursos, cuota y navegador incompatible cuando sea posible.

No presentar un error de red como fallo del documento del usuario.

====================================================
H6 — ACTUALIZACIONES SEGURAS
====================================================

OTRO HITO CRÍTICO.

El usuario puede estar trabajando durante mucho tiempo en:
- Canvas.
- JSON Studio.
- OpenAPI.
- SQL.
- XML.
- Pipeline.
- Test Data.

Una actualización de la aplicación no debe destruir su trabajo.

REQUISITOS:

1. Identidad de build estable y explícita.
2. Cachés versionadas/identificadas correctamente.
3. Chunks de una versión compatibles con su shell.
4. No servir mezclas incompatibles entre builds.
5. No forzar reload al instalar una versión nueva.
6. No activar un nuevo worker de manera que rompa clientes antiguos.
7. Gestionar cuidadosamente waiting, activating y controllerchange.
8. No usar skipWaiting/clients.claim indiscriminadamente.
9. Mantener recursos anteriores mientras existan clientes que puedan necesitarlos.
10. Limpiar solo cachés propias y únicamente cuando sea seguro.
11. Limitar el almacenamiento retenido sin borrar la versión que usan pestañas activas.
12. Si una instalación nueva falla, conservar la anterior.
13. No borrar IndexedDB ni datos privados.
14. Permitir aplazar actualizaciones.

UX DE ACTUALIZACIÓN:

Mostrar aviso:

"DevBench has an update ready."

Acciones:
- Update.
- Later.

Si existe una edición activa:
- No forzar cierre.
- No recargar sin intervención.
- Explicar que las herramientas efímeras pueden perder contenido al recargar.
- Canvas debe comprobar guardado pendiente antes de permitir una recarga voluntaria.
- Si Canvas no puede guardar, ofrecer rescate JSON y permitir cancelar.

No introducir persistencia general de inputs solo para facilitar actualizaciones.

ESTRATEGIA DE DOS VERSIONES:

Preparar un test real con dos builds diferenciados:
- V1 ya instalada.
- V2 publicada localmente.

Verificar:
- V1 sigue utilizable mientras V2 espera.
- Los chunks que V1 necesita siguen disponibles.
- El usuario puede posponer.
- V2 no provoca reload automático.
- Al aceptar, la nueva versión se activa mediante un flujo explícito.
- SHA/versión visible coinciden.
- Canvas conserva sus proyectos.
- Si V2 falla a mitad de descarga, V1 continúa.

No usar un único test de mocks del ciclo de vida para declarar este escenario validado.

Documentar los límites reales del lifecycle del navegador.

====================================================
H7 — CANVAS COMPLETAMENTE OFFLINE
====================================================

Probar Architecture Canvas 2.1 desde una PWA realmente desconectada.

ESCENARIO COMPLETO:

1. Preparar offline.
2. Crear proyecto Canvas online.
3. Insertar figuras, texto y colores.
4. Crear grupos.
5. Curvar una flecha.
6. Crear diagrama hijo.
7. Navegar al nivel hijo.
8. Guardar en IndexedDB.
9. Desconectar totalmente el contexto de navegador.
10. Recargar la aplicación.
11. Abrir Canvas sin conexión.
12. Abrir proyecto existente.
13. Comprobar jerarquía, estilos, grupos y conectores.
14. Continuar editando.
15. Utilizar undo/redo.
16. Guardar offline.
17. Exportar JSON.
18. Exportar PNG.
19. Importar proyecto JSON.
20. Insertar imagen raster local.
21. Recargar nuevamente offline.
22. Verificar persistencia.

COMPATIBILIDAD:

Probar fixtures congelados:
- schema v1.
- schema v2.
- schema v3.
- Proyecto con imágenes.
- Proyecto con agrupaciones.
- Proyecto multinivel.
- Proyecto con subdiagramas compartidos/duplicados.

Ninguna actualización de caché puede provocar modificaciones o migraciones destructivas.

No cambiar el schema de Canvas para implementar PWA.

No modificar la semántica del serializador.

Verificar CAS y conflictos multi-pestaña.

Verificar que una actualización de aplicación no elimina proyectos ni copias originales.

IMPORTANTE:
El almacenamiento del navegador pertenece al origen. No prometer sincronización entre dominios, dispositivos o instalaciones.

====================================================
H8 — HERRAMIENTAS EFÍMERAS OFFLINE
====================================================

Validar flujos funcionales reales sin red:

JSON Studio:
Formatear y minificar.

JSON Diff:
Comparar dos documentos.

JSON/YAML:
Convertir en ambas direcciones.

OpenAPI:
Importar contrato desde archivo local, navegar schemas, generar preview HTTP y realizar diff.

SQL EXPLAIN:
Importar plan y analizar nodos, tiempos y comparación.

XML:
Procesar SOAP con namespaces, evaluar XPath y convertir XML↔JSON.

Pipeline:
Importar receta, procesar entrada y descargar resultado.

Test Data:
Generar colecciones relacionadas y exportar JSON/CSV.

JWT:
Inspeccionar token sintético local.

Regex/cron/texto y demás herramientas:
Verificar operaciones representativas.

HANDOFFS:
Comprobar que las transferencias en memoria siguen funcionando offline.

WORKERS:
No mockear los workers durante las pruebas principales. Deben cargar y ejecutar el código real sin red.

PRIVACIDAD:
Inspeccionar Storage, Cache Storage, URLs, History, requests y logs con marcadores sintéticos.

No guardar resultados en Cache Storage.

No guardar payloads efímeros en IndexedDB.

No introducir localStorage/sessionStorage nuevos para datos privados.

Al recargar o abandonar herramientas, mantener la semántica actual de limpieza de contenido.

====================================================
H9 — PWA DESKTOP Y MÓVIL
====================================================

Revisar experiencia en modo standalone.

Desktop:
- Navegación.
- Sidebar.
- Altura útil.
- Barra de título del sistema.
- Edición.
- Descargas.
- Atajos de teclado.
- Focus mode de Canvas.
- Cambio entre herramientas.

Móvil:
- Safe areas.
- Botones táctiles.
- Scroll.
- Teclado.
- Barra inferior.
- Formularios.
- Focus mode.
- Diálogos.
- Cambios de orientación.
- Descarga/importación.
- Mensajes de actualización.

Validar tamaños:
- 390 px.
- 768 px.
- 1440 px.

Validar dark/light.

No rediseñar globalmente DevBench.

Corregir problemas concretos derivados de la instalación y de la experiencia sin conexión.

No añadir controles decorativos que resten espacio a las herramientas.

Si el runner no permite instalar realmente como PWA nativa, documentar qué se ha validado con browser emulation y qué queda para comprobación manual.

====================================================
H10 — FIREBASE HOSTING COMO ALTERNATIVA
====================================================

Preparar un segundo alojamiento estático independiente de Cloudflare.

IMPORTANTE:
Firebase Hosting es OPCIONAL y NO debe bloquear el Goal.

El usuario no ha creado necesariamente un proyecto Firebase ni proporcionado credenciales.

No pedir claves para continuar el resto del desarrollo.

Consultar documentación oficial actual:
https://firebase.google.com/docs/hosting
https://firebase.google.com/docs/hosting/github-integration

OBJETIVO:

Permitir publicar el build de DevBench en Firebase Hosting manteniendo las mismas herramientas y comportamiento PWA.

Implementar:
- Configuración firebase.json válida.
- Directorio correcto de adapter-static.
- Deep links a rutas prerenderizadas.
- 404 real.
- Cache-Control correcto.
- JS/CSS hashed immutable donde corresponda.
- HTML revalidable.
- Service worker actualizable.
- Manifest con MIME adecuado.
- Scope independiente y correcto.
- Documentación de deployment.
- Preparación de GitHub Actions si es razonable.

SEGURIDAD:

- No añadir secretos al repositorio.
- No generar claves privadas ficticias.
- No crear una cuenta Firebase automáticamente.
- No activar Analytics, Auth o Firestore.
- No sustituir Cloudflare.
- No modificar DNS reales.
- No introducir servidores dinámicos.
- Preferir autenticación con credenciales de corta duración/identidad federada cuando sea viable.

Si faltan credenciales:
- Preparar archivos.
- Validar configuración.
- Documentar pasos manuales concretos.
- Marcar Firebase como pendiente.
- Continuar.

No declarar publicado Firebase si no se ha desplegado realmente.

BLOQUEOS CLOUDFLARE:

El hosting alternativo pretende reducir dependencia de una infraestructura, NO garantizar inmunidad frente a bloqueos regionales.

PROYECTOS CANVAS:

Cada dominio tendrá su propio IndexedDB.

Documentar export/import JSON entre Cloudflare y Firebase.

No sincronizar automáticamente proyectos entre orígenes.

No intentar acceder desde un origen al IndexedDB de otro.

====================================================
H11 — GESTIÓN SEGURA DEL ALMACENAMIENTO
====================================================

Registrar el tamaño del precache y sus versiones.

Medir:
- Número de assets.
- Tamaño total.
- Bundle inicial.
- Chunks lazy.
- Workers.
- Fuentes.
- Tamaño incremental respecto a V2.2.
- Tiempo observado de preparación.
- Latencia de navegación offline.
- Almacenamiento después de actualizar.

Las cifras deben proceder de medidas reales, no estimaciones inventadas.

LIMPIEZA:

La PWA debe poder eliminar únicamente sus cachés propios cuando sea apropiado.

Usar namespaces de caché claros.

Nunca hacer limpieza indiscriminada de todas las caches del origen.

Nunca usar indexedDB.deleteDatabase para mantener o actualizar la aplicación.

Si se añade una acción para limpiar recursos offline:
- Indicar exactamente qué elimina.
- Confirmar cuando corresponda.
- No mezclar con la eliminación de proyectos.
- Verificar que Canvas conserva sus datos.

Considerar fallo de cuota:
- Mensaje claro.
- Recuperación.
- No dejar estado "offline ready" falso.
- No romper una versión ya preparada por una actualización incompleta.

====================================================
H12 — TESTS REALES DE OFFLINE
====================================================

Implementar Playwright contra un build de producción servido localmente en contexto seguro.

No validar PWA exclusivamente mediante Vite dev server.

TEST A — INSTALACIÓN:

- Navegador limpio.
- Abrir DevBench.
- Registrar SW.
- Esperar instalación/activación.
- Verificar manifest.
- Verificar cache allowlist.
- Verificar estado Ready.

TEST B — OFFLINE:

- Preparar recursos online.
- Activar context.setOffline(true) u otro mecanismo real equivalente.
- Recargar Home.
- Navegar a herramienta no visitada.
- Ejecutar una transformación.
- Abrir otra herramienta.
- Descargar resultado.
- Recargar de nuevo.

No vale únicamente cambiar navigator.onLine.

TEST C — CATÁLOGO:

- Enumerar las 30 entradas disponibles.
- Navegar offline a todas.
- Verificar carga de sus workspaces y recursos.
- Identificar cualquier chunk faltante.

TEST D — WORKERS:

- OpenAPI.
- XML.
- SQL EXPLAIN.
- Pipeline.
- Test Data.

Comprobar ejecución real offline, no solo inicialización.

TEST E — CANVAS:

- Proyecto previo en IndexedDB.
- Desconexión.
- Edición.
- Guardado.
- Reload.
- Export JSON y PNG.
- Igualdad semántica después de recarga.

TEST F — PRIVACIDAD:

Introducir marcadores sintéticos en herramientas.

Inspeccionar:
- Cache Storage.
- IndexedDB no autorizado.
- LocalStorage.
- SessionStorage.
- URLs.
- Network requests.
- Console.
- History.

Confirmar ausencia de contenido en almacenamiento o canales no autorizados.

TEST G — ACTUALIZACIÓN:

Construir dos versiones de la app.

- V1 lista offline.
- Publicar V2.
- Mantener usuario en V1.
- Detectar nueva versión.
- Posponer.
- Seguir utilizando V1.
- Aplicar actualización voluntaria.
- Verificar V2, chunks y workers.
- Verificar Canvas intacto.

TEST H — FALLOS:

- Nueva instalación interrumpida.
- Caché incompleta.
- Cuota insuficiente, cuando pueda simularse fielmente.
- Recurso inexistente.
- Ruta 404.
- Múltiples pestañas.
- Desconexión durante actualización.
- Reintento posterior.

No utilizar waits arbitrarios cuando existan eventos comprobables.

No introducir retries globales para ocultar races.

Si una simulación no representa el comportamiento real del navegador, etiquetarla como tal.

====================================================
H13 — AUDITORÍA UX REAL
====================================================

Crear y revisar capturas desde Chromium:

- Home online.
- Home offline ready.
- Offline funcionando.
- Error offline.
- Update available.
- Update postponed.
- Canvas offline.
- OpenAPI offline.
- Pipeline offline.
- Test Data offline.
- Modo standalone.
- Desktop 1440 dark/light.
- Tablet 768 dark/light.
- Mobile 390 dark/light.

Comprobar:
- No overlays molestos.
- No scroll horizontal inesperado.
- Mensajes accesibles.
- Estado de red comprensible.
- Botones disabled coherentes.
- No banners ocultando toolbar.
- Focus mode de Canvas sigue utilizable.
- Actualización no interrumpe la edición.
- El usuario puede ignorar avisos no críticos.

No usar mockups o imágenes generadas como evidencia de software funcional.

Revisar capturas reales y corregir problemas evidentes.

====================================================
H14 — SEGURIDAD E INVARIANTES
====================================================

Garantías innegociables:

- Las 30 herramientas siguen disponibles.
- Los slugs anteriores no cambian.
- No hay regresiones de favoritos/recientes/paleta.
- Los handoffs siguen funcionando.
- No se filtran secretos.
- No se persisten payloads sin autorización.
- IndexedDB Canvas permanece.
- Import v1/v2/v3 funciona.
- No hay migraciones destructivas.
- Los backups originales se conservan.
- Los workers funcionan offline.
- Las actualizaciones no fuerzan recargas.
- Los builds anteriores siguen utilizables mientras resulte necesario.
- No hay caching indiscriminado de red.
- No se sustituye un 404 genuino por Home.
- La versión mostrada coincide con el build.
- No se añaden permisos innecesarios.
- No se introduce backend.

Clasificar P0/P1:
- Pérdida/corrupción de datos Canvas.
- Filtración de datos privados a cachés.
- Regresión grave de herramientas.
- Actualización que inutiliza a clientes activos.
- Borrado accidental de IndexedDB.
- Recursos fundamentales offline ausentes tras declarar Ready.
- Fallos graves de seguridad del service worker.
- Mezcla peligrosa de bundles entre versiones.

Corregir estos problemas antes de terminar.

P2:
- Navegadores poco habituales.
- Instalación física no comprobada.
- Mejoras menores visuales.
- Firebase pendiente de autorización.
- Optimización sin evidencia.
- Interacciones avanzadas no esenciales.

Los P2 no bloquean por defecto, pero no se deben ocultar.

====================================================
H15 — CHECKPOINTS, COMMITS Y CI
====================================================

Organizar el trabajo de manera eficiente en bloques grandes:

A. Arquitectura/contrato y baseline.
B. Manifest, SW y precache.
C. Offline completo y workers.
D. Actualizaciones seguras y compatibilidad Canvas.
E. UX de instalación/estado.
F. Firebase opcional.
G. Tests finales, visual QA y RC.

Cada checkpoint:
1. Ejecutar pruebas proporcionales.
2. Corregir P0/P1.
3. Actualizar GOAL_PROGRESS_V23.md.
4. Commit.
5. Push a origin/feature/platform-offline-v23.
6. Registrar SHA.
7. Continuar automáticamente.

No ejecutar toda la suite por cambios cosméticos.

Sí realizar pruebas profundas de SW lifecycle, cachés, privacy y backups.

Al cierre ejecutar:

npm ci
npm run check
npm run lint
npm run test
npm run build
npm run test:e2e

Añadir suite offline si se ejecuta separadamente.

CI del SHA FINAL debe estar verde.

No utilizar el éxito de commits anteriores para declarar aprobado un último commit no verificado.

No alterar los tests para convertir fallos reales en skips.

Mantener documentadas las dos auditorías remotas históricas omitidas si siguen en esa situación.

====================================================
H16 — DOCUMENTACIÓN
====================================================

Crear:

- V23_PLATFORM_OFFLINE_GOAL.md
- GOAL_PROGRESS_V23.md
- docs/PWA_ARCHITECTURE_V23.md
- docs/PWA_OFFLINE_ACCEPTANCE_V23.md
- docs/HOSTING_ALTERNATIVE_V23.md
- docs/DEVBENCH_V23_RELEASE.md

Actualizar secciones pertinentes de:

- README.md
- FEATURES.md
- ROADMAP.md
- VALIDATION.md
- ARCHITECTURE.md
- DESIGN.md, solo si corresponde.

Documentar claramente:

Cómo instalar DevBench.

Cómo preparar offline.

Qué herramientas funcionan offline.

Qué se almacena en caché.

Qué NO se almacena.

Cómo se actualiza.

Cómo posponer una actualización.

Qué ocurre con los inputs efímeros.

Cómo proteger backups de Canvas.

Qué sucede al borrar datos del navegador.

Qué ocurre al cambiar de dominio.

Cómo mantener Cloudflare.

Cómo preparar Firebase Hosting.

Qué credenciales faltan para publicarlo.

Cuáles son las limitaciones de cada navegador.

Diferenciar pruebas reales de emulación.

No afirmar que offline significa sincronización, backup automático o persistencia de todas las herramientas.

====================================================
H17 — PUBLICACIÓN Y ACEPTACIÓN
====================================================

Objetivo:
Release Candidate V2.3 publicada en:

feature/platform-offline-v23

NO fusionar en main.

CRITERIOS OBLIGATORIOS:

1. Base derivada de V2.2 estable.
2. 30 herramientas preservadas.
3. Manifest válido.
4. PWA instalable en entornos compatibles.
5. Service worker correcto.
6. Precache completo.
7. 30 rutas accesibles offline.
8. Workers funcionales sin red.
9. Operaciones reales offline.
10. IndexedDB Canvas intacto.
11. Backups v1/v2/v3 compatibles.
12. Sin payloads privados en Cache Storage.
13. Actualizaciones explícitas y seguras.
14. Sin reload automático que destruya trabajo.
15. Fallo de nueva instalación no rompe versión anterior.
16. Estados UX claros.
17. Responsive y temas correctos.
18. Medidas reales de tamaño de caché.
19. Firebase preparado si faltan credenciales.
20. Cloudflare sin regresiones.
21. Unit tests y Playwright correctos.
22. Tests específicos offline correctos.
23. CI exacta del SHA final verde.
24. Capturas reales e informes.
25. Sin P0/P1 abiertos.
26. P2 documentados.
27. Commit y push final.
28. Working tree limpio.
29. main permanece estable y sin cambios.
30. No hay nuevas dependencias de infraestructura innecesarias.

CLOUDFLARE:

Publicar preview de rama mediante pipeline habitual.

Verificar:
- URL real.
- HTTPS normal.
- Manifest.
- Service worker.
- Scope.
- SHA exacto.
- Estado offline.
- Workers.
- Canvas.
- Rutas profundas.
- 404.
- Console.
- Recursos fallidos.

No desactivar TLS mediante ignoreHTTPSErrors u otro bypass.

Si hay un bloqueo de certificado o proveedor de red, documentarlo como limitación externa, no afirmar una auditoría que no pasó.

FIREBASE:

El despliegue real es opcional. La configuración y documentación sí son parte del Goal.

No detener toda la ejecución por carecer de credenciales de Firebase.

====================================================
INFORME FINAL DE CODEX
====================================================

Responder con:

1. Rama y SHA final.
2. Base main exacta utilizada.
3. Arquitectura PWA elegida y justificación.
4. Instalación y manifest.
5. Cobertura de las 30 herramientas offline.
6. Resultados de workers offline.
7. Pruebas V1→V2 de actualización segura.
8. Integridad Canvas/IndexedDB/backups.
9. Privacidad de Cache Storage.
10. Tamaño medido de recursos.
11. Tests unitarios/Playwright/offline.
12. CI final exacta.
13. Preview Cloudflare.
14. Estado real de Firebase Hosting.
15. Capturas/informes.
16. P0/P1 y P2.
17. GO/NO-GO para revisión humana.

NO declarar capacidades que no hayas verificado.

====================================================
PRINCIPIO DE PRODUCTO
====================================================

DevBench es principalmente una herramienta PERSONAL para acelerar el trabajo de programación.

No buscamos monetización, cuentas de usuario ni funcionalidades sociales.

Buscamos velocidad, fiabilidad, privacidad, bajo coste y una experiencia de uso excelente.

La PWA debe permitir abrir DevBench desde Windows o Android como una aplicación, utilizar sus herramientas sin internet y actualizarse sin destruir el trabajo actual.

No compliques la arquitectura con sincronización, autenticación o servicios que no necesitamos.

El principal criterio de éxito no es la cantidad de funcionalidades, sino que DevBench continúe funcionando correctamente cuando la red desaparece.

EMPIEZA AHORA:

Lee el contrato completo, guárdalo en Markdown, confirma origin/main, crea feature/platform-offline-v23 desde la V2.2 estable y ejecuta H0–H17 hasta publicar la RC verificada.

```

## Implementation continuity — decisions to validate against the installed stack

### Scope and invariants

This execution starts from main 3b03a3ecd29d89f3dc423f57b70e48b49a904875. The release is V2.3 RC only, on feature/platform-offline-v23. Architecture Canvas remains version2.1 and schema3; physical IndexedDB, migrations, serialized backups, IDs and CAS semantics are not platform implementation details and must remain unchanged. There are exactly30 catalog entries. The only newly permitted persistence is a clearly named application-static Cache Storage namespace; ephemeral payloads are still forbidden in every persistent store. Canvas documents, images and immutable originals stay solely in their existing database and explicit local exports.

The first architectural gate compares native SvelteKit build/file/prerender metadata with Workbox integration. Prefer native if its exported generated manifest covers dynamic imports, emitted worker bundles, local fonts and static HTML routes reliably. Confirm installed versions and current documentation rather than copying the pedagogical sample, which may include broad runtime caching, unconditional skipWaiting or clients.claim unsuitable for long editing sessions. Do not combine registration systems. A small platform module and compact shell component are justified; a general cache framework, service container or plugin system is not.

### Resource inventory and cache admission

A build-derived immutable inventory, not a second handwritten catalog, defines all cacheable application URLs. Include prerendered Home, all30 tool routes, any existing lab alias, genuine static404, all client JS/CSS/worker chunks, local fonts, icons and manifest. Review SvelteKit navigation data/payload resources as well as visible HTML: offline client navigation must hydrate and load workers, not merely return an HTML status200. Enumerate generated outputs and compare tool registry slugs with coverage in tests. Exclude private local files, generated downloads and imported images even if their suffix matches an application extension. File/Blob/data URLs never become cache keys.

Admission checks the exact URL and origin, protocol, GET method, empty query, allowed destination, path and expected response content type. Query-bearing requests must not normalize into a clean cache key. Reject redirects, opaque/cross-origin responses, error statuses, unsafe Vary and responses incompatible with the expected asset. Avoid substring URL matching, extension-only authorization and cache-all-GET fallback. Any generated metadata file is itself application metadata and cannot contain user input. No imported document is serialized by a service worker message. Messages contain only validated operation names, build identity, client identity and progress/status numbers.

Preparation must be transactional: a candidate cache is not advertised as complete before every required resource was obtained and verified. Record a completion marker only after successful inventory verification. Failed partial preparation is retryable and cannot delete a usable active build. A progress numerator represents successfully cached inventory entries; bytes are measured from actual build files/response bodies. The cache budget must include complete tool code rather than allowing a silent maximum-file-size exception for large workers. Bounded parallel preparation may improve latency but cannot conceal partial failure or quota errors.

### Lifecycle state machine

UI states: unsupported; unprepared; preparing(completed,total); ready(build); offline-ready(build); offline-incomplete; recoverable-cache-error; update-checking/downloading; waiting-ready(build); update-deferred; applying-by-explicit-user-action. Online status is a connectivity hint, never proof of full cache availability. Ready is derived from the active worker's exact inventory/marker check. A page cannot infer readiness from an existing registration alone. Cache deletion/eviction after installation must become incomplete/recoverable rather than a false Ready claim. The user can keep editing while preparation or update checking proceeds.

Worker states: installing candidate -> candidate-complete -> waiting -> active. Candidate failure -> redundant/partial cleanup, with active build unchanged. No unconditional skipWaiting or clients.claim. Installation of the first version can become active according to browser lifecycle; obtaining its controller must not cause an automatic reload. An already-loaded page may prepare offline without being controlled, and readiness may explain when the next navigation is controlled. Explicit update can request activation only after user acknowledgement and Canvas readiness checks. controllerchange must never independently reload another tab.

Build affinity is essential when two versions coexist: an old shell cannot receive a new shell's lazy chunks or metadata. Keep caches required by live old clients. Do not delete an old cache just because a new worker activates. Define how each client identifies its build (message/handshake plus URL versioned resources), how navigation is assigned an app version and how hashed old chunks remain available. A new worker must be able to serve an active older client consistently from that client's retained version. Validate with an unvisited lazy workspace loaded after V2 is downloaded. If a safe affinity algorithm cannot be demonstrated, use a conservative activation rule that requires all affected tabs to acknowledge/close, clearly explaining that restriction instead of risking mixed bundles.

Retention cannot be blindly unlimited or blindly two caches. Retain active-client versions and a small idle rollback allowance; discard only unused caches in DevBench's own namespace. Never delete other applications' caches or any IndexedDB database. Consider a failed update while an older page is offline and a tab not yet responsive to messages. Prefer retaining a possibly used cache over a destructive guess. Browser eviction remains outside an application's guarantee and must be documented separately from programmatic cleanup. Explicitly test deleted entries and incomplete candidates.

### User work and voluntary updates

Update notice text is DevBench has an update ready. Update/Later is unobtrusive and keyboard accessible. A second explicit acknowledgement explains that ephemeral tool contents disappear on reload; no new general persistence is introduced to avoid that fact. Later preserves content and the old controlled version. Canvas must expose a minimal browser-local guard to the platform layer, preferably a context callback registered only while mounted. The guard checks existing autosave pending/error states, awaits the existing flush operation if available and uses existing rescue JSON on error. This must not alter serialization, CAS, database schema or document history. Cancellation keeps the editor mounted and editable. The guard carries no document through worker messages.

Multiple tabs are part of acceptance. One tab's Update action must not force another tab's reload or erase another tab's input. CAS protects Canvas documents independently of the app lifecycle. A deferred tab continues working on its original cached build. Switching or closing a tab permits safe cache reclamation only after the worker can establish that no remaining client uses it. No global broadcast containing documents. Do not treat visibility hidden as permission to erase or reload.

### Manifest, identity and installation UX

Use stable application identity scoped to the current origin, standalone display, root start URL/scope, DevBench branding, zinc background and teal accent. Icon artwork is local and original, derived from the existing terminal mark rather than external branding. Generate crisp raster192/512 and maskable variants with adequate safe padding; do not use screenshots as icons. MIME/headers must be correct on both static hosts. beforeinstallprompt is a capability event; only show an actionable install control after receiving a usable event, call prompt under a direct gesture and process userChoice honestly. Manual instructions remain available without implying that an unsupported event can be triggered. Standalone detection is best effort, distinct from physical installation evidence. No notification prompt or extra permission.

Safe-area insets must preserve toolbar, header, bottom actions and Canvas Focus controls on mobile. Installation/status belongs to a compact shell affordance with details on demand, not a persistent large banner or an extra tool entry. Apply existing dark/light tokens and44px mobile targets. UI must distinguish offline-incomplete from invalid user input, and an update notice cannot overlay the drawing toolbar or steal focus while the user types. Use short reduced-motion-compatible transitions only if useful.

### Hosting and operational boundaries

Cloudflare remains primary. A branch preview must publish through the existing pipeline, with normal TLS and exact SHA verified in a browser. Never alter production main, DNS or user accounts. Root service-worker scope, script cache revalidation, immutable hashed assets and revalidated HTML/manifest must work without SPA rewrites that turn missing routes into Home. Match Firebase's public directory to adapter-static build output. A Firebase configuration can be prepared and validated without a project ID, private key, deployed site or account creation. Do not invent credentials or claim deployment. Document short-lived/federated CI authentication and concrete manual commands; no unauthenticated automatic deployment workflow.

Each host/origin has separate caches, install identity and Canvas IndexedDB. Explicit JSON export/import transfers projects; no background sync, remote storage or cross-origin database access. An alternate host reduces infrastructure dependence but does not guarantee access in every region. Browser data clearing can delete both offline assets and Canvas documents; explicit backups remain necessary. Explain the difference between clearing just DevBench's static caches and clearing all browser site data.

### Verification design and dependency order

H0 persists the complete contract and progress. H1 researches and records the architecture before broad UI work. H2/H3/H4 form a coherent manifest/strict-precache checkpoint with pure policy tests plus one real production-build SW preparation test. H5/H6 add actual state/update integration and dual-build lifecycle tests. H7/H8 exercise Canvas and all ephemeral tools while context.setOffline(true), using real workers, local files, clipboard/download and existing fixtures/recipes. H9/H13 visually inspect actual Chromium1440/768/390 in both themes and distinguish standalone emulation from native installation. H10 prepares Firebase without blocking the other milestones. H11 records measured inventory/runtime/storage figures. H12/H14 consolidate risk tests and invariants. H15/H16/H17 finish documentation, clean install/full tests/build/CI, exact preview and clean branch publication.

Unit tests should target pure URL admission and response policy, cache names/version identity, inventory completeness and update state transitions. Browser tests must prove actual SW lifecycle and cache contents; mocks alone cannot validate quota, install failure or two-build behavior. Use a controlled static server able to switch complete build directories and intentionally fail one candidate resource, while never modifying main's product code. Generate distinguishable builds with explicit identities in test-only environment configuration, assert shell/worker SHA and retain an old client across the switch. Network transport can be interrupted by server controls/context offline; do not fake navigator.onLine as the sole test.

A reusable test setup may run existing representative operations under an offline preparation fixture, keeping default local tests online unless they explicitly opt in. This avoids multiplying decorative tests while demonstrating all30 workspaces and hard worker cases. Enumerate tools from the real registry. All private markers must be absent from cache keys AND bodies, requests, logs, URL/history, cookies and all non-Canvas storage; inspect actual Cache Storage entries and database stores, not merely DB names. Frozen schema1/2/3 fixtures, local raster resources, grouped/multilevel/shared-child copies and existing concurrent-save tests remain authoritative.

Measure build asset count/bytes, initial versus lazy/worker/font partitions, baseline V2.2 versus V2.3 increment, observed complete preparation latency, offline navigations and retained caches after an update. These are observations in the stated environment, not universal throughput/FPS promises. State honestly when quota failure is injected rather than an actual full device. Screenshots must come from the functioning app, including complete/incomplete/error/deferred-update states; never generate mock evidence or count a DOM-only render as a working offline tool.

### Closure and recovery

After interruption read this contract and GOAL_PROGRESS_V23.md, inspect git branch/status/HEAD and exact CI, then resume the next incomplete gate. Every coherent checkpoint records real tests, known limits and concrete next action, commits and pushes only feature/platform-offline-v23. No feature expansion to fill time. P0/P1 privacy, data integrity, false Ready, mixed builds or destructive update behavior blocks closure and is corrected. P2 physical-device/cross-browser/manual installation and undeployed Firebase are explicit, do not conceal core missing behavior and do not trigger unrelated polish rounds.

Final acceptance requires final commit's clean install/check/lint/units/build/full Playwright plus offline/lifecycle suite, exact green CI, real captures/reports, normal-TLS branch preview (or precise external block), all30 tools and no open P0/P1. Main and original RC refs must remain unchanged. Provide exact base/final SHA, cache measurements, implementation limits, realistic installation evidence and a GO/NO-GO for human RC review. A generated document alone is never completion.

### Verified implementation refinements for continuity

The full contract above remains unchanged. Native Kit3 implementation and the real-host gate established that Cloudflare redirects direct `.html` resource URLs. Keep the original host404.html, but precache an explicit directory-index copy under /offline-not-found/ and use /offline-unavailable/ for incomplete recovery. Native build asset declarations canonicalize directory indexes only; arbitrary requests are never normalized into cache keys. The finalizer rejects other non-index HTML precache entries. Redirect rejection and SHA256 verification remain strict. Browser fetch-decoded compressed bodies must have transport encoding/length headers removed before Response reconstruction. All download tasks settle before publishing a failure or completion marker, preventing late progress from misrepresenting a failed candidate.

Acceptance now includes28real disconnected flows, with explicit JSON/YAML roundtrip, a rich project saved online before disconnect/reload and manual three-level creation. Two real builds exercise both a failed static response and actual network disconnection after observable partial candidate download, plus retry/defer/explicit apply, old-tab lazy-worker operation and unrelated-cache retention. Cache quota uses Chromium's actual quota override; Canvas failure is an explicitly simulated put error and is not evidence of a physically full disk. Frozen schema1/2/3, local rasters, structured backups and CAS remain unchanged. No physical native install can be claimed: the runner has valid installability/manifest checks but lacks the PWA.install protocol command and did not offer a genuine install event. Read the current release/acceptance/progress files for exact checkpoint/public/CI identities. Final delivery CI and normal-TLS SHA checks are mandatory even after a prior checkpoint passed.
