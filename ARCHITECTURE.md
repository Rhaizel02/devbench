# DevBench — Arquitectura y decisiones (ADR-001)

## Canvas 2.0 — evolución acotada (rama RC)

OpenAPI V1.5 ya integrado en main c3cd929a; catálogo28 sin cambios. Canvas2 conserva Konva/svelte-konva y separa DTO/migración (`model`, `legacy-serialization`, `serialization`), transformaciones puras (`operations`), historial, persistencia CAS y render/gestos. Schema3 añade grupos planos por IDs, rotación local con pivote central, geometría de conexión y recursos raster inmutables autocontenidos. Lector legacy v1/v2 aislado, fixtures congelados, ningún cambio destructivo en IndexedDB físico. Abrir migra solo en memoria; primer guardado real conserva original JSON y rechaza concurrentes/schemas futuros. Import/codec se validan antes de sustituir el proyecto abierto.

Rough.js4.6.6 genera paths deterministas con seed por elemento; Konva conserva hit-testing geométrico y PNG. Firma visual excluye posición/selección/cámara para evitar regeneración al mover. Drafts de gestos permanecen locales y se validan/historizan una vez al terminar; autosave serial600ms no serializa por muestra de puntero. Historial limita pasado+futuro y cuenta datos raster inmutables una sola vez. Copia jerárquica independiente remapea un DAG completo con memoización por diagrama; linked es acción explícita.

Imágenes PNG/JPEG/WebP estáticas: validación antes de reservar bitmap y decode antes de aceptar import/load. Presupuesto1MiB/4MP por archivo y4MiB/8MP por proyecto, backup JSON16MiB (legacy8MiB). Caché por editor, cancelación/cierre de bitmaps y ningún ObjectURL de imagen/fetch. Canvas sigue siendo la única excepción a payload solo en memoria. Todo el detalle, mediciones y límites está en `docs/ARCHITECTURE_CANVAS_V20.md`; Canvas2 no se fusiona a main sin revisión humana.

## Excepción acotada V1.4 en la rama de Canvas

El contrato autorizado de `V14_ARCHITECTURE_CANVAS_GOAL.md` amplía las reglas históricas: **Architecture Canvas puede persistir sus propios documentos** en IndexedDB `devbench.canvas.v2`; ninguna otra herramienta obtiene esta excepción. No localStorage de documentos, cookies, URL/history, logs ni tráfico de contenido. No se añade backend.

`src/lib/canvas` separa DTO/migración/parser v2 e historial (TypeScript puro), transacciones/autosave (adaptador de navegador), renderer Konva y UI. Referencias por ID, schema versionado e importación que reconstruye campos permitidos; no `Stage.toJSON()`. Importar crea otro proyecto y no sustituye el actual. Guardado serial con debounce, feedback solo tras completar transacción, errores conservando memoria y JSON de rescate. El formato v1 del spike se migra con IDs/diagramas/cámara intactos. El dominio admite huérfanos recuperables; borrar una figura no borra sus hijos. Las restricciones de librería/renderizado y el estado de aceptación se detallan en `docs/ARCHITECTURE_CANVAS_V14.md`.

Las secciones siguientes conservan las decisiones históricas; su prohibición general de IndexedDB tiene únicamente esta excepción expresa.

- **Estado:** APROBADO para B1 y evolución V1/V1.1.
- **Fecha:** 2026-10-25.
- **Prioridad:** calidad del producto y simplicidad/mantenibilidad. Svelte se elige también porque queremos probarlo; no intentar justificarlo con promesas de rendimiento.
- **Producto:** web personal/portfolio, sin autenticación ni backend; 12 herramientas V1 y 6 V1.1 en `FEATURES.md`.

## 1. Stack adoptado

| Área | Decisión | Notas |
|---|---|---|
| UI | **Svelte 5** | Runes (`$state`, `$derived`, `$props`), componentes pequeños, sin stores externos por defecto |
| Navegación/build | **SvelteKit 3 + Vite** | File-based routing, code splitting, sin router adicional |
| Lenguaje | **TypeScript strict** | Contratos de herramientas y motores puros |
| Distribución | **`@sveltejs/adapter-static`** | Prerender estático de rutas conocidas, sin servidor de producción |
| Estilos | **Tailwind CSS 4** + custom properties | Plugin `@tailwindcss/vite`, tokens fuente única en `DESIGN.md` |
| Editor | **CodeMirror 6** | Solo JSON Studio B1, import/mount en cliente |
| Iconos | **`@lucide/svelte`** | Paquete para Svelte 5; evitar `lucide-svelte` legacy |
| Preferencias | `localStorage` mínimo | Tema, tool IDs favoritos, IDs de recientes y fecha; nunca payload |
| Motor de JSON | `JSON.parse`, `JSON.stringify` | API nativa estricta, nada de parsers caseros o sanitizadores permisivos |
| Tests | **Vitest** + **Playwright** selectivo | Riesgos de JSON, privacidad, navegación, keyboard y móvil |
| Calidad | `svelte-check`, ESLint, Prettier | Mínimo necesario; scripts `check/lint/test/build` reales |
| Dependencias | **npm** y lockfile | `npm ci` reproducible; seleccionar versiones estables compatibles, no copiar tutoriales obsoletos |
| Hosting objetivo | **Cloudflare Pages estático** | Despliegue futuro, no integrar account/CI secrets en B1 |

**Excluidos:** Vue, React, Next, Nuxt, stores externos, shadcn/react, `lucide-svelte` legacy, backend, endpoints `+server`, actions, DB, auth, API client, microfrontends, monorepo, PWA/service worker o telemetría.

### Vigencia de SvelteKit

La documentación oficial de SvelteKit 3 (octubre de 2026) describe la **configuración del adaptador dentro del plugin `sveltekit` de Vite**, no en el antiguo `svelte.config.js`. Codex debe inicializar usando `npx sv create`/herramienta oficial y adaptar el scaffold a la versión instalada; **no combinar configuración de SvelteKit 2 y 3**. Entorno mínimo oficial v3: Node 22.17+, TypeScript 6, Svelte 5.57.1+, Vite 8.0.12+. Recomendado Node 24 LTS si el entorno lo permite. Ver enlaces de documentación al final.

## 2. Arquitectura: aplicación única, módulos por utilidad

```text
src/
  routes/
    +layout.svelte                # shell y estado UI per-instancia
    +layout.ts                    # prerender + trailingSlash
    +page.svelte                  # Home
    tools/
      [slug]/
        +page.ts                  # registro de slugs y datos/rutas prerender
        +page.svelte              # JsonStudio o página Coming later real
  lib/
    components/
      shell/                      # sidebar/header/drawer/command palette
      editor/                     # CodeMirror cliente compartido
      workspace/                  # patrones Input/Output, notices, actions
    tools/
      tool-registry.ts            # 12 V1 + 6 V1.1 como metadatos, una fuente
      json-studio/
        json-engine.ts            # funciones puras, sin Svelte/DOM/browser
        json-engine.test.ts
        JsonStudio.svelte
        JsonTree.svelte
    state/                         # tema/favoritos/recientes seguros
    styles/                        # CSS tokens / clases base
  app.html
static/                            # favicon/activos locales, sin payloads
```

La estructura es orientativa. No generar carpetas vacías, hooks de dependencia, services, repositorios o interfaces superfluas. Crear componentes reutilizables **cuando existan usos concretos**. `ToolRegistry` contiene ID, slug, label, categoría, keywords, icono y estado `available | planned` (B1 solo JSON Studio `available`). El registro controla Home, sidebar, paleta, favoritos, recientes, ruta y etiquetas de disponibilidad. **No** inventar slugs o rutas de herramientas fuera de `FEATURES.md`.

## 3. Rutas y despliegue estático: decisiones verificables

- Rutas reales `/` y `/tools/<slug>` para las 12 V1; las de V1.1 pueden aparecer como roadmap (sin fingir que funcionan). Preferir páginas `planned` informativas para V1 con URL compartible.
- `adapter-static` y **`prerender = true` con SSR de build habilitado**. Renderizado HTML durante build; hidratación en navegador. No confundir con un SSR backend de producción.
- Si se usa `/tools/[slug]`, generar las rutas explícitamente con `entries()` en `+page.ts` leyendo el registro, o prerenderizar mediante enlaces descubiertos si queda probado en build. No depender de fallback SPA para rutas que ya conocemos.
- Configurar `trailingSlash = 'always'` si hace falta para generar `/tools/slug/index.html` y comprobar enlaces profundos directos en build/preview estático. **No** añadir `ssr = false` global si se busca HTML prerenderizado.
- La lógica de herramientas usa módulos TypeScript cargados al visitar su ruta; CodeMirror solo se importa/monta en cliente (`onMount` o equivalente) y se destruye correctamente (`EditorView.destroy()`).
- No importar `window`, `localStorage`, `document`, `navigator` ni acceder a APIs de browser en la evaluación superior de módulos que se usan al prerenderizar.
- 404 para slugs no conocidos. Confirmar rutas válidas en servidor estático/preview. Evitar `routes` con placeholders que dan 200 para cualquier slug arbitrario.

## 4. Invariantes de privacidad y seguridad

**Innegociable:** entradas y resultados del usuario permanecen en el navegador; ni envíos a API, analítica, consola o reporte de excepciones, ni persistencia en disco/sesión/URL. Código de transformación local y fuentes empaquetadas si se incluyen.

- `localStorage` **únicamente:** preferencia de tema `system | light | dark`, favoritos `[toolId]`, recientes `[{toolId, visitedAt}]`. Validar/esquematizar metadatos al leer; cuota y fallos de storage manejados sin romper app.
- JSON/SQL/JWT/texto nunca en `localStorage`, `sessionStorage`, IndexedDB, cookies, URL/hash/query/history, logs ni URLs remotas. No persistir nombre de fichero del input. Datos en componentes/estado local y liberar al salir de la herramienta; evitar cache de estado sensible entre rutas.
- Quick Paste: detector local de apariencia (no prometer seguridad), **transferencia únicamente por clic**, una sola vez y solo a **JSON Studio B1**. No publicar payload en URLs. Usar estado de contexto creado dentro de `+layout.svelte` por instancia de render o un puente creado exclusivamente en el cliente; **no exportar un `$state` con texto sensible desde módulo singleton en SSR**, que podría compartirse entre peticiones en contexto server.
- No hacer `{@html}` con input, no `eval`, `new Function`, ejecución de comandos ni interpretación JS de payloads. Tratar entrada como texto no fiable en la UI.
- Clipboard con `navigator.clipboard.writeText` bajo acción de usuario, feedback éxito solo después de resolución; fallos visibles. Descargas Blob+ObjectURL revocada, sin endpoints.
- No afirmaciones de verificación de firma JWT, seguridad universal, métricas ficticias, webassembly o ausencia de paquetes de red.
- Sin dependencias externas que necesiten transmitir entradas. No fuentes, scripts o CSS en CDN de ejecución.

## 5. JSON Studio B1: contrato de dominio

- `validateJson(input)` distingue input vacío, válido e inválido. Usar JSON estricto: `{"x":1,}` es **inválido**. Los valores primitivos JSON (`null`, `true`, `42`, `"abc"`) también son válidos.
- `formatJson(input, indent: 2|4|'tab')`, `minifyJson(input)` producen salida solo cuando parse válido; ninguna reparación implícita. Evitar confundir output vacío con `null` o validación falsa.
- Input siempre editable y conservado al fallar. Ejemplo explícito con contenido sintético y **estrictamente válido**. Reset borra input/output/error, sin borrar favoritos.
- Vista Code/Tree tras parse válido; árbol expandible con objetos, arrays, valores y rutas copiables como JSONPath sencilla (notación `$["key"][0]`, con claves correctamente escapadas) o JSON Pointer. Especificar convención visual y mantenerla. Búsqueda básica real, no simular.
- Copy output y descarga `.json` del resultado actual, correctamente inhabilitados cuando no hay salida. El árbol y la descarga pueden reutilizar último resultado válido, **pero no mostrar un resultado viejo como actual** tras editar a JSON inválido o vacío: invalidar/etiquetar claramente el resultado.
- No ejecutar transformaciones pesadas automáticamente al teclear. Validar/formatear/minificar a petición, mantener UI fluida; manejar entradas grandes con límites explícitos/aviso y no renderizar recursivamente árboles enormes sin control.
- Escritorio: split Input/Output; móvil: tabs accesibles Input/Output con ambos estados conservados, sin scroll horizontal de página.

## 6. Componentes, accesibilidad y feedback

- Seguir `DESIGN.md` (tokens, jerarquía, componentes y capturas 01–06). El HTML de Stitch es maqueta, **nunca** fuente de lógica.
- Atajos de paleta Cmd/Ctrl+K, Escape, flechas y Enter; foco retorna al disparador al cerrar. Cerrar drawer con escape y gestionar foco. No secuestrar atajos mientras el usuario edita el CodeMirror, salvo Cmd/Ctrl+K expresamente previsto.
- Tema system/light/dark, responsive 390/768/1440, mobile touch targets >=44px, loading/empty/error/focus/disabled funcionales. Respetar `prefers-reduced-motion`.
- No instalar componentes UI enormes; controles accesibles propios para casos sencillos. Si un diálogo/trap-focus es complicado, incorporar **solo entonces** una primitiva Svelte pequeña y accesible, explicando la dependencia.

## 7. Pruebas y calidad ajustadas al riesgo

- Vitest de core JSON: valores raíz, arrays, escapes Unicode, errores/trailing commas, profundidad/número grande razonable, formato y minify, rutas de árbol.
- Test de privacidad: solo claves/metadatos permitidos en almacenamiento; no payloads. No loguear inputs en tests/reportes.
- Prueba navegador/manual: Home → búsqueda → JSON Studio → input válido → Format → Copy/Download; entrada inválida → mensaje real. Comprobar rutas estáticas directas, paleta teclado, favoritos/recientes, tema y 390px sin overflow.
- `npm run check`, `npm run lint`, `npm run test`, `npm run build` con scripts reales; `npm ci` reproducible y workflow CI mínimo para estos comandos. Playwright E2E 1–3 smoke tests si el entorno de navegador está disponible; no bloquear una entrega correcta por una dependencia externa inaccesible, dejar constancia.
- Visual: capturas **reales de navegador** en dark desktop, light desktop y 390px; cotejar disposición/espaciado con `screenshots/`. No pixel-perfect ni refactors de P2 cosméticos fuera de bloque.

## 8. Entrega, trazabilidad y trabajo con Codex

- Codex debe hacer commit y push al remoto configurado e indicar hash final, o explicar falta de remoto/permisos dejando commit local. No fingir publicación.
- Informe final de Bloque 1: qué es funcional, rutas, tests/resultado, commit hash, dudas P0/P1/P2, problemas no resueltos y siguientes tareas. Marcar P2 para el backlog, **no** gastar tokens en un ciclo separado de polish menor.
- No cambios a `FEATURES.md`/`DESIGN.md` sin motivo explícito; si hay contradicción, documentar una decisión pequeña en README.

## Documentación oficial verificada (2026-10-25)

- [SvelteKit v3 migration/config](https://svelte.dev/docs/kit/migrating-to-sveltekit-3)
- [SvelteKit prerender/entries](https://svelte.dev/docs/kit/page-options)
- [SvelteKit static adapter](https://svelte.dev/docs/kit/adapter-static)
- [Svelte 5 runes](https://svelte.dev/docs/svelte/$state)
- [Tailwind CSS 4 en SvelteKit](https://tailwindcss.com/docs/installation/framework-guides/sveltekit)
- [CodeMirror 6](https://codemirror.net/docs/guide/)
- [Lucide Svelte 5](https://www.npmjs.com/package/@lucide/svelte)

## Implementación V1.1 — nota de evolución

La arquitectura aprobada de B1 se conserva: una aplicación estática, sin servicios de datos ni backend. Actualmente el registro expone las 18 herramientas. `tool-workspaces.ts` es un mapa pequeño de imports diferidos dentro de la ruta SvelteKit; no añade otro router ni una plataforma de plugins. `TextWorkspace.svelte` comparte el flujo input/output entre conversiones concretas y los inspectores mantienen su presentación propia. CodeMirror se monta/destruye en cliente y carga sintaxis por idioma; la regex se evalúa en un Worker dedicado que se termina al vencer el presupuesto o abandonar la herramienta.

Los payloads permanecen en componentes/contexto por instancia; Quick Paste lleva destino y unidad explícitos y se consume una vez. La aplicación guarda únicamente las preferencias sanitizadas descritas arriba. SvelteKit puede guardar índices de navegación/desplazamiento en sessionStorage durante una recarga; los contenedores de snapshots permanecen vacíos y no incluyen entradas/resultados. La matriz de release inspecciona estas formas y la ausencia de marcadores confidenciales en todos los canales persistentes o de red.

## Implementación V1.2 — evolución acotada

El registro tipado incorpora V1.2 y 25 entradas: 24 herramientas individuales y FLOW-01. Conserva los 18 slugs previos, `entries()` estático y el mapa de imports diferidos. Home, paleta, favoritos y recientes consumen ese mismo registro. El stack, tokens y geometría aprobados no cambian.

Los motores JSONPath, Schema, HTTP, logs y dotenv son TypeScript puro. JSONPath implementa un subconjunto explícito sin evaluación de JavaScript; Schema usa un intérprete con meta-esquemas locales y rechaza referencias externas. Query/Schema usan workers desechables de 1.5 s. El pipeline lineal reutiliza motores concretos, admite hasta ocho pasos y termina su worker en timeout/cancel/abandono; limita cada texto a 1 MiB y el trabajo acumulado a 4 MiB. No es una plataforma de plugins ni de scripts.

`SendResult` comprueba compatibilidad y reutiliza `pendingPaste` por instancia para transferencias explícitas de un solo consumo, sin datos en navegación/persistencia. HTTP solo transfiere cURL redactado; JWT y dotenv no transfieren valores. Environment Comparator oculta sus editores por defecto y su resultado/exportación contiene únicamente claves y estados. Todas las claves de resultado incluyen inputs/opciones para ocultar salidas y acciones obsoletas. Las recetas y configuraciones del pipeline también permanecen en memoria.

`.node-version` y CI fijan 24.22.1. La salida sigue siendo `build`, compatible con Cloudflare Pages sin funciones. Las pruebas y capturas V1.2 se ejecutan contra el servidor estático local; el entorno remoto de Cloudflare no se valida ni se accede en este Goal.
