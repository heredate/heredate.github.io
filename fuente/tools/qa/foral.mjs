// Prueba de navegador del derecho civil foral (ronda 4, 07-10-2026): ley aplicable en claro en Herederos, bien troncal en la ficha del bien,
// línea del pariente cuando hace falta, reparto recalculado y bloqueo con instrucción si falta la línea; axe (WCAG 2.2 A/AA) en las hojas nuevas.
// (El buscador de municipios vacío tiene dos infracciones de axe ya existentes, ajenas a esta prueba: el inmueble lleva un municipio elegido.)
// Uso: servir la raíz (python3 -m http.server 8802) y ejecutar  node tools/qa/foral.mjs [url] [--capturas carpeta]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const args = process.argv.slice(2);
const URL_APP = args.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8802/app/";
const CAP = args.includes("--capturas") ? args[args.indexOf("--capturas") + 1] : null;
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
let ok = 0, ko = 0;
const check = (n, c, extra = "") => { c ? ok++ : ko++; console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + String(extra).slice(0, 300) : ""}`); };
const b = await chromium.launch();
for (const W of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(URL_APP); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a), w = (ms = 400) => p.waitForTimeout(ms);
  const axe = async (nombre) => {
    await p.addScriptTag({ content: AXE }).catch(() => {});
    const r = await ev(async (tags) => (await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] })).violations.map((v) => `${v.id}×${v.nodes.length}`), TAGS);
    check(`${W} · axe sin infracciones: ${nombre}`, !r.length, r.join(", "));
  };
  // Expediente aragonés sin testamento: viuda y hermano; casa troncal de la familia del padre
  await ev(() => {
    if (document.querySelector(".bv-over")) bvSaltar(); demoCargar();
    const x = DB.expedientes[0];
    Object.assign(x, { ccaa: "ARA", testamento: "no", vecindadCivil: "ARA", civil: "separacion" });
    x.personas = [{ id: "pv", nombre: "Pilar Gracia", relacion: "conyuge", edad: 70 }, { id: "ph", nombre: "Jorge Lasierra", relacion: "hermano", edad: 66, medio: true }];
    x.bienes = [{ id: "bc", tipo: "cuenta", descripcion: "Cuenta corriente", valor: 300000, titularidad: "privativo" }, { id: "bt", tipo: "inmueble", descripcion: "Casa en Ansó", valor: 100000, titularidad: "privativo", municipio: "MALAGA" }];
    x.deudas = []; x.gastos = [];
    window.__ID = x.id; go({ vista: "exp", id: x.id, sec: "herencia", sheet: null });
  }); await w(700);
  const txt = await ev(() => document.querySelector("main")?.innerText || document.body.innerText);
  check(`${W} · Herederos dice la ley aplicable en claro`, /Ley aplicable sin testamento: Derecho civil aragonés/.test(txt));
  check(`${W} · sin troncales: aviso de que los marque en la ficha`, await ev(() => calcular(DB.expedientes[0]).isd.alertas.some((a) => /márcalo como troncal/.test(a))));
  // Ficha del bien: interruptor «Bien troncal»
  await ev(() => { ui.sheet = { tipo: "bien", id: "bt" }; render(); }); await w(500);
  check(`${W} · la ficha del bien ofrece «Bien troncal»`, await ev(() => !!document.querySelector('input[data-bn="troncal"]')));
  await p.click('label.switch:has(input[data-bn="troncal"])'); await w(500);
  check(`${W} · al marcarlo, pide la familia de procedencia`, await ev(() => DB.expedientes[0].bienes[1].troncal === true && !!document.querySelector("#b-lt")));
  await p.selectOption("#b-lt", "paterna"); await w(500);
  if (CAP) await p.screenshot({ path: `${CAP}/${W}-hoja-bien-troncal.png` });
  await axe("hoja del bien troncal");
  // Medio hermano sin línea: el reparto se bloquea y dice qué falta
  const R1 = await ev(() => { const R = calcular(DB.expedientes[0]); return { b: R.isd.bloqueo && R.isd.bloqueo.accion }; });
  check(`${W} · medio hermano sin línea: bloqueo que pide la línea`, R1.b && /Jorge Lasierra/.test(R1.b), JSON.stringify(R1));
  // Ficha del hermano: pide la línea
  await ev(() => { ui.sheet = { tipo: "persona", id: "ph" }; render(); }); await w(500);
  check(`${W} · la ficha del medio hermano pide su línea`, await ev(() => !!document.querySelector('[data-plin="paterna"]')));
  await p.click('[data-plin="paterna"]'); await w(400);
  if (CAP) await p.screenshot({ path: `${CAP}/${W}-hoja-persona-linea.png` });
  await axe("hoja de la persona con línea");
  const R2 = await ev(() => { const R = calcular(DB.expedientes[0]); return { bloqueo: !!R.isd.bloqueo, h: R.isd.derechos.ph, v: R.isd.derechos.pv }; });
  check(`${W} · con la línea: la casa al hermano (nuda) con el usufructo de la viuda`, !R2.bloqueo && R2.h && R2.h[0].tipo === "nuda" && Math.abs(R2.h[0].fraccion - 0.25) < 1e-9, JSON.stringify(R2));
  await ev(() => { ui.sheet = null; go({ vista: "exp", id: window.__ID, sec: "herencia", sheet: null }); }); await w(600);
  const txt2 = await ev(() => document.body.innerText);
  check(`${W} · las notas explican los bienes troncales`, /Bienes troncales de la línea paterna \(Casa en Ansó\)/.test(txt2));
  if (CAP) await p.screenshot({ path: `${CAP}/${W}-herencia-aragon.png`, fullPage: false });
  await ev(() => document.querySelector(".lg-vec")?.scrollIntoView()); await w(300);
  if (CAP) await p.screenshot({ path: `${CAP}/${W}-vecindad.png` });
  await axe("Herederos con derecho aragonés");
  // Fuera de Aragón, Navarra y el País Vasco no aparece el interruptor
  await ev(() => { const x = DB.expedientes[0]; x.ccaa = "AND"; x.vecindadCivil = "comun"; ui.sheet = { tipo: "bien", id: "bt" }; render(); }); await w(400);
  check(`${W} · en derecho común no hay «Bien troncal»`, await ev(() => !document.querySelector('input[data-bn="troncal"]')));
  check(`${W} · sin errores de JavaScript`, !errs.length, errs.join(" | "));
  await ctx.close();
}
await b.close();
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
