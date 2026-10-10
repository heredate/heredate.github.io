# Ronda 4 · Escritos (agente `escritos`)

Objetivo: que los documentos que saca Hereda+ resistan la lectura de un abogado de sucesiones y de un notario: base legal correcta, estilo notarial y forense, cifras idénticas a las del motor, datos que faltan marcados y nunca inventados, y Word de calidad.

## 1. Inventario de lo que genera la app

| Documento | Dónde | Formato | Estado tras la ronda |
|---|---|---|---|
| Propuesta de liquidación | `estrategia.js` (`docLiquidacion`) | vista, PDF, Word | Revisado; sin cambios de contenido |
| Nota para la notaría | `logic.js` (`docTexto0`, «notaria») | vista, PDF, Word | **Corregido** (numeración, datos que constan, parentesco) |
| **Borrador de escritura de herencia** | `escritos.js` (`esrEscritura`) | vista, PDF, Word | **Nuevo** |
| Cuaderno particional | `escritos.js` (`esrCuaderno`) | vista, PDF, Word | **Rehecho** (sustituye al de `logic.js`) |
| Liquidación final y recibí | `logic.js` | vista, PDF, Word | NIF de cada heredero si consta |
| Informe para el cliente | `logic.js` | vista, PDF, Word | Revisado |
| **Carta a la familia** | `escritos.js` (`esrCartaFamilia`) | vista, PDF, Word | **Nueva** (además del recordatorio por WhatsApp de `terceros.js`) |
| Carta al banco | `logic.js` | vista, PDF, Word | NIF y domicilio del causante y de los herederos si constan |
| **Solicitud de certificados (modelo 790-006)** | `escritos.js` (`esrSolicitud790`) | vista, PDF, Word | **Nueva** |
| Guía de certificados | `logic.js` | vista, PDF, Word | Quitada una afirmación sin fuente («fallecimientos posteriores a 2009») |
| Acuerdo entre herederos | `logic.js` | vista, PDF, Word | NIF si consta |
| Solicitud de prórroga del ISD | `logic.js` | vista, PDF, Word | NIF y domicilios si constan (modelo 659 de Andalucía: VERIFICADO en la guía de la ATRIAN) |
| **Escritura de renuncia** | `escritos.js` (`esrRenuncia`) | vista, PDF, Word | **Rehecha** (antes «minuta») |
| Instancia de heredero único | `logic.js` | vista, PDF, Word | Notario, fecha y protocolo del título si constan |
| **Declaración de plusvalía** | `escritos.js` (`esrPlusvalia`) | vista, PDF, Word | **Nueva** |
| **Cambio de titular en el Catastro (900D)** | `escritos.js` (`esrCatastro`) | vista, PDF, Word | **Nuevo** |
| Hoja de encargo y presupuesto | `logic.js` | vista, PDF, Word | Revisada |
| Escritos a terceros (carta, reiteración, queja al SAC, reclamación al supervisor) | `terceros.js` | vista, PDF, Word | Huecos ⟦…⟧, Word con estilos, copia y correo sin borrar huecos |
| Paquete para la notaría | `firma.js` (`paqueteBloques`) | PDF | **Corregido** un error (ver 2.3) |
| Hoja del 650, informe de cálculo | `firma.js`, `informe.js` | pantalla, PDF | Revisados; sin cambios |

Botón nuevo en «Listo para firmar»: «Borrador de escritura».

## 2. Qué se corrigió y por qué

### 2.1 Huecos y datos
- Todos los huecos pasan a `⟦…⟧` (antes convivían `[NIF]` y `⟦REVISIÓN…⟧`): el Word los resalta en amarillo, la vista previa los marca y el PDF los imprime entre corchetes **dentro del párrafo** (antes cualquier `⟦` partía el párrafo y lo convertía en nota). `esrHuecos()` convierte los escritos antiguos y nunca anida marcadores dentro de una nota de revisión.
- Los escritos ya no piden un dato que consta: NIF y domicilio del causante y de cada heredero, estado civil, referencia catastral, cargas, notario, fecha y protocolo del título (datos de «Listo para firmar»). Antes la nota para la notaría, la carta al banco, la prórroga, el acuerdo, el recibí y la instancia de heredero único dejaban `[NIF]` aunque estuviera en el expediente.
- «Copiar texto» y el correo de `terceros.js` borraban el contenido de cualquier `⟦…⟧`: ahora quitan solo las notas de revisión y dejan los huecos como `[dato]`.

### 2.2 Contenido jurídico
- **Nota para la notaría**: la numeración saltaba del 4 al 6 cuando no había gananciales; parentesco con barra («hijo/a») → «hijo o hija» (`gnRel`); título intestado con cita de los arts. 55 y 56 de la Ley del Notariado.
- **Cuaderno particional**: ahora con las cinco operaciones (inventario con tabla, avalúo, liquidación del caudal, cuotas y haberes, **formación de lotes** con una tabla por heredero, adjudicaciones), liquidación previa de gananciales (arts. 1392, 1396-1404 y 1406-1407 CC), valoración de usufructos (art. 26 Ley 29/1987), efectos (arts. 1068 y 1069 CC), gastos (art. 1064 CC), aviso de colación si hay donaciones (arts. 1035-1050 CC) y nota de inscripción correcta (art. 14, párrafos tercero y cuarto, LH, y art. 79 RH). Las cifras salen de `particion`/`cuadroParticion`/`cpCuaderno` (las mismas del cuadro y del informe).
- **Escritura de renuncia**: antes era una minuta de un solo renunciante, con una doble coma y sin advertencias. Ahora es una escritura completa (varios renunciantes) con: arts. 988, 990, 991, 997, 999-1000 y 1008 CC; efectos según haya o no testamento (arts. 922, 923, 929, 981-986 y 774 CC); **derecho de los acreedores del renunciante a aceptar en su nombre (art. 1001 CC)**, que faltaba y es justo el caso típico de quien renuncia por deudas; fiscalidad (art. 28.1 y 28.2 Ley 29/1987, art. 58 RISD); menores (art. 166 CC).
- **Catastro**: el brief pedía el «modelo 901N». Ese modelo ya no existe: la **Orden HAC/1293/2018** aprobó el modelo único **900D** y derogó la Orden EHA/3482/2006 (que regulaba 901N-904N). Fuente: BOE (eli/es/o/2018/11/19/hac1293). La declaración no hace falta si la escritura pública lleva la referencia catastral, porque la comunica el notario (arts. 13.2 y 14.a TRLCI, RDLeg 1/2004, texto consolidado del BOE). Plazo de dos meses desde el día siguiente al hecho: Sede Electrónica del Catastro, «Procedimientos y trámites» (VERIFICADO). En Navarra y País Vasco el catastro es foral: el escrito lo avisa.
- **Paquete para la notaría** (`firma.js`): decía «No constan deudas ni gastos deducibles» justo después de listarlos cuando ninguna deuda era ganancial (el `else` colgaba de la condición equivocada).
- **Partición**: listas «a y b y c» → «a, b y c» en el exceso de adjudicación y en la sugerencia (`cpLista`).
- **Carta al notario en `terceros.js`**: «D./D.ª [notario]» (barra) → «[nombre del notario]».
- **Documentos necesarios**: notaría competente para el acta de declaración de herederos según el art. 55.1 LN (último domicilio o residencia habitual, mayor parte del patrimonio, lugar del fallecimiento o distrito colindante).

### 2.3 Lo nuevo (todo editable en Word, con los datos y las cifras del expediente)
- **Escritura de manifestación, aceptación y adjudicación** (minuta para la notaría): NÚMERO / Ante mí / COMPARECEN / INTERVIENEN / EXPONEN (fallecimiento, título sucesorio con su base legal, llamamiento con los derechos del motor, renuncias, certificado de seguros —art. 88 Ley 50/1980 y art. 3.1.c LISD—, inventario descrito bien por bien con tabla, pasivo, ajuar —art. 15 LISD—, valoración —art. 9.3 LISD—, gananciales, caudal partible y cuotas) / ESTIPULACIONES (aceptación —arts. 988, 998-999 CC, aviso del art. 1003—, liquidación de gananciales, **entrega de legados —arts. 882 y 885 CC—**, adjudicaciones, **excesos y compensaciones con el medio de pago —art. 24 LN y art. 177 RN—**, efectos —arts. 657, 989, 1068 y 1069 CC—, impuestos con tabla por heredero —arts. 67-68 RISD, arts. 106.1.a y 110.2.b TRLRHL, art. 254.1 y 254.5 LH—, Catastro —arts. 14.a, 38 y 40 TRLCI—, inscripción —arts. 14, 16 y 19 bis LH, 76-80 RH—, gastos —art. 1064 CC—) / OTORGAMIENTO Y AUTORIZACIÓN (art. 79 LGT, RGPD y LO 3/2018) / documentos que se unen. Avisos automáticos: menores (arts. 163, 166 y 1060 CC), medidas de apoyo (arts. 249 y ss., 287 y 289 CC), vecindad civil foral o supuesta (arts. 9.8, 14 y 16 CC) y elemento internacional (arts. 21, 22 y 62 y ss. del Reglamento (UE) 650/2012).
- **Solicitud de certificados (790-006)**: qué se pide (anexo II del Reglamento Notarial; Ley 20/2005 y RD 398/2007), desde cuándo (15 días hábiles, fecha del motor), tabla con los datos del causante y del solicitante, cómo se presenta y qué hacer después.
- **Carta a la familia**: documentos que faltan agrupados (fallecido, herederos, bienes, deudas y seguros) con dónde se consigue cada uno en lenguaje llano; separa lo que pide el despacho (solicitudes a terceros abiertas y valor de referencia) y lo ya recibido; plazo del ISD y de la prórroga; aviso de aceptación tácita (art. 999 CC).
- **Declaración de plusvalía** por ayuntamiento: sujetos pasivos (art. 106.1.a TRLRHL), devengo (art. 109.1.a), datos catastrales y de adquisición, tablas con las dos bases (arts. 104.5, 107.4 y 107.5), cuota por adquirente con bonificación (art. 108.4), opción por el método real cuando es el aplicado, no sujeción si no hay incremento, plazo (art. 110.2.b) y aviso de autoliquidación (art. 110.4).

### 2.4 Word (`esrDocx`, lo usa `docx()` de `logic.js`)
Antes: un único `document.xml` sin estilos, sin propiedades y con todo en párrafos sueltos. Ahora: `styles.xml` (Título, Subtítulo, Título 1 y 2, Lista, Firma, Nota de revisión, Texto de tabla, Encabezado, Pie, Tabla Hereda), `numbering.xml` (viñetas en dos niveles), `settings.xml` (modo de compatibilidad 15: Word no abre en «modo de compatibilidad»; idioma es-ES), cabecera con el membrete del despacho, pie con referencia, nombre del expediente y «Página N de M», `docProps/core.xml` y `app.xml`, párrafos justificados, cláusulas con el ordinal en negrita, tablas reales (inventario, haberes, lotes, impuestos, titulares del Catastro) con anchos calculados y cabecera repetida, firmas separadas y huecos resaltados en amarillo.

## 3. Pruebas

`node tools/qa/escritos.mjs http://127.0.0.1:8806/app/ [--soffice]` — **2070 comprobaciones, 0 fallos**:
- 18 expedientes (14 de la demostración + legado en Cataluña, exceso de adjudicación compensado en Andalucía, intestada con cónyuge y deuda ganancial en Madrid, y uno con todos los datos de identificación), 288 escritos.
- Sin `undefined`, `NaN`, `null`, `[object`, corchetes antiguos, marcadores anidados o desequilibrados, espacios o puntuación dobles.
- Cifras = motor: Sucesiones total y por heredero, caudal partible, haber de cada heredero, total de cada lote, cuota de plusvalía de cada inmueble, y en el Catastro pleno dominio + nuda propiedad = 100 % por inmueble.
- Huecos solo donde falta el dato (expediente completo: ningún escrito marca NIF, referencia catastral, notario, protocolo ni domicilio que consten).
- Word: 128 archivos; zip y 11 partes OOXML, 1.408 XML bien formados, cabecera, pie con campos PAGE/NUMPAGES, tablas, numeración, notas y resaltado; **python-docx abre los 128**; con `--soffice`, **LibreOffice los convierte a PDF**. Revisados a ojo (capturas de los PDF de LibreOffice): escritura, cuaderno, Catastro y carta.
- PDF: las notas en recuadro coinciden con los avisos de revisión; los huecos quedan en línea; el paquete de la notaría se genera sin la frase errónea.
- Vista previa: tablas HTML, huecos resaltados, 0 infracciones axe (WCAG 2.2 AA, temas claro y grafito) y sin desbordamiento a 390 px.

Batería del brief: `src/test.mjs` 1036/0, `src/test-lector.mjs` 436, `producto.mjs` 45/0, `experiencia.mjs`, `robustez.mjs --rapido` 53/0, `a11y.mjs`, `ejemplos/prueba.mjs` (cifras en el informe al director).

## 4. Pendiente o no localizado
- **Importe de la tasa del modelo 790-006**: NO LOCALIZADO en una fuente oficial actual (la página del Ministerio no lo da); el escrito remite al propio modelo y lleva aviso.
- **Datos del 790 que el expediente no recoge** (fecha y lugar de nacimiento, nombres de los padres, lugar de la defunción): quedan como huecos. Añadirlos a la ficha del causante los rellenaría solos.
- **Inscripción registral** (Registro, tomo, libro, folio, finca) y **descripción registral** de cada finca: el expediente no los guarda; quedan como huecos en la escritura y el cuaderno.
- **Plazo de dos meses del Catastro**: verificado en la Sede del Catastro; el artículo del RD 417/2006 que lo fija no se ha cotejado (PENDIENTE).
- **Vecindad civil foral**: los escritos citan el Código Civil y avisan de que, con vecindad foral, hay que sustituir las referencias por las del derecho propio (p. ej., libro IV del Codi civil de Catalunya). No hay redacción foral específica.
- **Renuncia por menores**: se cita el art. 166 CC; el alcance de la excepción del mayor de 16 años con consentimiento en documento público para la repudiación no se ha cotejado: queda en la revisión del abogado.
- El nombre del sujeto en «el compareciente» usa el masculino genérico notarial cuando no consta el género; con el dato, «la compareciente».
