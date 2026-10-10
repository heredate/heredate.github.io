// ───────────────────── {{MARCA}} · Despacho en red: motor de sincronización (prefijo rm / RM_) ─────────────────────
// Varios equipos del mismo despacho comparten los expedientes a través de una carpeta que el despacho ya tiene (OneDrive, Dropbox,
// Google Drive para escritorio o una carpeta del servidor). No hay servidor de {{MARCA}}: cada equipo lee y escribe archivos en esa carpeta.
// Este archivo es PURO: no pinta nada, no toca DB ni el DOM. Trabaja contra tres interfaces que le da quien lo usa (red.js en la app,
// tools/qa/red.mjs en las pruebas con una carpeta en memoria):
//   carpeta: { listar(dir) → [{ nombre, tam, mod }] · leer(ruta) → Uint8Array | null · escribir(ruta, datos) → { tam, mod }? · borrar(ruta) }
//            (rutas relativas a la carpeta «hereda-red»; listar de una carpeta que no existe devuelve [])
//   local:   { listar() → [{ id, x, docs: [meta] }] · aplicar(id, op) → bool · docBytes(docId) → Uint8Array | null }
//            op = { x (nuevo expediente, o null para quitarlo), hx (huella del expediente local que se leyó: si ya no es esa, no se toca
//            nada y devuelve false), poner: [meta (+ _bytes si es nuevo)], quitar: [docId] }
//   cripto:  null (carpeta sin cifrar) o { cifrarTexto(txt, aad) → obj, descifrarTexto(obj, aad) → txt, cifrarBytes(u8, aad) → u8,
//            descifrarBytes(u8, aad) → u8 } · sha256(u8) → hex (siempre, va aparte: rmSha256)
// Estado: un objeto serializable (rmEstadoNuevo) con la última versión sincronizada de cada expediente («base»), que el llamador guarda.
//
// Formato en la carpeta (hereda-red/):
//   despacho.json            { f: "hereda+red", v, id, nombre, creado, cifrado, k?: sobre de la clave, prueba?: texto cifrado con la sal }
//   expedientes/<id>.json    sobre { f: "hereda+red-exp", v, id, rev, h, hist, modificado, por, x, docs } (cifrado: { f, v, id, c: 1, d })
//   documentos/<nombre>      bytes del adjunto, direccionados por su contenido (SHA-256; con cifrado, el nombre lleva una sal secreta)
//   lapidas/<id>.json        borrados: { f: "hereda+red-lapida", id, rev, h, t, por }
//   presencia/<equipo>.json  latido: { f: "hereda+red-pres", equipo, nombre, persona, abierto, seq, t, cerrado }
//   averiados/               archivos que no se pudieron leer durante mucho tiempo (se apartan aquí antes de reescribirlos)
//
// Reglas de fusión (por expediente):
//   · Huella (h) del contenido; historia (hist) con las huellas de las versiones de las que desciende. Las decisiones no usan relojes.
//   · Solo cambió este equipo desde la base → se escribe. Solo cambió la carpeta → se aplica aquí. Los dos → fusión de tres vías
//     campo a campo; colecciones con id (herederos, bienes, trámites…) elemento a elemento; registros (auditoría, bitácora) se unen.
//   · Si un mismo dato cambió distinto en los dos sitios, se queda el de este equipo y el otro se guarda en x.redConflictos para que
//     el usuario elija. Si uno quitó algo que el otro cambió, se conserva y se pregunta. Nunca se pierde nada en silencio.
//   · Borrar exige una lápida: un archivo que falta no borra nada (puede ser OneDrive que aún no lo ha bajado).
//   · Un archivo que no se puede leer (a medias, cifrado con otra clave) se salta hasta que se pueda leer.
//   · Copias de conflicto de OneDrive/Dropbox/Drive («abc (1).json», «abc-PC-MARTA.json»…): se funden con la principal y se quitan.
const RM_V = 1;
const RM_HIST = 30;                 // huellas de la historia que viajan con cada versión
const RM_LOG_MAX = { auditoria: 500, bitacora: 400 };
const RM_X_FUERA = new Set(["actualizado"]);                 // cambia en cada guardado: no cuenta como cambio
const RM_DOC_FUERA = new Set(["_b", "blob", "sg", "iv", "ct", "sgIlegible", "_bytes", "archivo", "data"]);
const RM_AVERIADO_CICLOS = 10;      // ciclos seguidos sin poder leer un archivo antes de apartarlo y reescribirlo
const RM_HUERFANO_MS = 30 * 864e5;  // un adjunto que ya no usa ningún expediente se borra de la carpeta a los 30 días
const RM_PRES_MS = 150 * 1000;      // un equipo cuenta como conectado si su latido ha cambiado en los últimos 150 s (reloj propio)
const RM_DESAPARECIDO_MS = 10 * 6e4; // un archivo que falta sin lápida se espera 10 min antes de reescribirlo (la lápida puede llegar después)
const rmTE = new TextEncoder(), rmTD = new TextDecoder();

// ═════════ Utilidades ═════════
const rmObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// JSON canónico: claves ordenadas, sin undefined (dos versiones con el mismo contenido dan la misma huella)
function rmCanon(v) {
  if (v === null || typeof v !== "object") return v === undefined ? "null" : JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(rmCanon).join(",") + "]";
  const k = Object.keys(v).filter((q) => v[q] !== undefined).sort();
  return "{" + k.map((q) => JSON.stringify(q) + ":" + rmCanon(v[q])).join(",") + "}";
}
// Huella de 128 bits (no criptográfica; síncrona): cuatro mezclas de 32 bits
function rmHash(s) {
  let a = 0xdeadbeef ^ s.length, b = 0x41c6ce57 ^ s.length, c = 0x9e3779b9 ^ s.length, d = 0x85ebca6b;
  for (let i = 0; i < s.length; i++) { const k = s.charCodeAt(i); a = Math.imul(a ^ k, 2654435761); b = Math.imul(b ^ k, 1597334677); c = Math.imul(c ^ k, 2246822507); d = Math.imul(d ^ k, 3266489909); }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  c = Math.imul(c ^ (c >>> 16), 2246822507) ^ Math.imul(d ^ (d >>> 13), 3266489909);
  d = Math.imul(d ^ (d >>> 16), 2246822507) ^ Math.imul(c ^ (c >>> 13), 3266489909);
  return [a, b, c, d].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
}
const rmIgual = (a, b) => a === b || (typeof a === "object" && typeof b === "object" && a !== null && b !== null && rmCanon(a) === rmCanon(b));
const rmCopia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const rmSinX = (x) => { if (!rmObj(x)) return x; const o = {}; for (const k of Object.keys(x)) if (!RM_X_FUERA.has(k)) o[k] = x[k]; return o; };
const rmDocMeta = (d) => { const o = {}; for (const k of Object.keys(d || {})) if (!RM_DOC_FUERA.has(k) && d[k] !== undefined) o[k] = d[k]; return o; };
const rmDocsOrden = (L) => (Array.isArray(L) ? L : []).filter((d) => d && d.id != null).map(rmDocMeta).sort((a, b) => String(a.id).localeCompare(String(b.id)));
const rmHuellaX = (x) => rmHash(rmCanon(rmSinX(x)));
const rmHuella = (it) => rmHash(rmCanon({ x: rmSinX(it.x), d: rmDocsOrden(it.docs) }));
// Nombre de archivo de un expediente: el id si es seguro; si no, una huella del id
const rmNombre = (id) => (/^[A-Za-z0-9_]{1,80}$/.test(String(id)) ? String(id) : "x" + rmHash(String(id)).slice(0, 24)) + ".json";
const rmTexto = (u) => (typeof u === "string" ? u : u ? rmTD.decode(u) : null);
async function rmSha256(u8) { const h = await crypto.subtle.digest("SHA-256", u8); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const rmAzarId = () => { const u = new Uint8Array(9); crypto.getRandomValues(u); return [...u].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14); };
const rmIso = (ms) => new Date(ms).toISOString();

// ═════════ Fusión de tres vías ═════════
// b: base común (o undefined si no se conoce) · l: este equipo · r: la carpeta. Devuelve la versión fundida; los choques van a C.
// En un choque se queda el valor de este equipo (lo que el usuario tiene delante) y el otro queda guardado en el choque.
function rmConIds(...arrs) {
  let alguno = false;
  for (const a of arrs) {
    if (a === undefined) continue; if (!Array.isArray(a)) return false;
    const vistos = new Set();
    for (const e of a) { if (!rmObj(e) || (typeof e.id !== "string" && typeof e.id !== "number") || vistos.has(e.id)) return false; vistos.add(e.id); alguno = true; }
  }
  return alguno;
}
const rmEsLog = (clave, ...arrs) => Object.prototype.hasOwnProperty.call(RM_LOG_MAX, clave) && arrs.every((a) => a === undefined || Array.isArray(a));
function rmCombinar(b, l, r, pasos, C) {
  if (rmIgual(l, r)) return l;
  if (rmIgual(b, l)) return r;
  if (rmIgual(b, r)) return l;
  const clave = pasos.length ? pasos[pasos.length - 1] : "";
  if (clave === "actualizado" && typeof l === "string" && typeof r === "string") return l > r ? l : r;
  if (rmObj(l) && rmObj(r)) {
    const bb = rmObj(b) ? b : {}, o = {};
    const claves = [...Object.keys(l), ...Object.keys(r).filter((k) => !(k in l))];
    for (const k of claves) { const v = rmCombinar(bb[k], l[k], r[k], [...pasos, k], C); if (v !== undefined) o[k] = v; }
    return o;
  }
  if (Array.isArray(l) && Array.isArray(r)) {
    const ba = Array.isArray(b) ? b : undefined;
    if (rmEsLog(clave, ba, l, r)) return rmUnirLog(ba || [], l, r, clave);
    if (rmConIds(ba, l, r)) return rmCombinarLista(ba || [], l, r, pasos, C);
  }
  C.push({ pasos, tipo: "valor", aqui: rmCopia(l), alli: rmCopia(r), base: rmCopia(b) });
  return l;
}
// Colección con id: elemento a elemento. Quitado en un lado y sin cambios en el otro → se quita; quitado en uno y cambiado en el otro → se conserva y se pregunta.
function rmCombinarLista(b, l, r, pasos, C) {
  const B = new Map(b.map((e) => [e.id, e])), Lm = new Map(l.map((e) => [e.id, e])), R = new Map(r.map((e) => [e.id, e]));
  const out = [];
  const uno = (id) => {
    const enB = B.has(id), enL = Lm.has(id), enR = R.has(id), p = [...pasos, { id }];
    if (enL && enR) { out.push(rmCombinar(B.get(id), Lm.get(id), R.get(id), p, C)); return; }
    if (enL) { if (!enB) { out.push(Lm.get(id)); return; } if (rmIgual(B.get(id), Lm.get(id))) return; C.push({ pasos: p, tipo: "quitado-alli", aqui: rmCopia(Lm.get(id)), alli: undefined, base: rmCopia(B.get(id)) }); out.push(Lm.get(id)); return; }
    if (enR) { if (!enB) { out.push(R.get(id)); return; } if (rmIgual(B.get(id), R.get(id))) return; C.push({ pasos: p, tipo: "quitado-aqui", aqui: undefined, alli: rmCopia(R.get(id)), base: rmCopia(B.get(id)) }); out.push(R.get(id)); }
  };
  for (const e of l) uno(e.id);
  for (const e of r) if (!Lm.has(e.id)) uno(e.id);
  return out;
}
// Registros que solo crecen (auditoría, bitácora): unión de los dos lados menos lo que cualquiera de los dos quitó o reescribió
// (auditoria.js agrupa los cambios seguidos reescribiendo la entrada más reciente). Orden: la más reciente primero.
function rmUnirLog(b, l, r, clave) {
  const k = (e) => rmCanon(e), Lk = new Set(l.map(k)), Rk = new Set(r.map(k));
  const fuera = new Set(b.map(k).filter((q) => !Lk.has(q) || !Rk.has(q)));
  const vistos = new Set(), out = [];
  for (const e of [...l, ...r]) { const q = k(e); if (fuera.has(q) || vistos.has(q)) continue; vistos.add(q); out.push(e); }
  const t = (e) => (rmObj(e) && typeof e.t === "string" ? e.t : "");
  out.sort((a, c) => (t(a) < t(c) ? 1 : t(a) > t(c) ? -1 : 0));
  const max = RM_LOG_MAX[clave] || 1000; if (out.length > max) out.length = max;
  return out;
}
// Fusiona dos versiones completas { x, docs }. Los choques nuevos se anotan en x.redConflictos.
function rmFundir(base, aqui, alli, porAlli, porAqui, ahora) {
  const C = [];
  const x = rmCombinar(base ? base.x : undefined, aqui.x, alli.x, [], C);
  const docs = rmCombinar(base ? base.docs : undefined, aqui.docs || [], alli.docs || [], ["__docs"], C);
  const xs0 = rmObj(x) ? x : rmCopia(aqui.x), xs = C.length && (xs0 === aqui.x || xs0 === alli.x) ? { ...xs0 } : xs0;
  if (C.length) {
    const prev = Array.isArray(xs.redConflictos) ? xs.redConflictos.slice() : []; // copia: nunca se toca el objeto de quien llama
    const ids = new Set(prev.map((c) => c && c.id));
    for (const c of C) {
      if (c.pasos[0] === "redConflictos") continue; // los choques sobre choques se resuelven con la lista de choques
      const id = "c" + rmHash(rmCanon([c.pasos, c.aqui, c.alli])).slice(0, 12);
      if (ids.has(id)) continue; ids.add(id);
      prev.push({ id, pasos: c.pasos, tipo: c.tipo, aqui: c.aqui, alli: c.alli, por: porAlli || null, porAqui: porAqui || null, t: ahora });
    }
    xs.redConflictos = prev;
  }
  return { x: xs, docs: Array.isArray(docs) ? docs : aqui.docs || [], nuevos: C.filter((c) => c.pasos[0] !== "redConflictos").length };
}

// ═════════ Choques: leer y resolver ═════════
// pasos: ["personas", { id: "p1" }, "nif"] · "__docs" al principio = lista de documentos (op sobre docs, no sobre x)
function rmIr(raiz, pasos) {
  let o = raiz;
  for (let i = 0; i < pasos.length - 1; i++) {
    const p = pasos[i];
    if (rmObj(p)) { if (!Array.isArray(o)) return null; o = o.find((e) => e && e.id === p.id); } else o = o == null ? undefined : o[p];
    if (o == null) return null;
  }
  return o;
}
// Aplica la elección: "aqui" deja el valor actual, "alli" pone el de la otra versión. Quita el choque.
function rmResolver(item, idChoque, eleccion) {
  const x = item.x; const L = Array.isArray(x.redConflictos) ? x.redConflictos : [];
  const c = L.find((q) => q && q.id === idChoque); if (!c) return false;
  if (eleccion === "alli") {
    const docs = c.pasos[0] === "__docs", pasos = docs ? c.pasos.slice(1) : c.pasos, raiz = docs ? item.docs : x;
    const ult = pasos[pasos.length - 1], padre = rmIr(raiz, pasos);
    if (padre != null) {
      if (rmObj(ult)) { // un elemento de una colección
        const i = padre.findIndex((e) => e && e.id === ult.id);
        if (c.alli === undefined) { if (i >= 0) padre.splice(i, 1); } else if (i >= 0) padre[i] = rmCopia(c.alli); else padre.push(rmCopia(c.alli));
      } else if (c.alli === undefined) delete padre[ult]; else padre[ult] = rmCopia(c.alli);
    }
  } else if (c.tipo === "quitado-aqui" && eleccion === "aqui") { // este equipo lo quitó: «quedarse con lo de aquí» es quitarlo
    const docs = c.pasos[0] === "__docs", pasos = docs ? c.pasos.slice(1) : c.pasos, raiz = docs ? item.docs : x;
    const ult = pasos[pasos.length - 1], padre = rmIr(raiz, pasos);
    if (padre != null && rmObj(ult) && Array.isArray(padre)) { const i = padre.findIndex((e) => e && e.id === ult.id); if (i >= 0) padre.splice(i, 1); }
  }
  x.redConflictos = L.filter((q) => q !== c); if (!x.redConflictos.length) delete x.redConflictos;
  return true;
}

// ═════════ Estado local del equipo ═════════
function rmEstadoNuevo(despachoId, equipoId) {
  return { v: RM_V, despachoId, equipoId: equipoId || rmAzarId(), bases: {}, prev: {}, borrados: {}, hashes: {}, docsPend: {}, cache: {}, ilegibles: {}, huerfanos: {}, desaparecidos: {}, pres: {}, seq: 0, ciclos: 0, ultimo: null };
}

// ═════════ Lectura y escritura de archivos ═════════
const rmAad = (desp, tipo, id) => `hereda+red:${desp}:${tipo}:${id}`;
async function rmSerializar(ctx, tipo, id, obj) {
  const txt = JSON.stringify(obj);
  if (!ctx.cripto) return txt;
  return JSON.stringify({ f: obj.f, v: RM_V, id, c: 1, d: await ctx.cripto.cifrarTexto(txt, rmAad(ctx.estado.despachoId, tipo, id)) });
}
// Devuelve { ok: true, obj } o { ok: false, motivo }. Comprueba el formato, el cifrado y (en los expedientes) la huella del contenido.
async function rmDeserializar(ctx, tipo, bytes, idEsperado) {
  const txt = rmTexto(bytes); if (txt == null) return { ok: false, motivo: "falta" };
  let o; try { o = JSON.parse(txt); } catch (e) { return { ok: false, motivo: "a medias" }; }
  if (!rmObj(o)) return { ok: false, motivo: "formato" };
  if (ctx.cripto) {
    if (o.c !== 1 || !o.d) return { ok: false, motivo: "sin cifrar" };
    try { o = JSON.parse(await ctx.cripto.descifrarTexto(o.d, rmAad(ctx.estado.despachoId, tipo, o.id))); } catch (e) { return { ok: false, motivo: "no se puede descifrar" }; }
  } else if (o.c === 1) return { ok: false, motivo: "cifrado" };
  if (idEsperado != null && o.id !== idEsperado) return { ok: false, motivo: "id" };
  if (tipo === "exp") {
    if (o.f !== "hereda+red-exp" || o.id == null || !rmObj(o.x) || typeof o.h !== "string") return { ok: false, motivo: "formato" };
    if (rmHuella(o) !== o.h) return { ok: false, motivo: "huella" };
    o.hist = Array.isArray(o.hist) ? o.hist.filter((q) => typeof q === "string") : [o.h];
    o.docs = Array.isArray(o.docs) ? o.docs : [];
  }
  return { ok: true, obj: o };
}
async function rmLeer(ctx, ruta) { try { return await ctx.carpeta.leer(ruta); } catch (e) { return null; } }
async function rmListar(ctx, dir) { try { return (await ctx.carpeta.listar(dir)) || []; } catch (e) { return []; } }
async function rmEscribir(ctx, ruta, datos) { const r = await ctx.carpeta.escribir(ruta, typeof datos === "string" ? rmTE.encode(datos) : datos); return r && typeof r === "object" ? r : null; }

// ── despacho.json ──
async function rmLeerDespacho(carpeta) {
  let u; try { u = await carpeta.leer("despacho.json"); } catch (e) { u = null; }
  if (!u) return null;
  try { const o = JSON.parse(rmTexto(u)); return rmObj(o) && o.f === "hereda+red" && typeof o.id === "string" ? o : { danado: true }; } catch (e) { return { danado: true }; }
}
// cripto (opcional) con la clave del despacho; sobre = clave envuelta con la contraseña (lo prepara quien llama, con seguridad.js)
async function rmCrearDespacho(carpeta, { nombre, cripto, sobre, ahora }) {
  const id = "d" + rmAzarId(), t = rmIso(ahora || Date.now());
  const o = { f: "hereda+red", v: RM_V, formato: "Carpeta de {{MARCA}} para trabajar varios equipos con los mismos expedientes. No cambies ni muevas estos archivos a mano.", id, nombre: String(nombre || ""), creado: t, cifrado: !!cripto };
  let sal = "";
  if (cripto) { sal = rmAzarId() + rmAzarId(); o.k = sobre; o.prueba = await cripto.cifrarTexto(JSON.stringify({ ok: "hereda+red", sal }), "hereda+red-prueba:" + id); }
  await carpeta.escribir("despacho.json", rmTE.encode(JSON.stringify(o, null, 1)));
  return { desp: o, sal };
}
// Comprueba que la clave abre este despacho; devuelve la sal secreta de los nombres de los adjuntos
async function rmComprobarClave(desp, cripto) {
  if (!desp || !desp.cifrado) return "";
  const o = JSON.parse(await cripto.descifrarTexto(desp.prueba, "hereda+red-prueba:" + desp.id));
  if (!o || o.ok !== "hereda+red" || typeof o.sal !== "string") throw new Error("Clave del despacho no válida");
  return o.sal;
}
async function rmNombreDoc(ctx, hash) { return ctx.cripto ? (await rmSha256(rmTE.encode((ctx.sal || "") + ":" + hash))).slice(0, 40) : hash; }

// ═════════ Ciclo de sincronización ═════════
// ctx = { carpeta, local, cripto, sal, estado, equipo: { nombre, persona }, ahora: () => ms, registro?: (txt) => void }
// Devuelve un resumen: { ok, error?, subidos, recibidos, fundidos, choques, borrados, pendientes, docsSubidos, docsRecibidos, docsPendientes, averiados }
async function rmCiclo(ctx) {
  const S = ctx.estado, ahora = ctx.ahora ? ctx.ahora() : Date.now(), tIso = rmIso(ahora);
  const R0 = { ok: true, subidos: 0, recibidos: 0, fundidos: 0, choques: 0, borrados: 0, pendientes: 0, docsSubidos: 0, docsRecibidos: 0, docsPendientes: 0, averiados: 0, copiasConflicto: 0 };
  const por = { equipo: S.equipoId, nombre: (ctx.equipo && ctx.equipo.nombre) || "", persona: (ctx.equipo && ctx.equipo.persona) || "" };
  const log = (t) => { try { if (ctx.registro) ctx.registro(t); } catch (e) {} };
  // 1. El despacho de la carpeta tiene que ser este
  const desp = await rmLeerDespacho(ctx.carpeta);
  if (!desp) return { ...R0, ok: false, error: "sin-despacho" };
  if (desp.danado) return { ...R0, ok: false, error: "despacho-danado" };
  if (desp.id !== S.despachoId) return { ...R0, ok: false, error: "otro-despacho" };
  if (!!desp.cifrado !== !!ctx.cripto) return { ...R0, ok: false, error: desp.cifrado ? "falta-clave" : "no-cifrado" };
  S.ciclos = (S.ciclos || 0) + 1;
  const releerTodo = S.ciclos % 20 === 0; // por si un archivo cambió sin cambiar su fecha ni su tamaño
  // 2. Lo que hay en la carpeta
  const [lsExp, lsLap, lsDoc] = await Promise.all([rmListar(ctx, "expedientes"), rmListar(ctx, "lapidas"), rmListar(ctx, "documentos")]);
  const docsCarpeta = new Set(lsDoc.map((f) => f.nombre));
  const R = new Map(), copias = new Map(), ilegibles = new Set(), vivos = new Set();
  for (const f of lsExp) {
    const n = f.nombre; if (!/\.json$/i.test(n) || /^[.~]/.test(n)) continue; // temporales (.crswap, ~$…) y ocultos
    const ruta = "expedientes/" + n; vivos.add(ruta);
    let m = S.cache[ruta];
    if (!m || m.mod !== f.mod || m.tam !== f.tam || releerTodo) {
      const r = await rmDeserializar(ctx, "exp", await rmLeer(ctx, ruta));
      if (!r.ok) {
        S.ilegibles[ruta] = (S.ilegibles[ruta] || 0) + 1; ilegibles.add(n); delete S.cache[ruta];
        log(`No se puede leer ${ruta} (${r.motivo})`); continue;
      }
      delete S.ilegibles[ruta];
      const o = r.obj; m = { mod: f.mod, tam: f.tam, id: o.id, h: o.h, rev: o.rev || 0, hist: o.hist, hashes: o.docs.map((d) => d.hash).filter(Boolean), por: o.por || null, env: o };
      S.cache[ruta] = { mod: m.mod, tam: m.tam, id: m.id, h: m.h, rev: m.rev, hist: m.hist, hashes: m.hashes, por: m.por };
    }
    const canonico = rmNombre(m.id) === n;
    if (canonico) R.set(m.id, { ...m, ruta });
    else { if (!copias.has(m.id)) copias.set(m.id, []); copias.get(m.id).push({ ...m, ruta }); }
  }
  for (const k of Object.keys(S.cache)) if (k.startsWith("expedientes/") && !vivos.has(k)) delete S.cache[k];
  for (const k of Object.keys(S.ilegibles)) if (!vivos.has(k)) delete S.ilegibles[k];
  const T = new Map();
  for (const f of lsLap) {
    if (!/\.json$/i.test(f.nombre) || /^[.~]/.test(f.nombre)) continue;
    const ruta = "lapidas/" + f.nombre; let m = S.cache[ruta];
    if (!m || m.mod !== f.mod || m.tam !== f.tam) { const r = await rmDeserializar(ctx, "lapida", await rmLeer(ctx, ruta)); if (!r.ok || r.obj.f !== "hereda+red-lapida") continue; m = { mod: f.mod, tam: f.tam, ...r.obj }; S.cache[ruta] = m; }
    if (rmNombre(m.id) === f.nombre) T.set(m.id, { ...m, ruta });
  }
  // 3. Lo que hay en este equipo (con los adjuntos que aún no han llegado, para que no cuenten como quitados)
  const Lraw = await ctx.local.listar();
  const Lm = new Map();
  for (const it of Lraw) {
    if (!it || it.id == null || !rmObj(it.x)) continue;
    const docs = [];
    for (const d of it.docs || []) {
      if (!d || d.id == null) continue;
      let hc = S.hashes[d.id];
      if (!hc || hc.tam !== d.tam) {
        const u = await ctx.local.docBytes(d.id);
        if (!u) continue; // documento ilegible en este equipo (cifrado con otra clave): no viaja
        hc = { tam: d.tam, hash: await rmSha256(u) }; S.hashes[d.id] = hc;
      }
      docs.push({ ...rmDocMeta(d), hash: hc.hash });
    }
    for (const [did, p] of Object.entries(S.docsPend)) if (p.expId === it.id && !docs.some((d) => d.id === did)) docs.push(rmCopia(p.meta));
    // Foto del expediente tal como está ahora: si el usuario lo cambia mientras el ciclo trabaja, lo escrito sigue cuadrando con su huella
    const x = rmCopia(it.x), item = { id: it.id, x, docs, hx: rmHuellaX(x) };
    item.h = rmHuella(item); Lm.set(it.id, item);
  }
  // Archivos ilegibles durante mucho tiempo: se apartan en averiados/ (copia íntegra) para no bloquear el expediente para siempre.
  // Si es de un expediente conocido, se reescribe desde aquí; si no (copia de conflicto u otro archivo), se quita tras más tiempo.
  const nombresConocidos = new Set([...Lm.keys(), ...Object.keys(S.bases)].map(rmNombre)), apartados = new Set();
  for (const n of [...ilegibles]) {
    const ruta = "expedientes/" + n, c = S.ilegibles[ruta] || 0, conocido = nombresConocidos.has(n);
    if (c < RM_AVERIADO_CICLOS * (conocido ? 1 : 3)) continue;
    const crudo = await rmLeer(ctx, ruta);
    if (crudo) await rmEscribir(ctx, `averiados/${n.replace(/\.json$/i, "")}-${tIso.replace(/[:.]/g, "-")}.json`, crudo);
    if (!conocido) await ctx.carpeta.borrar(ruta).catch(() => {}); else apartados.add(n);
    delete S.ilegibles[ruta]; ilegibles.delete(n); R0.averiados++; log(`${ruta} apartado en averiados/`);
  }
  // 4. Expediente por expediente
  const ids = new Set([...Lm.keys(), ...R.keys(), ...copias.keys(), ...Object.keys(S.bases), ...Object.keys(S.borrados)]);
  const leerEnv = async (m) => { if (m.env) return m.env; const r = await rmDeserializar(ctx, "exp", await rmLeer(ctx, m.ruta), m.id); if (!r.ok) throw Object.assign(new Error("ilegible"), { ilegible: true }); m.env = r.obj; return r.obj; };
  const instantanea = (id, h) => { const b = S.bases[id], p = S.prev[id]; if (b && b.h === h) return b; if (p && p.h === h) return p; return null; };
  const ponerBase = (id, it, rev, hist) => { const b = S.bases[id]; if (b && b.h !== it.h) S.prev[id] = { h: b.h, x: b.x, docs: b.docs }; S.bases[id] = { h: it.h, rev: rev || 0, hist: (hist || [it.h]).slice(0, RM_HIST), x: rmCopia(it.x), docs: rmCopia(it.docs || []) }; };
  const quitarBase = (id) => { delete S.bases[id]; delete S.prev[id]; for (const [k, p] of Object.entries(S.docsPend)) if (p.expId === id) delete S.docsPend[k]; };
  // Sube los adjuntos que aún no están en la carpeta (antes que el expediente que los cita)
  const subirDocs = async (it) => {
    for (const d of it.docs || []) {
      if (!d.hash) continue; const n = await rmNombreDoc(ctx, d.hash); if (docsCarpeta.has(n)) continue;
      const u = await ctx.local.docBytes(d.id); if (!u) continue;
      const datos = ctx.cripto ? await ctx.cripto.cifrarBytes(u, rmAad(S.despachoId, "doc", d.hash)) : u;
      await rmEscribir(ctx, "documentos/" + n, datos); docsCarpeta.add(n); R0.docsSubidos++;
    }
  };
  const escribirExp = async (it, revBase, histBase) => {
    await subirDocs(it);
    const rev = (revBase || 0) + 1, hist = [it.h, ...(histBase || [])].filter((q, i, a) => a.indexOf(q) === i).slice(0, RM_HIST);
    const env = { f: "hereda+red-exp", v: RM_V, id: it.id, rev, h: it.h, hist, modificado: tIso, por, x: it.x, docs: rmDocsOrden(it.docs) };
    const ruta = "expedientes/" + rmNombre(it.id);
    await rmEscribir(ctx, ruta, await rmSerializar(ctx, "exp", it.id, env));
    // No se apunta la fecha del archivo recién escrito: otro equipo (o el servicio de sincronización) puede haberlo sustituido justo
    // después, y la caché daría por buena una versión que no es. El siguiente ciclo lo vuelve a leer una vez.
    delete S.cache[ruta];
    R0.subidos++; return { rev, hist };
  };
  // Baja los adjuntos nuevos de una versión y prepara la operación local; los que no han llegado quedan pendientes
  const prepararOp = async (id, nuevo, L) => {
    const locales = new Map(((L && L.docs) || []).map((d) => [d.id, d]));
    const poner = [], quitar = [];
    for (const d of nuevo.docs || []) {
      const ld = locales.get(d.id);
      if (ld && !S.docsPend[d.id]) { if (!rmIgual(rmDocMeta(ld), rmDocMeta(d))) poner.push(rmDocMeta(d)); continue; }
      const u = await bajarDoc(d);
      if (u) { poner.push({ ...rmDocMeta(d), _bytes: u }); S.hashes[d.id] = { tam: d.tam, hash: d.hash }; }
      else S.docsPend[d.id] = { expId: id, meta: rmDocMeta(d) };
      intentados.add(d.id);
    }
    const enNuevo = new Set((nuevo.docs || []).map((d) => d.id));
    for (const d of (L && L.docs) || []) if (!enNuevo.has(d.id)) { if (S.docsPend[d.id]) delete S.docsPend[d.id]; else quitar.push(d.id); }
    return { x: nuevo.x, hx: L ? L.hx : null, poner, quitar };
  };
  const intentados = new Set();
  const bajarDoc = async (d) => {
    if (!d.hash) return null; const n = await rmNombreDoc(ctx, d.hash); if (!docsCarpeta.has(n)) return null;
    let u = await rmLeer(ctx, "documentos/" + n); if (!u) return null;
    if (ctx.cripto) { try { u = await ctx.cripto.descifrarBytes(u, rmAad(S.despachoId, "doc", d.hash)); } catch (e) { return null; } }
    if ((await rmSha256(u)) !== d.hash) return null; // a medias: se reintenta en el siguiente ciclo
    R0.docsRecibidos++; return u;
  };
  const aplicar = async (id, nuevo, L) => {
    const op = await prepararOp(id, nuevo, L);
    const ok = await ctx.local.aplicar(id, op);
    if (!ok) { R0.pendientes++; log(`Expediente ${id}: cambiado aquí mientras se sincronizaba; se repite en el siguiente ciclo`); }
    return ok;
  };
  for (const id of ids) {
    try {
      let L = Lm.get(id), Rm = R.get(id); const B = S.bases[id], Tm = T.get(id), CC = copias.get(id) || [];
      if (L && S.borrados[id]) delete S.borrados[id]; // vuelve a estar aquí (copia restaurada): ya no es un borrado
      if (id === "_despacho" && !L && !Rm) continue;
      // Archivo principal ilegible (a medias o dañado): no se toca nada de este expediente hasta que se pueda leer
      if (!Rm && ilegibles.has(rmNombre(id))) { R0.pendientes++; continue; }
      // Copias de conflicto del servicio de sincronización: se funden en la versión de la carpeta
      let forzarEscritura = false;
      if (CC.length) {
        let acc = Rm ? await leerEnv(Rm) : null;
        for (const c of CC) {
          const e = await leerEnv(c);
          if (!acc) { acc = e; continue; }
          if (e.h === acc.h || acc.hist.includes(e.h)) continue;
          if (e.hist.includes(acc.h)) { acc = e; continue; }
          const hc = e.hist.find((h) => acc.hist.includes(h) && instantanea(id, h)), anc = hc ? instantanea(id, hc) : null;
          const F = rmFundir(anc, { x: acc.x, docs: acc.docs }, { x: e.x, docs: e.docs }, e.por, acc.por, tIso);
          const h = rmHuella(F);
          acc = { ...acc, x: F.x, docs: F.docs, h, rev: Math.max(acc.rev || 0, e.rev || 0), hist: [h, ...acc.hist, ...e.hist].filter((q, i, a) => a.indexOf(q) === i).slice(0, RM_HIST) };
          R0.choques += F.nuevos;
        }
        Rm = { id, h: acc.h, rev: acc.rev || 0, hist: acc.hist, env: acc, ruta: "expedientes/" + rmNombre(id), por: acc.por };
        forzarEscritura = true; R0.copiasConflicto += CC.length;
      }
      const borrarCopias = async () => { for (const c of CC) { await ctx.carpeta.borrar(c.ruta).catch(() => {}); delete S.cache[c.ruta]; } };
      // Lápida más nueva que el archivo (o archivo viejo que llega tarde): el expediente está borrado
      const lapidaVale = Tm && (!Rm || ((Tm.rev || 0) >= (Rm.rev || 0) && !forzarEscritura));
      if (lapidaVale && Rm) { await ctx.carpeta.borrar(Rm.ruta).catch(() => {}); delete S.cache[Rm.ruta]; Rm = null; }
      if (Tm && Rm && !lapidaVale) { await ctx.carpeta.borrar(Tm.ruta).catch(() => {}); delete S.cache[Tm.ruta]; } // resucitado: la lápida sobra
      // ── Borrado en este equipo ──
      if (!L && S.borrados[id]) {
        if (!Rm) { quitarBase(id); delete S.borrados[id]; continue; }
        if (B && Rm.h === B.h) {
          const lap = { f: "hereda+red-lapida", v: RM_V, id, rev: Rm.rev || 0, h: Rm.h, t: tIso, por };
          await rmEscribir(ctx, "lapidas/" + rmNombre(id), await rmSerializar(ctx, "lapida", id, lap));
          await ctx.carpeta.borrar(Rm.ruta).catch(() => {}); delete S.cache[Rm.ruta]; await borrarCopias();
          quitarBase(id); delete S.borrados[id]; R0.borrados++; continue;
        }
        // Otro equipo lo cambió después: se conserva (y se avisa) en lugar de borrar su trabajo
        const e = await leerEnv(Rm), x = rmCopia(e.x);
        x.redConflictos = (Array.isArray(x.redConflictos) ? x.redConflictos : []).concat([{ id: "c" + rmHash(id + ":borrado-aqui:" + e.h).slice(0, 12), pasos: [], tipo: "borrado-aqui", aqui: null, alli: null, por: e.por || null, porAqui: por, t: tIso }]);
        const it = { id, x, docs: e.docs }; it.h = rmHuella(it);
        if (await aplicar(id, it, null)) { const w = await escribirExp(it, Rm.rev, [e.h, ...e.hist]); await borrarCopias(); ponerBase(id, it, w.rev, w.hist); delete S.borrados[id]; R0.recibidos++; R0.choques++; }
        continue;
      }
      // ── Solo en la carpeta ──
      if (!L) {
        if (!Rm) { if (B) quitarBase(id); continue; }
        const e = await leerEnv(Rm), it = { id, x: rmCopia(e.x), docs: rmCopia(e.docs) }; it.h = e.h;
        if (await aplicar(id, it, null)) {
          if (forzarEscritura) { const w = await escribirExp(it, Rm.rev, Rm.hist); await borrarCopias(); ponerBase(id, it, w.rev, w.hist); }
          else ponerBase(id, it, Rm.rev, Rm.hist);
          R0.recibidos++;
        }
        continue;
      }
      // ── Solo en este equipo ──
      if (!Rm) {
        if (Tm) {
          if (B && L.h === B.h) { // borrado en otro equipo y sin cambios aquí: se quita
            if (await ctx.local.aplicar(id, { x: null, hx: L.hx, poner: [], quitar: L.docs.map((d) => d.id) })) { quitarBase(id); R0.borrados++; } else R0.pendientes++;
            continue;
          }
          // Borrado allí, pero aquí hay cambios posteriores: se conserva y se avisa
          const x = rmCopia(L.x);
          x.redConflictos = (Array.isArray(x.redConflictos) ? x.redConflictos : []).concat([{ id: "c" + rmHash(id + ":borrado-alli:" + (Tm.t || "")).slice(0, 12), pasos: [], tipo: "borrado-alli", aqui: null, alli: null, por: Tm.por || null, porAqui: por, t: tIso }]);
          const it = { id, x, docs: L.docs }; it.h = rmHuella(it);
          if (await ctx.local.aplicar(id, { x, hx: L.hx, poner: [], quitar: [] })) { const w = await escribirExp(it, Tm.rev, B ? B.hist : []); await ctx.carpeta.borrar(Tm.ruta).catch(() => {}); delete S.cache[Tm.ruta]; ponerBase(id, it, w.rev, w.hist); R0.choques++; } else R0.pendientes++;
          continue;
        }
        // El archivo desapareció sin lápida y aquí no hay cambios: puede que la lápida aún no haya llegado (OneDrive no garantiza el
        // orden). Se espera un rato; pasado ese tiempo se vuelve a escribir: una ausencia nunca se interpreta como borrado.
        if (B && L.h === B.h && !apartados.has(rmNombre(id))) {
          S.desaparecidos = S.desaparecidos || {};
          if (!S.desaparecidos[id]) S.desaparecidos[id] = ahora;
          if (ahora - S.desaparecidos[id] < RM_DESAPARECIDO_MS) { R0.pendientes++; continue; }
        }
        if (S.desaparecidos) delete S.desaparecidos[id];
        const w = await escribirExp(L, B ? B.rev : 0, B ? B.hist : []); ponerBase(id, L, w.rev, w.hist);
        continue;
      }
      // ── En los dos sitios ──
      if (S.desaparecidos) delete S.desaparecidos[id];
      if (L.h === Rm.h && !forzarEscritura) { if (!B || B.h !== L.h) ponerBase(id, L, Rm.rev, Rm.hist); continue; }
      const desciende = !!B && (Rm.h === B.h || (Rm.hist || []).includes(B.h));
      const cambioAqui = !B || L.h !== B.h;
      if (B && Rm.h === B.h && !forzarEscritura) { // solo cambió este equipo
        const w = await escribirExp(L, Rm.rev, Rm.hist); ponerBase(id, L, w.rev, w.hist); continue;
      }
      const e = await leerEnv(Rm), Rit = { id, x: e.x, docs: e.docs, h: e.h };
      if (desciende && !cambioAqui) { // solo cambió la carpeta
        const it = { id, x: rmCopia(e.x), docs: rmCopia(e.docs), h: e.h };
        if (await aplicar(id, it, L)) {
          if (forzarEscritura) { const w = await escribirExp(it, Rm.rev, Rm.hist); await borrarCopias(); ponerBase(id, it, w.rev, w.hist); } else ponerBase(id, it, Rm.rev, Rm.hist);
          R0.recibidos++;
        }
        continue;
      }
      // Los dos cambiaron (o la carpeta no desciende de lo que este equipo escribió: su escritura se perdió): fusión de tres vías
      let anc = desciende ? B : null;
      if (!anc) { for (const h of [...(Rm.hist || [])]) { const s = instantanea(id, h); if (s) { anc = s; break; } } }
      const F = rmFundir(anc, { x: L.x, docs: L.docs }, { x: Rit.x, docs: Rit.docs }, e.por, por, tIso);
      const M = { id, x: F.x, docs: F.docs }; M.h = rmHuella(M); R0.choques += F.nuevos;
      const hist = [Rm.h, ...(Rm.hist || []), L.h, ...(B ? B.hist || [B.h] : [])];
      if (M.h === Rm.h && !forzarEscritura) { if (await aplicar(id, { ...M, x: rmCopia(M.x), docs: rmCopia(M.docs) }, L)) { ponerBase(id, M, Rm.rev, Rm.hist); R0.recibidos++; } continue; }
      if (M.h === L.h) { const w = await escribirExp(L, Rm.rev, hist); await borrarCopias(); ponerBase(id, L, w.rev, w.hist); R0.fundidos++; continue; }
      if (await aplicar(id, { ...M, x: rmCopia(M.x), docs: rmCopia(M.docs) }, L)) {
        const w = await escribirExp(M, Rm.rev, hist); await borrarCopias(); ponerBase(id, M, w.rev, w.hist); R0.fundidos++;
      }
    } catch (err) {
      if (err && err.ilegible) { R0.pendientes++; continue; }
      R0.errores = (R0.errores || 0) + 1; log(`Expediente ${id}: ${err && err.message || err}`);
      if (/NotAllowed|Security|permiso/i.test(String(err && (err.name + err.message)))) throw err;
    }
  }
  // 5. Adjuntos que esperaban a llegar
  for (const [did, p] of Object.entries(S.docsPend)) {
    if (intentados.has(did)) continue;
    if (!Lm.has(p.expId)) { if (!S.bases[p.expId]) delete S.docsPend[did]; continue; }
    const u = await bajarDoc(p.meta); if (!u) continue;
    // x: undefined → solo los documentos (el expediente no se toca)
    if (await ctx.local.aplicar(p.expId, { x: undefined, hx: null, poner: [{ ...p.meta, _bytes: u }], quitar: [] })) { delete S.docsPend[did]; S.hashes[did] = { tam: p.meta.tam, hash: p.meta.hash }; }
  }
  R0.docsPendientes = Object.keys(S.docsPend).length;
  // 6. Adjuntos de la carpeta que ya no usa nadie: se borran a los 30 días de notarlo (si se pudieron leer todos los expedientes)
  if (!ilegibles.size) {
    const usados = new Set();
    for (const m of Object.values(S.cache)) for (const h of m.hashes || []) usados.add(await rmNombreDoc(ctx, h));
    for (const p of Object.values(S.docsPend)) if (p.meta.hash) usados.add(await rmNombreDoc(ctx, p.meta.hash));
    for (const it of Lm.values()) for (const d of it.docs || []) if (d.hash) usados.add(await rmNombreDoc(ctx, d.hash));
    for (const n of docsCarpeta) {
      if (usados.has(n) || /^[.~]/.test(n)) { delete S.huerfanos[n]; continue; }
      if (!S.huerfanos[n]) S.huerfanos[n] = ahora;
      else if (ahora - S.huerfanos[n] > RM_HUERFANO_MS) { await ctx.carpeta.borrar("documentos/" + n).catch(() => {}); delete S.huerfanos[n]; }
    }
    for (const n of Object.keys(S.huerfanos)) if (!docsCarpeta.has(n)) delete S.huerfanos[n];
  }
  S.ultimo = tIso; R0.ilegibles = ilegibles.size;
  return R0;
}
// Borrado deliberado en este equipo (lo llama la app al borrar un expediente): se propaga con una lápida en el siguiente ciclo
function rmMarcarBorrado(estado, id, ahora) { if (estado && estado.bases && estado.bases[id]) estado.borrados[id] = rmIso(ahora || Date.now()); }

// ═════════ Presencia: quién tiene abierto qué ═════════
// Escribe el latido de este equipo y lee el de los demás. La vida de un latido se mide con el reloj de ESTE equipo (cuándo vimos
// cambiar su número de secuencia), así que relojes desajustados entre equipos no lo confunden.
async function rmPresencia(ctx, { abierto, cerrado } = {}) {
  const S = ctx.estado, ahora = ctx.ahora ? ctx.ahora() : Date.now();
  S.seq = (S.seq || 0) + 1;
  const yo = { f: "hereda+red-pres", v: RM_V, id: S.equipoId, equipo: S.equipoId, nombre: (ctx.equipo && ctx.equipo.nombre) || "", persona: (ctx.equipo && ctx.equipo.persona) || "", abierto: abierto || null, seq: S.seq, t: rmIso(ahora), cerrado: !!cerrado };
  try { await rmEscribir(ctx, "presencia/" + rmNombre(S.equipoId), await rmSerializar(ctx, "pres", S.equipoId, yo)); } catch (e) {}
  const out = [];
  S.pres = S.pres || {};
  for (const f of await rmListar(ctx, "presencia")) {
    if (!/\.json$/i.test(f.nombre) || /^[.~]/.test(f.nombre) || f.nombre === rmNombre(S.equipoId)) continue;
    const r = await rmDeserializar(ctx, "pres", await rmLeer(ctx, "presencia/" + f.nombre));
    if (!r.ok || r.obj.f !== "hereda+red-pres" || rmNombre(r.obj.equipo) !== f.nombre) continue;
    const o = r.obj, p = S.pres[o.equipo];
    if (!p) S.pres[o.equipo] = { seq: o.seq, visto: Math.abs(ahora - Date.parse(o.t)) < RM_PRES_MS ? ahora : 0 }; // primera vez: solo si su reloj está cerca
    else if (p.seq !== o.seq) { p.seq = o.seq; p.visto = ahora; }
    const vivo = !o.cerrado && ahora - S.pres[o.equipo].visto < RM_PRES_MS;
    out.push({ equipo: o.equipo, nombre: o.nombre, persona: o.persona, abierto: o.abierto, vivo, t: o.t });
  }
  return out;
}
