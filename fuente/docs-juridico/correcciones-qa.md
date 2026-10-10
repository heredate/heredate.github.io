# Correcciones jurídicas del control de calidad (7-10-2026)

Rama `r3-juridico`. Cada decisión lleva su norma y su estado (VERIFICADO: texto oficial o dos fuentes; PENDIENTE: sin cotejo literal). Las pruebas están en la sección 23 de `src/test.mjs`, con casos calculados a mano.

## C2 y M13 · Fuera de plazo, recargo y bonificaciones

- **Decisión.** El interruptor «Se presentará dentro de plazo» ya no está activado siempre. Si el abogado no lo ha fijado y el impuesto no consta presentado, se deduce de las fechas. Pasados seis meses sin prórroga marcada en Trámites, o doce con ella, el expediente se calcula fuera de plazo. El abogado puede corregirlo (`x.enPlazoManual`).
- **Normas.** Arts. 67.1.a y 68 RD 1629/1991 (plazo, prórroga en los cinco primeros meses). VERIFICADO.
- **Recargo.** Art. 27.2 LGT: 1 % más 1 % por mes completo dentro de los 12 meses; después, 15 % más intereses de demora desde el día siguiente a esos 12 meses. Art. 27.5: el recargo se reduce un 25 % si se paga todo al presentar. Interés de demora de 2026: 4,0625 %. VERIFICADO (investigación `estrategia-fiscal.md`). Con requerimiento previo no hay recargo, sino posible sanción (arts. 191 y ss. LGT).
- **Dónde se ve.** El recargo sale en Impuestos, en el total (`costeExpediente`), en el Diagnóstico (con las dos cifras: a tiempo y ahora) y en el informe PDF.
- **Caso 25.** Extremadura, 10-01-2025, un hijo de 40 años, 800.000 €:
  - En plazo: 554,67 €.
  - Fuera de plazo: 55.466,81 €. Se pierde la bonificación (art. 20 D. Leg. 1/2018, que ya estaba modelado; PENDIENTE).
  - Recargo a 07-10-2026: 8.320,02 € (15 %) + 549,44 € (89 días de intereses) = 8.869,46 €.
- **Bonificación y plazo.** Andalucía y Madrid están cotejadas: no exigen plazo a los grupos I y II. En las demás comunidades no se ha cotejado: el cálculo mantiene la bonificación y avisa con la cifra sin ella (PENDIENTE).
- **M13.** La etiqueta ya no dice «(15 %)» si el importe incluye intereses. Ahora dice «15 % + intereses de demora de N días» (Diagnóstico, Listo para firmar, PDF).

## I6 · Vecindad civil y sucesión intestada foral

- **Regla general.** El reparto sin testamento y las legítimas siguen la vecindad civil del causante (arts. 9.8, 14-16 CC), no la comunidad que cobra el impuesto (art. 32 Ley 22/2009).
- **Campo nuevo.** `x.vecindadCivil`, con selector en Herederos y bienes. Por defecto se toma la del territorio de residencia y se avisa.

**Cataluña (CCCat, libro IV).** Fuentes: dos secundarias concordantes (Economist & Jurist y notariosyregistradores.com) y el preámbulo de la Ley 10/2008. El BOE consolidado no se pudo leer entero, así que la numeración exacta de los apartados queda PENDIENTE.
- Orden de suceder: descendientes; cónyuge o conviviente; ascendientes; colaterales hasta el 4.º grado; Generalitat.
- Con hijos, usufructo universal sin fianza (art. 442-3), que no se pierde por un nuevo matrimonio (art. 442-4.3).
- Conmutación en el plazo de un año por 1/4 en propiedad más el usufructo de la vivienda familiar (art. 442-5). Es una opción del expediente. El usufructo de la vivienda se valora como fracción del caudal (aproximación, avisada).
- Sin descendientes, el viudo excluye a los ascendientes, a salvo la legítima de los progenitores (art. 451-4).
- Hermanos sin distinción de vínculo (art. 442-10; PENDIENTE de cotejo literal).
- Conviviente en pareja estable con requisitos del art. 234-1.
- Cuarta vidual (art. 452-1): se avisa, no se cuantifica.
- Caso 28: el usufructo de la viuda vale 76.000 € (19 %) y la nuda propiedad del hijo, 324.000 €.

**Galicia.** El art. 267 de la Ley 2/2006 remite al CC (fuente secundaria, PENDIENTE). Usufructo del viudo:
- 1/4 con descendientes (art. 253, VERIFICADO).
- 1/2 sin descendientes (art. 254, VERIFICADO).
- La pareja inscrita se equipara al cónyuge (disposición adicional 3.ª).

**Baleares, Mallorca y Menorca.** Art. 53 de la Compilación: se aplica el CC con los derechos del art. 45.
- Usufructo de 1/2 con descendientes y de 2/3 con los padres.
- Con abuelos, universal (PENDIENTE).
- Se bloquean Eivissa y Formentera, la pareja estable (Ley 18/2001) y el viudo separado de hecho (Ley 7/2017).

**Aragón, Navarra y País Vasco.** Con viudo, pareja, nietos, renuncias o desheredados, el reparto se bloquea. No se reparte con el CC. Hay aviso rojo en Impuestos, Herederos, Resumen, Diagnóstico, PDF y calculadora web. El único caso permitido es el de solo hijos sin viudo: partes iguales (artículos forales PENDIENTES).
- **Superado en la ronda 4 (1.6):** Aragón, Navarra y País Vasco ya reparten con su derecho propio y con bienes troncales; ver `docs-r4/civil.md`.

## I7 · Más deudas que bienes

- Los llamados siguen en el cálculo con 0 €: ya no aparece «0 herederos».
- Aviso destacado con el exceso del pasivo, citando los arts. 999, 1003, 1008, 1010 y 1023 CC; en Cataluña, también los arts. 461-14 a 461-16 CCCat (PENDIENTE).
- Si los legados superan la herencia líquida, aviso propio (arts. 887-891 y 1027 CC).
- Sin inmuebles, la plusvalía dice «No hay inmuebles».

## I8 · Legatario quitado

- Al quitar a una persona se borran sus `legatarioId`, `adjudicadoA` y `viviendaA`. Se anota en la bitácora y se avisa.
- El motor ignora los legados a personas inexistentes y avisa. El legado vuelve a la masa (art. 888 CC por analogía). La vivienda vuelve a contar para la reducción.
- Caso del informe: la plusvalía pasa de 3.480 € a 2.175 €.

## D1 · Beneficio de inventario

- El plazo de 30 días corre desde que el heredero que tiene bienes en su poder sabe que es heredero (art. 1014 CC), no desde el fallecimiento.
- Si no los tiene, se aplica el art. 1015. Fuera de esos casos, el art. 1016: mientras no prescriba la acción de petición de herencia.
- El trámite ya no tiene fecha límite (no puede salir vencido en rojo). Solo aparece si hay deudas o avales.
- Texto de los arts. 1010-1016 y 1023 cotejado (transcripción del CC). VERIFICADO.

## D2 · Usufructuaria y deudas

- **Decisión.** El usufructuario no paga el capital de las deudas ni los gastos. Se pagan con bienes de la herencia, y la cuota usufructuaria recae sobre el haber líquido (art. 818 CC). En el usufructo de un patrimonio, el usufructuario solo responde en los casos del art. 643 CC (por remisión del art. 510).
- Las cifras no cambian: su valor económico se reduce en la misma proporción.
- Cambia la etiqueta: «Menor valor de su usufructo por deudas y gastos — no los paga». El cuaderno particional usa la misma redacción.
- Texto de los arts. 510 y 643 citado de memoria profesional: cotejo literal PENDIENTE.

## D3 · Torremolinos

- La OF nº 29 no se pudo leer: el robots.txt municipal la bloquea y las búsquedas no dieron resultado.
- Solo consta que el pleno de 27-01-2022 aprobó una bonificación mortis causa «hasta el 95 %».
- No se inventa un porcentaje: sin dato, la cuota es la máxima posible.
- La norma ahora lo dice («SIN BONIFICACIÓN APLICADA…»). El Diagnóstico avisa en todas las ordenanzas con bonificación a mano no introducida (`bonifPendiente`).
- PENDIENTE: obtener el texto de la ordenanza.

## Errores menores y de presentación

- **M11.** Con una fecha de adquisición posterior al fallecimiento, la plusvalía usa el coeficiente máximo y el método objetivo, sin método real ni no sujeción (cuota máxima). Avisa en el motor y en el Diagnóstico (arts. 104.5 y 107.4 TRLRHL).
- **K2.** La traza guarda la reducción aplicada (`aplicado`). El PDF muestra la cifra aplicada y añade «máximo 1.000.000 €».
- **K3.** La proyección de la segunda herencia muestra la tabla del PDF en euros enteros. «Menor coste» solo aparece si un escenario gana a todos los demás por más de 50 €. Si no, los escenarios se marcan como de «coste equivalente».
