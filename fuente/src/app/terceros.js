// ───────────────────── {{MARCA}} · solicitudes a terceros y recordatorios a la familia (Piloto 8) ─────────────────────
// El cuello de botella de una testamentaría son los bancos (certificados que tardan semanas y hay que perseguir) y,
// después, los documentos que debe aportar la familia. Este módulo convierte la carta al banco y la lista de documentos
// en un flujo con seguimiento: qué se ha pedido, a quién, cuándo, cuántos días lleva y cuál es el siguiente escrito.
// Datos: x.solicitudes = [{ id, clave, tercero:{tipo,nombre,contacto}, que, bienId, bienIds, docs, enviada, plazoEsperado,
//        recibida, estado (borrador|enviada|reclamada|escalada|recibida), recordatorios:[fechas], sac, supervisor, notas, creada }]
//        x.recordatorios = [{ fecha, canal, docs:[ids] }] · x.solicitudesDescartadas = [claves]
// API: tTerceros(x, R) → HTML de la sección · tcResumen(x) → tarjeta del Resumen · tcPendientes(x) → para el Radar
//      tcFamilia(x) → documentos pendientes de la familia · tcSugerencias(x) · tcCarta/tcReclamacion/tcEscalado(x, s)
//      tcRecordatorio(x) → mensaje para la familia · tcSheet(x) → hoja (ui.sheet.tipo === "tc")
// Todas las acciones van por un único oyente delegado sobre [data-tc] (fase de captura) que modifica exp(), guarda y pinta.

const TC_SEC = "terceros"; // pestaña donde se monta tTerceros (la fija el integrador)
const TC_TIPOS = {
  banco: { n: "Banco", plazo: 30, que: "Certificado de posiciones a la fecha del fallecimiento, movimientos y requisitos de testamentaría" },
  aseguradora: { n: "Aseguradora", plazo: 30, que: "Confirmación de pólizas y beneficiarios" },
  notaria: { n: "Notaría", plazo: 15, que: "Copia autorizada del testamento" },
  registro: { n: "Registro de la Propiedad", plazo: 15, que: "Nota simple" },
  catastro: { n: "Catastro", plazo: 10, que: "Certificado del valor de referencia y certificación catastral descriptiva y gráfica" },
  ayuntamiento: { n: "Ayuntamiento", plazo: 20, que: "Certificado de empadronamiento histórico del causante" },
  hacienda: { n: "Hacienda", plazo: 20, que: "Datos fiscales y copia de las últimas declaraciones del causante" },
  seguridad_social: { n: "Seguridad Social", plazo: 30, que: "Certificado de prestaciones y de cantidades devengadas y no percibidas" },
  otro: { n: "Otro", plazo: 20, que: "" },
};
const TC_ORDEN_T = Object.keys(TC_TIPOS);
const TC_EST = { borrador: "Por enviar", enviada: "Enviada", reclamada: "Reclamada", escalada: "Escalada", recibida: "Recibida" };
const TC_EST_ORDEN = ["escalada", "reclamada", "enviada", "borrador", "recibida"];
const TC_EST_TIT = { escalada: "Escaladas", reclamada: "Reclamadas", enviada: "Enviadas, en espera", borrador: "Por enviar", recibida: "Recibidas" };
// Supervisores para el escalado (datos de contacto: ver tabla de referencias del informe del módulo)
const TC_SUP = {
  banco: { n: "Banco de España", al: "AL BANCO DE ESPAÑA", dep: "Departamento de Conducta de Entidades", dir: "C/ Alcalá, 48 · 28014 Madrid", corto: "Banco de España" },
  aseguradora: { n: "Dirección General de Seguros y Fondos de Pensiones", al: "A LA DIRECCIÓN GENERAL DE SEGUROS Y FONDOS DE PENSIONES", dep: "Servicio de Reclamaciones", dir: "Paseo de la Castellana, 44 · 28046 Madrid", corto: "DGSFP" },
};
// Referencias que se muestran al pie (estado de verificación a 1-10-2026)
const TC_REFS = [
  ["Derecho de los herederos a obtener posiciones, movimientos y contratos antes de aceptar", "Banco de España, Portal del Cliente Bancario (Herencias)", "VERIFICADO"],
  ["Pedir información y conservar no supone aceptar la herencia", "Código Civil, art. 999", "VERIFICADO"],
  ["Antes del supervisor hay que reclamar al servicio de atención al cliente: 15 días hábiles (servicios de pago), un mes (consumidores), dos meses (no consumidores)", "Banco de España, «Cómo realizar una reclamación»; DGSFP, guía de reclamaciones", "VERIFICADO"],
  ["Régimen legal del plazo del servicio de atención al cliente tras la Ley 10/2025 (Ley 44/2002, art. 29; Orden ECO/734/2004, arts. 10-12 derogados)", "Ley 10/2025, disp. final 2.ª y derogatoria", "PENDIENTE"],
  ["Pago de la prestación del seguro: mínimo en 40 días desde la declaración; mora a los tres meses", "Ley 50/1980, arts. 18 y 20.3.ª", "VERIFICADO"],
  ["Plazo para inscribir: quince días desde el asiento de presentación", "Ley Hipotecaria, art. 18", "VERIFICADO"],
];
// Entidades frecuentes (búsqueda en la descripción del bien, sin acentos ni mayúsculas)
const TC_ENTIDADES = [
  ["Banco Santander", "banco", /\bsantander\b/], ["BBVA", "banco", /\bbbva\b|bilbao vizcaya/], ["CaixaBank", "banco", /caixa ?bank|\bla caixa\b/], ["Banco Sabadell", "banco", /sabadell/],
  ["Bankinter", "banco", /bankinter/], ["Unicaja", "banco", /unicaja|liberbank/], ["Ibercaja", "banco", /ibercaja/], ["Abanca", "banco", /abanca/], ["Kutxabank", "banco", /kutxabank|\bbbk\b/],
  ["Cajamar", "banco", /cajamar/], ["ING", "banco", /\bing( direct)?\b/], ["Openbank", "banco", /openbank/], ["Caja Rural", "banco", /caja rural|ruralvia|globalcaja|eurocaja/], ["Deutsche Bank", "banco", /deutsche/],
  ["EVO Banco", "banco", /\bevo\b/], ["Laboral Kutxa", "banco", /laboral ?kutxa|caja laboral/], ["Cajasur", "banco", /cajasur/], ["Banca March", "banco", /\bmarch\b/], ["Caja de Ingenieros", "banco", /caja de ingenieros/],
  ["Banco Mediolanum", "banco", /mediolanum/], ["MyInvestor", "banco", /myinvestor/], ["Renta 4", "banco", /renta ?4/], ["Arquia Banca", "banco", /arquia/], ["Triodos Bank", "banco", /triodos/],
  ["Targobank", "banco", /targobank/], ["Self Bank", "banco", /self ?bank/], ["Banco Caminos", "banco", /caminos/], ["Andbank", "banco", /andbank/], ["Wizink", "banco", /wizink/], ["Trade Republic", "banco", /trade republic/],
  ["N26", "banco", /\bn26\b/], ["Revolut", "banco", /revolut/], ["Colonya", "banco", /colonya/], ["Caixa Ontinyent", "banco", /ontinyent/],
  ["Mapfre", "aseguradora", /mapfre/], ["Mutua Madrileña", "aseguradora", /mutua madrile/], ["Allianz", "aseguradora", /allianz/], ["Generali", "aseguradora", /generali/], ["Santalucía", "aseguradora", /santa ?lucia/],
  ["Ocaso", "aseguradora", /ocaso/], ["Línea Directa", "aseguradora", /linea directa/], ["AXA", "aseguradora", /\baxa\b/], ["Zurich", "aseguradora", /zurich/], ["Reale", "aseguradora", /\breale\b/], ["Helvetia", "aseguradora", /helvetia/],
  ["Caser", "aseguradora", /\bcaser\b/], ["Pelayo", "aseguradora", /pelayo/], ["Catalana Occidente", "aseguradora", /catalana occidente/], ["Plus Ultra", "aseguradora", /plus ultra/], ["VidaCaixa", "aseguradora", /vidacaixa/],
  ["SegurCaixa Adeslas", "aseguradora", /adeslas|segurcaixa/], ["Nationale-Nederlanden", "aseguradora", /nationale|nederlanden/], ["Aegon", "aseguradora", /aegon/], ["Fiatc", "aseguradora", /fiatc/], ["Seguros Bilbao", "aseguradora", /seguros bilbao/],
  ["Preventiva", "aseguradora", /preventiva/], ["Meridiano", "aseguradora", /meridiano/], ["Divina Pastora", "aseguradora", /divina pastora/], ["Asisa", "aseguradora", /asisa/], ["DKV", "aseguradora", /\bdkv\b/],
];
const tcNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tcEntidadDe = (txt) => { const t = tcNorm(txt); const e = TC_ENTIDADES.find(([, , re]) => re.test(t)); return e ? { nombre: e[0], tipo: e[1] } : null; };
const tcHoy = () => hoy();
const tcL = (x) => (x.solicitudes = Array.isArray(x.solicitudes) ? x.solicitudes : []);
const tcSol = (x, id) => tcL(x).find((s) => s.id === id);
const tcTipoN = (t) => (TC_TIPOS[t] || TC_TIPOS.otro).n;
const tcPlural = (n, s, p) => `${n} ${n === 1 ? s : p || s + "s"}`;
const tcNombre = (s) => (s.tercero && s.tercero.nombre) || "Entidad sin identificar";
const tcSinNombre = (s) => !s.tercero || !s.tercero.nombre;
const tcDias = (s) => (s.enviada ? Math.max(0, dias(s.enviada, s.recibida || tcHoy())) : null);
const tcPlazo = (s) => Math.max(1, num(s.plazoEsperado) || (TC_TIPOS[s.tercero?.tipo] || TC_TIPOS.otro).plazo);
const tcAbierta = (s) => s.estado !== "recibida";
const tcVencida = (s) => tcAbierta(s) && !!s.enviada && tcDias(s) > tcPlazo(s);
const tcNivel = (s) => { if (!s.enviada || !tcAbierta(s)) return "ok"; const p = tcDias(s) / tcPlazo(s); return p > 1 ? "bad" : p >= 0.8 ? "warn" : "ok"; };
const tcEscalable = (s) => (s.tercero?.tipo === "banco" || s.tercero?.tipo === "aseguradora") && tcAbierta(s) && !!s.enviada && (tcVencida(s) || s.estado === "reclamada" || s.estado === "escalada");
const tcEmail = (c) => { const m = /[\w.+-]+@[\w-]+(\.[\w-]+)+/.exec(String(c || "")); return m ? m[0] : ""; };
const tcTel = (c) => { const d = String(c || "").replace(/[^\d+]/g, "").replace(/^\+/, ""); if (/^[6789]\d{8}$/.test(d)) return "34" + d; return /^\d{10,15}$/.test(d) ? d : ""; };
const tcPila = (n) => String(n || "").trim().split(/\s+/)[0] || "";
function tcMono(s) {
  const stop = /^(banco|banca|caja|de|del|la|el|los|las|y|que|registro|propiedad|notaria|seguros|ayuntamiento|direccion|general|instituto|nacional|entidad|ministerio|num|sin|identificar|gestora|plan|aseguradora|oficina|autorizo|testamento|declaracion|herederos|actos|ultima|voluntad)$/;
  const w = String(tcNombre(s)).replace(/[·,()«»".º]/g, " ").split(/\s+/).filter((q) => q && /\p{L}/u.test(q) && !stop.test(tcNorm(q)));
  if (!w.length || tcSinNombre(s)) return tcTipoN(s.tercero?.tipo).charAt(0);
  if (/^[A-Z0-9]{2,4}$/.test(w[0])) return w[0];
  return w.length >= 2 && w[1].length > 2 ? (w[0][0] + w[1][0]).toUpperCase() : w[0].charAt(0).toUpperCase();
}
const tcBienN = (b) => (b ? b.descripcion || (TIPO_BIEN[b.tipo] ? TIPO_BIEN[b.tipo][0] : "Bien") : "");
const tcMuniN = (b) => b.muniNombre || (b.municipio && b.municipio !== "OTRO" && typeof ORDENANZAS !== "undefined" && ORDENANZAS[b.municipio] ? ORDENANZAS[b.municipio].nombre : "");
const tcInm = (b) => b.tipo === "vivienda" || b.tipo === "inmueble";
const tcDocOk = (x, id) => !!x.despacho?.docs?.[id];
const tcTramOk = (x, id) => x.tramites?.[id]?.estado === "hecho";

// ── Sugerencias a partir del caso ─────────────────────────────
function tcSugerencias(x) {
  const S = [], B = x.bienes || [], P = x.personas || [], situ = x.situ || {};
  const add = (o) => S.push({ plazoEsperado: TC_TIPOS[o.tipo].plazo, que: TC_TIPOS[o.tipo].que, docs: [], bienIds: [], ...o });
  // Bancos: un único escrito por entidad; las cuentas sin entidad reconocible, una a una
  const porEnt = {};
  for (const b of B.filter((q) => ["cuenta", "valores", "fondos"].includes(q.tipo))) {
    const e = tcEntidadDe(b.descripcion);
    const k = e ? "ent:" + tcNorm(e.nombre) : "bien:" + b.id;
    (porEnt[k] = porEnt[k] || { e, bienes: [] }).bienes.push(b);
  }
  for (const d of x.deudas || []) { const e = tcEntidadDe(d.concepto); if (e && num(d.importe) > 0) { const k = "ent:" + tcNorm(e.nombre); (porEnt[k] = porEnt[k] || { e, bienes: [] }).deuda = true; } }
  for (const [k, g] of Object.entries(porEnt)) {
    const tipo = g.e ? g.e.tipo : "banco";
    const docs = g.bienes.map((b) => "cert_" + b.id).concat(g.deuda ? ["deudas"] : []);
    if (docs.length && docs.every((id) => tcDocOk(x, id))) continue;
    const que = (tipo === "banco" ? TC_TIPOS.banco.que : "Certificado de posición y valoración a la fecha del fallecimiento, con titulares y beneficiarios") + (g.deuda ? " y certificado de la deuda pendiente" : "");
    add({ clave: "banco:" + k, tipo, nombre: g.e ? g.e.nombre : "", que, bienId: g.bienes[0]?.id || "", bienIds: g.bienes.map((b) => b.id), docs, motivo: g.bienes.length ? g.bienes.map(tcBienN).join(" · ") : "Deuda pendiente" });
  }
  // Seguros de vida (beneficiarios en el expediente)
  const benef = P.filter((p) => num(p.seguro) > 0);
  if (benef.length && !tcDocOk(x, "polizas")) add({ clave: "seg:vida", tipo: "aseguradora", nombre: "", que: "Confirmación de pólizas y beneficiarios, y documentación para el cobro de la prestación", docs: ["polizas"], motivo: "Seguro de vida · " + benef.map((p) => p.nombre || "beneficiario").join(", ") });
  if (situ.decesos) add({ clave: "seg:decesos", tipo: "aseguradora", nombre: "", que: "Confirmación de la póliza de decesos, servicios prestados y capitales o extornos pendientes", motivo: "Tenía seguro de decesos" });
  if (situ.planPensiones) add({ clave: "seg:pp", tipo: "aseguradora", nombre: "", que: "Certificado de derechos consolidados a la fecha del fallecimiento y beneficiarios designados del plan de pensiones", motivo: "Tenía planes de pensiones" });
  // Inmuebles: nota simple por finca y un único escrito al Catastro
  for (const b of B.filter(tcInm)) {
    if (tcDocOk(x, "esc_" + b.id)) continue;
    const mu = tcMuniN(b);
    add({ clave: "reg:" + b.id, tipo: "registro", nombre: "Registro de la Propiedad" + (mu ? " de " + mu : ""), que: "Nota simple de la finca: " + tcBienN(b), bienId: b.id, bienIds: [b.id], docs: ["esc_" + b.id], motivo: tcBienN(b) });
  }
  const sinVref = B.filter((b) => tcInm(b) && !tcDocOk(x, "vref_" + b.id));
  if (sinVref.length) add({ clave: "cat", tipo: "catastro", nombre: "Dirección General del Catastro", que: `Certificado del valor de referencia a la fecha del fallecimiento y certificación catastral descriptiva y gráfica: ${sinVref.map(tcBienN).join("; ")}`, bienIds: sinVref.map((b) => b.id), bienId: sinVref[0].id, docs: sinVref.map((b) => "vref_" + b.id), motivo: tcPlural(sinVref.length, "inmueble") });
  // Título sucesorio
  if ((x.testamento === "usufructo" || x.testamento === "porcentajes") && !tcDocOk(x, "testamento")) add({ clave: "not:test", tipo: "notaria", nombre: "Notaría que autorizó el testamento", que: "Copia autorizada del último testamento", docs: ["testamento"], motivo: "Hay testamento" });
  if ((x.testamento === "no" || x.testamento === "nose") && !tcDocOk(x, "declaracion")) add({ clave: "not:decl", tipo: "notaria", nombre: "Notaría (declaración de herederos)", que: "Inicio del acta de declaración de herederos abintestato: documentación, testigos y provisión de fondos", plazoEsperado: 30, docs: ["declaracion"], motivo: x.testamento === "no" ? "Sin testamento" : "Pendiente de saber si hay testamento" });
  if (!(tcDocOk(x, "ultimas") && tcDocOk(x, "seguros")) && !(tcTramOk(x, "ultimas") && tcTramOk(x, "seguros_cert"))) add({ clave: "mj", tipo: "otro", nombre: "Ministerio de Justicia · Registro General de Actos de Última Voluntad", que: "Certificados de últimas voluntades y de contratos de seguros de cobertura de fallecimiento", plazoEsperado: 15, docs: ["ultimas", "seguros"], motivo: "Se piden desde el día 15 hábil tras el fallecimiento" });
  if (situ.pensionista) add({ clave: "ss", tipo: "seguridad_social", nombre: "Instituto Nacional de la Seguridad Social", que: "Comunicación del fallecimiento y certificado de las cantidades devengadas y no percibidas por el causante", motivo: "Cobraba una pensión" });
  const viv = B.find((b) => b.tipo === "vivienda");
  if (!tcDocOk(x, "padron_causante")) add({ clave: "ayto", tipo: "ayuntamiento", nombre: "Ayuntamiento" + (viv && tcMuniN(viv) ? " de " + tcMuniN(viv) : ""), que: TC_TIPOS.ayuntamiento.que, docs: ["padron_causante"], motivo: "Residencia de los últimos cinco años" });
  const ya = new Set([...tcL(x).map((s) => s.clave).filter(Boolean), ...(x.solicitudesDescartadas || [])]);
  return S.filter((s) => !ya.has(s.clave)).sort((a, b) => TC_ORDEN_T.indexOf(a.tipo) - TC_ORDEN_T.indexOf(b.tipo));
}
function tcNueva(o) {
  return { id: uid(), clave: o.clave || "", tercero: { tipo: o.tipo || "otro", nombre: o.nombre || "", contacto: o.contacto || "" }, que: o.que || "", bienId: o.bienId || "", bienIds: o.bienIds || (o.bienId ? [o.bienId] : []), docs: o.docs || [], enviada: o.enviada || "", plazoEsperado: num(o.plazoEsperado) || TC_TIPOS[o.tipo || "otro"].plazo, recibida: "", estado: o.enviada ? "enviada" : "borrador", recordatorios: [], notas: o.notas || "", creada: tcHoy() };
}

// ── Estado para otros módulos ─────────────────────────────────
function tcPendientes(x) {
  return tcL(x).filter((s) => tcAbierta(s) && s.enviada).map((s) => ({ id: s.id, expId: x.id, tercero: tcNombre(s), tipo: s.tercero?.tipo || "otro", que: s.que, enviada: s.enviada, dias: tcDias(s), plazo: tcPlazo(s), vencida: tcVencida(s), estado: s.estado, escalable: tcEscalable(s) })).sort((a, b) => b.dias / b.plazo - a.dias / a.plazo);
}
function tcFamilia(x) {
  const cubiertos = new Set(tcL(x).flatMap((s) => s.docs || []));
  const L = (typeof docsNecesarios === "function" ? docsNecesarios(x) : []).filter(([id]) => !tcDocOk(x, id) && !cubiertos.has(id));
  const R = Array.isArray(x.recordatorios) ? x.recordatorios : [];
  const ultimo = R.length ? R.map((r) => r.fecha).sort().pop() : "";
  const d = ultimo ? dias(ultimo, tcHoy()) : null;
  return { docs: L, ultimo, dias: d, n: R.length, toca: L.length > 0 && (d == null || d >= 7) };
}

// ── Escritos ──────────────────────────────────────────────────
function tcRemite(x) {
  const D = despachoCfg(), ab = (x.responsable && abogado(x.responsable)) || null;
  const nom = ab && ab.nombre && ab.nombre !== "Titular del despacho" ? ab.nombre : "[nombre]";
  return { despacho: D.nombre || "[despacho]", abogado: nom, lugar: D.localidad || "[localidad]", ref: x.despacho?.ref || "", ab };
}
const tcHerederos = (x) => (x.personas || []).filter((p) => !p.renuncia);
const tcCausante = (x) => x.nombre || "[nombre del causante]";
function tcCabecera(x, s, asunto, dest) {
  const r = tcRemite(x), c = s.tercero || {};
  const destino = dest || [tcNombre(s), c.tipo === "banco" ? "Oficina [número] / Departamento de Testamentarías" : "", c.contacto && !tcEmail(c.contacto) ? c.contacto : "[dirección]"].filter(Boolean).join("\n");
  return `${r.despacho}\n${r.abogado}, ${gnAbogado(r.ab)}\n${typeof dpLineaMembrete === "function" ? dpLineaMembrete() : "[dirección] · [correo] · [teléfono]"}\n\n${destino}\n\nEn ${r.lugar}, a ${fechaLarga(tcHoy())}.\n\nAsunto: ${asunto}. Causante: ${gnTrat(gnCaus(x))}${tcCausante(x)} (NIF ${x.nifCausante || "[NIF]"}), ${gnO(gnCaus(x), "fallecido", "fallecida", "que falleció")} el ${fechaLarga(x.fecha)}.${r.ref ? " Nuestra referencia: " + r.ref + "." : ""}`;
}
function tcEnNombre(x) {
  const hs = tcHerederos(x);
  return hs.length ? `en nombre de ${hs.map((h) => `${gnTrat(h)}${h.nombre || "[nombre]"} (NIF ${h.nif || "[NIF]"}), ${gnRel(h) || "persona llamada a la herencia"} del causante`).join("; ")}, en calidad de llamados a la herencia, según la autorización que se acompaña` : "en nombre de los llamados a la herencia, según la autorización que se acompaña";
}
function tcFirma(x, conformes) {
  const r = tcRemite(x);
  return `Atentamente,\n\nFdo.: ${r.abogado}\n${r.despacho}${conformes ? `\n\n${tcHerederos(x).map((h) => `Fdo.: ${h.nombre || "[heredero/a]"}`).join("\n")}` : ""}`;
}
const tcBienesDe = (x, s) => (s.bienIds && s.bienIds.length ? s.bienIds : s.bienId ? [s.bienId] : []).map((id) => (x.bienes || []).find((b) => b.id === id)).filter(Boolean);
const TC_ADJ = "Documentos que se adjuntan: 1. Certificado de defunción. 2. Certificado de últimas voluntades. 3. Copia del testamento o de la declaración de herederos (se aportará en cuanto se obtenga). 4. DNI de los llamados a la herencia. 5. Autorización a favor del despacho.";
// Las cinco peticiones de la carta al banco del programa (docTexto "banco"); si cambia la plantilla, se usa esta copia
const TC_BANCO_PIDE = "1. Certificado de posiciones a la fecha del fallecimiento de todos los productos de los que el causante fuera titular, cotitular, autorizado o beneficiario, con el tipo de titularidad y los demás titulares: cuentas y depósitos, valores y fondos, planes de pensiones y seguros, préstamos y tarjetas, avales y cajas de seguridad.\n\n2. Movimientos de todas las cuentas desde un año antes del fallecimiento hasta la fecha de emisión, y copia de los contratos.\n\n3. Que se mantengan únicamente los cargos necesarios para conservar el patrimonio (IBI, comunidad, suministros y seguro de la vivienda) y se den de baja las demás domiciliaciones, tarjetas y accesos a la banca a distancia del causante.\n\n4. Que nos indiquen por escrito la documentación que exigen para reconocer la condición de herederos y entregar los saldos, si admiten un documento privado de partición firmado por todos los herederos o exigen escritura pública, y las comisiones que aplicarán.\n\n5. Que el Impuesto sobre Sucesiones pueda pagarse, en su momento, con cargo a los fondos del causante depositados en la entidad.";
function tcBancoPeticiones(x) {
  try {
    const R = calcular(x); if (!R) return { pide: TC_BANCO_PIDE, rev: "" };
    const t = docTexto(x, R, "banco"); const m = /Solicitamos:\n\n([\s\S]*?)\n\nAtentamente/.exec(t); const v = /(⟦REVISIÓN OBLIGATORIA POR ABOGADO: no disponer[\s\S]*?⟧)/.exec(t);
    return { pide: m ? m[1] : TC_BANCO_PIDE, rev: v ? v[1] : "" };
  } catch (e) { return { pide: TC_BANCO_PIDE, rev: "" }; }
}
function tcCarta(x, s) {
  const tipo = s.tercero?.tipo || "otro", fm = fechaLarga(x.fecha), Bs = tcBienesDe(x, s), en = tcEnNombre(x);
  const cons = "Esta comunicación y las solicitudes que contiene son actos de mera conservación y administración provisional (art. 999 del Código Civil) y no suponen aceptación de la herencia.";
  const resp = `Les rogamos que dirijan su respuesta a este despacho${tcRemite(x).ref ? ", indicando nuestra referencia " + tcRemite(x).ref : ""}.`;
  if (tipo === "banco") {
    const { pide, rev } = tcBancoPeticiones(x);
    const consta = Bs.length ? `\n\nNos consta, al menos, la existencia de: ${Bs.map(tcBienN).join("; ")}. La solicitud se extiende a cualquier otro producto del causante en la entidad.` : "";
    return `${tcCabecera(x, s, "Solicitud de certificado de posiciones, de movimientos y de requisitos de testamentaría")}\n\nMuy señores nuestros:\n\nLes comunicamos que su cliente ${gnTrat(gnCaus(x))}${tcCausante(x)}, con NIF ${x.nifCausante || "[NIF]"} y último domicilio en ${x.domicilioCausante || "[domicilio]"}, falleció el ${fm}, como acredita el certificado de defunción adjunto.\n\nNos dirigimos a ustedes ${en}. ${cons}${consta}\n\nSolicitamos:\n\n${pide}${s.que && s.que !== TC_TIPOS.banco.que ? `\n\n6. ${s.que.charAt(0).toUpperCase() + s.que.slice(1)}.` : ""}\n\n${resp}\n\n${tcFirma(x, true)}\n\n${TC_ADJ}${rev ? "\n\n" + rev : ""}`;
  }
  let pide = "";
  if (tipo === "aseguradora") pide = `1. Que nos confirmen si el causante era tomador o asegurado de pólizas de vida, accidentes, decesos, planes de previsión u otros contratos con cobertura de fallecimiento en su entidad, con el número de póliza, el capital asegurado y los beneficiarios designados.\n\n2. La documentación que exigen para tramitar el pago a los beneficiarios, y si existen primas pendientes o extornos a favor del causante.${s.que && !/^confirmaci[oó]n de p[oó]lizas y beneficiarios/i.test(s.que) ? `\n\n3. En particular: ${s.que.charAt(0).toLowerCase() + s.que.slice(1).replace(/\.$/, "")}.` : ""}`;
  else if (tipo === "registro") pide = `1. Nota simple informativa de ${Bs.length ? Bs.map((b) => `la finca «${tcBienN(b)}»`).join(", ") : "las fincas"} (finca registral [número], referencia catastral [RC]), con indicación de titulares, cargas y asientos pendientes.${s.que && !/^nota simple/i.test(s.que) ? `\n\n2. ${s.que}.` : ""}`;
  else if (tipo === "catastro") pide = `1. ${s.que || TC_TIPOS.catastro.que}.\n\n${Bs.length ? Bs.map((b) => `- ${tcBienN(b)}${tcMuniN(b) ? ", " + tcMuniN(b) : ""}. Referencia catastral [RC].`).join("\n") : "- [inmuebles y referencias catastrales]"}\n\nFecha a la que se solicita el valor de referencia: ${fm}.`;
  else if (tipo === "notaria" && /testamento/i.test(s.que)) pide = `1. Copia autorizada del último testamento otorgado por el causante ante el notario [nombre del notario] el [fecha], número de protocolo [protocolo], según consta en el certificado del Registro General de Actos de Última Voluntad que se acompaña.\n\n2. Indicación de los honorarios y de la forma de pago y recogida.`;
  else pide = `1. ${s.que ? s.que.charAt(0).toUpperCase() + s.que.slice(1) : "[qué se solicita]"}.${Bs.length ? `\n\nBienes a los que se refiere: ${Bs.map(tcBienN).join("; ")}.` : ""}\n\n2. Que nos indiquen, en su caso, la documentación adicional que necesitan y el plazo previsto de respuesta.`;
  const saludo = tipo === "notaria" || tipo === "registro" ? "Estimados señores:" : "Muy señores nuestros:";
  return `${tcCabecera(x, s, s.que || "Solicitud de información")}\n\n${saludo}\n\nLes comunicamos que ${gnTrat(gnCaus(x))}${tcCausante(x)}, con NIF ${x.nifCausante || "[NIF]"} y último domicilio en ${x.domicilioCausante || "[domicilio]"}, falleció el ${fm}.\n\nNos dirigimos a ustedes ${en}. ${cons}\n\nSolicitamos:\n\n${pide}\n\n${resp}\n\n${tcFirma(x, tipo === "aseguradora")}\n\n${TC_ADJ}`;
}
function tcHechos(x, s) {
  const H = [`El ${fechaLarga(s.enviada)} solicitamos a ${tcNombre(s)}: ${String(s.que || "la información indicada").replace(/\.$/, "")}.`];
  (s.recordatorios || []).forEach((f) => H.push(`El ${fechaLarga(f)} reiteramos la solicitud.`));
  return H;
}
function tcReclamacion(x, s) {
  const N = tcDias(s) ?? 0, tipo = s.tercero?.tipo, prev = s.recordatorios || [];
  const sup = TC_SUP[tipo];
  const aviso = sup ? `\n\nSi no recibimos respuesta, presentaremos queja ante su Servicio de Atención al Cliente y, en su caso, reclamación ante ${tipo === "banco" ? "el Banco de España" : "la Dirección General de Seguros y Fondos de Pensiones"}.` : "";
  const fund = tipo === "banco" ? "\n\nLes recordamos que, según los criterios del Banco de España, los herederos tienen derecho a obtener el certificado de posiciones a la fecha del fallecimiento, los movimientos y copia de los contratos antes incluso de aceptar la herencia." : tipo === "aseguradora" && /pago|prestaci|cobro|capital/i.test(s.que || "") ? "\n\nLes recordamos que el asegurador debe pagar, dentro de los cuarenta días siguientes a la recepción de la declaración del siniestro, el importe mínimo de lo que pueda deber (art. 18 de la Ley 50/1980, de Contrato de Seguro), y que incurre en mora si no cumple su prestación en el plazo de tres meses desde el siniestro (art. 20)." : "";
  return `${tcCabecera(x, s, `Reiteración de nuestra solicitud de ${fechaCorta(s.enviada)}: ${String(s.que || "información").replace(/\.$/, "")}`)}\n\nMuy señores nuestros:\n\nEl ${fechaLarga(s.enviada)} les remitimos, en nombre de los llamados a la herencia, la solicitud de ${String(s.que || "información").replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}${prev.length ? `, que reiteramos el ${prev.map(fechaLarga).join(" y el ")}` : ""}. Han transcurrido ${N} días sin que hayamos recibido respuesta ni la documentación solicitada.\n\nLes rogamos que nos la faciliten en el plazo de diez días o que nos indiquen por escrito qué documentación adicional necesitan y la fecha prevista de respuesta.${fund}${aviso}\n\nSe acompaña copia de nuestra solicitud de ${fechaLarga(s.enviada)}.\n\n${tcFirma(x, false)}`;
}
// nivel: "sac" (queja al servicio de atención al cliente) o "supervisor" (Banco de España / DGSFP). Por defecto, el siguiente paso.
function tcEscalado(x, s, nivel) {
  const tipo = s.tercero?.tipo, sup = TC_SUP[tipo]; if (!sup) return "";
  nivel = nivel || (s.sac ? "supervisor" : "sac");
  const N = tcDias(s) ?? 0, H = tcHechos(x, s), r = tcRemite(x), ent = tcNombre(s);
  const ORD = ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto", "Séptimo"];
  const plazos = tipo === "banco" ? "con carácter general, un mes desde su presentación si el reclamante es consumidor; quince días hábiles si se refiere a servicios de pago (cuentas, transferencias, tarjetas); y dos meses si no es consumidor" : "un mes desde su presentación si el reclamante es consumidor y dos meses si no lo es";
  const valores = tcBienesDe(x, s).some((b) => b.tipo === "valores" || b.tipo === "fondos");
  const reclamante = `Reclamante: ${r.abogado}, ${gnAbogado(r.ab)} de ${r.despacho}, ${tcEnNombre(x)}.\nCausante: ${gnTrat(gnCaus(x))}${tcCausante(x)} (NIF ${x.nifCausante || "[NIF]"}), ${gnO(gnCaus(x), "fallecido", "fallecida", "que falleció")} el ${fechaLarga(x.fecha)}.${r.ref ? "\nReferencia: " + r.ref : ""}`;
  if (nivel === "sac") {
    H.push(`A la fecha de esta queja han transcurrido ${N} días desde la primera solicitud sin que la entidad haya facilitado la documentación ni indicado el motivo del retraso.`);
    return `AL SERVICIO DE ATENCIÓN AL CLIENTE DE ${ent.toUpperCase()}\n${tipo === "aseguradora" ? "O, EN SU CASO, AL DEFENSOR DEL ASEGURADO" : "O, EN SU CASO, AL DEFENSOR DEL CLIENTE"}\n[dirección o canal del servicio de atención al cliente]\n\nQUEJA POR FALTA DE RESPUESTA\n\n${reclamante}\n\nHECHOS\n\n${H.map((h, i) => `${ORD[i]}. ${h}`).join("\n\n")}\n\nSOLICITAMOS\n\n1. Que se nos facilite la documentación solicitada.\n\n2. Que se nos informe por escrito del motivo del retraso y de la fecha en que se entregará.\n\n3. Que se acuse recibo de esta queja con indicación de su fecha de presentación.\n\nSe acompaña: copia de la solicitud de ${fechaLarga(s.enviada)}${(s.recordatorios || []).length ? " y de su reiteración" : ""}, certificado de defunción, certificado de últimas voluntades y título sucesorio, DNI de los llamados a la herencia y autorización a favor del despacho.\n\nEn ${r.lugar}, a ${fechaLarga(tcHoy())}.\n\nFdo.: ${r.abogado}\n\n${REV(`plazo de respuesta del servicio de atención al cliente: ${plazos} (${tipo === "banco" ? "Banco de España, «Cómo realizar una reclamación»" : "DGSFP, guía de reclamaciones"}). La Ley 10/2025, de servicios de atención a la clientela, ha modificado este régimen (nueva redacción de la Ley 44/2002 y derogación de los arts. 10 a 12 de la Orden ECO/734/2004): confirmar el plazo aplicable. Conservar el acuse de recibo: la queja previa es requisito para reclamar después ante ${sup.n}.`)}`;
  }
  H.push(`El ${s.sac ? fechaLarga(s.sac) : "[fecha]"} presentamos queja ante el Servicio de Atención al Cliente de la entidad, que [no ha respondido en el plazo establecido / la ha desestimado mediante escrito de fecha [fecha]].`);
  H.push(`A la fecha de esta reclamación han transcurrido ${N} días desde la primera solicitud${s.sac ? ` y ${dias(s.sac, tcHoy())} desde la queja` : ""}.`);
  const fund = tipo === "banco" ? "Los herederos tienen derecho a obtener de la entidad el certificado de posiciones del causante a la fecha del fallecimiento, los movimientos y copia de los contratos, antes incluso de aceptar la herencia (criterios del Banco de España, Portal del Cliente Bancario, «Herencias»). La entidad no ha atendido la solicitud ni la queja posterior con la diligencia exigible." : `La entidad no ha atendido la solicitud de información de los beneficiarios y llamados a la herencia ni la queja posterior.${/pago|prestaci|cobro|capital/i.test(s.que || "") ? " El asegurador debe pagar el importe mínimo de lo que pueda deber dentro de los cuarenta días siguientes a la declaración del siniestro e incurre en mora a los tres meses (Ley 50/1980, arts. 18 y 20)." : ""}`;
  const pronto = s.sac && dias(s.sac, tcHoy()) < 30 ? REV(`aún no ha transcurrido un mes desde la queja al servicio de atención al cliente (presentada el ${fechaLarga(s.sac)}): salvo que sea una queja sobre servicios de pago (quince días hábiles) o que ya haya respuesta desestimatoria, la reclamación puede no admitirse.`) + "\n\n" : "";
  return `${pronto}${sup.al}\n${sup.dep}\n${sup.dir}\n\nRECLAMACIÓN CONTRA ${ent.toUpperCase()}\n\n${reclamante}\nEntidad reclamada: ${ent}${tipo === "banco" ? ", oficina [número]" : ""}.\n\nHECHOS\n\n${H.map((h, i) => `${ORD[i]}. ${h}`).join("\n\n")}\n\nFUNDAMENTOS\n\n${fund}\n\nSOLICITAMOS\n\nQue se admita esta reclamación, se dé traslado a ${ent} para que facilite la documentación solicitada y se emita el correspondiente pronunciamiento sobre su actuación.\n\nSe acompaña: copia de la solicitud de ${fechaLarga(s.enviada)}${(s.recordatorios || []).length ? ", de su reiteración" : ""}, de la queja ante el servicio de atención al cliente con su acuse de recibo y, en su caso, de su respuesta; certificado de defunción; título sucesorio; DNI de los llamados a la herencia y acreditación de la representación.\n\nEn ${r.lugar}, a ${fechaLarga(tcHoy())}.\n\nFdo.: ${r.abogado}\n\n${REV(`requisito previo: queja ante el servicio de atención al cliente y respuesta desestimatoria o transcurso de su plazo (${plazos}).${tipo === "banco" ? " Plazo para reclamar al Banco de España: un año desde la reclamación ante la entidad (Portal del Cliente Bancario). Se presenta en la sede electrónica del Banco de España o por escrito a la dirección indicada." : " Se presenta en la sede electrónica de la DGSFP o por escrito a la dirección indicada."}${valores ? " Si la solicitud se refiere a valores o fondos de inversión, el supervisor competente puede ser la CNMV: comprobarlo." : ""} Comprobar si, tras la Ley 10/2025, el procedimiento o el órgano competente han cambiado.`)}`;
}
const TC_DOCS = { carta: "Carta", reclamacion: "Reclamación", sac: "Queja al servicio de atención al cliente", supervisor: "Reclamación al supervisor" };
const tcDocTit = (s, doc) => (doc === "supervisor" ? "Reclamación al " + (TC_SUP[s.tercero?.tipo]?.corto || "supervisor") : doc === "carta" ? "Solicitud a " + tcNombre(s) : doc === "reclamacion" ? "Reiteración a " + tcNombre(s) : "Queja al servicio de atención al cliente");
function tcTexto(x, s, doc) { return esrHuecos((doc === "reclamacion" ? tcReclamacion(x, s) : doc === "sac" ? tcEscalado(x, s, "sac") : doc === "supervisor" ? tcEscalado(x, s, "supervisor") : tcCarta(x, s)).replace(/\r/g, "")); }
function tcPdf(x, s, doc) {
  const texto = tcTexto(x, s, doc), tit = tcDocTit(s, doc);
  const bytes = pdfDocumento({ titulo: tit, subtitulo: x.nombre || "", despacho: pdfDespacho(x), ref: x.despacho?.ref || "", texto, marcaAgua: /⟦/.test(texto) ? "Borrador" : "" });
  return pdfDescargar(tit + " " + (x.nombre || "herencia"), bytes);
}

// ── Recordatorio a la familia ─────────────────────────────────
function tcRecordatorio(x) {
  const F = tcFamilia(x), r = tcRemite(x);
  const cli = tcPila(x.despacho?.cliente || x.familia?.contacto?.nombre || "");
  const l = typeof familiaEnlace === "function" && !x.familia ? familiaEnlace(x) : "";
  const docs = F.docs.map(([id, t, sb]) => `· ${t}${sb && id !== "dni" && sb.length < 60 ? " (" + (/^(Para|Acredita|Son|Valor|Importe|Hipoteca|Ante|Y|Se|Con) /.test(sb) ? sb.charAt(0).toLowerCase() + sb.slice(1) : sb) + ")" : ""}`).join("\n");
  const texto = F.docs.length
    ? `Hola${cli ? " " + cli : ""}:\n\nSeguimos avanzando con la herencia de ${x.nombre || "tu familiar"}. Para el siguiente paso nos faltan estos documentos:\n\n${docs}\n\nPuedes enviarlos en foto legible o escaneados, por aquí o por correo. Si alguno cuesta conseguirlo, dínoslo y lo pedimos nosotros.${l ? `\n\nSi aún no has rellenado el cuestionario de la familia, este es el enlace (unos diez minutos):\n${l}` : ""}\n\nGracias, y cualquier duda nos dices.\n${r.abogado.startsWith("[") ? "" : r.abogado + " · "}${r.despacho.startsWith("[") ? "" : r.despacho}`.replace(/\n$/, "")
    : "";
  return { texto: texto.trim(), asunto: `Documentos pendientes · herencia de ${x.nombre || "tu familiar"}`, docs: F.docs.map(([id]) => id) };
}
function tcRegistrarRecordatorio(x, canal) {
  const M = tcRecordatorio(x); if (!M.docs.length) return;
  x.recordatorios = Array.isArray(x.recordatorios) ? x.recordatorios : [];
  x.recordatorios.push({ fecha: tcHoy(), canal, docs: M.docs });
  anotar(x, `Recordatorio a la familia (${canal}): ${tcPlural(M.docs.length, "documento pendiente", "documentos pendientes")}`, "nota");
}

// ── Vista ─────────────────────────────────────────────────────
const tcPill = (s) => `<span class="tc-pill est-${s.estado}">${TC_EST[s.estado] || s.estado}</span>`;
const tcTile = (s, sm) => { const m = tcMono(s); return `<span class="tc-mono t-${s.tercero?.tipo || "otro"}${sm ? " sm" : ""}${m.length > 2 ? " w" + m.length : ""}" aria-hidden="true">${esc(m)}</span>`; };
function tcBarra(s) {
  if (!s.enviada) return "";
  const d = tcDias(s), p = tcPlazo(s), pct = Math.min(100, (d / p) * 100);
  return `<div class="tc-bar ${tcNivel(s)}" role="img" aria-label="${d} de ${p} días"><i style="width:${Math.max(2, pct).toFixed(1)}%"></i>${d > p ? `<em style="left:${((p / d) * 100).toFixed(1)}%"></em>` : ""}</div>`;
}
function tcMeta(s) {
  const d = tcDias(s), p = tcPlazo(s);
  if (s.estado === "recibida") return `Enviada ${s.enviada ? fechaCorta(s.enviada) : "—"} · recibida ${fechaCorta(s.recibida)}${d != null ? ` · ${tcPlural(d, "día")}` : ""}`;
  if (!s.enviada) return `Sin enviar · plazo orientativo ${p} días`;
  const ex = [];
  if ((s.recordatorios || []).length) ex.push(`reclamada ${fechaCorta(s.recordatorios[s.recordatorios.length - 1])}`);
  if (s.sac) ex.push(`queja al SAC ${fechaCorta(s.sac)}`);
  if (s.supervisor) ex.push(`${TC_SUP[s.tercero?.tipo]?.corto || "supervisor"} ${fechaCorta(s.supervisor)}`);
  return `Enviada ${fechaCorta(s.enviada)} · <b class="tc-d ${tcNivel(s)}">${tcPlural(d, "día")}</b> de ${p}${d > p ? ` · <span class="tc-venc">vencida hace ${tcPlural(d - p, "día")}</span>` : ""}${ex.length ? " · " + ex.join(" · ") : ""}`;
}
function tcAcciones(s) {
  const A = [];
  if (s.estado === "recibida") return `<button class="btn sm gray" data-tc="reabrir" data-id="${s.id}">Reabrir</button>`;
  if (!s.enviada) A.push(`<button class="btn sm" data-tc="enviada" data-id="${s.id}">Marcar enviada</button>`, `<button class="btn sm gray" data-tc="doc" data-doc="carta" data-id="${s.id}">Carta</button>`);
  else {
    A.push(`<button class="btn sm ${tcNivel(s) === "ok" ? "gray" : ""}" data-tc="recibida" data-id="${s.id}">Recibida</button>`);
    A.push(`<button class="btn sm ${tcVencida(s) && !tcEscalable(s) ? "tint" : "gray"}" data-tc="doc" data-doc="reclamacion" data-id="${s.id}">Reclamar</button>`);
    if (tcEscalable(s)) A.push(`<button class="btn sm ${s.estado === "escalada" ? "gray" : "tint"} tc-esc" data-tc="doc" data-doc="${s.sac ? "supervisor" : "sac"}" data-id="${s.id}">${s.sac ? "Al " + TC_SUP[s.tercero.tipo].corto : "Escalar"}</button>`);
    A.push(`<button class="btn sm gray" data-tc="doc" data-doc="carta" data-id="${s.id}">Carta</button>`);
  }
  return A.join("");
}
function tcFila(x, s) {
  return `<div class="tc-row lv-${tcNivel(s)} ${s.estado === "recibida" ? "done" : ""}">
    ${tcTile(s)}
    <div class="tc-main"><div class="tc-h"><button class="tc-name" data-tc="editar" data-id="${s.id}" title="Editar la solicitud">${esc(tcNombre(s))}</button>${tcPill(s)}</div>
      <div class="tc-que"><span class="tc-tipo">${esc(tcTipoN(s.tercero?.tipo))}</span> · ${esc(s.que || "Sin descripción")}</div>
      ${tcBarra(s)}<div class="tc-meta">${tcMeta(s)}</div>${tcSinNombre(s) ? `<div class="tc-falta">Indica la entidad para preparar la carta. <button class="link" data-tc="editar" data-id="${s.id}">Completar</button></div>` : ""}</div>
    <div class="tc-acts">${tcAcciones(s)}</div></div>`;
}
function tcBloqueFamilia(x) {
  const F = tcFamilia(x), M = tcRecordatorio(x);
  const tel = tcTel(x.despacho?.tel || x.familia?.contacto?.tel), mail = tcEmail(x.despacho?.email || x.familia?.contacto?.email);
  const est = !F.docs.length ? `<span class="tc-chip ok">Nada pendiente</span>` : F.ultimo ? `<span class="tc-chip ${F.toca ? "warn" : ""}">Último recordatorio hace ${tcPlural(F.dias, "día")}${F.toca ? " · toca recordar" : ""}</span>` : `<span class="tc-chip warn">Sin recordatorios enviados</span>`;
  const quien = x.despacho?.cliente || x.familia?.contacto?.nombre || "";
  return `<div class="card tc-fam ${F.toca ? "toca" : ""}">
    <div class="tc-fam-h"><span class="tc-fam-ic" aria-hidden="true">${I.person}</span><div class="tc-fam-t"><div class="k">Documentos de la familia${quien ? " · " + esc(quien) : ""}</div><h3>${F.docs.length ? `Faltan ${tcPlural(F.docs.length, "documento")}` : "La familia ha entregado todo lo pedido"}</h3>${est}</div>
    ${F.docs.length ? `<div class="tc-fam-a"><button class="btn sm" data-tc="famWa">Enviar por WhatsApp</button><button class="btn sm gray" data-tc="famMail">Correo</button><button class="btn sm gray" data-tc="famCopy">Copiar</button></div>` : ""}</div>
    ${F.docs.length ? `<details class="tc-fam-d"><summary>Ver el mensaje${tel ? " · se envía al " + esc(x.despacho?.tel || x.familia?.contacto?.tel) : ""}${mail ? "" : ""}</summary><pre class="tc-msg">${esc(M.texto)}</pre></details>` : ""}
    ${(x.recordatorios || []).length ? `<div class="tc-fam-log">${x.recordatorios.slice(-4).reverse().map((r) => `<span>${fechaCorta(r.fecha)} · ${esc(r.canal)} · ${tcPlural((r.docs || []).length, "doc.", "docs.")}</span>`).join("")}</div>` : ""}
  </div>`;
}
function tcBloqueSug(x) {
  const S = tcSugerencias(x); if (!S.length) return "";
  return `<div class="sectitle flex"><b>Sugeridas para este caso</b><span>${S.length}</span></div>
    <div class="group tc-sug">${S.map((g) => { const s = { tercero: { tipo: g.tipo, nombre: g.nombre } }; return `<div class="tc-srow">${tcTile(s, 1)}<div class="tc-main"><b>${esc(g.nombre || (g.tipo === "banco" ? "Entidad bancaria sin identificar" : g.tipo === "aseguradora" ? "Aseguradora sin identificar" : tcTipoN(g.tipo)))}</b><small>${esc(g.que)}</small><small class="tc-mot">${esc(g.motivo || "")} · plazo orientativo ${g.plazoEsperado} días</small></div><div class="tc-sacts"><button class="btn sm tint" data-tc="aceptar" data-clave="${esc(g.clave)}">Añadir</button><button class="tbtn tc-x" data-tc="descartar" data-clave="${esc(g.clave)}" aria-label="Descartar sugerencia" title="Descartar">${I.trash}</button></div></div>`; }).join("")}
    ${S.length > 1 ? `<div class="tc-sfoot"><button class="link" data-tc="aceptarTodas">Añadir las ${S.length}</button></div>` : ""}</div>`;
}
function tTerceros(x, R) {
  const L = tcL(x), ab = L.filter(tcAbierta), env = ab.filter((s) => s.enviada), venc = ab.filter(tcVencida), rec = L.filter((s) => s.estado === "recibida");
  const vieja = env.slice().sort((a, b) => tcDias(b) - tcDias(a))[0];
  const hero = `<div class="card tc-hero">
    <div class="tc-k"><span class="k">Pendientes</span><b class="num">${ab.length}</b><small>${venc.length ? `<span class="tc-venc">${tcPlural(venc.length, "vencida")}</span>` : ab.length - env.length ? `${ab.length - env.length} por enviar` : ab.length ? "en plazo" : "sin solicitudes abiertas"}</small></div>
    <div class="tc-k"><span class="k">La más antigua</span><b class="num">${vieja ? tcPlural(tcDias(vieja), "día") : "—"}</b><small>${vieja ? esc(tcNombre(vieja)) : "nada enviado"}</small></div>
    <div class="tc-k"><span class="k">Recibidas</span><b class="num">${rec.length}<span class="tc-de"> de ${L.length}</span></b><div class="tc-prog"><i style="width:${L.length ? (rec.length / L.length) * 100 : 0}%"></i></div></div>
    <div class="tc-hero-a"><button class="btn sm" data-tc="nueva">${I.plus || ""}Añadir solicitud</button></div></div>`;
  const grupos = TC_EST_ORDEN.map((e) => {
    const G = L.filter((s) => s.estado === e).sort((a, b) => (tcDias(b) ?? -1) / tcPlazo(b) - (tcDias(a) ?? -1) / tcPlazo(a));
    if (!G.length) return "";
    const filas = `<div class="group tc-list">${G.map((s) => tcFila(x, s)).join("")}</div>`;
    return e === "recibida" ? `<details class="tc-recib"><summary class="sectitle flex"><b>${TC_EST_TIT[e]}</b><span>${G.length}</span></summary>${filas}</details>` : `<div class="sectitle flex"><b>${TC_EST_TIT[e]}</b><span>${G.length}</span></div>${filas}`;
  }).join("");
  const vacio = !L.length && !tcSugerencias(x).length ? `<div class="card empty tc-empty"><b>Sin solicitudes a terceros</b>Añade las sugeridas o crea una: cada banco, aseguradora, registro o notaría con su fecha de envío, sus días y el siguiente escrito preparado.</div>` : "";
  const refs = `<details class="tc-refs"><summary>Fuentes y estado de verificación</summary><ul>${TC_REFS.map(([t, n, e]) => `<li><span class="tag ${e === "VERIFICADO" ? "V" : "P"}">${e === "VERIFICADO" ? "Verificado" : "En verificación"}</span> ${esc(t)} <span class="tc-norma">${esc(n)}</span></li>`).join("")}</ul></details>`;
  return `<div class="tc">${hero}${tcBloqueFamilia(x)}${tcBloqueSug(x)}${vacio}${grupos}${refs}<p class="foot-note">Los plazos esperados son orientativos y se ajustan en cada solicitud. Los escritos son borradores: los revisa y los envía el abogado.</p></div>`;
}
function tcResumen(x) {
  const P = tcPendientes(x), F = tcFamilia(x), S = tcSugerencias(x), borr = tcL(x).filter((s) => s.estado === "borrador").length;
  if (!P.length && !S.length && !borr && !F.docs.length) return "";
  const top = P[0];
  const h = P.length ? `${tcPlural(P.length, "solicitud pendiente", "solicitudes pendientes")} · ${esc(top.tercero)} ${tcPlural(top.dias, "día")}` : borr ? `${tcPlural(borr, "solicitud por enviar", "solicitudes por enviar")}` : S.length ? `${tcPlural(S.length, "solicitud sugerida", "solicitudes sugeridas")} para este caso` : "Sin solicitudes abiertas";
  const filas = P.slice(0, 3).map((p) => { const s = tcSol(x, p.id); return `<button class="tc-mrow" data-sec="${TC_SEC}">${tcTile(s, 1)}<span class="tc-mt"><b>${esc(p.tercero)}</b><small>${esc(p.que)}</small>${tcBarra(s)}</span><span class="tc-md ${tcNivel(s)}">${p.dias} d</span></button>`; }).join("");
  const fam = F.docs.length ? `<div class="tc-mfam"><span class="dot ${F.toca ? "warn" : "ok"}"></span>Familia: faltan ${tcPlural(F.docs.length, "documento")}${F.ultimo ? ` · último recordatorio hace ${tcPlural(F.dias, "día")}` : " · sin recordatorios"}</div>` : "";
  return `<div class="card tc-mini"><div class="card-h"><div><div class="k">Terceros</div><h3>${h}</h3></div><button class="link" data-sec="${TC_SEC}">Ver terceros ›</button></div>${filas ? `<div class="tc-mlist">${filas}</div>` : ""}${fam}</div>`;
}

// ── Hojas: alta/edición y escritos ────────────────────────────
function tcSheet(x) {
  const sh = ui.sheet || {}; if (!x) return "";
  if (sh.modo === "doc") {
    const s = tcSol(x, sh.id); if (!s) return "";
    const docs = ["carta", "reclamacion"].concat(TC_SUP[s.tercero?.tipo] ? ["sac", "supervisor"] : []);
    const doc = docs.includes(sh.doc) ? sh.doc : "carta", t = tcTexto(x, s, doc), mail = tcEmail(s.tercero?.contacto);
    const reg = { carta: s.enviada ? "" : "Marcar como enviada hoy", reclamacion: s.enviada ? "Registrar la reclamación de hoy" : "", sac: s.enviada ? (s.sac ? "" : "Registrar la queja de hoy") : "", supervisor: s.sac && !s.supervisor ? "Registrar la reclamación de hoy" : "" }[doc];
    const lab = { carta: "Carta", reclamacion: "Reclamación", sac: "Queja al SAC", supervisor: TC_SUP[s.tercero?.tipo]?.corto || "Supervisor" };
    return sheetHTML(tcNombre(s), `<div class="seg tc-seg">${docs.map((k) => `<button data-tc="doc" data-doc="${k}" data-id="${s.id}" aria-pressed="${k === doc}">${lab[k]}</button>`).join("")}</div>
      <div class="tc-docbar"><button class="btn sm" data-tc="pdf" data-doc="${doc}" data-id="${s.id}">${I.dl}PDF</button><button class="btn sm gray" data-tc="word" data-doc="${doc}" data-id="${s.id}">Word</button><button class="btn sm gray" data-tc="copiar" data-doc="${doc}" data-id="${s.id}">Copiar texto</button>${mail ? `<button class="btn sm gray" data-tc="mail" data-doc="${doc}" data-id="${s.id}">Correo a ${esc(mail)}</button>` : ""}${reg ? `<button class="btn sm tint" data-tc="registrar" data-doc="${doc}" data-id="${s.id}">${reg}</button>` : ""}</div>
      ${doc === "supervisor" && !s.sac ? `<p class="tc-aviso">Antes de reclamar al ${esc(TC_SUP[s.tercero.tipo].corto)} hay que presentar la queja al servicio de atención al cliente de la entidad y esperar su respuesta o el plazo.</p>` : ""}
      <div class="paperview">${esrVista(t)}</div><p class="foot-note" style="text-align:center">Borrador. Lo revisa un abogado antes de firmarlo o enviarlo.</p>`, "Cerrar", "wide");
  }
  const s = sh.id ? tcSol(x, sh.id) : null, v = s || { tercero: { tipo: sh.tipoIni || "banco", nombre: "", contacto: "" }, que: TC_TIPOS[sh.tipoIni || "banco"].que, enviada: "", plazoEsperado: TC_TIPOS[sh.tipoIni || "banco"].plazo, notas: "", bienId: "" };
  const tipo = v.tercero?.tipo || "otro";
  const conf = ui.tcConfirmar === (s && s.id);
  return sheetHTML(s ? "Editar solicitud" : "Añadir solicitud", `<div class="group tc-form">
      <div class="field"><label for="tc-f-tipo">Tipo de tercero</label><select id="tc-f-tipo" data-tc-tipo>${TC_ORDEN_T.map((k) => `<option value="${k}" ${k === tipo ? "selected" : ""}>${TC_TIPOS[k].n}</option>`).join("")}</select></div>
      <div class="field"><label for="tc-f-nombre">Entidad u organismo</label><input id="tc-f-nombre" list="tc-dl" autocomplete="off" placeholder="Ej.: Banco Santander, Registro de la Propiedad de Marbella n.º 3" value="${esc(v.tercero?.nombre || "")}"><datalist id="tc-dl">${TC_ENTIDADES.map(([n]) => `<option value="${esc(n)}">`).join("")}</datalist></div>
      <div class="field"><label for="tc-f-contacto">Contacto (correo, teléfono u oficina)</label><input id="tc-f-contacto" placeholder="testamentarias@entidad.es · oficina 0234" value="${esc(v.tercero?.contacto || "")}"></div>
      <div class="field"><label for="tc-f-que">Qué se pide</label><textarea id="tc-f-que" rows="3" data-auto="${s ? 0 : 1}">${esc(v.que || "")}</textarea></div>
      <div class="field"><label for="tc-f-bien">Bien relacionado</label><select id="tc-f-bien"><option value="">Ninguno en concreto</option>${(x.bienes || []).map((b) => `<option value="${b.id}" ${b.id === v.bienId ? "selected" : ""}>${esc(tcBienN(b))}</option>`).join("")}</select></div>
      <div class="tc-2"><div class="field"><label for="tc-f-env">Fecha de envío</label><input id="tc-f-env" type="date" value="${esc(v.enviada || "")}" max="${tcHoy()}"></div><div class="field"><label for="tc-f-plazo">Plazo esperado (días)</label><input id="tc-f-plazo" inputmode="numeric" value="${num(v.plazoEsperado) || TC_TIPOS[tipo].plazo}"></div></div>
      <div class="field"><label for="tc-f-notas">Notas</label><textarea id="tc-f-notas" rows="2" placeholder="Persona de contacto, documentación que han pedido, llamadas…">${esc(v.notas || "")}</textarea></div>
    </div>
    <p class="group-foot">Sin fecha de envío queda como «por enviar». El plazo esperado es orientativo: sirve para avisar y preparar la reclamación.</p>
    <div class="tc-formacts"><button class="btn" data-tc="guardar" ${s ? `data-id="${s.id}"` : ""}>${s ? "Guardar cambios" : "Añadir solicitud"}</button>${s ? `<button class="btn ${conf ? "danger" : "gray"}" data-tc="borrar" data-id="${s.id}">${conf ? "Confirmar: eliminar" : "Eliminar"}</button>` : ""}</div>`, "Cerrar");
}

// ── Acciones (un único oyente delegado) ───────────────────────
function tcAbrir(sheet) { ui.sheet = { tipo: "tc", ...sheet }; render(); }
function tcGuardarForm(x, id) {
  const val = (k) => (document.getElementById("tc-f-" + k)?.value || "").trim();
  const nombre = val("nombre"); if (!nombre) { toast("Indica la entidad u organismo"); document.getElementById("tc-f-nombre")?.focus(); return false; }
  const tipo = TC_TIPOS[val("tipo")] ? val("tipo") : "otro", env = val("env"), plazo = Math.max(1, Math.round(num(val("plazo"))) || TC_TIPOS[tipo].plazo), bienId = val("bien");
  let s = id ? tcSol(x, id) : null;
  if (!s) { s = tcNueva({ tipo, nombre }); tcL(x).push(s); anotar(x, `Solicitud a terceros creada: ${nombre}`, "sistema"); }
  s.tercero = { ...(s.tercero || {}), tipo, nombre, contacto: val("contacto") };
  s.que = val("que"); s.notas = val("notas"); s.plazoEsperado = plazo;
  if (bienId !== (s.bienId || "")) { s.bienId = bienId; s.bienIds = bienId ? [bienId] : []; }
  if (env && env !== s.enviada) { if (!s.enviada) anotar(x, `Solicitud enviada a ${nombre}: ${s.que}`, "nota"); s.enviada = env; if (s.estado === "borrador") s.estado = "enviada"; }
  if (!env && s.enviada && s.estado !== "recibida") { s.enviada = ""; s.estado = "borrador"; }
  return true;
}
function tcMarcarDocs(x, s, v) { if (!(s.docs || []).length) return; x.despacho = x.despacho || {}; x.despacho.docs = x.despacho.docs || {}; for (const id of s.docs) { if (v) x.despacho.docs[id] = true; } }
function tcRegistrar(x, s, doc) {
  const h = tcHoy(), n = tcNombre(s);
  if (doc === "carta" && !s.enviada) { s.enviada = h; s.estado = "enviada"; anotar(x, `Solicitud enviada a ${n}: ${s.que}`, "nota"); return "Marcada como enviada"; }
  if (doc === "reclamacion" && s.enviada) { s.recordatorios = s.recordatorios || []; if (!s.recordatorios.includes(h)) s.recordatorios.push(h); if (s.estado === "enviada") s.estado = "reclamada"; anotar(x, `Reclamación a ${n} (${tcPlural(tcDias(s), "día")} desde el envío)`, "nota"); return "Reclamación registrada"; }
  if (doc === "sac" && s.enviada && !s.sac) { s.sac = h; s.estado = "escalada"; anotar(x, `Queja al servicio de atención al cliente de ${n}`, "nota"); return "Queja registrada"; }
  if (doc === "supervisor" && s.sac && !s.supervisor) { s.supervisor = h; s.estado = "escalada"; anotar(x, `Reclamación ante ${TC_SUP[s.tercero?.tipo]?.n || "el supervisor"} contra ${n}`, "nota"); return "Reclamación registrada"; }
  return "";
}
function tcClick(e) {
  const el = e.target.closest && e.target.closest("[data-tc]"); if (!el || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.tagName === "INPUT") return;
  e.preventDefault(); e.stopPropagation();
  const x = typeof exp === "function" ? exp() : null; if (!x) return;
  const d = el.dataset, a = d.tc, s = d.id ? tcSol(x, d.id) : null;
  const fin = (msg) => { guardar(); render(); if (msg) toast(msg); };
  try {
    if (a === "nueva") { ui.tcConfirmar = null; return tcAbrir({ modo: "form", id: null }); }
    if (a === "editar" && s) { ui.tcConfirmar = null; return tcAbrir({ modo: "form", id: s.id }); }
    if (a === "guardar") { if (tcGuardarForm(x, d.id)) { ui.sheet = null; fin(d.id ? "Solicitud actualizada" : "Solicitud añadida"); } return; }
    if (a === "borrar" && s) { if (ui.tcConfirmar !== s.id) { ui.tcConfirmar = s.id; render(); return; } x.solicitudes = tcL(x).filter((q) => q !== s); ui.tcConfirmar = null; ui.sheet = null; anotar(x, `Solicitud eliminada: ${tcNombre(s)}`, "sistema"); return fin("Solicitud eliminada"); }
    if (a === "aceptar" || a === "aceptarTodas") {
      const G = tcSugerencias(x).filter((g) => a === "aceptarTodas" || g.clave === d.clave); if (!G.length) return;
      const nuevas = G.map((g) => tcNueva(g)); tcL(x).push(...nuevas);
      anotar(x, nuevas.length === 1 ? `Solicitud a terceros añadida: ${tcNombre(nuevas[0])}` : `${nuevas.length} solicitudes a terceros añadidas`, "sistema");
      if (nuevas.length === 1 && tcSinNombre(nuevas[0])) { guardar(); return tcAbrir({ modo: "form", id: nuevas[0].id }); }
      return fin(nuevas.length === 1 ? "Solicitud añadida" : `${nuevas.length} solicitudes añadidas`);
    }
    if (a === "descartar") { x.solicitudesDescartadas = [...new Set([...(x.solicitudesDescartadas || []), d.clave])]; return fin("Sugerencia descartada"); }
    if (a === "enviada" && s) { if (tcSinNombre(s)) { toast("Indica antes la entidad"); return tcAbrir({ modo: "form", id: s.id }); } return fin(tcRegistrar(x, s, "carta")); }
    if (a === "recibida" && s) { s.recibida = tcHoy(); s.estado = "recibida"; tcMarcarDocs(x, s, true); anotar(x, `Recibido de ${tcNombre(s)}: ${s.que}${tcDias(s) != null ? ` (${tcPlural(tcDias(s), "día")})` : ""}`, "nota"); return fin("Marcada como recibida" + ((s.docs || []).length ? " · documentación al día" : "")); }
    if (a === "reabrir" && s) { s.recibida = ""; s.estado = s.supervisor || s.sac ? "escalada" : (s.recordatorios || []).length ? "reclamada" : s.enviada ? "enviada" : "borrador"; anotar(x, `Solicitud reabierta: ${tcNombre(s)}`, "sistema"); return fin("Solicitud reabierta"); }
    if (a === "doc" && s) { if (tcSinNombre(s)) { toast("Indica antes la entidad"); return tcAbrir({ modo: "form", id: s.id }); } return tcAbrir({ modo: "doc", id: s.id, doc: d.doc || "carta" }); }
    if (a === "pdf" && s) { tcPdf(x, s, d.doc); anotar(x, `PDF descargado: ${tcDocTit(s, d.doc)}`, "doc"); guardar(); return; }
    if (a === "word" && s) { descargar(`${tcDocTit(s, d.doc)} - ${x.nombre || "herencia"}`.replace(/[\\/:*?"<>|]/g, "") + ".docx", docx(tcTexto(x, s, d.doc), esrDocxOpts(x, tcDocTit(s, d.doc)))); anotar(x, `Escrito descargado: ${tcDocTit(s, d.doc)}`, "doc"); guardar(); return; }
    if (a === "copiar" && s) { copiar(tcTexto(x, s, d.doc).replace(/⟦REVISI[^⟧]*⟧\s*/g, "").replace(/⟦([^⟧]*)⟧/g, "[$1]").trim()); return; }
    if (a === "mail" && s) { const m = tcEmail(s.tercero?.contacto); abrirExterno(`mailto:${m}?subject=${encodeURIComponent(tcDocTit(s, d.doc) + (x.despacho?.ref ? " · Ref. " + x.despacho.ref : ""))}&body=${encodeURIComponent(tcTexto(x, s, d.doc).replace(/⟦REVISI[^⟧]*⟧\s*/g, "").replace(/⟦([^⟧]*)⟧/g, "[$1]").trim())}`); return; }
    if (a === "registrar" && s) { const m = tcRegistrar(x, s, d.doc); return fin(m); }
    if (a === "famWa" || a === "famMail" || a === "famCopy") {
      const M = tcRecordatorio(x); if (!M.texto) { toast("No hay documentos pendientes"); return; }
      if (a === "famWa") { const t = tcTel(x.despacho?.tel || x.familia?.contacto?.tel); abrirExterno(`https://wa.me/${t}?text=${encodeURIComponent(M.texto)}`); tcRegistrarRecordatorio(x, "WhatsApp"); }
      if (a === "famMail") { abrirExterno(`mailto:${tcEmail(x.despacho?.email || x.familia?.contacto?.email)}?subject=${encodeURIComponent(M.asunto)}&body=${encodeURIComponent(M.texto)}`); tcRegistrarRecordatorio(x, "correo"); }
      if (a === "famCopy") { copiar(M.texto); tcRegistrarRecordatorio(x, "copiado"); guardar(); render(); return; }
      return fin("Recordatorio registrado");
    }
  } catch (err) { console.error(err); toast("No se pudo completar la acción"); }
}
// Cambio de tipo en la hoja: actualiza la petición y el plazo si el abogado no los ha tocado
function tcCambio(e) {
  const t = e.target; if (!t || !t.id) return;
  if (t.id === "tc-f-que") { t.dataset.auto = "0"; return; }
  if (t.id === "tc-f-tipo") {
    const k = TC_TIPOS[t.value] ? t.value : "otro", q = document.getElementById("tc-f-que"), p = document.getElementById("tc-f-plazo");
    if (q && q.dataset.auto !== "0") q.value = TC_TIPOS[k].que;
    if (p) p.value = TC_TIPOS[k].plazo;
  }
}
if (typeof document !== "undefined" && !window.__tcOyente) { window.__tcOyente = true; document.addEventListener("click", tcClick, true); document.addEventListener("input", tcCambio, true); document.addEventListener("change", tcCambio, true); }
