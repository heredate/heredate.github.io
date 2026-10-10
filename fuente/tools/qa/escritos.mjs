// Prueba de navegador de los escritos que genera la app (ronda 4, escritos.js): todos los documentos para los expedientes de la
// demostración y para cuatro casos añadidos (legado, exceso de adjudicación con compensación, intestada con cónyuge y datos completos).
// Comprueba: sin «undefined», «NaN», «null» ni «[object»; huecos marcados ⟦…⟧ solo donde falta el dato (y nunca anidados ni con los
// antiguos corchetes); cifras idénticas a las del motor (Sucesiones, plusvalía, caudal partible, haberes, lotes, porcentajes del Catastro);
// Word (.docx) válido (partes OOXML, XML bien formado, relaciones, estilos, tabla); PDF sin errores y con los huecos en línea; vista previa
// con tablas. Con --soffice convierte además una muestra con LibreOffice y la abre con python-docx (si están instalados).
// Uso: python3 src/build.py; python3 -m http.server 8806; node tools/qa/escritos.mjs [url=http://127.0.0.1:8806/app/] [--soffice]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const args = process.argv.slice(2);
const URL_APP = args.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8806/app/";
const SOFFICE = args.includes("--soffice");
let ok = 0, ko = 0;
const fallos = [];
const check = (n, c, extra = "") => { if (c) ok++; else { ko++; fallos.push(n); } if (!c || process.env.VERBOSO) console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + String(extra).slice(0, 400) : ""}`); };
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "hp-escritos-"));

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const ev = (f, a) => p.evaluate(f, a);
await p.goto(URL_APP); await p.waitForTimeout(1200);
await ev(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); ui.sheet = null; render(); });
await p.waitForTimeout(400);

// ── Casos añadidos ──
await ev(() => {
  const D = despachoCfg(); D.direccion = D.direccion || "Calle Larios 1, 2.º"; D.cp = D.cp || "29005"; D.email = D.email || "despacho@ejemplo.es"; D.tel = D.tel || "952 000 000";
  // 1) Testada con legado (Cataluña)
  const a = prepararEjemplo("cat"); a.id = "qa-legado"; a.nombre = "Montserrat Puig (QA legado)";
  // 2) Exceso de adjudicación: la vivienda entera a una hija, con compensación en dinero (Andalucía)
  const e = prepararEjemplo("mar"); e.id = "qa-exceso"; e.nombre = "Francisco Jiménez Ortega (QA exceso)"; e.bienes.find((q) => q.id === "b2").adjudicadoA = "p2";
  // 3) Intestada con cónyuge y deuda ganancial (Madrid)
  const m = prepararEjemplo("mad"); m.id = "qa-intestada"; m.nombre = "Antonio Ruiz Gómez (QA intestada)"; m.deudas = [{ concepto: "Préstamo personal", importe: 8000, ganancial: true }];
  // 4) Datos completos: NIF, domicilios, estado civil, referencia catastral, cargas, notario y protocolo del título (nada debe quedar marcado de esos)
  const c = prepararEjemplo("est"); c.id = "qa-completo"; c.nombre = "Encarnación Ruiz Pérez (QA completo)"; c.generoCausante = "f";
  c.nifCausante = "00000014Z"; c.domicilioCausante = "Calle Pedregalejo 00, 29017 Málaga";
  c.personas[0] = { ...c.personas[0], nif: "00000015S", domicilio: "Calle Victoria 00, 29012 Málaga", estadoCivil: "casado_gananciales", genero: "f" };
  c.personas[1] = { ...c.personas[1], nif: "00000016Q", domicilio: "Avenida de Andalucía 00, 29006 Málaga", estadoCivil: "soltero", genero: "m" };
  c.bienes.forEach((q, i) => { if (q.tipo === "vivienda" || q.tipo === "inmueble") { q.refCatastral = `00000${i}0DEMO0001QA`.slice(0, 20); q.cargas = "Libre de cargas según nota simple";
    // G01: datos registrales completos y título de adquisición
    Object.assign(q, { registro: "Málaga n.º 2", fincaRegistral: String(4100 + i), cru: "2901200000" + String(4100 + i), tomo: "1845", libro: String(210 + i), folio: "112", inscripcion: "3.ª", descripcionRegistral: `Vivienda número ${i + 1} del edificio ficticio en calle Pedregalejo 00 de Málaga. Superficie construida de noventa metros cuadrados. Linda: frente, rellano; derecha, vivienda B; izquierda, calle; fondo, patio. Cuota: 4,50 %`, tituloAdq: "compraventa", tituloNotario: "D. Notario Ficticio Dos", tituloFecha: "1994-03-10", tituloProtocolo: String(800 + i) }); } });
  Object.assign(c, { lugarFallecimiento: "Málaga", rcDefuncion: "Málaga", seccionDefuncion: "3.ª", tomoDefuncion: "245", folioDefuncion: "123", fechaNacimiento: "1950-02-11", lugarNacimiento: "Ronda (Málaga)", padre: "José Ruiz Ficticio", madre: "Carmen Pérez Ficticia" });
  c.firma = { tNotario: "D. Notario Ficticio Uno", tFecha: "2015-03-02", tProtocolo: "412", notaria: "Notaría ficticia de Málaga" };
  DB.expedientes.push(a, e, m, c); guardar();
});

const NUEVOS = ["escritura", "cuaderno", "renuncia", "solicitud790", "cartaFamilia", "catastro", "plusvalia"];
const R0 = await ev((NUEVOS) => {
  const out = [];
  const cifra = (t, v) => t.includes(eur(v));
  for (const x of DB.expedientes) {
    const R = calcular(x); if (!R) continue;
    const ks = [...new Set([...docsDisponibles(x).map((d) => d[0]), ...NUEVOS])];
    const docs = {};
    for (const k of ks) { try { docs[k] = docTexto(x, R, k); } catch (e) { docs[k] = "EXCEPCIÓN " + e.message; } }
    // Cifras del motor que deben aparecer tal cual
    let PT = null; try { PT = particion(x, R); } catch (e) {}
    const vivos = (x.personas || []).filter((p) => !p.renuncia);
    const motor = {
      total: eur(R.isd.total), neto: eur(R.isd.masa.netoReparto), plus: eur(R.totalPlus),
      aIngresar: R.isd.herederos.map((h) => eur(h.aIngresar)), haberes: PT ? PT.H.map((h) => eur(h.haber + h.legados)) : [], lotes: PT ? PT.H.map((h) => eur(h.adjud + h.legados)) : [],
      plusBienes: R.plus.map((q) => (q.r.noSujeto ? null : eur(q.r.total))).filter(Boolean), bruto: eur(R.isd.masa.bruto),
    };
    // Catastro: por inmueble, pleno dominio + nuda propiedad = 100 %
    const cat = [];
    if (docs.catastro) for (const blq of docs.catastro.split(/\n\d+\. /).slice(1)) { const filas = blq.split("\n").filter((l) => /^\| .* \|$/.test(l) && !/Titular/.test(l)); if (!filas.length) continue; let s = 0; for (const f of filas) { const c = f.slice(1, -1).split("|").map((q) => q.trim()); if (/pleno dominio|nuda propiedad/.test(c[2])) s += Number(c[3].replace(" %", "").replace(/\./g, "").replace(",", ".")); } cat.push(Math.round(s * 100) / 100); }
    out.push({ id: x.id, ref: x.despacho?.ref || x.id, nombre: x.nombre, docs, motor, cat, vivos: vivos.map((p) => ({ nombre: p.nombre, nif: p.nif || "", estadoCivil: p.estadoCivil || "" })), nifC: x.nifCausante || "", domC: x.domicilioCausante || "", rc: (x.bienes || []).map((q) => q.refCatastral).filter(Boolean), tNot: x.firma?.tNotario || "", tProt: x.firma?.tProtocolo || "", hayInm: (x.bienes || []).some((q) => q.tipo === "vivienda" || q.tipo === "inmueble"), test: x.testamento, menores: vivos.some((p) => p.edad !== "" && p.edad != null && num(p.edad) < 18), ren: (x.personas || []).filter((p) => p.renuncia).map((p) => p.nombre), pdfs: null });
  }
  return out;
}, NUEVOS);

check(`Expedientes con cálculo: ${R0.length} (14 de la demostración + 4 añadidos)`, R0.length >= 18, R0.length);
let nDocs = 0;
const sinRev = (t) => t.replace(/⟦REVISI[^⟧]*⟧/g, "");
for (const E of R0) {
  for (const [k, t] of Object.entries(E.docs)) {
    nDocs++;
    const n = `${E.ref} · ${k}`;
    if (!t) { check(`${n}: no vacío`, ["catastro", "plusvalia"].includes(k) && !E.hayInm, "vacío"); continue; }
    check(`${n}: sin undefined/NaN/null/[object/excepción`, !/undefined|NaN|\bnull\b|\[object|EXCEPCIÓN/.test(t), (t.match(/.{0,60}(undefined|NaN|\bnull\b|\[object|EXCEPCIÓN).{0,60}/) || [])[0]);
    check(`${n}: sin huecos con corchetes antiguos`, !/\[[^\]\n]{1,200}\]/.test(sinRev(t)), (sinRev(t).match(/.{0,40}\[[^\]\n]{1,200}\].{0,20}/) || [])[0]);
    const abre = (t.match(/⟦/g) || []).length, cierra = (t.match(/⟧/g) || []).length;
    check(`${n}: marcadores ⟦…⟧ equilibrados y sin anidar`, abre === cierra && !/⟦[^⟧]*⟦/.test(sinRev(t)), `${abre}/${cierra}`);
    const prosa = t.split("\n").filter((l) => !/^\|/.test(l)).map((l) => l.replace(/^ +/, "")).join("\n");
    check(`${n}: sin espacios dobles ni puntuación duplicada`, !/ {2,}\S|,,|(?<!\.)\.\.(?!\.)| ,/.test(prosa), (prosa.match(/.{0,30}( {2,}\S|,,|(?<!\.)\.\.(?!\.)| ,).{0,30}/) || [])[0]);
  }
  const D = E.docs, M = E.motor;
  // Cifras del motor
  for (const k of ["escritura", "cuaderno"]) {
    const t = D[k] || ""; if (!t) continue;
    if (k === "cuaderno" || E.vivos.length) {
      check(`${E.ref} · ${k}: Sucesiones total y por heredero = motor`, t.includes(M.total) && M.aIngresar.every((v) => t.includes(v)), M.total);
      check(`${E.ref} · ${k}: caudal partible = motor (${M.neto})`, t.includes(M.neto));
      check(`${E.ref} · ${k}: haber de cada heredero = partición`, M.haberes.every((v) => t.includes(v)), M.haberes.join(", "));
      if (M.plusBienes.length) check(`${E.ref} · ${k}: plusvalía = motor`, t.includes(M.plus));
    }
  }
  if (D.cuaderno) {
    check(`${E.ref} · cuaderno: total de cada lote = adjudicado en la partición`, M.lotes.every((v) => D.cuaderno.includes(`| Total del lote |  | ${v} |`)), M.lotes.join(", "));
    check(`${E.ref} · cuaderno: inventario, avalúo, liquidación, lotes y adjudicaciones`, ["PRIMERA. Inventario.", "SEGUNDA. Avalúo.", "Liquidación del caudal hereditario.", "Formación de lotes.", "Adjudicaciones."].every((s) => D.cuaderno.includes(s)));
  }
  if (D.plusvalia && M.plusBienes.length) check(`${E.ref} · plusvalía: cuota de cada inmueble = motor`, M.plusBienes.every((v) => D.plusvalia.includes(v)), M.plusBienes.join(", "));
  if (D.catastro && E.cat.length) check(`${E.ref} · Catastro: pleno dominio + nuda propiedad = 100 % en cada inmueble`, E.cat.every((s) => Math.abs(s - 100) < 0.05), E.cat.join(", "));
  // Huecos solo donde falta el dato
  const esc = D.escritura || "";
  if (esc) {
    check(`${E.ref} · escritura: NIF del causante ${E.nifC ? "usado" : "marcado"}`, E.nifC ? esc.includes(E.nifC) && !esc.includes("⟦NIF del causante⟧") : esc.includes("⟦NIF del causante⟧"));
    check(`${E.ref} · escritura: domicilio del causante ${E.domC ? "usado" : "marcado"}`, E.domC ? esc.includes(E.domC) : esc.includes("⟦último domicilio del causante⟧"));
    for (const v of E.vivos) {
      const l = esc.split("\n").find((q) => q.includes(v.nombre) && q.includes("DNI/NIF")) || "";
      check(`${E.ref} · escritura: NIF de ${v.nombre} ${v.nif ? "usado" : "marcado"}`, v.nif ? l.includes(v.nif) : l.includes("⟦número⟧"), l);
      check(`${E.ref} · escritura: estado civil de ${v.nombre} ${v.estadoCivil ? "usado" : "marcado"}`, v.estadoCivil ? !l.includes("⟦estado civil⟧") : l.includes("⟦estado civil⟧"), l);
    }
    for (const rc of E.rc) check(`${E.ref} · escritura: referencia catastral ${rc}`, esc.includes(rc));
    if (E.hayInm && !E.rc.length) check(`${E.ref} · escritura: referencia catastral marcada como pendiente`, esc.includes("⟦referencia catastral⟧"));
    if (E.tNot) check(`${E.ref} · escritura: notario y protocolo del título`, esc.includes(E.tNot) && esc.includes(E.tProt));
    check(`${E.ref} · escritura: estructura notarial`, ["COMPARE", "INTERVIENE", "EXPONE", "ESTIPULACIONES", "OTORGAMIENTO Y AUTORIZACIÓN", "art. 1068 CC"].every((s) => esc.includes(s)));
    check(`${E.ref} · escritura: título sucesorio con su base legal`, E.test === "no" ? /artículos 55 y 56 de la Ley del Notariado/.test(esc) : E.test === "nose" ? /REVISIÓN/.test(esc) : /testamento otorgado/.test(esc));
    if (E.menores) check(`${E.ref} · escritura: aviso de menores (arts. 163, 166 y 1060 CC)`, /art\. 163 CC/.test(esc) && /art\. 1060 CC/.test(esc));
    if (E.ren.length) check(`${E.ref} · escritura: renuncias (art. 1008 CC)`, E.ren.every((n) => esc.includes(n)) && /art\. 1008 CC/.test(esc));
  }
  // Expediente con todos los datos de identificación: ningún escrito los deja como hueco
  // G01: con los datos registrales y del causante completos, las fincas y el causante se describen sin huecos
  if (E.id === "qa-completo") {
    for (const k of ["escritura", "cuaderno"]) { const fin = (D[k] || "").split("\n").filter((l) => /^ {3}(Descripción|Inscripción|Código Registral Único \(CRU\/IDUFIR\)|Título|Referencia catastral|Cargas):/.test(l)); check(`${E.ref} · ${k}: descripciones de las fincas sin huecos (G01)`, fin.length >= 6 && fin.every((l) => !/[⟦⟧]/.test(l)) && fin.some((l) => /tomo 1845, libro 21\d, folio 112, finca número 41\d\d, inscripción 3\.ª/.test(l)) && fin.some((l) => /CRU\/IDUFIR\): 2901200000/.test(l)) && fin.some((l) => /Compraventa, en escritura autorizada por D\. Notario Ficticio Dos el 10 de marzo de 1994, con el número 80\d de su protocolo/.test(l)), fin.filter((l) => /[⟦⟧]/.test(l)).join(" / ") || fin.slice(0, 4).join(" / ")); }
    check(`${E.ref} · escritura: causante con nacimiento, padres, lugar e inscripción de la defunción (G01)`, /nacida en Ronda \(Málaga\) el 11 de febrero de 1950, hija de José Ruiz Ficticio y de Carmen Pérez Ficticia/.test(D.escritura || "") && /falleció en Málaga el/.test(D.escritura || "") && /Registro Civil de Málaga \(sección 3\.ª, tomo 245, folio 123\)/.test(D.escritura || ""), (D.escritura || "").split("\n").find((l) => /Fallecimiento\./.test(l)));
    const t790 = ((D.solicitud790 || "").split("3. DATOS DEL CAUSANTE")[1] || "").split("4. DATOS")[0].split("\n").filter((l) => /^\| /.test(l));
    check(`${E.ref} · 790: datos del causante completos, sin huecos (G01)`, t790.length >= 9 && t790.every((l) => !/[⟦⟧]/.test(l)) && t790.some((l) => /José Ruiz Ficticio/.test(l)) && !/no constan en el expediente/.test(D.solicitud790 || ""), t790.filter((l) => /[⟦⟧]/.test(l)).join(" / "));
  }
  if (E.id === "qa-completo") for (const [k, t] of Object.entries(D)) { const h = ["⟦NIF⟧", "⟦NIF del causante⟧", "⟦RC⟧", "⟦referencia catastral⟧", "⟦notario⟧", "⟦protocolo⟧", "⟦último domicilio del causante⟧"].filter((q) => t.includes(q)); check(`${E.ref} (datos completos) · ${k}: no marca como pendiente un dato que consta`, !h.length, h.join(", ")); }
  if (D.notaria) { const nums = D.notaria.split("\n").filter((l) => /^\d{1,2}\. [A-ZÁÉÍÓÚ]{3}/.test(l)).map((l) => parseInt(l, 10)); check(`${E.ref} · nota para la notaría: apartados numerados sin saltos`, nums.every((v, i) => v === i + 1), nums.join(",")); }
  if (D.renuncia) {
    const r = D.renuncia;
    check(`${E.ref} · renuncia: pura, simple y gratuita ante notario (arts. 988, 990, 1008), acreedores (1001) y fiscalidad (art. 28 LISD)`, /pura, simple y gratuitamente/.test(r) && /art\. 1001 CC/.test(r) && /1008 CC/.test(r) && /art\. 28\.1 Ley 29\/1987/.test(r));
    if (E.ren.length) check(`${E.ref} · renuncia: comparece quien renuncia`, E.ren.every((n) => r.includes(n)));
    else check(`${E.ref} · renuncia: sin renunciante, hueco marcado`, r.includes("⟦nombre y apellidos de quien renuncia⟧"));
  }
  if (D.solicitud790) check(`${E.ref} · 790: modelo 790-006, fecha de defunción y desde cuándo`, /código 006/.test(D.solicitud790) && /quince días hábiles/.test(D.solicitud790) && !/⟦fecha⟧/.test(D.solicitud790));
  if (D.catastro) check(`${E.ref} · Catastro: modelo 900D y dispensa por comunicación notarial (art. 14.a TRLCI)`, /900D/.test(D.catastro) && /14\.a/.test(D.catastro) && !/901N(?! a 904N)/.test(D.catastro));
}
check(`Documentos generados: ${nDocs}`, nDocs > 250, nDocs);

// ── Word ──
// Lector mínimo de zip sin compresión (el que escribe zip() de logic.js)
function leerZip(buf) {
  const files = {}; let i = buf.length - 22; while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  const n = buf.readUInt16LE(i + 10); let o = buf.readUInt32LE(i + 16);
  for (let k = 0; k < n; k++) { const met = buf.readUInt16LE(o + 10), size = buf.readUInt32LE(o + 20), ln = buf.readUInt16LE(o + 28), le = buf.readUInt16LE(o + 30), lc = buf.readUInt16LE(o + 32), off = buf.readUInt32LE(o + 42); const name = buf.slice(o + 46, o + 46 + ln).toString("utf8"); const lh = 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28); files[name] = { met, data: buf.slice(off + lh, off + lh + size) }; o += 46 + ln + le + lc; }
  return files;
}
const muestra = R0.filter((E) => ["qa-completo", "qa-exceso", "qa-legado", "qa-intestada"].includes(E.id) || /-(031|030|035|027)$/.test(E.ref));
const W = await ev(async (ids) => {
  const out = [];
  for (const x of DB.expedientes.filter((q) => ids.includes(q.id))) {
    const R = calcular(x);
    for (const [k] of docsDisponibles(x)) {
      const blob = docx(docTexto(x, R, k), esrDocxOpts(x, DOC_TIT[k]));
      const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      out.push({ n: `${x.despacho?.ref || ""}-${x.id}_${k}`, b64: btoa(s), tipo: blob.type });
    }
  }
  return out;
}, muestra.map((E) => E.id));
check(`Word: ${W.length} documentos generados`, W.length > 60, W.length);
const PARTES = ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels", "word/styles.xml", "word/settings.xml", "word/numbering.xml", "word/header1.xml", "word/footer1.xml", "docProps/core.xml", "docProps/app.xml"];
const xmls = [];
for (const w of W) {
  const buf = Buffer.from(w.b64, "base64"), f = path.join(tmp, w.n + ".docx"); fs.writeFileSync(f, buf);
  let Z = null; try { Z = leerZip(buf); } catch (e) { Z = null; }
  check(`Word ${w.n}: zip legible con todas las partes OOXML`, Z && PARTES.every((q) => Z[q]) && Object.keys(Z)[0] === "[Content_Types].xml" && w.tipo === "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Z && Object.keys(Z).join(","));
  if (!Z) continue;
  const doc = Z["word/document.xml"].data.toString("utf8");
  check(`Word ${w.n}: cabecera y pie enlazados, A4, sin «undefined»`, /r:id="rId4"/.test(doc) && /r:id="rId5"/.test(doc) && /w:w="11906" w:h="16838"/.test(doc) && !/undefined|NaN|\[object/.test(doc));
  check(`Word ${w.n}: ${/_(banco|cartaFamilia)$/.test(w.n) ? "carta" : "con estilos de título"} y sin ⟦ ⟧ sueltos`, (/_(banco|cartaFamilia)$/.test(w.n) || /w:pStyle w:val="(Title|Heading1|Heading2)"/.test(doc)) && !/[⟦⟧]/.test(doc));
  for (const [nm, v] of Object.entries(Z)) if (/\.(xml|rels)$/.test(nm)) xmls.push([w.n + ":" + nm, v.data.toString("utf8")]);
}
const malos = await ev((L) => L.filter(([, s]) => new DOMParser().parseFromString(s, "application/xml").getElementsByTagName("parsererror").length).map(([n]) => n), xmls);
check(`Word: las ${xmls.length} partes XML están bien formadas`, malos.length === 0, malos.slice(0, 5).join(", "));
{
  const w = W.find((q) => /qa-completo|_escritura$/.test(q.n) && /escritura/.test(q.n)); const Z = leerZip(Buffer.from(w.b64, "base64")); const doc = Z["word/document.xml"].data.toString("utf8");
  check("Word escritura: tablas (inventario, haberes, impuestos), listas numeradas, notas de revisión y huecos en amarillo", (doc.match(/<w:tbl>/g) || []).length >= 3 && /<w:numPr>/.test(doc) && /w:val="Nota"/.test(doc) && /w:highlight w:val="yellow"/.test(doc) && /w:pStyle w:val="Firma"/.test(doc));
  const ft = Z["word/footer1.xml"].data.toString("utf8"), hd = Z["word/header1.xml"].data.toString("utf8");
  check("Word: pie con referencia y número de página; cabecera con el despacho", /Ref\. EXP-/.test(ft) && /PAGE/.test(ft) && /NUMPAGES/.test(ft) && /Márquez|despacho|Abogados/i.test(hd));
}
// python-docx y LibreOffice (opcionales)
const pyOk = (() => { try { execFileSync("python3", ["-I", "-c", "import docx"], { stdio: "ignore" }); return true; } catch (e) { return false; } })();
if (pyOk) {
  try { const r = execFileSync("python3", ["-I", "-c", "import sys,glob,docx\nn=0\nfor f in sorted(glob.glob(sys.argv[1]+'/*.docx')):\n  d=docx.Document(f); n+=1\nprint(n)", tmp]).toString().trim(); check(`python-docx abre los ${r} Word`, Number(r) === W.length, r); } catch (e) { check("python-docx abre los Word", false, e.message.slice(0, 300)); }
} else console.log("· python-docx no está instalado: se omite esa comprobación");
if (SOFFICE) {
  try {
    const sel = W.filter((w) => /_(escritura|cuaderno|renuncia|catastro)$/.test(w.n)).slice(0, 6).map((w) => path.join(tmp, w.n + ".docx"));
    execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", path.join(tmp, "pdf"), ...sel], { stdio: "ignore", timeout: 240000 });
    const hechos = fs.readdirSync(path.join(tmp, "pdf")).filter((f) => f.endsWith(".pdf"));
    check(`LibreOffice convierte los Word a PDF (${hechos.length} de ${sel.length})`, hechos.length === sel.length);
  } catch (e) { check("LibreOffice convierte los Word a PDF", false, e.message.slice(0, 200)); }
}

// ── PDF: los huecos quedan en línea y solo las notas de revisión van en recuadro ──
const P = await ev(() => {
  const x = DB.expedientes.find((q) => q.id === "qa-intestada"), R = calcular(x), t = docTexto(x, R, "escritura");
  const B = pdfAnaliza(t), notas = B.filter((q) => q.t === "nota").length, revs = (t.match(/⟦REVISI/g) || []).length;
  let bytes = 0; try { bytes = pdfDocumento({ titulo: DOC_TIT.escritura, despacho: pdfDespacho(x), ref: x.despacho?.ref || "", texto: t, marcaAgua: "Borrador" }).length; } catch (e) { bytes = -1; }
  const tablas = B.filter((q) => q.t === "tabla").length;
  return { notas, revs, bytes, tablas, enLinea: B.some((q) => q.t === "p" && /⟦número⟧|⟦domicilio⟧/.test(q.txt || "")) };
});
check("PDF: tantas notas en recuadro como avisos de revisión (los huecos no se convierten en notas)", P.notas === P.revs, JSON.stringify(P));
check("PDF: los huecos siguen dentro del párrafo y las tablas se reconocen", P.enLinea && P.tablas >= 3, JSON.stringify(P));
check("PDF: la escritura se genera", P.bytes > 5000, P.bytes);
// Paquete para la notaría (firma.js): con gastos no gananciales no debe decir «No constan deudas ni gastos»
const PQ = await ev(() => { const x = DB.expedientes.find((q) => q.id === "qa-legado"), R = calcular(x); const bl = paqueteBloques(x, R, validarFirma(x, R)); let n = 0; try { n = pdfDocumento({ titulo: "Paquete para la notaría", despacho: pdfDespacho(x), ref: "", bloques: bl }).length; } catch (e) { n = -1; } return { falso: bl.some((q) => /No constan deudas ni gastos/.test(q.texto || "")), n }; });
check("Paquete para la notaría: no afirma «No constan deudas ni gastos» si hay gastos, y se genera", !PQ.falso && PQ.n > 3000, JSON.stringify(PQ));

// ── Vista previa en la app ──
await ev(() => { go({ vista: "exp", id: "qa-exceso", sec: "documentos" }); ui.dsub = "escritos"; render(); });
await p.waitForTimeout(300);
check("Documentos → Escritos: aparecen la escritura, la carta a la familia, el 790, Catastro y plusvalía", await ev(() => ["escritura", "cartaFamilia", "solicitud790", "catastro", "plusvalia"].every((k) => !!document.querySelector(`.doccard[data-doc="${k}"]`))));
await p.click('.doccard[data-doc="escritura"]'); await p.waitForTimeout(400);
const V = await ev(() => { const v = document.querySelector(".paperview"); return { tablas: v ? v.querySelectorAll("table.pv-t").length : 0, marcas: v ? v.querySelectorAll("mark").length : 0, corchetes: v ? /[⟦⟧]/.test(v.textContent) : true, exceso: v ? /Excesos de adjudicación y compensaciones/.test(v.textContent) && /art\. 24 de la Ley del Notariado/.test(v.textContent) : false }; });
check("Vista previa: tablas, huecos resaltados y sin ⟦ ⟧ a la vista", V.tablas >= 3 && V.marcas > 5 && !V.corchetes, JSON.stringify(V));
check("Escritura con exceso: compensación con medio de pago (art. 24 LN y 177 RN)", V.exceso, JSON.stringify(V));
await p.screenshot({ path: path.join(tmp, "vista-escritura-1440.png") });
// Accesibilidad de la hoja del escrito (tablas de la vista previa): axe-core, WCAG 2.2 A y AA, si está instalado (cd tools/qa && npm install)
try {
  const { createRequire } = await import("node:module"); const require = createRequire(import.meta.url);
  await p.addScriptTag({ content: fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8") });
  for (const tema of ["claro", "grafito"]) {
    await ev((t) => { DB.tema = t; if (typeof aplicarTema === "function") aplicarTema(); else { document.documentElement.dataset.tema = t; } render(); }, tema); await p.waitForTimeout(300);
    const v = await ev(async () => (await axe.run(document.querySelector(".sheet") || document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"] }, resultTypes: ["violations"] })).violations.map((q) => `${q.id} (${q.nodes.length})`));
    check(`Accesibilidad de la hoja del escrito (${tema}): 0 infracciones`, v.length === 0, v.join(", "));
  }
  await ev(() => { DB.tema = "claro"; if (typeof aplicarTema === "function") aplicarTema(); render(); });
} catch (e) { console.log("· axe-core no está instalado: se omite la comprobación de accesibilidad de la hoja (" + e.message.slice(0, 80) + ")"); }
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
const desb = await ev(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check("Vista previa a 390 px: sin desbordamiento horizontal de la página", !desb);
await p.screenshot({ path: path.join(tmp, "vista-escritura-390.png") });
check("Sin errores de JavaScript", errores.length === 0, errores.join(" | "));
console.log(`\nescritos: ${ok} correctas, ${ko} fallidas · archivos en ${tmp}`);
if (ko) console.log("Fallidas:\n- " + [...new Set(fallos)].slice(0, 40).join("\n- "));
await b.close();
process.exit(ko ? 1 : 0);
