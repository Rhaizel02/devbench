# DESIGN.md — DevBench

> **Canvas 2.0 (rama RC, no rediseño global):** lienzo dominante y encabezado comprimido; herramientas flotantes reconocibles, propiedades/proyectos/outline bajo demanda. Selección y handles en tamaño de pantalla, estados de grupo y referencias hijas explícitos. En 390 px, fila compacta de selección/mano/formas/flecha/texto/lápiz/más y panel contextual inferior; objetivos táctiles ≥44 px, sin acciones exclusivas de hover. Usar tokens zinc/teal existentes, colores del documento independientes, sin gradients ni ruido por frame. Estados maestros, medidas y evidencia incremental en `docs/ARCHITECTURE_CANVAS_V20.md`.

> **Extensión V1.4 autorizada:** Architecture Canvas usa un workspace de pizarra con lienzo protagonista, toolbar compacta, inspector opcional y texto directo. Los colores de figuras/documento organizan sistemas y no cambian el acento teal del shell. En móvil se inicia a escala legible, con pan y 100% explícito; Fit no reemplaza cámaras. Solo Canvas dispone de autosave local de proyectos en IndexedDB, informado en UI. Se mantienen temas, navegación global y los demás workspaces. Contrato completo en `V14_ARCHITECTURE_CANVAS_GOAL.md`; capturas reales e informe en `docs/ARCHITECTURE_CANVAS_V14.md`.

> **Estado:** diseño visual cerrado para implementación (2026-10-25). Fuente normativa para Codex. Los PNG de `screenshots/` son referencias visuales, **no** contratos funcionales. Si una captura, el HTML generado por Stitch o su DESIGN.md original contradice este documento o `FEATURES.md`, prevalecen estos dos documentos.
>
> **Producto:** aplicación web personal/portfolio; Svelte 5 + SvelteKit + TypeScript + Vite; sin backend en V1/V1.1. UI en inglés; README puede ser bilingüe. Nombre de trabajo: DevBench.

## 1. Identidad, atmósfera y principios

Workbench de ingeniería sobrio, concentrado y genuinamente útil. Inspiración: IDE/editor de código, no landing de SaaS, dashboard financiero, consola falsa ni catálogo de tarjetas promocionales. Oscuro por defecto con tema claro zinc equivalente.

- Densidad **6/10**, asimetría funcional **5/10**, movimiento **2/10**.
- La información del usuario es protagonista. Controles visibles pero discretos; prioridad a **pegar → inspeccionar/transformar → copiar**.
- Separadores planos de 1 px, sin sombras ornamentales. Controles de edición con estados explícitos y consistentes.
- El diseño debe transmitir privacidad por comportamiento y copy preciso; jamás con métricas inventadas o afirmaciones criptográficas no comprobadas.
- La Home es un índice de utilidades, no un producto distinto del workspace. Los diseños de la exportación v2 sirven para Home; la exportación v3 sirve para los workspaces.

## 2. Paleta y tokens de tema

Una **única familia de acento teal** para interfaz. Colores rojo/ámbar/verde solo para estados de error/advertencia/éxito con significado real. El coloreado de sintaxis puede utilizar una paleta discreta adicional y separada de las acciones de UI. No introducir un segundo acento azul para enlaces o botones.

| Token semántico | Dark | Light | Uso |
|---|---|---|---|
| `--color-bg` | `#0E0E10` | `#FAFAFA` | Canvas |
| `--color-rail` | `#131315` | `#F4F4F5` | Sidebar y header |
| `--color-panel` | `#1C1B1D` | `#FFFFFF` | Panel y editor |
| `--color-raised` | `#202024` | `#FFFFFF` | Menús, popovers, tooltips |
| `--color-border` | `#2D2D32` | `#E4E4E7` | Separadores 1px |
| `--color-text` | `#EDEDF0` | `#18181B` | Texto principal |
| `--color-muted` | `#A1A1AA` | `#52525B` | Secundario, placeholders accesibles |
| `--color-accent` | `#4FDBC8` | `#0F766E` | Foco, selección, botón primario |
| `--color-accent-ink` | `#0E0E10` | `#FFFFFF` | Texto sobre acento |

Estados semánticos de error y warning deben mantener contraste WCAG AA: rojo de texto legible sobre su fondo, ámbar para avisos, nunca solamente color sin icono/texto. En tema claro asegurar contraste de botones y metadatos; no usar lavanda.

Implementar tokens con CSS custom properties y `data-theme` (o estrategia equivalente coherente). Preferencia `system | dark | light`, persistir solo preferencia de tema; respetar `prefers-color-scheme`. No mezclar valores HEX sueltos en cientos de componentes.

## 3. Tipografía y contenido

- **UI:** Geist, con fallback sans-serif deliberado. **Código y valores técnicos:** JetBrains Mono con fallback monospace. Cargar mediante fuentes licenciadas/autohospedadas cuando sea viable; si aún no están incorporadas, usar fallbacks locales en lugar de enlaces a CDNs de fuentes en la aplicación publicada si comprometen el objetivo offline/privado. No adjuntar binarios de fuentes al repositorio sin licencia adecuada.
- Título de Home: **24/32 px**, semibold. Título de workspace: **22–24/30 px**. Encabezados de panel: **14/20 px** semibold. UI general: **14/20 px**. Texto auxiliar: **12–13 px** en escritorio solamente si legible. En móvil texto funcional >=14 px. Editor: **13–14/20–22 px** con zoom del navegador intacto.
- Números, timestamps, code, shortcuts en fuente monoespaciada, preferible tabular. No permitir que la herencia introduzca serif en tablas o toolbars.
- Longitud contenida para prosa, pero los editores no deben recortar consultas o JSON arbitrariamente; scroll interior horizontal controlado / wrapping configurable.
- Copy concreto: “Format SQL”, “Copy output”, “Invalid JSON: unexpected token”, no claims de “100% secure”, “verified”, etc.

## 4. Geometría, responsive y navegación

- Desktop >=1024 px: sidebar fija **248 px**; header **60 px**; cuerpo flexible, dos paneles editor Input/Output en grid. Panel principal usa espacio disponible, min-width: 0, alturas funcionales sin blanco ornamental.
- Tablet 768–1023 px: sidebar reducida o drawer; editor a dos columnas solo cuando ambos paneles sigan siendo útiles; en caso contrario una columna/tabs.
- Mobile <768 px: header ~52 px; menú drawer activable con teclado, trap de foco y Esc; **una columna**, sin scroll horizontal de página. Panel Input / Output mediante tabs accesibles, conservar contenido al cambiar. Footer de navegación, si se utiliza, exclusivamente Home/Tools/Favorites.
- Espaciado de base 4 px, incrementos 8/12/16/24 px. Radio 4 px controles, 6–8 px overlays. Bordes estructurales de 1 px. No usar cards para todo: paneles y líneas divisorias.
- Controles táctiles y botones principales de móvil **>=44x44 px**. Los botones compactos de escritorio pueden ser ~32–36 px si tienen zona de interacción adecuada; no replicar microbotones de 26 px en móvil.
- Search global / `Ctrl+K` o `Cmd+K`, cerrar con Esc, navegación con flechas y Enter. Rutas compartibles **sin payloads**, favoritos y recientes guardan solo `toolId`/timestamp.
- El logo, sidebar, encabezado, paleta y tipografía deben ser **idénticos** en Home, JSON, JWT y SQL; no cambiar marca entre las capturas.

## 5. Componentes compartidos

### AppShell / Sidebar / Header

Navegación por categorías y las 12 herramientas V1 de `FEATURES.md`. Categorías: Data, Encoding, Security, Backend, Text, Utilities. La página actual recibe indicador teal lateral, no glow. Home tiene acceso explícito y estado activo correcto. Mostrar herramientas de V1.1 solo como roadmap o deshabilitadas con explicación, nunca simulando que funcionan.

### ToolWorkspace

Patrón común: breadcrumbs discretos → título/descripcion de 1 línea → opciones/contexto → acciones reales → paneles Input/Output → errores contextuales → ayuda mínima. No añadir un “status strip” por decoración.

### CodeEditor / OutputPanel

Un editor real y accesible (por ejemplo CodeMirror 6); syntax highlighting sensible, numeración de líneas, wrap configurable, selección, copiar, keyboard shortcuts sin bloquear los nativos. Evitar `contenteditable` con HTML interpolado. Output read-only si procede. Estados: vacío, válido, inválido, procesando si existe operación asíncrona, resultado. Resultados largos con scrolling controlado; archivo descargable con nombre y MIME coherentes.

### ActionBar / SegmentedControl / CopyButton / Notices

Acción principal clara, opciones secundarias agrupadas; no duplicar copia en 4 sitios. Botones disabled cuando no haya output o la acción no aplique. Copiar comunica éxito **solo tras resolver clipboard** (manejar fallo). Errores detallados junto al input, no un banner global ficticio. Autocorrección de JSON/SQL no permitida como efecto oculto de “Format”; si se añade reparación futura, debe ser una herramienta distinta y explícita.

### ToolRegistry / CommandPalette / Favorites

Registro tipado con id, nombre, categoría, ruta, icono, términos de búsqueda, capacidad de “quick paste” y carga diferida. Reutilizar el registro en sidebar, directorio y paleta. Metadatos persistidos: únicamente IDs, tema y preferencias no sensibles. **Nunca** entradas, outputs, headers, JWT, SQL o datos de ejemplo editados. Limpiar la memoria del workspace al salir según política definida (no conservar secretos indefinidamente).

## 6. Pantallas maestras y referencias

### Home (`screenshots/01–03`)

Usar Home v2 oscura como referencia de layout, adaptando light y mobile. La Home debe mostrar búsqueda, Quick Paste básico, favoritos, recientes y directorio de las 12 utilidades. Quick Paste empieza vacío y propone rutas tras detectar formato probable; transferir solo ante acción explícita, sin guardar payload.

Corregir textos y acciones del mockup: Hash Generator soporta solo SHA-256/384/512 (no MD5/SHA-1); JWT Inspector **decodifica** sin verificar firma; las seis herramientas de V1.1 no son botones disponibles. No afirmar soporte que no está implementado. Iconos y branding igual que workspaces.

### JSON Studio (`screenshots/04–06`)

Usar dos paneles en escritorio y tabs Input/Output en móvil. Acciones: Validate, Format, Minify, indentación 2/4/tab, switch Code/Tree, Copy, Download, Reset, ejemplo sintético. La búsqueda y copia de ruta en árbol pueden implementarse de forma sencilla pero real.

**Regla obligatoria:** JSON con coma final es inválido. No presentar a la vez etiqueta “Valid JSON” y error. `Format` **no** modifica automáticamente entrada inválida ni produce output falsamente válido. Preservar input y mostrar parse error y ubicación cuando sea posible. El ejemplo por defecto debe ser estrictamente válido; los errores de demostración deben activarse conscientemente.

Eliminar de la versión real: “V8 WebAssembly Parse”, latencias `0.42ms`, bytes/flechas predeterminados no calculados. Tamaños en bytes/líneas **solo si se calculan de la entrada real**. La captura de Stitch es referencia geométrica, no de implementación.

### JWT Inspector (`screenshots/07`)

Representar raw JWT, header, payload, análisis de exp/nbf/iat, algoritmo declarado, marca de firma **not verified** permanente en V1 (no verificación criptográfica). Decodificar Base64URL/UTF-8 correctamente; avisar de formato/JSON inválidos. `exp` es una comparación temporal de una claim no verificada, **no** garantiza autenticidad ni autorización. El botón Load synthetic example es opcional y debe ser inequívoco.

Eliminar badges “RS256 safe”, “key matches rotations”, “security parameters verified”, “RFC 7519 compliant”, “zero packets emitted”, “latency”, “heap”, o claims inventadas. No sugerir que `kid` consulta una clave remota. URL/hostname ilustrativos deben ser marcados como ejemplo sintético.

### SQL Formatter (`screenshots/08`)

Opciones dialecto PostgreSQL/MySQL/SQLite, keywords upper/lower/preserve, indentación 2/4/tabs, raw/format pane, Format/Copy/Clear/Example. **Solo formato, no ejecución ni corrección semántica**. En ejemplos de SQL mal formado, mostrar error o limitación sin inventar AST validado. No añadir dialecto “Generic SQL” salvo que sea realmente soportado por la librería elegida y el alcance se acuerde.

Eliminar mensajes simulados de “fuzzy recovery”, AST depth, allocated heap, parser engine ready, 1.24ms latency. Conservar siempre exactamente el significado de la consulta o explicar límites del formatter.

## 7. Interacciones, movimiento y accesibilidad

- Hover/focus/pressed en 100–180 ms con `transform/opacity`; no animaciones perpetuas. Respeta `prefers-reduced-motion`.
- Botón activo con pequeña traslación (hasta 1px), no neon glow. No custom mouse cursors, emojis, ilustraciones de stock ni banners de hero genéricos.
- Focus visible, navegación por teclado, labels y descripciones, `aria-live` para avisos relevantes; los editores no deben impedir tabulación y zoom.
- Verificar contraste y estado de disabled en ambos temas, width 390px/768px/1440px, vacíos y entradas enormes.
- Paleta `Ctrl+K` con cierre de Esc y retorno de foco; drawers con cierre accesible. Prohibir doble submit en transformaciones costosas.

## 8. Privacidad y afirmaciones de producto

Todo input/resultado/transformation se procesa localmente. No mandar datos del usuario a endpoints, logs, analytics, crash reporters, direcciones de URL, localStorage, IndexedDB ni caché de servicio. Evitar dependencias que telemetran payloads. La aplicación puede enviar solicitudes de recursos estáticos, por lo que **nunca** afirmar “zero network packets” o “no trackers detected” sin pruebas concretas.

La ausencia de backend no convierte automáticamente cada herramienta en un sandbox seguro; prohibir cualquier `eval`, ejecución de código de entrada, shell, HTML dinámico no sanitizado o regex sin mitigaciones de bloqueo. CORS y navegador limitan futuras funciones HTTP; no prometer un cliente API completo.

Microcopy permitido tras implementación/verificación: “Runs locally in your browser” o “Inputs aren't uploaded”. No afirmar validación de firma JWT o validación SQL/JSON cuando solamente se ha formateado o parseado parcialmente.

## 9. Prohibiciones / red flags de Stitch

**NO hacer:** copiar el HTML generado literalmente; “simular” una función y pintar “Copied”; reescribir queries en el botón de formato; declarar JSON inválido como válido; derivar seguridad de algoritmo declarado JWT; usar `tailwindcss.com` CDN en producción; usar serif, márgenes arbitrarios, microtextos en móvil, múltiples acentos decorativos, falso estado de conexión/telemetría, enlaces que no funcionan, acciones sin handler real.

## 10. Criterios visuales para aceptar implementación

1. Home, JSON Studio, JWT Inspector y SQL Formatter comparten un único AppShell y tokens.
2. Tema claro conserva geometría e iconos; contraste y legibilidad revisados.
3. JSON móvil: paneles por tabs, sin scroll horizontal de página, accesibles con teclado/touch.
4. Acciones Copy/Reset/Download/Format/Validate solo muestran éxito si ejecutan de verdad; errores no destruyen el input.
5. Sidebar y paleta reflejan exactamente las 12 V1; roadmap futuro se distingue claramente.
6. Entrada/output no persisten ni salen del navegador. No métricas ni garantías inventadas.
7. Revisar **capturas reales de navegador** (desktop dark, light y 390 px) contra las referencias PNG antes de cerrar el bloque.


## 11. SvelteKit y fidelidad del diseño

- Las capturas Stitch marcan el resultado visual, **no** el framework: reimplementar en componentes `.svelte` con runes Svelte 5 (`$state`, `$derived`, `$props`) cuando correspondan, sin traducir literalmente HTML con listeners falsos.
- Prerender estático de Home y rutas de utilidades con `adapter-static`; la interfaz se hidrata y se vuelve interactiva en el navegador. Los componentes que necesiten `window`, `document`, `localStorage` o CodeMirror acceden únicamente durante montaje/eventos de cliente.
- No usar estado global mutable de payload en módulo importado por SSR/prerender. Quick Paste utiliza contexto de layout instanciado por render y consumible una vez, sin persistencia.
- No implementar la UI como una captura única o un layout pixel-perfect rígido: mantener proporciones de referencia en 390/768/1440 px con componentes reales, foco visible y tabs accesibles.
- No adoptar Tailwind CDN ni copiar el JavaScript de Stitch.

## Canvas2.1 interaction refinement (V2.2 RC)

Focus mode uses the viewport with a collapsible250px left inspector on desktop; stage coordinates stay unchanged and its usable width excludes that panel. Mobile starts with the inspector closed. Box selection intersects visible geometry; mixed properties are displayed explicitly. Selected connectors expose a screen-sized midpoint grip directly on the path. Hachure labels use theme ink on the mostly transparent background. Existing zinc/teal tokens and global shell geometry remain.
