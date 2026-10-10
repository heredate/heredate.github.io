// Pruebas de «Despacho en red» (sincronización a través de una carpeta compartida).
// (a) Motor (src/app/red-motor.js) en Node con una carpeta en memoria que simula 2-3 equipos y un servicio de sincronización como
//     OneDrive: cada equipo ve su propia copia de la carpeta, los archivos llegan tarde y en cualquier orden, hay escrituras a medias,
//     copias de conflicto con el nombre del equipo, últimas escrituras que pisan (carpeta de red) y relojes desajustados.
// (b) Si se pasa la dirección de la app, prueba de navegador con dos contextos de Playwright que comparten una carpeta simulada
//     (manejador de carpeta falso inyectado en window: showDirectoryPicker no se puede automatizar).
// Uso: node tools/qa/red.mjs                                  (solo el motor)
//      node tools/qa/red.mjs http://127.0.0.1:8804/app/        (motor + navegador)
// Sale con código 1 si algo falla.
import fs from "node:fs";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const RAIZ = new URL("../../", import.meta.url).pathname;
const src = fs.readFileSync(RAIZ + "src/app/red-motor.js", "utf8").replace(/\{\{MARCA\}\}/g, "Hereda+");
const M = new Function(src + "\nreturn { rmCiclo, rmCrearDespacho, rmLeerDespacho, rmComprobarClave, rmEstadoNuevo, rmHuella, rmHuellaX, rmFundir, rmResolver, rmMarcarBorrado, rmPresencia, rmNombre, rmSha256, rmCanon, RM_DESAPARECIDO_MS, RM_PRES_MS, RM_AVERIADO_CICLOS, RM_HUERFANO_MS };")();

let ok = 0, ko = 0;
const check = (n, cond, extra = "") => { if (cond) ok++; else ko++; console.log(`${cond ? "✔" : "✘"} ${n}${!cond && extra !== "" ? " · " + (typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 500) : ""}`); };
const TE = new TextEncoder(), TD = new TextDecoder();
const clon = (v) => JSON.parse(JSON.stringify(v));

// ═════════ Carpeta simulada ═════════
// Nube: la verdad del servicio. Cada equipo tiene su vista local (lo que el servicio ya ha bajado a ese ordenador).
// propagar(vista): sube lo que el equipo cambió y baja lo que hay en la nube. Si al subir la nube cambió desde que el equipo
// la vio, el servicio conserva las dos: la del equipo se sube como «nombre-EQUIPO.json» (como OneDrive).
class Nube {
  constructor() { this.a = new Map(); this.ver = 0; }
}
class Vista {
  // directa: true = carpeta del servidor (sin servicio de sincronización: todos escriben en la misma; la última escritura gana)
  constructor(nube, nombreEquipo, reloj, { directa = false } = {}) { this.nube = nube; this.eq = nombreEquipo; this.reloj = reloj; this.directa = directa; this.a = new Map(); this.sucio = new Set(); this.borrado = new Set(); this.retener = null; this.escrituras = 0; this.lecturas = 0; }
  _m() { return this.directa ? this.nube.a : this.a; }
  async listar(dir) { const p = dir + "/", out = []; for (const [k, v] of this._m()) if (k.startsWith(p) && !k.slice(p.length).includes("/")) out.push({ nombre: k.slice(p.length), tam: v.datos.length, mod: v.mod }); return out; }
  async leer(ruta) { this.lecturas++; const v = this._m().get(ruta); return v ? new Uint8Array(v.datos) : null; }
  async escribir(ruta, datos) { this.escrituras++; const u = typeof datos === "string" ? TE.encode(datos) : new Uint8Array(datos); const prev = this._m().get(ruta); const v = { datos: u, mod: this.reloj(), base: prev ? prev.base : null }; if (this.directa) { v.ver = ++this.nube.ver; } this._m().set(ruta, v); this.sucio.add(ruta); this.borrado.delete(ruta); return { tam: u.length, mod: v.mod }; }
  async borrar(ruta) { if (this._m().delete(ruta)) { this.borrado.add(ruta); this.sucio.delete(ruta); } }
  // Sincroniza con la nube. filtroBajar(ruta) → false retrasa la bajada de ese archivo (llega más tarde)
  propagar(filtroBajar) {
    if (this.directa) return;
    const N = this.nube.a;
    for (const r of this.sucio) {
      const v = this.a.get(r); if (!v) continue; const n = N.get(r);
      if (n && n.ver !== v.base) { // la nube cambió desde que este equipo la vio: copia de conflicto
        const cop = r.replace(/\.json$/, `-${this.eq}.json`);
        N.set(cop, { datos: v.datos, mod: v.mod, ver: ++this.nube.ver });
        this.a.set(r, { ...n }); this.a.get(r).base = n.ver; this.a.set(cop, { datos: v.datos, mod: v.mod, base: this.nube.ver });
      } else { const ver = ++this.nube.ver; N.set(r, { datos: v.datos, mod: v.mod, ver }); v.base = ver; }
    }
    for (const r of this.borrado) { const n = N.get(r); const v0 = n; if (v0) N.delete(r); }
    this.sucio.clear(); this.borrado.clear();
    for (const [r, n] of N) { if (filtroBajar && !filtroBajar(r)) continue; const v = this.a.get(r); if (!v || v.base !== n.ver) this.a.set(r, { datos: n.datos, mod: n.mod, base: n.ver }); }
    for (const r of [...this.a.keys()]) if (!N.has(r) && (!filtroBajar || filtroBajar(r))) this.a.delete(r);
  }
}

// ═════════ Equipo simulado (lo que en la app son DB.expedientes y los documentos en IndexedDB) ═════════
class Equipo {
  constructor(nombre, vista, estado, { cripto = null, sal = "", reloj } = {}) {
    this.nombre = nombre; this.carpeta = vista; this.estado = estado; this.cripto = cripto; this.sal = sal; this.reloj = reloj || (() => Date.now());
    this.exps = new Map(); this.docs = new Map(); this.despacho = null; this.trasLeer = null; this.registro = [];
    const yo = this;
    this.local = {
      async listar() {
        const L = [...yo.exps.values()].map((x) => ({ id: x.id, x: clon(x), docs: [...yo.docs.values()].filter((d) => d.expId === x.id).map((d) => clon(d.meta)) }));
        if (yo.despacho) L.push({ id: "_despacho", x: clon(yo.despacho), docs: [] });
        if (yo.trasLeer) { const f = yo.trasLeer; yo.trasLeer = null; f(); } // simula que el usuario edita mientras el ciclo trabaja
        return L;
      },
      async aplicar(id, op) {
        if (op.x !== undefined) {
          const cur = id === "_despacho" ? yo.despacho : yo.exps.get(id);
          if (op.hx == null ? !!cur : (!cur || M.rmHuellaX(cur) !== op.hx)) return false;
          if (op.x === null) { yo.exps.delete(id); for (const [k, d] of [...yo.docs]) if (d.expId === id) yo.docs.delete(k); return true; }
          if (id === "_despacho") yo.despacho = clon(op.x); else yo.exps.set(id, clon(op.x));
        }
        for (const m of op.poner || []) { const { _bytes, ...meta } = m; const d = yo.docs.get(m.id); if (_bytes) yo.docs.set(m.id, { expId: id, meta: { ...meta, expId: id }, bytes: new Uint8Array(_bytes) }); else if (d) d.meta = { ...meta, expId: id }; }
        for (const k of op.quitar || []) yo.docs.delete(k);
        return true;
      },
      async docBytes(id) { const d = yo.docs.get(id); return d ? d.bytes : null; },
    };
  }
  ctx() { return { carpeta: this.carpeta, local: this.local, cripto: this.cripto, sal: this.sal, estado: this.estado, equipo: { nombre: this.nombre, persona: "Persona " + this.nombre }, ahora: this.reloj, registro: (t) => this.registro.push(t) }; }
  ciclo() { return M.rmCiclo(this.ctx()); }
  nuevo(id, extra = {}) { const x = { id, nombre: "Herencia " + id, fecha: "2026-01-10", fase: "encargo", personas: [{ id: "p1", nombre: "Ana López", relacion: "hija", nif: "11111111H", pct: 50 }, { id: "p2", nombre: "Luis López", relacion: "hijo", nif: "22222222J", pct: 50 }], bienes: [{ id: "b1", tipo: "vivienda", descripcion: "Piso en Málaga", valor: 180000 }], auditoria: [], bitacora: [], ...extra }; this.exps.set(id, x); return x; }
  x(id) { return this.exps.get(id); }
  adjuntar(expId, docId, texto, meta = {}) { const bytes = TE.encode(texto); this.docs.set(docId, { expId, meta: { id: docId, expId, nombre: docId + ".pdf", tipo: "application/pdf", tam: bytes.length, fecha: "2026-10-07T10:00:00.000Z", cat: "otros", ...meta }, bytes }); }
  borrar(id) { this.exps.delete(id); for (const [k, d] of [...this.docs]) if (d.expId === id) this.docs.delete(k); M.rmMarcarBorrado(this.estado, id, this.reloj()); }
}
const igualesExp = (a, b) => M.rmCanon(stripAct(a)) === M.rmCanon(stripAct(b));
const stripAct = (x) => { if (!x) return x; const { actualizado, ...r } = x; return r; };

// Cripto para las pruebas: AES-GCM 256 con la API web de Node (la app usa las funciones de seguridad.js, con el mismo esquema)
const b64 = (u) => Buffer.from(u).toString("base64"), deb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));
function criptoCon(clave) {
  return {
    async cifrarTexto(txt, aad) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: TE.encode(aad) }, clave, TE.encode(txt))); return { iv: b64(iv), z: 0, ct: b64(ct) }; },
    async descifrarTexto(d, aad) { return TD.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deb64(d.iv), additionalData: TE.encode(aad) }, clave, deb64(d.ct))); },
    async cifrarBytes(u, aad) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: TE.encode(aad) }, clave, u)); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return o; },
    async descifrarBytes(u, aad) { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(0, 12), additionalData: TE.encode(aad) }, clave, u.subarray(12))); },
  };
}
async function kek(pass, salt) { const base = await crypto.subtle.importKey("raw", TE.encode(pass), "PBKDF2", false, ["deriveKey"]); return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 1000 }, base, { name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey"]); }
async function sobreNuevo(pass, dek) { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)); const w = await crypto.subtle.wrapKey("raw", dek, await kek(pass, salt), { name: "AES-GCM", iv, additionalData: TE.encode("hereda+clave") }); return { alg: "PBKDF2-SHA256/AES-GCM-256", it: 1000, salt: b64(salt), iv: b64(iv), w: b64(new Uint8Array(w)) }; }
async function sobreAbrir(pass, k) { return crypto.subtle.unwrapKey("raw", deb64(k.w), await kek(pass, deb64(k.salt)), { name: "AES-GCM", iv: deb64(k.iv), additionalData: TE.encode("hereda+clave") }, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); }

// Montaje: una nube, n equipos con su vista y su reloj (desfase en ms)
async function montar({ n = 2, directa = false, cifrado = false, desfases = [], pass = "contraseña del despacho" } = {}) {
  const nube = new Nube(); let t = Date.parse("2026-10-07T09:00:00Z");
  const relojBase = () => t; const avanzar = (ms) => { t += ms; };
  const nombres = ["RECEPCION", "PORTATIL", "DESPACHO2"];
  const vistas = nombres.slice(0, n).map((nm, i) => new Vista(nube, nm, () => t + (desfases[i] || 0), { directa }));
  let cr = null, sobre = null, dek = null;
  if (cifrado) { dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); sobre = await sobreNuevo(pass, dek); cr = criptoCon(dek); }
  const { desp, sal } = await M.rmCrearDespacho(vistas[0], { nombre: "Pérez Abogados", cripto: cr, sobre, ahora: t });
  vistas[0].propagar(); for (const v of vistas.slice(1)) v.propagar();
  const eqs = [];
  for (let i = 0; i < n; i++) {
    let c = null, s = "";
    if (cifrado) { const d = await M.rmLeerDespacho(vistas[i]); const k = await sobreAbrir(pass, d.k); c = criptoCon(k); s = await M.rmComprobarClave(d, c); }
    eqs.push(new Equipo(nombres[i], vistas[i], M.rmEstadoNuevo(desp.id), { cripto: c, sal: s, reloj: () => t + (desfases[i] || 0) }));
  }
  const prop = (f) => { for (const v of vistas) v.propagar(f); for (const v of vistas) v.propagar(f); };
  // Ronda completa: cada equipo sincroniza y el servicio propaga, dos veces (hasta converger)
  const ronda = async (veces = 2) => { const res = []; for (let k = 0; k < veces; k++) for (const e of eqs) { res.push(await e.ciclo()); prop(); } return res; };
  return { nube, vistas, eqs, desp, sal, dek, sobre, prop, ronda, avanzar, ahora: () => t };
}
const convergen = (eqs, id) => { const xs = eqs.map((e) => e.x(id)); return xs.every((x) => x && igualesExp(x, xs[0])); };
const archivos = (nube, pref) => [...nube.a.keys()].filter((k) => k.startsWith(pref));

// ═════════ (a) Motor ═════════
console.log("── Motor de sincronización (Node, carpeta en memoria) ──");
// 0 · Una escritura sustituida justo después por otro equipo no deja la caché engañada
{
  const { eqs: [A, B], ronda } = await montar({ directa: true });
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "De A"; B.x("e1").nombre = "De BBB"; // mismo tamaño de archivo (RECEPCION/PORTATIL) y misma hora: solo el contenido los distingue
  const esc = B.carpeta.escribir.bind(B.carpeta);
  B.carpeta.escribir = async (ruta, datos) => { if (ruta === "expedientes/e1.json") { B.carpeta.escribir = esc; await A.ciclo(); } return esc(ruta, datos); }; // B leyó antes; A escribe; B escribe encima
  await B.ciclo(); await ronda(2);
  check("escritura sustituida al momento por otro equipo: se detecta y se funde (no se queda cada uno con lo suyo)", convergen([A, B], "e1") && (A.x("e1").redConflictos || []).length === 1, [A.x("e1").nombre, B.x("e1").nombre]);
}
// 1-5 · Alta, unión, edición, idempotencia
{
  const { nube, eqs: [A, B], ronda, desp } = await montar();
  check("despacho.json con id, nombre y sin cifrar", nube.a.has("despacho.json") && desp.id.startsWith("d") && desp.nombre === "Pérez Abogados" && desp.cifrado === false);
  A.nuevo("e1"); const r1 = await A.ciclo();
  check("un expediente nuevo se escribe en expedientes/<id>.json", r1.ok && r1.subidos === 1 && A.carpeta.a.has("expedientes/e1.json"), r1);
  A.carpeta.propagar(); B.carpeta.propagar();
  const r2 = await B.ciclo();
  check("el otro equipo lo recibe igual", r2.recibidos === 1 && igualesExp(B.x("e1"), A.x("e1")), r2);
  A.x("e1").nombre = "Herencia de Carmen Ruiz"; await ronda();
  check("una edición llega al otro equipo", B.x("e1").nombre === "Herencia de Carmen Ruiz");
  const antes = A.carpeta.escrituras + B.carpeta.escrituras, lect = A.carpeta.lecturas + B.carpeta.lecturas;
  const rr = await ronda();
  check("sin cambios no se escribe nada (idempotente)", A.carpeta.escrituras + B.carpeta.escrituras === antes && rr.every((r) => r.subidos === 0 && r.recibidos === 0), { antes, despues: A.carpeta.escrituras + B.carpeta.escrituras });
  check("sin cambios no se vuelve a leer ningún expediente (caché por fecha y tamaño)", A.carpeta.lecturas + B.carpeta.lecturas - lect <= 4 * 2, A.carpeta.lecturas + B.carpeta.lecturas - lect);
  const env = JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos));
  check("el archivo lleva rev, huella, historia, modificado y quién", env.rev >= 2 && env.h === M.rmHuella(env) && env.hist.length >= 2 && env.modificado && env.por && env.por.nombre && env.por.persona);
}
// 6-9 · Edición concurrente
{
  const { eqs: [A, B], ronda } = await montar();
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "Nombre nuevo"; B.x("e1").fecha = "2026-02-01";
  await ronda();
  check("cambios a la vez en campos distintos: se juntan los dos", convergen([A, B], "e1") && A.x("e1").nombre === "Nombre nuevo" && A.x("e1").fecha === "2026-02-01" && !A.x("e1").redConflictos);
  A.x("e1").personas[0].nif = "33333333P"; B.x("e1").personas[0].pct = 60; B.x("e1").personas[1].pct = 40;
  await ronda();
  check("cambios a la vez en la misma persona, campos distintos: se juntan", convergen([A, B], "e1") && A.x("e1").personas[0].nif === "33333333P" && A.x("e1").personas[0].pct === 60 && !A.x("e1").redConflictos);
  A.x("e1").fase = "liquidacion"; B.x("e1").fase = "liquidacion"; await ronda();
  check("el mismo cambio en los dos equipos no es un choque", convergen([A, B], "e1") && !A.x("e1").redConflictos);
  A.x("e1").bienes[0].valor = 190000; B.x("e1").bienes[0].valor = 175000;
  await ronda();
  const C = A.x("e1").redConflictos || [];
  check("choque en el mismo dato: se guarda como choque, con los dos valores", convergen([A, B], "e1") && C.length === 1 && [C[0].aqui, C[0].alli].sort().join() === "175000,190000" && C[0].tipo === "valor", C);
  check("el choque dice qué equipo y qué persona hizo cada valor", C[0] && C[0].por && C[0].porAqui && C[0].por.nombre !== C[0].porAqui.nombre && /Persona/.test(C[0].por.persona));
  check("mientras se decide, el dato tiene uno de los dos valores (nada se pierde)", [175000, 190000].includes(A.x("e1").bienes[0].valor));
  await ronda();
  check("el choque no se duplica en ciclos siguientes", (A.x("e1").redConflictos || []).length === 1 && (B.x("e1").redConflictos || []).length === 1);
  // Resolver eligiendo la otra versión
  const c = A.x("e1").redConflictos[0], quiere = c.alli;
  const it = { x: A.x("e1"), docs: [] }; M.rmResolver(it, c.id, "alli");
  await ronda();
  check("resolver el choque eligiendo la otra versión llega a todos y lo quita", convergen([A, B], "e1") && A.x("e1").bienes[0].valor === quiere && !A.x("e1").redConflictos && !B.x("e1").redConflictos);
}
// 10-13 · Colecciones con id
{
  const { eqs: [A, B], ronda } = await montar();
  A.nuevo("e1"); await ronda();
  A.x("e1").personas.push({ id: "p3", nombre: "Eva", relacion: "nieta" }); B.x("e1").personas.push({ id: "p4", nombre: "Juan", relacion: "sobrino" });
  await ronda();
  check("altas a la vez de personas distintas: están las dos", convergen([A, B], "e1") && ["p3", "p4"].every((id) => A.x("e1").personas.some((p) => p.id === id)));
  A.x("e1").personas = A.x("e1").personas.filter((p) => p.id !== "p3"); await ronda();
  check("quitar una persona sin cambios en el otro equipo: se quita en los dos", convergen([A, B], "e1") && !B.x("e1").personas.some((p) => p.id === "p3"));
  A.x("e1").personas = A.x("e1").personas.filter((p) => p.id !== "p4"); B.x("e1").personas.find((p) => p.id === "p4").nif = "44444444A";
  await ronda();
  const C = A.x("e1").redConflictos || [];
  check("quitar en un equipo lo que el otro cambió: se conserva y se pregunta", convergen([A, B], "e1") && A.x("e1").personas.some((p) => p.id === "p4" && p.nif === "44444444A") && C.length === 1 && /^quitado-/.test(C[0].tipo), C);
  const it = { x: A.x("e1"), docs: [] }; const c = C[0];
  M.rmResolver(it, c.id, c.tipo === "quitado-aqui" ? "aqui" : "alli"); await ronda();
  check("resolver «quitar» lo quita en todos", convergen([A, B], "e1") && !A.x("e1").personas.some((p) => p.id === "p4") && !A.x("e1").redConflictos);
}
// 14-16 · Registros (auditoría y bitácora)
{
  const { eqs: [A, B], ronda } = await montar();
  A.nuevo("e1"); await ronda();
  A.x("e1").auditoria.unshift({ t: "2026-10-07T10:00:00Z", u: "a1", k: "bienes", o: "Piso", c: "Valor", a: "180.000", d: "190.000", f: "B:b1.valor" });
  B.x("e1").auditoria.unshift({ t: "2026-10-07T10:01:00Z", u: "a2", k: "herederos", o: "Ana", c: "NIF", a: "1", d: "2", f: "P:p1.nif" });
  A.x("e1").bitacora.unshift({ t: "2026-10-07T10:00:00Z", tipo: "nota", texto: "Llamada al banco", autor: "a1" });
  B.x("e1").bitacora.unshift({ t: "2026-10-07T10:02:00Z", tipo: "nota", texto: "Cita con la notaría", autor: "a2" });
  await ronda();
  const au = A.x("e1").auditoria;
  check("registro de cambios: se unen las entradas de los dos equipos, la más reciente primero", convergen([A, B], "e1") && au.length === 2 && au[0].u === "a2" && !A.x("e1").redConflictos);
  check("bitácora: se unen las anotaciones de los dos equipos", A.x("e1").bitacora.length === 2 && B.x("e1").bitacora.length === 2);
  // auditoria.js agrupa: reescribe la entrada más reciente del mismo campo
  A.x("e1").auditoria[1].d = "195.000"; A.x("e1").auditoria[1].t = "2026-10-07T10:05:00Z";
  B.x("e1").auditoria.unshift({ t: "2026-10-07T10:04:00Z", u: "a2", k: "expediente", o: "Expediente", c: "Fase", a: "Encargo", d: "Documentación", f: "X.fase" });
  await ronda();
  const au2 = A.x("e1").auditoria;
  check("una entrada agrupada (reescrita) no se duplica", convergen([A, B], "e1") && au2.length === 3 && au2.filter((e) => e.f === "B:b1.valor").length === 1 && au2.find((e) => e.f === "B:b1.valor").d === "195.000", au2);
}
// 17-22 · Borrados y archivos que llegan tarde
{
  const { eqs: [A, B], ronda, nube } = await montar();
  A.nuevo("e1"); A.nuevo("e2"); await ronda();
  A.borrar("e1"); await ronda();
  check("borrar en un equipo deja una lápida y quita el archivo", nube.a.has("lapidas/e1.json") && !nube.a.has("expedientes/e1.json"));
  check("el otro equipo, sin cambios, también lo quita", !B.x("e1"));
  // Borrado en A mientras B lo editaba
  A.borrar("e2"); B.x("e2").nombre = "Cambiado en el portátil";
  await ronda(3);
  const C = (A.x("e2") || {}).redConflictos || [];
  check("borrar lo que otro equipo cambió: se conserva en todos y se avisa", convergen([A, B], "e2") && A.x("e2").nombre === "Cambiado en el portátil" && C.some((c) => c.tipo === "borrado-alli" || c.tipo === "borrado-aqui"), C);
  check("y la lápida obsoleta se retira", !nube.a.has("lapidas/e2.json"));
}
{
  const { eqs: [A, B], ronda, nube, vistas, avanzar } = await montar();
  A.nuevo("e1"); await ronda();
  // Alguien borra el archivo a mano en la carpeta (sin lápida)
  nube.a.delete("expedientes/e1.json"); for (const v of vistas) v.propagar();
  const r = await B.ciclo();
  check("un archivo que falta sin lápida no borra nada", !!B.x("e1") && r.borrados === 0);
  check("…y no se reescribe al momento (puede llegar la lápida)", !vistas[1].a.has("expedientes/e1.json"));
  avanzar(M.RM_DESAPARECIDO_MS + 1000); await B.ciclo(); vistas[1].propagar();
  check("pasado el margen, se vuelve a escribir desde el equipo", nube.a.has("expedientes/e1.json"));
}
{
  const { eqs: [A, B], nube, vistas, avanzar } = await montar();
  A.nuevo("e1"); await A.ciclo(); for (const v of vistas) v.propagar(); await B.ciclo(); for (const v of vistas) v.propagar();
  A.borrar("e1"); await A.ciclo(); vistas[0].propagar();
  // A B le llega primero que el archivo ya no está y, minutos después, la lápida
  vistas[1].propagar((r) => !r.startsWith("lapidas/"));
  await B.ciclo(); vistas[1].propagar((r) => !r.startsWith("lapidas/"));
  avanzar(3 * 6e4); vistas[1].propagar();
  await B.ciclo(); vistas[1].propagar();
  check("lápida que llega después de que desaparezca el archivo: se borra (no resucita)", !B.x("e1") && !nube.a.has("expedientes/e1.json"));
}
{
  const { eqs: [A, B], vistas } = await montar();
  A.nuevo("e9"); await A.ciclo(); vistas[0].propagar();
  vistas[1].propagar((r) => !r.startsWith("expedientes/e9"));
  const r = await B.ciclo();
  check("un expediente que aún no ha llegado no afecta al otro equipo", r.ok && !B.x("e9"));
  vistas[1].propagar(); await B.ciclo();
  check("cuando llega, se recibe", !!B.x("e9"));
}
// 23-25 · Archivos a medias, dañados y averiados
{
  const { eqs: [A, B], ronda, vistas, nube } = await montar();
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "Versión completa"; await A.ciclo(); vistas[0].propagar();
  const bueno = nube.a.get("expedientes/e1.json");
  vistas[1].propagar(); vistas[1].a.set("expedientes/e1.json", { ...bueno, datos: bueno.datos.slice(0, Math.floor(bueno.datos.length / 2)), mod: bueno.mod + 1 });
  B.x("e1").fecha = "2026-03-03";
  const r = await B.ciclo();
  check("archivo a medias: se salta (pendiente) y no se sobrescribe", r.pendientes >= 1 && B.x("e1").nombre !== "Versión completa" && vistas[1].a.get("expedientes/e1.json").datos.length < bueno.datos.length, r);
  vistas[1].a.set("expedientes/e1.json", { ...bueno }); await B.ciclo(); await ronda();
  check("cuando el archivo llega entero, se funde con lo de aquí", convergen([A, B], "e1") && B.x("e1").nombre === "Versión completa" && B.x("e1").fecha === "2026-03-03");
  // JSON válido pero con contenido que no cuadra con su huella
  const env = JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos)); env.x.nombre = "Manipulado";
  for (const v of vistas) v.a.set("expedientes/e1.json", { datos: TE.encode(JSON.stringify(env)), mod: 1, base: -1 });
  const r2 = await B.ciclo();
  check("contenido que no cuadra con su huella: se ignora", r2.pendientes >= 1 && B.x("e1").nombre === "Versión completa");
  for (let i = 0; i < M.RM_AVERIADO_CICLOS; i++) await B.ciclo();
  const av = [...vistas[1].a.keys()].filter((k) => k.startsWith("averiados/"));
  check("ilegible durante mucho tiempo: se aparta en averiados/ y se reescribe desde el equipo", av.length === 1 && JSON.parse(TD.decode(vistas[1].a.get("expedientes/e1.json").datos)).x.nombre === "Versión completa", av);
}
// 26-28 · Copias de conflicto y escrituras que se pisan
{
  const { eqs: [A, B], ronda, vistas, nube } = await montar();
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "Nombre de A"; B.x("e1").fecha = "2026-05-05";
  await A.ciclo(); await B.ciclo(); // los dos escriben antes de que el servicio sincronice
  vistas[0].propagar(); vistas[1].propagar();
  const copias = archivos(nube, "expedientes/").filter((k) => k !== "expedientes/e1.json");
  check("el servicio crea una copia de conflicto con el nombre del equipo", copias.length === 1 && /-PORTATIL\.json$/.test(copias[0]), copias);
  const rs = await ronda();
  check("la copia de conflicto se funde con la principal (los dos cambios) y se quita", convergen([A, B], "e1") && A.x("e1").nombre === "Nombre de A" && A.x("e1").fecha === "2026-05-05" && archivos(nube, "expedientes/").length === 1 && rs.some((r) => r.copiasConflicto > 0));
  // Estilo Dropbox
  const env = JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos));
  const otra = { ...env, x: { ...env.x, fase: "firma" } }; otra.h = M.rmHuella(otra); otra.hist = [otra.h, ...env.hist]; otra.rev = env.rev + 1;
  nube.a.set("expedientes/e1 (Marta's conflicted copy 2026-10-07).json", { datos: TE.encode(JSON.stringify(otra)), mod: 5, ver: ++nube.ver });
  for (const v of vistas) v.propagar();
  await ronda();
  check("copia de conflicto de Dropbox («conflicted copy»): se funde y se quita", convergen([A, B], "e1") && A.x("e1").fase === "firma" && archivos(nube, "expedientes/").length === 1);
  // Temporales del navegador y de Office
  nube.a.set("expedientes/e1.json.crswap", { datos: TE.encode("{"), mod: 1, ver: ++nube.ver }); nube.a.set("expedientes/~$e1.json", { datos: TE.encode("x"), mod: 1, ver: ++nube.ver });
  for (const v of vistas) v.propagar();
  const r = await A.ciclo();
  check("archivos temporales (.crswap, ~$) se ignoran", r.ok && r.pendientes === 0, r);
}
{
  const { eqs: [A, B], ronda, nube } = await montar({ directa: true });
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "Cambio de A"; B.x("e1").bienes[0].valor = 200000;
  const f0 = nube.a.get("expedientes/e1.json");
  await A.ciclo(); nube.a.set("expedientes/e1.json", f0); // B leyó la carpeta justo antes de que A escribiera…
  await B.ciclo(); // …y escribe encima: la versión de A se pierde de la carpeta
  check("carpeta de red: la segunda escritura pisa la primera (como en un servidor de archivos)", JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos)).x.nombre !== "Cambio de A");
  await ronda();
  check("…pero el equipo cuya escritura se perdió lo detecta por la historia y lo vuelve a fundir", convergen([A, B], "e1") && A.x("e1").nombre === "Cambio de A" && A.x("e1").bienes[0].valor === 200000);
}
// 29 · Relojes desajustados
{
  const { eqs: [A, B], ronda, avanzar } = await montar({ desfases: [3 * 36e5, -2 * 36e5] });
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "Primero (reloj adelantado)"; await ronda(); avanzar(6e4);
  B.x("e1").nombre = "Después (reloj atrasado)"; await ronda();
  check("relojes desajustados (+3 h / −2 h): gana el cambio posterior, no el de la hora más alta", convergen([A, B], "e1") && A.x("e1").nombre === "Después (reloj atrasado)" && !A.x("e1").redConflictos);
}
// 30-32 · Presencia
{
  const { eqs: [A, B], avanzar, prop } = await montar({ desfases: [0, 3 * 36e5] });
  await M.rmPresencia(A.ctx(), { abierto: "e1" }); prop();
  let pb = await M.rmPresencia(B.ctx(), {}); prop();
  check("presencia: B ve el latido de A y qué expediente tiene abierto", pb.length === 1 && pb[0].nombre === "RECEPCION" && pb[0].abierto === "e1" && pb[0].persona === "Persona RECEPCION", pb);
  check("presencia: A cuenta como conectado para B (su reloj está cerca del de B… a 3 h: no)", pb[0].vivo === false, pb);
  const pa = await M.rmPresencia(A.ctx(), { abierto: "e1" }); prop();
  check("presencia: A ve a B; con su reloj 3 h adelantado, no cuenta como conectado al primer vistazo", pa.length === 1 && pa[0].vivo === false, pa);
  avanzar(30e3); await M.rmPresencia(B.ctx(), {}); prop();
  const pa2 = await M.rmPresencia(A.ctx(), { abierto: "e1" }); prop();
  check("presencia: cuando su latido cambia, cuenta como conectado (sin fiarse de su reloj)", pa2[0].vivo === true, pa2);
  avanzar(10e3); pb = await M.rmPresencia(B.ctx(), {}); prop();
  check("presencia: y B, al ver cambiar el latido de A, lo da por conectado con el expediente abierto", pb[0].vivo === true && pb[0].abierto === "e1", pb);
  avanzar(M.RM_PRES_MS + 1000);
  const pb2 = await M.rmPresencia(B.ctx(), {});
  check("presencia: sin latido nuevo en 150 s, deja de contar como conectado", pb2[0].vivo === false);
  await M.rmPresencia(A.ctx(), { cerrado: true }); prop();
  const pb3 = await M.rmPresencia(B.ctx(), {});
  check("presencia: al cerrar la app, el equipo deja de contar como conectado al momento", pb3[0].vivo === false);
}
// 33-39 · Documentos
{
  const { eqs: [A, B], ronda, vistas, nube, avanzar } = await montar();
  A.nuevo("e1"); A.nuevo("e2"); A.adjuntar("e1", "d1", "%PDF-1.4 escritura de la vivienda"); await ronda();
  const sha = await M.rmSha256(TE.encode("%PDF-1.4 escritura de la vivienda"));
  check("un adjunto se guarda una vez en documentos/<sha-256>", nube.a.has("documentos/" + sha));
  check("el otro equipo recibe el adjunto con los mismos bytes", B.docs.has("d1") && TD.decode(B.docs.get("d1").bytes) === "%PDF-1.4 escritura de la vivienda" && B.docs.get("d1").expId === "e1");
  A.adjuntar("e2", "d2", "%PDF-1.4 escritura de la vivienda"); await ronda();
  check("el mismo archivo en dos expedientes no se duplica en la carpeta", archivos(nube, "documentos/").length === 1 && B.docs.has("d2"));
  // Adjunto que llega tarde
  A.adjuntar("e1", "d3", "%PDF certificado de defunción"); await A.ciclo(); vistas[0].propagar();
  vistas[1].propagar((r) => !r.startsWith("documentos/"));
  const r = await B.ciclo();
  check("adjunto que aún no ha llegado: queda pendiente (no se pierde ni se borra)", !B.docs.has("d3") && r.docsPendientes === 1 && !!B.estado.docsPend.d3, r);
  const sinDocs = (r) => !r.startsWith("documentos/");
  vistas[1].propagar(sinDocs); vistas[0].propagar(); await A.ciclo(); vistas[0].propagar(); vistas[1].propagar(sinDocs); await B.ciclo(); vistas[1].propagar(sinDocs); vistas[0].propagar();
  check("…y mientras espera, el expediente no lo da por quitado", nube.a.has("expedientes/e1.json") && JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos)).docs.some((d) => d.id === "d3"));
  // Bytes a medias
  const shaD3 = await M.rmSha256(TE.encode("%PDF certificado de defunción"));
  vistas[1].a.set("documentos/" + shaD3, { datos: TE.encode("%PDF cert"), mod: 1, base: -1 });
  await B.ciclo();
  check("adjunto a medias (no cuadra su SHA-256): sigue pendiente", !B.docs.has("d3"));
  vistas[1].a.delete("documentos/" + shaD3); vistas[1].propagar(); await B.ciclo();
  check("cuando llega entero, se guarda", B.docs.has("d3") && !B.estado.docsPend.d3);
  A.docs.get("d1").meta.estado = "validado"; const lect0 = B.carpeta.lecturas; await ronda();
  check("cambiar el estado de un adjunto llega al otro equipo", B.docs.get("d1").meta.estado === "validado");
  A.docs.delete("d1"); await ronda();
  check("quitar un adjunto lo quita en el otro equipo", !B.docs.has("d1") && B.docs.has("d2"));
  A.docs.delete("d2"); await ronda();
  check("un adjunto que ya no usa nadie sigue en la carpeta unos días", nube.a.has("documentos/" + sha));
  avanzar(M.RM_HUERFANO_MS + 864e5); await ronda();
  check("…y a los 30 días se borra de la carpeta", !nube.a.has("documentos/" + sha) && nube.a.has("documentos/" + shaD3));
}
// 40-44 · Cifrado
{
  const { eqs: [A, B], ronda, nube, desp, sobre } = await montar({ cifrado: true });
  A.nuevo("e1"); A.x("e1").personas[0].nif = "77777777B"; A.adjuntar("e1", "d1", "DNI de Ana López 77777777B"); await ronda();
  const todo = [...nube.a.values()].map((v) => Buffer.from(v.datos).toString("latin1")).join("\n");
  check("carpeta cifrada: ningún archivo contiene los datos en claro (nombres, NIF, adjuntos)", !/77777777B|Ana López|Ana L|Herencia e1/.test(todo) && desp.cifrado === true);
  check("carpeta cifrada: el otro equipo con la clave lo lee todo", B.x("e1") && B.x("e1").personas[0].nif === "77777777B" && TD.decode(B.docs.get("d1").bytes) === "DNI de Ana López 77777777B");
  check("carpeta cifrada: el nombre de los adjuntos no es su SHA-256 (no se puede confirmar si un documento conocido está dentro)", !nube.a.has("documentos/" + await M.rmSha256(TE.encode("DNI de Ana López 77777777B"))) && archivos(nube, "documentos/").length === 1);
  let mal = false; try { await sobreAbrir("contraseña equivocada", desp.k); } catch (e) { mal = true; }
  check("contraseña equivocada: no abre la clave del despacho", mal);
  const otraClave = criptoCon(await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]));
  let mal2 = false; try { await M.rmComprobarClave(desp, otraClave); } catch (e) { mal2 = true; }
  check("otra clave: la comprobación del despacho falla antes de tocar nada", mal2);
  // Archivo en claro metido en una carpeta cifrada; y archivo de un expediente copiado con el nombre de otro
  const plano = { f: "hereda+red-exp", v: 1, id: "intruso", rev: 1, x: { id: "intruso", nombre: "Inyectado" }, docs: [] }; plano.h = M.rmHuella(plano); plano.hist = [plano.h];
  nube.a.set("expedientes/intruso.json", { datos: TE.encode(JSON.stringify(plano)), mod: 1, ver: ++nube.ver });
  nube.a.set("expedientes/e2.json", { ...nube.a.get("expedientes/e1.json"), ver: ++nube.ver });
  for (const v of [A.carpeta, B.carpeta]) v.propagar();
  const r = await B.ciclo();
  check("carpeta cifrada: un archivo sin cifrar se ignora (y se cuenta como ilegible)", r.ok && !B.x("intruso") && r.ilegibles >= 1, r);
  check("carpeta cifrada: un archivo cifrado copiado con el nombre de otro expediente no se acepta", !B.x("e2"));
  check("despacho.json guarda la clave envuelta con la contraseña (nunca la contraseña)", desp.k && desp.k.w && desp.k.salt && !/contraseña del despacho/.test(TD.decode(nube.a.get("despacho.json").datos)) && JSON.stringify(desp.k) === JSON.stringify(sobre));
}
// 45-46 · Carpeta equivocada
{
  const { eqs: [A], nube } = await montar();
  A.nuevo("e1"); const otro = new Equipo("OTRO", A.carpeta, M.rmEstadoNuevo("dOTRO"));
  otro.nuevo("z1"); const esc0 = A.carpeta.escrituras;
  const r = await otro.ciclo();
  check("carpeta de otro despacho: error y no se escribe nada", !r.ok && r.error === "otro-despacho" && A.carpeta.escrituras === esc0);
  nube.a.delete("despacho.json"); A.carpeta.a.delete("despacho.json");
  const r2 = await A.ciclo();
  check("carpeta sin despacho.json (aún sin bajar o movida): error y no se escribe nada", !r2.ok && r2.error === "sin-despacho" && A.carpeta.escrituras === esc0);
}
// 47 · El usuario edita mientras el ciclo trabaja
{
  const { eqs: [A, B], ronda, vistas } = await montar();
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "Cambio remoto"; await A.ciclo(); vistas[0].propagar(); vistas[1].propagar();
  B.trasLeer = () => { B.x("e1").fecha = "2026-09-09"; }; // edita justo después de que el ciclo lea los datos
  const r = await B.ciclo();
  check("cambio local durante el ciclo: no se sobrescribe (se deja para el siguiente)", B.x("e1").fecha === "2026-09-09" && r.pendientes >= 1, r);
  await ronda();
  check("…y el siguiente ciclo junta los dos cambios", convergen([A, B], "e1") && B.x("e1").fecha === "2026-09-09" && B.x("e1").nombre === "Cambio remoto");
}
// 47b · El adaptador entrega los objetos vivos (como la app) y el usuario los cambia a mitad de ciclo
{
  const { eqs: [A, B], ronda, vistas } = await montar();
  A.nuevo("e1"); A.nuevo("e2"); await ronda();
  const copia = A.local.listar, bytes = A.local.docBytes;
  A.local.listar = async () => (await copia()).map((it) => (it.id === "_despacho" ? it : { ...it, x: A.exps.get(it.id) }));
  A.local.docBytes = async (id) => { A.x("e1").fecha = "2026-12-12"; return bytes(id); }; // el usuario cambia e1 mientras el ciclo calcula las huellas de e2
  A.x("e1").nombre = "Cambio A1"; A.adjuntar("e2", "d1", "%PDF nota simple");
  await A.ciclo(); vistas[0].propagar(); vistas[1].propagar();
  const r = await B.ciclo();
  check("objetos vivos cambiados a mitad de ciclo: lo escrito cuadra con su huella (el otro equipo lo puede leer)", r.pendientes === 0 && B.x("e1").nombre === "Cambio A1", r);
  A.local.listar = copia; A.local.docBytes = bytes; await ronda();
  check("…y el cambio hecho a mitad de ciclo llega en el siguiente", convergen([A, B], "e1") && B.x("e1").fecha === "2026-12-12");
}
// 48 · Datos del despacho (equipo de personas)
{
  const { eqs: [A, B], ronda } = await montar();
  A.despacho = { nombre: "Pérez Abogados", abogados: [{ id: "a1", nombre: "Juan Pérez", rol: "Socio" }] }; await ronda();
  check("los datos del despacho viajan (nombre y equipo de personas)", B.despacho && B.despacho.abogados[0].nombre === "Juan Pérez");
  A.despacho.abogados.push({ id: "a2", nombre: "Marta Gil", rol: "Abogada" }); B.despacho.abogados[0].rol = "Socio director";
  await ronda();
  check("altas y cambios en el equipo de personas desde dos equipos: se juntan", B.despacho.abogados.length === 2 && A.despacho.abogados[0].rol === "Socio director" && M.rmCanon(A.despacho) === M.rmCanon(B.despacho));
}
// 49-50 · Tres equipos y expedientes que faltan aquí sin borrarlos
{
  const { eqs: [A, B, C], ronda } = await montar({ n: 3, desfases: [0, 6e5, -6e5] });
  A.nuevo("e1"); await ronda();
  A.x("e1").nombre = "A"; B.x("e1").fecha = "2026-04-04"; C.x("e1").personas.push({ id: "p9", nombre: "Pedro", relacion: "nieto" });
  await ronda(3);
  check("tres equipos cambiando a la vez: convergen con los tres cambios", convergen([A, B, C], "e1") && A.x("e1").nombre === "A" && A.x("e1").fecha === "2026-04-04" && A.x("e1").personas.some((p) => p.id === "p9"));
  C.exps.delete("e1"); // falta aquí sin un borrado deliberado (apartado por dañado, copia restaurada…)
  await C.ciclo();
  check("un expediente que falta aquí sin haberlo borrado se recupera de la carpeta", !!C.x("e1"));
}
// 50b · Borrado y vuelta atrás antes de sincronizar (copia restaurada): no queda un borrado colgando
{
  const { eqs: [A, B], ronda, nube } = await montar();
  A.nuevo("e1"); await ronda(); const copia = clon(A.x("e1"));
  A.borrar("e1"); A.exps.set("e1", copia); await ronda();
  A.exps.delete("e1"); await ronda(); // ahora falta sin un borrado deliberado
  check("borrar y restaurar antes de sincronizar: no deja un borrado pendiente que luego borre en todos", !nube.a.has("lapidas/e1.json") && !!A.x("e1") && !!B.x("e1"));
}
// 51 · Resucitar tras una lápida (versión más nueva)
{
  const { eqs: [A, B], ronda, nube } = await montar();
  A.nuevo("e1"); await ronda(); const lapRev = JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos)).rev;
  A.borrar("e1"); await A.ciclo(); A.carpeta.propagar();
  B.x("e1").nombre = "Lo sigo usando"; await B.ciclo(); B.carpeta.propagar(); A.carpeta.propagar();
  await ronda(2);
  check("versión más nueva que la lápida: el expediente sigue y la lápida se retira", convergen([A, B], "e1") && !nube.a.has("lapidas/e1.json") && JSON.parse(TD.decode(nube.a.get("expedientes/e1.json").datos)).rev > lapRev);
}
// 52 · 200 expedientes
{
  const { eqs: [A, B], vistas } = await montar();
  for (let i = 0; i < 200; i++) { const x = A.nuevo("x" + i); x.bitacora = Array.from({ length: 30 }, (_, k) => ({ t: `2026-0${1 + (k % 9)}-10T10:00:00Z`, tipo: "nota", texto: "Anotación " + k + " del expediente " + i, autor: "a1" })); }
  const t0 = performance.now(); const r1 = await A.ciclo(); const t1 = performance.now(); vistas[0].propagar(); vistas[1].propagar();
  const r2 = await B.ciclo(); const t2 = performance.now();
  const r3 = await B.ciclo(); const t3 = performance.now();
  check(`200 expedientes: el primero los escribe (${Math.round(t1 - t0)} ms) y el otro los recibe (${Math.round(t2 - t1)} ms)`, r1.subidos === 200 && r2.recibidos === 200 && B.exps.size === 200 && t2 - t0 < 20000);
  check(`200 expedientes: un ciclo sin cambios es rápido (${Math.round(t3 - t2)} ms) y no escribe`, r3.subidos === 0 && r3.recibidos === 0 && t3 - t2 < 3000);
  A.x("x77").nombre = "Solo cambia este"; const esc = vistas[0].escrituras; await A.ciclo();
  check("200 expedientes: un cambio escribe un solo archivo", vistas[0].escrituras - esc === 1);
}
// 53 · Fusión pura: lo que dice la documentación
{
  const base = { x: { a: 1, b: 1, l: [{ id: 1, v: 1 }] }, docs: [] };
  const F = M.rmFundir(base, { x: { a: 2, b: 1, l: [{ id: 1, v: 1 }, { id: 2, v: 1 }] }, docs: [] }, { x: { a: 1, b: 3, l: [{ id: 1, v: 5 }] }, docs: [] }, { nombre: "B" }, { nombre: "A" }, "2026-10-07T10:00:00Z");
  check("fusión de tres vías: cada lado aporta lo suyo sin choques", F.x.a === 2 && F.x.b === 3 && F.x.l.length === 2 && F.x.l[0].v === 5 && F.nuevos === 0, F);
  const G = M.rmFundir(null, { x: { a: 1 }, docs: [] }, { x: { a: 2 }, docs: [] }, null, null, "t");
  check("sin base común, cualquier diferencia es un choque (nunca se elige a ciegas)", G.nuevos === 1 && G.x.a === 1 && G.x.redConflictos[0].alli === 2);
}

// ═════════ (b) Navegador ═════════
const URL_APP = process.argv[2];
if (URL_APP) await pruebaNavegador(URL_APP);
console.log(`\n${ok} correctas, ${ko} fallidas`);
process.exit(ko ? 1 : 0);

async function pruebaNavegador(URL_APP) {
  const SS = "/tmp/claude-0/-home-claude-claude/69a5e33a-4a24-5e7a-8e4f-daae11c4df90/scratchpad/r4/";
  console.log("\n── Navegador: dos equipos (contextos de Playwright) con una carpeta compartida simulada ──");
  const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
  const { chromium } = await import(PW);
  const b = await chromium.launch();
  // La carpeta compartida vive en este proceso; cada página la ve a través de window.__redFs (como si fuera la misma carpeta de OneDrive)
  const carpeta = new Map(); let mod = 1;
  const fsOp = (op, ruta, datos) => {
    if (op === "listar") { const p = ruta ? ruta + "/" : ""; const hijos = new Map(); for (const [k, v] of carpeta) if (k.startsWith(p)) { const resto = k.slice(p.length), i = resto.indexOf("/"); if (i < 0) hijos.set(resto, { kind: "file", tam: v.datos.length, mod: v.mod }); else hijos.set(resto.slice(0, i), { kind: "directory" }); } return [...hijos].map(([n, v]) => ({ n, ...v })); }
    if (op === "leer") { const v = carpeta.get(ruta); return v ? { b64: Buffer.from(v.datos).toString("base64"), mod: v.mod } : null; }
    if (op === "escribir") { carpeta.set(ruta, { datos: Buffer.from(datos, "base64"), mod: mod++ }); return { mod: mod - 1 }; }
    if (op === "borrar") { for (const k of [...carpeta.keys()]) if (k === ruta || k.startsWith(ruta + "/")) carpeta.delete(k); return true; }
    if (op === "existe") { for (const k of carpeta.keys()) if (k === ruta || k.startsWith(ruta + "/")) return true; return false; }
    return null;
  };
  const errores = [];
  // Accesibilidad de las pantallas nuevas (axe-core, WCAG 2.2 A y AA, como tools/qa/a11y.mjs)
  const AXE = fs.readFileSync(new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
  const axe = async (E, nombre) => {
    for (const tema of ["claro", "grafito"]) {
      const v = await E.p.evaluate(async ({ AXE, tema }) => {
        if (!window.axe) { const s = document.createElement("script"); s.textContent = AXE; document.head.appendChild(s); }
        const antes = DB.tema; DB.tema = tema; if (typeof aplicarTema === "function") aplicarTema();
        await new Promise((r) => setTimeout(r, 120));
        const raiz = document.querySelector(".sg-modal") || document;
        const r = await window.axe.run(raiz, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] }, resultTypes: ["violations"] });
        DB.tema = antes; if (typeof aplicarTema === "function") aplicarTema();
        return r.violations.map((x) => x.id + ": " + x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | "));
      }, { AXE, tema });
      check(`navegador · accesibilidad (axe, WCAG 2.2 AA) · ${nombre} · ${tema}: 0 infracciones`, v.length === 0, v);
    }
  };
  const abrir = async (nombre) => {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
    await ctx.exposeFunction("__redFs", fsOp);
    await ctx.addInitScript(fakeHandleScript);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errores.push(nombre + ": " + e.message));
    p.on("console", (m) => { if (m.type() === "error" && !/favicon|service worker|sw\.js|Failed to load resource/i.test(m.text())) errores.push(nombre + ": " + m.text()); });
    await p.goto(URL_APP); await p.waitForTimeout(1200);
    await p.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); });
    await p.evaluate(() => { if (typeof sgPrueba === "function") sgPrueba({ iteraciones: 2000 }); if (typeof redPrueba === "function") redPrueba({ intervalo: 400, antirrebote: 150, desaparecidoMs: 0 }); });
    return { ctx, p, ev: (f, a) => p.evaluate(f, a), w: (ms = 300) => p.waitForTimeout(ms) };
  };
  const A = await abrir("A"), B = await abrir("B");
  // Equipo A: crea el despacho en red con contraseña
  await A.ev(() => { ui.sheet = { tipo: "ajustes" }; render(); }); await A.w(300);
  check("navegador · Ajustes muestra la sección «Despacho en red»", await A.ev(() => /Despacho en red/.test(document.querySelector(".sheet")?.textContent || "")));
  await A.p.click('[data-red="asistente"]'); await A.w(300);
  await A.p.screenshot({ path: SS + "red-paso1-1440.png" }).catch(() => {});
  await axe(A, "asistente, paso 1");
  check("navegador · asistente: paso 1, elegir la carpeta compartida", await A.ev(() => /Elige la carpeta compartida/.test(document.querySelector(".sg-modal")?.textContent || "")));
  await A.p.click('[data-red="elegir"]'); await A.w(500);
  check("navegador · asistente: paso 2, nombre de este equipo", await A.ev(() => !!document.getElementById("red-equipo")));
  await A.p.fill("#red-equipo", "Recepción"); await A.p.click('[data-red="paso3"]'); await A.w(300);
  check("navegador · asistente: paso 3, crear el despacho (carpeta vacía)", await A.ev(() => /Crear el despacho en red/.test(document.querySelector(".sg-modal")?.textContent || "")));
  await A.p.screenshot({ path: SS + "red-paso3-1440.png" }).catch(() => {});
  await axe(A, "asistente, paso 3 (crear)");
  await A.p.fill("#red-p1", "clave-del-despacho-1"); await A.p.fill("#red-p2", "clave-del-despacho-1");
  await A.p.click('[data-red="crear"]'); await A.w(1500);
  check("navegador · despacho creado en la carpeta (cifrado)", fsOp("existe", "hereda-red/despacho.json") && JSON.parse(fsOp("leer", "hereda-red/despacho.json") ? Buffer.from(fsOp("leer", "hereda-red/despacho.json").b64, "base64").toString() : "{}").cifrado === true);
  check("navegador · pantalla final «Listo» con quién usa este equipo", await A.ev(() => /Listo/.test(document.querySelector(".sg-modal")?.textContent || "") && !!document.getElementById("red-yo")));
  await axe(A, "asistente, listo");
  await A.p.click('[data-red="hecho"]'); await A.w(300);
  await A.ev(() => { ui.sheet = { tipo: "ajustes" }; render(); const el = [...document.querySelectorAll(".sheet .sectitle")].find((n) => n.textContent.trim() === "Despacho en red"); el && el.scrollIntoView(); }); await A.w(300);
  await axe(A, "Ajustes con el despacho en red conectado");
  // A crea un expediente real
  const idA = await A.ev(() => { const x = { id: "redexp1", nombre: "Herencia de Carmen Ruiz", fecha: "2026-06-01", ccaa: "AND", fase: "encargo", testamento: "no", personas: [{ id: "p1", nombre: "Ana Ruiz", relacion: "hija", nif: "11111111H" }], bienes: [{ id: "b1", tipo: "vivienda", descripcion: "Piso en Málaga", valor: 180000 }], despacho: { ref: "EXP-2026-901" } }; DB.expedientes.push(x); guardar(); return x.id; });
  await A.w(1500);
  check("navegador · el expediente se escribe en la carpeta, cifrado", fsOp("existe", "hereda-red/expedientes/redexp1.json") && !/Carmen/.test(Buffer.from(fsOp("leer", "hereda-red/expedientes/redexp1.json").b64, "base64").toString()));
  // Equipo B: se une
  await B.ev(() => { ui.sheet = { tipo: "ajustes" }; render(); }); await B.w(300);
  await B.p.click('[data-red="asistente"]'); await B.w(300); await B.p.click('[data-red="elegir"]'); await B.w(600);
  await B.p.fill("#red-equipo", "Portátil de Marta"); await B.p.click('[data-red="paso3"]'); await B.w(300);
  check("navegador · el segundo equipo ve «Unirse» con el nombre del despacho", await B.ev(() => /Unirse/.test(document.querySelector(".sg-modal")?.textContent || "")));
  await axe(B, "asistente, paso 3 (unirse)");
  await B.p.fill("#red-pj", "contraseña mala"); await B.p.click('[data-red="unirse"]'); await B.w(800);
  check("navegador · contraseña equivocada: lo dice y no se une", await B.ev(() => /no es correcta/i.test(document.querySelector(".sg-modal")?.textContent || "") && !RED.activo));
  await B.p.fill("#red-pj", "clave-del-despacho-1"); await B.p.click('[data-red="unirse"]'); await B.w(2500);
  await B.p.click('[data-red="hecho"]').catch(() => {}); await B.w(200);
  check("navegador · el segundo equipo recibe el expediente", await B.ev(() => DB.expedientes.some((x) => x.id === "redexp1" && x.personas[0].nif === "11111111H")));
  // Edición en B → llega a A
  await B.ev(() => { const x = DB.expedientes.find((q) => q.id === "redexp1"); x.bienes[0].valor = 195000; guardar(); }); await B.w(700);
  await A.ev(() => redSincronizar("prueba")); await A.w(1200);
  check("navegador · una edición en B llega a A", await A.ev(() => DB.expedientes.find((x) => x.id === "redexp1").bienes[0].valor === 195000));
  const audA = await A.ev(() => (DB.expedientes.find((x) => x.id === "redexp1").auditoria || []).filter((e) => e.c === "Valor").length);
  check("navegador · el registro de cambios trae la entrada de B y A no se atribuye el cambio recibido (una sola entrada)", audA === 1, audA);
  // Presencia
  await A.ev(() => { go({ vista: "exp", id: "redexp1", sec: "resumen", sheet: null }); }); await A.w(900);
  await B.ev(() => { go({ vista: "exp", id: "redexp1", sec: "resumen", sheet: null }); }); await B.w(900);
  await A.ev(() => redSincronizar("prueba")); await A.w(900); await B.ev(() => redSincronizar("prueba")); await B.w(900);
  check("navegador · aviso de presencia: B ve que Recepción tiene abierto el expediente", await B.ev(() => /Recepción/.test(document.querySelector(".red-pres")?.textContent || "")));
  // Choque
  await A.ev(() => { const x = DB.expedientes.find((q) => q.id === "redexp1"); x.personas[0].nif = "22222222J"; guardar(); });
  await B.ev(() => { const x = DB.expedientes.find((q) => q.id === "redexp1"); x.personas[0].nif = "33333333P"; guardar(); });
  await A.w(900); await B.ev(() => redSincronizar("prueba")); await B.w(900); await A.ev(() => redSincronizar("prueba")); await A.w(900); await B.ev(() => redSincronizar("prueba")); await B.w(900);
  if (process.env.RED_DEBUG) console.log(await Promise.all([A, B].map((E) => E.ev(() => ({ nif: DB.expedientes.find((q) => q.id === "redexp1").personas[0].nif, err: RED.error, res: RED.resumen, reg: RED.registro, base: RED.estado.bases.redexp1 && RED.estado.bases.redexp1.x.personas[0].nif })))));
  const nConf = await Promise.all([A, B].map((E) => E.ev(() => (DB.expedientes.find((q) => q.id === "redexp1").redConflictos || []).length)));
  check("navegador · el mismo dato cambiado en los dos: un choque en los dos equipos", nConf[0] === 1 && nConf[1] === 1, nConf);
  await A.ev(() => render()); await A.w(400);
  check("navegador · franja «cambios en conflicto» en el expediente", await A.ev(() => /conflicto/i.test(document.querySelector(".red-banner")?.textContent || "")));
  await A.p.click('.red-banner [data-red="choques"]'); await A.w(400);
  check("navegador · la hoja de conflictos enseña los dos valores con quién los puso", await A.ev(() => { const t = document.querySelector(".sg-modal")?.textContent || ""; return /22222222J/.test(t) && /33333333P/.test(t) && /Recepción/.test(t) && /Portátil de Marta/.test(t); }));
  await A.p.screenshot({ path: SS + "red-conflictos-1440.png" }).catch(() => {});
  await axe(A, "hoja de cambios en conflicto");
  await A.p.click('.sg-modal [data-red="elegir-c"][data-v="alli"]'); await A.w(900);
  await B.ev(() => redSincronizar("prueba")); await B.w(1200);
  const fin = await Promise.all([A, B].map((E) => E.ev(() => { const x = DB.expedientes.find((q) => q.id === "redexp1"); return [x.personas[0].nif, (x.redConflictos || []).length]; })));
  check("navegador · elegir una versión resuelve el choque en los dos equipos", fin[0][1] === 0 && fin[1][1] === 0 && fin[0][0] === fin[1][0], fin);
  // Borrado
  await A.ev(() => rbBorrarExpediente("redexp1")); await A.w(900); await B.ev(() => redSincronizar("prueba")); await B.w(1200);
  check("navegador · borrar en A lo quita en B (lápida)", await B.ev(() => !DB.expedientes.some((x) => x.id === "redexp1")) && fsOp("existe", "hereda-red/lapidas/redexp1.json"));
  // Copia automática existente: sigue funcionando
  check("navegador · la copia automática de seguridad.js sigue disponible", await A.ev(() => typeof sgEscribirCopia === "function" && typeof sgAjustesHTML === "function" && /Copias de seguridad/.test(sgAjustesHTML())));
  // Sin la API (Firefox/Safari)
  const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx3.addInitScript(() => { delete window.showDirectoryPicker; Object.defineProperty(window, "showDirectoryPicker", { value: undefined }); });
  const p3 = await ctx3.newPage(); await p3.goto(URL_APP); await p3.waitForTimeout(1200); await p3.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); ui.sheet = { tipo: "ajustes" }; render(); }); await p3.waitForTimeout(300);
  check("navegador sin la API (Firefox/Safari): lo explica y ofrece Exportar/Importar", await p3.evaluate(() => { const t = document.querySelector(".sheet")?.textContent || ""; return /Chrome o Edge/.test(t) && /Exportar/.test(t); }));
  await p3.screenshot({ path: SS + "red-sinapi-390.png", fullPage: false }).catch(() => {});
  check("navegador · sin errores en la consola", errores.length === 0, errores);
  await b.close();
}
// Manejador de carpeta falso (FileSystemDirectoryHandle) sobre window.__redFs. Lo usa red.js en lugar de showDirectoryPicker.
function fakeHandleScript() {
  const b64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const deb = (s) => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
  const err = (n) => Object.assign(new Error(n), { name: n });
  class FH { constructor(ruta, name) { this.kind = "file"; this.ruta = ruta; this.name = name; }
    async getFile() { const r = await window.__redFs("leer", this.ruta); if (!r) throw err("NotFoundError"); const u = deb(r.b64); const f = new File([u], this.name, { lastModified: r.mod }); return f; }
    async createWritable() { const partes = []; const ruta = this.ruta; return { async write(d) { if (d instanceof Blob) partes.push(new Uint8Array(await d.arrayBuffer())); else if (typeof d === "string") partes.push(new TextEncoder().encode(d)); else partes.push(new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d)); }, async close() { const n = partes.reduce((s, p) => s + p.length, 0), u = new Uint8Array(n); let o = 0; for (const p of partes) { u.set(p, o); o += p.length; } await window.__redFs("escribir", ruta, b64(u)); } }; } }
  class DH { constructor(ruta, name) { this.kind = "directory"; this.ruta = ruta; this.name = name; }
    async queryPermission() { return "granted"; } async requestPermission() { return "granted"; }
    _h(n) { return this.ruta ? this.ruta + "/" + n : n; }
    async getDirectoryHandle(n, o) { const r = this._h(n); if (!(o && o.create) && !(await window.__redFs("existe", r))) throw err("NotFoundError"); return new DH(r, n); }
    async getFileHandle(n, o) { const r = this._h(n); if (!(o && o.create) && !(await window.__redFs("leer", r))) throw err("NotFoundError"); return new FH(r, n); }
    async removeEntry(n) { await window.__redFs("borrar", this._h(n)); }
    async *entries() { for (const e of await window.__redFs("listar", this.ruta)) yield [e.n, e.kind === "file" ? new FH(this._h(e.n), e.n) : new DH(this._h(e.n), e.n)]; }
    async *values() { for await (const [, h] of this.entries()) yield h; }
  }
  window.__redCarpetaPrueba = () => new DH("", "OneDrive - Pérez Abogados");
}
