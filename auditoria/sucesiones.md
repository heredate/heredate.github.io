# Auditoría del Impuesto sobre Sucesiones · Hereda+ (motor 0.4.2)

**Fecha:** 10-10-2026 · **Normativa de referencia:** la vigente en octubre de 2026 (devengo de prueba: 15-09-2026)
**Objeto:** si las cifras de Sucesiones que da el motor son correctas en el régimen estatal, las 15 comunidades de régimen común, Ceuta y Melilla, y los cuatro territorios forales.
**Motor auditado:** `docs/app/nucleo/motor.js` (la versión publicada, 1.7) y `fuente/src/motor.mjs` (fuente legible, 1.6). Las dos llevan `VERSION = "0.4.2"`. En 3.960 casos cruzados (22 territorios, 10 relaciones, 3 edades, 3 caudales, 2 patrimonios previos, con vivienda, seguro y ajuar) dan **las mismas cifras al céntimo**. Las referencias de código de este informe apuntan a `fuente/src/motor.mjs`.
**No se ha modificado** nada de la aplicación ni de `fuente/`, y no se ha hecho ningún commit.

## 0. Método y límites (léase primero)

1. **Cálculo independiente.** `share/audit-isd/esperado.mjs` reescribe desde cero la tarifa, las reducciones, los coeficientes con la regla de salto, el usufructo y el tipo medio, a partir del texto legal o de las fuentes citadas. No importa nada del motor. `comparar.mjs` ejecuta el motor real con los mismos datos: 19 casos por territorio y 3 usufructos universales (viudo de 60, 74 y 85 años; se liquidan viudo e hijo). Son 450 comparaciones en régimen común y 23 en los forales. También se han revisado a mano los 14 expedientes de demostración (`demo-dump.mjs`, en el navegador real con Playwright), los plazos y los recargos (`plazos.mjs`), y el efecto de las reglas que faltan (`impactos.mjs`).
2. **Acceso a las fuentes: limitación importante.** La política de red de este entorno **bloquea www.boe.es** (403 en el proxy), y la herramienta de lectura de páginas no resolvía ningún dominio. Solo ha funcionado el **buscador web**, que devuelve extractos de páginas: BOE, ATC, ATIB, CARM, Junta de Castilla y León, Ministerio de Hacienda, despachos y guías. **No se ha leído ningún artículo completo en el boletín oficial.** Por eso cada parámetro lleva una etiqueta de fiabilidad:
   - **V**: extracto de texto oficial (BOE, boletín o agencia tributaria), o dos fuentes independientes que coinciden.
   - **S**: una sola fuente secundaria fiable.
   - **NV**: no se ha podido cotejar. En ese caso el «esperado» usa el valor del motor y solo comprueba la mecánica del cálculo, no la cifra legal.
   - Las cifras del régimen estatal, de sobra conocidas, se han contrastado además con el criterio profesional del auditor.
   Donde algo no se ha podido verificar, este informe lo dice y no lo da por bueno.
3. **Gravedad:**
   - **CRÍTICA**: importe de impuesto erróneo.
   - **MAYOR**: falta un beneficio o una regla.
   - **MENOR**: redondeo o texto.
   - **DESACTUALIZADA**: la norma ha cambiado.
4. **Para repetir la auditoría:** en `/tmp/claude-0/-home-user-heredate-github-io/91b178a0-6456-5828-a62b-c16511b20c9e/scratchpad/share/` se ejecutan
   - `node audit-isd/comparar.mjs && node audit-isd/tablas.mjs`
   - `node audit-isd/impactos.mjs`
   - `node audit-isd/plazos.mjs`
   - `node audit-isd/paridad.mjs`
   - `node audit-isd/demo-dump.mjs` (necesita el servidor estático de `docs/` en el puerto 8765).
   Las pruebas listas para añadir a `test.mjs` están en `auditoria/pruebas-sucesiones.mjs`. Se ejecutan con `node auditoria/pruebas-sucesiones.mjs`: hoy dan 18 correctas y 14 fallidas, que son las discrepancias.

## 1. Resumen ejecutivo

| Gravedad | Hallazgos |
|---|---:|
| **CRÍTICA** (importe erróneo) | **6** |
| **MAYOR** (falta beneficio o regla) | **11** |
| **DESACTUALIZADA** (norma cambiada) | **4** |
| **MENOR** (redondeo o texto) | **7** |
| Puntos sin poder cotejar (no se clasifican) | 16 |

**Lo que está bien.** El núcleo estatal es correcto al céntimo en todos los casos probados:
- la tarifa del art. 21;
- las reducciones del art. 20.2.a, b y c: parentesco con el incremento por año de los menores de 21 y su tope, discapacidad, seguros y vivienda al 95 % con el límite de 122.606,47 €;
- los coeficientes del art. 22, con la regla de salto del 22.2;
- el usufructo vitalicio del art. 26.a (89 − edad, entre el 10 % y el 70 %);
- la acumulación de donaciones con tipo medio (art. 30);
- los plazos de los arts. 67-68 RISD, con el traslado a día hábil;
- el recargo del art. 27 LGT (1 % + 1 % por mes completo; 15 % + intereses pasados 12 meses; 25 % de reducción solo sobre el recargo).

También cuadran al céntimo, con parámetros cotejados:
- Andalucía (tarifa del art. 37 y coeficientes 1,5 y 1,9);
- Madrid;
- Cataluña (coeficientes de la ATC y bonificación ponderada);
- Valencia (salvo la discapacidad psíquica);
- Galicia (grupo III);
- Castilla y León;
- Castilla-La Mancha (escala del 100 % al 80 %);
- Aragón (régimen general);
- Extremadura;
- Murcia (tarifa propia con el 31,75 % y el 36,50 %);
- Canarias;
- Ceuta y Melilla;
- el grupo I de los cuatro forales.

En total, 420 de las 450 comparaciones de régimen común coinciden; las 30 restantes se explican por los hallazgos siguientes.

**Los 10 problemas más importantes, por impacto:**

1. **C-1 · Cantabria: la pareja de hecho inscrita tributa como un extraño.** El art. 5 del D. Leg. 62/2008 la equipara al cónyuge. Con 300.000 €, el motor da **110.933,62 €** y lo correcto es **0 €**. Causa: `parejaEquiparada: false`.
2. **C-2 · La Rioja: el mismo error.** La Ley 10/2017 asimila las parejas de hecho al cónyuge. Con 300.000 €, el motor da **110.933,62 €** y lo correcto es **513,98 €**.
3. **C-3 · Illes Balears: el motor aplica los coeficientes estatales.** Baleares tiene coeficientes propios para sucesiones: 1,2706 para colaterales por consanguinidad del grupo III y de 1,70 a 2,04 para el grupo IV. Resultados: hermano con 200.000 €, **19.007,58 € en lugar de 15.206,54 €** (+25 %); extraño con 200.000 €, **62.815 € en lugar de 53.392,75 €** (+17,6 %); con patrimonio previo de más de 4 M€, +11.307 €.
4. **M-1 · Comunitat Valenciana: no existe la discapacidad psíquica del 33 %.** Desde ese grado da 240.000 € de reducción, no 120.000 €. Hermano con discapacidad psíquica y 200.000 €: el motor da **9.553,26 €** y lo correcto es **0 €**.
5. **M-2 · No existe la relación «cuñado/a».** El usuario tiene que elegir «sin parentesco» (grupo IV), cuando el cuñado es grupo III (STS 18-03-2003; Galicia lo incluye expresamente en los 25.000 €). Con 100.000 € en el régimen estatal: **24.830,72 € en lugar de 17.667,79 €**; en Galicia, **24.830,72 € en lugar de 13.371,60 €**.
6. **M-4 · Aragón: no se aplica la reducción de los hijos menores de edad.** Es del 100 % hasta 3.000.000 €, y el motor aplica el tope general de 500.000 €. Hijo de 10 años con 2.000.000 €: **4.381,23 € en lugar de 0 €** (fuente S).
7. **M-8 · Andalucía: el ajuar por defecto se calcula con el criterio de la ATA**, solo sobre los bienes de tipo «otro», que suele dar 0 €. Con la doctrina del TS y del TEAC (viviendas de uso residencial), los tres sobrinos del expediente de demostración dm-04 pagan **51.522 € en lugar de 49.614 €** (+1.908 €). Es una cuestión de criterio, pero la opción por defecto es la menos prudente.
8. **M-3 · La prórroga del plazo no calcula el interés de demora** del art. 68 RISD. Sobre una cuota de 20.000 €, faltan **409,59 €** (184 días al 4,0625 %).
9. **C-6 · Asturias: los porcentajes de la mejora por vivienda habitual usan umbrales equivocados.** El motor usa 90.000 / 120.000 / 180.000 / 240.000 €; los legales son 90.151,82 / 120.202,42 / 150.253,03 / 180.303,63 €. Una vivienda de 200.000 € se reduce al 96 % en lugar del 95 %: **1.700 € en lugar de 2.125 €** en el caso de prueba. Además, sigue sin cotejar si rige el límite estatal de 122.606,47 €: si rige, el error sería mucho mayor.
10. **C-4 y C-5 · Gipuzkoa y Bizkaia: los colaterales por afinidad (sobrino y tío políticos) van a un grupo equivocado.** En Gipuzkoa el motor los pone en el grupo II con 16.150 €, y van al III con 8.075 €. En Bizkaia los pone en el III con 20.000 €, y van al IV sin reducción.

Otras cuestiones de peso:
- **M-9 · Causante no residente sin bienes en España.** La disposición adicional 2.ª manda aplicar la norma de la comunidad de residencia de cada heredero; la interfaz ofrece «Aplicar la ley estatal».
- **M-7 · Renuncias.** El coeficiente del renunciante (art. 28 LISD) solo se avisa, no se calcula.
- **DESACTUALIZADAS: Valencia (Ley 5/2026), Galicia (reducción única de 2026), Extremadura (sobrinos, Ley 2/2026) y Cataluña (Ley 11/2026).**

## 2. Régimen estatal (Ley 29/1987 y RD 1629/1991)

| Regla | Lo que dice la norma | Motor | Resultado |
|---|---|---|---|
| Ajuar doméstico (art. 15 LISD; art. 34 RISD) | 3 % del caudal, salvo que se pruebe un valor inferior o que no existe. Doctrina STS 19-05-2020 y TEAC 30-05-2025: solo bienes de uso personal y doméstico; en la práctica, las viviendas de uso residencial. Se descuenta lo del art. 1321 CC | Modo «residencial» por defecto (3 % de los inmuebles residenciales no arrendados), con descuento del 3 % del catastral de la vivienda familiar si hay cónyuge; también se puede elegir el 3 % de todo el caudal o la inexistencia del ajuar. Se imputa solo a los herederos, no a los legatarios | Correcto. Excepción: Andalucía (M-8) |
| Seguros de vida (art. 9.1.c y art. 20.2.b) | Se acumulan a la base del beneficiario. Reducción del 100 % hasta 9.195,49 € para cónyuge, ascendientes y descendientes | Igual | Correcto (caso c09) |
| Parentesco (art. 20.2.a) | Grupo I: 15.956,87 € + 3.990,72 € por año menos de 21, máximo 47.858,59 €. Grupo II: 15.956,87 €. Grupo III: 7.993,46 €. Grupo IV: 0 € | Igual | Correcto (casos c02-c07; R-4) |
| Discapacidad (art. 20.2.a) | 47.858,59 € (33-65 %) y 150.253,03 € (≥65 %), además de la de parentesco | Igual | Correcto (c10-c11) |
| Vivienda habitual (art. 20.2.c) | 95 %, límite de 122.606,47 € por sujeto pasivo y mantenimiento de 10 años. Cónyuge, ascendientes, descendientes y colaterales mayores de 65 años con 2 años de convivencia | Igual. El límite va por sujeto pasivo y la reducción sobre el valor del derecho adquirido (también el usufructo) | Correcto (c08, c17). Menor: `edad > 65` con edad entera (m-4) |
| Empresa familiar (art. 20.2.c) | 95 % y 10 años; parentesco | Implementado, siempre marcado PENDIENTE de requisitos | No auditado a fondo (requisitos de la Ley 19/1991) |
| Transmisiones sucesivas (art. 20.3) | En la segunda y ulteriores transmisiones de los mismos bienes a descendientes en 10 años se deduce el impuesto ya pagado | **No existe** | **MAYOR (M-6)** |
| Bienes del Patrimonio Histórico (art. 20.2.c) | 95 % | **No existe** | **MAYOR (M-11)** |
| Tarifa (art. 21) | 16 tramos, del 7,65 % al 34 % | Igual, verificada tramo a tramo (continuidad) | Correcto |
| Coeficientes (art. 22) | Tramos de 402.678,11 / 2.007.380,43 / 4.020.770,98 €. I-II: 1 · 1,05 · 1,10 · 1,20. III: 1,5882 · 1,6676 · 1,7471 · 1,9059. IV: 2 · 2,1 · 2,2 · 2,4. Regla de salto | Igual | Correcto (c12-c14; R-2) |
| Mitad de gananciales en el patrimonio previo del viudo | El motor la suma (cita el art. 22.3) | — | **Sin cotejar** (no se pudo leer el artículo); coincide con el recuerdo del auditor y con las pruebas del proyecto |
| Deducción por doble imposición internacional (art. 23) | Lo pagado en el extranjero | **No existe** | **MAYOR (M-11)** |
| Ceuta y Melilla (art. 23 bis) | 99 % grupos I-II y 50 % el resto, si el causante residía allí más de 5 años | Porcentajes correctos; los 5 años no se comprueban | Correcto / menor (m-2) |
| Usufructo y nuda propiedad (art. 26) | Vitalicio: 70 % por debajo de 20 años, un 1 % menos por año, mínimo 10 %. Temporal: 2 % por año, máximo 70 %. Vitalicio y temporal a la vez: el de menor valor. Nuda propiedad: tipo medio efectivo del valor íntegro (art. 51.2 RISD) | Vitalicio correcto (60 a. → 29 %; 74 → 15 %; 85 → 10 %). Nuda con tipo medio, pero **redondeado a dos decimales**. **No hay usufructo temporal** en el cálculo: `pctUsufructoTemporal` existe pero `calcularISD` no la usa | Vitalicio correcto. Menor (m-1). **Mayor (M-5)** |
| Acumulación de donaciones (art. 30) | Las de los 4 años anteriores: tipo medio de la base teórica total aplicado a la base actual | Igual (tipo medio exacto) | Correcto. En Navarra no se aplica (m-5) |
| Renuncias (art. 28 LISD; art. 58 RISD) | Renuncia pura: el beneficiario tributa con su parentesco, pero con el coeficiente del renunciante si es mayor | Solo un aviso | **MAYOR (M-7)** |
| No residentes (DA 2.ª; STJUE 03-09-2014; STS 2018) | Causante no residente: norma de la comunidad con el mayor valor de los bienes en España; **si no hay bienes en España, la de la comunidad de residencia de cada heredero**. Causante residente y heredero no residente: la del causante | Se elige a mano la «comunidad con la mayor parte de los bienes»; si no se elige, se aplica la ley estatal | **MAYOR (M-9)** para el supuesto sin bienes en España |
| Plazos (arts. 67-68 RISD) | 6 meses; prórroga de otros 6 si se pide en los 5 primeros | Correcto, con traslado a día hábil por festivos nacionales | Correcto |
| Interés de la prórroga (art. 68 RISD) | La prórroga devenga interés de demora | El escrito de solicitud lo menciona, pero **no se calcula** | **MAYOR (M-3)** |
| Recargo (art. 27 LGT) | 1 % + 1 % por mes completo; 15 % + intereses pasados 12 meses; −25 % si se paga al presentar; interés de demora 2026 del 4,0625 % | Correcto en los cuatro casos calculados a mano (`plazos.mjs`) | Correcto |
| Redondeo | Céntimos en cada paso | `r2` (redondeo a céntimos con épsilon) en tarifa, coeficiente y bonificación | Correcto. Excepciones: tipo medio y porcentaje catalán con 2 decimales (m-1, m-7) |

## 3. Hallazgos detallados

### 3.1 CRÍTICOS

| ID | Territorio | Hallazgo | Caso de prueba | Esperado | Motor | Fuente |
|---|---|---|---|---:|---:|---|
| C-1 | Cantabria | `parejaEquiparada: false`. El art. 5 D. Leg. 62/2008 equipara a los cónyuges las parejas de hecho inscritas conforme a la Ley de Cantabria 1/2005 o en registros análogos de otras administraciones, de la UE o del EEE. Con la equiparación, la pareja es grupo II y tiene la bonificación del 100 % (art. 8.1) | Pareja inscrita, 300.000 € | 0,00 € | 110.933,62 € | BOE, texto consolidado BOCT-c-2008-90028 (extracto del art. 5); OCU; Life5 (V) |
| C-2 | La Rioja | `parejaEquiparada: false`. La Ley 10/2017 asimila a los cónyuges las parejas con 2 años de convivencia estable inscritas en el registro riojano; desde el 01-01-2025, también las inscritas en registros de otras administraciones | Pareja inscrita, 300.000 € | 513,98 € | 110.933,62 € | Cuatrecasas, «La Rioja – Novedades tributarias 2025»; Ibercaja (V) |
| C-3 | Illes Balears | Faltan los **coeficientes propios de sucesiones**; se usan los estatales. Tramos 0-400.000 / 400.000-2.000.000 / 2.000.000-4.000.000 / más. Grupo III por consanguinidad: 1,2706 · 1,3341 · 1,3977 · 1,5247. Grupo III por afinidad (colaterales): 1,6575 en el primer tramo; el resto de la fila sin cotejar. Grupo IV: 1,7000 · 1,7850 · 1,8700 · 2,0400 | Hermano, 200.000 €<br>Extraño, 200.000 €<br>Extraño con patrimonio previo de 5 M€<br>Sobrino político, 200.000 € | 15.206,54 €<br>53.392,75 €<br>64.071,30 €<br>32.235,06 € | 19.007,58 €<br>62.815,00 €<br>75.378,00 €<br>30.887,31 € | BOE-A-2014-6925 (extracto: 1,0000 / 1,2706 / 1,6575 / 1,7000 en el primer tramo; IV hasta 2,0400); ATIB, contenido 9855; instrucciones del modelo 654 de la ATIB; OCU 2020 (V para el primer tramo y el grupo IV; S para los demás tramos del III) |
| C-4 | Gipuzkoa | `grupo()` mete a los colaterales por afinidad (`sobrino_afin`, `tio_afin`) en el grupo II. La NF 2/2022 pone en el grupo III a los «colaterales de cuarto grado, colaterales de segundo y tercer grado por afinidad, grados más distantes y extraños» (8.075 € y tarifa III) | Sobrino político, 200.000 € | grupo III, reducción de 8.075 € | grupo II, reducción de 16.150 € | Texto vigente de la NF 2/2022 (gipuzkoa.eus) e iberley (V) |
| C-5 | Bizkaia | `grupo()` pone `afin` en el grupo III. Según el art. 43 NF 4/2015, el III es de colaterales de 3.er grado por consanguinidad y ascendientes o descendientes por afinidad. Los colaterales por afinidad van al grupo IV (sin reducción y con tarifa IV) | Sobrino político, 200.000 € | grupo IV, sin reducción | grupo III, reducción de 20.000 € | iberley, art. 43 NF 4/2015 (V) |
| C-6 | Asturias | Mejora de la vivienda habitual (`AST.vivienda.pctFn`): umbrales 90.000 / 120.000 / 180.000 / 240.000 € en lugar de 90.151,82 / 120.202,42 / 150.253,03 / 180.303,63 € (los 15, 20, 25 y 30 millones de pesetas), con 99 / 98 / 97 / 96 / 95 % | Hijo de 30 años, 300.000 € + vivienda de 200.000 €<br>Hermano de 70 años conviviente, vivienda de 200.000 € | 2.125,00 €<br>243,79 € | 1.700,00 €<br>0,79 € | Blog jurídico (oscar-cano.com) con los umbrales exactos; los umbrales son conversiones de pesetas (S). **Sin cotejar**: si rige el límite de 122.606,47 € (la página de la STPA cita el estatal) y la permanencia (el motor pone 3 años) |

### 3.2 MAYORES (falta un beneficio o una regla)

**M-1 · Comunitat Valenciana: discapacidad psíquica.** La reducción es de 240.000 € para la discapacidad física o sensorial desde el 65 % y para la **psíquica desde el 33 %**; la física o sensorial desde el 33 % tiene 120.000 €. El motor solo mira el grado.
- Impacto: hermano con discapacidad psíquica del 33 % y 200.000 €, **9.553,26 € en lugar de 0 €**.
- Fuentes: nota de BBVA (2023); OCU (2015-2020); Alicante Plaza (V).
- Conviene revisar si otras comunidades tienen la misma distinción. No se ha cotejado.

**M-2 · Falta la relación «cuñado/a».** Tampoco hay ningún colateral por afinidad de 2.º grado. Se elige «Sin parentesco», que es grupo IV.
- Norma: grupo III (STS de 18-03-2003, unificación de doctrina). Galicia los incluye en los 25.000 € del grupo III (Xunta). En Bizkaia van al grupo IV, en Gipuzkoa al III y en Baleares tienen coeficiente III(2).
- Impacto: régimen estatal con 100.000 €, 24.830,72 € en lugar de 17.667,79 €; Galicia, 24.830,72 € en lugar de 13.371,60 €.

**M-3 · Interés de demora de la prórroga (art. 68 RD 1629/1991).** No se calcula.
- Ejemplo: cuota de 20.000 € y fallecimiento el 15-01-2026. Son 184 días al 4,0625 %: **409,59 €**.

**M-4 · Aragón: hijos menores de edad.** Reducción del 100 % hasta 3.000.000 € (Ministerio de Hacienda, «Tributación autonómica 2026», cap. I, leído en la ronda 4) y 150.000 € más por cada hijo menor que conviva con el viudo (anotado en el propio motor como «no modelado»).
- Impacto: hijo de 10 años con 2.000.000 €, **4.381,23 € en lugar de 0 €**.
- Fuente S: falta leer el artículo.

**M-5 · Usufructo temporal y usufructo vitalicio y temporal a la vez (art. 26.a LISD).** No se pueden calcular: no hay derecho «usufructo temporal» y `pctUsufructoTemporal` no se usa en `calcularISD`. Tampoco hay usufructos ordenados en testamento distintos del universal del viudo.

**M-6 · Reducción por transmisiones sucesivas (art. 20.3 LISD).** No existe: se deduce de la base el impuesto pagado en la transmisión anterior de los mismos bienes a descendientes en los 10 años previos.

**M-7 · Renuncia pura y simple (art. 28 LISD; art. 58 RISD).** El coeficiente del renunciante, si es mayor, no se aplica; solo hay aviso.
- Ejemplo: el viudo, con 3 M€ de patrimonio previo, renuncia al usufructo universal. Cada hijo paga 51.397,81 € con coeficiente 1. Aplicando 1,10 a la parte que viene de la renuncia, la cuota sería del orden de 52.888 €. Es una cifra aproximada: el reparto exacto por porciones está por cotejar.

**M-8 · Andalucía: ajuar por defecto «ata» (`calcularISD`, línea 1183).** Solo cuenta los bienes de tipo «otro». La doctrina del TS (STS 499/2020) y del TEAC (30-05-2025, RG 6258/2024) lleva la base a las viviendas de uso residencial.
- Impacto en dm-04 (tres sobrinos): 49.614 € con el motor frente a 51.522 € con el criterio residencial.
- Es una cuestión de criterio y ya se señaló en la ronda 5 (I8). La recomendación es usar «residencial» por defecto y avisar.

**M-9 · Disposición adicional 2.ª LISD.** Si el causante no residía en España y no hay bienes en España, se aplica a cada heredero la norma de la comunidad en la que resida. La interfaz ofrece «Aplicar la ley estatal» (`ui.js`, selector `ccaaBienes`), y el motor no admite una comunidad por heredero.

**M-10 · Empresa familiar: ampliaciones autonómicas y forales sin modelar.**
- Asturias: 99 % a parientes de cuarto grado sin descendientes (Ley 8/2024).
- Bizkaia: colaterales de cuarto grado (NF 4/2024).
- Comunitat Valenciana: primos, cuarto grado y holdings desde el 11-08-2026 (Ley 5/2026).
- La Rioja: Ley 9/2025.
- Madrid: porcentaje de las participaciones antes del 01-07-2026.
- El motor usa el parentesco estatal y marca la reducción como PENDIENTE.

**M-11 · Beneficios estatales que faltan.**
- Bienes del Patrimonio Histórico (art. 20.2.c, 95 %).
- Deducción por doble imposición internacional (art. 23).
- Régimen de los seguros contratados antes del 19-01-1987 (DT 4.ª).

### 3.3 DESACTUALIZADAS

**O-1 · Comunitat Valenciana: Ley 5/2026 (DOGV 10-08-2026).**
- Reordena la bonificación del grupo III: 25 % desde el 01-06-2026 y 50 % desde el 01-06-2027. Según una fuente, la limita a la cuota de los bienes declarados.
- Amplía la empresa familiar.
- El motor cita «Ley 6/2023, Ley 5/2025». Los porcentajes del grupo III coinciden; la limitación a los bienes declarados y la empresa están sin modelar.

**O-2 · Galicia: Ley 5/2025.** Desde el 01-01-2026 la reducción por parentesco y discapacidad es única por causante y heredero. Solo hay aviso: el cálculo aplica la reducción completa aunque se haya consumido antes.

**O-3 · Extremadura: Ley 2/2026 (desde el 05-08-2026).** Los sobrinos del causante sin descendientes pueden aplicar los beneficios de los grupos I y II. No se aplica; hay aviso y el estado es PENDIENTE.

**O-4 · Cataluña: Ley 11/2026 (DOGC 9706).** Cambia las donaciones por causa de muerte con transmisión de presente y añade una reducción por fincas forestales. No está modelada; afecta poco a los casos ordinarios.

### 3.4 MENORES

**m-1 · Tipo medio efectivo de la nuda propiedad redondeado a dos decimales** (`tipoMedio = r2(kT.cuota / blT * 100)`, línea 1342). Diferencia de 9,71 a 12,52 € sobre cuotas de 35.000 a 46.000 €. Es incoherente con el art. 30 del mismo motor, que usa el tipo exacto.
- Ningún precepto exige dos decimales; el auditor no ha podido leer el art. 51 RISD.
- Propuesta: tipo exacto (o, como mínimo, con cuatro decimales), mostrando dos.

**m-2 · Ceuta y Melilla.** La residencia de más de 5 años del causante (art. 23 bis) no se pregunta ni se comprueba; solo figura en la etiqueta.

**m-3 · Castilla-La Mancha.** La bonificación por tramos y la del 95 % por discapacidad igual o superior al 65 % se encadenan una tras otra. Falta cotejar si son compatibles o alternativas.

**m-4 · Vivienda del colateral (art. 20.2.c).** «Mayor de sesenta y cinco años» se evalúa como `edad > 65` con la edad entera. Quien tenga 65 años cumplidos y unos meses queda fuera. Conviene pedir la fecha de nacimiento o advertirlo.

**m-5 · Navarra.** `cuotaEspecial` no acumula las donaciones previas (`donacionesPreviasBL`).

**m-6 · No residentes.** El selector permite elegir Navarra o un territorio vasco como «comunidad de los bienes». La DA 2.ª LISD solo se refiere a las comunidades de régimen común; los forales se rigen por el Concierto y el Convenio. Por cotejar.

**m-7 · Bonificación de Cataluña.** El porcentaje medio ponderado se redondea a dos decimales antes de aplicarlo. Falta cotejar la regla de redondeo de la ATC.

### 3.5 Sin poder cotejar (sin clasificar; el motor usa un valor plausible)

| Territorio | Parámetro | Valor en el motor | Contradicción o duda |
|---|---|---|---|
| Andalucía | Reducción del grupo III | 10.000 € | Unas guías dan 10.000 € y la página de magnitudes de la Junta solo deja ver la estatal de 7.993,46 € |
| Andalucía | Discapacidad | 250.000 / 500.000 € | No localizado |
| Andalucía | Límite de la vivienda al 99 % | 122.606,47 € | Una guía dice que no hay tope |
| Extremadura | Reducción de los grupos I y II | 500.000 € | Una guía da 500.000 € (Ley 1/2024) y dos dan 600.000 € |
| Canarias | Bonificación del 99,9 % al grupo III | Sin límite | Dos fuentes mencionan un límite de 55.000 € |
| Asturias | Vivienda | Sin límite, 3 años de permanencia | Sin cotejar |
| Asturias | Coeficientes del grupo I | 1,02 / 1,03 / 1,04 | Fuentes confusas; algunas los extienden al grupo II |
| Illes Balears | Reducciones (25.000 € …), tarifa de I-II (1 % hasta 700.000 €), tarifa III-IV en números redondos, vivienda 100 % / 270.151,20 € y tramos 2-4 de la fila de afinidad | — | Una sola fuente o ninguna |
| Álava | Reducción de colaterales | 38.156 € para grupo «I» | El texto oficial habla de 38.156 € + 4.770 € por año menos de 21 (máximo 119.930 €). Los grupos de la NF 11/2005 tampoco se han cotejado (el motor sigue el esquema de Gipuzkoa) |
| Navarra | Tarifas de colaterales y extraños | Tipo único con regla antisalto | Las guías se contradicen |
| Galicia | Tarifa de I-II, discapacidad (100 % de la base con discapacidad ≥65 %) y vivienda (100 % del cónyuge; 99/97/95 %, límite 600.000 €) | — | Sin cotejar |
| Cataluña | Reducciones por parentesco (100.000 / 50.000 / 30.000 / 8.000), discapacidad (275.000 / 650.000), seguros (25.000) y vivienda (500.000 € prorrateados, mínimo 180.000) | — | Una fuente confirma los 100.000 € del hijo mayor de 21 |
| Comunitat Valenciana | Tarifa y coeficientes propios | — | Sin cotejar |
| Régimen estatal | Mitad de gananciales en el patrimonio previo del viudo (el motor cita el art. 22.3) | — | No se ha podido leer el artículo |
| Madrid | Número de la ley de la empresa familiar al 99 % | Ley 3/2026 | La prensa de julio de 2026 confirma el 99 %; ninguna fuente da el número |
| Gipuzkoa | Límite de la vivienda | 220.000 € | Una guía dice 215.000 € |

## 4. Tablas por territorio

Columnas:
- **Esperado**: cálculo independiente (`esperado.mjs`).
- **Motor**: `calcularISD` de la versión 0.4.2.
- Casos: un solo heredero que lo recibe todo en metálico, sin ajuar ni deudas, con devengo el 15-09-2026, salvo que el caso diga otra cosa. En los usufructos, 600.000 € en metálico con dos hijos de 35 y 30 años.
- La columna «Parámetros» del encabezado de cada tabla da la fiabilidad de las cifras legales usadas: con **NV**, la coincidencia solo prueba la mecánica.

### 4.1 Estado (no residentes sin CCAA) · Ley 29/1987

Fuente del cálculo esperado: arts. 20, 21, 22 y 26 Ley 29/1987 (BOE-A-1987-28141; cifras de la tarifa reproducidas en las instrucciones del 650 de la CARM). Estado de los parámetros: **V**. Casos con diferencia: **3 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 51.397,81 | 51.397,81 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 45.292,01 | 45.292,01 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 51.397,81 | 51.397,81 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 432.697,34 | 432.697,34 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 71.133,16 | 71.133,16 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 61.802,96 | 61.802,96 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 39.330,06 | 39.330,06 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 91.071,32 | 91.071,32 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 142.560,17 | 142.560,17 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | IV / IV | 110.933,62 | 110.933,62 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 39.330,06 | 39.330,06 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 15.920,19 | 15.920,19 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 22.765,60 | 22.765,60 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 35.655,10 | 35.664,81 | **9,71** | MENOR (m-1) |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 8272,94 | 8272,94 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 43.255,03 | 43.266,81 | **11,78** | MENOR (m-1) |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 4222,47 | 4222,47 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 45.969,29 | 45.981,81 | **12,52** | MENOR (m-1) |

### 4.2 Ceuta · art. 23 bis Ley 29/1987

Fuente del cálculo esperado: art. 23 bis Ley 29/1987 (iberley; texto publicado por la AEAT; Ministerio de Hacienda, «Ceuta y Melilla»). Estado de los parámetros: **V**. Casos con diferencia: **3 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 513,98 | 513,98 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 452,92 | 452,92 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 513,98 | 513,98 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 4326,97 | 4326,97 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 23.777,13 | 23.777,13 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 23.777,13 | 23.777,13 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 31.640,85 | 31.640,85 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 711,33 | 711,33 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 618,03 | 618,03 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 910,71 | 910,71 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 1425,60 | 1425,60 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 26.156,04 | 26.156,04 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 37.969,02 | 37.969,02 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | IV / IV | 55.466,81 | 55.466,81 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 23.777,13 | 23.777,13 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 6022,25 | 6022,25 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 159,20 | 159,20 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 227,66 | 227,66 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 356,55 | 356,65 | **0,10** | MENOR (m-1) |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 82,73 | 82,73 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 432,55 | 432,67 | **0,12** | MENOR (m-1) |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 42,22 | 42,22 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 459,69 | 459,82 | **0,13** | MENOR (m-1) |

### 4.3 Melilla · art. 23 bis Ley 29/1987

Fuente del cálculo esperado: ídem Ceuta. Estado de los parámetros: **V**. Casos con diferencia: **3 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 513,98 | 513,98 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 452,92 | 452,92 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 513,98 | 513,98 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 4326,97 | 4326,97 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 23.777,13 | 23.777,13 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 23.777,13 | 23.777,13 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 31.640,85 | 31.640,85 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 711,33 | 711,33 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 618,03 | 618,03 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 910,71 | 910,71 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 1425,60 | 1425,60 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 26.156,04 | 26.156,04 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 37.969,02 | 37.969,02 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | IV / IV | 55.466,81 | 55.466,81 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 23.777,13 | 23.777,13 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 6022,25 | 6022,25 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 159,20 | 159,20 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 227,66 | 227,66 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 356,55 | 356,65 | **0,10** | MENOR (m-1) |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 82,73 | 82,73 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 432,55 | 432,67 | **0,12** | MENOR (m-1) |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 42,22 | 42,22 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 459,69 | 459,82 | **0,13** | MENOR (m-1) |

### 4.4 Andalucía · Ley 5/2021

Fuente del cálculo esperado: arts. 37-39 Ley 5/2021 (BOE-A-2021-17915; Ibercaja; INEAF); grupo III y discapacidad sin cotejo. Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 996,20 | 996,20 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 44.430,00 | 44.430,00 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 44.430,00 | 44.430,00 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 60.078,00 | 60.078,00 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 44.430,00 | 44.430,00 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 60.078,00 | 60.078,00 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 44.430,00 | 44.430,00 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 11.182,64 | 11.182,64 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.5 Comunidad de Madrid · D. Leg. 1/2010

Fuente del cálculo esperado: arts. 21-25 D. Leg. 1/2010 (BOE BOCM-m-2010-90068, cotejo previo de la mesa jurídica; guías 2026 para discapacidad y vivienda). Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 513,51 | 513,51 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 452,31 | 452,31 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 513,51 | 513,51 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 4325,66 | 4325,66 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 23.760,43 | 23.760,43 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 23.760,43 | 23.760,43 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.242,42 | 63.242,42 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 709,86 | 709,86 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 617,55 | 617,55 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 377,84 | 377,84 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 901,79 | 901,79 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 1424,81 | 1424,81 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 26.137,67 | 26.137,67 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.890,90 | 75.890,90 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 513,51 | 513,51 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 23.760,43 | 23.760,43 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 5971,34 | 5971,34 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 377,84 | 377,84 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 158,25 | 158,25 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 227,44 | 227,44 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 356,20 | 356,18 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 82,59 | 82,59 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 432,14 | 432,11 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 42,13 | 42,13 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 459,27 | 459,23 | 0,00 | — |

### 4.6 Cataluña · D. Leg. 1/2024

Fuente del cálculo esperado: ATC, «Tarifa, coeficientes multiplicadores y cuota» (coeficientes); bonificación y reducciones sin cotejo literal en esta auditoría. Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 230,00 | 230,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 362,40 | 362,40 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 10.350,00 | 10.350,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 208.725,00 | 208.725,00 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 34.368,65 | 34.368,65 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 34.368,65 | 34.368,65 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 46.000,00 | 46.000,00 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 12.103,00 | 12.103,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 12.652,17 | 12.652,17 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 45.289,53 | 45.289,53 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 34.368,65 | 34.368,65 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 46.000,00 | 46.000,00 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 230,00 | 230,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 34.368,65 | 34.368,65 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 222,35 | 222,35 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 247,69 | 247,69 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 61,40 | 61,40 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 5582,65 | 5582,65 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 7864,39 | 7864,39 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 8688,02 | 8688,02 | 0,00 | — |

### 4.7 Comunitat Valenciana · Ley 13/1997

Fuente del cálculo esperado: Ley 13/1997 arts. 10-12 bis (guías 2026; nota BBVA 2023 y OCU para la discapacidad psíquica); Ley 5/2025. Estado de los parámetros: **S**. Casos con diferencia: **2 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 318,53 | 318,53 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 217,68 | 217,68 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 318,53 | 318,53 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 4055,31 | 4055,31 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 35.918,17 | 35.918,17 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 35.918,17 | 35.918,17 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.705,62 | 63.705,62 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 431,28 | 431,28 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 407,83 | 407,83 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 92,58 | 92,58 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 456,78 | 456,78 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 1170,88 | 1170,88 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 39.511,80 | 39.511,80 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 76.446,74 | 76.446,74 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 318,53 | 318,53 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.890,90 | 47.890,90 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 4763,31 | 4763,31 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 92,58 | **92,58** | MAYOR (M-1) |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 7,82 | 7,82 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 83,25 | 83,25 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 179,97 | 180,01 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 246,86 | 246,91 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 270,75 | 270,81 | **0,06** | MENOR (m-1) |

### 4.8 Galicia · D. Leg. 1/2011

Fuente del cálculo esperado: D. Leg. 1/2011 art. 6 (Cuatrecasas 2026; Xunta para el grupo III); tarifa I-II y discapacidad sin cotejo. Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 45.500,00 | 45.500,00 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 41.814,69 | 41.814,69 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 41.814,69 | 41.814,69 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 45.998,26 | 45.998,26 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 41.814,69 | 41.814,69 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 0,00 | 0,00 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.9 Castilla y León · D. Leg. 1/2013

Fuente del cálculo esperado: D. Leg. 1/2013 (tributos.jcyl.es para la discapacidad; guías para el 99 % y los 400.000 €). Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 3021,23 | 3021,23 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 124,15 | 124,15 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 316,41 | 316,41 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 332,23 | 332,23 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.10 Castilla-La Mancha · Ley 8/2013

Fuente del cálculo esperado: art. 17 Ley 8/2013 (Ministerio de Hacienda vía r4; dos guías 2026). Estado de los parámetros: **V**. Casos con diferencia: **3 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 7709,67 | 7709,67 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 4529,20 | 4529,20 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 7709,67 | 7709,67 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 86.539,47 | 86.539,47 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 14.226,63 | 14.226,63 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 12.360,59 | 12.360,59 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 3933,01 | 3933,01 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 910,71 | 910,71 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 28.512,03 | 28.512,03 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 7709,67 | 7709,67 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 3933,01 | 3933,01 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 1782,76 | 1783,24 | **0,48** | MENOR (m-1) |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 4325,50 | 4326,68 | **1,18** | MENOR (m-1) |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 4596,93 | 4598,18 | **1,25** | MENOR (m-1) |

### 4.11 Aragón · D. Leg. 1/2005

Fuente del cálculo esperado: D. Leg. 1/2005 arts. 131-5 y 131-12 (Ministerio de Hacienda vía r4). Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 268.122,67 | 268.122,67 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 12.415,36 | 12.415,36 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 13.036,13 | 13.036,13 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.12 Extremadura · D. Leg. 1/2018

Fuente del cálculo esperado: art. 20 D. Leg. 1/2018 (BOE-A-2018-8159 consolidado; portal tributario de la Junta). Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 2681,23 | 2681,23 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 130,36 | 130,36 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.13 Región de Murcia · D. Leg. 1/2010

Fuente del cálculo esperado: art. 5 D. Leg. 1/2010 Murcia (instrucciones del 650 de la CARM) y 99 % I-II (varias guías). Estado de los parámetros: **V**. Casos con diferencia: **3 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 513,98 | 513,98 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 452,92 | 452,92 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 513,98 | 513,98 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 4578,35 | 4578,35 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 711,33 | 711,33 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 618,03 | 618,03 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 917,72 | 917,72 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 1464,51 | 1464,51 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 513,98 | 513,98 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 159,20 | 159,20 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 227,66 | 227,66 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 356,55 | 356,65 | **0,10** | MENOR (m-1) |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 82,73 | 82,73 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 432,55 | 432,67 | **0,12** | MENOR (m-1) |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 42,22 | 42,22 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 459,69 | 459,82 | **0,13** | MENOR (m-1) |

### 4.14 Canarias · D. Leg. 1/2009

Fuente del cálculo esperado: art. 24 ter D. Leg. 1/2009 (guías 2026); reducciones según taxdown y leggado. Estado de los parámetros: **S**. Casos con diferencia: **0 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 45,16 | 45,16 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 40,77 | 40,77 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 49,57 | 49,57 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 430,26 | 430,26 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47,11 | 47,11 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47,11 | 47,11 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 50,08 | 50,08 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 56,42 | 56,42 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 32,68 | 32,68 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 26,73 | 26,73 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 140,32 | 140,32 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 51,83 | 51,83 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 45,16 | 45,16 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47,11 | 47,11 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 0,00 | 0,00 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 32,68 | 32,68 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 8,95 | 8,95 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 18,19 | 18,19 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 33,99 | 33,99 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 4,90 | 4,90 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 41,51 | 41,51 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 1,63 | 1,63 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 44,20 | 44,19 | 0,00 | — |

### 4.15 Illes Balears · D. Leg. 1/2014

Fuente del cálculo esperado: D. Leg. 1/2014 (BOE-A-2014-6925; ATIB; instrucciones del 654; OCU) para los coeficientes; Ley 6/2025 para el grupo III. Estado de los parámetros: **S**. Casos con diferencia: **6 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 15.206,54 | 19.007,58 | **3801,04** | CRÍTICA (C-3) |
| c06 · Sobrino 40 a., 200.000 € | III / III | 15.206,54 | 19.007,58 | **3801,04** | CRÍTICA (C-3) |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 53.392,75 | 62.815,00 | **9422,25** | CRÍTICA (C-3) |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 16.727,67 | 20.909,29 | **4181,62** | CRÍTICA (C-3) |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 64.071,30 | 75.378,00 | **11.306,70** | CRÍTICA (C-3) |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 32.235,06 | 30.887,31 | **-1347,75** | CRÍTICA (C-3) |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 0,00 | 0,00 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.16 Principado de Asturias · D. Leg. 2/2014

Fuente del cálculo esperado: D. Leg. 2/2014 (guías 2026 para la reducción y la tarifa; blog jurídico para los tramos de la vivienda). Estado de los parámetros: **S**. Casos con diferencia: **2 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 390.860,00 | 390.860,00 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.521,15 | 47.521,15 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.521,15 | 47.521,15 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.240,00 | 63.240,00 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 2125,00 | 1700,00 | **-425,00** | CRÍTICA (C-6) |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 8670,96 | 8670,96 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 35.805,48 | 35.805,48 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 82.897,50 | 82.897,50 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.275,66 | 52.275,66 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.888,00 | 75.888,00 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.521,15 | 47.521,15 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 243,79 | 0,79 | **-243,00** | CRÍTICA (C-6) |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.17 Cantabria · D. Leg. 62/2008

Fuente del cálculo esperado: art. 5 D. Leg. 62/2008 (BOE BOCT-c-2008-90028 consolidado) y art. 8.1. Estado de los parámetros: **S**. Casos con diferencia: **1 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 0,00 | 0,00 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 0,00 | 0,00 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 20.907,34 | 20.907,34 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.552,06 | 47.552,06 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 22.999,13 | 22.999,13 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / IV | 0,00 | 110.933,62 | **110.933,62** | CRÍTICA (C-1) |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.552,06 | 47.552,06 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 3929,94 | 3929,94 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 0,00 | 0,00 | 0,00 | — |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 0,00 | 0,00 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 0,00 | 0,00 | 0,00 | — |

### 4.18 La Rioja · Ley 10/2017

Fuente del cálculo esperado: Ley 10/2017 (Cuatrecasas «La Rioja – Novedades tributarias 2025»; Ibercaja). Estado de los parámetros: **S**. Casos con diferencia: **4 de 25**.

| Caso | Grupo (esp./motor) | Esperado (€) | Motor (€) | Diferencia (€) | Gravedad |
|---|---|---:|---:|---:|---|
| c01 · Cónyuge 60 a., 300.000 € metálico | II / II | 513,98 | 513,98 | 0,00 | — |
| c02 · Hijo 15 a., 300.000 € | I / I | 452,92 | 452,92 | 0,00 | — |
| c03 · Hijo 30 a., 300.000 € | II / II | 513,98 | 513,98 | 0,00 | — |
| c04 · Hijo 30 a., 1.500.000 € | II / II | 4326,97 | 4326,97 | 0,00 | — |
| c05 · Hermano 50 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c06 · Sobrino 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c07 · Extraño 40 a., 200.000 € | IV / IV | 63.281,70 | 63.281,70 | 0,00 | — |
| c08 · Hijo 30 a., 300.000 € + vivienda habitual 200.000 € | II / II | 711,33 | 711,33 | 0,00 | — |
| c09 · Hijo 30 a., 300.000 € + seguro de vida 50.000 € | II / II | 618,03 | 618,03 | 0,00 | — |
| c10 · Hijo 30 a., discapacidad 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c11 · Hijo 30 a., discapacidad 65 %, 600.000 € | II / II | 910,71 | 910,71 | 0,00 | — |
| c12 · Hijo 30 a., patrimonio previo 1.000.000 €, 600.000 € | II / II | 1425,60 | 1425,60 | 0,00 | — |
| c13 · Hermano, patrimonio previo 3.000.000 €, 200.000 € | III / III | 52.312,09 | 52.312,09 | 0,00 | — |
| c14 · Extraño, patrimonio previo 5.000.000 €, 200.000 € | IV / IV | 75.938,04 | 75.938,04 | 0,00 | — |
| c15 · Pareja de hecho inscrita 50 a., 300.000 € | II / IV | 513,98 | 110.933,62 | **110.419,64** | CRÍTICA (C-2) |
| c16 · Sobrino político 40 a., 200.000 € | III / III | 47.554,27 | 47.554,27 | 0,00 | — |
| c17 · Hermano 70 a. conviviente 2 años, vivienda 200.000 € | III / III | 12.044,50 | 12.044,50 | 0,00 | — |
| c18 · Hijo 30 a., discapacidad psíquica 33 %, 300.000 € | II / II | 393,30 | 393,30 | 0,00 | — |
| c19 · Hijo 30 a., 100.000 € + vivienda 160.000 € | II / II | 159,20 | 159,20 | 0,00 | — |
| u60v · Usufructo universal: viudo 60 a. (29 %) sobre 600.000 € | II / II | 227,66 | 227,66 | 0,00 | — |
| u60h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 60 a.) | II / II | 356,55 | 356,65 | **0,10** | MENOR (m-1) |
| u74v · Usufructo universal: viudo 74 a. (15 %) sobre 600.000 € | II / II | 82,73 | 82,73 | 0,00 | — |
| u74h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 74 a.) | II / II | 432,55 | 432,67 | **0,12** | MENOR (m-1) |
| u85v · Usufructo universal: viudo 85 a. (10 %) sobre 600.000 € | II / II | 42,22 | 42,22 | 0,00 | — |
| u85h · Usufructo universal: hijo 35 a., nuda propiedad (viudo 85 a.) | II / II | 459,69 | 459,82 | **0,13** | MENOR (m-1) |

### 4.19 Territorios forales

Fuentes: Bizkaia NF 4/2015 art. 43 (iberley; dossier de las Cortes de Castilla y León); Gipuzkoa NF 2/2022 (texto vigente en gipuzkoa.eus); Álava NF 11/2005 (texto en web.araba.eus / dossier CCyL); Navarra D. F. Leg. 250/2002 art. 34 (guías 2026, sin texto oficial).

| Territorio | Caso | Esperado | Motor | Diferencia | Gravedad |
|---|---|---|---|---|---|
| BIZ | hijo, 600.000,00 € | 3000,00 € | 3000,00 € | 0,00 | — |
| GIP | hijo, 600.000,00 € | 3000,00 € | 3000,00 € | 0,00 | — |
| ALA | hijo, 600.000,00 € | 3000,00 € | 3000,00 € | 0,00 | — |
| BIZ | conyuge, 600.000,00 € | 3000,00 € | 3000,00 € | 0,00 | — |
| NAV | hijo, 600.000,00 € | 9000,00 € | 9000,00 € | 0,00 | — |
| NAV | hijo, 300.000,00 € | 1000,00 € | 1000,00 € | 0,00 | — |
| NAV | conyuge, 600.000,00 € | 2800,00 € | 2800,00 € | 0,00 | — |
| BIZ | hijo, 200.000 € · grupo y reducción | grupo I, 400.000,00 € | grupo I, 400.000,00 € (paga 0,00 €) | 0,00 | — |
| BIZ | hermano, 200.000 € · grupo y reducción | grupo II, 40.000,00 € | grupo II, 40.000,00 € (paga 20.230,59 €) | 0,00 | — |
| BIZ | sobrino, 200.000 € · grupo y reducción | grupo III, 20.000,00 € | grupo III, 20.000,00 € (paga 23.346,59 €) | 0,00 | — |
| BIZ | primo, 200.000 € · grupo y reducción | grupo IV, 0,00 € | grupo IV, 0,00 € (paga 35.719,09 €) | 0,00 | — |
| BIZ | suegro, 200.000 € · grupo y reducción | grupo III, 20.000,00 € | grupo III, 20.000,00 € (paga 23.346,59 €) | 0,00 | — |
| BIZ | sobrino_afin, 200.000 € · grupo y reducción | grupo IV, 0,00 € | grupo III, 20.000,00 € (paga 23.346,59 €) | **grupo distinto** | CRÍTICA (C-5) |
| BIZ | tio_afin, 200.000 € · grupo y reducción | grupo IV, 0,00 € | grupo III, 20.000,00 € (paga 23.346,59 €) | **grupo distinto** | CRÍTICA (C-5) |
| BIZ | extrano, 200.000 € · grupo y reducción | grupo IV, 0,00 € | grupo IV, 0,00 € (paga 35.719,09 €) | 0,00 | — |
| GIP | hijo, 200.000 € · grupo y reducción | grupo I, 400.000,00 € | grupo I, 400.000,00 € (paga 0,00 €) | 0,00 | — |
| GIP | hermano, 200.000 € · grupo y reducción | grupo II, 16.150,00 € | grupo II, 16.150,00 € (paga 25.226,57 €) | 0,00 | — |
| GIP | sobrino, 200.000 € · grupo y reducción | grupo II, 16.150,00 € | grupo II, 16.150,00 € (paga 25.226,57 €) | 0,00 | — |
| GIP | primo, 200.000 € · grupo y reducción | grupo III, 8075,00 € | grupo III, 8075,00 € (paga 35.301,66 €) | 0,00 | — |
| GIP | suegro, 200.000 € · grupo y reducción | grupo II, 16.150,00 € | grupo II, 16.150,00 € (paga 25.226,57 €) | 0,00 | — |
| GIP | sobrino_afin, 200.000 € · grupo y reducción | grupo III, 8075,00 € | grupo II, 16.150,00 € (paga 25.226,57 €) | **grupo distinto** | CRÍTICA (C-4) |
| GIP | tio_afin, 200.000 € · grupo y reducción | grupo III, 8075,00 € | grupo II, 16.150,00 € (paga 25.226,57 €) | **grupo distinto** | CRÍTICA (C-4) |
| GIP | extrano, 200.000 € · grupo y reducción | grupo III, 8075,00 € | grupo III, 8075,00 € (paga 35.301,66 €) | 0,00 | — |

## 5. Reglas no implementadas (lista consolidada)

| # | Regla | Norma | Gravedad |
|---|---|---|---|
| 1 | Usufructo temporal (2 % por año, máximo 70 %) y usufructo vitalicio y temporal a la vez (el de menor valor); usufructos ordenados en testamento distintos del universal | art. 26.a LISD | MAYOR (M-5) |
| 2 | Deducción del impuesto pagado en transmisiones sucesivas a descendientes en 10 años | art. 20.3 LISD | MAYOR (M-6) |
| 3 | Reducción del 95 % por bienes del Patrimonio Histórico | art. 20.2.c LISD | MAYOR (M-11) |
| 4 | Deducción por doble imposición internacional | art. 23 LISD | MAYOR (M-11) |
| 5 | Seguros contratados antes del 19-01-1987 | DT 4.ª LISD | MAYOR (M-11) |
| 6 | Coeficiente del renunciante en la renuncia pura | art. 28 LISD; art. 58 RISD | MAYOR (M-7) |
| 7 | Interés de demora de la prórroga | art. 68 RISD | MAYOR (M-3) |
| 8 | Causante no residente sin bienes en España: comunidad de residencia de cada heredero | DA 2.ª LISD | MAYOR (M-9) |
| 9 | Discapacidad psíquica desde el 33 % en la Comunitat Valenciana | Ley 13/1997 | MAYOR (M-1) |
| 10 | Relación «cuñado/a» (colateral de 2.º grado por afinidad) | art. 20.2.a LISD; STS 18-03-2003 | MAYOR (M-2) |
| 11 | Aragón: hijos menores hasta 3.000.000 € y 150.000 € más por hijo menor conviviente con el viudo | D. Leg. 1/2005 | MAYOR (M-4) |
| 12 | Empresa familiar ampliada (Asturias, Bizkaia, Valencia, La Rioja) y requisitos de la empresa | leyes citadas en M-10 | MAYOR (M-10) |
| 13 | Galicia: reducción única por causante y heredero (desde 2026) | art. 6.Cinco D. Leg. 1/2011 | DESACTUALIZADA (O-2) |
| 14 | Extremadura: sobrinos con los beneficios de los grupos I y II | art. 20 ter D. Leg. 1/2018 (Ley 2/2026) | DESACTUALIZADA (O-3) |
| 15 | Cataluña: Ley 11/2026 (donación por causa de muerte, fincas forestales) | DOGC 9706 | DESACTUALIZADA (O-4) |
| 16 | Plazos y recargos forales cotejados (hoy se estiman con el régimen común, salvo el recargo de Gipuzkoa) | normas forales | sigue PENDIENTE (ya avisado en el motor) |
| 17 | Nuda propiedad en los territorios forales (equivalente al tipo medio efectivo) | normas forales | sigue PENDIENTE (ya avisado en el motor) |
| 18 | Ceuta y Melilla: comprobar los 5 años de residencia del causante | art. 23 bis LISD | MENOR (m-2) |

## 6. Marcas PENDIENTE del propio motor (ISD)

Extraídas de `fuente/src/motor.mjs`: `estado: P`, `estadoGlobal: P` y textos «PENDIENTE» en `REGLAS`, `calcularISD` y los plazos y recargos. Hay 73 líneas; el detalle con número de línea está en `share/audit-isd/out/pendientes.tsv`. Agrupadas, y con lo que esta auditoría ha podido aportar:

| Territorio o bloque | Marcas PENDIENTE | Lo que aporta esta auditoría |
|---|---|---|
| Madrid (`estadoGlobal: P`, l. 105) | Porcentaje de la empresa familiar para participaciones antes del 01-07-2026 (l. 111) | El 99 % desde julio de 2026 aparece en prensa. Discapacidad y vivienda, confirmadas (V) |
| Cataluña | Reparto del límite de la vivienda (l. 143) | Sin cotejo. Coeficientes V (ATC) |
| Comunitat Valenciana (`estadoGlobal: P`) | Reducción del grupo III supletoria (l. 162), art. 10 (parentesco, discapacidad, vivienda, empresa, l. 163-167), tarifa (l. 168), coeficientes (l. 169) y régimen anterior al 28-05-2023 (l. 171) | Parentesco, vivienda y 99 % pasan a V. **La discapacidad es incompleta (M-1)**. Tarifa y coeficientes sin cotejar |
| Galicia (`estadoGlobal: P`) | Vivienda (l. 188), tarifa (l. 190), coeficientes (l. 191) y deducción del grupo I (l. 192) | El coeficiente 1 de los grupos I-II lo confirma el Ministerio (r4). El resto, sin cotejo |
| Castilla-La Mancha | Fecha de inicio de la escala (l. 204) | Escala V. Fecha sin cotejar |
| Aragón (`estadoGlobal: P`) | 99 % del grupo I (l. 211) | V según el Ministerio (r4). **Faltan los menores (M-4)** |
| Extremadura (`estadoGlobal: P`) | Si la reducción de 500.000 € sustituye o se suma (l. 214), sobrinos (l. 221) y el 99 % con exigencia de plazo (l. 222) | El 99 % con presentación en plazo, **V (BOE consolidado)**. Lo de 500.000 o 600.000 €, sin resolver |
| Murcia | Fecha de inicio del 99 % (l. 227) | Tarifa V. Fecha sin cotejar |
| Canarias (`estadoGlobal: P`) | Reducciones, discapacidad, seguros, vivienda y empresa (l. 231-238) | Las cifras de parentesco coinciden con dos guías (S). Posible límite del grupo III |
| Illes Balears (`estadoGlobal: P`) | Reducciones, discapacidad, vivienda y tarifas (l. 242-245) | **Faltan los coeficientes propios (C-3)**. El grupo III ya se había verificado en r4 |
| Asturias (`estadoGlobal: P`) | Vivienda (l. 263) y coeficiente del grupo I (l. 265) | **Umbrales de la vivienda erróneos (C-6)**. Coeficientes, dudosos |
| Cantabria | Fecha de inicio del 100 % (l. 275) | **Pareja (C-1)** |
| La Rioja (`estadoGlobal: P`) | Empresa (l. 281) y redacción anterior a 2024 (l. 285) | **Pareja (C-2)** |
| Navarra (`estadoGlobal: P`) | Seguros (l. 293) y tabla de afines (l. 305) | Grupo I de la línea recta y cónyuge, V con las guías. Colaterales sin cotejar |
| Bizkaia y Gipuzkoa | Seguros de los grupos distintos del I (l. 313 y 326) | **Grupos de los afines (C-4, C-5)** |
| `calcularISD` | Bloqueo de reparto (l. 1219), empresa (l. 1272 y 1315), nuda propiedad (l. 1343), nuda foral (l. 1362), Madrid parejas de otros registros (l. 1407-1408) | El tipo medio de la nuda propiedad es el criterio habitual; queda el redondeo (m-1) |
| Plazos y recargos forales | `PLAZO_ISD_FORAL` (l. 2537-2540) y `RECARGO_FORAL` (l. 2552-2561) | Sin cambios: no se pudieron leer las normas forales |

## 7. Especificaciones de corrección (para el desarrollador)

Todas las referencias son a `fuente/src/motor.mjs`, salvo que se indique otra cosa. Cada corrección tiene su prueba en `auditoria/pruebas-sucesiones.mjs` (D-n), y conviene subir `NORMA_V` con una novedad en Normativa.

### C-1 · Cantabria: pareja de hecho equiparada (REGLAS.CANT, l. 267)

- Cambiar `parejaEquiparada: false` por `parejaEquiparada: true`.
- Cambiar la norma a «art. 5 D. Leg. 62/2008 (parejas inscritas, Ley de Cantabria 1/2005 o registros análogos)».
- La bonificación del art. 8.1 se aplica sola, porque `grupoComun` devuelve «II».
- Alerta en `calcularISD`, como la de Madrid: «Cantabria equipara al cónyuge las parejas inscritas (art. 5 D. Leg. 62/2008); comprobar la inscripción».
- Prueba: D-1 (300.000 € → 0 €).

### C-2 · La Rioja: pareja de hecho equiparada (REGLAS.RIO, l. 280)

- `parejaEquiparada: true`.
- Alerta con el requisito: convivencia estable de 2 años; inscripción en el registro de La Rioja o, desde el 01-01-2025, en otros registros.
- Opcional: si `fecha < "2025-01-01"` y `h.registroPareja` no es «RIO», tratar la pareja como grupo IV.
- Prueba: D-2 (513,98 €).

### C-3 · Illes Balears: coeficientes propios (REGLAS.BAL, l. 241; añadir `coef`)

```js
coef(h, g, pp, ci) {
  const L = [0, 400000, 2000000, 4000000];
  const colAfin = ["sobrino_afin", "tio_afin", "cunado"].includes(h.relacion);
  const F = g === "IV" ? [1.7000, 1.7850, 1.8700, 2.0400]
    : g === "III" ? (colAfin ? [1.6575, 1.7404, 1.8233, 1.9890] /* tramos 2-4 PENDIENTE de cotejo */ : [1.2706, 1.3341, 1.3977, 1.5247])
    : [1, 1.05, 1.10, 1.20]; /* I-II: tramos 2-4 PENDIENTE, sin efecto práctico por la bonificación del 100 % */
  return escalaCoef(L, F, pp, ci, "D. Leg. 1/2014, coeficientes de las adquisiciones mortis causa (BOE-A-2014-6925; ATIB)", g === "III" && colAfin ? P : V);
}
```

- Antes de dar la fila de afinidad por VERIFICADO, confirmar en el consolidado de la ATIB a qué afines se aplica: colaterales solamente, o también ascendientes y descendientes por afinidad.
- Prueba: D-3.

### C-4 · Gipuzkoa: grupos (REGLAS.GIP.grupo, l. 323)

```js
grupo(h) { const l = linea(h); return ["desc","asc","conyuge","pareja"].includes(l) ? "I"
  : ["col2","col3"].includes(l) || ["suegro","yerno","hijastro"].includes(h.relacion) ? "II" : "III"; }
```

- Los colaterales por afinidad (`sobrino_afin`, `tio_afin` y el futuro `cunado`) pasan al grupo III.
- Revisar Álava (`REGLAS.ALA.grupo`, l. 336), que copia el esquema: está sin cotejar.
- Prueba: D-4.

### C-5 · Bizkaia: grupos (REGLAS.BIZ.grupo, l. 310)

```js
grupo(h) { const l = linea(h); return ["desc","asc","conyuge","pareja"].includes(l) ? "I" : l === "col2" ? "II"
  : l === "col3" || ["suegro","yerno","hijastro"].includes(h.relacion) ? "III" : "IV"; }
```

- Prueba: D-5.

### C-6 · Asturias: vivienda (REGLAS.AST.vivienda, l. 263)

```js
pctFn: (v) => v <= 90151.82 ? 0.99 : v <= 120202.42 ? 0.98 : v <= 150253.03 ? 0.97 : v <= 180303.63 ? 0.96 : 0.95
```

- `estado: P` hasta leer el artículo del D. Leg. 2/2014.
- En ese mismo cotejo, confirmar si rige el límite de 122.606,47 € por sujeto pasivo (hoy `limite: null`) y la permanencia (hoy 3 años).
- Prueba: D-6.

### M-1 · Comunitat Valenciana: discapacidad psíquica

- Nuevo campo `discapacidadPsiquica: boolean` en el heredero:
  - en la interfaz, una casilla junto al grado: «discapacidad psíquica o intelectual»;
  - en `casoMotor` (logic.js), `discapacidadPsiquica: !!p.discapacidadPsiquica`.
- En `REGLAS.VAL.redDiscapacidad` (l. 165):

```js
const d = h.discapacidad || 0; return { importe: d >= 65 || (h.discapacidadPsiquica && d >= 33) ? 240000 : d >= 33 ? 120000 : 0, ... }
```

- Prueba: D-7.

### M-2 · Relación «cuñado/a» (RELACIONES, l. 14)

- Añadir `cunado: { linea: "afin", label: "Cuñado/a" }`. Entra en el grupo III por `grupoComun`.
- Añadirlo a `AFINES_REL` solo si se quiere que siga las reglas de los afines en Madrid. En Gipuzkoa y Bizkaia, tras C-4 y C-5, queda en el III y en el IV respectivamente.
- En el reparto sin testamento queda excluido, como los demás afines (`repartoIntestado`, `excl`).
- Prueba: D-8.

### M-3 · Interés de la prórroga

Nueva exportación junto a `plazoPresentacionISD`, l. 2518:

```js
export function interesProrrogaISD(cuota, f, o = {}) {
  const desde = limiteISD(f, false), hasta = o.presentacion && o.presentacion < limiteISD(f, true) ? o.presentacion : limiteISD(f, true);
  const dias = Math.max(0, Math.round((new Date(hasta + "T12:00:00") - new Date(desde + "T12:00:00")) / 864e5));
  return { dias, importe: r2(Math.max(0, cuota) * (o.interes ?? INTERES_DEMORA) * dias / 365), desde, hasta, norma: "art. 68 RD 1629/1991", estado: V };
}
```

- En `calcularISD`, si `caso.prorrogaISD`, añadir `interesProrroga` al resultado y sumarlo a `totalConRecargo`.
- Prueba: D-9 (409,59 €).

### M-4 · Aragón: hijos menores (REGLAS.ARA.ajusteReducciones, l. 210)

- Si `linea(h) === "desc"` y `h.edad < 18`, el tope pasa a 3.000.000 € en lugar de 500.000 €.
- Sumar 150.000 € al tope del viudo por cada hijo menor que conviva con él.
- Citar el artículo (por cotejar: art. 131-1 o art. 131-5 D. Leg. 1/2005) con `estado: P` hasta leerlo.
- Prueba: D-10.

### M-5 · Usufructo temporal

- Nuevo tipo de derecho `{ tipo: "usufructo", temporalAnios: n }`.
- En `calcularISD`, en el bucle de `derechos`:

```js
f = d.temporalAnios ? Math.min(pctUsufructoTemporal(d.temporalAnios), pctUsufructoVitalicio(h.edad)) : pctUsufructoVitalicio(h.edad)
```

  Con `min` se aplica la regla del menor valor para la nuda cuando el usufructo es a la vez vitalicio y temporal.
- Para la nuda, usar el mismo `pu` del usufructuario.
- En la interfaz, poder ordenar un usufructo en testamento sobre bienes concretos.

### M-6 · Transmisiones sucesivas (art. 20.3 LISD)

- Nuevo campo del heredero `impuestoTransmisionAnterior` (€). Requisitos: los mismos bienes, a descendientes y en un máximo de 10 años.
- Añadir a `reds` el paso «Deducción por transmisión anterior (art. 20.3 Ley 29/1987)» con `importe = min(impuestoTransmisionAnterior, bi − suma)`.
- `estado: V` para la regla estatal. Revisar las mejoras autonómicas.

### M-7 · Renuncia

- Para cada beneficiario de una renuncia pura y simple (`renuncia: true` sin `aFavorDe`), calcular el coeficiente del renunciante con `R.coef(renunciante, grupoRenunciante, ppRenunciante, ci)`.
- Aplicar `max(kPropio, kRenunciante)` a la parte de la cuota que procede de la porción renunciada, en proporción a su valor.
- Dejar la regla de reparto `estado: P` hasta cotejar el art. 58 RISD.

### M-8 · Andalucía: ajuar por defecto (l. 1183)

- `const modo = !caso.ajuar || caso.ajuar === "sts" ? "residencial" : caso.ajuar;`
- Mantener «ata» como opción manual, con alerta.

### M-9 · Disposición adicional 2.ª

- Si `ccaa === "EST"` y no hay `ccaaBienes`, pedir para cada heredero `ccaaResidencia` y liquidarlo con `REGLAS[h.ccaaResidencia]`. Hoy `R` es único por caso: pasaría a resolverse por heredero dentro de `res.map`.
- Cambiar el texto del selector («Aplicar la ley estatal») para que diga que la ley estatal solo rige si el heredero tampoco reside en España.

### m-1 · Tipo medio exacto (l. 1342)

```js
const tipoExacto = blT > 0 ? kT.cuota / blT : 0; tipoMedio = r2(tipoExacto * 100); ci = r2(bl * tipoExacto);
```

- Así se muestran dos decimales pero se calcula con el tipo exacto, igual que la acumulación del art. 30.
- Si la mesa jurídica prefiere los dos decimales del modelo 650, documentarlo en la traza.

### Otros cambios

- m-2: preguntar «¿residía el causante en Ceuta o Melilla más de 5 años?»; si no, sin bonificación.
- m-4: usar la fecha de nacimiento o advertir del límite.
- m-5: acumular `donacionesPreviasBL` también en `cuotaEspecial` de Navarra.

## 8. Fuentes consultadas

Todas a través del buscador; el acceso directo a www.boe.es está bloqueado en este entorno. La «V» del informe significa extracto oficial o dos fuentes concordantes.

**Estado**
- Ley 29/1987: BOE-A-1987-28141 (extractos).
- Iberley, art. 23 bis LISD.
- Texto de la Ley 29/1987 publicado por la AEAT (Ceuta y Melilla).
- Ministerio de Hacienda, página «Ceuta y Melilla».
- notariosyregistradores.com, «Acumulación fiscal de donaciones y colación».

**Andalucía**
- BOE-A-2021-17915 (Ley 5/2021).
- BOJA 2021/206.
- Ibercaja, «¿Cómo calcular el impuesto de sucesiones en Andalucía?».
- INEAF.
- Junta de Andalucía, anexo de magnitudes del 650 y página de la tarifa.

**Madrid**
- Guías 2026 (tuio, life5, guiafiscal).
- autonomosyemprendedor.es (10-07-2026), sobre la empresa familiar al 99 %.

**Cataluña**
- ATC, «Tarifa, coeficientes multiplicadores y cuota» (atc.gencat.cat/es/tributs/isd/herencies/tarifa-coeficients-multiplicadors/).
- notariosyregistradores.com, sobre la Ley 11/2026.

**Comunitat Valenciana**
- hisenda.gva.es, «Novedades tributarias 2026».
- Cuatrecasas y Garrigues, novedades 2026.
- versis.es, sobre la Ley 5/2026.
- Nota BBVA Valencia (2023).
- OCU 2015-2020.
- Alicante Plaza.

**Galicia**
- La Región (03-06-2024).
- okdiario.
- Cuatrecasas 2026 (vía r4).

**Castilla y León**
- tributos.jcyl.es, beneficios fiscales del ISD.

**Castilla-La Mancha**
- portaltributario.jccm.es.
- Guías 2026.

**Extremadura**
- BOE-A-2018-8159 (D. Leg. 1/2018, consolidado).
- portaltributario.juntaex.es.

**Murcia**
- Instrucciones del 650 de la CARM (etributos.carm.es, INS651-2017; sede.carm.es).

**Canarias**
- taxdown.
- guiafiscal.
- alamoantunez.com.
- Bankinter.

**Illes Balears**
- BOE-A-2014-6925 (D. Leg. 1/2014).
- ATIB, contenido 9855.
- ATIB, instrucciones del modelo 654.
- OCU, «IS Baleares 2020».
- consultingdms.com.

**Asturias**
- sede.tributasenasturias.es.
- oscar-cano.com.
- Guías 2026.

**Cantabria**
- BOE BOCT-c-2008-90028 (consolidado).
- OCU.
- Life5.

**La Rioja**
- Cuatrecasas, «La Rioja – Novedades tributarias 2025».
- Ibercaja.

**País Vasco**
- Iberley, art. 43 NF 4/2015 de Bizkaia.
- Texto vigente de la NF 2/2022 (gipuzkoa.eus).
- Texto de la NF 11/2005 (web.araba.eus; dossier de las Cortes de Castilla y León).

**Navarra**
- Guías 2026 (guiafiscal, calculaherencia).
- Sin texto oficial.

## 9. Archivos de esta auditoría

**En el repositorio:**
- `auditoria/sucesiones.md`: este informe.
- `auditoria/pruebas-sucesiones.mjs`: pruebas al estilo de test.mjs. La sección R tiene 18 regresiones que hoy pasan; la sección D, 14 comprobaciones de discrepancias que hoy fallan.

**En `share/audit-isd/`** (scratchpad de la sesión):
- `esperado.mjs`: cálculo independiente.
- `comparar.mjs` y `tablas.mjs`: generan las tablas.
- `run.mjs`: ejecuta el motor fuente.
- `motor-node.mjs`: carga el motor publicado en Node.
- `paridad.mjs`: compara el motor publicado y el fuente.
- `demo-dump.mjs`: los 14 expedientes de demostración en el navegador real.
- `impactos.mjs`: importe de las reglas que faltan.
- `plazos.mjs`: plazos y recargos.
- `out/`: comparacion.json, comparacion.md, tablas.md, pendientes.tsv y demo-browser.json.
