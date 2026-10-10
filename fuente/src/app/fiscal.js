// ───────────────────── {{MARCA}} · después de presentar y aplazamiento (G06 y G08 · prefijos fs/FS_ y ap/AP_) ─────────────────────
// Impuestos › «Presentaciones y notificaciones»: por cada impuesto (Sucesiones por heredero, plusvalía por inmueble, IRPF del causante) se
// anota la presentación (fecha, modelo, justificante, NRC, importe, medio y pago) y las notificaciones de Hacienda (requerimiento, propuesta,
// liquidación, comprobación de valores, sanción, providencia de apremio). Los plazos de respuesta salen del motor (plazosProcedimiento, con
// el calendario de inhábiles del órgano, G09) y entran como trámites del expediente: Trámites, Agenda, .ics y Mi día los ven igual.
// Prescripción (arts. 66-68 LGT) y fin del derecho a pedir la devolución por cada presentación (prescripcionTributo).
// Impuestos › «Aplazamiento»: simulador del motor (simularAplazamiento) y escrito de solicitud (apEscrito, en Documentos › Escritos).
// Guardado: x.presentaciones = [{ id, clave, tributo, sujeto, fecha, modelo, justificante, nrc, importe, medio, pago, fechaPago, nota }]
//           x.procedimientos = [{ id, clave, tributo, tipo, fechaNot, organo, dias, importe, ref, estado, creado }]
//           x.aplazamiento = { heredero, importe, liquidez, regimen, modo, plazos, periodicidad, primerVencimiento, garantia, otrasDeudas, cuenta, motivo }
//           x.muniPlazos = código INE del municipio de la oficina o del domicilio del interesado (festivos locales en Sucesiones)
// Estado de cada plazo: el del trámite (x.tramites["fs-…"]), el mismo que se marca en Trámites.
// Eventos propios (captura en document): [data-fs] clic · formularios [data-fsf] · cambios [data-fsmuni] y [data-ap].
const FS_TRIB = { ISD: "Impuesto sobre Sucesiones", IIVTNU: "Plusvalía municipal", IRPF: "IRPF del causante" };
const FS_MEDIOS = [["telematica", "Telemática (sede electrónica)"], ["colaborador", "Colaborador social"], ["oficina", "Oficina o registro"], ["notaria", "A través de la notaría"]];
const FS_PAGO = [["pagado", "Pagado"], ["pendiente", "Pendiente de pago"], ["sin_ingreso", "Sin ingreso (cuota cero)"], ["aplazado", "Aplazamiento solicitado"], ["fraccionado", "Fraccionamiento solicitado"], ["domiciliado", "Domiciliado"]];
const FS_ESTADOS = [["abierto", "En plazo"], ["contestado", "Contestado"], ["recurrido", "Recurrido"], ["cerrado", "Cerrado"]];
const FS_ = { edit: "", nuevo: false };
const fsPres = (x) => (Array.isArray(x && x.presentaciones) ? x.presentaciones.filter((p) => p && typeof p === "object") : []);
const fsProcs = (x) => (Array.isArray(x && x.procedimientos) ? x.procedimientos.filter((p) => p && typeof p === "object") : []);
const fsF = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(String(f || "")) ? f : "");
const fsInm = (b) => b && (b.tipo === "vivienda" || b.tipo === "inmueble");
// Calendario del órgano: Hacienda autonómica (y municipio indicado); plusvalía: ayuntamiento del inmueble (G09)
function fsCal(x, tributo, sujeto) {
  if (tributo === "IIVTNU") { const b = (x.bienes || []).find((q) => q.id === sujeto); const ine = b && typeof ineBien === "function" ? ineBien(b) : ""; if (ine) return calendarioDe(null, ine, b.muniNombre || ""); }
  return calendarioDe(x.ccaa, x.muniPlazos || "");
}
// Obligaciones que nacen de la herencia, con su importe estimado y el fin del plazo de presentación
function fsObligaciones(x, R) {
  if (!x || !x.fecha) return [];
  const pr = x.tramites?.prorroga?.estado === "hecho", out = [];
  const limISD = limiteISD(x.fecha, pr, fsCal(x, "ISD"));
  for (const h of (R && R.isd && R.isd.herederos) || (x.personas || []).filter((p) => !p.renuncia)) out.push({ clave: "ISD:" + h.id, tributo: "ISD", sujeto: h.id, nombre: h.nombre || "Heredero", importe: Number(h.aIngresar) || 0, modelo: x.ccaa === "EST" ? "650 (AEAT)" : "650", finPlazo: limISD });
  for (const b of (x.bienes || []).filter(fsInm)) {
    const p = (R && R.plus || []).find((q) => q.b && q.b.id === b.id);
    out.push({ clave: "IIVTNU:" + b.id, tributo: "IIVTNU", sujeto: b.id, nombre: b.descripcion || "Inmueble", importe: p && p.r ? Number(p.r.total) || 0 : 0, modelo: "Autoliquidación o declaración del IIVTNU", finPlazo: plazoPlusvalia(x.fecha, [{ ine: typeof ineBien === "function" ? ineBien(b) : "" }].filter((q) => q.ine), 6).limite });
  }
  out.push({ clave: "IRPF:", tributo: "IRPF", sujeto: "", nombre: "Última declaración del causante", importe: 0, modelo: "100", finPlazo: aHabil(`${Number(x.fecha.slice(0, 4)) + 1}-06-30`, fsCal(x, "IRPF")), notaPlazo: "Fin de la campaña de renta del año siguiente (fecha habitual: compruébala cada año)" });
  return out;
}
const fsPresDe = (x, clave) => fsPres(x).find((p) => p.clave === clave) || null;
function fsFinPlazo(x, p, R) { const o = fsObligaciones(x, R).find((q) => q.clave === p.clave); return o ? o.finPlazo : ""; }
const fsSujetoNombre = (x, tributo, sujeto) => tributo === "ISD" ? ((x.personas || []).find((p) => p.id === sujeto) || {}).nombre || "" : tributo === "IIVTNU" ? ((x.bienes || []).find((b) => b.id === sujeto) || {}).descripcion || "" : "";
function fsPresc(x, p, R) {
  const fin = fsFinPlazo(x, p, R); if (!fin) return null;
  const ints = fsProcs(x).filter((q) => q.clave === p.clave).map((q) => fsF(q.fechaNot)).filter(Boolean);
  return prescripcionTributo({ finPlazo: fin, presentacion: fsF(p.fecha), pago: p.pago === "pagado" ? fsF(p.fechaPago) || fsF(p.fecha) : "", interrupciones: ints });
}
function fsPlazos(x, q) {
  const [trib, suj] = String(q.clave || "").split(":");
  return plazosProcedimiento(q.tipo, fsF(q.fechaNot), { cal: fsCal(x, q.tributo || trib, suj), tributo: q.tributo || trib, dias: q.dias, importe: q.importe });
}
const fsTid = (q, pid) => `fs-${String(q.id).replace(/[^a-z0-9]/gi, "")}-${pid}`;
// Trámites que nacen de lo anotado (los lee tramitesExp de ui.js): plazos de cada notificación abierta, pago pendiente y devolución
function fsTramites(x, R) {
  if (!x || !x.fecha) return [];
  const out = [], base = { fase: "despues", quien: "Abogado", docs: [], sede: null, desde: null, recomendado: false, informativo: false, condicional: "", nota: "", estado: "VERIFICADO", posible: null };
  const acc = { tipo: "tab", tab: "impuestos", sub: "presentaciones", texto: "Ver la notificación" };
  for (const q of fsProcs(x)) {
    if (q.estado === "cerrado") continue;
    const P = fsPlazos(x, q); if (!P) continue;
    const [trib, suj] = String(q.clave || "").split(":"), t = q.tributo || trib, sn = fsSujetoNombre(x, t, suj);
    const org = q.organo || (t === "IIVTNU" ? "Ayuntamiento" : t === "IRPF" ? "Agencia Tributaria" : "Hacienda autonómica");
    for (const pl of P.plazos) {
      if (pl.id === "tpc") continue; // misma fecha que el recurso: se explica en él
      const otros = pl.id === "recurso" && P.plazos.some((z) => z.id === "tpc") ? " (o tasación pericial contradictoria)" : "";
      out.push({ ...base, id: fsTid(q, pl.id), titulo: `${pl.nombre}${otros} · ${FS_TRIB[t] || t}${sn ? " · " + sn : ""}`, que: `${P.nombre} notificada el ${fechaCorta(q.fechaNot)}${q.ref ? " (ref. " + q.ref + ")" : ""}. ${pl.nota}`, organismo: org, limite: pl.limite, norma: pl.norma, aviso: pl.aviso, posible: pl.posible, accion: acc });
    }
  }
  const hoyF = typeof hoy === "function" ? hoy() : new Date().toISOString().slice(0, 10);
  for (const p of fsPres(x)) {
    const sn = fsSujetoNombre(x, p.tributo, p.sujeto), nom = `${FS_TRIB[p.tributo] || p.tributo}${sn ? " · " + sn : ""}`;
    if (p.pago === "pendiente") { const fin = fsFinPlazo(x, p, R); if (fin) out.push({ ...base, id: "fs-pago-" + String(p.id).replace(/[^a-z0-9]/gi, ""), titulo: `Ingresar lo presentado sin pago · ${nom}`, que: "Presentada sin ingreso: si no se paga ni se pide aplazamiento antes del fin del plazo, empieza el periodo ejecutivo con recargo del 5 % al 20 % (arts. 28 y 161 LGT).", organismo: p.tributo === "IIVTNU" ? "Ayuntamiento" : "Hacienda autonómica", limite: fin, norma: "arts. 28, 62.1 y 161 LGT", accion: acc }); }
    const P = Number(num(p.importe)) > 0 ? fsPresc(x, p, R) : null;
    if (P && P.devolucion.hasta >= hoyF) out.push({ ...base, id: "fs-rect-" + String(p.id).replace(/[^a-z0-9]/gi, ""), titulo: `Último día para pedir la rectificación y la devolución · ${nom}`, que: "Si se pagó de más (una deuda o reducción no aplicada, un valor excesivo), se pide la rectificación de la autoliquidación y la devolución con intereses.", organismo: p.tributo === "IIVTNU" ? "Ayuntamiento" : "Hacienda autonómica", limite: P.devolucion.hasta, norma: P.devolucion.norma, informativo: dias(hoyF, P.devolucion.hasta) > 120, accion: acc });
  }
  return out;
}

// ── Panel «Presentaciones y notificaciones» ──
const fsOpts = (L, v) => L.map(([k, t]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(t)}</option>`).join("");
function fsMuniOpts(x) {
  const ines = new Set([...CAPITALES_INE, ...Object.values(FESTIVOS_LOCALES).flatMap((a) => Object.keys(a))]);
  const nom = (i) => { for (const a in FESTIVOS_LOCALES) if (FESTIVOS_LOCALES[a][i]) return FESTIVOS_LOCALES[a][i].n; const k = typeof MUNI_CLAVES === "object" ? Object.keys(MUNI_CLAVES).find((c) => MUNI_CLAVES[c] === i) : ""; return (k && ORDENANZAS[k] && ORDENANZAS[k].nombre) || i; };
  const L = [...ines].map((i) => [i, nom(i)]).sort((a, b) => a[1].localeCompare(b[1], "es"));
  const propia = L.filter(([i]) => PROV_CCAA[i.slice(0, 2)] === x.ccaa || (["ALA", "BIZ", "GIP"].includes(x.ccaa) && ["01", "20", "48"].includes(i.slice(0, 2)))), resto = L.filter((q) => !propia.includes(q));
  const op = ([i, n]) => `<option value="${i}" ${x.muniPlazos === i ? "selected" : ""}>${esc(n)}</option>`;
  return `<option value="">Sin indicar (solo nacionales y autonómicos)</option>${propia.length ? `<optgroup label="${esc(typeof nombreTerr === "function" ? nombreTerr(x.ccaa) : x.ccaa)}">${propia.map(op).join("")}</optgroup>` : ""}<optgroup label="Otras capitales">${resto.map(op).join("")}</optgroup>`;
}
function fsFormPres(x, o, p) {
  const v = p || {};
  return `<form class="card fs-form" data-fsf="pres" data-clave="${esc(o.clave)}">
    <div class="fs-grid">
      <div class="field"><label for="fs-f">Fecha de presentación</label><input id="fs-f" name="fecha" type="date" value="${esc(v.fecha || "")}" required></div>
      <div class="field"><label for="fs-m">Modelo</label><input id="fs-m" name="modelo" value="${esc(v.modelo || o.modelo)}" maxlength="60"></div>
      <div class="field"><label for="fs-j">Justificante</label><input id="fs-j" name="justificante" value="${esc(v.justificante || "")}" maxlength="40" placeholder="N.º de justificante"></div>
      <div class="field"><label for="fs-n">NRC</label><input id="fs-n" name="nrc" value="${esc(v.nrc || "")}" maxlength="40" placeholder="Número de referencia completo"></div>
      <div class="field"><label for="fs-i">Importe ingresado</label><input id="fs-i" name="importe" inputmode="decimal" value="${esc(v.importe != null && v.importe !== "" ? String(v.importe).replace(".", ",") : o.importe ? String(o.importe).replace(".", ",") : "")}"></div>
      <div class="field"><label for="fs-me">Medio</label><select id="fs-me" name="medio">${fsOpts(FS_MEDIOS, v.medio || "telematica")}</select></div>
      <div class="field"><label for="fs-p">Pago</label><select id="fs-p" name="pago">${fsOpts(FS_PAGO, v.pago || (o.importe > 0 ? "pagado" : "sin_ingreso"))}</select></div>
      <div class="field"><label for="fs-fp">Fecha de pago</label><input id="fs-fp" name="fechaPago" type="date" value="${esc(v.fechaPago || "")}"></div>
    </div>
    <div class="field"><label for="fs-no">Nota</label><input id="fs-no" name="nota" value="${esc(v.nota || "")}" maxlength="200" placeholder="Oficina, colaborador social, incidencias…"></div>
    <div class="acts fs-acts"><button class="btn sm" type="submit">Guardar</button><button class="btn sm gray" type="button" data-fs="cancelar">Cancelar</button>${p ? `<button class="btn sm gray" type="button" data-fs="borrarPres" data-id="${esc(p.id)}">Quitar</button>` : ""}</div>
  </form>`;
}
function fsFormProc(x, R) {
  const O = fsObligaciones(x, R);
  return `<form class="card fs-form" data-fsf="proc">
    <div class="fs-grid">
      <div class="field"><label for="fq-c">Impuesto</label><select id="fq-c" name="clave">${O.map((o) => `<option value="${esc(o.clave)}">${esc(FS_TRIB[o.tributo] + (o.tributo !== "IRPF" ? " · " + o.nombre : ""))}</option>`).join("")}</select></div>
      <div class="field"><label for="fq-t">Qué se ha notificado</label><select id="fq-t" name="tipo">${fsOpts(PROC_TIPOS, "requerimiento")}</select></div>
      <div class="field"><label for="fq-f">Fecha de notificación</label><input id="fq-f" name="fechaNot" type="date" required></div>
      <div class="field"><label for="fq-d">Días hábiles que da el acto</label><input id="fq-d" name="dias" inputmode="numeric" value="10" maxlength="3"><span class="hint">Solo requerimientos y propuestas</span></div>
      <div class="field"><label for="fq-o">Órgano</label><input id="fq-o" name="organo" maxlength="80" placeholder="Oficina liquidadora, ayuntamiento…"></div>
      <div class="field"><label for="fq-r">Referencia</label><input id="fq-r" name="ref" maxlength="40" placeholder="N.º de expediente o de liquidación"></div>
      <div class="field"><label for="fq-i">Importe</label><input id="fq-i" name="importe" inputmode="decimal" placeholder="Si la notificación lo fija"></div>
    </div>
    <div class="acts fs-acts"><button class="btn sm" type="submit">Calcular plazos y guardar</button><button class="btn sm gray" type="button" data-fs="cancelar">Cancelar</button></div>
  </form>`;
}
const fsPagoTxt = (p) => (FS_PAGO.find(([k]) => k === p.pago) || [, ""])[1];
function fsPanelHTML(x, R) {
  const O = fsObligaciones(x, R), info = infoCalendario(calendarioDe(x.ccaa, x.muniPlazos || ""), (hoy() || "").slice(0, 4));
  const T = typeof tramitesExp === "function" ? tramitesExp(x, R) : [], est = (id) => (T.find((t) => t.id === id) || {}).st || "pend";
  const fila = (o) => {
    const p = fsPresDe(x, o.clave), v = p ? null : vence({ limite: o.finPlazo, st: "pend" });
    if (FS_.edit === o.clave) return `<div class="fs-edit"><div class="fs-edit-h"><b>${esc(FS_TRIB[o.tributo])}${o.tributo !== "IRPF" ? " · " + esc(o.nombre) : ""}</b><small>Plazo de presentación hasta el ${fechaCorta(o.finPlazo)}</small></div>${fsFormPres(x, o, p)}</div>`;
    return `<div class="row"><span class="ico ${p ? "green" : "gray"} fs-ico">${p ? I.tick : I.doc}</span><span class="t"><b>${esc(o.tributo === "IRPF" ? o.nombre : o.nombre)}</b><small>${p ? `Presentada el ${fechaCorta(p.fecha)}${p.modelo ? " · modelo " + esc(p.modelo) : ""}${p.nrc ? " · NRC " + esc(p.nrc) : p.justificante ? " · justificante " + esc(p.justificante) : ""} · <span class="num">${eur(num(p.importe))}</span> · ${esc(fsPagoTxt(p))}${p.pago === "pagado" && p.fechaPago ? " el " + fechaCorta(p.fechaPago) : ""}` : `Sin presentar · <span class="due ${v.cls}">${esc(v.txt)}</span>${o.importe ? ` · estimado <span class="num">${eur(o.importe)}</span>` : ""}${o.notaPlazo ? " · " + esc(o.notaPlazo) : ""}`}</small></span><button class="btn sm gray" data-fs="editar" data-clave="${esc(o.clave)}">${p ? "Editar" : "Anotar"}</button></div>`;
  };
  const grupos = ["ISD", "IIVTNU", "IRPF"].map((t) => [t, O.filter((o) => o.tributo === t)]).filter(([, L]) => L.length);
  const procs = fsProcs(x).slice().sort((a, b) => String(b.fechaNot).localeCompare(String(a.fechaNot)));
  const procHTML = (q) => {
    const P = fsPlazos(x, q); const [trib, suj] = String(q.clave || "").split(":"); const t = q.tributo || trib, sn = fsSujetoNombre(x, t, suj);
    return `<div class="card fs-proc ${q.estado === "cerrado" ? "fs-cerrado" : ""}"><div class="fs-proc-h"><div><div class="k">${esc(FS_TRIB[t] || t)}${sn ? " · " + esc(sn) : ""}</div><h3>${esc(P ? P.nombre : q.tipo)}</h3><small>Notificada el ${fechaCorta(q.fechaNot)}${q.organo ? " · " + esc(q.organo) : ""}${q.ref ? " · ref. " + esc(q.ref) : ""}${num(q.importe) ? ` · <span class="num">${eur(num(q.importe))}</span>` : ""}</small></div><select class="fs-estado" data-fsest="${esc(q.id)}" aria-label="Estado de la notificación">${fsOpts(FS_ESTADOS, q.estado || "abierto")}</select></div>
      ${P ? `<div class="group" style="--inset:54px">${P.plazos.map((pl) => { const tid = fsTid(q, pl.id), st = pl.id === "tpc" ? est(fsTid(q, "recurso")) : est(tid), hecho = st === "hecho" || q.estado === "cerrado", v = vence({ limite: pl.limite, st: hecho ? "hecho" : "pend" }); return `<div class="row ${hecho ? "done" : ""}">${pl.id === "tpc" ? `<span class="st-sp"></span>` : `<button class="st ${hecho ? "hecho" : ""}" data-fs="hecho" data-tid="${tid}" aria-label="${hecho ? "Marcar como pendiente" : "Marcar como hecho"}">${hecho ? I.tick : ""}</button>`}<span class="t"><b>${esc(pl.nombre)}</b><small><span class="due ${v.cls}">${hecho ? "Hecho" : esc(v.txt)}</span> · hasta el ${fechaCorta(pl.limite)} · ${esc(pl.norma)}</small><small class="fs-nota">${esc(pl.nota)}${pl.aviso ? (pl.nota ? ". " : "") + esc(pl.aviso.replace(/\d{4}-\d{2}-\d{2}/g, fechaCorta)) + "." : ""}</small></span></div>`; }).join("")}</div>${P.avisos.length ? `<ul class="notes fs-avisos">${P.avisos.map((a) => `<li><i class="dot"></i><span>${esc(a)}</span></li>`).join("")}</ul>` : ""}` : `<p class="caption">Fecha de notificación no válida.</p>`}
      <div class="acts fs-acts"><button class="btn sm gray" data-fs="borrarProc" data-id="${esc(q.id)}">Quitar</button></div></div>`;
  };
  const presc = fsPres(x).map((p) => ({ p, P: fsPresc(x, p, R) })).filter((q) => q.P);
  return `<div class="infobar fs-cal"><span class="ico teal">${I.cal}</span><span><b>Calendario de plazos.</b> ${esc(info.texto)}.<label class="fs-muni"><span>Municipio de la oficina o del domicilio del interesado (festivos locales en Sucesiones, art. 30.6 Ley 39/2015)</span><select data-fsmuni="1" aria-label="Municipio para los festivos locales">${fsMuniOpts(x)}</select></label></span></div>
    <div class="sectitle flex"><b>Presentaciones y pagos</b><span>${plural(fsPres(x).length, "anotada")} de ${O.length}</span></div>
    ${grupos.map(([t, L]) => `<div class="fs-grupo"><div class="fs-gt">${esc(FS_TRIB[t])}</div><div class="group" style="--inset:58px">${L.map(fila).join("")}</div></div>`).join("")}
    <div class="sectitle flex"><b>Notificaciones de Hacienda y del ayuntamiento</b><span>${procs.filter((q) => q.estado !== "cerrado").length ? plural(procs.filter((q) => q.estado !== "cerrado").length, "abierta") : "Ninguna abierta"}</span></div>
    ${FS_.nuevo ? fsFormProc(x, R) : `<button class="personal" data-fs="nuevo"><span class="ico indigo">${I.plus || I.doc}</span><span class="t" style="flex:1"><b>Anotar una notificación</b><small>Requerimiento, propuesta de liquidación, liquidación, comprobación de valores, sanción o providencia de apremio: los plazos se calculan solos y van a Trámites, la Agenda y Mi día</small></span>${I.chev}</button>`}
    <div class="grid" style="gap:12px;margin-top:12px">${procs.map(procHTML).join("")}</div>
    <div class="sectitle flex"><b>Prescripción</b><span>Cuatro años (arts. 66-68 LGT)</span></div>
    ${presc.length ? `<div class="tablewrap card" style="padding:0"><table class="grid-t fs-t"><thead><tr><th>Impuesto</th><th>Hacienda puede comprobar hasta</th><th>Se puede pedir la devolución hasta</th></tr></thead><tbody>${presc.map(({ p, P }) => `<tr><td><b>${esc(FS_TRIB[p.tributo])}</b><small>${esc(fsSujetoNombre(x, p.tributo, p.sujeto) || (p.tributo === "IRPF" ? "Causante" : ""))}</small></td><td class="mono">${fechaCorta(P.liquidar.hasta)}<small>Desde ${fechaCorta(P.liquidar.desde)}: ${esc(P.liquidar.motivo)}</small></td><td class="mono">${fechaCorta(P.devolucion.hasta)}<small>${esc(P.devolucion.motivo)}</small></td></tr>`).join("")}</tbody></table></div><p class="foot-note">Cada notificación anotada interrumpe la prescripción y el cómputo vuelve a empezar (art. 68 LGT). El último día para pedir la devolución entra en Trámites y, cuando falten cuatro meses, en la Agenda y en Mi día.</p>` : `<div class="card empty"><b>Sin presentaciones anotadas.</b><p>Al anotar cada presentación se calculan la prescripción y el plazo para pedir la devolución.</p></div>`}
    <p class="foot-note">Plazos en días hábiles (sábados, domingos y festivos excluidos, art. 30.2 Ley 39/2015) y en meses de fecha a fecha desde el día siguiente a la notificación (art. 30.4), trasladados al siguiente hábil si vencen en inhábil (art. 30.5). Compruébalos con la notificación: si fija otro plazo, manda el suyo.</p>`;
}

// ── Aplazamiento y fraccionamiento (G08) ──
const apCfg = (x) => (x.aplazamiento && typeof x.aplazamiento === "object" ? x.aplazamiento : {});
// Liquidez estimada del heredero: su parte de lo adquirido en la proporción de dinero y valores del caudal (estimación editable)
function apLiquidez(x, h) {
  const peso = (b) => (b.titularidad === "ganancial" ? 0.5 : b.titularidad === "proindiviso" ? num(b.porcentaje) / 100 || 0 : 1) * num(b.valor);
  const B = x.bienes || [], tot = B.reduce((s, b) => s + peso(b), 0), liq = B.filter((b) => b.tipo === "cuenta" || b.tipo === "valores").reduce((s, b) => s + peso(b), 0);
  return tot > 0 && h ? Math.round((Number(h.valorAdquirido) || 0) * (liq / tot) * 100) / 100 : 0;
}
function apDatos(x, R) {
  const c = apCfg(x), HH = (R && R.isd && R.isd.herederos) || [], h = HH.find((q) => q.id === c.heredero) || HH.slice().sort((a, b) => b.aIngresar - a.aIngresar)[0] || null;
  const cuota = h ? Number(h.aIngresar) || 0 : 0, liquidez = c.liquidez !== undefined && c.liquidez !== "" ? num(c.liquidez) : apLiquidez(x, h);
  const sugerido = Math.max(0, Math.round((cuota - liquidez) * 100) / 100), importe = c.importe !== undefined && c.importe !== "" ? num(c.importe) : sugerido;
  const pr = x.tramites?.prorroga?.estado === "hecho", fin = x.fecha ? limiteISD(x.fecha, pr, calendarioDe(x.ccaa, x.muniPlazos || "")) : "";
  const S = simularAplazamiento({ importe, finVoluntario: fin, regimen: c.regimen || "general", modo: c.modo || "fraccionamiento", plazos: c.plazos || 12, periodicidad: c.periodicidad || 1, primerVencimiento: fsF(c.primerVencimiento), garantia: c.garantia || "otra", otrasDeudas: num(c.otrasDeudas) });
  return { c, HH, h, cuota, liquidez, sugerido, importe, fin, S, foral: ["NAV", "ALA", "BIZ", "GIP"].includes(x.ccaa) };
}
function apPanelHTML(x, R) {
  const D = apDatos(x, R), { c, HH, h, S } = D;
  if (!HH.length || !x.fecha) return `<div class="card empty"><b>Faltan datos para simular el aplazamiento.</b><p>Hace falta la fecha de fallecimiento y el cálculo de Sucesiones de cada heredero.</p></div>`;
  const sel = (k, L, v) => `<select id="ap-${k}" data-ap="${k}">${fsOpts(L, v)}</select>`;
  const inp = (k, v, ph, tipo) => `<input id="ap-${k}" data-ap="${k}" ${tipo === "date" ? 'type="date"' : 'inputmode="decimal"'} value="${esc(v == null ? "" : String(v).replace(".", ","))}" placeholder="${esc(ph || "")}">`;
  const reg = APLAZ_REGIMENES.find((r) => r.id === (c.regimen || "general")) || APLAZ_REGIMENES[0];
  return `<div class="infobar"><span class="ico gold">${I.info}</span><span>Si la herencia no tiene dinero suficiente para pagar Sucesiones, se puede pedir <b>aplazamiento o fraccionamiento</b> dentro del plazo de presentación (en autoliquidación, los seis meses: STS 1297/2025, de 15 de octubre). Con la solicitud en plazo no hay recargo ni apremio, solo intereses (arts. 65.5 LGT y 53 RD 939/2005).${D.foral ? " En territorio foral rige su propia normativa de recaudación: cotéjala." : ""}</span></div>
    <div class="card ap-form" style="margin-top:14px">
      <div class="fs-grid">
        <div class="field"><label for="ap-heredero">Heredero</label>${sel("heredero", HH.map((q) => [q.id, `${q.nombre} · ${eur0(q.aIngresar)}`]), h ? h.id : "")}</div>
        <div class="field"><label for="ap-liquidez">Liquidez disponible</label>${inp("liquidez", c.liquidez !== undefined && c.liquidez !== "" ? c.liquidez : D.liquidez, "Dinero que recibe")}<span class="hint">Estimada con el dinero y los valores del caudal: corrígela con lo que recibe</span></div>
        <div class="field"><label for="ap-importe">Importe a aplazar</label>${inp("importe", c.importe !== undefined && c.importe !== "" ? c.importe : D.sugerido, "Cuota menos liquidez")}<span class="hint">Cuota ${eur(D.cuota)} menos liquidez: ${eur(D.sugerido)}</span></div>
        <div class="field"><label for="ap-regimen">Régimen</label>${sel("regimen", APLAZ_REGIMENES.map((r) => [r.id, r.nombre + (r.estado === "PENDIENTE" ? " (en verificación)" : "")]), reg.id)}</div>
        <div class="field"><label for="ap-modo">Modalidad</label>${sel("modo", [["fraccionamiento", "Fraccionamiento (varios plazos)"], ["aplazamiento", "Aplazamiento (un solo pago)"]], c.modo || "fraccionamiento")}</div>
        ${(c.modo || "fraccionamiento") === "fraccionamiento" ? `<div class="field"><label for="ap-plazos">Número de plazos</label>${inp("plazos", c.plazos || 12, "12")}</div><div class="field"><label for="ap-periodicidad">Cada</label>${sel("periodicidad", [["1", "mes"], ["3", "trimestre"], ["6", "semestre"], ["12", "año"]], String(c.periodicidad || 1))}</div>` : ""}
        <div class="field"><label for="ap-primerVencimiento">${(c.modo || "fraccionamiento") === "fraccionamiento" ? "Primer vencimiento" : "Fecha de pago propuesta"}</label>${inp("primerVencimiento", c.primerVencimiento || (S ? S.filas[0].vencimiento : ""), "", "date")}</div>
        <div class="field"><label for="ap-otrasDeudas">Otras deudas pendientes con esa Hacienda</label>${inp("otrasDeudas", c.otrasDeudas || "", "0")}<span class="hint">Cuentan para el límite de la garantía</span></div>
        ${S && !S.dispensa ? `<div class="field"><label for="ap-garantia">Garantía ofrecida</label>${sel("garantia", [["aval", "Aval bancario o seguro de caución"], ["otra", "Hipoteca, prenda u otra"]], c.garantia || "otra")}</div>` : ""}
      </div>
      <p class="caption ap-reg">${esc(reg.norma)} · ${typeof tagE === "function" ? tagE(reg.estado) : esc(reg.estado)} ${esc(reg.nota)}</p>
    </div>
    ${S ? `<div class="kpis ap-kpis" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${kpi("Aplazado", eur0(S.importe), S.modo === "fraccionamiento" ? plural(S.filas.length, "plazo") : "un pago")}${kpi("Intereses", eur(S.intereses), `${String(Math.round(S.tipo * 1e6) / 1e4).replace(".", ",")} % ${S.garantia === "aval" ? "interés legal" : "interés de demora"}`)}${kpi("Total a pagar", eur(S.total), "principal e intereses")}${kpi("Garantía", S.dispensa ? "No exigida" : eur0(S.importeGarantia), S.dispensa ? "hasta 50.000 €" : "deuda, intereses y 25 %")}</div>
    ${S.avisos.length ? `<ul class="notes ap-avisos">${S.avisos.map((a) => `<li><i class="dot warn"></i><span>${esc(a.replace(/\d{4}-\d{2}-\d{2}/g, fechaCorta))}</span></li>`).join("")}</ul>` : ""}
    <div class="sectitle flex"><b>Cuadro de vencimientos</b><span>Fin del periodo voluntario: ${fechaCorta(S.finVoluntario)}</span></div>
    <div class="tablewrap card" style="padding:0"><table class="grid-t ap-t"><thead><tr><th>Plazo</th><th>Vencimiento</th><th class="n">Principal</th><th class="n">Días</th><th class="n">Intereses</th><th class="n">Total</th></tr></thead><tbody>${S.filas.map((f) => `<tr><td>${f.n}</td><td class="mono">${fechaCorta(f.vencimiento)}</td><td class="n num">${eur(f.principal)}</td><td class="n num">${f.dias}</td><td class="n num">${eur(f.interes)}</td><td class="n num">${eur(f.total)}</td></tr>`).join("")}<tr class="ap-tot"><td colspan="2"><b>Total</b></td><td class="n num"><b>${eur(S.importe)}</b></td><td></td><td class="n num"><b>${eur(S.intereses)}</b></td><td class="n num"><b>${eur(S.total)}</b></td></tr></tbody></table></div>
    <div class="acts" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn" data-doc="aplazamiento">${I.doc}Solicitud de aplazamiento</button></div>
    <p class="foot-note">Estimación: intereses por días naturales sobre 365, cada fracción desde el día siguiente al fin del periodo voluntario hasta su vencimiento (art. 53 RD 939/2005); interés de demora del 4,0625 % (2026, art. 26.6 LGT) y legal del 3,25 % con aval. Los vencimientos los fija la Administración en el acuerdo. Garantía: ${esc(APLAZ_GARANTIA.norma)}. ${esc(APLAZ_GARANTIA.nota)}.</p>` : `<div class="card empty" style="margin-top:14px"><b>Nada que aplazar.</b><p>Con la liquidez indicada, ${esc(h ? h.nombre : "el heredero")} puede pagar su cuota. Si no es así, corrige la liquidez o el importe.</p></div>`}`;
}
// Escrito: solicitud de aplazamiento o fraccionamiento (art. 46 RD 939/2005)
function apEscrito(x, R) {
  const D = apDatos(x, R), { h, S, c } = D, p = h ? (x.personas || []).find((q) => q.id === h.id) || {} : {};
  const ph = (v, e) => (v != null && String(v).trim() ? String(v).trim() : `[${e}]`);
  const F = "[fecha]", lugar = (typeof despachoContacto === "function" ? despachoContacto().localidad : "") || "[localidad]";
  const org = x.ccaa === "EST" ? "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA" : `LA OFICINA GESTORA DEL IMPUESTO SOBRE SUCESIONES · ${typeof nombreTerr === "function" ? nombreTerr(x.ccaa) : x.ccaa}`;
  if (!S) return `A ${org}\n\nAsunto: solicitud de aplazamiento o fraccionamiento del Impuesto sobre Sucesiones.\n\n[REVISIÓN OBLIGATORIA POR ABOGADO: con los datos actuales no hay importe que aplazar; completa la liquidez y el importe en Impuestos › Aplazamiento.]`;
  const reg = S.regimen, frac = S.modo === "fraccionamiento";
  const tabla = esrTabla(["Plazo", "Vencimiento", "Principal", "Intereses estimados", "Total"], S.filas.map((f) => [String(f.n), fechaLarga(f.vencimiento), eur(f.principal), eur(f.interes), eur(f.total)]));
  return `A ${org}\n\nAsunto: solicitud de ${frac ? "fraccionamiento" : "aplazamiento"} del pago del Impuesto sobre Sucesiones (art. 65 de la Ley 58/2003, General Tributaria, y arts. 44 a 54 del Reglamento General de Recaudación, RD 939/2005${reg.id !== "general" ? "; " + reg.norma : ""}).\n\nCausante: ${ph(x.nombre, "nombre del causante")}, NIF ${ph(x.nifCausante, "NIF del causante")}, fallecido el ${x.fecha ? fechaLarga(x.fecha) : "[fecha de fallecimiento]"}.\n\n${ph(p.nombre || (h && h.nombre), "nombre del obligado")}, con NIF ${ph(p.nif, "NIF")} y domicilio a efectos de notificaciones en ${ph(p.domicilio, "domicilio")}, en su condición de sujeto pasivo del Impuesto sobre Sucesiones por la herencia indicada,\n\nEXPONE\n\nPrimero. Que en esta misma fecha presenta la autoliquidación del Impuesto sobre Sucesiones (modelo ${ph((fsPresDe(x, "ISD:" + (h && h.id)) || {}).modelo, "650")}), de la que resulta una cuota a ingresar de ${eur(D.cuota)}, dentro del plazo de presentación, que termina el ${fechaLarga(S.finVoluntario)}.\n\nSegundo. Que su situación económico-financiera le impide de forma transitoria efectuar el pago en plazo: ${ph(c.motivo, "motivos: el caudal relicto está formado principalmente por inmuebles y no hay dinero efectivo ni bienes de fácil realización suficientes para el pago")}. La liquidez que recibe de la herencia asciende a ${eur(D.liquidez)}${D.liquidez > 0 ? ", que se aplica al pago de la parte no aplazada" : ""}.\n\nTercero. Que la deuda cuyo ${frac ? "fraccionamiento" : "aplazamiento"} se solicita asciende a ${eur(S.importe)}.\n\nCuarto. Garantía. ${S.dispensa ? `El importe total de las deudas pendientes del solicitante (${eur(S.deudaTotal)}) no supera el límite de 50.000 euros, por lo que no procede aportar garantía (art. 82.2.a de la Ley General Tributaria y Orden HFP/583/2023).` : `Se ofrece como garantía ${S.garantia === "aval" ? "aval solidario de entidad de crédito o certificado de seguro de caución" : "[describir la garantía: hipoteca, prenda u otra]"}, por importe de ${eur(S.importeGarantia)} (deuda, intereses y un 25 % más, art. 48.3 RGR)${S.garantia === "aval" ? ", y se acompaña el compromiso expreso de la entidad de formalizarlo si se concede lo solicitado" : ""}.`}\n\nQuinto. Plazos propuestos:\n\n${tabla}\n\nIntereses estimados al tipo del ${String(Math.round(S.tipo * 1e6) / 1e4).replace(".", ",")} % (${S.garantia === "aval" ? "interés legal del dinero, art. 26.6 LGT" : "interés de demora"}), computados conforme al art. 53 RGR. Total: ${eur(S.total)}.\n\nSexto. Orden de domiciliación bancaria de los pagos en la cuenta ${ph(c.cuenta, "IBAN de la cuenta de cargo")}, de la que el solicitante es titular (art. 46.2.f RGR).\n\nSOLICITA\n\nQue se conceda el ${frac ? "fraccionamiento" : "aplazamiento"} del pago en los términos propuestos o en los que la Administración considere adecuados.\n\nDocumentación que se acompaña: autoliquidación del impuesto; justificación de la falta de liquidez transitoria${S.dispensa ? "" : "; compromiso de garantía"}; [otros documentos].\n\nEn ${lugar}, a ${F}.\n\nFdo.: ${ph(p.nombre || (h && h.nombre), "nombre del obligado")}\n\n[REVISIÓN OBLIGATORIA POR ABOGADO: comprobar el formulario o el procedimiento telemático propio de la comunidad y su normativa de recaudación; si se pide el aplazamiento especial del art. 38 de la Ley 29/1987, justificar la falta de dinero en el caudal relicto. ${reg.estado === "PENDIENTE" ? "El régimen elegido está en verificación: " + reg.nota + ". " : ""}Los vencimientos definitivos los fija el acuerdo de concesión.]`;
}

if (typeof document !== "undefined") {
  const fsExp = () => (typeof exp === "function" ? exp() : null);
  const fsPuede = () => { if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); return false; } return true; };
  const fsListo = (x, txt) => { if (txt) anotar(x, txt, "nota"); guardar(); if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); render(); };
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest("[data-fs]") : null; if (!b) return;
    const app = document.getElementById("app"); if (!app || !app.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    const x = fsExp(); if (!x) return;
    const a = b.dataset.fs;
    if (a === "editar") { FS_.edit = b.dataset.clave; FS_.nuevo = false; render(); setTimeout(() => document.getElementById("fs-f")?.focus(), 0); return; }
    if (a === "nuevo") { FS_.nuevo = true; FS_.edit = ""; render(); setTimeout(() => document.getElementById("fq-f")?.focus(), 0); return; }
    if (a === "cancelar") { FS_.edit = ""; FS_.nuevo = false; render(); return; }
    if (!fsPuede()) return;
    if (a === "hecho") { const s = (x.tramites = x.tramites || {}); const t = (s[b.dataset.tid] = s[b.dataset.tid] || {}); t.estado = t.estado === "hecho" ? "pend" : "hecho"; fsListo(x, ""); return; }
    if (a === "borrarPres") { const p = fsPres(x).find((q) => q.id === b.dataset.id); x.presentaciones = fsPres(x).filter((q) => q.id !== b.dataset.id); FS_.edit = ""; fsListo(x, p ? `Presentación quitada: ${FS_TRIB[p.tributo] || p.tributo}` : ""); return; }
    if (a === "borrarProc") { const q = fsProcs(x).find((z) => z.id === b.dataset.id); x.procedimientos = fsProcs(x).filter((z) => z.id !== b.dataset.id); fsListo(x, q ? `Notificación quitada: ${(PROC_TIPOS.find(([k]) => k === q.tipo) || [, q.tipo])[1]}` : ""); return; }
  }, true);
  document.addEventListener("submit", (e) => {
    const f = e.target && e.target.closest ? e.target.closest("[data-fsf]") : null; if (!f) return;
    e.preventDefault(); e.stopPropagation();
    const x = fsExp(); if (!x || !fsPuede()) return;
    const v = (k) => (f.elements[k] ? String(f.elements[k].value || "").trim() : "");
    if (f.dataset.fsf === "pres") {
      const clave = f.dataset.clave, [tributo, sujeto] = clave.split(":");
      if (!fsF(v("fecha"))) { toast("Indica la fecha de presentación"); f.elements.fecha.focus(); return; }
      const prev = fsPresDe(x, clave), p = { id: prev ? prev.id : uid(), clave, tributo, sujeto, fecha: v("fecha"), modelo: v("modelo"), justificante: v("justificante"), nrc: v("nrc"), importe: v("importe") === "" ? "" : num(v("importe")), medio: v("medio"), pago: v("pago"), fechaPago: fsF(v("fechaPago")), nota: v("nota") };
      x.presentaciones = fsPres(x).filter((q) => q.clave !== clave).concat(p);
      // Sucesiones o plusvalía presentados: el trámite del catálogo queda hecho cuando todo lo de ese impuesto está anotado
      const tid = tributo === "ISD" ? "isd" : tributo === "IIVTNU" ? "plusvalia" : "";
      if (tid && fsObligaciones(x, calcular(x)).filter((o) => o.tributo === tributo).every((o) => fsPresDe(x, o.clave))) { x.tramites = x.tramites || {}; x.tramites[tid] = { ...(x.tramites[tid] || {}), estado: "hecho" }; }
      FS_.edit = "";
      fsListo(x, `Presentado: ${FS_TRIB[tributo]}${sujeto ? " · " + fsSujetoNombre(x, tributo, sujeto) : ""} el ${fechaCorta(p.fecha)}${p.nrc ? " (NRC " + p.nrc + ")" : ""}`);
      toast("Presentación anotada"); return;
    }
    if (f.dataset.fsf === "proc") {
      if (!fsF(v("fechaNot"))) { toast("Indica la fecha de notificación"); f.elements.fechaNot.focus(); return; }
      const clave = v("clave"), q = { id: uid(), clave, tributo: clave.split(":")[0], tipo: v("tipo"), fechaNot: v("fechaNot"), organo: v("organo"), dias: Math.max(1, Math.round(num(v("dias")) || 10)), importe: v("importe") === "" ? "" : num(v("importe")), ref: v("ref"), estado: "abierto", creado: new Date().toISOString() };
      const P = fsPlazos(x, q); if (!P) { toast("No se han podido calcular los plazos"); return; }
      x.procedimientos = fsProcs(x).concat(q); FS_.nuevo = false;
      const pr = P.plazos.filter((z) => z.id !== "tpc").sort((a, b) => a.limite.localeCompare(b.limite))[0];
      fsListo(x, `Notificación: ${P.nombre} (${FS_TRIB[q.tributo] || q.tributo}) del ${fechaCorta(q.fechaNot)}${pr ? ` · ${pr.nombre} hasta el ${fechaCorta(pr.limite)}` : ""}`);
      toast(pr ? `${pr.nombre}: hasta el ${fechaCorta(pr.limite)}` : "Notificación anotada"); return;
    }
  }, true);
  document.addEventListener("change", (e) => {
    const el = e.target; if (!el || !el.closest) return;
    const app = document.getElementById("app"); if (!app || !app.contains(el)) return;
    const x = fsExp(); if (!x) return;
    if (el.dataset.fsmuni) { if (!fsPuede()) return; x.muniPlazos = el.value || ""; fsListo(x, el.value ? `Calendario de plazos: festivos locales de ${el.selectedOptions[0]?.textContent || el.value}` : ""); return; }
    if (el.dataset.fsest) { if (!fsPuede()) return; const q = fsProcs(x).find((z) => z.id === el.dataset.fsest); if (!q) return; q.estado = el.value; fsListo(x, `Notificación ${(FS_ESTADOS.find(([k]) => k === el.value) || [, el.value])[1].toLowerCase()}: ${(PROC_TIPOS.find(([k]) => k === q.tipo) || [, q.tipo])[1]}`); return; }
    if (el.dataset.ap) { if (!fsPuede()) return; const k = el.dataset.ap; x.aplazamiento = { ...apCfg(x), [k]: ["liquidez", "importe", "otrasDeudas"].includes(k) ? (el.value.trim() === "" ? "" : num(el.value)) : ["plazos", "periodicidad"].includes(k) ? Math.max(1, Math.round(num(el.value)) || 1) : el.value }; if (k === "heredero") { delete x.aplazamiento.liquidez; delete x.aplazamiento.importe; } if (k === "modo" || k === "periodicidad" || k === "heredero") delete x.aplazamiento.primerVencimiento; guardar(); render(); }
  }, true);
}
