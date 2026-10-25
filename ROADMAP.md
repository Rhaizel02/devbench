# DevBench — Roadmap

Las 12 herramientas V1 y las 6 V1.1 del alcance aprobado están implementadas. Los estados `available` dependen del motor y pantalla reales, no de una promesa del roadmap. La matriz final está en `screenshots/actual/release-matrix.json`; `VALIDATION.md` conserva la evidencia histórica y por hito.

| Bloque / hito | Contenido | Estado |
|---|---|---|
| B1 | Base SvelteKit estática, shell/Home, temas, favoritos, recientes, paleta, Quick Paste básico y JSON Studio | Completo |
| B2 / A | JSON Diff, JSON ↔ YAML, Base64 Toolkit, URL Toolkit | Completo |
| B3 / B | JWT Inspector, Hash Generator, SQL Formatter, Regex Tester | Completo |
| B4 / C | Text Diff, ID Generator, Timestamp Converter e integración V1 | Completo: 12/12 V1 |
| B5 / D | JSON ↔ CSV, JSON → Code, cURL Inspector | Completo |
| B6 / E | Cron Explorer, String Toolkit, SQL IN Builder y Quick Paste con múltiples destinos | Completo: 18/18 |
| F | Matriz de release, privacidad, responsive/temas, instalación limpia, dependencias, documentación y CI final | Ver `GOAL_PROGRESS.md` y `VALIDATION.md` |

## Checkpoints publicados

- [A — datos/codificación](https://github.com/Rhaizel02/devbench/commit/100d6a5063a8bafba416bb6a41d530ebe6a26fcd)
- [B — seguridad/backend](https://github.com/Rhaizel02/devbench/commit/71ccb7062f3900438fb6bdd45734bbc618deacd6)
- [C — V1 completo](https://github.com/Rhaizel02/devbench/commit/7bd59ab3d68b06967ca48802b3dc5dc2a4e04e12)
- [D — datos/código/cURL](https://github.com/Rhaizel02/devbench/commit/772d3f790a85f2189caf5ab2570e668de578d6fb)
- [E — 18 herramientas](https://github.com/Rhaizel02/devbench/commit/b3cc31ed524bdb67df348c4b6667e50fa29d8ec7)

Las limitaciones de CSV, inferencia, cron avanzado, fechas, SQL literal y privacidad se documentan expresamente en README/workspaces. Solo se corrigen P0/P1 antes de cerrar; pequeños ajustes de densidad/alineación son P2.

Fuera de esta entrega: PWA/offline, pipelines, OpenAPI, EXPLAIN, backend/usuarios y despliegue web. Requieren una decisión futura independiente.
