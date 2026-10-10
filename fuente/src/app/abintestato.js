// ───────────────────── {{MARCA}} · declaración de herederos abintestato (G05 · abintestato.js · prefijo ab / AB_) ─────────────────────
// Sin testamento no hay título sucesorio hasta que el notario declara quiénes son los herederos en acta de notoriedad (arts. 55 y 56 de la Ley
// del Notariado, en la redacción de la Ley 15/2015, de la Jurisdicción Voluntaria). Este módulo prepara el escrito de requerimiento con los datos
// del expediente y, si no hay parientes con derecho a heredar, la comunicación a la Administración que hereda (arts. 956 a 958 CC).
//   abNotarias(x)                  → lugares en que es competente el notario (art. 55.1 LN), con su razón
//   abLlamados(x, R)               → parientes con su parentesco, su grado y lo que les corresponde por ley (del motor)
//   esrDeclaracionHerederos(x, R)  → escrito de requerimiento (o comunicación a la Administración heredera)
//   abPanelHTML(x)                 → tarjeta de Documentos › Escritos: requirente, notaría, testigos y acta autorizada
// Datos: x.declaracion = { requirente (id de persona o «otro»), requirenteNombre, requirenteNif, requirenteDomicilio, criterio, notaria,
//   testigos: [{ nombre, nif, domicilio, relacion }, { … }] }. El acta autorizada se guarda en x.firma.tNotario/tFecha/tProtocolo: la misma
//   que usa la escritura (esrTitulo) y «Listo para firmar». Al descargar el requerimiento, el trámite «declaracion» pasa a «en curso»; al anotar
//   el acta autorizada (notario y fecha), a «hecho».

const AB_CRITERIOS = [
  ["domicilio", "Último domicilio o residencia habitual del causante"],
  ["bienes", "Lugar donde está la mayor parte de su patrimonio"],
  ["fallecimiento", "Lugar del fallecimiento"],
  ["colindante", "Distrito notarial colindante a cualquiera de los anteriores"],
  ["requirente", "Domicilio del requirente (solo en defecto de los anteriores)"],
];
const AB_ORD = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO", "SÉPTIMO", "OCTAVO", "NOVENO", "DÉCIMO"];
const AB_GRADO = { desc: (p) => (RELACIONES[p.relacion] || {}).grado, asc: (p) => (RELACIONES[p.relacion] || {}).grado, col2: () => 2, col3: () => 3, col4: () => 4 };
const abD = (x) => (x.declaracion = x.declaracion || {});
const abTestigos = (x) => { const D = abD(x); D.testigos = Array.isArray(D.testigos) ? D.testigos : []; while (D.testigos.length < 2) D.testigos.push({}); return D.testigos; };
const abTxt = (v) => (v != null && String(v).trim() ? String(v).trim() : "");
const abVivos = (x) => (x.personas || []).filter((p) => !p.renuncia);

// Lugar más probable de cada criterio, con lo que consta en el expediente (art. 55.1 LN: «a su elección», siempre que estén en España)
function abNotarias(x) {
  const muniB = (b) => (b.muniNombre || (typeof ORDENANZAS === "object" && b.municipio && b.municipio !== "OTRO" && ORDENANZAS[b.municipio] ? ORDENANZAS[b.municipio].nombre : "")) || "";
  const inm = (x.bienes || []).filter((b) => b.tipo === "vivienda" || b.tipo === "inmueble"), porMuni = {};
  for (const b of x.bienes || []) { const m = muniB(b); if (m) porMuni[m] = (porMuni[m] || 0) + Math.max(num(b.valor), num(b.valorReferencia)); }
  const mayor = Object.entries(porMuni).sort((a, b) => b[1] - a[1])[0];
  const dom = abTxt(x.municipioCausante) || abTxt(x.domicilioCausante).replace(/^.*\b\d{5}\s+/, "") || "";
  const req = abRequirente(x);
  return {
    domicilio: dom ? `${dom} (último domicilio)` : "",
    bienes: mayor ? `${mayor[0]} (${inm.length ? "donde están los inmuebles de más valor" : "donde están los bienes de más valor"})` : "",
    fallecimiento: abTxt(x.lugarFallecimiento),
    colindante: "",
    requirente: abTxt(req.domicilio).replace(/^.*\b\d{5}\s+/, ""),
  };
}
// Quien requiere: un pariente del expediente, el cliente o la persona que se indique
function abRequirente(x) {
  const D = abD(x), id = D.requirente, P = x.personas || [];
  if (id && id !== "otro") { const p = P.find((q) => q.id === id); if (p) return { nombre: p.nombre, nif: p.nif, domicilio: p.domicilio, p }; }
  if (id === "otro") return { nombre: D.requirenteNombre, nif: D.requirenteNif, domicilio: D.requirenteDomicilio, p: null };
  const cli = P.find((q) => x.despacho && x.despacho.cliente && q.nombre === x.despacho.cliente) || abVivos(x)[0];
  return cli ? { nombre: cli.nombre, nif: cli.nif, domicilio: cli.domicilio, p: cli } : { nombre: "", nif: "", domicilio: "", p: null };
}
// Parientes con su grado y lo que les atribuye la ley según el cálculo (mismo reparto que el motor)
function abLlamados(x, R) {
  const der = (R && R.isd && R.isd.derechos) || {};
  return (x.personas || []).map((p) => {
    const rel = RELACIONES[p.relacion] || {}, g = AB_GRADO[rel.linea] ? AB_GRADO[rel.linea](p) : null;
    const d = (der[p.id] || []).filter((q) => q.fraccion > 0).map(esrDer).join(" y ");
    return { p, grado: g, linea: rel.linea, derecho: d };
  });
}

// ───────────────────── Escrito de requerimiento ─────────────────────
function esrDeclaracionHerederos(x, R) {
  const c = esrCtx(x, R), D = abD(x), T = abTestigos(x), L = abLlamados(x, R), req = abRequirente(x), N = abNotarias(x);
  const llamados = L.filter((q) => q.derecho && !q.p.renuncia);
  const usuf = llamados.filter((q) => q.linea === "conyuge" && /^usufructo/.test(q.derecho)), herederos = llamados.filter((q) => !usuf.includes(q));
  if (!llamados.length && !L.some((q) => q.grado || q.linea === "conyuge")) return abComunicacionEstado(x, R, c);
  const crit = D.criterio || (N.domicilio ? "domicilio" : N.bienes ? "bienes" : N.fallecimiento ? "fallecimiento" : "domicilio");
  const lugarCrit = crit === "colindante" ? "" : N[crit] ? N[crit].replace(/\s*\(.*\)$/, "") : "";
  const notaria = abTxt(D.notaria);
  const colat = L.some((q) => /^col/.test(q.linea) && q.derecho);
  const conyuge = L.find((q) => q.linea === "conyuge");
  const hijos = L.filter((q) => q.linea === "desc");
  const out = [];
  out.push(`${c.membrete}REQUERIMIENTO PARA EL ACTA DE NOTORIEDAD DE DECLARACIÓN DE HEREDEROS ABINTESTATO`, `Herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""} · arts. 55 y 56 de la Ley del Notariado`);
  out.push("", `AL NOTARIO ${notaria ? `DE ${esrUp(notaria)}` : "⟦NOTARÍA COMPETENTE⟧"}`);
  out.push("", `${req.nombre ? `${req.p ? gnTrat(req.p) : ""}${req.nombre}` : "⟦nombre y apellidos del requirente⟧"}, mayor de edad, con DNI/NIF ${esrPh(req.nif, "número")} y domicilio en ${esrPh(req.domicilio, "domicilio")}, ${req.p && req.p.relacion && RELACIONES[req.p.relacion] && RELACIONES[req.p.relacion].linea !== "extrano" ? `en su condición de ${gnRel(req.p)} del causante y persona que se considera con derecho a sucederle abintestato` : "como persona con interés legítimo en la declaración de herederos ⟦acreditar el interés⟧"}, ante usted comparece y, como mejor proceda,`);
  out.push("", "EXPONE");
  let n = 0; const E = () => AB_ORD[n++];
  out.push("", `${E()}. Fallecimiento. Que ${c.trC}${c.causante}, con DNI/NIF ${c.nifC}${c.cd.nac ? `, ${gnO(c.cG, "nacido", "nacida", "que nació")} ${c.cd.nac}` : ""}${c.cd.padres.length === 2 ? `, ${gnO(c.cG, "hijo", "hija")} de ${c.cd.padres[0]} y de ${c.cd.padres[1]}` : ""}, falleció en ${esrPh(c.cd.lugar, "lugar del fallecimiento")} el ${c.fm}${c.civilC ? `, en estado de ${c.civilC}` : ", ⟦estado civil⟧"}, siendo su último domicilio y residencia habitual ${c.domC}${c.vecTxt ? ` y su vecindad civil ${c.vecTxt}` : ""}. Lo acredita con el certificado de defunción del Registro Civil de ${esrPh(c.cd.rc, "…")}${c.cd.insc ? ` (${c.cd.insc})` : ""}.`);
  out.push("", `${E()}. Falta de testamento. Que el causante falleció sin haber otorgado testamento ni otra disposición de última voluntad, según el certificado del Registro General de Actos de Última Voluntad que se acompaña, por lo que procede la sucesión intestada (arts. 912.1 y 913 CC).`);
  const fila = (q) => `- ${gnTrat(q.p)}${q.p.nombre || "⟦nombre⟧"}, ${gnRel(q.p) || "pariente"} del causante${q.grado ? ` (${q.linea === "desc" ? "línea recta descendente" : q.linea === "asc" ? "línea recta ascendente" : "línea colateral"}, ${q.grado}.º grado)` : q.linea === "conyuge" ? " (cónyuge viudo)" : ""}${q.p.nif ? `, con DNI/NIF ${q.p.nif}` : ""}${q.p.domicilio ? `, con domicilio en ${q.p.domicilio}` : ""}${q.p.renuncia ? ", que ha manifestado su intención de renunciar a la herencia ⟦la renuncia se formaliza aparte en escritura pública, art. 1008 CC⟧" : ""}${q.derecho ? `. Según la ley, le corresponde el ${q.derecho}` : ""}.`;
  const parientes = L.filter((q) => q.grado || q.linea === "conyuge");
  out.push("", `${E()}. Parientes del causante. Que los parientes del causante con derecho a sucederle, según los arts. 930 a 955 CC${c.foral ? ` y las normas de su derecho civil propio (vecindad civil ${c.vecTxt})` : ""}, son:`, "", parientes.length ? parientes.map(fila).join("\n") : "- ⟦relación de parientes con su parentesco y grado⟧");
  const mani = [
    hijos.length ? `que no tuvo más hijos que los indicados, matrimoniales, no matrimoniales ni adoptivos (art. 108 CC)${hijos.some((q) => q.p.relacion !== "hijo") ? ", y que los nietos o bisnietos que se citan heredan en representación de su progenitor premuerto o incapaz de suceder (arts. 924 a 929 CC)" : ""}` : "",
    conyuge ? `que el cónyuge viudo no estaba separado legalmente ni de hecho del causante (arts. 834 y 945 CC)` : x.civil === "viudo" || x.civil === "soltero" ? `que el causante no dejó cónyuge viudo` : "",
    colat ? "que el causante no dejó descendientes, ascendientes ni cónyuge con derecho a heredar (arts. 943 y 944 CC), y que los colaterales que se citan son todos los del grado más próximo, de doble vínculo o de vínculo sencillo según se indica (arts. 946 a 955 CC)" : "",
    "que no conoce la existencia de otras personas con igual o mejor derecho a la herencia",
  ].filter(Boolean);
  out.push("", `${E()}. Manifestaciones. Que, bajo su responsabilidad, manifiesta ${mani.join("; ")}.`);
  if (R && R.isd && R.isd.notasReparto && R.isd.notasReparto.length) out.push(esrREV(`reparto aplicado en el cálculo: ${R.isd.notasReparto.join(" ")} Comprobar que coincide con lo que se pide declarar.`));
  const razon = { domicilio: "el del último domicilio o residencia habitual del causante", bienes: "el del lugar donde está la mayor parte de su patrimonio", fallecimiento: "el del lugar del fallecimiento", colindante: "colindante al del último domicilio, al de la mayor parte del patrimonio o al del fallecimiento ⟦indicar cuál⟧", requirente: "el del domicilio del requirente, por no estar en España ninguno de los lugares anteriores" }[crit] || "";
  out.push("", `${E()}. Notaría competente. Que el notario requerido es competente conforme al art. 55.1 de la Ley del Notariado: su distrito es ${razon}${lugarCrit ? ` (${lugarCrit})` : ""}. La ley permite elegir entre el lugar del último domicilio o residencia habitual del causante, el de la mayor parte de su patrimonio y el del fallecimiento, siempre que estén en España, o un distrito notarial colindante a ellos; solo en su defecto, el del domicilio del requirente.`);
  out.push("", `${E()}. Testigos. Que propone como testigos, que declararán que de ciencia propia o por notoriedad les constan el fallecimiento, la falta de testamento y los parientes con derecho a heredar, a:`, "", T.slice(0, Math.max(2, T.length)).map((t, i) => `${i + 1}. ${esrPh(t.nombre, "nombre y apellidos del testigo")}, mayor de edad, con DNI/NIF ${esrPh(t.nif, "número")} y domicilio en ${esrPh(t.domicilio, "domicilio")}${abTxt(t.relacion) ? `, ${abTxt(t.relacion)}` : ", ⟦relación con el causante: vecino, amigo…⟧"}.`).join("\n"));
  out.push(esrREV("los testigos deben conocer al causante y a su familia y no ser herederos ni tener interés en la herencia; muchas notarías tampoco admiten a los parientes próximos de los requirentes ni a sus cónyuges. Confirmar con la notaría antes de citarlos (comprobación del abogado)."));
  out.push("", "Por lo expuesto,", "", "SOLICITA", "", `Que tenga por presentado este escrito con los documentos que lo acompañan, por requerido al notario para que, conforme a los arts. 55 y 56 de la Ley del Notariado, inicie el acta de notoriedad, practique las pruebas que estime necesarias, reciba la declaración de los testigos y, en su caso, publique los anuncios que procedan, y, si resultan acreditados los hechos, declare herederos abintestato de ${c.trC}${c.causante} a ${herederos.length ? herederos.map((q) => `${q.p.nombre || "⟦nombre⟧"} (${q.derecho})`).join("; ") : "⟦herederos y cuotas según la ley⟧"}${usuf.length ? `, y reconozca a ${usuf.map((q) => `${q.p.nombre || "⟦nombre⟧"} su cuota legal usufructuaria como cónyuge viudo (${q.derecho}; arts. 834 y siguientes CC)`).join(" y ")}` : ""}.`);
  out.push("", `En ${c.lugar}, a ⟦fecha⟧.`, "", `Fdo.: ${req.nombre || "⟦requirente⟧"}`);
  const docs = ["Certificado literal de defunción.", "Certificado del Registro General de Actos de Última Voluntad (y, si se dispone de él, el de Contratos de Seguros de Cobertura de Fallecimiento).", "Libro de familia o certificados del Registro Civil que acrediten el parentesco: nacimiento de los descendientes y, en su caso, matrimonio.", ...(hijos.some((q) => q.p.relacion !== "hijo") || colat ? ["Certificados de defunción de los parientes premuertos por cuya línea se hereda."] : []), "Certificado de empadronamiento histórico del causante, que acredita su último domicilio y residencia habitual.", "Documento de identidad del requirente y de los testigos."];
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", docs.map((t) => "- " + t).join("\n"));
  if (colat) out.push("", esrREV("si los llamados son colaterales, es frecuente que el notario publique anuncios y cite a otros posibles interesados antes de cerrar el acta: preverlo en el calendario de la herencia."));
  if (c.foral) out.push(esrREV(`la vecindad civil del causante es ${c.vecTxt}: el orden de llamamientos y los derechos del viudo se rigen por su derecho civil propio; el acta se tramita igualmente ante notario (arts. 55 y 56 LN).`));
  if (x.ccaa === "EST") out.push(esrREV("causante no residente en España: la ley aplicable y la autoridad competente pueden ser las de su residencia habitual (Reglamento (UE) 650/2012); valorar si basta el título extranjero o el certificado sucesorio europeo."));
  out.push(esrREV("borrador para presentar en la notaría. La notaría redacta el acta: cotejar parentescos, grados y cuotas con los certificados antes de la comparecencia."));
  return out.join("\n");
}
// Sin parientes con derecho: hereda el Estado o, en las comunidades con derecho propio que lo prevén, la comunidad autónoma (arts. 956 a 958 CC)
function abComunicacionEstado(x, R, c) {
  const vec = c.vec && !c.vec.supuesta ? c.vec.id : "";
  const CA = { CAT: ["la Generalitat de Catalunya", "art. 442-12 del Código civil de Cataluña"], ARA: ["la Comunidad Autónoma de Aragón", "art. 535 del Código del Derecho Foral de Aragón"], NAV: ["la Comunidad Foral de Navarra", "ley 304 del Fuero Nuevo"], VASCO: ["la Comunidad Autónoma del País Vasco", "art. 117 de la Ley 5/2015, de Derecho Civil Vasco"] }[vec];
  const req = abRequirente(x), out = [];
  out.push(`${c.membrete}COMUNICACIÓN DE HERENCIA SIN PARIENTES CON DERECHO A HEREDAR`, `Herencia de ${c.trC}${c.causante}${c.ref ? " · referencia " + c.ref : ""}`);
  out.push("", CA ? `A ${esrUp(CA[0])} · ⟦ÓRGANO COMPETENTE EN MATERIA DE PATRIMONIO⟧` : "A LA DELEGACIÓN DE ECONOMÍA Y HACIENDA DE ⟦PROVINCIA⟧ · SECCIÓN DEL PATRIMONIO DEL ESTADO");
  out.push("", `${req.nombre ? req.nombre : "⟦nombre y apellidos de quien comunica⟧"}, con DNI/NIF ${esrPh(req.nif, "número")} y domicilio en ${esrPh(req.domicilio, "domicilio")}, ⟦en calidad de: administrador de los bienes, acreedor, vecino, profesional que conoce el caso⟧,`, "", "EXPONE");
  out.push("", `Primero. Que ${c.trC}${c.causante}, con DNI/NIF ${c.nifC}, falleció en ${esrPh(c.cd.lugar, "lugar del fallecimiento")} el ${c.fm}, con último domicilio en ${c.domC}, sin haber otorgado testamento según el certificado del Registro General de Actos de Última Voluntad.`);
  out.push("", "Segundo. Que no le constan cónyuge ni parientes dentro del cuarto grado con derecho a heredar abintestato.");
  out.push("", `Tercero. Que, a falta de personas con derecho a heredar, la ley llama a ${CA ? `${CA[0]} (${CA[1]})` : "la Administración General del Estado (arts. 956 a 958 CC)"}, que adquiere los bienes previa declaración administrativa de heredero (art. 958 CC; arts. 20.6 y 20 bis de la Ley 33/2003, del Patrimonio de las Administraciones Públicas).`);
  out.push("", `Cuarto. Que le constan los siguientes bienes: ${(x.bienes || []).length ? (x.bienes || []).map((b) => `${esrNomB(b)}${esrInm(b) && b.refCatastral ? ` (referencia catastral ${b.refCatastral})` : ""}`).join("; ") : "⟦relación de bienes conocidos⟧"}.`);
  out.push("", "SOLICITA", "", "Que se tenga por comunicado el fallecimiento sin herederos conocidos a los efectos de que se inicie el procedimiento de declaración de heredero abintestato de la Administración y se adopten las medidas de conservación de los bienes que procedan.");
  out.push("", `En ${c.lugar}, a ⟦fecha⟧.`, "", `Fdo.: ${req.nombre || "⟦firma⟧"}`);
  out.push("", "DOCUMENTOS QUE SE ACOMPAÑAN", "", ["Certificado de defunción.", "Certificado del Registro General de Actos de Última Voluntad.", "Documentación de los bienes que se conozcan."].map((t) => "- " + t).join("\n"));
  out.push(esrREV(`antes de presentarla, confirmar que no hay parientes hasta el cuarto grado (art. 954 CC) ni cónyuge con derecho. ${CA ? "Cotejar la cita de la norma autonómica y el órgano competente." : "Si el causante tenía vecindad civil de una comunidad con derecho propio que llame a la comunidad autónoma, dirigirla a esa Administración."} Quien se crea con derecho puede, en cambio, pedir el acta notarial de declaración de herederos (arts. 55 y 56 LN).`));
  return out.join("\n");
}

// ───────────────────── Tarjeta de Documentos › Escritos ─────────────────────
function abPanelHTML(x) {
  if (x.testamento !== "no") return "";
  const D = abD(x), T = abTestigos(x), N = abNotarias(x), F = x.firma || {}, req = abRequirente(x);
  const crit = D.criterio || (N.domicilio ? "domicilio" : N.bienes ? "bienes" : N.fallecimiento ? "fallecimiento" : "domicilio");
  const inp = (attrs, val, ph, extra = "") => `<input ${attrs} value="${esc(val || "")}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const fl = (lab, html, cls = "") => `<label class="vf-fl ${cls}"><span>${lab}</span>${html}</label>`;
  const okT = T.filter((t) => abTxt(t.nombre) && abTxt(t.nif)).length, acta = abTxt(F.tNotario) && F.tFecha;
  const est = acta ? ["Acta autorizada", "ok"] : x.tramites && x.tramites.declaracion && x.tramites.declaracion.estado === "curso" ? ["Requerimiento preparado", "info"] : ["Por pedir", "warn"];
  const opts = AB_CRITERIOS.map(([k, t]) => `<option value="${k}" ${crit === k ? "selected" : ""}>${esc(t)}${N[k] ? " · " + esc(N[k]) : ""}</option>`).join("");
  return `<div class="card vf-datos ab-card">${cardH("Declaración de herederos abintestato", "Acta de notoriedad ante notario (arts. 55 y 56 LN)", `<span class="chip ${est[1]}">${est[0]}</span>`)}
    <div class="vf-fs"><div class="vf-fsh">Requerimiento</div>
      <div class="vf-f2">${fl("Requirente", `<select id="ab-req" data-ab="requirente"><option value="">${esc(req.nombre ? "Por defecto: " + req.nombre : "Elegir")}</option>${(x.personas || []).map((p) => `<option value="${p.id}" ${D.requirente === p.id ? "selected" : ""}>${esc(p.nombre || "—")}</option>`).join("")}<option value="otro" ${D.requirente === "otro" ? "selected" : ""}>Otra persona con interés legítimo</option></select>`)}${fl("Notaría elegida", inp('id="ab-not" data-ab="notaria"', D.notaria, "Notaría y localidad"))}</div>
      ${D.requirente === "otro" ? `<div class="vf-f3">${fl("Nombre", inp('id="ab-rn" data-ab="requirenteNombre"', D.requirenteNombre, "Nombre y apellidos"))}${fl("NIF", inp('id="ab-rf" data-ab="requirenteNif"', D.requirenteNif, "00000000X"))}${fl("Domicilio", inp('id="ab-rd" data-ab="requirenteDomicilio"', D.requirenteDomicilio, "Calle, CP y localidad"))}</div>` : ""}
      ${fl("Notario competente por", `<select id="ab-crit" data-ab="criterio">${opts}</select>`)}
      <p class="caption ab-nota">El requirente elige entre el último domicilio o residencia habitual, el lugar de la mayor parte de los bienes y el del fallecimiento, si están en España, o un distrito colindante; en su defecto, su propio domicilio (art. 55.1 LN).</p></div>
    <div class="vf-fs"><div class="vf-fsh">Testigos · ${okT} de 2</div>
      ${T.slice(0, 2).map((t, i) => `<div class="vf-f2">${fl(`Testigo ${i + 1}`, inp(`id="ab-t${i}-nombre" data-abt="${i}" data-abk="nombre"`, t.nombre, "Nombre y apellidos"))}${fl("NIF", inp(`id="ab-t${i}-nif" data-abt="${i}" data-abk="nif"`, t.nif, "00000000X"))}</div><div class="vf-f2">${fl("Domicilio", inp(`id="ab-t${i}-domicilio" data-abt="${i}" data-abk="domicilio"`, t.domicilio, "Calle, CP y localidad"))}${fl("Relación con el causante", inp(`id="ab-t${i}-relacion" data-abt="${i}" data-abk="relacion"`, t.relacion, "Vecino, amigo…"))}</div>`).join('<div class="ab-sep"></div>')}
      <p class="caption ab-nota">Deben conocer al causante y a la familia y no ser herederos ni interesados en la herencia (compruébalo con la notaría).</p></div>
    <div class="vf-fs"><div class="vf-fsh">Acta autorizada</div>
      <div class="vf-f3">${fl("Notario", inp('id="ab-a-not" data-vff="tNotario"', F.tNotario, "Nombre"))}${fl("Fecha", `<input id="ab-a-fecha" type="date" data-vff="tFecha" value="${esc(F.tFecha || "")}">`)}${fl("Protocolo", inp('id="ab-a-prot" data-vff="tProtocolo" inputmode="numeric"', F.tProtocolo, "Número"))}</div>
      <p class="caption ab-nota">Con el acta autorizada, la escritura de herencia la cita como título sucesorio.</p></div>
    <div class="ab-acts"><button class="btn sm" data-doc="declaracionHerederos">${I.doc}Requerimiento del acta</button></div>
  </div>`;
}
// Eventos propios: lo que se teclea se guarda al momento (sin repintar) y al salir del campo
function abCampo(t, repintar) {
  const d = t && t.dataset; if (!d || !(d.ab || d.abt != null)) return false;
  const x = typeof exp === "function" ? exp() : null; if (!x) return true;
  if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { if (repintar) { toast(licMotivoEdicion()); render(); } return true; }
  const v = String(t.value || "").trim();
  if (d.ab) abD(x)[d.ab] = /nif$/i.test(d.ab) ? v.toUpperCase().replace(/[\s.\-]/g, "") : v;
  else { const T = abTestigos(x), i = Number(d.abt); T[i] = T[i] || {}; T[i][d.abk] = d.abk === "nif" ? v.toUpperCase().replace(/[\s.\-]/g, "") : v; }
  if (repintar) { guardar(); const id = document.activeElement && document.activeElement.id; render(); if (id) { const n = document.getElementById(id); if (n) n.focus({ preventScroll: true }); } }
  return true;
}
// Trámite «declaracion»: en curso al descargar el requerimiento; hecho al anotar el acta autorizada
function abTramite(x, estado, texto) { if (typeof estadoT !== "function" || x.testamento !== "no") return; const s = estadoT(x, "declaracion"); if (estado === "curso" && (s.estado === "hecho" || s.estado === "curso")) return; if (s.estado === estado) return; s.estado = estado; if (typeof anotar === "function") anotar(x, texto, "tramite"); }
if (typeof document !== "undefined") {
  document.addEventListener("input", (e) => { if (abCampo(e.target, false)) e.stopPropagation(); }, true);
  document.addEventListener("change", (e) => {
    if (abCampo(e.target, true)) { e.stopPropagation(); return; }
    const d = e.target && e.target.dataset, x = typeof exp === "function" ? exp() : null;
    if (d && d.vff && /^t(Notario|Fecha)$/.test(d.vff) && x && x.testamento === "no") setTimeout(() => { const F = x.firma || {}; if (abTxt(F.tNotario) && F.tFecha) { abTramite(x, "hecho", `Declaración de herederos: acta autorizada por ${F.tNotario}`); guardar(); } }, 0);
  }, true);
  document.addEventListener("click", (e) => { const b = e.target && e.target.closest && e.target.closest('[data-dl="declaracionHerederos"],[data-pdfdoc="declaracionHerederos"]'); const x = b && typeof exp === "function" ? exp() : null; if (x) abTramite(x, "curso", "Declaración de herederos: requerimiento del acta preparado"); }, true);
}
