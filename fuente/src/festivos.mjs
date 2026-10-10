// {{MARCA}} · Calendario de días inhábiles para el cómputo de plazos (G09) · 10-10-2026
// Art. 30 Ley 39/2015: son inhábiles los sábados, los domingos y los festivos (30.2); el calendario oficial de inhábiles se publica cada año (30.7):
// el estatal por la Secretaría de Estado de Función Pública (BOE), el autonómico y el local por cada comunidad. Si un día es hábil donde reside el
// interesado e inhábil en la sede del órgano, o al revés, se considera inhábil (30.6). Supletorio en los procedimientos tributarios (DA 1.ª Ley 39/2015).
// Datos: solo los días propios de cada comunidad o municipio que caen en día laborable o que la norma recoge (los nacionales van en FESTIVOS_NACIONALES).
// Estado de cada lista:
//   VERIFICADO: norma autonómica o resolución citada y cotejada con al menos otra fuente (prensa oficial de la comunidad, BOE o boletín provincial).
//   PENDIENTE: una sola fuente secundaria, fechas discrepantes o lista incompleta. Los días PENDIENTES no trasladan el vencimiento (regla prudente:
//   se presenta antes); el motor los muestra como «posible festivo» para que el abogado lo compruebe.
// Consulta hecha el 10-10-2026 con búsqueda web (boe.es, juntadeandalucia.es y los boletines no se pueden abrir directamente desde la herramienta).
// Para añadir un año: copiar la estructura, citar la norma y dejar PENDIENTE hasta cotejarla.
const FV = "VERIFICADO", FP = "PENDIENTE";

// ── Nacionales (art. 30.2 Ley 39/2015), además de sábados y domingos ──
// 2025: Resolución de 16-12-2024 de la SE de Función Pública (BOE-A-2024-26935) · 2026: Resolución de 18-11-2025 (BOE-A-2025-23702).
// 2027: la resolución estatal no se ha publicado a 10-10-2026. Las fiestas de fecha fija que caen en laborable y el Viernes Santo (26-03-2027) están en los
// diecisiete calendarios autonómicos ya aprobados (Asturias, pendiente), por lo que se cuentan como nacionales (estado PENDIENTE hasta el BOE).
export const FESTIVOS_NACIONALES = {
  2025: ["2025-01-01", "2025-01-06", "2025-04-18", "2025-05-01", "2025-08-15", "2025-12-08", "2025-12-25"],
  2026: ["2026-01-01", "2026-01-06", "2026-04-03", "2026-05-01", "2026-10-12", "2026-12-08", "2026-12-25"],
  2027: ["2027-01-01", "2027-01-06", "2027-03-26", "2027-10-12", "2027-11-01", "2027-12-06", "2027-12-08"],
};
export const FESTIVOS_NACIONALES_ESTADO = { 2025: FV, 2026: FV, 2027: FP };
export const FESTIVOS_FUENTES = {
  2025: "Resolución de 16-12-2024, SE de Función Pública (BOE-A-2024-26935, inhábiles AGE) y Resolución de la DG de Trabajo de fiestas laborales para 2025",
  2026: "Resolución de 18-11-2025, SE de Función Pública (BOE-A-2025-23702, inhábiles AGE) y Resolución de 17-10-2025 de la DG de Trabajo (BOE-A-2025-21667, fiestas laborales para 2026)",
  2027: "Calendarios autonómicos de 2027 (decretos y órdenes citados en cada comunidad); resolución estatal de fiestas laborales e inhábiles de 2027 pendiente de publicación",
};

// ── Autonómicos: FESTIVOS_CCAA[año][código] = { d: fechas, e: estado, f: fuente, n?: nota } ──
// Códigos de TERRITORIOS (motor.mjs). Álava, Bizkaia y Gipuzkoa comparten el calendario de Euskadi (clave PV).
export const FESTIVOS_CCAA = {
  2025: {
    AND: { d: ["2025-02-28", "2025-04-17", "2025-10-13"], e: FV, f: "Decreto de la Junta de Andalucía de fiestas laborales para 2025 (BOJA); 13-10 por coincidir el 12-10 en domingo" },
    ARA: { d: ["2025-04-17", "2025-04-23", "2025-10-13"], e: FV, f: "Decreto del Gobierno de Aragón de fiestas laborales para 2025 (BOA)" },
    AST: { d: ["2025-04-17", "2025-09-08", "2025-10-13"], e: FV, f: "Decreto del Principado de Asturias de fiestas para 2025 (BOPA)" },
    BAL: { d: ["2025-03-01", "2025-04-17", "2025-12-26"], e: FV, f: "Resolución de la Consejería de Empresa, Empleo y Energía de 26-09-2024 (BOIB); el 26-12 sustituye al 12-10. El lunes de Pascua (21-04) solo donde lo fije el municipio" },
    CAN: { d: ["2025-04-17", "2025-05-30"], e: FP, f: "Decreto del Gobierno de Canarias de fiestas laborales para 2025 (BOC); sin cotejo de las fiestas insulares" },
    CANT: { d: ["2025-04-17", "2025-07-28", "2025-09-15"], e: FP, f: "Calendario de fiestas laborales de Cantabria para 2025 (BOC), sin cotejo directo" },
    CYL: { d: ["2025-04-17", "2025-04-23", "2025-10-13"], e: FV, f: "Decreto de la Junta de Castilla y León de fiestas laborales para 2025 (BOCYL)" },
    CLM: { d: ["2025-04-17", "2025-05-31", "2025-06-19"], e: FV, f: "Decreto 30/2024, de 25 de junio (DOCM de 03-07-2024): Corpus 19-06 en sustitución del 12-10" },
    CAT: { d: ["2025-04-21", "2025-06-24", "2025-09-11", "2025-12-26"], e: FV, f: "Ordre EMT del calendari oficial de festes laborals a Catalunya per a 2025 (DOGC)" },
    VAL: { d: ["2025-03-19", "2025-04-21", "2025-10-09"], e: FV, f: "Decreto 100/2024 del Consell (DOGV)", n: "El 24-06 se fijó como fiesta retribuida y recuperable: no se cuenta como inhábil (regla prudente)" },
    EXT: { d: ["2025-04-17", "2025-09-08", "2025-10-13"], e: FV, f: "Decreto de la Junta de Extremadura de días festivos para 2025 (DOE)" },
    GAL: { d: ["2025-04-17", "2025-05-17", "2025-07-25"], e: FP, f: "Decreto de la Xunta de fiestas laborales para 2025 (DOG), sin cotejo directo" },
    MAD: { d: ["2025-04-17", "2025-05-02", "2025-07-25"], e: FP, f: "Decreto de la Comunidad de Madrid de fiestas laborales para 2025 (BOCM), sin cotejo directo" },
    MUR: { d: ["2025-03-19", "2025-04-17", "2025-06-09"], e: FP, f: "Calendario de fiestas laborales de la Región de Murcia para 2025 (BORM), sin cotejo directo" },
    NAV: { d: ["2025-04-17", "2025-04-21", "2025-07-25", "2025-12-03"], e: FP, f: "Resolución de fiestas laborales de Navarra para 2025 (BON); el 19-03 no se ha podido confirmar" },
    PV: { d: ["2025-04-17", "2025-04-21", "2025-07-25"], e: FP, f: "Decreto del calendario oficial de fiestas laborales de Euskadi para 2025 (BOPV), sin cotejo directo" },
    RIO: { d: ["2025-04-17", "2025-04-21", "2025-06-09"], e: FP, f: "Calendario de fiestas laborales de La Rioja para 2025 (BOR), sin cotejo directo" },
    CEU: { d: ["2025-03-31", "2025-04-17", "2025-06-06", "2025-08-05"], e: FV, f: "Decreto de la Ciudad de Ceuta (BOCCE de 25-10-2024): Eidul Fitr, Jueves Santo, Eidul Adha y Nuestra Señora de África" },
    MEL: { d: ["2025-03-31", "2025-04-17", "2025-06-06", "2025-09-08", "2025-09-17", "2025-10-13"], e: FV, f: "Acuerdo del Consejo de Gobierno de 27-09-2024 (BOME de 01-10-2024); incluye las dos fiestas locales de la ciudad" },
  },
  2026: {
    AND: { d: ["2026-02-28", "2026-04-02", "2026-11-02", "2026-12-07"], e: FV, f: "Decreto 101/2025, de 14 de mayo (BOJA n.º 93, de 19-05-2025): 1-11 y 6-12 trasladados al lunes" },
    ARA: { d: ["2026-04-02", "2026-04-23", "2026-11-02", "2026-12-07"], e: FV, f: "Decreto 70/2025, de 9 de julio (BOA de 16-07-2025); traslados al lunes según la relación del BOE-A-2025-21667" },
    AST: { d: ["2026-04-02", "2026-09-08", "2026-11-02", "2026-12-07"], e: FV, f: "Decreto 35/2025, de 7 de marzo (BOPA de 24-03-2025), y calendario de la Universidad de Oviedo con las fiestas del BOPA" },
    BAL: { d: ["2026-03-02", "2026-04-02", "2026-04-06", "2026-12-26"], e: FV, f: "Acuerdo del Consell de Govern de 11-04-2025 y resolución publicada en el BOIB de 27-09-2025 (calendari laboral CAIB)" },
    CAN: { d: ["2026-04-02", "2026-05-30", "2026-11-02"], e: FV, f: "Decreto 61/2025, de 28 de abril (BOC n.º 88, de 05-05-2025); el 6-12 no se traslada" },
    CANT: { d: ["2026-04-02", "2026-07-28", "2026-09-15", "2026-12-07"], e: FV, f: "Calendario de fiestas laborales de Cantabria para 2026 (BOC); fechas recogidas en la relación del BOE-A-2025-21667" },
    CYL: { d: ["2026-04-02", "2026-04-23", "2026-11-02", "2026-12-07"], e: FV, f: "Decreto 9/2025, de 29 de mayo (BOCYL de 02-06-2025)" },
    CLM: { d: ["2026-04-02", "2026-04-06", "2026-06-04", "2026-11-02"], e: FV, f: "Decreto 44/2025, de 17 de junio (DOCM de 26-06-2025): lunes de Pascua por el 19-03 y Corpus por el 6-12" },
    CAT: { d: ["2026-04-06", "2026-06-24", "2026-09-11", "2026-12-26"], e: FV, f: "Ordre EMT del calendari de festes laborals per a 2026 (DOGC de 06-05-2025); en Arán, el 26-12 se sustituye por el 17-06" },
    VAL: { d: ["2026-03-19", "2026-04-06", "2026-06-24", "2026-10-09"], e: FV, f: "Decreto del Consell de calendario laboral para 2026 (DOGV)" },
    EXT: { d: ["2026-04-02", "2026-09-08", "2026-11-02", "2026-12-07"], e: FV, f: "Decreto 40/2025, de 13 de mayo (DOE n.º 94, de 19-05-2025)" },
    GAL: { d: ["2026-03-19", "2026-04-02", "2026-06-24", "2026-07-25"], e: FV, f: "Decreto de la Consellería de Emprego, Comercio e Emigración (DOG, 2025): San Xosé y San Xoán por el 1-11 y el 6-12" },
    MAD: { d: ["2026-04-02", "2026-05-02", "2026-11-02", "2026-12-07"], e: FV, f: "Decreto 75/2025, de 24 de septiembre (BOCM de 25-09-2025) y Acuerdo de 23-12-2025 de días inhábiles (BOCM n.º 306)" },
    MUR: { d: ["2026-03-19", "2026-04-02", "2026-06-09", "2026-12-07"], e: FV, f: "Acuerdo del Consejo de Gobierno de 24-04-2025 y calendario de días inhábiles (BORM n.º 174, de 30-07-2025)" },
    NAV: { d: ["2026-03-19", "2026-04-02", "2026-04-06", "2026-11-02", "2026-12-03"], e: FV, f: "Resolución 390/2025 (BON de 02-07-2025); Navarra fija trece fiestas generales y una local" },
    PV: { d: ["2026-03-19", "2026-04-02", "2026-04-06", "2026-07-25"], e: FV, f: "Decreto 82/2025, de 8 de abril (BOPV de 25-04-2025)" },
    RIO: { d: ["2026-04-02", "2026-04-06", "2026-06-09", "2026-12-07"], e: FP, f: "Acuerdo del Gobierno de La Rioja (BOR de 12-05-2025); fechas tomadas de fuentes secundarias concordantes" },
    CEU: { d: ["2026-04-02", "2026-05-27", "2026-08-05", "2026-09-02"], e: FP, f: "Resolución de la Ciudad de Ceuta de 19-09-2025 (BOCCE de 26-09-2025); agosto y septiembre sin cotejo directo" },
    MEL: { d: ["2026-03-20", "2026-04-02", "2026-05-27", "2026-09-08", "2026-09-17"], e: FV, f: "BOME-A-2025-1033: Eid Fitr, Aid Al Adha, Virgen de la Victoria y Día de Melilla (incluye las fiestas locales)" },
  },
  2027: {
    AND: { d: ["2027-03-01", "2027-03-25", "2027-08-16"], e: FV, f: "Decreto 84/2026, de 29 de abril (BOJA de 05-05-2026): 28-02 y 15-08 trasladados al lunes" },
    ARA: { d: ["2027-03-25", "2027-04-23", "2027-08-16"], e: FV, f: "Calendario de fiestas laborales de Aragón para 2027 (Gobierno de Aragón); traslado del 15-08 confirmado por dos fuentes" },
    AST: { d: ["2027-03-25", "2027-09-08"], e: FP, f: "Decreto 7/2026 (BOPA de 26-02-2026): Día de Asturias; lista completa pendiente de la resolución estatal" },
    BAL: { d: ["2027-03-01", "2027-03-25", "2027-03-29"], e: FV, f: "Acuerdo del Consell de Govern de 13-03-2026 (Mesa Social Tripartita de 05-03-2026)" },
    CAN: { d: ["2027-03-25", "2027-08-16"], e: FV, f: "Decreto 115/2026, de 29 de junio (BOC de 03-07-2026); el Día de Canarias cae en domingo" },
    CANT: { d: ["2027-03-25", "2027-07-28", "2027-09-15"], e: FV, f: "Orden IND/29/2026, de 6 de julio (BOC de 15-07-2026)" },
    CYL: { d: ["2027-03-25", "2027-04-23", "2027-08-16"], e: FV, f: "Decreto 7/2026, de 26 de marzo (BOCYL de 30-03-2026)" },
    CLM: { d: ["2027-03-25", "2027-05-27", "2027-05-31"], e: FV, f: "Decreto 34/2026, de 23 de junio (DOCM de 13-07-2026): Corpus por el 19-03 y Día de la Región por el 15-08" },
    CAT: { d: ["2027-03-29", "2027-06-24", "2027-09-11"], e: FV, f: "Calendari de festes laborals de Catalunya per a 2027 (Departament d'Empresa i Treball); en Arán, el 29-03 se sustituye por el 17-06" },
    VAL: { d: ["2027-03-19", "2027-03-29", "2027-10-09"], e: FV, f: "Decreto del Consell de calendario laboral para 2027 (DOGV); se suprime el 24-06" },
    EXT: { d: ["2027-03-25", "2027-09-08"], e: FP, f: "Decreto 119/2026, de 2 de junio (DOE de 08-06-2026); no se ha podido confirmar el traslado del 15-08 al lunes 16-08" },
    GAL: { d: ["2027-03-19", "2027-03-25", "2027-05-17"], e: FV, f: "Decreto 68/2026 (DOG de 02-07-2026): San Xosé y Letras Galegas por el 25-07 y el 15-08" },
    MAD: { d: ["2027-03-19", "2027-03-25", "2027-08-16"], e: FV, f: "Decreto 82/2026, de 30 de septiembre (BOCM de 01-10-2026)" },
    MUR: { d: ["2027-03-19", "2027-03-25", "2027-06-09"], e: FV, f: "Acuerdo del Consejo de Gobierno de 09-04-2026 y Resolución de la DG de Trabajo (BORM de 27-07-2026)" },
    NAV: { d: ["2027-03-19", "2027-03-25", "2027-03-29", "2027-12-03"], e: FV, f: "Resolución 232/2026, de 13 de mayo (BON de 28-05-2026)" },
    PV: { d: ["2027-03-25", "2027-03-29", "2027-10-07"], e: FV, f: "Decreto 90/2026, de 9 de junio (BOPV de 16-07-2026): el 7-10 por el 90.º aniversario del primer Gobierno Vasco" },
    RIO: { d: ["2027-03-25", "2027-03-29", "2027-06-09"], e: FP, f: "Calendario de festivos laborales 2027 publicado por el Gobierno de La Rioja (larioja.org), sin el acuerdo del BOR" },
    CEU: { d: [], e: FP, f: "Calendario de 2027 de la Ciudad de Ceuta no localizado" },
    MEL: { d: [], e: FP, f: "Calendario de 2027 de la Ciudad de Melilla no localizado" },
  },
};

// ── Locales: FESTIVOS_LOCALES[año][código INE] = { n: municipio, d: fechas, e: estado, f: fuente } ──
// Capitales de provincia y municipios de la demostración. Si un municipio no está, el motor avisa de que faltan sus festivos locales.
// En Ceuta y Melilla las fiestas locales van en la lista de la ciudad (FESTIVOS_CCAA).
export const FESTIVOS_LOCALES = {
  2025: {
    "28079": { n: "Madrid", d: ["2025-05-15"], e: FP, f: "San Isidro; la segunda fiesta local (Almudena) no se ha podido cotejar" },
    "29067": { n: "Málaga", d: ["2025-08-19", "2025-09-08"], e: FP, f: "Calendario laboral publicado (fuente secundaria)" },
    "41091": { n: "Sevilla", d: ["2025-05-07", "2025-06-19"], e: FP, f: "Miércoles de Feria y Corpus (fuente secundaria)" },
  },
  2026: {
    "28079": { n: "Madrid", d: ["2026-05-15", "2026-11-09"], e: FV, f: "Acuerdo del Pleno de 30-09-2025 y Acuerdo de 23-12-2025 de días inhábiles de la Comunidad de Madrid (BOCM n.º 306)" },
    "08019": { n: "Barcelona", d: ["2026-05-25", "2026-09-24"], e: FV, f: "Ordre EMT/208/2025 de festes locals per a 2026 (DOGC) y Ajuntament de Barcelona" },
    "15030": { n: "A Coruña", d: ["2026-02-17", "2026-10-07"], e: FV, f: "Relación de festivos locales de 2026 publicada por la Xunta (DOG)" },
    "15078": { n: "Santiago de Compostela", d: ["2026-02-17", "2026-05-14"], e: FV, f: "Relación de festivos locales de 2026 publicada por la Xunta (DOG)" },
    "27028": { n: "Lugo", d: ["2026-02-17", "2026-10-05"], e: FV, f: "Relación de festivos locales de 2026 publicada por la Xunta (DOG)" },
    "32054": { n: "Ourense", d: ["2026-02-17", "2026-11-11"], e: FV, f: "Relación de festivos locales de 2026 publicada por la Xunta (DOG)" },
    "36038": { n: "Pontevedra", d: ["2026-02-18", "2026-07-11"], e: FV, f: "Relación de festivos locales de 2026 publicada por la Xunta (DOG)" },
    "36057": { n: "Vigo", d: ["2026-03-28", "2026-08-17"], e: FV, f: "Relación de festivos locales de 2026 publicada por la Xunta (DOG)" },
    "04013": { n: "Almería", d: ["2026-06-24", "2026-08-29"], e: FV, f: "Resolución de 06-10-2025 de la DG de Trabajo (BOJA n.º 197, de 14-10-2025) y calendario de la Junta" },
    "11012": { n: "Cádiz", d: ["2026-02-16", "2026-10-07"], e: FV, f: "Resolución de 06-10-2025 de la DG de Trabajo (BOJA n.º 197, de 14-10-2025) y calendario de la Junta" },
    "14021": { n: "Córdoba", d: ["2026-09-08", "2026-10-24"], e: FP, f: "Fuente secundaria; BOJA n.º 197, de 14-10-2025, sin cotejo directo" },
    "18087": { n: "Granada", d: ["2026-01-02", "2026-06-04"], e: FV, f: "Acuerdo del Pleno (Toma de Granada y Corpus) y BOJA n.º 197, de 14-10-2025; dos fuentes concordantes" },
    "21041": { n: "Huelva", d: ["2026-08-03", "2026-09-08"], e: FP, f: "BOJA n.º 197, de 14-10-2025; fuentes discrepantes sobre el 3-08" },
    "23050": { n: "Jaén", d: ["2026-06-11", "2026-11-25"], e: FV, f: "BOJA n.º 197, de 14-10-2025; dos fuentes concordantes" },
    "29067": { n: "Málaga", d: ["2026-08-19", "2026-09-08"], e: FV, f: "BOJA n.º 197, de 14-10-2025; dos fuentes concordantes (incorporación a la Corona de Castilla y Virgen de la Victoria)" },
    "29069": { n: "Marbella", d: ["2026-06-11", "2026-10-19"], e: FP, f: "San Bernabé y segunda fiesta local según calendario publicado (fuente secundaria); BOJA n.º 197 sin cotejo directo" },
    "29901": { n: "Torremolinos", d: ["2026-07-16", "2026-09-29"], e: FP, f: "Virgen del Carmen (Ayuntamiento cerrado) y San Miguel; BOJA n.º 197 sin cotejo directo" },
    "41091": { n: "Sevilla", d: ["2026-04-22", "2026-06-04"], e: FP, f: "Corpus confirmado por dos fuentes; el miércoles de Feria (22-04 o 29-04) es discrepante" },
    "06015": { n: "Badajoz", d: ["2026-02-17", "2026-06-24"], e: FV, f: "Resolución de 15-10-2025 de fiestas locales (DOE de 23-10-2025)" },
    "10037": { n: "Cáceres", d: ["2026-04-23", "2026-05-29"], e: FV, f: "Resolución de 15-10-2025 de fiestas locales (DOE de 23-10-2025)" },
    "46250": { n: "València", d: ["2026-01-22", "2026-04-13"], e: FV, f: "Resolución de fiestas locales de la Comunitat Valenciana para 2026 (DOGV de 14-11-2025); dos fuentes concordantes" },
    "03014": { n: "Alicante", d: ["2026-04-16", "2026-06-24"], e: FP, f: "Santa Faz y Hogueras; fuentes discrepantes (DOGV de 14-11-2025 sin cotejo directo)" },
    "45168": { n: "Toledo", d: ["2026-01-23", "2026-11-26"], e: FP, f: "Una sola fuente de prensa (DOCM sin cotejo directo)" },
    "13034": { n: "Ciudad Real", d: ["2026-05-25", "2026-08-22"], e: FP, f: "Una sola fuente de prensa (DOCM sin cotejo directo)" },
    "16078": { n: "Cuenca", d: ["2026-06-01", "2026-09-21"], e: FP, f: "Una sola fuente de prensa (DOCM sin cotejo directo)" },
    "02003": { n: "Albacete", d: ["2026-06-24", "2026-09-08"], e: FP, f: "Una sola fuente secundaria" },
    "09059": { n: "Burgos", d: ["2026-06-12", "2026-06-29"], e: FP, f: "Curpillos y San Pedro (relación de capitales, fuente secundaria)" },
    "37274": { n: "Salamanca", d: ["2026-06-12", "2026-09-08"], e: FP, f: "Fuente de prensa" },
    "24089": { n: "León", d: ["2026-06-24", "2026-10-05"], e: FP, f: "Previsión publicada en prensa" },
    "05019": { n: "Ávila", d: ["2026-05-02", "2026-10-15"], e: FP, f: "Fuente de prensa" },
    "48020": { n: "Bilbao", d: ["2026-07-31", "2026-08-21"], e: FP, f: "Relación de capitales (fuente secundaria)" },
    "22125": { n: "Huesca", d: ["2026-01-22", "2026-08-11"], e: FP, f: "Relación de capitales (fuente secundaria)" },
    "50297": { n: "Zaragoza", d: ["2026-01-29", "2026-03-05"], e: FP, f: "San Valero y Cincomarzada (fuente secundaria discrepante)" },
    "38038": { n: "Santa Cruz de Tenerife", d: ["2026-02-17"], e: FP, f: "Martes de Carnaval; segunda fiesta no localizada" },
    "35016": { n: "Las Palmas de Gran Canaria", d: ["2026-02-17"], e: FP, f: "Martes de Carnaval; segunda fiesta no localizada" },
    "39075": { n: "Santander", d: ["2026-05-25"], e: FP, f: "Virgen del Mar; segunda fiesta no localizada" },
    "33044": { n: "Oviedo", d: ["2026-09-21"], e: FP, f: "Lunes de San Mateo; segunda fiesta no localizada" },
  },
  2027: {
    "29067": { n: "Málaga", d: ["2027-08-19", "2027-09-08"], e: FP, f: "Acuerdo municipal de 28-05-2026 (malaga.eu); pendiente de la resolución del BOJA" },
    "15030": { n: "A Coruña", d: ["2027-02-09", "2027-06-24"], e: FP, f: "Propuesta municipal publicada en prensa (julio de 2026); pendiente del DOG" },
    "33044": { n: "Oviedo", d: ["2027-05-18", "2027-09-21"], e: FP, f: "Resolución de 22-05-2026 de fiestas locales (BOPA de 10-06-2026), según fuente secundaria" },
  },
};

// Provincia (dos primeras cifras del código INE) → territorio de TERRITORIOS
export const PROV_CCAA = { "01": "ALA", "02": "CLM", "03": "VAL", "04": "AND", "05": "CYL", "06": "EXT", "07": "BAL", "08": "CAT", "09": "CYL", "10": "EXT", "11": "AND", "12": "VAL", "13": "CLM", "14": "AND", "15": "GAL", "16": "CLM", "17": "CAT", "18": "AND", "19": "CLM", "20": "GIP", "21": "AND", "22": "ARA", "23": "AND", "24": "CYL", "25": "CAT", "26": "RIO", "27": "GAL", "28": "MAD", "29": "AND", "30": "MUR", "31": "NAV", "32": "GAL", "33": "AST", "34": "CYL", "35": "CAN", "36": "GAL", "37": "CYL", "38": "CAN", "39": "CANT", "40": "CYL", "41": "AND", "42": "CYL", "43": "CAT", "44": "ARA", "45": "CLM", "46": "VAL", "47": "CYL", "48": "BIZ", "49": "CYL", "50": "ARA", "51": "CEU", "52": "MEL" };
// Capitales de provincia (código INE): las que el despacho puede elegir como sede de la oficina tributaria cuando no consta otra
export const CAPITALES_INE = ["01059", "02003", "03014", "04013", "05019", "06015", "07040", "08019", "09059", "10037", "11012", "12040", "13034", "14021", "15030", "16078", "17079", "18087", "19130", "20069", "21041", "22125", "23050", "24089", "25120", "26089", "27028", "28079", "29067", "30030", "31201", "32054", "33044", "34120", "35016", "36038", "37274", "38038", "39075", "40194", "41091", "42173", "43148", "44216", "45168", "46250", "47186", "48020", "49275", "50297", "51001", "52001"];
