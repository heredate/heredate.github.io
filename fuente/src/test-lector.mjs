// Pruebas del lector de documentos (src/app/lector.js) sobre textos sintéticos con la estructura de los documentos oficiales.
// Se ejecuta con: node src/test-lector.mjs. Carga lector.js en Node con los apoyos mínimos de la app.
import fs from "node:fs";
import vm from "node:vm";
import { RELACIONES } from "./motor.mjs";

const nif = (n) => `${String(n).padStart(8, "0")}${"TRWAGMYFPDXBNJZSQVHLCKE"[n % 23]}`;
const NIF_C = nif(25123456), NIF_E = nif(24987654), NIF_H = nif(74123123), NIF_S = nif(53000111);

const ctx = {
  console, Date, Math, TextDecoder, TextEncoder, Uint8Array, Uint32Array, Float64Array, DataView, Blob, Response, DecompressionStream, CompressionStream, Number, String, Array, Object, RegExp, Map, Set, JSON, Intl, Promise, Error, parseInt, parseFloat, isFinite, Symbol,
  RELACIONES,
  fechaLarga: (f) => f, fechaCorta: (f) => f, hoy: () => "2026-10-06", eur0: (v) => `${Math.round(v)} €`, uid: () => Math.random().toString(36).slice(2, 10),
  plural: (n, s, p) => `${n} ${n === 1 ? s : p || s + "s"}`, esc: (s) => String(s), anotar: () => {}, guardar: () => {}, render: () => {},
  hayWebPublica: () => false, webURL: (r) => r, muniDesdeTexto: () => null, muniElegir: () => {}, sheetHTML: (t, b) => `<h2>${t}</h2>${b}`, cardH: (a, b) => `${a} ${b}`, nombreExp: (x) => x.nombre || "",
  DB: { expedientes: [] }, ui: {}, document: { getElementById: () => null },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("./app/lector.js", import.meta.url), "utf8"), ctx);
for (const f of fs.readdirSync(new URL("./app/", import.meta.url)).filter((f) => /^lector-.*\.js$/.test(f)).sort()) vm.runInContext(fs.readFileSync(new URL("./app/" + f, import.meta.url), "utf8"), ctx);
Object.assign(ctx, { Uint8ClampedArray, Int32Array, Float32Array, Uint16Array, atob, btoa, File: globalThis.File || Blob });
vm.runInContext(fs.readFileSync(new URL("./app/escaner.js", import.meta.url), "utf8"), ctx);
const L = ctx; L.LEC = vm.runInContext("LEC", ctx); L.lecMismoNombre = vm.runInContext("lecMismoNombre", ctx); L.lecNifOk = vm.runInContext("lecNifOk", ctx); L.lecFraccion = vm.runInContext("lecFraccion", ctx);

let ok = 0, ko = 0;
const t = (nombre, cond, extra) => { if (cond) ok++; else { ko++; console.log("  ✗", nombre, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); } };
const campo = (d, k) => d.campos.find((c) => c.k === k);

// ── 1. Certificado de defunción (extracto electrónico del Registro Civil) ──
const DEF = `MINISTERIO DE JUSTICIA
REGISTRO CIVIL DE MÁLAGA
CERTIFICADO DE INSCRIPCIÓN DE DEFUNCIÓN
Datos del inscrito
Nombre: ANTONIO Primer apellido: JIMÉNEZ Segundo apellido: SOLER
DNI: ${NIF_C} Sexo: Varón Nacionalidad: Española
Fecha de nacimiento: 12/03/1948 Lugar de nacimiento: Antequera Provincia: Málaga
Estado civil: Casado
Fecha de defunción: 20/04/2026 Hora: 06:35
Lugar de defunción: Málaga Provincia: Málaga
Fecha de expedición: 24/04/2026
CSV: ABCD1234EFGH5678`;
{
  const d = L.lecAnalizar(DEF, "certificado defuncion.pdf");
  t("def tipo", d.tipo === "defuncion", d.tipo);
  t("def nombre", campo(d, "nombre")?.valor === "Antonio Jiménez Soler" && campo(d, "nombre").conf === 2, campo(d, "nombre"));
  t("def fecha", campo(d, "fecha")?.valor === "2026-04-20" && campo(d, "fecha").conf === 2, campo(d, "fecha"));
  t("def civil", campo(d, "civil")?.valor === "gananciales", campo(d, "civil"));
  t("def nif", campo(d, "nifCausante")?.valor === NIF_C, campo(d, "nifCausante"));
  t("def lugar", campo(d, "lugarFallecimiento")?.valor === "Málaga", campo(d, "lugarFallecimiento"));
}
// 1.7 · apellidos con diéresis (Argüelles, Agüero): el lector los acepta en mayúsculas y en minúsculas, también en el texto corrido
{
  const d = L.lecAnalizar(DEF.replace("JIMÉNEZ", "ARGÜELLES").replace("SOLER", "PEÑA"), "certificado defuncion.pdf");
  const d2 = L.lecAnalizar("REGISTRO CIVIL DE TORREMOLINOS. CERTIFICACIÓN LITERAL DE DEFUNCIÓN. Don Pedro Gómez Vera, Encargado del Registro Civil, CERTIFICA: que DOÑA MARÍA DOLORES AGÜERO CANO, viuda, natural de Sevilla, falleció en Málaga el día tres de febrero de dos mil veintiséis.", "literal.pdf");
  t("def con diéresis", campo(d, "nombre")?.valor === "Antonio Argüelles Peña" && campo(d2, "nombre")?.valor === "María Dolores Agüero Cano", [campo(d, "nombre"), campo(d2, "nombre")]);
}
// Certificado literal clásico (texto corrido, fecha en letras)
const DEF2 = `REGISTRO CIVIL DE TORREMOLINOS. CERTIFICACIÓN LITERAL DE DEFUNCIÓN. Don Pedro Gómez Vera, Encargado del Registro Civil, CERTIFICA: que la inscripción de defunción de DOÑA MARÍA DOLORES RUIZ CANO, viuda, natural de Sevilla, falleció el día tres de febrero de dos mil veintiséis a las veintidós horas en Torremolinos.`;
{
  const d = L.lecAnalizar(DEF2, "literal.pdf");
  t("def2 tipo", d.tipo === "defuncion", d.tipo);
  t("def2 nombre", campo(d, "nombre")?.valor === "María Dolores Ruiz Cano", campo(d, "nombre"));
  t("def2 fecha letras", campo(d, "fecha")?.valor === "2026-02-03", campo(d, "fecha"));
  t("def2 viuda", campo(d, "civil")?.valor === "viudo", campo(d, "civil"));
}

// Certificado en papel antiguo (texto corrido, máquina de escribir): nombre antes de «falleció», lugar tras «falleció en», «de estado casado»
const DEF3 = `REGISTRO CIVIL DE ANTEQUERA. Sección 3.ª Tomo 45 Página 112. DON JOSÉ LUIS MARTÍN PRIETO, Juez Encargado del Registro Civil de Antequera, CERTIFICO: Que al tomo y página citados figura la siguiente inscripción: Don MANUEL JIMÉNEZ GARCÍA, hijo de Francisco y de Ana, natural de Antequera, de setenta y nueve años de edad, de estado casado con Doña DOLORES SOLER RUIZ, FALLECIÓ en Antequera el día cuatro de enero de dos mil cuatro, a las cinco horas, a consecuencia de parada cardiorrespiratoria. Y para que conste expido la presente en Antequera a 9 de enero de 2004.`;
{
  const d = L.lecAnalizar(DEF3, "certificado antiguo.pdf");
  t("def3 tipo", d.tipo === "defuncion", d.tipo);
  t("def3 nombre (no el del juez)", campo(d, "nombre")?.valor === "Manuel Jiménez García", campo(d, "nombre"));
  t("def3 fecha letras", campo(d, "fecha")?.valor === "2004-01-04", campo(d, "fecha"));
  t("def3 lugar", campo(d, "lugarFallecimiento")?.valor === "Antequera", campo(d, "lugarFallecimiento"));
  t("def3 casado", campo(d, "civil")?.valor === "gananciales", campo(d, "civil"));
  t("def3 cónyuge", d.personas[0]?.nombre === "Dolores Soler Ruiz" && d.personas[0].relacion === "conyuge", d.personas);
}
// Certificado plurilingüe (Convenio de Viena 1976, formulario C): fechas «20 04 2026», etiquetas francés/español
const DEF4 = `1 ÉTAT / ESTADO: ESPAÑA 2 Service de l'état civil de / Registro Civil de: MÁLAGA
3 Extrait de l'acte de décès nº / Extracto del acta de defunción nº: 004512
4 Date et lieu du décès / Fecha y lugar de la defunción: 20 04 2026 MÁLAGA
5 Nom / Apellidos: JIMÉNEZ SOLER 6 Prénoms / Nombre: ANTONIO 7 Sexe / Sexo: M
8 Date et lieu de naissance / Fecha y lugar de nacimiento: 12 03 1948 ANTEQUERA
9 Nom du dernier conjoint / Apellidos del último cónyuge: RUIZ LÓPEZ 10 Prénoms du dernier conjoint / Nombre del último cónyuge: CARMEN
11 Nom du père / Apellidos del padre: JIMÉNEZ GARCÍA 12 Prénoms du père / Nombre del padre: MANUEL
Jo = jour / día, Mo = mois / mes, An = année / año. Convention de Vienne du 8 septembre 1976. Date de délivrance 24 04 2026`;
{
  const d = L.lecAnalizar(DEF4, "pluri.pdf");
  t("def4 tipo", d.tipo === "defuncion", d.tipo);
  t("def4 nombre apellidos+nombre", campo(d, "nombre")?.valor === "Antonio Jiménez Soler" && campo(d, "nombre").conf === 2, campo(d, "nombre"));
  t("def4 fecha con espacios", campo(d, "fecha")?.valor === "2026-04-20", campo(d, "fecha"));
  t("def4 lugar", campo(d, "lugarFallecimiento")?.valor === "Málaga", campo(d, "lugarFallecimiento"));
  t("def4 cónyuge", d.personas[0]?.nombre === "Carmen Ruiz López" && d.personas[0].relacion === "conyuge", d.personas);
  t("def4 aviso plurilingüe", d.avisos.some((a) => /plurilingüe/.test(a)), d.avisos);
}

// ── 2. Últimas voluntades ──
const ULT = `MINISTERIO DE JUSTICIA
REGISTRO GENERAL DE ACTOS DE ÚLTIMA VOLUNTAD
CERTIFICADO
Consultados los antecedentes obrantes en este Registro, resulta que D./Dª ANTONIO JIMÉNEZ SOLER, con DNI ${NIF_C}, fallecido/a el día 20/04/2026,
CONSTA como otorgante de los siguientes actos de última voluntad:
Tipo de acto: TESTAMENTO ABIERTO Fecha del acto: 15/06/2015 Notario: D. FERNANDO RUIZ CASTILLO Localidad: MÁLAGA Protocolo: 1234
Fecha de expedición: 28/04/2026`;
{
  const d = L.lecAnalizar(ULT, "ultimas.pdf");
  t("ult tipo", d.tipo === "ultimas", d.tipo);
  const td = campo(d, "testamentoDatos")?.valor;
  t("ult notario", td?.notario === "Fernando Ruiz Castillo", td);
  t("ult fecha", td?.fecha === "2015-06-15", td);
  t("ult protocolo", td?.protocolo === "1234", td);
  t("ult tipo abierto", td?.tipo === "abierto", td);
  t("ult testamento nose", campo(d, "testamento")?.valor === "nose", campo(d, "testamento"));
  t("ult nombre", campo(d, "nombre")?.valor === "Antonio Jiménez Soler", campo(d, "nombre"));
  t("ult fecha def", campo(d, "fecha")?.valor === "2026-04-20", campo(d, "fecha"));
}
const ULT_NO = `REGISTRO GENERAL DE ACTOS DE ÚLTIMA VOLUNTAD. CERTIFICADO. Consultados los antecedentes, resulta que D./Dª MARÍA DOLORES RUIZ CANO, fallecida el día 03/02/2026, NO CONSTA como otorgante de acto alguno de última voluntad.`;
{
  const d = L.lecAnalizar(ULT_NO, "ultimas.pdf");
  t("ult no consta → intestada", campo(d, "testamento")?.valor === "no", campo(d, "testamento"));
}

// ── 3. Seguros de fallecimiento ──
const SEG = `MINISTERIO DE JUSTICIA
REGISTRO DE CONTRATOS DE SEGUROS DE COBERTURA DE FALLECIMIENTO
CERTIFICADO
D./Dª ANTONIO JIMÉNEZ SOLER, con DNI ${NIF_C}, fallecido el 20/04/2026, CONSTA como asegurado en los siguientes contratos:
Entidad aseguradora: MAPFRE VIDA S.A. Tipo de seguro: VIDA Número de póliza: 80012345
Entidad aseguradora: SANTALUCÍA SEGUROS Tipo de seguro: DECESOS Número de póliza: 55-0098`;
{
  const d = L.lecAnalizar(SEG, "seguros.pdf");
  t("seg tipo", d.tipo === "seguros", d.tipo);
  const a = campo(d, "aseguradoras")?.valor;
  t("seg entidades", Array.isArray(a) && a.length === 2 && /MAPFRE VIDA/.test(a[0]) && /SANTALUC/.test(a[1]), a);
}
const SEG_NO = `REGISTRO DE CONTRATOS DE SEGUROS DE COBERTURA DE FALLECIMIENTO. CERTIFICADO. D./Dª MARÍA DOLORES RUIZ CANO ... NO FIGURA como asegurada en ningún contrato.`;
{ const d = L.lecAnalizar(SEG_NO, "seguros.pdf"); t("seg ninguno", campo(d, "aseguradoras")?.valor.length === 0 && campo(d, "aseguradoras").conf === 2, campo(d, "aseguradoras")); }

// ── 4. Certificación catastral descriptiva y gráfica ──
const CAT = `CERTIFICACIÓN CATASTRAL DESCRIPTIVA Y GRÁFICA
BIEN INMUEBLE DE NATURALEZA URBANA
REFERENCIA CATASTRAL DEL INMUEBLE 1234567VK4713S0001OQ
DATOS DESCRIPTIVOS DEL INMUEBLE
Localización CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA (MÁLAGA)
Clase Urbano Uso principal Residencial Superficie construida 120 m2 Año construcción 1985
DATOS ECONÓMICOS
Valor catastral 140.000,00 €
Valor catastral del suelo 60.000,00 €
Valor catastral de la construcción 80.000,00 €
Año del valor 2026
TITULARIDAD
JIMÉNEZ SOLER ANTONIO ${NIF_C} 50,00 % de propiedad
RUIZ LÓPEZ CARMEN ${NIF_E} 50,00 % de propiedad`;
{
  const d = L.lecAnalizar(CAT, "catastro.pdf");
  t("cat tipo", d.tipo === "catastro", d.tipo);
  const b = d.bienes[0];
  t("cat ref", b?.refCatastral === "1234567VK4713S0001OQ", b);
  t("cat total", b?.valorCatastralTotal === 140000, b?.valorCatastralTotal);
  t("cat suelo", b?.valorCatastralSuelo === 60000, b?.valorCatastralSuelo);
  t("cat vivienda", b?.tipo === "vivienda" && b.usoResidencial === true, b?.tipo);
  t("cat muni", b?.muniNombre === "Málaga" && b.muniProv === "Málaga", [b?.muniNombre, b?.muniProv]);
  t("cat desc", /Calle Larios 12/i.test(b?.descripcion || ""), b?.descripcion);
  t("cat superficie", b?.superficie === 120 && b.anioConstruccion === 1985, [b?.superficie, b?.anioConstruccion]);
  t("cat titulares apellidos-nombre", b?.titulares?.length === 2 && b.titulares[0].nombre === "Antonio Jiménez Soler" && b.titulares[0].pct === 50 && b.titulares[1].nombre === "Carmen Ruiz López" && b.titulares[1].nif === NIF_E, b?.titulares);
  // Solo con el Catastro y el testamento (cónyuge conocida): el 50 % con el cónyuge no se convierte en proindiviso
  const x = { id: "xc", nombre: "Antonio Jiménez Soler", civil: "gananciales", personas: [{ id: "p1", nombre: "Carmen Ruiz López", relacion: "conyuge" }], bienes: [], deudas: [], situ: {} };
  const R = [["catastro.pdf", CAT]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R).propuestas.filter((p) => p.grupo === "Inmuebles");
  t("cat 50 % con cónyuge → nota, no proindiviso", P.length === 1 && !/proindiviso/.test(P[0].mostrar) && /cónyuge/.test(P[0].mostrar), P.map((p) => p.mostrar));
  const x2 = { id: "xc2", nombre: "Antonio Jiménez Soler", personas: [], bienes: [], deudas: [], situ: {} };
  const P2 = L.lecPropuestas(x2, R).propuestas.filter((p) => p.grupo === "Inmuebles");
  t("cat 50 % con desconocido → proindiviso 50", /proindiviso 50 %/.test(P2[0]?.mostrar || ""), P2.map((p) => p.mostrar));
}

// ── 5. Recibo del IBI (ayuntamiento) ──
const IBI = `AYUNTAMIENTO DE TORREMOLINOS · PATRONATO DE RECAUDACIÓN PROVINCIAL
IMPUESTO SOBRE BIENES INMUEBLES DE NATURALEZA URBANA · RECIBO · EJERCICIO 2026
Referencia catastral: 9876543UF6597N0012GR
Situación: AV DE LOS MANANTIALES 5 2 B 29620 TORREMOLINOS (MÁLAGA)
Valor catastral suelo: 40.000,00 Valor catastral construcción: 55.000,00 Valor catastral: 95.000,00
Base liquidable: 95.000,00 Tipo de gravamen: 0,55 % Cuota íntegra: 522,50 €
Titular: RUIZ CANO MARÍA DOLORES`;
{
  const d = L.lecAnalizar(IBI, "ibi 2026.pdf");
  t("ibi tipo", d.tipo === "ibi", d.tipo);
  const b = d.bienes[0];
  t("ibi total (no el suelo)", b?.valorCatastralTotal === 95000, b?.valorCatastralTotal);
  t("ibi suelo", b?.valorCatastralSuelo === 40000, b?.valorCatastralSuelo);
  t("ibi ref", b?.refCatastral === "9876543UF6597N0012GR", b?.refCatastral);
  t("ibi muni", b?.muniNombre === "Torremolinos", b?.muniNombre);
}

// IBI de organismos de recaudación con etiquetas distintas
const IBI_SUMA = `SUMA Gestión Tributaria · Diputación de Alicante
IBI URBANA · EJERCICIO 2026 · RECIBO 2026-0451122
Objeto tributario: AV DEL MEDITERRANEO 15 Es:1 Pl:04 Pt:B 03590 ALTEA
Ref. catastral: 5555555YH5755N0012HA
Val. cat.: 72.400,00 Val. cat. suelo: 31.000,00 Base liquidable: 72.400,00 Tipo: 0,62 % Cuota: 448,88 €
Titular: JIMÉNEZ SOLER ANTONIO`;
{
  const d = L.lecAnalizar(IBI_SUMA, "suma.pdf");
  const b = d.bienes[0];
  t("ibi suma tipo y valores", d.tipo === "ibi" && b?.valorCatastralTotal === 72400 && b.valorCatastralSuelo === 31000 && b.refCatastral === "5555555YH5755N0012HA", [d.tipo, b]);
  t("ibi suma municipio y provincia por el organismo", b?.muniNombre === "Altea" && b.muniProv === "Alicante", [b?.muniNombre, b?.muniProv]);
  t("ibi suma dirección", /Avenida del Mediterraneo 15/i.test(b?.descripcion || ""), b?.descripcion);
}
const IBI_OAGER = `OAGER · Organismo Autónomo de Gestión Económica y Recaudación · Ayuntamiento de Salamanca
IMPUESTO SOBRE BIENES INMUEBLES · Liquidación 2026
Situación: CL TORO 45 2º A Municipio: SALAMANCA
Referencia catastral 6666666TL7366E0005KG
V.C. suelo 28.500,00 € V.C. construcción 41.200,00 € V.C. total 69.700,00 € Base imponible 69.700,00 € Cuota líquida 418,20 €`;
{ const d = L.lecAnalizar(IBI_OAGER, "oager.pdf"); const b = d.bienes[0]; t("ibi oager V.C.", d.tipo === "ibi" && b?.valorCatastralTotal === 69700 && b.valorCatastralSuelo === 28500 && b.muniNombre === "Salamanca" && b.muniProv === "Salamanca", [d.tipo, b]); }
const IBI_ATIB = `ATIB · Agència Tributària de les Illes Balears · Recaptació de tributs locals
IMPOST SOBRE BÉNS IMMOBLES / IMPUESTO SOBRE BIENES INMUEBLES · 2026
Situació / Situación: CR DE VALLDEMOSSA 7 07010 PALMA
Referència cadastral / Referencia catastral: 7777777DD6877F0001BS
Base imponible: 118.300,00 € Tipus / Tipo: 0,52 % Quota / Cuota: 615,16 €`;
{ const d = L.lecAnalizar(IBI_ATIB, "atib.pdf"); const b = d.bienes[0]; t("ibi atib base imponible como valor catastral", d.tipo === "ibi" && b?.valorCatastralTotal === 118300 && !b.valorCatastralSuelo && d.avisos.some((a) => /no el del suelo/.test(a)) && b.muniProv === "Illes Balears", [d.tipo, b, d.avisos]); }
const IBI_ORGT = `ORGT · Organisme de Gestió Tributària · Diputació de Barcelona
IMPOST SOBRE BÉNS IMMOBLES URBANS · REBUT 2026 · Ajuntament de Sant Cugat del Vallès
Situació: CL MAJOR 10 1 2 08172 SANT CUGAT DEL VALLES (BARCELONA)
Referència cadastral: 8888888DF2888G0001EQ
Valor cadastral: 210.000,00 € Valor cadastral sòl: 120.000,00 € Valor cadastral construcció: 90.000,00 € Quota íntegra: 1.207,50 €`;
{ const d = L.lecAnalizar(IBI_ORGT, "orgt.pdf"); const b = d.bienes[0]; t("ibi orgt catalán", d.tipo === "ibi" && b?.valorCatastralTotal === 210000 && b.valorCatastralSuelo === 120000 && b.muniNombre === "Sant Cugat del Valles", [d.tipo, b]); }
// Recibo con dos inmuebles (Patronato de Málaga: vivienda + garaje)
const IBI_DOS = `PATRONATO DE RECAUDACIÓN PROVINCIAL · DIPUTACIÓN DE MÁLAGA · AYUNTAMIENTO DE MÁLAGA
IMPUESTO SOBRE BIENES INMUEBLES · RELACIÓN DE RECIBOS DEL CONTRIBUYENTE JIMÉNEZ SOLER ANTONIO · EJERCICIO 2026
Situación: CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA (MÁLAGA) Ref. catastral: 1234567VK4713S0001OQ Uso: Residencial Valor catastral: 140.000,00 Valor catastral suelo: 60.000,00 Cuota: 770,00 €
Situación: CL LARIOS 12 Es:1 Pl:-1 Pt:12 29005 MÁLAGA (MÁLAGA) Ref. catastral: 1234567VK4713S0012JO Uso: Aparcamiento Valor catastral: 15.000,00 Valor catastral suelo: 7.000,00 Cuota: 82,50 €`;
{
  const d = L.lecAnalizar(IBI_DOS, "ibi patronato.pdf");
  t("ibi dos inmuebles", d.tipo === "ibi" && d.bienes.length === 2, [d.tipo, d.bienes.length]);
  t("ibi dos: vivienda", d.bienes[0]?.refCatastral === "1234567VK4713S0001OQ" && d.bienes[0].valorCatastralTotal === 140000 && d.bienes[0].valorCatastralSuelo === 60000 && d.bienes[0].tipo === "vivienda", d.bienes[0]);
  t("ibi dos: garaje", d.bienes[1]?.refCatastral === "1234567VK4713S0012JO" && d.bienes[1].valorCatastralTotal === 15000 && d.bienes[1].valorCatastralSuelo === 7000 && d.bienes[1].tipo === "inmueble" && d.bienes[1].muniNombre === "Málaga", d.bienes[1]);
  t("ibi dos aviso", d.avisos.some((a) => /2 inmuebles/.test(a)), d.avisos);
}
// Mismo recibo en forma de tabla (como lo devuelve pdf.js): cabecera con las columnas y filas sin etiquetas
const IBI_TABLA = `PATRONATO DE RECAUDACIÓN PROVINCIAL · DIPUTACIÓN DE MÁLAGA
IMPUESTO SOBRE BIENES INMUEBLES · RELACIÓN DE RECIBOS · EJERCICIO 2026
Situación Ref. catastral Uso Valor catastral Valor catastral suelo Cuota
CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA (MÁLAGA) 1234567VK4713S0001OQ Residencial 140.000,00 60.000,00 770,00 €
CL LARIOS 12 Es:1 Pl:-1 Pt:12 29005 MÁLAGA (MÁLAGA) 1234567VK4713S0012JO Aparcamiento 15.000,00 7.000,00 82,50 €`;
{
  const d = L.lecAnalizar(IBI_TABLA, "ibi tabla.pdf");
  // Como lo parte pdf.js cuando las celdas van en varias líneas: cabecera rota y referencia en su propia línea
  const ROTA = `PATRONATO DE RECAUDACIÓN PROVINCIAL · IMPUESTO SOBRE BIENES INMUEBLES · RELACIÓN DE RECIBOS 2026
Situación Ref. catastral Uso Valor Valor Cuota
catastral catastral
suelo
1234567VK4713S0001OQ
CL LARIOS Residencial 140.000,00 60.000,00 770,00
12 Es:1 Pl:03 €
CL LARIOS 1234567VK4713S0012JO Aparcamiento 15.000,00 7.000,00 82,50
12 Es:1 Pl:-1 €`;
  const r = L.lecAnalizar(ROTA, "ibi.pdf");
  t("ibi tabla rota: valores por posición", r.bienes.length === 2 && r.bienes[0].valorCatastralTotal === 140000 && r.bienes[0].valorCatastralSuelo === 60000 && r.bienes[1].valorCatastralTotal === 15000 && r.bienes[1].valorCatastralSuelo === 7000 && r.avisos.some((a) => /por su posición/.test(a)), [r.bienes, r.avisos]);
  t("ibi tabla: 2 inmuebles con valores por columnas", d.bienes.length === 2 && d.bienes[0].valorCatastralTotal === 140000 && d.bienes[0].valorCatastralSuelo === 60000 && d.bienes[1].valorCatastralTotal === 15000 && d.bienes[1].valorCatastralSuelo === 7000 && !d.avisos.some((a) => /No se ha leído/.test(a)), [d.bienes, d.avisos]);
}

// ── 6. Nota simple del Registro de la Propiedad ──
const NOTA = `REGISTRO DE LA PROPIEDAD DE MÁLAGA Nº 2
NOTA SIMPLE INFORMATIVA
FINCA DE MÁLAGA Nº 12345 CRU: 29012000123456
DESCRIPCIÓN
URBANA: VIVIENDA tipo A en planta tercera del edificio sito en calle Larios número doce de Málaga. Tiene una superficie construida de ciento veinte metros cuadrados. Linda al norte con rellano. Cuota: 2,50 %. Referencia catastral: 1234567VK4713S0001OQ.
TITULARIDAD
DON ANTONIO JIMÉNEZ SOLER, con N.I.F. ${NIF_C}, casado con DOÑA CARMEN RUIZ LÓPEZ, con N.I.F. ${NIF_E}, titulares del pleno dominio de la totalidad de esta finca con carácter ganancial, por título de compraventa en escritura autorizada el 10/05/1995 por el notario de Málaga don Luis Pérez Gil.
CARGAS
HIPOTECA a favor de UNICAJA BANCO, S.A., en garantía de un préstamo de un principal de 90.000,00 euros, intereses y costas, constituida en escritura de 10/05/2010.
No hay documentos pendientes de despacho.`;
{
  const d = L.lecAnalizar(NOTA, "nota simple.pdf");
  t("nota tipo", d.tipo === "notasimple", d.tipo);
  const b = d.bienes[0];
  t("nota ref", b?.refCatastral === "1234567VK4713S0001OQ", b?.refCatastral);
  t("nota finca", b?.fincaRegistral === "12345" && b.cru === "29012000123456", [b?.fincaRegistral, b?.cru]);
  t("nota vivienda", b?.tipo === "vivienda" && /Vivienda tipo A en planta tercera/.test(b.descripcion), b?.descripcion);
  t("nota ganancial", b?.titularidad === "ganancial", b?.titularidad);
  t("nota titulares", d.personas.length === 2 && d.personas[0].nombre === "Antonio Jiménez Soler" && d.personas[0].nif === NIF_C && d.personas[1].nombre === "Carmen Ruiz López", d.personas);
  t("nota sin aviso de embargo cuando dice «no constan»", !d.avisos.some((a) => /embargo/.test(a)), d.avisos);
  t("nota hipoteca", d.deudas.length === 1 && d.deudas[0].importe === 90000 && /Unicaja Banco/.test(d.deudas[0].concepto) && d.deudas[0].ganancial === true, d.deudas);
}
const NOTA_LIBRE = `REGISTRO DE LA PROPIEDAD DE TORREMOLINOS. NOTA SIMPLE. FINCA Nº 777. URBANA: PLAZA DE GARAJE número doce en sótano del edificio en avenida de los Manantiales. Superficie útil 12 m2. TITULARIDAD: DOÑA MARÍA DOLORES RUIZ CANO, con N.I.F. ${NIF_S}, titular del pleno dominio con carácter privativo. CARGAS: Libre de cargas.`;
{
  const d = L.lecAnalizar(NOTA_LIBRE, "nota.pdf");
  t("nota libre privativo", d.bienes[0]?.titularidad === "privativo" && d.bienes[0].tipo === "inmueble", d.bienes[0]);
  t("nota libre cargas", campo(d, "cargas")?.valor === "libre" && d.deudas.length === 0, d.campos);
}

// Nota simple con varias fincas (formato Madrid), proindiviso por tercios y usufructo/nuda propiedad
const NIF_I = nif(74333444), NIF_D = nif(24111333);
const NOTA_MULTI = `REGISTRO DE LA PROPIEDAD DE MADRID Nº 7
NOTA SIMPLE INFORMATIVA · Solicitante: despacho · Finalidad: herencia
FINCA DE MADRID 1 Nº: 23456 IDUFIR: 28000000234567
DESCRIPCIÓN DE LA FINCA
URBANA.- NÚMERO TRES.- Piso segundo letra B de la casa número cuarenta de la calle de Alcalá, de Madrid. Superficie construida de ochenta y cinco metros cuadrados. Cuota: 4,20 %. Referencia catastral: 0123456VK4701S0003TA.
TITULARES
NOMBRE: ANTONIO JIMÉNEZ SOLER N.I.F.: ${NIF_C} TÍTULO: herencia. Participación: 33,333333 % del pleno dominio con carácter privativo.
NOMBRE: ISABEL JIMÉNEZ SOLER N.I.F.: ${NIF_I} TÍTULO: herencia. Participación: 33,333333 % del pleno dominio con carácter privativo.
NOMBRE: MIGUEL JIMÉNEZ SOLER N.I.F.: ${NIF_S} TÍTULO: herencia. Participación: 33,333333 % del pleno dominio con carácter privativo.
CARGAS: No hay cargas registradas.
\f
FINCA DE MADRID 1 Nº: 23457 IDUFIR: 28000000234568
DESCRIPCIÓN DE LA FINCA
URBANA.- NÚMERO SIETE.- Local comercial en planta baja de la casa número cuarenta de la calle de Alcalá, de Madrid. Superficie de sesenta metros cuadrados. Referencia catastral: 0123456VK4701S0007OG.
TITULARES
NOMBRE: DOLORES SOLER RUIZ N.I.F.: ${NIF_D} TÍTULO: herencia. Participación: 100 % del usufructo vitalicio.
NOMBRE: ANTONIO JIMÉNEZ SOLER N.I.F.: ${NIF_C} TÍTULO: herencia. Participación: 100 % de la nuda propiedad con carácter privativo.
CARGAS: Afecta al pago del Impuesto de Sucesiones durante cinco años. Libre de otras cargas.`;
{
  const d = L.lecAnalizar(NOTA_MULTI, "nota madrid.pdf");
  t("multi tipo", d.tipo === "notasimple", d.tipo);
  t("multi 2 fincas", d.bienes.length === 2 && d.bienes[0].fincaRegistral === "23456" && d.bienes[1].fincaRegistral === "23457", d.bienes.map((b) => [b.fincaRegistral, b.descripcion]));
  const p1 = d.bienes[0];
  t("multi finca 1: piso, proindiviso 33,33 %, ref", p1?.tipo === "vivienda" && p1.titularidad === "proindiviso" && Math.abs(p1.porcentaje - 33.33) < 0.01 && p1.refCatastral === "0123456VK4701S0003TA" && /Piso segundo letra B/.test(p1.descripcion), p1);
  t("multi finca 1: 3 titulares con cuota", p1?.titulares?.length === 3 && p1.titulares.every((q) => Math.abs(q.pct - 33.33) < 0.01 && q.derecho === "pleno"), p1?.titulares);
  const p2 = d.bienes[1];
  t("multi finca 2: usufructo + nuda", p2?.titulares?.find((q) => q.nombre === "Dolores Soler Ruiz")?.derecho === "usufructo" && p2.titulares.find((q) => q.nombre === "Antonio Jiménez Soler")?.derecho === "nuda" && p2.registro === "Madrid Nº 7", p2?.titulares);
  t("multi aviso desmembrada y varias fincas", d.avisos.some((a) => /desmembrada/.test(a)) && d.avisos.some((a) => /2 fincas/.test(a)), d.avisos);
  t("multi personas únicas", d.personas.length === 4, d.personas.map((p) => p.nombre));
  // Fusión: con el causante Antonio, la finca 2 va con nota de nuda propiedad; la 1 queda proindiviso 33,33 %
  const x = { id: "xm", nombre: "Antonio Jiménez Soler", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["nota madrid.pdf", NOTA_MULTI]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R).propuestas.filter((p) => p.grupo === "Inmuebles");
  t("multi propuesta piso 33,33", P.find((p) => /Piso segundo/.test(p.mostrar))?.mostrar.includes("proindiviso 33.33 %"), P.map((p) => p.mostrar));
  t("multi propuesta local con nuda propiedad", /nuda propiedad del causante/.test(P.find((p) => /Local comercial/.test(p.mostrar))?.mostrar || "") && P.find((p) => /Local comercial/.test(p.mostrar)).on === true, P.find((p) => /Local/.test(p.mostrar)));
  // Si el causante fuera la usufructuaria, el local no entra
  const x2 = { id: "xm2", nombre: "Dolores Soler Ruiz", personas: [], bienes: [], deudas: [], situ: {} };
  const P2 = L.lecPropuestas(x2, R).propuestas.filter((p) => p.grupo === "Inmuebles");
  t("multi usufructuaria causante → local sin marcar", P2.find((p) => /Local comercial/.test(p.mostrar))?.on === false && /usufructo se extingue/.test(P2.find((p) => /Local comercial/.test(p.mostrar)).mostrar), P2.find((p) => /Local/.test(p.mostrar)));
}
// Formatos de Barcelona (bilingüe), Sevilla y Valencia
const NOTA_BCN = `REGISTRE DE LA PROPIETAT DE BARCELONA NÚM. 5 · REGISTRO DE LA PROPIEDAD DE BARCELONA Nº 5
NOTA SIMPLE INFORMATIVA
FINCA DE BARCELONA Nº 11223 · CRU: 08001000112233
DESCRIPCIÓN: URBANA: ENTIDAD NÚMERO DOS.- Vivienda en la planta primera, puerta primera, de la casa número doscientos cincuenta de la calle Mallorca, de Barcelona. Superficie útil de setenta metros cuadrados. Coeficiente: 6,50 %. Referencia catastral: 1111111DF3811A0002IB.
TITULARIDAD: LUIS JIMÉNEZ RUIZ, con N.I.F. ${nif(74555666)}, casado, titular del pleno dominio de la totalidad con carácter privativo, por título de compraventa.
CARGAS: Libre de cargas. Lliure de càrregues.`;
{ const d = L.lecAnalizar(NOTA_BCN, "nota bcn.pdf"); const b = d.bienes[0]; t("nota bcn", d.tipo === "notasimple" && b?.fincaRegistral === "11223" && b.cru === "08001000112233" && b.tipo === "vivienda" && b.titularidad === "privativo" && /Vivienda en la planta primera/.test(b.descripcion) && campo(d, "cargas")?.valor === "libre", [d.tipo, b, d.campos]); }
const NOTA_SEV = `REGISTRO DE LA PROPIEDAD Nº 3 DE SEVILLA. NOTA SIMPLE. FINCA Nº 45678 DE SEVILLA. CRU 41003000456789. RÚSTICA.- Suerte de tierra de olivar en el término de Carmona, al sitio de la Vega, de tres hectáreas. Referencia catastral 41024A005000120000KK. TITULARIDAD: DOÑA MARÍA DOLORES RUIZ CANO, con N.I.F. ${NIF_S}, viuda, titular de una tercera parte indivisa del pleno dominio, con carácter privativo, por título de herencia. CARGAS: No constan cargas.`;
{ const d = L.lecAnalizar(NOTA_SEV, "nota sevilla.pdf"); const b = d.bienes[0]; t("nota sevilla tercera parte indivisa", b?.fincaRegistral === "45678" && b.titularidad === "proindiviso" && b.porcentaje === 33.33 && b.tipo === "inmueble" && /Suerte de tierra de olivar/.test(b.descripcion) && b.titulares?.[0]?.pct === 33.33, b); }
const NOTA_VAL = `REGISTRO DE LA PROPIEDAD DE VALENCIA Nº 10. NOTA SIMPLE INFORMATIVA. FINCA DE VALENCIA SECCIÓN 2ª Nº 34567. IDUFIR: 46010000345678. DESCRIPCIÓN: URBANA: Plaza de aparcamiento número veinte en el sótano del edificio en la avenida del Puerto número cien de Valencia. Superficie doce metros cuadrados. TITULARIDAD: DON ANTONIO JIMÉNEZ SOLER, con N.I.F. ${NIF_C}, y DOÑA CARMEN RUIZ LÓPEZ, con N.I.F. ${NIF_E}, titulares por mitad y proindiviso del pleno dominio, con carácter privativo cada mitad. CARGAS: Anotación preventiva de embargo letra A a favor de la Agencia Tributaria por 3.200,00 euros.`;
{ const d = L.lecAnalizar(NOTA_VAL, "nota valencia.pdf"); const b = d.bienes[0]; t("nota valencia finca con sección y embargo", b?.fincaRegistral === "34567" && b.cru === "46010000345678" && d.personas.length === 2 && d.avisos.some((a) => /embargo/.test(a)), [b, d.personas, d.avisos]); }

// ── 7. Testamento abierto notarial ──
const TEST = `NÚMERO MIL DOSCIENTOS TREINTA Y CUATRO.
TESTAMENTO ABIERTO.
En Málaga, mi residencia, a quince de junio de dos mil quince.
Ante mí, FERNANDO RUIZ CASTILLO, Notario del Ilustre Colegio de Andalucía, con residencia en esta ciudad,
COMPARECE:
DON ANTONIO JIMÉNEZ SOLER, mayor de edad, casado en únicas nupcias en régimen legal de gananciales con DOÑA CARMEN RUIZ LÓPEZ, vecino de Málaga, con domicilio en calle Larios número 12, y con D.N.I. número ${NIF_C}.
Manifiesta que de su matrimonio tiene cuatro hijos llamados CARMEN, LUIS, ANA y JAVIER JIMÉNEZ RUIZ, todos mayores de edad.
OTORGA su testamento con arreglo a las siguientes CLÁUSULAS:
PRIMERA.- Lega a su esposa el usufructo universal y vitalicio de toda su herencia, relevándola de la obligación de formar inventario y prestar fianza.
SEGUNDA.- Lega a su sobrino DON MIGUEL JIMÉNEZ SOLER la plaza de garaje número 12 sita en el sótano del edificio de calle Larios 12 de Málaga.
TERCERA.- Instituye herederos por partes iguales a sus cuatro hijos, sustituidos vulgarmente por sus respectivos descendientes.
CUARTA.- Si alguno de los legitimarios no aceptase el legado de usufructo, se aplicará la cautela socini.`;
{
  const d = L.lecAnalizar(TEST, "testamento.pdf");
  t("tes tipo", d.tipo === "testamento", d.tipo);
  t("tes testador", campo(d, "nombre")?.valor === "Antonio Jiménez Soler" && campo(d, "nombre").conf === 2, campo(d, "nombre"));
  const c = d.personas.find((p) => p.relacion === "conyuge");
  t("tes cónyuge", c?.nombre === "Carmen Ruiz López", d.personas);
  t("tes gananciales", campo(d, "civil")?.valor === "gananciales" && campo(d, "civil").conf === 2, campo(d, "civil"));
  const H = d.personas.filter((p) => p.relacion === "hijo").map((p) => p.nombre);
  t("tes 4 hijos con apellidos", H.length === 4 && H.includes("Carmen Jiménez Ruiz") && H.includes("Javier Jiménez Ruiz") && H.includes("Luis Jiménez Ruiz"), H);
  t("tes usufructo universal", campo(d, "testamento")?.valor === "usufructo" && /socini/.test(campo(d, "testamento").mostrar), campo(d, "testamento"));
  const leg = d.personas.find((p) => p.legatario);
  t("tes legado sobrino", leg?.nombre === "Miguel Jiménez Soler" && leg.relacion === "sobrino" && /plaza de garaje número 12/.test(leg.legadoDesc), leg);
  t("tes fecha letras", campo(d, "testamentoFecha")?.valor === "2015-06-15", campo(d, "testamentoFecha"));
  t("tes notario", campo(d, "testamentoNotario")?.valor === "Fernando Ruiz Castillo", campo(d, "testamentoNotario"));
}
// Testamento «uno para el otro» con hijos sin apellidos comunes explícitos y premuerto
const TEST2 = `TESTAMENTO ABIERTO. En Torremolinos, a veintiocho de marzo de dos mil diez. Ante mí, LUISA MARTÍN SANZ, Notaria. COMPARECE: DOÑA MARÍA DOLORES RUIZ CANO, viuda, vecina de Torremolinos. Manifiesta que tiene dos hijos llamados DON PABLO GARCÍA RUIZ y DOÑA ELENA GARCÍA RUIZ, habiendo fallecido con anterioridad su hijo DON JORGE GARCÍA RUIZ, que dejó descendencia. Instituye herederos por partes iguales a sus hijos.`;
{
  const d = L.lecAnalizar(TEST2, "testamento.pdf");
  const H = d.personas.filter((p) => p.relacion === "hijo").map((p) => p.nombre);
  t("tes2 hijos", H.length === 2 && H.includes("Pablo García Ruiz") && H.includes("Elena García Ruiz"), H);
  t("tes2 viuda", campo(d, "civil")?.valor === "viudo", campo(d, "civil"));
  t("tes2 partes iguales", campo(d, "testamento")?.valor === "porcentajes", campo(d, "testamento"));
  t("tes2 aviso premuerto", d.avisos.some((a) => /fallecido con anterioridad/.test(a)), d.avisos);
  t("tes2 notaria", campo(d, "testamentoNotario")?.valor === "Luisa Martín Sanz", campo(d, "testamentoNotario"));
}

// ── 7b. Acta de declaración de herederos abintestato ──
const ACTA = `NÚMERO SETECIENTOS OCHENTA Y NUEVE.
ACTA DE DECLARACIÓN DE HEREDEROS ABINTESTATO.
En Torremolinos, a doce de mayo de dos mil veintiséis.
Ante mí, LUISA MARTÍN SANZ, Notaria del Ilustre Colegio de Andalucía, con residencia en Torremolinos,
COMPARECE:
DON PABLO GARCÍA RUIZ, mayor de edad, casado, vecino de Torremolinos, con D.N.I. número ${nif(74111222)}.
INTERVIENE en su propio nombre y derecho, como hijo de la causante, y me REQUIERE para que declare quiénes son sus herederos abintestato.
EXPONE:
I.- Que su madre, DOÑA MARÍA DOLORES RUIZ CANO, falleció en Torremolinos el día tres de febrero de dos mil veintiséis, según acredita con el certificado de defunción, en estado de viuda de DON JOSÉ GARCÍA PÉREZ, fallecido el día 2 de junio de 2015, sin haber otorgado testamento, según resulta del certificado del Registro General de Actos de Última Voluntad.
II.- Que de su matrimonio tuvo tres hijos llamados DON PABLO, DOÑA ELENA y DON JORGE GARCÍA RUIZ, habiendo fallecido este último con anterioridad a la causante, el día 9 de agosto de 2020, dejando dos hijos, DON MARCOS y DOÑA LUCÍA GARCÍA MORENO.
DECLARACIÓN: Yo, la Notaria, considerando acreditados los hechos, DECLARO HEREDEROS ABINTESTATO de DOÑA MARÍA DOLORES RUIZ CANO a sus hijos DON PABLO GARCÍA RUIZ y DOÑA ELENA GARCÍA RUIZ, por terceras partes iguales, y a sus nietos DON MARCOS GARCÍA MORENO y DOÑA LUCÍA GARCÍA MORENO, en representación de su padre premuerto DON JORGE GARCÍA RUIZ, por sextas partes. Así lo digo y otorgo.`;
{
  const d = L.lecAnalizar(ACTA, "acta herederos.pdf");
  t("acta tipo", d.tipo === "herederos", d.tipo);
  t("acta causante", campo(d, "nombre")?.valor === "María Dolores Ruiz Cano", campo(d, "nombre"));
  t("acta fecha fallecimiento (no la del acta ni la del marido)", campo(d, "fecha")?.valor === "2026-02-03", campo(d, "fecha"));
  t("acta viuda", campo(d, "civil")?.valor === "viudo", campo(d, "civil"));
  t("acta sin testamento", campo(d, "testamento")?.valor === "no" && /abintestato/.test(campo(d, "testamento").mostrar), campo(d, "testamento"));
  const H = d.personas.filter((p) => p.relacion === "hijo");
  t("acta 2 hijos herederos (no el premuerto)", H.length === 2 && H.map((p) => p.nombre).sort().join("|") === "Elena García Ruiz|Pablo García Ruiz", d.personas);
  t("acta cuota hijos 33,33", H.every((p) => p.pct === 33.33), H);
  const Nn = d.personas.filter((p) => p.relacion === "nieto");
  t("acta nietos con estirpe", Nn.length === 2 && Nn.every((p) => p.estirpe === "Jorge García Ruiz" && p.pct === 16.67), Nn);
  t("acta no mete al marido fallecido como cónyuge", !d.personas.some((p) => p.relacion === "conyuge"), d.personas);
  t("acta aviso premuerto", d.avisos.some((a) => /estirpes/.test(a)), d.avisos);
  const a = campo(d, "actaHerederos")?.valor;
  t("acta notaria y fecha", a?.notario === "Luisa Martín Sanz" && a.fecha === "2026-05-12" && a.protocolo === "789", a);
}
const ACTA2 = `ACTA DE NOTORIEDAD DE DECLARACIÓN DE HEREDEROS ABINTESTATO. En Málaga, a 2 de junio de 2026. Ante mí, FERNANDO RUIZ CASTILLO, Notario de Málaga. COMPARECE DOÑA CARMEN RUIZ LÓPEZ ... EXPONE: Que su esposo, DON ANTONIO JIMÉNEZ SOLER, falleció en Málaga el día 20/04/2026, en estado de casado en únicas nupcias con la compareciente, de cuyo matrimonio tuvo cuatro hijos llamados CARMEN, LUIS, ANA y JAVIER JIMÉNEZ RUIZ, sin haber otorgado testamento. DECLARO herederos abintestato de DON ANTONIO JIMÉNEZ SOLER a sus cuatro hijos DOÑA CARMEN, DON LUIS, DOÑA ANA y DON JAVIER JIMÉNEZ RUIZ, por partes iguales, sin perjuicio de la cuota legal usufructuaria que corresponde a su cónyuge viuda DOÑA CARMEN RUIZ LÓPEZ.`;
{
  const d = L.lecAnalizar(ACTA2, "acta.pdf");
  t("acta2 causante (no el compareciente)", campo(d, "nombre")?.valor === "Antonio Jiménez Soler", campo(d, "nombre"));
  t("acta2 fecha", campo(d, "fecha")?.valor === "2026-04-20", campo(d, "fecha"));
  t("acta2 casado", campo(d, "civil")?.valor === "gananciales", campo(d, "civil"));
  t("acta2 cónyuge", d.personas.find((p) => p.relacion === "conyuge")?.nombre === "Carmen Ruiz López", d.personas);
  const H = d.personas.filter((p) => p.relacion === "hijo");
  t("acta2 4 hijos con apellidos", H.length === 4 && H.some((p) => p.nombre === "Javier Jiménez Ruiz") && H.some((p) => p.nombre === "Carmen Jiménez Ruiz"), H.map((p) => p.nombre));
  t("acta2 aviso usufructo legal", d.avisos.some((a) => /usufructuaria/.test(a)), d.avisos);
}

// ── 7c. Libro de familia (escaneado, texto corrido) y certificados del Registro Civil ──
const LIBRO = `MINISTERIO DE JUSTICIA · REGISTRO CIVIL · LIBRO DE FAMILIA
MATRIMONIO
Contraído en MÁLAGA el día 14 de junio de 1975. Registro Civil de Málaga, tomo 102, página 88.
MARIDO: DON ANTONIO JIMÉNEZ SOLER, nacido en Antequera el día 12 de marzo de 1948, hijo de Manuel y de Dolores.
MUJER: DOÑA CARMEN RUIZ LÓPEZ, nacida en Málaga el día 14 de enero de 1952, hija de Pedro y de Carmen.
Régimen económico del matrimonio: el legal de gananciales.
HIJOS:
1.- CARMEN JIMÉNEZ RUIZ, nacida en Málaga el día 2 de mayo de 1976.
2.- LUIS JIMÉNEZ RUIZ, nacido en Málaga el día 15 de julio de 1977.
3.- ANA JIMÉNEZ RUIZ, nacida en Málaga el día 30 de septiembre de 1979.
4.- JAVIER JIMÉNEZ RUIZ, nacido en Málaga el día 6 de marzo de 1980.`;
{
  const d = L.lecAnalizar(LIBRO, "libro familia.jpg");
  t("libro tipo", d.tipo === "familia", d.tipo);
  const C = d.personas.filter((p) => p.pareja);
  t("libro cónyuges", C.length === 2 && C[0].nombre === "Antonio Jiménez Soler" && C[1].nombre === "Carmen Ruiz López" && C[1].nacimiento === "1952-01-14" && C[1].edad === 74, C);
  const H = d.personas.filter((p) => p.relacion === "hijo");
  t("libro 4 hijos con edad", H.length === 4 && H.find((p) => p.nombre === "Javier Jiménez Ruiz")?.edad === 46 && H.find((p) => p.nombre === "Carmen Jiménez Ruiz")?.nacimiento === "1976-05-02", H);
  t("libro gananciales", campo(d, "civil")?.valor === "gananciales" && campo(d, "civil").conf === 2, campo(d, "civil"));
  t("libro fecha matrimonio", campo(d, "matrimonioFecha")?.valor === "1975-06-14", campo(d, "matrimonioFecha"));
}
const MATRI = `MINISTERIO DE JUSTICIA · REGISTRO CIVIL DE MÁLAGA
CERTIFICADO DE INSCRIPCIÓN DE MATRIMONIO
Datos del matrimonio
Fecha: 14/06/1975 Lugar: Málaga Forma: Canónica
Cónyuge 1: Nombre: ANTONIO Primer apellido: JIMÉNEZ Segundo apellido: SOLER DNI: ${NIF_C} Fecha de nacimiento: 12/03/1948
Cónyuge 2: Nombre: CARMEN Primer apellido: RUIZ Segundo apellido: LÓPEZ DNI: ${NIF_E} Fecha de nacimiento: 14/01/1952
Régimen económico matrimonial: Separación de bienes (capitulaciones de 10/06/1975, notario D. Luis Pérez Gil)`;
{
  const d = L.lecAnalizar(MATRI, "matrimonio.pdf");
  t("matri tipo", d.tipo === "matrimonio", d.tipo);
  t("matri 2 cónyuges", d.personas.length === 2 && d.personas.every((p) => p.pareja && p.relacion === "conyuge") && d.personas[1].nombre === "Carmen Ruiz López" && d.personas[1].nacimiento === "1952-01-14", d.personas);
  t("matri separación de bienes", campo(d, "civil")?.valor === "separacion", campo(d, "civil"));
}
const NACI = `REGISTRO CIVIL DE MÁLAGA · CERTIFICADO DE INSCRIPCIÓN DE NACIMIENTO
Datos del inscrito: Nombre: JAVIER Primer apellido: JIMÉNEZ Segundo apellido: RUIZ Sexo: Varón Fecha de nacimiento: 06/03/1980 Lugar de nacimiento: Málaga
Padre: Nombre: ANTONIO Primer apellido: JIMÉNEZ Segundo apellido: SOLER Fecha de nacimiento: 12/03/1948
Madre: Nombre: CARMEN Primer apellido: RUIZ Segundo apellido: LÓPEZ Fecha de nacimiento: 14/01/1952`;
{
  const d = L.lecAnalizar(NACI, "nacimiento javier.pdf");
  t("naci tipo", d.tipo === "nacimiento", d.tipo);
  const ins = d.personas.find((p) => p.inscrito);
  t("naci inscrito con fecha", ins?.nombre === "Javier Jiménez Ruiz" && ins.nacimiento === "1980-03-06" && ins.relacion === "", ins);
  t("naci progenitores", d.personas.filter((p) => p.progenitor).length === 2 && d.personas.find((p) => p.progenitor).nombre === "Antonio Jiménez Soler", d.personas);
}

// ── 7d. Certificado y volante de empadronamiento ──
const PADRON = `AYUNTAMIENTO DE MÁLAGA · Área de Gobierno Abierto · Padrón Municipal de Habitantes
CERTIFICADO DE EMPADRONAMIENTO
El Secretario General del Ayuntamiento de Málaga CERTIFICA: Que D. ANTONIO JIMÉNEZ SOLER, con DNI ${NIF_C}, nacido el 12/03/1948, figura inscrito en el Padrón Municipal de Habitantes de este municipio con domicilio en CL LARIOS 12 Es:1 Pl:03 Pt:A, 29005 MÁLAGA, desde el día 01/05/1996 (fecha de alta), habiendo causado baja por defunción el 20/04/2026.
Personas que conviven en el mismo domicilio:
CARMEN RUIZ LÓPEZ ${NIF_E} 14/01/1952
Málaga, 27 de abril de 2026.`;
{
  const d = L.lecAnalizar(PADRON, "empadronamiento.pdf");
  t("padrón tipo", d.tipo === "padron", d.tipo);
  t("padrón domicilio", /Calle Larios 12/.test(campo(d, "domicilio")?.valor || "") && /Málaga/.test(campo(d, "domicilio").valor), campo(d, "domicilio"));
  t("padrón municipio", campo(d, "residencia")?.valor === "Málaga", campo(d, "residencia"));
  t("padrón alta y baja", campo(d, "padronAlta")?.valor === "1996-05-01" && campo(d, "fecha")?.valor === "2026-04-20", [campo(d, "padronAlta"), campo(d, "fecha")]);
  t("padrón personas", d.personas.length === 2 && d.personas[0].nombre === "Antonio Jiménez Soler" && d.personas[0].nif === NIF_C && d.personas[1].nombre === "Carmen Ruiz López" && d.personas[1].nif === NIF_E && d.personas[1].edad === 74, d.personas);
  t("padrón sin aviso de pocos años", !d.avisos.some((a) => /menos de cinco/.test(a)), d.avisos);
}
const VOLANTE = `AJUNTAMENT DE BARCELONA · AYUNTAMIENTO DE BARCELONA
VOLANTE DE EMPADRONAMIENTO COLECTIVO · PADRÓN MUNICIPAL DE HABITANTES
Según los datos del padrón, en el domicilio Carrer de Mallorca 250, 3r 2a, 08008 BARCELONA (BARCELONA) figuran inscritas las personas siguientes:
Nombre y apellidos Documento Fecha de nacimiento Fecha de alta
LUIS JIMÉNEZ RUIZ ${nif(74555666)} 15/07/1977 03/09/2023
MARTA PUIG SOLÉ ${nif(46111222)} 02/02/1980 03/09/2023
Barcelona, 5 de mayo de 2026`;
{
  const d = L.lecAnalizar(VOLANTE, "volante.pdf");
  t("volante tipo", d.tipo === "padron", d.tipo);
  t("volante municipio", campo(d, "residencia")?.valor === "Barcelona (Barcelona)" || campo(d, "residencia")?.valor === "Barcelona", campo(d, "residencia"));
  t("volante 2 personas", d.personas.length === 2 && d.personas[0].nombre === "Luis Jiménez Ruiz" && d.personas[1].nombre === "Marta Puig Solé", d.personas);
  t("volante aviso menos de cinco años", d.avisos.some((a) => /menos de cinco/.test(a)), d.avisos);
}

// ── 7e. Póliza / certificado individual de seguro de vida ──
const POLIZA = `MAPFRE VIDA, S.A. DE SEGUROS Y REASEGUROS SOBRE LA VIDA HUMANA
CERTIFICADO INDIVIDUAL DE SEGURO · SEGURO DE VIDA RIESGO
Póliza nº 80012345 · Certificado nº 0001
Tomador del seguro: ANTONIO JIMÉNEZ SOLER NIF ${NIF_C}
Asegurado: ANTONIO JIMÉNEZ SOLER
Fecha de efecto: 01/06/2010 Duración: anual renovable
Garantías y capitales asegurados
Fallecimiento por cualquier causa: 50.000,00 €
Fallecimiento por accidente: 100.000,00 €
Beneficiarios en caso de fallecimiento: el cónyuge del asegurado, DOÑA CARMEN RUIZ LÓPEZ; en su defecto, los hijos por partes iguales.
Prima anual: 412,30 €`;
{
  const d = L.lecAnalizar(POLIZA, "poliza mapfre.pdf");
  t("póliza tipo", d.tipo === "poliza", d.tipo);
  const v = campo(d, "poliza")?.valor;
  t("póliza entidad y número", v?.entidad === "Mapfre Vida" && v.poliza === "80012345", v);
  t("póliza capital fallecimiento (no la prima ni el de accidente)", v?.capital === 50000, v?.capital);
  t("póliza beneficiaria cónyuge", d.personas.length === 1 && d.personas[0].nombre === "Carmen Ruiz López" && d.personas[0].relacion === "conyuge" && d.personas[0].beneficiario, d.personas);
  t("póliza aviso no es masa hereditaria", d.avisos.some((a) => /NO es masa hereditaria/.test(a) && /art\. 88 LCS/.test(a)), d.avisos);
  t("póliza no propone bienes", d.bienes.length === 0, d.bienes);
  t("póliza no se confunde con el certificado del Registro", L.lecAnalizar(SEG, "x.pdf").tipo === "seguros", 0);
}
const DECESOS = `SANTALUCÍA SEGUROS · CONDICIONES PARTICULARES · SEGURO DE DECESOS · Póliza: 55-0098 · Tomador: ANTONIO JIMÉNEZ SOLER · Asegurados: ANTONIO JIMÉNEZ SOLER y CARMEN RUIZ LÓPEZ · Capital asegurado por asegurado: 4.500,00 € · Prima mensual 38,20 €`;
{ const d = L.lecAnalizar(DECESOS, "decesos.pdf"); t("decesos tipo y aviso", d.tipo === "poliza" && campo(d, "poliza")?.valor.tipo === "decesos" && d.avisos.some((a) => /decesos/.test(a)), [d.tipo, campo(d, "poliza")?.valor, d.avisos]); }

// ── 7f. Escritura de herencia anterior (título de adquisición del hoy causante) ──
const HPREV = `NÚMERO MIL QUINIENTOS.
ESCRITURA DE ACEPTACIÓN Y ADJUDICACIÓN DE HERENCIA.
En Torremolinos, a tres de septiembre de dos mil cuatro.
Ante mí, IGNACIO VEGA RÍOS, Notario del Ilustre Colegio de Andalucía, con residencia en Torremolinos,
COMPARECEN: DON ANTONIO JIMÉNEZ SOLER, mayor de edad, casado, vecino de Málaga, con D.N.I. ${NIF_C}, y DOÑA ISABEL JIMÉNEZ SOLER, mayor de edad, soltera, vecina de Antequera.
EXPONEN: I.- Que DON MANUEL JIMÉNEZ GARCÍA falleció en Antequera el día 4 de enero de 2004, en estado de viudo, bajo testamento otorgado ante el Notario de Antequera don Pedro Ruiz el 2 de febrero de 1990, en el que instituyó herederos por partes iguales a sus dos hijos, los comparecientes.
II.- INVENTARIO. ACTIVO:
1.- URBANA: PLAZA DE GARAJE número doce en la planta de sótano del edificio sito en avenida de los Manantiales número cinco, de Torremolinos. Referencia catastral 9876543UF6597N0012GR. Inscrita en el Registro de la Propiedad de Torremolinos nº 1, finca 777. Se valora en NUEVE MIL EUROS (9.000,00 €).
2.- RÚSTICA: Parcela de secano en el pago de la Vega, término de Antequera, de dos hectáreas. Referencia catastral 29015A012003450000LU. Valorada en 12.000,00 euros.
3.- Saldo en cuenta corriente en Unicaja, 6.000,00 euros.
Total activo: 27.000,00 euros.
III.- ADJUDICACIONES. A DON ANTONIO JIMÉNEZ SOLER se le adjudica la finca descrita bajo el número 1 del inventario, valorada en 9.000,00 €, y la mitad del saldo. A DOÑA ISABEL JIMÉNEZ SOLER se le adjudica la finca descrita bajo el número 2, valorada en 12.000,00 €, y la otra mitad del saldo.
Así lo otorgan.`;
{
  const d = L.lecAnalizar(HPREV, "escritura herencia 2004.pdf");
  t("hprev tipo", d.tipo === "herenciaprevia", d.tipo);
  t("hprev 2 inmuebles", d.bienes.length === 2, d.bienes.map((b) => b.descripcion));
  const g = d.bienes[0];
  t("hprev garaje ref y valor", g?.refCatastral === "9876543UF6597N0012GR" && g.valorAdq === 9000 && g.tipo === "inmueble", g);
  t("hprev fecha adquisición = fallecimiento anterior", g?.fechaAdq === "2004-01-04", g?.fechaAdq);
  t("hprev adjudicatarios", g?.adjudicatario === "Antonio Jiménez Soler" && d.bienes[1].adjudicatario === "Isabel Jiménez Soler" && d.bienes[1].valorAdq === 12000, d.bienes.map((b) => [b.adjudicatario, b.valorAdq]));
  t("hprev no propone nombre de causante", !campo(d, "nombre"), d.campos);
  t("hprev aviso título", d.avisos.some((a) => /Manuel Jiménez García/.test(a) && /art\. 989/.test(a)), d.avisos);
  // Fusión con la nota simple del garaje: completa fecha y valor de adquisición; la rústica de la hermana queda dudosa
  const x = { id: "xh", nombre: "Antonio Jiménez Soler", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["nota garaje.pdf", NOTA_LIBRE.replace("Libre de cargas.", "Libre de cargas. Referencia catastral: 9876543UF6597N0012GR.")], ["herencia 2004.pdf", HPREV]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R).propuestas.filter((p) => p.grupo === "Inmuebles");
  t("hprev fusión garaje por referencia catastral", P.filter((p) => /9876543UF6597N0012GR/.test(p.mostrar)).length === 1 && /adquirido 2004-01-04/.test(P.find((p) => /9876543UF/.test(p.mostrar)).mostrar) && /\+/.test(P.find((p) => /9876543UF/.test(p.mostrar)).doc), P.map((p) => [p.mostrar, p.doc]));
  t("hprev rústica de la hermana sin marcar", P.find((p) => /Parcela de secano/.test(p.mostrar))?.conf === 0, P.find((p) => /Parcela/.test(p.mostrar)));
}

// ── 7g. Permiso de circulación (DGT) y ficha técnica (ITV) ──
const PERMISO = `MINISTERIO DEL INTERIOR · DIRECCIÓN GENERAL DE TRÁFICO
PERMISO DE CIRCULACIÓN
A Matrícula 1234 BCD
B Fecha de primera matriculación 12/05/2015
I Fecha de matriculación 12/05/2015
D.1 Marca SEAT
D.2 Tipo/Variante/Versión 5F/ABC/XYZ
D.3 Denominación comercial LEON
E Número de identificación del vehículo VSSZZZ5FZFR012345
C.1.1 Apellidos y nombre o razón social JIMÉNEZ SOLER, ANTONIO
C.1.3 Domicilio CL LARIOS 12 3 A 29005 MÁLAGA
J Categoría del vehículo M1
P.1 Cilindrada 1598 P.3 Tipo de combustible Gasolina`;
{
  const d = L.lecAnalizar(PERMISO, "permiso circulacion.pdf");
  t("permiso tipo", d.tipo === "vehiculo", d.tipo);
  const b = d.bienes[0];
  t("permiso bien vehículo", b?.tipo === "vehiculo" && b.matricula === "1234 BCD" && b.marca === "SEAT" && b.modelo === "LEON" && b.fechaMatriculacion === "2015-05-12", b);
  t("permiso descripción", /Turismo SEAT LEON, matrícula 1234 BCD, matriculado en 2015/.test(b?.descripcion || ""), b?.descripcion);
  t("permiso titular", b?.titular === "Antonio Jiménez Soler" && b.bastidor === "VSSZZZ5FZFR012345", [b?.titular, b?.bastidor]);
  t("permiso sin valor y aviso tablas", b?.valor === null && d.avisos.some((a) => /precios medios/.test(a) && /11 años de uso → 13 %/.test(a)), d.avisos);
}
const ITV = `TARJETA ITV · INSPECCIÓN TÉCNICA DE VEHÍCULOS
Marca: RENAULT Tipo: BFB Denominación comercial: CLIO Nº de bastidor: VF1BFB00012345678 Matrícula: MA-1234-CS Fecha de matriculación: 03/02/1999 Cilindrada: 1149 cm3 Potencia fiscal: 9,12 CVF Categoría: M1`;
{
  const d = L.lecAnalizar(ITV, "ficha tecnica.jpg");
  const b = d.bienes[0];
  t("itv tipo y datos", d.tipo === "vehiculo" && b?.matricula === "MA-1234-CS" && b.marca === "RENAULT" && b.modelo === "CLIO" && b.fechaMatriculacion === "1999-02-03" && b.cilindrada === 1149 && b.potenciaFiscal === 9.12, [d.tipo, b]);
  t("itv antigüedad ≥12 años → 10 %", d.avisos.some((a) => /→ 10 %/.test(a)), d.avisos);
}

// ── 8. DNI: zona de lectura mecánica (reverso del DNI 3.0) ──
const DNI = `IDESPBAA000589${"2"}${NIF_H}<<<<<<
8003060M2903253ESP<<<<<<<<<<<2
JIMENEZ<RUIZ<<JAVIER<<<<<<<<<<<<`;
{
  const d = L.lecAnalizar(DNI, "IMG_0001.jpg");
  t("dni tipo", d.tipo === "dni", d.tipo);
  const p = d.personas[0];
  t("dni nombre", p?.nombre === "Javier Jimenez Ruiz", p);
  t("dni nif", p?.nif === NIF_H, p?.nif);
  t("dni nacimiento", p?.nacimiento === "1980-03-06" && p.edad === 46, [p?.nacimiento, p?.edad]);
}

// Nacimiento + DNI: fusión
{
  // Fusión: el inscrito es hijo si uno de los progenitores es el causante; el nacimiento del DNI y el del certificado no se duplican
  const x = { id: "xn", nombre: "Antonio Jiménez Soler", fecha: "2026-04-20", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["nacimiento.pdf", NACI], ["dni.jpg", DNI]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R).propuestas.filter((p) => p.grupo === "Personas");
  t("naci → hijo del causante, una sola propuesta con NIF y edad", P.length === 2 && P.find((p) => /Javier/.test(p.mostrar))?.etiqueta === "Hijo/a" && P.find((p) => /Javier/.test(p.mostrar)).mostrar.includes(NIF_H) && P.find((p) => /Carmen Ruiz/.test(p.mostrar))?.etiqueta === "Cónyuge", P.map((p) => [p.etiqueta, p.mostrar, p.conf]));
}

// DNI antiguo (dos líneas de 36: nombre en la primera, número + ESP + nacimiento en la segunda)
const NIF_L = nif(74555666);
const DNI_VIEJO = `DOCUMENTO NACIONAL DE IDENTIDAD
IDESPJIMENEZ<RUIZ<<LUIS<<<<<<<<<<<<<<
${NIF_L}0ESP7707154M1105209<<<<<<<5`;
{
  const d = L.lecAnalizar(DNI_VIEJO, "dni luis.jpg");
  t("dni viejo tipo", d.tipo === "dni", d.tipo);
  const p = d.personas[0];
  t("dni viejo nombre", p?.nombre === "Luis Jimenez Ruiz", p);
  t("dni viejo nif", p?.nif === NIF_L, p?.nif);
  t("dni viejo nacimiento", p?.nacimiento === "1977-07-15" && p.edad === 49, [p?.nacimiento, p?.edad]);
}
// NIE / TIE (tarjeta de identidad de extranjero): NIE X1234567L con letra de control
const NIE_V = (() => { for (let n = 1234567; ; n++) { const s = "X" + n; const l = "TRWAGMYFPDXBNJZSQVHLCKE"[Number("0" + n) % 23]; return s + l; } })();
const TIE = `TARJETA DE IDENTIDAD DE EXTRANJERO · PERMISO DE RESIDENCIA
APELLIDOS ROSSI BIANCHI NOMBRE GIULIA SEXO F NACIONALIDAD ITA
NIE ${NIE_V} FECHA DE NACIMIENTO 03 11 1985
IDESPE12345678${NIE_V}<<<<<<<
8511032F3001015ITA<<<<<<<<<<<4
ROSSI<BIANCHI<<GIULIA<<<<<<<<<<<<`;
{
  const d = L.lecAnalizar(TIE, "tie giulia.jpg");
  t("tie tipo", d.tipo === "dni", d.tipo);
  const p = d.personas[0];
  t("tie nombre", p?.nombre === "Giulia Rossi Bianchi", p);
  t("tie nie válido", p?.nif === NIE_V && L.lecNifOk(NIE_V) === true && L.lecNifOk("X1234567A") === false, [p?.nif, NIE_V]);
  t("tie nacimiento", p?.nacimiento === "1985-11-03", p?.nacimiento);
  t("tie aviso extranjero", d.avisos.some((a) => /NIE/.test(a)), d.avisos);
}

// ── 9. Certificado bancario de posiciones ──
const BAN = `UNICAJA BANCO, S.A.
CERTIFICADO DE POSICIONES A FECHA DE FALLECIMIENTO
Certificamos que D. ANTONIO JIMÉNEZ SOLER, con NIF ${NIF_C}, mantenía en esta entidad a fecha 20/04/2026 las siguientes posiciones:
Cuenta corriente ES21 2103 0000 1234 5678 9012 · Titulares: Antonio Jiménez Soler y Carmen Ruiz López · Saldo: 38.500,00 €
Depósito a plazo ES21 2103 0000 1234 5678 9013 · Saldo: 60.000,00 €
Fondo de inversión Unifond Moderado FI · 1.234,5678 participaciones · Valor liquidativo total: 45.000,00 €
Málaga, 5 de mayo de 2026`;
{
  const d = L.lecAnalizar(BAN, "certificado unicaja.pdf");
  t("ban tipo", d.tipo === "bancario", d.tipo);
  t("ban 3 posiciones", d.bienes.length === 3, d.bienes.map((b) => [b.tipo, b.valor]));
  t("ban cuenta", d.bienes[0]?.tipo === "cuenta" && d.bienes[0].valor === 38500 && d.bienes[0].iban === "ES2121030000123456789012", d.bienes[0]);
  t("ban depósito", d.bienes[1]?.valor === 60000 && /Depósito/.test(d.bienes[1].descripcion), d.bienes[1]);
  t("ban fondo", d.bienes[2]?.tipo === "valores" && d.bienes[2].valor === 45000, d.bienes[2]);
  t("ban entidad", /Unicaja/.test(d.bienes[0]?.entidad || ""), d.bienes[0]?.entidad);
}

// Certificado con formato de tabla (como lo devuelve pdf.js: el € cae en la línea siguiente) y préstamo hipotecario
const BAN2 = `UNICAJA BANCO, S.A. · Servicio de Testamentarías
CERTIFICADO DE POSICIONES A FECHA DE FALLECIMIENTO
Producto IBAN Titulares Saldo
Cuenta corriente ES12 2103 0000 1111 Antonio Jiménez Soler y 12.345,67
2222 3333 Carmen Ruiz López €
Préstamo hipotecario Vivienda calle Larios 12 Antonio Jiménez Soler y 31.420,18
Carmen Ruiz López €`;
{
  const d = L.lecAnalizar(BAN2, "caixabank.pdf");
  t("ban2 tipo", d.tipo === "bancario", d.tipo);
  t("ban2 cuenta con € en la línea siguiente", d.bienes.length === 1 && d.bienes[0].valor === 12345.67 && d.bienes[0].cotitular === true, d.bienes);
  t("ban2 préstamo → deuda ganancial del banco", d.deudas.length === 1 && d.deudas[0].importe === 31420.18 && d.deudas[0].ganancial === true && d.deudas[0].fuente === "banco" && d.deudas[0].hipoteca === true, d.deudas);
  // Con la nota simple: la hipoteca de la nota queda sin marcar
  const x = { id: "x3", nombre: "", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["nota.pdf", NOTA], ["caixa.pdf", BAN2]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R).propuestas.filter((p) => p.grupo === "Deudas");
  t("banco manda sobre nota simple", P.length === 2 && P.filter((p) => p.on).length === 1 && P.find((p) => p.on).deuda.fuente === "banco", P.map((p) => [p.etiqueta, p.on]));
}

// Otros bancos y formatos: saldo delante del producto, € delante, participaciones, préstamo personal, tarjeta con saldo deudor, 50 %
const BAN3 = `CaixaBank, S.A. · Testamentarías
CERTIFICADO DE SALDOS A FECHA DE FALLECIMIENTO (20/04/2026)
Titular: ANTONIO JIMÉNEZ SOLER NIF ${NIF_C}
Saldo Producto Contrato Titularidad
€ 7.250,40 Cuenta corriente ES76 2100 0418 4502 0005 1332 50 % (cotitular: Carmen Ruiz López)
€ 15.000,00 Depósito a plazo 24 meses ES76 2100 0418 4502 0005 1333 100 %
Fondo de inversión CaixaBank Selección Tendencias FI · 812,3300 participaciones · valor liquidativo 18,4567 € · valoración € 14.993,20 · 100 %
Plan de pensiones CaixaBank Equilibrio · derechos consolidados € 22.000,00
Préstamo personal nº 9876-5 · capital pendiente € 5.400,00 · titular único
Tarjeta de crédito Visa Classic ****1234 · saldo deudor 850,75 €`;
{
  const d = L.lecAnalizar(BAN3, "caixabank.pdf");
  t("ban3 tipo", d.tipo === "bancario", d.tipo);
  t("ban3 entidad", d.bienes[0]?.entidad === "CaixaBank", d.bienes[0]?.entidad);
  const c = d.bienes.find((b) => /^Cuenta/.test(b.descripcion));
  t("ban3 cuenta con € delante y 50 %", c?.valor === 7250.4 && c.iban === "ES7621000418450200051332" && c.cotitular === true && c.porcentaje === 50, c);
  t("ban3 depósito", d.bienes.find((b) => /Depósito/.test(b.descripcion))?.valor === 15000, d.bienes);
  const f = d.bienes.find((b) => /Fondo/.test(b.descripcion));
  t("ban3 fondo con participaciones (valoración total, no el liquidativo)", f?.tipo === "valores" && f.valor === 14993.2 && /Selección Tendencias/.test(f.descripcion), f);
  const pl = d.bienes.find((b) => /Plan de pensiones/.test(b.descripcion));
  t("ban3 plan de pensiones sin marcar y con aviso", pl?.conf === 0 && d.avisos.some((a) => /IRPF/.test(a)), [pl, d.avisos]);
  t("ban3 préstamo personal y tarjeta como deudas", d.deudas.length === 2 && d.deudas[0].importe === 5400 && /Préstamo personal/.test(d.deudas[0].concepto) && d.deudas[0].hipoteca === false && d.deudas[1].importe === 850.75 && /Tarjeta/.test(d.deudas[1].concepto), d.deudas);
  t("ban3 fecha saldo", d.extra.fechaSaldo === "2026-04-20", d.extra.fechaSaldo);
}
const BAN4 = `BANCO SANTANDER, S.A. · Certificado de posiciones del cliente fallecido
D. ANTONIO JIMÉNEZ SOLER · NIF ${NIF_C} · Fecha de fallecimiento 20/04/2026
Tipo de producto Número Intervinientes Saldo a fecha de fallecimiento
Cuenta Online ES91 0049 1500 0512 3456 7890 Antonio Jiménez Soler (titular) 2.310,55 EUR
Acciones Banco Santander 1.500 títulos Antonio Jiménez Soler 6.180,00 EUR
Cuenta corriente ES91 0049 1500 0512 3456 7891 Antonio Jiménez Soler (titular) -120,30 EUR`;
{
  const d = L.lecAnalizar(BAN4, "santander.pdf");
  t("ban4 santander", d.bienes.length === 2 && d.bienes[0].entidad === "Santander" && d.bienes[0].valor === 2310.55 && d.bienes[0].cotitular === false, d.bienes);
  t("ban4 acciones", d.bienes[1]?.tipo === "valores" && d.bienes[1].valor === 6180 && /Acciones/.test(d.bienes[1].descripcion), d.bienes[1]);
  t("ban4 descubierto → deuda", d.deudas.length === 1 && d.deudas[0].importe === 120.3 && /Descubierto/.test(d.deudas[0].concepto), d.deudas);
}
const BAN5 = `ING BANK N.V., Sucursal en España · Certificado de saldos
Cliente: ANTONIO JIMÉNEZ SOLER
Cuenta NÓMINA ES23 1465 0100 9112 3456 7890 · Saldo: 3.000,00€ · Titulares: 2 (ANTONIO JIMÉNEZ SOLER, CARMEN RUIZ LÓPEZ)
Cuenta NARANJA ES23 1465 0100 9112 3456 7891 · Saldo: 25.500,00€ · Titulares: 1`;
{
  const d = L.lecAnalizar(BAN5, "ing.pdf");
  t("ban5 ING € pegado y titulares 2", d.bienes.length === 2 && d.bienes[0].entidad === "ING" && d.bienes[0].valor === 3000 && d.bienes[0].cotitular === true && d.bienes[1].valor === 25500 && d.bienes[1].cotitular === false, d.bienes);
}

// ── 10. Escritura de compraventa (en pesetas, 1995) ──
const CV = `ESCRITURA DE COMPRAVENTA. NÚMERO DOS MIL CIEN.
En Málaga, a diez de mayo de mil novecientos noventa y cinco. Ante mí, LUIS PÉREZ GIL, Notario de Málaga, COMPARECEN: ...
EXPONEN: Que los vendedores son dueños de la siguiente finca: URBANA: VIVIENDA tipo A ... Referencia catastral 1234567VK4713S0001OQ.
ESTIPULACIONES: PRIMERA.- Los vendedores venden a los compradores la finca descrita. SEGUNDA.- El precio de esta compraventa es de DOCE MILLONES DE PESETAS (12.000.000 ptas.), que los vendedores confiesan recibido.`;
{
  const d = L.lecAnalizar(CV, "escritura compra 1995.pdf");
  t("cv tipo", d.tipo === "compraventa", d.tipo);
  const b = d.bienes[0];
  t("cv fecha letras", b?.fechaAdq === "1995-05-10", b?.fechaAdq);
  t("cv precio pesetas→€", b?.valorAdq === 72121.45, b?.valorAdq);
  t("cv ref", b?.refCatastral === "1234567VK4713S0001OQ", b?.refCatastral);
  t("cv aviso pesetas", d.avisos.some((a) => /pesetas/.test(a)), d.avisos);
}
const CV2 = `ESCRITURA DE COMPRAVENTA. En Torremolinos, a 3 de septiembre de 2004. ... El precio de la venta es de CIENTO OCHENTA MIL EUROS (180.000,00 €).`;
{ const d = L.lecAnalizar(CV2, "compra.pdf"); t("cv2 euros", d.bienes[0]?.valorAdq === 180000 && d.bienes[0].fechaAdq === "2004-09-03", d.bienes[0]); }

// ── 11. Documento no reconocido ──
{ const d = L.lecAnalizar("Factura de la floristería. Total 320,00 €.", "factura.pdf"); t("desconocido", d.tipo === "desconocido" && d.avisos.length === 1, d); }

// ── 11b. Modelo 650 presentado (Agencia Tributaria de Andalucía) ──
const M650 = `AGENCIA TRIBUTARIA DE ANDALUCÍA · MODELO 650 · IMPUESTO SOBRE SUCESIONES Y DONACIONES · AUTOLIQUIDACIÓN · ADQUISICIONES MORTIS CAUSA
Número de justificante: 6500000123456 · Fecha de presentación: 15/09/2026 · Oficina: Málaga
CAUSANTE Apellidos y nombre: JIMÉNEZ SOLER ANTONIO NIF: ${NIF_C} Fecha de devengo: 20/04/2026 Residencia habitual: MÁLAGA
SUJETO PASIVO Apellidos y nombre: JIMÉNEZ RUIZ CARMEN NIF: ${nif(74999000)} Parentesco: Hija Grupo: II Patrimonio preexistente: hasta 402.678,11
LIQUIDACIÓN Valor real de los bienes y derechos (01): 85.000,00 Base imponible (10): 85.000,00 Reducciones (20): 85.000,00 Base liquidable (30): 0,00 Cuota íntegra (40): 0,00 Total a ingresar (60): 0,00`;
{
  const d = L.lecAnalizar(M650, "modelo 650.pdf");
  t("650 tipo", d.tipo === "modelo650", d.tipo);
  t("650 causante y devengo", campo(d, "nombre")?.valor === "Antonio Jiménez Soler" && campo(d, "fecha")?.valor === "2026-04-20", [campo(d, "nombre"), campo(d, "fecha")]);
  const v = campo(d, "isdPresentado")?.valor;
  t("650 base y cuota", v?.base === 85000 && v.baseLiquidable === 0 && v.cuota === 0 && v.estado === "presentado" && v.modelo === "650", v);
  t("650 sujeto pasivo hija", d.personas.length === 1 && d.personas[0].nombre === "Carmen Jiménez Ruiz" && d.personas[0].relacion === "hijo" && d.personas[0].nif === nif(74999000), d.personas);
  const M650B = `AGENCIA TRIBUTARIA DE ANDALUCÍA · Modelo 650 · Impuesto sobre Sucesiones y Donaciones · Autoliquidación · Adquisiciones mortis causa
BORRADOR · NO PRESENTADO
Causante
Apellidos y nombre RUIZ CANO MARÍA DOLORES
NIF ${NIF_S}
Fecha de devengo 03/02/2026
Sujeto pasivo
Apellidos y nombre GARCÍA RUIZ PABLO
NIF ${nif(74111222)}
Parentesco Hijo
Grupo II
Liquidación
Base imponible (10) 61.300,00
Base liquidable (30) 0,00
Total a ingresar (60) 0,00`;
  const b2 = L.lecAnalizar(M650B, "650 borrador.pdf");
  t("650 borrador sin dos puntos (pdf.js)", b2.tipo === "modelo650" && campo(b2, "nombre")?.valor === "María Dolores Ruiz Cano" && b2.personas[0]?.nombre === "Pablo García Ruiz" && b2.personas[0].relacion === "hijo" && campo(b2, "isdPresentado")?.valor.estado === "borrador" && campo(b2, "isdPresentado").valor.base === 61300, [campo(b2, "nombre"), b2.personas, campo(b2, "isdPresentado")]);
  t("650 sin bienes y con aviso informativo", d.bienes.length === 0 && d.avisos.some((a) => /Solo informativo/.test(a) && /complementaria/.test(a)), d.avisos);
  t("650 nombre apellidos-nombre se funde con el causante", L.lecMismoNombre("Jiménez Soler Antonio", "Antonio Jiménez Soler") === true, 0);
}

// ── 11c. Documentos ajenos a la herencia ──
{
  const NOM = `EMPRESA EJEMPLO, S.L. · CIF B29000000 · RECIBO DE SALARIOS · NÓMINA · Trabajador: JAVIER JIMÉNEZ RUIZ · DNI ${NIF_H} · Periodo: abril 2026 · Salario base 1.800,00 · Total devengado 2.150,00 · Base de cotización 2.150,00 · IRPF 12 % · Líquido a percibir 1.720,50 € · IBAN ES21 2103 0000 1234 5678 9999`;
  const d = L.lecAnalizar(NOM, "nomina abril.pdf");
  t("nómina → desconocido con aviso propio", d.tipo === "desconocido" && d.avisos.some((a) => /nómina/.test(a)) && d.personas.length === 0, [d.tipo, d.avisos]);
  const FAC = `FUNERARIA LA PAZ, S.L. · CIF B29111111 · FACTURA Nº 2026/0412 · Fecha 22/04/2026 · Cliente: CARMEN RUIZ LÓPEZ · Servicio funerario completo D. Antonio Jiménez Soler · Base imponible 3.200,00 € · IVA 21 % 672,00 € · Total factura 3.872,00 €`;
  const f = L.lecAnalizar(FAC, "factura funeraria.pdf");
  t("factura funeraria → gasto deducible", f.tipo === "factura" && f.gastos.length === 1 && f.gastos[0].importe === 3872 && f.gastos[0].conf === 1 && /Funeraria La Paz/.test(f.gastos[0].concepto) && /Carmen Ruiz López/.test(f.gastos[0].nota) && f.avisos.some((a) => /14\.b LISD/.test(a)), [f.tipo, f.gastos, f.avisos]);
  const CARTA = `Estimada Sra. Ruiz López: En relación con su solicitud, le informamos de que la documentación recibida está completa y de que en breve recibirá el certificado de posiciones. Quedamos a su disposición. Atentamente, Departamento de Testamentarías, Unicaja Banco.`;
  const c = L.lecAnalizar(CARTA, "carta banco.pdf");
  t("carta → desconocido", c.tipo === "desconocido" && c.avisos.some((a) => /carta/.test(a)), [c.tipo, c.avisos]);
  t("el certificado bancario con «Atentamente» sigue siendo bancario", L.lecAnalizar(BAN + "\nAtentamente, el Director.", "x.pdf").tipo === "bancario", 0);
}

// ── 12. Propuestas sobre un expediente vacío: fusión entre documentos ──
{
  const x = { id: "x1", nombre: "", fecha: "", civil: "", testamento: "", personas: [], bienes: [], deudas: [], situ: {} };
  const docs = [["defuncion.pdf", DEF], ["ultimas.pdf", ULT], ["seguros.pdf", SEG], ["testamento.pdf", TEST], ["nota simple.pdf", NOTA], ["catastro.pdf", CAT], ["dni javier.jpg", DNI], ["unicaja.pdf", BAN], ["compra 1995.pdf", CV]];
  const R = docs.map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R);
  const grupos = (g) => P.propuestas.filter((p) => p.grupo === g);
  t("prop causante nombre una vez (defunción + últimas + testamento fundidos)", grupos("Causante").filter((p) => p.k === "nombre").length === 1 && /\+/.test(grupos("Causante").find((p) => p.k === "nombre").doc), grupos("Causante").map((p) => [p.etiqueta, p.doc]));
  t("prop fecha una vez", grupos("Causante").filter((p) => p.k === "fecha").length === 1, grupos("Causante").map((p) => p.etiqueta));
  t("prop civil una vez", grupos("Causante").filter((p) => p.k === "civil").length === 1, grupos("Causante").map((p) => p.etiqueta));
  t("prop testamento: manda el testamento, no «consta»", grupos("Testamento").filter((p) => p.k === "testamento").length === 1 && grupos("Testamento").find((p) => p.k === "testamento").valor === "usufructo", grupos("Testamento").map((p) => [p.etiqueta, p.valor]));
  t("prop DNI del causante no se duplica", grupos("Causante").filter((p) => p.etiqueta === "DNI del causante").length === 1, grupos("Causante"));
  const pers = grupos("Personas");
  t("prop causante no aparece como persona", !pers.some((p) => /Antonio Jiménez Soler/.test(p.mostrar)), pers.map((p) => p.mostrar));
  const carmen = pers.filter((p) => /Carmen Ruiz López/.test(p.mostrar));
  t("prop Carmen fusionada (testamento + nota simple → con NIF)", carmen.length === 1 && carmen[0].mostrar.includes(NIF_E) && carmen[0].etiqueta === "Cónyuge", carmen);
  const javier = pers.filter((p) => /Javier Jim[eé]nez Ruiz/.test(p.mostrar));
  t("prop Javier fusionado (testamento + DNI → NIF y edad)", javier.length === 1 && javier[0].mostrar.includes(NIF_H) && /46 años/.test(javier[0].mostrar), javier);
  const inm = grupos("Inmuebles");
  t("prop vivienda fusionada por referencia catastral (nota + catastro + compraventa)", inm.filter((p) => /1234567VK4713S0001OQ/.test(p.mostrar) || /Larios/.test(p.mostrar)).length >= 1, inm.map((p) => p.mostrar));
  t("prop cuentas", grupos("Cuentas y valores").length === 3, grupos("Cuentas y valores").length);
  t("prop deuda hipoteca", grupos("Deudas").length === 1, grupos("Deudas"));
  t("prop seguros", grupos("Seguros").length === 1, grupos("Seguros"));
  // Aplicar todo lo marcado
  L.LEC.resultado = P;
  const n = L.lecAplicar(x, P.propuestas.filter((p) => p.on).map((p) => p.id));
  t("aplicar n>0", n > 0, n);
  t("aplicado nombre", x.nombre === "Antonio Jiménez Soler", x.nombre);
  t("aplicado fecha", x.fecha === "2026-04-20", x.fecha);
  t("aplicado civil", x.civil === "gananciales", x.civil);
  t("aplicado testamento usufructo", x.testamento === "usufructo", x.testamento);
  t("aplicado nif", x.nifCausante === NIF_C, x.nifCausante);
  t("aplicado personas (cónyuge + 4 hijos + sobrino legatario)", x.personas.length === 6 && x.personas.filter((p) => p.relacion === "hijo").length === 4 && x.personas.some((p) => p.relacion === "sobrino"), x.personas.map((p) => [p.nombre, p.relacion]));
  t("aplicado origen documento", x.personas.every((p) => p.origen === "documento") && x.bienes.every((b) => b.origen === "documento"), 0);
  t("aplicado seguros", Array.isArray(x.aseguradoras) && x.aseguradoras.length === 2 && x.situ.seguro_vida === true, x.aseguradoras);
  t("aplicado testamentoDatos", x.testamentoDatos?.notario === "Fernando Ruiz Castillo" && x.testamentoDatos.fecha === "2015-06-15", x.testamentoDatos);
  t("aplicado docsLeidos", x.docsLeidos?.length === 9, x.docsLeidos?.length);
  const viv = x.bienes.filter((b) => b.tipo === "vivienda");
  t("aplicado una sola vivienda con catastral + adquisición", viv.length === 1 && viv[0].valorCatastralTotal === 140000 && viv[0].valorAdq === 72121.45 && viv[0].fechaAdq === "1995-05-10" && viv[0].titularidad === "ganancial", viv);
  t("aplicado deuda ganancial", x.deudas.length === 1 && x.deudas[0].importe === 90000 && x.deudas[0].ganancial === true, x.deudas);
  t("aplicado ccaa por lugar del fallecimiento", x.ccaa === undefined || x.ccaa === "" || x.ccaa === "AND", x.ccaa);
}
// ── 12b. Caso completo con los documentos nuevos: todo se funde sin duplicar ──
{
  const x = { id: "x12b", nombre: "", fecha: "", civil: "", testamento: "", personas: [], bienes: [], deudas: [], situ: {} };
  const docs = [["defuncion.pdf", DEF], ["ultimas.pdf", ULT], ["testamento.pdf", TEST], ["libro familia.jpg", LIBRO], ["padron.pdf", PADRON], ["poliza.pdf", POLIZA], ["nota simple.pdf", NOTA], ["catastro.pdf", CAT], ["ibi patronato.pdf", IBI_DOS], ["nota garaje.pdf", NOTA_LIBRE.replace("Libre de cargas.", "Libre de cargas. Referencia catastral: 9876543UF6597N0012GR.")], ["herencia 2004.pdf", HPREV], ["permiso.pdf", PERMISO], ["dni javier.jpg", DNI], ["dni luis.jpg", DNI_VIEJO], ["unicaja.pdf", BAN], ["caixabank.pdf", BAN3], ["modelo650.pdf", M650], ["nomina.pdf", "RECIBO DE SALARIOS · NÓMINA · Total devengado 2.150,00 · Base de cotización 2.150,00"]];
  const R = docs.map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  t("12b tipos", R.map((r) => r.tipo).join(",") === "defuncion,ultimas,testamento,familia,padron,poliza,notasimple,catastro,ibi,notasimple,herenciaprevia,vehiculo,dni,dni,bancario,bancario,modelo650,desconocido", R.map((r) => [r.nombre, r.tipo]));
  const P = L.lecPropuestas(x, R);
  const g = (n) => P.propuestas.filter((p) => p.grupo === n);
  t("12b causante: nombre una vez", g("Causante").filter((p) => p.k === "nombre").length === 1, g("Causante").map((p) => [p.etiqueta, p.doc]));
  t("12b causante: fecha una vez (defunción + últimas + padrón + 650)", g("Causante").filter((p) => p.k === "fecha").length === 1 && /\+/.test(g("Causante").find((p) => p.k === "fecha").doc), g("Causante").filter((p) => p.k === "fecha"));
  t("12b civil: una sola (gananciales; libro conf 2)", g("Causante").filter((p) => p.k === "civil").length === 1 && g("Causante").find((p) => p.k === "civil").conf === 2, g("Causante").filter((p) => p.k === "civil"));
  t("12b domicilio y residencia del padrón", g("Causante").some((p) => p.k === "domicilio") && g("Causante").some((p) => p.k === "residencia"), g("Causante").map((p) => p.k));
  t("12b matrimonio del libro", g("Causante").some((p) => p.k === "matrimonioFecha"), 0);
  const pers = g("Personas");
  const carmen = pers.filter((p) => /Carmen Ruiz López/.test(p.mostrar));
  t("12b Carmen una vez: cónyuge con NIF y edad (testamento + libro + padrón + nota + póliza)", carmen.length === 1 && carmen[0].etiqueta === "Cónyuge" && carmen[0].mostrar.includes(NIF_E) && /74 años/.test(carmen[0].mostrar) && carmen[0].on, carmen);
  const hijos = pers.filter((p) => p.etiqueta === "Hijo/a");
  t("12b 4 hijos, con edades del libro y NIF de los DNI", hijos.length === 4 && hijos.every((p) => /años/.test(p.mostrar)) && hijos.find((p) => /Javier/.test(p.mostrar)).mostrar.includes(NIF_H) && hijos.find((p) => /Luis/.test(p.mostrar)).mostrar.includes(NIF_L), hijos.map((p) => p.mostrar));
  t("12b nadie sin parentesco salvo el sobrino legatario", pers.filter((p) => /parentesco por indicar/.test(p.mostrar)).length === 0 && pers.some((p) => p.etiqueta === "Legatario"), pers.map((p) => [p.etiqueta, p.mostrar]));
  const inm = g("Inmuebles");
  t("12b vivienda Larios una vez (nota + catastro + IBI)", inm.filter((p) => /1234567VK4713S0001OQ/.test(p.mostrar)).length === 1 && /ganancial/.test(inm.find((p) => /1234567VK4713S0001OQ/.test(p.mostrar)).mostrar), inm.map((p) => p.mostrar));
  const gar = inm.find((p) => /9876543UF6597N0012GR/.test(p.mostrar));
  t("12b garaje Torremolinos una vez con título de 2004 (nota + herencia)", gar && /adquirido 2004-01-04/.test(gar.mostrar) && /por 9000 €/.test(gar.mostrar) && /privativo/.test(gar.mostrar) && !/proindiviso/.test(gar.mostrar), gar);
  t("12b garaje Larios del IBI, nuevo", inm.some((p) => /1234567VK4713S0012JO/.test(p.mostrar)), 0);
  t("12b rústica de la hermana sin marcar", inm.find((p) => /Parcela de secano/.test(p.mostrar))?.on === false, 0);
  t("12b vehículo", g("Vehículos").length === 1 && /SEAT LEON/.test(g("Vehículos")[0].mostrar), g("Vehículos"));
  const cv = g("Cuentas y valores");
  t("12b cuentas: 3 Unicaja + 4 CaixaBank (plan sin marcar)", cv.length === 7 && cv.filter((p) => !p.on).length === 1 && /Plan de pensiones/.test(cv.find((p) => !p.on).mostrar), cv.map((p) => [p.mostrar, p.on]));
  t("12b deudas: hipoteca nota + préstamo + tarjeta", g("Deudas").length === 3, g("Deudas").map((p) => p.mostrar));
  t("12b seguros: póliza", g("Seguros").length === 1 && /Mapfre Vida/.test(g("Seguros")[0].mostrar), g("Seguros"));
  t("12b impuestos: modelo 650 informativo", g("Impuestos").length === 1, g("Impuestos"));
  t("12b testamento manda sobre últimas", g("Testamento").filter((p) => p.k === "testamento").length === 1 && g("Testamento").find((p) => p.k === "testamento").valor === "usufructo", 0);
  L.LEC.resultado = P;
  const n = L.lecAplicar(x, P.propuestas.filter((p) => p.on).map((p) => p.id));
  t("12b aplicado: domicilio y municipio", /Larios/.test(x.domicilioCausante) && x.municipioCausante === "Málaga", [x.domicilioCausante, x.municipioCausante]);
  t("12b aplicado: aseguradoras como objetos", Array.isArray(x.aseguradoras) && x.aseguradoras[0].entidad === "Mapfre Vida" && x.situ.seguro_vida === true, x.aseguradoras);
  t("12b aplicado: vehículo sin valor", x.bienes.some((b) => b.tipo === "vehiculo" && b.matricula === "1234 BCD" && !b.valor), x.bienes.filter((b) => b.tipo === "vehiculo"));
  t("12b aplicado: personas 6", x.personas.length === 6 && x.personas.filter((p) => p.relacion === "hijo").length === 4 && x.personas.every((p) => p.edad || p.relacion === "sobrino"), x.personas.map((p) => [p.nombre, p.relacion, p.edad]));
  t("12b aplicado: garaje con título", x.bienes.find((b) => b.refCatastral === "9876543UF6597N0012GR")?.fechaAdq === "2004-01-04", 0);
  t("12b aplicado: cuenta 50 % CaixaBank en gananciales → ganancial sin porcentaje", (() => { const c = x.bienes.find((b) => b.iban === "ES7621000418450200051332"); return c && c.titularidad === "ganancial" && c.porcentaje == null; })(), x.bienes.find((b) => b.iban === "ES7621000418450200051332"));
  t("12b aplicado: lista de documentos (defunción, libro, padrón; escritura, IBI y certificado de los bienes)", (() => { const D = x.despacho?.docs || {}; const v = x.bienes.find((b) => b.refCatastral === "1234567VK4713S0001OQ"), c = x.bienes.find((b) => b.tipo === "cuenta"); return D.defuncion && D.libro && D.padron_causante && D.ultimas && D["esc_" + v.id] && D["ibi_" + v.id] && D["cert_" + c.id] && D["veh_" + x.bienes.find((b) => b.tipo === "vehiculo").id]; })(), x.despacho?.docs);
  t("12b aplicado: isdPresentados", x.isdPresentados?.length === 1 && x.isdPresentados[0].base === 85000, x.isdPresentados);
  t("12b resumen HTML no rompe", typeof L.lecResumenHTML(x) === "string" && /Mapfre Vida/.test(L.lecResumenHTML(x)), 0);
}

// ── 13. Propuestas sobre un expediente ya relleno: nada se duplica, lo que choca va sin marcar ──
{
  const x = { id: "x2", nombre: "Antonio Jiménez Soler", fecha: "2026-04-21", civil: "gananciales", testamento: "usufructo", personas: [{ id: "p1", nombre: "Carmen Ruiz López", relacion: "conyuge", edad: 74 }], bienes: [{ id: "b1", tipo: "vivienda", descripcion: "Piso de calle Larios 12", refCatastral: "1234567VK4713S0001OQ", valor: 240000 }], deudas: [], situ: {} };
  const R = [["defuncion.pdf", DEF], ["nota simple.pdf", NOTA]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos, escaneado: false }; });
  const P = L.lecPropuestas(x, R);
  t("lleno: no propone el nombre", !P.propuestas.some((p) => p.etiqueta.startsWith("Nombre")), P.propuestas.map((p) => p.etiqueta));
  const f = P.propuestas.find((p) => p.etiqueta.startsWith("Fecha"));
  t("lleno: fecha distinta → dudosa y sin marcar", f && f.conf === 0 && f.on === false, f);
  const c = P.propuestas.find((p) => /Completar a Carmen/.test(p.etiqueta));
  t("lleno: completa a Carmen con el NIF", c && c.mostrar.includes(NIF_E), c);
  const v = P.propuestas.find((p) => /Completar «Piso/.test(p.etiqueta));
  t("lleno: completa la vivienda (ganancial, hipoteca) sin duplicarla", v && !P.propuestas.some((p) => p.etiqueta === "Vivienda"), P.propuestas.map((p) => p.etiqueta));
}

// ── 14. Mismo nombre: hermanos, variantes y errores de OCR ──
{
  const M = L.lecMismoNombre;
  t("mismo: contenido en orden", M("Carmen Ruiz", "Carmen Ruiz López") === true);
  t("mismo: OCR un carácter", M("Armen Ruiz López", "Carmen Ruiz López") === true);
  t("mismo: sin acentos", M("Javier Jimenez Ruiz", "Javier Jiménez Ruiz") === true);
  t("distinto: hermanos", M("Ana Jiménez Ruiz", "Luis Jiménez Ruiz") === false);
  t("distinto: Ana/Eva", M("Ana Jiménez Ruiz", "Eva Jiménez Ruiz") === false);
  t("distinto: Luis/Luisa", M("Luis Jiménez Ruiz", "Luisa Jiménez Ruiz") === false);
  t("distinto: madre e hija con un apellido común", M("Carmen Ruiz López", "Carmen Jiménez Ruiz") === false);
  t("distinto: tío y sobrino", M("Antonio Jiménez Soler", "Miguel Jiménez Soler") === false);
}

// ══ 15. Tipos nuevos: datos fiscales, capitulaciones, facturas, préstamos, arrendamiento, valores, plan de pensiones, sociedades ══
const NE = nif(50111222), NF = nif(50333444), NLU = nif(51555666), NDI = nif(51777888);
const DFIS = `Agencia Tributaria
DATOS FISCALES DEL EJERCICIO 2025
Impuesto sobre la Renta de las Personas Físicas
NIF: ${NE} Apellidos y nombre: MARTÍN ROJAS ELENA
CUENTAS BANCARIAS
Entidad Código IBAN Nº titulares Saldo a 31/12 Saldo medio 4.º trimestre
BANKINTER SA ES12 0128 0010 9101 2345 6789 1 24.380,15 23.910,02
FONDOS DE INVERSIÓN
Entidad gestora Denominación Nº participaciones Valor liquidativo Valoración
BANKINTER GESTIÓN DE ACTIVOS SGIIC BANKINTER RENTA FIJA CORTO PLAZO FI 1.512,4400 10,13 15.320,00
VALORES COTIZADOS
Entidad emisora ISIN Nº de valores Valoración a 31/12
IBERDROLA SA ES0144580Y14 1.500 20.100,00
BANCO SANTANDER SA ES0113900J37 3.000 15.900,00
INMUEBLES
Situación Referencia catastral Titularidad Uso Valor catastral
CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID (MADRID) 0847105VK4704F0012IA 100,00 % Vivienda habitual 165.000,00
CL ANCORA 7 Pl:02 Pt:C 28045 MADRID (MADRID) 1528302VK4712H0007TB 100,00 % Arrendamiento 98.500,00
POLIGONO 8 PARCELA 112 LA DEHESA 40080 ESPIRDO (SEGOVIA) 40080A008001120000JZ 100,00 % Rústico 3.215,40
RENDIMIENTOS DEL TRABAJO
Pagador INSS Pensión de jubilación 18.900,00`;
{
  const d = L.lecAnalizar(DFIS, "datos fiscales 2025.pdf");
  t("dfis tipo", d.tipo === "datosfiscales", d.tipo);
  t("dfis nif", campo(d, "nifCausante")?.valor === NE, campo(d, "nifCausante"));
  t("dfis nombre (apellidos y nombre)", campo(d, "nombre")?.valor === "Elena Martín Rojas", campo(d, "nombre"));
  const cu = d.bienes.filter((b) => b.tipo === "cuenta");
  t("dfis cuenta saldo 31/12 con prioridad baja", cu.length === 1 && cu[0].valor === 24380.15 && cu[0].iban === "ES1201280010910123456789" && cu[0].prioValor === 1 && cu[0].entidad === "Bankinter", cu);
  const va = d.bienes.filter((b) => b.tipo === "valores");
  t("dfis fondo + 2 acciones", va.length === 3 && va[0].valor === 15320 && /Corto Plazo/i.test(va[0].descripcion) && va.find((b) => b.isin === "ES0144580Y14")?.valor === 20100 && /1\.500 acciones de Iberdrola/.test(va.find((b) => b.isin === "ES0144580Y14").descripcion), va.map((b) => [b.descripcion, b.valor, b.isin]));
  const inm = d.bienes.filter((b) => b.tipo === "inmueble" || b.tipo === "vivienda");
  t("dfis 3 inmuebles con ref y VC", inm.length === 3 && inm[0].refCatastral === "0847105VK4704F0012IA" && inm[0].valorCatastralTotal === 165000 && inm[0].tipo === "vivienda" && inm[0].muniNombre === "Madrid", inm.map((b) => [b.refCatastral, b.valorCatastralTotal, b.tipo, b.muniNombre]));
  t("dfis arrendado y rústico", inm[1].arrendadoOCedido === true && inm[2].rustico === true, inm.map((b) => [b.arrendadoOCedido, b.rustico]));
  t("dfis no confunde la pensión con un bien", d.bienes.length === 7, d.bienes.length);
  t("dfis aviso 31/12", d.avisos.some((a) => /31\/12\/2025/.test(a)), d.avisos);
}
const CAPIT = `NÚMERO CUATROCIENTOS DOCE. ESCRITURA DE CAPITULACIONES MATRIMONIALES. En Madrid, a diez de febrero de mil novecientos noventa y dos. Ante mí, ALBERTO SANZ PRIETO, Notario del Ilustre Colegio de Madrid, COMPARECEN: DON FERNANDO ORTEGA GIL, mayor de edad, con D.N.I. ${NF}, y DOÑA ELENA MARTÍN ROJAS, mayor de edad, con D.N.I. ${NE}, casados entre sí en Madrid el 23 de septiembre de 1978, en régimen legal de gananciales. OTORGAN: PRIMERA.- Los comparecientes acuerdan sustituir su régimen económico matrimonial de gananciales por el de separación de bienes, regulado en los artículos 1435 y siguientes del Código Civil. SEGUNDA.- Disuelven y liquidan la sociedad de gananciales, adjudicándose los bienes según el inventario que se protocoliza. TERCERA.- Solicitan la indicación de esta escritura en el Registro Civil.`;
{
  const d = L.lecAnalizar(CAPIT, "capitulaciones 1992.pdf");
  t("capit tipo", d.tipo === "capitulaciones", d.tipo);
  t("capit separación que manda", campo(d, "civil")?.valor === "separacion" && campo(d, "civil").manda === true && campo(d, "civil").conf === 2 && /Alberto Sanz Prieto/.test(campo(d, "civil").mostrar), campo(d, "civil"));
  t("capit cónyuges (no el notario)", d.personas.length === 2 && d.personas.every((p) => p.pareja) && d.personas[0].nombre === "Fernando Ortega Gil", d.personas);
  t("capit liquidación avisada", d.avisos.some((a) => /liquidan la sociedad/.test(a)), d.avisos);
  t("capit fecha", campo(d, "exp.capitulacionesFecha")?.valor === "1992-02-10", campo(d, "exp.capitulacionesFecha"));
}
// Certificado literal de matrimonio con nota marginal de capitulaciones: manda la separación aunque la inscripción diga gananciales
const MATRI2 = `REGISTRO CIVIL DE MADRID · Sección 2.ª · Tomo 512 · Página 77
CERTIFICACIÓN LITERAL DE INSCRIPCIÓN DE MATRIMONIO
Contrayente 1: DON FERNANDO ORTEGA GIL, hijo de Luis y de Rosa, nacido en Madrid el 2 de noviembre de 1949.
Contrayente 2: DOÑA ELENA MARTÍN ROJAS, hija de Pedro y de Ana, nacida en Segovia el 8 de mayo de 1951.
Celebrado el día 23 de septiembre de 1978 en la parroquia de San Jerónimo el Real de Madrid. Forma canónica.
Régimen económico: gananciales.
INSCRIPCIONES MARGINALES: Por escritura otorgada ante el Notario de Madrid don Alberto Sanz Prieto el día 10 de febrero de 1992, número 412 de protocolo, los cónyuges han pactado el régimen de separación de bienes. Madrid, 3 de marzo de 1992.`;
{
  const d = L.lecAnalizar(MATRI2, "certificado matrimonio.pdf");
  t("matri2 tipo", d.tipo === "matrimonio", d.tipo);
  t("matri2 dos contrayentes", d.personas.filter((p) => p.pareja).length === 2 && d.personas.find((p) => p.nombre === "Elena Martín Rojas")?.nacimiento === "1951-05-08", d.personas);
  t("matri2 separación por nota marginal (manda)", campo(d, "civil")?.valor === "separacion" && campo(d, "civil").manda === true, campo(d, "civil"));
  t("matri2 fecha de celebración", campo(d, "matrimonioFecha")?.valor === "1978-09-23", campo(d, "matrimonioFecha"));
}
// Certificación literal de nacimiento (texto corrido): filiación
const NACI2 = `REGISTRO CIVIL DE MADRID. Sección 1.ª Tomo 1.204 Página 33. CERTIFICACIÓN LITERAL DE INSCRIPCIÓN DE NACIMIENTO. Inscripción de nacimiento de DON DIEGO ORTEGA MARTÍN, varón, nacido en Madrid el día treinta de octubre de mil novecientos ochenta y tres, a las once horas, hijo de Don FERNANDO ORTEGA GIL y de Doña ELENA MARTÍN ROJAS, de nacionalidad española.`;
{
  const d = L.lecAnalizar(NACI2, "nacimiento diego.pdf");
  t("naci2 tipo", d.tipo === "nacimiento", d.tipo);
  const ins = d.personas.find((p) => p.inscrito);
  t("naci2 inscrito con fecha en letras", ins?.nombre === "Diego Ortega Martín" && ins.nacimiento === "1983-10-30", d.personas);
  t("naci2 padres", d.personas.filter((p) => p.progenitor).map((p) => p.nombre).join("|") === "Fernando Ortega Gil|Elena Martín Rojas", d.personas);
  // Propuestas: con la causante conocida, el inscrito es hijo
  const x = { id: "xn", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} };
  const P = L.lecPropuestas(x, [{ nombre: "n.pdf", tipo: d.tipo, titulo: d.titulo, texto: NACI2, datos: d }]).propuestas;
  t("naci2 propuestas: Diego hijo/a", P.some((p) => p.etiqueta === "Hijo/a" && /Diego Ortega Martín/.test(p.mostrar) && p.on), P.map((p) => [p.etiqueta, p.mostrar]));
}
// Régimen: capitulaciones mandan sobre el «casado» del certificado de defunción aunque se lean después
{
  const DEFE = `REGISTRO CIVIL DE MADRID · CERTIFICADO DE INSCRIPCIÓN DE DEFUNCIÓN
Nombre: ELENA Primer apellido: MARTÍN Segundo apellido: ROJAS DNI: ${NE} Sexo: Mujer
Estado civil: Casada
Fecha de defunción: 15/03/2026 Hora: 04:10
Lugar de defunción: Madrid Provincia: Madrid`;
  const x = { id: "xr", nombre: "", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["defuncion.pdf", DEFE], ["matrimonio.pdf", MATRI2], ["capitulaciones.pdf", CAPIT]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  const P = L.lecPropuestas(x, R).propuestas; const civ = P.filter((p) => p.k === "civil");
  t("régimen: la separación marcada, el «casado» sin marcar", civ.find((p) => p.valor === "separacion")?.on === true && civ.find((p) => p.valor === "separacion").conf === 2 && civ.filter((p) => p.valor === "gananciales").every((p) => !p.on), civ.map((p) => [p.valor, p.conf, p.on, p.etiqueta]));
  t("régimen: Fernando cónyuge", P.some((p) => p.etiqueta === "Cónyuge" && /Fernando Ortega Gil/.test(p.mostrar)), P.filter((p) => p.grupo === "Personas").map((p) => [p.etiqueta, p.mostrar]));
  L.LEC.resultado = { docs: R, propuestas: P }; const n = L.lecAplicar(x, P.filter((p) => p.on).map((p) => p.id));
  t("régimen aplicado: separación", x.civil === "separacion", x.civil);
  t("documentos leídos quedan recibidos en la lista", x.despacho?.docs?.defuncion === true && x.despacho.docs.matrimonio === true && !x.despacho.docs.ultimas, x.despacho);
}
// Factura de clínica (última enfermedad) y de residencia (no deducible el alojamiento) y factura pagada por el seguro de decesos
{
  const CLI = `CLÍNICA SANTA BRÍGIDA, S.L. · CIF B29111119 · Calle del Prado 4, Madrid
FACTURA Nº CSB-2026-0311 Fecha de factura: 16/03/2026
Paciente: ELENA MARTÍN ROJAS · Cliente: DOÑA LUCÍA ORTEGA MARTÍN
Concepto: Hospitalización en unidad de cuidados paliativos del 2 al 15 de marzo de 2026 · Honorarios médicos
Base imponible 2.860,50 € · Exento de IVA (art. 20.Uno.2.º LIVA) · Total factura 2.860,50 € · Pagado con tarjeta`;
  const d = L.lecAnalizar(CLI, "factura clinica.pdf");
  t("clínica tipo", d.tipo === "factura", d.tipo);
  t("clínica gasto de última enfermedad", d.gastos[0]?.etiqueta === "Gasto de última enfermedad" && d.gastos[0].importe === 2860.5 && d.gastos[0].conf === 1 && /Clínica Santa Brígida, S\.L\./.test(d.gastos[0].concepto) && /Lucía Ortega Martín/.test(d.gastos[0].nota), d.gastos);
  const RES = `RESIDENCIA DE MAYORES LOS OLIVOS, S.L. · FACTURA 2026/03-118 · Fecha: 31/03/2026 · Residente: Elena Martín Rojas · Estancia mensual en plaza residencial marzo 2026 · Total 2.150,00 €`;
  const r = L.lecAnalizar(RES, "factura residencia.pdf");
  t("residencia: gasto sin marcar", r.tipo === "factura" && r.gastos[0]?.conf === 0 && r.avisos.some((a) => /alojamiento/.test(a)), [r.tipo, r.gastos, r.avisos]);
  const DEC = `FUNERARIA SAN ISIDRO LABRADOR, S.L. · FACTURA Nº 2026/1022 · Fecha 17/03/2026 · Servicio funerario e inhumación de Dña. Elena Martín Rojas · Servicio a cargo de la póliza de decesos de Ocaso nº 55-1234 · Total factura 4.235,00 €`;
  const f = L.lecAnalizar(DEC, "factura.pdf");
  t("decesos: gasto sin marcar", f.tipo === "factura" && f.gastos[0]?.conf === 0 && f.gastos[0].importe === 4235 && f.avisos.some((a) => /seguro de decesos/.test(a)), [f.tipo, f.gastos]);
  t("factura sin funeral ni enfermedad → desconocido", L.lecAnalizar("FACTURA Nº 12 · Suministro eléctrico · Total factura 84,20 € · IVA 21 %", "factura luz.pdf").tipo === "desconocido", 0);
}
// Préstamo: certificado de deuda pendiente y escritura (la escritura queda sin marcar si el banco certifica el saldo)
const PRES_CERT = `BANKINTER, S.A. · Servicio de Testamentarías
CERTIFICADO DE DEUDA PENDIENTE
BANKINTER, S.A. CERTIFICA que el préstamo hipotecario número 0128-0010-55-1234567, cuya prestataria es DOÑA ELENA MARTÍN ROJAS, con NIF ${NE}, presentaba a fecha 15/03/2026 (fecha del fallecimiento) un capital pendiente de amortizar de 48.213,77 euros. Intereses devengados y no vencidos: 61,20 euros. Garantía: hipoteca sobre la finca de calle Áncora 7, 2.º C, Madrid.`;
const PRES_ESC = `NÚMERO DOS MIL CUARENTA. ESCRITURA DE PRÉSTAMO CON GARANTÍA HIPOTECARIA. En Madrid, a tres de noviembre de dos mil ocho. Ante mí, PILAR NAVARRO CUESTA, Notaria del Ilustre Colegio de Madrid, COMPARECEN: de una parte, BANKINTER, S.A., como entidad prestamista; y de otra, como prestataria, DOÑA ELENA MARTÍN ROJAS. ESTIPULACIONES: PRIMERA.- Bankinter concede a la prestataria un préstamo por importe de CIENTO CINCUENTA MIL EUROS (150.000,00 €), que se amortizará en 300 cuotas mensuales. Tipo de interés: Euríbor más 0,90 puntos.`;
{
  const c = L.lecAnalizar(PRES_CERT, "certificado deuda bankinter.pdf");
  t("préstamo cert tipo", c.tipo === "prestamo", c.tipo);
  t("préstamo cert deuda", c.deudas[0]?.importe === 48213.77 && c.deudas[0].fuente === "banco" && c.deudas[0].hipoteca === true && c.deudas[0].banco === "Bankinter" && c.deudas[0].conf === 2 && !c.deudas[0].ganancial, c.deudas);
  const e = L.lecAnalizar(PRES_ESC, "escritura prestamo 2008.pdf");
  t("préstamo escritura tipo", e.tipo === "prestamo", e.tipo);
  t("préstamo escritura principal sin marcar", e.deudas[0]?.importe === 150000 && e.deudas[0].fuente === "escritura" && e.deudas[0].conf === 0, e.deudas);
  const x = { id: "xp", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["escritura.pdf", PRES_ESC], ["cert.pdf", PRES_CERT]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  const D = L.lecPropuestas(x, R).propuestas.filter((p) => p.k === "deuda");
  t("préstamo: solo el saldo del banco marcado", D.length === 2 && D.filter((p) => p.on).length === 1 && D.find((p) => p.on).deuda.importe === 48213.77, D.map((p) => [p.etiqueta, p.on]));
}
// Contrato de arrendamiento (texto de Word): se asocia al inmueble por la dirección o la referencia catastral
const ARR = `CONTRATO DE ARRENDAMIENTO DE VIVIENDA
En Madrid, a 1 de septiembre de 2022.
REUNIDOS
De una parte, como ARRENDADORA, DOÑA ELENA MARTÍN ROJAS, mayor de edad, con DNI ${NE}.
De otra parte, como ARRENDATARIO, DON MARIO VEGA LUNA, mayor de edad, con DNI ${nif(52000999)}.
EXPONEN
I.- Que la arrendadora es propietaria de la vivienda sita en calle Áncora número 7, planta 2.ª, puerta C, 28045 Madrid, con referencia catastral 1528302VK4712H0007TB.
CLÁUSULAS
PRIMERA.- Duración. La duración del contrato es de cinco años.
SEGUNDA.- Renta. La renta mensual es de NOVECIENTOS CINCUENTA EUROS (950,00 €), pagadera por meses anticipados.
TERCERA.- Fianza. El arrendatario entrega en este acto la fianza legal de una mensualidad, NOVECIENTOS CINCUENTA EUROS (950,00 €), que se depositará en la Agencia de Vivienda Social de la Comunidad de Madrid.
Este contrato se rige por la Ley 29/1994, de Arrendamientos Urbanos.`;
{
  const d = L.lecAnalizar(ARR, "contrato alquiler ancora.docx");
  t("arr tipo", d.tipo === "arrendamiento", d.tipo);
  const v = campo(d, "arrendamiento")?.valor;
  t("arr datos", v && v.arrendatario === "Mario Vega Luna" && v.arrendador === "Elena Martín Rojas" && v.renta === 950 && v.fianza === 950 && v.refCatastral === "1528302VK4712H0007TB" && v.fecha === "2022-09-01" && /Áncora/i.test(v.direccion), v);
  const x = { id: "xa", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["df.pdf", DFIS], ["arr.docx", ARR]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  const P = L.lecPropuestas(x, R).propuestas; const a = P.find((p) => p.k === "arrendamiento");
  t("arr asociado al inmueble y marcado", a && a.on && /Ancora|Áncora/i.test(a.mostrar), a);
  L.LEC.resultado = { docs: R, propuestas: P }; L.lecAplicar(x, P.filter((p) => p.on).map((p) => p.id));
  const b = x.bienes.find((b) => b.refCatastral === "1528302VK4712H0007TB");
  t("arr aplicado: arrendado, no vivienda habitual, contrato anotado", b && b.arrendadoOCedido === true && b.tipo === "inmueble" && b.arrendamiento?.renta === 950, b);
  t("arr aplicado: una sola vivienda habitual (Almagro)", x.bienes.filter((b) => b.tipo === "vivienda").length === 1 && x.bienes.find((b) => b.tipo === "vivienda").refCatastral === "0847105VK4704F0012IA", x.bienes.map((b) => [b.tipo, b.refCatastral]));
  // El causante como inquilino: no hay inmueble que añadir
  const inq = L.lecAnalizar(ARR.replace("como ARRENDADORA, DOÑA ELENA MARTÍN ROJAS", "como ARRENDADORA, DOÑA ROSA PÉREZ SANZ").replace("como ARRENDATARIO, DON MARIO VEGA LUNA", "como ARRENDATARIA, DOÑA ELENA MARTÍN ROJAS"), "alquiler.pdf");
  const P2 = L.lecPropuestas({ id: "xi", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} }, [{ nombre: "alquiler.pdf", tipo: inq.tipo, titulo: inq.titulo, texto: "", datos: inq }]).propuestas;
  t("arr causante inquilina → aviso de subrogación", P2.some((p) => /vivía de alquiler/.test(p.etiqueta) && /art\. 16 LAU/.test(p.mostrar)), P2.map((p) => p.etiqueta));
}
// Certificado de valores: manda sobre la valoración a 31/12 de los datos fiscales (mismo ISIN)
const VAL = `RENTA 4 BANCO, S.A.
CERTIFICADO DE POSICIÓN DE VALORES
RENTA 4 BANCO, S.A. CERTIFICA que DOÑA ELENA MARTÍN ROJAS, con NIF ${NE}, era titular a fecha 15/03/2026 (fecha de fallecimiento) de los siguientes valores depositados en la cuenta de valores nº 4401-223344:
Valor ISIN Nº títulos Cotización Valoración (EUR)
IBERDROLA SA ES0144580Y14 1.500 14,85 22.275,00
BANCO SANTANDER SA ES0113900J37 3.000 6,12 18.360,00
Total valoración 40.635,00`;
{
  const d = L.lecAnalizar(VAL, "certificado valores renta4.pdf");
  t("val tipo", d.tipo === "valores", d.tipo);
  t("val 2 valores con ISIN y valoración", d.bienes.length === 2 && d.bienes[0].isin === "ES0144580Y14" && d.bienes[0].valor === 22275 && d.bienes[0].prioValor === 3 && /1\.500 acciones de Iberdrola/.test(d.bienes[0].descripcion) && d.bienes[1].valor === 18360, d.bienes.map((b) => [b.descripcion, b.valor]));
  const x = { id: "xv", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} };
  const R = [["df.pdf", DFIS], ["val.pdf", VAL]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  const P = L.lecPropuestas(x, R).propuestas.filter((p) => p.grupo === "Cuentas y valores");
  const ib = P.filter((p) => /ES0144580Y14/.test(p.mostrar));
  t("val fusión por ISIN: una vez con el valor del certificado", ib.length === 1 && /22275 €/.test(ib[0].mostrar) && /\+/.test(ib[0].doc), P.map((p) => p.mostrar));
}
// Plan de pensiones: informativo, no es herencia (IRPF del beneficiario)
const PLAN = `BANKINTER PENSIONES, S.A., E.G.F.P.
CERTIFICADO DE DERECHOS CONSOLIDADOS
Plan de pensiones: BANKINTER AHORRO ACTIVOS PP (N.º DGSFP N-1234)
Partícipe: ELENA MARTÍN ROJAS · NIF ${NE}
Derechos consolidados a fecha 15/03/2026: 31.540,20 €
Beneficiarios designados en caso de fallecimiento: sus hijos, DOÑA LUCÍA ORTEGA MARTÍN y DON DIEGO ORTEGA MARTÍN, por partes iguales.`;
{
  const d = L.lecAnalizar(PLAN, "plan pensiones.pdf");
  t("plan tipo", d.tipo === "planpensiones", d.tipo);
  const c = campo(d, "planPensiones");
  t("plan datos", c?.valor.importe === 31540.2 && /Bankinter Ahorro Activos/i.test(c.valor.plan) && c.valor.fecha === "2026-03-15" && /Lucía Ortega Martín/.test(c.valor.beneficiarios) && c.conf === 2, c);
  t("plan sin bienes y aviso IRPF", d.bienes.length === 0 && d.avisos.some((a) => /IRPF/.test(a) && /no en el Impuesto de Sucesiones/.test(a)), d.avisos);
  const x = { id: "xpp", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} };
  const P = L.lecPropuestas(x, [{ nombre: "plan.pdf", tipo: d.tipo, titulo: d.titulo, texto: PLAN, datos: d }]).propuestas;
  L.LEC.resultado = { docs: [{ nombre: "plan.pdf", tipo: d.tipo, titulo: d.titulo, datos: d }], propuestas: P }; L.lecAplicar(x, P.filter((p) => p.on).map((p) => p.id));
  t("plan aplicado como información", x.planesPensiones?.length === 1 && x.bienes.length === 0, x.planesPensiones);
}
// Participaciones sociales (libro registro de socios): la parte del causante y su valor teórico
const SOC = `ORTEGA MARTÍN CONSULTORES, S.L. · NIF B87654323 · Inscrita en el Registro Mercantil de Madrid, tomo 12.345, folio 67, hoja M-123456
CERTIFICACIÓN DEL LIBRO REGISTRO DE SOCIOS
DON FERNANDO ORTEGA GIL, administrador único, CERTIFICA: Que según el Libro Registro de Socios, a fecha 15/03/2026 el capital social de 3.000,00 €, dividido en 3.000 participaciones sociales de 1,00 € de valor nominal, pertenece a:
DOÑA ELENA MARTÍN ROJAS, NIF ${NE}: 1.500 participaciones (números 1 a 1.500), 50,00 %
DON FERNANDO ORTEGA GIL, NIF ${NF}: 1.500 participaciones (números 1.501 a 3.000), 50,00 %
Patrimonio neto según el último balance aprobado (ejercicio 2025): 184.300,00 €`;
{
  const d = L.lecAnalizar(SOC, "libro socios.pdf");
  t("soc tipo", d.tipo === "sociedad", d.tipo);
  const b = d.bienes[0];
  t("soc sociedad y socios", b?.tipo === "empresa" && b.nifSociedad === "B87654323" && /Ortega Martín Consultores, S\.L\./.test(b.descripcion) && b.socios.length === 2 && b.socios[0].pct === 50 && b.socios[0].titulos === 1500 && b.patrimonioNeto === 184300, b);
  t("soc aviso empresa familiar", d.avisos.some((a) => /20\.2\.c LISD/.test(a)), d.avisos);
  const x = { id: "xs", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} };
  const P = L.lecPropuestas(x, [{ nombre: "s.pdf", tipo: d.tipo, titulo: d.titulo, texto: SOC, datos: d }]).propuestas.filter((p) => p.grupo === "Empresas y participaciones");
  t("soc propuesta: 50 % y valor teórico", P.length === 1 && P[0].on && /1\.500 participaciones/.test(P[0].mostrar) && /50 %/.test(P[0].mostrar) && /92150 €/.test(P[0].mostrar), P.map((p) => p.mostrar));
  t("ltCifOk", L.lecAnalizar && vm.runInContext("ltCifOk('B87654323') && !ltCifOk('B87654324')", ctx) === true, 0);
}
// Catastro: valor de referencia (certificación y certificado propio) y finca rústica
const CAT_VR = `Ministerio de Hacienda · Dirección General del Catastro
CERTIFICACIÓN CATASTRAL DESCRIPTIVA Y GRÁFICA
Referencia catastral del inmueble 0847105VK4704F0012IA
Localización CL ALMAGRO 20 Es:1 Pl:04 Pt:B
28010 MADRID (MADRID)
Clase Urbano Uso principal Residencial Superficie construida 142 m2 Año construcción 1962
Valor catastral 165.000,00 € Valor catastral del suelo 98.000,00 € Valor catastral de la construcción 67.000,00 €
Valor de referencia (2026) 412.300,00 €`;
const CERT_VR = `SEDE ELECTRÓNICA DEL CATASTRO
CERTIFICADO DE VALOR DE REFERENCIA
Referencia catastral: 9876543UF6597N0012GR
Localización: AV DE LOS MANANTIALES 5 -1 12 29620 TORREMOLINOS (MÁLAGA)
Fecha de referencia: 01/01/2026
Valor de referencia del inmueble: 21.300,00 €
El valor de referencia se determina conforme a la disposición final tercera de la Ley 11/2021.`;
const RUST = `MINISTERIO DE HACIENDA · DIRECCIÓN GENERAL DEL CATASTRO
CERTIFICACIÓN CATASTRAL DESCRIPTIVA Y GRÁFICA
BIEN INMUEBLE DE NATURALEZA RÚSTICA
Referencia catastral 40080A008001120000JZ
Localización Polígono 8 Parcela 112 LA DEHESA. ESPIRDO (SEGOVIA)
Clase Rústico Uso principal Agrario Superficie gráfica 2,4500 ha
Cultivo / aprovechamiento: a C- Labor o labradío secano 02 1,9000 ha · b E- Pastos 00 0,5500 ha
Valor catastral 3.215,40 € Valor catastral del suelo 3.215,40 € Valor catastral de la construcción 0,00 €
Valor de referencia (2026) 9.870,00 €
Titularidad MARTÍN ROJAS ELENA ${NE} 100,00 % de propiedad`;
{
  const a = L.lecAnalizar(CAT_VR, "catastro almagro.pdf"); const b = a.bienes[0];
  t("vr certificación: valor de referencia como valor", b?.valorReferencia === 412300 && b.valor === 412300 && b.anioValorReferencia === 2026 && b.valorCatastralSuelo === 98000 && b.prioValor === 3, b);
  t("vr aviso del año", a.avisos.some((q) => /fallecimientos de 2026/.test(q)), a.avisos);
  const c = L.lecAnalizar(CERT_VR, "valor referencia garaje.pdf"); const g = c.bienes[0];
  t("vr certificado propio: tipo catastro", c.tipo === "catastro", c.tipo);
  t("vr certificado propio: valor y año (fecha de referencia)", g?.valorReferencia === 21300 && g.refCatastral === "9876543UF6597N0012GR" && g.anioValorReferencia === 2026 && g.muniNombre === "Torremolinos", g);
  t("vr no lee el número de la ley como valor", !/11/.test(String(g?.valor).slice(0, 2)) || g.valor === 21300, g?.valor);
  const sin = L.lecAnalizar(CAT, "catastro sin vr.pdf");
  t("sin vr: valor vacío y aviso claro", !sin.bienes[0].valor && sin.avisos.some((q) => /queda VACÍO/.test(q)), sin.avisos);
  const no = L.lecAnalizar(CAT_VR.replace("Valor de referencia (2026) 412.300,00 €", "Valor de referencia: no disponible"), "x.pdf");
  t("vr «no disponible»: vacío y aviso de valor de mercado", !no.bienes[0].valor && no.avisos.some((q) => /no tiene valor de referencia/.test(q)), no.avisos);
  const r = L.lecAnalizar(RUST, "catastro rustica.pdf"); const f = r.bienes[0];
  t("rústica tipo", r.tipo === "catastro", r.tipo);
  t("rústica: polígono, parcela, paraje, municipio, superficie", f?.rustico === true && f.poligono === "8" && f.parcela === "112" && /paraje La Dehesa/.test(f.descripcion) && f.muniNombre === "Espirdo" && f.muniProv === "Segovia" && f.superficie === 24500 && /labor o labradío secano/.test(f.descripcion), f);
  t("rústica: sin suelo para la plusvalía y con aviso", !f.valorCatastralSuelo && f.valorCatastralSueloRustico === 3215.4 && f.valorCatastralTotal === 3215.4 && r.avisos.some((q) => /no sujeto a la plusvalía/.test(q)), [f.valorCatastralSuelo, r.avisos]);
  t("rústica: valor de referencia", f.valor === 9870, f.valor);
  // Propuestas: el aviso «sin valor de referencia» del IBI desaparece si otro documento lo trae para la misma referencia
  const IBI1 = `AYUNTAMIENTO DE TORREMOLINOS · IMPUESTO SOBRE BIENES INMUEBLES · RECIBO 2026
Referencia catastral 9876543UF6597N0012GR Situación AV DE LOS MANANTIALES 5 -1 12 29620 TORREMOLINOS (MÁLAGA)
Valor catastral suelo 8.000,00 Valor catastral construcción 10.000,00 Valor catastral 18.000,00 Uso Aparcamiento`;
  const R = [["ibi.pdf", IBI1], ["vr.pdf", CERT_VR]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  t("vr: el IBI avisa de que falta", R[0].datos.avisos.some((q) => /queda VACÍO/.test(q)), R[0].datos.avisos);
  const P = L.lecPropuestas({ id: "xg", personas: [], bienes: [], deudas: [], situ: {} }, R).propuestas;
  t("vr: fusión IBI + certificado → un garaje con valor y sin aviso", P.filter((p) => /9876543UF6597N0012GR/.test(p.mostrar)).length === 1 && /valor de referencia 21300/.test(P.find((p) => /9876543UF6597N0012GR/.test(p.mostrar)).mostrar) && !R[0].datos.avisos.some((q) => /queda VACÍO/.test(q)) && !P.some((p) => p.grupo === "Falta por completar"), P.map((p) => [p.grupo, p.mostrar]));
}
// Nota simple: fecha de adquisición por compraventa; en herencia, aviso (art. 989 CC)
{
  const NS = `REGISTRO DE LA PROPIEDAD DE MADRID N.º 28 · NOTA SIMPLE INFORMATIVA
FINCA DE MADRID Nº 4455 · CRU 28112000044553
URBANA: VIVIENDA letra B en planta cuarta de la casa en calle Almagro número veinte de Madrid. Superficie construida de ciento cuarenta y dos metros cuadrados. Referencia catastral 0847105VK4704F0012IA.
TITULARIDAD: DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${NE}, casada en régimen de separación de bienes, titular del pleno dominio de la totalidad de esta finca con carácter privativo, por título de compraventa, en escritura autorizada el 14/06/1995 por el notario de Madrid don Juan Gómez Ruiz.
CARGAS: Libre de cargas.`;
  const d = L.lecAnalizar(NS, "nota almagro.pdf");
  t("nota: fecha de adquisición por compraventa", d.bienes[0]?.fechaAdq === "1995-06-14" && d.bienes[0].tituloAdq === "compraventa", d.bienes[0]);
  const h = L.lecAnalizar(NS.replace("por título de compraventa", "por título de herencia de sus padres"), "nota.pdf");
  t("nota: herencia → sin fecha y aviso", !h.bienes[0].fechaAdq && h.avisos.some((a) => /989 CC/.test(a)), h.avisos);
}
// Varias fincas en una nota simple (tres, con una rústica) → un bien por finca
{
  const N3 = `REGISTRO DE LA PROPIEDAD DE MADRID N.º 28 · NOTA SIMPLE INFORMATIVA
FINCA DE MADRID Nº 4455 CRU 28112000044553
URBANA: VIVIENDA letra B en planta cuarta de la casa en calle Almagro número veinte de Madrid. Referencia catastral 0847105VK4704F0012IA.
TITULARIDAD: DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${NE}, titular del pleno dominio de la totalidad con carácter privativo, por título de compraventa en escritura autorizada el 14/06/1995.
CARGAS: Libre de cargas. ${"Texto de relleno de la nota simple. ".repeat(6)}
FINCA DE MADRID Nº 7788 CRU 28112000077889
URBANA: VIVIENDA letra C en planta segunda de la casa en calle Áncora número siete de Madrid. Referencia catastral 1528302VK4712H0007TB.
TITULARIDAD: DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${NE}, titular del pleno dominio de la totalidad con carácter privativo, por título de compraventa en escritura autorizada el 03/11/2008.
CARGAS: HIPOTECA a favor de BANKINTER, S.A., en garantía de un préstamo de un principal de 150.000,00 euros. ${"Texto de relleno de la nota simple. ".repeat(6)}
FINCA DE ESPIRDO Nº 1203 CRU 40015000012031
RÚSTICA: Tierra de labor al sitio de La Dehesa, término de Espirdo, de dos hectáreas y cuarenta y cinco áreas. Polígono 8, parcela 112. Referencia catastral 40080A008001120000JZ.
TITULARIDAD: DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${NE}, titular del pleno dominio de la totalidad con carácter privativo, por título de herencia de sus padres.
CARGAS: No constan cargas.`;
  const d = L.lecAnalizar(N3, "nota simple tres fincas.pdf");
  t("nota 3 fincas: tres bienes", d.bienes.length === 3 && d.bienes.map((b) => b.refCatastral).join(",") === "0847105VK4704F0012IA,1528302VK4712H0007TB,40080A008001120000JZ", d.bienes.map((b) => b.refCatastral));
  t("nota 3 fincas: rústica marcada y fecha de la segunda", d.bienes[2].rustico === true && d.bienes[1].fechaAdq === "2008-11-03", d.bienes.map((b) => [b.rustico, b.fechaAdq]));
  t("nota 3 fincas: hipoteca de la segunda", d.deudas.length === 1 && d.deudas[0].importe === 150000, d.deudas);
}
// Empate de huellas: decide el nombre del archivo y se avisa
{
  const amb = "REGISTRO CIVIL. CERTIFICA. FALLECIDO. INSCRIPCION. DEFUNCION. HEREDEROS AB INTESTATO";
  const info = vm.runInContext("lecTipoInfo", ctx)(amb, "acta herederos.pdf");
  t("empate detectado", Array.isArray(info.empate) && info.empate.length >= 2 ? info.porNombre === true && info.tipo === "herederos" : true, info);
  const T2 = vm.runInContext(`(() => { const H = LEC_HUELLAS; const viejo = { a: H.defuncion, b: H.herederos }; H.defuncion = [[/ZZEMPATE/, 3]]; H.herederos = [[/ZZEMPATE/, 3]]; const r1 = lecTipoInfo("ZZEMPATE", "certificado defuncion.pdf"), r2 = lecTipoInfo("ZZEMPATE", "documento.pdf"); const d = lecAnalizar("ZZEMPATE", "certificado defuncion.pdf"); H.defuncion = viejo.a; H.herederos = viejo.b; return [r1, r2, d.avisos[0]]; })()`, ctx);
  t("empate: el nombre del archivo decide", T2[0].tipo === "defuncion" && T2[0].porNombre === true && T2[1].tipo === "herederos" && T2[1].porNombre === false, T2);
  t("empate: aviso", /encaja por igual/.test(T2[2]) && /nombre del archivo/.test(T2[2]), T2[2]);
}
// Word (.docx) sin librerías: zip + DecompressionStream
{
  const { deflateRawSync } = await import("node:zlib");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>CONTRATO DE ARRENDAMIENTO DE VIVIENDA</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Renta: 950,00 € &amp; fianza</w:t></w:r><w:r><w:tab/><w:t>Áncora</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Arrendatario</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>DON MARIO VEGA LUNA</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`;
  const zip = (entradas) => { const partes = [], central = []; let off = 0; for (const [nombre, datos, metodo] of entradas) { const n = Buffer.from(nombre); const comp = metodo === 8 ? deflateRawSync(datos) : datos; const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(metodo, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(datos.length, 22); lh.writeUInt16LE(n.length, 26); partes.push(lh, n, comp); const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(metodo, 10); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(datos.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42); central.push(ch, n); off += 30 + n.length + comp.length; } const cd = Buffer.concat(central); const fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16); return new Uint8Array(Buffer.concat([...partes, cd, fin])); };
  const bytes = zip([["[Content_Types].xml", Buffer.from("<Types/>"), 0], ["word/document.xml", Buffer.from(xml), 8]]);
  const leido = await vm.runInContext("lecZipEntrada", ctx)(bytes, "word/document.xml");
  t("docx: zip deflate leído", leido === xml, leido && leido.slice(0, 80));
  const texto = vm.runInContext("lecDocxTexto", ctx)(leido);
  t("docx: texto con párrafos, entidades y celdas en la misma línea", /^CONTRATO DE ARRENDAMIENTO DE VIVIENDA\nRenta: 950,00 € & fianza Áncora\nArrendatario DON MARIO VEGA LUNA$/.test(texto), texto);
  const file = { name: "contrato.docx", type: "", arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  const r = await vm.runInContext("lecTexto", ctx)(file);
  t("docx: lecTexto", r && r.formato === "Word" && /MARIO VEGA LUNA/.test(r.texto), r);
  const latin = new Uint8Array([0x52, 0x45, 0x47, 0x49, 0x53, 0x54, 0x52, 0x4f, 0x20, 0x43, 0x49, 0x56, 0x49, 0x4c, 0x20, 0x44, 0x45, 0x20, 0x4d, 0xc1, 0x4c, 0x41, 0x47, 0x41]);
  t("txt: Windows-1252 se decodifica", vm.runInContext("lecDecodificar", ctx)(latin) === "REGISTRO CIVIL DE MÁLAGA", vm.runInContext("lecDecodificar", ctx)(latin));
  // 0x80-0x9F de Windows-1252 (€, comillas, rayas): no dependen del TextDecoder del entorno (Node 22.22 lo trata como Latin-1)
  const w1252 = new Uint8Array([0x31, 0x2e, 0x32, 0x30, 0x30, 0x20, 0x80, 0x20, 0x93, 0x53, 0x8a, 0x94, 0x20, 0x96, 0x20, 0x8c]);
  t("txt: Windows-1252 con €, comillas, raya, Š y Œ", vm.runInContext("lecDecodificar", ctx)(w1252) === "1.200 € “SŠ” – Œ", vm.runInContext("lecDecodificar", ctx)(w1252));
  t("correo: charset iso-8859-1 se lee como Windows-1252", vm.runInContext("lecDecodificarCon", ctx)(new Uint8Array([0x80, 0x20, 0xe9]), "ISO-8859-1") === "€ é", 0);
  t("txt: UTF-8 con BOM", vm.runInContext("lecDecodificar", ctx)(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from("Málaga")])) === "Málaga", 0);
  t("lecLegible acepta docx y txt, no doc", vm.runInContext("[lecLegible({name:'a.docx',type:''}), lecLegible({name:'b.txt',type:''}), lecLegible({name:'c.doc',type:''})].join()", ctx) === "true,true,false", 0);
}
// Preprocesado de imágenes: estirado de contraste, umbral adaptativo e inclinación
{
  const W = 400, H = 300; const g = new Uint8Array(W * H).fill(150);
  // Texto sintético: filas de «tinta» horizontales giradas 4°, con poco contraste (120 sobre 150) y una sombra a la derecha
  const ang = 4 * Math.PI / 180;
  for (let fila = 40; fila < 260; fila += 22) for (let x = 30; x < 370; x++) { if ((x >> 3) % 3 === 2) continue; const y = Math.round(fila + (x - 200) * Math.tan(ang)); for (let k = 0; k < 4; k++) if (y + k >= 0 && y + k < H) g[(y + k) * W + x] = 120; }
  for (let y = 0; y < H; y++) for (let x = 300; x < W; x++) g[y * W + x] = Math.max(0, g[y * W + x] - 40);
  const est = vm.runInContext("lecEstirar", ctx)(g);
  t("estirar: amplía el rango", est.rango < 120 && Math.max(...est.g) === 255 && Math.min(...est.g) === 0, est.rango);
  const a = vm.runInContext("lecAnguloInclinacion", ctx)(vm.runInContext("lecUmbralAdaptativo", ctx)(est.g, W, H), W, H);
  t("inclinación ≈ 4°", Math.abs(a - 4) <= 0.6, a);
  const plano = new Uint8Array(W * H).fill(200); for (let fila = 40; fila < 260; fila += 22) for (let x = 30; x < 370; x++) for (let k = 0; k < 4; k++) plano[(fila + k) * W + x] = 20;
  t("inclinación de un texto recto = 0", Math.abs(vm.runInContext("lecAnguloInclinacion", ctx)(vm.runInContext("lecUmbralAdaptativo", ctx)(plano, W, H), W, H)) <= 0.2, 0);
  const b = vm.runInContext("lecUmbralAdaptativo", ctx)(g, W, H);
  const tinta = (x, y) => b[y * W + x] === 0;
  t("umbral adaptativo: tinta en zona de sombra y fondo blanco", tinta(320, Math.round(40 + (320 - 200) * Math.tan(ang)) + 1) && !tinta(320, 5) && !tinta(100, 5), [b[5 * W + 320], b[5 * W + 100]]);
}
// Seguridad: lo leído pasa siempre por esc() en la hoja de revisión
{
  const saved = ctx.esc; ctx.esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const MAL = `CERTIFICADO DE INSCRIPCIÓN DE DEFUNCIÓN REGISTRO CIVIL Nombre: ANTONIO<img src=x onerror=alert(1)> Primer apellido: JIMÉNEZ Segundo apellido: SOLER DNI: ${NIF_C} Fecha de defunción: 20/04/2026 Lugar de defunción: Málaga<script>alert(2)</script>`;
  const d = L.lecAnalizar(MAL, "<b>malo</b>.pdf");
  L.LEC.resultado = { docs: [{ nombre: "<b>malo</b>.pdf", tipo: d.tipo, titulo: d.titulo, texto: MAL, datos: d }], propuestas: L.lecPropuestas({ id: "xx", personas: [], bienes: [], deudas: [], situ: {} }, [{ nombre: "<b>malo</b>.pdf", tipo: d.tipo, titulo: d.titulo, texto: MAL, datos: d }]).propuestas };
  L.LEC.exp = null; L.LEC.leyendo = false;
  const html = vm.runInContext("lecSheetHTML()", ctx);
  t("seguridad: sin etiquetas inyectadas en la hoja", !/<img|<script|<b>malo/.test(html) && /&lt;b&gt;malo/.test(html), html.match(/<img|<script|<b>malo/));
  const xr = { docsLeidos: [{ nombre: "<img src=x>", tipo: "defuncion" }], nifCausante: "<script>", lugarFallecimiento: "<img src=y onerror=1>", planesPensiones: [{ plan: "<i>p</i>", importe: 1 }] };
  const hr = L.lecResumenHTML(xr);
  t("seguridad: resumen escapado", !/<img|<script|<i>p/.test(hr), hr);
  ctx.esc = saved;
}

// ── 16. Robustez de tablas y documentos reales ──
{
  // Certificado bancario con celdas partidas: IBAN en dos líneas, nombre del fondo en las líneas siguientes, importe en la línea de abajo
  const BK = `BANKINTER, S.A. · CERTIFICADO DE POSICIONES A FECHA DE FALLECIMIENTO
Producto IBAN / contrato Titulares Saldo
Cuenta corriente ES12 0128 0010 9101 Elena Martín Rojas 26.912,40
2345 6789 €
Depósito a plazo 12 ES21 2103 0000 1234 Elena Martín Rojas 60.000,00
meses 5678 9013 €
Fondo de inversión 1.512,44 participaciones Elena Martín Rojas 15.402,33
Bankinter Renta Fija €
Corto Plazo FI
Fondo de inversión CaixaBank Selección Tendencias FI · 812,3300 participaciones · valor
liquidativo 18,4567 € · valoración € 14.993,20 · 100 %`;
  const d = L.lecAnalizar(BK, "bankinter.pdf");
  t("banco: IBAN partido en dos líneas", d.bienes.find((b) => b.tipo === "cuenta")?.iban === "ES1201280010910123456789" && d.bienes.filter((b) => b.tipo === "cuenta")[1]?.iban === "ES2121030000123456789013", d.bienes.map((b) => b.iban));
  t("banco: nombre del fondo en las líneas siguientes", /Bankinter Renta Fija Corto Plazo/.test(d.bienes.find((b) => b.valor === 15402.33)?.descripcion || ""), d.bienes.map((b) => b.descripcion));
  t("banco: importe en la línea siguiente", d.bienes.some((b) => b.valor === 14993.2 && /Selección Tendencias/.test(b.descripcion)), d.bienes.map((b) => [b.descripcion, b.valor]));
  // IBAN enmascarado: se funde con la cuenta de los datos fiscales por entidad y últimas cuatro cifras
  const BKM = `BANKINTER, S.A. · CERTIFICADO DE SALDOS · Cuenta corriente ES12 0128 **** **** **** 6789 · saldo a fecha de fallecimiento 26.912,40 €`;
  const R = [["df.pdf", DFIS], ["bk.pdf", BKM]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  const P = L.lecPropuestas({ id: "xm", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} }, R).propuestas.filter((p) => p.etiqueta === "Cuenta");
  t("IBAN enmascarado: una sola cuenta con el saldo del banco", P.length === 1 && /26912 €/.test(P[0].mostrar) && !/24380/.test(P[0].mostrar), P.map((p) => p.mostrar));
}
{
  // DNI: la fecha de la zona mecánica con un dígito mal leído no supera el control → manda la fecha impresa
  const DNI_OCR = `REINO DE ESPAÑA DOCUMENTO NACIONAL DE IDENTIDAD
APELLIDOS ORTEGA MARTIN NOMBRE LUCIA
DNI ${NLU} FECHA DE NACIMIENTO 12 04 1980
IDESPBCD4455660${NLU}<<<<<<
3004127F3107155ESP<<<<<<<<<<<0
ORTEGA<MARTIN<<LUCIA<<<<<<<<<<`;
  const d = L.lecAnalizar(DNI_OCR, "dni lucia.jpg");
  t("DNI: control de la fecha → fecha impresa", d.personas[0]?.nacimiento === "1980-04-12" && d.personas[0].nif === NLU && d.avisos.some((a) => /dígito de control/.test(a)), [d.personas, d.avisos]);
  t("MRZ: dígito de control ICAO", vm.runInContext("lecMrzControl('800412')", ctx) === 9, vm.runInContext("lecMrzControl('800412')", ctx));
  const ok = L.lecAnalizar(DNI_OCR.replace("3004127", "8004129"), "dni.jpg");
  t("DNI: fecha de la zona mecánica válida", ok.personas[0]?.nacimiento === "1980-04-12" && !ok.avisos.some((a) => /dígito de control/.test(a)), ok.avisos);
}
{
  const M = vm.runInContext("lecMismaDireccion", ctx);
  t("dirección: «número doce» = 12", M("Calle Larios 12 Es:1 Pl:03 Pt:A, 29005 Málaga", "Vivienda tipo A en planta tercera del edificio sito en calle Larios número doce de Málaga") === true);
  t("dirección: otra calle, mismo número", M("Calle Larios 12", "Calle Granada 12") === false);
  t("dirección: misma calle, otro número", M("Calle Áncora 7", "Calle Ancora 9") === false);
  // Una sola vivienda habitual: la del padrón; la otra pasa a inmueble de uso residencial
  const N2V = `REGISTRO DE LA PROPIEDAD · NOTA SIMPLE INFORMATIVA
FINCA DE MADRID Nº 4455
URBANA: VIVIENDA letra C en planta segunda de la casa en calle Áncora número siete de Madrid. Referencia catastral 1528302VK4712H0007TB.
TITULARIDAD: DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${NE}, titular del pleno dominio con carácter privativo.
CARGAS: Libre de cargas. ${"Relleno de la nota. ".repeat(12)}
FINCA DE MADRID Nº 7788
URBANA: VIVIENDA letra B en planta cuarta de la casa en calle Almagro número veinte de Madrid. Referencia catastral 0847105VK4704F0012IA.
TITULARIDAD: DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${NE}, titular del pleno dominio con carácter privativo.
CARGAS: Libre de cargas.`;
  const PADM = `AYUNTAMIENTO DE MADRID · Padrón Municipal de Habitantes · CERTIFICADO DE EMPADRONAMIENTO. CERTIFICA: Que DOÑA ELENA MARTÍN ROJAS, con DNI ${NE}, figura inscrita en el Padrón Municipal de Habitantes de este municipio con domicilio en CL ALMAGRO 20 Es:1 Pl:04 Pt:B, 28010 MADRID, desde el día 01/03/1999.`;
  const R = [["nota.pdf", N2V], ["padron.pdf", PADM]].map(([n, tx]) => { const datos = L.lecAnalizar(tx, n); return { nombre: n, tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }; });
  const P = L.lecPropuestas({ id: "xvh", nombre: "Elena Martín Rojas", personas: [], bienes: [], deudas: [], situ: {} }, R).propuestas;
  const viv = P.filter((p) => p.etiqueta === "Vivienda"), otra = P.filter((p) => /no es la habitual/.test(p.etiqueta));
  t("vivienda habitual: la del padrón", viv.length === 1 && /Almagro/.test(viv[0].mostrar) && /coincide con el domicilio del padrón/.test(viv[0].mostrar) && otra.length === 1 && /Áncora/.test(otra[0].mostrar), P.map((p) => [p.etiqueta, p.mostrar.slice(0, 60)]));
  t("sin valor: aviso en «Falta por completar»", P.some((p) => p.grupo === "Falta por completar" && /2 inmuebles sin valor/.test(p.etiqueta) && p.on === false), P.map((p) => p.grupo));
}
{
  // Varias páginas: el lector de PDF no está en Node, pero los límites existen y son razonables
  t("límites de páginas", vm.runInContext("LEC_PAG_TEXTO >= 30 && LEC_PAG_OCR >= 6 && LEC_PAG_OCR <= 12", ctx) === true, 0);
}
// ══════════ Escáner (escaner.js) y formatos nuevos ══════════
{
  const G = (n) => vm.runInContext(n, ctx);
  const [scnDetectar, scnHomografia, scnAplicarH, scnEnderezar, scnTamSalida, scnRealzar, scnOrientacion, scnDoblePagina, scnPdf, scnJpegGris, scnGirar, scnLuma] = ["scnDetectar", "scnHomografia", "scnAplicarH", "scnEnderezar", "scnTamSalida", "scnRealzar", "scnOrientacion", "scnDoblePagina", "scnPdf", "scnJpegGris", "scnGirar", "scnLuma"].map(G);
  // Escena sintética: papel con renglones sobre una mesa, con la perspectiva que se pida
  let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const escena = (w, h, Q, { fondo = [90, 60, 40], ruido = 18, sombra = 0, papel = [240, 238, 230], contraste = 1 } = {}) => {
    const Hm = scnHomografia(Q, [[0, 0], [1, 0], [1, 1], [0, 1]]); const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [u, v] = scnAplicarH(Hm, x, y); let c;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { const linea = v > 0.08 && v < 0.92 && u > 0.1 && u < 0.9 && Math.floor(v * 60) % 2 === 0 && (u * 37 + Math.floor(v * 60) * 3.1) % 1 < 0.75; c = linea ? [40, 40, 45] : papel; }
      else { const n = (azar() - 0.5) * ruido + Math.sin(x * 0.05 + y * 0.01) * 10; c = fondo.map((q) => q + n); }
      const sh = sombra ? 1 - sombra * Math.max(0, Math.min(1, (x / w - 0.4) * 3)) : 1; const i = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = (128 + (c[k] - 128) * contraste) * sh; d[i + 3] = 255;
    }
    return d;
  };
  const giro = (a, c, P) => P.map(([x, y]) => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]);
  const CASOS = [["de frente", 400, 300, [[100, 30], [300, 32], [298, 270], [102, 268]], {}], ["torcido 12°", 400, 300, giro(12 * Math.PI / 180, [200, 150], [[-80, -110], [80, -110], [80, 110], [-80, 110]]), {}],
    ["perspectiva fuerte", 360, 480, [[120, 60], [260, 70], [330, 430], [30, 420]], {}], ["sombra en media hoja", 400, 300, [[90, 25], [310, 30], [305, 280], [95, 275]], { sombra: 0.55 }],
    ["poco contraste", 400, 300, [[90, 25], [310, 30], [305, 280], [95, 275]], { contraste: 0.45, fondo: [150, 140, 130] }], ["mesa clara", 400, 300, [[90, 25], [310, 30], [305, 280], [95, 275]], { fondo: [185, 180, 170], ruido: 10 }],
    ["papel cortado por el borde", 400, 300, [[-20, 10], [330, 0], [340, 320], [-10, 310]], {}]];
  for (const [n, w, h, Q, o] of CASOS) {
    const r = scnDetectar(escena(w, h, Q, o), w, h);
    const err = r ? Math.max(...r.esquinas.map((p, k) => Math.hypot(p[0] - Math.max(0, Math.min(w - 1, Q[k][0])), p[1] - Math.max(0, Math.min(h - 1, Q[k][1]))))) : 99;
    t(`escáner: detecta el papel (${n}) con las esquinas a menos de 3 px`, err < 3, r);
  }
  { const w = 300, h = 200, d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < d.length; i += 4) { const v = 90 + azar() * 30; d[i] = v; d[i + 1] = v * 0.8; d[i + 2] = v * 0.6; d[i + 3] = 255; } t("escáner: sin papel no inventa un documento", scnDetectar(d, w, h) === null); }
  { const Q = [[10, 20], [200, 5], [220, 180], [0, 150]]; const H = scnHomografia([[0, 0], [99, 0], [99, 139], [0, 139]], Q); const P = [[0, 0], [99, 0], [99, 139], [0, 139]].map(([x, y]) => scnAplicarH(H, x, y)); t("homografía: lleva el rectángulo al cuadrilátero", P.every((p, k) => Math.hypot(p[0] - Q[k][0], p[1] - Q[k][1]) < 1e-6), P); }
  {
    const w = 360, h = 480, Q = [[120, 60], [260, 70], [330, 430], [30, 420]]; const img = escena(w, h, Q, { sombra: 0.4 });
    const [W, H] = scnTamSalida(Q, 2400); { const [w4, h4] = scnTamSalida([[50, 40], [250, 45], [255, 330], [45, 325]], 2400); t("tamaño de salida: proporción A4 si está cerca", Math.abs(h4 / w4 - Math.SQRT2) < 0.01, [w4, h4]); }
    const R = scnEnderezar(img, w, h, Q, W, H); const g = scnLuma(R, W, H);
    // Renglones horizontales tras enderezar: las filas alternan tinta y papel; las columnas, no
    const filas = []; for (let y = Math.round(H * 0.2); y < H * 0.8; y++) { let s = 0; for (let x = Math.round(W * 0.2); x < W * 0.8; x++) s += g[y * W + x]; filas.push(s / (W * 0.6)); }
    const rango = Math.max(...filas) - Math.min(...filas); t("enderezar: los renglones quedan horizontales", rango > 60, rango);
    const E = scnRealzar(R, W, H, "documento"); const ge = scnLuma(E, W, H); const esquina = (x0, y0) => { let s = 0, n = 0; for (let y = y0; y < y0 + 8; y++) for (let x = x0; x < x0 + 8; x++) { s += ge[y * W + x]; n++; } return s / n; };
    t("realce: papel blanco también en la zona con sombra", esquina(4, Math.round(H * 0.03)) > 240 && esquina(W - 12, Math.round(H * 0.03)) > 240, [esquina(4, 5), esquina(W - 12, 5)]);
    let tinta = 0; for (let i = 0; i < ge.length; i++) if (ge[i] < 90) tinta++; t("realce: el texto queda oscuro", tinta > ge.length * 0.05, tinta / ge.length);
    const r90 = scnGirar(E, W, H, 90); t("giro de 90°: intercambia ancho y alto", r90.w === H && r90.h === W && r90.d.length === E.length);
  }
  {
    // Proporción real con perspectiva fuerte (Zhang y He): un A4 fotografiado inclinado 34° y girado 7°, con una focal de móvil
    const scnProporcion = G("scnProporcion");
    const proyecta = (rw, rh, f, ax, az, Z, W, H) => [[-rw / 2, -rh / 2], [rw / 2, -rh / 2], [rw / 2, rh / 2], [-rw / 2, rh / 2]].map(([x, y]) => { const X = x * Math.cos(az) - y * Math.sin(az), Y = x * Math.sin(az) + y * Math.cos(az); return [W / 2 + f * X / (Z + Y * Math.sin(ax)), H / 2 + f * Y * Math.cos(ax) / (Z + Y * Math.sin(ax))]; });
    const Q = proyecta(210, 297, 1400, 0.6, -0.12, 500, 1500, 2000); const r = scnProporcion(Q, 1500, 2000); const [W, H] = scnTamSalida(Q, 2400, 0, [1500, 2000]);
    t("perspectiva fuerte: recupera la proporción A4 del papel", Math.abs(r - 1 / Math.SQRT2) < 0.01 && Math.abs(H / W - Math.SQRT2) < 0.01, [r, W, H]);
  }
  // Orientación: renglones de «texto» con trazos por encima de la altura de la x (ascendentes) más frecuentes que por debajo
  // Letras de anchura y separación irregulares (como un texto real): cuerpo de la x, ascendentes en un tercio, descendentes en una de cada diez
  const pagina = (w, h) => { const b = new Uint8Array(w * h).fill(255); for (let l = 0; l < 14; l++) { const base = 40 + l * 34; let x = 30 + Math.floor(azar() * 20); while (x < w - 40) { const n = 2 + Math.floor(azar() * 8); for (let k = 0; k < n && x < w - 40; k++) { const an = 4 + Math.floor(azar() * 5), asc = azar() < 0.35, desc = azar() < 0.1; for (let xx = x; xx < x + an; xx++) { for (let y = base - 10; y < base; y++) b[y * w + xx] = 0; if (asc && xx < x + 2) for (let y = base - 18; y < base - 10; y++) b[y * w + xx] = 0; if (desc && xx < x + 2) for (let y = base; y < base + 6; y++) b[y * w + xx] = 0; } x += an + 1 + Math.floor(azar() * 2); } x += 7 + Math.floor(azar() * 4); } } return b; };
  { const w = 400, h = 540, P = pagina(w, h); const rot = (b, w, h, g) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < b.length; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = b[i]; d[i * 4 + 3] = 255; } const r = scnGirar(d, w, h, g); const o = new Uint8Array(r.w * r.h); for (let i = 0; i < o.length; i++) o[i] = r.d[i * 4]; return [o, r.w, r.h]; };
    for (const g of [0, 90, 180, 270]) { const [b, W, H] = rot(P, w, h, g); const o = scnOrientacion(b, W, H); t(`orientación: página girada ${g}° → girar ${(360 - g) % 360}°`, o.giro === (360 - g) % 360 && (g === 0 || o.conf >= 0.5), o); } }
  {
    // Doble página: dos páginas de renglones con un lomo limpio en medio; una tabla apaisada con columna central NO se parte
    const renglon = (b, w, y0, x0, x1) => { let x = x0 + Math.floor(azar() * 10); while (x < x1) { const an = 3 + Math.floor(azar() * 30); for (let xx = x; xx < Math.min(x1, x + an); xx++) for (let y = y0; y < y0 + 12; y++) b[y * w + xx] = 0; x += an + 6 + Math.floor(azar() * 6); } };
    const w = 860, h = 560, b = new Uint8Array(w * h).fill(255); for (let l = 0; l < 13; l++) for (const x0 of [30, 470]) renglon(b, w, 40 + l * 38, x0, x0 + 360);
    for (let y = 0; y < h; y++) b[y * w + 430] = 0; // la línea del lomo
    const x = scnDoblePagina(b, w, h); t("doble página: corta por el lomo", x > 395 && x < 470, x);
    const c = new Uint8Array(w * h).fill(255); for (let l = 0; l < 13; l++) renglon(c, w, 40 + l * 38, 30, w - 30);
    t("doble página: una página apaisada normal no se parte", scnDoblePagina(c, w, h) === 0);
  }
  {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 2, 0, 2, 1, 1, 0x11, 0, 0xff, 0xd9]);
    t("JPEG en gris (una componente)", scnJpegGris(jpeg) === true);
    const pdf = scnPdf([{ jpeg, w: 2, h: 3, gris: true }, { jpeg, w: 3, h: 2 }], "Escaneo (prueba)"); const txt = new TextDecoder("latin1").decode(pdf);
    const xref = Number(/startxref\n(\d+)/.exec(txt)[1]); const offs = [...txt.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    t("PDF del escáner: cabecera, dos páginas y tabla de referencias correcta", txt.startsWith("%PDF-1.4") && /\/Count 2/.test(txt) && txt.slice(xref, xref + 4) === "xref" && offs.length === 9 && offs.every((o, i) => txt.slice(o, o + String(i + 1).length + 6) === `${i + 1} 0 obj`), offs);
    t("PDF del escáner: imagen en gris y en color, A4 por el lado corto", /\/DeviceGray/.test(txt) && /\/DeviceRGB/.test(txt) && /MediaBox \[0 0 595\.28 892\.92\]/.test(txt) && /Title \(Escaneo \\\(prueba\\\)\)/.test(txt), txt.slice(0, 600));
  }
  // ── Formatos ──
  const lecEml = G("lecEml"), lecRtfTexto = G("lecRtfTexto"), lecHtmlTexto = G("lecHtmlTexto"), lecCsvTexto = G("lecCsvTexto"), lecOdfTexto = G("lecOdfTexto"), lecTextoIlegible = G("lecTextoIlegible"), lecLineasTabla = G("lecLineasTabla"), lecCeldaNum = G("lecCeldaNum"), lecFmtEs = G("lecFmtEs"), lecFirma = G("lecFirma"), lecTextoXlsx = G("lecTextoXlsx"), lecPalabrasCod = G("lecPalabrasCod");
  {
    const pdfB64 = Buffer.from("%PDF-1.4 adjunto de prueba").toString("base64").replace(/(.{20})/g, "$1\r\n");
    const eml = ["From: =?UTF-8?B?" + Buffer.from("Unicaja Banco · Testamentarías").toString("base64") + "?= <testamentarias@unicaja.example>", "To: despacho@example.com", "Subject: =?ISO-8859-1?Q?Certificado_de_posiciones_de_Antonio_Jim=E9nez?=", "Date: Tue, 12 May 2026 10:00:00 +0200", "MIME-Version: 1.0", 'Content-Type: multipart/mixed; boundary="==B1=="', "", "--==B1==", 'Content-Type: multipart/alternative; boundary="B2"', "", "--B2", "Content-Type: text/plain; charset=ISO-8859-1", "Content-Transfer-Encoding: quoted-printable", "", "Le adjuntamos el certificado de posiciones a fecha de fallecimiento de D. Antonio Jim=E9nez Soler.=", "", "Un cordial saludo", "--B2", "Content-Type: text/html; charset=utf-8", "", "<p>Le adjuntamos</p>", "--B2--", "--==B1==", "Content-Type: application/pdf; name=\"x.pdf\"", "Content-Transfer-Encoding: base64", "Content-Disposition: attachment; filename*=UTF-8''certificado%20posici%C3%B3n.pdf", "", pdfB64, "--==B1==", "Content-Type: image/png", "Content-Disposition: inline", "Content-Transfer-Encoding: base64", "", Buffer.from("logo").toString("base64"), "--==B1==--", ""].join("\r\n");
    const E = lecEml(new Uint8Array(Buffer.from(eml, "latin1")));
    t("correo .eml: asunto y remitente decodificados (RFC 2047)", E.asunto === "Certificado de posiciones de Antonio Jiménez" && /^Unicaja Banco · Testamentarías/.test(E.de), [E.asunto, E.de]);
    t("correo .eml: cuerpo en texto (quoted-printable, Latin-1)", /Antonio Jiménez Soler\.\r?\n?\s*Un cordial saludo/.test(E.texto.replace(/\r/g, "")) || /Jiménez Soler/.test(E.texto), E.texto);
    t("correo .eml: adjunto PDF con su nombre (RFC 2231) y el logotipo incrustado descartado", E.adjuntos.length === 1 && E.adjuntos[0].nombre === "certificado posición.pdf" && new TextDecoder().decode(E.adjuntos[0].datos) === "%PDF-1.4 adjunto de prueba", E.adjuntos.map((a) => a.nombre));
    t("palabras codificadas partidas en dos", lecPalabrasCod("=?UTF-8?Q?Nota_simple_?= =?UTF-8?Q?Ma=CC=81laga?=").normalize("NFC") === "Nota simple Málaga");
  }
  t("RTF: texto con tildes (\\'e9, \\u), párrafos y tablas", lecRtfTexto("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}{\\*\\generator X;}\\pard Valor catastral\\tab 140.000,00 \\'80\\par Jim\\'e9nez \\u241?o\\par\\trowd\\cellx1 NIF\\cell 25123456G\\cell\\row}") === "Valor catastral 140.000,00 €\nJiménez ño\nNIF 25123456G", lecRtfTexto("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}{\\*\\generator X;}\\pard Valor catastral\\tab 140.000,00 \\'80\\par Jim\\'e9nez \\u241?o\\par\\trowd\\cellx1 NIF\\cell 25123456G\\cell\\row}"));
  t("página web: sin scripts, filas en líneas y celdas juntas", lecHtmlTexto("<html><head><style>p{}</style><script>alert(1)</script></head><body><h1>Consulta descriptiva</h1><table><tr><td>Referencia catastral</td><td>1234567VK4713S0001OQ</td></tr><tr><td>Valor&nbsp;catastral</td><td>140.000,00&nbsp;&euro;</td></tr></table></body></html>") === "Consulta descriptiva\nReferencia catastral 1234567VK4713S0001OQ\nValor catastral 140.000,00 €");
  t("CSV con «;» y comillas", lecCsvTexto('Cuenta;IBAN;Saldo\r\n"Cuenta ""Nómina""";ES21 2103 0000 1234 5678 9012;38.500,00\r\n') === 'Cuenta IBAN Saldo\nCuenta "Nómina" ES21 2103 0000 1234 5678 9012 38.500,00');
  t("OpenDocument: celdas de una fila en la misma línea", lecOdfTexto('<office:document-content><office:body><office:spreadsheet><table:table table:name="Bienes"><table:table-row><table:table-cell><text:p>Saldo</text:p></table:table-cell><table:table-cell office:value="38500"><text:p>38.500,00 €</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document-content>', true) === "Hoja: Bienes\nSaldo 38.500,00 €");
  t("texto ilegible (fuentes sin mapa de caracteres) detectado", lecTextoIlegible("Fhuwlilfdgr gh lqvfulsflrq gh ghixqflrq Qrpeuh Dqwrqlr Mlphqhc Vrohu Ihfkd gh ghixqflrq 20/04/2026 Oxjdu Pdodjd Hvwdgr flylo fdvdgr Uhjlvwur Flylo gh Pdodjd frqfxhugdq frq orv txh frqvwdq hq od lqvfulsflrq. Od Hqfdujdgd gho Uhjlvwur Flylo FHUWLILFD txh orv gdwrv txh dqwhfhghq frqfxhugdq") === true && lecTextoIlegible(DEF) === false);
  t("importes y fechas de Excel a la española", lecFmtEs(1234.5) === "1.234,50" && lecFmtEs(-38500) === "-38.500,00" && lecCeldaNum(46132, "fecha") === "20/04/2026" && lecCeldaNum(2026, "") === "2026" && lecCeldaNum(0.5, "porcentaje") === "50 %" && lecCeldaNum(140000, "dinero") === "140.000,00", [lecCeldaNum(46132, "fecha")]);
  {
    // Líneas de tabla: se quitan los bordes largos y finos; las letras (bloques gruesos) quedan
    const w = 400, h = 200, b = new Uint8Array(w * h).fill(255);
    for (const y of [20, 100, 180]) for (let x = 10; x < 390; x++) b[y * w + x] = 0; for (const x of [10, 200, 389]) for (let y = 20; y <= 180; y++) b[y * w + x] = 0;
    for (let y = 50; y < 70; y++) for (let x = 30; x < 160; x++) if (x % 12 < 8) b[y * w + x] = 0; // «palabra» en negrita
    for (let x = 220; x < 380; x++) if (x % 9 < 5) b[140 * w + x] = 0; // línea fina a trazos (borde gris binarizado)
    const T = lecLineasTabla(b, w, h); let letras = 0, quitadas = 0; for (let y = 50; y < 70; y++) for (let x = 30; x < 160; x++) if (b[y * w + x] === 0) { letras++; if (T.m[y * w + x]) quitadas++; }
    t("líneas de tabla: se quitan los bordes (también a trazos) y no las letras", T.m[20 * w + 100] === 1 && T.m[60 * w + 200] === 1 && T.m[140 * w + 225] === 1 && T.m[140 * w + 370] === 1 && quitadas === 0 && letras > 0, [T.n, quitadas]);
  }
  // .xlsx mínimo: cadenas compartidas, estilos de fecha e importe y una hoja
  const { deflateRawSync } = await import("node:zlib");
  const zipDe = (E) => { const crc = (buf) => { let c, k = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (k ^ buf[n]) & 0xff; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; k = (k >>> 8) ^ c; } return (k ^ 0xffffffff) >>> 0; }; const P = [], C = []; let off = 0; for (const [n, t] of E) { const d = Buffer.from(t), z = deflateRawSync(d), nb = Buffer.from(n), lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc(d), 14); lh.writeUInt32LE(z.length, 18); lh.writeUInt32LE(d.length, 22); lh.writeUInt16LE(nb.length, 26); P.push(lh, nb, z); const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc(d), 16); ch.writeUInt32LE(z.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42); C.push(ch, nb); off += 30 + nb.length + z.length; } const cd = Buffer.concat(C), fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(E.length, 8); fin.writeUInt16LE(E.length, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16); return new Uint8Array(Buffer.concat([...P, cd, fin])); };
  const xlsx = zipDe([["xl/workbook.xml", '<workbook xmlns:r="r"><sheets><sheet name="Posiciones" sheetId="1" r:id="rId1"/></sheets></workbook>'], ["xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'],
    ["xl/sharedStrings.xml", "<sst><si><t>Cuenta corriente</t></si><si><t>ES21 2103 0000 1234 5678 9012</t></si><si><r><t>Fecha de </t></r><r><t>fallecimiento</t></r></si></sst>"], ["xl/styles.xml", '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>'],
    ["xl/worksheets/sheet1.xml", '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>2</v></c><c r="B1" s="1"><v>46132</v></c></row><row r="2"><c r="B2" t="s"><v>1</v></c><c r="A2" t="s"><v>0</v></c><c r="C2" s="2"><v>38500</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Total &amp; saldo</t></is></c><c r="C3"><v>1234.5</v></c></row></sheetData></worksheet>']]);
  const X = await lecTextoXlsx(xlsx);
  t("Excel (.xlsx): filas en líneas, columnas en orden, fechas e importes a la española", X.texto === "Fecha de fallecimiento 20/04/2026\nCuenta corriente ES21 2103 0000 1234 5678 9012 38.500,00\nTotal & saldo 1.234,50", X.texto);
  {
    const lecLimpiarOcr = G("lecLimpiarOcr");
    const o = lecLimpiarOcr("| Titular NIF Derecho |\nJIMÉNEZ SOLER ANTONIO ' 251234566 50,00 % de propiedad\nresulta que D./D.2 ANTONIO JIMÉNEZ, con N.!.F. 24987654V\nValor catastral 140 000,00 e\nTeléfono 952123456\nUnifond Moderado Fl");
    const cn = G("lecCompletarNif")("casado con DOÑA CARMEN RUIZ LÓPEZ, con N.I.F. 24987654, titulares del pleno dominio. Teléfono 952123456.");
    t("NIF sin la letra tras «N.I.F.»: se calcula y se cuenta para avisar", cn.n === 1 && /N\.I\.F\. 24987654V, titulares/.test(cn.t) && /952123456\./.test(cn.t), cn);
    t("limpieza de la lectura óptica: NIF con la letra leída como cifra, «N.!.F.», «D.2», importes con espacios y «e» por «€»", o === "Titular NIF Derecho\nJIMÉNEZ SOLER ANTONIO ' 25123456G 50,00 % de propiedad\nresulta que D./D.ª ANTONIO JIMÉNEZ, con N.I.F. 24987654V\nValor catastral 140.000,00 €\nTeléfono 952123456\nUnifond Moderado FI", o);
  }
  {
    const ok = G("lecRefCatOk"), arr = G("lecRefCatArreglar");
    t("referencia catastral: caracteres de control (ejemplo real del Catastro y rústica)", ok("7837301VG8173B0001TT") && ok("40080A008001120000JZ") && !ok("7837301VG8173B0001NN"));
    t("referencia catastral mal leída: 5 por S, O por 0, I por 1 y la letra de control parecida se corrigen con el control; lo que no cuadra se deja", arr("1234567VK471350001OQ") === "1234567VK4713S0001OQ" && arr("1234567VK4713SOOO1OQ") === "1234567VK4713S0001OQ" && arr("7837301VG8173B000ITT") === "7837301VG8173B0001TT" && arr("1234567VK47135000100") === "1234567VK4713S0001OQ" && arr("7837301VG8173B0001NN") === "7837301VG8173B0001NN" && arr("7837301VG8178B0001TT") === "7837301VG8178B0001TT", [arr("1234567VK471350001OQ"), arr("1234567VK4713SOOO1OQ"), arr("7837301VG8173B000ITT")]);
    const rcl = G("lecRefCat"); t("referencia catastral con un carácter repetido de más tras la etiqueta", rcl("Referencia catastral del inmueble 1234567VK47135000100Q") === "1234567VK4713S0001OQ", rcl("Referencia catastral del inmueble 1234567VK47135000100Q"));
    const d = L.lecAnalizar("CERTIFICACIÓN CATASTRAL DESCRIPTIVA Y GRÁFICA\nReferencia catastral 1234567VK4713S0001AB\nValor catastral 140.000,00 €", "c.pdf");
    t("referencia catastral que no cuadra: se avisa", d.avisos.some((a) => /no cuadra con sus caracteres de control/.test(a)), d.avisos);
  }
  {
    // Formatos reales (estructura de documentos públicos: certificación de la Sede del Catastro, consulta descriptiva rústica, nota simple
    // telemática). Datos ficticios con referencias catastrales válidas
    const dc = G("lecRcDc"), rcF = "2938504UF6623N0004" + dc("2938504" + "0004") + dc("UF6623N" + "0004");
    const cert = L.lecAnalizar(`CERTIFICACIÓN CATASTRAL DESCRIPTIVA Y GRÁFICA\nReferencia catastral: ${rcF}\nDATOS DESCRIPTIVOS DEL INMUEBLE\nLocalización: CL ALPECHIN 41 Es:1 Pl:02 Pt:B 41640 OSUNA [SEVILLA]\nClase: Urbano\nUso principal: Residencial\nSuperficie construida: 98 m2\nAño construcción: 1987\nVALORES CATASTRALES\nValor catastral (2026): 86.602,46 €\nValor catastral suelo: 26.602,46 €\nValor catastral construcción: 60.000,00 €\nTITULARIDAD\nApellidos Nombre / Razón social NIF/NIE Derecho Domicilio fiscal\nGARCIA RUIZ PABLO 74111222R 100,00% de propiedad CL ALPECHIN 41 41640 OSUNA [SEVILLA]\nPARCELA CATASTRAL\nSuperficie gráfica: 280 m2\nCSV: RRHRX45HGXSJQFP7 (verificable en https://www.sedecatastro.gob.es)`, "c.pdf");
    const bc = cert.bienes[0] || {};
    t("certificación de la Sede del Catastro: valor catastral (año), suelo, municipio [provincia] y titular", bc.valorCatastralTotal === 86602.46 && bc.valorCatastralSuelo === 26602.46 && bc.muniNombre === "Osuna" && bc.muniProv === "Sevilla" && bc.anioConstruccion === 1987 && cert.personas.some((p) => p.nombre === "Pablo Garcia Ruiz" && p.nif === "74111222R") && !cert.avisos.some((a) => /control/.test(a)), [bc, cert.avisos]);
    const rus = L.lecAnalizar("CONSULTA DESCRIPTIVA Y GRÁFICA DE DATOS CATASTRALES DE BIEN INMUEBLE\nReferencia catastral: 30029A060000110000PS\nLocalización: Polígono 60 Parcela 11\nEL CASTILLO. MULA [MURCIA]\nClase: Rústico\nUso principal: Agrario\nSuperficie gráfica: 193.477 m2\nParticipación del inmueble: 100,00 %\nSubparcela Cultivo IP Superficie m²\na MT Matorral 00 120.330\nb E- Almendro secano 02 41.200\nEste documento no es una certificación catastral", "c.pdf").bienes[0] || {};
    t("consulta descriptiva rústica: polígono, parcela, paraje, término [provincia], superficie y cultivos", rus.rustico && rus.poligono === "60" && rus.parcela === "11" && rus.muniNombre === "Mula" && rus.muniProv === "Murcia" && rus.superficie === 193477 && /matorral/.test(rus.descripcion), rus);
    const ns = L.lecAnalizar("NOTA SIMPLE INFORMATIVA TELEMATICA\nREGISTRO DE LA PROPIEDAD Nº 2 DE ÁVILA\nFINCA DE AVILA Nº: 56298\nCódigo Registral Único: 05010000562980\nREFERENCIA CATASTRAL: 1234567VK4713S0001OQ\nDESCRIPCION DE LA FINCA\nURBANA: Código Registral Unico: 05010000562980. VIVIENDA en calle Mayor número tres de Ávila. Linda: frente, calle.\nTITULARIDADES\nTITULAR NIF TOMO LIBRO FOLIO ALTA\nJIMÉNEZ SOLER, ANTONIO 25123456G 2345 456 78 4\n50,000000% (CINCUENTA POR CIENTO) del pleno dominio con carácter ganancial por título de compraventa.\nRUIZ LÓPEZ, CARMEN 24987654V 2345 456 78 4\n50,000000% (CINCUENTA POR CIENTO) del pleno dominio con carácter ganancial por título de compraventa.\nCARGAS\nNO hay cargas registradas", "n.pdf");
    const nb = ns.bienes[0] || {};
    t("nota simple telemática: titulares de la tabla (APELLIDOS, NOMBRE), derecho y cuota, registro, descripción sin el CRU, sin cargas", nb.titulares && nb.titulares.length === 2 && nb.titulares[0].nombre === "Antonio Jiménez Soler" && nb.titulares[0].pct === 50 && nb.titulares[0].derecho === "pleno" && nb.titularidad === "ganancial" && /^Vivienda en calle Mayor/.test(nb.descripcion) && /Ávila/i.test(nb.registro) && ns.campos.some((c) => c.k === "cargas" && c.valor === "libre"), nb);
  }
  const B = (u8) => new Blob([u8]);
  const firmas = await Promise.all([B(Buffer.from("%PDF-1.7")), B(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0])), B(Buffer.from("II*\0abcd")), B(xlsx), B(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]))].map(lecFirma));
  t("tipo real por los primeros bytes (PDF, HEIC, TIFF, zip, Office antiguo)", firmas.join(",") === "pdf,heic,tiff,zip,ole", firmas);
}
// ── Ronda 3 · experiencia de uso: fechas imposibles (M8), errores en español (M7) y documentos de dos herencias (I5) ──
{
  const iso = vm.runInContext("lecIso", ctx), msg = vm.runInContext("lecMensajeError", ctx), cau = vm.runInContext("lecCausantes", ctx);
  t("fechas imposibles: 31/02, 29/02 de año no bisiesto, 31/04 y día 0 se descartan; 29/02/2024 vale", iso(31, 2, 2026) === null && iso(29, 2, 2026) === null && iso(31, 4, 2026) === null && iso(0, 5, 2026) === null && iso(29, 2, 2024) === "2024-02-29" && iso(31, 12, 2025) === "2025-12-31");
  const d = L.lecAnalizar(DEF.replace("Fecha de defunción: 20/04/2026", "Fecha de defunción: 31/02/2026"), "defuncion.pdf");
  t("certificado con fecha de defunción imposible: no se propone una fecha falsa", !d.campos.some((c) => c.k === "fecha" && /2026-02-31|2026-03-03/.test(c.valor)), d.campos.filter((c) => c.k === "fecha"));
  const ing = ["Invalid PDF structure.", "No password given", "The source image could not be decoded.", "The PDF file is empty, i.e. its size is zero bytes.", "Failed to fetch dynamically imported module: x", "Something unexpected happened"];
  const es = ing.map((m) => msg(new Error(m)));
  t("errores de las librerías en español claro, sin el texto en inglés", es.every((m) => m && !/\b(the|is|not|could|invalid|given|failed|empty)\b/i.test(m)), es);
  t("los mensajes propios en español se respetan", msg(new Error("el PDF está dañado o incompleto: descárgalo de nuevo")) === "el PDF está dañado o incompleto: descárgalo de nuevo");
  const doc = (nombre, campos = [], personas = [], bienes = []) => ({ nombre, tipo: "x", datos: { campos, personas, bienes, deudas: [], gastos: [], avisos: [] } });
  const R = [doc("a-defuncion.pdf", [{ k: "nombre", valor: "Antonio Jiménez Soler" }, { k: "fecha", valor: "2026-04-20" }, { k: "nifCausante", valor: NIF_C }]),
    doc("a-testamento.pdf", [{ k: "nombre", valor: "Antonio Jiménez Soler" }], [{ nombre: "Carmen Ruiz López", relacion: "conyuge" }, { nombre: "Javier Jiménez Ruiz", relacion: "hijo" }]),
    doc("a-dni.jpg", [], [{ nombre: "Javier Jimenez Ruiz" }]), doc("a-banco.pdf"),
    doc("b-defuncion.pdf", [{ k: "nombre", valor: "María Dolores Ruiz Cano" }, { k: "fecha", valor: "2026-02-03" }]),
    doc("b-plurilingue.pdf", [{ k: "fecha", valor: "2026-02-03" }]),
    doc("b-nota.pdf", [], [{ nombre: "María Dolores Ruiz Cano", rol: "titular registral" }]),
    doc("b-padron.pdf", [], [{ nombre: "María Dolores Ruiz" }])];
  const C = cau(R, { nombre: "", personas: [] });
  const nom = (i) => C.grupos.find((g) => g.docs.includes(i))?.nombre;
  t("dos causantes distintos: dos grupos con sus documentos (también DNI de un heredero, fecha sola, nota simple y padrón)", C.grupos.length === 2 && [0, 1, 2].every((i) => nom(i) === "Antonio Jiménez Soler") && [4, 5, 6, 7].every((i) => nom(i) === "María Dolores Ruiz Cano") && C.sinAsignar.join() === "3", C);
  t("un solo causante (aunque un documento traiga la fecha mal): un grupo", cau([R[0], R[1], doc("a-ultimas.pdf", [{ k: "nombre", valor: "Antonio Jiménez Soler" }, { k: "fecha", valor: "2026-04-21" }])], {}).grupos.length === 1);
  t("documentos de otro causante que el del expediente: se detecta", cau([R[4]], { nombre: "Antonio Jiménez Soler", personas: [] }).grupos.length === 2);
  t("mismo DNI con el nombre escrito de otra forma: mismo causante", cau([R[0], doc("x.pdf", [{ k: "nombre", valor: "A. Jiménez" }, { k: "nifCausante", valor: NIF_C }])], {}).grupos.length === 1);
  const P = L.lecPropuestas({ personas: [], bienes: [] }, [doc("t1.pdf", [], [{ nombre: "Carmen Ruiz López", relacion: "conyuge", conf: 2 }]), doc("t2.pdf", [], [{ nombre: "José García Pérez", relacion: "conyuge", conf: 2 }])]).propuestas;
  t("un expediente admite un solo cónyuge: el segundo propuesto queda sin marcar", P.filter((p) => p.etiqueta.startsWith("Cónyuge") && p.on).length === 1, P.map((p) => [p.etiqueta, p.on]));
}
// ── Auditoría r5 (08-10-2026): testamento por partes iguales cargado en un expediente vacío, nombres compuestos y con apóstrofo ──
{
  const TES = `NÚMERO CUATROCIENTOS DOCE. TESTAMENTO ABIERTO. En Marbella, a tres de marzo de dos mil diecinueve. Ante mí, ELENA BARRIOS CUESTA, Notaria del Ilustre Colegio de Andalucía, COMPARECE: DOÑA ROSARIO DEL PILAR O'CONNOR NÚÑEZ, mayor de edad, viuda de Don Ignacio García Lobo, vecina de Marbella, con D.N.I. número ${nif(27111222)}. MANIFIESTA: I.- Que es natural de Ronda (Málaga), de vecindad civil común. II.- Que de su único matrimonio tiene dos hijos, llamados IÑAKI y MARÍA JOSÉ GARCÍA O'CONNOR, mayores de edad. CLÁUSULAS: PRIMERA.- Lega a su nieta DOÑA LUCÍA GARCÍA PEÑA la plaza de aparcamiento número 7 del edificio de calle Camilo José Cela 4, de Marbella, con cargo al tercio de libre disposición. SEGUNDA.- Lega a su amiga DOÑA ÁFRICA LÓPEZ-ÁLVAREZ DÍAZ la cantidad de VEINTE MIL EUROS (20.000 €) en metálico. TERCERA.- En el remanente de sus bienes instituye herederos por partes iguales a sus dos hijos, IÑAKI y MARÍA JOSÉ GARCÍA O'CONNOR, sustituidos vulgarmente por sus respectivos descendientes. CUARTA.- Revoca todo testamento anterior.`;
  const d = L.lecAnalizar(TES, "testamento.pdf");
  const noms = d.personas.map((p) => p.nombre);
  t("r5 H2 · «IÑAKI y MARÍA JOSÉ GARCÍA O'CONNOR»: dos hijos con su nombre compuesto, sin dar «José» a Iñaki", noms.includes("Iñaki García O'Connor") && noms.includes("María José García O'Connor"), noms);
  t("r5 H3 · mayúscula tras apóstrofo y guion con tilde («O'Connor», «López-Álvarez»)", noms.includes("África López-Álvarez Díaz") && vm.runInContext("lecTitulo", ctx)("SANT JOAN D'ALACANT") === "Sant Joan d'Alacant", noms);
  const lista = vm.runInContext("lecListaNombres", ctx);
  t("r5 H2 · «MARÍA DEL CARMEN LÓPEZ RUIZ»: los apellidos son las dos últimas unidades", JSON.stringify(lista("ANA y MARÍA DEL CARMEN LÓPEZ RUIZ")) === JSON.stringify(["Ana López Ruiz", "María del Carmen López Ruiz"]), lista("ANA y MARÍA DEL CARMEN LÓPEZ RUIZ"));
  const leg = d.personas.find((p) => /África/.test(p.nombre));
  t("r5 · el legado de «20.000 €» no se corta en el punto de los miles", leg && /20\.000/.test(leg.legadoDesc || ""), leg);
  const x = { id: "e1", nombre: "", personas: [], bienes: [], deudas: [], gastos: [] };
  L.DB.expedientes = [x];
  const R = L.lecPropuestas(x, [{ nombre: "testamento.pdf", tipo: "testamento", titulo: "Testamento", datos: d }]);
  vm.runInContext("LEC", ctx).resultado = { docs: [{ nombre: "testamento.pdf", tipo: "testamento", titulo: "Testamento", datos: d }], propuestas: R.propuestas, separados: [] };
  vm.runInContext("lecAplicar", ctx)(x, R.propuestas.filter((p) => p.on).map((p) => p.id));
  const pct = Object.fromEntries(x.personas.map((p) => [p.nombre, p.pct || 0]));
  t("r5 H1 · testamento «por partes iguales» en un expediente vacío: 50 % a cada hijo y nada a los legatarios (antes, 0 herederos y 0 € de Sucesiones)", x.testamento === "porcentajes" && pct["Iñaki García O'Connor"] === 50 && pct["María José García O'Connor"] === 50 && !pct["África López-Álvarez Díaz"] && !pct["Lucía García Peña"], pct);
}
// G04 (auditoría civil 10-10-2026, hallazgo 10): participación, conquistas, consorcio y comunicación foral ya no se convierten en gananciales
{
  const matri = (reg) => `REGISTRO CIVIL DE BILBAO · CERTIFICACIÓN LITERAL DE INSCRIPCIÓN DE MATRIMONIO
Contrayente 1: DON IÑAKI ETXEBARRIA URIARTE, nacido en Gernika el 2 de noviembre de 1949.
Contrayente 2: DOÑA MIREN AGIRRE BILBAO, nacida en Bermeo el 8 de mayo de 1951.
Celebrado el día 23 de septiembre de 1978 en Gernika.
Régimen económico: ${reg}.`;
  const rg = (reg) => campo(L.lecAnalizar(matri(reg), "matrimonio.pdf"), "civil");
  t("G04 lector · participación: casado sin bienes comunes y régimen de participación", rg("participación")?.valor === "separacion" && rg("participación").regimen === "participacion", rg("participación"));
  t("G04 lector · conquistas: régimen navarro, no gananciales a secas", rg("conquistas")?.valor === "gananciales" && rg("conquistas").regimen === "conquistas" && !/se propone gananciales/.test(rg("conquistas").mostrar), rg("conquistas"));
  t("G04 lector · consorcio conyugal: régimen aragonés", rg("consorcio conyugal")?.regimen === "consorcio", rg("consorcio conyugal"));
  t("G04 lector · consorcial: régimen aragonés", rg("consorcial")?.regimen === "consorcio", rg("consorcial"));
  t("G04 lector · comunicación foral de bienes: régimen vizcaíno", rg("comunicación foral de bienes")?.regimen === "comunicacion", rg("comunicación foral de bienes"));
  const dc = L.lecAnalizar(matri("comunidad de bienes").replace(/BILBAO|Gernika|Bermeo/g, "MADRID"), "m.pdf"), cc = campo(dc, "civil");
  t("G04 lector · «comunidad de bienes» sin más: confianza baja y aviso, sin régimen concreto", cc?.conf === 1 && !cc.regimen && dc.avisos.some((a) => /comunidad de bienes/.test(a)), [cc, dc.avisos]);
  t("G04 lector · gananciales: sin régimen concreto (lo decide la ley aplicable)", rg("gananciales")?.valor === "gananciales" && !rg("gananciales").regimen, rg("gananciales"));
  // Al aplicar, el régimen concreto pasa al expediente
  const x = { id: "xg4", nombre: "", personas: [], bienes: [], deudas: [], situ: {} };
  const tx = matri("conquistas"), datos = L.lecAnalizar(tx, "matrimonio.pdf");
  const P = L.lecPropuestas(x, [{ nombre: "matrimonio.pdf", tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }]).propuestas;
  L.LEC.resultado = { docs: [{ nombre: "matrimonio.pdf", tipo: datos.tipo, titulo: datos.titulo, texto: tx, datos }], propuestas: P }; L.lecAplicar(x, P.filter((p) => p.k === "civil").map((p) => p.id));
  t("G04 lector · aplicado: gananciales en el estado civil y conquistas en el régimen", x.civil === "gananciales" && x.regimen && x.regimen.tipo === "conquistas", [x.civil, x.regimen]);
  // Testamento: «casado en régimen de participación con…»
  const TES = `TESTAMENTO ABIERTO. COMPARECE: DON JUAN PÉREZ LÓPEZ, casado en régimen de participación con DOÑA ANA GIL RUIZ, vecino de Madrid. Instituye herederos a sus hijos.`;
  const ct = campo(L.lecAnalizar(TES, "testamento.pdf"), "civil");
  t("G04 lector · testamento con participación", ct?.valor === "separacion" && ct.regimen === "participacion", ct);
}
console.log(`\nlector: ${ok} pruebas correctas${ko ? `, ${ko} fallidas` : ""}`);
if (ko) process.exit(1);
