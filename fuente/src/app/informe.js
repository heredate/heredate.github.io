// ───────────────────── PDF: escritos e informe de cálculo ─────────────────────
// Usa pdf.js (pdfDocumento, pdfDescargar). Sin red ni dependencias.
function pdfDespacho(x) {
  const D = despachoCfg();
  return { nombre: D.nombre || "", colegio: D.colegio || "", localidad: D.localidad || "", responsable: (x && abogado(x.responsable)?.nombre) || "" };
}
const pdfNombreExp = (x) => (x.nombre || "herencia").replace(/^Herencia de /i, "");
const pdfEur = (n) => eur(n || 0).replace(/ €$/, "\u00A0€");

function pdfEscrito(x, id) {
  const R = calcular(x); const texto = docTexto(x, R, id).replace(/\r/g, "");
  const bytes = pdfDocumento({ titulo: DOC_TIT[id], despacho: pdfDespacho(x), ref: x.despacho?.ref || "", texto, marcaAgua: /⟦/.test(texto) ? "Borrador" : "" });
  return pdfDescargar(DOC_TIT[id] + " " + pdfNombreExp(x), bytes);
}

// Informe completo del cálculo: masa, reparto, Sucesiones paso a paso, plusvalía, partición y totales
function pdfInformeBloques(x, R) {
  const m = R.isd.masa, pp = plusPorHeredero(R), bl = [];
  const causante = x.nombre || "—";
  bl.push({ tipo: "h", numero: "1.", texto: "Datos del expediente" });
  bl.push({ tipo: "fila", etiqueta: "Causante", valor: causante });
  bl.push({ tipo: "fila", etiqueta: "Fecha del fallecimiento", valor: fechaLarga(x.fecha) });
  bl.push({ tipo: "fila", etiqueta: "Impuesto sobre Sucesiones", valor: R.isd.territorio });
  // I6 (control de calidad 07-10-2026): la vecindad civil decide el reparto sin testamento; si no está modelada, el informe lo dice en rojo
  if (R.isd.vecindad) bl.push({ tipo: "fila", etiqueta: "Vecindad civil (reparto y legítimas)", valor: `${R.isd.vecindad.id === "comun" ? "común (Código Civil)" : VECINDADES[R.isd.vecindad.id] || R.isd.vecindad.id}${R.isd.vecindad.supuesta ? ", supuesta por la residencia: por confirmar" : ""}` });
  if (R.isd.bloqueo) bl.push({ tipo: "nota", texto: `${R.isd.bloqueo.titulo.toUpperCase()}. ${R.isd.bloqueo.motivo} ${R.isd.bloqueo.accion} (${R.isd.bloqueo.norma}). Las cuotas por heredero de este informe no son un cálculo cerrado.` });
  if (R.plus.length) bl.push({ tipo: "fila", etiqueta: "Plusvalía municipal", valor: [...new Set(R.plus.map((p) => p.r.municipio))].join(", ") });
  bl.push({ tipo: "fila", etiqueta: "Normativa aplicada", valor: "versión " + (typeof NORMA_V === "string" ? NORMA_V : "—") });
  bl.push({ tipo: "fila", etiqueta: "Fecha del cálculo", valor: fechaLarga(hoy()) });

  bl.push({ tipo: "h", numero: "2.", texto: "Masa hereditaria" });
  const bienes = (x.bienes || []).map((b) => {
    const inm = b.tipo === "vivienda" || b.tipo === "inmueble";
    const v = inm ? Math.max(num(b.valor), num(b.valorReferencia)) : num(b.valor);
    const cc = cuotaCausante({ titularidad: b.titularidad, porcentaje: pctCausante(b.porcentaje) });
    return [b.descripcion || TIPO_BIEN[b.tipo]?.[0] || "Bien", pdfEur(v), Math.round(cc * 10000) / 100 + " %", pdfEur(v * cc)];
  });
  if (bienes.length) bl.push({ tipo: "tabla", cabecera: ["Bien", "Valor", "Parte del causante", "Computa"], filas: bienes, alinear: ["l", "r", "r", "r"] });
  bl.push({ tipo: "fila", etiqueta: "Caudal del causante", valor: pdfEur(m.bruto), separada: true });
  if (m.deudas) bl.push({ tipo: "fila", etiqueta: "Deudas", valor: "– " + pdfEur(m.deudas) });
  if (m.gastos) bl.push({ tipo: "fila", etiqueta: "Gastos de última enfermedad y entierro", valor: "– " + pdfEur(m.gastos) });
  if (m.legados) bl.push({ tipo: "fila", etiqueta: "Legados", valor: "– " + pdfEur(m.legados) });
  bl.push({ tipo: "fila", etiqueta: "Neto a repartir entre herederos", valor: pdfEur(m.netoReparto), negrita: true });
  if (m.ajuar) bl.push({ tipo: "p", texto: `Ajuar doméstico: ${pdfEur(m.ajuar)}. Solo cuenta a efectos del impuesto (se suma a la base imponible de cada heredero, art. 15 Ley 29/1987); no se reparte, por eso no está en el neto.` });
  if (m.gananciales) bl.push({ tipo: "p", texto: `Se ha liquidado la sociedad de gananciales: ${eur0(m.mitadViudo)} pertenecen al cónyuge viudo y no forman parte de la herencia.` });

  if (m.pasivoExcede > 0) bl.push({ tipo: "nota", texto: `Más deudas que bienes: el pasivo supera al caudal en ${pdfEur(m.pasivoExcede)}. Valorar aceptar a beneficio de inventario (arts. 1010 y 1023 CC) o repudiar (art. 1008 CC) antes de cualquier acto de aceptación (art. 999 CC).` });
  bl.push({ tipo: "h", numero: "3.", texto: "Quién recibe qué" });
  if (R.isd.leyReparto) bl.push({ tipo: "fila", etiqueta: "Ley aplicable sin testamento", valor: R.isd.leyReparto });
  if (R.isd.notasReparto.length) bl.push({ tipo: "p", texto: R.isd.notasReparto.join(" ") });
  bl.push({ tipo: "tabla", cabecera: ["Persona", "Parentesco", "Derechos", "Valor fiscal"], filas: R.isd.herederos.map((h) => [h.nombre, RELACIONES[h.relacion]?.label || "", (h.derechos || []).map(derTxt).join(" · ") || "Legado", pdfEur(h.valorAdquirido)]), alinear: ["l", "l", "l", "r"] });

  bl.push({ tipo: "h", numero: "4.", texto: "Impuesto sobre Sucesiones, paso a paso" });
  R.isd.herederos.forEach((h, i) => {
    bl.push({ tipo: "h", numero: `4.${i + 1}`, texto: `${h.nombre} · ${RELACIONES[h.relacion]?.label || ""} · grupo ${h.grupo}` });
    // K2 (control de calidad 07-10-2026): de cada reducción se muestra lo que realmente se aplica y, si es menor, el máximo legal en el concepto
    bl.push({ tipo: "tabla", cabecera: ["Paso", "Importe", "Norma"], filas: (h.traza || []).map((s) => { const parcial = s.aplicado != null && Math.abs(s.aplicado - s.valor) > 0.005; return [parcial ? `${s.paso} · aplicada hasta agotar la base (máximo ${pdfEur(Math.abs(s.valor))})` : s.paso, pdfEur(parcial ? s.aplicado : s.valor), (s.norma || "") + (s.estado === "PENDIENTE" ? " (pendiente de cotejo)" : "")]; }), alinear: ["l", "r", "l"] });
  });
  bl.push({ tipo: "fila", etiqueta: "Total Sucesiones", valor: pdfEur(R.isd.total), negrita: true, separada: true });
  // C2: fuera de plazo, el recargo del art. 27 LGT en su propia línea, con su etiqueta (nunca «15 %» si lleva intereses)
  if (R.isd.recargo && R.isd.recargo.importe) { bl.push({ tipo: "fila", etiqueta: `Recargo por presentación fuera de plazo (${R.isd.recargo.etiqueta})`, valor: pdfEur(R.isd.recargo.importe) }); bl.push({ tipo: "fila", etiqueta: "Sucesiones con recargo", valor: pdfEur(R.isd.totalConRecargo), negrita: true }); bl.push({ tipo: "nota", texto: `Plazo vencido el ${fechaLarga(R.isd.recargo.limite)}; recargo calculado a la fecha del informe sin requerimiento previo (art. 27.2 LGT). Se reduce un 25 % si se ingresa todo al presentar: ${pdfEur(R.isd.recargo.reducido)} (art. 27.5 LGT).` }); }
  // Auditoría civil 10-10-2026 (F-1): intereses de demora del periodo de prórroga (art. 69.2 RD 1629/1991)
  if (R.isd.interesesProrroga) { bl.push({ tipo: "fila", etiqueta: `Intereses de demora de la prórroga (${R.isd.interesesProrrogaDias} días, art. 69.2 RD 1629/1991)`, valor: pdfEur(R.isd.interesesProrroga) }); if (!(R.isd.recargo && R.isd.recargo.importe)) bl.push({ tipo: "fila", etiqueta: "Sucesiones con intereses", valor: pdfEur(R.isd.totalConRecargo), negrita: true }); }

  bl.push({ tipo: "h", numero: "5.", texto: "Plusvalía municipal" });
  if (!R.plus.length) bl.push({ tipo: "p", texto: "Sin inmuebles con los datos catastrales completos. La plusvalía se calculará al completarlos." });
  R.plus.forEach(({ b, r }, i) => {
    bl.push({ tipo: "h", numero: `5.${i + 1}`, texto: `${b.descripcion || "Inmueble"} · ${r.municipio}${r.estimacion && r.estimacion.hacienda ? " (tipo comunicado a Hacienda para 2026)" : r.estimacion && !r.estimacion.manual ? " (cálculo máximo: tipo máximo legal)" : r.estimacion ? " (tipo introducido a mano)" : r.estadoTipo === "PENDIENTE" ? " (ordenanza pendiente de cotejo)" : ""}` });
    if (r.estimacion && r.estimacion.hacienda) bl.push({ tipo: "nota", texto: `Tipo del ${grp(r.tipo * 100, 2)} %: el que el Ayuntamiento${r.estimacion.municipio ? ` de ${r.estimacion.municipio}` : ""} comunica al Ministerio de Hacienda para 2026 (Consulta de información impositiva municipal). Coeficientes máximos legales (art. 107.4 TRLRHL)${r.estimacion.bonifManual ? ` y bonificación del ${grp(r.estimacion.bonifManual, r.estimacion.bonifManual % 1 ? 2 : 0)} % según la ordenanza` : " y sin bonificación: si la ordenanza prevé alguna para herencias, la cuota real será menor"}.` });
    else if (r.estimacion && !r.estimacion.manual) bl.push({ tipo: "nota", texto: `Estimación prudente con el tipo máximo legal${r.estimacion.municipio ? `; consulta la ordenanza de ${r.estimacion.municipio}` : ""}. Se aplican el tipo del 30 % (art. 108.1 TRLRHL), los coeficientes máximos (art. 107.4 TRLRHL) y ninguna bonificación: la cuota real será igual o menor.${r.estimacion.bop && r.estimacion.bop.url ? ` Ordenanza fiscal: ${r.estimacion.bop.nombre || "boletín oficial de la provincia"} (${r.estimacion.bop.url}).` : ""}` });
    if (r.noSujeto) { bl.push({ tipo: "p", texto: "No sujeto: no hubo incremento de valor (art. 104.5 TRLRHL)." }); return; }
    bl.push({ tipo: "fila", etiqueta: "Base por el método objetivo", valor: `${pdfEur(r.baseObjetiva)} (coef. ${grp(r.coeficiente, 2)})` });
    bl.push({ tipo: "fila", etiqueta: "Base por el método real", valor: pdfEur(r.baseReal) });
    bl.push({ tipo: "fila", etiqueta: `Base aplicada (método ${r.metodo})`, valor: pdfEur(r.base) });
    bl.push({ tipo: "fila", etiqueta: `Cuota al ${grp(r.tipo * 100, r.tipo * 100 % 1 ? 2 : 0)} %`, valor: pdfEur(r.cuota) });
    bl.push({ tipo: "tabla", cabecera: ["Titular", "Parte", "Cuota", "Bonificación", "A pagar"], filas: r.porTitular.map((q) => [q.heredero, Math.round(q.fraccion * 10000) / 100 + " %", pdfEur(q.cuota), grp(Math.round(q.bonificacionPct * 1000) / 10, Math.round(q.bonificacionPct * 1000) % 10 ? 1 : 0) + " %", pdfEur(q.aIngresar)]), alinear: ["l", "r", "r", "r", "r"] });
  });
  if (R.plus.length) bl.push({ tipo: "fila", etiqueta: "Total plusvalía", valor: pdfEur(R.totalPlus), negrita: true, separada: true });

  const PT = particion(x, R);
  if (PT.cols.length && PT.B.length) {
    bl.push({ tipo: "h", numero: "6.", texto: "Cuadro de partición" });
    bl.push({ tipo: "tabla", cabecera: ["Bien", ...PT.cols.map((p) => p.nombre || "—")], filas: PT.B.map((q) => [q.b.descripcion || "Bien", ...PT.cols.map((p) => { const c = PT.cell[q.b.id][p.id]; return c ? pdfEur(c.v) : "—"; })]), alinear: ["l", ...PT.cols.map(() => "r")] });
    bl.push({ tipo: "tabla", cabecera: ["Heredero", "Haber", "Adjudicado", "Diferencia"], filas: PT.H.map((h) => [h.p.nombre || "—", pdfEur(h.haber), pdfEur(h.adjud), (h.dif > 0.005 ? "+" : "") + pdfEur(Math.abs(h.dif) < 0.005 ? 0 : h.dif)]), alinear: ["l", "r", "r", "r"] });
    const C = cuadroParticion(x, R);
    if (C && C.excesos.length) {
      bl.push({ tipo: "p", texto: `Una diferencia positiva es un exceso de adjudicación que se compensa en dinero a quien recibe de menos (art. 1062 CC). ${cpTxtCompensaciones(C)}.` });
      bl.push({ tipo: "tabla", cabecera: ["Paga", "Exceso", "Inevitable", "Evitable", "Tributación", "Coste"], filas: C.excesos.map((e) => [e.nombre, pdfEur(e.exceso), pdfEur(e.inevitable), pdfEur(e.evitable), e.txtCoste, pdfEur(e.trib.coste)]), alinear: ["l", "r", "r", "r", "l", "r"] });
      for (const e of C.excesos) if (e.sugerencia) bl.push({ tipo: "p", texto: e.sugerencia });
      for (const a of C.avisos) { bl.push({ tipo: "p", texto: `${a.titulo}. ${a.detalle} Alternativas:` }); bl.push({ tipo: "lista", items: a.alternativas.map((q) => `${q.t} (${q.n}${q.s === "PENDIENTE" ? ", en verificación" : ""})`) }); }
      bl.push({ tipo: "p", texto: `${C.T.ajdNota} El Impuesto sobre Sucesiones no cambia por adjudicar (art. 27.1 Ley 29/1987).` });
    }
  }

  bl.push({ tipo: "h", numero: "7.", texto: "Resumen por heredero" });
  const tot = { v: 0, s: 0, p: 0, e: 0 }, C7 = cuadroParticion(x, R), hayE = !!(C7 && C7.coste > 0.005), exH = (id) => { const e = C7 && C7.excesos.find((q) => q.id === id); return e ? e.trib.coste : 0; };
  const filas = R.isd.herederos.map((h) => { const pl = pp[h.nombre] || 0, ex = exH(h.id); tot.v += h.valorAdquirido; tot.s += h.aIngresar; tot.p += pl; tot.e += ex; return [h.nombre, pdfEur(h.valorAdquirido), pdfEur(h.aIngresar), pdfEur(pl), ...(hayE ? [pdfEur(ex)] : []), pdfEur(h.valorAdquirido - h.aIngresar - pl - ex)]; });
  filas.push(["Total", pdfEur(tot.v), pdfEur(tot.s), pdfEur(tot.p), ...(hayE ? [pdfEur(tot.e)] : []), pdfEur(tot.v - tot.s - tot.p - tot.e)]);
  bl.push({ tipo: "tabla", cabecera: ["Heredero", "Recibe", "Sucesiones", "Plusvalía", ...(hayE ? ["Exceso"] : []), "Le queda"], filas, alinear: ["l", "r", "r", "r", ...(hayE ? ["r"] : []), "r"] });
  if (hayE) bl.push({ tipo: "p", texto: "Exceso: AJD o TPO del exceso de adjudicación, a cargo de quien recibe de más (mismo cálculo que el cuadro de partición)." });

  bl.push(...lgParaInforme(x, R, "8."));
  bl.push(...shParaInforme(x, R));
  const al = [...R.isd.alertas, ...R.plus.flatMap((p) => (p.r.estimacion && !p.r.estimacion.manual ? (p.r.alertas || []).slice(1) : p.r.alertas || []))];
  if (al.length) { bl.push({ tipo: "h", numero: "9.", texto: "Alertas del cálculo" }); bl.push({ tipo: "lista", items: al.slice(0, 20) }); }
  bl.push(...dgParaInforme(x, R));
  if (R.isd.pendientes?.length) bl.push({ tipo: "nota", texto: "Normas pendientes de cotejo en este cálculo: " + R.isd.pendientes.join("; ") + "." });
  bl.push({ tipo: "nota", texto: "Estimación hecha con la normativa vigente a la fecha del fallecimiento y los datos del expediente. Lo revisa y firma un abogado colegiado antes de entregarlo o presentarlo." });
  return bl;
}
function pdfInforme(x) {
  const R = calcular(x); if (!R) return null;
  const bytes = pdfDocumento({ titulo: "Informe de cálculo", subtitulo: x.nombre || "", despacho: pdfDespacho(x), ref: x.despacho?.ref || "", bloques: pdfInformeBloques(x, R) });
  return pdfDescargar("Informe de calculo " + pdfNombreExp(x), bytes);
}
