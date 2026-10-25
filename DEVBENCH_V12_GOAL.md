# GOAL — DevBench V1.2: Backend & Connected Workbench

## 0. Misión

Repositorio: `https://github.com/Rhaizel02/devbench`

Evolucionar DevBench desde sus 18 herramientas funcionales V1/V1.1 hasta un **workbench local-first especializado en backend, APIs, datos y debugging**, con seis nuevas herramientas y una primera capa de transformaciones conectadas.

**Objetivo final: 24 herramientas individuales funcionales + 1 Pipeline Builder, integradas en la interfaz existente.**

Este es un Goal autónomo de varios hitos. Ejecuta trabajo real de principio a fin, no solo planificación. Continúa con el siguiente hito autorizado mientras quede alcance pendiente y el entorno permita trabajar.

No prolongues artificialmente la ejecución para consumir tokens. No repitas pruebas o auditorías sin motivo. Termina cuando se hayan cumplido los criterios de aceptación, todos los cambios estén publicados en GitHub y no existan P0/P1 conocidos.

### Estado inicial

- Las 18 herramientas existentes están terminadas.
- Svelte 5, SvelteKit 3, TypeScript strict, Vite, Tailwind 4 y `adapter-static`.
- Arquitectura sin backend, usuarios ni base de datos.
- Cloudflare Pages aloja la web estática.
- GitHub Actions y pruebas locales estaban correctos al cerrar V1.1.
- La dirección visual de `DESIGN.md` está aprobada y debe mantenerse.

**Inspecciona el HEAD real antes de trabajar.** No presupongas que el repositorio conserva exactamente el estado de la última documentación.

## 1. Reglas globales

Lee `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `FEATURES.md`, `ROADMAP.md`, `VALIDATION.md`, `GOAL_PROGRESS.md` y el Goal V1.1 anterior. No reescribas la historia de los hitos ya completados.

### Arquitectura

1. Mantener exactamente el stack y el despliegue estático actuales.
2. Motores de dominio en TypeScript puro; UI en componentes Svelte.
3. Preferir reutilizar componentes y motores existentes antes que duplicarlos.
4. Mantener imports dinámicos para las herramientas. No cargar todos los motores en Home.
5. Añadir bibliotecas especializadas únicamente cuando aporten valor real, comprobando mantenimiento, seguridad, tamaño y compatibilidad.
6. No introducir backend, proxy, endpoints, autenticación, DB, cloud functions, ejecución de código arbitrario ni APIs externas.
7. No implementar un framework genérico de plugins o automatización.

### Privacidad y seguridad — P0

Los datos introducidos por el usuario solo pueden existir temporalmente en memoria del navegador durante la operación.

Prohibido enviar o guardar payloads en red, URLs, historial, `localStorage`, `sessionStorage`, IndexedDB, cookies, cachés, telemetría, logs o singletons compartidos por SSR.

Solo pueden persistirse las preferencias inocuas ya permitidas.

No ejecutar nunca contenido pegado como JavaScript, shell, SQL, HTML o expresiones dinámicas. No utilizar `eval`, `new Function`, motores de templates con evaluación de código ni librerías que ejecuten expresiones JavaScript aportadas por usuarios.

No descargar automáticamente URLs, esquemas, referencias o recursos mencionados en un input.

Gestionar límites de tamaño, complejidad y tiempo donde sea necesario. Una operación costosa no debe dejar bloqueada permanentemente la interfaz.

### UX

- Conservar estética premium, minimalista, dark/light y responsive definida en `DESIGN.md`.
- No hacer un rediseño global.
- Todas las acciones visibles deben funcionar.
- Copy, Download, Reset, Example y estados de error deben ser honestos y coherentes.
- Nunca mostrar resultados anteriores como si fueran actuales después de editar inputs.
- Mantener navegación por teclado, Command Palette, favoritos, recientes, Quick Paste y deep links.
- Priorizar pocos clics, legibilidad y herramientas útiles en móvil.

### Calidad y rendimiento

- Tests exhaustivos en parsers, seguridad, datos delicados y transformaciones.
- Tests selectivos en UI; evitar snapshots y suites visuales redundantes.
- Ejecutar check/lint/test/build en checkpoints coherentes, no después de cada edición.
- No hacer refactorizaciones masivas ajenas al Goal.
- Corregir P0/P1; registrar P2 sin abrir iteraciones innecesarias.
- Documentar límites reales, no prometer conformidad total donde solo exista soporte parcial.

## 2. Continuación autónoma y checkpoints

Crear `DEVBENCH_V12_GOAL.md` con este contrato y `GOAL_PROGRESS_V12.md` con una tabla de hitos, estado, decisiones, resultados de pruebas, commits y próximo paso concreto.

Al iniciar o reanudar:

1. Comprobar `git status`, rama, remote y últimos commits.
2. Leer el progreso V1.2.
3. Contrastar el progreso registrado con código y tests reales.
4. Continuar desde el siguiente entregable incompleto, sin rehacer los ya verificados.

Al cerrar **cada hito**:

- Verificar su funcionalidad real.
- Ejecutar tests relevantes, `npm run check`, `npm run lint`, `npm run test` y `npm run build`.
- Ejecutar un smoke de navegador cuando el hito cambie flujos UI relevantes.
- Actualizar progreso y documentación afectada.
- Hacer commit coherente y `git push` al remoto configurado.
- Registrar SHA y verificar CI si está accesible.

Cada commit publicado debe mantener funcionales las herramientas anteriores: Cloudflare puede desplegar automáticamente `main`.

No hacer force-push, resets destructivos ni sobrescribir cambios ajenos. No modificar proyectos distintos ni instalar mecanismos nuevos para auto-reanudación.

Si falta una decisión menor, escoger la alternativa más simple y segura. Preguntar únicamente ante un bloqueo material, una autorización sensible o una acción potencialmente destructiva.

---

## HITO A — JSON Data Workbench

### A1. JSON Query Explorer — `DATA-05`

Crear una herramienta para consultar JSON mediante JSONPath.

**Funcionalidad:**
- Editor de JSON de entrada.
- Campo para expresión JSONPath.
- Ejecutar consulta bajo acción explícita.
- Mostrar resultados encontrados, cantidad y rutas normalizadas.
- Vista de valores individuales y salida JSON copiable/descargable.
- Ejemplos sintéticos: selección simple, arrays, wildcard y filtros.
- Errores comprensibles para JSON inválido o expresiones incorrectas.
- Diferenciar cero resultados de error.
- Copy de ruta JSONPath o JSON Pointer cuando sea válido.

**Contrato técnico:**
- Preferir semántica basada en RFC 9535.
- Soportar al menos acceso a propiedades, índices, wildcard, descendencia y filtros básicos de comparación de valores.
- No interpretar JavaScript en filtros ni permitir callbacks arbitrarios.
- Evaluar una biblioteca segura y mantenida; evitar evaluadores con antecedentes de ejecución dinámica sin revisar sus garantías.
- Si no hay una biblioteca adecuada, implementar un subconjunto explícito y correctamente documentado, no fingir compatibilidad completa.
- Limitar tamaño de JSON, profundidad, resultados y coste de evaluación.
- Usar Web Worker interrumpible si existe riesgo real de bloqueo.

**Tests críticos:** filtros numéricos, arrays, claves escapadas, nulos, ningún resultado, expresiones inválidas, inputs grandes y comportamiento ante consultas costosas.

### A2. JSON Schema Lab — `DATA-06`

Herramienta para validar documentos JSON y generar esquemas iniciales a partir de ejemplos.

**Dos modos:**

**Validate**
- Editor de JSON Schema.
- Editor de documento JSON.
- Validar contra JSON Schema Draft 2020-12.
- Mostrar `valid / invalid`, número de errores, ubicación del dato y explicación.
- Diferenciar esquema inválido, documento inválido y documento que no cumple el esquema.
- Ejemplos de objetos, arrays, campos required, tipos y restricciones.

**Infer Schema**
- Introducir uno o varios ejemplos JSON.
- Generar un esquema inicial editable y descargable.
- Inferir tipos y estructuras anidadas.
- Deducir opcionalidad de campos a partir de múltiples ejemplos.
- Tratar `null`, arrays vacíos y tipos inconsistentes explícitamente.
- Nunca inferir restricciones no justificadas, como emails, formatos o valores máximos, a partir de evidencia insuficiente.
- Explicar que el resultado es una inferencia, no un contrato de API garantizado.

**Seguridad:**
- Validación completamente local.
- Sin cargar referencias remotas mediante `$ref`.
- Soporte para referencias internas `#/$defs/...`, con límites de recursión/complejidad.
- Usar un validador compatible con el entorno sin evaluación dinámica de código aportado por usuarios; estudiar implementaciones interpretadas como `@cfworker/json-schema`.
- No convertir el editor en un sandbox de ejecución JavaScript.

Tests profundos de esquemas válidos/incorrectos, `$ref` internos, referencias externas rechazadas, objetos anidados, required, null, arrays, errores múltiples y límites.

**Aceptación A:** ambas herramientas operativas, sus rutas prerenderizadas y conectadas con Home, búsqueda, favoritos y paleta. Commit/push.

---

## HITO B — HTTP & API Workbench

### B1. HTTP Request Builder — `BACK-06`

Construir peticiones HTTP y generar código reproducible, sin ejecutarlas.

**Interfaz:**
- Método HTTP.
- URL editable.
- Query params con claves repetidas.
- Headers editables.
- Body de texto, JSON o vacío.
- Secciones claras y ordenadas con previews.

**Generación:**
- cURL POSIX.
- JavaScript `fetch`.
- Java `HttpClient`.
- Spring Boot `RestClient` para versiones compatibles.

Los ejemplos deben ser sintácticamente correctos y escapar adecuadamente comillas, barras, Unicode, saltos de línea y caracteres especiales según cada lenguaje.

No inventar imports, capacidades ni contratos. Incluir imports correctos o indicar claramente el fragmento generado.

**Integración:**
- Reutilizar el parser del actual cURL Inspector cuando sea razonable.
- Permitir importar comandos cURL dentro del subconjunto soportado.
- No ejecutar nunca peticiones.
- Preservar método, headers, body y query sin transformaciones silenciosas.
- Advertir sobre opciones de cURL no soportadas.

**Seguridad:**
- Headers de autorización, cookies, API keys y credenciales ocultos en los resultados generados por defecto.
- Revelar valores sensibles solo mediante acción explícita.
- Copiar código completo con secretos requiere una acción deliberada y claramente identificada.
- No registrar ni persistir valores.

Tests de escaping, headers repetidos, métodos, bodies, URLs, importación cURL, secretos y código generado.

### B2. HTTP Headers Inspector — `BACK-07`

Inspector local para pegar cabeceras HTTP y entender su comportamiento.

**Mínimos:**
- Parsear bloques de headers HTTP, incluyendo nombres case-insensitive y cabeceras repetidas.
- Explicar `Cache-Control`, `ETag`, `Last-Modified`, `Expires`, `Content-Type`, `Content-Encoding`, `Vary`, `CORS`, `CSP`, `HSTS` y atributos relevantes de `Set-Cookie`.
- Identificar configuraciones relevantes y posibles advertencias sin dar falsas garantías de seguridad.
- Vista Raw / Parsed con categorías.
- Posibilidad de analizar request headers y response headers.
- Ejemplos sintéticos.
- Ocultar por defecto valores sensibles como cookies y Authorization.

CORS depende del origen, método y contexto: no afirmar que una configuración funciona en cualquier navegador o situación.

CSP requiere parseo correcto de directivas, no checks superficiales que inventen vulnerabilidades.

Prohibido ejecutar requests o hacer fetch de dominios analizados.

Tests de repetición, claves case-insensitive, cabeceras malformadas, Cache-Control contradictorio, CSP, CORS y valores sensibles.

**Aceptación B:** ambas herramientas funcionales, motor HTTP reutilizado cuando sea posible, pruebas y commit/push.

---

## HITO C — Backend Diagnostics

### C1. Log & Stack Trace Inspector — `BACK-08`

Inspector para logs Java/Spring Boot y stack traces.

**Funcionalidad:**
- Pegar logs o excepciones Java.
- Detectar niveles TRACE/DEBUG/INFO/WARN/ERROR cuando exista formato reconocible.
- Identificar timestamp, hilo, logger y mensaje.
- Agrupar líneas multilínea pertenecientes a una entrada.
- Interpretar stack traces Java: excepción principal, frames, `Caused by`, `Suppressed`.
- Destacar posibles causas raíz con lenguaje prudente.
- Filtros por nivel, texto y, cuando exista, hilo o logger.
- Vista de log original y vista estructurada.
- Estadísticas verificables: entradas por nivel y recuento.
- Copiar información seleccionada; limpiar y ejemplos.

**Restricciones:**
- Soportar explícitamente formatos comunes de Java/Spring Boot, no todos los logs imaginables.
- Mostrar contenido desconocido como texto sin descartarlo.
- No pretender diagnosticar la causa funcional real solamente por leer una excepción.
- Limitar líneas/tamaño y evitar expresiones regulares costosas.
- No construir enlaces externos automáticos ni transmitir nombres de clases o rutas.

Tests de excepciones encadenadas, logs multilinea, mensajes sin timestamp, niveles desconocidos, timestamps distintos y entradas grandes.

### C2. Environment Comparator — `BACK-09`

Comparador local de configuraciones `.env` pensado para desarrollo y despliegues.

**Funcionalidad:**
- Dos editores: Environment A / Environment B.
- Parsear asignaciones `KEY=value` y comentarios habituales.
- Mostrar claves comunes, solo presentes en A, solo presentes en B y con valores distintos.
- Filtrar y ordenar diferencias.
- Opción de ignorar diferencias de valores y comparar solo claves.
- Salida copiable de claves/estados, nunca secretos.
- Ejemplos completamente sintéticos.

**Privacidad prioritaria:**
- Los valores deben estar ocultos por defecto.
- Permitir revelarlos únicamente mediante acción explícita.
- No persistir contenido ni transferir valores a otras herramientas.
- Cualquier exportación debe incluir solo nombres de variables y estado de comparación, salvo una acción explícita inequívoca.
- Nunca mostrar secretos en mensajes de error.
- Advertir de claves duplicadas, sintaxis no soportada y sustituciones `${VAR}` no resueltas.
- No expandir variables, ejecutar comandos ni intentar leer el `.env` real del dispositivo.

Tests de valores con `=`, comillas, espacios, líneas vacías, comentarios, duplicados y secretos.

**Aceptación C:** nuevos inspectores completos y accesibles; commit/push.

---

## HITO D — Connected Workbench

Implementar una primera capa útil de interoperabilidad sin construir una plataforma de automatización genérica.

### D1. Send to Tool

Añadir **“Open result in…” / “Send to…”** en herramientas compatibles.

Ejemplos:
- JSON Studio → JSON Query Explorer.
- JSON Query Explorer → JSON Studio / JSON Schema Lab / JSON → CSV cuando corresponda.
- JSON Schema Lab → JSON Studio.
- Base64 decode → JSON Studio.
- JSON ↔ YAML → JSON Studio.
- HTTP Request Builder → cURL Inspector.
- cURL Inspector → HTTP Request Builder, si la importación es compatible.
- Log Inspector → Text Diff, como texto.

**Reglas:**
1. La transferencia requiere clic explícito.
2. El dato viaja exclusivamente en memoria del navegador.
3. Reutilizar o adaptar el mecanismo actual de Quick Paste sin introducir singletons SSR compartidos.
4. Destinos definidos mediante compatibilidad real de tipos/contenido, no una lista que ofrezca opciones rotas.
5. El payload se consume una vez y se limpia después.
6. No introducir valores en URL, history state, storage ni parámetros de navegación.
7. No transferir implícitamente secretos desde `.env`, JWT o headers sensibles.
8. Evitar resultados obsoletos tras modificar un input.
9. Gestionar límites y fallos de transferencia con feedback real.

No añadir “Send to” a toda la aplicación si algunos destinos carecen de sentido. Priorizar los flujos útiles y probarlos.

### D2. Pipeline Builder — `FLOW-01`

Crear un primer flujo lineal de transformaciones de texto, con ruta estática propia y acceso desde la navegación.

**Diseño:** entrada → lista ordenada de pasos → salida. Sin canvas de nodos, sin conexiones gráficas y sin editor de scripts.

**Operaciones mínimas reutilizando motores existentes:**
- Base64 Encode / Decode.
- URL component Encode / Decode.
- JSON Format.
- JSON Minify.
- JSON → YAML.
- YAML → JSON.
- JSONPath Extract usando el motor de DATA-05 cuando sea compatible.

**Capacidades:**
- Añadir, quitar y reordenar pasos.
- Configurar opciones necesarias por paso.
- Ejecutar manualmente.
- Mostrar resultado final y estado por paso.
- Identificar exactamente qué paso falla y por qué.
- Mostrar previsualización intermedia únicamente a petición.
- Copiar/descargar resultado.
- Reset completo.
- Cargar tres recetas de ejemplo sintéticas y útiles.

Recetas sugeridas:
- Base64 Decode → JSON Format.
- URL Decode → JSON Format.
- YAML → JSON → JSONPath Extract.

**Restricciones:**
- Máximo inicial de 8 pasos.
- Límites claros de tamaño de entrada, salida y trabajo.
- Parar al primer error.
- Sin bucles, ramas, scripts, llamadas HTTP ni ejecución dinámica.
- Sin autoejecución continua al teclear.
- Sin guardar recetas con payloads, historial o resultados.
- No persistir todavía recetas personalizadas.
- Si existe un paso costoso, usar ejecución interrumpible o límites que garanticen respuesta.
- Distinguir configuraciones estructurales de payloads; mantener ambas en memoria dentro de este Goal.

Reutiliza funciones puras. Evita duplicar lógica de Base64, URL, JSON, YAML y JSONPath. Construye únicamente la abstracción mínima necesaria para encadenarlas.

**Aceptación D:** demostración real de las tres recetas, transferencia en memoria segura y navegación intacta. Tests de orden, resultado, errores, Unicode, límites y reset. Commit/push.

---

## HITO E — Integración y cierre V1.2

### E1. Registro, navegación y documentación

- Registrar las nuevas herramientas y `FLOW-01`.
- Extender correctamente el tipado de versión del registro a `V1.2`, sin romper V1/V1.1.
- Mantener los 18 slugs existentes.
- Verificar 25 rutas funcionales prerenderizadas y 404 para rutas desconocidas.
- Actualizar Home, categorías, búsqueda, command palette, favoritos y recientes.
- Mantener lazy loading.
- Actualizar `FEATURES.md`, `ROADMAP.md`, `README.md` y arquitectura únicamente donde sea necesario.
- Documentar exactamente qué formatos, sintaxis y restricciones soporta cada motor.
- Preservar la documentación histórica del Goal V1.1.

### E2. Cloudflare Pages / Node

Pendiente solicitado expresamente:

Crear en la raíz del repositorio el archivo `.node-version` con:

`24.22.1`

Motivo: DevBench exige Node 24 y Cloudflare Pages puede seleccionar la versión de Node desde este archivo.

Mantener:
- SvelteKit `adapter-static`.
- Comando `npm run build`.
- Directorio de salida `build`.
- Prerender de todas las rutas conocidas.
- Sin Wrangler obligatorio ni backend añadido.

Comprobar que `npm ci` y `npm run build` funcionan con Node 24.

Documentar brevemente la configuración de Cloudflare Pages; no intentar acceder a la cuenta Cloudflare ni introducir credenciales.

Nota: una variable `NODE_VERSION` configurada manualmente en Cloudflare podría prevalecer sobre el archivo; no afirmar haber validado el entorno remoto sin acceso real.

### E3. Validación local final

Ejecutar:
- Instalación limpia con `npm ci`.
- `npm run check`.
- `npm run lint`.
- `npm run test`.
- `npm run build`.
- Pruebas de navegador locales seleccionadas para navegación, rutas, herramientas nuevas, handoffs y pipelines.
- Verificación de tema oscuro/claro y viewports representativos: 390, 768 y 1440 px.
- Revisión de errores de consola, overflow y recursos fallidos.

Realizar revisión visual de pantallas nuevas contra `DESIGN.md` y corregir inconsistencias importantes.

**No ejecutar todavía una auditoría Playwright exhaustiva contra la web pública de Cloudflare.** Se realizará en un Goal posterior. No confundir validación local con validación en producción.

### E4. Privacidad y regresiones

Verificar que:
- Ninguna herramienta nueva envía payloads por red.
- Ningún resultado sensible permanece en storages, URL o logs.
- Los cambios no rompen las 18 herramientas existentes.
- Las rutas funcionan con carga directa y refresh en el servidor estático local.
- Los nuevos motores manejan entradas inválidas y límites.
- Los outputs/copies/downloads son reales.
- Los controles de privacidad no están simulados.
- La introducción de pipelines no compromete aislamiento entre herramientas.

Priorizar casos de seguridad y parsing sobre pruebas visuales masivas.

### E5. Cierre formal

Condiciones obligatorias para marcar el Goal como terminado:

1. **24 herramientas individuales reales + Pipeline Builder funcional = 25 entradas utilizables.**
2. Send to Tool funciona en los flujos comprometidos.
3. Cloudflare/Node queda documentado y `.node-version` committeado.
4. Tests y build pasan.
5. No quedan P0/P1 conocidos.
6. Documentación y `GOAL_PROGRESS_V12.md` reflejan resultados reales.
7. Todo está commiteado y subido al remoto configurado.
8. Se proporciona el SHA final y enlace al commit.
9. CI final comprobada si es accesible; si no, declararlo expresamente.

El mensaje final debe incluir:
- Tabla resumida de los hitos A–E.
- Herramientas desarrolladas.
- Pipelines y handoffs implementados.
- Tests realizados y resultados.
- Riesgos o limitaciones documentadas.
- P0/P1/P2 pendientes.
- Hash final y estado de push/CI.
- Qué queda reservado para la auditoría posterior de producción.

**Regla final: no detenerse tras un checkpoint intermedio.** Mientras el Goal siga activo y exista alcance autorizado pendiente, continuar con el siguiente hito. Si la ejecución se interrumpe, utilizar `GOAL_PROGRESS_V12.md` y Git para reanudar sin repetir trabajo. No implementar mejoras fuera de alcance después de alcanzar los criterios de finalización.