// Prueba de navegador de las piezas de producto: panel del despacho (socio), perfiles, auditoría de cambios,
// búsqueda global de la paleta, tareas del despacho en Mi día y acciones masivas en la tabla de Expedientes.
// Uso: servir la raíz del repositorio (python3 -m http.server 8772) y ejecutar: node tools/qa/producto.mjs [url]
// Necesita Playwright con Chromium (PLAYWRIGHT=/ruta/a/playwright/index.mjs si no está en /opt/node-tools).
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const URL_APP = process.argv[2] || "http://127.0.0.1:8772/app/";
let ok = 0, ko = 0;
const check = (n, cond, extra = "") => { if (cond) ok++; else ko++; console.log(`${cond ? "✔" : "✘"} ${n}${!cond && extra ? " · " + extra : ""}`); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => { if (m.type() === "error" && !/favicon|service worker|sw\.js/i.test(m.text())) errores.push(m.text()); });
const espera = (ms = 250) => p.waitForTimeout(ms);
const ev = (f, a) => p.evaluate(f, a);

await p.goto(URL_APP); await espera(1200);
await ev(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); ui.sheet = null; render(); });
await espera(400);

// ── 1 · Perfiles y panel del despacho ──
check("La titular de la demostración es socia", await ev(() => scPerfil(scYo()) === "socio"));
check("«Abogado asociado» no se toma por socio", await ev(() => scPerfil({ rol: "Abogado asociado" }) === "abogado" && scPerfil({ rol: "Secretaria" }) === "administrativo" && scPerfil({ rol: "Socia directora" }) === "socio"));
check("La barra lateral muestra el panel del despacho al socio", await p.locator('.side [data-sc="abrir"]').count() === 1);
await p.click('.side [data-sc="abrir"]'); await espera(400);
check("Vista Despacho abierta", await ev(() => ui.vista === "socio"));
const ns = await p.locator(".sc-ns-n b").innerText();
check("North Star en porcentaje", /^\d+ %$/.test(ns.trim()), ns);
check("North Star coincide con rdAccionesExp", await ev(() => { const A = DB.expedientes.filter(rdActivo); const al = A.filter((x) => !rdAccionesExp(x).crit.length).length; return document.querySelector(".sc-ns-n b").textContent.trim() === Math.round((al / A.length) * 100) + " %"; }));
check("Muestra diaria de la North Star guardada", await ev(() => (DB.despacho.northStar || []).some((m) => m.f === hoy())));
check("Carga por persona: una fila por miembro con expedientes", await p.locator(".sc-t tbody tr[data-sc]").count() >= 3);
check("Dinero: presupuestado, facturado, cobrado, por facturar y provisiones", await ev(() => { const t = document.querySelector(".sc").innerText; return ["Presupuestado", "Facturado", "Cobrado", "Por facturar", "Provisiones"].every((k) => t.includes(k)); }));
check("Motivos de bloqueo con barras", await p.locator(".sc-bar").count() >= 1);
check("Tiempo por fase con medias del despacho", await ev(() => [...document.querySelectorAll(".sc-fases tbody tr")].some((r) => /\d+ días/.test(r.innerText))));
await p.screenshot({ path: process.env.QA_DIR ? process.env.QA_DIR + "/despacho.png" : "/tmp/hp-despacho.png", fullPage: true });

// ── 2 · Auditoría: cambios en datos críticos ──
const X = await ev(() => { const x = DB.expedientes.find((q) => q.demo && (q.personas || []).length >= 2 && (q.bienes || []).some((b) => b.tipo === "vivienda" || b.tipo === "inmueble") && q.testamento === "porcentajes") || DB.expedientes.find((q) => q.demo && (q.personas || []).length >= 2); return { id: x.id, p: x.personas[0].id, pct: x.personas[0].pct, fase: x.fase, test: x.testamento, b: (x.bienes.find((b) => b.tipo === "vivienda" || b.tipo === "inmueble") || x.bienes[0]).id }; });
await ev((id) => go({ vista: "exp", id, sec: "herencia", sheet: null }), X.id); await espera(300);
check("Abrir expedientes y guardar no apunta cambios (la conciliación automática no es de nadie)", await ev(async () => { for (const x of DB.expedientes.slice(0, 8)) { go({ vista: "exp", id: x.id, sec: "resumen", sheet: null }); await new Promise((r) => setTimeout(r, 30)); guardar(); } return DB.expedientes.every((x) => !(x.auditoria || []).length); }));
await ev((id) => go({ vista: "exp", id, sec: "herencia", sheet: null }), X.id); await espera(300);
await ev((X) => { ui.sheet = { tipo: "persona", id: X.p }; render(); }, X); await espera(300);
if (X.test === "porcentajes") { await p.fill("#p-pct", "33"); await p.press("#p-pct", "Tab"); }
await p.fill("#p-nif", "12345678-z"); await p.press("#p-nif", "Tab"); await espera(300);
await p.locator('input[data-p="renuncia"]').check({ force: true }); await espera(300);
await ev(() => { ui.sheet = null; guardar(); render(); }); await espera(300);
await ev((X) => { ui.sheet = { tipo: "bien", id: X.b }; render(); }, X); await espera(300);
await p.fill("#b-v", "250.000"); await p.press("#b-v", "Tab"); await espera(300);
await ev(() => { ui.sheet = null; guardar(); render(); }); await espera(300);
const nueva = await ev((X) => { const L = FASES_EXP.map((f) => f[0]); return L.find((k) => k !== X.fase && k !== "cerrado"); }, X);
await p.click(`.stepper [data-fase="${nueva}"]`); await espera(300);
await ev(() => { ui.sec = "despacho"; ui.sub = "fondos"; render(); }); await espera(300);
await p.selectOption("#m-t", "factura"); await p.fill("#m-c", "Minuta 1/2026"); await p.fill("#m-i", "1210"); await p.click('[data-act="addMov"]'); await espera(400);
const A = await ev((id) => DB.expedientes.find((x) => x.id === id).auditoria || [], X.id);
const tiene = (c, f) => A.some((e) => e.c === c && (!f || f(e)));
if (X.test === "porcentajes") check("Auditoría: porcentaje del heredero con valor anterior y nuevo", tiene("Porcentaje en el testamento", (e) => e.d === "33 %" && e.a !== e.d), JSON.stringify(A.slice(0, 6)));
check("Auditoría: NIF", tiene("NIF", (e) => e.d === "12345678-z"));
check("Auditoría: renuncia", tiene("Renuncia a la herencia", (e) => e.a === "No renuncia" && e.d === "Renuncia"));
check("Auditoría: valor del bien", tiene("Valor", (e) => /250\.000,00 €/.test(e.d)));
check("Auditoría: fase", tiene("Fase", (e) => e.k === "expediente"));
check("Auditoría: movimiento de fondos (minuta emitida)", tiene("Alta", (e) => e.k === "fondos" && /1\.210/.test(e.d)));
check("Auditoría: quién (usuario actual)", A.length > 0 && A.every((e) => e.u === A[0].u) && !!A[0].u);
check("Minuta emitida sin signo de cargo en el libro", await ev(() => [...document.querySelectorAll(".grid-t td.n")].some((td) => /^1\.210,00 €$/.test(td.textContent.trim()))));
await ev(() => { ui.sub = "actividad"; render(); }); await espera(300);
check("Actividad del expediente con la tabla de cambios", await p.locator(".au-t tbody tr").count() >= 5);
// Exportación del expediente: lleva la auditoría
const [dl] = await Promise.all([p.waitForEvent("download"), ev(() => exportarExpediente(exp()))]);
const fs = await import("node:fs");
const json = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
check("La exportación del expediente incluye la auditoría", Array.isArray(json.expediente.auditoria) && json.expediente.auditoria.length >= 5);
// Despacho › Actividad con filtros
await ev(() => scAbrir()); await espera(200);
await p.click('[data-sc="tab"][data-tab="actividad"]'); await espera(300);
const total = await p.locator(".au-t tbody tr").count();
await p.selectOption('select[data-auf="k"]', "fondos"); await espera(400);
const soloFondos = await p.locator(".au-t tbody tr").count();
check("Despacho › Actividad: filtro por tipo de dato", total >= 5 && soloFondos >= 1 && soloFondos < total, `${total} → ${soloFondos}`);
await p.selectOption('select[data-auf="k"]', ""); await p.fill('input[data-auf="q"]', "renuncia"); await espera(400);
check("Despacho › Actividad: búsqueda en los cambios", (await p.locator(".au-t tbody tr").count()) >= 1 && (await p.locator(".au-t tbody tr").count()) < total);

// ── 3 · Búsqueda global (⌘K) ──
await ev(() => go({ vista: "inicio", sheet: null })); await espera(200);
const paleta = async (q) => { await ev(() => pkAbrir()); await p.fill(".pk-in", q); await espera(250); return ev(() => [...document.querySelectorAll(".pk-list .pk-g")].map((g) => g.textContent)); };
const persona = await ev(() => { const x = DB.expedientes.find((q) => q.demo && q.personas.some((p) => p.nif && /[ÁÉÍÓÚáéíóú]/.test(p.nombre))); const pr = x.personas.find((p) => p.nif && /[ÁÉÍÓÚáéíóú]/.test(p.nombre)); return { nombre: pr.nombre, nif: pr.nif, id: pr.id, x: x.id }; });
let G = await paleta(persona.nif.slice(0, 8) + "-" + persona.nif.slice(8).toLowerCase());
check("Paleta: NIF con guion y en minúscula encuentra a la persona", G.some((g) => g.startsWith("Personas")), G.join(" | "));
await p.keyboard.press("Enter"); await espera(400);
check("Paleta: el resultado abre la ficha de la persona", await ev((pp) => ui.vista === "exp" && ui.id === pp.x && ui.sheet && ui.sheet.tipo === "persona" && ui.sheet.id === pp.id, persona));
await ev(() => { ui.sheet = null; render(); });
const sinAcento = persona.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(" ").slice(0, 2).join(" ");
G = await paleta(sinAcento);
check("Paleta: nombre sin acentos ni mayúsculas", G.some((g) => g.startsWith("Personas")), sinAcento);
const rc = await ev(() => DB.expedientes.flatMap((x) => x.bienes).find((b) => b.refCatastral).refCatastral);
G = await paleta(rc.slice(0, 12).toLowerCase());
check("Paleta: referencia catastral parcial encuentra el bien", G.some((g) => g.startsWith("Bienes")), G.join(" | "));
await ev(async (id) => { await archivoGuardar([new File(["%PDF-1.4 prueba"], "Nota simple Registro Triana.pdf", { type: "application/pdf" })], id, ""); }, X.id); await espera(800);
G = await paleta("nota simple triana");
check("Paleta: documento archivado por su nombre", G.some((g) => g.startsWith("Documentos")), G.join(" | "));
G = await paleta("impuesto sobre sucesiones");
check("Paleta: trámites de toda la cartera", G.some((g) => g.startsWith("Trámites")), G.join(" | "));
G = await paleta("EXP-2026");
check("Paleta: referencias de expediente", G.some((g) => g.startsWith("Expedientes")), G.join(" | "));
await ev(() => pkCerrar());

// ── 4 · Tareas del despacho en Mi día ──
const ayer = await ev(() => new Date(Date.now() - 864e5).toISOString().slice(0, 10));
await ev((id) => go({ vista: "exp", id, sec: "tramites", sheet: null }), X.id); await espera(300);
const f = p.locator(`form[data-tkf="${X.id}"]`);
await f.locator('[name="titulo"]').fill("Llamar a la gestoría por el IBI");
await f.locator('[name="resp"]').selectOption("dm-a2");
await f.locator('[name="fecha"]').fill(ayer);
await f.locator('button[type="submit"]').click(); await espera(400);
check("Tarea creada en el expediente", await ev((id) => (DB.expedientes.find((x) => x.id === id).tareasDespacho || []).some((t) => t.titulo.startsWith("Llamar a la gestoría") && t.resp === "dm-a2"), X.id));
check("Una tarea atrasada deja el expediente sin estar «al día»", await ev((id) => rdAccionesExp(DB.expedientes.find((x) => x.id === id)).crit.some((i) => i.tipo === "tarea"), X.id));
// Cambio de usuario a un abogado: sin panel del socio y Mi día filtrado a lo suyo
await p.selectOption(".side select[data-sc-yo]", "dm-a2"); await espera(500);
check("Abogado: la barra lateral no muestra el panel del despacho", await p.locator('.side [data-sc="abrir"]').count() === 0);
await p.click('.side [data-act="rdMiDia"]'); await espera(400);
check("Abogado: Mi día filtrado a sus asuntos", await ev(() => ui.vista === "radar" && ui.rdr === "dm-a2"));
const fila = p.locator(".rd-row", { hasText: "Llamar a la gestoría" });
check("La tarea aparece en Mi día del responsable", await fila.count() === 1);
await fila.locator('[data-tk="hecha"]').click(); await espera(400);
check("«Hecha» desde Mi día la cierra", await ev((id) => (DB.expedientes.find((x) => x.id === id).tareasDespacho || []).every((t) => t.hecha), X.id));
await p.selectOption(".side select[data-sc-yo]", await ev(() => DB.despacho.abogados[0].id)); await espera(400);

// ── 5 · Acciones masivas en la tabla de Expedientes ──
await ev(() => { ui.cv = "tabla"; go({ vista: "inicio", sheet: null }); }); await espera(400);
const ids = await ev(() => [...document.querySelectorAll(".grid-t tbody tr[data-open]")].slice(0, 2).map((r) => r.dataset.open));
for (const id of ids) await p.click(`.grid-t tr[data-open="${id}"] [data-masel]`);
await espera(300);
check("Marcar filas no abre el expediente", await ev(() => ui.vista === "inicio"));
check("Barra de acciones con los marcados", (await p.locator(".ma-bar").innerText()).includes("2 expedientes marcados"));
const destino = await ev((ids) => DB.despacho.abogados.find((a) => ids.every((id) => DB.expedientes.find((x) => x.id === id).responsable !== a.id)).id, ids);
await p.selectOption('select[data-mas="resp"]', destino); await espera(500);
check("Responsable cambiado en los dos", await ev(([ids, d]) => ids.every((id) => DB.expedientes.find((x) => x.id === id).responsable === d), [ids, destino]));
await p.selectOption('select[data-mas="fase"]', "firma"); await espera(500);
check("Fase cambiada y anotada en la bitácora", await ev((ids) => ids.every((id) => { const x = DB.expedientes.find((q) => q.id === id); return x.fase === "firma" && x.bitacora.some((b) => b.tipo === "fase" && /→ Firma$/.test(b.texto)); }), ids));
check("La acción masiva queda en la auditoría", await ev((ids) => ids.every((id) => (DB.expedientes.find((q) => q.id === id).auditoria || []).some((e) => e.c === "Responsable")), ids));

// ── 6 · Ajustes: perfil de cada persona ──
await ev(() => { ui.sheet = { tipo: "ajustes" }; render(); }); await espera(300);
check("Ajustes: selector de perfil por persona", await p.locator('select[data-k="perfil"]').count() === await ev(() => DB.despacho.abogados.length));
await p.selectOption('select[data-abo="dm-a3"][data-k="perfil"]', "administrativo"); await espera(400);
check("Perfil guardado en despachoCfg", await ev(() => abogado("dm-a3").perfil === "administrativo"));

check("Sin errores de JavaScript", errores.length === 0, errores.slice(0, 3).join(" | "));
await b.close();
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
