# DevBench — Roadmap

## V1.3 — Text & Test Data Utilities

26 entradas disponibles. TEXT-02 añade contador Unicode en vivo y límite informativo sin alterar conversiones. UTIL-03 Test Data Generator incorpora corpus locales exactos/máximos/por palabras/párrafos y generación/validación numérica EAN-13 / GTIN-14 con checksum, lotes únicos Web Crypto y exportación. UI/README documentan límites de entrada, fallback, corte de palabras, espacios finales y ausencia de asignación GS1. Motores puros y carga diferida; memoria por instancia y metadatos únicamente en persistencia. Aceptación y capturas en VALIDATION.md.

P0/P1 se corrigen antes del cierre. P2 para próximos bloques: ampliación de pruebas de lector de pantalla/navegadores y ajustes menores de densidad. El fallback de puntos de código y los límites explícitos son comportamiento documentado. V1.4 y Architecture Canvas permanecen fuera de esta entrega.

La auditoría pública V1.2 ya está completada en [PRODUCTION_VALIDATION.md](PRODUCTION_VALIDATION.md). Los bloques siguientes conservan su estado histórico; no atribuir ese informe de producción a V1.3.

## Histórico hasta V1.2

Las 12 herramientas V1, 6 V1.1 y 6 individuales V1.2 más Pipeline Builder están implementadas: 25 entradas utilizables. Los estados `available` dependen de motores y pantallas reales. `GOAL_PROGRESS_V12.md` y `screenshots/actual/v12-checks.json` documentan V1.2; la matriz `release-matrix.json` y la tabla siguiente conservan V1/V1.1. `VALIDATION.md` conserva evidencia histórica y por hito.

| Bloque / hito | Contenido | Estado |
|---|---|---|
| B1 | Base SvelteKit estática, shell/Home, temas, favoritos, recientes, paleta, Quick Paste básico y JSON Studio | Completo |
| B2 / A | JSON Diff, JSON ↔ YAML, Base64 Toolkit, URL Toolkit | Completo |
| B3 / B | JWT Inspector, Hash Generator, SQL Formatter, Regex Tester | Completo |
| B4 / C | Text Diff, ID Generator, Timestamp Converter e integración V1 | Completo: 12/12 V1 |
| B5 / D | JSON ↔ CSV, JSON → Code, cURL Inspector | Completo |
| B6 / E | Cron Explorer, String Toolkit, SQL IN Builder y Quick Paste con múltiples destinos | Completo: 18/18 |
| F | Matriz de release, privacidad, responsive/temas, instalación limpia, dependencias, documentación y CI final | Completo; [CI validada](https://github.com/Rhaizel02/devbench/actions/runs/40161871703) y evidencia en VALIDATION.md |

## Checkpoints publicados

- [A — datos/codificación](https://github.com/Rhaizel02/devbench/commit/100d6a5063a8bafba416bb6a41d530ebe6a26fcd)
- [B — seguridad/backend](https://github.com/Rhaizel02/devbench/commit/71ccb7062f3900438fb6bdd45734bbc618deacd6)
- [C — V1 completo](https://github.com/Rhaizel02/devbench/commit/7bd59ab3d68b06967ca48802b3dc5dc2a4e04e12)
- [D — datos/código/cURL](https://github.com/Rhaizel02/devbench/commit/772d3f790a85f2189caf5ab2570e668de578d6fb)
- [E — 18 herramientas](https://github.com/Rhaizel02/devbench/commit/b3cc31ed524bdb67df348c4b6667e50fa29d8ec7)

Las limitaciones de CSV, inferencia, cron avanzado, fechas, SQL literal y privacidad se documentan expresamente en README/workspaces. Solo se corrigen P0/P1 antes de cerrar; pequeños ajustes de densidad/alineación son P2.

## V1.2 — Backend & Connected Workbench

| Hito | Alcance | Estado |
|---|---|---|
| A | JSON Query Explorer, JSON Schema Lab | Publicado y CI verde |
| B | HTTP Request Builder, HTTP Headers Inspector | Publicado; regresión de relevancia de paleta corregida y verificada en C |
| C | Log & Stack Trace Inspector, Environment Comparator | Publicado y CI verde |
| D | Handoffs explícitos en memoria y Pipeline Builder | Publicado y CI verde |
| E | 25 rutas, instalación limpia, privacidad, temas/tamaños, Node/Cloudflare y cierre | Publicado y CI verde; evidencia en GOAL_PROGRESS_V12.md |

Fuera de V1.2: auditoría exhaustiva contra Cloudflare público (Goal posterior), PWA/offline, OpenAPI, EXPLAIN, backend/usuarios y recetas persistentes. El pipeline actual es lineal, local y acotado, sin scripts, ramas o requests. No se accede a la cuenta Cloudflare ni se afirma verificación de producción.

