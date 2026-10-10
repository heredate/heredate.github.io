// ───────────────────── Guías interactivas (prefijo gu) ─────────────────────
// Recorridos paso a paso sobre la pantalla real: se ilumina el elemento del que se habla, se explica en dos frases y el usuario
// hace la acción él mismo (la guía avanza sola al detectarla) o pulsa «Hazlo por mí». Nunca bloquea: todo sigue siendo pulsable.
// API: guAbrir(id) · guCerrar() · guLista() → [{id, t, d, min, pasos}] · guActiva() · guHTMLLista(cls) para la ayuda y la portada.
// Eventos: [data-gu="abrir"][data-gu-v="<id>"] en cualquier sitio de la página (también dentro del centro de ayuda).
// Cada paso: { t, txt, sel (CSS del elemento a iluminar; si no aparece, la tarjeta sale centrada), ir() (navegar antes de mostrarlo),
//   hecho() (true cuando el usuario ya lo ha hecho → avanza solo), hacer() (lo hace por él), accion (texto del botón), movil (sel alternativo en móvil) }
const GU = { id: null, i: 0, el: null, raf: 0, t0: 0, hechoDesde: 0, ultimoSel: "" };
const guMovil = () => window.matchMedia("(max-width:1023px)").matches;
const guExp = () => (ui.vista === "exp" ? exp() : null);
const guHayExp = () => (DB.expedientes || []).length > 0;
const guPrimerExp = () => { const L = (DB.expedientes || []).filter((x) => calcular(x)); return L[0] || (DB.expedientes || [])[0] || null; };
// Si no hay ningún expediente con el que enseñar la pantalla, se carga el despacho de ejemplo (se quita con «Salir», arriba)
function guAsegurarExp() {
  if (guHayExp()) return true;
  if (typeof demoCargar === "function") { demoCargar(); return guHayExp(); }
  return false;
}
function guIrExp(sec, extra) {
  if (!guAsegurarExp()) return;
  const x = guExp() || guPrimerExp(); if (!x) return;
  const v = { vista: "exp", id: x.id, sec, sheet: null, snMas: false, ...(extra || {}) };
  if (ui.vista !== "exp" || ui.id !== x.id || ui.sec !== sec || ui.sheet) go(v); else render();
}
const guEnSec = (s) => ui.vista === "exp" && ui.sec === s && !ui.sheet;

const GU_GUIAS = [
  { id: "pantalla", t: "Conoce la pantalla", d: "Dónde está cada cosa: expedientes, agenda, ayuda y ajustes.", min: 2, pasos: [
    { t: "Esto es Hereda+", txt: "A la izquierda, la barra con lo que vas a usar cada día. A la derecha, el contenido. Vamos a recorrer la barra en un minuto; puedes salir cuando quieras con la X.", sel: ".side", movil: ".topbar", ir: () => { if (ui.vista !== "inicio") go({ vista: "inicio", sheet: null }); } },
    { t: "Nuevo expediente", txt: "Cada herencia es un expediente. Este botón abre un asistente que pregunta, por orden, por el encargo, el fallecido, la familia y los bienes. Unos diez minutos; lo que falte se completa después.", sel: '.side [data-act="nuevo"]', movil: '[data-act="nuevo"]' },
    { t: "Mi día", txt: "Lo que vence hoy y esta semana, lo que está parado esperando a un banco o a la familia, y qué hacer con cada cosa. Es la pantalla para empezar la mañana.", sel: '.side [data-act="rdMiDia"]', movil: '[data-act="rdMiDia"]' },
    { t: "Expedientes", txt: "Todos los expedientes del despacho en una tabla: cliente, fase, responsable y próximo vencimiento. Se puede ver por fases o por plazos en el mapa.", sel: '.side [data-act="home"]' },
    { t: "Agenda", txt: "Todos los plazos de todos los expedientes, en lista o por meses. Se pasan a tu calendario (Outlook, Google, Apple) con un botón.", sel: '.side [data-act="agenda"]' },
    { t: "Rentabilidad y Normativa", txt: "Abajo, dos herramientas del despacho: horas y euros por expediente, y la biblioteca de leyes y ordenanzas que usa el programa, con su estado de verificación.", sel: '.side [data-tmp="rent"]' },
    { t: "Ayuda", txt: "Guías como esta, artículos cortos sobre cada pantalla, el manual en PDF y el contacto con soporte. También con el botón «?» de cada expediente.", sel: '.side [data-ay="abrir"]', movil: '[data-ay="abrir"]' },
    { t: "Despacho y ajustes", txt: "Nombre y datos del despacho, equipo, copias de seguridad, licencia y apariencia. Lo veremos en otra guía.", sel: '.side [data-act="ajustes"]' },
    { t: "Buscar", txt: "Escribe el nombre de un cliente, una pantalla o una acción y aparece. Es la forma más rápida de ir a cualquier sitio. Fin de la guía: la siguiente te enseña a abrir tu primer expediente.", sel: ".side .pk-btn", movil: '[data-act="menuBuscar"]' },
  ] },
  { id: "primer", t: "Tu primer expediente", d: "Abre una herencia paso a paso, con el asistente, hasta ver el cálculo.", min: 8, pasos: [
    { t: "Empezamos por el botón", txt: "Pulsa «Nuevo expediente». Si prefieres, puedo pulsarlo yo.", sel: '.side [data-act="nuevo"]', movil: '[data-act="nuevo"]', ir: () => { if (ui.vista !== "inicio" && ui.vista !== "asist") go({ vista: "inicio", sheet: null }); }, hecho: () => ui.vista === "asist", hacer: () => { if (ui.vista !== "asist") pkClick({ act: "nuevo" }); }, accion: "Hazlo por mí" },
    { t: "El asistente", txt: "Doce pantallas cortas; en cada una, una sola pregunta. «Empezar» para seguir. Si quieres que la familia rellene los datos desde su móvil, aquí está «Empezar así».", sel: ".wiz .inner", hecho: () => ui.vista === "asist" && ui.paso >= 1, hacer: () => pkClick({ act: "siguiente" }), accion: "Siguiente" },
    { t: "El encargo", txt: "Quién te encarga el asunto (normalmente un heredero), la referencia del expediente, que se propone sola, y el abogado responsable. Rellena el cliente y pulsa «Continuar».", sel: "#f-cli", hecho: () => ui.vista === "asist" && ui.paso >= 2, hacer: () => pkClick({ act: "siguiente" }), accion: "Siguiente" },
    { t: "El fallecido", txt: "Su nombre aparecerá en los escritos. Es opcional: si no lo sabes aún, sigue.", sel: "#f-nombre", hecho: () => ui.vista === "asist" && ui.paso >= 3, hacer: () => pkClick({ act: "siguiente" }), accion: "Siguiente" },
    { t: "La fecha", txt: "La más importante: desde ella se cuentan los seis meses del impuesto y se aplica la ley vigente ese día. Escríbela o elígela en el calendario.", sel: "#f-fecha", hecho: () => ui.vista === "asist" && ui.paso >= 4, hacer: () => { if (ui.borrador && !ui.borrador.fecha) { ui.borrador.fecha = hoy(); } pkClick({ act: "siguiente" }); }, accion: "Siguiente" },
    { t: "Dónde vivía", txt: "La comunidad donde vivió más días en los últimos cinco años decide qué Impuesto sobre Sucesiones se aplica. Escribe para buscarla y elígela.", sel: "#f-buscar", hecho: () => ui.vista === "asist" && ui.paso >= 5, hacer: () => { if (ui.borrador && !ui.borrador.ccaa) ui.borrador.ccaa = "AND"; pkClick({ act: "siguiente" }); }, accion: "Siguiente" },
    { t: "Estado civil y testamento", txt: "Dos preguntas de una sola respuesta. En gananciales, la mitad de lo común es del viudo y no entra en la herencia; sin testamento, el reparto legal se calcula solo.", sel: ".wiz .group", hecho: () => ui.vista === "asist" && ui.paso >= 7, hacer: () => { const b = ui.borrador; if (ui.paso === 5) { if (b && !b.civil) b.civil = "soltero"; pkClick({ act: "siguiente" }); } if (ui.paso === 6) { if (b && !b.testamento) b.testamento = "no"; pkClick({ act: "siguiente" }); } }, accion: "Siguiente" },
    { t: "La familia", txt: "Añade a cada persona con su parentesco y su edad (la edad cambia el valor del usufructo). Una basta para empezar. Después, «Continuar».", sel: ".wiz .addrow, .wiz .group", hecho: () => ui.vista === "asist" && ui.paso >= 8, hacer: () => { const b = ui.borrador; if (b && !(b.personas || []).length) nuevaPersona(b, "hijo"); const p = (b.personas || [])[0]; if (p && !p.nombre) { p.nombre = "Hijo o hija"; p.edad = p.edad || 45; } pkClick({ act: "siguiente" }); }, accion: "Siguiente" },
    { t: "Los bienes", txt: "Vivienda, cuentas, fondos, vehículos. Con un valor aproximado ya se calcula; los datos del catastro para la plusvalía se añaden después desde la ficha del inmueble.", sel: ".wiz .addrow, .wiz .group", hecho: () => ui.vista === "asist" && ui.paso >= 9, hacer: () => { const b = ui.borrador; if (b && !(b.bienes || []).length) { nuevoBien(b, "cuenta"); const q = b.bienes[0]; q.descripcion = "Cuenta corriente"; q.valor = 60000; } pkClick({ act: "siguiente" }); }, accion: "Siguiente" },
    { t: "Deudas y situaciones", txt: "Las deudas y los gastos de entierro se restan y bajan el impuesto. Las situaciones (autónomo, pensionista, alquileres, seguros) añaden o quitan trámites. Puedes pasar de largo.", sel: ".wiz .inner", hecho: () => ui.vista === "asist" && ui.paso >= 11, hacer: () => { if (ui.paso === 9) pkClick({ act: "siguiente" }); if (ui.paso === 10) pkClick({ act: "siguiente" }); }, accion: "Siguiente" },
    { t: "Listo", txt: "Ya está calculado: reparto, impuestos y trámites. Pulsa «Abrir el expediente».", sel: ".wiz .bottombar .btn", hecho: () => ui.vista === "exp", hacer: () => pkClick({ act: "terminar" }), accion: "Abrir el expediente" },
    { t: "Tu primer expediente", txt: "Esto es el Resumen: las cifras, el siguiente paso, quién hereda y qué hay que revisar. Todo lo que has tecleado se puede cambiar desde «Herederos y bienes». La guía «Un expediente por dentro» recorre cada pestaña.", sel: ".kpis", ir: () => { if (ui.vista === "exp" && ui.sec !== "resumen") go({ sec: "resumen" }); } },
  ] },
  { id: "expediente", t: "Un expediente por dentro", d: "Las seis pestañas y el menú «Más», con un caso de ejemplo.", min: 4, pasos: [
    { t: "La cabecera", txt: "Nombre del cliente, de quién es la herencia, fecha del fallecimiento y herederos. A la derecha, el responsable y dos botones: «Para la familia» (reunión y carpeta) e «Informe en PDF».", sel: ".headrow", ir: () => guIrExp("resumen") },
    { t: "La fase del encargo", txt: "Seis fases, del encargo al archivo. Pulsa una para cambiarla; la tabla de Expedientes y Mi día la usan para ordenar el trabajo.", sel: ".stepper" },
    { t: "Resumen", txt: "Las cifras del caso (caudal, impuestos, herederos, deudas y gastos, trámites), el siguiente paso, quién hereda y las notas a revisar. Con «Ver todo el resumen» aparecen el diagnóstico, el cronograma, la estrategia fiscal, los fondos y la actividad.", sel: ".kpis" },
    { t: "Herederos y bienes", txt: "El árbol de la familia y la lista de bienes. Pulsa esta pestaña para verla.", sel: '.secnav [data-sec="herencia"]', movil: '.tabbar [data-act="mas"]', hecho: () => guEnSec("herencia"), hacer: () => guIrExp("herencia"), accion: "Abrir" },
    { t: "Toca a una persona o a un bien", txt: "Cada tarjeta se abre en una ficha: parentesco, edad, renuncia, porcentaje del testamento; en los bienes, valor, titularidad, municipio y datos del catastro. Al cerrar la ficha se recalcula todo.", sel: ".card.vc", ir: () => guIrExp("herencia") },
    { t: "Impuestos", txt: "Sucesiones por heredero, paso a paso y con el artículo de cada regla; la plusvalía de cada inmueble con su fórmula. Pulsa la pestaña.", sel: '.secnav [data-sec="impuestos"]', movil: '.tabbar [data-sec="impuestos"]', hecho: () => guEnSec("impuestos"), hacer: () => guIrExp("impuestos"), accion: "Abrir" },
    { t: "Un heredero cada vez", txt: "Arriba, un botón por heredero: al pulsarlo cambia la explicación de abajo. Cada paso dice la cifra, la norma y si está verificada.", sel: ".hpills, .sr-sec", ir: () => guIrExp("impuestos") },
    { t: "Partición", txt: "Seis pasos: inventario, masa, cuotas, cuadro de adjudicaciones, impuestos por persona y liquidación con cuaderno. Aquí decides a quién va cada bien.", sel: '.secnav [data-sec="particion"]', movil: '.tabbar [data-sec="particion"]', hecho: () => guEnSec("particion"), hacer: () => guIrExp("particion"), accion: "Abrir" },
    { t: "Trámites", txt: "Todo lo que hay que hacer, ante quién y hasta cuándo, agrupado por fases. Se marcan como hechos, en curso o no aplica; el cronograma los dibuja en el tiempo.", sel: '.secnav [data-sec="tramites"]', movil: '.tabbar [data-sec="tramites"]', hecho: () => guEnSec("tramites"), hacer: () => guIrExp("tramites"), accion: "Abrir" },
    { t: "Documentos", txt: "Dos partes: el archivo del expediente (DNI, defunción, escrituras, lo que recibes) y los escritos que genera el programa con tu membrete: cartas a bancos, cuaderno particional, nota para la notaría.", sel: '.secnav [data-sec="documentos"]', movil: '.tabbar [data-act="mas"]', hecho: () => guEnSec("documentos"), hacer: () => guIrExp("documentos"), accion: "Abrir" },
    { t: "Más", txt: "Las herramientas de apoyo: Diagnóstico, Estrategia fiscal, Dos herencias, Bancos y notaría, Listo para firmar, Normativa y Encargo. Pulsa «Más» para verlas.", sel: '[data-act="snMas"]', movil: '.tabbar [data-act="mas"]', hecho: () => !!ui.snMas || (ui.sheet && ui.sheet.tipo === "mas"), hacer: () => { ui.snMas = true; render(); }, accion: "Abrir el menú" },
    { t: "Fin del recorrido", txt: "Cada pestaña tiene su propia guía corta en Ayuda › Guías. Y en cualquier pantalla, el botón «?» explica lo que tienes delante.", sel: '[data-ay="abrir"]', ir: () => { ui.snMas = false; if (ui.sheet && ui.sheet.tipo === "mas") ui.sheet = null; render(); } },
  ] },
  { id: "herencia", t: "Herederos y bienes", d: "Añadir personas y bienes, renuncias, municipio y datos del catastro.", min: 3, pasos: [
    { t: "El árbol familiar", txt: "El fallecido arriba; debajo, cada heredero con su parte y lo que paga. Las tarjetas se pulsan.", sel: ".card.vc", ir: () => guIrExp("herencia") },
    { t: "Añadir una persona", txt: "Cónyuge, hijos, nietos, padres, hermanos… Al añadirla se recalcula el reparto legal o el del testamento.", sel: '[data-act="addPersona"]' },
    { t: "La ficha de la persona", txt: "Parentesco, edad, si renuncia, porcentaje del testamento, discapacidad, convivencia (importa para la vivienda habitual) y, para los escritos, NIF, domicilio y tratamiento. Pulsa una persona para abrirla.", sel: ".card.vc", hecho: () => ui.sheet && ui.sheet.tipo === "persona", hacer: () => { const x = guExp(); const p = x && (x.personas || [])[0]; if (p) { ui.sheet = { tipo: "persona", id: p.id }; render(); } }, accion: "Abrir una ficha" },
    { t: "Cerrar y seguir", txt: "«Hecho» cierra la ficha y guarda. Ahora los bienes.", sel: ".sheet header .tbtn", hecho: () => !ui.sheet, hacer: () => { ui.sheet = null; render(); }, accion: "Cerrar la ficha" },
    { t: "Añadir un bien", txt: "Vivienda, otro inmueble, cuenta, fondos, vehículo, empresa, otro. En inmuebles se pide el municipio: con él sale la ordenanza de plusvalía.", sel: '[data-act="addBien"]', ir: () => guIrExp("herencia") },
    { t: "La ficha del inmueble", txt: "Valor declarado y de referencia, titularidad (privativo, ganancial, proindiviso), municipio entre los 8.132 de España, valor catastral total y del suelo, fecha y precio de compra: con eso la plusvalía sale exacta. Pulsa un bien para verla.", sel: ".card.vc, .group", hecho: () => ui.sheet && ui.sheet.tipo === "bien", hacer: () => { const x = guExp(); const b = x && (x.bienes || []).find((q) => q.tipo === "vivienda" || q.tipo === "inmueble") || (x && (x.bienes || [])[0]); if (b) { ui.sheet = { tipo: "bien", id: b.id }; render(); } }, accion: "Abrir una ficha" },
    { t: "Listo", txt: "Cierra con «Hecho». Todo lo que cambies aquí se refleja al momento en Impuestos, Partición y Trámites.", sel: ".sheet header .tbtn", hecho: () => !ui.sheet, hacer: () => { ui.sheet = null; render(); }, accion: "Cerrar la ficha" },
  ] },
  { id: "impuestos", t: "Impuestos, paso a paso", d: "Sucesiones por heredero, plusvalía por inmueble, opciones del cálculo e informe.", min: 3, pasos: [
    { t: "Las cuatro cifras", txt: "Sucesiones, plusvalía, total y ahorro fiscal identificado. Pulsa una para ir al detalle.", sel: ".kpis", ir: () => guIrExp("impuestos") },
    { t: "Informe de cálculo", txt: "Un PDF con tu membrete: masa, reparto, Sucesiones paso a paso, plusvalía, partición y totales. Para el cliente o para el expediente.", sel: '[data-act="informePdf"]' },
    { t: "Un heredero cada vez", txt: "Pulsa un heredero: debajo se explica su cálculo en lenguaje llano y luego paso a paso, con la cifra y el artículo. «Verificado» significa cotejado con la norma oficial; «En verificación», pendiente de cotejo.", sel: ".hpills, .sr-sec" },
    { t: "La plusvalía", txt: "Para cada inmueble con datos catastrales: suelo × coeficiente, método objetivo frente a real (se aplica el menor), tipo del municipio y bonificación por heredero. Si falta la ordenanza, se calcula el máximo posible y se avisa.", sel: ".fcard, .kpi.plu, .kpis" },
    { t: "Qué revisar", txt: "Las notas en gris bajo cada cálculo son avisos para el abogado: criterios discutidos, datos que faltan, normas en verificación. El programa calcula; la decisión es tuya.", sel: ".caption" },
  ] },
  { id: "particion", t: "La partición", d: "Del inventario al cuaderno particional en seis pasos.", min: 3, pasos: [
    { t: "Seis pasos", txt: "Inventario, masa, cuotas, cuadro, impuestos por persona y liquidación. Se recorren con esta barra o con los botones de abajo.", sel: ".pnav", ir: () => guIrExp("particion") },
    { t: "Adjudicar cada bien", txt: "En el cuadro, elige a quién va cada bien. El programa recalcula el haber de cada uno, los excesos y las compensaciones en dinero, y la plusvalía que paga cada adjudicatario.", sel: "select[data-padj], .pfoot", hecho: () => !!document.querySelector("select[data-padj]"), hacer: () => pkClick({ pstep: 3 }), accion: "Ir al cuadro" },
    { t: "Lotes y proindiviso", txt: "Dos atajos: proponer lotes equilibrados automáticamente, o dejarlo todo en proindiviso por cuotas.", sel: '[data-act="pLotes"], [data-act="pIndiviso"], .pfoot' },
    { t: "Liquidación y cuaderno", txt: "El último paso resume lo que recibe y paga cada uno y genera el cuaderno particional y el recibí, listos para la notaría, desde Documentos › Escritos.", sel: ".pfoot" },
  ] },
  { id: "tramites", t: "Trámites, plazos y agenda", d: "Marcar trámites, ver el cronograma y pasar los plazos a tu calendario.", min: 3, pasos: [
    { t: "Los trámites del caso", txt: "De los 183 del catálogo, solo los que aplican a esta herencia, por fases. Cada uno con su plazo, el organismo y enlaces a la sede oficial.", sel: ".tram-head", ir: () => guIrExp("tramites", { tv: "lista" }) },
    { t: "Ajustar al caso", txt: "Si el fallecido era autónomo, pensionista, tenía alquileres o seguros… márcalo aquí y aparecen o desaparecen trámites.", sel: '[data-act="situ"]' },
    { t: "Marcar y abrir", txt: "El círculo de la izquierda marca hecho, en curso o no aplica. Pulsando el título se abre la ficha del trámite: qué es, cómo se hace, documentos y enlaces.", sel: ".phase-h + .group .row" },
    { t: "Cronograma", txt: "Los mismos trámites en el tiempo, con la línea de hoy: se ve de un vistazo qué vence y qué va tarde.", sel: '[data-tv="crono"]', hecho: () => ui.tv === "crono", hacer: () => go({ tv: "crono" }), accion: "Ver el cronograma" },
    { t: "La agenda", txt: "Fuera del expediente, la Agenda junta los plazos de todos. En lista o por meses. Vamos a verla.", sel: '.side [data-act="agenda"]', movil: '[data-act="menuApp"]', hecho: () => ui.vista === "agenda", hacer: () => go({ vista: "agenda", sheet: null }), accion: "Abrir la agenda" },
    { t: "A tu calendario", txt: "Este botón descarga un archivo que Outlook, Google Calendar y el Calendario de Apple abren directamente: cada plazo con un aviso una semana antes.", sel: '.page [data-act="ics"]', ir: () => { if (ui.vista !== "agenda") go({ vista: "agenda", sheet: null }); } },
  ] },
  { id: "familia", t: "Pedir los datos a la familia", d: "Un cuestionario para el móvil que rellena la familia y tú solo revisas.", min: 2, pasos: [
    { t: "La franja de la familia", txt: "En el Resumen de cada expediente. Tres pasos: tú envías, la familia rellena, tú revisas. No hace falta que instalen nada.", sel: ".famcard", ir: () => guIrExp("resumen") },
    { t: "Enviar", txt: "Por WhatsApp o por correo, con tu nombre y el del despacho. La familia abre el enlace en el móvil y responde: herederos, bienes, deudas y qué documentos tienen.", sel: '[data-act="famWa"], [data-act="familia"]' },
    { t: "Lo que devuelven", txt: "Un archivo que importas en el expediente: rellena lo que falte y marca lo aportado por la familia como «Para revisar». Nada se sobrescribe sin que lo veas.", sel: '[data-act="famFile"], [data-act="familia"]' },
    { t: "Reunión y carpeta", txt: "Con «Para la familia» tienes el modo reunión a pantalla completa (para explicar el reparto en el despacho) y una carpeta para el móvil de cada heredero con sus cifras y documentos.", sel: '[data-act="paraFamilia"]' },
  ] },
  { id: "documentos", t: "Documentos y escritos", d: "Archivo del expediente, escritos con membrete y paquete para la notaría.", min: 2, pasos: [
    { t: "Archivo y Escritos", txt: "Dos pestañas. Archivo: lo que recibes (DNI, defunción, testamento, bancos, inmuebles), que se clasifica solo por el nombre. Escritos: lo que genera el programa.", sel: '[data-dsub="escritos"]', ir: () => guIrExp("documentos", { dsub: "archivo" }) },
    { t: "Lo que hace falta", txt: "La lista de documentos que exige este caso. Al marcar uno como recibido, el trámite correspondiente se da por hecho.", sel: "[data-docrec]" },
    { t: "Los escritos", txt: "Carta a cada banco, solicitud de certificados, hoja de encargo, cuaderno particional, nota para la notaría, liquidación con recibí. Cada uno se abre, se revisa y se descarga en PDF con tu membrete.", sel: '[data-dsub="escritos"]', hecho: () => ui.dsub === "escritos", hacer: () => go({ dsub: "escritos" }), accion: "Ver los escritos" },
    { t: "Listo para firmar", txt: "En «Más» › Listo para firmar: comprueba NIF, catastro, títulos y cuadre antes de la notaría, y prepara el paquete notarial. Fin de la guía.", sel: '[data-act="snMas"]', movil: '.tabbar [data-act="mas"]' },
  ] },
  { id: "leer", t: "Cargar un expediente desde los documentos", d: "Sube el certificado de defunción, el testamento, las notas simples… y revisa lo que el programa propone.", min: 3, pasos: [
    { t: "Desde documentos", txt: "En la portada, «Desde documentos» crea un expediente a partir de los PDF o fotos que arrastres: defunción, últimas voluntades, seguros, testamento, notas simples, Catastro o IBI, DNI, certificados bancarios y escrituras. Pulsa para abrirlo.", sel: '[data-act="lecNuevo"]', ir: () => go({ vista: "inicio", sheet: null, snMas: false }), hecho: () => ui.sheet && ui.sheet.tipo === "lecNuevo", hacer: () => { ui.sheet = { tipo: "lecNuevo" }; render(); }, accion: "Abrir" },
    { t: "Arrastra o elige", txt: "Suelta aquí todos los documentos que tengas, de una vez. Un PDF con texto se lee al instante; un escaneo o una foto se reconoce por imagen en este ordenador. Nada se envía fuera.", sel: "input[data-lecnuevo]" },
    { t: "Revisa las propuestas", txt: "Lo leído aparece por grupos: causante, testamento, personas, inmuebles, cuentas, deudas y seguros. Cada línea dice de qué documento sale. Lo dudoso o lo que choca con un dato que ya existía va sin marcar.", sel: ".lec-sheet .body", hecho: () => !!(typeof LEC === "object" && LEC.resultado), ir: () => {} },
    { t: "Cargar lo marcado", txt: "Con «Cargar lo marcado» los datos entran en el expediente señalados como «leído de documento». Los documentos quedan además archivados en Documentos › Archivo. Después puedes añadir más: cada documento que subas dentro del expediente se lee y propone solo lo nuevo.", sel: '[data-act="lecAplicar"], .lec-sheet .drop' },
    { t: "Dentro del expediente", txt: "En Herederos y bienes, cada persona o bien cargado lleva la marca «Leído de documento» hasta que lo revises. En el Resumen, la tarjeta «Leído de los documentos» guarda el DNI del causante, el notario y la fecha del testamento y los seguros. Fin de la guía.", sel: '[data-sec="herencia"]', ir: () => guIrExp("herencia") },
  ] },
  { id: "ajustes", t: "Copias de seguridad, licencia y ajustes", d: "Lo que conviene dejar hecho el primer día.", min: 2, pasos: [
    { t: "Despacho y ajustes", txt: "Aquí está todo lo del despacho. Pulsa para abrirlo.", sel: '.side [data-act="ajustes"]', movil: '[data-act="menuApp"]', hecho: () => ui.sheet && ui.sheet.tipo === "ajustes", hacer: () => { ui.sheet = { tipo: "ajustes" }; render(); }, accion: "Abrir ajustes" },
    { t: "Datos del despacho", txt: "Nombre, colegio, localidad, teléfono, correo y dirección: salen en el membrete de los escritos, en las cartas a bancos y en la carpeta de la familia.", sel: "#a-n" },
    { t: "Copia automática", txt: "Lo más importante del primer día: elige una carpeta (OneDrive, Dropbox o el servidor del despacho) y cada día se guarda una copia completa fuera del navegador. Sin esto, si se borran los datos del navegador se pierde el trabajo.", sel: '[data-sg="carpeta"]' },
    { t: "Descargar una copia", txt: "También puedes descargar una copia completa cuando quieras (expedientes, documentos, despacho y licencia) y restaurarla en otro ordenador.", sel: '[data-sg="descargar"]' },
    { t: "Licencia", txt: "La prueba dura 30 días. Con el código de licencia que te envía Hereda+, pégalo aquí y «Activar». Avisamos 30, 15, 7 y 1 día antes de que venza; si vence, nada se borra: queda en solo lectura.", sel: "#lic-seccion, #lic-codigo" },
    { t: "Equipo y apariencia", txt: "Añade a los demás abogados del despacho para asignar responsables, y elige tema claro u oscuro. Fin de la guía.", sel: "#a-yo, .sectitle" },
  ] },
];

function guLista() { return typeof FAMILIA_CUESTIONARIO !== "undefined" && !FAMILIA_CUESTIONARIO ? GU_GUIAS.filter((g) => g.id !== "familia") : GU_GUIAS; }
function guActiva() { return !!GU.id; }
function guGuia() { return GU_GUIAS.find((g) => g.id === GU.id); }
const guPasoAct = () => { const g = guGuia(); return g ? g.pasos[GU.i] : null; };
function guSel(p) { return guMovil() && p.movil ? p.movil : p.sel; }
function guObjetivo(p) {
  const sels = String(guSel(p) || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const s of sels) { try { const L = [...document.querySelectorAll(s)]; const n = L.find((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }); if (n) return n; } catch (e) { /* selector raro */ } }
  return null;
}
function guVisto(id) { DB.guias = DB.guias || {}; if (!DB.guias[id]) { DB.guias[id] = hoy(); guardar(); } }
function guAbrir(id, desde = 0) {
  const g = GU_GUIAS.find((q) => q.id === id); if (!g) return;
  if (GU.id) guCerrar(true);
  if (typeof ayCerrar === "function" && typeof ayAbierta === "function" && ayAbierta()) ayCerrar();
  if (typeof pkCerrar === "function" && typeof PK === "object" && PK.abierta) pkCerrar();
  if (typeof bvTipCerrar === "function") bvTipCerrar();
  GU.id = id; GU.i = Math.max(0, Math.min(desde, g.pasos.length - 1));
  guMontar();
  guIrPaso(GU.i);
}
function guCerrar(silencio) {
  cancelAnimationFrame(GU.raf); GU.raf = 0;
  if (GU.el) { GU.el.remove(); GU.el = null; }
  const id = GU.id; GU.id = null; GU.i = 0;
  document.documentElement.classList.remove("gu-on");
  if (id && !silencio) guVisto(id);
}
function guIrPaso(i) {
  const g = guGuia(); if (!g) return;
  if (i >= g.pasos.length) { const id = GU.id; guCerrar(); guVisto(id); toast("Guía terminada"); return; }
  GU.i = i; GU.t0 = performance.now(); GU.hechoDesde = 0; GU.ultimoSel = "";
  const p = g.pasos[i];
  try { if (p.ir) p.ir(); } catch (e) { console.error(e); }
  guPintar();
  const n = guObjetivo(p); if (n) guEnfocar(n);
  if (!GU.raf) GU.raf = requestAnimationFrame(guTick);
}
function guEnfocar(n) {
  try { const r = n.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 220) n.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* nada */ }
}
function guMontar() {
  if (GU.el) return;
  const el = document.createElement("div"); el.className = "gu"; el.innerHTML = `<svg class="gu-dim" aria-hidden="true"><defs><mask id="gu-mask"><rect width="100%" height="100%" fill="#fff"/><rect class="gu-hole" rx="12" fill="#000"/></mask></defs><rect width="100%" height="100%" mask="url(#gu-mask)"/></svg><div class="gu-ring" aria-hidden="true"></div><div class="gu-card" role="dialog" aria-live="polite"></div>`;
  document.body.appendChild(el); GU.el = el;
  document.documentElement.classList.add("gu-on");
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gu]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const k = b.dataset.gu;
    if (k === "cerrar") guCerrar();
    else if (k === "sig") guIrPaso(GU.i + 1);
    else if (k === "ant") guIrPaso(Math.max(0, GU.i - 1));
    else if (k === "hacer") { const p = guPasoAct(); try { if (p && p.hacer) p.hacer(); } catch (err) { console.error(err); } GU.hechoDesde = performance.now(); }
  });
}
function guPintar() {
  const g = guGuia(), p = guPasoAct(); if (!g || !p || !GU.el) return;
  const n = g.pasos.length, ult = GU.i === n - 1;
  const hecho = p.hecho ? (() => { try { return !!p.hecho(); } catch (e) { return false; } })() : false;
  GU.el.querySelector(".gu-card").innerHTML = `<div class="gu-k"><span>${esc(g.t)}</span><span class="num">${GU.i + 1} de ${n}</span><button type="button" class="gu-x" data-gu="cerrar" aria-label="Salir de la guía">✕</button></div>
    <b class="gu-t">${esc(p.t)}</b><p class="gu-p">${esc(p.txt)}</p>
    <div class="gu-f">${GU.i > 0 ? `<button type="button" class="gu-b" data-gu="ant">Atrás</button>` : ""}<span class="gu-sp"></span>${p.hacer && !hecho ? `<button type="button" class="gu-b" data-gu="hacer">${esc(p.accion || "Hazlo por mí")}</button>` : ""}<button type="button" class="gu-b gu-pri" data-gu="sig">${ult ? "Terminar" : "Siguiente"}</button></div>
    <div class="gu-bar"><i style="width:${Math.round(((GU.i + 1) / n) * 100)}%"></i></div>`;
}
function guTick() {
  GU.raf = 0;
  if (!GU.id || !GU.el) return;
  const p = guPasoAct(); if (!p) return;
  // ¿Lo ha hecho ya el usuario? → avanza solo tras un instante
  if (p.hecho) {
    let ok = false; try { ok = !!p.hecho(); } catch (e) { ok = false; }
    if (ok) { if (!GU.hechoDesde) { GU.hechoDesde = performance.now(); guPintar(); } else if (performance.now() - GU.hechoDesde > 900) { guIrPaso(GU.i + 1); return; } }
    else if (GU.hechoDesde) { GU.hechoDesde = 0; guPintar(); }
  }
  const n = guObjetivo(p);
  const hole = GU.el.querySelector(".gu-hole"), ring = GU.el.querySelector(".gu-ring"), card = GU.el.querySelector(".gu-card");
  const W = innerWidth, H = innerHeight, movil = guMovil();
  if (n) {
    const r = n.getBoundingClientRect(), pad = 6;
    const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad), w = Math.max(0, Math.min(W - x, r.right + pad - x)), h = Math.max(0, Math.min(H - y, r.bottom + pad - y));
    hole.setAttribute("x", x); hole.setAttribute("y", y); hole.setAttribute("width", w); hole.setAttribute("height", h);
    ring.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:1`;
    if (movil) { card.style.cssText = ""; card.classList.add("gu-abajo"); }
    else {
      card.classList.remove("gu-abajo");
      const cw = Math.min(380, W - 32), ch = card.offsetHeight || 220;
      let cx, cy;
      if (W - (x + w) >= cw + 28) { cx = x + w + 16; cy = Math.max(16, Math.min(H - ch - 16, y + h / 2 - ch / 2)); }        // a la derecha
      else if (H - (y + h) >= ch + 24) { cx = Math.max(16, Math.min(W - cw - 16, x + w / 2 - cw / 2)); cy = y + h + 14; }   // debajo
      else if (y >= ch + 24) { cx = Math.max(16, Math.min(W - cw - 16, x + w / 2 - cw / 2)); cy = y - ch - 14; }           // encima
      else if (x >= cw + 28) { cx = x - cw - 16; cy = Math.max(16, Math.min(H - ch - 16, y + h / 2 - ch / 2)); }           // a la izquierda
      else { cx = W / 2 - cw / 2; cy = H - ch - 24; }
      cy = Math.max(16, Math.min(H - ch - 16, cy)); // mientras el objetivo se desplaza a la vista, la tarjeta no sale de la pantalla
      card.style.cssText = `left:${Math.round(cx)}px;top:${Math.round(cy)}px;width:${cw}px`;
    }
    const sel = guSel(p); if (sel !== GU.ultimoSel) { GU.ultimoSel = sel; guEnfocar(n); }
  } else {
    hole.setAttribute("width", 0); hole.setAttribute("height", 0); ring.style.opacity = 0;
    if (movil) { card.style.cssText = ""; card.classList.add("gu-abajo"); }
    else { card.classList.remove("gu-abajo"); const cw = Math.min(420, W - 32), ch = card.offsetHeight || 220; card.style.cssText = `left:${Math.round(W / 2 - cw / 2)}px;top:${Math.round(H / 2 - ch / 2)}px;width:${cw}px`; }
    // Si el elemento no aparece en 4 s y el paso tiene «ir», se reintenta una vez
    if (p.ir && performance.now() - GU.t0 > 4000 && GU.t0 > 0) { GU.t0 = -1; try { p.ir(); } catch (e) { /* nada */ } }
  }
  GU.raf = requestAnimationFrame(guTick);
}
// Lista para la ayuda y la portada
function guHTMLLista(compacta) {
  const V = DB.guias || {};
  return `<div class="gu-lista ${compacta ? "gu-compacta" : ""}">${guLista().map((g) => `<button type="button" class="gu-item" data-gu="abrir" data-gu-v="${g.id}"><span class="gu-ic" aria-hidden="true">${V[g.id] ? "✓" : g.pasos.length}</span><span class="gu-it"><b>${esc(g.t)}</b><small>${esc(g.d)} · ${g.pasos.length} pasos · ${g.min} min${V[g.id] ? " · vista" : ""}</small></span><span class="gu-go">Empezar</span></button>`).join("")}</div>`;
}
// Botones [data-gu="abrir"] en cualquier parte (centro de ayuda, portada, bienvenida)
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest('[data-gu="abrir"]'); if (!b || (GU.el && GU.el.contains(b))) return;
  e.preventDefault(); e.stopPropagation();
  guAbrir(b.dataset.guV);
}, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && GU.id && !ui.sheet && !(typeof PK === "object" && PK.abierta)) { e.stopPropagation(); guCerrar(); } }, true);
