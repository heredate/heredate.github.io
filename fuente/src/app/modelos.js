// ───────────────────── {{MARCA}} · Modelos 650 y 660 casilla a casilla (G02 · modelos.js · prefijo m6 / M6_) ─────────────────────
// Capa de salida del Impuesto sobre Sucesiones: no calcula. Ordena calcular(x) con modelo650, relacion660 y documentos650 del motor, que
// guardan por territorio el formulario, la norma que lo aprueba, la fuente de cada casilla y su estado (motor.mjs, MODELO650_AUT).
//   m6Caso(x)              → caso del motor más las referencias de los bienes (IBAN, ISIN, matrícula…) y los conceptos de deudas y gastos
//   m6Hojas(x, R)          → modelo650 de cada heredero, con el formulario del territorio del expediente (no residente: AEAT)
//   m6Comprobar(x, R, H)   → datos obligatorios que faltan antes de presentar: [{ sev: "bloqueo"|"aviso", t, d, foco?, editb?, editp? }]
//   m6Vista650(x, R, id)   → formulario, comprobaciones y fichas casilla a casilla (id: un heredero; sin id, todos)
//   m6Vista660(x, R)       → relación de bienes por bloques con referencias, totales, cuadre y documentos que se acompañan
//   hoja650(x, R)          → la hoja de Firma › Hoja del 650 y de Encargo › Cifras 650/660 (todas las fichas)
//   m6Pdf650(x, R, id) · m6Pdf660(x, R) → PDF con el membrete del despacho
// Acciones con [data-m6] y un único escuchador en captura. Las cifras se copian como las pide el programa (1234,56, sin puntos de miles).

const M6_EST = { VERIFICADO: ["Casillas verificadas", "ok"], PARCIAL: ["Casillas verificadas en parte", "par"], "NO LOCALIZADO": ["Orden orientativo", "ori"] };
const M6_SEC = [["base", "Base imponible"], ["red", "Reducciones"], ["liq", "Liquidación"], ["pago", "Presentación fuera de plazo"]];
const m6Fmt = (f) => (f.coef ? vfFmtK(f.v) : vfFmt(f.v));
const m6Vis = (f) => (f.coef ? "×" + String(f.v).replace(".", ",") : eur(f.v));
const m6Num = (v) => (/ €$/.test(String(v)) ? String(v).replace(/\./g, "").replace(/ €$/, "") : String(v)); // «1.234,56 €» → 1234,56 para pegar
const m6Fecha = (s) => (s ? String(s).split("-").reverse().join("/") : "");

// ── Datos ──
function m6Caso(x) {
  const c = casoMotor(x), B = Object.fromEntries((x.bienes || []).map((b) => [b.id, b]));
  c.bienes = c.bienes.map((b) => { const o = B[b.id] || {}; return { ...b, descripcion: o.descripcion || "", refCatastral: o.refCatastral || "", municipio: o.municipio || "", muniNombre: o.muniNombre || "", iban: o.iban || "", entidad: o.entidad || "", isin: o.isin || "", titulos: o.titulos || "", matricula: o.matricula || "", nifSociedad: o.nifSociedad || "" }; });
  // G03: casoMotor ya trae concepto, tipo y deducibilidad de cada deuda y gasto
  c.deudas = c.deudas.map((d) => ({ ...d, concepto: d.concepto || "" }));
  c.gastos = c.gastos.map((g) => ({ ...g, concepto: g.concepto || "" }));
  return c;
}
function m6Hojas(x, R) { const c = m6Caso(x); return R.isd.herederos.map((hh) => modelo650(c, R.isd, hh.id, { territorio: x.ccaa })).filter(Boolean); }
function m6Rel(x, R) { return relacion660(m6Caso(x), R.isd); }
function m6Docs(x) { return documentos650(m6Caso(x), { territorio: x.ccaa, testamento: x.testamento === "nose" ? "nose" : x.testamento === "no" ? "no" : "si" }); }
// Identificación: sujeto pasivo, causante y presentador. Lo que falta queda como hueco «[dato]» y lo señala la comprobación.
function m6Datos(x, R, M) {
  const p = (x.personas || []).find((q) => q.id === M.heredero.id) || {}, K = typeof despachoContacto === "function" ? despachoContacto() : {}, ab = typeof abogado === "function" ? abogado(x.responsable) : null;
  const pp = num(p.patrimonioPreexistente) + (p.relacion === "conyuge" && R.isd.masa.gananciales ? R.isd.masa.gananciales / 2 : 0);
  const h = (v, ph) => (v != null && String(v).trim() ? String(v).trim() : `[${ph}]`);
  return [["Sujeto pasivo", [["Nombre y apellidos", h(p.nombre, "nombre")], ["NIF", p.nif ? vfNif(p.nif).v : "[NIF]"], ["Domicilio fiscal", h(p.domicilio, "domicilio")], ["Parentesco", RELACIONES[M.heredero.relacion]?.label || M.heredero.relacion], ["Grupo", M.heredero.grupo], ["Edad", vfEdadVale(p) ? num(p.edad) + " años" : "[edad]"], ["Discapacidad", num(p.discapacidad) ? `${num(p.discapacidad)} %` : "No"], ["Patrimonio preexistente", eur(pp)]]],
    ["Causante", [["Nombre y apellidos", h(x.nombre, "nombre del causante")], ["NIF", x.nifCausante ? vfNif(x.nifCausante).v : "[NIF]"], ["Último domicilio", h(x.domicilioCausante, "último domicilio")], ["Fecha de devengo", m6Fecha(x.fecha) || "[fecha]"], ["Territorio", nombreTerr(x.ccaa)]]],
    ["Presentador", [["Despacho", h(K.nombre, "despacho")], ["NIF del despacho", h(K.nif, "NIF del despacho")], ["Abogado", h(ab && ab.nombre, "abogado responsable")]]]];
}

// ── Comprobación de datos obligatorios antes de presentar ──
function m6Comprobar(x, R, H) {
  const out = [], add = (sev, t, d, o = {}) => out.push({ sev, t, d, ...o });
  H = H || m6Hojas(x, R);
  const nc = vfNif(x.nifCausante);
  if (!String(x.nombre || "").trim()) add("bloqueo", "Causante: falta el nombre", "El 650 y el 660 identifican al causante por su nombre y su NIF.");
  if (nc.vacio) add("bloqueo", "Causante: falta el NIF", "Se pide en cada autoliquidación y en la relación de bienes.", { foco: "vf-x-nifCausante" });
  else if (!nc.ok) add("bloqueo", "Causante: NIF incorrecto", `${nc.v}: la letra de control no cuadra.`, { foco: "vf-x-nifCausante" });
  if (!String(x.domicilioCausante || "").trim()) add("bloqueo", "Causante: falta el último domicilio", "Fija la comunidad que cobra el impuesto (art. 32 Ley 22/2009) y se declara en el formulario.", { foco: "vf-x-domicilioCausante" });
  for (const M of H) {
    const p = (x.personas || []).find((q) => q.id === M.heredero.id) || {}, n = M.heredero.nombre, ni = vfNif(p.nif);
    if (ni.vacio) add("bloqueo", `${n}: falta el NIF`, "Cada heredero presenta su autoliquidación con su NIF.", { foco: `vf-p-${p.id}-nif` });
    else if (!ni.ok) add("bloqueo", `${n}: NIF incorrecto`, `${ni.v}: la letra de control no cuadra.`, { foco: `vf-p-${p.id}-nif` });
    if (!String(p.domicilio || "").trim()) add("bloqueo", `${n}: falta el domicilio fiscal`, "El sujeto pasivo se identifica con su domicilio fiscal.", { foco: `vf-p-${p.id}-domicilio` });
    if (!vfEdadVale(p)) add("bloqueo", `${n}: falta la edad`, "La edad decide el grupo de parentesco y la reducción; el cálculo ha supuesto más de 21 años.", { editp: p.id });
    if (!M.ok) add("bloqueo", `${n}: las casillas no cuadran`, M.cuadre.filter((c) => !c.ok).map((c) => c.regla).join("; "));
    if (M.pendientes) add("aviso", `${n}: ${vfPlural(M.pendientes, "cifra", "cifras")} en verificación con el boletín`, "Marcadas como PENDIENTE en la hoja: cotéjalas antes de presentar.");
  }
  const K = typeof despachoContacto === "function" ? despachoContacto() : {};
  if (!K.nombre || !K.nif) add("aviso", "Presentador: faltan el nombre o el NIF del despacho", "Se piden al presentar en representación (art. 46 LGT). Complétalos en Ajustes › Despacho.");
  for (const b of x.bienes || []) {
    const nb = b.descripcion || (TIPO_BIEN[b.tipo] ? TIPO_BIEN[b.tipo][0] : "Bien");
    if (!(num(b.valor) > 0 || num(b.valorReferencia) > 0)) add("bloqueo", `${nb}: sin valor`, "Cada bien de la relación lleva su valor a la fecha del fallecimiento.", { editb: b.id });
    if (b.tipo === "vivienda" || b.tipo === "inmueble") { const rc = vfRC(b.refCatastral); if (!rc.ok) add("bloqueo", `${nb}: ${rc.vacio ? "falta la referencia catastral" : "referencia catastral incompleta"}`, "Identifica el inmueble en el 660 y da su valor de referencia.", { foco: `vf-b-${b.id}-refCatastral` }); }
    else if (b.tipo === "cuenta" && !b.iban && !b.entidad) add("aviso", `${nb}: sin IBAN ni entidad`, "La relación de bienes identifica cada cuenta con su entidad y su número.", { editb: b.id });
    else if (b.tipo === "valores" && !b.isin && !b.entidad) add("aviso", `${nb}: sin ISIN ni entidad depositaria`, "Los valores se identifican con su ISIN y la entidad depositaria.", { editb: b.id });
    else if (b.tipo === "vehiculo" && !b.matricula) add("aviso", `${nb}: sin matrícula`, "El vehículo se identifica por su matrícula.", { editb: b.id });
  }
  const r6 = m6Rel(x, R); if (!r6.ok) add("bloqueo", "La relación de bienes no cuadra con el cálculo", r6.cuadre.filter((c) => !c.ok).map((c) => c.regla).join("; "));
  if (x.testamento === "nose") add("aviso", "Aún no consta si hay testamento", "El título sucesorio se acompaña al 650: confírmalo con el certificado de últimas voluntades.");
  if (R.isd.bloqueo) add("bloqueo", R.isd.bloqueo.titulo, R.isd.bloqueo.accion || "");
  if (R.isd.recargo && R.isd.recargo.importe > 0) add("aviso", `Fuera de plazo: recargo de ${eur(R.isd.recargo.importe)}`, "Va en cada autoliquidación, sobre su propia cuota.");
  return out;
}
function m6ChkHTML(L, compacto) {
  const nB = L.filter((i) => i.sev === "bloqueo").length, nA = L.length - nB;
  const acc = (i) => i.foco ? `<button class="link" data-m6="foco" data-id="${esc(i.foco)}">Completar</button>` : i.editb ? `<button class="link" data-editb="${esc(i.editb)}">Completar</button>` : i.editp ? `<button class="link" data-editp="${esc(i.editp)}">Completar</button>` : "";
  const cab = `<div class="m6-chk-h"><b>${L.length ? "Antes de presentar" : "Datos obligatorios completos"}</b><span>${nB ? `<em class="m6-eb">${vfPlural(nB, "dato que falta", "datos que faltan")}</em>` : ""}${nA ? `<em class="m6-ea">${vfPlural(nA, "aviso")}</em>` : ""}${!L.length ? `<em class="m6-eo">${VF_I.ok}Correcto</em>` : ""}</span></div>`;
  if (!L.length) return `<section class="card m6-chk ok">${cab}</section>`;
  const items = L.map((i) => `<li class="${i.sev === "bloqueo" ? "b" : "a"}"><i aria-hidden="true">${i.sev === "bloqueo" ? VF_I.no : VF_I.av}</i><span><b>${esc(i.t)}</b>${i.d ? `<small>${esc(i.d)}</small>` : ""}</span>${acc(i)}</li>`);
  return `<section class="card m6-chk">${cab}${compacto && L.length > 4 ? `<ul>${items.slice(0, 4).join("")}</ul><details><summary>${vfPlural(L.length - 4, "más", "más")}</summary><ul>${items.slice(4).join("")}</ul></details>` : `<ul>${items.join("")}</ul>`}</section>`;
}

// ── Formulario del territorio ──
function m6Form(F, x, que) {
  const [et, cl] = M6_EST[F.estado] || M6_EST["NO LOCALIZADO"];
  const lnk = F.url ? ` <a href="${esc(F.url)}" target="_blank" rel="noopener">${F.programa ? esc(F.programa) : "Página oficial"} ${I.ext.replace("<svg", '<svg width="12" height="12"')}</a>` : F.programa ? " " + esc(F.programa) + "." : "";
  const sub = que === "660" ? (F.relacion || "Relación de bienes y derechos, cargas, deudas y gastos, común a toda la herencia.") : F.estado === "VERIFICADO" ? "Los números de casilla salen de las instrucciones oficiales del modelo." : F.estado === "PARCIAL" ? "Solo llevan número las casillas leídas en las instrucciones oficiales; el resto sigue el orden del formulario." : "No se ha podido cotejar el formulario vigente: las cifras siguen el orden del modelo estatal, sin números de casilla. Comprueba cada una en el programa.";
  return `<section class="card m6-form"><div class="m6-fh"><div><div class="k">${esc(F.organo || nombreTerr(x.ccaa))}</div><h3>${esc(F.nombre || "Modelo 650")}</h3></div><span class="m6-badge ${cl}">${et}</span></div>
    <p>${esc(sub)}${F.presentacion ? " " + esc(F.presentacion) : ""}${lnk}</p>
    <details class="m6-src"><summary>Fuente y estado del cotejo</summary><dl>${F.aprobacion ? `<dt>Norma</dt><dd>${esc(F.aprobacion)}</dd>` : ""}${F.fuente ? `<dt>Casillas</dt><dd>${esc(F.fuente)}</dd>` : ""}${F.motivo ? `<dt>Sin numerar</dt><dd>${esc(F.motivo)}</dd>` : ""}${F.importa ? `<dt>Importación</dt><dd>${esc(F.importa.nota)}</dd>` : `<dt>Importación</dt><dd>No se ha localizado un formato de importación público: se copia casilla a casilla.</dd>`}${(F.notas || []).map((n) => `<dt>Nota</dt><dd>${esc(n)}</dd>`).join("")}${(F.consultado || []).length ? `<dt>Consultado</dt><dd>${F.consultado.map(esc).join("<br>")}</dd>` : ""}</dl></details></section>`;
}

// ── Ficha del 650 de un heredero ──
function m6Ficha(x, R, M) {
  const F = M.form, nc = F.orientativo;
  const fila = (f) => `<div class="vf-l ${f.tot ? "t" + f.tot : ""}">${f.n != null ? `<span class="vf-cas" title="Casilla ${f.n} · ${esc(M6_EST[F.estado][0])}">${f.n}</span>` : `<span class="vf-cas e"></span>`}<span class="vf-lab">${esc(f.lab)}${f.norma || f.nota ? `<small>${esc([f.norma, f.nota].filter(Boolean).join(" · "))}${f.estado === "PENDIENTE" ? " · en verificación" : ""}</small>` : ""}</span><b class="num">${m6Vis(f)}</b><button class="vf-cp" data-m6="cp" data-v="${esc(m6Fmt(f))}" data-l="${esc((f.n != null ? "casilla " + f.n + " · " : "") + f.lab)}" aria-label="Copiar ${esc(f.lab)}">${VF_I.cp}<span>Copiar</span></button></div>`;
  const datos = m6Datos(x, R, M).map(([g, L]) => `<div class="m6-dh">${g}</div><dl class="vf-dl">${L.map(([k, v]) => { const ph = /^\[/.test(String(v)); return `<div><dt>${esc(k)}</dt><dd class="${ph ? "vf-ph" : ""}">${esc(v)}${ph ? "" : `<button class="vf-cp i" data-m6="cp" data-v="${esc(m6Num(v))}" data-l="${esc(k)}" aria-label="Copiar ${esc(k)}">${VF_I.cp}</button>`}</dd></div>`; }).join("")}</dl>`).join("");
  const secs = M6_SEC.map(([s, t]) => { const L = M.filas.filter((f) => f.sec === s); return L.length ? `<div class="vf-sh">${t}</div>${L.map(fila).join("")}` : ""; }).join("");
  const mal = M.ok ? "" : `<p class="m6-mal">Las casillas no cuadran: ${esc(M.cuadre.filter((c) => !c.ok).map((c) => c.regla).join("; "))}. Revisa el cálculo antes de presentar.</p>`;
  return `<section class="card vf-ficha m6-ficha${nc ? " nc" : ""}" id="m6-650-${esc(M.heredero.id)}"><div class="vf-fh"><div><div class="k">${esc(RELACIONES[M.heredero.relacion]?.label || "")} · grupo ${esc(M.heredero.grupo)}</div><h3>${esc(M.heredero.nombre)}</h3></div><div class="vf-fhr"><span class="vf-tot"><small>${M.recargo ? "Total a ingresar" : "A ingresar"}</small><b class="num">${eur(M.total)}</b></span></div></div>
    <div class="m6-acts"><button class="btn sm tint" data-m6="cpall" data-id="${esc(M.heredero.id)}">${VF_I.cp}Copiar todo en orden</button><button class="btn sm gray" data-m6="pdf650" data-id="${esc(M.heredero.id)}">${I.dl}PDF</button></div>
    ${datos}${secs}${mal}</section>`;
}
function m6Texto650(x, R, M) {
  const ln = (f) => `${f.n != null ? f.n : ""}\t${f.lab}\t${m6Fmt(f)}`;
  const L = [`Modelo 650 · ${M.heredero.nombre} · ${M.form.nombre}${M.form.orientativo ? " (orden orientativo, sin números de casilla)" : ""}`];
  for (const [g, D] of m6Datos(x, R, M)) { L.push("", g.toUpperCase()); D.forEach(([k, v]) => L.push(`\t${k}\t${v}`)); }
  for (const [s, t] of M6_SEC) { const F = M.filas.filter((f) => f.sec === s); if (F.length) { L.push("", t.toUpperCase()); F.forEach((f) => L.push(ln(f))); } }
  return L.join("\n");
}

// ── Vista del 650 (Impuestos: un heredero; Firma y Encargo: todos) ──
function m6Vista650(x, R, id) {
  if (!R) return `<div class="card empty" style="margin-top:14px"><b>Sin cálculo</b>Completa los datos del expediente para preparar el modelo 650.</div>`;
  const H = m6Hojas(x, R); if (!H.length) return `<div class="card empty" style="margin-top:14px"><b>Sin herederos que liquiden</b>Nadie recibe bienes en el cálculo actual.</div>`;
  const F = H[0].form, uno = id ? H.find((m) => m.heredero.id === id) || H[0] : null, C = m6Comprobar(x, R, H);
  const nav = !uno && H.length > 1 ? `<nav class="vf-jump" aria-label="Herederos">${H.map((m) => `<button data-m6="ir" data-id="m6-650-${esc(m.heredero.id)}">${esc(m.heredero.nombre)}<span class="num">${eur0(m.total)}</span></button>`).join("")}</nav>` : "";
  const pills = uno && H.length > 1 ? `<div class="hpills" role="tablist" aria-label="Modelo 650 por heredero">${H.map((m) => `<button role="tab" data-hsel="${esc(m.heredero.id)}" aria-selected="${m === uno}"><span>${esc(m.heredero.nombre)}</span><b class="num">${eur0(m.total)}</b></button>`).join("")}</div>` : "";
  const fichas = (uno ? [uno] : H).map((M) => m6Ficha(x, R, M)).join("");
  const r6 = m6Rel(x, R);
  return `<div class="m6">${m6Form(F, x, "650")}
    <div class="m6-bar"><span><b>Modelo 650 casilla a casilla</b><small>Una autoliquidación por heredero${F.cero ? ", aunque salga 0 €" : ""}. «Copiar» deja cada cifra como la pide el programa.</small></span><span class="m6-bar-b"><button class="btn sm" data-m6="pdf650" data-id="">${I.dl}PDF de ${H.length > 1 ? "todas las autoliquidaciones" : "la autoliquidación"}</button><button class="btn sm gray" data-m6="imv" data-v="660">Relación de bienes (660) · ${eur0(r6.totales.bienes)}</button></span></div>
    ${m6ChkHTML(C, true)}${pills}${nav}<div class="vf-fichas m6-fichas${uno ? " uno" : ""}">${fichas}</div>
    <p class="foot-note">Las cifras salen del cálculo del expediente con la normativa vigente a la fecha del fallecimiento; esta hoja no cambia ninguna. Cotéjalas con el programa de ayuda antes de presentar: la revisión y la firma son del abogado.</p></div>`;
}
function hoja650(x, R) { if (R === undefined) R = calcular(x); return m6Vista650(x, R, null); }

// ── Vista del 660 ──
function m6Vista660(x, R) {
  if (!R) return `<div class="card empty" style="margin-top:14px"><b>Sin cálculo</b>Completa los datos del expediente para preparar la relación de bienes.</div>`;
  const F = formulario650(x.ccaa), r6 = m6Rel(x, R), D = m6Docs(x), C = m6Comprobar(x, R);
  const cp = (v, l) => `<button class="vf-cp i" data-m6="cp" data-v="${esc(v)}" data-l="${esc(l)}" aria-label="Copiar ${esc(l)}">${VF_I.cp}</button>`;
  const fila = (f) => `<div class="m6-b"><div class="m6-bt"><b>${esc(f.desc)}</b><span class="m6-tags">${f.vivienda ? "<em>Vivienda habitual</em>" : ""}${f.titularidad === "ganancial" ? "<em>Ganancial · 50 %</em>" : f.cuota < 1 ? `<em>${grp(f.cuota * 100, f.cuota * 100 % 1 ? 2 : 0)} % del causante</em>` : ""}${f.legatario ? `<em>Legado a ${esc(f.legatario)}</em>` : ""}</span>${f.refs.length ? `<dl class="m6-refs">${f.refs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}${k === "IBAN" ? "" : cp(m6Num(v), k)}</dd></div>`).join("")}</dl>` : ""}</div><div class="m6-bv">${f.valor !== f.valorTotal ? `<small>Valor total ${eur(f.valorTotal)}</small>` : ""}<b class="num">${eur(f.valor)}</b>${cp(vfFmt(f.valor), f.desc)}</div></div>`;
  const bloque = (t, total, cuerpo) => `<section class="card m6-blq"><div class="m6-blq-h"><b>${esc(t)}</b><span class="num">${eur(total)}</span></div>${cuerpo}</section>`;
  const linea = (desc, v, extra = "") => `<div class="m6-b"><div class="m6-bt"><b>${esc(desc)}</b>${extra}</div><div class="m6-bv"><b class="num">${eur(v)}</b>${cp(vfFmt(v), desc)}</div></div>`;
  const T = r6.totales;
  const bienes = r6.bloques.map((b) => bloque(b.titulo, b.total, b.filas.map(fila).join(""))).join("");
  const ajuar = r6.ajuar ? bloque("Ajuar doméstico", r6.ajuar.valor, linea("Ajuar doméstico (art. 15 Ley 29/1987)", r6.ajuar.valor, `<small class="m6-n">${esc(r6.ajuar.nota || "")}</small>`)) : "";
  const deudas = r6.deudas.length ? bloque("Deudas", T.deudas, r6.deudas.map((d) => linea(d.desc, d.deducible, d.ganancial ? `<small class="m6-n">Deuda ganancial de ${eur(d.importe)}: resta la mitad</small>` : "")).join("")) : "";
  const gastos = r6.gastos.length ? bloque("Gastos deducibles", T.gastos, r6.gastos.map((g) => linea(g.desc, g.importe)).join("")) : "";
  const seguros = r6.seguros.length ? bloque("Seguros de vida (no forman parte del caudal)", T.seguros, r6.seguros.map((s) => linea(`Beneficiario: ${s.beneficiario || "—"}`, s.importe, `<small class="m6-n">Se suman a la base del beneficiario (art. 9.1.c Ley 29/1987)</small>`)).join("")) : "";
  const tot = `<section class="card m6-tot"><div class="m6-blq-h"><b>Resumen de la relación de bienes</b>${r6.ok ? `<span class="m6-badge ok">Cuadra con el cálculo</span>` : `<span class="m6-badge mal">No cuadra con el cálculo</span>`}</div>
    ${[["Bienes y derechos", T.bienes], ["Deudas deducibles", -T.deudas], ["Gastos deducibles", -T.gastos], ["Caudal neto", T.neto, 1], ["Ajuar doméstico", T.ajuar]].map(([k, v, t]) => `<div class="vf-l${t ? " t1" : ""}"><span class="vf-lab">${k}</span><b class="num">${eur(v)}</b>${cp(vfFmt(Math.abs(v)), k)}</div>`).join("")}
    ${r6.ok ? "" : `<p class="m6-mal">${esc(r6.cuadre.filter((c) => !c.ok).map((c) => `${c.regla}: ${eur(c.a)} frente a ${eur(c.b)}`).join("; "))}</p>`}</section>`;
  const docs = `<section class="card m6-docs"><div class="m6-blq-h"><b>Documentos que se acompañan</b><span>${D.length}</span></div><ol>${D.map((d) => `<li><b>${esc(d.doc)}</b><small>${esc(d.motivo)}</small></li>`).join("")}</ol></section>`;
  const chk = C.filter((i) => !/: (falta el NIF|NIF incorrecto|falta el domicilio fiscal|falta la edad|las casillas no cuadran)$|cifras? en verificación/.test(i.t));
  return `<div class="m6">${m6Form(F, x, "660")}
    <div class="m6-bar"><span><b>Modelo 660 · relación de bienes</b><small>Por bloques, con sus referencias y el valor que entra en la herencia. El IBAN se muestra oculto: cópialo del certificado del banco.</small></span><span class="m6-bar-b"><button class="btn sm" data-m6="pdf660">${I.dl}PDF de la relación</button><button class="btn sm gray" data-m6="cp660">${VF_I.cp}Copiar todo en orden</button></span></div>
    ${m6ChkHTML(chk, true)}<div class="m6-660">${bienes || `<div class="card empty"><b>Sin bienes</b>Añade los bienes en Herederos y bienes.</div>`}${ajuar}${deudas}${gastos}${seguros}</div>${tot}${docs}
    <p class="foot-note">Valores del cálculo a la fecha del fallecimiento: el mayor entre el declarado y el de referencia, y la parte del causante en los bienes gananciales o en proindiviso. La revisión es del abogado.</p></div>`;
}
function m6Texto660(x, R) {
  const r6 = m6Rel(x, R), L = [`Modelo 660 · relación de bienes · herencia de ${x.nombre || "—"}`];
  for (const b of r6.bloques) { L.push("", b.titulo.toUpperCase()); b.filas.forEach((f) => L.push(`${f.desc}\t${f.refs.map(([k, v]) => k + ": " + v).join(" · ")}\t${vfFmt(f.valor)}`)); L.push(`Total ${b.titulo.toLowerCase()}\t\t${vfFmt(b.total)}`); }
  if (r6.ajuar) L.push("", "AJUAR DOMÉSTICO", `Ajuar doméstico\t\t${vfFmt(r6.ajuar.valor)}`);
  if (r6.deudas.length) { L.push("", "DEUDAS"); r6.deudas.forEach((d) => L.push(`${d.desc}${d.ganancial ? " (ganancial: la mitad)" : ""}\t\t${vfFmt(d.deducible)}`)); }
  if (r6.gastos.length) { L.push("", "GASTOS"); r6.gastos.forEach((g) => L.push(`${g.desc}\t\t${vfFmt(g.importe)}`)); }
  const T = r6.totales; L.push("", "RESUMEN", `Bienes y derechos\t\t${vfFmt(T.bienes)}`, `Deudas\t\t${vfFmt(T.deudas)}`, `Gastos\t\t${vfFmt(T.gastos)}`, `Caudal neto\t\t${vfFmt(T.neto)}`);
  return L.join("\n");
}

// ── PDF con el membrete del despacho ──
function m6Pdf650(x, R, id) {
  const T = m6Hojas(x, R), H = T.filter((m) => !id || m.heredero.id === id); if (!H.length) return null;
  const otros = T.filter((m) => !H.includes(m)).map((m) => m.heredero.nombre + ":"), F = H[0].form, C = m6Comprobar(x, R, T).filter((i) => !otros.some((o) => i.t.startsWith(o)));
  const bl = [{ tipo: "p", texto: `${F.nombre}${F.organo ? " · " + F.organo : ""}. ${F.orientativo ? "Orden orientativo: no se ha podido cotejar el formulario vigente; las cifras siguen el orden del modelo estatal, sin números de casilla." : F.estado === "PARCIAL" ? "Casillas verificadas en parte: solo se numeran las leídas en las instrucciones oficiales." : "Casillas verificadas con las instrucciones oficiales del modelo."}` }];
  if (F.aprobacion) bl.push({ tipo: "p", texto: `Norma: ${F.aprobacion}.${F.fuente ? " Casillas: " + F.fuente + "." : ""}` });
  for (const M of H) {
    bl.push({ tipo: "h", texto: `${M.heredero.nombre} · ${RELACIONES[M.heredero.relacion]?.label || ""}, grupo ${M.heredero.grupo}` });
    for (const [g, D] of m6Datos(x, R, M)) bl.push({ tipo: "tabla", cabecera: [g, ""], filas: D, alinear: ["l", "l"] });
    bl.push({ tipo: "tabla", cabecera: ["Casilla", "Concepto", "Importe"], filas: M.filas.map((f) => [f.n != null ? String(f.n) : "—", f.lab + (f.estado === "PENDIENTE" ? " (en verificación)" : ""), f.coef ? "×" + vfFmtK(f.v) : vfEurPdf(f.v)]), alinear: ["l", "l", "r"] });
    bl.push({ tipo: "fila", etiqueta: M.recargo ? "Total a ingresar con recargo" : "A ingresar", valor: vfEurPdf(M.total), negrita: true, separada: true });
  }
  if (C.length) { bl.push({ tipo: "h", texto: "Antes de presentar" }); bl.push({ tipo: "lista", items: C.map((i) => `${i.sev === "bloqueo" ? "Falta: " : "Aviso: "}${i.t}${i.d ? ". " + i.d : ""}`) }); }
  bl.push({ tipo: "nota", texto: "Hoja de trabajo preparada con las cifras del cálculo del expediente. No sustituye al formulario oficial: cada cifra se coteja en el programa de ayuda antes de presentar. Revisión y firma del abogado." });
  const bytes = pdfDocumento({ titulo: "Modelo 650 casilla a casilla", subtitulo: `Herencia de ${x.nombre || "—"}${id ? " · " + H[0].heredero.nombre : ""}`, despacho: pdfDespacho(x), ref: x.despacho?.ref || "", bloques: bl, marcaAgua: C.some((i) => i.sev === "bloqueo") ? "Borrador" : "" });
  return pdfDescargar(`Modelo 650 ${pdfNombreExp(x)}${id ? " " + H[0].heredero.nombre : ""}`, bytes);
}
function m6Pdf660(x, R) {
  const r6 = m6Rel(x, R), F = formulario650(x.ccaa), D = m6Docs(x), T = r6.totales, bl = [];
  bl.push({ tipo: "p", texto: `${F.relacion || "Relación de bienes y derechos, cargas, deudas y gastos."} Formulario: ${F.nombre || "modelo 650"}${F.organo ? " (" + F.organo + ")" : ""}.` });
  bl.push({ tipo: "tabla", cabecera: ["Causante", ""], filas: [["Nombre y apellidos", x.nombre || "[nombre]"], ["NIF", x.nifCausante ? vfNif(x.nifCausante).v : "[NIF]"], ["Último domicilio", x.domicilioCausante || "[último domicilio]"], ["Fecha de devengo", m6Fecha(x.fecha)]], alinear: ["l", "l"] });
  for (const b of r6.bloques) { bl.push({ tipo: "h", texto: b.titulo }); bl.push({ tipo: "tabla", cabecera: ["Bien", "Referencias", "Valor en la herencia"], filas: [...b.filas.map((f) => [f.desc + (f.titularidad === "ganancial" ? " (ganancial, 50 %)" : f.cuota < 1 ? ` (${grp(f.cuota * 100, 2)} %)` : "") + (f.legatario ? ` · legado a ${f.legatario}` : ""), f.refs.map(([k, v]) => `${k}: ${v}`).join("; ") || "—", vfEurPdf(f.valor)]), ["Total", "", vfEurPdf(b.total)]], alinear: ["l", "l", "r"] }); }
  if (r6.ajuar) bl.push({ tipo: "fila", etiqueta: "Ajuar doméstico (art. 15 Ley 29/1987)", valor: vfEurPdf(r6.ajuar.valor), separada: true });
  if (r6.deudas.length) { bl.push({ tipo: "h", texto: "Deudas" }); bl.push({ tipo: "tabla", cabecera: ["Deuda", "Importe", "Deducible"], filas: r6.deudas.map((d) => [d.desc + (d.ganancial ? " (ganancial)" : ""), vfEurPdf(d.importe), vfEurPdf(d.deducible)]), alinear: ["l", "r", "r"] }); }
  if (r6.gastos.length) { bl.push({ tipo: "h", texto: "Gastos deducibles" }); bl.push({ tipo: "tabla", cabecera: ["Gasto", "Importe"], filas: r6.gastos.map((g) => [g.desc, vfEurPdf(g.importe)]), alinear: ["l", "r"] }); }
  if (r6.seguros.length) { bl.push({ tipo: "h", texto: "Seguros de vida (no forman parte del caudal)" }); bl.push({ tipo: "tabla", cabecera: ["Beneficiario", "Importe"], filas: r6.seguros.map((s) => [s.beneficiario || "—", vfEurPdf(s.importe)]), alinear: ["l", "r"] }); }
  bl.push({ tipo: "h", texto: "Resumen" });
  bl.push({ tipo: "tabla", cabecera: ["Concepto", "Importe"], filas: [["Bienes y derechos", vfEurPdf(T.bienes)], ["Deudas deducibles", vfEurPdf(T.deudas)], ["Gastos deducibles", vfEurPdf(T.gastos)], ["Caudal neto", vfEurPdf(T.neto)], ["Ajuar doméstico", vfEurPdf(T.ajuar)]], alinear: ["l", "r"] });
  bl.push({ tipo: "h", texto: "Documentos que se acompañan" }); bl.push({ tipo: "lista", numerada: true, items: D.map((d) => `${d.doc} (${d.motivo})`) });
  bl.push({ tipo: "nota", texto: "El IBAN se muestra oculto (país, control y últimas cuatro cifras). Relación preparada con los datos y el cálculo del expediente; no sustituye al formulario oficial. Revisión y firma del abogado." });
  const bytes = pdfDocumento({ titulo: "Modelo 660 · relación de bienes", subtitulo: `Herencia de ${x.nombre || "—"}`, despacho: pdfDespacho(x), ref: x.despacho?.ref || "", bloques: bl, marcaAgua: r6.ok ? "" : "Borrador" });
  return pdfDescargar(`Modelo 660 ${pdfNombreExp(x)}`, bytes);
}

// ── Acciones (un solo escuchador en captura) ──
function m6Click(e) {
  const t = e.target && e.target.closest ? e.target.closest("[data-m6]") : null; if (!t) return;
  e.stopPropagation(); e.preventDefault();
  const x = typeof exp === "function" ? exp() : null, d = t.dataset, a = d.m6;
  if (a === "imv") { ui.imv = d.v; if (ui.sec !== "impuestos") { ui.sec = "impuestos"; ui.sheet = null; } render(); if (d.v !== "calc") window.scrollTo(0, 0); return; }
  if (a === "ir") { const n = document.getElementById(d.id); if (n) n.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (a === "cp") { const v = d.v || ""; Promise.resolve(copiar(v)).then(() => toast(`Copiado · ${d.l || ""}: ${v}`)); return; }
  if (!x) return;
  const R = calcular(x); if (!R) { toast("Faltan datos para calcular"); return; }
  if (a === "cpall") { const M = m6Hojas(x, R).find((m) => m.heredero.id === d.id); if (M) Promise.resolve(copiar(m6Texto650(x, R, M))).then(() => toast(`Copiadas en orden las casillas de ${M.heredero.nombre}`)); return; }
  if (a === "cp660") { Promise.resolve(copiar(m6Texto660(x, R))).then(() => toast("Copiada en orden la relación de bienes")); return; }
  if (a === "foco") { ui.sec = "firma"; ui.vfv = "check"; ui.sheet = null; render(); setTimeout(() => { const n = document.getElementById(d.id); if (!n) return; n.scrollIntoView({ behavior: "smooth", block: "center" }); try { n.focus({ preventScroll: true }); } catch (er) { n.focus(); } }, 250); return; }
  if (a === "pdf650" || a === "pdf660") {
    try { const n = a === "pdf650" ? m6Pdf650(x, R, d.id || "") : m6Pdf660(x, R); if (n) { anotar(x, `${a === "pdf650" ? "Modelo 650 casilla a casilla" : "Relación de bienes (660)"} descargado en PDF`, "doc"); guardar(); toast("PDF descargado"); } }
    catch (er) { console.error(er); toast("No se pudo generar el PDF"); }
  }
}
if (typeof document !== "undefined") document.addEventListener("click", m6Click, true);
