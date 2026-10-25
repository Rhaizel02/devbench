# DevBench — Alcance funcional cerrado

> Estado: alcance funcional aprobado para V1 + V1.1. Nombre de trabajo: **DevBench**. Producto: herramienta web personal y proyecto de portfolio. Fecha: 2026-10-25.

## 1. Objetivo del producto

Workbench web para desarrolladores, especialmente útil en tareas cotidianas de backend y depuración. Debe abrir rápido, funcionar sin iniciar sesión y permitir pegar → transformar/inspeccionar → copiar en muy pocos pasos.

**Principios innegociables**
- **Local-first y privacidad:** procesar todo el contenido en el navegador. No subir JSON, JWT, SQL, textos ni secretos a ningún servidor.
- **Sin backend en V1/V1.1:** Svelte 5 + SvelteKit + TypeScript, compilación estática mediante Vite. Ver `ARCHITECTURE.md` (ADR-001) para el stack cerrado. PWA/offline queda en backlog hasta después de V1 estable.
- **Herramientas de verdad:** cada entrada genera un resultado real, sin botones decorativos ni resultados simulados en producción.
- **Rapidez:** sin pantallas intermedias, anuncios, login ni modales innecesarios.
- **Trazabilidad del alcance:** 12 herramientas V1 + 6 herramientas V1.1. Lo demás es backlog, no compromiso.
- **Portfolio:** repo público con arquitectura clara, accesibilidad, tests selectivos y una interfaz singular y pulida.

## 2. Las 12 herramientas V1

| ID | Herramienta | Contrato funcional mínimo |
|---|---|---|
| DATA-01 | JSON Studio | Validar, pretty-print con indentación ajustable, minificar, árbol expandible, búsqueda textual, copiar propiedad y ruta JSONPath sencilla. Error de parseo contextual sin perder input. |
| DATA-02 | JSON Diff | Dos entradas JSON, comparación estructural, cambios añadidos/eliminados/modificados, ruta de cada cambio; orden de claves sin falsos positivos. Arrays respetan orden. |
| DATA-03 | JSON ↔ YAML | Conversión bidireccional con mensajes de error claros; manejo seguro de tipos comunes. |
| ENC-01 | Base64 Toolkit | UTF-8 ↔ Base64; modo URL-safe opcional; errores de decodificación. |
| ENC-02 | URL Toolkit | Percent encode/decode, descomponer esquema/host/ruta/query/fragmento; editar query params y reconstruir. |
| SEC-01 | JWT Inspector | Decodificar JWT compacto sin verificar por defecto; header/payload, claims exp/nbf/iat, hora local/UTC, aviso explícito «decode ≠ verification»; sin persistir tokens. |
| SEC-02 | Hash Generator | SHA-256/384/512 con Web Crypto sobre texto introducido; formato hexadecimal; sin afirmar que el hash cifra el contenido. |
| BACK-01 | SQL Formatter | Formatear SQL seleccionando PostgreSQL/MySQL/SQLite; opciones de estilo (mayúsculas keywords, indentación), sin ejecutar consultas. |
| BACK-02 | Regex Tester | Expresión + flags + texto de prueba; coincidencias, rangos y grupos capturados; sustitución opcional; prevenir bloqueo con límites razonables. |
| TEXT-01 | Text Diff | Vista lado a lado o unificada de diferencias por línea, con controles para ignorar espacios finales. |
| UTIL-01 | ID Generator | Generación criptográficamente segura de UUID v4, UUID v7 y ULID; múltiples IDs y copia. |
| UTIL-02 | Timestamp Converter | Epoch segundos/milisegundos, ISO 8601, interpretación local/UTC, zonas horarias IANA y copia de formatos. |

## 3. Las 6 herramientas V1.1

| ID | Herramienta | Contrato funcional mínimo |
|---|---|---|
| DATA-04 | JSON ↔ CSV | JSON array de objetos ↔ CSV, elección de delimitador y encabezados; comunicar limitaciones de estructuras anidadas. |
| CODE-01 | JSON → Code | Inferir Java records y TypeScript interfaces, nombres configurables, campos opcionales y arrays; mostrar advertencia si hay datos insuficientes para inferir tipos. |
| BACK-03 | cURL Inspector | Parsear argumentos habituales de cURL en método, URL, headers, cuerpo. No enviar peticiones; no ejecutar shell ni JavaScript del input. |
| BACK-04 | Cron Explorer | Expresiones de 5 campos Unix y 6 campos Spring, explicación textual y próximas ejecuciones con zona horaria explícita. |
| TEXT-02 | String Toolkit | camelCase, PascalCase, snake_case, kebab-case, MAYÚSCULAS/minúsculas y slug; opciones para separadores. |
| BACK-05 | SQL IN Builder | Lista multilínea/CSV → lista para IN con modo strings/numbers, escapes literales por dialecto y salida parametrizada preferente. Advertir sobre SQL injection al construir SQL manualmente. |

## 4. Funcionalidades transversales

### Imprescindibles V1
- En el **Bloque 1**, Quick Paste es un detector heurístico **básico** (JSON/JWT/URL/SQL), sin prometer interpretación avanzada de Smart Input. Solo JSON Studio consume el dato transferido hasta que las otras herramientas estén implementadas.
- Home utilitario con buscador de herramientas, acceso a categorías y utilidades recientes.
- `Ctrl/Cmd + K`: command palette global; navegación por teclado; `Esc` para cerrar.
- Favoritos y preferencias en `localStorage`, exclusivamente metadatos inocuos (IDs de herramientas, tema, opciones no sensibles).
- Tema oscuro y claro; sistema de tokens consistente.
- Editor de código con numeración de líneas, resaltado adecuado y accesibilidad. Preferir un componente maduro antes que un editor casero.
- En todas las herramientas aplicables: ejemplos sintéticos explícitamente etiquetados, limpiar entrada, copiar, descargar, intercambiar entrada/salida cuando tenga sentido.
- Mensajes de error situados junto al input, estados vacíos explicativos, información de lo que hace la herramienta.
- URLs compartibles para abrir **la herramienta**, sin codificar el payload de usuario en enlaces.
- Layout desktop de trabajo y layout móvil útil sin scroll horizontal.

### V1.1 si no interfiere con la entrega
- Smart Input avanzado en Home: heurísticas locales para detectar JSON/JWT/SQL/URL/timestamp, mostrar varias sugerencias cuando exista ambigüedad y pedir confirmación antes de transferir datos a otra herramienta.
- PWA y disponibilidad offline (tras haber cacheado recursos), solo si no complica demasiado el stack.

### Backlog no comprometido
- Pipelines de transformaciones (primero secuencia lineal, luego nodos si se justifica).
- OpenAPI explorer y herramientas de logs.
- Presets importables/exportables sin datos secretos.
- Inspector de planes `EXPLAIN`, herramientas de redes.

## 5. Privacidad y seguridad

- No enviar inputs a APIs, analítica, almacenamiento remoto ni telemetría.
- No guardar entradas/salidas en `localStorage`, IndexedDB, cachés PWA ni URLs; tampoco tokens JWT.
- La previsualización debe tratar todo contenido como texto no fiable: no evaluar input, no ejecutar expresiones dinámicas arbitrarias, no renderizar HTML sin sanitizar.
- Las herramientas de inspección no deben presentarse como validadores de seguridad: en JWT distinguir claramente decodificación de verificación de firma.
- Utilizar generadores criptográficamente seguros (`crypto.getRandomValues`) cuando corresponda.
- Los errores no deben emitir a logs payloads sensibles.

## 6. Reglas de implementación

- Stack: Svelte 5 + SvelteKit 3 + TypeScript estricto + Vite + adapter-static, componentes compartidos, bibliotecas pequeñas especializadas solo cuando sean necesarias.
- Un registro tipado para herramientas (id, slug, ruta, categoría, nombre, keywords, icono y disponibilidad). SvelteKit se encarga de cargar cada página de forma diferida; no duplicar ese enrutado con un plugin de imports.
- Separar `core` puro (funciones de transformación comprobables) de UI Svelte.
- No incorporar Spring Boot por costumbre; reevaluarlo solo si hay funciones que necesiten servidor.
- Tests de lógica en parsers/conversores/casos límite; tests visuales/manuales y accesibilidad en la UI. Priorizar profundidad en JWT/regex/SQL parser frente a snapshots masivos.
- Commits por bloque coherente, `push` al remoto si está configurado; Codex debe proporcionar hash del commit final, resultados de pruebas y asuntos pendientes.

## 7. Definición de terminado V1

- Las 12 herramientas son funcionales y tienen casos de error, vacío, copiar y al menos un ejemplo válido.
- Home, navegación, favoritos y command palette operativos; diseño coherente oscuro/claro y móvil.
- Todas las transformaciones se ejecutan sin llamadas de red de datos de usuario.
- Sin P0/P1 abiertos, build limpio y tests relevantes pasando.
- README del repositorio explica objetivo, privacidad, arquitectura, instalación y capturas reales.
