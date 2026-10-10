// Pruebas de la auditoría civil-plusvalía (10-10-2026) · node auditoria/pruebas-civil-plusvalia.mjs (desde la raíz del repositorio)
// Cada prueba codifica el resultado que exige la norma citada; con el motor v0.4.2 (fuente 1.6) FALLAN las marcadas «hoy falla».
// Estilo de fuente/src/test.mjs: eq(nombre, obtenido, esperado, tolerancia) y si(nombre, condición). Para añadirlas a test.mjs basta copiar
// cada bloque (los imports ya existen allí salvo repartoPorcentajes y tramitesDe, que se importan igual).
// Sección P (partición) necesita el navegador: PW=1 node auditoria/pruebas-civil-plusvalia.mjs, con el servidor estático de docs/ en :8765.
import { calcularPlusvalia, calcularLegitimas, calcularISD, repartoIntestado, repartoPorcentajes, recargoArt27, calcularPlazos, sumarHabiles } from "../fuente/src/motor.mjs";
import { tramitesDe } from "../fuente/src/tramites.mjs";

let ok = 0, ko = 0;
const eq = (n, got, exp, tol = 0.02) => { const p = Math.abs(got - exp) <= tol; p ? ok++ : ko++; if (!p || process.env.V) console.log(`${p ? "✔" : "✘"} ${n}: ${got} (esperado ${exp})`); };
const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
const H = (id, relacion, x = {}) => ({ id, nombre: id, relacion, ...x });

// ── A · Plusvalía (IIVTNU)
// A-1 (MENOR, hoy falla): años completos de fecha a fecha con vencimiento en día inexistente (art. 107.4 TRLRHL en relación con el art. 5.1 CC):
// adquirido el 29-02-2016, el décimo año se cumple el 28-02-2026 → 10 años, coeficiente 0,12 (no 9 años, 0,15).
{
  const r = calcularPlusvalia({ inmueble: { municipio: "OTRO", cuota: 1, valorCatastralSuelo: 50000, valorCatastralTotal: 100000, adquisicion: { fecha: "2016-02-29" } }, titulares: [{ heredero: H("A", "hijo"), fraccion: 1 }], fecha: "2026-02-28" });
  eq("A-1 · plusvalía: 29-02-2016 → 28-02-2026 son 10 años (coef. 0,12)", r.coeficiente, 0.12, 0.0001);
}
// A-2 (control, pasa): método objetivo, real, no sujeción y prorrateo por meses (arts. 104.5, 107.1, 107.4 y 107.5 TRLRHL)
{
  const P = (inm) => calcularPlusvalia({ inmueble: { municipio: "OTRO", cuota: 1, valorCatastralSuelo: 50000, valorCatastralTotal: 100000, ...inm }, titulares: [{ heredero: H("A", "hijo"), fraccion: 1 }], fecha: "2026-09-15" });
  eq("A-2a · objetivo, 10 años: 50.000 × 0,12 × 30 %", P({ adquisicion: { fecha: "2016-09-15" } }).cuota, 1800);
  eq("A-2b · 7 meses: 0,15 × 7/12", P({ adquisicion: { fecha: "2026-02-10" } }).coeficiente, 0.0875, 0.00001);
  eq("A-2c · real (10.000 × 50 %) < objetiva", P({ adquisicion: { fecha: "2016-09-15", valor: 200000 }, valorTransmision: 210000 }).base, 5000);
  eq("A-2d · pérdida: no sujeto", P({ adquisicion: { fecha: "2016-09-15", valor: 220000 }, valorTransmision: 210000 }).total, 0);
}

// ── B · Legítimas
// B-1 (CRÍTICA, hoy falla): Eivissa y Formentera. Art. 79 Compilación balear: son legitimarios los hijos y descendientes y los PADRES; la legítima de
// los padres se rige por los arts. 809 y 810.1 CC (la mitad del haber sin cónyuge). Base 300.000 → 150.000 entre los dos (75.000 cada uno).
{
  const r = calcularLegitimas({ ccaa: "BAL", isla: "eivissa", reparto: "porcentajes", herederos: [H("P", "padre"), H("M", "padre"), H("X", "extrano")], derechos: { X: [{ tipo: "pleno", fraccion: 1 }] }, masa: { neto: 300000, netoReparto: 300000 } });
  eq("B-1 · Eivissa: legítima de los padres = 1/2 (art. 79 Compilación → art. 809 CC)", r.tercios.estricta, 150000, 1);
  eq("B-1 · Eivissa: mínimo de cada progenitor", (r.herederos.find((h) => h.id === "P") || {}).legitimaMinima || 0, 75000, 1);
}
// B-2 (MENOR, hoy falla): el desheredado sin causa probada recupera la legítima de SU estirpe (art. 851 CC): con dos estirpes y base 300.000,
// 100.000/2 = 50.000, no 100.000/3.
{
  const r = calcularLegitimas({ ccaa: "MAD", reparto: "porcentajes", herederos: [H("A", "hijo", { desheredado: true }), H("B", "hijo"), H("N1", "nieto", { estirpe: "A" }), H("N2", "nieto", { estirpe: "A" })], derechos: { B: [{ tipo: "pleno", fraccion: 1 }] }, masa: { neto: 300000, netoReparto: 300000 } });
  eq("B-2 · desheredado: legítima estricta de su estirpe si la causa no se prueba", (r.herederos.find((h) => h.id === "A") || {}).legitimaMinima || 0, 50000, 1);
}

// ── C · Sucesión intestada
// C-1 (MAYOR, hoy falla): el hijo indigno (arts. 756 y 761 CC) es representado por sus hijos (art. 929 CC «en los casos de desheredación o incapacidad»).
// Requiere un campo nuevo `indigno` en la persona.
{
  const r = repartoIntestado([H("A", "hijo", { indigno: true }), H("B", "hijo"), H("N1", "nieto", { estirpe: "A" }), H("N2", "nieto", { estirpe: "A" })]);
  const f = (id) => (r.derechos[id] || []).reduce((s, d) => s + d.fraccion, 0);
  eq("C-1 · indigno: no hereda", f("A"), 0, 1e-9);
  eq("C-1 · indigno: sus hijos le representan (1/4 cada uno)", f("N1"), 0.25, 1e-9);
}
// C-2 (MAYOR, hoy falla): designación de cuotas numéricas (art. 983 CC) excluye el acrecimiento; la porción vacante pasa a los herederos legítimos
// (arts. 912.3.º y 986 CC). Se propone la opción `acrecer: false` y un resultado `vacante` con la fracción no acrecida.
{
  const r = repartoPorcentajes([H("A", "hijo", { pct: 60 }), H("X", "extrano", { pct: 40, renuncia: true })], { acrecer: false });
  eq("C-2 · cuotas numéricas: lo renunciado no acrece (vacante 40 %)", r.vacante ?? 0, 0.40, 1e-9);
}

// ── D · Ley aplicable
// D-1 (MAYOR, hoy falla): causante con residencia habitual fuera de España (ccaa EST): Reglamento (UE) 650/2012, arts. 21-22. El reparto y las legítimas
// del Código Civil no pueden darse sin aviso.
{
  const r = calcularISD({ fechaFallecimiento: "2026-05-01", ccaa: "EST", ajuar: "cero", reparto: "intestado", bienes: [{ id: "b", tipo: "cuenta", valor: 100000 }], herederos: [H("A", "hijo", { edad: 30 })] });
  si("D-1 · residente fuera: aviso del Reglamento 650/2012 (ley de la residencia habitual salvo professio iuris)", r.alertas.some((a) => /650\/2012/.test(a)));
}

// ── E · Gananciales
// E-1 (MAYOR, hoy falla): seguro de vida contratado con cargo a la sociedad de gananciales con el cónyuge como beneficiario: solo la mitad
// integra la base imponible (art. 39.2 RD 1629/1991). Se propone el campo `ganancial` en cada seguro.
{
  const r = calcularISD({ fechaFallecimiento: "2026-05-01", ccaa: "MAD", ajuar: "cero", reparto: "intestado", bienes: [{ id: "b", tipo: "cuenta", valor: 10000 }], herederos: [H("V", "conyuge", { edad: 70 }), H("A", "hijo", { edad: 40 })], seguros: [{ beneficiarioId: "V", importe: 100000, ganancial: true }] });
  const paso = (r.herederos.find((h) => h.id === "V").traza || []).find((p) => /Seguros/.test(p.paso));
  eq("E-1 · seguro ganancial del cónyuge: base = mitad", paso ? paso.valor : 0, 50000, 1);
}

// ── F · Plazos y recargos
// F-1 (MAYOR, hoy falla): la prórroga del ISD obliga a pagar intereses de demora desde el fin de los seis meses hasta la presentación
// (art. 69.2 RD 1629/1991). Se propone `interesesProrroga` en el resultado y su suma a totalConRecargo.
{
  const base = { ccaa: "MAD", ajuar: "cero", reparto: "intestado", bienes: [{ id: "b", tipo: "cuenta", valor: 1500000 }], herederos: [H("S", "sobrino", { edad: 40 })] };
  const r = calcularISD({ ...base, fechaFallecimiento: "2025-10-01", prorrogaISD: true, fechaReferencia: "2026-09-30", enPlazo: true });
  // 01-04-2026 (fin de 6 meses) → 30-09-2026: 182 días al 4,0625 %
  eq("F-1 · prórroga: intereses de demora del periodo prorrogado", r.interesesProrroga ?? 0, Math.round(r.total * 0.040625 * 182 / 365 * 100) / 100, 1);
}
// F-2 (MENOR, interpretación, hoy falla): presentado exactamente al cumplirse 12 meses completos, aún no han «transcurrido más de 12 meses»
// (art. 27.2 LGT): 1 % + 12 % = 13 %, sin el 15 %.
eq("F-2 · art. 27.2 LGT: 12 meses completos justos = 13 %", recargoArt27(10000, "2026-03-16", "2027-03-16").pct, 0.13, 0.0001);
// F-3 (MENOR, hoy falla): el certificado de últimas voluntades solo puede pedirse TRANSCURRIDOS 15 días hábiles: el primer día útil es el siguiente
// al decimoquinto hábil (sede del Ministerio de Justicia).
{
  const f = "2026-03-31", u = calcularPlazos(f).find((q) => q.id === "ultimas_voluntades");
  si("F-3 · últimas voluntades: desde el día siguiente al 15.º hábil", u.desde > sumarHabiles(f, 15));
}
// F-4 (MENOR, hoy falla): coherencia entre calcularPlazos y el catálogo de trámites (Agenda vs Trámites). Fallecimiento el lunes 04-05-2026: 3 días naturales → 07-05; 6 días → 10-05 (domingo) → 11-05
{
  const f = "2026-05-04", P = Object.fromEntries(calcularPlazos(f, { autonomo: true, hayVehiculos: true }).map((q) => [q.id, q]));
  const T = Object.fromEntries(tramitesDe({ fecha: f, nHerederos: 2, inmuebles: 1, situ: { autonomo: true, vehiculos: true } }).map((x) => [x.id, x]));
  si("F-4a · baja del autónomo: mismo límite en plazos y trámites", !T.baja_reta || P.baja_ss.limite === T.baja_reta.limite);
  si("F-4b · transferencia DGT: el plazo corre desde la adjudicación, no desde el fallecimiento", !P.dgt || !P.dgt.limite);
}

// ── P · Partición (app/particion.js; requiere navegador)
if (process.env.PW) {
  const { chromium } = await import(process.env.PW_MOD || "playwright"); // PW_MOD: ruta a playwright/index.mjs si no está instalado junto al repositorio
  const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
  const p = await b.newPage();
  await p.goto("http://localhost:8765/app/", { waitUntil: "networkidle" });
  const R = await p.evaluate(() => {
    const base = (ccaa, bienes, personas) => ({ id: "t" + Math.random(), fecha: "2026-06-01", ccaa, civil: "viudo", testamento: "no", ajuar: "cero", enPlazo: true, situ: {}, tareas: {}, tramites: {}, personas, bienes, deudas: [], gastos: [] });
    const hijos = [{ id: "A", nombre: "Ana", relacion: "hijo", edad: 45 }, { id: "B", nombre: "Blas", relacion: "hijo", edad: 41 }];
    const p1 = cuadroParticion(base("MAD", [{ id: "v1", tipo: "vivienda", valor: 200000, titularidad: "privativo", adjudicadoA: "A" }, { id: "v2", tipo: "inmueble", valor: 200000, titularidad: "privativo", adjudicadoA: "A" }], hijos));
    const p5 = cuadroParticion(base("MAD", [{ id: "c", tipo: "cuenta", valor: 240000, titularidad: "privativo" }], [{ ...hijos[0], donacionColacionable: 60000 }, hijos[1]]));
    return { p1Evit: p1.H.find((h) => h.id === "A").evitable, p5Ana: p5.H.find((h) => h.id === "A").haber, p5Blas: p5.H.find((h) => h.id === "B").haber };
  });
  // P-1 (CRÍTICA, hoy falla): dos pisos de 200.000 € adjudicados a un mismo heredero: el exceso es EVITABLE (otro lote cabía), art. 1061 CC y
  // art. 7.2.B TRLITPAJD (solo el exceso que nace de los arts. 821, 829, 1056.2 y 1062.1 CC queda fuera de TPO).
  eq("P-1 · dos pisos al mismo heredero: exceso evitable 200.000", R.p1Evit, 200000, 1);
  // P-2 (CRÍTICA, hoy falla): colación (arts. 1035 y 1047 CC): Ana recibió 60.000 colacionables; masa partible 300.000 → 150.000 cada uno;
  // Ana toma 90.000 del caudal y Blas 150.000.
  eq("P-2 · colación: haber de Ana en el caudal", R.p5Ana, 90000, 1);
  eq("P-2 · colación: haber de Blas en el caudal", R.p5Blas, 150000, 1);
  await b.close();
}

console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
