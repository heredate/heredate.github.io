// ───────────────────── {{MARCA}} · régimen económico matrimonial, liquidación e inventario completo (G03 y G04) ─────────────────────
// La liquidación la hace el motor (liquidarRegimen, dentro de calcularISD → R.isd.masa.liquidacion); aquí se pinta y se editan sus datos:
// régimen y ley aplicable (arts. 9.2 y 16.3 CC), reintegros y reembolsos (arts. 1358, 1397, 1398 y 1403 CC), participación (arts. 1427-1428 CC),
// compensación (art. 1438 CC; art. 232-5 CCCat), y la ficha de valoración de cada clase de bien (arts. 9 y 26 Ley 29/1987).
const RG_TIPOS = [["auto", "Según la ley aplicable (art. 9.2 CC)"], ["gananciales", "Sociedad de gananciales"], ["separacion", "Separación de bienes (Código Civil)"], ["participacion", "Participación"], ["consorcio", "Consorcio conyugal aragonés"], ["conquistas", "Conquistas (Navarra)"], ["comunicacion", "Comunicación foral (Bizkaia)"], ["separacionCat", "Separación de bienes (Cataluña)"], ["separacionBal", "Separación de bienes (Illes Balears)"], ["separacionVal", "Separación de bienes (Ley 10/2007 valenciana)"]];
const RG_VEC = [["", "Sin indicar"], ["comun", "Común (Código Civil)"], ["CAT", "Catalana"], ["ARA", "Aragonesa"], ["NAV", "Navarra"], ["VASCO", "Vasca"], ["GAL", "Gallega"], ["BAL", "Balear"], ["VAL", "Valenciana"]];
const rgLQ = (R) => (R && R.isd && R.isd.masa && R.isd.masa.liquidacion) || null;
const rgN = (v) => `<span class="${v < -0.004 ? "neg" : ""}">${v < -0.004 ? "−" : ""}${eur(Math.abs(v))}</span>`;
const rgOpts = (L, sel) => L.map(([k, t]) => `<option value="${k}" ${String(sel ?? "") === k ? "selected" : ""}>${esc(t)}</option>`).join("");
const rgCasado = (x) => x.civil === "gananciales" || x.civil === "separacion" || (x.personas || []).some((p) => p.relacion === "conyuge" && !p.separado);
// Hay algo que liquidar o que decidir sobre el régimen
const rgAplica = (x, R) => { const L = rgLQ(R); return !!(L && (L.regimen || L.mitadViudo > 0.004)) || rgCasado(x); };

// Escritura genérica de listas y objetos del expediente por ruta («regimen.reintegros.0.importe», «deudas.2.tipo»)
function lpSet(x, ruta, val) {
  const k = String(ruta).split("."); let o = x;
  for (let i = 0; i < k.length - 1; i++) { const sig = /^\d+$/.test(k[i + 1]); if (o[k[i]] == null || typeof o[k[i]] !== "object") o[k[i]] = sig ? [] : {}; o = o[k[i]]; }
  o[k[k.length - 1]] = val;
}
function lpGet(x, ruta) { return String(ruta).split(".").reduce((o, k) => (o == null ? undefined : o[k]), x); }
function lpAdd(x, ruta) {
  const nuevo = { deudas: { id: uid(), concepto: "", importe: "", tipo: "prestamo" }, gastos: { id: uid(), concepto: "", importe: "", tipo: "funeral" }, "regimen.reintegros": { id: uid(), sentido: "privCausante", concepto: "", importe: "", actualizado: "", justificado: false } }[ruta];
  if (!nuevo) return; if (!Array.isArray(lpGet(x, ruta))) lpSet(x, ruta, []); lpGet(x, ruta).push(nuevo);
}
function lpDel(x, ruta) { const k = String(ruta).split("."), i = Number(k.pop()), L = lpGet(x, k.join(".")); if (Array.isArray(L) && i >= 0 && i < L.length) L.splice(i, 1); }

// ── Tabla de la liquidación (inventario de la sociedad, pasivo, remanente, haberes y parte de cada bien) ──
function rgTablaHTML(x, R, o = {}) {
  const L = rgLQ(R); if (!L) return "";
  const RG = L.regimen, terr = x.ccaa === "EST" ? x.ccaaBienes || "EST" : x.ccaa;
  const ln = (n) => (typeof linkNorma === "function" ? linkNorma(n, terr) : esc(n));
  const fila = (c, n, v, cls = "") => `<tr class="${cls}"><td>${c}${n ? `<small>${ln(n)}</small>` : ""}</td><td class="n">${rgN(v)}</td></tr>`;
  const B = (x.bienes || []).filter((b) => L.porBien[b.id] && L.porBien[b.id].total > 0);
  let h = "";
  if (L.comunidad && L.tabla.length) {
    const act = L.tabla.filter((t) => t.grupo === "activo"), pas = L.tabla.filter((t) => t.grupo === "pasivo");
    h += `<div class="tablewrap card" style="padding:0;margin-top:12px"><table class="grid-t ptable rg-t"><thead><tr><th>${L.universal ? "Comunidad foral" : "Sociedad conyugal"}</th><th class="n">Importe</th></tr></thead><tbody>
      ${act.map((t) => fila(esc(t.concepto) + (t.nota ? ` <small>${esc(t.nota)}</small>` : ""), t.norma, t.importe)).join("")}
      ${fila("<b>Activo</b>", "", L.activo, "rg-tot")}
      ${pas.map((t) => fila(esc(t.concepto), t.norma, -t.importe)).join("")}
      ${pas.length ? fila("<b>Pasivo</b>", "", -L.pasivo, "rg-tot") : ""}
      ${fila("<b>Remanente</b>", "art. 1404 CC", L.remanente, "rg-tot")}
      ${fila("Mitad de cada cónyuge", "art. 1404 CC", L.mitad)}
      ${L.reintegros.lista.length ? fila("Haber de la herencia del causante (mitad + reintegros − lo que debe)", "arts. 1403 y 1404 CC", L.haberCausante) + fila("Haber del cónyuge viudo", "arts. 1403 y 1404 CC", L.haberConyuge) : ""}
    </tbody></table></div>`;
  }
  if (L.participacion) {
    const P = L.participacion;
    h += `<div class="card" style="margin-top:12px;padding:6px 22px"><div class="kv">
      <span>Incremento del causante (final ${eur0(P.finalC)} − inicial ${eur0(P.inicialC)})</span><span class="num">${eur(P.incC)}</span>
      <span>Incremento del viudo (final ${eur0(P.finalV)} − inicial ${eur0(P.inicialV)})</span><span class="num">${eur(P.incV)}</span>
      <span class="b">Crédito de participación (${grp(P.pct * 100, 0)} % de la diferencia, ${ln(P.norma)})</span><span class="b num">${P.aFavor ? `${eur(P.importe)} a favor ${P.aFavor === "conyuge" ? "del viudo" : "de la herencia"}` : "0,00 €"}</span>
    </div></div>`;
  }
  for (const d of L.deudas.filter((d) => d.id === "_compensacion")) h += `<div class="card" style="margin-top:12px;padding:6px 22px"><div class="kv"><span>${esc(d.concepto)} <small>${ln(d.norma.split(";")[0])}</small></span><span class="num">${eur(d.importe)}</span></div></div>`;
  if (B.length && !o.sinBienes) {
    h += `<div class="tablewrap card" style="padding:0;margin-top:12px"><table class="grid-t ptable rg-t"><thead><tr><th>Bien</th><th class="n">Valor</th><th class="n">Herencia</th><th class="n">Viudo</th></tr></thead><tbody>
      ${B.map((b) => { const q = L.porBien[b.id]; const car = q.comun > 0 ? (q.comun < 0.9999 ? `mixto: ${grp(q.comun * 100, 2)} % común` : L.universal && (b.titularidad || "privativo") !== "ganancial" ? "común por la comunicación foral" : L.comunidad ? "común" : "en cotitularidad") : q.privConyuge > 0 ? "cotitularidad con el viudo" : q.privCausante < 0.9999 ? `del causante el ${grp(q.privCausante * 100, 2)} %` : "privativo del causante";
        return `<tr><td><b>${esc(b.descripcion || TIPO_BIEN[b.tipo][0])}</b><small>${esc(car)}</small></td><td class="n">${eur0(q.total)}</td><td class="n">${eur0(q.total * q.cuotaCausante)}<small>${grp(q.cuotaCausante * 100, 2)} %</small></td><td class="n">${q.cuotaConyuge > 0.00005 ? `${eur0(q.total * q.cuotaConyuge)}<small>${grp(q.cuotaConyuge * 100, 2)} %</small>` : "—"}</td></tr>`; }).join("")}
      <tr class="rg-tot"><td><b>Total</b></td><td class="n">${eur0(B.reduce((s, b) => s + L.porBien[b.id].total, 0))}</td><td class="n">${eur0(B.reduce((s, b) => s + L.porBien[b.id].total * L.porBien[b.id].cuotaCausante, 0))}</td><td class="n">${eur0(L.mitadViudo)}</td></tr>
    </tbody></table></div>`;
  }
  const av = [...L.avisos];
  if (RG && RG.estado === "PENDIENTE") av.push(`Regla foral en verificación: ${RG.norma}. Confirma la liquidación antes de firmar.`);
  if (L.comunidad && (x.bienes || []).some((b) => (b.titularidad || "privativo") === "privativo" && !b.origenPrivativo) && !L.universal && RG) av.push("Bienes marcados como privativos sin indicar por qué: en la sociedad de gananciales se presume ganancial lo que no se pruebe privativo (art. 1361 CC; bienes privativos, art. 1346 CC). Indícalo en su ficha.");
  if (av.length) h += `<div class="group" style="margin-top:12px"><ul class="notes">${av.map((a) => `<li><i class="dot orange"></i><span>${esc(a)}</span></li>`).join("")}</ul></div>`;
  return h;
}
// Resumen para la ficha «Herederos y bienes»
function rgCardHTML(x, R) {
  if (!rgAplica(x, R)) return "";
  const L = rgLQ(R), RG = L && L.regimen;
  const tit = RG ? RG.nombre : "Sin régimen que liquidar";
  const sub = RG ? `${RG.supuesto ? "Supuesto: " : ""}${RG.motivo}` : "Indica el estado civil y, si estaba casado, el régimen.";
  return `<div class="card" style="margin-top:14px">${cardH("Régimen económico matrimonial", esc(tit), `<button class="btn sm gray" data-act="regimen">Datos y liquidación</button>`)}
    <p class="caption" style="margin:0 0 10px">${esc(sub)}${RG ? ` ${tagE(RG.estado)}` : ""}</p>
    ${L ? `<div class="kv sm">
      ${L.comunidad && L.activoBienes ? `<span>Bienes comunes</span><span class="num">${eur(L.activoBienes)}</span>` : ""}
      ${L.pasivoDeudas ? `<span>Deudas comunes</span><span class="num">${rgN(-L.pasivoDeudas)}</span>` : ""}
      ${L.reintegros.lista.length ? `<span>Reintegros y reembolsos</span><span class="num">${plural(L.reintegros.lista.length, "partida")}</span>` : ""}
      <span>Parte del viudo (no se hereda)</span><span class="num">${eur(L.mitadViudo)}</span>
      ${L.deudas.map((d) => `<span>${esc(d.concepto)}</span><span class="num">${rgN(-d.importe)}</span>`).join("")}
      ${L.creditos.map((d) => `<span>${esc(d.concepto)}</span><span class="num">${eur(d.importe)}</span>`).join("")}
    </div>` : ""}</div>`;
}
// Ficha «Régimen económico»: datos y liquidación completa
function rgSheetHTML(x, R) {
  const g = x.regimen || {}, L = rgLQ(R), RG = L && L.regimen;
  const sel = (ruta, L0, v, lab, id) => `<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-lp="${ruta}">${rgOpts(L0, v)}</select></div>`;
  const txt = (ruta, v, lab, id, ph = "", dec = true, hint = "") => `<div class="field"><label for="${id}">${lab}</label><input id="${id}" ${dec ? 'inputmode="decimal"' : ""} data-lp="${ruta}" value="${esc(dec ? numStr(v) : v ?? "")}" placeholder="${esc(ph)}">${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const tog = (ruta, v, t, s = "") => `<div class="row toggle"><span class="t"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span><label class="switch"><input type="checkbox" data-lp="${ruta}" ${v ? "checked" : ""}><span></span></label></div>`;
  const TERR = [["", "Sin indicar"], ...TERRITORIOS.filter(([id]) => id !== "EST")];
  const R0 = (g.reintegros || []);
  const reint = R0.map((r, i) => `<div class="group rg-item"><div class="field"><label for="rg-s${i}">Movimiento</label><select id="rg-s${i}" data-lp="regimen.reintegros.${i}.sentido">${rgOpts(Object.entries(SENTIDOS_REINTEGRO).map(([k, v]) => [k, v[0]]), r.sentido)}</select><span class="hint">${esc((SENTIDOS_REINTEGRO[r.sentido] || ["", ""])[1])}</span></div>
      ${txt(`regimen.reintegros.${i}.concepto`, r.concepto, "Concepto", `rg-c${i}`, "Ej.: entrada del piso con la herencia de su madre", false)}
      ${txt(`regimen.reintegros.${i}.importe`, r.importe, "Importe pagado (€)", `rg-i${i}`, "0")}
      ${txt(`regimen.reintegros.${i}.actualizado`, r.actualizado, "Importe actualizado a hoy (€)", `rg-a${i}`, "Opcional", true, "El reembolso es por el valor actualizado al tiempo de la liquidación (art. 1358 CC).")}
      ${tog(`regimen.reintegros.${i}.justificado`, r.justificado, "Justificado con documentos", "Escritura, extractos o recibos que prueban el origen del dinero")}
      <div class="row"><button class="btn sm gray" data-lpdel="regimen.reintegros.${i}">Quitar este movimiento</button></div></div>`).join("");
  const P = g.participacion || {};
  return sheetHTML("Régimen económico matrimonial", `${fsecH("Régimen", RG ? `${esc(RG.nombre)} · ${esc(RG.motivo)}` : "Sin datos de matrimonio")}<div class="group">
      ${sel("regimen.tipo", RG_TIPOS, g.tipo || "auto", "Régimen", "rg-t")}
      ${txt("regimen.fechaMatrimonio", g.fechaMatrimonio, "Fecha del matrimonio", "rg-f", "", false).replace('<input ', '<input type="date" ')}
      ${sel("regimen.vecCausante", RG_VEC, g.vecCausante, "Vecindad civil del causante al casarse", "rg-vc")}
      ${sel("regimen.vecConyuge", RG_VEC, g.vecConyuge, "Vecindad civil del cónyuge al casarse", "rg-vv")}
      ${g.vecCausante && g.vecConyuge && g.vecCausante !== g.vecConyuge ? sel("regimen.residenciaComun", TERR, g.residenciaComun, "Primera residencia común tras la boda", "rg-rc") + sel("regimen.lugarCelebracion", TERR, g.lugarCelebracion, "Lugar de celebración", "rg-lc") : ""}
      ${(RG && (RG.ley === "VASCO" || RG.id === "comunicacion")) || g.aforado ? tog("regimen.aforado", g.aforado, "Vecindad vizcaína aforada (tierra llana, Aramaio o Llodio)", "Régimen supletorio: comunicación foral (art. 127 Ley 5/2015)") : ""}
      ${RG && RG.universal ? tog("regimen.hijosComunes", L ? L.hijosComunes : true, "Hay hijos o descendientes comunes", "Con ellos la comunicación se consolida al morir: todo por mitad") : ""}
    </div>
    ${RG ? `<p class="group-foot">Ley aplicable: ${esc(RG.criterio)} (${esc(RG.normaCriterio)})${RG.normaLey ? ` · régimen supletorio: ${esc(RG.normaLey)}` : ""}.</p>` : ""}
    ${!L || L.comunidad ? `${fsecH("Reintegros y reembolsos", "Dinero de uno de los cónyuges gastado en lo común, o dinero común gastado en lo de uno de ellos (arts. 1358, 1362 y 1364 CC).")}${reint}<div style="margin:8px 0 14px"><button class="btn sm gray" data-lpadd="regimen.reintegros">${I.plus}Añadir reintegro o reembolso</button></div>` : ""}
    ${RG && RG.participacion ? `${fsecH("Participación en las ganancias", "Patrimonios inicial y final de cada cónyuge (arts. 1418-1424 CC). Sin el final del causante se usa el de la herencia.")}<div class="group">
      ${txt("regimen.participacion.inicialCausante", P.inicialCausante, "Patrimonio inicial del causante (€)", "rg-pi")}${txt("regimen.participacion.finalCausante", P.finalCausante, "Patrimonio final del causante (€)", "rg-pf", "Se calcula si lo dejas vacío")}
      ${txt("regimen.participacion.inicialConyuge", P.inicialConyuge, "Patrimonio inicial del viudo (€)", "rg-vi")}${txt("regimen.participacion.finalConyuge", P.finalConyuge, "Patrimonio final del viudo (€)", "rg-vf")}
      ${txt("regimen.participacion.pct", P.pct, "Participación pactada (%)", "rg-pp", "50", true, "Solo si se pactó otra proporción en capitulaciones (art. 1429 CC).")}</div>` : ""}
    ${RG && RG.compensacion ? `${fsecH(RG.id === "separacionCat" ? "Compensación económica por razón de trabajo" : "Compensación por el trabajo para la casa", RG.id === "separacionCat" ? "Si el viudo trabajó para la casa o para el otro sin retribución suficiente (art. 232-5 CCCat)." : "Art. 1438 CC.")}<div class="group">${txt("regimen.compensacion", g.compensacion, "Importe a favor del viudo (€)", "rg-co", "0")}</div>` : ""}
    ${fsecH("Liquidación", "Inventario de la sociedad, haberes y parte de cada bien. Lo del viudo no entra en la herencia.")}
    ${rgTablaHTML(x, R)}`, "Hecho", "wide");
}
// Partición, paso 1: la liquidación del régimen antes del inventario de la herencia
function rgPartHTML(x, R, PT) {
  const L = rgLQ(R); if (!L || (!L.regimen && !(L.mitadViudo > 0.004))) return "";
  const RG = L.regimen;
  return `<div class="card" style="padding:18px 22px;margin-bottom:12px">${cardH("Antes de repartir", `Liquidación de ${RG ? esc(RG.nombre.toLowerCase()) : "los bienes comunes"}`, `<button class="btn sm gray" data-act="regimen">Datos del régimen</button>`)}
    <p class="caption" style="margin:0">Lo que es del viudo por el régimen económico (${eur0(L.mitadViudo)}) no se hereda.${PT && PT.conjunta ? ` La liquidación y la partición se hacen juntas: ${esc(PT.conjunta.V.nombre || "el viudo")} recibe su haber en la sociedad (${eur0(PT.conjunta.haberGan)}) además del hereditario, y la adjudicación de un bien común entero solo da exceso por lo que supere los dos (arts. 1404 y 1406 CC).` : ""}</p>
    ${rgTablaHTML(x, R, { sinBienes: false })}</div>`;
}
// Texto de la liquidación para el cuaderno y la escritura (mismo formato que el de gananciales de cpCuaderno: exposición y una última línea «Se adjudica…»)
function rgCuadernoGan(x, R, PT) {
  const L = rgLQ(R); if (!L) return "";
  const RG = L.regimen, viudo = (x.personas || []).find((p) => p.relacion === "conyuge" && !p.separado), nv = viudo ? `${gnTrat(viudo)}${viudo.nombre}` : "el cónyuge supérstite";
  const T = [];
  if (RG) T.push(`Régimen económico: ${RG.nombre.toLowerCase()} (${RG.norma}), ${RG.motivo}.`);
  if (L.comunidad && L.tabla.length) {
    for (const t of L.tabla.filter((t) => t.grupo === "activo")) T.push(`Activo: ${t.concepto}, ${eur(t.importe)} (${t.norma}).`);
    for (const t of L.tabla.filter((t) => t.grupo === "pasivo")) T.push(`Pasivo: ${t.concepto}, ${eur(t.importe)} (${t.norma}).`);
    T.push(`Remanente: ${eur(L.remanente)}, por mitad (art. 1404 CC). Haber de la herencia: ${eur(L.haberCausante)}; haber de ${nv}: ${eur(L.haberConyuge)}${L.reintegros.lista.length ? ", con los reintegros y reembolsos debidos (arts. 1358, 1398 y 1403 CC)" : ""}.`);
  }
  if (L.participacion && L.participacion.aFavor) T.push(`Crédito de participación de ${eur(L.participacion.importe)} a favor ${L.participacion.aFavor === "conyuge" ? "de " + nv : "de la herencia"} (${L.participacion.norma}).`);
  for (const d of L.deudas.filter((d) => d.id === "_compensacion")) T.push(`${d.concepto}: ${eur(d.importe)}.`);
  T.push(PT && PT.conjunta ? `Se adjudica a ${nv}, en pago de su haber en la sociedad conyugal (${eur(PT.conjunta.haberGan)}), lo que se le asigna en las operaciones de partición, que se practican conjuntamente con esta liquidación (arts. 1404 y 1406 CC).`
    : `Se adjudica a ${nv}, en pago de su haber, ${L.universal ? "la mitad indivisa de cada bien" : "su parte indivisa de cada bien común"} según el cuadro de liquidación${L.pasivoDeudas ? ", y asume su parte del pasivo común" : ""}.`);
  return T.join("\n");
}

// ── G03 · Ficha del bien: datos de valoración por clase y «Cómo se valora» ──
function rgBienCampos(x, b) {
  const f = (k, lab, ph = "", hint = "", dec = true) => `<div class="field"><label for="bv-${k}">${lab}</label><input id="bv-${k}" ${dec ? 'inputmode="decimal"' : ""} data-bn="${k}" value="${esc(dec ? numStr(b[k]) : b[k] ?? "")}" placeholder="${esc(ph)}">${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const tog = (k, t, s = "") => `<div class="row toggle"><span class="t"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span><label class="switch"><input type="checkbox" data-bn="${k}" ${b[k] ? "checked" : ""}><span></span></label></div>`;
  const ST = SUBTIPOS_BIEN[b.tipo], st = b.subtipo || "";
  let h = ST ? `<div class="field"><label for="bv-st">Clase</label><select id="bv-st" data-bn="subtipo"><option value="">Sin indicar</option>${rgOpts(ST, st)}</select></div>` : "";
  if (b.tipo === "cripto") h += f("unidades", "Unidades", "Ej.: 0,5") + f("precioUnidad", "Precio por unidad el día del fallecimiento (€)") + f("fuentePrecio", "Fuente del precio", "Mercado o índice y hora de cierre", "", false);
  if (b.tipo === "valores" && (st === "cotizado" || st === "iic")) h += f("titulos", st === "iic" ? "Participaciones" : "Número de títulos") + f("cotizacion", st === "iic" ? "Valor liquidativo del día (€)" : "Cotización del día del fallecimiento (€)");
  if ((b.tipo === "valores" && st === "noCotizado") || (b.tipo === "empresa" && st === "participaciones")) h += f("pctParticipacion", "Participación del causante (%)") + f("fondosPropios", "Patrimonio neto del último balance aprobado (€)") + f("nominal", "Valor nominal de sus participaciones (€)") + f("beneficioMedio", "Media de beneficios de los 3 últimos ejercicios (€)") + tog("auditado", "Balance auditado con informe favorable");
  if (b.tipo === "vehiculo" || (b.tipo === "embarcacion" && st !== "aeronave")) h += f("precioMedio", "Precio medio de la tabla de Hacienda (€)", "Orden de precios medios del año", "Marca, modelo y versión en el anexo de la Orden del año del fallecimiento.") + f("fechaMatriculacion", "Fecha de primera matriculación", "", "", false).replace("<input ", '<input type="date" ');
  if (b.tipo === "derechoReal" && st === "nudaPropiedad") h += f("valorPleno", "Valor del pleno dominio (€)") + f("edadUsufructuario", "Edad del usufructuario (vitalicio)") + f("aniosUsufructo", "Años que quedan (temporal)", "Si es temporal");
  if (b.tipo === "credito" || (b.tipo === "derechoReal" && st === "hipotecaAcreedor")) h += f("nominal", "Principal pendiente (€)") + f("intereses", "Intereses devengados y no cobrados (€)");
  if (b.tipo === "arte") h += tog("patrimonioHistorico", "Bien del Patrimonio Histórico", "Declarado o inventariado (Español o de la comunidad)");
  return h;
}
function rgBienValoracionHTML(x, b) {
  if (b.tipo === "vivienda" || b.tipo === "inmueble") return "";
  const m = bienMotor(b), V = valoracionBien(m, x.fecha), vf = num(b.valor);
  const campos = rgBienCampos(x, b);
  const usar = V.sugerido != null && V.sugerido > 0 && Math.abs(V.sugerido - vf) > 0.5 ? `<button class="btn sm" data-usarval="${b.id}">Usar ${eur(V.sugerido)}</button>` : "";
  return `${campos ? `${fsecH("Datos para valorar", "Opcionales: con ellos se calcula el valor y se justifica.")}<div class="group">${campos}</div>` : ""}
    <div class="infobar rg-val" style="margin:12px 0"><span class="ico indigo">${I.info}</span><span><b>Cómo se valora: ${esc(V.nombre.toLowerCase())}</b> ${tagE(V.estado)}<br>${esc(V.regla)}<br><small>${typeof linkNorma === "function" ? linkNorma(V.norma, x.ccaa) : esc(V.norma)}</small>
      ${V.calculo ? `<br><b>${esc(V.calculo)}${V.sugerido != null ? ` = ${eur(V.sugerido)}` : ""}</b>${V.extingue ? "" : vf ? ` · valor de la ficha ${eur(vf)}` : " · se usa este valor mientras la ficha no tenga otro"}` : ""}
      ${V.notas.map((n) => `<br><small>${esc(n)}</small>`).join("")}${usar ? `<br><span style="display:inline-block;margin-top:8px">${usar}</span>` : ""}</span></div>`;
}
// Bien situado en el extranjero (art. 23 Ley 29/1987 y modelos 720/721)
function rgBienExtranjeroHTML(x, b) {
  const tog = `<div class="row toggle"><span class="t"><b>Está en el extranjero</b><small>Bien situado o derecho ejercitable fuera de España</small></span><label class="switch"><input type="checkbox" data-bn="enExtranjero" ${b.enExtranjero ? "checked" : ""}><span></span></label></div>`;
  return `<div class="group" style="margin-top:12px">${tog}${b.enExtranjero ? `<div class="field"><label for="bx-p">País</label><input id="bx-p" data-bn="extPais" value="${esc(b.extPais)}" placeholder="Ej.: Francia"></div><div class="field"><label for="bx-m">Moneda</label><input id="bx-m" data-bn="extMoneda" value="${esc(b.extMoneda)}" placeholder="EUR"><span class="hint">El valor se declara en euros al cambio del día del fallecimiento.</span></div><div class="field"><label for="bx-i">Impuesto sucesorio pagado allí (€)</label><input id="bx-i" inputmode="decimal" data-bn="extImpuesto" value="${numStr(b.extImpuesto)}" placeholder="0"><span class="hint">Da derecho a la deducción por doble imposición internacional (art. 23 Ley 29/1987).</span></div>` : ""}</div>`;
}
// Titularidad mixta (art. 1354 CC) y origen del carácter privativo (art. 1346 CC)
const RG_ORIGEN = [["", "Sin indicar"], ["antes", "Era suyo antes de casarse (art. 1346.1.º CC)"], ["herencia", "Herencia o donación (art. 1346.2.º CC)"], ["subrogacion", "Comprado con dinero privativo (art. 1346.3.º CC)"], ["personal", "Uso personal o derecho personalísimo (art. 1346.5.º-7.º CC)"], ["capitulaciones", "Pactado en capitulaciones o confesado (art. 1324 CC)"]];
function rgBienTitularidadHTML(x, b) {
  const t = b.titularidad || "privativo";
  if (t === "mixto") return `<div class="field"><label for="bm-c">Parte privativa del causante (%)</label><input id="bm-c" inputmode="decimal" data-bn="pctPrivCausante" data-valida="pct" value="${numStr(b.pctPrivCausante)}" placeholder="0"></div><div class="field"><label for="bm-v">Parte privativa del viudo (%)</label><input id="bm-v" inputmode="decimal" data-bn="pctPrivConyuge" data-valida="pct" value="${numStr(b.pctPrivConyuge)}" placeholder="0"><span class="hint">El resto es común. En proporción a lo que aportó cada uno (arts. 1354 y 1357.2 CC).</span></div>`;
  if (t === "privativo" && (x.civil === "gananciales" || (x.regimen && x.regimen.tipo && ["gananciales", "consorcio", "conquistas"].includes(x.regimen.tipo)))) return `<div class="field"><label for="bm-o">Por qué es privativo</label><select id="bm-o" data-bn="origenPrivativo">${rgOpts(RG_ORIGEN, b.origenPrivativo)}</select><span class="hint">Sin prueba, se presume ganancial (art. 1361 CC).</span></div>`;
  return "";
}

// ── G03 · Deudas y gastos con su tipo y deducibilidad (arts. 12-14 Ley 29/1987) ──
function rgDeudasHTML(x) {
  const casado = x.civil === "gananciales" || (x.regimen && ["gananciales", "consorcio", "conquistas", "comunicacion"].includes(x.regimen.tipo));
  const D = x.deudas || [], G = x.gastos || [];
  const it = (ruta, i, d, tipos, conGan) => `<div class="group rg-item">
    <div class="field"><label for="${ruta}-c${i}">Concepto</label><input id="${ruta}-c${i}" data-lp="${ruta}.${i}.concepto" value="${esc(d.concepto)}" placeholder="${ruta === "deudas" ? "Ej.: préstamo del coche" : "Ej.: factura de la funeraria"}"></div>
    <div class="field"><label for="${ruta}-t${i}">Tipo</label><select id="${ruta}-t${i}" data-lp="${ruta}.${i}.tipo"><option value="">Sin indicar</option>${rgOpts(Object.entries(tipos).map(([k, v]) => [k, v[0]]), d.tipo)}</select>${d.tipo && tipos[d.tipo] && tipos[d.tipo][1] ? `<span class="hint">${esc(tipos[d.tipo][1])}</span>` : ""}</div>
    <div class="field"><label for="${ruta}-i${i}">Importe (€)</label><input id="${ruta}-i${i}" inputmode="decimal" data-lp="${ruta}.${i}.importe" value="${numStr(d.importe)}" placeholder="0"></div>
    ${ruta === "deudas" ? `${conGan || d.ganancial ? `<div class="row toggle"><span class="t"><b>Deuda común del matrimonio</b><small>La herencia solo soporta su parte</small></span><label class="switch"><input type="checkbox" data-lp="deudas.${i}.ganancial" ${d.ganancial ? "checked" : ""}><span></span></label></div>` : ""}
      <div class="row toggle"><span class="t"><b>Acreditada con documento</b><small>Público, o privado con fecha fehaciente (art. 13 Ley 29/1987)</small></span><label class="switch"><input type="checkbox" data-lp="deudas.${i}.acreditada" ${d.acreditada !== false ? "checked" : ""}><span></span></label></div>` : ""}
    <div class="row"><span class="t"><small>${(() => { const q = ruta === "deudas" ? deudaDeducible({ ...d, importe: num(d.importe) }) : gastoDeducible(d); return q.ok ? `Se resta en el impuesto (${esc(q.norma)})` : `<span class="neg">No se resta en el impuesto</span>: ${esc(q.motivo)} (${esc(q.norma)}). Sí la paga la herencia.`; })()}</small></span><button class="btn sm gray" data-lpdel="${ruta}.${i}">Quitar</button></div></div>`;
  return `${fsecH("Deudas del causante", "Préstamos, tarjetas, impuestos pendientes… a la fecha del fallecimiento.")}${D.map((d, i) => it("deudas", i, d, TIPOS_DEUDA, casado)).join("") || `<div class="group"><div class="empty"><b>Sin deudas.</b></div></div>`}<div style="margin:8px 0 14px"><button class="btn sm gray" data-lpadd="deudas">${I.plus}Añadir deuda</button></div>
    ${fsecH("Gastos", "Entierro, funeral y última enfermedad se restan; notaría, registro o plusvalía, no (art. 14 Ley 29/1987).")}${G.map((g, i) => it("gastos", i, g, TIPOS_GASTO, false)).join("") || `<div class="group"><div class="empty"><b>Sin gastos.</b></div></div>`}<div style="margin:8px 0 4px"><button class="btn sm gray" data-lpadd="gastos">${I.plus}Añadir gasto</button></div>`;
}
