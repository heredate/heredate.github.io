// ───────────────────── {{MARCA}} · control de legítimas (Piloto 7) ─────────────────────
// Presenta el resultado de calcularLegitimas (motor): tercios del caudal, usufructo del viudo, posición de cada
// legitimario y avisos de intangibilidad. No calcula por su cuenta. Prefijo: lg / LG_.
const LG_ESTADO = {
  cubierta: ["Cubierta", "ok"], vulnerada: ["Vulnerada", "bad"], renuncia: ["Renuncia", "gray"], desheredado: ["Desheredado", "gray"],
  "no verificable": ["No verificable", "gray"], "no legitimario": ["No legitimario", "gray"], colectiva: ["Colectiva", "gray"], formal: ["Formal", "gray"],
};
const LG_TIPO = { "no legitimario": "Descendiente (no legitimario)", descendiente: "Descendiente", ascendiente: "Ascendiente", conyuge: "Cónyuge viudo" };

// Caso para el motor a partir del expediente y del cálculo ya hecho (R = calcular(x))
function lgCaso(x, R) {
  const porId = Object.fromEntries((x.personas || []).map((p) => [p.id, p]));
  const legados = (x.bienes || []).filter((b) => b.legatarioId && porId[b.legatarioId]).map((b) => {
    const inm = b.tipo === "vivienda" || b.tipo === "inmueble";
    const total = inm ? Math.max(num(b.valor), num(b.valorReferencia)) : num(b.valor);
    return { legatarioId: b.legatarioId, valor: total * cuotaCausante({ titularidad: b.titularidad, porcentaje: pctCausante(b.porcentaje) }) };
  });
  return {
    ccaa: x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa, vecindadCivil: x.vecindadCivil, isla: x.isla,
    reparto: x.testamento === "usufructo" ? "usufructoUniversal" : x.testamento === "porcentajes" ? "porcentajes" : "intestado",
    herederos: (x.personas || []).map((p) => ({ id: p.id, separado: !!p.separado, nombre: p.nombre || RELACIONES[p.relacion]?.label || "Sin nombre", relacion: p.relacion === "pareja_hecho" && !p.inscrita ? "pareja_no_inscrita" : p.relacion, edad: p.edad === "" || p.edad == null ? null : num(p.edad), renuncia: !!p.renuncia, desheredado: !!p.desheredado, estirpe: p.estirpe, inscrita: !!p.inscrita, lineaAsc: p.lineaAsc })),
    derechos: R.isd.derechos, masa: R.isd.masa, legados,
    donaciones: (x.personas || []).filter((p) => num(p.donacionColacionable) > 0).map((p) => ({ herederoId: p.id, valor: num(p.donacionColacionable) })),
    hayEmpresa: (x.bienes || []).some((b) => b.tipo === "empresa"),
  };
}
function lgCalcular(x, R) {
  if (!R || !R.isd) return null;
  try { return calcularLegitimas(lgCaso(x, R)); } catch (e) { return null; }
}
const lgPill = (estado, extra = "") => { const [t, c] = LG_ESTADO[estado] || [estado, "gray"]; return `<span class="lg-pill ${c}">${esc(t)}${extra}</span>`; };
const lgFrac = (f) => (typeof fracTxt === "function" ? fracTxt(f) : grp(f * 100, 0) + " %");
const lgNorma = (t, terr) => (typeof linkNorma === "function" ? linkNorma(t, terr) : esc(t));
const lgTerr = (x) => (x.ccaa === "EST" ? x.ccaaBienes || "EST" : x.ccaa);

// Posición y anchura (0-1) de la franja de usufructo del viudo sobre la barra de tercios
function lgFranjaViudo(L) {
  const v = L.viudo; if (!v || v.valor == null || !v.fraccion) return null;
  const [fe] = L.tercios.fracciones;
  if (v.sobre === "mejora") return { left: fe, width: 1 / 3 };
  return { left: 0, width: Math.min(1, v.fraccion) };
}
// Barra apilada de los tercios con la franja rayada del usufructo
function lgBarra(L, x) {
  const T = L.tercios; if (!T) return "";
  const segs = [["estricta", T.fracciones[0], T.etiquetas[0], T.estricta], ["mejora", T.fracciones[1], T.etiquetas[1], T.mejora], ["libre", T.fracciones[2], T.etiquetas[2], T.libre]].filter((s) => s[1] > 0.0001);
  const fr = lgFranjaViudo(L);
  const v = L.viudo;
  return `<div class="lg-bar" role="img" aria-label="${esc(segs.map((s) => `${s[2]} ${eur0(s[3])}`).join(", "))}">${segs.map((s) => `<i class="lg-seg ${s[0]}" style="width:${s[1] * 100}%"><span>${lgFrac(s[1])}</span></i>`).join("")}${fr ? `<b class="lg-usu" style="left:${fr.left * 100}%;width:${fr.width * 100}%" title="Usufructo de ${esc(v.nombre)}"></b>` : ""}</div>
  <div class="lg-leg">${segs.map((s) => `<span><i class="lg-sw ${s[0]}"></i>${esc(s[2])}<b class="num">${eur0(s[3])}</b></span>`).join("")}${fr ? `<span><i class="lg-sw usu"></i>Usufructo de ${esc(v.nombre)} sobre ${esc(v.sobre === "mejora" ? "el tercio de mejora" : v.sobre === "mitad" ? "la mitad" : v.sobre === "dos tercios" ? "dos tercios" : v.sobre === "cuarta parte" ? "la cuarta parte" : v.sobre)}${v.pct ? ` · vale el ${grp(v.pct * 100, 0)} %` : ""}<b class="num">${eur0(v.valor)}</b></span>` : ""}</div>`;
}
// Filas de legitimarios: mínimo frente a lo que recibe
function lgFilas(L, x) {
  const H = L.herederos; if (!H.length) return "";
  const max = Math.max(1, ...H.map((h) => Math.max(h.legitimaMinima || 0, h.recibe || 0)));
  const terr = lgTerr(x);
  return `<div class="lg-rows">${H.map((h) => {
    const colectiva = h.legitimaMinima == null;
    const w = Math.min(100, (h.recibe || 0) / max * 100), m = Math.min(100, (h.legitimaMinima || 0) / max * 100);
    const extra = h.estado === "vulnerada" ? ` — falta ${eur0(h.deficit)}` : "";
    return `<div class="lg-row ${h.estado === "vulnerada" ? "bad" : ""}">
      <div class="lg-who"><b>${esc(h.nombre)}</b><small>${esc(LG_TIPO[h.tipo] || h.tipo)}${h.nota ? " · " + esc(h.nota) : ""}</small></div>
      <div class="lg-cmp"><div class="lg-track"><i class="lg-fill ${h.estado === "vulnerada" ? "bad" : h.estado === "cubierta" ? "ok" : "gray"}" style="width:${w}%"></i>${!colectiva && h.legitimaMinima > 0 ? `<b class="lg-min" style="left:${m}%" title="Mínimo legal ${eur0(h.legitimaMinima)}"></b>` : ""}</div>
        <div class="lg-nums"><span>Mínimo legal <b class="num">${colectiva ? "colectiva" : eur0(h.legitimaMinima)}</b></span><span>Recibe <b class="num">${eur0(h.recibe)}</b></span></div></div>
      <div class="lg-st">${lgPill(h.estado, esc(extra))}<small>${lgNorma(h.norma, terr)}</small></div></div>`;
  }).join("")}</div>`;
}
const LG_GRAV = { alta: "bad", media: "warn", baja: "gold" };
function lgAvisos(L, x) {
  const terr = lgTerr(x);
  if (!L.intangibilidad.length) return "";
  return `<div class="lg-avisos">${L.intangibilidad.map((i) => `<div class="lg-aviso"><i class="dot ${LG_GRAV[i.gravedad] || "gold"}"></i><div><b>${esc(i.titulo)}</b><p>${esc(i.detalle)}</p>${i.accion ? `<p class="lg-accion"><span>Qué hacer</span>${esc(i.accion)}</p>` : ""}<small>${lgNorma(i.norma, terr)} ${tagE(i.estado)}</small></div></div>`).join("")}</div>`;
}
// Vecindad civil del causante (control de calidad 07-10-2026, I6): decide el reparto sin testamento y las legítimas; el impuesto lo decide la
// residencia. Por defecto, la del territorio de residencia, con aviso. En Cataluña, opción de conmutar el usufructo universal (art. 442-5 CCCat);
// en Baleares, la isla (Mallorca y Menorca frente a Eivissa y Formentera).
const LG_VEC = [["comun", "Común (Código Civil)"], ["CAT", "Catalana"], ["ARA", "Aragonesa"], ["NAV", "Navarra"], ["VASCO", "Vasca"], ["GAL", "Gallega"], ["BAL", "Balear"]];
function lgVecindadHTML(x, R) {
  const V = R && R.isd && R.isd.vecindad; if (!V) return "";
  const cur = x.vecindadCivil && x.vecindadCivil !== "auto" ? x.vecindadCivil : "auto";
  const nomRes = (LG_VEC.find((v) => v[0] === V.residencia) || LG_VEC[0])[1].toLowerCase();
  const intestado = !["usufructo", "porcentajes"].includes(x.testamento);
  const viudo = (x.personas || []).some((p) => !p.renuncia && ((p.relacion === "conyuge" && !p.separado) || p.relacion === "pareja_hecho"));
  const desc = (x.personas || []).some((p) => !p.renuncia && ["hijo", "nieto", "bisnieto"].includes(p.relacion));
  const estado = R.isd.bloqueo ? `<b style="color:var(--red)">Sin testamento, el reparto no se calcula:</b> ${esc(R.isd.bloqueo.motivo)}` : V.id === "comun" ? "Reparto sin testamento y legítimas del Código Civil." : V.id === "CAT" ? "Reparto sin testamento del Código civil de Cataluña: usufructo universal del viudo o conviviente con hijos (art. 442-3 CCCat)." : V.id === "GAL" ? "Reparto sin testamento del Código Civil con los derechos del viudo de la Ley 2/2006 (arts. 253-254)." : V.id === "BAL" ? "Mallorca y Menorca: Código Civil con los derechos del viudo del art. 45 de la Compilación." : V.id === "ARA" ? "Derecho civil aragonés: hijos por partes iguales con el usufructo de viudedad del viudo sobre todo; sin hijos, los bienes troncales vuelven a la familia de procedencia (marca cuáles en su ficha), y el resto va a ascendientes, viudo y colaterales (arts. 517-535 CDFA)." : V.id === "NAV" ? "Derecho civil navarro: hijos con el usufructo de viudedad del viudo; sin hijos, el viudo antes que padres y hermanos; los inmuebles troncales vuelven a la familia de procedencia (leyes 253 y 304-307 del Fuero Nuevo)." : V.id === "VASCO" ? "Derecho civil vasco: hijos, con el usufructo de la mitad para el viudo o la pareja de hecho; sin hijos, el viudo o la pareja antes que los padres; los bienes raíces troncales de Bizkaia, Aramaio y Llodio, a los tronqueros (arts. 111-117 Ley 5/2015)." : "Reparto sin testamento del derecho civil propio.";
  return `<div class="card lg-vec" style="margin-bottom:14px">${cardH("Vecindad civil del causante", "Decide el reparto sin testamento y las legítimas; el impuesto lo decide la residencia")}
    <div class="field"><label for="lg-vec">Vecindad civil al fallecer</label><select id="lg-vec" data-opt="vecindadCivil"><option value="auto" ${cur === "auto" ? "selected" : ""}>Sin confirmar: según la residencia (${esc(nomRes)})</option>${LG_VEC.map(([k, t]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
      <span class="hint">${V.supuesta ? "Supuesta por la residencia: confírmala. Se adquiere por filiación, opción o residencia continuada de dos o diez años (arts. 14-15 CC). " : ""}${estado}</span></div>
    ${V.id === "BAL" ? `<div class="field"><label for="lg-isla">Isla</label><select id="lg-isla" data-opt="isla"><option value="" ${!x.isla ? "selected" : ""}>Sin indicar (se aplica Mallorca y Menorca)</option>${[["mallorca", "Mallorca"], ["menorca", "Menorca"], ["eivissa", "Eivissa"], ["formentera", "Formentera"]].map(([k, t]) => `<option value="${k}" ${x.isla === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>` : ""}
    ${V.id === "CAT" && intestado && viudo && desc ? `<div class="row toggle"><span class="t"><b>El viudo o conviviente conmuta el usufructo universal</b><small>Por la cuarta parte de la herencia en propiedad y el usufructo de la vivienda familiar, dentro del año siguiente al fallecimiento (art. 442-5 CCCat)</small></span><label class="switch"><input type="checkbox" data-opt="conmutacionCat" ${x.conmutacionCat ? "checked" : ""}><span></span></label></div>` : ""}
  </div>`;
}
// Sección completa para la pestaña Herederos y bienes (o una hoja propia)
function tLegitimas(x, R) { return lgVecindadHTML(x, R) + tLegitimas0(x, R); }
function tLegitimas0(x, R) {
  const L = lgCalcular(x, R); if (!L) return "";
  const terr = lgTerr(x);
  const nV = L.herederos.filter((h) => h.estado === "vulnerada").length;
  const foral = L.regimen !== "comun";
  const head = cardH("Control de legítimas", nV ? `${nV === 1 ? "Una legítima" : nV + " legítimas"} por debajo del mínimo legal` : L.colectiva && L.colectiva.estado === "vulnerada" ? "Legítima colectiva por debajo del mínimo" : L.herederos.length ? "Todos los legitimarios quedan cubiertos" : "Sin herederos forzosos", `<span class="lg-reg">${esc(L.regimenNombre)} ${tagE(L.estado)}</span>`);
  const colectiva = L.colectiva ? `<div class="lg-colectiva ${L.colectiva.estado === "vulnerada" ? "bad" : ""}"><div><div class="kick">Legítima colectiva · ${lgFrac(L.colectiva.fraccion)} del caudal</div><b class="num">${eur0(L.colectiva.importe)}</b><small>Reciben los descendientes en conjunto: ${eur0(L.colectiva.recibenDescendientes)}</small></div>${lgPill(L.colectiva.estado, L.colectiva.estado === "vulnerada" ? ` — falta ${eur0(L.colectiva.deficit)}` : "")}<p class="caption">${esc(L.colectiva.nota)}</p></div>` : "";
  const sinTestamento = !L.testado && L.regimen === "comun" && L.herederos.length ? `<p class="caption lg-nota">Sin testamento, la sucesión legal respeta las legítimas por construcción: este control sirve para contrastar el reparto si aparece un testamento o hay legados y donaciones.</p>` : "";
  return `<div class="card lg">${head}
    <p class="lg-resumen">${esc(L.resumen)}</p>
    ${lgBarra(L, x)}
    ${L.donaciones ? `<p class="caption lg-nota">Base de cálculo: herencia neta ${eur0(L.neto)} + donaciones colacionables ${eur0(L.donaciones)} = ${eur0(L.base)} (${lgNorma("art. 818 CC", terr)}).</p>` : `<p class="caption lg-nota">Base de cálculo: herencia neta ${eur0(L.base)}, sin deducir los legados (${lgNorma(foral ? L.tercios.norma : "art. 818 CC", terr)}). El ajuar doméstico no cuenta.</p>`}
    ${colectiva}
    ${L.herederos.length ? `<div class="sectitle lg-sub"><b>Legitimarios</b><span>Mínimo legal frente a lo que recibe con el reparto actual</span></div>${lgFilas(L, x)}` : ""}
    ${sinTestamento}
    ${lgAvisos(L, x)}
    ${L.notas.length ? `<ul class="notes lg-notes">${L.notas.map((n) => `<li><i class="dot gold"></i><span>${esc(n)}</span></li>`).join("")}</ul>` : ""}
    <p class="caption lg-foot">${lgNorma(L.norma, terr)} ${tagE(L.estado)}${L.pendientes.length ? ` · Pendiente de cotejo: ${esc(L.pendientes.join("; "))}` : ""}. El usufructo se valora con la regla fiscal (89 − edad, entre el 10 % y el 70 %). {{MARCA}} contrasta cifras; la calificación jurídica es del abogado.</p></div>`;
}
// Tarjeta compacta para el Resumen
function lgResumen(x, R) {
  const L = lgCalcular(x, R); if (!L) return "";
  const nV = L.herederos.filter((h) => h.estado === "vulnerada").length;
  const colV = L.colectiva && L.colectiva.estado === "vulnerada";
  const T = L.tercios;
  const segs = [["estricta", T.fracciones[0]], ["mejora", T.fracciones[1]], ["libre", T.fracciones[2]]].filter((s) => s[1] > 0.0001);
  const fr = lgFranjaViudo(L);
  const estado = nV || colV ? `<span class="lg-pill bad">${nV ? (nV === 1 ? "1 legítima vulnerada" : nV + " legítimas vulneradas") : "Colectiva vulnerada"}</span>` : L.herederos.length ? `<span class="lg-pill ok">Legítimas cubiertas</span>` : `<span class="lg-pill gray">Sin herederos forzosos</span>`;
  return `<div class="card lg-mini">${cardH("Legítimas", esc(L.regimen === "comun" ? "Código Civil" : L.regimenNombre.split(" · ")[0]), `<button class="link" data-sec="herencia" data-lg="1">Control ›</button>`)}
    <div class="lg-bar sm">${segs.map((s) => `<i class="lg-seg ${s[0]}" style="width:${s[1] * 100}%"></i>`).join("")}${fr ? `<b class="lg-usu" style="left:${fr.left * 100}%;width:${fr.width * 100}%"></b>` : ""}</div>
    <div class="lg-mini-kv">${T.estricta ? `<span>${esc(T.etiquetas[0])}<b class="num">${eur0(T.estricta)}</b></span>` : ""}${T.mejora ? `<span>Mejora<b class="num">${eur0(T.mejora)}</b></span>` : ""}<span>Libre disposición<b class="num">${eur0(T.libre)}</b></span></div>
    <div class="lg-mini-st">${estado}${L.intangibilidad.length ? `<small>${L.intangibilidad.length === 1 ? "1 aviso" : L.intangibilidad.length + " avisos"}</small>` : ""}</div></div>`;
}
// Bloques para el informe PDF (pdfDocumento)
function lgParaInforme(x, R, numero = "") {
  const L = lgCalcular(x, R); if (!L) return [];
  const E = (n) => eur(n || 0).replace(/ €$/, " €");
  const bl = [];
  bl.push({ tipo: "h", numero, texto: "Control de legítimas" });
  bl.push({ tipo: "fila", etiqueta: "Régimen", valor: `${L.regimenNombre} (${L.norma}) · ${L.estado}` });
  bl.push({ tipo: "p", texto: L.resumen });
  bl.push({ tipo: "fila", etiqueta: "Base de cálculo", valor: E(L.base) + (L.donaciones ? ` (neto ${E(L.neto)} + donaciones ${E(L.donaciones)})` : "") });
  const T = L.tercios;
  if (T) for (let i = 0; i < 3; i++) if (T.fracciones[i] > 0.0001) bl.push({ tipo: "fila", etiqueta: T.etiquetas[i], valor: `${E([T.estricta, T.mejora, T.libre][i])} (${lgFrac(T.fracciones[i])})` });
  if (L.viudo && L.viudo.valor != null) bl.push({ tipo: "fila", etiqueta: `Usufructo de ${L.viudo.nombre}`, valor: `${E(L.viudo.valor)} · sobre ${L.viudo.sobre}, ${grp((L.viudo.pct || 0) * 100, 0)} % (${L.viudo.norma})` });
  if (L.colectiva) bl.push({ tipo: "fila", etiqueta: "Legítima colectiva", valor: `${E(L.colectiva.importe)} · reciben los descendientes ${E(L.colectiva.recibenDescendientes)} · ${LG_ESTADO[L.colectiva.estado]?.[0] || L.colectiva.estado}`, separada: true });
  if (L.herederos.length) bl.push({ tipo: "tabla", cabecera: ["Legitimario", "Condición", "Mínimo legal", "Recibe", "Situación"], filas: L.herederos.map((h) => [h.nombre, LG_TIPO[h.tipo] || h.tipo, h.legitimaMinima == null ? "colectiva" : E(h.legitimaMinima), E(h.recibe), (LG_ESTADO[h.estado]?.[0] || h.estado) + (h.deficit ? ` (falta ${E(h.deficit)})` : "")]), alinear: ["l", "l", "r", "r", "l"] });
  if (L.intangibilidad.length) bl.push({ tipo: "lista", items: L.intangibilidad.map((i) => `${i.titulo}. ${i.detalle}${i.accion ? " Qué hacer: " + i.accion : ""} (${i.norma}, ${i.estado}).`) });
  for (const n of L.notas) bl.push({ tipo: "nota", texto: n });
  bl.push({ tipo: "nota", texto: "El usufructo se valora con la regla fiscal del art. 26 Ley 29/1987. Las cifras contrastan el reparto del expediente con los mínimos legales; la calificación de inoficiosidad, preterición o desheredación corresponde al abogado." + (L.pendientes.length ? " Pendiente de cotejo: " + L.pendientes.join("; ") + "." : "") });
  return bl;
}
// Elementos para el Diagnóstico: { tipo: "riesgo" | "dato", gravedad, titulo, detalle, accion, norma, estado }
function lgItems(x, R) {
  const L = lgCalcular(x, R); if (!L) return [];
  const out = [];
  const T = L.tercios;
  out.push({ tipo: "dato", gravedad: "baja", titulo: `Legítimas: ${L.regimen === "comun" ? "Código Civil" : L.regimenNombre}`, detalle: L.resumen + (T ? ` Base ${eur0(L.base)}: ${[0, 1, 2].filter((i) => T.fracciones[i] > 0.0001).map((i) => `${T.etiquetas[i].toLowerCase()} ${eur0([T.estricta, T.mejora, T.libre][i])}`).join(", ")}.` : ""), accion: "", norma: L.norma, estado: L.estado, modulo: "legitimas" });
  if (L.viudo && L.viudo.valor != null) out.push({ tipo: "dato", gravedad: "baja", titulo: `Usufructo legal de ${L.viudo.nombre}: ${eur0(L.viudo.valor)}`, detalle: `Sobre ${L.viudo.sobre} (${grp((L.viudo.pct || 0) * 100, 0)} % por edad).`, accion: "", norma: L.viudo.norma, estado: L.viudo.estado, modulo: "legitimas" });
  for (const i of L.intangibilidad) out.push({ tipo: "riesgo", gravedad: i.gravedad, titulo: i.titulo, detalle: i.detalle, accion: i.accion, norma: i.norma, estado: i.estado, modulo: "legitimas", clase: i.tipo });
  for (const h of L.herederos.filter((h) => h.estado === "vulnerada")) out.push({ tipo: "riesgo", gravedad: "alta", titulo: `${h.nombre}: legítima por debajo del mínimo (falta ${eur0(h.deficit)})`, detalle: `Mínimo legal ${eur0(h.legitimaMinima)}; recibe ${eur0(h.recibe)} con el reparto actual.`, accion: "Reclamar complemento (art. 815 CC) o reducir legados y mejoras (arts. 817-820 CC); en derecho foral, la acción de suplemento o reducción de la ley aplicable.", norma: h.norma, estado: L.estado, modulo: "legitimas", herederoId: h.id, clase: "heredero" });
  for (const n of L.notas) out.push({ tipo: "dato", gravedad: "baja", titulo: n.split(":")[0].slice(0, 80), detalle: n, accion: "", norma: L.norma, estado: L.estado, modulo: "legitimas" });
  if (L.pendientes.length) out.push({ tipo: "dato", gravedad: "baja", titulo: "Legítimas: normas pendientes de cotejo", detalle: L.pendientes.join("; "), accion: "", norma: L.norma, estado: "PENDIENTE", modulo: "legitimas" });
  return out;
}
