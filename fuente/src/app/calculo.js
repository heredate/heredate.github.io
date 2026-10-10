// ───────────────────── {{MARCA}} · cálculo visual, simulador y flujo del patrimonio ─────────────────────
// Presentación de los resultados del motor: no calcula impuestos por su cuenta.

// ── Normas enlazadas al texto oficial ──
function normaDe(txt, terr) {
  if (BIBLIO.pendiente) heredaParteYRepintar("biblioteca"); // partes.js: la biblioteca llega aparte en la app publicada
  const s = String(txt || "");
  for (const n of BIBLIO.estatal) if (PATRON_EST[n.id] && PATRON_EST[n.id].test(s)) return n;
  const k = numLey(s); if (k) for (const n of BIBLIO.autonomica[terr] || []) if (numLey(n.nombre) === k) return n;
  return null;
}
function linkNorma(txt, terr) {
  if (!txt) return "";
  const n = normaDe(txt, terr); const u = n ? enlaceArt(n, txt) || n.url : "";
  return u ? `<a class="nlink" href="${esc(u)}" target="_blank" rel="noopener">${esc(txt)}</a>` : `<span>${esc(txt)}</span>`;
}
const decEs = (t) => String(t).replace(/(\d)\.(\d)/g, "$1,$2");
const pct1 = (f) => grp(f * 100, f * 100 < 10 && f * 100 % 1 ? 1 : 0) + " %";
// H23: porcentaje que viene de una regla (ordenanza, ley, cuota de titularidad) con hasta dos decimales y sin ceros de más: 0,375 → «37,5 %»
const pctRegla = (f) => { const v = Math.round(num(f) * 10000) / 100; return grp(v, v % 1 ? (Math.round(v * 10) / 10 === v ? 1 : 2) : 0) + " %"; };

// ── Sucesiones: escalera de cada heredero ──
const HITOS = ["Porción hereditaria", "Base imponible", "Base liquidable", "Cuota íntegra", "A pagar"];
function partesISD(h) {
  const T = h.traza, ix = (n) => T.findIndex((t) => t.paso === n);
  const iBI = ix("Base imponible"), iBL = ix("Base liquidable"), iCI = ix("Cuota íntegra"), iAP = ix("A pagar");
  return { T, iBI, iBL, iCI, iAP, bi: h.baseImponible, bl: h.baseLiquidable, ci: h.cuotaIntegra, ct: h.cuotaTributaria, ap: h.aIngresar };
}
function narrativaISD(h, pp = 0) {
  const P = partesISD(h), red = Math.max(0, P.bi - P.bl), tot = P.ap + pp;
  const reds = P.T.slice(P.iBI + 1, P.iBL).filter((t) => t.valor < 0).map((t) => t.paso.replace(/^Reducción\s*/i, "").replace(/\s*\(.*\)$/, "").toLowerCase());
  const bon = P.T.slice(P.iCI + 1, P.iAP).find((t) => /Bonificación/i.test(t.paso));
  const coef = P.T.slice(P.iCI + 1, P.iAP).find((t) => /Coeficiente/i.test(t.paso));
  const pv = [`Recibe ${eur0(h.valorAdquirido)}.`];
  if (red > 0) pv.push(`${reds.length > 1 ? "Las reducciones" : "La reducción"} ${esc(reds.length > 1 ? reds.slice(0, -1).join(", ") + " y " + reds[reds.length - 1] : reds[0] || "")} ${reds.length > 1 ? "restan" : "resta"} ${eur0(red)} y la base liquidable queda en ${eur0(P.bl)}.`);
  if (P.bl <= 0) pv.push("No queda base sobre la que aplicar la tarifa: <b>no paga Sucesiones</b>.");
  else {
    let s = `La tarifa da una cuota de ${eur0(P.ci)}, un tipo medio del ${pct1(P.ci / P.bl)}`;
    const m = coef && /×\s*([\d,.]+)/.exec(coef.paso); if (m && m[1] !== "1") s += `, multiplicada por el coeficiente ${decEs(m[1])} por parentesco y patrimonio`;
    if (bon && bon.valor < 0) s += `; la ${esc(bon.paso.toLowerCase())} la deja en ${eur0(P.ap)}`;
    pv.push(s + ".", `Paga <b>${eur0(P.ap)}</b> de Sucesiones.`);
  }
  if (pp > 0.5) pv.push(`${P.ap > 0.5 ? "Además, le" : "Le"} corresponden <b>${eur0(pp)}</b> de plusvalía municipal.`);
  if (tot > 0.5) pv.push(`${pp > 0.5 && P.ap > 0.5 ? `En total, ${eur0(tot)}: el` : "Es el"} ${pct1(h.valorAdquirido ? tot / h.valorAdquirido : 0)} de lo que recibe.`);
  return pv.join(" ");
}
function escaleraISD(h, terr) {
  const P = partesISD(h), T = P.T;
  // Una sola escala para toda la escalera: la cuota se lee como parte de la base.
  const S = Math.max(1, P.bi, T[0]?.valor || 0, P.ci, P.ct);
  const pc = (v) => Math.max(0, v) / S * 100;
  const fila = (t, cls, a, w, val, extra = "", ghost = 0) => `<div class="sr ${cls}"><div class="sr-l"><span class="sr-n">${esc(decEs(t.paso))}</span>${t.norma ? `<span class="sr-c">${linkNorma(t.norma, terr)} ${tagE(t.estado)}</span>` : ""}${extra}</div><div class="sr-b">${ghost ? `<em style="width:${ghost}%"></em>` : ""}<i style="left:${a}%;width:${Math.max(w > 0 ? 0.8 : 0, w)}%"></i></div><div class="sr-v num">${val}</div></div>`;
  let run = 0, h1 = "";
  T.slice(0, P.iBL + 1).forEach((t, i) => {
    if (HITOS.includes(t.paso)) { run = t.valor; h1 += fila(t, i === P.iBL ? "hito fin" : "hito", 0, pc(t.valor), eur(t.valor)); return; }
    if (t.valor >= 0) { h1 += fila(t, "suma" + (Math.abs(t.valor) < 0.005 ? " cero" : ""), pc(run), pc(t.valor), "+" + eur(t.valor)); run += t.valor; return; }
    const apl = Math.min(-t.valor, Math.max(0, run)), de = run - apl;
    h1 += fila(t, "resta" + (apl < 0.005 ? " cero" : ""), pc(de), pc(apl), "−" + eur(-t.valor), apl + 0.5 < -t.valor ? `<span class="sr-x">${apl < 0.005 ? "No se aplica: la base ya es cero." : `Se aplican ${eur(apl)}: la reducción no puede superar la base.`}</span>` : "");
    run = de;
  });
  let h2 = "";
  if (P.bl > 0) {
    const gh = pc(P.bl);
    let r2 = 0;
    T.slice(P.iCI).forEach((t, i) => {
      const fin = t.paso === "A pagar";
      if (i === 0 || /Coeficiente/.test(t.paso) || fin) { r2 = t.valor; h2 += fila(t, fin ? "hito pagar" : "hito", 0, pc(t.valor), eur(t.valor), "", gh); return; }
      if (t.valor < 0) { const apl = Math.min(-t.valor, r2); h2 += fila(t, "resta", pc(r2 - apl), pc(apl), "−" + eur(-t.valor), "", gh); r2 -= apl; }
      else { h2 += fila(t, "suma", pc(r2), pc(t.valor), "+" + eur(t.valor), "", gh); r2 += t.valor; }
    });
  }
  return `<div class="stairs"><div class="sr-sec">De lo que recibe a la base</div>${h1}${P.bl > 0 ? `<div class="sr-sec">De la base a lo que paga <span>tipo medio ${pct1(P.ci / P.bl)} · <em class="sr-key"></em>base liquidable</span></div>${h2}` : `<div class="sr hito pagar"><div class="sr-l"><span class="sr-n">A pagar</span></div><div class="sr-b"></div><div class="sr-v num">${eur(0)}</div></div>`}</div>`;
}
// Anillo: parte de lo recibido que se va en impuestos (Sucesiones + plusvalía).
function anilloTipo(fs, fp, size = 112) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, cx = size / 2;
  const a = Math.max(0, Math.min(1, fs)), b = Math.max(0, Math.min(1 - a, fp)), tot = a + b;
  const len = (f) => f > 0 ? Math.max(2.5, f * c) : 0;
  const la = len(a), lb = len(b), sep = la && lb ? 2 : 0;
  const arc = (cls, l, off) => l ? `<circle cx="${cx}" cy="${cx}" r="${r}" class="${cls}" stroke-dasharray="${Math.max(0.5, l - sep).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 ${cx} ${cx})"/>` : "";
  return `<svg class="tring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Impuestos: ${pct1(tot)} de lo que recibe"><circle cx="${cx}" cy="${cx}" r="${r}" class="bg"/>${arc("s", la, 0)}${arc("p", lb, la)}<text x="50%" y="49%" text-anchor="middle" class="t1">${pct1(tot)}</text><text x="50%" y="65%" text-anchor="middle" class="t2">de lo que recibe</text></svg>`;
}
function panelHeredero(x, R, h) {
  const pp = plusPorHeredero(R)[h.nombre] || 0, terr = x.ccaa === "EST" ? x.ccaaBienes || "EST" : x.ccaa;
  const tot = h.aIngresar + pp, va = h.valorAdquirido || 0;
  return `<div class="hpanel"><div class="hp-top"><div class="hp-id"><div class="kick">${esc(RELACIONES[h.relacion].label)} · grupo ${esc(h.grupo)}</div><h3>${esc(h.nombre)}</h3><p class="hp-nar">${narrativaISD(h, pp)}</p></div>
    <div class="hp-fig">${anilloTipo(va ? h.aIngresar / va : 0, va ? pp / va : 0)}<div class="kv sm"><span><i class="kd s"></i>Sucesiones</span><span>${eur(h.aIngresar)}</span><span><i class="kd p"></i>Plusvalía</span><span>${eur(pp)}</span><span class="b">Total</span><span class="b">${eur(tot)}</span></div></div></div>
    ${escaleraISD(h, terr)}</div>`;
}
function tablaHerederos(R, sel) {
  const pp = plusPorHeredero(R);
  const L = R.isd.herederos.map((h) => ({ h, pl: pp[h.nombre] || 0 }));
  const t = L.reduce((s, { h, pl }) => ({ v: s.v + h.valorAdquirido, bl: s.bl + h.baseLiquidable, i: s.i + h.aIngresar, p: s.p + pl }), { v: 0, bl: 0, i: 0, p: 0 });
  return `<div class="tablewrap card" style="padding:0"><table class="grid-t hcmp"><thead><tr><th>Heredero</th><th class="n">Recibe</th><th class="n">Base liquidable</th><th class="n">Sucesiones</th><th class="n">Plusvalía</th><th class="n">Total</th><th class="n"><span class="w-l">Sobre lo recibido</span><span class="w-s">%</span></th></tr></thead><tbody>${L.map(({ h, pl }) => `<tr data-hsel="${h.id}" class="${h.id === sel ? "on" : ""}"${h.id === sel ? ' aria-current="true"' : ""}><td><b>${esc(h.nombre)}</b><small>${esc(RELACIONES[h.relacion].label)} · grupo ${esc(h.grupo)}</small></td><td class="n">${eur0(h.valorAdquirido)}</td><td class="n">${eur0(h.baseLiquidable)}</td><td class="n">${eur(h.aIngresar)}</td><td class="n">${eur(pl)}</td><td class="n"><b>${eur(h.aIngresar + pl)}</b></td><td class="n">${pct1(h.valorAdquirido ? (h.aIngresar + pl) / h.valorAdquirido : 0)}</td></tr>`).join("")}</tbody><tfoot><tr><td>Total</td><td class="n">${eur0(t.v)}</td><td class="n">${eur0(t.bl)}</td><td class="n">${eur(t.i)}</td><td class="n">${eur(t.p)}</td><td class="n"><b>${eur(t.i + t.p)}</b></td><td class="n">${pct1(t.v ? (t.i + t.p) / t.v : 0)}</td></tr></tfoot></table></div>`;
}

// ── Plusvalía: la fórmula dibujada ──
function formulaPlus(x, b, r) {
  const terr = x.ccaa;
  const suelo = r.coeficiente ? r.baseObjetiva / r.coeficiente : 0;
  const cc = cuotaCausante({ titularidad: b.titularidad, porcentaje: pctCausante(b.porcentaje) });
  const vt = Math.max(num(b.valor), num(b.valorReferencia)), va = num(b.valorAdq);
  const prop = num(b.valorCatastralSuelo) / (num(b.valorCatastralTotal) || 1);
  const fx = (k, v, s, cls = "") => `<div class="fx ${cls}"><span class="k">${k}</span><b class="num">${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
  const op = (o) => `<span class="op">${o}</span>`;
  const mx = Math.max(r.baseObjetiva, r.baseReal, 1);
  const mq = Math.max(1, ...(r.porTitular || []).map((q) => q.cuota));
  const cmp = (n, v, on, s) => `<div class="cmp-r ${on ? "on" : ""}"><span class="n">${n}${on ? '<span class="aplica">se aplica</span>' : ""}${s ? `<small>${s}</small>` : ""}</span><span class="t"><i style="width:${Math.max(0.8, v / mx * 100)}%"></i></span><span class="v num">${eur(v)}</span></div>`;
  return `<div class="card fcard"><div class="fc-h"><div><div class="kick">${esc(r.municipio)} ${tagE(r.estadoTipo)}</div><h3>${esc(b.descripcion || "Inmueble")}</h3></div><div class="amt num">${eur(r.total)}<small>a pagar entre todos</small></div></div>
    ${plusEstimacionHTML(b, r)}
    ${r.noSujeto ? `<div class="infobar"><span class="ico green">${I.tick}</span><span><b>No sujeto.</b> No hubo ganancia: se vende o valora por ${eur0(vt)} y costó ${eur0(va)} (art. 104.5 ${linkNorma("TRLRHL", terr)}).</span></div>` : `
    <div class="sr-sec">1. Base: se calculan dos y se usa la menor</div>
    <div class="formula">${fx("Valor catastral del suelo", eur0(suelo), cc < 1 ? `el ${pctRegla(cc)} del causante` : "")}${op("×")}${fx("Coeficiente", grp(r.coeficiente, 2), esc(r.notaCoef))}${op("=")}${fx("Base objetiva", eur0(r.baseObjetiva), "", r.metodo === "objetivo" ? "hi" : "")}</div>
    <div class="cmpbars">${cmp("Método objetivo", r.baseObjetiva, r.metodo === "objetivo", `art. 107.4 ${linkNorma("TRLRHL", terr)}`)}${cmp("Método real", r.baseReal, r.metodo === "real", `ganancia ${eur0(Math.max(0, (vt - va) * cc))} × ${pctRegla(prop)} de suelo`)}</div>
    <div class="sr-sec">2. Cuota</div>
    <div class="formula">${fx("Base", eur0(r.base), r.metodo === "real" ? "método real" : "método objetivo")}${op("×")}${fx("Tipo", grp(r.tipo * 100, r.tipo * 100 % 1 ? 2 : 0) + " %", r.fuenteTipo === "manual" ? "introducido a mano" : r.fuenteTipo === "hacienda" ? "datos de Hacienda 2026" : r.estimacion ? "máximo legal" : "ordenanza municipal")}${op("=")}${fx("Cuota", eur(r.cuota), "", "hi plu")}</div>
    <div class="sr-sec">3. Bonificación y pago por heredero</div>
    <div class="ptit">${r.porTitular.map((q) => `<div class="pt"><div class="pt-l"><b>${esc(q.heredero)}</b><small>${pctRegla(q.fraccion)} de la cuota · ${eur(q.cuota)}</small>${q.norma ? `<small class="nrm">${linkNorma(q.norma, terr)} ${tagE(q.estado)}</small>` : ""}</div><div class="pt-b" title="Bonificación ${pctRegla(q.bonificacionPct)}"><span style="width:${Math.max(1, q.cuota / mq * 100)}%"><i class="bon" style="width:${q.bonificacionPct * 100}%"></i><i class="pay" style="width:${(1 - q.bonificacionPct) * 100}%"></i></span></div><div class="pt-v num">${eur(q.aIngresar)}<small>${q.bonificacionPct ? `bonificación ${pctRegla(q.bonificacionPct)}` : "sin bonificación"}</small></div></div>`).join("")}</div>`}
    ${(r.estimacion ? (r.alertas || []).slice(1) : r.alertas || []).map((a) => `<p class="caption" style="margin:10px 0 0">${esc(a)}</p>`).join("")}</div>`;
}
// Municipio sin ordenanza incorporada: aviso de estimación prudente (30 %, coeficientes máximos, sin bonificación) y acceso en un clic
// a los campos de tipo y bonificación de la ficha del bien. Con el tipo introducido a mano, se dice de dónde sale.
function plusEstimacionHTML(b, r) {
  const E = r.estimacion; if (!E) return "";
  const nom = E.municipio, bop = E.bop && E.bop.url ? ` La ordenanza se publica en el <a href="${esc(E.bop.url)}" target="_blank" rel="noopener">${esc(E.bop.nombre || "boletín oficial de la provincia")} ↗</a>.` : "";
  const hac = ` Si tiene más de 1.000 habitantes, su tipo está en la <a href="${esc(HACIENDA_IIVTNU_URL)}" target="_blank" rel="noopener">consulta de Hacienda ↗</a> (elige provincia y municipio).`;
  const F = r.foral, foral = E.foral ? ` Territorio foral: se calcula con la norma foral${F ? ` de ${esc(F.nombre)}` : ""}; sus coeficientes están pendientes de cotejo y la cifra es orientativa.` : "";
  if (E.manual) return `<div class="infobar plus-est"><span class="ico green">${I.tick}</span><span><b>Tipo y bonificación introducidos a mano${nom ? ` según la ordenanza de ${esc(nom)}` : ""}.</b> Coeficientes limitados al máximo legal.${bop} <button class="link" data-editb="${b.id}" data-mm="1">Revisar</button></span></div>`;
  if (E.hacienda) return `<div class="infobar plus-est"><span class="ico green">${I.tick}</span><span><b>Tipo oficial de ${esc(nom || r.municipio)}: ${grp(r.tipo * 100, r.tipo * 100 % 1 ? 2 : 0)} %</b>, el que el Ayuntamiento comunica al Ministerio de Hacienda para 2026. Coeficientes máximos legales y ${E.bonifManual ? `bonificación del ${grp(E.bonifManual, E.bonifManual % 1 ? 2 : 0)} % introducida a mano` : "sin bonificación: Hacienda no publica las bonificaciones, así que la cuota real será igual o menor si la ordenanza prevé alguna"}.${bop} <button class="link" data-editb="${b.id}" data-mm="1">${E.bonifManual ? "Revisar" : "Introducir la bonificación"}</button></span></div>`;
  return `<div class="infobar plus-est"><span class="ico gold">${I.info}</span><span><b>Como máximo ${eur(r.total)}${nom ? `; consulta la ordenanza de ${esc(nom)}` : ""}.</b> ${F ? `Tipo del ${grp(F.tipoMax * 100, 0)} % (máximo foral), coeficientes máximos forales${F.exencion ? ", exención legal de las herencias en línea recta y entre cónyuges" : ""}` : "Tipo del 30 % (máximo legal, art. 108.1 TRLRHL), coeficientes máximos (art. 107.4)"} y ${E.bonifManual ? `la bonificación del ${grp(E.bonifManual, E.bonifManual % 1 ? 2 : 0)} % introducida` : "sin bonificación"}: la cuota real será igual o menor.${hac}${bop}${foral} <button class="link" data-editb="${b.id}" data-mm="1">Introducir el tipo y la bonificación</button></span></div>`;
}

// ── Simulador «¿Y si…?» ──
function simEstado(x) { if (!ui.sim || ui.sim.id !== x.id) ui.sim = { id: x.id, ren: {}, val: {}, plazo: null, noViv: null }; return ui.sim; }
const simActivo = (s) => Object.keys(s.ren).length || Object.keys(s.val).some((k) => s.val[k] !== 1) || s.plazo !== null || s.noViv !== null;
function aplicarSim(x, s) {
  const c = JSON.parse(JSON.stringify(x));
  for (const p of c.personas || []) if (s.ren[p.id] !== undefined) p.renuncia = s.ren[p.id];
  for (const b of c.bienes || []) if (s.val[b.id] && s.val[b.id] !== 1) b.valor = Math.round(num(b.valor) * s.val[b.id]);
  if (s.plazo !== null) { c.enPlazo = s.plazo; c.enPlazoManual = true; } // C2 (QA 07-10-2026)
  if (s.noViv !== null) c.noAplicarVivienda = s.noViv;
  return c;
}
function simulador(x, R) {
  const s = simEstado(x), act = simActivo(s);
  let Rs = null; if (act) { try { Rs = calcular(aplicarSim(x, s)); } catch (e) { Rs = null; } }
  const base = R.isd.total + R.totalPlus, nuevo = Rs ? Rs.isd.total + Rs.totalPlus : base, d = nuevo - base;
  const sw = (k, id, on, t, sub) => `<div class="row toggle"><span class="t"><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</span><label class="switch"><input type="checkbox" data-sim="${k}" data-id="${id}" ${on ? "checked" : ""}><span></span></label></div>`;
  const pers = (x.personas || []).filter((p) => !p.renuncia || s.ren[p.id] !== undefined);
  const inm = (x.bienes || []).filter((b) => num(b.valor) > 0 && (esInm(b) || b.tipo === "valores" || b.tipo === "empresa"));
  const slider = (b) => { const f = s.val[b.id] || 1, v = Math.round(num(b.valor) * f), ref = num(b.valorReferencia), minF = ref ? Math.min(1, Math.ceil(ref / num(b.valor) * 100) / 100) : 0.7; return `<div class="field sim-r"><label for="sv-${b.id}">${esc(b.descripcion || TIPO_BIEN[b.tipo][0])}<span class="num" id="svl-${b.id}">${eur0(v)}${f !== 1 ? ` · ${f > 1 ? "+" : "−"}${grp(Math.abs(f - 1) * 100, 0)} %` : ""}</span></label><input type="range" id="sv-${b.id}" data-simval="${b.id}" data-base="${num(b.valor)}" min="${Math.max(0.5, minF)}" max="1.5" step="0.01" value="${f}">${ref ? `<span class="hint">${ref > v ? `Tributa por el valor de referencia, ${eur0(ref)}, mientras el declarado sea menor.` : `No tributa por menos del valor de referencia, ${eur0(ref)}.`}</span>` : ""}</div>`; };
  const pp0 = plusPorHeredero(R), pp1 = Rs ? plusPorHeredero(Rs) : pp0;
  const filas = (Rs || R).isd.herederos.map((h) => { const h0 = R.isd.herederos.find((q) => q.id === h.id); const a = h0 ? h0.aIngresar + (pp0[h0.nombre] || 0) : 0, b2 = h.aIngresar + (pp1[h.nombre] || 0), dd = b2 - a; return `<div class="sim-h"><span>${esc(h.nombre)}</span><span class="num">${eur0(a)}</span><span class="arrow">→</span><span class="num"><b>${eur0(b2)}</b></span><span class="num dl ${dd > 0.5 ? "up" : dd < -0.5 ? "down" : ""}">${Math.abs(dd) > 0.5 ? (dd > 0 ? "+" : "−") + eur0(Math.abs(dd)) : "="}</span></div>`; }).join("");
  const out = (R.isd.herederos || []).filter((h) => !(Rs || R).isd.herederos.some((q) => q.id === h.id)).map((h) => `<div class="sim-h out"><span>${esc(h.nombre)}</span><span class="caption">renuncia: su parte acrece a los demás</span></div>`).join("");
  return `<div class="card sim"><div class="card-h"><div><div class="k">Simulador · no cambia el expediente</div><h3>¿Y si…?</h3></div>${act ? `<button class="link" data-act="simReset">Restablecer</button>` : ""}</div>
    <div class="sim-grid"><div class="sim-c">
      ${pers.length ? `<div class="sectitle" style="margin-top:0">Renuncias</div><div class="group">${pers.map((p) => sw("ren", p.id, s.ren[p.id] ?? !!p.renuncia, esc(p.nombre || "Sin nombre"), esc(RELACIONES[p.relacion].label))).join("")}</div>` : ""}
      ${inm.length ? `<div class="sectitle">Valor declarado</div><div class="group">${inm.map(slider).join("")}</div>` : ""}
      <div class="sectitle">Presentación</div><div class="group">${sw("plazo", "", s.plazo ?? (typeof enPlazoExp === "function" ? enPlazoExp(x) : x.enPlazo !== false), "Dentro de plazo", "Fuera de plazo hay recargos (art. 27 LGT); solo algunas comunidades quitan además bonificaciones")}${sw("noViv", "", !(s.noViv ?? !!x.noAplicarVivienda), "Reducción por vivienda habitual", "Se pierde si se vende antes del plazo de mantenimiento")}</div>
    </div><div class="sim-o">
      <div class="sim-tot${act ? "" : " idle"}"><div><div class="k">Ahora</div><b class="num">${eur0(base)}</b></div><span class="arrow">→</span><div><div class="k">Con los cambios</div><b class="num">${eur0(nuevo)}</b></div></div>
      <div class="sim-d ${d > 0.5 ? "up" : d < -0.5 ? "down" : ""}">${!act ? "Cambia un control para ver el efecto en los impuestos." : Math.abs(d) < 0.5 ? "Sin efecto en los impuestos." : `${d > 0 ? "Pagarían" : "Ahorrarían"} <b class="num">${eur0(Math.abs(d))}</b> ${d > 0 ? "más" : "en total"}`}</div>
      <div class="sim-list">${filas}${out}</div>
      ${act ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn sm" data-act="simGuardar">Guardar como escenario</button></div>` : ""}
    </div></div></div>`;
}

// ── Flujo del patrimonio (diagrama de Sankey) ──
function flujo(x, R) {
  const m = R.isd.masa, pp = plusPorHeredero(R);
  const B = (x.bienes || []).map((b) => { const v = Math.max(num(b.valor), num(b.valorReferencia)); const cc = cuotaCausante({ titularidad: b.titularidad, porcentaje: pctCausante(b.porcentaje) }); return { b, v, her: v * cc, viu: b.titularidad === "ganancial" ? v * 0.5 : 0, cop: b.titularidad === "proindiviso" ? v * (1 - cc) : 0 }; }).filter((q) => q.v > 0).sort((a, b) => b.v - a.v);
  if (!B.length) return "";
  const TOT = B.reduce((s, q) => s + q.v, 0), HER = B.reduce((s, q) => s + q.her, 0), VIU = B.reduce((s, q) => s + q.viu, 0), COP = B.reduce((s, q) => s + q.cop, 0);
  const DG = Math.min(HER, (m.deudas || 0) + (m.gastos || 0)), NETO = Math.max(0, HER - DG);
  const H = R.isd.herederos.filter((h) => h.valorAdquirido > 0), sv = H.reduce((s, h) => s + h.valorAdquirido, 0) || 1;
  const HS = H.map((h) => { const sh = NETO * h.valorAdquirido / sv; const isd = Math.min(sh, h.aIngresar), pl = Math.min(sh - isd, pp[h.nombre] || 0); return { h, sh, isd, pl, net: sh - isd - pl }; }).sort((a, b) => b.sh - a.sh);
  const SUC = HS.reduce((s, q) => s + q.isd, 0), PLU = HS.reduce((s, q) => s + q.pl, 0), FAM = HS.reduce((s, q) => s + q.net, 0);
  const TXT = { fam: "Neto para los herederos", suc: "Sucesiones", plu: "Plusvalía municipal", dg: "Deudas y gastos", viu: "Cónyuge · mitad de gananciales", cop: "Otros copropietarios" };
  // ── Diagrama (pantallas medianas y grandes) ──
  const W = 940, nw = 8, gap = 14, top = 34, bot = 8, LH = 38;
  const nMax = Math.max(B.length, 1 + (VIU > 0) + (COP > 0), HS.length + (DG > 0), 1 + (SUC > 0.5) + (PLU > 0.5), 3);
  const Hh = Math.round(Math.max(360, Math.min(660, 70 + 64 * nMax)));
  const sc = (Hh - top - bot - gap * (nMax - 1)) / TOT;
  const X = [0, 290, 560, W - nw];
  const col = (L, xi) => { let y = top; return L.map((n) => { const hgt = Math.max(2, n.v * sc); const o = { ...n, x: X[xi], c: xi, y, h: hgt }; y += hgt + gap; return o; }); };
  const A = col(B.map((q) => ({ id: "b" + q.b.id, v: q.v, name: q.b.descripcion || TIPO_BIEN[q.b.tipo][0], cls: "n-bien" })), 0);
  const Bn = col([{ id: "her", v: HER, name: "Herencia", cls: "n-her" }, ...(VIU > 0 ? [{ id: "viu", v: VIU, name: TXT.viu, cls: "n-otro" }] : []), ...(COP > 0 ? [{ id: "cop", v: COP, name: TXT.cop, cls: "n-otro" }] : [])], 1);
  const Cn = col([...HS.map((q) => ({ id: "h" + q.h.id, v: q.sh, name: q.h.nombre, cls: "n-herd" })), ...(DG > 0 ? [{ id: "dg", v: DG, name: TXT.dg, cls: "n-otro" }] : [])], 2);
  const Dn = col([{ id: "fam", v: FAM, name: TXT.fam, cls: "n-fam" }, ...(SUC > 0.5 ? [{ id: "suc", v: SUC, name: TXT.suc, cls: "n-suc" }] : []), ...(PLU > 0.5 ? [{ id: "plu", v: PLU, name: TXT.plu, cls: "n-plu" }] : [])], 3);
  const all = [...A, ...Bn, ...Cn, ...Dn], byId = Object.fromEntries(all.map((n) => [n.id, n]));
  const links = [];
  const L = (a, b, v, cls) => { if (v <= 0.5) return; links.push({ a: byId[a], b: byId[b], v, cls, t: Math.max(1.2, v * sc) }); };
  for (const q of B) { L("b" + q.b.id, "her", q.her, "l-her"); if (q.viu) L("b" + q.b.id, "viu", q.viu, "l-otro"); if (q.cop) L("b" + q.b.id, "cop", q.cop, "l-otro"); }
  for (const q of HS) L("her", "h" + q.h.id, q.sh, "l-her");
  if (DG > 0) L("her", "dg", DG, "l-otro");
  for (const q of HS) { L("h" + q.h.id, "fam", q.net, "l-fam"); if (q.isd) L("h" + q.h.id, "suc", q.isd, "l-suc"); if (q.pl) L("h" + q.h.id, "plu", q.pl, "l-plu"); }
  // Puertos ordenados por la posición del otro extremo: menos cruces.
  for (const n of all) {
    let o = 0; for (const k of links.filter((k) => k.a === n).sort((p, q) => p.b.y - q.b.y)) { k.y0 = n.y + o; o += k.t; }
    let i = 0; for (const k of links.filter((k) => k.b === n).sort((p, q) => p.a.y - q.a.y)) { k.y1 = n.y + i; i += k.t; }
  }
  const paths = links.map((k) => {
    const x0 = k.a.x + nw, x1 = k.b.x, xm = (x0 + x1) / 2, { y0, y1, t } = k;
    return `<path class="lk ${k.cls}" d="M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + t}C${xm},${y1 + t} ${xm},${y0 + t} ${x0},${y0 + t}Z"><title>${esc(k.a.name)} → ${esc(k.b.name)}: ${eur0(k.v)}</title></path>`;
  }).join("");
  // Etiquetas: centradas en su nodo, separadas lo justo para no pisarse.
  for (const C of [A, Bn, Cn, Dn]) {
    let prev = -Infinity; for (const n of C) { n.ty = Math.max(n.y + n.h / 2 - 2, prev + LH); prev = n.ty; }
    for (let i = C.length - 1, lim = Hh - 20; i >= 0; i--) { C[i].ty = Math.min(C[i].ty, lim); lim = C[i].ty - LH; }
  }
  const nodes = all.map((n) => { const right = n.c === 3, tx = right ? n.x - 10 : n.x + nw + 10, an = right ? "end" : "start";
    return `<g class="nd-g"><title>${esc(n.name)}: ${eur0(n.v)}</title><rect class="nd ${n.cls}" x="${n.x}" y="${n.y}" width="${nw}" height="${n.h}" rx="2"/><text class="nl" x="${tx}" y="${n.ty}" text-anchor="${an}">${esc(corta(n.name, 36))}</text><text class="nv" x="${tx}" y="${n.ty + 16}" text-anchor="${an}">${eur0(n.v)}</text></g>`; }).join("");
  const heads = ["Bienes", "Herencia", "Herederos", "Destino"].map((t, i) => `<text class="ch" x="${i === 3 ? W : X[i]}" y="14" text-anchor="${i === 3 ? "end" : "start"}">${t}</text>`).join("");
  // ── Lista (móvil): cada heredero, lo que recibe y adónde va ──
  const mx = Math.max(1, ...HS.map((q) => q.sh));
  const seg = (v, cls, base) => v > 0.5 ? `<i class="${cls}" style="width:${v / base * 100}%"></i>` : "";
  const fila = (n, tot, net, isd, pl, dg, base, cls = "") => `<div class="fm-r ${cls}"><div class="fm-h"><b>${n}</b><span class="num"><b>${eur0(net)}</b> de ${eur0(tot)}</span></div><div class="fm-b"><span style="width:${tot / base * 100}%">${seg(net, "f", tot)}${seg(isd, "s", tot)}${seg(pl, "p", tot)}${seg(dg, "d", tot)}</span></div><div class="fm-s">${[isd > 0.5 ? `Sucesiones ${eur0(isd)}` : "", pl > 0.5 ? `Plusvalía ${eur0(pl)}` : "", dg > 0.5 ? `Deudas y gastos ${eur0(dg)}` : ""].filter(Boolean).join(" · ") || "Sin impuestos"}</div></div>`;
  const lista = `<div class="flujo-m">${HS.map((q) => fila(esc(q.h.nombre), q.sh, q.net, q.isd, q.pl, 0, mx)).join("")}${HS.length > 1 || DG > 0 ? fila("Toda la herencia", HER, FAM, SUC, PLU, DG, HER, "tot") : ""}${VIU > 0 || COP > 0 ? `<p class="fm-n">${[VIU > 0 ? `${eur0(VIU)} son la mitad de gananciales del cónyuge y no forman parte de la herencia.` : "", COP > 0 ? `${eur0(COP)} pertenecen a otros copropietarios.` : ""].filter(Boolean).join(" ")}</p>` : ""}</div>`;
  const leg = [[FAM, "var(--gold)", TXT.fam], [SUC, "var(--c4)", TXT.suc], [PLU, "var(--c6)", TXT.plu], [DG, "var(--label-3)", TXT.dg]].filter(([v]) => v > 0.5);
  return `<div class="flujo"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Flujo del patrimonio: de los bienes a los herederos, lo que les queda y los impuestos">${heads}${paths}${nodes}</svg></div>${lista}
    <div class="legend-inline fl-leg">${leg.map(([v, c, t]) => `<span><i style="background:${c}"></i>${t} <b class="num">${eur0(v)}</b></span>`).join("")}</div>`;
}
