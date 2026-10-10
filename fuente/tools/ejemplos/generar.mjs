// Genera tres juegos de documentos FICTICIOS con la estructura de los documentos oficiales españoles, para probar el lector de Hereda+.
// Todos llevan el aviso «DOCUMENTO FICTICIO». Uso: node tools/ejemplos/generar.mjs [carpeta de salida] (por defecto tools/ejemplos/salida).
//  · caso1-testamento-malaga: herencia testada de Antonio Jiménez Soler (PDF con texto, PDF escaneado, fotos, DNI, bancos, Catastro con valor de
//    referencia, datos fiscales, factura del funeral).
//  · caso2-intestada-torremolinos: acta de herederos, certificados antiguos y plurilingüe, varias fincas, otros bancos y organismos, DNI antiguo,
//    modelo 650, nómina (documento ajeno), certificación catastral y valor de referencia, compraventa.
//  · caso3-capitulaciones-madrid: capitulaciones (separación de bienes), certificado literal de matrimonio y de nacimiento, testamento en .txt,
//    contrato de alquiler en Word (.docx), nota simple con tres fincas (una rústica), Catastro rústico, datos fiscales, valores, plan de pensiones,
//    préstamo (escritura y certificado de deuda), participaciones sociales, facturas del funeral y de la clínica, DNI fotografiado torcido.
// Requiere Playwright con Chromium (la ruta de abajo es la del entorno de desarrollo; cámbiala si hace falta).
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
const RAIZ = process.argv[2] ? path.resolve(process.argv[2]) + "/" : new URL("./salida/", import.meta.url).pathname;
const OUT = RAIZ + "caso1-testamento-malaga/"; fs.mkdirSync(OUT, { recursive: true });
const nif = (n) => `${String(n).padStart(8, "0")}${"TRWAGMYFPDXBNJZSQVHLCKE"[n % 23]}`;
const N = { antonio: nif(25123456), carmen: nif(24987654), javier: nif(74123123), miguel: nif(53000111), luis: nif(74555666), ana: nif(74777888), carmenH: nif(74999000) };

const AVISO = `<div class="aviso">DOCUMENTO FICTICIO · EJEMPLO PARA PROBAR HEREDA+ · Todos los nombres, números y datos son inventados. No es un documento oficial ni tiene validez alguna.</div>`;
const CSS = `
<style>
@page{size:A4;margin:18mm 18mm 16mm}
body{font:11.5pt/1.45 "Liberation Sans",Arial,Helvetica,sans-serif;color:#111;margin:0}
.aviso{border:1.5px solid #b00;color:#b00;font-size:9pt;padding:5px 8px;margin:0 0 12px;text-align:center;letter-spacing:.02em}
.cab{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:14px}
.cab .org{font-weight:700;font-size:10pt;letter-spacing:.06em;text-transform:uppercase}
.cab .org small{display:block;font-weight:400;letter-spacing:0;text-transform:none;color:#444}
.cab .esc{width:54px;height:54px;border:2px solid #333;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:8pt;text-align:center;color:#333}
h1{font-size:14pt;text-align:center;letter-spacing:.08em;margin:10px 0 14px;text-transform:uppercase}
h2{font-size:11pt;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #999;padding-bottom:2px}
table{border-collapse:collapse;width:100%;font-size:11pt}
td,th{border:1px solid #999;padding:5px 7px;vertical-align:top;text-align:left}
th{background:#eee;font-weight:600;width:34%}
.kv td:first-child{width:36%;color:#333}
p{margin:6px 0;text-align:justify}
.firma{margin-top:28px;display:flex;justify-content:space-between;font-size:10pt;color:#333}
.csv{font-size:8.5pt;color:#444;margin-top:16px;border-top:1px solid #bbb;padding-top:6px}
.mono{font-family:"Liberation Mono","DejaVu Sans Mono",monospace}
table.ancha{font-size:8pt}table.ancha td,table.ancha th{white-space:nowrap;padding:3px 5px}table.ancha td.sit{white-space:normal}
.not{font-family:"Liberation Serif","Times New Roman",serif;font-size:12pt;line-height:1.6}
.not h1{font-family:inherit;font-size:13pt}
.not p{text-indent:0}
.num{text-align:right}
.sello{display:inline-block;border:2px solid #246;color:#246;border-radius:4px;padding:3px 8px;font-size:9pt;transform:rotate(-4deg);margin:10px 0}
.small{font-size:9.5pt;color:#333}
</style>`;
const pagina = (body, cls = "") => `<!doctype html><html lang="es"><head><meta charset="utf-8">${CSS}</head><body class="${cls}">${AVISO}${body}</body></html>`;
const cab = (org, sub, esc = "ESCUDO") => `<div class="cab"><div class="org">${org}<small>${sub}</small></div><div class="esc">${esc}</div></div>`;

const DOCS = {};
// Certificación catastral descriptiva y gráfica con la estructura de la Sede Electrónica del Catastro (guía oficial de la certificación y
// certificaciones públicas de bienes de las administraciones): «Referencia catastral:», «Localización: … 29005 MÁLAGA [MÁLAGA]», «Valor catastral
// (año)», «Valor catastral suelo», «Valor catastral construcción», titularidad con «Apellidos Nombre / Razón social · NIF/NIE · Derecho · Domicilio
// fiscal», construcción, parcela (superficie gráfica) y CSV verificable. No lleva el valor de referencia: ese es un certificado aparte.
const certCat = ({ ref, loc, clase = "Urbano", uso, sup, anio, vc, vs, vcons, anioVC = 2026, tit = [], cons = [], cultivos = [], parcela, fecha = "06/05/2026", csv }) => pagina(`${cab("Ministerio de Hacienda", "Secretaría de Estado de Hacienda · Dirección General del Catastro", "CAT")}
<h1>Certificación catastral descriptiva y gráfica</h1>
<h2>Referencia catastral del inmueble</h2><p class="mono"><b>Referencia catastral: ${ref}</b></p>
<h2>Datos descriptivos del inmueble</h2>
<table class="kv"><tr><td>Localización:</td><td>${loc}</td></tr><tr><td>Clase:</td><td>${clase}</td></tr><tr><td>Uso principal:</td><td>${uso}</td></tr>${sup ? `<tr><td>Superficie construida:</td><td>${sup} m2</td></tr>` : ""}${anio ? `<tr><td>Año construcción:</td><td>${anio}</td></tr>` : ""}</table>
<h2>Valores catastrales</h2>
<table class="kv"><tr><td>Valor catastral (${anioVC}):</td><td class="num">${vc} €</td></tr><tr><td>Valor catastral suelo:</td><td class="num">${vs} €</td></tr><tr><td>Valor catastral construcción:</td><td class="num">${vcons} €</td></tr></table>
<h2>Titularidad</h2>
<table><tr><th>Apellidos Nombre / Razón social</th><th style="width:16%">NIF/NIE</th><th style="width:20%">Derecho</th><th>Domicilio fiscal</th></tr>${tit.map(([n, nif, der, dom]) => `<tr><td>${n}</td><td>${nif}</td><td>${der}</td><td>${dom}</td></tr>`).join("")}</table>
${cons.length ? `<h2>Construcción</h2><table><tr><th>Destino</th><th>Esc./Plta./Prta.</th><th class="num">Superficie m²</th></tr>${cons.map(([d, e, m]) => `<tr><td>${d}</td><td>${e}</td><td class="num">${m}</td></tr>`).join("")}</table>` : ""}
${cultivos.length ? `<h2>Cultivos</h2><table><tr><th>Subparcela</th><th>Cultivo/aprovechamiento</th><th>Intensidad productiva</th><th class="num">Superficie m²</th></tr>${cultivos.map((c) => `<tr>${c.map((v, i) => `<td${i === 3 ? ' class="num"' : ""}>${v}</td>`).join("")}</tr>`).join("")}</table>` : ""}
<h2>Parcela catastral</h2><table class="kv"><tr><td>Superficie gráfica:</td><td>${parcela}</td></tr></table>
<p class="small" style="margin-top:12px">Finalidad: Impuesto sobre Sucesiones y Donaciones. Fecha de emisión: ${fecha}. Este certificado refleja los datos incorporados a la Base de Datos del Catastro.</p>
<div class="csv mono">CSV: ${csv} (verificable en https://www.sedecatastro.gob.es) · ficticio</div>`);
// Certificado de valor de referencia (servicio propio de la Sede del Catastro, uno por inmueble)
const certVR = ({ ref, loc, uso, valor, fecha = "06/05/2026", csv }) => pagina(`${cab("Ministerio de Hacienda", "Dirección General del Catastro · Sede Electrónica", "CAT")}
<h1>Certificado de valor de referencia</h1>
<table class="kv"><tr><td>Referencia catastral</td><td class="mono">${ref}</td></tr><tr><td>Localización</td><td>${loc}</td></tr><tr><td>Uso</td><td>${uso}</td></tr><tr><td>Fecha de referencia</td><td>01/01/2026</td></tr><tr><td>Valor de referencia del inmueble</td><td class="num"><b>${valor} €</b></td></tr></table>
<p class="small" style="margin-top:14px">El valor de referencia se determina por la Dirección General del Catastro conforme a la disposición final tercera de la Ley 11/2021 y al artículo 9.3 de la Ley 29/1987 del Impuesto sobre Sucesiones y Donaciones. Certificado expedido el ${fecha}.</p>
<div class="csv mono">CSV: ${csv} (ficticio)</div>`);

// 1 · Certificado de defunción (extracto, Registro Civil electrónico)
DOCS["01-certificado-defuncion.pdf"] = pagina(`${cab("Ministerio de Justicia", "Dirección General de Seguridad Jurídica y Fe Pública · Registro Civil de Málaga")}
<h1>Certificado de inscripción de defunción</h1>
<p class="small">Certificación en extracto expedida de conformidad con la Ley 20/2011, de 21 de julio, del Registro Civil.</p>
<h2>Datos del inscrito</h2>
<table class="kv"><tr><td>Nombre</td><td>ANTONIO</td></tr><tr><td>Primer apellido</td><td>JIMÉNEZ</td></tr><tr><td>Segundo apellido</td><td>SOLER</td></tr><tr><td>DNI</td><td>${N.antonio}</td></tr><tr><td>Sexo</td><td>Varón</td></tr><tr><td>Nacionalidad</td><td>Española</td></tr><tr><td>Fecha de nacimiento</td><td>12/03/1948</td></tr><tr><td>Lugar de nacimiento</td><td>Antequera</td></tr><tr><td>Provincia</td><td>Málaga</td></tr><tr><td>Estado civil</td><td>Casado</td></tr><tr><td>Nombre de los padres</td><td>Manuel y Dolores</td></tr></table>
<h2>Datos de la defunción</h2>
<table class="kv"><tr><td>Fecha de defunción</td><td>20/04/2026</td></tr><tr><td>Hora</td><td>06:35</td></tr><tr><td>Lugar de defunción</td><td>Málaga</td></tr><tr><td>Provincia</td><td>Málaga</td></tr><tr><td>Último domicilio</td><td>Calle Larios 12, 3.º A, 29005 Málaga</td></tr></table>
<h2>Datos registrales</h2>
<table class="kv"><tr><td>Registro Civil</td><td>Málaga</td></tr><tr><td>Código de inscripción</td><td>29067-2026-D-004512</td></tr><tr><td>Fecha de la inscripción</td><td>22/04/2026</td></tr></table>
<p style="margin-top:18px">La Encargada del Registro Civil de Málaga CERTIFICA que los datos que anteceden concuerdan con los que constan en la inscripción.</p>
<div class="firma"><span>Málaga, 24 de abril de 2026</span><span>Firmado electrónicamente</span></div>
<div class="csv mono">CSV: 9F3A-7K2M-D0E1-QX88 · Verificación en https://sede.mjusticia.gob.es (ficticio)</div>`);

// 2 · Últimas voluntades (consta testamento)
DOCS["02-certificado-ultimas-voluntades.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro General de Actos de Última Voluntad")}
<h1>Certificado de actos de última voluntad</h1>
<p>Consultados los antecedentes obrantes en este Registro, resulta que D./D.ª <b>ANTONIO JIMÉNEZ SOLER</b>, con DNI/NIE ${N.antonio}, nacido/a el 12/03/1948 en Antequera (Málaga), hijo/a de Manuel y Dolores, fallecido/a el día <b>20/04/2026</b>,</p>
<p><b>CONSTA</b> como otorgante de los siguientes actos de última voluntad:</p>
<table><tr><th>Tipo de acto</th><td>TESTAMENTO ABIERTO</td></tr><tr><th>Fecha del acto</th><td>15/06/2015</td></tr><tr><th>Notario</th><td>D. FERNANDO RUIZ CASTILLO</td></tr><tr><th>Localidad</th><td>MÁLAGA</td></tr><tr><th>Protocolo</th><td>1234</td></tr></table>
<p class="small" style="margin-top:14px">Lo que se certifica a los efectos oportunos. Este certificado se expide con los datos que constan en el Registro a la fecha de su emisión; los actos aparecen por orden cronológico y el último otorgado es, en principio, el vigente.</p>
<div class="firma"><span>Madrid, 28 de abril de 2026</span><span>Fecha de expedición: 28/04/2026</span></div>
<div class="csv mono">CSV: ULT-2026-00917733 (ficticio)</div>`);

// 3 · Seguros de fallecimiento
DOCS["03-certificado-seguros-fallecimiento.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro de Contratos de Seguros de cobertura de fallecimiento")}
<h1>Certificado de contratos de seguros de cobertura de fallecimiento</h1>
<p>Consultados los antecedentes obrantes en este Registro, resulta que D./D.ª <b>ANTONIO JIMÉNEZ SOLER</b>, con DNI ${N.antonio}, fallecido/a el día 20/04/2026,</p>
<p><b>CONSTA</b> como asegurado/a en los siguientes contratos de seguros de cobertura de fallecimiento:</p>
<table><tr><th>Entidad aseguradora</th><td>MAPFRE VIDA S.A.</td></tr><tr><th>Tipo de seguro</th><td>VIDA</td></tr><tr><th>Número de póliza</th><td>80012345</td></tr></table>
<br>
<table><tr><th>Entidad aseguradora</th><td>SANTALUCÍA SEGUROS</td></tr><tr><th>Tipo de seguro</th><td>DECESOS</td></tr><tr><th>Número de póliza</th><td>55-0098</td></tr></table>
<p class="small" style="margin-top:14px">Los beneficiarios deberán dirigirse a las entidades aseguradoras para conocer las condiciones y el capital asegurado. El Registro no dispone de esa información.</p>
<div class="firma"><span>Madrid, 28 de abril de 2026</span><span>Fecha de expedición: 28/04/2026</span></div>`);

// 4 · Testamento abierto (copia autorizada)
DOCS["04-testamento-abierto.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO MIL DOSCIENTOS TREINTA Y CUATRO.</p>
<h1>Testamento abierto</h1>
<p>En Málaga, mi residencia, a quince de junio de dos mil quince.</p>
<p>Ante mí, <b>FERNANDO RUIZ CASTILLO</b>, Notario del Ilustre Colegio de Andalucía, con residencia en esta ciudad,</p>
<p style="text-align:center"><b>COMPARECE:</b></p>
<p><b>DON ANTONIO JIMÉNEZ SOLER</b>, mayor de edad, casado en únicas nupcias en régimen legal de gananciales con DOÑA CARMEN RUIZ LÓPEZ, vecino de Málaga, con domicilio en calle Larios número 12, 3.º A, y con D.N.I. número ${N.antonio}.</p>
<p>Le identifico por su documento de identidad reseñado y tiene, a mi juicio, capacidad legal necesaria para otorgar este TESTAMENTO ABIERTO, y al efecto,</p>
<p style="text-align:center"><b>MANIFIESTA:</b></p>
<p>I.- Que es natural de Antequera (Málaga), nacido el doce de marzo de mil novecientos cuarenta y ocho, hijo de Don Manuel y de Doña Dolores, de vecindad civil común.</p>
<p>II.- Que de su matrimonio tiene cuatro hijos llamados CARMEN, LUIS, ANA y JAVIER JIMÉNEZ RUIZ, todos mayores de edad.</p>
<p style="text-align:center"><b>OTORGA</b> su testamento con arreglo a las siguientes <b>CLÁUSULAS:</b></p>
<p><b>PRIMERA.-</b> Lega a su esposa, DOÑA CARMEN RUIZ LÓPEZ, el usufructo universal y vitalicio de toda su herencia, relevándola de la obligación de formar inventario y de prestar fianza. Si alguno de los legitimarios no respetase este legado, su derecho quedará reducido a la legítima estricta, acreciendo el resto a los que lo respeten (cautela socini).</p>
<p><b>SEGUNDA.-</b> Lega a su sobrino DON MIGUEL JIMÉNEZ SOLER la plaza de garaje número 12 sita en el sótano del edificio de avenida de los Manantiales 5, de Torremolinos, con cargo al tercio de libre disposición.</p>
<p><b>TERCERA.-</b> Instituye herederos por partes iguales a sus cuatro hijos, CARMEN, LUIS, ANA y JAVIER JIMÉNEZ RUIZ, sustituidos vulgarmente por sus respectivos descendientes para los casos de premoriencia, incapacidad o renuncia.</p>
<p><b>CUARTA.-</b> Revoca cualquier disposición testamentaria anterior.</p>
<p>Así lo dice y otorga. Hechas las reservas y advertencias legales, leo este testamento al testador, por su elección, quien lo encuentra conforme, se ratifica y firma conmigo, el Notario, que doy fe de su contenido, de haberse observado las formalidades legales y de haberse otorgado en un solo acto.</p>
<p>Está la firma del testador.- Signado: Fernando Ruiz Castillo.- Rubricado y sellado.</p>
<p class="small">ES COPIA AUTORIZADA de su matriz, obrante en mi protocolo general corriente con el número al principio indicado, que expido a instancia de DOÑA CARMEN RUIZ LÓPEZ en siete folios de papel timbrado. Málaga, a treinta de abril de dos mil veintiséis.</p>
</div>`);

// 5 · Nota simple (vivienda, Málaga)
DOCS["05-nota-simple-vivienda-malaga.pdf"] = pagina(`${cab("Registro de la Propiedad de Málaga n.º 2", "Colegio de Registradores de la Propiedad y Mercantiles de España", "REG")}
<h1>Nota simple informativa</h1>
<table class="kv"><tr><td>Finca de MÁLAGA Nº</td><td>12345</td></tr><tr><td>CRU (Código Registral Único)</td><td class="mono">29012000123456</td></tr><tr><td>Tomo / Libro / Folio</td><td>2.345 / 456 / 78</td></tr></table>
<h2>Descripción de la finca</h2>
<p>URBANA: VIVIENDA tipo A en planta tercera del edificio sito en calle Larios número doce de Málaga. Tiene una superficie construida de ciento veinte metros cuadrados y útil de ciento cuatro metros cuadrados. Consta de vestíbulo, salón-comedor, cocina, tres dormitorios y dos baños. Linda: al frente, rellano de escalera y vivienda tipo B; derecha entrando, calle Larios; izquierda, patio de luces; fondo, finca de Don José Moreno. Cuota de participación: 2,50 %. Referencia catastral: 1234567VK4713S0001OQ.</p>
<h2>Titularidad</h2>
<p>DON ANTONIO JIMÉNEZ SOLER, con N.I.F. ${N.antonio}, casado con DOÑA CARMEN RUIZ LÓPEZ, con N.I.F. ${N.carmen}, titulares del pleno dominio de la totalidad de esta finca con carácter ganancial, por título de compraventa en escritura autorizada el 10/05/1995 por el notario de Málaga don Luis Pérez Gil, protocolo 2.100, inscrita al tomo 2.345, libro 456, folio 78, inscripción 4.ª.</p>
<h2>Cargas</h2>
<p>HIPOTECA a favor de UNICAJA BANCO, S.A., en garantía de un préstamo de un principal de 90.000,00 euros, intereses ordinarios de dos anualidades, intereses de demora de tres anualidades y 13.500,00 euros para costas y gastos, por plazo de 25 años, constituida en escritura autorizada el 10/05/2010 por el notario de Málaga don Luis Pérez Gil. Inscripción 5.ª.</p>
<p>No constan afecciones fiscales pendientes ni anotaciones de embargo. No hay documentos pendientes de despacho.</p>
<p class="small">Esta nota simple tiene valor puramente informativo y se expide a petición de interesado, con exclusión de los datos de carácter personal no necesarios para la finalidad declarada (art. 332 RH). Málaga, 5 de mayo de 2026. Honorarios: 3,64 € + IVA.</p>`);

// 6 · Nota simple (garaje, Torremolinos, privativo, libre de cargas)
// Formato de la nota simple telemática actual (notas simples públicas de fincas del Estado y de la Junta de Castilla y León): CSV, «NOTA SIMPLE
// INFORMATIVA TELEMATICA», «FINCA DE … Nº:», «Código Registral Único», «REFERENCIA CATASTRAL:», descripción en un párrafo, tabla «TITULAR NIF TOMO
// LIBRO FOLIO ALTA» con «APELLIDOS, NOMBRE» y, debajo, el derecho; «NO hay cargas registradas»
DOCS["06-nota-simple-garaje-torremolinos.pdf"] = pagina(`<div class="small mono">C.S.V.: 22903347F6B1A0C9 · Pág. 1 de 2 (ficticio)</div>
<p class="small">Información Registral expedida por: LAURA PÉREZ NAVAS, Registradora de la Propiedad de TORREMOLINOS Nº 1, correspondiente a la solicitud formulada por: DESPACHO JURÍDICO EJEMPLO, con DNI/CIF: B00000000. Interés legítimo alegado: Investigación jurídica sobre la titularidad.</p>
<h1>Nota simple informativa telemática</h1>
<p>Fecha de Emisión: 05/05/2026</p>
<table class="kv"><tr><td>FINCA DE TORREMOLINOS Nº:</td><td>777</td></tr><tr><td>Código Registral Único:</td><td class="mono">29033000000777</td></tr><tr><td>Tomo: 1820 Libro: 702 Folio: 33 Inscripción: 2 Fecha:</td><td>15/10/2004</td></tr><tr><td>REFERENCIA CATASTRAL:</td><td class="mono">9876543UF6597N0012GR</td></tr></table>
<h2>Descripción de la finca</h2>
<p>URBANA: Código Registral Unico: 29033000000777. PLAZA DE GARAJE número doce en la planta de sótano del edificio sito en avenida de los Manantiales número cinco, de Torremolinos. Tiene una superficie útil de doce metros cuadrados. Linda: frente, zona de rodadura; derecha, plaza número once; izquierda, plaza número trece; fondo, muro del edificio. Cuota: 0,45 %.</p>
<h2>Titularidades</h2>
<table><tr><th>TITULAR</th><th>NIF</th><th>TOMO</th><th>LIBRO</th><th>FOLIO</th><th>ALTA</th></tr><tr><td>JIMÉNEZ SOLER, ANTONIO</td><td>${N.antonio}</td><td>1820</td><td>702</td><td>33</td><td>2</td></tr></table>
<p>100,000000% (TOTALIDAD) del pleno dominio con carácter privativo por título de herencia, en escritura autorizada el 03/09/2004 por el notario de Torremolinos don Ignacio Vega Ríos.</p>
<h2>Cargas</h2>
<p>NO hay cargas registradas</p>
<h2>Documentos relativos a la finca presentados y pendientes de despacho</h2>
<p>No hay documentos pendientes de despacho</p>
<p class="small">AVISO: Los datos consignados en la presente nota simple se refieren al día de la fecha de su expedición, antes de la apertura del diario. Esta información registral tiene valor puramente indicativo (art. 222 LH y 332 RH).</p>`);

// 7 · Certificación catastral (vivienda)
DOCS["07-certificacion-catastral-vivienda.pdf"] = certCat({ ref: "1234567VK4713S0001OQ", loc: "CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA [MÁLAGA]", uso: "Residencial", sup: 120, anio: 1985, vc: "140.000,00", vs: "60.000,00", vcons: "80.000,00",
  tit: [["JIMÉNEZ SOLER ANTONIO", N.antonio, "50,00% de propiedad", "CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA [MÁLAGA]"], ["RUIZ LÓPEZ CARMEN", N.carmen, "50,00% de propiedad", "CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA [MÁLAGA]"]],
  cons: [["VIVIENDA", "1/03/A", "110"], ["ELEMENTOS COMUNES", "", "10"]], parcela: "1.240 m2", csv: "7K2QHD5ZF0WN3MXA" });
DOCS["26-certificado-valor-referencia-vivienda.pdf"] = certVR({ ref: "1234567VK4713S0001OQ", loc: "CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA (MÁLAGA)", uso: "Residencial", valor: "182.400,00", csv: "VR-29-2026-1A2B" });

// 8 · Recibo del IBI (garaje, Torremolinos)
DOCS["08-recibo-ibi-garaje-torremolinos.pdf"] = pagina(`${cab("Ayuntamiento de Torremolinos", "Patronato de Recaudación Provincial · Diputación de Málaga", "AYTO")}
<h1>Impuesto sobre Bienes Inmuebles de naturaleza urbana · Recibo</h1>
<table class="kv"><tr><td>Ejercicio</td><td>2026</td></tr><tr><td>Número de recibo</td><td class="mono">2026-IBIU-0456789</td></tr><tr><td>Referencia catastral</td><td class="mono">9876543UF6597N0012GR</td></tr><tr><td>Situación</td><td>AV DE LOS MANANTIALES 5 -1 12 · 29620 TORREMOLINOS (MÁLAGA)</td></tr><tr><td>Titular</td><td>JIMÉNEZ SOLER ANTONIO · ${N.antonio}</td></tr><tr><td>Uso</td><td>Aparcamiento</td></tr></table>
<h2>Liquidación</h2>
<table class="kv"><tr><td>Valor catastral suelo</td><td class="num">8.000,00</td></tr><tr><td>Valor catastral construcción</td><td class="num">10.000,00</td></tr><tr><td>Valor catastral</td><td class="num">18.000,00</td></tr><tr><td>Base liquidable</td><td class="num">18.000,00</td></tr><tr><td>Tipo de gravamen</td><td class="num">0,55 %</td></tr><tr><td>Cuota íntegra</td><td class="num">99,00 €</td></tr><tr><td>Cuota líquida</td><td class="num">99,00 €</td></tr></table>
<p class="small" style="margin-top:14px">Periodo voluntario de pago: del 1 de septiembre al 20 de noviembre de 2026. Domiciliado en ES21 2103 **** **** **** 9012.</p>`);

// 9 · Certificado bancario de posiciones
DOCS["09-certificado-bancario-unicaja.pdf"] = pagina(`${cab("Unicaja Banco, S.A.", "Oficina 2103-0456 · Calle Larios 8, Málaga · Servicio de Testamentarías", "UNI")}
<h1>Certificado de posiciones a fecha de fallecimiento</h1>
<p>UNICAJA BANCO, S.A., a solicitud de los herederos, <b>CERTIFICA</b> que D. <b>ANTONIO JIMÉNEZ SOLER</b>, con NIF ${N.antonio}, mantenía en esta entidad, a fecha <b>20/04/2026</b> (fecha del fallecimiento), las siguientes posiciones:</p>
<h2>Cuentas a la vista</h2>
<table><tr><th style="width:26%">Producto</th><th>IBAN</th><th>Titulares</th><th class="num">Saldo</th></tr>
<tr><td>Cuenta corriente</td><td class="mono">ES21 2103 0000 1234 5678 9012</td><td>Antonio Jiménez Soler y Carmen Ruiz López (indistinta)</td><td class="num">38.500,00 €</td></tr></table>
<h2>Ahorro a plazo</h2>
<table><tr><th style="width:26%">Producto</th><th>IBAN</th><th>Titulares</th><th class="num">Saldo</th></tr>
<tr><td>Depósito a plazo 12 meses</td><td class="mono">ES21 2103 0000 1234 5678 9013</td><td>Antonio Jiménez Soler</td><td class="num">60.000,00 €</td></tr></table>
<h2>Fondos de inversión</h2>
<table><tr><th style="width:26%">Producto</th><th>Participaciones</th><th>Valor liquidativo</th><th class="num">Valor total</th></tr>
<tr><td>Fondo de inversión Unifond Moderado FI</td><td class="num">1.234,5678</td><td class="num">36,45 €</td><td class="num">45.000,00 €</td></tr></table>
<h2>Préstamos</h2>
<table><tr><th style="width:26%">Producto</th><th>Garantía</th><th>Titulares</th><th class="num">Capital pendiente</th></tr>
<tr><td>Préstamo hipotecario</td><td>Vivienda calle Larios 12, 3.º A</td><td>Antonio Jiménez Soler y Carmen Ruiz López</td><td class="num">31.420,18 €</td></tr></table>
<p class="small" style="margin-top:14px">No constan cajas de seguridad ni otros productos. Se expide el presente certificado a efectos de la liquidación del Impuesto sobre Sucesiones y Donaciones, en Málaga, a 5 de mayo de 2026.</p>
<div class="firma"><span>Director de la oficina</span><span>Sello y firma</span></div>`);

// 10 · Escritura de compraventa (1995, pesetas)
DOCS["10-escritura-compraventa-1995.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO DOS MIL CIEN.</p>
<h1>Escritura de compraventa</h1>
<p>En Málaga, a diez de mayo de mil novecientos noventa y cinco.</p>
<p>Ante mí, <b>LUIS PÉREZ GIL</b>, Notario del Ilustre Colegio de Granada, con residencia en Málaga,</p>
<p style="text-align:center"><b>COMPARECEN:</b></p>
<p>De una parte, como vendedores, DON JOSÉ MORENO VARGAS y DOÑA ISABEL CANO RUIZ, mayores de edad, casados en régimen de gananciales, vecinos de Málaga.</p>
<p>De otra parte, como compradores, <b>DON ANTONIO JIMÉNEZ SOLER</b> y <b>DOÑA CARMEN RUIZ LÓPEZ</b>, mayores de edad, casados en régimen legal de gananciales, vecinos de Málaga, con D.N.I. números ${N.antonio} y ${N.carmen}.</p>
<p style="text-align:center"><b>EXPONEN:</b></p>
<p>I.- Que los vendedores son dueños con carácter ganancial de la siguiente finca: URBANA: VIVIENDA tipo A en planta tercera del edificio sito en calle Larios número doce de Málaga, de ciento veinte metros cuadrados construidos. Inscrita en el Registro de la Propiedad de Málaga número dos, finca 12.345. Referencia catastral 1234567VK4713S0001OQ.</p>
<p>II.- Que la finca se halla libre de cargas y arrendamientos y al corriente en el pago de gastos de comunidad.</p>
<p style="text-align:center"><b>ESTIPULACIONES:</b></p>
<p><b>PRIMERA.-</b> Los vendedores venden y transmiten a los compradores, que compran y adquieren para su sociedad de gananciales, la finca descrita, con cuanto le sea inherente y accesorio.</p>
<p><b>SEGUNDA.-</b> El precio de esta compraventa es de <b>DOCE MILLONES DE PESETAS (12.000.000 ptas.)</b>, que los vendedores confiesan haber recibido de los compradores con anterioridad a este acto, otorgando la más eficaz carta de pago.</p>
<p><b>TERCERA.-</b> Todos los gastos e impuestos derivados de esta escritura serán de cuenta de los compradores, salvo el Impuesto sobre el Incremento del Valor de los Terrenos de Naturaleza Urbana, que corresponde a los vendedores.</p>
<p>Así lo otorgan. Leída por mí esta escritura a los comparecientes, la aprueban y firman conmigo, el Notario, que doy fe.</p>
</div>`);

// 15 · Libro de familia (páginas de matrimonio e hijos, con texto)
DOCS["15-libro-de-familia.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro Civil · Libro de Familia")}
<h1>Libro de familia</h1>
<h2>Matrimonio</h2>
<p>Contraído en MÁLAGA el día 14 de junio de 1975. Registro Civil de Málaga, tomo 102, página 88.</p>
<table class="kv"><tr><td>MARIDO</td><td>DON ANTONIO JIMÉNEZ SOLER, nacido en Antequera el día 12 de marzo de 1948, hijo de Manuel y de Dolores. DNI ${N.antonio}</td></tr><tr><td>MUJER</td><td>DOÑA CARMEN RUIZ LÓPEZ, nacida en Málaga el día 14 de enero de 1952, hija de Pedro y de Carmen. DNI ${N.carmen}</td></tr></table>
<p>Régimen económico del matrimonio: el legal de gananciales.</p>
<h2>Hijos</h2>
<p>1.- CARMEN JIMÉNEZ RUIZ, nacida en Málaga el día 2 de mayo de 1976. Tomo 210, página 15.</p>
<p>2.- LUIS JIMÉNEZ RUIZ, nacido en Málaga el día 15 de julio de 1977. Tomo 214, página 102.</p>
<p>3.- ANA JIMÉNEZ RUIZ, nacida en Málaga el día 30 de septiembre de 1979. Tomo 221, página 44.</p>
<p>4.- JAVIER JIMÉNEZ RUIZ, nacido en Málaga el día 6 de marzo de 1980. Tomo 223, página 9.</p>
<p class="small" style="margin-top:18px">El Encargado del Registro Civil. Sello y firma.</p>`);

// 16 · Certificado de empadronamiento (Málaga)
DOCS["16-certificado-empadronamiento.pdf"] = pagina(`${cab("Ayuntamiento de Málaga", "Área de Gobierno Abierto · Padrón Municipal de Habitantes", "AYTO")}
<h1>Certificado de empadronamiento</h1>
<p>El Secretario General del Ayuntamiento de Málaga <b>CERTIFICA</b>: Que D. <b>ANTONIO JIMÉNEZ SOLER</b>, con DNI ${N.antonio}, nacido el 12/03/1948, figura inscrito en el Padrón Municipal de Habitantes de este municipio con domicilio en <b>CL LARIOS 12 Es:1 Pl:03 Pt:A, 29005 MÁLAGA</b>, desde el día 01/05/1996 (fecha de alta), habiendo causado baja por defunción el 20/04/2026.</p>
<h2>Personas que conviven en el mismo domicilio</h2>
<table><tr><th>Nombre y apellidos</th><th>Documento</th><th>Fecha de nacimiento</th><th>Fecha de alta</th></tr><tr><td>CARMEN RUIZ LÓPEZ</td><td>${N.carmen}</td><td>14/01/1952</td><td>01/05/1996</td></tr></table>
<p class="small" style="margin-top:14px">Se expide a petición de los herederos para su presentación ante la Agencia Tributaria de Andalucía. Málaga, 27 de abril de 2026.</p>
<div class="csv mono">CSV: PAD-2026-11-0045 (ficticio)</div>`);

// 17 · Póliza / certificado individual de seguro de vida
DOCS["17-poliza-seguro-vida-mapfre.pdf"] = pagina(`${cab("Mapfre Vida, S.A.", "Compañía de Seguros y Reaseguros sobre la Vida Humana (ficticio)", "MV")}
<h1>Certificado individual de seguro · Seguro de vida riesgo</h1>
<table class="kv"><tr><td>Póliza nº</td><td class="mono">80012345</td></tr><tr><td>Certificado nº</td><td>0001</td></tr><tr><td>Tomador del seguro</td><td>ANTONIO JIMÉNEZ SOLER · NIF ${N.antonio}</td></tr><tr><td>Asegurado</td><td>ANTONIO JIMÉNEZ SOLER</td></tr><tr><td>Fecha de efecto</td><td>01/06/2010</td></tr><tr><td>Duración</td><td>Anual renovable</td></tr></table>
<h2>Garantías y capitales asegurados</h2>
<table class="kv"><tr><td>Fallecimiento por cualquier causa</td><td class="num">50.000,00 €</td></tr><tr><td>Fallecimiento por accidente</td><td class="num">100.000,00 €</td></tr></table>
<h2>Beneficiarios</h2>
<p>Beneficiarios en caso de fallecimiento: el cónyuge del asegurado, DOÑA CARMEN RUIZ LÓPEZ; en su defecto, los hijos por partes iguales.</p>
<p>Prima anual: 412,30 €.</p>
<p class="small" style="margin-top:14px">Para el cobro del capital deberá aportarse certificado de defunción, certificado del Registro de Contratos de Seguros, DNI del beneficiario y justificante de la liquidación del Impuesto sobre Sucesiones.</p>`);

// 18 · Escritura de herencia anterior (título del garaje de Torremolinos)
DOCS["18-escritura-herencia-2004.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO MIL QUINIENTOS.</p>
<h1>Escritura de aceptación y adjudicación de herencia</h1>
<p>En Torremolinos, a tres de septiembre de dos mil cuatro.</p>
<p>Ante mí, <b>IGNACIO VEGA RÍOS</b>, Notario del Ilustre Colegio de Andalucía, con residencia en Torremolinos,</p>
<p style="text-align:center"><b>COMPARECEN:</b></p>
<p><b>DON ANTONIO JIMÉNEZ SOLER</b>, mayor de edad, casado, vecino de Málaga, con D.N.I. número ${N.antonio}, y <b>DOÑA ISABEL JIMÉNEZ SOLER</b>, mayor de edad, soltera, vecina de Antequera, con D.N.I. número ${nif(74333444)}.</p>
<p style="text-align:center"><b>EXPONEN:</b></p>
<p>I.- Que DON MANUEL JIMÉNEZ GARCÍA falleció en Antequera el día 4 de enero de 2004, en estado de viudo, bajo testamento otorgado ante el Notario de Antequera don Pedro Ruiz Vallejo el 2 de febrero de 1990, en el que instituyó herederos por partes iguales a sus dos hijos, los comparecientes.</p>
<p>II.- INVENTARIO. ACTIVO:</p>
<p>1.- URBANA: PLAZA DE GARAJE número doce en la planta de sótano del edificio sito en avenida de los Manantiales número cinco, de Torremolinos. Referencia catastral 9876543UF6597N0012GR. Inscrita en el Registro de la Propiedad de Torremolinos nº 1, finca 777. Se valora en NUEVE MIL EUROS (9.000,00 €).</p>
<p>2.- RÚSTICA: Parcela de secano en el pago de la Vega, término de Antequera, de dos hectáreas. Referencia catastral 29015A012003450000LU. Valorada en 12.000,00 euros.</p>
<p>3.- Saldo en cuenta corriente en Unicaja, 6.000,00 euros.</p>
<p>Total activo: 27.000,00 euros. No hay pasivo.</p>
<p>III.- ADJUDICACIONES. A DON ANTONIO JIMÉNEZ SOLER se le adjudica la finca descrita bajo el número 1 del inventario, valorada en 9.000,00 €, y la mitad del saldo. A DOÑA ISABEL JIMÉNEZ SOLER se le adjudica la finca descrita bajo el número 2, valorada en 12.000,00 €, y la otra mitad del saldo.</p>
<p>Así lo otorgan y firman conmigo, el Notario, que doy fe.</p>
</div>`);

// 19 · Permiso de circulación (DGT)
DOCS["19-permiso-circulacion.pdf"] = pagina(`${cab("Ministerio del Interior", "Dirección General de Tráfico · Jefatura Provincial de Tráfico de Málaga", "DGT")}
<h1>Permiso de circulación</h1>
<table class="kv"><tr><td>A Matrícula</td><td class="mono"><b>1234 BCD</b></td></tr><tr><td>B Fecha de primera matriculación</td><td>12/05/2015</td></tr><tr><td>I Fecha de matriculación</td><td>12/05/2015</td></tr><tr><td>D.1 Marca</td><td>SEAT</td></tr><tr><td>D.2 Tipo/Variante/Versión</td><td>5F/ABC/XYZ</td></tr><tr><td>D.3 Denominación comercial</td><td>LEON</td></tr><tr><td>E Número de identificación del vehículo</td><td class="mono">VSSZZZ5FZFR012345</td></tr><tr><td>C.1.1 Apellidos y nombre o razón social</td><td>JIMÉNEZ SOLER, ANTONIO</td></tr><tr><td>C.1.3 Domicilio</td><td>CL LARIOS 12 3 A 29005 MÁLAGA</td></tr><tr><td>J Categoría del vehículo</td><td>M1</td></tr><tr><td>P.1 Cilindrada</td><td>1598</td></tr><tr><td>P.3 Tipo de combustible</td><td>Gasolina</td></tr></table>
<p class="small" style="margin-top:14px">Documento ficticio con la estructura del permiso de circulación europeo (códigos armonizados).</p>`);

// 20 · Certificado bancario CaixaBank (otro formato: saldo delante, € delante, préstamo personal, tarjeta, 50 %)
DOCS["20-certificado-caixabank.pdf"] = pagina(`${cab("CaixaBank, S.A.", "Testamentarías · Oficina 0418 Málaga-Larios", "CB")}
<h1>Certificado de saldos a fecha de fallecimiento (20/04/2026)</h1>
<p>Titular: <b>ANTONIO JIMÉNEZ SOLER</b> · NIF ${N.antonio}</p>
<table><tr><th class="num" style="width:18%">Saldo</th><th>Producto</th><th>Contrato</th><th>Titularidad</th></tr>
<tr><td class="num">€ 7.250,40</td><td>Cuenta corriente</td><td class="mono">ES76 2100 0418 4502 0005 1332</td><td>50 % (cotitular: Carmen Ruiz López)</td></tr>
<tr><td class="num">€ 15.000,00</td><td>Depósito a plazo 24 meses</td><td class="mono">ES76 2100 0418 4502 0005 1333</td><td>100 %</td></tr></table>
<h2>Fondos y planes</h2>
<p>Fondo de inversión CaixaBank Selección Tendencias FI · 812,3300 participaciones · valor liquidativo 18,4567 € · valoración € 14.993,20 · 100 %</p>
<p>Plan de pensiones CaixaBank Equilibrio · derechos consolidados € 22.000,00 · beneficiarios designados</p>
<h2>Financiación</h2>
<p>Préstamo personal nº 9876-5 · capital pendiente € 5.400,00 · titular único</p>
<p>Tarjeta de crédito Visa Classic ****1234 · saldo deudor 850,75 €</p>
<p class="small" style="margin-top:14px">Certificado expedido a efectos del Impuesto sobre Sucesiones. Málaga, 6 de mayo de 2026.</p>`);

// 21 · Recibo del IBI con dos inmuebles (Patronato de Recaudación de Málaga)
DOCS["21-recibo-ibi-dos-inmuebles-patronato.pdf"] = pagina(`${cab("Patronato de Recaudación Provincial", "Diputación de Málaga · Ayuntamiento de Málaga", "PRP")}
<h1>Impuesto sobre Bienes Inmuebles · Relación de recibos del contribuyente · Ejercicio 2026</h1>
<p>Contribuyente: JIMÉNEZ SOLER ANTONIO · ${N.antonio}</p>
<table><tr><th>Situación</th><th>Ref. catastral</th><th>Uso</th><th class="num">Valor catastral</th><th class="num">Valor catastral suelo</th><th class="num">Cuota</th></tr>
<tr><td>CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MÁLAGA (MÁLAGA)</td><td class="mono">1234567VK4713S0001OQ</td><td>Residencial</td><td class="num">140.000,00</td><td class="num">60.000,00</td><td class="num">770,00 €</td></tr>
<tr><td>CL LARIOS 12 Es:1 Pl:-1 Pt:12 29005 MÁLAGA (MÁLAGA)</td><td class="mono">1234567VK4713S0012JO</td><td>Aparcamiento</td><td class="num">15.000,00</td><td class="num">7.000,00</td><td class="num">82,50 €</td></tr></table>
<p class="small" style="margin-top:14px">Total: 852,50 €. Periodo voluntario: 1 de septiembre a 20 de noviembre de 2026.</p>`);

// 22 · Carta del banco (documento ajeno: sin datos)
DOCS["22-carta-banco.pdf"] = pagina(`${cab("Unicaja Banco, S.A.", "Departamento de Testamentarías", "UNI")}
<p>Málaga, 2 de mayo de 2026</p>
<p>Estimada Sra. Ruiz López:</p>
<p>En relación con su solicitud relativa al fallecimiento de D. Antonio Jiménez Soler, le informamos de que la documentación recibida está completa y de que en los próximos días recibirá el certificado de posiciones a fecha de fallecimiento. Le recordamos que para la disposición de los saldos será necesaria la escritura de adjudicación de herencia y la justificación del pago del Impuesto sobre Sucesiones.</p>
<p>Quedamos a su disposición para cualquier aclaración.</p>
<p>Atentamente,</p>
<p>Departamento de Testamentarías</p>`);

// 23 · Factura de la funeraria (gasto deducible de entierro y funeral)
DOCS["23-factura-funeraria.pdf"] = pagina(`${cab("Funeraria La Paz, S.L.", "CIF B29111111 (ficticio) · Camino del Cementerio 3, Málaga", "FLP")}
<h1>Factura nº 2026/0412</h1>
<table class="kv"><tr><td>Fecha</td><td>22/04/2026</td></tr><tr><td>Cliente</td><td>CARMEN RUIZ LÓPEZ · ${N.carmen}</td></tr><tr><td>Concepto</td><td>Servicio funerario completo de D. Antonio Jiménez Soler: féretro, traslado, tanatorio 24 h, inhumación</td></tr></table>
<table class="kv" style="margin-top:12px"><tr><td>Base imponible</td><td class="num">3.200,00 €</td></tr><tr><td>IVA 21 %</td><td class="num">672,00 €</td></tr><tr><td><b>Total factura</b></td><td class="num"><b>3.872,00 €</b></td></tr></table>`);

// 24 · Certificado de valor de referencia (garaje de Torremolinos): el recibo del IBI no lo trae
DOCS["24-certificado-valor-referencia-garaje.pdf"] = pagina(`${cab("Ministerio de Hacienda", "Dirección General del Catastro · Sede Electrónica", "CAT")}
<h1>Certificado de valor de referencia</h1>
<table class="kv"><tr><td>Referencia catastral</td><td class="mono">9876543UF6597N0012GR</td></tr><tr><td>Localización</td><td>AV DE LOS MANANTIALES 5 -1 12 29620 TORREMOLINOS (MÁLAGA)</td></tr><tr><td>Uso</td><td>Aparcamiento</td></tr><tr><td>Fecha de referencia</td><td>01/01/2026</td></tr><tr><td>Valor de referencia del inmueble</td><td class="num"><b>21.300,00 €</b></td></tr></table>
<p class="small" style="margin-top:14px">El valor de referencia se determina por la Dirección General del Catastro conforme a la disposición final tercera de la Ley 11/2021 y al artículo 9.3 de la Ley 29/1987 del Impuesto sobre Sucesiones y Donaciones. Certificado expedido el 6 de mayo de 2026.</p>
<div class="csv mono">CSV: VR-29-2026-77AC (ficticio)</div>`);

// 25 · Datos fiscales de la AEAT del causante (ejercicio 2025): cuentas, fondos, acciones (una que no sale en ningún banco) e inmuebles
DOCS["25-datos-fiscales-2025.pdf"] = pagina(`${cab("Agencia Tributaria", "Renta 2025 · Servicio de datos fiscales", "AEAT")}
<h1>Datos fiscales del ejercicio 2025</h1>
<p>Impuesto sobre la Renta de las Personas Físicas · NIF: ${N.antonio} · Apellidos y nombre: JIMÉNEZ SOLER ANTONIO</p>
<h2>Cuentas bancarias</h2>
<table class="ancha"><tr><th>Entidad</th><th>Código IBAN</th><th>Nº titulares</th><th class="num">Saldo a 31/12</th><th class="num">Saldo medio 4.º trimestre</th></tr>
<tr><td>UNICAJA BANCO SA</td><td class="mono">ES21 2103 0000 1234 5678 9012</td><td>2</td><td class="num">36.940,10</td><td class="num">35.120,44</td></tr>
<tr><td>UNICAJA BANCO SA</td><td class="mono">ES21 2103 0000 1234 5678 9013</td><td>1</td><td class="num">60.000,00</td><td class="num">60.000,00</td></tr>
<tr><td>CAIXABANK SA</td><td class="mono">ES76 2100 0418 4502 0005 1332</td><td>2</td><td class="num">6.980,00</td><td class="num">7.104,12</td></tr>
<tr><td>CAIXABANK SA</td><td class="mono">ES76 2100 0418 4502 0005 1333</td><td>1</td><td class="num">15.000,00</td><td class="num">15.000,00</td></tr></table>
<h2>Fondos de inversión</h2>
<table class="ancha"><tr><th>Entidad gestora</th><th>Denominación</th><th class="num">Nº participaciones</th><th class="num">Valoración</th></tr>
<tr><td>UNIGEST SGIIC</td><td>UNIFOND MODERADO FI</td><td class="num">1.234,5678</td><td class="num">44.120,00</td></tr>
<tr><td>CAIXABANK ASSET MANAGEMENT SGIIC</td><td>CAIXABANK SELECCION TENDENCIAS FI</td><td class="num">812,3300</td><td class="num">14.500,00</td></tr></table>
<h2>Valores cotizados</h2>
<table class="ancha"><tr><th>Entidad emisora</th><th>ISIN</th><th class="num">Nº de valores</th><th class="num">Valoración a 31/12</th></tr>
<tr><td>TELEFONICA SA</td><td class="mono">ES0178430E18</td><td class="num">2.000</td><td class="num">7.740,00</td></tr></table>
<h2>Inmuebles</h2>
<table class="ancha"><tr><th>Situación</th><th>Referencia catastral</th><th>Titularidad</th><th>Uso</th><th class="num">Valor catastral</th></tr>
<tr><td class="sit">CL LARIOS 12 Es:1 Pl:03 Pt:A 29005 MALAGA (MALAGA)</td><td class="mono">1234567VK4713S0001OQ</td><td>50,00 %</td><td>Vivienda habitual</td><td class="num">140.000,00</td></tr>
<tr><td class="sit">AV DE LOS MANANTIALES 5 -1 12 29620 TORREMOLINOS (MALAGA)</td><td class="mono">9876543UF6597N0012GR</td><td>100,00 %</td><td>A disposición del titular</td><td class="num">18.000,00</td></tr>
<tr><td class="sit">CL LARIOS 12 Es:1 Pl:-1 Pt:12 29005 MALAGA (MALAGA)</td><td class="mono">1234567VK4713S0012JO</td><td>50,00 %</td><td>A disposición del titular</td><td class="num">15.000,00</td></tr></table>
<h2>Rendimientos del trabajo</h2>
<table class="ancha"><tr><th>Pagador</th><th>Concepto</th><th class="num">Íntegro</th></tr><tr><td>INSS</td><td>Pensión de jubilación</td><td class="num">21.400,00</td></tr></table>
<p class="small" style="margin-top:12px">Información facilitada por la Agencia Tributaria con los datos de que dispone a la fecha (ficticio).</p>`);

// ══ CASO 2 · Herencia intestada de María Dolores Ruiz Cano (Torremolinos) → carpeta caso2-intestada-torremolinos ══
const N2 = { dolores: nif(53000111), pablo: nif(74111222), elena: nif(74111333), jorge: nif(74111444), marcos: nif(79000111), lucia: nif(79000222) };
const DOCS2 = {};
// 01 · Certificado literal de defunción en papel antiguo (texto corrido)
DOCS2["01-certificado-literal-defuncion-antiguo.pdf"] = pagina(`<div class="not" style="font-family:'Liberation Mono','DejaVu Sans Mono',monospace;font-size:11pt">
<p style="text-align:center">REGISTRO CIVIL DE TORREMOLINOS<br>Sección 3.ª · Tomo 88 · Página 214</p>
<p>DON PEDRO GÓMEZ VERA, Juez Encargado del Registro Civil de Torremolinos,</p>
<p>CERTIFICO: Que al tomo y página citados figura la siguiente inscripción de defunción:</p>
<p>Doña MARÍA DOLORES RUIZ CANO, hija de Antonio y de Dolores, natural de Sevilla, de setenta y nueve años de edad, de estado viuda de Don JOSÉ GARCÍA PÉREZ, con domicilio en Torremolinos, avenida de los Manantiales número cinco, FALLECIÓ en Torremolinos el día tres de febrero de dos mil veintiséis, a las veintidós horas, a consecuencia de insuficiencia cardiaca, según certificación médica.</p>
<p>Y para que conste, expido la presente en Torremolinos, a nueve de febrero de dos mil veintiséis.</p>
<p style="text-align:right">El Juez Encargado. Sello.</p>
</div>`);
// 02 · Certificado plurilingüe (Convenio de Viena 1976, formulario C)
DOCS2["02-certificado-plurilingue-defuncion.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro Civil · Extracto de acta de defunción · Convention de Vienne du 8 septembre 1976")}
<table class="kv">
<tr><td>1 ÉTAT / ESTADO</td><td>ESPAÑA</td></tr><tr><td>2 Service de l'état civil de / Registro Civil de</td><td>TORREMOLINOS</td></tr>
<tr><td>3 Extrait de l'acte de décès nº / Extracto del acta de defunción nº</td><td>000214</td></tr>
<tr><td>4 Date et lieu du décès / Fecha y lugar de la defunción</td><td>03 02 2026 TORREMOLINOS</td></tr>
<tr><td>5 Nom / Apellidos</td><td>RUIZ CANO</td></tr><tr><td>6 Prénoms / Nombre</td><td>MARÍA DOLORES</td></tr><tr><td>7 Sexe / Sexo</td><td>F</td></tr>
<tr><td>8 Date et lieu de naissance / Fecha y lugar de nacimiento</td><td>22 11 1946 SEVILLA</td></tr>
<tr><td>9 Nom du dernier conjoint / Apellidos del último cónyuge</td><td>GARCÍA PÉREZ</td></tr><tr><td>10 Prénoms du dernier conjoint / Nombre del último cónyuge</td><td>JOSÉ</td></tr>
<tr><td>11 Nom du père / Apellidos del padre</td><td>RUIZ MORENO</td></tr><tr><td>12 Prénoms du père / Nombre del padre</td><td>ANTONIO</td></tr>
<tr><td>13 Date de délivrance / Fecha de expedición</td><td>10 02 2026</td></tr></table>
<p class="small" style="margin-top:12px">Jo = jour / día · Mo = mois / mes · An = année / año · M = masculin · F = féminin. Formule C.</p>`);
// 03 · Últimas voluntades: no consta
DOCS2["03-certificado-ultimas-voluntades-no-consta.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro General de Actos de Última Voluntad")}
<h1>Certificado de actos de última voluntad</h1>
<p>Consultados los antecedentes obrantes en este Registro, resulta que D./D.ª <b>MARÍA DOLORES RUIZ CANO</b>, con DNI ${N2.dolores}, nacida el 22/11/1946 en Sevilla, fallecida el día <b>03/02/2026</b>, <b>NO CONSTA</b> como otorgante de acto alguno de última voluntad.</p>
<div class="firma"><span>Madrid, 20 de febrero de 2026</span><span>Fecha de expedición: 20/02/2026</span></div>`);
// 04 · Acta de declaración de herederos abintestato
DOCS2["04-acta-declaracion-herederos.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO SETECIENTOS OCHENTA Y NUEVE.</p>
<h1>Acta de declaración de herederos abintestato</h1>
<p>En Torremolinos, a doce de mayo de dos mil veintiséis.</p>
<p>Ante mí, <b>LUISA MARTÍN SANZ</b>, Notaria del Ilustre Colegio de Andalucía, con residencia en Torremolinos,</p>
<p style="text-align:center"><b>COMPARECE:</b></p>
<p><b>DON PABLO GARCÍA RUIZ</b>, mayor de edad, casado, vecino de Torremolinos, con D.N.I. número ${N2.pablo}.</p>
<p>INTERVIENE en su propio nombre y derecho, como hijo de la causante, y me REQUIERE para que declare quiénes son sus herederos abintestato.</p>
<p style="text-align:center"><b>EXPONE:</b></p>
<p>I.- Que su madre, DOÑA MARÍA DOLORES RUIZ CANO, falleció en Torremolinos el día tres de febrero de dos mil veintiséis, según acredita con el certificado de defunción, en estado de viuda de DON JOSÉ GARCÍA PÉREZ, fallecido el día 2 de junio de 2015, sin haber otorgado testamento, según resulta del certificado del Registro General de Actos de Última Voluntad.</p>
<p>II.- Que de su matrimonio tuvo tres hijos llamados DON PABLO, DOÑA ELENA y DON JORGE GARCÍA RUIZ, habiendo fallecido este último con anterioridad a la causante, el día 9 de agosto de 2020, dejando dos hijos, DON MARCOS y DOÑA LUCÍA GARCÍA MORENO.</p>
<p style="text-align:center"><b>DECLARACIÓN:</b></p>
<p>Yo, la Notaria, considerando acreditados los hechos por la documentación aportada y la declaración de dos testigos, DECLARO HEREDEROS ABINTESTATO de DOÑA MARÍA DOLORES RUIZ CANO a sus hijos DON PABLO GARCÍA RUIZ y DOÑA ELENA GARCÍA RUIZ, por terceras partes iguales, y a sus nietos DON MARCOS GARCÍA MORENO y DOÑA LUCÍA GARCÍA MORENO, en representación de su padre premuerto DON JORGE GARCÍA RUIZ, por sextas partes.</p>
<p>Así lo digo y otorgo. Doy fe.</p>
</div>`);
// 05 · Certificado de nacimiento (Registro Civil electrónico) de un hijo
DOCS2["05-certificado-nacimiento-pablo.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro Civil de Torremolinos")}
<h1>Certificado de inscripción de nacimiento</h1>
<h2>Datos del inscrito</h2>
<table class="kv"><tr><td>Nombre</td><td>PABLO</td></tr><tr><td>Primer apellido</td><td>GARCÍA</td></tr><tr><td>Segundo apellido</td><td>RUIZ</td></tr><tr><td>Sexo</td><td>Varón</td></tr><tr><td>Fecha de nacimiento</td><td>18/09/1972</td></tr><tr><td>Lugar de nacimiento</td><td>Torremolinos</td></tr></table>
<h2>Padre</h2>
<table class="kv"><tr><td>Nombre</td><td>JOSÉ</td></tr><tr><td>Primer apellido</td><td>GARCÍA</td></tr><tr><td>Segundo apellido</td><td>PÉREZ</td></tr><tr><td>Fecha de nacimiento</td><td>03/05/1944</td></tr></table>
<h2>Madre</h2>
<table class="kv"><tr><td>Nombre</td><td>MARÍA DOLORES</td></tr><tr><td>Primer apellido</td><td>RUIZ</td></tr><tr><td>Segundo apellido</td><td>CANO</td></tr><tr><td>Fecha de nacimiento</td><td>22/11/1946</td></tr></table>
<div class="firma"><span>Torremolinos, 15 de febrero de 2026</span><span>Firmado electrónicamente</span></div>`);
// 06 · Volante de empadronamiento colectivo
DOCS2["06-volante-empadronamiento.pdf"] = pagina(`${cab("Ayuntamiento de Torremolinos", "Padrón Municipal de Habitantes", "AYTO")}
<h1>Volante de empadronamiento colectivo</h1>
<p>Según los datos del Padrón Municipal de Habitantes, en el domicilio <b>AV DE LOS MANANTIALES 5 Pl:02 Pt:B, 29620 TORREMOLINOS (MÁLAGA)</b> figuran inscritas las personas siguientes:</p>
<table><tr><th>Nombre y apellidos</th><th>Documento</th><th>Fecha de nacimiento</th><th>Fecha de alta</th></tr><tr><td>MARÍA DOLORES RUIZ CANO</td><td>${N2.dolores}</td><td>22/11/1946</td><td>15/03/1988</td></tr></table>
<p class="small" style="margin-top:14px">Torremolinos, 10 de febrero de 2026. Este volante no requiere firma.</p>`);
// 07 · Nota simple con dos fincas (Torremolinos)
DOCS2["07-nota-simple-dos-fincas-torremolinos.pdf"] = pagina(`${cab("Registro de la Propiedad de Torremolinos n.º 1", "Colegio de Registradores de la Propiedad y Mercantiles de España", "REG")}
<h1>Nota simple informativa</h1>
<p class="small">Solicitante: despacho de abogados · Finalidad: tramitación de herencia · Titular consultado: RUIZ CANO MARÍA DOLORES</p>
<table class="kv"><tr><td>FINCA DE TORREMOLINOS Nº</td><td>2001</td></tr><tr><td>CRU</td><td class="mono">29033000002001</td></tr></table>
<h2>Descripción</h2>
<p>URBANA: VIVIENDA letra B en planta segunda del edificio sito en avenida de los Manantiales número cinco, de Torremolinos. Tiene una superficie construida de noventa metros cuadrados. Linda: frente, rellano; derecha, vivienda letra A; izquierda, vuelo de la avenida; fondo, patio. Cuota: 3,10 %. Referencia catastral: 9876543UF6597N0002IB.</p>
<h2>Titularidad</h2>
<p>DOÑA MARÍA DOLORES RUIZ CANO, con N.I.F. ${N2.dolores}, viuda, titular del pleno dominio de la totalidad de esta finca con carácter privativo, por título de liquidación de gananciales y herencia de su esposo, en escritura autorizada el 20/11/2015 por la notaria de Torremolinos doña Luisa Martín Sanz.</p>
<h2>Cargas</h2>
<p>Libre de cargas y gravámenes.</p>
<hr style="margin:22px 0;border:0;border-top:1px dashed #999">
<table class="kv"><tr><td>FINCA DE TORREMOLINOS Nº</td><td>2002</td></tr><tr><td>CRU</td><td class="mono">29033000002002</td></tr></table>
<h2>Descripción</h2>
<p>URBANA: LOCAL COMERCIAL en planta baja del edificio sito en avenida de los Manantiales número cinco, de Torremolinos. Superficie construida de cuarenta y cinco metros cuadrados. Cuota: 1,80 %. Referencia catastral: 9876543UF6597N0001UL.</p>
<h2>Titularidad</h2>
<p>DOÑA MARÍA DOLORES RUIZ CANO, con N.I.F. ${N2.dolores}, titular del usufructo vitalicio de la totalidad. DON PABLO GARCÍA RUIZ, con N.I.F. ${N2.pablo}, y DOÑA ELENA GARCÍA RUIZ, con N.I.F. ${N2.elena}, titulares por mitades indivisas de la nuda propiedad, con carácter privativo, por título de herencia de su padre.</p>
<h2>Cargas</h2>
<p>Libre de cargas. No hay documentos pendientes de despacho.</p>
<p class="small" style="margin-top:14px">Nota simple expedida el 12 de febrero de 2026.</p>`);
// 08 · Nota simple de Sevilla: rústica en proindiviso por tercios
DOCS2["08-nota-simple-rustica-sevilla.pdf"] = pagina(`${cab("Registro de la Propiedad n.º 3 de Sevilla", "Colegio de Registradores de la Propiedad y Mercantiles de España", "REG")}
<h1>Nota simple</h1>
<p>FINCA Nº 45678 DE SEVILLA. CRU 41003000456789.</p>
<p>RÚSTICA.- Suerte de tierra de olivar en el término de Carmona, al sitio de la Vega, de tres hectáreas. Linda: norte, camino; sur, arroyo; este y oeste, fincas de otros propietarios. Referencia catastral 41024A005000120000KK.</p>
<p>TITULARIDAD: DOÑA MARÍA DOLORES RUIZ CANO, con N.I.F. ${N2.dolores}, viuda, titular de una tercera parte indivisa del pleno dominio, con carácter privativo, por título de herencia de sus padres. DON ANTONIO RUIZ CANO, con N.I.F. ${nif(28000111)}, y DOÑA ROSARIO RUIZ CANO, con N.I.F. ${nif(28000222)}, titulares de una tercera parte indivisa cada uno del pleno dominio.</p>
<p>CARGAS: No constan cargas.</p>
<p class="small">Nota simple informativa expedida el 14 de febrero de 2026.</p>`);
// 09 · IBI de SUMA (Alicante) con etiquetas abreviadas
DOCS2["09-recibo-ibi-suma-altea.pdf"] = pagina(`${cab("SUMA Gestión Tributaria", "Diputación de Alicante · Ayuntamiento de Altea", "SUMA")}
<h1>IBI Urbana · Ejercicio 2026 · Recibo 2026-0451122</h1>
<table class="kv"><tr><td>Objeto tributario</td><td>AV DEL MEDITERRANEO 15 Es:1 Pl:04 Pt:B 03590 ALTEA</td></tr><tr><td>Ref. catastral</td><td class="mono">5555555YH5755N0012HA</td></tr><tr><td>Titular</td><td>RUIZ CANO MARÍA DOLORES · ${N2.dolores}</td></tr></table>
<table class="kv" style="margin-top:12px"><tr><td>Val. cat.</td><td class="num">72.400,00</td></tr><tr><td>Val. cat. suelo</td><td class="num">31.000,00</td></tr><tr><td>Base liquidable</td><td class="num">72.400,00</td></tr><tr><td>Tipo</td><td class="num">0,62 %</td></tr><tr><td>Cuota</td><td class="num">448,88 €</td></tr></table>`);
// 10 · Certificado Santander (saldo al final, acciones, descubierto)
DOCS2["10-certificado-santander.pdf"] = pagina(`${cab("Banco Santander, S.A.", "Certificado de posiciones del cliente fallecido · Testamentarías", "BS")}
<h1>Certificado de posiciones</h1>
<p>D.ª <b>MARÍA DOLORES RUIZ CANO</b> · NIF ${N2.dolores} · Fecha de fallecimiento 03/02/2026</p>
<table><tr><th>Tipo de producto</th><th>Número</th><th>Intervinientes</th><th class="num">Saldo a fecha de fallecimiento</th></tr>
<tr><td>Cuenta Online</td><td class="mono">ES91 0049 1500 0512 3456 7890</td><td>María Dolores Ruiz Cano (titular)</td><td class="num">2.310,55 EUR</td></tr>
<tr><td>Acciones Banco Santander</td><td>1.500 títulos</td><td>María Dolores Ruiz Cano</td><td class="num">6.180,00 EUR</td></tr>
<tr><td>Cuenta corriente</td><td class="mono">ES91 0049 1500 0512 3456 7891</td><td>María Dolores Ruiz Cano (titular)</td><td class="num">-120,30 EUR</td></tr></table>
<p class="small" style="margin-top:14px">Torremolinos, 18 de febrero de 2026.</p>`);
// 11 · Permiso de circulación con matrícula antigua
DOCS2["11-permiso-circulacion-renault.pdf"] = pagina(`${cab("Ministerio del Interior", "Dirección General de Tráfico", "DGT")}
<h1>Permiso de circulación</h1>
<table class="kv"><tr><td>Matrícula</td><td class="mono"><b>MA-1234-CS</b></td></tr><tr><td>Fecha de matriculación</td><td>03/02/1999</td></tr><tr><td>Marca</td><td>RENAULT</td></tr><tr><td>Denominación comercial</td><td>CLIO</td></tr><tr><td>Nº de bastidor</td><td class="mono">VF1BFB00012345678</td></tr><tr><td>Titular</td><td>RUIZ CANO, MARÍA DOLORES</td></tr><tr><td>Cilindrada</td><td>1149 cm3</td></tr><tr><td>Potencia fiscal</td><td>9,12 CVF</td></tr><tr><td>Categoría</td><td>M1</td></tr></table>`);
// 12 · Modelo 650 en borrador
DOCS2["12-modelo-650-borrador.pdf"] = pagina(`${cab("Agencia Tributaria de Andalucía", "Modelo 650 · Impuesto sobre Sucesiones y Donaciones · Autoliquidación · Adquisiciones mortis causa", "ATRIAN")}
<div class="sello">BORRADOR · NO PRESENTADO</div>
<h2>Causante</h2>
<table class="kv"><tr><td>Apellidos y nombre</td><td>RUIZ CANO MARÍA DOLORES</td></tr><tr><td>NIF</td><td>${N2.dolores}</td></tr><tr><td>Fecha de devengo</td><td>03/02/2026</td></tr><tr><td>Residencia habitual</td><td>TORREMOLINOS</td></tr></table>
<h2>Sujeto pasivo</h2>
<table class="kv"><tr><td>Apellidos y nombre</td><td>GARCÍA RUIZ PABLO</td></tr><tr><td>NIF</td><td>${N2.pablo}</td></tr><tr><td>Parentesco</td><td>Hijo</td></tr><tr><td>Grupo</td><td>II</td></tr></table>
<h2>Liquidación</h2>
<table class="kv"><tr><td>Valor real de los bienes y derechos (01)</td><td class="num">61.300,00</td></tr><tr><td>Base imponible (10)</td><td class="num">61.300,00</td></tr><tr><td>Reducciones (20)</td><td class="num">61.300,00</td></tr><tr><td>Base liquidable (30)</td><td class="num">0,00</td></tr><tr><td>Cuota íntegra (40)</td><td class="num">0,00</td></tr><tr><td>Total a ingresar (60)</td><td class="num">0,00</td></tr></table>`);
// 15 · Certificación catastral de la vivienda de Torremolinos (con valor de referencia)
DOCS2["15-certificacion-catastral-vivienda-torremolinos.pdf"] = certCat({ ref: "9876543UF6597N0002IB", loc: "AV DE LOS MANANTIALES 5 Pl:02 Pt:B 29620 TORREMOLINOS [MÁLAGA]", uso: "Residencial", sup: 90, anio: 1978, vc: "61.000,00", vs: "27.500,00", vcons: "33.500,00",
  tit: [["RUIZ CANO MARÍA DOLORES", N2.dolores, "100,00% de propiedad", "AV DE LOS MANANTIALES 5 Pl:02 Pt:B 29620 TORREMOLINOS [MÁLAGA]"]], cons: [["VIVIENDA", "1/02/B", "82"], ["ELEMENTOS COMUNES", "", "8"]], parcela: "860 m2", fecha: "11/02/2026", csv: "M4X8TJ2RQ6YB0CZN" });
DOCS2["18-certificado-valor-referencia-vivienda-torremolinos.pdf"] = certVR({ ref: "9876543UF6597N0002IB", loc: "AV DE LOS MANANTIALES 5 Pl:02 Pt:B 29620 TORREMOLINOS (MÁLAGA)", uso: "Residencial", valor: "148.900,00", fecha: "11 de febrero de 2026", csv: "VR-29-2026-5C6D" });
// 16 · Certificado de valor de referencia (Altea)
DOCS2["16-certificado-valor-referencia-altea.pdf"] = pagina(`${cab("Ministerio de Hacienda", "Dirección General del Catastro · Sede Electrónica", "CAT")}
<h1>Certificado de valor de referencia</h1>
<table class="kv"><tr><td>Referencia catastral</td><td class="mono">5555555YH5755N0012HA</td></tr><tr><td>Localización</td><td>AV DEL MEDITERRANEO 15 Es:1 Pl:04 Pt:B 03590 ALTEA (ALICANTE)</td></tr><tr><td>Fecha de referencia</td><td>01/01/2026</td></tr><tr><td>Valor de referencia del inmueble</td><td class="num"><b>131.700,00 €</b></td></tr></table>
<p class="small" style="margin-top:14px">Certificado expedido el 12 de febrero de 2026.</p>`);
// 17 · Escritura de compraventa del apartamento de Altea (título: fecha y valor de adquisición)
DOCS2["17-escritura-compraventa-altea-2003.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO NOVECIENTOS DOCE.</p>
<h1>Escritura de compraventa</h1>
<p>En Altea, a quince de julio de dos mil tres.</p>
<p>Ante mí, <b>VICENTE LLORCA SOLER</b>, Notario del Ilustre Colegio de Valencia, con residencia en Altea,</p>
<p style="text-align:center"><b>COMPARECEN:</b></p>
<p>De una parte, como vendedora, MEDITERRÁNEO PROMOCIONES COSTA, S.L. De otra parte, como compradora, <b>DOÑA MARÍA DOLORES RUIZ CANO</b>, mayor de edad, casada, vecina de Torremolinos, con D.N.I. número ${N2.dolores}, que adquiere con carácter privativo.</p>
<p style="text-align:center"><b>EXPONEN:</b></p>
<p>I.- Que la vendedora es dueña de la siguiente finca: URBANA: APARTAMENTO letra B en planta cuarta del edificio sito en avenida del Mediterráneo número quince de Altea. Referencia catastral 5555555YH5755N0012HA.</p>
<p style="text-align:center"><b>ESTIPULACIONES:</b></p>
<p><b>PRIMERA.-</b> La vendedora vende a la compradora la finca descrita.</p>
<p><b>SEGUNDA.-</b> El precio de esta compraventa es de NOVENTA Y SEIS MIL EUROS (96.000,00 €), que la vendedora declara recibidos.</p>
<p>Así lo otorgan. Doy fe.</p>
</div>`);
// 14 · Nómina (documento ajeno)
DOCS2["14-nomina-abril.pdf"] = pagina(`${cab("Empresa Ejemplo, S.L.", "CIF B29000000 (ficticio) · Recibo de salarios", "EMP")}
<h1>Nómina · Abril 2026</h1>
<table class="kv"><tr><td>Trabajador</td><td>PABLO GARCÍA RUIZ · DNI ${N2.pablo}</td></tr><tr><td>Categoría</td><td>Oficial administrativo</td></tr><tr><td>Periodo</td><td>01/04/2026 – 30/04/2026</td></tr></table>
<table class="kv" style="margin-top:12px"><tr><td>Salario base</td><td class="num">1.800,00</td></tr><tr><td>Complementos</td><td class="num">350,00</td></tr><tr><td>Total devengado</td><td class="num">2.150,00</td></tr><tr><td>Base de cotización</td><td class="num">2.150,00</td></tr><tr><td>Retención IRPF 12 %</td><td class="num">258,00</td></tr><tr><td>Líquido a percibir</td><td class="num">1.720,50 €</td></tr></table>
<p class="small">Transferido a ES21 2103 0000 1234 5678 9999.</p>`);

// 11 · DNI (reverso con MRZ) y anverso — como imagen JPG (foto)
const dni = (ap1, ap2, nombre, num, nacYYMMDD, sexo, cadYYMMDD, soporte) => {
  const pad = (s, n) => (s + "<".repeat(n)).slice(0, n);
  // Zona de lectura mecánica TD1 (ICAO 9303) con sus dígitos de control, como el DNI 3.0
  const cd = (z) => [...z].reduce((a, c, i) => a + [7, 3, 1][i % 3] * (/\d/.test(c) ? Number(c) : /[A-Z]/.test(c) ? c.charCodeAt(0) - 55 : 0), 0) % 10;
  const l1 = pad(`IDESP${soporte}${cd(soporte)}${num}`, 30);
  const l2a = pad(`${nacYYMMDD}${cd(nacYYMMDD)}${sexo}${cadYYMMDD}${cd(cadYYMMDD)}ESP`, 29);
  const l2 = l2a + cd(l1.slice(5) + l2a.slice(0, 7) + l2a.slice(8, 15) + l2a.slice(18, 29));
  const l3 = pad(`${ap1}<${ap2}<<${nombre.replace(/ /g, "<")}`, 30);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#dcdcd4;font-family:"Liberation Sans",Arial,sans-serif}
  .card{width:856px;height:540px;margin:40px auto;background:linear-gradient(135deg,#e9eef5,#cfd9e6 60%,#e3e8ef);border-radius:28px;position:relative;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;transform:rotate(-1.2deg)}
  .t{position:absolute;left:36px;top:26px;font-size:20px;font-weight:700;color:#1b2b4a;letter-spacing:.04em}
  .f{position:absolute;left:36px;font-size:14px;color:#1b2b4a}
  .f b{display:block;font-size:17px;color:#000;letter-spacing:.02em}
  .mrz{position:absolute;left:36px;right:36px;bottom:30px;font:34px/1.25 "Liberation Mono","DejaVu Sans Mono",monospace;letter-spacing:.14em;color:#111;background:#f4f4f0;padding:10px 12px;border-radius:8px}
  .aviso{position:absolute;right:36px;top:26px;font-size:11px;color:#b00;border:1px solid #b00;padding:3px 6px;border-radius:4px;max-width:360px;text-align:right}
  </style></head><body><div class="card"><div class="t">REINO DE ESPAÑA · DOCUMENTO NACIONAL DE IDENTIDAD</div>
  <div class="aviso">DOCUMENTO FICTICIO · EJEMPLO PARA PROBAR HEREDA+</div>
  <div class="f" style="top:90px">APELLIDOS<b>${ap1} ${ap2}</b></div><div class="f" style="top:150px">NOMBRE<b>${nombre}</b></div>
  <div class="f" style="top:210px">DNI<b>${num}</b></div><div class="f" style="top:210px;left:300px">FECHA DE NACIMIENTO<b>${nacYYMMDD.slice(4)} ${nacYYMMDD.slice(2, 4)} ${(Number(nacYYMMDD.slice(0, 2)) > 26 ? "19" : "20") + nacYYMMDD.slice(0, 2)}</b></div>
  <div class="f" style="top:270px">NÚM. SOPORTE<b>${soporte}</b></div>
  <div class="mrz">${[l1, l2, l3].map((l) => l.replace(/</g, "&lt;")).join("<br>")}</div></div></body></html>`;
};
const DNIS = [["11-dni-javier-jimenez-ruiz.jpg", dni("JIMENEZ", "RUIZ", "JAVIER", N.javier, "800306", "M", "290325", "BAA000589")], ["12-dni-carmen-ruiz-lopez.jpg", dni("RUIZ", "LOPEZ", "CARMEN", N.carmen, "520114", "F", "300901", "BAB111222")]];

// DNI antiguo (hasta 2006): dos líneas de 36 caracteres, el nombre en la primera
const dniViejo = (ap1, ap2, nombre, num, nacYYMMDD, sexo, cadYYMMDD) => {
  const pad = (s, n) => (s + "<".repeat(n)).slice(0, n);
  const l1 = pad(`IDESP${ap1}<${ap2}<<${nombre.replace(/ /g, "<")}`, 36);
  const l2 = pad(`${num}0ESP${nacYYMMDD}4${sexo}${cadYYMMDD}9`, 35) + "5";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#cfc9b8;font-family:"Liberation Sans",Arial,sans-serif}
  .card{width:856px;height:540px;margin:40px auto;background:linear-gradient(135deg,#f3eedb,#e2d9bb 60%,#efe8cf);border-radius:18px;position:relative;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;transform:rotate(1.1deg)}
  .t{position:absolute;left:36px;top:26px;font-size:18px;font-weight:700;color:#4a2b1b;letter-spacing:.04em}
  .f{position:absolute;left:36px;font-size:13px;color:#4a2b1b}
  .f b{display:block;font-size:17px;color:#000}
  .mrz{position:absolute;left:36px;right:36px;bottom:30px;font:30px/1.25 "Liberation Mono","DejaVu Sans Mono",monospace;letter-spacing:.1em;color:#111;background:#f6f3e6;padding:10px 12px;border-radius:6px}
  .aviso{position:absolute;right:36px;top:26px;font-size:11px;color:#b00;border:1px solid #b00;padding:3px 6px;border-radius:4px;max-width:360px;text-align:right}
  </style></head><body><div class="card"><div class="t">REINO DE ESPAÑA · DOCUMENTO NACIONAL DE IDENTIDAD</div>
  <div class="aviso">DOCUMENTO FICTICIO · EJEMPLO PARA PROBAR HEREDA+</div>
  <div class="f" style="top:90px">APELLIDOS<b>${ap1} ${ap2}</b></div><div class="f" style="top:150px">NOMBRE<b>${nombre}</b></div>
  <div class="f" style="top:210px">DNI<b>${num}</b></div>
  <div class="mrz">${[l1, l2].map((l) => l.replace(/</g, "&lt;")).join("<br>")}</div></div></body></html>`;
};
const DNIS2 = [["13-dni-antiguo-pablo-garcia-ruiz.jpg", dniViejo("GARCIA", "RUIZ", "PABLO", N2.pablo, "720918", "M", "090915")]];

// ══ CASO 3 · Herencia testada de Elena Martín Rojas (Madrid), casada en separación de bienes por capitulaciones → carpeta caso3-capitulaciones-madrid ══
const N3 = { elena: nif(50111222), fernando: nif(50333444), lucia: nif(51555666), diego: nif(51777888), mario: nif(52000999) };
const DOCS3 = {};
DOCS3["01-certificado-defuncion-madrid.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro Civil de Madrid")}
<h1>Certificado de inscripción de defunción</h1>
<h2>Datos del inscrito</h2>
<table class="kv"><tr><td>Nombre</td><td>ELENA</td></tr><tr><td>Primer apellido</td><td>MARTÍN</td></tr><tr><td>Segundo apellido</td><td>ROJAS</td></tr><tr><td>DNI</td><td>${N3.elena}</td></tr><tr><td>Sexo</td><td>Mujer</td></tr><tr><td>Fecha de nacimiento</td><td>08/05/1951</td></tr><tr><td>Lugar de nacimiento</td><td>Segovia</td></tr><tr><td>Estado civil</td><td>Casada</td></tr></table>
<h2>Datos de la defunción</h2>
<table class="kv"><tr><td>Fecha de defunción</td><td>15/03/2026</td></tr><tr><td>Hora</td><td>04:10</td></tr><tr><td>Lugar de defunción</td><td>Madrid</td></tr><tr><td>Provincia</td><td>Madrid</td></tr></table>
<div class="firma"><span>Madrid, 18 de marzo de 2026</span><span>Firmado electrónicamente</span></div>`);
DOCS3["02-certificado-ultimas-voluntades.pdf"] = pagina(`${cab("Ministerio de Justicia", "Registro General de Actos de Última Voluntad")}
<h1>Certificado de actos de última voluntad</h1>
<p>Consultados los antecedentes obrantes en este Registro, resulta que D./D.ª <b>ELENA MARTÍN ROJAS</b>, con DNI/NIE ${N3.elena}, fallecido/a el día <b>15/03/2026</b>,</p>
<p><b>CONSTA</b> como otorgante de los siguientes actos de última voluntad:</p>
<table><tr><th>Tipo de acto</th><td>TESTAMENTO ABIERTO</td></tr><tr><th>Fecha del acto</th><td>20/06/2019</td></tr><tr><th>Notario</th><td>DOÑA PILAR NAVARRO CUESTA</td></tr><tr><th>Localidad</th><td>MADRID</td></tr><tr><th>Protocolo</th><td>1876</td></tr></table>
<div class="firma"><span>Madrid, 6 de abril de 2026</span><span>Fecha de expedición: 06/04/2026</span></div>`);
const TXT3 = {};
TXT3["03-testamento-copia-simple.txt"] = `DOCUMENTO FICTICIO · EJEMPLO PARA PROBAR HEREDA+ · Todos los nombres, números y datos son inventados.

COPIA SIMPLE (enviada por la notaría por correo electrónico, sin valor de copia autorizada)

NÚMERO MIL OCHOCIENTOS SETENTA Y SEIS.
TESTAMENTO ABIERTO
En Madrid, mi residencia, a veinte de junio de dos mil diecinueve.
Ante mí, PILAR NAVARRO CUESTA, Notaria del Ilustre Colegio de Madrid,

COMPARECE:
DOÑA ELENA MARTÍN ROJAS, mayor de edad, casada en régimen de separación de bienes con DON FERNANDO ORTEGA GIL, vecina de Madrid, con domicilio en calle Almagro número 20, y con D.N.I. número ${N3.elena}.

MANIFIESTA:
I.- Que es natural de Segovia, hija de Don Pedro y de Doña Ana.
II.- Que de su matrimonio tiene dos hijos llamados LUCÍA y DIEGO ORTEGA MARTÍN, ambos mayores de edad.

OTORGA su testamento con arreglo a las siguientes CLÁUSULAS:
PRIMERA.- Lega a su esposo, DON FERNANDO ORTEGA GIL, el usufructo universal y vitalicio de toda su herencia. Si alguno de los legitimarios no lo respetase, su derecho quedará reducido a la legítima estricta (cautela socini).
SEGUNDA.- Instituye herederos por partes iguales a sus dos hijos, LUCÍA y DIEGO ORTEGA MARTÍN, sustituidos vulgarmente por sus descendientes.
TERCERA.- Revoca cualquier disposición testamentaria anterior.

Así lo dice y otorga ante mí, la Notaria, que doy fe.
`;
DOCS3["04-certificado-matrimonio-literal.pdf"] = pagina(`<div class="not" style="font-family:'Liberation Mono','DejaVu Sans Mono',monospace;font-size:10.5pt">
<p style="text-align:center">REGISTRO CIVIL DE MADRID · Sección 2.ª · Tomo 512 · Página 77</p>
<h1>Certificación literal de inscripción de matrimonio</h1>
<p>Contrayente 1: DON FERNANDO ORTEGA GIL, hijo de Luis y de Rosa, nacido en Madrid el 2 de noviembre de 1949.</p>
<p>Contrayente 2: DOÑA ELENA MARTÍN ROJAS, hija de Pedro y de Ana, nacida en Segovia el 8 de mayo de 1951.</p>
<p>Celebrado el día 23 de septiembre de 1978 en la parroquia de San Jerónimo el Real de Madrid. Forma canónica.</p>
<p>Régimen económico: gananciales.</p>
<p>INSCRIPCIONES MARGINALES: Por escritura otorgada ante el Notario de Madrid don Alberto Sanz Prieto el día 10 de febrero de 1992, número 412 de protocolo, los cónyuges han pactado el régimen de separación de bienes. Madrid, 3 de marzo de 1992.</p>
<p style="text-align:right">La Encargada del Registro Civil. Sello.</p></div>`);
DOCS3["05-escritura-capitulaciones-1992.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO CUATROCIENTOS DOCE.</p>
<h1>Escritura de capitulaciones matrimoniales</h1>
<p>En Madrid, a diez de febrero de mil novecientos noventa y dos.</p>
<p>Ante mí, <b>ALBERTO SANZ PRIETO</b>, Notario del Ilustre Colegio de Madrid,</p>
<p style="text-align:center"><b>COMPARECEN:</b></p>
<p><b>DON FERNANDO ORTEGA GIL</b>, mayor de edad, con D.N.I. ${N3.fernando}, y <b>DOÑA ELENA MARTÍN ROJAS</b>, mayor de edad, con D.N.I. ${N3.elena}, casados entre sí en Madrid el 23 de septiembre de 1978, en régimen legal de gananciales.</p>
<p style="text-align:center"><b>OTORGAN:</b></p>
<p><b>PRIMERA.-</b> Los comparecientes acuerdan sustituir su régimen económico matrimonial de gananciales por el de separación de bienes, regulado en los artículos 1435 y siguientes del Código Civil.</p>
<p><b>SEGUNDA.-</b> Disuelven y liquidan la sociedad de gananciales, adjudicándose los bienes según el inventario que se protocoliza.</p>
<p><b>TERCERA.-</b> Solicitan la indicación de esta escritura en el Registro Civil.</p>
<p>Así lo otorgan. Doy fe.</p></div>`);
DOCS3["06-certificado-nacimiento-diego-literal.pdf"] = pagina(`<div class="not" style="font-family:'Liberation Mono','DejaVu Sans Mono',monospace;font-size:10.5pt">
<p style="text-align:center">REGISTRO CIVIL DE MADRID · Sección 1.ª · Tomo 1.204 · Página 33</p>
<h1>Certificación literal de inscripción de nacimiento</h1>
<p>Inscripción de nacimiento de DON DIEGO ORTEGA MARTÍN, varón, nacido en Madrid el día treinta de octubre de mil novecientos ochenta y tres, a las once horas, hijo de Don FERNANDO ORTEGA GIL y de Doña ELENA MARTÍN ROJAS, de nacionalidad española.</p>
<p style="text-align:right">El Encargado del Registro Civil. Sello.</p></div>`);
DOCS3["08-certificado-empadronamiento-madrid.pdf"] = pagina(`${cab("Ayuntamiento de Madrid", "Padrón Municipal de Habitantes", "AYTO")}
<h1>Certificado de empadronamiento</h1>
<p>El Ayuntamiento de Madrid <b>CERTIFICA</b>: Que DOÑA <b>ELENA MARTÍN ROJAS</b>, con DNI ${N3.elena}, nacida el 08/05/1951, figura inscrita en el Padrón Municipal de Habitantes de este municipio con domicilio en <b>CL ALMAGRO 20 Es:1 Pl:04 Pt:B, 28010 MADRID</b>, desde el día 01/03/1999 (fecha de alta), habiendo causado baja por defunción el 15/03/2026.</p>
<h2>Personas que conviven en el mismo domicilio</h2>
<table><tr><th>Nombre y apellidos</th><th>Documento</th><th>Fecha de nacimiento</th><th>Fecha de alta</th></tr><tr><td>FERNANDO ORTEGA GIL</td><td>${N3.fernando}</td><td>02/11/1949</td><td>01/03/1999</td></tr></table>
<p class="small" style="margin-top:14px">Madrid, 20 de marzo de 2026.</p>`);
const relleno = `<p class="small">Esta nota simple tiene valor puramente informativo. Se expide con exclusión de los datos personales no necesarios para la finalidad declarada (art. 332 del Reglamento Hipotecario). Los datos registrales indicados se refieren al día de la fecha.</p>`;
DOCS3["09-nota-simple-tres-fincas.pdf"] = pagina(`${cab("Registro de la Propiedad de Madrid n.º 28", "Colegio de Registradores de la Propiedad y Mercantiles de España", "REG")}
<h1>Nota simple informativa</h1>
<p class="small">Titular consultado: MARTÍN ROJAS ELENA · Finalidad: tramitación de herencia</p>
<table class="kv"><tr><td>FINCA DE MADRID Nº</td><td>4455</td></tr><tr><td>CRU</td><td class="mono">28112000044553</td></tr></table>
<h2>Descripción</h2>
<p>URBANA: VIVIENDA letra B en planta cuarta de la casa en calle Almagro número veinte de Madrid. Superficie construida de ciento cuarenta y dos metros cuadrados. Linda: frente, rellano y patio; derecha, calle Almagro. Cuota: 4,20 %. Referencia catastral 0847105VK4704F0012IA.</p>
<h2>Titularidad</h2>
<p>DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${N3.elena}, casada en régimen de separación de bienes, titular del pleno dominio de la totalidad de esta finca con carácter privativo, por título de compraventa, en escritura autorizada el 14/06/1995 por el notario de Madrid don Juan Gómez Ruiz.</p>
<h2>Cargas</h2><p>Libre de cargas.</p>${relleno}
<hr style="margin:22px 0;border:0;border-top:1px dashed #999">
<table class="kv"><tr><td>FINCA DE MADRID Nº</td><td>7788</td></tr><tr><td>CRU</td><td class="mono">28112000077889</td></tr></table>
<h2>Descripción</h2>
<p>URBANA: VIVIENDA letra C en planta segunda de la casa en calle Áncora número siete de Madrid. Superficie construida de sesenta y ocho metros cuadrados. Cuota: 2,10 %. Referencia catastral 1528302VK4712H0007TB.</p>
<h2>Titularidad</h2>
<p>DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${N3.elena}, titular del pleno dominio de la totalidad con carácter privativo, por título de compraventa, en escritura autorizada el 03/11/2008 por la notaria de Madrid doña Pilar Navarro Cuesta.</p>
<h2>Cargas</h2><p>HIPOTECA a favor de BANKINTER, S.A., en garantía de un préstamo de un principal de 150.000,00 euros, constituida en escritura de 03/11/2008. Inscripción 3.ª.</p>${relleno}
<hr style="margin:22px 0;border:0;border-top:1px dashed #999">
<table class="kv"><tr><td>FINCA DE ESPIRDO Nº</td><td>1203</td></tr><tr><td>CRU</td><td class="mono">40015000012031</td></tr></table>
<h2>Descripción</h2>
<p>RÚSTICA: Tierra de labor al sitio de La Dehesa, término de Espirdo, de dos hectáreas y cuarenta y cinco áreas. Polígono 8, parcela 112. Referencia catastral 40080A008001120000JZ.</p>
<h2>Titularidad</h2>
<p>DOÑA ELENA MARTÍN ROJAS, con N.I.F. ${N3.elena}, titular del pleno dominio de la totalidad con carácter privativo, por título de herencia de sus padres.</p>
<h2>Cargas</h2><p>No constan cargas.</p>
<p class="small" style="margin-top:14px">Nota simple expedida el 25 de marzo de 2026.</p>`);
DOCS3["10-recibo-ibi-dos-inmuebles-madrid.pdf"] = pagina(`${cab("Agencia Tributaria Madrid", "Ayuntamiento de Madrid · Impuesto sobre Bienes Inmuebles", "ATM")}
<h1>IBI · Relación de recibos del contribuyente · Ejercicio 2026</h1>
<p>Contribuyente: MARTÍN ROJAS ELENA · ${N3.elena}</p>
<table><tr><th>Situación</th><th>Ref. catastral</th><th>Uso</th><th class="num">Valor catastral</th><th class="num">Valor catastral suelo</th><th class="num">Cuota</th></tr>
<tr><td>CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID (MADRID)</td><td class="mono">0847105VK4704F0012IA</td><td>Residencial</td><td class="num">165.000,00</td><td class="num">98.000,00</td><td class="num">671,55 €</td></tr>
<tr><td>CL ANCORA 7 Pl:02 Pt:C 28045 MADRID (MADRID)</td><td class="mono">1528302VK4712H0007TB</td><td>Residencial</td><td class="num">98.500,00</td><td class="num">51.200,00</td><td class="num">400,90 €</td></tr></table>`);
DOCS3["11-certificacion-catastral-almagro.pdf"] = certCat({ ref: "0847105VK4704F0012IA", loc: "CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID [MADRID]", uso: "Residencial", sup: 142, anio: 1962, vc: "165.000,00", vs: "98.000,00", vcons: "67.000,00",
  tit: [["MARTÍN ROJAS ELENA", N3.elena, "100,00% de propiedad", "CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID [MADRID]"]], cons: [["VIVIENDA", "1/04/B", "131"], ["ELEMENTOS COMUNES", "", "11"]], parcela: "702 m2", fecha: "20/03/2026", csv: "B9WQ1N7HXKD2T5RE" });
DOCS3["23-certificado-valor-referencia-almagro.pdf"] = certVR({ ref: "0847105VK4704F0012IA", loc: "CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID (MADRID)", uso: "Residencial", valor: "412.300,00", fecha: "20 de marzo de 2026", csv: "VR-28-2026-8E9F" });
DOCS3["12-certificacion-catastral-rustica-espirdo.pdf"] = certCat({ ref: "40080A008001120000JZ", loc: "Polígono 8 Parcela 112 LA DEHESA. ESPIRDO [SEGOVIA]", clase: "Rústico", uso: "Agrario", vc: "3.215,40", vs: "3.215,40", vcons: "0,00",
  tit: [["MARTÍN ROJAS ELENA", N3.elena, "100,00% de propiedad", "CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID [MADRID]"]], cultivos: [["a", "C- Labor o Labradío secano", "02", "19.000"], ["b", "E- Pastos", "00", "5.500"]], parcela: "24.500 m2", fecha: "20/03/2026", csv: "R3CJ8M0AVZQ6P1LT" });
DOCS3["24-certificado-valor-referencia-rustica-espirdo.pdf"] = certVR({ ref: "40080A008001120000JZ", loc: "Polígono 8 Parcela 112 LA DEHESA. ESPIRDO (SEGOVIA)", uso: "Agrario", valor: "9.870,00", fecha: "20 de marzo de 2026", csv: "VR-40-2026-0A1B" });
DOCS3["13-datos-fiscales-2025.pdf"] = pagina(`${cab("Agencia Tributaria", "Renta 2025 · Servicio de datos fiscales", "AEAT")}
<h1>Datos fiscales del ejercicio 2025</h1>
<p>Impuesto sobre la Renta de las Personas Físicas · NIF: ${N3.elena} · Apellidos y nombre: MARTÍN ROJAS ELENA</p>
<h2>Cuentas bancarias</h2>
<table class="ancha"><tr><th>Entidad</th><th>Código IBAN</th><th>Nº titulares</th><th class="num">Saldo a 31/12</th><th class="num">Saldo medio 4.º trimestre</th></tr>
<tr><td>BANKINTER SA</td><td class="mono">ES12 0128 0010 9101 2345 6789</td><td>1</td><td class="num">24.380,15</td><td class="num">23.910,02</td></tr></table>
<h2>Fondos de inversión</h2>
<table class="ancha"><tr><th>Entidad gestora</th><th>Denominación</th><th class="num">Nº participaciones</th><th class="num">Valoración</th></tr>
<tr><td>BANKINTER GESTIÓN DE ACTIVOS SGIIC</td><td>BANKINTER RENTA FIJA CORTO PLAZO FI</td><td class="num">1.512,4400</td><td class="num">15.320,00</td></tr></table>
<h2>Valores cotizados</h2>
<table class="ancha"><tr><th>Entidad emisora</th><th>ISIN</th><th class="num">Nº de valores</th><th class="num">Valoración a 31/12</th></tr>
<tr><td>IBERDROLA SA</td><td class="mono">ES0144580Y14</td><td class="num">1.500</td><td class="num">20.100,00</td></tr>
<tr><td>BANCO SANTANDER SA</td><td class="mono">ES0113900J37</td><td class="num">3.000</td><td class="num">15.900,00</td></tr></table>
<h2>Inmuebles</h2>
<table class="ancha"><tr><th>Situación</th><th>Referencia catastral</th><th>Titularidad</th><th>Uso</th><th class="num">Valor catastral</th></tr>
<tr><td class="sit">CL ALMAGRO 20 Es:1 Pl:04 Pt:B 28010 MADRID (MADRID)</td><td class="mono">0847105VK4704F0012IA</td><td>100,00 %</td><td>Vivienda habitual</td><td class="num">165.000,00</td></tr>
<tr><td class="sit">CL ANCORA 7 Pl:02 Pt:C 28045 MADRID (MADRID)</td><td class="mono">1528302VK4712H0007TB</td><td>100,00 %</td><td>Arrendamiento</td><td class="num">98.500,00</td></tr>
<tr><td class="sit">POLIGONO 8 PARCELA 112 LA DEHESA 40080 ESPIRDO (SEGOVIA)</td><td class="mono">40080A008001120000JZ</td><td>100,00 %</td><td>Rústico</td><td class="num">3.215,40</td></tr></table>
<h2>Rendimientos del capital inmobiliario</h2>
<table class="ancha"><tr><th>Arrendatario</th><th>Inmueble</th><th class="num">Rendimiento íntegro</th></tr><tr><td>VEGA LUNA MARIO</td><td>1528302VK4712H0007TB</td><td class="num">11.400,00</td></tr></table>`);
DOCS3["14-certificado-bankinter.pdf"] = pagina(`${cab("Bankinter, S.A.", "Servicio de Testamentarías", "BK")}
<h1>Certificado de posiciones a fecha de fallecimiento</h1>
<p>BANKINTER, S.A. <b>CERTIFICA</b> que D.ª <b>ELENA MARTÍN ROJAS</b>, con NIF ${N3.elena}, mantenía en esta entidad, a fecha <b>15/03/2026</b> (fecha del fallecimiento), las siguientes posiciones:</p>
<table><tr><th style="width:30%">Producto</th><th>IBAN / contrato</th><th>Titulares</th><th class="num">Saldo</th></tr>
<tr><td>Cuenta corriente</td><td class="mono">ES12 0128 0010 9101 2345 6789</td><td>Elena Martín Rojas</td><td class="num">26.912,40 €</td></tr>
<tr><td>Fondo de inversión Bankinter Renta Fija Corto Plazo FI</td><td>1.512,44 participaciones</td><td>Elena Martín Rojas</td><td class="num">15.402,33 €</td></tr></table>
<p class="small" style="margin-top:14px">El préstamo hipotecario se certifica por separado. Madrid, 25 de marzo de 2026.</p>`);
DOCS3["15-certificado-valores-renta4.pdf"] = pagina(`${cab("Renta 4 Banco, S.A.", "Departamento de Valores · Testamentarías", "R4")}
<h1>Certificado de posición de valores</h1>
<p>RENTA 4 BANCO, S.A. <b>CERTIFICA</b> que DOÑA ELENA MARTÍN ROJAS, con NIF ${N3.elena}, era titular a fecha 15/03/2026 (fecha de fallecimiento) de los siguientes valores depositados en la cuenta de valores nº 4401-223344:</p>
<table><tr><th>Valor</th><th>ISIN</th><th class="num">Nº títulos</th><th class="num">Cotización</th><th class="num">Valoración (EUR)</th></tr>
<tr><td>IBERDROLA SA</td><td class="mono">ES0144580Y14</td><td class="num">1.500</td><td class="num">14,85</td><td class="num">22.275,00</td></tr>
<tr><td>BANCO SANTANDER SA</td><td class="mono">ES0113900J37</td><td class="num">3.000</td><td class="num">6,12</td><td class="num">18.360,00</td></tr></table>
<p>Total valoración: 40.635,00 €</p>`);
DOCS3["16-certificado-plan-pensiones.pdf"] = pagina(`${cab("Bankinter Pensiones, S.A., E.G.F.P.", "Entidad gestora de fondos de pensiones", "BP")}
<h1>Certificado de derechos consolidados</h1>
<table class="kv"><tr><td>Plan de pensiones</td><td>BANKINTER AHORRO ACTIVOS PP (N.º DGSFP N-1234)</td></tr><tr><td>Partícipe</td><td>ELENA MARTÍN ROJAS · NIF ${N3.elena}</td></tr><tr><td>Derechos consolidados a fecha 15/03/2026</td><td class="num">31.540,20 €</td></tr></table>
<p>Beneficiarios designados en caso de fallecimiento: sus hijos, DOÑA LUCÍA ORTEGA MARTÍN y DON DIEGO ORTEGA MARTÍN, por partes iguales.</p>
<p class="small">Para el cobro de la prestación, los beneficiarios deberán presentar el certificado de defunción y su DNI.</p>`);
DOCS3["17-escritura-prestamo-hipotecario-2008.pdf"] = pagina(`<div class="not">
<p style="text-align:right">NÚMERO DOS MIL CUARENTA.</p>
<h1>Escritura de préstamo con garantía hipotecaria</h1>
<p>En Madrid, a tres de noviembre de dos mil ocho.</p>
<p>Ante mí, <b>PILAR NAVARRO CUESTA</b>, Notaria del Ilustre Colegio de Madrid,</p>
<p style="text-align:center"><b>COMPARECEN:</b></p>
<p>De una parte, BANKINTER, S.A., como entidad prestamista; y de otra, como prestataria, DOÑA ELENA MARTÍN ROJAS, con D.N.I. ${N3.elena}.</p>
<p style="text-align:center"><b>ESTIPULACIONES:</b></p>
<p><b>PRIMERA.-</b> Bankinter concede a la prestataria un préstamo por importe de CIENTO CINCUENTA MIL EUROS (150.000,00 €), que se amortizará en 300 cuotas mensuales.</p>
<p><b>SEGUNDA.-</b> Tipo de interés: Euríbor a un año más 0,90 puntos.</p>
<p><b>TERCERA.-</b> En garantía, la prestataria constituye hipoteca sobre la vivienda letra C de la calle Áncora número siete de Madrid, finca 7788 del Registro de la Propiedad n.º 28.</p>
<p>Así lo otorgan. Doy fe.</p></div>`);
DOCS3["18-certificado-deuda-pendiente-bankinter.pdf"] = pagina(`${cab("Bankinter, S.A.", "Servicio de Testamentarías", "BK")}
<h1>Certificado de deuda pendiente</h1>
<p>BANKINTER, S.A. CERTIFICA que el préstamo hipotecario número 0128-0010-55-1234567, cuya prestataria es DOÑA ELENA MARTÍN ROJAS, con NIF ${N3.elena}, presentaba a fecha 15/03/2026 (fecha del fallecimiento) un capital pendiente de amortizar de <b>48.213,77 euros</b>.</p>
<p>Intereses devengados y no vencidos: 61,20 euros. Garantía: hipoteca sobre la finca de calle Áncora 7, 2.º C, Madrid.</p>
<p class="small">Madrid, 25 de marzo de 2026.</p>`);
const DOCX3 = {};
DOCX3["19-contrato-arrendamiento-ancora.docx"] = [
  "DOCUMENTO FICTICIO · EJEMPLO PARA PROBAR HEREDA+ · Todos los nombres, números y datos son inventados.",
  "CONTRATO DE ARRENDAMIENTO DE VIVIENDA",
  "En Madrid, a 1 de septiembre de 2022.",
  "REUNIDOS",
  `De una parte, como ARRENDADORA, DOÑA ELENA MARTÍN ROJAS, mayor de edad, con DNI ${N3.elena}.`,
  `De otra parte, como ARRENDATARIO, DON MARIO VEGA LUNA, mayor de edad, con DNI ${N3.mario}.`,
  "EXPONEN",
  "I.- Que la arrendadora es propietaria de la vivienda sita en calle Áncora número 7, planta 2.ª, puerta C, 28045 Madrid, con referencia catastral 1528302VK4712H0007TB.",
  "CLÁUSULAS",
  "PRIMERA.- Duración. La duración del contrato es de cinco años.",
  "SEGUNDA.- Renta. La renta mensual es de NOVECIENTOS CINCUENTA EUROS (950,00 €), pagadera por meses anticipados.",
  "TERCERA.- Fianza. El arrendatario entrega en este acto la fianza legal de una mensualidad, NOVECIENTOS CINCUENTA EUROS (950,00 €), que se depositará en la Agencia de Vivienda Social de la Comunidad de Madrid.",
  [["Arrendadora", "Elena Martín Rojas"], ["Arrendatario", "Mario Vega Luna"]],
  "Este contrato se rige por la Ley 29/1994, de Arrendamientos Urbanos.",
];
DOCS3["20-libro-registro-socios.pdf"] = pagina(`${cab("Ortega Martín Consultores, S.L.", "NIF B87654323 (ficticio) · Inscrita en el Registro Mercantil de Madrid, tomo 12.345, folio 67, hoja M-123456", "OMC")}
<h1>Certificación del libro registro de socios</h1>
<p>DON FERNANDO ORTEGA GIL, administrador único de ORTEGA MARTÍN CONSULTORES, S.L., CERTIFICA: Que según el Libro Registro de Socios, a fecha 15/03/2026 el capital social de 3.000,00 €, dividido en 3.000 participaciones sociales de 1,00 € de valor nominal, pertenece a:</p>
<p>DOÑA ELENA MARTÍN ROJAS, NIF ${N3.elena}: 1.500 participaciones (números 1 a 1.500), 50,00 %</p>
<p>DON FERNANDO ORTEGA GIL, NIF ${N3.fernando}: 1.500 participaciones (números 1.501 a 3.000), 50,00 %</p>
<p>Patrimonio neto según el último balance aprobado (ejercicio 2025): 184.300,00 €</p>
<p class="small">Madrid, 30 de marzo de 2026.</p>`);
DOCS3["21-factura-funeraria.pdf"] = pagina(`${cab("Funeraria San Isidro Labrador, S.L.", "CIF B29111119 (ficticio) · Calle de Toledo 140, Madrid", "FSI")}
<h1>Factura nº 2026/1022</h1>
<table class="kv"><tr><td>Fecha</td><td>17/03/2026</td></tr><tr><td>Cliente</td><td>LUCÍA ORTEGA MARTÍN · ${N3.lucia}</td></tr><tr><td>Concepto</td><td>Servicio funerario completo de Dña. Elena Martín Rojas: féretro, tanatorio, traslado e inhumación en el cementerio de la Almudena</td></tr></table>
<table class="kv" style="margin-top:12px"><tr><td>Base imponible</td><td class="num">3.500,00 €</td></tr><tr><td>IVA 21 %</td><td class="num">735,00 €</td></tr><tr><td><b>Total factura</b></td><td class="num"><b>4.235,00 €</b></td></tr></table>
<p class="small">Pagada mediante transferencia el 20/03/2026.</p>`);
DOCS3["22-factura-clinica-paliativos.pdf"] = pagina(`${cab("Clínica Santa Brígida, S.L.", "CIF B28222222 (ficticio) · Calle del Prado 4, Madrid", "CSB")}
<h1>Factura nº CSB-2026-0311</h1>
<table class="kv"><tr><td>Fecha de factura</td><td>16/03/2026</td></tr><tr><td>Paciente</td><td>ELENA MARTÍN ROJAS</td></tr><tr><td>Cliente</td><td>DOÑA LUCÍA ORTEGA MARTÍN</td></tr><tr><td>Concepto</td><td>Hospitalización en unidad de cuidados paliativos del 2 al 15 de marzo de 2026 · Honorarios médicos</td></tr></table>
<table class="kv" style="margin-top:12px"><tr><td>Base imponible</td><td class="num">2.860,50 €</td></tr><tr><td>IVA</td><td>Exento (art. 20.Uno.2.º LIVA)</td></tr><tr><td><b>Total factura</b></td><td class="num"><b>2.860,50 €</b></td></tr></table>
<p class="small">Pagado con tarjeta el 16/03/2026.</p>`);
// DNI fotografiado torcido, con poco contraste y sombra (prueba el preprocesado: enderezado y umbral adaptativo)
const dniFoto = (html) => html.replace("transform:rotate(-1.2deg)", "transform:rotate(-5.5deg);filter:contrast(.55) brightness(1.08) blur(.4px)").replace("</div></body>", `</div><div style="position:fixed;inset:0;background:linear-gradient(100deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.28) 100%);pointer-events:none"></div></body>`);
const DNIS3 = [["07-dni-lucia-foto-torcida.jpg", dniFoto(dni("ORTEGA", "MARTIN", "LUCIA", N3.lucia, "800412", "F", "310715", "BCD445566"))]];

// ── Word (.docx) mínimo sin dependencias: zip con [Content_Types].xml, _rels/.rels y word/document.xml ──
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function zip(entradas) {
  const partes = [], central = []; let off = 0;
  for (const [nombre, texto] of entradas) {
    const datos = Buffer.from(texto, "utf8"), comp = deflateRawSync(datos), n = Buffer.from(nombre), crc = crc32(datos);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(datos.length, 22); lh.writeUInt16LE(n.length, 26);
    partes.push(lh, n, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(datos.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, n); off += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(central), fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16);
  return Buffer.concat([...partes, cd, fin]);
}
const xmlEsc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function docx(bloques) {
  const p = (t, neg) => `<w:p><w:r>${neg ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r></w:p>`;
  const cuerpo = bloques.map((b, i) => Array.isArray(b) ? `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${b.map((f) => `<w:tr>${f.map((c) => `<w:tc>${p(c)}</w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>` : p(b, i <= 1)).join("");
  return zip([["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${cuerpo}<w:sectPr/></w:body></w:document>`]]);
}

// ── Render ──
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
for (const [n, html] of Object.entries(DOCS)) { await pg.setContent(html, { waitUntil: "load" }); await pg.pdf({ path: OUT + n, format: "A4", printBackground: true, preferCSSPageSize: true }); }
// Escaneo: el certificado de defunción como imagen (foto de móvil) y el testamento como PDF solo imagen
// Foto de móvil: el papel algo girado (3°), con poco contraste y una sombra en un lado
await pg.setContent(DOCS["01-certificado-defuncion.pdf"].replace('<body class="">', `<body class="" style="transform:rotate(3deg) scale(.9);transform-origin:50% 30%;filter:contrast(.62) brightness(1.04) sepia(.18)"><div style="position:fixed;inset:0;background:linear-gradient(75deg,rgba(0,0,0,.22) 0%,rgba(0,0,0,0) 45%);pointer-events:none;z-index:9"></div>`), { waitUntil: "load" }); await pg.setViewportSize({ width: 820, height: 1160 });
await pg.screenshot({ path: OUT + "13-certificado-defuncion-foto-movil.jpg", type: "jpeg", quality: 72, fullPage: true });
await pg.setContent(DOCS["04-testamento-abierto.pdf"], { waitUntil: "load" }); await pg.setViewportSize({ width: 820, height: 1160 });
const tmpPng = RAIZ + "_testamento-pag.png";
await pg.screenshot({ path: tmpPng, fullPage: true });
for (const [n, html] of DNIS) { await pg.setContent(html, { waitUntil: "load" }); await pg.setViewportSize({ width: 940, height: 620 }); await pg.screenshot({ path: OUT + n, type: "jpeg", quality: 85 }); }
// Testamento escaneado como PDF solo imagen (sin capa de texto): obliga a pasar por el reconocimiento óptico
{ const png = fs.readFileSync(tmpPng).toString("base64"); await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;display:block}</style></head><body><img src="data:image/png;base64,${png}"></body></html>`, { waitUntil: "load" }); await pg.pdf({ path: OUT + "14-testamento-escaneado-solo-imagen.pdf", format: "A4", printBackground: true, preferCSSPageSize: true }); }
// Caso 2 (herencia intestada)
const OUT2 = RAIZ + "caso2-intestada-torremolinos/"; fs.mkdirSync(OUT2, { recursive: true });
await pg.setViewportSize({ width: 1000, height: 1400 });
for (const [n, html] of Object.entries(DOCS2)) { await pg.setContent(html, { waitUntil: "load" }); await pg.pdf({ path: OUT2 + n, format: "A4", printBackground: true, preferCSSPageSize: true }); }
for (const [n, html] of DNIS2) { await pg.setContent(html, { waitUntil: "load" }); await pg.setViewportSize({ width: 940, height: 620 }); await pg.screenshot({ path: OUT2 + n, type: "jpeg", quality: 85 }); }
// Caso 3 (capitulaciones, Madrid): PDF, .txt, .docx y una foto torcida
const OUT3 = RAIZ + "caso3-capitulaciones-madrid/"; fs.mkdirSync(OUT3, { recursive: true });
await pg.setViewportSize({ width: 1000, height: 1400 });
for (const [n, html] of Object.entries(DOCS3)) { await pg.setContent(html, { waitUntil: "load" }); await pg.pdf({ path: OUT3 + n, format: "A4", printBackground: true, preferCSSPageSize: true }); }
for (const [n, html] of DNIS3) { await pg.setContent(html, { waitUntil: "load" }); await pg.setViewportSize({ width: 1000, height: 700 }); await pg.screenshot({ path: OUT3 + n, type: "jpeg", quality: 70 }); }
for (const [n, t] of Object.entries(TXT3)) fs.writeFileSync(OUT3 + n, t.replace(/\n/g, "\r\n"));
for (const [n, bl] of Object.entries(DOCX3)) fs.writeFileSync(OUT3 + n, docx(bl));
// ── Banco de escaneos difíciles: fotos simuladas de seis documentos en condiciones malas (torcida 12°, perspectiva fuerte, sombra dura, poco
// contraste, baja resolución, de lado, boca abajo) y una doble página. Sirve para medir qué parte de los datos clave se recupera antes y después
// del procesado del escáner (tools/ejemplos/prueba.mjs). esperado.json: los valores que deben aparecer en lo leído de cada foto.
const BANCO = RAIZ + "banco/"; fs.rmSync(BANCO, { recursive: true, force: true }); fs.mkdirSync(BANCO, { recursive: true });
const FUENTES = { defuncion: DOCS["01-certificado-defuncion.pdf"], ultimas: DOCS["02-certificado-ultimas-voluntades.pdf"], nota: DOCS["05-nota-simple-vivienda-malaga.pdf"], catastro: DOCS["07-certificacion-catastral-vivienda.pdf"], banco: DOCS["09-certificado-bancario-unicaja.pdf"], herederos: DOCS2["04-acta-declaracion-herederos.pdf"] };
const CLAVES = { defuncion: ["Antonio Jiménez Soler", "2026-04-20", N.antonio, "Málaga", "gananciales"], ultimas: ["Fernando Ruiz Castillo", "2015-06-15", "1234", "2026-04-20", "Antonio Jiménez Soler"],
  nota: ["1234567VK4713S0001OQ", "Antonio Jiménez Soler", N.antonio, "Carmen Ruiz López", N.carmen], catastro: ["1234567VK4713S0001OQ", "60000", "140000", N.antonio, N.carmen],
  banco: ["ES2121030000123456789012", "38500", "ES2121030000123456789013", "60000", "45000"], herederos: ["María Dolores Ruiz Cano", "2026-02-03", "Luisa Martín Sanz", "Pablo García Ruiz", "Elena García Ruiz", "Marcos García Moreno", "Lucía García Moreno"] };
const pb = await (await b.newContext({ viewport: { width: 820, height: 1160 }, deviceScaleFactor: 2 })).newPage();
const PAPEL = {}; for (const [k, html] of Object.entries(FUENTES)) { await pb.setContent(html.replace("</head>", "<style>body{padding:58px 64px!important}</style></head>"), { waitUntil: "load" }); /* márgenes de página, como en el papel */ PAPEL[k] = "data:image/png;base64," + (await pb.screenshot({ type: "png", fullPage: true })).toString("base64"); }
const MESA = "background:#5b3d26;background-image:repeating-linear-gradient(91deg,rgba(255,255,255,.05) 0 2px,rgba(0,0,0,.07) 2px 7px,rgba(255,255,255,.03) 7px 13px),radial-gradient(ellipse at 30% 20%,rgba(255,220,180,.25),rgba(0,0,0,.35))";
const RUIDO = `<svg width="100%" height="100%" style="position:absolute;inset:0;opacity:.16;mix-blend-mode:overlay;pointer-events:none"><filter id="r"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#r)"/></svg>`;
const escena = ({ W = 1500, H = 2000, imgs, ancho = 1020, tr = "", filtro = "none", fondo = MESA, sombra = "", ruido = true }) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}body{${fondo};perspective:1700px;position:relative}.p{position:absolute;left:50%;top:50%;width:${ancho}px;transform:translate(-50%,-50%) ${tr};box-shadow:0 10px 40px rgba(0,0,0,.5);filter:${filtro};display:flex;background:#fff}.p img{flex:1;min-width:0;display:block}.p.doble img+img{border-left:2px solid #c9c4ba;box-shadow:inset 18px 0 22px -14px rgba(0,0,0,.35)}.s{position:absolute;inset:0;pointer-events:none;${sombra}}</style></head><body><div class="p${imgs.length > 1 ? " doble" : ""}">${imgs.map((u) => `<img src="${u}">`).join("")}</div><div class="s"></div>${ruido ? RUIDO : ""}</body></html>`;
const ESCENAS = {
  torcida12: (u) => ({ imgs: [u], ancho: 960, tr: "rotate(12deg)" }),
  perspectiva: (u) => ({ imgs: [u], ancho: 980, tr: "translateY(-110px) rotateX(36deg) rotateZ(-7deg)" }),
  sombra: (u) => ({ imgs: [u], tr: "rotateX(10deg) rotateZ(3deg)", sombra: "background:linear-gradient(105deg,rgba(0,0,0,.58) 0%,rgba(0,0,0,.5) 36%,rgba(0,0,0,.0) 50%)" }),
  pococontraste: (u) => ({ imgs: [u], tr: "rotate(-4deg)", fondo: "background:#9b958a", filtro: "contrast(.42) brightness(1.1) sepia(.3) blur(.7px)" }),
  bajaresolucion: (u) => ({ imgs: [u], W: 600, H: 800, ancho: 470, tr: "rotate(3deg)" }),
  delado: (u) => ({ imgs: [u], W: 2000, H: 1500, ancho: 1300, tr: "rotate(90deg)", fondo: "background:#fff", ruido: false }),
  bocaabajo: (u) => ({ imgs: [u], W: 1500, H: 2000, ancho: 1360, tr: "rotate(180deg)", fondo: "background:#fff", ruido: false }),
};
const ESPERADO = {};
const foto = async (nombre, html, W, H, calidad = 82) => { await pb.setViewportSize({ width: W, height: H }); await pb.setContent(html, { waitUntil: "load" }); await pb.screenshot({ path: BANCO + nombre, type: "jpeg", quality: calidad, clip: { x: 0, y: 0, width: W, height: H } }); };
const ctxFoto = await b.newContext({ viewport: { width: 1500, height: 2000 }, deviceScaleFactor: 1 }); const pf = await ctxFoto.newPage();
const fotoE = async (nombre, o, calidad) => { const W = o.W || 1500, H = o.H || 2000; await pf.setViewportSize({ width: W, height: H }); await pf.setContent(escena(o), { waitUntil: "load" }); await pf.screenshot({ path: BANCO + nombre, type: "jpeg", quality: calidad, clip: { x: 0, y: 0, width: W, height: H } }); };
for (const [k, u] of Object.entries(PAPEL)) for (const [e, f] of Object.entries(ESCENAS)) { const n = `${k}-${e}.jpg`; await fotoE(n, f(u), e === "bajaresolucion" ? 55 : 82); ESPERADO[n] = { doc: k, escena: e, claves: CLAVES[k] }; }
await fotoE("defuncion+ultimas-doblepagina.jpg", { imgs: [PAPEL.defuncion, PAPEL.ultimas], W: 2400, H: 1800, ancho: 2160, tr: "rotate(2deg)" }, 82);
ESPERADO["defuncion+ultimas-doblepagina.jpg"] = { doc: "defuncion+ultimas", escena: "doblepagina", claves: [...new Set([...CLAVES.defuncion, ...CLAVES.ultimas])] };
fs.writeFileSync(BANCO + "esperado.json", JSON.stringify(ESPERADO, null, 1));
void foto;
// ── Formatos: el mismo tipo de documentos en los formatos que llegan al despacho (correo con adjuntos, Excel, página web guardada, RTF,
// OpenDocument, CSV, TIFF de escáner, foto girada con EXIF, PDF con contraseña, formulario PDF rellenado, PDF con carátula y escaneo, foto HEIC
// del iPhone). esperado.json: el tipo que debe reconocerse y los valores que deben aparecer en lo leído
const FMT = RAIZ + "formatos/"; fs.rmSync(FMT, { recursive: true, force: true }); fs.mkdirSync(FMT, { recursive: true });
const ESPF = {};
// PDF de texto sin dependencias (Helvetica, WinAnsi), con campos de formulario o cifrado RC4 de 40 bits (gestor estándar, revisión 2)
const winAnsi = (t) => Buffer.from([...String(t)].map((c) => (c === "€" ? 0x80 : c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 0x3f)));
const pdfEsc = (b) => Buffer.from([...b].flatMap((x) => (x === 0x28 || x === 0x29 || x === 0x5c ? [0x5c, x] : [x])));
const rc4 = (key, data) => { const S = [...Array(256).keys()]; let j = 0; for (let i = 0; i < 256; i++) { j = (j + S[i] + key[i % key.length]) & 255; [S[i], S[j]] = [S[j], S[i]]; } const out = Buffer.alloc(data.length); let i = 0; j = 0; for (let k = 0; k < data.length; k++) { i = (i + 1) & 255; j = (j + S[i]) & 255; [S[i], S[j]] = [S[j], S[i]]; out[k] = data[k] ^ S[(S[i] + S[j]) & 255]; } return out; };
const md5 = (...b) => createHash("md5").update(Buffer.concat(b.map((x) => Buffer.from(x)))).digest();
const PAD = Buffer.from("28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A", "hex");
function pdfTexto(paginas, { clave, campos = [] } = {}) {
  const objs = []; const nuevo = () => objs.push(null);
  const cat = nuevo(), pags = nuevo(), font = nuevo(); const pidx = paginas.map(() => [nuevo(), nuevo()]);
  const camposIdx = campos.map(() => nuevo());
  const id = md5("hereda-ejemplo-" + paginas.length); let key = null, enc = null;
  if (clave) { // Algoritmos 2-4 de la especificación PDF (R2, 40 bits)
    const pw = (p) => Buffer.concat([Buffer.from(p, "latin1"), PAD]).subarray(0, 32);
    const O = rc4(md5(pw("propietario-ejemplo")).subarray(0, 5), pw(clave)); const P = Buffer.alloc(4); P.writeInt32LE(-44);
    key = md5(pw(clave), O, P, id).subarray(0, 5); const U = rc4(key, PAD); enc = nuevo();
    objs[enc - 1] = `<< /Filter /Standard /V 1 /R 2 /O <${O.toString("hex")}> /U <${U.toString("hex")}> /P -44 >>`;
  }
  const cifra = (n, data) => (key ? rc4(md5(key, Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255, 0, 0])).subarray(0, 10), data) : data);
  objs[cat - 1] = `<< /Type /Catalog /Pages ${pags} 0 R${campos.length ? ` /AcroForm << /Fields [${camposIdx.map((n) => n + " 0 R").join(" ")}] /NeedAppearances true /DA (/Helv 10 Tf 0 g) /DR << /Font << /Helv ${font} 0 R >> >> >>` : ""} >>`;
  objs[pags - 1] = `<< /Type /Pages /Kids [${pidx.map(([p]) => p + " 0 R").join(" ")}] /Count ${paginas.length} >>`;
  objs[font - 1] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  paginas.forEach((L, k) => {
    const [p, c] = pidx[k]; const annots = campos.map((f, i) => [f, camposIdx[i]]).filter(([f]) => (f.pagina || 0) === k);
    objs[p - 1] = `<< /Type /Page /Parent ${pags} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /Helv ${font} 0 R >> >> /Contents ${c} 0 R${annots.length ? ` /Annots [${annots.map(([, n]) => n + " 0 R").join(" ")}]` : ""} >>`;
    const cs = Buffer.concat(L.map(([x, y, tam, txt]) => Buffer.concat([Buffer.from(`BT /F1 ${tam} Tf ${x} ${y} Td (`), pdfEsc(winAnsi(txt)), Buffer.from(") Tj ET\n")])));
    objs[c - 1] = { dict: `<< /Length ${cs.length} >>`, stream: cifra(c, cs) };
    for (const [f, n] of annots) objs[n - 1] = `<< /Type /Annot /Subtype /Widget /FT /Tx /F 4 /T (${f.nombre}) /V (${pdfEsc(winAnsi(f.valor)).toString("latin1")}) /DA (/Helv 10 Tf 0 g) /Rect [${f.rect.join(" ")}] /P ${p} 0 R >>`;
  });
  const partes = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")]; let pos = partes[0].length; const offs = [];
  objs.forEach((o, i) => { offs.push(pos); const cab = Buffer.from(`${i + 1} 0 obj\n`); const cuerpo = typeof o === "string" ? Buffer.from(o, "latin1") : Buffer.concat([Buffer.from(o.dict + "\nstream\n"), o.stream, Buffer.from("\nendstream")]); const fin = Buffer.from("\nendobj\n"); partes.push(cab, cuerpo, fin); pos += cab.length + cuerpo.length + fin.length; });
  const xref = Buffer.from(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R${enc ? ` /Encrypt ${enc} 0 R` : ""} /ID [<${id.toString("hex")}> <${id.toString("hex")}>] >>\nstartxref\n${pos}\n%%EOF\n`);
  return Buffer.concat([...partes, xref]);
}
const lineasPdf = (texto, x = 56, y0 = 790, tam = 10.5, paso = 15) => texto.split("\n").map((t, i) => [x, y0 - i * paso, tam, t]);
// 1 · PDF con contraseña (1234): certificado de saldos de CaixaBank
const CAIXA = `CAIXABANK, S.A. - Testamentarias - Oficina 0418 Malaga-Larios
DOCUMENTO FICTICIO - EJEMPLO PARA PROBAR HEREDA+
CERTIFICADO DE SALDOS A FECHA DE FALLECIMIENTO (20/04/2026)
Titular: ANTONIO JIMÉNEZ SOLER - NIF ${N.antonio}
Saldo Producto Contrato Titularidad
7.250,40 € Cuenta corriente ES76 2100 0418 4502 0005 1332 50 % (cotitular: Carmen Ruiz López)
15.000,00 € Depósito a plazo 24 meses ES76 2100 0418 4502 0005 1333 100 %
Certificado expedido a efectos del Impuesto sobre Sucesiones. Málaga, 6 de mayo de 2026.`;
fs.writeFileSync(FMT + "certificado-caixabank-con-contrasena.pdf", pdfTexto([lineasPdf(CAIXA)], { clave: "1234" }));
ESPF["certificado-caixabank-con-contrasena.pdf"] = { tipo: "bancario", clave: "1234", claves: ["ES7621000418450200051332", "7250.4", "15000"] };
// 2 · Formulario PDF rellenado en pantalla (modelo 650): las etiquetas en la página y los valores en los campos
const F650 = `AGENCIA TRIBUTARIA DE ANDALUCIA - DOCUMENTO FICTICIO
MODELO 650 - IMPUESTO SOBRE SUCESIONES Y DONACIONES
AUTOLIQUIDACION - ADQUISICIONES MORTIS CAUSA
Causante - Apellidos y nombre:
Fecha de devengo:
Sujeto pasivo - Apellidos y nombre:
Parentesco con el causante:
Base imponible (01):
Base liquidable (02):
Cuota tributaria (03):
Borrador - pendiente de presentacion`;
const L650 = lineasPdf(F650, 56, 790, 10.5, 24); const yC = (i) => L650[i][1] - 3;
fs.writeFileSync(FMT + "modelo-650-formulario-rellenado.pdf", pdfTexto([L650], { campos: [
  { nombre: "causante", valor: "JIMÉNEZ SOLER ANTONIO", rect: [270, yC(3), 520, yC(3) + 14] }, { nombre: "devengo", valor: "20/04/2026", rect: [270, yC(4), 400, yC(4) + 14] },
  { nombre: "sujeto", valor: "RUIZ LÓPEZ CARMEN", rect: [270, yC(5), 520, yC(5) + 14] }, { nombre: "parentesco", valor: "Cónyuge", rect: [270, yC(6), 400, yC(6) + 14] },
  { nombre: "c01", valor: "61.250,00", rect: [270, yC(7), 400, yC(7) + 14] }, { nombre: "c02", valor: "0,00", rect: [270, yC(8), 400, yC(8) + 14] }, { nombre: "c03", valor: "0,00", rect: [270, yC(9), 400, yC(9) + 14] }] }));
ESPF["modelo-650-formulario-rellenado.pdf"] = { tipo: "modelo650", claves: ["Antonio Jiménez Soler", "2026-04-20", "61250", "borrador"] };
// 3 · Correo .eml del banco con el certificado en PDF adjunto (y el logotipo incrustado, que no es un documento)
const pdfAdj = fs.readFileSync(OUT + "09-certificado-bancario-unicaja.pdf"); const b64 = (b) => Buffer.from(b).toString("base64").replace(/(.{76})/g, "$1\r\n");
const logo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const qp = (t) => Buffer.from(t, "latin1").toString("latin1").replace(/[^\x20-\x7e\n]|=/g, (c) => "=" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
fs.writeFileSync(FMT + "correo-unicaja-con-certificado.eml", Buffer.from([`From: =?UTF-8?B?${Buffer.from("Unicaja Banco · Testamentarías").toString("base64")}?= <testamentarias@unicaja.example>`, "To: despacho@ejemplo.example", `Subject: =?ISO-8859-1?Q?Certificado_de_posiciones_-_Antonio_Jim=E9nez_Soler?=`, "Date: Tue, 12 May 2026 10:15:00 +0200", "MIME-Version: 1.0", 'Content-Type: multipart/mixed; boundary="=_mixto_01"', "", "--=_mixto_01", 'Content-Type: multipart/related; boundary="=_rel_02"', "", "--=_rel_02", 'Content-Type: multipart/alternative; boundary="=_alt_03"', "", "--=_alt_03", "Content-Type: text/plain; charset=ISO-8859-1", "Content-Transfer-Encoding: quoted-printable", "",
  qp("Estimados señores:\n\nLes adjuntamos el certificado de posiciones a fecha de fallecimiento de D. Antonio Jiménez Soler que solicitaron.\n\nUn cordial saludo,\nServicio de Testamentarías (CORREO FICTICIO)").replace(/\n/g, "\r\n"), "--=_alt_03", "Content-Type: text/html; charset=UTF-8", "", "<p>Estimados señores:</p><p>Les adjuntamos el certificado.</p><img src=\"cid:logo1\">", "--=_alt_03--", "--=_rel_02", "Content-Type: image/png", "Content-ID: <logo1>", "Content-Disposition: inline", "Content-Transfer-Encoding: base64", "", b64(logo), "--=_rel_02--", "--=_mixto_01",
  'Content-Type: application/pdf; name="=?UTF-8?Q?certificado_posici=C3=B3n.pdf?="', "Content-Transfer-Encoding: base64", "Content-Disposition: attachment; filename*=UTF-8''certificado%20posici%C3%B3n%20Unicaja.pdf", "", b64(pdfAdj), "--=_mixto_01--", ""].join("\r\n"), "latin1"));
ESPF["correo-unicaja-con-certificado.eml"] = { tipo: "desconocido", adjunto: "bancario", claves: ["ES2121030000123456789012", "38500", "60000", "45000"] };
// 4 · Excel (.xlsx) exportado de la banca en línea, con fecha e importes con formato
const sx = (t) => xmlEsc(t);
const filasX = [["Certificado de saldos a fecha de fallecimiento - CaixaBank (FICTICIO)"], ["Titular", `ANTONIO JIMÉNEZ SOLER - NIF ${N.antonio}`], ["Fecha de saldo", { f: 46132 }], [], ["Producto", "Contrato", "Titularidad", "Saldo"], ["Cuenta corriente", "ES76 2100 0418 4502 0005 1332", "50 %", { n: 7250.4 }], ["Depósito a plazo 24 meses", "ES76 2100 0418 4502 0005 1333", "100 %", { n: 15000 }]];
const SS = []; const si = (t) => { let k = SS.indexOf(t); if (k < 0) { SS.push(t); k = SS.length - 1; } return k; };
const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filasX.map((F, r) => `<row r="${r + 1}">${F.map((v, c) => { const ref = "ABCD"[c] + (r + 1); return typeof v === "string" ? `<c r="${ref}" t="s"><v>${si(v)}</v></c>` : v.f ? `<c r="${ref}" s="1"><v>${v.f}</v></c>` : `<c r="${ref}" s="2"><v>${v.n}</v></c>`; }).join("")}</row>`).join("")}</sheetData></worksheet>`;
fs.writeFileSync(FMT + "saldos-caixabank.xlsx", zip([["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`],
  ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
  ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Saldos" sheetId="1" r:id="rId1"/></sheets></workbook>`],
  ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
  ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`],
  ["xl/sharedStrings.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${SS.length}" uniqueCount="${SS.length}">${SS.map((t) => `<si><t xml:space="preserve">${sx(t)}</t></si>`).join("")}</sst>`],
  ["xl/worksheets/sheet1.xml", hoja]]));
ESPF["saldos-caixabank.xlsx"] = { tipo: "bancario", claves: ["ES7621000418450200051332", "7250.4", "15000"] };
// 5 · Página web guardada de la Sede del Catastro (HTML, con scripts y estilos que no deben leerse)
fs.writeFileSync(FMT + "sede-catastro-garaje.html", `<!doctype html><html lang="es"><head><meta charset="windows-1252"><title>Sede Electrónica del Catastro</title><style>td{padding:4px}</style><script>var x = "Referencia catastral 0000000AA0000A0000AA";</script></head><body><h1>Sede Electr&oacute;nica del Catastro</h1><p>DOCUMENTO FICTICIO &middot; Certificaci&oacute;n catastral descriptiva y gr&aacute;fica</p><table><tr><td>Referencia catastral:</td><td>9876543UF6597N0012GR</td></tr><tr><td>Localizaci&oacute;n:</td><td>AV DE LOS MANANTIALES 5 -1 12 29620 TORREMOLINOS [M&Aacute;LAGA]</td></tr><tr><td>Clase:</td><td>Urbano</td></tr><tr><td>Uso principal:</td><td>Aparcamiento</td></tr><tr><td>Superficie construida:</td><td>24 m2</td></tr><tr><td>Valor catastral (2026):</td><td>18.000,00 &euro;</td></tr><tr><td>Valor catastral suelo:</td><td>8.000,00 &euro;</td></tr><tr><td>Valor catastral construcci&oacute;n:</td><td>10.000,00 &euro;</td></tr></table></body></html>`.replace(/[^\x00-\x7f]/g, (c) => `&#${c.charCodeAt(0)};`));
ESPF["sede-catastro-garaje.html"] = { tipo: "catastro", claves: ["9876543UF6597N0012GR", "18000", "8000", "Torremolinos"] };
// 6 · Recibo del IBI en RTF (programas de gestión municipal), con tildes en \\'hh
const rtfEsc = (t) => t.replace(/[\\{}]/g, (c) => "\\" + c).replace(/[^\x00-\x7f]/g, (c) => (c === "€" ? "\\'80" : `\\'${c.charCodeAt(0).toString(16)}`));
fs.writeFileSync(FMT + "recibo-ibi-patronato.rtf", `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}{\\*\\generator Gestion Tributaria 4.2;}\\pard\\f0\\fs20 ${["PATRONATO DE RECAUDACIÓN PROVINCIAL - DIPUTACIÓN DE MÁLAGA (DOCUMENTO FICTICIO)", "RECIBO DEL IMPUESTO SOBRE BIENES INMUEBLES DE NATURALEZA URBANA - EJERCICIO 2026", "Sujeto pasivo: JIMÉNEZ SOLER ANTONIO NIF " + N.antonio, "Objeto tributario: AV DE LOS MANANTIALES 5 -1 12 29620 TORREMOLINOS", "Referencia catastral: 9876543UF6597N0012GR"].map(rtfEsc).join("\\par\n")}\\par\n\\trowd\\cellx3000\\cellx6000 ${rtfEsc("Valor catastral")}\\cell 18.000,00 \\'80\\cell\\row\n\\trowd\\cellx3000\\cellx6000 ${rtfEsc("Valor catastral suelo")}\\cell 8.000,00 \\'80\\cell\\row\n\\trowd\\cellx3000\\cellx6000 ${rtfEsc("Base liquidable")}\\cell 18.000,00 \\'80\\cell\\row\n\\trowd\\cellx3000\\cellx6000 Cuota\\cell 97,20 \\'80\\cell\\row\n\\pard ${rtfEsc("Período voluntario: del 1 de abril al 5 de junio de 2026.")}\\par}`);
ESPF["recibo-ibi-patronato.rtf"] = { tipo: "ibi", claves: ["9876543UF6597N0012GR", "18000", "8000"] };
// 7 · Testamento en OpenDocument (.odt)
const odtTxt = DOCS["04-testamento-abierto.pdf"].replace(/<style[\s\S]*?<\/style>/, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|h1|h2|div|tr)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").split("\n").map((l) => l.trim()).filter(Boolean);
fs.writeFileSync(FMT + "testamento-copia.odt", zip([["mimetype", "application/vnd.oasis.opendocument.text"], ["META-INF/manifest.xml", `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>`],
  ["content.xml", `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2"><office:body><office:text>${odtTxt.map((l) => `<text:p>${xmlEsc(l)}</text:p>`).join("")}</office:text></office:body></office:document-content>`]]));
ESPF["testamento-copia.odt"] = { tipo: "testamento", claves: ["usufructo", "Fernando Ruiz Castillo"] };
// 8 · CSV exportado de la banca en línea (separador «;», importes a la española)
fs.writeFileSync(FMT + "posiciones-unicaja.csv", winAnsi(["UNICAJA BANCO;CERTIFICADO DE POSICIONES A FECHA DE FALLECIMIENTO (FICTICIO)", `Titular;ANTONIO JIMÉNEZ SOLER;NIF;${N.antonio}`, "Producto;IBAN;Titulares;Saldo", 'Cuenta corriente;ES21 2103 0000 1234 5678 9012;"Antonio Jiménez Soler y Carmen Ruiz López (indistinta)";38.500,00 €', "Depósito a plazo 12 meses;ES21 2103 0000 1234 5678 9013;Antonio Jiménez Soler;60.000,00 €"].join("\r\n"))); // en Windows-1252, como lo exporta la banca
ESPF["posiciones-unicaja.csv"] = { tipo: "bancario", claves: ["ES2121030000123456789012", "38500", "60000"] };
// 9 · TIFF de escáner de oficina (blanco y negro, 1 bit, dos páginas: el certificado y un reverso casi en blanco)
const ctxT = await b.newContext({ viewport: { width: 820, height: 1160 }, deviceScaleFactor: 1.5 }); const pt = await ctxT.newPage();
const grisDe = async (html) => { await pt.setContent(html, { waitUntil: "load" }); const png = (await pt.screenshot({ type: "png", fullPage: true })).toString("base64"); return pt.evaluate(async (png) => { const im = new Image(); im.src = "data:image/png;base64," + png; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const g = new Uint8Array(c.width * c.height); for (let i = 0; i < g.length; i++) g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11; let s = ""; for (let i = 0; i < g.length; i += 32768) s += String.fromCharCode.apply(null, g.subarray(i, i + 32768)); return { w: c.width, h: c.height, b64: btoa(s) }; }, png); };
const p1 = await grisDe(DOCS["01-certificado-defuncion.pdf"]), p2 = await grisDe(pagina(`<p class="small" style="margin-top:900px">Reverso · sin anotaciones marginales.</p>`));
const tiff1bit = (P) => { // 1 bit por píxel, sin compresión, WhiteIsZero
  const ifds = []; let datos = []; let off = 8;
  const bloques = P.map(({ w, h, b64 }) => { const g = Buffer.from(b64, "base64"); const fila = Math.ceil(w / 8); const bits = Buffer.alloc(fila * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y * w + x] < 150) bits[y * fila + (x >> 3)] |= 0x80 >> (x & 7); return { w, h, bits }; });
  for (const q of bloques) { q.off = off; datos.push(q.bits); off += q.bits.length; }
  const ent = (t, ty, n, v) => { const e = Buffer.alloc(12); e.writeUInt16LE(t, 0); e.writeUInt16LE(ty, 2); e.writeUInt32LE(n, 4); if (ty === 3 && n === 1) e.writeUInt16LE(v, 8); else e.writeUInt32LE(v, 8); return e; };
  const res = Buffer.alloc(8); res.writeUInt32LE(150, 0); res.writeUInt32LE(1, 4); const resOff = off; datos.push(res); off += 8;
  bloques.forEach((q, i) => { const E = [ent(256, 4, 1, q.w), ent(257, 4, 1, q.h), ent(258, 3, 1, 1), ent(259, 3, 1, 1), ent(262, 3, 1, 0), ent(273, 4, 1, q.off), ent(277, 3, 1, 1), ent(278, 4, 1, q.h), ent(279, 4, 1, q.bits.length), ent(282, 5, 1, resOff), ent(283, 5, 1, resOff), ent(296, 3, 1, 2)]; const n = Buffer.alloc(2); n.writeUInt16LE(E.length); const sig = Buffer.alloc(4); ifds.push({ n, E, sig }); });
  let ifdOff = off; const ifdBufs = ifds.map((d, i) => { const len = 2 + d.E.length * 12 + 4; const o = ifdOff; ifdOff += len; return { ...d, o, len }; });
  ifdBufs.forEach((d, i) => d.sig.writeUInt32LE(i + 1 < ifdBufs.length ? ifdBufs[i + 1].o : 0));
  const cab = Buffer.alloc(8); cab.write("II", 0, "latin1"); cab.writeUInt16LE(42, 2); cab.writeUInt32LE(ifdBufs[0].o, 4);
  return Buffer.concat([cab, ...datos, ...ifdBufs.flatMap((d) => [d.n, ...d.E, d.sig])]);
};
fs.writeFileSync(FMT + "defuncion-escaner-oficina.tif", tiff1bit([p1, p2]));
ESPF["defuncion-escaner-oficina.tif"] = { tipo: "defuncion", claves: ["Antonio Jiménez Soler", "2026-04-20", N.antonio] };
// 10 · Foto con la orientación en EXIF (el móvil guarda los píxeles de lado y anota «girar 90°»)
{ const g = await grisDe(DOCS["02-certificado-ultimas-voluntades.pdf"]); const jpg = await pt.evaluate(({ w, h, b64 }) => { const g = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const c = document.createElement("canvas"); c.width = h; c.height = w; const x = c.getContext("2d"); const im = x.createImageData(h, w); for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const v = g[y * w + xx]; const X = y, Y = w - 1 - xx; const i = (Y * h + X) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); return c.toDataURL("image/jpeg", 0.85).split(",")[1]; }, g);
  const J = Buffer.from(jpg, "base64"); const tiff = Buffer.alloc(26); tiff.write("II", 0, "latin1"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4); tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(6, 18); tiff.writeUInt32LE(0, 22);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.alloc(2), Buffer.from("Exif\0\0", "latin1"), tiff]); app1.writeUInt16BE(app1.length - 2, 2);
  fs.writeFileSync(FMT + "ultimas-voluntades-foto-exif-girada.jpg", Buffer.concat([J.subarray(0, 2), app1, J.subarray(2)])); }
ESPF["ultimas-voluntades-foto-exif-girada.jpg"] = { tipo: "ultimas", claves: ["Fernando Ruiz Castillo", "2015-06-15", "2026-04-20"] };
// 11 · PDF mixto: carátula con texto de la notaría y, detrás, el testamento escaneado (solo imagen)
{ const png = fs.readFileSync(RAIZ + "_testamento-pag.png").toString("base64"); await pt.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0;font:12pt Arial}.c{height:297mm;padding:40mm 25mm;box-sizing:border-box;page-break-after:always}img{width:210mm;display:block}</style></head><body><div class="c"><p>NOTARÍA DE D. FERNANDO RUIZ CASTILLO · MÁLAGA</p><p>COPIA SIMPLE (DOCUMENTO FICTICIO)</p><p>Protocolo número 1234 del año 2015.</p><p>Se acompaña copia escaneada del documento autorizado.</p></div><img src="data:image/png;base64,${png}"></body></html>`, { waitUntil: "load" }); await pt.pdf({ path: FMT + "testamento-caratula-y-escaneo.pdf", format: "A4", printBackground: true }); }
ESPF["testamento-caratula-y-escaneo.pdf"] = { tipo: "testamento", claves: ["usufructo"] };
// 12 · Foto HEIC del iPhone (fijo: tools/ejemplos/fijos, hecho con pillow-heif a partir de una foto del banco)
fs.copyFileSync(new URL("./fijos/foto-iphone-certificacion-catastral.heic", import.meta.url), FMT + "foto-iphone-certificacion-catastral.heic");
ESPF["foto-iphone-certificacion-catastral.heic"] = { tipo: "catastro", claves: ["1234567VK4713S0001OQ", "140000", N.antonio] };
fs.writeFileSync(FMT + "esperado.json", JSON.stringify(ESPF, null, 1));
await ctxT.close(); fs.rmSync(tmpPng);
await b.close();
fs.writeFileSync(RAIZ + "LEEME.txt", fs.readFileSync(new URL("./LEEME.txt", import.meta.url), "utf8").replace(/\n/g, "\r\n"));
for (const d of [OUT, OUT2, OUT3]) console.log(path.basename(d), "·", fs.readdirSync(d).length, "archivos");
console.log("banco de escaneos difíciles ·", fs.readdirSync(BANCO).filter((f) => f.endsWith(".jpg")).length, "fotos");
console.log("formatos ·", fs.readdirSync(FMT).filter((f) => f !== "esperado.json").length, "archivos");
