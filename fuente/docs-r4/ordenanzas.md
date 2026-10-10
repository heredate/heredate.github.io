# Ronda 4 · Ordenanzas fiscales del IIVTNU (plusvalía) — agente `ordenanzas`

Fecha: 08-10-2026. Rama `r4-ordenanzas`.

## Resultado

- Partíamos de 312 entradas en `src/ordenanzas-datos.json`, 119 sin ordenanza leída (NO LOCALIZADO).
- **13 pasan de NO LOCALIZADO a V o P** (8 V, 5 P). Quedan **106** sin localizar.
- **6 municipios nuevos** (no estaban ni en el motor ni en el JSON ni en los datos de Hacienda), todos con el texto íntegro leído en el boletín: Las Torres de Cotillas (≈22.000 hab.) y cinco pequeños leídos de paso (Calasparra, Albudeite, Cenicientos, El Vellón, El Álamo).
- Corrección menor: L'Ametlla del Vallès pasa de `DAC` a `DAC1` (el texto leído dice «de primer grau»).
- Torremolinos (29901): la bonificación sigue sin localizar. Se ha encontrado el PDF oficial de la OF n.º 29, pero el ayuntamiento lo bloquea a la lectura automática (robots.txt) y el BOP de Málaga no responde. Se deja como estaba: 0 % y aviso para que el abogado indique el porcentaje.

V = texto oficial leído (tipo y bonificación por causa de muerte, con artículo y boletín). P = falta un detalle o el texto puede haber cambiado después; se explica en `notas`.

| Municipio | INE | Estado | Tipo | Bonificación por herencia | Fuente |
|---|---|---|---|---|---|
| Albudeite (nuevo) | 30004 | V | 30 % | 95 % DAC | [Ordenanza fiscal del IIVTNU de Albudeite, texto íntegro (aprobación definitiva, BORM n.º 117 de 23-05-2022)](https://borm.es/services/anuncio/ano/2022/numero/2551/pdf?id=805614) |
| Alhama de Murcia | 30008 | P | 27 % | 50 % DAC | [Ordenanzas fiscales de Alhama de Murcia, ejercicio 2022 (recopilación municipal), ordenanza del IIVTNU (última modificación: Pleno 29-10-2019)](https://datos.alhamademurcia.es/descargas/118s-2022-ordenanzas-fiscales-ejercicio-2022con-plusvalia.pdf) |
| Archena | 30009 | V | ≤0: 30 % / ≤1: 4,03 % / ≤2: 7 % / ≤3: 9,84 % / ≤4: 12,35 % / ≤5: 15,44 % / ≤6: 18,56 % / ≤7: 28,87 % / ≤18: 30 % / ≤19: 23,75 % / resto: 20 % | 80 % DAC (vivienda habitual; resto 40 %) | [Ordenanza fiscal del IIVTNU de Archena, texto íntegro (aprobación definitiva, BORM n.º 142 de 22-06-2022, pág. 20615)](https://www.borm.es/services/anuncio/808193/pdf) |
| Arenys de Mar | 08006 | V | 30 % | 85 % DAC1 (vivienda habitual) | [Ordenança fiscal núm. 4 de l'IIVTNU d'Arenys de Mar, text consolidat (BOPB 02-05-2022, CVE 202210066925); bonificació modificada al BOPB 27-12-2023 (75 %) i 24-12-2025 (85 %)](https://bop.diba.cat/anuncio/ver-pdf/3227289) |
| Calasparra (nuevo) | 30013 | V | 30 % | ninguna | [Ordenanza fiscal del IIVTNU de Calasparra, texto completo (aprobación definitiva de la modificación, BORM n.º 123 de 30-05-2022)](https://www.borm.es/services/anuncio/ano/2022/numero/2763/pdf?id=806517) |
| Camargo | 39016 | P | 26 % | sin comprobar (a mano) | [Ayuntamiento de Camargo, anexo de cálculo de plusvalías e impreso REN09 de la sede electrónica (no es la ordenanza)](https://sede.aytocamargo.es/Documentos/anexo_calculo_plusvalias.pdf) |
| Castelldefels | 08056 | V | 30 % | 95 % DAC1 (vivienda habitual, mantener 3 años) | [Ordenança fiscal núm. 5 de l'IIVTNU de Castelldefels, text íntegre (BOPB 05-05-2022, CVE 202210073129)](https://bop.diba.cat/anuncio/ver-pdf/3233933) |
| Cenicientos (nuevo) | 28037 | V | 30 % | ninguna | [Ordenanza fiscal del IIVTNU de Cenicientos, texto íntegro (aprobación definitiva de la modificación, BOCM n.º 215 de 09-09-2022)](https://www.bocm.es/boletin/CM_Orden_BOCM/2022/09/09/BOCM-20220909-57.PDF) |
| El Vellón (nuevo) | 28168 | V | ≤1: 10 % / ≤2: 15 % / ≤3: 21 % / ≤4: 26 % / resto: 30 % | 40 % DAC | [Ordenanza fiscal del IIVTNU de El Vellón, texto íntegro (aprobación definitiva de la modificación, BOCM n.º 107 de 06-05-2022)](https://www.bocm.es/boletin/CM_Orden_BOCM/2022/05/06/BOCM-20220506-76.PDF) |
| El Álamo (nuevo) | 28004 | V | ≤5: 30 % / ≤10: 28 % / ≤15: 26 % / ≤20: 23 % / resto: 18 % | 25 % DACP (vivienda habitual) | [Ordenanza fiscal del IIVTNU de El Álamo, texto íntegro (aprobación definitiva de la modificación, BOCM n.º 122 de 24-05-2022)](https://www.bocm.es/boletin/CM_Orden_BOCM/2022/05/24/BOCM-20220524-68.PDF) |
| Guadarrama | 28068 | V | ≤5: 20 % / ≤10: 21 % / ≤15: 24 % / resto: 26 % | 95 % DAC (vivienda habitual) | [Ordenanza fiscal del IIVTNU de Guadarrama, texto completo (aprobación definitiva de la modificación, BOCM n.º 129 de 01-06-2022)](https://www.bocm.es/boletin/CM_Orden_BOCM/2022/06/01/BOCM-20220601-89.PDF) |
| Las Torres de Cotillas (nuevo) | 30038 | V | 30 % | 95 % DACP | [Ordenanza fiscal del IIVTNU de Las Torres de Cotillas, texto íntegro (aprobación definitiva de la modificación, BORM n.º 237 de 10-10-2024)](https://www.borm.es/services/anuncio/830746/pdf) |
| Montcada i Reixac | 08125 | P | 30 % | 95 % DAC1 (vivienda habitual) | [Ordenança fiscal núm. 4 de l'IIVTNU de Montcada i Reixac, text íntegre (BOPB 26-06-2023, CVE 202310098847)](https://bop.diba.cat/anuncio/ver-pdf/3476515) |
| Oleiros | 15058 | V | 30 % | 75 % ≤20.000 € suelo / 50 % resto DACP1 (vivienda habitual) | [Ordenanza fiscal n.º 13 del IIVTNU de Oleiros, texto consolidado (última modificación: Pleno 30-06-2022, BOP A Coruña n.º 128 de 07-07-2022)](https://www.oleiros.org/documents/39407/7bf1feea-fb73-96e2-0c76-52315a3ede74) |
| San Javier | 30035 | P | 18 % | 95 % DAC1 | [Ordenanza fiscal del IIVTNU de San Javier: modificaciones publicadas en el BORM n.º 287 de 15-12-2011 (art. 17.1) y n.º 277 de 29-11-2013 (art. 16.2, tipo); listado de normativa municipal](https://www.sanjavier.es/es/descargar-fichero-L2Fzc2V0cy8xZjBiODBlYS8xMjIyLnBkZg++) |
| Sant Andreu de la Barca | 08196 | V | 30 % | 95 % ≤30.000 € suelo / 25 % resto DAC1 (vivienda habitual, convivencia, mantener 3 años) | [Ordenança fiscal núm. 3 de l'IIVTNU de Sant Andreu de la Barca, text íntegre (BOPB 29-03-2022, CVE 202210048799); art. 6.2 i 7.8 modificats al BOPB 23-12-2025](https://bop.diba.cat/anuncio/ver-pdf/3211651) |
| Santa Coloma de Gramenet | 08245 | P | 30 % | 75 % CP (vivienda habitual); 50 % D1 (vivienda habitual, convivencia, mantener 4 años) | [Ordenança fiscal núm. 5 de l'IIVTNU de Santa Coloma de Gramenet, text íntegre (BOPB 04-05-2022, CVE 202210065184)](https://bop.diba.cat/anuncio/ver-pdf/3225829) |
| Villanueva de la Cañada | 28176 | V | 14 % | 50 % DACP (vivienda habitual, mantener 3 años) | [Ordenanza fiscal del IIVTNU de Villanueva de la Cañada, texto vigente publicado por el Ayuntamiento (modificaciones en BOCM n.º 105 de 04-05-2022 y n.º 281 de 25-11-2025)](http://www.ayto-villacanada.es/wp-content/uploads/2025/11/IMPUESTO-SOBRE-EL-INCREMENTO-DEL-VALOR-DE-LOS-TERRENOS-DE-NATURALEZA-URBANA_25_11_2025.pdf) |
| Villaquilambre | 24222 | V | ≤5: 30 % / resto: 26 % | 95 % DAC | [Ordenanza fiscal XIV del IIVTNU de Villaquilambre, texto íntegro (aprobación definitiva: Pleno 22-12-2023, BOP León n.º 244 de 27-12-2023; aplicable desde 01-01-2024)](https://www.villaquilambre.es/wordpress/wp-content/uploads/2024/06/2023-12-27-ORDENANZA-FISCAL-XIV-IIVTNU.pdf) |

Parentesco: DAC = descendientes, ascendientes y cónyuge; DACP = además pareja de hecho inscrita; DAC1 = solo primer grado (hijos, padres) y cónyuge; DACP1 = DAC1 más pareja; CP = cónyuge o pareja; D1 = solo hijos.

### Por qué cada P es P
- **Alhama de Murcia**: texto de 2019 (anterior al RDL 26/2021) en la recopilación oficial de 2022. El art. 9 da 95 % si es «la primera residencia de éstos» y 50 % en otro caso; la redacción no deja claro de quién es la residencia: se aplica el 50 % (seguro) y el abogado puede indicar el 95 % a mano.
- **San Javier**: la web municipal solo lista modificaciones hasta 2013 (tipo 18 %, 95 % a cónyuge, hijos y padres). No consta adaptación posterior.
- **Camargo**: solo el tipo (26 %), sacado de los impresos oficiales de la sede; la bonificación queda «sin comprobar» y se pide a mano.
- **Santa Coloma de Gramenet**: texto íntegro de 2022 (cónyuge o pareja 75 %; hijos convivientes 50 %); la OF 5 se volvió a modificar para 2025 y 2026 en un anexo que no se pudo leer.
- **Montcada i Reixac**: texto íntegro de 2023 (95 %); las ordenanzas de 2026 modifican siete ordenanzas de impuestos y no se pudo comprobar si la OF 4 está entre ellas.

## Cambios en el código
- `src/motor.mjs` · `ordenanzaDesdeDatos`: `bonif` admite una **lista** de bonificaciones cuando la ordenanza da porcentajes distintos según el parentesco (se aplica la primera cuyo parentesco coincide). Nuevo código de parentesco `D1` (solo hijos). Corrección del texto «a el cónyuge» → «al cónyuge».
- `tools/generar-ordenanzas.mjs`: valida listas y el código `D1`.
- `src/app/logic.js` · `ordManualMotivo`: lee también listas.
- `src/test.mjs`: sección «19 bis» con 47 pruebas nuevas (hijo con la vivienda habitual, sobrino y casos límite de 18 municipios, más la lógica de listas); las otras 19 nuevas salen de las comprobaciones automáticas que recorren todas las ordenanzas. Total 1102, 0 fallidas.

## Pruebas
- `node src/test.mjs`: 1102 correctas · 0 fallidas (antes 1036).
- `node src/test-lector.mjs`: 436 correctas.
- `tools/qa/producto.mjs` 45/0 · `experiencia.mjs` 47/0 · `robustez.mjs --rapido` 53/0 · `a11y.mjs` 304/304 sin infracciones · `tools/ejemplos/prueba.mjs` OK (todos los documentos reconocidos).

## Cómo se ha buscado y por qué quedan 106
La búsqueda web casi nunca devuelve el PDF de un ayuntamiento concreto; ha funcionado mejor restringir la búsqueda al dominio municipal o al boletín (BORM, BOCM, BOPB y su catálogo CIDO, BOP de Guadalajara). Las causas de lo que queda sin leer, en llano:
- **Webs que no se dejan leer desde fuera**: muchas sedes municipales no responden (Paterna, Ferrol, Ribeira, Puerto de la Cruz, Azuqueca, San Andrés del Rabanedo), fallan por certificado (Getafe, Elda, Carmona, Don Benito, Benavente) o lo prohíben expresamente en su robots.txt (Torremolinos, Torre-Pacheco, Gandia, Manises, Maó, Cambrils). También el BOP de Alicante (y SUMA, que gestiona Benidorm, Calp, Elda y Villena), el de Málaga, el de A Coruña y el de Pontevedra.
- **Documentos demasiado largos**: el lector solo llega a unas 30 páginas; en los libros de ordenanzas de 100-400 páginas (Figueres, Olot, Salt, Igualada, Martos, Agüimes…) y en los boletines completos (BOP de Cádiz, el anuncio de Totana en el BORM) la plusvalía queda más allá.
- **Botones de descarga sin enlace** (Armilla, Ciempozuelos) o páginas que exigen JavaScript (Lalín).
- **Solo modificaciones parciales**: El Prat, Granollers (anexo no extraíble), Sant Feliu de Llobregat.
- **Texto superado**: Ingenio (solo el de 2013; existen versiones de 2024 y 2026). Se deja sin localizar para no calcular con un tipo que puede haber cambiado; el motor usa el máximo legal.

Para los municipios de más de 50.000 habitantes que siguen sin ordenanza (L'Hospitalet, Getafe, Talavera, Gandia, Avilés, Benidorm, Paterna, El Prat, Ferrol, Granollers, Elda, Adeje, Granadilla), el **tipo de 2026 ya lo da Hacienda**; lo que falta es la bonificación.

## Pendiente (NO LOCALIZADO, 106)

| Municipio | INE | Qué se ha intentado |
|---|---|---|
| A Estrada | 36017 | La página de Facenda de aestrada.gal enlaza la «Ordenanza nº 03 Imposto sobre o incremento de valor dos terreos de natureza urbana» (PDF subido en enero de 2024), pero el lector no pudo abrir el archivo. (Ronda 4, 08-10-2026.) Antes: NO LOCALIZADO. BOP Ponteve |
| Abrera | 08001 | Text íntegre consolidat OOFF 2026 (seu-e.cat/documents/10672388/…): la OF 5 IIVTNU (p. 80) queda fuera del texto extraíble. |
| Adeje | 38001 | Ronda 2: sin resultados en adeje.es ni BOP S/C Tenerife mediante el buscador. |
| Agüimes | 35002 | Tipo no localizado. HECHO: existe el Libro de Ordenanzas Fiscales 2026 (ordenanza IM.03 en pág. 231), pero el lector solo devolvió el índice y la ordenanza general. PENDIENTE: extraer las páginas 231 y siguientes. |
| Alcázar de San Juan | 13005 | La sede (ordenanzas fiscales) estaba en mantenimiento al consultarla. |
| Alhaurín el Grande | 29008 | sede.alhaurinelgrande.es no resuelve y el BOP de Málaga no responde desde fuera. (Ronda 4, 08-10-2026.) Antes: sede.alhaurinelgrande.es no resuelve (DNS) para el lector; BOP Málaga inaccesible. |
| Almendralejo | 06011 | La web municipal (https://www.almendralejo.es/ordenanzas.php) lista la O.F. n.º 4 (IIVTNU) pero los enlaces de descarga (versiones 3 y 4) devuelven un BOP Badajoz de 23/11/2001 que no contiene la ordenanza. |
| Andújar | 23005 | Texto íntegro de ordenanzas fiscales 2024 localizado (andujar.es/fileadmin/pdfs/transparencia/normas_y_acuerdos/ordenanzas_fiscales/2024/texto_integro_ordenanzas_2024.pdf) pero andujar.es no responde al lector (timeout). |
| Arahal | 41011 | Localizada la aprobación definitiva de la modificación de la ordenanza IIVTNU en BOP Sevilla n.º 69 de 10/04/2024 (CVE BOP-SE-2024-069005; PDF https://admbop.dipusevilla.es/export/sites/bop/.galleries/Documentos-Anuncios-en-PDF/firmado-1712703624732-final-1d70 |
| Arcos de la Frontera | 11006 | Búsqueda restringida a arcosdelafrontera.es sin resultado. |
| Armilla | 18021 | La ficha de descarga de la O.F. 6 (armilla.es/download/06-ordenanza-fiscal-6-plusvalia/, actualizada 03-05-2022) no expone el archivo: el botón de descarga funciona solo en el navegador. (Ronda 4, 08-10-2026.) Antes: La página de ordenanzas fiscales (armilla.e |
| Arnedo | 26018 | NO LOCALIZADO. La sede (sede.arnedo.es) carga las ordenanzas fiscales de forma dinámica, sin enlaces legibles; BOR (larioja.org) bloqueado por robots/tiempo de espera. |
| Avilés | 33004 | Ronda 2: compendio 2022 (aviles.es/documents/.../OdenanzasAVILES22.pdf y sede) — timeout o extracción truncada antes de la Ordenanza nº 400. |
| Ayamonte | 21010 | Búsquedas restringidas a ayamonte.es/aytoayamonte.es sin resultado; web municipal no accesible sin enlace previo. BOP Huelva no consultable. |
| Azuqueca de Henares | 19046 | El PDF municipal de la ordenanza (azuqueca.es, «WEB iivt 2022-01») no responde. El BOP de Guadalajara recoge la aprobación inicial de la modificación de las ordenanzas de impuestos para 2025 (Pleno 31-10-2024), sin el texto del IIVTNU. (Ronda 4, 08-10-2026.) A |
| Banyoles | 17015 | Ordenances fiscals 2026 (banyoles.cat, PDF compilado) localizadas; la OF 3 IIVTNU (p. 34) queda fuera del texto extraíble. |
| Barbate | 11007 | La descarga de la ordenanza n.º 28 (IIVTNU) en barbate.es no devuelve el PDF al lector; transparencia.barbate.es no resuelve. BOP 196/2025 solo modifica arts. 2, 5, 5 bis y 10 (pasada anterior). |
| Benavente | 49021 | Ronda 2: benavente.es/wp-content/uploads/2025/03/ORDENANZA-IIVTNU-2022.pdf sigue fallando por certificado SSL. |
| Benidorm | 03031 | La gestión del IIVTNU está delegada en SUMA Gestión Tributaria (comunicado municipal de 12-02-2024 en benidorm.org); la web de SUMA no se deja leer. El tipo de 2026 ya lo da Hacienda; la bonificación sigue sin comprobar. (Ronda 4, 08-10-2026.) Antes: Ronda 2:  |
| Bordils | 17025 | Sin tipo o sin URL de la fuente. Art. 6.2: «Es concedirà una bonificació del 60% de la quota de l'impost en les transmissions de terrenys… per causa de mort a favor dels seus descendents i adoptats, els cònjuges i els seus ascendents». La resta del paràgraf (r |
| Brenes | 41018 | Localizada la aprobación definitiva de la modificación de la ordenanza IIVTNU en BOP Sevilla de 14/04/2023 (CVE BOP-SE-2023-084007; PDF https://admbop.dipusevilla.es/export/sites/bop/.galleries/Documentos-Anuncios-en-PDF/firmado-1681426847748-final-984675434-1 |
| Calatayud | 50067 | Sin tipo o sin URL de la fuente. P: solo nota de prensa municipal (fecha aproximada, aprobación para 2024); ordenanza no leída (portal de transparencia inaccesible). Literal de la nota: 'reducciones suben hasta el 55% en las trasmisiones mortis causa, y puede  |
| Calp | 03047 | calp.es (Ordenanzas y reglamentos) devuelve error 403 al lector; el texto de la ordenanza sigue sin leer. (Ronda 4, 08-10-2026.) Antes: Sin tipo o sin URL de la fuente. Fuente secundaria. Desde el BOP de 09-02-2022: 95 % en transmisiones mortis causa a descend |
| Cambrils | 43038 | Ronda 2: la seu lista 'OF. 03 reguladora IIVTNU. Any 2026' (seu.cambrils.cat/documentPublic/download/8145, publicada 13-01-2026), bloqueada por robots.txt. |
| Cangas de Morrazo | 36008 | NO LOCALIZADO. BOP Pontevedra bloqueado (robots.txt); portal ORAL dinámico; cupo de búsquedas agotado. |
| Carballo | 15019 | NO LOCALIZADO. Cupo de búsquedas agotado antes de localizar la ordenanza en carballo.gal; BOP A Coruña bloqueado (robots.txt). |
| Carmona | 41024 | Solo recopilaciones antiguas (ordenanzas fiscales 2011-2013) en carmona.org; el PDF fiscal07.pdf falla por certificado SSL. Texto vigente no localizado. |
| Cartaya | 21021 | Sin tipo o sin URL de la fuente. Fuente secundaria (nota municipal): la nueva ordenanza «establece también bonificaciones de entre un 50% y un 95% por transmisiones de terrenos, en función del valor catastral del mismo», ligadas a actividades de especial inter |
| Castrillón | 33016 | NO LOCALIZADO. BOPA inaccesible (tiempo de espera / URL demasiado larga); cupo de búsquedas agotado. |
| Chipiona | 11016 | Aprobación definitiva de la modificación de la O.F. n.º 5 en BOP Cádiz n.º 87 de 10/05/2022 (anuncio 47.445, pág. 25): el lector del PDF no llega a esa página. |
| Ciempozuelos | 28040 | La web municipal (ayto-ciempozuelos.org, Ordenanzas fiscales) tiene una ficha de descarga de la ordenanza del IIVTNU (creada 24-03-2022, actualizada 24-10-2022), pero el botón de descarga no expone el archivo al lector. (Ronda 4, 08-10-2026.) Antes: BOCM 27/12 |
| Ciudad Rodrigo | 37107 | NO LOCALIZADO. La página oficial 'Ordenanzas fiscales 2024' (ciudadrodrigo.es) agotó el tiempo de espera en todos los intentos. |
| Conil de la Frontera | 11014 | Aprobación definitiva de la modificación en BOP Cádiz n.º 85 de 06/05/2022 (anuncio 45.036, pág. 17): el lector del PDF del boletín solo llega a la pág. 10. |
| Cártama | 29038 | cartama.es/3761/ordenanzas-municipales devuelve 405 al lector. |
| Don Benito | 06044 | donbenito.es falla por certificado TLS; solo titular de noticia sobre el nuevo impuesto tras la STC. |
| El Prat de Llobregat | 08169 | Solo localizadas modificaciones parciales: BOPB 23-12-2022 (art. 1.5, supuestos de no sujeción) y BOPB 15-03-2023 (art. 7.2, coeficientes). Ninguna incluye el tipo ni la bonificación. El tipo de 2026 ya lo da Hacienda. (Ronda 4, 08-10-2026.) Antes: Ronda 2: BO |
| El Vendrell | 43163 | Sin tipo o sin URL de la fuente. Ficha municipal (no ordenanza): transmisiones de la vivienda habitual del causante a descendientes de 1.er grado y adoptados, cónyuges, ascendientes de 1.er grado y adoptantes; 90 % hasta 75.000 €, 75 % de 75.001 a 100.000 €, 5 |
| Elda | 03066 | Recopilaciones municipales de ordenanzas fiscales (elda.es/doc/ordenanzas, 2009-2023) localizadas; el servidor falla por certificado. El tipo de 2026 ya lo da Hacienda. (Ronda 4, 08-10-2026.) Antes: Ronda 2: compendios elda.es/doc/ordenanzas/Ordenanzas Fiscale |
| Ferrol | 15036 | Ferrol no delega en la Deputación da Coruña; la sede (ferrol.gal/Sede/Ordenanzas y la ficha del trámite IIVTNU) no responde desde fuera. El tipo de 2026 ya lo da Hacienda. (Ronda 4, 08-10-2026.) Antes: Ronda 2: Ferrol no figura en la táboa IIVTNU de la Deputac |
| Figueres | 17066 | El libro de ordenanzas fiscales de Figueres (figueres.cat/tramits/normativa/ordenances-fiscals/ooff) es demasiado largo: el lector no llega a la OF 7 del IIVTNU. (Ronda 4, 08-10-2026.) Antes: Tipo no localizado. HECHO: el libro de ordenanzas fiscales 2026 de F |
| Gandia | 46131 | Ronda 2: gandia.es/atg bloquea por robots.txt; sin otra fuente. |
| Getafe | 28065 | PDF oficial localizado (sede.getafe.es/portalGetafe/sede/RecursosWeb/DOCUMENTOS/1/7_11888_1.pdf, «Ordenanza n.º 1.5») pero la sede falla por certificado TLS; búsqueda en BOCM sin el texto. El tipo 2026 ya lo da Hacienda en la app. |
| Granadilla de Abona | 38017 | Existe un trámite de bonificación del IIVTNU en la sede electrónica (lo que indica que la ordenanza prevé bonificación), pero la página no pudo leerse (timeout) y el texto de la ordenanza no se localizó. Tipo 28 % = Hacienda 2026. bonif=null = DESCONOCIDO. |
| Granollers | 08096 | El BOPB de 29-12-2025 (ordenanzas de 2026) modifica la OF 1.4 del IIVTNU, pero su texto va en un anexo al que no se llega (documento demasiado largo para el lector). La modificación del BOPB de 16-09-2026 no la toca. El tipo de 2026 ya lo da Hacienda; la bonif |
| Guadix | 18089 | Búsqueda en guadix.es sin resultado (población <20.000 según INE reciente). |
| Haro | 26071 | Ronda 2: la ficha haro.org/ayuntamiento/detalle-normativa/123 confirma la OF 1.4 IIVTNU (aprobada 03-05-2022, publicada 21-06-2022, en vigor 22-06-2022) pero no expone texto ni URL de descarga legible. |
| Huércal-Overa | 04053 | Solo el proyecto sometido a consulta pública (28-12-2021 a 12-01-2022) en huercal-overa.es: tipos remitidos a un anexo pendiente de elaborar; bonificación «de hasta el 95 por ciento» a descendientes, cónyuges y ascendientes en línea recta de primer grado para  |
| Igualada | 08102 | Llibre d'ordenances fiscals 2026 (seu-e.cat/documents/28021/…) localizado; la OF 4 IIVTNU empieza en la p. 68 pero la herramienta de lectura trunca el PDF antes. |
| Illescas | 45081 | illescas.es/ordenanzas-fiscales/ no responde al lector (timeout). |
| Inca | 07027 | Tipo no localizado. HECHO: la ficha municipal fecha la última modificación definitiva en BOIB 135 de 03-10-2023 y enlaza PDFs (ordenanza y «coeficients aplicables 2023/2024») que el lector no pudo abrir. PENDIENTE: leer el PDF de la ordenanza para tipo, coefic |
| Ingenio | 35011 | Solo se ha podido leer el texto de 2013 (BOP Las Palmas n.º 167 de 30-12-2013: tipo 15 %, bonificación del 95 % en transmisiones por herencia a descendientes, cónyuges y ascendientes), anterior al RDL 26/2021. El portal de transparencia anuncia versiones de 20 |
| Isla Cristina | 21042 | Solo localizada la memoria justificativa de la modificación de 2021 (wp.islacristina.org/wp-content/uploads/2021/11/MEMORIA-JUSTIFICATIVA-MODIFICACION-ORDENANZA-FISCAL-PLUSVALIASdocx.pdf): el servidor no responde al lector (timeout). Texto vigente no localizad |
| L'Hospitalet de Llobregat | 08101 | No localizada la versión vigente. La sede (Ordenances fiscals) enlaza la OF 1.03 vigente y las de años anteriores (versión en vigor desde el 15-07-2023), pero todos los enlaces devuelven error 404. Las ordenanzas fiscales de 2024 (BOPB 03-10-2023) y de 2025 (B |
| Lalín | 36024 | lalin.gal exige JavaScript (página de verificación) y el BOP de Pontevedra bloquea la lectura automática. (Ronda 4, 08-10-2026.) Antes: NO LOCALIZADO. BOP Pontevedra bloqueado (robots.txt); portal ORAL dinámico; cupo de búsquedas agotado. |
| Langreo | 33031 | Ronda 2: sin resultados en langreo.as ni BOPA. |
| Lepe | 21044 | La web municipal (ayuntamiento.lepe.es/es/node/371, «Hacienda Local - Ordenanzas fiscales») lista las ordenanzas pero robots.txt impide leerla; los PDF siguen el patrón «N- ORDENANZA FISCAL ….pdf» (n.º 1 IBI, n.º 6 ICIO); probé nombres para el IIVTNU (404) y e |
| Lloret de Mar | 17095 | Tipo no localizado. HECHO: el libro 2023 (copia en web de terceros) sitúa la OF 5 en la p. 106; el lector se cortó en la p. 36. CIDO referencia las OOFF 2024 (BOP Girona). PENDIENTE: extraer la OF 5. |
| Llucmajor | 07031 | Solo localizada la ordenanza del IBI (BOIB 2016); no la del IIVTNU. |
| Loja | 18122 | aytoloja.org publica las ordenanzas como /ayuntamiento/documentos/ordenanzas_reglamentos/NN.pdf (02 IBI, 04 ICIO), pero el servidor rechaza las conexiones del lector; no identificado el número del IIVTNU. |
| Lora del Río | 41055 | Aprobación INICIAL de una nueva ordenanza fiscal del IIVTNU en BOP Sevilla n.º 171 de 03/09/2024 (CVE BOP-SE-2024-171015), anuncio de exposición sin articulado. No localizada la aprobación definitiva ni el texto. |
| Los Palacios y Villafranca | 41069 | Búsqueda en BOP Sevilla (admbop.dipusevilla.es) y sede OPAEF sin anuncio identificable del municipio con texto de la ordenanza IIVTNU. |
| Mairena del Alcor | 41058 | Recopilación «Ordenanzas Fiscales 2022» (transparencia.mairenadelalcor.es): el IIVTNU está en la pág. 32 y el lector solo llega a la ~30. |
| Manises | 46159 | Ronda 2: manises.es (PDF 'Ordenanza_fiscal_reguladora_IIVTNU_Plusvalia_CASTELLANO.pdf' y página del impuesto) falla en robots.txt. |
| Maracena | 18127 | Búsquedas en maracena.es sin la ordenanza; sede con timeout en la pasada anterior. |
| Martos | 23060 | Recopilación oficial «Ordenanzas fiscales… para el año 2026» (transparencia.martos.es/download/113/fiscales/11649/…2026.pdf, 462 págs.): el IIVTNU empieza en la pág. 231 y el lector solo llega a la ~36. Sin texto. |
| Marín | 36026 | NO LOCALIZADO. BOP Pontevedra bloqueado (robots.txt); portal ORAL dinámico; cupo de búsquedas agotado. |
| Maó | 07032 | Ronda 2: ajmao.org/documents/documents/20781docpub.pdf ('Ordenanza fiscal núm. 3, aplicación presupuestaria 116.00') sigue bloqueado por robots.txt. |
| Medina del Campo | 47085 | Ronda 2: compendio 2024 (ayto-medinadelcampo.es/.../2024_ORDENANZAS_FISCALES_Y_DE_PRECIOS_PUBLICOS.pdf) — timeout. |
| Mejorada del Campo | 28084 | Web municipal no autorizada para el lector. Presupuesto de búsquedas web agotado (límite compartido) y bocm.es limitó por frecuencia (HTTP 429) antes de poder localizarla. |
| Moguer | 21050 | Localizado expediente de 2023 de nueva ordenanza fiscal del IIVTNU (audiencia e información pública, aytomoguer.es/…/ANUNCIO_AUDIENCIA_E_INFORMACION_PUBLICA_ORDENANZA_FISCAL_REGULADORA_IMPUESTO_SOBRE_INCREMENTO_DEL_VALOR_TERRENOS_NATURALEZA_URBANA/04.-INFORME- |
| Monzón | 22158 | Sede monzón.es: «Ordenanzas fiscales 2026» localizadas (PDF), pero el servidor bloquea la descarga por robots.txt. |
| Níjar | 04066 | Búsquedas restringidas a nijar.es sin la ordenanza. |
| Olot | 17114 | Ordenances fiscals 2026 (olot.cat/files/doc8474/ordenances-fiscals-2026.pdf) localizadas; la OF 5 (p. 81) queda fuera del texto extraíble. |
| Ontinyent | 46184 | Ronda 2: ontinyent.es sin acceso; solo un acta de pleno 2025 indexada, no leída. |
| Paterna | 46190 | La sede electrónica de Paterna (catálogo de ordenanzas fiscales y trámite de liquidación del IIVTNU) no responde desde fuera. El tipo de 2026 ya lo da Hacienda; la bonificación sigue sin comprobar. (Ronda 4, 08-10-2026.) Antes: Ronda 2: sin resultados en pater |
| Ponteareas | 36042 | ponteareas.gal/ordenanzasn entra en un bucle de redirecciones. (Ronda 4, 08-10-2026.) Antes: NO LOCALIZADO. BOP Pontevedra bloqueado (robots.txt); portal ORAL dinámico; cupo de búsquedas agotado. |
| Pozoblanco | 14054 | Sin tipo o sin URL de la fuente. Art. 8: «Cuando el incremento de valor se manifieste por causa de muerte, respecto de la transmisión de la propiedad de la vivienda habitual del causante…: -A favor del cónyuge supérstite… Bonificación de la cuota: 95%, siempre |
| Puerto Real | 11028 | Búsqueda en puertoreal.es: solo FAQ sobre la estimación directa de la base; ordenanza no localizada. |
| Puerto de la Cruz | 38028 | Localizados en la web municipal el PDF de la ordenanza (puertodelacruz.es/docs/areas/urbanismo/urb_nor_plusvalias.pdf) y una noticia de 30-03-2026 sobre una nueva bonificación para heredar la vivienda habitual de los padres, pero la web no responde desde fuera |
| Redondela | 36045 | redondela.gal (Ordenanzas e regulamentos) devuelve error 403 al lector. (Ronda 4, 08-10-2026.) Antes: NO LOCALIZADO. BOP Pontevedra bloqueado (robots.txt); portal ORAL dinámico; cupo de búsquedas agotado. |
| Rellinars | 08179 | Sin tipo o sin URL de la fuente. Correcció d'errada: «Article 6è.- Beneficis fiscals de concessió potestativa o quantia variable - No se n'aprova cap» → sense bonificació per herència (bonif null comprovat al text). Tipus no capturat. |
| Ribeira | 15073 | La página «Ordenanzas fiscais» de ribeira.gal no responde desde fuera y el BOP de A Coruña bloquea la lectura automática. (Ronda 4, 08-10-2026.) Antes: NO LOCALIZADO. Cupo de búsquedas agotado; BOP A Coruña bloqueado (robots.txt). |
| Salt | 17155 | Ronda 2: Ordenances fiscals 2025 (viladesalt.cat/wp-content/uploads/2025/01/Ordenances-Fiscals-de-2025.pdf) localizadas; la OF 4 (p. 56) queda fuera del texto extraíble. |
| San Andrés del Rabanedo | 24142 | Ronda 2: sin resultados en el dominio municipal ni BOP León. |
| San Juan de Aznalfarache | 41086 | Localizada recopilación «Ordenanzas fiscales 2021» en el portal de transparencia (anterior al RDL 26/2021), pero el servidor devuelve error (robots 500). Texto no leído. |
| Sant Feliu de Guíxols | 17160 | Ronda 2: Ordenances fiscals 2025 (ciutadania.guixols.cat/uploads/Ordenances-fiscals-2025_7173.pdf) localizadas; la OF 5 (p. 89) queda fuera del texto extraíble. |
| Sant Feliu de Llobregat | 08211 | BOPB 17-12-2025 (3874406) solo modifica el art. 8 (base imponible: coeficientes máximos del 107.4 TRLRHL); sin tipo ni bonificación en lo publicado. |
| Sant Pere de Ribes | 08231 | Ronda 2: localizada la OF 5 IIVTNU (santperederibes.cat/documents/10180/1519052/OF-5.+IIVTNU.pdf), fallo de certificado SSL. |
| Santa Cruz de Bezana | 39073 | NO LOCALIZADO. Anuncio candidato en el BOC (idAnuBlob=415117) no legible (BOC sin respuesta). |
| Sevilla la Nueva | 28141 | La web municipal (Ordenanzas fiscales) enlaza el texto publicado en el BOCM («BOCM-ORDENANZA-PLUSVALIA.pdf», subido en septiembre de 2022), pero el lector no pudo abrirlo. El impreso municipal de autoliquidación de 2022 describe una «bonificación por convivenc |
| Talavera de la Reina | 45165 | sede.talavera.org/textos/45165/ aloja las ordenanzas (O.F.I.C.I.O.pdf, O.F_IBI_Art_6.pdf…) pero no di con el nombre del fichero del IIVTNU (probados O.F.I.I.V.T.N.U.pdf y O.F.IIVTNU.pdf: 404). El tipo 2026 ya lo da Hacienda en la app; bonificación sin localiza |
| Tomares | 41093 | Búsqueda en tomares.es y BOP Sevilla sin texto de la ordenanza IIVTNU. |
| Tomelloso | 13082 | Búsqueda en tomelloso.es: solo nota del Pleno de septiembre de 2025 (IBI y tasas, nada de plusvalía). |
| Torre-Pacheco | 30037 | Localizado el PDF de la ordenanza en el portal de transparencia (IMPUESTO-SOBRE-I.V.T.N.U-PLUSVALIA-2020.pdf, texto de 2020), pero robots.txt impide leerlo; no se ha encontrado en el BORM la adaptación de 2022. (Ronda 4, 08-10-2026.) Antes: Ronda 2: tres búsqu |
| Totana | 30039 | Ronda 2: no localizado en BORM. |
| Tàrrega | 25217 | Edició 04-06-2026 de les ordenances fiscals (tarrega.cat/ordenances-i-reglaments/ordenances-fiscals-vigents): la OF 5 IIVTNU (p. 45) no es extraíble. |
| Ubrique | 11038 | Aprobación definitiva de la ordenanza IIVTNU en BOP Cádiz n.º 43 de 07/03/2022 (pág. 5). El texto extraído se corta en el art. 7 (base imponible): no se llega al tipo ni a bonificaciones. |
| Utebo | 50272 | utebo.es/normativa-municipal sin enlace directo a la ordenanza del IIVTNU. |
| Vilagarcía de Arousa | 36060 | NO LOCALIZADO. El BOP de Pontevedra (boppo.depo.gal) bloquea la lectura automática (robots.txt) y el portal 'O meu concello' del ORAL carga las ordenanzas por desplegable dinámico, ilegible para el lector; cupo de búsquedas agotado. |
| Villalbilla | 28172 | Sin tipo o sin URL de la fuente. Solo he leído modificaciones parciales: BOCM n.º 91 de 18/04/2022 (arts. 2 y 5, adaptación RDL 26/2021) y BOCM n.º 100 de 28/04/2023 (coeficientes 2023, tabla legal). Ninguna toca bonificaciones ni tipo. bonif=null = DESCONOCID |
| Villamartín | 11041 | BOP Cádiz n.º 220 de 17/11/2022 (pág. 7): aprobación definitiva de la modificación de arts. 2, 4 y 7 (solo esos artículos; coeficientes = máximos legales). No incluye tipo ni bonificación. Aprobación inicial en BOP n.º 177 de 14/09/2022. |
| Villarrobledo | 02081 | villarrobledo.com/ayuntamiento/normativa.php?tipo=ordenanza lista la «Ordenanza fiscal número 5 reguladora del impuesto sobre el incremento del valor de los terrenos de naturaleza urbana» (publicada 30/05/2022) pero el enlace al documento no es legible para el |
| Villaviciosa de Odón | 28181 | Las páginas de ordenanzas fiscales de aytovillaviciosadeodon.es (2022, 2024 y 2025), incluida la ficha «Ordenanza Fiscal Reguladora sobre el Incremento del Valor de los Terrenos de Naturaleza Urbana - 2022», devuelven error 404. (Ronda 4, 08-10-2026.) Antes: L |
| Villena | 03140 | La página de ordenanzas fiscales de villena.es enlaza como texto vigente de la OF I-5 el BOP de Alicante n.º 77 de 25-04-2022, pero el servidor del BOP de Alicante bloquea la lectura automática. (Ronda 4, 08-10-2026.) Antes: Ronda 2: la web municipal enlaza el |
| Vícar | 04102 | Búsquedas restringidas a vicar.es sin la ordenanza. |
| Xàtiva | 46145 | Solo noticias municipales (blog.xativa.es, 26-09-2024): «se bonificará el 95% por transmisiones mortis causa a favor de los familiares (limitado por valor catastral inferior a 200.000 euros)»; sin tipo, sin parentesco exacto y sin saber si el límite es del val |
