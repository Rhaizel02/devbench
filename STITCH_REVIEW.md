# DevBench — Revisión tercera exportación de Stitch (2026-10-25)

## Resultado

**Aprobado como dirección visual, no como implementación.** Las cinco pantallas de la exportación v3 definen los tres patrones de herramienta y confirman variante light y mobile. Las tres pantallas Home aprobadas provienen de la exportación anterior (v2). No hace falta generar más pantallas en Stitch antes de iniciar Codex.

## Material contrastado

- `devbench_json_studio_desktop_dark`: captura + HTML.
- `devbench_json_studio_light_desktop`: captura + HTML.
- `devbench_json_studio_mobile_390px`: captura + HTML.
- `devbench_jwt_inspector_desktop_dark`: captura + HTML.
- `devbench_sql_formatter_desktop_dark`: captura + HTML.
- `quiet_engineering_workbench/DESIGN.md`: valores y microcopy contrastados con decisiones visuales anteriores.
- Home v2 dark/light/mobile, `DESIGN_DECISIONS.md`, `FEATURES.md`.

## P1 — Red flags si se copia literalmente en producción (absorber en Codex, no volver a Stitch)

1. **JSON Studio presenta JSON inválido como válido.** La captura muestra coma final en array, aviso de trailing comma y simultáneamente chip “Valid JSON”. El JS del mockup actualiza etiquetas/HTML, pero no efectúa el formateo real; el botón Copy da confirmación visual sin copiar los datos reales.
2. **SQL Formatter simula reparación/parseo.** La captura incluye advertencia de cierre de paréntesis, un output sintácticamente corregido y métricas “AST validated”/latencia/heap. Su JS copia SQL fijo, no un resultado calculado. No reescribir semántica ni validar AST sin soporte real.
3. **JWT mezcla inspección y seguridad verificada.** Aunque avisa “signature not verified”, la UI afirma “RS256” como seguro, matching de `kid`, cumplimiento RFC, emisiones de red cero y análisis de seguridad no sustentados. Esas conclusiones deben eliminarse; decodificar no es verificar.
4. **Afirmaciones técnicas ficticias.** Los mockups mencionan “V8 WebAssembly Parse”, latencias de milisegundos, allocated heap, 'client sandbox', “zero telemetry packets”, y resultados de verificación no medidos.

## P2 — Correcciones visuales y UX integradas en el sistema

- Uso de serif inesperada en toolbars/tablas/metadata pese a definir Geist; hay que asegurar tipografía en componentes.
- El `DESIGN.md` exportado introduce segundo acento azul (`#38BDF8`), botones de 26–32 px y un status strip de latencia, en contradicción con el baseline de DevBench. El nuevo `DESIGN.md` cancela esas decisiones.
- Mobile JSON muestra buen patrón tabs pero demasiado texto auxiliar y estados sintéticos; optimizar jerarquía y espacio táctil >=44 px.
- Home v2 tiene nombre/logotipo ligeramente distinto y claims fuera de contrato (Hash MD5/SHA-1, JWT “signature validity”); normalizar.
- Las cinco pantallas no garantizan por sí mismas funcionalidad ni accesibilidad. Los HTML usan Tailwind CDN y handlers incompletos; solo son referencia visual.

## Decisión

- **No hay P0** de producto en lo diseñado.
- **No bloquear diseño por P2**; resolver directamente en la implementación con un único sistema de componentes.
- **Los P1 se convierten en requisitos verificables del core**, no en más iteraciones de Stitch.
- Codex primer bloque: AppShell, Home, command palette, tema/favoritos/recientes/Quick Paste básico y JSON Studio funcional; JWT/SQL después.

## Fuentes normativas dentro del handoff

1. `FEATURES.md`: alcance funcional.
2. `DESIGN.md`: sistema visual y comportamiento UI.
3. `screenshots/`: referencias de apariencia, no datos ni semántica reales.
4. `CODEX_B1_PROMPT.md`: tarea ejecutable del primer bloque.

## Adaptación a Svelte

Esta revisión solo valida diseños. El handoff original mencionaba Vue en el stack, sustituido por Svelte 5 + SvelteKit 3 según `ARCHITECTURE.md`. Los HTML de Stitch no son componentes reutilizables; CodeMirror se monta solo en cliente.
