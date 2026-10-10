// ───────────────────── {{MARCA}} · robustez de los datos (prefijo rb) ─────────────────────
// 1. Fechas, edades e importes escritos a mano: validación en los campos (no se guarda 0 en silencio)
// 2. Revisar y sanear un expediente (al importar, al restaurar y al arrancar): fechas ISO reales, comunidad conocida, listas de objetos,
//    parentesco y tipo de bien conocidos. Lo que se arregla sin perder información se arregla solo (y se anota en la bitácora);
//    lo demás deja el expediente «dañado».
// 3. Expedientes dañados: se apartan de la cartera (DB.danados) para que nunca tumben la cartera, los Ajustes ni la recarga.
//    Desde la cartera se pueden reparar (corrige solo lo imposible y lo anota), exportar tal cual o borrar.
// 4. Pantalla de error: si algo falla al pintar, en lugar de una página en blanco, salidas a Expedientes, Ajustes y la copia.
// 5. Borrar un expediente borra también sus documentos · referencias únicas · solo lectura con los campos desactivados.

// ═════════ 1. Fechas, edades e importes ═════════
function rbFechaValida(s) { if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + "T12:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }
// ISO, «dd/mm/aaaa», «dd-mm-aaaa» o una fecha con hora → «aaaa-mm-dd»; "" si no es una fecha real
function rbFechaLeer(v) {
  const s = String(v ?? "").trim(); if (rbFechaValida(s)) return s;
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) { const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; if (rbFechaValida(iso)) return iso; }
  m = /^(\d{4}-\d{2}-\d{2})T[\d:.]+(Z|[+-]\d{2}:?\d{2})?$/.exec(s); if (m && rbFechaValida(m[1])) return m[1];
  return "";
}
// Fecha del fallecimiento: real y no posterior a hoy (el atributo max del campo no impide teclearla, I3)
function rbFallecimientoMsg(v) {
  const s = String(v ?? "").trim(); if (!s) return "";
  if (!rbFechaValida(s)) return "Esa fecha no existe.";
  if (s > hoy()) return "La fecha del fallecimiento no puede ser posterior a hoy.";
  if (s < "1900-01-01") return "Revisa el año: es anterior a 1900.";
  return "";
}
const rbFallecimientoOk = (v) => !!String(v ?? "").trim() && !rbFallecimientoMsg(v);
// Edad: de 0 a 120 años («40», «40,5», «40 años»). Lo demás no se guarda como edad (sería 0: un menor, I2): queda «desconocida»
// (se trata como adulto, con su aviso) y el texto escrito se conserva en edadTexto para enseñarlo con el aviso.
function rbEdadAsignar(p, v) {
  if (!p) return;
  const s = String(v ?? "").trim();
  if (!s) { p.edad = ""; delete p.edadTexto; return; }
  if (edadNum(s) != null) { p.edad = s.replace(/\s*años?$/i, ""); delete p.edadTexto; return; }
  p.edad = ""; p.edadTexto = String(v);
}
const rbEdadCampo = (p) => (p && (p.edad === "" || p.edad == null) && p.edadTexto ? p.edadTexto : numStr(p ? p.edad : ""));
function rbEdadMsg(v) {
  const s = String(v ?? "").trim(); if (!s) return "";
  return edadNum(s) == null ? "Escribe la edad en años (de 0 a 120). Mientras tanto se trata como edad desconocida (adulto)." : "";
}
// Importe: lo que no se entiende se avisa en el campo (I1); los formatos habituales («182.400,00 €», «182 400») se aceptan
function rbImporteMsg(v) {
  const s = String(v ?? "").trim(); if (!s) return "";
  const n = numLeer(s);
  if (isNaN(n)) return "No se entiende este importe: escribe solo la cifra, por ejemplo 182.400,50 (el símbolo € es opcional). Mientras tanto cuenta como 0 €.";
  if (n < 0) return "El importe no puede ser negativo.";
  if (n > 1e11) return "Importe demasiado alto: revisa la cifra.";
  return "";
}
// Porcentaje: entre 0 y 100; vacío = 100 % en el porcentaje del causante; ilegible = aviso (antes contaba como 100 % sin decirlo, M1)
function rbPctMsg(v) {
  const s = String(v ?? "").trim(); if (!s) return "";
  const n = numLeer(s);
  if (isNaN(n)) return "No se entiende el porcentaje: escribe un número entre 0 y 100.";
  return n < 0 || n > 100 ? "Debe estar entre 0 y 100 %." : "";
}
// Para deudas y gastos (se guardaban como número): la cifra si se entiende; si no, el texto (cuenta como 0 y el campo lo avisa)
const rbNumOTexto = (v) => { const s = String(v ?? "").trim(); if (!s) return 0; const n = numLeer(s); return isNaN(n) ? s : n; };

// ═════════ 2. Revisar y sanear un expediente ═════════
const RB_LISTAS = ["personas", "bienes", "deudas", "gastos"];
const RB_OBJETOS = ["tramites", "situ", "despacho", "tareas"];
const rbEsObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const rbCorto = (v) => { let s; try { s = typeof v === "string" ? v : JSON.stringify(v); } catch (e) { s = String(v); } s = String(s); return s.length > 40 ? s.slice(0, 37) + "…" : s; };
// Devuelve los problemas: [{ grave, texto }]. modo "ver" solo informa; "leves" arregla lo que no pierde información; "todo" arregla todo.
// Grave = arreglarlo cambia o descarta un dato (el usuario decide). Irreparable = no es un expediente.
function rbSanear(x, modo = "ver") {
  const P = [];
  const fija = (grave, texto, f) => { P.push({ grave, texto }); if (modo === "todo" || (modo === "leves" && !grave)) f(); };
  if (!rbEsObj(x)) return [{ grave: true, irreparable: true, texto: "No tiene forma de expediente" }];
  if (x.id == null || x.id === "") fija(false, "Sin identificador", () => { x.id = uid(); });
  else if (typeof x.id !== "string") fija(false, "Identificador no textual", () => { x.id = String(x.id); });
  if (x.nombre != null && typeof x.nombre !== "string") fija(true, `Nombre del causante ilegible («${rbCorto(x.nombre)}»): se deja vacío`, () => { x.nombre = typeof x.nombre === "number" ? String(x.nombre) : ""; });
  if (x.fecha != null && x.fecha !== "" && !rbFechaValida(x.fecha)) {
    const f = rbFechaLeer(x.fecha);
    if (f) fija(false, `Fecha del fallecimiento en otro formato («${rbCorto(x.fecha)}» → ${f})`, () => { x.fecha = f; });
    else fija(true, `Fecha del fallecimiento imposible («${rbCorto(x.fecha)}»): se deja vacía para escribirla`, () => { x.fecha = ""; });
  }
  const TERR = new Set((typeof TERRITORIOS !== "undefined" ? TERRITORIOS : []).map((t) => t[0]));
  for (const k of ["ccaa", "ccaaBienes"]) if (x[k] != null && x[k] !== "" && TERR.size && !TERR.has(x[k])) fija(true, `${k === "ccaa" ? "Comunidad autónoma" : "Comunidad de los bienes"} desconocida («${rbCorto(x[k])}»): se deja sin elegir`, () => { x[k] = ""; });
  const nombres = { personas: "personas", bienes: "bienes", deudas: "deudas", gastos: "gastos" };
  for (const k of RB_LISTAS) {
    const v = x[k];
    if (v === null) { fija(false, `Lista de ${nombres[k]} vacía (null)`, () => { x[k] = []; }); continue; }
    if (v !== undefined && !Array.isArray(v)) {
      if (rbEsObj(v)) fija(true, `La lista de ${nombres[k]} no tiene forma de lista: se convierte`, () => { x[k] = Object.values(v); });
      else fija(true, `La lista de ${nombres[k]} está dañada («${rbCorto(v)}»): se vacía`, () => { x[k] = []; });
    }
    const L = Array.isArray(x[k]) ? x[k] : Array.isArray(v) ? v : [];
    const nulos = L.filter((e) => e == null).length, raros = L.filter((e) => e != null && !rbEsObj(e)).length;
    if (nulos) fija(false, `${plural(nulos, "elemento vacío", "elementos vacíos")} en ${nombres[k]}`, () => { x[k] = (x[k] || []).filter((e) => e != null); });
    if (raros) fija(true, `${plural(raros, "elemento ilegible", "elementos ilegibles")} en ${nombres[k]}: se quitan`, () => { x[k] = (x[k] || []).filter((e) => e == null || rbEsObj(e)); });
  }
  const pers = Array.isArray(x.personas) ? x.personas.filter(rbEsObj) : [];
  for (const p of pers) {
    if (p.id == null || p.id === "") fija(false, "Persona sin identificador", () => { p.id = uid(); });
    if (p.nombre != null && typeof p.nombre !== "string") fija(true, `Nombre de persona ilegible («${rbCorto(p.nombre)}»)`, () => { p.nombre = typeof p.nombre === "number" ? String(p.nombre) : ""; });
    if (typeof RELACIONES === "object" && !RELACIONES[p.relacion]) fija(true, `Parentesco desconocido de ${p.nombre ? "«" + rbCorto(p.nombre) + "»" : "una persona"} («${rbCorto(p.relacion ?? "")}»): se pone «${RELACIONES.extrano ? RELACIONES.extrano.label : "extraño"}» para que lo revises`, () => { p.relacion = "extrano"; });
    if (p.edad !== "" && p.edad != null && edadNum(p.edad) == null) fija(false, `Edad ilegible de ${p.nombre ? "«" + rbCorto(p.nombre) + "»" : "una persona"} («${rbCorto(p.edad)}»): se trata como desconocida`, () => { p.edadTexto = String(p.edad); p.edad = ""; });
  }
  const bienes = Array.isArray(x.bienes) ? x.bienes.filter(rbEsObj) : [];
  for (const b of bienes) {
    if (b.id == null || b.id === "") fija(false, "Bien sin identificador", () => { b.id = uid(); });
    if (typeof TIPO_BIEN === "object" && !TIPO_BIEN[b.tipo]) fija(true, `Tipo de bien desconocido («${rbCorto(b.tipo ?? "")}»${b.descripcion ? " en «" + rbCorto(b.descripcion) + "»" : ""}): se pone «${TIPO_BIEN.otro[0]}»`, () => { b.tipo = "otro"; });
    if (b.fechaAdq != null && b.fechaAdq !== "" && !rbFechaValida(b.fechaAdq)) {
      const f = rbFechaLeer(b.fechaAdq);
      if (f) fija(false, `Fecha de adquisición en otro formato («${rbCorto(b.fechaAdq)}» → ${f})`, () => { b.fechaAdq = f; });
      else fija(true, `Fecha de adquisición imposible («${rbCorto(b.fechaAdq)}»): se deja vacía`, () => { b.fechaAdq = ""; });
    }
  }
  if (x.bitacora === null) fija(false, "Bitácora vacía (null)", () => { x.bitacora = []; });
  else if (x.bitacora !== undefined && !Array.isArray(x.bitacora)) fija(true, "La bitácora está dañada: se empieza de nuevo", () => { x.bitacora = []; });
  else if (Array.isArray(x.bitacora) && x.bitacora.some((e) => !rbEsObj(e))) fija(false, "Anotaciones vacías en la bitácora", () => { x.bitacora = x.bitacora.filter(rbEsObj); });
  for (const k of RB_OBJETOS) {
    if (x[k] === null) fija(false, `«${k}» vacío (null)`, () => { delete x[k]; });
    else if (x[k] !== undefined && !rbEsObj(x[k])) fija(true, `Datos de «${k}» dañados («${rbCorto(x[k])}»): se descartan`, () => { x[k] = {}; });
  }
  return P;
}
const rbGraves = (P) => P.filter((p) => p.grave);
const rbNombre = (x) => { if (!rbEsObj(x)) return "Expediente sin forma"; const r = typeof x.despacho === "object" && x.despacho && typeof x.despacho.ref === "string" ? x.despacho.ref : ""; const n = typeof x.nombre === "string" && x.nombre ? x.nombre : "Sin nombre"; return (r ? r + " · " : "") + n; };

// ═════════ 3. Expedientes dañados, apartados de la cartera ═════════
// Al arrancar (sgSeguir), tras restaurar una copia y tras importar varios expedientes. Nunca se borra nada: lo dañado pasa a DB.danados,
// que va en las copias de seguridad como el resto de la base. Devuelve cuántos se han apartado.
function rbAislar() {
  if (!DB || typeof DB !== "object") return 0;
  if (!Array.isArray(DB.expedientes)) return 0;
  const sanos = [], fuera = [];
  for (const x of DB.expedientes) {
    let P; try { P = rbSanear(x, "leves"); } catch (e) { P = [{ grave: true, texto: "No se puede revisar: " + String(e && e.message || e) }]; }
    const G = rbGraves(P);
    if (G.length) { fuera.push({ id: rbEsObj(x) && x.id ? String(x.id) : "rb" + uid(), desde: new Date().toISOString(), problemas: G.map((p) => p.texto), x }); continue; }
    if (P.length) { try { anotar(x, "Datos corregidos al abrir (sin perder información): " + P.map((p) => p.texto).join("; "), "sistema"); } catch (e) {} }
    sanos.push(x);
  }
  if (!fuera.length) return 0;
  DB.expedientes = sanos;
  DB.danados = (Array.isArray(DB.danados) ? DB.danados.filter(rbEsObj) : []).concat(fuera);
  return fuera.length;
}
const rbDanados = () => (DB && Array.isArray(DB.danados) ? DB.danados.filter(rbEsObj) : []);
const RB = { conf: null };
function rbAvisoHTML() {
  const L = rbDanados(); if (!L.length) return "";
  return `<div class="card rb-danados" role="region" aria-label="Expedientes con datos dañados"><div class="rb-h"><span class="ico orange" aria-hidden="true">${I.info || ""}</span><span><b>${L.length === 1 ? "Un expediente tiene datos dañados" : L.length + " expedientes tienen datos dañados"} y se ha apartado de la cartera</b><small>Así no afecta al resto. Al repararlo se corrigen solo los datos imposibles (lo verás en la lista) y se anota en su bitácora. Si prefieres revisarlo a mano, expórtalo tal cual antes.</small></span></div>
    ${L.map((d) => `<div class="rb-item"><span class="t"><b>${esc(rbNombre(d.x))}</b><small>${esc((d.problemas || []).join(" · "))}</small></span><span class="rb-acts">${RB.conf === d.id ? `<span class="rb-conf">¿Borrarlo con sus documentos? No se puede deshacer.</span><button class="btn sm gray" data-rb="noBorrar">Cancelar</button><button class="btn sm danger-solid" data-rb="borrarSi" data-id="${esc(d.id)}">Sí, borrar</button>` : `${rbSanear(JSON.parse(JSON.stringify(d.x ?? null)), "ver").some((p) => p.irreparable) ? "" : `<button class="btn sm" data-rb="reparar" data-id="${esc(d.id)}">Reparar</button>`}<button class="btn sm gray" data-rb="exportar" data-id="${esc(d.id)}">Exportar</button><button class="btn sm gray" data-rb="borrar" data-id="${esc(d.id)}">Borrar</button>`}</span></div>`).join("")}</div>`;
}
function rbReparar(id) {
  const L = rbDanados(), d = L.find((q) => q.id === id); if (!d) return;
  if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); return; }
  const x = d.x; const P = rbSanear(x, "todo");
  if (P.some((p) => p.irreparable)) { toast("Este expediente no se puede reparar: expórtalo o bórralo"); return; }
  if (DB.expedientes.some((q) => q.id === x.id)) x.id = uid();
  anotar(x, "Expediente reparado: " + P.map((p) => p.texto).join("; "), "sistema");
  DB.danados = L.filter((q) => q !== d); if (!DB.danados.length) delete DB.danados;
  DB.expedientes.unshift(x); guardar();
  if (typeof go === "function") go({ vista: "exp", id: x.id, sec: "resumen", sheet: null });
  toast(`Expediente reparado: ${plural(P.length, "dato corregido", "datos corregidos")}. Revísalo.`);
}
function rbExportar(id) {
  const d = rbDanados().find((q) => q.id === id); if (!d) return;
  const nombre = (rbNombre(d.x) + " (dañado)").replace(/[\\/:*?"<>|]/g, "");
  descargar(`${nombre}.hereda.json`, new Blob([JSON.stringify({ app: "hereda+", tipo: "expediente", version: typeof VERSION_APP === "object" ? VERSION_APP.n : 0, exportado: new Date().toISOString(), despachoOrigen: DB.despacho?.nombre || "", danado: { problemas: d.problemas, desde: d.desde }, expediente: d.x, documentos: [] }, null, 1)], { type: "application/json" }));
}
async function rbBorrarDanado(id) {
  const L = rbDanados(), d = L.find((q) => q.id === id); if (!d) return;
  DB.danados = L.filter((q) => q !== d); if (!DB.danados.length) delete DB.danados;
  RB.conf = null; guardar();
  const n = await rbBorrarDocumentos(id);
  if (typeof render === "function") render();
  toast("Expediente dañado borrado" + (n ? ` con ${plural(n, "documento")}` : ""));
}
if (typeof document !== "undefined" && !window.__rbOyente) {
  window.__rbOyente = true;
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-rb]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.rb, id = b.dataset.id;
    if (a === "reparar") rbReparar(id);
    else if (a === "exportar") rbExportar(id);
    else if (a === "borrar") { RB.conf = id; render(); }
    else if (a === "noBorrar") { RB.conf = null; render(); }
    else if (a === "borrarSi") rbBorrarDanado(id);
    else if (a === "inicio") { try { ui.sheet = null; go({ vista: "inicio", id: null, sheet: null }); } catch (err) { rbPantallaError(err); } }
    else if (a === "ajustes") { try { ui.sheet = { tipo: "ajustes" }; ui.vista = "inicio"; ui.id = null; render(); } catch (err) { rbPantallaError(err, true); } }
    else if (a === "copia") { if (typeof sgDescargarCopia === "function") sgDescargarCopia(); }
    else if (a === "recargar") location.reload();
  }, true);
}

// ═════════ 4. Pantalla de error (nunca una página en blanco) ═════════
// ui.js render() la llama si algo falla al pintar. Intenta pintar debajo la hoja de Ajustes si se pidió.
function rbPantallaError(e, conAjustes) {
  console.error("Error al pintar", e);
  const msg = String((e && e.message) || e || "").slice(0, 200);
  let hoja = "";
  if (conAjustes && typeof vSheet === "function") { try { hoja = vSheet(); } catch (err) { hoja = ""; } }
  try {
    $app.innerHTML = `<div class="rb-error page view" role="alert"><h1 class="ltitle">Algo ha fallado al mostrar esta pantalla</h1>
      <p>Tus datos no se han perdido: siguen guardados en este equipo. Vuelve a la lista de expedientes o descarga una copia de seguridad. Si se repite, envía la copia a soporte con este detalle: <code>${esc(msg)}</code></p>
      <div class="rb-acts"><button class="btn" data-rb="inicio">Volver a Expedientes</button><button class="btn gray" data-rb="ajustes">Despacho y ajustes</button><button class="btn gray" data-rb="copia">Descargar copia de seguridad</button><button class="btn gray" data-rb="recargar">Recargar</button></div></div>${hoja}`;
  } catch (err) {}
}

// ═════════ 5. Borrar un expediente con sus documentos · referencias · solo lectura ═════════
// Documentos de un expediente (almacén del navegador «sosiego-archivo»): se borran todos. Devuelve cuántos.
async function rbBorrarDocumentos(expId) {
  let n = 0;
  try {
    if (typeof ARCH === "object" && !ARCH.listo && typeof archivoCargar === "function") await archivoCargar();
    const L = (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d && d.expId === expId);
    if (typeof ARCH === "object" && ARCH.db) {
      for (const d of L) { await new Promise((res) => { try { const q = archivoTx("readwrite").delete(d.id); q.onsuccess = res; q.onerror = res; } catch (e) { res(); } }); if (ARCH.urls.has(d.id)) { URL.revokeObjectURL(ARCH.urls.get(d.id)); ARCH.urls.delete(d.id); } n++; }
    } else if (typeof ARCH === "object") { for (const d of L) { ARCH.mem.delete(d.id); n++; } }
    // Por si la lista no estaba al día: lo que quede en el almacén con ese expediente
    if (typeof sgDocsTodos === "function" && typeof sgDocsBorrar === "function") { const resto = (await sgDocsTodos()).filter((r) => r && r.expId === expId).map((r) => r.id); if (resto.length) { await sgDocsBorrar(resto); n += resto.length; } }
    if (typeof archivoCargar === "function") await archivoCargar();
    if (typeof sgMedir === "function") sgMedir();
  } catch (e) { console.error("Borrar documentos", e); }
  return n;
}
const rbDocsDe = (expId) => (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d && d.expId === expId).length;
// Texto de la confirmación de borrado (I4): qué se borra y qué queda en las copias ya hechas
function rbBorrarTexto(x) {
  const n = x ? rbDocsDe(x.id) : 0;
  return `Se quita de este equipo con sus datos, su seguimiento${n ? ` y ${plural(n, "documento adjunto", "documentos adjuntos")} (DNI, escrituras…)` : " y sus documentos adjuntos"}, que tampoco saldrán en las copias de seguridad que se hagan a partir de ahora. Las copias anteriores (descargadas o de la carpeta de copias automáticas, que se renuevan en 30 días) los conservan hasta que se borren. No se puede deshacer; si lo necesitas, expórtalo antes.`;
}
async function rbBorrarExpediente(id) {
  DB.expedientes = DB.expedientes.filter((q) => q.id !== id);
  if (Array.isArray(DB.recientes)) DB.recientes = DB.recientes.filter((i) => i !== id);
  if (DB.cronometro && DB.cronometro.xId === id) delete DB.cronometro;
  guardar();
  const n = await rbBorrarDocumentos(id);
  return n;
}
// Referencia libre: «EXP-2026-001-E», «-E2»… sin repetir ninguna de la cartera (M5)
function rbRefUnica(base, sufijo = "-E") {
  const usadas = new Set((DB.expedientes || []).map((q) => String(q.despacho?.ref || "")));
  let r = base + sufijo, i = 2; while (usadas.has(r)) r = base + sufijo + i++;
  return r;
}
// Solo lectura (licencia caducada): los campos de los expedientes se desactivan en lugar de dejar escribir y deshacerlo (M3)
const RB_CAMPOS_EXP = "[data-p],[data-bn],[data-b],[data-bd],[data-dsp],[data-gasto],[data-deuda],[data-deudagan],[data-situ],[data-opt],[data-resp],[data-tnota],[data-padj],[data-sim],[data-simval]";
function rbSoloLectura() {
  try {
    if (!(typeof licSoloLectura === "function" && licSoloLectura())) return;
    $app.querySelectorAll(RB_CAMPOS_EXP).forEach((el) => { if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !el.disabled) { el.disabled = true; el.title = "Solo lectura: la licencia ha caducado"; } });
  } catch (e) {}
}
