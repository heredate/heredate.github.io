// ───────────────────── {{MARCA}} · interfaz v4 ─────────────────────
const SV = (d, w = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
Object.assign(I, {
  mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5c0-6.5 0-12.5.2-18.5"/><path d="M12 17c-3.2-.2-5.2-2-5.8-4.6 2.8.1 5 1.7 5.8 4.6z"/><path d="M12.1 13.6c3.1-.3 5-2.2 5.5-4.8-2.7.2-4.8 1.9-5.5 4.8z"/><path d="M12.1 10.4c-2.8-.3-4.5-2-5-4.3 2.5.2 4.4 1.7 5 4.3z"/><path d="M12.2 7.2c2.4-.4 3.8-2 4.1-4-2.2.3-3.7 1.7-4.1 4z"/></svg>',
  list: SV('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
  people: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5.4"/>'),
  gear: SV('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: SV('<path d="M12 5v14M5 12h14"/>', 2),
  sliders: SV('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  info: SV('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  ext: SV('<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>'),
  home2: SV('<path d="M3.5 10.5L12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>'),
  scale: SV('<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.5 6a3 3 0 0 0 5 0z"/><path d="M19 7l-2.5 6a3 3 0 0 0 5 0z"/>'),
  folder: SV('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  tree: SV('<rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="17" width="6" height="4" rx="1"/><rect x="15" y="17" width="6" height="4" rx="1"/><path d="M12 7v5M6 17v-3h12v3"/>'),
  link: SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  law: SV('<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>'),
  left: SV('<path d="M15 6l-6 6 6 6"/>', 2), right: SV('<path d="M9 6l6 6-6 6"/>', 2),
  trash: SV('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  calplus: SV('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>'),
});
const $app = document.getElementById("app");
DB.modo = "profesional";
let ui = { vista: "inicio", id: null, sec: "resumen", sheet: null, borrador: null, paso: 0, q: "", tf: "pend", tv: "lista", sub: "encargo", dsub: "archivo", av: "lista", calMes: hoy().slice(0, 7) };
const exp = () => DB.expedientes.find((e) => e.id === ui.id);
const objetivo = () => (ui.vista === "asist" ? ui.borrador : exp());
function persistir() { if (ui.vista === "exp") guardar(); }
function toast(t) { document.querySelectorAll(".toast").forEach((n) => n.remove()); const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2400); }
function go(v) { Object.assign(ui, v); if (v.vista === "exp" && v.id) pkVisitar(v.id); render(); window.scrollTo(0, 0); }
// H16: mensajes de producto (sin «Piloto» ni «usa casos anonimizados»); se mantiene, honesto, dónde están los datos
const versionTxt = () => String(VERSION_APP.nombre || "").replace(/^Piloto\s*/i, "Versión ");
const notaDatos = () => `Los datos se guardan en este equipo; activa la copia automática en <button class="link" data-act="ajustes" style="font-size:inherit">Ajustes</button>.`;
const escritorio = () => window.matchMedia("(min-width:1024px)").matches;
const nombreExp = (x) => (esDespacho() && x.despacho?.cliente) || x.nombre || "Herencia sin nombre";
const plural = (n, s, p) => `${n} ${n === 1 ? s : p || s + "s"}`;
const mes = (s) => new Date(s + "T12:00:00").toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
function aplicarTema() { const t = DB.tema || "grafito"; const light = t === "claro" || (t === "sistema" && window.matchMedia("(prefers-color-scheme: light)").matches); if (light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme; }

// ───────────────────── Trámites del expediente ─────────────────────
function ctxTramites(x, R) {
  const bienes = x.bienes || [], pers = x.personas || [], vivos = pers.filter((p) => !p.renuncia);
  const viv = R && R.isd.herederos.some((h) => h.traza.some((t) => /vivienda habitual/i.test(t.paso)));
  const reg = REGLAS[x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa];
  return {
    fecha: x.fecha, ccaa: x.ccaa, testamento: x.testamento, civil: x.civil,
    nHerederos: R ? R.isd.herederos.length : vivos.length,
    hayConyuge: vivos.some((p) => p.relacion === "conyuge" || p.relacion === "pareja_hecho"),
    hayMenores: vivos.some((p) => p.edad !== "" && p.edad != null && num(p.edad) < 18),
    hayRenuncia: pers.some((p) => p.renuncia),
    inmuebles: bienes.filter((b) => b.tipo === "vivienda" || b.tipo === "inmueble").length,
    hayCuentas: bienes.some((b) => b.tipo === "cuenta"), hayValores: bienes.some((b) => b.tipo === "valores"),
    hayVehiculos: bienes.some((b) => b.tipo === "vehiculo"), hayEmpresa: bienes.some((b) => b.tipo === "empresa"),
    hayDeudas: (x.deudas || []).some((d) => num(d.importe) > 0),
    herederoUnico: pers.length === 1 && vivos.length === 1,
    hayLegados: bienes.some((b) => b.legatarioId),
    hayHijosJovenes: vivos.some((p) => ["hijo", "nieto"].includes(p.relacion) && p.edad !== "" && p.edad != null && num(p.edad) <= 25),
    prorrogaISD: x.tramites?.prorroga?.estado === "hecho",
    permanenciaVivienda: viv && reg && reg.vivienda ? reg.vivienda.permanencia || 0 : 0,
    situ: { ...(x.situ || {}) },
  };
}
function tramitesExp(x, R) {
  if (!x.fecha) return [];
  const st = x.tramites || {};
  return tramitesDe(ctxTramites(x, R)).map((t) => ({ ...t, st: st[t.id]?.estado || "pend", nota: st[t.id]?.nota || "", docsOk: st[t.id]?.docs || {} }));
}
const cerrado = (t) => t.st === "hecho" || t.st === "na";
function vence(t) {
  const h = hoy();
  if (cerrado(t)) return { txt: t.st === "hecho" ? "Hecho" : "No aplica", cls: "" };
  if (t.limite) {
    const q = dias(h, t.limite);
    if (t.informativo) return { txt: "hasta " + fechaCorta(t.limite), cls: "", q };
    if (q < 0) return { txt: `venció hace ${plural(-q, "día")}`, cls: "bad", q };
    if (q === 0) return { txt: "vence hoy", cls: "bad", q };
    if (q <= 30) return { txt: `${t.recomendado ? "antes de" : "vence en"} ${plural(q, "día")}`, cls: "warn", q };
    return { txt: (t.recomendado ? "antes del " : "hasta el ") + fechaCorta(t.limite), cls: "", q };
  }
  if (t.desde) { const q = dias(h, t.desde); return q > 0 ? { txt: "desde el " + fechaCorta(t.desde), cls: "" } : { txt: "ya se puede hacer", cls: "" }; }
  return { txt: "", cls: "" };
}
function proximo(T) {
  const abiertos = T.filter((t) => !cerrado(t) && t.limite && !t.informativo).sort((a, b) => a.limite.localeCompare(b.limite));
  return abiertos[0] || T.find((t) => !cerrado(t)) || null;
}
// Estado de cada expediente en la cartera: se guarda por huella del expediente y día (logic.js, calcMemo; I10)
function estadoGlobal(x) { return calcMemo("eg", x, () => estadoGlobal0(x)); }
function estadoGlobal0(x) {
  const R = calcular(x); const T = tramitesExp(x, R); const p = proximo(T);
  if (!R) return { R, T, p, nivel: "neutral", txt: "Faltan datos" };
  if (!p) return { R, T, p, nivel: "ok", txt: "Todo hecho" };
  const v = vence(p);
  return { R, T, p, nivel: v.cls === "bad" ? "bad" : v.cls === "warn" ? "warn" : "ok", txt: `${p.titulo} · ${v.txt}` };
}
const enlacesDe = (id) => ENLACES[id] || { accion: [], norma: [] };

// ───────────────────── Piezas visuales ─────────────────────
function ring(done, total, size = 118) {
  const r = 50, c = 2 * Math.PI * r, f = total ? done / total : 0;
  return `<svg class="ring" viewBox="0 0 120 120" style="width:${size}px;height:${size}px" role="img" aria-label="${done} de ${total} trámites resueltos"><circle class="bg" cx="60" cy="60" r="${r}" fill="none" stroke-width="8"/><circle class="fg" cx="60" cy="60" r="${r}" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle">${Math.round(f * 100)} %</text></svg>`;
}
const stBtn = (t) => `<button class="st ${t.st === "hecho" ? "hecho" : t.st === "curso" ? "curso" : t.st === "na" ? "na" : ""}" data-tst="${t.id}" aria-label="Cambiar estado: ${esc(t.titulo)}">${t.st === "hecho" ? I.tick : ""}</button>`;
const tagE = (e) => !e ? "" : e === "VERIFICADO" ? '<span class="tag V">Verificado</span>' : e === "PENDIENTE" || e === "PROBABLE" ? '<span class="tag P">En verificación</span>' : e === "ESTIMADO" ? '<span class="tag P">Estimación con el máximo legal</span>' : e === "INTRODUCIDO" ? '<span class="tag I">Introducido a mano</span>' : `<span class="tag I">${esc(e)}</span>`;
const tagR = (r) => r ? `<span class="tag ${r}">${{ bajo: "Riesgo bajo", medio: "Riesgo medio", alto: "Riesgo alto", litigioso: "Litigioso" }[r]}</span>` : "";
const icoBien = { vivienda: ["gold", I.house], inmueble: ["brown", I.house], cuenta: ["green", I.bank], valores: ["indigo", I.chart], vehiculo: ["blue", I.car], empresa: ["orange", I.brief], otro: ["gray", I.box] };
function composicion(x) {
  const g = { inm: 0, fin: 0, otr: 0 };
  for (const b of x.bienes || []) { const v = Math.max(num(b.valor), num(b.valorReferencia)) * (b.titularidad === "ganancial" ? 0.5 : b.titularidad === "proindiviso" ? (pctCausante(b.porcentaje)) / 100 : 1); if (b.tipo === "vivienda" || b.tipo === "inmueble") g.inm += v; else if (b.tipo === "cuenta" || b.tipo === "valores") g.fin += v; else g.otr += v; }
  return [{ n: "Inmuebles", v: g.inm, color: "var(--c3)" }, { n: "Dinero e inversiones", v: g.fin, color: "var(--c1)" }, { n: "Otros bienes", v: g.otr, color: "var(--c2)" }];
}
// H22: porcentajes sobre la misma base que los importes, redondeados para que sumen exactamente 100 (mayor resto)
function pctReparto(vals) {
  const tot = vals.reduce((a, v) => a + Math.max(0, v), 0); if (!tot) return vals.map(() => 0);
  const ex = vals.map((v) => Math.max(0, v) / tot * 100), base = ex.map(Math.floor); let falta = 100 - base.reduce((a, v) => a + v, 0);
  ex.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (falta > 0 && vals[i] > 0) { base[i]++; falta--; } });
  return base;
}
function donut(parts, size = 104) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1; const r = 40, c = 2 * Math.PI * r; let off = 0;
  const arcs = parts.filter((p) => p.v > 0).map((p) => { const l = c * p.v / tot; const el = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${p.color}" stroke-width="9" stroke-dasharray="${Math.max(0, l - 2.5)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 50 50)"/>`; off += l; return el; }).join("");
  return `<svg viewBox="0 0 100 100" style="width:${size}px;height:${size}px;flex:none" role="img" aria-label="Composición del patrimonio"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--fill)" stroke-width="9"/>${arcs}</svg>`;
}
const saludo = () => { const h = new Date().getHours(); return h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches"; };
// «martes, 7 de octubre», igual que toLocaleDateString("es-ES") pero sin cargar los datos de Intl al arrancar (unos 30 ms en un móvil)
const fechaHoyLarga = () => { const d = new Date(); return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()] + ", " + d.getDate() + " de " + ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][d.getMonth()]; };
const curHTML = (v) => String(v).replace(/(\d)\s?€$/, '$1<span class="cur">€</span>');
const kpi = (k, v, s, cls = "", act = "") => `<${act ? "button" : "div"} class="kpi ${cls}" ${act}><div class="k">${k}</div><b>${curHTML(v)}</b>${s ? `<small>${s}</small>` : ""}</${act ? "button" : "div"}>`;
const cardH = (k, t, extra = "") => `<div class="card-h"><div><div class="k">${k}</div>${t ? `<h3>${t}</h3>` : ""}</div>${extra}</div>`;

// ───────────────────── Barra lateral (escritorio) ─────────────────────
// Gancho de producto: scSideItem() (socio.js) pone en el grupo «Despacho» el panel del socio y el selector «Soy»
function vSide() {
  const L = DB.expedientes.map((x) => ({ x, ...estadoGlobal(x) })).filter((e) => !ui.q || (nombreExp(e.x) + " " + (e.x.nombre || "") + " " + (e.x.despacho?.ref || "")).toLowerCase().includes(ui.q.toLowerCase()));
  const orden = { bad: 0, warn: 1, ok: 2, neutral: 3 };
  L.sort((a, b) => orden[a.nivel] - orden[b.nivel] || (a.p?.limite || "9").localeCompare(b.p?.limite || "9"));
  const D = despachoCfg();
  return `<aside class="side" aria-label="Expedientes">
    <div class="brandrow"><span class="logo" aria-hidden="true">${LOGO_SVG}</span><span><span class="brandname">{{MARCA}}</span><small class="caption" style="display:block;margin-top:2px">${esc(D.nombre || "Despacho")}</small></span></div>
    ${pkBotonHTML()}
    <div class="newbtn"><button class="btn sm block" data-act="nuevo">${I.plus}Nuevo expediente</button></div>
    <div class="scroll">
      <div class="sgrp">Trabajo</div>
      ${rdSideItem()}
      <button class="sitem" data-act="home" aria-current="${ui.vista === "inicio"}"><span class="ic">${I.folder}</span><span class="t"><b>Expedientes</b></span><span class="cnt">${DB.expedientes.length || ""}</span></button>
      <button class="sitem" data-act="agenda" aria-current="${ui.vista === "agenda"}"><span class="ic">${I.cal}</span><span class="t"><b>Agenda</b></span></button>
      <div class="sect">En curso</div>
      ${L.length ? L.map((e) => `<button class="sitem" data-open="${e.x.id}" aria-current="${ui.vista === "exp" && ui.id === e.x.id}"><span class="ic">${e.nivel === "bad" || e.nivel === "warn" ? `<i class="dot ${e.nivel}"></i>` : `<i class="dot"></i>`}</span><span class="t"><b>${esc(nombreExp(e.x))}</b><small>${esc(e.x.despacho?.ref || "")}${e.x.despacho?.ref ? " · " : ""}${esc(faseN(e.x.fase))}</small></span></button>`).join("") : `<p class="caption" style="padding:4px 10px">${ui.q ? "Sin resultados." : "Sin expedientes."}</p>`}
    </div>
    <div class="foot"><div class="sgrp">Despacho</div>
      ${typeof scSideItem === "function" ? scSideItem() : ""}
      <button class="sitem" data-tmp="rent" aria-current="${ui.vista === "rent"}"><span class="ic">${I.chart}</span><span class="t"><b>Rentabilidad</b></span>${tmBadgeCron()}</button><button class="sitem" data-act="biblio" aria-current="${ui.vista === "biblio"}"><span class="ic">${I.law}</span><span class="t"><b>Normativa</b></span></button>${ayBotonHTML("sitem")}<button class="sitem" data-act="ajustes"><span class="ic">${I.gear}</span><span class="t"><b>Despacho y ajustes</b></span></button>${typeof redSideItem === "function" ? redSideItem() : ""}${sgBotonBloqueo("sitem")}<button class="vers" data-act="novedades">{{MARCA}} · ${esc(versionTxt())} · Novedades</button></div>
  </aside>`;
}

// ───────────────────── Cartera ─────────────────────
const EJEMPLOS = [["est", "Málaga · hija y sobrino", "Testamento 70/30, vivienda, apartamento en Torremolinos y ahorro"], ["mar", "Marbella · viuda y tres hijos", "Testamento del uno para el otro, vivienda y local"], ["and", "Málaga · dos hermanos", "Sin testamento; el hermano mayor convivía con el causante"], ["mad", "Madrid · viuda y dos hijos", "Sin testamento, gananciales"]];
const _ejCache = {};
function ejResumen(k) { if (!_ejCache[k]) { const x = ejemplo(k); const R = calcular(x); const E = estrategia(x); _ejCache[k] = { caudal: R.isd.masa.bruto, imp: R.isd.total + R.totalPlus, ah: E ? E.seguro : 0, n: R.isd.herederos.length }; } return _ejCache[k]; }
function fasesVisual() {
  const F = [["Primeros días", "0-15 días"], ["Conocer", "desde 15 días hábiles"], ["Inventario", "meses 1-3"], ["Decidir", "antes de aceptar"], ["Formalizar y pagar", "6 meses · prórroga 12"], ["Titularidad", "tras la escritura"], ["Después", "4 años"]];
  return `<div class="phases7">${F.map(([n, s], i) => `<div><span class="pn ${i === 4 ? "on" : ""}">${i + 1}</span><b>${n}</b><small>${s}</small></div>`).join("")}</div>`;
}
function vHome() {
  const est = DB.expedientes.map((x) => ({ x, ...estadoGlobal(x) }));
  const act = est.filter((e) => e.x.fase !== "cerrado");
  const venc = act.filter((e) => e.nivel === "bad").length, pronto = act.filter((e) => e.nivel === "warn").length;
  const F = act.map((e) => (e.R ? fondos(e.x, e.R) : null)).filter(Boolean);
  const hon = F.reduce((s, f) => s + f.presup, 0), cob = F.reduce((s, f) => s + f.hon, 0), saldo = F.reduce((s, f) => s + f.saldo, 0);
  const ah = act.reduce((s, e) => { const E = e.R ? estrategia(e.x) : null; return s + (E ? E.seguro : 0); }, 0);
  const prox = act.flatMap((e) => e.T.filter((t) => !cerrado(t) && t.limite && !t.informativo).map((t) => ({ t, x: e.x }))).sort((a, b) => a.t.limite.localeCompare(b.t.limite)).slice(0, 8);
  const lista = est.filter((e) => !ui.q || (nombreExp(e.x) + " " + (e.x.nombre || "") + " " + (e.x.despacho?.ref || "")).toLowerCase().includes(ui.q.toLowerCase()));
  const D = despachoCfg();
  const top = `<div class="topbar"><span class="brandname ${escritorio() ? "hide" : ""}" style="display:flex;align-items:center;gap:8px"><span class="logo" style="width:26px;height:26px" aria-hidden="true">${LOGO_SVG}</span>{{MARCA}}</span><span class="crumbs"><b>Expedientes</b></span><span class="mid">Expedientes</span><span class="tbtns">${escritorio() ? ayBotonHTML() : topMovil()}</span></div>`;
  if (!est.length) return `${top}<div class="page view">
    <p class="greet">${esc(fechaHoyLarga())}</p>
    ${rbAvisoHTML()}${asAvisoHTML()}${ayPrimerosPasosHTML()}${escritorio() ? "" : `<div class="infobar nu-otro"><span class="ico blue">${I.info}</span><span>¿Creaste expedientes en otro equipo? Siguen allí: cada equipo guarda los suyos. Para traerlos, expórtalos en ese equipo e impórtalos aquí, en <button class="link" data-act="ajustes">Ajustes › Importar un archivo</button>.</span></div>`}
    <div class="gu-port"><div class="sectitle flex"><b>Aprende usándolo</b><span>guías interactivas</span></div>${guHTMLLista(true)}</div>
    <div class="home-hero" style="grid-template-columns:1fr;margin-top:14px"><div><div class="kick">${esc(D.nombre || "Tu despacho")}</div><h2>Todavía no hay expedientes.</h2><p>Un expediente es una herencia: la persona fallecida, sus herederos y sus bienes. Con la fecha, la comunidad, una persona y un bien ya se calculan los impuestos, el reparto, los plazos y los escritos. Lo que falte se completa después, o lo rellena la familia desde su móvil.</p><div class="acts"><button class="btn" data-act="nuevo">Abrir el primer expediente</button><button class="btn gray" data-act="lecNuevo">Crear desde documentos</button><button class="btn gray" data-dm="cargar">Ver un despacho de ejemplo</button></div></div></div>
    <p class="foot-note">${notaDatos()} Motor ${VERSION}. <button class="link" data-act="ejemplos" style="font-size:12.5px">Cargar cuatro casos de ejemplo</button></p></div>`;
  const vista = ui.cv || "tabla";
  return `${top}<div class="page wide view">
    <p class="greet">${saludo()} · ${esc(fechaHoyLarga())}</p>
    ${rbAvisoHTML()}
    <div class="headrow"><h1 class="ltitle">Expedientes</h1><div class="headacts"><div class="search" style="width:240px">${I.search}<input id="h-q" placeholder="Buscar" value="${esc(ui.q)}" autocomplete="off" aria-label="Buscar expedientes"></div><button class="btn sm gray" data-act="lecNuevo" title="Crear un expediente a partir de los documentos de la herencia">${I.doc}Desde documentos</button><button class="btn sm" data-act="nuevo">${I.plus}Nuevo expediente</button></div></div>${asAvisoHTML()}${ayPrimerosPasosHTML()}${rdResumenCartera()}
    <div class="kpis kpis3" style="margin-top:14px">${kpi("En curso", act.length, `${est.length - act.length} archivados`)}${kpi("Vencen en 30 días", pronto, "expedientes con un plazo próximo", pronto ? "warn" : "")}${kpi("Vencidos", venc, "expedientes con plazos vencidos", venc ? "bad" : "")}</div>
    ${bloqueVigilancia()}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:22px 0 12px"><div class="seg"><button data-cv="tabla" aria-pressed="${vista === "tabla"}">Tabla</button><button data-cv="tablero" aria-pressed="${vista === "tablero"}">Por fase</button><button data-cv="plazos" aria-pressed="${vista === "plazos"}">Plazos y mapa</button></div><button class="btn sm gray desk-only" data-act="ics">${I.calplus}Plazos al calendario</button></div>
    ${vista === "tablero" ? tableroCartera(lista) : vista === "plazos" ? `<div class="grid g2"><div class="card">${cardH("Próximos 90 días", "Vencimientos por expediente")}${carriles(act)}</div><div class="card">${cardH("Inmuebles", "Situación de la cartera")}${(() => { const heat = {}, pins = []; for (const e of act) { const k = e.x.ccaa === "EST" ? e.x.ccaaBienes : e.x.ccaa; if (k) heat[k] = (heat[k] || 0) + 1; for (const b of e.x.bienes || []) if (b.municipio && b.municipio !== "OTRO" && esInm(b)) pins.push({ k: b.municipio, label: ORDENANZAS[b.municipio]?.nombre }); } const todoAND = pins.length && MAPA_AND && pins.every((p) => MAPA_AND.pins[p.k]) && Object.keys(heat).every((k) => k === "AND"); return todoAND ? mapaAND({ pins }) : mapaES({ heat, pins }); })()}</div></div>` : tablaCartera(lista)}
    ${prox.length ? `<div class="sectitle flex"><b>Próximos vencimientos</b><button class="link" data-act="agenda">Agenda ›</button></div><div class="group" style="--inset:74px">${prox.map(({ t, x }) => { const v = vence(t); return `<button class="row" data-open="${x.id}" data-go-t="${t.id}"><span class="datebox"><b class="num">${Number(t.limite.slice(8))}</b><small>${mes(t.limite)}</small></span><span class="t"><b>${esc(t.titulo)}</b><small><span class="due ${v.cls}">${esc(v.txt)}</span> · ${esc(nombreExp(x))}${x.despacho?.ref ? ` · <span class="mono">${esc(x.despacho.ref)}</span>` : ""}</small></span>${avatar(x.responsable)}${I.chev}</button>`; }).join("")}</div>` : ""}
    <p class="foot-note">${notaDatos()} {{MARCA}} calcula y prepara; el criterio es del abogado. Motor ${VERSION}. <button class="link" data-act="ejemplos" style="font-size:12.5px">Cargar casos de ejemplo</button></p>
  </div>`;
}

// ───────────────────── Agenda ─────────────────────
function vAgenda() {
  const items = DB.expedientes.flatMap((x) => { const R = calcular(x); return tramitesExp(x, R).filter((t) => !cerrado(t) && (t.limite || t.desde) && !t.informativo).map((t) => ({ t, x, f: t.limite || t.desde })); }).sort((a, b) => a.f.localeCompare(b.f));
  const meses = {}; for (const i of items) (meses[i.f.slice(0, 7)] = meses[i.f.slice(0, 7)] || []).push(i);
  const ym = ui.calMes; const [yy, mm] = ym.split("-").map(Number);
  const prev = new Date(yy, mm - 2, 15).toISOString().slice(0, 7), next = new Date(yy, mm, 15).toISOString().slice(0, 7);
  const cab = new Date(ym + "-15T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const body = ui.av === "mes" ? `<div class="card" style="padding:16px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><button class="tbtn" data-cal="${prev}" aria-label="Mes anterior">${I.left}</button><b class="mes-t">${cab.charAt(0).toUpperCase() + cab.slice(1)}</b><button class="tbtn" data-cal="${next}" aria-label="Mes siguiente">${I.right}</button></div>${calendario(ym, items)}</div>`
    : items.length ? Object.entries(meses).map(([m, L]) => `<div class="sectitle">${new Date(m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</div><div class="group" style="--inset:74px">${L.map(({ t, x, f }) => { const v = vence(t); return `<button class="row" data-open="${x.id}" data-go-t="${t.id}"><span style="width:44px;text-align:center;flex:none"><b style="display:block;font:400 24px/1 var(--serif)" class="num">${Number(f.slice(8))}</b><small style="font-size:10.5px;color:var(--label-3);text-transform:uppercase;letter-spacing:.06em">${mes(f)}</small></span><span class="t"><b>${esc(t.titulo)}</b><small><span class="due ${v.cls}">${esc(v.txt)}</span> · ${esc(nombreExp(x))}${t.organismo ? " · " + esc(t.organismo) : ""}</small></span>${I.chev}</button>`; }).join("")}</div>`).join("") : `<div class="card empty"><b>Todavía no hay plazos en la agenda.</b><p>Cada expediente con fecha de fallecimiento trae sus plazos: Sucesiones, plusvalía, prórroga, certificados. Aparecen aquí ordenados por fecha.</p><div class="acts"><button class="btn sm" data-act="nuevo">${I.plus}Nuevo expediente</button></div></div>`;
  return `<div class="topbar"><button class="tbtn back-m" data-act="home">${I.back}${esDespacho() ? "Expedientes" : "Inicio"}</button><span class="crumbs"><b>Agenda</b></span><span class="mid">Agenda</span><span class="tbtns">${ayBotonHTML()}<button class="tbtn" data-act="ics" aria-label="Añadir al calendario">${I.calplus}</button></span></div>
  <div class="page narrow view"><p class="greet">${plural(items.length, "plazo pendiente", "plazos pendientes")}</p><h1 class="ltitle">Agenda</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:6px 0 18px"><div class="seg"><button data-av="lista" aria-pressed="${ui.av !== "mes"}">Lista</button><button data-av="mes" aria-pressed="${ui.av === "mes"}">Mes</button></div><button class="btn sm gray" data-act="ics">${I.calplus}Añadir a mi calendario</button></div>
  ${body}<p class="foot-note">El archivo .ics funciona con Calendario de Apple, Google Calendar y Outlook, con aviso una semana antes de cada plazo.</p></div>`;
}

// ───────────────────── Expediente ─────────────────────
const SECCIONES = () => [["resumen", "Resumen", I.home2], ["herencia", "Herederos y bienes", I.tree], ["impuestos", "Impuestos", I.tax], ["particion", "Partición", I.chart], ["tramites", "Trámites", I.list], ["documentos", "Documentos", I.folder],
  ["diagnostico", "Diagnóstico", I.info, "Qué falta y qué conviene revisar"], ["estrategia", "Estrategia fiscal", I.scale, "Cómo pagar menos, con su riesgo"], ["segunda", "Dos herencias", I.people, "Qué pasará al fallecer el viudo"], ["terceros", "Bancos y notaría", I.ext, "Solicitudes y respuestas de terceros"], ["firma", "Listo para firmar", I.tick, "Comprobación antes de la notaría"], ["normativa", "Normativa", I.law, "Las normas aplicadas a este caso"], ["despacho", "Encargo y honorarios", I.brief, "Cliente, equipo, fondos y bitácora"]];
const SEC_PRINCIPALES = ["resumen", "herencia", "impuestos", "particion", "tramites", "documentos"];
const TABS_M = ["resumen", "tramites", "particion", "impuestos"];
// Cabecera del expediente: estado (críticas · plazos · bloqueos · al día) y el próximo vencimiento con su cuenta atrás
function expEstadoHTML(x, T) {
  if (x.fase === "cerrado") return "";
  const p = proximo(T); const v = p ? vence(p) : null;
  const st = typeof rdEstadoLinea === "function" ? rdEstadoLinea(x) : "";
  const nx = p && p.limite && !p.informativo ? `<button class="exp-next" data-topen="${p.id}" title="Abrir el trámite"><span class="exp-next-k">${v.q < 0 ? "Plazo vencido" : "Próximo vencimiento"}</span><b class="num">${fechaCorta(p.limite)}</b><span class="due ${v.cls}">${v.q < 0 ? "hace " + plural(-v.q, "día") : v.q === 0 ? "hoy" : "en " + plural(v.q, "día")}</span><span class="exp-next-t">${esc(p.titulo)}</span></button>` : `<span class="exp-next"><span class="exp-next-k">Próximo vencimiento</span><span class="caption">Sin plazos pendientes</span></span>`;
  return `<div class="exp-st">${st ? `<span class="st-line" aria-label="Estado del expediente">${st}</span>` : ""}${nx}</div>`;
}
function faseEstado(x) {
  if (typeof rdAccionesExp !== "function" || x.fase === "cerrado") return { cls: "", txt: "En curso" };
  const A = rdAccionesExp(x);
  if (A.crit.length) return { cls: "venc", txt: plural(A.crit.length, "asunto crítico", "asuntos críticos") };
  if (A.bloq.length) return { cls: "blk", txt: plural(A.bloq.length, "bloqueo") };
  return { cls: "", txt: "En curso" };
}
function vExp() {
  const x = exp(); if (!x) return vHome();
  docTramReconciliar(x);
  const R = calcular(x); const T = tramitesExp(x, R); snapAct(x, R);
  const secs = SECCIONES();
  let body;
  if (!R && !["despacho", "documentos", "normativa", "diagnostico", "firma", "terceros"].includes(ui.sec)) body = `${franjaFamilia(x)}<div class="card empty" style="margin-top:14px"><b>Faltan datos para calcular</b>${x.familia ? "Los datos de la familia ya están cargados. Revísalos y completa la fecha, la comunidad, los herederos y los bienes que falten." : "Revisa la fecha, la comunidad, los herederos y los bienes, o pide los datos a la familia."}<div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" data-act="editar">Completar datos</button></div></div>`;
  else body = ({ resumen: tResumen, tramites: tTramites, herencia: tHerencia, particion: tParticion, impuestos: tImpuestos, estrategia: tEstrategia, segunda: tSegunda, diagnostico: tDiagnostico, terceros: tTerceros, firma: tFirma, normativa: tNormativa, documentos: tDocumentos, despacho: tDespacho })[ui.sec](x, R, T);
  const sec = secs.find((s) => s[0] === ui.sec) || secs[0];
  const titulo = ui.sec === "resumen" ? nombreExp(x) : sec[1];
  const pend = T.filter((t) => !cerrado(t)).length;
  const tabSel = TABS_M.includes(ui.sec) ? ui.sec : "mas";
  const nh = R && !R.isd.bloqueo ? R.isd.herederos.length : (x.personas || []).filter((p) => !p.renuncia).length; // I6/I7 (QA 07-10-2026)
  const fi = faseI(x.fase);
  const conf = conflictos(x).length;
  return `<div class="topbar" id="tb"><button class="tbtn back-m" data-act="home">${I.back}Expedientes</button><span class="crumbs"><button data-act="home">Expedientes</button><span>›</span><b>${esc(x.despacho?.ref || nombreExp(x))}</b>${ui.sec !== "resumen" ? `<span>›</span><span>${esc(sec[1])}</span>` : ""}</span><span class="mid">${esc(titulo)}</span><span class="tbtns">${ayBotonHTML()}${SAMPLE && R ? `<button class="tbtn" data-act="ia" aria-label="Asistente">${I.spark}</button>` : ""}<button class="tbtn" data-act="icsx" aria-label="Plazos al calendario">${I.calplus}</button><button class="tbtn" data-act="menu" aria-label="Más opciones">${I.dots}</button></span></div>
  <div class="page wide view">
    <p class="greet">${x.despacho?.ref ? `<span class="mono">${esc(x.despacho.ref)}</span> · ` : ""}${esc(nombreTerr(x.ccaa))}</p>
    <div class="headrow"><h1 class="ltitle">${esc(escritorio() || ui.sec === "resumen" ? nombreExp(x) : titulo)}</h1><div class="headacts desk-only"><button class="chip-r" data-sec="despacho" title="Responsable">${avatar(x.responsable)}<span>${esc(abogado(x.responsable)?.nombre || "Sin responsable")}</span></button>${conf ? `<button class="chip-r warn" data-sec="despacho">${plural(conf, "coincidencia", "coincidencias")} en la cartera</button>` : ""}${calcular(x) ? `<button class="btn sm" data-act="paraFamilia" title="Modo reunión y carpeta para la familia">${I.people}Para la familia</button><button class="btn sm gray" data-act="informePdf" title="Masa, reparto, Sucesiones paso a paso, plusvalía y partición">${I.dl}Informe en PDF</button>` : ""}</div></div>
    <p class="lsub">${x.nombre && x.despacho?.cliente ? `<span>Herencia de ${esc(x.nombre)}</span><span class="sep"></span>` : ""}${x.fecha ? `<span>Fallecimiento: ${fechaCorta(x.fecha)}</span><span class="sep"></span>` : ""}<span>${plural(nh, "heredero")}</span><span class="sep"></span><span>${{ no: "Sin testamento", usufructo: "Testamento: usufructo al cónyuge", porcentajes: "Testamento", nose: "Testamento por confirmar" }[x.testamento] || ""}</span></p>
    ${expEstadoHTML(x, T)}
    <div class="stepper" role="list" aria-label="Fase del encargo">${FASES_EXP.map(([k, n], i) => { const e = i === fi ? faseEstado(x) : null; return `<button role="listitem" data-fase="${k}" class="${i < fi ? "done" : i === fi ? "on" + (e ? " " + e.cls : "") : ""}" ${i === fi ? 'aria-current="step"' : ""} title="${i < fi ? "Completada" : i === fi ? "Fase actual" : "Pendiente"}: ${esc(n)}"><i>${i < fi ? I.tick : i + 1}</i><span>${n}${e ? `<small>${esc(e.txt)}</small>` : ""}</span></button>`; }).join("")}</div>
    <div class="sn-wrap"><button class="sn-ar sn-izq" data-snmov="-1" tabindex="-1" aria-label="Pestañas anteriores">${I.left}</button><nav class="secnav" aria-label="Secciones">${secs.filter(([k]) => SEC_PRINCIPALES.includes(k)).map(([k, t]) => `<button data-sec="${k}" ${ui.sec === k ? 'aria-current="page"' : ""}>${t}${k === "tramites" && pend ? `<span class="n">${pend}</span>` : ""}</button>`).join("")}<span class="sn-mas"><button data-act="snMas" aria-expanded="${!!ui.snMas}" ${!SEC_PRINCIPALES.includes(ui.sec) ? 'aria-current="page"' : ""}>${!SEC_PRINCIPALES.includes(ui.sec) ? esc(sec[1]) : "Más"}${I.down || I.chev}</button></span></nav><button class="sn-ar sn-der" data-snmov="1" tabindex="-1" aria-label="Más pestañas">${I.right}</button>${ui.snMas ? `<div class="sn-menu" role="menu"><div class="sn-h">Más herramientas</div>${secs.filter(([k]) => !SEC_PRINCIPALES.includes(k)).map(([k, t, , d]) => `<button role="menuitem" data-sec="${k}" ${ui.sec === k ? 'aria-current="page"' : ""}><span>${t}<br><small>${d}</small></span></button>`).join("")}</div>` : ""}</div>
    ${body}
  </div>
  <nav class="tabbar" aria-label="Secciones"><div class="inner">${secs.filter(([k]) => TABS_M.includes(k)).map(([k, t, ic]) => `<button data-sec="${k}" ${tabSel === k ? 'aria-current="page"' : ""}>${ic}<span>${k === "herencia" ? "Herencia" : t}</span></button>`).join("")}<button data-act="mas" ${tabSel === "mas" ? 'aria-current="page"' : ""}>${I.dots}<span>Más</span></button></div></nav>`;
}

function tResumen(x, R, T) {
  const p = proximo(T); const v = p ? vence(p) : null;
  const hechos = T.filter(cerrado).length;
  const fases = TR_FASES.map((f) => { const L = T.filter((t) => t.fase === f.id); return { f, n: L.length, h: L.filter(cerrado).length }; }).filter((f) => f.n);
  const E = estrategia(x);
  const al = R.isd.alertas;
  const K = costeExpediente(x, R); const impTot = K ? K.total : R.isd.total + R.totalPlus;
  const todo = !!DB.resumenCompleto;
  // Lo esencial, siempre: las cifras, la familia, el siguiente paso, quién hereda y los inmuebles. El resto se despliega con «Ver todo».
  const esencial = `${avisoExp(x)}${typeof bloqueoRepartoHTML === "function" ? bloqueoRepartoHTML(x, R) : ""}<div class="kpis">
      ${kpi("Caudal", fmtK(R.isd.masa.bruto), `neto ${fmtK(R.isd.masa.neto)}`, "", 'data-sec="herencia"')}
      ${kpi("Impuestos", fmtK(impTot), `Sucesiones ${fmtK(R.isd.total)} · plusvalía ${fmtK(R.totalPlus)}${K && K.exceso ? ` · exceso ${fmtK(K.exceso)}` : ""}`, "", 'data-sec="impuestos"')}
      ${kpi("Herederos", String(R.isd.herederos.length), { no: "sin testamento", usufructo: "testamento con usufructo", porcentajes: "con testamento", nose: "testamento por confirmar" }[x.testamento] || "", "", 'data-sec="herencia"')}
      ${kpi("Deudas y gastos", fmtK((R.isd.masa.deudas || 0) + (R.isd.masa.gastos || 0)), (R.isd.masa.deudas || R.isd.masa.gastos) ? `deudas ${fmtK(R.isd.masa.deudas || 0)} · gastos ${fmtK(R.isd.masa.gastos || 0)}` : "sin pasivos declarados", "", 'data-sec="herencia"')}
      ${kpi("Trámites", `${hechos} de ${T.length}`, `resueltos · ${Math.round(hechos / (T.length || 1) * 100)} %`, "", 'data-sec="tramites"')}
    </div>
    ${franjaFamilia(x)}${typeof rdAccionesHTML === "function" && x.fase !== "cerrado" ? `<div style="margin-top:14px">${rdAccionesHTML(x)}</div>` : ""}${typeof lecResumenHTML === "function" ? lecResumenHTML(x) : ""}
    <div class="grid g2" style="margin-top:14px">
      <div class="card next">${p ? `<div><div class="k"><i class="dot ${v.cls === "bad" ? "bad" : v.cls === "warn" ? "warn" : ""}"></i>Siguiente paso</div><div class="title">${esc(p.titulo)}</div><div class="sub">${esc(p.organismo || p.quien || "")}</div><p class="caption" style="margin:12px 0 0;line-height:1.55;max-width:52ch">${esc(p.que.split(". ")[0].replace(/\.$/, ""))}.</p></div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap">${v.q != null ? `<div class="when"><span class="days num ${v.cls}">${Math.abs(v.q)}</span><span class="caption">${v.q < 0 ? "días de retraso" : v.q === 1 ? "día" : "días"}${p.limite ? "<br>" + fechaCorta(p.limite) : ""}</span></div>` : `<div class="caption">${esc(v.txt)}</div>`}<button class="btn sm" data-topen="${p.id}">Abrir</button></div>` : `<div><div class="k"><i class="dot ok"></i>Todo al día</div><div class="title">No quedan trámites pendientes.</div></div>`}</div>
      <div class="card vc">${cardH("Herederos", "Quién hereda y cuánto paga", `<button class="link" data-sec="herencia">Detalle ›</button>`)}${arbol(x, R, { leyenda: false })}</div>
    </div>
    <div class="grid g2" style="margin-top:14px">${(x.bienes || []).some(esInm) ? `<div class="card">${cardH("Inmuebles", plural((x.bienes || []).filter(esInm).length, "inmueble"), `<button class="link" data-sec="herencia">Detalle ›</button>`)}${mapaExp(x, R)}</div>` : ""}
      ${al.length ? `<div class="card">${cardH("Para revisar", `${plural(al.length, "nota")} del cálculo que conviene leer`, `<button class="link" data-sec="impuestos">Impuestos ›</button>`)}<ul class="notes" style="margin:0;padding:0">${al.map((a) => `<li><i class="dot warn"></i><span>${esc(a)}</span></li>`).join("")}</ul></div>` : ""}</div>`;
  const detalle = `<div class="grid g2 eq" style="margin-top:14px"><div>${dgResumen(x, R)}</div><div>${vfResumen(x, R)}</div></div>
    ${(() => { const c = tcResumen(x); return c ? `<div style="margin-top:14px">${c}</div>` : ""; })()}
    <div class="grid g2" style="margin-top:14px">
      <div class="card">${cardH("Trámites", `${hechos} de ${T.length} resueltos`, `<button class="link" data-sec="tramites">Lista ›</button>`)}<div class="ringwrap">${ring(hechos, T.length)}<div class="phasebars">${fases.map(({ f, n, h }) => `<div class="pb"><span>${f.nombre}</span><span class="num">${h}/${n}</span><span class="bar"><i style="width:${Math.round(h / n * 100)}%"></i></span></div>`).join("")}</div></div></div>
      <div class="card">${cardH("Estrategia fiscal", E ? `${fmtK(E.seguro)} de ahorro con riesgo bajo o medio${E.riesgo ? ` · ${fmtK(E.riesgo)} a valorar con el abogado` : ""}` : "Sin palancas identificadas", `<button class="link" data-sec="estrategia">Ver todas ›</button>`)}${E && E.P.some((q) => q.estado === "si") ? `<div class="group" style="--inset:62px">${E.P.filter((q) => q.estado === "si").slice(0, 3).map((q, i) => `<button class="row" data-sec="estrategia"><span class="lxs">${String(i + 1).padStart(2, "0")}</span><span class="t"><b class="sb">${esc(q.titulo)}</b><small>${esc(q.sub || "")}</small></span><span class="v"><b class="num" style="display:block;font-weight:600">${eur0(q.ahorro)}</b>${tagR(q.riesgo)}</span>${I.chev}</button>`).join("")}</div>` : `<p class="caption">Las palancas aparecen aquí cuando el reparto o los plazos permiten pagar menos.</p>`}</div>
    </div>
    <div class="card" style="margin-top:14px">${cardH("Cronograma", "Del fallecimiento a la inscripción", `<button class="link" data-sec="tramites" data-tv="crono">Completo ›</button>`)}${gantt(T.filter((t) => !t.informativo && t.fase !== "despues"), x.fecha, { meses: 13 })}</div>
    ${(() => { const c = shResumen(x, R); return c ? `<div style="margin-top:14px">${c}</div>` : ""; })()}
    <div class="card" style="margin-top:14px">${cardH("Del patrimonio a la familia", "Adónde va cada euro de la herencia", `<button class="link" data-sec="particion">Ver la partición ›</button>`)}${flujo(x, R)}</div>
    <div class="grid g2" style="margin-top:14px"><div class="card">${cardH("Actividad", "Bitácora del expediente", `<button class="link" data-sec="despacho" data-sub="actividad">Completa ›</button>`)}${bitacoraHTML(x, 7)}</div>
      <div class="card">${(() => { const F = fondos(x, R); return `${cardH("Encargo y fondos", "Cuenta del cliente", `<button class="link" data-sec="despacho" data-sub="fondos">Detalle ›</button>`)}<div class="kv"><span>Honorarios presupuestados (IVA incl.)</span><span>${presupuesto(x, R).porCompletar.includes("honorarios") ? '<span class="nu-pcv">por completar</span>' : eur(F.presup)}</span><span>Provisión de fondos recibida</span><span>${eur(F.prov)}</span><span>Suplidos pagados</span><span>${eur(-F.sup)}</span><span>Honorarios aplicados</span><span>${eur(-F.hon)}</span><span class="b">Saldo de fondos del cliente</span><span class="b">${eur(F.saldo)}</span><span>Honorarios pendientes</span><span>${eur(F.pendiente)}</span></div>`; })()}</div></div>
    ${SAMPLE ? `<div style="margin-top:26px"><button class="ask" data-act="ia"><span class="spark">${I.spark}</span>Pregunta sobre este expediente</button><div class="chips">${["Riesgos del expediente", "Documentación pendiente", "Correo al cliente con los próximos pasos"].map((q) => `<button data-iaq="${esc(q)}">${esc(q)}</button>`).join("")}</div></div>` : ""}
    ${esDespacho() && SAMPLE ? auditHTML(x) : ""}`;
  return `${esencial}
    <div class="res-mas"><button data-act="resumenTodo">${todo ? "Ver solo lo esencial" : "Ver todo el resumen: diagnóstico, cronograma, estrategia, fondos y actividad"}</button></div>
    ${todo ? detalle : ""}
    <p class="foot-note">${esc(R.isd.territorio)} · ${esc(R.isd.norma)} ${tagE(R.isd.estadoGlobal)}${R.isd.pendientes.length ? ` · ${plural(R.isd.pendientes.length, "parámetro")} en verificación` : ""}</p>`;
}

function tTramites(x, R, T) {
  const hechos = T.filter((t) => t.st === "hecho").length, curso = T.filter((t) => t.st === "curso").length, pend = T.filter((t) => t.st === "pend").length;
  const vis = ui.tf === "pend" ? T.filter((t) => !cerrado(t)) : T;
  const nSitu = Object.values(x.situ || {}).filter(Boolean).length;
  const nEnl = T.reduce((s, t) => s + enlacesDe(t.id).accion.length + enlacesDe(t.id).norma.length, 0);
  return `<div class="card"><div class="tram-head">${ring(T.filter(cerrado).length, T.length, 96)}<div style="flex:1;min-width:0"><div class="stats"><div><b>${pend}</b><span>Pendientes</span></div><div><b>${curso}</b><span>En curso</span></div><div><b>${hechos}</b><span>Hechos</span></div></div><p class="caption" style="margin:10px 0 0">${plural(T.length, "trámite")} de ${TR_TOTAL} aplican a este caso · ${nEnl} enlaces a sedes oficiales y al BOE.</p></div></div></div>
  <button class="personal" data-act="situ"><span class="ico indigo">${I.sliders}</span><span class="t" style="flex:1"><b>Ajustar al caso</b><small>${nSitu ? plural(nSitu, "situación marcada", "situaciones marcadas") : "Autónomo, pensionista, alquileres, seguro de decesos, bienes en el extranjero…"}</small></span>${I.chev}</button>
  ${typeof tkBloqueHTML === "function" ? tkBloqueHTML(x) : "" /* tareas.js: tareas propias del despacho */}
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:18px"><div class="seg"><button data-tv="lista" aria-pressed="${ui.tv !== "crono"}">Lista</button><button data-tv="crono" aria-pressed="${ui.tv === "crono"}">Cronograma</button></div>${ui.tv !== "crono" ? `<div class="seg"><button data-tf="pend" aria-pressed="${ui.tf === "pend"}">Pendientes</button><button data-tf="todos" aria-pressed="${ui.tf === "todos"}">Todos</button></div>` : `<button class="btn sm gray" data-act="icsx">${I.calplus}Al calendario</button>`}</div>
  ${ui.tv === "crono" ? `<div class="card" style="margin-top:14px">${gantt(T, x.fecha, { meses: 16, plan: true })}<div class="legend-inline" style="margin-top:16px"><span><i style="border:1px dashed var(--label-3)"></i>Ventana orientativa (sin plazo legal)</span><span><i style="background:var(--c1)"></i>Hecho</span><span><i style="box-shadow:inset 0 0 0 1px var(--accent)"></i>En curso</span><span><i style="background:var(--fill)"></i>Pendiente</span><span><i style="box-shadow:inset 0 0 0 1px var(--orange)"></i>Vence en 30 días</span><span><i style="box-shadow:inset 0 0 0 1px var(--red)"></i>Vencido</span><span><i style="background:var(--label-2);width:2px"></i>Hoy</span></div></div>` :
  TR_FASES.map((f) => { const L = vis.filter((t) => t.fase === f.id); const all = T.filter((t) => t.fase === f.id); if (!L.length) return ""; return `<div class="phase-h"><div><b>${f.nombre}</b><small>${f.sub}</small></div><span class="num">${all.filter(cerrado).length} de ${all.length}</span></div>
    <div class="group" style="--inset:54px">${L.map((t) => { const v = vence(t); const ne = enlacesDe(t.id).accion.length; const na = archivoDe(x.id, t.id).length; return `<div class="row ${t.st === "hecho" ? "done" : t.st === "na" ? "na" : ""}">${stBtn(t)}<button class="t" style="text-align:left" data-topen="${t.id}"><b>${esc(t.titulo)}</b><small>${v.txt ? `<span class="due ${v.cls}">${esc(v.txt)}</span>${t.organismo || t.quien ? " · " : ""}` : ""}${esc(t.organismo || t.quien || "")}${ne ? ` · ${plural(ne, "enlace")}` : ""}${na ? ` · ${plural(na, "adjunto")}` : ""}</small></button><button data-topen="${t.id}" aria-label="Abrir">${I.chev}</button></div>`; }).join("")}</div>`; }).join("") || `<div class="card empty" style="margin-top:14px"><b>No quedan trámites pendientes.</b><p>Todos los trámites de este caso están hechos o no aplican. Con «Todos» se ven también los cerrados.</p></div>`}
  <p class="foot-note">Plazos contados desde el fallecimiento. Los marcados «en verificación» deben confirmarse antes de actuar.</p>`;
}

function listaBienes(x) {
  if (!(x.bienes || []).length) return `<div class="group"><div class="empty"><b>Todavía no hay bienes.</b><p>Añade la vivienda, las cuentas o el resto del patrimonio: con un valor aproximado ya se calculan el reparto y los impuestos.</p></div></div>`;
  return `<div class="group" style="--inset:60px">${x.bienes.map((b) => { const [c, ic] = icoBien[b.tipo]; const adj = b.adjudicadoA && persona(x, b.adjudicadoA); return `<button class="row" data-editb="${b.id}"><span class="ico ${c}">${ic}</span><span class="t"><b>${esc(b.descripcion || TIPO_BIEN[b.tipo][0])}</b><small>${b.origen === "familia" ? "Aportado por la familia · " : b.origen === "documento" ? `<span class="orig-doc">Leído de documento</span> · ` : ""}${TIPO_BIEN[b.tipo][0]}${b.titularidad === "ganancial" ? " · gananciales" : b.titularidad === "proindiviso" ? " · " + num(b.porcentaje) + " %" : ""}${b.legatarioId ? " · legado" : ""}${adj ? " · para " + esc(adj.nombre) : ""}${b.municipio && b.municipio !== "OTRO" && ORDENANZAS[b.municipio] ? " · " + ORDENANZAS[b.municipio].nombre : ""}</small></span><span class="v num">${eur0(Math.max(num(b.valor), num(b.valorReferencia)))}</span>${I.chev}</button>`; }).join("")}</div>`;
}
function listaPersonas(x, R) {
  if (!(x.personas || []).length) return `<div class="group"><div class="empty"><b>Todavía no hay herederos.</b><p>Añade al cónyuge, a los hijos o a quien corresponda: el reparto se calcula en cuanto hay una persona y un bien.</p></div></div>`;
  const der = (id) => R ? (R.isd.derechos[id] || []).map((d) => `${d.tipo === "pleno" ? "Propiedad" : d.tipo === "usufructo" ? "Usufructo" : "Nuda propiedad"} ${grp(d.fraccion * 100, d.fraccion * 100 % 1 ? 1 : 0)} %`).join(" · ") : "";
  return `<div class="group" style="--inset:60px">${x.personas.map((p) => `<button class="row" data-editp="${p.id}"><span class="ico ${p.renuncia ? "gray" : "q"}">${I.person}</span><span class="t"><b>${esc(p.nombre || "Sin nombre")}</b><small>${p.origen === "familia" ? "Aportado por la familia · " : p.origen === "documento" ? `<span class="orig-doc">Leído de documento</span> · ` : ""}${RELACIONES[p.relacion].label}${p.edad !== "" && p.edad != null ? " · " + p.edad + " años" : ""}${x.testamento === "porcentajes" ? " · " + (num(p.pct) || 0) + " %" : ""}${p.renuncia ? " · renuncia" : R ? " · " + (der(p.id) || "no hereda en este reparto") : ""}</small></span>${I.chev}</button>`).join("")}</div>`;
}
const ADD_P = [["conyuge", "Cónyuge"], ["pareja_hecho", "Pareja de hecho"], ["hijo", "Hijo/a"], ["nieto", "Nieto/a"], ["padre", "Padre/madre"], ["abuelo", "Abuelo/a"], ["hermano", "Hermano/a"], ["sobrino", "Sobrino/a"], ["tio", "Tío/a"], ["primo", "Primo/a"], ["extrano", "Otra persona"]];
// H43: un solo cónyuge o pareja: «+ Cónyuge» y «+ Pareja de hecho» desaparecen cuando ya hay uno (no separado)
const addP = (x) => { const hay = (x.personas || []).some((p) => (p.relacion === "conyuge" || p.relacion === "pareja_hecho") && !p.separado); return hay ? ADD_P.filter(([r]) => r !== "conyuge" && r !== "pareja_hecho") : ADD_P; };
function tHerencia(x, R) {
  const m = R.isd.masa; const C = composicion(x);
  return `${typeof bloqueoRepartoHTML === "function" ? bloqueoRepartoHTML(x, R) : ""}<div class="card">${cardH("Árbol familiar", "Toca a una persona para editarla", `<button class="btn sm gray" data-act="addPersona">${I.plus}Añadir persona</button>`)}${arbol(x, R)}</div>
    <div class="sectitle flex"><b>Herederos y reparto</b></div>${listaPersonas(x, R)}
    <div class="group" style="margin-top:12px"><ul class="notes">${frLeyRepartoHTML(R)}${R.isd.notasReparto.map((n) => `<li><i class="dot gold"></i><span>${esc(n)}</span></li>`).join("")}</ul></div>
    <div style="margin-top:14px">${tLegitimas(x, R)}</div>
    <div class="sectitle flex"><b>Bienes</b><span class="num">${eur0(m.brutoTotal)}</span></div>
    <div class="grid g2" style="margin-bottom:14px"><div class="card vc">${cardH("Composición", `Parte del causante · ${eur0(C.reduce((a, c) => a + c.v, 0))}`)}<div class="comp">${donut(C)}<div class="legend">${(() => { const P = pctReparto(C.map((c) => c.v)); return C.map((c, i) => [c, P[i]]).filter(([c]) => c.v > 0).map(([c, p]) => `<div><i style="background:${c.color}"></i><span>${c.n}</span><span>${eur0(c.v)}</span><span>${p} %</span></div>`).join(""); })()}</div></div></div>
      <div class="card">${cardH("Situación", "")}${mapaExp(x, R).split('<div class="group"')[0]}</div></div>
    ${listaBienes(x)}
    <div style="margin-top:12px"><button class="btn sm gray" data-act="addBien">${I.plus}Añadir bien</button></div>
    <div class="grid g2 eq" style="margin-top:14px">
      <div class="card">${cardH("Del caudal a los herederos", "Cascada del patrimonio")}${cascada(x, R)}</div>
      <div class="card">${cardH("Por heredero", "Lo que recibe y lo que paga")}${barrasHerederos(R)}</div>
    </div>
    <div class="sectitle flex"><b>Cómo se forma la herencia</b></div>
    <div class="grid g2"><div class="card" style="padding:6px 22px"><div class="kv">
      <span>Valor total de los bienes</span><span>${eur(m.brutoTotal)}</span>
      ${m.gananciales ? `<span>Mitad de gananciales del viudo</span><span>${eur(-m.mitadViudo)}</span>` : ""}
      ${m.brutoTotal - m.gananciales / 2 - m.bruto > 1 ? `<span>Partes de otros copropietarios</span><span>${eur(-(m.brutoTotal - m.gananciales / 2 - m.bruto))}</span>` : ""}
      <span class="b">Caudal del causante</span><span class="b">${eur(m.bruto)}</span>
      <span>Deudas</span><span>${eur(-m.deudas)}</span>
      <span>Funeral y última enfermedad</span><span>${eur(-m.gastos)}</span>
      <span class="b">Herencia neta</span><span class="b">${eur(m.neto)}</span>
      ${m.legados ? `<span>Legados</span><span>${eur(-m.legados)}</span><span>Resto a repartir</span><span>${eur(m.netoReparto)}</span>` : ""}
      <span>Ajuar doméstico (solo para el impuesto)</span><span>${eur(m.ajuar)}</span>
    </div></div><div class="card">${cascada(x, R)}</div></div>
    <p class="group-foot">${esc(m.notaAjuar)}</p>
    <div class="group" style="margin-top:12px"><button class="row" data-act="deudas"><span class="ico red">${I.tax}</span><span class="t"><b>Deudas y gastos</b><small>Hipoteca, otras deudas y funeral</small></span><span class="v num">${eur0(m.deudas + m.gastos)}</span>${I.chev}</button></div>
    <div style="margin-top:16px"><button class="btn gray sm" data-act="editar">Revisar con el asistente</button></div>`;
}

function tImpuestos(x, R) {
  const E = estrategia(x), K = costeExpediente(x, R);
  const HH = R.isd.herederos; const hs = HH.find((h) => h.id === ui.hsel) || HH[0];
  return `${typeof bloqueoRepartoHTML === "function" ? bloqueoRepartoHTML(x, R) : ""}<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">${kpi("Sucesiones", eur0(R.isd.total), R.isd.recargo && R.isd.recargo.importe ? `${esc(R.isd.territorio)} · más recargo ${eur0(R.isd.recargo.importe)}` : esc(R.isd.territorio), "suc")}${kpi("Plusvalía", eur0(R.totalPlus), plural(R.plus.length, "inmueble"), "plu")}${K && K.exceso ? kpi("Exceso de adjudicación", eur0(K.exceso), "AJD/TPO · ver Partición", "", 'data-sec="particion"') : ""}${kpi("Total", eur0(K ? K.total : R.isd.total + R.totalPlus), "coste fiscal de la herencia")}${E ? kpi("Ahorro fiscal hoy", eur0(E.seguro), "ver estrategia", "gold", 'data-sec="estrategia"') : ""}</div>
    ${x.ccaa === "AND" ? `<div class="infobar" style="margin-top:14px"><span class="ico gold">${I.info}</span><span>Andalucía: un <b>modelo 650</b> por heredero y el <b>660</b> con la relación de bienes, en seis meses. Prórroga con el modelo 659 en los cinco primeros. Se presenta aunque salga 0 €. <a href="${SEDES.ata650}" target="_blank" rel="noopener">Programa de ayuda ${I.ext.replace("<svg", '<svg width="13" height="13"')}</a></span></div>` : ""}
    ${x.ccaa === "EST" ? `<div class="infobar" style="margin-top:12px"><span class="ico teal">${I.info}</span><span>${x.ccaaBienes ? `No residente: se aplica la normativa de <b>${esc(nombreTerr(x.ccaaBienes))}</b>, donde está la mayor parte de los bienes (disposición adicional 2.ª Ley 29/1987).` : "No residente: se aplica la ley estatal. Si la mayoría de los bienes está en una comunidad, puede aplicarse su normativa: indícalo en el asistente."}</span></div>` : ""}
    <div class="pdfbar"><span><b>Informe de cálculo</b><small>Masa, reparto, Sucesiones paso a paso, plusvalía, partición y totales, con el membrete del despacho.</small></span><button class="btn sm" data-act="informePdf">${I.dl}Descargar PDF</button></div>
    <div class="sectitle flex"><b>Sucesiones, paso a paso</b><span>${esc(R.isd.territorio)}</span></div>
    ${HH.length > 1 ? `<div class="hpills" role="tablist" aria-label="Sucesiones por heredero">${HH.map((h) => `<button role="tab" data-hsel="${h.id}" aria-selected="${h.id === hs.id}"><span>${esc(h.nombre)}</span><b class="num">${eur0(h.aIngresar)}</b></button>`).join("")}</div>` : ""}
    ${hs ? `<div class="card" style="margin-top:10px">${panelHeredero(x, R, hs)}</div>` : ""}
    <div class="sectitle flex"><b>Plusvalía municipal</b><span class="num">${eur(R.totalPlus)}</span></div>
    ${R.plus.length ? `<div class="grid" style="gap:12px">${R.plus.map(({ b, r }) => formulaPlus(x, b, r)).join("")}</div>` : !(x.bienes || []).some(esInm) ? `<div class="card empty"><b>No hay inmuebles en la herencia.</b><p>Sin inmuebles urbanos no hay plusvalía municipal.</p></div>` : `<div class="card empty"><b>Faltan datos para calcular la plusvalía.</b><p>Completa en cada inmueble el valor catastral total y el del suelo (recibo del IBI) y la fecha de adquisición.</p><div class="acts"><button class="btn sm gray" data-sec="herencia">Ir a los inmuebles</button></div></div>`}
    ${HH.length > 1 ? `<div class="sectitle flex"><b>Total por heredero</b><span>Sucesiones y plusvalía · toca una fila para ver su cálculo</span></div>${tablaHerederos(R, hs && hs.id)}` : ""}
    <div style="margin-top:22px">${simulador(x, R)}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="btn" data-doc="liquidacion">${I.law}Propuesta de liquidación</button><button class="btn gray" data-sec="estrategia">${I.scale}Estrategia fiscal</button></div>
    <div class="sectitle">Opciones del cálculo</div>
    <div class="group">
      ${(() => { const terr = x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa, cur = R.isd.masa.modoAjuar; const ops = [["residencial", "Solo viviendas"], ...(terr === "AND" ? [["ata", "Criterio ATA"]] : []), ["3pct", "3 % de todo"], ["cero", "Sin ajuar"]]; const hint = { residencial: "3 % de las viviendas de uso residencial no alquiladas ni cedidas (STS 499/2020; TEAC 30-05-2025).", ata: "Criterio de la Agencia Tributaria de Andalucía: bienes de uso personal. Práctica real pendiente de confirmar.", "3pct": "Opción manual: el Supremo excluye dinero, valores e inmuebles no residenciales.", cero: "Se declara o prueba que no hay ajuar." }[cur] || ""; return `<div class="field"><label>Ajuar doméstico</label><div class="seg" style="margin-top:6px">${ops.map(([k, t]) => `<button data-ajuar="${k}" aria-pressed="${cur === k}">${t}</button>`).join("")}</div><span class="hint">${hint}</span></div>`; })()}
      ${x.ccaa === "AND" || x.ccaaBienes === "AND" ? `<div class="field"><label>Reducción por vivienda habitual</label><div class="seg" style="margin-top:6px"><button data-cviv="DGT" aria-pressed="${(x.criterioVivienda || "DGT") !== "TSJA2026"}">Por cuotas (ATA)</button><button data-cviv="TSJA2026" aria-pressed="${x.criterioVivienda === "TSJA2026"}" ${x.viviendaA ? "" : "disabled"}>Al adjudicatario (TSJA)</button></div>${x.viviendaA ? "" : `<span class="hint">El criterio del adjudicatario se activa desde Estrategia.</span>`}</div>` : ""}
      ${x.ccaa === "MAD" || x.ccaaBienes === "MAD" ? `<div class="row toggle"><span class="t"><b>Se ha recibido requerimiento de la Administración</b><small>En Madrid el grupo III pierde la bonificación por lo que se declare después</small></span><label class="switch"><input type="checkbox" data-opt="requerimiento" ${x.requerimiento ? "checked" : ""}><span></span></label></div>` : ""}
      <div class="row toggle"><span class="t"><b>Se presentará dentro de plazo</b>${typeof dgPlazoHint === "function" ? `<small>${esc(dgPlazoHint(x, R))}</small>` : ""}</span><label class="switch"><input type="checkbox" data-opt="enPlazo" ${(typeof enPlazoExp === "function" ? enPlazoExp(x) : x.enPlazo !== false) ? "checked" : ""}><span></span></label></div>
      <div class="row toggle"><span class="t"><b>No aplicar la reducción por vivienda</b><small>Si se venderá antes del plazo de mantenimiento</small></span><label class="switch"><input type="checkbox" data-opt="noAplicarVivienda" ${x.noAplicarVivienda ? "checked" : ""}><span></span></label></div>
      <div class="row toggle"><span class="t"><b>Reducción por empresa familiar</b></span><label class="switch"><input type="checkbox" data-opt="aplicarEmpresa" ${x.aplicarEmpresa ? "checked" : ""}><span></span></label></div>
    </div>
    ${R.isd.pendientes.length ? `<div class="sectitle">En verificación con el boletín oficial</div><div class="group"><ul class="notes">${R.isd.pendientes.map((p) => `<li><i class="dot warn"></i><span>${esc(p)}</span></li>`).join("")}</ul></div>` : ""}
    <p class="foot-note">Estimación con la normativa vigente a la fecha del fallecimiento. La revisa un profesional antes de presentar.</p>`;
}

function tEstrategia(x, R) {
  const E = estrategia(x); if (!E) return "";
  const n = { v: 0 };
  const lever = (p) => { const i = String(++n.v).padStart(2, "0"); const on = p.estado === "si"; return `<details class="lever ${on ? "si" : p.estado === "no" || p.estado === "hecho" ? "no" : ""}" ${on && n.v <= 2 ? "open" : ""}><summary><span class="lx">${p.estado === "hecho" ? I.tick.replace("<svg", '<svg width="14" height="14"') : i}</span><span style="min-width:0"><h4>${esc(p.titulo)}</h4><small>${esc(p.sub || "")}</small></span>${on || (p.estado === "info" && p.ahorro) ? `<span class="sv">${eur0(p.ahorro)}<small>${on ? tagR(p.riesgo) : "informativo"}</small></span>` : `<span class="status neutral">${p.estado === "hecho" ? "Aplicado" : p.estado === "no" ? "No aplica" : p.estado === "valorar" ? "A valorar" : "Informativo"}</span>`}</summary>
    <div class="lb">${p.cuerpo || ""}<p class="cita">${I.law.replace("<svg", '<svg width="13" height="13" style="vertical-align:-2px;margin-right:4px"')}${esc(p.norma || "")}</p>${p.aplicar ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn sm gray" data-palanca="${p.id}">Probar como escenario</button></div>` : ""}</div></details>`; };
  const si = E.P.filter((p) => p.estado === "si"), val = E.P.filter((p) => p.estado === "valorar"), resto = E.P.filter((p) => p.estado !== "si" && p.estado !== "valorar");
  return `<div class="hero-save"><div><div class="kick">Coste fiscal actual</div><b>${eur0(E.base.total)}</b><small>Sucesiones ${eur0(E.base.isd)} · plusvalía ${eur0(E.base.plus)}${E.base.exceso ? " · exceso " + eur0(E.base.exceso) : ""}</small></div><div class="g"><div class="kick">Ahorro identificado</div><b>${eur0(E.seguro)}</b><small>${plural(si.filter((p) => ["bajo", "medio"].includes(p.riesgo)).length, "palanca")} de riesgo bajo o medio</small></div><div><div class="kick">A valorar con el abogado</div><b style="color:var(--label-2)">${eur0(E.riesgo)}</b><small>Solo con informe expreso al cliente</small></div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn" data-doc="liquidacion">${I.law}Propuesta de liquidación</button></div>
    ${si.length ? `<div class="sectitle flex"><b>Recomendadas</b><span>${plural(si.length, "palanca")}</span></div><div class="grid" style="gap:10px">${si.map(lever).join("")}</div>` : `<div class="card empty" style="margin-top:18px"><b>Sin ahorros relevantes</b>Con los datos actuales no hay palancas que bajen el coste más de 100 €. Revisa las evaluadas abajo.</div>`}
    ${val.length ? `<div class="sectitle flex"><b>A valorar con el abogado</b><span>${plural(val.length, "palanca")}</span></div><div class="grid" style="gap:10px">${val.map(lever).join("")}</div>` : ""}
    <div class="sectitle flex"><b>Evaluadas</b><span>${plural(resto.length, "palanca")}</span></div><div class="grid" style="gap:10px">${resto.map(lever).join("")}</div>
    <p class="foot-note">Cada palanca se calcula simulando el expediente con el cambio. «Probar como escenario» crea una copia con el cambio aplicado para compararla. Las propuestas no sustituyen el criterio del abogado.</p>`;
}

const DOCS = [["liquidacion", "Propuesta de liquidación", "Sucesiones, plusvalía, estrategia, adjudicación y plazos"], ["notaria", "Nota para la notaría", "Causante, título, herederos, inventario, adjudicación y documentación"], ["escritura", "Borrador de escritura de herencia", "Manifestación, aceptación y adjudicación, en estilo notarial"], ["cuaderno", "Cuaderno particional", "Inventario, avalúo, liquidación, lotes y adjudicaciones"], ["recibi", "Liquidación final y recibí", "Lo que recibe cada heredero, cuenta de fondos y recibí"], ["informe", "Informe para el cliente", "Qué hay, cuánto se paga, quién recibe qué y los próximos pasos"], ["cartaFamilia", "Carta a la familia", "Documentos que faltan, agrupados y con dónde se piden"], ["banco", "Carta al banco", "Comunica el fallecimiento y pide certificados sin aceptar la herencia"], ["solicitud790", "Solicitud de certificados (modelo 790)", "Últimas voluntades y seguros, con los datos del causante"], ["certificados", "Guía de certificados", "Últimas voluntades y seguros, paso a paso"], ["acuerdo", "Acuerdo entre herederos", "Quién coordina y cómo se reparten los gastos"], ["prorroga", "Solicitud de prórroga", "Seis meses más para el Impuesto sobre Sucesiones"], ["renuncia", "Escritura de renuncia", "Renuncia pura y simple ante notario (art. 1008 CC)"], ["unico", "Instancia de heredero único", "Inscribir inmuebles sin escritura (art. 14 LH)"], ["plusvalia", "Declaración de plusvalía", "Al ayuntamiento, con la liquidación de cada inmueble"], ["catastro", "Cambio de titular en el Catastro", "Modelo 900D, si no lo comunica el notario"], ["encargo", "Hoja de encargo y presupuesto", "Encargo profesional con honorarios y suplidos"]];
function docsDisponibles(x) {
  const vivos = (x.personas || []).filter((p) => !p.renuncia);
  const unico = (x.personas || []).length === 1 && vivos.length === 1 && num(vivos[0].edad) >= 18 && !(x.bienes || []).some((b) => b.titularidad === "ganancial");
  const inm = (x.bienes || []).some((b) => b.tipo === "vivienda" || b.tipo === "inmueble");
  return DOCS.filter(([k]) => (k !== "unico" || unico) && (k !== "encargo" || esDespacho()) && (k !== "acuerdo" || vivos.length > 1) && (k !== "cuaderno" || vivos.length > 1) && (k !== "escritura" || vivos.length > 0) && ((k !== "catastro" && k !== "plusvalia") || inm));
}
function escritos(x) {
  const menores = (x.personas || []).some((p) => !p.renuncia && p.edad !== "" && p.edad != null && num(p.edad) < 18);
  return `${menores ? `<div class="infobar" style="margin-bottom:14px"><span class="ico orange">${I.info}</span><span>Hay herederos menores: sus padres los representan salvo conflicto de intereses (defensor judicial, art. 163 CC); para renunciar en su nombre hace falta autorización judicial (art. 166 CC).</span></div>` : ""}
    <div class="docgrid">${docsDisponibles(x).map(([k, t, s]) => `<button class="doccard" data-doc="${k}"><span class="paper"><i style="top:9px"></i><i style="top:16px"></i><i style="top:22px;right:14px"></i><i style="top:28px"></i><i style="top:34px;right:18px"></i><i style="top:40px"></i></span><span><b>${t}</b><small>${s}</small></span></button>`).join("")}</div>
    <p class="foot-note">Borradores con los datos del expediente, descargables en Word. Lo marcado en amarillo lo completa o revisa el abogado.</p>`;
}
function filaArchivo(d, x) {
  const img = /^image\//.test(d.tipo); const e = archEstado(d);
  const cat = (CATS.find((c) => c[0] === d.cat) || [, "Otros"])[1];
  const det = d.tipoLeido && typeof LEC_TIPOS === "object" && d.tipoLeido !== "desconocido" ? LEC_TIPOS[d.tipoLeido] : "";
  const origen = d.tramiteId ? `Trámite · ${dtTitulo(x, d.tramiteId)}` : d.leido ? "Leído: datos propuestos" : "Subido al archivo";
  return `<button class="doc-row ${d.estado === "obsoleto" ? "obs" : ""}" data-fver="${d.id}"><span class="doc-th">${img ? `<img src="${urlDe(d)}" alt="">` : `<span class="ext">${esc(extDe(d.nombre))}</span>`}</span><span class="doc-n"><b>${esc(d.nombre)}</b><small>${det ? `Detectado: ${esc(det)} · ` : ""}${tamTxt(d.tam)}</small></span><span class="doc-c">${esc(cat)}</span><span class="doc-o">${esc(origen)}</span><span class="doc-f num">${fechaCorta(d.fecha.slice(0, 10))}</span><span class="doc-e"><span class="chip ${e[2]}">${e[1]}</span></span></button>`;
}
function tDocumentos(x) {
  if (!ARCH.listo) { archivoCargar().then(render); }
  const A = archivoDe(x.id);
  const fil = ui.dfil || "todos", q = (ui.dq || "").trim().toLowerCase(), dc = ui.dcat || "";
  const AF = (fil === "revisar" ? A.filter((d) => d.estado === "revisar") : fil === "validado" ? A.filter((d) => d.estado === "validado") : A).filter((d) => (!q || d.nombre.toLowerCase().includes(q)) && (!dc || d.cat === dc));
  const nRev = A.filter((d) => d.estado === "revisar").length, nVal = A.filter((d) => d.estado === "validado").length;
  const cats = CATS.filter(([k]) => A.some((d) => d.cat === k));
  const nec = docsNecesarios(x), nOk = nec.filter(([id]) => x.despacho?.docs?.[id]).length;
  const skel = `<div class="card doc-list" aria-busy="true" aria-label="Cargando los documentos">${[0, 1, 2].map(() => `<div class="skel-row"><span class="skel" style="width:34px;height:40px"></span><span style="flex:1;display:grid;gap:6px"><span class="skel" style="width:46%;height:12px"></span><span class="skel" style="width:24%;height:10px"></span></span><span class="skel" style="width:70px;height:20px"></span></div>`).join("")}</div>`;
  const vacio = `<div class="card doc-vacio"><div class="dv-t"><b>Todavía no hay documentos en este expediente.</b><p>Sube el certificado de defunción, el de últimas voluntades, el testamento, las notas simples, el IBI, los DNI y los certificados del banco. Se archivan por tipo y se leen para proponer datos al expediente: nada se guarda hasta que lo revisas.</p></div>${zonaSubida("", "Subir los primeros documentos")}</div>`;
  const lista = `<div class="doc-tools"><div class="seg"><button data-dfil="todos" aria-pressed="${fil === "todos"}">Todos <span class="num">${A.length}</span></button><button data-dfil="revisar" aria-pressed="${fil === "revisar"}">Por revisar${nRev ? ` <span class="num">${nRev}</span>` : ""}</button><button data-dfil="validado" aria-pressed="${fil === "validado"}">Validados${nVal ? ` <span class="num">${nVal}</span>` : ""}</button></div>
      <div class="search doc-q">${I.search}<input id="d-q" placeholder="Buscar por nombre" value="${esc(ui.dq || "")}" autocomplete="off" aria-label="Buscar documentos"></div>
      ${cats.length > 1 ? `<select id="d-cat" class="padj doc-cat" aria-label="Filtrar por tipo"><option value="">Todos los tipos</option>${cats.map(([k, n]) => `<option value="${k}" ${dc === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>` : ""}
      <label class="btn sm doc-up">${I.plus}Añadir documentos<input type="file" multiple data-subir="" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"></label></div>
    ${nRev ? `<div class="infobar doc-rev"><span class="ico orange">${I.info}</span><span class="t"><b>${plural(nRev, "documento leído con datos por revisar", "documentos leídos con datos por revisar")}.</b> Lo detectado es una propuesta: compruébalo con el original antes de darlo por bueno y marca el documento como validado.</span>${fil !== "revisar" ? `<button class="btn sm gray" data-dfil="revisar">Ver por revisar</button>` : ""}</div>` : ""}
    ${AF.length ? `<div class="card doc-list"><div class="doc-h" aria-hidden="true"><span></span><span>Documento</span><span>Tipo</span><span>Origen</span><span>Fecha</span><span>Estado</span></div>${AF.map((d) => filaArchivo(d, x)).join("")}</div>` : `<div class="card empty"><b>Ningún documento coincide con el filtro.</b><p>Cambia el estado, el tipo o la búsqueda.</p><div class="acts"><button class="btn sm gray" data-dfil="todos">Ver todos</button></div></div>`}
    ${zonaSubida("", "Arrastra aquí más documentos").replace('class="drop"', 'class="drop compact"')}`;
  const archivo = `${!ARCH.listo ? skel : A.length ? lista : vacio}
    ${ARCH.listo && !ARCH.persistente ? `<p class="group-foot" style="color:var(--warning)">Este navegador no permite guardar archivos: se conservarán solo mientras la página esté abierta.</p>` : ""}
    <div class="sectitle flex"><b>Lo que hace falta</b><span class="doc-prog"><span class="mbar"><i style="width:${Math.round(nOk / (nec.length || 1) * 100)}%"></i></span>${nOk} de ${nec.length} recibidos</span></div>
    <div class="group" style="--inset:54px">${nec.map(([id, tt, s]) => { const on = !!x.despacho?.docs?.[id]; return `<div class="row ${on ? "done" : ""}"><button class="st ${on ? "hecho" : ""}" data-docrec="${id}" aria-label="${on ? "Marcar como pendiente" : "Marcar como recibido"}" aria-pressed="${on}">${on ? I.tick : ""}</button><span class="t"><b>${esc(tt)}</b><small>${esc(s)}</small></span></div>`; }).join("")}</div>`;
  return `<div class="seg" style="margin-bottom:18px"><button data-dsub="archivo" aria-pressed="${ui.dsub !== "escritos"}">Archivo${A.length ? " · " + A.length : ""}</button><button data-dsub="escritos" aria-pressed="${ui.dsub === "escritos"}">Escritos</button></div>${ui.dsub === "escritos" ? escritos(x) : archivo}`;
}

function tDespacho(x, R) {
  const d = x.despacho || {};
  const sub = ["encargo", "fondos", "tiempos", "docs", "650", "actividad"].includes(ui.sub) ? ui.sub : "encargo";
  const subs = [["encargo", "Encargo y cliente"], ["fondos", "Honorarios y fondos"], ["tiempos", "Tiempos"], ["docs", "Documentación"], ["650", "Cifras 650/660"], ["actividad", "Actividad"]];
  const D = despachoCfg();
  let body = "";
  if (sub === "encargo") {
    const P = R ? presupuesto(x, R) : null;
    const C = conflictos(x);
    const chk = d.checks || {};
    const CH = [["ident", "Identificación del cliente verificada (DNI o NIE)"], ["encargo", "Hoja de encargo firmada con presupuesto previo"], ["conflicto", "Conflicto de intereses revisado"], ["blanqueo", "Diligencia debida de la Ley 10/2010, si el encargo incluye gestión de fondos o inmuebles"], ["datos", "Información de protección de datos entregada al cliente"]];
    body = `<div class="grid g2"><div>
      <div class="sectitle" style="margin-top:0">Cliente</div>
      <div class="group"><div class="field"><label for="d-c">Nombre o razón social</label><input id="d-c" data-dsp="cliente" value="${esc(d.cliente)}" placeholder="Quién encarga el asunto"></div><div class="field"><label for="d-nif">NIF</label><input id="d-nif" data-dsp="nif" value="${esc(d.nif)}" placeholder="Documento de identidad"></div><div class="field"><label for="d-em">Correo electrónico</label><input id="d-em" type="email" data-dsp="email" value="${esc(d.email)}" placeholder="correo@ejemplo.es"></div><div class="field"><label for="d-tel">Teléfono</label><input id="d-tel" inputmode="tel" data-dsp="tel" value="${esc(d.tel)}" placeholder="600 000 000"></div><div class="field"><label for="d-dom">Domicilio</label><input id="d-dom" data-dsp="domicilio" value="${esc(d.domicilio)}" placeholder="Calle, número, código postal y localidad"></div></div>
      <div class="sectitle">Expediente</div>
      <div class="group"><div class="field"><label for="d-r">Referencia</label><input id="d-r" data-dsp="ref" value="${esc(d.ref)}" placeholder="${nuevaRef()}"></div><div class="field"><label for="d-resp">Abogado responsable</label><select id="d-resp" data-resp="1"><option value="">Sin asignar</option>${D.abogados.map((a) => `<option value="${a.id}" ${x.responsable === a.id ? "selected" : ""}>${esc(a.nombre)} · ${esc(a.rol || "")}</option>`).join("")}</select></div><div class="field"><label for="d-alta">Fecha del encargo</label><input id="d-alta" type="date" data-dsp="alta" value="${esc(d.alta || x.creado || "")}"></div></div>
      <div class="sectitle">Cumplimiento</div>
      <div class="group" style="--inset:54px">${CH.map(([k, t]) => { const on = !!chk[k]; return `<div class="row"><button class="st ${on ? "hecho" : ""}" data-chk="${k}" aria-label="Marcar">${on ? I.tick : ""}</button><span class="t"><b style="font-size:14.5px">${t}</b></span></div>`; }).join("")}</div>
      <div class="infobar" style="margin-top:12px"><span class="ico ${C.length ? "orange" : "green"}">${I.info}</span><span>${C.length ? `<b>${plural(C.length, "coincidencia", "coincidencias")} con otros expedientes.</b><br>${C.slice(0, 6).map((c) => `${esc(c.nombre)}: aquí ${esc(c.aqui.toLowerCase())}, en <button class="link" data-open="${c.y.id}" style="font-size:14px">${esc(c.y.despacho?.ref || nombreExp(c.y))}</button> ${esc(c.alli.toLowerCase())}`).join("<br>")}` : "Sin coincidencias de nombres con el resto de la cartera."}</span></div>
      ${tarjetaFamilia(x)}
    </div><div>
      <div class="sectitle" style="margin-top:0">Honorarios</div>
      ${P ? `<div class="group"><div class="field"><label>Forma de cálculo</label><div class="seg" style="margin-top:6px"><button data-hon="fijo" aria-pressed="${P.modo === "fijo"}">Importe cerrado</button><button data-hon="pct" aria-pressed="${P.modo === "pct"}">% del caudal</button></div></div>
        ${(() => { const S = presupuestoSugerido(x), ph = (k) => `placeholder="Por completar (orientativo: ${grp(S[k], 0)})"`; return `${P.modo === "fijo" ? `<div class="field"><label for="d-hf">Honorarios (€, sin IVA)</label><input id="d-hf" inputmode="decimal" data-dsp="honFijo" value="${numStr(d.honFijo)}" ${ph("honFijo")}></div>` : `<div class="field"><label for="d-hp">Porcentaje sobre el caudal (%)</label><input id="d-hp" inputmode="decimal" data-dsp="honPct" value="${numStr(d.honPct)}" ${ph("honPct")}></div><div class="field"><label for="d-hm">Mínimo (€)</label><input id="d-hm" inputmode="decimal" data-dsp="honMin" value="${numStr(d.honMin)}" ${ph("honMin")}></div>`}
        <div class="field"><label for="d-no">Notaría estimada (€)</label><input id="d-no" inputmode="decimal" data-dsp="notaria" value="${numStr(d.notaria)}" ${ph("notaria")}></div><div class="field"><label for="d-re">Registro estimado (€)</label><input id="d-re" inputmode="decimal" data-dsp="registro" value="${numStr(d.registro)}" ${ph("registro")}></div><div class="field"><label for="d-ot">Certificados, tasas y otros (€)</label><input id="d-ot" inputmode="decimal" data-dsp="otros" value="${numStr(d.otros)}" ${ph("otros")}></div>`; })()}</div>
      <div class="card" style="margin-top:14px">${cardH("Presupuesto al cliente", P.completo ? "" : "Por completar: los importes en blanco cuentan 0 €")}${P.completo ? "" : `<p class="caption nu-pc">${P.porCompletar.length > 1 || ["honorarios", "otros"].includes(P.porCompletar[0]) ? "Faltan" : "Falta"} ${P.porCompletar.map((k) => ({ honorarios: "los honorarios", notaria: "la notaría", registro: "el registro", otros: "certificados y tasas" })[k]).join(", ").replace(/, ([^,]*)$/, " y $1")}. Hasta completarlo, la hoja de encargo y el informe lo indican como pendiente.</p>`}<div class="kv"><span>Honorarios</span><span>${P.porCompletar.includes("honorarios") ? '<span class="nu-pcv">por completar</span>' : eur(P.honorarios)}</span>${tmResumenExp(x, R) ? `<span>Tiempo registrado</span><span>${tmResumenExp(x, R)}</span>` : ""}<span>IVA (21 %)</span><span>${eur(P.iva)}</span><span>Suplidos estimados</span><span>${eur(P.suplidos)}${["notaria", "registro", "otros"].some((k) => P.porCompletar.includes(k)) ? ' <span class="nu-pcv">incompleto</span>' : ""}</span><span class="b">Coste del servicio</span><span class="b">${eur(P.total)}</span><span>Impuestos estimados de la herencia</span><span>${eur(P.impuestos)}</span><span class="b">Total a prever</span><span class="b">${eur(P.total + P.impuestos)}</span></div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn" data-doc="encargo">Hoja de encargo</button><button class="btn gray" data-doc="informe">Informe para el cliente</button></div>` : `<p class="caption">Completa los datos de la herencia para calcular el presupuesto.</p>`}
    </div></div>`;
  }
  if (sub === "fondos") {
    const F = fondos(x, R);
    body = `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${presupuesto(x, R).porCompletar.includes("honorarios") ? kpi("Honorarios presupuestados", "—", "por completar en Encargo") : kpi("Honorarios presupuestados", eur0(F.presup), "IVA incluido")}${kpi("Provisión recibida", eur0(F.prov), "")}${kpi("Suplidos pagados", eur0(F.sup), "")}${kpi("Honorarios aplicados", eur0(F.hon), `pendientes ${eur0(F.pendiente)}`)}${kpi("Saldo del cliente", eur0(F.saldo), F.saldo < 0 ? "el despacho ha adelantado fondos" : "en cuenta de clientes", F.saldo < 0 ? "bad" : "gold")}</div>
      <div class="sectitle">Nuevo movimiento</div>
      <div class="card movform"><select id="m-t" aria-label="Tipo">${Object.entries(MOV_T).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join("")}</select><input id="m-c" placeholder="Concepto (ej.: provisión inicial, notaría, registro, modelo 650)"><input id="m-i" inputmode="decimal" placeholder="Importe €"><input id="m-f" type="date" value="${hoy()}" aria-label="Fecha del movimiento"><button class="btn sm" data-act="addMov">Añadir</button></div>
      <div class="sectitle flex"><b>Movimientos</b><span>${F.M.length}</span></div>
      ${F.M.length ? `<div class="tablewrap card" style="padding:0"><table class="grid-t"><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th class="n">Importe</th><th></th></tr></thead><tbody>${[...F.M].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((m) => `<tr><td class="mono">${fechaCorta(m.fecha)}</td><td>${esc(MOV_T[m.tipo][0])}</td><td>${esc(m.concepto)}</td><td class="n" style="color:${MOV_T[m.tipo][1] > 0 ? "var(--green)" : "var(--label)"}">${MOV_T[m.tipo][1] > 0 ? "+" : MOV_T[m.tipo][1] < 0 ? "−" : ""}${eur(num(m.importe))}</td><td class="n"><button class="tbtn" data-delmov="${m.id}" aria-label="Eliminar">${I.trash}</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="caption">Sin movimientos. Registra la provisión de fondos y cada pago hecho por cuenta del cliente.</p>`}
      <p class="foot-note">Control interno de los fondos del cliente (Código Deontológico, art. 19: fondos ajenos en cuenta separada). No sustituye a la factura: las minutas se emiten con el programa de facturación del despacho.</p>`;
  }
  if (sub === "tiempos") body = tTiempos(x, R);
  if (sub === "docs") {
    const L = docsNecesarios(x); const hechos = L.filter(([id]) => d.docs?.[id]).length;
    body = `<div class="card" style="display:flex;align-items:center;gap:20px">${ring(hechos, L.length, 84)}<div><div class="k">Documentación recibida</div><div class="mid">${hechos} de ${L.length}</div></div><div style="margin-left:auto"><button class="btn sm" data-act="copiarSolicitud">Copiar la petición al cliente</button></div></div>
    <div class="group" style="margin-top:14px;--inset:54px">${L.map(([id, t, s]) => { const on = !!d.docs?.[id]; return `<div class="row ${on ? "done" : ""}"><button class="st ${on ? "hecho" : ""}" data-docrec="${id}" aria-label="Marcar como recibido">${on ? I.tick : ""}</button><span class="t"><b>${esc(t)}</b><small>${esc(s)}</small></span></div>`; }).join("")}</div>`;
  }
  if (sub === "650") body = R ? hoja650(x, R) : "";
  if (sub === "actividad") body = `<div class="card movform" style="grid-template-columns:1fr auto"><input id="n-t" placeholder="Anotar una llamada, una gestión o un acuerdo con el cliente"><button class="btn sm" data-act="addNota">Anotar</button></div><div class="card" style="margin-top:14px">${bitacoraHTML(x)}</div>`;
  if (sub === "actividad" && typeof auExpHTML === "function") body += auExpHTML(x); // auditoria.js: quién cambió qué datos críticos
  return `<div class="seg" style="margin-bottom:18px">${subs.map(([k, t]) => `<button data-sub="${k}" aria-pressed="${sub === k}">${t}</button>`).join("")}</div>${body}`;
}
function auditHTML(x) {
  const A = ui.audit && ui.audit.id === x.id ? ui.audit : null;
  const niv = { alto: "bad", medio: "warn", bajo: "acc" };
  return `<div class="sectitle flex"><b>Revisión del expediente</b><button class="link" data-act="auditar" ${A && A.busy ? "disabled" : ""}>${A && A.busy ? "Revisando…" : A && A.items ? "Volver a revisar" : "Revisar"}</button></div>
    ${A && A.items ? `<div class="group"><ul class="notes">${A.items.map((i) => `<li><i class="dot ${niv[i.nivel] || "acc"}"></i><span><b style="font-weight:600">${esc(i.titulo)}</b><br><span class="caption">${esc(i.detalle || "")}</span>${i.accion ? `<br><span style="font-size:13.5px;color:var(--accent)">${esc(i.accion)}</span>` : ""}</span></li>`).join("")}</ul></div><p class="group-foot">Generado por IA a partir del expediente. Compruébalo antes de actuar.</p>` : A && A.err ? `<p class="group-foot">${esc(A.err)}</p>` : `<p class="group-foot" style="margin-top:0">Riesgos, datos que faltan y ahorros legítimos, con la mirada de un abogado sucesorista.</p>`}`;
}

// H31: estado real de la normativa de cada territorio. Se calcula un caso habitual (cónyuge y dos hijos, vivienda y cuenta)
// y se listan las reglas que el motor marca PENDIENTE en ese caso; el texto general solo dice «en verificación» si las hay.
const TERR_EST = new Map();
function terrPendientes(id, fecha) {
  try {
    const probe = { id: "probe", fecha: fecha || hoy(), ccaa: id, civil: "gananciales", testamento: "no", enPlazo: true, ajuar: "sts", situ: {}, tramites: {}, deudas: [], gastos: [],
      personas: [{ id: "c", nombre: "Cónyuge", relacion: "conyuge", edad: 72 }, { id: "h1", nombre: "Hijo 1", relacion: "hijo", edad: 45 }, { id: "h2", nombre: "Hijo 2", relacion: "hijo", edad: 41 }],
      bienes: [{ id: "v", tipo: "vivienda", valor: 300000, titularidad: "ganancial", municipio: "OTRO", tipoManual: 30 }, { id: "q", tipo: "cuenta", valor: 90000, titularidad: "ganancial" }] };
    const R = calcular(probe); return R ? R.isd.pendientes || [] : [];
  } catch (e) { return []; }
}
function terrEstado(id, fecha) {
  const k = id + "|" + (fecha || ""); if (TERR_EST.has(k)) return TERR_EST.get(k);
  // Lo pendiente en la ley estatal (p. ej., la valoración de la nuda propiedad) es común a todos: se dice aparte, no se cuenta como de la comunidad
  const comun = terrPendientes("EST", fecha), notaComun = comun.length ? ` Común a todos los territorios: ${comun.join("; ")}.` : "";
  let o;
  if (id === "EST") o = { txt: "Ley estatal, o la de la comunidad con más bienes en España", tip: "Sin residencia en España se aplica la Ley 29/1987; con bienes en España puede aplicarse la normativa de la comunidad donde esté la mayor parte (disp. adic. 2.ª Ley 29/1987)." + notaComun, cls: "" };
  else {
    const pend = terrPendientes(id, fecha).filter((q) => !comun.includes(q));
    const ver = REGLAS[id] && REGLAS[id].estadoGlobal === "VERIFICADO";
    o = pend.length
      ? { txt: `${plural(pend.length, "regla")} de la comunidad en verificación`, tip: "Pendiente de cotejo con el texto oficial (caso de cónyuge e hijos): " + pend.join("; ") + ". El cálculo marca «en verificación» el paso donde se aplica." + notaComun, cls: "nu-pend" }
      : ver ? { txt: "Normativa verificada", tip: "Tarifa, reducciones y bonificaciones cotejadas con el texto oficial." + notaComun, cls: "" }
      : { txt: "Verificada para cónyuge, hijos y vivienda", tip: "Las reglas de la comunidad que se aplican al caso habitual están cotejadas. Alguna menos frecuente sigue en verificación: si se aplica a un expediente, el cálculo la marca en su paso." + notaComun, cls: "" };
  }
  TERR_EST.set(k, o); return o;
}
// ───────────────────── Asistente ─────────────────────
const PASOS = ["intro", "encargo", "nombre", "fecha", "territorio", "civil", "testamento", "familia", "bienes", "deudas", "situaciones", "fin"];
function vAsistente() {
  const x = ui.borrador; const p = PASOS[ui.paso];
  const pct = Math.round(ui.paso / (PASOS.length - 1) * 100);
  let body = "", puede = true;
  const opciones = (key, attr, o) => `<div class="group">${o.map(([v, t, s]) => `<button class="choice" data-${attr}="${v}" aria-pressed="${x[key] === v}"><span class="radio"></span><span><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span></button>`).join("")}</div>`;
  if (p === "intro") body = `<span class="logo" style="width:56px;height:56px;margin-bottom:24px" aria-hidden="true">${LOGO_SVG}</span><h2 class="q">Nuevo expediente</h2><p class="qsub">Datos del encargo, del causante, de los herederos y del patrimonio. Unos diez minutos. Lo que falte se completa después desde el expediente.</p>${asBorradorHTML(x)}<div class="altpath"><span class="ico">${I.doc}</span><span class="t"><b>¿Tienes ya los documentos?</b><small>Certificado de defunción, testamento, notas simples, IBI, DNI, bancos… El expediente se crea y se rellena con lo que se lea; tú apruebas cada dato.</small></span><button class="btn sm gray" data-act="lecNuevo">Empezar con los documentos</button></div>${typeof guAbrir === "function" && !(DB.guias || {}).primer ? `<p class="wiz-guia">¿Es la primera vez? <button class="link" data-gu="abrir" data-gu-v="primer">Que una guía me acompañe paso a paso</button></p>` : ""}`;
  if (p === "encargo") { const D = despachoCfg(); x.despacho = x.despacho || {}; if (!x.despacho.ref) x.despacho.ref = nuevaRef(); if (!x.responsable) x.responsable = D.abogados[0].id; body = `<h2 class="q">Encargo</h2><p class="qsub">Cliente que encarga el asunto y abogado responsable.</p><div class="group"><div class="field"><label for="f-cli">Cliente</label><input id="f-cli" data-bd="cliente" value="${esc(x.despacho.cliente)}" placeholder="Nombre del cliente" autocomplete="off"></div><div class="field"><label for="f-ref">Referencia</label><input id="f-ref" data-bd="ref" value="${esc(x.despacho.ref)}"></div><div class="field"><label for="f-resp">Responsable</label><select id="f-resp" data-resp="1">${D.abogados.map((a) => `<option value="${a.id}" ${x.responsable === a.id ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select></div></div>`; }
  if (p === "nombre") body = `<h2 class="q">Nombre del causante</h2><p class="qsub">Aparece en los escritos. Opcional.</p><div class="group"><div class="field"><label for="f-nombre">Nombre y apellidos</label><input id="f-nombre" data-b="nombre" value="${esc(x.nombre)}" autocomplete="off" placeholder="Nombre de la persona fallecida"></div><div class="field"><label for="f-gen">Tratamiento en los escritos</label><select id="f-gen" data-b="generoCausante"><option value="">Sin indicar (redacción neutra)</option><option value="f" ${x.generoCausante === "f" ? "selected" : ""}>Femenino (D.ª, fallecida, viuda)</option><option value="m" ${x.generoCausante === "m" ? "selected" : ""}>Masculino (D., fallecido, viudo)</option></select></div></div>`;
  if (p === "fecha") { body = `<h2 class="q">Fecha del fallecimiento</h2><p class="qsub">Los plazos se cuentan desde ese día y se aplica la ley vigente entonces.</p><div class="group"><div class="field"><label for="f-fecha">Fecha</label><input id="f-fecha" type="date" data-b="fecha" data-valida="fallecimiento" value="${esc(x.fecha)}" max="${hoy()}"></div></div>`; puede = rbFallecimientoOk(x.fecha); }
  if (p === "territorio") { body = `<h2 class="q">Residencia habitual</h2><p class="qsub">Donde vivió más días en los últimos cinco años. Decide la normativa del impuesto.</p><div class="search" style="margin-bottom:12px">${I.search}<input id="f-buscar" placeholder="Buscar comunidad" value="${esc(ui.buscar || "")}" autocomplete="off"></div><div class="group">${TERRITORIOS.filter(([id, n]) => !ui.buscar || n.toLowerCase().includes(ui.buscar.toLowerCase())).map(([id, n]) => `<button class="row" data-terr="${id}">${(() => { const E = terrEstado(id, x.fecha); return `<span class="t" title="${esc(E.tip)}"><b>${esc(n)}</b><small class="${E.cls}">${esc(E.txt)}</small></span>`; })()}${x.ccaa === id ? `<span style="color:var(--accent)">${I.tick.replace("<svg", '<svg width="20" height="20"')}</span>` : ""}</button>`).join("")}</div>`;
    if (x.ccaa === "EST") body += `<div class="sectitle">Bienes en España</div><div class="group"><div class="field"><label for="f-cb">Comunidad con la mayor parte de los bienes</label><select id="f-cb" data-b="ccaaBienes"><option value="">Aplicar la ley estatal</option>${TERRITORIOS.filter(([id]) => id !== "EST").map(([id, n]) => `<option value="${id}" ${x.ccaaBienes === id ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div></div>`;
    puede = !!x.ccaa; }
  if (p === "civil") { body = `<h2 class="q">Estado civil</h2><p class="qsub">En gananciales, la mitad de lo común es del viudo y no entra en la herencia.</p>` + opciones("civil", "civil", [["gananciales", "Casado/a en gananciales", "Lo habitual en la mayor parte de España"], ["separacion", "Casado/a en separación de bienes", "Lo habitual en Cataluña y Baleares"], ["pareja", "Pareja de hecho", "Sin testamento no hereda en derecho común; en el impuesto cuenta si está inscrita"], ["viudo", "Viudo/a", ""], ["soltero", "Soltero/a o divorciado/a", ""]]); puede = !!x.civil; }
  if (p === "testamento") { body = `<h2 class="q">Testamento</h2><p class="qsub">Si lo hay, manda lo que diga, respetando las legítimas.</p>` + opciones("testamento", "test", [["no", "Sin testamento", "Reparto legal por órdenes: se calcula solo"], ["usufructo", "Usufructo universal al cónyuge", "El «del uno para el otro»: usufructo al viudo, propiedad a los hijos"], ["porcentajes", "Otro reparto", "Porcentaje de cada heredero y legados"], ["nose", "Por confirmar", "Se sabrá con el certificado de últimas voluntades. Mientras, se calcula sin testamento."]]); puede = !!x.testamento; }
  if (p === "familia") { body = `<h2 class="q">Herederos</h2><p class="qsub">${x.testamento === "porcentajes" ? "Cada heredero o legatario del testamento." : "La familia más cercana: cónyuge, hijos (o nietos si un hijo falleció antes), padres o hermanos."}</p>${listaPersonas(x)}<div class="addrow">${addP(x).map(([r, t]) => `<button data-addp="${r}">+ ${t}</button>`).join("")}</div>`; puede = (x.personas || []).length > 0; }
  if (p === "bienes") { body = `<h2 class="q">Patrimonio</h2><p class="qsub">Viviendas, cuentas, inversiones, vehículos. Un valor aproximado basta para empezar.</p>${listaBienes(x)}<div class="addrow">${Object.entries(TIPO_BIEN).map(([t, [n]]) => `<button data-addb="${t}">+ ${n}</button>`).join("")}</div>`; puede = (x.bienes || []).length > 0; }
  if (p === "deudas") body = `<h2 class="q">Deudas y gastos</h2><p class="qsub">Se restan de la herencia y bajan el impuesto.</p>${formDeudas(x)}`;
  if (p === "situaciones") body = `<h2 class="q">Situaciones del causante</h2><p class="qsub">Añaden o quitan trámites: bajas, pensiones, alquileres, seguros.</p>${formSitu(x)}`;
  if (p === "fin") { const R = calcular(x); const T = R ? tramitesExp(x, R) : []; const E = R ? estrategia(x) : null; body = `<h2 class="q">Expediente listo.</h2><p class="qsub">Reparto, impuestos, estrategia fiscal y ${plural(T.length, "trámite")} para ${esc(x.nombre || "esta herencia")}.</p>${R ? `<div class="kpis" style="grid-template-columns:repeat(2,1fr)">${kpi("Sucesiones", eur0(R.isd.total), "toda la familia")}${kpi("Plusvalía", eur0(R.totalPlus), plural(R.plus.length, "inmueble"))}${(() => { const pi = R.plazos.find((q) => q.id === "isd"), pp = R.plazos.find((q) => q.id === "prorroga_isd"); return kpi("Presentar antes del", fechaCorta(pi.limite), pp && pp.limite ? `Prórroga: pedirla antes del ${fechaCorta(pp.limite)} (+6 meses)` : "Prórroga de 6 meses si se pide en los 5 primeros"); })()}${kpi("Ahorro posible", E ? eur0(E.seguro) : "—", "ver Estrategia", "gold")}</div>` : `<div class="infobar"><span class="ico orange">${I.info}</span><span>Faltan datos para calcular. Revisa herederos y bienes.</span></div>`}`; }
  const ultimo = ui.paso === PASOS.length - 1;
  const NOMBRES = { intro: "Antes de empezar", encargo: "Encargo", nombre: "Causante", fecha: "Fecha del fallecimiento", territorio: "Residencia", civil: "Estado civil", testamento: "Testamento", familia: "Herederos", bienes: "Patrimonio", deudas: "Deudas y gastos", situaciones: "Situaciones", fin: "Resumen" };
  const MOTIVO = { fecha: "Indica la fecha del fallecimiento para continuar.", territorio: "Elige la comunidad de residencia para continuar.", civil: "Elige el estado civil para continuar.", testamento: "Indica si hay testamento para continuar.", familia: "Añade al menos un heredero para continuar.", bienes: "Añade al menos un bien para continuar." };
  // M10: «Salir» visible en todos los pasos (lo escrito se guarda como borrador); «Atrás» vuelve un paso
  return `<div class="wiz"><div class="topbar"><span class="wiz-izq">${ui.paso === 0 ? "" : `<button class="tbtn" data-act="atras">${I.back}Atrás</button>`}</span><span class="wiz-paso">${ui.paso ? `<span class="num">Paso ${ui.paso} de ${PASOS.length - 1}</span>` : `<span>Nuevo expediente</span>`}<b>${NOMBRES[p] || ""}</b></span><button class="tbtn wiz-salir" data-act="salirAsist" title="${ui.editando ? "Salir sin aplicar los cambios (quedan guardados como borrador)" : "Salir del asistente (lo escrito queda guardado como borrador)"}">Salir</button></div>
    ${ui.paso ? `<ol class="wiz-steps" aria-label="Pasos del alta">${PASOS.slice(1).map((k, i) => `<li class="${i + 1 < ui.paso ? "done" : i + 1 === ui.paso ? "on" : ""}" ${i + 1 === ui.paso ? 'aria-current="step"' : ""}><i>${i + 1 < ui.paso ? I.tick : i + 1}</i>${NOMBRES[k]}</li>`).join("")}</ol>` : ""}
    <div class="inner push" key="${p}"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Avance del alta"><i style="width:${pct}%"></i></div>${body}</div>
    <div class="bottombar"><div class="inner">${!puede && MOTIVO[p] ? `<span class="wiz-motivo" id="wiz-motivo">${MOTIVO[p]}</span>` : ""}<button class="btn block" data-act="${ultimo ? "terminar" : "siguiente"}" ${puede ? "" : 'disabled aria-describedby="wiz-motivo"'}>${ultimo ? "Abrir el expediente" : ui.paso === 0 ? "Empezar" : "Continuar"}</button></div></div></div>`;
}
function formDeudas(x) {
  const g = (x.gastos || [])[0] || {}, h = (x.deudas || [])[0] || {}, o = (x.deudas || [])[1] || {};
  return `<div class="group"><div class="field"><label for="f-fun">Funeral y entierro (€)</label><input id="f-fun" inputmode="decimal" data-gasto="0" value="${numStr(g.importe)}" placeholder="0"></div><div class="field"><label for="f-hip">Hipoteca pendiente (€)</label><input id="f-hip" inputmode="decimal" data-deuda="0" value="${numStr(h.importe)}" placeholder="0"></div><div class="row toggle"><span class="t"><b>Hipoteca en gananciales</b>${x.civil === "gananciales" ? `<small>Si es ganancial, la herencia solo soporta la mitad</small>` : ""}</span><label class="switch"><input type="checkbox" data-deudagan="0" ${(h.ganancial ?? (num(h.importe) ? false : hipotecaGananDef(x))) ? "checked" : ""}><span></span></label></div><div class="field"><label for="f-otr">Otras deudas del causante (€)</label><input id="f-otr" inputmode="decimal" data-deuda="1" value="${numStr(o.importe)}" placeholder="0"></div></div>`;
}
function formSitu(x) {
  const s = x.situ || {};
  const fila = ([k, t]) => `<div class="row toggle"><span class="t"><b>${t}</b></span><label class="switch"><input type="checkbox" data-situ="${k}" ${s[k] ? "checked" : ""}><span></span></label></div>`;
  const ini = TR_SIT_GRUPOS.map(([, k]) => TR_SITUACIONES.findIndex(([q]) => q === k));
  return TR_SIT_GRUPOS.map(([tit], i) => { const L = TR_SITUACIONES.slice(ini[i], ini[i + 1] ?? TR_SITUACIONES.length), n = L.filter(([k]) => s[k]).length; return `<details class="sitg" ${n || i === 0 ? "open" : ""}><summary><b>${esc(tit)}</b><span>${n ? plural(n, "marcada", "marcadas") : L.length + " situaciones"}</span></summary><div class="group">${L.map(fila).join("")}</div></details>`; }).join("");
}

// ───────────────────── Hojas ─────────────────────
// H44: entidad e IBAN de cuentas y valores. El IBAN se valida con el dígito de control (ISO 13616, módulo 97)
// y, si es español, sugiere la entidad por su código (posiciones 5 a 8). La lista es una ayuda: el campo admite cualquier nombre.
const BANCOS_ES = { "0049": "Banco Santander", "0182": "BBVA", "2100": "CaixaBank", "0081": "Banco Sabadell", "0128": "Bankinter", "2103": "Unicaja", "2085": "Ibercaja", "2080": "Abanca", "2095": "Kutxabank", "3058": "Cajamar", "1465": "ING", "0073": "Openbank", "0019": "Deutsche Bank", "0061": "Banca March", "3035": "Laboral Kutxa", "0237": "Cajasur", "0239": "EVO Banco", "2038": "CaixaBank (antes Bankia)", "1491": "Triodos Bank", "0216": "Targobank", "0186": "Banco Mediolanum" };
const ibanLimpio = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const ibanFmt = (v) => ibanLimpio(v).replace(/(.{4})(?=.)/g, "$1 ");
function ibanValido(v) {
  const s = ibanLimpio(v); if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s) || (s.startsWith("ES") && s.length !== 24)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + Number(ch)) % 97; return m === 1;
}
const ibanEntidad = (v) => { const s = ibanLimpio(v); return s.startsWith("ES") && s.length >= 8 ? BANCOS_ES[s.slice(4, 8)] || "" : ""; };
function bancoCampos(b) {
  const iv = ibanLimpio(b.iban), mal = iv && !ibanValido(iv), sug = !b.entidad && ibanEntidad(iv);
  return `<div class="field"><label for="b-ent">Entidad</label><input id="b-ent" data-bn="entidad" list="b-ent-l" value="${esc(b.entidad)}" placeholder="Banco o gestora" autocomplete="off"><datalist id="b-ent-l">${[...new Set(Object.values(BANCOS_ES))].sort((p, q) => p.localeCompare(q, "es")).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>${sug ? `<span class="hint">Por el IBAN parece ${esc(sug)}.</span>` : ""}</div>
      <div class="field"><label for="b-iban">IBAN o número de cuenta</label><input id="b-iban" data-bn="iban" value="${esc(ibanFmt(b.iban))}" placeholder="ES00 0000 0000 0000 0000 0000" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-invalid="${mal ? "true" : "false"}" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${mal ? `<span class="hint nu-err">El IBAN no es válido: el dígito de control no cuadra. Revisa que esté completo y sin errores.</span>` : iv ? `<span class="hint nu-ok">IBAN válido.</span>` : `<span class="hint">Opcional. Sirve para la carta al banco y el certificado de saldos.</span>`}</div>`;
}
// H30: cabecera del móvil con texto. Mi día, Menú (todas las secciones con su nombre) y Nuevo
function topMovil() {
  const n = typeof rdBadge === "function" ? rdBadge() : 0;
  return `<button class="tbtn nu-tb" data-act="rdMiDia">${typeof RD_ICO === "object" ? RD_ICO.dia : I.cal}<span>Mi día</span>${n ? `<i class="nu-tbn num" aria-hidden="true">${n}</i><span class="sr-only">: ${plural(n, "asunto")} para hoy</span>` : ""}</button><button class="tbtn nu-tb" data-act="menuApp" aria-haspopup="dialog">${I.list}<span>Menú</span></button><button class="tbtn nu-tb" data-act="nuevo">${I.plus}<span>Nuevo</span></button>`;
}
function menuAppHTML() {
  const n = typeof rdBadge === "function" ? rdBadge() : 0;
  const fila = (attr, ico, cls, t, sub, extra = "") => `<button class="row" ${attr}><span class="ico ${cls}">${ico}</span><span class="t"><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</span>${extra}${I.chev}</button>`;
  return sheetHTML("Menú", `<div class="group" style="--inset:60px">
    ${fila('data-act="rdMiDia"', typeof RD_ICO === "object" ? RD_ICO.dia : I.cal, "blue", "Mi día", "Lo que vence o está bloqueado hoy", n ? `<span class="nu-cnt num">${n}</span>` : "")}
    ${fila('data-act="home"', I.folder, "q", "Expedientes", "Todos los expedientes")}
    ${fila('data-act="agenda"', I.cal, "gold", "Agenda", "Plazos de todos los expedientes")}
    ${fila('data-tmp="rent"', I.chart, "green", "Rentabilidad", "Honorarios, horas y cobros")}
    ${fila('data-act="biblio"', I.law, "indigo", "Normativa", "Leyes, ordenanzas y novedades")}
    ${fila('data-act="menuBuscar"', I.search, "q", "Buscar", "Expedientes, personas y acciones")}
    </div>
    <div class="group" style="--inset:60px;margin-top:14px">
    ${fila('data-act="ajustes"', I.gear, "q", "Despacho y ajustes", "Equipo, copias de seguridad, licencia, importar")}
    ${fila('data-ay="abrir"', AY_IC.q, "blue", "Ayuda", "Guías paso a paso, manual en PDF y soporte")}
    ${fila('data-act="opinion"', I.spark, "q", "Enviar opinión", "")}
    ${fila('data-act="novedades"', I.info, "q", "Novedades", esc(versionTxt()))}
    </div>
    <p class="group-foot">Cada equipo guarda sus propios expedientes. Si los creaste en el ordenador, pásalos con «Exportar este expediente» o con una copia de seguridad, e impórtalos aquí desde Ajustes.</p>`);
}
// Zona de acciones destructivas: separada, con la consecuencia escrita y confirmación en dos pasos
function zonaPeligro(clave, txt, pregunta, accion, si, attr) {
  return ui.conf === clave ? `<div class="zona-peligro conf" role="alertdialog" aria-label="Confirmar"><p><b>${pregunta}</b></p><span class="zp-acts"><button class="btn sm gray" data-conf="">Cancelar</button><button class="btn sm danger-solid" ${attr}>${si}</button></span></div>`
    : `<div class="zona-peligro"><p>${txt}</p><button class="btn sm danger" data-conf="${clave}">${I.trash}${accion}</button></div>`;
}
const fsecH = (t, s) => `<div class="fsec-h"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</div>`;
function sheetHTML(titulo, body, accion = "Cerrar", extra = "") {
  return `<div class="scrim" data-act="cerrarSheet"></div><div class="sheet ${extra}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="grab"></div><header><span></span><h2>${esc(titulo)}</h2><button class="tbtn${accion === "Hecho" ? " sh-ok" : ""}" data-act="cerrarSheet">${accion}</button></header><div class="body">${body}</div></div>`;
}
function enlacesHTML(id) {
  const E = enlacesDe(id); const L = [...E.accion.map((a) => ({ ...a, k: "sede" })), ...E.norma.map((a) => ({ ...a, k: "norma" }))];
  if (!L.length) return "";
  let host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  return `<div class="sectitle">Enlaces oficiales</div><div class="group">${L.map((a) => `<a class="linkrow" href="${esc(a.url)}" target="_blank" rel="noopener"><span class="ico ${a.k === "sede" ? "gold" : "q"}">${a.k === "sede" ? I.link : I.law}</span><span class="t">${esc(a.texto)}<small>${esc(host(a.url))}${a.estado !== "VERIFICADO" ? " · en verificación" : ""}</small></span><svg class="e" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg></a>`).join("")}</div>`;
}
function vSheet() {
  const s = ui.sheet; if (!s) return "";
  const x = objetivo();
  if (s.tipo === "persona") {
    const p = x.personas.find((q) => q.id === s.id); if (!p) return "";
    const rels = Object.entries(RELACIONES).filter(([k]) => k !== "pareja_no_inscrita").map(([k, v]) => `<option value="${k}" ${p.relacion === k ? "selected" : ""}>${v.label}</option>`).join("");
    const afinar = ["patrimonioPreexistente", "seguro", "donaciones", "ingresos"].some((k) => num(p[k])) || p.colectivoVulnerable;
    return sheetHTML(p.nombre ? `${RELACIONES[p.relacion].label} · ${p.nombre}` : RELACIONES[p.relacion].label, `${fsecH("Identificación", "Datos que aparecen en los escritos y en los modelos 650/660.")}<div class="group">
      <div class="field"><label for="p-n">Nombre</label><input id="p-n" data-p="nombre" value="${esc(p.nombre)}" placeholder="Nombre y apellidos" autocomplete="off"></div>
      <div class="field"><label for="p-r">Relación con el causante</label><select id="p-r" data-p="relacion">${rels}</select></div>
      <div class="field"><label for="p-e">Edad</label><input id="p-e" inputmode="numeric" data-p="edad" data-valida="edad" value="${esc(rbEdadCampo(p))}" placeholder="Años"><span class="hint">Edad el día del fallecimiento: cuenta para algunas reducciones y para valorar el usufructo.</span></div>
      <div class="field"><label for="p-nif">NIF</label><input id="p-nif" data-p="nif" data-valida="nif" value="${esc(p.nif)}" placeholder="DNI o NIE" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
      <div class="field"><label for="p-ec">Estado civil</label><select id="p-ec" data-p="estadoCivil"><option value="">Sin indicar</option>${VF_EC.map(([k, t]) => `<option value="${k}" ${p.estadoCivil === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label for="p-dom">Domicilio</label><input id="p-dom" data-p="domicilio" value="${esc(p.domicilio)}" placeholder="Calle, número, código postal y localidad"></div>
      <div class="field"><label for="p-genero">Tratamiento en los escritos</label><select id="p-genero" data-p="genero"><option value="">Sin indicar (redacción neutra)</option><option value="f" ${p.genero === "f" ? "selected" : ""}>Femenino (D.ª, hija, viuda)</option><option value="m" ${p.genero === "m" ? "selected" : ""}>Masculino (D., hijo, viudo)</option></select></div>
      ${x.testamento === "porcentajes" ? `<div class="field"><label for="p-pct">Porcentaje según el testamento</label><input id="p-pct" inputmode="decimal" data-p="pct" data-valida="pct" value="${numStr(p.pct)}" placeholder="0 si solo recibe un legado"><span class="hint">Porcentaje de la herencia que le atribuye el testamento.</span></div>` : ""}
      ${["nieto", "bisnieto", "sobrino"].includes(p.relacion) ? `<div class="field"><label for="p-est">${p.relacion === "sobrino" ? "Hermano/a del causante" : "Hijo/a del causante"} del que desciende</label><input id="p-est" data-p="estirpe" value="${esc(p.estirpe)}" placeholder="Nombre, tal como figura en el expediente"><span class="hint">Solo hereda en su lugar si ese progenitor murió antes. Si vive o renunció, no hereda (arts. 929-931 CC).</span></div>` : ""}
      ${frLineaPersonaHTML(x, p)}
    </div>
    ${fsecH("Situación en la herencia", "Cambian quién hereda, las reducciones y los trámites.")}
    <div class="group">
      <div class="row toggle"><span class="t"><b>Renuncia a la herencia</b></span><label class="switch"><input type="checkbox" data-p="renuncia" ${p.renuncia ? "checked" : ""}><span></span></label></div>
      <div class="row toggle"><span class="t"><b>Convivió con el causante los dos últimos años</b></span><label class="switch"><input type="checkbox" data-p="convivio2anios" ${p.convivio2anios ? "checked" : ""}><span></span></label></div>
      ${p.relacion === "hermano" || p.relacion === "sobrino" ? `<div class="row toggle"><span class="t"><b>${p.relacion === "sobrino" ? "Hijo/a de un medio hermano del causante" : "Medio hermano/a"}</b><small>${p.relacion === "sobrino" ? "Su progenitor era hermano del causante solo de padre o solo de madre (art. 951 CC)" : "Solo de padre o solo de madre"}</small></span><label class="switch"><input type="checkbox" data-p="medio" ${p.medio ? "checked" : ""}><span></span></label></div>` : ""}
      ${p.relacion === "conyuge" ? `<div class="row toggle"><span class="t"><b>Separado legalmente o de hecho</b><small>No hereda sin testamento ni tiene legítima (arts. 834 y 945 CC)</small></span><label class="switch"><input type="checkbox" data-p="separado" ${p.separado ? "checked" : ""}><span></span></label></div>` : ""}
      ${p.relacion === "pareja_hecho" ? `<div class="row toggle"><span class="t"><b>Inscrita en un registro oficial de parejas</b></span><label class="switch"><input type="checkbox" data-p="inscrita" ${p.inscrita ? "checked" : ""}><span></span></label></div>` : ""}
      ${p.relacion === "pareja_hecho" && p.inscrita && (x.ccaa === "MAD" || x.ccaaBienes === "MAD") ? `<div class="field"><label for="p-reg">Registro de la inscripción</label><select id="p-reg" data-p="registroPareja"><option value="">Sin indicar</option><option value="MAD" ${p.registroPareja === "MAD" ? "selected" : ""}>Comunidad de Madrid (Ley 11/2001)</option><option value="OTRO" ${p.registroPareja === "OTRO" ? "selected" : ""}>Otro registro</option></select></div>` : ""}
      ${x.aplicarEmpresa && ["extrano", "pareja_hecho"].includes(p.relacion) ? `<div class="row toggle"><span class="t"><b>Trabaja en la empresa del causante</b><small>Contrato de 5 años y 3 en funciones de dirección (reducción por empresa sin parentesco en Andalucía)</small></span><label class="switch"><input type="checkbox" data-p="requisitoLaboralEmpresa" ${p.requisitoLaboralEmpresa ? "checked" : ""}><span></span></label></div>` : ""}
      <div class="row toggle"><span class="t"><b>Empadronado en el municipio del inmueble</b><small>Al menos un año; lo piden algunos ayuntamientos</small></span><label class="switch"><input type="checkbox" data-p="empadronado" ${p.empadronado ? "checked" : ""}><span></span></label></div>
      <div class="field"><label for="p-d">Discapacidad reconocida</label><select id="p-d" data-p="discapacidad"><option value="0">No</option><option value="33" ${num(p.discapacidad) === 33 ? "selected" : ""}>Del 33 % al 49 %</option><option value="50" ${num(p.discapacidad) === 50 ? "selected" : ""}>Del 50 % al 64 %</option><option value="65" ${num(p.discapacidad) === 65 ? "selected" : ""}>65 % o más</option></select><span class="hint">Dato sensible: solo se usa para las reducciones y se guarda en este dispositivo.</span></div>
    </div>
    <details class="fopt" data-fopt="p-afinar" ${(ui.fopt?.["p-afinar"] ?? afinar) ? "open" : ""}><summary><span><b>Para afinar el impuesto</b><br>Patrimonio previo, seguros de vida, donaciones e ingresos. Opcional.</span>${afinar ? `<span class="chip info">Con datos</span>` : ""}</summary>
    <div class="group">
      <div class="field"><label for="p-pp">Patrimonio previo del heredero (€)</label><input id="p-pp" inputmode="decimal" data-p="patrimonioPreexistente" value="${numStr(p.patrimonioPreexistente)}" placeholder="Aproximado"><span class="hint">${x.ccaa === "AND" ? "En Andalucía no influye en el impuesto." : "Solo influye si supera unos 400.000 €."}</span></div>
      <div class="field"><label for="p-s">Seguro de vida que cobra por este fallecimiento (€)</label><input id="p-s" inputmode="decimal" data-p="seguro" value="${numStr(p.seguro)}" placeholder="0"></div>
      <div class="field"><label for="p-do">Donaciones del causante en los 4 años anteriores (€)</label><input id="p-do" inputmode="decimal" data-p="donaciones" value="${numStr(p.donaciones)}" placeholder="0"></div>
      ${esDespacho() ? `<div class="field"><label for="p-in">Ingresos de la unidad de convivencia, sin el fallecido (€)</label><input id="p-in" inputmode="decimal" data-p="ingresos" value="${numStr(p.ingresos)}" placeholder="Solo si la ordenanza lo exige"></div><div class="row toggle"><span class="t"><b>Colectivo vulnerable</b><small>Pensionista, desempleado, menor de 30 años, gran incapacidad o víctima de violencia de género (Málaga, art. 9.C)</small></span><label class="switch"><input type="checkbox" data-p="colectivoVulnerable" ${p.colectivoVulnerable ? "checked" : ""}><span></span></label></div>` : ""}
    </div></details>
    ${zonaPeligro("p:" + p.id, `Quitar a esta persona la saca del reparto, de los impuestos y de los escritos.`, `¿Quitar a ${esc(p.nombre || "esta persona")}? Sus datos no se pueden recuperar.`, "Quitar a esta persona", "Sí, quitar", `data-delp="${p.id}"`)}`, "Hecho");
  }
  if (s.tipo === "bien") {
    const b = x.bienes.find((q) => q.id === s.id); if (!b) return "";
    const inm = b.tipo === "vivienda" || b.tipo === "inmueble";
    const pers = (x.personas || []).map((p) => `<option value="${p.id}" ${b.legatarioId === p.id ? "selected" : ""}>${esc(p.nombre || RELACIONES[p.relacion].label)}</option>`).join("");
    const persAdj = (x.personas || []).filter((p) => !p.renuncia).map((p) => `<option value="${p.id}" ${b.adjudicadoA === p.id ? "selected" : ""}>${esc(p.nombre || RELACIONES[p.relacion].label)}</option>`).join("");
    return sheetHTML(b.descripcion ? `${TIPO_BIEN[b.tipo][0]} · ${b.descripcion}` : TIPO_BIEN[b.tipo][0], `${fsecH("Identificación y valor", inm ? "Se declara el mayor entre el valor de mercado y el de referencia del Catastro." : "Valor a la fecha del fallecimiento.")}<div class="group">
      <div class="field"><label for="b-d">Descripción</label><input id="b-d" data-bn="descripcion" value="${esc(b.descripcion)}" placeholder="${inm ? "Ej.: piso en calle Larios 3" : "Ej.: cuenta en el banco X"}"></div>
      <div class="field"><label for="b-v">${inm ? "Valor de mercado o de escritura (€)" : b.tipo === "cuenta" ? "Saldo el día del fallecimiento (€)" : "Valor el día del fallecimiento (€)"}</label><input id="b-v" inputmode="decimal" data-bn="valor" value="${numStr(b.valor)}" placeholder="0"></div>
      ${b.tipo === "cuenta" || b.tipo === "valores" ? bancoCampos(b) : ""}
      ${inm ? `<div class="field"><label for="b-rc">Referencia catastral</label><input id="b-rc" data-bn="refCatastral" value="${esc(b.refCatastral)}" placeholder="20 caracteres" autocomplete="off" autocapitalize="characters" maxlength="24" spellcheck="false" data-valida="rc" class="mono-in"></div><div class="field"><label for="b-cg">Cargas</label><input id="b-cg" data-bn="cargas" value="${esc(b.cargas)}" placeholder="Hipoteca, embargo… o «Libre de cargas»"><span class="hint">Según la nota simple del Registro.</span></div>` : ""}
      ${inm ? `<div class="field"><label for="b-r">Valor de referencia del Catastro (€)</label><input id="b-r" inputmode="decimal" data-bn="valorReferencia" value="${numStr(b.valorReferencia)}" placeholder="Opcional"><span class="hint">Se declara el mayor de los dos. <a href="${SEDES.valorRef}" target="_blank" rel="noopener">Consultarlo en la sede del Catastro</a></span></div>` : ""}
    </div>
    ${fsecH("Titularidad y reparto", x.civil === "gananciales" ? "En gananciales, la mitad de lo común es del viudo y no entra en la herencia." : "Qué parte era del causante y a quién se adjudica.")}
    <div class="group">
      <div class="field"><label>Titularidad</label><div class="seg"><button data-tit="privativo" aria-pressed="${(b.titularidad || "privativo") === "privativo"}">Privativo</button><button data-tit="ganancial" aria-pressed="${b.titularidad === "ganancial"}">Ganancial</button><button data-tit="proindiviso" aria-pressed="${b.titularidad === "proindiviso"}">Una parte</button></div></div>
      ${b.titularidad === "proindiviso" ? `<div class="field"><label for="b-p">Porcentaje del causante</label><input id="b-p" inputmode="decimal" data-bn="porcentaje" data-valida="pct" value="${numStr(b.porcentaje)}" placeholder="50"><span class="hint">Porcentaje del bien que pertenecía al causante.</span></div>` : ""}
      ${x.testamento === "porcentajes" || x.testamento === "usufructo" || b.legatarioId || (x.personas || []).some((p) => p.notaLegado) ? `<div class="field"><label for="b-l">Legado</label><select id="b-l" data-bn="legatarioId"><option value="">No, forma parte del reparto</option>${pers}</select></div>` : ""}
      ${inm && !b.legatarioId ? `<div class="field"><label for="b-adj">Adjudicación en la partición</label><select id="b-adj" data-bn="adjudicadoA"><option value="">Pro indiviso entre los herederos</option>${persAdj}</select><span class="hint">Quien se lo adjudica paga la plusvalía. Estrategia propone el reparto que menos cuesta.</span></div>` : ""}
      ${inm ? `<div class="row toggle"><span class="t"><b>Uso residencial</b><small>Vivienda habitual o segunda vivienda, con garaje y trastero. Cuenta para el ajuar doméstico</small></span><label class="switch"><input type="checkbox" data-bn="usoResidencial" ${(b.usoResidencial ?? b.tipo === "vivienda") ? "checked" : ""}><span></span></label></div><div class="row toggle"><span class="t"><b>Alquilado o cedido el día del fallecimiento</b><small>Si lo está, no cuenta para el ajuar doméstico</small></span><label class="switch"><input type="checkbox" data-bn="arrendadoOCedido" ${b.arrendadoOCedido ? "checked" : ""}><span></span></label></div>` : ""}
      ${frTroncalBienHTML(x, b)}
    </div>
    ${inm ? `${fsecH("Para la plusvalía municipal", "Con el recibo del IBI y la escritura de adquisición se calcula por los dos métodos y se aplica el menor.")}<div class="group">
      ${SAMPLE && LIM && LIM.images ? `<label class="row filebtn" style="cursor:pointer;position:relative;overflow:hidden"><span class="ico indigo">${ui.leyendo ? "…" : I.camera}</span><span class="t"><b>${ui.leyendo ? "Leyendo el documento…" : "Rellenar con una foto"}</b><small>Recibo del IBI, escritura o certificación catastral</small></span><input type="file" id="f-img" style="position:absolute;inset:0;opacity:0;cursor:pointer" accept="${esc((LIM.images.mediaTypes || ["image/jpeg", "image/png"]).join(","))}" ${ui.leyendo ? "disabled" : ""}></label>` : ""}
      ${muniCampo(x, b)}
      ${(b.municipio || "OTRO") === "OTRO" ? muniManualHTML(x, b) : ""}
      ${((b.municipio || "OTRO") !== "OTRO" && (MANUAL_BONIF.includes(b.municipio) || ORDENANZAS[b.municipio]?.manualBonif)) || (b.municipio === "MALAGA" && x.fecha && x.fecha < "2026-03-27") ? `<div class="field"><label for="b-bo">Bonificación por herencia a familiares (%)</label><input id="b-bo" inputmode="decimal" data-bn="bonifManual" value="${numStr(b.bonifManual)}" placeholder="0"><span class="hint">${ORDENANZAS[b.municipio]?.manualBonif ? esc(ordManualMotivo(b.municipio)) : "Según la ordenanza del ayuntamiento."}</span></div>` : ""}
      ${b.tipo === "inmueble" ? `<div class="row toggle"><span class="t"><b>Local afecto a una actividad del causante</b></span><label class="switch"><input type="checkbox" data-bn="localAfecto" ${b.localAfecto ? "checked" : ""}><span></span></label></div>` : ""}
      <div class="field"><label for="b-vt">Valor catastral total (€)</label><input id="b-vt" inputmode="decimal" data-bn="valorCatastralTotal" value="${numStr(b.valorCatastralTotal)}" placeholder="Recibo del IBI"></div>
      <div class="field"><label for="b-vs">Valor catastral del suelo (€)</label><input id="b-vs" inputmode="decimal" data-bn="valorCatastralSuelo" value="${numStr(b.valorCatastralSuelo)}" placeholder="Recibo del IBI"></div>
      <div class="field"><label for="b-fa">Fecha de adquisición</label><input id="b-fa" type="date" data-bn="fechaAdq" value="${esc(b.fechaAdq)}"></div>
      <div class="field"><label for="b-va">Precio de adquisición (€)</label><input id="b-va" inputmode="decimal" data-bn="valorAdq" value="${numStr(b.valorAdq)}" placeholder="Según escritura"></div>
    </div>` : ""}
    ${zonaPeligro("b:" + b.id, `Quitar este bien lo saca del inventario, del cálculo y de la partición.`, `¿Quitar ${esc(b.descripcion || "este bien")}? Sus datos no se pueden recuperar.`, "Quitar este bien", "Sí, quitar", `data-delb="${b.id}"`)}`, "Hecho");
  }
  if (s.tipo === "tramite") {
    const R = calcular(x); const t = tramitesExp(x, R).find((q) => q.id === s.id); if (!t) return "";
    const f = TR_FASES.find((q) => q.id === t.fase); const v = vence(t);
    const plazo = t.limite ? `${t.recomendado ? "Recomendado antes del" : "Hasta el"} ${fechaLarga(t.limite)}${t.nota ? ` (${t.nota.replace(/\d{4}-\d{2}-\d{2}/g, fechaCorta)})` : ""}` : t.desde ? `A partir del ${fechaLarga(t.desde)}` : "Sin plazo legal";
    let acc = "";
    if (t.accion) { const a = t.accion; acc = a.tipo === "doc" ? `<button class="btn" data-doc="${a.id}">${esc(a.texto)}</button>` : a.tipo === "tab" ? `<button class="btn" data-sec="${a.tab === "reparto" || a.tab === "patrimonio" ? "herencia" : a.tab}">${esc(a.texto)}</button>` : a.tipo === "sede" ? `<a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.texto)} ${I.ext}</a>` : a.tipo === "ia" && SAMPLE ? `<button class="btn" data-act="ia">${esc(a.texto)}</button>` : ""; }
    const adj = archivoDe(x.id, t.id);
    if (!ARCH.listo) archivoCargar().then(render);
    return sheetHTML("Trámite", `<div class="detail-h"><div class="kicker">${esc(f.nombre)}</div><h3>${esc(t.titulo)}</h3></div>
      <div class="seg block" style="margin:0 0 18px">${[["pend", "Pendiente"], ["curso", "En curso"], ["hecho", "Hecho"], ["na", "No aplica"]].map(([k, l]) => `<button data-tset="${k}" aria-pressed="${t.st === k}">${l}</button>`).join("")}</div>
      <p class="lead">${esc(t.que)}</p>
      <div class="meta"><div><span>Plazo</span><b class="${v.cls ? "due " + v.cls : ""}" style="font-size:14px">${esc(plazo)}</b></div><div><span>Quién</span><b>${esc(t.quien || "—")}</b></div><div><span>Dónde</span><b>${esc(t.organismo || "—")}</b></div><div><span>Base legal</span><b>${esc(t.norma || "—")}</b>${t.estado === "PENDIENTE" ? `<div style="margin-top:6px">${tagE(t.estado)}</div>` : ""}</div></div>
      ${acc ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 6px">${acc}</div>` : ""}
      ${enlacesHTML(t.id)}
      ${t.docs.length ? `<div class="sectitle">Qué hace falta</div><div class="group" style="--inset:54px">${t.docs.map((d, i) => { const on = !!t.docsOk[i]; return `<div class="row ${on ? "done" : ""}"><button class="st ${on ? "hecho" : ""}" data-tdoc="${i}" aria-label="Lo tengo">${on ? I.tick : ""}</button><span class="t"><b>${esc(d)}</b></span></div>`; }).join("")}</div>` : ""}
      <div class="sectitle">Adjuntos</div>${adj.length ? `<div class="files" style="margin-bottom:10px">${adj.map(fichaArchivo).join("")}</div>` : ""}${zonaSubida(t.id, "Adjuntar a este trámite")}
      <div class="sectitle">Notas</div><div class="group"><div class="field"><textarea id="t-nota" data-tnota="1" placeholder="Referencia, a quién se llamó, qué falta…">${esc(t.nota)}</textarea></div></div>`, "Hecho");
  }
  if (s.tipo === "fver") {
    const d = ARCH.lista.find((q) => q.id === s.id); if (!d) return "";
    const R = calcular(x); const T = R ? tramitesExp(x, R) : [];
    const img = /^image\//.test(d.tipo), pdf = d.tipo === "application/pdf";
    return sheetHTML(d.nombre, `<div class="preview">${img ? `<img src="${urlDe(d)}" alt="">` : pdf ? `<iframe src="${urlDe(d)}" title="${esc(d.nombre)}"></iframe>` : `<div class="empty"><b>${esc(extDe(d.nombre))}</b>Vista previa no disponible. Descárgalo para abrirlo.</div>`}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0"><button class="btn sm" data-fdl="${d.id}">${I.dl}Descargar</button></div>
      <div class="group"><div class="field"><label for="fv-e">Estado</label><select id="fv-e" data-fest="${d.id}">${ARCH_ESTADOS.map(([k, n]) => `<option value="${k}" ${(d.estado || "recibido") === k ? "selected" : ""}>${n}</option>`).join("")}</select></div><div class="field"><label for="fv-c">Categoría</label><select id="fv-c" data-fcat="${d.id}">${CATS.map(([k, n]) => `<option value="${k}" ${d.cat === k ? "selected" : ""}>${n}</option>`).join("")}</select></div><div class="field"><label for="fv-t">Trámite</label><select id="fv-t" data-ftram="${d.id}"><option value="">Sin asignar</option>${T.map((t) => `<option value="${t.id}" ${d.tramiteId === t.id ? "selected" : ""}>${esc(t.titulo)}</option>`).join("")}</select></div><div class="row"><span class="t"><b>Tamaño</b></span><span class="v">${tamTxt(d.tam)}</span></div><div class="row"><span class="t"><b>Añadido</b></span><span class="v">${fechaLarga(d.fecha.slice(0, 10))}</span></div></div>${zonaPeligro("f:" + d.id, "Eliminar el documento lo borra de este equipo y de sus trámites.", `¿Eliminar ${esc(d.nombre)}? No se puede deshacer.`, "Eliminar el documento", "Sí, eliminar", `data-fdel="${d.id}"`)}`, "Cerrar", "wide");
  }
  if (s.tipo === "menuApp") return menuAppHTML();
  if (s.tipo === "addPersona") return sheetHTML("Añadir persona", `<div class="group" style="--inset:60px">${addP(x).map(([r, tt]) => `<button class="row" data-addp="${r}"><span class="ico q">${I.person}</span><span class="t"><b>${tt}</b></span>${I.chev}</button>`).join("")}</div>`);
  if (s.tipo === "addBien") return sheetHTML("Añadir bien", `<div class="group" style="--inset:60px">${Object.entries(TIPO_BIEN).map(([k, [n]]) => { const [c, ic] = icoBien[k]; return `<button class="row" data-addb="${k}"><span class="ico ${c}">${ic}</span><span class="t"><b>${n}</b></span>${I.chev}</button>`; }).join("")}</div>`);
  if (s.tipo === "mas") return sheetHTML("Más secciones", `<div class="group" style="--inset:60px">${SECCIONES().filter(([k]) => !TABS_M.includes(k)).map(([k, tt, ic]) => `<button class="row" data-sec="${k}"><span class="ico q">${ic}</span><span class="t"><b>${tt}</b></span>${I.chev}</button>`).join("")}</div>`);
  if (s.tipo === "opinion") return sheetOpinion();
  if (s.tipo === "familia") return sheetFamilia(exp());
  if (s.tipo === "lector") return lecSheetHTML();
  if (s.tipo === "importar") return impSheetHTML();
  if (s.tipo === "lecNuevo") return lecNuevoHTML();
  if (s.tipo === "carpeta") return rnSheetCarpeta(exp());
  if (s.tipo === "tc") return tcSheet(exp());
  if (s.tipo === "novedades") return sheetNovedades();
  if (s.tipo === "widget") return wgSheet();
  if (s.tipo === "situ") return sheetHTML("Ajustar al caso", `<p class="lead">Marca lo que aplique. Se añaden o quitan los trámites correspondientes.</p>${formSitu(x)}`, "Hecho");
  if (s.tipo === "deudas") return sheetHTML("Deudas y gastos", formDeudas(x), "Hecho");
  if (s.tipo === "doc") {
    const R = calcular(x); const t = docTexto(x, R, s.id);
    return sheetHTML(DOC_TIT[s.id], `<div style="display:flex;gap:10px;margin:4px 0 18px;justify-content:center;flex-wrap:wrap"><button class="btn sm" data-pdfdoc="${s.id}">${I.dl}Descargar en PDF</button><button class="btn sm gray" data-dl="${s.id}">Descargar en Word</button><button class="btn sm gray" data-copy="${s.id}">Copiar texto</button></div><div class="paperview">${esrVista(t)}</div><p class="foot-note" style="text-align:center">Borrador. Lo marcado en amarillo lo completa o revisa el abogado antes de firmarlo o presentarlo.</p>`, "Cerrar", "wide");
  }
  if (s.tipo === "ia") {
    const c = CHATS[x.id] || { turns: [] };
    const sug = esDespacho() ? ["Riesgos del expediente", "Documentación pendiente", "Correo al cliente con los próximos pasos"] : ["¿Por qué pagamos esto?", "¿Conviene renunciar?", "¿Y si vendemos la casa?", "¿Qué toca esta semana?"];
    return sheetHTML("Preguntar a {{MARCA}}", `<p class="ai-note">Respuestas generadas por IA con los datos del expediente. No sustituyen el consejo de un abogado.</p>
      <div class="chat">${c.turns.length ? "" : `<div class="msg ai"><p>Tengo el expediente de ${esc(x.nombre || "esta herencia")}: bienes, herederos, impuestos, estrategia y trámites. ¿Qué necesitas?</p></div>`}${c.turns.map((t) => `<div class="msg ${t.role === "user" ? "me" : "ai"}">${t.role === "user" ? esc(t.content) : md(t.content)}</div>`).join("")}${c.busy ? `<div class="msg ai" id="ia-live">${c.live ? md(c.live) : '<span style="color:var(--label-3)">…</span>'}</div>` : ""}</div>
      ${c.err ? `<p class="group-foot" style="color:var(--orange)">${esc(c.err)}</p>` : ""}
      ${!c.turns.length && !c.busy ? `<div class="chips" style="margin-bottom:12px">${sug.map((q) => `<button data-iaq="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
      <div class="composer"><textarea id="ia-in" rows="1" placeholder="Escribe" ${c.busy ? "disabled" : ""}></textarea>${c.busy ? `<button data-act="iaStop" aria-label="Detener">${I.stop}</button>` : `<button data-act="iaSend" aria-label="Enviar">${I.send}</button>`}</div>`);
  }
  if (s.tipo === "menu") {
    return sheetHTML("Opciones", `<div class="group" style="--inset:60px">${FAMILIA_CUESTIONARIO || exp()?.familia ? `<button class="row" data-act="familia"><span class="ico green">${I.person}</span><span class="t"><b>Datos de la familia</b><small>${exp()?.familia ? "Recibidos el " + fechaCorta(exp().familia.recibido) : "Enviar el cuestionario o cargar la respuesta"}</small></span>${I.chev}</button>` : ""}<button class="row" data-act="paraFamilia"><span class="ico blue">${I.people}</span><span class="t"><b>Para la familia</b><small>Modo reunión y carpeta para el móvil</small></span>${I.chev}</button><button class="row" data-act="informePdf"><span class="ico q">${I.dl}</span><span class="t"><b>Informe de cálculo en PDF</b></span>${I.chev}</button><button class="row" data-act="editar"><span class="ico teal">${I.list}</span><span class="t"><b>Revisar con el asistente</b></span>${I.chev}</button><button class="row" data-act="situ"><span class="ico indigo">${I.sliders}</span><span class="t"><b>Ajustar trámites al caso</b></span>${I.chev}</button><button class="row" data-doc="liquidacion"><span class="ico gold">${I.law}</span><span class="t"><b>Propuesta de liquidación</b></span>${I.chev}</button><button class="row" data-act="icsx"><span class="ico blue">${I.calplus}</span><span class="t"><b>Plazos al calendario</b><small>Archivo .ics con aviso una semana antes</small></span>${I.chev}</button><button class="row" data-act="exportarExp"><span class="ico green">${I.dl}</span><span class="t"><b>Exportar este expediente</b><small>Con sus documentos, para otro equipo o abogado</small></span>${I.chev}</button><button class="row" data-act="duplicar"><span class="ico blue">${I.doc}</span><span class="t"><b>Duplicar como escenario</b></span>${I.chev}</button><button class="row" data-act="exportar"><span class="ico green">${I.tax}</span><span class="t"><b>Copiar el informe completo</b></span>${I.chev}</button></div>
      ${s.confirmar ? `<div class="zona-peligro conf" role="alertdialog" aria-label="Confirmar el borrado"><p><b>¿Borrar ${esc(exp()?.despacho?.ref || "este expediente")}?</b> ${esc(rbBorrarTexto(exp()))}</p><span class="zp-acts"><button class="btn sm gray" data-act="menu">Cancelar</button><button class="btn sm danger-solid" data-act="borrarSi">Sí, borrar</button></span></div>` : `<div class="zona-peligro"><p>Borrar el expediente lo quita de este equipo con sus datos y su seguimiento.</p><button class="btn sm danger" data-act="borrar">${I.trash}Borrar este expediente</button></div>`}`);
  }
  if (s.tipo === "ajustes") {
    const tm = DB.tema || "grafito"; const D = despachoCfg();
    return sheetHTML("Despacho y ajustes", `<div class="sectitle" style="margin-top:4px">Despacho</div>
      <div class="group"><div class="field"><label for="a-n">Nombre del despacho</label><input id="a-n" data-cfg="nombre" value="${esc(D.nombre)}" placeholder="Ej.: Zambrano Abogados"></div><div class="field"><label for="a-c">Colegio de la Abogacía</label><input id="a-c" data-cfg="colegio" value="${esc(D.colegio)}" placeholder="Ej.: Ilustre Colegio de Abogados de Málaga"></div><div class="field"><label for="a-l">Localidad para los escritos</label><input id="a-l" data-cfg="localidad" value="${esc(D.localidad)}" placeholder="Málaga"></div></div>
      ${dpCamposContactoHTML()}
      <div class="sectitle">Equipo</div>
      <div class="group" style="--inset:58px">${D.abogados.map((a) => `<div class="row">${avatar(a.id, true)}<span class="t abo-g"><input class="inl" data-abo="${a.id}" data-k="nombre" value="${esc(a.nombre)}" aria-label="Nombre"><input class="inl" data-abo="${a.id}" data-k="rol" value="${esc(a.rol || "")}" aria-label="Rol" placeholder="Rol"><select class="inl" data-abo="${a.id}" data-k="genero" aria-label="Tratamiento en los escritos" title="Tratamiento en los escritos (abogado o abogada, socio o socia)"><option value="">Neutro</option><option value="f" ${a.genero === "f" ? "selected" : ""}>Femenino</option><option value="m" ${a.genero === "m" ? "selected" : ""}>Masculino</option></select></span>${D.abogados.length > 1 ? (ui.conf === "abo:" + a.id ? `<span class="zp-inline"><button class="btn sm gray" data-conf="">Cancelar</button><button class="btn sm danger-solid" data-delabo="${a.id}">Quitar</button></span>` : `<button class="tbtn" data-conf="abo:${a.id}" aria-label="Quitar a ${esc(a.nombre)} del equipo" title="Quitar del equipo">${I.trash}</button>`) : ""}</div>`).join("")}<button class="row" data-act="addAbo"><span class="ico q">${I.plus}</span><span class="t"><b>Añadir miembro del equipo</b></span></button></div>
      <div class="group" style="margin-top:12px"><div class="field"><label for="a-yo">Quién usa este equipo</label><select id="a-yo" data-cfg="yo">${D.abogados.map((a) => `<option value="${a.id}" ${D.yo === a.id ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select><span class="hint">Firma las anotaciones de la bitácora.</span></div></div>
      ${typeof scPerfilesHTML === "function" ? scPerfilesHTML() : "" /* socio.js: perfil de cada persona */}
      <div class="sectitle">Compartir</div><div class="group" style="--inset:60px">${wgFilaAjustes()}${esCopiaLocal() ? `<button class="row" data-act="enviarCopia"><span class="ico blue">${I.ext}</span><span class="t"><b>Enviar {{MARCA}} a un compañero</b><small>Descarga el programa en un archivo para enviarlo por correo o WhatsApp</small></span>${I.chev}</button>` : ""}<button class="row" data-act="novedades"><span class="ico q">${I.info}</span><span class="t"><b>Novedades de esta versión</b><small>${esc(versionTxt())} · ${fechaLarga(VERSION_APP.fecha)}</small></span>${I.chev}</button><button class="row" data-act="opinion"><span class="ico q">${I.spark}</span><span class="t"><b>Enviar tu opinión</b></span>${I.chev}</button></div>
      <div class="sectitle">Apariencia</div>
      <div class="group"><div class="field"><div class="seg block"><button data-tema="grafito" aria-pressed="${tm === "grafito" || tm === "oscuro"}">Grafito</button><button data-tema="claro" aria-pressed="${tm === "claro"}">Claro</button><button data-tema="sistema" aria-pressed="${tm === "sistema"}">Como el sistema</button></div></div></div>
      ${licSeccionHTML()}
      ${dmAjustesHTML()}
      ${typeof redAjustesHTML === "function" ? redAjustesHTML() : "" /* red.js: despacho en red */}
      ${sgAjustesHTML()}
      <div class="sectitle">Datos</div><div class="group" style="--inset:60px"><label class="row" style="cursor:pointer;position:relative;overflow:hidden"><span class="ico blue">${I.box}</span><span class="t"><b>Importar un archivo</b><small>Expediente exportado, datos de la familia o copia de seguridad</small></span>${I.chev}<input type="file" id="f-restore" accept=".json,application/json" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><button class="row" data-act="impAbrir"><span class="ico green">${I.list}</span><span class="t"><b>Traer la cartera desde una hoja (Excel / CSV)</b><small>Para empezar con las herencias que ya tienes abiertas, sin teclearlas</small></span>${I.chev}</button><button class="row" data-act="ics"><span class="ico gold">${I.calplus}</span><span class="t"><b>Plazos de la cartera al calendario</b></span>${I.chev}</button><button class="row" data-act="ejemplos"><span class="ico q">${I.doc}</span><span class="t"><b>Cargar casos de ejemplo</b></span>${I.chev}</button></div>
      <p class="group-foot">Los datos y los documentos se guardan en este equipo, en este navegador; no se envían a ningún servidor. Activa la copia automática (arriba, en «Copias de seguridad») para no depender de un solo ordenador. Para trabajar varios ordenadores con los mismos expedientes, usa «Despacho en red» (arriba); en el móvil, o en un navegador sin esa opción, los expedientes se pasan con «Exportar» o con una copia.</p>${hayWebPublica() ? `<p class="group-foot"><a href="/condiciones.html" target="_blank" rel="noopener">Condiciones</a> · <a href="/privacidad.html" target="_blank" rel="noopener">Privacidad</a> · <a href="/aviso-legal.html" target="_blank" rel="noopener">Aviso legal</a></p>` : ""}
      <div class="sectitle">Acerca de</div><div class="group"><div class="row"><span class="t"><b>Motor de cálculo</b></span><span class="v">${VERSION}</span></div><div class="row"><span class="t"><b>Trámites en el catálogo</b></span><span class="v">${TR_TOTAL}</span></div><div class="row"><span class="t"><b>Enlaces oficiales</b></span><span class="v">${Object.values(ENLACES).reduce((s, e) => s + e.accion.length + e.norma.length, 0)}</span></div><div class="row"><span class="t"><b>Normativas del impuesto</b></span><span class="v">${TERRITORIOS.length}</span></div><div class="row"><span class="t"><b>Ordenanzas de plusvalía</b></span><span class="v">${Object.keys(ORDENANZAS).length - 1}</span></div></div>`, "Hecho");
  }
  return "";
}

// ───────────────────── Render ─────────────────────
// Repintado seguro (H01/H05). El «change» de un campo llega al salir de él: con Tab, o en el mousedown de un clic.
// Repintar en ese instante destruía el campo siguiente (lo tecleado se perdía) o el botón pulsado (el clic se perdía).
// Ahora: (1) los campos de texto guardan en el modelo en cada «input»; (2) un render() pedido durante un «change»,
// o con el puntero pulsado, se aplaza hasta que el clic se ha procesado; nunca mientras el foco siga en el mismo campo
// de fecha ni con un desplegable abierto; (3) todo render() devuelve el foco, la selección y lo tecleado al campo equivalente.
const RD = { pend: false, ptr: false, ptrT: 0, origen: null, t: 0, espera: null, teclado: false, ya: false };
const RD_TEXTO = /^(text|search|email|tel|url|number|password|date|month|week|time|datetime-local)$/, RD_FECHA = /^(date|month|week|time|datetime-local)$/;
const rdEsTexto = (el) => !!el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && RD_TEXTO.test(el.type)));
const rdPulsado = () => RD.ptr && Date.now() - RD.ptrT < 4000;
function rdDiferir(origen) { RD.pend = true; if (origen && origen.nodeType === 1) RD.origen = origen; clearTimeout(RD.t); RD.t = setTimeout(rdTick, 0); }
function rdTick() {
  if (!RD.pend || rdPulsado()) return; // con el puntero pulsado, lo relanza pointerup
  const a = document.activeElement, dentro = a && a !== document.body && $app.contains(a);
  // Fecha que se sigue tecleando (Chrome lanza «change» en cada segmento) o desplegable recién abierto: esperar a que salga el foco
  if (dentro && ((a === RD.origen && a.tagName === "INPUT" && RD_FECHA.test(a.type)) || (a.tagName === "SELECT" && a !== RD.origen))) { rdEsperar(a); return; }
  RD.ya = true; try { render(); } finally { RD.ya = false; }
}
function rdEsperar(a) { if (RD.espera === a) return; RD.espera = a; a.addEventListener("focusout", () => { RD.espera = null; RD.origen = null; clearTimeout(RD.t); RD.t = setTimeout(rdTick, 0); }, { once: true }); }
function rdSoltar(e) { if (!RD.ptr) return; RD.ptr = false; if (RD.pend) { clearTimeout(RD.t); RD.t = setTimeout(rdTick, e && e.pointerType && e.pointerType !== "mouse" ? 120 : 0); } }
document.addEventListener("pointerdown", () => { RD.ptr = true; RD.ptrT = Date.now(); RD.teclado = false; }, true);
document.addEventListener("pointerup", rdSoltar, true);
document.addEventListener("pointercancel", rdSoltar, true);
document.addEventListener("click", () => { if (RD.pend) { clearTimeout(RD.t); RD.t = setTimeout(rdTick, 0); } });
document.addEventListener("keydown", (e) => { if (e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key.startsWith("Arrow")) RD.teclado = true; }, true);
// Una fecha a medio teclear (día, mes, año) no se repinta hasta salir del campo, la pida quien la pida (también firma.js)
document.addEventListener("input", (e) => { const t = e.target; if (t && t.tagName === "INPUT" && RD_FECHA.test(t.type) && $app.contains(t)) { RD.fechaEl = t; t.addEventListener("focusout", () => { if (RD.fechaEl === t) RD.fechaEl = null; }, { once: true }); } }, true);
// Identifica un elemento por su id o por sus atributos data-* (y su posición entre iguales) para encontrar su sucesor tras repintar
function rdClave(el) {
  if (!el || el === document.body || !el.isConnected || !$app.contains(el)) return null;
  if (el.id) return { sel: "#" + CSS.escape(el.id), i: 0 };
  let sel = el.tagName.toLowerCase(), n = 0;
  for (const a of el.attributes) if (/^(data-|name$|aria-label$|type$)/.test(a.name)) { sel += `[${a.name}="${CSS.escape(a.value)}"]`; n++; }
  if (!n) return null;
  const L = [...$app.querySelectorAll(sel)]; return { sel, i: Math.max(0, L.indexOf(el)) };
}
function rdFoco() {
  const a = document.activeElement; if (!a || a === document.body || !$app.contains(a)) return null;
  const campo = rdEsTexto(a) || a.tagName === "SELECT";
  if (!campo && !(RD.teclado && a.matches("button,a[href],[tabindex],input"))) return null;
  const c = rdClave(a); if (!c) return null;
  const f = { ...c, texto: rdEsTexto(a), v: a.value, editado: a.value !== a.defaultValue };
  try { f.s0 = a.selectionStart; f.s1 = a.selectionEnd; } catch (e) {}
  return f;
}
function rdRestaurar(f) {
  if (!f) return;
  const act = document.activeElement; if (act && act !== document.body && act.isConnected) return; // el foco no se perdió
  const n = $app.querySelectorAll(f.sel)[f.i]; if (!n || n.disabled) return;
  if (f.texto && f.editado && n.value !== f.v) {
    // Lo tecleado aún no estaba en el modelo: se repone y, al salir del campo, se confirma con un «change»
    n.value = f.v; let hubo = false;
    n.addEventListener("change", () => (hubo = true), { once: true });
    // (no durante un repintado: Chrome lanza blur al retirar el campo enfocado, y el siguiente ya hereda el valor)
    const alSalir = () => { if (renderizando) { n.addEventListener("blur", alSalir, { once: true }); return; } if (!hubo && n.isConnected && n.value !== n.defaultValue) n.dispatchEvent(new Event("change", { bubbles: true })); };
    n.addEventListener("blur", alSalir, { once: true });
  }
  try { n.focus({ preventScroll: true }); } catch (e) {}
  if (f.texto && f.s0 != null) try { n.setSelectionRange(f.s0, f.s1); } catch (e) {}
  else if (f.texto && n.value && !RD_FECHA.test(n.type)) { const v = n.value; n.value = ""; n.value = v; } // correo, número: sin API de selección, el cursor va al final
}
// H26: pestañas del expediente con indicador de desplazamiento (flechas y degradado solo en el lado con más pestañas) y rueda vertical → horizontal
function snFlechas() {
  const w = document.querySelector(".sn-wrap"), n = w && w.querySelector(".secnav"); if (!n) return;
  const upd = () => { const max = n.scrollWidth - n.clientWidth; w.classList.toggle("sn-l", n.scrollLeft > 2); w.classList.toggle("sn-r", max > 2 && n.scrollLeft < max - 2); };
  if (!n.dataset.sn) {
    n.dataset.sn = "1";
    n.addEventListener("scroll", upd, { passive: true });
    n.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && n.scrollWidth > n.clientWidth + 2) { e.preventDefault(); n.scrollLeft += e.deltaY; } }, { passive: false });
  }
  upd();
}
window.addEventListener("resize", () => { try { snFlechas(); } catch (e) {} });
let renderizando = false;
function render() {
  if (!RD.ya) {
    const ev = window.event, tipo = ev && ev.type;
    if (rdPulsado() || tipo === "change" || tipo === "focusout" || tipo === "blur") { rdDiferir(ev && ev.target); return; }
    if (RD.fechaEl && RD.fechaEl === document.activeElement && RD.fechaEl.isConnected && (!tipo || tipo === "input")) { rdDiferir(RD.fechaEl); return; } // no si lo pide una tecla o un clic (Escape, atajos)
  }
  if (renderizando) { queueMicrotask(render); return; }
  if (typeof moVT === "function" && moVT(render)) return; // motion.js: transición entre vistas (si el navegador la tiene)
  RD.pend = false; RD.origen = null; clearTimeout(RD.t);
  renderizando = true;
  const foco = rdFoco();
  if (!HF.clave) HF.antes = rdClave(document.activeElement); // quién abre la hoja (para devolverle el foco al cerrarla)
  moAntes();
  try { render0(); rbSoloLectura(); } catch (e) { rbPantallaError(e, ui.sheet?.tipo === "ajustes"); } finally { renderizando = false; }
  try { if (typeof acPase === "function") acPase($app); } catch (e) {} // acceso.js: nombres y regiones desplazables (antes de recuperar el foco)
  try { rdRestaurar(foco); } catch (e) {}
  try { hojaFoco(); } catch (e) {}
  try { vfTodo(); } catch (e) {}
  moDespues();
  bvTips();
  try { const t = document.querySelector(".secnav [aria-current=\"page\"]"), n = t && t.parentElement; if (n && n.scrollWidth > n.clientWidth) n.scrollLeft = Math.max(0, t.offsetLeft - n.clientWidth / 2 + t.offsetWidth / 2); } catch (e) {}
  try { snFlechas(); } catch (e) {}
  navProgramar();
  try { asGuardar(); } catch (e) {}
}
function render0() {
  aplicarTema();
  const scroll = document.querySelector(".sheet .body")?.scrollTop;
  let hoja = ui.sheet ? vSheet() : "";
  if (ui.sheet && !hoja) ui.sheet = null; // la hoja apunta a algo que ya no existe (p. ej., al volver con «Atrás» a la ficha de una persona quitada)
  if (ui.vista === "asist") $app.innerHTML = vAsistente() + hoja;
  else {
    const main = ui.vista === "exp" ? vExp() : ui.vista === "radar" ? vRadar() : ui.vista === "socio" && typeof vSocio === "function" ? vSocio() /* socio.js */ : ui.vista === "rent" ? vRentabilidad() : ui.vista === "agenda" ? vAgenda() : ui.vista === "biblio" ? vBiblio() : vHome();
    $app.innerHTML = `<button type="button" class="mo-salto" data-mo-salto>Ir al contenido</button><div class="shell">${vSide()}<main class="main">${dmBanner()}${sgBanner()}${typeof redBanner === "function" ? redBanner() : "" /* red.js */}${licBannerHTML()}${main}</main></div>` + hoja;
  }
  // M9: con una hoja abierta, lo de detrás queda inerte (ni Tab ni el lector de pantalla llegan a ello)
  if (ui.sheet) { for (const n of $app.children) if (!n.matches(".sheet,.scrim")) n.setAttribute("inert", ""); }
  { const tm = document.getElementById("tm-root"); if (tm) tm.toggleAttribute("inert", !!ui.sheet); }
  document.documentElement.style.overflow = ui.sheet ? "hidden" : "";
  if (scroll != null) { const b = document.querySelector(".sheet .body"); if (b && ui.sheet?.tipo !== "ia") b.scrollTop = scroll; }
  marcaScroll();
}
function marcaScroll() { const tb = document.querySelector(".topbar"); if (tb) tb.classList.toggle("scrolled", window.scrollY > 40); }
window.addEventListener("scroll", marcaScroll, { passive: true });
// K5: en móvil y con zoom, al bajar por la página se retiran el cronómetro flotante (y, en pantallas bajas, la barra de pestañas) para no
// tapar el contenido; vuelven en cuanto se sube un poco o al llegar al final
let nvY = 0;
window.addEventListener("scroll", () => { const y = window.scrollY, h = document.documentElement, fin = window.innerHeight + y >= h.scrollHeight - 4; if (fin || y < 120 || y < nvY - 6) h.classList.remove("nv-baja"); else if (y > nvY + 6) h.classList.add("nv-baja"); nvY = y; }, { passive: true });
window.addEventListener("resize", (() => { let w = escritorio(); return () => { if (escritorio() !== w) { w = escritorio(); render(); } }; })());
window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => { if (DB.tema === "sistema") aplicarTema(); });

function prepararEjemplo(k) {
  const n = ejemplo(k); const D = despachoCfg();
  n.situ = n.situ || (k === "mar" ? { decesos: true, pensionista: true } : k === "and" || k === "est" ? { pensionista: true } : {});
  if (!n.tramites) n.tramites = Object.fromEntries((k === "mar" ? ["defuncion", "custodia", "decesos", "pensionista", "ultimas", "seguros_cert", "testamento", "inventario_plazo"] : ["defuncion", "custodia", "ultimas", "seguros_cert"]).map((q) => [q, { estado: "hecho" }]));
  { const R0 = calcular(n); for (const t of tramitesExp(n, R0)) if ((t.limite && t.limite < hoy() && !t.informativo) || (t.fase === "urgente" && t.desde == null && !t.limite)) n.tramites[t.id] = { estado: "hecho" }; }
  n.despacho = n.despacho || { cliente: (n.personas.find((p) => p.relacion !== "conyuge") || n.personas[0]).nombre };
  n.despacho.ref = nuevaRef(); n.despacho.alta = trDias(n.fecha, 12);
  n.despacho.movs = n.despacho.movs || [{ id: uid(), tipo: "provision", concepto: "Provisión inicial", importe: num(n.despacho.provision) || 600, fecha: trDias(n.fecha, 14) }, { id: uid(), tipo: "suplido", concepto: "Certificados de últimas voluntades y seguros", importe: 15.28, fecha: trDias(n.fecha, 30) }];
  n.despacho.checks = { ident: true, encargo: true, conflicto: true, datos: true };
  n.fase = { est: "documentacion", mar: "liquidacion", and: "documentacion", mad: "encargo" }[k] || "encargo";
  n.responsable = D.abogados[0].id;
  n.bitacora = [];
  anotar(n, "Expediente abierto", "sistema"); anotar(n, "Hoja de encargo firmada y provisión de fondos recibida", "nota"); if (n.fase !== "encargo") anotar(n, `Fase: Encargo → ${faseN(n.fase)}`, "fase");
  n.bitacora.forEach((e, i) => { e.t = new Date(Date.now() - (i + 1) * 36e5 * 20).toISOString(); });
  return n;
}
function nuevaPersona(x, rel) { const p = { id: uid(), nombre: "", relacion: rel, edad: "" }; x.personas = x.personas || []; x.personas.push(p); ui.sheet = { tipo: "persona", id: p.id }; }
function nuevoBien(x, t) { const b = { id: uid(), tipo: t, descripcion: "", valor: "", titularidad: x.civil === "gananciales" && ["vivienda", "cuenta"].includes(t) ? "ganancial" : "privativo", municipio: "OTRO" }; x.bienes = x.bienes || []; x.bienes.push(b); ui.sheet = { tipo: "bien", id: b.id }; }
// H28: un único estado por documento. Recibir el documento cierra el trámite de obtenerlo y, en los trámites que consisten
// en tenerlo (defunción, declaración de herederos, nota simple, IBI, valor de referencia, saldos, deudas, pareja), marcar el trámite
// como hecho marca el documento como recibido (y volver a «pendiente» lo desmarca). En «Pedir…» (últimas voluntades, seguros,
// copia del testamento) solo va del documento al trámite: pedirlo no es tenerlo.
// documento → [trámite, bidireccional]; los documentos por bien (esc_<id>…) cierran el trámite cuando están todos.
const DOC_TRAM = { defuncion: ["defuncion", 1], ultimas: ["ultimas", 0], seguros: ["seguros_cert", 0], testamento: ["testamento", 0], declaracion: ["declaracion", 1], pareja: ["pareja_registro", 1], deudas: ["deudas_cert", 1] };
const DOC_TRAM_GRUPO = [["esc_", "nota_simple"], ["ibi_", "ibi"], ["vref_", "valor_ref"], ["cert_", "bancos_cert"]];
function dtTram(docId) { if (DOC_TRAM[docId]) return DOC_TRAM[docId]; const g = DOC_TRAM_GRUPO.find(([p]) => docId.startsWith(p)); return g ? [g[1], 1] : null; }
const dtDocs = (x, tid) => docsNecesarios(x).map(([id]) => id).filter((id) => { const m = dtTram(id); return m && m[0] === tid; });
const dtTitulo = (x, tid) => { try { const t = tramitesExp(x, calcular(x)).find((q) => q.id === tid); return t ? t.titulo : tid; } catch (e) { return tid; } };
function docTramDesdeDoc(x, docId, anota) {
  const m = dtTram(docId); if (!m) return;
  const ids = dtDocs(x, m[0]); if (!ids.length) return;
  const docs = x.despacho?.docs || {}, n = ids.filter((i) => docs[i]).length;
  const s = estadoT(x, m[0]), antes = s.estado || "pend";
  if (antes === "na") return;
  const nuevo = n === ids.length ? "hecho" : antes === "hecho" ? (n ? "curso" : m[1] ? "pend" : "curso") : n && antes === "pend" ? "curso" : antes;
  if (nuevo === antes) return;
  s.estado = nuevo;
  if (anota) anotar(x, `${dtTitulo(x, m[0])}: ${{ pend: "pendiente", curso: "en curso", hecho: "hecho" }[nuevo]} (${nuevo === "hecho" ? "documentación recibida" : "documento desmarcado"})`, "tramite");
}
function docTramDesdeTram(x, tid, estado) {
  const ids = dtDocs(x, tid).filter((id) => dtTram(id)[1]); if (!ids.length) return;
  x.despacho = x.despacho || {}; x.despacho.docs = x.despacho.docs || {};
  if (estado === "hecho") ids.forEach((i) => (x.despacho.docs[i] = true));
  else if (estado === "pend") ids.forEach((i) => delete x.despacho.docs[i]);
}
// Al arrancar y al abrir un expediente: pone de acuerdo los datos antiguos o los que otros módulos hayan escrito
function docTramReconciliar(x) {
  try {
    if (!x || !x.fecha) return;
    const docs = x.despacho?.docs || {}, vistos = new Set();
    for (const id of Object.keys(docs)) { const m = dtTram(id); if (m && docs[id] && !vistos.has(m[0])) { vistos.add(m[0]); docTramDesdeDoc(x, id, false); } }
    for (const tid of new Set([...Object.values(DOC_TRAM).map((q) => q[0]), ...DOC_TRAM_GRUPO.map((q) => q[1])])) if (x.tramites?.[tid]?.estado === "hecho") docTramDesdeTram(x, tid, "hecho");
  } catch (e) {}
}
function estadoT(x, id) { x.tramites = x.tramites || {}; return (x.tramites[id] = x.tramites[id] || {}); }

// ───────────────────── Eventos ─────────────────────
// El menú «Más» de las pestañas se cierra al pulsar fuera
document.addEventListener("click", (e) => { if (ui.snMas && !(e.target.closest && e.target.closest(".sn-mas,.sn-menu"))) { ui.snMas = false; render(); } });
$app.addEventListener("click", (e) => {
  // H42: en las filas con interruptor, toda la fila es pulsable (no solo el control de la derecha)
  { const fila = e.target.closest(".row.toggle"); if (fila && !e.target.closest("label,input,button,a,select,textarea")) { const cb = fila.querySelector('input[type="checkbox"]'); if (cb && !cb.disabled) { cb.click(); return; } } }
  const t = e.target.closest("button,[data-act],[data-editp],[data-sec],[data-open],[data-hsel],[data-pstep]"); if (!t || t.tagName === "A") return;
  const d = t.dataset; const x = objetivo();
  if (d.conf != null) { ui.conf = d.conf; render(); return; } // confirmación en dos pasos de las acciones destructivas
  if (d.act === "nuevo") { if (!licPuedeCrear()) { toast(licMotivoBloqueo()); ui.sheet = { tipo: "ajustes" }; render(); return; } ui.borrador = { id: uid(), creado: hoy(), personas: [], bienes: [], deudas: [], gastos: [], tramites: {}, situ: {}, ajuar: "sts", enPlazo: true, fase: "encargo", despacho: { alta: hoy() }, bitacora: [] }; go({ vista: "asist", paso: 0, buscar: "", sheet: null }); return; }
  if (d.ej) { const n = prepararEjemplo(d.ej); DB.expedientes.unshift(n); guardar(); go({ vista: "exp", id: n.id, sec: "resumen", sheet: null }); return; }
  if (d.act === "ejemplos") { if (!licPuedeCrear()) { toast(licMotivoBloqueo()); ui.sheet = { tipo: "ajustes" }; render(); return; } for (const k of ["mad", "and", "mar", "est"]) DB.expedientes.unshift(prepararEjemplo(k)); guardar(); go({ vista: "inicio", sheet: null }); toast("Cuatro casos de ejemplo cargados"); return; }
  if (d.cv) { ui.cv = d.cv; render(); return; }
  if (d.orden) { if (ui.orden === d.orden) ui.ordenDir = -(ui.ordenDir || 1); else { ui.orden = d.orden; ui.ordenDir = 1; } render(); return; }
  if (d.fase) { const q = exp(); if (q && q.fase !== d.fase) { anotar(q, `Fase: ${faseN(q.fase)} → ${faseN(d.fase)}`, "fase"); q.fase = d.fase; guardar(); render(); } return; }
  if (d.chk) { const q = exp(); q.despacho = q.despacho || {}; q.despacho.checks = q.despacho.checks || {}; q.despacho.checks[d.chk] = !q.despacho.checks[d.chk]; guardar(); render(); return; }
  if (d.act === "addMov") { const q = exp(); const tp = document.getElementById("m-t").value, c = document.getElementById("m-c").value.trim(), im = num(document.getElementById("m-i").value), f = document.getElementById("m-f").value || hoy(); if (!im) { toast("Indica el importe"); return; } q.despacho = q.despacho || {}; q.despacho.movs = q.despacho.movs || []; q.despacho.movs.push({ id: uid(), tipo: tp, concepto: c || MOV_T[tp][0], importe: im, fecha: f }); anotar(q, `${MOV_T[tp][0]}: ${eur(im)}${c ? " (" + c + ")" : ""}`, "fondos"); guardar(); render(); return; }
  if (d.delmov) { const q = exp(); q.despacho.movs = q.despacho.movs.filter((m) => m.id !== d.delmov); guardar(); render(); return; }
  if (d.act === "addNota") { const q = exp(); const v = document.getElementById("n-t").value.trim(); if (!v) return; anotar(q, v, "nota"); guardar(); render(); return; }
  if (d.act === "addAbo") { const D = despachoCfg(); D.abogados.push({ id: "a" + uid(), nombre: "Nuevo miembro", rol: "Abogado/a" }); guardar(); render(); return; }
  if (d.delabo) { const D = despachoCfg(); D.abogados = D.abogados.filter((a) => a.id !== d.delabo); guardar(); render(); return; }
  if (d.open) { go({ vista: "exp", id: d.open, sec: d.goT ? "tramites" : "resumen", tv: "lista", sheet: d.goT ? { tipo: "tramite", id: d.goT } : null }); return; }
  if (d.modo) { DB.modo = d.modo; guardar(); render(); return; }
  if (d.tema) { DB.tema = d.tema; guardar(); render(); return; }
  if (d.act === "home") { go({ vista: "inicio", sheet: null }); return; }
  if (d.act === "addPersona" || d.act === "addBien" || d.act === "mas" || d.act === "menuApp") { ui.sheet = { tipo: d.act }; render(); return; }
  if (d.act === "biblio") { go({ vista: "biblio", sheet: null }); return; }
  if (d.act === "menuBuscar") { ui.sheet = null; render(); pkAbrir(); return; }
  if (d.bn) { ui.bn = d.bn; render(); return; }
  if (d.act === "enviarCopia") { enviarCopia(); return; }
  if (d.act === "exportarExp") { const q = exp(); if (q) exportarExpediente(q); return; }
  if (d.act === "pdf") { imprimirDoc(); return; }
  if (d.act === "opinion") { ui.sheet = { tipo: "opinion" }; render(); return; }
  if (d.act === "novedades") { ui.sheet = { tipo: "novedades" }; DB.vistoVersion = VERSION_APP.n; guardar(); render(); return; }
  if (d.nota) { ui.nota = Number(d.nota); document.querySelectorAll("[data-nota]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.nota === d.nota)); return; }
  if (d.act === "opWa") { abrirExterno("https://wa.me/?text=" + encodeURIComponent(opinionTexto())); return; }
  if (d.act === "opMail") { abrirExterno("mailto:?subject=" + encodeURIComponent("Opinión sobre {{MARCA}}") + "&body=" + encodeURIComponent(opinionTexto())); return; }
  if (d.act === "opCopy") { copiar(opinionTexto()); return; }
  if (d.pstep != null) { ui.pstep = Number(d.pstep); render(); const pn = document.querySelector(".pnav"); if (pn) pn.scrollIntoView({ block: "nearest" }); return; }
  if (d.act === "pIndiviso") { const x = exp(); for (const b of x.bienes || []) delete b.adjudicadoA; anotar(x, "Partición: todos los bienes en proindiviso", "sistema"); guardar(); render(); return; }
  if (d.act === "pLotes") { const x = exp(), R = calcular(x); const LT = lotes(x, R); if (LT && LT.aplica) { for (const b of x.bienes || []) if (LT.asig[b.id] && esInm(b)) b.adjudicadoA = LT.asig[b.id]; anotar(x, "Partición: lotes propuestos para reducir la plusvalía", "sistema"); guardar(); render(); toast("Lotes aplicados. Revisa las compensaciones"); } return; }
  if (d.hsel) { ui.hsel = d.hsel; if (ui.sec !== "impuestos") ui.sec = "impuestos"; render(); return; }
  if (d.act === "simReset") { ui.sim = null; render(); return; }
  if (d.act === "simGuardar") { const x = exp(); const c = aplicarSim(x, simEstado(x)); c.id = uid(); c.nombre = (c.nombre || "Herencia") + " (escenario)"; c.ejemplo = false; c.snap = null; c.avisos = []; c.tiempos = []; c.solicitudes = []; c.recordatorios = []; c.despacho = { ...(c.despacho || {}), ref: rbRefUnica(c.despacho?.ref || nuevaRef()) }; anotar(c, "Escenario creado desde el simulador", "sistema"); DB.expedientes.unshift(c); ui.sim = null; guardar(); go({ vista: "exp", id: c.id, sec: "impuestos", sheet: null }); toast("Escenario guardado"); return; }
  if (d.act === "avisoVisto") { const x = exp(); (x.avisos || []).forEach((a) => (a.visto = true)); guardar(); render(); return; }
  if (d.act === "biblioNov") { ui.bn = "novedades"; go({ vista: "biblio", sheet: null }); return; }
  if (d.dfil) { ui.dfil = d.dfil; render(); return; }
  if (d.act === "impAbrir") { if (!licPuedeCrear()) { toast(licMotivoBloqueo()); return; } ui.imp = null; ui.sheet = { tipo: "importar" }; render(); return; }
  if (d.act === "impPlantilla") { impPlantillaCSV(); return; }
  if (d.act === "impOtro") { ui.imp = null; render(); return; }
  if (d.act === "impAplicar") { const n = impAplicar((ui.imp || {}).filas || []); ui.imp = null; ui.sheet = null; go({ vista: "inicio", sheet: null }); toast(`${plural(n, "expediente importado", "expedientes importados")}. Completa cada uno con sus documentos.`); return; }
  if (d.act === "familia") { ui.sheet = { tipo: "familia" }; render(); return; }
  if (d.act === "lecNuevo") { if (!licPuedeCrear()) { toast(licMotivoBloqueo()); ui.sheet = { tipo: "ajustes" }; render(); return; } ui.sheet = { tipo: "lecNuevo" }; render(); return; }
  if (d.act === "lecSeparar") { lecMezcla("separar"); return; }
  if (d.act === "lecQuitar") { lecMezcla("quitar", Number(d.g)); return; }
  if (d.act === "lecMisma") { lecMezcla("misma"); return; }
  if (d.act === "lecAplicar") { const x = DB.expedientes.find((q) => q.id === LEC.exp) || exp(); if (!x) return; const ids = [...document.querySelectorAll("[data-lecsel]:checked")].map((n) => n.dataset.lecsel); if (!ids.length) { toast("No hay nada marcado"); return; } const sep = (LEC.resultado && LEC.resultado.separados) || []; const n = lecAplicar(x, ids); ui.sheet = null; if (sep.length) setTimeout(() => toast(`Datos cargados en ${nombreExp(x)} y en ${sep.map((s) => s.ref).join(", ")}`), 2500); if (ui.vista !== "exp" || ui.id !== x.id) go({ vista: "exp", id: x.id, sec: "herencia", sheet: null }); else render(); toast(`${plural(n, "dato cargado", "datos cargados")} en el expediente. Revisa lo marcado «leído de documento».`); return; }
  if (d.act === "famWa") { const x = exp(); abrirExterno(familiaWaURL(x)); marcarEnviado(x, "enviado por WhatsApp"); render(); return; }
  if (d.act === "famMail") { const x = exp(); abrirExterno(familiaMailURL(x)); marcarEnviado(x, "enviado por correo"); render(); return; }
  if (d.act === "famCopy") { const x = exp(); copiar(familiaEnlace(x)); marcarEnviado(x, "copiado para enviar"); render(); return; }
  if (d.act === "famFile") { descargarCuestionario(exp()); render(); return; }
  if (d.act === "nuevoFamilia") { if (!licPuedeCrear()) { toast(licMotivoBloqueo()); ui.sheet = { tipo: "ajustes" }; render(); return; } const b = ui.borrador; b.despacho = b.despacho || {}; if (!b.despacho.ref) b.despacho.ref = nuevaRef(); if (!b.responsable) b.responsable = despachoCfg().abogados[0]?.id; anotar(b, "Expediente abierto para recibir los datos de la familia", "sistema"); DB.expedientes.unshift(b); asOlvidar(b.id); guardar(); navFueraDelAsistente(() => go({ vista: "exp", id: b.id, sec: "resumen", borrador: null, editando: false, sheet: { tipo: "familia" } })); return; }
  if (d.act === "agenda") { go({ vista: "agenda", sheet: null }); return; }
  if (d.act === "ajustes") { ui.sheet = { tipo: "ajustes" }; render(); return; }
  if (d.act === "ics") { exportarICS(DB.expedientes); return; }
  if (d.act === "icsx") { const q = exp(); if (q) exportarICS([q]); return; }
  if (d.av) { ui.av = d.av; render(); return; }
  if (d.cal) { ui.calMes = d.cal; render(); return; }
  if (d.act === "salirAsist") { asSalir(); return; }
  if (d.act === "asRetomar") { asRetomar(); return; }
  if (d.act === "asDescartar") { asDescartar(); return; }
  if (d.act === "atras") { go({ paso: Math.max(0, ui.paso - 1) }); return; }
  if (d.act === "siguiente") { go({ paso: ui.paso + 1 }); return; }
  if (d.act === "terminar") { const b = ui.borrador; if (!ui.editando) anotar(b, "Expediente abierto", "sistema"); else anotar(b, "Datos revisados con el asistente", "sistema"); const i = DB.expedientes.findIndex((q) => q.id === b.id); if (i >= 0) DB.expedientes[i] = b; else DB.expedientes.unshift(b); asOlvidar(b.id); guardar(); navFueraDelAsistente(() => go({ vista: "exp", id: b.id, sec: "resumen", borrador: null, editando: false, sheet: null })); return; }
  if (d.terr) { x.ccaa = d.terr; render(); return; }
  if (d.civil) { x.civil = d.civil; render(); return; }
  if (d.test) { x.testamento = d.test; render(); return; }
  if (d.addp) { nuevaPersona(x, d.addp); persistir(); render(); return; }
  if (d.addb) { nuevoBien(x, d.addb); persistir(); render(); return; }
  if (d.editp) { ui.sheet = { tipo: "persona", id: d.editp }; render(); return; }
  if (d.editb) { ui.sheet = { tipo: "bien", id: d.editb }; if (d.mm) ui.muniManual = d.editb; render(); if (d.mm) setTimeout(() => { const n = document.getElementById("b-mest"); if (n) n.scrollIntoView({ block: "center" }); document.getElementById("b-t")?.focus({ preventScroll: true }); }, 60); return; }
  if (d.delp) { x.personas = x.personas.filter((p) => p.id !== d.delp); /* I8 (QA 07-10-2026): sus legados vuelven a la herencia y se quitan sus adjudicaciones */ const susLeg = (x.bienes || []).filter((b) => b.legatarioId === d.delp); for (const b of x.bienes || []) { if (b.legatarioId === d.delp) delete b.legatarioId; if (b.adjudicadoA === d.delp) delete b.adjudicadoA; } if (x.viviendaA === d.delp) delete x.viviendaA; if (susLeg.length && typeof anotar === "function") anotar(x, `Legado de ${susLeg.map((b) => b.descripcion || TIPO_BIEN[b.tipo][0]).join(", ")} anulado al quitar a la legataria o legatario: vuelve a la herencia`, "sistema"); ui.sheet = null; ui.conf = ""; persistir(); render(); toast(susLeg.length ? `Persona quitada. ${susLeg.length === 1 ? "Su legado vuelve" : "Sus legados vuelven"} a la herencia: revisa a quién corresponde${susLeg.length === 1 ? "" : "n"}` : "Persona quitada del expediente"); return; }
  if (d.delb) { x.bienes = x.bienes.filter((b) => b.id !== d.delb); ui.sheet = null; ui.conf = ""; persistir(); render(); toast("Bien quitado del inventario"); return; }
  if (d.plin) { const p = x.personas.find((q) => q.id === ui.sheet.id); p.lineaAsc = d.plin; persistir(); render(); return; }
  if (d.tit) { const b = x.bienes.find((q) => q.id === ui.sheet.id); b.titularidad = d.tit; if (d.tit === "proindiviso" && !b.porcentaje) b.porcentaje = 50; persistir(); render(); return; }
  if (d.act === "cerrarSheet") { ui.sheet = null; persistir(); render(); return; }
  if (d.sh) { shSet(d.sh, d.v); render(); return; }
  if (d.act === "paraFamilia") { ui.sheet = { tipo: "carpeta" }; render(); return; }
  if (d.act === "reunion") { reunionAbrir(x); return; }
  if (d.act === "carpetaDescargar") { carpetaDescargar(x); return; }
  if (d.snmov) { const n = document.querySelector(".secnav"); if (n) n.scrollBy({ left: Number(d.snmov) * Math.max(160, n.clientWidth * 0.6), behavior: "smooth" }); return; }
  if (d.act === "snMas") { ui.snMas = !ui.snMas; render(); return; }
  if (d.act === "resumenTodo") { DB.resumenCompleto = !DB.resumenCompleto; guardar(); render(); return; }
  if (d.sec) { ui.sec = d.sec; ui.snMas = false; if (d.tv) ui.tv = d.tv; if (d.sub) ui.sub = d.sub; ui.sheet = null; render(); window.scrollTo(0, 0); return; }
  if (d.sub) { ui.sub = d.sub; render(); return; }
  if (d.dsub) { ui.dsub = d.dsub; render(); return; }
  if (d.tf) { ui.tf = d.tf; render(); return; }
  if (d.tv) { ui.tv = d.tv; render(); return; }
  if (d.tst) { const s = estadoT(x, d.tst); s.estado = { undefined: "curso", pend: "curso", curso: "hecho", hecho: "pend", na: "pend" }[s.estado]; const tt = tramitesExp(x, calcular(x)).find((q) => q.id === d.tst); anotar(x, `${tt ? tt.titulo : d.tst}: ${{ pend: "pendiente", curso: "en curso", hecho: "hecho", na: "no aplica" }[s.estado]}`, "tramite"); docTramDesdeTram(x, d.tst, s.estado); guardar(); render(); return; }
  if (d.topen) { ui.sheet = { tipo: "tramite", id: d.topen }; render(); return; }
  if (d.tset) { estadoT(x, ui.sheet.id).estado = d.tset; const tt = tramitesExp(x, calcular(x)).find((q) => q.id === ui.sheet.id); anotar(x, `${tt ? tt.titulo : ui.sheet.id}: ${{ pend: "pendiente", curso: "en curso", hecho: "hecho", na: "no aplica" }[d.tset]}`, "tramite"); docTramDesdeTram(x, ui.sheet.id, d.tset); guardar(); render(); return; }
  if (d.tdoc != null) { const s = estadoT(x, ui.sheet.id); s.docs = s.docs || {}; s.docs[d.tdoc] = !s.docs[d.tdoc]; guardar(); render(); return; }
  if (d.act === "situ") { ui.sheet = { tipo: "situ" }; render(); return; }
  if (d.act === "deudas") { ui.sheet = { tipo: "deudas" }; render(); return; }
  if (d.act === "menu") { ui.sheet = { tipo: "menu" }; render(); return; }
  if (d.act === "editar") { const B = DB.borradorAsist; if (B && B.editando && B.b && B.b.id === ui.id) { ui.borrador = JSON.parse(JSON.stringify(B.b)); go({ vista: "asist", paso: B.paso || 1, sheet: null, editando: true }); toast("Retomas los cambios que dejaste a medias"); return; } ui.borrador = JSON.parse(JSON.stringify(exp())); ui.borrador.ejemplo = false; go({ vista: "asist", paso: 1, sheet: null, editando: true }); return; }
  if (d.act === "duplicar") { if (!licPuedeCrear()) { toast(licMotivoBloqueo()); ui.sheet = { tipo: "ajustes" }; render(); return; } const c = JSON.parse(JSON.stringify(exp())); c.id = uid(); c.nombre = (c.nombre || "Herencia") + " (escenario)"; c.ejemplo = false; c.tiempos = []; c.solicitudes = []; c.recordatorios = []; delete c.demo; c.despacho = { ...(c.despacho || {}), ref: rbRefUnica(c.despacho?.ref || nuevaRef()) }; DB.expedientes.unshift(c); guardar(); go({ vista: "exp", id: c.id, sheet: null }); toast("Escenario duplicado"); return; }
  if (d.palanca) { const y = aplicarPalanca(exp(), d.palanca); if (!y) return; if (y.despacho) y.despacho = { ...y.despacho, ref: (y.despacho.ref || "") + "-E" }; anotar(y, "Escenario creado desde Estrategia fiscal", "sistema"); DB.expedientes.unshift(y); guardar(); go({ vista: "exp", id: y.id, sec: "impuestos", sheet: null }); toast("Escenario creado con el cambio aplicado"); return; }
  if (d.act === "exportar") { copiar(informe(exp())); return; }
  if (d.act === "borrar") { ui.sheet = { tipo: "menu", confirmar: true }; render(); return; }
  if (d.act === "borrarSi") { const id = ui.id; rbBorrarExpediente(id).then((n) => toast("Expediente borrado" + (n ? ` con ${plural(n, "documento")}` : ""))); go({ vista: "inicio", sheet: null }); return; }
  if (d.ajuar) { x.ajuar = d.ajuar; guardar(); render(); return; }
  if (d.cviv) { x.criterioVivienda = d.cviv; guardar(); render(); return; }
  if (d.doc) { ui.sheet = { tipo: "doc", id: d.doc }; render(); return; }
  if (d.act === "licActivar") { t.disabled = true; licActivar(document.getElementById("lic-codigo")?.value || "").then((r) => { if (r.ok) { toast("Licencia activada: " + licEstado().despacho); render(); } else { t.disabled = false; toast(r.error); } }); return; }
  if (d.muni) { const b = (x?.bienes || []).find((q) => q.id === ui.sheet?.id); if (b) { muniElegir(b, d.muni); ui.muniEdit = null; ui.muniManual = null; guardar(); render(); } return; }
  if (d.act === "muniCambiar") { ui.muniEdit = ui.sheet?.id; render(); setTimeout(() => document.getElementById("b-mq")?.focus(), 30); return; }
  if (d.act === "muniCancelar") { ui.muniEdit = null; render(); return; }
  if (d.act === "muniManual") { ui.muniManual = ui.sheet?.id; const bm = (x?.bienes || []).find((q) => q.id === ui.sheet?.id); render(); setTimeout(() => document.getElementById(bm && muniHac(bm.muniIne) && !(x.fecha < "2026-01-01") ? "b-bo" : "b-t")?.focus(), 30); return; }
  if (d.act === "muniMaxLegal") { const b = (x?.bienes || []).find((q) => q.id === ui.sheet?.id); if (b) { delete b.tipoManual; delete b.bonifManual; ui.muniManual = null; persistir(); render(); } return; }
  if (d.pdfdoc) { try { pdfEscrito(x, d.pdfdoc); anotar(x, `PDF descargado: ${DOC_TIT[d.pdfdoc]}`, "doc"); guardar(); } catch (err) { console.error(err); toast("No se pudo generar el PDF"); } return; }
  if (d.act === "informePdf") { try { if (!pdfInforme(x)) { toast("Faltan datos para calcular"); return; } anotar(x, "Informe de cálculo descargado en PDF", "doc"); guardar(); } catch (err) { console.error(err); toast("No se pudo generar el PDF"); } return; }
  if (d.copy) { copiar(docTexto(x, calcular(x), d.copy).replace(/⟦(?!REVISI)([^⟧]*)⟧/g, "[$1]").replace(/⟦|⟧/g, "")); return; }
  if (d.dl) { const n = (DOC_TIT[d.dl] + " - " + (x.nombre || "herencia")).replace(/[\\/:*?"<>|]/g, "") + ".docx"; descargar(n, docx(docTexto(x, calcular(x), d.dl), esrDocxOpts(x, DOC_TIT[d.dl]))); anotar(x, `Escrito descargado: ${DOC_TIT[d.dl]}`, "doc"); guardar(); return; }
  if (d.hon) { x.despacho = x.despacho || {}; x.despacho.honModo = d.hon; guardar(); render(); return; }
  if (d.docrec) { x.despacho = x.despacho || {}; x.despacho.docs = x.despacho.docs || {}; x.despacho.docs[d.docrec] = !x.despacho.docs[d.docrec]; docTramDesdeDoc(x, d.docrec, true); guardar(); render(); return; }
  if (d.copy650) { const h = calcular(x).isd.herederos.find((q) => q.id === d.copy650); copiar(`${h.nombre} (${RELACIONES[h.relacion].label}, grupo ${h.grupo})\n` + h.traza.map((q) => `${q.paso}\t${grp(q.valor, 2)}`).join("\n")); return; }
  if (d.fver) { ui.sheet = { tipo: "fver", id: d.fver }; render(); return; }
  if (d.fdl) { const f = ARCH.lista.find((q) => q.id === d.fdl); if (f) descargar(f.nombre, f._b); return; }
  if (d.fdel) { archivoBorrar(d.fdel); ui.sheet = null; toast("Documento eliminado"); return; }
  if (d.act === "copiarSolicitud") { const L = docsNecesarios(x).filter(([id]) => !x.despacho?.docs?.[id]); copiar(`Hola${x.despacho?.cliente ? " " + x.despacho.cliente.split(" ")[0] : ""}:\n\nPara avanzar con la herencia de ${x.nombre || "tu familiar"} necesitamos estos documentos:\n\n${L.map(([, q, sb]) => `· ${q}${sb ? " (" + sb + ")" : ""}`).join("\n")}\n\nPuedes enviarlos escaneados o en foto legible. Si alguno te cuesta conseguirlo, dínoslo y lo pedimos nosotros.\n\nUn saludo.`); return; }
  if (d.act === "auditar") { iaAuditar(); return; }
  if (d.act === "ia") { ui.sheet = { tipo: "ia" }; render(); scrollChat(); setTimeout(() => document.getElementById("ia-in")?.focus(), 350); return; }
  if (d.iaq) { if (!ui.sheet || ui.sheet.tipo !== "ia") ui.sheet = { tipo: "ia" }; iaEnviar(d.iaq); return; }
  if (d.act === "iaSend") { const q = document.getElementById("ia-in"); if (q && q.value.trim()) iaEnviar(q.value); return; }
  if (d.act === "iaStop") { const c = CHATS[x.id]; if (c && c.ctl) c.ctl.abort(); return; }
  if (d.act === "backup") { sgDescargarCopia(); return; }
});
$app.addEventListener("input", (e) => {
  const t = e.target; const d = t.dataset;
  if (t.id === "d-q") { ui.dq = t.value; const pos = t.selectionStart; render(); const n = document.getElementById("d-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  if (t.id === "s-q" || t.id === "h-q") { ui.q = t.value; const pos = t.selectionStart, id = t.id; render(); const n = document.getElementById(id); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  if (d.simval) { const f = Number(t.value), l = document.getElementById("svl-" + d.simval); if (l) l.textContent = eur0(Math.round(Number(d.base) * f)) + (Math.abs(f - 1) >= 0.005 ? ` · ${f > 1 ? "+" : "−"}${grp(Math.abs(f - 1) * 100, 0)} %` : ""); return; }
  if (t.id === "b-mq") { const r = document.getElementById("b-mres"); if (r) r.innerHTML = muniResultados(t.value); return; }
  if (t.id === "b-q") { ui.bq = t.value; const pos = t.selectionStart; render(); const n = document.getElementById("b-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  if (t.id === "f-buscar") { ui.buscar = t.value; const pos = t.selectionStart; render(); const n = document.getElementById("f-buscar"); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (t.id === "ia-in") { t.style.height = "auto"; t.style.height = Math.min(140, t.scrollHeight) + "px"; return; }
  if (!rdEsTexto(t)) return; // casillas, desplegables y archivos: solo en «change»
  // Campos de texto: el modelo se actualiza en cada tecla, sin repintar, para que ningún repintado pierda lo tecleado (H01)
  if (d.cfg) { despachoCfg()[d.cfg] = t.value; rdGuardarPronto(); return; }
  if (d.abo) { const a = despachoCfg().abogados.find((q) => q.id === d.abo); if (a) a[d.k] = t.value; rdGuardarPronto(); return; }
  if ((ui.vista === "exp" || ui.vista === "asist") && !licPuedeEditar()) { toast(licMotivoEdicion()); render(); return; }
  const x = objetivo(); if (!x) return;
  if (d.b) { x[d.b] = t.value; if (d.b === "fecha" && ui.vista === "asist" && PASOS[ui.paso] === "fecha") { const bt = document.querySelector(".wiz .bottombar .btn"); if (bt) bt.disabled = !rbFallecimientoOk(t.value); vfCampo(t, true); } rdGuardarPronto(); return; }
  if (d.bd) { x.despacho = x.despacho || {}; x.despacho[d.bd] = t.value; rdGuardarPronto(); return; }
  if (d.p && ui.sheet?.tipo === "persona") { const p = (x.personas || []).find((q) => q.id === ui.sheet.id); if (p) { if (d.p === "edad") rbEdadAsignar(p, t.value); else p[d.p] = t.value; } rdGuardarPronto(); return; }
  if (d.bn && ui.sheet?.tipo === "bien") { const b = (x.bienes || []).find((q) => q.id === ui.sheet.id); if (b) b[d.bn] = t.value; rdGuardarPronto(); return; }
  if (d.gasto != null || d.deuda != null) { camposDeuda(x, d, t.value); rdGuardarPronto(); return; }
  if (d.dsp) { x.despacho = x.despacho || {}; if (t.inputMode === "decimal" && !t.value.trim()) delete x.despacho[d.dsp]; else x.despacho[d.dsp] = t.inputMode === "decimal" ? num(t.value) : t.value; rdGuardarPronto(); return; }
  if (d.tnota && ui.sheet?.tipo === "tramite") { estadoT(x, ui.sheet.id).nota = t.value; rdGuardarPronto(); return; }
});
// Guardado diferido de lo que se teclea (el «change» guarda igualmente al salir del campo)
let rdGuardarT = 0;
function rdGuardarPronto() { clearTimeout(rdGuardarT); rdGuardarT = setTimeout(() => { if (ui.vista !== "asist") guardar(); else asGuardar(true); }, 900); }
// Deudas y gastos del asistente y de la ficha «Deudas»: un único sitio para escribir el modelo (input y change)
function hipotecaGananDef(x) { return x.civil === "gananciales" && (x.bienes || []).some((b) => (b.tipo === "vivienda" || b.tipo === "inmueble") && b.titularidad === "ganancial"); }
function camposDeuda(x, d, val) {
  if (d.gasto != null) { x.gastos = x.gastos || []; x.gastos[d.gasto] = { concepto: "Funeral", importe: rbNumOTexto(val) }; return; }
  x.deudas = x.deudas || [];
  const prev = x.deudas[d.deuda] || {};
  x.deudas[d.deuda] = { ...prev, concepto: d.deuda === "0" ? "Hipoteca" : "Otras deudas", importe: rbNumOTexto(val) };
  // H18: la hipoteca de un matrimonio en gananciales con la vivienda ganancial es, por defecto, deuda ganancial
  if (d.deuda === "0" && prev.ganancial === undefined) x.deudas[0].ganancial = hipotecaGananDef(x);
}
$app.addEventListener("change", (e) => {
  const t = e.target; const d = t.dataset;
  if (t.id === "d-cat") { ui.dcat = t.value; render(); return; }
  if (t.id === "f-restore" && t.files && t.files[0]) { sgAbrirArchivo(t.files[0]); t.value = ""; return; }
  if (d.padj) { const x = exp(), b = x.bienes.find((q) => q.id === d.padj); if (b) { if (t.value) b.adjudicadoA = t.value; else delete b.adjudicadoA; anotar(x, `Partición: ${b.descripcion || TIPO_BIEN[b.tipo][0]} ${t.value ? "para " + (persona(x, t.value)?.nombre || "") : "en proindiviso"}`, "sistema"); guardar(); render(); } return; }
  if (d.sim) { const x = exp(), S = simEstado(x); if (d.sim === "ren") { const p = x.personas.find((q) => q.id === d.id); if (t.checked === !!p.renuncia) delete S.ren[d.id]; else S.ren[d.id] = t.checked; } if (d.sim === "plazo") S.plazo = t.checked === (typeof enPlazoExp === "function" ? enPlazoExp(x) : x.enPlazo !== false) ? null : t.checked; /* C2 (QA 07-10-2026) */ if (d.sim === "noViv") S.noViv = !t.checked === !!x.noAplicarVivienda ? null : !t.checked; render(); return; }
  if (d.simval) { const x = exp(), S = simEstado(x); const f = Number(t.value); if (Math.abs(f - 1) < 0.005) delete S.val[d.simval]; else S.val[d.simval] = f; render(); return; }
  if (t.id === "f-fam" && t.files && t.files[0]) { const x = exp(); t.files[0].text().then((txt) => importarArchivo(txt, x)); return; }
  if (t.id === "f-img" && t.files && t.files[0]) { iaLeerDoc(t.files[0]); return; }
  if (d.impcsv != null && t.files && t.files[0]) { t.files[0].text().then((txt) => { ui.imp = impAnalizar(txt); render(); }); return; }
  if (d.lecnuevo != null && t.files && t.files.length) { const F = [...t.files]; t.value = ""; lecNuevoDesdeArchivos(F); return; }
  if (d.subir != null && t.files && t.files.length) { const q = exp(); if (q) archivoGuardar([...t.files], q.id, d.subir); return; }
  if (d.fcat) { archivoCambiar(d.fcat, { cat: t.value }); return; }
  if (d.fest) { const x = exp(); archivoCambiar(d.fest, { estado: t.value }); if (x) { const doc = ARCH.lista.find((q) => q.id === d.fest); anotar(x, `Documento «${doc ? doc.nombre : ""}» marcado como ${(ARCH_ESTADOS.find((e) => e[0] === t.value) || [])[1] || t.value}`, "doc"); guardar(); } return; }
  if (d.cfg) { despachoCfg()[d.cfg] = d.cfg === "localidad" ? dpSinRepetir(t.value) : t.value.trim(); guardar(); render(); return; }
  if (d.abo) { const a = despachoCfg().abogados.find((q) => q.id === d.abo); if (a) a[d.k] = t.value; guardar(); render(); return; }
  if (d.ftram != null) { archivoCambiar(d.ftram, { tramiteId: t.value }); return; }
  if ((ui.vista === "exp" || ui.vista === "asist") && !licPuedeEditar()) { toast(licMotivoEdicion()); render(); return; }
  const x = objetivo(); if (!x) return;
  const val = t.type === "checkbox" ? t.checked : t.value;
  if (d.b) { x[d.b] = val; render(); return; }
  if (d.bd) { x.despacho = x.despacho || {}; x.despacho[d.bd] = val; return; }
  if (d.resp) { if (x.responsable !== val) { if (ui.vista === "exp") anotar(x, `Responsable: ${abogado(val)?.nombre || "sin asignar"}`, "sistema"); x.responsable = val; } persistir(); if (ui.vista === "exp") render(); return; }
  if (d.gasto != null || d.deuda != null) { camposDeuda(x, d, val); persistir(); render(); return; }
  if (d.deudagan != null) { x.deudas = x.deudas || []; x.deudas[d.deudagan] = { ...(x.deudas[d.deudagan] || { concepto: "Hipoteca", importe: 0 }), ganancial: val }; persistir(); render(); return; }
  if (d.situ) { x.situ = x.situ || {}; x.situ[d.situ] = val; persistir(); render(); return; }
  if (d.tnota) { estadoT(x, ui.sheet.id).nota = val; guardar(); return; }
  if (d.p) { const p = x.personas.find((q) => q.id === ui.sheet.id); if (d.p === "edad") rbEdadAsignar(p, val); else p[d.p] = val; persistir(); render(); return; }
  if (d.bn) { const b = x.bienes.find((q) => q.id === ui.sheet.id); b[d.bn] = d.bn === "iban" ? ibanLimpio(val) : val; if (d.bn === "iban" && !b.entidad && ibanValido(b.iban) && ibanEntidad(b.iban)) b.entidad = ibanEntidad(b.iban); persistir(); render(); return; }
  if (d.opt) { x[d.opt] = val; if (d.opt === "enPlazo") x.enPlazoManual = true; /* C2 (QA 07-10-2026): marca fijada por el abogado */ guardar(); render(); return; }
  if (d.dsp) { x.despacho = x.despacho || {}; if (t.inputMode === "decimal" && !String(val).trim()) delete x.despacho[d.dsp]; else x.despacho[d.dsp] = t.inputMode === "decimal" ? num(val) : val; guardar(); render(); return; }
});
$app.addEventListener("dragover", (e) => { const z = e.target.closest(".drop"); if (z) { e.preventDefault(); z.classList.add("over"); } });
$app.addEventListener("dragleave", (e) => { const z = e.target.closest(".drop"); if (z) z.classList.remove("over"); });
$app.addEventListener("drop", (e) => { const z = e.target.closest(".drop"); if (!z) return; e.preventDefault(); z.classList.remove("over"); if (z.querySelector("input[data-lecnuevo]")) { if (e.dataTransfer?.files?.length) lecNuevoDesdeArchivos([...e.dataTransfer.files]); return; } const inp = z.querySelector("input[data-subir]"); const q = exp(); if (q && e.dataTransfer?.files?.length) archivoGuardar([...e.dataTransfer.files], q.id, inp ? inp.dataset.subir : ""); });
document.addEventListener("keydown", (e) => {
  if (e.target && e.target.id === "ia-in" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (e.target.value.trim()) iaEnviar(e.target.value); return; }
  if (e.key === "Escape" && ui.sheet) { ui.sheet = null; persistir(); render(); return; }
  if (e.key === "Escape" && ui.vista === "asist" && !e.defaultPrevented && !(e.target && e.target.tagName === "SELECT") && !document.querySelector(".pk, .ay, .bv-over, .rn-over, .lec-clave, .scn, .sg-modal, .sg-lock") && !(typeof GU === "object" && GU.id)) { e.preventDefault(); asSalir(); return; }
  if ((e.key === "Enter" || e.key === " ") && e.target && e.target.matches && e.target.matches("tr[data-open]")) { e.preventDefault(); e.target.click(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pkAbrir(); }
});
// ───────────────────── Validación de formato en los formularios ─────────────────────
// Solo avisa: no cambia lo que se guarda ni bloquea. El aviso aparece al salir del campo y se retira en cuanto el dato es correcto.
const VF_LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE";
const VF = {
  nif(v) { const s = String(v).toUpperCase().replace(/[\s.-]/g, ""); if (!s) return ""; let m = s.match(/^(\d{8})([A-Z])$/); if (m) return VF_LETRAS[Number(m[1]) % 23] === m[2] ? "" : "La letra no corresponde a ese número de DNI."; m = s.match(/^([XYZ])(\d{7})([A-Z])$/); if (m) return VF_LETRAS[Number("XYZ".indexOf(m[1]) + m[2]) % 23] === m[3] ? "" : "La letra no corresponde a ese NIE."; if (/^[A-HJNP-SUVW]\d{7}[0-9A-J]$/.test(s)) return ""; return "Formato: 8 cifras y letra (DNI), o X, Y o Z, 7 cifras y letra (NIE)."; },
  rc(v) { const s = String(v).toUpperCase().replace(/\s/g, ""); if (!s) return ""; if (/[^A-Z0-9]/.test(s)) return "Solo letras y cifras, sin signos."; return s.length === 20 ? "" : `La referencia catastral tiene 20 caracteres; aquí hay ${s.length}.`; },
  pct: (v) => rbPctMsg(v), // robustez.js: también lo que no se entiende («abc» ya no cuenta como 100 % sin aviso)
  edad: (v) => rbEdadMsg(v),
  importe: (v) => rbImporteMsg(v), // campos de importe (inputmode decimal sin otra validación): «€», espacios y puntos de miles se aceptan
  fallecimiento: (v) => rbFallecimientoMsg(v),
};
const vfTipo = (el) => el.dataset.valida || (el.inputMode === "decimal" || el.getAttribute("inputmode") === "decimal" ? "importe" : "");
function vfCampo(el, mostrar) {
  const f = VF[vfTipo(el)]; if (!f) return;
  const msg = f(el.value); const cont = el.closest(".field") || el.parentElement; if (!cont) return;
  let n = cont.querySelector(":scope > .f-err");
  if (msg && mostrar) { if (!n) { n = document.createElement("span"); n.className = "f-err"; n.id = (el.id || "vf") + "-err"; n.setAttribute("role", "alert"); el.insertAdjacentElement("afterend", n); } n.textContent = msg; el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", n.id); }
  else if (!msg) { if (n) n.remove(); el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); }
}
function vfTodo() { document.querySelectorAll('#app [data-valida], #app input[inputmode="decimal"]').forEach((el) => { if (el.value && el !== document.activeElement) vfCampo(el, true); }); }
document.addEventListener("focusout", (e) => { const el = e.target; if (el && el.dataset && vfTipo(el)) vfCampo(el, true); }, true);
document.addEventListener("input", (e) => { const el = e.target; if (el && el.dataset && vfTipo(el) && el.getAttribute("aria-invalid")) vfCampo(el, true); }, true);
// Secciones opcionales plegables: recuerdan si el usuario las abrió o cerró mientras dure la sesión
document.addEventListener("toggle", (e) => { const d = e.target; if (d && d.matches && d.matches("details[data-fopt]")) { ui.fopt = ui.fopt || {}; ui.fopt[d.dataset.fopt] = d.open; } }, true);

// ───────────────────── Hojas: foco al abrir, atrapado dentro y de vuelta al cerrar (M9) ─────────────────────
const HF = { clave: "", antes: null, origen: null };
function hojaFoco() {
  const sh = ui.sheet ? $app.querySelector(".sheet:not(.mo-ghost)") : null;
  const k = sh ? ui.sheet.tipo + ":" + (ui.sheet.id ?? "") : "";
  if (k && k !== HF.clave) {
    if (!HF.clave) HF.origen = HF.antes; // al pasar de una hoja a otra se conserva quién abrió la primera
    HF.clave = k;
    if (!sh.contains(document.activeElement)) { sh.setAttribute("tabindex", "-1"); try { sh.focus({ preventScroll: true }); } catch (e) {} }
  } else if (!k && HF.clave) {
    HF.clave = "";
    const o = HF.origen; HF.origen = null;
    const a = document.activeElement;
    if (o && (!a || a === document.body || !$app.contains(a))) { const n = $app.querySelectorAll(o.sel)[o.i]; if (n && !n.closest("[inert]")) try { n.focus({ preventScroll: true }); } catch (e) {} }
  }
}
const HF_FOCO = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab" || !ui.sheet) return;
  const sh = $app.querySelector(".sheet:not(.mo-ghost)"); if (!sh) return;
  if (document.querySelector(".pk, .ay, .lec-clave, .scn, .sg-modal, .rn-over") || (typeof GU === "object" && GU.id && GU.el && GU.el.contains(document.activeElement))) return;
  const F = [...sh.querySelectorAll(HF_FOCO)].filter((n) => { const r = n.getBoundingClientRect(); return (r.width || r.height) && !n.closest("details:not([open]) > :not(summary)") && getComputedStyle(n).visibility !== "hidden"; });
  const a = document.activeElement;
  if (!F.length) { e.preventDefault(); try { sh.focus(); } catch (er) {} return; }
  if (!sh.contains(a)) { e.preventDefault(); (e.shiftKey ? F[F.length - 1] : F[0]).focus(); return; }
  const i = F.indexOf(a);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); F[F.length - 1].focus(); }
  else if (!e.shiftKey && i === F.length - 1) { e.preventDefault(); F[0].focus(); }
}, true);

// ───────────────────── Borrador del asistente (I9) ─────────────────────
// Lo tecleado en el asistente se guarda solo (en DB.borradorAsist, con el resto de los datos: cifrado si el despacho cifra) y se ofrece
// al volver: en la portada del asistente y en la cartera. Salir, «Atrás» del navegador o recargar no pierden nada, así que no se pregunta.
const asTieneDatos = (b) => !!b && !!(b.despacho?.cliente || b.nombre || b.fecha || b.ccaa || b.civil || b.testamento || (b.personas || []).length || (b.bienes || []).length || (b.deudas || []).some((d) => num(d.importe)) || (b.gastos || []).some((g) => num(g.importe)) || Object.values(b.situ || {}).some(Boolean));
function asCambiado(b, editando) {
  if (!b) return false;
  if (!editando) return asTieneDatos(b);
  const o = DB.expedientes.find((q) => q.id === b.id); if (!o) return asTieneDatos(b);
  const limpio = (q) => JSON.stringify({ ...q, ejemplo: undefined, bitacora: undefined, snap: undefined });
  return limpio(o) !== limpio(b);
}
let asT = 0;
function asGuardar(ya) {
  if (ui.vista !== "asist" || !ui.borrador) return;
  const b = ui.borrador, guardarlo = asCambiado(b, ui.editando), B = DB.borradorAsist;
  if (!guardarlo) { if (B && B.b && B.b.id === b.id && !ui.editando) { delete DB.borradorAsist; clearTimeout(asT); asT = setTimeout(guardar, 400); } return; }
  // Solo hay un borrador: uno nuevo vacío no pisa el que ya hay; en cuanto se escribe algo, lo sustituye
  DB.borradorAsist = { b: JSON.parse(JSON.stringify(b)), paso: Math.max(1, ui.paso), editando: !!ui.editando, t: new Date().toISOString() };
  clearTimeout(asT); if (ya) guardar(); else asT = setTimeout(guardar, 600);
}
function asGuardarYa() { if (asT) { clearTimeout(asT); asT = 0; if (ui.vista === "asist") asGuardar(true); else guardar(); } }
function asOlvidar(id) { if (DB.borradorAsist && (!id || DB.borradorAsist.b?.id === id)) delete DB.borradorAsist; clearTimeout(asT); asT = 0; }
function asResumen(B) {
  const b = B.b || {}, quien = b.despacho?.cliente || b.nombre || "";
  const exp0 = B.editando ? DB.expedientes.find((q) => q.id === b.id) : null;
  const que = B.editando ? `Cambios sin aplicar en ${esc(exp0 ? (exp0.despacho?.ref || nombreExp(exp0)) : "un expediente")}` : `Expediente a medias${quien ? `: ${esc(quien)}` : ""}`;
  const cuando = (() => { try { const m = Math.round((Date.now() - new Date(B.t).getTime()) / 60000); return m < 1 ? "ahora mismo" : m < 60 ? `hace ${plural(m, "minuto")}` : m < 1440 ? `hace ${plural(Math.round(m / 60), "hora")}` : `el ${fechaCorta(String(B.t).slice(0, 10))}`; } catch (e) { return ""; } })();
  return { que, det: `Paso ${Math.max(1, B.paso || 1)} de ${PASOS.length - 1}${cuando ? " · guardado " + cuando : ""}` };
}
function asBorradorHTML(x) {
  const B = DB.borradorAsist; if (!B || !B.b || (x && B.b.id === x.id) || ui.editando) return "";
  const r = asResumen(B);
  return `<div class="as-borr" role="status"><span class="ico blue">${I.doc}</span><span class="t"><b>${r.que}</b><small>${esc(r.det)}. Si empiezas uno nuevo y escribes algo, este borrador se sustituye.</small></span><span class="as-acts"><button class="btn sm" data-act="asRetomar">Retomarlo</button><button class="btn sm gray" data-act="asDescartar">Descartarlo</button></span></div>`;
}
function asAvisoHTML() {
  const B = DB.borradorAsist; if (!B || !B.b) return "";
  const r = asResumen(B);
  return `<div class="infobar as-aviso"><span class="ico blue">${I.doc}</span><span><b>${r.que}.</b> ${esc(r.det)}. <button class="link" data-act="asRetomar">Retomarlo</button> · <button class="link" data-act="asDescartar">Descartarlo</button></span></div>`;
}
function asRetomar() {
  const B = DB.borradorAsist; if (!B || !B.b) return;
  if (!B.editando && !licPuedeCrear()) { toast(licMotivoBloqueo()); return; }
  if (B.editando && !DB.expedientes.some((q) => q.id === B.b.id)) { asOlvidar(); guardar(); render(); toast("Ese expediente ya no existe"); return; }
  ui.borrador = JSON.parse(JSON.stringify(B.b));
  go({ vista: "asist", paso: Math.min(PASOS.length - 1, Math.max(1, B.paso || 1)), editando: !!B.editando, id: B.editando ? B.b.id : ui.id, sheet: null, buscar: "" });
}
function asDescartar() {
  asOlvidar(); guardar();
  if (ui.vista === "asist" && ui.paso === 0) render(); else render();
  toast("Borrador descartado");
}
// Salir del asistente: vuelve a donde se estaba antes de abrirlo (como pulsar «Atrás» del navegador las veces necesarias)
function asSalir() {
  const datos = asCambiado(ui.borrador, ui.editando);
  asGuardar(true);
  const ed = !!ui.editando;
  navFueraDelAsistente(() => go({ vista: ed ? "exp" : "inicio", editando: false, sheet: null }), true);
  if (datos) setTimeout(() => toast(ed ? "Cambios guardados como borrador: «Completar datos» los retoma" : "Borrador guardado: lo tienes en Expedientes y en «Nuevo expediente»"), 60);
}
window.addEventListener("beforeunload", (e) => {
  try { asGuardarYa(); } catch (er) {}
  // Solo se pregunta si de verdad se perdería algo: hay un asistente con datos y el navegador no está guardando
  const fallo = (typeof SG === "object" && SG && SG.errorGuardar) || (typeof DB_BLOQUEO !== "undefined" && DB_BLOQUEO);
  if (ui.vista === "asist" && asCambiado(ui.borrador, ui.editando) && fallo) { e.preventDefault(); e.returnValue = ""; }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") try { asGuardarYa(); } catch (e) {} });

// ───────────────────── Historial del navegador (I9) ─────────────────────
// Cada vista, sección, paso del asistente y hoja es una entrada del historial: «Atrás» y «Adelante» del navegador (y los botones
// laterales del ratón) se mueven por la aplicación como en cualquier web, en lugar de salir a la portada. Recargar deja donde se estaba.
// El estado de cada entrada va en history.state; la pila (para saber qué hay detrás) también en sessionStorage, para sobrevivir a la recarga.
const NAV = { i: 0, pila: [], espera: null, tras: null, resync: false, listo: false, aplicando: false };
const NAV_HOJAS = new Set(["persona", "bien", "tramite", "fver", "menuApp", "addPersona", "addBien", "mas", "opinion", "familia", "carpeta", "tc", "novedades", "widget", "situ", "deudas", "doc", "ia", "menu", "ajustes", "lecNuevo", "importar"]);
function navEstado() {
  const v = ui.vista;
  return { v, id: v === "exp" ? ui.id : null, sec: v === "exp" ? ui.sec : null, paso: v === "asist" ? ui.paso : null, as: v === "asist" ? ui.borrador?.id || null : null, ed: v === "asist" && !!ui.editando, sh: ui.sheet ? { tipo: ui.sheet.tipo, id: ui.sheet.id ?? null } : null };
}
const navClave = (s) => [s.v, s.id || "", s.sec || "", s.paso ?? "", s.as || "", s.sh ? s.sh.tipo + ":" + (s.sh.id ?? "") : ""].join("|");
const NAV_RUTA = { inicio: "expedientes", exp: "expediente", asist: "asistente", agenda: "agenda", biblio: "normativa", rent: "rentabilidad", radar: "mi-dia", socio: "despacho" };
function navRuta(s) {
  const x = s.v === "exp" ? DB.expedientes.find((q) => q.id === s.id) : null;
  const partes = [NAV_RUTA[s.v] || s.v, x ? (x.despacho?.ref || x.id) : "", s.v === "exp" && s.sec && s.sec !== "resumen" ? s.sec : "", s.v === "asist" ? "paso-" + (s.paso || 0) : ""].filter(Boolean);
  return "#/" + partes.map(encodeURIComponent).join("/");
}
function navGuardarPila() { try { sessionStorage.setItem("hereda-nav", JSON.stringify({ i: NAV.i, pila: NAV.pila.slice(Math.max(0, NAV.i - 60), NAV.i + 1).map((q) => q || null), base: Math.max(0, NAV.i - 60) })); } catch (e) {} }
function navEscribir(modo, s, k) { try { history[modo === "push" ? "pushState" : "replaceState"]({ hereda: 1, n: NAV.i, k, s }, "", navRuta(s)); } catch (e) {} navGuardarPila(); }
function navSync() {
  if (!NAV.listo || NAV.aplicando) return;
  if (NAV.espera != null) { NAV.resync = true; return; }
  const s = navEstado(), k = navClave(s), cur = NAV.pila[NAV.i];
  if (cur && cur.k === k) return;
  const prev = NAV.i > 0 ? NAV.pila[NAV.i - 1] : null;
  // Cerrar una hoja o retroceder un paso del asistente con los botones de la app = «Atrás»: no se apila una entrada nueva
  const esVuelta = prev && prev.k === k && cur && ((cur.s.sh && !s.sh) || (cur.s.v === "asist" && s.v === "asist" && (cur.s.paso || 0) === (s.paso || 0) + 1));
  if (esVuelta) { NAV.espera = NAV.i - 1; NAV.i -= 1; navGuardarPila(); history.back(); setTimeout(() => { if (NAV.espera === NAV.i) { NAV.espera = null; if (NAV.resync) { NAV.resync = false; navSync(); } } }, 600); return; }
  // Cerrar la hoja con la que arrancó la sesión (p. ej., Novedades): se sustituye la entrada
  if (cur && cur.s.sh && !s.sh && NAV.i === 0 && navClave({ ...cur.s, sh: null }) === k) { NAV.pila[0] = { k, s }; navEscribir("replace", s, k); return; }
  NAV.pila = NAV.pila.slice(0, NAV.i + 1); NAV.i = NAV.pila.length; NAV.pila.push({ k, s });
  navEscribir("push", s, k);
}
// Varias navegaciones seguidas en el mismo instante (una guía, un atajo) dejan una sola entrada: la última
let navProg = false;
function navProgramar() { if (navProg) return; navProg = true; queueMicrotask(() => { navProg = false; try { navSync(); } catch (e) {} }); }
// Sale del asistente deshaciendo sus entradas del historial (vuelve a la que había antes de abrirlo) y, después, ejecuta «luego»
// (abrir el expediente creado, por ejemplo). Así «Atrás» desde el expediente nuevo no vuelve a los pasos del asistente ya terminado.
function navFueraDelAsistente(luego, volverAlOrigen) {
  const cur = NAV.pila[NAV.i];
  let j = NAV.i; while (j > 0 && NAV.pila[j - 1] && NAV.pila[j - 1].s.v === "asist" && cur && NAV.pila[j - 1].s.as === cur.s.as) j--;
  if (!NAV.listo || !cur || cur.s.v !== "asist" || j === 0 || !NAV.pila[j - 1]) { luego(); return; }
  NAV.espera = j - 1; NAV.tras = volverAlOrigen ? "origen" : luego;
  const desde = NAV.i; NAV.i = j - 1; navGuardarPila();
  history.go(j - 1 - desde);
  // Si el navegador no avisa (p. ej., la página no tiene el foco), se sigue igualmente
  setTimeout(() => { if (NAV.espera === j - 1) { const f = NAV.tras; NAV.espera = null; NAV.tras = null; if (f === "origen") navAplicar({ ...NAV.pila[NAV.i].s, sh: null }); else if (f) f(); } }, 700);
}
function navAplicar(s) {
  if (!s) return;
  const cambio = { snMas: false, conf: "", sheet: null };
  let v = s.v;
  if (v === "exp" && !DB.expedientes.some((q) => q.id === s.id)) v = "inicio"; // borrado entretanto
  if (v === "asist") {
    // El asistente vuelve con su borrador (en memoria o guardado); si ya se terminó o se descartó, a la cartera
    const B = DB.borradorAsist;
    const b = ui.borrador && ui.borrador.id === s.as ? ui.borrador : B && B.b && B.b.id === s.as ? JSON.parse(JSON.stringify(B.b)) : null;
    const terminado = !s.ed && DB.expedientes.some((q) => q.id === s.as);
    if (!b || terminado) v = "inicio";
    else Object.assign(cambio, { borrador: b, paso: Math.min(PASOS.length - 1, s.paso || 0), editando: !!s.ed });
  }
  const saleDelAsist = ui.vista === "asist" && v !== "asist";
  if (saleDelAsist) { asGuardar(true); if (asCambiado(ui.borrador, ui.editando)) setTimeout(() => toast("Borrador guardado: lo tienes en Expedientes y en «Nuevo expediente»"), 60); }
  Object.assign(cambio, { vista: v });
  if (v === "exp") Object.assign(cambio, { id: s.id, sec: s.sec || "resumen" });
  if (v === s.v && s.sh && NAV_HOJAS.has(s.sh.tipo)) cambio.sheet = s.sh.id != null ? { tipo: s.sh.tipo, id: s.sh.id } : { tipo: s.sh.tipo };
  const otraVista = ui.vista !== v || ui.id !== cambio.id && v === "exp" || ui.sec !== cambio.sec && v === "exp" || (v === "asist" && ui.paso !== cambio.paso);
  NAV.aplicando = true;
  try { Object.assign(ui, cambio); if (v === "exp" && cambio.id) try { pkVisitar(cambio.id); } catch (e) {} render(); } finally { NAV.aplicando = false; }
  // Si la entrada no se pudo restaurar tal cual (expediente borrado, asistente terminado, hoja que no vuelve), se corrige su estado
  const real = navEstado(), k = navClave(real);
  if (NAV.pila[NAV.i] && NAV.pila[NAV.i].k !== k) { NAV.pila[NAV.i] = { k, s: real }; navEscribir("replace", real, k); }
  if (otraVista) window.scrollTo(0, 0);
}
window.addEventListener("popstate", (e) => {
  const st = e.state;
  if (!st || !st.hereda) return;
  if (NAV.espera != null) {
    const esperada = st.n === NAV.espera; const f = NAV.tras; NAV.espera = null; NAV.tras = null;
    NAV.i = st.n; NAV.pila[st.n] = NAV.pila[st.n] || { k: st.k, s: st.s };
    if (esperada) { if (f === "origen") navAplicar({ ...st.s, sh: null }); else if (f) f(); else if (NAV.resync) { NAV.resync = false; navSync(); } return; }
  }
  NAV.i = st.n; NAV.pila[st.n] = { k: st.k, s: st.s }; navGuardarPila();
  // Una ventana de otra capa (ayuda, buscador, guía) no debe quedarse encima de la vista nueva
  try { if (typeof pkCerrar === "function" && typeof PK === "object" && PK.abierta) pkCerrar(); } catch (er) {}
  navAplicar(st.s);
});
// Al arrancar: si se recarga la página, se vuelve a la misma vista (y al asistente con su borrador)
function navArranque() {
  const st = history.state;
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem("hereda-nav") || "null"); } catch (e) {}
  if (st && st.hereda) {
    NAV.i = st.n; NAV.pila = [];
    if (saved && Array.isArray(saved.pila)) saved.pila.forEach((q, j) => { if (q) NAV.pila[saved.base + j] = q; });
    NAV.pila[st.n] = { k: st.k, s: st.s };
    NAV.listo = true;
    navAplicar(st.s);
    return true;
  }
  const s = navEstado(), k = navClave(s); NAV.i = 0; NAV.pila = [{ k, s }]; NAV.listo = true; navEscribir("replace", s, k);
  return false;
}

sgArranque(() => {
  licInit();
  for (const q of DB.expedientes || []) docTramReconciliar(q);
  dmAlDia();
  vigilar();
  if (DB.expedientes.length && DB.vistoVersion !== VERSION_APP.n) { ui.sheet = { tipo: "novedades" }; } DB.vistoVersion = VERSION_APP.n; guardar();
  if (typeof scArranque === "function") scArranque(); // socio.js: cada perfil entra por su sitio; punto de partida de la auditoría
  if (!navArranque()) render(); // I9: tras recargar, la misma vista que había
  if (bvDebeMostrar()) bvAbrir();
  archivoCargar().then(() => { if (ui.vista === "exp") render(); });
});
