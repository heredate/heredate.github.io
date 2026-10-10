// ───────────────────── {{MARCA}} · Despacho: perfiles y panel del socio (prefijo sc/SC_) ─────────────────────
// Socio ≠ abogado ≠ administrativo. Cada miembro del equipo tiene un perfil (despachoCfg().abogados[i].perfil; si no
// se ha elegido, se deduce del rol escrito: «Socia» → socio, «Secretaria» → administrativo, el resto → abogado).
// · Socio: entrada «Despacho» en la barra lateral con el panel (vSocio, ui.vista === "socio") y la actividad del despacho.
// · Abogado: entra por Mi día filtrado a sus expedientes y sus tareas.
// · Administrativo: entra por Mi día en «Esperando a terceros» (documentos y reclamaciones).
// Quién soy: despachoCfg().yo (lo firma todo: bitácora, auditoría, tiempos). Se cambia en la barra lateral y en Ajustes.
// Límite honesto: sin servidor no hay cuentas ni permisos reales; los perfiles ordenan lo que ve cada uno, no lo impiden.
// North Star: % de expedientes activos «al día» (sin acciones críticas según rdAccionesExp de radar.js). Se guarda una
// muestra al día en DB.despacho.northStar = [{ f, al, n }] (máx. 180) para ver la tendencia.
const SC_PERFILES = [["socio", "Socio"], ["abogado", "Abogado"], ["administrativo", "Administrativo"]];
// Referencia orientativa de días por fase, solo mientras el despacho no tiene histórico propio (3 casos o más por fase)
const SC_REF = { encargo: 15, documentacion: 60, liquidacion: 45, firma: 30, inscripcion: 60 };
const SC_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8"/><path d="M3 20.5h18"/></svg>';
if (typeof MOV_T === "object" && !MOV_T.factura) MOV_T.factura = ["Minuta emitida (factura)", 0]; // no mueve el saldo del cliente: separa «facturado» de «cobrado»

// ── Perfiles ──
function scPerfil(a) {
  if (!a) return "abogado";
  if (SC_PERFILES.some((p) => p[0] === a.perfil)) return a.perfil;
  const r = String(a.rol || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/\bsoci[oa]s?\b|titular|director|gerente/.test(r)) return "socio";
  if (/administr|secretar|auxiliar|gestor|paralegal|recepcion|oficial/.test(r)) return "administrativo";
  return "abogado";
}
const scPerfilN = (k) => (SC_PERFILES.find((p) => p[0] === k) || SC_PERFILES[1])[1];
function scYo() { const D = despachoCfg(); return (D.yo && D.abogados.find((a) => a.id === D.yo)) || D.abogados[0]; }
const scEsSocio = () => scPerfil(scYo()) === "socio";
// Al arrancar y al cambiar de usuario: cada perfil entra por su sitio
function scAplicarPerfil(arranque) {
  const yo = scYo(), p = scPerfil(yo);
  if (p === "abogado") { ui.rdr = (DB.expedientes || []).some((x) => x.responsable === yo.id || (Array.isArray(x.tareasDespacho) ? x.tareasDespacho : []).some((t) => t.resp === yo.id)) ? yo.id : null; ui.rdf = null; }
  else if (p === "administrativo") { ui.rdr = null; ui.rdf = "bloqueos"; }
  else { ui.rdr = null; ui.rdf = null; }
  if (arranque && p !== "socio" && ui.vista === "inicio" && (DB.expedientes || []).length) ui.vista = "radar";
  if (!arranque && p !== "socio" && ui.vista === "socio") ui.vista = "radar";
}
function scArranque() { try { if (typeof auIniciar === "function") auIniciar(); scAplicarPerfil(true); } catch (e) { console.error(e); } }

// ── Cálculos puros (sin DOM; reciben lo que necesitan) ──
// Tramos de fase de un expediente a partir de la bitácora («Fase: A → B», tipo "fase") y de la fecha del encargo
function scTramosFase(x, h, fases) {
  fases = fases || (typeof FASES_EXP !== "undefined" ? FASES_EXP : []);
  const k = (n) => (fases.find((f) => f[1] === String(n).trim()) || [])[0];
  const d10 = (s) => String(s || "").slice(0, 10);
  const ev = (Array.isArray(x.bitacora) ? x.bitacora : []).filter((b) => b && b.tipo === "fase" && /^Fase: .+ → .+$/.test(b.texto || "")).map((b) => { const m = /^Fase: (.+) → (.+)$/.exec(b.texto); return { t: d10(b.t), de: k(m[1]), a: k(m[2]) }; }).filter((e) => e.t && e.de && e.a).sort((a, b) => a.t.localeCompare(b.t));
  const alta = d10(x.despacho?.alta) || d10(x.creado) || (ev[0] ? ev[0].t : "");
  if (!alta) return [];
  const T = []; let cur = ev.length ? ev[0].de : x.fase || "encargo", desde = alta;
  const dd = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
  for (const e of ev) { if (e.t >= desde) { T.push({ fase: cur, desde, hasta: e.t, dias: dd(desde, e.t) }); } cur = e.a; desde = e.t > desde ? e.t : desde; }
  if ((x.fase || "encargo") !== "cerrado") T.push({ fase: x.fase || cur, desde, hasta: null, dias: Math.max(0, dd(desde, h)) });
  return T;
}
// Fases lentas: media de días por fase (tramos cerrados) y expedientes que llevan en su fase más de lo normal
function scFasesLentas(xs, h, fases, activo) {
  fases = fases || (typeof FASES_EXP !== "undefined" ? FASES_EXP : []);
  const out = fases.filter(([k]) => k !== "cerrado").map(([k, n]) => ({ k, n, cerrados: [], abiertos: [] }));
  for (const x of xs) {
    for (const t of scTramosFase(x, h, fases)) {
      const f = out.find((q) => q.k === t.fase); if (!f) continue;
      if (t.hasta) f.cerrados.push(t.dias); else if (!activo || activo(x)) f.abiertos.push({ x, dias: t.dias });
    }
  }
  for (const f of out) {
    f.nHist = f.cerrados.length;
    f.media = f.nHist ? Math.round(f.cerrados.reduce((s, d) => s + d, 0) / f.nHist) : null;
    f.propia = f.nHist >= 3;
    f.umbral = f.propia ? Math.max(7, Math.round(f.media * 1.5)) : SC_REF[f.k] || 60;
    f.lentos = f.abiertos.filter((a) => a.dias > f.umbral).sort((a, b) => b.dias - a.dias);
    f.mediaAbiertos = f.abiertos.length ? Math.round(f.abiertos.reduce((s, a) => s + a.dias, 0) / f.abiertos.length) : null;
  }
  return out;
}
// North Star: activos sin acciones críticas
function scNorthStar(xs, acciones, activo) {
  const A = xs.filter(activo); let al = 0;
  for (const x of A) { let r; try { r = acciones(x); } catch (e) { r = null; } if (r && !r.crit.length) al++; }
  return { n: A.length, al, pct: A.length ? Math.round((al / A.length) * 100) : null };
}
// Dinero del área: presupuestado, facturado (minutas emitidas), cobrado (honorarios aplicados), por facturar, pendiente de cobro y provisiones
function scDinero(xs, fondosDe) {
  const S = { presup: 0, facturado: 0, cobrado: 0, porFacturar: 0, pendCobro: 0, provisiones: 0, adelantado: 0, sinPresup: 0, nPorFacturar: 0 };
  for (const x of xs) {
    let F; try { F = fondosDe(x); } catch (e) { F = null; } if (!F) continue;
    const fact = (x.despacho?.movs || []).filter((m) => m.tipo === "factura").reduce((s, m) => s + (Number(typeof num === "function" ? num(m.importe) : m.importe) || 0), 0);
    const activo = x.fase !== "cerrado";
    S.presup += activo ? F.presup || 0 : 0;
    S.facturado += fact; S.cobrado += F.hon || 0;
    const emitido = Math.max(fact, F.hon || 0);
    if (activo) { if (!F.presup) S.sinPresup++; const pf = Math.max(0, (F.presup || 0) - emitido); if (pf > 0.5) { S.porFacturar += pf; S.nPorFacturar++; } }
    S.pendCobro += Math.max(0, fact - (F.hon || 0));
    if (F.saldo > 0) S.provisiones += F.saldo; else if (F.saldo < 0) S.adelantado += -F.saldo;
  }
  for (const k in S) S[k] = Math.round(S[k] * 100) / 100;
  return S;
}
// Carga por persona del equipo
function scCarga(xs, abogados, acciones, activo, h) {
  const fila = (id, nombre) => ({ id, nombre, activos: 0, alDia: 0, criticos: 0, vencidos: 0, semana: 0, bloqueos: 0, tareas: 0, min30: 0 });
  const F = new Map(abogados.map((a) => [a.id, fila(a.id, a.nombre)])); F.set("none", fila("none", "Sin asignar"));
  const desde = h ? new Date(new Date(h + "T12:00:00") - 30 * 864e5).toISOString().slice(0, 10) : "";
  for (const x of xs) {
    for (const t of Array.isArray(x.tiempos) ? x.tiempos : []) if (t && F.has(t.quien) && (!desde || String(t.fecha) >= desde)) F.get(t.quien).min30 += Number(t.minutos) || 0;
    if (!activo(x)) continue;
    for (const t of Array.isArray(x.tareasDespacho) ? x.tareasDespacho : []) if (t && !t.hecha && F.has(t.resp)) F.get(t.resp).tareas++;
    const r = F.get(x.responsable) || F.get("none");
    let A; try { A = acciones(x); } catch (e) { A = { crit: [], prox: [], bloq: [] }; }
    r.activos++; if (!A.crit.length) r.alDia++; else r.criticos++;
    r.vencidos += A.crit.filter((i) => i.tipo === "plazo" && i.dias != null && i.dias < 0).length;
    r.semana += A.prox.filter((i) => i.tipo === "plazo").length;
    r.bloqueos += A.bloq.filter((i) => i.tipo !== "parado").length;
  }
  const L = [...F.values()].filter((r) => r.id !== "none" || r.activos);
  const conCarga = L.filter((r) => r.activos && r.id !== "none");
  const media = conCarga.length ? conCarga.reduce((s, r) => s + r.activos, 0) / conCarga.length : 0;
  for (const r of L) r.sobrecarga = r.id !== "none" && ((conCarga.length > 1 && r.activos >= 4 && r.activos > media * 1.4) || r.criticos >= 3);
  return L;
}
// Motivos de bloqueo más frecuentes (a partir de los bloqueos y parados del radar)
function scMotivo(b) {
  const q = String(b.quien || ""), tipoQ = q.startsWith("heredero:") ? "heredero" : q;
  const N = { banco: "bancos", notaria: "notarías", registro: "registros", hacienda: "Hacienda", ayuntamiento: "ayuntamientos", otro: "otros organismos", familia: "la familia", heredero: "herederos", despacho: "el despacho" };
  if (b.tipo === "docs") return "Documentación pendiente de la familia";
  if (b.tipo === "cuestionario") return "Cuestionario de la familia sin devolver";
  if (b.tipo === "solicitud") return `Respuesta pendiente de ${N[tipoQ] || "terceros"}`;
  if (b.tipo === "curso") return `Trámite en curso ante ${N[tipoQ] || "terceros"}`;
  if (b.tipo === "dato") return tipoQ === "heredero" ? "Faltan datos de herederos" : "Faltan datos del expediente";
  if (b.tipo === "parado") return "Sin actividad en 30 días o más";
  return "Otros bloqueos";
}
function scMotivos(bloqueos) {
  const M = new Map();
  for (const b of bloqueos) { const k = scMotivo(b); const m = M.get(k) || { motivo: k, n: 0, exps: new Set() }; m.n++; m.exps.add(b.xId); M.set(k, m); }
  return [...M.values()].map((m) => ({ motivo: m.motivo, n: m.n, exps: m.exps.size })).sort((a, b) => b.exps - a.exps || b.n - a.n || a.motivo.localeCompare(b.motivo, "es"));
}
// Expedientes en riesgo: con acciones críticas o dinero en juego
const SC_CAT = { recargo: "Recargo por presentar fuera de plazo", bonif: "Bonificación que hay que pedir", exceso: "Exceso de adjudicación (AJD o TPO)", otros: "Riesgo fiscal por revisar" };
function scRiesgo(xs, acciones, activo, catDe) {
  const L = [];
  for (const x of xs) {
    if (!activo(x)) continue;
    let A; try { A = acciones(x); } catch (e) { continue; }
    if (!A.crit.length && !(A.euros > 0)) continue;
    let top = A.crit[0] ? A.crit[0].titulo : "";
    if (!top) { let c = null; try { c = catDe ? catDe(x) : null; } catch (e) {} const k = c ? Object.keys(SC_CAT).sort((a, b) => (c[b] || 0) - (c[a] || 0))[0] : "otros"; top = SC_CAT[k] || SC_CAT.otros; }
    L.push({ x, crit: A.crit.length, euros: A.euros || 0, top, venc: A.crit.filter((i) => i.tipo === "plazo" && i.dias < 0).length });
  }
  return L.sort((a, b) => b.crit - a.crit || b.euros - a.euros);
}
// Muestra diaria de la North Star (una por día; la del día se reemplaza)
function scNSApuntar(D, f, ns) {
  if (!ns || ns.pct == null) return false;
  D.northStar = Array.isArray(D.northStar) ? D.northStar : [];
  const i = D.northStar.findIndex((m) => m.f === f), m = { f, al: ns.al, n: ns.n };
  if (i >= 0) { if (D.northStar[i].al === m.al && D.northStar[i].n === m.n) return false; D.northStar[i] = m; } else D.northStar.push(m);
  D.northStar.sort((a, b) => a.f.localeCompare(b.f)); if (D.northStar.length > 180) D.northStar = D.northStar.slice(-180);
  return true;
}

// ── Vista ──
const scAcc = (x) => rdAccionesExp(x);
function scFondos(x) { let R = null; try { R = calcular(x); } catch (e) {} return fondos(x, R); }
function scSpark(H) {
  const P = H.filter((m) => m.n).slice(-60); if (P.length < 2) return "";
  const w = 220, h = 44, xs = (i) => Math.round((i / (P.length - 1)) * w), ys = (m) => Math.round(h - 4 - (m.al / m.n) * (h - 8));
  return `<svg class="sc-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Evolución de los últimos ${P.length} días"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${P.map((m, i) => `${xs(i)},${ys(m)}`).join(" ")}"/></svg>`;
}
function scQuienHTML(cls = "") {
  const D = despachoCfg(), yo = scYo();
  const opts = D.abogados.map((a) => `<option value="${esc(a.id)}" ${a.id === yo.id ? "selected" : ""}>${esc(a.nombre)} · ${scPerfilN(scPerfil(a))}</option>`).join("");
  // En la barra lateral: una fila (avatar, nombre corto y perfil) con el selector nativo invisible encima, para no cortar el nombre
  if (/sc-side/.test(cls)) { const corto = String(yo.nombre || "").split(/\s+/).slice(0, 2).join(" "); return `<label class="sc-quien ${cls}" title="Cambiar quién usa este equipo">${avatar(yo.id)}<span class="sc-q-t"><b>${esc(corto)}</b><small>${esc(scPerfilN(scPerfil(yo)))} · cambiar</small></span><select class="sc-over" data-sc-yo="1" aria-label="Quién usa este equipo">${opts}</select></label>`; }
  return `<label class="sc-quien ${cls}"><span class="sc-quien-k">Soy</span>${avatar(yo.id)}<select data-sc-yo="1" aria-label="Quién usa este equipo">${D.abogados.map((a) => `<option value="${esc(a.id)}" ${a.id === yo.id ? "selected" : ""}>${esc(a.nombre)} · ${scPerfilN(scPerfil(a))}</option>`).join("")}</select></label>`;
}
// Barra lateral, grupo «Despacho»: panel del socio (solo perfil socio) y quién soy
function scSideItem() {
  const D = despachoCfg(); let h = "";
  if (scEsSocio()) { let ns = null; try { ns = scNorthStar(DB.expedientes || [], scAcc, rdActivo); } catch (e) {} h += `<button class="sitem" data-sc="abrir" aria-current="${ui.vista === "socio"}"><span class="ic">${SC_ICO}</span><span class="t"><b>Panel del despacho</b></span>${ns && ns.pct != null ? `<span class="cnt" title="Expedientes al día">${ns.pct} %</span>` : ""}</button>`; }
  if (D.abogados.length > 1) h += scQuienHTML("sc-side");
  return h;
}
function scKpiN(k, v, s, cls = "", ds = "") { return `<${ds ? "button" : "div"} class="kpi ${cls}" ${ds}><div class="k">${k}</div><b>${v}</b>${s ? `<small>${s}</small>` : ""}</${ds ? "button" : "div"}>`; }
function scPanelHTML() {
  const xs = DB.expedientes || [], h = hoy(), D = despachoCfg();
  const act = xs.filter(rdActivo);
  const ns = scNorthStar(xs, scAcc, rdActivo);
  const A = radar({});
  const din = scDinero(xs.filter((x) => rdActivo(x) || x.fase === "cerrado"), scFondos);
  const carga = scCarga(xs, D.abogados, scAcc, rdActivo, h);
  const riesgo = scRiesgo(xs, scAcc, rdActivo, (x) => rdExp(x, h).cat), nCrit = riesgo.filter((r) => r.crit).length, nEur = riesgo.length - nCrit;
  const motivos = scMotivos([...A.bloqueos, ...A.parados]);
  const fases = scFasesLentas(xs, h, FASES_EXP, rdActivo);
  const mes = h.slice(0, 7), nuevos = act.filter((x) => String(x.despacho?.alta || x.creado || "").slice(0, 7) === mes).length;
  const archivAnio = xs.filter((x) => x.fase === "cerrado" && (x.bitacora || []).some((b) => b.tipo === "fase" && /→\s*Archivado\s*$/.test(b.texto || "") && String(b.t).slice(0, 4) === h.slice(0, 4))).length;
  const pctCls = ns.pct == null ? "" : ns.pct >= 80 ? "ok" : ns.pct >= 60 ? "warn" : "bad";
  const hero = `<div class="card sc-ns ${pctCls}"><div class="sc-ns-n"><span class="k">Expedientes al día</span><b class="num">${ns.pct == null ? "—" : ns.pct + " %"}</b><small>${ns.n ? `${ns.al} de ${plural(ns.n, "expediente activo", "expedientes activos")} sin acciones críticas` : "Sin expedientes activos"}</small></div><div class="sc-ns-t">${scSpark(D.northStar || [])}<p class="caption">«Al día» quiere decir sin plazos vencidos, sin bloqueos graves y sin tareas atrasadas: lo mismo que la línea de estado de cada expediente. Es la medida que el despacho quiere subir.</p></div></div>`;
  const kpis = `<div class="kpis sc-kpis">${scKpiN("Activos", act.length, `${plural(nuevos, "encargo nuevo", "encargos nuevos")} este mes · ${plural(archivAnio, "archivado", "archivados")} este año`)}${scKpiN("Bloqueados", A.kpis.expBloqueados, "expedientes esperando a alguien", A.kpis.expBloqueados ? "warn" : "", 'data-act="rdMiDia" data-rdf="bloqueos"')}${scKpiN("Con acciones críticas", nCrit, nEur ? `y ${plural(nEur, "expediente")} con dinero en juego` : "plazos vencidos, bloqueos graves o tareas atrasadas", nCrit ? "bad" : "")}${scKpiN("Por facturar", eur0(din.porFacturar), `${plural(din.nPorFacturar, "expediente")} · IVA incl.`, din.porFacturar ? "gold" : "")}${scKpiN("Pendiente de cobro", eur0(din.pendCobro), "minutas emitidas sin aplicar", din.pendCobro ? "warn" : "")}</div>`;
  const tCarga = `<div class="card sc-card">${cardH("Equipo", "Carga por persona")}<div class="sc-tw"><table class="grid-t sc-t"><thead><tr><th>Persona</th><th class="n">Activos</th><th class="n">Al día</th><th class="n">Críticos</th><th class="n">Vencidos</th><th class="n">Semana</th><th class="n">Tareas</th><th class="n">Horas 30 d</th></tr></thead><tbody>${carga.map((r) => `<tr ${r.id !== "none" ? `data-sc="verDe" data-id="${esc(r.id)}"` : ""}><td><span class="sc-p">${r.id === "none" ? `<span class="av none">–</span>` : avatar(r.id)}<span><b>${esc(r.nombre)}</b>${r.sobrecarga ? `<span class="chip warn sc-chip">Sobrecarga</span>` : r.id !== "none" ? `<small>${scPerfilN(scPerfil(abogado(r.id)))}</small>` : ""}</span></span></td><td class="n">${r.activos}</td><td class="n">${r.activos ? Math.round((r.alDia / r.activos) * 100) + " %" : "—"}</td><td class="n ${r.criticos ? "sc-bad" : ""}">${r.criticos}</td><td class="n ${r.vencidos ? "sc-bad" : ""}">${r.vencidos}</td><td class="n">${r.semana}</td><td class="n">${r.tareas}</td><td class="n">${r.min30 ? grp(r.min30 / 60, 1) : "—"}</td></tr>`).join("")}</tbody></table></div><p class="caption sc-foot">Pulsa una persona para ver su Mi día. «Sobrecarga»: un 40 % más de expedientes que la media del equipo, o tres o más con acciones críticas.</p></div>`;
  const kv = (k, v, cls = "") => `<span>${k}</span><span class="${cls}">${v}</span>`;
  const tDin = `<div class="card sc-card">${cardH("Dinero", "Honorarios y fondos de clientes")}<div class="kv">${kv("Presupuestado en expedientes activos", eur0(din.presup))}${kv("Facturado (minutas emitidas)", eur0(din.facturado))}${kv("Cobrado (honorarios aplicados)", eur0(din.cobrado))}${kv("Por facturar", eur0(din.porFacturar), "b")}${kv("Pendiente de cobro", eur0(din.pendCobro), din.pendCobro ? "b" : "")}${kv("Provisiones en cuenta de clientes", eur0(din.provisiones))}${din.adelantado ? kv("Adelantado por el despacho", eur0(din.adelantado), "sc-bad") : ""}${din.sinPresup ? kv("Expedientes sin presupuesto", din.sinPresup, "sc-warn") : ""}</div><p class="caption sc-foot">Importes con IVA, del libro de fondos de cada expediente (Encargo y honorarios › Honorarios y fondos). «Minuta emitida» separa lo facturado de lo cobrado. <button class="link" data-tmp="rent">Rentabilidad ›</button></p></div>`;
  const tRiesgo = `<div class="card sc-card">${cardH("Riesgo", "Expedientes que necesitan atención")}${riesgo.length ? `<div class="rd-list">${riesgo.slice(0, ui.scRiesgoTodo ? 100 : 8).map((r) => `<div class="rd-row ${r.crit ? "bad" : "warn"}"><i class="rd-dot" aria-hidden="true"></i><button class="rd-main" data-act="rdIr" data-id="${esc(r.x.id)}" data-sec="resumen"><span class="rd-t">${esc(r.top)}</span><span class="rd-d"><span class="rd-exp">${r.x.despacho?.ref ? `<span class="mono">${esc(r.x.despacho.ref)}</span>` : ""}${esc(nombreExp(r.x))}</span>${r.crit ? `<span class="rd-det">${plural(r.crit, "acción crítica", "acciones críticas")}${r.venc ? ` · ${plural(r.venc, "plazo vencido", "plazos vencidos")}` : ""}</span>` : ""}${r.euros > 0 ? `<span class="rd-eur">${esc(eur0(r.euros))} en juego</span>` : ""}</span></button><span class="rd-days"></span><span class="rd-av">${avatar(r.x.responsable)}</span><span></span></div>`).join("")}${riesgo.length > 8 && !ui.scRiesgoTodo ? `<button class="rd-more" data-sc="riesgoTodo">Ver ${riesgo.length - 8} más</button>` : ""}</div>` : `<div class="rd-ok">${RD_ICO.ok}<span>Ningún expediente con acciones críticas ni dinero en juego.</span></div>`}</div>`;
  const maxM = Math.max(1, ...motivos.map((m) => m.exps));
  const tMot = `<div class="card sc-card">${cardH("Bloqueos", "Motivos más frecuentes")}${motivos.length ? `<div class="sc-bars">${motivos.slice(0, 8).map((m) => `<div class="sc-bar"><span class="sc-bar-t">${esc(m.motivo)}</span><span class="sc-bar-b"><i style="width:${Math.round((m.exps / maxM) * 100)}%"></i></span><span class="sc-bar-n num">${plural(m.exps, "exp.", "exp.")}</span></div>`).join("")}</div><p class="caption sc-foot"><button class="link" data-act="rdMiDia" data-rdf="bloqueos">Ver quién debe qué en Mi día ›</button></p>` : `<div class="rd-ok">${RD_ICO.ok}<span>Nadie tiene nada pendiente con el despacho.</span></div>`}</div>`;
  const tFases = `<div class="card sc-card sc-wide">${cardH("Procesos", "Tiempo por fase")}<div class="sc-tw"><table class="grid-t sc-t sc-fases"><thead><tr><th>Fase</th><th class="n">Media del despacho</th><th class="n">Ahora en la fase</th><th class="n">Llevan de media</th><th>Más lentos de lo normal</th></tr></thead><tbody>${fases.map((f) => `<tr><td><span class="fase f${faseI(f.k)}">${esc(f.n)}</span></td><td class="n">${f.media != null ? plural(f.media, "día") : "—"}<small>${f.nHist ? plural(f.nHist, "caso") : "sin histórico"}</small></td><td class="n">${f.abiertos.length}</td><td class="n">${f.mediaAbiertos != null ? plural(f.mediaAbiertos, "día") : "—"}</td><td>${f.lentos.length ? `<span class="sc-lentos">${f.lentos.slice(0, 4).map((l) => `<button class="chip-r ${l.dias > f.umbral * 1.5 ? "warn" : ""}" data-open="${esc(l.x.id)}">${esc(l.x.despacho?.ref || nombreExp(l.x))} · ${l.dias} d</button>`).join("")}${f.lentos.length > 4 ? `<span class="caption">y ${f.lentos.length - 4} más</span>` : ""}</span><small>más de ${plural(f.umbral, "día")}${f.propia ? "" : " (referencia orientativa)"}</small>` : `<span class="caption">Ninguno${f.abiertos.length ? ` por encima de ${plural(f.umbral, "día")}` : ""}</span>`}</td></tr>`).join("")}</tbody></table></div><p class="caption sc-foot">Días entre cambios de fase anotados en la bitácora de cada expediente. Con tres o más casos cerrados en una fase se usa la media propia del despacho (×1,5) para marcar los lentos; mientras tanto, una referencia orientativa.</p></div>`;
  return `${hero}${kpis}<div class="sc-wide">${tCarga}</div><div class="grid g2 sc-grid">${tRiesgo}<div class="sc-col">${tDin}${tMot}</div></div>${tFases}`;
}
function vSocio() {
  const D = despachoCfg(), tab = ui.scTab === "actividad" ? "actividad" : "panel";
  const fecha = fechaHoyLarga();
  return `<div class="topbar"><button class="tbtn back-m" data-act="home">${I.back}Expedientes</button><span class="crumbs"><b>Panel del despacho</b></span><span class="mid">Despacho</span><span class="tbtns">${typeof ayBotonHTML === "function" ? ayBotonHTML() : ""}</span></div>
  <div class="page wide view sc">
    <p class="greet">${esc(fecha.charAt(0).toUpperCase() + fecha.slice(1))} · ${esc(D.nombre || "Despacho")}</p>
    <div class="headrow"><h1 class="ltitle">Despacho</h1><div class="headacts">${D.abogados.length > 1 ? scQuienHTML() : ""}</div></div>
    <div class="seg sc-tabs" role="group" aria-label="Vista del panel"><button data-sc="tab" data-tab="panel" aria-pressed="${tab === "panel"}">Panel</button><button data-sc="tab" data-tab="actividad" aria-pressed="${tab === "actividad"}">Actividad</button></div>
    ${tab === "panel" ? scPanelHTML() : auDespachoHTML()}
    ${tab === "panel" ? `<p class="foot-note">Todo se calcula en este equipo con los datos de los expedientes: plazos, diagnóstico, documentación, bitácora, tiempos y libro de fondos. Los perfiles (socio, abogado, administrativo) ordenan lo que ve cada uno; no son permisos: cualquiera que abra {{MARCA}} en este equipo puede cambiar de usuario. Para proteger los datos, usa el bloqueo con contraseña en Ajustes.</p>` : ""}
  </div>`;
}
// Ajustes › Equipo: perfil de cada persona (el manejador genérico de [data-abo] de ui.js lo guarda)
function scPerfilesHTML() {
  const D = despachoCfg();
  return `<div class="sectitle">Perfiles</div><div class="group">${D.abogados.map((a) => `<div class="field sc-pf"><label for="sc-pf-${esc(a.id)}">${esc(a.nombre)}</label><select id="sc-pf-${esc(a.id)}" data-abo="${esc(a.id)}" data-k="perfil">${SC_PERFILES.map(([k, n]) => `<option value="${k}" ${scPerfil(a) === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>`).join("")}</div><p class="group-foot">El socio ve el panel del despacho (carga, riesgo, dinero, fases y actividad); el abogado entra por Mi día con lo suyo; el administrativo, por lo que se espera de terceros. Ordenan la vista; no son permisos.</p>`;
}
function scAbrir() {
  try { const D = despachoCfg(); if (scNSApuntar(D, hoy(), scNorthStar(DB.expedientes || [], scAcc, rdActivo))) guardar(); } catch (e) { console.error(e); }
  go({ vista: "socio", sheet: null });
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest("[data-sc]") : null; if (!b) return;
    const app = document.getElementById("app"); if (!app || !app.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    const d = b.dataset;
    if (d.sc === "abrir") { scAbrir(); return; }
    if (d.sc === "tab") { ui.scTab = d.tab; ui.aumax = 100; render(); return; }
    if (d.sc === "riesgoTodo") { ui.scRiesgoTodo = true; render(); return; }
    if (d.sc === "verDe") { ui.rdx = {}; go({ vista: "radar", sheet: null, rdr: d.id, rdf: null }); return; }
  }, true);
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.scYo) { e.stopPropagation(); const D = despachoCfg(); D.yo = t.value; guardar(); scAplicarPerfil(false); if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); render(); toast(`Ahora eres ${abogado(t.value)?.nombre || ""}`); return; }
    // «Quién usa este equipo» de Ajustes (lo guarda ui.js) y perfil de una persona: se reajusta la entrada de cada perfil
    if (t.dataset.cfg === "yo" || (t.dataset.abo && t.dataset.k === "perfil")) setTimeout(() => { try { scAplicarPerfil(false); } catch (er) {} }, 0);
  }, true);
}
