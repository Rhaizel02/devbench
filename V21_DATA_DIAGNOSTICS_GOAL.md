# DevBench V2.1

Implementation continuation note: the complete verbatim user contract and elaboration follow. Current acceptance, discovered parser tolerances and exact next action live in GOAL_PROGRESS_V21.md. Implemented XML uses strict lexical declaration/entity/namespace/character checks before a worker-local fail-on-warning DOM parser; no active DOM or remote resolution. Conversion preserves the versioned ordered AST. PostgreSQL distinguishes original, derived and heuristic observations and root-inclusive counters. See docs/DATA_DIAGNOSTICS_V21_ACCEPTANCE.md for the final requirement/evidence matrix. Canvas domain/persistence/backups remain byte-unchanged from main; only its catalog-count test follows the new total. The RC remains isolated; this contract never authorizes a V2.1 merge to main.

## Verbatim user contract

DEVBENCH V2.1 — DATA DIAGNOSTICS: POSTGRESQL EXPLAIN ANALYZER + XML TOOLKIT

OBJETIVO: entregar dos herramientas de desarrollo profesional, funcionales y totalmente locales. Esta ejecución debe terminar con una Release Candidate V2.1 en una rama independiente, 30 herramientas disponibles, pruebas reales, documentación, capturas, commits publicados y CI verificada.

IMPORTANTE: NO ES UN GOAL PARA PLANIFICAR. Debes DISEÑAR, IMPLEMENTAR, PROBAR, REVISAR Y ENTREGAR. Puedes utilizar todo el razonamiento y las iteraciones que necesites para alcanzar calidad real; no añadas funcionalidades artificiales ni repitas tests innecesariamente solo para consumir tokens.

================================================== 0. ARRANQUE Y PERSISTENCIA DEL CONTRATO

PRIMERA ACCIÓN OBLIGATORIA:

1. Lee íntegramente este prompt. Si Codex lo convierte en un attachment "pasted-text-*.txt", encuentra y lee el archivo COMPLETO, no únicamente la vista previa.
2. Crea "V21_DATA_DIAGNOSTICS_GOAL.md" dentro del repositorio y conserva en él íntegramente las instrucciones de este prompt.
3. Amplía el contrato hasta más de 18.000 caracteres sustantivos: decisiones técnicas, casos límite, modelo de datos, hitos H0–H9, UX, seguridad, aceptación, riesgos y pruebas.
4. Crea "GOAL_PROGRESS_V21.md" con hitos, estados, SHA, pruebas, decisiones, incidencias y siguiente acción exacta.
5. Si se compacta el contexto, vuelve a leer ambos archivos, inspecciona el repositorio y retoma el siguiente trabajo incompleto.
6. Los documentos son herramientas de continuidad, NO entregables suficientes. CONTINÚA IMPLEMENTANDO después de crearlos.
7. No solicites otro prompt salvo bloqueo real P0/P1, falta de permisos o conflicto que no puedas resolver sin arriesgar datos/código.

==================================================

1. BASE Y ESTRATEGIA DE RAMAS
   ==================================================

Repositorio: Rhaizel02/devbench.

Estado conocido:

- main: c3cd929a5aea231991973abd5744def9d13cf740
- 28 herramientas disponibles.
- OpenAPI V1.5 ya integrado.
- Architecture Canvas V1.4 en main.
- Architecture Canvas 2.0 está en "feature/architecture-canvas-v20", SHA a289fcfd9f54e35e0cd60b8c6a3123cbe88457d2, pendiente de aceptación y NO fusionado.

Haz fetch y verifica HEAD/status/ramas antes de actuar. No dependas ciegamente de estos SHAs si el remoto ha avanzado.

Crear "feature/data-diagnostics-v21" DESDE main actualizado.

NO fusionar Canvas 2.0.
NO fusionar V2.1 en main.
NO cherry-pick de cambios de Canvas 2.0.
NO reescribir historial ni force push.
NO alterar archivos de proyectos IndexedDB ni schemas de backups Canvas.

Objetivo de catálogo: 28 herramientas actuales + 2 nuevas = 30.

Nuevas entradas:

- BACK-11 / sql-explain-analyzer / Backend
- DATA-07 / xml-toolkit / Data

Si existen identificadores nuevos en HEAD, resolver conflictos sin sobrescribir herramientas y documentar la decisión.

Antes de desarrollar, leer:

- AGENTS.md
- ARCHITECTURE.md
- DESIGN.md
- FEATURES.md
- ROADMAP.md
- VALIDATION.md
- package.json
- tool-registry.ts
- tool-workspaces.ts
- componentes CodeEditor/TextWorkspace/OutputActions
- SQL Formatter
- JSON Studio
- JSON ↔ YAML
- JSON ↔ CSV
- JSON Query Explorer
- JSON Schema Lab
- Pipeline Builder
- handoffs existentes
- pruebas y convenciones Playwright

Reglas del stack:
Svelte 5, SvelteKit 3, TypeScript strict, Vite, Tailwind 4, adapter-static y Cloudflare Pages. Motores puros TypeScript siempre que sea razonable, UI Svelte separada, renderizado client-side para APIs de navegador.

Sin React, backend, autenticación, base de datos nueva, analítica, telemetría ni ejecución remota de consultas.

Privacidad DevBench: inputs y outputs únicamente en memoria. Canvas conserva su excepción IndexedDB, pero NINGUNA de las dos herramientas nuevas puede persistir payloads.

H0 — ARQUITECTURA Y DISEÑO

Inspeccionar interfaces reales y capturas existentes.

Crear una propuesta concreta de UX para ambas herramientas siguiendo DESIGN.md. Deben sentirse como herramientas profesionales de análisis, no como formularios genéricos.

SQL Analyzer:

- Editor de entrada.
- Resumen compacto y métricas.
- Navegador de árbol jerárquico.
- Panel de detalle contextual.
- Lista de hallazgos verificables.
- Comparador de planes.

XML Toolkit:

- Editor de fuente.
- Acciones de transformación.
- Vista de árbol.
- Explorador XPath.
- Conversión XML/JSON.
- Panel de resultado/copia/descarga.

Diseño:

- Priorizar información útil antes que decoración.
- Dark/light impecables.
- Tipografía legible, tablas densas donde aporten utilidad.
- Alineación y jerarquía de información cuidadas.
- Filtros, empty/error/loading y resultados truncados.
- Mobile usable a 390px; tablet 768px; desktop 1440px.
- No diagramas gigantes que dependan de scroll horizontal en móvil.
- Navegación teclado y foco visible.
- Sin modales innecesarios.
- No alterar el shell global salvo integración de catálogo.

Documentar la dirección antes de implementar masivamente UI. Las capturas finales deben proceder de Chromium real.

H1 — POSTGRESQL EXPLAIN: PARSER Y MODELO

Implementar un analizador serio de planes PostgreSQL.

INPUT PRINCIPAL:

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT JSON)

También aceptar EXPLAIN (FORMAT JSON) sin ANALYZE; reconocer ausencia de métricas reales. El objetivo principal es JSON estructurado y fiable.

No ejecutar esta consulta desde DevBench. Mostrar instrucciones y ejemplos copiables, explicando que EXPLAIN ANALYZE ejecuta la sentencia en PostgreSQL y puede tener efectos secundarios para SQL de escritura; usar planes obtenidos conscientemente por el usuario.

Aceptar formas reales PostgreSQL:

- Array JSON de planes.
- Documento con propiedad Plan.
- Root metadata (Planning Time, Execution Time, Settings, Triggers, JIT, etc.) cuando esté presente.
- Árbol recursivo Plans.
- Variaciones legítimas entre versiones.
- Planes sin actual timing.
- Planes sin BUFFERS.
- Campos desconocidos preservados como metadatos inertes.

Estudiar documentación oficial de PostgreSQL antes de fijar interpretaciones.

Soportar nodos habituales:
Seq Scan, Index Scan, Index Only Scan, Bitmap Index/Heap Scan, Nested Loop, Hash Join, Merge Join, Sort, Incremental Sort, Aggregate, GroupAggregate, HashAggregate, Limit, Gather, Gather Merge, Materialize, Memoize, CTE Scan, Subquery Scan, Append, Merge Append, ModifyTable y otros encontrados en fixtures reales.

El parser no debe rechazar todo un plan simplemente por un Node Type desconocido. Mostrarlo de forma genérica con sus metadatos.

MODELO:

- PlanDocument y PlanNode normalizados.
- ID/ruta estable dentro del árbol.
- Tipo de nodo.
- Relación/índice/alias cuando existan.
- Costes estimados.
- Filas estimadas.
- Ancho estimado.
- Filas reales.
- Loops reales.
- Startup/total time reales, si existen.
- Buffers hit/read/dirtied/written.
- Temp blocks e I/O timing.
- Rows Removed by Filter/Join Filter.
- Sort Method, Sort Space, Hash Batches/Buckets.
- Workers y parallel metadata.
- CTE/SubPlan/InitPlan relationships.
- Trigger/JIT/Planning/Execution metadata cuando esté disponible.

NO asumir que todos estos campos existen.

Preservar diferencia entre ausencia, cero y dato inválido.

Errores contextuales con rutas y tipos; ningún resultado parcial debe sustituir al último válido silenciosamente.

LIMITES:

- Definir límite inicial razonable de entrada, por ejemplo 2 MiB.
- Profundidad y total de nodos explícitos.
- Controles para cadenas gigantes.
- Control de tiempo/worker si aporta cancelación real.
- Prevenir recursión infinita o stack overflow.
- No hacer render de todos los nodos de golpe en planes grandes.
- Worker cancelable y versionado cuando resulte apropiado, reutilizando patrones del OpenAPI Explorer.
- Nunca fingir que un setTimeout puede interrumpir trabajo síncrono que bloquea el hilo principal.

Pruebas con JSON válido, inválido, sin métricas, grande, con workers, nested loops y metadatos poco comunes.

Commit/push tras este bloque funcional o checkpoint coherente.

H2 — INTERPRETACIÓN CORRECTA Y MÉTRICAS

Este bloque es prioritario: un analizador de planes que muestre métricas engañosas es peor que uno sencillo.

CONTRATO SEMÁNTICO:

1. PostgreSQL cost es una unidad abstracta del planner. Nunca etiquetarlo como milisegundos.

2. Actual Startup Time y Actual Total Time suelen expresarse por ejecución/loop. Explicar y calcular valores derivados solo donde corresponda, etiquetando la aproximación.

3. Actual Rows y Actual Loops deben interpretarse correctamente. Diferenciar filas medias por ejecución y volumen agregado aproximado.

4. Los tiempos de nodos padres incluyen trabajo de hijos. No sumar todos los Actual Total Time como si fueran tiempos exclusivos.

5. Parallel workers introducen matices de interpretación: no presentar una suma ingenua como tiempo real de pared.

6. BUFFERS puede contener contadores inclusivos o agregados de subárbol: no sumar indiscriminadamente nodos y declarar un total falso.

7. Planning Time y Execution Time son magnitudes diferentes; no deducir una de otra.

8. Cuando TIMING OFF está activo, no inventar node timings.

9. Cuando el plan carece de ANALYZE, mostrar claramente "estimaciones solamente".

10. Instrumentation overhead, caché, LIMIT, estadísticas obsoletas, parametrización y configuración pueden afectar resultados. Comunicar incertidumbre sin abrumar.

MÉTRICAS:

Crear resumen:

- Tiempo total real si está disponible.
- Planning Time.
- Estimated total cost.
- Node count.
- Número de scans y joins.
- Filas estimadas vs reales.
- Número de loops.
- Buffers e indicadores de temp I/O.
- Workers planificados/lanzados.
- Hallazgos principales.

Calcular ratio de cardinalidad entre filas estimadas y observadas con política documentada para estimado 0, real 0, loops 0 y valores ausentes.

Separar indicadores:

- Métricas originales.
- Métricas derivadas.
- Heurísticas.
- Advertencias no concluyentes.

Agregar tooltips breves y explicación de fórmulas.

Un diagnóstico debe contener:

- Evidencia exacta.
- Nodo afectado.
- Motivo de interés.
- Advertencia de incertidumbre.
- Acción de investigación sugerida, cuando sea pertinente.

Nunca prometer que añadir un índice mejora una consulta.

H3 — VISUAL EXPLAIN ANALYZER

Crear herramienta visual utilizable con contratos reales.

Pantalla principal:

A. Entrada:

- Pegar JSON o archivo local.
- Ejemplo sintético pequeño.
- Ejemplo complejo con JOIN y BUFFERS.
- Clear/reset.
- Formato detectado, errores y aviso de privacidad.

B. Resumen:

- Métricas relevantes en una zona compacta.
- Estado analyzed/estimated only.
- Estadísticas de estructura.
- Plan identification opcional.

C. Árbol:

- Nodos expandibles/colapsables.
- Jerarquía real.
- Tipo, relation, filas, loops, estimated cost y actual time.
- Selección de nodo sincronizada con detalle.
- Identificación contextual de ramas complejas.
- Buscar por Node Type/relation/index.
- Filtrar nodos con métricas incompletas, alto ratio o I/O.
- Expand/collapse y navegación teclado.
- Soportar árboles grandes sin bloqueo notable.

D. Panel contextual:

- Raw attributes seguros y limitados.
- Información normalizada.
- Cálculos derivados con unidades.
- Filter/Index Cond/Join Filter cuando existan.
- Buffers/Sort/Hash/Workers.
- Explicación de por qué el nodo está destacado.
- Copiar detalles estructurados o descargarlos.

E. Vista de hallazgos:

- Clasificación por evidencia e impacto probable, no severidades arbitrarias.
- Cardinalidad subestimada/sobreestimada.
- Nested Loop repetitivo.
- Temporary disk spill.
- Sequential scan potencialmente relevante.
- Sort externo.
- I/O elevado en relación con otras partes del plan.
- Workers previstos vs lanzados.
- Rows Removed by Filter altos cuando resulten informativos.
- Estadísticas insuficientes para diagnosticar.

Las heurísticas deben ser conservadoras.

Ejemplo:
No indicar "índice faltante" únicamente porque exista un Seq Scan.
No afirmar "cuello de botella demostrado" por un nodo padre con tiempo inclusivo alto.
No inferir "problema de caché" por un único contador.

Controles para alternar:

- Estructura.
- Coste estimado.
- Tiempo observado.
- Cardinalidad.
- I/O.

No crear una falsa heatmap con escalas engañosas; usar escalas documentadas y valores visibles.

Visualización Svelte/CSS preferida frente a incorporar un framework gráfico grande, salvo justificación técnica clara.

H4 — SOPORTE TEXTUAL Y COMPARACIÓN DE PLANES

FORMATO TEXTO:

PostgreSQL produce frecuentemente "EXPLAIN ANALYZE" en texto plano.

Investigar si se puede implementar un parser estructural fiable de un SUBCONJUNTO documentado de texto:

- Node indentation/arrow hierarchy.
- Cost/rows/width.
- Actual time/rows/loops.
- Buffers.
- Planning/Execution Time.
- Identificación de tipos comunes.
- Lines de Filter/Index Cond.

Implementar este subconjunto si puede distinguirse de forma robusta. Los campos desconocidos o líneas no interpretables deben conservarse como texto/diagnósticos; no fabricar un árbol aparentemente exacto a partir de una estructura dudosa.

No es obligatorio prometer equivalencia universal con FORMAT JSON. Si el análisis textual no tiene suficiente confianza, mostrar una explicación clara y ofrecer la instrucción para generar FORMAT JSON. El flujo JSON y su exactitud tienen prioridad.

COMPARADOR:

Añadir "Compare plans" local:

- Plan anterior vs posterior.
- Ambos pegados o importados localmente.
- Vista lado a lado.
- Execution/Planning time, filas, buffers y nodos.
- Diferencias absolutas y porcentuales cuando los datos son comparables.
- Indicar ausencia de datos sin inventar ceros.
- Identificar cambios de estructura: join types, scans, índices, orden de ramas.
- Navegar visualmente ambas jerarquías.
- Cuando los árboles difieran, NO asociar automáticamente nodos que no puedan emparejarse con suficiente confianza.
- Conservar sensibilidad al contexto y al entorno experimental.

Una comparación de 10 ms frente a 20 ms NO prueba por sí sola que una versión sea peor en producción: caché, parámetros, datos y medición influyen.

Exportar informe de comparación con valores y advertencias.

Pruebas con planes iguales, cambios de coste, cambios estructurales, planes sin ANALYZE y distintas cantidades de loops.

H5 — XML TOOLKIT: PARSER Y SEGURIDAD

Construir una herramienta XML verdaderamente útil, no solo XML pretty-print.

Objetivo: formatear, validar documento bien formado, minificar preservando semántica, explorar el árbol, consultar XPath y convertir XML ↔ JSON.

INVESTIGAR:

- DOMParser de navegador.
- XMLSerializer.
- XPathEvaluator / document.evaluate.
- Alternativas pequeñas especializadas si son necesarias.

Elegir la arquitectura que mejor equilibre seguridad, soporte de namespaces, rendimiento, bundle y portabilidad.

REQUISITOS OBLIGATORIOS:

- Procesamiento local.
- Ninguna petición HTTP a entidades o recursos externos.
- Rechazar DOCTYPE/DTD y declaraciones de entidades, incluidas variantes maliciosas/obfuscadas, mediante un preflight robusto que no dependa de un simple regex frágil.
- No resolver entidades externas ni URLs.
- No cargar XSLT externo.
- No evaluar scripts.
- No usar innerHTML/HTML no sanitizado.
- No insertar XML importado como DOM activo de DevBench.
- No renderizar SVG importado como elemento ejecutable.
- No descargar esquemas XSD.
- La visualización es texto o nodos DOM construidos de forma segura.
- Límite claro de bytes, profundidad, nodos, atributos y resultados.
- Errores visibles sin volcar inputs en consola.
- Reset real y cancelación cuando técnicamente sea posible.

XML bien formado NO es equivalente a validación contra XSD.

Mostrar explícitamente:

- Well-formed XML check.
- XSD validation: not supported, si no se implementa.
- XPath 1.0, si se utiliza el motor nativo del navegador.
- DTD/entities desactivados.

Soportar:

- XML declaration.
- Namespaces y prefijos.
- Atributos.
- Elementos vacíos.
- Texto.
- CDATA.
- Comentarios y processing instructions cuando sea seguro.
- Unicode.
- XML con mixed content.
- Espacios significativos y xml:space.
- Errores de estructura.
- Fuentes de archivo local.

Nunca modificar silenciosamente semántica o datos para hacer que un XML inválido parezca correcto.

Añadir fixtures:

- XML simple.
- XML empresarial anidado.
- SOAP envelope.
- XML con namespaces.
- XML mixto.
- CDATA.
- XML hostil con DTD/entity expansion.
- XML grande cercano a límites.

H6 — FORMAT / MINIFY / TREE EXPLORER

FORMATEO:

- Indentación 2/4 espacios.
- Documentos XML completos.
- Mantener atributos, namespaces, CDATA, comentarios y processing instructions soportados.
- Preservar el orden de elementos.
- No convertir caracteres de forma inesperada.
- Evitar pretty print con whitespace insertado en mixed content.
- Respetar xml:space="preserve".
- Si un fragmento no puede formatearse con garantías semánticas, conservar su estructura o marcar la limitación.
- No prometer identidad byte a byte: normalizar serialización no es preservar formato exacto.

MINIFY:

- Eliminar únicamente whitespace que sea demostrablemente de formato y cuya eliminación no altere los datos representados, o utilizar un modo conservador con las limitaciones claras.
- No eliminar espacios significativos.
- No colapsar contenido mixto.
- No borrar CDATA, comentarios o PI silenciosamente si forman parte del contrato.
- Evitar minificadores basados en reemplazos de regex globales.

EXPLORADOR:

- Árbol expandible.
- Elementos, atributos, texto y namespaces.
- Contadores de nodos, elementos, atributos y profundidad.
- Vista de ruta del nodo seleccionado.
- Copiar XPath orientativo o ruta estructural.
- Buscar por nombre, prefijo o contenido.
- Inspeccionar valor y atributos con truncado explícito.
- Controles expand/collapse y navegación teclado.

Integrar reutilizando los patrones de JSON Studio cuando sea apropiado, sin generalizar toda la arquitectura.

H7 — XPATH EXPLORER

Crear una experiencia XPath útil para analizar XML empresarial, especialmente documentos SOAP y con namespaces.

Requisitos:

- Campo de expresión XPath.
- XPath 1.0 nativo donde sea viable.
- Resolución de namespaces configurable.
- Prefijos y URI visibles.
- Explicar que un namespace default no equivale automáticamente a un prefijo XPath.
- Ejemplo sintético con namespace real.
- Resultados node-set, string, number y boolean correctamente tipados.
- Vista de coincidencias con tipo, ruta y contenido.
- Seleccionar resultado resalta/navega al nodo del árbol si es posible.
- Copiar y descargar resultados.
- Control del número de coincidencias y tamaño serializado.
- Errores de expresiones contextualizados.
- Edición de expresión no debe disparar automáticamente cálculos costosos.
- Debounce solo donde corresponda; preferir evaluación explícita para XML grande.
- No confundir funciones XPath con ejecución JavaScript o consultas de red.
- No aceptar expresiones/inputs que bloqueen indefinidamente la aplicación si existe una alternativa de presupuesto seguro.

Pruebas XPath con:

- selección de elementos;
- atributos;
- predicados;
- posiciones;
- namespaces;
- default namespace;
- resultados escalares;
- expresión inválida;
- cero matches;
- límites de resultados.

No anunciar XPath 2.0/3.1 ni XQuery salvo soporte real.

H8 — XML ↔ JSON Y HANDOFFS

Implementar conversión bidireccional con un contrato explícito de representación.

PROBLEMA A RESOLVER: XML y JSON no tienen estructuras equivalentes por defecto.

XML distingue:

- Atributos.
- Elementos.
- Text nodes.
- Mixed content.
- Orden de hijos.
- Namespaces.
- CDATA.
- Comments.
- Processing instructions.

Un convertidor ingenuo que aplasta estos casos pierde información.

Diseñar DOS modos si resulta razonable:

A. ESTRUCTURADO/REVERSIBLE (obligatorio):
Formato JSON documentado con un árbol de nodos tipados y ordenado, namespaces/atributos e información suficiente para reconstruir la semántica XML admitida.

XML → JSON estructurado → XML debe preservar los elementos semánticos relevantes: nombres cualificados, namespaces, atributos, orden, texto, CDATA y mixed content.

No prometer reproducción literal byte a byte, quoting original de atributos, codificación original o todas las entidades normalizadas por parser.

B. SIMPLE / DATA-ORIENTED (deseable):
Conversión cómoda para XML de datos ordinario, representando atributos con convención, texto y elementos repetidos con arrays cuando proceda.

Debe informar que es una representación práctica, potencialmente con pérdida, y no debe anunciar roundtrip sin pérdidas.

CONVERSIONES:

- XML → JSON.
- JSON estructurado → XML.
- JSON inválido produce error sin descartar entrada.
- JSON arbitrario simple solo si existe una regla clara para raíz/nombres válidos y tipos.
- Evitar colisiones de claves.
- Manejar namespaces sin inventar prefijos incorrectos.
- Evitar claves peligrosas o prototipos contaminados.
- Escapar siempre texto/atributos en serialización.
- Validar el documento resultante antes de ofrecerlo como correcto.
- Roundtrip y test de equivalencia estructural en fixtures.
- Límites de tamaño.

HANDOFFS:

- Permitir enviar JSON producido explícitamente a JSON Studio, JSON Query y JSON Diff cuando sus contratos/limitaciones sean compatibles.
- No transportar automáticamente XML sin confirmar.
- Transferencia local de un solo uso en memoria, reutilizando SendResult/handoffs.
- No persistir ni colocar payload en URL.
- Rechazar handoff si excede el límite del destino.
- Reutilizar controles de copiar/descargar y mensajes de error existentes.

Una transformación inválida no debe convertir datos sospechosos en contenido ejecutable.

H9 — CALIDAD, UX, RELEASE CANDIDATE

INTEGRACIÓN:

- 30 herramientas registradas como available.
- BACK-11 PostgreSQL EXPLAIN Analyzer.
- DATA-07 XML Toolkit.
- Carga diferida correcta en tool-workspaces.
- Rutas prerenderizadas.
- Home, buscador, paleta, favoritos, recientes.
- Navegación profunda/reload/404.
- No romper las 28 herramientas existentes.

No tocar modelo de dominio/persistencia de Architecture Canvas.

PRUEBAS SELECTIVAS:
Más intensas en parsers, presupuestos, XML hostil, XPath, mapping XML/JSON, semántica PostgreSQL, comparaciones y handoffs. Menos tests decorativos UI.

PostgreSQL:

- Plan simple y complejo.
- FORMAT JSON realista.
- Con/sin ANALYZE.
- With/without TIMING.
- BUFFERS con nodos anidados.
- Actual Rows/Loops.
- Workers y parallel aggregation.
- Parent inclusive timing.
- Node Type desconocido.
- Nested Loop/Hash/Merge/Sort/Seq Scan.
- Plan malformed y presupuestos.
- Comparación entre dos planes.
- Export estructurado.

XML:

- Well-formed/invalid.
- DTD/XXE/entity expansion bloqueado.
- XML namespaces.
- Atributos/mixed content/CDATA.
- Espacios significativos.
- Formato/minify.
- XPath con/ sin namespace.
- XML→JSON→XML estructurado.
- JSON→XML inválido.
- Texto hostil/escaping.
- Límites/cancel/reset.

PLAYWRIGHT:

- Pegado y archivo local.
- Análisis real de planes.
- Navegación de árbol.
- Cálculos mostrados.
- Filtros y selección.
- Comparación/export.
- XML format/minify y cambios de opciones.
- XPath real.
- Navegación de resultados.
- Conversión bidireccional.
- Handoff real.
- Copy/download con bytes verificados.
- Reset, error, empty/loading.
- Privacidad con marcadores sintéticos.
- Dark/light y 390/768/1440.
- Comprobar ausencia de scroll horizontal.
- Regresión básica OpenAPI/Canvas y catálogo.

CAPTURAS REALES:

- Explain: desktop dark/light.
- Explain: árbol complejo.
- Explain: hallazgos y nodo seleccionado.
- Explain: comparación.
- XML: formatter/validation.
- XML: árbol con namespaces.
- XML: XPath.
- XML: conversión reversible.
- Móvil de ambas herramientas.
- Estados vacíos/error relevantes.

No usar mockups para fingir estados implementados.

REVISIÓN FUNCIONAL MANUAL:
Probar un caso realista de consulta Spring Boot/PostgreSQL con join, sort y mala cardinalidad. Los hallazgos deben ayudar a comprender qué investigar, no producir recomendaciones universales sin contexto.

Probar un SOAP XML con namespaces, elementos repetidos, atributos y text nodes. XPath y roundtrip deben tener resultados comprensibles.

RENDIMIENTO:
Medir input pequeño, medio y próximo al límite. Registrar latencias como mediciones observadas, no promesas universales. Evitar render de miles de componentes innecesarios. No introducir workers/dependencias si no aportan beneficio demostrable.

DOCUMENTACIÓN:

- "docs/SQL_EXPLAIN_V21.md"
- "docs/XML_TOOLKIT_V21.md"
- "GOAL_PROGRESS_V21.md"
- "V21_DATA_DIAGNOSTICS_GOAL.md"
- Actualizar FEATURES, ROADMAP, VALIDATION y README en secciones pertinentes.
- Explicar dialectos/versiones/formats soportados.
- Diferenciar números medidos y derivados.
- Explicar por qué no se ejecuta SQL.
- Explicar XML bien formado vs XSD.
- Documentar convenciones XML/JSON.
- Registrar ejemplos sintéticos y límites.
- No rehacer documentación histórica sin motivo.

================================================== 2. PRIVACIDAD Y SEGURIDAD TRANSVERSAL

Ambas herramientas son exclusivamente de análisis local.

PROHIBIDO:

- Conectar a PostgreSQL.
- Ejecutar SQL.
- Enviar SQL/XML a servidores.
- Descargar entidades XML externas.
- Exponer payloads en URL/hash/history.
- Persistir payloads en localStorage, sessionStorage, IndexedDB o cachés PWA.
- Emitir contenido sensible en consola o errores.
- Ejecutar JS, HTML, XML, XSLT o expresiones arbitrarias como código.
- Introducir telemetría.
- Crear API server/proxy.
- Guardar contenido de usuarios en módulos singleton o estado SSR.

Se permiten exclusivamente recursos estáticos propios para cargar la app y dependencias empaquetadas localmente.

Toda importación, resultado y exportación debe ser acotada y segura.

Evaluar las dependencias nuevas por licencia, mantenimiento, tamaño, seguridad y compatibilidad. Preferir APIs nativas si son suficientes.

No ampliar permisos existentes.

================================================== 3. EJECUCIÓN AUTÓNOMA Y OPTIMIZACIÓN DE TOKENS

Trabaja por hitos H0–H9, pero agrupa commits de funcionalidades relacionadas si reduce overhead sin comprometer recuperación.

Recomendación de checkpoints:
A. Contrato + parser PostgreSQL.
B. Métricas + explorador SQL.
C. Comparador/texto y validación SQL.
D. Parser/formatter XML seguro.
E. XPath + árbol XML.
F. Conversiones + handoffs.
G. Pulido + regresiones + RC.

No es necesario verificar CI remota tras cada cambio cosmético. CI tras checkpoints coherentes y obligatoria al final.

No emplear tiempo en refactorizaciones generales de DevBench.

No pedir confirmación para resolver detalles locales razonables. Si una técnica elegida no funciona, investigar otra y registrar el motivo.

P0/P1:

- Pérdida de datos.
- Fugas de privacidad.
- Ejecución no autorizada.
- XML externo/entidades peligrosas.
- Métricas sistemáticamente incorrectas.
- Resultados de conversión silenciosamente corruptos.
- Bloqueo de UI crítico.
- Regresión grave de herramientas anteriores.

Se corrigen antes del cierre.

P2:

- Cobertura cross-browser ampliada.
- Detalles de UI.
- Formatos poco comunes correctamente rechazados.
- Mejoras de compatibilidad no comprometidas.
- Optimizaciones no justificadas por medidas.

P2 se documentan y NO generan rondas extras salvo que afecten criterios de aceptación centrales.

Para cada checkpoint:

1. Ejecutar tests proporcionales.
2. Corregir fallos.
3. Actualizar progreso y evidencia.
4. Commit.
5. Push remoto.
6. Registrar SHA.
7. Continuar el siguiente hito.

Si hay compactación, reabrir MD y continuar. No reiniciar pruebas ya validadas sin motivo.

================================================== 4. CONDICIONES DE FINALIZACIÓN

Se considera terminado únicamente si:

1. Las dos herramientas existen y son funcionales.
2. PostgreSQL JSON se interpreta correctamente sin inventar tiempos/costes.
3. Explain permite inspeccionar árboles, métricas, hallazgos y comparar planes.
4. Soporte textual cumple exactamente el subconjunto documentado, o comunica sus límites con precisión.
5. XML Toolkit valida well-formedness y rechaza DTD/entities peligrosas.
6. XPath funciona con namespaces y tipos reales.
7. XML/JSON estructurado pasa roundtrip semántico.
8. XML format/minify no corrompe silenciosamente mixed content.
9. Privacidad y límites de ambas herramientas están verificados.
10. Existen 30 entradas disponibles sin regresiones.
11. Instalación limpia, check, lint, tests, build y Playwright final correctos.
12. CI exacta del commit final en verde.
13. Capturas reales e informes publicados.
14. Sin P0/P1 abiertos.
15. Todo commiteado y subido; working tree limpio.
16. Rama "feature/data-diagnostics-v21" separada de main.
17. NO fusionar V2.1 a main sin aceptación del usuario.

Cloudflare debe publicar la preview de rama si el pipeline habitual está disponible. Si HTTPS remoto falla, registrar el error exacto sin desactivar TLS ni afirmar que pasó. Diferenciar claramente CI de despliegue de pruebas funcionales públicas.

INFORME FINAL:

- SHA final y rama.
- Herramientas entregadas.
- Capacidades PostgreSQL realmente verificadas.
- Capacidades XML realmente verificadas.
- Decisiones arquitectónicas y dependencias.
- Métricas/tests/CI.
- Capturas e informes.
- Preview exacta si está publicada.
- Limitaciones conocidas.
- P0/P1 y backlog P2.
- GO/NO-GO para revisión.

No afirmar universalidad de formatos ni exactitud de compatibilidad que no hayas probado.

RECUERDA: DevBench no necesita más botones. Necesita herramientas que sirvan para investigar problemas reales de desarrollo. SQL Analyzer debe enseñar a comprender el comportamiento del planner de PostgreSQL. XML Toolkit debe permitir trabajar con XML complejo sin perder información ni comprometer privacidad.

PRIMER PASO: leer completo este prompt, persistir contrato y progreso en MD y comenzar inmediatamente H0–H9 hasta entregar la RC.

## Technical decisions and acceptance elaboration

# V2.1 workbench direction

Use the existing zinc/teal tokens, Geist UI and JetBrains Mono values. Keep the global shell unchanged. The input editor occupies a bounded first panel; explicit Analyze/Format/Evaluate actions produce an inspectable workspace. No fictitious latency or security badges.

SQL: compact summary metrics above a split, vertically scrolling tree and node inspector. Tabs select Plan, Findings and Compare. A metric selector changes the visible numeric annotation, never inventing an exclusive-time heatmap. Dense aligned rows retain node type, relation, original units and a selected state. Findings link to their evidence node. Comparisons have separate trees and an exportable metric table. On mobile, tree/detail use tabs and comparisons stack.

XML: Source, Tree, XPath and Convert tabs with explicit actions and persistent-in-memory source. A bounded output editor reuses OutputActions. Namespace bindings are editable labeled controls. Tree results are text, not inserted imported markup. Mixed content, whitespace policy and conversion fidelity are visible beside the relevant controls. Errors retain input and invalidate actions for previous output.

Both tools: empty state explains the next action; synthetic examples are clearly marked. Cancel stops a worker, reset clears memory, and editing invalidates source-dependent results. Render at most 200 tree rows initially with explicit Show more. Keyboard arrows, Home/End and expand/collapse operate on the visible tree. Focus indication is not color alone. Mobile controls meet 44px targets, page content has min-width:0 and no horizontal page overflow. Actual Chromium captures at 390, 768 and 1440 pixels, in both themes, are the acceptance evidence.

No Canvas domain/schema/persistence changes. No localStorage/sessionStorage/IndexedDB payloads, URL payloads, network parsing or console input. Static worker chunks are legitimate resource requests. Imported labels and attributes are Svelte text interpolations only.

PostgreSQL domain: a normalized flat array of PlanNode references is independent from rendering. Original root metadata is retained per plan. Children use path IDs and raw attributes exclude nested Plans to prevent quadratic document copies. Cost never means milliseconds. Actual Rows and timings are per-loop observations; derived aggregate rows are labeled and finite-checked. Execution Time alone provides the execution summary, never a sum of node timings. Zero, missing and invalid are separate states. Unknown node types are accepted. Structural comparisons pair only same paths and signatures. Text parsing supports an explicit subset and rejects ambiguous indentation; unknown lines remain visible diagnostics.

Budgets: 2 MiB input; SQL 5,000 plan nodes, 128 plan levels, 100,000 JSON values, 128 KiB strings. XML 50,000 nodes, 128 levels, 256 attributes per element, 50,000 total attributes and 256 KiB values. JSON conversions may grow up to 8 MiB but handoffs remain bounded by each actual destination. Workers terminate on cancel, timeout, reset, input change and teardown. No setTimeout masquerading as synchronous cancellation. Every asynchronous answer is checked against a monotonically increasing operation ticket and source snapshot.

XML representation: typed ordered nodes retain qualified names, namespace URIs and declarations, ordered attributes and children, text, CDATA, comments and PI. Versioned structured JSON is the only accepted inverse mapping. JSON data projection is explicitly lossy and never pretends to be a reversible document. All JSON is validated before DOM construction, all node names and namespace bindings are checked, and generated XML is reparsed before being accepted. No prototype-driven merging or executable markup. Raw strings are Svelte text only.

XML whitespace: conservative mode preserves every text node. Reindentation is an explicit assumption for element-only data and never enters mixed content or inherited xml:space=preserve. Minification removes lexical markup whitespace, not meaningful text. Serialization normalization does not reproduce original bytes, quoting, encoding or entity spelling. XML 1.0 and UTF-8 are the accepted initial file/declaration contract. XPath 1.0 is explicit execution in a terminable worker, never auto-evaluation; 2,048 expression characters, 1,000 matches and 1 MiB result, with a 1.5-second processing budget. Namespace defaults do not automatically become unprefixed XPath names.

Checkpoints H0-H9: preserve this complete prompt and progress, document visual direction, prove the SQL parser and semantics, build inspector and comparison, then strict XML security/preflight, formatter/tree, XPath, reversible mapping and handoffs. Finally run privacy, responsive, realistic Spring/PostgreSQL and SOAP scenarios, full quality checks and exact-SHA CI. Capture real Chromium scenes and publish only the independent RC branch. Main and Canvas data models stay unchanged.

Acceptance and risk: malformed, unsupported and oversized input never becomes a silently partial current result. Source is retained on error. P0/P1 means data corruption, privacy leakage, executable input, dangerous entities, systematic semantic error, critical blocking or serious regression; these block GO. P2 covers disclosed uncommon formats, cosmetic limitations and expanded browser coverage. No unsupported version/format, future promise or driver latency is reported as a verified capability. The final report identifies the exact commit, tests, CI, normal-TLS preview state, real screenshots and the acceptance matrix.
