# AGENTS.md — reglas de Codex para DevBench

Antes de trabajar, leer `ARCHITECTURE.md`, `FEATURES.md` y `DESIGN.md` según la tarea. `CODEX_B1_PROMPT.md` describe el Bloque 1. Los PNG son **únicamente referencia visual**, no de lógica.

- Stack fijo: Svelte 5 + SvelteKit 3 + TypeScript strict + Vite + `adapter-static`, Tailwind CSS 4 y CodeMirror 6 cuando se necesite. Sin backend/autenticación/DB salvo autorización expresa.
- Mantener motores de transformación en **TypeScript puro**, UI en Svelte. Nada de stores globales, DI/pipelines genéricos o dependencias anticipadas sin justificación.
- Privacidad crítica: no cargar ni persistir payloads de usuario fuera de memoria de interfaz. Solo IDs de favoritos/recientes y tema en localStorage. Ningún payload en URL, logs, requests, storage o módulo singleton compartido por SSR.
- Todas las acciones mostradas deben ser reales: nunca resultados/copies/seguridad/tiempos inventados. Prototipos Stitch pueden mentir; implementar contrato de `FEATURES.md`.
- Prerenderizar páginas conocidas como sitio estático. Código que use browser APIs, CodeMirror o clipboard debe ejecutarse solo en cliente.
- Probar en proporción al riesgo; más foco en parseos, seguridad/privacidad y contratos de datos que en snapshots visuales. Revisar dark/light/mobile con screenshots reales.
- Al cerrar cada bloque: `check`, `lint`, `test`, `build`; commit y push al remoto configurado, proporcionar hash final. Solo P0/P1 bloquean; P2 van al backlog, sin rondas extra menores. No reescribir documentación/arquitectura por gusto.
