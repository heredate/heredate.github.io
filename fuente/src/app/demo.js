// ───────────────────── {{MARCA}} · modo demostración (prefijo dm / DM_) ─────────────────────
// Un despacho en marcha con 14 expedientes FICTICIOS (nombres inventados, NIF 000000NN con letra de control válida,
// referencias catastrales con «DEMO»), repartidos por Andalucía (Málaga, Marbella, Sevilla, Granada), Madrid, Cataluña,
// Comunitat Valenciana, Castilla-La Mancha, Galicia y Navarra (foral), en todas las fases del encargo.
// Todas las fechas se calculan desde hoy() y se regeneran al abrir la app otro día (dmAlDia), así la cartera siempre parece actual.
// Formas de datos: las mismas que usan logic.js (expediente), despacho.js (fases, bitácora, movs), tiempos.js (x.tiempos),
// terceros.js (x.solicitudes, x.recordatorios) y firma.js (nif, domicilio, estadoCivil, refCatastral, cargas, x.firma).
// API: demoCargar() → número de expedientes · demoSalir() · dmActivo() · dmAlDia() · dmBanner() (franja para el integrador) ·
//      dmAjustesHTML() (filas para Ajustes) · dmGuion() → pasos del guion · dmGuionAbrir()/dmGuionCerrar()/dmGuionAlternar().
// Eventos propios: [data-dm] = cargar | salir | guion | gIr | gPrev | gNext | gCerrar (escucha en captura sobre document);
// Mayúsculas+D abre o cierra el guion del presentador (solo con la demostración cargada).
// Marca de cada expediente: x.demo = true. Estado global: DB.demo = { fecha, v, prev: { despacho } }.

const DM_V = 1;
const DM = { panel: null, paso: 0 };
const DM_RES = { a1: "a1", a2: "dm-a2", a3: "dm-a3" };

// ── Utilidades de fecha (relativas a hoy(), en la misma convención UTC que usa la app) ──
function dmF(d) { const t = new Date(hoy() + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); }
const dmAtras = (f) => dias(f, hoy()); // días transcurridos desde f
// Fecha de fallecimiento para que el plazo de `meses` caiga exactamente en hoy + `enDias`
function dmFechaPara(meses, enDias) {
  const obj = dmF(enDias);
  for (let k = meses * 28 - 10; k < meses * 31 + 12; k++) { const f = dmF(enDias - k); if (trMeses(f, meses) === obj) return f; }
  return dmF(enDias - Math.round(meses * 30.44));
}
function dmT(f, hh, mm) { const d = new Date(`${f}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`); return isNaN(d) ? new Date().toISOString() : d.toISOString(); }
function dmRnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DM_LET = "TRWAGMYFPDXBNJZSQVHLCKE";
const dmNif = (n) => String(n).padStart(8, "0") + DM_LET[n % 23]; // 000000NN + letra correcta: válido y claramente ficticio
const dmRC = (n) => `00${String(n).padStart(5, "0")}DEMO000${String(n % 10000).padStart(4, "0")}DM`.slice(0, 20);

// ── Equipo del despacho de demostración ──
const DM_EQUIPO = [{ id: "dm-a2", nombre: "Andrés Collado Ruiz", rol: "Abogado asociado" }, { id: "dm-a3", nombre: "Marta Lozano Prieto", rol: "Abogada" }];
const DM_TITULAR = { nombre: "Elena Márquez Vidal", rol: "Socia" };

// ── Los 14 expedientes (todo inventado) ──
// p: [id, nombre, relacion, edad, extra] · b: [id, tipo, descripcion, valor, extra] · sol: solicitudes a terceros
function dmCasos() {
  const viv = (muni, vc, vs, fa, va) => ({ municipio: muni, valorCatastralTotal: vc, valorCatastralSuelo: vs, fechaAdq: fa, valorAdq: va });
  return [
    { n: 1, ref: 31, causante: "José Antonio Fernández Gil", cliente: "Carmen Ruiz Navarro", ccaa: "AND", civil: "gananciales", test: "no", fecha: dmF(-76), fase: "documentacion", resp: "a1", alta: 64, ult: 0, horas: 10,
      hon: { modo: "fijo", fijo: 2400 }, situ: { pensionista: true },
      p: [["p1", "Carmen Ruiz Navarro", "conyuge", 71], ["p2", "Pablo Fernández Ruiz", "hijo", 45], ["p3", "Laura Fernández Ruiz", "hijo", 41]],
      b: [["b1", "vivienda", "Piso en Teatinos, Málaga", 285000, { valorReferencia: 271000, titularidad: "ganancial", ...viv("MALAGA", 132000, 58000, "1998-03-12", 121000) }],
        ["b2", "inmueble", "Plaza de garaje en Teatinos, Málaga", 21000, { valorReferencia: 19500, titularidad: "ganancial", ...viv("MALAGA", 9800, 4100, "1998-03-12", 9000) }],
        ["b3", "cuenta", "Cuenta corriente en Unicaja", 48200, { titularidad: "ganancial" }], ["b4", "cuenta", "Depósito a plazo en CaixaBank", 30000, { titularidad: "ganancial" }],
        ["b5", "vehiculo", "Turismo (2017)", 7500, {}]],
      gastos: [["Funeral", 4300]],
      sol: [{ tipo: "banco", nombre: "Unicaja", bienes: ["b3"], env: 46, recs: [21], clave: "banco:ent:unicaja" }, { tipo: "banco", nombre: "CaixaBank", bienes: ["b4"], env: 12, clave: "banco:ent:caixabank" },
        { tipo: "registro", nombre: "Registro de la Propiedad de Málaga", que: "Nota simple de la finca: Piso en Teatinos, Málaga", bienes: ["b1"], docs: ["esc_b1"], env: 30, rec: 22, clave: "reg:b1" }],
      recs: [[16, "WhatsApp", 4]], curso: [["bancos_cert", 18]],
      notas: [[60, "Reunión con la viuda y los dos hijos: no hay testamento; se pide el certificado de últimas voluntades"], [41, "Llamada con Pablo: localizará la escritura del garaje"], [9, "La viuda aporta el libro de familia y el último recibo del IBI"]] },
    { n: 2, ref: 33, causante: "Manuel Ortega Sáez", cliente: "Lucía Ortega Campos", ccaa: "AND", civil: "gananciales", test: "usufructo", fecha: dmFechaPara(6, 4), fase: "liquidacion", resp: "a1", alta: 160, ult: 1, horas: 26,
      hon: { modo: "fijo", fijo: 1800 }, situ: { decesos: true, pensionista: true },
      p: [["p1", "Dolores Campos Vera", "conyuge", 74, { seguro: 30000 }], ["p2", "Lucía Ortega Campos", "hijo", 46], ["p3", "Alberto Ortega Campos", "hijo", 43], ["p4", "Irene Ortega Campos", "hijo", 38]],
      b: [["b1", "vivienda", "Vivienda en Nueva Andalucía, Marbella", 480000, { valorReferencia: 452000, titularidad: "ganancial", ...viv("MARBELLA", 190000, 95000, "1999-05-20", 130000) }],
        ["b2", "inmueble", "Local comercial en San Pedro de Alcántara", 160000, { valorReferencia: 148000, titularidad: "privativo", ...viv("MARBELLA", 70000, 30000, "2008-02-11", 120000) }],
        ["b3", "cuenta", "Cuentas en Banco Sabadell", 120000, { titularidad: "ganancial" }], ["b4", "valores", "Fondo de inversión en Bankinter", 60000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 4500]],
      tr: { prorroga: "na", isd: "curso", plusvalia: "curso", plusvalia_real: "na", aplazamiento: "na", escritura: "curso" },
      sol: [{ tipo: "banco", nombre: "Banco Sabadell", bienes: ["b3"], env: 120, rec: 88, clave: "banco:ent:banco sabadell" }, { tipo: "banco", nombre: "Bankinter", bienes: ["b4"], env: 118, rec: 95, clave: "banco:ent:bankinter" }],
      curso: [["isd", 6], ["plusvalia", 6]],
      notas: [[150, "Primera reunión con la familia: testamento del uno para el otro; la viuda quiere seguir en la vivienda"], [70, "Estudiada la conmutación del usufructo: la familia prefiere mantenerlo"], [12, "Enviado a la familia el borrador de liquidación del impuesto"], [3, "Lucía confirma la firma de las autoliquidaciones el jueves"]] },
    { n: 3, ref: 27, causante: "Rosario Domínguez Peña", cliente: "Antonio Vera Domínguez", ccaa: "AND", civil: "viudo", test: "porcentajes", fecha: dmF(-146), fase: "firma", resp: "dm-a2", alta: 133, ult: 0, horas: 21,
      hon: { modo: "pct", pct: 1.2, min: 1500 }, listo: true, nifC: 3, domC: "Calle Pureza 00, 41010 Sevilla",
      p: [["p1", "Antonio Vera Domínguez", "hijo", 52, { pct: 40, nif: dmNif(11), domicilio: "Calle Betis 00, 41010 Sevilla", estadoCivil: "casado_gananciales" }],
        ["p2", "Rocío Vera Domínguez", "hijo", 49, { pct: 60, discapacidad: 65, nif: dmNif(12), domicilio: "Calle Pureza 00, 41010 Sevilla", estadoCivil: "soltero" }]],
      b: [["b1", "vivienda", "Piso en Triana, Sevilla", 236000, { valorReferencia: 224000, titularidad: "privativo", refCatastral: dmRC(301), cargas: "Libre de cargas según nota simple", ...viv("SEVILLA", 98000, 41000, "1987-10-05", 52000) }],
        ["b2", "inmueble", "Plaza de garaje en Triana, Sevilla", 18000, { valorReferencia: 16500, titularidad: "privativo", refCatastral: dmRC(302), cargas: "Libre de cargas según nota simple", ...viv("SEVILLA", 7200, 3100, "1987-10-05", 4500) }],
        ["b3", "cuenta", "Cuenta corriente en BBVA", 64300, { titularidad: "privativo" }], ["b4", "valores", "Fondos de inversión en Banco Santander", 41000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 3900]], docs: 1, tr: { prorroga: "na" },
      sol: [{ tipo: "banco", nombre: "BBVA", bienes: ["b3"], env: 120, rec: 96, clave: "banco:ent:bbva" }, { tipo: "banco", nombre: "Banco Santander", bienes: ["b4"], env: 120, rec: 84, clave: "banco:ent:banco santander" }],
      firma: { notaria: "Notaría de D.ª Inés Gallardo Ruiz (ficticia), Sevilla", fecha: 6, tNotario: "D. Ricardo Soto Lara (ficticio)", tFecha: "2019-05-14", tProtocolo: "1.284", dec: { "apoyos-p2": { t: 3 } } },
      curso: [["escritura", 5]], pdf: [["notaria", 1]],
      notas: [[128, "Encargo firmado por los dos hermanos"], [70, "Rocío tiene reconocida una discapacidad del 65 %: se aplica la reducción y la mejora del testamento"], [20, "Cotejada la partición con los dos herederos: conformes"], [2, "Cita en la notaría confirmada"]] },
    { n: 4, ref: 24, causante: "Ramón Castillo Ibáñez", cliente: "Marina Castillo Ortiz", ccaa: "AND", civil: "soltero", test: "no", fecha: dmF(-121), fase: "documentacion", resp: "dm-a3", alta: 104, ult: 41, horas: 9,
      hon: { modo: "fijo", fijo: 2100 },
      p: [["p1", "Marina Castillo Ortiz", "sobrino", 44, { estirpe: "Pilar Castillo Ibáñez" }], ["p2", "Raúl Castillo Ortiz", "sobrino", 40, { estirpe: "Pilar Castillo Ibáñez" }], ["p3", "Sergio Castillo Molina", "sobrino", 37, { estirpe: "Luis Castillo Ibáñez" }]],
      b: [["b1", "vivienda", "Casa en el Albaicín, Granada", 265000, { valorReferencia: 248000, titularidad: "privativo", ...viv("GRANADA", 96000, 52000, "1979-06-18", 30000) }],
        ["b2", "cuenta", "Cuenta en Caja Rural de Granada", 38700, { titularidad: "privativo" }]],
      gastos: [["Funeral", 3600]],
      sol: [{ tipo: "banco", nombre: "Caja Rural", bienes: ["b2"], env: 56, clave: "banco:ent:caja rural" }],
      notas: [[98, "Los tres sobrinos están de acuerdo en vender la casa del Albaicín"], [41, "Pendiente de que Sergio envíe su DNI y el libro de familia de su padre"]] },
    { n: 5, ref: 29, causante: "Fernando Aguirre Salas", cliente: "Beatriz Lorente Gil", ccaa: "MAD", civil: "pareja", test: "porcentajes", fecha: dmFechaPara(5, 13), fase: "liquidacion", resp: "dm-a2", alta: 122, ult: 2, horas: 17,
      hon: { modo: "fijo", fijo: 2600 },
      p: [["p1", "Beatriz Lorente Gil", "pareja_hecho", 58, { pct: 30, inscrita: true }], ["p2", "Diego Aguirre Martín", "hijo", 34, { pct: 70 }]],
      b: [["b1", "vivienda", "Piso en Chamberí, Madrid", 540000, { valorReferencia: 498000, titularidad: "privativo", ...viv("MADRID", 205000, 121000, "2003-09-30", 310000) }],
        ["b2", "cuenta", "Cuenta en ING", 52400, { titularidad: "privativo" }], ["b3", "valores", "Cartera de fondos en MyInvestor", 88000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 5100]],
      sol: [{ tipo: "banco", nombre: "ING", bienes: ["b2"], env: 95, rec: 61, clave: "banco:ent:ing" }, { tipo: "banco", nombre: "MyInvestor", bienes: ["b3"], env: 95, recs: [52], clave: "banco:ent:myinvestor" }],
      curso: [["particion", 9]],
      notas: [[118, "Pareja de hecho inscrita en el Registro de Uniones de Hecho de la Comunidad de Madrid: equiparada en el impuesto"], [30, "Diego pregunta si conviene vender el piso antes de la escritura"], [4, "Preparada la simulación con y sin bonificación del 99 %"]] },
    { n: 6, ref: 38, causante: "Isabel Prieto Garrido", cliente: "Sonia Herrera Prieto", ccaa: "MAD", civil: "viudo", test: "no", fecha: dmF(-31), fase: "encargo", resp: "dm-a2", alta: 4, ult: 0, horas: 2,
      hon: { modo: "fijo", fijo: 2200 }, famEnv: 4,
      p: [["p1", "Sonia Herrera Prieto", "hijo", 50], ["p2", "Álvaro Herrera Sanz", "nieto", 22, { estirpe: "Jorge Herrera Prieto" }], ["p3", "Clara Herrera Sanz", "nieto", 19, { estirpe: "Jorge Herrera Prieto" }]],
      b: [["b1", "vivienda", "Chalet en Pozuelo de Alarcón", 690000, { valorReferencia: 640000, titularidad: "privativo", ...viv("POZUELO_DE_ALARCON", 260000, 150000, "1992-04-03", 180000) }],
        ["b2", "cuenta", "Cuentas en Banco Santander", 74000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 5600]],
      notas: [[4, "Primera reunión: el hijo Jorge falleció en 2019; heredan sus dos hijos por representación"]] },
    { n: 7, ref: 19, causante: "Jordi Puig Ferrer", cliente: "Montserrat Soler Vidal", ccaa: "CAT", civil: "separacion", test: "porcentajes", fecha: dmF(-246), fase: "inscripcion", resp: "a1", alta: 232, ult: 5, horas: 28,
      hon: { modo: "pct", pct: 1, min: 1800 },
      p: [["p1", "Montserrat Soler Vidal", "conyuge", 66, { pct: 40 }], ["p2", "Núria Puig Soler", "hijo", 38, { pct: 30 }], ["p3", "Marc Puig Soler", "hijo", 35, { pct: 30 }]],
      b: [["b1", "vivienda", "Pis a l'Eixample, Barcelona", 610000, { valorReferencia: 575000, titularidad: "privativo", ...viv("BARCELONA", 230000, 128000, "2001-11-15", 290000) }],
        ["b2", "cuenta", "Compte a CaixaBank", 96000, { titularidad: "privativo" }], ["b3", "valores", "Fons d'inversió a Banco Sabadell", 72000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 6200]], docs: 1, tr: { registro: "curso", catastro: "curso" },
      sol: [{ tipo: "registro", nombre: "Registro de la Propiedad de Barcelona", que: "Inscripción de la escritura de aceptación y adjudicación", bienes: ["b1"], env: 9, plazo: 15, clave: "reg:insc:b1" }],
      curso: [["registro", 9]],
      notas: [[226, "Encargo: la viuda y los hijos quieren repartir según el testamento sin vender nada"], [40, "Firmada la escritura de aceptación y adjudicación"], [20, "Presentado el impuesto y la plusvalía"], [9, "Presentada la escritura en el Registro"]] },
    { n: 8, ref: 35, causante: "Vicente Martí Roig", cliente: "Amparo Belda Ferrer", ccaa: "VAL", civil: "gananciales", test: "no", fecha: dmF(-82), fase: "documentacion", resp: "dm-a3", alta: 69, ult: 3, horas: 14,
      hon: { modo: "fijo", fijo: 2300 },
      p: [["p1", "Amparo Belda Ferrer", "conyuge", 48], ["p2", "Júlia Martí Belda", "hijo", 19], ["p3", "Pau Martí Belda", "hijo", 15]],
      b: [["b1", "vivienda", "Piso en Russafa, Valencia", 255000, { valorReferencia: 238000, titularidad: "ganancial", ...viv("VALENCIA", 104000, 47000, "2012-07-02", 196000) }],
        ["b2", "cuenta", "Cuenta en Banco Sabadell", 23800, { titularidad: "ganancial" }], ["b3", "vehiculo", "Turismo (2021)", 14500, { titularidad: "ganancial" }]],
      deudas: [["Hipoteca Banco Sabadell", 62000, true]], gastos: [["Funeral", 3800]],
      sol: [{ tipo: "banco", nombre: "Banco Sabadell", bienes: ["b2"], env: 33, recs: [10], deuda: true, clave: "banco:ent:banco sabadell" }],
      recs: [[24, "correo", 6], [3, "WhatsApp", 3]],
      notas: [[66, "Pau es menor (15 años): su madre también hereda; hará falta defensor judicial para la partición"], [25, "Pedida cita en el Juzgado para el nombramiento de defensor judicial"]] },
    { n: 9, ref: 30, causante: "Julián Moreno Díaz", cliente: "Elena Moreno Ruiz", ccaa: "CLM", civil: "viudo", test: "no", fecha: dmFechaPara(5, 2), fase: "liquidacion", resp: "dm-a2", alta: 128, ult: 1, horas: 18,
      hon: { modo: "fijo", fijo: 2000 },
      p: [["p1", "Ángel Moreno Ruiz", "hijo", 55, { renuncia: true }], ["p2", "Elena Moreno Ruiz", "hijo", 52], ["p3", "Tomás Moreno Ruiz", "hijo", 47]],
      b: [["b1", "vivienda", "Casa en el casco histórico de Toledo", 198000, { valorReferencia: 184000, titularidad: "privativo", ...viv("TOLEDO", 71000, 33000, "1984-02-20", 36000) }],
        ["b2", "cuenta", "Cuenta en Globalcaja", 26300, { titularidad: "privativo" }]],
      deudas: [["Préstamo personal en Ibercaja", 18000]], gastos: [["Funeral", 3300]],
      sol: [{ tipo: "banco", nombre: "Caja Rural", bienes: ["b2"], env: 70, rec: 35, clave: "banco:ent:caja rural" }],
      tr: { prorroga: "pend", renuncia: "hecho" }, docsSi: ["renuncia"],
      notas: [[120, "Ángel renuncia a la herencia por sus deudas: firmará la renuncia ante notario"], [44, "Escritura de renuncia de Ángel otorgada"], [5, "Valorar pedir la prórroga: falta el certificado de deuda de Ibercaja"]] },
    { n: 10, ref: 22, causante: "Manuel Lorenzo Otero", cliente: "Carmen Iglesias Pazos", ccaa: "GAL", civil: "gananciales", test: "usufructo", fecha: dmF(-168), fase: "firma", resp: "a1", alta: 150, ult: 1, horas: 24,
      hon: { modo: "fijo", fijo: 2500 }, nifC: 21, domC: "Rúa do Príncipe 00, 36202 Vigo",
      p: [["p1", "Carmen Iglesias Pazos", "conyuge", 77, { nif: dmNif(22), domicilio: "Rúa do Príncipe 00, 36202 Vigo", estadoCivil: "viudo" }],
        ["p2", "Xosé Lorenzo Iglesias", "hijo", 50, { nif: dmNif(23), domicilio: "Avenida de Castrelos 00, 36210 Vigo", estadoCivil: "casado_gananciales" }],
        ["p3", "Uxía Lorenzo Iglesias", "hijo", 47, { domicilio: "Rúa Real 00, 15003 A Coruña", estadoCivil: "divorciado" }]],
      b: [["b1", "vivienda", "Piso en el centro de Vigo", 248000, { valorReferencia: 231000, titularidad: "ganancial", refCatastral: dmRC(1001), ...viv("VIGO", 101000, 39000, "1990-01-25", 60000) }],
        ["b2", "inmueble", "Casa familiar en Baiona", 175000, { valorReferencia: 162000, titularidad: "privativo", refCatastral: dmRC(1002), cargas: "Libre de cargas según nota simple", municipio: "OTRO", tipoManual: 25, bonifManual: 0, valorCatastralTotal: 64000, valorCatastralSuelo: 29000, fechaAdq: "1975-08-01", valorAdq: 12000 }],
        ["b3", "cuenta", "Cuentas en Abanca", 91000, { titularidad: "ganancial" }]],
      gastos: [["Funeral", 4100]], docs: 1, tr: { prorroga: "na" }, recs: [[6, "correo", 2]],
      sol: [{ tipo: "banco", nombre: "Abanca", bienes: ["b3"], env: 39, recs: [17], clave: "banco:ent:abanca" }],
      firma: { notaria: "Notaría de D. Bieito Rial Sousa (ficticio), Vigo", fecha: 9 },
      curso: [["escritura", 8]],
      notas: [[145, "Encargo: testamento del uno para el otro, la viuda conserva el usufructo"], [60, "Uxía vive en A Coruña: firmará con poder o se desplazará"], [17, "Abanca sigue sin enviar el certificado de saldos: reclamado"]] },
    { n: 11, ref: 26, causante: "Fermín Echeverría Goñi", cliente: "Ainhoa Echeverría Larraya", ccaa: "NAV", civil: "viudo", test: "porcentajes", fecha: dmF(-97), fase: "documentacion", resp: "dm-a3", alta: 84, ult: 4, horas: 13,
      hon: { modo: "fijo", fijo: 2200 },
      p: [["p1", "Ainhoa Echeverría Larraya", "hijo", 51, { pct: 50 }], ["p2", "Iñaki Echeverría Larraya", "hijo", 48, { pct: 50 }]],
      b: [["b1", "vivienda", "Piso en el Ensanche, Pamplona", 315000, { valorReferencia: 296000, titularidad: "privativo", ...viv("PAMPLONA", 128000, 54000, "1994-12-01", 98000) }],
        ["b2", "cuenta", "Cuenta en Caja Rural de Navarra", 57000, { titularidad: "privativo" }], ["b3", "cuenta", "Cuenta en Laboral Kutxa", 31000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 4000]],
      sol: [{ tipo: "banco", nombre: "Caja Rural", bienes: ["b2"], env: 28, clave: "banco:ent:caja rural" }, { tipo: "banco", nombre: "Laboral Kutxa", bienes: ["b3"], env: 28, rec: 6, clave: "banco:ent:laboral kutxa" }],
      notas: [[80, "Derecho foral navarro: legítima formal; el testamento reparte por mitad"], [6, "Laboral Kutxa envía el certificado de saldos"]] },
    { n: 12, ref: 12, causante: "Concepción Vázquez Romero", cliente: "Francisco Molina Vázquez", ccaa: "AND", civil: "viudo", test: "porcentajes", fecha: dmF(-268), fase: "cerrado", resp: "a1", alta: 252, cierre: 18, ult: 18, horas: 22,
      hon: { modo: "fijo", fijo: 2400 }, docs: 1, devolver: true,
      p: [["p1", "Francisco Molina Vázquez", "hijo", 54, { pct: 50 }], ["p2", "Teresa Molina Vázquez", "hijo", 51, { pct: 50 }]],
      b: [["b1", "vivienda", "Piso en El Limonar, Málaga", 330000, { valorReferencia: 312000, titularidad: "privativo", ...viv("MALAGA", 121000, 55000, "1985-04-22", 61000) }],
        ["b2", "cuenta", "Cuenta en Unicaja", 54000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 4200]],
      notas: [[240, "Encargo firmado por los dos hermanos"], [60, "Escritura firmada; impuesto y plusvalía presentados"], [18, "Entregada la documentación original y liquidada la provisión de fondos"]] },
    { n: 13, ref: 8, causante: "Luis Ferrer Campos", cliente: "Pilar Gómez Arranz", ccaa: "MAD", civil: "gananciales", test: "no", fecha: dmF(-330), fase: "cerrado", resp: "dm-a2", alta: 318, cierre: 61, ult: 61, horas: 20, saldo: 140.35,
      hon: { modo: "fijo", fijo: 2200 }, docs: 1,
      p: [["p1", "Pilar Gómez Arranz", "conyuge", 69], ["p2", "Óscar Ferrer Gómez", "hijo", 40]],
      b: [["b1", "vivienda", "Piso en Arganzuela, Madrid", 395000, { valorReferencia: 372000, titularidad: "ganancial", ...viv("MADRID", 158000, 86000, "1996-06-14", 135000) }],
        ["b2", "cuenta", "Cuenta en BBVA", 46000, { titularidad: "ganancial" }]],
      gastos: [["Funeral", 4800]],
      notas: [[300, "Encargo de la viuda"], [62, "Inscrita la vivienda a nombre de los herederos"]] },
    { n: 14, ref: 25, causante: "Antonia Gómez Reina", cliente: "Rafael Gómez Reina", ccaa: "AND", civil: "soltero", test: "porcentajes", fecha: dmFechaPara(6, -3), fase: "liquidacion", resp: "dm-a3", alta: 172, ult: 0, horas: 19,
      hon: { modo: "fijo", fijo: 2100 }, situ: { pensionista: true },
      p: [["p1", "Rafael Gómez Reina", "hermano", 74, { pct: 50 }], ["p2", "Inmaculada Luque Gómez", "sobrino", 49, { pct: 50, estirpe: "Rosa Gómez Reina" }]],
      b: [["b1", "vivienda", "Piso en Huelin, Málaga", 198000, { valorReferencia: 186000, titularidad: "privativo", ...viv("MALAGA", 78000, 33000, "1991-09-09", 54000) }],
        ["b2", "cuenta", "Cuenta y depósito en Cajamar", 67000, { titularidad: "privativo" }]],
      gastos: [["Funeral", 3700]],
      tr: { prorroga: "na", isd: "curso", plusvalia: "hecho", plusvalia_real: "na", aplazamiento: "na" },
      sol: [{ tipo: "banco", nombre: "Cajamar", bienes: ["b2"], env: 63, recs: [33, 15], rec: 5, clave: "banco:ent:cajamar" }],
      curso: [["isd", 5]],
      notas: [[165, "Encargo del hermano y la sobrina; quieren vender el piso de Huelin"], [33, "Cajamar no responde: reclamado el certificado de saldos"], [5, "Cajamar entrega por fin el certificado: se prepara el impuesto con recargo"]] },
  ];
}

// ── Construcción de cada expediente ──
const DM_FASES_TR = ["urgente", "conocer", "inventario", "decidir", "formalizar", "titularidad", "despues"];
// Hasta qué fase de trámites está todo hecho y cuál está a medias, según la fase del encargo
const DM_AVANCE = { encargo: [-1, 0, 0.5], documentacion: [1, 2, 0.45], liquidacion: [2, 3, 0.5], firma: [3, 4, 0.35], inscripcion: [4, 5, 0.4], cerrado: [6, 7, 0] };
function dmConstruir(c, D) {
  const rnd = dmRnd(c.n * 7919 + 13);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const hora = () => [9 + Math.floor(rnd() * 10), [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][Math.floor(rnd() * 12)]];
  const alta = dmF(-c.alta), ultF = dmF(-(c.ult || 0));
  const equipo = [c.resp, c.resp, c.resp, "a1", c.resp === "a1" ? "dm-a3" : c.resp];
  const x = {
    id: "dm-" + String(c.n).padStart(2, "0"), demo: true, creado: alta, nombre: c.causante, fecha: c.fecha, ccaa: c.ccaa, civil: c.civil, testamento: c.test,
    ajuar: "sts", enPlazo: true, aplicarEmpresa: false, tareas: {}, situ: { ...(c.situ || {}) }, avisos: [], fase: c.fase, responsable: c.resp,
    personas: c.p.map(([id, nombre, relacion, edad, ex]) => ({ id, nombre, relacion, edad, ...(ex || {}) })),
    bienes: c.b.map(([id, tipo, descripcion, valor, ex]) => ({ id, tipo, descripcion, valor, titularidad: "privativo", ...(ex || {}) })),
    deudas: (c.deudas || []).map(([concepto, importe, ganancial]) => ({ concepto, importe, ...(ganancial ? { ganancial: true } : {}) })),
    gastos: (c.gastos || []).map(([concepto, importe]) => ({ concepto, importe })),
    tramites: {}, bitacora: [], tiempos: [], solicitudes: [], recordatorios: [],
  };
  if (c.nifC) { x.nifCausante = dmNif(c.nifC); x.domicilioCausante = c.domC || ""; }
  const hon = c.hon || { modo: "fijo", fijo: 2000 };
  x.despacho = { cliente: c.cliente, ref: `EXP-${hoy().slice(0, 4)}-${String(c.ref).padStart(3, "0")}`, alta, honModo: hon.modo, honFijo: hon.fijo || 1800, honPct: hon.pct || 1, honMin: hon.min || 1200, provision: 0, notaria: c.test === "no" ? 1900 : 1500, registro: 280, otros: 120, docs: {}, movs: [], checks: { ident: true, encargo: true, conflicto: true, datos: true }, nif: dmNif(100 + c.n) };
  const ev = []; // [fechaISO, tipo, texto, autor]
  const at = (f, tipo, texto, autor) => { const [hh, mm] = hora(); ev.push([dmT(f, hh, mm), tipo, texto, autor || pick(equipo)]); };
  const entre = (a, b) => { const da = dmAtras(a), db = dmAtras(b); return dmF(-Math.round(db + rnd() * Math.max(0, da - db))); };
  const finAct = c.cierre ? dmF(-c.cierre) : ultF;

  // Documentación recibida
  const fi = faseI(c.fase);
  const nec = docsNecesarios(x);
  const fr = c.docs != null ? c.docs : [0.12, 0.55, 1, 1, 1, 1][fi];
  nec.forEach(([id], i) => { if (i === 0 || (i / nec.length < fr && (fr >= 1 || rnd() < 0.9))) x.despacho.docs[id] = true; });
  if (c.n === 10) { delete x.despacho.docs.cert_b3; delete x.despacho.docs.esc_b1; }
  for (const id of c.docsSi || []) x.despacho.docs[id] = true;

  // Trámites: fases anteriores hechas, la actual a medias, lo vencido cerrado (salvo lo que el caso fija)
  const R0 = calcular(x);
  const T0 = tramitesExp(x, R0);
  const [hasta, media, frac] = DM_AVANCE[c.fase] || DM_AVANCE.encargo;
  for (const t of T0) {
    const fz = DM_FASES_TR.indexOf(t.fase);
    let st = "";
    if (fz <= hasta) st = t.informativo ? "" : "hecho";
    else if (fz === media && rnd() < frac) st = rnd() < 0.8 ? "hecho" : "curso";
    if (c.fase === "cerrado" && !t.informativo) st = "hecho";
    if (!st && t.limite && t.limite < hoy() && !t.informativo) st = t.id === "prorroga" ? "na" : "hecho";
    if (fi === 0 && ["defuncion", "custodia", "funeral"].includes(t.id)) st = "hecho";
    if (st) x.tramites[t.id] = { estado: st };
  }
  for (const [id, st] of Object.entries(c.tr || {})) { if (st === "pend") delete x.tramites[id]; else x.tramites[id] = { estado: st }; }
  for (const [id, d] of c.curso || []) x.tramites[id] = { estado: "curso" };
  if (c.n === 8) x.tramites.menores = { estado: "curso" };

  // Bitácora: alta, encargo, fases, trámites, solicitudes, recordatorios, notas
  at(alta, "sistema", "Expediente abierto", c.resp);
  at(alta, "nota", "Hoja de encargo firmada y provisión de fondos recibida", c.resp);
  const fases = FASES_EXP.map((f) => f[0]);
  for (let i = 1; i <= fi; i++) {
    const f = c.fase === "cerrado" && i === fi ? dmF(-c.cierre) : dmF(-Math.round(c.alta - (c.alta - (c.ult || 0)) * (i / (fi + 0.7))));
    at(f, "fase", `Fase: ${faseN(fases[i - 1])} → ${faseN(fases[i])}`, c.resp);
  }
  const T1 = tramitesExp(x, calcular(x));
  const hechos = T1.filter((t) => t.st === "hecho");
  const cursoD = Object.fromEntries((c.curso || []).map(([id, d]) => [id, d]));
  for (const t of hechos.filter(() => rnd() < 0.55).slice(0, 10)) at(t.limite && t.limite < finAct && dmAtras(t.limite) < c.alta ? entre(alta, t.limite) : entre(alta, finAct), "tramite", `${t.titulo}: hecho`);
  for (const t of T1.filter((q) => q.st === "curso")) at(dmF(-(cursoD[t.id] != null ? cursoD[t.id] : Math.max(c.ult || 0, Math.min(c.alta - 2, 8 + Math.floor(rnd() * 14))))), "tramite", `${t.titulo}: en curso`);
  for (const [d, texto] of c.notas || []) at(dmF(-d), "nota", texto);
  for (const [k, d] of c.pdf || []) at(dmF(-d), "doc", `PDF descargado: ${DOC_TIT[k] || k}`);
  if (fi >= 2) at(entre(alta, finAct), "doc", "Informe de cálculo descargado en PDF");
  if (fi >= 1) at(entre(alta, finAct), "doc", "Escrito descargado: Carta al banco");

  // Solicitudes a terceros
  for (const s of c.sol || []) {
    const bienes = s.bienes || [];
    const docs = s.docs || bienes.map((id) => "cert_" + id).concat(s.deuda ? ["deudas"] : []);
    const recs = (s.recs || []).map((d) => dmF(-d));
    const tipoTC = typeof TC_TIPOS === "object" && TC_TIPOS[s.tipo] ? TC_TIPOS[s.tipo] : { plazo: 30, que: "" };
    const q = { id: `${x.id}-s${x.solicitudes.length + 1}`, clave: s.clave || "", tercero: { tipo: s.tipo, nombre: s.nombre, contacto: "" }, que: s.que || (s.tipo === "banco" ? tipoTC.que + (s.deuda ? " y certificado de la deuda pendiente" : "") : tipoTC.que), bienId: bienes[0] || "", bienIds: bienes, docs, enviada: dmF(-s.env), plazoEsperado: s.plazo || tipoTC.plazo, recibida: s.rec != null ? dmF(-s.rec) : "", estado: s.rec != null ? "recibida" : recs.length ? "reclamada" : "enviada", recordatorios: recs, notas: "", creada: dmF(-s.env - 1) };
    x.solicitudes.push(q);
    at(dmF(-s.env - 1), "sistema", `Solicitud a terceros añadida: ${s.nombre}`);
    recs.forEach((f) => at(f, "nota", `Reclamación a ${s.nombre} (${dias(q.enviada, f)} días desde el envío)`));
    if (s.rec != null) { at(q.recibida, "sistema", `Respuesta recibida: ${s.nombre}`); for (const id of docs) x.despacho.docs[id] = true; }
    else for (const id of docs) delete x.despacho.docs[id];
  }
  // Recordatorios a la familia
  const faltan = docsNecesarios(x).filter(([id]) => !x.despacho.docs[id]).map(([id]) => id);
  const u0 = c.ult || 0;
  const recsC = c.recs || (faltan.length && fi >= 1 && fi <= 4 ? [[Math.max(u0, Math.min(c.alta - 3, 6 + (c.n % 7))), "WhatsApp", faltan.length], ...(c.alta > 40 ? [[Math.max(u0 + 6, Math.min(c.alta - 10, 27 + (c.n % 4))), "correo", faltan.length]] : [])] : []);
  for (const [d, canal, n] of recsC) { const f = dmF(-d); x.recordatorios.push({ fecha: f, canal, docs: faltan.slice(0, n) }); at(f, "nota", `Recordatorio a la familia por ${canal} (${plural(Math.min(n, faltan.length) || n, "documento")})`); }
  if (c.famEnv != null) x.familiaEnviado = dmF(-c.famEnv);
  if (c.famEnv != null) at(dmF(-c.famEnv), "sistema", "Cuestionario de datos enviado a la familia por WhatsApp");

  // Firma prevista
  if (c.firma) {
    const fm = c.firma;
    x.firma = { notaria: fm.notaria || "", email: "", fecha: dmF(fm.fecha), tNotario: fm.tNotario || "", tFecha: fm.tFecha || "", tProtocolo: fm.tProtocolo || "", dec: {} };
    for (const [k, v] of Object.entries(fm.dec || {})) x.firma.dec[k] = { t: dmF(-v.t) };
    at(dmF(-Math.min(c.alta - 1, 12)), "nota", `Firma prevista el ${fechaLarga(x.firma.fecha)} en la ${fm.notaria.replace(/ \(fictici[oa]\)/, "")}`);
  }

  // Fondos del cliente
  const R = calcular(x);
  const P = presupuesto(x, R);
  const presup = Math.round((P.honorarios + P.iva) * 100) / 100;
  const M = x.despacho.movs;
  const mov = (d, tipo, concepto, importe) => { const f = dmF(-d); M.push({ id: `${x.id}-m${M.length + 1}`, tipo, concepto, importe: Math.round(importe * 100) / 100, fecha: f }); at(f, "fondos", `${MOV_T[tipo][0]}: ${eur(Math.round(importe * 100) / 100)}${concepto && concepto !== MOV_T[tipo][0] ? " (" + concepto + ")" : ""}`); };
  const prov1 = Math.round((presup * 0.45 + 300) / 50) * 50;
  mov(c.alta - 1, "provision", "Provisión inicial", prov1);
  const nInm = x.bienes.filter((b) => b.tipo === "vivienda" || b.tipo === "inmueble").length;
  let sup = 0, honA = 0;
  const S = (d, concepto, imp) => { if (d < (c.ult || 0)) d = c.ult || 0; sup += imp; mov(d, "suplido", concepto, imp); };
  if (fi >= 1 || c.alta > 10) S(Math.max(1, c.alta - 9), "Certificados de últimas voluntades y seguros", 15.28);
  if (fi >= 1 && nInm) S(Math.max(1, c.alta - 16), `Notas simples del Registro (${nInm})`, 9.02 * nInm);
  if (fi >= 2 && x.testamento === "no") S(Math.max(1, Math.round(c.alta * 0.55)), "Acta de declaración de herederos", 468.6);
  if (fi >= 4 || (fi === 3 && c.n === 3)) { /* la notaría se paga el día de la firma */ }
  if (fi >= 4) S(Math.max(1, Math.round(c.alta * 0.2)), "Notaría: escritura de aceptación y adjudicación", 1384.5 + nInm * 120);
  if (fi >= 5) S(Math.max(1, Math.round((c.cierre || 1) + 8)), "Registro de la Propiedad", 212.4 + nInm * 64);
  const pctHon = [0, 0, 0.4, 0.5, 0.7, 1][fi];
  if (pctHon) {
    if (pctHon >= 1) { honA = presup; mov(Math.max(c.ult || 0, Math.round((c.cierre || 1) + 3)), "honorarios", "Minuta final", presup); }
    else { honA = Math.round(presup * pctHon * 100) / 100; mov(Math.max(c.ult || 0, Math.round(c.alta * 0.35)), "honorarios", "Minuta parcial", honA); }
  }
  const objetivoSaldo = c.saldo != null ? c.saldo : c.devolver ? 0 : 120 + Math.round(rnd() * 380);
  const falta = sup + honA + objetivoSaldo - prov1;
  if (falta > 0.005) {
    if (c.devolver) mov(Math.round(c.alta * 0.5), "provision", "Segunda provisión de fondos", Math.ceil(falta / 50) * 50 + 0);
    else mov(Math.max(c.ult || 0, Math.round(c.alta * 0.5)), "provision", "Segunda provisión de fondos", falta);
  }
  if (c.devolver) { const F = fondos(x, R); if (F.saldo > 0.005) mov(c.cierre, "devolucion", "Devolución del saldo de la provisión", F.saldo); }

  // Tiempos (x.tiempos) entre el alta y la última actividad
  const cats = [["Reunión con la familia", "reunion"], ["Llamada con el cliente", "reunion"], ["Revisión de documentación", "documentacion"], ["Inventario y valoración de bienes", "documentacion"], ["Trámites", "tramites"], ["Liquidación del Impuesto sobre Sucesiones", "impuestos"], ["Plusvalía municipal", "impuestos"], ["Estrategia fiscal", "impuestos"], ["Partición", "particion"], ["Preparación de la escritura", "escritos"], ["Firma en notaría", "tramites"], ["Inscripción en el Registro", "tramites"]];
  let resto = Math.round((c.horas || 6) * 60);
  const span = Math.max(1, c.alta - (c.cierre || c.ult || 0));
  let k = 0;
  while (resto > 0 && k < 40) {
    const m = Math.min(resto, [15, 20, 30, 30, 45, 45, 60, 60, 75, 90, 120, 150][Math.floor(rnd() * 12)]);
    const pos = Math.min(0.999, (k + rnd()) / Math.max(4, Math.ceil((c.horas || 6) / 1.1)));
    const d = Math.round((c.cierre || c.ult || 0) + span * (1 - pos));
    const etapa = Math.min(cats.length - 1, Math.floor(pos * (2 + fi * 2)));
    const [concepto, cat] = k === 0 ? cats[0] : cats[Math.max(0, Math.min(cats.length - 1, etapa - 1 + Math.floor(rnd() * 3)))];
    x.tiempos.push({ id: `${x.id}-t${k + 1}`, fecha: dmF(-d), minutos: m, concepto, cat, quien: k % 4 === 3 ? pick(["a1", "dm-a2", "dm-a3"]) : c.resp, origen: rnd() < 0.4 ? "cronometro" : "manual" });
    resto -= m; k++;
  }
  x.tiempos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Ordenar y recortar la bitácora (más reciente primero; nada posterior a la última actividad del caso)
  const lim = c.cierre != null || c.ult ? dmT(finAct, 23, 59) : null;
  x.bitacora = ev.filter((e) => !lim || e[0] <= lim).sort((a, b) => b[0].localeCompare(a[0])).map(([t, tipo, texto, autor]) => ({ t, tipo, texto, autor }));
  return x;
}

// ── Estado ──
const dmActivo = () => !!(DB && Array.isArray(DB.expedientes) && DB.expedientes.some((x) => x && x.demo));
function dmDespacho() {
  const D = despachoCfg();
  const tit = D.abogados[0];
  if (!D.nombre) D.nombre = "Márquez Collado Abogados";
  if (!D.colegio) D.colegio = "Ilustre Colegio de Abogados de Málaga";
  if (!D.localidad) D.localidad = "Málaga";
  if (!tit.nombre || /^titular del despacho$/i.test(tit.nombre)) { tit.nombre = DM_TITULAR.nombre; tit.rol = DM_TITULAR.rol; }
  for (const a of DM_EQUIPO) if (!D.abogados.some((q) => q.id === a.id)) D.abogados.push({ ...a });
  if (!D.yo || !D.abogados.some((a) => a.id === D.yo)) D.yo = tit.id;
  if (!num(D.tarifaHora)) D.tarifaHora = 120;
  return D;
}
function dmGenerar() {
  const D = dmDespacho();
  const a1 = D.abogados[0].id;
  return dmCasos().map((c) => {
    const cc = { ...c, resp: c.resp === "a1" ? a1 : c.resp };
    const x = dmConstruir(cc, D);
    const fix = (id) => (id === "a1" ? a1 : id);
    x.responsable = fix(x.responsable);
    for (const t of x.tiempos) t.quien = fix(t.quien);
    for (const b of x.bitacora) b.autor = fix(b.autor);
    return x;
  });
}
function demoCargar() {
  const yaEstaba = dmActivo();
  if (!DB.demo || !DB.demo.prev) DB.demo = { prev: { despacho: JSON.parse(JSON.stringify(DB.despacho || {})) } };
  DB.expedientes = DB.expedientes.filter((x) => !x.demo);
  const L = dmGenerar();
  // Foto del despacho tal como lo deja la demostración: al salir, lo que el usuario cambie respecto a esta foto se conserva (H10)
  if (!DB.demo.puesto) DB.demo.puesto = JSON.parse(JSON.stringify(DB.despacho || {}));
  DB.expedientes.push(...L);
  DB.demo.fecha = hoy(); DB.demo.v = DM_V;
  try { const ids = ["dm-02", "dm-03", "dm-01"]; DB.recientes = [...ids, ...((DB.recientes || []).filter((i) => !ids.includes(i)))].slice(0, 12); } catch (e) {}
  try { if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); } catch (e) {}
  guardar();
  if (!yaEstaba) DM.paso = 0;
  return L.length;
}
function demoSalir() {
  const ids = new Set(DB.expedientes.filter((x) => x.demo).map((x) => x.id));
  DB.expedientes = DB.expedientes.filter((x) => !x.demo);
  if (DB.demo && DB.demo.prev) DB.despacho = dmDespachoAlSalir(DB.demo.prev.despacho, DB.despacho, DB.demo.puesto);
  if (!DB.despacho || !Object.keys(DB.despacho).length) delete DB.despacho;
  delete DB.demo;
  // Expedientes reales creados durante la demostración y asignados a un miembro ficticio: pasan al titular (M6)
  try { const ficticios = new Set(DM_EQUIPO.map((a) => a.id)), D = despachoCfg(), tit = D.yo && D.abogados.some((a) => a.id === D.yo) ? D.yo : D.abogados[0]?.id;
    for (const x of DB.expedientes) if (x && ficticios.has(x.responsable)) { x.responsable = tit; anotar(x, "Responsable: el asignado era del equipo de la demostración; pasa al titular del despacho", "sistema"); } } catch (e) { console.error(e); }
  if (Array.isArray(DB.recientes)) DB.recientes = DB.recientes.filter((i) => !ids.has(i));
  if (DB.cronometro && ids.has(DB.cronometro.xId)) delete DB.cronometro;
  try { if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); } catch (e) {}
  guardar();
  dmGuionCerrar();
  return ids.size;
}
// Despacho al salir de la demostración: se parte del que había antes y se conserva todo lo que el usuario cambió durante
// la demostración (calculadora para la web, contacto, nombre, colegio, tarifa…); el equipo ficticio se quita.
function dmDespachoAlSalir(prev, actual, puesto) {
  const P = prev && typeof prev === "object" ? JSON.parse(JSON.stringify(prev)) : {}, A = actual && typeof actual === "object" ? actual : {}, F = puesto && typeof puesto === "object" ? puesto : null;
  const igual = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  for (const k of Object.keys(A)) {
    if (k === "abogados" || k === "yo") continue;
    const deLaDemo = { nombre: "Márquez Collado Abogados", colegio: "Ilustre Colegio de Abogados de Málaga", localidad: "Málaga", tarifaHora: 120 }[k];
    if (F ? !igual(A[k], F[k]) : !(k in P) && !igual(A[k], deLaDemo)) P[k] = JSON.parse(JSON.stringify(A[k]));
  }
  // Equipo: sin los miembros ficticios; el titular recupera su nombre si la demo se lo había puesto y no se tocó
  const ficticios = new Set(DM_EQUIPO.map((a) => a.id));
  const prevAb = Array.isArray(P.abogados) ? P.abogados : [];
  const ab = (Array.isArray(A.abogados) ? A.abogados : prevAb).filter((a) => a && !ficticios.has(a.id)).map((a) => {
    const antes = prevAb.find((q) => q.id === a.id), enDemo = F && Array.isArray(F.abogados) ? F.abogados.find((q) => q.id === a.id) : null;
    const sinTocar = enDemo && a.nombre === enDemo.nombre && a.rol === enDemo.rol;
    if (sinTocar && antes) return { ...a, nombre: antes.nombre, rol: antes.rol };
    if (sinTocar && a.nombre === DM_TITULAR.nombre) return { ...a, nombre: "Titular del despacho", rol: "Socio" };
    return { ...a };
  });
  if (ab.length) P.abogados = ab; else delete P.abogados;
  if (P.abogados && !P.abogados.some((a) => a.id === (A.yo || P.yo))) P.yo = P.abogados[0].id; else if (A.yo && !ficticios.has(A.yo)) P.yo = A.yo;
  return P;
}
// Si la demostración se cargó otro día, se regenera con las fechas de hoy (mismos identificadores)
function dmAlDia() {
  try { if (dmActivo() && DB.demo && (DB.demo.fecha !== hoy() || DB.demo.v !== DM_V)) demoCargar(); } catch (e) { console.error(e); }
}

// ── Franja «Modo demostración» y filas de Ajustes ──
function dmBanner() {
  if (!dmActivo()) return "";
  const n = DB.expedientes.filter((x) => x.demo).length;
  return `<div class="dm-banner" role="status"><span class="dm-dot" aria-hidden="true"></span><b>Modo demostración</b><span class="dm-sub">${plural(n, "expediente ficticio", "expedientes ficticios")}</span><span class="dm-sp"></span><button type="button" class="dm-bb" data-dm="guion" aria-keyshortcuts="Shift+D">Guion<kbd>⇧D</kbd></button><button type="button" class="dm-bb dm-out" data-dm="salir">Salir</button></div>`;
}
function dmAjustesHTML() {
  const on = dmActivo();
  const ic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M10 8.5v5l4-2.5z"/></svg>';
  return `<div class="sectitle">Demostración y ayuda</div><div class="group" style="--inset:60px">${on
    ? `<button class="row" data-dm="salir"><span class="ico orange">${ic}</span><span class="t"><b>Salir del modo demostración</b><small>${(() => { const n = DB.expedientes.filter((x) => x.demo).length; return n === 1 ? "Quita el expediente ficticio" : `Quita los ${n} expedientes ficticios`; })()}; lo que hayas configurado del despacho se conserva</small></span>${I.chev}</button><button class="row" data-dm="guion"><span class="ico q">${I.list}</span><span class="t"><b>Guion de la demostración</b><small>Siete pasos, tres minutos · Mayúsculas+D</small></span>${I.chev}</button>`
    : `<button class="row" data-dm="cargar"><span class="ico blue">${ic}</span><span class="t"><b>Modo demostración</b><small>Un despacho en marcha con 14 expedientes ficticios; tus datos no se tocan</small></span>${I.chev}</button>`}<button class="row" data-bv="abrir"><span class="ico green">${I.spark}</span><span class="t"><b>Ver la bienvenida otra vez</b><small>Datos del despacho y recorrido de 20 segundos</small></span>${I.chev}</button></div>`;
}

// ── Guion del presentador (Congreso: tres minutos, siete pasos) ──
function dmGuion() {
  return [
    { t: "Mi día", min: "0:00", ir: { vista: "radar" }, clic: "Abre Mi día (barra lateral).", decir: "Esto es lo primero que ve el despacho cada mañana: qué vence, qué está bloqueado y quién lo debe. Aquí, un Impuesto de Sucesiones vencido hace tres días con su recargo calculado, y la autoliquidación de Marbella que vence esta semana." },
    { t: "Diagnóstico", min: "0:25", ir: { vista: "exp", id: "dm-02", sec: "diagnostico" }, clic: "Expediente de Marbella › Diagnóstico.", decir: "Cada expediente se revisa solo: datos que faltan, riesgos con su artículo y el dinero en juego. No es inteligencia artificial: son reglas, con la fuente y su estado de verificación." },
    { t: "Impuestos y estrategia", min: "0:50", ir: { vista: "exp", id: "dm-02", sec: "estrategia" }, clic: "Pestaña Estrategia (o Impuestos).", decir: "Sucesiones y plusvalía de cada heredero paso a paso, con la ordenanza de su municipio. Y las palancas de ahorro con su riesgo: el abogado decide." },
    { t: "Bancos y terceros", min: "1:15", ir: { vista: "exp", id: "dm-01", sec: "terceros" }, clic: "Expediente de Málaga › Terceros.", decir: "Unicaja lleva más de 45 días sin contestar. Un clic y está la reclamación al servicio de atención al cliente; después, el escrito al Banco de España." },
    { t: "Para la familia", min: "1:40", ir: { vista: "exp", id: "dm-02", sec: "resumen" }, accion: "reunion", clic: "Botón «Para la familia» › Modo reunión.", decir: "En la reunión, la familia ve su herencia en pantalla completa: quién recibe qué, cuánto paga y qué falta. Y se lleva una carpeta para el móvil." },
    { t: "Listo para firmar", min: "2:05", ir: { vista: "exp", id: "dm-03", sec: "firma" }, clic: "Expediente de Sevilla › Firma.", decir: "Antes de la notaría, comprueba NIF, referencias catastrales, títulos, cuadre de la partición y legítimas. Y genera el paquete para el notario y la hoja del 650." },
    { t: "Rentabilidad", min: "2:30", ir: { vista: "rent" }, clic: "Rentabilidad (barra lateral).", decir: "Y para el titular: horas, euros por hora de cada expediente, minutas pendientes y provisiones sin devolver. Treinta días de prueba, sin instalar nada y sin que los datos salgan del ordenador." },
  ];
}
function dmGuionPintar() {
  const el = DM.panel; if (!el) return;
  const G = dmGuion(), i = Math.max(0, Math.min(G.length - 1, DM.paso)), g = G[i];
  el.innerHTML = `<div class="dm-g-h"><span class="dm-g-k">Guion · ${i + 1} de ${G.length}</span><span class="dm-g-min">${esc(g.min)}</span><button type="button" class="dm-g-x" data-dm="gCerrar" aria-label="Cerrar el guion">×</button></div>
    <ol class="dm-g-dots" aria-hidden="true">${G.map((q, k) => `<li class="${k < i ? "ok" : k === i ? "on" : ""}"></li>`).join("")}</ol>
    <b class="dm-g-t">${esc(g.t)}</b>
    <p class="dm-g-clic">${esc(g.clic)}</p>
    <p class="dm-g-decir">«${esc(g.decir)}»</p>
    <div class="dm-g-acts"><button type="button" class="dm-g-b" data-dm="gPrev" ${i === 0 ? "disabled" : ""} aria-label="Paso anterior">‹</button><button type="button" class="dm-g-b dm-g-ir" data-dm="gIr">Ir</button><button type="button" class="dm-g-b" data-dm="gNext" ${i === G.length - 1 ? "disabled" : ""} aria-label="Paso siguiente">›</button></div>`;
}
function dmGuionAbrir() {
  if (!dmActivo()) return;
  if (!DM.panel) {
    const el = document.createElement("aside"); el.className = "dm-guion"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Guion de la demostración");
    document.body.appendChild(el); DM.panel = el;
  }
  dmGuionPintar();
}
function dmGuionCerrar() { if (DM.panel) { DM.panel.remove(); DM.panel = null; } }
function dmGuionAlternar() { if (DM.panel) dmGuionCerrar(); else dmGuionAbrir(); }
function dmGuionIr() {
  const g = dmGuion()[DM.paso]; if (!g) return;
  if (typeof reunionCerrar === "function" && typeof RN === "object" && RN.el) reunionCerrar();
  const v = { sheet: null, ...g.ir };
  if (v.vista === "exp" && !DB.expedientes.some((x) => x.id === v.id)) return;
  go(v);
  if (g.accion === "reunion") { const x = exp(); if (x && typeof reunionAbrir === "function") reunionAbrir(x); }
}

// ── Eventos ──
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-dm]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const a = b.dataset.dm;
  if (a === "cargar") {
    if (typeof ui === "object") ui.sheet = null;
    const n = demoCargar(); go({ vista: "radar", sheet: null });
    toast(`Modo demostración: ${n} expedientes ficticios. Mayúsculas+D abre el guion`);
    return;
  }
  if (a === "salir") { const n = demoSalir(); go({ vista: "inicio", id: null, sheet: null }); toast(n ? "Modo demostración cerrado: se han quitado los expedientes ficticios" : "Sin expedientes de demostración"); return; }
  if (a === "guion") { dmGuionAlternar(); return; }
  if (a === "gCerrar") { dmGuionCerrar(); return; }
  if (a === "gPrev") { DM.paso = Math.max(0, DM.paso - 1); dmGuionPintar(); return; }
  if (a === "gNext") { DM.paso = Math.min(dmGuion().length - 1, DM.paso + 1); dmGuionPintar(); return; }
  if (a === "gIr") { dmGuionIr(); dmGuionPintar(); }
}, true);
document.addEventListener("keydown", (e) => {
  if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "d") return;
  const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (!dmActivo()) return;
  e.preventDefault(); dmGuionAlternar();
}, true);
