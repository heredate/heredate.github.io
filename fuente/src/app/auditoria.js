// ───────────────────── {{MARCA}} · auditoría de cambios en datos críticos (prefijo au/AU_) ─────────────────────
// Quién, cuándo y qué cambió, con el valor anterior y el nuevo, en lo que tiene consecuencias jurídicas o económicas:
// porcentajes, parentesco, NIF y renuncias de los herederos; valor y titularidad de los bienes; adjudicaciones de la
// partición; fase y responsable; honorarios; movimientos de fondos; estado de la documentación.
// Cómo: en cada guardado (sgGuardar) se compara una «foto» de esos campos con la del guardado anterior y las diferencias
// se apuntan en el expediente. Así se recoge cualquier vía de cambio (fichas, partición, asistente, lector de documentos,
// acciones masivas) sin tocar cada manejador de ui.js. Lo que se escribe seguido en un campo se agrupa en una entrada.
// Guardado: x.auditoria = [{ t, u, k, o, c, a, d, f }] (la más reciente primero, máx. AU_MAX):
//   t fecha ISO · u usuario (despachoCfg().yo) · k tipo de dato (AU_TIPOS) · o objeto («Ana López (hija)») · c campo
//   a valor anterior · d valor nuevo (textos legibles) · f clave interna del campo (para agrupar).
// Entra en la exportación del expediente (va dentro de x) y en la copia de seguridad.
// Límite honesto: vive en el navegador del despacho, como el propio expediente; no es un registro sellado por un tercero.
const AU_MAX = 500;
const AU_AGRUPAR_MS = 10 * 60 * 1000; // cambios seguidos del mismo campo por la misma persona: una sola entrada
const AU_TIPOS = [["herederos", "Herederos"], ["bienes", "Bienes"], ["particion", "Partición"], ["expediente", "Expediente"], ["honorarios", "Honorarios"], ["fondos", "Fondos"], ["documentos", "Documentos"]];
const AU = { base: null, ver: 0 };
const auNum = (v) => (typeof num === "function" ? num(v) : Number(v) || 0); // «250.000» son 250.000 €, no 250
const auTipoN = (k) => (AU_TIPOS.find((t) => t[0] === k) || [k, k])[1];

// ── Formato (en la app usa las funciones globales; en las pruebas se pasa uno propio) ──
function auFmt() {
  const g = (f, d) => (typeof f === "function" ? f : d);
  const memo = new WeakMap(); // títulos de la documentación: una vez por expediente y guardado
  const grpF = g(typeof grp === "function" ? grp : null, (n, d) => Number(n).toFixed(d));
  return {
    eur: (n) => grpF(auNum(n), 2) + " €",
    pct: (n) => grpF(auNum(n), 2).replace(/,00$/, "") + " %",
    fecha: (s) => (s && typeof fechaCorta === "function" ? fechaCorta(s) : s || ""),
    rel: (k) => (typeof RELACIONES === "object" && RELACIONES[k] ? RELACIONES[k].label : k || ""),
    fase: (k) => (typeof faseN === "function" ? faseN(k) : k || ""),
    abogado: (id) => (id && typeof abogado === "function" ? abogado(id)?.nombre || "Persona dada de baja" : id ? id : "Sin asignar"),
    terr: (k) => (k && typeof nombreTerr === "function" ? nombreTerr(k) : k || ""),
    tipoBien: (k) => (typeof TIPO_BIEN === "object" && TIPO_BIEN[k] ? TIPO_BIEN[k][0] : k || "Bien"),
    mov: (k) => (typeof MOV_T === "object" && MOV_T[k] ? MOV_T[k][0] : k || "Movimiento"),
    doc: (x, id) => { try { let L = memo.get(x); if (!L) { L = typeof docsNecesarios === "function" ? docsNecesarios(x) : []; memo.set(x, L); } const d = L.find((q) => q[0] === id); return d ? d[1] : id; } catch (e) { return id; } },
    archivos: (xid) => { try { return typeof ARCH === "object" && ARCH.listo ? ARCH.lista.filter((d) => d.expId === xid) : null; } catch (e) { return null; } },
    estadoArch: (k) => (typeof ARCH_ESTADOS === "object" ? (ARCH_ESTADOS.find((e) => e[0] === (k || "recibido")) || [k, k])[1] : k || "Recibido"),
  };
}
const AU_TEST = { no: "Sin testamento", usufructo: "Testamento: usufructo al cónyuge", porcentajes: "Testamento con porcentajes", nose: "Testamento por confirmar" };
const AU_TIT = { privativo: "Privativo", ganancial: "Ganancial", proindiviso: "Una parte (pro indiviso)" };
const AU_HON = { fijo: "Importe cerrado", pct: "% del caudal" };

// Valor normalizado para comparar: «40», 40 y «40,0» son lo mismo; vacío, null y false también
function auNorm(v, tipo) {
  if (tipo === "b") return v ? "1" : "";
  if (v == null || v === "") return "";
  if (tipo === "n") { const n = auNum(v); return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : String(v).trim(); }
  return String(v).trim();
}

// ── Foto de los campos críticos de un expediente: { clave: { k, o, c, v, s, e } } ──
// Las claves de presencia («P:id», «B:id», «M:id») marcan altas y bajas de personas, bienes y movimientos.
function auFoto(x, F) {
  F = F || auFmt();
  const f = {};
  const put = (key, k, o, c, raw, tipo, mostrar, vacio) => {
    const v = auNorm(raw, tipo);
    f[key] = { k, o, c, v, s: v === "" ? vacio || "—" : mostrar ? mostrar(raw) : String(raw).trim(), e: vacio || "—" };
  };
  const pers = (id) => { const p = (x.personas || []).find((q) => q.id === id); return p ? p.nombre || F.rel(p.relacion) : id ? "Persona quitada" : ""; };
  // Expediente
  const oX = "Expediente";
  put("X.fase", "expediente", oX, "Fase", x.fase || "encargo", "t", F.fase);
  put("X.responsable", "expediente", oX, "Responsable", x.responsable, "t", F.abogado, "Sin asignar");
  put("X.testamento", "herederos", oX, "Tipo de sucesión", x.testamento, "t", (k) => AU_TEST[k] || k);
  put("X.fecha", "expediente", oX, "Fecha de fallecimiento", x.fecha, "t", F.fecha);
  put("X.ccaa", "expediente", oX, "Normativa del impuesto", x.ccaa, "t", F.terr);
  // Herederos y demás personas
  for (const p of x.personas || []) {
    const o = `${p.nombre || "Sin nombre"} (${F.rel(p.relacion).toLowerCase()})`, b = "P:" + p.id;
    put(b, "herederos", o, "Alta", "1", "t", () => o);
    put(b + ".nombre", "herederos", o, "Nombre", p.nombre, "t");
    put(b + ".nif", "herederos", o, "NIF", p.nif, "t");
    put(b + ".relacion", "herederos", o, "Parentesco", p.relacion, "t", F.rel);
    put(b + ".pct", "herederos", o, "Porcentaje en el testamento", p.pct, "n", F.pct);
    put(b + ".renuncia", "herederos", o, "Renuncia a la herencia", p.renuncia, "b", () => "Renuncia", "No renuncia");
    if (p.relacion === "conyuge") put(b + ".separado", "herederos", o, "Separado legalmente o de hecho", p.separado, "b", () => "Sí", "No");
  }
  // Bienes y partición
  for (const bn of x.bienes || []) {
    const o = bn.descripcion || F.tipoBien(bn.tipo), b = "B:" + bn.id;
    put(b, "bienes", o, "Alta", "1", "t", () => `${o}${num(bn.valor) ? " · " + F.eur(bn.valor) : ""}`);
    put(b + ".valor", "bienes", o, "Valor", bn.valor, "n", F.eur);
    put(b + ".valorReferencia", "bienes", o, "Valor de referencia", bn.valorReferencia, "n", F.eur);
    put(b + ".titularidad", "bienes", o, "Titularidad", bn.titularidad || "privativo", "t", (k) => AU_TIT[k] || k);
    if ((bn.titularidad || "") === "proindiviso") put(b + ".porcentaje", "bienes", o, "Porcentaje del causante", bn.porcentaje, "n", F.pct);
    put(b + ".legatarioId", "particion", o, "Legado a", bn.legatarioId, "t", pers, "No es legado");
    put(b + ".adjudicadoA", "particion", o, "Adjudicación", bn.adjudicadoA, "t", pers, "Pro indiviso");
  }
  // Honorarios
  const d = x.despacho || {};
  put("H.honModo", "honorarios", "Honorarios", "Forma de cálculo", d.honModo || "fijo", "t", (k) => AU_HON[k] || k);
  put("H.honFijo", "honorarios", "Honorarios", "Importe cerrado (sin IVA)", d.honFijo, "n", F.eur);
  put("H.honPct", "honorarios", "Honorarios", "Porcentaje sobre el caudal", d.honPct, "n", F.pct);
  put("H.honMin", "honorarios", "Honorarios", "Mínimo", d.honMin, "n", F.eur);
  // Movimientos de fondos
  for (const m of d.movs || []) {
    const o = `${F.mov(m.tipo)}${m.concepto && m.concepto !== F.mov(m.tipo) ? " · " + m.concepto : ""}`, b = "M:" + m.id;
    put(b, "fondos", o, "Alta", "1", "t", () => `${F.eur(m.importe)} · ${F.fecha(m.fecha)}`);
    put(b + ".importe", "fondos", o, "Importe", m.importe, "n", F.eur);
    put(b + ".tipo", "fondos", o, "Tipo", m.tipo, "t", F.mov);
  }
  // Documentación recibida (lista de la familia) y estado de los documentos archivados
  for (const [id, on] of Object.entries(d.docs || {})) put("D:" + id, "documentos", F.doc(x, id), "Documentación", on, "b", () => "Recibido", "Pendiente");
  const A = F.archivos ? F.archivos(x.id) : null;
  if (A) for (const a of A) put("A:" + a.id, "documentos", a.nombre || "Documento", "Estado", a.estado || "recibido", "t", F.estadoArch);
  return f;
}

// ── Diferencias entre dos fotos → [{ k, o, c, a, d, f }] ──
function auDiff(A, B) {
  const out = [], altas = new Set(), bajas = new Set();
  const esPres = (key) => /^[PBM]:[^.]+$/.test(key);
  const padre = (key) => key.split(".")[0];
  for (const key of Object.keys(B)) if (!(key in A) && esPres(key)) { altas.add(key); out.push({ k: B[key].k, o: B[key].o, c: "Alta", a: "", d: B[key].s, f: key }); }
  for (const key of Object.keys(A)) if (!(key in B) && esPres(key)) { bajas.add(key); out.push({ k: A[key].k, o: A[key].o, c: "Baja", a: A[key].s, d: "", f: key }); }
  for (const key of Object.keys(B)) {
    if (esPres(key) || altas.has(padre(key))) continue;
    const b = B[key], a = A[key];
    if (!a) { if (key.startsWith("A:")) continue; if (b.v === "") continue; out.push({ k: b.k, o: b.o, c: b.c, a: b.e, d: b.s, f: key }); continue; }
    if (a.v !== b.v) out.push({ k: b.k, o: b.o, c: b.c, a: a.s, d: b.s, f: key });
  }
  for (const key of Object.keys(A)) {
    if (key in B || esPres(key) || bajas.has(padre(key)) || key.startsWith("A:")) continue;
    const a = A[key]; if (a.v === "") continue;
    out.push({ k: a.k, o: a.o, c: a.c, a: a.s, d: a.e, f: key });
  }
  return out;
}

// ── Apuntar en el expediente (agrupando lo escrito seguido y acotando el tamaño) ──
function auRegistrar(x, cambios, u, t) {
  if (!x || !cambios || !cambios.length) return 0;
  x.auditoria = Array.isArray(x.auditoria) ? x.auditoria : [];
  const L = x.auditoria, ms = Date.parse(t);
  let n = 0;
  for (const c of cambios) {
    // El nombre que se teclea justo después de dar de alta a una persona forma parte del alta
    if (c.c === "Nombre") { const pk = c.f.split(".")[0], j = L.slice(0, 40).findIndex((e) => e.f === pk && e.c === "Alta" && e.u === u && ms - Date.parse(e.t) <= AU_AGRUPAR_MS); if (j >= 0) { L[j].o = c.o; L[j].d = c.o; continue; } }
    const i = L.slice(0, 40).findIndex((e) => e.f === c.f && e.u === u && ms - Date.parse(e.t) <= AU_AGRUPAR_MS);
    if (i >= 0 && c.c !== "Alta" && c.c !== "Baja" && L[i].c !== "Alta" && L[i].c !== "Baja") {
      const e = L[i];
      if (e.a === c.d) { L.splice(i, 1); continue; } // vuelve al valor de partida: no queda nada que contar
      e.d = c.d; e.o = c.o; e.t = t; L.splice(i, 1); L.unshift(e); n++; continue;
    }
    L.unshift({ t, u, k: c.k, o: c.o, c: c.c, a: c.a, d: c.d, f: c.f }); n++;
  }
  if (L.length > AU_MAX) L.length = AU_MAX;
  return n;
}

// ── Enganche con el guardado: toda escritura en disco pasa antes por aquí ──
function auFotoTodos() { const m = new Map(), F = auFmt(); for (const x of (typeof DB === "object" && DB.expedientes) || []) { try { m.set(x.id, auFoto(x, F)); } catch (e) {} } return m; }
function auIniciar() { if (!AU.base) AU.base = auFotoTodos(); }
function auSincronizar() {
  if (typeof DB !== "object" || !DB || !Array.isArray(DB.expedientes)) return;
  if (!AU.base) { AU.base = auFotoTodos(); return; } // primer guardado tras abrir: se toma como punto de partida
  const F = auFmt(), nueva = new Map(), t = new Date().toISOString();
  let u = ""; try { u = despachoCfg().yo || ""; } catch (e) {}
  for (const x of DB.expedientes) {
    let f; try { f = auFoto(x, F); } catch (e) { continue; }
    nueva.set(x.id, f);
    const antes = AU.base.get(x.id); if (!antes) continue; // expediente nuevo o importado: su historia empieza aquí
    try { const c = auDiff(antes, f); if (c.length) auRegistrar(x, c, u, t); } catch (e) { console.error(e); }
  }
  AU.base = nueva; AU.ver++;
}
if (typeof sgGuardar === "function") {
  const auSgOriginal = sgGuardar;
  // eslint-disable-next-line no-func-assign
  sgGuardar = function () {
    try { const bloq = (typeof SG === "object" && SG.bloqueado) || (typeof DB_BLOQUEO !== "undefined" && DB_BLOQUEO); if (!bloq) auSincronizar(); } catch (e) { console.error(e); }
    return auSgOriginal.apply(this, arguments);
  };
}
// La conciliación automática de documentos y trámites (docTramReconciliar, ui.js, al abrir un expediente) no es un cambio
// de nadie: lo que marque se toma como nuevo punto de partida de la documentación de ese expediente, sin apuntarlo.
if (typeof docTramReconciliar === "function") {
  const auRecOriginal = docTramReconciliar;
  // eslint-disable-next-line no-func-assign
  docTramReconciliar = function (x) {
    const antes = x && x.despacho && x.despacho.docs ? JSON.stringify(x.despacho.docs) : "";
    const r = auRecOriginal.apply(this, arguments);
    try {
      const b = AU.base && x ? AU.base.get(x.id) : null;
      if (b && (x.despacho && x.despacho.docs ? JSON.stringify(x.despacho.docs) : "") !== antes) {
        const f = auFoto(x);
        for (const k of Object.keys(b)) if (k.startsWith("D:")) delete b[k];
        for (const k of Object.keys(f)) if (k.startsWith("D:")) b[k] = f[k];
      }
    } catch (e) {}
    return r;
  };
}

// ── Vista: lista con filtros (en Despacho › Actividad para todo el despacho y en el expediente para el suyo) ──
function auEntradas(xs) {
  const L = [];
  for (const x of xs) for (const e of Array.isArray(x.auditoria) ? x.auditoria : []) L.push({ ...e, x });
  return L.sort((a, b) => String(b.t).localeCompare(String(a.t)));
}
function auFiltrar(L, f, ahora) {
  f = f || {};
  const q = typeof pkNorm === "function" ? pkNorm(f.q || "") : String(f.q || "").toUpperCase();
  const desde = f.p && f.p !== "todo" ? new Date((ahora || Date.now()) - Number(f.p) * 864e5).toISOString() : "";
  return L.filter((e) => (!f.u || (e.u || "none") === f.u) && (!f.k || e.k === f.k) && (!desde || e.t >= desde) &&
    (!q || (typeof pkNorm === "function" ? pkNorm : (s) => String(s).toUpperCase())([e.o, e.c, e.a, e.d, e.x ? e.x.despacho?.ref : "", e.x ? (typeof nombreExp === "function" ? nombreExp(e.x) : e.x.nombre) : ""].join(" ")).includes(q)));
}
function auHora(iso) { const d = new Date(iso); return (iso.slice(0, 10) === hoy() ? "Hoy" : fechaCorta(iso.slice(0, 10))) + " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); }
function auFiltrosHTML(f, conExp) {
  const D = despachoCfg();
  return `<div class="au-f" role="group" aria-label="Filtrar cambios">
    <div class="search au-q">${I.search}<input data-auf="q" value="${esc(f.q || "")}" placeholder="${conExp ? "Expediente, persona, bien o valor" : "Persona, bien, campo o valor"}" autocomplete="off" aria-label="Buscar en los cambios"></div>
    <select data-auf="u" aria-label="Quién"><option value="">Todo el equipo</option>${D.abogados.map((a) => `<option value="${esc(a.id)}" ${f.u === a.id ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}<option value="none" ${f.u === "none" ? "selected" : ""}>Sin usuario</option></select>
    <select data-auf="k" aria-label="Tipo de dato"><option value="">Todos los datos</option>${AU_TIPOS.map(([k, n]) => `<option value="${k}" ${f.k === k ? "selected" : ""}>${n}</option>`).join("")}</select>
    <select data-auf="p" aria-label="Periodo">${[["todo", "Siempre"], ["1", "Últimas 24 horas"], ["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["90", "Últimos 90 días"]].map(([k, n]) => `<option value="${k}" ${(f.p || "todo") === k ? "selected" : ""}>${n}</option>`).join("")}</select>
  </div>`;
}
function auTablaHTML(L, conExp, max) {
  if (!L.length) return `<div class="card empty"><b>Sin cambios que mostrar</b>Los cambios en herederos, bienes, partición, fase, honorarios, fondos y documentos aparecen aquí con quién los hizo y el valor anterior.</div>`;
  const V = L.slice(0, max);
  return `<div class="tablewrap card" style="padding:0"><table class="grid-t au-t"><thead><tr><th>Cuándo</th><th>Quién</th>${conExp ? "<th>Expediente</th>" : ""}<th>Dato</th><th>Antes</th><th>Después</th></tr></thead><tbody>
    ${V.map((e) => `<tr ${conExp ? `data-open="${esc(e.x.id)}"` : ""}><td class="mono au-w">${esc(auHora(e.t))}</td><td>${typeof avatar === "function" ? avatar(e.u) : ""}</td>${conExp ? `<td><b>${esc(e.x.despacho?.ref || "")}</b><small>${esc(nombreExp(e.x))}</small></td>` : ""}<td><span class="au-k">${esc(auTipoN(e.k))}</span><b>${esc(e.o)}</b><small>${esc(e.c)}</small></td><td class="au-a">${esc(e.a || "—")}</td><td class="au-d">${esc(e.d || "—")}</td></tr>`).join("")}
  </tbody></table></div>${L.length > max ? `<button class="rd-more" data-au="mas">Ver ${Math.min(200, L.length - max)} más (${L.length - max} en total)</button>` : ""}`;
}
// Despacho › Actividad: todos los expedientes
function auDespachoHTML() {
  const f = ui.auf || {}, max = ui.aumax || 100;
  const L = auFiltrar(auEntradas(DB.expedientes || []), f);
  return `${auFiltrosHTML(f, true)}<div class="sectitle flex"><b>Cambios en datos críticos</b><span>${plural(L.length, "cambio")}${L.length ? ` · <button class="link" data-au="csv">Descargar (CSV)</button>` : ""}</span></div>${auTablaHTML(L, true, max)}
    <p class="foot-note">Se registra quién (el usuario elegido en «Soy»), cuándo y el valor anterior de cada dato crítico. El registro viaja con el expediente al exportarlo y en las copias de seguridad. Vive en este equipo, como el resto de los datos: no es un sello de tiempo de un tercero.</p>`;
}
// Expediente › Encargo y honorarios › Actividad: solo el suyo
function auExpHTML(x) {
  const f = ui.aufx || {}, max = ui.aumax || 100;
  const L = auFiltrar(auEntradas([x]), f);
  const total = Array.isArray(x.auditoria) ? x.auditoria.length : 0;
  return `<div class="sectitle flex"><b>Cambios en datos críticos</b><span>${plural(total, "cambio")}</span></div>${total ? auFiltrosHTML(f, false).replace(/data-auf=/g, "data-aufx=") : ""}${auTablaHTML(L, false, max)}`;
}
function auCSV() {
  const L = auFiltrar(auEntradas(DB.expedientes || []), ui.auf || {});
  const c = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const filas = [["Fecha", "Usuario", "Referencia", "Expediente", "Tipo", "Objeto", "Campo", "Antes", "Después"], ...L.map((e) => [e.t, e.u ? abogado(e.u)?.nombre || e.u : "", e.x.despacho?.ref || "", nombreExp(e.x), auTipoN(e.k), e.o, e.c, e.a, e.d])];
  descargar(`Registro de cambios - ${hoy()}.csv`, new Blob(["﻿" + filas.map((r) => r.map(c).join(";")).join("\r\n")], { type: "text/csv" }));
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest("[data-au]") : null; if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.au === "mas") { ui.aumax = (ui.aumax || 100) + 200; render(); }
    if (b.dataset.au === "csv") auCSV();
  }, true);
  const auCampo = (e) => {
    const t = e.target; if (!t || !t.dataset || (t.dataset.auf == null && t.dataset.aufx == null)) return;
    e.stopPropagation();
    const k = t.dataset.auf != null ? "auf" : "aufx", c = t.dataset.auf ?? t.dataset.aufx;
    ui[k] = { ...(ui[k] || {}), [c]: t.value }; ui.aumax = 100;
    if (e.type === "input" && c === "q") { const pos = t.selectionStart; render(); const n = document.querySelector(`[data-${k}="q"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} } return; }
    if (e.type === "change" && c !== "q") render();
  };
  document.addEventListener("input", auCampo, true);
  document.addEventListener("change", auCampo, true);
}
