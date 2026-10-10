# Plusvalía municipal (IIVTNU) en los territorios forales

Informe jurídico del motor de Hereda+ · 07-10-2026 · rama `r2-forales`

**Conclusión.** En Álava (01), Gipuzkoa (20), Navarra (31) y Bizkaia (48) la plusvalía no se rige por el TRLRHL sino por la norma foral de cada territorio. Hasta ahora el motor calculaba con las reglas estatales y añadía un aviso. Desde esta versión, cada municipio de esas cuatro provincias se calcula con su régimen foral (`PLUSVALIA_FORAL` en `src/motor.mjs`), tenga o no ordenanza incorporada:

| Territorio | Norma | Tipo máximo | Coeficientes máximos | Herencia en línea recta y cónyuge | Estado |
|---|---|---|---|---|---|
| Navarra | LF 2/1995, arts. 172-178 | 25 % (mínimo 8 %), art. 176.2 | Tabla propia 2026, art. 175.2 (0,58 a 10 años) | **Exenta por ley** (art. 173.1.b), en los 272 municipios | Exención y tipo VERIFICADOS; tabla PENDIENTE |
| Bizkaia | NF 8/1989 | 30 %, art. 5.1 (NF 3/2022) | Envolvente DFN 2/2024 + tabla de Basauri 2026 | Bonificación potestativa hasta el 100 % | Tipo VERIFICADO; tabla PENDIENTE |
| Gipuzkoa | NF 16/1989 | 30 % (prudente; el texto de 2018 decía 15 %) | DFN 2/2023 (desde 2024) | Bonificación potestativa hasta el 95 % | PENDIENTE |
| Álava | NF 46/1989 | 30 %, art. 5 | DNUF 12/2022 (desde 2023) | Bonificación potestativa hasta el 100 % (art. 7.2) | Tipo VERIFICADO; tabla PENDIENTE |

Regla de prudencia: cuando no se ha podido cotejar la tabla foral vigente en la fecha del devengo, se usa la tabla más alta de las candidatas para cada año; cuando no se conoce el tipo de la ordenanza, se usa el tipo máximo foral. Así la cifra nunca queda por debajo de la liquidación posible.

Etiquetas: **HECHO** = leído hoy en el texto (o en una reproducción literal del texto). **INFERENCIA** = deducción. **PENDIENTE** = falta cotejo en el boletín oficial.

---

## 1. Navarra (31)

**Norma.** Ley Foral 2/1995, de 10 de marzo, de Haciendas Locales de Navarra, arts. 172 a 178. Texto consolidado: https://www.iberley.es/legislacion/ley-foral-2-1995-10-mar-c-navarra-haciendas-locales-navarra-12368074

- **Exención de las herencias (art. 173.1.b).** HECHO. Texto literal: «Las transmisiones de toda clase de bienes por herencia, legado, dote, donación o cualquier otro título gratuito que tenga lugar entre ascendientes, descendientes y cónyuges». Última modificación del artículo: LF 22/2020 (desde 01-01-2021). Fuente: https://www.iberley.es/legislacion/articulo-173-haciendas-locales-navarra. La reproduce literalmente el art. 3.1.b de la Ordenanza n.º 4 de Pamplona 2026: https://www.pamplona.es/sites/default/files/2025-12/Ordenanza%204%20.pdf
  - Consecuencia: la exención es **legal**, no de cada ordenanza. Vale para los 272 municipios navarros. No exige vivienda habitual, convivencia ni solicitud. Alcanza a todos los grados de la línea recta (nietos incluidos).
  - En el motor: `exento: true`, cuota 0, estado VERIFICADO (dos textos concordantes).
  - **Pareja estable: PENDIENTE.** El artículo dice «cónyuges». No se ha comprobado si alguna norma foral la equipara a estos efectos. El motor no la exime (cálculo prudente) y lo explica en la línea del heredero.
- **Tipo (art. 176.2).** HECHO: «la escala de gravamen será fijada por el Ayuntamiento, sin que el tipo mínimo pueda ser inferior al 8 por 100 ni el tipo máximo pueda superar el 25 por 100». Redacción de la LF 19/2017. Fuente: https://www.iberley.es/legislacion/articulo-176-haciendas-locales-navarra
  - En el motor: tope del 25 %. Si se introduce a mano un tipo mayor, se limita al 25 % con aviso. Un municipio navarro sin ordenanza incorporada se calcula al 25 %.
- **Base (art. 175).** HECHO: valor del terreno al devengo (ponencia de valores) × coeficiente del periodo de generación, con un máximo de 20 años. Se cuentan años completos. Si el periodo es inferior a un año, se prorratea por meses completos. Los coeficientes máximos «serán actualizados anualmente». Fuente: https://www.iberley.es/legislacion/articulo-175-haciendas-locales-navarra
  - Tabla del art. 175.2, de <1 a 20 años o más: 0,06 · 0,16 · 0,13 · 0,26 · 0,35 · 0,37 · 0,35 · 0,41 · 0,47 · 0,52 · 0,58 · 0,53 · 0,42 · 0,37 · 0,31 · 0,26 · 0,25 · 0,15 · 0,06 · 0,06 · 0,16.
  - Según iberley, la última modificación del apartado 2 es la LF 17/2025, de 22 de diciembre, en vigor desde el 01-01-2026. El BOE-A-2026-3910 (https://boe.es/boe/dias/2026/02/20/pdfs/BOE-A-2026-3910.pdf) confirma que esa ley «actualiza los coeficientes máximos a aplicar, a partir de 1 de enero de 2026». La extracción del BOE no llega a la tabla, así que hay una sola fuente para las cifras → **PENDIENTE**.
  - Ojo: la tabla navarra supera la estatal en muchos años (0,58 frente a 0,12 a 10 años). Por eso, las pruebas de robustez ya no limitan los coeficientes navarros al art. 107.4 TRLRHL.
  - Devengos anteriores a 2026: la tabla de ese año no se ha incorporado. Se usa la de 2026 y se avisa.
- **Método real (arts. 172.4 y 175.7).** HECHO: a instancia del sujeto pasivo, si el incremento real es inferior a la base objetiva, se toma como base el real. El motor lo cita en lugar del TRLRHL.
- **Pamplona (31201).** Tipo único del 17,35 % (anexo de la Ordenanza n.º 4 de 2026), VERIFICADO. Sin bonificaciones. Coeficientes: remite a los máximos del art. 175.2.

## 2. Bizkaia (48)

**Norma.** Norma Foral 8/1989, de 30 de junio, del IIVTNU.

- **Adaptación a la STC 182/2021.** HECHO: Decreto Foral Normativo 7/2021, de 16 de noviembre (BOB n.º 221, 17-11-2021). Fuentes: https://derecholocal.es/?p=8475 y https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFL020995.pdf
  - Base objetiva (art. 4): valor del terreno × coeficiente.
  - Método real a instancia del contribuyente (art. 4.4).
  - No sujeción si no hay incremento (art. 1.4).
  - Tabla inicial de 0,14 a 0,45.
  - Tipo máximo del 15 %.
- **Tipo máximo del 30 %.** HECHO: Norma Foral 3/2022, de 22 de junio (BOB n.º 122, 27-06-2022), modifica el art. 5.1: «en ningún caso podrá exceder del 30 por 100». Fuente: https://derecholocal.es/?p=9899
- **Coeficientes.** HECHO: DFN 2/2024, de 14 de marzo (BOB n.º 55, 18-03-2024). Tabla de <1 a 20 años o más: 0,15 · 0,15 · 0,14 · 0,14 · 0,16 · 0,18 · 0,19 · 0,20 · 0,19 · 0,15 · 0,12 · 0,10 · 0,09 · 0,09 · 0,09 · 0,09 · 0,10 · 0,13 · 0,17 · 0,23 · 0,40 (la misma que el RDL 8/2023). Fuentes: https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFL022442.pdf y https://derecholocal.es/?p=13152
  - **INFERENCIA / PENDIENTE.** Basauri aplica en 2026 una tabla de 0,16 a 0,35 (la del RDL 16/2025 estatal). Si Bizkaia la ha adoptado como máximo para 2025 o 2026, en algunos años es más alta (por ejemplo, 0,16 frente a 0,12 a 10 años).
  - Decisión del motor: usar la envolvente, es decir, el mayor de las dos tablas en cada año: 0,16 · 0,15 · 0,15 · 0,15 · 0,16 · 0,18 · 0,20 · 0,22 · 0,23 · 0,21 · 0,16 · 0,13 · 0,11 · 0,10 · 0,10 · 0,10 · 0,10 · 0,13 · 0,17 · 0,23 · 0,40.
  - Ermua 2026 (tabla de 0,14 a 0,35) queda por debajo.
- **Bonificación mortis causa.** Potestativa, de hasta el 100 %. Beneficiarios: descendientes, adoptados, cónyuge, pareja de hecho (Ley 2/2003), ascendientes y adoptantes.
  - Fuente: investigación previa del proyecto, sobre el texto consolidado de bizkaia.eus (`research/plusvalia-capitales-norte.json`).
  - No se ha recotejado hoy → PENDIENTE de cita literal del artículo.
  - En el motor: tope del 100 % para las bonificaciones introducidas a mano.

**Municipios incorporados**

| Municipio (INE) | Tipo | Coeficientes | Bonificación por herencia | Fuente y estado |
|---|---|---|---|---|
| Bilbao (48020) | 30 % provisional (máximo foral) | Foral | A mano, hasta el 100 % | Ordenanza no localizada (bilbao.eus no se deja leer; secundarias hablan de un 25 % sin contrastar). PENDIENTE |
| Getxo (48044) | 7,5 / 8 / 8,5 / 8,75 % por quinquenios | Anexo I de 2022 (0,14 a 0,45), limitado al máximo foral | 33 % al cónyuge o pareja sobre la vivienda habitual, con renta < 18.000 € (art. 5.5) | https://www.getxo.eus/DocsPublic/udala/castellano/ordenanzas/fiscales/2022/plusvalia_2022_01.pdf. Texto de 2022: PENDIENTE de la versión 2026 |
| Basauri (48015) | 7,76 %; 11,29 % a más de 20 años (el año 20 se trata como «más de 20» por prudencia) | 0,16 a 0,35 | 100 % de la vivienda habitual con 2 años de convivencia; mantenerla 4 años | https://www.basauri.eus/sites/basauri/files/2026-01/OF_2026_05_IVTNU_EUSK_1.pdf. Texto en euskera leído con traducción: PENDIENTE |
| Ermua (48034) | 10 % (hasta 5 años), 9 % (6-10), 8 % (11-15), 7 % (16-20) | 0,14 a 0,35 | No tiene | https://www.ermua.eus/sites/default/files/repositorio-archivos/Ordenanza_Fiscal_5_IVTNU.pdf. PENDIENTE (fecha de la versión no confirmada) |

## 3. Gipuzkoa (20)

**Norma.** Norma Foral 16/1989, de 5 de julio, del IIVTNU.

- **Adaptación a la STC 182/2021.** HECHO: Decreto Foral-Norma 7/2021, de 16 de noviembre (BOG 17-11-2021), que deroga el DFN 2/2017. Fuente: https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFL020994.pdf
  - Art. 4: base objetiva, más la estimación directa a instancia del contribuyente (art. 4.4).
  - Coeficientes máximos «actualizados anualmente mediante norma foral».
  - No sujeción sin incremento (art. 1.3).
- **Coeficientes 2024.** HECHO: DFN 2/2023, de 28 de diciembre (BOG 29-12-2023), con efectos desde el 01-01-2024. Fuente: https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFL022288.pdf
  - Tabla, de <1 a 20 años o más: 0,15 · 0,15 · 0,14 · 0,15 · 0,17 · 0,18 · 0,19 · 0,18 · 0,15 · 0,12 · 0,10 · 0,09 · 0,09 · 0,09 · 0,09 · 0,10 · 0,13 · 0,17 · 0,23 · 0,29 · 0,45.
  - La NF 4/2024 (presupuestos 2025, https://www.fiscal-impuestos.com/node/38069) no recoge tabla en la parte leída.
  - **PENDIENTE:** tablas de 2025 y 2026.
- **Tipo máximo: PENDIENTE.**
  - El texto consolidado hasta la NF 1/2018 decía: «sin que dicho tipo pueda exceder del 15 por 100». Fuente: https://static.errenteria.eus/zerbikat/araudia/nf161989.pdf
  - Tras la reforma de 2021 no se ha localizado el límite vigente. Una fuente secundaria atribuye a Donostia un 27 %, lo que indica que ya no es el 15 %.
  - El motor usa el 30 % como tope prudente.
- **Bonificación mortis causa.** HECHO (texto de 2018): «bonificación de hasta el 95 por 100 de la cuota íntegra». Beneficiarios: descendientes, adoptados, cónyuge, pareja de hecho (Ley 2/2003), ascendientes y adoptantes. Si se introduce un 100 %, el motor lo limita al 95 % y avisa.
- **Donostia-San Sebastián (20069).**
  - Tipo: 30 % provisional. El anexo de tipos por periodo de la ordenanza 2026 (BOG 10-12-2025) no se ha localizado.
  - Coeficientes: forales.
  - Bonificación del art. 7 (95 % si es la vivienda habitual del heredero, 50 % / 10 % en los demás casos): se introduce a mano.
  - Fuente: https://www.donostia.eus/Ordenanzas.nsf/vListadoId/18248C51D10DA186C1258CAF002BC2BC. PENDIENTE.

## 4. Álava (01)

**Norma.** Norma Foral 46/1989, de 19 de julio, del IIVTNU.

- **Texto vigente.** HECHO: Decreto Foral Normativo 4/2021, de 29 de septiembre (BOTHA 06-10-2021). Fuentes: https://derecholocal.es/?p=8198 y https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFL020930.pdf
  - Tipo máximo del 30 % (art. 5).
  - Bonificación mortis causa de «hasta el 100 por ciento de la cuota íntegra» (art. 7.2). Beneficiarios: descendientes, adoptados, cónyuge, pareja de hecho (Ley 2/2003), ascendientes y adoptantes.
  - Método real (art. 4.5).
  - La adaptación a la STC 182/2021 vino después (DNUF 8/2021, no leído hoy).
- **Coeficientes.** HECHO: Decreto Normativo de Urgencia Fiscal 12/2022, de 27 de diciembre (BOTHA 30-12-2022), para hechos imponibles devengados desde el 01-01-2023. Fuente: https://www.fiscal-impuestos.com/sites/fiscal-impuestos.com/files/NFL021712.pdf
  - Tabla, de <1 a 20 años o más: 0,15 · 0,15 · 0,14 · 0,15 · 0,17 · 0,18 · 0,19 · 0,18 · 0,15 · 0,12 · 0,10 · 0,09 · 0,09 · 0,09 · 0,09 · 0,10 · 0,13 · 0,17 · 0,23 · 0,29 · 0,45 (igual que la de Gipuzkoa 2024).
  - Las ordenanzas de 2026 leídas (Oyón-Oion y Lantarón) tienen todos sus coeficientes por debajo de esta tabla. Vitoria declara una tabla de 0,15 a 0,40.
  - **PENDIENTE:** si hay una tabla foral posterior (2024-2026).

**Municipios incorporados**

| Municipio (INE) | Tipo | Coeficientes | Bonificación por herencia | Fuente y estado |
|---|---|---|---|---|
| Vitoria-Gasteiz (01059) | 30 % | Propios de 0,15 a 0,40 sin transcribir: se usan los forales (prudente) | 95/75/50/10 % según los ingresos del heredero (27.200, 37.200 y 47.200 €). Solo primer grado, cónyuge o pareja, y vivienda habitual del heredero | OF n.º 4, BOTHA n.º 146 de 26-12-2025. PENDIENTE |
| Oyón-Oion (01043) | 16 % | 0,12 a 0,42 | 95/75/50/10 % según ingresos, vivienda habitual | https://ayuntamientodeoyon.eus/eu/udala/ordenantza-fiskalak/979-ordfisc-5-iivtnu-tr2026-impuesto-sobre-el-incremento-de-valor-de-los-terrenos-de-naturaleza-urbana-1/file.html. PENDIENTE |
| Lantarón (01902) | 12 % (art. 8) | 0,14 a 0,40 (a 4 años se toma 0,16, el mayor de las dos lecturas) | 90 % con ingresos brutos ≤ 21.957,50 € y vivienda habitual del heredero (art. 5.3) | https://www.araba.eus/botha/Boletines/pdfni/2026/049/2026_049_01172_C.pdf (BOTHA n.º 49, 29-04-2026). PENDIENTE |

Nota de modelado: la «vivienda habitual del heredero» se acredita en el motor con la marca de convivencia (`convivio2anios`), igual que se hacía ya en Vitoria.

## 5. Cómo calcula el motor

- **Régimen.** Lo fija `ord.regimen` en las ordenanzas forales incorporadas o, sin ordenanza, la provincia del código INE (`regimenPlusvalia(ine)`). Los municipios de régimen común no cambian: las 889 pruebas anteriores siguen pasando.
- **Tipo.**
  - Ordenanza incorporada: el suyo, limitado al máximo foral.
  - Sin ordenanza: el máximo foral (25 % en Navarra, 30 % en los demás).
  - Tipo introducido a mano: limitado al máximo foral.
  - Los datos de Hacienda (solo régimen común) no se usan.
- **Coeficientes.** Los de la ordenanza, limitados a la tabla foral (como prevén las propias ordenanzas: «se aplicará este directamente»). Sin ordenanza, la tabla foral. Si el devengo es anterior a la fecha de la tabla incorporada, se avisa.
- **Exención y bonificación.**
  - Navarra: exención legal en línea recta y entre cónyuges, antes que cualquier bonificación.
  - País Vasco sin ordenanza: bonificación introducida a mano para descendientes, ascendientes, cónyuge o pareja de hecho inscrita, limitada al 100 % (Bizkaia y Álava) o al 95 % (Gipuzkoa).
- **Método real y no sujeción.** Igual que en régimen común, pero las alertas citan los artículos forales.
- **Avisos.** Cada cálculo foral lleva un aviso «Régimen foral de …» con la norma, el tipo máximo y el estado de la tabla. Diagnóstico lo recoge como riesgo.
- **Pruebas.**
  - Nueva sección 22 de `src/test.mjs`: 45 comprobaciones (casos calculados a mano y una cota superior por ordenanza).
  - La sección 15 (robustez en 8.132 municipios) compara ahora los coeficientes forales con su tabla foral (`coefPlusvaliaMax`) y no con el art. 107.4 TRLRHL.

## 6. Pendiente (por orden de impacto)

1. **Navarra.** Segundo cotejo de la tabla del art. 175.2 para 2026 en el BON (LF 17/2025) e incorporar las tablas de 2024 y 2025 para devengos anteriores.
2. **Navarra.** Comprobar si la pareja estable está equiparada a los cónyuges en la exención del art. 173.1.b.
3. **Gipuzkoa.** Tipo máximo vigente tras 2021 y tablas de coeficientes de 2025 y 2026.
4. **Bizkaia.** Tabla foral de 2025 y 2026 (¿se adoptó la de 0,16 a 0,35?) y cita literal del artículo de la bonificación del 100 %.
5. **Álava.** Tablas forales posteriores a 2023, si las hay, y texto del DNUF 8/2021.
6. **Ordenanzas no localizadas.**
   - Bilbao: tipo, que fuentes secundarias sitúan en el 25 %.
   - Barakaldo, Portugalete, Santurtzi, Irun, Errenteria, Tudela, Barañáin y Burlada: se calculan con el régimen foral por defecto (en Navarra, exentas las herencias en línea recta y entre cónyuges).
   - Donostia: anexo de tipos.
   - Vitoria: tabla propia de coeficientes.
   - Getxo: versión de 2026.
7. **Basauri.** Cotejo en castellano o en el BOB: el 100 %, el tramo del año 20 y sus coeficientes.

## 7. Búsquedas y fuentes

Se han hecho 20 búsquedas web y las lecturas con WebFetch de las URL citadas.

No se pudieron leer directamente lexnavarra, bizkaia.eus, gipuzkoa.eus ni la página de la ordenanza de Bilbao: la herramienta solo admite URL que aparezcan en resultados de búsqueda, y la descarga directa la bloquea el proxy.
