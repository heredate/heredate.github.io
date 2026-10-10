# Hereda+ 1.6 · ronda 4 · fiscalista (`fiscal`)

Rama `r4-fiscal` · 07/08-10-2026 · 39 búsquedas web y unas 45 lecturas con WebFetch.

**Resumen.** Dos correcciones de cálculo con fuente (Baleares, grupo III; Galicia, tope de la reducción del grupo I), tres avisos nuevos por cambios normativos de 2025-2026 (Galicia, Extremadura y el VERIFICADO de la Comunitat Valenciana), plazos y recargos de los territorios forales separados del régimen común (Gipuzkoa con su escala propia) y registro de cotejo de las cuatro tablas forales de plusvalía. Las tablas forales siguen PENDIENTES: no se ha podido leer ningún texto oficial con las cifras de 2025-2026. Casillas del 650 autonómico: NO LOCALIZADO en los cinco territorios pedidos; no se ha puesto ninguna.

Etiquetas: **VERIFICADO** = leído en el texto oficial o en dos fuentes concordantes. **PENDIENTE** = una sola fuente, o texto no legible. **NO LOCALIZADO** = no se ha encontrado un texto que se pueda leer.

Limitación técnica que condiciona todo el informe: `curl` está bloqueado por el proxy y WebFetch solo abre URL que aparezcan en resultados de búsqueda o en páginas ya leídas. No se pudo leer bizkaia.eus (robots.txt), lexnavarra, parlamentodenavarra (binario), el XML del BOE ni la API de legislación consolidada (400). WebFetch corta los textos largos hacia los 90.000-100.000 caracteres, y en el BOE-A-2026-3910 y en la LF 2/1995 consolidada eso deja fuera justo el artículo buscado.

---

## 1. Plusvalía foral: cotejo de coeficientes (`PLUSVALIA_FORAL`)

Ninguna cifra cambia. Cada régimen lleva ahora `cotejo` (fecha, fuente, URL y resultado de cada consulta) y `notaCotejo` (detalle interno). `normaCoef`, que es lo que ve el abogado en el aviso, se mantiene breve.

| Territorio | Tabla en el motor | Qué se ha comprobado hoy | Estado |
|---|---|---|---|
| Navarra | art. 175.2 LF 2/1995, tabla 2026 (LF 17/2025): 0,06 · 0,16 · 0,13 · 0,26 · 0,35 · 0,37 · 0,35 · 0,41 · 0,47 · 0,52 · 0,58 · 0,53 · 0,42 · 0,37 · 0,31 · 0,26 · 0,25 · 0,15 · 0,06 · 0,06 · 0,16 | Recotejada en el consolidado de iberley: coincide cifra a cifra, con la LF 17/2025 como última modificación del apartado 2. BOE-A-2026-3910 (txt y PDF): el preámbulo confirma la actualización desde el 01-01-2026, pero el texto se corta en el art. 7.º, antes de la modificación de Haciendas Locales. Las versiones de fiscal-impuestos y vLex se cortan en el art. 6.º. La Ordenanza n.º 4 de Pamplona remite al art. 175.2 sin transcribir la tabla. | PENDIENTE (una sola fuente con las cifras) |
| Bizkaia | Envolvente del DFN 2/2024 y de la tabla de 0,16 a 0,35 | El art. 4.3 NF 8/1989 manda actualizar los coeficientes cada año por norma foral, que puede ser la de presupuestos (derecholocal, DFN 2/2024). **Hallazgo:** la NF 4/2024, de 27 de diciembre, de medidas tributarias (BOB 30-12-2024), «actualiza los coeficientes máximos» (fiscal-impuestos.com/node/38171). Su tabla no se ha podido leer: el PDF del BOB está bloqueado por robots.txt. La NF 7/2025 (presupuestos 2026, BOB 248 de 30-12-2025) no trae artículo sobre el impuesto en su índice. | PENDIENTE. **Prioridad de cotejo**: si la tabla de la NF 4/2024 supera la envolvente en algún año, el cálculo quedaría corto |
| Gipuzkoa | DFN 2/2023 (desde 01-01-2024) | El art. 4.3 (DFN 7/2021) dice «serán actualizados anualmente mediante norma foral». Ni la NF 4/2024 (presupuestos 2025, extracto) ni la parte legible de la NF 6/2025 (presupuestos 2026, DA 1.ª a 3.ª) traen tabla. El tipo máximo vigente sigue sin localizar y el motor mantiene el 30 % prudente. | PENDIENTE |
| Álava | DNUF 12/2022 (BOTHA 150, 30-12-2022; desde 01-01-2023) | Norma, boletín y fecha confirmados (derecholocal ?p=10908). Los decretos forales de coeficientes de diciembre de 2023 (DF 51/2023) y de 2025 (DF 41/2025, BOTHA 146) solo tratan IRPF e Impuesto sobre Sociedades. No hay rastro de una tabla posterior. | PENDIENTE |

Fuentes secundarias encontradas, que no se han incorporado (guiafiscal.es, con contradicciones internas): Bilbao 25 %, Donostia 27 % y Vitoria-Gasteiz 26 %. Coinciden con lo que ya apunta `docs-juridico/plusvalia-foral.md` y siguen pendientes de la ordenanza.

## 2. Hoja del modelo 650: casillas autonómicas

**Resultado: NO LOCALIZADO en los cinco territorios.** No se pone ninguna casilla autonómica.

| Territorio | Qué se ha consultado | Resultado |
|---|---|---|
| Andalucía | Búsquedas de la orden del modelo y de las instrucciones. Memoria técnica de la estadística del ISD de la ATA (juntadeandalucia.es, MT_12.01.16_ISD.pdf) | Cita los modelos 650, 651 y 660, pero sin numeración. El formulario se genera en el programa de ayuda, al que no hay acceso |
| Madrid | Búsqueda de instrucciones y del programa | Solo aparecen la AEAT, Asturias y páginas basura |
| Galicia | f650.pdf de conselleriadefacenda.gal | Se ha leído, pero es un formulario antiguo: grupo II con 15.956,87 € y discapacidad con 108.200 €, cifras anteriores a 2011. No vale para numerar el formulario actual |
| C. Valenciana y Cataluña | No hay resultados con el formulario | NO LOCALIZADO |

Cambio: `MODELO650_AUT` y `modelo650Aut(ccaa)` en `src/motor.mjs`. En `src/app/firma.js`, la hoja del 650 de una comunidad ya no dice solo «no cotejadas»: explica por qué no hay casillas y pide comprobar cada una en el programa de ayuda de la comunidad. Para hacerlo bien hace falta que alguien con acceso descargue el PDF de instrucciones de cada comunidad (o una captura del programa de ayuda) y lo deje en el proyecto.

## 3. Vigencia 2026 del ISD en los 22 territorios

Fuente principal: Ministerio de Hacienda, **«Tributación autonómica 2026»**:
- cap. I, régimen vigente: https://www.hacienda.gob.es/sgfal/financiacionterritorial/autonomica/capitulo-i-tributacion-autonomica-2026.pdf
- cap. II, medidas aprobadas para 2026: el texto se corta en La Rioja.

Fuentes complementarias:
- boletín de Auren, febrero de 2026;
- notas de Cuatrecasas, BBVA y KPMG;
- textos de las leyes cuando se pudieron leer.

### Cambios en el motor

| Territorio | Cambio | Norma | Fuentes | Estado |
|---|---|---|---|---|
| **Illes Balears**, grupo III | **Corregido.** Desde el 26-07-2025: 60 % para colaterales de 2.º y 3.er grado por consanguinidad (hermano, sobrino, tío) que no concurren con descendientes, y 35 % para el resto del grupo III. Entre el 26-11-2023 y el 25-07-2025: 50 % y 25 %. Antes el motor daba el 50 % a cualquier miembro del grupo III sin descendientes, también a los afines (bonificación de más), y no recogía la subida de 2025 | art. 36 bis D. Leg. 1/2014 (Ley 6/2025, de 23 de julio, de presupuestos 2025) | Ministerio (cap. I); resumen de la Ley 6/2025 (primeralecturaediciones.com/?p=20246093); nota BBVA de septiembre de 2025 | VERIFICADO (porcentajes). La fecha de efectos es 25-07 en una fuente y 26-07 en otra: se toma el 26-07 por prudencia |
| **Galicia**, grupo I | **Corregido.** La reducción es de 1.000.000 € + 100.000 € por año menos de 21, con un **máximo de 1.500.000 €**. Antes no tenía tope (un hijo de 5 años tenía 2.600.000 €). La cita pasa a art. 6.Dos (antes «art. 7») | art. 6.Dos D. Leg. 1/2011 | Cuatrecasas, «Galicia – Novedades tributarias para 2026»; INEAF | VERIFICADO |
| Galicia | **Aviso nuevo.** Para devengos desde el 01-01-2026, las reducciones por parentesco y discapacidad son únicas entre el mismo causante y heredero. Si hubo una adquisición anterior (por ejemplo, un pacto sucesorio), se descuenta lo ya consumido | art. 6.Cinco D. Leg. 1/2011, añadido por el art. 3 de la Ley 5/2025, de 23 de diciembre (DOG 31-12-2025), disp. final 3.ª | Texto de la ley (primeralecturaediciones); Cuatrecasas | VERIFICADO. El cálculo no lo descuenta: avisa |
| Comunitat Valenciana, grupo III | 25 % desde el 01-06-2026 y 50 % desde el 01-06-2027 para colaterales de 2.º y 3.er grado por consanguinidad. Ya estaba en el motor y pasa de PENDIENTE a VERIFICADO | art. 12 bis Ley 13/1997 (Ley 5/2025) | Segunda fuente: Ministerio, cap. I | VERIFICADO |
| **Extremadura** | **Aviso nuevo.** Desde el 05-08-2026, los sobrinos del causante sin descendientes directos entran en la lista de «especial vinculación» y pueden aplicar los beneficios de los grupos I y II. No se aplica de oficio: el texto del artículo, con sus requisitos, no se ha podido leer (DOE fuera del alcance de la herramienta). Se calcula la cuota máxima y se avisa | art. 20 ter D. Leg. 1/2018 (Ley 2/2026, de presupuestos 2026) | Cuatrecasas, «Extremadura – Novedades tributarias para 2026» | PENDIENTE |

### Revisado sin cambios en el motor

Son cambios de 2025-2026 que no afectan al cálculo modelado o que quedan apuntados.

| Territorio | Hallazgo | Norma | Situación |
|---|---|---|---|
| Andalucía | El plazo pasa de dos a seis meses cuando el usufructo constituido por donación se extingue por fallecimiento. También cambian las bonificaciones de las donaciones | Ley 8/2025 (BOJA 31-12-2025) | Fuera del cálculo mortis causa. Tarifa, reducciones y el 99 % de los grupos I y II coinciden con el Ministerio |
| Madrid | Grupo III al 50 % desde el 01-07-2025 (Ley 2/2025). Empresa al 99 % desde el 01-07-2026 (Ley 3/2026) | — | Ya estaban en el motor; confirmados |
| Cataluña | Reducción por fincas forestales. Las donaciones por causa de muerte pasan a las reglas mortis causa desde el 14-07-2026 | Ley 11/2026, de 9 de julio (DOGC 9706) | No modelado; sin efecto en los casos ordinarios |
| Asturias | 99 % en la reducción por empresa para adquirentes de cuarto grado sin descendientes, con 10 años de mantenimiento | Ley 8/2024 (BOPA 31-12-2024) | El motor usa la reducción estatal por empresa: PENDIENTE de modelar |
| Cantabria | Vivienda habitual: no interrumpe los dos años de convivencia el tiempo que el causante pasó en una residencia de mayores, desde el 01-05-2026 | Ley 5/2026, de 28 de abril | El motor no exige convivencia en Cantabria: sin cambio |
| La Rioja | Reducción por empresa con más beneficiarios y porcentajes más altos si hay mecenazgo prioritario, desde el 01-01-2026. Sin cifras en las fuentes | Ley 9/2025 (BOR 30-12-2025) | PENDIENTE |
| Comunitat Valenciana | Discapacidad, desde el 30-12-2025: solo adapta la estructura de los certificados. Pago telemático obligatorio con el 650 desde el 19-01-2026 | Decreto-ley 14/2025; Orden 10/2025 | Sin cifras nuevas |
| Navarra | Cambios técnicos en el ISD: planes de pensiones, valoración de pensiones, aplazamiento y litigios. Sin cambios de tarifa ni de reducciones | LF 17/2025, art. 4.º | Modelo 653 de prórroga (Orden Foral 130/2025, BON 13-01-2026): sin cambio |
| Bizkaia | La reducción por empresa familiar se extiende a colaterales de 4.º grado, y se exceptúa la liquidación concursal del mantenimiento | NF 4/2024 | El motor usa la reducción por empresa común: PENDIENTE. Reducciones por parentesco (400.000 / 40.000 / 20.000) y tipo del 1,5 % del grupo I comprobados en el texto de la NF 4/2015 (dossier de las Cortes de Castilla y León) |

Coinciden con el capítulo I del Ministerio:
- Aragón: 99 % para el grupo I y reducción del 100 % con topes.
- Castilla-La Mancha: escala del 100 % al 80 %.
- Castilla y León, Murcia y La Rioja: 99 %.
- Canarias: 99,9 %, también para el grupo III.
- Cantabria: 100 % y 50 % para hermanos.
- Cataluña.
- Galicia: coeficiente 1 en los grupos I y II.
- Ceuta y Melilla.

**Hueco detectado, no corregido (prudente).** Aragón reduce el 100 % de la base a los hijos menores de edad hasta 3.000.000 € (cap. I del Ministerio). El motor les aplica el tope general de 500.000 €, así que el cálculo puede salir alto en herencias de menores en Aragón. Falta leer el artículo para modelarlo.

## 4. Plazos y recargos

**Régimen común:** sin cambios. Plazo de 6 meses y prórroga de otros 6 si se pide en los 5 primeros (arts. 67-68 RD 1629/1991). Recargo del art. 27 LGT. Todo VERIFICADO.

**Territorios forales (Navarra, Álava, Bizkaia, Gipuzkoa):**

- **Plazo:** no se ha podido leer el artículo de plazos de ninguna de las cuatro normas forales. Se mantienen 6 + 6 meses. El plazo sale PENDIENTE, con una nota en el plazo del motor, en la agenda (`calcularPlazos`, que ahora recibe `ccaa` desde `logic.js`) y en el catálogo de trámites (`tramites.mjs`). El organismo pasa a ser «Hacienda foral». Navarra tiene un modelo propio para pedir la prórroga (modelo 653), lo que confirma que la prórroga existe, pero no su duración.
- **Recargo:** el art. 27 LGT no rige en estos territorios. Nueva `recargoPresentacion(ccaa, …)`:
  - **Gipuzkoa** (art. 27.2 NF 2/2005, General Tributaria, redacción de la NF 1/2024, desde el 17-05-2024):
    - 2 % si se presenta en los tres meses siguientes al fin del plazo;
    - 5 % del cuarto al duodécimo mes;
    - 10 % después;
    - siempre con intereses de demora desde el fin del plazo («excluirá las sanciones… pero no los intereses de demora»);
    - sin reducción por pronto pago;
    - interés de demora de 2026: 4,0625 % (DA 1.ª de la NF 6/2025, presupuestos 2026).
    - Fuente: consolidado del art. 27 en iberley, con citas literales. Una sola fuente: PENDIENTE de cotejo en el BOG.
  - **Navarra, Álava y Bizkaia:** escala NO LOCALIZADA. Una ponencia doctrinal sin fecha (Zergak n.º 61) describe para Álava un 5 % con intereses a partir del sexto mes y un 10 % después de 12 meses, y para Bizkaia un 5 % solo en declaraciones. No se usa. Se estima con la escala del art. 27 LGT, que es más alta pasados 12 meses, y la etiqueta lo dice («estimación con la escala estatal», foral, PENDIENTE).
  - Pantallas que lo usan:
    - el ISD del motor (aviso de recargo y aviso de fuera de plazo);
    - el Diagnóstico (`dgRecargo` recibe el territorio; aviso de vencido y de «vence en N días»);
    - Listo para firmar.
  - La plusvalía municipal sigue con el art. 27 LGT en todos los territorios: PENDIENTE para los forales.

## 5. Pruebas

- `node src/test.mjs`: **1092 correctas**. Eran 1036; se añade la sección 24, con 56 comprobaciones:
  - registro de cotejo de las cuatro tablas forales;
  - Baleares: 6 casos, incluido uno completo;
  - Galicia: tope y aviso;
  - Comunitat Valenciana y Extremadura;
  - plazos forales en el motor, la agenda y los trámites;
  - recargo de Gipuzkoa calculado a mano: 248,97 / 616,87 / 1.439,64 € sobre 10.000 €;
  - estimación en Navarra, Álava y Bizkaia;
  - avisos del ISD fuera de plazo;
  - 650 autonómico.
- `node src/test-lector.mjs`: 436 correctas.
- `python3 src/build.py`: en verde.
- QA con la máquina muy cargada (carga media de 20 con 2 CPU), puerto 8803:
  - robustez: 53/53;
  - a11y: 304/304, 0 infracciones;
  - producto: 44/45. Falla «La tarea aparece en Mi día del responsable»;
  - experiencia: 46/47. Falla «I9 · la cartera ofrece retomarlo»;
  - lector de extremo a extremo: los tres casos y el banco de escaneos pasan; fallan 2 comprobaciones del escáner con la cámara (archiva PDF de 1 página en lugar de 2 y 1).
- **Comparación con la rama base** (copia limpia de /home/claude/cauce-web construida en el puerto 8813): producto y experiencia fallan exactamente en las mismas comprobaciones (y en la base, además, I5 porque no se habían generado los ejemplos). No vienen de esta rama. El escáner con la cámara no se toca aquí.

## 6. Pendiente, por orden de impacto

1. **Bizkaia:** tabla de coeficientes de la NF 4/2024 (BOB 30-12-2024, I-1167). Puede superar la envolvente.
2. **Casillas del 650** de Andalucía y Madrid: hace falta el PDF de instrucciones o una captura del programa de ayuda.
3. **Plazos y recargos forales:** artículo de plazos de las cuatro normas del ISD y escala de recargos de Navarra (LF 13/2000), Álava (NF 6/2005) y Bizkaia (NF 2/2005).
4. **Navarra:** tabla del art. 175.2 en el BON (LF 17/2025, BON extraordinario de 31-12-2025), para pasarla a VERIFICADO.
5. **Gipuzkoa:** tipo máximo vigente y tablas de 2025 y 2026. **Álava:** confirmar que no hay tabla posterior a 2023.
6. **Extremadura:** requisitos del art. 20 ter (Ley 2/2026) para aplicar el 99 % a los sobrinos.
7. **Aragón:** reducción de los menores hasta 3.000.000 €. **Asturias, La Rioja y Bizkaia:** reducciones por empresa propias.
