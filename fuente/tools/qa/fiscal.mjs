// Prueba de navegador de G06 (presentaciones y notificaciones), G08 (aplazamiento) y G09 (festivos) con el despacho de demostración:
// subpestañas de Impuestos, plazos en Trámites, Agenda y Mi día, escrito de aplazamiento, móvil sin desplazamiento lateral y cero errores.
// Uso: servir fuente/ con la app construida (python3 src/build.py; python3 -m http.server 8791) y ejecutar node tools/qa/fiscal.mjs [url].
// PLAYWRIGHT=/ruta/a/playwright/index.mjs y CHROMIUM=/ruta/al/ejecutable si no están en los sitios por defecto. Capturas en $TMPDIR/hp-qa-fiscal.
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const OUT = (process.env.TMPDIR || "/tmp") + "/hp-qa-fiscal";
const URL_APP = process.argv[2] || "http://127.0.0.1:8791/app/";
import fs from "node:fs"; fs.mkdirSync(OUT, { recursive: true });
let ok = 0, ko = 0;
const check = (n, c, extra = "") => { if (c) ok++; else ko++; console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + extra : ""}`); };
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const vp of [{ width: 1366, height: 900, n: "escritorio" }, { width: 390, height: 844, n: "movil" }]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "es-ES", timezoneId: "Europe/Madrid", deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errores.push("console: " + m.text()); });
  await p.goto(URL_APP); await p.waitForTimeout(1500);
  const ev = (f, a) => p.evaluate(f, a), w = (ms = 300) => p.waitForTimeout(ms);
  await ev(() => { if (typeof bvSaltar === "function" && document.querySelector(".bv-over")) bvSaltar(); });
  const n = await ev(() => demoCargar()); await w(800);
  check(`${vp.n} · demostración cargada`, n >= 10, String(n));
  // Expediente andaluz con inmuebles en Marbella
  const id = await ev(() => (DB.expedientes.find((x) => x.ccaa === "AND" && (x.bienes || []).some((b) => b.municipio === "MARBELLA")) || DB.expedientes.find((x) => x.ccaa === "AND")).id);
  await ev((id) => go({ vista: "exp", id, sec: "impuestos", sub: "presentaciones" }), id); await w(600);
  check(`${vp.n} · subpestañas de Impuestos`, await ev(() => document.querySelectorAll(".imp-sub button").length === 3));
  check(`${vp.n} · panel de presentaciones con calendario`, await ev(() => /Contados los festivos nacionales/.test(document.querySelector(".fs-cal")?.textContent || "")));
  await p.screenshot({ path: `${OUT}/${vp.n}-presentaciones.png`, fullPage: true });
  // Municipio del calendario: Málaga
  await p.selectOption("[data-fsmuni]", "29067"); await w(400);
  check(`${vp.n} · municipio del calendario guardado y contado`, await ev(() => exp().muniPlazos === "29067" && /Málaga/.test(document.querySelector(".fs-cal").textContent)));
  // Anotar la presentación del primer heredero
  await p.click('[data-fs="editar"]'); await w(300);
  await p.fill("#fs-f", await ev(() => hoy())); await p.fill("#fs-n", "NRC0123456789ABCDEF");
  await p.click('form[data-fsf="pres"] button[type="submit"]'); await w(500);
  check(`${vp.n} · presentación anotada`, await ev(() => (exp().presentaciones || []).length === 1 && /NRC/.test(document.querySelector(".fs-grupo .row small")?.textContent || "")));
  check(`${vp.n} · tabla de prescripción`, await ev(() => !!document.querySelector(".fs-t tbody tr")));
  // Notificación: requerimiento de 5 días hábiles notificado hoy → entra en Mi día
  await p.click('[data-fs="nuevo"]'); await w(300);
  await p.fill("#fq-f", await ev(() => hoy())); await p.fill("#fq-d", "2"); await p.fill("#fq-o", "Gerencia Provincial de Málaga");
  await p.click('form[data-fsf="proc"] button[type="submit"]'); await w(600);
  const tid = await ev(() => { const q = exp().procedimientos[0]; return `fs-${q.id}-atender`; });
  check(`${vp.n} · plazos de la notificación en el panel`, await ev(() => !!document.querySelector(".fs-proc .row")));
  check(`${vp.n} · el plazo es un trámite del expediente`, await ev((tid) => tramitesExp(exp(), calcular(exp())).some((t) => t.id === tid && t.limite), tid));
  // Liquidación con comprobación de valores notificada hace 25 días: recurso y pago
  await ev(() => { exp().procedimientos.push({ id: "qa1", clave: exp().presentaciones[0].clave, tributo: "ISD", tipo: "comprobacionValores", fechaNot: sumarDias(hoy(), -25), organo: "", dias: 10, estado: "abierto" }); guardar(); rdRadarInvalidar(); render(); });
  await w(400);
  await p.screenshot({ path: `${OUT}/${vp.n}-notificaciones.png`, fullPage: true });
  // Mi día
  const md = await ev((tid) => { rdRadarInvalidar(); const R = radar(); const items = [...(R.hoy || []), ...(R.semana || []), ...(R.items || [])]; return { tiene: JSON.stringify(R).includes(tid), recurso: JSON.stringify(R).includes("fs-qa1-recurso") }; }, tid);
  check(`${vp.n} · Mi día: el requerimiento aparece`, md.tiene, JSON.stringify(md));
  check(`${vp.n} · Mi día: el recurso de la comprobación de valores aparece`, md.recurso, JSON.stringify(md));
  await ev(() => go({ vista: "radar" })); await w(600);
  check(`${vp.n} · Mi día pinta el requerimiento`, await ev(() => [...document.querySelectorAll("#app *")].some((n) => n.children.length === 0 && /Atender el requerimiento/.test(n.textContent))));
  await p.screenshot({ path: `${OUT}/${vp.n}-midia.png`, fullPage: true });
  // Agenda
  await ev(() => go({ vista: "agenda" })); await w(500);
  check(`${vp.n} · Agenda con los plazos de la notificación`, await ev(() => /Atender el requerimiento/.test(document.body.textContent) && /Recurso de reposición/.test(document.body.textContent)));
  // Hoja del trámite: aviso del calendario
  await ev((id) => go({ vista: "exp", id, sec: "tramites", sheet: { tipo: "tramite", id: "plusvalia" } }), id); await w(500);
  check(`${vp.n} · hoja de la plusvalía con el calendario contado`, await ev(() => /Contados los festivos/.test(document.querySelector(".cal-aviso")?.textContent || "")));
  await p.screenshot({ path: `${OUT}/${vp.n}-tramite.png` });
  // Aplazamiento
  await ev((id) => go({ vista: "exp", id, sec: "impuestos", sub: "aplazamiento", sheet: null }), id); await w(500);
  await p.screenshot({ path: `${OUT}/${vp.n}-aplazamiento.png`, fullPage: true });
  const ap = await ev(() => ({ form: !!document.querySelector(".ap-form"), filas: document.querySelectorAll(".ap-t tbody tr").length, vacio: !!document.querySelector(".card.empty") }));
  check(`${vp.n} · panel de aplazamiento`, ap.form && (ap.filas > 1 || ap.vacio), JSON.stringify(ap));
  // Forzar importe y modalidad: 18.000 € en 6 plazos trimestrales
  await p.fill("#ap-importe", "18000"); await p.locator("#ap-importe").dispatchEvent("change"); await w(300);
  await p.selectOption("#ap-periodicidad", "3"); await w(300);
  await p.fill("#ap-plazos", "6"); await p.locator("#ap-plazos").dispatchEvent("change"); await w(400);
  check(`${vp.n} · cuadro de 6 vencimientos trimestrales`, await ev(() => document.querySelectorAll(".ap-t tbody tr").length === 7 && exp().aplazamiento.periodicidad === 3));
  await p.screenshot({ path: `${OUT}/${vp.n}-aplazamiento-2.png`, fullPage: true });
  // Escrito
  await p.click('[data-doc="aplazamiento"]'); await w(600);
  check(`${vp.n} · escrito de solicitud de aplazamiento`, await ev(() => /SOLICITA/.test(document.querySelector(".paperview")?.textContent || "") && /fraccionamiento/.test(document.querySelector(".paperview").textContent)));
  await p.screenshot({ path: `${OUT}/${vp.n}-escrito.png` });
  // Sin desplazamiento horizontal en móvil
  await ev(() => { ui.sheet = null; render(); }); await w(200);
  check(`${vp.n} · sin desplazamiento horizontal`, await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1), String(await ev(() => document.documentElement.scrollWidth)));
  check(`${vp.n} · cero errores de consola`, errores.length === 0, errores.join(" | "));
  await ctx.close();
}
await b.close();
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
