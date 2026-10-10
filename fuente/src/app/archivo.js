// ───────────────────── {{MARCA}} · archivo de documentos y calendario ─────────────────────
// Los archivos se guardan en este dispositivo (IndexedDB). Si el navegador no lo permite, se mantienen solo durante la sesión.
const ARCH = { db: null, mem: new Map(), persistente: false, lista: [], listo: false, urls: new Map() };
const CATS = [["identidad", "Identidad y familia", /dni|nie|pasaporte|libro.?de.?familia|nacimiento|matrimonio/i], ["defuncion", "Defunción y últimas voluntades", /defunci|ultimas|últimas|voluntades|seguros.?de.?vida|certificado.?de.?seguros/i], ["testamento", "Testamento y declaración", /testament|declaraci[oó]n.?de.?herederos|acta|notar/i], ["bancos", "Bancos e inversiones", /banco|cuenta|saldo|posicion|posición|extracto|fondo|valores|bbva|santander|caixa|unicaja|sabadell/i], ["inmuebles", "Inmuebles", /ibi|catastr|escritura|nota.?simple|registro|recibo|vivienda|piso|local/i], ["impuestos", "Impuestos", /650|660|659|modelo|plusval|sucesiones|irpf|renta|hacienda|liquidaci/i], ["otros", "Otros", /.*/]];
const catDe = (n) => (CATS.find(([, , re]) => re.test(n)) || CATS[CATS.length - 1])[0];
function archivoAbrir() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open("sosiego-archivo", 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore("docs", { keyPath: "id" }); s.createIndex("exp", "expId"); };
      r.onsuccess = () => { ARCH.db = r.result; ARCH.persistente = true; res(); };
      r.onerror = () => res();
    } catch { res(); }
  });
}
function archivoTx(modo) { return ARCH.db.transaction("docs", modo).objectStore("docs"); }
async function archivoCargar() {
  if (!ARCH.db && !ARCH.intentado) { ARCH.intentado = true; await archivoAbrir(); }
  if (ARCH.db) { const L = await new Promise((res) => { const q = archivoTx("readonly").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); }); ARCH.lista = typeof sgArchivoLeer === "function" ? await sgArchivoLeer(L) : L.map(({ blob, ...m }) => ({ ...m, _b: blob })); }
  else ARCH.lista = [...ARCH.mem.values()];
  ARCH.listo = true;
}
async function archivoGuardar(files, expId, tramiteId) {
  let n = 0;
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) { toast(`${f.name}: supera 25 MB`); continue; }
    const d = { id: uid() + uid(), expId, tramiteId: tramiteId || "", nombre: f.name, tipo: f.type || "application/octet-stream", tam: f.size, fecha: new Date().toISOString(), cat: catDe(f.name), blob: f };
    if (ARCH.db) { const rec = typeof sgArchivoSellar === "function" ? await sgArchivoSellar(d) : d; await new Promise((res) => { const q = archivoTx("readwrite").put(rec); q.onsuccess = res; q.onerror = res; }); }
    else ARCH.mem.set(d.id, { ...d, _b: f });
    n++;
  }
  { const xx = DB.expedientes.find((q) => q.id === expId); if (xx && n) { anotar(xx, `${plural(n, "documento archivado", "documentos archivados")}${tramiteId ? " en el trámite" : ""}`, "doc"); guardar(); } }
  await archivoCargar(); render();
  toast(n ? `${plural(n, "documento guardado", "documentos guardados")}${ARCH.persistente ? "" : " solo en esta sesión"}` : "No se guardó ningún documento");
  if (n && typeof lecTrasArchivar === "function") lecTrasArchivar(files, expId);
}
async function archivoBorrar(id) {
  if (ARCH.db) await new Promise((res) => { const q = archivoTx("readwrite").delete(id); q.onsuccess = res; q.onerror = res; }); else ARCH.mem.delete(id);
  if (ARCH.urls.has(id)) { URL.revokeObjectURL(ARCH.urls.get(id)); ARCH.urls.delete(id); }
  await archivoCargar(); render();
}
async function archivoCambiar(id, cambios) {
  const d = ARCH.lista.find((q) => q.id === id); if (!d) return;
  Object.assign(d, cambios);
  if (ARCH.db) { const { _b, ...m } = d; const rec = typeof sgArchivoSellar === "function" ? await sgArchivoSellar({ ...m, blob: _b }) : { ...m, blob: _b }; await new Promise((res) => { const q = archivoTx("readwrite").put(rec); q.onsuccess = res; q.onerror = res; }); }
  render();
}
const archivoDe = (expId, tramiteId) => ARCH.lista.filter((d) => d.expId === expId && (tramiteId == null || d.tramiteId === tramiteId)).sort((a, b) => b.fecha.localeCompare(a.fecha));
function urlDe(d) { if (!ARCH.urls.has(d.id) && d._b) ARCH.urls.set(d.id, URL.createObjectURL(d._b)); return ARCH.urls.get(d.id); }
const tamTxt = (b) => b > 1048576 ? grp(b / 1048576, 1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const extDe = (n) => (String(n).split(".").pop() || "").slice(0, 4).toUpperCase();
// Estado del documento en el flujo del despacho: recibido (por defecto) → por revisar (lo leyó el programa o lo subió otro) → validado; o rechazado / obsoleto
const ARCH_ESTADOS = [["recibido", "Recibido", ""], ["revisar", "Por revisar", "warn"], ["validado", "Validado", "ok"], ["rechazado", "Rechazado", "bad"], ["obsoleto", "Obsoleto", ""]];
const archEstado = (d) => ARCH_ESTADOS.find((e) => e[0] === (d.estado || "recibido")) || ARCH_ESTADOS[0];
function fichaArchivo(d) {
  const img = /^image\//.test(d.tipo); const e = archEstado(d);
  return `<button class="fcard ${d.estado === "obsoleto" ? "obs" : ""}" data-fver="${d.id}"><span class="th">${img ? `<img src="${urlDe(d)}" alt="">` : `<span class="ext">${esc(extDe(d.nombre))}</span>`}</span><span class="in"><b>${esc(d.nombre)}</b><small>${tamTxt(d.tam)} · ${fechaCorta(d.fecha.slice(0, 10))}${d.leido ? " · leído" : ""}</small></span>${e[0] !== "recibido" ? `<span class="chip ${e[2]}">${e[1]}</span>` : ""}</button>`;
}
function zonaSubida(tramiteId, texto) {
  return `<label class="drop" data-drop="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><b>${texto || "Añadir documentos"}</b><span>Arrastra aquí o toca para elegir. Los PDF, escaneos y fotos se leen y proponen los datos del expediente. Se guardan en este dispositivo.</span><input type="file" multiple data-subir="${tramiteId || ""}" accept="${typeof LEC_ACEPTA === "string" ? LEC_ACEPTA + ",.doc,.xls,.msg" : "application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"}"></label>${typeof scnBotonHTML === "function" ? `<div class="lec-scan">${scnBotonHTML(tramiteId)}<span class="caption">Con el móvil, la tableta o la webcam: recorta, endereza y guarda un PDF que se lee solo.</span></div>` : ""}`; // gancho: escáner con la cámara (escaner.js)
}

// ── Calendario (.ics) ──────────────────────────────────────────
function icsDe(items) {
  const f = (s) => s.replace(/-/g, "");
  const escI = (s) => String(s || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = items.map(({ t, x }) => { const d = t.limite; const d2 = trDias(d, 1); return ["BEGIN:VEVENT", `UID:${x.id}-${t.id}@sosiego`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${f(d)}`, `DTEND;VALUE=DATE:${f(d2)}`, `SUMMARY:${escI(t.titulo + " · " + nombreExp(x))}`, `DESCRIPTION:${escI((t.que || "").slice(0, 400) + (t.norma ? "\n" + t.norma : ""))}`, "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${escI(t.titulo)}`, "END:VALARM", "END:VEVENT"].join("\r\n"); });
  // RFC 5545 (3.1): líneas terminadas en CRLF y plegadas a 75 octetos (UTF-8) con CRLF + espacio, sin partir un carácter (M12)
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//{{MARCA}}//Plazos//ES", "CALSCALE:GREGORIAN", "X-WR-CALNAME:{{MARCA}} · plazos", ...ev, "END:VCALENDAR"].join("\r\n").split("\r\n").map(icsPlegar).join("\r\n") + "\r\n";
}
function icsPlegar(linea) {
  const enc = new TextEncoder(); if (enc.encode(linea).length <= 75) return linea;
  const out = []; let cur = "", n = 0, lim = 75;
  for (const ch of linea) { const b = enc.encode(ch).length; if (n + b > lim) { out.push(cur); cur = ""; n = 0; lim = 74; } cur += ch; n += b; }
  out.push(cur); return out.join("\r\n ");
}
function exportarICS(exps) {
  const items = exps.flatMap((x) => { const R = calcular(x); return tramitesExp(x, R).filter((t) => !cerrado(t) && t.limite && !t.informativo).map((t) => ({ t, x })); });
  if (!items.length) { toast("No hay plazos pendientes"); return; }
  descargar(exps.length === 1 ? `Plazos - ${(nombreExp(exps[0])).replace(/[\\/:*?"<>|]/g, "")}.ics` : "Plazos de la cartera.ics", new Blob([icsDe(items)], { type: "text/calendar" }));
}
