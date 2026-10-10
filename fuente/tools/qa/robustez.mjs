// Prueba de navegador de la robustez de los datos, el rendimiento con muchos expedientes y la carga bajo demanda (informe de QA 7-10-2026:
// C1, I1-I4, I10, I11, M1-M6, M14 y rendimiento móvil). Se puede repetir: cada bloque parte de un navegador limpio.
// Uso: servir la raíz del repositorio con la app construida (python3 src/build.py; python3 -m http.server 8791) y ejecutar desde la raíz:
//   node tools/qa/robustez.mjs [url=http://127.0.0.1:8791/app/] [--rapido]   (--rapido: sin las pruebas de 200 y 700 expedientes)
// Sale con código 1 si algo falla. Necesita Playwright con Chromium (PLAYWRIGHT=/ruta/a/playwright/index.mjs si no está en /opt/node-tools).
import fs from "node:fs";
import path from "node:path";
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const args = process.argv.slice(2);
const URL_APP = args.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8791/app/";
const RAPIDO = args.includes("--rapido");
const RAIZ = path.resolve(new URL("../../", import.meta.url).pathname);
let ok = 0, ko = 0;
const check = (n, c, extra = "") => { if (c) ok++; else ko++; console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + extra : ""}`); };
const b = await chromium.launch();
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "hp-rb-"));

async function pagina(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true, ...(opts.ctx || {}) });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  if (opts.reloj) await p.clock.install({ time: opts.reloj });
  await p.goto(opts.url || URL_APP); await p.waitForTimeout(900);
  await p.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); });
  const ev = (f, a) => p.evaluate(f, a), w = (ms = 250) => p.waitForTimeout(ms);
  const toast = () => p.evaluate(() => document.querySelector(".toast")?.textContent || "");
  return { ctx, p, ev, w, errores, toast };
}
const BASE = { personas: [{ id: "p1", nombre: "Ana", relacion: "hijo", edad: 40 }], bienes: [{ id: "b1", tipo: "cuenta", valor: 1000 }], deudas: [], gastos: [], fecha: "2026-03-01", ccaa: "AND", civil: "viudo", testamento: "no" };

// ── C1 · Expedientes dañados: nunca dejan la app en blanco (arranque, importar, restaurar) ──
{
  const { ctx, p, ev, w, errores, toast } = await pagina();
  await ev(() => { for (const k of ["mad", "and"]) DB.expedientes.unshift(prepararEjemplo(k)); guardar(); });
  await ev((B) => { const D = [{ ...B, id: "d-fecha", fecha: "2026-99-99" }, { ...B, id: "d-ccaa", ccaa: "XXX" }, { ...B, id: "d-null", bienes: [null] }, { ...B, id: "d-pers", personas: "x" },
    { ...B, id: "d-rel", personas: [{ id: "p1", nombre: "A", relacion: "" }] }, { ...B, id: "d-tipo", bienes: [{ id: "b1", tipo: "nave", valor: 1 }] }, "basura", { ...B }];
    const o = JSON.parse(localStorage.getItem("cauce.v1")); o.expedientes.push(...D); localStorage.setItem("cauce.v1", JSON.stringify(o)); }, BASE);
  await p.reload(); await w(1500);
  const r = await ev(() => ({ n: DB.expedientes.length, dan: (DB.danados || []).map((d) => d.id), aviso: !!document.querySelector(".rb-danados"), tabla: !!document.querySelector(".kpis"), err: !!document.querySelector(".rb-error"), nulo: DB.expedientes.find((x) => x.id === "d-null")?.bienes.length ?? -1 }));
  check("C1 · tras recargar, la cartera se pinta con los sanos", r.tabla && !r.err && r.n === 4, JSON.stringify(r));
  check("C1 · fecha, comunidad, personas, parentesco y tipo imposibles: apartados", ["d-fecha", "d-ccaa", "d-pers", "d-rel", "d-tipo"].every((i) => r.dan.includes(i)) && r.aviso, JSON.stringify(r.dan));
  check("C1 · lo que se arregla sin perder nada se arregla solo (bien null, sin id)", r.nulo === 0 && r.dan.length === 6, JSON.stringify(r));
  for (const s of ["resumen", "herencia", "impuestos", "particion", "tramites", "documentos", "diagnostico"]) await ev((s) => go({ vista: "exp", id: "d-null", sec: s }), s);
  await ev(() => { go({ vista: "radar" }); go({ vista: "agenda" }); go({ vista: "inicio", id: null, sheet: { tipo: "ajustes" } }); }); await w(200);
  check("C1 · Ajustes, Mi día y Agenda se abren", await ev(() => !!document.querySelector(".sheet") && !document.querySelector(".rb-error")));
  await ev(() => { ui.sheet = null; render(); });
  await p.click('[data-rb="reparar"][data-id="d-fecha"]'); await w(400);
  check("C1 · Reparar: vuelve a la cartera, fecha vacía y anotado en la bitácora", await ev(() => ui.id === "d-fecha" && exp().fecha === "" && /reparado/i.test(exp().bitacora[0].texto)));
  await ev(() => go({ vista: "inicio", id: null }));
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click('[data-rb="exportar"][data-id="d-ccaa"]')]);
  const exp1 = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check("C1 · Exportar el dañado tal cual", exp1.tipo === "expediente" && exp1.expediente.ccaa === "XXX" && exp1.danado.problemas.length === 1);
  await p.click('[data-rb="borrar"][data-id="d-ccaa"]'); await w(150); await p.click('[data-rb="borrarSi"]'); await w(400);
  check("C1 · Borrar el dañado (con confirmación)", await ev(() => !(DB.danados || []).some((d) => d.id === "d-ccaa")));
  // Importar un expediente dañado: se sanea al entrar
  const f = path.join(tmp, "imp.hereda.json"); fs.writeFileSync(f, JSON.stringify({ app: "hereda+", tipo: "expediente", expediente: { ...BASE, id: "imp1", fecha: "2026-99-99", ccaa: "XXX", bienes: [null, { id: "b1", tipo: "nave", valor: "1.000 €" }], personas: [{ id: "p1", nombre: "B", relacion: "primo segundo", edad: "abc" }] } }));
  await ev(() => { ui.sheet = { tipo: "ajustes" }; render(); }); await w(200);
  await p.setInputFiles('input[data-sgf="restaurar"]', f); await w(900);
  const im = await ev(() => { const x = DB.expedientes.find((q) => q.id === "imp1"); return x && { fecha: x.fecha, ccaa: x.ccaa, nb: x.bienes.length, tipo: x.bienes[0].tipo, rel: x.personas[0].relacion, edad: x.personas[0].edad, bit: x.bitacora.some((e) => /corrigieron/.test(e.texto)) }; });
  check("C1 · importar: fecha, comunidad, listas, parentesco, tipo y edad saneados, con nota", im && im.fecha === "" && im.ccaa === "" && im.nb === 1 && im.tipo === "otro" && im.rel === "extrano" && im.edad === "" && im.bit, JSON.stringify(im));
  await p.reload(); await w(1200);
  check("C1 · y la recarga sigue bien", await ev(() => !!document.querySelector(".side") && !document.querySelector(".rb-error")));
  // M14 · archivos que no son de Hereda+
  for (const [n, t] of [["null", "null"], ["arr", "[]"], ["obj", "{}"], ["num", "123"], ["txt", "hola"]]) {
    const g = path.join(tmp, n + ".json"); fs.writeFileSync(g, t);
    await ev(() => { document.querySelectorAll(".toast").forEach((q) => q.remove()); ui.sheet = { tipo: "ajustes" }; render(); }); await w(150);
    await p.setInputFiles('input[data-sgf="restaurar"]', g); await w(500);
    const tt = await toast();
    check(`M14 · importar «${t}» → «no es de Hereda+» (o no es una copia)`, /no es (de|una copia de) Hereda\+/.test(tt), tt);
  }
  // Pantalla de error en lugar de página en blanco
  await ev(() => { window.__vh = vHome; window.vHome = () => { throw new Error("prueba"); }; ui.sheet = null; go({ vista: "inicio", id: null }); });
  check("C1 · si algo falla al pintar, pantalla con salidas (no en blanco)", await ev(() => !!document.querySelector(".rb-error [data-rb=copia]")));
  await ev(() => { window.vHome = window.__vh; go({ vista: "inicio" }); });
  check("C1 · sin errores de JavaScript sin capturar", !errores.length, errores.slice(0, 3).join(" | "));
  await ctx.close();
}

// ── I1, I2, M1 · importes, edades y porcentajes escritos a mano ──
{
  const { ctx, p, ev, w } = await pagina();
  const id = await ev(() => { const n = prepararEjemplo("mad"); DB.expedientes.unshift(n); guardar(); return n.id; });
  const X = await ev((id) => { const x = DB.expedientes.find((q) => q.id === id); return { b: x.bienes[0].id, p: x.personas.find((q) => q.relacion === "hijo").id }; }, id);
  await ev(([id, b]) => go({ vista: "exp", id, sec: "herencia", sheet: { tipo: "bien", id: b } }), [id, X.b]); await w(300);
  for (const [v, n] of [["182.400 €", 182400], ["182 400", 182400], ["182.400,00 €", 182400], ["1.234,56", 1234.56]]) {
    await p.fill("#b-v", v); await p.press("#b-v", "Tab"); await w(150);
    check(`I1 · «${v}» se entiende como ${n}`, await ev(([id, b]) => num(DB.expedientes.find((q) => q.id === id).bienes.find((q) => q.id === b).valor), [id, X.b]) === n);
  }
  await p.fill("#b-v", "abc"); await p.press("#b-v", "Tab"); await w(200);
  check("I1 · «abc» avisa en el campo", await ev(() => /No se entiende/.test(document.querySelector("#b-v")?.closest(".field")?.querySelector(".f-err")?.textContent || "")));
  await ev(([id, b]) => { ui.sheet = null; render(); ui.sheet = { tipo: "bien", id: b }; render(); }, [id, X.b]); await w(200);
  check("I1 · al reabrir, el campo enseña «abc» y el aviso (no queda vacío)", await ev(() => document.querySelector("#b-v").value === "abc" && !!document.querySelector("#b-v").closest(".field").querySelector(".f-err")));
  check("I1 · 1e9 y negativos avisan", await ev(() => !!VF.importe("1e9") && /negativo/.test(VF.importe("-5000")) && /alto/.test(VF.importe("99999999999999999999")) && !VF.importe("182.400,00 €")));
  // I2 · edad
  await ev(([id, pp]) => { ui.sheet = { tipo: "persona", id: pp }; render(); }, [id, X.p]); await w(200);
  for (const v of ["abc", "-3", "150"]) {
    await p.fill("#p-e", v); await p.press("#p-e", "Tab"); await w(150);
    const r = await ev(([id, pp]) => { const x = DB.expedientes.find((q) => q.id === id), per = x.personas.find((q) => q.id === pp); const h = casoMotor(x).herederos.find((q) => q.id === pp); return { edad: per.edad, txt: per.edadTexto, motor: h.edad, menores: ctxTramites(x, calcular(x)).hayMenores, campo: document.querySelector("#p-e").value, aviso: !!document.querySelector("#p-e").closest(".field").querySelector(".f-err") }; }, [id, X.p]);
    check(`I2 · edad «${v}»: desconocida (no menor), aviso y texto conservado`, r.edad === "" && r.txt === v && r.motor === null && !r.menores && r.campo === v && r.aviso, JSON.stringify(r));
  }
  await p.fill("#p-e", "40"); await p.press("#p-e", "Tab"); await w(150);
  check("I2 · edad válida vuelve a contar", await ev(([id, pp]) => { const x = DB.expedientes.find((q) => q.id === id); return casoMotor(x).herederos.find((q) => q.id === pp).edad === 40 && !x.personas.find((q) => q.id === pp).edadTexto; }, [id, X.p]));
  // M1 · porcentaje del causante
  check("M1 · porcentaje 0 = 0 %, «abc» y vacío = 100 % con aviso en «abc»", await ev(() => pctCausante("0") === 0 && pctCausante("abc") === 100 && pctCausante("") === 100 && pctCausante("150") === 100 && !!VF.pct("abc") && !VF.pct("0")));
  check("M1 · un bien en proindiviso al 0 % no suma a la masa", await ev((id) => { const x = JSON.parse(JSON.stringify(DB.expedientes.find((q) => q.id === id))); const b = x.bienes.find((q) => q.tipo === "cuenta"); const antes = calcular(x).isd.masa.bruto; b.titularidad = "proindiviso"; b.porcentaje = "0"; return calcular(x).isd.masa.bruto < antes; }, id));
  await ctx.close();
}

// ── I3 · fecha de fallecimiento futura · M4 · fecha local · M5, M6 · referencias ──
{
  const { ctx, p, ev, w } = await pagina({ reloj: new Date("2026-10-07T22:30:00Z") }); // 00:30 del 8 de octubre en Madrid
  check("M4 · hoy() es la fecha local (00:30 del 8-10 en Madrid → 2026-10-08)", await ev(() => hoy()) === "2026-10-08", await ev(() => hoy()));
  await ev(() => { ui.borrador = { id: uid(), creado: hoy(), personas: [], bienes: [], deudas: [], gastos: [], tramites: {}, situ: {}, fase: "encargo", despacho: {}, bitacora: [] }; go({ vista: "asist", paso: PASOS.indexOf("fecha"), sheet: null }); }); await w(300);
  await p.fill("#f-fecha", "2030-01-01"); await w(200);
  check("I3 · fecha futura tecleada: «Continuar» desactivado y aviso", await ev(() => document.querySelector(".wiz .bottombar .btn").disabled && /posterior a hoy/.test(document.querySelector("#f-fecha").closest(".field").querySelector(".f-err")?.textContent || "")));
  await p.fill("#f-fecha", "2026-09-01"); await w(200);
  check("I3 · fecha pasada: se puede continuar", await ev(() => !document.querySelector(".wiz .bottombar .btn").disabled));
  await ev(() => { ui.borrador = null; go({ vista: "inicio" }); demoCargar(); render(); }); await w(300);
  check("M6 · en la demostración, la referencia nueva no sigue la numeración ficticia", await ev(() => nuevaRef()) === "EXP-2026-001", await ev(() => nuevaRef()));
  const ref = await ev(() => { const n = prepararEjemplo("and"); n.responsable = "dm-a2"; DB.expedientes.unshift(n); guardar(); return n.id; });
  await ev(() => { demoSalir(); render(); });
  check("M6 · al salir de la demostración, el responsable ficticio pasa al titular", await ev((id) => { const x = DB.expedientes.find((q) => q.id === id); return x && x.responsable !== "dm-a2" && despachoCfg().abogados.some((a) => a.id === x.responsable); }, ref));
  await ctx.close();
}
{
  const { ctx, ev, w } = await pagina();
  await ev(() => { const n = prepararEjemplo("and"); DB.expedientes.unshift(n); guardar(); for (let i = 0; i < 2; i++) { go({ vista: "exp", id: n.id }); ui.sheet = { tipo: "menu" }; render(); document.querySelector('[data-act="duplicar"]').click(); } }); await w(300);
  const refs = await ev(() => DB.expedientes.map((x) => x.despacho?.ref));
  check("M5 · duplicar (dos veces) no repite la referencia", refs.length === 3 && new Set(refs).size === refs.length, JSON.stringify(refs));
  await ctx.close();
}

// ── I4 · borrar un expediente borra sus documentos (y no salen en las copias) ──
{
  const { ctx, p, ev, w } = await pagina();
  const id = await ev(async () => { const n = prepararEjemplo("mad"); DB.expedientes.unshift(n); const m = prepararEjemplo("and"); DB.expedientes.push(m); guardar();
    await archivoGuardar([new File(["dni"], "dni.pdf", { type: "application/pdf" }), new File(["test"], "testamento.pdf", { type: "application/pdf" })], n.id, "");
    await archivoGuardar([new File(["otro"], "otro.pdf", { type: "application/pdf" })], m.id, ""); return n.id; });
  await ev((id) => { go({ vista: "exp", id }); ui.sheet = { tipo: "menu", confirmar: true }; render(); }, id); await w(200);
  check("I4 · la confirmación dice que se borran los documentos y qué pasa con las copias", await ev(() => /2 documentos adjuntos/.test(document.querySelector(".zona-peligro.conf")?.textContent || "") && /copias/.test(document.querySelector(".zona-peligro.conf").textContent)));
  await p.click('[data-act="borrarSi"]'); await w(800);
  const r = await ev(async (id) => { const L = await sgDocsTodos(); const o = await sgCopiaObjeto(); return { suyos: L.filter((d) => d.expId === id).length, otros: L.length, enCopia: o.documentos.filter((d) => d.expId === id).length }; }, id);
  check("I4 · sus documentos se borran del almacén y de las copias; los de otros, no", r.suyos === 0 && r.enCopia === 0 && r.otros === 1, JSON.stringify(r));
  await ctx.close();
}

// ── M2, M3 · solo lectura (licencia caducada) ──
{
  const { ctx, p, ev, w } = await pagina();
  const id = await ev(() => { const n = prepararEjemplo("mad"); DB.expedientes.unshift(n); DB.licencia = { primerUso: "2025-01-01" }; guardar(); return n.id; });
  await p.reload(); await w(1200);
  check("solo lectura activa", await ev(() => !licPuedeEditar()));
  await ev((id) => { const x = DB.expedientes.find((q) => q.id === id); go({ vista: "exp", id, sec: "herencia", sheet: { tipo: "persona", id: x.personas[0].id } }); }, id); await w(300);
  check("M3 · en solo lectura los campos del expediente están desactivados", await ev(() => document.querySelector("#p-e").disabled && document.querySelector("#p-n, [data-p=nombre]").disabled));
  const f = path.join(tmp, "copia.hereda.json"); fs.writeFileSync(f, JSON.stringify({ app: "hereda+", tipo: "copia", version: 5, creado: new Date().toISOString(), expedientes: [{ ...BASE, id: "nuevo-ro" }], db: {}, documentos: [] }));
  await ev(() => { ui.sheet = { tipo: "ajustes" }; render(); }); await w(200);
  await p.setInputFiles('input[data-sgf="restaurar"]', f); await w(600);
  check("M2 · al restaurar en solo lectura, «Combinar» no se ofrece (no aparenta que combina)", await ev(() => { const c = document.querySelector('.sg-opt[data-v="combinar"]'); return c && c.disabled && SG.restaurar.modo === "reemplazar" && !!document.querySelector('[data-sg="aplicar"][data-v="reemplazar"]'); }));
  await ctx.close();
}

// ── Carga bajo demanda (rendimiento móvil) y archivo único ──
{
  const { ctx, p, ev, w, errores } = await pagina();
  const ini = await ev(() => ({ cfg: !!PARTES.cfg, m: MUNI_ES.m.length, n: MUNI_ES.n, bib: BIBLIO.pendiente, calc: typeof CALCULADORA_HTML, len: document.documentElement.outerHTML.length }));
  check("Partes: la app publicada arranca sin calculadora, municipios, biblioteca ni mapas dentro", ini.cfg && (ini.m === 0 || ini.m === ini.n) && ini.len < 2.8e6, JSON.stringify(ini));
  await ev(() => { go({ vista: "biblio" }); }); await w(800);
  check("Partes: la biblioteca normativa llega al abrirla", await ev(() => !BIBLIO.pendiente && BIBLIO.estatal.length > 5 && document.querySelectorAll(".page").length > 0));
  const id = await ev(() => { const n = prepararEjemplo("est"); DB.expedientes.unshift(n); guardar(); return n.id; });
  await ev((id) => { go({ vista: "exp", id, sec: "herencia", sheet: { tipo: "bien", id: DB.expedientes[0].bienes[0].id } }); ui.muniEdit = DB.expedientes[0].bienes[0].id; render(); }, id); await w(800);
  check("Partes: los 8.132 municipios llegan al buscar uno", await ev(() => MUNI_ES.m.length === 8132 && muniBuscar("ronda malaga").length > 0));
  await ev(() => { ui.sheet = { tipo: "ajustes" }; render(); wgAbrir ? wgAbrir() : null; }).catch(() => {});
  await ev(async () => { await heredaPartes(["calculadora", "carpeta", "familia", "mapas"]); });
  check("Partes: calculadora, carpeta, cuestionario y mapas disponibles bajo demanda", await ev(() => typeof CALCULADORA_HTML === "string" && typeof CARPETA_HTML === "string" && typeof FAMILIA_HTML === "string" && !!MAPA_ES && wgHTML(wgPreset(), true).length > 400000));
  const [d1] = await Promise.all([p.waitForEvent("download"), ev((id) => descargarCuestionario(DB.expedientes.find((q) => q.id === id)), id)]);
  check("Partes: el cuestionario de la familia se descarga con los municipios", /Ronda \(Málaga\)/.test(fs.readFileSync(await d1.path(), "utf8")));
  const [d2] = await Promise.all([p.waitForEvent("download"), ev(() => enviarCopia())]);
  const copia = fs.readFileSync(await d2.path(), "utf8");
  check("Partes: «Enviar a un compañero» lleva todas las partes dentro", /CALCULADORA_HTML = "/.test(copia) && /MUNI_ES\.m = \[/.test(copia) && /BIBLIO = \{/.test(copia) && /MAPA_ES = \{/.test(copia));
  const cf = path.join(tmp, "copia.html"); fs.writeFileSync(cf, copia);
  const c2 = await pagina({ url: "file://" + cf });
  check("Partes: esa copia funciona sola (sin servidor)", await c2.ev(() => ["municipios", "biblioteca", "mapas", "carpeta", "familia", "calculadora"].every(heredaParteLista) && !!document.querySelector(".side")) && !c2.errores.length, c2.errores.join(" | "));
  await c2.ctx.close();
  const piloto = path.join(RAIZ, "dist/Hereda-piloto.html");
  const c3 = await pagina({ url: "file://" + piloto });
  check("Partes: el archivo único (Hereda-piloto.html) lo lleva todo dentro", await c3.ev(() => !PARTES.cfg && ["municipios", "biblioteca", "mapas", "carpeta", "familia", "calculadora"].every(heredaParteLista)) && !c3.errores.length, c3.errores.join(" | "));
  await c3.ctx.close();
  const sw = fs.readFileSync(path.join(RAIZ, "dist/publicar/sw.js"), "utf8");
  check("Partes: el service worker publicado las guarda para usarlas sin conexión", ["municipios", "biblioteca", "mapas", "carpeta", "familia", "calculadora"].every((n) => sw.includes(`/app/partes/${n}.js?v=`)) && fs.existsSync(path.join(RAIZ, "dist/publicar/app/partes/calculadora.js")));
  check("Partes: sin errores de JavaScript", !errores.length, errores.slice(0, 3).join(" | "));
  await ctx.close();
}

// ── I10 · 200 expedientes · I11 · más de 5 MB ──
if (!RAPIDO) {
  const { ctx, p, ev, w, errores } = await pagina();
  await ev(() => { demoCargar(); render(); }); await w(300);
  const gen = (N, pref) => ev(([N, pref]) => { const base = DB.expedientes.map((x) => JSON.parse(JSON.stringify(x))); const L = []; for (let i = 0; L.length < N; i++) { const x = JSON.parse(JSON.stringify(base[i % base.length])); x.id = pref + i; delete x.demo; x.despacho = { ...(x.despacho || {}), ref: "EXP-2026-" + String(100 + i).padStart(3, "0") }; x.nombre = (x.nombre || "C") + " " + i; L.push(x); } DB.expedientes = L; delete DB.demo; guardar(); }, [N, pref]);
  await gen(200, "perf"); await w(800);
  const tr = []; for (let k = 0; k < 2; k++) { const t = Date.now(); await p.reload({ waitUntil: "load" }); await p.waitForFunction(() => document.querySelector(".side")); tr.push(Date.now() - t); }
  await w(400);
  const t = (f) => ev(async (src) => { const f = eval(src); const v = []; for (let i = 0; i < 3; i++) { const t = performance.now(); f(); v.push(performance.now() - t); } return Math.round(Math.min(...v)); }, f.toString());
  const R = { recarga: Math.min(...tr), cartera: await t(() => go({ vista: "inicio", id: null, sheet: null })), abrir: await t(() => go({ vista: "exp", id: "perf150", sec: "resumen", sheet: null })),
    tabla: await t(() => { go({ vista: "inicio", sheet: null }); ui.cv = "tabla"; render(); }), midia: await t(() => go({ vista: "radar", sheet: null })), editar: await t(() => { const x = DB.expedientes[3]; x.bienes[0].valor = num(x.bienes[0].valor) + 1; guardar(); go({ vista: "inicio", id: null }); }) };
  console.log("  200 expedientes (ms):", JSON.stringify(R));
  check("I10 · con 200 expedientes, cartera, tabla y Mi día por debajo de 400 ms", R.cartera < 400 && R.tabla < 400 && R.midia < 400, JSON.stringify(R));
  check("I10 · la copia de calcular() acierta y cambia al cambiar el expediente", await ev(() => { const x = DB.expedientes[0], a = calcular(x), b = calcular(x); x.bienes[0].valor = num(x.bienes[0].valor) + 1000; const c = calcular(x); return a === b && c !== a && c.isd.masa.bruto !== a.isd.masa.bruto; }));
  // I11: 700 expedientes (~6,8 MB): antes, a partir de unos 600 «No se están guardando los cambios»
  await gen(700, "cap"); await w(2500);
  const s1 = await ev(() => ({ alm: SG.almacen, err: SG.errorGuardar, marca: /hereda\+idb/.test(localStorage.getItem("cauce.v1") || "") }));
  check("I11 · 700 expedientes se guardan (pasan solos a IndexedDB, sin error)", s1.alm === "idb" && !s1.err && s1.marca, JSON.stringify(s1));
  await p.reload(); await w(3000);
  check("I11 · y siguen tras recargar", await ev(() => DB.expedientes.length === 700 && !!document.querySelector(".side")));
  await ev(() => { DB.expedientes[5].nombre = "Cambio en IndexedDB"; guardar(); }); await w(1000); await p.reload(); await w(3000);
  check("I11 · los cambios posteriores también", await ev(() => DB.expedientes[5].nombre === "Cambio en IndexedDB"));
  const o = await ev(async () => { const c = await sgCopiaObjeto(); return c.expedientes.length; });
  check("I11 · la copia de seguridad lleva los 700", o === 700);
  check("I10/I11 · sin errores de JavaScript", !errores.length, errores.slice(0, 3).join(" | "));
  await ctx.close();
}
// I11 con contraseña: activar el cifrado borra la copia en claro de IndexedDB; quitarlo vuelve a guardar donde quepa
{
  const { ctx, p, ev, w } = await pagina();
  await ev(() => { for (const k of ["mad", "and", "mar"]) DB.expedientes.unshift(prepararEjemplo(k)); sgPrueba({ umbralIdb: 1000, iteraciones: 1000 }); guardar(); }); await w(600);
  check("I11 · umbral superado: a IndexedDB", await ev(() => SG.almacen === "idb"));
  await ev(() => sgActivarCifrado("contraseña de prueba larga")); await w(400);
  check("I11 · al cifrar no queda copia en claro en IndexedDB", await ev(async () => SG.almacen === "ls" && !localStorage.getItem("cauce.v1") && (await sgIdbLeer()) === undefined));
  await p.reload(); await w(1000); await ev(() => sgDesbloquear("contraseña de prueba larga")); await w(1200);
  await ev(() => { sgPrueba({ umbralIdb: 1000 }); return sgQuitarCifrado("contraseña de prueba larga"); }); await w(600);
  await p.reload(); await w(1500);
  check("I11 · sin contraseña otra vez: en IndexedDB y legible", await ev(() => SG.almacen === "idb" && DB.expedientes.length === 3));
  await ctx.close();
}
await b.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
