// ───────────────────── {{MARCA}} · Despacho en red: conexión con la app e interfaz (prefijo red / RED) ─────────────────────
// Usa el motor puro de red-motor.js (rm*) con:
//   · la carpeta compartida que elige el despacho (File System Access API, Chrome y Edge; el mismo mecanismo que la copia automática
//     de seguridad.js, con su permiso guardado en IndexedDB «hereda-seguridad»);
//   · DB.expedientes, DB.despacho (sin «yo») y los documentos adjuntos (IndexedDB «sosiego-archivo», cifrados si archivo.js lo está);
//   · el cifrado de seguridad.js (sgNuevoSobre, sgAbrirSobre, sgCifrarTexto…): si el despacho en red tiene contraseña, todo lo que se
//     escribe en la carpeta va cifrado con una clave del despacho (AES-GCM 256) envuelta con esa contraseña (PBKDF2-SHA256).
// Cuándo sincroniza: al abrir la app, al guardar (con 2 s de margen), al volver a la ventana y cada 45 s. Nunca con la app bloqueada,
// en solo lectura (licencia) ni sin permiso para la carpeta.
// API: redArrancar() (desde sgSeguir) · redSincronizar(motivo) · redAjustesHTML() · redBanner() · redSideItem() · redPrueba(o)
// Eventos: [data-red] (asistente | elegir | paso3 | modoPw | crear | unirse | atras | hecho | reanudar | sincronizar | choques |
//          elegir-c | renombrar | guardarNombre | desconectar | desconectarSi | reclave | reclaveSi | ajustes)
const RED_CADA = 45000, RED_ANTIRREBOTE = 2000;
const RED = { activo: false, cfg: null, estado: null, raiz: null, carpeta: null, clave: null, sal: "", permiso: null, falta: "", error: "", ocupado: false, pendiente: false,
  resumen: null, presencia: [], abierto: null, t: 0, tAnti: 0, tVer: 0, enganchado: false, aplicando: false, repintarPend: false, estadoTxt: "", asis: null, docsCambio: false, aplicados: new Set(),
  prueba: Object.assign({}, window.__redPrueba) };
const redPrueba = (o) => { Object.assign(RED.prueba, o || {}); if (RED.activo) redProgramar(); return RED; };
const redFSA = () => typeof window.__redCarpetaPrueba === "function" || (typeof sgFSA === "function" && sgFSA());
const redH = (s) => esc(s);
const redPor = (p) => { if (!p) return "Otro equipo"; const yo = RED.estado && p.equipo === RED.estado.equipoId, eq = (p.nombre || "otro equipo") + (yo ? ", este equipo" : ""); return p.persona ? `${p.persona} (${eq})` : yo ? `Este equipo (${p.nombre || ""})` : p.nombre || "Otro equipo"; };
// En pausa: licencia caducada (solo lectura) o modo demostración (cambia el equipo de personas por uno ficticio: no debe llegar a nadie)
const redPausa = () => { try { if (typeof licSoloLectura === "function" && licSoloLectura()) return "Con la licencia caducada, {{MARCA}} está en solo lectura y no sincroniza."; if (typeof dmActivo === "function" && dmActivo()) return "Durante el modo demostración no se sincroniza (sus datos son ficticios). Sal de la demostración para seguir."; } catch (e) {} return ""; };
const redYoNombre = () => { try { const a = abogado(despachoCfg().yo); return a ? a.nombre : ""; } catch (e) { return ""; } };

// ═════════ Carpeta: interfaz del motor sobre un FileSystemDirectoryHandle ═════════
function redCarpetaDe(raiz) {
  const dirs = new Map();
  const dirDe = async (ruta, crear) => {
    if (!ruta) return raiz;
    if (dirs.has(ruta)) return dirs.get(ruta);
    let d = raiz; for (const s of ruta.split("/")) d = await d.getDirectoryHandle(s, { create: !!crear });
    dirs.set(ruta, d); return d;
  };
  const partir = (ruta) => { const i = ruta.lastIndexOf("/"); return i < 0 ? ["", ruta] : [ruta.slice(0, i), ruta.slice(i + 1)]; };
  const permiso = (e) => e && (e.name === "NotAllowedError" || e.name === "SecurityError");
  return {
    async listar(dir) {
      let d; try { d = await dirDe(dir, false); } catch (e) { if (permiso(e)) throw e; return []; }
      const out = [];
      for await (const [n, h] of d.entries()) { if (h.kind !== "file") continue; try { const f = await h.getFile(); out.push({ nombre: n, tam: f.size, mod: f.lastModified }); } catch (e) { if (permiso(e)) throw e; } }
      return out;
    },
    async leer(ruta) {
      const [dir, n] = partir(ruta);
      try { const d = await dirDe(dir, false); const f = await (await d.getFileHandle(n)).getFile(); return new Uint8Array(await f.arrayBuffer()); }
      catch (e) { if (permiso(e)) throw e; return null; }
    },
    async escribir(ruta, datos) {
      const [dir, n] = partir(ruta); const d = await dirDe(dir, true);
      const fh = await d.getFileHandle(n, { create: true }); const w = await fh.createWritable(); await w.write(datos); await w.close();
      return null;
    },
    async borrar(ruta) { const [dir, n] = partir(ruta); try { const d = await dirDe(dir, false); await d.removeEntry(n); } catch (e) { if (permiso(e)) throw e; } },
  };
}
// Cifrado del despacho en red con las funciones de seguridad.js
function redCripto(dek) {
  if (!dek) return null;
  return {
    cifrarTexto: (t, aad) => sgCifrarTexto(dek, t, aad),
    descifrarTexto: (d, aad) => sgDescifrarTexto(dek, d, aad),
    cifrarBytes: async (u, aad) => { const { iv, ct } = await sgCifrarBytes(dek, u, aad); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return o; },
    descifrarBytes: (u, aad) => sgDescifrarBytes(dek, u.subarray(0, 12), u.subarray(12), aad),
  };
}

// ═════════ Datos de este equipo: interfaz del motor sobre DB y los documentos ═════════
const redSincronizable = (x) => x && x.id != null && !x.demo && !x.ejemplo;
function redDespachoX() { const { yo, ...d } = despachoCfg(); return JSON.parse(JSON.stringify(d)); }
const redDocMeta = (d) => { const { _b, blob, sgIlegible, ...m } = d; return m; };
const redEditandoEnAsistente = (id) => typeof ui === "object" && ui.vista === "asist" && ui.borrador && ui.borrador.id === id;
const redLocal = {
  async listar() {
    if (typeof ARCH === "object" && !ARCH.listo && typeof archivoCargar === "function") { try { await archivoCargar(); } catch (e) {} }
    const porExp = new Map();
    for (const d of (typeof ARCH === "object" ? ARCH.lista : []) || []) { if (!d || d.sgIlegible) continue; if (!porExp.has(d.expId)) porExp.set(d.expId, []); porExp.get(d.expId).push(redDocMeta(d)); }
    const L = (DB.expedientes || []).filter(redSincronizable).map((x) => ({ id: x.id, x, docs: porExp.get(x.id) || [] }));
    L.push({ id: "_despacho", x: redDespachoX(), docs: [] });
    return L;
  },
  async docBytes(id) {
    const d = (typeof ARCH === "object" ? ARCH.lista : []).find((q) => q && q.id === id);
    if (!d || !d._b || d.sgIlegible) return null;
    try { return new Uint8Array(await d._b.arrayBuffer()); } catch (e) { return null; }
  },
  // Aplica una versión recibida o fundida. Si el expediente cambió aquí desde que el motor lo leyó, o se está revisando en el
  // asistente (que guarda una copia entera al terminar), no se toca: el motor lo repite en el siguiente ciclo con una fusión.
  async aplicar(id, op) {
    if (typeof licSoloLectura === "function" && licSoloLectura()) return false;
    if (op.x !== undefined) {
      if (id === "_despacho") {
        if (rmHuellaX(redDespachoX()) !== op.hx || !op.x) return false;
        DB.despacho = Object.assign({}, op.x, { yo: despachoCfg().yo });
      } else {
        if (redEditandoEnAsistente(id)) return false;
        const i = DB.expedientes.findIndex((q) => q && q.id === id), cur = i >= 0 ? DB.expedientes[i] : null;
        if (op.hx == null ? !!cur : !cur || rmHuellaX(cur) !== op.hx) return false;
        if (op.x === null) {
          DB.expedientes.splice(i, 1);
          if (Array.isArray(DB.recientes)) DB.recientes = DB.recientes.filter((q) => q !== id);
          if (DB.cronometro && DB.cronometro.xId === id) delete DB.cronometro;
          const ids = (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d && d.expId === id).map((d) => d.id);
          if (ids.length) { await redDocsQuitar(ids); }
        } else if (i >= 0) DB.expedientes[i] = op.x; else DB.expedientes.unshift(op.x);
      }
      RED.aplicados.add(id);
    }
    for (const m of op.poner || []) await redDocPoner(id, m);
    if ((op.quitar || []).length) await redDocsQuitar(op.quitar);
    return true;
  },
};
async function redDocPoner(expId, m) {
  const { _bytes, ...meta } = m;
  let blob = null;
  if (_bytes) blob = new Blob([_bytes], { type: meta.tipo || "application/octet-stream" });
  else { const d = (typeof ARCH === "object" ? ARCH.lista : []).find((q) => q && q.id === meta.id); if (!d || !d._b) return; blob = d._b; }
  const rec = { ...meta, expId, tramiteId: meta.tramiteId || "", blob };
  if (typeof ARCH === "object" && ARCH.db === null && ARCH.mem) { ARCH.mem.set(rec.id, { ...rec, _b: blob }); RED.docsCambio = true; return; }
  await sgDocsPoner([typeof sgArchivosCableados === "function" && sgArchivosCableados() ? await sgArchivoSellar(rec) : rec]);
  RED.docsCambio = true;
}
async function redDocsQuitar(ids) {
  if (typeof ARCH === "object" && ARCH.db === null && ARCH.mem) { for (const i of ids) ARCH.mem.delete(i); } else await sgDocsBorrar(ids);
  for (const i of ids) { if (typeof ARCH === "object" && ARCH.urls && ARCH.urls.has(i)) { try { URL.revokeObjectURL(ARCH.urls.get(i)); } catch (e) {} ARCH.urls.delete(i); } }
  RED.docsCambio = true;
}
// Después de aplicar: el registro de cambios y el sello de fecha no deben atribuir a este equipo lo que hizo otro
async function redTrasAplicar() {
  const ids = [...RED.aplicados]; RED.aplicados.clear();
  if (ids.length) {
    RED.aplicando = true;
    try {
      for (const id of ids) {
        const x = DB.expedientes.find((q) => q && q.id === id);
        try { if (typeof AU === "object" && AU.base) { if (x) AU.base.set(id, auFoto(x)); else AU.base.delete(id); } } catch (e) {}
        try { if (SG.huellas) { if (x) SG.huellas.set(id, sgHuella(x)); else SG.huellas.delete(id); } } catch (e) {}
      }
      guardar();
    } finally { RED.aplicando = false; }
  }
  if (RED.docsCambio) { RED.docsCambio = false; try { if (typeof archivoCargar === "function") await archivoCargar(); if (typeof sgMedir === "function") sgMedir(); } catch (e) {} }
  if (!ids.length) return false;
  if (typeof ui === "object" && ui.vista === "exp" && ui.id && !DB.expedientes.some((x) => x.id === ui.id)) { go({ vista: "inicio", id: null, sheet: null }); toast("Este expediente se ha borrado en otro equipo del despacho"); }
  return true;
}

// ═════════ Configuración y estado (IndexedDB «hereda-seguridad», como la carpeta de copias) ═════════
// «red»: { h (manejador de hereda-red), padre, equipo, equipoId, despachoId, despachoNombre, cifrado, claveK | claveC, desde }
// La clave del despacho: si este equipo tiene contraseña propia, se guarda cifrada con ella (claveC); si no, como clave del navegador (claveK).
async function redGuardarCfg() {
  const c = { ...RED.cfg }; delete c.claveK; delete c.claveC;
  if (RED.clave) {
    if (SG.cifrado && SG.clave) { const raw = new Uint8Array(await crypto.subtle.exportKey("raw", RED.clave)); const { iv, ct } = await sgCifrarBytes(SG.clave, raw, "hereda+red-clave"); c.claveC = { iv, ct }; }
    else c.claveK = RED.clave;
  }
  RED.cfg = c; await sgKVPoner("red", c);
}
async function redLeerClave(c) {
  if (c.claveK) return c.claveK;
  if (c.claveC && SG.clave) { try { const raw = await sgDescifrarBytes(SG.clave, c.claveC.iv, c.claveC.ct, "hereda+red-clave"); return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); } catch (e) { return null; } }
  return null;
}
async function redEstadoLeer() {
  const v = await sgKVLeer("red-estado"); if (!v) return null;
  try {
    if (typeof v === "string") return JSON.parse(v);
    if (v.c && SG.clave) return JSON.parse(await sgDescifrarTexto(SG.clave, v.d, "hereda+red-estado"));
  } catch (e) {}
  return null;
}
async function redEstadoGuardar() {
  if (!RED.estado) return;
  const txt = JSON.stringify(RED.estado); if (txt === RED.estadoTxt) return;
  try { await sgKVPoner("red-estado", SG.cifrado && SG.clave ? { c: 1, d: await sgCifrarTexto(SG.clave, txt, "hereda+red-estado") } : txt); RED.estadoTxt = txt; } catch (e) { console.error("Despacho en red: estado", e); }
}
function redCtx() {
  return { carpeta: RED.carpeta, local: redLocal, cripto: redCripto(RED.clave), sal: RED.sal, estado: RED.estado, equipo: { nombre: RED.cfg.equipo, persona: redYoNombre() }, ahora: () => Date.now(), registro: (t) => { RED.registro = (RED.registro || []).slice(-30).concat(new Date().toISOString().slice(11, 19) + " " + t); } };
}

// ═════════ Arranque, ciclo y ganchos ═════════
async function redArrancar() {
  if (!redFSA() || RED.arrancando) return;
  RED.arrancando = true;
  try {
    const c = await sgKVLeer("red"); if (!c || !c.despachoId) return;
    RED.cfg = c; redEnganchar();
    let raiz = c.h;
    if (c.h === "prueba" && typeof window.__redCarpetaPrueba === "function") raiz = await window.__redCarpetaPrueba().getDirectoryHandle("hereda-red", { create: true });
    if (!raiz || typeof raiz.getDirectoryHandle !== "function") { RED.error = "No se encuentra la carpeta compartida. Vuelve a elegirla con el asistente."; sgRepintar(); return; }
    RED.raiz = raiz; RED.carpeta = redCarpetaDe(raiz);
    RED.permiso = await sgPermiso(raiz, false);
    if (c.cifrado) { RED.clave = await redLeerClave(c); RED.falta = RED.clave ? "" : "clave"; if (RED.clave && c.claveK && SG.cifrado && SG.clave) await redGuardarCfg(); }
    let e = await redEstadoLeer(); if (!e || e.despachoId !== c.despachoId) e = rmEstadoNuevo(c.despachoId, c.equipoId);
    e.equipoId = c.equipoId || e.equipoId; RED.estado = e; RED.estadoTxt = "";
    if (RED.clave && c.cifrado) { try { const d = await rmLeerDespacho(RED.carpeta); if (d && !d.danado && d.id === c.despachoId) RED.sal = await rmComprobarClave(d, redCripto(RED.clave)); } catch (err) { RED.falta = "clave"; } }
    RED.activo = true; redProgramar(); sgRepintar();
    if (RED.permiso === "granted" && !RED.falta) redSincronizar("arranque");
  } catch (e) { console.error("Despacho en red", e); RED.error = String(e && e.message || e); }
  finally { RED.arrancando = false; }
}
function redProgramar() {
  clearInterval(RED.t); RED.t = setInterval(() => redSincronizar("reloj"), RED.prueba.intervalo || RED_CADA);
  clearInterval(RED.tVer); RED.tVer = setInterval(redVigilarAbierto, RED.prueba.intervalo ? 250 : 1500);
}
// Engancha el guardado, el borrado y los documentos (una vez, cuando ya están cargados todos los módulos)
function redEnganchar() {
  if (RED.enganchado) return; RED.enganchado = true;
  if (typeof sgGuardar === "function") { const o = sgGuardar; sgGuardar = function () { const r = o.apply(this, arguments); redTrasGuardar(); return r; }; }
  if (typeof rbBorrarExpediente === "function") { const o = rbBorrarExpediente; rbBorrarExpediente = async function (id) { if (RED.activo && RED.estado) { rmMarcarBorrado(RED.estado, id); await redEstadoGuardar(); } return o.apply(this, arguments); }; }
  if (typeof rbBorrarTexto === "function") { const o = rbBorrarTexto; rbBorrarTexto = function (x) { const t = o.apply(this, arguments); return RED.activo ? t.replace(/^Se quita de este equipo/, "Se quita de todos los equipos del despacho en red") : t; }; }
  if (typeof archivoCargar === "function") { const o = archivoCargar; archivoCargar = async function () { const r = await o.apply(this, arguments); if (!RED.aplicando && !RED.ocupado) redTrasGuardar(); return r; }; }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") redSincronizar("vuelta"); });
  window.addEventListener("focus", () => { if (Date.now() - (RED.ultimoMs || 0) > 15000) redSincronizar("foco"); });
  window.addEventListener("pagehide", () => { if (RED.activo && RED.permiso === "granted" && !RED.falta) { try { rmPresencia(redCtx(), { cerrado: true }); } catch (e) {} } });
  document.addEventListener("focusout", () => { if (RED.repintarPend) setTimeout(redRepintar, 0); });
}
function redTrasGuardar() {
  if (!RED.activo || RED.aplicando) return;
  clearTimeout(RED.tAnti); RED.tAnti = setTimeout(() => redSincronizar("guardar"), RED.prueba.antirrebote ?? RED_ANTIRREBOTE);
}
// Repintar sin quitarle el foco a quien está escribiendo
function redRepintar() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && typeof $app === "object" && $app.contains(a)) { RED.repintarPend = true; return; }
  RED.repintarPend = false; if (typeof render === "function") { try { render(); } catch (e) { console.error(e); } }
}
async function redSincronizar(motivo) {
  if (!RED.activo || !RED.carpeta || !RED.estado) return null;
  if ((typeof SG === "object" && SG.bloqueado) || redPausa()) return null;
  if (RED.permiso !== "granted" || RED.falta) return null;
  if (RED.ocupado) { RED.pendiente = true; return null; }
  RED.ocupado = true;
  const antes = redFirma();
  let res = null;
  const trabajo = async () => {
    try {
      RED.abierto = typeof ui === "object" && ui.vista === "exp" ? ui.id : null;
      res = await rmCiclo(redCtx());
      RED.resumen = res; RED.ultimoMs = Date.now();
      RED.error = res.ok ? "" : redErrorTxt(res.error);
      if (res.ok) RED.presencia = await rmPresencia(redCtx(), { abierto: RED.abierto });
    } catch (e) {
      console.error("Despacho en red", e);
      if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) RED.permiso = "prompt";
      else if (e && e.name === "NotFoundError") RED.error = "La carpeta compartida ya no existe o se ha movido. Vuelve a elegirla con el asistente.";
      else RED.error = "No se pudo sincronizar: " + String(e && e.message || e);
    }
    const cambio = await redTrasAplicar();
    await redEstadoGuardar();
    return cambio;
  };
  let cambio = false;
  try {
    if (navigator.locks && navigator.locks.request) cambio = await navigator.locks.request("hereda-red-ciclo", { ifAvailable: true }, (l) => (l ? trabajo() : false));
    else cambio = await trabajo();
  } finally { RED.ocupado = false; }
  if (cambio || redFirma() !== antes) redRepintar();
  if (RED.pendiente) { RED.pendiente = false; setTimeout(() => redSincronizar("pendiente"), 50); }
  return res;
}
// Lo que se ve de la red (para repintar solo si algo visible ha cambiado)
function redFirma() { const v = typeof ui === "object" && ui.vista === "exp" ? ui.id : ""; return JSON.stringify([RED.error, RED.permiso, RED.falta, redChoquesTotal(), RED.presencia.filter((p) => p.vivo).map((p) => [p.equipo, p.abierto === v]), (RED.resumen || {}).ilegibles]); }
function redErrorTxt(k) {
  return { "sin-despacho": "La carpeta compartida no tiene los datos del despacho en red. Si está en OneDrive, Dropbox o Drive, puede que aún no se haya descargado en este equipo.", "otro-despacho": "La carpeta compartida es de otro despacho en red. Vuelve a elegir la carpeta con el asistente.", "despacho-danado": "El archivo del despacho en red de la carpeta está dañado.", "falta-clave": "Hace falta la contraseña del despacho en red.", "no-cifrado": "El despacho en red de la carpeta ya no tiene contraseña. Vuelve a unirte con el asistente." }[k] || "No se pudo sincronizar.";
}
// Presencia: al abrir o cerrar un expediente, se avisa a los demás al momento (sin esperar al siguiente ciclo)
function redVigilarAbierto() {
  if (!RED.activo || RED.permiso !== "granted" || RED.falta || RED.ocupado) return;
  const a = typeof ui === "object" && ui.vista === "exp" ? ui.id : null;
  if (a === RED.abierto) return;
  RED.abierto = a; const antes = redFirma();
  rmPresencia(redCtx(), { abierto: a }).then((p) => { RED.presencia = p; if (redFirma() !== antes) redRepintar(); }).catch(() => {});
}
async function redReanudar() {
  if (!RED.raiz) return;
  RED.permiso = await sgPermiso(RED.raiz, true);
  if (RED.permiso === "granted") { toast("Despacho en red reanudado"); await redSincronizar("reanudar"); } else toast("Sin permiso para la carpeta compartida");
  redRepintar();
}

// ═════════ Choques ═════════
function redChoques() {
  const L = [];
  for (const x of DB.expedientes || []) if (redSincronizable(x) && Array.isArray(x.redConflictos) && x.redConflictos.length) L.push({ id: x.id, x, c: x.redConflictos });
  const D = DB.despacho; if (D && Array.isArray(D.redConflictos) && D.redConflictos.length) L.push({ id: "_despacho", x: D, c: D.redConflictos });
  return L;
}
const redChoquesTotal = () => redChoques().reduce((s, e) => s + e.c.length, 0);
const RED_CAMPOS = { nombre: "Nombre", nif: "NIF", pct: "Porcentaje", relacion: "Parentesco", renuncia: "Renuncia", separado: "Separación", edad: "Edad", valor: "Valor", descripcion: "Descripción", tipo: "Tipo", titularidad: "Titularidad", fecha: "Fecha", fase: "Fase", responsable: "Responsable", testamento: "Tipo de sucesión", ccaa: "Normativa del impuesto", estado: "Estado", cat: "Categoría", tramiteId: "Trámite", importe: "Importe", concepto: "Concepto", direccion: "Dirección", tel: "Teléfono", email: "Correo", rol: "Rol", colegio: "Colegio", localidad: "Localidad", ref: "Referencia", honorarios: "Honorarios", notas: "Notas", municipio: "Municipio", refCatastral: "Referencia catastral" };
const RED_LISTAS = { personas: "Herederos y personas", bienes: "Bienes", tramites: "Trámites", movimientos: "Fondos", abogados: "Equipo", __docs: "Documentos", deudas: "Deudas", donaciones: "Donaciones", tareas: "Tareas" };
const redCampo = (k) => RED_CAMPOS[k] || String(k).replace(/^./, (c) => c.toUpperCase()).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, (c) => c.toUpperCase());
function redNombreDe(o) { return o && typeof o === "object" ? o.nombre || o.descripcion || o.concepto || o.titulo || (o.relacion && typeof RELACIONES === "object" && RELACIONES[o.relacion] ? RELACIONES[o.relacion].label : "") || "" : ""; }
// «Herederos y personas · Ana Ruiz · NIF»
function redEtiqueta(item, c) {
  const p = c.pasos || []; if (!p.length) return "El expediente";
  const partes = []; let o = p[0] === "__docs" ? item.docs : item.x;
  for (let i = p[0] === "__docs" ? 1 : 0; i < p.length; i++) {
    const s = p[i];
    if (s && typeof s === "object") { const el = Array.isArray(o) ? o.find((e) => e && e.id === s.id) : null; partes.push(redNombreDe(el) || redNombreDe(c.aqui) || redNombreDe(c.alli) || "Elemento"); o = el; }
    else { partes.push(RED_LISTAS[s] || redCampo(s)); o = o && typeof o === "object" ? o[s] : undefined; }
  }
  if (p[0] === "__docs") partes.unshift("Documentos");
  return partes.join(" · ");
}
function redValor(v) {
  if (v === undefined || v === null || v === "") return "(vacío)";
  if (v === true) return "Sí"; if (v === false) return "No";
  if (typeof v === "number") return v.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  if (typeof v === "object") { const n = redNombreDe(v); return n ? n + (v.valor != null ? " · " + Number(v.valor).toLocaleString("es-ES") + " €" : "") : Array.isArray(v) ? `${v.length} elementos` : "Datos"; }
  const s = String(v); return /^\d{4}-\d{2}-\d{2}$/.test(s) && typeof fechaLarga === "function" ? fechaLarga(s) : s.length > 160 ? s.slice(0, 157) + "…" : s;
}
function redChoqueHTML(e, c) {
  const it = { x: e.x, docs: e.id === "_despacho" ? [] : (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d && d.expId === e.id).map(redDocMeta) };
  const cuando = c.t ? ` · ${typeof sgFechaHora === "function" ? sgFechaHora(c.t) : c.t}` : "";
  const opt = (v, tit, sub, act) => `<button class="sg-opt red-opt" data-red="elegir-c" data-x="${redH(e.id)}" data-c="${redH(c.id)}" data-v="${v}"><i></i><span><b>${tit}</b><small>${sub}</small></span></button>`;
  if (c.tipo === "borrado-alli" || c.tipo === "borrado-aqui") {
    const quien = c.tipo === "borrado-alli" ? c.por : c.porAqui, otro = c.tipo === "borrado-alli" ? c.porAqui : c.por;
    return `<div class="red-ch"><p class="red-ch-t"><b>${redH(redPor(quien))} borró este expediente</b><small>pero ${redH(redPor(otro))} lo había cambiado después, así que se ha conservado${cuando}.</small></p><div class="red-ch-o">${opt("conservar", "Conservarlo", "Sigue en todos los equipos, con los últimos cambios.")}${opt("borrar", "Borrarlo", "Se quita de todos los equipos del despacho en red.")}</div></div>`;
  }
  const et = redH(redEtiqueta(it, c));
  if (c.tipo === "quitado-alli" || c.tipo === "quitado-aqui") {
    const quito = c.tipo === "quitado-alli" ? c.por : c.porAqui, cambio = c.tipo === "quitado-alli" ? c.porAqui : c.por;
    const vConservar = c.tipo === "quitado-alli" ? "aqui" : "alli", vQuitar = c.tipo === "quitado-alli" ? "alli" : "aqui";
    return `<div class="red-ch"><p class="red-ch-t"><b>${et}</b><small>${redH(redPor(quito))} lo quitó y ${redH(redPor(cambio))} lo cambió${cuando}. Mientras decides, se conserva.</small></p><div class="red-ch-o">${opt(vConservar, "Conservarlo", `Con los cambios de ${redH(redPor(cambio))}: ${redH(redValor(c.tipo === "quitado-alli" ? c.aqui : c.alli))}`)}${opt(vQuitar, "Quitarlo", `Como hizo ${redH(redPor(quito))}.`)}</div></div>`;
  }
  return `<div class="red-ch"><p class="red-ch-t"><b>${et}</b><small>Se cambió a la vez en dos equipos${cuando}.</small></p><div class="red-ch-o">${opt("aqui", redH(redValor(c.aqui)), redH(redPor(c.porAqui)) + " · es el que se ve ahora")}${opt("alli", redH(redValor(c.alli)), redH(redPor(c.por)))}</div></div>`;
}
function redModalChoques(soloId) {
  const L = redChoques().filter((e) => !soloId || e.id === soloId);
  if (!L.length) { sgCerrarModal(); toast("No quedan cambios en conflicto"); redRepintar(); return; }
  const tit = (e) => e.id === "_despacho" ? "Datos del despacho" : `${redH(e.x.despacho?.ref || "")}${e.x.despacho?.ref ? " · " : ""}${redH(typeof nombreExp === "function" ? nombreExp(e.x) : e.x.nombre || "Expediente")}`;
  sgModal("Cambios en conflicto", `<p class="sg-lead">Dos equipos cambiaron lo mismo antes de ver el cambio del otro. {{MARCA}} ha guardado las dos versiones: elige cuál se queda. Lo que elijas llega a todos los equipos.</p>${L.map((e) => `<div class="sectitle">${tit(e)}</div>${e.c.map((c) => redChoqueHTML(e, c)).join("")}`).join("")}`, true);
}
async function redResolver(xid, cid, v) {
  const e = redChoques().find((q) => q.id === xid); if (!e) return;
  const c = e.c.find((q) => q.id === cid); if (!c) return;
  if (c.tipo === "borrado-alli" || c.tipo === "borrado-aqui") {
    e.x.redConflictos = e.c.filter((q) => q !== c); if (!e.x.redConflictos.length) delete e.x.redConflictos;
    if (v === "borrar") { guardar(); await rbBorrarExpediente(xid); if (typeof ui === "object" && ui.id === xid) go({ vista: "inicio", id: null, sheet: null }); toast("Expediente borrado en todos los equipos"); }
    else { guardar(); toast("Se conserva el expediente"); }
    redModalChoques(); return;
  }
  const docsAntes = xid === "_despacho" ? [] : (typeof ARCH === "object" ? ARCH.lista : []).filter((d) => d && d.expId === xid).map(redDocMeta);
  const it = { x: e.x, docs: JSON.parse(JSON.stringify(docsAntes)) };
  rmResolver(it, cid, v === "alli" ? "alli" : "aqui");
  if (xid === "_despacho") DB.despacho = Object.assign({}, it.x, { yo: despachoCfg().yo });
  // Documentos: lo que la elección haya cambiado en la lista
  if ((c.pasos || [])[0] === "__docs") {
    const nuevos = new Map(it.docs.map((d) => [d.id, d])), quitar = docsAntes.filter((d) => !nuevos.has(d.id)).map((d) => d.id);
    for (const d of it.docs) { const a = docsAntes.find((q) => q.id === d.id); if (a && JSON.stringify(a) !== JSON.stringify(d)) await redDocPoner(xid, d); }
    if (quitar.length) await redDocsQuitar(quitar);
    if (typeof archivoCargar === "function") await archivoCargar();
  }
  guardar(); toast("Elegido. Se aplica en todos los equipos.");
  redModalChoques(); redRepintar();
}

// ═════════ Asistente (3 pasos) ═════════
function redAsistente(paso, err) {
  const A = RED.asis = RED.asis || { paso: 1, pw: true };
  if (paso) A.paso = paso;
  const e = `<p class="sg-error" role="alert">${err ? redH(err) : ""}</p>`;
  const h = (n, t) => `<p class="red-paso">Paso ${n} de 3</p><h3 class="red-h">${t}</h3>`;
  if (A.paso === 1) {
    sgModal("Despacho en red", `${h(1, "Elige la carpeta compartida")}<p class="sg-lead">Los ordenadores del despacho comparten los expedientes a través de una carpeta que ya tenéis sincronizada en todos ellos. {{MARCA}} no usa ningún servidor propio: los datos no salen del despacho y de los servicios que ya usáis.</p>
      <div class="group sg-g" style="--inset:60px">${sgFila(I.folder, "blue", "OneDrive, Dropbox o Google Drive para escritorio", "Una carpeta compartida con todo el despacho y sincronizada en cada ordenador.", "")}${sgFila(I.folder, "q", "Carpeta del servidor o del NAS del despacho", "Una unidad de red que todos los equipos tengan conectada.", "")}</div>
      <div class="sg-optbox warn"><b>Elige la misma carpeta en todos los equipos.</b><span>Dentro, {{MARCA}} usa la subcarpeta «hereda-red». No la muevas ni cambies sus archivos a mano. No elijas la carpeta de copias de seguridad.</span></div>
      <div class="sg-mfoot"><button class="btn" data-red="elegir">Elegir la carpeta compartida</button></div>${e}`, true);
    return;
  }
  if (A.paso === 2) {
    const sug = A.equipo || (redYoNombre() && redYoNombre() !== "Titular del despacho" ? "Ordenador de " + redYoNombre() : "");
    sgModal("Despacho en red", `${h(2, "Nombre de este equipo")}<p class="sg-lead">Carpeta «${redH(A.dir.name)}»${A.desp ? `: ya tiene el despacho en red <b>«${redH(A.desp.nombre || "sin nombre")}»</b>` : ": aún no tiene ningún despacho en red"}. El nombre del equipo sirve para saber quién hizo cada cambio y quién tiene abierto un expediente.</p>
      <div class="sg-form col red-f"><label for="red-equipo">Nombre de este equipo</label><input id="red-equipo" maxlength="40" autocomplete="off" placeholder="Ej.: Recepción, Portátil de Marta" value="${redH(sug)}"></div>
      <div class="sg-mfoot"><button class="btn" data-red="paso3">Seguir</button><button class="btn gray" data-red="atras" data-v="1">Atrás</button></div>${e}`, true);
    return;
  }
  if (A.desp) { // unirse
    const d = A.desp;
    sgModal("Despacho en red", `${h(3, `Unirse a «${redH(d.nombre || "despacho")}»`)}<div class="sg-prev"><div><span>Creado</span><b>${redH(typeof sgFechaHora === "function" ? sgFechaHora(d.creado) : d.creado)}</b></div><div><span>Este equipo</span><b>${redH(A.equipo)}</b></div><div><span>Cifrado</span><b>${d.cifrado ? "Sí, con contraseña" : "No"}</b></div></div>
      <p class="sg-lead" style="margin-top:16px">Los expedientes de este equipo (${(DB.expedientes || []).filter(redSincronizable).length}) se añadirán a la carpeta y recibirás los del despacho. No se borra nada. Si un mismo expediente está en los dos sitios con datos distintos, {{MARCA}} te preguntará qué se queda.</p>
      ${d.cifrado ? `<div class="sg-form col red-f"><label for="red-pj">Contraseña del despacho en red</label><input id="red-pj" type="password" autocomplete="off" placeholder="La que se puso al crearlo"></div>` : ""}
      <div class="sg-mfoot"><button class="btn" data-red="unirse">Unirse</button><button class="btn gray" data-red="atras" data-v="2">Atrás</button></div>${e}`, true);
    return;
  }
  sgModal("Despacho en red", `${h(3, "Crear el despacho en red")}<p class="sg-lead">La carpeta está vacía: este será el primer equipo. Después, en cada ordenador del despacho, abre {{MARCA}} en Chrome o Edge, elige esta misma carpeta y pulsa «Unirse».</p>
    <div class="sg-opts" role="radiogroup" aria-label="Protección de la carpeta"><button class="sg-opt" role="radio" data-red="modoPw" data-v="si" aria-checked="${!!A.pw}"><i></i><span><b>Con contraseña <em>recomendado</em></b><small>Los archivos de la carpeta van cifrados (AES-256): el servicio de la nube solo ve datos ilegibles. Cada equipo la escribe una vez, al unirse.</small></span></button><button class="sg-opt" role="radio" data-red="modoPw" data-v="no" aria-checked="${!A.pw}"><i></i><span><b>Sin contraseña</b><small>Solo si la carpeta está en el servidor del despacho y nadie de fuera tiene acceso a ella.</small></span></button></div>
    ${A.pw ? `<div class="sg-form col"><input id="red-p1" type="password" autocomplete="new-password" placeholder="Contraseña del despacho (mínimo 10 caracteres)" aria-label="Contraseña del despacho"><input id="red-p2" type="password" autocomplete="new-password" placeholder="Repite la contraseña" aria-label="Repite la contraseña"></div><div class="sg-optbox warn"><b>Si se olvida, nadie puede leer la carpeta, tampoco {{MARCA}}.</b><span>Cada equipo conserva sus expedientes, pero un equipo nuevo no podrá unirse. ${SG.cifrado ? "Puede ser distinta de la contraseña de este equipo. " : ""}Guárdala en un lugar seguro.</span></div>` : ""}
    <div class="sg-mfoot"><button class="btn" data-red="crear">Crear el despacho en red</button><button class="btn gray" data-red="atras" data-v="2">Atrás</button></div>${e}`, true);
}
async function redElegirCarpeta() {
  const A = RED.asis; let dir;
  if (typeof window.__redCarpetaPrueba === "function") dir = window.__redCarpetaPrueba();
  else { try { dir = await window.showDirectoryPicker({ id: "hereda-red", mode: "readwrite", startIn: "documents" }); } catch (e) { return; } }
  if ((await sgPermiso(dir, true)) !== "granted") { redAsistente(1, "Sin permiso para escribir en esa carpeta."); return; }
  if (/^hereda\+? copias$/i.test(dir.name)) { redAsistente(1, "Esa es la carpeta de las copias de seguridad. Elige la carpeta compartida del despacho."); return; }
  let raiz = null; if (dir.name === "hereda-red") raiz = dir; else { try { raiz = await dir.getDirectoryHandle("hereda-red"); } catch (e) {} }
  const desp = raiz ? await rmLeerDespacho(redCarpetaDe(raiz)) : null;
  if (desp && desp.danado) { redAsistente(1, "La carpeta tiene un despacho en red cuyo archivo principal está dañado o a medio sincronizar. Espera a que el servicio termine o elige otra carpeta."); return; }
  Object.assign(A, { dir, raiz, desp }); redAsistente(2);
}
async function redCrear() {
  const A = RED.asis, p1 = sgVal("red-p1"), p2 = sgVal("red-p2");
  if (A.pw) { if (p1.length < 10) { redAsistente(3, "La contraseña debe tener al menos 10 caracteres"); return; } if (p1 !== p2) { redAsistente(3, "Las dos contraseñas no coinciden"); return; } }
  if (!A.pw && !sgCryptoOK()) {} // sin contraseña no hace falta cifrado
  if (A.pw && !sgCryptoOK()) { redAsistente(3, "Para cifrar hace falta abrir {{MARCA}} desde su dirección segura (https)."); return; }
  const b = document.querySelector('[data-red="crear"]'); if (b) { b.disabled = true; b.textContent = "Creando…"; }
  try {
    const raiz = A.raiz || await A.dir.getDirectoryHandle("hereda-red", { create: true });
    const carpeta = redCarpetaDe(raiz);
    const ya = await rmLeerDespacho(carpeta); if (ya && !ya.danado) { A.raiz = raiz; A.desp = ya; redAsistente(3, "Otro equipo acaba de crear el despacho en esta carpeta: únete a él."); return; }
    let dek = null, sobre = null;
    if (A.pw) { dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); sobre = await sgNuevoSobre(p1, dek); }
    const { desp, sal } = await rmCrearDespacho(carpeta, { nombre: despachoCfg().nombre || "Despacho", cripto: redCripto(dek), sobre });
    await redConectar({ raiz, desp, dek, sal, nuevo: true });
  } catch (e) { console.error(e); redAsistente(3, "No se pudo crear: " + String(e && e.message || e)); }
}
async function redUnirse() {
  const A = RED.asis, d = A.desp; let dek = null, sal = "";
  const b = document.querySelector('[data-red="unirse"]'); if (b) { b.disabled = true; b.textContent = "Comprobando…"; }
  if (d.cifrado) {
    if (!sgCryptoOK()) { redAsistente(3, "Este despacho en red está cifrado: hace falta abrir {{MARCA}} desde su dirección segura (https)."); return; }
    try { dek = await sgAbrirSobre(sgVal("red-pj"), d.k); sal = await rmComprobarClave(d, redCripto(dek)); }
    catch (e) { await new Promise((r) => setTimeout(r, 600)); redAsistente(3, "La contraseña del despacho en red no es correcta."); return; }
  }
  try { await redConectar({ raiz: A.raiz, desp: d, dek, sal, nuevo: false }); } catch (e) { console.error(e); redAsistente(3, "No se pudo unir: " + String(e && e.message || e)); }
}
// Deja este equipo conectado y hace la primera sincronización
async function redConectar({ raiz, desp, dek, sal, nuevo }) {
  const A = RED.asis || {};
  const estado = rmEstadoNuevo(desp.id);
  RED.raiz = raiz; RED.carpeta = redCarpetaDe(raiz); RED.clave = dek; RED.sal = sal || ""; RED.permiso = "granted"; RED.falta = ""; RED.error = "";
  RED.cfg = { h: typeof window.__redCarpetaPrueba === "function" ? "prueba" : raiz, padre: A.dir && A.dir !== raiz ? A.dir.name : "", equipo: A.equipo || "Este equipo", equipoId: estado.equipoId, despachoId: desp.id, despachoNombre: desp.nombre || "", cifrado: !!desp.cifrado, desde: new Date().toISOString() };
  RED.estado = estado; RED.estadoTxt = "";
  // Al unirse: los datos del despacho de la carpeta mandan (equipo de personas, contacto); las personas que solo están aquí se añaden
  if (!nuevo) {
    try {
      const r = await rmDeserializar(redCtx(), "exp", await RED.carpeta.leer("expedientes/_despacho.json"), "_despacho");
      if (r.ok) {
        const D = despachoCfg(), R = r.obj.x, yo = D.yo;
        const ids = new Set((R.abogados || []).map((a) => a.id));
        const abogados = (R.abogados || []).concat((D.abogados || []).filter((a) => !ids.has(a.id)));
        const nuevoD = Object.assign({}, D); for (const [k, v] of Object.entries(R)) if (v !== "" && v != null) nuevoD[k] = v;
        nuevoD.abogados = abogados; nuevoD.yo = abogados.some((a) => a.id === yo) ? yo : (abogados[0] || {}).id;
        DB.despacho = nuevoD; guardar();
        estado.bases._despacho = { h: r.obj.h, rev: r.obj.rev || 0, hist: r.obj.hist, x: JSON.parse(JSON.stringify(R)), docs: [] };
      }
    } catch (e) { console.error(e); }
  }
  await redGuardarCfg(); await redEstadoGuardar();
  RED.activo = true; redEnganchar(); redProgramar();
  A.paso = 4; redListo("Sincronizando…");
  const res = await redSincronizar("alta");
  redListo(res && res.ok ? "" : RED.error || "La primera sincronización no ha terminado: se reintentará sola.");
}
function redListo(nota) {
  const A = RED.asis || {}, D = despachoCfg(), n = (DB.expedientes || []).filter(redSincronizable).length;
  sgModal("Despacho en red", `<h3 class="red-h">Listo: este equipo está en el despacho en red</h3><div class="sg-prev"><div><span>Despacho</span><b>${redH(RED.cfg.despachoNombre || D.nombre || "—")}</b></div><div><span>Este equipo</span><b>${redH(RED.cfg.equipo)}</b></div><div><span>Expedientes aquí</span><b>${n}</b></div><div><span>Cifrado</span><b>${RED.cfg.cifrado ? "Sí" : "No"}</b></div></div>
    <div class="sg-form col red-f" style="margin-top:16px"><label for="red-yo">Quién usa este equipo</label><select id="red-yo" data-redyo="1">${D.abogados.map((a) => `<option value="${redH(a.id)}" ${D.yo === a.id ? "selected" : ""}>${redH(a.nombre)}</option>`).join("")}</select><span class="red-hint">Firma los cambios y la bitácora. Si no estás en la lista, añádete en Despacho y ajustes › Equipo.</span></div>
    ${nota ? `<p class="group-foot">${redH(nota)}</p>` : ""}<p class="group-foot">Cada cambio se escribe en la carpeta al guardarlo; los de los demás se leen al abrir {{MARCA}}, al volver a la ventana y cada 45 segundos. Para añadir otro ordenador: abre {{MARCA}} en él, Despacho y ajustes › Despacho en red, elige esta misma carpeta y pulsa «Unirse».</p>
    <div class="sg-mfoot"><button class="btn" data-red="hecho">Hecho</button></div>`, true);
}
async function redDesconectar() {
  try { if (RED.activo && RED.permiso === "granted" && !RED.falta) await rmPresencia(redCtx(), { cerrado: true }); } catch (e) {}
  RED.activo = false; clearInterval(RED.t); clearInterval(RED.tVer);
  await sgKVBorrar("red"); await sgKVBorrar("red-estado");
  Object.assign(RED, { cfg: null, estado: null, raiz: null, carpeta: null, clave: null, sal: "", permiso: null, falta: "", error: "", resumen: null, presencia: [] });
  sgCerrarModal(); toast("Este equipo ya no sincroniza. No se ha borrado nada."); redRepintar();
}
async function redReclave() {
  let dek = null; const b = document.querySelector('[data-red="reclaveSi"]'); if (b) { b.disabled = true; b.textContent = "Comprobando…"; }
  try { const d = await rmLeerDespacho(RED.carpeta); dek = await sgAbrirSobre(sgVal("red-pj"), d.k); RED.sal = await rmComprobarClave(d, redCripto(dek)); }
  catch (e) { redModalReclave("La contraseña del despacho en red no es correcta."); return; }
  RED.clave = dek; RED.falta = ""; RED.cfg.cifrado = true; await redGuardarCfg(); sgCerrarModal(); toast("Despacho en red reanudado"); await redSincronizar("clave"); redRepintar();
}
function redModalReclave(err) {
  sgModal("Contraseña del despacho en red", `<p class="sg-lead">Para seguir sincronizando, escribe la contraseña del despacho en red (la que se puso al crearlo, no la de este equipo).</p><div class="sg-form col"><input id="red-pj" type="password" autocomplete="off" placeholder="Contraseña del despacho en red" aria-label="Contraseña del despacho en red"></div><div class="sg-mfoot"><button class="btn" data-red="reclaveSi">Seguir</button></div><p class="sg-error" role="alert">${err ? redH(err) : ""}</p>`);
}

// ═════════ Interfaz: ajustes, franja y barra lateral ═════════
function redEstadoTxt() {
  if (!RED.resumen && !RED.ultimoMs) return "pendiente de la primera sincronización";
  return "sincronizado " + (typeof sgHace === "function" ? sgHace(new Date(RED.ultimoMs || Date.now()).toISOString()) : "");
}
const redVivos = () => (RED.presencia || []).filter((p) => p.vivo);
function redAjustesHTML() {
  const t = `<div class="sectitle">Despacho en red</div>`;
  if (!redFSA()) return `${t}<div class="group sg-g" style="--inset:60px">${sgFila(I.people, "q", "Trabajar varios en el mismo despacho", "Este navegador no puede usar una carpeta compartida: hace falta Chrome o Edge en el ordenador. Mientras, los expedientes se pasan con «Exportar este expediente» (menú ⋯ del expediente) e «Importar un archivo» (aquí, en Datos).", "")}</div>`;
  if (!RED.cfg) return `${t}<div class="group sg-g" style="--inset:60px">${sgFila(I.people, "blue", "Trabajar varios en el mismo despacho", "Comparte los expedientes entre los ordenadores del despacho a través de una carpeta de OneDrive, Dropbox, Google Drive o del servidor. Sin servidores de {{MARCA}}.", I.chev, 'data-red="asistente"')}</div>`;
  const c = RED.cfg, n = redChoquesTotal(), vivos = redVivos();
  let fila;
  if (RED.permiso && RED.permiso !== "granted") fila = sgFila(I.people, "orange", "Despacho en red en pausa", `El navegador pide permiso de nuevo para la carpeta «${redH(c.padre || "hereda-red")}».`, `<span class="sg-acts"><button class="btn sm gray" data-red="reanudar">Reanudar</button></span>`);
  else if (redPausa()) fila = sgFila(I.people, "orange", "Despacho en red en pausa", redH(redPausa()), "");
  else if (RED.falta) fila = sgFila(I.people, "orange", "Falta la contraseña del despacho en red", "Este equipo no puede leer la carpeta cifrada sin ella (por ejemplo, tras quitar la contraseña de este equipo).", `<span class="sg-acts"><button class="btn sm gray" data-red="reclave">Escribirla</button></span>`);
  else fila = sgFila(I.people, RED.error ? "orange" : "green", `Conectado a «${redH(c.despachoNombre || "despacho")}»`, `Este equipo: ${redH(c.equipo)} · ${redEstadoTxt()}${c.cifrado ? " · cifrado" : ""}${RED.error ? ` · <span class="sg-err">${redH(RED.error)}</span>` : ""}`, `<span class="sg-acts"><button class="btn sm gray" data-red="sincronizar">Sincronizar</button></span>`);
  const eq = sgFila(I.person, "q", "Equipos conectados ahora", vivos.length ? vivos.map((p) => redH(p.nombre + (p.persona ? " (" + p.persona + ")" : ""))).join(", ") : "Ningún otro equipo en este momento", "");
  const ch = n ? sgFila(SG_IC.warn, "orange", `${n === 1 ? "1 cambio" : n + " cambios"} en conflicto`, "Dos equipos cambiaron lo mismo: elige qué se queda.", I.chev, 'data-red="choques"') : "";
  const il = RED.resumen && RED.resumen.ilegibles ? sgFila(SG_IC.warn, "q", `${RED.resumen.ilegibles === 1 ? "1 archivo" : RED.resumen.ilegibles + " archivos"} de la carpeta aún no se pueden leer`, "Suele ser el servicio de sincronización a mitad de bajarlos. Si sigue así, se apartan solos en «averiados».", "") : "";
  const pend = RED.resumen && RED.resumen.docsPendientes ? sgFila(I.folder, "q", `${RED.resumen.docsPendientes === 1 ? "1 documento" : RED.resumen.docsPendientes + " documentos"} esperando a llegar`, "Otro equipo los ha añadido y el servicio aún no los ha bajado a este ordenador.", "") : "";
  return `${t}<div class="group sg-g" style="--inset:60px">${fila}${eq}${ch}${il}${pend}</div><div class="sg-mini"><button data-red="renombrar">Cambiar el nombre de este equipo</button><button data-red="desconectar">Dejar de sincronizar</button></div>
    <p class="group-foot">Carpeta «hereda-red»${c.padre ? ` dentro de «${redH(c.padre)}»` : ""}. Cada cambio se escribe al guardarlo; los de los demás se leen al abrir {{MARCA}}, al volver a la ventana y cada 45 segundos. Con OneDrive, Dropbox o Drive, lo que hace otro equipo tarda lo que tarde el servicio en subirlo y bajarlo (normalmente segundos; a veces, minutos).</p>`;
}
function redBanner() {
  if (!RED.cfg || (typeof SG === "object" && SG.bloqueado)) return "";
  const b = (cls, ico, txt, acts) => `<div class="sg-banner ${cls}" role="status"><span class="sg-bi">${ico}</span><span class="sg-bt">${txt}</span><span class="sg-sp"></span>${acts || ""}</div>`;
  let out = "";
  if (RED.permiso && RED.permiso !== "granted") out += b("warn red-banner", I.people, "<b>Despacho en red en pausa</b><span class='sg-sub'> · el navegador pide permiso de nuevo para la carpeta compartida</span>", `<button class="sg-bb sg-pri" data-red="reanudar">Reanudar</button>`);
  else if (RED.falta) out += b("warn red-banner", I.people, "<b>Despacho en red en pausa</b><span class='sg-sub'> · falta la contraseña del despacho en red</span>", `<button class="sg-bb sg-pri" data-red="reclave">Escribirla</button>`);
  if (typeof ui !== "object") return out;
  if (ui.vista === "exp" && ui.id) {
    const x = DB.expedientes.find((q) => q.id === ui.id), n = x && Array.isArray(x.redConflictos) ? x.redConflictos.length : 0;
    if (n) out += b("warn red-banner", SG_IC.warn, `<b>Este expediente tiene ${n === 1 ? "un cambio" : n + " cambios"} en conflicto</b><span class='sg-sub'> · se cambió lo mismo en dos equipos</span>`, `<button class="sg-bb sg-pri" data-red="choques" data-x="${redH(ui.id)}">Revisar</button>`);
    const otros = redVivos().filter((p) => p.abierto === ui.id);
    if (otros.length) out += b("info red-pres", I.people, `<b>${redH(otros.map((p) => p.persona || p.nombre).join(" y "))} ${otros.length === 1 ? "también tiene" : "también tienen"} abierto este expediente</b><span class='sg-sub'> · en ${redH(otros.map((p) => p.nombre).join(" y "))}. Si cambiáis el mismo dato, {{MARCA}} preguntará cuál se queda.</span>`, "");
  } else if (ui.vista === "inicio") {
    const n = redChoquesTotal();
    if (n) out += b("warn red-banner", SG_IC.warn, `<b>Hay ${n === 1 ? "un cambio" : n + " cambios"} en conflicto entre equipos</b><span class='sg-sub'> · se cambió lo mismo en dos ordenadores</span>`, `<button class="sg-bb sg-pri" data-red="choques">Revisar</button>`);
  }
  return out;
}
function redSideItem() {
  if (!RED.cfg) return "";
  const n = redChoquesTotal(), v = redVivos().length;
  const sub = (RED.permiso && RED.permiso !== "granted") || redPausa() ? "En pausa" : RED.falta ? "Falta la contraseña" : RED.error ? "Con avisos" : `${v ? (v === 1 ? "1 equipo más" : v + " equipos más") : "Solo este equipo"}${n ? ` · ${n} en conflicto` : ""}`;
  return `<button class="sitem" data-red="ajustes"><span class="ic">${I.people}</span><span class="t"><b>Despacho en red</b><small>${redH(sub)}</small></span>${n ? `<i class="dot warn" aria-hidden="true"></i>` : ""}</button>`;
}

// ═════════ Eventos ═════════
function redAccion(a, b) {
  const A = RED.asis;
  if (a === "asistente") { RED.asis = { paso: 1, pw: true }; redAsistente(1); return; }
  if (a === "elegir") { redElegirCarpeta().catch((e) => { console.error(e); redAsistente(1, "No se pudo abrir la carpeta"); }); return; }
  if (a === "paso3" && A) { const n = sgVal("red-equipo").trim(); if (!n) { redAsistente(2, "Escribe un nombre para este equipo"); return; } A.equipo = n.slice(0, 40); redAsistente(3); return; }
  if (a === "atras" && A) { redAsistente(Number(b.dataset.v) || 1); return; }
  if (a === "modoPw" && A) { A.pw = b.dataset.v === "si"; redAsistente(3); return; }
  if (a === "crear" && A) { redCrear(); return; }
  if (a === "unirse" && A) { redUnirse(); return; }
  if (a === "hecho") { sgCerrarModal(); RED.asis = null; redRepintar(); return; }
  if (a === "reanudar") { redReanudar(); return; }
  if (a === "sincronizar") { redSincronizar("manual").then((r) => { toast(r && r.ok ? "Sincronizado" : redPausa() || RED.error || "No se pudo sincronizar"); redRepintar(); }); return; }
  if (a === "choques") { redModalChoques(b.dataset.x || ""); return; }
  if (a === "elegir-c") { redResolver(b.dataset.x, b.dataset.c, b.dataset.v); return; }
  if (a === "ajustes") { if (typeof ayAjustes === "function") ayAjustes("Despacho en red"); else { ui.sheet = { tipo: "ajustes" }; render(); } return; }
  if (a === "reclave") { redModalReclave(); return; }
  if (a === "reclaveSi") { redReclave(); return; }
  if (a === "renombrar") { sgModal("Nombre de este equipo", `<div class="sg-form col red-f"><label for="red-equipo">Nombre de este equipo</label><input id="red-equipo" maxlength="40" value="${redH(RED.cfg ? RED.cfg.equipo : "")}"></div><div class="sg-mfoot"><button class="btn" data-red="guardarNombre">Guardar</button></div>`); return; }
  if (a === "guardarNombre") { const n = sgVal("red-equipo").trim(); if (n && RED.cfg) { RED.cfg.equipo = n.slice(0, 40); redGuardarCfg(); RED.abierto = undefined; } sgCerrarModal(); redRepintar(); return; }
  if (a === "desconectar") { sgModal("Dejar de sincronizar", `<p class="sg-lead">Este equipo deja de leer y escribir en la carpeta compartida. <b>No se borra nada</b>: los expedientes siguen aquí y en la carpeta, y los demás equipos siguen sincronizando entre ellos. Para volver, usa el asistente y pulsa «Unirse».</p><div class="sg-mfoot"><button class="btn danger" data-red="desconectarSi">Dejar de sincronizar</button><button class="btn gray" data-sg="cerrar">Cancelar</button></div>`); return; }
  if (a === "desconectarSi") { redDesconectar(); return; }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-red]"); if (!b) return;
  e.preventDefault(); e.stopPropagation(); if (b.disabled) return; redAccion(b.dataset.red, b);
}, true);
document.addEventListener("change", (e) => { const t = e.target; if (!t || !t.dataset || !t.dataset.redyo) return; e.stopPropagation(); despachoCfg().yo = t.value; guardar(); }, true);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !e.target || !e.target.closest || !e.target.closest(".sg-modal")) return;
  const id = e.target.id, m = { "red-equipo": RED.cfg && RED.asis == null ? "guardarNombre" : "paso3", "red-pj": RED.asis ? "unirse" : "reclaveSi", "red-p2": "crear" }[id];
  if (m) { e.preventDefault(); const b = document.querySelector(`.sg-modal [data-red="${m}"]`); if (b) b.click(); }
}, true);
