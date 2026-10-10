// ───────────────────── Lector de documentos · tipos adicionales (prefijo lec) ─────────────────────
// Se registran con lecRegistrar (lector.js): datos fiscales de la AEAT, capitulaciones matrimoniales, facturas del funeral y de la última
// enfermedad, préstamos (certificado de deuda o escritura), contratos de arrendamiento, certificados de valores, planes de pensiones y
// participaciones sociales. Mismas reglas que el resto del lector: nada se inventa, lo dudoso va sin marcar (conf 0) y cada tipo deja avisos
// jurídicos útiles. Las cifras se leen con formato español (1.234,56).
const LT_DIN = /(?<![\d.,])(-?\d{1,3}(?:\.\d{3})*,\d{2})(?![\d,])/g;
const ltImportes = (s) => [...String(s || "").matchAll(LT_DIN)].map((m) => lecNum(m[1].replace("-", "")) * (/^-/.test(m[1]) ? -1 : 1));
// Primer importe tras la primera aparición de la etiqueta que lleve uno cerca (la etiqueta puede salir antes en un título sin cifra)
const ltDinero = (T, re, ventana = 90) => { const R = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); for (const m of T.matchAll(R)) { const z = T.slice(m.index + m[0].length, m.index + m[0].length + ventana); const q = /(?<![\d.,])(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3}(?:\.\d{3})+)(?![\d,])/.exec(z); if (q) return lecNum(q[1]); } return null; };
const LT_ISIN = /\b((?:ES|US|LU|IE|FR|DE|NL|GB|IT|PT|CH|BE|AT|DK|FI|SE|NO|JP|CA|AU)[0-9A-Z]{9}\d)\b/;
// CIF/NIF de sociedad: letra + 7 cifras + control (cifra o letra según el tipo de entidad)
function ltCifOk(v) {
  const s = String(v || "").toUpperCase().replace(/[\s.-]/g, ""); const m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(s); if (!m) return false;
  const d = m[2].split("").map(Number); let a = 0; for (let i = 0; i < 7; i++) { if (i % 2) a += d[i]; else { const x = d[i] * 2; a += Math.floor(x / 10) + (x % 10); } }
  const c = (10 - (a % 10)) % 10; return m[3] === String(c) || m[3] === "JABCDEFGHI"[c];
}
const ltCifs = (t) => [...String(t).matchAll(/\b([ABCDEFGHJNPQRSUVW])[\s-]?(\d{7})[\s-]?([0-9A-J])\b/g)].map((m) => m[1] + m[2] + m[3]).filter(ltCifOk);
// «FUNERARIA LA PAZ, S.L.» → «Funeraria La Paz, S.L.» (en los nombres de empresa solo «de», «del», «y» van en minúscula)
const ltEmpresa = (n, forma) => String(n || "").replace(/\s+/g, " ").trim().replace(/[,.;:]+$/, "").split(" ").map((w, i) => (w === w.toUpperCase() && w.length > 1 ? (i && ["DE", "DEL", "Y", "E"].includes(w) ? w.toLowerCase() : w.length <= 3 && /^[A-Z]+$/.test(w) && !["LA", "EL", "LOS", "LAS", "SAN", "SUR", "MAR", "SOL", "LUZ", "PAZ", "RIO"].includes(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()) : w)).join(" ") + (forma ? ", " + forma.replace(/\s/g, "").toUpperCase().replace(/^SL$/, "S.L.").replace(/^SA$/, "S.A.").replace(/^SLU$/, "S.L.U.").replace(/^(S\.L|S\.A)$/, "$1.").replace(/^SOCIEDADCOOPERATIVA$/, "S. Coop.") : "");
const ltBanco = (T) => { const b = LEC_BANCOS.exec(T); return b ? lecNombreBanco(b[1]) : ""; };
// Partes de un texto separadas por sus encabezados (líneas que casan con alguno de los patrones): { clave: texto }
function ltSecciones(T, defs) {
  const L = T.split("\n"); const out = {}; let cur = null;
  for (const l of L) { const d = defs.find(([, re]) => re.test(lecN(l)) && l.replace(/[\d.,€%\s]/g, "").length < 120 && !/\d{1,3}(?:\.\d{3})*,\d{2}/.test(l)); if (d) { cur = d[0]; out[cur] = out[cur] || ""; continue; } if (cur) out[cur] += l + "\n"; }
  return out;
}

// ── Datos fiscales / certificado de imputaciones de la AEAT del causante ──
// Lista cuentas (saldo a 31 de diciembre y saldo medio del cuarto trimestre), fondos, acciones e inmuebles (referencia catastral, porcentaje
// de titularidad, uso y valor catastral). Los importes son a 31/12 del ejercicio, no a la fecha del fallecimiento: valen para no olvidar ningún
// bien; el certificado del banco a la fecha del fallecimiento, si se sube, sustituye el saldo (prioridad mayor).
function lecDatosFiscales(t) {
  const out = { campos: [], bienes: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const ej = (/(?:datos\s+fiscales|imputaciones|ejercicio)\s*(?:del\s+)?(?:ejercicio\s*)?[:：]?\s*(20\d{2})/i.exec(T1) || [])[1] || "";
  const a31 = ej ? `31/12/${ej}` : "31 de diciembre";
  const nif = (/\bN\.?I\.?F\.?\s*[:：]?\s*(\d{8}\s?-?\s?[A-Z]|[XYZ]\d{7}[A-Z])/i.exec(T1) || [])[1];
  if (nif && lecNifOk(nif.replace(/[\s-]/g, ""))) out.campos.push({ k: "nifCausante", etiqueta: "DNI del causante (datos fiscales)", valor: nif.replace(/[\s-]/g, "").toUpperCase(), conf: 1 });
  const ap = /apellidos\s+y\s+nombre\s*[:：]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' \-]{6,60}?)(?=\s+(?:NIF|N\.I\.F|Domicilio|Ejercicio|Fecha|\d)|\s*\n|$)/i.exec(T);
  if (ap) { const n = /,/.test(ap[1]) ? lecNombre(ap[1].split(",").reverse().join(" ")) : lecApellidosNombre(ap[1]); if (n) out.campos.push({ k: "nombre", etiqueta: "Titular de los datos fiscales", valor: n, conf: 1 }); }
  const S = ltSecciones(T, [["cuentas", /CUENTAS? (?:BANCARIAS|CORRIENTES)|SALDOS? (?:DE|EN) CUENTAS|DEPOSITOS? EN CUENTA|CUENTAS A LA VISTA/], ["fondos", /FONDOS? DE INVERSION|INSTITUCIONES DE INVERSION COLECTIVA|\bIIC\b|PARTICIPACIONES EN FONDOS/], ["valores", /VALORES (?:COTIZADOS|NEGOCIADOS)|ACCIONES (?:COTIZADAS|Y PARTICIPACIONES)|RENTA VARIABLE|TITULARIDAD DE VALORES/], ["inmuebles", /\bINMUEBLES\b|BIENES INMUEBLES|INFORMACION CATASTRAL/], ["otros", /RENDIMIENTOS DEL TRABAJO|PENSIONES|PLANES DE PENSIONES|APORTACIONES|PRESTAMOS|GANANCIAS|IMPUTACION|RETENCIONES|SUBVENCIONES|DONATIVOS|OTROS DATOS/]]);
  const nota = `importe a ${a31} según los datos fiscales; pide el certificado a la fecha del fallecimiento`;
  // Cuentas: una fila por IBAN; el primer importe es el saldo a 31/12 (el segundo, el saldo medio del cuarto trimestre)
  for (const l of (S.cuentas || "").split("\n")) {
    const ib = /\b(ES\d{2}(?:\s?\d{4}){5})\b/.exec(l); if (!ib) continue;
    const ent = ltBanco(l) || lecFrase(l.slice(0, ib.index).replace(/\b\d{4}\b/g, ""), 40); const resto = l.slice(ib.index + ib[0].length);
    const imps = ltImportes(resto); if (!imps.length) continue;
    const tit = /(?:^|\s)([1-9])(?=\s+-?\d{1,3}(?:\.\d{3})*,\d{2})/.exec(resto); const nTit = tit ? Number(tit[1]) : 1;
    out.bienes.push({ tipo: "cuenta", descripcion: `Cuenta en ${ent || "entidad sin identificar"}`, valor: Math.max(0, imps[0]), iban: ib[1].replace(/\s/g, ""), entidad: ent, cotitular: nTit > 1, prioValor: 1, valorFuente: `saldo a ${a31} (datos fiscales)`, notaValor: nota, ...(nTit > 1 ? { nota: `${nTit} titulares` } : {}), conf: 1 });
  }
  // Fondos: denominación y valoración (último importe de la fila)
  for (const l of (S.fondos || "").split("\n")) {
    const imps = ltImportes(l); if (!imps.length || /^\s*(?:entidad|denominaci|gestora|total)/i.test(l)) continue;
    // Denominación: lo que sigue a la gestora («… SGIIC»); sin esa marca, todo lo anterior a las cifras sin las palabras de la gestora
    const isin = LT_ISIN.exec(l); let nom = l.slice(0, isin ? isin.index : l.search(/\d/)); const sg = [...nom.matchAll(/S\.?G\.?I\.?I\.?C\.?|SGIIC/gi)].pop(); if (sg && nom.slice(sg.index + sg[0].length).trim().length >= 4) nom = nom.slice(sg.index + sg[0].length);
    nom = nom.replace(/\b(?:S\.?G\.?I\.?I\.?C\.?|SGIIC|S\.A\.?|GESTI[ÓO]N(?:\s+DE\s+ACTIVOS)?|GESTORA|ASSET\s+MANAGEMENT)\b[,.]?/gi, " ").replace(/\s+/g, " ").trim();
    if (nom.length < 4) continue;
    out.bienes.push({ tipo: "valores", descripcion: `Fondo ${ltEmpresa(nom).replace(/^Fondo\s+/i, "")}`, valor: imps[imps.length - 1], ...(isin ? { isin: isin[1] } : {}), entidad: "", prioValor: 1, valorFuente: `valoración a ${a31} (datos fiscales)`, notaValor: nota, conf: 1 });
  }
  // Acciones y otros valores: fila con ISIN
  for (const l of (S.valores || "").split("\n")) {
    const isin = LT_ISIN.exec(l); if (!isin) continue; const imps = ltImportes(l.slice(isin.index)); if (!imps.length) continue;
    const nom = ltEmpresa(l.slice(0, isin.index).replace(/\b(?:S\.?A\.?|SOCIEDAD AN[ÓO]NIMA)\b[,.]?/gi, " ")); const n = /\s(\d{1,3}(?:\.\d{3})*|\d+)\s/.exec(l.slice(isin.index + 12) + " ");
    out.bienes.push({ tipo: "valores", descripcion: `${n ? n[1] + " " : ""}acciones de ${nom || "emisor sin identificar"} (${isin[1]})`, valor: imps[imps.length - 1], isin: isin[1], entidad: "", prioValor: 1, valorFuente: `valoración a ${a31} (datos fiscales)`, notaValor: nota, conf: 1 });
  }
  // Inmuebles: referencia catastral, situación, porcentaje de titularidad, uso y valor catastral
  const zi = S.inmuebles || ""; const filas = zi.split("\n");
  filas.forEach((l, i) => {
    const ref = lecRefCat(l); if (!ref) return;
    // La situación puede partirse en varias líneas (celda estrecha): se añaden las siguientes que no traen referencia ni importes
    let cont = ""; for (let k = i + 1; k < filas.length && k <= i + 4; k++) { const c = filas[k].trim(); if (!c || lecRefCat(c) || /\d{1,3}(?:\.\d{3})*,\d{2}/.test(c) || c.length > 70 || /^(?:RENDIMIENTOS|PRESTAMOS|OTROS|IMPUTACI)/i.test(lecN(c))) break; cont += " " + c; }
    const zr = l.slice(l.indexOf(ref.slice(0, 7)) + 20) + " " + cont;
    const sit = (l.slice(0, l.indexOf(ref.slice(0, 7))) + " " + cont.replace(/\b(?:habitual|arrendamiento|arrendad[oa]|a\s+disposici[óo]n(?:\s+del\s+titular)?|r[úu]stico|del\s+titular)\b/gi, " ")).replace(/\s+/g, " ").trim(); const pct = /(\d{1,3}(?:,\d{1,2})?)\s*%/.exec(zr); const imps = ltImportes(zr).filter((v) => v > 100);
    const uso = /(vivienda\s+habitual|arrendad[oa]|arrendamiento|alquilad[oa]|a\s+disposici[óo]n(?:\s+del\s+titular)?|vac[íi]a|afecto\s+a\s+actividad|r[úu]stico|garaje|aparcamiento)/i.exec(zr);
    const muni = /\b\d{5}\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ' \-]{2,40}?)\s*\(([A-ZÁÉÍÓÚÑa-záéíóúñ ]{3,30})\)/.exec(sit) || /\b\d{5}\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' \-]{2,40})$/.exec(sit);
    const rust = /^\d{5}[A-Z]\d{3}\d{5}\d{4}[A-Z]{2}$/.test(ref);
    const viv = uso && /habitual/i.test(uso[1]); const arr = uso && /arrend|alquil/i.test(uso[1]);
    out.bienes.push({ tipo: viv ? "vivienda" : "inmueble", descripcion: sit ? lecDireccion(sit.replace(/\s*\d{5}\s.*$/, ""), 80) : rust ? "Finca rústica" : "Inmueble", refCatastral: ref, valorCatastralTotal: imps.length ? imps[imps.length - 1] : null, muniNombre: muni ? lecTitulo(muni[1]) : "", muniProv: muni && muni[2] ? lecTitulo(muni[2]) : "", ...(rust ? { rustico: true, usoResidencial: false } : {}), ...(arr ? { arrendadoOCedido: true } : {}), nota: `titularidad fiscal ${pct ? pct[1] + " %" : "no indicada"}${uso ? " · uso: " + uso[1].toLowerCase() : ""} (datos fiscales ${ej})`, conf: 1 });
  });
  const nB = out.bienes.length;
  out.campos.push({ k: "datosFiscales", etiqueta: `Datos fiscales${ej ? " del ejercicio " + ej : ""}`, valor: { ejercicio: ej, cuentas: out.bienes.filter((b) => b.tipo === "cuenta").length, inmuebles: out.bienes.filter((b) => b.tipo === "inmueble" || b.tipo === "vivienda").length, valores: out.bienes.filter((b) => b.tipo === "valores").length }, mostrar: nB ? `${nB} bienes localizados: ${out.bienes.filter((b) => b.tipo === "cuenta").length} cuentas, ${out.bienes.filter((b) => b.tipo === "valores").length} fondos o valores, ${out.bienes.filter((b) => b.tipo === "inmueble" || b.tipo === "vivienda").length} inmuebles` : "no se ha reconocido ningún bien", conf: nB ? 1 : 0 });
  out.avisos.push(`Datos fiscales${ej ? " de " + ej : ""} de la Agencia Tributaria: los saldos y valoraciones son a ${a31}, no a la fecha del fallecimiento. Sirven de inventario para no olvidar ninguna cuenta, valor o inmueble; pide a cada entidad el certificado a la fecha del fallecimiento (si lo subes, su saldo sustituye a este).`);
  if (out.bienes.some((b) => b.tipo === "inmueble" || b.tipo === "vivienda")) out.avisos.push("Inmuebles de los datos fiscales: el porcentaje que figura es el fiscal (en gananciales cada cónyuge declara el 50 %). La titularidad real (ganancial, privativa o en proindiviso) la da la nota simple.");
  if (!nB) out.avisos.push("No se ha reconocido ninguna cuenta, valor ni inmueble: si el documento es un escaneo, prueba con el PDF que descarga la sede de la Agencia Tributaria.");
  return out;
}

// ── Escritura de capitulaciones matrimoniales: régimen pactado (manda sobre el «casado» de otros documentos) ──
function lecCapitulaciones(t) {
  const out = { campos: [], personas: [], avisos: [] }; const T1 = t.replace(/\s+/g, " ");
  const F = lecFechas(T1.slice(0, 700)); const fecha = F.length ? F[0].f : "";
  const nota = new RegExp(`[Aa]nte\\s+m[íi]\\s*,?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s*[Nn]otari[oa]`).exec(T1);
  const R = /\bpor\s+el\s+(?:r[ée]gimen\s+)?(?:de\s+)?(separaci[óo]n\s+(?:absoluta\s+)?de\s+bienes|participaci[óo]n|gananciales)/i.exec(T1) || /(?:pactan|adoptan|establecen|acuerdan|convienen|estipulan)[^.]{0,200}?r[ée]gimen\s+(?:econ[óo]mico\s+)?(?:matrimonial\s+)?(?:de\s+)?(?:la\s+)?(separaci[óo]n\s+(?:absoluta\s+)?de\s+bienes|participaci[óo]n|gananciales|sociedad\s+de\s+gananciales)/i.exec(T1) || /r[ée]gimen\s+(?:econ[óo]mico\s+)?(?:matrimonial\s+)?de\s+(separaci[óo]n\s+(?:absoluta\s+)?de\s+bienes|participaci[óo]n|gananciales)/i.exec(T1);
  const liquida = /(?:disuelven|disoluci[óo]n|liquidan|liquidaci[óo]n)\s+(?:y\s+liquidan\s+)?(?:de\s+)?(?:la\s+)?sociedad\s+(?:legal\s+)?de\s+gananciales/i.test(T1);
  // Cónyuges: los dos primeros comparecientes («DON X … y DOÑA Y …, casados»)
  const comp = [...T1.matchAll(new RegExp(`${LEC_TRAT}\\s+${LEC_NOMBRE_RE}`, "g"))].filter((m) => !/(?:Notari|Registrador)/i.test(T1.slice(m.index + m[0].length, m.index + m[0].length + 30)) && !/[Aa]nte\s+m[íi]\s*,?\s*$/.test(T1.slice(Math.max(0, m.index - 12), m.index)));
  for (const m of comp.slice(0, 2)) { const n = lecNombre(m[1]); if (n && !out.personas.some((p) => p.nombre === n)) out.personas.push({ nombre: n, relacion: "conyuge", pareja: true, conf: 1 }); }
  if (R) {
    const r = R[1].toLowerCase(); const sep = /separaci|participaci/.test(r);
    out.campos.push({ k: "civil", etiqueta: "Régimen económico (capitulaciones)", valor: sep ? "separacion" : "gananciales", manda: true, mostrar: `régimen de ${r.replace("sociedad de ", "")} pactado en capitulaciones${fecha ? " de " + fechaLarga(fecha) : ""}${nota ? " ante " + lecNombre(nota[1]) : ""} (manda sobre el «casado» de otros documentos)`, conf: 2 });
    if (/participaci/.test(r)) out.avisos.push("Régimen de participación: los bienes son privativos (se carga como separación), pero al morir nace un crédito de participación en las ganancias (arts. 1411 y ss. CC) que hay que calcular aparte.");
  } else out.avisos.push("No se ha leído qué régimen pactan las capitulaciones: revísalo en la escritura y ajusta el estado civil del causante.");
  if (liquida) out.avisos.push("Las capitulaciones disuelven y liquidan la sociedad de gananciales: los bienes adjudicados a cada cónyuge en esa liquidación son privativos suyos desde entonces. Revisa la titularidad de cada inmueble con la nota simple (el Registro pudo no actualizarla).");
  out.avisos.push("Capitulaciones: entre los cónyuges valen desde que se otorgan; frente a terceros, desde que constan en el Registro Civil (art. 1333 CC). Comprueba la nota marginal en la inscripción de matrimonio.");
  if (fecha) out.campos.push({ k: "exp.capitulacionesFecha", grupo: "Causante", etiqueta: "Fecha de las capitulaciones", valor: fecha, mostrar: fechaLarga(fecha), conf: 1 });
  return out;
}

// ── Factura del entierro, funeral o última enfermedad: gasto deducible (art. 14.b LISD) ──
const LT_FUNERAL = /FUNERA|SEPELIO|INHUMACI|CREMACI|INCINERACI|TANATORIO|SERVICIO FUNERARIO|LAPIDA|NICHO|ESQUELA|ENTIERRO|SARCOFAGO|FERETRO|ATAUD|COLUMBARIO|CEMENTERIO/;
const LT_MEDICO = /HOSPITAL|CLINICA|CENTRO MEDICO|ASISTENCIA (?:SANITARIA|MEDICA)|HOSPITALIZACION|CUIDADOS PALIATIVOS|ENFERMER|AMBULANCIA|FARMACIA|UCI\b|HONORARIOS MEDICOS|ESTANCIA HOSPITALARIA|RESIDENCIA (?:DE MAYORES|GERIATRICA|ASISTIDA)|CENTRO SOCIOSANITARIO/;
function lecFactura(t) {
  const out = { campos: [], gastos: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " "); const N = lecN(T1);
  const fun = LT_FUNERAL.test(N), med = LT_MEDICO.test(N), resid = /RESIDENCIA (?:DE MAYORES|GERIATRICA|ASISTIDA)|CENTRO SOCIOSANITARIO|PLAZA RESIDENCIAL/.test(N) && !/HOSPITAL|CLINICA/.test(N);
  if (!fun && !med) { out.avisos.push("Parece una factura, pero no del entierro, el funeral ni la última enfermedad: no es un gasto deducible de la herencia. No se extraen datos."); return out; }
  // Total: el mayor importe rotulado como total; si no hay, el mayor del documento
  const tots = [...T1.matchAll(/\btotal\b(?:\s+(?:factura|a\s+pagar|importe|general|con\s+iva|euros?))*\s*(?:\(?€\)?)?\s*[:：]?\s*(?:€\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/gi)].map((m) => lecNum(m[1]));
  const importe = tots.length ? Math.max(...tots) : (ltImportes(T1).length ? Math.max(...ltImportes(T1)) : null);
  const num = (/factura\s*(?:n[úu]mero|n[.º°]|num\.?)?\s*[:：]?\s*([A-Z0-9][A-Z0-9\-\/]{2,20})/i.exec(T1) || [])[1] || "";
  const fecha = lecFechaCerca(T1, /fecha\s*(?:de\s+)?(?:la\s+)?(?:factura|emisi[óo]n|expedici[óo]n)?\s*[:：]/i, 30) || (lecFechas(T1)[0] || {}).f || "";
  const emi = /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9&.,' \-]{2,60}?)\s*,?\s*(S\.?\s?L\.?(?:U\.?)?|S\.?\s?A\.?(?:U\.?)?|S\.?\s?COOP\.?(?:\s+AND\.?)?|SOCIEDAD COOPERATIVA)(?=[\s,.·]|$)/.exec(T1);
  const emisor = emi && !/^(?:FACTURA|FECHA|CLIENTE)\b/i.test(emi[1]) ? ltEmpresa(emi[1], emi[2]) : "";
  const cli = new RegExp(`(?:${lecCI("cliente")}|${lecCI("pagador")}|${lecCI("facturar")}\\s+${lecCI("a")}|${lecCI("solicitante")}|${lecCI("contratante")})\\s*[:：]?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const pagador = cli ? lecNombre(cli[1]) : "";
  const decesos = /(?:a\s+cargo\s+(?:de\s+)?(?:la\s+)?(?:p[óo]liza|aseguradora|compa[ñn][íi]a)|seguro\s+de\s+decesos|cubierto\s+por\s+(?:el\s+)?seguro|p[óo]liza\s+de\s+decesos)/i.test(T1);
  const pagada = /pagad[oa]|cobrad[oa]|abonad[oa]|recibido|liquidad[oa]/i.test(T1);
  const etiqueta = fun ? "Gasto de entierro y funeral" : "Gasto de última enfermedad";
  const concepto = `${fun ? "Entierro y funeral" : resid ? "Residencia (última enfermedad)" : "Última enfermedad"}${emisor ? " · " + emisor : ""}${num ? " (factura " + num + (fecha ? " de " + fechaLarga(fecha) : "") + ")" : fecha ? " (" + fechaLarga(fecha) + ")" : ""}`;
  const conf = !importe ? 0 : decesos || resid ? 0 : 1;
  out.gastos.push({ etiqueta, concepto, importe, nota: [pagador ? "pagada por " + pagador : "", decesos ? "la paga el seguro de decesos: no se deduce" : "", resid ? "solo la asistencia sanitaria de la última enfermedad es deducible, no el alojamiento" : ""].filter(Boolean).join("; "), conf });
  if (fun) out.avisos.push(`Gasto de entierro y funeral${importe ? " de " + eur0(importe) : ""}: deducible en Sucesiones si lo pagaron los herederos con su justificante y guarda proporción con el caudal y los usos del lugar (art. 14.b LISD).`);
  else out.avisos.push(`Gasto de última enfermedad${importe ? " de " + eur0(importe) : ""}: deducible en Sucesiones si lo pagaron los herederos y está justificado (art. 14.b LISD). Lo que cubrió la Seguridad Social o un seguro médico no se deduce.`);
  if (decesos) out.avisos.push("La factura indica que la paga el seguro de decesos: lo que pague la aseguradora no es un gasto de la herencia. Queda sin marcar; deduce solo lo que haya pagado la familia.");
  if (resid) out.avisos.push("Factura de residencia: el alojamiento y la manutención no son gastos de última enfermedad. Queda sin marcar; si incluye asistencia sanitaria de los últimos meses, anota solo esa parte.");
  if (!importe) out.avisos.push("No se ha leído el total de la factura: anótalo a mano.");
  if (!pagada && !decesos) out.avisos.push("Guarda el justificante de pago de la factura: la Administración lo pide para admitir la deducción.");
  return out;
}

// ── Préstamos y deudas: certificado del banco (capital pendiente a la fecha del fallecimiento) o escritura (principal inicial) ──
function lecPrestamo(t) {
  const out = { campos: [], deudas: [], avisos: [] }; const T1 = t.replace(/\s+/g, " "); const N = lecN(T1);
  const banco = ltBanco(T1) || lecFrase((/(?:entidad|acreedor[a]?|prestamista)\s*[:：]?\s*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ&.,' \-]{3,50}?)(?=\s*(?:,|\.|\s+(?:con|CIF|NIF|S\.A)|$))/i.exec(T1) || [])[1] || "", 40);
  const esEscritura = /ESCRITURA|ANTE MI|NOTARI[OA] DEL ILUSTRE|COMPARECEN|OTORGAN/.test(N) && !/CERTIFICA(?:DO|MOS|CION)?\s+(?:DE\s+)?(?:DEUDA|SALDO|CAPITAL)|SALDO DEUDOR A FECHA|CAPITAL PENDIENTE A/.test(N);
  const hip = /HIPOTEC/.test(N);
  const pend = ltDinero(T1, /(?:capital|importe|saldo|deuda)\s+(?:total\s+)?(?:pendiente|vivo|deudor)(?:\s+de\s+(?:amortizar|pago|devoluci[óo]n))?(?:\s+a\s+(?:la\s+)?fecha[^:\d]{0,40}?(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})?)?\s*[:：]?/i, 70);
  const princ = ltDinero(T1, /(?:principal|capital\s+(?:prestado|del\s+pr[ée]stamo|inicial)|importe\s+(?:del\s+pr[ée]stamo|prestado|concedido)|por\s+(?:un\s+)?importe\s+de|la\s+cantidad\s+de|pr[ée]stamo\s+de)\s*[:：]?\s*(?:[A-ZÁÉÍÓÚÑ ]{4,80}?\s*\(?)?/i, 140);
  const fecha = lecFechaCerca(T1, /(?:a\s+(?:la\s+)?fecha\s+(?:de(?:l)?\s+)?(?:fallecimiento|defunci[óo]n)?\s*\(?|saldo\s+a\s+|pendiente\s+a\s+(?:fecha\s+)?)/i, 40);
  const nPres = /n[úu]mero\s+(?:de\s+)?(?:pr[ée]stamo|contrato|operaci[óo]n)\s*[:：]?\s*([0-9][0-9\-\/. ]{4,24}[0-9])|pr[ée]stamo\s+n[.º°]\s*([0-9][0-9\-\/. ]{3,24}[0-9])/i.exec(T1);
  const pres = [...T1.matchAll(new RegExp(`(?:${lecCI("prestatari")}[oa]s?|${lecCI("titular")}(?:${lecCI("es")})?|${lecCI("deudor")}(?:${lecCI("es")})?|${lecCI("acreditad")}[oa]s?)\\s*[:：]?\\s*((?:${LEC_TRAT}?\\s*(?:[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ'\\-]+\\s*){2,5}(?:,|\\s+[yY]\\s+|\\s*;\\s*)?){1,3})`, "g"))].flatMap((m) => lecListaNombres(m[1])).filter((n, i, A) => A.indexOf(n) === i);
  const varios = pres.length >= 2 || /prestatarios\s+solidarios|ambos\s+c[óo]nyuges|y\s+su\s+(?:esposa|esposo|c[óo]nyuge)/i.test(T1);
  const seguro = /seguro\s+de\s+(?:vida\s+)?(?:amortizaci[óo]n|vida\s+vinculado)|seguro\s+de\s+vida\s+(?:vinculado|asociado)\s+al\s+pr[ée]stamo|cancelaci[óo]n\s+por\s+(?:el\s+)?seguro/i.test(T1);
  const tipo = hip ? "Préstamo hipotecario" : /cr[ée]dito/i.test(T1) && !/pr[ée]stamo/i.test(T1) ? "Crédito" : "Préstamo";
  const importe = esEscritura ? (princ || null) : (pend ?? princ ?? null);
  if (!importe) out.avisos.push("No se ha leído el importe de la deuda: anótalo a mano con el certificado del banco a la fecha del fallecimiento.");
  out.deudas.push({ concepto: `${tipo}${banco ? " en " + banco : ""}${nPres ? " nº " + (nPres[1] || nPres[2]).trim() : ""} (${esEscritura ? "principal inicial según la escritura" : "capital pendiente" + (fecha ? " a " + fechaLarga(fecha) : " a la fecha del fallecimiento")})`, importe, ganancial: varios, fuente: esEscritura ? "escritura" : "banco", banco, hipoteca: hip, nota: [esEscritura ? "importe inicial: lo deducible es el capital pendiente a la fecha del fallecimiento; pide el certificado al banco" : "", varios ? `prestatarios: ${pres.join(", ") || "varios"}` : "", seguro ? "tiene seguro de vida vinculado: si la aseguradora cancela la deuda, no se deduce" : ""].filter(Boolean).join("; "), conf: esEscritura ? 0 : importe ? 2 : 0 });
  if (esEscritura) out.avisos.push(`Escritura de ${tipo.toLowerCase()}: el principal${princ ? " de " + eur0(princ) : ""} es el inicial. Lo que se deduce en Sucesiones es el capital pendiente a la fecha del fallecimiento (art. 13 LISD): queda sin marcar hasta tener el certificado del banco.`);
  if (seguro) out.avisos.push("El préstamo tiene un seguro de vida vinculado: comunica el fallecimiento a la aseguradora. Si cancela la deuda, no hay nada que deducir (y la cancelación no tributa como herencia de los herederos).");
  if (varios) out.avisos.push("Préstamo con varios prestatarios: si eran los cónyuges en gananciales, la deuda es ganancial y la herencia responde de la mitad; si no, solo de la parte del causante.");
  return out;
}

// ── Contrato de arrendamiento: el inmueble alquilado (renta, arrendatario, fianza) ──
function lecArrendamiento(t) {
  const out = { campos: [], avisos: [] }; const T1 = t.replace(/\s+/g, " ");
  const arrr = new RegExp(`(?:${lecCI("arrendador")}[aA]?|${lecCI("propietari")}[oaOA])\\s*(?:\\([^)]{0,20}\\))?\\s*[:：,]?\\s*(?:${lecCI("de")}\\s+${lecCI("una")}\\s+${lecCI("parte")}\\s*,?\\s*)?${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1) || new RegExp(`${lecCI("de")}\\s+${lecCI("una")}\\s+${lecCI("parte")}\\s*,?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const arrt = new RegExp(`(?:${lecCI("arrendatari")}[oaOA]|${lecCI("inquilin")}[oaOA])\\s*(?:\\([^)]{0,20}\\))?\\s*[:：,]?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1) || new RegExp(`${lecCI("de")}\\s+${lecCI("otra")}\\s+${lecCI("parte")}\\s*,?\\s*${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}`).exec(T1);
  const arrendador = arrr ? lecNombre(arrr[1]) : "", arrendatario = arrt ? lecNombre(arrt[1]) : "";
  const dir = /(?:vivienda|piso|local|inmueble|finca|apartamento|plaza\s+de\s+garaje|casa)\s+(?:sit[oa]|situad[oa]|ubicad[oa])?\s*(?:en\s+)?(?:la\s+|el\s+)?((?:calle|c\/|avenida|avda\.?|plaza|paseo|camino|ronda|carretera|urbanizaci[óo]n|CL|AV|PZ)\s[^;:()]{4,110}?)(?=\s*(?:[;:(]|,\s*(?:con|cuya|inscrit|que|referencia)|\.\s|\s+(?:con\s+referencia|inscrit|de\s+\d+\s*m|que\s+)))/i.exec(T1);
  const ref = lecRefCat(T1);
  const renta = ltDinero(T1, /renta\s+(?:mensual|anual|pactada|convenida|inicial)?(?:\s+(?:es|ser[áa]|queda\s+fijada)\s+(?:de|en))?\s*(?:de\s+)?[:：]?\s*(?:[A-ZÁÉÍÓÚÑa-záéíóúñ ]{4,60}?\s*\()?/i, 120);
  const anual = /renta\s+anual/i.test(T1) && !/renta\s+mensual/i.test(T1);
  const fianza = ltDinero(T1, /fianza\s*(?:legal)?(?:\s+de|\s+por\s+importe\s+de|\s+equivalente[^,]{0,40},?)?\s*[:：]?\s*(?:[A-ZÁÉÍÓÚÑa-záéíóúñ ]{4,60}?\s*\()?/i, 120);
  const fecha = (lecFechas(T1.slice(0, 600))[0] || {}).f || "";
  const dur = /duraci[óo]n\s+(?:de|del\s+contrato\s+(?:es|ser[áa])\s+de)\s+([a-záéíóúñ]+|\d+)\s+(a[ñn]os?|meses)/i.exec(T1);
  const v = { refCatastral: ref, direccion: dir ? lecDireccion(dir[1], 90) : "", renta: renta ? (anual ? Math.round(renta / 12 * 100) / 100 : renta) : null, arrendatario, arrendador, fianza, fecha };
  out.campos.push({ k: "arrendamiento", etiqueta: "Contrato de arrendamiento", valor: v, mostrar: [v.direccion || (ref ? "ref. catastral " + ref : "inmueble sin identificar"), arrendatario ? "arrendado a " + arrendatario : "", fecha ? "desde " + fechaLarga(fecha) : "", v.renta ? "renta " + eur0(v.renta) + " al mes" : "renta no leída", fianza ? "fianza " + eur0(fianza) : "", dur ? "duración " + dur[1] + " " + dur[2] : ""].filter(Boolean).join(" · "), conf: v.direccion || ref ? 1 : 0 });
  out.avisos.push(`Inmueble arrendado${arrendatario ? " a " + arrendatario : ""}: no es la vivienda habitual del causante ni da derecho a esa reducción. Los herederos ocupan su lugar como arrendadores (el contrato no se extingue por la muerte del arrendador) y las rentas desde el fallecimiento son suyas; las cobradas antes van al IRPF del causante.${fianza ? ` La fianza (${eur0(fianza)}) se devuelve al inquilino al terminar el contrato: no aumenta ni reduce la herencia.` : ""}`);
  if (!v.direccion && !ref) out.avisos.push("No se ha leído la dirección ni la referencia catastral del inmueble alquilado: márcalo como arrendado en su ficha.");
  return out;
}

// ── Certificado de titularidad o posición de valores (depositaria): acciones, ETF, renta fija con ISIN ──
function lecValores(t) {
  const out = { campos: [], bienes: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const ent = ltBanco(T1) || lecFrase((/^\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9&.,' \-]{3,50}?(?:S\.?A\.?U?|S\.?V\.?|AGENCIA DE VALORES|SOCIEDAD DE VALORES))/m.exec(T) || [])[1] || "", 40);
  const fecha = lecFechaCerca(T1, /(?:a\s+fecha\s+(?:de(?:l)?\s+)?(?:fallecimiento|defunci[óo]n)?\s*\(?|posici[óo]n\s+a\s+|cotizaci[óo]n\s+(?:a|del?)\s+(?:fecha\s+)?|valoraci[óo]n\s+a\s+)/i, 40);
  for (const l of T.split("\n")) {
    const isin = LT_ISIN.exec(l); if (!isin) continue;
    const resto = l.slice(isin.index + isin[0].length); const imps = ltImportes(resto); if (!imps.length) continue;
    const tit = /^\s*[|·]?\s*(\d{1,3}(?:\.\d{3})*|\d+)(?=\s)/.exec(resto); const nom = ltEmpresa(l.slice(0, isin.index).replace(/[|·]/g, " ").replace(/\b(?:S\.?A\.?|SOCIEDAD AN[ÓO]NIMA)\b[,.]?/gi, " "));
    const etf = /\bETF\b|UCITS|ISHARES|VANGUARD|AMUNDI|XTRACKERS|LYXOR/i.test(l); const rf = /BONO|OBLIGACI|LETRA|PAGAR[ÉE]|DEUDA/i.test(l);
    out.bienes.push({ tipo: "valores", descripcion: `${tit ? tit[1] + " " : ""}${rf ? "títulos de renta fija" : etf ? "participaciones del fondo cotizado" : "acciones"} de ${nom || "emisor sin identificar"} (${isin[1]})${ent ? " en " + ent : ""}`, valor: imps[imps.length - 1], isin: isin[1], entidad: ent, prioValor: 3, valorFuente: `valoración${fecha ? " a " + fechaLarga(fecha) : ""} del certificado`, conf: 2 });
  }
  if (!out.bienes.length) out.avisos.push("No se ha reconocido ningún valor (fila con su código ISIN y valoración): anótalos a mano.");
  else out.avisos.push(`${out.bienes.length} ${out.bienes.length === 1 ? "valor" : "valores"} en ${ent || "la entidad"}${fecha ? ", valorados a " + fechaLarga(fecha) : ""}. Comprueba que la valoración sea la de la fecha del fallecimiento: en Sucesiones los valores cotizados se valoran a esa fecha. Si estaban a nombre de los dos cónyuges en gananciales, la herencia es la mitad.`);
  return out;
}

// ── Plan de pensiones (certificado de derechos consolidados): no es caudal relicto; lo cobran los beneficiarios y tributa en su IRPF ──
function lecPlanPensiones(t) {
  const out = { campos: [], avisos: [] }; const T1 = t.replace(/\s+/g, " ");
  const plan = /(?:plan\s+de\s+pensiones|plan\s+de\s+previsi[óo]n\s+asegurado|\bPPA\b|\bEPSV\b)\s*[:：]?\s*([A-ZÁÉÍÓÚÑ0-9][A-Za-záéíóúñÁÉÍÓÚÑ0-9&.,' \-]{3,60}?)(?=\s*(?:\(|,|\.\s|\s+(?:N[úu]mero|N[.º°]|Part[íi]cipe|Entidad|Fondo|Gestora|C[óo]digo|DGS|Inscrit|Promotor|$)))/i.exec(T1);
  const ent = ltBanco(T1) || lecFrase((/(?:entidad\s+gestora|gestora)\s*[:：]?\s*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ&.,' \-]{3,60}?)(?=\s*(?:,|\(|\s+(?:N\.?I\.?F|CIF|Entidad|Depositar|$)))/i.exec(T1) || [])[1] || "", 40);
  const imp = ltDinero(T1, /derechos\s+(?:consolidados|econ[óo]micos)(?:\s+a\s+(?:la\s+)?fecha[^:\d]{0,40}?(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\)?)?)?\s*[:：]?/i, 80) || ltDinero(T1, /(?:importe|valor|saldo)\s+(?:total\s+)?(?:de\s+los\s+derechos|del\s+plan)?\s*[:：]/i, 60);
  const fecha = lecFechaCerca(T1, /derechos\s+(?:consolidados|econ[óo]micos)\s+a\s+(?:la\s+)?fecha|a\s+fecha\s+(?:de(?:l)?\s+)?(?:fallecimiento|defunci[óo]n)/i, 50);
  const ben = /beneficiari[oa]s?\s*(?:designad[oa]s?|en\s+caso\s+de\s+fallecimiento)?\s*[:：]?\s*([^.]{4,200}?)(?:\.(?:\s|$)|$)/i.exec(T1);
  const benTxt = ben ? ben[1].replace(/\b(?:DON|DOÑA|D\.ª|Dª)\s+/g, "").replace(/\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})+)\b/g, (m) => lecTitulo(m)).slice(0, 140) : "";
  const valor = { plan: plan ? ltEmpresa(plan[1]) : "Plan de pensiones", entidad: ent, importe: imp, fecha: fecha || "", beneficiarios: benTxt };
  out.campos.push({ k: "planPensiones", etiqueta: "Plan de pensiones (no es herencia)", valor, mostrar: [valor.plan, ent ? "en " + ent : "", imp ? "derechos consolidados " + eur0(imp) + (fecha ? " a " + fechaLarga(fecha) : "") : "importe no leído", benTxt ? "beneficiarios: " + benTxt : ""].filter(Boolean).join(" · "), conf: imp ? 2 : 1 });
  out.avisos.push(`Plan de pensiones${imp ? " de " + eur0(imp) : ""}: no forma parte de la herencia ni se reparte con ella. Lo cobran los beneficiarios designados (si no hay, los herederos legales, por derecho propio) y tributa en su IRPF como rendimiento del trabajo cuando lo rescatan (art. 17.2.a.3.º LIRPF), no en el Impuesto de Sucesiones. Se anota como información y no se suma al inventario.`);
  return out;
}

// ── Participaciones sociales (libro registro de socios, certificación del Registro Mercantil, escritura): sociedad, NIF, porcentaje ──
function lecSociedad(t) {
  const out = { campos: [], bienes: [], avisos: [] }; const T = t.replace(/[ \t]+/g, " "); const T1 = T.replace(/\s+/g, " ");
  const soc = /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9&.' \-]{2,60}?)\s*,?\s*(SOCIEDAD\s+LIMITADA(?:\s+UNIPERSONAL)?|SOCIEDAD\s+AN[ÓO]NIMA|S\.\s?L\.(?:U\.)?|S\.\s?A\.(?:U\.)?|SL\b|SLU\b|SA\b)/.exec(T1);
  const nombreSoc = soc ? ltEmpresa(soc[1], soc[2].replace(/SOCIEDAD\s+LIMITADA\s+UNIPERSONAL/i, "S.L.U.").replace(/SOCIEDAD\s+LIMITADA/i, "S.L.").replace(/SOCIEDAD\s+AN[ÓO]NIMA/i, "S.A.")) : "";
  const cif = ltCifs(T1)[0] || "";
  const cap = ltDinero(T1, /capital\s+social\s*(?:de|es\s+de|asciende\s+a|[:：])?\s*/i, 60);
  const nTot = /dividido\s+en\s+(\d{1,3}(?:\.\d{3})*|\d+)\s+(?:participaciones|acciones)/i.exec(T1);
  const tipoTit = /\bacciones\b/i.test(T1) && !/participaciones/i.test(T1) ? "acciones" : "participaciones";
  // Socios: «DOÑA ELENA MARTÍN ROJAS, NIF …: 1.500 participaciones (…) 50,00 %»
  const socios = [];
  for (const m of T1.matchAll(new RegExp(`${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?\\s*(?:con\\s+)?(?:N\\.?I\\.?F\\.?|D\\.?N\\.?I\\.?)?\\s*[:：]?\\s*(\\d{8}\\s?-?\\s?[A-Z]|[XYZ]\\d{7}[A-Z])?\\s*[:：,]?\\s*(?:titular\\s+de\\s+)?(\\d{1,3}(?:\\.\\d{3})*|\\d+)\\s+(?:participaciones|acciones)([^%]{0,80}?)(\\d{1,3}(?:,\\d{1,2})?)\\s*%`, "g"))) {
    const n = lecNombre(m[1]); if (!n || socios.some((q) => q.nombre === n)) continue;
    socios.push({ nombre: n, nif: m[2] ? m[2].replace(/[\s-]/g, "") : "", titulos: lecNum(m[3]), pct: lecNum(m[5]) });
  }
  if (!socios.length) for (const m of T1.matchAll(new RegExp(`${LEC_TRAT}?\\s*${LEC_NOMBRE_RE}\\s*,?[^%]{0,80}?(\\d{1,3}(?:\\.\\d{3})*|\\d+)\\s+(?:participaciones|acciones)`, "g"))) { const n = lecNombre(m[1]); if (!n || socios.some((q) => q.nombre === n)) continue; const tt = lecNum(m[2]); socios.push({ nombre: n, nif: "", titulos: tt, pct: nTot ? Math.round(tt / lecNum(nTot[1]) * 10000) / 100 : null }); }
  const pn = ltDinero(T1, /(?:patrimonio\s+neto|fondos\s+propios|valor\s+te[óo]rico(?:\s+contable)?)(?:\s+(?:seg[úu]n|del?|a)\s+[^:\d]{0,60}?)?\s*(?:\(?(?:ejercicio\s+)?\d{4}\)?)?\s*[:：]?/i, 60);
  const ejPN = (/(?:balance|cuentas\s+anuales|ejercicio)\s+(?:aprobad[oa]s?\s+)?(?:del\s+ejercicio\s+)?(20\d{2})/i.exec(T1) || [])[1] || "";
  if (!nombreSoc && !cif) { out.avisos.push("No se ha leído el nombre ni el NIF de la sociedad: anota las participaciones a mano."); return out; }
  out.bienes.push({ tipo: "empresa", descripcion: `${tipoTit === "acciones" ? "Acciones" : "Participaciones"} de ${nombreSoc || "la sociedad"}${cif ? " (NIF " + cif + ")" : ""}`, valor: null, nifSociedad: cif, socios, patrimonioNeto: pn, ejercicioPN: ejPN, capitalSocial: cap, titulosTotales: nTot ? lecNum(nTot[1]) : null, conf: socios.length ? 1 : 0 });
  out.avisos.push(`${nombreSoc || "Sociedad"}${cif ? " (" + cif + ")" : ""}: las ${tipoTit} no cotizadas se valoran, como mínimo, por su valor teórico según el último balance aprobado (pide las cuentas a la sociedad)${pn ? `; patrimonio neto${ejPN ? " " + ejPN : ""} de ${eur0(pn)}, que se reparte según el porcentaje del causante` : ""}. Si es una empresa familiar, puede aplicarse la reducción del 95 % (art. 20.2.c LISD; requisitos de exención en Patrimonio, funciones de dirección y mantenimiento durante diez años, que algunas comunidades rebajan).`);
  if (socios.length) out.avisos.push(`Socios leídos: ${socios.map((s) => `${s.nombre}${s.pct != null ? " " + String(s.pct).replace(".", ",") + " %" : ""}`).join(" · ")}.`);
  return out;
}

lecRegistrar({ tipo: "datosfiscales", titulo: "Datos fiscales de la Agencia Tributaria", nombreArchivo: /DATOS.?FISCALES|IMPUTACIONES|\bAEAT\b|HACIENDA/, huellas: [[/DATOS FISCALES|CERTIFICADO DE IMPUTACIONES|INFORMACION FISCAL/, 5], [/AGENCIA (?:ESTATAL DE ADMINISTRACION )?TRIBUTARIA|\bAEAT\b/, 2], [/IMPUESTO SOBRE LA RENTA|\bIRPF\b/, 1], [/SALDO (?:A|AL) 31|SALDO MEDIO|31\/12/, 2], [/REFERENCIA CATASTRAL/, 1], [/EJERCICIO\s+20\d{2}/, 1]], extraer: lecDatosFiscales });
lecRegistrar({ tipo: "capitulaciones", titulo: "Capitulaciones matrimoniales", nombreArchivo: /CAPITULACIONES/, huellas: [[/ESCRITURA DE CAPITULACIONES|CAPITULACIONES MATRIMONIALES/, 4], [/OTORGAN|ESTIPULACIONES|COMPARECEN/, 1], [/NOTARI/, 1], [/SEPARACION (?:ABSOLUTA )?DE BIENES|REGIMEN DE PARTICIPACION/, 1], [/(?:DISOLUCION|DISUELVEN|LIQUIDACION|LIQUIDAN)[A-Z ]{0,20}SOCIEDAD (?:LEGAL )?DE GANANCIALES/, 2]], extraer: lecCapitulaciones });
lecRegistrar({ tipo: "factura", titulo: "Factura de gastos (funeral o última enfermedad)", nombreArchivo: /FUNERA|SEPELIO|ENTIERRO|TANATORIO|HOSPITAL|CLINICA/, huellas: [[/\bFACTURA\b|\bRECIBO\b/, 1], [LT_FUNERAL, 4], [LT_MEDICO, 3]], extraer: lecFactura });
lecRegistrar({ tipo: "prestamo", titulo: "Préstamo o deuda (certificado o escritura)", nombreArchivo: /PRESTAMO|DEUDA|HIPOTECA|CREDITO/, huellas: [[/PRESTAMO|CREDITO/, 2], [/CAPITAL (?:PENDIENTE|VIVO)|SALDO (?:DEUDOR|PENDIENTE)|DEUDA PENDIENTE|PENDIENTE DE AMORTIZAR/, 3], [/ESCRITURA DE PRESTAMO|PRESTAMO (?:CON GARANTIA )?HIPOTECARIO|CONSTITUCION DE HIPOTECA/, 3], [/PRESTATARI|PRESTAMISTA|ACREDITAD/, 2], [/AMORTIZACION|CUOTA MENSUAL|TIPO DE INTERES|EURIBOR/, 1], [/CERTIFICADO DE DEUDA|CERTIFICADO DE SALDO DEUDOR|CERTIFICA(?:DO)? (?:DE )?(?:LA )?DEUDA/, 3]], extraer: lecPrestamo });
lecRegistrar({ tipo: "arrendamiento", titulo: "Contrato de arrendamiento", nombreArchivo: /ARRENDAMIENTO|ALQUILER|INQUILINO/, huellas: [[/CONTRATO DE (?:ARRENDAMIENTO|ALQUILER)/, 5], [/ARRENDADOR/, 2], [/ARRENDATARI|INQUILIN/, 2], [/\bRENTA\b/, 1], [/FIANZA/, 1], [/ARRENDAMIENTOS URBANOS|\bLAU\b|29\/1994/, 2]], extraer: lecArrendamiento });
lecRegistrar({ tipo: "valores", titulo: "Certificado de valores (acciones)", nombreArchivo: /VALORES|ACCIONES|BROKER|DEPOSITARI/, huellas: [[/CERTIFICA\w*\s+(?:DE\s+)?(?:LA\s+)?(?:TITULARIDAD|POSICION(?:ES)?|SALDOS?|CUSTODIA)\s+(?:DE\s+)?VALORES|CUENTA DE VALORES|DEPOSITARI|CUSTODIA DE VALORES|AGENCIA DE VALORES|SOCIEDAD DE VALORES/, 4], [/\bISIN\b|\b(?:ES|US|LU|IE|FR|DE|NL)[0-9A-Z]{9}\d\b/, 3], [/TITULOS|NUM(?:ERO)? DE (?:VALORES|ACCIONES)|\bACCIONES\b/, 1], [/COTIZACION|VALOR(?:ACION)? DE MERCADO|VALORACION/, 1]], extraer: lecValores });
lecRegistrar({ tipo: "planpensiones", titulo: "Plan de pensiones", nombreArchivo: /PENSIONES|\bPPA\b|EPSV/, huellas: [[/PLAN(?:ES)? DE PENSIONES|PLAN DE PREVISION (?:ASEGURADO|SOCIAL)|\bEPSV\b|ENTIDAD DE PREVISION/, 3], [/DERECHOS CONSOLIDADOS|DERECHOS ECONOMICOS/, 3], [/PARTICIPE/, 2], [/BENEFICIARI/, 1], [/PRESTACION/, 1], [/ENTIDAD GESTORA|PENSIONES,? E\.?G\.?F\.?P|\bEGFP\b/, 1]], extraer: lecPlanPensiones });
lecRegistrar({ tipo: "sociedad", titulo: "Participaciones sociales", nombreArchivo: /SOCIOS|PARTICIPACIONES|SOCIEDAD|MERCANTIL/, huellas: [[/LIBRO REGISTRO DE SOCIOS|LIBRO REGISTRO DE ACCIONES NOMINATIVAS/, 5], [/PARTICIPACIONES SOCIALES/, 3], [/REGISTRO MERCANTIL/, 2], [/CAPITAL SOCIAL/, 2], [/SOCIEDAD (?:LIMITADA|ANONIMA)|\bS\.L\.|\bS\.A\./, 1], [/\bSOCIOS?\b/, 1], [/VALOR NOMINAL/, 1]], extraer: lecSociedad });
