// ───────────────────── {{MARCA}} · gestión del despacho ─────────────────────
// Fases del encargo, equipo, cartera en tabla y tablero, bitácora, fondos del cliente y conflicto de intereses.
const FASES_EXP = [["encargo", "Encargo"], ["documentacion", "Documentación"], ["liquidacion", "Liquidación"], ["firma", "Firma"], ["inscripcion", "Inscripción y entrega"], ["cerrado", "Archivado"]];
const faseN = (k) => (FASES_EXP.find((f) => f[0] === k) || FASES_EXP[0])[1];
const faseI = (k) => Math.max(0, FASES_EXP.findIndex((f) => f[0] === (k || "encargo")));
function despachoCfg() {
  DB.despacho = DB.despacho || {};
  const d = DB.despacho;
  if (!Array.isArray(d.abogados) || !d.abogados.length) d.abogados = [{ id: "a1", nombre: "Titular del despacho", rol: "Socio" }];
  if (d.localidad) { const l = dpSinRepetir(d.localidad); if (l !== d.localidad) d.localidad = l; }
  if (d.colegio) { try { bvColegioMigrar(d); } catch (e) { /* bienvenida.js aún no cargado */ } }
  return d;
}
const abogado = (id) => despachoCfg().abogados.find((a) => a.id === id) || null;

// ── Contacto del despacho (Piloto 10): teléfono, correo, dirección y web, para escritos, familia y calculadora ──
// Campos en despachoCfg(): tel, email, direccion, cp, localidad, web, nif (opcional). Se editan en la bienvenida y en Ajustes.
const DP_CONTACTO = [["tel", "Teléfono", 'type="tel" inputmode="tel" autocomplete="tel" placeholder="Ej.: 952 123 456"'], ["email", "Correo", 'type="email" autocomplete="email" placeholder="despacho@ejemplo.es"'], ["direccion", "Dirección", 'autocomplete="street-address" placeholder="Calle, número y piso"'], ["cp", "Código postal", 'inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="29001"'], ["web", "Web", 'type="url" autocomplete="url" placeholder="https://www.tudespacho.es"'], ["nif", "NIF del despacho (opcional)", 'autocapitalize="characters" placeholder="Para las facturas y la hoja de encargo"']];
function dpTxt(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
// «MálagaMálaga» o «Málaga Málaga» (autorrelleno + escritura) → «Málaga»
function dpSinRepetir(s) { const t = dpTxt(s); const m = /^(.{2,}?)\s*\1$/iu.exec(t); return m ? m[1].trim() : t; }
function despachoContacto() {
  const D = despachoCfg(), w = D.widget && typeof D.widget === "object" ? D.widget : {};
  const c = { nombre: dpTxt(D.nombre), colegio: dpTxt(D.colegio), localidad: dpSinRepetir(D.localidad), direccion: dpTxt(D.direccion), cp: dpTxt(D.cp), tel: dpTxt(D.tel) || dpTxt(w.tel), email: dpTxt(D.email) || dpTxt(w.email), web: dpTxt(D.web) || dpTxt(w.web), nif: dpTxt(D.nif) };
  c.postal = [c.direccion, [c.cp, c.localidad].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  c.linea = [c.postal, c.tel ? "Tel. " + c.tel : "", c.email, c.web.replace(/^https?:\/\//i, "").replace(/\/$/, "")].filter(Boolean).join(" · ");
  c.hayContacto = !!(c.tel || c.email);
  return c;
}
// Línea de contacto para membretes: lo que falte se deja como hueco visible entre corchetes
function dpLineaMembrete() {
  const c = despachoContacto();
  return [c.direccion ? c.postal : ["[dirección]", [c.cp, c.localidad].filter(Boolean).join(" ")].filter(Boolean).join(", "), c.email || "[correo]", c.tel || "[teléfono]"].join(" · ");
}
// Campos de contacto para la hoja de Ajustes (usa data-cfg: el manejador de cambios de ui.js ya los guarda)
function dpCamposContactoHTML() {
  const D = despachoCfg();
  return `<div class="sectitle">Contacto del despacho</div><div class="group">${DP_CONTACTO.map(([k, l, at]) => `<div class="field"><label for="a-${k}">${l}</label><input id="a-${k}" data-cfg="${k}" value="${esc(D[k] || "")}" ${at}></div>`).join("")}</div><p class="group-foot">Aparecen en las cartas a bancos y notarías, en la carpeta y el cuestionario de la familia y, si no pones otros, en la calculadora para tu web.</p>`;
}
const iniciales = (n) => String(n || "?").split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const avatar = (id, big) => { const a = abogado(id); return a ? `<span class="av${big ? " big" : ""}" title="${esc(a.nombre)}">${esc(iniciales(a.nombre))}</span>` : `<span class="av none${big ? " big" : ""}" title="Sin responsable">–</span>`; };
// Siguiente referencia del año: la mayor de los expedientes reales + 1. Los de la demostración no cuentan (M6: el primero creado en la
// demostración salía como EXP-2026-016) y, al ser la mayor y no el número de expedientes, borrar uno no hace que se repita una referencia.
function nuevaRef() {
  const y = new Date().getFullYear(), re = new RegExp(`^EXP-${y}-(\\d+)`);
  const usadas = new Set((DB.expedientes || []).map((x) => String(x && x.despacho?.ref || "")));
  let n = (DB.expedientes || []).filter((x) => x && !x.demo).reduce((m, x) => { const r = re.exec(String(x.despacho?.ref || "")); return r ? Math.max(m, Number(r[1])) : m; }, 0) + 1;
  while (usadas.has(`EXP-${y}-${String(n).padStart(3, "0")}`)) n++;
  return `EXP-${y}-${String(n).padStart(3, "0")}`;
}

// ── Bitácora ───────────────────────────────────────────────────
function anotar(x, texto, tipo = "sistema") {
  if (!x) return;
  x.bitacora = x.bitacora || [];
  x.bitacora.unshift({ t: new Date().toISOString(), tipo, texto, autor: despachoCfg().yo || "" });
  if (x.bitacora.length > 400) x.bitacora.length = 400;
}
const horaTxt = (iso) => { const d = new Date(iso); const hoyS = hoy(); const f = iso.slice(0, 10); return (f === hoyS ? "Hoy" : fechaCorta(f)) + " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); };
function bitacoraHTML(x, n) {
  const L = (x.bitacora || []).slice(0, n || 999);
  if (!L.length) return `<p class="caption">Sin actividad registrada.</p>`;
  return `<ol class="log">${L.map((e) => `<li class="lg-${e.tipo}"><span class="lg-t">${esc(horaTxt(e.t))}${e.autor && abogado(e.autor) ? " · " + esc(abogado(e.autor).nombre) : ""}</span><span class="lg-x">${esc(e.texto)}</span></li>`).join("")}</ol>`;
}

// ── Fondos del cliente y honorarios ────────────────────────────
const MOV_T = { provision: ["Provisión de fondos recibida", 1], suplido: ["Suplido pagado", -1], honorarios: ["Honorarios aplicados", -1], devolucion: ["Devolución al cliente", -1] };
function fondos(x, R) {
  const M = x.despacho?.movs || [];
  const s = (k) => M.filter((m) => m.tipo === k).reduce((a, m) => a + num(m.importe), 0);
  const P = R ? presupuesto(x, R) : null;
  const prov = s("provision"), sup = s("suplido"), hon = s("honorarios"), dev = s("devolucion");
  const presup = P ? P.honorarios + P.iva : 0;
  return { M, prov, sup, hon, dev, saldo: prov - sup - hon - dev, presup, pendiente: Math.max(0, presup - hon) };
}

// ── Conflicto de intereses ─────────────────────────────────────
const normN = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-zñ ]/g, " ").replace(/\s+/g, " ").trim();
function conflictos(x) {
  const mios = [...(x.personas || []).map((p) => [p.nombre, RELACIONES[p.relacion]?.label || ""]), [x.nombre, "Causante"], [x.despacho?.cliente, "Cliente"]].filter(([n]) => normN(n).split(" ").length >= 2);
  const out = [];
  for (const y of DB.expedientes) {
    if (y.id === x.id || y.escenarioDe === x.id || x.escenarioDe === y.id) continue;
    const suyos = [...(y.personas || []).map((p) => [p.nombre, RELACIONES[p.relacion]?.label || ""]), [y.nombre, "Causante"], [y.despacho?.cliente, "Cliente"]];
    for (const [a, ra] of mios) for (const [b, rb] of suyos) if (normN(a) && normN(a) === normN(b)) out.push({ nombre: a, aqui: ra, alli: rb, y });
  }
  return out;
}

// ── Cartera ────────────────────────────────────────────────────
function filaCartera(e) {
  const x = e.x, R = e.R, v = e.p ? vence(e.p) : null;
  const done = e.T.filter(cerrado).length, tot = e.T.length || 1;
  const F = R ? fondos(x, R) : null;
  return { e, x, ref: x.despacho?.ref || "—", cliente: nombreExp(x), causante: x.nombre || "—", fase: faseI(x.fase), resp: x.responsable ? abogado(x.responsable)?.nombre || "" : "", plazo: e.p && e.p.limite && !e.p.informativo ? e.p.limite : "9999", v, imp: R ? R.isd.total + R.totalPlus : 0, hon: F ? F.presup : 0, av: done / tot, terr: nombreTerr(x.ccaa) };
}
function tablaCartera(est) {
  const rows = est.map(filaCartera);
  if (window.matchMedia("(max-width:759px)").matches) { rows.sort((a, b) => a.plazo.localeCompare(b.plazo)); return `<div class="group" style="--inset:16px">${rows.map((r) => `<button class="row" data-open="${r.x.id}"><span class="t"><b class="sb">${esc(r.cliente)}</b><small><span class="mono">${esc(r.ref)}</span> · ${esc(faseN(r.x.fase))}${r.e.p ? ` · <span class="due ${r.v.cls}">${esc(r.v.txt)}</span>` : ""}</small></span>${avatar(r.x.responsable)}${I.chev}</button>`).join("")}</div>`; }
  const k = ui.orden || "plazo", dir = ui.ordenDir || 1;
  rows.sort((a, b) => (typeof a[k] === "number" ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k]))) * dir);
  const th = (key, txt, cls = "") => `<th class="${cls}" ${k === key ? `aria-sort="${dir > 0 ? "ascending" : "descending"}"` : ""}><button data-orden="${key}" class="${k === key ? "on" : ""}" title="Ordenar por ${txt.toLowerCase()}">${txt}<span class="so" aria-hidden="true">${k === key ? (dir > 0 ? "↑" : "↓") : "↕"}</span></button></th>`;
  const ma = typeof maTd === "function"; // acciones masivas (masivo.js): casilla por fila y barra sobre la tabla
  return `${ma ? maBarraHTML() : ""}<div class="tablewrap card cartera-t" style="padding:0"><table class="grid-t"><thead><tr>${ma ? maTh(rows.map((r) => r.x.id)) : ""}${th("ref", "Referencia", "c-ref")}${th("cliente", "Cliente", "c-cli")}${th("fase", "Fase", "c-fase")}${th("resp", "Resp.", "c-resp")}${th("plazo", "Próximo vencimiento", "c-venc")}${th("imp", "Impuestos", "n c-imp")}${th("hon", "Honorarios", "n c-hon")}${th("av", "Avance", "n c-av")}</tr></thead><tbody>
    ${rows.map((r) => `<tr data-open="${r.x.id}" tabindex="0">${ma ? maTd(r.x.id) : ""}<td class="mono c-ref">${esc(r.ref)}</td><td class="c-cli"><b>${esc(r.cliente)}</b><small><span class="ref-in">${esc(r.ref)} · </span>${esc(r.causante !== r.cliente ? "Herencia de " + r.causante : r.terr)}</small></td><td class="c-fase"><span class="fase f${r.fase}">${esc(faseN(r.x.fase))}</span></td><td class="c-resp">${avatar(r.x.responsable)}</td><td class="c-venc">${r.e.p ? `<span class="due ${r.v.cls}">${r.e.p.limite && !r.e.p.informativo ? fechaCorta(r.e.p.limite) : "—"}</span><small>${esc(r.e.p.titulo)}</small>` : `<span class="caption">Sin plazos</span>`}</td><td class="n c-imp">${eur0(r.imp)}</td><td class="n c-hon">${eur0(r.hon)}</td><td class="n c-av"><span class="mbar"><i style="width:${Math.round(r.av * 100)}%"></i></span>${Math.round(r.av * 100)} %</td></tr>`).join("")}
  </tbody></table></div>`;
}
function tableroCartera(est) {
  return `<div class="board">${FASES_EXP.map(([k, n], i) => { const L = est.filter((e) => faseI(e.x.fase) === i); return `<div class="col"><div class="col-h"><b>${n}</b><span>${L.length}</span></div>${L.map((e) => { const v = e.p ? vence(e.p) : null; return `<button class="bcard" data-open="${e.x.id}"><span class="mono caption">${esc(e.x.despacho?.ref || "")}</span><b>${esc(nombreExp(e.x))}</b><small>${esc(e.x.nombre ? "Herencia de " + e.x.nombre : "")}</small><span class="bc-f">${e.p ? `<span class="due ${v.cls}">${esc(v.txt)}</span>` : ""}${avatar(e.x.responsable)}</span></button>`; }).join("") || `<p class="board-empty">Sin expedientes</p>`}</div>`; }).join("")}</div>`;
}
