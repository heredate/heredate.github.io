// ───────────────────── {{MARCA}} · seguridad de los datos (Piloto 10 · prefijo sg) ─────────────────────
// 1. Almacenamiento persistente y espacio · 2. Guardado con sello de cambios (x.actualizado) y aviso si falla
// 3. Contraseña y cifrado (AES-GCM 256; clave de datos aleatoria envuelta con una clave PBKDF2-SHA256 de la contraseña)
// 4. Copias: automática en una carpeta (Chrome/Edge), descarga manual, recordatorio semanal, restauración con vista previa
// 5. Actualizaciones (service worker) · 6. Salud de los datos (pantalla de recuperación, nunca se sobrescribe en silencio)
// Arranque: logic.js deja DB_BLOQUEO = null | "cifrado" | "danado"; ui.js llama a sgArranque(continuar) en lugar de arrancar directamente.
const SG_ENC = "cauce.v1.enc";                 // datos cifrados en localStorage
const SG_IT = 600000;                          // iteraciones PBKDF2-SHA256 (OWASP 2023: 600.000)
const SG_LS_MAX = 5 * 1024 * 1024;             // localStorage: ~5 millones de caracteres por origen (medido en Chromium; Firefox y Safari, del mismo orden)
// I11 · Techo de localStorage. Decisión: los expedientes siguen en localStorage mientras caben holgadamente (arranque síncrono, pantallas de
// bloqueo y recuperación, aviso entre ventanas y cifrado probados sobre él) y, al pasar del 60 % del techo o si el navegador dice que está
// lleno, pasan solos y para siempre a IndexedDB («hereda-datos»), sin límite práctico (la cuota del disco). En localStorage queda solo una
// marca pequeña que cambia en cada guardado (avisa a las otras ventanas y le dice al arranque que lea de IndexedDB). Copias, exportación,
// importación y el resto de módulos trabajan sobre DB en memoria y no cambian. Los datos cifrados (comprimidos, ~6 veces menos) siguen en
// localStorage, con aviso al 80 %.
const SG_IDB_UMBRAL = Math.round(SG_LS_MAX * 0.6);
const SG_DESCARGA_MAX = 150 * 1048576;         // documentos que caben dentro de una copia descargada
const SG_COPIA_RE = /^Hereda\+ copia (\d{4}-\d{2}-\d{2})\.hereda\.(json|enc)$/;
const SG_CONSERVAR = 30;                       // copias diarias que se conservan en la carpeta
const SG = { bloqueado: false, cifrado: false, clave: null, sobre: null, escribiendo: null, pendiente: false, errorGuardar: null, huellas: null,
  persist: null, estimate: null, lsTam: 0, almacen: "ls", idbPend: null, docsTam: 0, carpeta: null, carpetaPadre: "", carpetaPermiso: null, copiando: false, copiaError: null,
  actualizacion: null, reg: null, recargar: false, revisado: 0, act: Date.now(), intentos: 0, restaurar: null, continuar: null, eventos: false, prueba: Object.assign({}, window.__sgPrueba), docCache: new Map(), tAuto: 0 };
const sgTE = new TextEncoder(), sgTD = new TextDecoder();
const sgCfg = () => { DB.sg = DB.sg && typeof DB.sg === "object" ? DB.sg : {}; return DB.sg; };
const sgFSA = () => typeof window.showDirectoryPicker === "function" && window.isSecureContext !== false && (() => { try { return window.self === window.top; } catch (e) { return false; } })();
const sgCryptoOK = () => !!(window.crypto && crypto.subtle && window.isSecureContext !== false);
const sgMB = (b) => b >= 1048576 ? grp(b / 1048576, 1) + " MB" : Math.max(b ? 1 : 0, Math.round(b / 1024)) + " KB";
const sgHtml = (s) => esc(s);
function sgHace(iso) {
  if (!iso) return "nunca"; const ms = Date.now() - Date.parse(iso); if (!(ms >= 0)) return "hoy";
  const m = Math.round(ms / 6e4); if (m < 2) return "hace un momento"; if (m < 60) return `hace ${m} min`;
  const h = Math.round(ms / 36e5); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(ms / 864e5); return d === 1 ? "ayer" : `hace ${d} días`;
}
const sgDiasDesde = (iso) => iso ? Math.floor((Date.now() - Date.parse(iso)) / 864e5) : Infinity;
function sgHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + "." + s.length.toString(36); }
function sgFechaHora(iso) { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? String(iso).slice(0, 10) : d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + (String(iso).length > 10 ? ", " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""); }
function sgRepintar() { if (SG.bloqueado) { sgPintarPantalla(); return; } if (typeof render === "function") { try { render(); } catch (e) { console.error(e); } } }

// ═════════ 1. Almacenamiento persistente y espacio ═════════
async function sgPersistir() {
  try {
    if (!navigator.storage || !navigator.storage.persist) { SG.persist = "na"; return; }
    let p = await navigator.storage.persisted(); if (!p) p = await navigator.storage.persist();
    SG.persist = p ? "si" : "no";
  } catch (e) { SG.persist = "na"; }
  await sgMedir();
}
async function sgMedir() {
  if (SG.almacen !== "idb") { try { SG.lsTam = (localStorage.getItem(KEY) || localStorage.getItem(SG_ENC) || "").length; } catch (e) {} }
  try { SG.docsTam = (typeof ARCH === "object" ? ARCH.lista : []).reduce((s, d) => s + (num(d.tam) || 0), 0); } catch (e) {}
  try { if (navigator.storage && navigator.storage.estimate) SG.estimate = await navigator.storage.estimate(); } catch (e) {}
}
const sgUsoLS = () => (SG.almacen === "idb" ? 0 : SG.lsTam / SG_LS_MAX);
// Uso del disco que el navegador deja a {{MARCA}} (con los expedientes en IndexedDB, el límite pasa a ser este)
const sgUsoDisco = () => (SG.estimate && SG.estimate.quota ? (SG.estimate.usage || 0) / SG.estimate.quota : 0);

// ── Expedientes en IndexedDB cuando ya no caben bien en localStorage (I11) ──
const sgDatosDB = () => sgIDB("hereda-datos", (db) => db.createObjectStore("kv"));
async function sgIdbLeer() { const db = await sgDatosDB(); try { return await sgReq(db.transaction("kv", "readonly").objectStore("kv").get("db")); } finally { db.close(); } }
async function sgIdbPoner(txt) { const db = await sgDatosDB(); try { await new Promise((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(txt, "db"); t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("Escritura cancelada")); }); } finally { db.close(); } }
async function sgIdbBorrar() { try { const db = await sgDatosDB(); try { await sgReq(db.transaction("kv", "readwrite").objectStore("kv").delete("db")); } finally { db.close(); } } catch (e) {} }
const sgMarcaIdb = (n, tam) => JSON.stringify({ f: "hereda+idb", v: 1, ts: new Date().toISOString(), n, tam });
// Escribe la base en claro en IndexedDB (las escrituras seguidas se agrupan: siempre gana la última) y deja la marca en localStorage.
// La marca se escribe después de que IndexedDB confirme: si algo falla a medias, localStorage sigue teniendo la versión anterior completa.
function sgGuardarIdb(txt) {
  SG.almacen = "idb"; SG.idbPend = txt; SG.lsTam = txt.length;
  if (SG.escribiendoIdb) return SG.escribiendoIdb;
  SG.escribiendoIdb = (async () => {
    while (SG.idbPend != null) {
      const t = SG.idbPend; SG.idbPend = null;
      try {
        await sgIdbPoner(t);
        localStorage.setItem(KEY, sgMarcaIdb((DB.expedientes || []).length, t.length));
        if (SG.errorGuardar) { SG.errorGuardar = null; setTimeout(sgRepintar, 0); }
      } catch (e) { sgFalloGuardar(e); }
    }
  })().finally(() => { SG.escribiendoIdb = null; });
  return SG.escribiendoIdb;
}
// Guarda la base en claro donde toque: localStorage mientras quepa con holgura; si no, IndexedDB
function sgEscribirClaro() {
  const s = JSON.stringify(DB);
  if (SG.almacen === "idb" || s.length > (SG.prueba.umbralIdb ?? SG_IDB_UMBRAL)) return sgGuardarIdb(s);
  try { localStorage.setItem(KEY, s); SG.lsTam = s.length; if (SG.errorGuardar) { SG.errorGuardar = null; setTimeout(sgRepintar, 0); } }
  catch (e) { if (/quota|exceed/i.test(String(e && (e.name + " " + e.message)))) return sgGuardarIdb(s); sgFalloGuardar(e); }
  return null;
}

// ═════════ 2. Guardado, sello de cambios y errores ═════════
// guardar() de logic.js delega aquí. Nunca escribe si hay pantalla de bloqueo o recuperación.
function sgGuardar() {
  if (SG.bloqueado || (typeof DB_BLOQUEO !== "undefined" && DB_BLOQUEO)) return;
  sgSellar();
  if (SG.cifrado && SG.clave) sgGuardarCifrado();
  else sgEscribirClaro();
  clearTimeout(SG.tAuto); SG.tAuto = setTimeout(() => sgCopiaAuto("cambio"), SG.prueba.retardoCopia ?? 4000);
}
function sgFalloGuardar(e) {
  const nuevo = !SG.errorGuardar;
  SG.errorGuardar = { t: new Date().toISOString(), cuota: /quota|exceed/i.test(String(e && (e.name + " " + e.message))), msg: String(e && e.message || e) };
  console.error("No se pudo guardar", e);
  if (nuevo) setTimeout(sgRepintar, 0);
}
// Marca x.actualizado en los expedientes que han cambiado desde el último guardado (huella del JSON sin ese campo).
function sgHuella(x) { return sgHash(JSON.stringify(x, (k, v) => (k === "actualizado" ? undefined : v))); }
function sgSellar(inicial) {
  const L = Array.isArray(DB.expedientes) ? DB.expedientes : [];
  if (!SG.huellas || inicial) { SG.huellas = new Map(L.map((x) => [x && x.id, sgHuella(x)])); return; }
  const ahora = new Date().toISOString(), vistos = new Map();
  for (const x of L) { if (!x || !x.id) continue; const h = sgHuella(x); if (SG.huellas.get(x.id) !== h) x.actualizado = ahora; vistos.set(x.id, h); }
  SG.huellas = vistos;
}
function sgMarcarCambio(x) { if (x && typeof x === "object") x.actualizado = new Date().toISOString(); }
// Fecha de la última modificación conocida: x.actualizado, o la última anotación de la bitácora, o el alta
function sgFecha(x) {
  if (!x) return 0; const a = Date.parse(x.actualizado || ""); if (a) return a;
  const b = (x.bitacora || []).reduce((m, e) => Math.max(m, Date.parse((e && e.t) || "") || 0), 0); if (b) return b;
  return Date.parse(x.creado || x.despacho?.alta || "") || 0;
}
async function sgEsperarEscrituras() { for (let i = 0; i < 20 && (SG.escribiendo || SG.escribiendoIdb); i++) { try { await (SG.escribiendo || SG.escribiendoIdb); } catch (e) {} } }

// ═════════ 3. Cifrado ═════════
const sgB64 = (buf) => { const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const sgDeB64 = (b) => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const sgAzar = (n) => crypto.getRandomValues(new Uint8Array(n));
async function sgFlujo(u8, T) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new T("gzip"))).arrayBuffer()); }
async function sgKEK(pass, salt, it) {
  const base = await crypto.subtle.importKey("raw", sgTE.encode(String(pass).normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: it }, base, { name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey"]);
}
async function sgNuevoSobre(pass, dek) {
  const salt = sgAzar(16), iv = sgAzar(12), it = SG.prueba.iteraciones || SG_IT;
  const kek = await sgKEK(pass, salt, it);
  const w = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv, additionalData: sgTE.encode("hereda+clave") });
  return { alg: "PBKDF2-SHA256/AES-GCM-256", it, salt: sgB64(salt), iv: sgB64(iv), w: sgB64(w) };
}
// Devuelve la clave de datos; lanza error si la contraseña no es correcta (falla la etiqueta GCM).
async function sgAbrirSobre(pass, k) {
  const kek = await sgKEK(pass, sgDeB64(k.salt), k.it);
  return crypto.subtle.unwrapKey("raw", sgDeB64(k.w), kek, { name: "AES-GCM", iv: sgDeB64(k.iv), additionalData: sgTE.encode("hereda+clave") }, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
async function sgCifrarBytes(dek, u8, aad) { const iv = sgAzar(12); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: sgTE.encode(aad) }, dek, u8); return { iv, ct: new Uint8Array(ct) }; }
async function sgDescifrarBytes(dek, iv, ct, aad) { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: sgTE.encode(aad) }, dek, ct)); }
async function sgCifrarTexto(dek, txt, aad) {
  let u = sgTE.encode(txt), z = 0;
  if (typeof CompressionStream === "function") { try { u = await sgFlujo(u, CompressionStream); z = 1; } catch (e) { u = sgTE.encode(txt); } }
  const { iv, ct } = await sgCifrarBytes(dek, u, aad); return { iv: sgB64(iv), z, ct: sgB64(ct) };
}
async function sgDescifrarTexto(dek, d, aad) {
  let u = await sgDescifrarBytes(dek, sgDeB64(d.iv), sgDeB64(d.ct), aad);
  if (d.z) u = await sgFlujo(u, DecompressionStream);
  return sgTD.decode(u);
}
const sgMetaClara = () => ({ despacho: (DB.despacho && DB.despacho.nombre) || "", tema: DB.tema || "claro", ts: new Date().toISOString() });
function sgGuardarCifrado() {
  SG.pendiente = true; if (SG.escribiendo) return SG.escribiendo;
  SG.escribiendo = (async () => {
    while (SG.pendiente) {
      SG.pendiente = false;
      try {
        const d = await sgCifrarTexto(SG.clave, JSON.stringify(DB), "hereda+db");
        const s = JSON.stringify({ f: "hereda+cifrado", v: 1, k: SG.sobre, d, meta: sgMetaClara() });
        localStorage.setItem(SG_ENC, s); SG.lsTam = s.length; if (SG.errorGuardar) { SG.errorGuardar = null; setTimeout(sgRepintar, 0); }
      } catch (e) { sgFalloGuardar(e); }
    }
  })().finally(() => { SG.escribiendo = null; });
  return SG.escribiendo;
}
function sgLeerSobre() { try { const o = JSON.parse(localStorage.getItem(SG_ENC) || "null"); return o && o.f === "hereda+cifrado" && o.k && o.d ? o : null; } catch (e) { return null; } }
// Activa la protección: genera la clave de datos, cifra la base, la comprueba leyéndola de nuevo y solo entonces borra la copia en claro.
async function sgActivarCifrado(pass) {
  const dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const k = await sgNuevoSobre(pass, dek);
  SG.clave = dek; SG.sobre = k; SG.cifrado = true;
  await sgGuardarCifrado();
  const env = sgLeerSobre(); if (!env) throw new Error("No se pudo escribir la copia cifrada");
  const prueba = JSON.parse(await sgDescifrarTexto(await sgAbrirSobre(pass, env.k), env.d, "hereda+db"));
  if (!Array.isArray(prueba.expedientes) || prueba.expedientes.length !== DB.expedientes.length) throw new Error("La comprobación del cifrado no coincide");
  await sgEsperarEscrituras(); try { localStorage.removeItem(KEY); } catch (e) {}
  if (SG.almacen === "idb") { await sgIdbBorrar(); SG.almacen = "ls"; } // la copia en claro de IndexedDB tampoco se conserva
  if (sgArchivosCableados()) await sgRecifrarArchivos(true);
}
async function sgQuitarCifrado(pass) {
  await sgAbrirSobre(pass, SG.sobre); // comprueba la contraseña
  await sgEsperarEscrituras();
  SG.cifrado = false; const w = sgEscribirClaro(); if (w) await w; // localStorage o, si no cabe, IndexedDB
  if (SG.errorGuardar) { SG.cifrado = true; throw new Error("No se pudo guardar la copia sin cifrar"); }
  if (sgArchivosCableados()) await sgRecifrarArchivos(false);
  SG.cifrado = false; SG.clave = null; SG.sobre = null; sgCfg().cifrarCopias = false;
  try { localStorage.removeItem(SG_ENC); } catch (e) {}
  guardar();
}
async function sgCambiarClave(actual, nueva) { await sgAbrirSobre(actual, SG.sobre); SG.sobre = await sgNuevoSobre(nueva, SG.clave); await sgGuardarCifrado(); }

// Documentos adjuntos (IndexedDB "sosiego-archivo"): se cifran con la misma clave si archivo.js está cableado (sgArchivoSellar/sgArchivoLeer).
const sgArchivosCableados = () => { try { return typeof archivoCargar === "function" && /sgArchivoLeer/.test(String(archivoCargar)); } catch (e) { return false; } };
async function sgEmpaquetar(meta, bytes) { const m = sgTE.encode(JSON.stringify(meta)); const u = new Uint8Array(4 + m.length + bytes.length); new DataView(u.buffer).setUint32(0, m.length); u.set(m, 4); u.set(bytes, 4 + m.length); return u; }
function sgDesempaquetar(u) { const n = new DataView(u.buffer, u.byteOffset).getUint32(0); return { meta: JSON.parse(sgTD.decode(u.subarray(4, 4 + n))), bytes: u.subarray(4 + n) }; }
async function sgArchivoSellar(d) {
  if (!SG.cifrado || !SG.clave || !d || d.sg) return d;
  const { blob, _b, ...m } = d; const b = blob || _b; const bytes = b ? new Uint8Array(await b.arrayBuffer()) : new Uint8Array(0);
  const { iv, ct } = await sgCifrarBytes(SG.clave, await sgEmpaquetar(m, bytes), "hereda+doc:" + d.id);
  return { id: d.id, expId: d.expId, sg: 1, iv, ct: ct.buffer };
}
async function sgArchivoLeer(lista) {
  const out = [];
  for (const r of lista || []) {
    if (!r) continue;
    if (!r.sg) { const { blob, ...m } = r; out.push({ ...m, _b: blob }); continue; }
    const ck = r.id + ":" + sgB64(r.iv);
    if (SG.docCache.has(ck)) { out.push(SG.docCache.get(ck)); continue; }
    try {
      if (!SG.clave) throw new Error("bloqueado");
      const { meta, bytes } = sgDesempaquetar(await sgDescifrarBytes(SG.clave, r.iv, r.ct, "hereda+doc:" + r.id));
      const o = { ...meta, id: r.id, expId: r.expId, _b: new Blob([bytes], { type: meta.tipo || "application/octet-stream" }) };
      SG.docCache.set(ck, o); out.push(o);
    } catch (e) { out.push({ id: r.id, expId: r.expId, tramiteId: "", nombre: "Documento cifrado que no se puede leer", tipo: "application/octet-stream", tam: 0, fecha: new Date(0).toISOString(), cat: "otros", _b: null, sgIlegible: true }); }
  }
  return out;
}
function sgIDB(nombre, alCrear) {
  return new Promise((res, rej) => { try { const r = indexedDB.open(nombre, 1); r.onupgradeneeded = () => alCrear(r.result); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
}
const sgDocsDB = () => sgIDB("sosiego-archivo", (db) => { const s = db.createObjectStore("docs", { keyPath: "id" }); s.createIndex("exp", "expId"); });
const sgReq = (q) => new Promise((res, rej) => { q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
async function sgDocsTodos() { const db = await sgDocsDB(); try { return await sgReq(db.transaction("docs", "readonly").objectStore("docs").getAll()); } finally { db.close(); } }
async function sgDocsPoner(recs) { if (!recs.length) return; const db = await sgDocsDB(); try { for (const r of recs) await sgReq(db.transaction("docs", "readwrite").objectStore("docs").put(r)); } finally { db.close(); } }
async function sgDocsBorrar(ids) { if (!ids.length) return; const db = await sgDocsDB(); try { for (const id of ids) await sgReq(db.transaction("docs", "readwrite").objectStore("docs").delete(id)); } finally { db.close(); } }
// Cifra (o descifra) todos los documentos guardados, uno a uno.
async function sgRecifrarArchivos(cifrar) {
  const L = await sgDocsTodos(); let n = 0;
  for (const r of L) {
    if (cifrar && !r.sg) { await sgDocsPoner([await sgArchivoSellar(r)]); n++; }
    else if (!cifrar && r.sg) { const [o] = await sgArchivoLeer([r]); if (o && !o.sgIlegible) { const { _b, ...m } = o; await sgDocsPoner([{ ...m, blob: _b }]); n++; } }
  }
  SG.docCache.clear();
  if (typeof archivoCargar === "function") await archivoCargar();
  return n;
}

// ── Bloqueo ──
function sgBloquear() {
  if (!SG.cifrado || SG.bloqueado) return;
  try { guardar(); } catch (e) {}
  try { sessionStorage.setItem("hereda.vista", JSON.stringify({ vista: ui.vista === "asist" ? "inicio" : ui.vista, id: ui.id, sec: ui.sec })); } catch (e) {}
  SG.bloqueado = true;
  try { $app.innerHTML = ""; } catch (e) {}
  sgEsperarEscrituras().then(() => location.reload());
}
function sgVigilarInactividad() {
  const marcar = () => { SG.act = Date.now(); };
  for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) window.addEventListener(ev, marcar, { capture: true, passive: true });
  const revisar = () => { if (!SG.cifrado || SG.bloqueado) return; const lim = SG.prueba.bloqueoMs || (num(sgCfg().bloqueoMin) || 15) * 6e4; if (Date.now() - SG.act >= lim) sgBloquear(); };
  setInterval(revisar, SG.prueba.bloqueoMs ? 200 : 5000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") revisar(); });
}

// ═════════ 4. Copias de seguridad ═════════
// Objeto de copia. Compatible con la importación de siempre (importarArchivo lee .expedientes y .despacho).
async function sgCopiaObjeto(docsModo) {
  if (typeof ARCH === "object" && !ARCH.listo && typeof archivoCargar === "function") { try { await archivoCargar(); } catch (e) {} }
  const { expedientes, despacho, ...resto } = DB;
  const docs = (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d && !d.sgIlegible).map((d) => ({ id: d.id, expId: d.expId, tramiteId: d.tramiteId || "", nombre: d.nombre, tipo: d.tipo, tam: d.tam, fecha: d.fecha, cat: d.cat, _b: d._b }));
  const o = { app: "hereda+", tipo: "copia", version: 5, appVersion: typeof VERSION_APP === "object" ? VERSION_APP.n : 0, fecha: hoy(), creado: new Date().toISOString(), despacho: despacho || null, expedientes, db: resto, documentos: docs };
  return o;
}
const sgHuellaCopia = (o) => sgHash(JSON.stringify({ e: o.expedientes, d: o.despacho, db: { ...o.db, ultimaCopia: 0, sg: 0, recientes: 0, tips: 0 }, docs: o.documentos.map((d) => [d.id, d.tam, d.nombre, d.expId, d.tramiteId, d.cat]) }));
// Serializa la copia como Blob (los documentos van en base64 dentro, en trozos, sin construir una cadena gigante)
async function sgCopiaBlob(o, conDocs) {
  const docs = o.documentos; const cab = JSON.stringify({ ...o, documentos: undefined });
  const partes = [cab.slice(0, -1) + ",\"documentos\":["];
  let primero = true, tam = 0, fuera = 0;
  for (const d of docs) {
    const { _b, ...m } = d;
    let data = null;
    if (conDocs && _b && tam + (d.tam || 0) <= SG_DESCARGA_MAX) { data = "data:" + (d.tipo || "application/octet-stream") + ";base64," + sgB64(new Uint8Array(await _b.arrayBuffer())); tam += d.tam || 0; } else if (conDocs) fuera++;
    partes.push((primero ? "" : ",") + JSON.stringify(data ? { ...m, data } : m)); primero = false;
  }
  partes.push("]}");
  return { blob: new Blob(partes, { type: "application/json" }), fuera };
}
async function sgCifrarCopia(blob, o) {
  const txt = await blob.text();
  const d = await sgCifrarTexto(SG.clave, txt, "hereda+copia");
  return new Blob([JSON.stringify({ f: "hereda+copia-cifrada", v: 1, k: SG.sobre, d, meta: { fecha: o.creado, n: o.expedientes.length, despacho: (o.despacho && o.despacho.nombre) || "" } })], { type: "application/json" });
}
const sgCifrarCopias = () => SG.cifrado && !!SG.clave && !!sgCfg().cifrarCopias;
async function sgDescargarCopia(prefijo) {
  try {
    const o = await sgCopiaObjeto();
    let { blob, fuera } = await sgCopiaBlob(o, true); const cif = sgCifrarCopias();
    if (cif) blob = await sgCifrarCopia(blob, o);
    await descargar(`${prefijo || "{{MARCA}} copia"} ${hoy()}.hereda.${cif ? "enc" : "json"}`, blob);
    DB.ultimaCopia = new Date().toISOString(); sgCfg().ultimaDescarga = DB.ultimaCopia; guardar();
    toast(fuera ? `Copia descargada sin ${plural(fuera, "documento")}: no caben en un archivo. Usa la copia automática en carpeta.` : `Copia descargada${o.documentos.length ? ` con ${plural(o.documentos.length, "documento")}` : ""}${cif ? " (cifrada)" : ""}`);
    sgRepintar();
  } catch (e) { console.error(e); toast("No se pudo preparar la copia"); }
}

// ── Copia automática en carpeta (File System Access API: Chrome y Edge) ──
const sgKV = () => sgIDB("hereda-seguridad", (db) => db.createObjectStore("kv"));
async function sgKVLeer(k) { try { const db = await sgKV(); try { return await sgReq(db.transaction("kv", "readonly").objectStore("kv").get(k)); } finally { db.close(); } } catch (e) { return undefined; } }
async function sgKVPoner(k, v) { const db = await sgKV(); try { await sgReq(db.transaction("kv", "readwrite").objectStore("kv").put(v, k)); } finally { db.close(); } }
async function sgKVBorrar(k) { try { const db = await sgKV(); try { await sgReq(db.transaction("kv", "readwrite").objectStore("kv").delete(k)); } finally { db.close(); } } catch (e) {} }
async function sgPermiso(h, pedir) {
  try { if (!h.queryPermission) return "granted"; let p = await h.queryPermission({ mode: "readwrite" }); if (p !== "granted" && pedir) p = await h.requestPermission({ mode: "readwrite" }); return p; } catch (e) { return "denied"; }
}
async function sgCarpetaCargar() {
  if (!sgFSA()) return;
  const r = await sgKVLeer("carpeta"); if (!r || !r.h) return;
  SG.carpeta = r.h; SG.carpetaPadre = r.padre || ""; SG.carpetaPermiso = await sgPermiso(r.h, false);
  sgRepintar();
  if (SG.carpetaPermiso === "granted") sgCopiaAuto("arranque");
}
// Con la pantalla de bloqueo o de recuperación: solo se recuerda la carpeta (para restaurar), sin escribir copias
async function sgCarpetaRecordar() { if (!sgFSA()) return; const r = await sgKVLeer("carpeta"); if (r && r.h) { SG.carpeta = r.h; SG.carpetaPadre = r.padre || ""; } }
async function sgElegirCarpeta() {
  if (!sgFSA()) { toast("Este navegador no permite elegir una carpeta. Usa Chrome o Edge, o descarga la copia."); return; }
  let dir; try { dir = await window.showDirectoryPicker({ id: "hereda-copias", mode: "readwrite", startIn: "documents" }); } catch (e) { return; }
  if ((await sgPermiso(dir, true)) !== "granted") { toast("Sin permiso para escribir en esa carpeta"); return; }
  let h = dir; if (!/^hereda\+?/i.test(dir.name)) { try { h = await dir.getDirectoryHandle("{{MARCA}} copias", { create: true }); } catch (e) { h = dir; } }
  SG.carpeta = h; SG.carpetaPadre = h === dir ? "" : dir.name; SG.carpetaPermiso = "granted"; SG.copiaError = null;
  try { await sgKVPoner("carpeta", { h, padre: SG.carpetaPadre, desde: new Date().toISOString() }); } catch (e) { console.error(e); }
  sgCfg().carpeta = { nombre: h.name, padre: SG.carpetaPadre }; guardar();
  const ok = await sgEscribirCopia(true);
  toast(ok ? `Copia automática activada en «${h.name}»` : "Carpeta elegida, pero no se pudo escribir la copia");
  sgRepintar();
}
async function sgReanudar() {
  if (!SG.carpeta) return;
  SG.carpetaPermiso = await sgPermiso(SG.carpeta, true);
  if (SG.carpetaPermiso === "granted") { const ok = await sgEscribirCopia(false); toast(ok ? "Copias automáticas reanudadas" : "Copias reanudadas"); }
  else toast("Sin permiso para la carpeta de copias");
  sgRepintar();
}
async function sgDesactivarCarpeta() { SG.carpeta = null; SG.carpetaPermiso = null; await sgKVBorrar("carpeta"); delete sgCfg().carpeta; guardar(); sgRepintar(); toast("Copia automática desactivada. Las copias ya hechas siguen en la carpeta."); }
function sgCopiaAuto(motivo) {
  if (!SG.carpeta || SG.carpetaPermiso !== "granted" || SG.bloqueado || SG.copiando) return;
  const c = sgCfg(), ult = c.ultimaAuto, horas = ult ? (Date.now() - Date.parse(ult)) / 36e5 : Infinity;
  const toca = !ult || ult.slice(0, 10) !== hoy() || horas >= (num(c.cadaH) || 2) || (motivo === "oculta" && horas >= 0.25) || motivo === "forzar";
  if (toca) sgEscribirCopia(motivo === "forzar");
}
async function sgEscribirArchivo(dir, nombre, datos) { const fh = await dir.getFileHandle(nombre, { create: true }); const w = await fh.createWritable(); await w.write(datos); await w.close(); }
// Escribe la copia del día (sobrescribe la de hoy), los documentos nuevos y rota: conserva las últimas 30 copias diarias.
async function sgEscribirCopia(forzar) {
  if (!SG.carpeta || SG.copiando) return false;
  SG.copiando = true;
  try {
    const dir = SG.carpeta, c = sgCfg(), cif = sgCifrarCopias();
    const o = await sgCopiaObjeto(); const huella = sgHuellaCopia(o) + (cif ? ":c" : "");
    const nombre = `{{MARCA}} copia ${hoy()}.hereda.${cif ? "enc" : "json"}`;
    let hayHoy = false; try { await dir.getFileHandle(nombre); hayHoy = true; } catch (e) {}
    if (!forzar && hayHoy && c.hashCopia === huella) { c.ultimaAuto = new Date().toISOString(); return true; }
    // Documentos: uno por archivo en «Documentos», escritos una sola vez (no se repiten en cada copia diaria)
    const ddir = await dir.getDirectoryHandle("Documentos", { create: true });
    const hay = new Set(); for await (const [n] of ddir.entries()) hay.add(n);
    for (const d of o.documentos) {
      const n = d.id + (cif ? ".enc" : ".bin"); d.archivo = "Documentos/" + n;
      if (hay.has(n) || !d._b) continue;
      let bytes = new Uint8Array(await d._b.arrayBuffer());
      if (cif) { const { iv, ct } = await sgCifrarBytes(SG.clave, bytes, "hereda+doc:" + d.id); bytes = new Uint8Array(12 + ct.length); bytes.set(iv); bytes.set(ct, 12); }
      await sgEscribirArchivo(ddir, n, bytes);
    }
    let { blob } = await sgCopiaBlob(o, false);
    if (cif) blob = await sgCifrarCopia(blob, o);
    await sgEscribirArchivo(dir, nombre, blob);
    // Rotación de copias diarias
    const copias = []; for await (const [n, h] of dir.entries()) { const m = h.kind === "file" && SG_COPIA_RE.exec(n); if (m) copias.push([m[1], n]); }
    const fechas = [...new Set(copias.map(([f]) => f))].sort().reverse(), guardar30 = new Set(fechas.slice(0, SG_CONSERVAR));
    for (const [f, n] of copias) if (!guardar30.has(f)) { try { await dir.removeEntry(n); } catch (e) {} }
    // Documentos que ya no están en la app: se borran de la carpeta 31 días después de notarlo (las copias anteriores aún los citan)
    const vivos = new Set(o.documentos.map((d) => d.id)); c.fuera = c.fuera && typeof c.fuera === "object" ? c.fuera : {};
    for (const n of hay) { const id = n.replace(/\.(bin|enc)$/, ""); if (vivos.has(id)) { delete c.fuera[n]; continue; } if (!c.fuera[n]) c.fuera[n] = hoy(); else if (sgDiasDesde(c.fuera[n]) > SG_CONSERVAR) { try { await ddir.removeEntry(n); } catch (e) {} delete c.fuera[n]; } }
    const ahora = new Date().toISOString(); c.ultimaAuto = ahora; c.hashCopia = huella; DB.ultimaCopia = ahora; SG.copiaError = null;
    guardar(); clearTimeout(SG.tAuto);
    return true;
  } catch (e) {
    console.error("Copia automática", e); SG.copiaError = String(e && e.message || e);
    if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) SG.carpetaPermiso = "prompt";
    if (e && e.name === "NotFoundError") SG.copiaError = "La carpeta de copias ya no existe o se ha movido. Elígela de nuevo.";
    sgRepintar(); return false;
  } finally { SG.copiando = false; }
}
async function sgListarCopias(dir) {
  const L = []; for await (const [n, h] of dir.entries()) { const m = h.kind === "file" && /\.hereda\.(json|enc)$/.test(n) && /copia|antes de restaurar/i.test(n); if (m) { let f = null; try { f = await h.getFile(); } catch (e) {} L.push({ n, h, tam: f ? f.size : 0, mod: f ? f.lastModified : 0 }); } }
  return L.sort((a, b) => b.mod - a.mod);
}

// ── Restaurar ──
function sgNormalizar(o) {
  if (!o || typeof o !== "object" || o.tipo === "familia" || o.tipo === "expediente" || !Array.isArray(o.expedientes)) return null;
  return { creado: o.creado || o.fecha || "", expedientes: o.expedientes.filter((q) => q && typeof q === "object" && q.id), despacho: o.despacho || null, db: o.db && typeof o.db === "object" ? o.db : null, documentos: Array.isArray(o.documentos) ? o.documentos.filter((d) => d && d.id && d.expId) : [], legado: o.app !== "hereda+" };
}
// Punto de entrada para cualquier archivo elegido: copias (también cifradas) con vista previa; expedientes y datos de la familia, por la vía de siempre.
async function sgAbrirArchivo(file, dir) {
  if (!file) return;
  let txt; try { txt = await file.text(); } catch (e) { toast("No se pudo leer el archivo"); return; }
  let o; try { o = JSON.parse(txt); } catch (e) { toast("El archivo no es una copia de {{MARCA}}"); return; }
  if (o && o.f === "hereda+copia-cifrada") { SG.restaurar = { cifrada: o, nombre: file.name, dir }; sgModalRestaurar(); return; }
  const c = sgNormalizar(o);
  if (!c) { if (SG.bloqueado) { toast("Ese archivo no es una copia de seguridad completa"); return; } if (typeof importarArchivo === "function") importarArchivo(txt); return; }
  SG.restaurar = { c, nombre: file.name, dir, tam: file.size, modo: (DB.expedientes || []).length && !sgSoloLectura() ? "combinar" : "reemplazar" }; sgModalRestaurar();
}
async function sgDescifrarCopiaElegida(pass) {
  const R = SG.restaurar; const o = R.cifrada;
  let dek; try { dek = await sgAbrirSobre(pass, o.k); } catch (e) { return false; }
  const c = sgNormalizar(JSON.parse(await sgDescifrarTexto(dek, o.d, "hereda+copia")));
  if (!c) throw new Error("Copia cifrada sin expedientes");
  R.c = c; R.dek = dek; R.modo = (DB.expedientes || []).length && !sgSoloLectura() ? "combinar" : "reemplazar"; delete R.cifrada; return true;
}
function sgResumenCopia(c) {
  const loc = new Map((DB.expedientes || []).map((x) => [x.id, x])); let nuevos = 0, masNuevos = 0, iguales = 0;
  for (const q of c.expedientes) { const l = loc.get(q.id); if (!l) nuevos++; else if (sgFecha(q) > sgFecha(l)) masNuevos++; else iguales++; }
  const ids = new Set(c.expedientes.map((q) => q.id)); const soloAqui = (DB.expedientes || []).filter((x) => !ids.has(x.id)).length;
  return { n: c.expedientes.length, nuevos, masNuevos, iguales, soloAqui, docs: c.documentos.length, docsDentro: c.documentos.filter((d) => d.data).length };
}
async function sgBytesDoc(d, R) {
  if (d.data) { const b = String(d.data).split(",")[1] || ""; return sgDeB64(b); }
  if (d.archivo && R.dir) {
    const [carp, nom] = d.archivo.split("/"); const fh = await (await R.dir.getDirectoryHandle(carp)).getFileHandle(nom);
    let u = new Uint8Array(await (await fh.getFile()).arrayBuffer());
    if (/\.enc$/.test(nom)) { const dek = R.dek || SG.clave; if (!dek) throw new Error("sin clave"); u = await sgDescifrarBytes(dek, u.subarray(0, 12), u.subarray(12), "hereda+doc:" + d.id); }
    return u;
  }
  return null;
}
// Aplica la copia. modo: "combinar" (añade nuevos y conserva el más reciente de cada expediente) o "reemplazar" (este equipo queda como la copia).
const sgSoloLectura = () => typeof licSoloLectura === "function" && licSoloLectura() && !SG.bloqueado;
async function sgAplicarCopia(modo) {
  const R = SG.restaurar, c = R.c; const S = sgResumenCopia(c);
  // Licencia caducada: combinar añadiría expedientes (y el vigilante de la licencia los quitaría en silencio); solo se permite reemplazar (M2)
  if (modo === "combinar" && sgSoloLectura() && (DB.expedientes || []).length) { toast(typeof licMotivoBloqueo === "function" ? licMotivoBloqueo() : "Solo lectura"); return; }
  if (modo === "reemplazar" && !SG.bloqueado && (DB.expedientes || []).length) {
    if (SG.carpeta && SG.carpetaPermiso === "granted") { try { const o = await sgCopiaObjeto(); const { blob } = await sgCopiaBlob(o, false); await sgEscribirArchivo(SG.carpeta, `{{MARCA}} antes de restaurar ${new Date().toISOString().slice(0, 16).replace(/[T:]/g, (m) => m === "T" ? " " : "")}.hereda.json`, sgCifrarCopias() ? await sgCifrarCopia(blob, o) : blob); } catch (e) { console.error(e); } }
    else await sgDescargarCopia("{{MARCA}} antes de restaurar");
  }
  let anad = 0, act = 0;
  // Licencia: se conserva el código de activación (el de este equipo o el de la copia) y la fecha de primer uso más antigua
  const lc = DB.licencia || {}, lb = (c.db && c.db.licencia) || {};
  const licencia = (lc.codigo || lb.codigo || lc.primerUso || lb.primerUso) ? Object.assign({}, lb, lc, { codigo: lc.codigo || lb.codigo, primerUso: [lc.primerUso, lb.primerUso].filter(Boolean).sort()[0] }) : undefined;
  if (!licencia || !licencia.codigo) { if (licencia) delete licencia.codigo; }
  if (modo === "reemplazar") {
    const mantener = {}; for (const k of ["sg", "ultimaCopia", "bienvenida"]) if (DB[k] !== undefined) mantener[k] = DB[k];
    DB = Object.assign({ expedientes: [], modo: "profesional", tema: DB.tema || "claro" }, c.db || {}, { expedientes: c.expedientes, despacho: c.despacho || DB.despacho }, mantener);
    anad = c.expedientes.length;
  } else {
    for (const q of c.expedientes) { const i = DB.expedientes.findIndex((x) => x.id === q.id); if (i < 0) { DB.expedientes.push(q); anad++; } else if (sgFecha(q) > sgFecha(DB.expedientes[i])) { DB.expedientes[i] = q; act++; } }
    if (c.despacho && !(DB.despacho && DB.despacho.nombre)) DB.despacho = c.despacho;
  }
  if (licencia) DB.licencia = licencia;
  if (typeof DB_BLOQUEO !== "undefined") DB_BLOQUEO = null;
  let apartados = 0; try { apartados = typeof rbAislar === "function" ? rbAislar() : 0; } catch (e) { console.error(e); }
  // Documentos (mismo id: restaurar dos veces no los duplica)
  let docs = 0, docsFallo = 0;
  try {
    const ids = new Set([...DB.expedientes.map((x) => x.id), ...(Array.isArray(DB.danados) ? DB.danados.map((d) => d && d.x && d.x.id) : [])]); const existentes = await sgDocsTodos(); const hay = new Set(existentes.map((r) => r.id));
    const recs = [];
    for (const d of c.documentos) {
      if (!ids.has(d.expId) || hay.has(d.id)) continue;
      try { const u = await sgBytesDoc(d, R); if (!u) { docsFallo++; continue; } const { data, archivo, ...m } = d; const rec = { ...m, tramiteId: m.tramiteId || "", blob: new Blob([u], { type: d.tipo || "application/octet-stream" }) }; recs.push(sgArchivosCableados() ? await sgArchivoSellar(rec) : rec); docs++; } catch (e) { docsFallo++; }
    }
    await sgDocsPoner(recs);
    if (modo === "reemplazar") await sgDocsBorrar(existentes.filter((r) => !ids.has(r.expId)).map((r) => r.id));
  } catch (e) { console.error(e); }
  SG.huellas = null; sgSellar(true);
  const bloqueado = SG.bloqueado; SG.bloqueado = false; guardar(); if (SG.cifrado) await sgEsperarEscrituras();
  SG.restaurar = null; sgCerrarModal();
  const txt = (modo === "reemplazar" ? `Copia restaurada: ${plural(anad, "expediente")}` : `Copia combinada: ${plural(anad, "expediente nuevo", "expedientes nuevos")} y ${plural(act, "actualizado", "actualizados")}`) + (apartados ? ` · ${apartados === 1 ? "1 con datos dañados, apartado" : apartados + " con datos dañados, apartados"} para repararlos` : "");
  if (bloqueado) { try { sessionStorage.setItem("hereda.aviso", txt); } catch (e) {} location.reload(); return; }
  if (typeof archivoCargar === "function") await archivoCargar();
  if (typeof go === "function") go({ vista: "inicio", id: null, sheet: null });
  toast(txt + (docs ? ` · ${plural(docs, "documento")}` : "") + (docsFallo ? ` · ${docsFallo} sin recuperar` : ""));
}
async function sgRestaurarDesdeCarpeta(elegir) {
  let dir = !elegir && SG.carpeta;
  if (dir && (await sgPermiso(dir, true)) !== "granted") dir = null;
  if (!dir) { if (!sgFSA()) { toast("Este navegador no permite abrir carpetas: elige el archivo de la copia"); return; } try { dir = await window.showDirectoryPicker({ id: "hereda-copias", mode: "read" }); } catch (e) { return; } }
  let L = await sgListarCopias(dir);
  if (!L.length) { try { const sub = await dir.getDirectoryHandle("{{MARCA}} copias"); L = await sgListarCopias(sub); dir = sub; } catch (e) {} }
  if (!L.length) { toast("No hay copias de {{MARCA}} en esa carpeta"); return; }
  SG.restaurar = { lista: L.slice(0, 12), dir }; sgModalRestaurar();
}

// ═════════ 5. Actualizaciones (service worker) ═════════
function sgVersionPagina() {
  const m = document.querySelector('meta[name="hereda-version"]'); if (m && m.content) return m.content;
  for (const s of document.scripts) { const r = /sw\.js\?v=(\w+)/.exec(s.textContent || ""); if (r) return r[1]; }
  return "";
}
function sgVersionSW(w) {
  return new Promise((res) => { try { const ch = new MessageChannel(); const t = setTimeout(() => res(""), 2000); ch.port1.onmessage = (e) => { clearTimeout(t); res((e.data && e.data.version) || ""); }; w.postMessage({ hereda: "version" }, [ch.port2]); } catch (e) { res(""); } });
}
function sgSWIniciar() {
  if (SG.swIniciado || !("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return; SG.swIniciado = true;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (SG.recargar) location.reload(); });
  navigator.serviceWorker.ready.then((reg) => {
    SG.reg = reg;
    if (reg.waiting) sgSWEsperando(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) sgSWEsperando(w); }); });
    setInterval(() => reg.update().catch(() => {}), 30 * 6e4);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - SG.revisado > 10 * 6e4) { SG.revisado = Date.now(); reg.update().catch(() => {}); } });
  }).catch(() => {});
}
// Si la versión que espera es la misma que ya se ve (la página llegó por red), se activa sin molestar; si es otra, se avisa.
async function sgSWEsperando(w) {
  const v = await sgVersionSW(w), p = sgVersionPagina();
  if (v && p && v === p) { try { w.postMessage({ hereda: "activar" }); } catch (e) {} return; }
  SG.actualizacion = { w, v }; sgRepintar();
}
async function sgActualizar() {
  try { guardar(); } catch (e) {} await sgEsperarEscrituras();
  const w = (SG.actualizacion && SG.actualizacion.w) || (SG.reg && SG.reg.waiting);
  if (!w || w.state === "redundant") { location.reload(); return; }
  SG.recargar = true; w.postMessage({ hereda: "activar" }); setTimeout(() => location.reload(), 4000);
}
async function sgBuscarActualizacion() {
  if (!SG.reg) { toast("Las actualizaciones automáticas solo funcionan en la versión publicada"); return; }
  try { await SG.reg.update(); } catch (e) {}
  setTimeout(() => { if (!SG.actualizacion) toast("Tienes la última versión"); }, 1500);
}

// ═════════ 6. Arranque y salud de los datos ═════════
function sgValidarDB(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return "La base de datos no tiene la forma esperada.";
  if (!Array.isArray(o.expedientes)) return "La lista de expedientes falta o está dañada.";
  // Un expediente dañado ya no bloquea toda la base: rbAislar (robustez.js) lo aparta de la cartera al arrancar (C1)
  if (o.despacho != null && typeof o.despacho !== "object") return "Los datos del despacho están dañados.";
  return "";
}
function sgCrudo() { if (SG.crudoIdb) return SG.crudoIdb; try { return localStorage.getItem(KEY) || localStorage.getItem(SG_ENC) || ""; } catch (e) { return ""; } }
function sgArranque(continuar) {
  SG.continuar = continuar; sgEventos();
  const est = typeof DB_BLOQUEO !== "undefined" ? DB_BLOQUEO : null;
  if (est === "cifrado") {
    const env = sgLeerSobre();
    if (!env) { SG.pantalla = { tipo: "danado", motivo: "Los datos cifrados están dañados.", crudo: sgCrudo() }; }
    else if (!sgCryptoOK()) { SG.pantalla = { tipo: "danado", motivo: "Este navegador no puede descifrar los datos (hace falta una conexión segura https).", crudo: "" }; }
    else SG.pantalla = { tipo: "bloqueo", env };
    SG.bloqueado = true; sgPintarPantalla(); sgSWIniciar(); sgCarpetaRecordar(); return;
  }
  if (est === "idb") { sgArranqueIdb(); return; }
  const mal = est === "danado" ? "El archivo interno de los expedientes no se puede leer." : sgValidarDB(DB);
  if (mal) { SG.bloqueado = true; SG.pantalla = { tipo: "danado", motivo: mal, crudo: sgCrudo() }; sgPintarPantalla(); sgSWIniciar(); sgCarpetaRecordar(); return; }
  sgSeguir();
}
// Arranque con los expedientes en IndexedDB: se leen (asíncrono; mientras, el esqueleto de carga) y se sigue como siempre
async function sgArranqueIdb() {
  SG.almacen = "idb"; let txt = null, o = null, mal = "";
  try { txt = await sgIdbLeer(); } catch (e) { mal = "No se puede abrir la base de datos del navegador donde están los expedientes (" + String(e && e.message || e) + ")."; }
  if (!mal) { if (typeof txt !== "string") mal = "Faltan los expedientes en la base de datos del navegador (puede que se hayan borrado los datos del sitio)."; else { try { o = JSON.parse(txt); } catch (e) { mal = "El archivo interno de los expedientes no se puede leer."; } } }
  if (!mal) mal = sgValidarDB(o);
  if (mal) { SG.crudoIdb = typeof txt === "string" ? txt : ""; SG.bloqueado = true; SG.pantalla = { tipo: "danado", motivo: mal, crudo: SG.crudoIdb }; sgPintarPantalla(); sgSWIniciar(); sgCarpetaRecordar(); return; }
  DB = Object.assign({ expedientes: [], modo: "profesional", tema: "claro" }, o);
  if (DB.temaV !== 2) { DB.tema = "claro"; DB.temaV = 2; }
  if (typeof DB_BLOQUEO !== "undefined") DB_BLOQUEO = null;
  SG.lsTam = txt.length; sgSeguir();
}
function sgSeguir() {
  SG.bloqueado = false; SG.pantalla = null; document.querySelector(".sg-lock")?.remove();
  if (SG.cifrado) { try { localStorage.removeItem(KEY); } catch (e) {} }
  // Expedientes con datos imposibles: se arreglan solos si no se pierde nada; si no, se apartan de la cartera (robustez.js)
  let apartados = 0; try { apartados = typeof rbAislar === "function" ? rbAislar() : 0; } catch (e) { console.error(e); }
  if (apartados) setTimeout(() => { try { toast(`${apartados === 1 ? "Un expediente tiene" : apartados + " expedientes tienen"} datos dañados: ${apartados === 1 ? "está apartado" : "están apartados"} en Expedientes para repararlos`); } catch (e) {} }, 600);
  sgSellar(true);
  try { if (SG.continuar) SG.continuar(); } catch (e) { console.error(e); }
  try { const v = JSON.parse(sessionStorage.getItem("hereda.vista") || "null"); sessionStorage.removeItem("hereda.vista"); if (v && typeof go === "function" && (v.vista !== "exp" || DB.expedientes.some((x) => x.id === v.id))) go({ vista: v.vista, id: v.id, sec: v.sec || "resumen" }); } catch (e) {}
  try { const t = sessionStorage.getItem("hereda.aviso"); if (t) { sessionStorage.removeItem("hereda.aviso"); setTimeout(() => toast(t), 300); } } catch (e) {}
  sgPersistir().then(sgRepintar); sgCarpetaCargar(); sgSWIniciar();
  if (typeof redArrancar === "function") redArrancar(); // red.js: despacho en red (carpeta compartida)
  if (!SG.vigilando) { SG.vigilando = true; sgVigilarInactividad(); setInterval(() => sgCopiaAuto("reloj"), SG.prueba.relojCopia || 5 * 6e4); }
}
async function sgDesbloquear(pass) {
  const P = SG.pantalla; if (!P || P.tipo !== "bloqueo" || SG.ocupado) return;
  SG.ocupado = true; P.error = ""; sgPintarPantalla(true);
  const t0 = performance.now(); let dek;
  P.env = sgLeerSobre() || P.env; // otra ventana pudo guardar mientras tanto
  try { dek = await sgAbrirSobre(pass, P.env.k); }
  catch (e) { SG.intentos++; await new Promise((r) => setTimeout(r, Math.min(4000, SG.intentos > 3 ? (SG.intentos - 3) * 1000 : 0))); P.error = "Contraseña incorrecta"; SG.ocupado = false; sgPintarPantalla(); document.getElementById("sg-pass")?.select(); return; }
  SG.ultimoDesbloqueoMs = Math.round(performance.now() - t0);
  let o = null, txt = "";
  try { txt = await sgDescifrarTexto(dek, P.env.d, "hereda+db"); o = JSON.parse(txt); } catch (e) { o = null; }
  const mal = o ? sgValidarDB(o) : "Los datos cifrados están dañados y no se pueden descifrar.";
  SG.clave = dek; SG.sobre = P.env.k; SG.cifrado = true; SG.ocupado = false; SG.intentos = 0;
  if (mal) { SG.pantalla = { tipo: "danado", motivo: mal, crudo: txt || sgCrudo() }; sgPintarPantalla(); return; }
  DB = Object.assign({ expedientes: [], modo: "profesional", tema: "claro" }, o);
  if (typeof DB_BLOQUEO !== "undefined") DB_BLOQUEO = null;
  SG.act = Date.now(); sgSeguir();
}
function sgEmpezarVacio() {
  const P = SG.pantalla; if (!P) return;
  if (P.crudo) descargar(`{{MARCA}} datos danados ${hoy()}.txt`, new Blob([P.crudo], { type: "text/plain" }));
  try { localStorage.removeItem(KEY); localStorage.removeItem(SG_ENC); } catch (e) {}
  if (SG.almacen === "idb") { sgIdbBorrar(); SG.almacen = "ls"; SG.crudoIdb = ""; }
  if (P.crudo) { try { localStorage.setItem(KEY + ".danado", P.crudo); } catch (e) {} }
  SG.cifrado = false; SG.clave = null; DB = { expedientes: [], modo: "profesional", tema: DB.tema || "claro" };
  if (typeof DB_BLOQUEO !== "undefined") DB_BLOQUEO = null;
  sgSeguir(); guardar();
}

// ═════════ 7. Interfaz ═════════
const SG_IC = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.8 13.2l2.2 2.3 2.2-2.3"/></svg>',
  restore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4h4"/><path d="M12 8v4.5l3 1.8"/></svg>',
  disk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.3v.2"/></svg>',
};
const sgFila = (ico, cls, tit, sub, der, attrs) => `<${attrs ? "button" : "div"} class="row sg-row" ${attrs || ""}><span class="ico ${cls}">${ico}</span><span class="t"><b>${tit}</b>${sub ? `<small>${sub}</small>` : ""}</span>${der || ""}</${attrs ? "button" : "div"}>`;
function sgEstadoCopiaTxt() { const u = DB.ultimaCopia; return u ? `Última copia: ${sgHace(u)}` : "Aún no hay ninguna copia"; }
// Sección completa para la hoja «Despacho y ajustes» (sustituye a la fila «Descargar copia de seguridad»)
function sgAjustesHTML() {
  const c = sgCfg(), fsa = sgFSA(), car = SG.carpeta, perm = SG.carpetaPermiso, chev = I.chev;
  let auto;
  if (!fsa) auto = sgFila(SG_IC.folder, "q", "Copia automática", "Este navegador no puede guardar copias en una carpeta (solo Chrome y Edge). Cada semana te recordaremos descargar una.", "");
  else if (!car) auto = sgFila(SG_IC.folder, "blue", "Activar la copia automática", "Elige una carpeta, mejor dentro de OneDrive, Dropbox, Google Drive o el servidor del despacho. {{MARCA}} guarda allí una copia cada día.", chev, 'data-sg="carpeta"');
  else if (perm !== "granted") auto = sgFila(SG_IC.folder, "orange", "Reanudar las copias automáticas", `El navegador pide permiso de nuevo para escribir en «${sgHtml(car.name)}».`, chev, 'data-sg="reanudar"');
  else auto = sgFila(SG_IC.folder, "green", "Copia automática activada", `Carpeta «${sgHtml(car.name)}»${SG.carpetaPadre ? " dentro de «" + sgHtml(SG.carpetaPadre) + "»" : ""} · ${c.ultimaAuto ? "última " + sgHace(c.ultimaAuto) : "pendiente"}${SG.copiaError ? ` · <span class="sg-err">${sgHtml(SG.copiaError)}</span>` : ""}`, `<span class="sg-acts"><button class="btn sm gray" data-sg="copiarYa">Copiar ahora</button></span>`);
  const cada = car && perm === "granted" ? `<div class="field"><label>Mientras {{MARCA}} está abierto, copiar también cada</label><div class="seg block" style="margin-top:6px">${[1, 2, 4, 8].map((h) => `<button data-sg="cada" data-v="${h}" aria-pressed="${(num(c.cadaH) || 2) === h}">${h} h</button>`).join("")}</div><span class="hint">Se conservan las últimas ${SG_CONSERVAR} copias diarias. Los documentos se guardan una sola vez en la subcarpeta «Documentos».</span></div>` : "";
  const otras = car ? `<div class="sg-mini"><button data-sg="carpeta">Cambiar de carpeta</button><button data-sg="desactivar">Desactivar</button></div>` : "";
  const descargaF = sgFila(I.dl, "green", "Descargar una copia ahora", `${sgEstadoCopiaTxt()} · todos los expedientes, el equipo, los ajustes y los documentos en un archivo${sgCifrarCopias() ? " cifrado" : ""}`, chev, 'data-sg="descargar"');
  const restF = `<label class="row sg-row" style="cursor:pointer;position:relative;overflow:hidden"><span class="ico blue">${SG_IC.restore}</span><span class="t"><b>Restaurar una copia</b><small>Antes de cambiar nada verás qué contiene y podrás combinarla con lo que hay o reemplazarlo</small></span>${chev}<input type="file" data-sgf="restaurar" accept=".json,.enc,application/json" class="sg-file" aria-label="Elegir una copia"></label>${fsa ? sgFila(SG_IC.folder, "q", "Restaurar desde la carpeta de copias", "Para un equipo nuevo o tras un borrado: elige la carpeta y la copia, con sus documentos", chev, 'data-sg="desdeCarpeta"') : ""}`;
  // Contraseña
  let pw;
  if (!sgCryptoOK()) pw = `<div class="group">${sgFila(SG_IC.lock, "q", "Proteger con contraseña", "No disponible aquí: hace falta abrir {{MARCA}} desde su dirección segura (https).", "")}</div>`;
  else if (!SG.cifrado) pw = `<div class="group" style="--inset:60px">${sgFila(SG_IC.lock, "indigo", "Proteger con contraseña", "Cifra los expedientes en este equipo. Al abrir {{MARCA}} o tras un rato sin uso, pedirá la contraseña.", chev, 'data-sg="activarPw"')}</div>`;
  else pw = `<div class="group" style="--inset:60px">${sgFila(SG_IC.shield, "green", "Protegido con contraseña", `Cifrado AES-256${sgArchivosCableados() ? ", también los documentos" : ""}. Bloquear ahora: ${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘L" : "Ctrl+L"}`, `<span class="sg-acts"><button class="btn sm gray" data-sg="bloquear">Bloquear</button></span>`)}
      <div class="field"><label>Bloquear tras un tiempo sin uso</label><div class="seg block" style="margin-top:6px">${[5, 15, 30, 60].map((m) => `<button data-sg="min" data-v="${m}" aria-pressed="${(num(c.bloqueoMin) || 15) === m}">${m} min</button>`).join("")}</div></div>
      <button class="row sg-row" data-sg="cifrarCopias" role="switch" aria-checked="${!!c.cifrarCopias}"><span class="ico q">${SG_IC.shield}</span><span class="t"><b>Cifrar también las copias</b><small>Las copias solo se podrán abrir con la contraseña vigente cuando se hicieron</small></span><span class="sg-sw" aria-hidden="true"></span></button>
      ${sgFila(SG_IC.lock, "q", "Cambiar la contraseña", "", chev, 'data-sg="cambiarPw"')}${sgFila(SG_IC.lock, "q", "Quitar la contraseña", "Los datos vuelven a guardarse sin cifrar en este equipo", chev, 'data-sg="quitarPw"')}</div>`;
  const cubre = SG.cifrado ? `<p class="group-foot">Se cifran los expedientes, el equipo, los ajustes${sgArchivosCableados() ? " y los documentos adjuntos" : ""}. Quedan sin cifrar el nombre del despacho y el tema (para la pantalla de bloqueo)${sgArchivosCableados() ? "" : ", los documentos adjuntos"} y las copias${c.cifrarCopias ? " descargadas antes de activar el cifrado de copias" : ", salvo que actives «Cifrar también las copias»"}. Protege si alguien abre o se lleva el equipo; no protege frente a programas maliciosos mientras {{MARCA}} está desbloqueado.</p>` : `<p class="group-foot">Si olvidas la contraseña, nadie puede recuperar los datos cifrados, tampoco {{MARCA}}: solo una copia de seguridad.</p>`;
  // Almacenamiento
  const uso = SG.almacen === "idb" ? sgUsoDisco() : sgUsoLS(), pct = Math.min(100, Math.round(uso * 100));
  const per = SG.persist === "si" ? ["green", "Protegido contra el borrado automático del navegador", "El navegador no borrará estos datos aunque falte espacio en el disco."]
    : SG.persist === "no" ? ["orange", "No protegido frente al borrado automático", "Si el disco se llena, el navegador podría borrar los datos. Instala {{MARCA}} como aplicación o añádelo a marcadores, y activa la copia automática."]
    : SG.persist === "na" ? ["q", "Este navegador no permite proteger el almacenamiento", "Haz copias de seguridad con regularidad."] : ["q", "Comprobando el almacenamiento…", ""];
  const est = SG.estimate && SG.estimate.quota ? ` · {{MARCA}} ocupa ${sgMB(SG.estimate.usage || 0)} de ${sgMB(SG.estimate.quota)} disponibles en este equipo` : "";
  const alm = `<div class="group" style="--inset:60px">${sgFila(SG_IC.shield, per[0], per[1], per[2], "")}
    <div class="row sg-row"><span class="ico ${uso > 0.8 ? "orange" : "q"}">${SG_IC.disk}</span><span class="t"><b>Espacio para los expedientes</b><small>${SG.almacen === "idb" ? `${sgMB(SG.lsTam)} en la base de datos del navegador (sin el límite de 5 MB; al crecer pasaron allí solos)` : `${sgMB(SG.lsTam)} de unos ${sgMB(SG_LS_MAX)} (${pct} %)${SG.cifrado ? ", comprimidos y cifrados" : ". Al llegar al 60 % pasan solos a la base de datos del navegador, sin ese límite"}`} · documentos ${sgMB(SG.docsTam)}${est}</small><span class="sg-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Espacio usado"><i style="width:${Math.max(2, pct)}%" class="${uso > 0.8 ? "alto" : ""}"></i></span></span></div>
    ${sgFila(SG_IC.up, SG.actualizacion ? "blue" : "q", SG.actualizacion ? "Hay una versión nueva" : "Versión instalada", sgHtml(sgVersionPagina() ? sgVersionPagina().replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$3/$2/$1 $4:$5 UTC") : (typeof VERSION_APP === "object" ? VERSION_APP.nombre : "")), `<span class="sg-acts"><button class="btn sm gray" data-sg="${SG.actualizacion ? "actualizar" : "buscarAct"}">${SG.actualizacion ? "Actualizar" : "Buscar"}</button></span>`)}</div>`;
  return `<div class="sectitle">Copias de seguridad</div><div class="group sg-g" style="--inset:60px">${auto}${cada}${descargaF}${restF}</div>${otras}
    <div class="sectitle">Contraseña y bloqueo</div>${pw}${cubre}
    <div class="sectitle">Almacenamiento y versión</div>${alm}`;
}
// Botón de bloqueo para la barra lateral o la superior (solo con contraseña)
// clase "sitem" → fila de la barra lateral (como «Despacho y ajustes»); por defecto, botón de icono de la barra superior
function sgBotonBloqueo(clase) {
  if (!SG.cifrado) return ""; const k = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘L" : "Ctrl+L";
  if (clase === "sitem") return `<button class="sitem" data-sg="bloquear" title="Bloquear (${k})"><span class="ic">${SG_IC.lock}</span><span class="t"><b>Bloquear</b></span></button>`;
  return `<button class="${clase || "tbtn"} sg-tb" data-sg="bloquear" aria-label="Bloquear {{MARCA}}" title="Bloquear (${k})">${SG_IC.lock}</button>`;
}
// Franja superior: una sola, por prioridad (error al guardar > versión nueva > reanudar copias > recordatorio de copia)
function sgBanner() {
  if (SG.bloqueado) return "";
  const c = sgCfg();
  const b = (cls, ico, txt, acts) => `<div class="sg-banner ${cls}" role="status"><span class="sg-bi">${ico}</span><span class="sg-bt">${txt}</span><span class="sg-sp"></span>${acts}</div>`;
  if (SG.otraVentana && !SG.errorGuardar) return b("warn", SG_IC.warn, "<b>{{MARCA}} está abierto en otra ventana y ha guardado cambios.</b><span class='sg-sub'> Recarga esta para verlos y no sobrescribirlos.</span>", `<button class="sg-bb sg-pri" data-sg="recargar">Recargar</button>`);
  if (SG.errorGuardar) return b("err", SG_IC.warn, SG.errorGuardar.cuota ? "<b>No se están guardando los cambios:</b> el espacio del navegador está lleno." : "<b>No se han podido guardar los últimos cambios.</b>", `<button class="sg-bb" data-sg="descargar">Descargar copia</button><button class="sg-bb" data-sg="ajustes">Ver espacio</button>`);
  if (SG.actualizacion) return b("info", SG_IC.up, "<b>Hay una versión nueva de {{MARCA}}</b><span class='sg-sub'> · tus datos se conservan</span>", `<button class="sg-bb sg-pri" data-sg="actualizar">Actualizar</button>`);
  if (SG.carpeta && SG.carpetaPermiso && SG.carpetaPermiso !== "granted") return b("warn", SG_IC.folder, `<b>Copias automáticas en pausa</b><span class='sg-sub'> · ${sgEstadoCopiaTxt().toLowerCase()}</span>`, `<button class="sg-bb sg-pri" data-sg="reanudar">Reanudar copias automáticas</button>`);
  // Aviso antes del límite: con los datos en localStorage (cifrados: no pueden pasar a IndexedDB) al 80 %; en IndexedDB, el disco al 80 %
  if (sgUsoLS() > 0.8) return b("warn", SG_IC.disk, `<b>El espacio para expedientes está casi lleno</b><span class='sg-sub'> · ${Math.round(sgUsoLS() * 100)} % usado${SG.cifrado ? " (datos cifrados)" : ""}</span>`, `<button class="sg-bb" data-sg="descargar">Descargar copia</button><button class="sg-bb" data-sg="ajustes">Ver opciones</button>`);
  if (SG.almacen === "idb" && sgUsoDisco() > 0.8) return b("warn", SG_IC.disk, `<b>El disco de este equipo está casi lleno para {{MARCA}}</b><span class='sg-sub'> · ${Math.round(sgUsoDisco() * 100)} % de lo que el navegador permite</span>`, `<button class="sg-bb" data-sg="descargar">Descargar copia</button><button class="sg-bb" data-sg="ajustes">Ver espacio</button>`);
  const reales = (DB.expedientes || []).filter((x) => !x.demo && !x.ejemplo).length;
  if ((typeof ui !== "object" || ui.vista === "inicio") && reales && !(SG.carpeta && SG.carpetaPermiso === "granted") && sgDiasDesde(DB.ultimaCopia) >= 7 && c.posponer !== hoy())
    return b("warn", SG_IC.folder, `<b>Descarga tu copia de seguridad</b> · ${DB.ultimaCopia ? `última copia: ${sgHace(DB.ultimaCopia)}` : "aún no has hecho ninguna"}`, `<button class="sg-bb sg-pri" data-sg="descargar">Descargar</button>${sgFSA() ? `<button class="sg-bb" data-sg="carpeta">Copia automática</button>` : ""}<button class="sg-bb" data-sg="posponer">Más tarde</button>`);
  return "";
}

// ── Pantallas de bloqueo y recuperación (antes de pintar nada de la app) ──
function sgTema(t) { const light = !t || t === "claro" || (t === "sistema" && window.matchMedia("(prefers-color-scheme: light)").matches); if (light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme; }
function sgPintarPantalla(ocupado) {
  const P = SG.pantalla; if (!P) return;
  try { $app.innerHTML = ""; } catch (e) {}
  let el = document.querySelector(".sg-lock"); if (!el) { el = document.createElement("div"); el.className = "sg-lock"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
  const meta = (P.env && P.env.meta) || {}; sgTema(meta.tema || (/"tema":"(\w+)"/.exec(P.crudo || "") || [])[1] || (typeof DB === "object" && DB.tema));
  const marca = `<div class="sg-brand"><span class="logo" aria-hidden="true">${LOGO_SVG}</span><span>{{MARCA}}</span></div>`;
  const tieneCarpeta = sgFSA();
  const opciones = `<div class="group sg-g" style="--inset:60px;text-align:left">${tieneCarpeta ? sgFila(SG_IC.folder, "blue", "Restaurar desde la carpeta de copias", "La copia automática diaria, con sus documentos", I.chev, 'data-sg="desdeCarpeta"') : ""}<label class="row sg-row" style="cursor:pointer;position:relative;overflow:hidden"><span class="ico green">${SG_IC.restore}</span><span class="t"><b>Elegir un archivo de copia</b><small>Termina en .hereda.json o .hereda.enc</small></span>${I.chev}<input type="file" data-sgf="restaurar" accept=".json,.enc,application/json" class="sg-file" aria-label="Elegir una copia"></label></div>`;
  let h;
  if (P.tipo === "bloqueo" && !P.olvido) {
    h = `${marca}<div class="sg-card"><span class="sg-lico">${SG_IC.lock}</span>${meta.despacho ? `<p class="sg-firm">${sgHtml(meta.despacho)}</p>` : ""}<h1>Introduce la contraseña</h1><p class="sg-lead">Los expedientes de este equipo están cifrados.</p>
      <form class="sg-form" data-sgform="desbloquear" autocomplete="off"><input type="text" name="username" value="${sgHtml(meta.despacho || "{{MARCA}}")}" autocomplete="username" hidden><input id="sg-pass" type="password" autocomplete="current-password" placeholder="Contraseña" aria-label="Contraseña" ${ocupado ? "disabled" : ""} required><button class="btn" type="submit" ${ocupado ? "disabled" : ""}>${ocupado ? "Abriendo…" : "Desbloquear"}</button></form>
      <p class="sg-error" role="alert">${P.error ? sgHtml(P.error) : ""}</p><button class="sg-link" data-sg="olvido">He olvidado la contraseña</button></div>`;
  } else if (P.tipo === "bloqueo") {
    h = `${marca}<div class="sg-card sg-wide"><span class="sg-lico warn">${SG_IC.lock}</span><h1>Sin la contraseña no se pueden leer los datos</h1>
      <p class="sg-lead">Están cifrados en este equipo y nadie puede descifrarlos sin ella, tampoco {{MARCA}}. Si tienes una copia de seguridad, puedes restaurarla: se borrarán los datos cifrados de este equipo y se cargará la copia. Si la copia está cifrada, te pedirá la contraseña que tenías cuando se hizo.</p>
      ${opciones}<button class="sg-link" data-sg="volver">Volver e intentarlo de nuevo</button></div>`;
  } else {
    h = `${marca}<div class="sg-card sg-wide"><span class="sg-lico warn">${SG_IC.warn}</span><h1>Los datos de este equipo no se pueden leer</h1>
      <p class="sg-lead">${sgHtml(P.motivo || "")} Puede ocurrir si el navegador se cerró mientras guardaba o si el disco tiene errores. <b>No se ha borrado ni sobrescrito nada.</b></p>
      ${opciones}<div class="sg-acts2">${P.crudo ? `<button class="btn sm gray" data-sg="descargarDanados">Descargar los datos dañados</button>` : ""}<button class="btn sm ghost" data-sg="vacio">Empezar sin datos…</button></div>
      ${P.confirmarVacio ? `<div class="sg-confirm"><p>Se descargarán primero los datos dañados (para que un técnico intente recuperarlos) y {{MARCA}} empezará vacío en este equipo.</p><button class="btn sm danger" data-sg="vacioSi">Descargar y empezar sin datos</button></div>` : ""}</div>`;
  }
  el.innerHTML = `<div class="sg-lin">${h}</div>`;
  if (P.tipo === "bloqueo" && !P.olvido && !ocupado) setTimeout(() => document.getElementById("sg-pass")?.focus(), 30);
}

// ── Ventana modal propia (restaurar, contraseña) ──
function sgModal(titulo, cuerpo, ancho) {
  sgCerrarModal();
  const m = document.createElement("div"); m.className = "sg-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", titulo);
  m.innerHTML = `<div class="sg-scrim" data-sg="cerrar"></div><div class="sg-mcard ${ancho ? "sg-wide" : ""}"><header><h2>${sgHtml(titulo)}</h2><button class="tbtn" data-sg="cerrar">Cancelar</button></header><div class="sg-mbody">${cuerpo}</div></div>`;
  document.body.appendChild(m);
  setTimeout(() => m.querySelector("input:not([hidden]):not([type=file]),button.btn")?.focus(), 30);
}
function sgCerrarModal() { document.querySelectorAll(".sg-modal").forEach((n) => n.remove()); }
function sgModalRestaurar(error) {
  const R = SG.restaurar; if (!R) return;
  if (R.lista) {
    sgModal("Restaurar desde la carpeta", `<p class="sg-lead">Copias en «${sgHtml(R.dir.name)}», de la más reciente a la más antigua.</p><div class="group sg-g" style="--inset:60px">${R.lista.map((f, i) => sgFila(SG_IC.restore, i ? "q" : "green", sgHtml(f.n.replace(/\.hereda\.(json|enc)$/, "")), `${f.mod ? sgFechaHora(new Date(f.mod).toISOString()) : ""} · ${sgMB(f.tam)}${/\.enc$/.test(f.n) ? " · cifrada" : ""}`, I.chev, `data-sg="elegirCopia" data-i="${i}"`)).join("")}</div>`, true);
    return;
  }
  if (R.cifrada) {
    sgModal("Copia cifrada", `<p class="sg-lead">Copia del ${sgHtml(sgFechaHora(R.cifrada.meta && R.cifrada.meta.fecha))}${R.cifrada.meta && R.cifrada.meta.despacho ? " · " + sgHtml(R.cifrada.meta.despacho) : ""}. Escribe la contraseña que tenía {{MARCA}} cuando se hizo.</p>
      <form class="sg-form" data-sgform="descifrarCopia"><input id="sg-cpass" type="password" autocomplete="off" placeholder="Contraseña de la copia" aria-label="Contraseña de la copia" required><button class="btn" type="submit">Abrir la copia</button></form><p class="sg-error" role="alert">${error ? sgHtml(error) : ""}</p>`);
    return;
  }
  const c = R.c, S = sgResumenCopia(c), bloq = SG.bloqueado;
  const datos = `<div class="sg-prev"><div><span>Fecha de la copia</span><b>${sgHtml(sgFechaHora(c.creado))}</b></div><div><span>Expedientes</span><b>${S.n}</b></div><div><span>Documentos</span><b>${S.docs}</b></div>${c.despacho && c.despacho.nombre ? `<div><span>Despacho</span><b>${sgHtml(c.despacho.nombre)}</b></div>` : ""}</div>${R.nombre ? `<p class="sg-file-n">${sgHtml(R.nombre)}</p>` : ""}${c.legado ? `<p class="group-foot">Copia de una versión anterior: no incluye los documentos adjuntos.</p>` : ""}${S.docs && !S.docsDentro && !R.dir ? `<p class="group-foot">Los documentos de esta copia están en la subcarpeta «Documentos» de la carpeta de copias: para recuperarlos, usa «Restaurar desde la carpeta de copias».</p>` : ""}`;
  const opc = bloq ? `<div class="sg-optbox"><b>Se borrarán los datos de este equipo y se cargará esta copia.</b><span>${SG.pantalla && SG.pantalla.tipo === "bloqueo" ? "Los datos cifrados no se pueden leer sin la contraseña; al restaurar, {{MARCA}} quedará sin contraseña hasta que la vuelvas a poner." : "Los datos dañados se pueden descargar antes desde la pantalla anterior."}</span></div>`
    : `<div class="sg-opts" role="radiogroup" aria-label="Cómo restaurar">
      <button class="sg-opt" role="radio" data-sg="modo" data-v="combinar" aria-checked="${R.modo !== "reemplazar"}" ${sgSoloLectura() ? 'aria-disabled="true" disabled' : ""}><i></i><span><b>Combinar con lo que hay${sgSoloLectura() ? "" : " <em>recomendado</em>"}</b><small>${sgSoloLectura() ? "No disponible en solo lectura: con la licencia caducada no se pueden añadir expedientes a la cartera. Puedes reemplazar todo con la copia o activar la licencia en Ajustes." : `${S.nuevos ? `Se ${S.nuevos === 1 ? "añade" : "añaden"} ${plural(S.nuevos, "expediente nuevo", "expedientes nuevos")}` : "No hay expedientes nuevos"}${S.masNuevos ? ` y se ${S.masNuevos === 1 ? "actualiza 1 que es más reciente" : `actualizan ${S.masNuevos} que son más recientes`} en la copia` : ""}. ${S.iguales + S.masNuevos ? ` De cada expediente que está en los dos sitios se conserva la versión más reciente${S.iguales ? ` (${S.iguales} ${S.iguales === 1 ? "se queda" : "se quedan"} como ${S.iguales === 1 ? "está" : "están"})` : ""}.` : ""} No se borra nada de este equipo.`}</small></span></button>
      <button class="sg-opt" role="radio" data-sg="modo" data-v="reemplazar" aria-checked="${R.modo === "reemplazar"}"><i></i><span><b>Reemplazar todo</b><small>${(DB.expedientes || []).length ? `Este equipo queda exactamente como la copia, con su equipo y sus ajustes${S.soloAqui ? `: se ${S.soloAqui === 1 ? "quitará" : "quitarán"} ${plural(S.soloAqui, "expediente que no está", "expedientes que no están")} en ella` : ""}. Antes se guarda una copia de lo que hay ahora${SG.carpeta && SG.carpetaPermiso === "granted" ? " en la carpeta de copias" : " (se descargará)"}.` : "Este equipo no tiene expedientes: se carga la copia completa, con el equipo del despacho y los ajustes."}</small></span></button></div>`;
  const conf = bloq ? `<button class="btn danger" data-sg="aplicar" data-v="reemplazar">Borrar los datos de este equipo y restaurar</button>` : `<button class="btn" data-sg="aplicar" data-v="${R.modo === "reemplazar" ? "reemplazar" : "combinar"}">${R.modo === "reemplazar" ? "Reemplazar con la copia" : "Combinar"}</button>`;
  sgModal("Restaurar una copia", `${datos}${opc}<div class="sg-mfoot">${conf}<button class="btn gray" data-sg="cerrar">Cancelar</button></div>`, true);
}
function sgModalClave(tipo, error) {
  const campo = (id, ph, ac) => `<input id="${id}" type="password" autocomplete="${ac}" placeholder="${ph}" aria-label="${ph}" required minlength="${id === "sg-p0" ? 1 : 10}">`;
  const err = `<p class="sg-error" role="alert">${error ? sgHtml(error) : ""}</p>`;
  if (tipo === "activar") sgModal("Proteger con contraseña", `<p class="sg-lead">{{MARCA}} cifrará los expedientes de este equipo con esta contraseña. Te la pedirá al abrirlo y después de ${num(sgCfg().bloqueoMin) || 15} minutos sin uso.</p>
    <div class="sg-optbox warn"><b>Si la olvidas, los datos no se pueden recuperar.</b><span>Nadie puede descifrarlos sin ella, tampoco {{MARCA}}. Antes de seguir, ${DB.ultimaCopia ? "comprueba que tu última copia (" + sgHace(DB.ultimaCopia) + ") está al día" : "haz una copia de seguridad"} y guarda la contraseña en un lugar seguro.</span></div>
    <form class="sg-form col" data-sgform="activar"><input type="text" name="username" value="${sgHtml((DB.despacho && DB.despacho.nombre) || "{{MARCA}}")}" autocomplete="username" hidden>${campo("sg-p1", "Contraseña (mínimo 10 caracteres)", "new-password")}${campo("sg-p2", "Repite la contraseña", "new-password")}<button class="btn" type="submit">Cifrar y proteger</button></form>${err}`);
  if (tipo === "cambiar") sgModal("Cambiar la contraseña", `<form class="sg-form col" data-sgform="cambiar">${campo("sg-p0", "Contraseña actual", "current-password")}${campo("sg-p1", "Nueva contraseña (mínimo 10 caracteres)", "new-password")}${campo("sg-p2", "Repite la nueva contraseña", "new-password")}<button class="btn" type="submit">Cambiar</button></form><p class="group-foot">Las copias cifradas anteriores seguirán abriéndose con la contraseña antigua.</p>${err}`);
  if (tipo === "quitar") sgModal("Quitar la contraseña", `<p class="sg-lead">Los expedientes${sgArchivosCableados() ? " y los documentos" : ""} volverán a guardarse sin cifrar en este equipo y {{MARCA}} dejará de pedir la contraseña.</p><form class="sg-form col" data-sgform="quitar">${campo("sg-p0", "Contraseña actual", "current-password")}<button class="btn danger" type="submit">Quitar la contraseña</button></form>${err}`);
}
const sgVal = (id) => (document.getElementById(id) || {}).value || "";
async function sgFormulario(f) {
  const k = f.dataset.sgform, boton = f.querySelector("button[type=submit]");
  const ocupar = (t) => { if (boton) { boton.disabled = true; boton.textContent = t; } };
  try {
    if (k === "desbloquear") { const p = sgVal("sg-pass"); if (p) await sgDesbloquear(p); return; }
    if (k === "descifrarCopia") { ocupar("Abriendo…"); const ok = await sgDescifrarCopiaElegida(sgVal("sg-cpass")); if (!ok) { sgModalRestaurar("Contraseña incorrecta para esta copia"); return; } sgModalRestaurar(); return; }
    if (k === "activar" || k === "cambiar") {
      const p1 = sgVal("sg-p1"), p2 = sgVal("sg-p2");
      if (p1.length < 10) { sgModalClave(k, "La contraseña debe tener al menos 10 caracteres"); return; }
      if (p1 !== p2) { sgModalClave(k, "Las dos contraseñas no coinciden"); return; }
      if (k === "activar") { ocupar("Cifrando…"); await sgActivarCifrado(p1); sgCerrarModal(); SG.act = Date.now(); sgRepintar(); toast("Datos cifrados y protegidos con contraseña"); return; }
      ocupar("Cambiando…"); try { await sgCambiarClave(sgVal("sg-p0"), p1); } catch (e) { sgModalClave("cambiar", "La contraseña actual no es correcta"); return; }
      sgCerrarModal(); toast("Contraseña cambiada"); return;
    }
    if (k === "quitar") { ocupar("Descifrando…"); try { await sgQuitarCifrado(sgVal("sg-p0")); } catch (e) { sgModalClave("quitar", "La contraseña no es correcta"); return; } sgCerrarModal(); sgRepintar(); toast("Contraseña quitada: los datos ya no están cifrados"); }
  } catch (e) { console.error(e); toast("No se pudo completar: " + (e && e.message || e)); sgCerrarModal(); }
}

// ── Eventos: un único escuchador de clics para [data-sg] ──
function sgAccion(a, b) {
  const R = SG.restaurar, P = SG.pantalla;
  if (a === "cerrar") { sgCerrarModal(); SG.restaurar = null; return; }
  if (a === "descargar") { sgDescargarCopia(); return; }
  if (a === "carpeta") { sgElegirCarpeta(); return; }
  if (a === "reanudar") { sgReanudar(); return; }
  if (a === "desactivar") { sgDesactivarCarpeta(); return; }
  if (a === "copiarYa") { sgEscribirCopia(true).then((ok) => { toast(ok ? "Copia guardada en la carpeta" : "No se pudo guardar la copia"); sgRepintar(); }); return; }
  if (a === "cada") { sgCfg().cadaH = Number(b.dataset.v); guardar(); sgRepintar(); return; }
  if (a === "min") { sgCfg().bloqueoMin = Number(b.dataset.v); guardar(); sgRepintar(); return; }
  if (a === "cifrarCopias") { sgCfg().cifrarCopias = !sgCfg().cifrarCopias; guardar(); sgRepintar(); if (sgCfg().cifrarCopias) sgCopiaAuto("forzar"); return; }
  if (a === "posponer") { sgCfg().posponer = hoy(); guardar(); sgRepintar(); return; }
  if (a === "ajustes") { if (typeof ui === "object") { ui.sheet = { tipo: "ajustes" }; sgRepintar(); } return; }
  if (a === "actualizar") { sgActualizar(); return; }
  if (a === "recargar") { location.reload(); return; }
  if (a === "buscarAct") { sgBuscarActualizacion(); return; }
  if (a === "bloquear") { sgBloquear(); return; }
  if (a === "activarPw") { sgModalClave("activar"); return; }
  if (a === "cambiarPw") { sgModalClave("cambiar"); return; }
  if (a === "quitarPw") { sgModalClave("quitar"); return; }
  if (a === "desdeCarpeta") { sgRestaurarDesdeCarpeta(!SG.carpeta); return; }
  if (a === "elegirCopia" && R && R.lista) { const f = R.lista[Number(b.dataset.i)]; if (f) f.h.getFile().then((file) => sgAbrirArchivo(file, R.dir)); return; }
  if (a === "modo" && R) { if (b.dataset.v === "combinar" && sgSoloLectura()) return; R.modo = b.dataset.v; sgModalRestaurar(); return; }
  if (a === "aplicar" && R && R.c) {
    b.disabled = true; b.textContent = "Restaurando…";
    if (SG.bloqueado && P && P.tipo === "bloqueo") { try { localStorage.removeItem(SG_ENC); } catch (e) {} SG.cifrado = false; SG.clave = null; SG.sobre = null; sgDocsTodos().then((L) => sgDocsBorrar(L.filter((r) => r.sg).map((r) => r.id))).catch(() => {}).then(() => sgAplicarCopia("reemplazar")); return; }
    sgAplicarCopia(b.dataset.v === "reemplazar" || SG.bloqueado ? "reemplazar" : "combinar").catch((e) => { console.error(e); toast("No se pudo restaurar la copia"); }); return;
  }
  if (a === "olvido" && P) { P.olvido = true; sgPintarPantalla(); return; }
  if (a === "volver" && P) { P.olvido = false; sgPintarPantalla(); return; }
  if (a === "descargarDanados" && P) { descargar(`{{MARCA}} datos danados ${hoy()}.txt`, new Blob([P.crudo || ""], { type: "text/plain" })); return; }
  if (a === "vacio" && P) { P.confirmarVacio = true; sgPintarPantalla(); return; }
  if (a === "vacioSi" && P) { sgEmpezarVacio(); return; }
}
function sgEventos() {
  if (SG.eventos) return; SG.eventos = true;
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-sg]"); if (!b || b.tagName === "LABEL" || b.tagName === "INPUT") return;
    e.preventDefault(); e.stopPropagation(); sgAccion(b.dataset.sg, b);
  }, true);
  document.addEventListener("change", (e) => { const t = e.target; if (!t || !t.dataset || !t.dataset.sgf) return; e.stopPropagation(); const f = t.files && t.files[0]; t.value = ""; if (t.dataset.sgf === "restaurar") sgAbrirArchivo(f); }, true);
  document.addEventListener("submit", (e) => { const f = e.target.closest && e.target.closest("[data-sgform]"); if (!f) return; e.preventDefault(); e.stopPropagation(); sgFormulario(f); }, true);
  window.addEventListener("keydown", (e) => {
    if (SG.bloqueado) { // nada de la app responde al teclado; dentro de la pantalla se escribe con normalidad
      const dentro = e.target && e.target.closest && e.target.closest(".sg-lock,.sg-modal");
      if (e.key === "Escape" && document.querySelector(".sg-modal")) { sgCerrarModal(); SG.restaurar = null; }
      e.stopPropagation(); if (!dentro && e.key !== "Tab") e.preventDefault(); return;
    }
    if (e.key === "Escape" && document.querySelector(".sg-modal")) { e.stopPropagation(); sgCerrarModal(); SG.restaurar = null; return; }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "l" && SG.cifrado) { e.preventDefault(); e.stopPropagation(); sgBloquear(); }
  }, true);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") sgCopiaAuto("oculta"); else if (SG.otraVentana && !SG.bloqueado) location.reload(); });
  // Otra pestaña o ventana de {{MARCA}} ha guardado: esta tiene datos viejos. Al volver a ella se recarga; si está a la vista, se avisa.
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== KEY && e.key !== SG_ENC) return;
    if (SG.bloqueado) { if (e.key === SG_ENC && e.newValue === null) location.reload(); return; }
    SG.otraVentana = true; if (document.visibilityState === "visible") sgRepintar();
  });
  window.addEventListener("beforeunload", (e) => { if (SG.escribiendo || SG.escribiendoIdb) { e.preventDefault(); e.returnValue = ""; } });
}
// Ganchos para pruebas automáticas (iteraciones PBKDF2 reducidas, temporizadores cortos). No se usa en la app.
function sgPrueba(o) { Object.assign(SG.prueba, o || {}); return SG; }
