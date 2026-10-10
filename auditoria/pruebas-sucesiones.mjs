// Pruebas de la auditoría del Impuesto sobre Sucesiones (10-10-2026) · node auditoria/pruebas-sucesiones.mjs (desde la raíz del repositorio)
// Estilo de fuente/src/test.mjs: eq(nombre, obtenido, esperado, tolerancia) y si(nombre, condición).
// Sección R: regresiones que HOY PASAN y fijan cifras cotejadas (conviene añadirlas a test.mjs para que no se rompan).
// Sección D: discrepancias confirmadas. Cada prueba lleva el valor que exige la norma citada; con el motor v0.4.2 (fuente 1.6 / publicado 1.7) FALLAN.
// Campos nuevos que proponen las correcciones (ver auditoria/sucesiones.md, «Especificaciones de corrección»):
//   heredero.discapacidadPsiquica (bool) · relación "cunado" · export interesProrrogaISD(cuota, fechaFallecimiento).
import * as M from "../fuente/src/motor.mjs";
const { calcularISD, plazoPresentacionISD, RELACIONES } = M;

let ok = 0, ko = 0;
const eq = (n, got, exp, tol = 0.02) => { const p = Math.abs(got - exp) <= tol; p ? ok++ : ko++; if (!p || process.env.V) console.log(`${p ? "✔" : "✘"} ${n}: ${got} (esperado ${exp})`); };
const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
// Un solo heredero que lo recibe todo, en metálico, sin ajuar; devengo 15-09-2026
const uno = (ccaa, h, importe, x = {}) => calcularISD({
  fechaFallecimiento: x.fecha || "2026-09-15", ccaa, ajuar: "ninguno", reparto: "porcentajes", enPlazo: true,
  bienes: x.bienes || [{ id: "c", tipo: "cuenta", valor: importe }], seguros: x.seguros || [], deudas: [], gastos: [],
  herederos: [{ id: "h", nombre: "H", pct: 100, ...h }],
}).herederos[0];

// ══ R · Regresiones (pasan hoy) ══
// R-1 · Estado: art. 21 (tarifa) y art. 20.2.a (15.956,87 €). Hijo 30 a., 300.000 €: BL 284.043,13 → 40.011,04 + 44.654,00 × 25,50 % = 51.397,81
eq("R-1 · EST hijo 30 a. 300.000 €", uno("EST", { relacion: "hijo", edad: 30 }, 300000).aIngresar, 51397.81);
// R-2 · art. 22.2 Ley 29/1987 (regla de salto): hermano con patrimonio previo 402.700 €, 100.000 €: CI 11.124,41 × 1,5882 + 21,89 = 17.689,68 (no × 1,6676)
eq("R-2 · EST salto de tramo del coeficiente", uno("EST", { relacion: "hermano", edad: 50, patrimonioPreexistente: 402700 }, 100000).aIngresar, 17689.68);
// R-3 · art. 26.a Ley 29/1987: usufructo vitalicio 89 − edad, entre 10 % y 70 % (60 a. → 29 %; 74 a. → 15 %; 85 a. → 10 %; 19 a. → 70 %)
for (const [e, p] of [[60, 0.29], [74, 0.15], [85, 0.10], [19, 0.70], [20, 0.69]]) eq(`R-3 · usufructo vitalicio ${e} años`, M.pctUsufructoVitalicio(e), p, 1e-9);
// R-4 · Grupo I: 15.956,87 + 3.990,72 × 6 = 39.901,19 (15 años) y tope de 47.858,59 (2 años)
eq("R-4 · EST hijo 15 a. 100.000 €", uno("EST", { relacion: "hijo", edad: 15 }, 100000).aIngresar, 6272.07);
eq("R-4 · EST hijo 2 a. 100.000 € (tope 47.858,59)", uno("EST", { relacion: "hijo", edad: 2 }, 100000).aIngresar, 5221.96);
// R-5 · Cataluña, coeficientes de la ATC (0-500.000 / -2.000.000 / -4.000.000 / más: I-II 1 · 1,1 · 1,15 · 1,2; III 1,5882 y IV 2 en todos los tramos)
eq("R-5 · CAT hijo 30 a., patrimonio previo 600.000 €, 600.000 €", uno("CAT", { relacion: "hijo", edad: 30, patrimonioPreexistente: 600000 }, 600000).aIngresar, 45289.53);
eq("R-5 · CAT hermano, patrimonio previo 5.000.000 €, 200.000 € (1,5882 fijo)", uno("CAT", { relacion: "hermano", edad: 50, patrimonioPreexistente: 5e6 }, 200000).aIngresar, 34368.65);
// R-6 · Murcia, tarifa propia (31,75 % y 36,50 % en los dos últimos tramos; instrucciones del 650 de la CARM) y 99 % grupos I-II
eq("R-6 · MUR hermano 1.000.000 €", uno("MUR", { relacion: "hermano", edad: 50 }, 1000000).aIngresar, 441903.52);
eq("R-6 · MUR hijo 1.500.000 €", uno("MUR", { relacion: "hijo", edad: 30 }, 1500000).aIngresar, 4578.35);
// R-7 · Andalucía: tarifa del art. 37 Ley 5/2021 y coeficientes fijos 1,5 (III) y 1,9 (IV) del art. 38 (BOE)
eq("R-7 · AND extraño 200.000 €", uno("AND", { relacion: "extrano", edad: 50 }, 200000).aIngresar, 60078);
// R-8 · Castilla-La Mancha, art. 17 Ley 8/2013: 100 % con base liquidable < 175.000 €, 95 % desde 175.000 €
eq("R-8 · CLM BL 174.999,99 → 100 %", uno("CLM", { relacion: "hijo", edad: 30 }, 174999.99 + 15956.87).aIngresar, 0);
eq("R-8 · CLM BL 175.000 → 95 %", uno("CLM", { relacion: "hijo", edad: 30 }, 175000 + 15956.87).aIngresar, 1316.42);
// R-9 · Galicia: grupo III 25.000 € (Ley 5/2024)
eq("R-9 · GAL hermano 100.000 €", uno("GAL", { relacion: "hermano", edad: 50 }, 100000).aIngresar, 13371.6);
// R-10 · Ceuta y Melilla, art. 23 bis Ley 29/1987: 50 % fuera de los grupos I-II
eq("R-10 · CEU sobrino 100.000 €", uno("CEU", { relacion: "sobrino", edad: 50 }, 100000).aIngresar, 8833.89);

// ══ D · Discrepancias confirmadas (hoy fallan) ══
// D-1 (CRÍTICA) · Cantabria: art. 5 D. Leg. 62/2008 equipara a los cónyuges las parejas de hecho inscritas (Ley de Cantabria 1/2005, o registros análogos)
// → grupo II: BI 300.000 − 50.000 = 250.000; bonificación del 100 % (art. 8.1) → 0 €. Hoy: grupo IV, × 2, 110.933,62 €.
{ const h = uno("CANT", { relacion: "pareja_hecho", inscrita: true, edad: 50 }, 300000); si("D-1 · CANT pareja de hecho inscrita en el grupo II", h.grupo === "II"); eq("D-1 · CANT pareja de hecho inscrita 300.000 €", h.aIngresar, 0); }
// D-2 (CRÍTICA) · La Rioja: Ley 10/2017 asimila a los cónyuges las parejas de hecho (convivencia estable de 2 años; desde 01-01-2025 también inscritas en otros registros)
// → grupo II: BL 284.043,13 → 51.397,81 × 1 % = 513,98 €. Hoy: grupo IV, 110.933,62 €.
{ const h = uno("RIO", { relacion: "pareja_hecho", inscrita: true, edad: 50 }, 300000); si("D-2 · RIO pareja de hecho en el grupo II", h.grupo === "II"); eq("D-2 · RIO pareja de hecho 300.000 €", h.aIngresar, 513.98); }
// D-3 (CRÍTICA) · Illes Balears: coeficientes propios de sucesiones del D. Leg. 1/2014 (BOE-A-2014-6925; ATIB; instrucciones del 654):
// tramos 0-400.000 / 400.000-2.000.000 / 2.000.000-4.000.000 / más; grupo III consanguinidad 1,2706 / 1,3341 / 1,3977 / 1,5247; grupo IV 1,7000 / 1,7850 / 1,8700 / 2,0400.
// Hermano 200.000 €: BL 192.000 → CI 29.920 × 1,2706 = 38.016,35 − 60 % = 15.206,54 (hoy 19.007,58 con 1,5882)
eq("D-3 · BAL hermano 200.000 €", uno("BAL", { relacion: "hermano", edad: 50 }, 200000).aIngresar, 15206.54);
// Extraño 200.000 €: BL 199.000 → CI 31.407,50 × 1,70 = 53.392,75 (hoy 62.815,00 con 2,0)
eq("D-3 · BAL extraño 200.000 €", uno("BAL", { relacion: "extrano", edad: 40 }, 200000).aIngresar, 53392.75);
// Extraño con patrimonio previo de 5.000.000 €: 31.407,50 × 2,04 = 64.071,30 (hoy 75.378,00 con 2,4)
eq("D-3 · BAL extraño, patrimonio previo 5.000.000 €", uno("BAL", { relacion: "extrano", edad: 40, patrimonioPreexistente: 5e6 }, 200000).aIngresar, 64071.3);
// D-4 (CRÍTICA, poco frecuente) · Gipuzkoa NF 2/2022: los colaterales de 2.º y 3.er grado por AFINIDAD están en el grupo III (8.075 €), no en el II
{ const h = uno("GIP", { relacion: "sobrino_afin", edad: 40 }, 200000); si("D-4 · GIP sobrino político en el grupo III", h.grupo === "III"); }
// D-5 (CRÍTICA, poco frecuente) · Bizkaia NF 4/2015 art. 43: el grupo III es colaterales de 3.er grado por consanguinidad y ascendientes/descendientes por afinidad;
// el sobrino o tío político (colateral por afinidad) va al grupo IV (sin reducción)
{ const h = uno("BIZ", { relacion: "sobrino_afin", edad: 40 }, 200000); si("D-5 · BIZ sobrino político en el grupo IV", h.grupo === "IV"); }
// D-6 (CRÍTICA, importe pequeño) · Asturias, mejora de la vivienda habitual: 99/98/97/96/95 % con umbrales 90.151,82 / 120.202,42 / 150.253,03 / 180.303,63 €
// Vivienda de 200.000 € → 95 % (hoy 96 %). Hijo 30 a. con 300.000 € + vivienda: BL 500.000 − 300.000 − 190.000 = 10.000 → 21,25 % = 2.125 € (hoy 1.700 €).
// (Si se confirma que rige además el límite de 122.606,47 € por sujeto pasivo, el importe correcto sería mayor: ver el informe.)
eq("D-6 · AST vivienda 200.000 € al 95 %", uno("AST", { relacion: "hijo", edad: 30 }, 0, { bienes: [{ id: "c", tipo: "cuenta", valor: 300000 }, { id: "v", tipo: "inmueble", esViviendaHabitual: true, valor: 200000 }] }).aIngresar, 2125);
// D-7 (MAYOR) · Comunitat Valenciana: discapacidad PSÍQUICA desde el 33 % → 240.000 € (como la física o sensorial desde el 65 %). Hermano 200.000 € → 0 € (hoy 9.553,26 €)
eq("D-7 · VAL hermano con discapacidad psíquica del 33 %", uno("VAL", { relacion: "hermano", edad: 50, discapacidad: 33, discapacidadPsiquica: true }, 200000).aIngresar, 0);
// D-8 (MAYOR) · Cuñados: colaterales de 2.º grado por afinidad → grupo III (STS 18-03-2003; en Galicia la Xunta los incluye en los 25.000 €). Falta la relación.
// EST 100.000 €: BL 92.006,54 → 11.124,41 × 1,5882 = 17.667,79 (con «extraño», 24.830,72)
si("D-8 · existe la relación cuñado/a", !!(RELACIONES && RELACIONES.cunado));
if (RELACIONES && RELACIONES.cunado) eq("D-8 · EST cuñado 100.000 €", uno("EST", { relacion: "cunado", edad: 50 }, 100000).aIngresar, 17667.79);
// D-9 (MAYOR) · Prórroga del plazo (art. 68 RD 1629/1991): devenga interés de demora por el tiempo de la prórroga (4,0625 % en 2026).
// Fallecimiento 15-01-2026, cuota 20.000 €: 15-07-2026 → 15-01-2027 = 184 días → 20.000 × 4,0625 % × 184 / 365 = 409,59 €
si("D-9 · existe interesProrrogaISD", typeof M.interesProrrogaISD === "function");
if (typeof M.interesProrrogaISD === "function") eq("D-9 · interés de la prórroga", M.interesProrrogaISD(20000, "2026-01-15").importe, 409.59);
// D-10 (MAYOR) · Aragón: reducción del 100 % para hijos menores de edad hasta 3.000.000 € (Ministerio de Hacienda, «Tributación autonómica 2026», cap. I).
// Hijo de 10 años, 2.000.000 € → 0 € (hoy 4.381,23 € con el tope general de 500.000 €)
eq("D-10 · ARA hijo menor 2.000.000 €", uno("ARA", { relacion: "hijo", edad: 10 }, 2000000).aIngresar, 0);

void plazoPresentacionISD;
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
