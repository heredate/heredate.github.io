// ───────────────────── {{MARCA}} · centro de ayuda, manual y primeros pasos (Piloto 10 · prefijo ay / AY_) ─────────────────────
// Para que un despacho aprenda {{MARCA}} solo y resuelva dudas sin llamar a nadie.
// 1. Centro de ayuda: capa propia sobre document.body (como paleta.js y reunion.js): sobrevive a render(), tiene sus
//    propios oyentes (captura en document) y no usa ui.sheet. Buscador sin acentos, artículos por secciones, «Ir a…».
// 2. Manual de usuario en PDF con los mismos artículos (pdf.js · pdfDocumento con bloques).
// 3. Primeros 30 minutos: lista que se marca sola (tarjeta en la Cartera y artículo de la ayuda).
// API: ayAbrir(tema?) · ayCerrar() · ayAbierta() · ayContexto() → id · ayBotonHTML(clase?) · ayParaPaleta(q) → [{titulo, sub, s, abrir}]
//      ayManualPDF() → nombre del archivo · ayManualBytes() → Uint8Array · ayManualBloques() → bloques de pdf.js
//      ayPrimerosPasosHTML() → tarjeta para la Cartera ("" si ya está todo o se ocultó) · ayPasos() → [{id, titulo, hecho, ...}]
//      ayBuscar(q) → [{a, score, snip}] · AY_ARTICULOS · AY_SECCIONES
// Eventos: [data-ay] (abrir | art | sec | inicio | ir | pdf | copiarSoporte | instalar | pasosOcultar | volver | cerrar), «?» abre la ayuda.
// Soporte: lee la global HEREDA_SOPORTE = { email, whatsapp, horario } (la inyecta build.py desde src/empresa.json); puede faltar o venir vacía.
// Todo lo que se describe aquí está comprobado contra el código (motor.mjs, tramites.mjs, seguridad.js, licencia.js…) a 4-10-2026.

const AY_MAC = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const AY_IC = {
  q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8"/><path d="M12 17.2v.1"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// ═════════ Secciones y artículos ═════════
// Artículo: { id, s (sección), t (título), d (resumen), kw (palabras para el buscador), b (bloques), ir: [[texto, destino]], src?: [[texto, url]] }
// Bloques: "texto" (párrafo) · {h} subtítulo (plat: win|mac|ios|android marca «este equipo») · {pasos:[]} · {lista:[]} · {nota} · {aviso}
//          · {tabla:{cab, filas}} · {norma} · {especial: "pasos"|"soporte"|"instalar"}
// Marcas en el texto: **negrita** · {MOD} (⌘ o Ctrl+) · {ORD_N} · {TR_TOTAL} · {VERSION} · {APP} (dirección de la app)
const AY_SECCIONES = [
  ["empezar", "Empezar", "Instalar, configurar y abrir el primer expediente"],
  ["calculos", "Cálculos", "Qué calcula {{MARCA}}, cómo y qué no hace"],
  ["plazos", "Trámites y plazos", "Cómo se cuentan los plazos y cómo se siguen los trámites"],
  ["documentos", "Documentos", "Escritos, informe, notaría y modelo 650"],
  ["familia", "Familia", "Carpeta para el móvil y modo reunión"],
  ["despacho", "Despacho", "Mi día, terceros, tiempos y rentabilidad"],
  ["datos", "Datos y seguridad", "Dónde se guardan, copias, contraseña y cambio de equipo"],
  ["licencia", "Licencia", "Prueba, activación y renovación"],
  ["atajos", "Atajos de teclado", "Para ir más rápido"],
  ["soporte", "Soporte", "Problemas frecuentes y contacto"],
];

const AY_ARTICULOS = [
  // ── Empezar ──
  { id: "primeros-pasos", s: "empezar", t: "Los primeros 30 minutos", d: "Seis pasos para dejar el despacho listo para trabajar.", kw: "empezar comenzar inicio checklist lista primeros pasos configurar onboarding",
    b: ["Esta lista se marca sola a medida que lo haces. También aparece en Expedientes hasta que esté completa.", { especial: "pasos" }, "Si quieres verlo antes con datos ficticios, carga el despacho de demostración (artículo «Probar sin datos reales»)."],
    ir: [["Despacho y ajustes", "ajustes"]] },
  { id: "instalar", s: "empezar", t: "Instalar {{MARCA}} como aplicación", d: "Un icono propio en Windows, Mac, iPhone o Android, sin tienda de aplicaciones.", kw: "instalar app aplicacion icono escritorio dock pantalla inicio pwa chrome edge safari android iphone ipad windows mac acceso directo",
    b: ["{{MARCA}} funciona en el navegador y se puede instalar como una aplicación: tiene su propio icono, se abre en su ventana y sigue funcionando sin conexión. Se instala desde la dirección segura de {{MARCA}} (https), no desde un archivo descargado.", { especial: "instalar" },
      { h: "Windows o Mac con Chrome", plat: "chrome" }, { pasos: ["Abre {{MARCA}} en Chrome.", "Pulsa el botón **Instalar** de la barra de direcciones o, en el menú ⋮ (Más), **Enviar, guardar y compartir › Instalar página como aplicación…**", "Confirma. {{MARCA}} aparecerá en el menú Inicio (Windows) o en Aplicaciones (Mac)."] },
      { h: "Windows con Edge", plat: "edge" }, { pasos: ["Abre {{MARCA}} en Edge.", "Menú … (Configuración y más) › **Aplicaciones › Instalar este sitio como una aplicación**.", "Confirma con **Instalar**."] },
      { h: "Mac con Safari", plat: "safari-mac" }, { pasos: ["Necesitas macOS Sonoma 14 o posterior.", "Menú **Archivo › Añadir al Dock** (o botón Compartir › Añadir al Dock).", "Escribe el nombre y pulsa **Añadir**."] },
      { h: "iPhone y iPad (Safari)", plat: "ios" }, { pasos: ["Abre {{MARCA}} en Safari.", "Toca **Compartir** (en las versiones recientes, dentro del menú ··· junto a la barra de direcciones).", "Elige **Añadir a pantalla de inicio**, deja activada la opción de abrirlo como app web si aparece y toca **Añadir**."] },
      { h: "Android (Chrome)", plat: "android" }, { pasos: ["Abre {{MARCA}} en Chrome.", "Menú ⋮ › **Añadir a la pantalla de inicio** › **Instalar**."] },
      { aviso: "En Chrome y Edge, la aplicación instalada usa los mismos datos que la pestaña del navegador. En Safari (Mac, iPhone y iPad) la app guarda sus datos aparte de Safari: instálala antes de empezar o pasa los datos con una copia (artículo «Cambiar de ordenador o trabajar en dos»)." },
      "Recomendado en el ordenador: Chrome o Edge. Son los únicos que pueden hacer la copia automática en una carpeta."],
    src: [["Ayuda de Google Chrome: apps web", "https://support.google.com/chrome/answer/9658361?hl=es"], ["Microsoft: usar un sitio como aplicación en Edge", "https://support.microsoft.com/es-es/outlook/use-the-web-version-of-outlook-like-a-desktop-app"], ["Apple: apps web de Safari en el Mac", "https://support.apple.com/es-es/104996"]] },
  { id: "despacho", s: "empezar", t: "Configurar el despacho y el equipo", d: "Nombre, colegio y localidad salen en los escritos; el equipo, en los expedientes.", kw: "despacho configurar ajustes membrete colegio localidad equipo abogados usuarios responsable rol nombre tarifa",
    b: [{ pasos: ["Abre **Despacho y ajustes** (abajo en la barra lateral; en el móvil, **Menú › Despacho y ajustes**).", "Escribe el nombre del despacho, el Colegio de la Abogacía y la localidad: salen en el membrete de los PDF y en los escritos.", "En **Equipo**, añade a cada abogado o colaborador con su rol. Cada expediente tiene un responsable.", "En **Quién usa este equipo**, elige tu nombre: firma las anotaciones de la bitácora."] },
      "La bienvenida del primer día pide estos mismos datos, el contacto del despacho (teléfono, correo y dirección, que salen en las cartas, en la carpeta de la familia y en la calculadora) y la tarifa objetivo por hora. Puedes repetirla en Ajustes › Demostración y ayuda › **Ver la bienvenida otra vez**.",
      { nota: "La configuración se guarda en cada equipo. Si el despacho trabaja con varios ordenadores, configúralo en cada uno o restaura una copia." }],
    ir: [["Despacho y ajustes", "ajustes"]] },
  { id: "primer-expediente", s: "empezar", t: "Abrir el primer expediente", d: "El asistente pide los datos en once pasos; lo que falte se completa después.", kw: "nuevo expediente crear alta asistente herencia causante empezar abrir",
    b: ["Pulsa **Nuevo expediente** (barra lateral o Expedientes). El asistente pide, por orden: encargo (cliente, referencia y responsable), nombre del causante, fecha del fallecimiento, residencia habitual, estado civil, testamento, herederos, bienes, deudas y gastos, y situaciones del causante.",
      "Para calcular bastan cuatro datos: la **fecha**, la **comunidad**, **una persona** y **un bien**. Un valor aproximado sirve para empezar.",
      "La fecha decide los plazos y la ley aplicable. La residencia habitual (donde vivió más días en los últimos cinco años) decide la normativa del impuesto. Si residía fuera de España, elige «Residía fuera de España» e indica la comunidad con la mayor parte de los bienes.",
      "¿Tienes ya los documentos de la herencia? En la primera pantalla elige **Empezar con los documentos**: se crea el expediente y les envías el cuestionario.",
      "Después todo se edita en el expediente: toca una persona o un bien para cambiarlo, o usa **Revisar con el asistente** en el menú ⋯."],
    ir: [["Nuevo expediente", "nuevo"]] },
  { id: "herederos-bienes", s: "empezar", t: "Herederos y bienes: los datos que cambian el resultado", d: "Edad, parentesco, convivencia, titularidad y valores.", kw: "herederos personas bienes edad parentesco relacion convivencia discapacidad patrimonio previo seguro donaciones titularidad ganancial proindiviso valor referencia catastro datos",
    b: [{ lista: ["**Edad** de cada heredero: cambia el grupo del impuesto (menores de 21 años) y el valor del usufructo. Si falta, {{MARCA}} supone una y lo avisa.", "**Relación** con el causante: decide quién hereda sin testamento y el grupo de parentesco. Para nietos y sobrinos, indica de qué hijo o hermano descienden.", "**Convivencia** de los dos últimos años y **discapacidad**: dan derecho a reducciones.", "**Patrimonio previo**, **seguro de vida** y **donaciones** de los cuatro años anteriores: afinan el impuesto.", "**Titularidad** de cada bien: en gananciales solo entra en la herencia la mitad; en «Una parte», el porcentaje del causante.", "En los inmuebles se declara el mayor entre el valor de mercado o de escritura y el **valor de referencia del Catastro**."] },
      "Para la plusvalía, cada inmueble necesita su municipio, el valor catastral total y el del suelo (recibo del IBI), y la fecha y el precio de adquisición.",
      "Lo que aporta la familia aparece marcado «Aportado por la familia» para que lo revises."],
    ir: [["Herencia del expediente", "sec:herencia"]] },
  { id: "pantallas", s: "empezar", t: "Cómo se organiza {{MARCA}}", d: "Mi día, Expedientes, Agenda y las pestañas del expediente; Rentabilidad y Normativa abajo.", kw: "pantallas menu navegar cartera mi dia agenda rentabilidad normativa pestañas secciones expediente movil mas",
    b: [{ lista: ["**Expedientes**: todos los expedientes, en tabla, por fase o por plazos y mapa, con los vencimientos próximos.", "**Mi día**: lo que vence hoy y esta semana, lo bloqueado por terceros y lo parado.", "**Agenda**: todos los plazos, en lista o por meses, y su exportación al calendario.", "**Rentabilidad**: honorarios, horas y euros por hora del despacho.", "**Normativa**: biblioteca de leyes y ordenanzas con su estado de verificación."] },
      "Dentro de un expediente hay seis pestañas: **Resumen**, **Herederos y bienes**, **Impuestos**, **Partición**, **Trámites** y **Documentos**. En **Más** están las herramientas de apoyo: Diagnóstico, Estrategia fiscal, Dos herencias, Bancos y notaría, Listo para firmar, Normativa y Encargo y honorarios. En el móvil, las cuatro principales están abajo y el resto en **Más**.",
      "Cada expediente avanza por fases (Encargo, Documentación, Liquidación, Firma, Inscripción y entrega, Archivado): pulsa la fase en la cabecera para cambiarla.",
      "En el móvil, arriba están **Mi día**, **Menú** (Expedientes, Agenda, Rentabilidad, Normativa, Buscar, Ajustes y Ayuda) y **Nuevo**.",
      "Para ir a cualquier sitio sin buscar en los menús, pulsa {MOD}K y escribe."],
    ir: [["Mi día", "midia"], ["Buscar o hacer ({MOD}K)", "paleta"]] },
  { id: "demo", s: "empezar", t: "Probar sin datos reales", d: "Despacho de demostración y casos de ejemplo.", kw: "demo demostracion ejemplos probar prueba ficticios ensayar presentar guion",
    b: ["**Modo demostración** (Ajustes › Demostración y ayuda, o «Ver un despacho en marcha» en Expedientes, cuando aún no hay ninguno): carga 14 expedientes ficticios en todas las fases. Tus datos no se tocan y al salir del modo demostración se quitan.",
      "Con la demostración cargada, Mayúsculas+D abre el guion de siete pasos para enseñar {{MARCA}} en tres minutos.",
      "**Casos de ejemplo** (Ajustes › Datos): cuatro herencias anonimizadas que se añaden a Expedientes y se borran como cualquier expediente.",
      { nota: "Los casos de ejemplo crean expedientes: en solo lectura (prueba o licencia caducadas) no se pueden cargar." }],
    ir: [["Cargar la demostración", "demo"], ["Cargar casos de ejemplo", "ejemplos"]] },

  // ── Cálculos ──
  { id: "sucesiones", s: "calculos", t: "Cómo calcula el Impuesto sobre Sucesiones", d: "De los bienes a lo que paga cada heredero, paso a paso y con la norma aplicada.", kw: "isd impuesto sucesiones calculo cuota tarifa reduccion bonificacion coeficiente base imponible liquidable grupo parentesco 650 autonomica",
    b: ["{{MARCA}} aplica la normativa de la comunidad de residencia del causante en la fecha del fallecimiento: el Estado, las quince comunidades de régimen común, Ceuta, Melilla, Navarra y los tres territorios forales vascos.",
      { pasos: ["**Masa**: suma de los bienes (en inmuebles, el mayor entre el valor declarado y el de referencia). En gananciales, la mitad es del viudo y no entra.", "Se restan las deudas y los gastos de funeral y última enfermedad; los legados se apartan para su legatario.", "**Reparto**: sin testamento, por los órdenes del Código Civil; con usufructo universal, usufructo al viudo y nuda propiedad a los hijos; con otro reparto, los porcentajes que indiques.", "**Base imponible** de cada heredero: su porción, sus legados, su parte del ajuar doméstico y los seguros de vida que cobra.", "**Reducciones**: parentesco, discapacidad, seguros, vivienda habitual y, si la activas, empresa familiar; después, las propias de la comunidad.", "**Cuota**: tarifa (con el tipo medio de las donaciones de los cuatro años anteriores, si las hay), coeficiente por patrimonio previo y bonificaciones de la comunidad."] },
      "Cada paso muestra la cifra, el artículo aplicado y si está **Verificado** o **En verificación**. En Impuestos, toca un heredero para ver su cálculo completo.",
      { h: "Qué no hace" },
      { lista: ["Si el plazo de Sucesiones ya venció y no consta prórroga, calcula fuera de plazo y estima el recargo del art. 27 LGT a la fecha de hoy; si se presentó a tiempo, corrígelo en Impuestos.", "El reparto sin testamento sigue la vecindad civil del causante (por defecto, la de su residencia, con aviso): Código Civil, Cataluña, Aragón, Navarra, País Vasco, Galicia y Mallorca-Menorca. En Eivissa-Formentera, o si un bien troncal depende de una línea familiar que no consta, no reparte y lo dice (ver «Vecindad civil y herencias sin testamento»).", "No elige por ti los criterios discutidos (ajuar, vivienda habitual en Andalucía): los dejas elegidos en Impuestos › Opciones del cálculo.", "Es una estimación: la revisa el abogado antes de presentar."] },
      { norma: "Ley 29/1987, del Impuesto sobre Sucesiones y Donaciones; RD 1629/1991; normas autonómicas en la pestaña Normativa." }],
    ir: [["Impuestos del expediente", "sec:impuestos"]] },
  { id: "plusvalia", s: "calculos", t: "Cómo calcula la plusvalía municipal", d: "Método objetivo y real, el menor de los dos, con la ordenanza del municipio.", kw: "plusvalia iivtnu municipal ayuntamiento catastral suelo coeficiente ordenanza bonificacion metodo real objetivo tipo municipio hacienda maximo legal todos municipios",
    b: ["La plusvalía se calcula para cada inmueble con valor catastral total, valor catastral del suelo y fecha de adquisición. Sin esos tres datos no aparece.",
      { lista: ["**Método objetivo**: valor catastral del suelo × parte del causante × coeficiente según los años de tenencia. Si la ordenanza fija un coeficiente mayor que el máximo legal, se aplica el máximo (art. 107.4 TRLRHL). Con menos de un año, se prorratea por meses.", "**Método real**: la ganancia entre el precio de adquisición y el valor declarado, en la proporción que representa el suelo.", "Se aplica el **menor** de los dos. Si no hubo ganancia, el inmueble no está sujeto.", "Sobre la base, el **tipo** de la ordenanza y, por cada heredero, la **bonificación** por herencia que prevea."] },
      "Paga quien recibe el inmueble: el adjudicatario, el legatario o, si queda pro indiviso, cada heredero por su parte (el usufructo y la nuda propiedad, con la regla fiscal).",
      "El tipo sale, por este orden, de: las {ORD_N} **ordenanzas incorporadas** (tipo, coeficientes y bonificaciones); el **tipo oficial** que cada capital de provincia y cada municipio de más de 50.000 habitantes comunica al Ministerio de Hacienda para 2026 (148 municipios; Hacienda no publica las bonificaciones, así que se añade a mano la de la ordenanza); y, en el resto, el **máximo legal**: 30 %, coeficientes máximos y sin bonificación. Esa cifra es el techo: la real será igual o menor.",
      "En cualquier municipio puedes poner a mano el tipo y la bonificación de su ordenanza desde la ficha del inmueble. El tipo de todos los municipios de más de 1.000 habitantes está en la consulta de información impositiva municipal de Hacienda (enlace en la ficha).",
      { h: "Qué no hace" },
      { lista: ["El método real solo procede si lo pide el contribuyente y lo acredita con sus títulos (arts. 104.5 y 107.5 TRLRHL): {{MARCA}} lo señala, no lo solicita.", "Las bonificaciones no se aplican solas: hay que pedirlas al ayuntamiento en plazo.", "En Navarra y el País Vasco la plusvalía tiene norma foral: el cálculo es orientativo."] }],
    ir: [["Impuestos del expediente", "sec:impuestos"]] },
  { id: "usufructo", s: "calculos", t: "Usufructo y nuda propiedad", d: "89 menos la edad, entre el 10 % y el 70 %; tipo medio para el nudo propietario.", kw: "usufructo nuda propiedad viudo viuda vitalicio edad valor 89 tipo medio consolidacion conmutacion",
    b: ["El usufructo vitalicio vale el 89 % menos la edad del usufructuario, con un mínimo del 10 % y un máximo del 70 %. La nuda propiedad vale el resto (art. 26.a Ley 29/1987; verificado).",
      "Ejemplo: viuda de 75 años → usufructo del 14 % (89 − 75); los hijos reciben la nuda propiedad por el 86 %.",
      "Al nudo propietario se le aplica el **tipo medio efectivo** que corresponde al valor íntegro de los bienes (art. 26.a Ley 29/1987 y art. 51.2 RD 1629/1991). En su cálculo verás la «base liquidable teórica» y el tipo medio. Si el valor íntegro incluye también lo que recibe en pleno dominio y qué reducciones se restan está **en verificación**.",
      "Cuando se extinga el usufructo, el nudo propietario consolidará el pleno dominio y tributará por el valor del usufructo con ese mismo tipo medio: {{MARCA}} lo avisa con la cifra estimada.",
      "En Navarra y el País Vasco se aplica la tarifa sobre el valor de la nuda propiedad; la regla foral equivalente está en verificación.",
      { nota: "Si falta la edad del usufructuario, se supone una y aparece un aviso. Complétala: cambia el resultado." }],
    ir: [["Impuestos del expediente", "sec:impuestos"]] },
  { id: "ajuar", s: "calculos", t: "Ajuar doméstico", d: "Qué base usa cada opción y cuál viene por defecto.", kw: "ajuar domestico 3 por ciento tres viviendas residencial ata andalucia supremo teac opciones",
    b: ["El ajuar doméstico se suma a la base del impuesto (art. 15 Ley 29/1987) y se reparte entre los herederos según su porción; no se imputa a quien solo recibe legados de bienes concretos (art. 23 RD 1629/1991).",
      "Se elige en Impuestos › Opciones del cálculo:",
      { lista: ["**Solo viviendas** (por defecto fuera de Andalucía): 3 % del valor de los inmuebles de uso residencial no alquilados ni cedidos (STS 499/2020; TEAC 30-05-2025). Excluye dinero, valores y locales.", "**Criterio ATA** (por defecto en Andalucía): 3 % de los bienes de uso personal (vehículos y otros bienes). La práctica real de la Agencia Tributaria de Andalucía está en verificación.", "**3 % de todo**: opción manual. {{MARCA}} avisa de que el Supremo excluye dinero, valores e inmuebles no residenciales.", "**Sin ajuar**: cuando se declara o prueba que no lo hay."] },
      "Con cónyuge viudo, en «Solo viviendas» y «3 % de todo» se descuenta el 3 % del valor catastral de la vivienda habitual.",
      "En cada inmueble, los interruptores **Uso residencial** y **Alquilado o cedido** deciden si entra en la base."],
    ir: [["Impuestos del expediente", "sec:impuestos"]] },
  { id: "legitimas", s: "calculos", t: "Control de legítimas", d: "El mínimo legal de cada heredero forzoso frente a lo que recibe.", kw: "legitima legitimas forzosos legitimarios tercio mejora libre disposicion vulnerada cubierta donaciones colacion foral",
    b: ["En Herencia, la tarjeta **Control de legítimas** compara lo que recibe cada heredero forzoso con su mínimo legal.",
      "Base: herencia neta sin restar los legados, más las donaciones colacionables (art. 818 CC). El ajuar no cuenta. El usufructo se valora con la regla fiscal (89 − edad).",
      "Régimen: Código Civil o el derecho civil propio de Cataluña, Aragón, Navarra, País Vasco, Galicia o Baleares, cada uno con su estado de verificación.",
      "Cada legitimario aparece como Cubierta o Vulnerada (con lo que falta), o como Renuncia, No verificable, etc.",
      "Sin testamento, el reparto legal ya respeta las legítimas: el control sirve para contrastar un testamento, legados o donaciones.",
      { h: "Qué no hace" }, "No califica jurídicamente (preterición, desheredación, imputación de donaciones): contrasta cifras para el abogado."],
    ir: [["Herencia del expediente", "sec:herencia"]] },
  { id: "vecindad", s: "calculos", t: "Vecindad civil y herencias sin testamento", d: "Qué ley reparte la herencia sin testamento y qué hacer con los bienes troncales.", kw: "vecindad civil foral intestada sin testamento abintestato aragon navarra pais vasco cataluña galicia baleares troncal troncales tronqueros viudedad fidelidad usufructo ley aplicable",
    b: ["Sin testamento, la herencia se reparte según la **vecindad civil** del causante al fallecer, no según la comunidad que cobra el impuesto (arts. 9.8, 14 y 16 CC). Si no la indicas, {{MARCA}} supone la del territorio de residencia y lo avisa. Se cambia en Herencia › Vecindad civil del causante.",
      "En Herencia, las notas del reparto empiezan diciendo en claro qué ley se aplica (por ejemplo, «Derecho civil aragonés»). Lo mismo sale en la partición y en el informe en PDF.",
      { h: "Qué recibe el viudo con hijos" },
      { lista: ["**Código Civil**: usufructo del tercio de mejora.", "**Cataluña**: usufructo de toda la herencia, que puede conmutar por una cuarta parte y el usufructo de la vivienda.", "**Aragón**: usufructo de viudedad sobre todos los bienes, si la ley aragonesa regía los efectos del matrimonio.", "**Navarra**: usufructo de viudedad sobre todos los bienes.", "**País Vasco**: usufructo de la mitad y derecho de habitación en la vivienda; la pareja de hecho, igual.", "**Galicia**: usufructo de una cuarta parte. **Mallorca y Menorca**: de la mitad."] },
      { h: "Sin hijos" },
      { lista: ["**Aragón**: ascendientes (con el usufructo de viudedad), después el viudo y después los hermanos.", "**Navarra** y **País Vasco**: el viudo hereda antes que los padres.", "**Cataluña**: el viudo o conviviente, antes que los padres, que conservan su legítima."] },
      { h: "Bienes troncales" },
      "En Aragón, Navarra y el País Vasco, sin descendientes, algunos bienes vuelven a la familia de la que proceden: en Aragón, los recibidos gratis de la familia; en Navarra, los inmuebles recibidos de parientes; en el País Vasco, los bienes raíces de la tierra llana de Bizkaia, Aramaio y Llodio.",
      { pasos: ["En la ficha del bien, activa **Bien troncal** e indica si procede de la familia del padre o de la madre.", "Si te lo pide, indica la línea del padre o la madre, de los medio hermanos, tíos y primos.", "{{MARCA}} reparte ese bien entre los parientes de esa línea y el resto con las reglas generales. Si la línea de alguien decide el reparto y no consta, no calcula y te dice qué falta."] },
      { h: "Qué no hace" },
      { lista: ["No sabe qué bienes son troncales ni si hay bienes donados que vuelvan al donante (recobro aragonés): los marcas tú.", "Las deudas se imputan a los bienes troncales en proporción a su valor: en la partición se ajusta.", "En Navarra, si viven ascendientes y hay bienes troncales, no reparte: la regla de ese caso está en verificación.", "Las reglas de Aragón y Navarra están en verificación (fuentes secundarias concordantes); las del País Vasco están cotejadas con el BOE."] },
      { norma: "Ley 5/2015 de Derecho Civil Vasco (arts. 61-73 y 110-117); Fuero Nuevo de Navarra (leyes 253-254 y 304-307); Código del Derecho Foral de Aragón (arts. 283 y 516-536)." }],
    ir: [["Herencia del expediente", "sec:herencia"]] },
  { id: "dos-herencias", s: "calculos", t: "Dos herencias", d: "Cómo repartir hoy cambia lo que pagan los hijos cuando fallezca el viudo.", kw: "dos herencias segunda viudo hijos proyeccion escenarios renuncia usufructo vivienda consolidacion",
    b: ["Sirve cuando hay cónyuge o pareja y descendientes. Proyecta la segunda herencia, la del viudo, y suma los impuestos de las dos.",
      { lista: ["**Reparto actual** del expediente.", "**Usufructo universal** para el viudo (si no lo es ya).", "**El viudo renuncia**: los hijos lo reciben todo; él conserva su mitad de gananciales.", "**Vivienda para el viudo** en pleno dominio, conmutando su usufructo."] },
      "Elige a cuántos años (5, 10, 15 o 20) y con qué revalorización anual (0 a 3 %). Usa la normativa vigente hoy y valores de hoy.",
      "Cada escenario explica qué implica y sus riesgos con la norma. La consolidación del dominio al extinguirse el usufructo se estima y está en verificación.",
      { h: "Qué no hace" }, "No anticipa cambios legales. El usufructo universal solo cabe si lo dispone el testamento. Las decisiones se toman con la familia."],
    ir: [["Dos herencias", "sec:segunda"]] },
  { id: "estrategia", s: "calculos", t: "Estrategia fiscal y escenarios", d: "Palancas lícitas con su ahorro y su riesgo.", kw: "estrategia ahorro fiscal palancas escenario simulador renuncia lotes vivienda prorroga empresa valor referencia riesgo",
    b: ["Estrategia simula el expediente con cada cambio posible y muestra el ahorro sobre el coste fiscal total (Sucesiones, plusvalía y excesos de adjudicación): renuncias, adjudicar cada inmueble a quien menos plusvalía paga, reducción de vivienda, prórroga antes que recargo, empresa familiar, qué valor declarar en los inmuebles, entre otras.",
      "Cada palanca lleva un riesgo (bajo, medio, alto o litigioso) y la norma. El ahorro de riesgo alto o litigioso se separa: solo con informe expreso al cliente. Por debajo de 100 € no se recomienda.",
      "**Probar como escenario** crea una copia del expediente con el cambio aplicado para compararla; el original no se toca.",
      "En Impuestos, el **simulador** prueba renuncias, valores y plazo sin guardar nada; si te sirve, guárdalo como escenario."],
    ir: [["Estrategia del expediente", "sec:estrategia"]] },
  { id: "particion", s: "calculos", t: "Partición y lotes", d: "Del reparto en cuotas a qué bien recibe cada uno.", kw: "particion lotes adjudicacion cuaderno particional reparto bienes compensacion exceso proindiviso",
    b: ["Partición lleva el reparto a cada bien en seis pasos: inventario, masa hereditaria, cuotas, cuadro de partición, impuestos y liquidación.",
      "En el cuadro asignas cada bien a un heredero o lo dejas pro indiviso. {{MARCA}} calcula el haber de cada uno, las diferencias y las compensaciones.",
      "**Proponer lotes con menos plusvalía** reparte los inmuebles para reducirla. Revisa siempre las compensaciones. **Todo en proindiviso** deshace las adjudicaciones.",
      "Quien se adjudica un inmueble paga su plusvalía; un exceso de adjudicación puede tributar aparte (Estrategia lo cuantifica).",
      "El cuadro alimenta el cuaderno particional, la nota para la notaría y el informe en PDF."],
    ir: [["Partición del expediente", "sec:particion"]] },
  { id: "diagnostico", s: "calculos", t: "Diagnóstico del expediente", d: "Riesgos, oportunidades y datos que faltan, con una puntuación.", kw: "diagnostico salud riesgos avisos puntuacion revisar problemas alertas",
    b: ["El Diagnóstico revisa el expediente en seis áreas: plazos, impuestos, reparto y legítimas, datos, trámites y documentación.",
      "Cada aviso dice qué pasa, cuánto dinero hay en juego cuando se puede calcular, qué hacer y la norma. Un clic lleva a la pantalla donde se corrige.",
      "La puntuación baja con cada riesgo según su gravedad; el nivel es Bien, Atención o Riesgo. Se recalcula al cambiar cualquier dato."],
    ir: [["Diagnóstico del expediente", "sec:diagnostico"]] },
  { id: "verificado", s: "calculos", t: "«Verificado» y «En verificación»", d: "Qué significa cada etiqueta y qué hacer con lo pendiente.", kw: "verificado verificacion pendiente fuente boe norma normativa biblioteca fiabilidad estado",
    b: ["Cada regla del motor lleva su fuente y un estado. **Verificado**: cotejado con el boletín oficial o con dos fuentes. **En verificación**: aplicado con la mejor información disponible, pendiente de cotejo literal.",
      "Lo que está en verificación lleva su etiqueta en el cálculo y se lista en Impuestos › «En verificación con el boletín oficial». Compruébalo antes de presentar.",
      "La biblioteca **Normativa** reúne las leyes estatales y autonómicas y las ordenanzas municipales con su enlace oficial, y avisa de los cambios que afectan a tus expedientes.",
      "{{MARCA}} calcula y prepara; el criterio es del abogado. Motor de cálculo {VERSION}."],
    ir: [["Normativa", "biblio"]] },

  // ── Trámites y plazos ──
  { id: "plazos", s: "plazos", t: "Cómo se calculan los plazos", d: "Desde el fallecimiento, de fecha a fecha, con los festivos nacionales.", kw: "plazos vencimiento fechas festivos inhabiles habiles seis meses cinco meses prescripcion ultimas voluntades dias calendario",
    b: [{ lista: ["**Sucesiones**: seis meses desde el fallecimiento.", "**Prórroga** de Sucesiones: se pide en los cinco primeros meses y da seis más.", "**Plusvalía**: seis meses, prorrogables hasta doce a petición ante el ayuntamiento.", "**Certificado de últimas voluntades**: se puede pedir pasados 15 días hábiles.", "**Prescripción**: cuatro años desde el final del plazo de presentación (arts. 66-67 LGT)."] },
      "Los meses se cuentan de fecha a fecha. En el cálculo del expediente (Diagnóstico, Firma, Estrategia y modo reunión), si el último día de Sucesiones, de la prórroga o de la plusvalía cae en sábado, domingo o festivo nacional, pasa al siguiente día hábil (art. 30.5 Ley 39/2015).",
      { aviso: "{{MARCA}} aplica la misma regla en todo el expediente: Diagnóstico, la lista de Trámites, la Agenda y el calendario .ics dan la misma fecha, trasladada al siguiente hábil si vence en sábado, domingo o **festivo nacional** (2025 y 2026 según el BOE; 2027, provisional). Con la prórroga marcada como hecha, el plazo de Sucesiones pasa a doce meses en todas las vistas. Aún **no descuenta los festivos autonómicos ni los locales**: si el plazo vence en uno de ellos, el último día real es el siguiente hábil. Los plazos civiles (alquiler, testamento ológrafo, inventario) se cuentan de fecha a fecha, sin traslado. Trabaja siempre con margen y no lo dejes para el último día." },
      "Los trámites marcados «En verificación» tienen un plazo orientativo."],
    ir: [["Trámites del expediente", "sec:tramites"], ["Agenda", "agenda"]] },
  { id: "prorroga", s: "plazos", t: "Prórroga del impuesto y de la plusvalía", d: "Seis meses más, con intereses de demora y sin recargo.", kw: "prorroga ampliar plazo 659 intereses demora recargo seis meses doce",
    b: ["La prórroga de Sucesiones se pide en los cinco primeros meses y amplía el plazo seis meses, con intereses de demora (art. 68 RD 1629/1991). En Andalucía, con el modelo 659.",
      "Prepárala desde el trámite **Pedir la prórroga del impuesto si hace falta** o en Documentos › Escritos › **Solicitud de prórroga**.",
      "Cuando la presentes, marca ese trámite como **Hecho**: el Diagnóstico pasa a contar el plazo prorrogado de doce meses.",
      "La prórroga de la plusvalía es independiente: se pide al ayuntamiento dentro de los seis meses.",
      "Con prórroga, la prescripción se cuenta desde el final del plazo prorrogado."],
    ir: [["Solicitud de prórroga", "doc:prorroga"], ["Trámites del expediente", "sec:tramites"]] },
  { id: "tramites", s: "plazos", t: "Trámites: estados, ajustes y calendario", d: "{TR_TOTAL} trámites en el catálogo; solo aparecen los que aplican al caso.", kw: "tramites estados pendiente curso hecho no aplica situaciones ajustar caso calendario ics outlook google enlaces sede",
    b: ["Trámites lista lo que hay que hacer en este caso, por fases: primeros días, conocer la herencia, inventario, decidir, formalizar y pagar, cambios de titularidad y después.",
      "Toca el círculo para cambiar el estado (pendiente, en curso, hecho) o abre el trámite para ver qué es, quién lo hace, dónde, la base legal, los enlaces oficiales, los documentos y tus notas. Cada cambio queda en la bitácora.",
      "**Ajustar al caso** añade o quita trámites según las situaciones del causante: autónomo, pensionista, alquileres, seguro de decesos, bienes en el extranjero…",
      "**Plazos al calendario** descarga un archivo .ics para Calendario de Apple, Google Calendar u Outlook, con aviso una semana antes de cada plazo. El de la Agenda incluye toda la cartera."],
    ir: [["Trámites del expediente", "sec:tramites"], ["Ajustar al caso", "situ"]] },

  // ── Documentos ──
  { id: "escritos", s: "documentos", t: "Escritos en Word y PDF", d: "Borradores con los datos del expediente, listos para revisar.", kw: "escritos documentos word docx pdf borrador plantillas carta banco renuncia cuaderno encargo liquidacion notaria recibi",
    b: ["En Documentos › **Escritos** están los borradores: propuesta de liquidación, nota para la notaría, liquidación final y recibí, informe para el cliente, carta al banco, guía de certificados, acuerdo entre herederos, solicitud de prórroga, cuaderno particional, minuta de renuncia, instancia de heredero único y hoja de encargo. Solo aparecen los que encajan con el caso.",
      "Al abrir uno ves el texto con lo pendiente resaltado en amarillo: lo completa o revisa el abogado.",
      "Descárgalo en **PDF** (con el membrete del despacho y la marca «Borrador» si queda algo por completar), en **Word** para editarlo, o **copia el texto**. Cada descarga queda en la bitácora.",
      { aviso: "Son borradores: revísalos antes de firmarlos o presentarlos." }],
    ir: [["Escritos del expediente", "sec:documentos:escritos"]] },
  { id: "informe-pdf", s: "documentos", t: "Informe de cálculo en PDF", d: "Todo el cálculo, paso a paso y con membrete.", kw: "informe pdf calculo imprimir descargar membrete cliente",
    b: ["Recoge los datos del expediente, la masa hereditaria, quién recibe qué, Sucesiones paso a paso por heredero, la plusvalía, el cuadro de partición, el resumen por heredero, las legítimas y las alertas del cálculo.",
      "Se descarga desde **Informe en PDF** (cabecera del expediente en el ordenador), desde Impuestos o desde el menú ⋯. La descarga queda en la bitácora.",
      "Lleva el nombre, el colegio y la localidad del despacho y el abogado responsable: configúralos antes en Ajustes.",
      "Para la familia, en lenguaje llano, usa el **Informe para el cliente** (Escritos) o la **Carpeta para la familia**."],
    ir: [["Descargar el informe", "informePdf"], ["Despacho y ajustes", "ajustes"]] },
  { id: "paquete-notaria", s: "documentos", t: "Listo para firmar y paquete para la notaría", d: "Comprobaciones antes de la escritura y un único PDF para la notaría.", kw: "firma notaria escritura paquete listo firmar comprobacion bloqueos nif domicilio referencia catastral cargas correo",
    b: ["La pestaña **Firma** revisa el expediente antes de ir a la notaría: identidad de los otorgantes (NIF, domicilio, estado civil), referencias catastrales y cargas, títulos, documentación, impuestos y plazos. Lo rojo bloquea; lo ámbar es un aviso. Cada comprobación lleva a donde se corrige.",
      "**Paquete para la notaría** descarga un único PDF con lo que necesita la notaría; mientras haya bloqueos sale con la marca «Borrador».",
      "**Texto del correo** copia el mensaje para la notaría con los otorgantes, los inmuebles, lo que se adjunta y lo pendiente."],
    ir: [["Firma del expediente", "sec:firma"]] },
  { id: "hoja-650", s: "documentos", t: "Modelos 650 y 660 casilla a casilla", d: "La autoliquidación de cada heredero y la relación de bienes, en el orden del formulario de cada territorio.", kw: "650 660 modelo autoliquidacion casillas copiar cifras hacienda ata presentar relacion bienes orden orientativo pdf colaborador social",
    b: ["En Impuestos › **Modelo 650** hay una ficha por heredero: identificación (sujeto pasivo, causante y presentador) y, después, base imponible, reducciones una a una, base liquidable, cuota íntegra, coeficiente, cuota tributaria, bonificaciones, deducciones y lo que hay que ingresar; fuera de plazo, también el recargo y los intereses. Cada casilla tiene **Copiar** (1234,56, como la pide el programa) y la ficha, **Copiar todo en orden** y **PDF** con el membrete del despacho.",
      "Los números de casilla solo aparecen cuando se han leído en las instrucciones oficiales: el modelo 650 de la Agencia Tributaria (no residentes, Ceuta y Melilla) y, en parte, el de Castilla y León. En el resto de territorios la hoja dice **Orden orientativo**: sigue el orden del modelo estatal sin números. En «Fuente y estado del cotejo» están la norma que aprueba cada formulario y lo consultado.",
      "En Impuestos › **Modelo 660** está la relación de bienes por bloques (inmuebles con su referencia catastral, cuentas con el IBAN oculto, valores con su ISIN, vehículos con su matrícula), el ajuar, las deudas, los gastos y los seguros, con los totales cuadrados con el cálculo y la lista de documentos que se acompañan.",
      "Antes de presentar, «Antes de presentar» señala lo que falta: NIF y domicilio de cada heredero y del causante, edades, referencias catastrales o cifras en verificación. Desde «Completar» se va al campo.",
      "Ningún territorio publica un formato de fichero que se pueda generar: Madrid importa el XML que crea su Oficina Virtual y Valencia usa servicios web para colaboradores. {{MARCA}} no presenta el modelo: prepara las cifras para el programa de ayuda o para el colaborador social."],
    ir: [["Modelo 650", "sec:impuestos:650"], ["Modelo 660", "sec:impuestos:660"], ["Hoja del 650 en Firma", "sec:firma:650"]] },
  { id: "leer-documentos", s: "documentos", t: "Cargar el expediente desde los documentos", d: "Sube el certificado de defunción, el testamento, las notas simples… y el programa propone los datos.", kw: "leer documentos subir pdf escaneo foto ocr reconocer extraer cargar datos automatico testamento defuncion ultimas voluntades nota simple catastro ibi dni banco compraventa",
    b: ["Desde la portada, **Desde documentos** crea un expediente nuevo con lo que lean los documentos que arrastres. Dentro de un expediente, al subir un PDF o una foto en Documentos › Archivo, se lee y se proponen los datos nuevos.",
      "Documentos que reconoce (28 tipos): certificado de defunción, últimas voluntades, seguros de fallecimiento, testamento, acta de declaración de herederos, libro de familia, certificados de nacimiento y de matrimonio, capitulaciones, padrón, DNI y NIE, nota simple (también con varias fincas), certificación catastral urbana y rústica, valor de referencia, recibo del IBI, escrituras de compraventa y de herencia anterior, certificados bancarios, datos fiscales de la AEAT, valores, planes de pensiones, participaciones sociales, pólizas de vida, préstamos, arrendamientos, vehículos, facturas del funeral y de la última enfermedad y modelos 650/660. También documentos de Word (.docx) y texto.",
      "Lo leído aparece como una lista de propuestas: causante (nombre, fecha y lugar del fallecimiento, estado civil, DNI, comunidad autónoma), testamento (reparto, notario, fecha y protocolo), personas (cónyuge, hijos, legatarios, con su DNI si está en otro documento), inmuebles (referencia catastral, valores catastrales, municipio, titularidad, cargas, fecha y precio de compra), cuentas y fondos con su saldo, hipotecas y seguros. Marcas lo que quieras cargar; lo dudoso o lo que choca con un dato que ya tenía el expediente va sin marcar.",
      "Lo que se carga queda señalado como **leído de documento** en las fichas, hasta que lo revises. Nada se inventa: lo que no se reconoce se deja vacío y se avisa.",
      "Un PDF con texto se lee en un segundo. Un escaneo o una foto se reconoce por imagen en el propio ordenador (de cinco a treinta segundos por página la primera vez). Todo ocurre en este equipo: los documentos no se envían a ningún sitio.",
      "Funciona en la versión web (https://heredate.github.io). En el archivo único los documentos se archivan, pero no se leen."],
    ir: [["Crear un expediente desde documentos", "lecNuevo"], ["Guía: cargar desde documentos", "guia:leer"]] },
  { id: "panel-despacho", s: "despacho", t: "Panel del despacho y perfiles", d: "Lo que necesita ver el socio: expedientes al día, carga del equipo, riesgo, dinero y tiempos.", kw: "socio panel despacho perfil abogado administrativo carga equipo north star al dia riesgo dinero facturar cobrar tiempo fase",
    b: ["Cada persona del equipo tiene un perfil: **socio**, **abogado** o **administrativo** (Despacho y ajustes › Equipo). Abajo a la izquierda eliges quién usa este equipo.",
      "El socio ve **Panel del despacho**: el porcentaje de expedientes activos al día (sin plazos vencidos, bloqueos graves ni tareas atrasadas), la carga de cada persona, los expedientes que necesitan atención, el dinero (presupuestado, facturado, cobrado, por facturar, provisiones), los motivos de bloqueo más frecuentes y el tiempo medio por fase.",
      "El abogado entra por Mi día filtrado a lo suyo; el administrativo, por lo que espera de terceros.",
      "Los perfiles ordenan lo que ve cada uno; no son permisos: quien abre la app en este equipo puede cambiar de usuario. Para proteger los datos, usa el bloqueo con contraseña."],
    ir: [["Despacho y ajustes", "ajustes"]] },
  { id: "registro-cambios", s: "despacho", t: "Registro de cambios", d: "Quién cambió qué y cuándo, con el valor anterior y el nuevo.", kw: "auditoria registro cambios historial quien cuando valor anterior trazabilidad",
    b: ["Cada vez que se guarda, la app anota los cambios en los datos que importan: porcentajes y renuncias de los herederos, valores y titularidad de los bienes, adjudicaciones de la partición, fase, responsable, honorarios, movimientos de fondos y estado de los documentos.",
      "Lo ves en la Actividad de cada expediente y en Panel del despacho › Actividad, con filtros y descarga en CSV. Entra en la exportación del expediente."],
    ir: [] },
  { id: "buscar", s: "empezar", t: "Buscar cualquier cosa", d: "Un solo cuadro para expedientes, personas, inmuebles, documentos y trámites.", kw: "buscar busqueda global paleta ctrl k comando nif referencia catastral iban documento",
    b: ["Pulsa **Ctrl+K** (⌘K en Mac) o el cuadro «Buscar o hacer…» de la barra lateral. Escribe un nombre, un NIF, una dirección, una referencia catastral, un IBAN, el nombre de un documento o de un trámite: aparecen agrupados por tipo y cada resultado lleva directamente a su sitio.",
      "No importan los acentos ni las mayúsculas. Desde el mismo cuadro se ejecutan acciones («nuevo expediente», «informe en PDF», «tema oscuro»…) y se hacen cuentas («= 285000*0,03»)."],
    ir: [["Abrir la búsqueda", "paleta"]] },
  { id: "archivo", s: "documentos", t: "Archivo de documentos del expediente", d: "DNI, escrituras, certificados… guardados con el expediente.", kw: "archivo adjuntos subir documentos escanear arrastrar dni escrituras certificados categorias",
    b: ["En Documentos › **Archivo** subes o arrastras los documentos del expediente. Se clasifican solos por el nombre del archivo (identidad, defunción, testamento, bancos, inmuebles, impuestos…) y puedes asignarlos a un trámite.",
      "«Lo que hace falta» es la lista de documentos del caso: márcalos al recibirlos.",
      "Se guardan en este equipo, con el resto de los datos. Entran en la copia automática y, hasta 150 MB, en la copia descargada.",
      { nota: "Si el navegador no permite guardar archivos, {{MARCA}} lo avisa: se conservarían solo mientras la página esté abierta." }],
    ir: [["Documentos del expediente", "sec:documentos"]] },

  // ── Familia ──
  { id: "cuestionario", s: "familia", oculto: true, t: "Pedir los datos a la familia (función apagada)", d: "Un cuestionario para el móvil; tú solo revisas.", kw: "familia cuestionario formulario datos enviar whatsapp correo respuesta cargar archivo cliente",
    b: ["Desde el expediente (franja «Pide los datos a la familia» o menú ⋯ › Datos de la familia) envías a la familia un cuestionario: datos del fallecido, herederos, bienes, deudas y documentos que tienen. Unos diez minutos.",
      { pasos: ["Escribe el móvil o el correo del cliente y envía el enlace por WhatsApp o por correo, con el mensaje ya escrito. Si {{MARCA}} no se usa desde su dirección web, descarga el cuestionario como archivo y envíalo tú.", "La familia lo rellena en el móvil y, al terminar, te envía el archivo que se descarga.", "Cárgalo con **Cargar la respuesta**. También desde Ajustes › Importar un archivo: se une al expediente con la misma referencia o crea uno nuevo."] },
      "Copiar el enlace o descargar el archivo no lo da por enviado: si lo envías por otro medio, pulsa **Marcar como enviado**.",
      "Lo que aporta la familia nunca sobrescribe lo que ya escribiste: solo rellena datos vacíos y añade personas y bienes nuevos, marcados para revisar.",
      "No pasa por ningún servidor: el enlace solo lleva el nombre, el teléfono y el correo del despacho y la referencia del expediente; ningún dato de la familia."],
    ir: [["Datos de la familia", "familia"]] },
  { id: "carpeta", s: "familia", t: "Carpeta para la familia", d: "Una página para el móvil con lo esencial de la herencia.", kw: "carpeta familia movil resumen html enviar sin cifras preguntas documentos",
    b: ["En **Para la familia › Carpeta para la familia** descargas un archivo que la familia abre en cualquier móvil, sin instalar nada. No envía datos a ningún sitio.",
      "Incluye quién hereda, los próximos pasos con sus fechas, la lista de documentos con casillas que la familia va marcando y cinco preguntas frecuentes en lenguaje llano.",
      { lista: ["**Incluir el reparto**: qué parte recibe cada uno y qué bienes forman la herencia.", "**Incluir los impuestos previstos**: Sucesiones y plusvalía por heredero, y el plazo.", "**Sin cifras**: útil si un heredero no debe ver lo de los demás."] },
      "Envíalo por WhatsApp o por correo. La descarga queda en la bitácora."],
    ir: [["Para la familia", "carpeta"]] },
  { id: "reunion", s: "familia", t: "Modo reunión", d: "La herencia explicada a la familia, a pantalla completa.", kw: "reunion presentar familia pantalla completa explicar cliente primera reunion diapositivas",
    b: ["Para la primera reunión: pantallas a pantalla completa con quién hereda y en qué proporción, qué hay, qué paga cada uno y los próximos pasos.",
      "Se abre en **Para la familia › Abrir modo reunión** o desde {MOD}K escribiendo «reunión».",
      "Avanza con →, la barra espaciadora, Intro o tocando la pantalla; retrocede con ←. Inicio y Fin van a la primera y la última. Esc para salir. En la tableta o el móvil, desliza.",
      "Usa los cálculos del expediente: revisa los datos antes de la reunión."],
    ir: [["Abrir el modo reunión", "reunion"]] },

  // ── Despacho ──
  { id: "mi-dia", s: "despacho", t: "Mi día", d: "Lo que hay que mover hoy en todo el despacho.", kw: "mi dia radar hoy vencidos semana bloqueados parados responsable mañana pendientes",
    b: ["**Mi día** (barra lateral) reúne: **Hoy y vencido** (plazos superados, lo que vence hoy y riesgos graves), **Esta semana** (próximos siete días), lo **bloqueado** por bancos y otros terceros, y los **Parados** (más de 30 días sin anotaciones ni contactos).",
      "Filtra por responsable para ver la carga de cada abogado.",
      "Cada fila abre el expediente donde se resuelve, con el siguiente escrito o recordatorio listo. Los recordatorios se copian para enviarlos por correo o WhatsApp y quedan anotados.",
      "Se calcula con los plazos de cada trámite, el diagnóstico, la documentación recibida y la bitácora."],
    ir: [["Mi día", "midia"]] },
  { id: "terceros", s: "despacho", t: "Terceros: bancos, notarías y reclamaciones", d: "Qué se ha pedido, a quién, cuántos días lleva y el siguiente escrito.", kw: "terceros banco bancos certificado aseguradora notaria registro catastro reclamacion escalado banco de españa seguimiento solicitudes",
    b: ["En la pestaña **Terceros** registras cada petición: certificados del banco, pólizas de la aseguradora, copia del testamento, nota simple, Catastro, empadronamiento, Hacienda o Seguridad Social. {{MARCA}} sugiere las entidades a partir de los bienes.",
      "Cada tipo trae un plazo esperado (30 días para bancos y aseguradoras, 15 para notaría y registro, por ejemplo). Pasado el plazo, aparece como vencida.",
      "Estados: por enviar, enviada, reclamada, escalada y recibida. La carta, la reclamación al servicio de atención al cliente y el escalado al Banco de España o a la Dirección General de Seguros se preparan con los datos del expediente.",
      "Pedir información al banco y conservar los bienes no supone aceptar la herencia (art. 999 CC).",
      "Los recordatorios a la familia por los documentos que faltan se preparan aquí y quedan anotados."],
    ir: [["Terceros del expediente", "sec:terceros"]] },
  { id: "tiempos", s: "despacho", t: "Tiempos y cronómetro", d: "Cuánto trabajo lleva cada expediente.", kw: "tiempos cronometro horas registrar minutos trabajo facturar tarifa euros hora",
    b: ["Dentro de un expediente, el botón **Cronómetro** (abajo a la derecha) mide el trabajo. Puedes pausarlo y, al pararlo, guardas el tiempo con un concepto y una categoría.",
      "El cronómetro sigue contando aunque cambies de pantalla o de expediente: la píldora indica en cuál está corriendo.",
      "En **Encargo › Tiempos** ves y corriges los tiempos, añades tiempo a mano y comparas con los honorarios: euros por hora frente al objetivo del despacho."],
    ir: [["Tiempos del expediente", "sec:despacho:tiempos"]] },
  { id: "rentabilidad", s: "despacho", t: "Rentabilidad del despacho", d: "Honorarios, cobros, horas y euros por hora.", kw: "rentabilidad honorarios cobros pendientes horas euros hora objetivo duracion cuadro mando titular",
    b: ["**Rentabilidad** (barra lateral) resume, por periodo (este año, últimos 90 días o todo): honorarios presupuestados y cobrados, pendientes de cobro, provisiones sin aplicar en expedientes archivados, horas registradas, euros por hora, expedientes abiertos, duración media y expedientes parados.",
      "El objetivo de euros por hora (90 € sin IVA si no lo cambias) se edita en la propia pantalla.",
      "Las cifras salen de los honorarios de cada encargo, de la cuenta de fondos y de los tiempos registrados."],
    ir: [["Rentabilidad", "rent"]] },
  { id: "encargo", s: "despacho", t: "Encargo, honorarios y fondos del cliente", d: "Hoja de encargo, presupuesto y cuenta de fondos.", kw: "encargo honorarios presupuesto fondos provision suplidos cliente cumplimiento blanqueo conflicto intereses hoja de encargo iva",
    b: ["En la pestaña **Encargo**: datos del cliente, referencia, responsable, fecha del encargo y comprobaciones de cumplimiento (identificación, hoja de encargo, conflicto de intereses, Ley 10/2010 y protección de datos).",
      "Honorarios por importe cerrado o por porcentaje del caudal con mínimo. Con notaría, registro y otros gastos estimados, sale el presupuesto con IVA y los impuestos previstos de la herencia. La **Hoja de encargo** se genera con esas cifras.",
      "**Honorarios y fondos**: registra la provisión recibida, los suplidos pagados y los honorarios aplicados; el saldo es el dinero del cliente que guarda el despacho. No sustituye a la factura.",
      "{{MARCA}} avisa de coincidencias de nombres con otros expedientes (posible conflicto de intereses)."],
    ir: [["Encargo del expediente", "sec:despacho"]] },
  { id: "calculadora", s: "despacho", t: "Calculadora para la web del despacho", d: "Las familias calculan su herencia y te piden que revises su caso.", kw: "calculadora web widget wordpress captar clientes iframe pagina formulario",
    b: ["En Ajustes › Compartir › **Calculadora de herencias para tu web** generas una calculadora de Sucesiones con el nombre, el color y los datos de contacto del despacho.",
      { pasos: ["Elige el color, la comunidad que aparece elegida y los canales de contacto (WhatsApp, correo).", "Pulsa **Descargar mi calculadora**: un único archivo con todo dentro.", "Súbelo a tu web (en WordPress, Medios › Añadir nuevo archivo) y pega aquí su dirección.", "Copia el código y pégalo en un bloque HTML personalizado de la página, o enlázala desde un botón."] },
      "Funciona en el navegador de la familia y no envía nada por sí sola: los datos te llegan cuando la familia pulsa enviar en su WhatsApp o su correo. El archivo que pueden guardar se carga en Ajustes › Importar un archivo y abre un expediente nuevo.",
      { aviso: "Revisa que tu política de privacidad cubra estas consultas." }],
    ir: [["Calculadora para tu web", "calculadora"]] },

  // ── Datos y seguridad ──
  { id: "donde", s: "datos", t: "Dónde se guardan los datos", d: "En este equipo y en este navegador. Nada pasa por un servidor.", kw: "datos donde guardan almacenamiento local navegador servidor nube privacidad rgpd espacio persistente incognito",
    b: ["Los expedientes, el equipo, los ajustes y los documentos adjuntos se guardan **en este equipo**, dentro del navegador. {{MARCA}} no los envía a ningún servidor.",
      "Por eso cada ordenador, cada navegador y cada perfil del navegador tienen sus propios datos, salvo que uséis **Despacho en red** (una carpeta compartida del despacho). Las ventanas privadas o de incógnito los pierden al cerrarse: no las uses.",
      "Al abrirse, {{MARCA}} pide al navegador que proteja los datos contra el borrado automático por falta de espacio. En Ajustes › Almacenamiento y versión ves si lo ha concedido y cuánto ocupan (unos 5 MB para los expedientes; los documentos van aparte).",
      "Cada cambio se guarda al momento. Si un guardado falla, por ejemplo por falta de espacio, aparece una franja roja: descarga una copia.",
      { aviso: "Como los datos están en el equipo, la copia de seguridad la hace el despacho. Activa la copia automática." }],
    ir: [["Almacenamiento", "ajustes:almacen"], ["Copias de seguridad", "ajustes:copias"]] },
  { id: "copias", s: "datos", t: "Copias de seguridad", d: "Una copia diaria en la carpeta que elijas, con los documentos.", kw: "copia seguridad backup automatica carpeta onedrive dropbox google drive servidor descargar recordatorio",
    b: [{ h: "Copia automática (Chrome y Edge)" },
      { pasos: ["Ajustes › Copias de seguridad › **Activar la copia automática**.", "Elige una carpeta, mejor dentro de OneDrive, Dropbox, Google Drive o el servidor del despacho. Si no se llama «{{MARCA}}…», se crea dentro la subcarpeta «{{MARCA}} copias».", "Listo: {{MARCA}} guarda una copia cada día y, mientras está abierto, otra cada 2 horas si hay cambios (puedes elegir 1, 2, 4 u 8 horas)."] },
      "Conserva las últimas 30 copias diarias. Los documentos se guardan una sola vez en la subcarpeta «Documentos».",
      "Si el navegador vuelve a pedir permiso para la carpeta (suele pasar tras reiniciar), aparece la franja «Copias automáticas en pausa»: pulsa **Reanudar copias automáticas**.",
      { h: "Copia descargada (cualquier navegador)" },
      "**Descargar una copia ahora** guarda un archivo .hereda.json con todos los expedientes, el equipo, los ajustes y los documentos (hasta 150 MB de documentos). Guárdalo fuera del ordenador.",
      "Si no hay copia automática, {{MARCA}} te recuerda en Expedientes descargar una copia cuando pasan siete días desde la última."],
    ir: [["Activar la copia automática", "copiaAuto"], ["Descargar una copia", "copiaDescargar"]] },
  { id: "contrasena", s: "datos", t: "Contraseña y cifrado", d: "Cifra los expedientes del equipo; sin la contraseña nadie puede leerlos.", kw: "contraseña clave password cifrado cifrar bloquear bloqueo proteger seguridad aes olvidado",
    b: [{ pasos: ["Ajustes › Contraseña y bloqueo › **Proteger con contraseña**.", "Escribe dos veces una contraseña de al menos 10 caracteres.", "{{MARCA}} cifra los expedientes, el equipo, los ajustes y los documentos (AES-256, con una clave derivada por PBKDF2-SHA256 y 600.000 iteraciones)."] },
      "Desde entonces pide la contraseña al abrir y tras un rato sin uso (5, 15, 30 o 60 minutos; 15 si no lo cambias). Para bloquear al momento: {MOD}L o el botón **Bloquear**.",
      "Quedan sin cifrar el nombre del despacho y el tema, para la pantalla de bloqueo. Las copias se cifran solo si activas **Cifrar también las copias**; entonces se abren con la contraseña que había al hacerlas.",
      { aviso: "Si olvidas la contraseña, nadie puede recuperar los datos, tampoco {{MARCA}}: solo queda restaurar una copia. Antes de activarla, haz una copia y guarda la contraseña en un lugar seguro." },
      "Protege si alguien abre o se lleva el equipo; no protege frente a programas maliciosos mientras {{MARCA}} está desbloqueado. Solo está disponible abriendo {{MARCA}} desde su dirección segura (https)."],
    ir: [["Contraseña y bloqueo", "ajustes:contrasena"]] },
  { id: "cambiar-ordenador", s: "datos", t: "Cambiar de ordenador o trabajar en dos", d: "Cómo llevar los expedientes a otro equipo.", kw: "cambiar ordenador equipo nuevo portatil migrar trasladar dos equipos sincronizar exportar importar compañero",
    b: [{ h: "Equipo nuevo" },
      { pasos: ["En el equipo antiguo, comprueba que la última copia es de hoy (Ajustes › Copias de seguridad) o descarga una.", "En el nuevo, abre {{MARCA}} (e instálalo como aplicación).", "Ajustes › **Restaurar desde la carpeta de copias** (si la carpeta está en OneDrive, Dropbox o Drive, ya estará allí) o **Restaurar una copia** con el archivo descargado.", "Activa también la copia automática en el equipo nuevo."] },
      "La copia lleva el código de licencia: al restaurarla se conserva.",
      { h: "Dos equipos a la vez" },
      "Para que varios ordenadores trabajen con los mismos expedientes, usa **Despacho en red** (artículo «Trabajar varios en el mismo despacho»).",
      "Sin Despacho en red (por ejemplo, en el móvil), cada equipo tiene sus datos. Para pasar un expediente, menú ⋯ › **Exportar este expediente** (con sus documentos, hasta 20 MB) y, en el otro equipo, Ajustes › **Importar un archivo**. Si ese expediente ya existe en el otro equipo, {{MARCA}} compara las dos versiones y te deja **actualizar** con la recibida o **importarla como copia** (referencia terminada en «-I»).",
      "Para unir una copia completa con lo que hay, usa **Combinar** al restaurar: de cada expediente se queda la versión más reciente y no se borra nada."],
    ir: [["Copias de seguridad", "ajustes:copias"]] },
  { id: "red", s: "datos", t: "Trabajar varios en el mismo despacho", d: "Despacho en red: los ordenadores comparten los expedientes a través de una carpeta del despacho.", kw: "red varios ordenadores equipos compartir sincronizar sincronizacion onedrive dropbox google drive servidor nas carpeta compartida compañeros conflicto presencia editando despacho en red",
    b: ["Con **Despacho en red**, todos los ordenadores del despacho ven los mismos expedientes, con sus documentos. {{MARCA}} no usa ningún servidor propio: los equipos se pasan los cambios a través de una carpeta que el despacho ya tiene sincronizada en todos ellos.",
      { h: "Qué hace falta" },
      { lista: ["Chrome o Edge en cada ordenador (Firefox, Safari y los móviles no pueden usar una carpeta así: en ellos, los expedientes se pasan con Exportar e Importar).", "Una carpeta compartida con todo el despacho: de **OneDrive** o **Dropbox**, de **Google Drive para escritorio**, o una carpeta del **servidor o del NAS** que todos tengan conectada."] },
      { h: "Ponerlo en marcha" },
      { pasos: ["En el primer ordenador: Despacho y ajustes › Despacho en red › **Trabajar varios en el mismo despacho**.", "Elige la carpeta compartida. Dentro, {{MARCA}} crea la subcarpeta «hereda-red».", "Pon un nombre a este equipo (por ejemplo, «Recepción»).", "**Crear el despacho en red**, mejor con contraseña: así todo lo que se escribe en la carpeta va cifrado y el servicio de la nube solo ve datos ilegibles.", "En cada uno de los demás ordenadores: el mismo camino, la misma carpeta, su nombre y **Unirse** (con la contraseña del despacho)."] },
      "Al unirse no se borra nada: los expedientes de ese ordenador se añaden a la carpeta y recibe los del despacho.",
      { h: "Cómo funciona" },
      { lista: ["Cada cambio se escribe en la carpeta al guardarlo.", "Los cambios de los demás se leen al abrir {{MARCA}}, al volver a su ventana y cada 45 segundos.", "Si otra persona tiene abierto el mismo expediente, lo verás en una franja azul: «Lourdes también tiene abierto este expediente».", "Si dos personas cambian a la vez **datos distintos** del mismo expediente, se juntan los dos cambios.", "Si cambian **el mismo dato** con valores distintos, {{MARCA}} guarda los dos y muestra la franja «cambios en conflicto»: eliges cuál se queda y la elección llega a todos. Nunca se pierde nada en silencio.", "Borrar un expediente lo quita de todos los equipos. Si otro equipo lo había cambiado después, no se borra: se conserva y se pregunta.", "El registro de cambios dice quién hizo cada cambio, también los que llegan de otros equipos."] },
      { h: "Límites" },
      { lista: ["No es al instante: con OneDrive, Dropbox o Drive, lo que hace otro equipo tarda lo que tarde el servicio en subirlo y bajarlo (normalmente segundos; a veces, minutos). Con una carpeta del servidor, como mucho 45 segundos.", "Tras reiniciar, el navegador puede volver a pedir permiso para la carpeta: aparece la franja «Despacho en red en pausa» con **Reanudar**.", "La contraseña del despacho no se puede recuperar. Cada equipo conserva sus expedientes, pero sin ella un equipo nuevo no podrá unirse.", "Los documentos que ya no usa ningún expediente se quitan de la carpeta a los 30 días.", "Despacho en red no sustituye a las copias de seguridad: mantén la copia automática en otra carpeta."] },
      { aviso: "Elige la misma carpeta en todos los ordenadores y no muevas ni cambies a mano los archivos de «hereda-red»." }],
    ir: [["Despacho en red", "ajustes:red"], ["Empezar ahora", "redAsistente"]] },
  { id: "restaurar", s: "datos", t: "Restaurar una copia", d: "Ves qué contiene antes de cambiar nada.", kw: "restaurar recuperar copia combinar reemplazar importar perdido datos dañados recuperacion",
    b: [{ pasos: ["Ajustes › **Restaurar una copia** (archivo .hereda.json o .hereda.enc) o **Restaurar desde la carpeta de copias** (eliges la copia de una lista y recupera también los documentos).", "{{MARCA}} muestra la fecha, los expedientes y los documentos de la copia.", "Elige **Combinar** (recomendado: añade los nuevos y, de cada expediente que está en los dos sitios, conserva la versión más reciente; no borra nada) o **Reemplazar todo** (el equipo queda como la copia; antes se guarda una copia de lo que hay ahora).", "Si la copia está cifrada, escribe la contraseña que había cuando se hizo."] },
      "Si al abrirse {{MARCA}} no puede leer los datos (por ejemplo, tras un corte mientras guardaba), muestra una pantalla de recuperación: no borra nada, deja descargar los datos dañados y restaurar una copia.",
      "Restaurar dos veces la misma copia no duplica los documentos."],
    ir: [["Copias de seguridad", "ajustes:copias"]] },
  { id: "dos-pestanas", s: "datos", t: "{{MARCA}} abierto en dos pestañas", d: "Cómo evita sobrescribir cambios.", kw: "dos pestañas ventanas abierto otra ventana recargar sobrescribir duplicado",
    b: ["Si {{MARCA}} está abierto en dos pestañas o ventanas del mismo navegador y una guarda cambios, la otra muestra la franja «{{MARCA}} está abierto en otra ventana y ha guardado cambios» con **Recargar**.",
      "Al volver a una pestaña con datos atrasados, se recarga sola para no sobrescribir lo guardado en la otra.",
      "Lo más seguro es trabajar en una sola ventana. En Chrome y Edge, la aplicación instalada y la pestaña del navegador cuentan como dos ventanas con los mismos datos."],
    ir: [] },
  { id: "borrar-navegador", s: "datos", t: "Qué pasa si borro los datos del navegador", d: "Las «cookies y datos de sitios» incluyen tus expedientes.", kw: "borrar navegador cookies datos sitios limpiar cache historial perdido desinstalar ccleaner",
    b: ["Borrar el historial o la caché no afecta. Pero si borras las **cookies y otros datos de sitios** de la dirección de {{MARCA}}, se borran los expedientes y los documentos de este equipo.",
      "Lo mismo puede pasar al borrar el perfil del navegador, al reinstalarlo o con programas de limpieza. Si al desinstalar la aplicación el navegador ofrece borrar también sus datos, no lo marques.",
      "Para recuperarlos: Ajustes › Restaurar desde la carpeta de copias, o Restaurar una copia con el último archivo descargado. Lo hecho después de esa copia se pierde.",
      "La protección contra el borrado automático solo evita que el navegador los borre por falta de espacio; no impide que los borre una persona."],
    ir: [["Copias de seguridad", "ajustes:copias"]] },
  { id: "actualizaciones", s: "datos", t: "Actualizaciones", d: "Llegan solas y tus datos se conservan.", kw: "actualizar actualizacion version nueva novedades sin conexion offline",
    b: ["Con conexión, {{MARCA}} carga siempre la última versión publicada. Si ya estaba abierto cuando sale una nueva, aparece la franja «Hay una versión nueva de {{MARCA}}» con **Actualizar**: guarda, recarga y conserva los datos.",
      "También puedes comprobarlo en Ajustes › Almacenamiento y versión › **Buscar**.",
      "Sin conexión funciona con la última versión guardada en el equipo.",
      "Lo nuevo de cada versión está en Ajustes › **Novedades de esta versión**."],
    ir: [["Novedades", "novedades"]] },

  // ── Licencia ──
  { id: "prueba", s: "licencia", t: "Prueba de 30 días", d: "Todas las funciones durante 30 días desde el primer uso.", kw: "prueba gratis trial 30 dias treinta periodo evaluacion",
    b: ["La prueba empieza el primer día que abres {{MARCA}} en el equipo y dura 30 días, con todas las funciones. La fecha de fin está en Ajustes › Licencia.",
      "A falta de 7, 3 y 1 días aparece un aviso en Expedientes; se puede cerrar y vuelve en el siguiente.",
      "Cuando termina no se pierde nada: {{MARCA}} queda en solo lectura hasta que actives la licencia (ver «Caducidad y renovación»)."],
    ir: [["Licencia", "ajustes:licencia"]] },
  { id: "activar", s: "licencia", t: "Activar la licencia", d: "Pegar el código HRD1-… en Ajustes › Licencia.", kw: "activar licencia codigo hrd1 clave plan usuarios contratar comprar",
    b: [{ pasos: ["Al contratar recibes un código que empieza por **HRD1-**.", "Ajustes › Licencia › **Código de licencia**: pégalo completo, tal como lo recibiste.", "Pulsa **Activar**. Se comprueba en el propio equipo, sin conexión."] },
      "Verás el plan, el despacho, la fecha de validez y el identificador. Planes: Individual (1 usuario), Despacho (5) y Despacho+ (15). Actívalo en cada equipo del despacho; si el equipo tiene más miembros que usuarios el plan, Ajustes lo indica.",
      "Al restaurar una copia, el código de licencia se conserva.",
      { h: "Si da error" },
      { lista: ["«Ese texto no es un código de licencia»: falta el principio; cópialo desde HRD1-.", "«El código está incompleto»: se cortó al copiarlo.", "«El código no es auténtico o se ha modificado»: cópialo de nuevo sin cambiar nada.", "«Este código caducó el…»: pide la renovación."] }],
    ir: [["Licencia", "ajustes:licencia"]] },
  { id: "caducidad", s: "licencia", t: "Caducidad y renovación", d: "Al caducar no se pierde nada: {{MARCA}} queda en solo lectura.", kw: "caducidad caduca caducada vence renovar renovacion solo lectura bloqueado expirado modificar",
    b: ["A falta de 30, 15, 7 y 1 días aparece en Expedientes el aviso «Tu licencia vence el…» con **Renovar**.",
      "Si la prueba o la licencia caducan, {{MARCA}} queda en **solo lectura**: puedes abrir y consultar todos los expedientes, imprimirlos y descargar sus PDF, exportarlos y hacer copias de seguridad. No puedes modificarlos ni crear expedientes nuevos (tampoco importándolos). Tus datos nunca se bloquean ni se borran.",
      { pasos: ["Pulsa **Renovar** o **Contratar** (Ajustes › Licencia).", "Recibirás un código nuevo.", "Pégalo en **Código de licencia nuevo o renovado** y pulsa **Activar**: sustituye al anterior."] }],
    ir: [["Licencia", "ajustes:licencia"]] },

  // ── Atajos ──
  { id: "atajos", s: "atajos", t: "Atajos de teclado", d: "{MOD}K, ?, Esc, {MOD}L y Mayúsculas+D.", kw: "atajos teclado teclas shortcuts comando control paleta rapido",
    b: [{ tabla: { cab: ["Teclas", "Qué hace"], filas: [["{MOD}K", "Buscar o hacer: ir a cualquier expediente, sección, trámite, norma o municipio, y hacer cuentas"], ["?", "Abrir esta ayuda (fuera de un campo de texto)"], ["Esc", "Cerrar la ayuda, la paleta o la hoja abierta"], ["{MOD}L", "Bloquear {{MARCA}} (solo con contraseña)"], ["Mayúsculas+D", "Guion de la demostración (con la demostración cargada)"], ["↑ ↓ ↵", "En la paleta: moverse y abrir"], ["← → Espacio", "En el modo reunión: pantalla anterior y siguiente"]] } },
      "En la paleta, escribe una operación (por ejemplo 250000*0,3) para calcularla, o «?» para ver los atajos."],
    ir: [["Abrir la paleta", "paleta"]] },

  // ── Soporte ──
  { id: "problemas", s: "soporte", t: "Problemas frecuentes", d: "Soluciones rápidas antes de escribirnos.", kw: "problema error no funciona no calcula fallo solucion faq preguntas frecuentes",
    b: [{ lista: ["**No calcula nada.** Faltan datos: hacen falta la fecha, la comunidad, al menos una persona y un bien.", "**No aparece la plusvalía.** El inmueble necesita valor catastral total, valor del suelo y fecha de adquisición.", "**No puedo crear ni modificar expedientes.** La prueba o la licencia han caducado y {{MARCA}} está en solo lectura: Ajustes › Licencia.", "**Franja «Copias automáticas en pausa».** El navegador pide permiso otra vez: pulsa Reanudar.", "**No veo mis expedientes en este ordenador.** Los datos son de cada equipo y navegador: restaura una copia.", "**Pide una contraseña que no recuerdo.** En la pantalla de bloqueo, «He olvidado la contraseña» lleva a restaurar una copia.", "**Franja «abierto en otra ventana».** Pulsa Recargar.", "**No puedo elegir una carpeta para las copias.** Usa Chrome o Edge; en otros navegadores, descarga la copia.", "**El PDF sale con «Borrador».** Quedan datos por completar (en amarillo) o bloqueos en Firma."] }],
    ir: [["Contactar con soporte", "art:soporte"]] },
  { id: "soporte", s: "soporte", t: "Contactar con soporte", d: "Cómo escribirnos y qué datos enviar.", kw: "soporte contacto ayuda telefono email correo whatsapp horario opinion incidencia",
    b: [{ especial: "soporte" },
      { h: "Antes de escribir" },
      { lista: ["Busca tu duda en esta ayuda: escribe dos o tres palabras arriba.", "Pulsa **Copiar datos para soporte** y pégalos en tu mensaje: versión, navegador y estado de la licencia, de las copias y del almacenamiento. No incluye datos de clientes.", "No envíes datos personales de clientes ni capturas donde se vean."] }],
    ir: [["Enviar opinión", "opinion"]] },
];

// ═════════ Texto: marcas, normalización y búsqueda ═════════
const ayNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, " ").trim();
function ayMod(pdf) { return pdf ? "Ctrl+" : AY_MAC() ? "⌘" : "Ctrl+"; }
function ayTxt(s, pdf) {
  const v = { MOD: ayMod(pdf), ORD_N: typeof ORD_N === "number" ? String(ORD_N) : "más de cien", TR_TOTAL: typeof TR_TOTAL !== "undefined" ? String(TR_TOTAL) : "Los", VERSION: typeof VERSION === "string" ? VERSION : "", APP: ayDireccion() };
  let t = String(s == null ? "" : s).replace(/\{(MOD|ORD_N|TR_TOTAL|VERSION|APP)\}/g, (m, k) => v[k]);
  if (pdf && /Ctrl\+[A-Z]\b/.test(t)) t = t.replace(/Ctrl\+([A-Z])\b/g, "Ctrl+$1 (Cmd+$1 en Mac)");
  return t;
}
const ayHTML = (s) => esc(ayTxt(s)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const ayPlano = (s, pdf) => ayTxt(s, pdf).replace(/\*\*(.+?)\*\*/g, "$1");
function ayDireccion() { try { return /^https:$/.test(location.protocol) && !window.claude ? webURL("/app/") : ""; } catch (e) { return ""; } }
const aySec = (id) => AY_SECCIONES.find((s) => s[0] === id) || AY_SECCIONES[0];
const ayArt = (id) => AY_ARTICULOS.find((a) => a.id === id) || null;
// Texto plano de un artículo (para buscar y para el fragmento de los resultados)
function ayCuerpo(a) {
  const L = [];
  for (const b of a.b || []) {
    if (typeof b === "string") L.push(b);
    else if (b.h) L.push(b.h);
    else if (b.pasos || b.lista) L.push(...(b.pasos || b.lista));
    else if (b.nota || b.aviso || b.norma) L.push(b.nota || b.aviso || b.norma);
    else if (b.tabla) L.push(...b.tabla.filas.map((f) => f.join(" ")));
  }
  return L.map((t) => ayPlano(t)).join(" ");
}
let AY_IDX = null;
function ayIndice() {
  if (AY_IDX) return AY_IDX;
  AY_IDX = AY_ARTICULOS.filter((a) => !a.oculto).map((a) => { const cuerpo = ayCuerpo(a); return { a, t: ayNorm(ayPlano(a.t)), d: ayNorm(ayPlano(a.d)), kw: ayNorm(a.kw + " " + aySec(a.s)[1]), c: ayNorm(cuerpo), plano: cuerpo }; });
  return AY_IDX;
}
const ayRaiz = (w) => (w.length > 4 ? w.replace(/(es|s)$/, "") : w);
// Buscar: cada palabra de la consulta tiene que aparecer (si no hay nada, basta con alguna). Pesos: título > palabras clave > resumen > texto.
function ayBuscar(q, max = 12) {
  const qn = ayNorm(q); if (qn.length < 2) return [];
  const qw = qn.split(" ").filter((w) => w.length > 1 || /\d/.test(w)).map(ayRaiz); if (!qw.length) return [];
  const pal = (txt, w) => (" " + txt).includes(" " + w);
  const puntua = (e, todas) => {
    let s = 0, n = 0;
    for (const w of qw) {
      const p = pal(e.t, w) ? 10 : e.t.includes(w) ? 6 : pal(e.kw, w) ? 6 : e.kw.includes(w) ? 3 : pal(e.d, w) ? 4 : pal(e.c, w) ? 2 : e.c.includes(w) ? 1 : 0;
      if (p) n++; s += p;
    }
    if (todas && n < qw.length) return 0;
    if (qw.length > 1 && e.t.includes(qn)) s += 8; else if (qw.length > 1 && e.c.includes(qn)) s += 3;
    return s;
  };
  let R = ayIndice().map((e) => ({ e, score: puntua(e, true) })).filter((r) => r.score > 0);
  if (!R.length) R = ayIndice().map((e) => ({ e, score: puntua(e, false) })).filter((r) => r.score > 1);
  R.sort((x, y) => y.score - x.score || x.e.a.t.localeCompare(y.e.a.t, "es"));
  return R.slice(0, max).map(({ e, score }) => ({ a: e.a, score, snip: aySnip(e.plano, qw) }));
}
// Fragmento del texto alrededor de la primera coincidencia, con las palabras marcadas (HTML)
function aySnip(plano, qw) {
  const n = ayNorm(plano), words = plano.split(/\s+/), nw = words.map(ayNorm);
  let i = nw.findIndex((w) => qw.some((q) => w.startsWith(q)));
  if (i < 0) return esc(words.slice(0, 22).join(" ")) + (words.length > 22 ? "…" : "");
  const a = Math.max(0, i - 8), b = Math.min(words.length, a + 26);
  return (a ? "…" : "") + words.slice(a, b).map((w, k) => (qw.some((q) => nw[a + k].startsWith(q)) ? `<mark>${esc(w)}</mark>` : esc(w))).join(" ") + (b < words.length ? "…" : "");
}

// ═════════ Contexto: qué artículo corresponde a la pantalla actual ═════════
function ayContexto() {
  try {
    const s = ui.sheet && ui.sheet.tipo;
    const porHoja = { ajustes: "despacho", familia: "cuestionario", carpeta: "carpeta", doc: "escritos", tramite: "plazos", situ: "tramites", widget: "calculadora", tc: "terceros", persona: "herederos-bienes", deudas: "herederos-bienes", opinion: "soporte", novedades: "actualizaciones" };
    if (s === "bien") { const x = typeof objetivo === "function" ? objetivo() : null, b = x && (x.bienes || []).find((q) => q.id === ui.sheet.id); return b && (b.tipo === "vivienda" || b.tipo === "inmueble") ? "plusvalia" : "herederos-bienes"; }
    if (s && porHoja[s]) return porHoja[s];
    if (ui.vista === "asist") return "primer-expediente";
    if (ui.vista === "radar") return "mi-dia";
    if (ui.vista === "agenda") return "plazos";
    if (ui.vista === "rent") return "rentabilidad";
    if (ui.vista === "biblio") return "verificado";
    if (ui.vista === "exp") {
      if (ui.sec === "despacho") return { tiempos: "tiempos", 650: "hoja-650", fondos: "encargo", docs: "archivo", actividad: "encargo" }[ui.sub] || "encargo";
      if (ui.sec === "documentos") return ui.dsub === "escritos" ? "escritos" : "archivo";
      if (ui.sec === "firma") return ui.vfv === "650" ? "hoja-650" : "paquete-notaria";
      if (ui.sec === "impuestos" && ["650", "660"].includes(ui.imv)) return "hoja-650";
      return { resumen: "pantallas", diagnostico: "diagnostico", tramites: "tramites", terceros: "terceros", herencia: "herederos-bienes", particion: "particion", impuestos: "sucesiones", estrategia: "estrategia", segunda: "dos-herencias", normativa: "verificado" }[ui.sec] || "pantallas";
    }
    const reales = (DB.expedientes || []).filter((x) => !x.demo && !x.ejemplo).length;
    return reales && ayPasos().every((p) => p.hecho) ? "pantallas" : "primeros-pasos";
  } catch (e) { return "primeros-pasos"; }
}

// ═════════ Primeros 30 minutos ═════════
function ayReales() { return (DB.expedientes || []).filter((x) => x && !x.demo && !x.ejemplo); }
function ayPasos() {
  const D = typeof despachoCfg === "function" ? despachoCfg() : {}, R = ayReales();
  const fsa = typeof sgFSA === "function" && sgFSA();
  const carpeta = typeof SG === "object" && SG && SG.carpeta && SG.carpetaPermiso === "granted";
  const lic = typeof licEstado === "function" ? licEstado() : null;
  const bit = (re) => R.some((x) => (x.bitacora || []).some((e) => re.test(String((e && e.texto) || ""))));
  return [
    { id: "despacho", titulo: "Configura el despacho", sub: "Nombre, colegio y localidad para el membrete; tu equipo.", hecho: !!String(D.nombre || "").trim(), ir: "ajustes", accion: "Abrir ajustes", art: "despacho" },
    { id: "copia", titulo: fsa ? "Activa la copia automática" : "Descarga tu primera copia", sub: fsa ? "Una copia diaria en OneDrive, Dropbox o el servidor del despacho." : "Este navegador no permite copias automáticas: descarga una copia y guárdala fuera del equipo.", hecho: !!(carpeta || (!fsa && DB.ultimaCopia)), ir: fsa ? "copiaAuto" : "copiaDescargar", accion: fsa ? "Elegir carpeta" : "Descargar", art: "copias" },
    { id: "expediente", titulo: "Abre tu primer expediente", sub: "Fecha, comunidad, una persona y un bien bastan para calcular.", hecho: R.length > 0, ir: "nuevo", accion: "Nuevo expediente", art: "primer-expediente" },
    { id: "documentos", titulo: "Carga un expediente desde los documentos", sub: "Defunción, testamento, notas simples, IBI, DNI, bancos: se leen y tú apruebas.", hecho: R.some((x) => (x.docsLeidos || []).length), espera: false, ir: "lecNuevo", accion: "Desde documentos", art: "leer-documentos" }, //uestionario" },
    { id: "informe", titulo: "Descarga el informe de cálculo en PDF", sub: "Masa, reparto, Sucesiones paso a paso y plusvalía, con tu membrete.", hecho: bit(/Informe de cálculo descargado/), espera: !R.length, ir: "informePdf", accion: "Descargar", art: "informe-pdf" },
    { id: "licencia", titulo: "Activa la licencia", sub: lic && lic.tipo === "prueba" ? `Prueba: ${lic.diasRestantes === 1 ? "queda 1 día" : "quedan " + lic.diasRestantes + " días"}.` : "Pega el código HRD1-… que recibiste al contratar.", hecho: !!(lic && lic.tipo === "licencia"), ir: "ajustes:licencia", accion: "Activar", art: "activar" },
  ];
}
function ayPasosLista(P, enAyuda) {
  const sig = P.find((p) => !p.hecho && !p.espera);
  const boton = (p) => p.hecho ? `<span class="ay-pp-ok">Hecho</span>` : p.espera ? `<span class="ay-pp-esp">Tras el primer expediente</span>` : `<button type="button" class="btn sm ${p === sig && !enAyuda ? "" : "gray"}" data-ay="ir" data-ay-v="${p.ir}">${esc(p.accion)}</button>`;
  return `<ol class="ay-pp-l">${P.map((p, i) => `<li class="${p.hecho ? "ok" : p === sig ? "sig" : ""}"><span class="ay-pp-c" aria-hidden="true">${p.hecho ? AY_IC.ok : i + 1}</span><span class="ay-pp-t"><b>${esc(p.titulo)}</b><small>${p.hecho ? "Hecho" : esc(p.sub)}</small></span>${boton(p)}<button type="button" class="ay-pp-q" data-ay="art" data-ay-v="${p.art}" aria-label="Ayuda: ${esc(p.titulo)}" title="Cómo se hace">${AY_IC.q}</button></li>`).join("")}</ol>`;
}
// Tarjeta para la Cartera: se muestra mientras falte algo, salvo que se haya ocultado o esté cargada la demostración
function ayPrimerosPasosHTML() {
  try {
    if ((DB.ay && DB.ay.pasosOcultos) || (typeof dmActivo === "function" && dmActivo())) return "";
    const P = ayPasos(), n = P.filter((p) => p.hecho).length;
    if (n === P.length) return "";
    return `<section class="card ay-pp" aria-label="Primeros 30 minutos">
      <div class="ay-pp-h"><div><div class="k">Primeros 30 minutos</div><h3>Deja el despacho listo para trabajar</h3></div><div class="ay-pp-n"><b class="num">${n}</b><span>de ${P.length}</span></div></div>
      <div class="ay-pp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${P.length}" aria-valuenow="${n}" aria-label="Pasos hechos"><i style="width:${Math.round((n / P.length) * 100)}%"></i></div>
      ${ayPasosLista(P, false)}
      <div class="ay-pp-f"><button type="button" class="link" data-gu="abrir" data-gu-v="pantalla">Guía interactiva: conoce la pantalla</button><button type="button" class="link" data-gu="abrir" data-gu-v="primer">Guía: tu primer expediente</button><button type="button" class="link" data-ay="pdf">Manual en PDF</button><button type="button" class="link ay-pp-x" data-ay="pasosOcultar">Ocultar</button></div>
    </section>`;
  } catch (e) { return ""; }
}

// ═════════ Destinos de «Ir a…» ═════════
function ayClick(ds) { const b = document.createElement("button"); b.type = "button"; b.hidden = true; for (const [k, v] of Object.entries(ds)) b.dataset[k] = v; $app.appendChild(b); b.click(); b.remove(); }
// Expediente de destino: el abierto; si no, el último visitado; si no, el primero de la cartera
function ayExpDestino() {
  if (ui.vista === "exp" && typeof exp === "function" && exp()) return exp();
  const rec = (DB.recientes || []).map((id) => DB.expedientes.find((x) => x.id === id)).find(Boolean);
  return rec || DB.expedientes[0] || null;
}
function ayAjustes(titulo, id) {
  ui.sheet = { tipo: "ajustes" }; render();
  setTimeout(() => {
    const el = id ? document.getElementById(id) : titulo ? [...document.querySelectorAll(".sheet .sectitle")].find((n) => n.textContent.trim() === titulo) : null;
    if (el) { el.scrollIntoView({ block: "start", behavior: "smooth" }); el.classList.add("ay-hl"); setTimeout(() => el.classList.remove("ay-hl"), 1800); }
  }, 80);
}
function ayIr(dest) {
  const [k, a, b] = String(dest || "").split(":");
  const conExp = (fn) => { const x = ayExpDestino(); if (!x) { toast("Primero abre o crea un expediente"); go({ vista: "inicio", sheet: null }); return; } if (!(ui.vista === "exp" && ui.id === x.id)) go({ vista: "exp", id: x.id, sec: ui.vista === "exp" ? ui.sec : "resumen", sheet: null }); fn(x); };
  const A = {
    ajustes: () => (a === "licencia" ? ayAjustes("", "lic-seccion") : a === "copias" ? ayAjustes("Copias de seguridad") : a === "contrasena" ? ayAjustes("Contraseña y bloqueo") : a === "almacen" ? ayAjustes("Almacenamiento y versión") : a === "red" ? ayAjustes("Despacho en red") : ayAjustes()),
    nuevo: () => ayClick({ act: "nuevo" }), cartera: () => go({ vista: "inicio", sheet: null }), midia: () => go({ vista: "radar", sheet: null }), agenda: () => go({ vista: "agenda", sheet: null }),
    rent: () => go({ vista: "rent", sheet: null }), biblio: () => go({ vista: "biblio", sheet: null }), demo: () => ayClick({ dm: "cargar" }), ejemplos: () => ayClick({ act: "ejemplos" }),
    paleta: () => { if (typeof pkAbrir === "function") pkAbrir(); }, atajos: () => { if (typeof pkAbrir === "function") pkAbrir("atajos"); }, opinion: () => ayClick({ act: "opinion" }), novedades: () => ayClick({ act: "novedades" }),
    guia: () => { if (typeof guAbrir === "function") setTimeout(() => guAbrir(a), 250); }, lecNuevo: () => ayClick({ act: "lecNuevo" }),
    calculadora: () => ayClick({ wg: "abrir" }), copiaAuto: () => ayClick({ sg: "carpeta" }), redAsistente: () => ayClick({ red: "asistente" }), copiaDescargar: () => ayClick({ sg: "descargar" }),
    sec: () => conExp((x) => { const v = { vista: "exp", id: x.id, sec: a, sheet: null }; if (a === "despacho") v.sub = b || "encargo"; if (a === "documentos") v.dsub = b === "escritos" ? "escritos" : "archivo"; if (a === "firma") ui.vfv = b === "650" ? "650" : "check"; if (a === "impuestos") ui.imv = ["650", "660"].includes(b) ? b : "calc"; go(v); }),
    doc: () => conExp(() => { ui.sheet = { tipo: "doc", id: a }; render(); }),
    familia: () => conExp(() => ayClick({ act: "familia" })), carpeta: () => conExp(() => ayClick({ act: "paraFamilia" })), informePdf: () => conExp(() => ayClick({ act: "informePdf" })),
    situ: () => conExp(() => ayClick({ act: "situ" })), reunion: () => conExp((x) => { if (typeof reunionAbrir === "function") { if (calcular(x)) reunionAbrir(x); else toast("Faltan datos para calcular"); } }),
  };
  if (k === "art") { ayVer(a); return; }
  if (k === "pdf") { ayManualPDF(); return; }
  ayCerrar();
  try { (A[k] || (() => {}))(); } catch (e) { console.error(e); toast("No se pudo abrir esa pantalla"); }
}

// ═════════ Soporte ═════════
function aySoporte() {
  const S = typeof HEREDA_SOPORTE === "object" && HEREDA_SOPORTE ? HEREDA_SOPORTE : {};
  const email = String(S.email || "").trim(), wa = String(S.whatsapp || S.telefono || "").replace(/[^\d+]/g, ""), horario = String(S.horario || "").trim();
  return { email: /@/.test(email) ? email : "", wa: wa.replace(/^\+/, "").length >= 9 ? wa.replace(/^\+/, "") : "", horario };
}
function ayDatosSoporte() {
  const L = [];
  const lic = typeof licEstado === "function" ? licEstado() : null;
  L.push(`${"{{MARCA}}"} · ${typeof VERSION_APP === "object" ? VERSION_APP.nombre : ""} · motor ${typeof VERSION === "string" ? VERSION : "—"}${typeof sgVersionPagina === "function" && sgVersionPagina() ? " · build " + sgVersionPagina() : ""}`);
  L.push(`Navegador: ${navigator.userAgent}`);
  L.push(`Instalado como aplicación: ${ayInstalada() ? "sí" : "no"} · ${location.protocol === "file:" ? "archivo local" : location.host || "—"}`);
  if (lic) L.push(`Licencia: ${lic.tipo}${lic.plan ? " · plan " + lic.plan : ""}${lic.id ? " · id " + lic.id : ""} · hasta ${lic.hasta}`);
  L.push(`Expedientes: ${ayReales().length} reales${(DB.expedientes || []).length - ayReales().length ? ` (+${(DB.expedientes || []).length - ayReales().length} de ejemplo o demostración)` : ""}`);
  if (typeof SG === "object" && SG) {
    L.push(`Cifrado: ${SG.cifrado ? "sí" : "no"} · copia automática: ${SG.carpeta ? (SG.carpetaPermiso === "granted" ? "activa" : "en pausa") : typeof sgFSA === "function" && sgFSA() ? "no activada" : "no disponible en este navegador"} · última copia: ${DB.ultimaCopia ? String(DB.ultimaCopia).slice(0, 16).replace("T", " ") : "nunca"}`);
    L.push(`Almacenamiento protegido: ${{ si: "sí", no: "no", na: "no disponible" }[SG.persist] || "comprobando"} · expedientes ${typeof sgMB === "function" ? sgMB(SG.lsTam || 0) : SG.lsTam} · documentos ${typeof sgMB === "function" ? sgMB(SG.docsTam || 0) : SG.docsTam}${SG.errorGuardar ? " · ERROR AL GUARDAR: " + SG.errorGuardar.msg : ""}`);
  }
  L.push(`Pantalla: ${ui.vista}${ui.vista === "exp" ? " › " + ui.sec : ""} · ${window.innerWidth}×${window.innerHeight} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`);
  return L.join("\n");
}
function aySoporteHTML() {
  const S = aySoporte(), asunto = encodeURIComponent(`Soporte ${"{{MARCA}}"}${typeof despachoCfg === "function" && despachoCfg().nombre ? " · " + despachoCfg().nombre : ""}`);
  const canales = [];
  if (S.email) canales.push(`<a class="ay-canal" href="mailto:${esc(S.email)}?subject=${asunto}"><span class="ico blue">${AY_IC.chat}</span><span><b>Correo</b><small>${esc(S.email)}</small></span></a>`);
  if (S.wa) canales.push(`<a class="ay-canal" href="https://wa.me/${esc(S.wa)}" target="_blank" rel="noopener"><span class="ico green">${AY_IC.chat}</span><span><b>WhatsApp</b><small>+${esc(S.wa)}</small></span></a>`);
  const cuerpo = canales.length ? `<div class="ay-canales">${canales.join("")}</div>${S.horario ? `<p class="ay-p">Horario de atención: ${esc(S.horario)}.</p>` : ""}`
    : `<p class="ay-p">Escríbenos desde Ajustes › <b>Enviar opinión</b>: elige WhatsApp o correo y cuéntanos qué esperabas y qué ocurrió.</p><div class="ay-acts"><button type="button" class="btn sm" data-ay="ir" data-ay-v="opinion">Enviar opinión</button></div>`;
  return `${cuerpo}<div class="ay-acts"><button type="button" class="btn sm gray" data-ay="copiarSoporte">Copiar datos para soporte</button></div>`;
}

// ═════════ Instalación (PWA) ═════════
let AY_BIP = null;
try { window.addEventListener("beforeinstallprompt", (e) => { AY_BIP = e; }); window.addEventListener("appinstalled", () => { AY_BIP = null; }); } catch (e) {}
function ayInstalada() { try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch (e) { return false; } }
function ayPlat() {
  const u = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(u)) return "android";
  if (/Edg\//.test(u)) return "edge";
  if (/Chrome\//.test(u)) return "chrome";
  if (/Macintosh/.test(u) && /Safari\//.test(u)) return "safari-mac";
  return "";
}
function ayInstalarHTML() {
  if (ayInstalada()) return `<div class="ay-call ok"><b>Ya estás usando {{MARCA}} como aplicación instalada.</b></div>`;
  if (!ayDireccion()) return `<div class="ay-call"><b>Desde aquí no se puede instalar.</b> Abre {{MARCA}} desde su dirección web segura (https) y sigue los pasos de tu navegador.</div>`;
  return AY_BIP ? `<div class="ay-acts"><button type="button" class="btn sm" data-ay="instalar">${AY_IC.dl}Instalar ahora</button></div>` : "";
}

// ═════════ Pintado del centro de ayuda ═════════
const AY = { abierta: false, root: null, vista: "inicio", art: null, sec: null, q: "", pila: [], foco: null, ctx: null };
function ayBloquesHTML(a) {
  const plat = ayPlat();
  return (a.b || []).map((b) => {
    if (typeof b === "string") return `<p class="ay-p">${ayHTML(b)}</p>`;
    if (b.h) return `<h3 class="ay-h3">${ayHTML(b.h)}${b.plat && b.plat === plat ? ` <span class="ay-este">Este equipo</span>` : ""}</h3>`;
    if (b.pasos) return `<ol class="ay-steps">${b.pasos.map((t) => `<li>${ayHTML(t)}</li>`).join("")}</ol>`;
    if (b.lista) return `<ul class="ay-ul">${b.lista.map((t) => `<li>${ayHTML(t)}</li>`).join("")}</ul>`;
    if (b.nota) return `<div class="ay-call">${ayHTML(b.nota)}</div>`;
    if (b.aviso) return `<div class="ay-call warn">${ayHTML(b.aviso)}</div>`;
    if (b.norma) return `<p class="ay-norma">${ayHTML(b.norma)}</p>`;
    if (b.tabla) return `<div class="ay-tabla"><table><thead><tr>${b.tabla.cab.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${b.tabla.filas.map((f) => `<tr><td><kbd>${esc(ayTxt(f[0]))}</kbd></td><td>${ayHTML(f[1])}</td></tr>`).join("")}</tbody></table></div>`;
    if (b.especial === "pasos") return `<div class="ay-pp-in">${ayPasosLista(ayPasos(), true)}</div>`;
    if (b.especial === "soporte") return aySoporteHTML();
    if (b.especial === "instalar") return ayInstalarHTML();
    return "";
  }).join("");
}
function ayFilaArt(a, extra) { return `<button type="button" class="ay-row" data-ay="art" data-ay-v="${a.id}"><span class="ay-row-t"><b>${ayHTML(a.t)}</b><small>${extra || ayHTML(a.d)}</small></span><span class="ay-row-i">${AY_IC.go}</span></button>`; }
function ayVistaArt() {
  const a = ayArt(AY.art); if (!a) return ayVistaInicio();
  const s = aySec(a.s), hermanos = AY_ARTICULOS.filter((q) => q.s === a.s && q.id !== a.id && !q.oculto);
  const ir = (a.ir || []).length ? `<div class="ay-ir">${a.ir.map(([t, d], i) => `<button type="button" class="btn sm ${i ? "gray" : ""}" data-ay="ir" data-ay-v="${esc(d)}">${ayHTML(t)}${AY_IC.go}</button>`).join("")}</div>` : "";
  const src = a.src ? `<p class="ay-src">Fuentes (consultadas el 4-10-2026): ${a.src.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(" · ")}</p>` : "";
  return `<article class="ay-art" aria-labelledby="ay-at">
    <nav class="ay-crumb"><button type="button" data-ay="inicio">Ayuda</button><span>›</span><button type="button" data-ay="sec" data-ay-v="${s[0]}">${ayHTML(s[1])}</button></nav>
    <h2 id="ay-at" class="ay-h2">${ayHTML(a.t)}</h2><p class="ay-lead">${ayHTML(a.d)}</p>
    ${ayBloquesHTML(a)}${ir}${src}
    ${hermanos.length ? `<div class="ay-k">También en ${ayHTML(s[1])}</div><div class="ay-list">${hermanos.map((q) => ayFilaArt(q)).join("")}</div>` : ""}
    ${a.s !== "soporte" ? `<div class="ay-mas">¿No resuelve tu duda? <button type="button" class="link" data-ay="art" data-ay-v="soporte">Contactar con soporte</button></div>` : ""}
  </article>`;
}
function ayVistaSec() {
  const s = aySec(AY.sec), L = AY_ARTICULOS.filter((a) => a.s === s[0] && !a.oculto);
  return `<nav class="ay-crumb"><button type="button" data-ay="inicio">Ayuda</button><span>›</span><span>${ayHTML(s[1])}</span></nav><h2 class="ay-h2">${ayHTML(s[1])}</h2><p class="ay-lead">${ayHTML(s[2])}</p><div class="ay-list">${L.map((a) => ayFilaArt(a)).join("")}</div>`;
}
function ayVistaBuscar() {
  const R = ayBuscar(AY.q);
  if (!R.length) return `<div class="ay-vacio"><b>Sin resultados para «${esc(AY.q.trim())}»</b><span>Prueba con otras palabras (por ejemplo «plazo», «copia», «ajuar», «licencia») o escríbenos.</span><button type="button" class="btn sm gray" data-ay="art" data-ay-v="soporte">Contactar con soporte</button></div>`;
  return `<div class="ay-k">${R.length === 1 ? "1 artículo" : R.length + " artículos"}</div><div class="ay-list">${R.map((r) => `<button type="button" class="ay-row" data-ay="art" data-ay-v="${r.a.id}"><span class="ay-row-t"><span class="ay-tag">${ayHTML(aySec(r.a.s)[1])}</span><b>${ayHTML(r.a.t)}</b><small>${r.snip}</small></span><span class="ay-row-i">${AY_IC.go}</span></button>`).join("")}</div>`;
}
function ayVistaInicio() {
  const c = ayArt(AY.ctx || ayContexto());
  const P = ayPasos(), n = P.filter((p) => p.hecho).length;
  const ctx = c ? `<button type="button" class="ay-ctx" data-ay="art" data-ay-v="${c.id}"><span class="ay-ctx-k">En esta pantalla</span><b>${ayHTML(c.t)}</b><small>${ayHTML(c.d)}</small><span class="ay-ctx-go">Leer ${AY_IC.go}</span></button>` : "";
  const pasos = n < P.length && (!c || c.id !== "primeros-pasos") ? `<button type="button" class="ay-ctx ay-ctx2" data-ay="art" data-ay-v="primeros-pasos"><span class="ay-ctx-k">Primeros 30 minutos · ${n} de ${P.length}</span><b>Deja el despacho listo para trabajar</b><span class="ay-mini"><i style="width:${Math.round((n / P.length) * 100)}%"></i></span></button>` : "";
  const secs = AY_SECCIONES.map(([id, nom, sub]) => { const L = AY_ARTICULOS.filter((a) => a.s === id && !a.oculto); return `<div class="ay-secc"><button type="button" class="ay-secc-h" data-ay="sec" data-ay-v="${id}"><b>${ayHTML(nom)}</b><small>${ayHTML(sub)}</small></button><ul>${L.slice(0, 5).map((a) => `<li><button type="button" data-ay="art" data-ay-v="${a.id}">${ayHTML(a.t)}</button></li>`).join("")}${L.length > 5 ? `<li><button type="button" class="ay-todos" data-ay="sec" data-ay-v="${id}">Ver los ${L.length}</button></li>` : ""}</ul></div>`; }).join("");
  const guias = typeof guHTMLLista === "function" ? `<div class="ay-secc" style="margin-bottom:14px"><div class="ay-secc-h" style="cursor:default"><b>Guías interactivas</b><small>Recorren la pantalla real paso a paso: tú haces cada cosa y la guía avanza sola. De dos a ocho minutos.</small></div>${guHTMLLista()}</div>` : "";
  return `<div class="ay-top">${ctx}${pasos}</div>${guias}
    <div class="ay-secs">${secs}</div>
    <div class="ay-pie"><button type="button" class="btn sm gray" data-ay="pdf">${AY_IC.dl}Manual de usuario en PDF</button><button type="button" class="btn sm gray" data-ay="art" data-ay-v="soporte">${AY_IC.chat}Contactar con soporte</button></div>`;
}
function ayNavHTML() {
  const actual = AY.vista === "art" ? (ayArt(AY.art) || {}).s : AY.vista === "sec" ? AY.sec : "";
  return `<button type="button" class="ay-nav-i ${AY.vista === "inicio" && !AY.q ? "on" : ""}" data-ay="inicio">Inicio</button>${AY_SECCIONES.map(([id, n]) => `<button type="button" class="ay-nav-i ${actual === id && !AY.q ? "on" : ""}" data-ay="sec" data-ay-v="${id}">${ayHTML(n)}<span>${AY_ARTICULOS.filter((a) => a.s === id).length}</span></button>`).join("")}`;
}
function ayPintar(arriba = true) {
  const r = AY.root; if (!r) return;
  const body = r.querySelector(".ay-body");
  body.innerHTML = AY.q.trim().length >= 2 ? ayVistaBuscar() : AY.vista === "art" ? ayVistaArt() : AY.vista === "sec" ? ayVistaSec() : ayVistaInicio();
  r.querySelector(".ay-nav").innerHTML = ayNavHTML();
  r.querySelector(".ay-back").hidden = !(AY.vista !== "inicio" || AY.q);
  if (arriba) body.scrollTop = 0;
}
function ayMontar() {
  if (AY.root) return AY.root;
  const r = document.createElement("div");
  r.className = "ay"; r.hidden = true;
  r.innerHTML = `<div class="ay-scrim" data-ay="cerrar"></div><div class="ay-panel" role="dialog" aria-modal="true" aria-label="Ayuda de {{MARCA}}">
    <header class="ay-head"><button type="button" class="tbtn ay-back" data-ay="volver" aria-label="Volver" hidden>${AY_IC.back}</button><span class="ay-ti">${AY_IC.book}<b>Ayuda</b></span><label class="ay-search">${AY_IC.search}<input class="ay-in" type="search" placeholder="Buscar en la ayuda" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Buscar en la ayuda"></label><button type="button" class="tbtn ay-x" data-ay="cerrar" aria-label="Cerrar la ayuda">${AY_IC.x}</button></header>
    <div class="ay-cols"><nav class="ay-nav" aria-label="Secciones de la ayuda"></nav><div class="ay-body" tabindex="-1"></div></div></div>`;
  document.body.appendChild(r);
  const inp = r.querySelector(".ay-in");
  inp.addEventListener("input", () => { AY.q = inp.value; ayPintar(); });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); const R = ayBuscar(AY.q); if (R.length) { ayVer(R[0].a.id); } } });
  AY.root = r; return r;
}
function ayAbierta() { return AY.abierta; }
// Abre la ayuda. tema: id de artículo, id de sección o texto a buscar. Sin tema: inicio con el artículo de la pantalla actual arriba.
function ayAbrir(tema) {
  const r = ayMontar();
  AY.ctx = ayContexto(); AY.pila = []; AY.q = ""; r.querySelector(".ay-in").value = "";
  if (tema && ayArt(tema)) { AY.vista = "art"; AY.art = tema; }
  else if (tema && AY_SECCIONES.some((s) => s[0] === tema)) { AY.vista = "sec"; AY.sec = tema; }
  else if (tema) { AY.vista = "inicio"; AY.q = String(tema); r.querySelector(".ay-in").value = AY.q; }
  else AY.vista = "inicio";
  if (!AY.abierta) { AY.foco = document.activeElement; AY.abierta = true; r.hidden = false; r.classList.remove("out"); document.documentElement.classList.add("ay-lock"); }
  ayPintar();
  const fin = typeof escritorio === "function" ? escritorio() : window.innerWidth >= 1024;
  setTimeout(() => { if (fin && AY.vista === "inicio") r.querySelector(".ay-in").focus({ preventScroll: true }); else r.querySelector(".ay-body").focus({ preventScroll: true }); }, 30);
}
function ayVer(id) {
  if (!AY.abierta) { ayAbrir(id); return; }
  if (!ayArt(id)) return;
  AY.pila.push({ vista: AY.vista, art: AY.art, sec: AY.sec, q: AY.q });
  AY.vista = "art"; AY.art = id; AY.q = ""; AY.root.querySelector(".ay-in").value = "";
  ayPintar(); AY.root.querySelector(".ay-body").focus({ preventScroll: true });
}
function ayVolver() {
  const p = AY.pila.pop();
  if (p) Object.assign(AY, p); else { AY.vista = "inicio"; AY.q = ""; }
  AY.root.querySelector(".ay-in").value = AY.q; ayPintar();
}
function ayCerrar() {
  if (!AY.abierta) return;
  AY.abierta = false; document.documentElement.classList.remove("ay-lock");
  const r = AY.root, quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (quieto) r.hidden = true; else { r.classList.add("out"); setTimeout(() => { if (!AY.abierta) { r.hidden = true; r.classList.remove("out"); } }, 160); }
  const f = AY.foco; AY.foco = null; if (f && document.contains(f) && !f.closest(".ay")) { try { f.focus({ preventScroll: true }); } catch (e) {} }
}
// Botón «?» para la barra superior (por defecto) o fila para la barra lateral (clase "sitem")
function ayBotonHTML(clase) {
  if (clase === "sitem") return `<button type="button" class="sitem" data-ay="abrir"><span class="ic">${AY_IC.q}</span><span class="t"><b>Ayuda</b></span></button>`;
  return `<button type="button" class="${clase || "tbtn"} ay-tb" data-ay="abrir" aria-label="Ayuda" title="Ayuda (?)" aria-keyshortcuts="Shift+?">${AY_IC.q}</button>`;
}
// Para paleta.js: artículos que coinciden con la consulta
function ayParaPaleta(q) {
  return ayBuscar(q, 4).map((r) => ({ titulo: ayPlano(r.a.t), sub: `Ayuda · ${ayPlano(aySec(r.a.s)[1])} · ${ayPlano(r.a.d)}`, s: r.score >= 10 ? 2 : 3, abrir: () => ayAbrir(r.a.id) }));
}

// ═════════ Manual de usuario en PDF (mismos artículos) ═════════
const AY_PDF_SUST = [[/↑ ↓ ↵/g, "Flechas arriba y abajo, Intro"], [/← → Espacio/g, "Flechas izquierda y derecha, barra espaciadora"], [/→/g, "flecha derecha"], [/←/g, "flecha izquierda"], [/↵/g, "Intro"], [/⋮/g, "de tres puntos"], [/⋯/g, "de tres puntos"], [/···/g, "de tres puntos"], [/ › /g, " > "]];
function ayPdfTxt(s) { let t = ayPlano(s, true); for (const [re, v] of AY_PDF_SUST) t = t.replace(re, v); return t; }
function ayManualBloques() {
  const B = [], P = (t) => B.push({ tipo: "p", texto: ayPdfTxt(t) });
  P(`Este manual reúne los artículos del centro de ayuda de {{MARCA}} (${typeof VERSION_APP === "object" ? VERSION_APP.nombre : ""}, motor de cálculo ${typeof VERSION === "string" ? VERSION : ""}). Dentro de la aplicación, la ayuda se abre con el botón «?» o la tecla ?, y busca por palabras sin tener en cuenta los acentos.`);
  P("{{MARCA}} calcula y prepara; el criterio es del abogado. Las cifras son estimaciones que el profesional revisa antes de presentar o firmar.");
  B.push({ tipo: "h", texto: "Índice" });
  B.push({ tipo: "lista", numerada: true, items: AY_SECCIONES.map(([id, n]) => `${ayPdfTxt(n)}: ${AY_ARTICULOS.filter((a) => a.s === id).map((a) => ayPdfTxt(a.t)).join("; ")}.`) });
  AY_SECCIONES.forEach(([id, nom, sub], i) => {
    B.push({ tipo: "h", numero: `${i + 1}.`, texto: ayPdfTxt(nom).toUpperCase() });
    P(sub);
    AY_ARTICULOS.filter((a) => a.s === id).forEach((a, j) => {
      B.push({ tipo: "h", numero: `${i + 1}.${j + 1}`, texto: ayPdfTxt(a.t) });
      P(a.d);
      for (const b of a.b || []) {
        if (typeof b === "string") P(b);
        else if (b.h) P(b.h + ":");
        else if (b.pasos) B.push({ tipo: "lista", numerada: true, items: b.pasos.map(ayPdfTxt) });
        else if (b.lista) B.push({ tipo: "lista", items: b.lista.map(ayPdfTxt) });
        else if (b.nota) P("Nota: " + b.nota);
        else if (b.aviso) P("Importante: " + b.aviso);
        else if (b.norma) P("Normas: " + b.norma);
        else if (b.tabla) B.push({ tipo: "tabla", cabecera: b.tabla.cab, filas: b.tabla.filas.map((f) => f.map(ayPdfTxt)), alinear: ["l", "l"] });
        else if (b.especial === "pasos") B.push({ tipo: "lista", numerada: true, items: ayPasos().map((p) => `${p.titulo}. ${p.id === "licencia" ? "Pega el código HRD1-… que recibiste al contratar." : p.id === "copia" ? "En Chrome o Edge, una copia diaria en OneDrive, Dropbox o el servidor del despacho; en otros navegadores, descarga una copia." : p.sub}`) });
        else if (b.especial === "soporte") { const S = aySoporte(); P(S.email || S.wa ? `Correo: ${S.email || "—"}. WhatsApp: ${S.wa ? "+" + S.wa : "—"}.${S.horario ? " Horario: " + S.horario + "." : ""}` : "Escríbenos desde Ajustes > Enviar opinión, por WhatsApp o por correo."); }
      }
      if (a.src) P("Fuentes: " + a.src.map(([t, u]) => `${t} (${u})`).join("; ") + ".");
    });
  });
  return B;
}
function ayManualBytes() {
  return pdfDocumento({ titulo: "Manual de usuario", subtitulo: `{{MARCA}} · ${typeof VERSION_APP === "object" ? VERSION_APP.nombre : ""}`, despacho: { nombre: "{{MARCA}}", colegio: "Software de sucesiones para despachos de abogados", localidad: "" }, ref: typeof VERSION_APP === "object" ? VERSION_APP.nombre : "", bloques: ayManualBloques() });
}
function ayManualPDF() {
  try { const n = pdfDescargar(`Manual de ${"{{MARCA}}"}`, ayManualBytes()); toast("Manual descargado"); return n; }
  catch (e) { console.error(e); toast("No se pudo generar el manual"); return null; }
}

// ═════════ Eventos propios (captura en document, como paleta.js) ═════════
async function ayCopiar(t) {
  try { await navigator.clipboard.writeText(t); toast("Datos copiados: pégalos en tu mensaje"); }
  catch (e) { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); toast("Datos copiados: pégalos en tu mensaje"); } catch (e2) { toast("No se pudo copiar"); } a.remove(); }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-ay]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const a = b.dataset.ay, v = b.dataset.ayV;
  if (a === "abrir") { if (AY.abierta) { ayCerrar(); return; } if (b.closest(".sheet") && typeof ui === "object" && ui.sheet) { ui.sheet = null; render(); } ayAbrir(); return; }
  if (a === "cerrar") { ayCerrar(); return; }
  if (a === "art") { if (AY.abierta) ayVer(v); else ayAbrir(v); return; }
  if (a === "sec") { if (!AY.abierta) { ayAbrir(v); return; } AY.pila.push({ vista: AY.vista, art: AY.art, sec: AY.sec, q: AY.q }); AY.vista = "sec"; AY.sec = v; AY.q = ""; AY.root.querySelector(".ay-in").value = ""; ayPintar(); return; }
  if (a === "inicio") { AY.pila = []; AY.vista = "inicio"; AY.q = ""; AY.root.querySelector(".ay-in").value = ""; ayPintar(); return; }
  if (a === "volver") { ayVolver(); return; }
  if (a === "ir") { ayIr(v); return; }
  if (a === "pdf") { ayManualPDF(); return; }
  if (a === "copiarSoporte") { ayCopiar(ayDatosSoporte()); return; }
  if (a === "instalar") { const ev = AY_BIP; if (!ev) { toast("Sigue los pasos de tu navegador"); return; } try { ev.prompt(); ev.userChoice && ev.userChoice.then((r) => { if (r && r.outcome === "accepted") { AY_BIP = null; toast("{{MARCA}} instalado"); } if (AY.abierta) ayPintar(false); }); } catch (err) { toast("Sigue los pasos de tu navegador"); } return; }
  if (a === "pasosOcultar") { DB.ay = Object.assign({}, DB.ay, { pasosOcultos: hoy() }); guardar(); render(); toast("Lista oculta. Está siempre en Ayuda › Empezar"); return; }
}, true);
document.addEventListener("keydown", (e) => {
  if (AY.abierta) {
    const otra = (typeof pkAbierta === "function" && pkAbierta()) || document.querySelector(".sg-modal,.sg-lock");
    if (e.key === "Escape" && !otra) { e.preventDefault(); e.stopPropagation(); if (AY.q && document.activeElement === AY.root.querySelector(".ay-in")) { AY.q = ""; AY.root.querySelector(".ay-in").value = ""; ayPintar(); } else ayCerrar(); return; }
    if (e.key === "Backspace" && !otra && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "") && (AY.vista !== "inicio" || AY.pila.length)) { e.preventDefault(); e.stopPropagation(); ayVolver(); return; }
    return;
  }
  if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target, campo = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  if (campo || document.querySelector(".bv-over,.rn-over,.sg-lock,.sg-modal") || (typeof pkAbierta === "function" && pkAbierta())) return;
  e.preventDefault(); ayAbrir();
}, true);
