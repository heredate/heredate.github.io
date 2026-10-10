# Hereda+ · Auditoría de diseño y experiencia (F0)

Fecha: 7 oct 2026 · Rama `diseno` · Base: commit c50c1a4 (Hereda+ 1.3, capa v7 «Quiet premium»).
Capturas «antes»: `scratchpad/dz/antes/{1440,1024,390}-NN-*.png` (19 pantallas).

## 1. Arquitectura que condiciona el diseño

- Aplicación de una sola página en JavaScript sin framework. `build.py` concatena `shell.html` (tokens y CSS base), `pro.css` (capas posteriores) y ~30 módulos `.js` que devuelven marcado como cadenas. `render()` repinta `#app` entero en cada cambio y restaura foco y selección (`rdFoco`/`rdRestaurar`).
- Los manejadores se cuelgan por delegación de atributos `data-*` (`data-act`, `data-p`, `data-bn`, `data-sec`, `data-open`…). Son el contrato: no se tocan.
- Dos temas: grafito (`:root`) y claro (`:root[data-theme="light"]`). El claro es el habitual en despachos.
- Vistas: Mi día (`radar`), Expedientes (`inicio`), Agenda, Rentabilidad (`rent`), Normativa (`biblio`), Expediente (`exp`, 13 secciones: 6 principales + 7 en «Más»), asistente de alta (`asist`, 11 pasos) y 24 tipos de hoja (`ui.sheet.tipo`: persona, bien, trámite, ajustes, documento, lector, importar…).
- Componentes de hecho: `.btn` (6 variantes), `.seg`, `.group/.row/.field` (listas agrupadas y formularios), `.card`, `.kpis/.kpi`, `.chip`, `.st-b`, `.tag`, `.dot`, `.status`, `.ico`, tablas `.grid-t`/`.tbl`/`.exp-tabla`/`.imp-tbl`, `.sheet`, `.toast`, `.empty`, `.drop`, `.fcard`, `.stepper`, `.secnav`.

## 2. Inventario del sistema visual actual

| Medida | Valor encontrado |
|---|---|
| Capas de CSS que se pisan | 5 (v5 base, v5 «luminoso», v6 «Sobrio», v7 «Quiet premium», más ~25 secciones de módulo) |
| Radios distintos | 20 valores (de 2 a 18 px y 980 px) |
| Tamaños de letra distintos | 31 |
| Colores hexadecimales sueltos | 56 |
| Sombras distintas | 78 |
| Etiquetas en mayúsculas espaciadas | 35 reglas |
| `!important` | 45 |
| Grosores de trazo de icono | 1,6 / 1,7 / 1,8 / 1,9 / 2 / 2,2 / 2,4 / 2,6 |
| Estilos en línea en `ui.js` | 118 |

## 3. Problemas críticos

1. **Sistema de diseño fragmentado.** Las capas v5 → v7 se corrigen unas a otras («color por sección» en v5, anulado con `!important` en v6; KPI con icono tintado en v5, KPI en mayúsculas en v6, tipografía en v7). Cada cambio exige saber qué capa gana. Resultado visible: tres estilos de KPI distintos (Mi día con punto de color, Expedientes con antetítulo en mayúsculas, Resumen con icono en la esquina).
2. **Formularios de app de ajustes del móvil en un producto de escritorio.** Ficha de persona, ficha de bien, Encargo, Ajustes y asistente usan la fila iOS (etiqueta pequeña encima, valor sin caja, separador fino). En escritorio no se distingue qué es editable, cada campo ocupa 68 px de alto, no hay agrupación por contexto ni campos opcionales plegados, y la ficha de persona mezcla 20 campos en una sola columna dentro de un modal de 660 px.
3. **La tabla de la cartera no cabe.** A 1440 px la columna «Avance» queda cortada bajo un fundido; a 1024 px se cortan «Próximo vencimiento», «Impuestos» y «Honorarios». La tabla principal del producto obliga a desplazarse en horizontal sin indicarlo.

## 4. Problemas importantes

4. **Hueco vacío de ~70 px arriba** en Mi día, Expedientes, Rentabilidad y Normativa: la barra superior de escritorio existe pero no tiene contenido. Responde mal a «¿dónde estoy?».
5. **Cabecera del expediente sin próximo vencimiento ni estado legible.** El plazo más importante está en la segunda fila de tarjetas; el estado se reduce a un chip gris «4 bloqueos». Las fases (Encargo → Archivado) no muestran si la fase actual está bloqueada o vencida.
6. **Síndrome de tarjeta.** Casi todo es tarjeta blanca con radio 14–16 px y sombra (KPI sueltos, avisos, informes, cada sección). Las tarjetas no agrupan: decoran. Falta jerarquía entre panel principal, sección y fila.
7. **Hojas centradas que tapan el contexto.** Persona, bien y trámite se editan en un modal centrado con «Hecho» como enlace azul arriba a la derecha (patrón iOS). En escritorio se pierde el expediente de vista; el título va centrado y la acción principal no parece un botón.
8. **Documentos con estado vacío duplicado.** Zona de subida punteada + tarjeta «Todavía no hay documentos» + lista de lo que falta: tres bloques para decir lo mismo. Con documentos, la lista es una rejilla de miniaturas sin columnas de tipo, fecha, origen y estado comparables.
9. **Botones con el mismo peso.** Píldoras negras y blancas de 38 px por todas partes; en la cabecera del expediente «Para la familia» (negro) compite con «Informe en PDF». Las acciones destructivas («Quitar a esta persona», «Eliminar») son bloques rojos a todo el ancho, separados solo por margen.
10. **Asistente de alta con aspecto de móvil.** Botón «Continuar» de 640 px fijo abajo, contador «1 de 11» suelto arriba a la derecha, sin nombre de los pasos.
11. **Antetítulos en mayúsculas espaciadas** («CAUDAL», «EN CURSO», «VIGILANCIA NORMATIVA», cabeceras de tabla): ruido tipográfico y aspecto de plantilla.

## 5. Problemas menores

12. Iconos con 8 grosores de trazo distintos; la cabecera mezcla iconos de 21 px con botones de texto de 14 px.
13. Importes: algunos en negrita serif, otros en sans; el símbolo € pesa igual que la cifra; «2.340 €» y «0,00 €» conviven en la misma pantalla sin criterio.
14. Fechas: «Fallecimiento: 23 de julio de 2026», «5 oct 2026», «28 sept 2026», «hasta 23 jul 2031»: tres formatos en una pantalla.
15. Barra lateral: grupos en mayúsculas, lista «En curso» con 2 líneas por expediente y radio de 9 px; la selección es una tarjeta blanca con sombra.
16. Estados vacíos centrados con un disco azul de 52 px y textos largos centrados (difíciles de leer en 1100 px).
17. Pestañas de sección del expediente (13): «Más» abre un menú correcto, pero la pestaña activa se subraya con 2,5 px y el número de trámites flota.
18. Foco visible definido tres veces con radios distintos.
19. `.page` con `overflow-x:clip` oculta desbordes en lugar de resolverlos.

## 6. Oportunidades de alto impacto

- **Un único bloque de tokens** (color semántico, espacio, radios, sombras, tipografía, movimiento) del que beben todas las capas; borrar las reglas de v5/v6 que v8 sustituye.
- **Cabecera del expediente como centro de mando**: referencia, territorio, estado (crítico / plazos / bloqueos / al día), responsable, fallecimiento, próximo vencimiento con cuenta atrás y la línea de fases con completado, en curso, bloqueado y vencido.
- **Banda de cifras** (una superficie con divisiones) en lugar de 4–5 tarjetas sueltas: más densidad, menos ruido.
- **Formularios de escritorio de verdad**: etiqueta a la izquierda, caja de campo visible, ayuda bajo el campo, secciones con título y descripción, lo opcional plegado y abierto si ya tiene datos, validación al salir del campo (NIF, IBAN, referencia catastral, porcentajes).
- **Panel lateral para editar** (persona, bien, trámite, documento) que deja ver el expediente; modal centrado solo para lo ancho (escritos, reunión).
- **Tabla de la cartera que cabe** en 1024–1440 px sin desplazamiento, con cabeceras ordenables visibles y números alineados.
- **Documentos**: una sola zona de subida, estado vacío que enseña, filtros con recuento y lista en columnas (tipo, fecha, origen, estado).
- **Cifras financieras** con tabulares, € más ligero, y formatos únicos: «1.284.320,40 €», «50,00 %», «6 oct 2026».

## 7. Jerarquía de intervención

1. Tokens y primitivas (botón, campo, tarjeta, banda de cifras, chip, tabla, hoja) — afecta a todo y elimina contradicciones.
2. Shell: barra superior con contexto, barra lateral, pestañas, acciones.
3. Mi día y Expedientes (primera impresión).
4. Expediente: cabecera, fases, resumen.
5. Documentos.
6. Formularios (persona, bien, asistente, Encargo, Ajustes).
7. Tablas.
8. Estados (carga, vacío, error, éxito, deshabilitado, confirmación).
9. Responsive 1440/1280/1024/820/390.
10. Pulido, contraste AA, foco, iconografía.

Restricciones respetadas en todo el trabajo: sin cambios en cálculos, modelo de datos ni atributos `data-*`; los selectores de las guías interactivas y de las pruebas de navegador siguen encontrando su elemento; tema grafito operativo; sin dependencias nuevas (tipografía del sistema).

## 8. Resultado: sistema v8 «Despacho» (7 oct 2026)

- **Tokens** (inicio de `shell.html`): color semántico `--bg`, `--surface`, `--surface-2`, `--sunken`, `--elevated`, `--border`, `--border-2`, `--ink-1…4`, `--brand` (azul notarial #1F3A5F), `--success`, `--warning`, `--danger`, `--info` y sus fondos `*-bg`; tipografía `--font-sans` (sistema), `--font-display` (serifa de sistema, solo títulos de página y de ficha), escala `--fs-*`; espacio `--sp-*` (rejilla de 4 px); radios `--r-chip` 6, `--r-ctl` 8, `--r-panel` 10, `--r-sheet` 14; sombras `--sh-line/1/2/3`; movimiento `--dur-1/2/3`, `--ease-out`. Los nombres antiguos (`--panel`, `--label`, `--accent`, `--gold`…) son alias: los módulos no cambian.
- **Componentes** (capa v8 al final de `pro.css`): botón (primario tinta, secundario con línea, fantasma, destructivo con línea roja y confirmación), banda de cifras, chip de estado, tabla, hoja (panel lateral en escritorio; modal para lo ancho; hoja inferior en móvil), campo (etiqueta a la izquierda desde 760 px), sección de formulario y opcional plegable, línea de fases, estado vacío, esqueleto, zona de subida, zona de peligro.
- **Formatos**: importes «1.284.320,40 €» con cifras tabulares y el símbolo más ligero en las cifras grandes; fechas «23 jul 2026»; porcentajes «50,00 %».
- **Contraste**: texto secundario ≥ 4,5:1 sobre todas las superficies claras y oscuras; estados ≥ 5:1 sobre su fondo tintado.
- **Pendiente**: las capas de módulos anteriores a v8 (P4–P10) siguen en `pro.css` con valores propios; v8 las alinea por encima, pero conviene ir migrando cada módulo a los tokens y borrar lo que v8 ya cubre.

## 9. Resultado: v9 «Firma» (7 oct 2026)

- **Tipografía propia, igual en Windows, Mac y móvil**: Inter variable (interfaz, con tamaño óptico y cifras tabulares) y Source Serif 4 variable (títulos de página, de ficha, bienvenida, reunión y cuestionario de la familia). Autoalojadas en `fonts/` (SIL OFL 1.1, licencias junto a los archivos), subconjunto latino, WOFF2 de 51 y 73 KB, precarga y `font-display:swap` con respaldo de métricas ajustadas (sin salto de maquetación). Incrustadas en el archivo único del piloto y en la versión para Claude. Antes, en el despacho piloto (Windows) se veía Segoe UI y Palatino.
- **Marca**: monograma «H+» dibujado a mano en una superelipse: el travesaño de la H atraviesa el asta derecha y se convierte en el brazo del signo más. Azul notarial (#1F3A5F) en lugar del azul genérico #1F6FEB. Fuente: `icons/hereda-marca.svg`; iconos PNG regenerados con `tools/marca/generar-iconos.mjs` (favicon, 192, 512, enmascarable y Apple). El cuestionario y la carpeta de la familia pasan al mismo azul y a la misma tipografía.
- **Movimiento con física, solo como respuesta a un gesto**: transición entre vistas con la View Transitions API (la página se funde y la marca de la pestaña activa se desliza; solo para clics y teclas reales, el repintado programático sigue siendo síncrono); muelle amortiguado (`--ease-spring`, `linear()`) en hojas, avisos, interruptores, marcar trámites (el círculo se asienta y la marca se dibuja), botones y segmentados; esqueleto de arranque; todo desactivado con «reducir movimiento».
- **Coherencia**: fuera las versalitas espaciadas que quedaban (paleta, ayuda, firma, guías, gráficos, panel del socio), la serifa en titulares internos y en cifras, los lavados de color y las franjas laterales; una sola escala de cifras destacadas (24 px, Inter 600, tabulares); áreas del diagnóstico en banda; tabla de la cartera que cabe de 1024 a 1600 px con la tipografía nueva; estados vacíos neutros; láminas de la reunión con la serifa de la casa.
- **Accesibilidad**: de 1.196 infracciones WCAG 2.2 A/AA a 0 en 304 comprobaciones. Detalle en `CERTIFICACION.md`.
