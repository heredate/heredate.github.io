# Hereda+ 1.6 · auditoría independiente antes de publicar (ronda 5)

Rama `r5-auditoria` (desde `integracion-16`) · 08-10-2026 · auditor sin participación en el desarrollo. Juicio formado antes de leer docs-r4/, docs-juridico/ y docs-diseno/.

## Cómo se ha probado

- **Abogado de Málaga, primera vez y sin manual.** Bienvenida, expediente desde documentos con los ejemplos del equipo (caso 1, 26 archivos) y con **seis documentos propios** de datos distintos: causante «Rosario del Pilar O'Connor Núñez» (Marbella), testamento con dos legados (plaza de garaje a una nieta, con sustitución, y 20.000 € a una amiga) e institución por partes iguales con sustitución vulgar, nota simple con dos fincas (una al 50 %), BBVA, Catastro. Después: cálculo, Mi día, escritos (escritura, cuaderno, renuncia, 790, carta a la familia, Catastro, plusvalía, liquidación, paquete para la notaría), hoja del 650, informe en PDF, licencia, copias, despacho en red y ajustes. Capturas a 1440 y 390 px, claro y grafito.
- **Notario / inspector.** 20 casos calculados con un script propio que copia las tarifas de la norma y no usa el motor (`casos.mjs` en el borrador de trabajo; los más útiles pasan a `src/test.mjs`, sección 25), más intestadas (común, Cataluña, Aragón, Navarra, País Vasco, Galicia, Baleares), legítimas (común, Cataluña, Galicia, Aragón, País Vasco, viudo con ascendientes) y un exceso de adjudicación (Andalucía, Madrid, Cataluña). Fuentes: 14 consultas web (INEAF sobre la Ley 5/2021 de Andalucía; guiafiscal y recordinglaw sobre Aragón y Galicia; nota de prensa del Ayuntamiento de Madrid de 31-05-2022 sobre la bonificación de la plusvalía; notariosyregistradores sobre la reforma de 2019 del Fuero Nuevo; fiscal-impuestos sobre la resolución del TEAC de 30-05-2025).
- **Calidad.** Nombres con tildes, apóstrofos, guiones y HTML; 0 € y 99.999.999.999 €; fechas imposibles, 29 de febrero y fin de mes; copia «antigua» de Cauce con datos dañados; 300 expedientes; 390 px y grafito sin desbordes; consola; enlaces y marcadores de la web pública; coherencia de precios y cifras.

## Resultado de los números

**Los 20 casos independientes coinciden con el motor al céntimo** (una discrepancia inicial, Madrid a 18 años, era un error del auditor: el coeficiente de 18 años es 0,17). Comprobado: Andalucía (grupo III con coeficiente 1,5 y 1,9 el IV, INEAF; 99 % de bonificación; tipo medio efectivo de la nuda propiedad), Madrid (tarifa propia, ajuar residencial, 99 %; grupo III al 50 % por la Ley 2/2025), Cataluña (bonificación media ponderada sobre la base imponible), Comunitat Valenciana (cónyuge al 99 %; hermano al 25 % desde 01-06-2026), Galicia (1.000.000 €, tarifa de los grupos I y II), Aragón (tope de 500.000 €), Bizkaia (400.000 € y 1,5 %), Navarra (tarifa de la línea recta), recargo del art. 27 LGT (3 % con dos meses; 15 % + intereses de 85 días, con la reducción del 25 % solo sobre el recargo), plazos (31-08 → 01-03 por domingo; 31-03 → 30-09), plusvalía en Málaga (80 % con convivencia), Marbella (método real), Sevilla, Madrid (85 %), sin ordenanza y sin fecha de adquisición (coeficiente máximo y 30 %), pérdida (no sujeto) y tenencia de menos de un año (coeficiente prorrateado por meses). Intestadas y legítimas: todas las cuotas comprobadas coinciden con el CC, el CCCat, la Ley 2/2006, el CDFA y la Ley 5/2015; el orden navarro tras la LF 21/2019 (cónyuge antes que ascendientes; la pareja estable sin sucesión legal) coincide con la fuente.

Los fallos están en **cómo llegan los datos al motor y cómo salen a los documentos**, no en el motor.

## Hallazgos

### CRÍTICOS

**C1 · Testamento «por partes iguales» cargado desde documentos: 0 herederos y 0 € de Sucesiones.** · CORREGIDO
- Pasos: expediente nuevo «Desde documentos» con un testamento que instituye herederos por partes iguales (mis documentos propios). Cargar lo marcado.
- Esperado: los instituidos con el 50 % cada uno (art. 765 CC y la propia cláusula); los legatarios, sin porcentaje.
- Obtenido: el reparto «porcentajes» se aplicaba **antes** de que entraran las personas del mismo testamento (lecAplicar), así que nadie tenía porcentaje: Resumen «Herederos 0», «Sucesiones 0 €», los hijos «No hereda» y dos alertas críticas falsas de legítima lesionada. Si las personas ya estaban, el reparto se daba también a los legatarios (25 % cada uno de cuatro).
- Corrección: `lecRepartirIguales` (lector.js): se lee la lista de instituidos («instituye herederos … a sus dos hijos, X e Y») y, al final de la carga, se reparte solo entre ellos (o, si no se leen, entre quien no es cónyuge ni solo legatario). Prueba: test-lector «r5 H1» (falla antes, pasa después).

**C2 · Páginas legales publicadas con marcadores** (`[NIF]`, `[RAZÓN SOCIAL]`, `[DOMICILIO]`, `[EMAIL DE CONTACTO]`, `[ENTIDAD BANCARIA]`… en aviso legal, condiciones, privacidad y contratar). · ABIERTO (no es código)
- El art. 10 LSSI exige identificar al titular. No se puede vender ni cobrar con ellas así. Lo resuelve Javier rellenando `src/empresa.json` y reconstruyendo (el build ya lo avisa).

### IMPORTANTES

**I1 · Nombres compuestos mal leídos en listas.** · CORREGIDO. «IÑAKI y MARÍA JOSÉ GARCÍA O'CONNOR» daba «Iñaki **José** García O'connor»; «ANA y MARÍA DEL CARMEN LÓPEZ RUIZ» daba «Ana del Carmen López Ruiz». El nombre pasa tal cual a la escritura y al cuaderno. Ahora los apellidos son las dos últimas unidades con sus partículas (`lecListaNombres`). Prueba: test-lector «r5 H2».

**I2 · Mayúsculas tras apóstrofo y guion con tilde.** · CORREGIDO. «O'connor», «López-álvarez» (el `\w` no coge la «á»). Ahora «O'Connor», «López-Álvarez», «L'Hospitalet» y «Sant Joan d'Alacant» (`lecTitulo`). Prueba: «r5 H3».

**I3 · Los legados leídos del testamento no se muestran en ningún sitio.** · CORREGIDO. El lector guardaba `notaLegado` en la persona y nadie lo usaba: el garaje legado al sobrino (caso 1 del equipo) se adjudicaba en la escritura a la viuda y los hijos, sin aviso. Ahora, si un legatario no tiene ningún bien marcado como legado, hay alerta en el cálculo («Para revisar») y una ⟦REVISIÓN OBLIGATORIA⟧ en la escritura y el cuaderno; si es dinero, se dice que el programa no lo descuenta solo (`legadosSinBien`, logic.js). Además el texto del legado ya no se corta en «20.000 €» (antes «… EUROS (20»). Prueba: «r5 · 20.000 €»; comprobado en el navegador.

**I4 · La escritura y el cuaderno omiten en silencio los bienes sin valor.** · CORREGIDO. En el caso 1, el turismo SEAT y el segundo inmueble de calle Larios (del IBI) desaparecían del inventario y de las adjudicaciones, aunque sí se nombraban en la liquidación de gananciales. Ahora se listan en una ⟦REVISIÓN OBLIGATORIA⟧: valorar o confirmar que no son de la herencia; si no, adición posterior (art. 1079 CC).

**I5 · Hoja del 650: la cifra de la reducción era el máximo legal, no lo aplicado.** · CORREGIDO. «Reducción por parentesco 1.000.000,00 €» y «Total reducciones 1.000.000,00 €» sobre una base de 27.136,34 €, con botón «Copiar». Ahora se copia lo aplicado (27.136,34 €) y la nota dice el máximo legal (firma.js). Comprobado con `vf650Texto`; escritos.mjs sigue en verde.

**I6 · Nieto o sobrino sin «Desciende de»: hereda como representante de un premuerto inventado, sin aviso.** · CORREGIDO (aviso). Intestada con dos hijos vivos y una nieta sin estirpe: la nieta recibe 1/3 (arts. 924-934 CC solo dan representación si el progenitor ha premuerto). El motor ahora avisa (también para sobrinos) y el árbol ya no dibuja «Hijo/a premuerto · Representado por su estirpe» sino «Progenitor sin indicar · Indica «Desciende de»». Pruebas: test.mjs sección 25 (H7).

**I7 · Versión de la normativa sin subir tras la ronda 4.** · CORREGIDO. Baleares grupo III, tope de Galicia y 19 ordenanzas cambian cifras, pero `NORMA_V` seguía en 2026-09-28.3: los expedientes abiertos cambiaban de importe sin el aviso «Recalculado por un cambio de normativa» y el informe PDF citaba la versión vieja. Ahora 2026-10-08.1, con dos novedades (Baleares y Galicia) en Normativa.

**I8 · Andalucía: el ajuar por defecto es 0 € cuando no hay muebles («criterio ATA»).** · ABIERTO (decisión jurídica). Es la opción menos prudente: el TEAC (30-05-2025, RG 6258/2024) fija la base en las viviendas de uso residencial, y el propio motor dice «práctica real por confirmar». No se ha podido confirmar si esa resolución es de unificación de criterio, que obligaría a la ATA (art. 242 LGT). Para grupos I y II no cambia nada (reducción de 1.000.000 €); para hermanos, sobrinos y extraños sí. Recomendación a la mesa jurídica: que por defecto se use el modo residencial también en Andalucía, avisando.

**I9 · Trámite condicional como «Crítico».** · ABIERTO. «Si alguien usa el coche antes del reparto» (DGT, 90 días, art. 32.6 RGV) sale como asunto crítico «80 días tarde» y encabeza Mi día en todo expediente con vehículo, aunque nadie lo use. Lleva a un abogado a perder tiempo o a desconfiar de las alertas. Propuesta: que no cuente como crítico hasta que se confirme que alguien conduce el coche.

### MENORES

- M1 · Bienvenida: mezclaba «su despacho / su agenda / su membrete» con el tuteo del resto. · CORREGIDO.
- M2 · «Versión 1.5» en la barra lateral, en Novedades, en el pie y en el titular de la landing («Lo que ya hace la versión 1.5»), aunque Novedades y la landing ya anuncian el despacho en red de la 1.6. · ABIERTO: lo cambia el director al publicar (`VERSION_APP`, landing).
- M3 · Normativa: «Revisada el 28 de septiembre de 2026» (biblioteca.json), aunque la ronda 4 cotejó fuentes el 08-10. · ABIERTO.
- M4 · Árbol familiar: los porcentajes son económicos («21 %» por hijo con nuda propiedad, «15 %» la viuda); un abogado espera 25 % de nuda propiedad. Está explicado en la leyenda, pero confunde. · ABIERTO.
- M5 · Partición: si se adjudica el piso entero a un hijo y la cuenta queda en proindiviso, el cuadro le da también la mitad de la cuenta y cobra TPO sobre esa «parte evitable» (1.000 €), cuando lo natural es dar la cuenta al otro. Lo marca como evitable, pero el coste total queda inflado hasta que el abogado reparte la cuenta. · ABIERTO.
- M6 · Alerta «Falta la edad… cambia el grupo y el valor del usufructo» también para un legatario extraño, al que la edad no le cambia nada. · ABIERTO.
- M7 · «2.000 acciones de Telefonica» sin tilde (sale así de los datos fiscales). · ABIERTO.
- M8 · Con importes absurdos (1e11 €) las cifras se cortan con «…» en las tarjetas del móvil; el cálculo no falla. · ABIERTO.
- M9 · Con 300 expedientes y la caché vacía, la cartera tarda 1,6 s en pintarse (Mi día 1,1 s). Aceptable. · ABIERTO.

### Lo que está bien (comprobado, sin hallazgo)

Ningún error de consola en ningún recorrido; sin inyección de HTML con nombres como `<img onerror>`; sin desbordes horizontales a 390 px ni en grafito; las fechas imposibles y los importes de 0 € no rompen nada; la copia antigua de Cauce se restaura y el expediente con fecha imposible queda apartado con su pantalla de reparación; cifrado, licencia, red y copias pasan sus baterías; precios coherentes entre landing, contratar, condiciones y material de venta; las cifras de la landing (pruebas, ordenanzas, territorios) salen del build y cuadran.

## Pruebas

- `node src/test.mjs`: **1.233 correctas** (antes 1.218; +15 en la sección 25).
- `node src/test-lector.mjs`: **441 correctas** (antes 436; las 5 nuevas fallan con el lector de integracion-16).
- QA del navegador en 8811: producto 45/45, experiencia 47/47, robustez 53/53, a11y 304/304 sin infracciones, red 120/120, escritos 2.069/2.069, foral 26/26, web «todo correcto» y lector de extremo a extremo (prueba.mjs) en verde.

## Archivos tocados

`src/app/lector.js`, `src/app/logic.js`, `src/app/escritos.js`, `src/app/firma.js`, `src/app/visual.js`, `src/app/normativa.js`, `src/app/bienvenida.js`, `src/motor.mjs` (solo avisos, ninguna cifra), `src/test.mjs`, `src/test-lector.mjs`, construidos en `app/` y `dist/`.
