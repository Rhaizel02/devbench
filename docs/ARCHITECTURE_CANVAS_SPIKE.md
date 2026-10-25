# Architecture Canvas — spike técnico y visual

**Dirección recomendada: GO condicionado para construir el editor sobre Konva + svelte-konva.** El prototipo demuestra diagramas estructurados, tinta libre y navegación jerárquica dentro de un único lienzo. La decisión requiere revisión humana de esta experiencia; no equivale a aprobar ni entregar una V1.4 completa.

Base: `main` **`fa0490f5872262614ba9fe0370377295f3112fae`**, V1.3. Rama aislada: [feature/architecture-canvas-spike](https://github.com/Rhaizel02/devbench/tree/feature/architecture-canvas-spike). Se leyeron AGENTS, ARCHITECTURE, DESIGN y FEATURES. Svelte 5 / SvelteKit 3 / TypeScript strict / adapter-static / Tailwind 4 se mantienen. Home, sidebar y las **26 entradas públicas no se modifican**.

## 1. Comparación técnica

Investigación del 25-10-2026: documentación oficial, paquetes publicados y una implementación real con la opción seleccionada. No se construyen dos editores ni se presupone que una demo oficial equivale a una prueba en nuestro repositorio.

| Aspecto                  | Konva 10.9.0 + svelte-konva 1.0.1                                                                                                                                                                                       | Svelte Flow 1.7.0 (`@xyflow/svelte`)                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack                    | Wrapper con peer Svelte `^5.0.0`, Konva `8 - 10`. Verificado aquí con Svelte 5.57.1+, Kit 3 y TS strict mediante check/build/navegador.                                                                                 | Peer Svelte `^5.25.0`, sin React. Compatibilidad declarada Svelte 5; no se compila un segundo editor en este spike.                                                                                                                                       |
| SSR/estático             | [Solo cliente](https://konvajs.org/docs/svelte/SvelteKit.html): import dinámico dentro de `onMount`. La página mantiene SSR/prerender, sin instalar backends Canvas nativos.                                            | [Soporta SSR](https://svelteflow.dev/learn/advanced/server-side-rendering); dimensiones y posiciones de handles deben ser conocidas para geometría prerenderizada. El editor interactivo sigue necesitando navegador.                                     |
| Licencia                 | MIT en ambos paquetes; sin SDK comercial ni clave.                                                                                                                                                                      | [Core MIT](https://svelteflow.dev/), con soporte/ejemplos Pro opcionales. El core no exige suscripción.                                                                                                                                                   |
| Mantenimiento            | Konva 10.9.0 publicado 15-10-2026; wrapper 1.0.1 publicado 16-10-2025. La cadencia del wrapper es un riesgo a vigilar; sus peers actuales admiten Svelte 5.                                                             | 1.7.0 publicado 24-09-2026; mantenido por xyflow, con documentación y ejemplos especializados en editores de nodos.                                                                                                                                       |
| Peso publicado           | 1.900.536 bytes desempaquetados Konva + 150.929 wrapper. No son bytes transferidos al usuario.                                                                                                                          | 332.612 bytes desempaquetados del paquete; además depende de `@xyflow/system` (694.317) y `@svelte-put/shortcut`, con transitivas. No comparar solo el paquete principal con toda Konva.                                                                  |
| Nodos/conexiones         | Formas y eventos de bajo nivel. Hay que implementar modelo, extremos de conexiones, selección y comandos. El spike hace esa adaptación pequeña.                                                                         | [Incluye](https://svelteflow.dev/) nodos/handles/edges, arrastre, selección múltiple, pan/zoom, eliminación y componentes específicos. Preferible si el producto fuese principalmente un editor de flujos con formularios HTML.                           |
| Dibujo libre             | [Líneas/puntos y captura de eventos](https://konvajs.org/docs/sandbox/Free_Drawing.html) comparten el mismo espacio, hit testing y cámara que los rectángulos. No hacen falta dos superficies coordinadas.              | Posible con código propio y un portal SVG/viewport o nodos personalizados. El [ejemplo oficial Freehand Draw es Pro](https://svelteflow.dev/examples); esto no convierte el dibujo propio en una función de pago. No se usa código Pro.                   |
| Selección/transformación | Hit testing, draggable, grupos y Transformer disponibles. La selección visual, lista accesible y comandos son responsabilidad nuestra. Aquí hay selección simple y movimiento; no resize/rotate.                        | Selección, arrastre y herramientas de resize disponibles; nodos Svelte/DOM facilitan controles de texto y accesibilidad. La transformación de tinta requiere una adaptación propia.                                                                       |
| Zoom/jerarquía           | Cámara y coordenadas controladas por el dominio. El portal jerárquico se programa sin serializar el Stage.                                                                                                              | [API de viewport](https://svelteflow.dev/api-reference/hooks/use-svelte-flow) con animaciones. Sus subflows son agrupaciones espaciales; no resuelven por sí solos abrir un documento hijo y conservar su cámara. Ambos necesitan navegación de proyecto. |
| Rendimiento              | Canvas evita un DOM por punto de tinta, pero redibujar/hit testing tienen costes. [Konva recomienda](https://konvajs.org/docs/performance/All_Performance_Tips.html) reducir listening, capas y trabajo fuera de vista. | DOM/SVG favorece nodos interactivos; muchos nodos/edges y trazos detallados exigen controlar reactividad, renderizado y virtualización. No se ha hecho un benchmark equivalente entre ambas bibliotecas.                                                  |

Las versiones, peers, fechas, licencias y tamaños se consultaron en los registros publicados de [Konva](https://registry.npmjs.org/konva), [svelte-konva](https://registry.npmjs.org/svelte-konva) y [Svelte Flow](https://registry.npmjs.org/@xyflow/svelte). Solo Konva y su wrapper se añaden al lockfile, fijados a las versiones anteriores. Sus peers nativos `canvas`/`skia-canvas` son opcionales y no se instalan.

## 2. Elección y evidencia de peso

Se prioriza la convivencia entre formas y anotación libre: un Stage, coordenadas de dominio y dos capas — contenido y trazo provisional. La geometría estructurada es sencilla y no justifica introducir un segundo editor ni una superficie superpuesta con cámara independiente. Svelte Flow sigue siendo alternativa si después dominan handles complejos, formularios incrustados, selección múltiple y enrutado avanzado sobre tinta.

El manifiesto Vite identifica `ArchitectureEditor.svelte` como **entrada dinámica**. Su chunk contiene la adaptación y Konva/wrapper; mide aproximadamente **173 kB sin comprimir / 54 kB gzip**, además de imports compartidos y CSS. La medición exacta del build está en [canvas-spike-validation.json](../screenshots/actual/canvas-spike-validation.json). No es el coste total de una visita fría ni una medición del core aislado. Svelte Flow no se empaqueta aquí, por lo que no se inventa una ventaja numérica en transferencia. La ruta lab carga este código al montar; las herramientas públicas no importan el editor.

## 3. Abrir y probar la demostración

Ruta: **`/lab/architecture-canvas/`**. Es experimental, prerenderizada y `noindex`; no se añade al registro, buscador, favoritos ni paleta de herramientas. El enlace de preview, si Cloudflare lo publica para la rama, se proporciona al cerrar la entrega. No se modifica el despliegue de `main`.

```sh
git switch feature/architecture-canvas-spike
npm ci
npm run build
npm run preview:static
# http://127.0.0.1:4173/lab/architecture-canvas/
```

Recorrido breve:

1. Crear Rectangle o Text. Editar Label en Selection; arrastrar sobre el lienzo o mover con flechas.
2. Elegir Connect y pulsar origen/destino, en el lienzo o en la lista. Elegir Arrow o Line. Delete elimina la selección y, al borrar un nodo, sus conexiones incidentes.
3. Elegir Draw y arrastrar un trazo; volver a Select permite seleccionarlo/moverlo como otra anotación. Pan arrastra la cámara; rueda y controles ajustan zoom. Fit encuadra el nivel.
4. Seleccionar **Pedidos**. Open child diagram abre el nivel 2; Zoom into child anima la cámara antes de abrir exactamente el mismo destino. Service contiene **OrderService**, nivel 3.
5. Volver con el breadcrumb. Etiquetas, formas, tinta, conexiones y cámara de cada diagrama se conservan durante esta sesión.

Atajos con foco en el editor: V/D/C/H cambian modo; flechas mueven la selección (10 unidades, Shift: 1), o la cámara si no hay elemento seleccionado. Delete/Backspace borran. Con foco en el lienzo, Enter abre el hijo y Shift+Enter usa el portal. Escape cancela la transición/conexión. Tab recorre los controles y el outline DOM. Ctrl/Cmd+K mantiene el comportamiento global de DevBench. Los inputs conservan sus atajos de edición.

## 4. Jerarquía y navegación implementadas

| Diagrama     | Elementos de sistema             | Referencia hija             |
| ------------ | -------------------------------- | --------------------------- |
| E-commerce   | API, Pedidos, Inventario         | Pedidos → `orders-diagram`  |
| Pedidos      | Controller, Service, Database    | Service → `service-diagram` |
| OrderService | Validación, Persistencia, Evento | Ninguna                     |

Datos sintéticos, notas y un ejemplo de tinta proceden de `createDemoProject()`, que devuelve instancias nuevas. Botón, doble clic y teclado comparten `childDestination`; el portal no tiene destinos alternativos. El breadcrumb usa la misma pila de IDs.

**El portal es una aproximación:** interpola cámara durante 440 ms y después abre el hijo con su cámara guardada. No dibuja contenido hijo dentro del padre ni hace zoom semántico continuo/infinito. La cámara transitoria no sobrescribe la del padre. Durante la transición se bloquean ediciones; Escape cancela y reduced motion abre directamente. Se corrigió un fallo de foco: deshabilitar el botón lanzador impedía recibir Escape; ahora el foco pasa al lienzo al empezar.

Cada diagrama se encuadra al abrirlo por primera vez. Después conserva su cámara; redimensionar la ventana no reemplaza silenciosamente esa elección. Fit es una acción explícita. Cambiar de nivel destruye su Stage y monta el siguiente; el proyecto en memoria permanece en el componente padre. Salir de la ruta o recargar descarta toda la sesión.

## 5. Modelo independiente y evolución propuesta

[model.ts](../src/lib/lab/architecture-canvas/model.ts) define `Project`, `Diagram`, `Element`, `Connection`, `Viewport` y `Point`, sin tipos de Konva, Svelte, DOM o IndexedDB:

- Project: `schemaVersion: 1`, ID, título, `rootDiagramId`, colección de diagramas.
- Diagram: ID, título, elementos, conexiones y viewport `{x, y, zoom}`.
- Element: ID estable, tipo rectangle/text/stroke, posición/tamaño, etiqueta, puntos relativos opcionales y `childDiagramId` opcional.
- Connection: ID, `from`, `to` y arrow/line; extremos dentro del mismo diagrama.

IDs de demo son estables; las creaciones usan UUID sin cambiar ID al renombrar o mover. Las referencias son IDs, no objetos enlazados. La validación rechaza IDs duplicados, hijos ausentes, ciclos — también entre diagramas no accesibles desde la raíz —, geometría/viewport inválidos, conexiones huérfanas y versión desconocida. Borrar un nodo conserva su posible diagrama hijo sin enlazarlo, para evitar pérdida implícita de contenido; la gestión de huérfanos queda para el producto.

Separación: `model.ts` opera sobre datos; `seed.ts` crea el ejemplo; `ArchitectureEditor.svelte` controla sesión/navegación/comandos; `KonvaSurface.svelte` adapta eventos y renderiza. No se guarda `Stage.toJSON()` ni estilos/objetos internos de Konva.

Para la versión definitiva: mantener este DTO versionado, incorporar un parser de importación de datos no fiables, migraciones explícitas versión-a-versión con fixtures de roundtrip, y persistencia transaccional por Project en IndexedDB. Preservar IDs, diagramas huérfanos y todos los campos admitidos; rechazar versiones futuras en vez de descartarlas. El validador actual recibe datos TypeScript conocidos: **no es todavía un parser de JSON arbitrario ni una implementación de migraciones**. El formato permite esos próximos pasos; no promete importaciones ya disponibles.

## 6. Verificación y capturas reales

Node 24.22.1. Pruebas selectivas locales sobre el build estático, sin auditoría exhaustiva de las 26 herramientas:

| Control              | Evidencia                                                                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modelo / invariantes | 11 tests nuevos: serialización aislada, hijos/destinos, ciclos, IDs, conexiones, movimiento/borrado, tinta, zoom y cámaras independientes. Más dos tests existentes del registro.                                                                                                                         |
| Playwright           | Tres flujos reales: crear/mover/borrar con puntero, conectar, dibujar/mover tinta; navegación directa/animada y vuelta entre los tres niveles; temas, pan con teclado/arrastre, rueda, Escape y reduced motion.                                                                                           |
| Memoria/privacidad   | Marcadores ausentes de URL/history/localStorage/sessionStorage/cookies/Cache API/IndexedDB/solicitudes/consola. Solo metadatos de preferencias existentes. Cero solicitudes externas o envíos de datos en esos flujos. Los GET de módulos/fuentes/CSS locales son legítimos.                              |
| Desmontaje           | Salir elimina los canvas; volver monta una sesión limpia. Sin errores de página/consola ni recursos HTTP fallidos en los flujos. El Stage llama `destroy()` en su desmontaje; el adaptador desconecta el observador de tema y cancela la animación pendiente. No es una prueba de heap de larga duración. |
| Responsive           | 1440 oscuro/claro, 768 claro y 390 oscuro, sin overflow horizontal de documento. Desktop prioritario; en móvil Fit hace pequeños los rótulos, pero zoom y outline permiten operar.                                                                                                                        |
| Calidad              | `check`, `lint`, tests relevantes y `build`; resultado exacto en el JSON de evidencia y en la entrega. Build conserva las 26 rutas de herramientas y añade la ruta lab estática.                                                                                                                          |

Las seis imágenes siguientes proceden de Chromium y datos sintéticos reales, no de mockups:

| Vista                      | Captura                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| E-commerce · oscuro 1440   | [PNG](../screenshots/actual/canvas-spike-overview-dark-1440.png)      |
| E-commerce · claro 1440    | [PNG](../screenshots/actual/canvas-spike-overview-light-1440.png)     |
| E-commerce · tablet 768    | [PNG](../screenshots/actual/canvas-spike-overview-light-768.png)      |
| E-commerce · móvil 390     | [PNG](../screenshots/actual/canvas-spike-overview-dark-390.png)       |
| Pedidos · oscuro 1440      | [PNG](../screenshots/actual/canvas-spike-orders-dark-1440.png)        |
| OrderService · oscuro 1440 | [PNG](../screenshots/actual/canvas-spike-order-service-dark-1440.png) |

Repetición: `npm run test -- src/lib/lab/architecture-canvas/model.test.ts src/lib/tools/release-v12.test.ts`, `npm run build`, `npx playwright test tests/architecture-canvas.spec.ts`. El workflow existente de la rama puede repetir también sus regresiones ordinarias; no se amplía con una auditoría de producción.

## 7. Límites, riesgos y decisión

**P0/P1 abiertos: ninguno al cierre de las comprobaciones.** El problema de foco/Escape y los errores iniciales de tipado se resolvieron antes de aceptar el spike. P2 y decisiones para revisión:

- Canvas necesita un puente accesible DOM: el outline y teclado son reales, pero no hay certificación con lector de pantalla. El `tabindex` del canvas tiene una excepción local justificada de Svelte, porque dispone de navegación de teclado y representación DOM; no se inventa un rol de botón para un editor gráfico.
- Desktop primero. Móvil básico, sin selección gestual avanzada, pinch multitáctil ni optimización para lápiz/presión.
- Selección simple; sin lasso, resize/rotate, alineación, agrupación, puertos, enrutado ortogonal, conexiones curvas ni undo/redo. Rectángulos fijos y etiquetas editadas en inspector; las líneas entre nodos solapados no tienen enrutado inteligente.
- Tinta es una polilínea de puntero con color del tema, no un motor Excalidraw ni reconocimiento de formas. Máximo 2.000 puntos por trazo; se avisa al alcanzarlo. 200 elementos y 400 conexiones por diagrama; zoom 25–300 %. No se ha medido escala de miles de elementos, FPS sostenidos, memoria de largas sesiones ni paridad entre navegadores.
- Los hijos están precargados para demostrar la navegación. No hay UI para crear/reasignar diagramas hijos, guardar, importar/exportar, colaborar ni recuperar una sesión. Ninguna API, autenticación, telemetría o persistencia nueva.
- La menor cadencia del wrapper y el coste propio de implementar accesibilidad/comandos/enrutado son riesgos de mantenimiento. El DTO independiente permite cambiar renderer si un siguiente bloque invalida la elección.

**GO para continuar con Konva como hipótesis principal**, sujeto a aprobar la experiencia del portal y al coste del puente accesible. **NO-GO para publicar este spike como editor completo** o afirmar que ya escala a documentos grandes. Si la prioridad cambia a puertos/formularios/flows complejos y se reduce la tinta, reabrir la elección Svelte Flow antes de consolidar una API de renderer.

## 8. Próximos bloques propuestos — no implementados

1. Revisar esta demo y decidir interacción jerárquica, selección y requisitos de accesibilidad. Probar un presupuesto representativo de nodos/trazos y navegación con lector de pantalla.
2. Consolidar DTO/validador no fiable/migraciones y comandos con undo/redo; añadir creación y reasignación segura de diagramas hijos, con gestión explícita de huérfanos.
3. Añadir IndexedDB y export/import versionado con recuperación y pruebas de pérdida/corrupción; nunca acoplar persistencia a JSON de Konva.
4. Mejorar selección/transformación y conectores según uso observado, endurecer táctil/rendimiento y efectuar aceptación V1.4 antes de añadir Architecture Canvas al registro público.

Son propuestas para aprobación posterior; este spike termina en la rama aislada, sin fusionar `main`.
