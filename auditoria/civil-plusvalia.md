# Auditoría de corrección · Hereda+ · Civil, partición, plusvalía municipal y plazos

**Fecha:** 10-10-2026 · **Normativa de referencia:** la vigente en octubre de 2026 · **Alcance:** todo salvo la tarifa y las reducciones del Impuesto sobre Sucesiones (ISD), que revisa otro auditor.
**Objeto auditado:** motor `fuente/src/motor.mjs` (v0.4.2; versión del código fuente 1.6), catálogo `fuente/src/tramites.mjs`, partición `fuente/src/app/particion.js`, puente `fuente/src/app/logic.js`, y la app compilada `docs/app/` (que se ha ejecutado sin interfaz).
**Pruebas:** `auditoria/pruebas-civil-plusvalia.mjs`, listas para añadir a `fuente/src/test.mjs`. Hoy fallan 17 de 21: 14 del motor y 3 de partición. Los scripts de los casos están en `share/audit-civil/` (`plusvalia.mjs`, `hacienda.mjs`, `civil.mjs`, `plazos.mjs`, `particion.mjs`, `tz.mjs`).
**No se ha modificado** nada de `fuente/` ni de `docs/`, y no se ha hecho ningún commit.

> **Limitación de método.** En esta sesión `WebFetch` no resolvía ningún dominio y `curl` estaba bloqueado por el proxy, así que no se han podido leer los textos oficiales del BOE, los boletines provinciales ni las sedes municipales. La comprobación externa se ha hecho con `WebSearch`, cuyos resultados resumen páginas oficiales y secundarias. Cada fila indica qué tipo de fuente la respalda. Los hallazgos de tipo legal se apoyan en el texto de artículos del Código Civil y de leyes que no cambian (arts. 5, 756, 761, 929, 983, 986, 1035-1047, 1061-1062 CC; art. 27 LGT; art. 7.2.B TRLITPAJD). Donde no hubo confirmación externa, se dice así: no se adivina ninguna fuente.

---

## 1. Resumen ejecutivo

| Gravedad | N.º | Áreas |
|---|---|---|
| **CRÍTICA** (importe o cuota equivocados) | **3** | Partición (exceso «inevitable» y colación) · legítima de los padres en Eivissa y Formentera |
| **MAYOR** (falta una regla) | **9** | Indignidad · acrecimiento con cuotas numéricas · Reglamento 650/2012 · seguro ganancial · intereses de la prórroga del ISD · liquidación conjunta de gananciales y partición · regímenes económicos forales · TPO del exceso evitable · reducción de las disposiciones inoficiosas |
| **MENOR** | **14** | Cómputo de fechas, coherencia entre plazos y trámites, filas de legítimas, ordenanzas concretas |
| **DESACTUALIZADA** | **1** | Coeficientes forales del IIVTNU (Gipuzkoa, Álava, Bizkaia) |

**Lo que está bien** y se ha comprobado con casos:

**Plusvalía**
- Método objetivo: valor catastral del suelo × coeficiente por años completos, art. 107 TRLRHL.
- Prorrateo por meses completos cuando la tenencia es inferior a un año.
- Método real con la proporción del suelo a la fecha del devengo (art. 107.5) y elección del menor.
- No sujeción cuando hay pérdida (art. 104.5).
- Topes del 30 % de tipo y del 95 % de bonificación (arts. 108.1 y 108.4).
- Cuota del causante en gananciales y proindivisos.
- Tabla de 2026, que vuelve a ser la del RDL 8/2023, y ventana del RDL 16/2025 (del 01-01 al 27-01-2026). Coincide con lo que se sabe de la derogación publicada en el BOE de 28-01-2026.
- Los tipos que comunican a Hacienda las **48 capitales** de régimen común están todos: 46 capitales más Ceuta y Melilla, 0 faltan. Cada capital tiene además ordenanza incorporada.

**Sucesión intestada y legítimas**
- Sucesión intestada del Código Civil: 12 de 13 casos correctos.
- Sucesión intestada foral: 15 casos coherentes con la ley de cada territorio. Hay 1 bloqueo deliberado (Eivissa).
- Legítimas del Código Civil, de Cataluña, Galicia, Mallorca y Menorca, Aragón, País Vasco y Navarra: 17 de 18 casos correctos.

**Plazos y recargos**
- ISD: 6 meses, o 12 con prórroga, de fecha a fecha y con traslado al siguiente día hábil.
- Plusvalía: 6 meses más la prórroga.
- Prescripción.
- Recargo del art. 27 LGT.
- Festivos nacionales de 2026 y 2027.
- El cálculo es estable con cualquier zona horaria (se probó con 5).

**Los diez problemas principales:**
1. **CRÍTICA · Partición, exceso de adjudicación.** Si un heredero se queda dos pisos de 200.000 €, el programa trata los 200.000 € de exceso como «inevitable» (art. 1062 CC) y les pone coste 0 € en Madrid. Es **evitable**, porque el otro heredero podía quedarse un piso, así que tributa por TPO: unos 12.000 € al 6 % y 20.000 € o más en Cataluña.
2. **CRÍTICA · La partición ignora la colación** (arts. 1035 y 1047 CC). Con una donación colacionable de 60.000 € a un hijo, los dos hijos reciben 120.000 €. Lo correcto es 90.000 € y 150.000 €.
3. **CRÍTICA · Eivissa y Formentera:** el motor no da legítima a los padres, pero el art. 79 de la Compilación los hace legitimarios con remisión a los arts. 809 y 810.1 CC. En el caso de prueba la legítima es 0 € en lugar de 150.000 €, y la tabla muestra la etiqueta «Legítima de los padres (1/4)» con estado VERIFICADO.
4. **MAYOR · Intereses de la prórroga del ISD** (art. 69.2 RD 1629/1991). No se suman al total. En el caso de prueba son unos 7.000 €.
5. **MAYOR · Causante residente fuera de España:** se aplican el reparto y las legítimas del Código Civil sin ningún aviso del Reglamento (UE) 650/2012.
6. **MAYOR · Indignidad:** no se puede marcar, y los hijos del indigno no le representan (arts. 756, 761 y 929 CC).
7. **MAYOR · Testamento con cuotas numéricas** (art. 983 CC): la parte renunciada siempre acrece a los demás, cuando debe ir a la sucesión intestada (arts. 912.3.º y 986 CC).
8. **MAYOR · Seguro de vida ganancial con el cónyuge como beneficiario:** se integra el 100 % en la base, y el art. 39.2 RD 1629/1991 manda integrar el 50 %.
9. **MAYOR · Gananciales y partición se calculan por separado.** Al adjudicar la vivienda entera al viudo, el exceso y las compensaciones salen infladas: 140.500 € frente a unos 87.000 € con la liquidación conjunta.
10. **MAYOR · Regímenes económicos:** la comunicación foral vizcaína (art. 127 y ss. de la Ley 5/2015), la participación, el consorcio aragonés y las conquistas navarras se tratan como gananciales o no existen. En la comunicación foral consolidada con hijos comunes, el viudo es dueño de la mitad de **todos** los bienes.

---

## 2. Plusvalía municipal (IIVTNU)

### 2.1 Mecánica legal (`calcularPlusvalia`, motor.mjs:2369)

| # | Caso | Esperado (norma) | Motor | Resultado |
|---|---|---|---|---|
| A-2a | Suelo 50.000 €, 10 años, sin ordenanza | 0,12 × 50.000 × 30 % = 1.800 € (arts. 107.1, 107.4 y 108.1 TRLRHL) | 1.800 € | ✔ |
| 1b | 9 años y 364 días | coeficiente de 9 años: 0,15 | 0,15 | ✔ |
| A-2b | 7 meses completos | 0,15 × 7/12 = 0,0875 (art. 107.4) | 0,0875 | ✔ |
| 2b | 14 días | 0 (ningún mes completo) | 0 | ✔ |
| A-2c | Real: (210.000 − 200.000) × 50 % = 5.000 < 6.000 | base real (art. 107.5) | 5.000, «real» | ✔ |
| A-2d | Adquirido por 220.000, transmitido por 210.000 | no sujeto (art. 104.5) | no sujeto, 0 € | ✔ |
| 5 | Inmueble ganancial (cuota del 50 %) | base 3.000 € | 3.000 € | ✔ |
| 6 | 25 años | 0,40 | 0,40 | ✔ |
| 7 | Fallecimiento el 10-01-2026, 10 años | tabla del RDL 16/2025: 0,16 | 0,16, PENDIENTE | ✔ (con aviso) |
| **A-1** | Adquirido el 29-02-2016, fallecimiento el 28-02-2026 | 10 años (art. 5.1 CC: sin día equivalente, el plazo vence el último del mes): 0,12 | 9 años, 0,15 | **✘ MENOR** |
| 12 | Barrido de las 322 ordenanzas × parentesco × vivienda × suelo | tipo ≤ 30 % y bonificación ≤ 95 % | Sin infracciones, salvo Ceuta y Melilla (97,5 % = 50 % del art. 159 TRLRHL + 95 % sobre el resto) | ✔ (plausible, base del art. 159 no verificada) |
| tz | Mismas fechas en 5 zonas horarias | estable | estable | ✔ |

**Coeficientes de 2026.**
- `COEF_PLUSVALIA_2026` reproduce la tabla del art. 107.4 en la redacción del RDL 8/2023 (0,15 · 0,15 · 0,14 · 0,14 · 0,16 · 0,18 · 0,19 · 0,20 · 0,19 · 0,15 · 0,12 · 0,10 · 0,09 · 0,09 · 0,09 · 0,09 · 0,10 · 0,13 · 0,17 · 0,23 · 0,40).
- Varias fuentes concuerdan en que el Congreso rechazó convalidar el RDL 16/2025 el 27-01-2026 y en que el BOE de 28-01-2026 publicó la derogación. El RDL 2/2026 y el RDL 3/2026 no recuperaron los coeficientes (Cuatrecasas, BOCM de 16-02-2026, OCU).
- La tabla del RDL 16/2025 está bien marcada como PENDIENTE. Solo se ha confirmado su primer valor (0,16 para menos de un año, según Bankinter). La rebaja en los tramos de 19 años o más concuerda con lo que describen las fuentes.

**Las 48 capitales.** `HACIENDA_IIVTNU_2026` contiene las 48 capitales de régimen común y las 100 ciudades de más de 50.000 habitantes. Al cruzar los datos de Hacienda con las ordenanzas incorporadas salen 7 discrepancias de tipo: Alcalá de Henares, D_28113, Ourense, Gijón, Valladolid, Roquetas y El Ejido. Todas tienen el tipo PENDIENTE y el motor aplica el dato de Hacienda, como está diseñado.

### 2.2 Muestra de ordenanzas (17 municipios) frente a fuentes externas

Caso común: heredero hijo, vivienda habitual, suelo de 40.000 €, total de 120.000 €, 20 años de tenencia.

| Municipio | Motor (tipo · bonificación · estado) | Evidencia externa | Veredicto |
|---|---|---|---|
| Madrid | 29 % · 95/85/70/40 % por suelo (60.000/100.000/138.000 €) · P | Guías coinciden en los tramos y en el 29 %; una de 2014 daba 75 % (desfasada) | Coincide (secundaria) |
| Barcelona | 30 % · 95 % vivienda o local · P | Art. 9 OF 1.3: 95 % vivienda habitual a cónyuge, descendientes y ascendientes; convivientes 2 años; mantener 3 años | Coincide |
| València | 29,7 % · 95 % sin requisito de vivienda (desde 2024) · V | Ordenanza en sede.valencia.es: 95 % a descendientes, ascendientes y cónyuge; se suprimieron los tramos | Coincide |
| Sevilla | 26,53 % · tramos por suelo y tope de caudal de 500.000 € · P | 26,53 % y tope de 500.000 € en varias fuentes; umbrales de suelo contradictorios | No confirmable (bien marcado P) |
| Málaga | 29 % · art. 9 de 27-03-2026 (95/80/70/50/25 % para convivientes; 37,5 % para no convivientes) · V | El Español de 26 y 28-03-2026: reforma del art. 9, 37,5 % a no convivientes, 95 % a vulnerables convivientes | Coincide en lo esencial; tramos no confirmados |
| Marbella | 29 % · 95/50/20 % · P | — | No confirmado (marcado P) |
| Zaragoza | 28 % · 95 % vivienda habitual; 65 % otros con suelo ≤ 200.000 € · P | Nota municipal: 95 % también para **segundas viviendas, garajes y trasteros** con valor < 200.000 € (2026) | **Discrepa (MENOR m9):** la segunda vivienda solo llega al 95 % si se ajusta a mano |
| Palma | 18 % · 95 % vivienda habitual · P | Guías dicen 25-30 %, pero el dato de Hacienda (oficial) es 18 % | Coincide con Hacienda |
| Huesca | 0 % desde 01-01-2026 (ordenanza derogada) · V | Pleno municipal: plusvalía suprimida desde 2026 | Coincide |
| Las Palmas G.C. | 30 % · 95 % con suelo ≤ 35.000 €, 75 % hasta 51.000 € · V | Prensa de 2022 y 2024: 95 % hasta 35.000 €, 75 %/50 %/30 %/10 % por tramos | Coincide |
| Alicante | 30 % · 60 % vivienda habitual, hasta segundo grado · V | Preguntas frecuentes municipales: 60 %, padrón de 2 años; ordenanza: hasta segundo grado | Coincide |
| Granada | 30 % · 50 % en cualquier inmueble · V | OF n.º 5 en granada.org: 50 % a descendientes, cónyuge y ascendientes, sin requisito de vivienda | Coincide |
| Vigo | 30 % · 50 % vivienda habitual · V | Sede de Vigo: 50 %, rogada, mantener 4 años | Coincide |
| Oviedo | 20 % · 95 % con suelo ≤ 46.000 €, 60 % ≤ 70.000 € · V | BOPA 2022, OF 404: 95 % ≤ 46.000 €, 60 % intermedio, 0 % > 70.000 € | Coincide (tipo según Hacienda) |
| Córdoba | 27,52 % · 95 % vivienda o local afecto · V | OF 306 (2026), art. 11.2: descendientes, adoptados, cónyuge y ascendientes | **Discrepa (MENOR m10):** el motor usa `DACP` e incluye a la pareja de hecho, que no aparece en el texto citado |
| Santander | 21 % · 95 % con suelo ≤ 70.000 € e ingresos ≤ 2 × IPREM · V | Guías secundarias hablan de suelo ≤ 30.000 € | No confirmable; conviene cotejar |
| Bilbao | 30 % (máximo foral) · bonificación a mano · P | Sin texto oficial | No confirmable (marcado P) |
| Murcia | 30 % · 95 % vivienda o local · P | Guías: 95 % y 30 %; beneficiarios discutidos | Coincide (secundaria) |

IPREM: el motor usa 8.400 € anuales en 14 pagas (600 € al mes). Coincide con el SEPE y con la prórroga de la LPGE de 2023 para 2026. Ojo: las ordenanzas que se refieren al IPREM de 12 pagas (7.200 €) no se distinguen; véase m9b en §8.

### 2.3 Usufructo y nuda propiedad en la plusvalía

`logic.js:203` reparte el inmueble entre herederos en fracciones: pleno dominio, usufructo × (89 − edad) y nuda × (1 − %). Es coherente con el art. 107.2.b TRLRHL, que remite a las normas del ITPAJD, y con el art. 26 de la Ley 29/1987.

Defecto: `num(p.edad) || 40` convierte la edad 0 en 40 (MENOR m14).

---

## 3. Legítimas y reparto

### 3.1 Sucesión intestada (`repartoIntestado`, motor.mjs:380; `repartoLegal`)

| # | Caso | Esperado | Motor | |
|---|---|---|---|---|
| C1 | Viuda + 2 hijos | usufructo de 1/3 para la viuda; cada hijo, 1/3 en pleno dominio + 1/6 en nuda (arts. 834 y 930-932) | igual | ✔ |
| C2 | Viuda + padres | usufructo de 1/2 (art. 837); padres 1/4 + 1/4 | igual | ✔ |
| C3 | Hermano de doble vínculo + medio hermano | 2/3 y 1/3 (art. 949) | igual | ✔ |
| C4 | Hermano + 2 sobrinos de premuerto | 1/2, 1/4 y 1/4 (arts. 927 y 948) | igual | ✔ |
| **C5** | Hijo **indigno** con 2 hijos | los nietos representan (arts. 761 y 929) | el indigno hereda 1/2; no existe el campo | **✘ MAYOR** |
| C6 | Todos los hijos renuncian | nietos por cabezas (art. 923) | 1/3 cada uno | ✔ |
| C7 | Abuelo paterno + 2 abuelos maternos | 1/2, 1/4 y 1/4 (art. 940) | igual | ✔ |
| C8-C12 | Tío y primo · separado de hecho · cónyuge y hermanos · solo sobrinos · padre y abuelo | arts. 954, 945, 944, 927 y 935 | correctos | ✔ |
| F1 | Cataluña: viuda + 2 hijos | usufructo universal (art. 442-3 CCCat) | igual | ✔ |
| F3/F2 | Cataluña: viuda + padre / padres solos | viuda todo / padres por mitad | igual | ✔ |
| F4 | Cataluña: medio hermano | por partes iguales (art. 442-10.1, InDret y Termcat) | igual (marcado PENDIENTE) | ✔ (puede pasar a VERIFICADO) |
| F5 | Galicia: viuda + 2 hijos | usufructo de 1/4 (art. 253 Ley 2/2006) | igual | ✔ |
| F6 | Mallorca: viuda + 2 hijos | usufructo de 1/2 (art. 45) | igual | ✔ |
| F7/F8 | Aragón: viuda + hijos / viuda + padres | viudedad universal (art. 283 CDFA) y nuda a los llamados | igual | ✔ |
| F9-F11 | Navarra: viuda / pareja estable | usufructo de viudedad universal (ley 253); la pareja estable solo si se le atribuyó (ley 113; LF 21/2019) | igual | ✔ (concuerda con BOE-A-2019-8512 y notariosyregistradores) |
| F12/F13 | País Vasco: viuda + hijos / viuda + padres | usufructo de 1/2 (arts. 52 y 114) / viuda todo | igual | ✔ |
| F14 | Eivissa | — | bloqueado con aviso | ✔ (por diseño) |
| F15 | Cataluña con conmutación | 1/4 en propiedad + usufructo de la vivienda (art. 442-5) | aproximación declarada | ✔ (aproximado) |

### 3.2 Legítimas (`calcularLegitimas`, motor.mjs:913)

| # | Caso (base de 300.000 €) | Esperado | Motor | |
|---|---|---|---|---|
| LG1 | 3 hijos, todo a A | B y C: 33.333 € cada uno, lesionados; preterición | igual | ✔ |
| LG2 | 2 hijos, todo a un extraño | 50.000 € cada uno; legítima larga de 200.000 € | igual | ✔ |
| LG3 | Viuda de 70 años sin nada | 100.000 × 19 % = 19.000 € (art. 834; art. 26 Ley 29/1987) | igual | ✔ |
| LG4 | Cataluña, un hijo renuncia | 1/4 × 400.000 / 2 = 50.000 € (el renunciante hace número, art. 451-6) | igual | ✔ |
| LG5 | Galicia | 1/4: 37.500 € cada uno | igual | ✔ |
| LG6 | Mallorca, 5 hijos | 1/2 (art. 42) | igual | ✔ |
| LG7/LG8 | Aragón 1/2 colectiva / País Vasco 1/3 colectiva + usufructo de 1/2 de la viuda | arts. 486 CDFA y 49 y 52 LDCV | igual | ✔ |
| LG9 | Navarra | legítima formal | igual | ✔ |
| LG11 | Padres + viuda | ascendientes 1/3 (art. 809); viuda, usufructo de 1/2 al 29 % = 43.500 € | igual | ✔ |
| **LG12** | Hijo desheredado con 2 hijos | nietos 25.000 € cada uno ✔; mínimo del desheredado si la causa no se prueba = 50.000 € (su estirpe, art. 851) | 33.333 € (= 100.000/(n+1) con la estirpe contada dos veces) | **✘ MENOR** |
| **LG13** | **Eivissa, padres, todo a un extraño** | padres legitimarios (art. 79 Compilación → art. 809 CC): 1/2 = 150.000 € | **0 €**; la etiqueta dice «(1/4)» y el estado VERIFICADO | **✘ CRÍTICA** |
| LG14 | Cataluña, padre único | 1/4 = 75.000 € (art. 451-4) | igual | ✔ |
| LG15 | Viuda sin edad + 1 hijo | se valora como si tuviera 40 años y avisa | igual | ✔ |
| LG16 | Usufructo universal con 2 hijos | aviso cualitativo (arts. 813.2 y 820.3.º; cautela socini) | igual | ✔ |
| LG17 | Vecindad común indicada con residencia en Cataluña | Código Civil | Código Civil | ✔ |
| LG18 | Nieto con progenitor vivo que recibe la mejora | no legitimario | igual | ✔ |

**Reglas que faltan** (detalle en §7):
- Indignidad (MAYOR).
- Cuantificación de la reducción de las disposiciones inoficiosas en el orden del art. 820 (MAYOR).
- Ventana de diez años de las donaciones en Cataluña (art. 451-5 CCCat). El resumen del propio motor la menciona, pero el cálculo suma todas las donaciones (MENOR m7).
- La base de la legítima usa el **valor fiscal**, el mayor entre el valor de referencia y el declarado, no el valor real que piden los arts. 818 y 847 CC (MENOR m11).
- Conmutación de los arts. 839-840 CC: solo se sugiere, no se calcula (MENOR m13).

**Vecindad civil y ley aplicable.**
- `vecindadCivil` supone la vecindad por la residencia y avisa solo si el territorio es foral. Un catalán que vivía en Madrid menos de 10 años (art. 14.5 CC) se calcula en derecho común sin aviso (MENOR m8).
- Con `ccaa: "EST"` (residencia habitual fuera de España) se aplica el Código Civil sin aviso del Reglamento (UE) 650/2012, arts. 21-22 (MAYOR, prueba D-1). El catálogo de trámites (`ley_aplicable`) y los escritos sí lo mencionan, pero el reparto y las legítimas, no.
- El valle de Ayala (art. 89 LDCV) y la troncalidad (arts. 61-70) solo generan notas, que es adecuado.

---

## 4. Usufructo y nuda propiedad: partición frente al ISD

- `pctUsufructoVitalicio` = clamp(89 − edad; 10 %; 70 %) y el temporal, 2 % por año con tope del 70 %. Coincide con el art. 26.a de la Ley 29/1987.
- La misma valoración se usa en el ISD, las legítimas, la partición (`particion.js:15`, `fEco`) y la plusvalía. Si falta la edad, se usa 40 en todos.
- El usufructo se valora siempre con la tabla fiscal. Civilmente, la valoración para partir y compensar es libre (art. 1061 CC: igualdad de lotes) y en la práctica se usan también tablas actuariales. Falta un aviso y la opción de introducir una valoración pactada (observación, sin gravedad).

---

## 5. Sociedad de gananciales

| Aspecto | Motor | Valoración |
|---|---|---|
| Mitad del cónyuge fuera de la herencia (`cuotaCausante` 0,5; arts. 1344 y 1392) | Sí; deudas gananciales al 50 % | ✔ |
| La mitad de los gananciales en el patrimonio preexistente del viudo | Sí (`pp += gananciales/2`) | ✔ |
| **Seguro de vida con prima ganancial y el cónyuge como beneficiario** | 100 % en la base | **✘ MAYOR**: el art. 39.2 RD 1629/1991 integra el 50 % (prueba E-1) |
| **Liquidación de gananciales y partición en un mismo cálculo** | La partición solo trata la mitad del causante | **✘ MAYOR**: en el caso P4 (vivienda ganancial de 300.000 € + 100.000 € en cuenta, viuda de 70 años y 2 hijos), adjudicar la vivienda a la viuda da un exceso de 140.500 €. Con la liquidación conjunta, su haber es 200.000 € de gananciales + 12.667 € de usufructo, y el exceso real es de 87.333 € |
| Bienes privativos y mixtos, reembolsos (arts. 1354, 1357.2, 1358 y 1364), atribución preferente (arts. 1406-1407) | No modelados | MAYOR (se agrupan en la ficha 7.7) |
| **Otros regímenes** | El lector de documentos convierte «participación», «comunidad», «conquistas» y «consorcial» en `gananciales` (`lector.js:1048` y `:1174`). No existe la comunicación foral | **✘ MAYOR**: en la comunicación foral vizcaína consolidada con hijos comunes, el viudo es dueño de la mitad de todos los bienes, también de los privativos (art. 127 y ss. LDCV). En la participación no hay copropiedad, sino un crédito de participación (arts. 1411 y ss. CC) |

---

## 6. Partición (`fuente/src/app/particion.js`)

Casos ejecutados en la app compilada (`share/audit-civil/particion.mjs`):

| # | Caso | Esperado | App | |
|---|---|---|---|---|
| **P1** | 2 pisos de 200.000 € a Ana; Blas sin nada (MAD, AND, CAT, VAL) | Exceso de 200.000 € **evitable**: el art. 1061 permite lotes iguales, así que no se da el art. 1062.1 y tributa por TPO (art. 7.2.B TRLITPAJD). Madrid: 12.000 € | inevitable 200.000 €, evitable 0; coste 0 € (MAD), 2.400 € de AJD (AND), nada en CAT y VAL | **✘ CRÍTICA** |
| P2 | Piso de 300.000 € + 100.000 € en cuenta; piso a Ana (AND) | inevitable 100.000 € (AJD del 1,2 % en Andalucía); 50.000 € evitables | 100.000 / 50.000 | ✔ |
| P3 | Coche adjudicado entero | exceso evitable | evitable 15.000 € | ✔ (lo tasa al 6 % de inmuebles por la composición del lote: aproximación) |
| **P4** | Vivienda ganancial a la viuda | véase §5 | 140.500 € | **✘ MAYOR** |
| **P5** | Donación colacionable de 60.000 € a Ana; caudal de 240.000 € | Ana 90.000 € y Blas 150.000 € (arts. 1035 y 1047) | 120.000 € y 120.000 € | **✘ CRÍTICA** |

Tratamiento fiscal del exceso:
- **Andalucía, AJD del 1,2 %:** coincide con la STSJ de Andalucía 895/2026, de 15-04-2026, según resumen de fiscal-impuestos.com.
- **Madrid, no sujeto:** coincide con la STSJ de Madrid de 30-09-2024 (rec. 996/2022).
- **Resto de comunidades:** el AJD queda pendiente y no se suma. Conviene avisar de la STS 1502/2019 (AJD en el exceso inevitable de la liquidación de gananciales) y de la práctica administrativa.
- **TPO del exceso evitable:** se aplica un 6 % por defecto. Las fuentes dan el 10-13 % en Cataluña y el 9-11 % en la Comunitat Valenciana (MAYOR).
- Falta advertir que el exceso evitable también es una transmisión onerosa sujeta a la plusvalía de quien cede (MENOR m12).

---

## 7. Fichas de corrección (CRÍTICAS y MAYORES)

**7.1 · CRÍTICA · Exceso inevitable (`particion.js`, `cuadroParticion`, línea 111).**
- Hoy: `inevitable = min(exceso, vIndiv − cargas − haber)`, con `vIndiv` igual a la suma de **todos** los bienes no líquidos adjudicados enteros.
- Corrección: el exceso inevitable de un heredero no puede superar lo que el bien indivisible de **mayor valor** que se le adjudica rebasa su haber: `inevitable = min(exceso, max(0, max_q(v_q) − (haber − cargas)))`. Los demás bienes podían ir a otros lotes.
- Si hay un único bien indivisible, el resultado no cambia.
- Añadir una marca manual «indivisible por acuerdo o pericial» para los casos de art. 1062 que el programa no puede ver.
- Prueba: P-1.

**7.2 · CRÍTICA · Colación (`particion.js`, `particion`, líneas 15-60).**
- Masa colacionable `M = netoReparto + Σ colacionables` de los legitimarios que concurren y no tienen dispensa (arts. 1035-1036).
- `haber_i = share_i · M − colacionable_i`.
- Si `haber_i < 0`, poner 0 y repartir el defecto entre los demás en proporción. El donatario no devuelve, salvo inoficiosidad (art. 1045 y ss.).
- La colación se hace por el valor al tiempo de la partición (art. 1045).
- Campos nuevos: `dispensaColacion` y la fecha de la donación.
- No aplicar la colación si el donatario renuncia (art. 1036).
- Prueba: P-2.

**7.3 · CRÍTICA · Eivissa y Formentera (`motor.mjs`, `calcularLegitimas`, rama `BAL`, línea 1094).**
- Hoy: `f = … asc.length && !eivissa ? 1/4 : 0`.
- Corrección: si `eivissa && !hayDesc && asc.length`, `f = 1/2` (art. 79 Compilación → art. 809 CC), repartida según el art. 810.1 (los dos padres por mitad, o todo el que sobreviva).
- Con cónyuge, la remisión al 1/3 del art. 809 es dudosa porque el viudo no es legitimario en Eivissa. Marcarlo como PENDIENTE y mostrar 1/2.
- Corregir la etiqueta «(1/4)» y el `estado`.
- Prueba: B-1.

**7.4 · MAYOR · Indignidad (`repartoIntestado` → `representantes`, línea 399; `calcularLegitimas` → `estirpes`).**
- Campo `indigno` en la persona. El indigno no hereda (art. 756) y su estirpe la representan sus descendientes (arts. 761 y 929), tanto en la intestada como en la legítima.
- Aviso: hace falta declaración judicial o reconocimiento.
- Prueba: C-1.

**7.5 · MAYOR · Acrecimiento (`repartoPorcentajes`, línea 521).**
- Opción `acrecer`: por defecto `false` cuando las cuotas son distintas. Cuando son iguales, preguntar si el testamento dice «por partes iguales» (art. 983.2).
- Sin acrecimiento, devolver `vacante` y repartirla con `repartoLegal` entre los herederos intestados (arts. 912.3.º y 986), combinándola con `combinarDerechos`.
- Si quien renuncia es legitimario, su legítima va a los colegitimarios por derecho propio (art. 985.2).
- Prueba: C-2.

**7.6 · MAYOR · Reglamento 650/2012 (`calcularISD` y `calcularLegitimas`).**
- Si `ccaa === "EST"`, o la persona tiene nacionalidad extranjera y residencia fuera de España, emitir un aviso bloqueante de ley aplicable (arts. 21, 22 y 36 del Reglamento).
- Poner las legítimas en estado «no verificable».
- Prueba: D-1.

**7.7 · MAYOR · Gananciales.**
- (a) Seguro con prima ganancial y el cónyuge como beneficiario: base al 50 % (art. 39.2 RISD). Campo `seguros[].ganancial` en `calcularISD`, en el bloque `seguros` (línea 1286), y su alimentación en `logic.js`. Prueba: E-1.
- (b) Partición conjunta: para el viudo en gananciales, incluir en la masa partible los bienes gananciales por su valor total y sumar a su haber la mitad del haber ganancial neto. Medir el exceso de forma global e indicar que el exceso de la liquidación de gananciales sigue la STS 1502/2019.
- (c) Regímenes: valores `participacion`, `comunicacion_foral`, `consorcial_aragon` y `conquistas_navarra`, con aviso o bloqueo.
- (d) Comunicación foral consolidada: `cuotaCausante = 0,5` para todos los bienes.
- (e) Arts. 1354, 1357.2 y 1358: titularidad «mixta» con porcentajes privativo y ganancial.

**7.8 · MAYOR · Intereses de la prórroga (`calcularISD`, línea 1417).**
- Si `prorrogaISD` y `fechaReferencia > limite6`: `interesesProrroga = total × INTERES_DEMORA × días(limite6 → min(fechaReferencia, limite12)) / 365`.
- Sumarlo a `totalConRecargo` y al trámite `isd` (art. 69.2 RD 1629/1991).
- Prueba: F-1.

**7.9 · MAYOR · TPO del exceso evitable (`particion.js`, `cpTipos`, línea 79).**
- No usar un 6 % genérico.
- Mientras no exista una tabla verificada por comunidad, mostrar el coste del exceso evitable como «mínimo» con el tipo máximo conocido, o dejarlo fuera de `coste` con un aviso.

**7.10 · MAYOR · Reducción de las disposiciones inoficiosas (`calcularLegitimas`).**
- Calcular cuánto hay que reducir de cada disposición, en el orden de los arts. 817 y 820:
  1. legados e institución, a prorrata (art. 820.2);
  2. donaciones, desde la más reciente (art. 820.1).
- Mostrar el importe que corresponde a cada beneficiario.

---

## 8. Hallazgos MENORES y DESACTUALIZADOS

| Id | Hallazgo | Corrección (archivo y función) |
|---|---|---|
| m1 | Años completos con fecha de inicio el 29 de febrero (A-1) | `aniosCompletos` (motor.mjs:2183): si el día no existe en el mes final, usar el último día del mes (art. 5.1 CC). Aplicar lo mismo a `mesesCompletos` |
| m2 | Mínimo del desheredado = base/(n+1) con su estirpe contada dos veces (LG12) | `filasDesc` (línea 982): si el desheredado tiene estirpe representada, su mínimo es el de la estirpe; si no, `fracTotal·base/(n+1)` |
| m3 | Exactamente 12 meses completos de retraso → 15 % | `recargoArt27`: con `m === 12` y la presentación el último día de los 12 meses, 13 % (art. 27.2 LGT: «más de 12 meses»). Es cuestión de interpretación; prueba F-2 |
| m4 | Últimas voluntades: «desde» el 15.º día hábil | `calcularPlazos` y `tramites.mjs` (`ultimas`, `seguros_cert`): `sumarHabiles(f, 15)` + 1 día hábil, porque la sede exige que hayan *transcurrido* 15 días hábiles (F-3) |
| m5 | Baja del autónomo: 3 días en `calcularPlazos` (P) y 6 en el catálogo (V, «RD 643/2026») | Unificar; el «RD 643/2026» no se ha localizado y su estado VERIFICADO no se sostiene (F-4a) |
| m6 | La transferencia en la DGT se calcula a 90 días del fallecimiento en `calcularPlazos`; el catálogo dice que cuenta desde la adjudicación | Usar un solo criterio: `dgt` sin fecha fija y `dgt_custodia` a 90 días (F-4b) |
| m7 | Cataluña: se suman todas las donaciones | Filtrar las de los 10 años anteriores, salvo las imputables a la legítima (art. 451-5 CCCat; el resumen del motor ya lo dice) |
| m8 | La vecindad supuesta solo avisa si la residencia está en territorio foral | `calcularISD` (línea 1377): avisar también si la residencia es de derecho común y la vecindad está supuesta (arts. 14.5 y 16 CC) |
| m9 | Zaragoza: el 95 % para segunda vivienda, garaje y trastero (< 200.000 €) no es automático | `ORDENANZAS.ZARAGOZA` (línea 1864): distinguir vivienda, garaje y trastero del resto (65 %) |
| m9b | IPREM: 14 pagas para todas las ordenanzas | Comprobar si cada ordenanza (Málaga, Antequera, Santander, Pontevedra, A Coruña) usa 12 o 14 pagas |
| m10 | Córdoba: la pareja de hecho tiene bonificación (`DACP`) | `ORDENANZAS.CORDOBA` (línea 1626): `DAC` salvo que el texto la incluya |
| m11 | Legítimas con valor fiscal | Valor real a la fecha de la muerte (arts. 818 y 847 CC): campo «valor civil» opcional |
| m12 | El exceso evitable no genera plusvalía de quien cede | Aviso en `cuadroParticion` |
| m13 | Conmutación (arts. 839-840 CC) solo sugerida | Calculadora del capital o lote equivalente con el valor del usufructo |
| m14 | `num(p.edad) \|\| 40` convierte la edad 0 en 40 | `logic.js:203`: usar `edadNum(p.edad) ?? 40` |
| D1 | **DESACTUALIZADA.** Coeficientes forales del IIVTNU: Gipuzkoa con la tabla de 2024, Álava con la de 2023, Bizkaia con una envolvente de 2024 y el RDL 16/2025 | Cotejar las NF de 2025 y 2026 (el motor ya lo declara PENDIENTE). El exceso es prudente, salvo que una tabla nueva supere a la envolvente |

---

## 9. Marcas PENDIENTE (inventario)

| Área | Marcas | Lo más relevante |
|---|---|---|
| Reparto y legítimas (motor, líneas 380-1145) | 46 | Art. 451-4 CCCat; arts. 490-515 CDFA; leyes 253 y 268-271 de Navarra; arts. 46-51 y 79-81 de la Compilación balear; arts. 56-60 LDCV; remisión del art. 267 Ley 2/2006 |
| Plusvalía (líneas 1435-2482) | 186 | Tabla del RDL 16/2025; NAV, BIZ, GIP y ALA (coeficientes y tipos); 131 de las 323 ordenanzas tienen el tipo PENDIENTE; 75 de las 212 ordenanzas de datos están pendientes y 23 tienen la bonificación desconocida |
| Plazos (líneas 2482-2621) | 22 | Plazos forales del ISD; recargos de NAV, ALA y BIZ; festivos de 2027 y autonómicos o locales; campaña del IRPF; baja SS; viudedad; DGT |
| Trámites | 113 de 183 TP | Ver m5 y m6 |

Marcas que pueden pasar a VERIFICADO con fuentes concordantes:
- Cataluña: medio hermanos por partes iguales (art. 442-10.1).
- Navarra: la pareja estable sin usufructo de viudedad salvo que se le atribuyera (ley 253 en relación con la ley 113, LF 21/2019).

---

## 10. Plazos y recargos: comprobación

| Plazo | Norma | Motor | |
|---|---|---|---|
| ISD 6 meses / 12 con prórroga, de fecha a fecha y día hábil (31-08-2026 → 01-03-2027) | arts. 67.1.a y 68 RISD; art. 30.5 Ley 39/2015 | ✔ | ✔ |
| Pedir la prórroga en los 5 primeros meses | art. 68 RISD | ✔ | ✔ |
| Plusvalía: 6 meses, prorrogables hasta un año | art. 110.2.b TRLRHL | ✔ | ✔ |
| Prescripción: 4 años desde el fin del plazo (o del plazo prorrogado) | arts. 66-67 LGT | ✔ | ✔ |
| IRPF del fallecido: campaña del año siguiente (hasta el 30-06) | art. 97 LIRPF | ✔ (fechas aproximadas) | ✔ |
| Recargo del 1 % + 1 % por mes completo / 15 % + intereses / reducción del 25 % | art. 27.2 y 27.5 LGT | ✔ (salvo el día límite, m3) | ✔ |
| Interés de demora de 2026: 4,0625 % | LPGE 2023 prorrogada | ✔ | ✔ |
| Testamento cerrado: 10 días · ológrafo: 5 años · ante testigos: 3 meses · subrogación del arrendamiento: 3 meses (vivienda) y 2 meses (local) · rendición de cuentas de la curatela: 3 meses · pago de la legítima en metálico: 1 año más 1 · beneficio de inventario: 30 días | arts. 712, 689, 703 y 292 CC; arts. 16 y 33 LAU; arts. 844 y 1014 CC | ✔ | ✔ |
| Seguros de vida, auxilio por defunción: 5 años · viudedad: 3 meses de retroactividad | art. 23 LCS; LGSS | ✔ | ✔ |
| Últimas voluntades | sede del Ministerio de Justicia | 1 día antes | m4 |
| **Intereses de la prórroga** | art. 69.2 RISD | no se calculan | 7.8 |

---

## 11. Fuentes consultadas (vía búsqueda web)

**Coeficientes de la plusvalía**
- [Cuatrecasas sobre el RDL 2/2026](https://www.cuatrecasas.com/resources/rdl-2-2026-vuelven-medidas-fiscales-aprobadas-en-2025-txt-698381e0525af014230820.pdf)
- [BOCM 16-02-2026](https://bocm.es/boletin/CM_Orden_BOCM/2026/02/16/BOCM-20260216-71.PDF)
- [OCU](https://www.ocu.org/fincas-y-casas/compraventa/fiscalidad/analisis/2026/01/cambios-coeficientes-plusvalia-2026)
- [Garrigues sobre el RDL 16/2025](https://www.garrigues.com/es_ES/noticia/estas-son-medidas-aprobadas-real-decreto-ley-162025-irpf-impuesto-sociedades-plusvalia)
- [Bankinter](https://www.bankinter.com/blog/finanzas-personales/plusvalia-municipal)

**Ordenanzas**
- [Barcelona OF 1.3](https://ajuntament.barcelona.cat/hisenda/sites/default/files/normativa/2025-05/1.3-iivtnu-plusvalia.pdf)
- [València OF 1.3](https://sede.valencia.es/sede/descarga/doc/DOCUMENT_1_20250007835054)
- [Huesca](https://www.huesca.es/w/el-pleno-del-ayuntamiento-de-huesca-aprueba-las-ordenanzas-fiscales-de-2026)
- [Zaragoza](https://www.zaragoza.es/sede/servicio/noticia/344390)
- [Málaga (El Español)](https://www.elespanol.com/malaga/economia/20260328/entrado-vigor-bonificacion-plusvalia-heredar-vivienda-habitual-trt/1003744186522_0.html)
- [Alicante](https://www.alicante.es/es/contenidos/plusvalia-municipal-preguntas-mas-frecuentes-plusvalia)
- [Granada OF 5](https://www.granada.org/inet/wgr.nsf/wwafs/plusvalia)
- [Vigo](https://sede.vigo.org/expedientes/tramites/tramite.jsp?id_tramite=221&lang=es)
- [Córdoba OF 306 (2026)](https://www.cordoba.es/sites/default/files/PDF/Ayuntamiento/ordenanzas_bandos_y_otros/ordenanzas-y-beneficios-fiscales/ordenanzas/2026/O306-25.pdf)
- [Las Palmas G.C.](https://www.laspalmasgc.es/es/ayuntamiento/prensa-y-comunicacion/notas-de-prensa/nota-de-prensa/El-Ayuntamiento-aprueba-la-modificacion-de-la-ordenanza-que-contempla-bonificaciones-del-95-en-la-Plusvalia-a-los-herederos-de-una-vivienda/)
- [Oviedo (BOPA)](https://miprincipado.asturias.es/bopa/disposiciones)
- [Palma](https://seuelectronica.palma.cat/-/plusval%C3%ADa.01-ivtnu-municipio-de-palma-informaci%C3%B3n-y-c%C3%A1lculo-del-impuesto)

**Derecho civil**
- [Ley Foral 21/2019 (BOE)](https://www.boe.es/buscar/doc.php?id=BOE-A-2019-8512)
- [Resumen de la reforma de 2019 del Fuero Nuevo](https://www.notariosyregistradores.com/web/cuadros/forales/resumen-de-la-reforma-2019-de-la-compilacion-de-navarra/)
- [InDret: sucesión intestada catalana](https://indret.com/pdf/974.pdf)
- [Compilación balear, art. 79 (El Derecho)](https://elderecho.com/decreto-legislativo-791990-6-septiembre-se-aprueba-texto-refundido-la-compilacion-derecho-civil-baleares)
- [Reforma de 2017 de la Compilación balear](https://www.notariosyregistradores.com/web/normas/concretas/resumen-de-la-reforma-2017-de-la-compilacion-de-baleares/)
- [Comunicación foral vizcaína (vLex)](https://vlex.es/vid/vizcaya-alava-regimen-comunicacion-583748850)

**Fiscalidad y plazos**
- [Art. 39 RISD (papelea)](https://papelea.com/es/leyes/reglamento-del-impuesto-sobre-sucesiones-y-donaciones/titulo-i_capitulo-iv_seccion-cuarta-normas-especiales-en-materia-de-seguros)
- [Excesos de adjudicación y AJD (fiscal-impuestos)](https://www.fiscal-impuestos.com/excesos-adjudicacion-particion-herencia-inevitables-no-AJD)
- [TPO por comunidad autónoma (gibobs)](https://www.gibobs.com/blog/itp-2026/)
- [IPREM (SEPE)](https://www.sepe.es/HomeSepe/prestaciones-desempleo/Cuantias-anuales.html)
- [Últimas voluntades (taxdown)](https://taxdown.es/informacion-impuestos/ultimas-voluntades)
