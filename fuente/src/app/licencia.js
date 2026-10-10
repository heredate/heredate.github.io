// ───────────────────── Licencia ─────────────────────
// Prueba de 30 días, códigos de licencia firmados (ECDSA P-256) y modo solo lectura al caducar.
// Sin servidor: la firma se comprueba en el navegador con la clave pública incrustada abajo.
// Código: "HRD1-" + base64url(JSON) + "." + base64url(firma r||s, 64 bytes), firmado sobre "HRD1-" + base64url(JSON).
// Los códigos se emiten con tools/emitir-licencia.mjs (la clave privada nunca entra en la app).
// Al caducar, solo lectura (Condiciones 5.2 y 11.4): se puede abrir, consultar, imprimir y descargar PDF, exportar y hacer copias;
// no se pueden crear expedientes (tampoco importándolos) ni modificarlos. Borrar sí: los datos son del despacho y nunca se bloquean.
// Guardas: licPuedeCrear() · licPuedeEditar() · licMotivoBloqueo() · licMotivoEdicion(). Además, una red de seguridad (licVigilar)
// deshace cualquier cambio en un expediente hecho en modo solo lectura, venga del módulo que venga.
// Avisos de vencimiento: licencia a 30, 15, 7 y 1 días (Condiciones 11.2: «recordará la renovación con 30 días de antelación»);
// prueba a 7, 3 y 1 días. Cada aviso se puede cerrar y vuelve en el siguiente umbral.
// Prueba: la fecha de primer uso se guarda también en IndexedDB («hereda-licencia») y viaja en las copias de seguridad
// (DB.licencia, que la restauración conserva con la fecha más antigua). Riesgo residual: borrar TODOS los datos del sitio
// (localStorage e IndexedDB a la vez) sin restaurar después una copia reinicia la prueba; sin servidor no se puede evitar.

const LIC_CLAVE = "BDs2O_mbHO305MHCnUfYtY_X2OOBegogJ4KCFzWoYY_pLkQ6jY6I1OwvJdZO7l1gc6h_DZxmqRCGZ55mPL-eTlc";
const LIC_PREFIJO = "HRD1-";
const LIC_PRUEBA_DIAS = 30;
const LIC_AVISO_DIAS = 7;
const LIC_UMBRALES = { licencia: [30, 15, 7, 1], prueba: [7, 3, 1] };
const LIC_PLANES = { individual: ["Individual", 1], despacho: ["Despacho", 5], "despacho+": ["Despacho+", 15], fundador: ["Fundador", 5] };
const LIC_MARCA = "{{MARCA}}".includes("{") ? "Hereda+" : "{{MARCA}}";

// ── Utilidades
const licEsc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const licPad = (n) => String(n).padStart(2, "0");
const licHoy = () => { const d = new Date(); return `${d.getFullYear()}-${licPad(d.getMonth() + 1)}-${licPad(d.getDate())}`; };
const licDia = (s) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);
const licSumar = (s, n) => new Date((licDia(s) + n) * 864e5).toISOString().slice(0, 10);
const licFechaOk = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && licSumar(s, 0) === s;
const licFecha = (s) => new Date(licDia(s) * 864e5).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const licDias = (n) => n === 1 ? "1 día" : `${n} días`;
function licB64d(s) {
  const t = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "===".slice((t.length + 3) % 4));
  const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
const licAscii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));

// ── SHA-256 (para la verificación sin WebCrypto)
const LIC_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
function licSha256(bytes) {
  const l = bytes.length, nb = (((l + 8) >> 6) + 1) << 6;
  const m = new Uint8Array(nb); m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(nb - 8, Math.floor(l / 0x20000000)); dv.setUint32(nb - 4, (l * 8) >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64);
  const ror = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = w[i - 16] + (ror(a, 7) ^ ror(a, 18) ^ (a >>> 3)) + w[i - 7] + (ror(b, 17) ^ ror(b, 19) ^ (b >>> 10)); }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + LIC_K[i] + w[i]) | 0;
      const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer); H.forEach((v, i) => ov.setUint32(i * 4, v)); return out;
}

// ── ECDSA P-256 (verificación en JavaScript puro, coordenadas jacobianas, a = −3)
const LIC_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const LIC_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const LIC_B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
const LIC_G = [0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n, 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n, 1n];
const licMod = (a, m = LIC_P) => { const r = a % m; return r < 0n ? r + m : r; };
const licBig = (u) => u.reduce((s, x) => (s << 8n) | BigInt(x), 0n);
function licInv(a, m) {
  let r0 = licMod(a, m), r1 = m, s0 = 1n, s1 = 0n;
  while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return r0 === 1n ? licMod(s0, m) : 0n;
}
function licDbl(P) {
  const [X, Y, Z] = P; if (!Z || !Y) return [0n, 1n, 0n];
  const dl = licMod(Z * Z), ga = licMod(Y * Y), be = licMod(X * ga), al = licMod(3n * (X - dl) * (X + dl));
  const X3 = licMod(al * al - 8n * be);
  return [X3, licMod(al * (4n * be - X3) - 8n * ga * ga), licMod((Y + Z) * (Y + Z) - ga - dl)];
}
function licAdd(P, Q) {
  const [X1, Y1, Z1] = P, [X2, Y2, Z2] = Q; if (!Z1) return Q; if (!Z2) return P;
  const z1 = licMod(Z1 * Z1), z2 = licMod(Z2 * Z2);
  const U1 = licMod(X1 * z2), U2 = licMod(X2 * z1), S1 = licMod(Y1 * Z2 * z2), S2 = licMod(Y2 * Z1 * z1);
  const H = licMod(U2 - U1), r = licMod(S2 - S1);
  if (!H) return r ? [0n, 1n, 0n] : licDbl(P);
  const HH = licMod(H * H), HHH = licMod(H * HH), V = licMod(U1 * HH), X3 = licMod(r * r - HHH - 2n * V);
  return [X3, licMod(r * (V - X3) - S1 * HHH), licMod(Z1 * Z2 * H)];
}
function licVerificarJS(pub, msg, sig) {
  if (pub.length !== 65 || pub[0] !== 4 || sig.length !== 64) return false;
  const x = licBig(pub.subarray(1, 33)), y = licBig(pub.subarray(33)), r = licBig(sig.subarray(0, 32)), s = licBig(sig.subarray(32));
  if (x >= LIC_P || y >= LIC_P || licMod(y * y - x * x * x + 3n * x - LIC_B) !== 0n) return false;
  if (r < 1n || r >= LIC_N || s < 1n || s >= LIC_N) return false;
  const w = licInv(s, LIC_N), u1 = licMod(licBig(licSha256(msg)) * w, LIC_N), u2 = licMod(r * w, LIC_N);
  const Q = [x, y, 1n], GQ = licAdd(LIC_G, Q); let R = [0n, 1n, 0n];
  for (let i = 255n; i >= 0n; i--) {
    R = licDbl(R);
    const b1 = (u1 >> i) & 1n, b2 = (u2 >> i) & 1n;
    if (b1 && b2) R = licAdd(R, GQ); else if (b1) R = licAdd(R, LIC_G); else if (b2) R = licAdd(R, Q);
  }
  if (!R[2]) return false;
  const zi = licInv(R[2], LIC_P);
  return licMod(licMod(R[0] * zi * zi), LIC_N) === r;
}
// WebCrypto si está (https, localhost y file:// en Chromium); si no, la implementación de arriba
async function licVerificarFirma(msg, sig) {
  const pub = licB64d(LIC_CLAVE);
  try {
    const S = globalThis.crypto && globalThis.crypto.subtle;
    if (S) {
      const k = await S.importKey("raw", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      return await S.verify({ name: "ECDSA", hash: "SHA-256" }, k, sig, msg);
    }
  } catch (e) { /* sin WebCrypto utilizable: se verifica en JavaScript */ }
  return licVerificarJS(pub, msg, sig);
}

// ── Lectura del código
function licLeer(codigo) {
  const c = String(codigo ?? "").replace(/\s+/g, "");
  if (!c) return { error: "Pega el código de licencia." };
  const partes = c.split(".");
  if (!c.startsWith(LIC_PREFIJO) || partes.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(partes[0].slice(LIC_PREFIJO.length) + partes[1])) return { error: "Ese texto no es un código de licencia. Cópialo completo: empieza por HRD1-." };
  let p, sig;
  try { p = JSON.parse(new TextDecoder().decode(licB64d(partes[0].slice(LIC_PREFIJO.length)))); sig = licB64d(partes[1]); } catch (e) { return { error: "El código está incompleto. Cópialo entero desde el correo." }; }
  if (sig.length !== 64) return { error: "El código está incompleto. Cópialo entero desde el correo." };
  const planOk = p && LIC_PLANES[p.plan], u = p && p.usuarios;
  if (!planOk || typeof p.despacho !== "string" || typeof p.id !== "string" || !licFechaOk(p.hasta) || !(u === null || (Number.isInteger(u) && u > 0))) return { error: "El código no es válido para esta aplicación." };
  return { codigo: c, msg: licAscii(partes[0]), sig, payload: { id: p.id, despacho: p.despacho, plan: p.plan, usuarios: u, hasta: p.hasta, emitida: licFechaOk(p.emitida) ? p.emitida : null } };
}

// ── Estado guardado (DB.licencia). Solo cuenta lo que pasa la firma: el payload guardado es informativo.
function licDatos() {
  if (typeof DB === "undefined") return { primerUso: licHoy() };
  if (!DB.licencia || !licFechaOk(DB.licencia.primerUso)) {
    DB.licencia = Object.assign({}, DB.licencia, { primerUso: licHoy() });
    if (typeof guardar === "function") guardar();
  }
  return DB.licencia;
}
// Copia de la fecha de primer uso fuera de localStorage (IndexedDB): si alguien borra solo el almacenamiento local, la prueba no se reinicia
function licIDB(modo, fn) {
  return new Promise((res) => {
    try {
      const r = indexedDB.open("hereda-licencia", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => { try { const db = r.result, tx = db.transaction("kv", modo), q = fn(tx.objectStore("kv")); tx.oncomplete = () => { db.close(); res(q && q.result); }; tx.onerror = tx.onabort = () => { db.close(); res(undefined); }; } catch (e) { res(undefined); } };
      r.onerror = () => res(undefined);
    } catch (e) { res(undefined); }
  });
}
async function licSincronizarPrimerUso() {
  try {
    const D = licDatos(), guardado = await licIDB("readonly", (st) => st.get("primerUso"));
    if (licFechaOk(guardado) && guardado < D.primerUso) { D.primerUso = guardado; if (typeof guardar === "function") guardar(); if (typeof render === "function") render(); }
    else if (!licFechaOk(guardado) || guardado > D.primerUso) await licIDB("readwrite", (st) => st.put(D.primerUso, "primerUso"));
  } catch (e) { /* sin IndexedDB: solo localStorage */ }
}
function licInit() { licDatos(); licSincronizarPrimerUso(); return licEstado(); }
let licCache = { codigo: null, payload: null };
function licVigente() {
  const c = licDatos().codigo;
  if (!c) return null;
  if (licCache.codigo !== c) {
    const L = licLeer(c);
    licCache = { codigo: c, payload: !L.error && licVerificarJS(licB64d(LIC_CLAVE), L.msg, L.sig) ? L.payload : null };
  }
  return licCache.payload;
}

function licEstado(hoyISO) {
  const hoy = licFechaOk(hoyISO) ? hoyISO : licHoy();
  const p = licVigente();
  if (p) {
    const dias = licDia(p.hasta) - licDia(hoy) + 1;
    return { tipo: dias > 0 ? "licencia" : "caducada", origen: "licencia", plan: p.plan, despacho: p.despacho, usuarios: p.usuarios, hasta: p.hasta, diasRestantes: Math.max(0, dias), id: p.id };
  }
  const hasta = licSumar(licDatos().primerUso, LIC_PRUEBA_DIAS - 1);
  const dias = licDia(hasta) - licDia(hoy) + 1;
  return { tipo: dias > 0 ? "prueba" : "caducada", origen: "prueba", plan: null, despacho: null, usuarios: null, hasta, diasRestantes: Math.max(0, Math.min(LIC_PRUEBA_DIAS, dias)), id: null };
}
const licPuedeCrear = (hoyISO) => licEstado(hoyISO).tipo !== "caducada";
const licPuedeEditar = (hoyISO) => licEstado(hoyISO).tipo !== "caducada";
function licMotivoBloqueo(hoyISO) {
  const E = licEstado(hoyISO);
  if (E.tipo !== "caducada") return "";
  return E.origen === "prueba" ? "La prueba ha terminado. Activa una licencia para crear expedientes nuevos." : "La licencia ha caducado. Renuévala para crear expedientes nuevos.";
}
function licMotivoEdicion(hoyISO) {
  const E = licEstado(hoyISO);
  if (E.tipo !== "caducada") return "";
  return `Solo lectura: ${E.origen === "prueba" ? "la prueba ha terminado" : "la licencia ha caducado"}. Puedes consultar, exportar y descargar PDF; para modificar, ${E.origen === "prueba" ? "activa" : "renueva"} la licencia en Ajustes.`;
}

async function licActivar(codigo, hoyISO) {
  const L = licLeer(codigo);
  if (L.error) return { ok: false, error: L.error };
  let ok = false;
  try { ok = await licVerificarFirma(L.msg, L.sig); } catch (e) { ok = false; }
  if (!ok) return { ok: false, error: "El código no es auténtico o se ha modificado. Cópialo de nuevo tal como lo recibiste." };
  const hoy = licFechaOk(hoyISO) ? hoyISO : licHoy();
  if (L.payload.hasta < hoy) return { ok: false, error: `Este código caducó el ${licFecha(L.payload.hasta)}. Escríbenos para renovarlo.` };
  const D = licDatos();
  D.codigo = L.codigo; D.payload = Object.assign({}, L.payload); D.activada = hoy;
  licCache = { codigo: L.codigo, payload: L.payload };
  if (typeof guardar === "function") guardar();
  return { ok: true, error: null, estado: licEstado(hoy) };
}

// ── Interfaz
function licContratarURL() {
  const h = typeof location !== "undefined" ? location : { protocol: "file:", hostname: "" };
  if (h.protocol === "https:" && !/claude\.ai$|claudeusercontent\.com$/.test(h.hostname)) return "/contratar.html";
  return "mailto:?subject=" + encodeURIComponent(`Contratar licencia de ${LIC_MARCA}`) + "&body=" + encodeURIComponent("Despacho:\nPlan (individual, despacho, despacho+):\nNúmero de usuarios:\n");
}
const licPlanTxt = (E) => { const [n] = LIC_PLANES[E.plan] || [E.plan]; return E.usuarios ? `${n} · ${E.usuarios === 1 ? "1 usuario" : E.usuarios + " usuarios"}` : `${n} · sin límite de usuarios`; };
const licIco = () => (typeof I !== "undefined" && I.info) || "";

// Umbral de aviso vigente (30, 15, 7, 1 para licencias; 7, 3, 1 para la prueba) o 0 si aún no toca
function licUmbral(E) { const U = LIC_UMBRALES[E.tipo]; if (!U) return 0; let u = 0; for (const t of U) if (E.diasRestantes <= t) u = t; return u; }
function licBannerHTML(hoyISO) {
  const E = licEstado(hoyISO), dest = licContratarURL(), ext = dest.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"';
  const activar = '<button class="link" data-act="ajustes">Activar licencia</button>';
  let txt = "", cls = "", cerrar = "";
  const u = licUmbral(E), visto = typeof DB !== "undefined" && DB.licencia && DB.licencia.avisoCerrado === `${E.tipo}:${E.hasta}:${u}`;
  if (u && !visto) cerrar = `<button class="lic-x" data-lic="cerrarAviso" data-u="${u}" aria-label="Cerrar el aviso">×</button>`;
  if (E.tipo === "prueba" && u && !visto) txt = `${E.diasRestantes === 1 ? "Hoy es el último día de prueba" : `Te quedan ${licDias(E.diasRestantes)} de prueba`}. Después, {{MARCA}} queda en solo lectura · ${activar}`;
  else if (E.tipo === "licencia" && u && !visto) { cls = u <= 7 ? " lic-pronto" : ""; txt = `${E.diasRestantes === 1 ? "Tu licencia vence hoy" : `Tu licencia vence el ${licFecha(E.hasta)} (en ${licDias(E.diasRestantes)})`}. Renuévala para seguir modificando y creando expedientes · <a class="link" href="${licEsc(dest)}"${ext}>Renovar</a>`; }
  else if (E.tipo === "caducada") {
    cls = " lic-fin";
    txt = `<b>Solo lectura.</b> ${E.origen === "prueba" ? "La prueba ha terminado." : `La licencia caducó el ${licFecha(E.hasta)}.`} Tus expedientes siguen aquí: puedes consultarlos, exportarlos, hacer copias y descargar PDF, pero no modificarlos ni crear otros. · ${activar}`;
  }
  return txt ? `<div class="infobar lic-banner${cls}" role="status"><span class="ico ${E.tipo === "caducada" ? "orange" : "gold"}">${licIco()}</span><span>${txt}</span>${cerrar}</div>` : "";
}

function licSeccionHTML(hoyISO) {
  const E = licEstado(hoyISO), dest = licContratarURL(), ext = dest.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"';
  const fila = (k, v) => `<div class="row"><span class="t"><b>${k}</b></span><span class="v">${v}</span></div>`;
  const tag = E.tipo === "licencia" ? '<span class="tag V">Activa</span>' : E.tipo === "prueba" ? '<span class="tag gold">En prueba</span>' : '<span class="tag P">Solo lectura</span>';
  let filas = fila("Estado", tag);
  if (E.origen === "licencia") {
    filas += fila("Plan", licEsc(licPlanTxt(E))) + fila("Despacho", licEsc(E.despacho)) + fila(E.tipo === "caducada" ? "Caducó el" : "Válida hasta", licEsc(licFecha(E.hasta))) + fila("Identificador", `<span class="lic-id">${licEsc(E.id)}</span>`);
  } else {
    filas += fila(E.tipo === "caducada" ? "La prueba terminó el" : "Prueba hasta", licEsc(licFecha(E.hasta))) + (E.tipo === "prueba" ? fila("Quedan", licDias(E.diasRestantes)) : "");
  }
  let aviso = "";
  const eq = typeof despachoCfg === "function" ? ((despachoCfg() || {}).abogados || []).length : 0;
  if (E.tipo === "licencia" && E.usuarios && eq > E.usuarios) aviso = `<p class="group-foot">El equipo tiene ${eq} miembros y el plan cubre ${E.usuarios}. Escríbenos si necesitas ampliarlo.</p>`;
  return `<div class="sectitle" id="lic-seccion">Licencia</div>
    <div class="group">${filas}</div>${aviso}
    <div class="group lic-form" style="margin-top:12px"><div class="field"><label for="lic-codigo">${E.origen === "licencia" ? "Código de licencia nuevo o renovado" : "Código de licencia"}</label><textarea id="lic-codigo" rows="3" placeholder="HRD1-…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><span class="hint">Pégalo tal como lo recibiste. Se comprueba en este equipo, sin conexión.</span></div>
      <div class="lic-acts"><button class="btn sm" data-act="licActivar">Activar</button><a class="btn sm gray" href="${licEsc(dest)}"${ext}>Contratar</a></div></div>
    <p class="group-foot">Sin licencia vigente, {{MARCA}} queda en solo lectura: puedes abrir y consultar todos los expedientes, imprimirlos y descargar sus PDF, exportarlos y hacer copias de seguridad, pero no modificarlos ni crear expedientes nuevos (tampoco importándolos). Tus datos nunca se bloquean ni se borran.</p>`;
}

// ── Solo lectura: acciones que modifican y red de seguridad ──
// Clics que crean o modifican expedientes: se cortan antes de que ui.js los procese (fase de captura).
// («nuevo», «nuevoFamilia», «ejemplos» y «duplicar» ya los corta ui.js con licPuedeCrear() y abre Ajustes)
const LIC_CLIC_EDICION = '[data-act="editar"],[data-act="simGuardar"],[data-act="addPersona"],[data-act="addBien"],[data-act="addMov"],[data-act="addNota"],[data-act="pIndiviso"],[data-act="pLotes"],[data-act="situ"],[data-act="deudas"],[data-palanca],[data-ej],[data-addp],[data-addb],[data-fase],[data-tst],[data-tset],[data-dm="cargar"],[data-famx="marcar"],[data-famrev]';
const LIC_RO = { base: null, aviso: 0, t: 0 };
const licSoloLectura = () => { try { return typeof DB !== "undefined" && !!DB.expedientes && !licPuedeEditar(); } catch (e) { return false; } };
function licAvisarRO(txt) { const t = Date.now(); if (t - LIC_RO.aviso < 3500) return; LIC_RO.aviso = t; if (typeof toast === "function") toast(txt || licMotivoEdicion()); }
// Huella de un expediente sin lo que no es «modificar» (bitácora, sellos, foto del cálculo, marcas de la carpeta)
const LIC_FUERA = new Set(["bitacora", "actualizado", "snap", "carpetaOpc", "carpetaFecha", "familiaPreparado"]);
const licHuellaX = (x) => { try { return JSON.stringify(x, (k, v) => (LIC_FUERA.has(k) ? undefined : v)); } catch (e) { return ""; } };
function licBase() { LIC_RO.base = { db: DB, x: new Map(DB.expedientes.filter((x) => x && x.id).map((x) => [x.id, { h: licHuellaX(x), copia: JSON.stringify(x) }])) }; }
// Compara con la foto de cuando empezó el modo solo lectura. Modificaciones de expedientes que existían: se deshacen.
// Expedientes nuevos: si aparecen dentro de un clic o una edición (síncrono) se quitan; si llegan después (restaurar una copia,
// siempre permitido) se aceptan. Si la base de datos entera se sustituye (restaurar «Reemplazar todo»), se toma una foto nueva.
function licRevisar(sincrono) {
  if (!licSoloLectura()) { LIC_RO.base = null; return; }
  if (!LIC_RO.base || LIC_RO.base.db !== DB) { licBase(); return; }
  const B = LIC_RO.base.x; let cambios = 0, nuevos = 0;
  DB.expedientes = DB.expedientes.filter((x) => {
    if (!x || !x.id) return true;
    if (!B.has(x.id)) { if (sincrono) { nuevos++; return false; } B.set(x.id, { h: licHuellaX(x), copia: JSON.stringify(x) }); return true; }
    return true;
  }).map((x) => { const b = x && B.get(x.id); if (b && licHuellaX(x) !== b.h) { cambios++; return JSON.parse(b.copia); } return x; });
  if (!cambios && !nuevos) return;
  if (typeof guardar === "function") guardar();
  if (typeof ui === "object" && ui.vista === "asist") { ui.vista = ui.id && DB.expedientes.some((x) => x.id === ui.id) ? "exp" : "inicio"; ui.borrador = null; }
  if (typeof render === "function") render();
  LIC_RO.aviso = 0; licAvisarRO(nuevos ? licMotivoBloqueo() : licMotivoEdicion());
}
function licVigilar() {
  if (typeof document === "undefined" || window.__licRO) return; window.__licRO = true;
  document.addEventListener("click", (e) => {
    if (!licSoloLectura()) return;
    const b = e.target.closest && e.target.closest(LIC_CLIC_EDICION);
    if (b && !b.closest(".pk")) { e.preventDefault(); e.stopImmediatePropagation(); licAvisarRO(b.matches('[data-act="nuevo"],[data-act="nuevoFamilia"],[data-act="ejemplos"],[data-act="duplicar"],[data-dm="cargar"],[data-ej]') ? licMotivoBloqueo() : ""); }
  }, true);
  // Tras cada interacción (aunque algún módulo corte la propagación) y, por si algo se guarda con retraso, cada 1,5 s
  for (const ev of ["click", "input", "change", "drop", "submit"]) window.addEventListener(ev, () => { if (licSoloLectura()) { if (!LIC_RO.base) licBase(); setTimeout(() => licRevisar(true), 0); } }, true);
  setInterval(() => licRevisar(false), 1500);
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest('[data-lic="cerrarAviso"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const E = licEstado(); licDatos().avisoCerrado = `${E.tipo}:${E.hasta}:${b.dataset.u}`; if (typeof guardar === "function") guardar(); b.closest(".lic-banner")?.remove(); }, true);
}
licVigilar();
