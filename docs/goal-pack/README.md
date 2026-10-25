# DevBench — Goal pack

## Contenido

- `DEV_BENCH_AUTONOMOUS_GOAL.md`: contrato detallado para Codex, con fases y verificaciones.
- `START_GOAL.txt`: comando corto `/goal` para pegar en la conversación de Codex.

## Instrucciones de uso (Codex de escritorio en Windows)

1. Abre el repositorio local **Rhaizel02/devbench** de siempre y comprueba que tienes el código actualizado. No abras un repositorio nuevo.
2. Copia `DEV_BENCH_AUTONOMOUS_GOAL.md` a la **raíz** del repositorio. No sustituyas `AGENTS.md`, `DESIGN.md` ni el resto de documentos existentes.
3. Inicia una conversación de Codex con acceso a ese repositorio. Pega el contenido de `START_GOAL.txt` como **un único mensaje**. Si `/goal` no está disponible, habilita Goals según la documentación de tu versión; como alternativa ejecuta el mismo texto sin `/goal`, pero entonces no tendrás su continuidad autónoma entre turnos.
4. Configura/verifica por separado el mecanismo Auto Resume que uses. `/goal` por sí solo puede pausarse por cuota y necesitar reanudación manual. No es un método para saltarse cuotas.
5. Deja la app/sesión y el repositorio disponibles según exija tu configuración local. No hay garantía de que una ejecución continúe durante 24 h, especialmente si Windows suspende el equipo, falta permiso, cambian las credenciales o se agota el presupuesto.
6. Al terminar, recupera el SHA final y el resumen de Codex; después podremos contrastar los hitos con el código real de GitHub y solo frenar si aparecen P0/P1.

**Alcance:** las 17 herramientas pendientes + integración, Smart Input básico mejorado, pruebas y pulido. No añade backend, despliegue externo, PWA o pipelines.

**Fecha de referencia:** 2026-10-25. **Commit inicial confirmado:** `cbb518bc0d2327fbf4da42925a79098a801832ae`.
