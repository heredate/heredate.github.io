// Prueba de navegador del lector: sube cada juego de documentos de ejemplo a la app, comprueba qué tipo se reconoce en cada archivo, carga
// las propuestas marcadas en un expediente nuevo y verifica que el expediente queda CALCULABLE (calcular(x) da Sucesiones y plusvalía) con
// los datos esperados. Incluye una prueba de seguridad (un .txt con HTML malicioso no debe inyectar nada en la página).
// Además: banco de escaneos difíciles (campos clave recuperados antes y después del procesado del escáner), formatos (correo, Excel, web,
// RTF, OpenDocument, CSV, TIFF, EXIF, PDF con contraseña, formulario, PDF mixto, HEIC) y el escáner con una cámara falsa de Chromium.
// Variables: SOLO=casos|banco|formatos|escaner (solo esa parte) · BANCO=completo (43 fotos) · FILTRO=<expresión> (fotos del banco) · DETALLE=1
// Uso:  python3 -m http.server 8771   (desde la raíz del repositorio, con la app construida: python3 src/build.py)
//       node tools/ejemplos/generar.mjs            (crea tools/ejemplos/salida)
//       node tools/ejemplos/prueba.mjs [carpeta de ejemplos] [puerto]
// Sale con código 1 si algo falla. Requiere Playwright con Chromium (ruta del entorno de desarrollo; cámbiala si hace falta).
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
const DIR = path.resolve(process.argv[2] || new URL("./salida/", import.meta.url).pathname) + "/";
const URL_APP = `http://127.0.0.1:${process.argv[3] || 8771}/app/`;
const AJENOS = /carta|nomina/i; // documentos que deben quedar como «desconocido»
const lista = (d) => fs.readdirSync(d).filter((f) => !f.startsWith("_") && !/\.(zip)$/i.test(f) && !/^LEEME/i.test(f) && fs.statSync(d + f).isFile()).sort().map((f) => d + f);
const casos = fs.readdirSync(DIR).filter((d) => /^caso\d/.test(d) && fs.statSync(DIR + d).isDirectory()).sort();
if (!casos.length) { console.error(`No hay casos en ${DIR}: ejecuta antes node tools/ejemplos/generar.mjs`); process.exit(1); }

// Lo que debe quedar en cada expediente (cifras de los documentos ficticios)
const near = (a, b) => Math.abs(Number(a) - b) < 0.6;
const ESPERADO = {
  "caso1-testamento-malaga": (X) => [
    ["fecha 20/04/2026", X.fecha === "2026-04-20"], ["comunidad Andalucía", X.ccaa === "AND"], ["gananciales", X.civil === "gananciales"], ["testamento: usufructo", X.testamento === "usufructo"],
    ["6 personas con parentesco", X.personas.length === 6 && X.personas.every((p) => p.relacion && p.relacion !== "extrano")], ["edad de cónyuge e hijos", X.personas.filter((p) => p.edad).length >= 5],
    ["vivienda Larios: valor de referencia, VC, suelo, adquisición, municipio", (() => { const b = X.bienes.find((b) => b.refCatastral === "1234567VK4713S0001OQ"); return b && b.tipo === "vivienda" && near(b.valor, 182400) && near(b.valorReferencia, 182400) && near(b.valorCatastralTotal, 140000) && near(b.valorCatastralSuelo, 60000) && b.fechaAdq === "1995-05-10" && near(b.valorAdq, 72121.45) && b.muniIne; })()],
    ["garaje Torremolinos: valor de referencia y título 2004", (() => { const b = X.bienes.find((b) => b.refCatastral === "9876543UF6597N0012GR"); return b && near(b.valor, 21300) && b.fechaAdq === "2004-01-04" && near(b.valorAdq, 9000) && near(b.valorCatastralSuelo, 8000) && b.muniIne; })()],
    ["cuentas sin duplicar (datos fiscales + bancos)", X.bienes.filter((b) => b.iban === "ES2121030000123456789012").length === 1 && near(X.bienes.find((b) => b.iban === "ES2121030000123456789012").valor, 38500)],
    ["fondo Unifond una vez, valor del banco", X.bienes.filter((b) => /unifond/i.test(b.descripcion)).length === 1 && near(X.bienes.find((b) => /unifond/i.test(b.descripcion)).valor, 45000)],
    ["acciones de Telefónica (solo en datos fiscales)", X.bienes.some((b) => b.isin === "ES0178430E18" && near(b.valor, 7740))],
    ["gasto del funeral", X.gastos.some((g) => near(g.importe, 3872))],
    ["11 bienes, sin duplicados", X.bienes.length === 11],
  ],
  "caso2-intestada-torremolinos": (X) => [
    ["fecha 03/02/2026", X.fecha === "2026-02-03"], ["comunidad Andalucía", X.ccaa === "AND"], ["sin testamento", X.testamento === "no"], ["viuda", X.civil === "viudo"],
    ["herederos: 2 hijos y 2 nietos", X.personas.filter((p) => p.relacion === "hijo").length === 2 && X.personas.filter((p) => p.relacion === "nieto").length === 2],
    ["vivienda Torremolinos: valor de referencia y VC", (() => { const b = X.bienes.find((b) => b.refCatastral === "9876543UF6597N0002IB"); return b && near(b.valor, 148900) && near(b.valorCatastralSuelo, 27500) && b.muniIne; })()],
    ["Altea: valor de referencia y compraventa 2003", (() => { const b = X.bienes.find((b) => b.refCatastral === "5555555YH5755N0012HA"); return b && near(b.valor, 131700) && b.fechaAdq === "2003-07-15" && near(b.valorAdq, 96000) && near(b.valorCatastralSuelo, 31000); })()],
  ],
  "caso3-capitulaciones-madrid": (X) => [
    ["fecha 15/03/2026", X.fecha === "2026-03-15"], ["comunidad de Madrid", X.ccaa === "MAD"], ["separación de bienes (capitulaciones mandan)", X.civil === "separacion"], ["testamento: usufructo", X.testamento === "usufructo"],
    ["cónyuge y dos hijos con edad", X.personas.some((p) => p.relacion === "conyuge" && /Fernando/.test(p.nombre) && p.edad) && X.personas.filter((p) => p.relacion === "hijo" && p.edad).length === 2],
    ["Almagro: vivienda habitual con valor de referencia", (() => { const b = X.bienes.find((b) => b.refCatastral === "0847105VK4704F0012IA"); return b && b.tipo === "vivienda" && near(b.valor, 412300) && near(b.valorCatastralSuelo, 98000) && b.fechaAdq === "1995-06-14" && b.muniIne; })()],
    ["Áncora: arrendado, no vivienda habitual, sin valor", (() => { const b = X.bienes.find((b) => b.refCatastral === "1528302VK4712H0007TB"); return b && b.tipo === "inmueble" && b.arrendadoOCedido && b.arrendamiento && near(b.arrendamiento.renta, 950) && !Number(b.valor); })()],
    ["rústica: valor de referencia, sin suelo de plusvalía", (() => { const b = X.bienes.find((b) => b.refCatastral === "40080A008001120000JZ"); return b && b.rustico && near(b.valor, 9870) && !b.valorCatastralSuelo; })()],
    ["cuenta y fondo con el saldo del banco", X.bienes.some((b) => b.iban === "ES1201280010910123456789" && near(b.valor, 26912.4)) && X.bienes.filter((b) => /corto plazo/i.test(b.descripcion)).length === 1 && near(X.bienes.find((b) => /corto plazo/i.test(b.descripcion)).valor, 15402.33)],
    ["acciones con la valoración del certificado", near(X.bienes.find((b) => b.isin === "ES0144580Y14")?.valor, 22275) && near(X.bienes.find((b) => b.isin === "ES0113900J37")?.valor, 18360)],
    ["participaciones: 50 % del patrimonio neto", X.bienes.some((b) => b.tipo === "empresa" && near(b.valor, 92150))],
    ["una sola deuda: saldo del préstamo", X.deudas.length === 1 && near(X.deudas[0].importe, 48213.77)],
    ["gastos: funeral y clínica", X.gastos.some((g) => near(g.importe, 4235)) && X.gastos.some((g) => near(g.importe, 2860.5))],
    ["plan de pensiones informativo", (X.planesPensiones || []).length === 1 && !X.bienes.some((b) => /pensiones/i.test(b.descripcion))],
  ],
};

const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
// SOLO=banco | SOLO=casos | SOLO=escaner: ejecuta solo esa parte (para iterar); BANCO=completo: las 43 fotos del banco de escaneos difíciles
const SOLO = process.env.SOLO || "";
const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
let fallos = 0; const resumen = [];
const abrirLector = async () => {
  await pg.goto(URL_APP); await pg.waitForTimeout(800);
  await pg.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); if (!document.querySelector('[data-act="lecNuevo"]')) go({ vista: "inicio", sheet: null }); });
  await pg.waitForSelector('[data-act="lecNuevo"]', { timeout: 10000 });
  await pg.click('[data-act="lecNuevo"]'); await pg.waitForTimeout(300);
};
for (const caso of SOLO && SOLO !== "casos" ? [] : casos) {
  const files = lista(DIR + caso + "/");
  console.log(`\n═══ ${caso} · ${files.length} archivos ═══`);
  await abrirLector();
  const t0 = Date.now();
  await pg.setInputFiles("input[data-lecnuevo]", files);
  await pg.waitForSelector(".lec-sheet .lec-row, .lec-sheet .empty", { timeout: 900000 });
  await pg.waitForTimeout(300);
  const R = await pg.evaluate(() => ({ docs: LEC.resultado.docs.map((d) => [d.nombre, d.tipo, d.escaneado ? "OCR" : d.formato || "texto", d.datos.avisos]), props: LEC.resultado.propuestas.map((p) => [p.grupo, p.etiqueta, p.mostrar.slice(0, 140), p.conf, p.on ? "✓" : "–", p.doc]) }));
  console.log(`lectura: ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const d of R.docs) { const mal = d[1] === "desconocido" && !AJENOS.test(d[0]); if (mal) fallos++; console.log((mal ? "✗ " : "  ") + d[0], "→", d[1], `(${d[2]})`); if (process.env.DETALLE) for (const a of d[3]) console.log("       ·", a.slice(0, 170)); }
  if (process.env.DETALLE) for (const p of R.props) console.log("   ", p.join(" | "));
  await pg.click('[data-act="lecAplicar"]'); await pg.waitForTimeout(800);
  const X = await pg.evaluate(() => {
    const x = DB.expedientes[0]; const r = calcular(x);
    return { fecha: x.fecha, ccaa: x.ccaa, civil: x.civil, testamento: x.testamento, personas: x.personas.map((p) => ({ nombre: p.nombre, relacion: p.relacion, edad: p.edad })), bienes: x.bienes.map(({ id, ...q }) => q), deudas: x.deudas, gastos: x.gastos || [], planesPensiones: x.planesPensiones,
      R: r && { bruto: r.isd.masa.bruto, neto: r.isd.masa.neto, herederos: r.isd.herederos.length, isd: r.isd.herederos.reduce((s, h) => s + h.aIngresar, 0), plus: r.plus.map((q) => [q.b.descripcion.slice(0, 40), q.r.metodo, q.r.cuota, q.r.total]), totalPlus: r.totalPlus } };
  });
  const dup = (k) => { const v = X.bienes.map((q) => q[k]).filter(Boolean); return v.length !== new Set(v).size; };
  const checks = [["calcular(x) devuelve resultado", !!X.R], ["ningún bien repetido (IBAN, referencia catastral, ISIN, matrícula)", !["iban", "refCatastral", "isin", "matricula"].some(dup)], ["Sucesiones calculado con herederos", X.R && X.R.herederos > 0 && X.R.bruto > 0], ["plusvalía calculada en algún inmueble", X.R && X.R.plus.some((q) => q[1] !== "no sujeto" && q[3] > 0)], ...(ESPERADO[caso] ? ESPERADO[caso](X) : []),
    // Las fotos (torcidas, con poco contraste) aportan datos: su nombre figura en alguna propuesta marcada
    ...R.docs.filter((d) => /\.jpe?g$/i.test(d[0])).map((d) => [`foto leída y aprovechada: ${d[0]}`, d[1] !== "desconocido" && R.props.some((p) => p[5].includes(d[0]) && p[4] === "✓")])];
  for (const [n, ok] of checks) { if (!ok) fallos++; console.log(`  ${ok ? "✓" : "✗"} ${n}`); }
  const eu = (v) => Math.round(v).toLocaleString("es-ES") + " €";
  if (X.R) { const lin = `${caso}: ${X.personas.length} personas, ${X.bienes.length} bienes, ${X.deudas.length} deudas, ${X.gastos.length} gastos · caudal bruto ${eu(X.R.bruto)}, neto ${eu(X.R.neto)} · Sucesiones ${eu(X.R.isd)} (${X.R.herederos} herederos) · plusvalía ${eu(X.R.totalPlus)} en ${X.R.plus.filter((q) => q[1] !== "no sujeto").length} de ${X.R.plus.length} inmuebles`; resumen.push(lin); console.log("  " + lin); for (const q of X.R.plus) console.log("     plusvalía:", q.join(" · ")); }
  if (process.env.DETALLE) console.log(JSON.stringify(X, null, 1));
}

// ── Banco de escaneos difíciles: qué parte de los datos clave se recupera de cada foto antes (lectura tal cual, como en la versión 1.4) y
// después del procesado del escáner (localizar el papel, perspectiva, realce, giro, doble página). Por defecto, dos documentos en todas las
// condiciones y la doble página; con BANCO=completo, los seis documentos
const BANCO_RES = [];
if (!SOLO || SOLO === "banco") {
  const BD = DIR + "banco/"; const ESP = JSON.parse(fs.readFileSync(BD + "esperado.json", "utf8"));
  const fotos = Object.keys(ESP).filter((n) => (process.env.BANCO === "completo" || /^(defuncion|catastro)-|doblepagina/.test(n)) && (!process.env.FILTRO || new RegExp(process.env.FILTRO).test(n)));
  console.log(`\n═══ banco de escaneos difíciles · ${fotos.length} fotos ═══`);
  await abrirLector();
  const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const n of fotos) {
    const data = fs.readFileSync(BD + n).toString("base64"); const fila = { n, escena: ESP[n].escena, doc: ESP[n].doc, total: ESP[n].claves.length };
    for (const modo of ["antes", "despues"]) {
      const r = await pg.evaluate(async ({ data, n, basico }) => {
        const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)); LEC.basico = basico; const t0 = performance.now();
        try { const r = await lecTexto(new File([bin], n, { type: "image/jpeg" })); const T = r.texto.split("\f"); const D = T.map((t) => lecAnalizar(t, "foto.jpg")); if (T.length > 1) D.push(lecAnalizar(r.texto, "foto.jpg"));
          const vals = D.flatMap((d) => [...d.campos.map((c) => (typeof c.valor === "object" ? JSON.stringify(c.valor) : c.valor)), ...d.personas.flatMap((p) => [p.nombre, p.nif]), ...d.bienes.flatMap((q) => [q.descripcion, q.valor, q.refCatastral, q.iban, q.valorCatastralTotal, q.valorCatastralSuelo, q.valorReferencia])]).filter((v) => v != null && v !== "").map(String);
          return { vals, ms: performance.now() - t0, tipos: D.map((d) => d.tipo), avisos: r.avisos };
        } finally { LEC.basico = false; }
      }, { data, n, basico: modo === "antes" });
      const V = r.vals.map(norm); const ok = ESP[n].claves.filter((k) => { const q = norm(k); return /^\d+$/.test(q) ? V.some((v) => new RegExp(`(^|[^\\d])${q}([^\\d]|$)`).test(v)) : V.some((v) => v.includes(q)); });
      fila[modo] = ok.length; fila[modo + "Ms"] = Math.round(r.ms); if (modo === "despues") { fila.avisos = r.avisos; fila.faltan = ESP[n].claves.filter((k) => !ok.includes(k)); }
    }
    BANCO_RES.push(fila); console.log(`  ${n.padEnd(40)} antes ${fila.antes}/${fila.total} · después ${fila.despues}/${fila.total}  (${(fila.despuesMs / 1000).toFixed(1)} s)${process.env.DETALLE ? "  faltan: " + fila.faltan.join(", ") : ""}`);
  }
  const pct = (k, F = BANCO_RES) => Math.round(F.reduce((s, f) => s + f[k], 0) / F.reduce((s, f) => s + f.total, 0) * 100);
  const escenas = [...new Set(BANCO_RES.map((f) => f.escena))];
  console.log("  por condición:"); for (const e of escenas) { const F = BANCO_RES.filter((f) => f.escena === e); console.log(`    ${e.padEnd(16)} antes ${String(pct("antes", F)).padStart(3)} % → después ${String(pct("despues", F)).padStart(3)} %`); }
  const A = pct("antes"), Dp = pct("despues"); console.log(`  TOTAL campos clave recuperados: antes ${A} % → después ${Dp} %`);
  const okB = Dp >= 80 && Dp >= A; if (!okB) fallos++; console.log(`  ${okB ? "✓" : "✗"} el procesado recupera al menos el 80 % de los campos clave y no empeora ninguna medida global`);
  resumen.push(`banco de escaneos difíciles (${BANCO_RES.length} fotos): campos clave recuperados antes ${A} % → después ${Dp} %`);
}

// ── Formatos: correo con adjuntos, Excel, web guardada, RTF, OpenDocument, CSV, TIFF de escáner, foto con EXIF, PDF con contraseña (se
// prueba una contraseña errónea y la buena), formulario PDF rellenado, PDF con carátula de texto y páginas escaneadas, foto HEIC del iPhone
if (!SOLO || SOLO === "formatos") {
  const FD = DIR + "formatos/"; const ESP = JSON.parse(fs.readFileSync(FD + "esperado.json", "utf8"));
  console.log(`\n═══ formatos · ${Object.keys(ESP).length} archivos ═══`);
  await abrirLector();
  const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const MIME = { pdf: "application/pdf", eml: "message/rfc822", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", html: "text/html", rtf: "application/rtf", odt: "application/vnd.oasis.opendocument.text", csv: "text/csv", tif: "image/tiff", jpg: "image/jpeg", heic: "" };
  for (const [n, e] of Object.entries(ESP)) {
    const data = fs.readFileSync(FD + n).toString("base64"); const t0 = Date.now();
    const prom = pg.evaluate(async ({ data, n, tipo }) => { const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)); const R = await lecLeerArchivos([new File([bin], n, { type: tipo })]);
      return R.map((d) => ({ nombre: d.nombre, tipo: d.tipo, formato: d.formato, avisos: d.datos.avisos, vals: [...d.datos.campos.map((c) => (typeof c.valor === "object" ? JSON.stringify(c.valor) : c.valor)), ...(d.datos.personas || []).flatMap((p) => [p.nombre, p.nif]), ...(d.datos.bienes || []).flatMap((q) => [q.descripcion, q.valor, q.refCatastral, q.iban, q.valorCatastralTotal, q.valorCatastralSuelo, q.valorReferencia, q.muniNombre])].filter((v) => v != null && v !== "").map(String) })); }, { data, n, tipo: MIME[n.split(".").pop()] ?? "" });
    let clave = "";
    if (e.clave) { // primero una contraseña errónea; después, la buena
      await pg.waitForSelector("#lec-clave-in", { timeout: 60000 }); await pg.fill("#lec-clave-in", "0000"); await pg.keyboard.press("Enter");
      await pg.waitForSelector(".lec-clave-mal", { timeout: 20000 }); clave = "contraseña errónea avisada; "; await pg.fill("#lec-clave-in", e.clave); await pg.keyboard.press("Enter");
    }
    const R = await prom; const V = R.flatMap((d) => d.vals).map(norm);
    const ok = e.claves.filter((k) => { const q = norm(k); return /^\d+(\.\d+)?$/.test(q) ? V.some((v) => new RegExp(`(^|[^\\d.])${q.replace(".", "\\.")}([^\\d]|$)`).test(v)) : V.some((v) => v.includes(q)); });
    const tipoOk = R[0].tipo === e.tipo && (!e.adjunto || R.some((d) => / › /.test(d.nombre) && d.tipo === e.adjunto));
    const bien = tipoOk && ok.length === e.claves.length; if (!bien) fallos++;
    console.log(`  ${bien ? "✓" : "✗"} ${n.padEnd(44)} → ${R.map((d) => d.tipo + (d.formato ? " (" + d.formato + ")" : "")).join(" + ")} · ${ok.length}/${e.claves.length} datos clave · ${clave}${Math.round((Date.now() - t0) / 1000)} s${bien ? "" : "  faltan: " + e.claves.filter((k) => !ok.includes(k)).join(", ") + " · " + JSON.stringify(R.map((d) => d.avisos)).slice(0, 300)}`);
  }
  // PDF con contraseña: «Omitir» deja el documento archivado con un aviso claro
  { const data = fs.readFileSync(FD + "certificado-caixabank-con-contrasena.pdf").toString("base64");
    const prom = pg.evaluate(async ({ data }) => { const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)); const R = await lecLeerArchivos([new File([bin], "protegido.pdf", { type: "application/pdf" })]); return R[0].datos.avisos; }, { data });
    await pg.waitForSelector("#lec-clave-in"); const foco = await pg.evaluate(() => document.activeElement && document.activeElement.id); await pg.keyboard.press("Escape"); const av = await prom;
    const okP = foco === "lec-clave-in" && av.some((a) => /protegido con contraseña/.test(a)); if (!okP) fallos++; console.log(`  ${okP ? "✓" : "✗"} PDF con contraseña: el foco va a la contraseña y, si se omite, se avisa (${av[0] || ""})`.slice(0, 220)); }
  // El correo dentro de un expediente: el PDF adjunto se archiva como documento propio
  { await abrirLector(); await pg.setInputFiles("input[data-lecnuevo]", [FD + "correo-unicaja-con-certificado.eml"]); await pg.waitForSelector(".lec-sheet .lec-row", { timeout: 120000 }); await pg.waitForTimeout(600);
    const A = await pg.evaluate(() => { const x = DB.expedientes[0]; return ARCH.lista.filter((d) => d.expId === x.id).map((d) => [d.nombre, d.tipo, d.estado]); });
    const okA = A.length === 2 && A.some((d) => /\.eml$/.test(d[0])) && A.some((d) => d[0] === "certificado posición Unicaja.pdf" && d[1] === "application/pdf" && d[2] === "revisar"); if (!okA) fallos++;
    console.log(`  ${okA ? "✓" : "✗"} correo en un expediente: el adjunto PDF queda archivado y marcado «por revisar» ${okA ? "" : JSON.stringify(A)}`); }
}

// ── Escáner con la cámara: cámara falsa de Chromium que «ve» una foto del banco (certificación catastral en perspectiva sobre una mesa).
// Disparo automático, editor de esquinas con el teclado, fotos añadidas, dos documentos, PDF archivado y leído; y sin permiso de cámara, la
// alternativa de la foto con el mismo procesado
if (!SOLO || SOLO === "escaner") {
  console.log("\n═══ escáner con la cámara ═══");
  const y4m = DIR + "_camara.y4m";
  { // vídeo Y4M (YUV 4:2:0) de la foto, sin dependencias: se convierte en el propio navegador
    const p0 = await b.newPage(); const jpg = fs.readFileSync(DIR + "banco/catastro-perspectiva.jpg").toString("base64");
    const r = await p0.evaluate(async (jpg) => { const im = new Image(); im.src = "data:image/jpeg;base64," + jpg; await im.decode(); const W = 720, H = 960, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(im, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
      const Y = new Uint8Array(W * H), U = new Uint8Array(W * H / 4), V = new Uint8Array(W * H / 4);
      for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W; x2++) { const i = (y * W + x2) * 4; Y[y * W + x2] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (!(y % 2) && !(x2 % 2)) { const k = (y / 2) * (W / 2) + x2 / 2; U[k] = 128 - 0.1687 * d[i] - 0.3313 * d[i + 1] + 0.5 * d[i + 2]; V[k] = 128 + 0.5 * d[i] - 0.4187 * d[i + 1] - 0.0813 * d[i + 2]; } }
      const all = new Uint8Array(W * H * 1.5); all.set(Y); all.set(U, W * H); all.set(V, W * H * 1.25); let s = ""; for (let i = 0; i < all.length; i += 32768) s += String.fromCharCode.apply(null, all.subarray(i, i + 32768)); return { W, H, b64: btoa(s) }; }, jpg);
    const frame = Buffer.from(r.b64, "base64"); fs.writeFileSync(y4m, Buffer.concat([Buffer.from(`YUV4MPEG2 W${r.W} H${r.H} F10:1 Ip A1:1 C420jpeg\n`), Buffer.from("FRAME\n"), frame, Buffer.from("FRAME\n"), frame])); await p0.close();
  }
  const bc = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${y4m}`] });
  const ctx = await bc.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ["camera"] }); const pc = await ctx.newPage();
  const errs2 = []; pc.on("pageerror", (e) => errs2.push(e.message)); pc.on("console", (m) => { if (m.type() === "error") errs2.push("console: " + m.text().slice(0, 200)); });
  const comp = (n, ok, extra) => { if (!ok) fallos++; console.log(`  ${ok ? "✓" : "✗"} ${n}${!ok && extra !== undefined ? " " + JSON.stringify(extra).slice(0, 300) : ""}`); };
  await pc.goto(URL_APP); await pc.waitForTimeout(800); await pc.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); go({ vista: "inicio", sheet: null }); });
  await pc.click('[data-act="lecNuevo"]'); await pc.waitForTimeout(300);
  const boton = pc.getByRole("button", { name: "Escanear con la cámara" }); comp("botón «Escanear con la cámara» en «Desde documentos»", (await boton.count()) === 1);
  await boton.click(); await pc.waitForSelector(".scn video");
  const marco = await pc.waitForFunction(() => (document.querySelector(".scn-marco polygon")?.getAttribute("points") || "").split(" ").length === 4, null, { timeout: 15000 }).then(() => true, () => false);
  comp("detecta el documento en el vídeo y dibuja el marco", marco);
  const auto = await pc.waitForSelector(".scn-mini img", { timeout: 30000 }).then(() => true, () => false);
  comp("dispara solo cuando el documento está quieto y procesa la página", auto);
  const pag1 = await pc.evaluate(() => { const p = SCN.docs[0][0]; return p && { q: p.quad, rw: p.rw, rh: p.rh }; });
  comp("la página capturada sale recortada y enderezada (proporción de folio)", pag1 && pag1.q && Math.abs(pag1.rh / pag1.rw - Math.SQRT2) < 0.1, pag1);
  await pc.click(".scn-mini"); await pc.waitForSelector(".scn-h");
  const h0 = await pc.locator('.scn-h[data-scn-h="0"]').getAttribute("style"); await pc.focus('.scn-h[data-scn-h="0"]'); await pc.keyboard.press("Shift+ArrowRight"); await pc.keyboard.press("ArrowDown");
  const h1 = await pc.locator('.scn-h[data-scn-h="0"]').getAttribute("style");
  const caben = await pc.evaluate(() => [...document.querySelectorAll(".scn-h")].every((h) => { const r = h.getBoundingClientRect(); return r.left + r.width / 2 >= 0 && r.right - r.width / 2 <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
  comp("editor: cuatro esquinas visibles en el móvil, que se mueven con el teclado", (await pc.locator(".scn-h").count()) === 4 && h0 !== h1 && caben, [h0, h1, caben]);
  await pc.click('[data-scn="girar"]'); await pc.waitForTimeout(200); const giro = await pc.evaluate(() => SCN.docs[0][0].giro);
  await pc.click('[data-scn="hecho"]'); await pc.waitForTimeout(300); comp("girar la página", giro === 90, giro);
  await pc.click('[data-scn="auto"]'); // manual: que no dispare más mientras se añaden fotos
  await pc.setInputFiles(".scn-ctrl input[data-scn-foto]", [DIR + "banco/catastro-sombra.jpg"]); // segunda página del mismo documento await pc.waitForFunction(() => SCN.docs[0].length === 2 && SCN.docs[0][1].res, null, { timeout: 30000 });
  await pc.click('[data-scn="nuevo"]'); await pc.setInputFiles(".scn-ctrl input[data-scn-foto]", [DIR + "banco/nota-sombra.jpg"]); await pc.waitForFunction(() => SCN.docs.length === 2 && SCN.docs[1].length === 1 && SCN.docs[1][0].res, null, { timeout: 30000 });
  // la primera página volvía girada 90°: se deja derecha otra vez para leerla
  await pc.evaluate(() => { const p = SCN.docs[0][0]; p.giro = 0; scnReprocesar(p); }); await pc.waitForFunction(() => !!SCN.docs[0][0].res, null, { timeout: 30000 });
  await pc.keyboard.press("Escape"); const conf = await pc.locator(".scn-conf").count(); await pc.click('[data-scn="seguir"]');
  comp("Escape con páginas sin guardar pide confirmación", conf === 1);
  await pc.click('[data-scn="terminar"]');
  await pc.waitForSelector(".lec-sheet .lec-row", { timeout: 300000 }); await pc.waitForTimeout(500);
  const R = await pc.evaluate(async () => { const x = DB.expedientes[0]; const A = ARCH.lista.filter((d) => d.expId === x.id); const pdf = await lecPdfLib(); const n = []; for (const d of A) { const doc = await pdf.getDocument({ data: new Uint8Array(await d._b.arrayBuffer()) }).promise; n.push(doc.numPages); } return { docs: LEC.resultado.docs.map((d) => [d.nombre, d.tipo, d.formato, d.paginas]), arch: A.map((d) => [d.nombre, d.tipo]), paginas: n, abierto: !!document.querySelector(".scn") }; });
  comp("dos documentos: PDF de 2 y 1 páginas archivados en el expediente nuevo", R.arch.length === 2 && R.arch.every((a) => /^Escaneo .*\(\d\)\.pdf$/.test(a[0]) && a[1] === "application/pdf") && R.paginas.sort().join() === "1,2" && !R.abierto, R);
  comp("leídos con el reconocimiento de texto: catastro y nota simple", R.docs.some((d) => d[1] === "catastro" && d[2] === "escaneado con la cámara" && d[3] === 2) && R.docs.some((d) => d[1] === "notasimple"), R.docs);
  await ctx.close();
  // Sin permiso de cámara: la alternativa de la foto (input con capture), dentro de Documentos de un expediente
  const ctx2 = await bc.newContext({ viewport: { width: 1280, height: 860 } }); const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => errs2.push(e.message));
  await p2.addInitScript(() => { if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denegado", "NotAllowedError")); });
  await p2.goto(URL_APP); await p2.waitForTimeout(800);
  await p2.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); const x = { id: "scnprueba", creado: hoy(), nombre: "Prueba escáner", fecha: "2026-04-20", ccaa: "AND", civil: "", testamento: "", personas: [], bienes: [], deudas: [], gastos: [], situ: {}, tramites: {}, fase: "documentacion", despacho: {}, bitacora: [] }; DB.expedientes.unshift(x); guardar(); go({ vista: "exp", id: x.id, sec: "documentos", sheet: null }); });
  await p2.waitForTimeout(600); const b2 = p2.getByRole("button", { name: "Escanear con la cámara" }).first(); comp("botón en Documentos del expediente", (await b2.count()) === 1);
  await b2.click(); await p2.waitForSelector('.scn-sin input[capture="environment"]', { timeout: 10000 });
  const motivo = await p2.textContent(".scn-sin"); comp("sin permiso de cámara: lo explica y ofrece hacer o elegir fotos", /permiso/.test(motivo), motivo.slice(0, 120));
  await p2.setInputFiles('.scn-sin input[data-scn-foto]:not([capture])', [DIR + "banco/catastro-perspectiva.jpg"]); await p2.waitForFunction(() => SCN.docs[0].length === 1 && SCN.docs[0][0].res, null, { timeout: 30000 });
  await p2.click('[data-scn="terminar"]'); await p2.waitForSelector(".lec-sheet .lec-row", { timeout: 300000 });
  const R2 = await p2.evaluate(() => ({ arch: ARCH.lista.filter((d) => d.expId === "scnprueba").map((d) => d.nombre), docs: LEC.resultado.docs.map((d) => d.tipo), rc: LEC.resultado.docs.some((d) => d.datos.bienes.some((b) => b.refCatastral === "1234567VK4713S0001OQ")), props: LEC.resultado.propuestas.map((p) => p.etiqueta + ": " + p.mostrar.slice(0, 80)) }));
  comp("la foto se archiva como PDF en el expediente y se lee (referencia catastral propuesta)", R2.arch.length === 1 && /\.pdf$/.test(R2.arch[0]) && R2.docs[0] === "catastro" && R2.rc, R2);
  await bc.close(); fs.rmSync(y4m, { force: true });
  comp("sin errores de consola en el escáner", !errs2.length, errs2);
}

// Seguridad: un .txt con HTML no se ejecuta ni se pinta como HTML en la hoja ni en el resumen del expediente
if (!SOLO || SOLO === "casos") {
  console.log("\n═══ seguridad ═══");
  const tmp = DIR + "_malicioso.txt", tmp2 = DIR + "_malicioso-nota.txt", tmp3 = DIR + "_malicioso-banco.txt";
  fs.writeFileSync(tmp, `REGISTRO CIVIL DE MÁLAGA · CERTIFICADO DE INSCRIPCIÓN DE DEFUNCIÓN\nNombre: ANTONIO<img src=x onerror="window.__xss=1"> Primer apellido: PÉREZ Segundo apellido: <script>window.__xss=2</script>GIL\nDNI: 25123456G\nFecha de defunción: 20/04/2026\nLugar de defunción: Málaga<svg onload="window.__xss=3">\n`);
  fs.writeFileSync(tmp2, `REGISTRO DE LA PROPIEDAD DE MÁLAGA · NOTA SIMPLE INFORMATIVA\nFINCA DE MÁLAGA Nº 999\nURBANA: VIVIENDA <img src=x onerror="window.__xss=4"> en calle Larios número doce de Málaga. Referencia catastral 1234567VK4713S0001OQ.\nTITULARIDAD: DON ANTONIO PÉREZ GIL, con N.I.F. 25123456G, titular del pleno dominio de la totalidad con carácter privativo.\nCARGAS: Libre de cargas.\n`);
  fs.writeFileSync(tmp3, `UNICAJA BANCO · CERTIFICADO DE POSICIONES A FECHA DE FALLECIMIENTO\nFondo de inversión <b onmouseover="window.__xss=5">Malo</b> FI 1.000,00 €\nCuenta corriente ES21 2103 0000 1234 5678 9099 2.500,00 €\n`);
  await abrirLector();
  await pg.setInputFiles("input[data-lecnuevo]", [tmp, tmp2, tmp3]);
  await pg.waitForSelector(".lec-sheet .lec-row, .lec-sheet .empty", { timeout: 60000 });
  const s1 = await pg.evaluate(() => ({ xss: window.__xss, img: !!document.querySelector(".lec-sheet img[src='x'], .lec-sheet script, .lec-sheet svg[onload]") }));
  await pg.click('[data-act="lecAplicar"]').catch(() => {}); await pg.waitForTimeout(600);
  // Todas las secciones del expediente, con los datos leídos ya cargados
  const secs = await pg.evaluate(() => (typeof SECCIONES === "function" ? SECCIONES().map((q) => q[0]) : ["resumen"]));
  const s2 = { xss: undefined, img: false, secciones: secs.length, cargado: await pg.evaluate(() => JSON.stringify(DB.expedientes[0]).match(/<img|<b |<svg|<script/g)?.length || 0) };
  for (const sec of secs) {
    await pg.evaluate((sec) => { const x = DB.expedientes[0]; go({ vista: "exp", id: x.id, sec, sheet: null }); }, sec); await pg.waitForTimeout(250);
    const r = await pg.evaluate(() => ({ xss: window.__xss, img: !!document.querySelector("img[src='x'], svg[onload], [onmouseover], script:not([src]):not([type])") && [...document.querySelectorAll("img[src='x'], svg[onload], [onmouseover]")].length > 0 }));
    if (r.xss || r.img) { s2.xss = r.xss; s2.img = true; s2.en = sec; break; }
  }
  for (const f of [tmp, tmp2, tmp3]) fs.rmSync(f);
  const ok = !s1.xss && !s1.img && !s2.xss && !s2.img && s2.cargado > 0; if (!ok) fallos++; // «cargado»: el texto hostil llega de verdad al expediente
  console.log(`  ${ok ? "✓" : "✗"} nada inyectado (hoja: ${JSON.stringify(s1)}, resumen: ${JSON.stringify(s2)})`);
}
await b.close();
console.log("\n" + resumen.join("\n"));
if (errs.length) console.log("errores de consola:", errs);
if (fallos || errs.length) { console.log(`FALLO: ${fallos} comprobaciones fallidas, ${errs.length} errores de consola`); process.exit(1); }
console.log("OK: todos los documentos reconocidos, expedientes calculables y sin errores de consola");
