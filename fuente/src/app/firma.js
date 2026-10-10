// ───────────────────── {{MARCA}} · Listo para firmar (Piloto 8 · firma.js · prefijo vf / VF_) ─────────────────────
// Tres piezas para la última milla antes de la notaría y de la autoliquidación:
//   validarFirma(x, R)        → { listo, bloqueos, avisos, ok, items } · cada elemento { id, grupo, sev, titulo, detalle, accion, enlace, norma, estado, dec?, foco? }
//   tFirma(x, R)              → pestaña "Listo para firmar" (comprobación agrupada + datos para la escritura + hoja del 650)
//   paqueteNotaria(x, R)      → PDF único para la notaría (pdfDocumento) · paqueteResumenTexto(x, R) → texto del correo
//   hoja650(x, R)             → en modelos.js: fichas del 650 por heredero casilla a casilla, según el formulario de cada territorio
//   vfResumen(x, R)           → tarjeta compacta para el Resumen · vfItems(x, R) → elementos para el Diagnóstico
// `enlace` es un objeto { claveDataset: valor } que el manejador general ya entiende (sec/sub, editp, editb, topen, doc, docrec).
// Las acciones propias usan [data-vf] y un único escuchador en captura registrado aquí. El software prepara; decide el abogado.
// Datos nuevos que lee: persona.nif, persona.domicilio, persona.estadoCivil · bien.refCatastral, bien.cargas ·
// x.nifCausante, x.domicilioCausante · x.firma = { notaria, email, fecha, tNotario, tFecha, tProtocolo, dec: { clave: { t, sig } } }.

const VF_GRUPOS = [["herederos", "Causante y herederos"], ["bienes", "Bienes"], ["titulos", "Títulos y certificados"], ["reparto", "Reparto"], ["impuestos", "Impuestos"]];
const VF_EC = [["soltero", "Soltero/a"], ["casado_gananciales", "Casado/a en gananciales"], ["casado_separacion", "Casado/a en separación de bienes"], ["casado", "Casado/a (otro régimen)"], ["pareja", "Pareja de hecho"], ["viudo", "Viudo/a"], ["divorciado", "Divorciado/a"], ["separado", "Separado/a legalmente"]];
const VF_CIVIL_CAUS = { gananciales: "casado/a en régimen de gananciales", separacion: "casado/a en régimen de separación de bienes", pareja: "con pareja de hecho", viudo: "viudo/a", soltero: "soltero/a", divorciado: "divorciado/a" };
const VF_I = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  av: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 6.5v7M12 17.6v.1"/></svg>',
  cp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6c0 .94.76 1.7 1.7 1.7h2.3"/></svg>',
  sello: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16.5h12l-1-3.5H7zM9.5 13l.6-4.2a3 3 0 1 1 3.8 0l.6 4.2"/></svg>',
};

// ── Utilidades ──
const vfInm = (b) => b.tipo === "vivienda" || b.tipo === "inmueble";
const vfNomB = (b) => b.descripcion || (TIPO_BIEN[b.tipo] ? TIPO_BIEN[b.tipo][0] : "Bien");
const vfNomP = (p) => (p.nombre || "").trim() || (RELACIONES[p.relacion] ? RELACIONES[p.relacion].label : "Persona");
const vfEdadVale = (p) => p.edad !== "" && p.edad != null && !isNaN(num(p.edad));
const vfDoc = (x, id) => !!(x.despacho && x.despacho.docs && x.despacho.docs[id]);
const vfTr = (x, id) => { const s = x.tramites && x.tramites[id]; return !!(s && (s.estado === "hecho" || s.estado === "na")); };
const vfF = (x) => x.firma || {};
const vfDec = (x, k) => (x.firma && x.firma.dec && x.firma.dec[k]) || null;
const vfEC = (k) => (VF_EC.find((e) => e[0] === k) || [k, k || ""])[1];
const vfFmt = (n) => { const v = Math.round((Number(n) || 0) * 100) / 100; return (v < 0 ? "-" : "") + Math.abs(v).toFixed(2).replace(".", ","); }; // formato del formulario: 1234,56
const vfFmtK = (k) => String(Math.round(k * 10000) / 10000).replace(".", ",");
const vfPh = (v, ph) => (v != null && String(v).trim() ? String(v).trim() : `[${ph}]`);
const vfEurPdf = (n) => (typeof pdfEur === "function" ? pdfEur(n) : eur(n || 0));
const vfPlural = (n, s, p) => `${n} ${n === 1 ? s : p || s + "s"}`;
const vfSig = (o) => JSON.stringify(o);

// NIF de persona física o entidad: DNI (8 cifras + letra), NIE (X/Y/Z), K/L/M y CIF. Letra de control: resto de 23 (RD 1553/2005, Orden EHA/451/2008).
function vfNif(s) {
  const v = String(s || "").toUpperCase().replace(/[\s.\-/]/g, "");
  if (!v) return { ok: false, vacio: true, v };
  const L = "TRWAGMYFPDXBNJZSQVHLCKE";
  let m = /^(\d{8})([A-Z])$/.exec(v);
  if (m) return { ok: L[Number(m[1]) % 23] === m[2], v, tipo: "DNI" };
  m = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
  if (m) return { ok: L[Number("XYZ".indexOf(m[1]) + m[2]) % 23] === m[3], v, tipo: "NIE" };
  m = /^([KLM])(\d{7})([A-Z])$/.exec(v);
  if (m) return { ok: L[Number(m[2]) % 23] === m[3], v, tipo: "NIF" };
  m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(v);
  if (m) {
    let s2 = 0; for (let i = 0; i < 7; i++) { const d = Number(m[2][i]); if (i % 2) s2 += d; else { const t = d * 2; s2 += Math.floor(t / 10) + (t % 10); } }
    const c = (10 - (s2 % 10)) % 10; return { ok: m[3] === String(c) || m[3] === "JABCDEFGHI"[c], v, tipo: "CIF" };
  }
  return { ok: false, v, formato: true };
}
// Referencia catastral: 20 caracteres (14 de finca y parcela + 4 de cargo + 2 de control). Solo se comprueba el formato.
// Los dos caracteres de control NO se validan: el algoritmo no se ha localizado en una fuente oficial de la Dirección
// General del Catastro (solo en blogs), así que queda PENDIENTE (P10, H55). La app pide cotejarla en la Sede del Catastro.
function vfRC(s) {
  const v = String(s || "").toUpperCase().replace(/[\s\-.]/g, "");
  if (!v) return { ok: false, vacio: true, v };
  if (/^[0-9A-Z]{14}$/.test(v)) return { ok: false, corta: true, v };
  return { ok: /^[0-9A-Z]{14}\d{4}[A-Z]{2}$/.test(v), v };
}
// Solicitud a un tercero (banco, gestora) ya contestada: lectura defensiva de x.solicitudes
function vfSol(x, b) {
  const L = Array.isArray(x.solicitudes) ? x.solicitudes : [];
  const n = (vfNomB(b) || "").toLowerCase();
  return L.some((s) => {
    if (!s || !/recib|contest|complet/i.test(String(s.estado || ""))) return false;
    if (s.bienId === b.id || s.bien === b.id || (Array.isArray(s.bienes) && s.bienes.includes(b.id)) || (Array.isArray(s.bienIds) && s.bienIds.includes(b.id))) return true;
    const t = String((s.tercero && s.tercero.nombre) || "").toLowerCase().trim();
    return t.length > 3 && n.includes(t);
  });
}
// Quién compensa a quién por los excesos de adjudicación: del cuadro único (cuadroParticion, particion.js)
function vfCompensaciones(PT, x, R) {
  const C = x && typeof cuadroParticion === "function" ? cuadroParticion(x, R) : null;
  return C ? C.compensaciones.map((c) => ({ de: c.de, a: c.a, importe: c.importe })) : [];
}
const vfPlazo = (R, id) => (R && R.plazos ? R.plazos.find((p) => p.id === id) : null);

// ───────────────────── 1. Validador ─────────────────────
function validarFirma(x, R) {
  if (R === undefined) R = calcular(x);
  const L = [];
  const add = (o) => { const it = { sev: "aviso", estado: o.norma ? "VERIFICADO" : "", ...o }; L.push(it); return it; };
  const F = vfF(x), pers = x.personas || [], bienes = x.bienes || [], vivos = pers.filter((p) => !p.renuncia);
  const h = hoy();

  // ── Causante y herederos ──
  {
    const nc = vfNif(x.nifCausante), falta = [];
    if (nc.vacio) falta.push("NIF"); if (!String(x.domicilioCausante || "").trim()) falta.push("último domicilio");
    if (!falta.length && nc.ok) add({ id: "vf-causante", grupo: "herederos", sev: "ok", titulo: `Causante: ${x.nombre || "—"}`, detalle: `NIF ${nc.v} · ${x.domicilioCausante}` });
    else add({ id: "vf-causante", grupo: "herederos", sev: "aviso", titulo: `Causante: ${!nc.vacio && !nc.ok ? "NIF con letra de control incorrecta" : "falta " + falta.join(" y ")}`, detalle: "El NIF del causante se pide en la escritura y en el modelo 650; el último domicilio fija la notaría competente para el acta y la normativa del impuesto.", accion: "Completar", foco: !nc.vacio && !nc.ok || nc.vacio ? "vf-x-nifCausante" : "vf-x-domicilioCausante" });
  }
  if (!vivos.length) add({ id: "vf-sin-herederos", grupo: "herederos", sev: "bloqueo", titulo: "No hay herederos que acepten", detalle: "Sin otorgantes no hay escritura de aceptación y adjudicación.", accion: "Añadir herederos", enlace: { sec: "herencia" } });
  for (const p of vivos) {
    const n = vfNomP(p), nif = vfNif(p.nif), falta = [], bl = [];
    if (!(p.nombre || "").trim()) { falta.push("nombre"); bl.push(1); }
    if (nif.vacio) { falta.push("NIF"); bl.push(1); }
    if (!String(p.estadoCivil || "").trim()) falta.push("estado civil");
    if (!String(p.domicilio || "").trim()) falta.push("domicilio");
    if (!vfEdadVale(p)) falta.push("edad");
    const malNif = !nif.vacio && !nif.ok;
    if (!falta.length && !malNif) { add({ id: "vf-p-" + p.id, grupo: "herederos", sev: "ok", titulo: n, detalle: `${nif.tipo || "NIF"} ${nif.v} · ${vfEC(p.estadoCivil)} · ${p.domicilio}`, enlace: { editp: p.id } }); continue; }
    const tit = malNif ? `${n}: NIF ${nif.v} no válido${falta.length ? "; falta " + falta.join(", ") : ""}` : `${n}: falta ${falta.join(", ").replace(/, ([^,]*)$/, " y $1")}`;
    add({ id: "vf-p-" + p.id, grupo: "herederos", sev: bl.length || malNif ? "bloqueo" : "aviso", titulo: tit, detalle: malNif ? (nif.formato ? "El formato no corresponde a un DNI, NIE ni NIF." : "La letra de control no corresponde al número. Revisa el documento de identidad.") : "La escritura identifica a cada otorgante con nombre, documento de identidad, estado civil y domicilio.", norma: "art. 156 Reglamento Notarial", estado: "PENDIENTE", accion: "Completar", foco: `vf-p-${p.id}-${nif.vacio || malNif ? "nif" : !String(p.estadoCivil || "").trim() ? "estadoCivil" : !String(p.domicilio || "").trim() ? "domicilio" : "nif"}`, enlace: { editp: p.id } });
  }
  for (const p of vivos.filter((q) => vfEdadVale(q) && num(q.edad) < 18)) {
    const k = "menor-" + p.id, res = vfTr(x, "menores") || vfDec(x, k);
    add({ id: "vf-" + k, grupo: "herederos", sev: res ? "ok" : "bloqueo", titulo: res ? `${vfNomP(p)}: representación del menor resuelta` : `${vfNomP(p)} es menor de edad`, detalle: "Si su padre o su madre también heredan hay conflicto de intereses y hace falta defensor judicial (art. 163 CC); la partición hecha con defensor necesita aprobación judicial (art. 1060 CC). Para renunciar en su nombre, autorización judicial (art. 166 CC).", norma: "arts. 163, 166 y 1060 CC", estado: "VERIFICADO", accion: "Ver trámite", enlace: { topen: "menores" }, dec: { k, txt: res ? "Deshacer" : "Representación resuelta" } });
  }
  for (const p of vivos.filter((q) => num(q.discapacidad) >= 33)) {
    const k = "apoyos-" + p.id, res = vfTr(x, "apoyos") || vfDec(x, k);
    add({ id: "vf-" + k, grupo: "herederos", sev: res ? "ok" : "aviso", titulo: res ? `${vfNomP(p)}: medidas de apoyo revisadas` : `${vfNomP(p)}: comprobar si tiene medidas de apoyo`, detalle: "Con curatela representativa, el curador necesita autorización judicial para repudiar o aceptar sin beneficio de inventario, y la partición se aprueba después judicialmente. Con apoyo asistencial firma el heredero asistido.", norma: "arts. 287 y 289 CC", estado: "PENDIENTE", accion: "Ver trámite", enlace: { topen: "apoyos" }, dec: { k, txt: res ? "Deshacer" : "Sin medidas representativas" } });
  }
  for (const p of pers.filter((q) => q.renuncia)) {
    const k = "renuncia-" + p.id, doc = vfDoc(x, "renuncia") || vfTr(x, "renuncia"), d = vfDec(x, k);
    add({ id: "vf-" + k, grupo: "herederos", sev: doc || d ? "ok" : "bloqueo", titulo: doc ? `${vfNomP(p)}: renuncia formalizada` : d ? `${vfNomP(p)}: renuncia en la misma escritura` : `${vfNomP(p)} renuncia: falta formalizarla`, detalle: "La renuncia solo vale en instrumento público ante notario y es irrevocable; debe hacerse antes de cualquier acto que suponga aceptar.", norma: "arts. 1008 y 999 CC", estado: "VERIFICADO", accion: doc ? "" : "Escritura recibida", enlace: doc ? null : { docrec: "renuncia" }, dec: doc ? null : { k, txt: d ? "Deshacer" : "Se otorga en la misma escritura" } });
  }

  // ── Bienes ──
  if (!bienes.length) add({ id: "vf-sin-bienes", grupo: "bienes", sev: "bloqueo", titulo: "El inventario está vacío", detalle: "Sin bienes no hay nada que adjudicar.", accion: "Añadir bienes", enlace: { sec: "herencia" } });
  for (const b of bienes) {
    const n = vfNomB(b);
    if (!num(b.valor) && !(vfInm(b) && num(b.valorReferencia))) { add({ id: "vf-bv-" + b.id, grupo: "bienes", sev: "bloqueo", titulo: `${n}: sin valor`, detalle: "Cada bien se describe y valora en la escritura y en el modelo 660.", accion: "Abrir bien", enlace: { editb: b.id } }); continue; }
    if (vfInm(b)) {
      const rc = vfRC(b.refCatastral), falta = [], decVR = vfDec(x, "sinvr-" + b.id), decCg = String(b.cargas || "").trim();
      if (rc.vacio) falta.push("referencia catastral");
      if (!num(b.valorReferencia) && !decVR) falta.push("valor de referencia");
      const malRC = !rc.vacio && !rc.ok;
      const sev = rc.vacio || (!num(b.valorReferencia) && !decVR) ? "bloqueo" : malRC ? "aviso" : "ok";
      if (sev === "ok") add({ id: "vf-bi-" + b.id, grupo: "bienes", sev, titulo: n, detalle: `Ref. catastral ${rc.v} (formato correcto; los caracteres de control se cotejan en la Sede del Catastro) · valor de referencia ${num(b.valorReferencia) ? eur(num(b.valorReferencia)) : "sin publicar (decisión registrada)"}`, enlace: { editb: b.id }, dec: decVR ? { k: "sinvr-" + b.id, txt: "Deshacer" } : null });
      else add({ id: "vf-bi-" + b.id, grupo: "bienes", sev, titulo: malRC ? `${n}: referencia catastral ${rc.corta ? "incompleta (14 de 20 caracteres)" : "con formato incorrecto"}` : `${n}: falta ${falta.join(" y ")}`, detalle: rc.vacio || malRC ? "La referencia catastral identifica la finca en la escritura y en el 660, y es la que se consulta en la Sede del Catastro para el valor de referencia." : "El valor de referencia a la fecha del fallecimiento es el mínimo de la base imponible del inmueble.", norma: rc.vacio || malRC ? "art. 38 TRLCI (RDLeg 1/2004)" : "art. 9.3 Ley 29/1987", estado: rc.vacio || malRC ? "PENDIENTE" : "VERIFICADO", accion: "Completar", foco: rc.vacio || malRC ? `vf-b-${b.id}-refCatastral` : null, enlace: rc.vacio || malRC ? null : { editb: b.id }, dec: !rc.vacio && !malRC && !num(b.valorReferencia) ? { k: "sinvr-" + b.id, txt: "No tiene valor de referencia publicado" } : null });
      // Valor declarado frente al valor de referencia
      if (num(b.valorReferencia) && num(b.valor) && num(b.valor) < num(b.valorReferencia) - 0.5) {
        const k = "vref-" + b.id, d = vfDec(x, k);
        add({ id: "vf-" + k, grupo: "bienes", sev: d ? "ok" : "aviso", titulo: d ? `${n}: se declara el valor de referencia` : `${n}: valor declarado inferior al de referencia`, detalle: `Valor en el expediente ${eur(num(b.valor))}; valor de referencia ${eur(num(b.valorReferencia))}. El impuesto se calcula sobre el de referencia salvo que se impugne; la escritura debe recoger el valor que se declara.`, norma: "art. 9.3 Ley 29/1987", estado: "VERIFICADO", accion: "Abrir bien", enlace: { editb: b.id }, dec: { k, txt: d ? "Deshacer" : "Declarar el valor de referencia" } });
      }
      // Cargas
      add({ id: "vf-cg-" + b.id, grupo: "bienes", sev: decCg ? "ok" : "aviso", titulo: decCg ? `${n}: ${decCg.length > 70 ? decCg.slice(0, 68) + "…" : decCg}` : `${n}: cargas sin anotar`, detalle: decCg ? "Cargas según el expediente." : vfDoc(x, "esc_" + b.id) ? "Anota las cargas que figuran en la nota simple (hipoteca, embargos, servidumbres) o confirma que está libre." : "Pide la nota simple para conocer las cargas vigentes y anótalas, o confirma que está libre.", norma: decCg ? "" : "arts. 221-222 Ley Hipotecaria", estado: decCg ? "" : "VERIFICADO", accion: decCg ? "" : "Anotar cargas", foco: decCg ? null : `vf-b-${b.id}-cargas`, dec: decCg ? null : { k: "libre-" + b.id, txt: "Libre de cargas", act: "libre" } });
    } else if (b.tipo === "cuenta" || b.tipo === "valores") {
      const id = "cert_" + b.id, ok = vfDoc(x, id) || vfSol(x, b);
      add({ id: "vf-cert-" + b.id, grupo: "bienes", sev: ok ? "ok" : "bloqueo", titulo: ok ? `${n}: certificado recibido` : `${n}: falta el certificado ${b.tipo === "cuenta" ? "de saldos" : "de posición"}`, detalle: ok ? `Valor a la fecha del fallecimiento: ${eur(num(b.valor))}.` : "La escritura y el 660 recogen el saldo o la valoración a la fecha del fallecimiento según certificado de la entidad.", norma: ok ? "" : "art. 9 Ley 29/1987", estado: ok ? "" : "VERIFICADO", accion: ok ? "" : "Marcar recibido", enlace: ok ? null : { docrec: id } });
    } else if (b.tipo === "vehiculo") {
      const ok = vfDoc(x, "veh_" + b.id);
      add({ id: "vf-veh-" + b.id, grupo: "bienes", sev: ok ? "ok" : "aviso", titulo: ok ? `${n}: documentación recibida` : `${n}: falta permiso de circulación y ficha técnica`, detalle: "Para identificarlo en la escritura y valorarlo con las tablas de Hacienda.", accion: ok ? "" : "Marcar recibido", enlace: ok ? null : { docrec: "veh_" + b.id } });
    }
  }
  const hip = (x.deudas || []).filter((d) => num(d.importe) > 0 && /hipot/i.test(d.concepto || ""));
  if (hip.length && !bienes.some((b) => vfInm(b) && /hipot/i.test(b.cargas || ""))) add({ id: "vf-hipoteca", grupo: "bienes", sev: "aviso", titulo: `Hipoteca de ${eur(hip.reduce((s, d) => s + num(d.importe), 0))} sin asociar a un inmueble`, detalle: "La deuda se descuenta del caudal, pero la escritura debe decir qué finca grava y quién asume el préstamo.", accion: "Anotar cargas", foco: (() => { const b = bienes.find(vfInm); return b ? `vf-b-${b.id}-cargas` : null; })() });
  // G04: liquidación del régimen económico con reglas forales en verificación (bloquea hasta que el abogado la confirma) y reintegros sin justificar
  { const LQ = R && R.isd && R.isd.masa.liquidacion, RG = LQ && LQ.regimen;
    if (LQ && !LQ.defecto && RG && RG.estado === "PENDIENTE") add({ id: "vf-regimen", grupo: "bienes", sev: x.regimen && x.regimen.confirmado ? "ok" : "bloqueo", titulo: x.regimen && x.regimen.confirmado ? `${RG.nombre}: liquidación revisada por el abogado` : `${RG.nombre}: liquidación en verificación`, detalle: `Las reglas de ${RG.norma} no están cotejadas literalmente. Revisa la tabla de liquidación y confírmala en «Régimen económico».`, norma: RG.norma, estado: "PENDIENTE", accion: "Revisar el régimen" });
    const sinJ = LQ ? LQ.reintegros.lista.filter((r) => !r.justificado) : [];
    if (sinJ.length) add({ id: "vf-reintegros", grupo: "bienes", sev: "aviso", titulo: `${sinJ.length === 1 ? "Un reintegro o reembolso" : sinJ.length + " reintegros o reembolsos"} sin justificar`, detalle: "Sin documentos que prueben el origen del dinero rige la presunción de ganancialidad (art. 1361 CC).", norma: "arts. 1358 y 1361 CC" }); }
  if (bienes.some((b) => b.titularidad === "ganancial")) add({ id: "vf-gananciales", grupo: "bienes", sev: "ok", titulo: "Liquidación de la sociedad de gananciales", detalle: "Hay bienes gananciales: la escritura liquida antes la sociedad y adjudica la mitad al cónyuge viudo.", norma: "arts. 1392 y 1396-1404 CC", estado: "VERIFICADO" });

  // ── Títulos y certificados ──
  const docOk = (id, alt) => vfDoc(x, id) || (alt && vfTr(x, alt));
  const tdoc = (id, alt, sev, tOk, tNo, det, norma, estado) => { const ok = docOk(id, alt); add({ id: "vf-d-" + id, grupo: "titulos", sev: ok ? "ok" : sev, titulo: ok ? tOk : tNo, detalle: det, norma, estado, accion: ok ? "" : "Marcar recibido", enlace: ok ? null : { docrec: id } }); };
  tdoc("defuncion", "defuncion", "bloqueo", "Certificado de defunción", "Falta el certificado de defunción", "Acredita el fallecimiento y su fecha, que fija la ley aplicable y los plazos.");
  tdoc("ultimas", "ultimas", "bloqueo", "Certificado de últimas voluntades", "Falta el certificado de últimas voluntades", "El notario lo exige para comprobar cuál es el último testamento o que no lo hay.", "Reglamento Notarial, anexo II", "PENDIENTE");
  if (x.testamento === "nose") add({ id: "vf-t-nose", grupo: "titulos", sev: "bloqueo", titulo: "No consta si hay testamento", detalle: "El título sucesorio decide quiénes firman y con qué cuotas. Confírmalo con el certificado de últimas voluntades.", accion: "Indicar", enlace: { act: "editar" } });
  else if (x.testamento === "no") tdoc("declaracion", "declaracion", "bloqueo", "Acta de declaración de herederos", "Falta el acta de declaración de herederos", "Sin testamento, el título sucesorio es el acta notarial de declaración de herederos abintestato.", "arts. 55-56 Ley del Notariado", "VERIFICADO");
  else tdoc("testamento", "testamento", "bloqueo", "Copia autorizada del testamento", "Falta la copia autorizada del testamento", "Es el título sucesorio: se protocoliza o testimonia en la escritura.", "art. 226 Reglamento Notarial", "VERIFICADO");
  tdoc("seguros", "seguros_cert", "aviso", "Certificado de contratos de seguros", "Falta el certificado de seguros de fallecimiento", "Necesario para declarar los seguros de vida en el impuesto.");
  if (x.civil === "gananciales" || x.civil === "separacion") tdoc("matrimonio", "", "aviso", "Certificado de matrimonio", "Falta el certificado de matrimonio", x.civil === "separacion" ? "Con las capitulaciones, acredita el régimen económico." : "Acredita el régimen de gananciales que se liquida.");
  tdoc("dni", "", "aviso", "Documentos de identidad de los herederos", "Faltan copias de los documentos de identidad", "El notario identifica a cada otorgante con su documento original el día de la firma.");
  tdoc("libro", "", "aviso", "Libro de familia", "Falta el libro de familia", "Acredita el parentesco, que decide el grupo y las reducciones del impuesto.");
  // Documentación de los bienes y del pasivo (P10, H35). Bloquea solo lo que cambia una cifra de la escritura o del 650.
  for (const b of bienes.filter(vfInm)) {
    const n = vfNomB(b);
    tdoc("esc_" + b.id, "", "aviso", `${n}: nota simple o escritura`, `${n}: falta la nota simple`, "Da la titularidad y las cargas vigentes. La notaría obtiene por su cuenta la información registral antes de autorizar, así que no impide la firma, pero conviene conocer las cargas antes de cerrar la partición.", "art. 175 Reglamento Notarial", "PENDIENTE");
    tdoc("ibi_" + b.id, "", "aviso", `${n}: último recibo del IBI`, `${n}: falta el último recibo del IBI`, "Acredita la referencia catastral ante el notario y da los valores catastrales de la plusvalía. Si falta, la escritura se autoriza igual y el notario deja constancia.", "arts. 38, 41 y 44 TRLCI (RDLeg 1/2004)", "PENDIENTE");
  }
  if ((x.deudas || []).some((d) => num(d.importe) > 0)) tdoc("deudas", "", "bloqueo", "Certificado de la deuda a la fecha del fallecimiento", "Falta el certificado de la deuda pendiente (hipoteca o préstamos)", "Las deudas solo se restan si se acreditan con documento; el saldo a la fecha del fallecimiento es la cifra del pasivo en la escritura y en el modelo 650.", "art. 13 Ley 29/1987", "VERIFICADO");
  if ((x.gastos || []).some((g) => num(g.importe) > 0)) tdoc("facturas", "", "aviso", "Facturas del funeral y de la última enfermedad", "Faltan las facturas del funeral", "Los gastos de entierro y funeral solo se deducen si se justifican. No impiden la firma; sin ellas, el gasto no se resta en el impuesto.", "art. 14.b Ley 29/1987", "VERIFICADO");

  // ── Reparto ──
  if (!R) add({ id: "vf-sin-calculo", grupo: "reparto", sev: "bloqueo", titulo: "Faltan datos para calcular el reparto", detalle: "Completa fecha, comunidad, herederos y bienes.", accion: "Completar datos", enlace: { act: "editar" } });
  else {
    let PT = null; try { PT = particion(x, R); } catch (e) { PT = null; }
    if (x.testamento === "porcentajes") {
      const s = vivos.reduce((a, p) => a + num(p.pct), 0);
      if (vivos.some((p) => num(p.pct) > 0) && Math.abs(s - 100) > 0.01) add({ id: "vf-pct", grupo: "reparto", sev: "bloqueo", titulo: `Las cuotas del testamento suman ${grp(s, s % 1 ? 2 : 0)} %`, detalle: "Las cuotas de los herederos que aceptan deben sumar el 100 %. Revisa el testamento y las renuncias (derecho de acrecer, sustituciones).", norma: "arts. 981-987 CC", estado: "VERIFICADO", accion: "Herederos", enlace: { sec: "herencia" } });
    }
    if (PT && PT.H.length) {
      const sAdj = PT.H.reduce((a, q) => a + q.adjud, 0), sHab = PT.H.reduce((a, q) => a + q.haber, 0);
      if (Math.abs(sAdj - sHab) > 1) add({ id: "vf-cuadre", grupo: "reparto", sev: "bloqueo", titulo: "La partición no cuadra", detalle: `Lo adjudicado (${eur(sAdj)}) no coincide con el haber de los herederos (${eur(sHab)}): diferencia de ${eur(sAdj - sHab)}.`, norma: "arts. 1061-1062 CC", estado: "VERIFICADO", accion: "Cuadro de partición", enlace: { sec: "particion" } });
      else add({ id: "vf-cuadre", grupo: "reparto", sev: "ok", titulo: "La partición cuadra", detalle: `Adjudicado ${eur(sAdj)} = haber de los herederos ${eur(sHab)}.` });
      const exc = PT.H.filter((q) => Math.abs(q.dif) > 1);
      if (exc.length) {
        const C = cuadroParticion(x, R), FL = vfCompensaciones(PT, x, R), sig = vfSig(FL.map((f) => [f.de.id, f.a.id, Math.round(f.importe)])), d = vfDec(x, "compensacion"), vale = d && d.sig === sig;
        const txt = FL.map((f) => `${vfNomP(f.de)} compensa ${eur(f.importe)} a ${vfNomP(f.a)}`).join("; ");
        const trib = C ? C.excesos.map((e) => `Exceso de ${e.nombre}: ${eur(e.exceso)} · ${e.txtCoste}`).join(". ") : "";
        add({ id: "vf-exceso", grupo: "reparto", sev: vale ? "ok" : "bloqueo", titulo: vale ? "Excesos de adjudicación con compensación declarada" : d ? "Las compensaciones han cambiado desde que se declararon" : "Hay excesos de adjudicación sin compensación declarada", detalle: `${txt}. ${trib}. La escritura debe recoger la compensación en dinero y la indivisibilidad del bien.`, norma: (C ? C.T.ajdNorma : "art. 7.2.B TRLITPAJD") + " · art. 1062 CC", estado: C && C.pendiente ? "PENDIENTE" : "VERIFICADO", accion: "Cuadro de partición", enlace: { sec: "particion" }, dec: { k: "compensacion", sig, txt: vale ? "Deshacer" : "Declarar compensación en dinero" } });
      }
      const pro = (PT.B || []).filter((q) => q.inm && !q.adj && !q.leg && PT.cols.filter((p) => PT.cell[q.b.id][p.id]).length > 1);
      if (pro.length) add({ id: "vf-proindiviso", grupo: "reparto", sev: "ok", titulo: vfPlural(pro.length, "inmueble queda", "inmuebles quedan") + " en proindiviso", detalle: pro.map((q) => vfNomB(q.b)).join(", ") + ". Es una decisión válida; la extinción posterior del condominio tiene su propio coste.", accion: "Partición", enlace: { sec: "particion" } });
    }
    let LG = null; try { LG = typeof lgCalcular === "function" ? lgCalcular(x, R) : null; } catch (e) { LG = null; }
    if (LG) {
      const vul = (LG.herederos || []).filter((q) => q.estado === "vulnerada");
      for (const q of vul) { const k = "lg-" + q.id, d = vfDec(x, k); add({ id: "vf-" + k, grupo: "reparto", sev: d ? "ok" : "bloqueo", titulo: d ? `${q.nombre}: conformidad con su legítima registrada` : `${q.nombre}: legítima por debajo del mínimo (falta ${eur0(q.deficit || 0)})`, detalle: `Mínimo legal ${eur0(q.legitimaMinima || 0)}; recibe ${eur0(q.recibe || 0)}. Si el legitimario no consiente, puede reclamar el complemento.`, norma: q.norma || "art. 815 CC", estado: LG.estado || "VERIFICADO", accion: "Control de legítimas", enlace: { sec: "herencia" }, dec: { k, txt: d ? "Deshacer" : "Consta su conformidad" } }); }
      if (LG.colectiva && LG.colectiva.estado === "vulnerada") add({ id: "vf-lg-col", grupo: "reparto", sev: "bloqueo", titulo: "Legítima colectiva vulnerada", detalle: `Los descendientes reciben ${eur0(LG.colectiva.recibenDescendientes || 0)} frente a ${eur0(LG.colectiva.importe || 0)}.`, norma: LG.norma, estado: LG.estado, accion: "Control de legítimas", enlace: { sec: "herencia" } });
      for (const i of (LG.intangibilidad || []).slice(0, 3)) add({ id: "vf-lgi-" + (i.titulo || "").slice(0, 20), grupo: "reparto", sev: "aviso", titulo: i.titulo, detalle: i.detalle + (i.accion ? " " + i.accion : ""), norma: i.norma, estado: i.estado });
      if (!vul.length && !(LG.colectiva && LG.colectiva.estado === "vulnerada") && (LG.herederos || []).length) add({ id: "vf-lg-ok", grupo: "reparto", sev: "ok", titulo: "Legítimas cubiertas", detalle: `${LG.regimenNombre || "Código Civil"}: ningún legitimario recibe menos de su mínimo.` });
    }
  }

  // ── Impuestos ──
  if (R) {
    const pz = vfPlazo(R, "isd"), lim = pz && pz.limite, fFirma = F.fecha;
    const tot = R.isd.total;
    if (vfTr(x, "isd")) add({ id: "vf-isd", grupo: "impuestos", sev: "ok", titulo: "Sucesiones presentado", detalle: `A ingresar en total: ${eur(tot)}.` });
    else if (lim) {
      const q = dias(h, lim), tarde = fFirma && fFirma > lim;
      const rec = q < 0 && typeof dgRecargo === "function" ? dgRecargo(tot, lim, h, x.ccaa) : null;
      if (q < 0) add({ id: "vf-isd", grupo: "impuestos", sev: "aviso", titulo: `Sucesiones: plazo vencido el ${fechaCorta(lim)}`, detalle: `Presentar cuanto antes${rec && rec.importe ? `: recargo estimado ${eur(rec.importe)} (${rec.etiqueta || grp(rec.pct * 100, 0) + " %"})` : ""}. El Registro no inscribe sin acreditar la presentación del impuesto.`, norma: rec && rec.foral ? "norma general tributaria foral · art. 254 Ley Hipotecaria" : "art. 27 LGT · art. 254 Ley Hipotecaria", estado: rec && rec.foral ? "PENDIENTE" : "VERIFICADO", accion: "Ver trámite", enlace: { topen: "isd" } });
      else if (tarde) add({ id: "vf-isd", grupo: "impuestos", sev: "aviso", titulo: "La firma prevista es posterior al fin del plazo de Sucesiones", detalle: `Firma el ${fechaCorta(fFirma)}; el plazo acaba el ${fechaCorta(lim)}. Presenta antes con documento privado o pide la prórroga dentro de los cinco primeros meses.`, norma: "arts. 67-68 RD 1629/1991", estado: "VERIFICADO", accion: "Fecha de firma", foco: "vf-f-fecha" });
      else add({ id: "vf-isd", grupo: "impuestos", sev: q <= 30 ? "aviso" : "ok", titulo: `Sucesiones: presentar con la escritura antes del ${fechaCorta(lim)}`, detalle: `Quedan ${vfPlural(q, "día")}. A ingresar en total: ${eur(tot)}${fFirma ? `; firma prevista el ${fechaCorta(fFirma)}` : "; indica la fecha prevista de firma"}.`, norma: "art. 67 RD 1629/1991", estado: "VERIFICADO", accion: fFirma ? "" : "Fecha de firma", foco: fFirma ? null : "vf-f-fecha" });
    }
    if ((R.isd.pendientes || []).length) add({ id: "vf-isd-pend", grupo: "impuestos", sev: "aviso", titulo: "Sucesiones: normas pendientes de cotejo", detalle: R.isd.pendientes.slice(0, 4).join("; ") + ".", accion: "Impuestos", enlace: { sec: "impuestos" } });
    const pzP = vfPlazo(R, "plusvalia");
    for (const b of bienes.filter(vfInm)) {
      const n = vfNomB(b), r = (R.plus || []).find((q) => q.b.id === b.id);
      if (!plusCompleto(b)) { const f = []; if (!num(b.valorCatastralTotal)) f.push("valor catastral total"); if (!num(b.valorCatastralSuelo)) f.push("valor catastral del suelo"); if (!b.fechaAdq) f.push("fecha de adquisición"); add({ id: "vf-pl-" + b.id, grupo: "impuestos", sev: "aviso", titulo: `Plusvalía de ${n}: faltan datos`, detalle: `Falta ${f.join(", ")}. Sin ellos no se puede liquidar ni comprobar el método más favorable.`, norma: "art. 107 TRLRHL", estado: "VERIFICADO", accion: "Abrir bien", enlace: { editb: b.id } }); continue; }
      if (!r) continue;
      const est = r.r.estimacion && !r.r.estimacion.manual && !(r.r.estimacion.hacienda && r.r.estimacion.bonifManual), pend = est || r.r.estadoTipo === "PENDIENTE" || (r.r.porTitular || []).some((t) => t.estado === "PENDIENTE");
      add({ id: "vf-pl-" + b.id, grupo: "impuestos", sev: pend ? "aviso" : "ok", titulo: `Plusvalía de ${n}: ${r.r.noSujeto ? "no sujeta" : eur(r.r.total)}`, detalle: `${r.r.municipio}${pzP && pzP.limite ? ` · plazo hasta el ${fechaCorta(pzP.limite)}` : ""}${est && r.r.estimacion.hacienda ? ". Tipo oficial (Hacienda 2026) sin bonificación: comprueba si la ordenanza prevé alguna para herencias e introdúcela en la ficha del bien." : est ? ". Cálculo máximo con el tipo máximo legal: introduce el tipo y la bonificación de su ordenanza en la ficha del bien." : pend ? ". La ordenanza está pendiente de cotejo: confirma tipo y bonificación." : "."}`, norma: "art. 110 TRLRHL", estado: "VERIFICADO", accion: pend ? "Abrir bien" : "", enlace: pend ? { editb: b.id } : null });
    }
  }

  const bloqueos = L.filter((i) => i.sev === "bloqueo"), avisos = L.filter((i) => i.sev === "aviso"), ok = L.filter((i) => i.sev === "ok");
  return { listo: !bloqueos.length, bloqueos, avisos, ok, items: L };
}

// ───────────────────── 2. Pestaña "Listo para firmar" ─────────────────────
const vfAttrs = (en) => (en ? Object.entries(en).filter(([, v]) => v != null && v !== "").map(([k, v]) => `data-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${esc(v)}"`).join(" ") : "");
const vfChip = (e) => (e === "PENDIENTE" ? '<span class="tag P">En verificación</span>' : e === "VERIFICADO" ? '<span class="tag V">Verificado</span>' : "");
function vfNorma(t, x) { if (!t) return ""; const terr = x && (x.ccaa === "EST" ? x.ccaaBienes : x.ccaa); return typeof linkNorma === "function" ? t.split(" · ").map((n) => linkNorma(n, terr)).join(" · ") : esc(t); }
function vfFila(it, x) {
  const ic = it.sev === "ok" ? VF_I.ok : it.sev === "bloqueo" ? VF_I.no : VF_I.av;
  const btns = [];
  if (it.dec) btns.push(`<button class="btn sm ${it.sev === "ok" ? "ghost vf-undo" : "gray"}" data-vf="${it.dec.act || "dec"}" data-k="${esc(it.dec.k)}"${it.dec.sig ? ` data-sig="${esc(it.dec.sig)}"` : ""}>${esc(it.dec.txt)}</button>`);
  if (it.sev !== "ok" && it.foco) btns.push(`<button class="btn sm ${it.dec ? "gray" : "tint"}" data-vf="foco" data-id="${esc(it.foco)}">${esc(it.accion || "Completar")}</button>`);
  else if (it.sev !== "ok" && it.enlace && it.accion) btns.push(`<button class="btn sm ${it.dec ? "gray" : "tint"}" ${vfAttrs(it.enlace)}>${esc(it.accion)}</button>`);
  const meta = it.norma && it.sev !== "ok" ? `<div class="vf-meta"><span class="vf-norma">${vfNorma(it.norma, x)}</span>${vfChip(it.estado)}</div>` : "";
  const tit = it.sev === "ok" && it.enlace && (it.enlace.editp || it.enlace.editb) ? `<button class="vf-tl" ${vfAttrs(it.enlace)}>${esc(it.titulo)}</button>` : `<b>${esc(it.titulo)}</b>`;
  return `<div class="vf-row ${it.sev}"><i class="vf-ic" aria-hidden="true">${ic}</i><div class="vf-t">${tit}${it.detalle ? `<small>${esc(it.detalle)}</small>` : ""}${meta}</div>${btns.length ? `<div class="vf-acts">${btns.join("")}</div>` : ""}</div>`;
}
const vfInput = (id, attrs, val, ph, extra = "") => `<input id="${id}" ${attrs} value="${esc(val || "")}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
function vfFormDatos(x, V) {
  const F = vfF(x), vivos = (x.personas || []).filter((p) => !p.renuncia), inm = (x.bienes || []).filter(vfInm);
  const malP = (p, k) => V.items.some((i) => i.sev !== "ok" && i.foco === `vf-p-${p.id}-${k}`);
  const nifCls = (s) => (s && !vfNif(s).ok ? "vf-bad" : "");
  const test = x.testamento && x.testamento !== "no" && x.testamento !== "nose";
  const ecSel = (p) => `<select id="vf-p-${p.id}-estadoCivil" data-vfp="${p.id}" data-vfk="estadoCivil" aria-label="Estado civil de ${esc(vfNomP(p))}"><option value="">Estado civil</option>${VF_EC.map(([k, t]) => `<option value="${k}" ${p.estadoCivil === k ? "selected" : ""}>${t}</option>`).join("")}</select>`;
  return `<div class="card vf-datos">${cardH("Para la escritura", "Datos de identificación", `<span class="caption">Se guardan al salir del campo</span>`)}
    <div class="vf-fs"><div class="vf-fsh">Firma</div>
      <div class="vf-f2"><label class="vf-fl"><span>Notaría</span>${vfInput("vf-f-notaria", 'data-vff="notaria"', F.notaria, "Notaría y localidad")}</label><label class="vf-fl"><span>Fecha prevista</span><input id="vf-f-fecha" type="date" data-vff="fecha" value="${esc(F.fecha || "")}"></label></div>
      <label class="vf-fl"><span>Correo de la notaría</span>${vfInput("vf-f-email", 'data-vff="email" type="email" inputmode="email"', F.email, "oficial@notaria.es")}</label></div>
    <div class="vf-fs"><div class="vf-fsh">Causante · ${esc(x.nombre || "—")}</div>
      <div class="vf-f2"><label class="vf-fl"><span>NIF</span>${vfInput("vf-x-nifCausante", `data-vfx="nifCausante" class="${nifCls(x.nifCausante)}"`, x.nifCausante, "00000000X")}</label><label class="vf-fl"><span>Último domicilio</span>${vfInput("vf-x-domicilioCausante", 'data-vfx="domicilioCausante"', x.domicilioCausante, "Calle, número, CP y localidad")}</label></div>
      <label class="vf-fl"><span>Tratamiento en los escritos</span><select id="vf-x-generoCausante" data-vfx="generoCausante"><option value="">Sin indicar (redacción neutra)</option><option value="f" ${x.generoCausante === "f" ? "selected" : ""}>Femenino (D.ª, fallecida)</option><option value="m" ${x.generoCausante === "m" ? "selected" : ""}>Masculino (D., fallecido)</option></select></label></div>
    <div class="vf-fs"><div class="vf-fsh">${test ? "Testamento" : x.testamento === "no" ? "Acta de declaración de herederos" : "Título sucesorio"}</div>
      <div class="vf-f3"><label class="vf-fl"><span>${test ? "Notario autorizante" : "Notario del acta"}</span>${vfInput("vf-f-tNotario", 'data-vff="tNotario"', F.tNotario, "Nombre")}</label><label class="vf-fl"><span>Fecha</span><input id="vf-f-tFecha" type="date" data-vff="tFecha" value="${esc(F.tFecha || "")}"></label><label class="vf-fl"><span>Protocolo</span>${vfInput("vf-f-tProtocolo", 'data-vff="tProtocolo" inputmode="numeric"', F.tProtocolo, "Número")}</label></div></div>
    <div class="vf-fs"><div class="vf-fsh">Herederos</div>
      ${vivos.map((p) => `<div class="vf-pr"><button class="vf-pn" data-editp="${p.id}" title="Abrir ficha">${esc(vfNomP(p))}<small>${esc(RELACIONES[p.relacion]?.label || "")}</small></button>
        <div class="vf-pf"><label class="vf-fl ${malP(p, "nif") ? "vf-need" : ""}"><span>NIF</span>${vfInput(`vf-p-${p.id}-nif`, `data-vfp="${p.id}" data-vfk="nif" class="${nifCls(p.nif)}"`, p.nif, "00000000X")}</label><label class="vf-fl ${malP(p, "estadoCivil") ? "vf-need" : ""}"><span>Estado civil</span>${ecSel(p)}</label><label class="vf-fl vf-wide ${malP(p, "domicilio") ? "vf-need" : ""}"><span>Domicilio</span>${vfInput(`vf-p-${p.id}-domicilio`, `data-vfp="${p.id}" data-vfk="domicilio"`, p.domicilio, "Calle, número, CP y localidad")}</label></div></div>`).join("") || `<p class="caption">Sin herederos.</p>`}</div>
    ${inm.length ? `<div class="vf-fs"><div class="vf-fsh">Inmuebles</div>${inm.map((b) => `<div class="vf-pr"><button class="vf-pn" data-editb="${b.id}" title="Abrir bien">${esc(vfNomB(b))}<small>${esc(b.muniNombre || (typeof ORDENANZAS === "object" && ORDENANZAS[b.municipio] && b.municipio !== "OTRO" ? ORDENANZAS[b.municipio].nombre : "") || TIPO_BIEN[b.tipo][0])}</small></button>
        <div class="vf-pf"><label class="vf-fl vf-wide"><span>Referencia catastral</span>${vfInput(`vf-b-${b.id}-refCatastral`, `data-vfb="${b.id}" data-vfk="refCatastral" class="vf-mono ${b.refCatastral && !vfRC(b.refCatastral).ok ? "vf-bad" : ""}" maxlength="24"`, b.refCatastral, "20 caracteres")}</label><label class="vf-fl vf-wide"><span>Cargas</span>${vfInput(`vf-b-${b.id}-cargas`, `data-vfb="${b.id}" data-vfk="cargas"`, b.cargas, "Hipoteca, embargo… o «Libre de cargas»")}</label></div></div>`).join("")}</div>` : ""}
  </div>`;
}
function tFirma(x, R) {
  if (R === undefined) R = calcular(x);
  const V = validarFirma(x, R);
  const vista = ui.vfv === "650" ? "650" : "check";
  const nB = V.bloqueos.length, nA = V.avisos.length, tot = V.items.length;
  const pct = tot ? Math.round((V.ok.length / tot) * 100) : 0;
  const F = vfF(x);
  const estado = nB ? `${vfPlural(nB, "bloqueo")} antes de la notaría` : "Listo para la notaría";
  const sub = nB ? `Resuelve lo marcado en rojo para firmar. ${nA ? vfPlural(nA, "aviso") + " más por revisar." : ""}` : nA ? `${vfPlural(nA, "aviso")} por revisar: no impiden la firma.` : "Todas las comprobaciones son correctas.";
  const hero = `<div class="card vf-hero ${nB ? "vf-no" : "vf-si"}">
    <div class="vf-big" aria-hidden="true">${nB ? `<b class="num">${nB}</b>` : VF_I.ok}</div>
    <div class="vf-ht"><div class="k">${VF_I.sello}Firma en notaría${F.fecha ? ` · ${fechaCorta(F.fecha)}` : ""}${F.notaria ? ` · ${esc(F.notaria)}` : ""}</div><h2>${esc(estado)}</h2><p>${esc(sub)}</p>
      <div class="vf-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Comprobaciones correctas"><i style="width:${pct}%"></i></div>
      <div class="vf-cnt"><span><i class="vf-d vf-db"></i>${vfPlural(nB, "bloqueo")}</span><span><i class="vf-d vf-da"></i>${vfPlural(nA, "aviso")}</span><span><i class="vf-d vf-do"></i>${V.ok.length} de ${tot} correctas</span></div></div>
    <div class="vf-hacts"><button class="btn sm" data-vf="pdf">${I.dl}Paquete para la notaría</button><button class="btn sm gray" data-doc="escritura">${I.doc}Borrador de escritura</button><button class="btn sm gray" data-vf="texto">${VF_I.cp}Texto del correo</button>${F.email ? `<button class="btn sm gray" data-vf="mail">Enviar por correo</button>` : ""}</div>
  </div>`;
  const seg = `<div class="seg vf-seg" role="group" aria-label="Vista"><button data-vf="vista" data-v="check" aria-pressed="${vista === "check"}">Comprobación</button><button data-vf="vista" data-v="650" aria-pressed="${vista === "650"}">Hoja del 650</button></div>`;
  if (vista === "650") return `<div class="vf">${hero}${seg}${hoja650(x, R)}</div>`;
  const grupos = VF_GRUPOS.map(([k, t]) => {
    const L = V.items.filter((i) => i.grupo === k); if (!L.length) return "";
    const b = L.filter((i) => i.sev === "bloqueo").length, a = L.filter((i) => i.sev === "aviso").length;
    const orden = { bloqueo: 0, aviso: 1, ok: 2 };
    const pend = L.filter((i) => i.sev !== "ok").sort((p, q) => orden[p.sev] - orden[q.sev]), oks = L.filter((i) => i.sev === "ok");
    const okH = oks.length ? (pend.length ? `<details class="vf-oks"><summary>${vfPlural(oks.length, "comprobación correcta", "comprobaciones correctas")}</summary>${oks.map((i) => vfFila(i, x)).join("")}</details>` : oks.map((i) => vfFila(i, x)).join("")) : "";
    return `<section class="vf-g"><div class="sectitle flex"><b>${t}</b><span class="vf-gs">${b ? `<em class="vf-eb">${vfPlural(b, "bloqueo")}</em>` : ""}${a ? `<em class="vf-ea">${vfPlural(a, "aviso")}</em>` : ""}${!b && !a ? `<em class="vf-eo">${VF_I.ok}Correcto</em>` : ""}</span></div><div class="group vf-list">${pend.map((i) => vfFila(i, x)).join("")}${okH}</div></section>`;
  }).join("");
  return `<div class="vf">${hero}${seg}<div class="vf-cols"><div class="vf-main">${grupos}</div><aside class="vf-side">${vfFormDatos(x, V)}</aside></div>
    <p class="foot-note">La comprobación aplica reglas fijas sobre los datos del expediente. Señala lo que falta para firmar; la decisión y la redacción de la escritura son del abogado y del notario.</p></div>`;
}

// ───────────────────── 3. Hoja del 650/660: en modelos.js (hoja650, casillas por territorio desde MODELO650_AUT del motor) ─────────────────────

// ───────────────────── 4. Paquete para la notaría (PDF) y texto del correo ─────────────────────
function vfDerechos(R, id) { const L = (R.isd.derechos || {})[id] || []; return L.length ? L.map((d) => (typeof derTxt === "function" ? derTxt(d) : d.tipo + " " + d.fraccion)).join(" · ") : ""; }
function paqueteBloques(x, R, V) {
  const bl = [], F = vfF(x), m = R.isd.masa, D = x.despacho || {}, pers = x.personas || [], bienes = x.bienes || [];
  const ab = typeof abogado === "function" ? abogado(x.responsable) : null;
  // Portada
  bl.push({ tipo: "fila", etiqueta: "Expediente", valor: D.ref || "[referencia]" });
  bl.push({ tipo: "fila", etiqueta: "Causante", valor: x.nombre || "[causante]" });
  bl.push({ tipo: "fila", etiqueta: "Fecha del fallecimiento", valor: fechaLarga(x.fecha) });
  bl.push({ tipo: "fila", etiqueta: "Despacho", valor: [despachoCfg().nombre, ab && ab.nombre].filter(Boolean).join(" · ") || "[despacho]" });
  bl.push({ tipo: "fila", etiqueta: "Notaría", valor: vfPh(F.notaria, "notaría") });
  bl.push({ tipo: "fila", etiqueta: "Fecha prevista de firma", valor: F.fecha ? fechaLarga(F.fecha) : "[fecha de firma]" });
  bl.push({ tipo: "fila", etiqueta: "Estado de la comprobación", valor: V.listo ? `Listo para firmar${V.avisos.length ? " (" + vfPlural(V.avisos.length, "aviso") + ")" : ""}` : vfPlural(V.bloqueos.length, "punto pendiente", "puntos pendientes"), negrita: true });
  bl.push({ tipo: "p", texto: `Documentación preparada para la escritura de aceptación y adjudicación de la herencia de ${x.nombre || "[causante]"}. Contiene los datos de los otorgantes, el título sucesorio, el inventario valorado, las operaciones particionales y la liquidación prevista de los impuestos.` });

  bl.push({ tipo: "h", numero: "1.", texto: "Datos del causante" });
  bl.push({ tipo: "fila", etiqueta: "Nombre y apellidos", valor: x.nombre || "[causante]" });
  bl.push({ tipo: "fila", etiqueta: "NIF", valor: x.nifCausante ? vfNif(x.nifCausante).v : "[NIF]" });
  bl.push({ tipo: "fila", etiqueta: "Estado civil", valor: ({ gananciales: gnEC(gnCaus(x), "casado_gananciales"), separacion: gnEC(gnCaus(x), "casado_separacion"), pareja: "pareja de hecho", viudo: gnEC(gnCaus(x), "viudo"), soltero: gnEC(gnCaus(x), "soltero"), divorciado: gnEC(gnCaus(x), "divorciado") })[x.civil] || "[estado civil]" });
  bl.push({ tipo: "fila", etiqueta: "Último domicilio", valor: vfPh(x.domicilioCausante, "último domicilio") });
  bl.push({ tipo: "fila", etiqueta: "Fecha del fallecimiento", valor: fechaLarga(x.fecha) });
  bl.push({ tipo: "fila", etiqueta: "Residencia fiscal", valor: nombreTerr(x.ccaa) + (x.ccaa === "EST" && x.ccaaBienes ? ` (bienes en ${nombreTerr(x.ccaaBienes)})` : "") });

  bl.push({ tipo: "h", numero: "2.", texto: "Herederos y legatarios" });
  const filasP = pers.map((p) => [`${vfNomP(p)}, NIF ${p.nif ? vfNif(p.nif).v : "[NIF]"}`, `${gnCap(gnRel(p))}; ${p.estadoCivil ? gnEC(p, p.estadoCivil) : "[estado civil]"}`, vfPh(p.domicilio, "domicilio"), p.renuncia ? "Renuncia" : vfDerechos(R, p.id) || ((bienes.some((b) => b.legatarioId === p.id)) ? "Legatario" : "—")]);
  if (filasP.length) bl.push({ tipo: "tabla", cabecera: ["Otorgante", "Parentesco y estado civil", "Domicilio", "Cuota o derechos"], filas: filasP, alinear: ["l", "l", "l", "l"] });
  const leg = bienes.filter((b) => b.legatarioId);
  if (leg.length) bl.push({ tipo: "lista", items: leg.map((b) => `Legado a ${vfNomP(persona(x, b.legatarioId))}: ${vfNomB(b)}.`) });
  const men = pers.filter((p) => !p.renuncia && vfEdadVale(p) && num(p.edad) < 18);
  if (men.length) bl.push({ tipo: "p", texto: `Menores de edad: ${men.map(vfNomP).join(", ")}. Representación: [padres o defensor judicial] (arts. 163 y 1060 CC).` });
  const ren = pers.filter((p) => p.renuncia);
  if (ren.length) bl.push({ tipo: "p", texto: `Renuncias: ${ren.map(vfNomP).join(", ")}. ${vfDoc(x, "renuncia") ? "Formalizadas en escritura pública, que se aporta." : "Se formalizan ante notario (art. 1008 CC)."}` });

  bl.push({ tipo: "h", numero: "3.", texto: "Título sucesorio" });
  if (x.testamento === "no") bl.push({ tipo: "p", texto: `Sucesión intestada. Acta de declaración de herederos abintestato autorizada por ${vfPh(F.tNotario, "notario")} el ${F.tFecha ? fechaLarga(F.tFecha) : "[fecha]"}, número ${vfPh(F.tProtocolo, "protocolo")} de protocolo.` });
  else if (x.testamento === "nose") bl.push({ tipo: "p", texto: "[Pendiente de confirmar si existe testamento con el certificado de últimas voluntades]." });
  else bl.push({ tipo: "p", texto: `Testamento otorgado ante ${vfPh(F.tNotario, "notario")} el ${F.tFecha ? fechaLarga(F.tFecha) : "[fecha]"}, número ${vfPh(F.tProtocolo, "protocolo")} de protocolo${x.testamento === "usufructo" ? ", con legado del usufructo universal al cónyuge" : x.testamento === "porcentajes" ? ", con institución de herederos en las cuotas indicadas" : ""}. Es el último según el certificado del Registro General de Actos de Última Voluntad${vfDoc(x, "ultimas") ? ", que se aporta" : " [pendiente]"}.` });
  if (R.isd.notasReparto && R.isd.notasReparto.length) bl.push({ tipo: "p", texto: R.isd.notasReparto.join(" ") });

  bl.push({ tipo: "h", numero: "4.", texto: "Inventario y valoración" });
  bl.push({ tipo: "tabla", cabecera: ["Bien", "Titularidad", "Valor declarado", "Valor de referencia"], filas: bienes.map((b) => {
    const inm = vfInm(b), decl = inm ? Math.max(num(b.valor), num(b.valorReferencia)) : num(b.valor);
    return [vfNomB(b), b.titularidad === "proindiviso" ? `${grp(num(b.porcentaje) || 50, 0)} %` : b.titularidad === "ganancial" ? "Ganancial" : "Privativo", vfEurPdf(decl), inm ? (num(b.valorReferencia) ? vfEurPdf(num(b.valorReferencia)) : "[pendiente]") : "—"];
  }), alinear: ["l", "l", "r", "r"] });
  const inmT = bienes.filter(vfInm);
  if (inmT.length) bl.push({ tipo: "tabla", cabecera: ["Inmueble", "Referencia catastral", "Cargas"], filas: inmT.map((b) => [vfNomB(b), b.refCatastral ? vfRC(b.refCatastral).v : "[referencia catastral]", vfPh(b.cargas, "cargas")]), alinear: ["l", "l", "l"] });
  bl.push({ tipo: "fila", etiqueta: "Valor total de los bienes", valor: vfEurPdf(m.brutoTotal), separada: true });
  if (m.gananciales) bl.push({ tipo: "fila", etiqueta: "Mitad de gananciales del cónyuge viudo", valor: "– " + vfEurPdf(m.mitadViudo) });
  bl.push({ tipo: "fila", etiqueta: "Caudal del causante", valor: vfEurPdf(m.bruto), negrita: true });
  if (bienes.some((b) => vfInm(b) && num(b.valor) && num(b.valorReferencia) > num(b.valor))) bl.push({ tipo: "p", texto: "En los inmuebles cuyo valor de referencia supera el de mercado se declara el valor de referencia (art. 9.3 Ley 29/1987)." });

  bl.push({ tipo: "h", numero: "5.", texto: "Deudas y gastos" });
  const dg = [...(x.deudas || []).filter((d) => num(d.importe) > 0).map((d) => [d.concepto || "Deuda", d.ganancial ? "Deuda ganancial (computa la mitad)" : "Deuda", vfEurPdf(num(d.importe)), vfEurPdf(num(d.importe) * (d.ganancial ? 0.5 : 1))]), ...(x.gastos || []).filter((g) => num(g.importe) > 0).map((g) => [g.concepto || "Gasto", "Gasto deducible", vfEurPdf(num(g.importe)), vfEurPdf(num(g.importe))])];
  if (dg.length) bl.push({ tipo: "tabla", cabecera: ["Concepto", "Clase", "Importe", "Computa"], filas: dg, alinear: ["l", "l", "r", "r"] });
  if ((x.deudas || []).some((d) => d.ganancial && num(d.importe) > 0)) bl.push({ tipo: "p", texto: "Las deudas gananciales se pagan con cargo a la sociedad: en la herencia del causante computa la mitad (arts. 1362 y 1404 CC)." });
  if (!dg.length) bl.push({ tipo: "p", texto: "No constan deudas ni gastos deducibles." }); // antes salía también cuando había deudas o gastos no gananciales
  bl.push({ tipo: "fila", etiqueta: "Caudal neto", valor: vfEurPdf(m.neto), separada: true });
  if (m.legados) bl.push({ tipo: "fila", etiqueta: "Legados", valor: "– " + vfEurPdf(m.legados) });
  bl.push({ tipo: "fila", etiqueta: "Neto a repartir entre los herederos", valor: vfEurPdf(m.netoReparto), negrita: true });

  bl.push({ tipo: "h", numero: "6.", texto: "Operaciones particionales" });
  let PT = null; try { PT = particion(x, R); } catch (e) { PT = null; }
  if (PT && PT.cols.length && PT.B.length) {
    bl.push({ tipo: "tabla", cabecera: ["Bien", ...PT.cols.map((p) => vfNomP(p))], filas: PT.B.map((q) => [vfNomB(q.b) + (q.leg ? " (legado)" : q.adj ? " (adjudicado)" : ""), ...PT.cols.map((p) => { const c = PT.cell[q.b.id][p.id]; return c ? vfEurPdf(c.v) : "—"; })]), alinear: ["l", ...PT.cols.map(() => "r")] });
    bl.push({ tipo: "tabla", cabecera: ["Heredero", "Haber", "Adjudicado", "Diferencia"], filas: PT.H.map((q) => [vfNomP(q.p), vfEurPdf(q.haber), vfEurPdf(q.adjud), (q.dif > 0.005 ? "+" : "") + vfEurPdf(Math.abs(q.dif) < 0.005 ? 0 : q.dif)]), alinear: ["l", "r", "r", "r"] });
    const C = cuadroParticion(x, R), FL = vfCompensaciones(PT, x, R);
    if (C && C.adjudicaciones.length) bl.push({ tipo: "lista", items: C.adjudicaciones.map((a) => `${a.tipo === "legado" ? "Legado" : "Se adjudica"} a ${a.aNombre}: ${vfNomB(a.b)} (${vfEurPdf(a.v)}).`) });
    if (FL.length) { bl.push({ tipo: "p", texto: "Excesos de adjudicación y compensaciones en dinero (art. 1062 CC):" }); bl.push({ tipo: "lista", items: [...FL.map((f) => `${vfNomP(f.de)} abona ${vfEurPdf(f.importe)} a ${vfNomP(f.a)}.`), ...C.excesos.map((e) => `Exceso de ${e.nombre}: ${vfEurPdf(e.exceso)} (inevitable ${vfEurPdf(e.inevitable)}${e.evitable > 0.5 ? `, evitable ${vfEurPdf(e.evitable)}` : ""}). Tributación: ${e.txtCoste}. Coste: ${vfEurPdf(e.trib.coste)}.`), ...C.avisos.map((a) => `${a.titulo}. ${a.detalle}`)] }); }
    else bl.push({ tipo: "p", texto: "Cada heredero recibe exactamente su haber: no hay excesos de adjudicación." });
    const pro = C ? C.proindiviso : [];
    if (pro.length) bl.push({ tipo: "p", texto: `Se adjudican en proindiviso, en proporción a los derechos de cada uno: ${pro.map((b) => vfNomB(b)).join(", ")}.` });
  } else bl.push({ tipo: "p", texto: "[Cuadro de partición pendiente]" });

  bl.push({ tipo: "h", numero: "7.", texto: "Liquidación prevista de los impuestos" });
  const pz = vfPlazo(R, "isd"), pzP = vfPlazo(R, "plusvalia");
  bl.push({ tipo: "p", texto: `Impuesto sobre Sucesiones (${R.isd.territorio})${pz && pz.limite ? `: plazo de presentación hasta el ${fechaLarga(pz.limite)}` : ""}.` });
  bl.push({ tipo: "tabla", cabecera: ["Heredero", "Base imponible", "Base liquidable", "Cuota tributaria", "A ingresar"], filas: [...R.isd.herederos.map((q) => [q.nombre, vfEurPdf(q.baseImponible), vfEurPdf(q.baseLiquidable), vfEurPdf(q.cuotaTributaria != null ? q.cuotaTributaria : q.cuotaIntegra), vfEurPdf(q.aIngresar)]), ["Total", "", "", "", vfEurPdf(R.isd.total)]], alinear: ["l", "r", "r", "r", "r"] });
  if ((R.plus || []).length) {
    bl.push({ tipo: "p", texto: `Plusvalía municipal${pzP && pzP.limite ? `: plazo hasta el ${fechaLarga(pzP.limite)}` : ""}.` });
    bl.push({ tipo: "tabla", cabecera: ["Inmueble", "Municipio", "Titular", "A ingresar"], filas: R.plus.flatMap(({ b, r }) => (r.noSujeto ? [[vfNomB(b), r.municipio, "No sujeto", vfEurPdf(0)]] : (r.porTitular || []).map((t, i) => [i ? "" : vfNomB(b), i ? "" : r.municipio, t.heredero, vfEurPdf(t.aIngresar)]))).concat([["Total", "", "", vfEurPdf(R.totalPlus)]]), alinear: ["l", "l", "l", "r"] });
  }
  { const CE = cuadroParticion(x, R);
    if (CE && CE.excesos.length) { bl.push({ tipo: "tabla", cabecera: ["Exceso de adjudicación: quién paga", "Exceso", "Tributación", "Coste"], filas: [...CE.excesos.map((e) => [e.nombre, vfEurPdf(e.exceso), e.txtCoste, vfEurPdf(e.trib.coste)]), ["Total", "", "", vfEurPdf(CE.coste)]], alinear: ["l", "r", "l", "r"] }); bl.push({ tipo: "p", texto: `${CE.T.ajdNota} (${CE.T.ajdNorma}; art. 1062 CC).` }); }
    const tot = R.isd.total + R.totalPlus + (CE ? CE.coste : 0);
    bl.push({ tipo: "fila", etiqueta: `Total previsto: Sucesiones${R.plus.length ? " + plusvalía" : ""}${CE && CE.coste ? " + exceso" : ""}`, valor: vfEurPdf(tot), negrita: true, separada: true }); }
  const sinPlus = bienes.filter((b) => vfInm(b) && !plusCompleto(b));
  if (sinPlus.length) bl.push({ tipo: "p", texto: `Plusvalía pendiente de datos catastrales: ${sinPlus.map(vfNomB).join(", ")} [valor catastral y fecha de adquisición].` });

  bl.push({ tipo: "h", numero: "8.", texto: "Documentos que se aportan" });
  const docs = typeof docsNecesarios === "function" ? docsNecesarios(x) : [];
  const recib = (id) => vfDoc(x, id) || (/^cert_/.test(id) && (() => { const b = bienes.find((q) => "cert_" + q.id === id); return b ? vfSol(x, b) : false; })());
  const si = docs.filter(([id]) => recib(id)), no = docs.filter(([id]) => !recib(id));
  bl.push({ tipo: "tabla", cabecera: ["Documento", "Estado"], filas: [...si.map(([, t]) => [t, "Se aporta"]), ...no.map(([, t]) => [t, "[Pendiente]"])], alinear: ["l", "l"] });

  bl.push({ tipo: "h", numero: "9.", texto: "Observaciones" });
  const obs = [...V.bloqueos.map((i) => `Pendiente: ${i.titulo}. ${i.detalle || ""}`), ...V.avisos.map((i) => `${i.titulo}. ${i.detalle || ""}`)];
  if (obs.length) bl.push({ tipo: "lista", items: obs.slice(0, 30).map((s) => s.replace(/\s+/g, " ").trim()) });
  else bl.push({ tipo: "p", texto: "Sin observaciones: todas las comprobaciones son correctas." });
  bl.push({ tipo: "nota", texto: "Documento de trabajo preparado con los datos del expediente para facilitar la redacción de la escritura. Los datos de identidad y los títulos se cotejan con los originales el día de la firma; la calificación y la redacción corresponden al notario y al abogado." });
  return bl;
}
function paqueteNotaria(x, R) {
  if (R === undefined) R = calcular(x);
  if (!R) { toast("Faltan datos para calcular"); return null; }
  const V = validarFirma(x, R);
  const desp = typeof pdfDespacho === "function" ? pdfDespacho(x) : {};
  const bytes = pdfDocumento({ titulo: "Paquete para la notaría", subtitulo: `Herencia de ${x.nombre || "—"}`, despacho: desp, ref: x.despacho?.ref || "", bloques: paqueteBloques(x, R, V), marcaAgua: V.listo ? "" : "Borrador" });
  return pdfDescargar("Paquete notaria " + (typeof pdfNombreExp === "function" ? pdfNombreExp(x) : x.nombre || "herencia"), bytes);
}
function paqueteResumenTexto(x, R) {
  if (R === undefined) R = calcular(x);
  const V = validarFirma(x, R), F = vfF(x), D = x.despacho || {}, cfg = despachoCfg(), ab = typeof abogado === "function" ? abogado(x.responsable) : null;
  const vivos = (x.personas || []).filter((p) => !p.renuncia), inm = (x.bienes || []).filter(vfInm);
  const docs = typeof docsNecesarios === "function" ? docsNecesarios(x) : [];
  const si = docs.filter(([id]) => vfDoc(x, id)), no = docs.filter(([id]) => !vfDoc(x, id));
  const L = [];
  L.push(`Asunto: Herencia de ${x.nombre || "—"}${D.ref ? " · ref. " + D.ref : ""} · documentación para la escritura`, "");
  L.push("Buenos días:", "");
  L.push(`Adjuntamos el paquete con la documentación para preparar la escritura de aceptación y adjudicación de la herencia de ${x.nombre || "—"}, ${gnO(gnCaus(x), "fallecido", "fallecida", "que falleció")} el ${fechaLarga(x.fecha)}${x.testamento === "no" ? ", sin testamento" : x.testamento === "nose" ? "" : ", con testamento"}.${F.fecha ? ` Proponemos firmar el ${fechaLarga(F.fecha)}.` : ""}`, "");
  L.push("Otorgantes:"); vivos.forEach((p) => L.push(`· ${vfNomP(p)} (${(RELACIONES[p.relacion]?.label || "").toLowerCase()})${R ? " · " + (vfDerechos(R, p.id) || "legatario").toLowerCase() : ""}`));
  const ren = (x.personas || []).filter((p) => p.renuncia); if (ren.length) L.push(`· Renuncian: ${ren.map(vfNomP).join(", ")}`);
  if (inm.length) { L.push("", "Inmuebles:"); inm.forEach((b) => L.push(`· ${vfNomB(b)}${b.refCatastral ? " · ref. catastral " + vfRC(b.refCatastral).v : ""}`)); }
  if (R) L.push("", `Caudal: ${eur(R.isd.masa.bruto)}. Neto a repartir: ${eur(R.isd.masa.netoReparto)}.`);
  if (si.length) { L.push("", "Adjuntamos:"); si.forEach(([, t]) => L.push(`· ${t}`)); }
  if (no.length || V.bloqueos.length) { L.push("", "Pendiente:"); no.forEach(([, t]) => L.push(`· ${t}`)); V.bloqueos.filter((i) => i.grupo !== "titulos" && !/^vf-cert-/.test(i.id)).forEach((i) => L.push(`· ${i.titulo}`)); }
  L.push("", "Quedamos a su disposición para cualquier dato que necesiten.", "", "Un saludo,", [ab && ab.nombre, cfg.nombre].filter(Boolean).join("\n") || "");
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ───────────────────── 5. Tarjeta del Resumen y elementos para el Diagnóstico ─────────────────────
function vfResumen(x, R) {
  if (R === undefined) R = calcular(x);
  const V = validarFirma(x, R), nB = V.bloqueos.length;
  const top = V.bloqueos.concat(V.avisos).slice(0, 3);
  return `<div class="card vf-mini ${nB ? "vf-no" : "vf-si"}">${cardH("Firma en notaría", nB ? `${vfPlural(nB, "bloqueo")} antes de la notaría` : "Listo para firmar", `<button class="link" data-sec="firma">Revisar ›</button>`)}
    <div class="vf-mini-b"><i class="vf-mini-ic" aria-hidden="true">${nB ? `<b class="num">${nB}</b>` : VF_I.ok}</i><div class="vf-mini-l">${top.length ? top.map((i) => `<button class="vf-mini-r" data-sec="firma"><i class="vf-d ${i.sev === "bloqueo" ? "vf-db" : "vf-da"}"></i><span>${esc(i.titulo)}</span></button>`).join("") : `<p class="caption" style="margin:4px 0">${V.ok.length} comprobaciones correctas.</p>`}</div></div></div>`;
}
// Para diagnostico(): solo identificación, inventario y reparto (los documentos ya los vigila el Diagnóstico)
function vfItems(x, R) {
  if (R === undefined) R = calcular(x);
  const V = validarFirma(x, R), area = { herederos: "datos", bienes: "datos", reparto: "reparto", impuestos: "impuestos", titulos: "docs" };
  const L = V.bloqueos.filter((i) => i.grupo !== "titulos" && i.id !== "vf-sin-calculo" && i.id !== "vf-exceso" && !/^vf-cert-/.test(i.id)); // el exceso lo explica el Diagnóstico con el cuadro único
  const out = L.slice(0, 6).map((i) => ({ id: i.id, area: area[i.grupo] || "datos", tipo: i.grupo === "reparto" ? "riesgo" : "dato", gravedad: 2, titulo: i.titulo, detalle: i.detalle || "", accion: "Resuélvelo en Listo para firmar.", norma: i.norma || "", estado: i.estado || "", enlace: { sec: "firma" }, modulo: "firma" }));
  if (L.length > 6) out.push({ id: "vf-mas", area: "datos", tipo: "dato", gravedad: 1, titulo: `Y ${vfPlural(L.length - 6, "bloqueo")} más antes de la notaría`, detalle: "", accion: "Revisa la comprobación completa.", enlace: { sec: "firma" }, modulo: "firma" });
  return out;
}

// ───────────────────── 6. Acciones (un solo escuchador en captura) ─────────────────────
function vfSet(x, k, v) { x.firma = x.firma || {}; x.firma.dec = x.firma.dec || {}; if (v) x.firma.dec[k] = v; else delete x.firma.dec[k]; }
function vfRender(focoId) { render(); if (focoId) { const n = document.getElementById(focoId); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } } }
function vfClick(e) {
  const t = e.target && e.target.closest ? e.target.closest("[data-vf]") : null; if (!t) return;
  e.stopPropagation(); e.preventDefault();
  const x = typeof exp === "function" ? exp() : null, d = t.dataset, a = d.vf;
  if (a === "vista") { ui.vfv = d.v; render(); return; }
  if (a === "ir") { const n = document.getElementById(d.id); if (n) n.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (a === "cp") { const v = d.v || ""; Promise.resolve(copiar(v)).then(() => toast(`Copiado · ${d.l || ""}: ${v}`)); return; }
  if (!x) return;
  if (a === "foco") {
    if (ui.vfv === "650") { ui.vfv = "check"; render(); }
    const n = document.getElementById(d.id); if (!n) return;
    n.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => { try { n.focus({ preventScroll: true }); } catch (er) { n.focus(); } const w = n.closest(".vf-fl") || n; w.classList.remove("vf-flash"); void w.offsetWidth; w.classList.add("vf-flash"); }, 250);
    return;
  }
  if (a === "dec") {
    const on = !vfDec(x, d.k) || (d.sig && vfDec(x, d.k).sig !== d.sig);
    vfSet(x, d.k, on ? { t: hoy(), sig: d.sig || "" } : null);
    const btn = t.textContent.trim();
    anotar(x, on ? `Firma: decisión registrada (${btn.toLowerCase()})` : "Firma: decisión retirada", "sistema"); guardar(); render(); toast(on ? "Decisión registrada" : "Decisión retirada"); return;
  }
  if (a === "libre") { const id = d.k.replace(/^libre-/, ""), b = (x.bienes || []).find((q) => q.id === id); if (!b) return; b.cargas = "Libre de cargas según nota simple"; anotar(x, `Firma: ${vfNomB(b)} libre de cargas`, "sistema"); guardar(); render(); toast("Anotado: libre de cargas"); return; }
  if (a === "pdf") { try { const n = paqueteNotaria(x, calcular(x)); if (n) { anotar(x, "Paquete para la notaría descargado en PDF", "doc"); guardar(); toast("Paquete descargado"); } } catch (er) { console.error(er); toast("No se pudo generar el PDF"); } return; }
  if (a === "texto") { copiar(paqueteResumenTexto(x, calcular(x))); return; }
  if (a === "mail") { const T = paqueteResumenTexto(x, calcular(x)), i = T.indexOf("\n"), asunto = T.slice(0, i).replace(/^Asunto: /, ""), cuerpo = T.slice(i).trim(); const url = `mailto:${encodeURIComponent(vfF(x).email || "")}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`; if (typeof abrirExterno === "function") abrirExterno(url); else window.open(url); anotar(x, "Correo a la notaría preparado", "doc"); guardar(); return; }
}
function vfChange(e) {
  const t = e.target; if (!t || !t.dataset) return;
  const d = t.dataset; if (!(d.vfp || d.vfb || d.vfx || d.vff)) return;
  e.stopPropagation();
  const x = typeof exp === "function" ? exp() : null; if (!x) return;
  let v = t.value;
  const k = d.vfk || d.vfx || d.vff;
  if (/^(nif|nifCausante)$/.test(k)) v = v.toUpperCase().replace(/[\s.\-]/g, "");
  if (k === "refCatastral") v = v.toUpperCase().replace(/[\s\-.]/g, "");
  if (typeof v === "string") v = v.trim();
  if (d.vfp) { const p = (x.personas || []).find((q) => q.id === d.vfp); if (!p) return; p[k] = v; }
  else if (d.vfb) { const b = (x.bienes || []).find((q) => q.id === d.vfb); if (!b) return; b[k] = v; }
  else if (d.vfx) x[k] = v;
  else { x.firma = x.firma || {}; x.firma[k] = v; }
  guardar();
  // El foco ya ha pasado al siguiente campo cuando se dispara "change": se repinta y se le devuelve
  setTimeout(() => { const a = document.activeElement, id = a && a.id && a !== document.body ? a.id : ""; vfRender(id); }, 0);
}
if (typeof document !== "undefined") { document.addEventListener("click", vfClick, true); document.addEventListener("change", vfChange, true); }
