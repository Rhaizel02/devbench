# Codex — DevBench | BLOQUE 1: base SvelteKit + Home + JSON Studio

Trabaja **de principio a fin en este repositorio**. Objetivo: entregar un primer bloque **utilizable de verdad**, sin asumir que los prototipos de Stitch tienen comportamiento válido. Para no gastar tokens de más, ejecuta el bloque de forma integrada y pide aclaraciones solo si un bloqueo es inevitable.

## Lee primero (orden de autoridad)

1. `AGENTS.md` y `ARCHITECTURE.md` (stack, invariantes de privacidad y reglas de trabajo).
2. `FEATURES.md` (contrato funcional de 12 utilidades V1 + 6 V1.1).
3. `DESIGN.md` y `screenshots/01-home-dark-desktop.png`, `02`, `03`, `04`, `05`, `06` (diseño aprobado). `07` y `08` solo referencia futura.
4. `STITCH_REVIEW.md` para no reproducir resultados, claims y botones simulados.

Si el repositorio no tiene aplicación, inicializa una **única SvelteKit 3 + Svelte 5 + TypeScript strict + Vite** compatible con versión actual de `sv`; usa **Tailwind CSS 4**, `@sveltejs/adapter-static`, `@lucide/svelte`. Node 24 LTS recomendado; ajustar a requisitos reales. No usar Vue, React, SSR de runtime, stores externos, backend ni CSS/JS de Stitch CDN. Aprovecha código preexistente compatible en vez de borrarlo.

## Entrega funcional B1

**1. Base y estructura.** Enrutado SvelteKit `/` + `/tools/[slug]` alimentado por un registro tipado único. **Prerender** de Home y rutas conocidas sin fallback SPA, SSR habilitado solo en build; usar `entries()` para slugs dinámicos y verificar acceso directo al URL al servir build estático. Carga diferida del workspace JSON y de CodeMirror en cliente. Separar motores TypeScript puros de componentes Svelte; sin abstracciones hipotéticas.

**2. Shell/Home.** Layout responsive con sidebar desktop, drawer móvil accesible, header, categorías, directorio fiel a las **12 V1**, buscador global y paleta Ctrl/Cmd+K con keyboard/focus. Favoritos/recientes y preferencia `system|dark|light` (guardar **solo metadatos**). Quick Paste **básico** y local detecta probablemente JSON/JWT/URL/SQL y sugiere destino; transfiere en B1 **solo a JSON Studio** por clic explícito (otros destinos figuran como 'Coming later', sin engañar); transferencia one-shot en memoria por instancia, no singleton global SSR. No persistir payload. Herramientas no implementadas muestran página `Coming later` honesta, sin UI fingidamente operativa. Estados vacíos iniciales y textos veraces.

**3. JSON Studio completamente real.** Editor CodeMirror 6 con input, validate JSON estricto, Format (2/4/tab), Minify, Code/Tree, expand/collapse, búsqueda básica y copia de rutas JSONPath/Pointer, Copy Output, Download .json, Load synthetic example y Reset. Manejar JSON raíz escalar/null/arrays, Unicode, errores sintácticos contextualizados e input grande razonable. No autocorregir trailing commas; `{"a":1,}` es inválido. Conservar input tras error, no mostrar resultado viejo como actual. Input/Output split desktop y tabs accesibles móvil. En cliente montar/destruir CodeMirror correctamente.

**4. Calidad y entregables.** Aplicar tokens/UX de `DESIGN.md`, dark/light/system, keyboard, 390/768/1440 px. Evitar dependencia de fuentes/recursos remotos en runtime, `{@html}`/innerHTML con usuario, `eval`, payloads en URL/storage/logs, métricas/claims ficticios. Implementar tests Vitest centrados en core JSON y persistencia, 1–3 Playwright smoke si navegador disponible. `npm ci`, `npm run check`, `npm run lint`, `npm run test`, `npm run build` funcionando y CI GitHub Actions sencillo. README del proyecto con comandos, privacidad, arquitectura y estado funcional de herramientas; capturas **reales** para contraste visual si el entorno lo permite.

## Validaciones antes de terminar

- JSON inválido `{"a":1,}` produce error y **no** output válido; JSON válido `{"a":1,"b":[true,null]}` permite formatear/minificar/árbol/copiar/descargar; root `null` es válido.
- No se conserva input/output/JWT/SQL ni en storage, URL, logs ni estado compartido de servidor; favs/recientes solo tool IDs/tiempos.
- `/tools/json-studio/` funciona con refresh/direct link en el build desplegable; rutas `planned` claras y 404 para slug inexistente.
- Navegación, paleta, drawer, cambio de tema y tabs funcionan por teclado y touch; viewport 390 px sin scroll horizontal global.
- Revisar implementación real contra capturas Stitch **sin copiar contenido ficticio**. P0/P1 corregidos; P2 documentados para siguiente bloque.

## Cierre obligatorio

Ejecuta verificaciones. **Haz commit y push al remoto ya configurado**, e indica hash SHA completo del commit final; si no hay remoto o permisos, crea commit local y explica bloqueo (sin inventar publicación). Responde concisamente con funcionalidades reales, resultados de checks/tests, capturas/rutas revisadas, P0/P1/P2 y siguiente bloque sugerido. **No abrir iteraciones separadas por P2 menores**.
