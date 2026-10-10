// Prueba de navegador de G03 (inventario y avalúo completos) y G04 (liquidación del régimen económico matrimonial), 10-10-2026.
//  1. Migración: con --ref <url de la versión anterior>, los expedientes de demostración dan las mismas cifras en las dos versiones
//     (impuesto por heredero, masa, plusvalía, avisos y cuadro de partición).
//  2. Interfaz: clases de bien nuevas con «Cómo se valora» y «Usar este valor», bien en el extranjero con la deducción del art. 23,
//     deudas y gastos con su tipo, ficha «Régimen económico» con reintegros, tabla de liquidación en Herederos y en Partición, y
//     partición conjunta (vivienda común entera al viudo). Sin errores de consola, a 1440 y a 390 px.
// Uso: servir dist/publicar (node tools/qa/servidor.mjs 8902 dist/publicar) y  node tools/qa/inventario-regimen.mjs [url] [--ref url] [--capturas carpeta]
// Playwright: PLAYWRIGHT=<ruta a playwright/index.mjs>; Chromium: PW_EXE=<ruta al ejecutable> (si no es el de Playwright).
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const args = process.argv.slice(2);
const URL_APP = args.find((a, i) => /^https?:/.test(a) && args[i - 1] !== "--ref") || "http://127.0.0.1:8902/app/";
const REF = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : null;
const CAP = args.includes("--capturas") ? args[args.indexOf("--capturas") + 1] : null;
let ok = 0, ko = 0;
const check = (n, c, extra = "") => { c ? ok++ : ko++; console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + String(extra).slice(0, 400) : ""}`); };
const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});

// Huella de los cálculos de todos los expedientes de demostración
async function huella(url) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(1200);
  const H = await p.evaluate(() => {
    if (document.querySelector(".bv-over")) bvSaltar(); demoCargar();
    const r2 = (v) => Math.round(v * 100) / 100;
    return DB.expedientes.map((x) => {
      const R = calcular(x); if (!R) return { ref: x.nombre, R: null };
      const m = R.isd.masa, C = typeof cuadroParticion === "function" ? cuadroParticion(x, R) : null;
      return { ref: x.nombre, total: r2(R.isd.total), plus: r2(R.totalPlus), masa: [m.brutoTotal, m.gananciales, m.mitadViudo, m.bruto, m.deudas, m.gastos, m.neto, m.netoReparto, m.ajuar].map(r2),
        her: R.isd.herederos.map((h) => [h.nombre, r2(h.baseImponible), r2(h.baseLiquidable), r2(h.aIngresar)]), alertas: R.isd.alertas.length + "|" + R.isd.alertas.join("§").length,
        cuadro: C ? C.H.map((h) => [h.nombre, r2(h.haber), r2(h.adjudicado), r2(h.exceso), r2(h.inevitable)]) : null, coste: C ? r2(C.coste) : null };
    });
  });
  await ctx.close();
  return { H, errs };
}
if (REF) {
  const [A, B] = [await huella(REF), await huella(URL_APP)];
  check(`migración: mismo número de expedientes de demostración (${B.H.length})`, A.H.length === B.H.length && B.H.length > 5);
  let iguales = 0;
  for (let i = 0; i < A.H.length; i++) { const a = JSON.stringify(A.H[i]), bb = JSON.stringify(B.H[i]); if (a === bb) iguales++; else check(`migración: ${A.H[i].ref} igual en las dos versiones`, false, `antes ${a}\nahora ${bb}`); }
  check(`migración: ${iguales} de ${A.H.length} expedientes con cifras idénticas (impuesto, masa, plusvalía, avisos y partición)`, iguales === A.H.length);
  check("migración: sin errores de consola en ninguna de las dos versiones", !A.errs.length && !B.errs.length, [...A.errs, ...B.errs].join(" | "));
}

for (const W of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(URL_APP); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a), w = (ms = 350) => p.waitForTimeout(ms);
  const txt = () => ev(() => document.body.innerText);
  const foto = async (n) => { if (CAP) await p.screenshot({ path: `${CAP}/${W}-${n}.png`, fullPage: false }); };
  // Expediente madrileño en gananciales: vivienda y cuenta comunes, viuda y dos hijos, sin testamento
  await ev(() => {
    if (document.querySelector(".bv-over")) bvSaltar(); demoCargar();
    const x = DB.expedientes[0];
    Object.assign(x, { ccaa: "MAD", testamento: "no", civil: "gananciales", vecindadCivil: "comun", regimen: undefined });
    x.personas = [{ id: "pv", nombre: "Carmen Ruiz", relacion: "conyuge", edad: 70 }, { id: "pa", nombre: "Ana Gil", relacion: "hijo", edad: 45 }, { id: "pb", nombre: "Blas Gil", relacion: "hijo", edad: 41 }];
    x.bienes = [{ id: "bv", tipo: "vivienda", descripcion: "Piso en Arganzuela", valor: 300000, titularidad: "ganancial", municipio: "OTRO" }, { id: "bc", tipo: "cuenta", descripcion: "Cuenta en BBVA", valor: 100000, titularidad: "ganancial" }];
    x.deudas = []; x.gastos = [];
    window.__ID = x.id; go({ vista: "exp", id: x.id, sec: "herencia", sheet: null });
  }); await w(700);
  let t = await txt();
  check(`${W} · Herederos y bienes: tarjeta del régimen económico (gananciales)`, /Régimen económico matrimonial/.test(t) && /Sociedad de gananciales/.test(t));
  // Ficha del régimen: reintegro de 50.000 € de dinero privativo del causante
  await ev(() => { ui.sheet = { tipo: "regimen" }; render(); }); await w();
  t = await txt();
  check(`${W} · ficha del régimen: ley aplicable y tabla de liquidación`, /Ley aplicable/.test(t) && /Remanente/.test(t) && /Activo/.test(t));
  await p.click('[data-lpadd="regimen.reintegros"]'); await w();
  await p.fill('[data-lp="regimen.reintegros.0.importe"]', "50000"); await p.locator('[data-lp="regimen.reintegros.0.importe"]').blur(); await w(500);
  t = await txt();
  check(`${W} · reintegro: haber de la herencia 225.000 € en la tabla`, /225\.000,00/.test(t), t.slice(t.indexOf("Remanente"), t.indexOf("Remanente") + 400));
  check(`${W} · reintegro sin justificar: aviso del art. 1361 CC`, /1361/.test(t));
  await foto("regimen");
  const m1 = await ev(() => calcular(DB.expedientes.find((q) => q.id === window.__ID)).isd.masa);
  check(`${W} · motor: caudal del causante 225.000 con el reintegro`, Math.abs(m1.bruto - 225000) < 0.01, m1.bruto);
  await ev(() => { ui.sheet = null; render(); }); await w();
  // Partición: liquidación antes del inventario y vivienda común entera a la viuda
  await ev(() => { const x = DB.expedientes.find((q) => q.id === window.__ID); x.regimen = undefined; x.bienes[0].adjudicadoA = "pv"; go({ vista: "exp", id: x.id, sec: "particion", sheet: null }); ui.pstep = 0; render(); }); await w(600);
  t = await txt();
  check(`${W} · Partición, paso 1: «Antes de repartir» con la liquidación conjunta`, /Antes de repartir/.test(t) && /se hacen juntas/.test(t));
  await foto("particion-liquidacion");
  const C = await ev(() => { const x = DB.expedientes.find((q) => q.id === window.__ID); const c = cuadroParticion(x); const v = c.H.find((h) => h.id === "pv"); return { haber: v.haber, inev: v.inevitable }; });
  check(`${W} · partición conjunta: exceso inevitable de la viuda 87.333,33 €`, Math.abs(C.inev - 87333.33) < 0.02 && Math.abs(C.haber - 212666.67) < 0.02, JSON.stringify(C));
  // Clases de bien nuevas: criptoactivo valorado con unidades × precio
  await ev(() => { const x = DB.expedientes.find((q) => q.id === window.__ID); delete x.bienes[0].adjudicadoA; go({ vista: "exp", id: x.id, sec: "herencia", sheet: null }); ui.sheet = { tipo: "addBien" }; render(); }); await w();
  t = await txt();
  check(`${W} · Añadir bien: clases nuevas (cripto, arte, crédito, derecho real, explotación, en el extranjero…)`, ["Criptoactivo", "Arte, joyas y colecciones", "Crédito a favor", "Derecho real", "Explotación agraria", "Embarcación o aeronave"].every((s) => t.includes(s)));
  await p.click('[data-addb="cripto"]'); await w(500);
  await p.fill('[data-bn="unidades"]', "2,5"); await p.locator('[data-bn="unidades"]').blur(); await w(300);
  await p.fill('[data-bn="precioUnidad"]', "60000"); await p.locator('[data-bn="precioUnidad"]').blur(); await w(400);
  t = await txt();
  check(`${W} · cripto: «Cómo se valora» con el cálculo 2,5 × 60.000 = 150.000`, /Cómo se valora/.test(t) && /150\.000,00/.test(t));
  check(`${W} · cripto: pide la fuente del precio`, /fuente del precio/i.test(t));
  await foto("cripto");
  await p.click("[data-usarval]"); await w(400);
  const vC = await ev(() => DB.expedientes.find((q) => q.id === window.__ID).bienes.find((b) => b.tipo === "cripto").valor);
  check(`${W} · «Usar este valor» lo lleva a la ficha`, Number(vC) === 150000, vC);
  // En el extranjero con impuesto pagado: deducción del art. 23
  await p.locator('input[data-bn="enExtranjero"]').check({ force: true }); await w(400);
  await p.fill('[data-bn="extPais"]', "Suiza"); await p.locator('[data-bn="extPais"]').blur(); await w(300);
  await p.fill('[data-bn="extImpuesto"]', "3000"); await p.locator('[data-bn="extImpuesto"]').blur(); await w(400);
  const d23 = await ev(() => calcular(DB.expedientes.find((q) => q.id === window.__ID)).isd.herederos.reduce((s, h) => s + (h.dobleImposicion || 0), 0));
  check(`${W} · bien en el extranjero: deducción por doble imposición internacional (art. 23)`, d23 > 0 && d23 <= 3000.01, d23);
  await ev(() => { ui.sheet = null; render(); }); await w();
  // Deudas y gastos con su tipo
  await ev(() => { ui.sheet = { tipo: "deudas" }; render(); }); await w();
  await p.click('[data-lpadd="deudas"]'); await w();
  await p.fill('[data-lp="deudas.0.importe"]', "12000"); await p.locator('[data-lp="deudas.0.importe"]').blur(); await w(300);
  await p.selectOption('[data-lp="deudas.0.tipo"]', "familiar"); await w(400);
  t = await txt();
  check(`${W} · deuda con un heredero: «No se resta en el impuesto» con el art. 13.1`, /No se resta en el impuesto/.test(t) && /13\.1/.test(t));
  await foto("deudas");
  const nd = await ev(() => calcular(DB.expedientes.find((q) => q.id === window.__ID)).isd.masa.noDeducible);
  check(`${W} · motor: 12.000 € no deducibles`, Math.abs(nd - 12000) < 0.01, nd);
  await ev(() => { ui.sheet = null; render(); }); await w();
  // Comunicación foral vizcaína
  await ev(() => { const x = DB.expedientes.find((q) => q.id === window.__ID); Object.assign(x, { ccaa: "BIZ", vecindadCivil: "VASCO", regimen: { aforado: true } }); x.bienes = [{ id: "bv", tipo: "vivienda", descripcion: "Caserío en Gernika", valor: 300000, titularidad: "privativo", municipio: "OTRO" }, { id: "bc", tipo: "cuenta", descripcion: "Cuenta", valor: 100000, titularidad: "ganancial" }]; x.deudas = []; render(); }); await w(500);
  t = await txt();
  check(`${W} · Bizkaia aforado: comunicación foral en la tarjeta`, /Comunicación foral de bienes/.test(t));
  const mb = await ev(() => calcular(DB.expedientes.find((q) => q.id === window.__ID)).isd.masa.bruto);
  check(`${W} · comunicación con hijos comunes: herencia 200.000 (todo por mitad)`, Math.abs(mb - 200000) < 0.01, mb);
  // Sin desbordes horizontales a 390 px
  const desb = await ev(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${W} · sin desbordamiento horizontal`, desb <= 1, desb);
  check(`${W} · sin errores de consola`, !errs.length, errs.join(" | "));
  await ctx.close();
}
await b.close();
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
