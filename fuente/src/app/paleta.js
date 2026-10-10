// ───────────────────── Paleta de comandos (⌘K / Ctrl+K) · Piloto 7 ─────────────────────
// Un solo cuadro desde el que el abogado va a cualquier sitio y hace cualquier cosa escribiendo.
// API: pkAbrir(modo?) · pkCerrar() · pkAbierta() · pkVisitar(id) · pkBotonHTML() · pkClick(dataset)
// La paleta vive en document.body (fuera de #app): sobrevive a render(). Antes de ejecutar una acción se cierra.
// Recientes: DB.recientes (ids de expedientes, el más reciente primero, máx. 8). Los mantiene pkVisitar(id),
// que llama go() al abrir un expediente (cableado del integrador); si está vacío se deduce de la bitácora.
const PK_MAX = 8;
const PK_I = {
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  keys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 5v14l11-7z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};
const PK = { abierta: false, modo: "buscar", q: "", sel: 0, items: [], root: null, foco: null, vv: null };

// ── Texto: sin acentos, en mayúsculas, conservando dígitos (las referencias llevan números) ──
const pkNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
// Puntuación: 0 exacto · 1 empieza por · 2 cada palabra de la consulta es prefijo de una palabra del texto · 3 contiene · 9 no coincide
function pkScore(qn, texto) {
  const t = pkNorm(texto); if (!t || !qn) return 9;
  if (t === qn) return 0;
  if (t.startsWith(qn)) return 1;
  const tw = t.split(" "), qw = qn.split(" ");
  if (qw.every((w) => tw.some((x) => x.startsWith(w)))) return 2;
  if (t.includes(qn)) return 3;
  return 9;
}
// Mejor puntuación de una lista de campos; devuelve {s, campo}
function pkMejor(qn, campos) {
  let best = { s: 9, i: -1 };
  campos.forEach((c, i) => { const s = pkScore(qn, c); if (s < best.s) best = { s, i }; });
  return best;
}
// Resalta el prefijo coincidente de cada palabra (sobre texto ya escapado)
function pkMarca(texto, qn) {
  if (!qn) return esc(texto);
  const qw = qn.split(" ").filter(Boolean);
  return String(texto || "").split(/(\s+)/).map((w) => {
    if (!w.trim()) return esc(w);
    const n = pkNorm(w); if (!n || n.includes(" ")) return esc(w);
    const hit = qw.find((x) => n.startsWith(x));
    if (!hit) return esc(w);
    return `<mark class="pk-m">${esc(w.slice(0, hit.length))}</mark>${esc(w.slice(hit.length))}`;
  }).join("");
}

// ── Calculadora: dígitos, + − × ÷ * / ( ) % y coma o punto decimal («250.000,50» y «1.5» se entienden) ──
function pkCalc(q) {
  const s = String(q || "").trim().replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
  if (!/^[\d.,+\-*/()%]+$/.test(s) || !/\d/.test(s)) return null;
  if (!/[+\-*/%()]/.test(s)) return null; // un número solo no es una operación
  const num = (t) => { // «1.250,5» → 1250.5 · «1.5» → 1.5 · «1.500» → 1500
    if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
    const p = t.split("."); if (p.length === 1) return Number(t);
    if (p.slice(1).every((g) => g.length === 3) && p[0].length <= 3) return Number(p.join(""));
    return p.length === 2 ? Number(t) : NaN;
  };
  let i = 0;
  const peek = () => s[i], eat = () => s[i++];
  function factor() {
    let v;
    if (peek() === "(") { eat(); v = expr(); if (peek() !== ")") throw 0; eat(); }
    else if (peek() === "-") { eat(); v = -factor(); }
    else if (peek() === "+") { eat(); v = factor(); }
    else { let j = i; while (j < s.length && /[\d.,]/.test(s[j])) j++; if (j === i) throw 0; v = num(s.slice(i, j)); i = j; if (Number.isNaN(v)) throw 0; }
    while (peek() === "%") { eat(); v = v / 100; }
    return v;
  }
  function term() { let v = factor(); while (peek() === "*" || peek() === "/") { const o = eat(); const r = factor(); v = o === "*" ? v * r : v / r; } return v; }
  function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const o = eat(); const r = term(); v = o === "+" ? v + r : v - r; } return v; }
  try { const v = expr(); if (i !== s.length || !Number.isFinite(v)) return null; return v; } catch { return null; }
}
const pkNumTxt = (v) => { const d = Math.abs(v - Math.round(v)) < 1e-9 ? 0 : Math.abs(v * 100 - Math.round(v * 100)) < 1e-7 ? 2 : 4; return grp(v, d); };

// ── Recientes ──
function pkVisitar(id) {
  if (!id) return;
  DB.recientes = [id, ...(DB.recientes || []).filter((q) => q !== id)].slice(0, 8);
  guardar();
}
function pkRecientes(n = 5) {
  const ids = (DB.recientes || []).filter((id) => DB.expedientes.some((x) => x.id === id));
  if (ids.length) return ids.slice(0, n).map((id) => DB.expedientes.find((x) => x.id === id));
  const ult = (x) => (x.bitacora || []).reduce((m, e) => (e.t > m ? e.t : m), x.creado || "");
  return [...DB.expedientes].sort((a, b) => ult(b).localeCompare(ult(a))).slice(0, n);
}

// ── Puente con los manejadores de ui.js: botón temporal con el dataset indicado, dentro de #app ──
function pkClick(ds) {
  const b = document.createElement("button"); b.type = "button"; b.hidden = true;
  for (const [k, v] of Object.entries(ds)) b.dataset[k] = v;
  $app.appendChild(b); b.click(); b.remove();
}
const pkIrExp = (id, extra = {}) => { pkVisitar(id); go({ vista: "exp", id, sec: "resumen", sheet: null, ...extra }); };
function pkIrNorma(nivel, n) {
  ui.bn = nivel; ui.bq = n.nombre; go({ vista: "biblio", sheet: null });
  requestAnimationFrame(() => { const d = [...document.querySelectorAll("details.norma")].find((q) => q.querySelector("summary b")?.textContent === n.nombre); if (d) { d.open = true; d.classList.add("pk-hl"); d.scrollIntoView({ block: "center" }); setTimeout(() => d.classList.remove("pk-hl"), 1600); } });
}

// ── Fuentes de resultados ──
const pkExpSub = (x) => [x.despacho?.ref, x.nombre && x.despacho?.cliente ? "Herencia de " + x.nombre : "", faseN(x.fase)].filter(Boolean).join(" · ");
function pkItemExp(x, qn) {
  const campos = [x.nombre, x.despacho?.cliente, x.despacho?.ref, ...(x.personas || []).map((p) => p.nombre), ...(x.bienes || []).map((b) => b.descripcion)];
  const etiq = ["Causante", "Cliente", "Referencia", ...(x.personas || []).map((p) => RELACIONES[p.relacion]?.label || "Persona"), ...(x.bienes || []).map(() => "Bien")];
  const m = qn ? pkMejor(qn, campos) : { s: 5, i: -1 };
  if (m.s === 9) return null;
  const sub = m.i >= 3 ? `${etiq[m.i]}: ${campos[m.i]} · ${faseN(x.fase)}` : pkExpSub(x);
  return { s: m.s - 0.2, t: nombreExp(x), sub, ico: I.folder, hint: "Abrir", run: () => pkIrExp(x.id) };
}
function pkAcciones(x, R) {
  const A = [];
  const add = (t, kw, ico, hint, run, sub = "") => A.push({ t, kw, ico, hint, run, sub });
  add("Nuevo expediente", "crear alta herencia", I.plus, "Crear", () => pkClick({ act: "nuevo" }), "Asistente paso a paso");
  add("Expedientes", "inicio cartera home", I.folder, "Ir", () => go({ vista: "inicio", sheet: null }));
  add("Agenda", "plazos calendario vencimientos", I.cal, "Ir", () => go({ vista: "agenda", sheet: null }));
  add("Normativa", "biblioteca leyes normas boe", I.law, "Ir", () => go({ vista: "biblio", sheet: null }), "Biblioteca de normas y ordenanzas");
  // Vistas de la barra lateral y acciones de Ajustes (H13: «mi día», «rentabilidad», «calculadora», «demostración»…)
  add("Mi día", "radar hoy manana bloqueos vencidos pendientes", PK_I.clock, "Ir", () => go({ vista: "radar", sheet: null }), "Lo que vence, lo bloqueado y quién lo debe");
  if (typeof scEsSocio === "function" && scEsSocio()) { add("Panel del despacho", "socio despacho carga equipo sobrecarga riesgo dinero facturar cobrar fases lentas bloqueos al dia", SC_ICO, "Ir", () => scAbrir(), "Carga del equipo, riesgo, dinero, fases y actividad"); add("Registro de cambios", "auditoria actividad historial quien cambio valores anteriores", I.list, "Ir", () => { ui.scTab = "actividad"; scAbrir(); }, "Quién cambió qué dato crítico y cuándo"); }
  add("Rentabilidad", "tiempos horas euros hora minutas honorarios cronometro", I.chart, "Ir", () => go({ vista: "rent", sheet: null }), "Horas y euros por hora de cada expediente");
  if (typeof wgSheet === "function") add("Calculadora para tu web", "widget calculadora web captacion clientes iframe wordpress", PK_I.calc, "Abrir", () => { ui.sheet = { tipo: "widget" }; render(); }, "Las familias calculan su herencia en tu web");
  if (typeof dmActivo === "function") { if (dmActivo()) add("Salir del modo demostración", "demo demostracion ficticio quitar", PK_I.play, "Salir", () => pkClick({ dm: "salir" }), "Quita los expedientes ficticios"); else add("Modo demostración", "demo demostracion ejemplo ficticio presentar ensenar", PK_I.play, "Cargar", () => pkClick({ dm: "cargar" }), "Un despacho en marcha con expedientes ficticios"); }
  if (typeof dmActivo === "function" && dmActivo()) add("Guion de la demostración", "demo presentador pasos guion", I.list, "Abrir", () => dmGuionAbrir(), "Mayúsculas+D");
  if (typeof bvAbrir === "function") add("Ver la bienvenida", "bienvenida primeros pasos tutorial recorrido configurar despacho", I.spark, "Abrir", () => bvAbrir(), "Datos del despacho y recorrido de 20 segundos");
  if (x) {
    if (R) add("Informe en PDF", "descargar calculo informe", I.dl, "Descargar", () => pkClick({ act: "informePdf" }), "Masa, reparto, Sucesiones, plusvalía y partición");
    add("Añadir persona", "heredero conyuge hijo nuevo", I.person, "Añadir", () => { ui.sec = "herencia"; pkClick({ act: "addPersona" }); }, "Al expediente actual");
    add("Añadir bien", "inmueble vivienda cuenta nuevo", I.house, "Añadir", () => { ui.sec = "herencia"; pkClick({ act: "addBien" }); }, "Al expediente actual");
    add("Revisar con el asistente", "editar datos expediente", I.list, "Abrir", () => pkClick({ act: "editar" }));
    if (typeof FAMILIA_CUESTIONARIO === "undefined" || FAMILIA_CUESTIONARIO) add("Datos de la familia", "cuestionario enviar familia", I.person, "Abrir", () => pkClick({ act: "familia" }), "Enviar el cuestionario o cargar la respuesta");
    add("Ajustar trámites al caso", "situaciones autonomo pensionista", I.sliders, "Abrir", () => pkClick({ act: "situ" }));
    add("Deudas y gastos", "hipoteca funeral", I.tax, "Abrir", () => pkClick({ act: "deudas" }));
    add("Plazos de este expediente al calendario", "ics calendario exportar", I.calplus, "Descargar", () => pkClick({ act: "icsx" }));
    add("Exportar este expediente", "compartir enviar archivo json", I.ext, "Descargar", () => pkClick({ act: "exportarExp" }), "Con sus documentos, para otro equipo o abogado");
    add("Duplicar como escenario", "copiar simular", I.doc, "Crear", () => pkClick({ act: "duplicar" }));
    if (typeof reunionAbrir === "function") add("Modo reunión", "presentar cliente pantalla", PK_I.play, "Abrir", () => reunionAbrir(x), "Pantalla completa para explicar la herencia al cliente");
    add("Para la familia", "carpeta reunion familia movil herederos", I.people, "Abrir", () => pkClick({ act: "paraFamilia" }), "Modo reunión y carpeta para el móvil");
  } else {
    // Sin expediente abierto: «Para la familia», «Firma», «Terceros»… van al último expediente abierto
    const ult = pkRecientes(1)[0];
    if (ult) {
      add("Para la familia", "carpeta reunion familia movil herederos", I.people, "Abrir", () => pkIrExp(ult.id, { sheet: { tipo: "carpeta" } }), `Último expediente: ${nombreExp(ult)}`);
      for (const [k, t, ic] of SECCIONES()) if (k !== "resumen") A.push({ t, kw: PK_SEC_KW[k] || "", ico: ic, hint: "Ir", sub: `Último expediente: ${nombreExp(ult)}`, run: () => pkIrExp(ult.id, { sec: k }) });
    }
  }
  add("Cargar casos de ejemplo", "demo ejemplos prueba", I.doc, "Cargar", () => pkClick({ act: "ejemplos" }), "Cuatro expedientes anonimizados");
  add("Descargar copia de seguridad", "backup exportar datos guardar", I.dl, "Descargar", () => pkClick({ act: "backup" }), "Expedientes, documentos, despacho, equipo, licencia y ajustes en un archivo");
  add("Importar un archivo", "restaurar copia cargar json", I.box, "Elegir", () => { ui.sheet = { tipo: "ajustes" }; render(); document.getElementById("f-restore")?.click(); }, "Copia de seguridad, expediente exportado o datos de la familia");
  add("Plazos de la cartera al calendario", "ics agenda exportar", I.calplus, "Descargar", () => pkClick({ act: "ics" }));
  add("Despacho y ajustes", "configuracion equipo abogados licencia preferencias", I.gear, "Abrir", () => pkClick({ act: "ajustes" }));
  add("Novedades de esta versión", "cambios version que hay de nuevo", I.info, "Abrir", () => pkClick({ act: "novedades" }));
  add("Enviar opinión", "feedback sugerencia comentario", I.spark, "Abrir", () => pkClick({ act: "opinion" }));
  add("Tema claro", "apariencia modo luz blanco", PK_I.sun, "Cambiar", () => pkClick({ tema: "claro" }));
  add("Tema grafito", "apariencia modo oscuro dark noche", PK_I.moon, "Cambiar", () => pkClick({ tema: "grafito" }));
  add("Tema como el sistema", "apariencia automatico", PK_I.sun, "Cambiar", () => pkClick({ tema: "sistema" }));
  add("Atajos de teclado", "ayuda teclas shortcuts", PK_I.keys, "Ver", () => pkAbrir("atajos"));
  if (typeof ayAbrir === "function") add("Centro de ayuda", "ayuda manual soporte guia preguntas dudas", AY_IC.q, "Abrir", () => ayAbrir(), "Artículos, manual en PDF y contacto con soporte");
  if (typeof guLista === "function") for (const g of guLista()) add("Guía: " + g.t, "guia tutorial aprender recorrido paso a paso " + g.t.toLowerCase(), AY_IC.q, "Empezar", () => guAbrir(g.id), g.d);
  return A;
}
const PK_SEC_KW = { impuestos: "sucesiones plusvalia isd 650", herencia: "herederos bienes personas arbol", particion: "reparto adjudicacion cuaderno lotes", estrategia: "ahorro fiscal palancas", documentos: "escritos archivo adjuntos", despacho: "encargo fondos honorarios cliente bitacora", tramites: "plazos gestiones", resumen: "inicio portada", diagnostico: "revision riesgos faltan datos", terceros: "bancos notaria registro reclamacion", segunda: "dos herencias segunda conyuge viudo", firma: "notaria paquete listo para firmar escritura nif catastro", normativa: "leyes del caso" };
// Devuelve grupos ordenados: [{g, items:[{t, sub, ico, hint, run, s}]}]
function pkGrupos(q) {
  const qn = pkNorm(q), x = ui.vista === "exp" ? exp() : null, R = x ? calcular(x) : null;
  const G = [];
  const ayuda = q.trim() === "?" || /^(AYUDA|ATAJOS?|TECLAS?|TECLADO)$/.test(qn);
  const grupo = (g, items, orden) => { const L = items.filter(Boolean).sort((a, b) => a.s - b.s || a.t.localeCompare(b.t, "es")).slice(0, PK_MAX); if (L.length) G.push({ g, items: L, orden, best: Math.min(...L.map((i) => i.s)) }); };
  const punt = (it) => { const s = pkScore(qn, it.t); const k = s === 9 && it.kw ? Math.min(9, pkScore(qn, it.kw) + 1) : 9; const r = Math.min(s, k); return r === 9 ? null : { ...it, s: r }; };
  if (ayuda) { grupo("Ayuda", [{ s: 0, t: "Atajos de teclado", sub: "⌘K, Esc, flechas, calculadora", ico: PK_I.keys, hint: "Ver", run: () => pkAbrir("atajos") }, ...(typeof ayAbrir === "function" ? [{ s: 0, t: "Centro de ayuda", sub: "Artículos, manual en PDF y soporte", ico: AY_IC.q, hint: "Abrir", run: () => ayAbrir() }] : [])], 0); return G; }
  if (!qn) {
    grupo("Recientes", pkRecientes(5).map((e) => ({ s: 0, t: nombreExp(e), sub: pkExpSub(e), ico: PK_I.clock, hint: "Abrir", run: () => pkIrExp(e.id) })), 0);
    if (x) grupo("Este expediente", [["resumen", "Resumen"], ["tramites", "Trámites"], ["impuestos", "Impuestos"], ["particion", "Partición"]].map(([k, t], i) => { const s = SECCIONES().find((q) => q[0] === k); return { s: i, t, sub: nombreExp(x), ico: s ? s[2] : I.list, hint: "Ir", run: () => go({ sec: k, sheet: null }) }; }), 1);
    grupo("Acciones", pkAcciones(x, R).filter((a) => ["Nuevo expediente", "Mi día", "Expedientes", "Agenda", "Normativa", "Informe en PDF", "Para la familia", "Despacho y ajustes", "Atajos de teclado"].includes(a.t)).map((a, i) => ({ ...a, s: i })), 2);
    return G;
  }
  // Calculadora
  const v = pkCalc(q);
  if (v != null) grupo("Calculadora", [{ s: -1, raw: true, t: `= ${pkNumTxt(v)}`, sub: `${q.trim()} · como importe: ${eur(v)}`, ico: PK_I.calc, hint: "Copiar", run: () => copiar(pkNumTxt(v)) }], -1);
  // Secciones y pasos de la partición del expediente actual
  if (x) {
    const secs = SECCIONES().map(([k, t, ic]) => punt({ t, kw: PK_SEC_KW[k] || "", sub: nombreExp(x), ico: ic, hint: "Ir", run: () => go({ sec: k, sheet: null }) }));
    const pasos = PASOS_P.map(([, t], i) => punt({ t: `Partición · paso ${i + 1}: ${t}`, kw: "particion paso " + t, sub: nombreExp(x), ico: I.chart, hint: "Ir", run: () => { ui.pstepFor = x.id; ui.pstep = i; go({ sec: "particion", sheet: null }); } }));
    grupo("Secciones", [...secs, ...pasos], 1);
  }
  // Acciones
  grupo("Acciones", pkAcciones(x, R).map(punt), 2);
  if (typeof ayParaPaleta === "function") grupo("Ayuda", ayParaPaleta(q).map((a) => ({ s: a.s, t: a.titulo, sub: a.sub, ico: AY_IC.q, hint: "Leer", run: a.abrir })), 8);
  // Expedientes
  // Búsqueda global (buscar.js): expedientes, personas (nombre o NIF), bienes (dirección, referencia catastral, IBAN), documentos,
  // trámites, tareas y anotaciones de toda la cartera, agrupados por tipo. Sin buscar.js, como antes: expedientes y trámites del actual.
  const bgOk = typeof bgGruposPaleta === "function";
  if (bgOk) { try { G.push(...bgGruposPaleta(q, x ? x.id : null)); } catch (err) { console.error(err); grupo("Expedientes", DB.expedientes.map((e) => pkItemExp(e, qn)), 3); } }
  else grupo("Expedientes", DB.expedientes.map((e) => pkItemExp(e, qn)), 3);
  // Trámites del expediente actual
  if (x && R && !bgOk) grupo("Trámites", tramitesExp(x, R).map((t) => { const it = punt({ t: t.titulo, kw: (t.organismo || "") + " " + (t.quien || ""), sub: [vence(t).txt, t.organismo || t.quien].filter(Boolean).join(" · "), ico: I.list, hint: "Abrir", run: () => go({ vista: "exp", id: x.id, sec: "tramites", sheet: { tipo: "tramite", id: t.id } }) }); return it; }), 4);
  // Escritos
  if (x) grupo("Escritos", (typeof docsDisponibles === "function" ? docsDisponibles(x).map(([k, t, s]) => [k, t, s]) : Object.entries(DOC_TIT).map(([k, t]) => [k, t, ""])).map(([k, t, s]) => punt({ t, kw: "escrito documento borrador " + s, sub: s || "Borrador con los datos del expediente", ico: I.doc, hint: "Abrir", run: () => { ui.sheet = { tipo: "doc", id: k }; render(); } })), 5);
  // Normas
  if (typeof BIBLIO === "object" && BIBLIO.pendiente && qn.length >= 2) heredaParteYRepintar("biblioteca");
  if (typeof BIBLIO === "object" && qn.length >= 2) {
    const N = [];
    const meta = (n) => (n.materias || []).join(" ") + " " + (n.articulos || []).map((a) => a.tema + " " + a.art).join(" ") + " " + (n.id || "");
    const rowN = (nivel, n, sub) => punt({ t: n.nombre, kw: meta(n), sub, ico: I.law, hint: "Ir", run: () => pkIrNorma(nivel, n) });
    for (const n of BIBLIO.estatal || []) N.push(rowN("estatal", n, "Estatal · " + (n.rango || "")));
    for (const [k, L] of Object.entries(BIBLIO.autonomica || {})) for (const n of L) N.push(rowN("autonomica", n, nombreTerr(k)));
    for (const [k, L] of Object.entries(BIBLIO.municipal || {})) for (const n of L) N.push(rowN("municipal", n, (ORDENANZAS[k]?.nombre || k) + " · " + (n.estado === "VERIFICADO" ? "verificada" : "en revisión")));
    grupo("Normas", N, 6);
  }
  // Municipios
  if (typeof muniBuscar === "function" && qn.length >= 2 && !/^\d+$/.test(qn)) {
    grupo("Municipios", muniBuscar(q, 5).map((m, i) => { const key = muniOrd(m.ine); const est = !key ? (muniHac(m.ine) ? "Tipo oficial · Hacienda 2026" : "Sin ordenanza · cálculo máximo") : ORDENANZAS[key]?.estadoTipo === "VERIFICADO" ? "Ordenanza verificada" : "Ordenanza en revisión"; return { s: 2.6 + Math.min(pkScore(qn, m.n), 3) * 0.1 + i * 0.01, raw: true, t: m.n, sub: `${m.pn} · ${est}`, ico: PK_I.pin, hint: key ? "Ir" : "Ver", tag: key ? (ORDENANZAS[key]?.estadoTipo === "VERIFICADO" ? "ok" : "rev") : "no", run: () => { ui.bn = "municipal"; ui.bq = key ? ORDENANZAS[key]?.nombre || m.n : m.n; go({ vista: "biblio", sheet: null }); } }; }), 7);
  }
  G.sort((a, b) => a.best - b.best || a.orden - b.orden);
  return G;
}

// ── Pintado ──
function pkAtajosHTML() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const L = [[[mac ? "⌘" : "Ctrl", "K"], "Abrir o cerrar la paleta de comandos"], [["Esc"], "Cerrar la hoja o la paleta"], [["↑", "↓"], "Moverse por los resultados"], [["↵"], "Abrir el resultado seleccionado"], [["?"], "Ver estos atajos desde la paleta"]];
  if (typeof reunionAbrir === "function") L.push([["←", "→"], "Cambiar de pantalla en modo reunión"]);
  L.push([["250000*0,3"], "Calculadora: operaciones y porcentajes en la paleta"]);
  return `<div class="pk-help"><div class="pk-g">Atajos de teclado</div>${L.map(([k, t]) => `<div class="pk-row static"><span class="pk-t"><b>${esc(t)}</b></span><span class="pk-keys">${k.map((q) => `<kbd>${esc(q)}</kbd>`).join("")}</span></div>`).join("")}<p class="pk-note">Escribe para volver a buscar.</p></div>`;
}
function pkRender() {
  const root = PK.root; if (!root) return;
  const lista = root.querySelector(".pk-list");
  if (PK.modo === "atajos" && !PK.q) { PK.items = []; lista.innerHTML = pkAtajosHTML(); root.querySelector(".pk-in").setAttribute("aria-activedescendant", ""); return; }
  const G = pkGrupos(PK.q); const qn = pkNorm(PK.q);
  PK.items = G.flatMap((g) => g.items);
  if (PK.sel >= PK.items.length) PK.sel = 0;
  if (!PK.items.length) { lista.innerHTML = `<div class="pk-empty"><b>Sin resultados para «${esc(PK.q.trim())}»</b><span>Prueba con un nombre o NIF, la referencia del expediente, una dirección o referencia catastral, un documento, un trámite, una ley o un municipio.</span></div>`; root.querySelector(".pk-in").setAttribute("aria-activedescendant", ""); return; }
  let i = 0;
  lista.innerHTML = G.map((g) => `<div class="pk-g" role="presentation">${esc(g.g)}</div>${g.items.map((it) => { const k = i++; return `<div class="pk-row ${k === PK.sel ? "on" : ""}" role="option" id="pk-o${k}" aria-selected="${k === PK.sel}" data-i="${k}"><span class="pk-ic">${it.ico || I.doc}</span><span class="pk-t"><b>${it.raw ? esc(it.t) : pkMarca(it.t, qn)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span>${it.tag ? `<span class="mtag ${it.tag}">${it.tag === "ok" ? "Verificada" : it.tag === "rev" ? "En revisión" : "Por incorporar"}</span>` : ""}<span class="pk-hint">${esc(it.hint || "Ir")}<kbd>↵</kbd></span></div>`; }).join("")}`).join("");
  root.querySelector(".pk-in").setAttribute("aria-activedescendant", "pk-o" + PK.sel);
}
function pkSeleccionar(k, scroll = true) {
  if (!PK.items.length) return;
  PK.sel = (k + PK.items.length) % PK.items.length;
  PK.root.querySelectorAll(".pk-row[data-i]").forEach((r) => { const on = Number(r.dataset.i) === PK.sel; r.classList.toggle("on", on); r.setAttribute("aria-selected", on); });
  PK.root.querySelector(".pk-in").setAttribute("aria-activedescendant", "pk-o" + PK.sel);
  if (scroll) PK.root.querySelector("#pk-o" + PK.sel)?.scrollIntoView({ block: "nearest" });
}
function pkEjecutar(k = PK.sel) {
  const it = PK.items[k]; if (!it) return;
  if (it.t === "Atajos de teclado") { pkAbrir("atajos"); return; }
  pkCerrar();
  try { it.run(); } catch (err) { console.error(err); toast("No se pudo completar la acción"); }
}

// ── Montaje del contenedor (una sola vez, fuera de #app) ──
function pkMontar() {
  if (PK.root) return PK.root;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const root = document.createElement("div");
  root.id = "pk-root"; root.className = "pk"; root.hidden = true;
  root.innerHTML = `<div class="pk-scrim"></div><div class="pk-panel" role="dialog" aria-modal="true" aria-label="Buscar o hacer">
    <div class="pk-head">${I.search}<input class="pk-in" type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="pk-list" placeholder="Buscar o hacer…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"><button type="button" class="pk-x" aria-label="Esc: cerrar">Esc</button></div>
    <div class="pk-list" id="pk-list" role="listbox" aria-label="Resultados"></div>
    <div class="pk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>↵</kbd> abrir</span><span><kbd>esc</kbd> cerrar</span><span class="pk-brand"><kbd>${mac ? "⌘" : "Ctrl"}</kbd><kbd>K</kbd> en cualquier pantalla</span></div>
  </div>`;
  document.body.appendChild(root);
  const inp = root.querySelector(".pk-in"), lista = root.querySelector(".pk-list");
  root.querySelector(".pk-scrim").addEventListener("click", pkCerrar);
  root.querySelector(".pk-x").addEventListener("click", pkCerrar);
  inp.addEventListener("input", () => { PK.q = inp.value; PK.sel = 0; if (PK.q) PK.modo = "buscar"; pkRender(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); pkSeleccionar(PK.sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pkSeleccionar(PK.sel - 1); }
    else if (e.key === "Home" && PK.items.length) { e.preventDefault(); pkSeleccionar(0); }
    else if (e.key === "End" && PK.items.length) { e.preventDefault(); pkSeleccionar(PK.items.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); pkEjecutar(); }
    else if (e.key === "Escape") { e.preventDefault(); if (PK.modo === "atajos" && !PK.q) { PK.modo = "buscar"; pkRender(); } else pkCerrar(); }
    else if (e.key === "Tab") { e.preventDefault(); pkSeleccionar(PK.sel + (e.shiftKey ? -1 : 1)); }
    else return;
    e.stopPropagation();
  });
  lista.addEventListener("mousedown", (e) => { if (e.target.closest(".pk-row[data-i]")) e.preventDefault(); }); // el foco se queda en el campo
  lista.addEventListener("click", (e) => { const r = e.target.closest(".pk-row[data-i]"); if (r) pkEjecutar(Number(r.dataset.i)); });
  lista.addEventListener("mousemove", (e) => { const r = e.target.closest(".pk-row[data-i]"); if (r && Number(r.dataset.i) !== PK.sel) pkSeleccionar(Number(r.dataset.i), false); });
  // Teclado en móvil: el panel se apoya sobre el teclado (visualViewport)
  if (window.visualViewport) { PK.vv = () => { if (!PK.abierta) return; const vv = window.visualViewport; const off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); root.style.setProperty("--pk-kb", off + "px"); }; window.visualViewport.addEventListener("resize", PK.vv); window.visualViewport.addEventListener("scroll", PK.vv); }
  PK.root = root;
  return root;
}

// ── API ──
function pkAbierta() { return PK.abierta; }
function pkAbrir(modo = "buscar") {
  const root = pkMontar();
  const inp = root.querySelector(".pk-in");
  if (!PK.abierta) {
    PK.foco = document.activeElement;
    PK.abierta = true; PK.q = ""; PK.sel = 0; inp.value = "";
    root.hidden = false; root.classList.remove("out");
    document.documentElement.classList.add("pk-lock");
    if (PK.vv) PK.vv();
  }
  PK.modo = modo === "atajos" ? "atajos" : "buscar";
  if (PK.modo === "atajos") { PK.q = ""; inp.value = ""; }
  pkRender();
  inp.focus({ preventScroll: true }); inp.select();
}
function pkCerrar() {
  if (!PK.abierta || !PK.root) return;
  PK.abierta = false;
  const root = PK.root;
  document.documentElement.classList.remove("pk-lock");
  root.style.removeProperty("--pk-kb");
  root.querySelector(".pk-in").blur();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) root.hidden = true;
  else { root.classList.add("out"); setTimeout(() => { if (!PK.abierta) { root.hidden = true; root.classList.remove("out"); } }, 120); }
  const f = PK.foco; PK.foco = null;
  if (f && f !== document.body && document.contains(f) && !f.closest(".pk")) { try { f.focus({ preventScroll: true }); } catch {} }
}
// Botón visible para la barra lateral o superior: «Buscar o hacer… ⌘K»
function pkBotonHTML(cls = "") {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  return `<button type="button" class="pk-btn ${cls}" data-act="paleta" aria-keyshortcuts="${mac ? "Meta" : "Control"}+K">${I.search}<span>Buscar o hacer…</span><span class="kbd" aria-hidden="true">${mac ? "⌘" : "Ctrl"}K</span></button>`;
}
// Atajo global (fase de captura: se adelanta al manejador de ui.js, que sigue siendo inocuo) y clic en el botón
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); if (PK.abierta) pkCerrar(); else pkAbrir(); return; }
  if (e.key === "Escape" && PK.abierta && !PK.root.contains(e.target)) { e.preventDefault(); e.stopPropagation(); pkCerrar(); }
}, true);
document.addEventListener("click", (e) => { const b = e.target.closest('[data-act="paleta"]'); if (b) { e.preventDefault(); e.stopPropagation(); pkAbrir(); } }, true);
