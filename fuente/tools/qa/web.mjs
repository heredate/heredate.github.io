// Prueba de la web pública: portada (index.html), contratación y páginas legales.
//  · axe-core (WCAG 2.0/2.1/2.2 A y AA) a 1440 y 390 px, en claro y en oscuro
//  · sin desplazamiento horizontal, sin peticiones a otros dominios, sin marcadores «[MAYÚSCULAS]» en la portada
//  · llamadas a la acción: «Probar 30 días» → /app/ y «Hablar con nosotros» → contratar.html
//  · vídeo de la portada: archivos presentes (MP4 ≤ 12 MB, WebM, pósteres, vertical), duración 75-100 s, póster como imagen principal,
//    reproducción automática en escritorio después de cargar la página, botón de pausa, y sin reproducción automática en móvil ni con
//    «reducir movimiento»
// Uso: servir la raíz (python3 -m http.server 8807) y, desde la raíz:  node tools/qa/web.mjs [http://127.0.0.1:8807/]
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs");
const BASE = (process.argv.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8807/").replace(/\/?$/, "/");
const RAIZ = path.resolve(new URL("../..", import.meta.url).pathname);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
const PAGINAS = ["", "contratar.html", "condiciones.html", "privacidad.html", "aviso-legal.html"];
let fallos = 0;
const ok = (n, c, extra) => { if (!c) fallos++; console.log(`${c ? "✓" : "✗"} ${n}${!c && extra !== undefined ? "  " + JSON.stringify(extra).slice(0, 400) : ""}`); };

// ── Archivos del vídeo
const V = (f) => path.join(RAIZ, "video", f);
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const dims = (f) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name", "-of", "csv=p=0", f]).toString().trim();
for (const f of ["hereda-demo.mp4", "hereda-demo.webm", "hereda-demo-poster.jpg", "hereda-demo-poster-1600.webp", "hereda-demo-poster-960.webp", "hereda-demo-vertical.mp4"]) ok(`video/${f} existe`, existsSync(V(f)));
if (existsSync(V("hereda-demo.mp4"))) {
  const mb = statSync(V("hereda-demo.mp4")).size / 1048576, d = dur(V("hereda-demo.mp4"));
  ok(`MP4 horizontal: ${dims(V("hereda-demo.mp4"))}, ${d.toFixed(1)} s, ${mb.toFixed(2)} MB (≤ 12 MB, 75-100 s, H.264 1920x1080)`, mb <= 12 && d >= 75 && d <= 100 && /^h264,1920,1080/.test(dims(V("hereda-demo.mp4"))));
}
if (existsSync(V("hereda-demo-vertical.mp4"))) { const d = dur(V("hereda-demo-vertical.mp4")); ok(`MP4 vertical: ${dims(V("hereda-demo-vertical.mp4"))}, ${d.toFixed(1)} s (1080x1920, unos 30 s)`, /^h264,1080,1920/.test(dims(V("hereda-demo-vertical.mp4"))) && d >= 27 && d <= 33); }

const b = await chromium.launch();
for (const ancho of [1440, 390]) for (const esquema of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: ancho > 500 ? 900 : 844 }, colorScheme: esquema, reducedMotion: "reduce" });
  const pg = await ctx.newPage(); const ajenas = new Set(); const errores = [];
  pg.on("request", (r) => { const u = new URL(r.url()); if (!/^(data|blob):/.test(r.url()) && u.origin !== new URL(BASE).origin) ajenas.add(u.origin); });
  pg.on("pageerror", (e) => errores.push(e.message)); pg.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 160)); });
  for (const p of PAGINAS) {
    await pg.goto(BASE + p, { waitUntil: "load" }); await pg.waitForTimeout(250);
    await pg.evaluate(() => document.querySelectorAll(".rv").forEach((e) => e.classList.add("in")));
    await pg.addScriptTag({ content: AXE });
    const r = await pg.evaluate(async (tags) => { const r = await axe.run(document, { runOnly: { type: "tag", values: tags } }); return r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0].target.join(" ")})`); }, TAGS);
    const ancho2 = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`${p || "index.html"} · ${ancho} px · ${esquema}: axe sin infracciones, sin desplazamiento horizontal`, !r.length && ancho2 <= 0, { axe: r, sobra: ancho2 });
  }
  ok(`${ancho} px · ${esquema}: sin peticiones a otros dominios ni errores de consola`, !ajenas.size && !errores.length, { ajenas: [...ajenas], errores });
  await ctx.close();
}

// ── Portada: contenido y llamadas a la acción
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage();
  await pg.goto(BASE, { waitUntil: "load" });
  const D = await pg.evaluate(() => {
    const vis = document.body.innerText;
    const a = (t) => [...document.querySelectorAll("a")].filter((e) => e.textContent.trim() === t).map((e) => e.getAttribute("href"));
    return { marcadores: (vis.match(/\[[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{2,}[^\]]*\]/g) || []), probar: a("Probar 30 días"), hablar: a("Hablar con nosotros"),
      secciones: [...document.querySelectorAll("main section[id]")].map((s) => s.id), precios: /49 €/.test(vis) && /59 €/.test(vis) && /129 €/.test(vis) && /249 €/.test(vis) && /31 de diciembre de 2026/.test(vis),
      faq: [...document.querySelectorAll(".faq summary")].map((s) => s.textContent), h1: document.querySelector("h1").textContent,
      lcp: document.querySelector("#demo img")?.getAttribute("fetchpriority"), video: (() => { const v = document.querySelector("#demo video"); return v && { preload: v.getAttribute("preload"), muted: v.muted, src: v.currentSrc || v.querySelector("source")?.src || "" }; })() };
  });
  ok("portada: sin marcadores de datos pendientes visibles", !D.marcadores.length, D.marcadores);
  ok("«Probar 30 días» lleva a /app/ (cabecera, portada, precios y cierre)", D.probar.length >= 3 && D.probar.every((h) => h === "/app/"), D.probar);
  ok("«Hablar con nosotros» lleva a contratar.html", D.hablar.length >= 2 && D.hablar.every((h) => /contratar\.html/.test(h)), D.hablar);
  ok("secciones: cómo funciona, cifras, comparativa, seguridad, precios, preguntas", ["como", "cifras", "comparativa", "seguridad", "precios", "preguntas"].every((s) => D.secciones.includes(s)), D.secciones);
  ok("precios: 59, 129, 249 y Fundador 49 € hasta el 31-12-2026", D.precios);
  ok("preguntas: instalación, datos, varios ordenadores, IA, soporte y contrato", ["instalar", "guardan", "varios ordenadores", "inteligencia artificial", "soporte", "contrato"].every((k) => D.faq.some((q) => q.toLowerCase().includes(k))), D.faq);
  ok("vídeo: póster como imagen prioritaria y vídeo sin cargar al principio (preload=none, silenciado)", D.lcp === "high" && D.video && D.video.preload === "none" && D.video.muted && !D.video.src, D.video);
  // Tras la carga, en escritorio, el vídeo empieza solo y el botón lo pausa
  const empieza = await pg.waitForFunction(() => { const v = document.querySelector("#demo video"); return v && !v.paused && v.currentTime > 4.5 && document.getElementById("demo").classList.contains("on"); }, null, { timeout: 20000 }).then(() => true, () => false);
  ok("escritorio: el vídeo se carga después de la página y se reproduce solo, desde después de la tarjeta de título", empieza);
  await pg.click("#demo .vctl"); await pg.waitForTimeout(200);
  const pausa = await pg.evaluate(() => ({ p: document.querySelector("#demo video").paused, t: document.querySelector("#demo .vctl").textContent, a: document.querySelector("#demo .vctl").getAttribute("aria-pressed") }));
  ok("botón «Pausar el vídeo»: lo pausa y cambia a «Seguir el vídeo»", pausa.p && /Seguir/.test(pausa.t) && pausa.a === "false", pausa);
  await ctx.close();
  for (const [n, o] of [["móvil (390 px)", { viewport: { width: 390, height: 844 } }], ["«reducir movimiento»", { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }]]) {
    const c = await b.newContext(o); const p = await c.newPage(); const pedidos = []; p.on("request", (r) => { if (/\.(mp4|webm)$/.test(r.url())) pedidos.push(r.url()); });
    await p.goto(BASE, { waitUntil: "load" }); await p.waitForTimeout(2500);
    const s = await p.evaluate(() => ({ paused: document.querySelector("#demo video").paused, boton: document.querySelector("#demo .vctl").textContent, visible: !document.querySelector("#demo .vctl").hidden }));
    if (existsSync(V("hereda-demo.mp4"))) { const d = Math.round(dur(V("hereda-demo.mp4"))), et = `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`; ok(`${n}: el botón dice la duración real del vídeo (${et})`, s.boton.includes(et), s.boton); }
    ok(`${n}: el vídeo no se descarga ni se reproduce solo; hay botón «Ver el vídeo»`, s.paused && !pedidos.length && s.visible && /Ver el vídeo/.test(s.boton), { ...s, pedidos });
    await c.close();
  }
}
await b.close();
console.log(fallos ? `\n${fallos} comprobaciones fallidas` : "\nWeb pública: todo correcto");
process.exit(fallos ? 1 : 0);
