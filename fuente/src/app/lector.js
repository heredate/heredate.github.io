// ───────────────────── Lector de documentos (prefijo lec) ─────────────────────
// Lee los documentos de la herencia que el despacho archiva (PDF con texto, escaneado o mixto, con contraseña o formulario; fotos JPEG, PNG,
// WebP, HEIC del iPhone y TIFF de escáner; Word .docx, Excel .xlsx, OpenDocument, RTF, páginas web, CSV, texto; correos .eml con sus adjuntos;
// y lo escaneado con la cámara en escaner.js) y propone los datos
// del expediente que salen de ellos, siempre como propuesta que el abogado acepta o descarta. Sin inteligencia artificial: extracción de texto
// (pdf.js; el .docx se descomprime con DecompressionStream), reconocimiento óptico de caracteres de imágenes (Tesseract, en el propio navegador,
// con preprocesado: contraste, enderezado y umbral adaptativo) y reglas escritas sobre la estructura de cada documento oficial. Nada sale del
// ordenador del despacho: las librerías se cargan desde la propia web (carpeta /lib) solo la primera vez que hacen falta.
// Documentos reconocidos (aquí): certificado de defunción, últimas voluntades, seguros de fallecimiento, certificación/consulta catastral (con
// valor de referencia y fincas rústicas) y recibo del IBI, nota simple (una o varias fincas), testamento, DNI/NIE, certificado bancario,
// compraventa, acta de declaración de herederos, libro de familia y certificados de matrimonio o nacimiento, empadronamiento, póliza de vida,
// escritura de herencia anterior, permiso de circulación, modelo 650/660. En lector-tipos.js: datos fiscales de la AEAT, capitulaciones,
// facturas del funeral y de la última enfermedad, préstamos, arrendamientos, valores, planes de pensiones y participaciones sociales.
// Los documentos ajenos (nóminas, cartas, facturas que no son gastos de la herencia) se señalan.
// API: lecTrasArchivar(files, expId) · lecLeerArchivos(files) → [{nombre, tipo, texto, datos}] · lecAnalizar(texto, nombre) → datos
//      lecSheetHTML() · lecDisponible() · lecAplicar(x, seleccion)
const LEC = { pdf: null, ocr: null, ocrCargando: null, estado: null, resultado: null, exp: null };
const LEC_TIPOS = { defuncion: "Certificado de defunción", ultimas: "Certificado de últimas voluntades", seguros: "Certificado de seguros de fallecimiento", herederos: "Acta de declaración de herederos", familia: "Libro de familia", matrimonio: "Certificado de matrimonio", nacimiento: "Certificado de nacimiento", padron: "Certificado de empadronamiento", poliza: "Póliza de seguro de vida", catastro: "Certificación catastral", ibi: "Recibo del IBI", notasimple: "Nota simple del Registro", testamento: "Testamento", dni: "DNI o NIE", bancario: "Certificado bancario de posiciones", compraventa: "Escritura de compraventa", herenciaprevia: "Escritura de herencia anterior (título)", vehiculo: "Permiso de circulación o ficha técnica", modelo650: "Modelo 650/660 del Impuesto de Sucesiones", desconocido: "Documento sin reconocer" };
// Registro de extractores adicionales (módulos lector-*.js): lecRegistrar({ tipo, titulo, huellas: [[/RE/, peso]...], extraer(texto) → { campos, personas, bienes, deudas, gastos, avisos }, nombreArchivo?: /re/ })
const LEC_EXTRA = [];
function lecRegistrar(def) { if (!def || !def.tipo || typeof def.extraer !== "function") return; LEC_TIPOS[def.tipo] = def.titulo || def.tipo; LEC_HUELLAS[def.tipo] = def.huellas || []; LEC_EXTRA.push(def); }
const lecDisponible = () => typeof hayWebPublica === "function" && hayWebPublica() && typeof webURL === "function";

// ── Carga perezosa de las librerías (solo en la web publicada; el archivo único no las lleva) ──
async function lecPdfLib() {
  if (LEC.pdf) return LEC.pdf;
  if (!lecDisponible()) throw new Error("solo-web");
  const m = await import(webURL("/lib/pdf.min.mjs"));
  m.GlobalWorkerOptions.workerSrc = webURL("/lib/pdf.worker.min.mjs");
  LEC.pdf = m; return m;
}
async function lecOcr() {
  if (LEC.ocr) return LEC.ocr;
  if (LEC.ocrCargando) return LEC.ocrCargando;
  if (!lecDisponible()) throw new Error("solo-web");
  LEC.ocrCargando = (async () => {
    const M = await import(webURL("/lib/tesseract.esm.min.js")); const T = M.createWorker ? M : M.default;
    const w = await T.createWorker("spa", 1, { workerPath: webURL("/lib/worker.min.js"), corePath: webURL("/lib/"), langPath: webURL("/lib/"), gzip: true, logger: (m) => { if (m.status && LEC.estado) lecProgreso(`${LEC.estado.base} · ${m.status === "recognizing text" ? "reconociendo texto " + Math.round((m.progress || 0) * 100) + " %" : m.status === "loading language traineddata" ? "cargando el idioma" : m.status === "loading tesseract core" ? "preparando el reconocimiento" : m.status}`); } });
    await w.setParameters({ tessedit_pageseg_mode: "4", preserve_interword_spaces: "1", debug_file: "/dev/null" }); // debug_file: sin los avisos internos («Estimating resolution as…») en la consola (K7) // 4 = columnas de texto de tamaño variable: lee las tablas de los certificados
    LEC.ocr = w; return w;
  })();
  return LEC.ocrCargando;
}

// ── Texto de un archivo ──
// Líneas reconstruidas por posición (misma altura → misma línea), para que «Valor catastral 140.000,00 €» quede junto.
// Límites: un PDF con texto se lee hasta LEC_PAG_TEXTO páginas (escrituras y cuadernos largos); las páginas sin texto (escaneadas), hasta
// LEC_PAG_OCR por imagen (cada una tarda segundos). Si el documento es más largo se avisa de qué páginas se han leído.
// También: PDF con contraseña (se pide), formularios PDF rellenados (los valores de los campos no están en el texto de la página: se leen de
// sus anotaciones y se colocan en su línea), páginas con texto ilegible (fuentes sin mapa de caracteres, capa de texto de un mal reconocimiento
// previo: se leen por imagen), páginas mezcladas (texto y escaneo en el mismo PDF), formularios XFA (aviso) y archivos adjuntos al PDF.
const LEC_PAG_TEXTO = 40, LEC_PAG_OCR = 8;
const LEC_COMUNES = new Set(["de", "la", "el", "en", "y", "que", "los", "del", "las", "por", "con", "se", "su", "al", "para", "una", "un", "no", "es", "lo", "sus", "don", "doña", "fecha", "como", "este", "esta", "euros", "calle", "a", "o", "e"]);
// ¿Texto extraído que no se puede interpretar? Caracteres de uso privado o de control, o palabras sin vocales ni palabras comunes
function lecTextoIlegible(t) {
  const s = String(t || "").replace(/\s+/g, ""); if (s.length < 80) return false;
  const raros = (s.match(/[\u0000-\u0008\u000E-\u001F\uE000-\uF8FF\uFFFD]/g) || []).length; if (raros / s.length > 0.12) return true;
  const W = String(t).toLowerCase().match(/[a-záéíóúñü]+/g) || []; const largas = W.filter((w) => w.length >= 2); if (largas.length < 30) return false;
  const L = largas.join(""); const voc = (L.match(/[aeiouáéíóúü]/g) || []).length / L.length; const com = W.filter((w) => LEC_COMUNES.has(w)).length / W.length;
  return com < 0.03 || voc < 0.22 || voc > 0.72;
}
// Valores de los campos de un formulario PDF (modelos tributarios rellenados en pantalla), como elementos de texto en su posición
async function lecCamposFormulario(pg) {
  try {
    const A = await pg.getAnnotations({ intent: "display" });
    return A.filter((a) => a.subtype === "Widget" && a.fieldType !== "Btn" && a.fieldValue != null && a.rect).map((a) => ({ a, v: String(Array.isArray(a.fieldValue) ? a.fieldValue.join(", ") : a.fieldValue).replace(/\s+/g, " ").trim() })).filter((q) => q.v)
      .map(({ a, v }) => ({ x: a.rect[0] + 1, y: a.rect[1] + Math.max(1, (a.rect[3] - a.rect[1]) * 0.25), h: Math.max(6, Math.min(12, (a.rect[3] - a.rect[1]) * 0.7)), s: v }));
  } catch (e) { return []; }
}
// Contraseña de un PDF protegido: ventana propia, accesible (Intro abre, Escape omite). Devuelve la contraseña o null
function lecPedirClave(nombre, fallida) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  return new Promise((res) => {
    const d = document.createElement("div"); d.className = "lec-clave"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "lec-clave-t");
    d.innerHTML = `<form><h2 id="lec-clave-t">PDF protegido con contraseña</h2><p>${esc(nombre)}</p>${fallida ? `<p class="lec-clave-mal" role="alert">La contraseña no es correcta.</p>` : ""}<label for="lec-clave-in">Contraseña del documento</label><input id="lec-clave-in" type="password" autocomplete="off"><p class="lec-clave-nota">Se usa solo para abrirlo en este ordenador; no se guarda.</p><span><button type="button" class="btn sm gray" data-no="1">Omitir este documento</button><button type="submit" class="btn sm">Abrir</button></span></form>`;
    const fin = (v) => { d.remove(); res(v); };
    d.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); fin(d.querySelector("input").value); });
    d.querySelector("[data-no]").addEventListener("click", () => fin(null));
    d.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fin(null); } });
    document.body.appendChild(d); d.querySelector("input").focus();
  });
}
const lecMime = (n) => { const e = String(n || "").toLowerCase().split(".").pop(); return { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", heif: "image/heif", tif: "image/tiff", tiff: "image/tiff", webp: "image/webp", gif: "image/gif", txt: "text/plain", eml: "message/rfc822", html: "text/html", htm: "text/html", csv: "text/csv", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }[e] || "application/octet-stream"; };
async function lecTextoPDF(file) {
  const pdf = await lecPdfLib(); const datos = new Uint8Array(await file.arrayBuffer());
  let doc = null, clave = "";
  for (let intento = 0; intento < 6; intento++) {
    try { doc = await pdf.getDocument({ data: datos.slice(), password: clave, isEvalSupported: false }).promise; break; }
    catch (e) {
      if (e && e.name === "PasswordException") { clave = await lecPedirClave(file.name, intento > 0); if (clave == null) return { texto: "", escaneado: false, paginas: 0, protegido: true, avisos: ["PDF protegido con contraseña: no se ha leído. Vuelve a subirlo e indica la contraseña, o ábrelo con ella e imprímelo como PDF («Guardar como PDF»)."] }; continue; }
      if (e && e.name === "InvalidPDFException") throw new Error("el PDF está dañado o incompleto: descárgalo de nuevo o pide otra copia");
      throw e;
    }
  }
  if (!doc) return { texto: "", escaneado: false, paginas: 0, protegido: true, avisos: ["PDF protegido con contraseña: no se ha podido abrir. Comprueba la contraseña con quien lo envió."] };
  const avisos = []; if (clave) avisos.push("PDF protegido: se ha abierto con la contraseña indicada (no se guarda).");
  const paginas = Math.min(doc.numPages, LEC_PAG_TEXTO); const textos = [], sinTexto = []; let campos = 0, ilegibles = 0;
  for (let i = 1; i <= paginas; i++) {
    if (paginas > 6) lecProgreso(`${LEC.estado?.base || "Leyendo"} · página ${i} de ${paginas}`);
    const pg = await doc.getPage(i); const tc = await pg.getTextContent();
    // Líneas por cercanía vertical (no por redondeo): en una fila de tabla, la celda en otra fuente (monoespaciada) tiene la base 1-2 puntos
    // desplazada y debe quedar en la misma línea que sus vecinas
    const F = await lecCamposFormulario(pg); campos += F.length;
    const its = tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height || 10, s: it.str })).concat(F).sort((a, b) => b.y - a.y || a.x - b.x);
    const filas = []; for (const it of its) { const f = filas[filas.length - 1]; if (f && Math.abs(f.y - it.y) <= Math.max(2, Math.min(f.h, it.h) * 0.35)) f.items.push(it); else filas.push({ y: it.y, h: it.h, items: [it] }); }
    const lineas = filas.map((f) => f.items.sort((a, b) => a.x - b.x).map((q) => q.s).join(" ").replace(/\s{2,}/g, " ").trim());
    const t = lineas.join("\n"); textos.push(t);
    const largo = t.replace(/\s/g, "").length > 60, mal = largo && lecTextoIlegible(t);
    if (!largo || mal) { sinTexto.push(i); if (mal) ilegibles++; }
  }
  if (doc.isPureXfa || /please wait\.{3}|if this message is not eventually replaced/i.test(textos.slice(0, 2).join(" "))) avisos.push("Formulario dinámico de Adobe (XFA): el navegador no puede mostrar sus datos. Ábrelo con Adobe Acrobat Reader y guárdalo con «Imprimir › Guardar como PDF»; ese PDF sí se lee.");
  if (campos) avisos.push(`Formulario PDF: se han leído ${campos === 1 ? "1 campo rellenado" : campos + " campos rellenados"}.`);
  // Páginas sin texto útil: por imagen (las páginas en blanco se saltan)
  let ocr = 0, blancas = 0; const pendientes = [];
  for (const i of sinTexto) {
    if (ocr >= LEC_PAG_OCR) { pendientes.push(i); continue; }
    const pg = await doc.getPage(i); const vp1 = pg.getViewport({ scale: 1 });
    const m = document.createElement("canvas"); const vpm = pg.getViewport({ scale: Math.min(0.5, 400 / vp1.width) }); m.width = vpm.width; m.height = vpm.height;
    await pg.render({ canvasContext: m.getContext("2d"), viewport: vpm }).promise;
    if (lecEnBlanco(m)) { blancas++; continue; }
    ocr++; lecProgreso(`${LEC.estado?.base || "Leyendo"} · reconociendo la página ${i}${sinTexto.length > 1 ? ` (${ocr} de ${Math.min(sinTexto.length, LEC_PAG_OCR)})` : ""}`);
    const vp = pg.getViewport({ scale: Math.min(4, Math.max(2, 1800 / vp1.width)) });
    const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
    await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    const r = await lecOcrFoto(c);
    textos[i - 1] = r.texto; for (const a of r.avisos) if (!avisos.includes(a)) avisos.push(a);
  }
  if (ilegibles) avisos.push(`El texto de ${ilegibles === 1 ? "una página" : ilegibles + " páginas"} del PDF no se podía interpretar (fuentes sin mapa de caracteres o capa de texto defectuosa): se ${ilegibles === 1 ? "ha" : "han"} leído por imagen.`);
  if (pendientes.length) avisos.push(`Hay ${pendientes.length} páginas escaneadas más (desde la ${pendientes[0]}) que no se han reconocido: cada página por imagen tarda unos segundos. Sube aparte las que contengan los datos que falten.`);
  if (doc.numPages > paginas) avisos.push(`Documento de ${doc.numPages} páginas: se han leído las ${paginas} primeras. Si los datos que faltan están más adelante, sube esas páginas como un documento aparte.`);
  let adjuntos = [];
  try { const A = await doc.getAttachments(); if (A) adjuntos = Object.values(A).filter((a) => a && a.content && a.content.length).map((a) => new File([a.content], a.filename || "adjunto", { type: lecMime(a.filename) })); } catch (e) {}
  if (adjuntos.length) avisos.push(`El PDF lleva ${adjuntos.length === 1 ? "un archivo adjunto, que también se lee" : adjuntos.length + " archivos adjuntos, que también se leen"}.`);
  return { texto: textos.join("\n\f\n"), escaneado: ocr > 0 && ocr >= (paginas - blancas) / 2, paginas: doc.numPages, avisos, adjuntos };
}
// ¿Página en blanco? (menos de un 0,2 % de píxeles oscuros en una miniatura)
function lecEnBlanco(c) { const d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 150) n++; return n < (d.length / 4) * 0.002; }
// Correcciones de lectura óptica que no cambian el sentido: bordes de tabla leídos como «|», «N.!.F.», «D.2» por «D.ª», importes con
// espacios («140 000,00»), «e» por «€», y la letra del NIF confundida con una cifra o con otra letra parecida (6→G, 8→B, 5→S, O→Q…): solo si
// hay un NIF o DNI cerca y una única letra cuadra con el número (la letra es un dígito de control: no se inventa nada que no compruebe)
const LEC_OCR_LETRA = { 0: "DOQ", 1: "TIL", 2: "Z", 4: "A", 5: "S", 6: "G", 7: "T", 8: "B", O: "QD", Q: "O", D: "O", I: "TL", L: "T", T: "IL", Z: "", B: "", S: "", G: "", U: "V", V: "Y", Y: "V", H: "N", N: "H", M: "N", P: "R", R: "P", C: "G", K: "X", X: "K", J: "", F: "P", W: "" };
function lecLimpiarOcr(t) {
  let s = String(t || "")
    .replace(/(^|[ \t])[|¦](?:[ \t]|$)/gm, "$1").replace(/[ \t]+$/gm, "")
    .replace(/\bN\s?\.\s?[!lI1|]\s?\.\s?F\b\.?/g, "N.I.F.").replace(/\bD\s?\.\s?N\s?\.\s?[!lI1|](?![a-z])\.?/g, "D.N.I.")
    .replace(/\b(D|Dña?)\.\s?[2°º*](?=\s+[A-ZÁÉÍÓÚÑÜ])/g, "$1.ª").replace(/\bD\.\s?\/\s?D\.\s?[^\sA-Za-z]{0,2}(?=\s+[A-ZÁÉÍÓÚÑÜ])/g, "D./D.ª")
    .replace(/(?<![\d.,])(\d{1,3})((?: \d{3})+),(\d{2})(?!\d)/g, (m, a, b, c) => a + b.replace(/ /g, ".") + "," + c)
    .replace(/(\d,\d{2}) ?[eE](?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])/g, "$1 €")
    .replace(/(^|\s)F[l1|](?=\s|$)/gm, "$1FI");
  s = s.replace(/\b(\d{8})(\s?-?\s?)([0-9A-Z])\b/g, (m, n, sep, c, i) => {
    if (lecNifOk(n + c)) return m;
    const antes = s.slice(Math.max(0, i - 150), i); if (!/N\.?\s?I\.?\s?F|D\.?\s?N\.?\s?I|N\.?\s?I\.?\s?E|DOCUMENTO|IDENTIDAD/i.test(antes) || /tel[ée]?f?|m[óo]vil|fax/i.test(antes.slice(-25))) return m;
    const cand = [...(LEC_OCR_LETRA[c] || "")].filter((l) => lecNifOk(n + l)); return cand.length === 1 ? n + sep + cand[0] : m;
  });
  return s;
}
// NIF con la letra sin leer («N.I.F. 00000821,»): la letra es el resto del número entre 23, así que se calcula; se avisa para comprobarlo
function lecCompletarNif(t) {
  const nifs = []; const s = String(t || "").replace(/((?:N\.?\s?I\.?\s?F|D\.?\s?N\.?\s?I|N\.?\s?I\.?\s?E)\.?\s*[:：]?\s*)(\d{8})(?=\s*[,;.)]|\s+(?:y|e|casad|vecin|mayor|titular|soltero|viud)\b|\s*$)/gim, (m, a, n) => { const v = n + "TRWAGMYFPDXBNJZSQVHLCKE"[Number(n) % 23]; nifs.push(v); return a + v; });
  return { t: s, n: nifs.length, nifs };
}
async function lecOcrCanvas(c) { const w = await lecOcr(); const r = await w.recognize(c); return { texto: r.data.text || "", conf: Number(r.data.confidence) || 0 }; }

// ── Preprocesado de imágenes para el reconocimiento (funciones puras sobre un vector de grises; se prueban en Node) ──
// Estira el contraste entre los percentiles 1 y 99: fotos grises, con poca luz o con el papel amarillento
// loMax: el negro nunca se lleva más arriba de ese gris. En una página recortada (sin mesa alrededor) el percentil 1 es el centro de las letras;
// llevarlo a negro engorda las letras al binarizar (el umbral adaptativo sube con él) y en fotos de poca resolución las letras se funden
function lecEstirar(g, loMax = 255) {
  const h = new Uint32Array(256); for (let i = 0; i < g.length; i++) h[g[i]]++;
  const n = g.length; let lo = 0, hi = 255, a = 0;
  for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n * 0.01) { lo = Math.min(v, loMax); break; } }
  a = 0; for (let v = 255; v >= 0; v--) { a += h[v]; if (a >= n * 0.01) { hi = v; break; } }
  const rango = hi - lo; const out = new Uint8Array(n);
  if (rango < 8) { out.set(g); return { g: out, rango }; }
  for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(255, Math.round((g[i] - lo) * 255 / rango)));
  return { g: out, rango };
}
// Umbral adaptativo (Bradley): cada píxel se compara con la media de su vecindario. Aguanta sombras y luz desigual de las fotos de móvil
function lecUmbralAdaptativo(g, w, h, t = 0.15) {
  const s = Math.max(8, Math.round(Math.max(w, h) / 24)), r = s >> 1;
  const I = new Uint32Array((w + 1) * (h + 1)); // la suma total cabe: 2.600 × 3.700 px × 255 < 2^32
  for (let y = 0; y < h; y++) { let fila = 0; for (let x = 0; x < w; x++) { fila += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + fila; } }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { const y1 = Math.max(0, y - r), y2 = Math.min(h - 1, y + r); for (let x = 0; x < w; x++) { const x1 = Math.max(0, x - r), x2 = Math.min(w - 1, x + r); const n = (x2 - x1 + 1) * (y2 - y1 + 1); const suma = I[(y2 + 1) * (w + 1) + x2 + 1] - I[y1 * (w + 1) + x2 + 1] - I[(y2 + 1) * (w + 1) + x1] + I[y1 * (w + 1) + x1]; out[y * w + x] = g[y * w + x] * n <= suma * (1 - t) ? 0 : 255; } }
  return out;
}
// Inclinación del texto (grados) por perfil de proyección sobre una imagen binarizada (0 = tinta): el ángulo que deja las filas de tinta más
// «concentradas». Entre −15° y 15° (fotos de móvil muy torcidas), con un refinado a décimas
function lecAnguloInclinacion(b, w, h, lim = 15) {
  const paso = Math.max(1, Math.round(Math.max(w, h) / 1000)); const X = [], Y = [];
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) if (b[y * w + x] < 128) { X.push(x); Y.push(y); }
  if (X.length < 200 || X.length > (w / paso) * (h / paso) * 0.6) return 0;
  const off = Math.ceil((w + h) / paso) + 2, bins = new Int32Array(off * 2 + 2);
  const puntua = (gr) => { const a = gr * Math.PI / 180, s = Math.sin(a), c = Math.cos(a); bins.fill(0); for (let i = 0; i < X.length; i++) bins[off + Math.round((-X[i] * s + Y[i] * c) / paso)]++; let q = 0; for (let i = 0; i < bins.length; i++) q += bins[i] * bins[i]; return q; };
  let mejor = 0, max = puntua(0);
  for (let a = -lim; a <= lim; a += 0.5) { if (!a) continue; const q = puntua(a); if (q > max * 1.0005) { max = q; mejor = a; } }
  const base = mejor; for (let a = base - 0.4; a <= base + 0.41; a += 0.1) { const q = puntua(a); if (q > max * 1.0005) { max = q; mejor = a; } }
  return Math.round(mejor * 10) / 10;
}
// Líneas de tabla (bordes de celda, subrayados largos, marcos): el reconocimiento de texto se pierde dentro de las tablas con bordes de los
// certificados y deja celdas sin leer. Se marcan los trazos de tinta horizontales y verticales mucho más largos que una letra (admitiendo
// cortes de 2 píxeles por la fotocopia o la foto) y se devuelve la máscara para borrarlos. Imagen binarizada: 0 = tinta
function lecLineasTabla(b, w, h) {
  const m = new Uint8Array(w * h); let n = 0;
  // Un eje: «at(i, j)» = tinta en la posición j de la línea i; una línea de tabla es un trazo largo (≥ L), casi continuo (≥ 85 % de tinta) y
  // fino: a pocos píxeles por encima y por debajo todo es blanco. Una palabra en negrita no lo cumple (alrededor de su línea central hay tinta)
  const eje = (N, M, at, marca, L) => {
    const blanco = (i, j0, j1) => { if (i < 0 || i >= N) return 1; let k = 0; for (let j = j0; j <= j1; j++) if (!at(i, j)) k++; return k / (j1 - j0 + 1); };
    for (let i = 0; i < N; i++) {
      let ini = -1, hueco = 0, tinta = 0;
      for (let j = 0; j <= M; j++) {
        const t = j < M && at(i, j);
        if (t) { if (ini < 0) { ini = j; tinta = 0; } tinta++; hueco = 0; continue; }
        if (ini < 0) continue;
        if (++hueco <= 3 && j < M) continue;
        const fin = j - hueco; const largo = fin - ini + 1;
        if (largo >= L && tinta / largo >= 0.85) {
          let a = 0, z = 0; for (let d = 2; d <= 6 && !a; d++) if (blanco(i - d, ini, fin) >= 0.8) a = d; for (let d = 2; d <= 6 && !z; d++) if (blanco(i + d, ini, fin) >= 0.8) z = d;
          if (a && z) for (let k = i - a + 1; k <= i + z - 1; k++) for (let q = ini; q <= fin; q++) if (at(k, q)) { marca(k, q); n++; }
        }
        ini = -1; hueco = 0;
      }
    }
  };
  eje(h, w, (y, x) => b[y * w + x] < 128, (y, x) => { m[y * w + x] = 1; }, Math.max(48, Math.round(w * 0.035)));
  eje(w, h, (x, y) => b[y * w + x] < 128, (x, y) => { m[y * w + x] = 1; }, Math.max(48, Math.round(h * 0.025)));
  // Líneas finas grises que la binarización deja a trazos («- - - -», bordes de 1 px de las tablas y subrayados de los títulos): cortes de
  // hasta 14 px y al menos un 40 % de tinta, pero muy finas (2 px por encima y por debajo, casi todo blanco), lo que no cumple ninguna letra
  const trazos = (N, M, at, marca, L) => {
    const blanco = (i, j0, j1) => { if (i < 0 || i >= N) return 1; let k = 0; for (let j = j0; j <= j1; j++) if (!at(i, j)) k++; return k / (j1 - j0 + 1); };
    for (let i = 0; i < N; i++) { let ini = -1, hueco = 0, tinta = 0;
      for (let j = 0; j <= M; j++) { const t = j < M && (at(i, j) || (i > 0 && at(i - 1, j)) || (i + 1 < N && at(i + 1, j))); if (t) { if (ini < 0) { ini = j; tinta = 0; } tinta++; hueco = 0; continue; } if (ini < 0) continue; if (++hueco <= 14 && j < M) continue;
        const fin = j - hueco, largo = fin - ini + 1;
        if (largo >= L && tinta / largo >= 0.4 && blanco(i - 3, ini, fin) >= 0.92 && blanco(i + 3, ini, fin) >= 0.92 && blanco(i - 4, ini, fin) >= 0.95 && blanco(i + 4, ini, fin) >= 0.95) for (let k = i - 1; k <= i + 1; k++) for (let q = ini; q <= fin; q++) if (k >= 0 && k < N && at(k, q)) { marca(k, q); n++; }
        ini = -1; hueco = 0; } }
  };
  trazos(h, w, (y, x) => b[y * w + x] < 128 && !m[y * w + x], (y, x) => { m[y * w + x] = 1; }, Math.max(60, Math.round(w * 0.06)));
  trazos(w, h, (x, y) => b[y * w + x] < 128 && !m[y * w + x], (x, y) => { m[y * w + x] = 1; }, Math.max(60, Math.round(h * 0.04)));
  return { m, n };
}
// Reduce un vector de grises a un ancho máximo (muestreo por vecino): para estimar la inclinación sin recorrer la imagen entera
function lecReducir(g, w, h, maxW) { const k = Math.min(1, maxW / w); if (k === 1) return { g, w, h }; const W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k)); const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) { const yy = Math.min(h - 1, Math.floor(y / k)); for (let x = 0; x < W; x++) o[y * W + x] = g[yy * w + Math.min(w - 1, Math.floor(x / k))]; } return { g: o, w: W, h: H }; }
// Lienzo → gris estirado, puesto derecho (de lado o boca abajo), enderezado y, aparte, binarizado. Escala: entre 1.800 y 2.600 px de ancho
// (las fotos pequeñas se amplían)
function lecRotar(c, g) { if (!g) return c; const r = document.createElement("canvas"); r.width = g === 180 ? c.width : c.height; r.height = g === 180 ? c.height : c.width; const x = r.getContext("2d", { willReadFrequently: true }); x.translate(r.width / 2, r.height / 2); x.rotate(g * Math.PI / 180); x.drawImage(c, -c.width / 2, -c.height / 2); return r; }
async function lecLienzo(src) {
  const img = src.getContext ? src : await createImageBitmap(src);
  const k = Math.min(2600 / img.width, Math.max(1, 1800 / img.width));
  let c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  let ctx = c.getContext("2d", { willReadFrequently: true }); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  if (img.close) img.close();
  const gris = (cv) => { const d = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; const g = new Uint8Array(cv.width * cv.height); for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); return g; };
  const pinta = (cv, g) => { const cx = cv.getContext("2d", { willReadFrequently: true }); const im = cx.createImageData(cv.width, cv.height); for (let i = 0, j = 0; j < g.length; i += 4, j++) { im.data[i] = im.data[i + 1] = im.data[i + 2] = g[j]; im.data[i + 3] = 255; } cx.putImageData(im, 0, 0); };
  let est = lecEstirar(gris(c)); pinta(c, est.g);
  // De lado o boca abajo: perfiles de tinta (escaner.js). Primero el giro de 90°, antes de medir la inclinación fina
  let giro = 0; const orienta = () => { const red = lecReducir(est.g, c.width, c.height, 1000); return typeof scnOrientacion === "function" && !LEC.basico ? scnOrientacion(lecUmbralAdaptativo(red.g, red.w, red.h), red.w, red.h) : { giro: 0, conf: 0 }; };
  { const o = orienta(); if ((o.giro === 90 || o.giro === 270) && o.conf >= 0.3) { giro = o.giro; c = lecRotar(c, giro); est = { g: gris(c), rango: est.rango }; } }
  const red = lecReducir(est.g, c.width, c.height, 1000); const ang = lecAnguloInclinacion(lecUmbralAdaptativo(red.g, red.w, red.h), red.w, red.h, LEC.basico ? 8 : 15);
  if (Math.abs(ang) >= 0.3) {
    const a = -ang * Math.PI / 180, W = Math.ceil(Math.abs(c.width * Math.cos(a)) + Math.abs(c.height * Math.sin(a))), H = Math.ceil(Math.abs(c.width * Math.sin(a)) + Math.abs(c.height * Math.cos(a)));
    const r = document.createElement("canvas"); r.width = W; r.height = H; const rx = r.getContext("2d", { willReadFrequently: true });
    rx.fillStyle = "#fff"; rx.fillRect(0, 0, W, H); rx.translate(W / 2, H / 2); rx.rotate(a); rx.drawImage(c, -c.width / 2, -c.height / 2); c = r; est = { g: gris(c), rango: est.rango };
  }
  { const o = orienta(); if (o.giro === 180 && o.conf >= 0.5) { giro = (giro + 180) % 360; c = lecRotar(c, 180); est = { g: gris(c), rango: est.rango }; } }
  const B = lecUmbralAdaptativo(est.g, c.width, c.height);
  // Sin las líneas de las tablas (también en la versión gris, que se usa si la binarizada se lee mal)
  if (!LEC.basico) { const T = lecLineasTabla(B, c.width, c.height); if (T.n) { const G = est.g.length === B.length ? est.g : gris(c); for (let i = 0; i < B.length; i++) if (T.m[i]) { B[i] = 255; G[i] = 255; } pinta(c, G); } }
  const bin = document.createElement("canvas"); bin.width = c.width; bin.height = c.height; pinta(bin, B);
  return { gris: c, bin, angulo: ang, giro, rango: est.rango };
}
// Reconocimiento con preprocesado: primero la imagen binarizada; si sale poco texto o con poca confianza, también la gris, y se queda la mejor
async function lecOcrImagen(src) {
  const L = await lecLienzo(src); const letras = (t) => (t.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g) || []).length;
  // Versión 1.4 (LEC.basico): primero la binarizada. Ahora, primero la gris realzada (sin líneas de tabla), que conserva el suavizado de las
  // letras; la binarizada solo si la gris se lee con poca confianza. Se queda la de más confianza (o la que da bastante más texto)
  const [p1, p2] = LEC.basico || LEC.binPrimero ? [L.bin, L.gris] : [L.gris, L.bin], umbral = LEC.basico ? 70 : 82;
  let r = await lecOcrCanvas(p1);
  if (r.conf < umbral || letras(r.texto) < 80 || LEC.ambos) { const r2 = await lecOcrCanvas(p2); if (r2.conf > r.conf || letras(r2.texto) > letras(r.texto) * 1.3) r = r2; }
  const avisos = [];
  if (L.giro) avisos.push(`La imagen estaba ${L.giro === 180 ? "boca abajo" : "de lado"} y se ha girado ${L.giro}° antes de leerla.`);
  if (Math.abs(L.angulo) >= 0.3) avisos.push(`La imagen estaba torcida (${String(Math.abs(L.angulo)).replace(".", ",")}°) y se ha enderezado antes de leerla.`);
  if (r.conf && r.conf < 55) avisos.push("La imagen se lee con dificultad (poca nitidez o contraste): revisa con especial cuidado lo propuesto o sube una foto mejor, de frente y con buena luz.");
  let texto = r.texto;
  if (!LEC.basico) { const c = lecCompletarNif(lecLimpiarOcr(texto)); texto = c.t; if (c.n) avisos.push(`No se leía la letra de ${c.n === 1 ? "un NIF" : c.n + " NIF"} (${c.nifs.join(", ")}): se ha calculado con su número. Compruébal${c.n === 1 ? "o" : "os"} en el documento.`); }
  return { texto, conf: r.conf, aviso: avisos.join(" ") };
}
// Una foto o página escaneada completa: se localiza el papel y se corrige la perspectiva (escaner.js), se separa la doble página y se lee
// cada parte. Con LEC.basico (solo para medir el «antes» en la prueba de calidad) se lee tal cual
async function lecOcrFoto(src, plano) {
  let partes = [src], avisos = [], alternativa = false;
  if (!plano && !LEC.basico && typeof scnPrepararFoto === "function") {
    try { const c = src.getContext ? src : await lecACanvas(src); const r = scnPrepararFoto(c); partes = r.paginas; if (r.aviso) avisos.push(r.aviso); alternativa = r.pequena; } catch (e) { console.error(e); }
  }
  let texto = "", conf = 0;
  for (const p of partes) { const r = await lecOcrImagen(p); texto += (texto ? "\n\f\n" : "") + r.texto; conf += r.conf / partes.length; if (r.aviso) avisos.push(r.aviso); }
  // Foto de poca resolución: enderezar interpola y a veces empeora la lectura; se lee también tal cual y se queda la de más confianza
  if (alternativa && conf < 80) { const r = await lecOcrImagen(src); if (r.conf > conf + 2) return { texto: r.texto, conf: r.conf, avisos: r.aviso ? [r.aviso] : [], partes: 1 }; }
  return { texto, conf, avisos: [...new Set(avisos)], partes: partes.length };
}
async function lecACanvas(src) { const img = src.getContext ? src : src instanceof Blob ? await lecImagen(src) : src; if (img.getContext) return img; const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0); if (img.close) img.close(); return c; }
async function lecTextoImagen(file) {
  const imgs = await lecImagenes(file); let texto = ""; const avisos = []; let n = 0;
  for (let i = 0; i < imgs.length && i < LEC_PAG_OCR; i++) {
    if (imgs.length > 1) lecProgreso(`${LEC.estado?.base || "Leyendo"} · página ${i + 1} de ${Math.min(imgs.length, LEC_PAG_OCR)}`);
    const c = await lecACanvas(imgs[i]); const r = await lecOcrFoto(c); texto += (texto ? "\n\f\n" : "") + r.texto; n += r.partes; for (const a of r.avisos) if (!avisos.includes(a)) avisos.push(a);
  }
  if (imgs.length > LEC_PAG_OCR) avisos.push(`La imagen tiene ${imgs.length} páginas: se han reconocido las ${LEC_PAG_OCR} primeras.`);
  return { texto, escaneado: true, paginas: Math.max(n, imgs.length), avisos, formato: imgs.formato || "" };
}
// Páginas que llegan del escáner con la cámara: ya recortadas, enderezadas y realzadas; solo se leen
async function lecTextoEscaneo(file) {
  const P = file._scn.paginas; let texto = ""; const avisos = [];
  for (let i = 0; i < P.length && i < LEC_PAG_OCR * 2; i++) { if (P.length > 1) lecProgreso(`${LEC.estado?.base || "Leyendo"} · página ${i + 1} de ${P.length}`); const r = await lecOcrFoto(P[i], true); texto += (texto ? "\n\f\n" : "") + r.texto; for (const a of r.avisos) if (!avisos.includes(a)) avisos.push(a); }
  return { texto, escaneado: true, paginas: P.length, avisos, formato: "escaneado con la cámara" };
}

// ── Imágenes: JPEG, PNG, WebP, GIF, BMP y AVIF las abre el navegador; HEIC/HEIF (iPhone) y TIFF (escáneres de oficina) en Chrome y Edge
// necesitan un decodificador, que se carga de /lib solo si hace falta (libheif, LGPL; UTIF.js, MIT). La orientación de la cámara (EXIF) se
// respeta al abrirlas.
// Tipo real por los primeros bytes: fotos del iPhone que llegan como .jpg siendo HEIC, archivos sin extensión, Office antiguo
async function lecFirma(file) {
  let b; try { b = new Uint8Array(await file.slice(0, 16).arrayBuffer()); } catch (e) { return ""; }
  const s = String.fromCharCode(...b);
  if (s.startsWith("%PDF")) return "pdf"; if (b[0] === 0xff && b[1] === 0xd8) return "jpeg"; if (s.startsWith("\x89PNG")) return "png";
  if (s.startsWith("II*\0") || s.startsWith("MM\0*")) return "tiff";
  if (s.slice(4, 8) === "ftyp") return /^(avif|avis)/.test(s.slice(8, 12)) ? "avif" : /^(hei[cxms]|hev[cxms]|mif1|msf1)/.test(s.slice(8, 12)) ? "heic" : "";
  if (s.startsWith("PK\x03\x04")) return "zip"; if (s.startsWith("RIFF") && s.slice(8, 12) === "WEBP") return "webp"; if (s.startsWith("GIF8")) return "gif"; if (s.startsWith("BM")) return "bmp";
  if (s.startsWith("{\\rtf")) return "rtf"; if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "ole";
  return "";
}
const lecScripts = {};
function lecScript(url) { if (!lecScripts[url]) lecScripts[url] = new Promise((res, rej) => { const s = document.createElement("script"); s.src = url; s.async = true; s.onload = res; s.onerror = () => rej(new Error("no se pudo cargar el decodificador")); document.head.appendChild(s); }); return lecScripts[url]; }
async function lecImgElemento(file) { const u = URL.createObjectURL(file); try { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); return c; } finally { URL.revokeObjectURL(u); } }
async function lecHeic(file) {
  if (!lecDisponible()) throw new Error("solo-web");
  // libheif (emscripten) no descarga el .wasm por sí solo en el navegador: se le pasa ya descargado
  if (!LEC.heif) LEC.heif = (async () => { const [, wasm] = await Promise.all([lecScript(webURL("/lib/libheif.js")), fetch(webURL("/lib/libheif.wasm")).then((r) => { if (!r.ok) throw new Error("no se pudo cargar el decodificador HEIC"); return r.arrayBuffer(); })]); const M = window.libheif({ wasmBinary: wasm }); if (M && typeof M.then === "function") return await M; if (M && M.ready && typeof M.ready.then === "function") await M.ready; return M; })().catch((e) => { LEC.heif = null; throw e; });
  const lib = await LEC.heif; const dec = new lib.HeifDecoder(); const imgs = dec.decode(new Uint8Array(await file.arrayBuffer()));
  if (!imgs || !imgs.length) throw new Error("la foto HEIC no contiene ninguna imagen legible");
  const im = imgs[0]; const w = im.get_width(), h = im.get_height(); const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); const id = x.createImageData(w, h);
  await new Promise((res, rej) => im.display(id, (d) => (d ? res() : rej(new Error("la foto HEIC está dañada")))));
  x.putImageData(id, 0, 0); for (const q of imgs) try { q.free && q.free(); } catch (e) {}
  return c;
}
async function lecTiff(file) {
  if (!lecDisponible()) throw new Error("solo-web");
  await lecScript(webURL("/lib/utif.js")); const U = window.UTIF; const buf = await file.arrayBuffer(); const ifds = U.decode(buf).filter((d) => d.t256 && d.t257);
  const out = [];
  for (const d of ifds.slice(0, LEC_PAG_OCR + 1)) { U.decodeImage(buf, d); const rgba = U.toRGBA8(d); const c = document.createElement("canvas"); c.width = d.width; c.height = d.height; const x = c.getContext("2d"); const id = x.createImageData(d.width, d.height); id.data.set(rgba); x.putImageData(id, 0, 0); out.push(c); }
  out.total = ifds.length; return out;
}
async function lecImagen(file) {
  const f = await lecFirma(file);
  if (f === "tiff") { try { return await createImageBitmap(file); } catch (e) {} return (await lecTiff(file))[0]; }
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) {}
  try { return await lecImgElemento(file); } catch (e) {} // Safari abre HEIC con <img>
  if (f === "heic" || /\.(heic|heif)$/i.test(file.name || "")) return lecHeic(file);
  throw new Error("formato de imagen no admitido por este navegador");
}
// Todas las páginas de una imagen (un TIFF puede tener varias); .formato indica si hizo falta un decodificador
async function lecImagenes(file) {
  const f = await lecFirma(file);
  if (f === "tiff") { try { const b = await createImageBitmap(file); const L = [b]; L.formato = "TIFF"; return L; } catch (e) {} const L = await lecTiff(file); L.formato = "TIFF"; return L; }
  const L = [await lecImagen(file)]; if (f === "heic") L.formato = "HEIC"; return L;
}
// ── Ofimática, páginas web y correo, sin librerías ──
// .docx, .xlsx, .odt y .ods son zips con XML dentro: se descomprimen con DecompressionStream
function lecZipLista(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fin = -1; for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error("no es un zip");
  const total = dv.getUint16(fin + 10, true); let p = dv.getUint32(fin + 16, true); const dec = new TextDecoder("utf-8"); const out = [];
  for (let k = 0; k < total && p + 46 <= bytes.length; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    out.push({ nombre: dec.decode(bytes.subarray(p + 46, p + 46 + nl)), metodo: dv.getUint16(p + 10, true), cifrado: !!(dv.getUint16(p + 8, true) & 1), comp: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) });
    p += 46 + nl + el + cl;
  }
  return out;
}
async function lecZipDatos(bytes, e) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(e.off, true) !== 0x04034b50) throw new Error("zip dañado");
  if (e.cifrado) throw new Error("el archivo está protegido con contraseña");
  const ini = e.off + 30 + dv.getUint16(e.off + 26, true) + dv.getUint16(e.off + 28, true); const datos = bytes.subarray(ini, ini + e.comp);
  if (e.metodo === 0) return datos;
  if (e.metodo !== 8 || typeof DecompressionStream !== "function") throw new Error("compresión no admitida");
  const ds = new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}
async function lecZipEntrada(bytes, nombre) { const e = lecZipLista(bytes).find((q) => q.nombre === nombre); return e ? new TextDecoder("utf-8").decode(await lecZipDatos(bytes, e)) : null; }
// Entidades XML y HTML (las habituales en documentos en castellano)
const LEC_ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euro: "€", ordm: "º", ordf: "ª", deg: "°", middot: "·", laquo: "«", raquo: "»", iexcl: "¡", iquest: "¿", copy: "©", reg: "®", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", ccedil: "ç", Ccedil: "Ç", agrave: "à", egrave: "è", ograve: "ò" };
const lecXmlTexto = (s) => String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : LEC_ENT[e] ?? LEC_ENT[e.toLowerCase()] ?? m));
// XML de Word → texto: párrafos y filas de tabla en líneas propias; las celdas de una fila, en la misma línea (como en los PDF)
function lecDocxTexto(xml) {
  return lecXmlTexto(String(xml).replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (c) => c.replace(/<\/w:p>/g, " ") + " ").replace(/<w:tab\/>/g, "\t").replace(/<w:br\b[^>]*\/>|<w:cr\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<\/w:tr>/g, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n").replace(/\t+/g, " ").replace(/[ ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
// Texto plano: UTF-8 si lo es; si no, Windows-1252 (los .txt guardados con el Bloc de notas antiguo), con la tabla propia LEC_CP1252
const lecCp1252 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i++) s += LEC_CP1252[bytes[i]]; return s; };
function lecDecodificar(bytes) { try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, ""); } catch (e) { return lecCp1252(bytes); } }
function lecDecodificarCon(bytes, cs) { const c = String(cs || "").trim().toLowerCase().replace(/^["']|["']$/g, ""); if (/^(windows-1252|x?-?cp-?1252|iso-?8859-1|iso_8859-1|latin-?1|l1)$/.test(c)) return lecCp1252(bytes); if (c && !/^(utf-?8|us-ascii)$/.test(c)) { try { return new TextDecoder(c).decode(bytes); } catch (e) {} } return lecDecodificar(bytes); }
async function lecTextoDocx(bytes) {
  const xml = await lecZipEntrada(bytes, "word/document.xml");
  if (xml == null) throw new Error("el archivo no contiene texto de Word");
  return { texto: lecDocxTexto(xml), escaneado: false, paginas: 1, formato: "Word", avisos: [] };
}
// Hojas de cálculo (.xlsx): cadenas compartidas, estilos (fechas e importes) y cada hoja por filas; las celdas de una fila, en una línea.
// Los importes se escriben a la española (1.234,56) y las fechas como 20/04/2026, que es lo que reconocen los extractores
const lecFmtEs = (n) => { const s = Math.abs(n).toFixed(2).split("."); return (n < 0 ? "-" : "") + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; };
function lecCeldaNum(n, clase, f1904) {
  if (!Number.isFinite(n)) return "";
  if (clase === "fecha" && n > 0 && n < 2958466) { const d = new Date(Date.UTC(f1904 ? 1904 : 1899, f1904 ? 0 : 11, f1904 ? 1 : 30) + Math.round(n * 86400) * 1000); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; }
  if (clase === "porcentaje") return lecFmtEs(n * 100).replace(/,00$/, "") + " %";
  if (clase === "dinero" || !Number.isInteger(n)) return lecFmtEs(n);
  return String(n);
}
const lecColumna = (ref) => [...String(ref || "")].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
async function lecTextoXlsx(bytes) {
  const E = lecZipLista(bytes); const leer = async (n) => { const e = E.find((q) => q.nombre === n); return e ? new TextDecoder("utf-8").decode(await lecZipDatos(bytes, e)) : ""; };
  const S = [...(await leer("xl/sharedStrings.xml")).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => lecXmlTexto([...m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((q) => q[1]).join("")));
  const st = await leer("xl/styles.xml"); const fmts = {}; for (const m of st.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) fmts[m[1]] = lecXmlTexto(m[2]);
  const xfs = ((/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(st) || [])[1] || "").match(/<xf\b[^>]*>/g) || [];
  const clase = xfs.map((x) => { const id = Number((/numFmtId="(\d+)"/.exec(x) || [])[1] || 0); const code = (fmts[id] || "").replace(/"[^"]*"|\[[^\]]*\]|\\./g, ""); if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[dy]|m{1,4}(?![^;]*0)/i.test(code) && !/0/.test(code)) return "fecha"; if (id === 9 || id === 10 || /%/.test(code)) return "porcentaje"; if ([2, 4, 7, 8, 39, 40, 43, 44].includes(id) || /0[.,]00|€|#,##0/.test(code)) return "dinero"; return ""; });
  const wb = await leer("xl/workbook.xml"), rels = await leer("xl/_rels/workbook.xml.rels"); const f1904 = /date1904="(1|true)"/.test(wb);
  const R = {}; for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) { const id = (/\bId="([^"]+)"/.exec(m[0]) || [])[1], t = (/\bTarget="([^"]+)"/.exec(m[0]) || [])[1]; if (id && t) R[id] = t.replace(/^\/?(xl\/)?/, "xl/"); }
  let hojas = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ n: lecXmlTexto((/\bname="([^"]*)"/.exec(m[0]) || [])[1] || ""), f: R[(/r:id="([^"]+)"/.exec(m[0]) || [])[1]] }));
  if (!hojas.length || hojas.some((h) => !h.f)) hojas = E.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.nombre)).map((e) => ({ n: "", f: e.nombre }));
  const partes = [];
  for (const h of hojas.slice(0, 30)) {
    const xml = await leer(h.f); if (!xml) continue; const lineas = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const celdas = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const at = c[1], cont = c[2] || ""; const t = (/\bt="([^"]+)"/.exec(at) || [])[1] || "n"; const sI = Number((/\bs="(\d+)"/.exec(at) || [])[1] || 0); const ref = (/\br="([A-Z]+)\d+"/.exec(at) || [])[1] || "";
        const v = (/<v>([\s\S]*?)<\/v>/.exec(cont) || [])[1]; let txt = "";
        if (t === "s") txt = S[Number(v)] ?? ""; else if (t === "inlineStr") txt = lecXmlTexto([...cont.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((q) => q[1]).join("")); else if (t === "str" || t === "e") txt = lecXmlTexto(v || ""); else if (t === "b") txt = v === "1" ? "Sí" : "No"; else if (v != null && v !== "") txt = lecCeldaNum(Number(v), clase[sI], f1904);
        txt = String(txt).replace(/\s+/g, " ").trim(); if (txt) celdas.push([lecColumna(ref), txt]);
      }
      if (celdas.length) lineas.push(celdas.sort((a, b) => a[0] - b[0]).map((q) => q[1]).join(" "));
    }
    if (lineas.length) partes.push((hojas.length > 1 && h.n ? `Hoja: ${h.n}\n` : "") + lineas.join("\n"));
  }
  return { texto: partes.join("\n\n"), escaneado: false, paginas: 1, formato: "Excel", avisos: [] };
}
// OpenDocument (LibreOffice): content.xml. Celdas de una fila en una línea; párrafos en líneas propias
function lecOdfTexto(xml, hojas) {
  return lecXmlTexto(String(xml).replace(/<office:annotation\b[\s\S]*?<\/office:annotation>/g, "").replace(/<table:(?:covered-)?table-cell\b[^>]*\/>/g, "").replace(/<table:(?:covered-)?table-cell\b[^>]*>([\s\S]*?)<\/table:(?:covered-)?table-cell>/g, (m, c) => c.replace(/<\/text:[ph]>/g, " ") + " ")
    .replace(/<\/table:table-row>/g, "\n").replace(/<text:tab\/>/g, " ").replace(/<text:s\b[^>]*\/>/g, " ").replace(/<text:line-break\/>/g, "\n").replace(/<\/text:[ph]>/g, "\n").replace(/<table:table\b[^>]*table:name="([^"]*)"[^>]*>/g, hojas ? "\nHoja: $1\n" : "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
// RTF (WordPad, algunos programas de notaría y de gestión): se quitan grupos de control, se traducen \'hh (Windows-1252) y \uN
// La tabla Windows-1252 va escrita aquí y no se pide a TextDecoder: algunos entornos (Node 22.22 y otros sin ICU completo) tratan
// «windows-1252» como Latin-1 y devuelven controles C1 en 0x80-0x9F en lugar de €, comillas tipográficas, rayas, Š, Ž, Œ…
const LEC_CP1252 = Array.from({ length: 256 }, (_, i) => (i >= 0x80 && i < 0xa0 ? "€\x81‚ƒ„…†‡ˆ‰Š‹Œ\x8DŽ\x8F\x90‘’“”•–—˜™š›œ\x9DžŸ"[i - 0x80] : String.fromCharCode(i))).join("");
const LEC_RTF_FUERA = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "object", "header", "footer", "headerl", "headerr", "headerf", "footerl", "footerr", "footerf", "themedata", "colorschememapping", "latentstyles", "datastore", "xmlnstbl", "listtable", "listoverridetable", "rsidtbl", "generator", "fldinst", "bkmkstart", "bkmkend", "pgdsctbl", "revtbl", "filetbl", "mmathPr"]);
function lecRtfTexto(s) {
  s = String(s); let out = "", saltar = false, uc = 1, omitir = 0; const pila = [];
  const pon = (t) => { if (saltar) return; if (omitir > 0) { omitir--; return; } out += t; };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") { pila.push([saltar, uc]); continue; }
    if (ch === "}") { [saltar, uc] = pila.pop() || [false, 1]; continue; }
    if (ch === "\r" || ch === "\n") continue;
    if (ch !== "\\") { pon(ch); continue; }
    const nx = s[i + 1];
    if (nx === "\\" || nx === "{" || nx === "}") { pon(nx); i++; continue; }
    if (nx === "'") { pon(LEC_CP1252[parseInt(s.substr(i + 2, 2), 16)] || ""); i += 3; continue; }
    if (nx === "*") { saltar = true; i++; continue; }
    if (nx === "~") { pon(" "); i++; continue; }
    if (nx === "-" || nx === "_") { i++; continue; }
    if (nx === "\n" || nx === "\r") { pon("\n"); i++; continue; }
    const m = /^([a-zA-Z]{1,32})(-?\d{1,10})? ?/.exec(s.slice(i + 1, i + 46)); if (!m) { i++; continue; }
    i += m[0].length; const w = m[1], n = m[2] != null ? Number(m[2]) : null;
    if (LEC_RTF_FUERA.has(w)) { saltar = true; continue; }
    if (saltar) continue;
    if (w === "par" || w === "line" || w === "row" || w === "sect" || w === "page") { omitir = 0; out += "\n"; }
    else if (w === "tab" || w === "cell") out += " ";
    else if (w === "uc" && n != null) uc = n;
    else if (w === "u" && n != null) { out += String.fromCharCode(n < 0 ? n + 65536 : n); omitir = uc; }
    else if (w === "emdash") out += "—"; else if (w === "endash") out += "–"; else if (w === "lquote") out += "‘"; else if (w === "rquote") out += "’"; else if (w === "ldblquote") out += "“"; else if (w === "rdblquote") out += "”"; else if (w === "bullet") out += "•";
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
// Página web guardada (sede electrónica, banca en línea): sin scripts ni estilos; bloques y filas en líneas, celdas en la misma línea
function lecHtmlTexto(h) {
  return lecXmlTexto(String(h).replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|head|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h[1-6]|table|section|article|header|footer|dt|dd|title|blockquote|pre|caption|form|fieldset)>/gi, "\n").replace(/<\/t[dh]>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/ /g, " ").replace(/[ \t\r]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
const lecHtmlCharset = (bytes) => { const cab = new TextDecoder("latin1").decode(bytes.subarray(0, 2048)); const m = /<meta[^>]+charset=["']?([\w-]+)/i.exec(cab); return m ? m[1] : ""; };
// CSV (exportaciones de banca y de programas de gestión): separador «;», tabulador o «,»; cada fila en una línea
function lecCsvTexto(t) {
  const L = String(t).replace(/\r\n?/g, "\n").split("\n"); const muestra = L.slice(0, 30).join("\n");
  const sep = (muestra.match(/;/g) || []).length >= Math.min(L.length, 30) * 0.8 ? ";" : /\t/.test(muestra) ? "\t" : ",";
  const fila = (l) => { const C = []; let c = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === sep) { C.push(c); c = ""; } else c += ch; } C.push(c); return C; };
  return L.map((l) => fila(l).map((c) => c.trim()).filter(Boolean).join(" ")).filter(Boolean).join("\n");
}
// ── Correo electrónico (.eml): cabeceras, cuerpo (texto o HTML) y adjuntos (PDF, fotos, Word…), que se leen como documentos propios ──
const lecLatin1 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return s; };
const lecBytesLatin1 = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
const lecB64 = (s) => { const t = String(s).replace(/[^A-Za-z0-9+/]/g, ""); try { return lecBytesLatin1(atob(t + "===".slice((t.length + 3) % 4))); } catch (e) { return new Uint8Array(0); } };
const lecQP = (s) => lecBytesLatin1(String(s).replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))));
// «=?UTF-8?B?...?=» y «=?ISO-8859-1?Q?...?=» (asuntos y nombres de adjunto con tildes)
const lecPalabrasCod = (s) => String(s || "").replace(/\?=\s+=\?/g, "?==?").replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (m, cs, enc, t) => lecDecodificarCon(enc.toUpperCase() === "B" ? lecB64(t) : lecQP(t.replace(/_/g, " ")), cs.replace(/\*.*$/, "")));
function lecCabeceras(t) { const H = {}; for (const l of String(t).replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) { const m = /^([!-9;-~]+):\s*(.*)$/.exec(l); if (m) { const k = m[1].toLowerCase(); if (!(k in H)) H[k] = m[2]; } } return H; }
function lecParam(v, k) {
  const s = String(v || ""); const ex = new RegExp(`;\\s*${k}\\*(\\d+\\*?)?=\\s*("?)([^";]*)\\2`, "gi"); const P = [...s.matchAll(ex)];
  if (P.length) { const raw = P.sort((a, b) => Number((a[1] || "0").replace("*", "")) - Number((b[1] || "0").replace("*", ""))).map((m) => m[3]).join(""); const mm = /^([^']*)'[^']*'(.*)$/.exec(raw); return lecDecodificarCon(lecBytesLatin1((mm ? mm[2] : raw).replace(/%([0-9A-Fa-f]{2})/g, (q, h) => String.fromCharCode(parseInt(h, 16)))), mm ? mm[1] : "utf-8"); }
  const m = new RegExp(`;\\s*${k}\\s*=\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|([^;\\s]+))`, "i").exec(s); return m ? (m[1] ?? m[2]).replace(/\\(.)/g, "$1") : "";
}
function lecEml(bytes) {
  const out = { cab: {}, textos: [], htmls: [], adjuntos: [] };
  const parte = (s, prof) => {
    const k = s.search(/\r?\n\r?\n/); const hs = k < 0 ? s : s.slice(0, k); const body = k < 0 ? "" : s.slice(k).replace(/^\r?\n\r?\n/, "");
    const H = lecCabeceras(hs); if (prof === 0) out.cab = H;
    const ct = H["content-type"] || "text/plain"; const tipo = ct.split(";")[0].trim().toLowerCase(); const cte = String(H["content-transfer-encoding"] || "").trim().toLowerCase();
    if (/^multipart\//.test(tipo)) { const b = lecParam(ct, "boundary"); if (!b || prof > 10) return; const seg = body.split("--" + b); for (let i = 1; i < seg.length; i++) { const p = seg[i]; if (p.startsWith("--")) break; parte(p.replace(/^[ \t]*\r?\n/, "").replace(/\r?\n$/, ""), prof + 1); } return; }
    const datos = cte === "base64" ? lecB64(body) : cte === "quoted-printable" ? lecQP(body) : lecBytesLatin1(body);
    const disp = H["content-disposition"] || ""; const nombre = lecPalabrasCod(lecParam(disp, "filename") || lecParam(ct, "name"));
    const adjunto = /^attachment/i.test(disp) || (!!nombre && !/^text\/(plain|html)$/.test(tipo));
    if (tipo === "message/rfc822") { out.adjuntos.push({ nombre: nombre || "mensaje-reenviado.eml", tipo, datos }); return; }
    if (!adjunto && tipo === "text/plain") { out.textos.push(lecDecodificarCon(datos, lecParam(ct, "charset"))); return; }
    if (!adjunto && tipo === "text/html") { out.htmls.push(lecDecodificarCon(datos, lecParam(ct, "charset"))); return; }
    // Imágenes incrustadas pequeñas (logotipos y firmas del correo) no son documentos
    if (/^image\//.test(tipo) && !/^attachment/i.test(disp) && datos.length < 40000) return;
    if (datos.length) out.adjuntos.push({ nombre: nombre || `adjunto-${out.adjuntos.length + 1}.${(tipo.split("/")[1] || "bin").replace(/^jpeg$/, "jpg").replace(/[^a-z0-9]/g, "")}`, tipo, datos });
  };
  parte(lecLatin1(bytes), 0);
  const C = out.cab; const cuerpo = out.textos.length ? out.textos.join("\n\n") : out.htmls.map(lecHtmlTexto).join("\n\n");
  return { de: lecPalabrasCod(C.from || ""), para: lecPalabrasCod(C.to || ""), asunto: lecPalabrasCod(C.subject || ""), fecha: C.date || "", texto: cuerpo, adjuntos: out.adjuntos };
}
async function lecTextoEml(file) {
  const E = lecEml(new Uint8Array(await file.arrayBuffer()));
  const adjuntos = E.adjuntos.map((a) => new File([a.datos], a.nombre.replace(/[\\/:*?"<>|]/g, "_"), { type: a.tipo && a.tipo !== "application/octet-stream" ? a.tipo : lecMime(a.nombre) }));
  const cab = [E.de && "De: " + E.de, E.asunto && "Asunto: " + E.asunto, E.fecha && "Fecha: " + E.fecha].filter(Boolean).join("\n");
  const avisos = adjuntos.length ? [`Correo con ${adjuntos.length === 1 ? "un adjunto" : adjuntos.length + " adjuntos"} (${adjuntos.map((f) => f.name).join(", ").slice(0, 160)}): ${adjuntos.length === 1 ? "se lee" : "se leen"} como documentos propios y se ${adjuntos.length === 1 ? "archiva" : "archivan"} en el expediente.`] : [];
  return { texto: `${cab}\n\n${E.texto || ""}`.trim(), escaneado: false, paginas: 1, formato: "correo", avisos, adjuntos, correo: { asunto: E.asunto, de: E.de, cuerpo: (E.texto || "").trim() } };
}
async function lecTexto(file) {
  if (file._scn) return lecTextoEscaneo(file);
  const n = String(file.name || "").toLowerCase(), ty = String(file.type || "").toLowerCase(); const firma = await lecFirma(file);
  const bytes = async () => new Uint8Array(await file.arrayBuffer());
  if (firma === "pdf" || ty === "application/pdf" || n.endsWith(".pdf")) return lecTextoPDF(file);
  if (["jpeg", "png", "tiff", "heic", "avif", "webp", "gif", "bmp"].includes(firma) || /^image\//.test(ty) || /\.(jpe?g|png|webp|heic|heif|tiff?|avif|gif|bmp)$/.test(n)) return lecTextoImagen(file);
  if (/\.eml$/.test(n) || ty === "message/rfc822") return lecTextoEml(file);
  if (firma === "rtf" || /\.rtf$/.test(n)) return { texto: lecRtfTexto(lecLatin1(await bytes())), escaneado: false, paginas: 1, formato: "RTF", avisos: [] };
  if (firma === "zip" || /\.(docx|xlsx|xlsm|odt|ods)$/.test(n)) {
    const b = await bytes(); let E; try { E = lecZipLista(b); } catch (e) { return null; }
    const tiene = (x) => E.some((q) => q.nombre === x);
    if (tiene("word/document.xml")) return lecTextoDocx(b);
    if (tiene("xl/workbook.xml")) return lecTextoXlsx(b);
    if (tiene("content.xml")) { const xml = await lecZipEntrada(b, "content.xml"); const hoja = /spreadsheet/.test((await lecZipEntrada(b, "mimetype")) || "") || /\.ods$/.test(n); return { texto: lecOdfTexto(xml, hoja), escaneado: false, paginas: 1, formato: hoja ? "hoja de cálculo OpenDocument" : "OpenDocument", avisos: [] }; }
    return null;
  }
  if (/\.html?$/.test(n) || ty === "text/html") { const b = await bytes(); return { texto: lecHtmlTexto(lecDecodificarCon(b, lecHtmlCharset(b))), escaneado: false, paginas: 1, formato: "página web", avisos: [] }; }
  if (/\.csv$/.test(n) || ty === "text/csv") return { texto: lecCsvTexto(lecDecodificar(await bytes())), escaneado: false, paginas: 1, formato: "CSV", avisos: [] };
  if (/\.(txt|text)$/.test(n) || ty === "text/plain") return { texto: lecDecodificar(await bytes()), escaneado: false, paginas: 1, formato: "texto", avisos: [] };
  return null;
}
// Formatos que se archivan pero no se leen: el aviso dice cómo convertirlos
function lecNoLegible(nombre) {
  const n = String(nombre || "").toLowerCase();
  if (/\.doc$/.test(n)) return "Documento de Word antiguo (.doc): guárdalo como .docx o PDF desde Word y vuelve a subirlo. El archivo queda archivado.";
  if (/\.xls$/.test(n)) return "Hoja de Excel antigua (.xls): guárdala como .xlsx o PDF y vuelve a subirla. El archivo queda archivado.";
  if (/\.msg$/.test(n)) return "Correo de Outlook (.msg): ábrelo en Outlook y guárdalo como .eml (o guarda sus adjuntos) y vuelve a subirlo. El archivo queda archivado.";
  if (/\.(docx|xlsx)$/.test(n)) return "Documento de Office protegido con contraseña o dañado: ábrelo, quita la contraseña o guárdalo como PDF y vuelve a subirlo. El archivo queda archivado.";
  if (/\.(zip|rar|7z)$/.test(n)) return "Archivo comprimido: descomprímelo y sube los documentos que contiene. El archivo queda archivado.";
  if (/\.(pages|numbers|key)$/.test(n)) return "Documento de Apple (Pages o Numbers): expórtalo como PDF y vuelve a subirlo. El archivo queda archivado.";
  return "Se leen PDF, fotos y escaneos (también HEIC y TIFF), Word (.docx), Excel (.xlsx), OpenDocument, RTF, páginas web, CSV, texto (.txt) y correos (.eml) con sus adjuntos. El archivo queda archivado.";
}
const LEC_ACEPTA = "application/pdf,image/*,.heic,.heif,.tif,.tiff,.docx,.xlsx,.xlsm,.odt,.ods,.rtf,.txt,.csv,.htm,.html,.eml,text/plain,message/rfc822";
const lecLegible = (f) => f.type === "application/pdf" || /^image\//.test(f.type) || f.type === "text/plain" || f.type === "message/rfc822" || /\.(pdf|jpe?g|png|webp|tiff?|heic|heif|avif|gif|bmp|docx|xlsx|xlsm|odt|ods|rtf|txt|csv|html?|eml)$/i.test(f.name || "");

// ── Utilidades de texto ──
const lecN = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const LEC_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const LEC_UNI = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000 };
// «veintiséis», «treinta y uno», «dos mil veintiséis», «mil novecientos noventa y cinco»
function lecPalabrasNumero(s) {
  const w = lecN(s).toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((q) => q && q !== "y");
  if (!w.length || !w.every((q) => q in LEC_UNI)) return null;
  let total = 0, acc = 0;
  for (const q of w) { const v = LEC_UNI[q]; if (v === 1000) { total += (acc || 1) * 1000; acc = 0; } else acc += v; }
  return total + acc;
}
// Solo fechas que existen: 31/02 o 29/02 de un año no bisiesto se descartan (M8); JavaScript las convertiría en marzo sin avisar
const lecIso = (d, m, y) => { d = Number(d); m = Number(m); y = Number(y); if (!(Number.isInteger(d) && Number.isInteger(m) && d >= 1 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate())) return null; return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
// Todas las fechas de un texto, con su posición: numéricas, «20 de abril de 2026» y notariales «veinte de abril de dos mil veintiséis»
function lecFechas(t) {
  const out = [];
  for (const m of t.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g)) { const f = lecIso(m[1], m[2], m[3]); if (f) out.push({ f, i: m.index }); }
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) { const f = lecIso(m[3], m[2], m[1]); if (f) out.push({ f, i: m.index }); } // ISO (certificados plurilingües y sedes electrónicas)
  const mes = LEC_MESES.join("|");
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2}|[a-záéíóúü]+(?: y [a-záéíóúü]+)?) de (${mes}) de (\\d{4}|[a-záéíóúü]+(?: [a-záéíóúü]+){0,4})`, "gi"))) {
    const d = /^\d+$/.test(m[1]) ? Number(m[1]) : lecPalabrasNumero(m[1]);
    let y = null; if (/^\d+$/.test(m[3])) y = Number(m[3]); else { const W = m[3].split(" "); for (let k = W.length; k >= 1 && y == null; k--) { const v = lecPalabrasNumero(W.slice(0, k).join(" ")); if (v && v >= 1900) y = v; } }
    const f = d && y ? lecIso(d, LEC_MESES.indexOf(m[2].toLowerCase()) + 1, y) : null;
    if (f) out.push({ f, i: m.index });
  }
  return out.sort((a, b) => a.i - b.i);
}
const lecFechaCerca = (t, re, ventana = 160) => { const m = re.exec(t); if (!m) return null; const z = t.slice(m.index, m.index + m[0].length + ventana); const F = lecFechas(z); return F.length ? F[0].f : null; };
const lecNum = (s) => { if (s == null) return null; const v = Number(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")); return Number.isFinite(v) ? v : null; };
const lecDineroCerca = (t, re, ventana = 120) => { const m = re.exec(t); if (!m) return null; const z = t.slice(m.index + m[0].length, m.index + m[0].length + ventana); const q = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:€|euros?|EUR)?/i.exec(z); return q ? lecNum(q[1]) : null; };
// DNI (8 cifras + letra) y NIE (X/Y/Z + 7 cifras + letra; la letra se calcula sustituyendo X→0, Y→1, Z→2)
const lecNifOk = (v) => { const s = String(v || "").toUpperCase().replace(/[\s-]/g, ""); const m = /^(\d{8})([A-Z])$/.exec(s) || /^([XYZ])(\d{7})([A-Z])$/.exec(s); if (!m) return false; const n = m.length === 3 ? Number(m[1]) : Number({ X: "0", Y: "1", Z: "2" }[m[1]] + m[2]); return "TRWAGMYFPDXBNJZSQVHLCKE"[n % 23] === m[m.length - 1]; };
const lecNifs = (t) => [...new Set([...t.matchAll(/\b(\d{8}|[XYZxyz]\s?-?\s?\d{7})\s?[-]?\s?([A-Za-z])\b/g)].map((m) => m[1].replace(/[\s-]/g, "").toUpperCase() + m[2].toUpperCase()).filter(lecNifOk))];
// «una tercera parte indivisa», «dos terceras partes», «la mitad indivisa», «un tercio» → porcentaje
const LEC_FRAC = { mitad: 50, tercio: 33.33, tercera: 33.33, cuarto: 25, cuarta: 25, quinta: 20, sexta: 16.67, octava: 12.5, decima: 10, doceava: 8.33 };
function lecFraccion(t) {
  const m = /(?:\b(una?|dos|tres|cuatro|cinco|la|el)\s+)?\b(mitad|tercios?|terceras?|cuart[oa]s?|quintas?|sextas?|octavas?|d[ée]cimas?|doceavas?)(?:\s+partes?)?(?:\s+indivisas?)?\b/i.exec(t);
  if (!m) return null;
  const k = lecN(m[2]).toLowerCase().replace(/s$/, "");
  const base = LEC_FRAC[k] || LEC_FRAC[k.replace(/o$/, "a")] || null; if (!base) return null;
  const n = !m[1] || /^(la|el|una?)$/i.test(m[1]) ? 1 : LEC_UNI[lecN(m[1]).toLowerCase()] || 1;
  return Math.round(Math.min(100, base * n) * 100) / 100;
}
// «DON EDUARDO TÉBAR ROSADO» → «Eduardo Tébar Rosado»
const LEC_MINUS = ["de", "del", "la", "las", "los", "y", "e", "da", "do", "dos", "van", "von", "di"];
// «MÁLAGA» → «Málaga», «SAN PEDRO DE ALCÁNTARA» → «San Pedro de Alcántara» (para lugares y municipios; sin mínimo de palabras)
// Auditoría r5 (H3): mayúscula tras guion y apóstrofo también con letras acentuadas («López-Álvarez», «O'Connor», «L'Hospitalet»); la partícula
// catalana d'/l' en medio queda en minúscula («Sant Joan d'Alacant»). Antes \w no cogía la «á» y el apóstrofo no se trataba («López-álvarez», «O'connor»).
const lecTitulo = (s) => String(s || "").replace(/\s+/g, " ").trim().replace(/[,.;:]+$/, "").toLowerCase().split(" ").map((w, i) => { if (i && LEC_MINUS.includes(w)) return w; const c = w.charAt(0).toUpperCase() + w.slice(1); return i && /^[dl]['’]\p{L}/u.test(w) ? w.charAt(0) + c.slice(1) : c; }).join(" ").replace(/([-'’])(\p{L})/gu, (q, g, c) => g + c.toUpperCase());
// «TÉBAR ROSADO EDUARDO» (apellidos y nombre, como en Catastro y modelos tributarios) → «Eduardo Tébar Rosado»
function lecApellidosNombre(s) { const W = String(s || "").replace(/\s+/g, " ").trim().replace(/,/g, "").split(" ").filter(Boolean); while (W.length && LEC_PARA.has(lecN(W[0]).replace(/[^A-Z]/g, ""))) W.shift(); const corte = W.findIndex((w) => LEC_PARA.has(lecN(w).replace(/[^A-Z]/g, ""))); const P = corte > 0 ? W.slice(0, corte) : W; if (P.length < 3) return lecNombre(P.join(" ")); return lecNombre([...P.slice(2), P[0], P[1]].join(" ")); }
function lecNombre(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim().replace(/^(DON|DOÑA|D\.ª|Dª|D\.|DÑA\.?|SR\.?|SRA\.?)\s+/i, "").replace(/[,.;:]+$/, "");
  if (!t || t.length < 4 || t.length > 90) return "";
  let W = t.split(" ");
  while (W.length && LEC_PARA.has(lecN(W[0]).replace(/[^A-Z]/g, ""))) W.shift(); // «TITULARIDAD DON ANTONIO…»: se quita lo que no es nombre
  W = W.filter((w, i) => !(i === 0 && /^(DON|DOÑA|Dª|D\.|DÑA\.?)$/i.test(w)));
  const corte = W.findIndex((w, i) => i > 0 && LEC_PARA.has(lecN(w).replace(/[^A-Z]/g, "")));
  const P = corte > 0 ? W.slice(0, corte) : W;
  if (P.length < 2 || P.join(" ").length < 4 || P.join(" ").length > 70) return "";
  return lecTitulo(P.join(" "));
}
// Palabras que nunca forman parte de un nombre propio: cortan el nombre cuando el documento sigue con otro campo
const LEC_PARA = new Set(["LOCALIDAD", "PROTOCOLO", "FECHA", "TIPO", "POBLACION", "COLEGIO", "PROVINCIA", "DNI", "NIF", "SEXO", "NACIONALIDAD", "DOMICILIO", "CALLE", "CON", "MAYOR", "VECINO", "VECINA", "NACIDO", "NACIDA", "NATURAL", "ESTADO", "HORA", "LUGAR", "DOCUMENTO", "NOMBRE", "PRIMER", "SEGUNDO", "APELLIDOS", "APELLIDO", "NOTARIO", "NOTARIA", "NUMERO", "TITULAR", "TITULARES", "CASADO", "CASADA", "VIUDO", "VIUDA", "SOLTERO", "SOLTERA", "EN", "QUE", "QUIEN", "CUYO", "CUYA", "CERTIFICA", "CERTIFICADO", "REGISTRO", "INSCRITO", "INSCRITA", "FALLECIDO", "FALLECIDA", "HIJO", "HIJA", "ESPOSO", "ESPOSA", "SITA", "SITO", "SOBRE", "PARA", "POR", "SIN", "ENTIDAD", "ASEGURADORA", "POLIZA", "CUENTA", "IBAN", "SALDO", "REFERENCIA", "CLASE", "USO", "SUPERFICIE", "VALOR", "LINDA", "CUOTA", "CARGAS", "TITULARIDAD", "OTORGA", "COMPARECE", "MANIFIESTA", "INTERVIENE", "INSTITUYE", "LEGA", "ANTE",
  "REQUIRENTE", "COMPARECIENTE", "HEREDERO", "HEREDEROS", "HEREDERA", "HEREDERAS", "ABINTESTATO", "MARIDO", "MUJER", "PADRE", "MADRE", "CONYUGE", "TOMADOR", "TOMADORA", "ASEGURADO", "ASEGURADA", "BENEFICIARIO", "BENEFICIARIA", "EMPADRONADO", "EMPADRONADA", "MATRICULA", "NACIO", "FALLECIO", "CONTRAJO", "CONTRAJERON", "QUIENES", "AMBOS", "TUVO", "TIENE", "DEJO", "DECLARO", "DECLARA", "FIGURA", "PARENTESCO", "GRUPO", "SUJETO", "CAUSANTE", "NIE", "PASAPORTE", "ADJUDICATARIO", "ADJUDICATARIA", "COMO", "LLAMADO", "LLAMADA", "LLAMADOS", "LLAMADAS", "PROGENITOR", "PROGENITORA", "CONTRAYENTE", "DESDE", "HASTA", "ENCARGADO", "ENCARGADA", "SELLO", "FIRMA", "FIRMADO", "REGISTRADOR", "REGISTRADORA", "SECRETARIO", "SECRETARIA", "JUEZ", "MAGISTRADO", "TOMO", "PAGINA", "FOLIO"]); // («la», «el» no se incluyen: forman parte de apellidos como «de la Torre»)
// Descripción de un bien (frase larga): limpia espacios y pone mayúscula inicial, sin tocar el resto
const LEC_SIGLAS = new Set(["DNI", "NIF", "NIE", "TIE", "CRU", "IBI", "SA", "SL", "SLP", "CB", "FI", "ETF", "BBVA", "ING", "CC", "PL", "PT", "ES", "ITV", "DGT", "SUV"]);
const lecFrase = (s, max = 110) => { let t = String(s || "").replace(/\s+/g, " ").trim().replace(/[,.;:]+$/, ""); if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "") + "…"; t = t.split(" ").map((w) => (w.length >= 2 && w === w.toUpperCase() && /^[A-ZÁÉÍÓÚÑÜ]+$/.test(w) && !LEC_SIGLAS.has(w) ? w.toLowerCase() : w)).join(" "); return t.charAt(0).toUpperCase() + t.slice(1); };
// Dirección postal: «CL LARIOS 12 Es:1 Pl:03 Pt:A, 29005 MÁLAGA» → «Calle Larios 12 Es:1 Pl:03 Pt:A, 29005 Málaga»
const LEC_VIAS = { CL: "Calle", AV: "Avenida", AVDA: "Avenida", PZ: "Plaza", PZA: "Plaza", CM: "Camino", UR: "Urbanización", URB: "Urbanización", PS: "Paseo", PSO: "Paseo", CR: "Carretera", CTRA: "Carretera", TR: "Travesía", GL: "Glorieta", RD: "Ronda", BO: "Barrio", LG: "Lugar", PG: "Polígono", CJ: "Callejón", PJ: "Pasaje", CS: "Caserío" };
const lecDireccion = (s, max = 110) => { let t = String(s || "").replace(/\s+/g, " ").trim().replace(/[,.;:]+$/, ""); if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "") + "…"; return t.split(" ").map((w, i) => { const k = w.replace(/\.$/, "").toUpperCase(); if (i === 0 && LEC_VIAS[k]) return LEC_VIAS[k]; if (/^[A-ZÁÉÍÓÚÑÜ]{3,}$/.test(w) && !LEC_SIGLAS.has(w)) return lecTitulo(w); return w; }).join(" ").replace(/\b(Cl|Av|Pz|Cm|Ur|CL|AV|PZ|CM|UR)\b\.?(?=\s)/g, (m) => LEC_VIAS[m.replace(".", "").toUpperCase()] || m); };
const LEC_TRAT = "(?:DON|DOÑA|Don|Doña|D\\.ª|D\\.a|Dª|D\\.|DÑA\\.?|Dña\\.?)";
// Palabra clave en cualquier combinación de mayúsculas/minúsculas, para regex que llevan un nombre propio detrás (esas no pueden llevar la bandera «i»)
const lecCI = (s) => s.replace(/[a-záéíóúñü]/g, (c) => `[${c.toUpperCase()}${c}]`);
const LEC_NOMBRE_RE = `((?:[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\\-]+\\s*){2,6})`;
// Referencia catastral: los dos últimos caracteres son de control (se calculan con pesos sobre las dos mitades; algoritmo de la Dirección
// General del Catastro, el mismo que usa python-stdnum). Una lectura óptica con una letra o cifra confundida (S/5, O/0, B/8…) se corrige si
// una sola corrección cuadra con los caracteres de control; si ninguna cuadra, se deja como se leyó y se avisa
const LEC_RC_ALF = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789", LEC_RC_PESOS = [13, 15, 12, 5, 4, 17, 9, 21, 3, 7, 1];
const lecRcDc = (p) => "MQWERTYUIOPASDFGHJKLBZX"[[...p].reduce((s, c, i) => s + LEC_RC_PESOS[i] * (/\d/.test(c) ? Number(c) : LEC_RC_ALF.indexOf(c) + 1), 0) % 23];
const lecRefCatOk = (r) => /^[0-9A-ZÑ]{20}$/.test(r = String(r || "")) && lecRcDc(r.slice(0, 7) + r.slice(14, 18)) + lecRcDc(r.slice(7, 14) + r.slice(14, 18)) === r.slice(18);
const LEC_A_CIFRA = { O: "0", D: "0", Q: "0", U: "0", I: "1", L: "1", T: "7", S: "5", Z: "2", B: "8", G: "6", A: "4" }, LEC_A_LETRA = { 0: "O", 1: "I", 5: "S", 2: "Z", 8: "B", 6: "G", 4: "A", 7: "T" };
const LEC_PARECIDOS = { 0: "86OD", 8: "036B", 6: "085G", 5: "6S3", 3: "85", 1: "7IL", 7: "1T", 2: "Z7", 4: "A", 9: "0", O: "QD0", Q: "O0", D: "O0", B: "8R", R: "B", S: "5", I: "1LT", L: "I1", T: "I7", Z: "2", G: "6C", C: "G", E: "F", F: "EP", P: "RF", U: "V0", V: "UY", Y: "V", H: "N", N: "HM", M: "N", W: "V", K: "X", X: "K" };
// Solo correcciones con poco margen de acierto casual (el control es 1 entre 529): confusiones cifra/letra donde la forma de la referencia
// exige la otra clase, y la letra parecida en los dos caracteres de control. Nunca una búsqueda amplia, que «cuadraría» por casualidad
function lecRefCatArreglar(r) {
  if (lecRefCatOk(r)) return r;
  const C = [r, ...["CCCCCCCLLCCCCLCCCCLL", "CCCCCLCCCCCCCCCCCCLL"].map((forma) => [...r].map((ch, i) => (forma[i] === "C" ? (/\d/.test(ch) ? ch : LEC_A_CIFRA[ch] || ch) : /[A-ZÑ]/.test(ch) ? ch : LEC_A_LETRA[ch] || ch)).join(""))];
  for (const c of C) if (lecRefCatOk(c)) return c;
  const sol = new Set(); for (const q of new Set(C)) for (const i of [18, 19]) for (const alt of LEC_PARECIDOS[q[i]] || "") { if (!/[A-Z]/.test(alt)) continue; const c = q.slice(0, i) + alt + q.slice(i + 1); if (lecRefCatOk(c)) sol.add(c); }
  return sol.size === 1 ? [...sol][0] : r;
}
// Un carácter repetido de más («…0001 00Q» por «…0001 OQ»: la «O» leída como «00»): se quita una de las dos copias; vale si la solución es única
function lecRefCatLongitud(tok) {
  const sol = new Set();
  if (tok.length === 21) for (let i = 0; i < 20; i++) if (tok[i] === tok[i + 1]) { const c = lecRefCatArreglar(tok.slice(0, i) + tok.slice(i + 1)); if (lecRefCatOk(c)) sol.add(c); }
  return sol.size === 1 ? [...sol][0] : "";
}
const lecRefCat = (t) => {
  const T = t.replace(/\s+/g, " "); const m = /\b(\d{7}[A-Z]{2}\d{4}[A-Z]\d{4}[A-Z]{2}|\d{5}[A-Z]\d{3}\d{5}\d{4}[A-Z]{2}|[0-9A-Z]{20})\b/.exec(T);
  let r = m ? m[1] : "", a = r && /\d/.test(r) ? lecRefCatArreglar(r) : "";
  if (a && lecRefCatOk(a)) return a;
  for (const q of T.matchAll(/(?:REFERENCIA\s+CATASTRAL|REF\.?\s*CATASTRAL)[^0-9]{0,60}?\b([0-9A-Z]{20,21})\b/gi)) { const c = q[1].length === 20 ? lecRefCatArreglar(q[1]) : lecRefCatLongitud(q[1]); if (lecRefCatOk(c)) return c; }
  return a && /[A-Z]{2}$/.test(r) ? a : ""; // sin letras finales, solo si la corrección cuadra (p. ej. «…0001 0Q» leído por «…0001 OQ»)
};

// ── Detección del tipo de documento ──
// Puntuación por huellas de cada documento (el que más suma gana; si ninguno llega a 3, decide el nombre del archivo)
const LEC_HUELLAS = {
  seguros: [[/COBERTURA DE FALLECIMIENTO/, 3], [/CONTRATOS? DE SEGUROS/, 3], [/ASEGURADOR/, 1], [/POLIZA/, 1]],
  poliza: [[/POLIZA DE SEGURO|CERTIFICADO (?:INDIVIDUAL )?DE SEGURO|CONDICIONES PARTICULARES|CERTIFICADO DE ADHESION|SEGURO DE VIDA/, 3], [/CAPITAL ASEGURADO|CAPITAL GARANTIZADO|SUMA ASEGURADA|CAPITAL (?:EN CASO DE|POR) FALLECIMIENTO/, 3], [/BENEFICIARI/, 2], [/TOMADOR/, 2], [/\bPRIMA\b/, 1], [/ASEGURAD[OA]\b/, 1]],
  ultimas: [[/ACTOS? DE ULTIMA VOLUNTAD|ULTIMAS VOLUNTADES/, 3], [/OTORGANTE/, 1], [/PROTOCOLO/, 1]],
  herederos: [[/DECLARACION DE HEREDEROS/, 4], [/AB ?INTESTATO|INTESTAD[AO]/, 3], [/ACTA DE NOTORIEDAD/, 2], [/REQUIRENTE|REQUIERE/, 1], [/HEREDER/, 1], [/NOTARI/, 1]],
  familia: [[/LIBRO DE FAMILIA/, 5], [/CERTIFICA(?:DO|CION)\b[A-Z ]{0,30}(?:DE (?:INSCRIPCION DE )?)?(?:MATRIMONIO|NACIMIENTO)|INSCRIPCION DE (?:MATRIMONIO|NACIMIENTO)|EXTRACTO DEL? ACTA DE (?:MATRIMONIO|NACIMIENTO)|ACTE DE (?:MARIAGE|NAISSANCE)/, 5], [/\bMATRIMONIO\b/, 1], [/REGIMEN ECONOMICO/, 1], [/CONYUGE|CONTRAYENTE|MARIDO|MUJER|ESPOS[OA]/, 1], [/REGISTRO CIVIL/, 1], [/\bHIJ[OA]S?\b/, 1], [/PROGENITOR|\bPADRE\b|\bMADRE\b/, 1]],
  padron: [[/EMPADRONAMIENTO|PADRON MUNICIPAL|HOJA PADRONAL/, 4], [/\bPADRON\b/, 2], [/EMPADRONAD/, 2], [/CONVIV/, 2], [/AYUNTAMIENTO/, 1], [/DOMICILIO/, 1], [/HABITANTES/, 1]],
  notasimple: [[/NOTA SIMPLE|NOTA INFORMATIVA/, 3], [/REGISTRO DE LA PROPIEDAD/, 2], [/IDUFIR|\bCRU\b/, 2], [/\bFINCA\b/, 1], [/\bCARGAS\b/, 1], [/TITULARIDAD|TITULARES/, 1], [/PLENO DOMINIO|NUDA PROPIEDAD/, 1]],
  ibi: [[/IMPUESTO SOBRE BIENES INMUEBLES/, 3], [/\bI\.?B\.?I\.?\b/, 2], [/\bRECIBO\b/, 1], [/CUOTA/, 1], [/BASE LIQUIDABLE/, 1], [/TIPO DE GRAVAMEN/, 1], [/\bSUMA\b|PATRONATO DE RECAUDACION|\bOAGER\b|\bATIB\b|\bORGT\b|ORGANISMO (?:AUTONOMO )?DE (?:GESTION|RECAUDACION)/, 2]],
  catastro: [[/CERTIFICACION CATASTRAL|CONSULTA (?:DESCRIPTIVA|CATASTRAL)|DESCRIPTIVA Y GRAFICA|CERTIFICADO (?:CATASTRAL )?DE(?:L)? VALOR DE REFERENCIA|CONSULTA DE(?:L)? VALOR DE REFERENCIA/, 3], [/REFERENCIA CATASTRAL/, 1], [/VALOR CATASTRAL/, 1], [/CATASTRO/, 1], [/USO PRINCIPAL|SUPERFICIE CONSTRUIDA|CULTIVO|APROVECHAMIENTO/, 1], [/VALOR DE REFERENCIA/, 1], [/POLIGONO\s*:?\s*\d{1,3}\s*,?\s*PARCELA/, 1]],
  herenciaprevia: [[/ACEPTACION Y ADJUDICACION|ADJUDICACION DE (?:LA )?HERENCIA|MANIFESTACION Y ADJUDICACION|PARTICION DE (?:LA )?HERENCIA|CUADERNO PARTICIONAL|ESCRITURA DE HERENCIA|OPERACIONES PARTICIONALES/, 4], [/ADJUDICA/, 2], [/HIJUELA/, 2], [/INVENTARIO/, 1], [/CAUSANTE/, 1], [/HEREDER/, 1], [/ESCRITURA/, 1]],
  testamento: [[/\bTESTAMENTO\b/, 2], [/INSTITUYE/, 2], [/TESTADOR/, 2], [/HEREDER/, 1], [/\bLEGA\b|LEGADO/, 1], [/COMPARECE/, 1], [/CLAUSULA/, 1], [/USUFRUCTO/, 1], [/LEGITIM/, 1]],
  defuncion: [[/DEFUNCION/, 2], [/REGISTRO CIVIL/, 2], [/FALLECI/, 1], [/INSCRIPCION/, 1], [/CERTIFICA/, 1], [/ESTADO CIVIL/, 1], [/ACTE DE DECES|DEATH CERTIFICATE|STERBEURKUNDE|PLURILING|CONVENIO DE VIENA|\bDECES\b|\bDEATH\b/, 3]],
  dni: [[/DOCUMENTO NACIONAL DE IDENTIDAD/, 3], [/\bIDESP/, 3], [/^[A-Z0-9<]{28,32}$/m, 3], [/^[A-Z0-9<]{34,38}$/m, 3], [/TARJETA DE IDENTIDAD DE EXTRANJERO|PERMISO DE RESIDENCIA|RESIDENCE PERMIT|\bNIE\b|\bTIE\b/, 2], [/\bDNI\b/, 1]],
  bancario: [[/POSICIONES/, 3], [/CERTIFICA(?:DO|CION) DE SALDOS?/, 3], [/\bSALDOS?\b/, 2], [/TESTAMENTAR[IÍ]AS?/, 2], [/\bIBAN\b|\bES\d{2} ?\d{4}/, 2], [/BANCO|CAIXA|\bCAJA\b|BANK|OPENBANK|BANKINTER|ABANCA/, 1], [/DEPOSITO|FONDO|PARTICIPACIONES/, 1], [/CUENTA CORRIENTE/, 1], [/CAPITAL PENDIENTE|TARJETA/, 1]],
  compraventa: [[/COMPRAVENTA/, 3], [/\bPRECIO\b/, 2], [/VENDEDOR|COMPRADOR/, 2], [/ESCRITURA/, 1], [/ESTIPULACION/, 1]],
  vehiculo: [[/PERMISO DE CIRCULACION/, 4], [/TARJETA ITV|FICHA TECNICA|INSPECCION TECNICA DE VEHICULOS/, 3], [/\bMATRICULA\b/, 2], [/DIRECCION GENERAL DE TRAFICO|\bDGT\b|JEFATURA (?:PROVINCIAL )?DE TRAFICO/, 2], [/BASTIDOR|\bVIN\b/, 2], [/FECHA DE (?:PRIMERA )?MATRICULACION|\bD\.?1\b.{0,8}MARCA|\bMARCA\b/, 1], [/DENOMINACION COMERCIAL|MODELO|VARIANTE/, 1]],
  modelo650: [[/MODELO 65[01]\b|MODELO 660\b|\b65[01]\b.{0,60}SUCESIONES|AUTOLIQUIDACION.{0,120}SUCESIONES|SUCESIONES.{0,120}AUTOLIQUIDACION|ADQUISICIONES? MORTIS CAUSA/, 4], [/SUCESIONES Y DONACIONES/, 1], [/BASE IMPONIBLE/, 1], [/BASE LIQUIDABLE/, 1], [/CUOTA (?:INTEGRA|TRIBUTARIA|A INGRESAR)|TOTAL A INGRESAR/, 1], [/SUJETO PASIVO/, 1], [/DEVENGO/, 1], [/AGENCIA TRIBUTARIA|HACIENDA/, 1]],
};
// Documentos que no son de la herencia: si aparece una de estas marcas y ningún tipo puntúa alto, se devuelve «desconocido» con un aviso a medida
const LEC_AJENOS = [[/\bNOMINA\b|TOTAL DEVENGADO|BASE DE COTIZACION|LIQUIDACION DE HABERES|RECIBO DE SALARIOS/, "nomina"], [/\bFACTURA\b|\bALBARAN\b|BASE IMPONIBLE.{0,40}\bIVA\b|\bIVA\b.{0,40}TOTAL FACTURA/, "factura"], [/ESTIMAD[OA]S? (?:SENOR|SENORA|CLIENTE|SR|SRA)|UN CORDIAL SALUDO|ATENTAMENTE|QUEDAMOS A SU DISPOSICION/, "carta"]];
function lecAjeno(T) { for (const [re, k] of LEC_AJENOS) if (re.test(T)) return k; return ""; }
const lecTipo = (texto, nombre) => lecTipoInfo(texto, nombre).tipo;
// Tipo con detalle: si dos tipos empatan en la puntuación, decide el nombre del archivo y se avisa
function lecTipoInfo(texto, nombre) {
  const T = lecN(texto), N = lecN(nombre);
  const P = Object.entries(LEC_HUELLAS).map(([k, H]) => [k, H.reduce((a, [re, w]) => a + (re.test(T) ? w : 0), 0)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  let mejor = P.length ? P[0][0] : "desconocido"; const max = P.length ? P[0][1] : 0;
  const aj = lecAjeno(T);
  // Un documento ajeno (factura, nómina, carta) solo se acepta como tipo de la herencia si sus huellas son claras; la factura del funeral o de la última enfermedad tiene tipo propio
  if (aj && max < (aj === "carta" ? 6 : 8) && !(aj === "factura" && mejor === "factura")) return { tipo: "desconocido" };
  if (aj && mejor === "bancario" && max < 9 && !/\d,\d{2}(?!\d)/.test(texto)) return { tipo: "desconocido" }; // carta del banco sin un solo importe: no es un certificado
  if (max >= 3) {
    const emp = P.filter(([, s]) => s === max).map(([k]) => k);
    if (emp.length > 1) { const porNombre = lecTipoPorNombre(N); const elegido = emp.includes(porNombre) ? porNombre : emp[0]; return { tipo: elegido, empate: emp, porNombre: emp.includes(porNombre) }; }
    return { tipo: mejor };
  }
  const pn = lecTipoPorNombre(N);
  if (pn) return { tipo: pn, soloNombre: true };
  return { tipo: mejor === "desconocido" || max < 2 ? "desconocido" : mejor };
}
function lecTipoPorNombre(N) {
  for (const e of LEC_EXTRA) if (e.nombreArchivo && e.nombreArchivo.test(N)) return e.tipo;
  if (/HEREDEROS|ABINTESTATO|INTESTAD/.test(N)) return "herederos";
  if (/DEFUNCION|FALLECI/.test(N)) return "defuncion";
  if (/ULTIMAS|VOLUNTAD/.test(N)) return "ultimas";
  if (/LIBRO|FAMILIA|MATRIMONIO|NACIMIENTO/.test(N)) return "familia";
  if (/PADRON|EMPADRON/.test(N)) return "padron";
  if (/POLIZA/.test(N)) return "poliza";
  if (/SEGURO/.test(N)) return "seguros";
  if (/\bIBI\b/.test(N)) return "ibi";
  if (/CATASTR/.test(N)) return "catastro";
  if (/NOTA.?SIMPLE|REGISTRO/.test(N)) return "notasimple";
  if (/TESTAMENTO/.test(N)) return "testamento";
  if (/\bDNI\b|\bNIF\b|\bNIE\b|\bTIE\b/.test(N)) return "dni";
  if (/650|660|SUCESIONES/.test(N)) return "modelo650";
  if (/PERMISO|CIRCULACION|VEHICULO|COCHE|\bITV\b|FICHA.?TECNICA|MATRICULA/.test(N)) return "vehiculo";
  if (/HERENCIA|ADJUDICACION|ACEPTACION|PARTICION/.test(N)) return "herenciaprevia";
  if (/BANCO|SALDO|POSICION|CUENTA/.test(N)) return "bancario";
  if (/COMPRA|ESCRITURA/.test(N)) return "compraventa";
  return "";
}

// ── Extractores: devuelven { campos: [{k, etiqueta, valor, mostrar, conf}], personas: [...], bienes: [...], deudas: [...], avisos: [...] } ──
// conf: 2 = seguro (marcado), 1 = probable (marcado), 0 = dudoso (sin marcar)
function lecDefuncion(t) {
  const out = { campos: [], personas: [], avisos: [] };
  let T = t.replace(/\s+/g, " ");
  // Certificado plurilingüe (Convenio de Viena de 1976, formulario C): etiquetas en varios idiomas, fechas «20 04 2026» con espacios
  const pluri = /acte de d[ée]c[èe]s|death certificate|sterbeurkunde|plurilin|convenio de viena|extracto del acta de defunci/i.test(T);
  if (pluri) T = T.replace(/\b(\d{2}) (\d{2}) (\d{4})\b/g, "$1/$2/$3");
  // Nombre: «Nombre: X» + «Primer apellido: Y» «Segundo apellido: Z» (certificado digital) o «D./Dª NOMBRE APELLIDOS» tras «inscrito/a»
  const n1 = /Nombre\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{1,40}?)\s+(?:Primer|1\.?er)\s+apellido\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{1,30}?)\s+(?:Segundo|2\.?º)\s+apellido\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{1,30}?)(?=\s+(?:DNI|NIF|N\.I\.F|Sexo|Nacionalidad|Fecha|Documento|Lugar|$))/i.exec(T);
  let nombre = n1 ? lecNombre(`${n1[1]} ${n1[2]} ${n1[3]}`) : "";
  let nPluri = null;
  if (!nombre && pluri) { nPluri = /(?:\bNom\b|Apellidos?|Surname|Name)\s*(?:\/[^:]{0,40})?[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ' \-]{2,40}?)\s+(?:\d{1,2}\s+)?(?:Pr[ée]noms?|Nombre|Forenames?|Vornamen?)\s*(?:\/[^:]{0,40})?[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ' \-]{2,30}?)(?=\s+(?:\d{1,2}\s+)?(?:Sexe|Sexo|Sex|Geschlecht|Date|Fecha|$))/.exec(T); if (nPluri) nombre = lecNombre(`${nPluri[2]} ${nPluri[1]}`); }
  if (!nombre) { const n2 = new RegExp(`(?:${lecCI("fallecid")}[oa]|${lecCI("inscrit")}[oa]|${lecCI("defunci")}[óo]n ${lecCI("de")}|${lecCI("difunt")}[oa])\\s*[:：]?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T); if (n2) nombre = lecNombre(n2[1]); }
  // Papel antiguo, texto corrido: «Don EDUARDO TÉBAR ROSADO, hijo de…, de estado casado, falleció en Málaga el día…»
  let n4 = null;
  const cargo = (m) => /^\s*,?\s*(?:Juez|Jueza|Encargad|Notari|Secretari|Magistrad|Letrad|Registrador|Oficial|Funcionari|Director)/i.test(T.slice(m.index + m[0].length, m.index + m[0].length + 40));
  const fal = /falleci[óo]/i.exec(T);
  if (!nombre && fal) { const C = [...T.matchAll(new RegExp(`${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`, "g"))].filter((m) => m.index < fal.index && fal.index - m.index < 400 && !cargo(m) && !/(?:\bcon|\bde|\by|\be)\s*$/i.test(T.slice(Math.max(0, m.index - 12), m.index))); if (C.length) { n4 = C[C.length - 1]; nombre = lecNombre(n4[1]); } }
  if (!nombre) { const n3 = [...T.matchAll(new RegExp(`${LEC_TRAT}\\s+${LEC_NOMBRE_RE}`, "g"))].find((m) => !cargo(m)); if (n3) nombre = lecNombre(n3[1]); }
  if (nombre) out.campos.push({ k: "nombre", etiqueta: "Nombre del causante", valor: nombre, conf: n1 || nPluri ? 2 : 1 });
  const f = lecFechaCerca(T, /(?:fecha\s*(?:y\s+(?:hora|lugar)\s*)?(?:de\s*(?:la\s*)?)?(?:defunci[óo]n|fallecimiento)|date\s+(?:et\s+lieu\s+)?du\s+d[ée]c[èe]s|date\s+(?:and\s+place\s+)?of\s+death|falleci[óo]\s*(?:en\s+[A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?\s*,?\s*)?(?:el\s*(?:d[ií]a)?)?|defunci[óo]n ocurrida|ocurri[óo] el)/i, 140);
  if (f) out.campos.push({ k: "fecha", etiqueta: "Fecha del fallecimiento", valor: f, mostrar: fechaLarga(f), conf: 2 });
  else { const F = lecFechas(T).filter((q) => q.f >= "1990-01-01" && q.f <= hoy()); if (F.length) { const ult = F.sort((a, b) => b.f.localeCompare(a.f))[0]; out.campos.push({ k: "fecha", etiqueta: "Fecha del fallecimiento (la más reciente del documento)", valor: ult.f, mostrar: fechaLarga(ult.f), conf: 0 }); } }
  const ec = /estado\s+(?:civil|matrimonial)\s*(?:\/[^:]{0,40})?\s*[:：]?\s*(casad[oa]|viud[oa]|solter[oa]|divorciad[oa]|separad[oa])/i.exec(T) || /de\s+estado\s+(casad[oa]|viud[oa]|solter[oa]|divorciad[oa])/i.exec(T) || /\b(casad[oa]|viud[oa]|solter[oa]|divorciad[oa])\b/i.exec(T);
  if (ec) { const v = lecN(ec[1]); const civil = /CASAD/.test(v) ? "gananciales" : /VIUD/.test(v) ? "viudo" : /DIVORC|SEPARAD/.test(v) ? "divorciado" : "soltero"; out.campos.push({ k: "civil", etiqueta: "Estado civil", valor: civil, mostrar: ec[1].toLowerCase() + (civil === "gananciales" ? " (se propone gananciales; cambia a separación de bienes si procede)" : ""), conf: 1 }); }
  const nif = lecNifs(T); if (nif.length) out.campos.push({ k: "nifCausante", etiqueta: "DNI del causante", valor: nif[0], conf: 1 });
  const lugar = /(?:lugar|municipio|localidad)\s*(?:de\s*(?:la\s*)?)?(?:defunci[óo]n|fallecimiento)\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{2,40}?)(?=\s+(?:Provincia|Hora|Fecha|Último|Ultimo|Domicilio|Datos|$))/i.exec(T) || /\blugar\s*[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{2,40}?)(?=\s+(?:Provincia|Hora|Fecha|$))/i.exec(T)
    || new RegExp(`${lecCI("falleci")}[óoÓO]\\s+${lecCI("en")}\\s+(?:${lecCI("el")}\\s+${lecCI("hospital")}\\s+[^,]{0,40},\\s*)?([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \\-]{2,40}?)\\s*(?:,|\\s+${lecCI("el")}\\s+${lecCI("d")}[ií]${lecCI("a")}|\\s+${lecCI("el")}\\s+\\d|\\s+${lecCI("a")}\\s+${lecCI("las")}|\\s+\\(|\\.)`).exec(T)
    || (pluri ? /(?:d[ée]c[èe]s|defunci[óo]n|death)\s*(?:\/[^:]{0,40})?[:：]\s*\d{2}\/\d{2}\/\d{4}\s+([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{2,40}?)(?=\s+\d{1,2}\s+|\s+(?:Nom|Apellidos|Surname|$))/.exec(T) : null);
  if (lugar) out.campos.push({ k: "lugarFallecimiento", etiqueta: "Lugar del fallecimiento", valor: lecTitulo(lugar[1]), conf: 1 });
  // Último cónyuge (plurilingüe «Nom du dernier conjoint» / literal «casado con DOÑA X»): apellidos y nombre en ese orden
  const cj = pluri ? /(?:conjoint|c[óo]nyuge|spouse|ehegatt)[^:]{0,60}[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ' \-]{2,40}?)\s+(?:\d{1,2}\s+)?(?:Pr[ée]noms?|Nombre|Forenames?)[^:]{0,60}[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ' \-]{2,30}?)(?=\s+\d{1,2}\s+|\s+(?:Nom|Apellidos|Surname|$))/.exec(T) : null;
  if (cj) { const n = lecNombre(`${cj[2]} ${cj[1]}`); if (n) out.personas.push({ nombre: n, relacion: "conyuge", conf: 1 }); }
  else { const cj2 = new RegExp(`${lecCI("casad")}[oa]\\s+(?:${lecCI("en")}\\s+[a-záéíóúñüA-Z]+\\s+${lecCI("nupcias")}\\s+)?${lecCI("con")}\\s+${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T); if (cj2) { const n = lecNombre(cj2[1]); if (n && n !== nombre) out.personas.push({ nombre: n, relacion: "conyuge", conf: 1 }); } }
  if (pluri) out.avisos.push("Certificado plurilingüe (Convenio de Viena): sirve sin traducción ante las administraciones españolas.");
  return out;
}
function lecUltimas(t) {
  const out = { campos: [], avisos: [] }; const T = t.replace(/\s+/g, " ");
  if (/no consta|no figura|sin inscripci[óo]n|no aparece/i.test(T) && !/(?<!\bno\s{1,3})consta(?:n)?\s+(?:como\s+otorgante|inscrit)/i.test(T)) { out.campos.push({ k: "testamento", etiqueta: "Testamento", valor: "no", mostrar: "No consta testamento: sucesión intestada", conf: 2 }); return out; }
  const nota = new RegExp(`${lecCI("notari")}[oa]\\s*[:：]?\\s*(?:${lecCI("de")}\\s+[A-ZÁÉÍÓÚÑÜa-záéíóúñü ,.]+?\\s+)?${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T);
  const fecha = lecFechaCerca(T, /fecha\s*(?:del?\s*)?(?:acto|otorgamiento|testamento)/i, 40) || lecFechaCerca(T, /(?:testamento|acto)\b[^.]{0,80}?(?:fecha|otorgad[oa]|de fecha|el d[ií]a)/i, 60);
  const prot = /protocolo\s*(?:n[úu]mero|n[.º°]?)?\s*[:：]?\s*(\d{1,6})/i.exec(T);
  const tipo = /testamento\s+(abierto|cerrado|ol[óo]grafo|mancomunado)/i.exec(T);
  const partes = [tipo ? "testamento " + tipo[1].toLowerCase() : "testamento", fecha ? "de " + fechaLarga(fecha) : "", nota ? "ante " + lecNombre(nota[1]) : "", prot ? "protocolo " + prot[1] : ""].filter(Boolean).join(", ");
  out.campos.push({ k: "testamento", etiqueta: "Testamento", valor: "nose", mostrar: `Consta ${partes}. Hay que pedir copia a la notaría: hasta leerlo, el reparto queda «por confirmar»`, conf: 2 });
  out.campos.push({ k: "testamentoDatos", etiqueta: "Datos del testamento", valor: { notario: nota ? lecNombre(nota[1]) : "", fecha: fecha || "", protocolo: prot ? prot[1] : "", tipo: tipo ? tipo[1].toLowerCase() : "" }, mostrar: partes, conf: 2 });
  const nombre = new RegExp(`(?:D\\.?\\s?/\\s?D[ñÑ]?\\.?[aª]?\\.?|${lecCI("causante")}|${lecCI("otorgante")}|${lecCI("fallecid")}[oa](?:/a)?)\\s*[:：]?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T);
  if (nombre) out.campos.push({ k: "nombre", etiqueta: "Nombre del causante", valor: lecNombre(nombre[1]), conf: 1 });
  const f = lecFechaCerca(T, /fecha\s*de\s*(?:la\s*)?(?:defunci[óo]n|fallecimiento)|fallecid[oa](?:\/a)?\s+el\s+(?:d[ií]a\s+)?/i, 40); if (f) out.campos.push({ k: "fecha", etiqueta: "Fecha del fallecimiento", valor: f, mostrar: fechaLarga(f), conf: 2 });
  return out;
}
function lecSeguros(t) {
  const out = { campos: [], avisos: [] }; const T = t.replace(/\s+/g, " ");
  if (/no figura|no consta|sin contratos|ning[úu]n contrato/i.test(T)) { out.campos.push({ k: "aseguradoras", etiqueta: "Seguros de fallecimiento", valor: [], mostrar: "No consta ningún seguro de vida ni de accidentes", conf: 2 }); return out; }
  const L = [];
  for (const m of T.matchAll(/(?:entidad\s*(?:aseguradora)?|aseguradora|compa[ñn][íi]a)\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñü&.,' \-]{3,60}?)(?=\s+(?:tipo|n[úu]mero|p[óo]liza|entidad|aseguradora|compa|$))/gi)) { const n = m[1].replace(/[,.]+$/, "").trim(); if (n.length > 3 && !L.includes(n)) L.push(n); }
  if (!L.length) for (const m of T.matchAll(/\b([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ&. ]{3,40}(?:SEGUROS|VIDA|ASEGURADORA|MUTUA|INSURANCE|S\.A\.))\b/g)) { const n = lecNombre(m[1]); if (!L.includes(n)) L.push(n); }
  out.campos.push({ k: "aseguradoras", etiqueta: "Seguros de fallecimiento", valor: L, mostrar: L.length ? L.join(" · ") : "Consta algún contrato, pero no se han podido leer las entidades: ábrelo y anótalas", conf: L.length ? 2 : 0 });
  return out;
}
// Organismos de recaudación que emiten recibos del IBI por delegación: dan la provincia cuando el recibo no la trae
const LEC_ORGANISMOS = [[/\bSUMA\b|GESTI[ÓO]N TRIBUTARIA\s*[·\-]?\s*DIPUTACI[ÓO]N DE ALICANTE/i, "Alicante"], [/PATRONATO DE RECAUDACI[ÓO]N PROVINCIAL|DIPUTACI[ÓO]N DE M[ÁA]LAGA/i, "Málaga"], [/\bOAGER\b|ORGANISMO AUT[ÓO]NOMO DE GESTI[ÓO]N ECON[ÓO]MICA Y RECAUDACI[ÓO]N|DIPUTACI[ÓO]N DE SALAMANCA/i, "Salamanca"], [/\bATIB\b|AG[ÈE]NCIA TRIBUT[ÀA]RIA DE LES ILLES BALEARS/i, "Illes Balears"], [/\bORGT\b|ORGANISME DE GESTI[ÓO] TRIBUT[ÀA]RIA|DIPUTACI[ÓO] DE BARCELONA/i, "Barcelona"], [/\bOPAEF\b|DIPUTACI[ÓO]N DE SEVILLA/i, "Sevilla"], [/SERVICIO PROVINCIAL DE RECAUDACI[ÓO]N.{0,40}GRANADA|DIPUTACI[ÓO]N DE GRANADA/i, "Granada"], [/\bREGTSA\b|DIPUTACI[ÓO]N DE SALAMANCA/i, "Salamanca"], [/\bGIAHSA\b|DIPUTACI[ÓO]N DE HUELVA/i, "Huelva"], [/SERVICIO DE RECAUDACI[ÓO]N.{0,30}DIPUTACI[ÓO]N DE C[ÁA]DIZ|\bSPRYGT\b/i, "Cádiz"], [/DIPUTACI[ÓO]N DE C[ÓO]RDOBA|\bICHL\b/i, "Córdoba"], [/\bOAR\b.{0,20}BADAJOZ|DIPUTACI[ÓO]N DE BADAJOZ/i, "Badajoz"], [/DIPUTACI[ÓO]N DE VALENCIA|DIPUTACI[ÓO] DE VAL[ÈE]NCIA/i, "Valencia"], [/DIPUTACI[ÓO]N DE CASTELL[ÓO]N|DIPUTACI[ÓO] DE CASTELL[ÓO]/i, "Castellón"], [/\bAGENCIA TRIBUTARIA MADRID\b|AYUNTAMIENTO DE MADRID/i, "Madrid"]];
function lecCatastro(t, esIbi) {
  const T = t.replace(/[ \t]+/g, " ");
  // Varios inmuebles en un mismo recibo o certificación: un bloque por referencia catastral (si hay más de una y están separadas)
  const buscaRefs = (z) => [...z.matchAll(/\b(\d{7}[A-Z]{2}\d{4}[A-Z]\d{4}[A-Z]{2}|\d{5}[A-Z]\d{3}\d{5}\d{4}[A-Z]{2})\b/g)].filter((m, i, A) => A.findIndex((q) => q[1] === m[1]) === i);
  let unicas = buscaRefs(T.replace(/\s+/g, " "));
  if (unicas.length > 1) {
    const out = { campos: [], bienes: [], avisos: [] };
    // Tabla con cabecera (una fila por inmueble sin etiquetas): el orden de las columnas de importes sale de la línea de cabecera, que se quita del texto
    const cab = T.split("\n").find((l) => /valor\s+ca[dt]astral|val\.?\s*cat|v\.?\s*c\.?\s*(?:total|suelo)/i.test(l) && !/\d{1,3}(?:\.\d{3})*,\d{2}/.test(l) && !/\d{7}[A-Z]{2}\d{4}[A-Z]\d{4}[A-Z]{2}/.test(l));
    const cols = cab ? [...cab.matchAll(/(valor\s+ca[dt]astral(?:\s+(?:del?\s+)?(?:suelo|s[òo]l|construcci[óo]n?|total))?|val\.?\s*cat\.?(?:\s+(?:suelo|constr\.?|total))?|v\.?\s*c\.?\s+(?:suelo|constr\.?|total)|base\s+(?:imponible|liquidable)|cuota(?:\s+(?:[íi]ntegra|l[íi]quida))?|tipo(?:\s+de\s+gravamen)?)/gi)].map((q) => /suelo|s[òo]l/i.test(q[1]) ? "suelo" : /constr/i.test(q[1]) ? "construccion" : /cuota/i.test(q[1]) ? "cuota" : /tipo/i.test(q[1]) ? "tipo" : /base/i.test(q[1]) ? "base" : "total") : null;
    const Tp = (cab ? T.replace(cab, " ") : T).replace(/\s+/g, " "); unicas = buscaRefs(Tp);
    const prov = LEC_ORGANISMOS.find(([re]) => re.test(Tp));
    // Dónde empieza cada inmueble: la etiqueta que se repite tantas veces como referencias hay (Situación, Localización, Referencia…); si ninguna cuadra, a medio camino entre referencias
    let cortes = null;
    for (const re of [/\b(?:Situaci[óo]n?|Localizaci[óo]n|Objeto tributario|Emplazamiento|Direcci[óo]n|Ubicaci[óo]n)\s*(?:del\s+inmueble)?\s*[:：]/gi, /\b(?:Ref\.?\s*cat(?:astral|\.)?|Referencia catastral|Refer[èe]ncia cadastral)\s*[:：]?/gi, /\bFinca\s*(?:n[.º°]?|n[úu]mero)?\s*[:：]?\s*\d/gi]) { const P = [...Tp.matchAll(re)].map((q) => q.index); if (P.length === unicas.length && P.every((pos, i) => i === 0 || pos > unicas[i - 1].index)) { cortes = P; break; } }
    if (!cortes) cortes = unicas.map((m, i) => (i === 0 ? 0 : Math.round((unicas[i - 1].index + m.index) / 2)));
    unicas.forEach((m, i) => {
      const ini = i === 0 ? 0 : cortes[i], fin = i + 1 < unicas.length ? cortes[i + 1] : Tp.length;
      const d = lecCatastroUno(Tp.slice(ini, fin), esIbi, prov ? prov[1] : "");
      const b = d.bienes[0];
      // Tabla sin etiqueta por fila: la situación es lo que va delante de la referencia en su línea (y el municipio, su código postal)
      if (b && (!b.descripcion || /^(?:Inmueble|Plaza de garaje|Ref|Referencia|Uso|Situaci|Valor)/i.test(b.descripcion))) { const lin = T.split("\n").find((l) => l.includes(m[1])) || ""; const dir = lin.slice(0, lin.indexOf(m[1])).trim(); if (dir.length >= 6 && /[A-Za-z]{3}/.test(dir)) { const mu = /\b\d{5}\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?)\s*(?:\(([A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{3,30})\))?\s*$/.exec(dir); b.descripcion = lecDireccion(dir.replace(/\s*\d{5}\s.*$/, ""), 80); if (mu && !b.muniNombre) { b.muniNombre = lecTitulo(mu[1]); if (mu[2]) b.muniProv = lecTitulo(mu[2]); } d.avisos = d.avisos.map((a) => a.replace(/^(?:Inmueble|Ref\. catastral|Plaza de garaje)(?=[: (])/, b.descripcion)); } }
      if (b && !b.valorCatastralTotal && !b.valorCatastralSuelo) {
        // Fila de tabla sin etiquetas: los importes de la línea de la referencia (o de las dos siguientes, si la celda va partida)
        const LN = T.split("\n"); const idx = LN.findIndex((l) => l.includes(m[1])); const imp = (l) => [...l.matchAll(/(?<![\d.,])(\d{1,3}(?:\.\d{3})*,\d{2})(?![\d.])/g)].map((q) => lecNum(q[1]));
        let nums = []; for (let k = idx; k >= 0 && k <= idx + 2 && k < LN.length; k++) { nums = imp(LN[k]); if (nums.length >= 2) break; }
        const monet = cols ? cols.filter((c) => c !== "tipo") : [];
        let asignado = false;
        if (cols && nums.length === monet.length) { monet.forEach((c, k) => { if (c === "total") b.valorCatastralTotal = nums[k]; else if (c === "suelo") b.valorCatastralSuelo = nums[k]; else if (c === "base" && !b.valorCatastralTotal) b.valorCatastralTotal = nums[k]; }); asignado = !!b.valorCatastralTotal; }
        else if (nums.length >= 2) {
          // Sin cabecera legible: por posición. «suelo + construcción = total» si la suma cuadra; si no, «total, suelo (, cuota pequeña)»
          const [a, c2, c3] = nums;
          if (nums.length >= 3 && Math.abs(a + c2 - c3) < 1) { b.valorCatastralSuelo = a; b.valorCatastralTotal = c3; asignado = true; }
          else if (a >= c2 && (nums.length === 2 ? c2 > a * 0.05 : c3 < a * 0.1)) { b.valorCatastralTotal = a; b.valorCatastralSuelo = c2; asignado = true; }
          else if (nums.length === 2 && c2 <= a * 0.05) { b.valorCatastralTotal = a; asignado = true; }
          if (asignado) { b.conf = 1; d.avisos.push(`${b.descripcion}: valores catastrales asignados por su posición en la tabla (${eur0(b.valorCatastralTotal)}${b.valorCatastralSuelo ? ", suelo " + eur0(b.valorCatastralSuelo) : ""}): compruébalos en el recibo.`); }
        }
        if (asignado) { if (b.valorCatastralTotal && b.valorCatastralSuelo && b.valorCatastralTotal >= b.valorCatastralSuelo) b.valorCatastralConstruccion = Math.round((b.valorCatastralTotal - b.valorCatastralSuelo) * 100) / 100; d.avisos = d.avisos.filter((a) => !/No se ha le[íi]do el valor catastral|no incluye los valores/.test(a)); if (cols) b.conf = 2; }
      }
      out.bienes.push(...d.bienes); for (const a of d.avisos) if (!out.avisos.includes(a)) out.avisos.push(a);
    });
    out.avisos.unshift(`El documento contiene ${unicas.length} inmuebles: se propone cada uno por separado.`);
    return out;
  }
  const prov = LEC_ORGANISMOS.find(([re]) => re.test(T));
  return lecCatastroUno(T, esIbi, prov ? prov[1] : "");
}
function lecCatastroUno(T, esIbi, provOrg) {
  const out = { campos: [], bienes: [], avisos: [] };
  const ref = lecRefCat(T);
  // Etiquetas del valor catastral según el organismo (la certificación de la sede: «Valor catastral», «Valor catastral suelo», «Valor catastral construcción»): «Valor catastral», «Val. cat.», «V.C. suelo», «V. catastral», «VC total», «Base imponible» (en el IBI coincide con el valor catastral)
  const VC = "(?:valor\\s+ca[dt]astral|val\\.?\\s*cat(?:astral|\\.)?|v\\.?\\s*c\\.?(?![a-z.])|v\\.?\\s*ca[dt]astral|\\bVC\\b)";
  const vTotal = lecDineroCerca(T, new RegExp(`${VC}(?!\\s*(?:del?\\s+)?(?:la\\s+)?(?:suelo|s[òo]l|constr|s\\b|c\\b))(?:\\s*(?:total|del?\\s+inmueble|\\(€\\)|€))?\\s*(?:\\((?:a[ñn]o\\s+)?\\d{4}\\))?\\s*[:：]?`, "i")) || lecDineroCerca(T, /\bV\.?\s*catastral\b(?!\s*suelo)\s*[:：]?/i) || (esIbi ? lecDineroCerca(T, /base\s+imponible\s*[:：]?/i) : null);
  const vSuelo = lecDineroCerca(T, new RegExp(`${VC}\\s+(?:del\\s+)?(?:suelo|s[òo]l|s\\b)\\s*[:：]?`, "i")) || lecDineroCerca(T, /\bV\.?\s*(?:cat\.?\s*)?suelo\b\s*[:：]?/i) || lecDineroCerca(T, /\bsuelo\s*[:：]/i);
  const vCons = lecDineroCerca(T, new RegExp(`${VC}\\s+(?:de\\s+)?(?:la\\s+)?(?:construcci[óo]n?|constr\\.?|c\\b)\\s*[:：]?`, "i"));
  const loc = /(?:localizaci[óo]n|situaci[óo]n|direcci[óo]n|domicilio tributario|emplazamiento|objeto tributario|ubicaci[óo]n)\s*(?:del\s+inmueble)?\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][^\n]{6,110}?)(?=\s+(?:Clase|Uso|Superficie|Ref\.?|Referencia|Coeficiente|A[ñn]o|Valor|Val\.|V\.C|Base|Titular|Municipio|Ejercicio|Cuota|\n|$))/i.exec(T);
  const sup = /superficie\s*(?:construida|del inmueble)?\s*[:：]?\s*(\d{1,5}(?:,\d+)?)\s*m/i.exec(T);
  const uso = /uso\s*(?:principal|local|del\s+inmueble)?\s*[:：]?\s*(residencial|vivienda|almac[ée]n|aparcamiento|garaje|comercial|industrial|oficinas|agrario|suelo sin edif|r[úu]stico)/i.exec(T);
  const anio = /a[ñn]o\s*(?:de\s*)?construcci[óo]n\s*[:：]?\s*(\d{4})/i.exec(T);
  const muni = /\b(\d{5})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?)\s*[(\[]([A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{3,30})[)\]]/.exec(T) || /\bmunicipio\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?)(?=\s*(?:[,.;(\n]|\s+(?:Provincia|Prov|Ref|Situaci|Ejercicio|Objeto|Titular|$)))/i.exec(T) || /\b(\d{5})\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ' \-]{2,40}?)(?=\s*(?:\n|$|[,.;]|\s+(?:Ref|Clase|Uso|Titular|Valor|Val\.)))/.exec(T);
  const muniNombre = muni ? lecTitulo(muni.length === 4 ? muni[2] : muni.length === 3 && muni[2] ? muni[2] : muni[1]) : "";
  const muniProv = muni && muni.length === 4 && muni[3] ? lecTitulo(muni[3]) : (/provincia\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,30}?)(?=\s*[,.;\n(]|\s+(?:Ref|Ejercicio|$))/i.exec(T) || [])[1] ? lecTitulo(/provincia\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,30}?)(?=\s*[,.;\n(]|\s+(?:Ref|Ejercicio|$))/i.exec(T)[1]) : provOrg || "";
  const esGaraje = uso && /aparcamiento|garaje/i.test(uso[1]);
  const b = { tipo: esGaraje ? "inmueble" : uso && /residencial|vivienda/i.test(uso[1]) ? "vivienda" : "inmueble", descripcion: loc ? lecDireccion(loc[1].replace(/\s+\d{5}\s+[^\n]*$/, ""), 80) : esGaraje ? "Plaza de garaje" : "Inmueble", refCatastral: ref, valorCatastralTotal: vTotal, valorCatastralSuelo: vSuelo, muniNombre, muniProv, superficie: sup ? lecNum(sup[1]) : null, anioConstruccion: anio ? Number(anio[1]) : null, usoResidencial: !!(uso && /residencial|vivienda/i.test(uso[1])) };
  // Finca rústica (polígono y parcela): descripción propia, superficie en hectáreas, cultivos. No está sujeta a la plusvalía municipal (solo grava terrenos urbanos)
  const T1 = T.replace(/\s+/g, " ");
  const rustica = /NATURALEZA\s+R[ÚU]STICA|\bCLASE\s*[:：]?\s*R[ÚU]STIC|BIEN\s+INMUEBLE\s+R[ÚU]STICO|POL[ÍI]GONO\s*[:：]?\s*\d{1,3}\s*,?\s*PARCELA\s*[:：]?\s*\d{1,5}/i.test(T1) || (ref && /^\d{5}[A-Z]\d{3}\d{5}\d{4}[A-Z]{2}$/.test(ref));
  if (rustica) {
    const pp = /pol[íi]gono\s*[:：]?\s*(\d{1,3})\s*,?\s*parcela\s*[:：]?\s*(\d{1,5})(?:\s*,?\s*(?:paraje\s*[:：]?\s*)?([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?))?(?=\s*(?:[.,;(]|\s+(?:\d{5}\b|Municipio|Clase|Uso|Superficie|Cultivo|Referencia|Valor|Titular|$)))/i.exec(T1);
    const paraje = (pp && pp[3]) || ((/(?:paraje|sitio|pago)\s*[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?)(?=\s*(?:[.,;(\n]|\s+(?:Municipio|Clase|Uso|Superficie|Cultivo|$)))/i.exec(T1) || [])[1]);
    const mr = /pol[íi]gono\s*[:：]?\s*\d{1,3}\s*,?\s*parcela\s*[:：]?\s*\d{1,5}[^.()\[\n]{0,50}?\.\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?)\s*[(\[]([A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{3,30})[)\]]/i.exec(T1) || /\bmunicipio\s*[:：]\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{2,40}?)(?:\s*\(([A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{3,30})\))?(?=\s*(?:[,.;\n(]|\s+(?:Provincia|Pol|Parcela|Clase|$)))/i.exec(T1);
    if (mr) { b.muniNombre = lecTitulo(mr[1]); if (mr[2]) b.muniProv = lecTitulo(mr[2]); }
    const sp = /superficie\s*(?:gr[áa]fica|del\s+suelo|de\s+la\s+parcela|catastral|total|de\s+la\s+finca)?\s*(?:\(\s*(?:m2|m²|ha)\s*\))?\s*[:：]?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)\s*(m2|m²|metros|ha\b|hect[áa]reas?)/i.exec(T1);
    if (sp) b.superficie = Math.round(lecNum(sp[1]) * (/^h/i.test(sp[2]) ? 10000 : 1));
    const CULT = [...new Set([...T1.matchAll(/\b(labor(?:\s+o\s+labrad[íi]o)?(?:\s+(?:secano|regad[íi]o))?|olivos?(?:\s+(?:secano|regad[íi]o))?|olivar|vi[ñn]a|vi[ñn]edo|pastos?|pinar(?:\s+maderable)?|monte\s+bajo|matorral|frutales(?:\s+(?:secano|regad[íi]o))?|almendros?|encinar|prado|eucaliptus|alcornocal|improductivo|huerta)\b/gi)].map((m) => m[1].toLowerCase()))].slice(0, 4);
    const ha = b.superficie ? (b.superficie / 10000).toLocaleString("es-ES", { maximumFractionDigits: 4 }) + " ha" : "";
    b.tipo = "inmueble"; b.rustico = true; b.usoResidencial = false;
    if (pp) { b.poligono = pp[1]; b.parcela = pp[2]; }
    b.descripcion = ["Finca rústica", pp ? `polígono ${pp[1]}, parcela ${pp[2]}` : "", paraje ? `paraje ${lecTitulo(paraje)}` : "", b.muniNombre ? `término de ${b.muniNombre}` : "", ha, CULT.length ? CULT.join(", ") : ""].filter(Boolean).join(", ");
    if (b.valorCatastralSuelo) { b.valorCatastralSueloRustico = b.valorCatastralSuelo; b.valorCatastralSuelo = null; }
    out.avisos.push(`${b.descripcion}: suelo rústico, no sujeto a la plusvalía municipal (el impuesto solo grava terrenos de naturaleza urbana, art. 104 TRLRHL). Tributa en Sucesiones por su valor${b.valorCatastralTotal ? "; el valor catastral, " + eur0(b.valorCatastralTotal) + ", es solo una referencia mínima" : ""}.`);
  }
  // Valor de referencia del Catastro (desde 2022, base mínima del Impuesto de Sucesiones para inmuebles, art. 9.3 LISD): se propone como valor del inmueble
  const vrNo = /no\s+(?:dispone|tiene|consta|existe)[^.\n]{0,40}valor\s+de\s+referencia|valor\s+de\s+referencia\s*(?:\([^)]{0,20}\))?\s*[:：]?\s*(?:no\s+(?:disponible|consta|determinado|calculado)|sin\s+(?:valor|determinar)|[-–—]\s*(?:\n|$))/i.test(T1);
  const vrM = vrNo ? null : /valor\s+de\s+referencia(?:\s+(?:del\s+inmueble|vigente|catastral))?\s*(?:\(\s*(?:a[ñn]o\s+|ejercicio\s+)?(\d{4})\s*\)|(?:del?\s+)?(?:a[ñn]o|ejercicio)\s+(\d{4})|a\s+fecha\s*(?:de\s+)?\d{1,2}[\/.\-]\d{1,2}[\/.\-](\d{4}))?\s*[:：]?\s*(?:€\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d{1,6},\d{2})(?![\d.,])/i.exec(T1);
  if (vrM) {
    const vr = lecNum(vrM[4]); const anioVR = vrM[1] || vrM[2] || vrM[3] || (/(?:a[ñn]o|ejercicio)\s+(?:del\s+)?(?:valor\s+de\s+referencia|VR)\s*[:：]?\s*(\d{4})|fecha\s+de\s+(?:efectos|referencia)\s*[:：]?\s*\d{1,2}[\/.\-]\d{1,2}[\/.\-](\d{4})/i.exec(T1) || []).slice(1).find(Boolean) || "";
    if (vr > 0) { b.valorReferencia = vr; b.valor = vr; b.valorFuente = `valor de referencia del Catastro${anioVR ? " " + anioVR : ""}`; b.anioValorReferencia = anioVR ? Number(anioVR) : null; b.prioValor = 3;
      out.avisos.push(`${b.descripcion}: valor de referencia del Catastro ${eur0(vr)}${anioVR ? " (" + anioVR + ")" : ""}, propuesto como valor del inmueble. En Sucesiones la base no puede ser inferior a él (art. 9.3 LISD); si el valor de mercado es mayor, súbelo. ${anioVR ? `Sirve para fallecimientos de ${anioVR}; si el fallecimiento fue otro año, consulta el de ese año en la sede del Catastro.` : "Comprueba que sea el del año del fallecimiento."}`); }
  }
  if (!b.valorReferencia && ref) out.avisos.push(`${b.descripcion} (ref. ${ref}): ${vrNo ? "el Catastro indica que no tiene valor de referencia" : "el documento no trae el valor de referencia"}, así que el valor del inmueble queda VACÍO. Sin él, el inmueble no suma en Sucesiones y la plusvalía no se puede calcular bien. ${vrNo ? "Anota el valor de mercado (tasación o precio de inmuebles similares)." : "Consúltalo en la sede electrónica del Catastro (servicio «Valor de referencia») y anótalo, o sube ese certificado."}`);
  if (vTotal && vSuelo && vSuelo > vTotal) out.avisos.push("El valor del suelo leído supera el total: revisa el documento.");
  if (!vTotal && !vSuelo) out.avisos.push(esIbi ? "No se ha leído el valor catastral en el recibo: comprueba que sea el recibo completo del IBI." : b.valorReferencia ? "El documento trae el valor de referencia pero no los valores catastrales: para la plusvalía hace falta el del suelo (recibo del IBI o certificación catastral)." : "Esta consulta catastral no incluye los valores catastrales (solo los lleva la certificación para el titular o el recibo del IBI).");
  if (!vCons && vTotal && vSuelo && vTotal >= vSuelo) b.valorCatastralConstruccion = Math.round((vTotal - vSuelo) * 100) / 100;
  if (vTotal && !vSuelo && !rustica) out.avisos.push(`${b.descripcion}: el recibo trae el valor catastral total pero no el del suelo, que es el que usa la plusvalía municipal. Pídelo en la sede del Catastro.`);
  // Titulares catastrales: «TÉBAR ROSADO EDUARDO 00000492D 50,00 % de propiedad» (apellidos y nombre)
  const zonaT = (() => { const i = T.search(/TITULAR(?:ES|IDAD)?\b/i); return i >= 0 ? T.slice(i) : ""; })();
  const titulares = []; out.personas = [];
  for (const m of zonaT.matchAll(/([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü' \-]{4,60}?)\s*[·,]?\s*(\d{8}\s?-?\s?[A-Z]|[XYZ]\s?-?\s?\d{7}\s?-?\s?[A-Z])\b\s*[·,]?\s*(?:(\d{1,3}(?:,\d{1,2})?)\s*%\s*(?:de\s+)?(propiedad|usufructo|nuda\s+propiedad|dominio)?)?/g)) {
    const nif = m[2].replace(/[\s-]/g, "").toUpperCase(); if (!lecNifOk(nif)) continue;
    const nombre = /,/.test(m[1]) ? lecNombre(m[1].split(",").reverse().join(" ")) : lecApellidosNombre(m[1]); if (!nombre || titulares.some((q) => q.nif === nif)) continue;
    const derecho = m[4] ? (/usufructo/i.test(m[4]) ? "usufructo" : /nuda/i.test(m[4]) ? "nuda" : "pleno") : "";
    titulares.push({ nombre, nif, pct: m[3] ? lecNum(m[3]) : null, derecho }); out.personas.push({ nombre, nif, rol: "titular registral", derecho, conf: 1 });
  }
  if (titulares.length) b.titulares = titulares;
  out.bienes.push({ ...b, conf: ref || vTotal ? 2 : 1 });
  return out;
}
// Cabecera de cada finca en la nota: «FINCA DE MÁLAGA Nº 12345», «FINCA Nº 777», «FINCA REGISTRAL: 23456», «Nº FINCA: 11223», «FINCA 34567 DE SEVILLA»
const LEC_FINCA_RE = /\bFINCA\s*(?:REGISTRAL\s*)?(?:DE\s+[A-ZÁÉÍÓÚÑÜa-záéíóúñü.\- ]{2,40}?(?:\s+\d{1,2})?\s+(?:SECCI[ÓO]N\s+\d+\S*\s+)?)?(?:N[úÚuU]MERO|N[.º°ºo]{0,2}|NUM\.?)\s*[:：]?\s*(\d{1,7})\b|\bN[.º°ºo]{0,2}\s*(?:DE\s+)?FINCA\s*[:：]?\s*(\d{1,7})\b|\bFINCA\s*[:：]\s*(\d{1,7})\b/gi;
function lecNotaSimple(t) {
  const T = t.replace(/[ \t]+/g, " ");
  const H = [...T.matchAll(LEC_FINCA_RE)].filter((m, i, A) => !i || m.index - A[i - 1].index > 200); // cabeceras de finca (a 200 caracteres de distancia como mínimo)
  if (H.length <= 1) return lecNotaFinca(T);
  const out = { campos: [], bienes: [], deudas: [], personas: [], avisos: [] };
  H.forEach((m, i) => {
    const ini = i === 0 ? 0 : m.index, fin = i + 1 < H.length ? H[i + 1].index : T.length;
    const d = lecNotaFinca(T.slice(ini, fin));
    out.bienes.push(...d.bienes); out.deudas.push(...d.deudas);
    for (const p of d.personas) if (!out.personas.some((q) => q.nombre === p.nombre)) out.personas.push(p);
    for (const a of d.avisos) if (!out.avisos.includes(a)) out.avisos.push(a);
  });
  const regComun = (out.bienes.find((b) => b.registro) || {}).registro || ""; for (const b of out.bienes) if (!b.registro) b.registro = regComun;
  if (out.bienes.every((b) => /libre/i.test(b.cargasTxt || ""))) out.campos.push({ k: "cargas", etiqueta: "Cargas", valor: "libre", mostrar: `Las ${out.bienes.length} fincas constan libres de cargas`, conf: 2 });
  out.avisos.unshift(`La nota simple contiene ${out.bienes.length} fincas: se propone cada una por separado.`);
  return out;
}
function lecNotaFinca(T) {
  const out = { campos: [], bienes: [], deudas: [], personas: [], avisos: [] };
  const ref = lecRefCat(T);
  const fm = new RegExp(LEC_FINCA_RE.source, "i").exec(T); const finca = fm ? fm[1] || fm[2] || fm[3] : "";
  const cru = /(?:IDUFIR|CRU|C[óo]digo\s+Registral\s+[ÚU]nico)\s*(?:\([^)]{0,30}\))?\s*[:：]?\s*(\d{14})/i.exec(T);
  const reg = /REGISTRO DE LA PROPIEDAD\s+(?:DE\s+)?([A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40}?(?:\s+(?:N[.º°ºo]{0,2}|N[úu]mero)\s*\d{1,2})?)(?=\s*[\n,.·(]|\s+(?:Colegio|NOTA|Nota|$))/.exec(T)
    || ((m) => m && [m[0], `${m[2]} nº ${m[1]}`])(/REGISTRO DE LA PROPIEDAD\s+N[.º°ºo]{0,2}\s*(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40}?)(?=\s*[\n,.·(]|$)/i.exec(T)) // «REGISTRO DE LA PROPIEDAD Nº 2 DE ÁVILA»
    || /Registrador(?:a)?\s+de\s+la\s+Propiedad\s+de\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40}?(?:\s+(?:N[.º°ºo]{0,2}|N[úu]mero)\s*\d{1,2})?)(?=\s*[\n,.·(]|$)/i.exec(T);
  const T1 = T.replace(/\s+/g, " ");
  // Descripción: «URBANA: VIVIENDA…», «URBANA.- NÚMERO TRES.- Piso…», «DESCRIPCIÓN: RÚSTICA. Parcela…», en catalán «URBANA: ENTITAT…»
  const desc = /(URBANA|R[ÚU]STICA|RUSTICA)\s*[:.\-–]+\s*(?:N[ÚU]MERO\s+[A-ZÁÉÍÓÚÑÜ ]{2,40}?\s*[.\-–]+\s*|ENTIDAD\s+N[ÚU]MERO\s+[A-ZÁÉÍÓÚÑÜ ]{2,30}?\s*[.\-–]+\s*|FINCA\s+N[ÚU]MERO\s+[A-ZÁÉÍÓÚÑÜ ]{2,30}?\s*[.\-–]+\s*)?(.{10,220}?)(?=\s+(?:Tiene una superficie|Superficie|Consta de|Linda|Cuota|Referencia|Inscri|Ocupa|Mide|Se compone|Coeficiente|Participaci|$))/i.exec(T1);
  const tipoDesc = desc && /vivienda|piso|casa|chalet|apartamento|d[úu]plex|[áa]tico|unifamiliar|habitatge|pis\b/i.test(desc[2]) ? "vivienda" : "inmueble";
  if (desc) desc[2] = desc[2].replace(/^C[óo]digo\s+Registral\s+[ÚU]nico\s*[:：]?\s*\d{14}\s*[.\-–]?\s*/i, ""); // «URBANA: Código Registral Unico: 2901…. VIVIENDA…»
  const b = { tipo: tipoDesc, descripcion: desc ? lecFrase(desc[2], 90) : (finca ? `Finca registral ${finca}` : "Inmueble de la nota simple"), refCatastral: ref, fincaRegistral: finca, cru: cru ? cru[1] : "", registro: reg ? lecTitulo(reg[1]) : "", conf: 2 };
  if (desc && /^R/i.test(lecN(desc[1]))) { b.rustico = true; b.usoResidencial = false; }
  // Titularidad: «X ... N.I.F. ... titular del pleno dominio de una mitad indivisa con carácter ganancial» / «100,00 % del pleno dominio ... privativo»
  const zonaTit = (() => { const i = T1.search(/TITULARIDAD|TITULARES|TITULARITAT|TITULAR\b/i); return i >= 0 ? T1.slice(i) : T1; })().replace(/\b(?:CARGAS|C[ÀA]RREGUES)\b[\s\S]*$/i, "");
  const gan = /(?:car[áa]cter|bienes?|naturaleza)\s+ganancial|para\s+(?:su|la)\s+sociedad\s+(?:conyugal\s+)?de\s+gananciales/i.test(zonaTit), priv = /(?:car[áa]cter|bien|naturaleza)\s+privativ/i.test(zonaTit);
  const pct = /(\d{1,3}(?:[,.]\d{1,6})?)\s*%\s*(?:del?\s+)?(?:pleno\s+dominio|propiedad|nuda\s+propiedad|usufructo)/i.exec(zonaTit) || /(?:pleno\s+dominio|propiedad)[^.]{0,40}?(\d{1,3}(?:[,.]\d{1,6})?)\s*%/i.exec(zonaTit) || /participaci[óo]n\s*[:：]?\s*(\d{1,3}(?:[,.]\d{1,6})?)\s*%/i.exec(zonaTit);
  const frac = /\b(?:mitad|terc|cuart|quint|sext|octav|d[ée]cim|doceav)\w*(?:\s+partes?)?\s+indivis|\b(?:una|un|dos|tres)\s+(?:mitad|tercio|tercera|cuarta|quinta|sexta|octava|d[ée]cima)\s*(?:partes?)?\b/i.test(zonaTit) ? lecFraccion(zonaTit) : null;
  const pctNum = pct ? lecNum(pct[1].replace(".", ",")) : null;
  b.titularidad = gan ? "ganancial" : (pctNum != null && pctNum < 100) || frac ? "proindiviso" : "privativo";
  if (b.titularidad === "proindiviso") b.porcentaje = Math.round((pctNum != null && pctNum < 100 ? pctNum : frac) * 100) / 100;
  // Título y fecha de adquisición: «por título de compraventa, en escritura autorizada el 10/05/1995». Solo la compraventa (o permuta, donación,
  // adjudicación por disolución) da directamente la fecha; en una herencia la adquisición es la fecha del fallecimiento anterior (art. 989 CC)
  const tt = /por\s+(?:t[íi]tulo\s+de\s+)?(compraventa|compra|permuta|donaci[óo]n|herencia|adjudicaci[óo]n\s+(?:por|de)\s+[a-záéíóúñü ]{4,40}?|liquidaci[óo]n\s+de\s+(?:la\s+sociedad\s+de\s+)?gananciales(?:\s+y\s+herencia)?|extinci[óo]n\s+de\s+condominio|disoluci[óo]n\s+de\s+(?:comunidad|condominio)|declaraci[óo]n\s+de\s+obra\s+nueva)\b/i.exec(zonaTit);
  if (tt) {
    const titulo = tt[1].toLowerCase().replace(/^compra$/, "compraventa"); b.tituloAdq = titulo;
    const z = zonaTit.slice(tt.index, tt.index + 260); const F = lecFechas(z); const fEsc = F.length ? F[0].f : null;
    if (fEsc && /compraventa|permuta|donaci|condominio|comunidad|obra nueva/.test(titulo)) b.fechaAdq = fEsc;
    else if (fEsc) out.avisos.push(`${b.descripcion.slice(0, 60)}: adquirida por ${titulo} en escritura de ${fechaLarga(fEsc)}. Para la plusvalía, la fecha de adquisición ${/herencia/.test(titulo) ? "es la del fallecimiento del anterior causante (art. 989 CC), no la de la escritura" : "depende del origen del bien"}${/gananciales/.test(titulo) ? "; en la liquidación de gananciales, la mitad que ya era suya se adquirió cuando se compró" : ""}: sube el título anterior o anótala.`);
  }
  const desmembrada = /usufructo/i.test(zonaTit) && /nuda\s+propiedad/i.test(zonaTit);
  if (desmembrada) out.avisos.push("La finca figura desmembrada en usufructo y nuda propiedad: comprueba qué derecho tenía el causante.");
  // Titulares con su NIF y, detrás de cada uno, su derecho (pleno dominio / usufructo / nuda propiedad) y su cuota
  const titulares = [];
  const TM = [...zonaTit.matchAll(new RegExp(`${LEC_NOMBRE_RE}\\s*,?\\s*(?:con\\s+)?(?:N\\.?I\\.?F\\.?|D\\.?N\\.?I\\.?|N\\.?I\\.?E\\.?)\\s*[:：]?\\s*(\\d{8}\\s?-?\\s?[A-Z]|[XYZ]\\s?-?\\s?\\d{7}\\s?-?\\s?[A-Z])`, "g"))];
  TM.forEach((m, i) => {
    const n = lecNombre(m[1]); if (!n || titulares.some((q) => q.nombre === n)) return;
    const z = zonaTit.slice(m.index + m[0].length, i + 1 < TM.length ? TM[i + 1].index : m.index + m[0].length + 260);
    const derecho = /\busufruct/i.test(z) && !/nuda\s+propiedad/i.test(z.slice(0, z.search(/usufruct/i) + 10)) ? "usufructo" : /nuda\s+propiedad/i.test(z) ? "nuda" : /pleno\s+dominio|propiedad|titular/i.test(z) ? "pleno" : "";
    const zp = /(\d{1,3}(?:[,.]\d{1,6})?)\s*%/.exec(z); const zf = /indivis|parte/i.test(z) ? lecFraccion(z) : null;
    const pctT = zp ? Math.round(lecNum(zp[1].replace(".", ",")) * 100) / 100 : zf != null ? zf : /totalidad|100\s*%|pleno\s+dominio\s+de\s+(?:esta|la)\s+finca/i.test(z) && !/mitad|indivis/i.test(z) ? 100 : null;
    const nif = m[2].replace(/[\s-]/g, "").toUpperCase();
    titulares.push({ nombre: n, nif, derecho, pct: pctT });
    out.personas.push({ nombre: n, nif, rol: "titular registral", derecho, conf: 1 });
  });
  // Nota simple telemática (formato actual de los Registros): tabla «TITULAR NIF TOMO LIBRO FOLIO ALTA» con «APELLIDOS, NOMBRE NIF …» y, debajo,
  // «50,000000% (CINCUENTA POR CIENTO) del pleno dominio con carácter ganancial por título de compraventa.»
  if (!titulares.length) {
    const zL = (() => { const i = T.search(/TITULARIDAD|TITULARES|TITULARITAT/i); return i >= 0 ? T.slice(i) : ""; })().replace(/\b(?:CARGAS|C[ÀA]RREGUES)\b[\s\S]*$/i, "");
    const TR = [...zL.matchAll(/^[ \t]*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'\- ]{2,50}?),[ \t]*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'\- ]{1,40}?)[ \t]+(\d{8}\s?-?\s?[A-Z]|[XYZ]\s?-?\s?\d{7}\s?-?\s?[A-Z])\b/gm)];
    TR.forEach((m, i) => {
      const nif = m[3].replace(/[\s-]/g, "").toUpperCase(); if (!lecNifOk(nif)) return;
      const n = lecNombre(`${m[2]} ${m[1]}`); if (!n || titulares.some((q) => q.nif === nif)) return;
      const z = zL.slice(m.index + m[0].length, i + 1 < TR.length ? TR[i + 1].index : m.index + m[0].length + 260);
      const derecho = /nuda\s+propiedad/i.test(z) ? "nuda" : /\busufruct/i.test(z) ? "usufructo" : /pleno\s+dominio|propiedad/i.test(z) ? "pleno" : "";
      const zp = /(\d{1,3}(?:[,.]\d{1,6})?)\s*%/.exec(z); const pctT = zp ? Math.round(lecNum(zp[1].replace(".", ",")) * 100) / 100 : /TOTALIDAD/i.test(z) ? 100 : null;
      titulares.push({ nombre: n, nif, derecho, pct: pctT }); out.personas.push({ nombre: n, nif, rol: "titular registral", derecho, conf: 1 });
    });
  }
  if (titulares.length) b.titulares = titulares;
  // Cargas
  const zonaCar = (() => { const i = T1.search(/\bCARGAS\b|C[ÀA]RREGUES/i); return i >= 0 ? T1.slice(i) : T1; })();
  b.cargasTxt = zonaCar.slice(0, 200);
  if (/libre\s+de\s+cargas|sin\s+cargas|no\s+(?:existen|constan|hay)\s+cargas|lliure\s+de\s+c[àa]rregues|CARGAS\s*[:：]?\s*(?:NO\s+(?:HAY|CONSTAN)|NINGUNA|LIBRE)/i.test(zonaCar)) out.campos.push({ k: "cargas", etiqueta: "Cargas", valor: "libre", mostrar: "La finca consta libre de cargas", conf: 2 });
  else if (/hipoteca/i.test(zonaCar)) {
    const banco = /hipoteca\s+(?:a\s+favor\s+de|constituida\s+a\s+favor\s+de)\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü,.&' \-]{3,60}?)(?=\s*(?:,|\.|S\.A|en garant|para responder|responde|por un|de un|$))/i.exec(zonaCar);
    const princ = lecDineroCerca(zonaCar, /(?:responde\s+de\s+un\s+)?(?:principal|capital)\s*(?:de|por\s+importe\s+de|:)?\s*/i, 60) || lecDineroCerca(zonaCar, /hipoteca[^.]{0,200}?(?:de|por)\s*/i, 60);
    const bk = LEC_BANCOS.exec(zonaCar); const acreedor = banco ? lecTitulo(banco[1].replace(/,?\s*S\.?A\.?U?\.?$/i, "")) : bk ? lecNombreBanco(bk[1]) : "";
    out.deudas.push({ concepto: `Hipoteca${acreedor ? " a favor de " + acreedor : ""} sobre ${b.descripcion.slice(0, 50)}`, importe: princ, ganancial: b.titularidad === "ganancial", nota: "Importe según la nota simple (responsabilidad hipotecaria o principal inicial): pide al banco el saldo pendiente a la fecha del fallecimiento", conf: 1 });
    b.cargas = `Hipoteca${acreedor ? " · " + acreedor : ""}${princ ? " · " + eur0(princ) : ""}`;
  }
  const Tpos = zonaCar.replace(/\b(?:No constan?|No hay|No existen?|No figuran?|Sin|Libre de)\b[^.]*\./gi, " ");
  if (/embargo|anotaci[óo]n preventiva/i.test(Tpos)) out.avisos.push("Constan embargos o anotaciones preventivas: revisa las cargas antes de adjudicar.");
  if (/afecci[óo]n\s+fiscal/i.test(Tpos) && !/no\s+constan\s+afecciones/i.test(zonaCar)) out.avisos.push("Constan afecciones fiscales (plazo de comprobación de un impuesto anterior): no impiden la adjudicación pero conviene conocerlas.");
  out.bienes.push(b);
  return out;
}
// Lista de nombres de una frase («MERCEDES, GUSTAVO, RAQUEL y AMADOR TÉBAR POZAS» / «DON TEODORO AVILÉS SANTISTEBAN y DOÑA ASUNCIÓN AVILÉS SANTISTEBAN»): si los primeros
// son una sola palabra, se les añaden los apellidos del último
function lecListaNombres(frag) {
  const lista = String(frag || "").replace(new RegExp(LEC_TRAT, "g"), "").replace(/\s*\([^)]{0,60}\)/g, "").split(/\s*,\s*|\s+y\s+|\s+e\s+|\s*;\s*/i).map((s) => s.replace(/^\s*(?:y|e)\s+/i, "").trim()).filter(Boolean);
  const ultimo = lista[lista.length - 1] || "", pal = ultimo.split(/\s+/);
  // Auditoría r5 (H2): los apellidos son las dos últimas unidades (con sus partículas «de», «del», «de la»…), no todo lo que sigue a la primera
  // palabra: «IÑAKI y MARÍA JOSÉ LASTRA O'CONNOR» daba «Iñaki José Lastra O'Connor»; «MARÍA DEL CARMEN TEJADA ROBLEDO», apellidos «del Carmen Tejada Robledo».
  const U = []; for (let i = pal.length - 1; i >= 0;) { const u = [pal[i--]]; while (i > 0 && /^(?:de|del|la|las|los|y|i)$/i.test(pal[i])) u.unshift(pal[i--]); U.unshift(u.join(" ")); }
  const apellidos = U.length >= 3 ? U.slice(-2).join(" ") : U.length === 2 && lista.length > 1 && lista.slice(0, -1).every((s) => !/\s/.test(s)) ? U.slice(1).join(" ") : "";
  const out = []; for (const s of lista) { const nom = lecNombre(/\s/.test(s) || !apellidos ? s : `${s} ${apellidos}`); if (nom && !out.includes(nom)) out.push(nom); }
  return out;
}
// «tiene/tuvo/dejó cuatro hijos llamados …» → personas con relación hijo (conf 2 si la cuenta cuadra)
function lecListaHijos(T, quien = "El documento") {
  const out = { n: 0, personas: [], aviso: "" };
  const hj = /(?:tiene|tienen|tuvo|tuvieron|hay|son|con|dej[óo]|dejando|deja|nacieron|sobrevivi[ée]ndole|le\s+sobreviven|sobreviven|existen|quedaron)\s+(?:a\s+)?(?:sus?\s+)?([a-záéíóúñü]+|\d+)\s+(?:[úu]nic[oa]s?\s+)?(?:hij[oa]s?|descendientes)\s*(?:,\s*)?(?:llamad[oa]s?|de nombres?|que son|a saber|:)?\s*[:：]?\s*([^.;]{4,300}?)(?:[.;]|,?\s+(?:y\s+)?(?:que|los cuales|las cuales|todos|todas|ambos|ambas|siendo|habiendo|mayores|menores|nacid))/i.exec(T);
  if (!hj) return out;
  out.n = /^\d+$/.test(hj[1]) ? Number(hj[1]) : LEC_UNI[lecN(hj[1]).toLowerCase()] || 0;
  const noms = lecListaNombres(hj[2]);
  out.personas = noms.map((nombre) => ({ nombre, relacion: "hijo", conf: out.n && noms.length === out.n ? 2 : 1 }));
  if (out.n && noms.length !== out.n) out.aviso = `${quien} habla de ${out.n} hijos y se han leído ${noms.length} nombres: revisa la lista.`;
  return out;
}
function lecTestamento(t) {
  const out = { campos: [], personas: [], bienes: [], avisos: [] }; const T = t.replace(/\s+/g, " ");
  // Testador: tras COMPARECE / OTORGA / «el testador» o el primer DON/DOÑA
  const tes = new RegExp(`(?:${lecCI("comparece")}[nN]?\\s*[:：]?|${lecCI("otorgante")}\\s*[:：]?|${lecCI("testador")}[aA]?\\s*[,:]?)\\s*${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T) || new RegExp(`${LEC_TRAT}\\s+${LEC_NOMBRE_RE}`).exec(T);
  if (tes) out.campos.push({ k: "nombre", etiqueta: "Testador (causante)", valor: lecNombre(tes[1]), conf: tes[0].match(/COMPARECE|OTORGANTE|testador/i) ? 2 : 1 });
  // Cónyuge y régimen
  const cony = new RegExp(`${lecCI("casad")}[oaOA]\\s+(?:${lecCI("en")}\\s+(?:[úuÚU]${lecCI("nicas")}|${lecCI("segundas")}|${lecCI("primeras")})\\s+${lecCI("nupcias")}\\s+)?(?:(?:[yY]\\s+)?(?:${lecCI("en")}|${lecCI("bajo")})\\s+(?:${lecCI("el")}\\s+)?[rR][ée]${lecCI("gimen")}\\s+(?:${lecCI("econ")}[óo]${lecCI("mico")}[- ]${lecCI("matrimonial")}\\s+)?(?:${lecCI("legal")}\\s+)?${lecCI("de")}\\s+([a-záéíóúñüA-ZÁÉÍÓÚÑÜ ]{5,40}?)\\s+)?${lecCI("con")}\\s+${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T);
  const reg = /r[ée]gimen\s+(?:econ[óo]mico[- ]matrimonial\s+)?(?:legal\s+)?de\s+(gananciales|separaci[óo]n de bienes|participaci[óo]n)/i.exec(T);
  if (cony) { out.personas.push({ nombre: lecNombre(cony[2]), relacion: "conyuge", conf: 2 }); const r = reg ? reg[1] : cony[1] || ""; out.campos.push({ k: "civil", etiqueta: "Estado civil", valor: /separaci/i.test(r) ? "separacion" : "gananciales", mostrar: `casado/a${r ? " en régimen de " + r.toLowerCase() : " (régimen no indicado: se propone gananciales)"}`, conf: r ? 2 : 1 }); }
  else if (/viud[oa]/i.test(T)) out.campos.push({ k: "civil", etiqueta: "Estado civil", valor: "viudo", mostrar: "viudo/a", conf: 1 });
  else if (/solter[oa]/i.test(T)) out.campos.push({ k: "civil", etiqueta: "Estado civil", valor: "soltero", mostrar: "soltero/a", conf: 1 });
  // Hijos: «tiene cuatro hijos llamados MERCEDES, GUSTAVO, RAQUEL y AMADOR TÉBAR POZAS» / «hijos llamados DON X, DOÑA Y y DON Z»
  const hj = lecListaHijos(T, "El testamento");
  for (const q of hj.personas) if (!out.personas.some((p) => p.nombre === q.nombre)) out.personas.push(q);
  if (hj.aviso) out.avisos.push(hj.aviso);
  // Premuertos: «hijo premuerto X ... dejó descendencia» / «fallecido con anterioridad»
  if (/premuert|fallecid[oa]\s+con\s+anterioridad|falleci[óo]\s+antes/i.test(T)) out.avisos.push("El testamento menciona un hijo fallecido con anterioridad: añade a sus descendientes como nietos indicando de quién descienden.");
  // Tipo de reparto
  const usuf = /usufructo\s+(?:universal|vitalicio\s+y\s+universal|universal\s+y\s+vitalicio)|usufructo\s+(?:vitalicio\s+)?de\s+(?:toda\s+)?(?:su|la)\s+herencia/i.test(T);
  const iguales = /por\s+partes\s+iguales|a\s+partes\s+iguales|en\s+partes\s+iguales/i.test(T);
  const socini = /cautela\s+socini|socini|opci[óo]n\s+compensatoria|legitima\s+estricta/i.test(T);
  const sustVulgar = /sustitu(?:idos?|ci[óo]n)\s+vulgar/i.test(T);
  if (usuf && cony) out.campos.push({ k: "testamento", etiqueta: "Reparto del testamento", valor: "usufructo", mostrar: `Usufructo universal al cónyuge y nuda propiedad a los descendientes${iguales ? " por partes iguales" : ""}${socini ? " · cautela socini" : ""}${sustVulgar ? " · sustitución vulgar por descendientes" : ""}`, conf: 2 });
  else if (iguales) {
    // Auditoría r5 (H1): nombres de los instituidos herederos, para repartir los porcentajes solo entre ellos y no también entre los legatarios
    const inst = /[Ii]nstituy[eo]n?\b[^.;]{0,80}?\bherederos?\b[^.;]{0,80}?\ba\s+(?:sus?\s+)?(?:[a-záéíóúñü]+\s+)?(?:hij[oa]s?|sobrin[oa]s?|herman[oa]s?|niet[oa]s?)?\s*,?\s*((?:DON|DOÑA|D\.ª|[A-ZÁÉÍÓÚÑÜ])[^.;]{2,220}?)(?=,?\s+(?:sustitu|por\s+partes|a\s+partes|en\s+partes|con\s+derecho|y\s+para|en\s+pleno)|[.;])/.exec(T);
    const herederos = inst ? lecListaNombres(inst[1]).filter(Boolean) : [];
    out.campos.push({ k: "testamento", etiqueta: "Reparto del testamento", valor: "porcentajes", herederos, mostrar: `Herederos por partes iguales${herederos.length ? ": " + herederos.join(", ") : ""}${sustVulgar ? " · sustitución vulgar" : ""}. Se cargan porcentajes iguales; ajústalos si el testamento distingue`, conf: 1 });
  }
  else out.campos.push({ k: "testamento", etiqueta: "Reparto del testamento", valor: "porcentajes", mostrar: "Hay testamento con institución de herederos; no se ha reconocido el reparto: introduce los porcentajes", conf: 0 });
  // Legados: «Lega a su sobrino DON JACINTO TÉBAR VILLALOBOS la plaza de garaje…»
  for (const m of T.matchAll(new RegExp(`\\b[Ll][Ee][Gg][Aa]\\s+[aA]\\s+(?:[sS][uU]\\s+)?([sS]obrin[oa]|[hH]erman[oa]|[nN]iet[oa]|[hH]ij[oa]|[aA]hijad[oa]|[aA]mig[oa]|[eE]sposa|[eE]sposo|[cC][óo]nyuge|[cC]u[ñn]ad[oa]|[tT][íi][oa])?\\s*,?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s*(?:mayor de edad[^,]*,\\s*)?(?:el|la|los|las|un|una|su)\\s+((?:[^.;]|\\.(?=\\d)){5,120}?)(?:\\.(?!\\d)|;|\\s+(?:que|sit[oa]|ubicad|con cargo))`, "g"))) { // r5: «20.000 €» no corta el legado
    const rel = lecN(m[1] || ""), nombre = lecNombre(m[2]); if (!nombre) continue;
    const relacion = /SOBRIN/.test(rel) ? "sobrino" : /HERMAN/.test(rel) ? "hermano" : /NIET/.test(rel) ? "nieto" : /HIJ/.test(rel) ? "hijo" : /ESPOS|CONYUG/.test(rel) ? "conyuge" : /TI[OA]/.test(rel) ? "tio" : "extrano";
    if (!/usufructo/i.test(m[3]) && !out.personas.some((p) => p.nombre === nombre)) { const ld = m[3].trim().replace(/[\s,;:]+$/, ""); out.personas.push({ nombre, relacion, legatario: true, legadoDesc: ld, conf: 1 }); out.avisos.push(`Legado a ${nombre}: «${ld.slice(0, 80)}». Marca el bien correspondiente como legado en su ficha.`); }
  }
  const fechaT = lecFechas(T.slice(0, 600)); if (fechaT.length) out.campos.push({ k: "testamentoFecha", etiqueta: "Fecha del testamento", valor: fechaT[0].f, mostrar: fechaLarga(fechaT[0].f), conf: 1 });
  const nota = new RegExp(`[Aa]nte\\s+m[íi]\\s*,?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s*[Nn]otari[oa]`).exec(T); if (nota) out.campos.push({ k: "testamentoNotario", etiqueta: "Notario", valor: lecNombre(nota[1]), conf: 2 });
  if (/desheredad|desheredaci[óo]n/i.test(T)) out.avisos.push("El testamento contiene una desheredación: revisa su causa y alcance.");
  if (/fideicomis/i.test(T)) out.avisos.push("Hay una sustitución fideicomisaria: el reparto automático no la modela.");
  return out;
}
// Acta notarial de declaración de herederos abintestato: causante, fecha, estado civil, herederos declarados con parentesco y cuotas
const LEC_REL_PAL = { hij: "hijo", descend: "hijo", niet: "nieto", padre: "padre", madre: "padre", progenit: "padre", ascend: "padre", herman: "hermano", sobrin: "sobrino", conyug: "conyuge", espos: "conyuge", viud: "conyuge", pareja: "pareja_hecho", tio: "tio", tia: "tio" };
const lecRelPalabra = (w) => { const k = lecN(w).toLowerCase(); for (const [pref, rel] of Object.entries(LEC_REL_PAL)) if (k.startsWith(pref)) return rel; return ""; };
function lecHerederos(t) {
  const out = { campos: [], personas: [], avisos: [] }; const T = t.replace(/\s+/g, " ");
  // Causante: «herederos abintestato de DON X», «causante DON X», «su madre, DOÑA X, falleció»
  const c1 = new RegExp(`(?:${lecCI("abintestato")}|${lecCI("ab")} ${lecCI("intestato")}|${lecCI("intestad")}[oa]|${lecCI("herederos")}|${lecCI("herencia")})\\s+${lecCI("de")}\\s+(?:${lecCI("su")}\\s+[a-záéíóúñü]+\\s*,?\\s*)?${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T)
    || new RegExp(`${lecCI("causante")}\\s*,?\\s*${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T)
    || new RegExp(`${lecCI("su")}\\s+(?:${lecCI("madre")}|${lecCI("padre")}|${lecCI("espos")}[oa]|${lecCI("herman")}[oa]|${lecCI("t")}[íi][oa]|${lecCI("abuel")}[oa]|${lecCI("hij")}[oa])\\s*,?\\s*${LEC_TRAT}\\s*${LEC_NOMBRE_RE}\\s*,?\\s*[^.]{0,80}?${lecCI("falleci")}`).exec(T);
  const nombre = c1 ? lecNombre(c1[1]) : "";
  if (nombre) out.campos.push({ k: "nombre", etiqueta: "Causante (según el acta)", valor: nombre, conf: 2 });
  const f = lecFechaCerca(T, /falleci[óo]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?|fallecid[oa]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?el\s+(?:d[ií]a\s+)?|fecha\s+(?:de\s+)?(?:la\s+)?(?:defunci[óo]n|fallecimiento)/i, 120);
  if (f) out.campos.push({ k: "fecha", etiqueta: "Fecha del fallecimiento", valor: f, mostrar: fechaLarga(f), conf: 2 });
  const ec = /en\s+estado\s+(?:civil\s+)?de\s+(casad[oa]|viud[oa]|solter[oa]|divorciad[oa]|separad[oa])/i.exec(T) || /\b(casad[oa]|viud[oa]|solter[oa]|divorciad[oa])\b/i.exec(T);
  if (ec) { const v = lecN(ec[1]); const civil = /CASAD/.test(v) ? "gananciales" : /VIUD/.test(v) ? "viudo" : /DIVORC|SEPARAD/.test(v) ? "divorciado" : "soltero"; out.campos.push({ k: "civil", etiqueta: "Estado civil", valor: civil, mostrar: ec[1].toLowerCase() + (civil === "gananciales" ? " (se propone gananciales; cambia a separación de bienes si procede)" : ""), conf: 1 }); }
  // Cónyuge viudo: «casado con DOÑA X», «su cónyuge viuda DOÑA X», «cuota legal usufructuaria … a DOÑA X»
  const cy = new RegExp(`(?:${lecCI("casad")}[oa]\\s+(?:${lecCI("en")}\\s+[a-záéíóúñü]+\\s+${lecCI("nupcias")}\\s+)?${lecCI("con")}|(?:${lecCI("su")}\\s+)?(?:${lecCI("c")}[óo]${lecCI("nyuge")}|${lecCI("espos")}[oa])\\s+(?:${lecCI("viud")}[oa]\\s*|${lecCI("sup")}[ée]${lecCI("rstite")}\\s*)?,?)\\s*${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T);
  if (cy && !/viud[oa]\s+de\s*$/i.test(T.slice(Math.max(0, cy.index - 12), cy.index))) { const n = lecNombre(cy[1]); if (n && n !== nombre) out.personas.push({ nombre: n, relacion: "conyuge", conf: 2 }); }
  // Herederos declarados: «DECLARO herederos abintestato de X a sus hijos DON A y DOÑA B, por partes iguales, y a sus nietos C y D, en representación de su padre premuerto DON J …»
  const dec = /declar[ao](?:\w*)\s+(?:como\s+)?(?:[úu]nicos?\s+)?(?:y\s+)?(?:universales?\s+)?hereder[oa]s?\s+(?:abintestato\s+|ab\s+intestato\s+|legales?\s+|universales?\s+|intestad[oa]s?\s+)*(?:(?:de|del)\s+[^,]{0,120}?,?\s+)?(a\s+[^.]{10,700}?)(?:\.|$)/i.exec(T);
  if (dec) {
    const segs = dec[1].split(/\s*,?\s+y\s+a\s+(?=sus?\s)/i);
    for (const seg of segs) {
      const m = /^(?:,?\s*)?(?:a\s+)?(?:sus?\s+)?(?:(\w+)\s+)?(hij[oa]s?|descendientes|padres?|madre|progenitores?|herman[oa]s?|sobrin[oa]s?|niet[oa]s?|c[óo]nyuge|espos[oa]|viud[oa]|pareja de hecho|t[íi][oa]s?)\s*,?\s*(?:llamad[oa]s?\s*)?[:：]?\s*(.+?)\s*(?:,\s*)?(?:$|\bpor\b|\ben\s+(?:la\s+)?(?:proporci|representaci|concepto|cuant)|\bsin\s+perjuicio|\bcon\s+derecho|\ba\s+partes|\bque\s+)/i.exec(seg.trim());
      if (!m) continue;
      const rel = lecRelPalabra(m[2]); const noms = lecListaNombres(m[3]);
      if (!noms.length) continue;
      const frac = lecFraccion(seg); const iguales = /partes\s+iguales|por\s+mitad|por\s+cabezas/i.test(seg);
      const pct = frac && !(/iguales/i.test(seg) && frac * noms.length > 100.5) ? frac : null; // «por terceras partes iguales» entre 3 cuadra; si no cuadra, se deja sin cuota
      const est = /representaci[óo]n\s+de\s+su\s+(?:padre|madre|progenitor[a]?|herman[oa])\s*(?:premuert[oa]|fallecid[oa])?\s*,?\s*(?:D(?:ON|OÑA|\.ª|ª|\.)?\s*)?([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{4,60}?)(?=\s*[,.;]|\s+(?:por|que|fallecid|premuert)|$)/i.exec(seg);
      for (const nombreH of noms) { if (nombreH === nombre || out.personas.some((p) => p.nombre === nombreH)) continue; out.personas.push({ nombre: nombreH, relacion: rel || "", conf: rel ? 2 : 1, ...(pct ? { pct } : {}), ...(est && (rel === "nieto" || rel === "sobrino") ? { estirpe: lecNombre(est[1]) } : {}) }); }
      const n = m[1] && !/^(?:[úu]nic|legal|universal)/i.test(m[1]) ? (/^\d+$/.test(m[1]) ? Number(m[1]) : LEC_UNI[lecN(m[1]).toLowerCase()] || 0) : 0;
      if (n && noms.length !== n) out.avisos.push(`El acta declara ${n} ${m[2].toLowerCase()} y se han leído ${noms.length} nombres: revisa la lista.`);
      if (!iguales && !pct && noms.length > 1 && rel) out.avisos.push(`Herederos ${m[2].toLowerCase()}: la cuota de cada uno no se ha leído; la app aplica el reparto legal.`);
    }
  }
  // Si el acta no trae la fórmula de declaración, al menos la lista de hijos del expositivo
  if (!out.personas.some((p) => p.relacion === "hijo")) { const hj = lecListaHijos(T, "El acta"); for (const q of hj.personas) if (q.nombre !== nombre && !out.personas.some((p) => p.nombre === q.nombre)) out.personas.push(q); if (hj.aviso) out.avisos.push(hj.aviso); }
  if (/premuert|fallecid[oa]\s+con\s+anterioridad|falleci[óo]\s+antes|este\s+[úu]ltimo\s+fallecid/i.test(T)) out.avisos.push("Hay un hijo o hermano fallecido antes que el causante: sus descendientes heredan por estirpes; comprueba que lleven anotado de quién descienden y que el premuerto no figure como heredero.");
  if (/cuota\s+(?:legal\s+)?usufructuaria|usufructo\s+(?:legal\s+)?(?:del?\s+)?(?:c[óo]nyuge|viud)/i.test(T)) out.avisos.push("El cónyuge viudo conserva su cuota legal usufructuaria (tercio de mejora con hijos, mitad con ascendientes): la app la calcula sola en la sucesión intestada.");
  // Datos del acta
  const F = lecFechas(T.slice(0, 600)); const fechaActa = F.length ? F[0].f : "";
  const nota = new RegExp(`[Aa]nte\\s+m[íi]\\s*,?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s*[Nn]otari[oa]`).exec(T);
  const prot = /n[úu]mero\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{3,60}?)\.\s*(?:ACTA|DECLARACI)/i.exec(T) || /protocolo\s*(?:n[úu]mero|n[.º°]?)?\s*[:：]?\s*(\d{1,6})/i.exec(T);
  const protocolo = prot ? (/^\d+$/.test(prot[1]) ? prot[1] : String(lecPalabrasNumero(prot[1]) || "")) : "";
  out.campos.push({ k: "testamento", etiqueta: "Título sucesorio", valor: "no", mostrar: `Sin testamento: declaración de herederos abintestato${fechaActa ? " de " + fechaLarga(fechaActa) : ""}${nota ? " ante " + lecNombre(nota[1]) : ""}${protocolo ? ", número " + protocolo : ""}`, conf: 2 });
  out.campos.push({ k: "actaHerederos", etiqueta: "Acta de declaración de herederos", valor: { notario: nota ? lecNombre(nota[1]) : "", fecha: fechaActa, protocolo }, mostrar: [fechaActa ? fechaLarga(fechaActa) : "", nota ? "ante " + lecNombre(nota[1]) : "", protocolo ? "número " + protocolo : ""].filter(Boolean).join(", ") || "sin datos de notaría", conf: nota || fechaActa ? 2 : 0 });
  return out;
}
// Libro de familia (escaneado) y certificados del Registro Civil de matrimonio o nacimiento: cónyuges, hijos con fecha de nacimiento, régimen económico
function lecFamilia(t) {
  const out = { campos: [], personas: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " ");
  const T1 = T.replace(/\s+/g, " ");
  const edad = (f) => (f ? Math.max(0, Math.floor((Date.now() - new Date(f + "T12:00:00")) / 31557600000)) : null);
  const nacCerca = (z) => lecFechaCerca(z, /nacid[oa]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?|fecha\s+de\s+nacimiento\s*[:：]?|naci[óo]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?/i, 90);
  const esNac = /certifica(?:do|ci[óo]n)\b[^\n]{0,30}(?:de\s+(?:inscripci[óo]n\s+de\s+)?)?nacimiento|inscripci[óo]n\s+de\s+nacimiento|acta\s+de\s+nacimiento/i.test(T1) && !/libro\s+de\s+familia/i.test(T1);
  const esMat = /libro\s+de\s+familia|matrimonio/i.test(T1);
  // 1) Formato electrónico: «Nombre: X Primer apellido: Y Segundo apellido: Z», con la etiqueta de rol delante (Cónyuge 1, Padre, Inscrito…)
  const trip = [...T1.matchAll(/Nombre\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{1,40}?)\s+(?:Primer|1\.?er)\s+apellido\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{1,30}?)\s+(?:Segundo|2\.?º)\s+apellido\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-Za-záéíóúñüÁÉÍÓÚÑÜ' \-]{1,30}?)(?=\s+(?:DNI|NIF|N\.I\.F|Sexo|Nacionalidad|Fecha|Documento|Lugar|Nombre|Datos|C[óo]nyuge|Padre|Madre|Progenitor|Hij|$))/gi)];
  const rolDe = (i) => { const antes = lecN(T1.slice(Math.max(0, i - 80), i)); const m = /(CONYUGE ?[12AB]?|CONTRAYENTE ?[12AB]?|MARIDO|ESPOSO|MUJER|ESPOSA|PADRE|MADRE|PROGENITORA?\s?[12AB]?|INSCRIT[OA]|NACID[OA]|HIJ[OA])(?![A-Z])[^A-Z]{0,30}$/.exec(antes); return m ? m[1].replace(/\s/g, "") : ""; };
  const vistos = new Set(); const add = (p) => { if (!p.nombre || vistos.has(p.nombre)) return; vistos.add(p.nombre); out.personas.push(p); };
  if (trip.length) {
    for (const m of trip) {
      const nombre = lecNombre(`${m[1]} ${m[2]} ${m[3]}`); const rol = rolDe(m.index); const zona = T1.slice(m.index, m.index + 260);
      const nac = nacCerca(zona);
      if (/^(CONYUGE|CONTRAYENTE|MARIDO|ESPOS|MUJER)/.test(rol) || (esMat && !esNac && !/^(PADRE|MADRE|PROGENITOR|HIJ)/.test(rol))) add({ nombre, relacion: "conyuge", pareja: true, nacimiento: nac, edad: edad(nac), conf: 1 });
      else if (/^(PADRE|MADRE|PROGENITOR)/.test(rol)) add({ nombre, relacion: "padre", progenitor: true, nacimiento: nac, edad: edad(nac), conf: 1 });
      else add({ nombre, relacion: esNac ? "" : "hijo", inscrito: esNac, nacimiento: nac, edad: edad(nac), conf: 1 });
    }
  } else {
    // 2) Libro de familia o certificado literal: «MARIDO/ESPOSO: DON X … nacido el …», «MUJER/ESPOSA: …», «HIJOS: 1. X nacido/a en … el …»
    for (const m of T1.matchAll(new RegExp(`(${lecCI("marido")}|${lecCI("esposo")}|${lecCI("mujer")}|${lecCI("esposa")}|${lecCI("padre")}|${lecCI("madre")}|${lecCI("contrayente")}\\s?[12AB]?|${lecCI("c")}[óo]${lecCI("nyuge")}\\s?[12AB]?|${lecCI("hij")}[oa]|${lecCI("inscrit")}[oa])\\s*[:：.]?\\s*(?:\\d{1,2}[.º)]\\s*)?${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`, "g"))) {
      const rol = lecN(m[1]).replace(/\s/g, ""); const nombre = lecNombre(m[2]); if (!nombre) continue;
      const zona = T1.slice(m.index, m.index + 260); const nac = nacCerca(zona);
      if (/^(MARIDO|ESPOS|MUJER|CONTRAYENTE|CONYUGE)/.test(rol)) add({ nombre, relacion: "conyuge", pareja: true, nacimiento: nac, edad: edad(nac), conf: 1 });
      else if (/^(PADRE|MADRE)/.test(rol)) add({ nombre, relacion: "padre", progenitor: true, nacimiento: nac, edad: edad(nac), conf: 1 });
      else add({ nombre, relacion: esNac ? "" : "hijo", inscrito: esNac, nacimiento: nac, edad: edad(nac), conf: 1 });
    }
    // Lista numerada de hijos sin etiqueta por hijo: «HIJOS: 1.- MERCEDES TÉBAR POZAS, nacida en Málaga el 2 de mayo de 1976. 2.- GUSTAVO …»
    const bloque = /\bHIJ[OA]S?\s*[:：]?\s*\n?\s*((?:\d{1,2}\s*[.º)\-]+|[A-ZÁÉÍÓÚÑÜ])[\s\S]{10,900}?)(?=\n\s*\n\s*(?![\d])|$|(?:R[ÉE]GIMEN|R[ée]gimen|NOTAS?\s+MARGINAL|DILIGENCIA|OBSERVACIONES|El\s+Encargad|EL\s+ENCARGAD|La\s+Encargad|Sello|SELLO|Firma|FIRMA))/.exec(T);
    if (bloque) for (const q of bloque[1].matchAll(new RegExp(`(?:^|\\n|\\d{1,2}\\s*[.º)\\-]+\\s*)${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`, "g"))) { const nombre = lecNombre(q[1]); if (!nombre) continue; const nac = nacCerca(bloque[1].slice(q.index, q.index + 200)); add({ nombre, relacion: "hijo", nacimiento: nac, edad: edad(nac), conf: 1 }); }
  }
  const fm0 = lecFechaCerca(T1, /(?:fecha\s+(?:de\s+)?(?:la\s+)?(?:celebraci[óo]n\s+)?(?:del\s+)?matrimonio|matrimonio\s+(?:civil\s+|can[óo]nico\s+)?(?:celebrado|contra[íi]do)\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?|contrajeron\s+matrimonio\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?|(?:^|[.\n]\s*)(?:celebrad[oa]|contra[íi]d[oa])\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?el\s+(?:d[ií]a\s+)?)/i, 100);
  // Hijo/a inscrito/a con su filiación en texto corrido (certificación literal): «hijo de Don SEVERIANO AVILÉS HUERTAS y de Doña MARÍA VICTORIA SANTISTEBAN PANIAGUA»
  if (esNac && !out.personas.some((p) => p.progenitor)) {
    const fil = new RegExp(`${lecCI("hij")}[oa]\\s+${lecCI("de")}\\s+${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s+[yY]\\s+${lecCI("de")}\\s+${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
    if (fil) for (const n of [fil[1], fil[2]]) { const nombre = lecNombre(n); if (nombre && nombre.split(" ").length >= 3) add({ nombre, relacion: "padre", progenitor: true, conf: 1 }); }
    if (!out.personas.some((p) => p.inscrito)) { const ins = new RegExp(`(?:${lecCI("nacimiento")}\\s+${lecCI("de")}|${lecCI("inscrit")}[oa]\\s*[:：]?|${lecCI("nombre")}\\s+${lecCI("del")}\\s+${lecCI("inscrit")}[oa]\\s*[:：]?)\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1); if (ins) { const nombre = lecNombre(ins[1]); const nac = nacCerca(T1.slice(ins.index, ins.index + 300)) || lecFechaCerca(T1, /naci[óo]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?/i, 90); if (nombre && !out.personas.some((p) => p.nombre === nombre)) out.personas.unshift({ nombre, relacion: "", inscrito: true, nacimiento: nac, edad: edad(nac), conf: 1 }); } }
  }
  // Régimen económico matrimonial y fecha del matrimonio. Lo pactado en capitulaciones (nota marginal o escritura) manda sobre el régimen inicial
  const cap = /capitulaciones(?:\s+matrimoniales)?[^.]{0,220}?(separaci[óo]n\s+(?:absoluta\s+)?de\s+bienes|gananciales|participaci[óo]n)|(?:han\s+|hab[ií]an\s+)?pactad[oa]s?\s+(?:el\s+)?r[ée]gimen\s+(?:econ[óo]mico\s+)?(?:matrimonial\s+)?de\s+(separaci[óo]n\s+(?:absoluta\s+)?de\s+bienes|gananciales|participaci[óo]n)/i.exec(T1);
  const REGS = [...T1.matchAll(/r[ée]gimen\s+(?:econ[óo]mico[- ]?(?:matrimonial|del\s+matrimonio)?\s*)?(?:[:：]\s*)?(?:el\s+)?(?:legal\s+)?(?:de\s+)?(?:la\s+)?(?:sociedad\s+de\s+)?(gananciales|separaci[óo]n\s+(?:absoluta\s+)?de\s+bienes|participaci[óo]n|comunidad\s+de\s+bienes|conquistas|consorcial)/gi)];
  const reg = cap ? [cap[0], cap[1] || cap[2]] : REGS.length ? REGS[REGS.length - 1] : null;
  if (reg) {
    const sep = /separaci|participaci/i.test(reg[1]); const fCap = cap ? lecFechas(T1.slice(Math.max(0, cap.index - 200), cap.index + 300)).map((q) => q.f).find((f) => !fm0 || f !== fm0) : null;
    out.campos.push({ k: "civil", etiqueta: cap ? "Régimen económico (capitulaciones)" : "Régimen económico matrimonial", valor: sep ? "separacion" : "gananciales", manda: !!cap, mostrar: `casado/a en régimen de ${reg[1].toLowerCase()}${cap ? ` pactado en capitulaciones${fCap ? " de " + fechaLarga(fCap) : ""} (manda sobre el «casado» de otros documentos)` : ""}${/consorcial|conquistas|comunidad/i.test(reg[1]) ? " (foral: se propone gananciales como equivalente)" : ""}`, conf: 2 });
    if (/participaci/i.test(reg[1])) out.avisos.push("Régimen de participación: durante el matrimonio los bienes son privativos (se carga como separación de bienes), pero al morir nace un crédito de participación en las ganancias (arts. 1411 y ss. CC) que hay que calcular aparte.");
    if (cap && REGS.some((q) => /gananciales/i.test(q[1])) && sep) out.avisos.push("El matrimonio empezó en gananciales y después pactó separación de bienes: los bienes comprados antes de las capitulaciones pudieron quedar gananciales si no se liquidó la sociedad. Revisa la titularidad de cada inmueble en la nota simple.");
  }
  else if (esMat && out.personas.filter((p) => p.pareja).length === 2) out.campos.push({ k: "civil", etiqueta: "Estado civil", valor: "gananciales", mostrar: "casado/a según el Registro Civil (régimen no indicado: se propone gananciales; cambia a separación si hay capitulaciones)", conf: 1 });
  const fm = fm0;
  if (fm) out.campos.push({ k: "matrimonioFecha", etiqueta: "Fecha del matrimonio", valor: fm, mostrar: fechaLarga(fm), conf: 2 });
  if (/separaci[óo]n\s+(?:judicial|legal)|divorcio|disoluci[óo]n\s+del\s+matrimonio|nulidad/i.test(T1)) out.avisos.push("Consta una nota de separación, divorcio o disolución del matrimonio: el ex cónyuge no hereda ni tiene usufructo legal.");
  if (/fallecid[oa]|defunci[óo]n/i.test(T1) && esMat) out.avisos.push("El libro o certificado lleva anotada una defunción: comprueba si es la del causante o la de su cónyuge (si el cónyuge premurió, no hay viudo/a).");
  if (!out.personas.length) out.avisos.push("No se han podido leer las personas del libro de familia: prueba con una foto más nítida de cada página.");
  else if (out.personas.some((p) => p.pareja) && !out.personas.some((p) => p.relacion === "hijo") && /libro\s+de\s+familia/i.test(T1)) out.avisos.push("Solo se han leído los cónyuges: si hay hijos, sube las páginas del libro en que figuran.");
  return out;
}
// Certificado o volante de empadronamiento: último domicilio y municipio del causante (residencia habitual → comunidad autónoma del impuesto), convivientes
function lecPadron(t) {
  const out = { campos: [], personas: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const ayto = /AYUNTAMIENTO\s+DE\s+(?:LA\s+|EL\s+|LOS\s+|LAS\s+)?([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40}?)(?=\s*(?:[·\-–|,.(\n]|\s{2}|\s+(?:ÁREA|AREA|CONCEJAL|DELEGACI|PADR|SERVICIO|DEPARTAMENTO|NEGOCIADO|OFICINA|CIF|N\.?I\.?F|VOLANTE|CERTIFICA|Área|Padrón)))/.exec(T) || /padr[óo]n\s+municipal\s+(?:de\s+habitantes\s+)?(?:de|del\s+municipio\s+de)\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40}?)(?=\s*[,.;(\n]|\s+(?:con|figura|consta|desde|en)\b)/i.exec(T);
  const cp = /\b(\d{5})\s+(?:de\s+)?([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40}?)(?:\s*\(([A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{3,30})\))?(?=\s*[,.;\n]|\s+(?:figur|const|desde|con|y|e|$))/.exec(T);
  const muni = ayto ? lecTitulo(ayto[1]) : cp ? lecTitulo(cp[2]) : "";
  const prov = cp && cp[3] ? lecTitulo(cp[3]) : "";
  const dom = /domicilio\s*(?:habitual\s*|actual\s*)?(?:en|[:：]|sito\s+en)\s*(?:la\s+|el\s+)?([A-ZÁÉÍÓÚÑÜa-záéíóúñü][^\n,;]{6,110}?(?:,\s*\d{5}\s+[A-ZÁÉÍÓÚÑÜa-záéíóúñü'\- ]{2,40})?)(?=\s*(?:[,;.\n]|\s+(?:figur|const|desde|con|inscrit|empadronad|del\s+municipio|de\s+este|en\s+el\s+que|donde)\b))/i.exec(T) || /(?:direcci[óo]n|vivienda)\s*[:：]\s*([^\n]{6,110})/i.exec(T);
  if (dom) { let d = lecDireccion(dom[1]); if (muni && !lecN(d).includes(lecN(muni))) d += `, ${muni}`; out.campos.push({ k: "domicilio", etiqueta: "Último domicilio (padrón)", valor: d, conf: 2 }); }
  if (muni) out.campos.push({ k: "residencia", etiqueta: "Municipio de residencia habitual", valor: prov ? `${muni} (${prov})` : muni, mostrar: `${muni}${prov ? " (" + prov + ")" : ""}: fija la comunidad autónoma del Impuesto de Sucesiones si llevaba allí más días de los últimos cinco años`, conf: 2 });
  // Personas: «D. NOMBRE, con DNI X, figura inscrito…» y filas de la hoja colectiva «NOMBRE APELLIDOS 12345678A 12/03/1948 01/05/1996»
  const tit = new RegExp(`(?:${lecCI("que")}|${lecCI("certifica")}[^.]{0,30}?)\\s+${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const filas = [...T.matchAll(new RegExp(`(?:^|\\n)\\s*(?:\\d{1,2}\\s+)?${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s*(?:(?:con\\s+)?(?:DNI|NIF|NIE|D\\.N\\.I\\.|N\\.I\\.F\\.|documento)?\\s*[:：]?\\s*(\\d{8}\\s?-?\\s?[A-Z]|[XYZ]\\s?-?\\s?\\d{7}\\s?-?\\s?[A-Z]))?\\s*,?\\s*(\\d{2}[\\/.\\-]\\d{2}[\\/.\\-]\\d{4})?\\s*(\\d{2}[\\/.\\-]\\d{2}[\\/.\\-]\\d{4})?`, "g"))];
  const add = (nombre, nif, nac, i) => { if (!nombre || out.personas.some((q) => q.nombre === nombre)) return; const edad = nac ? Math.floor((Date.now() - new Date(nac + "T12:00:00")) / 31557600000) : null; out.personas.push({ nombre, nif: nif || "", nacimiento: nac || "", edad, relacion: "", conviviente: true, titular: i === 0, conf: 1 }); };
  if (tit) { const nombre = lecNombre(tit[1]); const nifs = lecNifs(T1.slice(tit.index, tit.index + 200)); add(nombre, nifs[0] || "", lecFechaCerca(T1.slice(tit.index), /nacid[oa]\s+(?:en\s+[^,]{0,40},?\s*)?el|fecha\s+de\s+nacimiento/i, 60), 0); }
  for (const m of filas) { const nombre = lecNombre(m[1]); if (!nombre || /^(Padron|Volante|Certificado|Ayuntamiento|Nombre|Documento|Fecha)/i.test(nombre)) continue; const nac = m[3] ? (lecFechas(m[3])[0] || {}).f : ""; const nif = m[2] ? m[2].replace(/[\s-]/g, "").toUpperCase() : ""; if (!m[2] && !m[3]) continue; add(nombre, lecNifOk(nif) ? nif : "", nac || "", out.personas.length); }
  const filaAlta = filas.find((m) => m[4] && lecNombre(m[1])); const alta = filaAlta ? (lecFechas(filaAlta[4])[0] || {}).f : lecFechaCerca(T1, /fecha\s+de\s+alta\s*[:：]|alta\s+en\s+el\s+padr[óo]n\s*[:：]?|empadronad[oa]\s+desde|inscrit[oa]\s+desde|desde\s+el\s+(?:d[ií]a\s+)?/i, 40);
  if (alta) out.campos.push({ k: "padronAlta", etiqueta: "Alta en el padrón", valor: alta, mostrar: fechaLarga(alta), conf: 1 });
  const baja = lecFechaCerca(T1, /baja\s+por\s+defunci[óo]n|causó\s+baja|fecha\s+de\s+baja/i, 60);
  if (baja) out.campos.push({ k: "fecha", etiqueta: "Fecha del fallecimiento (baja en el padrón)", valor: baja, mostrar: fechaLarga(baja), conf: 1 });
  if (!muni && !dom) out.avisos.push("No se ha podido leer el municipio ni el domicilio del padrón: anótalos a mano.");
  if (alta) { const y = Number(alta.slice(0, 4)); if (y >= new Date().getFullYear() - 5) out.avisos.push(`Alta en el padrón en ${y}: lleva menos de cinco años en el municipio. La comunidad autónoma del impuesto es aquella donde más días residió en los cinco años anteriores al fallecimiento (art. 28 Ley 22/2009).`); }
  if (out.personas.length > 1) out.avisos.push("Convivientes en el mismo domicilio: pueden ser el cónyuge o los hijos (relevante para la reducción por vivienda habitual, que exige convivencia de los dos años anteriores en el caso de colaterales).");
  return out;
}
// Póliza o certificado individual de seguro de vida (aseguradora): entidad, póliza, capital por fallecimiento, beneficiarios
const LEC_ASEG = /(MAPFRE(?: VIDA)?|SANTALUC[ÍI]A|ALLIANZ|AXA|GENERALI|ZURICH|OCASO|VIDACAIXA|BBVA (?:SEGUROS|VIDA)|SANTANDER (?:SEGUROS|VIDA)|MUTUA MADRILE[ÑN]A|CASER|REALE|LIBERTY|PLUS ULTRA|DKV|SANITAS|AEGON|NATIONALE[- ]NEDERLANDEN|BANSABADELL VIDA|UNICORP VIDA|UNICAJA VIDA|IBERCAJA VIDA|CAJAMAR VIDA|KUTXABANK (?:VIDA|SEGUROS)|FIATC|HELVETIA|PELAYO|CATALANA OCCIDENTE|SEGUROS BILBAO|ASISA|ADESLAS|CNP|METLIFE|SURNE|AGRUPACI[ÓO]|MGS|MUTUALIDAD DE LA ABOGAC[ÍI]A|MUTUALIDAD GENERAL|PREVENTIVA|ABANCA VIDA|RGA SEGUROS|SEGUROS RGA|ING|LÍNEA DIRECTA|LINEA DIRECTA|VERTI|MARCH VIDA|CAJA INGENIEROS VIDA|SA NOSTRA VIDA|LAGUN ARO|SEGURCAIXA|BANKINTER SEGUROS|OPENBANK)/i;
function lecPoliza(t) {
  const out = { campos: [], personas: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const ent = LEC_ASEG.exec(T1) || /\b([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ&. ]{2,40}(?:SEGUROS|VIDA|ASEGURADORA|MUTUA|INSURANCE))\b/.exec(T);
  const entidad = ent ? lecTitulo(ent[1]).replace(/\bBbva\b/, "BBVA").replace(/\bDkv\b/, "DKV").replace(/\bAxa\b/, "AXA").replace(/\bMgs\b/, "MGS").replace(/\bCnp\b/, "CNP").replace(/\bIng\b/, "ING").replace(/\bRga\b/, "RGA") : "";
  const pol = /p[óo]liza\s*(?:de\s+seguro\s*)?(?:n[úu]mero|n[.º°ºo]{0,2}|nº|#)?\s*[:：]?\s*([A-Z0-9][A-Z0-9\-\/.]{3,24})\b/i.exec(T1);
  const decesos = /\bdecesos\b/i.test(T1), accidentes = /\baccidentes?\b/i.test(T1) && !/\bvida\b/i.test(T1);
  const capital = lecDineroCerca(T1, /(?:capital\s+(?:asegurado|garantizado|b[áa]sico)|suma\s+asegurada|fallecimiento\s+por\s+cualquier\s+causa|capital\s+(?:en\s+caso\s+de|por|de)\s+fallecimiento|garant[íi]a\s+(?:principal|de\s+fallecimiento))\s*(?:\([^)]{0,40}\))?\s*[:：]?/i, 80) || lecDineroCerca(T1, /\bcapital\b\s*[:：]?/i, 60);
  const tom = new RegExp(`${lecCI("tomador")}[a]?\\s*(?:${lecCI("del")}\\s+${lecCI("seguro")})?\\s*[:：]?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const aseg = new RegExp(`${lecCI("asegurad")}[oa]\\s*(?:${lecCI("principal")})?\\s*[:：]\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const asegurado = aseg ? lecNombre(aseg[1]) : tom ? lecNombre(tom[1]) : "";
  const ben = /beneficiari[oa]s?[ \t]*(?:en\s+caso\s+de\s+fallecimiento|designad[oa]s?|por\s+fallecimiento)?[ \t]*[:：]?[ \t]*([^\n]{4,260}?)(?=\s*(?:\n|\.\s|Prima|Fecha|Duraci|Capital|Garant|Para el cobro|$))/i.exec(T1.replace(/\s+(?=Prima\b)/, "\n"));
  let benTxt = ben ? ben[1].replace(/\s+/g, " ").trim().replace(/[,.;:]+$/, "").replace(/\b(?:DON|DOÑA|D\.ª|Dª)\s+/g, "").replace(/\b([A-ZÁÉÍÓÚÑÜ]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ]{2,})+)\b/g, (m) => lecTitulo(m)).slice(0, 160) : "";
  benTxt = benTxt.replace(/^beneficiari[oa]s?\s*(?:en\s+caso\s+de\s+fallecimiento|designad[oa]s?|por\s+fallecimiento)?\s*[:：]?\s*/i, "");
  const herederosLegales = /herederos\s+legales|herederos\s+testamentarios|los\s+herederos|orden\s+de\s+prelaci[óo]n|seg[úu]n\s+(?:condiciones|p[óo]liza)|designad[oa]s\s+en\s+(?:la\s+)?p[óo]liza/i.test(benTxt);
  if (ben) for (const m of ben[1].matchAll(new RegExp(`(?:(${lecCI("c")}[óo]${lecCI("nyuge")}|${lecCI("espos")}[oa]|${lecCI("hij")}[oa]s?|${lecCI("herman")}[oa]s?|${lecCI("niet")}[oa]s?|${lecCI("pareja")})[^,;:]{0,30}?)?\\s*,?\\s*${LEC_TRAT}\\s*${LEC_NOMBRE_RE}`, "g"))) { const n = lecNombre(m[2]); if (!n || n === asegurado || out.personas.some((p) => p.nombre === n)) continue; const rel = m[1] ? lecRelPalabra(m[1]) : ""; out.personas.push({ nombre: n, relacion: rel, beneficiario: true, nota: "beneficiario del seguro (cobra el capital; no es heredero por ello)", conf: rel ? 1 : 0 }); }
  const tipo = decesos ? "decesos" : accidentes ? "accidentes" : "vida";
  const valor = { entidad: entidad || "Aseguradora sin identificar", poliza: pol ? pol[1] : "", capital: capital || null, beneficiarios: benTxt, tipo, asegurado };
  out.campos.push({ k: "poliza", etiqueta: decesos ? "Seguro de decesos" : "Seguro de vida", valor, mostrar: [valor.entidad, pol ? "póliza " + pol[1] : "", capital ? "capital " + eur0(capital) : "capital no leído", benTxt ? "beneficiarios: " + benTxt.slice(0, 90) : ""].filter(Boolean).join(" · "), conf: entidad && (capital || pol) ? 2 : 1 });
  if (decesos) out.avisos.push("Seguro de decesos: cubre el entierro. Si la aseguradora pagó el funeral, esa factura no se deduce como gasto de la herencia; solo el exceso que reembolse a la familia cuenta.");
  else if (!herederosLegales && out.personas.length) out.avisos.push(`Seguro de vida con beneficiario designado (${out.personas.map((p) => p.nombre).join(", ")}): el capital NO es masa hereditaria ni se reparte (art. 88 LCS); lo cobra el beneficiario directamente. Sí tributa en Sucesiones sumado a su porción, con la reducción propia de seguros de vida (9.195,49 € en la norma estatal; varias comunidades la mejoran). No se añade como bien.`);
  else out.avisos.push("Seguro de vida: el capital lo perciben los beneficiarios (herederos legales si no hay designación) por derecho propio, no como herencia; tributa en Sucesiones acumulado a la porción de cada uno con la reducción de seguros. No se añade como bien del inventario.");
  if (asegurado) out.campos.push({ k: "aseguradoNombre", etiqueta: "Asegurado", valor: asegurado, conf: 1 });
  return out;
}
// Escritura de herencia anterior (aceptación y adjudicación, partición): título de los bienes del hoy causante → fecha y valor de adquisición
function lecHerenciaPrevia(t) {
  const out = { campos: [], bienes: [], avisos: [] }; const T1 = t.replace(/\s+/g, " ");
  const F = lecFechas(T1.slice(0, 700)); const fechaEsc = F.length ? F[0].f : null;
  // Causante anterior y su fecha de fallecimiento: en la plusvalía la adquisición se cuenta desde la muerte (art. 989 CC), no desde la escritura
  const cp = new RegExp(`(?:${lecCI("que")}|${lecCI("causante")}\\s*,?|${lecCI("herencia")}\\s+${lecCI("de")}|${lecCI("fallecimiento")}\\s+${lecCI("de")})\\s+(?:${lecCI("su")}\\s+[a-záéíóúñü]+\\s*,?\\s*)?${LEC_TRAT}\\s*${LEC_NOMBRE_RE}\\s*,?[^.]{0,120}?${lecCI("falleci")}`).exec(T1);
  const causantePrevio = cp ? lecNombre(cp[1]) : "";
  const fDef = lecFechaCerca(T1, /falleci[óo]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?(?:el\s+(?:d[ií]a\s+)?)?|fallecid[oa]\s+(?:en\s+[^,]{0,60}?\s*,?\s*)?el\s+(?:d[ií]a\s+)?/i, 120);
  const fechaAdq = fDef || fechaEsc;
  // Adjudicaciones: «A DON X se le adjudica(n) … bajo el número 1 …»
  const adj = []; for (const m of T1.matchAll(new RegExp(`(?:\\b[Aa]\\s+|${lecCI("adjudica")}\\w*\\s+(?:${lecCI("a")}\\s+)?)${LEC_TRAT}\\s*${LEC_NOMBRE_RE}\\s*,?\\s*(?:[^.]{0,60}?)?(?:${lecCI("se")}\\s+${lecCI("le")}\\s+${lecCI("adjudica")}\\w*|${lecCI("adjudic")}\\w*)\\s*([^.]{0,400})`, "g"))) { const n = lecNombre(m[1]); if (!n) continue; const nums = [...m[2].matchAll(/(?:n[úu]meros?|finca|bien|partida|apartado)s?\s+((?:\d{1,2}\s*(?:,|y|e)?\s*)+)/gi)].flatMap((q) => q[1].match(/\d{1,2}/g) || []).map(Number); adj.push({ nombre: n, nums, texto: m[2] }); }
  // Inventario: cada inmueble empieza por URBANA/RÚSTICA (a veces con «1.-» delante)
  const M = [...T1.matchAll(/(?:(\d{1,2})\s*[.\-º)]+\s*)?(URBANA|R[ÚU]STICA)\s*[:.\-–]+\s*(.{10,260}?)(?=\s+(?:Referencia|Inscri|Linda|Se valora|Valorad|Valor|Tiene|Superficie|Cuota|Es parte|Forma parte|Título|TITULO|$))/gi)];
  M.forEach((m, i) => {
    const ini = m.index, fin = i + 1 < M.length ? M[i + 1].index : Math.min(T1.length, ini + 1500);
    const bloque = T1.slice(ini, fin).replace(/\b(?:ADJUDICACI|HIJUELA)[\s\S]*$/i, "");
    const num = m[1] ? Number(m[1]) : i + 1;
    const ref = lecRefCat(bloque);
    const valor = lecDineroCerca(bloque, /(?:se\s+valora\s+en|valorad[oa]s?\s+(?:en|a\s+efectos[^\d(]{0,60}?en)|valor(?:\s+declarado|\s+fiscal|\s+real)?\s*(?:de|:)|por\s+(?:un\s+)?valor\s+de|tasad[oa]\s+en|importe\s+de)\s*/i, 140);
    const desc = m[3]; const tipo = /vivienda|piso|casa|chalet|apartamento|d[úu]plex|[áa]tico|unifamiliar/i.test(desc) ? "vivienda" : "inmueble";
    const a = adj.find((q) => q.nums.includes(num)) || (adj.length === 1 ? adj[0] : null);
    out.bienes.push({ tipo, descripcion: lecFrase(desc, 90), refCatastral: ref, fechaAdq, valorAdq: valor, adjudicatario: a ? a.nombre : "", tituloHerencia: true, conf: valor && (ref || fechaAdq) ? 2 : 1 });
  });
  if (!M.length) out.avisos.push("No se ha reconocido ningún inmueble en el inventario de la escritura: anota a mano la fecha y el valor de adquisición del bien heredado.");
  out.avisos.push(`Escritura de herencia${causantePrevio ? " de " + causantePrevio : ""}${fechaEsc ? " otorgada el " + fechaLarga(fechaEsc) : ""}: es el título de adquisición del hoy causante. Fecha de adquisición propuesta: ${fechaAdq ? fechaLarga(fechaAdq) + (fDef ? " (fallecimiento del anterior causante, art. 989 CC)" : " (fecha de la escritura; si consta la del fallecimiento anterior, úsala)") : "no leída"}. Los valores son los declarados entonces en Sucesiones.`);
  if (!adj.length && M.length) out.avisos.push("No se ha leído a quién se adjudicó cada bien: comprueba que el adjudicatario fuera el hoy causante antes de usar estos datos como su título.");
  return out;
}
// Permiso de circulación o ficha técnica (DGT / ITV): matrícula, marca, modelo, fecha de matriculación, titular → bien tipo vehículo sin valor
const LEC_DEPREC = [100, 84, 67, 56, 47, 39, 34, 28, 24, 19, 17, 13, 10]; // % del precio medio según años de uso (Orden anual de precios medios de Hacienda)
function lecVehiculo(t) {
  const out = { campos: [], bienes: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const mat = /matr[íi]cula\s*(?:[:：]|\b[A]\b)?\s*(\d{4}\s?-?\s?[BCDFGHJKLMNPRSTVWXYZ]{3}|[A-Z]{1,2}\s?-?\s?\d{4}\s?-?\s?[A-Z]{1,2})\b/i.exec(T1) || /\b(\d{4}\s?[BCDFGHJKLMNPRSTVWXYZ]{3})\b/.exec(T1) || /(?:^|\n)\s*A\)?\s+(\d{4}\s?[BCDFGHJKLMNPRSTVWXYZ]{3}|[A-Z]{1,2}-\d{4}-[A-Z]{1,2})\b/m.exec(T);
  const matricula = mat ? mat[1].toUpperCase().replace(/\s+/g, " ").replace(/\s?-\s?/g, "-").replace(/^(\d{4})\s?([A-Z]{3})$/, "$1 $2") : "";
  const CLAVES = "Tipo|Modelo|Denominaci|Variante|Versi|Matr|Fecha|N[úu]mero|Nº|Bastidor|Categor|Cilindrada|Potencia|Color|Marca|Apellidos|Domicilio|Titular";
  const marca = new RegExp(`(?:\\bD\\.?\\s?1\\b\\)?\\s*(?:[Mm]arca)?|\\b[Mm]arca\\b)\\s*[:：]?\\s*([A-ZÁÉÍÓÚÑÜ][A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9\\-&.]{1,20}(?:\\s+(?!(?:${CLAVES}|D\\.?\\s?[23]|E)\\b)[A-Z][A-Za-z0-9\\-&.]{1,15})?)(?=\\s*(?:\\n|[:·|]|\\s+(?:${CLAVES}|D\\.?\\s?[23]|E|C\\.?\\s?1)(?![A-Za-z])|$))`).exec(T);
  const modelo = new RegExp(`(?:\\bD\\.?\\s?3\\b\\)?\\s*(?:[Dd]enominaci[óo]n\\s+[Cc]omercial)?|[Dd]enominaci[óo]n\\s+[Cc]omercial|\\b[Mm]odelo\\b)\\s*[:：]?\\s*([A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9][A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9\\-&./ ]{1,40}?)(?=\\s*(?:\\n|[:·|]|\\s+(?:${CLAVES}|D\\.?\\s?[12]|E|C\\.?\\s?1)(?![A-Za-z])|$))`).exec(T);
  const fecha = lecFechaCerca(T1, /(?:fecha\s+de\s+(?:la\s+)?)?(?:primera\s+)?matriculaci[óo]n\s*(?:en\s+Espa[ñn]a)?\s*[:：]?|\bB\)?\s+(?=\d{2}[\/.\-])/i, 30) || lecFechaCerca(T1, /\bI\)?\s+(?=\d{2}[\/.\-])/, 14);
  const bast = /(?:bastidor|identificaci[óo]n\s+del\s+veh[íi]culo|\bVIN\b|\bE\)?\s)\s*[:：]?\s*([A-HJ-NPR-Z0-9]{17})\b/i.exec(T1) || /\b([A-HJ-NPR-Z]{3}[A-HJ-NPR-Z0-9]{14})\b/.exec(T1);
  const cat = /categor[íi]a\s*(?:del\s+veh[íi]culo)?\s*[:：]?\s*\(?\s*([LMNO]\d[a-z]?)\b/i.exec(T1) || /\bJ\)?\s+([LMNO]\d)\b/.exec(T1);
  const cil = /cilindrada\s*(?:\(cm3\))?\s*[:：]?\s*(\d{3,5})/i.exec(T1) || /\bP\.?\s?1\b\)?\s*[:：]?\s*(\d{3,5})/i.exec(T1);
  const pot = /potencia\s+fiscal\s*(?:\(CVF\))?\s*[:：]?\s*(\d{1,3}(?:[.,]\d{1,2})?)/i.exec(T1);
  const tit = new RegExp(`(?:C\\.?\\s?1\\.?\\s?1\\b\\)?\\s*(?:${lecCI("apellidos")}\\s+${lecCI("y")}\\s+${lecCI("nombre")}(?:\\s+${lecCI("o")}\\s+${lecCI("raz")}[óo]${lecCI("n")}\\s+${lecCI("social")})?)?|${lecCI("apellidos")}\\s+${lecCI("y")}\\s+${lecCI("nombre")}(?:\\s+${lecCI("o")}\\s+${lecCI("raz")}[óo]${lecCI("n")}\\s+${lecCI("social")})?|${lecCI("titular")}(?:\\s+${lecCI("del")}\\s+${lecCI("veh")}[íi]${lecCI("culo")})?)\\s*[:：]?\\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\\- ]{3,50}?)\\s*,\\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü'\\- ]{2,30}?)(?=\\s*(?:\\n|C\\.?\\s?1|D\\.?\\s?1|DNI|NIF|Domicilio|$))`).exec(T) || new RegExp(`(?:${lecCI("titular")}(?:\\s+${lecCI("del")}\\s+${lecCI("veh")}[íi]${lecCI("culo")})?|${lecCI("propietario")})\\s*[:：]?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const titular = tit ? (tit[2] ? lecNombre(`${tit[2]} ${tit[1]}`) : lecNombre(tit[1])) : "";
  const clase = cat ? (/^L/i.test(cat[1]) ? "Motocicleta o ciclomotor" : /^N/i.test(cat[1]) ? "Furgoneta o camión" : /^O/i.test(cat[1]) ? "Remolque" : "Turismo") : /motocicleta|ciclomotor/i.test(T1) ? "Motocicleta" : /furgoneta|cami[óo]n/i.test(T1) ? "Furgoneta" : "Vehículo";
  const anio = fecha ? Number(fecha.slice(0, 4)) : null;
  const desc = [clase, marca ? lecTitulo(marca[1].trim()).replace(/\b(Bmw|Seat|Kia|Mg|Ds|Suv)\b/g, (m) => m.toUpperCase()) : "", modelo ? modelo[1].trim().replace(/\s+/g, " ") : "", matricula ? `matrícula ${matricula}` : "", anio ? `matriculado en ${anio}` : ""].filter(Boolean).join(" ").replace(/\s(matrícula)/, ", $1").replace(/\s(matriculado)/, ", $1");
  if (!matricula && !marca) { out.avisos.push("No se ha podido leer la matrícula ni la marca del vehículo: anótalo a mano."); return out; }
  out.bienes.push({ tipo: "vehiculo", descripcion: desc, matricula, marca: marca ? marca[1].trim() : "", modelo: modelo ? modelo[1].trim() : "", fechaMatriculacion: fecha || "", bastidor: bast ? bast[1] : "", cilindrada: cil ? Number(cil[1]) : null, potenciaFiscal: pot ? lecNum(pot[1]) : null, titular, valor: null, conf: matricula && marca ? 2 : 1 });
  const anos = fecha ? Math.max(0, Math.floor((Date.now() - new Date(fecha + "T12:00:00")) / 31557600000)) : null;
  out.avisos.push(`Vehículo: se valora con las tablas de precios medios de Hacienda (Orden anual) por marca, modelo${cil ? ", " + cil[1] + " cc" : ""}${pot ? ", " + pot[1] + " CVF" : ""} y antigüedad${anos != null ? `: ${anos} ${anos === 1 ? "año" : "años"} de uso → ${LEC_DEPREC[Math.min(anos, LEC_DEPREC.length - 1)]} % del precio medio de la tabla` : ""}. El valor queda vacío hasta que lo anotes.`);
  if (titular) out.campos.push({ k: "titularVehiculo", etiqueta: "Titular del vehículo", valor: titular, conf: 1 });
  return out;
}
// Modelo 650 (autoliquidación) o 660 (declaración) del Impuesto de Sucesiones ya presentado o en borrador: solo informativo (causante, devengo, sujeto pasivo, base y cuota)
function lecModelo650(t) {
  const out = { campos: [], personas: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const modelo = (/modelo\s*(65[01]|660)/i.exec(T1) || [])[1] || (/\b(65[01]|660)\b/.exec(T1) || [])[1] || "650";
  const borrador = /borrador|no\s+presentad|pendiente\s+de\s+presentaci[óo]n|sin\s+validar/i.test(T1);
  const presentado = /presentad[oa]\s+el|fecha\s+de\s+presentaci[óo]n|n[úu]mero\s+de\s+justificante|c[óo]digo\s+seguro\s+de\s+verificaci[óo]n|CSV|ingresad[oa]|NRC/i.test(T1) && !borrador;
  const APN = `(?:${lecCI("apellidos")}\\s+${lecCI("y")}\\s+${lecCI("nombre")}|${lecCI("nombre")}\\s+${lecCI("y")}\\s+${lecCI("apellidos")}|${lecCI("nombre")}|${lecCI("apellidos")})`;
  const cau = new RegExp(`${lecCI("causante")}\\s*(?:\\(?${lecCI("fallecid")}[oa]\\)?\\s*)?[:：\\-–—]?\\s*(?:(${APN})(?:\\s+o\\s+raz[óo]n\\s+social)?\\s*[:：]?\\s*)?${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const ordena = (etq, n) => (etq && /^apellidos/i.test(etq) ? lecApellidosNombre(n) : lecNombre(n));
  const nombre = cau ? ordena(cau[1], cau[2]) : "";
  if (nombre) out.campos.push({ k: "nombre", etiqueta: "Causante (según el modelo " + modelo + ")", valor: nombre, conf: 1 });
  const fDev = lecFechaCerca(T1, /fecha\s+(?:de\s+)?(?:devengo|fallecimiento|defunci[óo]n)\s*[:：]?/i, 30); if (fDev) out.campos.push({ k: "fecha", etiqueta: "Fecha de devengo (fallecimiento)", valor: fDev, mostrar: fechaLarga(fDev), conf: 1 });
  const nifs = lecNifs(T1);
  const sp = new RegExp(`(?:${lecCI("sujeto")}\\s+${lecCI("pasivo")}|${lecCI("heredero")}|${lecCI("causahabiente")}|${lecCI("contribuyente")}|${lecCI("declarante")})\\s*[:：\\-–—]?\\s*(?:(${APN})(?:\\s+o\\s+raz[óo]n\\s+social)?\\s*[:：]?\\s*)?${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const sujeto = sp ? ordena(sp[1], sp[2]) : "";
  const par = /parentesco\s*(?:con\s+el\s+causante)?\s*[:：]?\s*(c[óo]nyuge|hij[oa]|descendiente|nieto|padre|madre|ascendiente|herman[oa]|sobrin[oa]|t[íi][oa]|extra[ñn]o|sin\s+parentesco)/i.exec(T1);
  const grupo = /grupo\s*(?:de\s+parentesco)?\s*[:：]?\s*(I{1,3}|IV|[1-4])\b/i.exec(T1);
  if (sujeto && sujeto !== nombre) { const rel = par ? lecRelPalabra(par[1]) : ""; out.personas.push({ nombre: sujeto, nif: nifs.find((n) => !T1.slice(0, (cau || { index: 0 }).index + 120).includes(n)) || "", relacion: rel, conf: rel ? 1 : 0, nota: `sujeto pasivo del modelo ${modelo}${grupo ? " · grupo " + grupo[1].toUpperCase() : ""}` }); }
  const base = lecDineroCerca(T1, /base\s+imponible\s*(?:\(\d{1,3}\))?\s*[:：]?/i, 60);
  const bliq = lecDineroCerca(T1, /base\s+liquidable\s*(?:\(\d{1,3}\))?\s*[:：]?/i, 60);
  const cuota = lecDineroCerca(T1, /(?:total\s+a\s+ingresar|cuota\s+(?:tributaria|a\s+ingresar|l[íi]quida|resultante)|a\s+ingresar|importe\s+(?:del\s+)?ingreso)\s*(?:\(\d{1,3}\))?\s*[:：]?/i, 60);
  const cuotaInt = lecDineroCerca(T1, /cuota\s+[íi]ntegra\s*(?:\(\d{1,3}\))?\s*[:：]?/i, 60);
  const valor = { modelo, sujeto, base: base ?? null, baseLiquidable: bliq ?? null, cuota: cuota ?? cuotaInt ?? null, estado: presentado ? "presentado" : borrador ? "borrador" : "sin confirmar presentación", fecha: fDev || "" };
  out.campos.push({ k: "isdPresentado", etiqueta: `Modelo ${modelo} ${valor.estado}`, valor, mostrar: [sujeto ? "sujeto pasivo " + sujeto : "", base != null ? "base imponible " + eur0(base) : "", bliq != null ? "base liquidable " + eur0(bliq) : "", valor.cuota != null ? "cuota " + eur0(valor.cuota) : ""].filter(Boolean).join(" · ") || "sin importes legibles", conf: 1 });
  out.avisos.push(`Modelo ${modelo} ${valor.estado}${sujeto ? " de " + sujeto : ""}: ${base != null ? "base imponible " + eur0(base) : "base no leída"}${valor.cuota != null ? ", cuota " + eur0(valor.cuota) : ""}. Solo informativo: sirve para contrastar el cálculo de la app, no carga bienes ni herederos${presentado ? ". Si ya está presentado, cualquier cambio exige una declaración complementaria o una rectificación" : ""}.`);
  if (modelo === "660") out.avisos.push("El modelo 660 es la declaración con la relación de bienes del caudal: su inventario puede servir para comprobar que no falta ningún bien en el expediente.");
  return out;
}
// Dígito de control de la zona de lectura mecánica (ICAO 9303: pesos 7, 3, 1; letras A=10…Z=35; «<» = 0)
const lecMrzControl = (s) => [...String(s)].reduce((a, c, i) => a + ([7, 3, 1][i % 3] * (/\d/.test(c) ? Number(c) : /[A-Z]/.test(c) ? c.charCodeAt(0) - 55 : 0)), 0) % 10;
function lecDni(t) {
  const out = { personas: [], avisos: [] };
  // Zona de lectura mecánica del DNI 3.0 y del TIE (tres líneas de 30): IDESP..., fecha nacimiento AAMMDD, APELLIDOS<<NOMBRE
  // DNI antiguo (hasta 2006, dos líneas de 36): IDESP + APELLIDO1<APELLIDO2<<NOMBRE / número + ESP + nacimiento + sexo + caducidad
  const L = t.split(/\n/).map((s) => s.replace(/\s/g, "").toUpperCase()).filter((s) => /^[A-Z0-9<]{28,38}$/.test(s));
  const esNie = /TARJETA DE IDENTIDAD DE EXTRANJERO|PERMISO DE RESIDENCIA|RESIDENCE PERMIT|\bNIE\b|\bTIE\b/i.test(t);
  const l1 = L.find((s) => /^I[DR]/.test(s)), l3 = L.find((s) => /<<\w/.test(s) && !/^I[DR]/.test(s) && /^[A-Z<]+$/.test(s));
  const l2 = L.find((s) => /^\d{6}[0-9MF<]/.test(s) || /^\d{7}[MF]\d{7}/.test(s));
  const viejo = !l3 && l1 && /^I[DR][A-Z]{3}[A-Z]+<[A-Z<]+/.test(l1) ? l1 : null; // DNI antiguo: el nombre va en la primera línea
  const l2v = viejo ? L.find((s) => s !== l1 && /^[A-Z0-9]{8,9}[0-9<][A-Z]{3}\d{6}/.test(s)) : null;
  let nombre = "", nif = "", nac = "", mrzNacOk = false;
  const nomMrz = (z) => { const [ap, nm] = z.split("<<"); return lecNombre(`${(nm || "").replace(/</g, " ")} ${(ap || "").replace(/</g, " ")}`); };
  if (l3) nombre = nomMrz(l3);
  else if (viejo) nombre = nomMrz(viejo.slice(5));
  if (l1 && !viejo) { const m = /^I[DR][A-Z]{3}[A-Z0-9]{9}.?(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])/.exec(l1); if (m && lecNifOk(m[1])) nif = m[1]; if (!nif) { const q = /([XYZ]\d{7}[A-Z]|\d{8}[A-Z])<*$/.exec(l1); if (q && lecNifOk(q[1])) nif = q[1]; } }
  if (l2v) { const m = /^([A-Z0-9]{8,9})[0-9<][A-Z]{3}(\d{2})(\d{2})(\d{2})/.exec(l2v); if (m) { if (lecNifOk(m[1])) nif = m[1]; const yy = Number(m[2]); const y = yy > Number(String(new Date().getFullYear()).slice(2)) ? 1900 + yy : 2000 + yy; nac = lecIso(m[4], m[3], y) || ""; } }
  else if (l2) { const m = /^(\d{2})(\d{2})(\d{2})(\d)?/.exec(l2); if (m) { const yy = Number(m[1]); const y = yy > Number(String(new Date().getFullYear()).slice(2)) ? 1900 + yy : 2000 + yy; nac = lecIso(m[3], m[2], y) || ""; mrzNacOk = m[4] != null && lecMrzControl(l2.slice(0, 6)) === Number(m[4]); } }
  // Fecha impresa en el anverso («FECHA DE NACIMIENTO 12 04 1980»; en columnas, con el número del DNI en medio): si la de la zona mecánica no supera su dígito de control y no coincide, manda la impresa
  { const z = /(?:FECHA\s+DE\s+NAC\w*|NACIMIENTO|DATE\s+OF\s+BIRTH)(?:[^\d]|\b\d{7,8}[A-Z0-9]\b){0,70}?(\d{2})[\s.\/-]+(\d{2})[\s.\/-]+(\d{4})/i.exec(t); const imp = z ? lecIso(z[1], z[2], z[3]) : null;
    if (imp && imp !== nac && !mrzNacOk) { if (nac) out.avisos.push(`La fecha de nacimiento de la zona mecánica (${nac}) no supera su dígito de control: se toma la impresa en el documento (${imp}). Compruébala.`); nac = imp; } }
  if (!nif) { const N = lecNifs(t); if (N.length) nif = N[0]; }
  if (!nombre) { const ap = /APELLIDOS?\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{3,40}?)\s+NOMBRE\s*[:：]?\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{2,30}?)(?=\s+(?:SEXO|NACIONALIDAD|FECHA|DNI|NIE|NUM|VALIDO|VALIDEZ|DOMICILIO|LUGAR|$))/.exec(lecN(t)); if (ap) nombre = lecNombre(`${ap[2]} ${ap[1]}`); }
  if (!nac) { const f = lecFechaCerca(t, /nacimiento|FECHA DE NAC|date of birth|f\.?\s*nac/i, 40); if (f) nac = f; }
  const extranjero = esNie || /^[XYZ]/.test(nif);
  if (nombre || nif) out.personas.push({ nombre: nombre || (extranjero ? "Titular del NIE" : "Titular del DNI"), nif, nacimiento: nac, edad: nac ? Math.floor((Date.now() - new Date(nac + "T12:00:00")) / 31557600000) : null, relacion: "", extranjero, conf: nif && nombre ? 2 : 1 });
  else out.avisos.push("No se ha podido leer el DNI: prueba con una foto más nítida del reverso (las dos líneas de letras y «<»).");
  if (extranjero) out.avisos.push("Titular extranjero (NIE): comprueba su residencia fiscal; si no reside en España tributa por obligación real ante la Agencia Estatal, no ante la comunidad autónoma.");
  return out;
}
const lecNombreBanco = (b) => lecTitulo(b).replace(/^Ing$/, "ING").replace(/^Bbva$/, "BBVA").replace(/^Banco Bilbao Vizcaya$/, "BBVA").replace(/^La Caixa$/, "CaixaBank").replace(/^Caixabank$/, "CaixaBank").replace(/^Banco Santander$/, "Santander").replace(/^Banco (?:de )?Sabadell$/, "Sabadell").replace(/^N26$/, "N26");
const LEC_BANCOS = /(UNICAJA|CAIXABANK|LA CAIXA|BBVA|BANCO BILBAO VIZCAYA|BANCO SANTANDER|SANTANDER|BANCO (?:DE )?SABADELL|SABADELL|BANKINTER|ABANCA|KUTXABANK|IBERCAJA|CAJAMAR|OPENBANK|EVO BANCO|CAJA RURAL(?: DE[L]? [A-ZÁÉÍÓÚÑÜ]+(?: [A-ZÁÉÍÓÚÑÜ]+)?)?|BANCA MARCH|DEUTSCHE BANK|TARGOBANK|LABORAL KUTXA|CAJASUR|EUROCAJA RURAL|GLOBALCAJA|MYINVESTOR|RENTA 4|SELFBANK|SINGULAR BANK|ANDBANK|BANKIA|CAJA DE INGENIEROS|ARQUIA|TRIODOS|N26|REVOLUT|BANCO MEDIOLANUM|BANCO CAMINOS|BANCO PICHINCHA|CAIXA ONTINYENT|COLONYA|BANCO COOPERATIVO|\bING\b)/i;
function lecBancario(t) {
  const out = { bienes: [], deudas: [], avisos: [] };
  // Normaliza: «€ 1.234,56» y «EUR 1.234,56» → «1.234,56 €»; «1.234,56€» → «1.234,56 €»; saldos deudores «1.234,56 D» o «-1.234,56»
  let T = t.replace(/[ \t]+/g, " ").replace(/(?:€|EUR)\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})(?![\d.,])/g, " $1 €").replace(/(\d),(\d{2})€/g, "$1,$2 €").replace(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€?\s*\b[D]\b(?=\s|$)/g, "-$1 €");
  const banco = LEC_BANCOS.exec(T);
  const nombreBanco = banco ? lecNombreBanco(banco[1]) : "Entidad";
  // Importe: 38.500,00 seguido de €/euros o a fin de línea (en las tablas el símbolo € puede caer en la línea siguiente)
  const DIN = /(?<![\d.,])(-?\d{1,3}(?:\.\d{3})*,\d{2})(?=\s*(?:€|euros?|EUR|\n|$))/g;
  const prodRe = /\b(cuenta(?: corriente| de ahorro| vivienda| n[óo]mina| online| a la vista| remunerada)?|libreta(?: de ahorro)?|dep[óo]sito(?: a plazo(?: fijo)?)?|imposici[óo]n a plazo(?: fijo)?|plazo fijo|fondo de inversi[óo]n|fondos?\b|plan de pensiones|plan de previsi[óo]n|EPSV|acciones|valores|cartera de valores|cartera|participaciones|bonos|letras del tesoro|obligaciones|pr[ée]stamo(?: hipotecario| personal| al consumo)?|cr[ée]dito(?: hipotecario| personal| al consumo)?|hipoteca|tarjeta(?: de cr[ée]dito| visa| mastercard| de d[ée]bito)?|descubierto|aval|caja de seguridad)\b/i;
  const posiciones = [], prestamos = [];
  const LIN = T.split(/\n/);
  for (let li = 0; li < LIN.length; li++) {
    const linea = LIN[li]; const pm = prodRe.exec(linea); if (!pm) continue;
    if (/^\s*(?:producto|saldo|concepto|tipo)\b/i.test(linea.replace(pm[0], ""))) continue; // cabecera de tabla
    if (/^\s*(?:producto|concepto|tipo de producto)/i.test(linea)) continue;
    const tipo = pm[1].toLowerCase(); const resto = linea.slice(pm.index + pm[0].length); const antes = linea.slice(0, pm.index);
    const num = (z) => [...z.matchAll(DIN)].map((m) => m[1]);
    let imps = num(resto); if (!imps.length) imps = num(antes); // columnas en otro orden: el saldo delante del producto
    if (!imps.length && LIN[li + 1] && !prodRe.test(LIN[li + 1])) imps = num(LIN[li + 1]); // párrafo partido: el importe en la línea siguiente
    if (!imps.length) continue;
    const raw = imps[imps.length - 1]; const importe = lecNum(raw.replace("-", "")); if (!importe) continue;
    const negativo = /^-/.test(raw) || /saldo\s+deudor|deudor|dispuesto|pendiente/i.test(resto + antes) && /tarjeta|descubierto/.test(tipo);
    const todo = antes + " " + resto; const sinImp = resto.replace(/(?<![\d.,])-?\d{1,3}(?:\.\d{3})*,\d{2}\s*(?:€|euros?|EUR)?\s*$/, "");
    const pct = /(\d{1,3}(?:,\d{1,2})?)\s*%/.exec(todo); const cot = /\sy\s*$|\sy\s+[A-ZÁÉÍÓÚÑÜ]/.test(sinImp) || /indistint|cotitular|conjunt|mancomunad|50\s*%|titulares\s*[:：]?\s*2|\b2\s+titulares/i.test(todo);
    if (/^(?:pr[ée]stamo|cr[ée]dito|hipoteca|tarjeta|descubierto)/.test(tipo) || negativo && /cuenta|libreta/.test(tipo)) { prestamos.push({ tipo: negativo && /cuenta|libreta/.test(tipo) ? "descubierto" : tipo, resto: todo, importe, cot }); continue; }
    if (/^(?:aval|caja de seguridad)/.test(tipo)) { out.avisos.push(`${nombreBanco}: consta ${tipo} (${eur0(importe)}). No se carga como bien; revísalo.`); continue; }
    // IBAN completo, partido entre dos líneas (celda estrecha) o enmascarado («ES21 2103 **** **** **** 9012»: se guardan las cuatro últimas cifras)
    let iban = /\bES\d{2}(?:\s?\d{4}){5}\b/.exec(todo); let ibanFin = "";
    if (!iban) { const p = /\bES\d{2}(?:\s?\d{4}){1,4}(?!\d)/.exec(linea); const sig = LIN[li + 1] ? /^\s*(?:[A-Za-záéíóúñü.]+\s+){0,3}((?:\d{4}\s?){1,4})(?![\d.,])/.exec(LIN[li + 1]) : null;
      if (p && sig) { const j = (p[0] + sig[1]).replace(/\s/g, ""); if (/^ES\d{22}$/.test(j)) iban = [j]; else if (/^ES\d{22}/.test(j)) iban = [j.slice(0, 24)]; } }
    if (!iban) { const mk = /\bES\d{2}[\s\d*]{6,30}?[*x•]{2,}[\s*x•]*(\d{4})\b/i.exec(todo); if (mk) ibanFin = mk[1]; }
    // Celda partida en varias líneas («Fondo de inversión … 15.402,33 / Bankinter Renta Fija € / Corto Plazo FI»): las líneas siguientes sin importes ni producto completan el nombre
    let cont = ""; for (let k = li + 1, vacias = 0; k <= li + 2 + vacias && k < LIN.length; k++) { const l2 = LIN[k].replace(/€|EUR/g, " ").trim(); if (!l2 && !cont && vacias < 1) { vacias++; continue; } if (!l2 || prodRe.test(l2) || /\d{1,3}(?:\.\d{3})*,\d{2}/.test(l2) || l2.length > 60 || /^(?:total|el |la |los |no |se |madrid|m[áa]laga)/i.test(l2)) break; cont += " " + l2; }
    posiciones.push({ tipo, importe, iban: iban ? iban[0].replace(/\s/g, "") : "", ibanFin, cotitular: cot, porcentaje: pct ? lecNum(pct[1]) : null, texto: linea, cont: cont.trim(), prod: pm[0] });
  }
  if (!posiciones.length && !prestamos.length) for (const m of T.matchAll(/saldo[^\n]{0,80}?(?<![\d.,])(\d{1,3}(?:\.\d{3})*,\d{2})(?=\s*(?:€|euros?|EUR|\n|$))/gi)) posiciones.push({ tipo: "cuenta", importe: lecNum(m[1]), iban: "", cotitular: false, porcentaje: null, texto: m[0] });
  for (const s of posiciones) {
    const esPlan = /plan de pensiones|plan de previsi|epsv/.test(s.tipo), esFondo = esPlan || /fondo|accion|valores|cartera|participaciones|bonos|letras|obligaciones/.test(s.tipo);
    const desc = esPlan ? "Plan de pensiones" : esFondo ? (/accion/.test(s.tipo) ? "Acciones" : /bonos|letras|obligaciones/.test(s.tipo) ? "Renta fija" : "Fondo o valores") : /dep[óo]sito|imposici|plazo/.test(s.tipo) ? "Depósito a plazo" : "Cuenta";
    const nomRe = /\b(?:[Ff]ondo de [Ii]nversi[óo]n|[Ff]ondo|[Aa]cciones|[Pp]lan de [Pp]ensiones)\s+([A-ZÁÉÍÓÚÑÜ][A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9&.\- ]{3,40}?)(?=\s+(?:FI|SICAV|\d|·|\||ES\d|Particip|Valor|Saldo|$))/;
    const nomProd = nomRe.exec(s.texto) || (s.cont ? nomRe.exec(`${s.prod} ${s.cont}`) : null);
    out.bienes.push({ tipo: esFondo ? "valores" : "cuenta", descripcion: `${desc}${nomProd ? " " + nomProd[1].trim() : ""} en ${nombreBanco}`, valor: s.importe, entidad: nombreBanco, iban: !esFondo ? s.iban : "", ...(!esFondo && s.ibanFin ? { ibanFin: s.ibanFin } : {}), cotitular: s.cotitular, ...(s.porcentaje != null && s.porcentaje < 100 ? { porcentaje: s.porcentaje } : {}), conf: esPlan ? 0 : 1 });
    if (esPlan) out.avisos.push(`Plan de pensiones en ${nombreBanco} (${eur0(s.importe)}): no forma parte de la herencia ni tributa en Sucesiones; lo cobran los beneficiarios designados y tributa en su IRPF como rendimiento del trabajo. Queda sin marcar.`);
  }
  for (const p of prestamos) { const hip = /hipotec/.test(p.tipo) || /hipotec|vivienda|garant[íi]a/i.test(p.resto); const tarj = /tarjeta/.test(p.tipo); out.deudas.push({ concepto: `${hip ? "Préstamo hipotecario" : tarj ? "Tarjeta de crédito (saldo deudor)" : /descubierto/.test(p.tipo) ? "Descubierto en cuenta" : "Préstamo personal"} en ${nombreBanco} (${tarj ? "dispuesto" : "capital pendiente"} a la fecha del fallecimiento)`, importe: p.importe, ganancial: p.cot, fuente: "banco", banco: nombreBanco, hipoteca: hip, conf: 2 }); }
  if (!posiciones.length && !prestamos.length) out.avisos.push(`Certificado de ${nombreBanco}: no se han podido leer los saldos; introdúcelos a mano.`);
  if (posiciones.some((s) => s.porcentaje != null && s.porcentaje < 100)) out.avisos.push("El banco indica el porcentaje de titularidad del causante en alguna cuenta: si estaba casado en gananciales el saldo es ganancial por entero (la mitad es del viudo); si no, se computa solo su porcentaje.");
  const f = lecFechaCerca(T, /a\s+(?:la\s+)?fecha\s+(?:de|del)\s+(?:fallecimiento|defunci[óo]n)|a\s+fecha\s+|saldo\s+a\s+(?:fecha\s+)?|posiciones\s+a\s+(?:fecha\s+)?(?:de\s+)?/i, 40); if (f) out.fechaSaldo = f;
  return out;
}
function lecCompraventa(t) {
  const out = { campos: [], bienes: [], avisos: [] }; const T = t.replace(/\s+/g, " ");
  const F = lecFechas(T.slice(0, 800)); const fecha = F.length ? F[0].f : null;
  const pre = /precio\s+(?:total\s+)?(?:de\s+(?:esta|la)\s+compraventa|de\s+la\s+venta|convenido|pactado|es\s+(?:el\s+)?de|de|:)\s*/i.exec(T) || /\bprecio\b/i.exec(T);
  let precio = pre ? lecDineroCerca(T.slice(pre.index), /precio[^\d(]{0,160}?/i, 200) : null;
  const zona = pre ? T.slice(pre.index, pre.index + 360) : "";
  if (precio && /pesetas|ptas/i.test(zona) && !/€|euros/i.test(zona)) { precio = Math.round(precio / 166.386 * 100) / 100; out.avisos.push("El precio estaba en pesetas: se ha convertido a euros (166,386 ptas/€)."); }
  const ref = lecRefCat(T);
  out.bienes.push({ tipo: "inmueble", descripcion: "Inmueble de la escritura de compraventa", refCatastral: ref, fechaAdq: fecha, valorAdq: precio, conf: fecha && precio ? 2 : 1 });
  if (!precio) out.avisos.push("No se ha leído el precio de la compraventa: búscalo en la escritura (plusvalía por el método real).");
  return out;
}
function lecAnalizar(texto, nombre) {
  const info = lecTipoInfo(texto, nombre); let tipo = info.tipo;
  // Registro Civil: el libro de familia y los certificados sueltos de matrimonio o nacimiento comparten extractor, pero se nombran por separado
  if (tipo === "familia" && !/LIBRO DE FAMILIA/.test(lecN(texto))) { const T = lecN(texto); if (/NACIMIENTO/.test(T) && !/MATRIMONIO/.test(T.slice(0, 400)) && /(?:CERTIFICA|INSCRIPCION|ACTA|EXTRACTO)[^\n]{0,60}NACIMIENTO/.test(T)) tipo = "nacimiento"; else if (/MATRIMONIO/.test(T)) tipo = "matrimonio"; }
  const ex = LEC_EXTRA.find((e) => e.tipo === tipo);
  const F0 = { defuncion: lecDefuncion, ultimas: lecUltimas, seguros: lecSeguros, herederos: lecHerederos, familia: lecFamilia, matrimonio: lecFamilia, nacimiento: lecFamilia, padron: lecPadron, poliza: lecPoliza, catastro: (t) => lecCatastro(t, false), ibi: (t) => lecCatastro(t, true), notasimple: lecNotaSimple, testamento: lecTestamento, dni: lecDni, bancario: lecBancario, compraventa: lecCompraventa, herenciaprevia: lecHerenciaPrevia, vehiculo: lecVehiculo, modelo650: lecModelo650 }[tipo];
  const F = ex ? ex.extraer : F0;
  const ajeno = tipo === "desconocido" ? lecAjeno(lecN(texto)) : "";
  const AJENO_MSG = { nomina: "Parece una nómina: no forma parte de la herencia. Solo los salarios devengados y no cobrados a la fecha del fallecimiento serían un derecho de crédito del caudal; en ese caso anótalo a mano.", factura: "Parece una factura: si corresponde al entierro, funeral o la última enfermedad, anótala en los gastos deducibles del expediente; si no, no forma parte de la herencia. No se extraen datos.", carta: "Parece una carta o comunicación: no se extraen datos. Si el banco o la aseguradora adjuntan certificados, súbelos como documentos aparte." };
  let d; try { d = F ? F(texto) : null; } catch (e) { console.error(e); d = { avisos: [`No se pudo interpretar el documento (${LEC_TIPOS[tipo] || tipo}): revísalo a mano.`] }; }
  if (!d) d = { avisos: [ajeno ? AJENO_MSG[ajeno] : "No se reconoce el tipo de documento. Se archiva igualmente; los datos se introducen a mano."] };
  const avisos = [...(d.avisos || [])];
  for (const rc of new Set((d.bienes || []).map((b) => b.refCatastral).filter((r) => r && r.length === 20 && !lecRefCatOk(r)))) avisos.push(`La referencia catastral ${rc} no cuadra con sus caracteres de control: compruébala en el documento (puede estar mal escrita o mal leída).`);
  if (info.empate) avisos.unshift(`El contenido encaja por igual con ${info.empate.map((k) => "«" + (LEC_TIPOS[k] || k) + "»").join(" y ")}: se ha tratado como «${LEC_TIPOS[tipo] || tipo}»${info.porNombre ? " por el nombre del archivo" : ""}. Si no lo es, revisa lo propuesto y cambia el nombre del archivo para que lo indique.`);
  else if (info.soloNombre && tipo !== "desconocido") avisos.unshift(`Apenas se ha reconocido texto propio de «${LEC_TIPOS[tipo] || tipo}»: se ha tratado así por el nombre del archivo. Revisa lo propuesto.`);
  return { tipo, titulo: LEC_TIPOS[tipo], campos: d.campos || [], personas: d.personas || [], bienes: d.bienes || [], deudas: d.deudas || [], gastos: d.gastos || [], avisos, extra: d };
}

// Errores de las librerías (pdf.js, el navegador, Tesseract) en español claro (M7): nunca se muestra el mensaje técnico en inglés
const LEC_ERRORES = [
  [/password|contrase/i, "está protegido con contraseña y no se ha podido abrir; vuelve a subirlo e indica la contraseña"],
  [/empty|zero bytes|0 bytes|vac[ií]o/i, "el archivo está vacío (0 bytes); descárgalo de nuevo o pide otra copia"],
  [/invalid pdf|pdf structure|pdf header|xref|corrupt|damaged|missing pdf|unexpected (end|eof)|bad (encoding|stream)|format error/i, "el PDF está dañado o incompleto; descárgalo de nuevo o pide otra copia"],
  [/decod|unsupported image|image (format|type)|InvalidStateError|EncodingError|source image/i, "la imagen está dañada o en un formato que el navegador no abre; guárdala de nuevo como JPEG o PNG"],
  [/memory|allocation|too large|maximum call stack|RangeError/i, "el archivo es demasiado grande para leerlo en este equipo; divídelo o redúcelo"],
  [/network|fetch|failed to load|dynamically imported|importing a module|load .*script/i, "no se ha podido cargar el lector de documentos; comprueba la conexión a internet y vuelve a intentarlo"],
  [/abort/i, "la lectura se ha cancelado"],
];
function lecMensajeError(e) {
  const m = String((e && (e.message || e.name)) || e || "").trim();
  for (const [re, txt] of LEC_ERRORES) if (re.test(m) || (e && e.name && re.test(e.name))) return txt;
  // Mensajes propios (ya en español) se respetan; cualquier otro, genérico
  return m && /[áéíóúñü¿¡]|\b(el|la|los|las|del|no se|está)\b/i.test(m) && !/\b(the|is|not|could|invalid|failed|error|cannot|unexpected)\b/i.test(m) ? m.slice(0, 160).replace(/[.\s]+$/, "") : "no se ha podido abrir (archivo dañado o formato no admitido)";
}
// ── Lectura de varios archivos con progreso ──
function lecProgreso(txt) { const n = document.getElementById("lec-prog"); if (n) n.textContent = txt; }
async function lecLeerArchivos(files, prof = 0) {
  const out = []; out.adjuntos = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]; LEC.estado = { base: prof ? `Leyendo el adjunto ${f.name}` : `Leyendo ${i + 1} de ${files.length}: ${f.name}` }; lecProgreso(LEC.estado.base);
    try {
      const r = await lecTexto(f);
      if (!r) { out.push({ nombre: f.name, tipo: "desconocido", titulo: "Formato no legible", texto: "", datos: { campos: [], personas: [], bienes: [], deudas: [], gastos: [], avisos: [lecNoLegible(f.name)] }, escaneado: false }); continue; }
      let datos;
      if (r.correo && r.adjuntos && r.adjuntos.length && r.correo.cuerpo.replace(/\s+/g, " ").length < 400) datos = { tipo: "desconocido", titulo: "Correo electrónico", campos: [], personas: [], bienes: [], deudas: [], gastos: [], avisos: [] }; // el texto del correo solo acompaña a los adjuntos
      else datos = lecAnalizar(r.texto, f.name);
      if (r.correo && datos.tipo === "desconocido") { datos.titulo = "Correo electrónico"; datos.avisos = datos.avisos.filter((a) => !/^No se reconoce el tipo|^Parece una carta/.test(a)); }
      if (r.avisos && r.avisos.length) datos.avisos.unshift(...r.avisos);
      out.push({ nombre: f.name, tipo: datos.tipo, titulo: datos.titulo, texto: r.texto, datos, escaneado: r.escaneado, paginas: r.paginas, formato: r.formato || "" });
      // Adjuntos (de un correo o de un PDF): se leen como documentos propios, hasta tres niveles (correo reenviado dentro de un correo)
      if (r.adjuntos && r.adjuntos.length && prof < 3) {
        const sub = await lecLeerArchivos(r.adjuntos.filter((a) => lecLegible(a) || /\.(eml|docx?|xlsx?|msg)$/i.test(a.name)), prof + 1);
        for (const q of sub) q.nombre = `${f.name} › ${q.nombre}`;
        out.push(...sub); out.adjuntos.push(...r.adjuntos.map((a) => ({ archivo: a, de: f.name })), ...sub.adjuntos);
      }
    } catch (e) {
      const msg = e && e.message === "solo-web" ? "La lectura de documentos funciona en la versión web (heredate.github.io); en el archivo único no está disponible." : `No se pudo leer ${f.name}: ${lecMensajeError(e)}. El archivo queda archivado.`;
      out.push({ nombre: f.name, tipo: "desconocido", titulo: "No leído", texto: "", datos: { campos: [], personas: [], bienes: [], deudas: [], gastos: [], avisos: [msg] }, escaneado: false });
    }
  }
  if (!prof) LEC.estado = null;
  return out;
}
// Gancho desde archivoGuardar: tras archivar, se leen los PDF e imágenes y se abre la revisión
async function lecTrasArchivar(files, expId) {
  if (!lecDisponible() || LEC.sinLeer) return;
  const L = [...files].filter(lecLegible);
  if (!L.length) return;
  const x = DB.expedientes.find((q) => q.id === expId); if (!x) return;
  LEC.exp = expId; LEC.resultado = null; LEC.leyendo = true;
  ui.sheet = { tipo: "lector" }; render();
  const R = await lecLeerArchivos(L);
  LEC.leyendo = false; LEC.resultado = lecPropuestas(x, R);
  try { const C = lecCausantes(R, x); if (C.grupos.length > 1) LEC.resultado.causantes = C; } catch (e) { console.error(e); }
  // Los adjuntos de los correos (y de los PDF) se archivan también en el expediente, como documentos propios ya leídos
  if (R.adjuntos && R.adjuntos.length && typeof archivoGuardar === "function") { LEC.sinLeer = true; try { await archivoGuardar(R.adjuntos.map((a) => a.archivo), expId, ""); } catch (e) { console.error(e); } LEC.sinLeer = false; }
  try { for (const d of ARCH.lista.filter((q) => q.expId === expId && !q.estado)) { const r = R.find((q) => q.nombre === d.nombre) || ((R.adjuntos || []).some((a) => a.archivo.name === d.nombre) ? R.find((q) => q.nombre.endsWith(" › " + d.nombre)) : null); if (r || L.some((f) => f.name === d.nombre)) await archivoCambiar(d.id, { estado: "revisar", leido: !!(r && r.texto), tipoLeido: r ? r.tipo : "" }); } } catch (e) { console.error(e); }
  if (ui.sheet && ui.sheet.tipo === "lector") render();
}

// ── De los datos leídos a propuestas concretas sobre el expediente (con fusión por nombre o referencia catastral) ──
// Misma persona: el nombre corto contenido en orden en el largo («Eugenia Pozas» ⊂ «Eugenia Pozas Espada»), o mismo nombre de pila y algún
// apellido en la misma posición. Dos hermanos («Raquel» y «Gustavo Tébar Pozas») o madre e hija con un apellido común no se confunden.
const lecLev = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
const lecMismoNombre = (a, b) => {
  const n = (s) => lecN(s).replace(/[^A-Z ]/g, "").split(/\s+/).filter((w) => w && !["DON", "DONA", "D", "DNA"].includes(w)); const A = n(a), B = n(b);
  if (A.length < 2 || B.length < 2) return false;
  const [C, Lg] = A.length <= B.length ? [A, B] : [B, A];
  let i = 0; for (const w of Lg) if (w === C[i]) i++; if (i === C.length) return true;
  if (A.length === B.length && A.length >= 3 && [...A].sort().join(" ") === [...B].sort().join(" ")) return true; // «Tébar Rosado Eduardo» (apellidos y nombre) = «Eduardo Tébar Rosado»
  if (A[0] === B[0]) { const a2 = A.slice(-2), b2 = B.slice(-2); if (a2[0] === b2[0] || a2[1] === b2[1]) return true; }
  // Error de lectura de un solo carácter («Armen» por «Carmen»), nunca una variante de género («Luis»/«Luisa») ni nombres cortos distintos («Ana»/«Eva»)
  const sa = A.join(" "), sb = B.join(" "); if (sa.length < 10 || sb.length < 10 || lecLev(sa, sb) !== 1) return false;
  return !(A[0] !== B[0] && (A[0] + "A" === B[0] || B[0] + "A" === A[0]));
};
// Misma dirección: comparten el nombre de la vía (una palabra de 4 letras o más que no sea genérica) y el número del portal («número doce» = 12)
const LEC_DIR_STOP = new Set(["CALLE", "AVENIDA", "PLAZA", "PASEO", "CAMINO", "NUMERO", "PLANTA", "EDIFICIO", "VIVIENDA", "SITO", "SITA", "PISO", "PUERTA", "ESCALERA", "TIPO", "LETRA", "BAJO", "BAJA", "LOCAL", "PLAZA", "GARAJE", "SOTANO", "URBANA", "FINCA", "DESDE", "ENTRE", "PORTAL", "BLOQUE", "TERCERA", "SEGUNDA", "PRIMERA", "CUARTA", "QUINTA", "ENTRADA", "IZQUIERDA", "DERECHA", "CENTRO", "COMERCIAL", "APARTAMENTO", "DUPLEX", "ATICO"]);
function lecMismaDireccion(a, b) {
  const prep = (s) => { let t = lecN(s).replace(/\b(?:ES|PL|PT|BL|PTA)\s*:\s*-?\w+/g, " "); t = t.replace(/\bNUMERO\s+([A-Z]+(?:\s+Y\s+[A-Z]+)?)/g, (m, w) => { const v = lecPalabrasNumero(w); return v ? " " + v + " " : m; }); return t; };
  const A = prep(a), B = prep(b);
  const pal = (t) => new Set(t.split(/[^A-Z]+/).filter((w) => w.length >= 4 && !LEC_DIR_STOP.has(w)));
  const nums = (t) => new Set([...t.matchAll(/(?<![\d.,])(\d{1,4})(?![\d.,])/g)].map((m) => Number(m[1])));
  const pa = pal(A), pb = pal(B), na = nums(A), nb = nums(B);
  return [...pa].some((w) => pb.has(w)) && [...na].some((n) => nb.has(n));
}
// Mismo producto financiero (fondo, acciones) visto en dos documentos (certificado del banco y datos fiscales): misma entidad y una palabra distintiva común
const LEC_PROD_STOP = new Set(["FONDO", "FONDOS", "INVERSION", "ACCIONES", "VALORES", "CARTERA", "RENTA", "FIJA", "VARIABLE", "PLAN", "PLANES", "PENSIONES", "BANCO", "CUENTA", "DEPOSITO", "PLAZO", "CLASE", "PARTICIPACIONES", "TITULOS", "ENTIDAD", "SICAV", "EURO", "EUROS", "MESES"]);
function lecMismoProducto(a, b) {
  if (!a || !b || a.tipo !== "valores" || b.tipo !== "valores") return false;
  const ent = (q) => lecN(q.entidad || "").split(/\s+/)[0]; if (ent(a) && ent(b) && ent(a) !== ent(b)) return false;
  const pal = (q) => new Set(lecN(q._desc || q.descripcion || "").split(/[^A-Z0-9]+/).filter((w) => w.length >= 4 && !LEC_PROD_STOP.has(w) && w !== ent(q)));
  const A = pal(a), B = pal(b); return [...A].some((w) => B.has(w));
}
function lecPropuestas(x, R) {
  const P = []; let id = 0; const nuevas = []; // personas propuestas por un documento anterior (para fundir el DNI o el parentesco que aporte otro)
  const addP = (p) => { p.id = "lp" + (++id); p.on = p.conf >= 1; P.push(p); return p; }; let add = addP;
  const vistos = new Map(); // campos ya propuestos: el mismo dato en dos documentos se funde; un valor distinto se marca como dudoso
  const nomsCausante = [x.nombre, ...R.flatMap((r) => r.datos.campos.filter((c) => c.k === "nombre").map((c) => c.valor))].filter(Boolean);
  const esCausante = (n) => nomsCausante.some((q) => lecMismoNombre(q, n));
  const viudo = x.civil === "viudo" || (!x.civil && R.some((r) => r.datos.campos.some((c) => c.k === "civil" && c.valor === "viudo")) && !R.some((r) => r.datos.campos.some((c) => c.k === "civil" && c.valor === "gananciales" && c.conf >= 2)));
  const arrs = []; // contratos de arrendamiento: se asocian a su inmueble al final, cuando ya se conocen todos
  const nuevosB = []; // bienes propuestos por un documento anterior (misma referencia catastral o mismo IBAN → se completan, no se repiten)
  const descP = (np) => `${np.nombre}${np.nif ? " · " + np.nif : ""}${np.edad ? " · " + np.edad + " años" : ""}${np.relacion ? " · " + (RELACIONES[np.relacion]?.label || np.relacion) : " · parentesco por indicar"}${np.estirpe ? " · desciende de " + np.estirpe : ""}${np.pct ? " · cuota " + np.pct + " %" : ""}${np.notaLegado ? " · legado: " + np.notaLegado.slice(0, 60) : ""}${np.nota ? " · " + np.nota : ""}`;
  const etiqP = (p) => p.legatario ? "Legatario" : p.relacion === "conyuge" ? "Cónyuge" : p.relacion === "hijo" ? "Hijo/a" : p.relacion && RELACIONES[p.relacion] ? RELACIONES[p.relacion].label : "Persona";
  for (const r of R) {
    const doc = r.nombre;
    for (const c of r.datos.campos) {
      const add = (p) => { p.k = c.k; p.valor = c.valor; const clave = JSON.stringify([c.k, c.valor]); const ya = vistos.get(clave); if (ya) { ya.doc += " + " + doc; ya.conf = Math.max(ya.conf, p.conf); ya.on = ya.on || p.on; if (p.confOrig != null) ya.confOrig = Math.max(ya.confOrig || 0, p.confOrig); if (p.manda) ya.manda = true; return ya; } const otro = [...vistos.values()].find((q) => q.k === c.k && q.k !== "testamentoDatos" && q.k !== "aseguradoras"); if (otro && c.k !== "testamento") { p.conf = 0; p.etiqueta += " (otro valor en " + doc + ")"; } const q = addP(p); vistos.set(clave, q); return q; };
      if (c.k === "nombre") { if (x.nombre && lecMismoNombre(x.nombre, c.valor)) continue; add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.mostrar || c.valor, conf: x.nombre ? 0 : c.conf, aplicar: (x) => { x.nombre = c.valor; } }); }
      else if (c.k === "fecha") { if (x.fecha === c.valor) continue; add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.mostrar || c.valor, conf: x.fecha && x.fecha !== c.valor ? 0 : c.conf, aplicar: (x) => { x.fecha = c.valor; } }); }
      else if (c.k === "civil") { if (x.civil === c.valor) continue; add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: x.civil ? 0 : c.conf, confOrig: c.conf, manda: !!c.manda, aplicar: (x) => { x.civil = c.valor; } }); }
      else if (c.k === "arrendamiento") arrs.push({ c, doc });
      else if (c.k === "planPensiones") add({ doc, grupo: "Seguros y previsión", etiqueta: c.etiqueta || "Plan de pensiones", mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.planesPensiones = (x.planesPensiones || []).filter((q) => JSON.stringify(q) !== JSON.stringify(c.valor)).concat([c.valor]); } });
      else if (c.k === "datosFiscales") add({ doc, grupo: "Impuestos", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.datosFiscales = { ...(x.datosFiscales || {}), ...c.valor }; } });
      else if (c.k === "nifCausante") add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.valor, conf: c.conf, aplicar: (x) => { x.nifCausante = c.valor; } });
      else if (c.k === "lugarFallecimiento") add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.valor, conf: c.conf, aplicar: (x) => { x.lugarFallecimiento = c.valor; } });
      else if (c.k === "testamento") { if (x.testamento === c.valor) continue; add({ doc, grupo: "Testamento", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: x.testamento && x.testamento !== "nose" ? 0 : c.conf, aplicar: (x) => { x.testamento = c.valor; lecRepartirIguales(x, c); }, repartir: (x) => lecRepartirIguales(x, c) }); }
      else if (c.k === "testamentoDatos") add({ doc, grupo: "Testamento", etiqueta: "Notaría y fecha del testamento", mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.testamentoDatos = { ...(x.testamentoDatos || {}), ...c.valor }; } });
      else if (c.k === "testamentoFecha") add({ doc, grupo: "Testamento", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.testamentoDatos = { ...(x.testamentoDatos || {}), fecha: c.valor }; } });
      else if (c.k === "testamentoNotario") add({ doc, grupo: "Testamento", etiqueta: c.etiqueta, mostrar: c.valor, conf: c.conf, aplicar: (x) => { x.testamentoDatos = { ...(x.testamentoDatos || {}), notario: c.valor }; } });
      else if (c.k === "aseguradoras") add({ doc, grupo: "Seguros", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.aseguradoras = c.valor; x.situ = x.situ || {}; if (c.valor.length) x.situ.seguro_vida = true; } });
      else if (c.k === "cargas" && c.valor === "libre") add({ doc, grupo: "Inmuebles", etiqueta: "Cargas", mostrar: c.mostrar, conf: c.conf, aplicar: () => {} });
      else if (c.k === "situ") add({ doc, grupo: c.grupo || "Situación", etiqueta: c.etiqueta, mostrar: c.mostrar || "", conf: c.conf, aplicar: (x) => { x.situ = x.situ || {}; x.situ[c.valor] = true; } });
      else if (c.k && /^exp\./.test(c.k)) { const campo = c.k.slice(4); if (x[campo] === c.valor) continue; add({ doc, grupo: c.grupo || "Causante", etiqueta: c.etiqueta || campo, mostrar: c.mostrar || String(c.valor), conf: x[campo] ? 0 : c.conf, aplicar: (x) => { x[campo] = c.valor; } }); }
      else if (c.k === "actaHerederos") add({ doc, grupo: "Testamento", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.actaHerederos = { ...(x.actaHerederos || {}), ...c.valor }; } });
      else if (c.k === "matrimonioFecha") add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.matrimonioFecha = c.valor; } });
      else if (c.k === "domicilio") { if (x.domicilioCausante && lecMismoNombre(x.domicilioCausante, c.valor)) continue; add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.mostrar || c.valor, conf: x.domicilioCausante ? 0 : c.conf, aplicar: (x) => { x.domicilioCausante = c.valor; } }); }
      else if (c.k === "residencia") add({ doc, grupo: "Causante", etiqueta: c.etiqueta, mostrar: c.mostrar || c.valor, conf: c.conf, aplicar: (x) => { x.municipioCausante = c.valor; } });
      else if (c.k === "poliza") add({ doc, grupo: "Seguros", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { const A = Array.isArray(x.aseguradoras) ? x.aseguradoras : []; if (!A.some((a) => (a && a.poliza && a.poliza === c.valor.poliza) || (typeof a === "string" && lecMismoNombre(a, c.valor.entidad)))) A.push(c.valor); x.aseguradoras = A; x.situ = x.situ || {}; x.situ.seguro_vida = true; } });
      else if (c.k === "aseguradoNombre") { if (nomsCausante.length && !esCausante(c.valor)) addP({ doc, grupo: "Seguros", etiqueta: "Asegurado distinto del causante", mostrar: `${c.valor}: comprueba que la póliza sea la del causante y no la de otro familiar`, conf: 0, aplicar: () => {} }); }
      else if (c.k === "titularVehiculo") { if (nomsCausante.length && !esCausante(c.valor)) addP({ doc, grupo: "Vehículos", etiqueta: "Titular distinto del causante", mostrar: `${c.valor}: el permiso de circulación no está a nombre del causante; comprueba si el vehículo es suyo (ganancial) o de otra persona`, conf: 0, aplicar: () => {} }); }
      else if (c.k === "isdPresentado") add({ doc, grupo: "Impuestos", etiqueta: c.etiqueta, mostrar: c.mostrar, conf: c.conf, aplicar: (x) => { x.isdPresentados = (x.isdPresentados || []).filter((q) => JSON.stringify(q) !== JSON.stringify(c.valor)).concat([c.valor]); } });
    }
    add = addP;
    for (let p of r.datos.personas) {
      // Libro de familia o certificado de matrimonio: los dos cónyuges van marcados; el que no es el causante es el cónyuge. Si no se sabe quién es el causante, queda dudoso
      if (p.pareja) { const otro = r.datos.personas.find((q) => q.pareja && q !== p); if (!(otro && esCausante(otro.nombre))) p = { ...p, conf: 0, nota: "¿cónyuge del causante o el propio causante?" }; }
      // Certificado de nacimiento: el inscrito es hijo si uno de los progenitores es el causante; si el inscrito es el causante, sus padres son ascendientes (si viven)
      if (p.inscrito) { const padres = r.datos.personas.filter((q) => q.progenitor); if (padres.some((q) => esCausante(q.nombre))) p = { ...p, relacion: "hijo", conf: 2 }; }
      if (p.progenitor) { const ins = r.datos.personas.find((q) => q.inscrito); const padres = r.datos.personas.filter((q) => q.progenitor); if (ins && esCausante(ins.nombre)) p = { ...p, relacion: "padre", conf: 0, nota: "progenitor del causante: solo hereda si vive y no hay descendientes" }; else if (padres.some((q) => esCausante(q.nombre))) p = viudo ? { ...p, relacion: "conyuge", conf: 0, nota: "otro progenitor del inscrito; el causante consta viudo/a, así que habrá fallecido antes" } : { ...p, relacion: "conyuge", conf: 1, nota: "otro progenitor del inscrito: cónyuge del causante si siguen casados" }; else p = { ...p, relacion: "", conf: 0 }; }
      if (p.pareja && p.conf > 0 && viudo) p = { ...p, conf: 0, nota: "el causante consta viudo/a: este cónyuge habrá fallecido antes (no hay viudo con derechos)" };
      if (esCausante(p.nombre)) { if (p.nif && !x.nifCausante && !P.some((q) => q.grupo === "Causante" && q.etiqueta === "DNI del causante")) add({ doc, grupo: "Causante", etiqueta: "DNI del causante", mostrar: p.nif, conf: 1, aplicar: (x) => { x.nifCausante = p.nif; } }); continue; }
      const ex = (x.personas || []).find((q) => lecMismoNombre(q.nombre, p.nombre));
      if (ex) {
        const cambios = {}; if (p.nif && !ex.nif) cambios.nif = p.nif; if (p.edad && !ex.edad) cambios.edad = p.edad; if (p.relacion && (!ex.relacion || ex.relacion === "extrano") && p.relacion !== "extrano") cambios.relacion = p.relacion; if (p.estirpe && !ex.estirpe) cambios.estirpe = p.estirpe;
        if (Object.keys(cambios).length) add({ doc, grupo: "Personas", etiqueta: `Completar a ${ex.nombre}`, mostrar: Object.entries(cambios).map(([k, v]) => `${({ nif: "NIF", edad: "edad", relacion: "parentesco", estirpe: "desciende de" })[k]}: ${k === "relacion" ? RELACIONES[v]?.label || v : v}`).join(" · "), conf: p.conf, aplicar: (x) => { const q = x.personas.find((z) => z.id === ex.id); if (q) Object.assign(q, cambios); } });
        continue;
      }
      const ya = nuevas.find((q) => lecMismoNombre(q.np.nombre, p.nombre));
      if (ya) { const np = ya.np; if (p.nif && !np.nif) np.nif = p.nif; if (p.edad && !np.edad) np.edad = p.edad; if (p.estirpe && !np.estirpe) np.estirpe = p.estirpe; if (p.pct && !np.pct) np.pct = p.pct; if (p.relacion && !np.relacion) { np.relacion = p.relacion; ya.prop.conf = Math.max(ya.prop.conf, p.conf); ya.prop.on = true; ya.prop.etiqueta = etiqP(p); } else if (p.relacion && p.relacion === np.relacion && p.conf > ya.prop.conf) { ya.prop.conf = p.conf; ya.prop.on = true; } ya.prop.mostrar = descP(np); ya.prop.doc += " + " + doc; continue; }
      if (p.rol === "titular registral") { if (x.nombre && lecMismoNombre(x.nombre, p.nombre)) continue; add({ doc, grupo: "Personas", etiqueta: "Titular registral que no está en el expediente", mostrar: `${p.nombre}${p.nif ? " · " + p.nif : ""}: ¿cotitular, cónyuge o el propio causante con otro nombre?`, conf: 0, aplicar: (x) => { x.personas.push({ id: uid(), nombre: p.nombre, nif: p.nif || "", relacion: "extrano", edad: "", origen: "documento" }); } }); continue; }
      const rel = p.relacion || "";
      const np = { nombre: p.nombre, relacion: rel, edad: p.edad || "", nif: p.nif || "", ...(p.legadoDesc ? { notaLegado: p.legadoDesc } : {}), ...(p.estirpe ? { estirpe: p.estirpe } : {}), ...(p.pct ? { pct: p.pct } : {}), ...(p.nota ? { nota: p.nota } : {}) };
      const prop = add({ doc, grupo: "Personas", etiqueta: etiqP(p), mostrar: descP(np), conf: rel ? p.conf : 0, aplicar: (x) => { x.personas.push({ id: uid(), nombre: np.nombre, relacion: np.relacion || "extrano", edad: np.edad || "", nif: np.nif || "", origen: "documento", ...(np.notaLegado ? { notaLegado: np.notaLegado } : {}), ...(np.estirpe ? { estirpe: np.estirpe } : {}), ...(np.pct && x.testamento === "porcentajes" ? { pct: np.pct } : {}) }); } });
      nuevas.push({ np, prop });
    }
    for (let b of r.datos.bienes) {
      // Escritura de herencia anterior: solo vale como título si el adjudicatario fue el hoy causante
      if (b.tituloHerencia && b.adjudicatario) { if (nomsCausante.length && !esCausante(b.adjudicatario)) b = { ...b, conf: 0, nota: `adjudicado a ${b.adjudicatario}, que no es el causante` }; else if (!nomsCausante.length) b = { ...b, conf: Math.min(b.conf, 1), nota: `adjudicado a ${b.adjudicatario}` }; }
      // Nota simple con el derecho de cada titular: si el causante solo era usufructuario, el bien no entra en la herencia; si tenía la nuda propiedad o una cuota, se anota
      if (Array.isArray(b.titulares) && b.titulares.length) {
        const tc = b.titulares.find((q) => esCausante(q.nombre));
        if (tc) {
          b = { ...b }; if (tc.derecho === "usufructo") { b.conf = 0; b.soloUsufructo = true; } else if (tc.derecho === "nuda") { b.cargas = [b.cargas, "nuda propiedad del causante (usufructo ajeno vigente)"].filter(Boolean).join(" · "); }
          const dosMitades = b.titulares.length === 2 && b.titulares.every((q) => q.pct === 50); const otro = b.titulares.find((q) => q !== tc);
          if (tc.pct != null && tc.pct < 100 && b.titularidad !== "ganancial") { if (dosMitades && !b.titularidad && (x.personas || []).concat(R.flatMap((r) => r.datos.personas)).some((q) => q.relacion === "conyuge" && lecMismoNombre(q.nombre, otro.nombre))) b.nota = `50 % con ${otro.nombre} (cónyuge): si el matrimonio es en gananciales, el bien es ganancial`; else { b.titularidad = "proindiviso"; b.porcentaje = tc.pct; } } else if (tc.pct === 100 && b.titularidad === "proindiviso") { b.titularidad = "privativo"; b.porcentaje = null; }
        }
        else if (!nomsCausante.length && b.titulares.some((q) => q.derecho === "usufructo")) b = { ...b, conf: Math.min(b.conf, 1) };
      }
      // Participaciones sociales: la parte del causante sale de la lista de socios; el valor, del patrimonio neto del último balance si consta
      if (Array.isArray(b.socios)) { const tc = b.socios.find((q) => esCausante(q.nombre)); if (tc) { const v = b.patrimonioNeto && tc.pct ? Math.round(b.patrimonioNeto * tc.pct) / 100 : null; b = { ...b, descripcion: `${tc.titulos ? String(tc.titulos).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " " : ""}${b.descripcion.charAt(0).toLowerCase() + b.descripcion.slice(1)}${tc.pct != null ? " (" + String(tc.pct).replace(".", ",") + " %)" : ""}`, valor: v, ...(v ? { valorFuente: `valor teórico: ${String(tc.pct).replace(".", ",")} % del patrimonio neto${b.ejercicioPN ? " de " + b.ejercicioPN : ""}`, prioValor: 2 } : {}), nota: v ? "" : "sin valor: pide el último balance aprobado", conf: 1 }; } else b = { ...b, conf: 0, nota: nomsCausante.length ? "el causante no figura entre los socios leídos" : "no se sabe qué socio es el causante" }; }
      const ex = (x.bienes || []).find((q) => (b.refCatastral && q.refCatastral && q.refCatastral === b.refCatastral) || (b.matricula && q.matricula && lecN(q.matricula).replace(/[\s-]/g, "") === lecN(b.matricula).replace(/[\s-]/g, "")) || (b.iban && q.iban && q.iban === b.iban) || (b.descripcion && q.descripcion && lecMismoNombre(q.descripcion, b.descripcion) && (q.tipo === "vivienda" || q.tipo === "inmueble")));
      const campos = {}; for (const k of ["refCatastral", "valorCatastralTotal", "valorCatastralSuelo", "valorReferencia", "fechaAdq", "valorAdq", "porcentaje", "cargas", "iban", "entidad", "matricula", "marca", "modelo", "fechaMatriculacion", "fincaRegistral", "cru", "registro", "superficie", "rustico", "poligono", "parcela", "valorCatastralSueloRustico", "tituloAdq", "isin", "nifSociedad", "valorFuente", "arrendadoOCedido"]) if (b[k] != null && b[k] !== "") campos[k] = b[k];
      if (b.titularidad) campos.titularidad = b.titularidad;
      if (b.usoResidencial != null && b.tipo !== "cuenta") campos.usoResidencial = b.usoResidencial;
      const resumen = [b.refCatastral ? "ref. catastral " + b.refCatastral : "", b.matricula ? "matrícula " + b.matricula : "", b.valorCatastralTotal ? "valor catastral " + eur0(b.valorCatastralTotal) : "", b.valorCatastralSuelo ? "suelo " + eur0(b.valorCatastralSuelo) : "", b.valorReferencia ? "valor de referencia " + eur0(b.valorReferencia) + (b.anioValorReferencia ? " (" + b.anioValorReferencia + ")" : "") : "", (b.tipo === "vivienda" || b.tipo === "inmueble") && !b.valor && !b.valorReferencia ? "SIN VALOR: anótalo" : "", b.titularidad ? b.titularidad + (b.porcentaje ? " " + b.porcentaje + " %" : "") : b.cotitular ? "con cotitular" + (b.porcentaje ? " (" + b.porcentaje + " % del causante)" : "") : "", b.fechaAdq ? "adquirido " + fechaCorta(b.fechaAdq) : "", b.valorAdq ? "por " + eur0(b.valorAdq) : "", b.cargas || "", b.muniNombre ? b.muniNombre + (b.muniProv ? " (" + b.muniProv + ")" : "") : "", b.soloUsufructo ? "el causante solo era usufructuario: el usufructo se extingue y no entra en la herencia" : "", b.nota || ""].filter(Boolean).join(" · ");
      // El importe va aparte: si otro documento trae un valor de más prioridad (banco a la fecha del fallecimiento, valor de referencia), sustituye al anterior
      const valTxt = b.valor && !b.valorReferencia ? eur0(b.valor) + (b.valorFuente ? " (" + b.valorFuente + ")" : "") + (b.notaValor ? " · " + b.notaValor : "") : "";
      const mat = (v) => lecN(v || "").replace(/[\s-]/g, "");
      const fin4 = (q) => (q.iban ? String(q.iban).slice(-4) : q.ibanFin || ""), ent1 = (q) => lecN(q.entidad || "").split(/\s+/)[0];
      const mismaCuenta = (a, c) => a.tipo === "cuenta" && c.tipo === "cuenta" && fin4(a) && fin4(a) === fin4(c) && ent1(a) && ent1(a) === ent1(c) && (!a.iban || !c.iban || a.iban === c.iban);
      const yaB = nuevosB.find((q) => (b.refCatastral && q.nb.refCatastral === b.refCatastral) || (b.iban && q.nb.iban === b.iban) || mismaCuenta(q.nb, b) || (b.matricula && q.nb.matricula && mat(q.nb.matricula) === mat(b.matricula)) || (b.isin && q.nb.isin === b.isin) || lecMismoProducto(q.nb, b));
      if (!ex && yaB) { const nb = yaB.nb; for (const [k, v] of Object.entries(campos)) if (nb[k] == null || nb[k] === "" || nb[k] === 0) nb[k] = v; let cambiaValor = false; if (b.valor && (!nb.valor || (b.prioValor || 2) > (nb._prio || 2))) { nb.valor = b.valor; nb._prio = b.prioValor || 2; nb.valorFuente = b.valorFuente || ""; cambiaValor = true; } if (b.rustico) { nb.rustico = true; nb.tipo = "inmueble"; nb.usoResidencial = false; if (nb.valorCatastralSuelo) { nb.valorCatastralSueloRustico = nb.valorCatastralSuelo; delete nb.valorCatastralSuelo; } } if (nb.rustico && nb.valorCatastralSuelo) { nb.valorCatastralSueloRustico = nb.valorCatastralSuelo; delete nb.valorCatastralSuelo; } if (b.muniNombre && !nb.muniNombre && !nb.muniIne) { nb._muni = [b.muniNombre, b.muniProv]; } if (b.tipo === "vivienda" && nb.tipo === "inmueble") nb.tipo = "vivienda"; if (/^(Finca registral|Inmueble)/.test(nb.descripcion || "") && b.descripcion && !/^(Finca registral|Inmueble)/.test(b.descripcion)) nb.descripcion = b.descripcion; let m0 = yaB.prop.mostrar; if (cambiaValor && yaB.prop._valTxt) m0 = m0.replace(" · " + yaB.prop._valTxt, ""); const vistosF = new Set(); yaB.prop.mostrar = (m0 + " · " + resumen + (cambiaValor && valTxt ? " · " + valTxt : "")).split(" · ").filter((f) => { const k = lecN(f).trim(); if (!k || vistosF.has(k)) return false; vistosF.add(k); return true; }).join(" · "); if (cambiaValor) yaB.prop._valTxt = valTxt; yaB.prop.doc += " + " + doc; yaB.prop.conf = Math.max(yaB.prop.conf, b.conf); yaB.prop.on = yaB.prop.conf >= 1; continue; }
      if (ex) { const nuevos = Object.fromEntries(Object.entries(campos).filter(([k, v]) => ex[k] == null || ex[k] === "" || ex[k] === 0)); if (b.valor && !(Number(ex.valor) > 0)) nuevos.valor = b.valor; if (!Object.keys(nuevos).length) continue; add({ doc, grupo: "Inmuebles", etiqueta: `Completar «${ex.descripcion || "inmueble"}»`, mostrar: [resumen, nuevos.valor ? valTxt : ""].filter(Boolean).join(" · "), conf: b.conf, aplicar: (x) => { const q = x.bienes.find((z) => z.id === ex.id); if (q) { Object.assign(q, nuevos); if (b.muniNombre && !q.muniIne) lecMunicipio(q, b.muniNombre, b.muniProv); } } }); continue; }
      const esInm = b.tipo === "vivienda" || b.tipo === "inmueble";
      const nb = { tipo: b.tipo, descripcion: b.descripcion, valor: b.valor || "", titularidad: b.titularidad || "", ...campos, _muni: b.muniNombre ? [b.muniNombre, b.muniProv] : null, _prio: b.prioValor || 2, _desc: b.descripcion, _doc: doc };
      const grupoB = esInm ? "Inmuebles" : b.tipo === "vehiculo" ? "Vehículos" : b.tipo === "cuenta" || b.tipo === "valores" ? "Cuentas y valores" : b.tipo === "empresa" ? "Empresas y participaciones" : "Otros bienes";
      const etiqB = esInm ? (b.rustico ? "Finca rústica" : b.tipo === "vivienda" ? "Vivienda" : "Inmueble") : b.tipo === "valores" ? (/plan de pensiones/i.test(b.descripcion) ? "Plan de pensiones" : "Fondos o valores") : b.tipo === "vehiculo" ? "Vehículo" : b.tipo === "cuenta" ? "Cuenta" : b.tipo === "empresa" ? "Participaciones sociales" : "Bien";
      const prop = add({ doc, grupo: grupoB, etiqueta: etiqB, mostrar: `${b.descripcion}${resumen ? " · " + resumen : ""}${valTxt ? " · " + valTxt : ""}`, conf: b.conf, aplicar: (x) => { const { _muni, _prio, _desc, _doc, ...resto } = nb; const fin = { id: uid(), ...resto, titularidad: resto.titularidad || (x.civil === "gananciales" ? "ganancial" : b.porcentaje && b.porcentaje < 100 ? "proindiviso" : "privativo"), origen: "documento" }; if (fin.titularidad !== "proindiviso") delete fin.porcentaje; if (_muni) lecMunicipio(fin, _muni[0], _muni[1]); x.bienes.push(fin); lecDocsBien(x, fin, prop.doc.split(" + ").map((n) => (R.find((r) => r.nombre === n) || {}).tipo)); } });
      prop._valTxt = valTxt; if (b.ibanFin && !nb.iban) nb.ibanFin = b.ibanFin;
      nuevosB.push({ nb, prop });
    }
    for (const g of r.datos.gastos || []) add({ doc, grupo: "Gastos", etiqueta: g.etiqueta || "Gasto deducible", k: "gasto", mostrar: `${g.concepto}${g.importe ? " · " + eur0(g.importe) : " (importe por confirmar)"}${g.nota ? ". " + g.nota : ""}`, conf: g.conf == null ? 1 : g.conf, aplicar: (x) => { x.gastos = x.gastos || []; x.gastos.push({ concepto: g.concepto, importe: g.importe || "", origen: "documento" }); } });
    for (const d of r.datos.deudas) add({ doc, grupo: "Deudas", etiqueta: d.fuente === "banco" ? (d.hipoteca ? "Préstamo hipotecario (saldo del banco)" : "Préstamo") : "Deuda", k: "deuda", deuda: d, mostrar: `${d.concepto}${d.importe ? " · " + eur0(d.importe) : " (importe por confirmar)"}${d.ganancial ? " · deuda ganancial (la herencia responde de la mitad)" : ""}${d.nota ? ". " + d.nota : ""}`, conf: d.conf, aplicar: (x) => { x.deudas = x.deudas || []; x.deudas.push({ concepto: d.concepto, importe: d.importe || "", ...(d.ganancial ? { ganancial: true } : {}), origen: "documento" }); } });
  }
  // Comunidad autónoma del impuesto: si el expediente no la tiene, se propone por el lugar del fallecimiento (o, en su defecto, por el primer inmueble)
  if (!x.ccaa && typeof muniDesdeTexto === "function" && typeof MUNI_ES === "object") {
    const res = P.find((p) => p.k === "residencia"); const lug = P.find((p) => p.k === "lugarFallecimiento"); const inm = R.flatMap((r) => r.datos.bienes).find((b) => b.muniNombre);
    const ine = (res && (muniDesdeTexto(res.valor) || muniDesdeTexto(String(res.valor).replace(/\s*\(.*$/, "")))) || (lug && muniDesdeTexto(lug.mostrar)) || (inm && (muniDesdeTexto(inm.muniProv ? `${inm.muniNombre} (${inm.muniProv})` : inm.muniNombre)));
    const pv = ine && MUNI_ES.provincias[String(ine).slice(0, 2)];
    const porRes = res && (muniDesdeTexto(res.valor) || muniDesdeTexto(String(res.valor).replace(/\s*\(.*$/, "")));
    if (pv && pv.ccaa && (typeof TERRITORIOS !== "object" || TERRITORIOS.some((t) => t[0] === pv.ccaa))) addP({ doc: porRes ? res.doc : lug ? lug.doc : (inm ? R.find((r) => r.datos.bienes.includes(inm)).nombre : ""), grupo: "Causante", etiqueta: "Comunidad autónoma del impuesto", mostrar: `${typeof nombreTerr === "function" ? nombreTerr(pv.ccaa) : pv.ccaa} (por ${porRes ? "el municipio de residencia del padrón" : lug ? "el lugar del fallecimiento" : "el municipio del inmueble"}; lo que cuenta es la residencia habitual del causante${porRes ? "" : ", que acredita el certificado de empadronamiento"})`, conf: porRes ? 2 : lug ? 1 : 0, k: "ccaa", valor: pv.ccaa, aplicar: (x) => { if (!x.ccaa) x.ccaa = pv.ccaa; } });
  }
  // Si el banco certifica el capital pendiente de la hipoteca, la responsabilidad hipotecaria de la nota simple queda sin marcar
  const dB = P.filter((p) => p.k === "deuda" && p.deuda.fuente === "banco" && p.deuda.hipoteca);
  if (dB.length) for (const p of P.filter((q) => q.k === "deuda" && q.deuda.fuente !== "banco" && /^Hipoteca/.test(q.deuda.concepto))) { if (dB.some((q) => !q.deuda.banco || lecN(p.deuda.concepto).includes(lecN(q.deuda.banco).split(" ")[0]))) { p.conf = 0; p.on = false; p.etiqueta = "Hipoteca según la nota simple (el banco ya certifica el saldo real: no cargar las dos)"; } }
  // Contratos de arrendamiento: el inmueble alquilado queda marcado (no es vivienda habitual ni cuenta para su reducción) y se anota el contrato
  const igualInm = (v, b) => (v.refCatastral && b.refCatastral === v.refCatastral) || (!v.refCatastral || !b.refCatastral) && v.direccion && lecMismaDireccion(v.direccion, b._desc || b.descripcion || "");
  for (const { c, doc } of arrs) {
    const v = c.valor;
    if (v.arrendatario && esCausante(v.arrendatario)) { addP({ doc, grupo: "Inmuebles", etiqueta: "El causante vivía de alquiler", mostrar: `${c.mostrar}. El inmueble no es de la herencia. Su cónyuge, pareja o los familiares que convivían con él pueden subrogarse en el contrato (art. 16 LAU) si lo comunican al arrendador en tres meses; la fianza que pagó es un crédito de la herencia cuando se devuelva.`, conf: 0, aplicar: () => {} }); continue; }
    const q = nuevosB.find((q) => (q.nb.tipo === "vivienda" || q.nb.tipo === "inmueble") && igualInm(v, q.nb)); const e = !q && (x.bienes || []).find((b) => (b.tipo === "vivienda" || b.tipo === "inmueble") && igualInm(v, b));
    if (q) { q.nb.arrendadoOCedido = true; if (q.nb.tipo === "vivienda") { q.nb.tipo = "inmueble"; q.nb.usoResidencial = true; q.prop.etiqueta = "Inmueble (arrendado)"; } q.prop.mostrar += " · arrendado"; q.prop.doc += " + " + doc; }
    const dest = q ? q.nb.descripcion : e ? e.descripcion : "";
    addP({ doc, grupo: "Inmuebles", etiqueta: "Contrato de arrendamiento", k: "arrendamiento", mostrar: `${c.mostrar}${dest ? " · inmueble: " + dest.slice(0, 70) : " · no se ha podido asociar a ningún inmueble del expediente: márcalo como arrendado en su ficha"}`, conf: q || e ? c.conf : 0, aplicar: (x) => { const b = (x.bienes || []).find((b) => (b.tipo === "vivienda" || b.tipo === "inmueble") && igualInm(v, b)); if (!b) return; b.arrendadoOCedido = true; if (b.tipo === "vivienda") { b.tipo = "inmueble"; b.usoResidencial = true; } b.arrendamiento = { arrendatario: v.arrendatario || "", renta: v.renta || "", fianza: v.fianza || "", fecha: v.fecha || "" }; } });
  }
  // Una sola vivienda habitual: la que coincide con el domicilio del padrón (o, si no hay domicilio, la primera no arrendada). Las demás viviendas pasan a «otro inmueble» de uso residencial
  {
    const viv = nuevosB.filter((q) => q.nb.tipo === "vivienda"); const yaHay = (x.bienes || []).some((b) => b.tipo === "vivienda");
    if (viv.length > 1 || (viv.length && yaHay)) {
      const dom = String((P.find((p) => p.k === "domicilio") || {}).valor || x.domicilioCausante || "");
      const elegida = yaHay ? null : viv.find((q) => dom && lecMismaDireccion(dom, q.nb._desc || q.nb.descripcion)) || viv[0];
      for (const q of viv) if (q !== elegida) { q.nb.tipo = "inmueble"; q.nb.usoResidencial = true; q.prop.etiqueta = "Inmueble (vivienda que no es la habitual)"; }
      if (elegida && dom && lecMismaDireccion(dom, elegida.nb._desc || elegida.nb.descripcion)) elegida.prop.mostrar += " · vivienda habitual (coincide con el domicilio del padrón)";
    }
  }
  // Valor de los inmuebles: el aviso «sin valor de referencia» de un documento sobra si otro lo aporta; los que siguen sin valor se señalan
  const conValor = (ref) => nuevosB.some((q) => q.nb.refCatastral === ref && Number(q.nb.valor) > 0) || (x.bienes || []).some((b) => b.refCatastral === ref && Number(b.valor) > 0);
  for (const r of R) r.datos.avisos = r.datos.avisos.filter((a) => { const m = /\(ref\. ([0-9A-Z]{20})\): (?:el Catastro indica|el documento no trae)/.exec(a); return !(m && conValor(m[1])); });
  for (const q of nuevosB) { if (Number(q.nb.valor) > 0) q.prop.mostrar = q.prop.mostrar.replace(/ · SIN VALOR: anótalo/g, ""); }
  const sinValor = nuevosB.filter((q) => (q.nb.tipo === "vivienda" || q.nb.tipo === "inmueble") && !(Number(q.nb.valor) > 0));
  if (sinValor.length) addP({ doc: [...new Set(sinValor.map((q) => q.prop.doc.split(" + ")[0]))].join(" + "), grupo: "Falta por completar", etiqueta: sinValor.length === 1 ? "Inmueble sin valor" : `${sinValor.length} inmuebles sin valor`, mostrar: `${sinValor.map((q) => (q.nb._desc || q.nb.descripcion || "").slice(0, 50)).join("; ")}: ningún documento trae el valor de referencia del Catastro ni otro valor. Quedan en blanco: anota el valor antes de calcular (sin él no suman en Sucesiones y la plusvalía sale como no sujeta).`, conf: 0, aplicar: () => {} });
  // Préstamos: si el banco certifica el capital pendiente, el principal inicial de la escritura queda sin marcar
  const dCert = P.filter((p) => p.k === "deuda" && p.deuda.fuente === "banco");
  for (const p of P.filter((q) => q.k === "deuda" && q.deuda.fuente === "escritura")) if (dCert.some((q) => !q.deuda.banco || !p.deuda.banco || lecN(q.deuda.banco).split(" ")[0] === lecN(p.deuda.banco).split(" ")[0])) { p.conf = 0; p.on = false; p.etiqueta = "Préstamo según la escritura (el banco ya certifica el saldo pendiente: no cargar los dos)"; }
  // Régimen económico: lo pactado en capitulaciones manda; después, el régimen expreso del Registro Civil o del testamento; por último, el
  // «casado» de un certificado (que solo permite suponer gananciales). Si otro documento dice viudo/a o divorciado/a, el régimen no se usa
  const civ = P.filter((p) => p.k === "civil"); const CAS = (p) => p.valor === "gananciales" || p.valor === "separacion";
  const prio = (p) => (p.manda ? 3 : p.confOrig >= 2 ? 2 : 1);
  const otros = civ.filter((p) => !CAS(p));
  if (otros.length) for (const p of civ.filter(CAS)) { p.conf = 0; p.on = false; if (!/consta/.test(p.etiqueta)) p.etiqueta += ` (otro documento dice ${otros[0].valor === "viudo" ? "viudo/a" : otros[0].valor})`; }
  else if (civ.length > 1) {
    const max = Math.max(...civ.map(prio)); const top = civ.filter((p) => prio(p) === max); const vals = new Set(top.map((p) => p.valor));
    if (vals.size === 1) for (const p of civ) { const limpia = p.etiqueta.replace(/ \(otro valor en [^)]*\)$/, ""); if (prio(p) === max) { p.conf = x.civil && x.civil !== p.valor ? 0 : 2; p.on = p.conf >= 1; p.etiqueta = limpia; } else if (p.valor !== top[0].valor) { p.conf = 0; p.on = false; p.etiqueta = limpia + (max === 3 ? " (no se usa: manda el régimen pactado en capitulaciones)" : " (no se usa: otro documento indica el régimen de forma expresa)"); } }
  }
  // Si un documento dice «consta testamento» (últimas voluntades) y otro es el propio testamento, manda el testamento
  const tst = P.filter((p) => p.k === "testamento");
  if (tst.length > 1 && tst.some((p) => p.valor !== "nose")) for (const p of tst.filter((q) => q.valor === "nose")) P.splice(P.indexOf(p), 1);
  // Un expediente admite un solo cónyuge (I5): si ya lo tiene, o si los documentos proponen dos, los demás quedan sin marcar y se explica
  const yaCony = (x.personas || []).find((p) => p.relacion === "conyuge" && !p.separado);
  const conys = nuevas.filter((q) => q.np.relacion === "conyuge" && P.includes(q.prop)).sort((a, b) => b.prop.conf - a.prop.conf);
  conys.forEach((q, i) => { if (!yaCony && i === 0) return; q.prop.conf = 0; q.prop.on = false; q.prop.etiqueta += yaCony ? ` (el expediente ya tiene cónyuge: ${yaCony.nombre || "sin nombre"}; un expediente solo admite uno)` : ` (otro documento propone a ${conys[0].np.nombre} como cónyuge; un expediente solo admite uno)`; });
  return { docs: R, propuestas: P };
}
// ── ¿Documentos de herencias distintas? (I5) ──
// Cada documento que identifica al causante (nombre, DNI o fecha de fallecimiento) se agrupa con los compatibles: mismo DNI, o mismo nombre
// sin DNI distinto; la fecha sola solo une, nunca separa (puede estar mal leída). Los documentos sin causante (IBI, banco, DNI de un
// heredero…) van con el grupo cuyo causante o cuyos herederos aparecen en ellos; si ninguno, quedan «sin asignar».
// Devuelve { grupos: [{ nombre, nif, fecha, docs: [índices], exp }], sinAsignar: [índices] }. Más de un grupo = posible mezcla.
function lecCausantes(R, x) {
  const G = [];
  const val = (r, k) => ((r.datos.campos || []).find((c) => c.k === k) || {}).valor || "";
  const ident = (r) => ({ nombres: (r.datos.campos || []).filter((c) => c.k === "nombre" && c.valor).map((c) => c.valor), nif: val(r, "nifCausante"), fecha: val(r, "fecha") });
  if (x && (x.nombre || x.nifCausante)) G.push({ nombres: x.nombre ? [x.nombre] : [], nif: x.nifCausante || "", fecha: x.fecha || "", docs: [], exp: true, pers: (x.personas || []).map((p) => p.nombre).filter(Boolean) });
  const casa = (g, d) => {
    if (d.nif && g.nif) return d.nif === g.nif ? 2 : -1;
    if (d.nombres.length && g.nombres.length) return d.nombres.some((a) => g.nombres.some((b) => lecMismoNombre(a, b))) ? 2 : -1;
    return 0;
  };
  const sin = [];
  R.forEach((r, i) => {
    const d = ident(r);
    if (!d.nombres.length && !d.nif) { sin.push(i); return; }
    let g = G.find((q) => casa(q, d) === 2) || G.find((q) => casa(q, d) === 0 && d.fecha && q.fecha === d.fecha);
    if (!g) { g = { nombres: [], nif: "", fecha: "", docs: [], pers: [] }; G.push(g); }
    g.docs.push(i); for (const n of d.nombres) if (!g.nombres.some((q) => lecMismoNombre(q, n))) g.nombres.push(n);
    if (d.nif && !g.nif) g.nif = d.nif; if (d.fecha && !g.fecha) g.fecha = d.fecha;
  });
  const esDe = (g, n) => g.nombres.some((q) => lecMismoNombre(q, n));
  const persDe = (r) => [...(r.datos.personas || []).map((p) => p.nombre), ...(r.datos.bienes || []).flatMap((b) => (b.titulares || []).map((q) => q.nombre).concat(b.titular ? [b.titular] : [])), ...(r.datos.campos || []).filter((c) => /^(aseguradoNombre|titularVehiculo)$/.test(c.k)).map((c) => c.valor)].filter((n) => typeof n === "string" && n.trim());
  for (const g of G) for (const i of g.docs) for (const n of persDe(R[i])) if (!esDe(g, n)) g.pers.push(n);
  // Sin causante: primero por fecha de fallecimiento, después por el nombre del causante entre sus personas, después por sus herederos
  let cambio = true, pend = sin.slice();
  while (cambio && pend.length) {
    cambio = false;
    for (const i of pend.slice()) {
      const r = R[i], f = val(r, "fecha"), N = persDe(r);
      let C = f ? G.filter((g) => g.fecha === f) : [];
      if (C.length !== 1) C = G.filter((g) => N.some((n) => esDe(g, n)));
      if (C.length !== 1) C = G.filter((g) => N.some((n) => g.pers.some((q) => lecMismoNombre(q, n))));
      if (C.length === 1) { C[0].docs.push(i); for (const n of N) if (!esDe(C[0], n)) C[0].pers.push(n); pend.splice(pend.indexOf(i), 1); cambio = true; }
    }
  }
  const grupos = G.filter((g) => g.docs.length || g.exp).map((g) => ({ nombre: g.nombres[0] || "", nif: g.nif, fecha: g.fecha, docs: g.docs.sort((a, b) => a - b), exp: !!g.exp }));
  return { grupos, sinAsignar: pend.sort((a, b) => a - b) };
}
// Grupo que se queda en el expediente abierto: el del propio expediente o, si está vacío, el que tiene más documentos
const lecGrupoPrincipal = (C) => { const e = C.grupos.findIndex((g) => g.exp); return e >= 0 ? e : C.grupos.reduce((m, g, i, A) => (g.docs.length > A[m].docs.length ? i : m), 0); };
function lecExpVacio() {
  const D = despachoCfg();
  return { id: uid(), creado: hoy(), nombre: "", fecha: "", ccaa: D.ccaaDefecto || "", civil: "", testamento: "", personas: [], bienes: [], deudas: [], gastos: [], situ: {}, tramites: {}, ajuar: "sts", enPlazo: true, fase: "encargo", despacho: { ref: typeof nuevaRef === "function" ? nuevaRef() : "", cliente: "", alta: hoy() }, responsable: D.abogados[0]?.id, bitacora: [] };
}
// Decisión ante la mezcla: «separar» crea un expediente por cada otro causante (con sus documentos y sus propuestas, en la misma revisión);
// «quitar» saca de este expediente los documentos de un causante; «misma» da por buena la mezcla (mismo causante con datos distintos)
async function lecMezcla(accion, gi) {
  const Rs = LEC.resultado, C = Rs && Rs.causantes; if (!C) return;
  const x = DB.expedientes.find((q) => q.id === LEC.exp); if (!x) return;
  const pi = lecGrupoPrincipal(C), docs = Rs.docs;
  const idxPrin = [...C.grupos[pi].docs, ...C.sinAsignar];
  const archivados = (nombres) => (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d.expId === x.id && nombres.includes(d.nombre));
  if (accion === "misma") { Rs.causantes = { ...C, resuelto: "misma" }; render(); return; }
  if (accion === "quitar") {
    const g = C.grupos[gi]; if (!g || gi === pi) return;
    const fuera = g.docs.map((i) => docs[i].nombre);
    for (const d of archivados(fuera)) { try { await archivoBorrar(d.id); } catch (e) { console.error(e); } }
    const quedan = docs.filter((d, i) => !g.docs.includes(i));
    LEC.resultado = lecPropuestas(x, quedan); const C2 = lecCausantes(quedan, x); if (C2.grupos.length > 1) LEC.resultado.causantes = C2;
    anotar(x, `${plural(fuera.length, "documento quitado", "documentos quitados")} del expediente: eran de otra herencia (${g.nombre || "otro causante"})`, "doc"); guardar();
    if (typeof toast === "function") toast(`${plural(fuera.length, "documento quitado", "documentos quitados")} de este expediente`);
    render(); return;
  }
  if (accion === "separar") {
    const P = lecPropuestas(x, idxPrin.map((i) => docs[i])).propuestas; const nuevos = [];
    for (const [k, g] of C.grupos.entries()) {
      if (k === pi) continue;
      const y = lecExpVacio(); DB.expedientes.unshift(y);
      anotar(y, `Expediente creado al separar documentos de otra herencia (${g.nombre || "otro causante"}) leídos en ${x.despacho?.ref || nombreExp(x)}`, "doc");
      const mios = g.docs.map((i) => docs[i]);
      for (const d of archivados(mios.map((q) => q.nombre))) { try { await archivoCambiar(d.id, { expId: y.id }); } catch (e) { console.error(e); } }
      for (const q of lecPropuestas(y, mios).propuestas) { q.id = "s" + k + q.id; q.exp = y.id; P.push(q); }
      nuevos.push({ id: y.id, ref: y.despacho.ref, nombre: g.nombre });
    }
    anotar(x, `Documentos de ${plural(nuevos.length, "otra herencia", "otras herencias")} separados en ${nuevos.map((n) => n.ref).join(", ")}`, "doc"); guardar();
    LEC.resultado = { docs, propuestas: P, separados: nuevos, principal: C.grupos[pi].nombre };
    render(); return;
  }
}
// Lista de documentos del expediente (despacho.docs): lo que se ha leído queda como recibido
function lecDocsMarcar(x, ids) { if (!ids.length) return; x.despacho = x.despacho || {}; x.despacho.docs = x.despacho.docs || {}; for (const id of ids) x.despacho.docs[id] = true; }
function lecDocsBien(x, b, tipos) {
  const T = new Set(tipos.filter(Boolean)); const ids = [];
  if (b.tipo === "vivienda" || b.tipo === "inmueble") { if (T.has("notasimple") || T.has("compraventa") || T.has("herenciaprevia")) ids.push("esc_" + b.id); if (T.has("ibi")) ids.push("ibi_" + b.id); if (Number(b.valorReferencia) > 0) ids.push("vref_" + b.id); }
  if ((b.tipo === "cuenta" || b.tipo === "valores") && (T.has("bancario") || T.has("valores"))) ids.push("cert_" + b.id);
  if (b.tipo === "vehiculo" && T.has("vehiculo")) ids.push("veh_" + b.id);
  if (b.tipo === "empresa" && T.has("sociedad")) ids.push("emp_" + b.id);
  lecDocsMarcar(x, ids);
}
function lecMunicipio(b, nombre, prov) {
  if (typeof muniDesdeTexto !== "function") return;
  const ine = muniDesdeTexto(prov ? `${nombre} (${prov})` : nombre) || muniDesdeTexto(nombre);
  if (ine && typeof muniElegir === "function") muniElegir(b, ine); else b.muniNombre = b.muniNombre || nombre;
}
// Porcentajes iguales de un testamento «por partes iguales» (auditoría r5, H1). Se llama al aplicar la propuesta y otra vez al final de lecAplicar,
// porque las personas leídas del mismo testamento se cargan DESPUÉS que el reparto: antes quedaban sin porcentaje y el expediente salía con
// 0 herederos y 0 € de Sucesiones. Solo entre los instituidos herederos que nombra el testamento; si no se han leído, entre quienes no son
// cónyuge ni solo legatarios.
function lecRepartirIguales(x, c) {
  if (!x || x.testamento !== "porcentajes" || c.valor !== "porcentajes") return;
  const todos = (x.personas || []).filter((p) => !p.renuncia && p.relacion !== "conyuge");
  let H = (c.herederos || []).length ? todos.filter((p) => c.herederos.some((n) => lecMismoNombre(n, p.nombre))) : [];
  if (!H.length) H = todos.filter((p) => !p.notaLegado);
  if (!H.length) H = todos;
  if (!H.length || todos.some((p) => (Number(String(p.pct || "").replace(",", ".")) || 0) > 0)) return; // ya hay porcentajes (introducidos o de otro documento): no se tocan
  H.forEach((p) => { p.pct = Math.round(10000 / H.length) / 100; });
}
function lecAplicar(x, ids) {
  const R = LEC.resultado; if (!R) return 0;
  let n = 0;
  // Primero los datos del causante (régimen económico, fecha): de ellos depende cómo se cargan los bienes (gananciales o privativos)
  const orden = [...R.propuestas.filter((p) => p.grupo === "Causante"), ...R.propuestas.filter((p) => p.grupo !== "Causante")];
  // Documentos separados en otro expediente (I5): sus propuestas van a ese expediente
  for (const s of R.separados || []) {
    const y = DB.expedientes.find((q) => q.id === s.id); if (!y) continue; let m = 0;
    for (const p of orden) if (p.exp === s.id && ids.includes(p.id)) { try { p.aplicar(y); m++; } catch (e) { console.error(e); } }
    const dd = R.docs.filter((d) => R.propuestas.some((p) => p.exp === s.id && p.doc.split(" + ").includes(d.nombre)));
    if (m) { y.docsLeidos = (y.docsLeidos || []).concat(dd.map((d) => ({ nombre: d.nombre, tipo: d.tipo, fecha: hoy() }))); anotar(y, `${plural(m, "dato cargado", "datos cargados")} desde documentos separados de ${x.despacho?.ref || nombreExp(x)}. Marcados «leído de documento» para revisar.`, "doc"); }
    n += m;
  }
  const sep = new Set((R.separados || []).map((s) => s.id));
  const docsX = sep.size ? R.docs.filter((d) => !R.propuestas.some((p) => sep.has(p.exp) && p.doc.split(" + ").includes(d.nombre))) : R.docs;
  let nx = 0;
  for (const p of orden) if (!sep.has(p.exp) && ids.includes(p.id)) { try { p.aplicar(x); n++; nx++; } catch (e) { console.error(e); } }
  for (const p of orden) if (!sep.has(p.exp) && ids.includes(p.id) && p.repartir) { try { p.repartir(x); } catch (e) { console.error(e); } }
  if (nx) {
    const T = new Set(docsX.map((d) => d.tipo)); const M = { defuncion: "defuncion", ultimas: "ultimas", seguros: "seguros", herederos: "declaracion", padron: "padron_causante", familia: "libro", matrimonio: "matrimonio", factura: "facturas", prestamo: "deudas" };
    lecDocsMarcar(x, [...T].map((t) => M[t]).filter(Boolean).concat((x.personas || []).length && (x.personas || []).filter((p) => !p.renuncia).every((p) => p.nif) ? ["dni"] : []));
    x.docsLeidos = (x.docsLeidos || []).concat(docsX.map((d) => ({ nombre: d.nombre, tipo: d.tipo, fecha: hoy() }))); anotar(x, `${plural(nx, "dato cargado", "datos cargados")} desde ${plural(docsX.length, "documento")} (${docsX.map((d) => d.titulo).filter((v, i, a) => a.indexOf(v) === i).join(", ")}). Marcados «leído de documento» para revisar.`, "doc"); }
  if (n) { guardar(); try { if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); } catch (e) {} } // el centro de mando recalcula lo que falta
  return n;
}

// ── Hoja de revisión ──
function lecSheetHTML() {
  const x = DB.expedientes.find((q) => q.id === LEC.exp);
  if (LEC.leyendo || !LEC.resultado) return sheetHTML("Leyendo los documentos", `<div class="lec-wait"><div class="lec-spin" aria-hidden="true"></div><p id="lec-prog">Preparando la lectura…</p><p class="caption">Todo ocurre en este ordenador: los documentos no se envían a ningún sitio. Un PDF con texto tarda un segundo; un escaneo o una foto, entre diez y treinta segundos por página la primera vez.</p></div>`, "Cerrar");
  const R = LEC.resultado, P = R.propuestas;
  const C = R.causantes && !R.causantes.resuelto ? R.causantes : null;
  if (C) return sheetHTML("Documentos de herencias distintas", lecMezclaHTML(R, C, x), "Cerrar", "lec-sheet");
  const grupos = [...new Set(P.map((p) => p.grupo))];
  const docs = `<div class="lec-docs">${R.docs.map((d) => `<div class="lec-doc"><span class="lec-doc-t"><b>${esc(d.titulo)}</b><small>${esc(d.nombre)}${d.escaneado ? " · escaneo" : d.formato ? " · " + esc(d.formato) : d.texto ? " · PDF con texto" : ""}${d.paginas > 1 ? " · " + plural(d.paginas, "página") : ""}</small></span></div>`).join("")}</div>${(() => { const A = R.docs.flatMap((d) => d.datos.avisos.map((a) => [d.titulo, a])); return A.length ? `<ul class="lec-avisos">${A.map(([t, a]) => `<li><b>${esc(t)}:</b> ${esc(a)}</li>`).join("")}</ul>` : ""; })()}`;
  const fila = (p) => `<label class="row lec-row ${p.conf === 0 ? "lec-duda" : ""}"><input type="checkbox" data-lecsel="${p.id}" ${p.on ? "checked" : ""}><span class="t"><b>${esc(p.etiqueta)}</b><small>${esc(p.mostrar)}</small><small class="lec-src">${esc(p.doc)}${p.conf === 0 ? " · dudoso o ya hay un valor en el expediente: revísalo" : ""}</small></span></label>`;
  const listaDe = (Q) => [...new Set(Q.map((p) => p.grupo))].map((g) => `<div class="sectitle">${esc(g)}</div><div class="group lec-grupo">${Q.filter((p) => p.grupo === g).map(fila).join("")}</div>`).join("");
  const S = R.separados || [];
  const lista = S.length ? [`<h3 class="lec-dest">En este expediente${R.principal ? ` · herencia de ${esc(R.principal)}` : ""}</h3>${listaDe(P.filter((p) => !p.exp)) || `<p class="caption">Sin datos nuevos.</p>`}`, ...S.map((s) => `<h3 class="lec-dest">En el expediente nuevo ${esc(s.ref)}${s.nombre ? ` · herencia de ${esc(s.nombre)}` : ""}</h3>${listaDe(P.filter((p) => p.exp === s.id)) || `<p class="caption">Sin datos nuevos.</p>`}`)].join("") : listaDe(P);
  void grupos;
  const body = `${S.length ? `<div class="lec-sep" role="status"><b>Separados en ${plural(S.length + 1, "expediente")}.</b> Los documentos de ${S.map((s) => esc(s.nombre || "otro causante")).join(" y ")} ya están archivados en ${S.map((s) => esc(s.ref)).join(", ")}. Revisa abajo los datos de cada uno: al cargarlos, cada dato va a su expediente.</div>` : ""}<p class="caption" style="margin:0 0 12px">Lo que se ha leído en ${plural(R.docs.length, "documento")}. Marca lo que quieras cargar en ${S.length ? "cada expediente" : `el expediente${x ? ` de ${esc(nombreExp(x))}` : ""}`}; todo queda señalado como «leído de documento» para que lo revises. Nada se inventa: lo que no se reconoce, se deja vacío.</p>
    ${docs}
    ${P.length ? lista : `<div class="card empty" style="margin-top:12px"><b>Sin datos nuevos</b>Los documentos se han archivado, pero no se ha reconocido nada que no estuviera ya en el expediente.</div>`}
    ${P.length ? `<div class="lec-acts"><button class="btn block" data-act="lecAplicar">Cargar lo marcado en el expediente</button><button class="btn block gray" data-act="cerrarSheet">Solo archivar los documentos</button></div>` : ""}`;
  return sheetHTML("Datos leídos de los documentos", body, "Cerrar", "lec-sheet");
}
// Aviso de mezcla (I5): quién es cada causante, qué documentos son suyos y tres salidas claras
function lecMezclaHTML(R, C, x) {
  const pi = lecGrupoPrincipal(C), docs = R.docs;
  const quien = (g) => `<b>${esc(g.nombre || "Causante sin nombre")}</b>${g.nif ? ` · DNI ${esc(g.nif)}` : ""}${g.fecha ? ` · fallecimiento ${esc(fechaCorta(g.fecha))}` : ""}`;
  const lista = (I) => I.map((i) => esc(docs[i].nombre)).join(", ");
  const filas = C.grupos.map((g, i) => `<li class="lec-mz-g"><span>${quien(g)}${g.exp && !g.docs.length ? " · <i>es el causante de este expediente</i>" : ""}</span><small>${g.docs.length ? `${plural(g.docs.length, "documento")}: ${lista(g.docs)}` : "ningún documento de los subidos"}</small><small class="lec-mz-dest">${i === pi ? "Se queda en este expediente" : "Iría a un expediente nuevo"}</small></li>`).join("");
  const otros = C.grupos.map((g, i) => [g, i]).filter(([, i]) => i !== pi);
  return `<div class="lec-mezcla" role="alert"><p class="lec-mz-t"><b>Estos documentos parecen de ${C.grupos.length === 2 ? "dos herencias distintas" : C.grupos.length + " herencias distintas"}.</b> No coinciden el nombre, el DNI o la fecha de fallecimiento de la persona fallecida. Si se cargan juntos, el expediente mezclaría familias y bienes${x && x.nombre ? "" : " (por ejemplo, dos cónyuges)"}.</p>
    <ul class="lec-mz-l">${filas}</ul>
    ${C.sinAsignar.length ? `<p class="caption">${plural(C.sinAsignar.length, "documento no indica", "documentos no indican")} de quién ${C.sinAsignar.length === 1 ? "es" : "son"} (${lista(C.sinAsignar)}): se ${C.sinAsignar.length === 1 ? "queda" : "quedan"} en este expediente; si no ${C.sinAsignar.length === 1 ? "es suyo" : "son suyos"}, muévelos después desde Documentos.</p>` : ""}</div>
    <p class="caption" style="margin:14px 0 8px">¿Qué quieres hacer?</p>
    <div class="lec-acts"><button class="btn block" data-act="lecSeparar">Separar en ${plural(C.grupos.length, "expediente")}</button>
    ${otros.map(([g, i]) => `<button class="btn block gray" data-act="lecQuitar" data-g="${i}">Quitar de este expediente los ${plural(g.docs.length, "documento")} de ${esc(g.nombre || "otro causante")}</button>`).join("")}
    <button class="btn block gray" data-act="lecMisma">Es la misma persona: cargar todo junto</button></div>
    <p class="caption" style="margin-top:10px">Separar crea ${otros.length === 1 ? "un expediente nuevo" : "expedientes nuevos"} con sus documentos; después revisas los datos de cada uno antes de cargarlos. Nada se carga sin que lo apruebes.</p>`;
}
// Nuevo expediente a partir de documentos (portada): se crea vacío, se archivan y se leen
function lecNuevoHTML() {
  return sheetHTML("Nuevo expediente desde documentos", `<p class="caption" style="margin:0 0 12px">Arrastra aquí los documentos de la herencia que tengas: certificado de defunción, últimas voluntades, seguros, testamento o acta de herederos, Registro Civil (libro de familia, matrimonio, nacimiento), capitulaciones, empadronamiento, IBI, Catastro y valor de referencia, notas simples, datos fiscales de Hacienda, certificados de bancos, valores y planes de pensiones, préstamos, contratos de alquiler, participaciones en sociedades, facturas del funeral o de la última enfermedad, escrituras, permiso de circulación, DNI. Se crea el expediente y se rellena con lo que se lea; después lo completas tú.</p>
    <label class="drop" data-drop="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><b>Elegir o arrastrar los documentos</b><span>PDF, fotos y escaneos (también HEIC del iPhone y TIFF), Word, Excel, OpenDocument, RTF, páginas web, texto y correos (.eml) con sus adjuntos. Se guardan en este dispositivo y no se envían a ningún sitio.</span><input type="file" multiple data-lecnuevo="1" accept="${LEC_ACEPTA}"></label>
    ${typeof scnBotonHTML === "function" ? `<div class="lec-scan">${scnBotonHTML("")}<span class="caption">¿Los tienes en papel? Escanéalos con el móvil, la tableta o la webcam: se recortan, se enderezan y se leen.</span></div>` : ""}
    <ul class="lec-tipos">${Object.entries(LEC_TIPOS).filter(([k]) => k !== "desconocido").map(([, v]) => `<li>${esc(v)}</li>`).join("")}</ul>
    ${lecDisponible() ? "" : `<p class="caption" style="color:var(--orange);margin-top:12px">La lectura de documentos funciona en la versión web (heredate.github.io). En este archivo se pueden archivar, pero no leer.</p>`}`, "Cerrar", "lec-sheet");
}
async function lecNuevoDesdeArchivos(files) {
  if (!files || !files.length) return;
  if (typeof licPuedeCrear === "function" && !licPuedeCrear()) { toast(licMotivoBloqueo()); return; }
  const x = lecExpVacio();
  DB.expedientes.unshift(x); guardar();
  anotar(x, "Expediente creado a partir de documentos", "doc");
  go({ vista: "exp", id: x.id, sec: "resumen", sheet: null });
  await archivoGuardar([...files], x.id, "");
}
// Tarjeta del Resumen: qué se leyó y los datos del causante que no tienen campo propio en el formulario
function lecResumenHTML(x) {
  const D = x.docsLeidos || []; const td = x.testamentoDatos || {}; const A = x.aseguradoras || [];
  const PP = x.planesPensiones || [], AR = (x.bienes || []).filter((b) => b.arrendamiento);
  if (!D.length && !x.nifCausante && !x.lugarFallecimiento && !td.notario && !td.fecha && !A.length && !x.actaHerederos && !x.municipioCausante && !(x.isdPresentados || []).length && !PP.length && !AR.length) return "";
  const filas = [x.nifCausante ? ["NIF del causante", x.nifCausante] : null, x.lugarFallecimiento ? ["Lugar del fallecimiento", x.lugarFallecimiento] : null, td.notario ? ["Notario del testamento", td.notario] : null, td.fecha ? ["Fecha del testamento", fechaCorta(td.fecha)] : null, td.protocolo ? ["Protocolo", td.protocolo] : null, A.length ? ["Seguros de vida", A.map((a) => typeof a === "string" ? a : (a.entidad || "") + (a.poliza ? " (" + a.poliza + ")" : "") + (a.capital ? " · " + eur0(a.capital) : "") + (a.beneficiarios ? " · " + a.beneficiarios.slice(0, 60) : "")).join(", ")] : null, x.actaHerederos && (x.actaHerederos.notario || x.actaHerederos.fecha) ? ["Acta de herederos", [x.actaHerederos.fecha ? fechaCorta(x.actaHerederos.fecha) : "", x.actaHerederos.notario ? "ante " + x.actaHerederos.notario : "", x.actaHerederos.protocolo ? "nº " + x.actaHerederos.protocolo : ""].filter(Boolean).join(", ")] : null, x.municipioCausante ? ["Residencia habitual (padrón)", x.municipioCausante] : null, x.matrimonioFecha ? ["Fecha del matrimonio", fechaCorta(x.matrimonioFecha)] : null, ...(x.isdPresentados || []).map((q) => ["Modelo " + (q.modelo || "650") + (q.sujeto ? " · " + q.sujeto : ""), [q.base != null ? "base " + eur0(q.base) : "", q.cuota != null ? "cuota " + eur0(q.cuota) : "", q.estado || ""].filter(Boolean).join(" · ")]), x.capitulacionesFecha ? ["Capitulaciones matrimoniales", fechaCorta(x.capitulacionesFecha)] : null, x.datosFiscales && x.datosFiscales.ejercicio ? ["Datos fiscales leídos", "ejercicio " + x.datosFiscales.ejercicio] : null,
    ...PP.map((q) => ["Plan de pensiones (no es herencia)", [q.plan || "", q.entidad ? "en " + q.entidad : "", q.importe ? eur0(q.importe) : "", q.beneficiarios ? "beneficiarios: " + String(q.beneficiarios).slice(0, 60) : ""].filter(Boolean).join(" · ")]),
    ...AR.map((b) => ["Arrendado: " + String(b.descripcion || "inmueble").slice(0, 40), [b.arrendamiento.arrendatario || "", b.arrendamiento.renta ? eur0(b.arrendamiento.renta) + " al mes" : "", b.arrendamiento.fecha ? "desde " + fechaCorta(b.arrendamiento.fecha) : ""].filter(Boolean).join(" · ")])].filter(Boolean);
  const tipos = D.map((d) => LEC_TIPOS[d.tipo] || d.tipo).filter((v, i, a) => a.indexOf(v) === i);
  return `<div class="card lec-res" style="margin-top:14px">${cardH("Leído de los documentos", D.length ? `${plural(D.length, "documento leído", "documentos leídos")}` : "Datos del causante", `<button class="link" data-sec="documentos">Documentos ›</button>`)}${tipos.length ? `<p class="caption lec-res-tipos" style="margin:0 0 10px">${esc(tipos.join(" · "))}</p>` : ""}${filas.length ? `<div class="kv">${filas.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join("")}</div>` : ""}<p class="caption" style="margin:10px 0 0">Las personas y bienes cargados desde documentos llevan la marca «leído de documento» hasta que los revises.</p></div>`;
}

// Franja del Resumen mientras el expediente está empezando: la vía rápida es subir los documentos
function lecFranjaHTML(x) {
  if (!["encargo", "documentacion", undefined, ""].includes(x.fase)) return "";
  const n = (x.docsLeidos || []).length; const faltan = [!x.fecha && "la fecha", !(x.personas || []).length && "los herederos", !(x.bienes || []).some((b) => num(b.valor) > 0) && "el valor de los bienes"].filter(Boolean);
  if (!faltan.length) return "";
  return `<div class="card lec-franja"><span class="ico q">${I.doc}</span><span class="t"><b>${n ? "Sube más documentos para completar" : "Sube los documentos y el expediente se rellena solo"}</b><small>${n ? `${plural(n, "documento leído", "documentos leídos")}. Falta ${faltan.join(", ")}: nota simple, IBI o Catastro (con el valor de referencia) para los inmuebles; certificado del banco o datos fiscales para las cuentas; libro de familia o DNI de los herederos; acta de herederos si no hay testamento.` : "Certificado de defunción, últimas voluntades, testamento o acta de herederos, Registro Civil, empadronamiento, notas simples, IBI o Catastro, datos fiscales, certificados de bancos, préstamos, facturas del funeral, DNI, escrituras. Se leen en este ordenador y tú apruebas cada dato."}</small></span><span class="acts"><label class="btn sm">${I.doc}Subir documentos<input type="file" multiple data-subir="" accept="${LEC_ACEPTA}" style="display:none"></label>${typeof scnBotonHTML === "function" ? scnBotonHTML("") : ""}<button class="btn sm gray" data-sec="documentos">Archivo</button></span></div>`;
}
