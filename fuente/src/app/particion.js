// ───────────────────── {{MARCA}} · partición y liquidación guiadas ─────────────────────
// Reproduce el reparto del motor (inventario → masa → cuotas) y lo lleva a cada bien:
// qué parte de cada bien corresponde a cada persona, adjudicaciones, excesos y liquidación final.
const PASOS_P = [["inventario", "Inventario"], ["masa", "Masa hereditaria"], ["cuotas", "Cuotas"], ["adjudicacion", "Cuadro de partición"], ["impuestos", "Impuestos"], ["liquidacion", "Liquidación"]];
const COL_H = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c5)", "var(--gold)", "var(--c4)"];
function fracTxt(f) {
  if (f <= 0) return "0";
  if (Math.abs(f - 1) < 1e-9) return "Total";
  for (let d = 2; d <= 36; d++) { const n = Math.round(f * d); if (n > 0 && Math.abs(n / d - f) < 1e-7) return `${n}/${d}`; }
  return grp(f * 100, 2) + " %";
}
const DER_T = { pleno: "propiedad", usufructo: "usufructo", nuda: "nuda propiedad" };
const derTxt = (d) => (Math.abs(d.fraccion - 1) < 1e-9 ? `Todo en ${DER_T[d.tipo]}` : `${fracTxt(d.fraccion)} en ${DER_T[d.tipo]}`);

function particion(x, R) {
  const m = R.isd.masa;
  const P = (x.personas || []).filter((p) => !p.renuncia);
  const edad = (p) => (p && p.edad !== "" && p.edad != null && !isNaN(num(p.edad)) ? num(p.edad) : 40);
  const porId = Object.fromEntries((x.personas || []).map((p) => [p.id, p]));
  const der = R.isd.derechos || {};
  const fEco = (p, d) => (d.tipo === "usufructo" ? pctUsufructoVitalicio(edad(p)) : d.tipo === "nuda" ? 1 - pctUsufructoVitalicio(porId[d.usufructuarioId] ? edad(porId[d.usufructuarioId]) : 70) : 1);
  const share = Object.fromEntries(P.map((p) => [p.id, (der[p.id] || []).reduce((s, d) => s + d.fraccion * fEco(p, d), 0)]));
  const B = (x.bienes || []).map((b) => {
    const inm = b.tipo === "vivienda" || b.tipo === "inmueble";
    const total = inm ? Math.max(num(b.valor), num(b.valorReferencia)) : num(b.valor);
    const cc = cuotaCausante({ titularidad: b.titularidad, porcentaje: pctCausante(b.porcentaje) });
    const leg = b.legatarioId && porId[b.legatarioId] && !porId[b.legatarioId].renuncia ? b.legatarioId : "";
    const adj = !leg && b.adjudicadoA && porId[b.adjudicadoA] && !porId[b.adjudicadoA].renuncia ? b.adjudicadoA : "";
    return { b, inm, total, cc, v: total * cc, leg, adj };
  }).filter((q) => q.total > 0);
  const cols = P.filter((p) => (der[p.id] || []).length || B.some((q) => q.leg === p.id));
  const DG = (m.deudas || 0) + (m.gastos || 0);
  const cell = {};
  for (const q of B) {
    cell[q.b.id] = {};
    for (const p of cols) {
      if (q.leg) { cell[q.b.id][p.id] = q.leg === p.id ? { v: q.v, lab: "Legado" } : null; continue; }
      if (q.adj) { cell[q.b.id][p.id] = q.adj === p.id ? { v: q.v, lab: "Adjudicado entero" } : null; continue; }
      const L = (der[p.id] || []).filter((d) => d.fraccion > 0);
      const v = L.reduce((s, d) => s + q.v * d.fraccion * fEco(p, d), 0);
      cell[q.b.id][p.id] = v > 0.004 ? { v, lab: L.map(derTxt).join(" · ") } : null;
    }
  }
  const H = cols.map((p) => {
    const bienes = B.filter((q) => !q.leg).reduce((s, q) => s + (cell[q.b.id][p.id]?.v || 0), 0);
    const cargas = share[p.id] * DG;
    // D2 (control de calidad 07-10-2026): el usufructuario no paga el capital de las deudas ni los gastos: se pagan con bienes de la herencia y su
    // usufructo recae sobre el caudal líquido (la cuota usufructuaria del viudo se calcula sobre el haber líquido, art. 818 CC; en el usufructo de
    // todo un patrimonio, el usufructuario solo responde de las deudas en los casos del art. 643 CC, por remisión del art. 510 CC). Las cifras no
    // cambian (su parte económica es menor en la misma proporción), pero se separa la parte que «reduce el usufructo» de la que se paga.
    const cargasUsufructo = (der[p.id] || []).filter((d) => d.tipo === "usufructo").reduce((s, d) => s + d.fraccion * fEco(p, d), 0) * DG;
    const adjud = bienes - cargas;
    const haber = share[p.id] * m.netoReparto;
    const legados = B.filter((q) => q.leg === p.id).reduce((s, q) => s + q.v, 0);
    return { p, bienes, cargas, cargasUsufructo, cargasCapital: cargas - cargasUsufructo, adjud, haber, legados, dif: adjud - haber, share: share[p.id] };
  });
  return { B, cols, cell, H, DG, share, fEco };
}

// ───────────────────── Cuadro de adjudicación: ÚNICA fuente de las cifras del exceso ─────────────────────
// Todas las pantallas y documentos (Partición, Listo para firmar, paquete notarial, Dos herencias, Diagnóstico,
// Mi día, informe PDF, cuaderno, carpeta y modo reunión) leen el exceso, las compensaciones y su coste de aquí.
// Base legal (research/estrategia-fiscal.md, palanca 3):
//  · El ISD se liquida por cuotas «cualesquiera que sean las particiones» (art. 27.1 LISD): adjudicar no cambia el ISD.
//  · Exceso inevitable (bien indivisible, art. 1062 CC) compensado en dinero: NO sujeto a TPO (art. 7.2.B TRLITPAJD).
//    AJD: Andalucía lo sujeta al 1,2 % (STSJ Andalucía 895/2026, de 15-04-2026; tipo de la Ley 5/2021) · Madrid no
//    (STSJ Madrid de 30-09-2024, rec. 996/2022) · resto de comunidades: PENDIENTE de verificar.
//    La cuota gradual de AJD solo grava documentos inscribibles (art. 31.2 TRLITPAJD): aquí, los inmuebles.
//  · Exceso evitable (otro reparto lo reducía): TPO a cargo de quien recibe de más. Andalucía 7 % inmuebles y 4 % muebles
//    (Ley 5/2021); resto, tipos estatales de referencia (art. 11 TRLITPAJD: 6 % y 4 %) PENDIENTES del tipo autonómico.
//    La indivisibilidad se juzga sobre el conjunto (DGT V0239-16); separar la parte evitable es INFERENCIA nuestra.
//  · Exceso sin compensación: donación entre coherederos (art. 27.3 LISD). Aquí se supone siempre compensado en dinero.
const cpLista = (L) => (L.length > 1 ? L.slice(0, -1).join(", ") + " y " + L[L.length - 1] : L[0] || ""); // «a, b y c»
const CP_LIQ = (b) => b.tipo === "cuenta" || b.tipo === "valores";
const CP_INDIV = (b) => !CP_LIQ(b);
const cpR2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const cpTerr = (x) => (x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa);
const cpViudo = (p) => p && ["conyuge", "pareja_hecho"].includes(p.relacion);
function cpTipos(terr) {
  if (terr === "AND") return { ajd: 0.012, ajdTxt: "AJD 1,2 %", ajdEstado: "VERIFICADO", ajdNorma: "art. 7.2.B TRLITPAJD · STSJ Andalucía 895/2026", ajdNota: "En Andalucía el exceso inevitable compensado en dinero tributa por AJD al 1,2 % (STSJ Andalucía 895/2026).", tpoInm: 0.07, tpoMue: 0.04, tpoEstado: "VERIFICADO", tpoNorma: "art. 7.2.B TRLITPAJD · Ley 5/2021 de Andalucía" };
  if (terr === "MAD") return { ajd: 0, noSujeto: true, ajdTxt: "AJD: no sujeto", ajdEstado: "VERIFICADO", ajdNorma: "art. 7.2.B TRLITPAJD · STSJ Madrid de 30-09-2024", ajdNota: "En Madrid el TSJ considera no sujeto a AJD el exceso inevitable (sentencia de 30-09-2024).", tpoInm: 0.06, tpoMue: 0.04, tpoEstado: "PENDIENTE", tpoNorma: "art. 7.2.B y art. 11 TRLITPAJD (tipo autonómico en verificación)" };
  return { ajd: null, ajdTxt: "AJD (tipo autonómico)", ajdEstado: "PENDIENTE", ajdNorma: "art. 7.2.B TRLITPAJD", ajdNota: "La tributación por AJD del exceso inevitable en esta comunidad está pendiente de verificar: no se suma al coste.", tpoInm: 0.06, tpoMue: 0.04, tpoEstado: "PENDIENTE", tpoNorma: "art. 7.2.B y art. 11 TRLITPAJD (tipo autonómico en verificación)" };
}
// Coste de un exceso: parte inevitable (AJD sobre lo inscribible) y parte evitable (TPO). La usan el cuadro y la propuesta de lotes.
function cpTributar(terr, o) {
  const T = cpTipos(terr), inev = Math.max(0, o.inevitable || 0), ev = Math.max(0, o.evitable || 0);
  const ajdBase = cpR2(inev * Math.max(0, Math.min(1, o.fInmInev ?? 1)));
  const ajd = T.ajd == null ? null : cpR2(ajdBase * T.ajd);
  const fEv = Math.max(0, Math.min(1, o.fInmEv ?? 0)), tpoInmBase = cpR2(ev * fEv), tpoMueBase = cpR2(ev - tpoInmBase);
  const tpo = cpR2(tpoInmBase * T.tpoInm + tpoMueBase * T.tpoMue);
  // La parte evitable se separa por INFERENCIA nuestra (DGT V0239-16 juzga la indivisibilidad sobre el conjunto): siempre PENDIENTE
  const pendiente = (ajd == null && ajdBase > 0.5) || ev > 0.5;
  return { T, ajdBase, ajd, tpoBase: cpR2(ev), tpoInmBase, tpoMueBase, tpo, coste: cpR2((ajd || 0) + tpo), pendiente, estado: pendiente || (ajdBase > 0.5 && T.ajdEstado === "PENDIENTE") ? "PENDIENTE" : "VERIFICADO" };
}
const cpPct = (t) => grp(t * 100, Math.abs(t * 100 - Math.round(t * 100)) > 0.05 ? 1 : 0) + " %";
// Texto del coste de un exceso, igual en todas las pantallas
function cpTxtCoste(e) {
  const t = e.trib, L = [];
  if (t.ajdBase > 0.5) L.push(t.T.noSujeto ? `AJD: no sujeto (${eur0(t.ajdBase)} inevitable)` : t.ajd == null ? `AJD sobre ${eur0(t.ajdBase)}: tipo autonómico pendiente de verificar` : `AJD ${cpPct(t.T.ajd)} sobre ${eur0(t.ajdBase)} = ${eur(t.ajd)}`);
  if (e.inevitable - t.ajdBase > 0.5) L.push(`${eur0(e.inevitable - t.ajdBase)} de bienes no inscribibles: sin AJD`);
  if (t.tpoBase > 0.5) L.push(`TPO sobre la parte evitable, ${eur0(t.tpoBase)} (${[t.tpoInmBase > 0.5 ? `${cpPct(t.T.tpoInm)} inmuebles` : "", t.tpoMueBase > 0.5 ? `${cpPct(t.T.tpoMue)} ${t.tpoInmBase > 0.5 ? "resto" : "muebles"}` : ""].filter(Boolean).join(", ")}) = ${eur(t.tpo)}, criterio en verificación`);
  return L.join(" · ") || "Sin coste";
}
function cuadroParticion(x, R) {
  R = R === undefined ? calcular(x) : R; if (!R) return null;
  let PT; try { PT = particion(x, R); } catch (e) { return null; }
  const terr = cpTerr(x), der = R.isd.derechos || {}, porId = Object.fromEntries((x.personas || []).map((p) => [p.id, p]));
  const pleno = (id) => (der[id] || []).filter((d) => d.tipo === "pleno").reduce((s, d) => s + d.fraccion, 0);
  const nom = (p) => (p.nombre || "").trim() || (RELACIONES[p.relacion] ? RELACIONES[p.relacion].label : "Heredero");
  const H = PT.H.map((h) => {
    const id = h.p.id, enteros = PT.B.filter((q) => q.adj === id), indiv = enteros.filter((q) => CP_INDIV(q.b));
    const vIndiv = indiv.reduce((s, q) => s + q.v, 0), vInmIndiv = indiv.filter((q) => q.inm).reduce((s, q) => s + q.v, 0);
    const exceso = h.dif >= 1 ? cpR2(h.dif) : 0, defecto = h.dif <= -1 ? cpR2(-h.dif) : 0;
    const inevitable = exceso ? cpR2(Math.max(0, Math.min(exceso, vIndiv - h.cargas - h.haber))) : 0;
    const evitable = cpR2(exceso - inevitable);
    // Naturaleza de lo que forma la parte evitable: lo que recibe además de los bienes indivisibles adjudicados enteros
    const otros = PT.B.filter((q) => !indiv.includes(q) && !q.leg && PT.cell[q.b.id][id]);
    const vOtros = otros.reduce((s, q) => s + PT.cell[q.b.id][id].v, 0), vOtrosInm = otros.filter((q) => q.inm).reduce((s, q) => s + PT.cell[q.b.id][id].v, 0);
    // Liquidez para compensar: dinero propio (su mitad de gananciales en cuentas y fondos) + dinero que recibe en pleno dominio
    const liqPropio = cpViudo(h.p) && x.civil === "gananciales" ? (x.bienes || []).filter((b) => CP_LIQ(b) && b.titularidad === "ganancial").reduce((s, b) => s + num(b.valor) * 0.5, 0) : 0;
    const liqHerencia = PT.B.filter((q) => CP_LIQ(q.b)).reduce((s, q) => s + (q.leg ? (q.leg === id ? q.v : 0) : q.adj ? (q.adj === id ? q.v : 0) : q.v * pleno(id)), 0);
    const trib = cpTributar(terr, { inevitable, evitable, fInmInev: vIndiv ? vInmIndiv / vIndiv : 0, fInmEv: vOtros ? vOtrosInm / vOtros : 0 });
    return { id, p: h.p, nombre: nom(h.p), haber: cpR2(h.haber), adjudicado: cpR2(h.adjud), legados: cpR2(h.legados), cargas: cpR2(h.cargas), dif: cpR2(h.dif), exceso, defecto, inevitable, evitable, bienesEnteros: enteros.map((q) => ({ b: q.b, v: q.v, indivisible: CP_INDIV(q.b), inm: q.inm })), liqPropio: cpR2(liqPropio), liqHerencia: cpR2(liqHerencia), liquido: cpR2(liqPropio + liqHerencia), trib };
  });
  // Compensaciones: cada uno que recibe de más paga a los que reciben de menos en proporción a lo que les falta
  const pag = H.filter((e) => e.exceso > 0), rec = H.filter((e) => e.defecto > 0), totDef = rec.reduce((s, e) => s + e.defecto, 0);
  const compensaciones = [];
  for (const a of pag) for (const b of rec) { const imp = cpR2(totDef ? a.exceso * b.defecto / totDef : 0); if (imp >= 0.5) compensaciones.push({ de: a.p, a: b.p, deNombre: a.nombre, aNombre: b.nombre, importe: imp }); }
  const excesos = pag.map((e) => {
    const paga = cpR2(compensaciones.filter((c) => c.de.id === e.id).reduce((s, c) => s + c.importe, 0));
    const falta = cpR2(Math.max(0, paga - e.liquido));
    const alternativas = [];
    if (falta > 0.5) {
      alternativas.push({ t: `Pago aplazado de la compensación, con garantía (condición resolutoria o hipoteca sobre el bien adjudicado).`, n: "art. 1062 CC", s: "PENDIENTE" });
      alternativas.push({ t: `Adjudicar el bien en proindiviso según las cuotas: no hay exceso hoy; la extinción posterior del condominio tiene su propio coste${terr === "AND" ? " (AJD 1,2 % sobre la parte que se adquiere)" : ""}.`, n: "arts. 400 y 1062 CC", s: terr === "AND" ? "VERIFICADO" : "PENDIENTE" });
      alternativas.push({ t: "Vender el bien y repartir el precio: basta que un heredero pida la venta en pública subasta con admisión de licitadores extraños.", n: "art. 1062.2 CC", s: "VERIFICADO" });
      if ((der[e.id] || []).some((d) => d.tipo === "usufructo")) alternativas.push({ t: "Mantener el usufructo sobre la vivienda (o conmutarlo solo por su valor) en lugar de adjudicarle la propiedad entera.", n: "arts. 839-840 CC", s: "VERIFICADO" });
    }
    const otrosNoms = rec.map((r) => r.nombre);
    return { ...e, paga, falta, alternativas, sugerencia: e.evitable > 0.5 ? `Si ${cpLista(otrosNoms) || "los demás"} se adjudican la parte de ${e.nombre} en los demás bienes${(der[e.id] || []).some((d) => d.tipo === "usufructo") ? " (conmutando el resto de su usufructo)" : ""}, el exceso baja a ${eur0(e.inevitable)} y queda solo la parte inevitable.` : "", txtCoste: cpTxtCoste(e) };
  });
  const coste = cpR2(excesos.reduce((s, e) => s + e.trib.coste, 0));
  const adjudicaciones = PT.B.filter((q) => q.adj || q.leg).map((q) => ({ b: q.b, v: q.v, tipo: q.leg ? "legado" : "adjudicado", aId: q.leg || q.adj, aNombre: nom(porId[q.leg || q.adj] || {}) }));
  const proindiviso = PT.B.filter((q) => !q.adj && !q.leg && PT.cols.filter((p) => PT.cell[q.b.id][p.id]).length > 1).map((q) => q.b);
  const avisos = excesos.filter((e) => e.falta > 0.5).map((e) => ({ id: e.id, tipo: "liquidez", titulo: `${e.nombre} debe compensar ${eur0(e.paga)} y su dinero disponible es ${eur0(e.liquido)}`, detalle: `Le faltan ${eur0(e.falta)}. Dinero disponible: ${e.liqPropio ? `${eur0(e.liqPropio)} de su mitad de gananciales en cuentas y fondos` : ""}${e.liqPropio && e.liqHerencia ? " y " : ""}${e.liqHerencia ? `${eur0(e.liqHerencia)} que recibe en dinero en la herencia` : ""}${!e.liquido ? "ninguno que conste en el expediente" : ""}.`, alternativas: e.alternativas }));
  return { x, R, PT, terr, T: cpTipos(terr), H, excesos, compensaciones, coste, pendiente: excesos.some((e) => e.trib.pendiente), totalExceso: cpR2(excesos.reduce((s, e) => s + e.exceso, 0)), hayAdjudicaciones: PT.B.some((q) => q.adj), adjudicaciones, proindiviso, avisos };
}
// Coste fiscal total del expediente con el exceso en su propia línea (Sucesiones + plusvalía + AJD/TPO del exceso)
function costeExpediente(x, R) {
  R = R === undefined ? calcular(x) : R; if (!R) return null;
  const C = cuadroParticion(x, R);
  const exceso = C ? C.coste : 0;
  // C2 (control de calidad 07-10-2026): fuera de plazo, el recargo del art. 27 LGT forma parte del coste fiscal total
  const recargo = R.isd.recargo ? R.isd.recargo.importe || 0 : 0;
  return { isd: R.isd.total, plus: R.totalPlus, exceso, excesoPendiente: !!(C && C.pendiente), recargo, total: cpR2(R.isd.total + R.totalPlus + exceso + recargo), C };
}
// Frases para la familia y los documentos
function cpTxtCompensaciones(C, conImporte = true) {
  if (!C || !C.compensaciones.length) return "";
  const porDe = {};
  for (const c of C.compensaciones) (porDe[c.de.id] = porDe[c.de.id] || { n: c.deNombre, L: [] }).L.push(c);
  return Object.values(porDe).map((g) => `${g.n} compensa en dinero a ${g.L.map((c) => `${c.aNombre}${conImporte ? ` (${eur0(c.importe)})` : ""}`).join(" y ")}`).join("; ");
}

// Bloque del exceso para la pantalla de Partición (paso 3): misma cifra que el paquete, Dos herencias y el Diagnóstico
const cpTag = (e) => (e === "PENDIENTE" ? '<span class="tag P">En verificación</span>' : e === "VERIFICADO" ? '<span class="tag V">Verificado</span>' : "");
const cpNormas = (t, terr) => String(t || "").split(" · ").filter(Boolean).map((n) => (typeof linkNorma === "function" ? linkNorma(n, terr) : esc(n))).join(" · ");
function cpBloqueExceso(x, R, terr) {
  const C = cuadroParticion(x, R); if (!C || !C.excesos.length) return "";
  const n = (s) => esc(s);
  return `<div class="card cp-exc" style="margin-top:12px">${C.excesos.map((e) => `<div class="cp-e">
      <p><b>${n(e.nombre)} recibe ${eur0(e.exceso)} más de lo que le corresponde</b> y lo compensa en dinero a ${C.compensaciones.filter((c) => c.de.id === e.id).map((c) => `${n(c.aNombre)} (${eur0(c.importe)})`).join(" y ")}.</p>
      <div class="kv sm cp-kv"><span>Exceso inevitable${e.bienesEnteros.some((b) => b.indivisible) ? ` · ${n(e.bienesEnteros.filter((b) => b.indivisible).map((b) => b.b.descripcion || TIPO_BIEN[b.b.tipo][0]).join(", "))}, indivisible` : ""}</span><span class="num">${eur(e.inevitable)}</span>${e.evitable > 0.5 ? `<span>Exceso evitable · su parte en los demás bienes</span><span class="num">${eur(e.evitable)}</span>` : ""}<span>Coste del exceso${e.trib.estado === "PENDIENTE" ? " " + cpTag("PENDIENTE") : ""}</span><span class="num"><b>${eur(e.trib.coste)}</b></span></div>
      <p class="caption">${n(e.txtCoste)}. Lo paga ${n(e.nombre)}. ${n(e.trib.T.ajdNota)} ${cpNormas(e.trib.T.ajdNorma + " · art. 1062 CC", terr)}</p>
      ${e.sugerencia ? `<p class="caption"><b>Para reducirlo:</b> ${n(e.sugerencia)}</p>` : ""}
      ${e.falta > 0.5 ? `<div class="infobar cp-liq"><span class="ico orange">${I.info}</span><span><b>${n(e.nombre)} no tiene dinero suficiente para compensar.</b> Debe pagar ${eur0(e.paga)} y dispone de ${eur0(e.liquido)}${e.liqPropio ? ` (su mitad de gananciales en cuentas y fondos${e.liqHerencia ? " y el dinero que hereda" : ""})` : ""}: faltan ${eur0(e.falta)}. Alternativas a valorar:<ul>${e.alternativas.map((a) => `<li>${n(a.t)} <span class="caption">${cpNormas(a.n, terr)} ${cpTag(a.s)}</span></li>`).join("")}</ul></span></div>` : ""}
    </div>`).join("")}
    <p class="caption">El Impuesto sobre Sucesiones no cambia: se liquida por las cuotas, cualquiera que sea la adjudicación (${cpNormas("art. 27.1 Ley 29/1987", terr)}). Sin compensación en dinero, el exceso sería una donación (${cpNormas("art. 27.3 Ley 29/1987", terr)}).</p></div>`;
}

// ── Vista ──
function tParticion(x, R) {
  if (ui.pstepFor !== x.id) { ui.pstepFor = x.id; ui.pstep = 0; }
  const k = Math.max(0, Math.min(PASOS_P.length - 1, ui.pstep || 0));
  const PT = particion(x, R);
  const col = (id) => COL_H[Math.max(0, PT.cols.findIndex((p) => p.id === id)) % COL_H.length];
  const nav = `<nav class="pnav" aria-label="Pasos de la partición">${PASOS_P.map(([id, t], i) => `<button data-pstep="${i}" class="${i < k ? "ok" : i === k ? "on" : ""}" aria-current="${i === k ? "step" : "false"}"><i>${i < k ? I.tick : i + 1}</i><span>${t}</span></button>`).join("")}</nav>`;
  const pie = `<div class="pfoot">${k > 0 ? `<button class="btn gray" data-pstep="${k - 1}">${I.back}${PASOS_P[k - 1][1]}</button>` : "<span></span>"}${k < PASOS_P.length - 1 ? `<button class="btn" data-pstep="${k + 1}">Siguiente: ${PASOS_P[k + 1][1]}<span class="chev-r">${I.chev}</span></button>` : `<button class="btn" data-doc="cuaderno">${I.doc}Cuaderno particional</button>`}</div>`;
  const cab = (t, s) => `<div class="phead"><div class="kick">Paso ${k + 1} de ${PASOS_P.length}</div><h2>${t}</h2><p>${s}</p></div>`;
  const m = R.isd.masa, terr = x.ccaa === "EST" ? x.ccaaBienes || "EST" : x.ccaa;
  const nom = (p) => esc(p.nombre || RELACIONES[p.relacion].label);
  const dot = (id) => `<i class="hdot" style="background:${col(id)}"></i>`;
  let body = "";

  if (k === 0) {
    const vhTot = PT.B.reduce((s, q) => s + q.v, 0), tot = PT.B.reduce((s, q) => s + q.total, 0);
    body = cab("Qué era del fallecido", "De cada bien, solo entra en la herencia la parte que le pertenecía. En gananciales, la mitad es del cónyuge viudo; en un bien compartido, solo su porcentaje.") +
      `<div class="card" style="padding:6px 22px"><div class="pinv hd"><span>Bien</span><span>Parte del fallecido</span><span class="pi-v"><span>Valor</span><b>En la herencia</b></span></div>${PT.B.map((q) => `<div class="pinv"><div class="pi-l"><b>${esc(q.b.descripcion || TIPO_BIEN[q.b.tipo][0])}</b><small>${esc(TIPO_BIEN[q.b.tipo][0])} · ${q.b.titularidad === "ganancial" ? "ganancial: mitad del viudo" : q.b.titularidad === "proindiviso" ? `suyo el ${grp(q.cc * 100, 2)} %` : "privativo: todo suyo"}${q.inm && num(q.b.valorReferencia) > num(q.b.valor) ? " · por valor de referencia" : ""}</small></div><div class="pi-b"><i style="width:${q.cc * 100}%"></i></div><div class="pi-v num"><span>${eur0(q.total)}</span><b>${eur0(q.v)}</b></div></div>`).join("")}
        <div class="pinv tot"><div class="pi-l"><b>Total</b><small>Valor de los bienes · parte del fallecido</small></div><div class="pi-b"><i style="width:${tot ? vhTot / tot * 100 : 0}%"></i></div><div class="pi-v num"><span>${eur0(tot)}</span><b>${eur0(vhTot)}</b></div></div></div>
      <p class="caption pnote">Los inmuebles se computan por el mayor entre el valor declarado y el de referencia (${linkNorma("art. 9 Ley 29/1987", terr)}). La liquidación de gananciales sigue los ${linkNorma("arts. 1344 y 1392 CC", terr)}.</p>`;
  }
  if (k === 1) {
    const fx = (kk, v, s, cls = "") => `<div class="fx ${cls}"><span class="k">${kk}</span><b class="num">${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
    const leg = PT.B.filter((q) => q.leg);
    body = cab("Lo que se reparte", "A lo que era del fallecido se le restan las deudas y los gastos del entierro. Los legados salen aparte: van a quien los recibe y no cargan con las deudas.") +
      `<div class="card" style="padding:22px"><div class="formula">${fx("Bienes del fallecido", eur0(m.bruto))}<span class="op">−</span>${fx("Deudas", eur0(m.deudas))}<span class="op">−</span>${fx("Funeral y última enfermedad", eur0(m.gastos))}<span class="op">=</span>${fx("Herencia neta", eur0(m.neto), "", "hi")}</div>
      ${leg.length ? `<div class="formula" style="margin-top:10px">${fx("Herencia neta", eur0(m.neto))}<span class="op">−</span>${fx("Legados", eur0(m.legados), leg.map((q) => esc(q.b.descripcion || TIPO_BIEN[q.b.tipo][0])).join(", "))}<span class="op">=</span>${fx("A repartir entre herederos", eur0(m.netoReparto), "", "hi")}</div>` : `<p class="caption" style="margin:12px 0 0">No hay legados: se reparte toda la herencia neta, ${eur0(m.netoReparto)}.</p>`}</div>
      ${(x.deudas || []).some((d) => num(d.importe)) || (x.gastos || []).some((g) => num(g.importe)) ? `<div class="card" style="margin-top:12px;padding:6px 22px"><div class="kv">${(x.deudas || []).filter((d) => num(d.importe)).map((d) => `<span>${esc(d.concepto || "Deuda")}${d.ganancial ? " · ganancial, computa la mitad" : ""}</span><span>${eur(num(d.importe) * (d.ganancial ? 0.5 : 1))}</span>`).join("")}${(x.gastos || []).filter((g) => num(g.importe)).map((g) => `<span>${esc(g.concepto || "Gasto")}</span><span>${eur(num(g.importe))}</span>`).join("")}</div></div>` : ""}
      <p class="caption pnote">Deducibles según los ${linkNorma("arts. 13 y 14 Ley 29/1987", terr)}. Las deudas las asumen los herederos (${linkNorma("art. 1003 CC", terr)}); los legatarios solo responden si toda la herencia se reparte en legados (${linkNorma("art. 891 CC", terr)}).</p>`;
  }
  if (k === 2) {
    const tot = PT.H.reduce((s, h) => s + h.haber, 0) || 1;
    body = cab("Qué proporción corresponde a cada uno", x.testamento === "porcentajes" ? "Según el testamento. El usufructo se valora por la edad de quien lo recibe." : x.testamento === "usufructo" ? "Usufructo universal al cónyuge y nuda propiedad a los hijos. El usufructo vale más cuanto más joven es el usufructuario." : "Sin testamento, la ley llama a los herederos por órdenes. El cónyuge viudo recibe su usufructo.") +
      `<div class="card" style="padding:22px"><div class="pstack">${PT.H.filter((h) => h.haber > 0.5).map((h) => `<i style="width:${h.haber / tot * 100}%;background:${col(h.p.id)}" title="${nom(h.p)}"></i>`).join("")}</div>
      <div class="pcuotas">${PT.H.map((h) => `<div class="pc"><div class="pc-l">${dot(h.p.id)}<span><b>${nom(h.p)}</b><small>${esc(gnCap(gnRel(h.p)))}${h.p.edad !== "" && h.p.edad != null ? ` · ${esc(h.p.edad)} años` : ""}</small></span></div><div class="pc-d">${(R.isd.derechos[h.p.id] || []).map((d) => `<span class="chip-d ${d.tipo}">${derTxt(d)}${d.tipo !== "pleno" ? ` · vale el ${grp(PT.fEco(h.p, d) * 100, 0)} %` : ""}</span>`).join("")}${h.legados ? `<span class="chip-d leg">Legado ${eur0(h.legados)}</span>` : ""}</div><div class="pc-v num"><b>${eur0(h.haber)}</b><small>${grp(h.share * 100, 2)} % de lo que se reparte</small></div></div>`).join("")}</div></div>
      ${R.isd.notasReparto.length ? `<div class="group" style="margin-top:12px"><ul class="notes">${frLeyRepartoHTML(R)}${R.isd.notasReparto.map((n) => `<li><i class="dot gold"></i><span>${esc(n)}</span></li>`).join("")}</ul></div>` : ""}
      ${R.isd.alertas.filter((a) => /legítima|Renuncia|menores/i.test(a)).map((a) => `<div class="infobar" style="margin-top:10px"><span class="ico orange">${I.info}</span><span>${esc(a)}</span></div>`).join("")}
      <p class="caption pnote">Valor del usufructo: 89 menos la edad del usufructuario, entre el 10 % y el 70 % (${linkNorma("art. 26 Ley 29/1987", terr)}).${x.testamento === "no" || x.testamento === "nose" ? ` Orden de llamamiento sin testamento: ${R.isd.regimenReparto && R.isd.regimenReparto !== "comun" ? esc(R.isd.leyReparto || "derecho civil propio de la vecindad del causante") : linkNorma("arts. 930-958 CC", terr)}.` : ` Legítimas: ${linkNorma("arts. 806-822 CC", terr)}.`}</p>`;
  }
  if (k === 3) {
    const LT = (() => { try { return lotes(x, R); } catch (e) { return null; } })();
    const hayAdj = PT.B.some((q) => q.adj);
    const exc = PT.H.filter((h) => Math.abs(h.dif) >= 1);
    const sel = (q) => q.leg ? `<span class="tag I">Legado</span>` : `<select class="padj" data-padj="${q.b.id}" aria-label="Adjudicación de ${esc(q.b.descripcion || "")}"><option value="">Pro indiviso</option>${PT.cols.filter((p) => (R.isd.derechos[p.id] || []).length).map((p) => `<option value="${p.id}" ${q.adj === p.id ? "selected" : ""}>Para ${nom(p)}</option>`).join("")}</select>`;
    const barra = (q) => `<div class="prow-bar">${PT.cols.map((p) => { const c = PT.cell[q.b.id][p.id]; return c ? `<i style="width:${c.v / q.v * 100}%;background:${col(p.id)}"></i>` : ""; }).join("")}</div>`;
    const tabla = `<div class="tablewrap card ptable-w" style="padding:0"><table class="grid-t ptable"><thead><tr><th>Bien</th>${PT.cols.map((p) => `<th class="n">${dot(p.id)}${nom(p)}</th>`).join("")}</tr></thead><tbody>
      ${PT.B.map((q) => `<tr><td><b>${esc(q.b.descripcion || TIPO_BIEN[q.b.tipo][0])}</b><small>${eur0(q.v)} en la herencia</small>${barra(q)}<div style="margin-top:8px">${sel(q)}</div></td>${PT.cols.map((p) => { const c = PT.cell[q.b.id][p.id]; return `<td class="n">${c ? `<b>${eur0(c.v)}</b><small>${esc(c.lab)}</small>` : `<span class="nil">—</span>`}</td>`; }).join("")}</tr>`).join("")}
      ${PT.DG > 0.5 ? `<tr class="neg"><td><b>Deudas y gastos</b><small>Cada heredero por su cuota; al usufructuario solo le reducen el usufructo</small></td>${PT.H.map((h) => `<td class="n">${h.cargas > 0.5 ? `−${eur0(h.cargas)}` : `<span class="nil">—</span>`}</td>`).join("")}</tr>` : ""}
      </tbody><tfoot><tr><td>Se le adjudica</td>${PT.H.map((h) => `<td class="n"><b>${eur0(h.adjud + h.legados)}</b></td>`).join("")}</tr><tr class="sub"><td>Le corresponde</td>${PT.H.map((h) => `<td class="n">${eur0(h.haber + h.legados)}</td>`).join("")}</tr><tr class="dif"><td>Diferencia</td>${PT.H.map((h) => `<td class="n">${Math.abs(h.dif) < 1 ? `<span class="ok">Cuadra</span>` : `<span class="${h.dif > 0 ? "exc" : "def"}">${h.dif > 0 ? "Exceso" : "Defecto"} ${eur0(Math.abs(h.dif))}</span>`}</td>`).join("")}</tr></tfoot></table></div>`;
    const tarjetas = `<div class="pcards">${PT.B.map((q) => `<div class="card pcard"><div class="pcard-h"><b>${esc(q.b.descripcion || TIPO_BIEN[q.b.tipo][0])}</b><span class="num">${eur0(q.v)}</span></div>${barra(q)}${PT.cols.filter((p) => PT.cell[q.b.id][p.id]).map((p) => { const c = PT.cell[q.b.id][p.id]; return `<div class="pcard-r">${dot(p.id)}<span>${nom(p)}<small>${esc(c.lab)}</small></span><b class="num">${eur0(c.v)}</b></div>`; }).join("")}<div style="margin-top:10px">${sel(q)}</div></div>`).join("")}
      <div class="card pcard">${PT.H.map((h) => `<div class="pcard-r">${dot(h.p.id)}<span>${nom(h.p)}<small>Le corresponde ${eur0(h.haber + h.legados)}</small></span><b class="num">${Math.abs(h.dif) < 1 ? "Cuadra" : (h.dif > 0 ? "+" : "−") + eur0(Math.abs(h.dif))}</b></div>`).join("")}</div></div>`;
    body = cab("Qué parte de cada bien se queda cada uno", "Por defecto, todos los bienes quedan en proindiviso según las cuotas. Puedes adjudicar cada bien a una persona: el cuadro calcula al momento si alguien recibe de más y cuánto debe compensar a los demás.") +
      `<div class="ptools">${LT && LT.aplica ? `<button class="btn sm" data-act="pLotes">${I.scale}Proponer lotes con menos plusvalía</button>` : ""}${hayAdj ? `<button class="btn sm gray" data-act="pIndiviso">Todo en proindiviso</button>` : ""}</div>
      ${tabla}${tarjetas}
      ${cpBloqueExceso(x, R, terr)}
      <p class="caption pnote">La partición debe respetar la igualdad de lotes en lo posible (${linkNorma("art. 1061 CC", terr)}) y la hacen los herederos de común acuerdo (${linkNorma("art. 1058 CC", terr)}). Adjudicar un inmueble cambia quién paga su plusvalía, no el Impuesto sobre Sucesiones.</p>`;
  }
  if (k === 4) {
    const pp = plusPorHeredero(R);
    const Hs = R.isd.herederos;
    const porNom = (b, h) => { const e = R.plus.find((q) => q.b.id === b.id); const t = e && e.r.porTitular.find((z) => z.heredero === h.nombre); return t ? t.aIngresar : 0; };
    const C4 = cuadroParticion(x, R), exT = (id) => { const e = C4 && C4.excesos.find((q) => q.id === id); return e ? e.trib.coste : 0; };
    const tot = (h) => h.aIngresar + (pp[h.nombre] || 0) + exT(h.id);
    body = cab("Qué paga cada uno", "El Impuesto sobre Sucesiones se liquida por lo que recibe cada heredero. La plusvalía de cada inmueble la paga quien se lo adjudica, o todos por su parte si queda en proindiviso.") +
      `<div class="tablewrap card" style="padding:0"><table class="grid-t ptable"><thead><tr><th>Concepto</th>${Hs.map((h) => `<th class="n">${dot(h.id)}${esc(h.nombre)}</th>`).join("")}<th class="n">Total</th></tr></thead><tbody>
      <tr><td><b>Impuesto sobre Sucesiones</b><small>${esc(R.isd.territorio)} · <button class="link" data-sec="impuestos" style="font-size:12px">ver el cálculo paso a paso ›</button></small></td>${Hs.map((h) => `<td class="n"><button class="link num" data-hsel="${h.id}">${eur(h.aIngresar)}</button></td>`).join("")}<td class="n"><b>${eur(R.isd.total)}</b></td></tr>
      ${R.plus.map(({ b, r }) => `<tr><td><b>Plusvalía · ${esc(b.descripcion || "Inmueble")}</b><small>${esc(r.municipio)}${b.adjudicadoA ? ` · la paga ${esc(persona(x, b.adjudicadoA)?.nombre || "")}` : " · en proindiviso"}</small></td>${Hs.map((h) => { const v = porNom(b, h); return `<td class="n">${v ? eur(v) : `<span class="nil">—</span>`}</td>`; }).join("")}<td class="n"><b>${eur(r.total)}</b></td></tr>`).join("")}
      ${C4 && C4.excesos.length ? `<tr><td><b>Exceso de adjudicación</b><small>${esc(C4.excesos.map((e) => e.txtCoste).join(" · "))}${C4.pendiente ? " · " + cpTag("PENDIENTE") : ""}</small></td>${Hs.map((h) => { const v = exT(h.id); return `<td class="n">${v ? eur(v) : `<span class="nil">—</span>`}</td>`; }).join("")}<td class="n"><b>${eur(C4.coste)}</b></td></tr>` : ""}
      </tbody><tfoot><tr><td>Total a pagar</td>${Hs.map((h) => `<td class="n"><b>${eur(tot(h))}</b></td>`).join("")}<td class="n"><b>${eur(R.isd.total + R.totalPlus + (C4 ? C4.coste : 0))}</b></td></tr></tfoot></table></div>
      ${!R.plus.length && PT.B.some((q) => q.inm) ? `<div class="infobar" style="margin-top:12px"><span class="ico orange">${I.info}</span><span>Falta calcular la plusvalía: completa en cada inmueble los valores catastrales y la fecha de compra.</span></div>` : ""}
      <p class="caption pnote">Plazos: seis meses desde el fallecimiento para los dos impuestos (${linkNorma("art. 67 RD 1629/1991", terr)} · ${linkNorma("art. 110 TRLRHL", terr)}). El ajuar doméstico solo cuenta a efectos del impuesto, no se reparte.</p>`;
  }
  if (k === 5) {
    const pp = plusPorHeredero(R), Hs = Object.fromEntries(R.isd.herederos.map((h) => [h.id, h]));
    const C5 = cuadroParticion(x, R), ex5 = (id) => (C5 && C5.excesos.find((q) => q.id === id)) || null;
    const compTxt = (h) => !C5 ? "" : h.dif > 0 ? C5.compensaciones.filter((c) => c.de.id === h.p.id).map((c) => `a ${esc(c.aNombre)} ${eur0(c.importe)}`).join(" · ") : C5.compensaciones.filter((c) => c.a.id === h.p.id).map((c) => `de ${esc(c.deNombre)} ${eur0(c.importe)}`).join(" · ");
    body = cab("Qué recibe, qué paga y qué le queda a cada uno", "La liquidación final de la herencia, lista para revisarla con los herederos y firmarla.") +
      `<div class="pliq">${PT.H.map((h) => { const hi = Hs[h.p.id]; const isd = hi ? hi.aIngresar : 0, pl = hi ? pp[hi.nombre] || 0 : 0, ex = ex5(h.p.id), aj = ex ? ex.trib.coste : 0; const recibe = h.haber + h.legados; const neto = recibe - isd - pl - aj;
        const items = PT.B.filter((q) => PT.cell[q.b.id][h.p.id]).map((q) => `<li><span>${esc(q.b.descripcion || TIPO_BIEN[q.b.tipo][0])}<small>${esc(PT.cell[q.b.id][h.p.id].lab)}</small></span><b class="num">${eur0(PT.cell[q.b.id][h.p.id].v)}</b></li>`).join("");
        return `<div class="card pl"><div class="pl-h">${dot(h.p.id)}<div><b>${nom(h.p)}</b><small>${esc(gnCap(gnRel(h.p)))}</small></div><div class="pl-n num"><b>${eur0(neto)}</b><small>le queda</small></div></div>
        <div class="pl-s"><div class="kick">Recibe</div><ul>${items}${h.cargasCapital > 0.5 ? `<li class="neg"><span>Deudas y gastos a su cargo</span><b class="num">−${eur0(h.cargasCapital)}</b></li>` : ""}${h.cargasUsufructo > 0.5 ? `<li class="neg"><span>Menor valor de su usufructo por deudas y gastos<small>No los paga: se pagan con bienes de la herencia y su usufructo recae sobre lo que queda (arts. 510, 643 y 818 CC)</small></span><b class="num">−${eur0(h.cargasUsufructo)}</b></li>` : ""}${Math.abs(h.dif) >= 1 ? `<li class="${h.dif > 0 ? "neg" : ""}"><span>${h.dif > 0 ? "Compensa en dinero" : "Recibe en dinero por compensación"}<small>${compTxt(h)}</small></span><b class="num">${h.dif > 0 ? "−" : "+"}${eur0(Math.abs(h.dif))}</b></li>` : ""}</ul><div class="pl-t"><span>Valor que recibe</span><b class="num">${eur0(recibe)}</b></div></div>
        <div class="pl-s"><div class="kick">Paga</div><ul><li><span>Impuesto sobre Sucesiones</span><b class="num">${eur(isd)}</b></li>${pl ? `<li><span>Plusvalía municipal</span><b class="num">${eur(pl)}</b></li>` : ""}${ex ? `<li><span>Exceso de adjudicación<small>${esc(ex.txtCoste)}</small></span><b class="num">${eur(aj)}</b></li>` : ""}</ul><div class="pl-t"><span>Total impuestos</span><b class="num">${eur(isd + pl + aj)}</b></div></div>
        <div class="pl-bar"><i style="width:${recibe > 0 ? Math.max(0, neto) / recibe * 100 : 0}%;background:var(--gold)"></i><i style="width:${recibe > 0 ? isd / recibe * 100 : 0}%;background:var(--c4)"></i><i style="width:${recibe > 0 ? (pl + aj) / recibe * 100 : 0}%;background:var(--c6)"></i></div></div>`; }).join("")}</div>
      <div class="ptools" style="margin-top:16px"><button class="btn" data-doc="cuaderno">${I.doc}Cuaderno particional</button><button class="btn gray" data-doc="recibi">Liquidación final y recibí</button><button class="btn gray" data-doc="liquidacion">Propuesta de liquidación</button></div>
      <p class="caption pnote">Cifras estimadas con la normativa vigente a la fecha del fallecimiento. El abogado revisa la partición antes de firmarla.</p>`;
  }
  return `${nav}<div class="pbody">${body}</div>${pie}`;
}

// ───────────────────── Género gramatical en documentos (P10, H36) ─────────────────────
// Dato opcional: persona.genero = "f" | "m"; abogado (despachoCfg().abogados[]).genero = "f" | "m"; x.generoCausante = "f" | "m".
// Sin el dato se usa una redacción neutra sin barras («hijo o hija», «cónyuge supérstite», sin tratamiento D./D.ª).
const GN_REL = { hijo: ["hijo", "hija", "hijo o hija"], nieto: ["nieto", "nieta", "nieto o nieta"], bisnieto: ["bisnieto", "bisnieta", "bisnieto o bisnieta"], padre: ["padre", "madre", "padre o madre"], abuelo: ["abuelo", "abuela", "abuelo o abuela"], hermano: ["hermano", "hermana", "hermano o hermana"], sobrino: ["sobrino", "sobrina", "sobrino o sobrina"], tio: ["tío", "tía", "tío o tía"], primo: ["primo", "prima", "primo o prima"], suegro: ["suegro", "suegra", "suegro o suegra"], yerno: ["yerno", "nuera", "yerno o nuera"], hijastro: ["hijastro", "hijastra", "hijastro o hijastra"], sobrino_afin: ["sobrino político", "sobrina política", "sobrino o sobrina por afinidad"], tio_afin: ["tío político", "tía política", "tío o tía por afinidad"], conyuge: ["cónyuge", "cónyuge", "cónyuge"], pareja_hecho: ["pareja de hecho", "pareja de hecho", "pareja de hecho"], pareja_no_inscrita: ["pareja de hecho no inscrita", "pareja de hecho no inscrita", "pareja de hecho no inscrita"], extrano: ["sin parentesco", "sin parentesco", "sin parentesco"] };
function gnG(p) { const g = String((p && (p.genero || p.sexo)) || "").trim().toLowerCase(); return g === "f" || g === "mujer" ? "f" : g === "m" || g === "h" || g === "hombre" ? "m" : ""; }
const gnO = (p, m, f, n) => { const g = gnG(p); return g === "f" ? f : g === "m" ? m : n == null ? `${m} o ${f}` : n; };
const gnTrat = (p) => ({ f: "D.ª ", m: "D. " })[gnG(p)] || "";
const gnCap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
// Parentesco con el causante en minúscula («hija», «hijo o hija»); con mayúscula inicial: gnCap(gnRel(p))
function gnRel(p) { const r = p && GN_REL[p.relacion]; if (!r) return String((p && RELACIONES[p.relacion]?.label) || "").toLowerCase(); const g = gnG(p); return g === "f" ? r[1] : g === "m" ? r[0] : r[2]; }
// Estado civil para documentos: con el dato, «casada en gananciales»; sin él, el sustantivo neutro («matrimonio en gananciales»)
const GN_EC = { soltero: ["soltero", "soltera", "soltería"], casado_gananciales: ["casado en gananciales", "casada en gananciales", "matrimonio en régimen de gananciales"], casado_separacion: ["casado en separación de bienes", "casada en separación de bienes", "matrimonio en separación de bienes"], casado: ["casado (otro régimen)", "casada (otro régimen)", "matrimonio (otro régimen)"], pareja: ["pareja de hecho", "pareja de hecho", "pareja de hecho"], viudo: ["viudo", "viuda", "viudedad"], divorciado: ["divorciado", "divorciada", "divorcio"], separado: ["separado legalmente", "separada legalmente", "separación legal"] };
function gnEC(p, k) { const r = GN_EC[k]; if (!r) return k || ""; const g = gnG(p); return g === "f" ? r[1] : g === "m" ? r[0] : r[2]; }
// Causante: «fallecido»/«fallecida»; sin dato, «que falleció»
const gnCaus = (x) => ({ genero: x && (x.generoCausante || x.causanteGenero) });
// Profesional: «abogada»/«abogado»; sin dato, «profesional de la abogacía». Rol: Socio → Socia, etc.
const gnAbogado = (ab) => gnO(ab, "abogado", "abogada", "profesional de la abogacía");
function gnRol(ab) { const r = String((ab && ab.rol) || ""); if (gnG(ab) !== "f") return r; return ({ Socio: "Socia", "Socio director": "Socia directora", Abogado: "Abogada", Asociado: "Asociada", Colaborador: "Colaboradora", Titular: "Titular" })[r] || r; }

// ───────────────────── Cuaderno particional: operaciones con el cuadro único (P10, H06) ─────────────────────
// Devuelve el texto de las operaciones de liquidación de gananciales y de adjudicación, con las adjudicaciones y
// compensaciones que el abogado configuró en Partición (mismo objeto que el paquete para la notaría).
function cpCuaderno(x, R) {
  const C = cuadroParticion(x, R); if (!C) return null;
  const PT = C.PT, m = R.isd.masa, der = R.isd.derechos || {};
  const nomB = (b) => b.descripcion || TIPO_BIEN[b.tipo][0];
  const frac = (f) => (Math.abs(f - 1) < 1e-9 ? "la totalidad" : `una participación indivisa de ${fracTxt(f)}`);
  const derF = (d) => d.tipo === "usufructo" ? `el usufructo vitalicio de ${frac(d.fraccion)}` : d.tipo === "nuda" ? `la nuda propiedad de ${frac(d.fraccion)}` : `el pleno dominio de ${frac(d.fraccion)}`;
  // Gananciales: activo, pasivo y remanente (art. 1404 CC: el remanente es lo que queda pagadas las deudas de la sociedad)
  const ganB = (x.bienes || []).filter((b) => b.titularidad === "ganancial");
  const activoG = ganB.reduce((s, b) => s + ((b.tipo === "vivienda" || b.tipo === "inmueble") ? Math.max(num(b.valor), num(b.valorReferencia)) : num(b.valor)), 0);
  const deudasG = (x.deudas || []).filter((d) => d.ganancial && num(d.importe) > 0);
  const pasivoG = deudasG.reduce((s, d) => s + num(d.importe), 0), remanente = activoG - pasivoG;
  const deudasP = (x.deudas || []).filter((d) => !d.ganancial && num(d.importe) > 0);
  const viudo = (x.personas || []).find((p) => cpViudo(p));
  const gan = ganB.length ? `Activo ganancial: ${eur(activoG)} (${ganB.map(nomB).join(", ")}).\nPasivo ganancial: ${pasivoG ? `${eur(pasivoG)} (${deudasG.map((d) => `${d.concepto || "deuda"}, ${eur(num(d.importe))}`).join("; ")})` : "no consta"}.\nRemanente líquido: ${eur(remanente)}, que se divide por mitad (arts. 1404 y 1344 CC): ${eur(remanente / 2)} para ${viudo ? `${gnTrat(viudo)}${viudo.nombre}, ${gnO(viudo, "cónyuge viudo", "cónyuge viuda", "cónyuge supérstite")}` : "el cónyuge supérstite"}, y ${eur(remanente / 2)} para la herencia.\nSe adjudica ${viudo ? `a ${viudo.nombre}` : "al cónyuge supérstite"}, en pago de su mitad, la mitad indivisa de cada bien ganancial, y asume la mitad del pasivo ganancial${pasivoG ? ` (${eur(pasivoG / 2)})` : ""}. La otra mitad de cada bien y del pasivo integra la herencia.` : "";
  // Adjudicaciones por heredero
  const lineas = PT.H.map((h) => {
    const id = h.p.id, L = [];
    for (const q of PT.B) {
      const c = PT.cell[q.b.id][id]; if (!c) continue;
      const parte = q.cc < 0.9999 ? ` (la parte de la herencia, ${grp(q.cc * 100, q.cc * 100 % 1 ? 2 : 0)} %)` : "";
      if (q.leg === id) L.push(`por legado, el pleno dominio de ${nomB(q.b)}${parte}, valorado en ${eur(c.v)}`);
      else if (q.adj === id) L.push(`el pleno dominio de ${nomB(q.b)}${parte}, valorado en ${eur(c.v)}${CP_INDIV(q.b) ? ", bien indivisible que se adjudica entero (art. 1062 CC)" : ""}`);
      else L.push(`${(der[id] || []).filter((d) => d.fraccion > 0).map(derF).join(" y ")} de ${nomB(q.b)}${parte}, valorado en ${eur(c.v)}`);
    }
    if (h.cargasCapital > 0.5) L.push(`asume deudas y gastos por ${eur(h.cargasCapital)}`);
    if (h.cargasUsufructo > 0.5) L.push(`su usufructo recae sobre el caudal líquido, una vez pagadas con bienes de la herencia las deudas y gastos, sin que responda de su pago (arts. 510 y 643 CC), lo que reduce su valor en ${eur(h.cargasUsufructo)}`);
    const paga = C.compensaciones.filter((c) => c.de.id === id), cobra = C.compensaciones.filter((c) => c.a.id === id);
    for (const c of paga) L.push(`abona en dinero ${eur(c.importe)} a ${c.aNombre} en compensación del exceso de adjudicación`);
    for (const c of cobra) L.push(`recibe en dinero ${eur(c.importe)} de ${c.deNombre} en compensación de lo que recibe de menos`);
    return `- A ${gnTrat(h.p)}${h.p.nombre || "—"}, en pago de su haber de ${eur(h.haber + h.legados)}: ${L.join("; ")}.`;
  }).join("\n");
  const exc = C.excesos.map((e) => `Exceso de adjudicación de ${e.nombre}: ${eur(e.exceso)}${e.bienesEnteros.some((b) => b.indivisible) ? `, que nace de adjudicarle entero ${e.bienesEnteros.filter((b) => b.indivisible).map((b) => nomB(b.b)).join(", ")}, bien indivisible o que desmerece mucho con su división (art. 1062 CC)` : ""}. Se compensa en dinero: ${cpLista(C.compensaciones.filter((c) => c.de.id === e.id).map((c) => `${eur(c.importe)} a ${c.aNombre}`))}.`).join("\n");
  const rev = C.excesos.map((e) => `${e.nombre}: exceso inevitable ${eur(e.inevitable)}${e.evitable > 0.5 ? `, evitable ${eur(e.evitable)}` : ""}. Tributación prevista: ${e.txtCoste} (${C.T.ajdNorma}).${e.sugerencia ? " " + e.sugerencia : ""}${e.falta > 0.5 ? ` Su dinero disponible (${eur(e.liquido)}) no cubre la compensación: faltan ${eur(e.falta)}; prever pago aplazado con garantía, proindiviso o venta (art. 1062 CC).` : ""}`).join(" ");
  return { C, gan, lineas, exc, rev, hayComp: C.compensaciones.length > 0, deudasP, pasivoG };
}
