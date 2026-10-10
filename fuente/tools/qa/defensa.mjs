// Prueba de navegador de G01 (datos registrales y del causante), G05 (declaración de herederos abintestato) y G07 (defensa tributaria),
// con el despacho de demostración: pantallas, edición, escritos (texto, plazos iguales a los del motor, Word válido) y cero errores en la consola.
// Uso: python3 src/build.py; node tools/qa/servidor.mjs 8806 dist/publicar; node tools/qa/defensa.mjs [url=http://127.0.0.1:8806/app/]
import fs from "node:fs";
import path from "node:path";
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const URL_APP = process.argv.slice(2).find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8806/app/";
let ok = 0, ko = 0; const fallos = [];
const check = (n, c, extra = "") => { if (c) ok++; else { ko++; fallos.push(n); } if (!c || process.env.VERBOSO) console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + String(extra).slice(0, 500) : ""}`); };
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "hp-defensa-"));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errores.push("consola: " + m.text()); });
const ev = (f, a) => p.evaluate(f, a);
await p.goto(URL_APP); await p.waitForTimeout(1200);
await ev(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); ui.sheet = null; render(); });
await p.waitForTimeout(400);
const sano = (n, t) => {
  const sinRev = t.replace(/⟦REVISI[^⟧]*⟧/g, "");
  check(`${n}: sin undefined/NaN/null/[object`, !!t && !/undefined|NaN|\bnull\b|\[object/.test(t), (t.match(/.{0,60}(undefined|NaN|\bnull\b|\[object).{0,60}/) || [])[0]);
  check(`${n}: marcadores ⟦…⟧ equilibrados, sin anidar ni corchetes antiguos`, (t.match(/⟦/g) || []).length === (t.match(/⟧/g) || []).length && !/⟦[^⟧]*⟦/.test(sinRev) && !/\[[^\]\n]{1,200}\]/.test(sinRev));
  const prosa = t.split("\n").filter((l) => !/^\|/.test(l)).join("\n");
  check(`${n}: sin espacios dobles ni puntuación duplicada`, !/ {2,}\S|,,|(?<!\.)\.\.(?!\.)| ,/.test(prosa), (prosa.match(/.{0,30}( {2,}\S|,,|(?<!\.)\.\.(?!\.)| ,).{0,30}/) || [])[0]);
};

// ── G07 · escritos de defensa tributaria con los actos de cada tipo ──
const ACTOS = [
  { id: "q1", tributo: "ISD", tipo: "propuestaLiquidacion", fechaNotificacion: "2026-03-27", diasAlegaciones: "10", sujetoId: "p2", bienId: "b2", importe: 3100, valorComprobado: 185000, organo: "Oficina Liquidadora de Marbella", numero: "PL-1", escritos: ["alegaciones"], plazo: "alegaciones" },
  { id: "q2", tributo: "ISD", tipo: "liquidacion", fechaNotificacion: "2026-01-31", sujetoId: "p3", bienId: "b2", importe: 5400, valorComprobado: 230000, organo: "Oficina Liquidadora de Marbella", numero: "LIQ-2", escritos: ["reposicion", "reclamacionEA", "tpc"], plazo: "reposicion" },
  { id: "q3", tributo: "ISD", tipo: "sancion", fechaNotificacion: "2026-11-08", sujetoId: "p2", importe: 800, escritos: ["reposicion", "reclamacionEA"], plazo: "reposicion" },
  { id: "q4", tributo: "ISD", tipo: "autoliquidacion", fechaIngreso: "2026-09-30", sujetoId: "p2", bienId: "b1", importe: 9000, esValorReferencia: true, valorDeclarado: 420000, valorComprobado: 452000, motivos: "no se dedujeron los gastos de última enfermedad", escritos: ["valorReferencia", "rectificacion"], plazo: "rectificacion" },
  { id: "q5", tributo: "ISD", tipo: "liquidacion", fechaNotificacion: "2026-09-16", sujetoId: "p3", bienId: "b1", importe: 2200, esValorReferencia: true, valorDeclarado: 420000, valorComprobado: 452000, escritos: ["reposicion", "reclamacionEA", "valorReferencia"], plazo: "reposicion" },
  { id: "q6", tributo: "IIVTNU", tipo: "liquidacion", fechaNotificacion: "2026-05-12", sujetoId: "p2", bienId: "b1", importe: 7000, organo: "Ayuntamiento de Marbella · Gestión Tributaria", escritos: ["plusvaliaRecurso"], plazo: "reposicionLocal" },
  { id: "q7", tributo: "IIVTNU", tipo: "autoliquidacion", fechaIngreso: "2026-08-20", sujetoId: "p3", bienId: "b2", importe: 6000, escritos: ["plusvaliaDevolucion"], plazo: "rectificacion" },
];
const R7 = await ev((ACTOS) => {
  const x = DB.expedientes.find((q) => q.id === "dm-02"); x.procedimientos = ACTOS.map(({ escritos, plazo, ...a }) => ({ ...a })); guardar();
  const R = calcular(x), out = [];
  for (const A of ACTOS) {
    const P = x.procedimientos.find((q) => q.id === A.id); ui.defProc = A.id;
    const pz = dfPlazos(x, R, P), lim = (pz.items.find((q) => q.id === A.plazo) || {}).limite;
    for (const k of A.escritos) {
      const t = docTexto(x, R, k), blob = docx(t, esrDocxOpts(x, DOC_TIT[k]));
      out.push({ a: A.id, k, t, lim, limLarga: lim ? fechaLarga(lim) : "", aplic: dfEscritosDe(P), tit: DOC_TIT[k], tamWord: blob.size, tipoWord: blob.type });
    }
  }
  ui.defProc = null; return out;
}, ACTOS);
for (const E of R7) {
  const n = `G07 ${E.a} · ${E.k}`;
  sano(n, E.t);
  check(`${n}: corresponde al acto y tiene título`, E.aplic.includes(E.k) && !!E.tit, E.aplic.join(","));
  check(`${n}: plazo del motor en el escrito (${E.limLarga})`, !!E.lim && E.t.includes(E.limLarga), E.lim);
  check(`${n}: Word generado`, E.tamWord > 4000 && /wordprocessingml/.test(E.tipoWord), E.tamWord);
}
const T = (a, k) => (R7.find((q) => q.a === a && q.k === k) || {}).t || "";
check("G07 alegaciones: 10 días hábiles → 13 de abril de 2026, art. 99.8 LGT, motivación (art. 102.2.c) y STS 2018", /13 de abril de 2026/.test(T("q1", "alegaciones")) && /art\. 99\.8 LGT/.test(T("q1", "alegaciones")) && /102\.2\.c/.test(T("q1", "alegaciones")) && /4202\/2017/.test(T("q1", "alegaciones")));
check("G07 reposición: 31-01 → 2 de marzo de 2026 (fin de febrero en sábado), arts. 223.1 y 224.1 LGT", /2 de marzo de 2026/.test(T("q2", "reposicion")) && /223\.1 LGT/.test(T("q2", "reposicion")) && /224\.1 LGT/.test(T("q2", "reposicion")) && /135\.1 LGT/.test(T("q2", "reposicion")));
check("G07 reclamación: tribunal regional de Andalucía por conducto del órgano (art. 235.3), art. 233 LGT", /TRIBUNAL ECONÓMICO-ADMINISTRATIVO REGIONAL DE ANDALUC/.test(T("q2", "reclamacionEA")) && /235\.3 LGT/.test(T("q2", "reclamacionEA")) && /art\. 233 LGT/.test(T("q2", "reclamacionEA")));
check("G07 sanción: suspensión automática (art. 212.3 LGT) y vence el 9-12-2026 (8-12 festivo)", /212\.3 LGT/.test(T("q3", "reposicion")) && /9 de diciembre de 2026/.test(T("q3", "reposicion")) && /188\.3 LGT/.test(T("q3", "reposicion")));
check("G07 sanción de 800 €: procedimiento abreviado (arts. 245 y 246 LGT)", /procedimiento abreviado/.test(T("q3", "reclamacionEA")));
check("G07 tasación pericial: arts. 57.2 y 135 LGT, perito, regla de 120.000 € y 20 %, simulación", /57\.2 LGT/.test(T("q2", "tpc")) && /135\.2 LGT/.test(T("q2", "tpc")) && /120\.000 €/.test(T("q2", "tpc")) && /20 %/.test(T("q2", "tpc")) && /simulación del despacho/.test(T("q2", "tpc")));
check("G07 rectificación: art. 120.3 LGT, arts. 126 a 129 RGAT, interés del art. 32.2 y plazo de cuatro años", /120\.3 LGT/.test(T("q4", "rectificacion")) && /126 a 129/.test(T("q4", "rectificacion")) && /32\.2 LGT/.test(T("q4", "rectificacion")) && /gastos de última enfermedad/.test(T("q4", "rectificacion")));
check("G07 valor de referencia (autoliquidación): rectificación, informe vinculante del Catastro, art. 9.3 LISD, sin TPC", /SOLICITUD DE RECTIFICACIÓN DE AUTOLIQUIDACIÓN POR SER EL VALOR DE REFERENCIA/.test(T("q4", "valorReferencia")) && /informe preceptivo y vinculante de la Dirección General del Catastro/.test(T("q4", "valorReferencia")) && /9\.3 Ley 29\/1987/.test(T("q4", "valorReferencia")) && /no cabe la tasación pericial/.test(T("q4", "valorReferencia")));
check("G07 valor de referencia (liquidación): recurso de reposición con suspensión", /RECURSO DE REPOSICIÓN CONTRA LA LIQUIDACIÓN BASADA EN EL VALOR DE REFERENCIA/.test(T("q5", "valorReferencia")) && /224\.1 LGT/.test(T("q5", "valorReferencia")));
check("G07 plusvalía recurso: art. 14.2 TRLRHL, cifras del motor y suspensión (14.2.i)", /14\.2\.c TRLRHL/.test(T("q6", "plusvaliaRecurso")) && /14\.2\.i TRLRHL/.test(T("q6", "plusvaliaRecurso")) && /(107\.5|104\.5|108\.4) TRLRHL/.test(T("q6", "plusvaliaRecurso")));
check("G07 plusvalía devolución: arts. 104.5 y 107.5 TRLRHL, art. 12 TRLRHL y 120.3 LGT", /104\.5 TRLRHL/.test(T("q7", "plusvaliaDevolucion")) && /art\. 12 TRLRHL/.test(T("q7", "plusvaliaDevolucion")) && /120\.3 LGT/.test(T("q7", "plusvaliaDevolucion")));
// Cifras de la plusvalía: la cuota corregida del escrito es la del motor
const PL = await ev(() => { const x = DB.expedientes.find((q) => q.id === "dm-02"), R = calcular(x), e = R.plus.find((q) => q.b.id === "b1"); const p = x.personas.find((q) => q.id === "p2"); const t = e && (e.r.porTitular || []).find((q) => q.heredero === p.nombre); return e ? eur(e.r.noSujeto ? 0 : t ? t.aIngresar : e.r.total) : ""; });
check(`G07 plusvalía recurso: cuota que corresponde = motor (${PL})`, !!PL && T("q6", "plusvaliaRecurso").includes(PL), PL);

// ── G07 · interfaz: panel, alta de una notificación desde la pantalla, plazos y escrito ──
await ev(() => { const x = DB.expedientes.find((q) => q.id === "dm-05") || DB.expedientes[4]; x.procedimientos = []; guardar(); go({ vista: "exp", id: x.id, sec: "documentos" }); ui.dsub = "escritos"; render(); });
await p.waitForTimeout(300);
check("G07 panel: «Defensa tributaria» con «Registrar una notificación»", await ev(() => !!document.querySelector('[data-df="nuevo"]') && /Defensa tributaria/.test(document.body.textContent)));
await p.click('[data-df="nuevo"]'); await p.waitForTimeout(300);
check("G07 hoja de la notificación abierta", await ev(() => ui.sheet && ui.sheet.tipo === "df" && !!document.getElementById("df-fechaNotificacion")));
await p.fill("#df-fechaNotificacion", "2026-03-16"); await p.dispatchEvent("#df-fechaNotificacion", "change"); await p.waitForTimeout(200);
await p.fill("#df-importe", "1.250,50"); await p.dispatchEvent("#df-importe", "change"); await p.waitForTimeout(200);
await p.fill("#df-numero", "LIQ-QA-9"); await p.dispatchEvent("#df-numero", "change"); await p.waitForTimeout(200);
const G = await ev(() => { const P = exp().procedimientos[0]; return { f: P.fechaNotificacion, imp: P.importe, num: P.numero }; });
check("G07 hoja: fecha, importe (1.250,50 → 1250,5) y referencia guardados", G.f === "2026-03-16" && G.imp === 1250.5 && G.num === "LIQ-QA-9", JSON.stringify(G));
await ev(() => { ui.sheet = null; render(); }); await p.waitForTimeout(300);
const PZ = await ev(() => [...document.querySelectorAll(".df-pl")].map((n) => n.textContent));
check("G07 panel: plazos de reposición, reclamación, tasación y pago con sus fechas", PZ.length >= 4 && PZ.some((t) => /Recurso de reposición/.test(t) && /16 de abril de 2026/.test(t)) && PZ.some((t) => /Pago en periodo voluntario/.test(t) && /5 de mayo de 2026/.test(t)), PZ.join(" | "));
await p.click('[data-doc="reposicion"][data-dproc]'); await p.waitForTimeout(400);
const V = await ev(() => { const v = document.querySelector(".paperview"); return v ? v.textContent : ""; });
check("G07 vista previa del recurso con la referencia y el plazo del acto elegido", /LIQ-QA-9/.test(V) && /16 de abril de 2026/.test(V) && /1\.250,50 €/.test(V), V.slice(0, 300));
await ev(() => { ui.sheet = null; render(); }); await p.waitForTimeout(700);
await p.screenshot({ path: path.join(tmp, "defensa-1360.png"), fullPage: true });

// ── G05 · declaración de herederos (caso 1, sin testamento) ──
await ev(() => { const x = JSON.parse(JSON.stringify(DB.expedientes.find((q) => q.id === "dm-01"))); x.id = "qa-ab"; delete x.demo; x.despacho = { ...x.despacho, docs: {}, ref: "EXP-QA-AB" }; x.tramites = {}; x.firma = {}; DB.expedientes.push(x); guardar(); go({ vista: "exp", id: "qa-ab", sec: "documentos" }); ui.dsub = "escritos"; render(); });
await p.waitForTimeout(300);
check("G05 panel visible sin testamento y escrito en la rejilla", await ev(() => !!document.querySelector(".ab-card") && !!document.querySelector('.doccard[data-doc="declaracionHerederos"]')));
await p.fill("#ab-t0-nombre", "Testigo Ficticio Uno"); await p.dispatchEvent("#ab-t0-nombre", "change"); await p.waitForTimeout(150);
await p.fill("#ab-t0-nif", "00000020-z"); await p.dispatchEvent("#ab-t0-nif", "change"); await p.waitForTimeout(150);
await p.fill("#ab-not", "Notaría de Málaga, calle ficticia 1"); await p.dispatchEvent("#ab-not", "change"); await p.waitForTimeout(150);
const D5 = await ev(() => { const x = exp(); return { t: x.declaracion.testigos[0], n: x.declaracion.notaria, txt: docTexto(x, calcular(x), "declaracionHerederos") }; });
check("G05 testigo y notaría guardados (NIF normalizado)", D5.t.nombre === "Testigo Ficticio Uno" && D5.t.nif === "00000020Z" && /Notaría de Málaga/.test(D5.n), JSON.stringify(D5.t));
sano("G05 requerimiento", D5.txt);
check("G05 requerimiento: arts. 55 y 56 LN, notaría competente (art. 55.1), testigos y parientes con grado", /arts\. 55 y 56 de la Ley del Notariado/.test(D5.txt) && /art\. 55\.1 de la Ley del Notariado/.test(D5.txt) && /Testigo Ficticio Uno, mayor de edad, con DNI\/NIF 00000020Z/.test(D5.txt) && /1\.º grado/.test(D5.txt) && /cuota legal usufructuaria/.test(D5.txt) && /AL NOTARIO DE NOTARÍA DE MÁLAGA/.test(D5.txt), D5.txt.slice(0, 400));
check("G05 requerimiento: documentos (defunción, últimas voluntades, libro de familia, empadronamiento)", ["Certificado literal de defunción", "Actos de Última Voluntad", "Libro de familia", "empadronamiento"].every((s) => D5.txt.includes(s)));
await ev(() => { const x = exp(); x.tramites = x.tramites || {}; x.tramites.declaracion = { estado: "pend" }; });
await p.click('.ab-card [data-doc="declaracionHerederos"]'); await p.waitForTimeout(400);
await p.click('[data-dl="declaracionHerederos"]').catch(() => {}); await p.waitForTimeout(300);
check("G05 al descargar el Word, el trámite pasa a «en curso»", await ev(() => (exp().tramites.declaracion || {}).estado === "curso"));
await ev(() => { if (document.activeElement) document.activeElement.blur(); ui.sheet = null; render(); }); await p.waitForTimeout(200);
await p.fill("#ab-a-not", "D. Notario Ficticio Tres"); await p.dispatchEvent("#ab-a-not", "change"); await p.waitForTimeout(150);
await p.fill("#ab-a-fecha", "2026-10-01"); await p.dispatchEvent("#ab-a-fecha", "change"); await p.waitForTimeout(300);
const A5 = await ev(() => { const x = exp(); return { est: (x.tramites.declaracion || {}).estado, esc: docTexto(x, calcular(x), "escritura") }; });
check("G05 acta autorizada: trámite hecho y la escritura cita el acta (notario y fecha)", A5.est === "hecho" && /acta de notoriedad autorizada por el notario D\. Notario Ficticio Tres, el 1 de octubre de 2026/.test(A5.esc), A5.est);
const E5 = await ev(() => { const x = JSON.parse(JSON.stringify(DB.expedientes.find((q) => q.id === "qa-ab"))); x.id = "qa-estado"; x.personas = [{ id: "z1", nombre: "Vecina Ficticia", relacion: "extrano", edad: 60 }]; x.declaracion = { requirente: "z1" }; return docTexto(x, calcular(x), "declaracionHerederos"); });
check("G05 sin parientes: comunicación a la Delegación de Economía y Hacienda (arts. 956 a 958 CC)", /COMUNICACIÓN DE HERENCIA SIN PARIENTES/.test(E5) && /DELEGACIÓN DE ECONOMÍA Y HACIENDA/.test(E5) && /956 a 958 CC/.test(E5), E5.slice(0, 300));
sano("G05 comunicación al Estado", E5);
check("G05 con testamento: ni panel ni escrito", await ev(() => { const x = DB.expedientes.find((q) => q.id === "dm-02"); return abPanelHTML(x) === "" && !docsDisponibles(x).some((d) => d[0] === "declaracionHerederos"); }));
await p.screenshot({ path: path.join(tmp, "abintestato-1360.png"), fullPage: true });

// ── G01 · Listo para firmar: comprobación registral y edición ──
const F1 = await ev(() => { const x = DB.expedientes.find((q) => q.id === "qa-ab"); const V = validarFirma(x, calcular(x)); return V.items.filter((i) => /^vf-rg-/.test(i.id)).map((i) => i.sev); });
check("G01 finca sin datos registrales: bloqueo", F1.length === 2 && F1.every((s) => s === "bloqueo"), F1.join(","));
await ev(() => { if (document.activeElement) document.activeElement.blur(); ui.sheet = null; ui.conf = null; go({ vista: "exp", id: "qa-ab", sec: "firma" }); render(); }); await p.waitForTimeout(400);
await p.waitForSelector("#vf-b-b1-cru", { timeout: 5000 }).catch(async () => console.log("· firma:", await ev(() => [ui.vista, ui.sec, JSON.stringify(ui.sheet), document.querySelectorAll("[data-vfb]").length, document.querySelector("#app") ? document.querySelector("#app").textContent.slice(0, 300) : ""].join(" ")), errores));
await p.fill("#vf-b-b1-cru", "29012 00000 1234"); await p.dispatchEvent("#vf-b-b1-cru", "change"); await p.waitForTimeout(150);
await p.fill("#vf-b-b1-fincaRegistral", "4321"); await p.dispatchEvent("#vf-b-b1-fincaRegistral", "change"); await p.waitForTimeout(300);
const F2 = await ev(() => { const x = exp(), b = x.bienes.find((q) => q.id === "b1"); const V = validarFirma(x, calcular(x)); return { cru: b.cru, sev: V.items.find((i) => i.id === "vf-rg-b1").sev }; });
check("G01 con CRU y finca: deja de bloquear (aviso por el Registro) y el CRU se guarda sin espacios", F2.cru === "29012000001234" && F2.sev === "aviso", JSON.stringify(F2));
await p.fill("#vf-x-padre", "Padre Ficticio"); await p.dispatchEvent("#vf-x-padre", "change"); await p.waitForTimeout(200);
check("G01 datos del causante en Listo para firmar → 790", await ev(() => { const x = exp(); return x.padre === "Padre Ficticio" && docTexto(x, calcular(x), "solicitud790").includes("Padre Ficticio"); }));

// ── Móvil: sin desbordamiento horizontal en Escritos ──
await p.setViewportSize({ width: 390, height: 844 });
for (const id of ["qa-ab", "dm-05"]) { await ev((id) => { go({ vista: "exp", id: DB.expedientes.find((q) => q.id === id) ? id : DB.expedientes[4].id, sec: "documentos" }); ui.dsub = "escritos"; render(); }, id); await p.waitForTimeout(300); check(`Escritos a 390 px (${id}): sin desbordamiento horizontal`, !(await ev(() => document.documentElement.scrollWidth > window.innerWidth + 1))); }
await p.screenshot({ path: path.join(tmp, "escritos-390.png"), fullPage: true });
check("Sin errores de JavaScript ni de consola", errores.length === 0, errores.join(" | "));
console.log(`\ndefensa: ${ok} correctas, ${ko} fallidas · capturas en ${tmp}`);
if (ko) console.log("Fallidas:\n- " + fallos.slice(0, 40).join("\n- "));
await b.close();
process.exit(ko ? 1 : 0);
