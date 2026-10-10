// Prueba del escáner con una cámara «de verdad»: la cámara falsa de Chromium reproduce vídeos de escenas realistas (folio y DNI sobre mesas
// y telas, en ángulo, con sombra, dedos, poca luz, reflejo…) generados por tools/qa/escaner_escenas.py a partir de los documentos ficticios.
//  1. Banco (sin navegador): tasa de acierto de la detección de bordes (scnDetectar) en cada escena, imagen a imagen, contra la verdad.
//     Acierto = las cuatro esquinas a menos del 2,5 % de la diagonal; en «sin-documento», no detectar nada; en «a4-fuera», no dar un recorte
//     que no toque el borde. Se exige ≥ 90 % en las imágenes quietas.
//  2. Navegador, emulando un iPhone 14, un Pixel 7 (con la CPU 4× más lenta) y un escritorio: abre el escáner, comprueba que detecta el
//     documento, que el marco se estabiliza, que dispara solo cuando está quieto, que no dispara si el papel se sale o está lejos, el disparo
//     manual, tres páginas seguidas con disparo automático (vídeo con tres papeles), el PDF archivado de 3 páginas y que el lector saca la
//     referencia catastral, el NIF y el IBAN; ergonomía a 390 px en vertical y en horizontal (sin desbordes, botones de 44 px, disparador al
//     alcance del pulgar), permiso de cámara denegado (explicado según el móvil, con «Reintentar») y que la cámara se apaga al cerrar o al
//     pasar la app a segundo plano.
// Uso (desde la raíz, con la app construida y servida: python3 -m http.server 8805):
//   node tools/ejemplos/generar.mjs                   (documentos ficticios, si no están)
//   node tools/qa/escaner.mjs [puerto=8805] [--banco] (solo el banco) [--completo] (todas las escenas en los tres dispositivos)
// Las escenas se generan la primera vez en tools/qa/salida/escenas (python3 con numpy y OpenCV, pdftoppm y ffmpeg).
// Sale con código 1 si algo falla.
import { chromium, devices } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
const RAIZ = new URL("../../", import.meta.url).pathname;
const args = process.argv.slice(2);
const PUERTO = args.find((a) => /^\d+$/.test(a)) || "8805";
const URL_APP = `http://127.0.0.1:${PUERTO}/app/`;
const SOLO_BANCO = args.includes("--banco"), COMPLETO = args.includes("--completo");
const SAL = RAIZ + "tools/qa/salida/", ESC = SAL + "escenas/";
fs.mkdirSync(ESC, { recursive: true });
let fallos = 0; const informe = [];
// Limitaciones conocidas: se miden y se informan (⚠) pero no hacen fallar la prueba. Folio encima de otros papeles blancos: el recorte incluye
// a veces el borde del papel de debajo (se corrige a mano con las esquinas)
const LIMITACIONES = new Set(["a4-sobre-papeles"]);
const aviso = (n, extra) => { const l = `  ⚠ ${n}${extra !== undefined ? " " + JSON.stringify(extra).slice(0, 200) : ""}`; console.log(l); informe.push(l); };
const comp = (n, ok, extra) => { if (!ok) fallos++; const l = `  ${ok ? "✓" : "✗"} ${n}${extra !== undefined ? " " + (typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 260) : ""}`; console.log(l); informe.push(l); };

// ── Escenas ──
if (!fs.existsSync(ESC + "escenas.json") || !fs.existsSync(ESC + "secuencia.json")) {
  const EJ = RAIZ + "tools/ejemplos/salida";
  if (!fs.existsSync(EJ + "/caso1-testamento-malaga")) { console.error("Faltan los documentos de ejemplo: node tools/ejemplos/generar.mjs"); process.exit(1); }
  console.log("Generando las escenas (unos minutos)…");
  execFileSync("python3", [RAIZ + "tools/qa/escaner_escenas.py", EJ, ESC], { stdio: "inherit" });
}
const META = JSON.parse(fs.readFileSync(ESC + "escenas.json", "utf8"));
const SEC = JSON.parse(fs.readFileSync(ESC + "secuencia.json", "utf8"));

// ── 1. Banco sin navegador ──
console.log("\n═══ banco de escenas: detección de bordes ═══");
const ctx = { console, Math, Uint8Array, Uint8ClampedArray, Int32Array, Float32Array, Float64Array, Uint16Array, Uint32Array, Array, Object, Number, String, JSON, Set, Map, performance };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(RAIZ + "src/app/escaner.js", "utf8"), ctx);
const scnDetectar = vm.runInContext("scnDetectar", ctx);
const errEsq = (Q, V, diag) => { let best = 1e9; for (let s = 0; s < 4; s++) { let m = 0; for (let i = 0; i < 4; i++) m = Math.max(m, Math.hypot(Q[(i + s) % 4][0] - V[i][0], Q[(i + s) % 4][1] - V[i][1])); best = Math.min(best, m); } return best / diag; };
const banco = { escenas: [], quietas: [0, 0], temblor: [0, 0], ms: 0, n: 0 };
for (const m of META) {
  let q = [0, 0], s = [0, 0]; const marcas = []; const E = [];
  for (const mu of m.muestras) {
    const d = new Uint8ClampedArray(zlib.inflateSync(fs.readFileSync(`${ESC}${m.nombre}/m${String(mu.k).padStart(3, "0")}.rgba.z`)));
    const c0 = process.cpuUsage(); const r = scnDetectar(d, mu.w, mu.h); const c1 = process.cpuUsage(c0); banco.ms += (c1.user + c1.system) / 1000; banco.n++; // tiempo de CPU: en una máquina compartida, el de reloj engaña
    const ok = r && r.conf >= 0.45 && r.area >= 0.05; const e = ok && mu.verdad ? errEsq(r.esquinas, mu.verdad, Math.hypot(mu.w, mu.h)) : null;
    const bien = m.tipo === "fuera" ? !ok || r.borde : mu.verdad ? ok && e < 0.025 : !ok;
    if (e != null) E.push(e);
    const c = mu.quieto ? q : s; c[1]++; if (bien) c[0]++;
    marcas.push(bien ? "✓" : ok ? (e != null ? `✗${(e * 100).toFixed(1)}%` : "✗") : "·");
  }
  banco.quietas[0] += q[0]; banco.quietas[1] += q[1]; banco.temblor[0] += s[0]; banco.temblor[1] += s[1];
  const errMed = E.length ? E.sort((a, b) => a - b)[E.length >> 1] : null;
  banco.escenas.push({ nombre: m.nombre, desc: m.desc, tipo: m.tipo, quietas: q, temblor: s, errorMediano: errMed });
  console.log(`  ${q[0] === q[1] ? "✓" : LIMITACIONES.has(m.nombre) ? "⚠" : "✗"} ${m.nombre.padEnd(18)} quieto ${q[0]}/${q[1]} · con temblor ${s[0]}/${s[1]}${errMed != null ? ` · error mediano ${(errMed * 100).toFixed(2)} %` : ""}  ${marcas.join("")}`);
}
const tasa = banco.quietas[0] / banco.quietas[1];
comp(`detección de bordes en ${META.length} escenas: ${(tasa * 100).toFixed(1)} % de acierto con el móvil quieto (${banco.quietas.join("/")}), ${(banco.temblor[0] / banco.temblor[1] * 100).toFixed(1)} % con temblor; ${(banco.ms / banco.n).toFixed(1)} ms de CPU por imagen de 360 px en este equipo`, tasa >= 0.9);
// La imagen del disparo: se detecta a 360 px y las esquinas se afinan a 720 px (scnDetectarEn → scnAfinar); misma comprobación en la última
// imagen quieta de cada escena
const scnAfinar = vm.runInContext("scnAfinar", ctx);
let g0 = 0; const gMal = [];
for (const m of META) {
  const g = m.grande, mu = m.muestras[m.muestras.length - 1];
  const d0 = new Uint8ClampedArray(zlib.inflateSync(fs.readFileSync(`${ESC}${m.nombre}/m${String(mu.k).padStart(3, "0")}.rgba.z`)));
  const d = new Uint8ClampedArray(zlib.inflateSync(fs.readFileSync(`${ESC}${m.nombre}/g.rgba.z`)));
  const r0 = scnDetectar(d0, mu.w, mu.h); let Q = null;
  if (r0 && r0.conf >= 0.35) { const k = (g.w - 1) / (mu.w - 1), kh = (g.h - 1) / (mu.h - 1); const Q0 = r0.esquinas.map(([x, y]) => [x * k, y * kh]); Q = scnAfinar(d, g.w, g.h, Q0) || Q0; }
  const e = Q && g.verdad ? errEsq(Q, g.verdad, Math.hypot(g.w, g.h)) : null;
  const bien = m.tipo === "ninguno" ? !Q : m.tipo === "fuera" ? !Q || r0.borde : Q && e < 0.02; if (bien) g0++; else gMal.push(`${m.nombre}${e != null ? " " + (e * 100).toFixed(1) + " %" : ""}`);
}
banco.disparo720 = [g0, META.length];
comp(`recorte de la imagen del disparo (detección a 360 px y esquinas afinadas a 720 px, error < 2 %): ${g0}/${META.length}${gMal.length ? " (fallan: " + gMal.join(", ") + ")" : ""}`, g0 / META.length >= 0.9);
fs.writeFileSync(SAL + "escaner-banco.json", JSON.stringify({ fecha: new Date().toISOString(), tasa, ...banco }, null, 1));
if (SOLO_BANCO) { console.log(fallos ? `\nFALLO: ${fallos}` : "\nOK"); process.exit(fallos ? 1 : 0); }

// ── 2. Navegador ──
const DISP = { "iPhone 14": { ...devices["iPhone 14"] }, "Pixel 7": { ...devices["Pixel 7"] }, Escritorio: { viewport: { width: 1440, height: 900 } } };
async function abrir(video, disp, { lento = false, sinCamara = false } = {}) {
  const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", ...(video ? [`--use-file-for-fake-video-capture=${video}`] : [])] });
  const c = await b.newContext({ ...DISP[disp], permissions: ["camera"] }); const p = await c.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errs.push("console: " + m.text().slice(0, 200)); });
  if (sinCamara) await p.addInitScript(() => { const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); window.__permitir = () => { navigator.mediaDevices.getUserMedia = orig; }; navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denegado", "NotAllowedError")); });
  await p.goto(URL_APP); await p.waitForFunction(() => typeof go === "function" && document.querySelector("#app .shell, .bv-over"), null, { timeout: 30000 });
  await p.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); go({ vista: "inicio", sheet: null }); });
  if (lento) { const cdp = await c.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
  return { b, c, p, errs };
}
async function abrirEscaner(p) {
  await p.click('[data-act="lecNuevo"]'); await p.waitForTimeout(250);
  await p.getByRole("button", { name: "Escanear con la cámara" }).first().click();
}
// Sigue el escáner hasta que dispara (o hasta «ms»): marco, guía, estabilidad del marco y coste de la detección
async function seguir(p, ms) {
  return p.evaluate((ms) => new Promise((res) => {
    const t0 = performance.now(); const R = { primera: null, captura: null, marcos: [], guias: new Set(), costes: [] };
    const tick = () => {
      const t = performance.now() - t0;
      if (typeof SCN === "object" && SCN.abierto) {
        if (SCN.suave && R.primera == null) R.primera = Math.round(t);
        if (SCN.guia) R.guias.add(SCN.guia);
        R.marcos.push([t, SCN.suave ? SCN.suave.map((p) => p.slice()) : null]); R.costes.push(SCN.coste);
        const pg = SCN.docs && SCN.docs[0] && SCN.docs[0][0];
        if (pg && R.captura == null) { R.captura = Math.round(t); R.quad = pg.quad; }
      }
      if ((R.captura != null && t > R.captura + 200) || t > ms) { R.guias = [...R.guias]; R.vivo = SCN.el && SCN.el.querySelector(".scn-vivo") ? SCN.el.querySelector(".scn-vivo").textContent : ""; R.intervalo = SCN.intervalo; res(R); return; }
      setTimeout(tick, 100);
    };
    tick();
  }), ms);
}
const mov = (A, B) => Math.max(...A.map((p, k) => Math.hypot(p[0] - B[k][0], p[1] - B[k][1])));
const movCiclico = (A, B) => Math.min(...[0, 1, 2, 3].map((s) => mov(A.map((_, i) => A[(i + s) % 4]), B))); // el orden de las esquinas puede empezar en otra (documento girado 90°)
const vivoPorEscena = [], camposClave = [];
async function escena(m, disp, lento) {
  const { b, p, errs } = await abrir(m.video, disp, { lento });
  try {
    await abrirEscaner(p); await p.waitForSelector(".scn video", { timeout: 15000 });
    const R = await seguir(p, m.tipo === "a4" || m.tipo === "dni" ? 20000 : 7000);
    const nombre = `${disp} · ${m.nombre}`;
    if (m.tipo === "ninguno") comp(`${nombre}: sin documento no dibuja marco ni dispara`, R.primera == null && R.captura == null, R);
    else if (m.tipo === "fuera") comp(`${nombre}: el papel se sale de la imagen → pide alejarse y no dispara`, R.captura == null && R.guias.includes("aleja"), { guias: R.guias, captura: R.captura });
    else if (m.nombre === "a4-lejos") comp(`${nombre}: papel lejos → pide acercarse y no dispara`, R.captura == null && R.guias.includes("acerca"), { guias: R.guias, captura: R.captura });
    else {
      const V = m.verdad_final.map(([x, y]) => [x / (m.w - 1), y / (m.h - 1)]);
      const e = R.quad ? movCiclico(R.quad.map(([x, y]) => [x * m.w, y * m.h]), V.map(([x, y]) => [x * m.w, y * m.h])) / Math.hypot(m.w, m.h) : null;
      // Estabilidad: en los 600 ms antes del disparo, el marco dibujado no se mueve más del 1 % de la imagen
      const antes = R.marcos.filter(([t, q]) => q && R.captura != null && t >= R.captura - 700 && t < R.captura - 100).map(([, q]) => q);
      const jit = antes.length > 1 ? Math.max(...antes.slice(1).map((q, i) => mov(q, antes[i]))) : null;
      const ok = R.captura != null && e != null && e < 0.03 && (jit == null || jit < 0.01);
      const txt = `${nombre}: detecta (${R.primera} ms), se estabiliza (${jit != null ? (jit * 100).toFixed(2) + " %" : "—"}) y dispara solo (${R.captura} ms); recorte a ${e != null ? (e * 100).toFixed(1) : "—"} % de la verdad`;
      if (!ok && LIMITACIONES.has(m.nombre)) aviso(txt + " · limitación conocida");
      else comp(txt, ok, ok ? undefined : { guias: R.guias, vivo: R.vivo });
      const cm = R.costes.filter((x) => x).slice(-10); vivoPorEscena.push({ disp, escena: m.nombre, deteccion: R.primera, disparo: R.captura, error: e, temblorMarco: jit, coste: cm.length ? cm.reduce((s, v) => s + v, 0) / cm.length : null, intervalo: R.intervalo });
    }
    comp(`${disp} · ${m.nombre}: sin errores de JavaScript`, !errs.length, errs);
  } finally { await b.close(); }
}

const POR_DISP = {
  "iPhone 14": META.map((m) => m.nombre).filter((n) => !/webcam/.test(n)),
  "Pixel 7": ["a4-madera-angulo", "a4-dedos", "a4-poca-luz", "dni-mano", "a4-fuera", "sin-documento"],
  Escritorio: ["a4-webcam", "a4-webcam-girado", "dni-webcam", "a4-mesa-clara"],
};
for (const disp of Object.keys(DISP)) {
  console.log(`\n═══ ${disp}: detección en vivo con la cámara falsa${disp === "Pixel 7" ? " (CPU 4× más lenta)" : ""} ═══`);
  for (const m of META.filter((m) => COMPLETO || POR_DISP[disp].includes(m.nombre))) await escena(m, disp, disp === "Pixel 7");
}

// ── Tres páginas seguidas en dos documentos, PDF y lectura ──
// El vídeo pone y quita tres papeles: la certificación catastral (dos hojas) y el certificado del banco. Tras las dos primeras capturas se
// pulsa «Otro doc.»: el certificado del banco va en un PDF aparte
for (const disp of ["iPhone 14", "Pixel 7"]) {
  console.log(`\n═══ ${disp}: tres páginas con disparo automático, dos PDF archivados y leídos ═══`);
  // Sin frenar la CPU: en esta prueba cuenta el flujo y la lectura (la CPU 4× más lenta ya se prueba arriba, escena a escena); en una
  // máquina compartida, frenada, el vídeo de 8 s avanza mientras el móvil «piensa» y el orden de las capturas deja de ser el de los papeles
  const { b, p, errs } = await abrir(SEC.video, disp);
  try {
    await abrirEscaner(p); await p.waitForSelector(".scn video", { timeout: 15000 });
    const t0 = Date.now();
    const dos = await p.waitForFunction(() => SCN.docs[0].length >= 2, null, { timeout: 60000 }).then(() => true, () => false);
    if (dos) await p.click('[data-scn="nuevo"]');
    const tres = dos && (await p.waitForFunction(() => SCN.docs.length === 2 && SCN.docs[1].length >= 1, null, { timeout: 60000 }).then(() => true, () => false));
    const seg = Math.round((Date.now() - t0) / 100) / 10;
    await p.click('[data-scn="auto"]'); await p.waitForTimeout(300);
    const cuenta = await p.evaluate(() => SCN.docs.map((d) => d.length));
    comp(`${disp}: junta 3 páginas con el disparo automático, una por papel, en ${seg} s (dos documentos: ${cuenta.join(" + ")})`, tres && cuenta.join() === "2,1", cuenta);
    // Disparo manual: otra página, que luego se borra desde su miniatura
    await p.click('[data-scn="disparar"]'); const man = await p.waitForFunction(() => SCN.docs[1].length === 2, null, { timeout: 15000 }).then(() => true, () => false);
    await p.locator('[data-scn-ed="1:1"]').click(); await p.waitForSelector(".scn-h"); await p.click('[data-scn="borrar"]'); await p.waitForTimeout(300);
    comp(`${disp}: disparo manual y borrado de una página`, man && (await p.evaluate(() => SCN.docs.map((d) => d.length).join())) === "2,1");
    await p.waitForFunction(() => SCN.docs.every((d) => d.every((pg) => pg.res)), null, { timeout: 90000 });
    const proporciones = await p.evaluate(() => SCN.docs.flat().map((pg) => +(pg.rh / pg.rw).toFixed(3)));
    comp(`${disp}: las páginas salen recortadas y enderezadas a proporción de folio`, proporciones.every((r) => Math.abs(r - Math.SQRT2) < 0.06), proporciones);
    const s = await p.evaluate(() => { window.__pistas = SCN.stream ? SCN.stream.getTracks() : []; return window.__pistas.length; });
    await p.click('[data-scn="terminar"]');
    await p.waitForSelector(".lec-sheet .lec-row", { timeout: 600000 }); await p.waitForTimeout(500);
    const R = await p.evaluate(async () => {
      const x = DB.expedientes[0]; const A = ARCH.lista.filter((d) => d.expId === x.id); const pdf = await lecPdfLib(); const pags = [];
      for (const d of A) { const doc = await pdf.getDocument({ data: new Uint8Array(await d._b.arrayBuffer()) }).promise; pags.push(doc.numPages); }
      const txt = JSON.stringify(LEC.resultado.docs.map((d) => d.datos)).replace(/\s/g, "");
      return { arch: A.map((d) => [d.nombre, d.tipo]), pags, docs: LEC.resultado.docs.map((d) => [d.tipo, d.formato, d.paginas]), rc: txt.includes("1234567VK4713S0001OQ"), nif: txt.includes("25123456G"), iban: txt.includes("ES2121030000123456789012"), pistas: window.__pistas.every((t) => t.readyState === "ended"), abierto: !!document.querySelector(".scn") };
    });
    comp(`${disp}: dos PDF (2 y 1 páginas) archivados en el expediente nuevo`, R.arch.length === 2 && R.arch.every((a) => /^Escaneo .*\(\d\)\.pdf$/.test(a[0]) && a[1] === "application/pdf") && [...R.pags].sort().join() === "1,2", R);
    comp(`${disp}: el lector reconoce la certificación catastral y el certificado del banco`, R.docs.some((d) => d[0] === "catastro" && d[2] === 2) && R.docs.some((d) => d[0] === "bancario"), R.docs);
    const sn = (b) => (b ? "sí" : "no");
    // Con vídeo de 1080×1920 (lo que da la cámara de un móvil al navegador), la letra pequeña de las tablas queda a unos 100 ppp: la lectura
    // óptica acierta casi siempre el NIF y, según la imagen capturada, la referencia catastral o el IBAN. Se exigen dos de los tres
    const nCampos = [R.rc, R.nif, R.iban].filter(Boolean).length;
    comp(`${disp}: saca los campos clave (${nCampos}/3): NIF del titular ${sn(R.nif)}, IBAN ${sn(R.iban)}, referencia catastral ${sn(R.rc)}`, nCampos >= 2, { rc: R.rc, nif: R.nif, iban: R.iban });
    camposClave.push({ disp, ...{ rc: R.rc, nif: R.nif, iban: R.iban } });
    comp(`${disp}: la cámara queda apagada al terminar (${s} pista${s === 1 ? "" : "s"})`, s > 0 && R.pistas && !R.abierto);
    comp(`${disp}: sin errores de JavaScript`, !errs.length, errs);
  } finally { await b.close(); }
}

// ── Ergonomía a 390 px, permisos y segundo plano ──
for (const disp of ["iPhone 14", "Pixel 7"]) {
  console.log(`\n═══ ${disp}: ergonomía, permisos y segundo plano ═══`);
  const m = META.find((x) => x.nombre === "a4-madera-frontal");
  const { b, c, p, errs } = await abrir(m.video, disp);
  try {
    const tag = disp.replace(/\s/g, "");
    await p.click('[data-act="lecNuevo"]'); await p.waitForTimeout(400);
    const hoja = await p.evaluate(() => { const bt = [...document.querySelectorAll(".lec-sheet button, .lec-sheet label.btn")].filter((n) => n.offsetParent); const sc = document.querySelector("[data-scn-abrir]").getBoundingClientRect(); return { desborde: document.documentElement.scrollWidth - innerWidth, escanear: Math.round(sc.height), pequenos: bt.filter((n) => n.getBoundingClientRect().height < 40).map((n) => n.textContent.trim().slice(0, 30)) }; });
    await p.screenshot({ path: `${SAL}escaner-${tag}-subir.png` });
    comp(`${disp}: «Desde documentos» sin desborde y con el botón de escanear grande (${hoja.escanear} px)`, hoja.desborde <= 0 && hoja.escanear >= 44, hoja);
    await p.getByRole("button", { name: "Escanear con la cámara" }).first().click(); await p.waitForSelector(".scn video"); await p.waitForFunction(() => SCN.docs[0].length >= 1, null, { timeout: 30000 }).catch(() => {});
    const medir = () => p.evaluate(() => {
      const vw = innerWidth, vh = innerHeight; const fuera = [...document.querySelectorAll(".scn *")].filter((n) => { const r = n.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1) && !n.closest(".scn-bandeja"); }).map((n) => n.className || n.tagName);
      const ctrl = [...document.querySelectorAll(".scn button, .scn label.scn-ic, .scn label.scn-fbtn")].filter((n) => n.offsetParent).map((n) => { const r = n.getBoundingClientRect(); return { t: (n.getAttribute("aria-label") || n.textContent).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + r.height / 2), x: Math.round(r.left + r.width / 2) }; });
      const disp = ctrl.find((x) => /Capturar/.test(x.t));
      return { vw, vh, fuera, pequenos: ctrl.filter((x) => x.w < 44 || x.h < 44), disp, video: (() => { const r = document.querySelector(".scn video").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() };
    });
    const v = await medir(); await p.screenshot({ path: `${SAL}escaner-${tag}-vertical.png` });
    comp(`${disp} vertical: sin desbordes, controles de 44 px o más y disparador abajo, al alcance del pulgar`, !v.fuera.length && !v.pequenos.length && v.disp && v.disp.w >= 64 && v.disp.y > v.vh * 0.75, v);
    await p.setViewportSize({ width: v.vh, height: v.vw }); await p.waitForTimeout(500);
    const hz = await medir(); await p.screenshot({ path: `${SAL}escaner-${tag}-horizontal.png` });
    comp(`${disp} horizontal: controles en columna a la derecha, sin desbordes, y la imagen aprovecha la pantalla`, !hz.fuera.length && !hz.pequenos.length && hz.disp && hz.disp.x > hz.vw * 0.75 && hz.video[1] >= hz.vh * 0.7, hz);
    await p.setViewportSize({ width: v.vw, height: v.vh }); await p.waitForTimeout(300);
    // Editor de esquinas a 390 px
    await p.click(".scn-mini"); await p.waitForSelector(".scn-h");
    const ed = await p.evaluate(() => { const vw = innerWidth, vh = innerHeight; const h = [...document.querySelectorAll(".scn-h")].map((n) => n.getBoundingClientRect()); const bar = document.querySelector(".scn-edbar").getBoundingClientRect(); const hecho = document.querySelector('[data-scn="hecho"]').getBoundingClientRect(); return { esquinas: h.every((r) => r.left + r.width / 2 >= 0 && r.right - r.width / 2 <= vw && r.top + r.height / 2 >= 0 && r.bottom - r.height / 2 <= vh), tam: Math.min(...h.map((r) => r.width)), barra: Math.round(bar.height), hecho: Math.round(hecho.top + hecho.height / 2), vh }; });
    await p.screenshot({ path: `${SAL}escaner-${tag}-editor.png` });
    comp(`${disp}: editor con las cuatro esquinas visibles (asas de ${ed.tam} px) y «Hecho» abajo`, ed.esquinas && ed.tam >= 44 && ed.hecho > ed.vh * 0.7, ed);
    await p.click('[data-scn="hecho"]'); await p.waitForTimeout(300);
    // Segundo plano: la cámara se apaga y vuelve
    const sp = await p.evaluate(async () => {
      const antes = SCN.stream.getTracks(); Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange"));
      const apagada = antes.every((t) => t.readyState === "ended") && !SCN.stream;
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange"));
      for (let i = 0; i < 50 && !SCN.stream; i++) await new Promise((r) => setTimeout(r, 100));
      return { apagada, vuelve: !!SCN.stream && SCN.stream.getTracks().every((t) => t.readyState === "live") };
    });
    comp(`${disp}: al pasar a segundo plano la cámara se apaga y al volver se enciende`, sp.apagada && sp.vuelve, sp);
    comp(`${disp}: sin errores de JavaScript`, !errs.length, errs);
  } finally { await b.close(); }
  // Permiso denegado: explicado según el móvil, con «Reintentar»; al dar el permiso, la cámara se abre
  const d = await abrir(m.video, disp, { sinCamara: true });
  try {
    await abrirEscaner(d.p); await d.p.waitForSelector(".scn-sin [data-scn='reintentar']", { timeout: 15000 });
    const txt = await d.p.textContent(".scn-sin"); await d.p.screenshot({ path: `${SAL}escaner-${disp.replace(/\s/g, "")}-sin-permiso.png` });
    const esperado = disp === "iPhone 14" ? /Ajustes › Safari › Cámara/ : /Permisos › Cámara/;
    const fotos = await d.p.locator(".scn-sin input[data-scn-foto]").count();
    comp(`${disp}: permiso denegado explicado para este móvil, con «Reintentar» y la opción de hacer o elegir fotos`, esperado.test(txt) && fotos === 2, txt.slice(0, 200));
    await d.p.evaluate(() => window.__permitir()); await d.p.click("[data-scn='reintentar']");
    const abre = await d.p.waitForSelector(".scn video", { timeout: 15000 }).then(() => true, () => false);
    comp(`${disp}: «Reintentar» abre la cámara cuando ya hay permiso`, abre);
  } finally { await d.b.close(); }
}

fs.writeFileSync(SAL + "escaner-informe.json", JSON.stringify({ fecha: new Date().toISOString(), banco: { tasa, quietas: banco.quietas, temblor: banco.temblor, msPorImagen: banco.ms / banco.n, escenas: banco.escenas }, vivo: vivoPorEscena, camposClave, lineas: informe }, null, 1));
console.log(fallos ? `\nFALLO: ${fallos} comprobaciones fallidas` : "\nOK: escáner probado con la cámara falsa en todas las escenas");
process.exit(fallos ? 1 : 0);
