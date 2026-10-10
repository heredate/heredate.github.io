// Prueba de navegador de la experiencia de uso (ronda 3 del control de calidad): historial del navegador y borrador del asistente (I9),
// documentos de dos herencias en el lector (I5), errores del lector en español (M7), foco y teclado en las hojas (M9), «Salir» del
// asistente (M10), bienvenida (M16), nombre de despacho largo en el PDF (K1), contadores (K4), cronómetro y barra en móvil (K5),
// <title> en <head> (K6), avisos de Tesseract en la consola (K7) y calendario .ics (M12).
// Uso: servir la raíz del repositorio (python3 -m http.server 8793), generar los ejemplos (node tools/ejemplos/generar.mjs) y ejecutar
//   node tools/qa/experiencia.mjs [url]
// Sale con código 1 si algo falla. Necesita Playwright con Chromium (PLAYWRIGHT=/ruta/a/playwright/index.mjs si no está en /opt/node-tools).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const URL_APP = process.argv[2] || "http://127.0.0.1:8793/app/";
const RAIZ = URL_APP.replace(/app\/?$/, "");
const EJ = new URL("../ejemplos/salida/", import.meta.url).pathname;
let ok = 0, ko = 0;
const check = (n, cond, extra = "") => { if (cond) ok++; else ko++; console.log(`${cond ? "✔" : "✘"} ${n}${!cond && extra !== "" ? " · " + (typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 400) : ""}`); };
const b = await chromium.launch();
const errores = [], consola = [], dialogos = [];
async function pagina(opc = {}) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true, ...opc });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => { consola.push(m.text()); if (m.type() === "error" && !/favicon|service worker|sw\.js/i.test(m.text())) errores.push(m.text()); });
  p.on("dialog", (d) => { dialogos.push(d.type() + ": " + d.message()); d.accept(); });
  const ev = (f, a) => p.evaluate(f, a), w = (ms = 300) => p.waitForTimeout(ms);
  return { ctx, p, ev, w };
}
const saltarBienvenida = (ev) => ev(() => { if (document.querySelector(".bv-over")) bvSaltar(); });
const listaCaso = (c) => fs.readdirSync(EJ + c).filter((f) => !/LEEME/.test(f)).sort().map((f) => EJ + c + "/" + f);

// ── K6 · <title> en <head> ──
{
  const html = await (await fetch(URL_APP)).text();
  const ih = html.indexOf("</head>"), ib = html.indexOf("<body"), it = html.indexOf("<title>");
  check("K6 · <title> dentro de <head> (y no en <body>)", it > 0 && it < ih && !/<title>/.test(html.slice(ib, html.indexOf("<script", ib))));
}

// ── I9 · Historial del navegador ──
{
  const { p, ev, w } = await pagina();
  await p.goto(RAIZ); await w(300);
  await p.goto(URL_APP); await w(900); await saltarBienvenida(ev);
  await ev(() => pkClick({ act: "ejemplos" })); await w(400);
  await p.click(".side [data-open]"); await w(400);
  const id = await ev(() => ui.id);
  await p.click('.secnav [data-sec="impuestos"]'); await w(300);
  check("I9 · la URL dice dónde se está", /#\/expediente\/[^/]+\/impuestos$/.test(p.url()), p.url());
  await p.goBack(); await w(400);
  check("I9 · Atrás: de Impuestos al Resumen del mismo expediente", await ev((id) => ui.vista === "exp" && ui.id === id && ui.sec === "resumen", id) && p.url().includes("/app/"));
  await p.goBack(); await w(400);
  check("I9 · Atrás otra vez: a la cartera, sin salir de la aplicación", await ev(() => ui.vista === "inicio") && p.url().includes("/app/"), p.url());
  await p.goForward(); await w(400); await p.goForward(); await w(400);
  check("I9 · Adelante: vuelve al expediente y a Impuestos", await ev((id) => ui.vista === "exp" && ui.id === id && ui.sec === "impuestos", id));
  await p.reload(); await w(1300);
  check("I9 · recargar deja en la misma pantalla", await ev((id) => ui.vista === "exp" && ui.id === id && ui.sec === "impuestos", id));
  // Hojas: Atrás cierra la ficha sin salir del expediente; cerrar con «Hecho» no deja una entrada de más
  await p.click('.secnav [data-sec="herencia"]'); await w(300);
  await p.click("button[data-editp]"); await w(400);
  check("I9 · ficha de persona abierta", await ev(() => ui.sheet && ui.sheet.tipo === "persona"));
  await p.goBack(); await w(400);
  check("I9 · Atrás cierra la ficha y se queda en Herederos y bienes", await ev(() => !ui.sheet && ui.vista === "exp" && ui.sec === "herencia"));
  await p.click("button[data-editp]"); await w(300); await p.click('.sheet [data-act="cerrarSheet"]'); await w(500);
  await p.goBack(); await w(400);
  check("I9 · tras cerrar la ficha con «Hecho», Atrás va a la pantalla anterior (no reabre la ficha)", await ev(() => !ui.sheet && ui.vista === "exp" && ui.sec === "impuestos"));

  // ── M9 · teclado en las hojas ──
  await p.click('.secnav [data-sec="herencia"]'); await w(300);
  await p.focus("button[data-editp]"); const pid = await ev(() => document.activeElement.dataset.editp);
  await p.keyboard.press("Enter"); await w(400);
  check("M9 · al abrir la ficha con Enter, el foco entra en ella", await ev(() => !!document.activeElement.closest(".sheet")));
  check("M9 · lo de detrás queda inerte", await ev(() => !!document.querySelector("#app > .shell[inert]")));
  let fuera = 0; for (let i = 0; i < 45; i++) { await p.keyboard.press("Tab"); if (!(await ev(() => !!document.activeElement.closest(".sheet")))) fuera++; }
  for (let i = 0; i < 5; i++) { await p.keyboard.press("Shift+Tab"); if (!(await ev(() => !!document.activeElement.closest(".sheet")))) fuera++; }
  check("M9 · Tab y Mayús+Tab no salen de la ficha", fuera === 0, fuera + " veces fuera");
  await p.keyboard.press("Escape"); await w(400);
  check("M9 · Escape cierra la ficha y el foco vuelve a quien la abrió", await ev((pid) => !ui.sheet && document.activeElement.dataset.editp === pid, pid));

  // ── I9 · asistente: Atrás por los pasos, recarga, borrador y salida ──
  await p.click('.side [data-act="nuevo"]'); await w(300);
  await p.click('[data-act="siguiente"]'); await w(300);
  await p.fill("#f-cli", "Cliente a medias"); await p.click('[data-act="siguiente"]'); await w(300);
  await p.fill("#f-nombre", "Causante de prueba"); await p.click('[data-act="siguiente"]'); await w(300);
  await p.goBack(); await w(400);
  check("I9 · asistente: Atrás del navegador vuelve un paso, con lo escrito", await ev(() => ui.vista === "asist" && ui.paso === 2 && document.querySelector("#f-nombre").value === "Causante de prueba"));
  await p.reload(); await w(1300);
  check("I9 · asistente: recargar a medias no pierde nada", await ev(() => ui.vista === "asist" && ui.paso === 2 && document.querySelector("#f-nombre")?.value === "Causante de prueba"));
  check("I9 · sin preguntas al recargar (no se perdía nada)", !dialogos.length, dialogos);
  await p.goBack(); await w(350); await p.goBack(); await w(350); await p.goBack(); await w(600);
  check("I9 · Atrás desde el primer paso sale del asistente a la pantalla de antes, dentro de la app", await ev(() => ui.vista === "exp" && ui.sec === "herencia") && p.url().includes("/app/"), p.url());
  check("I9 · el borrador queda guardado y se avisa", await ev(() => DB.borradorAsist?.b?.despacho?.cliente === "Cliente a medias") && /Borrador guardado/.test(await ev(() => document.querySelector(".toast")?.textContent || "")));
  await p.click('.side [data-act="home"]'); await w(400);
  check("I9 · la cartera ofrece retomarlo", /Cliente a medias/.test(await ev(() => document.querySelector(".as-aviso")?.innerText || "")));
  await p.click('.side [data-act="nuevo"]'); await w(400);
  check("I9 · «Nuevo expediente» también lo ofrece", await ev(() => !!document.querySelector('.as-borr [data-act="asRetomar"]')));
  await p.click('.as-borr [data-act="asRetomar"]'); await w(400);
  check("I9 · Retomarlo vuelve al asistente con los datos", await ev(() => ui.vista === "asist" && ui.paso === 1 && document.querySelector("#f-cli").value === "Cliente a medias" && ui.borrador.nombre === "Causante de prueba"), await ev(() => [ui.vista, ui.paso]));
  // ── M10 · «Salir» en todos los pasos ──
  let sinSalir = [];
  await ev(() => { const x = ui.borrador; x.fecha = "2026-05-10"; x.ccaa = "AND"; x.civil = "viudo"; x.testamento = "no"; nuevaPersona(x, "hijo"); x.personas[0].nombre = "Hijo"; x.personas[0].edad = 40; nuevoBien(x, "cuenta"); x.bienes[0].valor = 50000; ui.sheet = null; go({ paso: 1 }); });
  for (let i = 1; i < 12; i++) { await w(120); if (!(await p.locator(".wiz .wiz-salir").isVisible())) sinSalir.push(i); if (i < 11) await p.click('[data-act="siguiente"]'); }
  check("M10 · «Salir» visible en los 11 pasos", !sinSalir.length, sinSalir);
  await p.click('[data-act="terminar"]'); await w(900);
  check("I9 · «Abrir el expediente» abre el expediente creado", await ev(() => ui.vista === "exp" && exp()?.despacho?.cliente === "Cliente a medias" && !DB.borradorAsist));
  await p.goBack(); await w(600);
  check("I9 · Atrás desde el expediente nuevo no vuelve a los pasos del asistente terminado", await ev(() => ui.vista !== "asist"), await ev(() => [ui.vista, ui.paso]));
  // Salir en un clic, con Escape y desde el paso 5
  await ev(() => go({ vista: "agenda", sheet: null })); await w(300);
  await p.click('.side [data-act="nuevo"]'); await w(300); await p.click('[data-act="siguiente"]'); await w(200); await p.fill("#f-cli", "Otro"); for (let i = 0; i < 4; i++) { await ev(() => { const x = ui.borrador; x.fecha = x.fecha || "2026-05-10"; x.ccaa = x.ccaa || "MAD"; }); await p.click('[data-act="siguiente"]'); await w(150); }
  const vistaAntes = "agenda";
  await p.click(".wiz-salir"); await w(900);
  check("M10 · «Salir» desde el paso 5 vuelve en un clic a donde se estaba", await ev((v) => ui.vista === v, vistaAntes));
  await p.click('.side [data-act="nuevo"]'); await w(300);
  await p.click('.as-borr [data-act="asRetomar"]'); await w(300);
  await p.keyboard.press("Escape"); await w(900);
  check("M9 · Escape sale del asistente (guardando el borrador)", await ev(() => ui.vista !== "asist" && DB.borradorAsist?.b?.despacho?.cliente === "Otro"));
  await p.click('.side [data-act="home"]'); await w(300); await p.click('.as-aviso [data-act="asDescartar"]'); await w(300);
  check("I9 · el borrador se puede descartar", await ev(() => !DB.borradorAsist && !document.querySelector(".as-aviso")));

  // ── K4 · contadores ──
  await ev(() => go({ vista: "inicio", sheet: null })); await w(300);
  await ev(() => go({ vista: "exp", id: DB.expedientes.find((x) => x.ejemplo !== undefined || true).id, sec: "resumen", sheet: null }));
  const k0 = await ev(() => [...document.querySelectorAll(".kpi b")].map((n) => n.textContent));
  await w(1300);
  const k1 = await ev(() => [...document.querySelectorAll(".kpi b")].map((n) => n.textContent));
  check("K4 · los importes de la cabecera no pasan por cifras intermedias", k0.filter((s) => /€/.test(s)).join("|") === k1.filter((s) => /€/.test(s)).join("|") && k1.some((s) => /€/.test(s)), [k0, k1]);

  // ── M12 · calendario .ics ──
  await ev(() => go({ vista: "agenda", sheet: null })); await w(300);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click('.page [data-act="ics"]')]);
  const ics = fs.readFileSync(await dl.path());
  const txt = ics.toString("utf8"), lineas = txt.split("\r\n");
  check("M12 · .ics con CRLF en todas las líneas (también la última)", !/[^\r]\n/.test(txt) && txt.endsWith("\r\n"));
  check("M12 · ninguna línea pasa de 75 octetos", lineas.every((l) => Buffer.byteLength(l) <= 75), Math.max(...lineas.map((l) => Buffer.byteLength(l))));
  const desplegado = txt.replace(/\r\n /g, "");
  check("M12 · al desplegar las líneas, los acentos y el texto quedan intactos", !desplegado.includes("�") && /SUMMARY:.+·/.test(desplegado) && lineas.some((l) => l.startsWith(" ")));

  // ── K1 · nombre de despacho muy largo en el informe PDF ──
  const largo = "Bufete Jurídico Internacional de Sucesiones, Herencias, Testamentarías y Derecho de Familia Hermanos Fernández-Villaverde y Asociados, S.L.P.";
  await ev((n) => { despachoCfg().nombre = n; despachoCfg().localidad = "Málaga"; }, largo);
  const solapes = await ev(async () => {
    let bytes = null; const orig = window.pdfDescargar; window.pdfDescargar = (n, b) => { bytes = b; };
    try { pdfInforme(DB.expedientes.find((x) => calcular(x))); } finally { window.pdfDescargar = orig; }
    const pdf = await lecPdfLib(); const doc = await pdf.getDocument({ data: bytes }).promise; const out = [];
    for (const n of [1, 2]) {
      const pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
      const it = tc.items.filter((i) => i.str.trim()).map((i) => ({ s: i.str, x0: i.transform[4], x1: i.transform[4] + i.width, y: i.transform[5], h: Math.abs(i.transform[3]) }));
      const zona = it.filter((i) => i.y > vp.height - 150 || i.y < 60);
      for (const a of zona) { if (a.x1 > vp.width - 40) out.push(`p${n} sale del margen: ${a.s}`); for (const c of zona) if (a !== c && Math.abs(a.y - c.y) < Math.min(a.h, c.h) * 0.8 && a.x0 < c.x0 && a.x1 > c.x0 + 1) out.push(`p${n} «${a.s.slice(0, 30)}» pisa «${c.s.slice(0, 30)}»`); }
    }
    return out;
  });
  check("K1 · el nombre largo del despacho no pisa la referencia, la fecha ni la paginación", !solapes.length, solapes);
  await ev(() => { despachoCfg().nombre = ""; });
  await p.context().close();
}

// ── M16 · bienvenida: «Abrir el asistente» abre el asistente ──
{
  const { p, ev, w } = await pagina();
  await p.goto(URL_APP); await w(1000);
  const hay = await ev(() => !!document.querySelector(".bv-over"));
  if (!hay) await ev(() => bvAbrir()), await w(400);
  await ev(() => { BV.camino = "real"; bvIr(BV_PASOS.length - 1); }); await w(300);
  const txt = await ev(() => document.querySelector('[data-bv="fin"]')?.textContent || "");
  await p.click('[data-bv="fin"]'); await w(900);
  check("M16 · «Abrir el asistente» abre el asistente (no la guía)", /Abrir el asistente/.test(txt) && await ev(() => ui.vista === "asist" && !(typeof GU === "object" && GU.id)), txt);
  check("M16 · la guía «Tu primer expediente» se ofrece aparte", await ev(() => !!document.querySelector('.wiz-guia [data-gu="abrir"][data-gu-v="primer"]')));
  await p.click('.wiz-guia [data-gu="abrir"]'); await w(1500);
  check("M16 · y desde ahí arranca la guía, ya dentro del asistente", await ev(() => GU.id === "primer" && GU.i >= 1 && ui.vista === "asist"));
  await ev(() => guCerrar());
  await p.context().close();
}

// ── K5 · móvil y zoom al 200 % ──
for (const [n, vp] of [["zoom 200 %", { width: 683, height: 400 }], ["móvil 390", { width: 390, height: 844 }]]) {
  const { p, ev, w } = await pagina({ viewport: vp });
  await p.goto(URL_APP); await w(900); await saltarBienvenida(ev);
  await ev(() => { demoCargar(); go({ vista: "exp", id: DB.expedientes[0].id, sec: "tramites", sheet: null }); }); await w(600);
  const vis = () => ev(() => { const r = document.getElementById("tm-root"), t = document.querySelector(".tabbar"); return { fab: !!r && !r.hidden && getComputedStyle(r).visibility !== "hidden", tab: t ? t.getBoundingClientRect().top < innerHeight - 5 : false }; });
  const v0 = await vis();
  await p.mouse.wheel(0, 500); await w(450);
  const v1 = await vis();
  await p.mouse.wheel(0, -200); await w(450);
  const v2 = await vis();
  check(`K5 · ${n}: al bajar se retira el cronómetro flotante${vp.height < 560 ? " y la barra de pestañas" : ""}; al subir vuelven`, v0.fab && !v1.fab && v2.fab && v0.tab && (vp.height < 560 ? !v1.tab : v1.tab) && v2.tab, [v0, v1, v2]);
  check(`K5 · ${n}: lo enfocado con el teclado no queda bajo la barra fija`, await ev(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) >= 100));
  await p.context().close();
}

// ── I5, M7 y K7 · lector de documentos ──
const leer = async (p, w, files) => { await p.click('[data-act="lecNuevo"]'); await w(300); await p.setInputFiles("input[data-lecnuevo]", files); await p.waitForSelector(".lec-sheet .lec-row, .lec-sheet .empty, .lec-mezcla", { timeout: 300000 }); await w(300); };
if (fs.existsSync(EJ + "caso1-testamento-malaga")) {
  const files = [...listaCaso("caso1-testamento-malaga").slice(0, 12), ...listaCaso("caso2-intestada-torremolinos").slice(0, 8)];
  {
    const { p, ev, w } = await pagina();
    await p.goto(URL_APP); await w(900); await saltarBienvenida(ev);
    const c0 = consola.length;
    await leer(p, w, files);
    const t = await ev(() => document.querySelector(".lec-mezcla")?.innerText || "");
    check("I5 · documentos de dos herencias: aviso claro con los dos causantes", /dos herencias distintas/.test(t) && /Antonio Jiménez Soler/.test(t) && /María Dolores Ruiz Cano/.test(t), t.slice(0, 300));
    check("I5 · no se puede cargar todo junto sin decidir", await ev(() => !document.querySelector('[data-act="lecAplicar"]') && !!document.querySelector('[data-act="lecSeparar"]') && !!document.querySelector('[data-act="lecQuitar"]')));
    check("K7 · sin avisos internos de Tesseract en la consola (dos fotos leídas)", !consola.slice(c0).some((m) => /Estimating resolution|Invalid resolution|tesseract/i.test(m)), consola.slice(c0).filter((m) => /resolution/i.test(m)).slice(0, 3));
    await p.click('[data-act="lecSeparar"]'); await w(1500);
    check("I5 · Separar: una revisión con un apartado por expediente", await ev(() => document.querySelectorAll(".lec-dest").length === 2 && DB.expedientes.length === 2));
    await p.click('[data-act="lecAplicar"]'); await w(1200);
    const E = await ev(() => DB.expedientes.map((x) => ({ n: x.nombre, cony: (x.personas || []).filter((q) => q.relacion === "conyuge").length, docs: ARCH.lista.filter((d) => d.expId === x.id).length, p: (x.personas || []).length })));
    check("I5 · cada herencia en su expediente, con sus documentos y un solo cónyuge como mucho", E.length === 2 && E.some((e) => e.n === "Antonio Jiménez Soler") && E.some((e) => e.n === "María Dolores Ruiz Cano") && E.every((e) => e.cony <= 1 && e.docs >= 6), E);
    await p.context().close();
  }
  {
    const { p, ev, w } = await pagina();
    await p.goto(URL_APP); await w(900); await saltarBienvenida(ev);
    await leer(p, w, files);
    await p.click('[data-act="lecQuitar"]'); await w(1500);
    const r = await ev(() => ({ docs: LEC.resultado.docs.length, mezcla: !!document.querySelector(".lec-mezcla"), arch: ARCH.lista.filter((d) => d.expId === LEC.exp).length }));
    check("I5 · Quitar: fuera los documentos de la otra herencia (también del archivo del expediente)", !r.mezcla && r.docs >= 12 && r.docs < 20 && r.arch === r.docs, r);
    await p.context().close();
  }
} else check("I5 · ejemplos generados (node tools/ejemplos/generar.mjs)", false);
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hereda-exp-"));
  fs.writeFileSync(path.join(dir, "vacio.pdf"), "");
  fs.writeFileSync(path.join(dir, "roto.pdf"), "%PDF-1.4\n%garbage\n1 0 obj << /Type /Catalog >>\ntrailer\n%%EOF");
  fs.writeFileSync(path.join(dir, "foto-rota.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const { p, ev, w } = await pagina();
  await p.goto(URL_APP); await w(900); await saltarBienvenida(ev);
  await leer(p, w, ["vacio.pdf", "roto.pdf", "foto-rota.jpg"].map((f) => path.join(dir, f)));
  const t = await ev(() => document.querySelector(".lec-sheet")?.innerText || "");
  check("M7 · archivos dañados: el lector lo dice en español, sin mensajes en inglés", !/Invalid PDF|password given|could not be decoded|is empty, i\.e\.|\bthe\b/i.test(t) && /No se pudo leer|dañad|vacío/i.test(t), t.split("\n").filter((l) => /leer|PDF|imagen/i.test(l)).slice(0, 6));
  await p.context().close();
}

check("Sin errores de JavaScript", !errores.length, errores.slice(0, 5));
await b.close();
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
