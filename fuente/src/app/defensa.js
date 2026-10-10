// ───────────────────── {{MARCA}} · defensa tributaria (G07 · defensa.js · prefijo df / DF_) ─────────────────────
// Escritos de la fase posterior a la presentación, hechos con los datos del acto notificado y del expediente, con sus plazos calculados por el
// motor (plazosDefensa, pagoVoluntarioLiquidacion y simularTPC de motor.mjs: los mismos que muestran las pruebas):
//   alegaciones          → alegaciones a la propuesta de liquidación o de valoración (art. 99.8 LGT)
//   reposicion           → recurso de reposición contra la liquidación o la sanción del ISD (arts. 222 a 225 LGT)
//   reclamacionEA        → reclamación económico-administrativa ante el tribunal regional (arts. 226 a 236 y 245 a 248 LGT)
//   tpc                  → solicitud de tasación pericial contradictoria (arts. 57.2 y 135 LGT; arts. 161 y 162 RGAT) y su simulador
//   rectificacion        → rectificación de la autoliquidación y devolución de ingresos indebidos (art. 120.3 y 221.4 LGT; arts. 126 a 129 RGAT)
//   valorReferencia      → impugnación del valor de referencia del Catastro por la rectificación o por el recurso contra la liquidación (art. 9.3 LISD)
//   plusvaliaRecurso     → recurso de reposición contra la liquidación de la plusvalía (art. 14.2 TRLRHL): no incremento, método real, bonificación
//   plusvaliaDevolucion  → rectificación de la autoliquidación de la plusvalía y devolución (arts. 104.5 y 107.5 TRLRHL; art. 120.3 LGT)
// Datos: x.procedimientos = [{ id, tributo: "ISD" | "IIVTNU", tipo (DF_TIPOS del motor), organo, numero, fechaNotificacion, sujetoId, bienId, importe,
//   valorDeclarado, valorComprobado, esValorReferencia, diasAlegaciones, fechaIngreso, motivos, honorariosPerito, valorPeritoPropio }] (la forma que
//   prevé G06 para los procedimientos). El escrito se hace con el acto elegido en el panel (ui.defProc) o, si no, con el último al que corresponde.

const DF_DOCS = { alegaciones: "Alegaciones a la propuesta de liquidación", reposicion: "Recurso de reposición (Sucesiones)", reclamacionEA: "Reclamación económico-administrativa", tpc: "Solicitud de tasación pericial contradictoria", rectificacion: "Rectificación de autoliquidación y devolución", valorReferencia: "Impugnación del valor de referencia", plusvaliaRecurso: "Recurso de reposición: plusvalía municipal", plusvaliaDevolucion: "Plusvalía: rectificación y devolución" };
const DF_TRIB = { ISD: ["propuestaLiquidacion", "liquidacion", "comprobacionValores", "sancion", "autoliquidacion"], IIVTNU: ["propuestaLiquidacion", "liquidacion", "autoliquidacion"] };
const DF_ACTO = { propuestaLiquidacion: "la propuesta de liquidación", liquidacion: "la liquidación provisional", comprobacionValores: "el acuerdo de comprobación de valores y la liquidación que lo acompaña", sancion: "el acuerdo de imposición de sanción", autoliquidacion: "la autoliquidación" };
if (typeof DOC_TIT === "object") Object.assign(DOC_TIT, DF_DOCS);
const dfProcs = (x) => (x.procedimientos = Array.isArray(x.procedimientos) ? x.procedimientos : []);
const dfTxt = (v) => (v != null && String(v).trim() ? String(v).trim() : "");
function dfEscritosDe(P) {
  if (!P) return [];
  if (P.tributo === "IIVTNU") return P.tipo === "propuestaLiquidacion" ? ["alegaciones"] : P.tipo === "autoliquidacion" ? ["plusvaliaDevolucion"] : ["plusvaliaRecurso"];
  if (P.tipo === "propuestaLiquidacion") return ["alegaciones"];
  if (P.tipo === "autoliquidacion") return P.esValorReferencia ? ["valorReferencia", "rectificacion"] : ["rectificacion"];
  if (P.tipo === "sancion") return ["reposicion", "reclamacionEA"];
  return P.esValorReferencia ? ["reposicion", "reclamacionEA", "valorReferencia"] : ["reposicion", "reclamacionEA", "tpc"];
}
const dfForal = (x, b) => ["NAV", "ALA", "BIZ", "GIP"].includes(x.ccaa) || !!(b && typeof muniProv === "function" && typeof ineBien === "function" && (() => { const pv = muniProv(ineBien(b)); return pv && ["ALA", "BIZ", "GIP", "NAV"].includes(pv.ccaa); })());
function dfPlazos(x, R, P) {
  const b = (x.bienes || []).find((q) => q.id === P.bienId), fin = ((R && R.plazos) || []).find((q) => q.id === (P.tributo === "IIVTNU" ? "plusvalia" : "isd"));
  return plazosDefensa({ tributo: P.tributo, tipo: P.tipo, fechaNotificacion: P.fechaNotificacion, diasAlegaciones: P.diasAlegaciones, finPlazoPresentacion: fin && fin.limite, fechaIngreso: P.fechaIngreso, foral: P.tributo === "IIVTNU" ? dfForal({ ccaa: "" }, b) : dfForal(x, null) });
}
// Acto con el que se hace el escrito
function dfProcPara(x, clave) {
  const L = dfProcs(x), sel = L.find((p) => typeof ui === "object" && p.id === ui.defProc);
  if (sel && dfEscritosDe(sel).includes(clave)) return sel;
  return [...L].reverse().find((p) => dfEscritosDe(p).includes(clave)) || { tributo: /^plusvalia/.test(clave) ? "IIVTNU" : "ISD", tipo: { alegaciones: "propuestaLiquidacion", rectificacion: "autoliquidacion", plusvaliaDevolucion: "autoliquidacion", valorReferencia: "autoliquidacion" }[clave] || "liquidacion" };
}
// Cuota del ISD con un bien cambiado (valor comprobado, valor de mercado…): para el simulador y la devolución estimada. Mismo motor, sin memoria.
function dfCuotaCon(x, R, P, cambios) {
  try {
    const y = JSON.parse(JSON.stringify(x)), b = (y.bienes || []).find((q) => q.id === P.bienId); if (!b || !R) return null;
    Object.assign(b, cambios); const R2 = calcularBase(y); if (!R2) return null;
    const h1 = R.isd.herederos.find((q) => q.id === P.sujetoId), h2 = R2.isd.herederos.find((q) => q.id === P.sujetoId);
    return h1 && h2 ? Math.round((h2.aIngresar - h1.aIngresar) * 100) / 100 : Math.round((R2.isd.total - R.isd.total) * 100) / 100;
  } catch (e) { return null; }
}
function dfSimulacion(x, R, P) {
  const b = (x.bienes || []).find((q) => q.id === P.bienId); if (!b || P.tributo !== "ISD" || P.esValorReferencia) return null;
  const vDec = num(P.valorDeclarado) || Math.max(num(b.valor), num(b.valorReferencia)), vCom = num(P.valorComprobado); if (!vCom) return null;
  const fin = ((R && R.plazos) || []).find((q) => q.id === "isd"), d = fin && fin.limite && P.fechaNotificacion ? Math.max(0, dias(fin.limite, P.fechaNotificacion)) : 0;
  const cuota = vCom > vDec ? dfCuotaCon(x, R, P, { valor: vCom }) : 0;
  return simularTPC({ valorDeclarado: vDec, valorComprobado: vCom, cuotaAdicional: cuota != null ? Math.max(0, cuota) : null, tipoMedio: 0, honorariosPerito: P.honorariosPerito, diasIntereses: d, valorPeritoPropio: P.valorPeritoPropio });
}

// ── Contexto común de los escritos ──
function dfCtx(x, R, clave) {
  const c = esrCtx(x, R), P = dfProcPara(x, clave), V = esrVivos(x);
  const s = (x.personas || []).find((p) => p.id === P.sujetoId) || V[0] || null, b = (x.bienes || []).find((q) => q.id === P.bienId) || null;
  const pz = dfPlazos(x, R, P), pl = Object.fromEntries(pz.items.map((q) => [q.id, q]));
  const local = P.tributo === "IIVTNU", mu = b && typeof tcMuniN === "function" ? tcMuniN(b) : "";
  const imp = local ? `Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana devengado por la transmisión por causa de muerte de ${b ? esrNomB(b) : "⟦inmueble⟧"}${b && b.refCatastral ? ` (referencia catastral ${b.refCatastral})` : ""}, por el fallecimiento de ${c.trC}${c.causante} el ${c.fm}` : `Impuesto sobre Sucesiones y Donaciones por la herencia de ${c.trC}${c.causante}, con NIF ${c.nifC}, ${c.falC} el ${c.fm}`;
  const organo = dfTxt(P.organo) || (local ? `Ayuntamiento de ${mu || "⟦municipio⟧"} · ⟦órgano de gestión tributaria⟧` : `⟦órgano que dictó el acto: oficina liquidadora o servicio de gestión tributaria de ${typeof nombreTerr === "function" ? nombreTerr(x.ccaa) : "la comunidad autónoma"}⟧`);
  const sujeto = `${s ? `${gnTrat(s)}${esrPh(s.nombre, "nombre y apellidos")}` : "⟦nombre y apellidos del obligado tributario⟧"}, con NIF ${esrPh(s && s.nif, "NIF")} y domicilio en ${esrPh(s && s.domicilio, "domicilio")}, ${local ? "adquirente y sujeto pasivo del impuesto (art. 106.1.a TRLRHL)" : `${s ? gnRel(s) + " del causante, " : ""}heredero y obligado tributario (art. 5 Ley 29/1987)`}, ${c.abNom ? `con la representación de ${c.abNom}, ${gnAbogado(c.ab)}${c.KD.nombre ? ` de ${c.KD.nombre}` : ""}, que acredita con el documento que se acompaña (art. 46 LGT), y con domicilio a efectos de notificaciones en ${esrPh(c.KD.postal, "domicilio del despacho")}` : "en su propio nombre"}`;
  const acto = `${DF_ACTO[P.tipo] || "el acto"}${dfTxt(P.numero) ? ` con referencia ${dfTxt(P.numero)}` : " con referencia ⟦número de expediente o de liquidación⟧"}`;
  const fNot = P.fechaNotificacion ? fechaLarga(P.fechaNotificacion) : "⟦fecha de notificación⟧";
  const importe = num(P.importe) ? eur(num(P.importe)) : "⟦importe⟧";
  const firmas = [s ? `Fdo.: ${s.nombre || "⟦nombre⟧"}` : "Fdo.: ⟦obligado tributario⟧", ...(c.abNom ? [`Fdo.: ${c.abNom}`] : [])].join("\n");
  const plazoTxt = (q, base) => (q && q.limite ? `${base}, que vence el ${fechaLarga(q.limite)}` : `${base} ⟦fecha límite: falta la fecha de notificación⟧`);
  const h = R && R.isd && s ? R.isd.herederos.find((q) => q.id === s.id) : null;
  const fem = P.tipo !== "comprobacionValores" && P.tipo !== "sancion", nt = fem ? "notificada" : "notificado", rel = fem ? "relativa" : "relativo";
  return { c, P, s, b, h, pz, pl, local, mu, imp, organo, sujeto, acto, fNot, importe, firmas, plazoTxt, nt, rel, ella: fem ? "ella" : "él", foral: pz.estado === "PENDIENTE" };
}
const dfMotivos = (C) => dfTxt(C.P.motivos) ? `${dfTxt(C.P.motivos)}` : "";
// Motivos sobre la valoración: motivación, medio de comprobación y visita (arts. 57, 102.2.c y 134 LGT)
function dfMotivosValor(C, letra = "") {
  const vDec = num(C.P.valorDeclarado) || (C.b ? Math.max(num(C.b.valor), num(C.b.valorReferencia)) : 0), vCom = num(C.P.valorComprobado);
  const bien = C.b ? `${esrNomB(C.b)}${C.b.refCatastral ? ` (referencia catastral ${C.b.refCatastral})` : ""}` : "⟦inmueble⟧";
  return [
    `${letra}Falta de motivación de la valoración. ${vCom ? `El acto eleva el valor declarado de ${bien}, ${vDec ? eur(vDec) : "⟦valor declarado⟧"}, a ${eur(vCom)}` : `El acto modifica el valor declarado de ${bien}`}, sin expresar de forma individualizada los datos, el medio de comprobación del art. 57.1 LGT utilizado y los criterios aplicados, lo que impide conocer y discutir la valoración. La motivación es exigible a toda liquidación que no se ajusta a lo declarado (art. 102.2.c LGT) y a la comprobación de valores (art. 134 LGT).`,
    "Medio de comprobación inidóneo. Si el valor resulta de aplicar coeficientes al valor catastral o de una valoración genérica, sin examen de las características del inmueble concreto, no sirve por sí solo para comprobar el valor real (Sentencia del Tribunal Supremo de 23 de mayo de 2018, recurso 4202/2017). Si resulta del dictamen de un perito de la Administración, este debe justificar la valoración del inmueble concreto y, salvo causa que lo justifique, reconocerlo personalmente.",
  ];
}
const dfRevComun = (C) => [esrREV(`plazo y órgano: cotejar con el pie de recursos de la notificación, que manda sobre lo calculado aquí.${C.foral ? " Territorio foral: la Ley General Tributaria no rige; adaptar los recursos y sus plazos a la Norma Foral General Tributaria." : ""} Solo se descuentan los festivos nacionales.`)];

// ───────────────────── 1. Alegaciones a la propuesta ─────────────────────
function esrAlegaciones(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "alegaciones"), q = C.pl.alegaciones, out = [];
  out.push(`${C.c.membrete}ESCRITO DE ALEGACIONES A LA PROPUESTA DE LIQUIDACIÓN`, `${C.local ? "Plusvalía municipal" : "Impuesto sobre Sucesiones"} · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `A ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, en el trámite de alegaciones concedido, DICE:`);
  out.push("", `Que el ${C.fNot} le fue ${C.nt} ${C.acto}, ${C.rel} al ${C.imp}, con una deuda propuesta de ${C.importe}, y que dentro del ${C.plazoTxt(q, `plazo de ${q && /\((\d+) días/.test(q.nombre) ? /\((\d+) días/.exec(q.nombre)[1] : "diez"} días hábiles concedido (art. 99.8 LGT)`)} formula las siguientes`, "", "ALEGACIONES");
  const M = [];
  if (!C.local && (num(C.P.valorComprobado) || C.P.esValorReferencia)) {
    if (C.P.esValorReferencia) M.push(`Sobre el valor de referencia. La propuesta toma el valor de referencia del Catastro (art. 9.3 Ley 29/1987). Ese valor es superior al valor de mercado del inmueble a la fecha del devengo, como se acredita con ⟦tasación o informe pericial que se aporta⟧, y puede impugnarse con ocasión de la liquidación; procede recabar el informe de la Dirección General del Catastro sobre el valor de referencia a la vista de esa prueba.`);
    else M.push(...dfMotivosValor(C));
  }
  if (C.local) M.push(`Sobre la base imponible. ${dfPlusFondo(x, R, C).join(" ")}`);
  if (dfMotivos(C)) M.push(dfMotivos(C));
  if (!M.length) M.push("⟦motivos: valoración, reducciones o bonificaciones no aplicadas, deudas o gastos deducibles no computados, errores de cálculo⟧");
  out.push("", M.map((t, i) => `${ESR_ORD[i]}. ${t}`).join("\n\n"));
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por presentado este escrito y por formuladas las alegaciones que contiene y, en su virtud, ${C.local ? "dicte liquidación conforme a ellas o declare la no sujeción de la transmisión" : "se archive el procedimiento o se dicte liquidación conforme a lo declarado"}, con el pronunciamiento expreso sobre cada una de ellas que exige el art. 103 LGT.`);
  out.push("", `OTROSÍ DICE que, para poder defenderse, solicita copia íntegra del expediente y, en particular, del informe de valoración (art. 34.1 LGT).`);
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Copia de la propuesta notificada.", ...(C.c.abNom ? ["Documento de representación (art. 46 LGT)."] : []), "⟦Prueba de lo alegado: tasación, títulos, justificantes⟧."].map((t) => "- " + t).join("\n"));
  out.push("", ...dfRevComun(C), esrREV("las alegaciones no suspenden nada ni son un recurso: si después se dicta la liquidación, se recurre en el plazo de un mes desde su notificación."));
  return out.join("\n");
}

// ───────────────────── 2. Recurso de reposición (ISD) ─────────────────────
function esrReposicion(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "reposicion"), q = C.pl.reposicion, san = C.P.tipo === "sancion", out = [];
  out.push(`${C.c.membrete}RECURSO DE REPOSICIÓN`, `${san ? "Contra el acuerdo sancionador" : "Contra la liquidación"} · Impuesto sobre Sucesiones · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `A ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, como mejor proceda en Derecho, DICE:`);
  out.push("", `Que el ${C.fNot} le fue ${C.nt} ${C.acto}, ${C.rel} al ${C.imp}, por importe de ${C.importe}, y que, no estando conforme, interpone contra ${C.ella} RECURSO DE REPOSICIÓN con base en los siguientes`, "", "HECHOS");
  out.push("", `PRIMERO. ${C.h ? `En la autoliquidación del impuesto se declaró un valor adquirido de ${eur(C.h.valorAdquirido)} y una cuota a ingresar de ${eur(C.h.aIngresar)}, según el cálculo del expediente.` : "⟦autoliquidación presentada: fecha, base y cuota⟧."}`, "", `SEGUNDO. ${san ? "La Administración impone una sanción por ⟦infracción imputada⟧." : num(C.P.valorComprobado) ? `La Administración ha comprobado el valor de ${C.b ? esrNomB(C.b) : "⟦bien⟧"} en ${eur(num(C.P.valorComprobado))} y practica la liquidación sobre ese valor.` : "⟦hechos de la liquidación: qué regulariza la Administración⟧."}`);
  out.push("", "FUNDAMENTOS DE DERECHO", "", `I. Procedimiento. El acto es recurrible en reposición ante el mismo órgano que lo dictó (arts. 222 y 225.1 LGT), por quien es obligado tributario (art. 223.3 LGT), dentro del ${C.plazoTxt(q, "plazo de un mes desde el día siguiente a su notificación (art. 223.1 LGT)")}.`);
  const F = san ? ["Falta de motivación de la culpabilidad. No basta con describir el resultado: el acuerdo debe razonar por qué la conducta es culpable (arts. 179.2.d y 183.1 LGT); una interpretación razonable de la norma excluye la responsabilidad."] : num(C.P.valorComprobado) ? dfMotivosValor(C) : [];
  if (dfMotivos(C)) F.push(dfMotivos(C));
  if (!F.length) F.push("⟦motivos de fondo: reducciones no aplicadas, deudas o gastos no deducidos, errores en la base o en la cuota⟧");
  out.push("", F.map((t, i) => `${ESR_ROM[i + 1]}. ${t}`).join("\n\n"));
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por interpuesto en plazo este recurso de reposición contra ${C.acto} y, en su virtud, ${san ? "anule la sanción impuesta" : "anule la liquidación y, en su caso, dicte otra conforme a lo declarado"}.`);
  out.push("", san ? "OTROSÍ DICE que la interposición de este recurso suspende automáticamente la ejecución de la sanción, sin necesidad de garantía (art. 212.3 LGT)." : "OTROSÍ DICE que solicita la suspensión de la ejecución del acto impugnado mientras se resuelve, con aportación de ⟦garantía: aval bancario, depósito o certificado de seguro de caución⟧ (art. 224.1 LGT).");
  if (!san && num(C.P.valorComprobado)) out.push("", "SEGUNDO OTROSÍ DICE que, por no contener la notificación expresión suficiente de los datos y motivos tenidos en cuenta para elevar el valor declarado, denuncia esa omisión y se reserva el derecho a promover la tasación pericial contradictoria (art. 135.1 LGT).");
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Copia del acto notificado.", ...(C.c.abNom ? ["Documento de representación (art. 46 LGT)."] : []), "⟦Prueba de lo alegado⟧."].map((t) => "- " + t).join("\n"));
  out.push("", ...dfRevComun(C), esrREV(`el recurso se resuelve en un mes; si no hay respuesta, se entiende desestimado y cabe la reclamación económico-administrativa (art. 225.4 LGT). No se puede reclamar a la vez que se recurre en reposición (art. 222.2 LGT).${!san && num(C.P.valorComprobado) ? " La reserva de la tasación pericial contradictoria solo opera si la normativa del impuesto la prevé: si no, valorar pedir la tasación directamente en este plazo." : ""}${san ? " Recurrir la sanción hace perder la reducción del 25 % por pronto pago (art. 188.3 LGT): valorarlo con el cliente." : ""}`));
  return out.join("\n");
}

// ───────────────────── 3. Reclamación económico-administrativa ─────────────────────
function esrReclamacionEA(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "reclamacionEA"), q = C.pl.reclamacionEA, san = C.P.tipo === "sancion", out = [];
  const terr = typeof nombreTerr === "function" ? nombreTerr(x.ccaa) : "", cuantia = num(C.P.importe), abrev = cuantia > 0 && cuantia < 6000;
  const tear = ["CEU", "MEL"].includes(x.ccaa) ? `TRIBUNAL ECONÓMICO-ADMINISTRATIVO LOCAL DE ${esrUp(terr)}` : terr && !["EST", "NAV", "ALA", "BIZ", "GIP"].includes(x.ccaa) ? `TRIBUNAL ECONÓMICO-ADMINISTRATIVO REGIONAL DE ${esrUp(terr)}` : "TRIBUNAL ECONÓMICO-ADMINISTRATIVO ⟦COMPETENTE⟧";
  out.push(`${C.c.membrete}RECLAMACIÓN ECONÓMICO-ADMINISTRATIVA`, `${san ? "Contra el acuerdo sancionador" : "Contra la liquidación"} · Impuesto sobre Sucesiones · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `AL ${tear}`, `(por conducto de ${C.organo}, órgano que dictó el acto: art. 235.3 LGT)`);
  out.push("", `${C.sujeto}, ante el Tribunal comparece y, como mejor proceda en Derecho, DICE:`);
  out.push("", `Que el ${C.fNot} le fue ${C.nt} ${C.acto}, ${C.rel} al ${C.imp}, por importe de ${C.importe}, y que, dentro del ${C.plazoTxt(q, "plazo de un mes desde el día siguiente a su notificación (art. 235.1 LGT)")}, interpone contra ${C.ella} RECLAMACIÓN ECONÓMICO-ADMINISTRATIVA.`);
  out.push("", `Que la reclamación ${abrev ? `es de cuantía inferior a 6.000 € (${eur(cuantia)}) y se tramita por el procedimiento abreviado (arts. 245 y 246 LGT), por lo que acompaña sus alegaciones en este escrito` : "se tramita por el procedimiento general; sin perjuicio de las alegaciones que formulará cuando se le ponga de manifiesto el expediente (art. 236.1 LGT), anticipa las siguientes"}:`);
  const F = san ? ["Falta de motivación de la culpabilidad (arts. 179.2.d y 183.1 LGT)."] : num(C.P.valorComprobado) ? dfMotivosValor(C) : [];
  if (dfMotivos(C)) F.push(dfMotivos(C));
  if (!F.length) F.push("⟦motivos de fondo⟧");
  out.push("", "ALEGACIONES", "", F.map((t, i) => `${ESR_ORD[i]}. ${t}`).join("\n\n"));
  out.push("", "Por lo expuesto,", "", "SOLICITA AL TRIBUNAL", "", `Que tenga por interpuesta en plazo esta reclamación contra ${C.acto}${abrev ? "" : ", ponga de manifiesto el expediente para formular alegaciones y proponer prueba"} y, en su día, dicte resolución que ${san ? "anule la sanción" : "anule la liquidación"}.`);
  out.push("", san ? "OTROSÍ DICE que la reclamación suspende automáticamente la ejecución de la sanción, sin garantía (art. 212.3 LGT)." : "OTROSÍ DICE que solicita la suspensión de la ejecución del acto con aportación de ⟦garantía⟧ (art. 233 LGT).");
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Copia del acto reclamado y de su notificación.", ...(C.c.abNom ? ["Documento de representación (art. 46 LGT)."] : []), "⟦Prueba de lo alegado⟧."].map((t) => "- " + t).join("\n"));
  out.push("", ...dfRevComun(C), esrREV(`tribunal competente: los actos de las comunidades autónomas sobre tributos cedidos los revisan, por regla general, los tribunales económico-administrativos del Estado; comprobar si la comunidad ha asumido esa revisión con órganos propios y el pie de recursos de la notificación. El umbral del procedimiento abreviado (6.000 €; 72.000 € si se reclama contra bases o valoraciones) es el del art. 64 del Reglamento de revisión (RD 520/2005): verificarlo. Después cabe recurso contencioso-administrativo en dos meses (art. 46.1 LJCA).`));
  return out.join("\n");
}

// ───────────────────── 4. Tasación pericial contradictoria ─────────────────────
function esrTPC(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "tpc"), q = C.pl.tpc, S = dfSimulacion(x, R, C.P), out = [];
  const vDec = num(C.P.valorDeclarado) || (C.b ? Math.max(num(C.b.valor), num(C.b.valorReferencia)) : 0), vCom = num(C.P.valorComprobado);
  const bien = C.b ? `${esrNomB(C.b)}${C.b.refCatastral ? `, con referencia catastral ${C.b.refCatastral}` : ""}${C.b.tipo === "vivienda" || C.b.tipo === "inmueble" ? (() => { const G = esrRegistral(C.b); return G.completo ? `, ${G.linea.charAt(0).toLowerCase() + G.linea.slice(1)}` : ""; })() : ""}` : "⟦bien: descripción y referencia catastral⟧";
  out.push(`${C.c.membrete}SOLICITUD DE TASACIÓN PERICIAL CONTRADICTORIA`, `Impuesto sobre Sucesiones · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `A ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, como mejor proceda en Derecho, DICE:`);
  out.push("", `PRIMERO. Que el ${C.fNot} le fue ${C.nt} ${C.acto}, ${C.rel} al ${C.imp}, en el que el valor declarado de ${bien}, ${vDec ? eur(vDec) : "⟦valor declarado⟧"}, se eleva a ${vCom ? eur(vCom) : "⟦valor comprobado⟧"}, con una deuda de ${C.importe}.`);
  out.push("", "SEGUNDO. Que no está conforme con el valor comprobado y, frente a él, promueve la tasación pericial contradictoria, que permite confirmar o corregir las valoraciones obtenidas por los medios del art. 57.1 LGT (art. 57.2 LGT).");
  out.push("", `TERCERO. Que la solicitud se presenta dentro del ${C.plazoTxt(q, "plazo del primer recurso que procede contra la liquidación (art. 135.1 LGT)")}, y que su presentación suspende la ejecución de la liquidación y el plazo para recurrirla (art. 135.1 LGT).`);
  out.push("", `CUARTO. Que designa como perito a ⟦nombre, titulación adecuada a la naturaleza del bien (arquitecto, arquitecto técnico o ingeniero) y colegiación⟧, que emitirá su valoración en el plazo que se le conceda, motivada y con referencia al inmueble concreto (art. 135.2 LGT y arts. 161 y 162 del Reglamento de gestión e inspección, RD 1065/2007)${num(C.P.valorPeritoPropio) ? `. Su valoración previa es de ${eur(num(C.P.valorPeritoPropio))}` : ""}.`);
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por promovida en plazo la tasación pericial contradictoria contra la valoración de ${C.b ? esrNomB(C.b) : "⟦bien⟧"}, suspenda la ejecución de la liquidación y el plazo para recurrirla, y continúe el procedimiento conforme al art. 135 LGT.`);
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Copia de la liquidación y de la valoración notificadas.", ...(C.c.abNom ? ["Documento de representación (art. 46 LGT)."] : []), "⟦Aceptación del perito designado y, si se tiene, su informe⟧."].map((t) => "- " + t).join("\n"));
  out.push("", ...dfRevComun(C));
  out.push(esrREV(`costes: los honorarios del perito propio los paga el contribuyente. Si la diferencia entre el valor del perito de la Administración y el del propio no supera 120.000 € ni el 10 % de la tasación propia, vale la propia (art. 135.2 LGT); si no, se nombra un perito tercero, cuyos honorarios paga el contribuyente si su valoración supera en más del 20 % el valor declarado (art. 135.3 LGT). No cabe contra el valor de referencia del Catastro, que se discute recurriendo la liquidación.`));
  if (S) out.push(esrREV(`simulación del despacho (no presentar): diferencia ${eur(S.diferencia)}; cuota adicional según el cálculo del expediente ${eur(S.cuotaAdicional)}; intereses de demora estimados ${eur(S.intereses)}; coste del perito ${eur(S.costePerito)}${S.costeEstimado ? " (estimado)" : ""}. Resultado: ${S.recomendacion}. ${S.texto} ${S.riesgo}${S.valePropia === true ? " Con la valoración del perito propio indicada, se aplicaría esa valoración." : S.valePropia === false ? " Con la valoración del perito propio indicada, haría falta perito tercero." : ""}`));
  return out.join("\n");
}

// ───────────────────── 5. Rectificación de autoliquidación (ISD) ─────────────────────
function esrRectificacion(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "rectificacion"), q = C.pl.rectificacion, out = [];
  const ingresado = num(C.P.importe), correcto = C.h ? C.h.aIngresar : null, dev = ingresado && correcto != null && ingresado - correcto > 0.005 ? Math.round((ingresado - correcto) * 100) / 100 : 0;
  out.push(`${C.c.membrete}SOLICITUD DE RECTIFICACIÓN DE AUTOLIQUIDACIÓN Y DE DEVOLUCIÓN DE INGRESOS INDEBIDOS`, `Impuesto sobre Sucesiones · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `A ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, como mejor proceda en Derecho, EXPONE:`);
  out.push("", `PRIMERO. Que presentó ${C.acto} del ${C.imp}${C.P.fechaIngreso ? ` e ingresó el ${fechaLarga(C.P.fechaIngreso)}` : " e ingresó ⟦fecha del ingreso⟧"} una cuota de ${ingresado ? eur(ingresado) : "⟦importe ingresado⟧"}.`);
  out.push("", `SEGUNDO. Que la autoliquidación perjudica sus intereses legítimos porque ${dfMotivos(C) || "⟦error: deuda o gasto deducible no computado, reducción o bonificación no aplicada, valor declarado superior al real⟧"}.${correcto != null ? ` Corregido el error, la cuota que le corresponde es de ${eur(correcto)}${dev ? `, por lo que ingresó indebidamente ${eur(dev)}` : ""}, según el cálculo que se acompaña.` : ""}`);
  out.push("", `TERCERO. Que la solicitud se presenta antes de que la Administración haya practicado liquidación definitiva y dentro del plazo de cuatro años del derecho a solicitar la devolución (arts. 66.c y 67.1 LGT; art. 126.2 RGAT), ${q && q.limite ? `que termina el ${fechaLarga(q.limite)}` : "⟦fin del plazo⟧"}.`);
  out.push("", "FUNDAMENTOS DE DERECHO", "", "I. El obligado tributario que considera que una autoliquidación ha perjudicado sus intereses legítimos puede instar su rectificación (art. 120.3 LGT), con el procedimiento de los arts. 126 a 129 del Reglamento de gestión e inspección (RD 1065/2007), que se aplica también a la devolución de ingresos indebidos derivados de una autoliquidación (art. 221.4 LGT).", "", "II. La cantidad ingresada indebidamente se devuelve con el interés de demora desde la fecha del ingreso hasta la de la propuesta de pago (art. 32.2 LGT).");
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por presentada esta solicitud, rectifique la autoliquidación en los términos expuestos y acuerde la devolución de ${dev ? eur(dev) : "⟦importe⟧"} más los intereses de demora, mediante transferencia a la cuenta ⟦IBAN del obligado tributario⟧.`);
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Copia de la autoliquidación y del justificante de ingreso.", "Justificación del error (certificados, escrituras, informes).", "Certificado de titularidad de la cuenta para la devolución.", ...(C.c.abNom ? ["Documento de representación (art. 46 LGT)."] : [])].map((t) => "- " + t).join("\n"));
  out.push("", esrREV("la Administración tiene seis meses para resolver; sin respuesta, se entiende desestimada y cabe recurso de reposición o reclamación económico-administrativa. La devolución es una estimación con los datos actuales del expediente: cuadrar con la autoliquidación presentada."));
  return out.join("\n");
}

// ───────────────────── 6. Impugnación del valor de referencia ─────────────────────
function esrValorReferencia(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "valorReferencia"), autol = C.P.tipo === "autoliquidacion", q = autol ? C.pl.valorReferencia : C.pl.reposicion, out = [];
  const vr = num(C.P.valorComprobado) || (C.b ? num(C.b.valorReferencia) : 0), vm = num(C.P.valorDeclarado) && num(C.P.valorDeclarado) < vr ? num(C.P.valorDeclarado) : 0;
  const dif = vm && C.b ? dfCuotaCon(x, R, C.P, { valor: vm, valorReferencia: vm }) : null, dev = dif != null && dif < 0 ? -dif : 0;
  const bien = C.b ? `${esrNomB(C.b)}${C.b.refCatastral ? `, con referencia catastral ${C.b.refCatastral}` : ", ⟦referencia catastral⟧"}` : "⟦inmueble y referencia catastral⟧";
  out.push(`${C.c.membrete}${autol ? "SOLICITUD DE RECTIFICACIÓN DE AUTOLIQUIDACIÓN POR SER EL VALOR DE REFERENCIA SUPERIOR AL VALOR DE MERCADO" : "RECURSO DE REPOSICIÓN CONTRA LA LIQUIDACIÓN BASADA EN EL VALOR DE REFERENCIA"}`, `Impuesto sobre Sucesiones · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `A ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, como mejor proceda en Derecho, EXPONE:`);
  out.push("", `PRIMERO. Que en ${autol ? "la autoliquidación" : "la liquidación notificada el " + C.fNot}${!autol && dfTxt(C.P.numero) ? ` con referencia ${dfTxt(C.P.numero)}` : ""} del ${C.imp} se ha tomado como valor de ${bien} su valor de referencia a la fecha del devengo, ${vr ? eur(vr) : "⟦valor de referencia⟧"}, como base mínima (art. 9.3 Ley 29/1987).`);
  out.push("", `SEGUNDO. Que ese valor excede del valor de mercado del inmueble a esa fecha, que es de ${vm ? eur(vm) : "⟦valor de mercado⟧"}, como acredita con ⟦tasación o informe pericial motivado, con las características del inmueble: estado de conservación, superficie real, cargas, situación⟧ que se acompaña.`);
  out.push("", `TERCERO. Que el valor de referencia puede impugnarse ${autol ? "solicitando la rectificación de la autoliquidación (art. 120.3 LGT)" : "recurriendo la liquidación (arts. 222 y 223 LGT)"}; en ese procedimiento la Administración tributaria debe recabar el informe preceptivo y vinculante de la Dirección General del Catastro, que ratificará o corregirá el valor de referencia a la vista de la documentación aportada (disposición final tercera del texto refundido de la Ley del Catastro Inmobiliario, en la redacción de la Ley 11/2021).`);
  out.push("", `CUARTO. Que se presenta dentro del ${C.plazoTxt(q, autol ? "plazo de cuatro años para solicitar la rectificación (arts. 66.c y 67.1 LGT)" : "plazo de un mes desde el día siguiente a la notificación (art. 223.1 LGT)")}.${dev ? ` Con el valor de mercado, la cuota se reduce en ${eur(dev)} según el cálculo del expediente.` : ""}`);
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por presentado este escrito, recabe el informe de la Dirección General del Catastro sobre el valor de referencia de ${C.b ? esrNomB(C.b) : "⟦inmueble⟧"} y, a su vista, ${autol ? `rectifique la autoliquidación tomando el valor de mercado acreditado y devuelva ${dev ? eur(dev) : "⟦importe⟧"} con los intereses de demora (art. 32.2 LGT)` : "anule la liquidación y dicte otra con el valor de mercado acreditado"}.`);
  if (!autol) out.push("", "OTROSÍ DICE que solicita la suspensión de la ejecución de la liquidación con aportación de ⟦garantía⟧ (art. 224.1 LGT).");
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Certificado del valor de referencia a la fecha del devengo (Sede Electrónica del Catastro).", "Tasación o informe pericial del valor de mercado.", ...(C.c.abNom ? ["Documento de representación (art. 46 LGT)."] : [])].map((t) => "- " + t).join("\n"));
  out.push("", ...dfRevComun(C), esrREV("contra el valor de referencia no cabe la tasación pericial contradictoria. La prueba del menor valor corresponde al contribuyente: sin una tasación motivada del inmueble concreto la impugnación no prospera. Cotejar la cita del informe preceptivo y vinculante del Catastro con la redacción vigente de la norma del impuesto y del texto refundido de la Ley del Catastro."));
  return out.join("\n");
}

// ───────────────────── 7 y 8. Plusvalía: recurso y devolución ─────────────────────
// Motivos con las cifras del motor (calcularPlusvalia): no sujeción por falta de incremento, método real inferior, bonificación de la ordenanza
function dfPlusDatos(x, R, C) {
  const e = (R.plus || []).find((q) => C.b && q.b && q.b.id === C.b.id) || null, r = e && e.r;
  const t = r && C.s ? (r.porTitular || []).find((q) => q.heredero === C.s.nombre) : null;
  const correcto = r ? (r.noSujeto ? 0 : t ? t.aIngresar : r.total) : null, pagado = num(C.P.importe);
  return { r, t, correcto, pagado, dev: pagado && correcto != null && pagado - correcto > 0.005 ? Math.round((pagado - correcto) * 100) / 100 : 0 };
}
function dfPlusFondo(x, R, C) {
  const D = dfPlusDatos(x, R, C), r = D.r, L = [];
  if (!r) return ["⟦motivos: no hubo incremento de valor (art. 104.5 TRLRHL), el incremento real es menor que la base objetiva (art. 107.5 TRLRHL) o no se aplicó la bonificación de la ordenanza (art. 108.4 TRLRHL)⟧."];
  if (r.noSujeto) L.push(`No hubo incremento de valor del terreno: comparado el valor de adquisición, ${C.b && num(C.b.valorAdq) ? eur(num(C.b.valorAdq)) : "⟦valor de adquisición⟧"} según el título, con el de transmisión, que es el declarado en el Impuesto sobre Sucesiones, en la proporción que representa el valor catastral del suelo, la transmisión no está sujeta (art. 104.5 TRLRHL).`);
  else {
    if (num(r.baseReal) < num(r.baseObjetiva) - 0.005) L.push(`El incremento real del terreno (${eur(r.baseReal)}) es inferior a la base calculada por el método objetivo (${eur(r.baseObjetiva)}), por lo que la base imponible es el incremento real (art. 107.5 TRLRHL, en relación con el art. 104.5).`);
    if (D.t && D.t.bonificacionPct > 0) L.push(`Procede la bonificación del ${grp(Math.round(D.t.bonificacionPct * 1000) / 10, Math.round(D.t.bonificacionPct * 1000) % 10 ? 1 : 0)} % que la ordenanza fiscal prevé para las transmisiones por causa de muerte a favor de ${gnRel(C.s) || "parientes"} del causante (art. 108.4 TRLRHL), cuyos requisitos se acreditan.`);
  }
  if (D.correcto != null) L.push(`Con ello, la cuota que corresponde es de ${eur(D.correcto)}${D.pagado ? ` frente a los ${eur(D.pagado)} ${C.P.tipo === "autoliquidacion" ? "ingresados" : "liquidados"}${D.dev ? `: ${eur(D.dev)} de diferencia` : ""}` : ""}.`);
  if (dfMotivos(C)) L.push(dfMotivos(C));
  return L;
}
function esrPlusvaliaRecurso(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "plusvaliaRecurso"), q = C.pl.reposicionLocal, D = dfPlusDatos(x, R, C), out = [];
  out.push(`${C.c.membrete}RECURSO DE REPOSICIÓN CONTRA LA LIQUIDACIÓN DEL IMPUESTO SOBRE EL INCREMENTO DE VALOR DE LOS TERRENOS DE NATURALEZA URBANA`, `Plusvalía municipal · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `AL ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, como mejor proceda en Derecho, DICE:`);
  out.push("", `Que el ${C.fNot} le fue ${C.nt} ${C.acto}, ${C.rel} al ${C.imp}, por importe de ${C.importe}, y que, dentro del ${C.plazoTxt(q, "plazo de un mes desde el día siguiente a su notificación (art. 14.2.c TRLRHL)")}, interpone contra ${C.ella} el RECURSO DE REPOSICIÓN que, como previo al contencioso-administrativo, regula el art. 14.2 TRLRHL, con base en las siguientes`, "", "ALEGACIONES");
  out.push("", dfPlusFondo(x, R, C).map((t, i) => `${ESR_ORD[i]}. ${t}`).join("\n\n"));
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por interpuesto en plazo este recurso y, en su virtud, anule la liquidación ${D.r && D.r.noSujeto ? "y declare la no sujeción de la transmisión" : `y dicte otra conforme a lo expuesto${D.correcto != null ? `, por ${eur(D.correcto)}` : ""}`}, con devolución, en su caso, de lo ingresado en exceso y sus intereses de demora (art. 32.2 LGT).`);
  out.push("", "OTROSÍ DICE que solicita la suspensión de la ejecución de la liquidación con aportación de ⟦garantía⟧ (art. 14.2.i TRLRHL).");
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Copia de la liquidación notificada.", "Título de adquisición del causante (escritura) y autoliquidación del Impuesto sobre Sucesiones con el valor declarado (art. 104.5 TRLRHL).", "Último recibo del IBI con el valor catastral del suelo y el total.", ...(C.c.abNom ? ["Documento de representación."] : [])].map((t) => "- " + t).join("\n"));
  out.push("", ...dfRevComun(C), esrREV("el recurso de reposición es obligatorio antes del contencioso; se resuelve en un mes y, sin respuesta, se entiende desestimado. En los municipios de gran población cabe después la reclamación económico-administrativa ante su órgano municipal (art. 137 LBRL). Cotejar los valores con los títulos: la cifra del cálculo es la del expediente."));
  return out.join("\n");
}
function esrPlusvaliaDevolucion(x, R) {
  if (!R) return "";
  const C = dfCtx(x, R, "plusvaliaDevolucion"), q = C.pl.rectificacion, D = dfPlusDatos(x, R, C), out = [];
  out.push(`${C.c.membrete}SOLICITUD DE RECTIFICACIÓN DE LA AUTOLIQUIDACIÓN DEL IMPUESTO SOBRE EL INCREMENTO DE VALOR DE LOS TERRENOS Y DE DEVOLUCIÓN DE INGRESOS INDEBIDOS`, `Plusvalía municipal · herencia de ${C.c.trC}${C.c.causante}${C.c.ref ? " · referencia " + C.c.ref : ""}`);
  out.push("", `AL ${esrUp(C.organo)}`, "", `${C.sujeto}, ante este órgano comparece y, como mejor proceda en Derecho, EXPONE:`);
  out.push("", `PRIMERO. Que presentó ${C.acto} del ${C.imp}${C.P.fechaIngreso ? ` e ingresó el ${fechaLarga(C.P.fechaIngreso)}` : " e ingresó ⟦fecha⟧"} ${D.pagado ? eur(D.pagado) : "⟦importe ingresado⟧"}.`);
  out.push("", `SEGUNDO. Que la autoliquidación perjudica sus intereses legítimos por lo siguiente:`, "", dfPlusFondo(x, R, C).map((t) => "- " + t).join("\n"));
  out.push("", `TERCERO. Que la solicitud se presenta dentro del plazo de cuatro años del derecho a la devolución (arts. 66.c y 67.1 LGT), ${q && q.limite ? `que termina el ${fechaLarga(q.limite)}` : "⟦fin del plazo⟧"}.`);
  out.push("", "FUNDAMENTOS DE DERECHO", "", "I. La gestión del impuesto se rige por la Ley General Tributaria y sus reglamentos (art. 12 TRLRHL): el obligado tributario puede instar la rectificación de la autoliquidación que perjudica sus intereses (art. 120.3 LGT; arts. 126 a 129 RGAT), con devolución de lo ingresado indebidamente y sus intereses (arts. 32 y 221.4 LGT).", "", "II. No hay sujeción si no existe incremento de valor, acreditado con los títulos de adquisición y de transmisión (art. 104.5 TRLRHL), y, si el incremento real es menor que la base objetiva, la base es el incremento real (art. 107.5 TRLRHL).");
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que rectifique la autoliquidación${D.r && D.r.noSujeto ? " y declare la no sujeción de la transmisión" : ""} y acuerde la devolución de ${D.dev ? eur(D.dev) : "⟦importe⟧"} con los intereses de demora, mediante transferencia a la cuenta ⟦IBAN⟧.`);
  out.push("", `En ${C.c.lugar}, a ⟦fecha⟧.`, "", C.firmas);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Autoliquidación y justificante de ingreso.", "Título de adquisición del causante y autoliquidación del Impuesto sobre Sucesiones (valor declarado).", "Último recibo del IBI.", "Certificado de titularidad de la cuenta.", ...(C.c.abNom ? ["Documento de representación."] : [])].map((t) => "- " + t).join("\n"));
  out.push("", esrREV("si el ayuntamiento practicó liquidación (no autoliquidación) y ya es firme, esta vía no sirve: solo cabrían los procedimientos especiales de revisión. Sin respuesta en seis meses, se entiende desestimada."));
  return out.join("\n");
}
const DF_ESCRITOS = { alegaciones: esrAlegaciones, reposicion: esrReposicion, reclamacionEA: esrReclamacionEA, tpc: esrTPC, rectificacion: esrRectificacion, valorReferencia: esrValorReferencia, plusvaliaRecurso: esrPlusvaliaRecurso, plusvaliaDevolucion: esrPlusvaliaDevolucion };

// ───────────────────── Panel de Documentos › Escritos ─────────────────────
function dfVence(q) {
  if (!q.limite) return "";
  const d = dias(hoy(), q.limite), cls = d < 0 ? "bad" : d <= 7 ? "warn" : "info";
  return `<span class="chip ${q.informativo && d >= 0 ? "" : cls} num">${d < 0 ? "Vencido" : d === 0 ? "Hoy" : `${d} ${d === 1 ? "día" : "días"}`}</span>`;
}
function dfPanelHTML(x) {
  const L = dfProcs(x), R = typeof calcular === "function" ? calcular(x) : null;
  const tit = (P) => `${DF_TIPOS[P.tipo] || "Acto"}${P.tributo === "IIVTNU" ? " · plusvalía" : " · Sucesiones"}`;
  const proc = (P) => {
    const pz = dfPlazos(x, R, P), S = R ? dfSimulacion(x, R, P) : null, s = (x.personas || []).find((p) => p.id === P.sujetoId);
    const meta = [P.organo, s && s.nombre, P.fechaNotificacion ? "notificado el " + fechaCorta(P.fechaNotificacion) : P.tipo === "autoliquidacion" ? (P.fechaIngreso ? "ingresado el " + fechaCorta(P.fechaIngreso) : "") : "sin fecha de notificación", num(P.importe) ? eur(num(P.importe)) : ""].filter(Boolean).map(esc).join(" · ");
    const filas = pz.items.map((q) => `<div class="df-pl"><span class="t"><b>${esc(q.nombre)}</b><small>${q.limite ? `Hasta el ${esc(fechaLarga(q.limite))}${q.trasladado ? " (trasladado al siguiente hábil)" : ""} · ` : `${esc(q.nota || "")} · `}${esc(q.norma || "")}</small></span>${dfVence(q)}</div>`).join("");
    const sim = S ? `<div class="df-sim"><b>Tasación pericial contradictoria: ${esc(S.recomendacion)}</b><div class="kv"><span>Diferencia de valor</span><span class="num">${eur(S.diferencia)}</span><span>Cuota adicional (cálculo del expediente)</span><span class="num">${eur(S.cuotaAdicional)}</span><span>Intereses de demora estimados</span><span class="num">${eur(S.intereses)}</span><span>Perito propio${S.costeEstimado ? " (estimado)" : ""}</span><span class="num">${eur(S.costePerito)}</span></div><p class="caption">${esc(S.texto)} ${esc(S.riesgo)}</p></div>` : "";
    const docs = dfEscritosDe(P).map((k, i) => `<button class="btn sm ${i ? "gray" : ""}" data-doc="${k}" data-dproc="${esc(P.id)}">${i ? "" : I.doc}${esc(DF_DOCS[k])}</button>`).join("");
    return `<div class="df-proc"><div class="df-h"><span class="t"><b>${esc(tit(P))}</b><small>${meta}</small></span><button class="btn sm gray" data-df="editar" data-id="${esc(P.id)}">Editar</button></div>${filas ? `<div class="df-pls">${filas}</div>` : ""}${pz.avisos.length > 1 || pz.estado === "PENDIENTE" ? `<p class="caption df-av">${esc(pz.avisos.join(" "))}</p>` : ""}${sim}<div class="df-docs">${docs}</div></div>`;
  };
  return `<div class="sectitle flex"><b>Defensa tributaria</b><span>${L.length ? plural(L.length, "acto notificado", "actos notificados") : "Después de presentar"}</span></div>
    <div class="card df-card">${L.length ? L.map(proc).join("") : `<p class="caption" style="margin:0 0 10px">¿Ha llegado una propuesta de liquidación, una liquidación, una comprobación de valores o una sanción, o hay que rectificar una autoliquidación? Regístrala con su fecha de notificación: se calculan los plazos y se preparan las alegaciones, los recursos, la tasación pericial contradictoria o la devolución.</p>`}
      <div class="df-docs"><button class="btn sm ${L.length ? "gray" : ""}" data-df="nuevo">${I.plus}Registrar una notificación</button></div></div>`;
}
function dfSheetHTML(x) {
  const P = dfProcs(x).find((q) => q.id === ui.sheet.id); if (!P) return "";
  const pers = esrVivos(x), inm = (x.bienes || []).filter((b) => b.tipo === "vivienda" || b.tipo === "inmueble");
  const fld = (k, t, html, hint) => `<div class="field"><label for="df-${k}">${t}</label>${html}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const inp = (k, ph, o = {}) => `<input id="df-${k}" data-dfk="${k}" value="${esc(P[k] == null ? "" : P[k])}" placeholder="${esc(ph)}"${o.type ? ` type="${o.type}"` : ""}${o.dec ? ' inputmode="decimal"' : ""} autocomplete="off">`;
  const sel = (k, opts) => `<select id="df-${k}" data-dfk="${k}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(P[k] || "") === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  const autol = P.tipo === "autoliquidacion", local = P.tributo === "IIVTNU", val = !local && P.tipo !== "sancion";
  return sheetHTML("Notificación tributaria", `${fsecH("Acto", "Con la fecha de notificación se calculan los plazos (art. 30 Ley 39/2015).")}<div class="group">
      <div class="field"><label>Impuesto</label><div class="seg"><button data-df="trib" data-v="ISD" aria-pressed="${!local}">Sucesiones</button><button data-df="trib" data-v="IIVTNU" aria-pressed="${local}">Plusvalía municipal</button></div></div>
      ${fld("tipo", "Tipo de acto", sel("tipo", DF_TRIB[local ? "IIVTNU" : "ISD"].map((k) => [k, DF_TIPOS[k]])))}
      ${fld("organo", "Órgano que lo dicta", inp("organo", local ? "Ayuntamiento · Gestión Tributaria" : "Oficina liquidadora o servicio de gestión"))}
      ${fld("numero", "Referencia del acto", inp("numero", "Número de expediente o de liquidación"))}
      ${autol ? fld("fechaIngreso", "Fecha del ingreso", inp("fechaIngreso", "", { type: "date" }), "Con el fin del plazo de presentación, fija los cuatro años para pedir la devolución.") : fld("fechaNotificacion", "Fecha de notificación", inp("fechaNotificacion", "", { type: "date" }))}
      ${P.tipo === "propuestaLiquidacion" ? fld("diasAlegaciones", "Días hábiles para alegar", sel("diasAlegaciones", [["10", "10 días"], ["15", "15 días"]]), "Los que indique la propuesta (art. 99.8 LGT).") : ""}
      ${fld("importe", autol ? "Importe ingresado (€)" : "Importe del acto (€)", inp("importe", "0", { dec: 1 }))}
      ${fld("sujetoId", local ? "Adquirente" : "Heredero (obligado tributario)", sel("sujetoId", [["", "Elegir"], ...pers.map((p) => [p.id, p.nombre || "—"])]))}
      ${local || val ? fld("bienId", "Inmueble", sel("bienId", [["", "Ninguno"], ...inm.map((b) => [b.id, esrNomB(b)])])) : ""}
    </div>
    ${val ? `${fsecH("Valoración", "Para las alegaciones, el recurso y la tasación pericial contradictoria.")}<div class="group">
      ${fld("valorDeclarado", P.esValorReferencia ? "Valor de mercado que se defiende (€)" : "Valor declarado (€)", inp("valorDeclarado", "Si se deja vacío, el del bien", { dec: 1 }))}
      ${fld("valorComprobado", P.esValorReferencia ? "Valor de referencia aplicado (€)" : "Valor comprobado por la Administración (€)", inp("valorComprobado", "0", { dec: 1 }))}
      <div class="row toggle"><span class="t"><b>Se aplica el valor de referencia del Catastro</b><small>No cabe la tasación pericial contradictoria: se impugna por la rectificación o el recurso, con informe del Catastro</small></span><label class="switch"><input type="checkbox" data-dfk="esValorReferencia" ${P.esValorReferencia ? "checked" : ""}><span></span></label></div>
      ${!P.esValorReferencia && !autol ? `${fld("honorariosPerito", "Honorarios del perito propio (€)", inp("honorariosPerito", `Estimación: ${DF_COSTE_PERITO}`, { dec: 1 }))}${fld("valorPeritoPropio", "Valoración del perito propio (€)", inp("valorPeritoPropio", "Si ya se tiene", { dec: 1 }))}` : ""}
    </div>` : ""}
    ${fsecH("Motivos", "Se incorporan al escrito; lo que falte queda marcado para completar.")}<div class="group">${fld("motivos", "Motivos propios", `<textarea id="df-motivos" data-dfk="motivos" rows="4" placeholder="Por ejemplo: no se aplicó la reducción por parentesco; la deuda hipotecaria no se dedujo">${esc(P.motivos || "")}</textarea>`)}</div>
    ${zonaPeligro("df:" + P.id, "Quitar esta notificación borra sus plazos del panel.", "¿Quitar esta notificación?", "Quitar la notificación", "Sí, quitar", `data-df="borrar" data-id="${esc(P.id)}"`)}`, "Hecho");
}
// Eventos propios (captura en document, como firma.js)
function dfCampo(t, final) {
  const k = t && t.dataset && t.dataset.dfk; if (!k) return false;
  const x = typeof exp === "function" ? exp() : null, P = x && ui.sheet && ui.sheet.tipo === "df" ? dfProcs(x).find((q) => q.id === ui.sheet.id) : null; if (!P) return true;
  if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { if (final) { toast(licMotivoEdicion()); render(); } return true; }
  const v = t.type === "checkbox" ? t.checked : String(t.value || "");
  P[k] = ["importe", "valorDeclarado", "valorComprobado", "honorariosPerito", "valorPeritoPropio"].includes(k) ? (String(v).trim() ? num(v) : "") : v;
  if (final) { guardar(); render(); } else if (typeof rdGuardarPronto === "function") rdGuardarPronto();
  return true;
}
if (typeof document !== "undefined") {
  document.addEventListener("input", (e) => { if (e.target && e.target.type !== "checkbox" && e.target.tagName !== "SELECT" && dfCampo(e.target, false)) e.stopPropagation(); }, true);
  document.addEventListener("change", (e) => { if (dfCampo(e.target, true)) e.stopPropagation(); }, true);
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest && e.target.closest("[data-df],[data-dproc]"); if (!b) return;
    const x = typeof exp === "function" ? exp() : null; if (!x) return;
    const d = b.dataset;
    if (d.dproc && !d.df) { ui.defProc = d.dproc; return; } // el manejador general abre el escrito (data-doc)
    e.stopPropagation(); e.preventDefault();
    if ((d.df === "nuevo" || d.df === "borrar" || d.df === "trib") && typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); return; }
    if (d.df === "nuevo") { const V = esrVivos(x); const P = { id: "df" + uid(), tributo: "ISD", tipo: "liquidacion", sujetoId: V.length === 1 ? V[0].id : "", creado: hoy() }; dfProcs(x).push(P); anotar(x, "Defensa tributaria: notificación registrada", "tramite"); guardar(); ui.sheet = { tipo: "df", id: P.id }; render(); return; }
    if (d.df === "editar") { ui.sheet = { tipo: "df", id: d.id }; render(); return; }
    if (d.df === "trib") { const P = dfProcs(x).find((q) => q.id === ui.sheet.id); if (P) { P.tributo = d.v; if (!DF_TRIB[d.v].includes(P.tipo)) P.tipo = "liquidacion"; if (d.v === "IIVTNU") delete P.esValorReferencia; guardar(); render(); } return; }
    if (d.df === "borrar") { x.procedimientos = dfProcs(x).filter((q) => q.id !== d.id); if (ui.defProc === d.id) ui.defProc = null; ui.conf = null; ui.sheet = null; anotar(x, "Defensa tributaria: notificación quitada", "tramite"); guardar(); render(); return; }
  }, true);
}
