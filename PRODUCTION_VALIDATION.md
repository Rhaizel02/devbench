# DevBench V1.2 — auditoría de aceptación en producción

**Recomendación: GO para V1.2.** Las 24 herramientas y Pipeline Builder realizan operaciones reales en el despliegue HTTPS publicado. Las 25 rutas pasan acceso directo y recarga; las rutas inexistentes devuelven HTTP 404. No se han reproducido incidencias P0/P1. Firefox queda pendiente por un fallo de arranque del navegador en el entorno auditor, clasificado P2.

## Destino y versión efectivamente comprobados

Auditoría del **25 de octubre de 2026**, aproximadamente **11:40–11:56 UTC**, con Playwright **1.64.1**, Node **24.22.1**, Windows y perfiles de navegador nuevos. Se leyeron `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `FEATURES.md`, `VALIDATION.md` y `GOAL_PROGRESS_V12.md`. La aceptación local histórica no se ha utilizado como sustituto de pruebas de producción.

| Destino                                                                   | Evidencia obtenida                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [URL estable](https://devbench-aw3.pages.dev)                             | HTTP 200, interfaz V1.2, 25 herramientas disponibles; destino de todas las pruebas funcionales y capturas de esta auditoría.                                                             |
| [Despliegue de referencia](https://f90b68ea.devbench-aw3.pages.dev)       | Cloudflare Pages lo vincula al commit **`596e84fcca23655c34b5251365ca570313ceeed0`** mediante su [check público satisfactorio](https://github.com/Rhaizel02/devbench/runs/121151246262). |
| [Despliegue anterior facilitado](https://f72dc9f2.devbench-aw3.pages.dev) | HTTP 200 en Home, interfaz **V1.1**; `/tools/json-query/` devuelve HTTP 404. No es el despliegue V1.2 aceptado.                                                                          |

Se compararon los bytes de `/`, `/_app/version.json` y `/tools/json-query/` entre la URL estable y el despliegue de referencia: **idénticos en los tres casos**. Identificador publicado del build: **`1792926370429`**. La correspondencia con el commit de referencia se establece mediante el check de Cloudflare y estas huellas; la aplicación no expone un SHA propio firmado. Las huellas SHA-256, fecha y cabeceras observadas están en [provenance.json](screenshots/production/provenance.json). No se accedió a la cuenta de Cloudflare ni se utilizaron credenciales de despliegue.

## Matriz de aceptación: 25/25

Cada fila incluye una operación ejecutada en la UI contra la URL estable, **copia real al portapapeles con contenido no vacío, Reset y recarga sin conservar el payload**. En las siete herramientas nuevas también se comprueba que editar la entrada invalida la copia y que reset/recarga no dejan un resultado copiable. Las columnas de acceso/recarga proceden de respuestas HTTP reales, no de una comprobación del DOM. Las filas 1–18 reutilizan la matriz existente; las siete restantes reutilizan las pruebas V1.2. Las comprobaciones detalladas de valores, descargas y contratos V1.2 se describen después.

Todas las rutas tienen el prefijo `/tools/` y terminan en `/`.

| #   | Herramienta / slug                                | Acceso / recarga | Operación representativa ejecutada                                                       | Copia / reset / privacidad |
| --- | ------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| 1   | JSON Studio · `json-studio`                       | 200 / 200        | Formatear JSON; además árbol, JSONPath, minificación y descarga verificada               | PASS                       |
| 2   | JSON Diff · `json-diff`                           | 200 / 200        | Comparar dos documentos JSON distintos                                                   | PASS                       |
| 3   | JSON ↔ YAML · `json-yaml`                         | 200 / 200        | Convertir JSON sintético a YAML; transferencia inversa JSON                              | PASS                       |
| 4   | Base64 Toolkit · `base64-toolkit`                 | 200 / 200        | Codificar texto UTF-8; decodificar JSON para transferirlo                                | PASS                       |
| 5   | URL Toolkit · `url-toolkit`                       | 200 / 200        | Inspeccionar una URL con query sintética sin visitarla                                   | PASS                       |
| 6   | JWT Inspector · `jwt-inspector`                   | 200 / 200        | Decodificar un JWT sintético, sin afirmar verificación de firma                          | PASS                       |
| 7   | Hash Generator · `hash-generator`                 | 200 / 200        | Calcular hash de texto sintético mediante Web Crypto                                     | PASS                       |
| 8   | SQL Formatter · `sql-formatter`                   | 200 / 200        | Formatear un SELECT sintético                                                            | PASS                       |
| 9   | Regex Tester · `regex-tester`                     | 200 / 200        | Ejecutar la expresión sobre texto sintético                                              | PASS                       |
| 10  | Text Diff · `text-diff`                           | 200 / 200        | Comparar textos distintos                                                                | PASS                       |
| 11  | ID Generator · `id-generator`                     | 200 / 200        | Generar y copiar identificadores                                                         | PASS                       |
| 12  | Timestamp Converter · `timestamp-converter`       | 200 / 200        | Convertir epoch `1700000000`                                                             | PASS                       |
| 13  | JSON ↔ CSV · `json-csv`                           | 200 / 200        | Convertir un array de objetos sintéticos a CSV                                           | PASS                       |
| 14  | JSON → Code · `json-code`                         | 200 / 200        | Inferir tipos a partir de un objeto JSON                                                 | PASS                       |
| 15  | cURL Inspector · `curl-inspector`                 | 200 / 200        | Inspeccionar cURL con Authorization y api_key sintéticos; transferencia redactada        | PASS                       |
| 16  | Cron Explorer · `cron-explorer`                   | 200 / 200        | Interpretar `* * * * *` y producir próximas ejecuciones                                  | PASS                       |
| 17  | String Toolkit · `string-toolkit`                 | 200 / 200        | Transformar texto sintético                                                              | PASS                       |
| 18  | SQL IN Builder · `sql-in-builder`                 | 200 / 200        | Construir una lista IN desde valores sintéticos                                          | PASS                       |
| 19  | JSON Query Explorer · `json-query`                | 200 / 200        | Filtrar productos por precio, comprobar dos valores y JSON Pointer; descargar resultados | PASS                       |
| 20  | JSON Schema Lab · `json-schema`                   | 200 / 200        | Validar documento, inferir schema y reutilizarlo en el validador                         | PASS                       |
| 21  | HTTP Request Builder · `http-request`             | 200 / 200        | Generar cURL, fetch, Java y Spring; importar cURL literal                                | PASS                       |
| 22  | HTTP Headers Inspector · `http-headers`           | 200 / 200        | Inspeccionar categorías/advertencias y copiar un informe redactado                       | PASS                       |
| 23  | Log & Stack Trace Inspector · `log-inspector`     | 200 / 200        | Agrupar logs Java, localizar causa, copiar excepción y filtrar ERROR                     | PASS                       |
| 24  | Environment Comparator · `environment-comparator` | 200 / 200        | Comparar dotenv, revelar explícitamente y exportar solo claves/estados                   | PASS                       |
| 25  | Pipeline Builder · `pipeline-builder`             | 200 / 200        | Ejecutar las tres recetas, abrir preview y provocar fallo por orden incorrecto           | PASS                       |

Evidencia estructurada: [18 operaciones originales](screenshots/production/release-matrix.json), [7 operaciones V1.2](screenshots/production/v12-operation-matrix.json), [25 accesos y recargas](screenshots/production/v12-checks.json), [resumen de pruebas](screenshots/production/test-summary.json). **15 flujos Chromium distintos aceptados**, más un smoke WebKit. No se afirma que las 26 pruebas locales se hayan repetido íntegramente en producción.

También pasan Home y navegación interna. `/tools/not-a-tool/`, `/tools/production-unknown-tool/` y `/production-unknown-page/` devuelven **404 HTTP real**; el 404 intencionado no se contabiliza como recurso roto de la aplicación.

## Contratos V1.2 y estados de error

- **JSONPath:** consulta numérica con Notebook/Pen como resultados exactos; JSON Pointer `/products/0` copiado; descarga `query-results.json` leída y parseada; cero coincidencias es éxito explícito. Cambiar la consulta invalida el resultado y deshabilita la copia. Una expresión incompleta muestra error sin perder el documento.
- **Schema:** validación válida y documento no conforme con `valid: false`, inferencia y reutilización del schema inferido. Un patrón hostil `(a+)+$` termina el worker con error visible y permite reintentar. No se observan peticiones externas de schemas.
- **HTTP:** cuatro destinos de generación, cURL literal importado, método/cuerpo comprobados. Authorization y cuerpo quedan redactados por defecto. Revelar secretos invalida el resultado: requiere regenerarlo antes de copiar. Reset limpia URL y headers. Se genera código; ninguna petición de ejemplo se ejecuta.
- **Headers:** categorías y advertencias contextuales reales; el informe bruto copiado conserva la redacción de secretos.
- **Logs:** causa profunda `java.net.ConnectException`, conservación de `Suppressed:`, copia de entrada concreta, filtro ERROR con un único resultado. Cambiar el filtro invalida la salida hasta procesar de nuevo.
- **Entornos:** valores ocultos inicialmente; revelado explícito en los editores; el export copiado contiene cuatro filas de claves/estado y ninguna clave secreta como valor. Tras recargar, entradas vacías. Un dotenv mal cerrado muestra error sin incluir el secreto.
- **Transferencias:** Studio → Query; Query → Studio/Schema/CSV; Base64 Decode y YAML→JSON → Studio; Schema inferido → Studio; HTTP Builder ↔ cURL Inspector con datos redactados; Logs → Text Diff. Navegar fuera y volver deja el destino vacío: no se reutiliza la transferencia consumida.
- **Pipelines:** Base64 Decode → JSON Format; URL Decode → JSON Format; YAML→JSON → JSON Query. Las tres producen los valores sintéticos esperados. El preview intermedio requiere clic. Reordenar la primera receta provoca error en el paso 1 y marca el siguiente como `not-run`; no permite copiar salida obsoleta. Reset elimina entrada, pasos y previews.
- **Base existente:** JSON mal formado conserva la entrada y retira el resultado; `null` se minifica correctamente. En las 18 herramientas se ejercitan estados vacíos y entradas inválidas aplicables. No se reejecuta aquí toda la batería de límites/compliance ya cubierta por CI.

## Privacidad y red observada

**Sin fugas de payload observadas.** Se utilizan exclusivamente marcadores sintéticos en JSON, JWT, URLs de ejemplo, SQL, headers, cuerpos HTTP, logs y dotenv. Se inspeccionan URLs y cuerpos de solicitudes, consola, localStorage/sessionStorage, estado e invocaciones de History, cookies, Cache API e IndexedDB. La prueba nueva también comprueba headers de solicitudes y representaciones Base64/Base64URL del marcador de producción.

En el flujo Chromium instrumentado se observan **177 solicitudes GET al mismo origen**: documentos, módulos/worker, CSS y fuentes dentro de `/_app/immutable/`; ninguna query de payload, petición POST ni petición a los destinos HTTP sintéticos. Solo se permiten rutas conocidas y recursos estáticos del build. Son cargas necesarias del sitio, no transmisiones de entradas. La misma prueba pasa en WebKit. El listado de solicitudes sin payload y versiones está en [privacy-chromium.json](screenshots/production/privacy-chromium.json) y [privacy-webkit.json](screenshots/production/privacy-webkit.json).

Persistencia observada: solo `devbench.preferences.v1` en localStorage, con IDs/fechas/tema. La matriz original comprueba además la forma exacta de los metadatos de navegación/scroll de SvelteKit y sus contenedores vacíos de snapshots en sessionStorage. No hay payloads en esos metadatos, historial, URL o consola; cookies, Cache API e IndexedDB permanecen vacíos. Quick Paste permanece en Home hasta el clic explícito, transfiere una vez y no recupera el contenido al volver a abrir Studio.

Cloudflare responde con cabeceras **NEL/Report-To**, además de `strict-origin-when-cross-origin` y `nosniff`. La existencia de esas cabeceras de infraestructura se registra por separado: no se observó tráfico NEL ni envío de payload a Cloudflare Analytics durante las pruebas. Las consultas del auditor a la API pública de GitHub para identificar el despliegue son comprobaciones independientes, sin entradas de herramientas.

## Navegación, responsive y accesibilidad básica

Chromium **156.0.8078.4**: **54 escenarios** medidos — Home, Studio y siete espacios V1.2 × oscuro/claro × **390/768/1440 px**. Todos cumplen `document.scrollWidth <= innerWidth`; cero errores de página, errores de consola, recursos HTTP fallidos o solicitudes externas en ese recorrido. Se conservan **14 capturas del recorrido** y otras **4 de las pruebas funcionales**. Las capturas representativas fueron inspeccionadas visualmente: paneles de escritorio, tabs móviles, texto/código y controles son utilizables dentro del alcance probado.

La prueba de navegación comprueba favorito, tema claro, paleta Ctrl+K con búsqueda/Enter, apertura del drawer móvil y Escape con retorno del foco, tabs de salida/entrada mediante ArrowLeft y navegación a otra herramienta. La prueba de producción repite drawer/tabs con teclado en Chromium y WebKit. Son comprobaciones básicas de semántica/foco, no una certificación WCAG ni una evaluación con lector de pantalla.

WebKit **27.2**: smoke satisfactorio contra la URL HTTPS con Quick Paste, JSONPath, worker de Schema, las tres recetas, invalidación, reset y teclado móvil. No se utilizó un clipboard simulado para atribuirle cobertura de copia; la copia/descarga real se comprobó en Chromium.

### Capturas reales representativas

Todas provienen de `https://devbench-aw3.pages.dev`, con datos sintéticos; no son mockups ni capturas de localhost.

| Vista                        | Captura                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| Home oscuro, 1440 px         | [PNG](screenshots/production/v12-home-dark-1440.png)             |
| Home claro, 1440 px          | [PNG](screenshots/production/v12-home-light-1440.png)            |
| Home oscuro, 390 px          | [PNG](screenshots/production/v12-home-dark-390.png)              |
| JSON Studio claro, 1440 px   | [PNG](screenshots/production/v12-json-studio-light-1440.png)     |
| JSON Studio oscuro, 390 px   | [PNG](screenshots/production/v12-json-studio-dark-390.png)       |
| JSONPath oscuro, 1440 px     | [PNG](screenshots/production/v12-json-query-dark-1440.png)       |
| Schema oscuro, 390 px        | [PNG](screenshots/production/28-schema-dark-mobile.png)          |
| HTTP Builder oscuro, 1440 px | [PNG](screenshots/production/v12-http-request-dark-1440.png)     |
| Headers oscuro, 1440 px      | [PNG](screenshots/production/v12-http-headers-dark-1440.png)     |
| Logs oscuros, 1440 px        | [PNG](screenshots/production/v12-log-inspector-dark-1440.png)    |
| Entornos claros, 390 px      | [PNG](screenshots/production/30-env-light-mobile.png)            |
| Pipeline claro, 390 px       | [PNG](screenshots/production/v12-pipeline-builder-light-390.png) |

## Incidencias y límites de la auditoría

| Prioridad | Hallazgo y reproducción                                                                                                                                                                                                                               | Estado / impacto                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| P0/P1     | Ninguna incidencia del producto reproducida en los escenarios auditados.                                                                                                                                                                              | Sin bloqueos de aceptación; no se ha modificado código de la aplicación.                                                          |
| P2        | Firefox descargado por Playwright no arranca: ejecutar el smoke con `PLAYWRIGHT_BROWSER=firefox` produce `browserType.launch: spawn UNKNOWN` al iniciar `firefox.exe -headless ... -juggler-pipe`. Ocurre antes de crear página o visitar producción. | Cobertura Firefox pendiente por el entorno; no se atribuye un fallo a DevBench ni se instala software del sistema para eludirlo.  |
| P2        | Cobertura accesible limitada a teclado/foco/roles y tamaños emulados.                                                                                                                                                                                 | Pendientes lector de pantalla, contraste automatizado exhaustivo y dispositivos físicos; no bloquean este contrato de aceptación. |

Durante la preparación, dos procesos de Playwright compartieron el directorio de artefactos y uno falló al cerrar el contexto con `ENOENT`. Además, el recorrido de 18 herramientas superó inicialmente el presupuesto local de 30 segundos. Se aisló la ejecución y se fijó 120 segundos solo para destinos externos; las cuatro pruebas repetidas pasaron, incluida la matriz completa y el inspector de logs. Son incidencias del arnés de auditoría, no fallos de la web. [test-summary.json](screenshots/production/test-summary.json) conserva los intentos fallidos y la ejecución aceptada correspondiente.

La comprobación cubre un despliegue y una ventana temporal concretos. Las URLs estables pueden cambiar tras futuros pushes. Las capturas no prueban todos los estados posibles; los límites grandes, compliance completo de formatos y compilación/ejecución de todos los clientes HTTP generados conservan su cobertura local documentada, no se vuelven a atribuir a producción. No se inspeccionan logs internos del proveedor ni se promete ausencia de tráfico fuera de la ventana observada. No se accede al panel de Cloudflare ni se modifican configuración de hosting, secretos, diseño o funciones.

## Reproducción y controles de calidad

`PLAYWRIGHT_BASE_URL` selecciona el HTTPS publicado y deja `webServer` sin configurar. Sin esa variable se mantiene el circuito local existente de CI. `PLAYWRIGHT_PRODUCTION=1` selecciona únicamente las dos pruebas nuevas de despliegue; sin URL explícita esas pruebas se omiten. La prueba de procedencia está anclada deliberadamente al commit/build de esta aceptación: un despliegue futuro distinto debe fallar esa comparación, no actualizar silenciosamente la versión aceptada.

PowerShell, con Node 24 disponible en PATH:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://devbench-aw3.pages.dev'
$env:PLAYWRIGHT_JSON_REPORT = 'work/production-v12.json'
npx playwright test tests/v12-release.spec.ts tests/v12-connected.spec.ts tests/v12-data.spec.ts tests/v12-http.spec.ts tests/v12-diagnostics.spec.ts

$env:PLAYWRIGHT_JSON_REPORT = 'work/production-existing.json'
npx playwright test tests/release.spec.ts tests/smoke.spec.ts --grep 'release matrix|navigation, themes|strict JSON'

$env:PLAYWRIGHT_PRODUCTION = '1'
npx playwright test
$env:PLAYWRIGHT_BROWSER = 'webkit'
npx playwright test --grep 'privacy and cross-browser smoke'

Remove-Item Env:PLAYWRIGHT_BROWSER, Env:PLAYWRIGHT_PRODUCTION
npm run capture:v12
```

Ejecutar los runners secuencialmente. `PLAYWRIGHT_JSON_REPORT` es opcional. Las evidencias externas se escriben en `screenshots/production/`, separadas de las históricas locales. No se ha iniciado servidor local para la auditoría.

| Control de los cambios de auditoría   | Resultado                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run check`                       | PASS, 0 errores / 0 warnings                                                                   |
| `npm run lint`                        | PASS, Prettier y ESLint                                                                        |
| `npm run test`                        | PASS, 195 tests / 13 archivos                                                                  |
| `npm run build`                       | PASS, adapter-static                                                                           |
| Playwright sobre producción           | 15 flujos Chromium distintos + 1 smoke WebKit aceptados; Firefox bloqueado antes de navegación |
| Recorrido publicado de rutas y diseño | PASS, 25 accesos/recargas, 404 real, 54 escenarios, 14 capturas del recorrido                  |

La CI del commit de esta entrega se comprueba tras el push y su SHA/estado se indican en la entrega. Las pruebas de procedencia de producción son explícitas y no sustituyen las regresiones locales que GitHub Actions sigue ejecutando.

**GO para el despliegue V1.2 identificado arriba**, con las limitaciones P2 indicadas y sin P0/P1 abiertos.
