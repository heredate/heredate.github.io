// ───────────────────── {{MARCA}} · Mi día: radar de bloqueos (Piloto 8, prefijo rd/RD_) ─────────────────────
// Lo que el titular del despacho abre cada mañana: qué vence, qué frena cada expediente y quién lo debe,
// con el siguiente escrito o recordatorio listo para un clic.
// Fuentes (todas ya existentes): tramitesExp + vence (plazos), diagnostico (riesgos de gravedad 3 y euros en juego),
// docsNecesarios frente a x.despacho.docs (familia), bitácora (parados y trámites en curso ante terceros) y, si existen,
// x.solicitudes / x.recordatorios (módulo de terceros), leídos a la defensiva: si faltan, cuentan como vacíos.
// API: radar(opts) → datos · vRadar() → vista (ui.vista === "radar") · rdResumenCartera() → franja para la Cartera ·
//      rdBadge() → número para la barra lateral · rdSideItem() → entrada «Mi día» de la barra lateral ·
//      rdBotonTopbar() → botón para la barra superior en móvil · rdIr(dataset) → abrir expediente + pestaña + hoja ·
//      rdRadarInvalidar() → vaciar la caché.
// Eventos propios (escucha en captura sobre document, como paleta.js): data-act="rdIr" | "rdAcc" | "rdMiDia",
// data-rdf (filtro por tarjeta), data-rdr (filtro por responsable), data-rdx (ver todos en una sección).
const RD_ = { cache: new Map(), ver: 0, memo: null, ms: 0 };
const RD_SV = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const RD_ICO = {
  dia: RD_SV('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l5.5-5.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>'),
  familia: RD_SV('<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.7-3.3 3.1-5 6-5s5.3 1.7 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.6 14.4c2.3.2 3.9 1.8 4.4 4.8"/>'),
  heredero: RD_SV('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.9-3.8 3.6-5.8 7-5.8s6.1 2 7 5.8"/>'),
  banco: RD_SV('<path d="M3.5 9.5L12 4.5l8.5 5"/><path d="M5.5 10v7.5M9.8 10v7.5M14.2 10v7.5M18.5 10v7.5"/><path d="M3.5 20h17"/>'),
  notaria: RD_SV('<path d="M7 3.5h7.5L18 7v13.5H7z"/><path d="M14.5 3.5V7H18"/><path d="M9.5 16.5c1.2-1.6 2-1.6 2.4-.3.4 1.3 1.2 1.3 2.6-.4"/><path d="M9.5 11h5"/>'),
  registro: RD_SV('<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5"/><path d="M9 7.5h6"/>'),
  hacienda: RD_SV('<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>'),
  ayuntamiento: RD_SV('<path d="M4 20h16M5.5 20v-8.5h13V20"/><path d="M4 11.5L12 6l8 5.5"/><path d="M12 6V3h3"/><path d="M9 20v-4.5h6V20"/>'),
  despacho: RD_SV('<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2"/><path d="M3.5 12.5h17"/>'),
  otro: RD_SV('<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10.5 20.5v-3h3v3"/>'),
  ok: RD_SV('<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.2l2.5 2.5 4.9-5"/>'),
  pausa: RD_SV('<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>'),
};
// Orden y nombre de cada tipo de «quién lo debe»
const RD_QUIEN = [["familia", "La familia"], ["heredero", "Herederos"], ["banco", "Bancos"], ["notaria", "Notarías"], ["registro", "Registros"], ["hacienda", "Hacienda"], ["ayuntamiento", "Ayuntamientos"], ["otro", "Otros organismos"], ["despacho", "El despacho"]];
const RD_TERCEROS = ["banco", "notaria", "registro", "hacienda", "ayuntamiento"];
const RD_LIMITE = 8; // filas visibles por sección antes de «Ver todos»

const rdTipo = (q) => (String(q || "").startsWith("heredero:") ? "heredero" : q || "otro");
const rdFecha = (v) => { const s = v && typeof v === "object" ? v.fecha || v.t || "" : String(v || ""); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ""; };
const rdDias = (a, b) => (a && b ? dias(a, b) : null);
const rdPl = (n, s, p) => `${n} ${n === 1 ? s : p || s + "s"}`;
const rdNombreExp = (x) => (typeof nombreExp === "function" ? nombreExp(x) : x.despacho?.cliente || x.nombre || "Herencia sin nombre");
function rdQuienDe(s) {
  const t = String(s || "").toLowerCase();
  if (/notar/.test(t)) return "notaria";
  if (/registro de la propiedad|registro mercantil|registro de bienes/.test(t)) return "registro";
  if (/banco|bancari|entidad/.test(t)) return "banco";
  if (/ayuntamiento/.test(t)) return "ayuntamiento";
  if (/hacienda|agencia tributaria|aeat|tributari/.test(t)) return "hacienda";
  if (/abogad|despacho/.test(t)) return "despacho";
  if (/familia|herederos?\b|viud|beneficiari|apoderad/.test(t)) return "familia";
  return "otro";
}
function rdActivo(x) {
  if (!x || x.fase === "cerrado" || x.archivado) return false;
  if (x.escenarioDe || /-E$/.test(String(x.despacho?.ref || ""))) return false; // escenarios de simulación: no duplican plazos
  return true;
}
function rdDocOk(x, id) { try { return typeof docsDisponibles !== "function" || docsDisponibles(x).some(([k]) => k === id); } catch (e) { return false; } }
function rdUltima(x) {
  const c = [];
  for (const b of x.bitacora || []) if (b && b.t) c.push({ f: rdFecha(b.t), texto: b.texto || "" });
  for (const s of Array.isArray(x.solicitudes) ? x.solicitudes : []) { if (!s) continue; for (const f of [s.enviada, s.recibida, ...(Array.isArray(s.recordatorios) ? s.recordatorios : [])]) if (rdFecha(f)) c.push({ f: rdFecha(f), texto: "" }); }
  for (const r of Array.isArray(x.recordatorios) ? x.recordatorios : []) if (rdFecha(r)) c.push({ f: rdFecha(r), texto: "" });
  if (x.familia?.recibido) c.push({ f: rdFecha(x.familia.recibido), texto: "Datos de la familia recibidos" });
  const ok = c.filter((q) => q.f).sort((a, b) => b.f.localeCompare(a.f));
  if (ok.length) { const top = ok[0]; const txt = top.texto || (ok.find((q) => q.f === top.f && q.texto) || {}).texto || ""; return { f: top.f, texto: txt }; }
  const f = rdFecha(x.despacho?.alta) || rdFecha(x.creado);
  return f ? { f, texto: "" } : null;
}
function rdAccEnlace(x, en, texto) {
  const ds = { act: "rdIr", id: x.id };
  if (!en) return { texto, dataset: { ...ds, sec: "diagnostico" } };
  if (en.tramite) return { texto: "Abrir trámite", dataset: { ...ds, sec: "tramites", topen: en.tramite } };
  if (en.doc && rdDocOk(x, en.doc)) return { texto: typeof DOC_TIT === "object" && DOC_TIT[en.doc] ? DOC_TIT[en.doc] : "Preparar escrito", dataset: { ...ds, sec: "documentos", doc: en.doc } };
  if (en.persona) return { texto, dataset: { ...ds, sec: "herencia", editp: en.persona } };
  if (en.bien) return { texto, dataset: { ...ds, sec: "herencia", editb: en.bien } };
  if (en.sec) return { texto, dataset: { ...ds, sec: en.sec, ...(en.sub ? { sub: en.sub } : {}), ...(en.tv ? { tv: en.tv } : {}) } };
  return { texto, dataset: { ...ds, sec: "diagnostico" } };
}
function rdAccTramite(x, t) {
  const a = t.accion;
  if (a && a.tipo === "doc" && rdDocOk(x, a.id)) return { texto: a.texto, dataset: { act: "rdIr", id: x.id, sec: "documentos", doc: a.id } };
  return { texto: "Abrir trámite", dataset: { act: "rdIr", id: x.id, sec: "tramites", topen: t.id } };
}

// ── Cálculo por expediente (con caché) ──
// (Antes «rdClave»: ui.js declara otra función con ese nombre para el foco y la sustituía, así que la caché no se renovaba nunca.)
function rdClaveExp(x, h) { let n = 0; try { n = JSON.stringify(x).length; } catch (e) {} return `${h}|${RD_.ver}|${n}|${(x.bitacora || []).length}|${x.fase || ""}|${x.responsable || ""}`; }
function rdExp(x, h) {
  const k = rdClaveExp(x, h), c = RD_.cache.get(x.id);
  if (c && c.k === k) return c.v;
  const v = rdCalcular(x, h);
  RD_.cache.set(x.id, { k, v });
  return v;
}
function rdCalcular(x, h) {
  const out = { items: [], bloq: [], parado: null, euros: 0, cat: { recargo: 0, bonif: 0, exceso: 0, otros: 0 } };
  const base = { xId: x.id, expNombre: rdNombreExp(x), ref: x.despacho?.ref || "", responsable: x.responsable || "" };
  let R = null; try { R = calcular(x); } catch (e) { R = null; }
  let T = []; try { T = x.fecha ? tramitesExp(x, R) : []; } catch (e) { T = []; }

  // 1 · Plazos: vencidos, hoy y próximos 7 días
  const porT = {};
  for (const t of T) {
    if (cerrado(t) || !t.limite || t.informativo) continue;
    const q = dias(h, t.limite); if (q > 7) continue;
    if (t.id === "prorroga" && q < 0) continue; // ventana cerrada: ya no es accionable (el plazo del impuesto sigue en la lista)
    const org = t.organismo || t.quien || "";
    const it = { ...base, k: `t:${x.id}:${t.id}`, tipo: "plazo", titulo: t.titulo, detalle: (t.condicional ? t.condicional + (org ? " · " : "") : t.recomendado ? "Plazo recomendado" + (org ? " · " : "") : "") + org, dias: q, fecha: t.limite, nivel: q < 0 && (t.recomendado || t.condicional) ? "warn" : q <= 0 ? "bad" : "warn", quien: rdQuienDe(org), euros: 0, accion: rdAccTramite(x, t) };
    porT[t.id] = it; out.items.push(it);
  }

  // 1 bis · Tareas propias del despacho (tareas.js): las que vencen en siete días o menos, con su responsable
  if (typeof tkRadarItems === "function") { try { out.items.push(...tkRadarItems(x, h, base)); } catch (e) {} }

  // 2 · Diagnóstico: riesgos graves (sin duplicar el plazo que ya está arriba) y euros en juego
  let D = null; try { D = typeof diagnostico === "function" ? diagnostico(x, R) : null; } catch (e) { D = null; }
  const alta = rdFecha(x.despacho?.alta) || rdFecha(x.creado) || h;
  for (const d of (D && D.items) || []) {
    const eu = Number(d.euros) > 0 ? Number(d.euros) : 0;
    if (d.tipo === "riesgo" && eu && d.gravedad >= 2) { out.euros += eu; out.cat[rdCat(d)] += eu; } // un concepto por cifra (P10, H21); no las condiciones a años vista (gravedad 1)
    if (d.tipo === "riesgo" && d.gravedad === 3) {
      const ya = d.enlace?.tramite && porT[d.enlace.tramite];
      if (ya) { ya.euros = eu || ya.euros; ya.nivel = "bad"; ya.norma = d.norma || ""; continue; }
      out.items.push({ ...base, k: `d:${x.id}:${d.id}`, tipo: "riesgo", titulo: d.titulo, detalle: d.accion || d.detalle || "", dias: null, nivel: "bad", quien: "despacho", euros: eu, norma: d.norma || "", accion: rdAccEnlace(x, d.enlace, "Revisar") });
      continue;
    }
    if (d.tipo === "dato" && d.enlace?.persona && d.gravedad >= 2) {
      const p = (x.personas || []).find((q) => q.id === d.enlace.persona);
      const nom = p?.nombre || "Heredero";
      out.bloq.push({ ...base, k: `p:${x.id}:${d.id}`, tipo: "dato", quien: "heredero:" + nom, que: d.titulo, titulo: d.titulo, detalle: d.detalle || "", dias: Math.max(0, rdDias(alta, h) || 0), nivel: "warn", accion: rdAccEnlace(x, d.enlace, "Completar") });
      continue;
    }
    if (d.tipo === "dato" && d.gravedad === 3) out.bloq.push({ ...base, k: `g:${x.id}:${d.id}`, tipo: "dato", quien: "despacho", que: d.titulo, titulo: d.titulo, detalle: d.accion || d.detalle || "", dias: Math.max(0, rdDias(alta, h) || 0), nivel: "warn", accion: rdAccEnlace(x, d.enlace, "Completar") });
  }

  // 3 · Familia: documentos sin recibir (un solo bloqueo) y cuestionario sin devolver
  let nec = []; try { nec = typeof docsNecesarios === "function" ? docsNecesarios(x) : []; } catch (e) { nec = []; }
  const rec = x.despacho?.docs || {};
  const falta = nec.filter(([id]) => !rec[id]);
  if (falta.length) {
    const RS = (Array.isArray(x.recordatorios) ? x.recordatorios : []).map(rdFecha).filter(Boolean).sort();
    const ult = RS[RS.length - 1] || "";
    const dd = Math.max(0, rdDias(ult || alta, h) || 0);
    const lista = falta[0][1] + (falta.length > 1 ? ` y ${falta.length - 1} más` : "");
    out.bloq.push({ ...base, k: `f:${x.id}`, tipo: "docs", quien: "familia", que: `${falta.length === 1 ? "Falta" : "Faltan"} ${rdPl(falta.length, "documento")}`, titulo: `${falta.length === 1 ? "Falta" : "Faltan"} ${rdPl(falta.length, "documento")}`, detalle: (ult ? `Último recordatorio hace ${rdPl(dd, "día")} · ` : `Sin recordatorios · `) + lista, dias: dd, nivel: dd >= 30 ? "bad" : dd >= 14 ? "warn" : "info", docs: falta.map(([id]) => id), accion: { texto: ult ? "Recordar de nuevo" : "Recordar", dataset: { act: "rdAcc", k: "familia", id: x.id } } });
  }
  if (x.familiaEnviado && !x.familia && (typeof FAMILIA_CUESTIONARIO === "undefined" || FAMILIA_CUESTIONARIO)) {
    const dd = Math.max(0, rdDias(rdFecha(x.familiaEnviado), h) || 0);
    out.bloq.push({ ...base, k: `c:${x.id}`, tipo: "cuestionario", quien: "familia", que: "Cuestionario sin devolver", titulo: "Cuestionario de datos sin devolver", detalle: `Enviado el ${fechaCorta(rdFecha(x.familiaEnviado))}`, dias: dd, nivel: dd >= 14 ? "warn" : "info", accion: { texto: "Reenviar enlace", dataset: { act: "rdIr", id: x.id, sec: "resumen", sheet: "familia" } } });
  }

  // 4 · Solicitudes a terceros (módulo de terceros; vacío si no existe)
  for (const s of Array.isArray(x.solicitudes) ? x.solicitudes : []) {
    if (!s || s.recibida || s.estado === "recibida") continue;
    const tp = String(s.tercero?.tipo || "otro"), nom = s.tercero?.nombre || ({ banco: "Banco", notaria: "Notaría", registro: "Registro", hacienda: "Hacienda", ayuntamiento: "Ayuntamiento", familia: "Familia" }[tp] || "Tercero");
    const quien = tp === "heredero" ? "heredero:" + nom : ["familia", ...RD_TERCEROS].includes(tp) ? tp : "otro";
    const env = rdFecha(s.enviada), recs = (Array.isArray(s.recordatorios) ? s.recordatorios : []).map(rdFecha).filter(Boolean).sort();
    const ult = recs[recs.length - 1] || env;
    const dT = env ? Math.max(0, dias(env, h)) : null, dU = ult ? Math.max(0, dias(ult, h)) : null;
    out.bloq.push({ ...base, k: `s:${x.id}:${s.id}`, tipo: "solicitud", quien, que: s.que || "Solicitud", titulo: `${nom} · ${dT != null ? rdPl(dT, "día") + " sin respuesta" : "sin respuesta"}`, detalle: `${s.que || "Solicitud"}${recs.length ? ` · ${rdPl(recs.length, "recordatorio")}, el último hace ${rdPl(dU, "día")}` : env ? ` · enviada el ${fechaCorta(env)}` : ""}`, dias: dT, nivel: dU == null ? "info" : dU >= 30 ? "bad" : dU >= 14 ? "warn" : "info", solId: s.id, accion: { texto: recs.length ? "Reclamar de nuevo" : "Reclamar", dataset: { act: "rdAcc", k: "sol", id: x.id, sol: String(s.id) } } });
  }

  // 5 · Trámites en curso ante un tercero desde hace una semana o más (fecha tomada de la bitácora)
  for (const t of T) {
    if (t.st !== "curso" || porT[t.id]) continue;
    const q = rdQuienDe(t.organismo); if (!RD_TERCEROS.includes(q)) continue;
    const e = (x.bitacora || []).find((b) => b && b.texto === `${t.titulo}: en curso`); if (!e) continue;
    const dd = rdDias(rdFecha(e.t), h); if (dd == null || dd < 7) continue;
    out.bloq.push({ ...base, k: `c:${x.id}:${t.id}`, tipo: "curso", quien: q, que: t.titulo, titulo: `${t.organismo} · en curso hace ${rdPl(dd, "día")}`, detalle: t.titulo, dias: dd, nivel: dd >= 30 ? "bad" : dd >= 14 ? "warn" : "info", accion: { texto: "Abrir trámite", dataset: { act: "rdIr", id: x.id, sec: "tramites", topen: t.id } } });
  }

  // 6 · Parado: 30 días o más sin anotaciones ni contactos
  const u = rdUltima(x), dP = u ? rdDias(u.f, h) : null;
  if (dP != null && dP >= 30) out.parado = { ...base, k: `z:${x.id}`, tipo: "parado", x, titulo: `Sin actividad desde hace ${rdPl(dP, "día")}`, detalle: u.texto ? `Última anotación: ${u.texto}` : `Última fecha registrada: ${fechaCorta(u.f)}`, dias: dP, nivel: "info", quien: "despacho", accion: { texto: "Anotar", dataset: { act: "rdIr", id: x.id, sec: "despacho", sub: "actividad" } } };
  return out;
}

// ── Agregado de la cartera ──
function radar(opts = {}) {
  const h = opts.hoy || hoy(), resp = opts.responsable || null;
  const mk = `${h}|${resp || ""}`;
  if (RD_.memo && RD_.memo.k === mk) return RD_.memo.v;
  const act = (DB.expedientes || []).filter(rdActivo);
  const all = { items: [], bloq: [], parados: [], euros: 0, cat: { recargo: 0, bonif: 0, exceso: 0, otros: 0 } };
  for (const x of act) {
    let r; try { r = rdExp(x, h); } catch (e) { console.error(e); continue; }
    const xo = { x };
    all.items.push(...r.items.map((i) => ({ ...i, ...xo })));
    all.bloq.push(...r.bloq.map((i) => ({ ...i, ...xo })));
    if (r.parado) all.parados.push({ ...r.parado, ...xo });
    all.euros += r.euros; for (const c in all.cat) all.cat[c] += (r.cat && r.cat[c]) || 0;
  }
  const porResponsable = {};
  for (const i of [...all.items, ...all.bloq, ...all.parados]) { const k = i.responsable || "none"; porResponsable[k] = (porResponsable[k] || 0) + 1; }
  const ok = (i) => !resp || (i.responsable || "none") === resp;
  const items = all.items.filter(ok), bloqueos = all.bloq.filter(ok), parados = all.parados.filter(ok);
  const ordenDias = (a, b) => (a.dias == null ? -1e9 : a.dias) - (b.dias == null ? -1e9 : b.dias) || (b.euros || 0) - (a.euros || 0) || a.titulo.localeCompare(b.titulo, "es");
  const sevI = { bad: 0, warn: 1, info: 2 };
  const ordenHoy = (a, b) => (b.euros > 0) - (a.euros > 0) || (b.euros || 0) - (a.euros || 0) || sevI[a.nivel] - sevI[b.nivel] || ordenDias(a, b);
  const hoyL = items.filter((i) => i.dias == null || i.dias <= 0).sort(ordenHoy);
  const semana = items.filter((i) => i.dias != null && i.dias > 0).sort(ordenDias);
  const sev = { bad: 0, warn: 1, info: 2 };
  bloqueos.sort((a, b) => sev[a.nivel] - sev[b.nivel] || (b.dias || 0) - (a.dias || 0));
  parados.sort((a, b) => b.dias - a.dias);
  const eurosFiltrados = resp ? act.filter((x) => (x.responsable || "none") === resp).reduce((s, x) => s + (RD_.cache.get(x.id)?.v.euros || 0), 0) : all.euros;
  const catF = { recargo: 0, bonif: 0, exceso: 0, otros: 0 };
  if (resp) { for (const x of act.filter((q) => (q.responsable || "none") === resp)) { const c = RD_.cache.get(x.id)?.v.cat; if (c) for (const k in catF) catF[k] += c[k] || 0; } } else Object.assign(catF, all.cat);
  const vencP = items.filter((i) => i.tipo === "plazo" && i.dias != null && i.dias < 0);
  const v = {
    hoy: hoyL, semana, bloqueos, parados, porResponsable, n: act.length,
    // «Vencidos» = plazos superados (mismo concepto que la Cartera); los riesgos sin fecha no cuentan como vencidos (P10, H21)
    kpis: { vencidos: vencP.length, expVencidos: new Set(vencP.map((i) => i.xId)).size, recargos: Math.round(catF.recargo * 100) / 100, enJuegoCat: catF, estaSemana: items.filter((i) => i.dias != null && i.dias >= 0).length, bloqueados: bloqueos.length, parados: parados.length, enJuego: Math.round(eurosFiltrados * 100) / 100, expBloqueados: new Set(bloqueos.map((b) => b.xId)).size },
  };
  RD_.memo = { k: mk, v }; queueMicrotask(() => { RD_.memo = null; }); // válido durante un render
  return v;
}
function rdRadarInvalidar() { RD_.ver++; RD_.memo = null; RD_.cache.clear(); }
const rdBadge = () => { try { return radar().hoy.length; } catch (e) { return 0; } };

// ── Navegación en un clic: expediente + pestaña + hoja ──
function rdIr(d) {
  const id = d.id; if (!(DB.expedientes || []).some((x) => x.id === id)) { toast("El expediente ya no existe"); return; }
  let sheet = null, sec = d.sec || "resumen"; const extra = {};
  if (d.topen) { sheet = { tipo: "tramite", id: d.topen }; sec = d.sec || "tramites"; extra.tv = "lista"; }
  else if (d.doc) { sheet = { tipo: "doc", id: d.doc }; sec = d.sec || "documentos"; extra.dsub = "escritos"; }
  else if (d.editp) sheet = { tipo: "persona", id: d.editp };
  else if (d.editb) sheet = { tipo: "bien", id: d.editb };
  else if (d.sheet) sheet = { tipo: d.sheet };
  if (d.sub) extra.sub = d.sub;
  if (d.tv) extra.tv = d.tv;
  go({ vista: "exp", id, sec, sheet, ...extra });
}

// ── Recordatorio o reclamación listos para enviar (se copian y quedan anotados) ──
function rdTextoFamilia(x, falta) {
  const D = typeof despachoCfg === "function" ? despachoCfg() : {};
  const nom = x.despacho?.cliente ? " " + x.despacho.cliente.split(" ")[0] : "";
  return `Hola${nom}:\n\nTe escribimos por la herencia de ${x.nombre || "tu familiar"}${x.despacho?.ref ? ` (${x.despacho.ref})` : ""}. Para seguir avanzando aún nos faltan estos documentos:\n\n${falta.map(([, t, s]) => `· ${t}${s ? " (" + s + ")" : ""}`).join("\n")}\n\nPuedes enviarlos escaneados o en foto legible. Si alguno te cuesta conseguirlo, dínoslo y lo pedimos nosotros.\n\nUn saludo.${D.nombre ? "\n" + D.nombre : ""}`;
}
function rdTextoTercero(x, s) {
  const D = typeof despachoCfg === "function" ? despachoCfg() : {};
  const env = rdFecha(s.enviada);
  return `Asunto: ${s.que || "Solicitud"} · herencia de ${x.nombre || "[causante]"}${x.despacho?.ref ? " · ref. " + x.despacho.ref : ""}\n\nA la atención de ${s.tercero?.nombre || "[destinatario]"}:\n\n${env ? `El ${fechaLarga(env)} les solicitamos` : "Les solicitamos"} ${String(s.que || "la documentación indicada").replace(/^./, (c) => c.toLowerCase())} en relación con la herencia de ${gnTrat(gnCaus(x))}${x.nombre || "[causante]"}. A día de hoy no nos consta respuesta.\n\nLes rogamos que nos la faciliten a la mayor brevedad o nos indiquen qué necesitan para tramitarla.\n\nAtentamente,\n${D.nombre || "[despacho]"}`;
}
function rdAccion(d) {
  const x = (DB.expedientes || []).find((q) => q.id === d.id); if (!x) return;
  if (d.k === "familia") {
    const falta = docsNecesarios(x).filter(([id]) => !x.despacho?.docs?.[id]); if (!falta.length) return;
    copiar(rdTextoFamilia(x, falta));
    x.recordatorios = Array.isArray(x.recordatorios) ? x.recordatorios : [];
    x.recordatorios.push({ fecha: hoy(), canal: "copiado", docs: falta.map(([id]) => id) });
    anotar(x, `Recordatorio a la familia: ${rdPl(falta.length, "documento pendiente", "documentos pendientes")}`, "nota");
  } else if (d.k === "sol") {
    const s = (Array.isArray(x.solicitudes) ? x.solicitudes : []).find((q) => String(q.id) === d.sol); if (!s) return;
    copiar(rdTextoTercero(x, s));
    s.recordatorios = Array.isArray(s.recordatorios) ? s.recordatorios : [];
    s.recordatorios.push(hoy()); s.estado = "reclamada";
    anotar(x, `Reclamación a ${s.tercero?.nombre || "tercero"}: ${s.que || "solicitud"}`, "nota");
  } else return;
  guardar(); rdRadarInvalidar(); render();
}

// ── Piezas de la vista ──
function rdData(ds) { return Object.entries(ds || {}).map(([k, v]) => `data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${esc(String(v))}"`).join(" "); }
function rdDiasHTML(it) {
  const q = it.dias;
  if (it.tipo === "plazo" || it.tipo === "riesgo" || it.tipo === "tarea") {
    if (q == null) return `<span class="rd-days bad"><b>!</b><small>riesgo</small></span>`;
    if (q < 0) return `<span class="rd-days ${it.nivel}"><b class="num">${-q}</b><small>${-q === 1 ? "día tarde" : "días tarde"}</small></span>`;
    if (q === 0) return `<span class="rd-days bad"><b>Hoy</b><small>vence</small></span>`;
    return `<span class="rd-days warn"><b class="num">${q}</b><small>${q === 1 ? "día" : "días"}</small></span>`;
  }
  return q == null ? `<span class="rd-days"></span>` : `<span class="rd-days ${it.tipo === "parado" ? "mute" : it.nivel}"><b class="num">${q}</b><small>${q === 1 ? "día" : "días"}</small></span>`;
}
function rdSecDe(it) { return it.tipo === "plazo" || it.tipo === "tarea" ? "tramites" : it.tipo === "riesgo" ? "diagnostico" : it.tipo === "docs" ? "despacho" : "resumen"; }
function rdFila(it) {
  const a = it.accion, abrir = { act: "rdIr", id: it.xId, sec: rdSecDe(it), ...(it.tipo === "docs" ? { sub: "docs" } : {}) };
  const eu = it.euros > 0 ? `<span class="rd-eur">${esc(eur0(it.euros))} en juego</span>` : "";
  return `<div class="rd-row ${it.tipo === "parado" ? "mute" : it.nivel}">
    <i class="rd-dot" aria-hidden="true"></i>
    <button class="rd-main" ${rdData(abrir)} title="Abrir el expediente"><span class="rd-t">${esc(it.titulo)}</span><span class="rd-d"><span class="rd-exp">${it.ref ? `<span class="mono">${esc(it.ref)}</span>` : ""}${esc(it.expNombre)}</span>${it.detalle ? `<span class="rd-det">${esc(it.detalle)}</span>` : ""}${eu}</span></button>
    ${rdDiasHTML(it)}
    <span class="rd-av">${typeof avatar === "function" ? avatar(it.responsable) : ""}</span>
    ${a ? `<button class="rd-go" ${rdData(a.dataset)}>${esc(a.texto)}</button>` : `<span></span>`}
  </div>`;
}
function rdVacio(txt) { return `<div class="rd-ok">${RD_ICO.ok}<span>${txt}</span></div>`; }
function rdMas(key, total) { return total > RD_LIMITE && !(ui.rdx || {})[key] ? `<button class="rd-more" data-rdx="${key}">Ver ${total - RD_LIMITE} más</button>` : ""; }
const rdCorta = (key, L) => ((ui.rdx || {})[key] ? L : L.slice(0, RD_LIMITE));
function rdSeccion(key, titulo, sub, L, vacio) {
  return `<section class="rd-sec" aria-labelledby="rd-h-${key}"><div class="rd-sec-h"><h2 id="rd-h-${key}">${titulo}</h2>${L.length ? `<span class="num">${L.length}</span>` : ""}${sub ? `<small>${sub}</small>` : ""}</div>
    ${L.length ? `<div class="rd-list">${rdCorta(key, L).map(rdFila).join("")}${rdMas(key, L.length)}</div>` : rdVacio(vacio)}</section>`;
}
function rdSeccionTerceros(L) {
  const tot = L.length;
  let html = "";
  if (tot) {
    const vis = rdCorta("terceros", L);
    for (const [t, n] of RD_QUIEN) {
      const G = vis.filter((b) => rdTipo(b.quien) === t); if (!G.length) continue;
      const all = L.filter((b) => rdTipo(b.quien) === t).length;
      html += `<div class="rd-grp q-${t}"><span class="rd-gi">${RD_ICO[t]}</span><b>${n}</b><span class="num">${all}</span></div>${G.map(rdFila).join("")}`;
    }
    html = `<div class="rd-list">${html}${rdMas("terceros", tot)}</div>`;
  }
  return `<section class="rd-sec" aria-labelledby="rd-h-terceros"><div class="rd-sec-h"><h2 id="rd-h-terceros">Esperando a terceros</h2>${tot ? `<span class="num">${tot}</span>` : ""}<small>Quién lo debe y desde cuándo</small></div>${tot ? html : rdVacio("Nadie tiene nada pendiente con el despacho.")}</section>`;
}
function rdKpi(f, label, n, sub, cls) {
  const on = ui.rdf === f;
  return `<button class="rd-kpi ${n ? cls : "zero"}" data-rdf="${f}" aria-pressed="${on}"><span class="rd-kl">${label}</span><b class="num">${n}</b><small>${sub}</small></button>`;
}
function rdEquipo(A) {
  const D = typeof despachoCfg === "function" ? despachoCfg() : { abogados: [] };
  const P = A.porResponsable, L = D.abogados.filter((a) => P[a.id] || ui.rdr === a.id);
  if (D.abogados.length < 2 && !P.none) return "";
  const tot = Object.values(P).reduce((s, n) => s + n, 0);
  const chip = (id, nombre, n, av) => `<button class="rd-person" data-rdr="${esc(id)}" aria-pressed="${(ui.rdr || "") === id}">${av}<span>${esc(nombre)}</span><span class="n num">${n}</span></button>`;
  return `<div class="rd-team" role="group" aria-label="Filtrar por responsable">${chip("", "Todo el despacho", tot, `<span class="av none">${RD_ICO.despacho}</span>`)}${L.map((a) => chip(a.id, a.nombre.split(" ")[0], P[a.id] || 0, avatar(a.id))).join("")}${P.none ? chip("none", "Sin asignar", P.none, `<span class="av none">–</span>`) : ""}</div>`;
}
// Categoría de los euros de un riesgo del Diagnóstico: recargo, bonificación rogada, exceso de adjudicación u otros
function rdCat(d) {
  if (d.id === "excesos" || /exceso de adjudicaci/i.test(d.titulo || "")) return "exceso";
  const t = `${d.id || ""} ${d.titulo || ""}`;
  if (/recargo|fuera de plazo|vencid/i.test(t)) return "recargo";
  if (/bonific/i.test(t)) return "bonif";
  return "otros";
}
function rdLede(A) {
  const k = A.kpis, h = A.hoy.length, s = A.semana.length, partes = [];
  if (!A.n) return "Sin expedientes activos. Los plazos, bloqueos y recordatorios de la cartera aparecerán aquí cada mañana.";
  if (!h && !s && !k.bloqueados && !k.parados) return "Nada vence hoy ni esta semana y ningún expediente espera a nadie.";
  if (h) partes.push(`${rdPl(h, "asunto")} para hoy`);
  if (s) partes.push(`${rdPl(s, "plazo")} en los próximos siete días`);
  if (k.bloqueados) partes.push(`${rdPl(k.bloqueados, "bloqueo")} por terceros en ${rdPl(k.expBloqueados, "expediente")}`);
  let t = partes.length > 1 ? partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1] : partes[0] || "";
  t = t ? t.charAt(0).toUpperCase() + t.slice(1) + "." : "";
  if (k.enJuego > 0) { const c = k.enJuegoCat || {}, L = [c.recargo > 0.5 ? `${eur0(c.recargo)} de recargos por presentar tarde` : "", c.bonif > 0.5 ? `${eur0(c.bonif)} de bonificaciones que hay que pedir` : "", c.exceso > 0.5 ? `${eur0(c.exceso)} de AJD o TPO de excesos de adjudicación` : "", c.otros > 0.5 ? `${eur0(c.otros)} de otros riesgos` : ""].filter(Boolean); t += ` En juego: ${L.length > 1 ? L.slice(0, -1).join(", ") + " y " + L[L.length - 1] : L[0] || eur0(k.enJuego)}.`; }
  const p = A.hoy[0] || A.semana[0];
  if (p) t += ` Empieza por <b>${esc(p.titulo)}</b> en ${esc(p.ref || p.expNombre)}.`;
  return t;
}

function vRadar() {
  const t0 = performance.now();
  const D = typeof despachoCfg === "function" ? despachoCfg() : { abogados: [] };
  if (ui.rdr && ui.rdr !== "none" && !D.abogados.some((a) => a.id === ui.rdr)) ui.rdr = null;
  const A = radar({ responsable: ui.rdr || null }), k = A.kpis, f = ui.rdf || "";
  const yo = D.yo && abogado(D.yo); const nom = yo && !/^titular/i.test(yo.nombre) ? yo.nombre.split(" ")[0] : "";
  const fecha = fechaHoyLarga(); const fechaM = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const hoyF = f === "vencidos" ? A.hoy.filter((i) => i.dias == null || i.dias < 0) : f === "semana" ? A.hoy.filter((i) => i.dias === 0) : A.hoy;
  const ver = (s) => !f || f === s || (f === "vencidos" && s === "hoy") || (f === "semana" && (s === "hoy" || s === "semana"));
  const izq = [], der = [];
  if (ver("hoy") && (f !== "semana" || hoyF.length)) izq.push(rdSeccion("hoy", "Hoy y vencido", "Plazos superados, lo que vence hoy y riesgos graves", hoyF, "Nada vencido ni para hoy."));
  if (ver("semana")) izq.push(rdSeccion("semana", "Esta semana", "Próximos siete días", A.semana, "Ningún plazo en los próximos siete días."));
  if (ver("bloqueos")) der.push(rdSeccionTerceros(A.bloqueos));
  if (ver("parados")) der.push(rdSeccion("parados", "Parados", "Más de 30 días sin anotaciones ni contactos", A.parados, "Todos los expedientes se han movido este mes."));
  if (!f) { const act = rdActividad(ui.rdr); if (act) izq.push(act); }
  const una = !izq.length || !der.length;
  const body = `<div class="rd-cols ${una ? "una" : ""}">${izq.length ? `<div class="rd-col">${izq.join("")}</div>` : ""}${der.length ? `<div class="rd-col">${der.join("")}</div>` : ""}</div>`;
  const html = `<div class="topbar"><button class="tbtn back-m" data-act="home">${I.back}Expedientes</button><span class="crumbs"><b>Mi día</b></span><span class="mid">Mi día</span><span class="tbtns">${typeof ayBotonHTML === "function" ? ayBotonHTML() : ""}</span></div>
  <div class="page wide view rd">
    <p class="greet">${esc(fechaM)}</p>
    <div class="headrow"><h1 class="ltitle">${saludo()}${nom ? ", " + esc(nom) : ""}</h1>${f ? `<button class="chip-r rd-clear" data-rdf="">Quitar filtro</button>` : ""}</div>
    <p class="rd-lede">${rdLede(A)}</p>
    <div class="rd-kpis">${rdKpi("vencidos", "Vencidos", k.vencidos, k.vencidos ? `plazos superados en ${rdPl(k.expVencidos, "expediente")}${k.recargos > 0 ? ` · ${eur0(k.recargos)} de recargo` : ""}` : "plazos superados", "bad")}${rdKpi("semana", "Esta semana", k.estaSemana, "hoy y próximos 7 días", "warn")}${rdKpi("bloqueos", "Bloqueados", k.bloqueados, k.bloqueados ? `por terceros, en ${rdPl(k.expBloqueados, "expediente")}` : "nadie debe nada al despacho", "info")}${rdKpi("parados", "Parados", k.parados, "más de 30 días sin actividad", "mute")}</div>
    ${rdEquipo(A)}
    ${rdDineroHTML()}
    ${body}
    <p class="foot-note">Mi día se calcula con los plazos de cada trámite, el diagnóstico del expediente, la documentación recibida y la bitácora. Los recordatorios se copian para enviarlos por correo o WhatsApp y quedan anotados en el expediente. {{MARCA}} prepara; el criterio es del abogado.</p>
  </div>`;
  RD_.ms = performance.now() - t0;
  return html;
}

// ── Actividad reciente de la cartera: lo último anotado en la bitácora de cada expediente (qué ha cambiado) ──
function rdActividad(resp) {
  try {
    const L = DB.expedientes.filter((x) => x.fase !== "cerrado" && (!resp || (x.responsable || "none") === resp)).flatMap((x) => (x.bitacora || []).slice(0, 8).map((e) => ({ e, x }))).filter(({ e }) => e && e.t && e.texto).sort((a, b) => b.e.t.localeCompare(a.e.t)).slice(0, 6);
    if (!L.length) return "";
    return `<section class="rd-sec rd-actv" aria-labelledby="rd-h-actv"><div class="rd-sec-h"><h2 id="rd-h-actv">Actividad reciente</h2><small>Lo último anotado en los expedientes</small></div><div class="rd-list">${L.map(({ e, x }) => `<button class="rd-act" data-open="${x.id}"><span class="rd-act-t num">${esc(horaTxt(e.t))}</span><span class="rd-act-x"><b>${esc(e.texto)}</b><small>${x.despacho?.ref ? `<span class="mono">${esc(x.despacho.ref)}</span> · ` : ""}${esc(nombreExp(x))}${e.autor && abogado(e.autor) ? " · " + esc(abogado(e.autor).nombre) : ""}</small></span></button>`).join("")}</div></section>`;
  } catch (err) { return ""; }
}

// ── Franja para la Cartera, entrada de la barra lateral y botón móvil ──
function rdResumenCartera() {
  let A; try { A = radar(); } catch (e) { return ""; }
  if (!A.n) return "";
  const k = A.kpis;
  const seg = (n, s, p, cls, f) => `<button class="rd-sg ${n ? cls : ""}" data-act="rdMiDia" data-rdf="${f}"><b class="num">${n}</b> ${n === 1 ? s : p}</button>`;
  const todo = !k.vencidos && !k.estaSemana && !k.bloqueados;
  return `<div class="rd-strip" role="group" aria-label="Mi día"><button class="rd-sh" data-act="rdMiDia"><span class="rd-si">${RD_ICO.dia}</span><b>Hoy</b></button>${todo ? `<span class="rd-sg">Todo al día</span>` : `${seg(k.vencidos, "vencido", "vencidos", "bad", "vencidos")}<i aria-hidden="true"></i>${seg(k.estaSemana, "esta semana", "esta semana", "warn", "semana")}<i aria-hidden="true"></i>${seg(k.bloqueados, "bloqueo", "bloqueos", "info", "bloqueos")}${k.parados ? `<i aria-hidden="true"></i>${seg(k.parados, "parado", "parados", "mute", "parados")}` : ""}`}<button class="rd-sgo" data-act="rdMiDia">Mi día ${I.chev}</button></div>`;
}
function rdSideItem() {
  const n = rdBadge();
  return `<button class="sitem" data-act="rdMiDia" aria-current="${ui.vista === "radar"}"><span class="ic">${RD_ICO.dia}</span><span class="t"><b>Mi día</b></span>${n ? `<span class="rd-badge num" aria-label="${rdPl(n, "asunto")} para hoy">${n}</span>` : ""}</button>`;
}
function rdBotonTopbar() { const n = rdBadge(); return `<button class="tbtn rd-tb" data-act="rdMiDia" aria-label="Mi día${n ? ": " + rdPl(n, "asunto") + " para hoy" : ""}">${RD_ICO.dia}${n ? `<i class="rd-tbn num" aria-hidden="true">${n}</i>` : ""}</button>`; }

// ── Eventos propios (captura en document: no dependen del manejador de ui.js) ──
document.addEventListener("click", (e) => {
  const b = e.target && e.target.closest ? e.target.closest('[data-act="rdIr"],[data-act="rdAcc"],[data-act="rdMiDia"],[data-rdf],[data-rdr],[data-rdx]') : null;
  if (!b) return;
  const app = document.getElementById("app"); if (!app || !app.contains(b)) return;
  e.preventDefault(); e.stopPropagation();
  const d = b.dataset;
  try {
    if (d.act === "rdIr") { rdIr(d); return; }
    if (d.act === "rdAcc") { rdAccion(d); return; }
    if (d.act === "rdMiDia") { ui.rdx = {}; go({ vista: "radar", sheet: null, rdf: d.rdf || null }); return; }
    if (d.rdf != null) { ui.rdf = d.rdf && ui.rdf !== d.rdf ? d.rdf : null; render(); return; }
    if (d.rdr != null) { ui.rdr = d.rdr || null; render(); return; }
    if (d.rdx) { ui.rdx = { ...(ui.rdx || {}), [d.rdx]: true }; render(); return; }
  } catch (err) { console.error(err); }
}, true);

// ── Acciones de un expediente (determinista, sin IA): lo que vence o está vencido, lo que falta y lo que bloquea. Se usa en el Resumen y en la cabecera.
function rdAccionesExp(x) {
  let A; try { A = rdExp(x, hoy()); } catch (e) { return { crit: [], prox: [], bloq: [] }; }
  const crit = [...A.items.filter((i) => i.nivel === "bad"), ...A.bloq.filter((b) => b.nivel === "bad")];
  const prox = [...A.items.filter((i) => i.nivel !== "bad")];
  const bloq = [...A.bloq.filter((b) => b.nivel !== "bad"), ...(A.parado ? [A.parado] : [])];
  return { crit, prox, bloq, euros: A.euros };
}
function rdAccionesHTML(x) {
  const A = rdAccionesExp(x); const n = A.crit.length + A.prox.length + A.bloq.length;
  if (!n) return `<div class="card rd-acc rd-acc-ok"><div class="rd-acc-h"><span class="ico green">${RD_ICO.ok}</span><span class="t"><b>Al día</b><small>Sin plazos vencidos, sin datos que falten y sin bloqueos. El siguiente paso está más abajo.</small></span></div></div>`;
  const grupo = (L, t, cls) => L.length ? `<div class="rd-acc-g"><div class="rd-acc-gh ${cls}"><i class="rd-dot"></i><b>${t}</b><span class="num">${L.length}</span></div>${rdCorta("acc-" + cls, L).map(rdFila).join("")}${rdMas("acc-" + cls, L.length)}</div>` : "";
  return `<div class="card rd-acc"><div class="rd-acc-h"><span class="t"><b>Qué hacer en este expediente</b><small>${[A.crit.length ? plural(A.crit.length, "acción crítica", "acciones críticas") : "", A.prox.length ? plural(A.prox.length, "plazo próximo", "plazos próximos") : "", A.bloq.length ? plural(A.bloq.length, "bloqueo") : ""].filter(Boolean).join(" · ")}${A.euros > 0 ? ` · ${eur0(A.euros)} en juego` : ""}</small></span></div>
    ${grupo(A.crit, "Crítico", "bad")}${grupo(A.prox, "Esta semana", "warn")}${grupo(A.bloq, "Esperando o bloqueado", "mute")}</div>`;
}
// Línea de estado compacta para la cabecera del expediente
function rdEstadoLinea(x) {
  const A = rdAccionesExp(x);
  const partes = [];
  if (A.crit.length) partes.push(`<span class="st-b bad"><i></i>${plural(A.crit.length, "crítica", "críticas")}</span>`);
  if (A.prox.length) partes.push(`<span class="st-b warn"><i></i>${plural(A.prox.length, "plazo próximo", "plazos próximos")}</span>`);
  if (A.bloq.length) partes.push(`<span class="st-b mute"><i></i>${plural(A.bloq.length, "bloqueo")}</span>`);
  if (!partes.length) partes.push(`<span class="st-b ok"><i></i>Al día</span>`);
  return partes.join("");
}

// Dinero del área de sucesiones, en una línea: honorarios pendientes de facturar, provisiones en caja, expedientes sin presupuesto
function rdDineroHTML() {
  try {
    const act = DB.expedientes.filter((x) => x.fase !== "cerrado"); let pend = 0, saldo = 0, sinP = 0, cob = 0;
    for (const x of act) { let R = null; try { R = calcular(x); } catch (e) {} const F = fondos(x, R); if (!R || !F.presup) { if (R) sinP++; continue; } pend += F.pendiente; saldo += F.saldo; cob += F.hon; }
    if (!act.length || (!pend && !saldo && !sinP && !cob)) return "";
    const partes = [pend > 0 ? `<b class="money">${eur0(pend)}</b> de honorarios presupuestados por facturar` : "", cob > 0 ? `<b class="money">${eur0(cob)}</b> facturados` : "", saldo > 0 ? `<b class="money">${eur0(saldo)}</b> de provisiones en caja` : saldo < 0 ? `<b class="money" style="color:var(--red)">${eur0(-saldo)}</b> adelantados por el despacho` : "", sinP ? `${rdPl(sinP, "expediente")} sin presupuesto` : ""].filter(Boolean);
    return `<div class="rd-dinero"><span class="rd-dinero-k">Dinero</span><span class="rd-dinero-t">${partes.join(" · ")}</span><button class="link" data-tmp="rent">Rentabilidad ›</button></div>`;
  } catch (e) { return ""; }
}
