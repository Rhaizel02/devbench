# DevBench — Roadmap

**V1** son 12 herramientas; **V1.1** son otras 6. Una herramienta es `available` solo cuando hace lo prometido. Al cerrar un bloque contrastaremos el resumen de Codex con el commit real y priorizaremos P0/P1; P2 irán al backlog.

| Bloque | Contenido | Riesgo / pruebas |
|---|---|---|
| **B1 — ahora** | SvelteKit estático + shell/Home, temas, favoritos, recientes, paleta, Quick Paste básico, JSON Studio real | JSON estricto, privacidad, movilidad/teclado, rutas prerender |
| B2 | JSON Diff, JSON ↔ YAML, Base64 Toolkit, URL Toolkit | Unicode, conversiones reversibles, parsing y errores |
| B3 | JWT Inspector, Hash Generator, SQL Formatter, Regex Tester | Decode ≠ verify, hash Web Crypto, SQL no semántico, regex sin bloqueo |
| B4 | Text Diff, ID Generator, Timestamp Converter, pulido transversal | Entropía, fechas y zonas, errores de inputs |
| B5 — V1.1 | JSON ↔ CSV, JSON → Code, cURL Inspector | Escape, inferencia de tipos, no ejecutar comandos |
| B6 — V1.1 | Cron Explorer, String Toolkit, SQL IN Builder; opcional Smart Input avanzado | Timezones, inyección SQL, correctitud |

**Fuera de compromiso:** PWA/offline, pipelines de transformación, OpenAPI inspector, `EXPLAIN`, backend/usuarios. Solo explorar tras V1 estable y si aportan utilidad real.
