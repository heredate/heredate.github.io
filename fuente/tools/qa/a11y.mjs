// Certificación de accesibilidad de Hereda+: axe-core (WCAG 2.0/2.1/2.2, niveles A y AA) en todas las pantallas,
// hojas y superposiciones de la app, en tema claro y grafito, a 1440 y a 390 px.
// Con --capturas carpeta guarda además una captura de cada pantalla (y con --sin-axe, solo las capturas).
// Uso: servir la raíz del repositorio (python3 -m http.server 8783) y ejecutar desde la raíz:
//   (cd tools/qa && npm install)   # una vez: instala axe-core y lighthouse (devDependencies)
//   node tools/qa/a11y.mjs [url] [--json salida.json] [--solo nombre] [--tema claro|grafito] [--ancho 1440|390]
// Sale con código 1 si queda alguna infracción. Necesita Playwright con Chromium (PLAYWRIGHT=/ruta/a/playwright/index.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const URL_APP = args.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8783/app/";
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
const TEMAS = opt("--tema") ? [opt("--tema")] : ["claro", "grafito"];
const ANCHOS = opt("--ancho") ? [Number(opt("--ancho"))] : [1440, 390];
const SOLO = opt("--solo");
const CAPTURAS = opt("--capturas");  // carpeta: guarda una captura de cada pantalla comprobada (ancho-tema-nombre.png)
const SIN_AXE = args.includes("--sin-axe");

// Cada pantalla: nombre y una función que se ejecuta en la página (con la app ya cargada y el despacho ficticio).
// «limpiar» cierra lo que pudiera quedar abierto de la anterior.
const clic = (sel) => `(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (n) n.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!n; })()`;
const PANTALLAS = [
  ["mi-dia", `go({ vista: "radar", sheet: null })`],
  ["expedientes-tabla", `go({ vista: "inicio", sheet: null, cv: "tabla" })`],
  ["expedientes-fase", `go({ vista: "inicio", sheet: null, cv: "tablero" })`],
  ["expedientes-plazos", `go({ vista: "inicio", sheet: null, cv: "plazos" })`],
  ["agenda-lista", `go({ vista: "agenda", sheet: null, av: "lista" })`],
  ["agenda-mes", `go({ vista: "agenda", sheet: null, av: "mes" })`],
  ["rentabilidad", `go({ vista: "rent", sheet: null })`],
  ["normativa", `go({ vista: "biblio", sheet: null })`],
  ["despacho-socio", `go({ vista: "socio", sheet: null })`],
  ...["resumen", "herencia", "impuestos", "particion", "tramites", "documentos", "diagnostico", "estrategia", "segunda", "terceros", "firma", "normativa", "despacho"]
    .map((s) => ["exp-" + s, `go({ vista: "exp", id: window.__ID, sec: ${JSON.stringify(s)}, sheet: null, dsub: "archivo" })`]),
  ...["encargo", "actividad", "fondos", "tiempos", "docs"].map((k) => ["exp-despacho-" + k, `go({ vista: "exp", id: window.__ID, sec: "despacho", sub: ${JSON.stringify(k)}, sheet: null })`]),
  ["exp-documentos-escritos", `go({ vista: "exp", id: window.__ID, sec: "documentos", dsub: "escritos", sheet: null })`],
  ["exp-tramites-crono", `go({ vista: "exp", id: window.__ID, sec: "tramites", tv: "crono", sheet: null })`],
  ...[1, 2, 3, 4, 5].map((i) => ["exp-particion-" + (i + 1), `ui.pstepFor = window.__ID; ui.pstep = ${i}; go({ vista: "exp", id: window.__ID, sec: "particion", sheet: null })`]),
  ["despacho-actividad", `ui.scTab = "actividad"; go({ vista: "socio", sheet: null })`],
  ...["estatal", "autonomica", "municipal"].map((k) => ["normativa-" + k, `ui.bn = ${JSON.stringify(k)}; go({ vista: "biblio", sheet: null })`]),
  ["hoja-persona", `go({ vista: "exp", id: window.__ID, sec: "herencia", sheet: null }); ${clic("[data-editp]")}`],
  ["hoja-bien", `go({ vista: "exp", id: window.__ID, sec: "herencia", sheet: null }); ${clic("[data-editb]")}`],
  ["hoja-tramite", `go({ vista: "exp", id: window.__ID, sec: "tramites", sheet: null }); ${clic("[data-topen]")}`],
  ["hoja-ajustes", `ui.sheet = { tipo: "ajustes" }; render()`],
  ["hoja-familia", `go({ vista: "exp", id: window.__ID, sec: "resumen", sheet: { tipo: "familia" } })`],
  ["hoja-anadir-persona", `go({ vista: "exp", id: window.__ID, sec: "herencia", sheet: { tipo: "addPersona" } })`],
  ["hoja-anadir-bien", `go({ vista: "exp", id: window.__ID, sec: "herencia", sheet: { tipo: "addBien" } })`],
  ["hoja-importar", `ui.imp = null; ui.sheet = { tipo: "importar" }; render()`],
  ["hoja-lector-nuevo", `ui.sheet = { tipo: "lecNuevo" }; render()`],
  ["hoja-novedades", `ui.sheet = { tipo: "novedades" }; render()`],
  ["hoja-opinion", `ui.sheet = { tipo: "opinion" }; render()`],
  ["hoja-menu-app", `ui.sheet = { tipo: "menuApp" }; render()`],
  ["hoja-mas-secciones", `go({ vista: "exp", id: window.__ID, sec: "resumen", sheet: { tipo: "mas" } })`],
  ["hoja-carpeta", `go({ vista: "exp", id: window.__ID, sec: "resumen", sheet: { tipo: "carpeta" } })`],
  ["hoja-widget", `ui.sheet = { tipo: "widget" }; render()`],
  ["asistente-1", `${clic('[data-act="nuevo"]')}`],
  ["asistente-2", `${clic('[data-act="nuevo"]')}; ${clic(".wiz .bottombar .btn")}`],
  ["paleta", `go({ vista: "radar", sheet: null }); pkAbrir()`],
  ["ayuda", `go({ vista: "radar", sheet: null }); ayAbrir()`],
  ...["pantalla", "primer", "expediente", "herencia", "impuestos", "particion", "tramites", "familia", "documentos", "leer", "ajustes"].map((g) => ["guia-" + g, `ui.scTab = "panel"; go({ vista: "radar", sheet: null }); if (guLista().some((x) => x.id === ${JSON.stringify(g)})) guAbrir(${JSON.stringify(g)})`]),
  ["reunion", `go({ vista: "exp", id: window.__ID, sec: "resumen", sheet: null }); reunionAbrir(exp())`],
];
const LIMPIAR = `try { if (typeof guActiva === "function" && guActiva()) guCerrar(true); } catch (e) {}
  try { if (typeof pkAbierta === "function" && pkAbierta()) pkCerrar(); } catch (e) {}
  try { if (typeof ayAbierta === "function" && ayAbierta()) ayCerrar(); } catch (e) {}
  try { if (typeof RN === "object" && RN.el && typeof reunionCerrar === "function") reunionCerrar(); } catch (e) {}
  ui.sheet = null; ui.conf = null; if (ui.vista === "asist") { ui.borrador = null; ui.vista = "radar"; } render();`;

const browser = await chromium.launch();
const resumen = []; let total = 0;
for (const W of ANCHOS) for (const tema of TEMAS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W < 600 ? 844 : 900 }, reducedMotion: "reduce" });
  const pg = await ctx.newPage();
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto(URL_APP); await pg.waitForTimeout(900);
  const correr = async (nombre) => {
    if (CAPTURAS) await pg.screenshot({ path: `${CAPTURAS}/${W}-${tema}-${nombre}.png` });
    if (SIN_AXE) return;
    await pg.addScriptTag({ content: AXE }).catch(() => {});
    const r = await pg.evaluate(async (tags) => {
      const res = await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, nodos: v.nodes.slice(0, 4).map((x) => ({ t: x.target.join(" "), f: (x.failureSummary || "").split("\n").slice(1, 3).join(" ").slice(0, 220) })) }));
    }, TAGS);
    const n = r.reduce((s, v) => s + v.n, 0); total += n;
    resumen.push({ pantalla: nombre, tema, ancho: W, infracciones: n, reglas: r });
    console.log(`${n ? "✘" : "✔"} ${W} ${tema.padEnd(7)} ${nombre.padEnd(24)} ${n ? r.map((v) => `${v.id}×${v.n}`).join(", ") : "0"}`);
    if (n && process.env.DETALLE) for (const v of r) for (const x of v.nodos) console.log(`     · ${v.id}: ${x.t} — ${x.f}`);
  };
  // Bienvenida (primera vez, sin despacho): se ve antes de cargar la demostración
  await pg.evaluate((t) => { DB.tema = t; aplicarTema(); }, tema);
  if (!SOLO || SOLO.startsWith("bienvenida")) for (let i = 0; i < 4; i++) { await pg.evaluate((i) => { if (typeof bvAbrir === "function") bvAbrir({ paso: i }); }, i); await pg.waitForTimeout(400); await correr("bienvenida-" + (i + 1)); }
  await pg.evaluate((t) => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); DB.tema = t; aplicarTema(); window.__ID = (DB.expedientes.find((x) => x.fase !== "cerrado" && x.personas.length > 2) || DB.expedientes[0]).id; render(); }, tema);
  await pg.waitForTimeout(500);
  for (const [nombre, js] of PANTALLAS) {
    if (SOLO && !nombre.includes(SOLO)) continue;
    await pg.evaluate(LIMPIAR).catch(() => {}); await pg.waitForTimeout(120);
    await pg.evaluate(js).catch((e) => console.log("   (no se pudo abrir " + nombre + ": " + e.message.slice(0, 120) + ")"));
    await pg.waitForTimeout(450);
    await correr(nombre);
  }
  if (!SOLO || "familia carpeta".includes(SOLO)) {
    // Páginas fuera de la app: el cuestionario para la familia (/familia/) y la carpeta que se le entrega (archivo autónomo)
    const carpeta = await pg.evaluate(() => { const x = DB.expedientes.find((q) => q.id === window.__ID); return carpetaHTML(x, calcular(x), {}); });
    const p2 = await ctx.newPage(); await p2.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" });
    const base = URL_APP.replace(/app\/?$/, "");
    await p2.goto(base + "familia/#d=Despacho%20Ruiz%20Abogados&r=HER-2026-014&c=Carmen%20L%C3%B3pez%20Garc%C3%ADa"); await p2.waitForTimeout(500);
    const pgApp = pg; for (const [nombre, prep] of [["familia-inicio", null], ["familia-paso", async () => { await p2.click(".btn"); await p2.waitForTimeout(400); }], ["carpeta", async () => { await p2.setContent(carpeta); await p2.waitForTimeout(400); }]]) {
      if (prep) await prep().catch((e) => console.log("   (" + nombre + ": " + e.message.slice(0, 80) + ")"));
      if (SIN_AXE) { if (CAPTURAS) await p2.screenshot({ path: `${CAPTURAS}/${W}-${tema}-${nombre}.png` }); continue; }
      await p2.addScriptTag({ content: AXE }).catch(() => {});
      const r = await p2.evaluate(async (tags) => (await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] })).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, nodos: v.nodes.slice(0, 4).map((x) => ({ t: x.target.join(" "), f: (x.failureSummary || "").split("\n").slice(1, 3).join(" ").slice(0, 220) })) })), TAGS);
      const n = r.reduce((s, v) => s + v.n, 0); total += n; resumen.push({ pantalla: nombre, tema, ancho: W, infracciones: n, reglas: r });
      if (CAPTURAS) await p2.screenshot({ path: `${CAPTURAS}/${W}-${tema}-${nombre}.png` });
      console.log(`${n ? "✘" : "✔"} ${W} ${tema.padEnd(7)} ${nombre.padEnd(24)} ${n ? r.map((v) => `${v.id}×${v.n}`).join(", ") : "0"}`);
      if (n && process.env.DETALLE) for (const v of r) for (const x of v.nodos) console.log(`     · ${v.id}: ${x.t} — ${x.f}`);
    }
    await p2.close();
  }
  if (errs.length) console.log("   errores de página:", errs.slice(0, 5));
  await ctx.close();
}
await browser.close();
const pant = resumen.length, limpias = resumen.filter((r) => !r.infracciones).length;
console.log(`\n${limpias}/${pant} comprobaciones sin infracciones · ${total} nodos con infracción · reglas WCAG 2.2 A/AA (${TAGS.join(", ")})`);
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify({ fecha: new Date().toISOString(), axe: JSON.parse(readFileSync(require.resolve("axe-core/package.json"), "utf8")).version, tags: TAGS, total, resumen }, null, 1));
process.exit(total ? 1 : 0);
