// ───────────────────── {{MARCA}} · tiempos y rentabilidad (prefijo tm/TM_, eventos [data-tmp]) ─────────────────────
// Cronómetro flotante por expediente, tiempos por expediente (x.tiempos) y cuadro de mando del titular.
// Reutiliza los datos que ya existen: presupuesto(x,R).honorarios (sin IVA), fondos(x,R) (libro de fondos, IVA incluido),
// x.despacho.alta, la bitácora (cambios de fase) y despachoCfg() (abogados, yo). Lo único nuevo que se guarda:
//   x.tiempos = [{ id, fecha, minutos, concepto, cat, quien, tramiteId?, origen }]
//   DB.cronometro = { xId, inicio (ms o null si está en pausa), acumulado (ms), desde (ms), tarea: { concepto, cat, tramiteId } }
//   DB.despacho.tarifaHora (objetivo €/h, sin IVA; 90 por defecto)
// Aditivo: un único manejador en captura para [data-tmp] (clic), formularios [data-tmp-form] y campos [data-tmpf].
const TM_CATS = [["reunion", "Reuniones y llamadas"], ["documentacion", "Documentación e inventario"], ["tramites", "Trámites"], ["particion", "Partición"], ["impuestos", "Impuestos y estrategia"], ["escritos", "Escritos e informes"], ["otro", "Otras tareas"]];
const TM_PRESETS = [["Reunión con la familia", "reunion"], ["Llamada con el cliente", "reunion"], ["Revisión de documentación", "documentacion"], ["Inventario y valoración de bienes", "documentacion"], ["Partición", "particion"], ["Liquidación del Impuesto sobre Sucesiones", "impuestos"], ["Plusvalía municipal", "impuestos"], ["Estrategia fiscal", "impuestos"], ["Preparación de la escritura", "escritos"], ["Escritos e informes", "escritos"], ["Firma en notaría", "tramites"], ["Inscripción en el Registro", "tramites"], ["Desplazamiento", "otro"]];
const TM_SEC = { resumen: ["Revisión del expediente", "otro"], tramites: ["Trámites", "tramites"], herencia: ["Herederos y bienes", "documentacion"], particion: ["Partición", "particion"], impuestos: ["Impuestos", "impuestos"], estrategia: ["Estrategia fiscal", "impuestos"], segunda: ["Dos herencias", "impuestos"], diagnostico: ["Revisión del expediente", "otro"], normativa: ["Estudio de normativa", "otro"], documentos: ["Documentos y escritos", "escritos"] };
const TM_SUB = { encargo: ["Encargo y cliente", "otro"], fondos: ["Gestión de fondos", "otro"], docs: ["Revisión de documentación", "documentacion"], 650: ["Modelos 650 y 660", "impuestos"], actividad: ["Llamadas y gestiones", "reunion"], tiempos: ["Revisión del expediente", "otro"] };
const TM_I = {
  reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.6 1.8M9.5 2.8h5M18.6 6.3l1.3-1.3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  parar: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.2"/></svg>',
  lapiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
};
const TM = { root: null, tick: 0, form: null, key: "", edit: null, del: null, per: "anio", ord: "eh", dir: 1, obs: null };
const TM_CAT_N = (k) => (TM_CATS.find((c) => c[0] === k) || TM_CATS[TM_CATS.length - 1])[1];

// ── Utilidades ──────────────────────────────────────────────────
function tmDur(min) {
  min = Math.round(num(min)); if (min <= 0) return "0 min";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}
const tmHM = (min) => { min = Math.max(0, Math.round(num(min))); return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0"); };
function tmReloj(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 3600) + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
// "1:20", "1 h 20", "1h20min", "80", "80 min", "1,5 h", "1.5" → minutos (entero sin unidad = minutos; con decimales = horas)
function tmLeerDur(s) {
  s = String(s || "").trim().toLowerCase().replace(/\s+/g, " "); if (!s) return 0;
  let m = s.match(/^(\d{1,3}):(\d{1,2})$/); if (m) return num(m[1]) * 60 + num(m[2]);
  m = s.match(/^(\d+(?:[.,]\d+)?) ?h(?:oras?)?(?: ?(\d{1,2}) ?(?:m|min|minutos?)?)?$/); if (m) return Math.round(Number(m[1].replace(",", ".")) * 60 + num(m[2] || 0));
  m = s.match(/^(\d+) ?(?:m|min|minutos?)$/); if (m) return num(m[1]);
  m = s.match(/^\d+$/); if (m) return Number(s);
  m = s.match(/^\d+[.,]\d+$/); if (m) return Math.round(Number(s.replace(",", ".")) * 60);
  return 0;
}
const tmEh = (v) => (v == null || !isFinite(v) ? "—" : grp(v, 0) + " €/h");
function tmTarifa() { try { const v = num(despachoCfg().tarifaHora); return v > 0 ? v : 90; } catch (e) { return 90; } }
function tmYo() { try { const D = despachoCfg(); return (D.yo && abogado(D.yo) ? D.yo : D.abogados[0]?.id) || ""; } catch (e) { return ""; } }
const tmEsc = (x) => !!(x && (x.escenarioDe || /-E$/.test(String(x.despacho?.ref || ""))));
const TM_IVA = 0.21; // el mismo tipo que presupuesto() (logic.js)
// Honorarios sin IVA del presupuesto existente; null si no se pueden calcular (porcentaje sin cálculo de la herencia)
function tmHon(x, R) {
  try { const modo = x.despacho?.honModo || "fijo"; if (!R && modo !== "fijo") return null; return presupuesto(x, R || null).honorarios; } catch (e) { return null; }
}
const tmMin = (x, desde, hasta) => (x.tiempos || []).filter((t) => (!desde || t.fecha >= desde) && (!hasta || t.fecha <= hasta)).reduce((s, t) => s + num(t.minutos), 0);
function tmRate(x, R) { const min = tmMin(x); const hon = tmHon(x, R); return { min, hon, eh: hon != null && min > 0 ? hon / (min / 60) : null }; }
function tmRefX(x) { return x ? x.despacho?.ref || nombreExp(x) : ""; }

// ── Cronómetro: estado ──────────────────────────────────────────
function tmCron() {
  try {
    const c = DB.cronometro; if (!c) return null;
    if (!c.xId || !DB.expedientes.some((e) => e.id === c.xId)) { delete DB.cronometro; guardar(); return null; }
    return c;
  } catch (e) { return null; }
}
const tmMs = (c) => (c ? num(c.acumulado) + (c.inicio ? Date.now() - c.inicio : 0) : 0);
function tmContexto(x) {
  try {
    if (document.querySelector(".rn-over")) return { concepto: "Reunión con la familia", cat: "reunion" };
    if (ui.sheet && ui.sheet.tipo === "tramite" && ui.sheet.id) { const t = tramitesExp(x, calcular(x)).find((q) => q.id === ui.sheet.id); if (t) return { concepto: "Trámite: " + t.titulo, cat: "tramites", tramiteId: t.id }; }
    const [concepto, cat] = ui.sec === "despacho" ? TM_SUB[ui.sub] || TM_SUB.encargo : TM_SEC[ui.sec] || TM_SEC.resumen;
    return { concepto, cat };
  } catch (e) { return { concepto: "Revisión del expediente", cat: "otro" }; }
}
function tmIniciar() {
  const x = exp(); if (!x) return;
  DB.cronometro = { xId: x.id, inicio: Date.now(), acumulado: 0, desde: Date.now(), tarea: tmContexto(x) };
  guardar(); tmSync(true);
}
function tmPausar() { const c = tmCron(); if (!c || !c.inicio) return; c.acumulado = tmMs(c); c.inicio = null; guardar(); tmSync(true); }
function tmReanudar() { const c = tmCron(); if (!c || c.inicio) return; c.inicio = Date.now(); TM.form = null; guardar(); tmSync(true); }
function tmParar() {
  const c = tmCron(); if (!c) return;
  if (c.inicio) { c.acumulado = tmMs(c); c.inicio = null; guardar(); }
  TM.form = { min: Math.max(1, Math.round(c.acumulado / 60000)), concepto: c.tarea?.concepto || "Revisión del expediente", cat: c.tarea?.cat || "otro" };
  tmSync(true);
  setTimeout(() => { const i = document.getElementById("tm-c-con"); if (i && window.matchMedia("(pointer:fine)").matches) { i.focus(); i.select(); } }, 30);
}
function tmApuntar(x, e) {
  x.tiempos = x.tiempos || [];
  x.tiempos.push(e);
  anotar(x, `Tiempo registrado: ${tmDur(e.minutos)} · ${e.concepto}`, "sistema");
}
function tmGuardarCron() {
  const c = tmCron(); if (!c) return;
  const x = DB.expedientes.find((q) => q.id === c.xId); if (!x) return;
  const min = tmLeerDur(document.getElementById("tm-c-dur")?.value);
  if (!min) { toast("Indica la duración, por ejemplo 1:20 o 45 min"); return; }
  const concepto = (document.getElementById("tm-c-con")?.value || "").trim() || c.tarea?.concepto || "Revisión del expediente";
  const cat = document.getElementById("tm-c-cat")?.value || c.tarea?.cat || "otro";
  const e = { id: uid(), fecha: isoLocal(new Date(c.desde || Date.now())), minutos: min, concepto, cat, quien: tmYo(), origen: "cronometro" };
  if (c.tarea?.tramiteId) e.tramiteId = c.tarea.tramiteId;
  tmApuntar(x, e);
  delete DB.cronometro; TM.form = null; guardar();
  toast(`Tiempo registrado: ${tmDur(min)}`);
  render(); tmSync(true);
}
function tmDescartar() { delete DB.cronometro; TM.form = null; guardar(); tmSync(true); toast("Cronómetro descartado"); }

// ── Cronómetro: píldora flotante (vive en document.body, sobrevive a render()) ──
function tmMontar() {
  if (TM.root) return TM.root;
  const r = document.createElement("div");
  r.className = "tm-root"; r.id = "tm-root"; r.hidden = true;
  document.body.appendChild(r);
  TM.root = r;
  try { const app = document.getElementById("app"); if (app && window.MutationObserver) { TM.obs = new MutationObserver(() => tmSync()); TM.obs.observe(app, { childList: true }); } } catch (e) {}
  window.addEventListener("resize", () => tmSync());
  document.addEventListener("visibilitychange", () => tmTick());
  return r;
}
function tmVisible() {
  try {
    if (ui.vista === "asist") return false;
    if (ui.sheet && !escritorio()) return false; // en móvil la hoja ocupa la parte de abajo; en escritorio la píldora queda sobre el velo y sirve para cronometrar un trámite abierto
    return !!tmCron() || (ui.vista === "exp" && !!exp());
  } catch (e) { return false; }
}
function tmPillHTML() {
  const c = tmCron();
  if (!c) return `<button type="button" class="tm-pill tm-idle" data-tmp="iniciar" aria-label="Iniciar el cronómetro de este expediente" title="Cronometrar el trabajo en este expediente">${TM_I.reloj}<span class="tm-lbl">Cronómetro</span></button>`;
  const x = DB.expedientes.find((q) => q.id === c.xId);
  const otro = !(ui.vista === "exp" && ui.id === c.xId);
  if (TM.form) {
    const F = TM.form, largo = c.acumulado > 10 * 36e5;
    const yo = abogado(tmYo());
    return `<form class="tm-form" data-tmp-form="cron" novalidate aria-label="Registrar el tiempo">
      <div class="tm-fh"><b>Registrar tiempo</b><span>${esc(tmRefX(x))}</span></div>
      <label class="tm-fl"><span>Concepto</span><input id="tm-c-con" data-tmpf="con" data-cat="tm-c-cat" list="tm-presets" maxlength="120" value="${esc(F.concepto)}" autocomplete="off"></label>
      <div class="tm-frow"><label class="tm-fl"><span>Duración</span><input id="tm-c-dur" value="${tmHM(F.min)}" inputmode="text" autocomplete="off" aria-describedby="tm-c-h"></label><label class="tm-fl"><span>Tarea</span><select id="tm-c-cat">${TM_CATS.map(([k, n]) => `<option value="${k}" ${F.cat === k ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
      <p class="tm-fq" id="tm-c-h">${largo ? `<b class="tm-warn">Lleva más de 10 h en marcha: revisa la duración.</b> ` : ""}Horas:minutos o «45 min». ${yo ? "Lo registra " + esc(yo.nombre) + "." : ""}</p>
      <div class="tm-fb"><button type="button" class="tm-tx" data-tmp="descartar">Descartar</button><span></span><button type="button" class="btn sm gray" data-tmp="seguir">Seguir</button><button type="submit" class="btn sm">Guardar</button></div>
    </form>${tmDatalist(x)}`;
  }
  const on = !!c.inicio;
  return `<div class="tm-pill ${on ? "tm-on" : "tm-paused"}" role="group" aria-label="Cronómetro">
    <span class="tm-dot" aria-hidden="true"></span>
    ${otro ? `<button type="button" class="tm-ref" data-tmp="irCron" title="Volver al expediente">${esc(tmRefX(x))}</button>` : `<span class="tm-tarea" title="${esc(c.tarea?.concepto || "")}">${esc(c.tarea?.concepto || "")}</span>`}
    <span class="tm-t" data-tmp-t aria-live="off">${tmReloj(tmMs(c))}</span>
    <button type="button" class="tm-b" data-tmp="${on ? "pausar" : "reanudar"}" aria-label="${on ? "Pausar" : "Reanudar"}" title="${on ? "Pausar" : "Reanudar"}">${on ? TM_I.pausa : TM_I.play}</button>
    <button type="button" class="tm-b tm-stop" data-tmp="parar" aria-label="Parar y registrar" title="Parar y registrar">${TM_I.parar}</button>
  </div>`;
}
function tmDatalist(x) {
  let extra = [];
  try { if (x) extra = tramitesExp(x, calcular(x)).filter((t) => !cerrado(t)).slice(0, 12).map((t) => "Trámite: " + t.titulo); } catch (e) {}
  return `<datalist id="tm-presets">${[...TM_PRESETS.map((p) => p[0]), ...extra].map((t) => `<option value="${esc(t)}">`).join("")}</datalist>`;
}
// Sincroniza la píldora con la vista (lo llama el observador de #app tras cada render y cada acción propia)
function tmSync(forzar) {
  try {
    const r = tmMontar(); const vis = tmVisible();
    r.hidden = !vis;
    const tab = !escritorio() && !!document.querySelector("#app .tabbar");
    r.classList.toggle("tm-tab", tab);
    if (!vis) { tmTick(); return; }
    const c = tmCron();
    const key = [c ? (c.inicio ? "on" : "pa") : "no", c ? c.xId : "", TM.form ? "f" : "", ui.vista, ui.id, c && c.tarea ? c.tarea.concepto : ""].join("|");
    if (forzar || key !== TM.key) { if (!(TM.form && !forzar && r.querySelector("form"))) r.innerHTML = tmPillHTML(); TM.key = key; }
    tmTick();
  } catch (e) {}
}
// Un solo intervalo, activo solo con el cronómetro en marcha y la página visible
function tmTick() {
  const c = tmCron(); const run = !!(c && c.inicio) && !document.hidden;
  const pinta = () => { const cc = tmCron(); const txt = tmReloj(tmMs(cc)); document.querySelectorAll("[data-tmp-t]").forEach((n) => { if (n.textContent !== txt) n.textContent = txt; }); };
  if (c) pinta();
  if (run && !TM.tick) TM.tick = setInterval(() => { const cc = tmCron(); if (!cc || !cc.inicio) { clearInterval(TM.tick); TM.tick = 0; } pinta(); }, 1000);
  if (!run && TM.tick) { clearInterval(TM.tick); TM.tick = 0; }
}
// Insignia compacta (span, se puede meter dentro de un botón de la barra lateral): solo con un cronómetro activo o en pausa
function tmBadgeCron() {
  const c = tmCron(); if (!c) return "";
  const x = DB.expedientes.find((q) => q.id === c.xId);
  return `<span class="tm-badge ${c.inicio ? "tm-on" : "tm-paused"}" title="Cronómetro ${c.inicio ? "en marcha" : "en pausa"} · ${esc(tmRefX(x))}"><span class="tm-dot" aria-hidden="true"></span><span class="tm-t" data-tmp-t>${tmReloj(tmMs(c))}</span></span>`;
}

// ── Por expediente ──────────────────────────────────────────────
// Línea compacta para el resumen del encargo: "6 h 40 min · 135 €/h" ("" si no hay tiempos)
function tmResumenExp(x, R) {
  try { const r = tmRate(x, R); if (!r.min) return ""; return tmDur(r.min) + (r.eh != null ? " · " + tmEh(r.eh) : ""); } catch (e) { return ""; }
}
function tmVeredicto(r, tarifa) {
  if (!r.min) return { cls: "", txt: "Aún no hay tiempos registrados. Usa el cronómetro (abajo a la derecha) o añade el tiempo a mano." };
  if (r.hon == null) return { cls: "", txt: "Completa los datos de la herencia para calcular los honorarios y el €/hora." };
  if (!r.hon) return { cls: "warn", txt: "Sin honorarios presupuestados: revisa el encargo." };
  const queda = r.hon / tarifa * 60 - r.min;
  if (r.eh >= tarifa) return { cls: "ok", txt: `Rentable: ${tmEh(r.eh)}, por encima de tu objetivo de ${tmEh(tarifa)}. Margen: ${tmDur(queda)} más antes de bajar del objetivo.` };
  if (r.eh >= tarifa * 0.85) return { cls: "warn", txt: `Ajustado: ${tmEh(r.eh)}, algo por debajo de tu objetivo de ${tmEh(tarifa)}. El presupuesto cubría ${tmDur(r.hon / tarifa * 60)}.` };
  return { cls: "bad", txt: `Por debajo del objetivo: ${tmEh(r.eh)} frente a ${tmEh(tarifa)}. Replantea el presupuesto de casos similares.` };
}
function tmFormCampos(pre, v, abogados) {
  return `<label class="tm-fl"><span>Fecha</span><input id="${pre}-fecha" type="date" value="${esc(v.fecha)}" max="${hoy()}"></label>
    <label class="tm-fl"><span>Duración</span><input id="${pre}-dur" value="${v.minutos ? tmHM(v.minutos) : ""}" placeholder="1:30 o 45 min" autocomplete="off"></label>
    <label class="tm-fl tm-wide"><span>Concepto</span><input id="${pre}-con" data-tmpf="con" data-cat="${pre}-cat" list="tm-presets" maxlength="120" value="${esc(v.concepto || "")}" placeholder="Reunión con la familia, partición…" autocomplete="off"></label>
    <label class="tm-fl"><span>Tarea</span><select id="${pre}-cat">${TM_CATS.map(([k, n]) => `<option value="${k}" ${v.cat === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="tm-fl"><span>Quién</span><select id="${pre}-quien">${abogados.map((a) => `<option value="${a.id}" ${v.quien === a.id ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select></label>`;
}
function tTiempos(x, R) {
  const D = despachoCfg(), tarifa = tmTarifa(), r = tmRate(x, R), V = tmVeredicto(r, tarifa);
  const L = [...(x.tiempos || [])].sort((a, b) => b.fecha.localeCompare(a.fecha) || 0);
  const cubre = r.hon ? r.hon / tarifa * 60 : 0, pct = cubre ? r.min / cubre : 0;
  const porCat = TM_CATS.map(([k, n]) => ({ k, n, min: L.filter((t) => (t.cat || "otro") === k).reduce((s, t) => s + num(t.minutos), 0) })).filter((g) => g.min > 0).sort((a, b) => b.min - a.min);
  const maxCat = Math.max(1, ...porCat.map((g) => g.min));
  const ehCls = r.eh == null ? "" : r.eh >= tarifa ? "ok" : r.eh >= tarifa * 0.85 ? "warn" : "bad";
  const kpis = `<div class="kpis tm-kpis">${kpi("Horas registradas", tmDur(r.min), plural(L.length, "registro"))}${kpi("Honorarios presupuestados", r.hon == null ? "—" : eur0(r.hon), "sin IVA · del encargo")}${kpi("€/hora efectivo", tmEh(r.eh), "honorarios ÷ horas", ehCls)}${kpi("Objetivo del despacho", tmEh(tarifa), "sin IVA · editable abajo")}</div>`;
  const meter = r.hon ? `<div class="tm-meter ${pct > 1 ? "over" : pct > 0.85 ? "near" : ""}" role="img" aria-label="Horas consumidas: ${Math.round(pct * 100)} % de las que cubre el presupuesto"><i style="width:${Math.min(100, Math.round(pct * 100))}%"></i></div><div class="tm-meter-l"><span>${tmDur(r.min)} registradas</span><span>el presupuesto cubre ${tmDur(cubre)} a ${tmEh(tarifa)}</span></div>` : "";
  const verd = `<div class="card tm-verd"><div class="tm-vl ${V.cls}"><i class="dot ${V.cls === "ok" ? "ok" : V.cls === "bad" ? "bad" : V.cls === "warn" ? "warn" : "gold"}"></i><span>${esc(V.txt)}</span></div>${meter}
    <div class="tm-tarifa"><label for="tm-tarifa">Objetivo del despacho</label><span class="tm-inp"><input id="tm-tarifa" data-tmpf="tarifa" inputmode="decimal" value="${numStr(tarifa)}" aria-describedby="tm-tarifa-h"><em>€/h</em></span><span class="caption" id="tm-tarifa-h">Sin IVA. Se aplica a todos los expedientes.</span></div></div>`;
  const barras = porCat.length ? `<div class="tm-hbars">${porCat.map((g) => `<div class="tm-hb"><span class="tm-hb-n">${esc(g.n)}</span><span class="tm-hb-t"><i style="width:${Math.max(2, Math.round(g.min / maxCat * 100))}%"></i></span><span class="tm-hb-v">${tmDur(g.min)} <small>${Math.round(g.min / r.min * 100)} %</small></span></div>`).join("")}</div>` : `<p class="caption">Las horas se agrupan por tarea al registrarlas.</p>`;
  const nuevo = { fecha: hoy(), minutos: 0, concepto: "", cat: "otro", quien: tmYo() };
  const alta = `<form class="tm-add" data-tmp-form="add" novalidate>${tmFormCampos("tm-f", nuevo, D.abogados)}<div class="tm-add-b"><button type="submit" class="btn sm">Añadir tiempo</button></div></form>`;
  const fila = (t) => {
    if (TM.edit === t.id) return `<tr class="tm-editing"><td colspan="5"><form class="tm-add tm-edit" data-tmp-form="edit" data-id="${t.id}" novalidate>${tmFormCampos("tm-e", t, D.abogados)}<div class="tm-add-b"><button type="button" class="btn sm gray" data-tmp="editNo">Cancelar</button><button type="submit" class="btn sm">Guardar</button></div></form></td></tr>`;
    const a = abogado(t.quien);
    return `<tr><td class="mono">${fechaCorta(t.fecha)}</td><td><b>${esc(t.concepto)}</b><small>${esc(TM_CAT_N(t.cat))}${t.origen === "cronometro" ? " · cronómetro" : ""}</small></td><td>${a ? `<span class="tm-who">${avatar(t.quien)}<span>${esc(a.nombre)}</span></span>` : `<span class="caption">—</span>`}</td><td class="n">${tmDur(t.minutos)}</td><td class="n tm-acts"><button class="tbtn" data-tmp="edit" data-id="${t.id}" aria-label="Editar">${TM_I.lapiz}</button>${TM.del === t.id ? `<button class="tm-del-ok" data-tmp="del" data-id="${t.id}">Eliminar</button>` : `<button class="tbtn" data-tmp="del" data-id="${t.id}" aria-label="Eliminar">${I.trash}</button>`}</td></tr>`;
  };
  const tabla = L.length ? `<div class="tablewrap card" style="padding:0"><table class="grid-t tm-tt"><thead><tr><th>Fecha</th><th>Concepto</th><th>Quién</th><th class="n">Duración</th><th></th></tr></thead><tbody>${L.map(fila).join("")}</tbody><tfoot><tr><td></td><td><b>Total</b></td><td></td><td class="n"><b>${tmDur(r.min)}</b></td><td></td></tr></tfoot></table></div>` : `<div class="card tm-vacio"><b>Sin tiempos</b><span>Pulsa el cronómetro de abajo a la derecha al empezar a trabajar en el expediente, o añade aquí el tiempo de una reunión o una llamada.</span></div>`;
  return `<div class="tm-sec">${kpis}${verd}
    <div class="grid g2 tm-g">
      <div class="card">${cardH("Horas por tarea", "")}${barras}</div>
      <div class="card">${cardH("Añadir tiempo", "")}${alta}</div>
    </div>
    <div class="sectitle flex"><b>Registro de tiempos</b><span>${plural(L.length, "entrada", "entradas")}</span></div>
    ${tabla}${tmDatalist(x)}
    <p class="foot-note">El €/hora efectivo divide los honorarios presupuestados (sin IVA) entre las horas registradas. Es una medida interna del despacho: no aparece en los documentos del cliente.</p></div>`;
}

// ── Cuadro de mando del despacho ────────────────────────────────
function tmPeriodo() {
  const h = hoy();
  if (TM.per === "d90") { const d = new Date(h + "T12:00:00"); d.setDate(d.getDate() - 90); return { desde: d.toISOString().slice(0, 10), hasta: h, n: "Últimos 90 días" }; }
  if (TM.per === "todo") return { desde: null, hasta: h, n: "Todo el historial" };
  return { desde: h.slice(0, 4) + "-01-01", hasta: h, n: "Año " + h.slice(0, 4) };
}
// Fecha de archivo: el último cambio de fase a «Archivado» anotado en la bitácora
function tmCierre(x) {
  if (x.fase !== "cerrado") return null;
  const e = (x.bitacora || []).find((b) => b.tipo === "fase" && /→\s*Archivado\s*$/.test(b.texto || ""));
  return e ? e.t.slice(0, 10) : null;
}
function tmUltimaAct(x) {
  const F = [x.despacho?.alta || x.creado || "", ...(x.bitacora || []).map((b) => String(b.t || "").slice(0, 10)), ...(x.tiempos || []).map((t) => t.fecha), ...(x.despacho?.movs || []).map((m) => m.fecha)].filter(Boolean);
  return F.sort().pop() || "";
}
function tmDatos() {
  const P = tmPeriodo(), en = (f) => !!f && (!P.desde || f >= P.desde) && f <= P.hasta;
  const tarifa = tmTarifa(), h = hoy();
  const E = DB.expedientes.filter((x) => !tmEsc(x)).map((x) => {
    let R = null; try { R = calcular(x); } catch (e) {}
    const F = fondos(x, R), hon = tmHon(x, R), min = tmMin(x), minP = tmMin(x, P.desde, P.hasta);
    const alta = x.despacho?.alta || x.creado || "", cierre = tmCierre(x), ult = tmUltimaAct(x);
    const cobP = (x.despacho?.movs || []).filter((m) => m.tipo === "honorarios" && en(m.fecha)).reduce((s, m) => s + num(m.importe), 0);
    const activo = !P.desde || x.fase !== "cerrado" || en(alta) || en(cierre) || minP > 0 || (x.despacho?.movs || []).some((m) => en(m.fecha));
    return { x, R, F, hon, min, minP, alta, cierre, ult, cobP, activo, eh: hon != null && min > 0 ? hon / (min / 60) : null, parado: x.fase !== "cerrado" && ult && dias(ult, h) > 30 ? dias(ult, h) : 0 };
  });
  const A = E.filter((e) => e.activo);
  const sum = (L, f) => L.reduce((s, e) => s + f(e), 0);
  const conH = A.filter((e) => e.min > 0 && e.hon != null);
  const ehMedio = conH.length ? sum(conH, (e) => e.hon) / (sum(conH, (e) => e.min) / 60) : null;
  const cerr = E.filter((e) => e.cierre && en(e.cierre));
  const durs = cerr.filter((e) => e.alta).map((e) => Math.max(0, dias(e.alta, e.cierre)));
  const provSin = E.filter((e) => e.x.fase === "cerrado" && e.F.saldo > 0.005);
  const minutas = E.filter((e) => faseI(e.x.fase) >= faseI("firma") && e.F.pendiente > 0.5);
  const parados = E.filter((e) => e.parado).sort((a, b) => b.parado - a.parado);
  const nuevos = E.filter((e) => en(e.alta));
  // Por abogado: horas del periodo y €/h con los honorarios repartidos en proporción a las horas de cada uno
  const D = despachoCfg(); const ab = {};
  for (const e of E) for (const t of e.x.tiempos || []) {
    if (!en(t.fecha)) continue;
    const k = t.quien && abogado(t.quien) ? t.quien : "_"; const a = (ab[k] = ab[k] || { id: k, min: 0, valor: 0, minV: 0, exps: new Set() });
    a.min += num(t.minutos); a.exps.add(e.x.id);
    if (e.eh != null) { a.valor += e.eh * num(t.minutos) / 60; a.minV += num(t.minutos); }
  }
  const abogados = [...D.abogados.map((a) => ab[a.id] || { id: a.id, min: 0, valor: 0, minV: 0, exps: new Set() }), ...(ab._ ? [ab._] : [])].map((a) => ({ ...a, nombre: a.id === "_" ? "Sin asignar" : abogado(a.id)?.nombre || "—", resp: E.filter((e) => e.x.responsable === a.id && e.x.fase !== "cerrado").length, eh: a.minV ? a.valor / (a.minV / 60) : null }));
  // Últimos 12 meses: honorarios aplicados (libro de fondos) y horas registradas
  const meses = []; { const d = new Date(h.slice(0, 7) + "-15T12:00:00"); for (let i = 11; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 15); meses.push(m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0")); } }
  const serie = meses.map((m) => ({ m, cob: sum(E, (e) => (e.x.despacho?.movs || []).filter((q) => q.tipo === "honorarios" && String(q.fecha).slice(0, 7) === m).reduce((s, q) => s + num(q.importe), 0)), min: sum(E, (e) => (e.x.tiempos || []).filter((t) => String(t.fecha).slice(0, 7) === m).reduce((s, t) => s + num(t.minutos), 0)) }));
  return {
    P, tarifa, E, A, ehMedio, cerr, serie, abogados, provSin, minutas, parados, nuevos,
    presup: sum(nuevos, (e) => e.F.presup), cobrados: sum(E, (e) => e.cobP), pendientes: sum(E, (e) => e.F.pendiente), nPend: E.filter((e) => e.F.pendiente > 0.5).length,
    minP: sum(E, (e) => e.minP), nMinP: E.filter((e) => e.minP > 0).length,
    abiertos: E.filter((e) => e.x.fase !== "cerrado").length,
    durMedia: durs.length ? durs.reduce((s, d) => s + d, 0) / durs.length : null, nDur: durs.length,
    provSinT: sum(provSin, (e) => e.F.saldo), minutasT: sum(minutas, (e) => e.F.pendiente),
  };
}
// Número «redondo» para el eje: 1, 2, 2,5 o 5 × 10^n
function tmNice(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p; return 10 * p; }
// Ancho real aproximado del gráfico en píxeles: el SVG se dibuja a escala 1:1 para que el texto no crezca ni encoja
function tmAncho() { try { const w = window.innerWidth; return Math.round(Math.max(300, escritorio() ? Math.min(1320, w - 264) - 36 - 44 : w - 36 - 44)); } catch (e) { return 640; } }
// Columnas de un solo color, punta redondeada de 4 px y base recta; rejilla fina; valor en la barra mayor y en el mes actual
function tmColumnas(serie, val, fmt, tick, titulo, conEje) {
  const W = tmAncho(), H = conEje ? 150 : 128, top = 22, bottom = conEje ? 26 : 6, left = 46, plotH = H - top - bottom, band = (W - left - 4) / serie.length, bw = Math.min(24, band * 0.56);
  const vals = serie.map(val), max = tmNice(Math.max(...vals, 0) || 1), y = (v) => top + plotH - (v / max) * plotH;
  const iMax = vals.indexOf(Math.max(...vals)), iUlt = vals.length - 1;
  const grid = [0, max / 2, max].map((v) => `<line x1="${left}" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="tm-gl"/><text x="${left - 8}" y="${(y(v) + 4).toFixed(1)}" class="tm-ax" text-anchor="end">${tick(v)}</text>`).join("");
  const barras = serie.map((s, i) => {
    const v = vals[i], cx = left + band * i + band / 2, x0 = cx - bw / 2, y0 = y(v), hgt = top + plotH - y0, rr = Math.min(4, hgt);
    const nom = new Date(s.m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const rect = v > 0 ? `<path d="M${x0.toFixed(1)} ${(top + plotH).toFixed(1)}V${(y0 + rr).toFixed(1)}q0 -${rr} ${rr} -${rr}h${(bw - 2 * rr).toFixed(1)}q${rr} 0 ${rr} ${rr}V${(top + plotH).toFixed(1)}z" class="tm-bar${i === iUlt ? " tm-cur" : ""}"><title>${esc(nom)}: ${esc(fmt(v))}</title></path>` : "";
    const lab = v > 0 && (i === iMax || i === iUlt) ? `<text x="${cx.toFixed(1)}" y="${(y0 - 7).toFixed(1)}" class="tm-lv" text-anchor="middle">${esc(fmt(v))}</text>` : "";
    const ax = conEje ? `<text x="${cx.toFixed(1)}" y="${H - 8}" class="tm-ax" text-anchor="middle">${esc(mes(s.m + "-15"))}</text>` : "";
    return rect + lab + ax;
  }).join("");
  return `<figure class="tm-fig"><figcaption>${titulo}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}" preserveAspectRatio="xMidYMid meet">${grid}<line x1="${left}" x2="${W}" y1="${top + plotH}" y2="${top + plotH}" class="tm-base"/>${barras}</svg></figure>`;
}
function vRentabilidad() {
  const K = tmDatos(), T = K.tarifa;
  const ehCls = K.ehMedio == null ? "" : K.ehMedio >= T ? "ok" : K.ehMedio >= T * 0.85 ? "warn" : "bad";
  const seg = `<div class="seg">${[["anio", "Este año"], ["d90", "Últimos 90 días"], ["todo", "Todo"]].map(([k, n]) => `<button data-tmp="per" data-v="${k}" aria-pressed="${TM.per === k}">${n}</button>`).join("")}</div>`;
  const dinero = `<div class="kpis tm-kpis">${kpi("Honorarios presupuestados", eur0(K.presup), `${plural(K.nuevos.length, "encargo")} del periodo · IVA incl.`)}${kpi("Honorarios cobrados", eur0(K.cobrados), "aplicados en el periodo · IVA incl.")}${kpi("Pendientes de cobro", eur0(K.pendientes), `a hoy · ${plural(K.nPend, "expediente")}`, K.pendientes > 0 ? "warn" : "")}${kpi("Provisiones sin aplicar", eur0(K.provSinT), K.provSin.length ? `${plural(K.provSin.length, "expediente archivado", "expedientes archivados")} con saldo` : "ningún archivado con saldo", K.provSin.length ? "bad" : "")}${kpi("Minutas pendientes", K.minutas.length ? plural(K.minutas.length, "minuta") : "Ninguna", K.minutas.length ? `${eur0(K.minutasT)} de firma en adelante` : "de firma en adelante", K.minutas.length ? "warn" : "")}</div>`;
  const trabajo = `<div class="kpis tm-kpis">${kpi("Horas registradas", tmDur(K.minP), `en ${plural(K.nMinP, "expediente")}`)}${kpi("€/hora medio", tmEh(K.ehMedio), `objetivo ${tmEh(T)} · sin IVA`, ehCls)}${kpi("Expedientes abiertos", String(K.abiertos), `${plural(K.cerr.length, "archivado", "archivados")} en el periodo`)}${kpi("Duración media", K.durMedia == null ? "—" : plural(Math.round(K.durMedia), "día"), K.nDur ? `del encargo al archivo · ${plural(K.nDur, "caso")}` : "ningún archivo en el periodo")}${kpi("Parados más de 30 días", String(K.parados.length), K.parados.length ? "sin actividad registrada" : "toda la cartera se mueve", K.parados.length ? "warn" : "")}</div>`;
  // Lo que pide atención hoy
  const at = [
    ...K.parados.slice(0, 6).map((e) => ({ e, cls: "warn", t: `Parado ${plural(e.parado, "día")}`, s: `Última actividad: ${fechaCorta(e.ult)} · ${faseN(e.x.fase)}` })),
    ...K.provSin.map((e) => ({ e, cls: "bad", t: `Provisión sin aplicar: ${eur(e.F.saldo)}`, s: "Archivado con saldo del cliente: aplica o devuelve los fondos" })),
    ...K.minutas.slice(0, 6).map((e) => ({ e, cls: "acc", t: `Minuta pendiente: ${eur(e.F.pendiente)}`, s: `${faseN(e.x.fase)} · honorarios sin aplicar` })),
  ];
  const atencion = at.length ? `<div class="group tm-at" style="--inset:16px">${at.map((a) => `<button class="row" data-tmp="open" data-id="${a.e.x.id}"><i class="dot ${a.cls}"></i><span class="t"><b>${esc(a.t)}</b><small><span class="mono">${esc(tmRefX(a.e.x))}</span> · ${esc(nombreExp(a.e.x))} · ${esc(a.s)}</small></span>${I.chev}</button>`).join("")}</div>` : `<div class="card tm-vacio"><b>Nada pendiente</b><span>Sin expedientes parados, provisiones sin aplicar ni minutas pendientes.</span></div>`;
  // Tabla de expedientes
  const k = TM.ord, dir = TM.dir;
  // Toda la tabla sin IVA, como el €/hora (P10, H38): lo cobrado y lo pendiente vienen del libro de fondos con IVA y se pasan a base
  const sinIVA = (v) => v / (1 + TM_IVA);
  const filas = K.A.map((e) => ({ e, ref: tmRefX(e.x), cliente: nombreExp(e.x), fase: faseI(e.x.fase), min: e.min, hon: e.hon ?? -1, eh: e.eh, dif: e.eh == null ? null : e.eh - T, cob: sinIVA(e.F.hon), pend: sinIVA(e.F.pendiente) }));
  filas.sort((a, b) => { const va = a[k], vb = b[k]; if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return (typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "es")) * dir; });
  const conEh = filas.filter((f) => f.eh != null); const peor = conEh.length > 1 ? conEh.reduce((m, f) => (f.eh < m.eh ? f : m)) : null;
  const th = (key, txt, cls = "") => `<th class="${cls}"><button data-tmp="sort" data-k="${key}" class="${k === key ? "on" : ""}" aria-label="Ordenar por ${txt.toLowerCase()}">${txt}${k === key ? (dir > 0 ? " ↑" : " ↓") : ""}</button></th>`;
  const tabla = filas.length ? `<div class="tablewrap card" style="padding:0"><table class="grid-t tm-rt"><thead><tr>${th("ref", "Referencia")}${th("cliente", "Cliente")}${th("fase", "Fase")}${th("min", "Horas", "n")}${th("hon", "Honorarios s/IVA", "n")}${th("eh", "€/hora s/IVA", "n")}${th("dif", "Frente al objetivo", "n")}${th("cob", "Cobrado s/IVA", "n")}${th("pend", "Pendiente s/IVA", "n")}</tr></thead><tbody>
    ${filas.map((f) => `<tr data-tmp="open" data-id="${f.e.x.id}" class="${f.eh != null && f.eh < T ? "tm-low" : ""}"><td class="mono">${esc(f.ref)}</td><td><b>${esc(f.cliente)}</b>${f === peor ? `<span class="tm-chip">Menos rentable</span>` : `<small><span class="tm-mref">${esc(f.ref)} · </span>${esc(abogado(f.e.x.responsable)?.nombre || "")}</small>`}</td><td><span class="fase f${f.fase}">${esc(faseN(f.e.x.fase))}</span></td><td class="n">${f.min ? tmDur(f.min) : "—"}</td><td class="n">${f.hon >= 0 ? eur0(f.hon) : "—"}</td><td class="n"><b class="tm-eh ${f.eh == null ? "" : f.eh >= T ? "ok" : f.eh >= T * 0.85 ? "warn" : "bad"}">${tmEh(f.eh)}</b></td><td class="n">${f.dif == null ? "—" : (f.dif >= 0 ? "+" : "−") + grp(Math.abs(f.dif), 0) + " €/h"}</td><td class="n">${eur0(f.cob)}</td><td class="n">${f.pend > 0.5 ? eur0(f.pend) : "—"}</td></tr>`).join("")}
  </tbody></table></div>` : `<div class="card tm-vacio"><b>Sin expedientes en el periodo</b><span>Cambia el periodo o abre un expediente.</span></div>`;
  // Gráfico mensual: dos paneles con el mismo eje de meses (sin doble eje)
  const hayS = K.serie.some((s) => s.cob || s.min);
  const graf = hayS ? `<div class="card tm-chart">
    ${tmColumnas(K.serie, (s) => s.cob, eur0, (v) => (v >= 1000 ? grp(v / 1000, v % 1000 ? 1 : 0) + " k" : grp(v, 0)) + " €", "Honorarios cobrados (IVA incl.)", false)}
    ${tmColumnas(K.serie, (s) => s.min / 60, (v) => tmDur(v * 60), (v) => grp(v, v % 1 ? 1 : 0) + " h", "Horas registradas", true)}
    <details class="tm-dt"><summary>Ver los datos</summary><table class="grid-t"><thead><tr><th>Mes</th><th class="n">Cobrado (IVA incl.)</th><th class="n">Horas</th></tr></thead><tbody>${K.serie.map((s) => `<tr><td>${esc(new Date(s.m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}</td><td class="n">${eur0(s.cob)}</td><td class="n">${tmDur(s.min)}</td></tr>`).join("")}</tbody></table></details></div>` : "";
  // Por abogado
  const maxAb = Math.max(1, ...K.abogados.map((a) => a.min));
  const porAb = `<div class="tablewrap card" style="padding:0"><table class="grid-t tm-ab"><thead><tr><th>Abogado</th><th class="n">Expedientes abiertos</th><th>Horas</th><th class="n">€/hora</th></tr></thead><tbody>${K.abogados.map((a) => `<tr><td><span class="tm-who">${a.id === "_" ? `<span class="av none">–</span>` : avatar(a.id)}<b>${esc(a.nombre)}</b></span></td><td class="n">${a.resp || "—"}</td><td><span class="tm-hb-t tm-ab-b"><i style="width:${a.min ? Math.max(2, Math.round(a.min / maxAb * 100)) : 0}%"></i></span><span class="tm-ab-v">${a.min ? tmDur(a.min) : "—"}</span></td><td class="n"><b class="tm-eh ${a.eh == null ? "" : a.eh >= T ? "ok" : a.eh >= T * 0.85 ? "warn" : "bad"}">${tmEh(a.eh)}</b></td></tr>`).join("")}</tbody></table></div>`;
  return `<div class="topbar"><button class="tbtn back-m" data-act="home">${I.back}Expedientes</button><span class="crumbs"><b>Rentabilidad</b></span><span class="mid">Rentabilidad</span><span class="tbtns">${typeof ayBotonHTML === "function" ? ayBotonHTML() : ""}</span></div>
  <div class="page wide view tm-dash"><p class="greet">${esc(K.P.n)}${K.P.desde ? ` · desde el ${esc(fechaCorta(K.P.desde))}` : ""}</p><h1 class="ltitle">Rentabilidad</h1>
    <div class="tm-top">${seg}<label class="tm-tarifa tm-tarifa-in"><span>Objetivo</span><span class="tm-inp"><input id="tm-tarifa" data-tmpf="tarifa" inputmode="decimal" value="${numStr(T)}" aria-label="Objetivo del despacho en euros por hora"><em>€/h</em></span></label></div>
    <div class="sectitle">Dinero</div>${dinero}
    <div class="sectitle">Trabajo</div>${trabajo}
    <div class="sectitle flex"><b>Pide atención</b><span>${plural(at.length, "aviso")}</span></div>${atencion}
    ${graf ? `<div class="sectitle flex"><b>Honorarios y horas por mes</b><span>últimos 12 meses</span></div>${graf}` : ""}
    <div class="sectitle flex"><b>Expedientes</b><span>${plural(filas.length, "expediente")} · ordenados por ${{ ref: "referencia", cliente: "cliente", fase: "fase", min: "horas", hon: "honorarios", eh: "€/hora", dif: "objetivo", cob: "cobrado", pend: "pendiente" }[k]}</span></div>${tabla}
    <div class="sectitle flex"><b>Por abogado</b><span>honorarios repartidos por horas</span></div>${porAb}
    <p class="foot-note">Arriba y en el gráfico, honorarios con IVA, como en el libro de fondos de cada expediente. En la tabla de expedientes todas las columnas van sin IVA (${grp(TM_IVA * 100, 0)} %), igual que el €/hora, para que se puedan comparar. «Cobrado» son los honorarios aplicados desde la provisión de fondos. El €/hora de un expediente divide sus honorarios presupuestados entre todas sus horas registradas; el de cada abogado reparte esos honorarios en proporción a sus horas. La duración se mide desde la fecha del encargo hasta el paso a «Archivado» en la bitácora. Parado: expediente abierto sin anotaciones, tiempos ni movimientos en 30 días.</p>
  </div>`;
}

// ── Eventos (un solo manejador en captura; ui.js no ve estos clics) ──
function tmLeerForm(pre) {
  const v = (s) => document.getElementById(pre + "-" + s)?.value ?? "";
  return { fecha: v("fecha") || hoy(), minutos: tmLeerDur(v("dur")), concepto: v("con").trim(), cat: v("cat") || "otro", quien: v("quien") || tmYo() };
}
function tmClick(ev) {
  const b = ev.target && ev.target.closest ? ev.target.closest("[data-tmp]") : null; if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.tmp, id = b.dataset.id;
  try {
    if (a === "iniciar") return tmIniciar();
    if (a === "pausar") return tmPausar();
    if (a === "reanudar" || a === "seguir") return tmReanudar();
    if (a === "parar") return tmParar();
    if (a === "descartar") return tmDescartar();
    if (a === "irCron") { const c = tmCron(); if (c) go({ vista: "exp", id: c.xId, sheet: null }); return; }
    if (a === "rent") { go({ vista: "rent", sheet: null }); return; }
    if (a === "per") { TM.per = b.dataset.v; render(); return; }
    if (a === "sort") { if (TM.ord === b.dataset.k) TM.dir = -TM.dir; else { TM.ord = b.dataset.k; TM.dir = ["eh", "dif", "ref", "cliente", "fase"].includes(b.dataset.k) ? 1 : -1; } render(); return; }
    if (a === "open") { go({ vista: "exp", id, sec: "despacho", sub: "tiempos", sheet: null }); return; }
    const x = exp(); if (!x) return;
    if (a === "edit") { TM.edit = id; TM.del = null; render(); return; }
    if (a === "editNo") { TM.edit = null; render(); return; }
    if (a === "del") {
      if (TM.del !== id) { TM.del = id; render(); setTimeout(() => { if (TM.del === id) { TM.del = null; render(); } }, 4000); return; }
      const t = (x.tiempos || []).find((q) => q.id === id); x.tiempos = (x.tiempos || []).filter((q) => q.id !== id); TM.del = null;
      if (t) anotar(x, `Tiempo eliminado: ${tmDur(t.minutos)} · ${t.concepto}`, "sistema");
      guardar(); render(); toast("Tiempo eliminado"); return;
    }
  } catch (e) { console.error(e); }
}
function tmSubmit(ev) {
  const f = ev.target && ev.target.closest ? ev.target.closest("form[data-tmp-form]") : null; if (!f) return;
  ev.preventDefault(); ev.stopPropagation();
  try {
    const k = f.dataset.tmpForm;
    if (k === "cron") return tmGuardarCron();
    const x = exp(); if (!x) return;
    if (k === "add") {
      const v = tmLeerForm("tm-f");
      if (!v.minutos) { toast("Indica la duración, por ejemplo 1:30 o 45 min"); document.getElementById("tm-f-dur")?.focus(); return; }
      if (!v.concepto) v.concepto = TM_CAT_N(v.cat);
      tmApuntar(x, { id: uid(), ...v, origen: "manual" }); guardar(); render(); toast(`Tiempo añadido: ${tmDur(v.minutos)}`); return;
    }
    if (k === "edit") {
      const t = (x.tiempos || []).find((q) => q.id === f.dataset.id); if (!t) return;
      const v = tmLeerForm("tm-e");
      if (!v.minutos) { toast("Indica la duración"); return; }
      Object.assign(t, v, { concepto: v.concepto || TM_CAT_N(v.cat) }); TM.edit = null; guardar(); render(); return;
    }
  } catch (e) { console.error(e); }
}
function tmCambio(ev) {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.tmpf) return;
  if (ev.type === "input") {
    if (t.dataset.tmpf === "con") { const p = TM_PRESETS.find((q) => q[0] === t.value); const s = p || /^Trámite: /.test(t.value) ? document.getElementById(t.dataset.cat) : null; if (s) s.value = p ? p[1] : "tramites"; }
    return;
  }
  ev.stopPropagation();
  if (t.dataset.tmpf === "tarifa") { const v = num(t.value); if (v > 0) { despachoCfg().tarifaHora = v; guardar(); } render(); }
}
document.addEventListener("click", tmClick, true);
document.addEventListener("submit", tmSubmit, true);
document.addEventListener("change", tmCambio, true);
document.addEventListener("input", tmCambio, true);
// Montaje tras el primer render de ui.js (este archivo se carga antes que ui.js)
setTimeout(() => { try { tmMontar(); tmSync(true); } catch (e) {} }, 0);
