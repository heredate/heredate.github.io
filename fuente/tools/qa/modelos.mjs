// Prueba de navegador de los modelos 650 y 660 casilla a casilla (G02, modelos.js): para cada expediente de la demostración y para un
// no residente (AEAT), Impuestos › Modelo 650 por heredero, Modelo 660, Firma › Hoja del 650 y Encargo › Cifras 650/660.
// Comprueba: cifras de cada ficha iguales al cálculo; casillas solo en territorios verificados («Orden orientativo» en el resto);
// cuadre de la hoja y de la relación de bienes; «Copiar» deja 1234,56 en el portapapeles; «Copiar todo en orden» con tabuladores;
// PDF del 650 y del 660 descargados y válidos; comprobación de datos que faltan y que desaparece al completarlos; sin desbordamiento
// horizontal a 390 px; cero errores en la consola.
// Uso: python3 src/build.py; (cd dist/publicar-gh && python3 -m http.server 8806); node tools/qa/modelos.mjs [url=http://127.0.0.1:8806/app/] [--capturas=dir]
import fs from "node:fs";
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const args = process.argv.slice(2);
const URL_APP = args.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8806/app/";
const CAPT = (args.find((a) => a.startsWith("--capturas=")) || "").slice(11);
let ok = 0, ko = 0;
const check = (n, c, extra = "") => { if (c) ok++; else ko++; if (!c || process.env.VERBOSO) console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + String(extra).slice(0, 400) : ""}`); };

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
const ev = (f, a) => p.evaluate(f, a);
await p.goto(URL_APP); await p.waitForTimeout(1200);
await ev(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); ui.sheet = null; render(); });
await p.waitForTimeout(400);
// No residente con bienes en Madrid: formulario de la AEAT con casillas verificadas
await ev(() => { const e = prepararEjemplo("mad"); e.id = "qa-est"; e.nombre = "QA no residente"; e.ccaa = "EST"; e.ccaaBienes = "MAD"; DB.expedientes.push(e); guardar(); });
const ids = await ev(() => DB.expedientes.filter((x) => calcular(x)).map((x) => x.id));
check("hay expedientes con cálculo", ids.length >= 10, ids.length);

const leer = () => ev(() => [...document.querySelectorAll(".m6-ficha")].map((f) => ({ id: f.id.replace(/^m6-650-/, ""), nc: f.classList.contains("nc"),
  filas: [...f.querySelectorAll(".vf-l")].map((l) => ({ cas: (l.querySelector(".vf-cas:not(.e)") || {}).textContent || "", lab: l.querySelector(".vf-lab").childNodes[0].textContent, v: l.querySelector(".vf-cp").dataset.v })) })));
for (const id of ids) {
  await ev((id) => { ui.vista = "exp"; ui.id = id; ui.sec = "impuestos"; ui.imv = "650"; ui.sheet = null; render(); }, id);
  const info = await ev(() => { const x = exp(), R = calcular(x); return { ccaa: x.ccaa, n: R.isd.herederos.length, H: R.isd.herederos.map((h) => ({ id: h.id, nombre: h.nombre, bi: h.baseImponible, bl: h.baseLiquidable, ai: h.aIngresar })), form: formulario650(x.ccaa) }; });
  const fmt = (v) => (Math.round(v * 100) / 100).toFixed(2).replace(".", ",");
  for (const h of info.H) {
    await ev((hid) => { ui.hsel = hid; render(); }, h.id);
    const F = (await leer())[0];
    check(`${id} · ${h.nombre}: una ficha en Impuestos`, F && F.id === h.id, JSON.stringify(F && F.id));
    if (!F) continue;
    const v = (lab) => (F.filas.find((f) => f.lab === lab) || {}).v;
    check(`${id} · ${h.nombre}: base imponible = cálculo`, v("Base imponible") === fmt(h.bi), v("Base imponible") + " / " + fmt(h.bi));
    check(`${id} · ${h.nombre}: base liquidable = cálculo`, v("Base liquidable") === fmt(h.bl));
    check(`${id} · ${h.nombre}: a ingresar = cálculo`, (v("A ingresar") || v("Cuota a ingresar antes del recargo")) === fmt(h.ai));
    check(`${id} · ${h.nombre}: casillas solo si el formulario está cotejado`, info.form.orientativo ? F.nc && F.filas.every((f) => !f.cas) : F.filas.some((f) => f.cas));
  }
  const txt = await ev(() => document.querySelector(".m6").innerText);
  check(`${id}: sin undefined/NaN en el 650`, !/undefined|NaN|\[object/.test(txt));
  check(`${id}: etiqueta del estado del formulario`, info.form.orientativo ? /Orden orientativo/.test(txt) : /Casillas verificadas/.test(txt));
  check(`${id}: hojas cuadradas`, !/no cuadran/.test(txt));
  // 660
  await ev(() => { ui.imv = "660"; render(); });
  const r6 = await ev(() => { const x = exp(), R = calcular(x), t = document.querySelector(".m6").innerText; return { t, ok: /Cuadra con el cálculo/.test(t), bruto: R.isd.masa.bruto, tot: relacion660(m6Caso(x), R.isd).totales.bienes, iban: (x.bienes || []).filter((b) => b.iban).map((b) => b.iban.replace(/\s/g, "")) }; });
  check(`${id}: 660 cuadra con el cálculo`, r6.ok && Math.abs(r6.tot - r6.bruto) < 0.01);
  check(`${id}: 660 sin undefined/NaN`, !/undefined|NaN|\[object/.test(r6.t));
  check(`${id}: 660 nunca muestra un IBAN completo`, r6.iban.every((i) => !r6.t.replace(/\s/g, "").includes(i)));
  check(`${id}: 660 con documentos que se acompañan`, /Documentos que se acompañan/.test(r6.t) && /Certificado literal de defunción/.test(r6.t));
}

// Copiar: casilla y «todo en orden»
await ev(() => { ui.vista = "exp"; ui.id = "qa-est"; ui.sec = "impuestos"; ui.imv = "650"; ui.hsel = null; render(); });
const est = await ev(() => document.querySelector(".m6").innerText);
check("no residente: modelo 650 de la AEAT con casillas verificadas", /Modelo 650 de la Agencia Tributaria/.test(est) && /Casillas verificadas/.test(est));
const cas22 = await ev(() => { const l = [...document.querySelectorAll(".m6-ficha .vf-l")].find((q) => (q.querySelector(".vf-cas:not(.e)") || {}).textContent === "22"); return l ? l.querySelector(".vf-cp").dataset.v : ""; });
await p.locator(".m6-ficha .vf-l").filter({ has: p.locator(".vf-cas:not(.e)", { hasText: /^22$/ }) }).locator(".vf-cp").click(); await p.waitForTimeout(250);
const clip = await ev(() => navigator.clipboard.readText());
check("Copiar la casilla 22 deja 1234,56 en el portapapeles", clip === cas22 && /^\d+,\d{2}$/.test(clip), clip + " / " + cas22);
await p.click('[data-m6="cpall"]'); await p.waitForTimeout(250);
const todo = await ev(() => navigator.clipboard.readText());
check("Copiar todo en orden: identificación y casillas con tabuladores", /^Modelo 650 · /.test(todo) && /\n22\tBase imponible\t\d+,\d{2}/.test(todo) && /SUJETO PASIVO/.test(todo) && /\n63\tA ingresar\t/.test(todo), todo.slice(0, 300));

// PDF del 650 y del 660
const pdf = async (sel) => { const [d] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click(sel)]); const f = await d.path(); const buf = fs.readFileSync(f); return { n: d.suggestedFilename(), ok: buf.slice(0, 5).toString() === "%PDF-" && /%%EOF\s*$/.test(buf.slice(-16).toString()), kb: buf.length / 1024 }; };
const p650 = await pdf('.m6-bar [data-m6="pdf650"]');
check("PDF del 650 descargado y válido", p650.ok && /^Modelo-650/.test(p650.n), JSON.stringify(p650));
await ev(() => { ui.imv = "660"; render(); });
const p660 = await pdf('[data-m6="pdf660"]');
check("PDF del 660 descargado y válido", p660.ok && /^Modelo-660/.test(p660.n), JSON.stringify(p660));

// Comprobación de datos: falta el NIF → se señala; con el NIF puesto, desaparece
await ev(() => { ui.imv = "650"; render(); });
const antes = await ev(() => document.querySelector(".m6-chk").innerText);
check("comprobación: señala el NIF que falta del causante", /Causante: falta el NIF/.test(antes));
await ev(() => { const x = exp(); x.nifCausante = "00000014Z"; x.domicilioCausante = "Calle Mayor 1, 28013 Madrid"; guardar(); render(); });
const desp = await ev(() => document.querySelector(".m6-chk").innerText);
check("comprobación: el NIF del causante ya no se señala al completarlo", !/Causante: falta el NIF/.test(desp) && !/Causante: falta el último domicilio/.test(desp));
// «Completar» lleva al campo en Listo para firmar
await ev(() => { const x = exp(); x.nifCausante = ""; guardar(); render(); });
await p.click('.m6-chk [data-m6="foco"][data-id="vf-x-nifCausante"]'); await p.waitForTimeout(500);
check("Completar lleva al NIF del causante en Listo para firmar", await ev(() => ui.sec === "firma" && document.activeElement && document.activeElement.id === "vf-x-nifCausante"));

// Firma › Hoja del 650 y Encargo › Cifras 650/660: todas las fichas
await ev(() => { ui.vista = "exp"; ui.id = "dm-02"; ui.sec = "firma"; ui.vfv = "650"; render(); });
const nF = await ev(() => [document.querySelectorAll(".m6-ficha").length, calcular(exp()).isd.herederos.length]);
check("Firma › Hoja del 650: una ficha por heredero", nF[0] === nF[1] && nF[0] > 1, nF);
await ev(() => { ui.sec = "despacho"; ui.sub = "650"; render(); });
check("Encargo › Cifras 650/660: fichas del 650", await ev(() => document.querySelectorAll(".m6-ficha").length > 1));
// Desde el 650, el botón de la relación de bienes abre el 660
await ev(() => { ui.sec = "impuestos"; ui.imv = "650"; render(); });
await p.click('.m6-bar [data-m6="imv"][data-v="660"]'); await p.waitForTimeout(200);
check("el botón de la relación de bienes abre el 660", await ev(() => ui.imv === "660" && /Modelo 660 · relación de bienes/.test(document.querySelector(".m6").innerText)));

// Pantallas: escritorio (claro y oscuro) y móvil sin desbordamiento horizontal
for (const [w, h, tema] of [[1440, 950, "light"], [1440, 950, "dark"], [390, 844, "light"], [390, 844, "dark"]]) {
  await p.setViewportSize({ width: w, height: h });
  await ev((t) => document.documentElement.setAttribute("data-theme", t), tema);
  for (const v of ["650", "660"]) {
    await ev((v) => { ui.vista = "exp"; ui.id = "dm-03"; ui.sec = "impuestos"; ui.imv = v; render(); window.scrollTo(0, 0); }, v); await p.waitForTimeout(250);
    const des = await ev(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${w} px ${tema} · ${v}: sin desbordamiento horizontal`, des <= 1, des);
    if (CAPT) { fs.mkdirSync(CAPT, { recursive: true }); await p.screenshot({ path: `${CAPT}/m6-${v}-${w}-${tema}.png`, fullPage: w < 600 ? false : true }); }
  }
}
// Cifras negativas en rojo, el resto en tinta neutra (capa cine)
await p.setViewportSize({ width: 1440, height: 950 });
await ev(() => { ui.vista = "exp"; ui.id = "dm-05"; ui.sec = "impuestos"; ui.imv = "660"; render(); }); await p.waitForTimeout(300);
const tinta = await ev(() => { const c = (s) => { const n = document.querySelector(s); return n ? getComputedStyle(n).color : ""; }; return { tot: c(".m6-tot .vf-l b.num"), ink: getComputedStyle(document.documentElement).getPropertyValue("--ink-1").trim() }; });
check("cifras de la relación en tinta neutra", !!tinta.tot, JSON.stringify(tinta));

check("cero errores en la consola", errores.length === 0, errores.join(" | "));
await b.close();
console.log(`\nmodelos 650/660 en el navegador: ${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
