// ───────────────────── {{MARCA}} · búsqueda global de la paleta (prefijo bg/BG_) ─────────────────────
// Un solo cuadro (⌘K) que encuentra en toda la cartera: expedientes (cliente, causante, referencia), personas (nombre o NIF,
// también el del causante y el cliente), bienes (descripción, dirección, referencia catastral, IBAN), documentos archivados
// (nombre), trámites de cualquier expediente, tareas del despacho y anotaciones de la bitácora.
// Tolerante a acentos, mayúsculas, guiones y espacios («12345678-z» encuentra «12345678Z»; «garcia» encuentra «García»).
// El índice se construye al primer carácter y se reutiliza mientras no cambien los datos (AU.ver sube en cada guardado).
// API: bgIndice(expedientes, archivos, tramitesDe?) → índice · bgBuscar(q, índice, max, idActual) → [{ g, items }] (puro, probado en test.mjs)
//      bgGruposPaleta(q, idActual) → grupos con la forma de pkGrupos (paleta.js), con la acción de ir al sitio exacto.
const BG = { idx: null, clave: "" };
const BG_GRUPOS = [["exp", "Expedientes"], ["persona", "Personas"], ["bien", "Bienes"], ["doc", "Documentos"], ["tramite", "Trámites"], ["tarea", "Tareas"], ["nota", "Anotaciones"]];
const bgNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9Ñ]+/g, " ").trim();
const bgComp = (s) => bgNorm(s).replace(/ /g, "");
// 0 exacto · 1 empieza por · 2 cada palabra es prefijo de alguna palabra · 3 contiene · 9 nada
function bgScore(qn, texto) {
  const t = bgNorm(texto); if (!t || !qn) return 9;
  if (t === qn) return 0;
  if (t.startsWith(qn)) return 1;
  const tw = t.split(" "), qw = qn.split(" ");
  if (qw.every((w) => tw.some((x) => x.startsWith(w)))) return 2;
  if (t.includes(qn)) return 3;
  return 9;
}
// Códigos (NIF, referencia catastral, IBAN, referencia del expediente): se comparan sin espacios ni guiones
function bgScoreCod(qc, cod) {
  const c = bgComp(cod); if (!c || qc.length < 3) return 9;
  if (c === qc) return 0;
  if (c.startsWith(qc)) return 1;
  if (qc.length >= 4 && c.includes(qc)) return 3;
  return 9;
}

// ── Índice: una entrada por cosa encontrable ──
// e = { g, id, xId, t (título), sub, campos: [texto], cods: [código], ir: { … destino … } }
function bgIndice(xs, archivos, tramites) {
  const L = [];
  const nombre = (x) => (x.despacho?.cliente || x.nombre || "Herencia sin nombre");
  const relN = (k) => (typeof RELACIONES === "object" && RELACIONES[k] ? RELACIONES[k].label : k || "Persona");
  for (const x of xs || []) {
    const ref = x.despacho?.ref || "", sx = [ref, x.nombre && x.despacho?.cliente ? "Herencia de " + x.nombre : ""].filter(Boolean).join(" · ");
    L.push({ g: "exp", id: x.id, xId: x.id, t: nombre(x), sub: sx, campos: [x.despacho?.cliente, x.nombre, ref], cods: [ref], ir: { exp: x.id } });
    if (x.nombre) L.push({ g: "persona", id: "c:" + x.id, xId: x.id, t: x.nombre, sub: `Causante${x.nifCausante ? " · " + x.nifCausante : ""} · ${ref || nombre(x)}`, campos: [x.nombre], cods: [x.nifCausante], ir: { exp: x.id } });
    const esCliente = (n) => !!n && bgNorm(n) === bgNorm(x.despacho?.cliente);
    if (x.despacho?.cliente && !esCliente(x.nombre) && !(x.personas || []).some((p) => esCliente(p.nombre))) L.push({ g: "persona", id: "k:" + x.id, xId: x.id, t: x.despacho.cliente, sub: `Cliente${x.despacho.nif ? " · " + x.despacho.nif : ""} · ${ref || nombre(x)}`, campos: [x.despacho.cliente, x.despacho.email, x.despacho.tel], cods: [x.despacho.nif], ir: { exp: x.id, sec: "despacho", sub: "encargo" } });
    for (const p of x.personas || []) L.push({ g: "persona", id: p.id, xId: x.id, t: p.nombre || relN(p.relacion), sub: `${relN(p.relacion)}${esCliente(p.nombre) ? " y cliente" : ""}${p.nif ? " · " + p.nif : ""}${p.renuncia ? " · renuncia" : ""} · ${ref || nombre(x)}`, campos: [p.nombre, p.domicilio], cods: [p.nif], ir: { exp: x.id, sec: "herencia", persona: p.id } });
    for (const b of x.bienes || []) L.push({ g: "bien", id: b.id, xId: x.id, t: b.descripcion || (typeof TIPO_BIEN === "object" && TIPO_BIEN[b.tipo] ? TIPO_BIEN[b.tipo][0] : "Bien"), sub: [b.refCatastral ? "Ref. catastral " + b.refCatastral : "", b.entidad || "", ref || nombre(x)].filter(Boolean).join(" · "), campos: [b.descripcion, b.direccion, b.entidad, b.municipio && b.municipio !== "OTRO" ? b.municipio : ""], cods: [b.refCatastral, b.iban], ir: { exp: x.id, sec: "herencia", bien: b.id } });
    for (const t of x.tareasDespacho || []) L.push({ g: "tarea", id: t.id, xId: x.id, t: t.titulo, sub: `${t.hecha ? "Hecha" : t.fecha ? "Para el " + t.fecha.split("-").reverse().join("/") : "Sin fecha"} · ${ref || nombre(x)}`, campos: [t.titulo], cods: [], ir: { exp: x.id, sec: "tramites" } });
    for (const n of (x.bitacora || []).filter((b) => b && b.tipo === "nota").slice(0, 60)) L.push({ g: "nota", id: n.t, xId: x.id, t: n.texto, sub: `${String(n.t).slice(0, 10).split("-").reverse().join("/")} · ${ref || nombre(x)}`, campos: [n.texto], cods: [], contiene: true, ir: { exp: x.id, sec: "despacho", sub: "actividad" } });
    if (tramites) { let T = []; try { T = tramites(x) || []; } catch (e) { T = []; } for (const t of T) L.push({ g: "tramite", id: t.id, xId: x.id, t: t.titulo, sub: `${t.st === "hecho" ? "Hecho" : t.st === "na" ? "No aplica" : t.limite ? "Plazo " + t.limite.split("-").reverse().join("/") : "Pendiente"}${t.organismo ? " · " + t.organismo : ""} · ${ref || nombre(x)}`, campos: [t.titulo, t.organismo], cods: [], ir: { exp: x.id, sec: "tramites", tramite: t.id } }); }
  }
  for (const d of archivos || []) { const x = (xs || []).find((q) => q.id === d.expId); if (!x) continue; L.push({ g: "doc", id: d.id, xId: x.id, t: d.nombre, sub: `${d.fecha ? String(d.fecha).slice(0, 10).split("-").reverse().join("/") + " · " : ""}${x.despacho?.ref || nombre(x)}`, campos: [d.nombre], cods: [], ir: { exp: x.id, sec: "documentos", archivo: d.id } }); }
  return L;
}
function bgBuscar(q, idx, max = 6, actual = null) {
  const qn = bgNorm(q), qc = qn.replace(/ /g, "");
  if (!qn) return [];
  const R = [];
  for (const e of idx) {
    let s = 9;
    if (e.contiene) { if (qn.length >= 3 && bgNorm(e.t).includes(qn)) s = 3; }
    else { for (const c of e.campos) if (c) s = Math.min(s, bgScore(qn, c)); }
    for (const c of e.cods) if (c) s = Math.min(s, bgScoreCod(qc, c));
    if (e.g === "tramite" && qn.length < 3) s = 9; // los trámites se repiten en cada expediente: solo con una consulta concreta
    if (s < 9 && actual && e.xId === actual && e.g !== "exp") s -= 0.5; // lo del expediente abierto, primero
    if (s < 9) R.push({ ...e, s });
  }
  const G = [];
  for (const [g, n] of BG_GRUPOS) {
    const L = R.filter((r) => r.g === g).sort((a, b) => a.s - b.s || a.t.localeCompare(b.t, "es"));
    if (L.length) G.push({ g, n, total: L.length, best: L[0].s, items: L.slice(0, max) });
  }
  return G;
}

// ── Puente con la paleta ──
function bgIndiceApp() {
  const A = typeof ARCH === "object" && ARCH.listo ? ARCH.lista : [];
  const clave = `${typeof AU === "object" ? AU.ver : 0}|${DB.expedientes.length}|${A.length}|${hoy()}`;
  if (BG.idx && BG.clave === clave) return BG.idx;
  BG.idx = bgIndice(DB.expedientes, A, (x) => (x.fecha ? tramitesExp(x, calcular(x)) : []));
  BG.clave = clave;
  return BG.idx;
}
function bgIr(ir) {
  const x = DB.expedientes.find((q) => q.id === ir.exp); if (!x) return;
  if (typeof pkVisitar === "function") pkVisitar(x.id);
  const v = { vista: "exp", id: x.id, sec: ir.sec || "resumen", sheet: null };
  if (ir.sub) v.sub = ir.sub;
  if (ir.persona) v.sheet = { tipo: "persona", id: ir.persona };
  if (ir.bien) v.sheet = { tipo: "bien", id: ir.bien };
  if (ir.tramite) { v.sheet = { tipo: "tramite", id: ir.tramite }; v.tv = "lista"; }
  if (ir.archivo) { v.sheet = { tipo: "fver", id: ir.archivo }; v.dsub = "archivo"; }
  go(v);
}
const BG_ICO = () => ({ exp: I.folder, persona: I.person, bien: I.house, doc: I.doc, tramite: I.list, tarea: I.tick, nota: I.info });
// Grupos con la forma de la paleta: [{ g, items: [{ s, t, sub, ico, hint, run }], orden, best }]
function bgGruposPaleta(q, actual) {
  const ico = BG_ICO();
  return bgBuscar(q, bgIndiceApp(), 6, actual).map((G, i) => ({ g: G.total > G.items.length ? `${G.n} · ${G.items.length} de ${G.total}` : G.n, orden: 3 + i * 0.1, best: G.best + 0.1, items: G.items.map((e) => ({ s: e.s + 0.1, t: e.t, sub: e.sub, ico: ico[e.g] || I.doc, hint: e.g === "exp" ? "Abrir" : "Ir", run: () => bgIr(e.ir) })) }));
}
