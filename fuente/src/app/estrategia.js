// ───────────────────── {{MARCA}} · arquitectura fiscal ─────────────────────
// Palancas lícitas de los herederos tras el fallecimiento. Reglas R0-R8 de la mesa jurídico-fiscal (research/estrategia-fiscal.md).
// Cada palanca se calcula simulando el expediente con el cambio y comparando el coste fiscal total (Sucesiones + plusvalía + excesos).
const EP = { LIM_VIV: 122606.47, TPO_INM: 0.07, TPO_MUE: 0.04, AJD_AND: 0.012, I_DEMORA: 0.040625, UMBRAL: 100 };
const ESCALA_AHORRO = [[6000, 0.19], [50000, 0.21], [200000, 0.23], [300000, 0.27], [Infinity, 0.30]]; // IRPF, base del ahorro (escala estatal + autonómica 2025; confirmar 2026)
const irpfAhorro = (g) => { let prev = 0, t = 0; for (const [lim, p] of ESCALA_AHORRO) { if (g <= prev) break; t += (Math.min(g, lim) - prev) * p; prev = lim; } return t; };
const clonX = (x) => JSON.parse(JSON.stringify(x));
const terrX = (x) => (x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa);
// Coste fiscal de un expediente: Sucesiones + plusvalía + AJD/TPO del exceso de adjudicación (cuadro único, particion.js)
const costeX = (x) => { const R = calcular(x); if (!R) return null; const K = costeExpediente(x, R); return { R, isd: R.isd.total, plus: R.totalPlus, exceso: K ? K.exceso : 0, total: K ? K.total : r2(R.isd.total + R.totalPlus) }; };
const valorBienX = (b) => Math.max(num(b.valor), num(b.valorReferencia)) * cuotaCausante({ titularidad: b.titularidad || "privativo", porcentaje: pctCausante(b.porcentaje) });
const esInm = (b) => b.tipo === "vivienda" || b.tipo === "inmueble";
const RANGO = { I: 1, II: 2, III: 3, IV: 4 };
function elegibleVivienda(p) {
  const l = RELACIONES[p.relacion]?.linea;
  return ["desc", "asc", "conyuge"].includes(l) || (p.relacion === "pareja_hecho" && p.inscrita) || (["hermano", "sobrino", "tio", "primo"].includes(p.relacion) && num(p.edad) > 65 && p.convivio2anios);
}
function plusDe(x, b, p, caudal) {
  if (!plusCompleto(b)) return null;
  try { return calcularPlusvalia({ inmueble: datosPlus(x, b, undefined, (calcular(x) || {}).isd), titulares: [{ heredero: titularPlus(p), fraccion: 1 }], fecha: x.fecha, caudalTotal: caudal }).total; } catch { return null; }
}

// ── Renuncia simulada: la parte del renunciante va a quien la recibe por ley ──
// · Legado de usufructo universal repudiado: se refunde en la masa (art. 888 CC) y los herederos instituidos consolidan el pleno dominio.
// · Sin testamento: acrece a los coherederos del mismo grado (arts. 922 y 981 CC); si renuncian todos, heredan los del siguiente (art. 923 CC).
// · Testamento por cuotas: derecho de acrecer entre coherederos salvo sustitución (arts. 982-985 CC); lo aplica el motor.
function viaRenuncia(x, r, R) {
  const usu = R && (R.isd.derechos[r.id] || []).some((d) => d.tipo === "usufructo");
  if (x.testamento === "usufructo" && usu) return { txt: "el usufructo legado se refunde en la herencia y los herederos pasan a tener el pleno dominio", norma: "art. 888 CC" };
  if (usu) return { txt: "su usufructo viudal se extingue y los demás herederos reciben el pleno dominio", norma: "arts. 834 y 922-923 CC" };
  if (x.testamento === "porcentajes") return { txt: "acrece a los coherederos en proporción a sus cuotas, salvo que el testamento prevea un sustituto", norma: "arts. 982-985 CC" };
  return { txt: "acrece a los coherederos del mismo grado", norma: "arts. 922, 923 y 981 CC" };
}
function simRenunciaX(x, r, R) {
  const y = clonX(x), pr = y.personas.find((p) => p.id === r.id); if (pr) pr.renuncia = true;
  const der = (R && R.isd.derechos) || {};
  if (x.testamento === "usufructo" && (der[r.id] || []).some((d) => d.tipo === "usufructo")) {
    y.testamento = "porcentajes";
    for (const p of y.personas) { const nuda = (der[p.id] || []).filter((d) => d.tipo === "nuda" || d.tipo === "pleno").reduce((s, d) => s + d.fraccion, 0); p.pct = p.id === r.id ? 0 : r2(nuda * 100); }
  }
  for (const b of y.bienes || []) if (b.adjudicadoA === r.id) delete b.adjudicadoA;
  return y;
}

// ── Propuesta de lotes (R2 + R3) ───────────────────────────────
function lotes(x, R) {
  const vivos = (x.personas || []).filter((p) => !p.renuncia && R.isd.derechos[p.id]?.length);
  if (vivos.length < 2) return { aplica: false, motivo: "Con un solo heredero no hay que formar lotes." };
  if (vivos.some((p) => R.isd.derechos[p.id].some((d) => d.tipo !== "pleno"))) return { aplica: false, motivo: "Hay usufructo del viudo: lo habitual es adjudicar la nuda propiedad pro indiviso. Para adjudicar bienes concretos conviene antes conmutar el usufructo (arts. 839-840 CC)." };
  const cuota = Object.fromEntries(vivos.map((p) => [p.id, R.isd.derechos[p.id].reduce((s, d) => s + d.fraccion, 0)]));
  const partibles = (x.bienes || []).filter((b) => !b.legatarioId && valorBienX(b) > 0);
  const divis = partibles.filter((b) => b.tipo === "cuenta" || b.tipo === "valores");
  const indiv = partibles.filter((b) => !divis.includes(b)).sort((a, b) => valorBienX(b) - valorBienX(a));
  const cargas = R.isd.masa.deudas + R.isd.masa.gastos;
  const dinero = Math.max(0, divis.reduce((s, b) => s + valorBienX(b), 0) - cargas);
  const masa = indiv.reduce((s, b) => s + valorBienX(b), 0) + dinero;
  // Colación (arts. 1035-1047 CC; auditoría civil 10-10-2026): cada lote apunta al haber que resulta de colacionar, no a la cuota bruta
  const PTc = (() => { try { return particion(x, R); } catch (e) { return null; } })(), conCol = !!(PTc && PTc.COL && PTc.COL.aplica);
  const habCol = (id) => { const h = PTc.H.find((q) => q.p.id === id); return h ? h.haber / (R.isd.masa.netoReparto || 1) : 0; };
  const obj = Object.fromEntries(vivos.map((p) => [p.id, (conCol ? habCol(p.id) : cuota[p.id]) * masa]));
  const lleva = Object.fromEntries(vivos.map((p) => [p.id, 0]));
  const asig = {}, plusAsig = {}, notas = [];
  for (const b of indiv) {
    const v = valorBienX(b);
    const cand = vivos.map((p) => ({ p, c: esInm(b) ? plusDe(x, b, p, R.isd.masa.bruto) : null, cab: obj[p.id] - lleva[p.id] }));
    cand.sort((a, c) => (a.c ?? 0) - (c.c ?? 0) || c.cab - a.cab);
    let el = cand.find((q) => q.cab >= v - Math.max(1, masa * 0.005));
    if (!el) { el = [...cand].sort((a, c) => c.cab - a.cab)[0]; notas.push(`${b.descripcion || TIPO_BIEN[b.tipo][0]} vale más que la parte de cualquier heredero: el adjudicatario compensa en dinero al resto.`); }
    asig[b.id] = el.p.id; lleva[el.p.id] += v; if (el.c != null) plusAsig[b.id] = el.c;
  }
  // Dinero para cuadrar
  const falta = Object.fromEntries(vivos.map((p) => [p.id, Math.max(0, obj[p.id] - lleva[p.id])]));
  const totFalta = Object.values(falta).reduce((s, v) => s + v, 0);
  const dineroA = Object.fromEntries(vivos.map((p) => [p.id, totFalta ? Math.min(falta[p.id], dinero * falta[p.id] / totFalta) : 0]));
  for (const p of vivos) lleva[p.id] += dineroA[p.id];
  const L = vivos.map((p) => ({ p, objetivo: r2(obj[p.id]), bienes: indiv.filter((b) => asig[b.id] === p.id), dinero: r2(dineroA[p.id]), total: r2(lleva[p.id]), dif: r2(lleva[p.id] - obj[p.id]) }));
  let costeExc = 0; const excesos = [];
  for (const l of L) if (l.dif > 1) {
    // En la propuesta, quien tiene exceso solo recibe bienes indivisibles (el dinero va a los demás): exceso inevitable
    const vInd = l.bienes.reduce((s, b) => s + valorBienX(b), 0), vInm = l.bienes.filter(esInm).reduce((s, b) => s + valorBienX(b), 0);
    const t = cpTributar(terrX(x), { inevitable: l.dif, evitable: 0, fInmInev: vInd ? vInm / vInd : 0 });
    const e = { importe: l.dif, inevitable: l.dif, trib: t };
    excesos.push({ p: l.p, importe: l.dif, coste: t.coste, pendiente: t.pendiente, nota: `${cpTxtCoste(e)}. ${t.T.ajdNota}` });
    costeExc += t.coste;
  }
  const plusBase = R.plus.reduce((s, { r }) => s + r.total, 0);
  const plusLot = R.plus.reduce((s, { b, r }) => s + (plusAsig[b.id] != null ? plusAsig[b.id] : r.total), 0);
  return { aplica: true, L, excesos, costeExc: r2(costeExc), plusBase: r2(plusBase), plusLot: r2(plusLot), asig, notas, dinero: r2(dinero), cargas: r2(cargas) };
}

// ── Motor de palancas ─────────────────────────────────────────
const _cacheE = new Map();
function estrategia(x) {
  const key = JSON.stringify([x.fecha, x.ccaa, x.ccaaBienes, x.civil, x.testamento, x.personas, x.bienes, x.deudas, x.gastos, x.ajuar, x.enPlazo, x.aplicarEmpresa, x.criterioVivienda, x.viviendaA, x.noAplicarVivienda, x.ventaVivienda, x.tramites?.prorroga, x.tramites?.particion, x.causanteEmpadronado, x.acrecer, x.professioIuris, x.situ?.nacionalidadExtranjera, x.fechaParticion]);
  if (_cacheE.has(key)) return _cacheE.get(key);
  const out = estrategia0(x);
  if (_cacheE.size > 60) _cacheE.clear();
  _cacheE.set(key, out); return out;
}
function estrategia0(x) {
  const B = costeX(x); if (!B) return null;
  const R = B.R, terr = terrX(x), P = [];
  const sim = (fn) => { const y = clonX(x); fn(y); return costeX(y); };
  const vivos = (x.personas || []).filter((p) => !p.renuncia);
  const H = Object.fromEntries(R.isd.herederos.map((h) => [h.id, h]));
  const add = (o) => P.push({ ahorro: 0, riesgo: "", estado: "no", ...o });

  // 1 · Lotes y plusvalía
  const LT = lotes(x, R);
  if (!LT.aplica) add({ id: "lotes", titulo: "Adjudicar cada inmueble a quien menos plusvalía paga", sub: "Partición por lotes", cuerpo: `<p>${esc(LT.motivo)}</p>`, norma: "DGT V3354-20 · art. 106 TRLRHL" });
  else {
    const ah = r2(LT.plusBase - LT.plusLot - LT.costeExc);
    add({ id: "lotes", estado: ah >= EP.UMBRAL ? "si" : "info", ahorro: Math.max(0, ah), riesgo: LT.excesos.length ? "medio" : "bajo", titulo: "Adjudicar cada inmueble a quien menos plusvalía paga", sub: LT.excesos.length ? "Hay un exceso de adjudicación que se compensa en dinero" : "Sin excesos de adjudicación",
      cuerpo: `<p>El sujeto pasivo de la plusvalía es quien se adjudica el inmueble en la partición. Adjudicarlo al heredero con mejor bonificación de la ordenanza baja la cuota sin tocar el Impuesto sobre Sucesiones, que se sigue liquidando por cuotas.</p>
        <div class="cmp"><div><span>Pro indiviso</span><b>${eur0(LT.plusBase)}</b></div><div class="best"><span>Con estos lotes</span><b>${eur0(LT.plusLot + LT.costeExc)}</b></div></div>
        ${tablaLotes(LT)}${LT.notas.map((n) => `<p class="caption" style="margin-top:8px">${esc(n)}</p>`).join("")}
        ${LT.excesos.map((e) => `<p class="caption">Exceso de ${esc(e.p.nombre)}: ${eur0(e.importe)} · coste ${eur0(e.coste)}. ${esc(e.nota)}</p>`).join("")}
        <p class="caption">Si la ordenanza exige mantener el inmueble (en Málaga, dos años), venderlo antes hace perder la bonificación.</p>`,
      norma: "DGT V3354-20 · arts. 106-108 TRLRHL · art. 7.2.B TRLITPAJD · STSJ Andalucía 895/2026",
      aplicar: (y) => { for (const b of y.bienes || []) if (LT.asig[b.id] && esInm(b)) b.adjudicadoA = LT.asig[b.id]; } });
  }

  // 2 · Vivienda habitual al adjudicatario (STSJA 1011/2026)
  const viv = (x.bienes || []).find((b) => b.tipo === "vivienda" && !b.legatarioId);
  if (terr === "AND" && viv) {
    const eleg = vivos.filter((p) => H[p.id] && elegibleVivienda(p)), noEleg = vivos.filter((p) => H[p.id] && !elegibleVivienda(p));
    if (!eleg.length) add({ id: "vivienda", titulo: "Reducción de vivienda íntegra para quien se la queda", sub: "Ningún heredero cumple los requisitos", cuerpo: `<p>La reducción del 99 % solo alcanza a cónyuge, descendientes, ascendientes, pareja inscrita y colaterales mayores de 65 años que convivieron dos años con el causante.</p>`, norma: "art. 27 Ley 5/2021 · art. 20.2.c Ley 29/1987" });
    else if (!noEleg.length) add({ id: "vivienda", titulo: "Reducción de vivienda íntegra para quien se la queda", sub: "Todos los herederos ya tienen derecho", cuerpo: `<p>Todos pueden aplicar la reducción por su cuota: repartida, el límite de ${eur0(EP.LIM_VIV)} se multiplica por heredero. Concentrarla no ahorra.</p>`, norma: "art. 27 Ley 5/2021" });
    else {
      const vV = valorBienX(viv); let mejor = null;
      for (const e of eleg) {
        const cabe = H[e.id].valorAdquirido >= vV - 1;
        if (!cabe) continue;
        const c = sim((y) => { y.criterioVivienda = "TSJA2026"; y.viviendaA = e.id; });
        if (c && (!mejor || c.total < mejor.c.total)) mejor = { e, c };
      }
      if (!mejor) add({ id: "vivienda", titulo: "Reducción de vivienda íntegra para quien se la queda", sub: "La vivienda no cabe en su parte sin exceso", cuerpo: `<p>El criterio del TSJ de Andalucía exige que el adjudicatario no reciba más de lo que le corresponde. La vivienda (${eur0(vV)}) supera la parte de ${eleg.map((e) => esc(e.nombre)).join(" y ")}. Con un exceso compensado en dinero, la Agencia Tributaria de Andalucía aplicará el criterio de cuotas.</p>`, norma: "STSJ Andalucía 1011/2026 · Res. DGT 2/1999 · V2622-21" });
      else { const ah = r2(B.total - mejor.c.total); add({ id: "vivienda", estado: ah >= EP.UMBRAL ? "si" : "info", ahorro: Math.max(0, ah), riesgo: "litigioso", titulo: "Reducción de vivienda íntegra para quien se la queda", sub: ah >= EP.UMBRAL ? `Adjudicar la vivienda a ${mejor.e.nombre}` : `Sin ahorro: ${mejor.e.nombre} ya no tributa por la vivienda`,
        cuerpo: `<p>La Agencia Tributaria de Andalucía reparte la reducción por cuotas, sin mirar quién se queda la vivienda. El TSJ de Andalucía (sentencia 1011/2026) la aplicó íntegra a la adjudicataria sin exceso de adjudicación.</p><div class="cmp"><div><span>Por cuotas (ATA)</span><b>${eur0(B.isd)}</b></div><div class="best"><span>Al adjudicatario</span><b>${eur0(mejor.c.isd)}</b></div></div><p class="caption">Vía prudente: autoliquidar por cuotas y pedir la rectificación con devolución (art. 120.3 LGT). Obliga a mantener la vivienda tres años.</p>`,
        norma: "STSJ Andalucía 1011/2026 · art. 120.3 LGT · art. 27 Ley 5/2021", aplicar: (y) => { y.criterioVivienda = "TSJA2026"; y.viviendaA = mejor.e.id; const b = y.bienes.find((q) => q.id === viv.id); if (b) b.adjudicadoA = mejor.e.id; } }); }
    }
  }

  // 3 · Valor declarado de los inmuebles: Sucesiones hoy frente a IRPF mañana
  for (const b of (x.bienes || []).filter((q) => esInm(q) && num(q.valor) && num(q.valorReferencia) && Math.abs(num(q.valor) - num(q.valorReferencia)) / num(q.valorReferencia) > 0.03)) {
    const alto = Math.max(num(b.valor), num(b.valorReferencia)), bajo = Math.min(num(b.valor), num(b.valorReferencia));
    const cuotaC = cuotaCausante({ titularidad: b.titularidad || "privativo", porcentaje: pctCausante(b.porcentaje) });
    const dif = (alto - bajo) * cuotaC;
    if (num(b.valor) > num(b.valorReferencia)) {
      const c = sim((y) => { const q = y.bienes.find((z) => z.id === b.id); q.valor = q.valorReferencia; });
      const ahISD = r2(B.total - c.total); const irpf = r2(irpfAhorro(dif));
      const conviene = ahISD > irpf;
      add({ id: "valor-" + b.id, estado: conviene && ahISD >= EP.UMBRAL ? "si" : "info", ahorro: conviene ? Math.max(0, r2(ahISD - irpf)) : 0, riesgo: "bajo", titulo: `${b.descripcion || "Inmueble"}: qué valor declarar`, sub: conviene ? "Declarar el valor de referencia" : "Mantener el valor de mercado",
        cuerpo: `<p>La base mínima es el valor de referencia del Catastro (${eur0(num(b.valorReferencia))}). Declarar el valor de mercado (${eur0(num(b.valor))}) cuesta más Sucesiones hoy, pero ese valor será el de adquisición si se vende: rebaja el IRPF de la venta.</p>
          <div class="cmp"><div class="${conviene ? "best" : ""}"><span>Sucesiones que se ahorra</span><b>${eur0(ahISD)}</b></div><div class="${conviene ? "" : "best"}"><span>IRPF extra si se vende</span><b>${eur0(irpf)}</b></div></div>
          <p class="caption">${conviene ? "El ahorro inmediato en Sucesiones supera el IRPF que se pagaría de más en una venta a valor de mercado." : "Con la bonificación autonómica, subir el valor casi no cuesta Sucesiones y protege frente al IRPF de una venta futura."} IRPF estimado con la escala del ahorro (19 %-30 %).</p>`,
        norma: "art. 9 Ley 29/1987 (valor de referencia, Ley 11/2021) · art. 36 Ley 35/2006", aplicar: conviene ? (y) => { const q = y.bienes.find((z) => z.id === b.id); q.valor = q.valorReferencia; } : null });
    } else {
      const c = sim((y) => { const q = y.bienes.find((z) => z.id === b.id); q.valorReferencia = ""; });
      const ah = r2(B.total - c.total);
      add({ id: "vref-" + b.id, estado: ah >= EP.UMBRAL ? "si" : "info", ahorro: Math.max(0, ah), riesgo: "medio", titulo: `${b.descripcion || "Inmueble"}: impugnar el valor de referencia`, sub: `Referencia ${eur0(num(b.valorReferencia))} frente a mercado ${eur0(num(b.valor))}`,
        cuerpo: `<p>El valor de referencia supera el de mercado en ${eur0(num(b.valorReferencia) - num(b.valor))}. Se puede declarar por el valor de referencia y pedir después la rectificación con una tasación que acredite el valor real.</p><div class="cmp"><div><span>Con valor de referencia</span><b>${eur0(B.total)}</b></div><div class="best"><span>Con valor de mercado</span><b>${eur0(c.total)}</b></div></div><p class="caption">El Supremo tiene pendiente decidir si basta una tasación (ATS de 29-04-2026, rec. 8442/2024).</p>`,
        norma: "art. 9 Ley 29/1987 · art. 120.3 LGT · RDLeg 1/2004 (Catastro)", aplicar: (y) => { const q = y.bienes.find((z) => z.id === b.id); q.valorReferencia = ""; } });
    }
  }

  // 4 · Ajuar doméstico
  if ((x.ajuar || "sts") === "3pct") { const c = sim((y) => { y.ajuar = "sts"; }); const ah = r2(B.total - c.total); add({ id: "ajuar", estado: ah >= EP.UMBRAL ? "si" : "info", ahorro: Math.max(0, ah), riesgo: "bajo", titulo: "Ajuar doméstico solo sobre bienes de uso personal", sub: "Criterio del Tribunal Supremo de 2020", cuerpo: `<p>El 3 % no se calcula sobre dinero, valores ni inmuebles, solo sobre los bienes de uso personal y doméstico. La Agencia Tributaria de Andalucía ya lo aplica así.</p>`, norma: "SSTS 342/2020 y 499/2020 · art. 15 Ley 29/1987", aplicar: (y) => { y.ajuar = "sts"; } }); }
  else if (x.ajuar === "ata") add({ id: "ajuar", estado: "info", titulo: "Ajuar con el criterio de la Agencia Tributaria de Andalucía", sub: "Elegido a mano: el menos prudente", cuerpo: `<p>Solo bienes muebles de uso personal. El Tribunal Supremo (STS 499/2020) y el TEAC (30-05-2025) llevan la base a las viviendas de uso residencial, que es el criterio por defecto: si la Administración lo aplica, la cuota será mayor (auditoría ISD 10-10-2026, M-8).</p>`, norma: "STS 499/2020; TEAC RG 6258/2024" });
  else add({ id: "ajuar", estado: "hecho", titulo: "Ajuar doméstico solo sobre bienes de uso personal", sub: "Ya aplicado en el cálculo", cuerpo: `<p>El expediente ya calcula el ajuar con el criterio del Supremo: 3 % solo de las viviendas de uso residencial no alquiladas ni cedidas, sin dinero ni valores (STS 499/2020; TEAC 30-05-2025).</p>`, norma: "SSTS 342/2020 y 499/2020" });

  // 5 · Renuncia pura y simple: nunca se recomienda sola. Se simula con la parte renunciada asignada a quien la recibe por ley
  //     y se comparan TODOS los impuestos de la familia (Sucesiones, plusvalía, exceso y, si hay viudo, las dos herencias).
  if (vivos.length >= 2) {
    const filas = [];
    for (const r of vivos) {
      if (!H[r.id]) continue;
      const y = simRenunciaX(x, r, R), c = costeX(y); if (!c) continue;
      const benef = c.R.isd.herederos.filter((h) => h.id !== r.id && h.valorAdquirido > (H[h.id]?.valorAdquirido || 0) + 1);
      if (!benef.length) continue; // si la parte no pasa a nadie la simulación no es fiable: no se muestra
      filas.push({ r, c, benef, dif: r2(B.total - c.total), via: viaRenuncia(x, r, R) });
    }
    filas.sort((a, b) => b.dif - a.dif);
    let S2 = null; try { S2 = typeof segundaHerencia === "function" ? segundaHerencia(x, R) : null; } catch (e) { S2 = null; }
    if (filas.length) {
      const f = filas[0], nr = esc(f.r.nombre || "el renunciante"), bn = f.benef.map((h) => esc(h.nombre)).join(" y ");
      const esViudoR = ["conyuge", "pareja_hecho"].includes(f.r.relacion);
      const A2 = S2 && S2.aplicable && esViudoR ? S2.escenarios.find((e) => e.k === "A") : null, C2 = S2 && S2.aplicable && esViudoR ? S2.escenarios.find((e) => e.k === "C") : null;
      const usu = (R.isd.derechos[f.r.id] || []).filter((d) => d.tipo === "usufructo").reduce((s, d) => s + d.fraccion, 0);
      const fila = (t, a, b) => `<tr><td>${t}</td><td class="n">${eur0(a)}</td><td class="n">${eur0(b)}</td><td class="n">${Math.abs(a - b) < 0.5 ? "igual" : (a > b ? "−" : "+") + eur0(Math.abs(a - b))}</td></tr>`;
      const tabla = `<div class="tablewrap"><table class="lots"><tr><th>Impuestos de toda la familia</th><th style="text-align:right">Sin renuncia</th><th style="text-align:right">Con renuncia</th><th style="text-align:right">Diferencia</th></tr>${fila("Sucesiones", B.isd, f.c.isd)}${fila("Plusvalía municipal", B.plus, f.c.plus)}${B.exceso || f.c.exceso ? fila("Exceso de adjudicación (AJD/TPO)", B.exceso, f.c.exceso) : ""}${fila("<b>Total hoy</b>", B.total, f.c.total)}${A2 && C2 ? fila(`<b>Dos herencias</b> (segunda dentro de ${S2.anios} años)`, A2.total, C2.total) : ""}</table></div>`;
      const pros = [], contras = [];
      pros.push(`${bn} reciben hoy la parte de ${nr} (${esc(f.via.txt)}).`);
      if (esViudoR && usu) pros.push("No queda usufructo que consolidar: al fallecer el viudo no hay liquidación por consolidación del dominio.");
      if (A2 && C2 && A2.total - C2.total > 0.5) pros.push(`En las dos herencias la familia pagaría ${eur0(A2.total - C2.total)} menos (estimación de «Dos herencias»).`);
      if (f.dif > 0.5) pros.push(`Hoy la familia pagaría ${eur0(f.dif)} menos${B.exceso > 0.5 ? ", en parte porque desaparece el exceso de adjudicación del reparto actual" : ""}.`);
      contras.push(`${nr} deja de recibir ${eur0(H[f.r.id].valorAdquirido)}${esViudoR && usu ? ": pierde el usufructo de por vida, con el uso de la vivienda y las rentas" : ""}.`);
      if (f.dif < -0.5) contras.push(`Hoy la familia pagaría ${eur0(-f.dif)} más.`);
      if (A2 && C2 && C2.total - A2.total > 0.5) contras.push(`En las dos herencias la familia pagaría ${eur0(C2.total - A2.total)} más.`);
      contras.push("Es irrevocable y solo vale ante notario, antes de cualquier acto de aceptación (arts. 997, 999 y 1008 CC).");
      contras.push("Hecha «a favor de» alguien concreto es una aceptación seguida de donación y tributa dos veces (art. 1000 CC).");
      contras.push("Quien recibe la parte renunciada tributa con el parentesco del renunciante si es más gravoso (art. 28 Ley 29/1987).");
      add({ id: "renuncia", estado: "valorar", ahorro: 0, riesgo: "alto", titulo: `Renuncia pura y simple de ${f.r.nombre}`, sub: `A valorar con el abogado · su parte pasaría a ${f.benef.map((h) => h.nombre).join(" y ")}`,
        cuerpo: `<p>No es una recomendación: cambia quién recibe la herencia y la decide el heredero, informado por el abogado. Si ${nr} renuncia sin designar beneficiario, su parte pasa a ${bn}: ${esc(f.via.txt)} (${esc(f.via.norma)}).</p>${tabla}
          <div class="grid g2" style="gap:10px;margin-top:10px"><div><p class="caption"><b>A favor</b></p><ul class="notes">${pros.map((t) => `<li><i class="dot ok"></i><span>${t}</span></li>`).join("")}</ul></div><div><p class="caption"><b>En contra y cautelas</b></p><ul class="notes">${contras.map((t) => `<li><i class="dot warn"></i><span>${t}</span></li>`).join("")}</ul></div></div>
          ${filas.length > 1 ? `<p class="caption" style="margin-top:8px">Otras renuncias simuladas: ${filas.slice(1).map((q) => `${esc(q.r.nombre)} (${Math.abs(q.dif) < 0.5 ? "mismo coste hoy" : `hoy ${q.dif > 0 ? "−" : "+"}${eur0(Math.abs(q.dif))}`})`).join(" · ")}.</p>` : ""}`,
        norma: `${f.via.norma} · arts. 997, 1000 y 1008 CC · art. 28 Ley 29/1987`, aplicar: (y) => { const q = simRenunciaX(y, f.r, calcular(y)); Object.assign(y, q); } });
    } else add({ id: "renuncia", titulo: "Renuncia pura y simple", sub: "Sin efecto que valorar", cuerpo: `<p>Se ha simulado la renuncia de cada heredero con su parte asignada a quien la recibe por ley. Ninguna produce un reparto distinto que valorar.</p>`, norma: "arts. 922, 981-985 CC · art. 28 Ley 29/1987" });
  }

  // 6 · Conmutación del usufructo
  if (vivos.some((p) => (R.isd.derechos[p.id] || []).some((d) => d.tipo === "usufructo"))) add({ id: "conmutacion", estado: "info", titulo: "Conmutar el usufructo del viudo", sub: "Por bienes concretos, un capital o una renta", cuerpo: `<p>Los herederos pueden pagar el usufructo del viudo con bienes concretos, un capital o una renta. Sirve para que el viudo se quede la vivienda en propiedad, para vender sin esperar a su fallecimiento o para formar lotes sin excesos.</p><p class="caption">Si la conmutación es la prevista por la ley, no se considera exceso; su tributación exacta con usufructo testamentario está en revisión.</p>`, norma: "arts. 839-840 CC · SSTS 2020" });

  // 7 · Reducciones y venta prevista
  const conViv = R.isd.herederos.filter((h) => h.traza.some((t) => /vivienda habitual/i.test(t.paso)));
  if (conViv.length) {
    const c = sim((y) => { y.noAplicarVivienda = true; }); const A = r2(c.total - B.total);
    const perm = (REGLAS[terr]?.vivienda?.permanencia) || 0;
    add({ id: "venta", estado: x.ventaVivienda ? "si" : "info", ahorro: 0, riesgo: x.ventaVivienda ? "medio" : "", titulo: "Reducción de vivienda y venta prevista", sub: `La reducción vale ${eur0(A)} y obliga a mantenerla ${perm} años`,
      cuerpo: `<p>Si la vivienda se vende a un tercero antes de ${perm} años, hay que ingresar lo que se ahorró (${eur0(A)}) con intereses de demora, y lo pierden todos los que aplicaron la reducción. Si la venta es segura, conviene no aplicarla o reinvertir de inmediato en otra vivienda habitual.</p>
      <div class="row toggle" style="padding:10px 0"><span class="t"><b>Se venderá antes de ${perm} años</b></span><label class="switch"><input type="checkbox" data-opt="ventaVivienda" ${x.ventaVivienda ? "checked" : ""}><span></span></label></div>
      ${x.ventaVivienda ? `<p class="caption">Con venta prevista a los ${Math.max(1, perm - 1)} años, los intereses rondarían ${eur0(A * EP.I_DEMORA * Math.max(1, perm - 1))}.</p>` : ""}`,
      norma: "art. 27 Ley 5/2021 · DGT V1353-24", aplicar: x.ventaVivienda ? (y) => { y.noAplicarVivienda = true; } : null });
  }
  const hayEmp = (x.bienes || []).some((b) => b.tipo === "empresa");
  if (hayEmp && !x.aplicarEmpresa) { const c = sim((y) => { y.aplicarEmpresa = true; }); const ah = r2(B.total - c.total); add({ id: "empresa", estado: ah >= EP.UMBRAL ? "si" : "info", ahorro: Math.max(0, ah), riesgo: "medio", titulo: "Reducción por empresa familiar", sub: "Requisitos de exención en el Impuesto sobre el Patrimonio", cuerpo: `<p>Si la empresa o participación estaba exenta en Patrimonio y el heredero la mantiene el plazo exigido, se reduce la base. Hay que acreditar los requisitos del art. 4.8 de la Ley 19/1991.</p>`, norma: "art. 20.2.c Ley 29/1987 · normativa autonómica", aplicar: (y) => { y.aplicarEmpresa = true; } }); }

  // 8 · Plazo, prórroga y recargos
  const lim = R.plazos.find((q) => q.id === "isd")?.limite, limP = R.plazos.find((q) => q.id === "prorroga_isd")?.limite;
  const cuota = R.isd.total;
  const prorrogaPedida = x.tramites?.prorroga?.estado === "hecho";
  const interesP = r2(cuota * EP.I_DEMORA * 182 / 365);
  const rec = (m) => r2(cuota * (m >= 12 ? 0.15 : 0.01 + 0.01 * m));
  const ventana = hoy() <= limP && !prorrogaPedida && x.tramites?.particion?.estado !== "hecho";
  add({ id: "plazo", estado: ventana && cuota > 0 && rec(2) - interesP >= EP.UMBRAL ? "si" : "info", ahorro: ventana && cuota > 0 ? Math.max(0, r2(rec(2) - interesP)) : 0, riesgo: "bajo", titulo: "Prórroga antes que recargo", sub: prorrogaPedida ? "Prórroga pedida" : `Se puede pedir hasta el ${fechaCorta(limP)}`,
    cuerpo: `<p>La prórroga de seis meses solo cuesta intereses de demora (4,0625 % anual). Presentar tarde sin prórroga lleva recargo: 1 % más 1 % por mes completo, y 15 % más intereses pasado un año; con un 25 % menos si se paga a la vez.${terr === "AND" ? " En Andalucía la bonificación del 99 % no se pierde por presentar tarde." : terr === "MAD" ? " En Madrid, presentar fuera de plazo puede hacer perder la bonificación: revisar." : ""}</p>
      <div class="tablewrap"><table class="lots"><tr><th>Escenario</th><th style="text-align:right">Coste sobre ${eur0(cuota)}</th></tr>
      <tr><td>En plazo, hasta el ${fechaCorta(lim)}</td><td class="n">0 €</td></tr>
      <tr><td>Con prórroga, hasta el ${fechaCorta(trMeses(x.fecha, 12))}</td><td class="n">${eur0(interesP)}</td></tr>
      ${[1, 3, 6, 12].map((m) => `<tr><td>Sin prórroga, ${m === 12 ? "más de 12 meses" : m + (m === 1 ? " mes" : " meses")} tarde</td><td class="n">${eur0(rec(m))}${m === 12 ? " + intereses" : ""}</td></tr>`).join("")}</table></div>`,
    norma: "art. 68 RD 1629/1991 · art. 27 LGT · interés de demora 2026" });

  // 9 · Partidas que se olvidan
  const c1 = sim((y) => { y.gastos = [...(y.gastos || []), { concepto: "prueba", importe: 1000 }]; });
  const marg = r2(B.total - c1.total);
  const g = (x.gastos || [])[0]?.importe, h0 = (x.deudas || [])[0]?.importe, o1 = (x.deudas || [])[1]?.importe;
  const seg = (x.personas || []).filter((p) => num(p.seguro) > 0);
  const it = [["Funeral, entierro e incineración", num(g), "art. 14.b Ley 29/1987"], ["Gastos de la última enfermedad", 0, "art. 14.b Ley 29/1987"], ["Hipoteca y préstamos a la fecha del fallecimiento", num(h0), "art. 13 Ley 29/1987"], ["Otras deudas: tarjetas, proveedores, Seguridad Social", num(o1), "art. 13 Ley 29/1987"], ["IRPF del causante del año del fallecimiento", 0, "art. 13 Ley 29/1987"], ["IBI y comunidad devengados y no pagados", 0, "art. 13 Ley 29/1987"], ["Seguros de vida: reducción de 9.195,49 € por beneficiario cercano", seg.reduce((s, p) => s + num(p.seguro), 0), "art. 20.2.b Ley 29/1987"]];
  add({ id: "partidas", estado: "info", titulo: "Deudas y gastos que bajan la base", sub: marg > 0 ? `Cada 1.000 € justificados ahorran ${eur0(marg)}` : "En este caso casi no cambian el impuesto",
    cuerpo: `<div class="group" style="box-shadow:none;background:transparent">${it.map(([n, v, nm]) => `<div class="row" style="padding:9px 0;min-height:0"><i class="dot ${v ? "ok" : ""}"></i><span class="t"><b style="font-size:14px">${n}</b><small>${nm}</small></span><span class="v num">${v ? eur0(v) : "sin registrar"}</span></div>`).join("")}</div><p class="caption" style="margin-top:8px">No se restan las deudas con herederos o sus familiares cercanos, ni la notaría, el registro o la plusvalía de la partición.</p>`, norma: "arts. 13 y 14 Ley 29/1987" });

  // Lo de riesgo alto o litigioso nunca va a «Recomendadas»: pasa a «A valorar con el abogado» (estado "valorar")
  for (const p of P) if (p.estado === "si" && ["alto", "litigioso"].includes(p.riesgo)) p.estado = "valorar";
  const seguro = r2(P.filter((p) => p.estado === "si").reduce((s, p) => s + p.ahorro, 0));
  const riesgo = r2(P.filter((p) => p.estado === "valorar").reduce((s, p) => s + p.ahorro, 0));
  const orden = { si: 0, valorar: 1, info: 2, hecho: 3, no: 4 };
  P.sort((a, b) => orden[a.estado] - orden[b.estado] || b.ahorro - a.ahorro);
  return { base: { isd: B.isd, plus: B.plus, exceso: B.exceso, total: B.total }, P, LT, seguro, riesgo };
}
function tablaLotes(LT) {
  return `<div class="tablewrap"><table class="lots"><tr><th>Heredero</th><th>Se adjudica</th><th style="text-align:right">Le corresponde</th><th style="text-align:right">Recibe</th></tr>${LT.L.map((l) => `<tr><td>${esc(l.p.nombre)}</td><td>${l.bienes.map((b) => `<span class="chip">${esc(b.descripcion || TIPO_BIEN[b.tipo][0])}</span>`).join("")}${l.dinero > 1 ? `<span class="chip">Dinero ${eur0(l.dinero)}</span>` : ""}</td><td class="n">${eur0(l.objetivo)}</td><td class="n" style="${l.dif > 1 ? "color:var(--orange)" : ""}">${eur0(l.total)}</td></tr>`).join("")}</table></div>${LT.cargas ? `<p class="caption" style="margin-top:8px">Deudas y gastos (${eur0(LT.cargas)}) pagados antes con el dinero de la herencia.</p>` : ""}`;
}
function aplicarPalanca(x, id) {
  const E = estrategia(x); const p = E && E.P.find((q) => q.id === id); if (!p || !p.aplicar) return null;
  const y = clonX(x); p.aplicar(y); y.id = uid(); y.nombre = (x.nombre || "Herencia") + " · " + p.titulo.charAt(0).toLowerCase() + p.titulo.slice(1); y.ejemplo = false; y.escenarioDe = x.id; return y;
}

// ── Propuesta de liquidación (documento) ───────────────────────
function docLiquidacion(x, R) {
  const E = estrategia(x); const terr = terrX(x);
  const L = [];
  const causante = x.nombre || "[nombre del causante]";
  L.push(`PROPUESTA DE LIQUIDACIÓN\nHerencia de ${causante} · fallecimiento: ${fechaLarga(x.fecha)}\nNormativa aplicable: ${R.isd.territorio} (${R.isd.norma})\n`);
  L.push(`1. MASA HEREDITARIA\n\nBienes inventariados: ${eur(R.isd.masa.brutoTotal)}${R.isd.masa.mitadViudo ? `\nMitad de gananciales del cónyuge viudo: −${eur(R.isd.masa.mitadViudo)}` : ""}\nCaudal del causante: ${eur(R.isd.masa.bruto)}\nDeudas deducibles: −${eur(R.isd.masa.deudas)}\nGastos deducibles: −${eur(R.isd.masa.gastos)}\nCaudal neto: ${eur(R.isd.masa.neto)}\nAjuar doméstico: ${eur(R.isd.masa.ajuar)} (${R.isd.masa.notaAjuar})\n`);
  L.push(`2. IMPUESTO SOBRE SUCESIONES POR HEREDERO${terr === "AND" ? " (modelos 650 y 660)" : ""}\n`);
  for (const h of R.isd.herederos) L.push(`${h.nombre} · ${RELACIONES[h.relacion].label} · grupo ${h.grupo}\n${h.traza.map((t) => `   ${t.paso.padEnd(58, ".")} ${eur(t.valor)}`).join("\n")}\n`);
  L.push(`Total Impuesto sobre Sucesiones: ${eur(R.isd.total)}\n`);
  L.push(`3. PLUSVALÍA MUNICIPAL\n`);
  if (R.plus.length) for (const { b, r } of R.plus) L.push(`${b.descripcion || "Inmueble"} (${r.municipio}) · método ${r.metodo} · base ${eur(r.base)} · tipo ${grp(r.tipo * 100, 2)} %\n${r.porTitular.map((t) => `   ${t.heredero}: ${eur(t.aIngresar)}${t.bonificacionPct ? ` (bonificación ${grp(t.bonificacionPct * 100, 1)} %)` : ""}`).join("\n")}\n`);
  else L.push(REV("faltan los valores catastrales o la fecha de adquisición de los inmuebles para liquidar la plusvalía.") + "\n");
  const KX = costeExpediente(x, R);
  L.push(`Total plusvalía: ${eur(R.totalPlus)}\n${KX && KX.C && KX.C.excesos.length ? `\nEXCESO DE ADJUDICACIÓN\n${KX.C.excesos.map((e) => `${e.nombre}: exceso ${eur(e.exceso)} · ${e.txtCoste} · coste ${eur(e.trib.coste)}`).join("\n")}\n${cpTxtCompensaciones(KX.C)}.\n` : ""}\nCOSTE FISCAL TOTAL: ${eur(KX ? KX.total : R.isd.total + R.totalPlus)}${KX && KX.exceso ? " (Sucesiones + plusvalía + exceso)" : ""}\n`);
  if (E) {
    const si = E.P.filter((p) => p.estado === "si");
    L.push(`4. OPTIMIZACIÓN FISCAL\n\n${si.length ? si.map((p, i) => `${i + 1}. ${p.titulo}${p.sub ? " — " + p.sub : ""}\n   Ahorro estimado: ${eur0(p.ahorro)} · riesgo ${p.riesgo}\n   Base: ${p.norma}`).join("\n\n") : "No se han identificado ahorros relevantes con los datos actuales."}\n\nAhorro fiscal hoy (riesgo bajo o medio): ${eur0(E.seguro)}${E.P.some((p) => p.estado === "valorar") ? `\n\nA valorar con el abogado (riesgo alto o litigioso; no se suman al ahorro):\n${E.P.filter((p) => p.estado === "valorar").map((p) => `· ${p.titulo}${p.sub ? " — " + p.sub : ""}${p.ahorro ? ` (${eur0(p.ahorro)})` : ""}. Base: ${p.norma}`).join("\n")}` : ""}\n`);
    if (E.LT.aplica) L.push(`5. PROPUESTA DE ADJUDICACIÓN\n\n${E.LT.L.map((l) => `${l.p.nombre}: ${[...l.bienes.map((b) => b.descripcion || TIPO_BIEN[b.tipo][0]), l.dinero > 1 ? "dinero " + eur0(l.dinero) : ""].filter(Boolean).join(", ")} · le corresponde ${eur0(l.objetivo)} · recibe ${eur0(l.total)}`).join("\n")}${E.LT.excesos.length ? "\n\nExcesos de adjudicación de esta propuesta: " + E.LT.excesos.map((e) => `${e.p.nombre} ${eur0(e.importe)} (${e.nota.split(". ")[0]})`).join("; ") : ""}\n`);
  }
  const pl = Object.fromEntries(R.plazos.map((p) => [p.id, p]));
  L.push(`${E ? 6 : 4}. PLAZOS\n\nPrórroga del Impuesto sobre Sucesiones: hasta el ${fechaLarga(pl.prorroga_isd?.limite)}${terr === "AND" ? " (modelo 659)" : ""}\nPresentación e ingreso: hasta el ${fechaLarga(pl.isd?.limite)}\nPlusvalía municipal: hasta el ${fechaLarga(pl.plusvalia?.limite)}, prorrogable hasta un año\n`);
  L.push(REV("propuesta generada con los datos del expediente. Comprobar valores, parentescos, requisitos de cada reducción y criterios administrativos antes de presentar. Las opciones de riesgo alto o litigioso requieren informe expreso al cliente."));
  return L.join("\n");
}
