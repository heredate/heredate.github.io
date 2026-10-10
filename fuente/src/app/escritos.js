// ───────────────────── {{MARCA}} · escritos de sucesiones (ronda 4 · escritos.js · prefijo esr / ESR_) ─────────────────────
// Borradores que un despacho de sucesiones lleva a la notaría, al Registro, al Catastro, al Ayuntamiento y a la familia, hechos con los
// datos del expediente y con las MISMAS cifras del motor que usan el cuadro de partición y el informe (particion, cuadroParticion,
// cpCuaderno, R.isd, R.plus). Nada se calcula aquí por segunda vez.
//   esrEscritura(x, R)     → escritura de manifestación, aceptación y adjudicación de herencia (minuta para la notaría)
//   esrCuaderno(x, R)      → cuaderno particional: inventario, avalúo, liquidación, formación de lotes y adjudicaciones
//   esrRenuncia(x, R)      → escritura de renuncia (repudiación) pura, simple y gratuita (art. 1008 CC)
//   esrSolicitud790(x, R)  → datos para el modelo 790, código 006 (últimas voluntades y contratos de seguros)
//   esrCartaFamilia(x, R)  → carta a la familia con los documentos que faltan, agrupados y con dónde se piden
//   esrCatastro(x, R)      → declaración catastral de cambio de titular por herencia (modelo 900D), si no la comunica el notario
//   esrPlusvalia(x, R)     → declaración del IIVTNU por transmisión mortis causa, por ayuntamiento
//   esrDocx(texto, o)      → Word (.docx) con estilos, membrete, pie con referencia y páginas, tablas y listas (lo usa docx() de logic.js)
//   esrVista(texto)        → HTML de la vista previa (tablas y marcadores)
// Convención: un dato que falta se marca ⟦así⟧ (resaltado en Word y en la vista previa, entre corchetes en el PDF) y nunca se inventa;
// las notas para el abogado son ⟦REVISIÓN OBLIGATORIA POR ABOGADO: …⟧. Las tablas se escriben en texto como «| a | b |» (las entienden
// el PDF, la vista previa y el Word).

const ESR_ORD = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA", "UNDÉCIMA", "DUODÉCIMA", "DECIMOTERCERA", "DECIMOCUARTA", "DECIMOQUINTA"];
const ESR_ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const esrPh = (v, et) => (v != null && String(v).trim() ? String(v).trim() : `⟦${et}⟧`);
const esrInm = (b) => b.tipo === "vivienda" || b.tipo === "inmueble";
const esrNomB = (b) => (b && b.descripcion) || (b && TIPO_BIEN[b.tipo] ? TIPO_BIEN[b.tipo][0] : "Bien");
const esrPct = (f) => grp(f * 100, Math.abs(f * 100 - Math.round(f * 100)) > 0.005 ? 2 : 0) + " %";
const esrCelda = (s) => String(s == null ? "" : s).replace(/\|/g, "/").replace(/\s*\n\s*/g, " ");
const esrTabla = (cab, filas) => [cab, ...filas].map((f) => "| " + f.map(esrCelda).join(" | ") + " |").join("\n");
const esrVivos = (x) => (x.personas || []).filter((p) => !p.renuncia);
const esrMenor = (p) => p.edad !== "" && p.edad != null && !isNaN(num(p.edad)) && num(p.edad) < 18;
const esrTest = (x) => x.testamento === "usufructo" || x.testamento === "porcentajes";
const esrREV = (t) => `⟦REVISIÓN OBLIGATORIA POR ABOGADO: ${t}⟧`;
const esrUp = (s) => String(s || "").toLocaleUpperCase("es-ES");
const esrFrac = (f) => (typeof fracTxt === "function" ? fracTxt(f) : esrPct(f));
const esrDer = (d) => `${d.tipo === "pleno" ? "pleno dominio" : d.tipo === "usufructo" ? "usufructo vitalicio" : "nuda propiedad"} de ${Math.abs(d.fraccion - 1) < 1e-9 ? "la totalidad" : esrFrac(d.fraccion)}`;
const esrDerechos = (R, id) => ((R.isd.derechos || {})[id] || []).filter((d) => d.fraccion > 0).map(esrDer).join(" y ");

// ── Datos comunes del expediente ───────────────────────────────
function esrCtx(x, R) {
  const KD = typeof despachoContacto === "function" ? despachoContacto() : { nombre: "", linea: "", localidad: "", postal: "", tel: "", email: "" };
  const ab = typeof abogado === "function" ? abogado(x.responsable) : null;
  const abNom = ab && ab.nombre && ab.nombre !== "Titular del despacho" ? ab.nombre : "";
  const cG = gnCaus(x), F = x.firma || {}, pl = Object.fromEntries(((R && R.plazos) || []).map((p) => [p.id, p]));
  const vec = R && R.isd && R.isd.vecindad;
  const vecTxt = vec && !vec.supuesta ? (vec.id === "comun" ? "común" : (typeof VECINDADES === "object" && VECINDADES[vec.id]) || vec.id) : "";
  const foral = !!(vec && vec.id !== "comun");
  const viudo = (x.personas || []).find((p) => p.relacion === "conyuge" || p.relacion === "pareja_hecho");
  const conV = viudo ? ` con ${gnTrat(viudo)}${viudo.nombre}` : "";
  const civilC = ({ gananciales: `${gnO(cG, "casado", "casada")} en régimen de gananciales${conV}`, separacion: `${gnO(cG, "casado", "casada")} en régimen de separación de bienes${conV}`, pareja: `con pareja de hecho${viudo ? ", " + gnTrat(viudo) + viudo.nombre : ""}`, viudo: gnO(cG, "viudo", "viuda"), soltero: gnO(cG, "soltero o divorciado", "soltera o divorciada", "soltero, soltera o con matrimonio disuelto por divorcio") })[x.civil] || "";
  return {
    KD, ab, abNom, cG, F, pl, vec, vecTxt, foral, civilC, viudo,
    causante: x.nombre || "⟦nombre del causante⟧", trC: gnTrat(cG), falC: gnO(cG, "fallecido", "fallecida", "que falleció"), fm: fechaLarga(x.fecha),
    nifC: esrPh(x.nifCausante, "NIF del causante"), domC: esrPh(x.domicilioCausante, "último domicilio del causante"),
    lugar: KD.localidad || "⟦localidad⟧", ref: (x.despacho && x.despacho.ref) || "",
    membrete: KD.nombre || KD.linea ? `${KD.nombre}${KD.nombre && KD.linea ? "\n" : ""}${KD.linea}\n\n` : "",
  };
}
// Compareciente con sus datos de identificación; lo que falte queda marcado
function esrComp(p, i) {
  const ec = p.estadoCivil ? (gnG(p) ? gnEC(p, p.estadoCivil) : "en situación de " + gnEC(p, p.estadoCivil)) : "⟦estado civil⟧";
  const edad = esrMenor(p) ? `menor de edad (${num(p.edad)} años), que actúa por medio de ⟦representante legal o defensor judicial⟧` : p.edad === "" || p.edad == null ? "⟦mayor de edad⟧" : "mayor de edad";
  return `${i != null ? i + 1 + ". " : ""}${gnTrat(p)}${esrPh(p.nombre, "nombre y apellidos")}, ${edad}, ${ec}, con domicilio en ${esrPh(p.domicilio, "domicilio")} y con DNI/NIF ${esrPh(p.nif, "número")}.`;
}
// Título sucesorio (testamento o acta de declaración de herederos), con los datos de «Listo para firmar» si constan
function esrTitulo(x, c, R) {
  const F = c.F, quien = F.tNotario ? `el notario ${F.tNotario}` : "el notario ⟦nombre del notario⟧", cuando = F.tFecha ? fechaLarga(F.tFecha) : "⟦fecha⟧", nro = esrPh(F.tProtocolo, "número");
  if (esrTest(x)) return `Falleció bajo el testamento otorgado ante ${quien}, el ${cuando}, con el número ${nro} de su protocolo, que es el último según el certificado del Registro General de Actos de Última Voluntad. En lo que interesa, dispone: ⟦transcribir las cláusulas de institución de herederos, legados, sustituciones y, en su caso, usufructo⟧.`;
  if (x.testamento === "no") return `Falleció sin haber otorgado testamento, según el certificado del Registro General de Actos de Última Voluntad. Por acta de notoriedad autorizada por ${quien}, el ${cuando}, con el número ${nro} de su protocolo, conforme a los artículos 55 y 56 de la Ley del Notariado (en la redacción de la Ley 15/2015, de 2 de julio, de la Jurisdicción Voluntaria), se declaró herederos abintestato a las personas que se indican en el apartado siguiente.`;
  return `${esrREV("aún no consta si hay testamento: el título sucesorio (testamento o acta de declaración de herederos, art. 14 de la Ley Hipotecaria) se completa con el certificado de últimas voluntades.")} ⟦título sucesorio⟧.`;
}
// Llamados a la herencia con sus derechos (del motor); las notas del reparto, aparte, como aviso para el abogado
function esrLlamados(x, R) {
  const der = R.isd.derechos || {}, L = [];
  for (const p of esrVivos(x)) {
    const d = esrDerechos(R, p.id), leg = (x.bienes || []).filter((b) => b.legatarioId === p.id);
    if (d) L.push(`${gnTrat(p)}${p.nombre}, ${gnRel(p)} del causante, ${d}`);
    if (leg.length) L.push(`${gnTrat(p)}${p.nombre}, a quien el testamento lega ${leg.map(esrNomB).join(", ")}`);
  }
  return (L.length ? L.join("; ") : "⟦herederos y cuotas⟧") + ".";
}
// Avisos comunes: menores, discapacidad, vecindad foral, elemento internacional
function esrAvisos(x, c) {
  const L = [], vivos = esrVivos(x);
  if (vivos.some(esrMenor)) L.push("hay herederos menores de edad: si su padre o su madre también heredan, hay conflicto de intereses y hace falta defensor judicial (art. 163 CC); la partición hecha con defensor judicial necesita aprobación judicial salvo que el juez disponga otra cosa (art. 1060 CC); para repudiar en su nombre, autorización judicial (art. 166 CC).");
  if (vivos.some((p) => num(p.discapacidad) >= 33)) L.push("algún heredero tiene reconocida una discapacidad: comprobar si tiene medidas de apoyo y su alcance (arts. 249 y siguientes CC, Ley 8/2021); con curatela representativa, el curador necesita autorización judicial para aceptar sin beneficio de inventario o repudiar (art. 287 CC), y la partición, aprobación judicial (art. 289 CC).");
  if (c.foral) L.push(`la vecindad civil del causante es ${c.vecTxt || "foral"}: legítimas, derechos del viudo, aceptación y partición se rigen por su derecho civil propio; sustituir las referencias al Código Civil por las de esa norma.`);
  else if (c.vec && c.vec.supuesta) L.push("la vecindad civil del causante se ha supuesto por su residencia: confirmarla, porque decide la ley que rige la sucesión (arts. 9.8, 14 y 16 CC).");
  if (x.ccaa === "EST") L.push("hay elemento internacional (causante no residente en España): la ley aplicable es la de la residencia habitual del causante salvo elección de la ley de su nacionalidad (arts. 21 y 22 del Reglamento (UE) 650/2012); valorar el certificado sucesorio europeo (arts. 62 y siguientes) y la competencia de la autoridad que tramita.");
  return L;
}

// ── Inventario a partir del cuadro de partición (mismos valores que el motor) ─────
function esrInventario(x, R) {
  const PT = particion(x, R);
  const car = (b) => (b.titularidad === "ganancial" ? "ganancial" : b.titularidad === "mixto" ? `mixto: privativo del causante en un ${esrPct(num(b.pctPrivCausante) / 100)}${num(b.pctPrivConyuge) ? `, del cónyuge en un ${esrPct(num(b.pctPrivConyuge) / 100)}` : ""} y común el resto (art. 1354 CC)` : b.titularidad === "proindiviso" ? `privativo del causante en un ${esrPct(pctCausante(b.porcentaje) / 100)}` : "privativo");
  const lineas = PT.B.map((q, i) => {
    const b = q.b, L = [], ent = typeof tcEntidadDe === "function" ? tcEntidadDe(b.descripcion) : null;
    const cab = `${i + 1}. ${esrInm(b) ? (b.tipo === "vivienda" ? "URBANA (vivienda habitual del causante)" : "URBANA") : esrUp(TIPO_BIEN[b.tipo][0])}. ${esrNomB(b)}.`;
    if (esrInm(b)) {
      L.push("Descripción: ⟦situación, superficie, linderos y cuota de participación, según el título y la nota simple⟧.");
      L.push("Inscripción: Registro de la Propiedad de ⟦…⟧, tomo ⟦…⟧, libro ⟦…⟧, folio ⟦…⟧, finca número ⟦…⟧.");
      L.push(`Referencia catastral: ${esrPh(b.refCatastral, "referencia catastral")}.`);
      L.push(`Título: ${b.fechaAdq ? `adquirida el ${fechaLarga(b.fechaAdq)} por ⟦título de adquisición⟧` : "⟦título y fecha de adquisición⟧"}.`);
      L.push(`Cargas: ${esrPh(b.cargas, "cargas según la nota simple")}.`);
      L.push(`Situación posesoria: ${b.arrendadoOCedido ? "arrendada o cedida a terceros, ⟦datos del contrato⟧" : "⟦libre de arrendatarios y ocupantes, según manifiestan los comparecientes⟧"}.`);
    } else if (b.tipo === "cuenta") L.push(`Saldo a la fecha del fallecimiento en ${ent ? ent.nombre : "⟦entidad⟧"}, cuenta ⟦número de cuenta (IBAN)⟧, según certificado de la entidad.`);
    else if (b.tipo === "valores") L.push(`Valores o participaciones depositados en ${ent ? ent.nombre : "⟦entidad o gestora⟧"}, ⟦número de contrato o cuenta de valores⟧, valorados a la fecha del fallecimiento según certificado de posición.`);
    else if (b.tipo === "vehiculo") L.push("Marca, modelo y matrícula: ⟦…⟧. Valor según las tablas de precios medios de Hacienda o tasación.");
    else if (b.tipo === "empresa") L.push("Denominación, NIF y participaciones: ⟦…⟧.");
    // G03: clases de bien del inventario completo, con su valoración
    else if (b.tipo === "cripto") L.push(`${num(b.unidades) ? `${grp(num(b.unidades), 8).replace(/,?0+$/, "")} unidades` : "⟦unidades⟧"} de ⟦criptoactivo⟧ custodiadas en ⟦proveedor o monedero⟧, valoradas al precio de cierre del día del fallecimiento${b.fuentePrecio ? ` según ${b.fuentePrecio}` : " según ⟦fuente del precio⟧"}.`);
    else if (b.tipo === "arte") L.push("Descripción, autor y estado: ⟦…⟧. Valor según tasación pericial de ⟦perito y fecha⟧.");
    else if (b.tipo === "credito") L.push("Crédito contra ⟦deudor⟧ nacido de ⟦título⟧, por el principal pendiente y los intereses devengados a la fecha del fallecimiento.");
    else if (b.tipo === "derechoReal") L.push(`${b.subtipo === "nudaPropiedad" ? `Nuda propiedad de ⟦finca o bien⟧, gravada con el usufructo ${num(b.aniosUsufructo) ? `temporal de ${num(b.aniosUsufructo)} años` : "vitalicio"} de ⟦usufructuario⟧, valorada conforme al art. 26 de la Ley 29/1987` : "Derecho de ⟦naturaleza⟧ sobre ⟦finca o bien⟧, constituido por ⟦título⟧"}. Inscripción: ⟦…⟧.`);
    else if (b.tipo === "renta") L.push("Renta ⟦temporal o vitalicia⟧ constituida por ⟦título⟧ a favor del causante; se transmite ⟦lo que corresponda⟧.");
    else if (b.tipo === "explotacion") L.push("Explotación agraria inscrita en ⟦registro⟧, con sus fincas, maquinaria, ganado y derechos: ⟦…⟧.");
    else if (b.tipo === "embarcacion") L.push("Matrícula o marca de nacionalidad y matrícula, modelo y amarre o base: ⟦…⟧.");
    else if (b.tipo === "intelectual") L.push("Obra o derecho, registro y plazo de protección restante: ⟦…⟧.");
    else if (b.tipo === "seguroAhorro") L.push("Póliza ⟦número⟧ de ⟦aseguradora⟧, por su valor de rescate a la fecha del fallecimiento según certificado.");
    if (b.enExtranjero) L.push(`Situado en ${b.extPais || "⟦país⟧"}${num(b.extImpuesto) ? `, donde se ha satisfecho un impuesto sucesorio de ${eur(num(b.extImpuesto))}` : ""}.`);
    L.push(`Carácter: ${car(b)}.`);
    const ref = num(b.valorReferencia);
    L.push(`Valor: ${eur(q.total)}${esrInm(b) && ref ? ` (valor de referencia catastral ${eur(ref)}${num(b.valor) < ref ? ", que se declara por ser superior al valor indicado" : ""})` : ""}.`);
    if (q.cc < 0.9999) L.push(`Corresponde a la herencia (${esrPct(q.cc)}): ${eur(q.v)}.`);
    if (q.leg) L.push(`Legado a favor de ${persona(x, q.leg).nombre}.`);
    return [cab, ...L.map((l) => "   " + l)].join("\n");
  });
  const tabla = esrTabla(["Nº", "Bien", "Carácter", "Valor", "En la herencia"], PT.B.map((q, i) => [i + 1, esrNomB(q.b), car(q.b), eur(q.total), eur(q.v)]).concat([["", "Total", "", "", eur(PT.B.reduce((s, q) => s + q.v, 0))]]));
  const m = R.isd.masa, deu = (x.deudas || []).filter((d) => num(d.importe) > 0), gas = (x.gastos || []).filter((g) => num(g.importe) > 0);
  const pasivo = [...deu.map((d) => `- ${d.concepto || "Deuda"}: ${eur(num(d.importe))}${d.ganancial ? " (deuda de la sociedad de gananciales: corresponde a la herencia la mitad)" : ""}. Acreditada con ⟦certificado de la entidad a la fecha del fallecimiento⟧.`),
    ...gas.map((g) => `- ${g.concepto || "Gasto"} (gastos de última enfermedad, entierro y funeral): ${eur(num(g.importe))}. Justificado con ⟦factura⟧.`)];
  // Auditoría r5 (H8): los bienes sin valor no entran en el cuadro de partición (particion.js) y antes desaparecían del inventario sin aviso,
  // aunque sí se nombraban en la liquidación de gananciales. Una escritura que omite bienes obliga a una adición posterior (art. 1079 CC).
  const enPT = new Set(PT.B.map((q) => q.b.id)), sinValor = (x.bienes || []).filter((b) => b && !enPT.has(b.id));
  if (typeof legadosSinBien === "function") for (const t of legadosSinBien(x)) lineas.push(esrREV(t));
  if (sinValor.length) lineas.push(esrREV(`${sinValor.length === 1 ? "este bien del expediente no tiene valor y no figura" : "estos bienes del expediente no tienen valor y no figuran"} en el inventario ni en las adjudicaciones: ${sinValor.map((b) => esrNomB(b)).join("; ")}. Valóralos e inclúyelos antes de firmar, o confirma que no forman parte de la herencia; si se omiten, habrá que otorgar una adición (art. 1079 CC).`));
  return { PT, lineas, tabla, pasivo, m, bruto: m.bruto, sinValor };
}
// Cuadro de cuotas y haberes del motor
function esrHaberes(x, R, PT) {
  return esrTabla(["Heredero", "Parentesco", "Derechos", "Haber"], PT.H.map((h) => [h.p.nombre || "—", gnRel(h.p), esrDerechos(R, h.p.id) || (h.legados ? "legatario" : "—"), eur(h.haber + h.legados)]));
}
// Impuestos por heredero: ISD del motor, plusvalía y coste del exceso (mismo cálculo que el informe)
function esrImpuestos(x, R) {
  const pp = plusPorHeredero(R), C = cuadroParticion(x, R), exH = (id) => { const e = C && C.excesos.find((q) => q.id === id); return e ? e.trib.coste : 0; };
  const hayE = !!(C && C.coste > 0.005);
  const filas = R.isd.herederos.map((h) => [h.nombre, eur(h.valorAdquirido), eur(h.aIngresar), eur(pp[h.nombre] || 0), ...(hayE ? [eur(exH(h.id))] : [])]);
  filas.push(["Total", eur(R.isd.herederos.reduce((s, h) => s + h.valorAdquirido, 0)), eur(R.isd.total), eur(R.totalPlus), ...(hayE ? [eur(C.coste)] : [])]);
  return { tabla: esrTabla(["Heredero", "Valor adquirido", "Sucesiones", "Plusvalía", ...(hayE ? ["Exceso de adjudicación"] : [])], filas), C, hayE };
}

// ───────────────────── 1. Escritura de manifestación, aceptación y adjudicación de herencia ─────────────────────
function esrEscritura(x, R) {
  if (!R) return "";
  const c = esrCtx(x, R), vivos = esrVivos(x), ren = (x.personas || []).filter((p) => p.renuncia);
  const I = esrInventario(x, R), K = cpCuaderno(x, R), T = esrImpuestos(x, R), m = I.m, F = c.F;
  const uno = vivos.length === 1 && !(ren.find((p) => p.relacion === "conyuge") && (x.bienes || []).some((b) => b.titularidad === "ganancial")), otorg = uno ? "el compareciente" : "los comparecientes", aOt = uno ? "al compareciente" : "a los comparecientes", deOt = uno ? "del compareciente" : "de los comparecientes";
  const viudoRen = ren.find((p) => p.relacion === "conyuge") && (x.bienes || []).some((b) => b.titularidad === "ganancial") ? ren.find((p) => p.relacion === "conyuge") : null;
  const comps = [...vivos, ...(viudoRen ? [viudoRen] : [])];
  let n = 0; const E = () => ESR_ROM[n++];
  let o = 0; const O = () => ESR_ORD[o++];
  const seg = (x.personas || []).filter((p) => num(p.seguro) > 0);
  const inm = (x.bienes || []).filter(esrInm);
  const out = [];
  out.push(`${c.membrete}BORRADOR DE ESCRITURA DE MANIFESTACIÓN, ACEPTACIÓN Y ADJUDICACIÓN DE HERENCIA`);
  out.push(`Herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""}${F.notaria ? " · " + F.notaria : ""}`);
  out.push("", "NÚMERO ⟦número de protocolo⟧", "", `En ⟦lugar del otorgamiento⟧, a ${F.fecha ? fechaLarga(F.fecha) : "⟦fecha del otorgamiento⟧"}.`, "", "Ante mí, ⟦nombre del notario⟧, Notario del Ilustre Colegio Notarial de ⟦colegio⟧, con residencia en ⟦residencia⟧,");
  out.push("", uno && !viudoRen ? "COMPARECE" : "COMPARECEN", "", comps.map((p, i) => esrComp(p, comps.length > 1 ? i : null)).join("\n"));
  out.push("", uno && !viudoRen ? "INTERVIENE" : "INTERVIENEN", "", `En su propio nombre y derecho${vivos.some(esrMenor) ? ", salvo los menores de edad, que lo hacen por medio de su representante, cuya representación resulta de ⟦título: patria potestad o resolución que nombra al defensor judicial⟧" : ""}${viudoRen ? `. ${gnTrat(viudoRen)}${viudoRen.nombre} interviene a los solos efectos de liquidar la sociedad de gananciales, por haber renunciado a la herencia` : ""}.`);
  out.push("", `Identifico ${aOt} por sus documentos de identidad reseñados. Tienen, a mi juicio, la capacidad legal necesaria para formalizar esta escritura de MANIFESTACIÓN, ACEPTACIÓN Y ADJUDICACIÓN DE HERENCIA y, al efecto,`);
  out.push("", uno && !viudoRen ? "EXPONE" : "EXPONEN");
  out.push("", `${E()}. Fallecimiento. ${c.trC}${c.causante}, con DNI/NIF ${c.nifC}, de vecindad civil ${c.vecTxt || "⟦vecindad civil⟧"}, falleció en ⟦lugar del fallecimiento⟧ el ${c.fm}, ${c.civilC ? `en estado de ${c.civilC}` : "⟦estado civil⟧"}, siendo su último domicilio ${c.domC}. Lo acreditan con certificado de defunción expedido por el Registro Civil de ⟦…⟧, que me exhiben y dejo unido a esta matriz.`);
  out.push("", `${E()}. Título sucesorio. ${esrTitulo(x, c, R)}`);
  out.push("", `${E()}. Llamamiento. Conforme al título sucesorio, son llamados a la herencia: ${esrLlamados(x, R)}`);
  if (R.isd.notasReparto.length) out.push(esrREV(`reparto aplicado en el cálculo: ${R.isd.notasReparto.join(" ")}`));
  if (ren.length) out.push("", `${E()}. Renuncias. ${ren.map((p) => `${gnTrat(p)}${p.nombre}, ${gnRel(p)} del causante, ${(x.despacho && x.despacho.docs && x.despacho.docs.renuncia) || (x.tramites && x.tramites.renuncia && x.tramites.renuncia.estado === "hecho") ? "renunció pura y simplemente a la herencia por escritura autorizada por el notario ⟦…⟧ el ⟦fecha⟧, número ⟦…⟧ de protocolo, de la que se exhibe copia autorizada" : "renuncia pura, simple y gratuitamente a la herencia en escritura que se otorga ⟦con anterioridad / en este mismo acto⟧"} (art. 1008 CC)`).join(". ")}. Su porción se defiere conforme a la ley (arts. 922, 923 y 981 a 985 CC), y así resulta del cuadro de cuotas.`);
  out.push("", `${E()}. Certificado de seguros. Según el certificado del Registro de Contratos de Seguros de Cobertura de Fallecimiento (Ley 20/2005, de 14 de noviembre), ${seg.length ? `el causante era asegurado en ${seg.length === 1 ? "un contrato" : "contratos"} cuyas prestaciones percibe${seg.length > 1 ? "n" : ""} ${seg.map((p) => `${p.nombre} (${eur(num(p.seguro))})`).join(" y ")} por derecho propio, al margen de la herencia (art. 88 de la Ley 50/1980, de Contrato de Seguro), aunque tributan en el Impuesto sobre Sucesiones (art. 3.1.c Ley 29/1987)` : "⟦resultado del certificado: no constan contratos / constan los siguientes⟧"}.`);
  out.push("", `${E()}. Inventario. El caudal relicto se integra por los siguientes bienes y derechos:`, "", "ACTIVO", "", I.lineas.join("\n\n"), "", I.tabla);
  out.push("", "PASIVO", "", I.pasivo.length ? I.pasivo.join("\n") : "- No consta pasivo. ⟦confirmar que no existen deudas del causante⟧.");
  if (m.ajuar) out.push("", `Ajuar doméstico: ${eur(m.ajuar)}. Se computa solo a efectos del Impuesto sobre Sucesiones (art. 15 Ley 29/1987) y no es objeto de adjudicación.`);
  out.push("", `${E()}. Valoración. Los comparecientes asignan a los bienes los valores indicados, que son su valor real a la fecha del fallecimiento. Los inmuebles se declaran, como mínimo, por su valor de referencia catastral (art. 9.3 Ley 29/1987).`);
  const rgNom = m.liquidacion && !m.liquidacion.defecto && m.liquidacion.regimen ? m.liquidacion.regimen.nombre : "Sociedad de gananciales"; // G04
  if (m.gananciales) out.push("", `${E()}. ${rgNom}. ${K && K.gan ? K.gan.replace(/^Se adjudica[\s\S]*$/m, "").trim() : `El remanente ganancial se divide por mitad (art. 1404 CC): ${eur(m.mitadViudo)} para el cónyuge supérstite y ${eur(m.mitadViudo)} para la herencia.`}`);
  const ded = [m.deudas ? `las deudas (${eur(m.deudas)})` : "", m.gastos ? `los gastos de última enfermedad, entierro y funeral (${eur(m.gastos)})` : "", m.legados ? `los legados (${eur(m.legados)})` : ""].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " y $1");
  out.push("", `${E()}. Caudal partible y cuotas. ${ded ? `Deducidos del activo de la herencia (${eur(m.bruto)}) ${ded}, el caudal partible es de ${eur(m.netoReparto)}` : `El caudal partible es de ${eur(m.netoReparto)}`}, que corresponde así:`, "", esrHaberes(x, R, I.PT));
  out.push("", `Y expuesto cuanto antecede, ${otorg}, según ${uno ? "interviene" : "intervienen"}, ${uno ? "OTORGA" : "OTORGAN"} las siguientes`, "", "ESTIPULACIONES");
  const hered = vivos.filter((p) => ((R.isd.derechos || {})[p.id] || []).some((d) => d.fraccion > 0)), unoH = hered.length === 1;
  out.push("", `${O()}. Aceptación. ${(hered.length ? hered : vivos).map((p) => `${gnTrat(p)}${p.nombre}`).join(", ").replace(/, ([^,]*)$/, " y $1")} ${unoH ? "acepta" : "aceptan"} pura y simplemente la herencia de ${c.trC}${c.causante} (arts. 988, 998 y 999 CC)${vivos.some(esrMenor) ? ", y los menores de edad la aceptan por medio de su representante ⟦pura y simplemente, con la autorización o aprobación que proceda / a beneficio de inventario⟧" : ""}.`);
  out.push(esrREV("aceptar pura y simplemente hace responder de las deudas del causante también con los bienes propios (art. 1003 CC). Si hay dudas sobre el pasivo, valorar la aceptación a beneficio de inventario ante notario (arts. 1010, 1011 y 1014 CC)."));
  if (m.gananciales) out.push("", `${O()}. Liquidación de ${rgNom === "Sociedad de gananciales" ? "la sociedad de gananciales" : rgNom.charAt(0).toLowerCase() + rgNom.slice(1)}. ${otorg[0].toUpperCase() + otorg.slice(1)}${viudoRen ? `, con ${viudoRen.nombre},` : ""} ${uno && !viudoRen ? "aprueba" : "aprueban"} la liquidación expuesta. ${K && K.gan ? (/^Se adjudica[\s\S]*$/m.exec(K.gan) || [""])[0] : "Se adjudica al cónyuge supérstite, en pago de su mitad, la mitad indivisa de cada bien ganancial."}`.replace(/\.$/, "") + " (arts. 1392 y 1396 a 1404 CC).");
  const legs = I.PT.B.filter((q) => q.leg);
  if (legs.length) out.push("", `${O()}. Entrega de legados. ${otorg[0].toUpperCase() + otorg.slice(1)} que son herederos entregan ${legs.map((q) => `a ${persona(x, q.leg).nombre} el legado de ${esrNomB(q.b)}${q.cc < 0.9999 ? ` (la parte del causante, ${esrPct(q.cc)})` : ""}, valorado en ${eur(q.v)}`).join("; ")}, que ${legs.length > 1 || new Set(legs.map((q) => q.leg)).size > 1 ? "los legatarios aceptan y reciben" : "el legatario acepta y recibe"}. El legatario de cosa propia del testador adquiere su propiedad desde la muerte, pero debe pedir su entrega a los herederos (arts. 882 y 885 CC).`);
  out.push("", `${O()}. Adjudicaciones. En pago de su haber hereditario se adjudican:`, "", K ? K.lineas : "⟦adjudicaciones bien por bien⟧");
  if (K && K.hayComp) {
    out.push("", `${O()}. Excesos de adjudicación y compensaciones. ${K.exc}`, `Las compensaciones se pagan ⟦en este acto / en el plazo de …⟧ mediante ⟦medio de pago: transferencia a la cuenta …, cheque bancario número …⟧, cuyo justificante se incorpora (art. 24 de la Ley del Notariado y art. 177 del Reglamento Notarial).`);
    if (K.rev) out.push(esrREV(K.rev));
  }
  out.push("", `${O()}. Efectos de la partición. ${uno ? "El adjudicatario se da" : "Los adjudicatarios se dan"} por ${uno ? "pagado" : "pagados"} de su haber. La partición confiere a cada heredero la propiedad exclusiva de los bienes que le han sido adjudicados (art. 1068 CC)${uno ? "" : ", y los coherederos quedan recíprocamente obligados a la evicción y saneamiento de los bienes adjudicados (art. 1069 CC)"}. Cada adjudicatario toma posesión de lo adjudicado desde hoy, con efectos civiles desde el fallecimiento (arts. 657 y 989 CC).`);
  const isd = c.pl.isd;
  out.push("", `${O()}. Impuestos. Impuesto sobre Sucesiones y Donaciones (${R.isd.territorio}): ${otorg} ${uno ? "manifiesta" : "manifiestan"} que ${uno ? "presentará" : "presentarán"} la autoliquidación dentro del plazo de seis meses desde el fallecimiento${isd && isd.limite ? `, que termina el ${fechaLarga(isd.limite)}` : ""} (arts. 67 y 68 del Reglamento, RD 1629/1991). Cuotas estimadas:`, "", T.tabla, "", `${R.plus.length ? `Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana: ${R.plus.map(({ b, r }) => `${esrNomB(b)} (${r.municipio}), ${r.noSujeto ? "no sujeto" : eur(r.total)}`).join("; ")}. Los adquirentes son sujetos pasivos (art. 106.1.a TRLRHL) y deben declararlo o autoliquidarlo en seis meses desde el fallecimiento, prorrogables hasta un año (art. 110.2.b TRLRHL).` : inm.length ? "Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana: ⟦completar los datos catastrales de los inmuebles para su cálculo⟧." : "No hay inmuebles urbanos: no se devenga el Impuesto sobre el Incremento de Valor de los Terrenos."} El Registro de la Propiedad no inscribirá sin acreditar la presentación de ambos impuestos (arts. 254.1 y 254.5 de la Ley Hipotecaria).`);
  if (inm.length) out.push("", `${O()}. Catastro. ${otorg[0].toUpperCase() + otorg.slice(1)} ${uno ? "aporta" : "aportan"} la referencia catastral de ${inm.length === 1 ? "la finca" : "las fincas"} (arts. 38 y 40 del texto refundido de la Ley del Catastro Inmobiliario), que consta en el inventario, y ${uno ? "solicita" : "solicitan"} que el notario comunique la alteración de titularidad al Catastro (art. 14.a de la misma ley), con lo que no tendrán que presentar declaración.`);
  if (inm.length) out.push("", `${O()}. Inscripción. Se solicita la inscripción de los bienes adjudicados en el Registro de la Propiedad (arts. 14 y 16 de la Ley Hipotecaria y 76 a 80 de su Reglamento) y, si algún defecto lo impidiera, la inscripción parcial de lo que proceda (art. 19 bis LH).`);
  out.push("", `${O()}. Gastos. Los gastos de esta escritura, de su inscripción y de la partición se satisfacen por los adjudicatarios en proporción a sus haberes (art. 1064 CC).`);
  out.push("", "OTORGAMIENTO Y AUTORIZACIÓN", "", `Así lo ${uno ? "dice y otorga" : "dicen y otorgan"}. Hago ${aOt} las reservas y advertencias legales, en especial las de carácter fiscal: la obligación de presentar las autoliquidaciones del Impuesto sobre Sucesiones y del Impuesto sobre el Incremento de Valor de los Terrenos, las consecuencias de no hacerlo en plazo y la afección de los bienes al pago de los impuestos (art. 79 de la Ley General Tributaria). Informo de que sus datos se incorporan a los ficheros de la notaría conforme al Reglamento (UE) 2016/679 y a la Ley Orgánica 3/2018 ⟦cláusula de la notaría⟧.`, "", `Leída por mí esta escritura, ${uno ? "el compareciente la aprueba y firma" : "los comparecientes la aprueban y firman"} conmigo. De identificar ${aOt} por sus documentos de identidad, de que el otorgamiento se adecua a la legalidad y a la voluntad debidamente informada ${deOt} y de todo lo contenido en este instrumento público, yo, el Notario, doy fe.`);
  out.push("", comps.map((p) => `Fdo.: ${p.nombre || "⟦nombre⟧"}`).join("\n"));
  out.push("", "DOCUMENTOS QUE SE UNEN", "", ["Certificado de defunción.", "Certificado del Registro General de Actos de Última Voluntad.", "Certificado del Registro de Contratos de Seguros de Cobertura de Fallecimiento.", esrTest(x) ? "Copia autorizada del último testamento." : "Copia autorizada del acta de declaración de herederos abintestato.", ...(inm.length ? ["Certificaciones catastrales descriptivas y gráficas de las fincas."] : []), ...(PTcuentas(x) ? ["Certificados bancarios de saldos y posiciones a la fecha del fallecimiento."] : []), ...(I.pasivo.length ? ["Justificantes del pasivo (certificados de deuda y facturas)."] : [])].map((t) => "- " + t).join("\n"));
  const av = esrAvisos(x, c);
  if (av.length) out.push("", ...av.map(esrREV));
  out.push("", esrREV("borrador del despacho para facilitar la redacción a la notaría. Cotejar los datos de identidad, las descripciones registrales y los títulos con los originales; la redacción y la calificación corresponden al notario."));
  return out.join("\n");
}
const PTcuentas = (x) => (x.bienes || []).some((b) => b.tipo === "cuenta" || b.tipo === "valores");

// ───────────────────── 2. Cuaderno particional ─────────────────────
function esrCuaderno(x, R) {
  if (!R) return "";
  const c = esrCtx(x, R), vivos = esrVivos(x), I = esrInventario(x, R), K = cpCuaderno(x, R), T = esrImpuestos(x, R), m = I.m, PT = I.PT;
  const viudoRen = (x.personas || []).find((p) => p.renuncia && p.relacion === "conyuge" && (x.bienes || []).some((b) => b.titularidad === "ganancial"));
  const out = [];
  out.push(`${c.membrete}CUADERNO PARTICIONAL DE LA HERENCIA DE ${esrUp(c.trC + c.causante)}`);
  out.push(`Operaciones de inventario, avalúo, liquidación, división y adjudicación${c.ref ? " · referencia " + c.ref : ""}`);
  out.push("", `En ${c.lugar}, a ⟦fecha de firma⟧.`, "", "REUNIDOS", "", vivos.map((p, i) => esrComp(p, i)).join("\n") + (viudoRen ? `\n${vivos.length + 1}. ${esrComp(viudoRen).replace(/\.$/, "")}, que ha renunciado a la herencia e interviene solo para liquidar la sociedad de gananciales.` : ""));
  out.push("", `Intervienen en su propio nombre y derecho${vivos.some(esrMenor) ? ", salvo los menores, que actúan por medio de su representante" : ""}, y manifiestan tener la libre disposición de sus bienes y no tener establecida ninguna medida de apoyo que afecte a este acto.`);
  out.push("", "ANTECEDENTES");
  out.push("", `I. Fallecimiento. ${c.trC}${c.causante}, con DNI/NIF ${c.nifC} y vecindad civil ${c.vecTxt || "⟦vecindad civil⟧"}, falleció el ${c.fm}${c.civilC ? `, en estado de ${c.civilC}` : ""}. Su último domicilio fue ${c.domC}.`);
  out.push("", `II. Título sucesorio. ${esrTitulo(x, c, R)}`);
  out.push("", `III. Llamados a la herencia. ${esrLlamados(x, R)}`);
  out.push(esrREV(`${R.isd.notasReparto.length ? `reparto aplicado en el cálculo: ${R.isd.notasReparto.join(" ")} ` : ""}Comprobar cuotas, legítimas (arts. 806 a 822 CC), sustituciones y derecho de acrecer si alguien renunció (arts. 774 y 981 a 985 CC), usufructo del viudo (arts. 834 a 840 CC) y legados.`));
  out.push("", `IV. Voluntad de partir. Los herederos, mayores de edad y con la libre administración de sus bienes, acuerdan partir la herencia de común acuerdo y en la forma que tienen por conveniente (arts. 1051 y 1058 CC), conforme a las siguientes`);
  out.push("", "OPERACIONES PARTICIONALES");
  out.push("", "PRIMERA. Inventario.", "", "A) Activo", "", I.lineas.join("\n\n"), "", I.tabla, "", "B) Pasivo", "", I.pasivo.length ? I.pasivo.join("\n") : "- No consta pasivo.");
  if (m.ajuar) out.push("", `C) Ajuar doméstico: ${eur(m.ajuar)}. Solo se computa a efectos del Impuesto sobre Sucesiones (art. 15 Ley 29/1987); no se adjudica.`);
  if ((x.personas || []).some((p) => num(p.donaciones) > 0)) out.push(esrREV("constan donaciones previas a herederos: valorar si son colacionables (arts. 1035 a 1050 CC) o si deben computarse para el cálculo de las legítimas (art. 818 CC)."));
  out.push("", "SEGUNDA. Avalúo.", "", `Se aceptan como valores los del inventario, que son el valor real de los bienes a la fecha del fallecimiento. Los inmuebles se valoran, como mínimo, por su valor de referencia catastral (art. 9.3 Ley 29/1987); los saldos y valores, por los certificados de las entidades a esa fecha.`);
  let n = 2; const Q = () => ESR_ORD[n++];
  if (m.gananciales) out.push("", `${Q()}. Liquidación de la sociedad de gananciales.`, "", K && K.gan ? K.gan : `El remanente ganancial se divide por mitad (art. 1404 CC): ${eur(m.mitadViudo)} para el cónyuge supérstite y ${eur(m.mitadViudo)} para la herencia.`, esrREV("clasificación de cada bien como privativo o ganancial (arts. 1346 a 1361 CC), reintegros y reembolsos, y derecho del cónyuge supérstite a que se incluya con preferencia en su haber la vivienda habitual (arts. 1406 y 1407 CC)."));
  out.push("", `${Q()}. Liquidación del caudal hereditario.`, "", esrTabla(["Concepto", "Importe"], [["Activo de la herencia", eur(m.bruto)], ...(m.deudas ? [["Deudas", "− " + eur(m.deudas)]] : []), ...(m.gastos ? [["Gastos de última enfermedad, entierro y funeral", "− " + eur(m.gastos)]] : []), ...(m.legados ? [["Legados", "− " + eur(m.legados)]] : []), ["Caudal partible", eur(m.netoReparto)]]));
  if (m.pasivoExcede > 0) out.push(esrREV(`el pasivo supera al activo en ${eur(m.pasivoExcede)}: no firmar sin valorar la aceptación a beneficio de inventario o la renuncia (arts. 1010, 1023 y 1008 CC).`));
  out.push("", `${Q()}. Cuotas y haber de cada heredero.`, "", esrHaberes(x, R, PT), "", "Los usufructos se valoran conforme al art. 26 de la Ley 29/1987 (usufructo vitalicio: 89 menos la edad del usufructuario, con un mínimo del 10 % y un máximo del 70 %).");
  // Formación de lotes (hijuelas): qué parte de cada bien lleva cada heredero, con los valores del cuadro de partición
  const lotes = PT.H.map((h, i) => {
    const filas = PT.B.filter((q) => PT.cell[q.b.id][h.p.id]).map((q) => [esrNomB(q.b), q.leg === h.p.id ? "legado" : q.adj === h.p.id ? "pleno dominio, entero" : (R.isd.derechos[h.p.id] || []).filter((d) => d.fraccion > 0).map(esrDer).join(" y "), eur(PT.cell[q.b.id][h.p.id].v)]);
    if (h.cargas > 0.5) filas.push(["Deudas y gastos a su cargo", h.cargasUsufructo > 0.5 ? "minoración del usufructo" : "", "− " + eur(h.cargas)]);
    filas.push(["Total del lote", "", eur(h.adjud + h.legados)]);
    return `Lote ${i + 1}. ${gnTrat(h.p)}${h.p.nombre || "—"}\n\n${esrTabla(["Bien", "Derecho", "Valor"], filas)}`;
  });
  out.push("", `${Q()}. Formación de lotes.`, "", lotes.join("\n\n"), "", esrTabla(["Heredero", "Haber", "Adjudicado", "Diferencia"], PT.H.map((h) => [h.p.nombre || "—", eur(h.haber + h.legados), eur(h.adjud + h.legados), (h.dif > 0.005 ? "+" : "") + eur(Math.abs(h.dif) < 0.005 ? 0 : h.dif)])));
  out.push("", `${Q()}. Adjudicaciones.`, "", "En pago de su haber se adjudica:", "", K ? K.lineas : "⟦adjudicaciones bien por bien⟧");
  if (K && K.exc) out.push("", K.exc, `Las compensaciones se pagan ⟦en este acto / en la forma y plazo pactados⟧ mediante ⟦medio de pago⟧.`);
  if (K && K.rev) out.push(esrREV(K.rev));
  out.push("", `${Q()}. Impuestos y resultado para cada heredero.`, "", T.tabla, "", `Impuesto sobre Sucesiones: ${R.isd.territorio}; total ${eur(R.isd.total)}.${R.plus.length ? ` Plusvalía municipal: total ${eur(R.totalPlus)}.` : ""} El Impuesto sobre Sucesiones se liquida por las cuotas hereditarias, cualquiera que sea la forma de partir (art. 27.1 Ley 29/1987).${T.hayE ? ` ${T.C.T.ajdNota}` : ""}`);
  out.push("", "APROBACIÓN Y ACEPTACIÓN", "", `Los herederos aprueban estas operaciones particionales, aceptan pura y simplemente la herencia y se dan por pagados de su haber con las adjudicaciones anteriores${K && K.hayComp ? " y las compensaciones en dinero" : ""}. La partición confiere a cada heredero la propiedad exclusiva de los bienes adjudicados (art. 1068 CC) y los coherederos quedan recíprocamente obligados a la evicción y saneamiento (art. 1069 CC). Cada heredero pagará los impuestos que le correspondan${T.hayE ? "; el del exceso de adjudicación, quien recibe de más" : ""}, y los gastos comunes de la partición se deducen de la herencia (art. 1064 CC).`);
  out.push(esrREV("firmar este documento es aceptar la herencia pura y simplemente: cada heredero responde de las deudas del causante también con sus propios bienes (arts. 999 y 1003 CC). Si hay dudas sobre el pasivo, aceptar antes a beneficio de inventario ante notario (art. 1011 CC)."));
  out.push("", [...vivos, ...(viudoRen ? [viudoRen] : [])].map((p) => `Fdo.: ${p.nombre || "⟦nombre⟧"}`).join("\n"));
  const av = esrAvisos(x, c); if (av.length) out.push("", ...av.map(esrREV));
  out.push("", "Nota: el cuaderno particional en documento privado obliga a los herederos que lo firman, pero para inscribir los inmuebles en el Registro de la Propiedad las adjudicaciones deben constar en escritura pública (art. 14, párrafo tercero, de la Ley Hipotecaria), salvo la instancia del heredero único (art. 14, párrafo cuarto, LH, y art. 79 RH).");
  return out.join("\n");
}

// ───────────────────── 3. Escritura de renuncia pura, simple y gratuita ─────────────────────
function esrRenuncia(x, R) {
  const c = esrCtx(x, R), L = (x.personas || []).filter((p) => p.renuncia), uno = L.length <= 1;
  const rs = L.length ? L : [{ nombre: "", relacion: "", edad: "" }];
  const intest = !esrTest(x);
  const quien = uno ? gnO(rs[0], "el compareciente", "la compareciente", "el compareciente") : "los comparecientes", aQ = quien.replace(/^(el|la|los) /, (m, a) => (a === "el" ? "al " : "a " + a + " ")), deQ = quien.replace(/^(el|la|los) /, (m, a) => (a === "el" ? "del " : "de " + a + " "));
  const out = [];
  out.push(`${c.membrete}BORRADOR DE ESCRITURA DE RENUNCIA DE HERENCIA`, `Herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""}`);
  out.push("", "NÚMERO ⟦número de protocolo⟧", "", "En ⟦lugar del otorgamiento⟧, a ⟦fecha del otorgamiento⟧.", "", "Ante mí, ⟦nombre del notario⟧, Notario del Ilustre Colegio Notarial de ⟦colegio⟧, con residencia en ⟦residencia⟧,");
  out.push("", uno ? "COMPARECE" : "COMPARECEN", "", rs.map((p, i) => esrComp({ ...p, nombre: p.nombre || "" }, uno ? null : i).replace("⟦nombre y apellidos⟧", "⟦nombre y apellidos de quien renuncia⟧")).join("\n"));
  out.push("", uno ? "INTERVIENE" : "INTERVIENEN", "", `En su propio nombre y derecho. Tiene${uno ? "" : "n"}, a mi juicio, capacidad legal para otorgar esta escritura de RENUNCIA DE HERENCIA y, al efecto,`);
  out.push("", uno ? "EXPONE" : "EXPONEN");
  out.push("", `I. Que ${c.trC}${c.causante}, con DNI/NIF ${c.nifC}, falleció en ⟦lugar del fallecimiento⟧ el ${c.fm}, con último domicilio en ${c.domC}, según certificado de defunción que me exhibe${uno ? "" : "n"} y dejo unido.`);
  out.push("", `II. Título sucesorio. ${esrTitulo(x, c, R).replace(/a las personas que se indican en el apartado siguiente/, "a los parientes con derecho a heredar")}`);
  out.push("", `III. Que ${rs.map((p) => `${p.nombre ? `${gnTrat(p)}${p.nombre}` : "⟦nombre⟧"}, como ${p.relacion ? gnRel(p) : "⟦parentesco⟧"} del causante,`).join(" y ")} ${uno ? "tiene" : "tienen"} derecho a la herencia y ${uno ? "conoce" : "conocen"} con certeza el fallecimiento y su llamamiento (art. 991 CC).`);
  out.push("", `IV. Que no ${uno ? "ha" : "han"} realizado ningún acto que suponga aceptación expresa o tácita de la herencia (arts. 999 y 1000 CC): no ${uno ? "ha" : "han"} dispuesto de bienes del causante, ni cobrado créditos, ni pagado deudas con dinero de la herencia, salvo actos de mera conservación o administración provisional.`);
  out.push("", uno ? "OTORGA" : "OTORGAN");
  out.push("", `PRIMERO. ${quien[0].toUpperCase() + quien.slice(1)} RENUNCIA${uno ? "" : "N"} pura, simple y gratuitamente a la herencia de ${c.trC}${c.causante}, sin reservarse derecho alguno y sin designar a favor de quién se produce la renuncia (arts. 988, 990 y 1008 CC).`);
  out.push("", `SEGUNDO. Efectos. ${intest ? "En la sucesión intestada, la parte del renunciante acrece a los demás herederos del mismo grado (arts. 922 y 981 CC); sus descendientes no heredan en su lugar por derecho de representación (art. 929 CC). Si renuncia el único llamado de su grado, o todos los del mismo grado, heredan los del grado siguiente por su propio derecho (art. 923 CC)." : "La porción del renunciante pasa, por este orden, al sustituto vulgar que designe el testamento (art. 774 CC); en su defecto, a los coherederos por derecho de acrecer cuando se cumplan sus requisitos (arts. 982 y 983 CC); y, si no, a los herederos abintestato (art. 986 CC). Si el renunciante es legitimario, los demás legitimarios reciben la legítima por su propio derecho y no por acrecer (art. 985 CC)."}`);
  out.push("", `TERCERO. Advertencias. Hago ${aQ} las advertencias legales y, en particular: que la renuncia es irrevocable una vez hecha, salvo vicios del consentimiento (art. 997 CC); que si perjudica a sus acreedores, estos pueden pedir al juez que les autorice a aceptar la herencia en nombre del renunciante hasta el importe de sus créditos (art. 1001 CC); que la renuncia a favor de uno o varios coherederos determinados equivale a aceptar (art. 1000 CC) y, a efectos fiscales, es una donación (art. 28.2 Ley 29/1987); y que en la renuncia pura, simple y gratuita no tributa quien renuncia, sino quienes resulten beneficiados, por la porción renunciada (art. 28.1 Ley 29/1987 y art. 58 del Reglamento, RD 1629/1991).`);
  out.push("", "OTORGAMIENTO Y AUTORIZACIÓN", "", `Así lo ${uno ? "dice y otorga" : "dicen y otorgan"}. Leída por mí esta escritura, ${uno ? quien + " la aprueba y firma" : "los comparecientes la aprueban y firman"} conmigo. De identificar ${aQ}, de que el otorgamiento se adecua a la legalidad y a la voluntad debidamente informada ${deQ} y de todo lo contenido en este instrumento público, yo, el Notario, doy fe.`);
  out.push("", rs.map((p) => `Fdo.: ${p.nombre || "⟦nombre⟧"}`).join("\n"));
  out.push("", "DOCUMENTOS QUE SE APORTAN", "", ["DNI de quien renuncia.", "Certificado de defunción.", "Certificado del Registro General de Actos de Última Voluntad.", intest ? "Copia del acta de declaración de herederos, si ya se ha otorgado." : "Copia autorizada del último testamento.", "Libro de familia, si hace falta acreditar el parentesco."].map((t) => "- " + t).join("\n"));
  if (rs.some(esrMenor) || (x.personas || []).some((p) => !p.renuncia && esrMenor(p))) out.push("", esrREV("si la renuncia afecta a menores (porque renuncian en su nombre o porque pasan a heredar), sus representantes necesitan autorización judicial para repudiar en su nombre (art. 166 CC); si se deniega, solo pueden aceptar a beneficio de inventario."));
  if (!L.length) out.push("", esrREV("en el expediente no consta quién renuncia: marcar la renuncia en la ficha del heredero para completar este borrador."));
  out.push("", esrREV("antes de firmar, confirmar que no ha habido aceptación tácita (art. 999 CC): una vez aceptada, la herencia ya no se puede repudiar. Si se busca evitar deudas del causante, valorar también la aceptación a beneficio de inventario (art. 1010 CC)."));
  return out.join("\n");
}

// ───────────────────── 4. Certificados de últimas voluntades y de seguros (modelo 790, código 006) ─────────────────────
function esrSolicitud790(x, R) {
  const c = esrCtx(x, R), D = x.despacho || {}, cli = (x.personas || []).find((p) => D.cliente && p.nombre === D.cliente) || null;
  const desde = c.pl.ultimas_voluntades && c.pl.ultimas_voluntades.desde;
  const sol = c.abNom ? { nombre: c.abNom, nif: "", dom: c.KD.direccion ? c.KD.postal : "", cal: `${gnAbogado(c.ab)}${c.KD.nombre ? " de " + c.KD.nombre : ""}, en nombre de los interesados en la herencia` } : { nombre: D.cliente || "", nif: D.nif || (cli && cli.nif), dom: D.domicilio || (cli && cli.domicilio), cal: cli ? `${gnRel(cli)} del causante` : "" };
  const filas = [["Nombre y apellidos del causante", esrPh(x.nombre, "nombre y apellidos")], ["DNI, NIE o pasaporte", c.nifC], ["Fecha de nacimiento", "⟦fecha de nacimiento⟧"], ["Lugar de nacimiento (municipio, provincia y país)", "⟦lugar de nacimiento⟧"], ["Nombre del padre", "⟦nombre del padre⟧"], ["Nombre de la madre", "⟦nombre de la madre⟧"], ["Fecha de defunción", c.fm], ["Lugar de defunción (municipio y provincia)", "⟦lugar de defunción⟧"], ["Último domicilio", c.domC]];
  const out = [];
  out.push(`${c.membrete}SOLICITUD DE LOS CERTIFICADOS DE ÚLTIMAS VOLUNTADES Y DE CONTRATOS DE SEGUROS DE COBERTURA DE FALLECIMIENTO`, `Datos para el modelo 790, código 006 · herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""}`);
  out.push("", "1. QUÉ SE PIDE", "", "- Certificado del Registro General de Actos de Última Voluntad: si el causante otorgó testamento, ante qué notario, en qué fecha y con qué número de protocolo (Reglamento Notarial, anexo II).", "- Certificado del Registro de Contratos de Seguros de Cobertura de Fallecimiento: qué seguros de vida o de accidentes tenía y con qué entidades (Ley 20/2005, de 14 de noviembre, y Real Decreto 398/2007). No indica los beneficiarios: se piden a cada aseguradora.", "", "Se rellena un modelo 790-006 por cada certificado y se paga la tasa de cada uno (importe vigente: el que figure en el propio modelo).");
  out.push("", "2. CUÁNDO", "", `Desde que hayan pasado quince días hábiles desde el fallecimiento: a partir del ${desde ? fechaLarga(desde) : "⟦fecha⟧"}. Hace falta el certificado de defunción.`);
  out.push("", "3. DATOS DEL CAUSANTE", "", esrTabla(["Dato", "Contenido"], filas));
  out.push("", "4. DATOS DEL SOLICITANTE", "", esrTabla(["Dato", "Contenido"], [["Nombre y apellidos", esrPh(sol.nombre, "nombre del solicitante")], ["DNI/NIF", esrPh(sol.nif, "DNI o NIF")], ["Domicilio a efectos de notificaciones", esrPh(sol.dom, "domicilio")], ["Calidad en que solicita", esrPh(sol.cal, "relación con el causante o representación")]]));
  out.push("", "5. CÓMO SE PRESENTA", "", "- Por internet, en la sede electrónica del Ministerio de Justicia, con certificado digital o Cl@ve.", "- En persona, en las gerencias territoriales del Ministerio de Justicia (con cita previa) o en cualquier registro público.", "- Por correo, dirigido al Registro General de Actos de Última Voluntad (Ministerio de Justicia), con el certificado de defunción y el justificante de la tasa.");
  out.push("", `6. DESPUÉS`, "", esrTest(x) ? "- Con el certificado de últimas voluntades se pide al notario la copia autorizada del último testamento." : x.testamento === "no" ? "- Si confirma que no hay testamento, se tramita el acta notarial de declaración de herederos (arts. 55 y 56 de la Ley del Notariado)." : "- Según lo que diga el certificado: copia autorizada del testamento o acta notarial de declaración de herederos (arts. 55 y 56 de la Ley del Notariado).", "- Con el certificado de seguros se escribe a cada aseguradora para conocer los beneficiarios y la documentación para el cobro.");
  out.push("", esrREV("comprobar el importe vigente de la tasa y los canales de presentación en la sede del Ministerio de Justicia antes de enviarlo. El modelo pide también los nombres de los padres y los datos de nacimiento del causante, que no constan en el expediente."));
  return out.join("\n");
}

// ───────────────────── 5. Carta a la familia con los documentos que faltan ─────────────────────
const ESR_GRUPOS_DOC = [["Sobre la persona fallecida", /^(defuncion|ultimas|seguros|declaracion|testigos|testamento|padron_causante|renta)$/], ["Sobre los herederos", /^(dni|libro|matrimonio|pareja|discap|donac|padron|renuncia)$/], ["Sobre los bienes", /^(esc_|ibi_|vref_|cert_|veh_|emp_)/], ["Deudas, gastos y seguros", /^(deudas|facturas|polizas)$/]];
// Dónde lo consigue la familia (lenguaje llano); lo demás, con la indicación de docsNecesarios
const ESR_DONDE = { defuncion: "Lo facilita la funeraria; si no, se pide gratis en el Registro Civil", ultimas: "Lo pide el despacho al Ministerio de Justicia si no lo tienen ya", seguros: "Lo pide el despacho al Ministerio de Justicia si no lo tienen ya", testamento: "Si tienen la copia que dio el notario, nos basta; si no, la pedimos a la notaría", declaracion: "La tramitamos con la notaría; necesitaremos los datos de dos testigos", testigos: "Nombre, DNI y teléfono de dos personas que conocieran al fallecido y a la familia y no sean herederos", padron_causante: "Certificado histórico de empadronamiento del Ayuntamiento del último domicilio", renta: "Copia de la última declaración presentada o los datos de acceso para descargarla", dni: "Copia por las dos caras de cada heredero", libro: "Lo suele tener la familia; si no, certificados del Registro Civil", matrimonio: "Registro Civil", pareja: "Registro de parejas de hecho de la comunidad o del ayuntamiento", discap: "Resolución de la comunidad autónoma que reconoce el grado", donac: "Copia de las escrituras o documentos de las donaciones", padron: "Certificado histórico de empadronamiento del Ayuntamiento", renuncia: "Copia de la escritura de renuncia otorgada ante notario", deudas: "La entidad que dio el préstamo o la hipoteca, a la fecha del fallecimiento", facturas: "Funeraria, hospital o clínica", polizas: "Cada aseguradora; nos sirven también los recibos o las pólizas" };
const esrDonde = (id, d) => ESR_DONDE[id] || (/^esc_/.test(id) ? "Copia de la escritura de compra si la tienen; si no, pedimos nota simple al Registro" : /^ibi_/.test(id) ? "Nos vale una copia; si no lo encuentran, lo facilita el Ayuntamiento o la oficina de recaudación" : /^vref_/.test(id) ? "Lo obtiene el despacho en la Sede Electrónica del Catastro" : /^cert_/.test(id) ? "La oficina del banco o la gestora, a la fecha del fallecimiento" : /^veh_/.test(id) ? "Suelen estar en el vehículo; si no, en la DGT" : /^emp_/.test(id) ? "La gestoría o el administrador de la sociedad" : d || "");
function esrCartaFamilia(x, R) {
  const c = esrCtx(x, R), D = x.despacho || {}, todos = docsNecesarios(x), tiene = (id) => !!(D.docs && D.docs[id]);
  const cubiertos = new Set((Array.isArray(x.solicitudes) ? x.solicitudes : []).filter((s) => s && s.estado !== "recibida").flatMap((s) => s.docs || []));
  const despacho = (id) => cubiertos.has(id) || /^vref_/.test(id); // el valor de referencia lo obtiene el despacho en la Sede del Catastro
  const falta = todos.filter(([id]) => !tiene(id) && !despacho(id)), pedidos = todos.filter(([id]) => !tiene(id) && despacho(id)), ya = todos.filter(([id]) => tiene(id));
  const minus = (t) => (/^\p{Lu}\p{Ll}/u.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const cli = (x.personas || []).find((p) => D.cliente && p.nombre === D.cliente) || null;
  const pila = String(D.cliente || "").trim().split(/\s+/)[0] || "";
  const saludo = cli && gnG(cli) && pila ? `${gnO(cli, "Estimado", "Estimada")} ${pila}:` : "Estimada familia:";
  const grupo = ([t, re]) => { const L = falta.filter(([id]) => re.test(id)); return L.length ? `${t.toUpperCase()}\n\n${L.map(([id, tt, d]) => `- ${tt}${id === "dni" && d ? ` (${d})` : ""}. ${esrDonde(id, d)}.`.replace(/\.\.$/, ".").replace(/\. \.$/, ".")).join("\n")}` : ""; };
  const isd = c.pl.isd, pro = c.pl.prorroga_isd;
  const out = [];
  out.push(`${c.membrete}${esrPh(D.cliente, "nombre del cliente")}`, esrPh(D.domicilio || (cli && cli.domicilio), "domicilio del cliente"), "", `En ${c.lugar}, a ${fechaLarga(hoy())}.`, "", `Asunto: herencia de ${c.trC}${c.causante}${c.ref ? ` (ref. ${c.ref})` : ""}. Documentos que necesitamos.`, "", saludo);
  out.push("", falta.length ? `Para seguir adelante con la herencia necesitamos ${falta.length === 1 ? "el documento que les indicamos" : `los ${falta.length} documentos que les indicamos`} a continuación. Junto a cada uno les decimos dónde se consigue; si alguno les resulta difícil de obtener, avísennos y lo pedimos desde el despacho.` : "Les confirmamos que, por su parte, ya tenemos toda la documentación que necesitábamos. Muchas gracias por su ayuda.");
  if (falta.length) out.push("", ESR_GRUPOS_DOC.map(grupo).filter(Boolean).join("\n\n"));
  if (pedidos.length) out.push("", `De estos nos ocupamos nosotros y no tienen que hacer nada: ${pedidos.map(([, t]) => minus(t)).join("; ")}.`);
  if (ya.length) out.push("", `Ya tenemos: ${ya.map(([, t]) => minus(t)).join("; ")}.`);
  if (isd && isd.limite && isd.limite >= hoy()) out.push("", `Les pedimos que nos los hagan llegar cuanto antes: el plazo para presentar el Impuesto sobre Sucesiones termina el ${fechaLarga(isd.limite)}${pro && pro.limite && pro.limite >= hoy() ? ` y, si hiciera falta más tiempo, la prórroga solo puede pedirse hasta el ${fechaLarga(pro.limite)}` : ""}.`);
  out.push("", `Pueden enviarlos escaneados o en una foto legible ${c.KD.email ? `al correo ${c.KD.email}` : "a ⟦correo del despacho⟧"}${c.KD.tel ? ` o llamarnos al ${c.KD.tel} para cualquier duda` : ""}. Los originales los necesitaremos el día de la firma.`);
  out.push("", "Mientras tanto, les recomendamos no retirar dinero de las cuentas del fallecido, no vender ni alquilar sus bienes y no pagar deudas con su dinero sin consultarnos antes: algunos de esos actos suponen aceptar la herencia (art. 999 del Código Civil) y después ya no se podría renunciar.");
  out.push("", "Un cordial saludo,", "", `Fdo.: ${c.abNom || "⟦nombre del abogado⟧"}`, c.KD.nombre || "⟦despacho⟧");
  return out.join("\n");
}

// ───────────────────── 6. Catastro: declaración de cambio de titular por herencia (modelo 900D) ─────────────────────
// Titulares de cada inmueble tras la partición: parte que no es de la herencia + derechos de cada heredero sobre la parte del causante
function esrTitularesInm(x, R, PT, q) {
  const der = R.isd.derechos || {}, b = q.b, F = [];
  const cy = (x.personas || []).find((p) => p.relacion === "conyuge");
  if (q.cc < 0.9999) F.push(b.titularidad === "ganancial" ? [cy ? `${cy.nombre} (su mitad de gananciales)` : "⟦cónyuge supérstite⟧ (su mitad de gananciales)", cy ? esrPh(cy.nif, "NIF") : "⟦NIF⟧", "pleno dominio", esrPct(1 - q.cc)] : ["⟦otros cotitulares⟧", "⟦NIF⟧", "pleno dominio", esrPct(1 - q.cc)]);
  for (const p of PT.cols) {
    if (!PT.cell[b.id][p.id]) continue;
    if (q.leg === p.id || q.adj === p.id) { F.push([p.nombre, esrPh(p.nif, "NIF"), "pleno dominio", esrPct(q.cc)]); continue; }
    for (const d of (der[p.id] || []).filter((d) => d.fraccion > 0)) F.push([p.nombre, esrPh(p.nif, "NIF"), d.tipo === "pleno" ? "pleno dominio" : d.tipo === "usufructo" ? "usufructo" : "nuda propiedad", esrPct(d.fraccion * q.cc)]);
  }
  return F;
}
function esrCatastro(x, R) {
  if (!R) return "";
  const c = esrCtx(x, R), PT = particion(x, R), Q = PT.B.filter((q) => q.inm);
  const foral = Q.some((q) => { const pv = typeof muniProv === "function" ? muniProv(ineBien(q.b)) : null; return pv && ["ALA", "BIZ", "GIP", "NAV"].includes(pv.ccaa); }) || ["NAV", "ALA", "BIZ", "GIP"].includes(x.ccaa);
  const vivos = esrVivos(x), dec = vivos[0];
  const out = [];
  out.push(`${c.membrete}DECLARACIÓN CATASTRAL DE CAMBIO DE TITULAR POR HERENCIA`, `Modelo 900D · herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""}`);
  out.push("", esrREV("solo hace falta si la alteración no la comunica el notario. Cuando la herencia se formaliza en escritura pública y en ella consta la referencia catastral, el notario la comunica al Catastro y los herederos quedan dispensados de declarar (arts. 13.2 y 14.a del texto refundido de la Ley del Catastro Inmobiliario, RDLeg 1/2004). Hay que presentarla, por ejemplo, si la partición se hizo en documento privado o si en la escritura no constaba la referencia catastral. El modelo vigente es el 900D (Orden HAC/1293/2018); los antiguos 901N a 904N ya no se usan."));
  if (foral) out.push(esrREV("algún inmueble está en Navarra o en el País Vasco: allí el catastro es foral y no se usa el modelo 900D; seguir el procedimiento de la Hacienda foral correspondiente."));
  out.push("", `A LA GERENCIA DEL CATASTRO DE ⟦provincia⟧`);
  out.push("", "1. DECLARANTE", "", `${dec ? `${gnTrat(dec)}${dec.nombre}, con DNI/NIF ${esrPh(dec.nif, "número")} y domicilio en ${esrPh(dec.domicilio, "domicilio")}` : "⟦nombre, NIF y domicilio del declarante⟧"}, ${vivos.length > 1 ? "en su nombre y en el de los demás adquirentes (cumplida la obligación por uno de los obligados, se entiende cumplida por todos, art. 13.2 TRLCI)" : "en su propio nombre"}.`);
  out.push("", "2. HECHO QUE SE DECLARA", "", `Adquisición de la titularidad de los inmuebles por herencia de ${c.trC}${c.causante}, ${c.falC} el ${c.fm}, con DNI/NIF ${c.nifC}. Título: ${esrTest(x) ? "testamento" : "acta de declaración de herederos"} y ${(x.firma && x.firma.fecha) ? `escritura de aceptación y adjudicación de herencia de ${fechaLarga(x.firma.fecha)}` : "⟦documento de aceptación y adjudicación (escritura o documento privado) y su fecha⟧"}.`);
  out.push("", "3. INMUEBLES Y TITULARES RESULTANTES", "");
  if (!Q.length) out.push("No hay inmuebles en el expediente.");
  Q.forEach((q, i) => { const mu = typeof tcMuniN === "function" ? tcMuniN(q.b) : ""; out.push(`${i + 1}. ${esrNomB(q.b)}${mu && !esrNomB(q.b).includes(mu) ? ", " + mu : ""}. Referencia catastral: ${esrPh(q.b.refCatastral, "referencia catastral")}.`, "", esrTabla(["Titular", "NIF", "Derecho", "Porcentaje"], esrTitularesInm(x, R, PT, q)), ""); });
  if (Q.some((q) => PT.cols.some((p) => ((R.isd.derechos || {})[p.id] || []).some((d) => d.tipo === "usufructo")) && !q.leg && !q.adj)) out.push("El usufructo y la nuda propiedad recaen sobre la misma participación: la suma de los porcentajes de pleno dominio y de nuda propiedad es el 100 % del inmueble.", "");
  out.push("4. DOCUMENTACIÓN QUE SE ACOMPAÑA", "", ["Copia del documento de aceptación y adjudicación de la herencia.", "Certificado de defunción y título sucesorio.", "Copia del DNI/NIF del declarante y, en su caso, autorización de representación.", "Último recibo del IBI, si se dispone de él."].map((t) => "- " + t).join("\n"));
  out.push("", "5. PLAZO Y PRESENTACIÓN", "", "Dos meses desde el día siguiente al del hecho, acto o negocio que se declara (Sede Electrónica del Catastro, «Procedimientos y trámites»). Se presenta por la Sede Electrónica del Catastro o en la Gerencia, o en los ayuntamientos con convenio.");
  out.push("", `En ${c.lugar}, a ⟦fecha⟧.`, "", `Fdo.: ${dec ? dec.nombre : "⟦declarante⟧"}`);
  return out.join("\n");
}

// ───────────────────── 7. Plusvalía municipal: declaración por transmisión mortis causa ─────────────────────
function esrPlusvalia(x, R) {
  if (!R) return "";
  const c = esrCtx(x, R), vivos = esrVivos(x), pl = c.pl.plusvalia;
  const out = [];
  out.push(`${c.membrete}DECLARACIÓN DEL IMPUESTO SOBRE EL INCREMENTO DE VALOR DE LOS TERRENOS DE NATURALEZA URBANA`, `Transmisión por causa de muerte · herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""}`);
  if (!R.plus.length) { out.push("", "No hay inmuebles con los datos catastrales completos (valor catastral total y del suelo y fecha de adquisición).", "", esrREV("completar los datos de los inmuebles para preparar la declaración.")); return out.join("\n"); }
  const porMuni = {};
  for (const e of R.plus) (porMuni[e.r.municipio] = porMuni[e.r.municipio] || []).push(e);
  Object.entries(porMuni).forEach(([mu, L], k) => {
    const tit = [...new Set(L.flatMap(({ r }) => (r.porTitular || []).map((t) => t.heredero)))].map((nm) => (x.personas || []).find((p) => p.nombre === nm) || { nombre: nm });
    out.push("", `${k + 1}. AL AYUNTAMIENTO DE ${esrUp(mu)} · ⟦órgano de gestión tributaria⟧`, "");
    out.push(`${tit.map((p) => `${gnTrat(p)}${p.nombre}, con DNI/NIF ${esrPh(p.nif, "número")} y domicilio en ${esrPh(p.domicilio, "domicilio")}`).join("; ")}, como ${tit.length > 1 ? "adquirentes y sujetos pasivos" : "adquirente y sujeto pasivo"} del impuesto (art. 106.1.a TRLRHL), ante este Ayuntamiento ${tit.length > 1 ? "comparecen" : "comparece"} y`);
    out.push("", tit.length > 1 ? "EXPONEN" : "EXPONE");
    out.push("", `Primero. Que ${c.trC}${c.causante}, con DNI/NIF ${c.nifC}, falleció el ${c.fm}, fecha del devengo del impuesto (art. 109.1.a TRLRHL). Título sucesorio: ${esrTest(x) ? "testamento" : x.testamento === "no" ? "acta de declaración de herederos" : "⟦título sucesorio⟧"}.`);
    L.forEach(({ b, r }, j) => {
      const sub = L.length > 1 ? ` ${j + 1}` : "";
      out.push("", `Segundo${sub}. Inmueble: ${esrNomB(b)}. Referencia catastral ${esrPh(b.refCatastral, "referencia catastral")}. Valor catastral total ${eur(num(b.valorCatastralTotal))}, del suelo ${eur(num(b.valorCatastralSuelo))}. Adquirido por el causante el ${fechaLarga(b.fechaAdq)}${num(b.valorAdq) ? ` por ${eur(num(b.valorAdq))}` : ""}${r.notaCoef ? ` (${r.notaCoef})` : ""}.${b.titularidad === "ganancial" ? " Bien ganancial: se transmite la mitad del causante." : b.titularidad === "proindiviso" ? ` Pertenecía al causante en un ${esrPct(pctCausante(b.porcentaje) / 100)}.` : ""}`);
      if (r.noSujeto) out.push("", `Tercero${sub}. Que no ha existido incremento de valor, como resulta de los valores de adquisición y de transmisión que se acreditan con los títulos, por lo que la transmisión no está sujeta (art. 104.5 TRLRHL).`);
      else {
        out.push("", `Tercero${sub}. Liquidación estimada:`, "", esrTabla(["Concepto", "Importe"], [["Base por el método objetivo (art. 107.4 TRLRHL)", `${eur(r.baseObjetiva)} (coeficiente ${grp(r.coeficiente, 2)})`], ["Base por el método real (art. 104.5 y 107.5 TRLRHL)", eur(r.baseReal)], [`Base aplicada (método ${r.metodo})`, eur(r.base)], [`Cuota íntegra al ${grp(r.tipo * 100, r.tipo * 100 % 1 ? 2 : 0)} %`, eur(r.cuota)]]), "", esrTabla(["Adquirente", "Parte", "Cuota", "Bonificación", "A ingresar"], (r.porTitular || []).map((t) => [t.heredero, esrPct(t.fraccion), eur(t.cuota), `${grp(Math.round(t.bonificacionPct * 1000) / 10, Math.round(t.bonificacionPct * 1000) % 10 ? 1 : 0)} %`, eur(t.aIngresar)]).concat([["Total", "", "", "", eur(r.total)]])));
        if (r.metodo === "real") out.push("", `Los declarantes optan por determinar la base con el incremento de valor real, por ser inferior al resultante del método objetivo (art. 107.5 TRLRHL), y lo acreditan con los títulos de adquisición y de transmisión.`);
        const bon = (r.porTitular || []).filter((t) => t.bonificacionPct > 0 && !t.exento);
        if (bon.length) out.push("", `${bon.length > 1 ? "Solicitan" : "Solicita"} la bonificación que la ordenanza fiscal prevé para las transmisiones por causa de muerte (art. 108.4 TRLRHL; artículo ⟦…⟧ de la ordenanza): ${bon.map((t) => `${t.heredero}, ${grp(Math.round(t.bonificacionPct * 1000) / 10, Math.round(t.bonificacionPct * 1000) % 10 ? 1 : 0)} %`).join("; ")}, y ${bon.length > 1 ? "acreditan" : "acredita"} sus requisitos con ⟦documentación: parentesco, empadronamiento, convivencia⟧.`);
        const normas = [...new Set((r.porTitular || []).filter((t) => t.norma && (t.bonificacionPct > 0 || t.estado === "PENDIENTE")).map((t) => t.norma))];
        const pend = r.estimacion || r.estadoTipo === "PENDIENTE" || (r.porTitular || []).some((t) => t.estado === "PENDIENTE" || t.bonifPendiente);
        if (pend || normas.length) out.push(esrREV(`${pend ? ((r.estimacion && r.alertas && r.alertas[0]) || "tipo o bonificación pendientes de cotejo con la ordenanza vigente.") : "cotejar la bonificación con la ordenanza vigente."}${normas.length ? ` Fuente de la bonificación en el programa: ${normas.join("; ")}.` : ""}`));
      }
    });
    out.push("", `Cuarto. Que presentan esta declaración dentro del plazo de seis meses desde el fallecimiento${pl && pl.limite ? `, que vence el ${fechaLarga(pl.limite)}` : ""}, prorrogable hasta un año a solicitud del sujeto pasivo dentro de ese plazo (art. 110.2.b TRLRHL).`);
    out.push("", tit.length > 1 ? "SOLICITAN" : "SOLICITA", "", `Que se tenga por presentada esta declaración con los documentos que la acompañan y se practique la liquidación que corresponda${L.some(({ r }) => r.noSujeto) ? ", o se declare la no sujeción de la transmisión" : ""}.`);
    out.push("", "Documentos: título sucesorio, certificado de defunción, escritura o documento de aceptación y adjudicación (si ya existe), último recibo del IBI, título de adquisición del causante y documentos de identidad.");
    out.push("", `En ${c.lugar}, a ⟦fecha⟧.`, "", tit.map((p) => `Fdo.: ${p.nombre}`).join("\n"));
  });
  out.push("", esrREV("comprobar si el Ayuntamiento exige autoliquidación (art. 110.4 TRLRHL) y con qué modelo, y cotejar el tipo, los coeficientes y las bonificaciones con la ordenanza fiscal vigente. Si se pide la prórroga, debe solicitarse antes de que terminen los seis meses."));
  return out.join("\n");
}

// ───────────────────── Vista previa: tablas y marcadores ─────────────────────
function esrVista(t) {
  const L = String(t || "").split("\n"), out = []; let i = 0;
  const mk = (s) => esc(s).replace(/⟦(.*?)⟧/g, "<mark>$1</mark>");
  while (i < L.length) {
    if (/^\s*\|.*\|\s*$/.test(L[i])) {
      const F = []; while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) { const s = L[i++].trim(); if (!/^\|[\s:|-]+\|$/.test(s)) F.push(s.slice(1, -1).split("|").map((c) => c.trim())); }
      const n = (v) => /^[−–+-]?\s?[\d.]+(,\d+)?\s?(€|%)$/.test(v);
      out.push(`<div class="pv-tw" tabindex="0" role="region" aria-label="Tabla: ${esc(F[0].join(", "))}"><table class="pv-t"><thead><tr>${F[0].map((c) => `<th scope="col">${mk(c)}</th>`).join("")}</tr></thead><tbody>${F.slice(1).map((r) => `<tr>${r.map((c) => `<td${n(c) ? ' class="n"' : ""}>${mk(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    // bloque de texto hasta la siguiente tabla (el contenedor conserva los saltos de línea)
    const B = []; while (i < L.length && !/^\s*\|.*\|\s*$/.test(L[i])) B.push(L[i++]);
    out.push(mk(B.join("\n").replace(/^\n+|\n+$/g, "")).replace(/⟦|⟧/g, ""));
  }
  return out.join("");
}

// ───────────────────── Word (.docx): estilos, membrete, pie, tablas y listas ─────────────────────
// Sin librerías: OOXML mínimo y válido (Word y LibreOffice lo abren sin avisos). El texto plano se interpreta como el PDF:
// título, encabezados en mayúsculas, cláusulas (PRIMERA., I., Primero.), listas (- ·), tablas (| a | b |), firmas (Fdo.:), lugar y fecha,
// notas ⟦REVISIÓN…⟧ (párrafo sombreado) y datos por completar ⟦…⟧ (resaltados en amarillo).
const ESR_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", ESR_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const esrX = (t) => String(t == null ? "" : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const esrMay = (s) => { const l = String(s).replace(/[^\p{L}]/gu, ""); return l.length ? l.replace(/[^\p{Lu}]/gu, "").length / l.length : 0; };
function esrRuns(t, o = {}) {
  const base = `${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ""}`;
  const r = (s, hl, b2) => (s ? `<w:r>${base || hl || b2 ? `<w:rPr>${b2 && !o.b ? "<w:b/>" : ""}${base}${hl ? '<w:highlight w:val="yellow"/>' : ""}</w:rPr>` : ""}<w:t xml:space="preserve">${esrX(s)}</w:t></w:r>` : "");
  const lead = o.lead || 0;
  return String(t).split(/(⟦[^⟧]*⟧)/).filter(Boolean).map((sg, k, A) => {
    if (sg.startsWith("⟦")) return r(sg.slice(1, -1), true);
    if (k === 0 && lead) return r(sg.slice(0, lead), false, true) + r(sg.slice(lead));
    return r(sg);
  }).join("");
}
function esrP(t, o = {}) {
  const ppr = `${o.st ? `<w:pStyle w:val="${o.st}"/>` : ""}${o.kn ? "<w:keepNext/>" : ""}${o.kl ? "<w:keepLines/>" : ""}${o.num != null ? `<w:numPr><w:ilvl w:val="${o.num}"/><w:numId w:val="1"/></w:numPr>` : ""}${o.after != null ? `<w:spacing w:after="${o.after}"/>` : ""}${o.ind ? `<w:ind w:left="${o.ind}"${o.hang ? ` w:hanging="${o.hang}"` : ""}/>` : ""}${o.jc ? `<w:jc w:val="${o.jc}"/>` : ""}`;
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${esrRuns(t, o)}</w:p>`;
}
function esrTblXml(F) {
  const W = 8787, nc = Math.max(...F.map((r) => r.length));
  const numC = (v) => /^[−–+-]?\s?[\d.]+(,\d+)?\s?(€|%)$/.test(v) || /^\d+$/.test(v);
  // Anchos: cada columna, como mínimo, su palabra más larga (las cifras, enteras); el resto se reparte según lo que ocupa el texto
  const CH = 120, PAD = 250, txt = (v) => String(v || "").replace(/[⟦⟧]/g, "");
  const minC = Array.from({ length: nc }, (_, j) => Math.max(3, ...F.map((r) => { const v = txt(r[j]); return numC(v) ? v.length : Math.max(0, ...v.split(/\s+/).map((w) => w.length)); })));
  const maxC = Array.from({ length: nc }, (_, j) => Math.max(minC[j], ...F.map((r) => Math.min(70, txt(r[j]).length))));
  let ws = minC.map((m) => m * CH + PAD);
  const base = ws.reduce((a, b) => a + b, 0);
  if (base > W) ws = ws.map((w) => Math.floor((w * W) / base));
  else { const extra = maxC.map((m, j) => Math.max(0, m - minC[j])), te = extra.reduce((a, b) => a + b, 0) || 1; ws = ws.map((w, j) => w + Math.floor(((W - base) * extra[j]) / te)); }
  ws[ws.indexOf(Math.max(...ws))] += W - ws.reduce((a, b) => a + b, 0);
  const tc = (v, j, h, neg) => `<w:tc><w:tcPr><w:tcW w:w="${ws[j]}" w:type="dxa"/>${h ? '<w:shd w:val="clear" w:color="auto" w:fill="E9EDF2"/>' : ""}</w:tcPr><w:p><w:pPr><w:pStyle w:val="Tabla"/>${!h && numC(v) ? '<w:jc w:val="right"/>' : ""}</w:pPr>${esrRuns(v, { b: h || neg })}</w:p></w:tc>`;
  const rows = F.map((r, i) => {
    const neg = i > 0 && (/^(total|caudal partible)/i.test(String(r[0] || "")) || (!String(r[0] || "").trim() && /^total/i.test(String(r[1] || ""))));
    return `<w:tr><w:trPr><w:cantSplit/>${i === 0 ? "<w:tblHeader/>" : ""}</w:trPr>${Array.from({ length: nc }, (_, j) => tc(r[j] || "", j, i === 0, neg)).join("")}</w:tr>`;
  }).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TablaHereda"/><w:tblW w:w="${W}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows}</w:tbl>${esrP("", { after: 60 })}`;
}
// Texto plano → cuerpo del documento
function esrCuerpo(texto) {
  const L = String(texto || "").replace(/\r\n?/g, "\n").split("\n"), out = [];
  let i = 0, primero = true;
  const vacia = (k) => k >= L.length || !L[k].trim();
  const ORDS = /^((?:PRIMER[OA]|SEGUND[OA]|TERCER[OA]|CUART[OA]|QUINT[OA]|SEXT[OA]|S[ÉE]PTIM[OA]|OCTAV[OA]|NOVEN[OA]|D[ÉE]CIM[OA]|UND[ÉE]CIM[OA]|DUOD[ÉE]CIM[OA]|DECIMO\p{Lu}+|Primer[oa]|Segund[oa]|Tercer[oa]|Cuart[oa]|Quint[oa]|Sext[oa]|S[ée]ptim[oa]|Octav[oa]|Noven[oa]|D[ée]cim[oa]|[IVX]{1,5}|[A-H])[.)](?: \d+\.)? )/u;
  while (i < L.length) {
    const s = L[i].replace(/\s+$/, ""), t = s.trim();
    if (!t) { i++; continue; }
    const after = vacia(i + 1) ? 140 : 40;
    if (/^\|.*\|$/.test(t)) {
      const F = []; while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) { const r = L[i++].trim(); if (!/^\|[\s:|-]+\|$/.test(r)) F.push(r.slice(1, -1).split("|").map((c) => c.trim())); }
      if (F.length) out.push(esrTblXml(F));
      continue;
    }
    i++;
    if (/^⟦REVISI[ÓO]N/.test(t) && t.endsWith("⟧") && t.indexOf("⟦", 1) < 0) { out.push(`<w:p><w:pPr><w:pStyle w:val="Nota"/></w:pPr>${esrRuns("Revisión obligatoria por el abogado: ", { b: true })}${esrRuns(t.slice(1, -1).replace(/^REVISI[ÓO]N OBLIGATORIA POR ABOGADO:\s*/i, ""))}</w:p>`); primero = false; continue; }
    const may = t.length >= 4 && t.length <= 160 && !t.includes("⟦") && esrMay(t) >= 0.85 && t.replace(/[^\p{L}]/gu, "").length >= 4;
    if (primero && may) { out.push(esrP(t, { st: "Title" })); primero = false; while (i < L.length && L[i].trim() && !/^\|/.test(L[i].trim())) out.push(esrP(L[i++].trim(), { st: "Subtitle" })); continue; }
    if (may && /^\d{1,2}\.\s/.test(t)) { out.push(esrP(t, { st: "Heading2" })); primero = false; continue; }
    if (may && !/^(Fdo\.|NÚMERO)/.test(t) && !ORDS.test(t) && t.length <= 90) { out.push(esrP(t, { st: "Heading1" })); primero = false; continue; }
    if (/^Fdo\.?:/.test(t)) { out.push(esrP(t, { st: "Firma", after: vacia(i) ? 140 : 0 })); continue; }
    if (/^En [^,]{2,60}, a [^.]{2,60}\.$/.test(t)) { out.push(esrP(t, { jc: "right", after })); continue; }
    const m = /^([-·•–*])\s+(.+)$/.exec(t);
    if (m) { out.push(esrP(m[2], { st: "Lista", num: /^\s{2,}/.test(s) ? 1 : 0, after: vacia(i) ? 140 : 30 })); continue; }
    const nm = /^(\d{1,2}\.|[a-z]\))\s+/.exec(t);
    if (nm && !may) { out.push(esrP(t, { ind: 425, hang: 425, after, lead: nm[0].length, kl: true })); continue; }
    if (/^Lote \d+\.\s/.test(t)) { out.push(esrP(t, { st: "Heading2" })); continue; }
    const o = ORDS.exec(t);
    if (o && !t.includes("⟦") && t.length - o[0].length <= 70 && /^[^.:;]+[.:]?$/.test(t.slice(o[0].length))) { out.push(esrP(t, { st: "Heading2" })); continue; }
    if (o) { const sent = /^[^.:]{1,70}[.:]\s/.exec(t.slice(o[0].length)); out.push(esrP(t, { after, lead: o[0].length + (sent ? sent[0].length : 0), kn: /:$/.test(t) })); continue; }
    if (/^\s{2,}/.test(s)) { out.push(esrP(t, { ind: 567, after })); continue; }
    out.push(esrP(t, { after, kn: /:$/.test(t) }));
    primero = false;
  }
  return out.join("");
}
const ESR_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${ESR_W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-ES" w:eastAsia="es-ES" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:widowControl/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="0F2B4C"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="5C6470"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="280" w:after="140"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="0F2B4C"/><w:spacing w:val="10"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="120"/><w:jc w:val="left"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="0F2B4C"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Lista"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="30"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Firma"><w:name w:val="Signature"/><w:basedOn w:val="Normal"/><w:pPr><w:keepLines/><w:spacing w:before="560" w:after="0"/><w:jc w:val="left"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Nota"><w:name w:val="Nota de revisión"/><w:basedOn w:val="Normal"/><w:pPr><w:keepLines/><w:pBdr><w:left w:val="single" w:sz="18" w:space="6" w:color="B0873D"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8F2E4"/><w:spacing w:before="60" w:after="160" w:line="264" w:lineRule="auto"/><w:ind w:left="170" w:right="113"/></w:pPr><w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Tabla"><w:name w:val="Texto de tabla"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:rPr><w:color w:val="434C59"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="5C6470"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="table" w:styleId="TablaHereda"><w:name w:val="Tabla Hereda"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="BDB7AA"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BDB7AA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BDB7AA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BDB7AA"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BDB7AA"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BDB7AA"/></w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
const ESR_NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${ESR_W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="425" w:hanging="283"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/></w:rPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="–"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="851" w:hanging="283"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
const ESR_SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${ESR_W}"><w:zoom w:percent="100"/><w:defaultTabStop w:val="709"/><w:hyphenationZone w:val="425"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat><w:themeFontLang w:val="es-ES"/><w:decimalSymbol w:val=","/><w:listSeparator w:val=";"/></w:settings>`;
// o: { titulo, ref, expediente, despacho: { nombre, linea } }. Sin o, toma el despacho de Ajustes.
function esrDocx(texto, o = {}) {
  const KD = o.despacho || (typeof despachoContacto === "function" ? despachoContacto() : { nombre: "", linea: "" });
  let t = String(texto || "").replace(/\r\n?/g, "\n");
  // El membrete ya va en la cabecera: se quita del principio del texto si coincide
  if (KD.nombre && t.startsWith(KD.nombre + "\n")) { const k = t.indexOf("\n\n"); if (k > 0 && k < 400) t = t.slice(k + 2); }
  const cab = KD.nombre || KD.linea ? `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr>${esrRuns(KD.nombre || "", { b: true, sz: 19 })}</w:p>${KD.linea ? `<w:p><w:pPr><w:pStyle w:val="Header"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="BDB7AA"/></w:pBdr></w:pPr>${esrRuns(KD.linea)}</w:p>` : ""}` : `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>`;
  const pie = [o.ref ? "Ref. " + o.ref : "", o.expediente || "", "Borrador sujeto a revisión del abogado"].filter(Boolean).join(" · ");
  const fld = (ins) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${ins} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="${ESR_W}" xmlns:r="${ESR_R}">${cab}</w:hdr>`;
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${ESR_W}" xmlns:r="${ESR_R}"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr>${esrRuns(pie + " · Página ")}${fld("PAGE")}${esrRuns(" de ")}${fld("NUMPAGES")}</w:p></w:ftr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${ESR_W}" xmlns:r="${ESR_R}"><w:body>${esrCuerpo(t) || esrP("")}<w:sectPr><w:headerReference w:type="default" r:id="rId4"/><w:footerReference w:type="default" r:id="rId5"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1701" w:header="709" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const ahora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esrX(o.titulo || "Borrador")}</dc:title><dc:subject>${esrX(o.expediente || "")}</dc:subject><dc:creator>${esrX(KD.nombre || "{{MARCA}}")}</dc:creator><dc:language>es-ES</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${ahora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${ahora}</dcterms:modified></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>{{MARCA}}</Application></Properties>`;
  const WP = "application/vnd.openxmlformats-officedocument.wordprocessingml";
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${WP}.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="${WP}.styles+xml"/><Override PartName="/word/settings.xml" ContentType="${WP}.settings+xml"/><Override PartName="/word/numbering.xml" ContentType="${WP}.numbering+xml"/><Override PartName="/word/header1.xml" ContentType="${WP}.header+xml"/><Override PartName="/word/footer1.xml" ContentType="${WP}.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${ESR_R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${ESR_R}/settings" Target="settings.xml"/><Relationship Id="rId3" Type="${ESR_R}/numbering" Target="numbering.xml"/><Relationship Id="rId4" Type="${ESR_R}/header" Target="header1.xml"/><Relationship Id="rId5" Type="${ESR_R}/footer" Target="footer1.xml"/></Relationships>`],
    ["word/document.xml", doc], ["word/styles.xml", ESR_STYLES], ["word/settings.xml", ESR_SETTINGS], ["word/numbering.xml", ESR_NUMBERING],
    ["word/header1.xml", header], ["word/footer1.xml", footer], ["docProps/core.xml", core], ["docProps/app.xml", app],
  ]);
}
// Opciones del Word para un expediente (cabecera con el despacho, pie con referencia y nombre)
const esrDocxOpts = (x, titulo) => ({ titulo, ref: (x && x.despacho && x.despacho.ref) || "", expediente: x && x.nombre ? `Herencia de ${x.nombre}` : "" });
// Huecos «[dato]» de los escritos antiguos → «⟦dato⟧» (los resalta el Word y la vista previa; el PDF los imprime entre corchetes)
// (dentro de una nota ⟦REVISIÓN…⟧ se dejan como están: no se anidan marcadores)
const esrHuecos = (t) => String(t || "").split(/(⟦REVISI[^⟧]*⟧)/).map((sg, k) => (k % 2 ? sg : sg.replace(/\[([^\[\]\n]{1,200})\]/g, "⟦$1⟧").replace(/\[([^\[\]\n⟦⟧]*⟦[^⟧\n]*⟧[^\[\]\n⟦⟧]*)\]/g, (m, a) => "⟦" + a.replace(/[⟦⟧]/g, "") + "⟧"))).join("");
