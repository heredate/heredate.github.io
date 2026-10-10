// Pruebas del motor v0.4.2 · node test.mjs (datos de Hacienda del IIVTNU 2026 y cota superior en los 8.132 municipios en la sección 18; regresiones de la auditoría independiente de 01-10-2026 en la sección 12; cambios de la mesa jurídica CM-001 a CM-004 en la sección 13;
// renuncia al usufructo universal, art. 22.3 y plazos unificados en la 14; robustez exhaustiva de plusvalía (todas las ordenanzas y los 8.132 municipios) en la 15 y del ISD (22 territorios) en la 16)
import { tramitesDe, TR_TOTAL } from "./tramites.mjs";
import { readFileSync } from "node:fs";
import { repartoIntestado, repartoUsufructoUniversal, calcularISD, calcularLegitimas, calcularPlusvalia, ordenanzaDesdeDatos, calcularPlazos, aHabil, limiteISD, sumarMeses, cuotaTarifa, pctUsufructoVitalicio, pctUsufructoTemporal, coefPlusvaliaLegal, coefPlusvaliaMax, regimenPlusvalia, PLUSVALIA_FORAL, REGLAS, TERRITORIOS, ORDENANZAS, HACIENDA_IIVTNU_2026, haciendaIIVTNU, plazoPresentacionISD, recargoArt27, vecindadCivil, recargoPresentacion, RECARGO_FORAL, PLAZO_ISD_FORAL, MODELO650_AUT, modelo650Aut, COEF_PLUSVALIA_NAV_2026, COEF_PLUSVALIA_BIZ_2024, COEF_PLUSVALIA_RDL16_2025 } from "./motor.mjs";
import { plazosProcedimiento, PROC_TIPOS, prescripcionTributo, simularAplazamiento, APLAZ_REGIMENES, INTERES_LEGAL, INTERES_DEMORA } from "./motor.mjs";
import { esInhabil, festivoEn, venceHabil, infoCalendario, calendarioDe, plazoPlusvalia, sumarHabiles, sumarDias } from "./motor.mjs";
import { FESTIVOS_NACIONALES, FESTIVOS_CCAA, FESTIVOS_LOCALES, PROV_CCAA, CAPITALES_INE } from "./festivos.mjs";

let ok = 0, ko = 0;
const eq = (n, got, exp, tol = 0.02) => { const p = Math.abs(got - exp) <= tol; p ? ok++ : ko++; if (!p || process.env.V) console.log(`${p ? "✔" : "✘"} ${n}: ${got} (esperado ${exp})`); };
const unico = (ccaa, relacion, edad, importe, x = {}) => calcularISD({
  fechaFallecimiento: x.fecha || "2026-09-15", ccaa, ajuar: x.ajuar || "cero", enPlazo: x.enPlazo, conRequerimiento: x.req, reparto: "intestado",
  bienes: [{ id: "b", tipo: "cuenta", valor: importe }],
  herederos: [{ id: "h", nombre: "H", relacion, edad, patrimonioPreexistente: x.pp || 0, donacionesPreviasBL: x.don || 0 }],
}).total;

// 1. Continuidad de la tarifa estatal
const T = REGLAS.EST.tarifa().tramos;
for (let i = 1; i < T.length; i++) eq(`tarifa estatal tramo ${i}`, cuotaTarifa(T[i][0] - 1e-4, T), T[i][1]);

// 2. Ejemplos resueltos por los agentes (hijo de 30 años y sobrino, en metálico, sin ajuar)
const casos = [
  ["EST", "hijo", 200000, 28250.01], ["AND", "hijo", 300000, 0], ["AND", "sobrino", 100000, 16530],
  // Madrid con la tarifa del art. 23 de la auditoría (I-1): hijo BL 284.000 → CI 40.072,37 + 44.229,84 × 25,5 % = 51.350,98 → 1 % = 513,51;
  // sobrino BL 92.000 → CI 9.178,12 + 11.993,27 × 16,15 % = 11.115,03 × 1,5882 = 17.652,89 → 50 % → 8.826,44 (antes 513,40 y 8.828,80 con la tabla redondeada)
  ["MAD", "hijo", 300000, 513.51], ["MAD", "sobrino", 100000, 8826.44],
  ["CAT", "hijo", 300000, 10350], ["CAT", "sobrino", 100000, 12896.18],
  ["VAL", "hijo", 300000, 318.53], ["VAL", "sobrino", 100000, 13336.83],
  ["GAL", "hijo", 300000, 0], ["GAL", "sobrino", 100000, 13371.60],
  ["CYL", "hijo", 300000, 0], ["CYL", "sobrino", 100000, 17667.79],
  ["CLM", "hijo", 300000, 7709.67], ["CLM", "sobrino", 100000, 17667.79],
  ["ARA", "hijo", 300000, 0], ["EXT", "hijo", 300000, 0],
  ["MUR", "hijo", 300000, 513.98], ["CAN", "hijo", 300000, 49.57], ["BAL", "hijo", 300000, 0],
  ["AST", "hijo", 300000, 0], ["AST", "hijo", 350000, 10625], ["CANT", "hijo", 300000, 0], ["RIO", "hijo", 300000, 513.98],
  ["NAV", "hijo", 300000, 1000], ["NAV", "hijo", 600000, 9000],
  ["BIZ", "hijo", 300000, 0], ["BIZ", "hijo", 600000, 3000], ["GIP", "hijo", 600000, 3000], ["ALA", "hijo", 600000, 3000],
  ["CEU", "hijo", 300000, 513.98], ["CEU", "hijo", 600000, 1357.72], ["MEL", "hijo", 300000, 513.98],
];
for (const [c, r, v, e] of casos) eq(`${c} · ${r} · ${v.toLocaleString("es-ES")} €`, unico(c, r, 30, v), e);
eq("EST · hijo 200.000 € con ajuar 3 %", unico("EST", "hijo", 30, 200000, { ajuar: "3pct" }), 29525.01);
eq("MAD · sobrino fallecido en 2024 (bonificación 25 %)", unico("MAD", "sobrino", 30, 100000, { fecha: "2024-03-01" }), 13239.67); // 17.652,89 − 4.413,22
// Antes: "fuera de plazo pierde la bonificación" (17.657,61). Regla equivocada (auditoría C-1): el grupo III solo la pierde por lo declarado tras requerimiento
eq("MAD · sobrino fuera de plazo sin requerimiento conserva el 50 %", unico("MAD", "sobrino", 30, 100000, { enPlazo: false }), 8826.44);
eq("MAD · sobrino con requerimiento pierde la bonificación", unico("MAD", "sobrino", 30, 100000, { enPlazo: false, req: true }), 17652.89);
eq("VAL · sobrino antes del 01-06-2026 (sin bonificación)", unico("VAL", "sobrino", 30, 100000, { fecha: "2026-03-01" }), 17782.44);

// 3. Cobertura: todos los territorios calculan sin error
for (const [id] of TERRITORIOS) { try { unico(id, "hijo", 40, 250000); unico(id, "hermano", 60, 80000); ok++; } catch (e) { ko++; console.log("✘ territorio", id, e.message); } }

// 4. Gananciales, legados, renuncias, usufructo universal
const fam = (x) => calcularISD({
  fechaFallecimiento: "2026-09-15", ccaa: "MAD", ajuar: "cero", reparto: x.reparto || "intestado",
  bienes: [
    { id: "v", tipo: "inmueble", valor: 400000, valorReferencia: 380000, titularidad: "ganancial", esViviendaHabitual: true },
    { id: "c", tipo: "cuenta", valor: 100000, titularidad: "privativo", legatarioId: x.legado ? "s" : undefined },
  ],
  herederos: [
    { id: "v1", nombre: "Viuda", relacion: "conyuge", edad: 70 },
    { id: "a", nombre: "A", relacion: "hijo", edad: 45, renuncia: !!x.renunciaA },
    { id: "b", nombre: "B", relacion: "hijo", edad: 40 },
    ...(x.legado ? [{ id: "s", nombre: "Sobrino", relacion: "sobrino", edad: 30 }] : []),
  ],
});
const g1 = fam({});
eq("Gananciales: caudal del causante (400.000/2 + 100.000)", g1.masa.bruto, 300000);
eq("Gananciales: mitad del viudo", g1.masa.mitadViudo, 200000);
const g2 = fam({ renunciaA: true });
eq("Renuncia: B recibe toda la parte de los descendientes", g2.herederos.find((h) => h.id === "b").valorAdquirido, 200000 * (2 / 3) + 200000 * (1 / 3) * (1 - 0.19) + 100000 * (2 / 3) + 100000 * (1 / 3) * 0.81, 1);
const g3 = fam({ legado: true });
eq("Legado: el sobrino recibe la cuenta", g3.herederos.find((h) => h.id === "s").valorAdquirido, 100000);
const g4 = fam({ reparto: "usufructoUniversal" });
eq("Usufructo universal: valor del usufructo de la viuda (19 %)", g4.herederos.find((h) => h.id === "v1").valorAdquirido, 300000 * 0.19);
eq("Usufructo 70 años", pctUsufructoVitalicio(70), 0.19);

// 5. Donaciones acumuladas: el tipo medio sube la cuota
const sin = unico("EST", "hijo", 30, 100000), con = unico("EST", "hijo", 30, 100000, { don: 100000 });
eq("Donaciones previas elevan la cuota", con > sin ? 1 : 0, 1);

// 6. Plusvalía Málaga
const pv = calcularPlusvalia({ inmueble: { municipio: "MALAGA", valorCatastralTotal: 120000, valorCatastralSuelo: 48000, adquisicion: { fecha: "2004-06-01", valor: 90000 }, valorTransmision: 200000, esViviendaHabitual: true }, titulares: [{ heredero: { nombre: "Hijo", relacion: "hijo", convivio2anios: true }, fraccion: 1 }], fecha: "2026-05-10", caudalTotal: 250000 });
eq("Plusvalía Málaga · cuota (tipo 29 %)", pv.cuota, 5568); eq("Plusvalía Málaga · con 80 %", pv.total, 1113.6);
const pvG = calcularPlusvalia({ inmueble: { municipio: "OTRO", tipoManual: 25, bonifManual: 50, cuota: 0.5, valorCatastralTotal: 100000, valorCatastralSuelo: 40000, adquisicion: { fecha: "2000-01-01", valor: 60000 }, valorTransmision: 200000 }, titulares: [{ heredero: { nombre: "Hijo", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-05-10" });
eq("Plusvalía otro municipio, ganancial, 25 % y 50 % de bonificación", pvG.total, 40000 * 0.5 * 0.40 * 0.25 * 0.5);

// 6 bis. Plusvalía en el resto de España
{
  const P = (municipio, heredero, extra = {}, fecha = "2026-05-10", adq = "2004-06-01") => calcularPlusvalia({ inmueble: { municipio, valorCatastralTotal: 120000, valorCatastralSuelo: 48000, adquisicion: { fecha: adq, valor: 90000 }, valorTransmision: 200000, esViviendaHabitual: true, ...extra }, titulares: [{ heredero: { nombre: "H", ...heredero }, fraccion: 1 }], fecha, caudalTotal: 250000 });
  const hijo = { relacion: "hijo", convivio2anios: true };
  eq("Madrid · suelo 48.000 € → 95 %", P("MADRID", hijo).porTitular[0].bonificacionPct, 0.95);
  eq("Madrid · suelo 90.000 € → 85 % (no 90 %)", P("MADRID", hijo, { valorCatastralSuelo: 90000 }).porTitular[0].bonificacionPct, 0.85);
  eq("Madrid · suelo 200.000 € → 40 %", P("MADRID", hijo, { valorCatastralSuelo: 200000 }).porTitular[0].bonificacionPct, 0.40);
  eq("Pamplona · exención entre descendientes", P("PAMPLONA", hijo).total, 0);
  eq("Pamplona · hermano paga", P("PAMPLONA", { relacion: "hermano" }).total > 0 ? 1 : 0, 1);
  eq("Huesca · suprimido desde 2026", P("HUESCA", { relacion: "hermano" }).total, 0);
  eq("Huesca · alerta de supresión", P("HUESCA", hijo).alertas.some((a) => /suprimió/.test(a)) ? 1 : 0, 1);
  const ce = P("CEUTA", hijo); eq("Ceuta · 50 % general y 95 % sobre el resto", ce.total, Math.round(ce.cuota * 0.025 * 100) / 100);
  eq("Ceuta · hermano solo el 50 %", P("CEUTA", { relacion: "hermano" }).porTitular[0].bonificacionPct, 0.5);
  const gu = P("GUADALAJARA", { relacion: "hermano" }, {}, "2026-05-10", "2004-01-01");
  eq("Guadalajara · 22 años: coeficiente propio 0,45 limitado a 0,40", gu.coeficiente, 0.40);
  eq("Guadalajara · 20 o más años: tipo 18 %", gu.tipo, 0.18);
  eq("Guadalajara · alerta de coeficiente por encima del máximo", gu.alertas.some((a) => /107\.4/.test(a)) ? 1 : 0, 1);
  eq("Toledo · 16-20 años: 25,90 %", P("TOLEDO", hijo, {}, "2026-05-10", "2008-01-01").tipo, 0.259);
  eq("León · ascendiente 50 %", P("LEON", { relacion: "padre" }).porTitular[0].bonificacionPct, 0.5);
  eq("Zamora · hijo mayor de edad sin bonificación", P("ZAMORA", { relacion: "hijo", edad: 40 }).porTitular[0].bonificacionPct, 0);
  eq("Zamora · hijo menor 95 %", P("ZAMORA", { relacion: "hijo", edad: 12 }).porTitular[0].bonificacionPct, 0.95);
  eq("Tarragona · suelo 48.000 € → 50 %", P("TARRAGONA", hijo).porTitular[0].bonificacionPct, 0.5);
  eq("Las Palmas · otro inmueble suelo 48.000 € → 50 %", P("LAS_PALMAS_GC", hijo, { esViviendaHabitual: false }).porTitular[0].bonificacionPct, 0.5);
  eq("Cartagena · otro inmueble 10 %", P("CARTAGENA", hijo, { esViviendaHabitual: false }).porTitular[0].bonificacionPct, 0.10);
  const cr = P("CIUDAD_REAL", hijo); eq("Ciudad Real · base > 10.000 € → 45 % o menos", cr.porTitular[0].bonificacionPct, escalonTest(cr.base));
  eq("Oviedo · tipo 20 %", P("OVIEDO", hijo).tipo, 0.20);
  eq("Salamanca · hijo sin discapacidad sin bonificación", P("SALAMANCA", hijo).porTitular[0].bonificacionPct, 0);
  eq("Salamanca · hijo con discapacidad del 40 % → 95 %", P("SALAMANCA", { ...hijo, discapacidad: 40 }).porTitular[0].bonificacionPct, 0.95);
  function escalonTest(b) { return b <= 10000 ? 0.5 : b <= 25000 ? 0.45 : b <= 50000 ? 0.4 : b <= 100000 ? 0.35 : 0; }

  // 6 ter. Lotes 1 y 2 (grandes municipios, investigación 28-09-2026). Base: suelo 48.000 €, 21 años de tenencia (coeficiente 0,40)
  const bp = (r) => r.porTitular[0].bonificacionPct;
  const otro = { esViviendaHabitual: false }, conyuge = { relacion: "conyuge", convivio2anios: true };
  eq("Badalona · tipo 30 %", P("BADALONA", hijo).tipo, 0.30);
  eq("Badalona · suelo 48.000 € → 25 %", bp(P("BADALONA", hijo)), 0.25);
  eq("Badalona · suelo 25.000 € → 95 %", bp(P("BADALONA", hijo, { valorCatastralSuelo: 25000 })), 0.95);
  eq("Badalona · suelo 70.000 € → sin bonificación", bp(P("BADALONA", hijo, { valorCatastralSuelo: 70000 })), 0);
  eq("Badalona · sin convivencia → sin bonificación", bp(P("BADALONA", { relacion: "hijo" })), 0);
  eq("Sabadell · suelo 48.000 € → 30 %", bp(P("SABADELL", hijo)), 0.30);
  eq("Sabadell · suelo 43.000 € → 95 %", bp(P("SABADELL", hijo, { valorCatastralSuelo: 43000 })), 0.95);
  eq("Sabadell · hermano sin bonificación", bp(P("SABADELL", { relacion: "hermano", convivio2anios: true })), 0);
  eq("Sant Cugat · vivienda habitual 95 %", bp(P("SANT_CUGAT_DEL_VALLES", hijo)), 0.95);
  eq("Sant Cugat · otro inmueble hijo 50 %", bp(P("SANT_CUGAT_DEL_VALLES", hijo, otro)), 0.50);
  eq("Sant Cugat · otro inmueble cónyuge 60 %", bp(P("SANT_CUGAT_DEL_VALLES", conyuge, otro)), 0.60);
  eq("Sant Cugat · nieto sin bonificación", bp(P("SANT_CUGAT_DEL_VALLES", { relacion: "nieto" })), 0);
  eq("Manresa · bonificación introducida a mano (70 %)", bp(P("MANRESA", hijo, { bonifManual: 70 })), 0.70);
  eq("Manresa · alerta de ingresos del heredero", P("MANRESA", hijo).alertas.some((a) => /ingresos/.test(a)) ? 1 : 0, 1);
  eq("Manresa · hermano sin bonificación", bp(P("MANRESA", { relacion: "hermano" }, { bonifManual: 70 })), 0);
  eq("Leganés · 20 o más años: tipo 25 %", P("LEGANES", hijo).tipo, 0.25);
  eq("Leganés · 3 años: tipo 27 % y coeficiente propio 0,14", P("LEGANES", hijo, {}, "2026-05-10", "2023-01-01").tipo * 100 + P("LEGANES", hijo, {}, "2026-05-10", "2023-01-01").coeficiente, 27.14, 0.001);
  eq("Leganés · suelo 48.000 € → 75 %", bp(P("LEGANES", hijo)), 0.75);
  eq("Leganés · vivienda sin convivencia → sin bonificación", bp(P("LEGANES", { relacion: "hijo" })), 0);
  eq("Fuenlabrada · más de 5 años: tipo 13,8 %", P("FUENLABRADA", hijo).tipo, 0.138);
  eq("Fuenlabrada · suelo 48.000 € → 75 %", bp(P("FUENLABRADA", hijo)), 0.75);
  eq("Fuenlabrada · suelo 120.000 € → sin bonificación", bp(P("FUENLABRADA", hijo, { valorCatastralSuelo: 120000 })), 0);
  eq("Fuenlabrada · otro inmueble sin bonificación", bp(P("FUENLABRADA", hijo, otro)), 0);
  eq("Torrejón · suelo 48.000 € → 15 %", bp(P("TORREJON_DE_ARDOZ", hijo)), 0.15);
  eq("Torrejón · suelo 10.000 € → 75 %", bp(P("TORREJON_DE_ARDOZ", hijo, { valorCatastralSuelo: 10000 })), 0.75);
  eq("Rivas · otro inmueble 95 %", bp(P("RIVAS_VACIAMADRID", { relacion: "hijo" }, otro)), 0.95);
  eq("Rivas · hermano sin bonificación", bp(P("RIVAS_VACIAMADRID", { relacion: "hermano" })), 0);
  eq("Pozuelo · tipo 29 %", P("POZUELO_DE_ALARCON", hijo).tipo, 0.29);
  eq("Pozuelo · suelo 48.000 € → 95 %", bp(P("POZUELO_DE_ALARCON", hijo)), 0.95);
  eq("Pozuelo · suelo 150.000 € → 50 %", bp(P("POZUELO_DE_ALARCON", hijo, { valorCatastralSuelo: 150000 })), 0.50);
  eq("Pozuelo · otro inmueble sin bonificación", bp(P("POZUELO_DE_ALARCON", hijo, otro)), 0);
  eq("Chiclana · cónyuge 85 %", bp(P("CHICLANA_DE_LA_FRONTERA", conyuge)), 0.85);
  eq("Chiclana · hijo que no convive → sin bonificación", bp(P("CHICLANA_DE_LA_FRONTERA", { relacion: "hijo" })), 0);
  eq("Chiclana · 1 año: coeficiente propio 0,13", P("CHICLANA_DE_LA_FRONTERA", conyuge, {}, "2026-05-10", "2025-03-01").coeficiente, 0.13, 0.0001);
  eq("Chiclana · alerta sobre la tabla de coeficientes", P("CHICLANA_DE_LA_FRONTERA", conyuge).alertas.some((a) => /coeficientes/.test(a)) ? 1 : 0, 1);
  eq("El Puerto · empadronado 2 años → 95 %", bp(P("EL_PUERTO_DE_SANTA_MARIA", hijo)), 0.95);
  eq("El Puerto · sin empadronamiento → sin bonificación", bp(P("EL_PUERTO_DE_SANTA_MARIA", { relacion: "hijo" })), 0);
  eq("El Puerto · 7 años: coeficiente propio 0,12 (máximo 0,20)", P("EL_PUERTO_DE_SANTA_MARIA", hijo, {}, "2026-05-10", "2019-01-01").coeficiente, 0.12, 0.0001);
  eq("Alcalá de Guadaíra · suelo 48.000 € → 95 %", bp(P("ALCALA_DE_GUADAIRA", hijo)), 0.95);
  eq("Alcalá de Guadaíra · suelo 200.000 € → 15 %", bp(P("ALCALA_DE_GUADAIRA", hijo, { valorCatastralSuelo: 200000 })), 0.15);
  eq("Alcalá de Guadaíra · otro inmueble sin bonificación", bp(P("ALCALA_DE_GUADAIRA", hijo, otro)), 0);
  eq("Sanlúcar · sin bonificación", P("SANLUCAR_DE_BARRAMEDA", hijo).total, 48000 * 0.40 * 0.30);
  eq("Mérida · sin bonificación", P("MERIDA", hijo).total, 48000 * 0.40 * 0.30);
  eq("Utrera · tipo 28 % y suelo 48.000 € → 50 %", P("UTRERA", hijo).total, 48000 * 0.40 * 0.28 * 0.5);
  eq("Utrera · suelo 25.000 € → 95 %", bp(P("UTRERA", hijo, { valorCatastralSuelo: 25000 })), 0.95);
  eq("Utrera · suelo 100.000 € → sin bonificación", bp(P("UTRERA", hijo, { valorCatastralSuelo: 100000 })), 0);
  eq("Linares · más de 10 años: tipo 27 %", P("LINARES", hijo).tipo, 0.27);
  eq("Linares · domicilio común → 50 %", bp(P("LINARES", hijo)), 0.50);
  eq("Linares · nieto sin bonificación", bp(P("LINARES", { relacion: "nieto", convivio2anios: true })), 0);
  eq("Lucena · vivienda, suelo 48.000 € → 60 %", bp(P("LUCENA", hijo)), 0.60);
  eq("Lucena · vivienda, suelo 5.000 € → 90 %", bp(P("LUCENA", hijo, { valorCatastralSuelo: 5000 })), 0.90);
  eq("Lucena · otro inmueble 30 %", bp(P("LUCENA", hijo, otro)), 0.30);
  eq("Lucena · hermano sin bonificación", bp(P("LUCENA", { relacion: "hermano" })), 0);
  eq("Siero · otro inmueble 95 %", bp(P("SIERO", { relacion: "hijo" }, otro)), 0.95);
  eq("Siero · hermano sin bonificación", bp(P("SIERO", { relacion: "hermano" })), 0);
  eq("Siero · 19 años: coeficiente propio 0,29 limitado a 0,23", P("SIERO", hijo, {}, "2026-05-10", "2007-01-01").coeficiente, 0.23, 0.0001);
  eq("Torrelavega · 50 % (residencia futura no recogida)", bp(P("TORRELAVEGA", hijo)), 0.50);
  eq("Torrelavega · alerta del 95 %", P("TORRELAVEGA", hijo).alertas.some((a) => /95 %/.test(a)) ? 1 : 0, 1);
  eq("Torrelavega · nieto sin bonificación", bp(P("TORRELAVEGA", { relacion: "nieto" })), 0);
  // Pendientes de cotejo (tipo de texto oficial)
  eq("Alcorcón · 20 o más años: tipo 27 %", P("ALCORCON", hijo).tipo, 0.27);
  eq("Alcorcón · hijo de 40 años sin bonificación", bp(P("ALCORCON", { ...hijo, edad: 40 })), 0);
  eq("Valdemoro · 50 % en cualquier inmueble", bp(P("VALDEMORO", { relacion: "hijo" }, otro)), 0.50);
  eq("Boadilla del Monte · tipo 24 %", P("BOADILLA_DEL_MONTE", hijo).tipo, 0.24);
  const nuevos = ["BADALONA", "SABADELL", "SANT_CUGAT_DEL_VALLES", "MANRESA", "MATARO", "RUBI", "LEGANES", "FUENLABRADA", "TORREJON_DE_ARDOZ", "RIVAS_VACIAMADRID", "POZUELO_DE_ALARCON", "ALCORCON", "LAS_ROZAS", "VALDEMORO", "BOADILLA_DEL_MONTE", "COLMENAR_VIEJO", "LORCA", "TELDE", "CHICLANA_DE_LA_FRONTERA", "EL_PUERTO_DE_SANTA_MARIA", "ALCALA_DE_GUADAIRA", "SANLUCAR_DE_BARRAMEDA", "UTRERA", "LINARES", "LUCENA", "SIERO", "TORRELAVEGA", "MERIDA"];
  let fallos = 0;
  for (const m of nuevos) for (const hh of [hijo, conyuge, { relacion: "padre" }, { relacion: "nieto", edad: 10 }, { relacion: "pareja_hecho" }, { relacion: "hermano" }]) for (const x of [{}, otro, { esViviendaHabitual: false, esLocalAfecto: true }]) {
    const r = P(m, hh, x); if (!(r.total >= 0 && r.total <= r.cuota + 0.01 && r.porTitular.every((t) => t.norma && t.estado))) fallos++;
  }
  eq("Lotes 1 y 2 · todos calculan con norma y estado", fallos, 0);
}

// 7. Plazos
const pl = calcularPlazos("2026-05-10", { hayInmuebles: true });
eq("Plazo del impuesto 10-11-2026", pl.find((x) => x.id === "isd").limite === "2026-11-10" ? 1 : 0, 1);
// Antes se comprobaba limite === 2027-02-28. El cómputo de fecha a fecha sigue dando 28-02 (limiteNatural), pero es domingo: vence el lunes 01-03-2027 (art. 30.5 Ley 39/2015)
eq("Fin de mes: fallecido 31-08, fecha a fecha 28-02", calcularPlazos("2026-08-31").find((x) => x.id === "isd").limiteNatural === "2027-02-28" ? 1 : 0, 1);
eq("Fin de mes: 28-02-2027 es domingo, vence el 01-03-2027", calcularPlazos("2026-08-31").find((x) => x.id === "isd").limite === "2027-03-01" ? 1 : 0, 1);

// 8. Andalucía (auditoría 28-09-2026, Ley 5/2021)
eq("AND · cónyuge 1.500.000 €", unico("AND", "conyuge", 70, 1500000), 996.20);
eq("AND · hijo con discapacidad 65 %, 1.200.000 €", calcularISD({ fechaFallecimiento: "2026-09-15", ccaa: "AND", ajuar: "cero", reparto: "intestado", bienes: [{ id: "b", tipo: "cuenta", valor: 1200000 }], herederos: [{ id: "h", nombre: "H", relacion: "hijo", edad: 30, discapacidad: 65 }] }).total, 0);
eq("AND · primo 50.000 €", unico("AND", "primo", 30, 50000), 9538);
const herm = calcularISD({ fechaFallecimiento: "2026-09-15", ccaa: "AND", ajuar: "cero", reparto: "intestado", bienes: [{ id: "v", tipo: "inmueble", valor: 180000, esViviendaHabitual: true }], herederos: [{ id: "h", nombre: "H", relacion: "hermano", edad: 68, convivio2anios: true }] }).total;
eq("AND · hermano 68 conviviente, vivienda 180.000 € (límite 122.606,47 €)", herm, 7060.83, 0.02);

// 9. Plusvalía: municipios andaluces
const pvx = (municipio, extra = {}, h = {}) => calcularPlusvalia({ inmueble: { municipio, valorCatastralTotal: 120000, valorCatastralSuelo: 48000, adquisicion: { fecha: "2004-06-01", valor: 90000 }, valorTransmision: 200000, esViviendaHabitual: true, ...extra }, titulares: [{ heredero: { nombre: "Hijo", relacion: "hijo", convivio2anios: true, ...h }, fraccion: 1 }], fecha: "2026-05-10", caudalTotal: 250000 });
eq("Mijas · 20+ años de tenencia → tipo 22 %", pvx("MIJAS").tipo, 0.22);
eq("Córdoba · coeficiente propio 20 años (0,40) y bonificación 95 %", pvx("CORDOBA").total, Math.round(48000 * 0.40 * 0.2752 * 0.05 * 100) / 100);
eq("Jaén · sin bonificación", pvx("JAEN").total, 48000 * 0.40 * 0.29);
eq("Granada · 50 %", pvx("GRANADA").total, 48000 * 0.40 * 0.30 * 0.5);
eq("Alerta enero 2026 (RDL 16/2025)", calcularPlusvalia({ inmueble: { municipio: "RONDA", valorCatastralTotal: 100000, valorCatastralSuelo: 40000, adquisicion: { fecha: "2000-01-01", valor: 50000 }, valorTransmision: 150000 }, titulares: [{ heredero: { nombre: "H", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-01-15" }).alertas.length, 1);

// 10. Reparto intestado por órdenes (revisión independiente 28-09-2026)
const fr = (r, id) => (r.derechos[id] || []).reduce((s, d) => s + d.fraccion, 0);
let r = repartoIntestado([{ id: "a", nombre: "Abuelo", relacion: "abuelo" }, { id: "h", nombre: "Hermano", relacion: "hermano" }]);
eq("Abuelo excluye al hermano (arts. 935-942 CC)", fr(r, "a") * 10 + fr(r, "h"), 10);
r = repartoIntestado([{ id: "h1", nombre: "Ana", relacion: "hijo" }, { id: "n1", nombre: "Nieto", relacion: "nieto", estirpe: "Ana" }]);
eq("Nieto con su progenitor vivo no hereda", fr(r, "n1"), 0);
r = repartoIntestado([{ id: "h1", nombre: "Ana", relacion: "hijo", renuncia: true }, { id: "n1", nombre: "N1", relacion: "nieto", estirpe: "Ana" }, { id: "n2", nombre: "N2", relacion: "nieto", estirpe: "Ana" }]);
eq("Renuncia el único hijo: nietos por derecho propio (art. 923)", fr(r, "n1"), 0.5);
r = repartoIntestado([{ id: "h", nombre: "Juan", relacion: "hermano" }, ...[1, 2, 3].map((i) => ({ id: "a" + i, nombre: "A" + i, relacion: "sobrino", estirpe: "Luis" })), { id: "b1", nombre: "B1", relacion: "sobrino", estirpe: "Pepa" }]);
eq("Hermano con sobrinos de dos estirpes (art. 948)", fr(r, "h") + fr(r, "a1") * 10 + fr(r, "b1") * 100, 1 / 3 + 10 / 9 + 100 / 3, 0.001);
r = repartoIntestado([{ id: "d", nombre: "D", relacion: "hermano" }, { id: "m", nombre: "M", relacion: "hermano", medio: true }]);
eq("Medio hermano recibe la mitad (art. 949)", fr(r, "m"), 1 / 3, 0.001);
r = repartoIntestado([{ id: "p", nombre: "P", relacion: "pareja_hecho" }, { id: "t", nombre: "T", relacion: "primo" }]);
eq("Pareja de hecho sin testamento no hereda en derecho común", fr(r, "p") * 10 + fr(r, "t"), 1);
const pj = (inscrita) => calcularISD({ fechaFallecimiento: "2026-09-15", ccaa: "AND", ajuar: "cero", reparto: "porcentajes", bienes: [{ id: "b", tipo: "cuenta", valor: 300000 }], herederos: [{ id: "p", nombre: "P", relacion: "pareja_hecho", edad: 50, pct: 100, inscrita }] }).total;
eq("AND · pareja inscrita 300.000 € (equiparada)", pj(true), 0);
eq("AND · pareja no inscrita 300.000 € (grupo IV)", pj(false) > 90000 ? 1 : 0, 1);
const vh = calcularISD({ fechaFallecimiento: "2026-09-15", ccaa: "AND", ajuar: "cero", reparto: "intestado", bienes: [{ id: "v", tipo: "inmueble", valor: 200000, esViviendaHabitual: true }], herederos: [{ id: "h", nombre: "H", relacion: "hijo", edad: 40 }] });
eq("AND · hijo: no se aplica vivienda si la base ya es 0", vh.herederos[0].traza.some((t) => /vivienda/.test(t.paso)) ? 0 : 1, 1);

// 11. Catálogo de trámites (revisión 28-09-2026)
const tr = (c) => tramitesDe({ fecha: "2026-05-04", nHerederos: 2, inmuebles: 1, situ: {}, ...c });
const ids = (c) => tr(c).map((x) => x.id);
eq("Trámites: catálogo completo", TR_TOTAL >= 68 ? 1 : 0, 1);
eq("Heredero único con viudo: escritura, no instancia", ids({ herederoUnico: true, hayConyuge: true, nHerederos: 1 }).includes("instancia") ? 0 : 1, 1);
// D1 (control de calidad 07-10-2026): el plazo de 30 días corre desde que el heredero con bienes en su poder sabe que lo es (art. 1014 CC), no desde el
// fallecimiento, y solo si hay deudas tiene sentido mostrarlo. Ya no sale «vencido» en todos los expedientes.
eq("D1 · beneficio de inventario: sin deudas no aparece", ids({}).includes("inventario_plazo") ? 0 : 1, 1);
eq("D1 · con deudas aparece sin fecha límite (no puede vencer en rojo)", (() => { const t = tr({ hayDeudas: true }).find((x) => x.id === "inventario_plazo"); return t && !t.limite && /1014/.test(t.nota) && /1015/.test(t.que) && /1016/.test(t.que) ? 1 : 0; })(), 1);
eq("D1 · avalista: aparece aunque no consten deudas", ids({ situ: { avalista: true } }).includes("inventario_plazo") ? 1 : 0, 1);
eq("Baja censal: 6 meses", tr({ situ: { autonomo: true } }).find((x) => x.id === "baja_censal").limite === "2026-11-04" ? 1 : 0, 1);
eq("DGT: plazo desde la adjudicación, no desde el fallecimiento", tr({ hayVehiculos: true }).find((x) => x.id === "dgt").limite === null ? 1 : 0, 1);
eq("Andalucía: enlace al modelo 650/660", /modelo650660/.test(tr({ ccaa: "AND" }).find((x) => x.id === "isd").sede) ? 1 : 0, 1);

// Estrategia: criterio de la vivienda (DGT por cuotas / STSJA 1011/2026 al adjudicatario) y renuncia a aplicar la reducción
{
  const base = (x = {}) => calcularISD({ fechaFallecimiento: "2026-06-03", ccaa: "AND", ajuar: "cero", reparto: "intestado", ...x,
    bienes: [{ id: "v", tipo: "inmueble", esViviendaHabitual: true, valor: 200000 }, { id: "c", tipo: "cuenta", valor: 400000 }],
    herederos: [{ id: "p", nombre: "Pedro", relacion: "hermano", edad: 68, convivio2anios: true }, { id: "r", nombre: "Rosa", relacion: "hermano", edad: 64 }] });
  const bl = (R, id) => R.herederos.find((h) => h.id === id).baseLiquidable;
  const dgt = base(), tsja = base({ criterioVivienda: "TSJA2026", viviendaA: "p" }), sin = base({ noAplicarVivienda: true });
  eq("vivienda por cuotas: Pedro reduce 99.000 €", bl(sin, "p") - bl(dgt, "p"), 99000);
  eq("vivienda al adjudicatario: reduce el límite de 122.606,47 €", bl(sin, "p") - bl(tsja, "p"), 122606.47);
  eq("vivienda al adjudicatario: Rosa no cambia", bl(tsja, "r") - bl(dgt, "r"), 0);
  eq("TSJA deja alerta de criterio litigioso", tsja.alertas.some((a) => /1011\/2026/.test(a)) ? 1 : 0, 1);
}

// ───────── 7. Legítimas (control de intangibilidad, 29-09-2026) ─────────
{
  const leg = (caso, extra = {}) => { const isd = calcularISD(caso); return calcularLegitimas({ ccaa: caso.ccaa, herederos: caso.herederos, derechos: isd.derechos, masa: isd.masa, reparto: caso.reparto, legados: (caso.bienes || []).filter((b) => b.legatarioId).map((b) => ({ legatarioId: b.legatarioId, valor: b.valor })), ...extra }); };
  const caso = (ccaa, reparto, herederos, bienes = [{ id: "c", tipo: "cuenta", valor: 300000 }]) => ({ fechaFallecimiento: "2026-09-15", ccaa, ajuar: "cero", reparto, bienes, herederos });
  const H = (id, relacion, edad, x = {}) => ({ id, nombre: id.toUpperCase(), relacion, edad, ...x });
  const fila = (L, id) => L.herederos.find((h) => h.id === id);
  // 2 hijos + viudo con usufructo universal: tercios de 100.000 € y estricta de 50.000 € por hijo
  let L = leg(caso("MAD", "usufructoUniversal", [H("v", "conyuge", 72), H("a", "hijo", 45), H("b", "hijo", 40)]));
  eq("Legítimas · base = herencia neta", L.base, 300000);
  eq("Legítimas · tercio de legítima estricta", L.tercios.estricta, 100000);
  eq("Legítimas · tercio de mejora", L.tercios.mejora, 100000);
  eq("Legítimas · tercio libre", L.tercios.libre, 100000);
  eq("Legítimas · estricta de cada hijo = neto/3/2", fila(L, "a").legitimaMinima, 50000);
  eq("Legítimas · viudo: usufructo del tercio de mejora (17 % a 72 años)", L.viudo.valor, 17000);
  eq("Legítimas · hijo con nuda propiedad (83 % de 150.000) cubre la estricta", fila(L, "a").estado === "cubierta" ? 1 : 0, 1);
  eq("Legítimas · usufructo universal → aviso de cautela socini (art. 813.2)", L.intangibilidad.some((i) => i.tipo === "cualitativa" && /socini/.test(i.detalle)) ? 1 : 0, 1);
  // 3 hijos, legado de 250.000 € a uno: los otros dos reciben 16.500 € frente a 33.333 €
  L = leg(caso("AND", "porcentajes", [H("a", "hijo", 45, { pct: 34 }), H("b", "hijo", 40, { pct: 33 }), H("c", "hijo", 38, { pct: 33 })], [{ id: "c", tipo: "cuenta", valor: 50000 }, { id: "p", tipo: "inmueble", valor: 250000, legatarioId: "a" }]));
  eq("Legítimas · legado excesivo: B vulnerada", fila(L, "b").estado === "vulnerada" ? 1 : 0, 1);
  eq("Legítimas · legado excesivo: déficit de C", fila(L, "c").deficit, 33333.33 - 16500, 0.02);
  eq("Legítimas · legado excesivo: A cubierta con el legado", fila(L, "a").estado === "cubierta" ? 1 : 0, 1);
  eq("Legítimas · acción: complemento (art. 815) y reducción (arts. 817-820)", L.intangibilidad.some((i) => i.tipo === "cuantitativa" && /815/.test(i.accion) && /817-820/.test(i.accion)) ? 1 : 0, 1);
  // Sin descendientes: padres (un tercio por concurrir el cónyuge) y viudo con usufructo de la mitad
  L = leg(caso("MAD", "intestado", [H("v", "conyuge", 60), H("p", "padre", 85), H("m", "padre", 83)]));
  eq("Legítimas · padres con cónyuge: un tercio (art. 809)", L.tercios.estricta, 100000);
  eq("Legítimas · cada progenitor la mitad (art. 810)", fila(L, "p").legitimaMinima, 50000);
  eq("Legítimas · viudo: usufructo de la mitad (29 % a 60 años, art. 837)", L.viudo.valor, 150000 * 0.29);
  eq("Legítimas · padres sin cónyuge: la mitad", leg(caso("MAD", "intestado", [H("p", "padre", 85)])).tercios.estricta, 150000);
  eq("Legítimas · solo cónyuge: usufructo de dos tercios (art. 838)", leg(caso("MAD", "intestado", [H("v", "conyuge", 70)])).viudo.valor, 200000 * 0.19);
  // Renuncia de un hijo: su parte pasa al otro por derecho propio (art. 985)
  L = leg(caso("MAD", "intestado", [H("a", "hijo", 45, { renuncia: true }), H("b", "hijo", 40)]));
  eq("Legítimas · renuncia: el otro hijo queda como único legitimario, dos tercios (arts. 808 y 823)", fila(L, "b").legitimaMinima, 200000);
  eq("Legítimas · renuncia: estado del renunciante", fila(L, "a").estado === "renuncia" ? 1 : 0, 1);
  eq("Legítimas · dos hijos: estricta de cada uno un sexto", leg(caso("MAD", "intestado", [H("a", "hijo", 45), H("b", "hijo", 40)])).herederos[0].legitimaMinima, 50000);
  eq("Legítimas · hijo único con viuda: dos tercios menos el usufructo legal (19 % de la mejora)", leg(caso("MAD", "intestado", [H("v", "conyuge", 70), H("a", "hijo", 45)])).herederos.find((h) => h.id === "a").legitimaMinima, 200000 - 100000 * 0.19);
  L = leg(caso("MAD", "porcentajes", [H("a", "hijo", 45, { pct: 40 }), H("b", "hijo", 40, { pct: 40 }), H("x", "extrano", 50, { pct: 20 })], [{ id: "c", tipo: "cuenta", valor: 300000 }, { id: "p", tipo: "inmueble", valor: 300000, legatarioId: "x" }]));
  eq("Legítimas · extraño con legado y cuota: cada hijo cubre su estricta", fila(L, "a").estado === "cubierta" ? 1 : 0, 1);
  eq("Legítimas · pero los descendientes no llegan a dos tercios (art. 823)", L.larga.estado === "vulnerada" && L.larga.deficit > 0 && L.intangibilidad.some((i) => /823/.test(i.norma)) ? 1 : 0, 1);
  // Preterición y desheredación en sucesión testada
  L = leg(caso("MAD", "porcentajes", [H("a", "hijo", 45, { pct: 100 }), H("b", "hijo", 40, { pct: 0 }), H("d", "hijo", 40, { pct: 0, desheredado: true }), { id: "n", nombre: "N", relacion: "nieto", edad: 10, estirpe: "D", pct: 0 }]), { hayEmpresa: true });
  eq("Legítimas · preterición del hijo sin atribución (art. 814)", L.intangibilidad.some((i) => i.tipo === "pretericion" && /\bB\b/.test(i.titulo)) ? 1 : 0, 1);
  eq("Legítimas · el nieto representa al desheredado (art. 857)", fila(L, "n").legitimaMinima, 100000 / 3, 0.01);
  eq("Legítimas · desheredado: estado propio y aviso (art. 851)", (fila(L, "d").estado === "desheredado" && L.intangibilidad.some((i) => i.tipo === "desheredacion")) ? 1 : 0, 1);
  eq("Legítimas · empresa: art. 1056.2", L.intangibilidad.some((i) => i.tipo === "empresa") ? 1 : 0, 1);
  // Donaciones colacionables se suman a la base (art. 818) y se imputan al donatario (art. 819)
  L = leg(caso("MAD", "porcentajes", [H("a", "hijo", 45, { pct: 50 }), H("b", "hijo", 40, { pct: 50 })]), { donaciones: [{ herederoId: "a", valor: 60000 }] });
  eq("Legítimas · base con donaciones", L.base, 360000);
  eq("Legítimas · donación imputada al donatario", fila(L, "a").recibe, 150000 + 60000);
  // Sin herederos forzosos: todo libre
  L = leg(caso("AND", "intestado", [H("h", "hermano", 60)]));
  eq("Legítimas · sin forzosos: libre disposición 100 %", L.tercios.libre, 300000);
  eq("Legítimas · sin forzosos: sin filas", L.herederos.length, 0);
  // Forales
  L = leg(caso("CAT", "porcentajes", [H("a", "hijo", 45, { pct: 100 }), H("b", "hijo", 40, { pct: 0 }), H("v", "conyuge", 70, { pct: 0 })], [{ id: "c", tipo: "cuenta", valor: 400000 }]));
  eq("Legítimas · Cataluña: cuarta parte (art. 451-5)", L.tercios.estricta, 100000);
  eq("Legítimas · Cataluña: individual entre los hijos (art. 451-6)", fila(L, "b").legitimaMinima, 50000);
  eq("Legítimas · Cataluña: hijo sin nada, vulnerada", fila(L, "b").estado === "vulnerada" ? 1 : 0, 1);
  eq("Legítimas · Cataluña: cónyuge no legitimario (cuarta viudal, art. 452-1)", L.viudo.sobre === "cuarta viudal" && !fila(L, "v") ? 1 : 0, 1);
  L = leg(caso("ALA", "porcentajes", [H("a", "hijo", 45, { pct: 100 }), H("b", "hijo", 40, { pct: 0 })]));
  eq("Legítimas · País Vasco: colectiva de un tercio (art. 49 Ley 5/2015)", L.colectiva.importe, 100000);
  eq("Legítimas · País Vasco: no se comprueba por cabezas", fila(L, "b").estado === "colectiva" && fila(L, "b").legitimaMinima === null ? 1 : 0, 1);
  eq("Legítimas · País Vasco: colectiva cubierta aunque un hijo no reciba nada", L.colectiva.estado === "cubierta" ? 1 : 0, 1);
  eq("Legítimas · Aragón: colectiva de la mitad (art. 486 CDFA)", leg(caso("ARA", "porcentajes", [H("a", "hijo", 45, { pct: 100 })])).colectiva.importe, 150000);
  eq("Legítimas · Galicia: cuarta parte y usufructo del viudo de 1/4 (arts. 243 y 253)", (() => { const G = leg(caso("GAL", "porcentajes", [H("a", "hijo", 45, { pct: 50 }), H("b", "hijo", 40, { pct: 50 }), H("v", "conyuge", 70, { pct: 0 })])); return G.tercios.estricta + G.viudo.valor; })(), 75000 + 75000 * 0.19);
  eq("Legítimas · Baleares: 5 hijos → mitad (art. 42)", leg(caso("BAL", "porcentajes", [1, 2, 3, 4, 5].map((i) => H("h" + i, "hijo", 40, { pct: 20 })))).tercios.estricta, 150000);
  eq("Legítimas · Navarra: legítima formal, todo libre (ley 267)", leg(caso("NAV", "porcentajes", [H("a", "hijo", 45, { pct: 100 }), H("b", "hijo", 40, { pct: 0 })])).tercios.libre, 300000);
  eq("Legítimas · foral sin testamento: no se afirma lesión", leg(caso("BAL", "intestado", [H("v", "conyuge", 70), H("a", "hijo", 45)])).herederos.some((h) => h.estado === "vulnerada") ? 0 : 1, 1);
  eq("Legítimas · vecindad civil común prevalece sobre la residencia fiscal", leg(caso("CAT", "porcentajes", [H("a", "hijo", 45, { pct: 100 })]), { vecindadCivil: "comun" }).regimen === "comun" ? 1 : 0, 1);
}


// ───────── 12. Auditoría independiente 01-10-2026: regresiones (valores calculados a mano por el auditor; los de Madrid, con la tarifa I-1) ─────────
{
  const B = (id, tipo, valor, extra = {}) => ({ id, tipo: tipo === "vivienda" ? "inmueble" : tipo, esViviendaHabitual: tipo === "vivienda", valor, valorReferencia: 0, titularidad: "privativo", porcentaje: 100, ...extra });
  const Pp = (id, relacion, edad, extra = {}) => ({ id, nombre: id, relacion, edad, inscrita: false, medio: false, discapacidad: 0, patrimonioPreexistente: 0, convivio2anios: false, renuncia: false, pct: 0, donacionesPreviasBL: 0, ...extra });
  const isd = (o) => calcularISD({ criterioVivienda: "DGT", noAplicarVivienda: false, ajuar: "sts", enPlazo: true, aplicarEmpresa: false, conyugeViviendaCatastral: 0, deudas: [], gastos: [], seguros: [], ...o });
  const h0 = (r, id) => (id ? r.herederos.find((h) => h.id === id) : r.herederos[0]);

  // I-1 · Tarifa de Madrid (8.313,20 €…): continuidad de cuotas y CI(984.000) = 199.604,23 + 185.182,80 × 34 % = 262.566,38
  const TM = REGLAS.MAD.tarifa().tramos;
  for (let i = 1; i < TM.length; i++) eq(`I-1 · tarifa Madrid tramo ${i}`, cuotaTarifa(TM[i][0] - 1e-4, TM), TM[i][1]);
  eq("I-1 · Madrid CI de 984.000 €", cuotaTarifa(984000, TM), 262566.38);
  eq("I-1 · Baleares III-IV conserva su tabla (fuera del alcance)", cuotaTarifa(100000, REGLAS.BAL.tarifa({}, "III").tramos), 9180 + 20000 * 0.1615);

  // C-1 · Madrid: grupos I-II sin requisito de plazo; grupo III solo pierde la bonificación tras requerimiento
  const M4 = (x = {}) => isd({ ccaa: "MAD", fechaFallecimiento: "2026-01-10", reparto: "porcentajes", herederos: [Pp("hijo", "hijo", 40, { pct: 100 })], bienes: [B("c", "cuenta", 1000000)], ...x });
  eq("C-1 · M4 hijo fuera de plazo: 99 % (auditor 2.625,66)", M4({ enPlazo: false }).total, 2625.66);
  eq("C-1 · M4 hijo en plazo", M4().total, 2625.66);
  eq("C-1 · M4 hijo con requerimiento: los grupos I-II la conservan", M4({ enPlazo: false, conRequerimiento: true }).total, 2625.66);
  eq("C-1 · fuera de plazo: aviso de recargos (art. 27 LGT)", M4({ enPlazo: false }).alertas.some((a) => /art\. 27 LGT/.test(a)) ? 1 : 0, 1);
  const M2 = (x = {}) => isd({ ccaa: "MAD", fechaFallecimiento: "2026-03-01", reparto: "porcentajes", herederos: [Pp("hermano", "hermano", 60, { pct: 100 })], bienes: [B("c", "cuenta", 400000)], ...x });
  eq("C-1 · hermano fuera de plazo sin requerimiento: 50 % (auditor 62.647,32)", M2({ enPlazo: false }).total, 62647.32);
  eq("C-1 · hermano con requerimiento: sin bonificación (CI 78.890,98 × 1,5882)", M2({ enPlazo: false, conRequerimiento: true }).total, 125294.65);

  // C-2 · Madrid, grupo III por fechas y parentesco. M3 yerno 2024: sin bonificación (auditor 47.518,94 con la tabla anterior; con I-1: CI 29.921,21 × 1,5882 = 47.520,87)
  const M3 = (rel, fecha, importe = 200000) => isd({ ccaa: "MAD", fechaFallecimiento: fecha, reparto: "porcentajes", herederos: [Pp("x", rel, 50, { pct: 100 })], bienes: [B("c", "cuenta", importe)] });
  eq("C-2 · M3 yerno 01-06-2024: afines sin bonificación antes del 01-07-2025", M3("yerno", "2024-06-01").total, 47520.87);
  eq("C-2 · M3 base liquidable 192.000 €", h0(M3("yerno", "2024-06-01")).baseLiquidable, 192000);
  eq("C-2 · M3b hermano 01-06-2021: 15 % (Ley 6/2018) → 47.520,87 − 7.128,13", M3("hermano", "2021-06-01").total, 40392.74);
  eq("C-2 · sobrino 2021: 10 % (17.652,89 − 1.765,29)", M3("sobrino", "2021-06-01", 100000).total, 15887.60);
  eq("C-2 · tío 2023: 25 % (Ley 7/2022)", M3("tio", "2023-06-01", 100000).total, 13239.67);
  eq("C-2 · hermano 2018: sin bonificación", M3("hermano", "2018-06-01", 100000).total, 17652.89);
  eq("C-2 · sobrino político 2024: sin bonificación", M3("sobrino_afin", "2024-06-01", 100000).total, 17652.89);
  eq("C-2 · sobrino político desde 01-07-2025: 50 % (Ley 2/2025)", M3("sobrino_afin", "2025-08-01", 100000).total, 8826.44);
  eq("C-2 · sobrino político es grupo III", h0(M3("sobrino_afin", "2025-08-01", 100000)).grupo === "III" ? 1 : 0, 1);

  // C-6 · Madrid, empresa: 95 % antes del 01-07-2026. Sobrino, 1.000.000 €, 01-03-2026 → BL 42.000; CI 3.737,66 + 1.996,64 × 11,9 % = 3.975,26 × 1,5882 = 6.313,51 → 50 % → 3.156,75
  // (auditor 3.158,93 con la tabla anterior: CI 3.978)
  const EMP = (fecha) => isd({ ccaa: "MAD", fechaFallecimiento: fecha, reparto: "porcentajes", aplicarEmpresa: true, herederos: [Pp("s", "sobrino", 40, { pct: 100 })], bienes: [B("e", "empresa", 1000000)] });
  eq("C-6 · Madrid empresa 01-03-2026: reducción del 95 %", -h0(EMP("2026-03-01")).traza.find((t) => /empresa/.test(t.paso)).valor, 950000);
  eq("C-6 · Madrid empresa 01-03-2026: base liquidable 42.000 €", h0(EMP("2026-03-01")).baseLiquidable, 42000);
  eq("C-6 · Madrid empresa 01-03-2026: a pagar", EMP("2026-03-01").total, 3156.75);
  eq("C-6 · Madrid empresa desde 01-07-2026: 99 %", -h0(EMP("2026-07-15")).traza.find((t) => /empresa/.test(t.paso)).valor, 990000);

  // I-4 · Parentesco para la reducción por empresa
  const EA = (rel, extra = {}) => isd({ ccaa: "AND", fechaFallecimiento: "2026-03-01", reparto: "porcentajes", aplicarEmpresa: true, herederos: [Pp("a", rel, 40, { pct: 100, ...extra })], bienes: [B("e", "empresa", 1000000)] });
  eq("I-4 · AND amigo sin requisitos laborales: sin reducción (223.620 × 1,9)", EA("extrano").total, 424878);
  eq("I-4 · AND amigo con requisitos laborales: 99 % (10.000 → 720 × 1,9)", EA("extrano", { requisitoLaboralEmpresa: true }).total, 1368);
  eq("I-4 · AND sobrino (grupo III): reducción sin exigir ausencia de descendientes", -h0(EA("sobrino")).traza.find((t) => /empresa/.test(t.paso)).valor, 990000);
  const EE = (hered) => isd({ ccaa: "EST", fechaFallecimiento: "2026-03-01", reparto: "porcentajes", aplicarEmpresa: true, herederos: hered, bienes: [B("e", "empresa", 1000000)] });
  const conHijo = EE([Pp("h", "hijo", 40, { pct: 50 }), Pp("x", "hermano", 60, { pct: 50 })]);
  eq("I-4 · estatal: hermano con descendientes del causante, sin reducción", h0(conHijo, "x").traza.some((t) => /empresa/.test(t.paso)) ? 0 : 1, 1);
  eq("I-4 · estatal: el hijo sí reduce", -h0(conHijo, "h").traza.find((t) => /empresa/.test(t.paso)).valor, 475000);
  eq("I-4 · estatal: aviso del parentesco", conHijo.alertas.some((a) => /20\.2\.c/.test(a) && /descendientes/.test(a)) ? 1 : 0, 1);
  eq("I-4 · estatal: hermano sin descendientes reduce el 95 %", -h0(EE([Pp("x", "hermano", 60, { pct: 100 })])).traza.find((t) => /empresa/.test(t.paso)).valor, 950000);
  eq("I-4 · estatal: extraño sin reducción", h0(EE([Pp("x", "extrano", 60, { pct: 100 })])).traza.some((t) => /empresa/.test(t.paso)) ? 0 : 1, 1);

  // I-5 · Ajuar solo a herederos (STS 24-06-2021): legatario extraño de 100.000 € en AND → 12.620 × 1,9 = 23.978
  const AJ = calcularISD({ ccaa: "AND", fechaFallecimiento: "2026-06-15", reparto: "porcentajes", ajuar: "3pct", herederos: [{ id: "h", nombre: "h", relacion: "hijo", edad: 40, pct: 50 }, { id: "a", nombre: "a", relacion: "extrano", edad: 40 }], bienes: [{ id: "c", tipo: "cuenta", valor: 900000, titularidad: "privativo" }, { id: "l", tipo: "cuenta", valor: 100000, titularidad: "privativo", legatarioId: "a" }] });
  eq("I-5 · ajuar: el 3 % incluye el legado", AJ.masa.ajuar, 30000);
  eq("I-5 · ajuar: el legatario no recibe ajuar", h0(AJ, "a").traza.find((t) => t.paso.startsWith("Ajuar")).valor, 0);
  eq("I-5 · ajuar: todo al heredero", h0(AJ, "h").traza.find((t) => t.paso.startsWith("Ajuar")).valor, 30000);
  eq("I-5 · legatario paga 23.978 € (auditor)", h0(AJ, "a").aIngresar, 23978);

  // C-3 · Legítimas: nietos con progenitor vivo o renunciante no son legitimarios
  const LG = (her, der) => calcularLegitimas({ herederos: her, derechos: der, masa: { neto: 300000, netoReparto: 300000 }, reparto: "porcentajes", ccaa: "AND" });
  const fl = (L, id) => L.herederos.find((h) => h.id === id);
  const L5 = LG([{ id: "h1", nombre: "h1", relacion: "hijo", edad: 40 }, { id: "n1", nombre: "n1", relacion: "nieto", edad: 10, estirpe: "h1" }], { h1: [{ tipo: "pleno", fraccion: 1 }] });
  eq("C-3 · L5 hijo único con un hijo vivo: mínimo dos tercios (200.000)", fl(L5, "h1").legitimaMinima, 200000);
  eq("C-3 · L5 el nieto no es legitimario", fl(L5, "n1").tipo === "no legitimario" && fl(L5, "n1").legitimaMinima === 0 && fl(L5, "n1").estado !== "vulnerada" ? 1 : 0, 1);
  eq("C-3 · L5 sin avisos de lesión ni preterición", L5.intangibilidad.length, 0);
  const L4 = LG([{ id: "h1", nombre: "h1", relacion: "hijo", edad: 40 }, { id: "h2", nombre: "h2", relacion: "hijo", edad: 38 }, { id: "n1", nombre: "n1", relacion: "nieto", edad: 10, estirpe: "h1" }], { h1: [{ tipo: "pleno", fraccion: 0.5 }], h2: [{ tipo: "pleno", fraccion: 0.5 }] });
  eq("C-3 · L4 dos hijos vivos: estricta 50.000 cada uno", fl(L4, "h1").legitimaMinima + fl(L4, "h2").legitimaMinima, 100000);
  eq("C-3 · L4 nieto no vulnerado y sin avisos", fl(L4, "n1").estado !== "vulnerada" && L4.intangibilidad.length === 0 ? 1 : 0, 1);
  const L3 = LG([{ id: "h1", nombre: "h1", relacion: "hijo", edad: 40, renuncia: true }, { id: "h2", nombre: "h2", relacion: "hijo", edad: 38 }, { id: "n1", nombre: "n1", relacion: "nieto", edad: 10, estirpe: "h1" }], { h2: [{ tipo: "pleno", fraccion: 1 }] });
  eq("C-3 · L3 renuncia: el otro hijo, único legitimario (200.000)", fl(L3, "h2").legitimaMinima, 200000);
  eq("C-3 · L3 el nieto del renunciante no es legitimario (art. 985.2)", fl(L3, "n1").tipo === "no legitimario" && fl(L3, "n1").estado !== "vulnerada" ? 1 : 0, 1);
  const LT = LG([{ id: "h1", nombre: "h1", relacion: "hijo", edad: 40, renuncia: true }, { id: "n1", nombre: "n1", relacion: "nieto", edad: 10, estirpe: "h1" }, { id: "n2", nombre: "n2", relacion: "nieto", edad: 12, estirpe: "h1" }], { n1: [{ tipo: "pleno", fraccion: 1 }] });
  eq("C-3 · renuncian todos los hijos: nietos por derecho propio, estricta por cabezas (n2 vulnerado, mínimo 50.000)", fl(LT, "n2").estado === "vulnerada" && fl(LT, "n2").legitimaMinima === 50000 ? 1 : 0, 1);
  const LM = LG([{ id: "h1", nombre: "h1", relacion: "hijo", edad: 40 }, { id: "n1", nombre: "n1", relacion: "nieto", edad: 10, estirpe: "h1" }], { h1: [{ tipo: "pleno", fraccion: 0.7 }], n1: [{ tipo: "pleno", fraccion: 0.3 }] });
  eq("C-3 · mejora a un nieto no legitimario: el hijo conserva su estricta y cubre", fl(LM, "h1").estado === "cubierta" && fl(LM, "h1").legitimaMinima === 110000 ? 1 : 0, 1);

  // C-4 · Intestada: medio hermanos y sobrinos (arts. 948-951 CC)
  const frx = (r, id) => (r.derechos[id] || []).reduce((s, d) => s + d.fraccion, 0);
  let I = repartoIntestado([{ id: "M1", nombre: "M1", relacion: "hermano", medio: true }, { id: "S1", nombre: "S1", relacion: "sobrino", estirpe: "H1" }]);
  eq("C-4 · I2b medio hermano 1/3", frx(I, "M1"), 1 / 3, 1e-9); eq("C-4 · I2b sobrino de doble vínculo 2/3", frx(I, "S1"), 2 / 3, 1e-9);
  I = repartoIntestado([{ id: "H1", nombre: "H1", relacion: "hermano" }, { id: "S2", nombre: "S2", relacion: "sobrino", estirpe: "M2", medio: true }]);
  eq("C-4 · I2c hermano de doble vínculo 2/3", frx(I, "H1"), 2 / 3, 1e-9); eq("C-4 · I2c sobrino de medio hermano 1/3", frx(I, "S2"), 1 / 3, 1e-9);
  I = repartoIntestado([{ id: "H1", nombre: "H1", relacion: "hermano" }, { id: "M1", nombre: "M1", relacion: "hermano", medio: true }, { id: "S1", nombre: "S1", relacion: "sobrino", estirpe: "H2" }]);
  eq("C-4 · I2 se mantiene: 2/5, 1/5, 2/5", frx(I, "H1") * 100 + frx(I, "M1") * 10 + frx(I, "S1"), 40 + 2 + 0.4, 1e-9);
  I = repartoIntestado([{ id: "M1", nombre: "M1", relacion: "hermano", medio: true }, { id: "S2", nombre: "S2", relacion: "sobrino", estirpe: "M2", medio: true }]);
  eq("C-4 · todos de medio vínculo: partes iguales", frx(I, "M1"), 0.5, 1e-9);
  I = repartoIntestado([{ id: "S1", nombre: "S1", relacion: "sobrino", estirpe: "H1" }, { id: "S2", nombre: "S2", relacion: "sobrino", estirpe: "M1", medio: true }]);
  eq("N-7 · solo sobrinos de doble y sencillo vínculo: por cabezas y aviso", frx(I, "S1") === 0.5 && I.avisos.some((a) => /951/.test(a)) ? 1 : 0, 1);
  const I5 = (rep, pct) => calcularISD({ ccaa: "AND", fechaFallecimiento: "2026-06-15", criterioVivienda: "DGT", ajuar: "sts", enPlazo: true, deudas: [], gastos: [], seguros: [], bienes: [{ id: "c", tipo: "cuenta", valor: 300000, titularidad: "privativo" }], reparto: rep, herederos: [{ id: "M1", nombre: "M1", relacion: "hermano", edad: 50, medio: true, pct: pct ? 100 / 3 : 0 }, { id: "S1", nombre: "S1", relacion: "sobrino", edad: 30, estirpe: "H1", pct: pct ? 200 / 3 : 0 }] });
  eq("C-4 · ISD AND 300.000 €: sobrino paga 44.430 € (auditor)", h0(I5("intestado"), "S1").aIngresar, 44430);
  eq("C-4 · ISD AND 300.000 €: medio hermano paga 16.530 € (auditor)", h0(I5("intestado"), "M1").aIngresar, 16530);

  // I-7 · Cónyuge separado legalmente o de hecho
  I = repartoIntestado([{ id: "C", nombre: "C", relacion: "conyuge", separado: true }, { id: "H", nombre: "H", relacion: "hermano" }]);
  eq("I-7 · intestada: el cónyuge separado no desplaza al hermano (art. 945)", frx(I, "H") * 10 + frx(I, "C"), 10);
  eq("I-7 · intestada: aviso del separado", I.avisos.some((a) => /945/.test(a)) ? 1 : 0, 1);
  I = repartoIntestado([{ id: "C", nombre: "C", relacion: "conyuge", separado: true, edad: 60 }, { id: "H", nombre: "H", relacion: "hijo" }]);
  eq("I-7 · intestada con hijo: sin usufructo del separado", frx(I, "C") === 0 && frx(I, "H") === 1 ? 1 : 0, 1);
  const LS = LG([{ id: "C", nombre: "C", relacion: "conyuge", edad: 60, separado: true }, { id: "h", nombre: "h", relacion: "hijo", edad: 30 }], { h: [{ tipo: "pleno", fraccion: 1 }] });
  eq("I-7 · legítimas: el separado no es legitimario (art. 834)", LS.viudo === null && !fl(LS, "C") ? 1 : 0, 1);

  // N-3 · Usufructo universal: el nieto cuyo progenitor vive no recibe nuda propiedad
  I = repartoUsufructoUniversal([{ id: "C", nombre: "C", relacion: "conyuge" }, { id: "A", nombre: "Ana", relacion: "hijo" }, { id: "N", nombre: "N", relacion: "nieto", estirpe: "Ana" }]);
  eq("N-3 · usufructo universal: nuda propiedad solo a la hija", frx(I, "A") === 1 && frx(I, "N") === 0 ? 1 : 0, 1);

  // C-5 · Plusvalía: pareja de hecho no inscrita como extraño (Madrid 9.280 €, Marbella 5.800 €)
  const inm = (o) => ({ cuota: 1, reduccionVC: 0, esViviendaHabitual: true, ...o });
  const madrid = inm({ municipio: "MADRID", valorCatastralTotal: 200000, valorCatastralSuelo: 80000, adquisicion: { fecha: "2000-01-01", valor: 90000 }, valorTransmision: 450000 });
  const pvM = (her) => calcularPlusvalia({ inmueble: madrid, titulares: [{ heredero: { nombre: "p", ...her }, fraccion: 1 }], fecha: "2026-06-15" });
  eq("C-5 · Madrid, pareja no inscrita: sin bonificación (auditor 9.280)", pvM({ relacion: "pareja_hecho", inscrita: false }).total, 9280);
  eq("C-5 · Madrid, pareja no inscrita sin marcar: igual que en el ISD", pvM({ relacion: "pareja_hecho" }).total, 9280);
  eq("C-5 · Madrid, pareja inscrita: 85 % (1.392)", pvM({ relacion: "pareja_hecho", inscrita: true }).total, 1392);
  eq("C-5 · Madrid, hijo: 85 % (1.392, auditor P3)", pvM({ relacion: "hijo" }).total, 1392);
  eq("C-5 · Marbella, pareja no inscrita: sin bonificación (auditor 5.800)", calcularPlusvalia({ inmueble: inm({ municipio: "MARBELLA", valorCatastralTotal: 100000, valorCatastralSuelo: 50000, adquisicion: { fecha: "2000-07-01", valor: 50000 }, valorTransmision: 300000 }), titulares: [{ heredero: { nombre: "p", relacion: "pareja_hecho", inscrita: false }, fraccion: 1 }], fecha: "2026-06-15" }).total, 5800);
  // titularPlus de la app (src/app/logic.js): se evalúa la función tal como está escrita
  {
    const src = readFileSync(new URL("./app/logic.js", import.meta.url), "utf8");
    const linea = src.split("\n").find((l) => l.startsWith("const titularPlus = "));
    const num = (v) => (v === "" || v == null ? 0 : Number(v));
    const titularPlus = new Function("num", linea.replace("const titularPlus = ", "return ").replace(/;\s*$/, ""))(num);
    eq("C-5 · app titularPlus: pareja no inscrita → pareja_no_inscrita", titularPlus({ id: "p", nombre: "P", relacion: "pareja_hecho", inscrita: false }).relacion === "pareja_no_inscrita" ? 1 : 0, 1);
    eq("C-5 · app titularPlus: pareja inscrita se mantiene", titularPlus({ id: "p", nombre: "P", relacion: "pareja_hecho", inscrita: true }).relacion === "pareja_hecho" ? 1 : 0, 1);
    eq("I-6 · app titularPlus: pasa colectivoVulnerable", titularPlus({ id: "p", nombre: "P", relacion: "hijo", colectivoVulnerable: true }).colectivoVulnerable === true ? 1 : 0, 1);
  }

  // C-7 · Plusvalía del 1 al 27-01-2026: coeficientes del RDL 16/2025 (≥ 20 años: 0,35). Málaga, suelo 50.000 → 50.000 × 0,35 × 29 % = 5.075 (auditor P1b)
  const P1 = (fecha, extra = {}) => calcularPlusvalia({ inmueble: inm({ municipio: "MALAGA", valorCatastralTotal: 120000, valorCatastralSuelo: 50000, adquisicion: { fecha: "1995-03-01", valor: 60000 }, valorTransmision: 250000, bonifManual: 0, ...extra }), titulares: [{ heredero: { nombre: "hijo", relacion: "hijo", convivio2anios: true }, fraccion: 1 }], fecha });
  eq("C-7 · P1b 15-01-2026: coeficiente 0,35", P1("2026-01-15").coeficiente, 0.35);
  eq("C-7 · P1b 15-01-2026: cuota 5.075 €", P1("2026-01-15").cuota, 5075);
  eq("C-7 · 9 años de tenencia el 15-01-2026: 0,21", P1("2026-01-15", { adquisicion: { fecha: "2017-01-01", valor: 60000 } }).coeficiente, 0.21);
  eq("C-7 · 28-01-2026: coeficientes de 2024 (0,40) con aviso de duda", P1("2026-01-28").coeficiente === 0.40 && P1("2026-01-28").alertas.some((a) => /28-01-2026/.test(a)) ? 1 : 0, 1);
  eq("C-7 · 01-02-2026: coeficientes de 2024 sin aviso", P1("2026-02-01").coeficiente === 0.40 && P1("2026-02-01").alertas.length === 0 ? 1 : 0, 1);
  eq("C-7 · ordenanza con coeficiente propio limitado por el del RDL 16/2025", calcularPlusvalia({ inmueble: inm({ municipio: "GUADALAJARA", valorCatastralTotal: 120000, valorCatastralSuelo: 48000, adquisicion: { fecha: "2004-01-01", valor: 90000 }, valorTransmision: 200000 }), titulares: [{ heredero: { nombre: "H", relacion: "hermano" }, fraccion: 1 }], fecha: "2026-01-15" }).coeficiente, 0.35);
  // I-3 · Ventana del RDL 9/2024 (01-22/01/2025)
  eq("I-3 · aviso RDL 9/2024 para el 10-01-2025", P1("2025-01-10").alertas.some((a) => /RDL 9\/2024/.test(a)) ? 1 : 0, 1);
  eq("I-3 · sin aviso el 24-01-2025", P1("2025-01-24").alertas.some((a) => /RDL 9\/2024/.test(a)) ? 0 : 1, 1);
  // N-5 · Método real: aviso de que es a instancia del contribuyente. P4 Málaga (auditor 725 €)
  const P4 = calcularPlusvalia({ inmueble: inm({ municipio: "MALAGA", valorCatastralTotal: 150000, valorCatastralSuelo: 60000, adquisicion: { fecha: "2025-11-20", valor: 300000 }, valorTransmision: 310000 }), titulares: [{ heredero: { nombre: "hijo", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-06-15" });
  eq("N-5 · P4 sigue en 725 € con aviso del método real", P4.total === 725 && P4.alertas.some((a) => /107\.5/.test(a)) ? 1 : 0, 1);

  // I-6 · Málaga, colectivo vulnerable: pensionista conviviente, valor catastral 180.000 € → 95 % (sin la marca, 70 %)
  const MV = (h) => calcularPlusvalia({ inmueble: inm({ municipio: "MALAGA", valorCatastralTotal: 180000, valorCatastralSuelo: 60000, adquisicion: { fecha: "2000-01-01", valor: 60000 }, valorTransmision: 250000 }), titulares: [{ heredero: { nombre: "h", relacion: "hijo", convivio2anios: true, ingresosAnuales: 12000, ...h }, fraccion: 1 }], fecha: "2026-06-15" }).porTitular[0].bonificacionPct;
  eq("I-6 · Málaga colectivo vulnerable: 95 %", MV({ colectivoVulnerable: true }), 0.95);
  eq("I-6 · Málaga sin la marca: 70 %", MV({}), 0.70);

  // I-2 · Plazos: traslado al siguiente día hábil (art. 30.5 Ley 39/2015)
  const PZ = (f) => Object.fromEntries(calcularPlazos(f, { hayInmuebles: true }).map((x) => [x.id, x]));
  eq("I-2 · 12-04-2026: el ISD vence el 13-10-2026 (12-10 es fiesta nacional)", PZ("2026-04-12").isd.limite === "2026-10-13" ? 1 : 0, 1);
  eq("I-2 · 12-04-2026: plusvalía 13-10-2026", PZ("2026-04-12").plusvalia.limite === "2026-10-13" ? 1 : 0, 1);
  eq("I-2 · 12-04-2026: prórroga hasta el 14-09-2026 (12-09 es sábado)", PZ("2026-04-12").prorroga_isd.limite === "2026-09-14" ? 1 : 0, 1);
  eq("I-2 · 12-04-2026: prescripción desde el fin del plazo trasladado", PZ("2026-04-12").prescripcion.limite === "2030-10-13" ? 1 : 0, 1);
  eq("I-2 · 06-06-2026: 06-12 domingo → 07-12 (solo festivos nacionales)", PZ("2026-06-06").isd.limite === "2026-12-07" ? 1 : 0, 1);
  eq("I-2 · últimas voluntades: 15 hábiles descontando el 1 de mayo", PZ("2026-04-12").ultimas_voluntades.desde === "2026-05-04" ? 1 : 0, 1);
  eq("I-2 · 25-12-2026 → 28-12-2026", aHabil("2026-12-25") === "2026-12-28" ? 1 : 0, 1);

  // I-8 · Madrid: aviso sobre el registro de la pareja (Ley 11/2001)
  const PM = (x) => isd({ ccaa: "MAD", fechaFallecimiento: "2026-06-15", reparto: "porcentajes", herederos: [Pp("p", "pareja_hecho", 60, { pct: 100, inscrita: true, ...x })], bienes: [B("c", "cuenta", 100000)] });
  eq("I-8 · Madrid pareja inscrita: aviso de la Ley 11/2001", PM({}).alertas.some((a) => /11\/2001/.test(a)) ? 1 : 0, 1);
  eq("I-8 · Madrid pareja inscrita en otro registro: aviso del grupo IV", PM({ registroPareja: "AND" }).alertas.some((a) => /grupo IV/.test(a)) ? 1 : 0, 1);
}

// ───────── 13. Mesa jurídica · cambios del motor CM-001 a CM-004 (valores de claude/herencias/cambios-motor-propuestos.md) ─────────
{
  const hh = (r, id) => (id ? r.herederos.find((h) => h.id === id) : r.herederos[0]);
  const paso = (h, re) => h.traza.find((t) => re.test(t.paso));
  const base = (o) => calcularISD({ fechaFallecimiento: "2026-03-01", criterioVivienda: "DGT", enPlazo: true, aplicarEmpresa: false, deudas: [], gastos: [], seguros: [], ...o });
  const C = (id, valor, extra = {}) => ({ id, tipo: "cuenta", valor, titularidad: "privativo", ...extra });
  const Hd = (id, relacion, edad, extra = {}) => ({ id, nombre: id, relacion, edad, patrimonioPreexistente: 0, ...extra });

  // CM-001 · Madrid: tarifa del art. 23 y coeficientes del art. 24 (VERIFICADO); Baleares III-IV con su propia copia (PENDIENTE)
  const m1 = base({ ccaa: "MAD", ajuar: "ninguno", reparto: "intestado", herederos: [Hd("h", "hijo", 30)], bienes: [C("c", 300000)] });
  eq("CM-001 · MAD hijo 300.000 €: BL 284.000", hh(m1).baseLiquidable, 284000);
  eq("CM-001 · MAD hijo: cuota íntegra 51.350,98", hh(m1).cuotaIntegra, 51350.98);
  eq("CM-001 · MAD hijo: a ingresar 513,51", m1.total, 513.51);
  const m2 = base({ ccaa: "MAD", ajuar: "ninguno", reparto: "intestado", herederos: [Hd("s", "sobrino", 30)], bienes: [C("c", 100000)] });
  eq("CM-001 · MAD sobrino 100.000 €: BL 92.000", hh(m2).baseLiquidable, 92000);
  eq("CM-001 · MAD sobrino: CI 11.115,03", hh(m2).cuotaIntegra, 11115.03);
  eq("CM-001 · MAD sobrino: ×1,5882 = 17.652,89", hh(m2).cuotaTributaria, 17652.89);
  eq("CM-001 · MAD sobrino: bonificación 50 % → 8.826,44", m2.total, 8826.44);
  const TMAD = REGLAS.MAD.tarifa().tramos;
  eq("CM-001 · cuotaTarifa(798.817,20) = 199.604,23", cuotaTarifa(798817.20, TMAD), 199604.23);
  eq("CM-001 · cuotaTarifa(8.313,20) = 635,96", cuotaTarifa(8313.20, TMAD), 635.96);
  eq("CM-001 · MAD tarifa VERIFICADO", REGLAS.MAD.tarifa().estado === "VERIFICADO" ? 1 : 0, 1);
  eq("CM-001 · MAD coeficientes VERIFICADO", REGLAS.MAD.coef({}, "III", 0, 1000).estado === "VERIFICADO" ? 1 : 0, 1);
  eq("CM-001 · Baleares III-IV: tabla propia (no la de Madrid) y PENDIENTE", REGLAS.BAL.tarifa({}, "III").tramos !== TMAD && REGLAS.BAL.tarifa({}, "IV").estado === "PENDIENTE" && REGLAS.BAL.tarifa({}, "III").tramos[1][0] === 8000 ? 1 : 0, 1);

  // CM-002 · Nuda propiedad: tipo medio efectivo sobre el valor íntegro (art. 26.a LISD; art. 51.2 RISD). Cónyuge 70 años (usufructo 19 %), hijo 40
  const nu = (ccaa, valor) => base({ ccaa, ajuar: "ninguno", reparto: "usufructoUniversal", herederos: [Hd("v", "conyuge", 70), Hd("h", "hijo", 40)], bienes: [C("c", valor)] });
  const n1 = hh(nu("EST", 300000), "h");
  eq("CM-002 · EST nuda 243.000: BL 227.043,13", n1.baseLiquidable, 227043.13);
  eq("CM-002 · EST BL teórica 284.043,13", paso(n1, /^Base liquidable teórica/).valor, 284043.13);
  eq("CM-002 · EST cuota tributaria teórica 51.397,81", paso(n1, /^Cuota tributaria teórica/).valor, 51397.81);
  eq("CM-002 · EST tipo medio 18,10 % (en la traza)", paso(n1, /^Cuota íntegra/).tipoMedio, 18.10, 1e-9);
  eq("CM-002 · EST tipo medio expuesto en el heredero", n1.tipoMedio, 18.10, 1e-9);
  eq("CM-002 · EST cuota 41.094,81 (antes 37.387,51)", n1.aIngresar, 41094.81);
  eq("CM-002 · EST traza: puntos doctrinales PENDIENTES", paso(n1, /^Base liquidable teórica/).estado === "PENDIENTE" && /DGT/.test(paso(n1, /^Base liquidable teórica/).norma) ? 1 : 0, 1);
  eq("CM-002 · EST traza: regla VERIFICADA", paso(n1, /^Cuota íntegra/).estado === "VERIFICADO" && /51\.2/.test(paso(n1, /^Cuota íntegra/).norma) ? 1 : 0, 1);
  const n2r = nu("AND", 1500000), n2 = hh(n2r, "h");
  eq("CM-002 · AND nuda 1.215.000: BL 215.000", n2.baseLiquidable, 215000);
  eq("CM-002 · AND tipo medio 19,92 %", n2.tipoMedio, 19.92, 1e-9);
  eq("CM-002 · AND cuota 42.828,00", n2.cuotaTributaria, 42828);
  eq("CM-002 · AND bonificación 99 % → 428,28 (antes 349,20)", n2.aIngresar, 428.28);
  eq("CM-002 · aviso (a): extinción del usufructo con el tipo medio guardado", n2r.alertas.some((a) => /26\.c/.test(a) && /19,92/.test(a)) ? 1 : 0, 1);
  eq("CM-002 · el usufructuario no usa tipo medio", hh(n2r, "v").tipoMedio === undefined ? 1 : 0, 1);
  eq("CM-002 · pleno dominio sin nuda: sin tipo medio", hh(m1).tipoMedio === undefined ? 1 : 0, 1);
  const n0 = hh(nu("EST", 18000), "h");
  eq("CM-002 · BL real 0: no paga, pero guarda el tipo medio (BL teórica 2.043,13 → 7,65 %)", n0.aIngresar === 0 && n0.tipoMedio === 7.65 ? 1 : 0, 1);
  eq("CM-002 · BL real 0: reducción no agotada 1.376,87 para la consolidación", n0.reduccionNoAgotada, 1376.87);
  eq("CM-002 · valor del usufructo que grava la nuda (19 % de 18.000)", n0.valorUsufructoNuda, 3420);
  const n3 = base({ ccaa: "EST", ajuar: "ninguno", reparto: "usufructoUniversal", herederos: [Hd("v", "conyuge", 70, { renuncia: true }), Hd("h", "hijo", 40)], bienes: [C("c", 300000)] });
  eq("CM-002 · aviso (e): renuncia del cónyuge a un usufructo aceptado", n3.alertas.some((a) => /51\.6/.test(a)) ? 1 : 0, 1);
  eq("CM-002 · pctUsufructoVitalicio(19) = 0,70", pctUsufructoVitalicio(19), 0.70, 1e-9);
  eq("CM-002 · pctUsufructoVitalicio(20) = 0,69", pctUsufructoVitalicio(20), 0.69, 1e-9);
  eq("CM-002 · pctUsufructoVitalicio(79) = 0,10", pctUsufructoVitalicio(79), 0.10, 1e-9);
  eq("CM-002 · pctUsufructoVitalicio(95) = 0,10", pctUsufructoVitalicio(95), 0.10, 1e-9);
  eq("CM-002 · pctUsufructoTemporal(40) = 0,70", pctUsufructoTemporal(40), 0.70, 1e-9);

  // CM-003 · Ajuar: modo "residencial" por defecto (salvo AND), imputación por la porción (art. 23.2 RISD)
  const casa = (extra = {}) => ({ id: "v", tipo: "inmueble", valor: 300000, titularidad: "privativo", esViviendaHabitual: true, ...extra });
  const bienesA = [casa(), C("c", 200000), { id: "a", tipo: "valores", valor: 100000, titularidad: "privativo" }, { id: "p", tipo: "inmueble", valor: 150000, titularidad: "privativo", arrendadoOCedido: true }];
  const a1 = base({ ccaa: "EST", reparto: "intestado", herederos: [Hd("h", "hijo", 40)], bienes: bienesA });
  eq("CM-003 · EST por defecto: ajuar 9.000,00", a1.masa.ajuar, 9000);
  eq("CM-003 · EST por defecto: modo residencial", a1.masa.modoAjuar === "residencial" ? 1 : 0, 1);
  eq("CM-003 · EST BI 759.000,00", hh(a1).baseImponible, 759000);
  eq("CM-003 · EST BL 620.436,66", hh(a1).baseLiquidable, 620436.66);
  eq("CM-003 · EST a ingresar 146.598,67", a1.total, 146598.67);
  eq("CM-003 · \"sts\" (expedientes antiguos) = modo por defecto", base({ ccaa: "EST", ajuar: "sts", reparto: "intestado", herederos: [Hd("h", "hijo", 40)], bienes: bienesA }).masa.ajuar, 9000);
  const a3p = base({ ccaa: "EST", ajuar: "3pct", reparto: "intestado", herederos: [Hd("h", "hijo", 40)], bienes: bienesA });
  eq("CM-003 · \"3pct\" manual: 22.500 y alerta STS/TEAC", a3p.masa.ajuar === 22500 && a3p.alertas.some((a) => /STS 499\/2020/.test(a) && /TEAC/.test(a)) ? 1 : 0, 1);
  eq("CM-003 · segunda vivienda marcada de uso residencial entra en la base", base({ ccaa: "EST", reparto: "intestado", herederos: [Hd("h", "hijo", 40)], bienes: [casa(), { id: "s", tipo: "inmueble", valor: 100000, titularidad: "privativo", usoResidencial: true }] }).masa.ajuar, 12000);
  eq("CM-003 · vivienda habitual cedida: fuera de la base", base({ ccaa: "EST", reparto: "intestado", herederos: [Hd("h", "hijo", 40)], bienes: [casa({ arrendadoOCedido: true })] }).masa.ajuar, 0);
  const a2 = base({ ccaa: "EST", reparto: "porcentajes", herederos: [Hd("A", "hijo", 40, { pct: 50 }), Hd("B", "hijo", 40, { pct: 50 }), Hd("C", "sobrino", 40)], bienes: [casa({ valor: 200000 }), C("l", 100000, { legatarioId: "C" })] });
  const ajI = (id) => paso(hh(a2, id), /^Ajuar/).valor;
  eq("CM-003 · porcentajes con legado: ajuar 6.000,00", a2.masa.ajuar, 6000);
  eq("CM-003 · imputación A 3.000 · B 3.000 · C 0 (art. 23.2 RISD)", ajI("A") === 3000 && ajI("B") === 3000 && ajI("C") === 0 ? 1 : 0, 1);
  const a3 = base({ ccaa: "EST", reparto: "intestado", conyugeViviendaCatastral: 120000, herederos: [Hd("w", "conyuge", 70), Hd("h", "hijo", 40)], bienes: bienesA });
  eq("CM-003 · con viudo: 9.000 − 3 % de 120.000 = 5.400,00", a3.masa.ajuar, 5400);
  const aAnd = base({ ccaa: "AND", reparto: "intestado", herederos: [Hd("h", "hijo", 40)], bienes: [...bienesA, { id: "o", tipo: "otro", valor: 10000, titularidad: "privativo" }] });
  eq("CM-003 · AND por defecto: modo \"ata\" (3 % de bienes de uso personal) y PENDIENTE", aAnd.masa.modoAjuar === "ata" && aAnd.masa.ajuar === 300 && paso(hh(aAnd), /^Ajuar/).estado === "PENDIENTE" ? 1 : 0, 1);
  eq("CM-003 · \"ninguno\": sin ajuar", m1.masa.ajuar, 0);

  // CM-004 · Plusvalía: estado de los coeficientes máximos
  const pvc = (adq, suelo, fecha = "2026-06-15") => calcularPlusvalia({ inmueble: { municipio: "OTRO", tipoManual: 30, cuota: 1, valorCatastralTotal: suelo * 2.5, valorCatastralSuelo: suelo, adquisicion: { fecha: adq, valor: 90000 }, valorTransmision: 400000 }, titulares: [{ heredero: { nombre: "H", relacion: "hijo" }, fraccion: 1 }], fecha });
  const q1 = pvc("2004-01-01", 48000);
  eq("CM-004 · 22 años: coeficiente 0,40", q1.coeficiente, 0.40, 1e-9);
  eq("CM-004 · base objetiva 19.200,00", q1.baseObjetiva, 19200);
  eq("CM-004 · cuota 5.760,00", q1.cuota, 5760);
  eq("CM-004 · RDL 8/2023: VERIFICADO", q1.estadoCoef === "VERIFICADO" && /RDL 8\/2023/.test(q1.normaCoef) ? 1 : 0, 1);
  const q2 = pvc("2019-01-01", 60000);
  eq("CM-004 · 7 años: coeficiente 0,20", q2.coeficiente, 0.20, 1e-9);
  eq("CM-004 · cuota 3.600,00", q2.cuota, 3600);
  const q3 = pvc("2004-01-01", 48000, "2026-01-15");
  eq("CM-004 · 15-01-2026: RDL 16/2025 (0,35) y PENDIENTE", q3.coeficiente === 0.35 && q3.estadoCoef === "PENDIENTE" ? 1 : 0, 1);
}

// ───────── 14. Renuncia al usufructo universal, nota del art. 22.3 y plazos unificados (04-10-2026) ─────────
{
  const base = (o) => calcularISD({ fechaFallecimiento: "2026-03-01", criterioVivienda: "DGT", enPlazo: true, aplicarEmpresa: false, ajuar: "ninguno", deudas: [], gastos: [], seguros: [], ...o });
  const C = (id, valor, extra = {}) => ({ id, tipo: "cuenta", valor, titularidad: "privativo", ...extra });
  const Hd = (id, relacion, edad, extra = {}) => ({ id, nombre: id, relacion, edad, patrimonioPreexistente: 0, ...extra });
  const hh = (r, id) => r.herederos.find((h) => h.id === id);

  // 14.1 · Renuncia del cónyuge al usufructo universal (antes: ningún derecho y todas las cuotas a 0 €).
  // El legado de usufructo renunciado no tiene efecto y se refunde en la masa (art. 888 CC): los hijos, nudos propietarios, consolidan el pleno dominio.
  // A mano (Estado, 300.000 € en cuenta, dos hijos de 40 y 38 años): cada hijo 150.000 € en pleno dominio = BI 150.000;
  // reducción grupo II 15.956,87 → BL 134.043,13; cuota = 15.606,22 + (134.043,13 − 119.757,67) × 18,70 % = 15.606,22 + 2.671,38 = 18.277,60;
  // coeficiente ×1 (patrimonio 0) → 18.277,60 cada uno, 36.555,20 en total. El viudo renunciante no liquida.
  const ru = base({ ccaa: "EST", reparto: "usufructoUniversal", herederos: [Hd("v", "conyuge", 70, { renuncia: true }), Hd("a", "hijo", 40), Hd("b", "hijo", 38)], bienes: [C("c", 300000)] });
  const rep = repartoUsufructoUniversal([Hd("v", "conyuge", 70, { renuncia: true }), Hd("a", "hijo", 40), Hd("b", "hijo", 38)]);
  eq("14.1 · reparto: cada hijo, pleno dominio de la mitad", rep.derechos.a.length === 1 && rep.derechos.a[0].tipo === "pleno" && rep.derechos.a[0].fraccion === 0.5 && !rep.derechos.v ? 1 : 0, 1);
  eq("14.1 · nota del reparto cita el art. 888 CC", rep.notas.some((n) => /art\. 888 CC/.test(n)) ? 1 : 0, 1);
  eq("14.1 · hijo: BI 150.000", hh(ru, "a").baseImponible, 150000);
  eq("14.1 · hijo: BL 134.043,13", hh(ru, "a").baseLiquidable, 134043.13);
  eq("14.1 · hijo: cuota 18.277,60", hh(ru, "a").aIngresar, 18277.60);
  eq("14.1 · total 36.555,20 (antes 0 €)", ru.total, 36555.20);
  eq("14.1 · el renunciante no liquida", hh(ru, "v") ? 0 : 1, 1);
  eq("14.1 · sin tipo medio de nuda (ya no hay nuda propiedad)", hh(ru, "a").tipoMedio === undefined ? 1 : 0, 1);
  eq("14.1 · alerta fiscal de la renuncia: arts. 28 LISD y 58 RISD, pura y a favor de persona determinada", ru.alertas.some((a) => /Renuncia al usufructo universal/.test(a) && /28\.1 Ley 29\/1987/.test(a) && /58\.1 RD 1629\/1991/.test(a) && /28\.2/.test(a)) ? 1 : 0, 1);
  // Andalucía, mismo caso: 150.000 por hijo, reducción de 1.000.000 → 0 €
  eq("14.1 · AND: 0 € (reducción del art. 28 Ley 5/2021)", base({ ccaa: "AND", reparto: "usufructoUniversal", herederos: [Hd("v", "conyuge", 70, { renuncia: true }), Hd("a", "hijo", 40), Hd("b", "hijo", 38)], bienes: [C("c", 300000)] }).total, 0);
  // Renuncia de la pareja inscrita: mismo efecto. Un hijo único recibe 300.000: BL 284.043,13 → 40.011,04 + 44.654,00 × 25,5 % = 51.397,81 (EST)
  const rp = base({ ccaa: "EST", reparto: "usufructoUniversal", herederos: [Hd("p", "pareja_hecho", 60, { inscrita: true, renuncia: true }), Hd("a", "hijo", 40)], bienes: [C("c", 300000)] });
  eq("14.1 · renuncia de la pareja: hijo único por el todo (51.397,81)", hh(rp, "a").aIngresar, 51397.81);
  // Sin renuncia, el reparto no cambia (nuda propiedad)
  eq("14.1 · sin renuncia: el hijo sigue con nuda propiedad", hh(base({ ccaa: "EST", reparto: "usufructoUniversal", herederos: [Hd("v", "conyuge", 70), Hd("a", "hijo", 40)], bienes: [C("c", 300000)] }), "a").derechos[0].tipo === "nuda" ? 1 : 0, 1);
  // Alerta general de renuncia (art. 28.1): propio parentesco, coeficiente del renunciante si es mayor. Hijo renuncia, hereda el sobrino por porcentajes
  const rg = base({ ccaa: "EST", reparto: "porcentajes", herederos: [Hd("s", "sobrino", 40, { pct: 50 }), Hd("e", "extrano", 40, { pct: 50, renuncia: true }), Hd("h", "hijo", 40, { pct: 0, renuncia: true })], bienes: [C("c", 100000)] });
  eq("14.1 · alerta general: propio parentesco y coeficiente del renunciante si es superior (art. 58.1 RISD)", rg.alertas.some((a) => /no tributa por ella con el parentesco del renunciante/.test(a) && /58\.1 RD 1629\/1991/.test(a)) ? 1 : 0, 1);

  // 14.2 · Nota del art. 22.3 (mitad de gananciales en el patrimonio previo del viudo), solo si el coeficiente depende de ese patrimonio
  const coefPaso = (r, id) => hh(r, id).traza.find((t) => /^Coeficiente multiplicador/.test(t.paso)).paso;
  const gan = (ccaa, v) => base({ ccaa, vecindadCivil: "comun", reparto: "intestado", herederos: [Hd("v", "conyuge", 70), Hd("a", "hijo", 40)], bienes: [C("g", v, { titularidad: "ganancial" })] });
  // EST: 1.000.000 gananciales → mitad del viudo 500.000 > 402.678,11 → ×1,05 (grupo II): la nota explica el salto
  eq("14.2 · EST, gananciales 1.000.000: ×1,05 con nota del art. 22.3", /×1\.05/.test(coefPaso(gan("EST", 1000000), "v")) && /22\.3/.test(coefPaso(gan("EST", 1000000), "v")) ? 1 : 0, 1);
  // EST: 200.000 gananciales → mitad 100.000, primer tramo → ×1 y sin nota
  eq("14.2 · EST, gananciales 200.000: primer tramo, sin nota", /22\.3/.test(coefPaso(gan("EST", 200000), "v")) ? 0 : 1, 1);
  // AND: coeficiente fijo (art. 38 Ley 5/2021), aunque la mitad sea de 5.000.000 → sin nota
  eq("14.2 · AND, gananciales 10.000.000: sin nota (no depende del patrimonio)", /22\.3/.test(coefPaso(gan("AND", 10000000), "v")) ? 0 : 1, 1);
  // Forales sin coeficientes: sin nota
  // Prueba fiscal: con viudo, la sucesión intestada vasca no está modelada (control de calidad 07-10-2026, I6) y se bloquea; se fija la vecindad común
  eq("14.2 · BIZ, gananciales 10.000.000: sin nota", /22\.3/.test(coefPaso({ ...gan("BIZ", 10000000) }, "v")) ? 0 : 1, 1);

  // 14.3 · Plazos: la misma fecha en calcularPlazos (Diagnóstico) y en el catálogo de trámites (Trámites, Agenda, .ics)
  const PZ = (f, o = {}) => Object.fromEntries(calcularPlazos(f, { hayInmuebles: true, ...o }).map((x) => [x.id, x]));
  const TRM = (f, o = {}) => Object.fromEntries(tramitesDe({ fecha: f, inmuebles: 1, nHerederos: 2, situ: {}, ...o }).map((x) => [x.id, x]));
  // 04-04-2026 + 6 meses = domingo 04-10-2026 → lunes 05-10-2026 en las dos vistas (antes Trámites decía 04-10)
  eq("14.3 · 04-04-2026: ISD 05-10-2026 en Diagnóstico", PZ("2026-04-04").isd.limite === "2026-10-05" ? 1 : 0, 1);
  eq("14.3 · 04-04-2026: ISD 05-10-2026 en Trámites", TRM("2026-04-04").isd.limite === "2026-10-05" ? 1 : 0, 1);
  eq("14.3 · 04-04-2026: plusvalía 05-10-2026 en Trámites", TRM("2026-04-04").plusvalia.limite === "2026-10-05" ? 1 : 0, 1);
  eq("14.3 · 04-04-2026: nota del traslado en Trámites", /30\.5 Ley 39\/2015/.test(TRM("2026-04-04").isd.nota) ? 1 : 0, 1);
  // Con prórroga: 04-04-2027 es domingo → 05-04-2027 en las dos; prescripción 05-04-2031
  eq("14.3 · prórroga: ISD 05-04-2027 en Diagnóstico", PZ("2026-04-04", { prorrogaISD: true }).isd.limite === "2027-04-05" ? 1 : 0, 1);
  eq("14.3 · prórroga: ISD 05-04-2027 en Trámites", TRM("2026-04-04", { prorrogaISD: true }).isd.limite === "2027-04-05" ? 1 : 0, 1);
  eq("14.3 · prórroga: aplazamiento dentro del plazo prorrogado", TRM("2026-04-04", { prorrogaISD: true }).aplazamiento.limite === "2027-04-05" ? 1 : 0, 1);
  eq("14.3 · prórroga: la plusvalía no se amplía", TRM("2026-04-04", { prorrogaISD: true }).plusvalia.limite === "2026-10-05" ? 1 : 0, 1);
  eq("14.3 · prórroga: prescripción 05-04-2031 en las dos vistas", PZ("2026-04-04", { prorrogaISD: true }).prescripcion.limite === "2031-04-05" && TRM("2026-04-04", { prorrogaISD: true }).prescripcion.limite === "2031-04-05" ? 1 : 0, 1);
  // Fin de mes: 31-08-2026 + 6 = 28-02-2027 (domingo) → 01-03-2027; 31-08-2025 + 6 = 28-02-2026 (sábado) → 02-03-2026
  eq("14.3 · fin de mes 31-08-2026 → 01-03-2027 en las dos", PZ("2026-08-31").isd.limite === "2027-03-01" && TRM("2026-08-31").isd.limite === "2027-03-01" ? 1 : 0, 1);
  eq("14.3 · fin de mes 31-08-2025 → 02-03-2026 en las dos", PZ("2025-08-31").isd.limite === "2026-03-02" && TRM("2025-08-31").isd.limite === "2026-03-02" ? 1 : 0, 1);
  // Fiesta nacional: 12-04-2026 + 6 = lunes 12-10-2026 (Fiesta Nacional) → 13-10-2026
  eq("14.3 · 12-10-2026 festivo: 13-10-2026 en las dos", PZ("2026-04-12").isd.limite === "2026-10-13" && TRM("2026-04-12").isd.limite === "2026-10-13" ? 1 : 0, 1);
  eq("14.3 · últimas voluntades: 15 hábiles con festivos nacionales en las dos (04-05-2026)", PZ("2026-04-12").ultimas_voluntades.desde === "2026-05-04" && TRM("2026-04-12").ultimas.desde === "2026-05-04" ? 1 : 0, 1);
  // Plazos civiles: de fecha a fecha, sin traslado (art. 5 CC). Alquiler: 04-07-2026 (sábado) se mantiene
  eq("14.3 · subrogación del alquiler (civil) sin traslado", TRM("2026-04-04", { situ: { inquilino: true } }).alquiler_inquilino.limite === "2026-07-04" ? 1 : 0, 1);
  // Barrido: cada día de 2025-01-01 a 2027-06-30, con y sin prórroga, las dos vistas coinciden en ISD, prórroga, plusvalía, prescripción y últimas voluntades
  let difs = [];
  const diaSig = (f) => new Date(Date.parse(f + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
  for (let f = "2025-01-01"; f <= "2027-06-30"; f = diaSig(f)) {
    for (const pr of [false, true]) {
      const a = PZ(f, { prorrogaISD: pr }), b = TRM(f, { prorrogaISD: pr });
      const pares = [["isd", "isd"], ["prorroga_isd", "prorroga"], ["plusvalia", "plusvalia"], ["prescripcion", "prescripcion"]];
      for (const [x, y] of pares) if (a[x].limite !== b[y].limite) difs.push(`${f}${pr ? " (prórroga)" : ""} ${x}: ${a[x].limite} ≠ ${b[y].limite}`);
      if (a.ultimas_voluntades.desde !== b.ultimas.desde) difs.push(`${f} últimas voluntades: ${a.ultimas_voluntades.desde} ≠ ${b.ultimas.desde}`);
      if (a.isd.limite !== limiteISD(f, pr)) difs.push(`${f} limiteISD`);
      if (b.aplazamiento.limite !== limiteISD(f, pr)) difs.push(`${f} aplazamiento`);
    }
  }
  if (difs.length) console.log(difs.slice(0, 10).join("\n"));
  eq("14.3 · barrido 2025-2027 (912 días × 2): Diagnóstico y Trámites coinciden", difs.length, 0, 0);
  // Ningún plazo administrativo del catálogo vence en sábado, domingo o festivo nacional
  const todasSitu = { pensionista: true, autonomo: true, empleador: true, armas: true, usufructuario: true };
  let malos = [];
  for (let m = 0; m < 30; m++) { const f = sumarMeses("2025-01-07", m); const T = TRM(f, { ccaa: "EST", hayConyuge: true, hayVehiculos: true, situ: todasSitu });
    for (const id of ["pensionista", "baja_reta", "baja_censal", "armas", "trabajadores", "viudedad", "prorroga", "isd", "plusvalia", "plusvalia_real", "isd_no_residente", "aplazamiento", "consolidacion_usufructo", "dgt_custodia"]) if (T[id] && T[id].limite && aHabil(T[id].limite) !== T[id].limite) malos.push(`${f} ${id} ${T[id].limite}`); }
  if (malos.length) console.log(malos.slice(0, 10).join("\n"));
  eq("14.3 · plazos administrativos del catálogo en día hábil", malos.length, 0, 0);
}

// ───────── 15. Robustez exhaustiva de la plusvalía: todas las ordenanzas y los 8.132 municipios del INE ─────────
{
  const t0 = Date.now();
  const MU = JSON.parse(readFileSync(new URL("./municipios.json", import.meta.url), "utf8"));
  const CLAVES = JSON.parse(readFileSync(new URL("./municipios-claves.json", import.meta.url), "utf8"));
  const INE_KEY = Object.fromEntries(Object.entries(CLAVES).map(([k, i]) => [i, k]));
  const ines = new Set(MU.m.map(([i]) => i));
  // Coherencia del catálogo: cada ordenanza tiene su código INE (municipios-claves.json) y cada código existe en municipios.json
  const ordKeys = Object.keys(ORDENANZAS).filter((k) => k !== "OTRO");
  const sinClave = ordKeys.filter((k) => !CLAVES[k]), claveSinOrd = Object.keys(CLAVES).filter((k) => !ORDENANZAS[k]), ineMalo = Object.entries(CLAVES).filter(([, i]) => !ines.has(i)).map(([k]) => k);
  if (sinClave.length + claveSinOrd.length + ineMalo.length) console.log("Catálogo de municipios incoherente:", { sinClave, claveSinOrd, ineMalo });
  eq("15 · cada ordenanza tiene código INE válido en municipios-claves.json", sinClave.length + claveSinOrd.length + ineMalo.length, 0, 0);
  eq("15 · municipios.json: 8.132 municipios", MU.m.length, 8132, 0);

  const HER = [["conyuge", 70], ["hijo", 15], ["hijo", 45], ["nieto", 20], ["hermano", 60], ["sobrino", 35], ["pareja_hecho", 60, { inscrita: true }], ["pareja_hecho", 60, { inscrita: false }], ["extrano", 50]];
  const FECHAS = ["2025-06-01", "2026-01-15", "2026-06-15"];
  const ANIOS = [0, 1, 5, 10, 20, 30];
  const FRAC = [1, 0.5, 1 / 3];
  const SUELO = [0, 1000, 60000, 1000000];
  const restaAnios = (f, a) => (a === 0 ? sumarMeses(f, -5) : `${Number(f.slice(0, 4)) - a}${f.slice(4)}`);
  const fin = (v) => typeof v !== "number" || Number.isFinite(v);
  const r2t = (v) => Math.round(v * 100) / 100;
  const todoFinito = (o, d = 0) => { if (d > 6 || o == null) return true; if (typeof o === "number") return Number.isFinite(o); if (typeof o === "object") return Object.values(o).every((v) => todoFinito(v, d + 1)); return true; };
  // Una combinación del enrejado; los extras (vivienda habitual, convivencia, ganancia o pérdida, cuota del causante) rotan con el índice
  const caso = (key, i, ine, sinManual) => {
    const nH = HER.length, nF = FECHAS.length, nA = ANIOS.length, nR = FRAC.length, nS = SUELO.length;
    const [rel, edad, ex] = HER[i % nH], fecha = FECHAS[Math.floor(i / nH) % nF], anios = ANIOS[Math.floor(i / (nH * nF)) % nA], frac = FRAC[Math.floor(i / (nH * nF * nA)) % nR], suelo = SUELO[Math.floor(i / (nH * nF * nA * nR)) % nS];
    const k = Math.floor(i / 7) + i;
    const adqValor = 100000, trans = [250000, 80000, 100000, 3000000][k % 4]; // ganancia, pérdida, igual (no sujeto) y ganancia grande
    const vct = [suelo * 2.5, suelo, suelo * 10, 0][k % 4];
    const inmueble = { municipio: key, tipoManual: key === "OTRO" && !sinManual ? 30 : undefined, bonifManual: [0, 50, 95, 100][k % 4], cuota: [1, 0.5, 1, 0.25][(k >> 2) % 4], valorCatastralTotal: vct, valorCatastralSuelo: suelo, adquisicion: { fecha: restaAnios(fecha, anios), valor: adqValor }, valorTransmision: trans, esViviendaHabitual: k % 2 === 0, esLocalAfecto: k % 5 === 0, causanteEmpadronado: k % 3 === 0 ? true : undefined, ine };
    const heredero = { nombre: "T", relacion: rel, edad, ...(ex || {}), convivio2anios: k % 2 === 1, convivio1anio: k % 2 === 1 ? true : undefined, empadronadoMunicipio: k % 3 !== 0, empadronadoMunicipio1anio: k % 3 !== 0, colectivoVulnerable: k % 7 === 0, ingresosAnuales: k % 7 === 0 ? 9000 : null };
    if (heredero.relacion === "pareja_hecho" && !heredero.inscrita) heredero.relacion = "pareja_no_inscrita"; // como titularPlus de la app
    return { inmueble, titulares: [{ heredero, fraccion: frac }], fecha, anios, trans, adqValor };
  };
  const GRID = HER.length * FECHAS.length * ANIOS.length * FRAC.length * SUELO.length; // 1.944 combinaciones
  const fallos = [];
  const comprobar = (etq, key, i, ine, sinManual) => {
    const c = caso(key, i, ine, sinManual);
    let r;
    try { r = calcularPlusvalia({ inmueble: c.inmueble, titulares: c.titulares, fecha: c.fecha, caudalTotal: 500000 }); }
    catch (e) { fallos.push(`${etq} #${i}: excepción ${e.message}`); return; }
    const err = [];
    if (!todoFinito(r)) err.push("número no finito");
    if (!(r.cuota >= 0) || !(r.base >= 0) || !(r.total >= 0)) err.push(`negativo cuota=${r.cuota} base=${r.base} total=${r.total}`);
    if (r.tipo > 0.30 + 1e-12 || r.tipo < 0) err.push(`tipo ${r.tipo} fuera de 0-30 % (art. 108.1 TRLRHL)`);
    // Régimen común: máximo del art. 107.4 TRLRHL. Territorios forales (07-10-2026): máximo de su tabla foral (Navarra llega a 0,58 a 10 años)
    const maxT = coefPlusvaliaMax(c.fecha, r.regimen === "comun" ? null : r.regimen), legal = maxT[Math.min(c.anios, 20)];
    if (r.coeficiente > legal + 1e-12 || r.coeficiente < 0) err.push(`coeficiente ${r.coeficiente} > máximo legal ${legal}`);
    for (const t of r.porTitular) {
      if (!(t.cuota >= 0) || !(t.bonificacion >= 0) || !(t.aIngresar >= 0)) err.push(`titular negativo ${JSON.stringify(t)}`);
      if (t.bonificacion > t.cuota + 0.005) err.push(`bonificación ${t.bonificacion} > cuota ${t.cuota}`);
      if (!(t.bonificacionPct >= 0 && t.bonificacionPct <= 1)) err.push(`bonificación ${t.bonificacionPct * 100} %`);
    }
    if (r.total > r.base * 0.30 + 0.01 * r.porTitular.length) err.push(`total ${r.total} > base ${r.base} × 30 %`);
    if (r.base > r.baseObjetiva + 1e-9 || (!r.noSujeto && r.base > r.baseReal + 1e-9)) err.push("base mayor que la objetiva o la real");
    if (c.trans * (c.inmueble.cuota ?? 1) <= c.adqValor * (c.inmueble.cuota ?? 1) && !(r.noSujeto && r.total === 0 && r.base === 0)) err.push("transmisión ≤ adquisición y no sale no sujeto");
    if (c.trans > c.adqValor && r.noSujeto) err.push("con ganancia sale no sujeto");
    if (typeof r.municipio !== "string" || !r.municipio) err.push("sin nombre de municipio");
    // Cota superior garantizada: ningún cálculo supera el del tipo máximo legal (30 %) con los coeficientes máximos y sin bonificación
    if (r.cuota > r2t(Math.min(r.baseObjetiva > 0 ? (r.base / r.coeficiente || 0) * maxT[Math.min(c.anios, 20)] : 0, Infinity) * 0.30) + 0.01 && r.metodo === "objetivo") err.push(`cuota ${r.cuota} por encima de la cota del máximo legal`);
    if (err.length) fallos.push(`${etq} #${i} (${c.titulares[0].heredero.relacion}, ${c.fecha}, ${c.anios} años, fracción ${c.titulares[0].fraccion}, suelo ${c.inmueble.valorCatastralSuelo}): ${err.join("; ")}`);
  };
  // a) Cada ordenanza (y OTRO) con el enrejado completo: 1.944 combinaciones por municipio
  for (const key of Object.keys(ORDENANZAS)) {
    const antes = fallos.length;
    for (let i = 0; i < GRID; i++) comprobar(key, key, i);
    eq(`15 · plusvalía ${key}: ${GRID} combinaciones sin error`, fallos.length - antes, 0, 0);
  }
  // b) Los 8.132 municipios del INE por la vía de la app: ordenanza propia si su código está en municipios-claves.json; si no, OTRO con tipo manual del 30 %.
  //    Territorios forales (Álava, Gipuzkoa, Bizkaia, Navarra): el motor aplica su régimen foral (PLUSVALIA_FORAL; casos a mano en la sección 22).
  //    24 combinaciones por municipio, desplazadas para recorrer todo el enrejado (8.132 × 24 = 195.168 cálculos)
  const porProv = {};
  MU.m.forEach(([ine], j) => {
    const key = ORDENANZAS[INE_KEY[ine]] ? INE_KEY[ine] : "OTRO";
    const pv = MU.provincias[ine.slice(0, 2)];
    const antes = fallos.length;
    if (!pv) fallos.push(`INE ${ine}: provincia ${ine.slice(0, 2)} sin datos`);
    // Pares: la vía por defecto (ordenanza, datos de Hacienda 2026 o máximo legal); impares: tipo introducido a mano
    for (let s = 0; s < 24; s++) comprobar(`INE ${ine} (${key}${pv && ["ALA", "BIZ", "GIP", "NAV"].includes(pv.ccaa) ? ", foral" : ""}${s % 2 ? "" : ", sin tipo manual"})`, key, (j * 24 + s * 81) % GRID, ine, s % 2 === 0);
    const p = ine.slice(0, 2); porProv[p] = porProv[p] || { n: 0, f: 0 }; porProv[p].n++; porProv[p].f += fallos.length - antes;
  });
  for (const [p, v] of Object.entries(porProv).sort()) eq(`15 · plusvalía INE provincia ${p} (${MU.provincias[p]?.n || "?"}): ${v.n} municipios sin error`, v.f, 0, 0);
  eq("15 · los 8.132 municipios recorridos", Object.values(porProv).reduce((s, v) => s + v.n, 0), 8132, 0);
  if (fallos.length) console.log(`Plusvalía: ${fallos.length} fallos\n` + fallos.slice(0, 25).join("\n"));
  if (process.env.V) console.log(`15 · plusvalía: ${Object.keys(ORDENANZAS).length * GRID + 8132 * 24} cálculos en ${Date.now() - t0} ms`);
}

// ───────── 16. Robustez exhaustiva del Impuesto sobre Sucesiones: los 22 territorios ─────────
{
  const t0 = Date.now();
  const fallos = [];
  const HER = [["conyuge", 70], ["hijo", 15], ["hijo", 45], ["nieto", 20], ["padre", 75], ["hermano", 60], ["sobrino", 35], ["pareja_hecho", 60, { inscrita: true }], ["pareja_hecho", 60, { inscrita: false }], ["extrano", 50], ["yerno", 50], ["primo", 50]];
  const MASAS = [0, 1, 60000, 1000000, 10000000];
  const FECHAS = ["2019-06-01", "2023-06-01", "2025-06-01", "2026-01-15", "2026-09-15"];
  const MAXK = 2.4; // coeficiente máximo de cualquier territorio (art. 22 Ley 29/1987, grupo IV y patrimonio > 4.020.770,98)
  const Pn = (id, relacion, edad, x = {}) => ({ id, nombre: id, relacion, edad, patrimonioPreexistente: 0, discapacidad: 0, ...x });
  // Estructuras: heredero único por porcentajes, intestado con cónyuge e hijos, usufructo universal (con y sin renuncia), legado,
  // gananciales con patrimonio previo alto, vivienda habitual y empresa, seguros y donaciones previas, nuda propiedad con BL 0.
  const estructuras = (rel, edad, ex, masa, k) => {
    const cta = (id, v, x = {}) => ({ id, tipo: "cuenta", valor: v, titularidad: "privativo", ...x });
    const casa = (v, x = {}) => ({ id: "viv", tipo: "inmueble", valor: v, valorReferencia: v * 0.9, titularidad: "privativo", esViviendaHabitual: true, ...x });
    const H = Pn("h", rel, edad, { ...(ex || {}), pct: 100, discapacidad: [0, 0, 33, 65][k % 4], patrimonioPreexistente: [0, 500000, 5000000][k % 3], donacionesPreviasBL: k % 5 === 0 ? 50000 : 0, convivio2anios: k % 2 === 0 });
    return [
      { reparto: "porcentajes", herederos: [H], bienes: [cta("c", masa)] },
      { reparto: "porcentajes", herederos: [H, Pn("x", "extrano", 40, { pct: 0 })], bienes: [casa(masa * 0.6), cta("c", masa * 0.4), { id: "e", tipo: "empresa", valor: masa * 0.2, titularidad: "privativo" }], seguros: [{ beneficiarioId: "h", importe: masa * 0.1 }], aplicarEmpresa: true },
      { reparto: "intestado", herederos: [Pn("v", "conyuge", 70, { patrimonioPreexistente: k % 2 ? 3000000 : 0 }), Pn("a", "hijo", 15), Pn("b", "hijo", 45)], bienes: [cta("g", masa, { titularidad: "ganancial" }), casa(masa / 2, { titularidad: "ganancial" })], deudas: [{ importe: masa * 0.05 }], gastos: [{ importe: 3000 }] },
      { reparto: "usufructoUniversal", herederos: [Pn("v", "conyuge", 80), H.relacion === "conyuge" ? Pn("a", "hijo", 50) : { ...H, relacion: linDesc(H) ? H.relacion : "hijo" }], bienes: [cta("c", masa)] },
      { reparto: "usufructoUniversal", herederos: [Pn("v", rel === "pareja_hecho" ? "pareja_hecho" : "conyuge", 65, { inscrita: true, renuncia: true }), Pn("a", "hijo", 30), Pn("n", "nieto", 10, { estirpe: "Muerto" })], bienes: [cta("c", masa)] },
      { reparto: "porcentajes", herederos: [Pn("a", "hijo", 40, { pct: 50 }), Pn("b", "hijo", 40, { pct: 50, renuncia: true }), { ...H, id: "l", pct: 0 }], bienes: [cta("c", masa * 0.7), cta("leg", masa * 0.3, { legatarioId: "l" })], ajuar: "3pct" },
      { reparto: "intestado", herederos: [Pn("p", "padre", 80), Pn("m", "padre", 78), Pn("s", "hermano", 50, { renuncia: true })], bienes: [{ id: "i", tipo: "inmueble", valor: masa, valorReferencia: masa * 1.2, titularidad: "proindiviso", porcentaje: 50 }] },
    ];
  };
  const linDesc = (h) => ["hijo", "nieto"].includes(h.relacion);
  const comprobar = (etq, caso) => {
    let r;
    try { r = calcularISD(caso); } catch (e) { fallos.push(`${etq}: excepción ${e.message}`); return; }
    const err = [];
    const todoFinito = (o, d = 0) => { if (d > 7 || o == null) return true; if (typeof o === "number") return Number.isFinite(o); if (typeof o === "object") return Object.values(o).every((v) => todoFinito(v, d + 1)); return true; };
    if (!todoFinito(r)) err.push("número no finito");
    if (!(r.total >= 0)) err.push(`total ${r.total}`);
    if (Math.abs(r.total - r.herederos.reduce((s, h) => s + h.aIngresar, 0)) > 0.011) err.push("total ≠ suma de los herederos");
    for (const k of ["bruto", "neto", "netoReparto", "ajuar"]) if (!(r.masa[k] >= 0)) err.push(`masa.${k} ${r.masa[k]}`);
    const renuncian = new Set((caso.herederos || []).filter((h) => h.renuncia).map((h) => h.id));
    for (const h of r.herederos) {
      const e = (m) => err.push(`${h.id} (${h.relacion}, grupo ${h.grupo}): ${m}`);
      if (renuncian.has(h.id)) e("liquida quien ha renunciado");
      for (const k of ["baseImponible", "baseLiquidable", "cuotaIntegra", "cuotaTributaria", "aIngresar"]) if (!(h[k] >= 0)) e(`${k} = ${h[k]}`);
      if (h.baseLiquidable > h.baseImponible + 0.01) e(`BL ${h.baseLiquidable} > BI ${h.baseImponible}`);
      if (h.aIngresar > h.cuotaTributaria + 0.01) e(`a ingresar ${h.aIngresar} > cuota tributaria ${h.cuotaTributaria}`);
      if (h.cuotaTributaria > h.cuotaIntegra * MAXK + 0.01) e(`cuota tributaria ${h.cuotaTributaria} > cuota íntegra × ${MAXK}`);
      if (h.aIngresar > h.baseImponible + 0.01) e(`paga ${h.aIngresar} con BI ${h.baseImponible}`);
      if (h.tipoMedio != null && !(h.tipoMedio >= 0 && h.tipoMedio <= 34 * MAXK)) e(`tipo medio ${h.tipoMedio}`);
      // Traza: componentes de la BI, reducciones hasta la BL, bonificaciones hasta lo que se paga
      const T = h.traza, iBI = T.findIndex((t) => t.paso === "Base imponible"), iBL = T.findIndex((t) => t.paso === "Base liquidable"), iPagar = T.findIndex((t) => t.paso === "A pagar");
      if (iBI < 0 || iBL < iBI || iPagar < iBL) { e("traza sin BI, BL o A pagar en orden"); continue; }
      const sumBI = T.slice(0, iBI).reduce((s, t) => s + t.valor, 0);
      if (Math.abs(sumBI - T[iBI].valor) > 0.03 || Math.abs(T[iBI].valor - h.baseImponible) > 0.005) e(`traza BI ${T[iBI].valor} ≠ suma ${sumBI}`);
      const reds = T.slice(iBI + 1, iBL);
      if (reds.some((t) => !(t.valor <= 0))) e("reducción positiva en la traza");
      const blT = Math.max(0, T[iBI].valor + reds.reduce((s, t) => s + t.valor, 0));
      if (Math.abs(blT - T[iBL].valor) > 0.05 || Math.abs(T[iBL].valor - h.baseLiquidable) > 0.005) e(`traza BI − reducciones = ${blT} ≠ BL ${T[iBL].valor}`);
      if (T[iPagar].valor !== h.aIngresar) e("A pagar de la traza ≠ aIngresar");
      const iCoef = T.findIndex((t) => /^Coeficiente multiplicador/.test(t.paso));
      if (iCoef < iBL || Math.abs(T[iCoef].valor - h.cuotaTributaria) > 0.005) e("coeficiente de la traza ≠ cuota tributaria");
      const bon = T.slice(iCoef + 1, iPagar).reduce((s, t) => s + t.valor, 0);
      if (T.slice(iCoef + 1, iPagar).some((t) => t.valor > 0)) e("bonificación positiva");
      if (Math.abs(h.cuotaTributaria + bon - h.aIngresar) > 0.03) e(`cuota ${h.cuotaTributaria} + bonificaciones ${bon} ≠ ${h.aIngresar}`);
    }
    if (err.length) fallos.push(`${etq}: ${err.slice(0, 3).join(" | ")}`);
  };
  let n = 0;
  for (const [ccaa] of TERRITORIOS) {
    const antes = fallos.length;
    let k = 0;
    for (const [rel, edad, ex] of HER) for (const masa of MASAS) {
      const E = estructuras(rel, edad, ex, masa, k);
      // Cada estructura con una fecha distinta (rotando) y, cada tres casos, fuera de plazo con requerimiento y ajuar por defecto
      E.forEach((est, j) => {
        const fecha = FECHAS[(k + j) % FECHAS.length];
        comprobar(`${ccaa} · ${rel}${ex && ex.inscrita === false ? " no inscrita" : ""} · ${masa} € · estructura ${j} · ${fecha}`, { fechaFallecimiento: fecha, ccaa, enPlazo: (k + j) % 3 !== 0, conRequerimiento: (k + j) % 6 === 0, criterioVivienda: "DGT", ajuar: (k + j) % 4 === 0 ? undefined : "residencial", conyugeViviendaCatastral: (k + j) % 5 === 0 ? 80000 : undefined, ...est });
        n++;
      });
      k++;
    }
    eq(`16 · ISD ${ccaa}: ${HER.length * MASAS.length * 7} casos sin error`, fallos.length - antes, 0, 0);
  }
  if (fallos.length) console.log(`ISD: ${fallos.length} fallos\n` + fallos.slice(0, 25).join("\n"));
  if (process.env.V) console.log(`16 · ISD: ${n} cálculos en ${Date.now() - t0} ms`);
}

// ───────── 17. Datos fuera de rango (fallos encontrados por las pruebas de robustez de 04-10-2026) ─────────
// Antes: suelo negativo → cuota −12.000 €; tipo manual 300 % → 48.000 €; bonificación manual 150 % → −2.400 €; −20 % → se pagaba más;
// fecha de adquisición vacía → NaN; reducción del valor catastral del 150 % → cuota negativa. ISD: un seguro negativo restaba de la base imponible.
{
  const P = (x, h = { nombre: "h", relacion: "hijo" }, fr = 1) => calcularPlusvalia({ inmueble: { municipio: "OTRO", tipoManual: 30, cuota: 1, valorCatastralTotal: 100000, valorCatastralSuelo: 40000, adquisicion: { fecha: "2000-01-01", valor: 100000 }, valorTransmision: 200000, ...x }, titulares: [{ heredero: h, fraccion: fr }], fecha: "2026-06-15" });
  const sano = (r) => [r.base, r.cuota, r.total, r.coeficiente, r.tipo, ...r.porTitular.flatMap((t) => [t.cuota, t.bonificacion, t.aIngresar, t.bonificacionPct])].every((v) => Number.isFinite(v) && v >= 0) && r.porTitular.every((t) => t.bonificacion <= t.cuota && t.bonificacionPct <= 1) && r.tipo <= 0.30;
  // Referencia: suelo 40.000 × 0,40 (≥ 20 años) = 16.000 × 30 % = 4.800
  eq("17 · referencia: 4.800 €", P({}).total, 4800);
  eq("17 · suelo negativo: 0 € y aviso", sano(P({ valorCatastralSuelo: -40000 })) && P({ valorCatastralSuelo: -40000 }).total === 0 && P({ valorCatastralSuelo: -40000 }).alertas.some((a) => /negativo/.test(a)) ? 1 : 0, 1);
  eq("17 · tipo manual 300 %: se limita al 30 % (4.800 €) con aviso del art. 108.1", P({ tipoManual: 300 }).total === 4800 && P({ tipoManual: 300 }).alertas.some((a) => /108\.1/.test(a)) ? 1 : 0, 1);
  eq("17 · tipo manual negativo: 0 %", P({ tipoManual: -10 }).total, 0);
  eq("17 · bonificación manual 150 %: se limita al 100 % (0 €)", sano(P({ bonifManual: 150 })) && P({ bonifManual: 150 }).total === 0 ? 1 : 0, 1);
  eq("17 · bonificación manual −20 %: 0 % (4.800 €)", P({ bonifManual: -20 }).total, 4800);
  eq("17 · fecha de adquisición vacía: coeficiente máximo (0,40), sin NaN y con aviso", sano(P({ adquisicion: { fecha: "", valor: 100000 } })) && P({ adquisicion: { fecha: "", valor: 100000 } }).coeficiente === 0.40 && P({ adquisicion: { fecha: "", valor: 100000 } }).alertas.some((a) => /adquisición/.test(a)) ? 1 : 0, 1);
  eq("17 · fecha de adquisición imposible (2000-13-45): sin NaN", sano(P({ adquisicion: { fecha: "2000-13-45", valor: 100000 } })) ? 1 : 0, 1);
  eq("17 · adquisición posterior al fallecimiento: prudente y con aviso", sano(P({ adquisicion: { fecha: "2030-01-01", valor: 100000 } })) && P({ adquisicion: { fecha: "2030-01-01", valor: 100000 } }).alertas.some((a) => /posterior/.test(a)) ? 1 : 0, 1);
  eq("17 · reducción del valor catastral 150 %: 0 €", sano(P({ reduccionVC: 1.5 })) && P({ reduccionVC: 1.5 }).total === 0 ? 1 : 0, 1);
  eq("17 · cuota del causante 300 %: se limita al 100 %", P({ cuota: 3 }).total, 4800);
  eq("17 · fracción del titular 2: se limita a 1", P({}, undefined, 2).total, 4800);
  eq("17 · suelo mayor que el total: proporción limitada al 100 % y aviso", P({ valorCatastralTotal: 10000 }).alertas.some((a) => /supera el valor catastral total/.test(a)) && sano(P({ valorCatastralTotal: 10000 })) ? 1 : 0, 1);
  eq("17 · valores no numéricos: sin NaN", sano(P({ valorCatastralSuelo: "abc", valorCatastralTotal: undefined, valorTransmision: "x" })) ? 1 : 0, 1);
  const I = (o) => calcularISD({ fechaFallecimiento: "2026-03-01", ccaa: "EST", reparto: "intestado", ajuar: "ninguno", herederos: [{ id: "a", nombre: "a", relacion: "hijo", edad: 40 }], bienes: [{ id: "c", tipo: "cuenta", valor: 100000 }], ...o });
  // Hijo, 100.000 €: BL 84.043,13 → 9.166,06 + 4.162,61 × 16,15 % = 9.838,32
  eq("17 · ISD referencia hijo 100.000 €: 9.838,32", I({}).total, 9838.32);
  eq("17 · ISD seguro negativo: no resta (9.838,32)", I({ seguros: [{ beneficiarioId: "a", importe: -50000 }] }).total, 9838.32);
  eq("17 · ISD deuda y gasto negativos: no suman (9.838,32)", I({ deudas: [{ importe: -50000 }], gastos: [{ importe: -1000 }] }).total, 9838.32);
  eq("17 · ISD bien de valor negativo: cuenta 0 (9.838,32)", I({ bienes: [{ id: "c", tipo: "cuenta", valor: 100000 }, { id: "n", tipo: "cuenta", valor: -60000 }] }).total, 9838.32);
  eq("17 · ISD deudas mayores que el caudal: 0 €, sin negativos", I({ deudas: [{ importe: 500000 }] }).total, 0);
  eq("17 · ISD sin herederos ni bienes: 0 €", I({ herederos: [], bienes: [] }).total, 0);
}


// ───────── 18. Plusvalía con los datos que los ayuntamientos comunican a Hacienda (IIVTNU 2026): capitales y municipios de más de 50.000 habitantes ─────────
{
  const MU = JSON.parse(readFileSync(new URL("./municipios.json", import.meta.url), "utf8"));
  const CLAVES = JSON.parse(readFileSync(new URL("./municipios-claves.json", import.meta.url), "utf8"));
  const INE_KEY = Object.fromEntries(Object.entries(CLAVES).map(([k, i]) => [i, k]));
  const NOM = Object.fromEntries(MU.m);
  const H = Object.entries(HACIENDA_IIVTNU_2026);
  const L26 = coefPlusvaliaLegal("2026-06-01").tabla;
  eq("18 · Hacienda: 148 municipios (48 capitales + 100 de más de 50.000 hab.)", H.length, 148, 0);
  const malos = H.filter(([ine, h]) => !NOM[ine] || !(Array.isArray(h.t) ? h.t.length === 21 && h.t.every((x) => x >= 0 && x <= 30) : h.t >= 0 && h.t <= 30) || (h.c && !(h.c.length === 21 && h.c.every((x) => x >= 0 && x <= 0.5))) || (h.red != null && !(h.red > 0 && h.red <= 60)));
  if (malos.length) console.log("Hacienda: entradas no válidas", malos.map(([i]) => i));
  eq("18 · Hacienda: códigos INE válidos, 21 tipos entre 0 y 30 %, 21 coeficientes y reducción ≤ 60 % (art. 107.3)", malos.length, 0, 0);
  // Las 48 provincias de régimen común (todas salvo Álava, Gipuzkoa, Bizkaia y Navarra) tienen al menos su capital
  const provs = new Set(H.map(([i]) => i.slice(0, 2)));
  const faltan = Object.keys(MU.provincias).filter((p) => !["01", "20", "31", "48"].includes(p) && !provs.has(p));
  eq("18 · Hacienda: las 48 capitales de régimen común (incluidas Ceuta y Melilla)", faltan.length, 0, 0);
  // Cotejo: todo tipo de una ordenanza VERIFICADA coincide con el de Hacienda, para los 21 tramos
  let cot = 0, dif = [];
  for (const [ine, h] of H) {
    const k = INE_KEY[ine], o = k && ORDENANZAS[k]; if (!o || o.estadoTipo !== "VERIFICADO") continue; cot++;
    const hh = haciendaIIVTNU(ine);
    for (let a = 0; a <= 20; a++) { const t = o.tipoFecha ? o.tipoFecha("2026-06-01", a) : o.tipoPorAnios ? o.tipoPorAnios(a) : o.tipo; if (Math.abs(t - hh.tipos[a]) > 0.00005) dif.push(`${k} ${a} años: ${t} vs ${hh.tipos[a]}`); }
  }
  if (dif.length) console.log("Tipos verificados que no coinciden con Hacienda:", dif.slice(0, 10));
  eq(`18 · los tipos de las ${cot} ordenanzas verificadas coinciden con Hacienda en los 21 tramos`, dif.length, 0, 0);
  if (process.env.V) console.log("18 · ordenanzas verificadas cotejadas con Hacienda:", cot);

  // Cálculo por la vía de la app: ordenanza si tiene clave; si no, OTRO con su código INE y sin tipo manual
  const PL = (ine, fecha, adq, extra = {}) => { const k = ORDENANZAS[INE_KEY[ine]] ? INE_KEY[ine] : "OTRO";
    return calcularPlusvalia({ inmueble: { municipio: k, ine, valorCatastralTotal: 200000, valorCatastralSuelo: 100000, adquisicion: { fecha: adq, valor: 50000 }, valorTransmision: 400000, ...extra }, titulares: [{ heredero: { nombre: "H", relacion: "hijo", edad: 40 }, fraccion: 1 }], fecha, caudalTotal: 500000 }); };
  // Getafe (28065): tipos por años de tenencia 29/27/25/24/23 %
  for (const [adq, t] of [["2023-05-01", 0.29], ["2018-05-01", 0.27], ["2013-05-01", 0.25], ["2009-05-01", 0.24], ["1990-05-01", 0.23]]) eq(`18 · Getafe, adquirido ${adq}: tipo ${t * 100} %`, PL("28065", "2026-06-01", adq).tipo, t, 1e-9);
  // Vilanova i la Geltrú (08307): 20,60 % a 1 año, 30 % a 10, 29,42 % a 19, 24,78 % a 20 o más
  for (const [adq, t] of [["2025-05-01", 0.206], ["2016-05-01", 0.30], ["2007-05-01", 0.2942], ["1980-05-01", 0.2478]]) eq(`18 · Vilanova i la Geltrú, adquirido ${adq}: tipo ${(t * 100).toFixed(2)} %`, PL("08307", "2026-06-01", adq).tipo, t, 1e-9);
  eq("18 · Roquetas de Mar: tipo 23 % (Hacienda; la ordenanza en revisión decía 30 %)", PL("04079", "2026-06-01", "2010-01-01").tipo, 0.23, 1e-9);
  eq("18 · Valladolid: tipo 21,76 %", PL("47186", "2026-06-01", "2010-01-01").tipo, 0.2176, 1e-9);
  eq("18 · Huesca: no exige el impuesto (0 €)", PL("22125", "2026-06-01", "2010-01-01").total, 0, 0);
  eq("18 · Aranjuez (ordenanza declarativa, BOCM 2017): tipo 11 %", PL("28013", "2026-06-01", "2010-01-01").tipo, 0.11, 1e-9);
  eq("18 · Aranjuez: fuente del tipo «ordenanza»", PL("28013", "2026-06-01", "2010-01-01").fuenteTipo === "ordenanza" ? 1 : 0, 1, 0);
  eq("18 · Avilés (sin ordenanza incorporada): fuente del tipo «hacienda», 22 %", PL("33004", "2026-06-01", "2010-01-01").fuenteTipo === "hacienda" && PL("33004", "2026-06-01", "2010-01-01").tipo === 0.22 ? 1 : 0, 1, 0);
  // Aranjuez, 16 años: 100.000 × 0,10 × 11 % = 1.100 €
  eq("18 · Aranjuez, 16 años: 1.100 € (100.000 × 0,10 × 11 %)", PL("28013", "2026-06-01", "2010-01-01").total, 1100);
  const arr = PL("35004", "2026-06-01", "2010-01-01");
  eq("18 · Arrecife: tipo 11 % y aviso de la reducción del 8 % (art. 107.3), sin aplicarla", arr.tipo === 0.11 && arr.alertas.some((a) => /reducción del 8 %/.test(a)) && arr.base === 100000 * 0.10 ? 1 : 0, 1, 0);
  // Fallecimiento anterior a 2026: los datos de 2026 no se aplican; tipo máximo con aviso del de Hacienda
  const pre = PL("33004", "2025-06-01", "2010-01-01");
  eq("18 · Avilés, fallecimiento en 2025: tipo 30 % y aviso del 22 % de Hacienda", pre.tipo === 0.30 && pre.alertas.some((a) => /comunica a Hacienda un tipo del 22 %/.test(a)) ? 1 : 0, 1, 0);
  // Los coeficientes de Hacienda solo suben, nunca bajan: Fuenlabrada (Hacienda 0,12 a 7 años; ordenanza: máximos vigentes, 0,20)
  const fu = PL("28058", "2026-06-01", "2019-05-01");
  eq("18 · Fuenlabrada, 7 años: coeficiente 0,20 (no el 0,12 de Hacienda) y aviso", fu.coeficiente === 0.20 && fu.alertas.some((a) => /recogen 0,12/.test(a)) ? 1 : 0, 1, 0);
  // En los 148 municipios y los 21 tramos: el coeficiente nunca baja del de la ordenanza incorporada o, sin ella, del máximo legal
  let baja = 0, n = 0;
  for (const [ine] of H) for (let a = 0; a <= 20; a++) {
    const adq = `${2026 - a}-05-01`, r = PL(ine, "2026-06-01", adq), k = INE_KEY[ine], o = ORDENANZAS[k];
    const ref = Math.min(o && o.coef ? o.coef[a] : L26[a], L26[a]), f = a === 0 ? 1 / 12 : 1; n++; // a 0 años: un mes, coeficiente prorrateado
    if (r.coeficiente < Math.round(ref * f * 10000) / 10000 - 1e-12 || r.coeficiente > L26[a] * f + 1e-4) baja++;
  }
  eq(`18 · ${n} cálculos (148 municipios × 21 tramos): coeficiente entre el de referencia y el máximo legal`, baja, 0, 0);
  // Cota superior en todos los municipios de España: la vía por defecto nunca supera el cálculo con el 30 % y los coeficientes máximos
  let sup = 0;
  MU.m.forEach(([ine], j) => { const adq = `${2026 - (j % 25)}-03-01`; const a = PL(ine, "2026-06-01", adq), b = PL(ine, "2026-06-01", adq, { municipio: "OTRO", tipoManual: 30 });
    if (a.cuota > b.cuota + 0.01) sup++; });
  eq("18 · 8.132 municipios: la cuota nunca supera la del tipo máximo legal con coeficientes máximos", sup, 0, 0);
}

// H40 · Andalucía (criterio de la ATA): los vehículos no son ajuar (art. 4.Cuatro y art. 18 Ley 19/1991)
{
  const A = (bienes) => calcularISD({ fechaFallecimiento: "2026-06-10", ccaa: "AND", ajuar: "sts", reparto: "intestado", herederos: [{ id: "h", nombre: "H", relacion: "hijo", edad: 40 }], bienes }).masa.ajuar;
  eq("H40 · AND: coche y cuenta, sin ajuar", A([{ id: "c", tipo: "vehiculo", valor: 4500 }, { id: "q", tipo: "cuenta", valor: 120000 }]), 0, 0);
  eq("H40 · AND: mobiliario de 10.000 € → ajuar 300 €", A([{ id: "o", tipo: "otro", valor: 10000 }, { id: "c", tipo: "vehiculo", valor: 4500 }]), 300);
}

// Usufructo universal con nietos de un hijo premuerto: nuda propiedad por estirpes (caso de prueba del 06-10-2026)
{
  const r = repartoUsufructoUniversal([{ id: "c", nombre: "V", relacion: "conyuge" }, { id: "a", nombre: "Carmen", relacion: "hijo" }, { id: "l", nombre: "Luis", relacion: "hijo", renuncia: true }, { id: "b", nombre: "Ana", relacion: "hijo" }, { id: "n1", nombre: "Pablo", relacion: "nieto", estirpe: "Javier" }, { id: "n2", nombre: "Lucía", relacion: "nieto", estirpe: "Javier" }]);
  eq("usufructo universal · hija: nuda 1/3 (el renunciante acrece)", r.derechos.a[0].fraccion, 1 / 3, 1e-9);
  eq("usufructo universal · nieto de hijo premuerto: nuda 1/6 (por estirpes)", r.derechos.n1[0].fraccion, 1 / 6, 1e-9);
  eq("usufructo universal · las fracciones suman 1", Object.values(r.derechos).filter((d) => d[0].tipo === "nuda").reduce((s, d) => s + d[0].fraccion, 0), 1, 1e-9);
  eq("usufructo universal · aviso de estirpes", (r.avisos || []).some((a) => /por estirpes/.test(a)) ? 1 : 0, 1, 0);
  const r2 = repartoUsufructoUniversal([{ id: "c", nombre: "V", relacion: "conyuge" }, { id: "a", nombre: "Carmen", relacion: "hijo" }, { id: "n1", nombre: "Pablo", relacion: "nieto", estirpe: "Carmen" }]);
  eq("usufructo universal · nieto con progenitor vivo: fuera", r2.derechos.n1 ? 1 : 0, 0, 0);
}

// ── 19. Ordenanzas declarativas (adaptador de ordenanzas-datos.json) ──
{
  const d = { ine: "28006", nombre: "Alcobendas (prueba)", tipo: 0.295, tipoPorAnios: [[5, 0.295], [null, 0.28]], coeficientes: null, bonif: { pct: 0.95, parentesco: "DACP", viviendaHabitual: true, convivencia: false, mantener: 3, rogada: true, plazo: "6 meses", articulo: "art. 7" }, fuente: { url: "https://example.org/of", titulo: "OF n.º 4 IIVTNU Alcobendas", leido: true }, estado: "V" };
  const o = ordenanzaDesdeDatos(d);
  eq("datos · tipo", o.tipo, 0.295, 0);
  eq("datos · tipo por años (6 años)", o.tipoPorAnios(6), 0.28, 0);
  eq("datos · estado", o.estadoTipo === "VERIFICADO" ? 1 : 0, 1, 0);
  const viv = { esViviendaHabitual: true, valorCatastralSuelo: 50000, valorCatastralTotal: 120000 };
  eq("datos · hijo vivienda habitual 95 %", o.bonif({ inmueble: viv, heredero: { relacion: "hijo" } }).pct, 0.95, 0);
  eq("datos · pareja inscrita (DACP) 95 %", o.bonif({ inmueble: viv, heredero: { relacion: "pareja_hecho" } }).pct, 0.95, 0);
  eq("datos · sobrino 0", o.bonif({ inmueble: viv, heredero: { relacion: "sobrino" } }).pct, 0, 0);
  eq("datos · segunda residencia 0", o.bonif({ inmueble: { ...viv, esViviendaHabitual: false }, heredero: { relacion: "hijo" } }).pct, 0, 0);
  const d2 = { ...d, ine: "28007", bonif: { parentesco: "DAC", viviendaHabitual: true, convivencia: true, tramos: { base: "suelo", tramos: [[60000, 0.95], [100000, 0.5], [null, 0.2]] } } };
  const o2 = ordenanzaDesdeDatos(d2);
  eq("datos · tramos sin convivencia informada 0", o2.bonif({ inmueble: viv, heredero: { relacion: "hijo" } }).pct, 0, 0);
  eq("datos · tramos suelo 50.000 → 95 %", o2.bonif({ inmueble: viv, heredero: { relacion: "hijo", convivio2anios: true } }).pct, 0.95, 0);
  eq("datos · tramos suelo 80.000 → 50 %", o2.bonif({ inmueble: { ...viv, valorCatastralSuelo: 80000 }, heredero: { relacion: "hijo", convivio2anios: true } }).pct, 0.5, 0);
  eq("datos · tramos suelo 200.000 → 20 %", o2.bonif({ inmueble: { ...viv, valorCatastralSuelo: 200000 }, heredero: { relacion: "hijo", convivio2anios: true } }).pct, 0.2, 0);
  const o3 = ordenanzaDesdeDatos({ ...d, ine: "28008", bonif: null, estado: "P" });
  eq("datos · sin bonificación", o3.bonif({ inmueble: viv, heredero: { relacion: "hijo" } }).pct, 0, 0);
  eq("datos · sin bonificación estado P", o3.bonif({ inmueble: viv, heredero: { relacion: "hijo" } }).estado === "PENDIENTE" ? 1 : 0, 1, 0);
}

// ── 19 bis. Ordenanzas leídas en la ronda 4 (08-10-2026): hijo con la vivienda habitual del causante y sobrino ──
// Suelo 18.000 €, adquirido en 2004, fallecimiento en mayo de 2026: 20 años o más → coeficiente máximo legal de 2026 (0,40) y base 7.200 €.
{
  const c20 = coefPlusvaliaLegal("2026-05-10").tabla[20];
  const pv4 = (ine, relacion, inm = {}, h = {}) => calcularPlusvalia({ inmueble: { municipio: "D_" + ine, ine, valorCatastralTotal: 120000, valorCatastralSuelo: 18000, adquisicion: { fecha: "2004-06-01", valor: 90000 }, valorTransmision: 200000, esViviendaHabitual: true, ...inm }, titulares: [{ heredero: { nombre: "X", relacion, convivio2anios: true, ...h }, fraccion: 1 }], fecha: "2026-05-10" });
  const B = 18000 * c20, t = (ine, rel, inm, h) => pv4(ine, rel, inm, h).total;
  eq("R4 · coeficiente de 20 años usado en estas pruebas", c20, 0.40, 0);
  // Oleiros (V): 30 %; 75 % si el valor catastral del suelo no pasa de 20.000 €, 50 % si pasa; primer grado y pareja inscrita
  eq("R4 · Oleiros hijo, suelo 18.000 → 75 %", t("15058", "hijo"), B * 0.30 * 0.25);
  eq("R4 · Oleiros hijo, suelo 30.000 → 50 %", t("15058", "hijo", { valorCatastralSuelo: 30000 }), 30000 * c20 * 0.30 * 0.5);
  eq("R4 · Oleiros sobrino sin bonificación", t("15058", "sobrino"), B * 0.30);
  eq("R4 · Oleiros nieto (segundo grado) sin bonificación", t("15058", "nieto"), B * 0.30);
  // Archena (V): tipo por años (20 o más → 20 %; 3 años → 9,84 %); 80 % vivienda habitual, 40 % el resto
  eq("R4 · Archena hijo vivienda 80 %", t("30009", "hijo"), B * 0.20 * 0.20);
  eq("R4 · Archena hijo otro inmueble 40 %", t("30009", "hijo", { esViviendaHabitual: false }), B * 0.20 * 0.60);
  eq("R4 · Archena sobrino", t("30009", "sobrino"), B * 0.20);
  eq("R4 · Archena 3 años de tenencia → tipo 9,84 %", pv4("30009", "hijo", { adquisicion: { fecha: "2022-06-01", valor: 1 } }).tipo, 0.0984, 0);
  // Castelldefels (V): 30 %; 95 % vivienda habitual a hijos, padres y cónyuge
  eq("R4 · Castelldefels hijo 95 %", t("08056", "hijo"), B * 0.30 * 0.05);
  eq("R4 · Castelldefels sobrino", t("08056", "sobrino"), B * 0.30);
  eq("R4 · Castelldefels segunda vivienda sin bonificación", t("08056", "hijo", { esViviendaHabitual: false }), B * 0.30);
  // Sant Andreu de la Barca (V): 95 % si el suelo no pasa de 30.000 €, 25 % si pasa; exige convivencia de 2 años
  eq("R4 · Sant Andreu hijo conviviente, suelo 18.000 → 95 %", t("08196", "hijo"), B * 0.30 * 0.05);
  eq("R4 · Sant Andreu hijo conviviente, suelo 40.000 → 25 %", t("08196", "hijo", { valorCatastralSuelo: 40000 }), 40000 * c20 * 0.30 * 0.75);
  eq("R4 · Sant Andreu hijo sin convivencia → 0", t("08196", "hijo", {}, { convivio2anios: false }), B * 0.30);
  eq("R4 · Sant Andreu sobrino", t("08196", "sobrino"), B * 0.30);
  // Arenys de Mar (V): 85 % desde 2026
  eq("R4 · Arenys de Mar hijo 85 %", t("08006", "hijo"), B * 0.30 * 0.15);
  eq("R4 · Arenys de Mar sobrino", t("08006", "sobrino"), B * 0.30);
  // Guadarrama (V): 26 % con más de 20 años, 20 % hasta 5; 95 % vivienda habitual
  eq("R4 · Guadarrama hijo 95 %", t("28068", "hijo"), B * 0.26 * 0.05);
  eq("R4 · Guadarrama sobrino", t("28068", "sobrino"), B * 0.26);
  eq("R4 · Guadarrama 3 años → tipo 20 %", pv4("28068", "hijo", { adquisicion: { fecha: "2023-01-10", valor: 1 } }).tipo, 0.20, 0);
  // Villaquilambre (V): 26 % con más de 5 años; 95 % para cualquier inmueble
  eq("R4 · Villaquilambre hijo, segunda vivienda 95 %", t("24222", "hijo", { esViviendaHabitual: false }), B * 0.26 * 0.05);
  eq("R4 · Villaquilambre sobrino", t("24222", "sobrino"), B * 0.26);
  // Villanueva de la Cañada (V): 14 %; 50 % vivienda habitual, también pareja inscrita
  eq("R4 · Villanueva de la Cañada hijo 50 %", t("28176", "hijo"), B * 0.14 * 0.5);
  eq("R4 · Villanueva de la Cañada pareja inscrita 50 %", t("28176", "pareja_hecho", {}, { inscrita: true }), B * 0.14 * 0.5);
  eq("R4 · Villanueva de la Cañada sobrino", t("28176", "sobrino"), B * 0.14);
  // Las Torres de Cotillas (V, municipio nuevo): 30 %; 95 % sin requisito de vivienda
  eq("R4 · Las Torres de Cotillas hijo 95 %", t("30038", "hijo", { esViviendaHabitual: false }), B * 0.30 * 0.05);
  eq("R4 · Las Torres de Cotillas sobrino", t("30038", "sobrino"), B * 0.30);
  // Santa Coloma de Gramenet (P, dos bonificaciones según el parentesco): cónyuge 75 %; hijo conviviente 50 %; padre nada
  eq("R4 · Santa Coloma cónyuge 75 %", t("08245", "conyuge"), B * 0.30 * 0.25);
  eq("R4 · Santa Coloma hijo conviviente 50 %", t("08245", "hijo"), B * 0.30 * 0.5);
  eq("R4 · Santa Coloma hijo sin convivencia", t("08245", "hijo", {}, { convivio2anios: false }), B * 0.30);
  eq("R4 · Santa Coloma padre sin bonificación", t("08245", "padre"), B * 0.30);
  eq("R4 · Santa Coloma sobrino", t("08245", "sobrino"), B * 0.30);
  eq("R4 · Santa Coloma: texto pendiente de cotejo", /pendiente de cotejo/.test(pv4("08245", "hijo").porTitular[0].norma) ? 1 : 0, 1, 0);
  // Alhama de Murcia, San Javier y Montcada i Reixac (P)
  eq("R4 · Alhama de Murcia hijo 50 % (el 95 % queda a criterio del abogado)", t("30008", "hijo"), B * 0.27 * 0.5);
  eq("R4 · San Javier hijo 95 %", t("30035", "hijo"), B * 0.18 * 0.05);
  eq("R4 · San Javier sobrino", t("30035", "sobrino"), B * 0.18);
  eq("R4 · Montcada i Reixac hijo 95 %", t("08125", "hijo"), B * 0.30 * 0.05);
  // Camargo (P, solo tipo): sin bonificación comprobada salvo que el abogado la indique
  eq("R4 · Camargo hijo sin bonificación comprobada", t("39016", "hijo"), B * 0.26);
  eq("R4 · Camargo hijo con 95 % indicado a mano", t("39016", "hijo", { bonifManual: 95 }), B * 0.26 * 0.05);
  // Pequeños municipios leídos de paso
  eq("R4 · Calasparra hijo sin bonificación", t("30013", "hijo"), B * 0.30);
  eq("R4 · El Vellón hijo 40 %", t("28168", "hijo"), B * 0.30 * 0.6);
  eq("R4 · El Álamo hijo 25 % con más de 20 años al 18 %", t("28004", "hijo"), B * 0.18 * 0.75);
  // Lista de bonificaciones: validación y textos
  eq("R4 · Santa Coloma sin bonificación: nombra a quién alcanza", /alcanza al cónyuge o la pareja de hecho inscrita; a los hijos/.test(pv4("08245", "sobrino").porTitular[0].norma) ? 1 : 0, 1, 0);
  const oL = ordenanzaDesdeDatos({ ine: "99001", nombre: "Lista (prueba)", tipo: 0.3, estado: "V", fuente: { url: "https://example.org", titulo: "OF prueba" }, bonif: [{ pct: 0.9, parentesco: "C" }, { pct: 0.4, parentesco: "todos", condicion: "renta" }] });
  eq("R4 · lista: cónyuge toma la primera", oL.bonif({ inmueble: { esViviendaHabitual: true }, heredero: { relacion: "conyuge" } }).pct, 0.9, 0);
  eq("R4 · lista: sobrino cae en la segunda (condición: a mano, 0)", oL.bonif({ inmueble: { esViviendaHabitual: true }, heredero: { relacion: "sobrino" } }).pct, 0, 0);
  eq("R4 · lista: la condición pide el porcentaje a mano", oL.manualBonif ? 1 : 0, 1, 0);
}

// ── 20. Producto: auditoría de cambios, panel del socio, búsqueda global, tareas y acciones masivas (src/app/*.js, lógica pura) ──
{
  const vm = await import("node:vm");
  const leer = (f) => readFileSync(new URL("./app/" + f, import.meta.url), "utf8");
  const numSrc = leer("logic.js").split("\n").filter((l) => l.startsWith("const num = ") || l.startsWith("const numLeer = ")).join("\n");
  const ctx = vm.createContext({ console, Intl, grp: (n, d) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" }) });
  vm.runInContext(numSrc + "\nglobalThis.num = num;\n" + ["tareas.js", "auditoria.js", "socio.js", "buscar.js", "masivo.js"].map(leer).join("\n") +
    "\nglobalThis.T = { auFoto, auDiff, auRegistrar, AU_MAX, scPerfil, scTramosFase, scFasesLentas, scNorthStar, scDinero, scCarga, scMotivos, scNSApuntar, bgIndice, bgBuscar, tkRadarItems, maAplicar };", ctx);
  const T = ctx.T, si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
  const FASES = [["encargo", "Encargo"], ["documentacion", "Documentación"], ["liquidacion", "Liquidación"], ["firma", "Firma"], ["inscripcion", "Inscripción y entrega"], ["cerrado", "Archivado"]];
  const F = { eur: (n) => ctx.grp(ctx.num(n), 2) + " €", pct: (n) => ctx.grp(ctx.num(n), 2).replace(/,00$/, "") + " %", fecha: (s) => s, rel: (k) => ({ hijo: "Hijo/a", conyuge: "Cónyuge" })[k] || k, fase: (k) => (FASES.find((f) => f[0] === k) || [k, k])[1], abogado: (id) => id || "Sin asignar", terr: (k) => k, tipoBien: (k) => k, mov: (k) => ({ provision: "Provisión de fondos recibida", factura: "Minuta emitida (factura)" })[k] || k, doc: (x, id) => "Doc " + id, archivos: () => null, estadoArch: (k) => k };
  const base = () => ({ id: "x1", fase: "documentacion", responsable: "a1", testamento: "porcentajes", fecha: "2026-03-01", ccaa: "AND",
    personas: [{ id: "p1", nombre: "Ana García", relacion: "hijo", pct: 40, nif: "12345678Z" }, { id: "p2", nombre: "Luis García", relacion: "hijo", pct: "60" }],
    bienes: [{ id: "b1", tipo: "vivienda", descripcion: "Piso en Triana", valor: 250000, titularidad: "privativo", refCatastral: "9872023VH5797S0001WX" }],
    despacho: { ref: "EXP-2026-001", cliente: "Ana García", honModo: "fijo", honFijo: 2500, movs: [{ id: "m1", tipo: "provision", importe: 600, fecha: "2026-03-05", concepto: "Provisión inicial" }], docs: { defuncion: true } } });
  const dif = (cambia) => { const a = base(), b = base(); cambia(b); return T.auDiff(T.auFoto(a, F), T.auFoto(b, F)); };
  si("20 · auditoría: mismos datos → sin cambios (40 y «40», 250000 y «250.000»)", dif((b) => { b.personas[0].pct = "40"; b.bienes[0].valor = "250.000"; }).length === 0);
  let c = dif((b) => { b.personas[0].pct = 50; });
  si("20 · auditoría: porcentaje 40 % → 50 %", c.length === 1 && c[0].c === "Porcentaje en el testamento" && c[0].a === "40 %" && c[0].d === "50 %" && c[0].k === "herederos" && /Ana García/.test(c[0].o));
  c = dif((b) => { b.personas[1].renuncia = true; });
  si("20 · auditoría: renuncia", c.length === 1 && c[0].a === "No renuncia" && c[0].d === "Renuncia");
  c = dif((b) => { b.bienes[0].adjudicadoA = "p2"; });
  si("20 · auditoría: adjudicación de la partición con el nombre del adjudicatario", c.length === 1 && c[0].k === "particion" && c[0].a === "Pro indiviso" && c[0].d === "Luis García");
  c = dif((b) => { b.bienes[0].titularidad = "ganancial"; b.bienes[0].valor = 260000; });
  si("20 · auditoría: titularidad y valor del bien", c.length === 2 && c.some((e) => e.c === "Titularidad" && e.d === "Ganancial") && c.some((e) => e.c === "Valor" && e.a === "250.000,00 €" && e.d === "260.000,00 €"));
  c = dif((b) => { b.personas.push({ id: "p3", nombre: "", relacion: "conyuge", separado: false }); });
  si("20 · auditoría: alta de una persona es una sola entrada", c.length === 1 && c[0].c === "Alta" && c[0].k === "herederos");
  c = dif((b) => { b.bienes = []; });
  si("20 · auditoría: baja de un bien es una sola entrada", c.length === 1 && c[0].c === "Baja" && c[0].k === "bienes");
  c = dif((b) => { b.despacho.docs.ultimas = true; delete b.despacho.docs.defuncion; });
  si("20 · auditoría: documentación recibida y desmarcada", c.length === 2 && c.some((e) => e.a === "Pendiente" && e.d === "Recibido") && c.some((e) => e.a === "Recibido" && e.d === "Pendiente"));
  c = dif((b) => { b.fase = "firma"; b.responsable = "a2"; b.despacho.honFijo = 3000; b.despacho.movs.push({ id: "m2", tipo: "factura", importe: 1210, fecha: "2026-04-01" }); });
  si("20 · auditoría: fase, responsable, honorarios y movimiento", c.length === 4 && ["Fase", "Responsable", "Importe cerrado (sin IVA)", "Alta"].every((k) => c.some((e) => e.c === k)));
  { const a = T.auFoto(base(), F), Fa = { ...F, archivos: () => [{ id: "d1", nombre: "nota.pdf", estado: "recibido" }] }, b = T.auFoto(base(), Fa);
    si("20 · auditoría: documentos archivados que se cargan después no cuentan como cambio", T.auDiff(a, b).length === 0);
    const c2 = T.auDiff(b, T.auFoto(base(), { ...F, archivos: () => [{ id: "d1", nombre: "nota.pdf", estado: "validado" }] }));
    si("20 · auditoría: estado de un documento archivado", c2.length === 1 && c2[0].a === "recibido" && c2[0].d === "validado"); }
  { const x = base(), t0 = "2026-10-07T10:00:00.000Z", t1 = "2026-10-07T10:03:00.000Z", t2 = "2026-10-07T10:30:00.000Z";
    T.auRegistrar(x, [{ k: "herederos", o: "Ana", c: "Porcentaje en el testamento", a: "40 %", d: "45 %", f: "P:p1.pct" }], "a1", t0);
    T.auRegistrar(x, [{ k: "herederos", o: "Ana", c: "Porcentaje en el testamento", a: "45 %", d: "50 %", f: "P:p1.pct" }], "a1", t1);
    si("20 · auditoría: lo escrito seguido se agrupa (40 % → 50 %)", x.auditoria.length === 1 && x.auditoria[0].a === "40 %" && x.auditoria[0].d === "50 %" && x.auditoria[0].u === "a1");
    T.auRegistrar(x, [{ k: "herederos", o: "Ana", c: "Porcentaje en el testamento", a: "50 %", d: "40 %", f: "P:p1.pct" }], "a1", t1);
    si("20 · auditoría: volver al valor de partida no deja rastro", x.auditoria.length === 0);
    T.auRegistrar(x, [{ k: "herederos", o: "Ana", c: "Porcentaje en el testamento", a: "40 %", d: "45 %", f: "P:p1.pct" }], "a1", t0);
    T.auRegistrar(x, [{ k: "herederos", o: "Ana", c: "Porcentaje en el testamento", a: "45 %", d: "50 %", f: "P:p1.pct" }], "a2", t1);
    T.auRegistrar(x, [{ k: "herederos", o: "Ana", c: "Porcentaje en el testamento", a: "50 %", d: "55 %", f: "P:p1.pct" }], "a2", t2);
    si("20 · auditoría: otra persona u otro momento, entrada nueva", x.auditoria.length === 3 && x.auditoria[0].d === "55 %");
    for (let i = 0; i < T.AU_MAX + 50; i++) T.auRegistrar(x, [{ k: "bienes", o: "B" + i, c: "Valor", a: "1", d: "2", f: "B:" + i + ".valor" }], "a1", t2);
    si("20 · auditoría: tamaño acotado", x.auditoria.length === T.AU_MAX && x.auditoria[0].o === "B" + (T.AU_MAX + 49)); }
  { const x = base(); T.auRegistrar(x, [{ k: "herederos", o: "Sin nombre (cónyuge)", c: "Alta", a: "", d: "Sin nombre (cónyuge)", f: "P:p3" }], "a1", "2026-10-07T10:00:00.000Z");
    T.auRegistrar(x, [{ k: "herederos", o: "Rosa (cónyuge)", c: "Nombre", a: "—", d: "Rosa", f: "P:p3.nombre" }], "a1", "2026-10-07T10:01:00.000Z");
    si("20 · auditoría: el nombre tecleado tras el alta va en el alta", x.auditoria.length === 1 && x.auditoria[0].d === "Rosa (cónyuge)"); }

  // Perfiles
  si("20 · perfiles: socia, abogado asociado, secretaria y perfil elegido", T.scPerfil({ rol: "Socia" }) === "socio" && T.scPerfil({ rol: "Abogado asociado" }) === "abogado" && T.scPerfil({ rol: "Secretaria" }) === "administrativo" && T.scPerfil({ rol: "Socio", perfil: "abogado" }) === "abogado");
  // Tiempo por fase
  const conFases = (id, alta, ev, fase) => ({ id, fase, despacho: { alta }, bitacora: ev.map(([t, a, b]) => ({ t: t + "T10:00:00.000Z", tipo: "fase", texto: `Fase: ${a} → ${b}` })).reverse() });
  const x1 = conFases("e1", "2026-01-01", [["2026-01-11", "Encargo", "Documentación"], ["2026-03-12", "Documentación", "Liquidación"]], "liquidacion");
  const tr = T.scTramosFase(x1, "2026-04-01", FASES);
  si("20 · fases: tramos 10 + 60 días y 20 en curso", tr.length === 3 && tr[0].fase === "encargo" && tr[0].dias === 10 && tr[1].dias === 60 && tr[2].hasta === null && tr[2].dias === 20);
  const xs = [x1, conFases("e2", "2026-01-01", [["2026-01-21", "Encargo", "Documentación"], ["2026-02-20", "Documentación", "Liquidación"]], "liquidacion"), conFases("e3", "2026-01-01", [["2026-01-31", "Encargo", "Documentación"]], "documentacion"), conFases("e4", "2025-10-01", [["2025-10-05", "Encargo", "Documentación"], ["2025-11-04", "Documentación", "Firma"], ["2025-12-04", "Firma", "Archivado"]], "cerrado")];
  const FL = T.scFasesLentas(xs, "2026-06-01", FASES, (x) => x.fase !== "cerrado");
  const doc = FL.find((f) => f.k === "documentacion"), enc = FL.find((f) => f.k === "encargo");
  si("20 · fases: media del despacho en Documentación (60, 30, 30 → 40 días)", doc.media === 40 && doc.nHist === 3 && doc.propia);
  si("20 · fases: lento por encima de 1,5 × la media (121 días > 60)", doc.lentos.length === 1 && doc.lentos[0].x.id === "e3" && doc.umbral === 60);
  si("20 · fases: media de Encargo (10, 20, 30, 4 → 16)", enc.media === 16);
  si("20 · fases: un expediente archivado no tiene tramo abierto", !T.scTramosFase(xs[3], "2026-06-01", FASES).some((t) => t.hasta === null));
  // North Star, dinero, carga y motivos
  const acc = (x) => x.A;
  const exps = [{ id: "a", responsable: "u1", A: { crit: [], prox: [], bloq: [] } }, { id: "b", responsable: "u1", A: { crit: [{ tipo: "plazo", dias: -3 }], prox: [], bloq: [{ tipo: "docs" }] } }, { id: "c", responsable: "u2", A: { crit: [], prox: [{ tipo: "plazo", dias: 3 }], bloq: [] } }, { id: "d", fase: "cerrado", responsable: "u2", A: { crit: [{}], prox: [], bloq: [] } }];
  const act = (x) => x.fase !== "cerrado";
  const NS = T.scNorthStar(exps, acc, act);
  si("20 · North Star: 2 de 3 activos al día → 67 %", NS.n === 3 && NS.al === 2 && NS.pct === 67);
  const D = T.scDinero([{ fase: "documentacion", despacho: { movs: [{ tipo: "factura", importe: 500 }] }, F: { presup: 1000, hon: 300, saldo: 200 } }, { fase: "cerrado", despacho: { movs: [] }, F: { presup: 800, hon: 800, saldo: -50 } }], (x) => x.F);
  si("20 · dinero: por facturar 500, pendiente de cobro 200, provisiones 200, adelantado 50", D.presup === 1000 && D.facturado === 500 && D.cobrado === 1100 && D.porFacturar === 500 && D.pendCobro === 200 && D.provisiones === 200 && D.adelantado === 50);
  const C = T.scCarga(exps, [{ id: "u1", nombre: "Uno" }, { id: "u2", nombre: "Dos" }], acc, act, "2026-06-01");
  const u1 = C.find((r) => r.id === "u1");
  si("20 · carga: activos, al día, críticos y vencidos por persona", u1.activos === 2 && u1.alDia === 1 && u1.criticos === 1 && u1.vencidos === 1 && u1.bloqueos === 1 && C.find((r) => r.id === "u2").semana === 1);
  const M = T.scMotivos([{ tipo: "docs", quien: "familia", xId: "a" }, { tipo: "docs", quien: "familia", xId: "b" }, { tipo: "solicitud", quien: "banco", xId: "a" }, { tipo: "dato", quien: "heredero:Ana", xId: "c" }]);
  si("20 · motivos de bloqueo ordenados por expedientes", M[0].motivo === "Documentación pendiente de la familia" && M[0].exps === 2 && M.some((m) => m.motivo === "Respuesta pendiente de bancos") && M.some((m) => m.motivo === "Faltan datos de herederos"));
  const Dsp = {}; T.scNSApuntar(Dsp, "2026-06-01", { al: 2, n: 3, pct: 67 }); T.scNSApuntar(Dsp, "2026-06-01", { al: 3, n: 3, pct: 100 }); T.scNSApuntar(Dsp, "2026-06-02", { al: 3, n: 3, pct: 100 });
  si("20 · North Star: una muestra por día", Dsp.northStar.length === 2 && Dsp.northStar[0].al === 3);
  // Búsqueda global
  const xb = base(); xb.nombre = "José Martínez Núñez"; xb.bitacora = [{ t: "2026-05-01T10:00:00Z", tipo: "nota", texto: "El banco Unicaja pide el certificado de últimas voluntades" }]; xb.tareasDespacho = [{ id: "k1", titulo: "Revisar cuaderno con el socio", fecha: "2026-06-01" }];
  const xc = { id: "x2", nombre: "Carmen Ruiz", personas: [{ id: "q1", nombre: "Pedro Ruiz", relacion: "hijo", nif: "87654321X" }], bienes: [], despacho: { ref: "EXP-2026-002" } };
  const IDX = T.bgIndice([xb, xc], [{ id: "d1", expId: "x1", nombre: "Escritura de compraventa Triana.pdf", fecha: "2026-03-02T00:00:00Z" }], (x) => (x.id === "x1" ? [{ id: "isd", titulo: "Impuesto sobre Sucesiones", organismo: "Agencia Tributaria de Andalucía", st: "pend", limite: "2026-09-01" }] : [{ id: "isd", titulo: "Impuesto sobre Sucesiones", st: "pend" }]));
  const grupos = (q, act) => T.bgBuscar(q, IDX, 6, act).map((g) => g.g);
  const primero = (q, g, act) => (T.bgBuscar(q, IDX, 6, act).find((G) => G.g === g) || { items: [] }).items[0];
  si("20 · búsqueda: NIF con guion y minúscula", primero("12345678-z", "persona")?.id === "p1");
  si("20 · búsqueda: sin acentos («jose martinez nunez» → causante)", primero("jose martinez nunez", "persona")?.id === "c:x1");
  si("20 · búsqueda: referencia catastral parcial", primero("9872023vh", "bien")?.id === "b1");
  si("20 · búsqueda: documento archivado por su nombre", primero("compraventa triana", "doc")?.id === "d1");
  si("20 · búsqueda: referencia del expediente", primero("exp-2026-002", "exp")?.id === "x2");
  si("20 · búsqueda: tareas y anotaciones", primero("cuaderno", "tarea")?.id === "k1" && primero("ultimas voluntades", "nota")?.xId === "x1");
  si("20 · búsqueda: los trámites necesitan 3 caracteres", !grupos("im").includes("tramite") && grupos("impuesto").includes("tramite"));
  si("20 · búsqueda: el expediente abierto va primero", primero("impuesto", "tramite", "x2")?.xId === "x2" && primero("impuesto", "tramite", "x1")?.xId === "x1");
  si("20 · búsqueda: consulta vacía o sin coincidencias", T.bgBuscar("", IDX).length === 0 && T.bgBuscar("zzzzqq", IDX).length === 0);
  // Tareas en Mi día
  const xt = { id: "t1", tareasDespacho: [{ id: "a", titulo: "Atrasada", fecha: "2026-05-30", resp: "u2" }, { id: "b", titulo: "Lejana", fecha: "2026-07-30" }, { id: "c", titulo: "Hecha", fecha: "2026-05-01", hecha: "2026-05-02" }, { id: "d", titulo: "Sin fecha" }, { id: "e", titulo: "Esta semana", fecha: "2026-06-05" }] };
  const TK = T.tkRadarItems(xt, "2026-06-01", { xId: "t1", responsable: "u1" });
  si("20 · tareas: solo las pendientes con fecha en 7 días o atrasadas", TK.length === 2 && TK.map((i) => i.titulo).join() === "Atrasada,Esta semana");
  si("20 · tareas: atrasada es crítica y va a su responsable", TK[0].nivel === "bad" && TK[0].dias === -2 && TK[0].responsable === "u2" && TK[1].nivel === "warn" && TK[1].responsable === "u1");
  // Acciones masivas
  const notas = [], xm = [{ id: "m1", fase: "encargo", responsable: "u1", bitacora: [] }, { id: "m2", fase: "firma", responsable: "u2" }, { id: "m3", fase: "encargo" }];
  const nF = T.maAplicar(xm, ["m1", "m2"], "fase", "firma", (x, t, tp) => notas.push([x.id, t, tp]), { fase: F.fase, abogado: (id) => id });
  si("20 · masivas: cambia solo los marcados que no estaban ya en la fase", nF === 1 && xm[0].fase === "firma" && xm[2].fase === "encargo" && notas[0][1] === "Fase: Encargo → Firma" && notas[0][2] === "fase");
  const nR = T.maAplicar(xm, ["m1", "m2", "m3"], "resp", "__none", () => {}, { fase: F.fase, abogado: (id) => id });
  si("20 · masivas: quitar el responsable", nR === 2 && xm.every((x) => !x.responsable));
}

// ── 21. Plusvalía sin valores conocidos: método objetivo, nunca «no sujeto» por falta de datos ──
{
  const base = { municipio: "OTRO", fechaFallecimiento: "2026-04-20", fecha: "2026-04-20", inmueble: { valorCatastralSuelo: 60000, valorCatastralTotal: 140000, adquisicion: { fecha: "1995-05-10", valor: 72121.45 }, valorTransmision: "" }, titulares: [{ heredero: { nombre: "A", relacion: "hijo" }, fraccion: 1 }] };
  const r = calcularPlusvalia(base);
  eq("sin valor de transmisión → objetivo", r.metodo === "objetivo" ? 1 : 0, 1, 0);
  eq("sin valor de transmisión → cuota > 0", r.cuota > 0 ? 1 : 0, 1, 0);
  const r2_ = calcularPlusvalia({ ...base, inmueble: { ...base.inmueble, valorTransmision: 60000 } });
  eq("con los dos valores y pérdida → no sujeto", r2_.metodo === "no sujeto" ? 1 : 0, 1, 0);
  const r3 = calcularPlusvalia({ ...base, inmueble: { ...base.inmueble, valorTransmision: 250000, adquisicion: { fecha: "1995-05-10", valor: 0 } } });
  eq("sin valor de adquisición → objetivo", r3.metodo === "objetivo" ? 1 : 0, 1, 0);
}

// ── 22. Plusvalía en los territorios forales (Navarra, Bizkaia, Gipuzkoa y Álava): casos calculados a mano (07-10-2026) ──
// Suelo 100.000 €, total 250.000 €, sin valores de mercado (método objetivo), fallecimiento 15-06-2026. Tablas: PLUSVALIA_FORAL en motor.mjs.
{
  const PF = (municipio, ine, rel, adq, extra = {}, her = {}) => calcularPlusvalia({ inmueble: { municipio, ine, valorCatastralTotal: 250000, valorCatastralSuelo: 100000, adquisicion: { fecha: adq, valor: extra.valorAdq || 0 }, valorTransmision: extra.valorTransmision || "", esViviendaHabitual: true, ...extra }, titulares: [{ heredero: { nombre: "T", relacion: rel, edad: 40, ...her }, fraccion: 1 }], fecha: extra.fecha || "2026-06-15", caudalTotal: 500000 });
  const A10 = "2016-05-01", A20 = "1990-05-01", A19 = "2007-05-01", A3 = "2023-05-01";
  // Régimen por código INE
  eq("22 · INE 31232 (Tudela) → Navarra", regimenPlusvalia("31232")?.id === "NAV" ? 1 : 0, 1, 0);
  eq("22 · INE 48013 (Barakaldo) → Bizkaia; 20045 (Irun) → Gipuzkoa; 01036 (Laudio) → Álava", regimenPlusvalia("48013")?.id === "BIZ" && regimenPlusvalia("20045")?.id === "GIP" && regimenPlusvalia("01036")?.id === "ALA" ? 1 : 0, 1, 0);
  eq("22 · INE 28079 (Madrid) → régimen común", regimenPlusvalia("28079") === null && PF("OTRO", "28079", "hermano", A10).regimen === "comun" ? 1 : 0, 1, 0);
  eq("22 · tablas forales: 21 coeficientes entre 0 y 0,6", Object.values(PLUSVALIA_FORAL).every((F) => F.coef.length === 21 && F.coef.every((c) => c >= 0 && c <= 0.6)) ? 1 : 0, 1, 0);

  // NAVARRA (LF 2/1995): tipo máximo 25 % (art. 176.2), coeficientes del art. 175.2 (2026: 0,58 a 10 años), exención en línea recta y cónyuges (art. 173.1.b)
  const tu = PF("OTRO", "31232", "hermano", A10);
  eq("22 · Navarra sin ordenanza, hermano, 10 años: coeficiente 0,58", tu.coeficiente, 0.58, 1e-9);
  eq("22 · Navarra sin ordenanza: tipo máximo foral 25 %", tu.tipo, 0.25, 1e-9);
  eq("22 · Navarra, hermano: 100.000 × 0,58 × 25 % = 14.500 €", tu.total, 14500);
  const tuH = PF("OTRO", "31232", "hijo", A10);
  eq("22 · Navarra, hijo: exento (art. 173.1.b LF 2/1995), 0 €", tuH.total, 0, 0);
  eq("22 · Navarra, hijo: marcado exento y citado", tuH.porTitular[0].exento === true && /173\.1\.b/.test(tuH.porTitular[0].norma) ? 1 : 0, 1, 0);
  eq("22 · Navarra, nieta y cónyuge también exentos", PF("OTRO", "31232", "nieto", A10).total + PF("OTRO", "31232", "conyuge", A10).total, 0, 0);
  const tuP = PF("OTRO", "31232", "pareja_hecho", A10, {}, { inscrita: true });
  eq("22 · Navarra, pareja estable: no exenta (texto: «cónyuges»), 14.500 € y aviso", tuP.total === 14500 && /pareja estable/.test(tuP.porTitular[0].norma) ? 1 : 0, 1, 0);
  eq("22 · Navarra, tipo introducido del 30 %: se limita al 25 % (art. 176.2)", PF("OTRO", "31232", "hermano", A10, { tipoManual: 30 }).tipo, 0.25, 1e-9);
  eq("22 · Pamplona, hermano, 10 años: 100.000 × 0,58 × 17,35 % = 10.063 €", PF("PAMPLONA", undefined, "hermano", A10).total, 10063);
  // Menos de un año: 5 meses completos → 0,06 × 5/12 = 0,025 → 2.500 × 17,35 % = 433,75 €
  eq("22 · Pamplona, 5 meses: 433,75 € (coeficiente 0,06 prorrateado)", PF("PAMPLONA", undefined, "hermano", "2026-01-10").total, 433.75);
  // Método real (arts. 172.4 y 175.7 LF 2/1995): (300.000 − 280.000) × 40 % de suelo = 8.000 < 58.000 → 8.000 × 25 % = 2.000 €
  const tuR = PF("OTRO", "31232", "hermano", A10, { valorTransmision: 300000, valorAdq: 280000 });
  eq("22 · Navarra, método real: 2.000 € y cita foral", tuR.total === 2000 && tuR.metodo === "real" && tuR.alertas.some((a) => /175\.7 LF 2\/1995/.test(a)) ? 1 : 0, 1, 0);
  eq("22 · Navarra, pérdida: no sujeto", PF("OTRO", "31232", "hermano", A10, { valorTransmision: 200000, valorAdq: 280000 }).total, 0, 0);
  eq("22 · Navarra, fallecimiento en 2025: aviso de la tabla de 2026", PF("OTRO", "31232", "hermano", A10, { fecha: "2025-06-15" }).alertas.some((a) => /anterior a la tabla foral/.test(a)) ? 1 : 0, 1, 0);
  eq("22 · Navarra: aviso de régimen foral con su norma", tu.alertas.some((a) => /Régimen foral de Navarra/.test(a) && /Ley Foral 2\/1995/.test(a)) ? 1 : 0, 1, 0);
  eq("22 · Navarra: resultado con el régimen", tu.regimen === "NAV" && tu.foral && tu.foral.tipoMax === 0.25 ? 1 : 0, 1, 0);

  // BIZKAIA (NF 8/1989): tipo máximo 30 %, envolvente DFN 2/2024 / tabla de Basauri 2026 (10 años: máx(0,12; 0,16) = 0,16; 20 años: máx(0,40; 0,35) = 0,40), bonificación hasta el 100 %
  eq("22 · Bizkaia sin ordenanza (Barakaldo), hermano, 10 años: 100.000 × 0,16 × 30 % = 4.800 €", PF("OTRO", "48013", "hermano", A10).total, 4800);
  eq("22 · Bizkaia sin ordenanza, 20 años: 100.000 × 0,40 × 30 % = 12.000 €", PF("OTRO", "48013", "hermano", A20).total, 12000);
  eq("22 · Bizkaia, hijo con bonificación del 100 % introducida: 0 € (la NF permite el 100 %)", PF("OTRO", "48013", "hijo", A20, { bonifManual: 100 }).total, 0, 0);
  eq("22 · Bizkaia, pareja de hecho inscrita con bonificación introducida del 50 %: 6.000 €", PF("OTRO", "48013", "pareja_hecho", A20, { bonifManual: 50 }, { inscrita: true }).total, 6000);
  eq("22 · Bizkaia, hermano con bonificación introducida: no se aplica", PF("OTRO", "48013", "hermano", A20, { bonifManual: 100 }).total, 12000);
  eq("22 · Bilbao, hermano, 10 años: 30 % provisional → 4.800 €", PF("BILBAO", undefined, "hermano", A10).total, 4800);
  eq("22 · Getxo, hermano, 10 años: min(0,08; 0,16) × 8 % → 640 €", PF("GETXO", undefined, "hermano", A10).total, 640);
  // Getxo, cónyuge, vivienda habitual, renta 15.000 €, 20 años: min(0,45; 0,40) = 0,40 → 40.000 × 8,75 % = 3.500 → 33 % → 2.345 €
  eq("22 · Getxo, cónyuge con renta < 18.000 €: 2.345 € (33 %)", PF("GETXO", undefined, "conyuge", A20, {}, { ingresosAnuales: 15000 }).total, 2345);
  eq("22 · Getxo, hijo: sin bonificación → 3.500 €", PF("GETXO", undefined, "hijo", A20).total, 3500);
  // Basauri, 20 años: 0,35 × 11,29 % = 3.951,50 €; hijo conviviente en la vivienda habitual → 100 %
  eq("22 · Basauri, hermano, 20 años: 3.951,50 €", PF("BASAURI", undefined, "hermano", A20).total, 3951.5);
  eq("22 · Basauri, hijo conviviente: bonificación del 100 % → 0 €", PF("BASAURI", undefined, "hijo", A20, {}, { convivio2anios: true }).total, 0, 0);
  eq("22 · Basauri, 10 años: 0,16 × 7,76 % = 1.241,60 €", PF("BASAURI", undefined, "hermano", A10).total, 1241.6);
  eq("22 · Ermua, hermano, 10 años: 0,08 × 9 % → 720 €", PF("ERMUA", undefined, "hermano", A10).total, 720);

  // GIPUZKOA (NF 16/1989): tabla del DFN 2/2023 (10 años 0,10; 19 años 0,29; 20 años 0,45), tope prudente del 30 %, bonificación hasta el 95 %
  eq("22 · Gipuzkoa sin ordenanza (Irun), hermano, 10 años: 100.000 × 0,10 × 30 % = 3.000 €", PF("OTRO", "20045", "hermano", A10).total, 3000);
  eq("22 · Gipuzkoa, 20 años: 100.000 × 0,45 × 30 % = 13.500 €", PF("OTRO", "20045", "hermano", A20).total, 13500);
  const irH = PF("OTRO", "20045", "hijo", A20, { bonifManual: 100 });
  eq("22 · Gipuzkoa, hijo con 100 % introducido: se limita al 95 % → 675 €", irH.total, 675);
  eq("22 · Gipuzkoa: aviso del límite del 95 %", irH.alertas.some((a) => /se limita a 95 %/.test(a)) ? 1 : 0, 1, 0);
  eq("22 · Donostia, hermano, 19 años: 0,29 × 30 % → 8.700 €", PF("DONOSTIA", undefined, "hermano", A19).total, 8700);

  // ÁLAVA (NF 46/1989): tabla del DNUF 12/2022 (3 años 0,15; 20 años 0,45), tipo máximo 30 %, bonificación hasta el 100 %
  eq("22 · Álava sin ordenanza (Laudio), hermano, 20 años: 13.500 €", PF("OTRO", "01036", "hermano", A20).total, 13500);
  eq("22 · Álava sin ordenanza, 3 años: 100.000 × 0,15 × 30 % = 4.500 €", PF("OTRO", "01036", "hermano", A3).total, 4500);
  // Vitoria: hija conviviente con ingresos de 30.000 €, 20 años: 13.500 € × (1 − 75 %) = 3.375 €
  eq("22 · Vitoria-Gasteiz, hija conviviente con 30.000 € de ingresos: 3.375 €", PF("VITORIA", undefined, "hijo", A20, {}, { convivio2anios: true, ingresosAnuales: 30000 }).total, 3375);
  eq("22 · Oyón-Oion, hermano, 20 años: min(0,42; 0,45) × 16 % → 6.720 €", PF("OYON", undefined, "hermano", A20).total, 6720);
  eq("22 · Oyón-Oion, hijo conviviente con 20.000 €: 95 % → 336 €", PF("OYON", undefined, "hijo", A20, {}, { convivio2anios: true, ingresosAnuales: 20000 }).total, 336);
  eq("22 · Lantarón, hijo conviviente con 20.000 €, 20 años: 0,40 × 12 % = 4.800 → 90 % → 480 €", PF("LANTARON", undefined, "hijo", A20, {}, { convivio2anios: true, ingresosAnuales: 20000 }).total, 480);
  eq("22 · Lantarón, ingresos de 25.000 €: sin bonificación → 4.800 €", PF("LANTARON", undefined, "hijo", A20, {}, { convivio2anios: true, ingresosAnuales: 25000 }).total, 4800);

  // Cota superior foral: la vía por defecto nunca supera el cálculo con el tipo y los coeficientes máximos forales sin bonificación
  let sup = 0;
  for (const [ine, k] of [["31232", "OTRO"], ["31201", "PAMPLONA"], ["48020", "BILBAO"], ["48044", "GETXO"], ["48015", "BASAURI"], ["48034", "ERMUA"], ["20069", "DONOSTIA"], ["01059", "VITORIA"], ["01043", "OYON"], ["01902", "LANTARON"]])
    for (let a = 0; a <= 25; a++) { const adq = `${2026 - a}-03-01`, x = PF(k, k === "OTRO" ? ine : undefined, "hermano", adq), y = PF("OTRO", ine, "hermano", adq, { tipoManual: 30 }); if (x.cuota > y.cuota + 0.01) sup++; }
  eq("22 · forales: la cuota de cada ordenanza nunca supera la del máximo foral", sup, 0, 0);
}

// ── 23. Jerez (BOP Cádiz 192/2024): tramos por valor catastral, vivienda y resto ──
{
  const J = (vc, viv, rel = "hijo") => ORDENANZAS.JEREZ.bonif({ inmueble: { valorCatastralTotal: vc, esViviendaHabitual: viv }, heredero: { relacion: rel } }).pct;
  eq("Jerez · vivienda 70.000 → 95 %", J(70000, true), 0.95, 0);
  eq("Jerez · vivienda 100.000 → 80 %", J(100000, true), 0.8, 0);
  eq("Jerez · vivienda 140.000 → 60 %", J(140000, true), 0.6, 0);
  eq("Jerez · vivienda 200.000 → 30 %", J(200000, true), 0.3, 0);
  eq("Jerez · vivienda 300.000 → 20 %", J(300000, true), 0.2, 0);
  eq("Jerez · resto 100.000 → 30 %", J(100000, false), 0.3, 0);
  eq("Jerez · resto 300.000 → 20 %", J(300000, false), 0.2, 0);
  eq("Jerez · sobrino → 0", J(70000, true, "sobrino"), 0, 0);
}

// ── 23. Control de calidad independiente de 07-10-2026: fallos jurídicos (casos calculados a mano) ──
{
  const base = (o) => calcularISD({ criterioVivienda: "DGT", ajuar: "cero", enPlazo: true, aplicarEmpresa: false, deudas: [], gastos: [], seguros: [], reparto: "intestado", fechaFallecimiento: "2026-03-01", ...o });
  const H = (id, rel, edad, x = {}) => ({ id, nombre: id, relacion: rel, edad, ...x });
  const C = (id, v, x = {}) => ({ id, tipo: "cuenta", valor: v, titularidad: "privativo", ...x });
  const der = (r, id) => JSON.stringify(r.derechos[id] || []);
  const hv = (r, id) => r.herederos.find((h) => h.id === id);
  // C2 · plazo derivado y recargo del art. 27 LGT
  const pz = plazoPresentacionISD("2025-01-10", { hoy: "2026-10-07" });
  eq("C2 · fallecimiento 10-01-2025: plazo 10-07-2025 (jueves, hábil)", pz.limite === "2025-07-10" ? 1 : 0, 1);
  eq("C2 · a 07-10-2026: fuera de plazo, 454 días de retraso", pz.fueraDePlazo && pz.diasRetraso === 454 ? 1 : 0, 1);
  eq("C2 · con prórroga concedida el plazo es el 12-01-2026 (10-01 es sábado)", plazoPresentacionISD("2025-01-10", { hoy: "2025-12-01", prorroga: true }).fueraDePlazo ? 0 : 1, 1);
  eq("C2 · prórroga solo pedible en los cinco primeros meses", plazoPresentacionISD("2026-03-01", { hoy: "2026-08-15" }).prorrogaPosible ? 0 : 1, 1);
  // 3 meses completos de retraso (02-03 → 15-06): 1 % + 3 % = 4 % de 10.000 = 400; con la reducción del 25 %, 300
  const rc = recargoArt27(10000, "2026-03-02", "2026-06-15");
  eq("C2 · recargo 3 meses: 4 % = 400", rc.importe, 400); eq("C2 · reducción del 25 % (art. 27.5): 300", rc.reducido, 300);
  eq("C2 · dentro de plazo: sin recargo", recargoArt27(10000, "2026-03-02", "2026-03-02").importe, 0);
  // Caso 25 del informe: Extremadura, hijo de 40 años, 800.000 € en cuenta, fallecimiento 10-01-2025. En plazo: 554,67 €. Fuera de plazo pierde
  // el 99 % (art. 20 D. Leg. 1/2018): 55.466,81 €. Recargo a 07-10-2026: 14 meses → 15 % (8.320,02) + intereses de 89 días desde el 10-07-2026
  // (55.466,81 × 4,0625 % × 89 / 365 = 549,44) = 8.869,46 €
  const ext = (o) => base({ ccaa: "EXT", fechaFallecimiento: "2025-01-10", herederos: [H("a", "hijo", 40)], bienes: [C("c", 800000)], ...o });
  eq("C2 · EXT en plazo: 554,67", ext({}).total, 554.67);
  const ef = ext({ enPlazo: false, fechaReferencia: "2026-10-07" });
  eq("C2 · EXT fuera de plazo: 55.466,81 (sin bonificación)", ef.total, 55466.81);
  eq("C2 · EXT recargo 15 % + intereses: 8.869,46", ef.recargo.importe, 8869.46);
  eq("C2 · EXT intereses de 89 días: 549,44", ef.recargo.intereses, 549.44);
  eq("C2 · total con recargo 64.336,27", ef.totalConRecargo, 64336.27);
  eq("M13 · la etiqueta no dice «15 %» a secas", /^15 % \+ intereses de demora de 89 días$/.test(ef.recargo.etiqueta) ? 1 : 0, 1);
  eq("C2 · con requerimiento: sin recargo del art. 27 y aviso de sanción", (() => { const r = ext({ enPlazo: false, fechaReferencia: "2026-10-07", conRequerimiento: true }); return !r.recargo && r.alertas.some((a) => /arts\. 191/.test(a)) ? 1 : 0; })(), 1);
  eq("C2 · comunidad no cotejada (CYL) fuera de plazo: aviso con la cifra sin bonificación", base({ ccaa: "CYL", enPlazo: false, herederos: [H("a", "hijo", 40)], bienes: [C("c", 800000)] }).alertas.some((a) => /no se ha cotejado si las bonificaciones/.test(a)) ? 1 : 0, 1);
  // I6 · vecindad civil
  eq("I6 · sin vecindad: supuesta por la residencia", vecindadCivil({ ccaa: "CAT" }).id === "CAT" && vecindadCivil({ ccaa: "CAT" }).supuesta ? 1 : 0, 1);
  eq("I6 · Bizkaia → derecho vasco", vecindadCivil({ ccaa: "BIZ" }).id === "VASCO" ? 1 : 0, 1);
  // Caso 28: Cataluña, sin testamento, viuda de 70 años e hijo, 400.000 €. Usufructo universal (art. 442-3 CCCat): 89 − 70 = 19 % → 76.000; nuda 324.000
  const cat = base({ ccaa: "CAT", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] });
  eq("I6 · CAT: viuda con usufructo universal", der(cat, "v") === '[{"tipo":"usufructo","fraccion":1}]' ? 1 : 0, 1);
  eq("I6 · CAT: hijo con la nuda propiedad de todo", der(cat, "a") === '[{"tipo":"nuda","fraccion":1,"usufructuarioId":"v"}]' ? 1 : 0, 1);
  eq("I6 · CAT: valor del usufructo 76.000", hv(cat, "v").valorAdquirido, 76000);
  eq("I6 · CAT: valor de la nuda 324.000", hv(cat, "a").valorAdquirido, 324000);
  eq("I6 · CAT: nota de la conmutación (art. 442-5)", cat.notasReparto.some((n) => /442-5/.test(n)) ? 1 : 0, 1);
  eq("I6 · CAT: cuarta vidual mencionada (art. 452-1)", cat.notasReparto.some((n) => /452-1/.test(n)) ? 1 : 0, 1);
  // Conmutación: vivienda 100.000 de un caudal de 400.000 → usufructo de vivienda = 3/4 × 100.000 / 400.000 = 18,75 %; 1/4 en propiedad
  const cm = base({ ccaa: "CAT", conmutacionCat: true, herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 300000), { id: "viv", tipo: "inmueble", esViviendaHabitual: true, valor: 100000, titularidad: "privativo" }] });
  eq("I6 · CAT conmutación: 1/4 en propiedad + usufructo 18,75 %", der(cm, "v") === '[{"tipo":"pleno","fraccion":0.25},{"tipo":"usufructo","fraccion":0.1875}]' ? 1 : 0, 1);
  eq("I6 · CAT conmutación: hijo 56,25 % pleno + 18,75 % nuda", der(cm, "a") === '[{"tipo":"pleno","fraccion":0.5625},{"tipo":"nuda","fraccion":0.1875,"usufructuarioId":"v"}]' ? 1 : 0, 1);
  // Caso 7: pareja estable con un hijo: mismos derechos que el cónyuge
  const pe = base({ ccaa: "CAT", herederos: [H("p", "pareja_hecho", 55, { inscrita: true }), H("a", "hijo", 20)], bienes: [C("c", 200000)] });
  eq("I6 · CAT: la pareja estable tiene el usufructo universal", der(pe, "p") === '[{"tipo":"usufructo","fraccion":1}]' ? 1 : 0, 1);
  eq("I6 · CAT: aviso de los requisitos de la pareja estable (art. 234-1)", pe.alertas.some((a) => /234-1/.test(a)) ? 1 : 0, 1);
  const sd = base({ ccaa: "CAT", herederos: [H("v", "conyuge", 60), H("p", "padre", 85)], bienes: [C("c", 100000)] });
  eq("I6 · CAT sin descendientes: el viudo hereda todo antes que los padres", der(sd, "v") === '[{"tipo":"pleno","fraccion":1}]' && !sd.derechos.p ? 1 : 0, 1);
  eq("I6 · CAT: el padre conserva la legítima de 1/4 (art. 451-4)", sd.alertas.some((a) => /451-4/.test(a)) ? 1 : 0, 1);
  eq("I6 · CAT: medio hermanos sin distinción de vínculo", (() => { const r = base({ ccaa: "CAT", herederos: [H("h1", "hermano", 50), H("h2", "hermano", 48, { medio: true })], bienes: [C("c", 90000)] }); return r.derechos.h1[0].fraccion === 0.5 && r.derechos.h2[0].fraccion === 0.5 ? 1 : 0; })(), 1);
  eq("I6 · vecindad catalana de un residente en Madrid: reparto catalán", der(base({ ccaa: "MAD", vecindadCivil: "CAT", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }), "v") === '[{"tipo":"usufructo","fraccion":1}]' ? 1 : 0, 1);
  eq("I6 · vecindad común de un residente en Cataluña: Código Civil (1/3)", der(base({ ccaa: "CAT", vecindadCivil: "comun", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }), "v").includes('"fraccion":0.3333') ? 1 : 0, 1);
  // Galicia: usufructo de 1/4 con descendientes (art. 253 Ley 2/2006); Mallorca: de la mitad (art. 45 Compilación)
  eq("I6 · GAL: usufructo de la cuarta parte", der(base({ ccaa: "GAL", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }), "v") === '[{"tipo":"usufructo","fraccion":0.25}]' ? 1 : 0, 1);
  eq("I6 · BAL (Mallorca): usufructo de la mitad", der(base({ ccaa: "BAL", isla: "mallorca", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }), "v") === '[{"tipo":"usufructo","fraccion":0.5}]' ? 1 : 0, 1);
  eq("I6 · BAL (Eivissa): bloqueado", base({ ccaa: "BAL", isla: "eivissa", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }).bloqueo ? 1 : 0, 1);
  // Aragón, Navarra y País Vasco con viudo: no se reparte con el Código Civil
  // Ronda 4: Aragón, Navarra y País Vasco ya se reparten con su derecho propio (sección 24); con viudo e hijo ya no se bloquea
  for (const t of ["ARA", "NAV", "BIZ", "GIP", "ALA"]) { const r = base({ ccaa: t, herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }); eq(`I6 · ${t} con viudo: reparto foral calculado, sin bloqueo`, !r.bloqueo && r.derechos.v && r.derechos.v[0].tipo === "usufructo" ? 1 : 0, 1); }
  eq("I6 · ARA solo hijos: partes iguales", (() => { const r = base({ ccaa: "ARA", herederos: [H("a", "hijo", 40), H("b", "hijo", 38)], bienes: [C("c", 100000)] }); return !r.bloqueo && r.derechos.a[0].fraccion === 0.5 ? 1 : 0; })(), 1);
  eq("I6 · legítimas: misma vecindad que el reparto", calcularLegitimas({ ccaa: "MAD", vecindadCivil: "CAT", reparto: "porcentajes", herederos: [H("a", "hijo", 40, { pct: 100 })], derechos: { a: [{ tipo: "pleno", fraccion: 1 }] }, masa: { neto: 100, netoReparto: 100 } }).regimen === "CAT" ? 1 : 0, 1);
  // I7 · caso 10: Madrid, hijo, cuenta 20.000, préstamo 80.000, funeral 5.000 → pasivo 85.000, excede en 65.000; el hijo sigue con 0 €
  const i7 = base({ ccaa: "MAD", herederos: [H("a", "hijo", 40)], bienes: [C("c", 20000)], deudas: [{ importe: 80000 }], gastos: [{ importe: 5000 }] });
  eq("I7 · el heredero no desaparece (1 heredero)", i7.herederos.length, 1);
  eq("I7 · paga 0 €", i7.herederos[0].aIngresar, 0);
  eq("I7 · el pasivo excede en 65.000", i7.masa.pasivoExcede, 65000);
  eq("I7 · aviso: beneficio de inventario y renuncia", /^Más deudas que bienes/.test(i7.alertas[0]) && /1010/.test(i7.alertas[0]) && /1008/.test(i7.alertas[0]) ? 1 : 0, 1);
  // I8 · legado a una persona que ya no está: vuelve a la masa
  const i8 = base({ ccaa: "MAD", herederos: [H("a", "hijo", 40)], bienes: [C("c", 1000), { id: "v", tipo: "inmueble", esViviendaHabitual: true, valor: 200000, titularidad: "privativo", legatarioId: "fantasma" }] });
  eq("I8 · sin legados válidos", i8.masa.legados, 0); eq("I8 · el hijo recibe el piso (201.000)", i8.herederos[0].valorAdquirido, 201000);
  eq("I8 · aviso del legado huérfano", i8.alertas.some((a) => /ya no está en el expediente/.test(a)) ? 1 : 0, 1);
  // K2 · reducción de Galicia (1.000.000) sobre 8.257,29: se aplica 8.257,29
  const k2 = base({ ccaa: "GAL", herederos: [H("a", "hijo", 40)], bienes: [C("c", 8257.29)] }).herederos[0].traza.find((t) => /parentesco/.test(t.paso));
  eq("K2 · importe legal −1.000.000 y aplicado −8.257,29", k2.valor === -1000000 ? k2.aplicado : 0, -8257.29);
  // M11 · adquisición posterior al fallecimiento: método objetivo con el coeficiente máximo, sin «no sujeto» aunque los valores den pérdida
  const m11 = calcularPlusvalia({ inmueble: { municipio: "OTRO", valorCatastralSuelo: 60000, valorCatastralTotal: 140000, adquisicion: { fecha: "2027-05-10", valor: 300000 }, valorTransmision: 200000 }, titulares: [{ heredero: { nombre: "A", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-04-20" });
  eq("M11 · método objetivo, no «no sujeto»", m11.metodo === "objetivo" ? 1 : 0, 1);
  eq("M11 · coeficiente máximo de la tabla", m11.coeficiente, Math.max(...coefPlusvaliaLegal("2026-04-20").tabla));
  eq("M11 · avisos de la fecha", m11.alertas.filter((a) => /fecha de adquisición/i.test(a)).length, 2);
  // D3 · Torremolinos sin porcentaje: 0 % y marcado como bonificación pendiente (cuota máxima), sin decir «introducido a mano»
  const d3 = calcularPlusvalia({ inmueble: { municipio: "TORREMOLINOS", valorCatastralSuelo: 60000, valorCatastralTotal: 140000, adquisicion: { fecha: "2000-05-10", valor: 0 }, esViviendaHabitual: true }, titulares: [{ heredero: { nombre: "A", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-04-20" }).porTitular[0];
  eq("D3 · Torremolinos: bonificación pendiente marcada", d3.bonifPendiente && /SIN BONIFICACIÓN APLICADA/.test(d3.norma) ? 1 : 0, 1);
  eq("D3 · Torremolinos con 95 % introducido: se aplica", calcularPlusvalia({ inmueble: { municipio: "TORREMOLINOS", valorCatastralSuelo: 60000, valorCatastralTotal: 140000, adquisicion: { fecha: "2000-05-10", valor: 0 }, esViviendaHabitual: true, bonifManual: 95 }, titulares: [{ heredero: { nombre: "A", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-04-20" }).porTitular[0].bonificacionPct, 0.95);
}

// ── 24. Ronda 4 (07-10-2026): sucesión legal de Aragón, Navarra y País Vasco, bienes troncales y legítimas forales ──
// Reglas, artículos y fuentes en docs-r4/civil.md. País Vasco: Ley 5/2015 leída en el BOE (VERIFICADO). Navarra (leyes 304-307 tras la LF 21/2019)
// y Aragón (CDFA 516-534): fuentes secundarias concordantes, PENDIENTE de cotejo literal; arts. 535-536 CDFA VERIFICADOS (Ley 3/2016, BOE).
{
  const base = (o) => calcularISD({ criterioVivienda: "DGT", ajuar: "cero", enPlazo: true, aplicarEmpresa: false, deudas: [], gastos: [], seguros: [], reparto: "intestado", fechaFallecimiento: "2026-03-01", ...o });
  const H = (id, rel, edad, x = {}) => ({ id, nombre: id, relacion: rel, edad, ...x });
  const C = (id, v, x = {}) => ({ id, tipo: "cuenta", valor: v, titularidad: "privativo", ...x });
  const T = (id, v, linea, x = {}) => ({ id, tipo: "inmueble", valor: v, titularidad: "privativo", troncal: true, lineaTroncal: linea, descripcion: "Casa familiar", ...x });
  const fr = (r, id, tipo) => (r.derechos[id] || []).filter((d) => d.tipo === tipo).reduce((s, d) => s + d.fraccion, 0);
  const nada = (r, id) => !(r.derechos[id] || []).length;
  const hv = (r, id) => r.herederos.find((h) => h.id === id);
  const nota = (r, re) => r.notasReparto.some((n) => re.test(n)) ? 1 : 0;
  const aviso = (r, re) => r.alertas.some((n) => re.test(n)) ? 1 : 0;

  // ─ Aragón (CDFA) ─
  // A1: viuda de 70 y dos hijos, 400.000. Art. 517: hijos por partes iguales, a salvo el usufructo de viudedad sobre todos los bienes (art. 283):
  // usufructo universal 89 − 70 = 19 % → 76.000; cada hijo, nuda de la mitad: 200.000 × 81 % = 162.000
  const a1 = base({ ccaa: "ARA", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40), H("b", "hijo", 38)], bienes: [C("c", 400000)] });
  eq("R4 · ARA viuda e hijos: usufructo de viudedad universal (art. 283 CDFA)", fr(a1, "v", "usufructo"), 1, 1e-9);
  eq("R4 · ARA: cada hijo nuda propiedad de la mitad (art. 522 CDFA)", fr(a1, "a", "nuda") + fr(a1, "b", "nuda"), 1, 1e-9);
  eq("R4 · ARA: valor del usufructo 76.000", hv(a1, "v").valorAdquirido, 76000);
  eq("R4 · ARA: valor de la nuda de cada hijo 162.000", hv(a1, "a").valorAdquirido, 162000);
  eq("R4 · ARA: la ley aplicable se dice en claro", a1.leyReparto === "Derecho civil aragonés (Código del Derecho Foral de Aragón)" && nota(a1, /^Derecho civil aragonés, sin testamento/) ? 1 : 0, 1);
  eq("R4 · ARA: aviso de que la viudedad depende de la ley de los efectos del matrimonio (art. 9.8 CC)", aviso(a1, /9\.8 CC/), 1);
  // A2: hijo vivo y nieto de un hijo premuerto: sustitución legal por estirpes (arts. 520 y 523 CDFA): 1/2 y 1/2
  const a2 = base({ ccaa: "ARA", herederos: [H("a", "hijo", 40), H("n", "nieto", 15, { estirpe: "Pedro" })], bienes: [C("c", 100000)] });
  eq("R4 · ARA: nieto por sustitución legal (art. 523 CDFA)", fr(a2, "n", "pleno"), 0.5, 1e-9);
  // A3: sin descendientes, padres y viuda: los ascendientes heredan (art. 529) en nuda propiedad; la viuda, usufructo de viudedad universal
  const a3 = base({ ccaa: "ARA", herederos: [H("v", "conyuge", 70), H("p", "padre", 92), H("m", "padre", 90)], bienes: [C("c", 400000)] });
  eq("R4 · ARA sin hijos: viuda con usufructo universal", fr(a3, "v", "usufructo"), 1, 1e-9);
  eq("R4 · ARA sin hijos: padres con la nuda propiedad por mitad (arts. 529-530 CDFA)", fr(a3, "p", "nuda") === 0.5 && fr(a3, "m", "nuda") === 0.5 && fr(a3, "p", "pleno") === 0 ? 1 : 0, 1);
  // A4: viuda y hermano: el cónyuge va antes que los colaterales (art. 531 CDFA)
  const a4 = base({ ccaa: "ARA", herederos: [H("v", "conyuge", 70), H("h", "hermano", 60)], bienes: [C("c", 400000)] });
  eq("R4 · ARA viuda y hermano: hereda la viuda (art. 531 CDFA)", fr(a4, "v", "pleno") === 1 && nada(a4, "h") ? 1 : 0, 1);
  eq("R4 · ARA sin descendientes: aviso de recobro (arts. 524-525) y de troncales (arts. 526-528)", aviso(a4, /524-525/) && aviso(a4, /526-528/) ? 1 : 0, 1);
  // A5: hermano de doble vínculo y medio hermano: doble porción (arts. 532-534 CDFA): 2/3 y 1/3
  const a5 = base({ ccaa: "ARA", herederos: [H("h1", "hermano", 60), H("h2", "hermano", 55, { medio: true })], bienes: [C("c", 90000)] });
  eq("R4 · ARA: hermano de doble vínculo, doble porción (2/3)", fr(a5, "h1", "pleno"), 2 / 3, 1e-9);
  // A6: pareja estable no casada y hermano: la pareja no hereda sin testamento
  const a6 = base({ ccaa: "ARA", herederos: [H("p", "pareja_hecho", 60, { inscrita: true }), H("h", "hermano", 60)], bienes: [C("c", 90000)] });
  eq("R4 · ARA: la pareja estable no hereda sin testamento; hereda el hermano", fr(a6, "h", "pleno") === 1 && nada(a6, "p") && aviso(a6, /pareja estable no casada no hereda/) ? 1 : 0, 1);
  // A7: viuda, hermano y casa troncal de la línea paterna (100.000 de 400.000): la casa va al hermano (art. 526.1.º) con el usufructo de viudedad;
  // el resto, a la viuda (art. 531). Viuda: 3/4 en pleno y usufructo de 1/4; hermano: nuda de 1/4
  const a7 = base({ ccaa: "ARA", herederos: [H("v", "conyuge", 70), H("h", "hermano", 60)], bienes: [C("c", 300000), T("t", 100000, "paterna")] });
  eq("R4 · ARA troncal: viuda 3/4 en pleno", fr(a7, "v", "pleno"), 0.75, 1e-9);
  eq("R4 · ARA troncal: viuda usufructo de la casa troncal (1/4)", fr(a7, "v", "usufructo"), 0.25, 1e-9);
  eq("R4 · ARA troncal: hermano nuda propiedad de la casa (1/4)", fr(a7, "h", "nuda"), 0.25, 1e-9);
  // A8: padre (de la línea materna: es la madre) y hermano; casa troncal paterna. No troncales: la madre (art. 529); troncal: el hermano (526.1.º)
  const a8 = base({ ccaa: "ARA", herederos: [H("m", "padre", 85, { lineaAsc: "materna" }), H("h", "hermano", 60)], bienes: [C("c", 300000), T("t", 100000, "paterna")] });
  eq("R4 · ARA troncal: la madre hereda los no troncales (3/4)", fr(a8, "m", "pleno"), 0.75, 1e-9);
  eq("R4 · ARA troncal: el hermano hereda la casa paterna (1/4)", fr(a8, "h", "pleno"), 0.25, 1e-9);
  // A9: medio hermano sin línea indicada y casa troncal: no se sabe si es de la línea de procedencia → bloqueo con instrucción
  const a9 = base({ ccaa: "ARA", herederos: [H("h", "hermano", 60, { medio: true })], bienes: [C("c", 300000), T("t", 100000, "paterna")] });
  eq("R4 · ARA troncal y medio hermano sin línea: bloqueo con instrucción", a9.bloqueo && /línea/.test(a9.bloqueo.accion) && /^Reparto legal no calculado/.test(a9.alertas[0]) ? 1 : 0, 1);
  // A10: con descendientes, la troncalidad no juega (art. 517 CDFA)
  const a10 = base({ ccaa: "ARA", herederos: [H("a", "hijo", 40), H("h", "hermano", 60)], bienes: [C("c", 300000), T("t", 100000, "paterna")] });
  eq("R4 · ARA troncal con hijo: todo al hijo", fr(a10, "a", "pleno") === 1 && nada(a10, "h") ? 1 : 0, 1);
  // A11: viudo separado e hijo: el separado no hereda (art. 531 CDFA) ni tiene viudedad
  const a11 = base({ ccaa: "ARA", herederos: [H("v", "conyuge", 60, { separado: true }), H("a", "hijo", 30)], bienes: [C("c", 100000)] });
  eq("R4 · ARA cónyuge separado: hereda todo el hijo", fr(a11, "a", "pleno") === 1 && nada(a11, "v") && aviso(a11, /art\. 531 CDFA/) ? 1 : 0, 1);
  // A12: sin parientes: Comunidad Autónoma de Aragón (art. 535, VERIFICADO)
  eq("R4 · ARA sin parientes: hereda la Comunidad Autónoma (art. 535 CDFA)", nota(base({ ccaa: "ARA", herederos: [H("x", "extrano", 50)], bienes: [C("c", 10000)] }), /art\. 535 CDFA/), 1);

  // ─ Navarra (Fuero Nuevo tras la LF 21/2019) ─
  // N1: viudo e hijo: hijos por partes iguales (ley 304.1) con el usufructo de viudedad universal (ley 253)
  const n1 = base({ ccaa: "NAV", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] });
  eq("R4 · NAV viudo e hijo: usufructo de viudedad universal (ley 253)", fr(n1, "v", "usufructo") === 1 && fr(n1, "a", "nuda") === 1 ? 1 : 0, 1);
  // N2: viuda y padre, sin hijos: el cónyuge va antes que los ascendientes (ley 304.2)
  const n2 = base({ ccaa: "NAV", herederos: [H("v", "conyuge", 70), H("p", "padre", 90)], bienes: [C("c", 400000)] });
  eq("R4 · NAV viuda y padre: hereda la viuda (ley 304.2)", fr(n2, "v", "pleno") === 1 && nada(n2, "p") ? 1 : 0, 1);
  // N3: hermano de doble vínculo y medio hermano: por partes iguales (ley 304.4)
  const n3 = base({ ccaa: "NAV", herederos: [H("h1", "hermano", 60), H("h2", "hermano", 55, { medio: true })], bienes: [C("c", 90000)] });
  eq("R4 · NAV: medio hermano por partes iguales (ley 304.4)", fr(n3, "h1", "pleno") === 0.5 && fr(n3, "h2", "pleno") === 0.5 ? 1 : 0, 1);
  // N4: hermano y dos sobrinos de un hermano premuerto: representación (ley 304.4): 1/2, 1/4 y 1/4
  const n4 = base({ ccaa: "NAV", herederos: [H("h", "hermano", 60), H("s1", "sobrino", 30, { estirpe: "Luis" }), H("s2", "sobrino", 28, { estirpe: "Luis" })], bienes: [C("c", 100000)] });
  eq("R4 · NAV: sobrinos por representación (ley 304.4)", fr(n4, "h", "pleno") === 0.5 && fr(n4, "s1", "pleno") === 0.25 ? 1 : 0, 1);
  // N5: tío y primo: el de grado más próximo excluye al más remoto (ley 304.5)
  const n5 = base({ ccaa: "NAV", herederos: [H("t", "tio", 70), H("q", "primo", 40)], bienes: [C("c", 50000)] });
  eq("R4 · NAV: el tío excluye al primo (ley 304.5)", fr(n5, "t", "pleno") === 1 && nada(n5, "q") ? 1 : 0, 1);
  // N6: pareja estable inscrita y hermano: la pareja no tiene derechos legales (ley 113)
  const n6 = base({ ccaa: "NAV", herederos: [H("p", "pareja_hecho", 60, { inscrita: true }), H("h", "hermano", 60)], bienes: [C("c", 90000)] });
  eq("R4 · NAV: la pareja estable no hereda sin testamento (ley 113)", fr(n6, "h", "pleno") === 1 && nada(n6, "p") ? 1 : 0, 1);
  // N7: bien troncal con un ascendiente vivo: el primer llamamiento de la ley 307 no está cotejado → bloqueo
  const n7 = base({ ccaa: "NAV", herederos: [H("p", "padre", 85, { lineaAsc: "paterna" }), H("h", "hermano", 60)], bienes: [C("c", 300000), T("t", 100000, "paterna")] });
  eq("R4 · NAV troncal con ascendiente vivo: bloqueo (ley 307.1 PENDIENTE)", n7.bloqueo && /ley 307/.test(n7.bloqueo.motivo) ? 1 : 0, 1);
  // N8: viuda y hermano, inmueble troncal materno de 200.000 en 400.000: no troncales a la viuda (304.2); troncal al hermano (307.2) con el
  // usufructo de viudedad de la viuda: viuda 1/2 en pleno + usufructo de 1/2; hermano nuda de 1/2
  const n8 = base({ ccaa: "NAV", herederos: [H("v", "conyuge", 70), H("h", "hermano", 60)], bienes: [C("c", 200000), T("t", 200000, "materna")] });
  eq("R4 · NAV troncal: viuda 1/2 en pleno y usufructo de 1/2", fr(n8, "v", "pleno") === 0.5 && fr(n8, "v", "usufructo") === 0.5 ? 1 : 0, 1);
  eq("R4 · NAV troncal: hermano nuda propiedad de 1/2 (ley 307.2)", fr(n8, "h", "nuda"), 0.5, 1e-9);
  eq("R4 · NAV sin parientes: Comunidad Foral (ley 304.6)", nota(base({ ccaa: "NAV", herederos: [H("x", "extrano", 50)], bienes: [C("c", 10000)] }), /Comunidad Foral de Navarra/), 1);

  // ─ País Vasco (Ley 5/2015, VERIFICADO) ─
  // V1: viuda de 70 e hijo, 400.000: el hijo hereda (arts. 112-113) y la viuda conserva el usufructo de la mitad (arts. 114.2 y 52.1):
  // usufructo 200.000 × 19 % = 38.000; hijo 200.000 + 200.000 × 81 % = 362.000
  const v1 = base({ ccaa: "BIZ", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] });
  eq("R4 · VASCO viuda e hijo: usufructo de la mitad (arts. 114.2 y 52.1)", fr(v1, "v", "usufructo"), 0.5, 1e-9);
  eq("R4 · VASCO: valor del usufructo 38.000", hv(v1, "v").valorAdquirido, 38000);
  eq("R4 · VASCO: hijo 362.000 (mitad en pleno y nuda de la otra mitad)", hv(v1, "a").valorAdquirido, 362000);
  eq("R4 · VASCO: aviso del derecho de habitación (art. 54)", nota(v1, /art\. 54/), 1);
  // V2: pareja de hecho inscrita y dos hijos: igual que el cónyuge (art. 112)
  const v2 = base({ ccaa: "GIP", herederos: [H("p", "pareja_hecho", 60, { inscrita: true }), H("a", "hijo", 30), H("b", "hijo", 28)], bienes: [C("c", 200000)] });
  eq("R4 · VASCO: la pareja de hecho tiene el usufructo de la mitad", fr(v2, "p", "usufructo") === 0.5 && fr(v2, "a", "pleno") === 0.25 ? 1 : 0, 1);
  // V3: viuda y padres, sin hijos: el cónyuge precede a los ascendientes (art. 114.1)
  const v3 = base({ ccaa: "ALA", herederos: [H("v", "conyuge", 70), H("p", "padre", 92), H("m", "padre", 90)], bienes: [C("c", 300000)] });
  eq("R4 · VASCO viuda y padres: hereda la viuda (art. 114.1)", fr(v3, "v", "pleno") === 1 && nada(v3, "p") && nada(v3, "m") ? 1 : 0, 1);
  // V4: solo los padres: por mitad (art. 115.1)
  const v4 = base({ ccaa: "BIZ", herederos: [H("p", "padre", 70), H("m", "padre", 68)], bienes: [C("c", 300000)] });
  eq("R4 · VASCO padres por mitad (art. 115.1)", fr(v4, "p", "pleno") === 0.5 && fr(v4, "m", "pleno") === 0.5 ? 1 : 0, 1);
  // V5: hermano de doble vínculo y medio hermano: doble porción (art. 116.2): 2/3 y 1/3
  const v5 = base({ ccaa: "BIZ", herederos: [H("h1", "hermano", 60), H("h2", "hermano", 55, { medio: true })], bienes: [C("c", 90000)] });
  eq("R4 · VASCO: doble vínculo, doble porción (art. 116.2)", fr(v5, "h2", "pleno"), 1 / 3, 1e-9);
  // V6: viuda y padre (línea paterna), caserío troncal paterno de 300.000 y cuenta de 100.000. No troncales (1/4) a la viuda (art. 114.1);
  // el caserío al padre como tronquero (arts. 66.2 y 111.1). La legítima de la viuda (usufructo de 2/3, art. 52.2) no cabe en 1/4: el usufructo
  // que falta (2/3 − 1/4 = 5/12) recae sobre el caserío (arts. 70.3 y 111.1). Padre: 1/3 en pleno y nuda de 5/12; viuda: 1/4 y usufructo de 5/12
  const v6 = base({ ccaa: "BIZ", herederos: [H("v", "conyuge", 70), H("p", "padre", 85, { lineaAsc: "paterna" })], bienes: [C("c", 100000), T("t", 300000, "paterna", { descripcion: "Caserío" })] });
  eq("R4 · VASCO troncal: viuda 1/4 en pleno", fr(v6, "v", "pleno"), 0.25, 1e-9);
  eq("R4 · VASCO troncal: usufructo de la viuda sobre el caserío, 5/12", fr(v6, "v", "usufructo"), 5 / 12, 1e-9);
  eq("R4 · VASCO troncal: padre 1/3 en pleno y nuda de 5/12", Math.abs(fr(v6, "p", "pleno") - 1 / 3) < 1e-9 && Math.abs(fr(v6, "p", "nuda") - 5 / 12) < 1e-9 ? 1 : 0, 1);
  // V7: mismos parientes, cuenta de 300.000 y caserío de 100.000: los no troncales (3/4) cubren los 2/3 → el caserío, libre para el padre
  const v7 = base({ ccaa: "BIZ", herederos: [H("v", "conyuge", 70), H("p", "padre", 85, { lineaAsc: "paterna" })], bienes: [C("c", 300000), T("t", 100000, "paterna")] });
  eq("R4 · VASCO troncal suficiente: viuda 3/4 y padre 1/4 en pleno", fr(v7, "v", "pleno") === 0.75 && fr(v7, "p", "pleno") === 0.25 && !fr(v7, "v", "usufructo") ? 1 : 0, 1);
  // V8: casa troncal paterna, padre sin línea indicada: bloqueo con instrucción
  eq("R4 · VASCO troncal y padre sin línea: bloqueo", base({ ccaa: "BIZ", herederos: [H("v", "conyuge", 70), H("p", "padre", 85)], bienes: [C("c", 100000), T("t", 300000, "paterna")] }).bloqueo ? 1 : 0, 1);
  // V9: sin tronqueros de la línea (solo un medio hermano materno y un bien paterno): deja de ser troncal (arts. 63.2 y 111.2)
  const v9 = base({ ccaa: "BIZ", herederos: [H("h", "hermano", 50, { medio: true, lineaAsc: "materna" })], bienes: [C("c", 100000), T("t", 100000, "paterna")] });
  eq("R4 · VASCO sin tronqueros: el bien se reparte como no troncal", fr(v9, "h", "pleno") === 1 && nota(v9, /111\.2/) ? 1 : 0, 1);
  // V10: una cuenta marcada como troncal: en el País Vasco solo son troncales los bienes raíces (arts. 61 y 64)
  eq("R4 · VASCO: una cuenta no puede ser troncal (aviso)", aviso(base({ ccaa: "BIZ", herederos: [H("v", "conyuge", 70), H("p", "padre", 85, { lineaAsc: "paterna" })], bienes: [C("c", 100000, { troncal: true, lineaTroncal: "paterna", descripcion: "Depósito" })] }), /solo lo son los bienes raíces/), 1);
  // V11: cónyuge separado e hijo (art. 112: excluido el separado legalmente o por mutuo acuerdo fehaciente)
  const v11 = base({ ccaa: "BIZ", herederos: [H("v", "conyuge", 60, { separado: true }), H("a", "hijo", 30)], bienes: [C("c", 100000)] });
  eq("R4 · VASCO cónyuge separado: todo al hijo y aviso del art. 112", fr(v11, "a", "pleno") === 1 && nada(v11, "v") && aviso(v11, /art\. 112 Ley 5\/2015/) ? 1 : 0, 1);
  eq("R4 · VASCO sin parientes: Administración General del País Vasco (art. 117)", nota(base({ ccaa: "BIZ", herederos: [H("x", "extrano", 50)], bienes: [C("c", 10000)] }), /art\. 117 Ley 5\/2015/), 1);
  eq("R4 · VASCO: vecindad vasca de un residente en Madrid", fr(base({ ccaa: "MAD", vecindadCivil: "VASCO", herederos: [H("v", "conyuge", 70), H("a", "hijo", 40)], bienes: [C("c", 400000)] }), "v", "usufructo"), 0.5, 1e-9);

  // ─ Legítimas forales ─
  const LG = (ccaa, herederos, derechos, extra = {}) => calcularLegitimas({ ccaa, reparto: "porcentajes", herederos, derechos, masa: { neto: 300000, netoReparto: 300000 }, ...extra });
  const lv = LG("BIZ", [H("v", "conyuge", 70), H("a", "hijo", 40, { pct: 100 })], { a: [{ tipo: "pleno", fraccion: 1 }] });
  eq("R4 · legítima vasca: colectiva de 1/3 (art. 49)", lv.colectiva.importe, 100000);
  eq("R4 · legítima vasca: usufructo del viudo sobre la mitad (art. 52.1)", lv.viudo.fraccion === 0.5 && /art\. 52/.test(lv.viudo.norma) ? 1 : 0, 1);
  eq("R4 · legítima vasca: Ayala y troncalidad en las notas", lv.notas.some((n) => /Ayala/.test(n)) && lv.notas.some((n) => /Troncalidad/.test(n)) ? 1 : 0, 1);
  const lvs = LG("ALA", [H("v", "conyuge", 70), H("p", "padre", 90, { pct: 100 })], { p: [{ tipo: "pleno", fraccion: 1 }] });
  eq("R4 · legítima vasca sin hijos: ascendientes no legitimarios; viudo, usufructo de 2/3 (arts. 47 y 52.2)", lvs.tercios.estricta === 0 && lvs.viudo.fraccion === 2 / 3 ? 1 : 0, 1);
  const la = LG("ARA", [H("v", "conyuge", 70), H("a", "hijo", 40, { pct: 50 }), H("x", "extrano", 40, { pct: 50 })], { a: [{ tipo: "pleno", fraccion: 0.5 }], x: [{ tipo: "pleno", fraccion: 0.5 }] });
  eq("R4 · legítima aragonesa: colectiva de 1/2 cubierta (art. 486 CDFA)", la.colectiva.importe === 150000 && la.colectiva.estado === "cubierta" ? 1 : 0, 1);
  const ln = LG("NAV", [H("v", "conyuge", 70), H("a", "hijo", 40, { pct: 100 })], { a: [{ tipo: "pleno", fraccion: 1 }] });
  eq("R4 · legítima navarra formal y usufructo de viudedad valorado (19 % de 300.000)", ln.tercios.libre === 300000 && ln.viudo.valor === 57000 && /viudedad/.test(ln.viudo.sobre) ? 1 : 0, 1);
  const lg = LG("GAL", [H("v", "conyuge", 70), H("a", "hijo", 40, { pct: 100 })], { a: [{ tipo: "pleno", fraccion: 1 }] });
  eq("R4 · legítima gallega: 1/4 a los hijos y usufructo de 1/4 al viudo (arts. 243 y 253)", lg.tercios.estricta === 75000 && lg.viudo.fraccion === 0.25 ? 1 : 0, 1);
  const lb = LG("BAL", [1, 2, 3, 4, 5].map((i) => H("h" + i, "hijo", 30, { pct: 20 })), Object.fromEntries([1, 2, 3, 4, 5].map((i) => ["h" + i, [{ tipo: "pleno", fraccion: 0.2 }]])), { isla: "mallorca" });
  eq("R4 · legítima balear: con más de cuatro hijos, la mitad (art. 42)", lb.tercios.estricta, 150000);
  const lc = LG("CAT", [H("a", "hijo", 40, { pct: 50 }), H("b", "hijo", 38, { pct: 50 })], { a: [{ tipo: "pleno", fraccion: 0.5 }], b: [{ tipo: "pleno", fraccion: 0.5 }] });
  eq("R4 · legítima catalana: 1/4 (art. 451-5 CCCat)", lc.tercios.estricta, 75000);
  eq("R4 · intestado foral: ya no dice que la sucesión no está modelada", calcularLegitimas({ ccaa: "ARA", reparto: "intestado", herederos: [H("a", "hijo", 40)], derechos: { a: [{ tipo: "pleno", fraccion: 1 }] }, masa: { neto: 100, netoReparto: 100 } }).notas.some((n) => /no modela/.test(n)) ? 0 : 1, 1);
}

// ── 25. Fiscal r4 (08-10-2026): cotejo de la plusvalía foral, vigencia 2026 del ISD, plazos y recargos forales, casillas del 650 autonómico ──
{
  const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
  // Plusvalía foral: cada tabla deja constancia de lo cotejado y sigue PENDIENTE mientras no haya texto oficial legible
  for (const F of Object.values(PLUSVALIA_FORAL)) {
    si(`24 · ${F.nombre}: registro de cotejo con fecha, fuente, URL y resultado`, Array.isArray(F.cotejo) && F.cotejo.length >= 2 && F.cotejo.every((c) => /^2026-10-0\d$/.test(c.fecha) && c.fuente && /^https:\/\//.test(c.url) && c.resultado));
    si(`24 · ${F.nombre}: tabla sin texto oficial legible → PENDIENTE y nota interna`, F.estadoCoef === "PENDIENTE" && typeof F.notaCotejo === "string" && F.notaCotejo.length > 20);
    si(`24 · ${F.nombre}: la norma que ve el abogado es breve (sin detalles de la consulta)`, F.normaCoef.length < 260 && !/iberley|bloquea|PDF/.test(F.normaCoef));
  }
  // Navarra: tabla recotejada en iberley el 08-10-2026 (de <1 año a 20 o más)
  si("24 · Navarra: tabla 2026 igual a la del consolidado (iberley)", JSON.stringify(COEF_PLUSVALIA_NAV_2026) === JSON.stringify([0.06, 0.16, 0.13, 0.26, 0.35, 0.37, 0.35, 0.41, 0.47, 0.52, 0.58, 0.53, 0.42, 0.37, 0.31, 0.26, 0.25, 0.15, 0.06, 0.06, 0.16]));
  si("24 · Bizkaia: la envolvente nunca baja de la tabla del DFN 2/2024 ni de la de 0,16 a 0,35", PLUSVALIA_FORAL.BIZ.coef.every((c, i) => c >= COEF_PLUSVALIA_BIZ_2024[i] && c >= COEF_PLUSVALIA_RDL16_2025[i]));

  // Baleares, grupo III (art. 36 bis D. Leg. 1/2014): 60 % / 35 % desde el 26-07-2025 (Ley 6/2025); 50 % / 25 % antes (Ley 11/2023)
  const bb = (rel, fecha, hayDescendientes = false) => REGLAS.BAL.bonif({ relacion: rel, edad: 50 }, "III", { fecha, hayDescendientes })[0].pct;
  eq("24 · BAL hermano sin descendientes, 2026: 60 %", bb("hermano", "2026-03-01"), 0.60, 0);
  eq("24 · BAL sobrino sin descendientes, 25-07-2025 (antes de la Ley 6/2025, prudente): 50 %", bb("sobrino", "2025-07-25"), 0.50, 0);
  eq("24 · BAL hermano que concurre con descendientes, 2026: 35 %", bb("hermano", "2026-03-01", true), 0.35, 0);
  eq("24 · BAL afín (sobrino político) sin descendientes, 2026: 35 % (antes el motor daba 50 %)", bb("sobrino_afin", "2026-03-01"), 0.35, 0);
  eq("24 · BAL afín en 2024: 25 %", bb("yerno", "2024-06-01"), 0.25, 0);
  si("24 · BAL: cita la Ley 6/2025 y queda VERIFICADO", (() => { const b = REGLAS.BAL.bonif({ relacion: "hermano" }, "III", { fecha: "2026-03-01" })[0]; return /Ley 6\/2025/.test(b.norma) && b.estado === "VERIFICADO"; })());
  // Caso completo: hermana en Baleares, 100.000 € en cuenta, 2026 → cuota con el 60 %
  const bal = (rel) => calcularISD({ fechaFallecimiento: "2026-03-01", ccaa: "BAL", ajuar: "cero", reparto: "intestado", bienes: [{ id: "b", tipo: "cuenta", valor: 100000 }], herederos: [{ id: "h", nombre: "H", relacion: rel, edad: 60 }] }).herederos[0];
  const hb = bal("hermano");
  eq("24 · BAL hermana, 100.000 €: a ingresar = 40 % de la cuota tributaria", hb.aIngresar, Math.round(hb.cuotaTributaria * 0.40 * 100) / 100, 0.011);

  // Galicia: grupo I con máximo de 1.500.000 € (art. 6.Dos D. Leg. 1/2011)
  eq("24 · GAL hijo de 10 años: reducción 1.500.000 € (no 2.100.000)", REGLAS.GAL.redParentesco({ relacion: "hijo", edad: 10 }, "I", { fecha: "2026-03-01" }).importe, 1500000, 0);
  eq("24 · GAL hijo de 18 años: 1.300.000 €", REGLAS.GAL.redParentesco({ relacion: "hijo", edad: 18 }, "I", { fecha: "2026-03-01" }).importe, 1300000, 0);
  const galA = (f) => calcularISD({ fechaFallecimiento: f, ccaa: "GAL", ajuar: "cero", reparto: "intestado", bienes: [{ id: "b", tipo: "cuenta", valor: 100000 }], herederos: [{ id: "h", nombre: "H", relacion: "hijo", edad: 40 }] }).alertas.some((a) => /únicas entre el mismo causante/.test(a));
  si("24 · GAL 2026: aviso de reducción única por causante y heredero (Ley 5/2025)", galA("2026-03-01"));
  si("24 · GAL 2025: sin ese aviso", !galA("2025-06-01"));
  // Comunitat Valenciana: 25 % desde el 01-06-2026 (segunda fuente: Ministerio de Hacienda) → VERIFICADO
  si("24 · VAL sobrino 2026-07: 25 % VERIFICADO", (() => { const b = REGLAS.VAL.bonif({ relacion: "sobrino" }, "III", { fecha: "2026-07-01" })[0]; return b.pct === 0.25 && b.estado === "VERIFICADO"; })());
  // Extremadura, Ley 2/2026: sobrino con posible especial vinculación desde el 05-08-2026 → aviso, sin aplicar
  si("24 · EXT sobrino 2026-09: aviso del art. 20 ter sin aplicar (0 %, PENDIENTE)", (() => { const b = REGLAS.EXT.bonif({ relacion: "sobrino" }, "III", { fecha: "2026-09-01" }); return b.length === 1 && b[0].pct === 0 && b[0].estado === "PENDIENTE" && /20 ter/.test(b[0].norma); })());
  si("24 · EXT sobrino 2026-07: sin aviso", REGLAS.EXT.bonif({ relacion: "sobrino" }, "III", { fecha: "2026-07-01" }).length === 0);

  // Plazos forales: mismo cómputo, marcado PENDIENTE y con nota
  for (const t of ["NAV", "ALA", "BIZ", "GIP"]) {
    const pz = plazoPresentacionISD("2026-03-10", { hoy: "2026-04-01", ccaa: t });
    si(`24 · ${t}: plazo foral marcado PENDIENTE con nota`, pz.foral && pz.estado === "PENDIENTE" && /Plazo foral sin cotejar/.test(pz.nota) && pz.limite === limiteISD("2026-03-10", false));
    const isd = calcularPlazos("2026-03-10", { ccaa: t }).find((x) => x.id === "isd");
    si(`24 · ${t}: el plazo del ISD en la agenda lleva la nota foral y Hacienda foral`, isd.estado === "PENDIENTE" && /Plazo foral/.test(isd.nota) && isd.organismo === "Hacienda foral");
  }
  si("24 · MAD: plazo de régimen común VERIFICADO, sin nota foral", (() => { const pz = plazoPresentacionISD("2026-03-10", { hoy: "2026-04-01", ccaa: "MAD" }); return pz.estado === "VERIFICADO" && !pz.foral; })());
  si("24 · trámites: el ISD de Bizkaia lleva la nota foral", (tramitesDe({ fecha: "2026-03-10", ccaa: "BIZ", testamento: "si", nHerederos: 1 }).find((x) => x.id === "isd") || {}).nota?.includes("Plazo foral"));

  // Recargo de Gipuzkoa (art. 27.2 NF 2/2005, NF 1/2024): 2 % / 5 % / 10 % + intereses desde el fin del plazo; sin reducción
  const g1 = recargoPresentacion("GIP", 10000, "2026-03-02", "2026-04-15");
  eq("24 · GIP 1 mes: 2 % (200) + 44 días de intereses (48,97) = 248,97", g1.importe, 248.97);
  eq("24 · GIP: sin reducción por pronto pago", g1.reducido, g1.importe, 0);
  eq("24 · GIP 3 meses completos: 5 % (500) + 105 días (116,87) = 616,87", recargoPresentacion("GIP", 10000, "2026-03-02", "2026-06-15").importe, 616.87);
  eq("24 · GIP 12 meses: 10 % (1.000) + 395 días (439,64) = 1.439,64", recargoPresentacion("GIP", 10000, "2026-03-02", "2027-04-01").importe, 1439.64);
  si("24 · GIP: etiqueta con intereses y norma foral PENDIENTE", /^2 % \+ intereses de demora de 44 días$/.test(g1.etiqueta) && g1.foral && g1.estado === "PENDIENTE" && /NF 2\/2005/.test(g1.norma));
  si("24 · GIP dentro de plazo: sin recargo", recargoPresentacion("GIP", 10000, "2026-03-02", "2026-03-02").importe === 0);
  // Navarra, Álava, Bizkaia: estimación con el art. 27 LGT, marcada como foral pendiente
  for (const t of ["NAV", "ALA", "BIZ"]) { const r = recargoPresentacion(t, 10000, "2026-03-02", "2026-06-15"); si(`24 · ${t}: estimación con la escala estatal (400 €), foral y PENDIENTE`, r.importe === 400 && r.foral && r.estado === "PENDIENTE" && /estimación con la escala estatal/.test(r.etiqueta)); }
  si("24 · MAD: el recargo sigue siendo el del art. 27 LGT", recargoPresentacion("MAD", 10000, "2026-03-02", "2026-06-15").importe === 400 && !recargoPresentacion("MAD", 10000, "2026-03-02", "2026-06-15").foral);
  // En el cálculo del ISD: Gipuzkoa fuera de plazo cita su norma y no el art. 27.5 LGT
  const gip = calcularISD({ fechaFallecimiento: "2025-01-10", ccaa: "GIP", ajuar: "cero", reparto: "intestado", enPlazo: false, fechaReferencia: "2026-10-07", bienes: [{ id: "b", tipo: "cuenta", valor: 900000 }], herederos: [{ id: "h", nombre: "H", relacion: "hijo", edad: 40 }] });
  si("24 · ISD Gipuzkoa fuera de plazo: aviso con la norma foral, sin art. 27.5 LGT", gip.alertas.some((a) => /Norma Foral General Tributaria de Gipuzkoa/.test(a)) && !gip.alertas.some((a) => /27\.5 LGT/.test(a)) && gip.recargo && gip.recargo.foral && gip.recargo.pct === 0.10);
  si("24 · ISD Madrid fuera de plazo: sigue citando el art. 27 LGT", calcularISD({ fechaFallecimiento: "2025-01-10", ccaa: "MAD", ajuar: "cero", reparto: "intestado", enPlazo: false, bienes: [{ id: "b", tipo: "cuenta", valor: 100000 }], herederos: [{ id: "h", nombre: "H", relacion: "sobrino", edad: 40 }] }).alertas.some((a) => /art\. 27 LGT/.test(a)));

  // Modelo 650 autonómico: sin casillas mientras no se lea el formulario
  for (const t of ["AND", "MAD", "VAL", "CAT", "GAL"]) si(`24 · 650 de ${t}: NO LOCALIZADO, con motivo y sin casillas inventadas`, MODELO650_AUT[t].estado === "NO LOCALIZADO" && MODELO650_AUT[t].motivo.length > 20 && !("casillas" in MODELO650_AUT[t]));
  si("24 · 650 de un territorio sin ficha: NO LOCALIZADO por defecto", modelo650Aut("MUR").estado === "NO LOCALIZADO");
}

// ── 25 · Auditoría independiente r5 (08-10-2026): casos calculados a mano con la norma, sin usar el motor ──
{
  const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
  const P = (o) => calcularISD({ reparto: "porcentajes", ...o });
  const uno = (ccaa, rel, edad, v, f = "2026-05-12", x = {}) => P({ fechaFallecimiento: f, ccaa, bienes: [{ id: "c", tipo: "cuenta", valor: v }], herederos: [{ id: "h", nombre: "H", relacion: rel, edad, pct: 100 }], ...x });
  // AND sobrino: BI 260.000 (valor de referencia), −10.000 (art. 28 Ley 5/2021), tarifa art. 37: 31.620 + 50.000 × 22 % = 42.620; × 1,5 (art. 38) = 63.930
  eq("25 · AND sobrino, piso 210.000 € de valor de referencia + 50.000 €", P({ fechaFallecimiento: "2026-05-12", ccaa: "AND", bienes: [{ id: "c", tipo: "cuenta", valor: 50000 }, { id: "p", tipo: "inmueble", valor: 200000, valorReferencia: 210000 }], herederos: [{ id: "s", nombre: "S", relacion: "sobrino", edad: 40, pct: 100 }] }).total, 63930);
  // MAD 2 hijos: BI 410.000 + ajuar 3 % de 520.000 / 2 = 417.800; −16.000; tarifa art. 23: 80.780,17 + 2.391,41 × 29,75 % = 81.491,61; bonificación 99 % → 814,92 cada uno
  eq("25 · MAD dos hijos, 820.000 € con ajuar residencial", P({ fechaFallecimiento: "2026-08-01", ccaa: "MAD", bienes: [{ id: "p", tipo: "inmueble", valor: 500000, valorReferencia: 520000, usoResidencial: true }, { id: "c", tipo: "cuenta", valor: 300000 }], herederos: [{ id: "a", nombre: "A", relacion: "hijo", edad: 30, pct: 50 }, { id: "b", nombre: "B", relacion: "hijo", edad: 25, pct: 50 }] }).total, 1629.84);
  // CAT hija 35: BL 500.000 → 57.000 + 100.000 × 24 % = 81.000; bonificación media ponderada sobre la base imponible de 600.000: 49,17 % → 41.172,30
  eq("25 · CAT hija 35 años, 600.000 €", uno("CAT", "hijo", 35, 600000, "2026-04-20").total, 41172.30);
  // VAL hermano: BL 192.006,54 → 22.609,81 + 35.502,99 × 21,25 % = 30.154,20; × 1,5882 = 47.890,90; bonificación 25 % (Ley 5/2025) → 35.918,17
  eq("25 · VAL hermano 200.000 € (julio de 2026)", uno("VAL", "hermano", 50, 200000, "2026-07-10").total, 35918.17);
  eq("25 · GAL hijo 30 años, 1.300.000 € (BL 300.000 → 23.500)", uno("GAL", "hijo", 30, 1300000, "2026-02-01").total, 23500);
  eq("25 · ARA hijo 40 años, 700.000 € (tope de 500.000 de reducciones; tarifa estatal sobre 200.000)", uno("ARA", "hijo", 40, 700000, "2026-03-01").total, 31640.85);
  eq("25 · BIZ hija, 600.000 € (−400.000; 1,5 %)", uno("BIZ", "hijo", 45, 600000).total, 3000);
  eq("25 · NAV hijo, 600.000 € (0 % hasta 250.000, 2 % hasta 500.000, 4 % el resto)", uno("NAV", "hijo", 50, 600000).total, 9000);
  // Recargo: hermano en Andalucía, plazo vencido el 15-07-2025, presenta el 08-10-2026: 15 % + intereses de 85 días al 4,0625 %
  const rc = uno("AND", "hermano", 45, 100000, "2025-01-15", { enPlazo: false, fechaReferencia: "2026-10-08" });
  eq("25 · recargo pasados 12 meses: 15 % + intereses de 85 días", rc.recargo.importe, 2635.88);
  eq("25 · recargo reducido (25 % menos del recargo, no de los intereses)", rc.recargo.reducido, 2016.01);
  // Plusvalía Madrid: 18 años → coeficiente 0,17; 70.000 × 0,17 × 29 % = 3.451; bonificación 85 % (suelo entre 60.000 y 100.000) → 517,65
  eq("25 · plusvalía Madrid, cónyuge, vivienda habitual, 18 años, suelo 70.000", calcularPlusvalia({ inmueble: { municipio: "MADRID", ine: "28079", valorCatastralTotal: 180000, valorCatastralSuelo: 70000, adquisicion: { fecha: "2008-02-15", valor: 150000 }, valorTransmision: 400000, esViviendaHabitual: true }, titulares: [{ heredero: { nombre: "C", relacion: "conyuge" }, fraccion: 1 }], fecha: "2026-05-10" }).total, 517.65);
  // Plusvalía Marbella: método real (10.000 € × 40 % de suelo × 29 % = 1.160) con bonificación del 50 % → 580
  eq("25 · plusvalía Marbella por el método real", calcularPlusvalia({ inmueble: { municipio: "MARBELLA", ine: "29069", valorCatastralTotal: 150000, valorCatastralSuelo: 60000, adquisicion: { fecha: "2016-03-01", valor: 250000 }, valorTransmision: 260000, esViviendaHabitual: true }, titulares: [{ heredero: { nombre: "H", relacion: "hijo" }, fraccion: 1 }], fecha: "2026-05-10" }).total, 580);
  // H7: nieto sin «desciende de» con los dos hijos vivos: se le trata como estirpe de un premuerto, pero se avisa
  const nt = calcularISD({ fechaFallecimiento: "2026-08-14", ccaa: "MAD", reparto: "intestado", ajuar: "cero", bienes: [{ id: "c", tipo: "cuenta", valor: 300000 }], herederos: [{ id: "a", nombre: "Iñaki", relacion: "hijo", edad: 50 }, { id: "b", nombre: "Marta", relacion: "hijo", edad: 48 }, { id: "n", nombre: "Lucía", relacion: "nieto", edad: 20 }] });
  si("25 · H7 · nieto sin «desciende de» que concurre con hijos vivos: aviso de que se le supone representante de un premuerto", nt.alertas.some((a) => /Lucía/.test(a) && /Desciende de/.test(a)));
  const nt2 = calcularISD({ fechaFallecimiento: "2026-08-14", ccaa: "MAD", reparto: "intestado", ajuar: "cero", bienes: [{ id: "c", tipo: "cuenta", valor: 300000 }], herederos: [{ id: "a", nombre: "Iñaki", relacion: "hijo", edad: 50 }, { id: "n", nombre: "Lucía", relacion: "nieto", edad: 20, estirpe: "Pedro" }] });
  const sb = calcularISD({ fechaFallecimiento: "2026-08-14", ccaa: "AND", reparto: "intestado", ajuar: "cero", bienes: [{ id: "c", tipo: "cuenta", valor: 100000 }], herederos: [{ id: "a", nombre: "Pilar", relacion: "hermano", edad: 70 }, { id: "s", nombre: "Miguel", relacion: "sobrino", edad: 40 }] });
  si("25 · H7 · sobrino sin «desciende de» que concurre con un hermano vivo: aviso", sb.alertas.some((a) => /Miguel/.test(a) && /Desciende de/.test(a)));
  si("25 · H7 · con «desciende de» indicado no hay aviso", !nt2.alertas.some((a) => /Desciende de/.test(a)));
}

// ── 26. Auditoría 1.6 · I9: el trámite de Tráfico «si alguien usa el coche» es condicional (no cuenta como crítico en Mi día)
{
  const dgt = tramitesDe({ fecha: "2026-05-04", nHerederos: 2, inmuebles: 1, situ: {}, hayVehiculos: true }).find((t) => t.id === "dgt_custodia");
  eq("26 · DGT custodia: marcado como condicional", dgt && /Solo si alguien usa el vehículo/.test(dgt.condicional) ? 1 : 0, 1);
  eq("26 · otros trámites no son condicionales", tramitesDe({ fecha: "2026-05-04", nHerederos: 2, inmuebles: 1, situ: {} }).filter((t) => t.condicional).length, 0);
}

// ── 27. G09 · Inhábiles autonómicos y locales (art. 30 Ley 39/2015; festivos.mjs) ─────────
{
  const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
  const AND = { ccaa: "AND" }, MAD = { ccaa: "MAD" };
  // Integridad de los datos
  const MU = JSON.parse(readFileSync(new URL("./municipios.json", import.meta.url), "utf8")), INES = new Map(MU.m);
  const fechaOk = (d, a) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d.startsWith(String(a)) && new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
  const malos = [];
  for (const a of [2025, 2026, 2027]) {
    for (const k of ["AND", "ARA", "AST", "BAL", "CAN", "CANT", "CYL", "CLM", "CAT", "VAL", "EXT", "GAL", "MAD", "MUR", "NAV", "PV", "RIO", "CEU", "MEL"]) {
      const R = FESTIVOS_CCAA[a][k]; if (!R) { malos.push(`${a} ${k} sin datos`); continue; }
      if (!["VERIFICADO", "PENDIENTE"].includes(R.e) || !R.f) malos.push(`${a} ${k} sin estado o fuente`);
      for (const d of R.d) { if (!fechaOk(d, a)) malos.push(`${a} ${k} ${d} fecha mala`); if (FESTIVOS_NACIONALES[a].includes(d)) malos.push(`${a} ${k} ${d} repite un nacional`); }
      if (new Set(R.d).size !== R.d.length || [...R.d].sort().join() !== R.d.join()) malos.push(`${a} ${k} desordenado o repetido`);
    }
    for (const d of FESTIVOS_NACIONALES[a]) if (!fechaOk(d, a)) malos.push(`${a} nacional ${d}`);
    for (const [ine, L] of Object.entries(FESTIVOS_LOCALES[a] || {})) { if (!INES.has(ine)) malos.push(`${a} ${ine} no existe`); if (!L.f || !L.n) malos.push(`${a} ${ine} sin fuente`); for (const d of L.d) if (!fechaOk(d, a)) malos.push(`${a} ${ine} ${d}`); }
  }
  if (malos.length) console.log(malos.join("\n"));
  eq("27 · datos de festivos 2025-2027 completos, con fuente, estado y fechas válidas", malos.length, 0, 0);
  si("27 · 52 capitales de provincia con su código INE", CAPITALES_INE.length === 52 && CAPITALES_INE.every((i) => INES.has(i)));
  si("27 · cada provincia lleva a un territorio del motor", Object.values(PROV_CCAA).every((t) => TERRITORIOS.some(([k]) => k === t)) && Object.keys(PROV_CCAA).length === 52);
  // Festivo autonómico: 06-06-2026 + 6 meses = lunes 07-12-2026 (traslado autonómico de la Constitución en Andalucía; 08-12 nacional) → 09-12-2026
  eq("27 · sin comunidad: 07-12-2026 es hábil (comportamiento anterior)", limiteISD("2026-06-06", false) === "2026-12-07" ? 1 : 0, 1);
  eq("27 · Andalucía: 07-12 y 08-12 inhábiles → 09-12-2026", limiteISD("2026-06-06", false, AND) === "2026-12-09" ? 1 : 0, 1);
  eq("27 · Cataluña: 07-12-2026 es hábil", limiteISD("2026-06-06", false, { ccaa: "CAT" }) === "2026-12-07" ? 1 : 0, 1);
  si("27 · festivoEn: 07-12-2026 autonómico VERIFICADO en Andalucía", (() => { const x = festivoEn("2026-12-07", AND); return x && x.tipo === "autonomico" && x.estado === "VERIFICADO" && /Andalucía/.test(x.ambito); })());
  si("27 · Euskadi para Bizkaia, Álava y Gipuzkoa: 06-04-2026 lunes de Pascua", ["BIZ", "ALA", "GIP"].every((t) => esInhabil("2026-04-06", { ccaa: t })) && !esInhabil("2026-04-06", MAD));
  // Cadena de inhábiles: Viernes Santo + fin de semana + lunes de Pascua (Comunitat Valenciana)
  eq("27 · VAL: 03-04-2026 → 07-04-2026 (Viernes Santo, sábado, domingo, lunes de Pascua)", aHabil("2026-04-03", { ccaa: "VAL" }) === "2026-04-07" ? 1 : 0, 1);
  eq("27 · MAD: 02-04-2026 (Jueves Santo) → 06-04-2026", aHabil("2026-04-02", MAD) === "2026-04-06" ? 1 : 0, 1);
  eq("27 · sin comunidad: 03-04-2026 → 06-04-2026", aHabil("2026-04-03") === "2026-04-06" ? 1 : 0, 1);
  // Sábado: inhábil en todo caso (art. 30.2)
  eq("27 · sábado 14-03-2026 → lunes 16-03-2026", aHabil("2026-03-14", { ccaa: "VAL" }) === "2026-03-16" ? 1 : 0, 1);
  // Fin de mes y festivo autonómico: 31-08-2026 + 6 meses = 28-02-2027 (domingo) → 01-03-2027, que en Andalucía es el Día de Andalucía trasladado → 02-03-2027
  eq("27 · fin de mes: 31-08-2026 → 28-02-2027 natural", venceHabil(sumarMeses("2026-08-31", 6), AND).limiteNatural === "2027-02-28" ? 1 : 0, 1);
  eq("27 · fin de mes + festivo autonómico: Andalucía 02-03-2027", limiteISD("2026-08-31", false, AND) === "2027-03-02" ? 1 : 0, 1);
  eq("27 · fin de mes sin comunidad: 01-03-2027", limiteISD("2026-08-31", false) === "2027-03-01" ? 1 : 0, 1);
  // 29 de febrero (año bisiesto 2028): de fecha a fecha
  eq("27 · 31-08-2027 + 6 meses = 29-02-2028", sumarMeses("2027-08-31", 6) === "2028-02-29" ? 1 : 0, 1);
  eq("27 · 29-02-2028 + 12 meses = 28-02-2029 (último día del mes)", sumarMeses("2028-02-29", 12) === "2029-02-28" ? 1 : 0, 1);
  eq("27 · 29-02-2028 + 1 mes = 29-03-2028", sumarMeses("2028-02-29", 1) === "2028-03-29" ? 1 : 0, 1);
  si("27 · año sin calendario (2028): solo fines de semana y aviso de que falta", aHabil("2028-02-29", AND) === "2028-02-29" && infoCalendario(AND, 2028).faltan.length > 0 && /Faltan/.test(infoCalendario(AND, 2028).texto));
  // Festivo local VERIFICADO: Madrid 09-11-2026 (Almudena). 09-05-2026 + 6 meses = 09-11-2026
  eq("27 · Madrid sin municipio: 09-11-2026", limiteISD("2026-05-09", false, MAD) === "2026-11-09" ? 1 : 0, 1);
  eq("27 · Madrid capital (festivo local): 10-11-2026", limiteISD("2026-05-09", false, calendarioDe("MAD", "28079")) === "2026-11-10" ? 1 : 0, 1);
  si("27 · nota: «Contados los festivos nacionales, de Comunidad de Madrid y de Madrid»", /Contados los festivos nacionales, de Comunidad de Madrid y de Madrid/.test(venceHabil("2026-11-09", calendarioDe("MAD", "28079")).nota));
  si("27 · nota del traslado por festivo local", /festivo local de Madrid/.test(venceHabil("2026-11-09", calendarioDe("MAD", "28079")).nota));
  // Festivo local PENDIENTE (Marbella, 19-10-2026): no traslada, pero avisa
  const mb = venceHabil("2026-10-19", calendarioDe(null, "29069"));
  si("27 · local sin cotejar: el plazo no se traslada (regla prudente)", mb.limite === "2026-10-19" && !mb.trasladado);
  si("27 · local sin cotejar: aviso con la fecha si se confirma", mb.posible && mb.posible.siSeConfirma === "2026-10-20" && /sin cotejar/.test(mb.nota));
  si("27 · la comunidad sale del código INE (29 → Andalucía)", calendarioDe(null, "29069").ccaa === "AND" && esInhabil("2026-12-07", calendarioDe(null, "29069")));
  si("27 · municipio sin datos en 2027: «Faltan los festivos locales de Marbella»", /Faltan los festivos locales de Marbella de 2027/.test(infoCalendario(calendarioDe(null, "29069"), 2027).texto));
  si("27 · art. 30.6: festivo en la sede o en la residencia (lista de calendarios)", esInhabil("2026-04-06", [MAD, { ccaa: "CAT" }]) && !esInhabil("2026-04-06", [MAD, AND]));
  // Días hábiles: requerimiento de 10 días notificado el viernes 27-11-2026
  eq("27 · 10 hábiles desde 27-11-2026 sin comunidad: 14-12-2026", sumarHabiles("2026-11-27", 10) === "2026-12-14" ? 1 : 0, 1);
  eq("27 · 10 hábiles desde 27-11-2026 en Andalucía: 15-12-2026", sumarHabiles("2026-11-27", 10, AND) === "2026-12-15" ? 1 : 0, 1);
  // Plusvalía por municipio: el calendario del ayuntamiento de cada inmueble; con varios, el más temprano
  const pmad = plazoPlusvalia("2026-05-09", [{ ine: "28079" }]), pmal = plazoPlusvalia("2026-05-09", [{ ine: "29067" }]), pdos = plazoPlusvalia("2026-05-09", [{ ine: "28079" }, { ine: "29067" }]);
  si("27 · plusvalía en Madrid: 10-11-2026; en Málaga: 09-11-2026", pmad.limite === "2026-11-10" && pmal.limite === "2026-11-09");
  si("27 · plusvalía con inmuebles en dos municipios: el más temprano y el detalle", pdos.limite === "2026-11-09" && pdos.porMunicipio.length === 2 && /Madrid 2026-11-10/.test(pdos.nota));
  si("27 · plusvalía: la comunidad del inmueble, no la del expediente", plazoPlusvalia("2026-06-07", [{ ine: "29067" }]).limite === "2026-12-09" && plazoPlusvalia("2026-06-07", [{ ine: "08019" }]).limite === "2026-12-07");
  // calcularPlazos y Trámites con comunidad y municipios: misma fecha (barrido)
  const o = { ccaa: "AND", ine: "29067", inmuebles: [{ ine: "29069" }, { ine: "28079" }] };
  const PZ = (f, pr) => Object.fromEntries(calcularPlazos(f, { hayInmuebles: true, prorrogaISD: pr, ...o }).map((x) => [x.id, x]));
  const TRM = (f, pr) => Object.fromEntries(tramitesDe({ fecha: f, inmuebles: 2, nHerederos: 2, situ: {}, ccaa: "AND", ine: "29067", inmueblesMuni: o.inmuebles, prorrogaISD: pr }).map((x) => [x.id, x]));
  const difs = [];
  for (let f = "2025-01-01"; f <= "2027-06-30"; f = sumarDias(f, 1)) for (const pr of [false, true]) {
    const a = PZ(f, pr), b = TRM(f, pr);
    for (const [x, y] of [["isd", "isd"], ["prorroga_isd", "prorroga"], ["plusvalia", "plusvalia"], ["prescripcion", "prescripcion"]]) if (a[x].limite !== b[y].limite) difs.push(`${f} ${x} ${a[x].limite} ≠ ${b[y].limite}`);
    if (a.isd.limite !== limiteISD(f, pr, calendarioDe("AND", "29067"))) difs.push(`${f} limiteISD`);
    if (esInhabil(a.isd.limite, calendarioDe("AND", "29067"))) difs.push(`${f} vence en inhábil`);
  }
  if (difs.length) console.log(difs.slice(0, 10).join("\n"));
  eq("27 · barrido 2025-2027 con Andalucía, Málaga y dos municipios de inmuebles: Diagnóstico y Trámites coinciden", difs.length, 0, 0);
  si("27 · Trámites: el aviso dice qué calendarios se han contado", /Contados los festivos nacionales, de Andalucía y de Málaga/.test(TRM("2026-06-06").isd.aviso));
  si("27 · plazoPresentacionISD con comunidad: Andalucía 09-12-2026", plazoPresentacionISD("2026-06-06", { hoy: "2026-07-01", ccaa: "AND" }).limite === "2026-12-09");
}

// ── 28. G06 · Después de presentar: plazos de las notificaciones y prescripción (arts. 62, 66-68, 135, 223 y 235 LGT) ─────────
{
  const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
  const AND = { ccaa: "AND" };
  const P = (tipo, f, o) => Object.fromEntries(plazosProcedimiento(tipo, f, o).plazos.map((q) => [q.id, q]));
  // Requerimiento: diez días hábiles por defecto, con festivos de la comunidad
  eq("28 · requerimiento notificado el 27-11-2026 en Andalucía: 15-12-2026 (07-12 y 08-12 inhábiles)", P("requerimiento", "2026-11-27", { cal: AND }).atender.limite === "2026-12-15" ? 1 : 0, 1);
  eq("28 · requerimiento con 15 días hábiles: 21-12-2026 sin comunidad", P("requerimiento", "2026-11-27", { dias: 15 }).atender.limite === "2026-12-21" ? 1 : 0, 1);
  eq("28 · alegaciones a la propuesta: 10 días hábiles", P("propuestaLiquidacion", "2026-03-02", {}).alegaciones.limite === "2026-03-16" ? 1 : 0, 1);
  // Pago en voluntaria de una liquidación (art. 62.2 LGT)
  eq("28 · liquidación notificada el 15-01-2026: pagar hasta el 20-02-2026", P("liquidacion", "2026-01-15", {}).pago.limite === "2026-02-20" ? 1 : 0, 1);
  eq("28 · liquidación notificada el 16-01-2026: pagar hasta el 05-03-2026", P("liquidacion", "2026-01-16", {}).pago.limite === "2026-03-05" ? 1 : 0, 1);
  eq("28 · el 20-06-2026 es sábado: pasa al 22-06-2026", P("liquidacion", "2026-05-10", {}).pago.limite === "2026-06-22" ? 1 : 0, 1);
  // Recurso: un mes de fecha a fecha, último día del mes si no hay equivalente, y traslado al hábil
  eq("28 · recurso: notificada el 31-01-2026 → 28-02-2026 (sábado) → 02-03-2026", P("liquidacion", "2026-01-31", {}).recurso.limite === "2026-03-02" ? 1 : 0, 1);
  eq("28 · recurso: notificada el 07-11-2026 en Andalucía → 07-12 y 08-12 inhábiles → 09-12-2026", P("liquidacion", "2026-11-07", { cal: AND }).recurso.limite === "2026-12-09" ? 1 : 0, 1);
  si("28 · reposición o reclamación (arts. 223 y 235 LGT)", /223\.1 y 235\.1 LGT/.test(P("liquidacion", "2026-01-15", {}).recurso.norma));
  // Comprobación de valores: tasación pericial contradictoria en el plazo del primer recurso
  const cv = P("comprobacionValores", "2026-11-30", { cal: AND });
  si("28 · comprobación de valores: TPC en el mismo plazo que el recurso (art. 135.1 LGT)", cv.tpc && cv.tpc.limite === cv.recurso.limite && /135\.1/.test(cv.tpc.norma) && cv.recurso.limite === "2026-12-30");
  si("28 · comprobación de valores: pago hasta el 05-01-2027", cv.pago.limite === "2027-01-05");
  // Plusvalía: reposición obligatoria (art. 14.2 TRLRHL), sin tasación pericial
  const pl = P("liquidacion", "2026-04-15", { tributo: "IIVTNU" });
  si("28 · plusvalía: reposición previa obligatoria ante el ayuntamiento", /14\.2 TRLRHL/.test(pl.recurso.norma) && !pl.tpc);
  // Sanción: reducción del 25 % por pronto pago; suspensión automática si se recurre
  const sa = plazosProcedimiento("sancion", "2026-02-03", {});
  si("28 · sanción: pago con reducción del 25 % (art. 188.3 LGT) y aviso del art. 212.3", sa.plazos.some((q) => q.id === "pago" && /188\.3/.test(q.norma)) && sa.avisos.some((a) => /212\.3/.test(a)));
  // Providencia de apremio (art. 62.5 LGT)
  eq("28 · apremio notificado el 10-03-2026: pagar hasta el 20-03-2026", P("providenciaApremio", "2026-03-10", {}).pago.limite === "2026-03-20" ? 1 : 0, 1);
  eq("28 · apremio notificado el 16-03-2026: 05-04 domingo → 06-04-2026", P("providenciaApremio", "2026-03-16", {}).pago.limite === "2026-04-06" ? 1 : 0, 1);
  eq("28 · apremio notificado el 16-03-2026 en Cataluña: 06-04 lunes de Pascua → 07-04-2026", P("providenciaApremio", "2026-03-16", { cal: { ccaa: "CAT" } }).pago.limite === "2026-04-07" ? 1 : 0, 1);
  si("28 · tipo desconocido o fecha mala: null", plazosProcedimiento("otro", "2026-01-01") === null && plazosProcedimiento("liquidacion", "2026-13") === null);
  si("28 · seis tipos de notificación", PROC_TIPOS.length === 6 && PROC_TIPOS.every(([k]) => plazosProcedimiento(k, "2026-05-04", {})));
  // Prescripción (arts. 66-68 LGT)
  const p1 = prescripcionTributo({ finPlazo: "2026-12-09", presentacion: "2026-11-20", pago: "2026-11-20" });
  si("28 · prescripción: presentada en plazo, cuatro años desde el fin del plazo", p1.liquidar.hasta === "2030-12-09" && p1.devolucion.hasta === "2030-12-09");
  const p2 = prescripcionTributo({ finPlazo: "2026-12-09", presentacion: "2027-02-15", pago: "2027-02-15" });
  si("28 · prescripción: presentada fuera de plazo, desde la presentación (art. 68.1.c LGT)", p2.liquidar.hasta === "2031-02-15" && p2.devolucion.hasta === "2031-02-15");
  const p3 = prescripcionTributo({ finPlazo: "2026-12-09", presentacion: "2026-11-20", interrupciones: ["2028-03-01", "2027-05-10"] });
  si("28 · prescripción: la última actuación notificada reinicia el cómputo (art. 68.6 LGT)", p3.liquidar.hasta === "2032-03-01" && p3.liquidar.motivo === "última actuación notificada");
  si("28 · prescripción sin fin de plazo: null", prescripcionTributo({}) === null);
}

// ── 29. G08 · Aplazamiento y fraccionamiento del ISD (art. 65 LGT; arts. 44-54 RGR; art. 38 LISD) ─────────
{
  const si = (n, c) => eq(n, c ? 1 : 0, 1, 0);
  const a1 = simularAplazamiento({ importe: 20000, finVoluntario: "2026-12-09", regimen: "isd38", modo: "aplazamiento", primerVencimiento: "2027-12-09" });
  // 20.000 × 4,0625 % × 365 / 365 = 812,50
  eq("29 · aplazamiento de un año: intereses de demora 812,50 €", a1.intereses, 812.5);
  si("29 · aplazamiento: un solo vencimiento, sin garantía (≤ 50.000 €)", a1.filas.length === 1 && a1.dispensa && a1.importeGarantia === 0 && a1.avisos.length === 0);
  const f1 = simularAplazamiento({ importe: 24000.05, finVoluntario: "2026-12-09", modo: "fraccionamiento", plazos: 12, periodicidad: 1 });
  si("29 · fraccionamiento: los plazos suman el importe exacto", Math.abs(f1.filas.reduce((s, f) => s + f.principal, 0) - 24000.05) < 0.001 && f1.filas.length === 12);
  si("29 · fraccionamiento: cada fracción con sus días desde el fin del periodo voluntario (art. 53 RGR)", f1.filas[0].vencimiento === "2027-01-20" && f1.filas[0].dias === 42 && f1.filas[11].vencimiento === "2027-12-20");
  eq("29 · fraccionamiento: interés de la primera fracción (2.000 × 4,0625 % × 42 / 365)", f1.filas[0].interes, 9.35);
  const g1 = simularAplazamiento({ importe: 50000, finVoluntario: "2026-12-09", modo: "aplazamiento" }), g2 = simularAplazamiento({ importe: 50000.01, finVoluntario: "2026-12-09", modo: "aplazamiento" });
  si("29 · 50.000 € exactos: sin garantía; 50.000,01 €: con garantía (Orden HFP/583/2023)", g1.dispensa && !g2.dispensa && g2.avisos.some((a) => /garantía/.test(a)));
  eq("29 · garantía: deuda + intereses + 25 % (art. 48.3 RGR)", g2.importeGarantia, Math.round((g2.importe + g2.intereses) * 1.25 * 100) / 100);
  si("29 · las demás deudas pendientes cuentan para el límite", !simularAplazamiento({ importe: 30000, otrasDeudas: 25000, finVoluntario: "2026-12-09" }).dispensa);
  const av = simularAplazamiento({ importe: 80000, finVoluntario: "2026-12-09", modo: "aplazamiento", garantia: "aval", primerVencimiento: "2027-12-09" });
  eq("29 · con aval bancario: interés legal del dinero (3,25 %, art. 26.6 LGT)", av.intereses, 2600);
  si("29 · régimen de un año: aviso si el último plazo lo supera", simularAplazamiento({ importe: 10000, finVoluntario: "2026-12-09", regimen: "isd38", modo: "fraccionamiento", plazos: 18, periodicidad: 1 }).avisos.some((a) => /supera el máximo/.test(a)));
  si("29 · regímenes especiales sin cotejar marcados PENDIENTE", APLAZ_REGIMENES.filter((r) => r.estado === "PENDIENTE").length === 2 && simularAplazamiento({ importe: 10000, finVoluntario: "2026-12-09", regimen: "isdVivienda" }).estado === "PENDIENTE");
  si("29 · interés legal 2026 3,25 % e interés de demora 4,0625 %", INTERES_LEGAL === 0.0325 && INTERES_DEMORA === 0.040625);
  si("29 · sin importe o sin fecha: null", simularAplazamiento({ importe: 0, finVoluntario: "2026-12-09" }) === null && simularAplazamiento({ importe: 100 }) === null);
}

console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
