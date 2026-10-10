// ───────────────────── {{MARCA}} · compartir, exportar y versiones ─────────────────────
const VERSION_APP = { n: 17, nombre: "Versión 1.7", fecha: "2026-10-08" };
const NOVEDADES = [
  ["Nueva identidad: azul notarial", "La barra lateral, los botones principales, los títulos y las cifras pasan al azul notarial, con el petróleo como acento para lo activo y lo leído de los documentos, sobre papel marfil. El tema oscuro pasa a azul noche. Monograma H+ nuevo. El mismo color en la web, los PDF y los escritos."],
  ["El árbol familiar enseña el reparto", "Cada persona del árbol muestra su derecho (pleno dominio, usufructo o nuda propiedad), lo que recibe, lo que paga de Sucesiones y el bien que se le adjudica o se le lega."],
  ["Legados con usufructo del viudo", "Con un testamento de usufructo universal, la ficha del bien ya permite marcarlo como legado. El cuadro de partición con muchos herederos cabe en pantalla."],
  ["Despacho en red: varios ordenadores, los mismos expedientes", "En Despacho y ajustes › Despacho en red: los ordenadores del despacho comparten expedientes y documentos a través de una carpeta de OneDrive, Dropbox, Google Drive o del servidor, cifrada con contraseña si se quiere. Sin servidores de {{MARCA}}. Avisa si otra persona tiene abierto el mismo expediente y, si dos cambian el mismo dato, guarda las dos versiones y pregunta cuál se queda. En Chrome y Edge."],
  ["Escritos listos para la notaría", "Borrador de escritura de manifestación y aceptación de herencia, cuaderno particional completo (inventario, avalúo, liquidación, lotes y adjudicaciones con las cifras del cálculo), escritura de renuncia, solicitud de certificados (modelo 790), carta a la familia con lo que falta, cambio de titular en el Catastro (modelo 900D) y declaración de plusvalía. Los datos que faltan quedan marcados ⟦así⟧ y resaltados en el Word, que sale con estilos, tablas y membrete."],
  ["Herencias sin testamento en Aragón, Navarra y País Vasco", "Reparto con el derecho propio de cada vecindad civil: llamamientos, usufructo del viudo o de la pareja y bienes troncales, que se marcan en la ficha del bien. Legítimas forales revisadas."],
  ["Impuesto sobre Sucesiones al día en 2026", "Revisados los 22 territorios: corregida la bonificación del grupo III en Baleares y el tope de la reducción de Galicia; avisos nuevos para Galicia, Extremadura y la Comunitat Valenciana; plazos y recargos propios de los territorios forales."],
  ["Escáner más fiable", "Detecta mejor el papel sobre mesas claras, con poca luz o de noche; pide acercarse o alejarse; no dispara si el papel se mueve; libera la cámara al salir y explica cómo dar permiso en iPhone y Android."],
  ["Plusvalía: 19 municipios más", "Ordenanzas leídas en el boletín oficial de Castelldefels, Santa Coloma de Gramenet, Oleiros, Guadarrama, Villanueva de la Cañada, Las Torres de Cotillas y otros. Bonificaciones distintas según el parentesco."],
  ["Correcciones de la auditoría", "Testamentos «por partes iguales» leídos de documentos, nombres compuestos y apellidos con apóstrofo, legados leídos del testamento visibles en el cálculo y en los escritos, hoja del 650 con la reducción aplicada y trámites condicionales que ya no aparecen como críticos."],
  ["Escáner con la cámara", "Desde «Nuevo expediente desde documentos» o dentro del expediente: escanea con el móvil, la tableta o la webcam. Detecta los bordes del papel, lo endereza, mejora el contraste y junta varias páginas en un PDF que se archiva y se lee. Sin permiso de cámara, ofrece hacer o elegir fotos."],
  ["El lector abre casi cualquier archivo", "Fotos del iPhone (HEIC), TIFF de escáneres, Excel, OpenDocument, RTF, páginas web y correos (.eml) con sus adjuntos. Las fotos difíciles (torcidas, con sombra, con poco contraste) se leen mucho mejor: en el banco de pruebas, los datos clave recuperados pasan del 17 % al 94 %. Si llegan dos herencias mezcladas, avisa."],
  ["Plusvalía: más municipios y régimen foral", "Ordenanzas de la segunda ronda (Jerez con sus tramos de 2024, entre otras) y cálculo foral en Navarra, Bizkaia, Gipuzkoa y Álava. Donde la bonificación depende de algo que el programa no puede saber, lo explica y se indica a mano."],
  ["Vecindad civil y herencias sin testamento", "Cada expediente guarda la vecindad civil del causante. En Cataluña, Galicia y Mallorca-Menorca, el reparto sin testamento sigue su derecho propio (usufructo universal del cónyuge en Cataluña, entre otros)."],
  ["Plazos y recargos calculados con las fechas", "El plazo del impuesto sale de la fecha de fallecimiento y de la prórroga; si se presenta tarde, el recargo del artículo 27 de la Ley General Tributaria según los meses de retraso."],
  ["Más rápido y más seguro con muchos datos", "Con 200 expedientes, la cartera y Mi día abren unas tres veces más rápido; la app carga primero lo esencial y el resto cuando se usa. Si un archivo de copia llega dañado, se recupera lo que se puede y se dice qué falta. El botón Atrás del navegador funciona y el asistente guarda el borrador."],
  ["Diseño certificado", "Tipografía e identidad propias, transiciones suaves y accesibilidad comprobada: 0 infracciones de las normas WCAG 2.2 AA en 304 comprobaciones (pantallas claras y oscuras, escritorio y móvil)."],
  ["Diseño nuevo, de arriba abajo", "Un único sistema visual: cifras financieras tabulares, fechas y porcentajes con el mismo formato en toda la app, fichas de persona y de bien como panel lateral con secciones y validación al salir de cada campo (NIF, referencia catastral, porcentajes, edad), asistente con la lista de pasos, tablas que caben en cualquier pantalla, confirmación con explicación antes de borrar y estados vacíos que dicen qué hacer. La cabecera del expediente muestra el estado y el próximo vencimiento con su cuenta atrás."],
  ["El lector entiende 28 tipos de documento", "Además de los anteriores: datos fiscales de la AEAT, capitulaciones y certificado de matrimonio (régimen económico), certificado de nacimiento, facturas del funeral y de la última enfermedad (gastos deducibles), préstamos, arrendamientos, valores, planes de pensiones, participaciones sociales, fincas rústicas y documentos de Word. Del Catastro toma el valor de referencia como valor del inmueble, así que el expediente queda calculado al cargar los documentos."],
  ["Plusvalía: 161 ordenanzas más", "Se incorporan las ordenanzas de 161 municipios más (101 con el texto oficial leído), con su tipo, tipos por años, coeficientes propios y bonificaciones por herencia, incluidas las que dependen del valor catastral, del parentesco o de la vivienda. Cuando la bonificación depende de algo que el programa no puede saber (renta o vivienda del heredero) se explica y se puede indicar a mano. Sin valor del inmueble o sin valor de adquisición se aplica el método objetivo: nunca «no sujeto» por falta de datos."],
  ["Panel del despacho para el socio", "Cada persona del equipo tiene perfil (socio, abogado o administrativo). El socio ve el porcentaje de expedientes al día, la carga por persona, los expedientes en riesgo, el dinero (presupuestado, facturado, cobrado, por facturar) y el tiempo medio por fase."],
  ["Registro de cambios", "Quién cambió qué y cuándo, con el valor anterior y el nuevo, en porcentajes, renuncias, valores, adjudicaciones, fase, honorarios, fondos y estado de los documentos. En la Actividad del expediente y del despacho, con filtro y descarga."],
  ["Búsqueda global y tareas", "⌘K / Ctrl+K encuentra expedientes, personas (nombre o NIF), inmuebles (dirección o referencia catastral), cuentas (IBAN), documentos, trámites y tareas de toda la cartera. Tareas propias del despacho con responsable y fecha, que aparecen en Mi día. En la tabla de Expedientes, cambio de responsable o de fase de varios a la vez."],
  ["Qué hacer en cada expediente", "En el Resumen, una tarjeta con las acciones del expediente, calculadas con reglas (sin IA): lo crítico (plazos vencidos, datos y documentos que faltan), lo que vence esta semana y lo que está esperando a terceros. La cabecera resume el estado: críticas, plazos próximos, bloqueos o «Al día»."],
  ["Documentos con estado", "Cada documento del archivo pasa por recibido → por revisar → validado (o rechazado / obsoleto). Lo que lee el programa queda «por revisar» hasta que lo valides; filtros «Por revisar» y «Validados» en Documentos."],
  ["Dinero en Mi día", "Una línea con los honorarios presupuestados por facturar, lo facturado, las provisiones en caja y los expedientes sin presupuesto."],
  ["Traer la cartera desde Excel", "Despacho y ajustes › Datos › «Traer la cartera desde una hoja»: guarda tu Excel como CSV, súbelo, revisa lo que va a entrar y confirma. Plantilla descargable. Para empezar con las herencias que ya tienes abiertas sin teclearlas."],
  ["Más sobrio y más denso", "Cifras tabulares en toda la app, chips de estado con un solo lenguaje, foco visible con teclado, tablas con números alineados, barra lateral por grupos y menos aire en escritorio para que quepa el trabajo."],
  ["Nada se pierde al teclear", "Las fichas de personas y bienes, el asistente, el Encargo y los Ajustes guardan cada tecla: los datos se conservan aunque se pase de campo con Tab o se pulse enseguida Continuar o Hecho, y el primer clic siempre responde."],
  ["Plusvalía en los 8.132 municipios", "Con ordenanza incorporada se aplica la suya. En las 48 capitales y los 100 municipios de más de 50.000 habitantes, el tipo oficial que cada ayuntamiento comunica a Hacienda para 2026. En el resto, el máximo posible (30 %, coeficientes máximos, sin bonificación), con un clic para poner el tipo y la bonificación de su ordenanza. Probado en todos los municipios: la cifra nunca supera ese máximo."],
  ["Un solo coste fiscal", "Sucesiones, plusvalía y el impuesto del exceso de adjudicación salen igual en Resumen, Impuestos, Partición, Estrategia, carpeta y paquete de la notaría. Lo de riesgo alto pasa a «A valorar con el abogado»."],
  ["Contacto del despacho y tratamiento", "Teléfono, correo y dirección del despacho en Ajustes, en las cartas a bancos y notarías, la carpeta y el cuestionario de la familia; D. o D.ª, hijo o hija, abogado o abogada, según cada persona."],
  ["Datos más seguros", "Copia de seguridad completa (expedientes, documentos, despacho, equipo y licencia), copias automáticas, cifrado con contraseña y aviso antes del vencimiento de la licencia."],
  ["Centro de ayuda", "Guías paso a paso, manual en PDF y contacto con soporte desde el botón de ayuda o con Ctrl K. Respuesta en un día hábil."],
];
const esCopiaLocal = () => !window.claude;
async function enviarCopia() {
  // En la app publicada, las partes que se cargan aparte (partes.js) se meten dentro: la copia funciona sola, sin servidor
  const html = typeof heredaHTMLCompleto === "function" ? await heredaHTMLCompleto() : HTML_ORIGINAL;
  if (!html) { toast("No se pudo preparar la copia"); return; }
  descargar(`${"{{MARCA}}"} ${VERSION_APP.nombre.toLowerCase()}.html`, new Blob([html], { type: "text/html" }));
}
const aBase64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(null); r.readAsDataURL(blob); });
async function exportarExpediente(x) {
  if (!ARCH.listo) await archivoCargar();
  const docs = []; let tam = 0;
  for (const d of archivoDe(x.id)) { if (tam + d.tam > 20 * 1048576) break; const data = d._b ? await aBase64(d._b) : null; if (data) { docs.push({ nombre: d.nombre, tipo: d.tipo, tam: d.tam, fecha: d.fecha, cat: d.cat, tramiteId: d.tramiteId, data }); tam += d.tam; } }
  const nombre = `${x.despacho?.ref || "Expediente"} - ${nombreExp(x)}`.replace(/[\\/:*?"<>|]/g, "");
  // Sin la marca de la demostración: si no, el equipo que lo importa entraría en «Modo demostración» (H53)
  const { demo, ...limpio } = x;
  descargar(`${nombre}.hereda.json`, new Blob([JSON.stringify({ app: "hereda+", tipo: "expediente", version: VERSION_APP.n, exportado: new Date().toISOString(), deDemo: !!demo || undefined, despachoOrigen: DB.despacho?.nombre || "", expediente: limpio, documentos: docs })], { type: "application/json" }));
  anotar(x, `Expediente exportado${docs.length ? ` con ${plural(docs.length, "documento")}` : ""}`, "sistema"); guardar();
}
async function importarArchivo(txt, destino) {
  const noEs = () => toast("Este archivo no es de {{MARCA}}");
  let o; try { o = JSON.parse(txt); } catch { noEs(); return; }
  // null, [], {}, 123, "texto": nada que importar (M14; null tumbaba la importación sin mensaje)
  if (!o || typeof o !== "object" || Array.isArray(o)) { noEs(); return; }
  if (o.tipo === "familia") { recibirFamilia(o, destino); return; }
  if (o.tipo === "expediente") {
    const x = o.expediente;
    // Validar y sanear antes de que entre (C1): fechas imposibles, comunidad desconocida, listas rotas, parentescos o tipos desconocidos
    const P = typeof rbSanear === "function" ? rbSanear(x, "todo") : [];
    if (!x || P.some((p) => p.irreparable)) { toast("El expediente de este archivo está dañado y no se puede importar"); return; }
    cmpLimpiarImportado(x, o);
    if (P.length) { o._corregidos = P.map((p) => p.texto); anotar(x, "Al importar se corrigieron datos no válidos: " + o._corregidos.join("; "), "sistema"); }
    const loc = DB.expedientes.find((q) => q.id === x.id);
    if (loc) { cmpImportarModal(o, loc); return; }
    if (typeof licPuedeCrear === "function" && !licPuedeCrear()) { toast(licMotivoBloqueo()); return; }
    await cmpAnadirImportado(o, x); return;
  }
  if (!Array.isArray(o.expedientes)) { noEs(); return; }
  if (typeof licPuedeCrear === "function" && !licPuedeCrear()) { toast(licMotivoBloqueo()); return; }
  const L = o.expedientes; const ids = new Set(DB.expedientes.map((q) => q.id)); let n = 0;
  for (const q of L) if (q && typeof q === "object" && q.id && !ids.has(q.id)) { DB.expedientes.push(q); n++; }
  if (o.despacho && typeof o.despacho === "object" && !DB.despacho?.nombre) DB.despacho = o.despacho;
  const apartados = typeof rbAislar === "function" ? rbAislar() : 0;
  guardar(); render(); toast((n ? plural(n, "expediente restaurado", "expedientes restaurados") : "No había expedientes nuevos en la copia") + (apartados ? ` · ${apartados} con datos dañados, ${apartados === 1 ? "apartado" : "apartados"} para repararlos` : ""));
}
// Un expediente que llega de otro equipo: nunca entra como ficticio (H53) y su responsable debe existir en este despacho
function cmpLimpiarImportado(x, o) {
  const eraDemo = !!x.demo || !!(o && o.deDemo) || /^dm-/.test(String(x.id || ""));
  delete x.demo;
  if (eraDemo) { x.id = uid(); x.importadoDeDemo = true; }
  const D = despachoCfg();
  if (x.responsable && !D.abogados.some((a) => a.id === x.responsable)) { x.responsable = D.yo && D.abogados.some((a) => a.id === D.yo) ? D.yo : D.abogados[0].id; x._respAsignado = true; }
  return x;
}
const cmpDocsDe = (o) => (o.documentos || []).map((d) => { try { const b = atob(d.data.split(",")[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); const f = new File([u], d.nombre, { type: d.tipo }); return { f, d }; } catch { return null; } }).filter(Boolean);
async function cmpAnadirImportado(o, x, comoCopia) {
  if (comoCopia) { x.id = uid(); x.despacho = { ...(x.despacho || {}), ref: typeof rbRefUnica === "function" ? rbRefUnica(x.despacho?.ref || nuevaRef(), "-I") : (x.despacho?.ref || nuevaRef()) + "-I" }; }
  const resp = x._respAsignado; delete x._respAsignado;
  anotar(x, `Expediente importado${o.despachoOrigen && o.despachoOrigen !== DB.despacho?.nombre ? " de " + o.despachoOrigen : ""}${comoCopia ? " como copia" : ""}${resp ? "; responsable asignado en este despacho" : ""}`, "sistema"); DB.expedientes.unshift(x); guardar();
  const files = cmpDocsDe(o);
  for (const { f, d } of files) await archivoGuardar([f], x.id, d.tramiteId || "");
  go({ vista: "exp", id: x.id, sec: "resumen", sheet: null }); toast(`Expediente importado${comoCopia ? " como copia" : ""}${files.length ? ` con ${plural(files.length, "documento")}` : ""}${o._corregidos ? ` · ${plural(o._corregidos.length, "dato no válido corregido", "datos no válidos corregidos")} (ver la bitácora)` : ""}`);
}
// ── Importar una versión de un expediente que ya existe aquí: vista previa y elección (H09)
const CMP = { imp: null };
const cmpFecha = (x) => (typeof sgFecha === "function" ? sgFecha(x) : Date.parse(x.actualizado || "") || 0);
const cmpFechaTxt = (ms) => { if (!ms) return "sin fecha"; const d = new Date(ms); return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + ", " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); };
const CMP_CAMPOS = { nombre: "Causante", fecha: "Fecha de fallecimiento", ccaa: "Comunidad", civil: "Estado civil", testamento: "Testamento", personas: "Herederos y personas", bienes: "Bienes", deudas: "Deudas", gastos: "Gastos", tramites: "Trámites", situ: "Situaciones", fase: "Fase", despacho: "Encargo y datos del cliente", responsable: "Responsable", solicitudes: "Bancos y terceros", recordatorios: "Recordatorios", tiempos: "Tiempos", firma: "Firma", familia: "Datos de la familia", particion: "Partición", presentaciones: "Presentaciones y pagos", procedimientos: "Notificaciones de Hacienda", aplazamiento: "Aplazamiento", muniPlazos: "Municipio del calendario de plazos" };
function cmpDiferencias(a, b) {
  const sin = (k, v) => (["actualizado", "bitacora", "snap", "demo", "_respAsignado"].includes(k) ? undefined : v);
  const ks = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]), out = [];
  for (const k of ks) { if (sin(k, 1) === undefined) continue; if (JSON.stringify(a[k], sin) !== JSON.stringify(b[k], sin)) out.push(k); }
  return out;
}
function cmpImportarModal(o, loc) {
  const x = o.expediente, fr = cmpFecha(x), fl = cmpFecha(loc), dif = cmpDiferencias(loc, x);
  const docsNuevos = cmpDocsDe(o).filter(({ d }) => !(typeof ARCH === "object" ? ARCH.lista : []).some((q) => q.expId === loc.id && q.nombre === d.nombre && q.tam === d.tam)).length;
  CMP.imp = { o, locId: loc.id };
  const igual = !dif.length && !docsNuevos;
  const estado = igual ? "Las dos versiones son iguales: no hay nada que actualizar." : fr > fl ? "La versión recibida es más reciente que la tuya." : fr < fl ? "Atención: la versión recibida es más antigua que la tuya. Si actualizas, perderás los cambios posteriores." : "Las dos versiones tienen la misma fecha, pero el contenido es distinto.";
  const lista = dif.map((k) => CMP_CAMPOS[k] || k).filter((v, i, a) => a.indexOf(v) === i);
  const cuerpo = `<p class="sg-lead">Ya tienes este expediente${x.despacho?.ref ? ` (${esc(x.despacho.ref)})` : ""}: <b>${esc(nombreExp(loc))}</b>.</p>
    <div class="sg-prev"><div><span>Tu versión</span><b>${esc(cmpFechaTxt(fl))}</b></div><div><span>Versión recibida</span><b>${esc(cmpFechaTxt(fr))}</b></div>${o.exportado ? `<div><span>Exportada</span><b>${esc(cmpFechaTxt(Date.parse(o.exportado)))}</b></div>` : ""}${o.despachoOrigen ? `<div><span>Desde</span><b>${esc(o.despachoOrigen)}</b></div>` : ""}</div>
    <div class="infobar cmp-estado ${igual ? "" : fr < fl ? "warn" : "ok"}" role="status"><span>${esc(estado)}</span></div>
    ${lista.length || docsNuevos ? `<p class="cmp-dif"><b>Cambia:</b> ${esc([...lista, docsNuevos ? plural(docsNuevos, "documento nuevo", "documentos nuevos") : ""].filter(Boolean).join(", "))}.</p>` : ""}
    <div class="cmp-acts">${igual ? "" : `<button class="btn" data-cmp="actualizar">${fr < fl ? "Actualizar de todos modos" : "Actualizar con la versión recibida"}</button>`}<button class="btn gray" data-cmp="copia">Importar como copia</button><button class="btn gray" data-cmp="cancelar">${igual ? "Cerrar" : "Cancelar"}</button></div>
    <p class="group-foot">Al actualizar se conserva la bitácora de los dos equipos. Importar como copia crea un expediente nuevo con la referencia terminada en «-I».</p>`;
  if (typeof sgModal === "function") sgModal("Importar un expediente que ya tienes", cuerpo); else if (confirm(estado + "\n\n¿Actualizar con la versión recibida?")) cmpActualizar();
}
async function cmpActualizar() {
  const I0 = CMP.imp; if (!I0) return; CMP.imp = null;
  if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { if (typeof sgCerrarModal === "function") sgCerrarModal(); toast(licMotivoEdicion()); return; }
  const i = DB.expedientes.findIndex((q) => q.id === I0.locId); if (i < 0) return;
  const loc = DB.expedientes[i], x = I0.o.expediente, resp = x._respAsignado; delete x._respAsignado;
  // Bitácora: la unión de las dos, sin duplicados, la más reciente primero
  const vistos = new Set(), bit = [...(x.bitacora || []), ...(loc.bitacora || [])].filter((e) => { const k = e.t + "|" + e.texto; if (vistos.has(k)) return false; vistos.add(k); return true; }).sort((a, b) => String(b.t).localeCompare(String(a.t)));
  const nuevo = { ...x, id: loc.id, bitacora: bit }; if (resp) nuevo.responsable = loc.responsable || nuevo.responsable;
  anotar(nuevo, `Expediente actualizado con una versión importada${I0.o.despachoOrigen ? " de " + I0.o.despachoOrigen : ""} (${cmpFechaTxt(cmpFecha(x))})`, "sistema");
  DB.expedientes[i] = nuevo; guardar();
  if (typeof sgCerrarModal === "function") sgCerrarModal();
  const files = cmpDocsDe(I0.o).filter(({ d }) => !(typeof ARCH === "object" ? ARCH.lista : []).some((q) => q.expId === loc.id && q.nombre === d.nombre && q.tam === d.tam));
  for (const { f, d } of files) await archivoGuardar([f], loc.id, d.tramiteId || "");
  go({ vista: "exp", id: loc.id, sec: "resumen", sheet: null }); toast(`Expediente actualizado${files.length ? ` con ${plural(files.length, "documento nuevo", "documentos nuevos")}` : ""}`);
}
async function cmpComoCopia() {
  const I0 = CMP.imp; if (!I0) return; CMP.imp = null;
  if (typeof sgCerrarModal === "function") sgCerrarModal();
  if (typeof licPuedeCrear === "function" && !licPuedeCrear()) { toast(licMotivoBloqueo()); return; }
  await cmpAnadirImportado(I0.o, I0.o.expediente, true);
}
if (typeof document !== "undefined" && !window.__cmpOyente) {
  window.__cmpOyente = true;
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-cmp],[data-famx],[data-famrev]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.cmp === "actualizar") { cmpActualizar(); return; }
    if (b.dataset.cmp === "copia") { cmpComoCopia(); return; }
    if (b.dataset.cmp === "cancelar") { CMP.imp = null; if (typeof sgCerrarModal === "function") sgCerrarModal(); return; }
    if (b.dataset.famx) { famAccion(b.dataset.famx, b); return; }
    if (b.dataset.famrev) { famRevisado(b.dataset.famrev, b.dataset.v); return; }
  }, true);
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.dataset || !t.dataset.famk) return;
    const x = typeof exp === "function" ? exp() : null; if (!x) return;
    if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); t.value = x.despacho?.[t.dataset.famk] || ""; return; }
    x.despacho = x.despacho || {}; x.despacho[t.dataset.famk] = t.value.trim(); guardar(); render();
  }, true);
}
function imprimirDoc() { document.documentElement.classList.add("pdoc"); setTimeout(() => { window.print(); setTimeout(() => document.documentElement.classList.remove("pdoc"), 400); }, 60); }
function opinionTexto() {
  const g = (id) => (document.getElementById(id)?.value || "").trim();
  return `Opinión sobre {{MARCA}} (${VERSION_APP.nombre})\n\nValoración: ${ui.nota || "-"}/10\nPantalla: ${g("o-p") || "-"}\nQué esperaba: ${g("o-e") || "-"}\nQué pasó: ${g("o-q") || "-"}\nQué le falta para usarlo a diario: ${g("o-f") || "-"}`;
}
function sheetOpinion() {
  return sheetHTML("Tu opinión", `<p class="lead">Dos minutos. Lo que escribas va a quien te envió el programa, no se guarda en ningún servidor.</p>
    <div class="group"><div class="field"><label>Valoración general</label><div class="seg block" style="margin-top:8px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button data-nota="${n}" aria-pressed="${ui.nota === n}">${n}</button>`).join("")}</div></div>
    <div class="field"><label for="o-p">Pantalla o función</label><input id="o-p" placeholder="Ej.: Estrategia fiscal, cartera, plusvalía"></div>
    <div class="field"><label for="o-e">Qué esperabas</label><textarea id="o-e" rows="2"></textarea></div>
    <div class="field"><label for="o-q">Qué ocurrió</label><textarea id="o-q" rows="2"></textarea></div>
    <div class="field"><label for="o-f">Qué le falta para usarlo a diario</label><textarea id="o-f" rows="2"></textarea></div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn" data-act="opWa">Enviar por WhatsApp</button><button class="btn gray" data-act="opMail">Enviar por correo</button><button class="btn gray" data-act="opCopy">Copiar</button></div>`, "Cerrar");
}
function sheetNovedades() {
  return sheetHTML("Novedades", `<div class="detail-h"><div class="kicker">${esc(VERSION_APP.nombre)} · ${fechaLarga(VERSION_APP.fecha)}</div><h3>Qué hay de nuevo</h3></div>
    <div class="group" style="--inset:54px">${NOVEDADES.map(([t, d], i) => `<div class="row" style="align-items:flex-start"><span class="ico ${i < 2 ? "blue" : "q"}">${i < 2 ? I.law : I.tick}</span><span class="t"><b class="sb" style="font-size:15px">${esc(t)}</b><small style="line-height:1.45">${esc(d)}</small></span></div>`).join("")}</div>`, "Empezar");
}
function abrirExterno(url) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }

// ───────────────────── Datos de la familia ─────────────────────
// La familia rellena un cuestionario (familia/index.html) y devuelve un archivo .hereda.json de tipo "familia".
// Nada pasa por un servidor: el enlace solo lleva en el fragmento (#) el nombre, la referencia y el teléfono y el correo del despacho
// (d, r, t, e). Ningún dato de la familia ni del causante va en la dirección (Piloto 10).
const normTxt = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]+/g, " ").trim();
function muniKey(nombre) { const n = normTxt(nombre); if (!n) return ""; const m = MUNICIPIOS.find(([k, t]) => k !== "OTRO" && (normTxt(t) === n || normTxt(k) === n)); return m ? m[0] : ""; }
const hayWebPublica = () => /^https?:$/.test(location.protocol) && !window.claude;
// Raíz de la web publicada: la app vive en <raíz>/app/ (en Netlify la raíz es "", en GitHub Pages puede ser "/NombreDelRepositorio")
const WEB_BASE = location.pathname.replace(/\/app\/?[^/]*$/, "").replace(/\/$/, "");
const webURL = (ruta) => `${location.origin}${WEB_BASE}${ruta}`;
function familiaContactoDespacho() { const c = typeof despachoContacto === "function" ? despachoContacto() : {}; return { d: c.nombre || DB.despacho?.nombre || "", t: c.tel || "", e: c.email || "" }; }
function familiaParams(x) {
  const p = new URLSearchParams(), c = familiaContactoDespacho();
  if (c.d) p.set("d", c.d); if (x && x.despacho?.ref) p.set("r", x.despacho.ref); if (c.t) p.set("t", c.t); if (c.e) p.set("e", c.e);
  return p.toString();
}
// Enlace al cuestionario para documentos sin expediente concreto (carpeta, reunión): con despacho y referencia si la hay
const familiaEnlaceRef = (x) => familiaEnlace(x || {});
const familiaEnlace = (x) => hayWebPublica() ? `${webURL("/familia/")}#${familiaParams(x)}` : "";
function familiaMensaje(x) {
  const l = familiaEnlace(x);
  const c = familiaContactoDespacho();
  return `Hola. Para empezar con la herencia${x.nombre ? " de " + x.nombre : ""} necesitamos algunos datos de la familia. ${l ? "Puedes rellenarlos desde el móvil en este enlace (unos diez minutos):\n" + l : "Te adjunto un cuestionario: ábrelo, rellénalo y devuélvenos el archivo que genera."}\n\nAl terminar, el propio cuestionario te ayuda a enviárnoslo por WhatsApp o por correo. Gracias.${c.d ? "\n\n" + c.d : ""}${c.t || c.e ? "\n" + [c.t, c.e].filter(Boolean).join(" · ") : ""}`;
}
// Solo cuenta como enviado lo que sale por WhatsApp o por correo, o si el abogado lo marca (H51). Copiar el enlace o descargar
// el archivo solo se anota en la bitácora.
function marcarEnviado(x, como) {
  const real = !/copiad|descargad/i.test(String(como || ""));
  if (real && !x.familiaEnviado) x.familiaEnviado = hoy();
  if (!real) x.familiaPreparado = hoy();
  anotar(x, `Cuestionario para la familia ${como}`, "sistema"); guardar();
}
// Destinos con el contacto del cliente, si se conoce (H51: el correo ya no sale sin destinatario)
const familiaWaURL = (x) => { const t = typeof wgTelWa === "function" ? wgTelWa(x.despacho?.tel) : ""; return `https://wa.me/${t}?text=${encodeURIComponent(familiaMensaje(x))}`; };
const familiaMailURL = (x) => `mailto:${(() => { const e = String(x.despacho?.email || "").trim(); return /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(e) ? e : ""; })()}?subject=${encodeURIComponent("Datos para la herencia" + (x.nombre ? " de " + x.nombre : ""))}&body=${encodeURIComponent(familiaMensaje(x))}`;
function famAccion(a) {
  const x = typeof exp === "function" ? exp() : null; if (!x) return;
  if (a === "marcar") { x.familiaEnviado = hoy(); anotar(x, "Cuestionario marcado como enviado a la familia", "sistema"); guardar(); render(); toast("Marcado como enviado"); return; }
  if (a === "desmarcar") { delete x.familiaEnviado; anotar(x, "Cuestionario: se quita la marca de enviado", "sistema"); guardar(); render(); return; }
}
function descargarCuestionario(x) {
  const k = familiaContactoDespacho(), preset = { d: k.d, r: x.despacho?.ref || "", c: x.nombre || "", t: k.t, e: k.e };
  const html = FAMILIA_HTML.replace("/*__MUNIS__*/[]", () => JSON.stringify(MUNI_ES.m.map(([i, n]) => `${n} (${MUNI_ES.provincias[i.slice(0, 2)]?.n || ""})`))).replace("/*__PRESET__*/", `Object.assign(H, ${JSON.stringify(preset).replace(/</g, "\\u003c")}, H);`);
  descargar(`Cuestionario de herencia${x.nombre ? " - " + x.nombre : ""}.html`.replace(/[\\/:*?"<>|]/g, ""), new Blob([html], { type: "text/html" }));
  marcarEnviado(x, "descargado para enviar");
}
function sheetFamilia(x) {
  const l = familiaEnlace(x), F = x.familia;
  return sheetHTML("Datos de la familia", `<p class="lead">La familia rellena desde el móvil los datos del fallecido, los herederos, los bienes y los documentos que tiene. Te devuelve un archivo y lo cargas aquí: se incorpora al expediente para que lo revises.</p>
    ${F ? `<div class="infobar" style="margin-bottom:14px"><span class="ico green">${I.tick}</span><span>Datos recibidos el ${fechaLarga(F.recibido)}${F.contacto?.nombre ? " de " + esc(F.contacto.nombre) : ""}.</span></div>` : ""}
    <div class="sectitle">1. Pedir los datos</div>
    <div class="group fam-cli"><div class="field"><label for="fam-tel">Móvil del cliente</label><input id="fam-tel" type="tel" inputmode="tel" data-famk="tel" value="${esc(x.despacho?.tel || "")}" placeholder="Para abrir WhatsApp con su chat"></div><div class="field"><label for="fam-email">Correo del cliente</label><input id="fam-email" type="email" data-famk="email" value="${esc(x.despacho?.email || "")}" placeholder="Para que el correo salga con destinatario"></div></div>
    <div class="group" style="--inset:60px;margin-top:12px">${l ? `<button class="row" data-act="famWa"><span class="ico green">${I.send}</span><span class="t"><b>Enviar el enlace por WhatsApp</b><small>Con un mensaje ya escrito</small></span>${I.chev}</button><button class="row" data-act="famMail"><span class="ico blue">${I.send}</span><span class="t"><b>Enviar el enlace por correo</b></span>${I.chev}</button><button class="row" data-act="famCopy"><span class="ico teal">${I.link}</span><span class="t"><b>Copiar el enlace</b><small>${esc(l.replace(/#.*/, ""))} · para pegarlo donde quieras</small></span>${I.chev}</button>` : ""}<button class="row" data-act="famFile"><span class="ico indigo">${I.dl}</span><span class="t"><b>Descargar el cuestionario</b><small>${l ? "Un archivo para enviar si prefieren no usar el enlace" : "Un archivo para enviar por correo o WhatsApp; se abre en cualquier navegador"}</small></span>${I.chev}</button></div>
    ${F ? "" : x.familiaEnviado ? `<p class="group-foot">Marcado como enviado el ${fechaLarga(x.familiaEnviado)}. <button class="link" data-famx="desmarcar">Quitar la marca</button></p>` : `<p class="group-foot">Copiar el enlace o descargar el archivo no lo da por enviado. <button class="link" data-famx="marcar">Marcar como enviado</button></p>`}
    <div class="sectitle">2. Cargar la respuesta</div>
    <div class="group" style="--inset:60px"><label class="row" style="cursor:pointer;position:relative;overflow:hidden"><span class="ico gold">${I.box}</span><span class="t"><b>Cargar el archivo de la familia</b><small>Termina en «datos de la familia.hereda.json»</small></span>${I.chev}<input type="file" id="f-fam" accept=".json,application/json" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>
    <p class="group-foot">Lo que aporte la familia no sustituye a lo que ya hayas escrito: solo se rellenan los datos vacíos y se añaden las personas y bienes nuevos, marcados para revisar.</p>`, "Cerrar");
}
// «manuel lopez ortiz» o «MANUEL LÓPEZ» → «Manuel Lopez Ortiz» / «Manuel López»; si ya trae mayúsculas y minúsculas, se respeta
function famNombrePropio(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim(); if (!t) return "";
  if (t !== t.toLocaleLowerCase("es") && t !== t.toLocaleUpperCase("es")) return t;
  return t.toLocaleLowerCase("es").split(" ").map((w, i) => (i > 0 && /^(de|del|la|las|los|y|e|i|da|das|do|dos)$/.test(w) ? w : w.split("-").map((p) => p.replace(/^(\p{L})/u, (m) => m.toLocaleUpperCase("es"))).join("-"))).join(" ");
}
const famNif = (v) => String(v || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
function incorporarFamilia(x, o) {
  const c = { ...(o.causante || {}) }, n = { personas: 0, bienes: 0, campos: 0 };
  c.nombre = famNombrePropio(c.nombre);
  if (c.dni && !x.nifCausante) { x.nifCausante = famNif(c.dni); n.campos++; }
  const put = (k, v) => { if (v && !x[k]) { x[k] = v; n.campos++; } };
  put("nombre", c.nombre); put("fecha", c.fecha); if (c.ccaa && TERRITORIOS.some(([id]) => id === c.ccaa)) put("ccaa", c.ccaa); put("civil", c.civil);
  if (c.testamento === "no" || c.testamento === "nose") put("testamento", c.testamento);
  if (o.origen === "calculadora" && o.calculadora && ["usufructo", "porcentajes"].includes(o.calculadora.reparto)) put("testamento", o.calculadora.reparto);
  x.personas = x.personas || []; x.bienes = x.bienes || []; x.deudas = x.deudas || []; x.gastos = x.gastos || [];
  const hay = new Set(x.personas.map((p) => normTxt(p.nombre)));
  for (const p0 of o.personas || []) { const p = { ...p0, nombre: famNombrePropio(p0.nombre) }; if (!p.nombre || hay.has(normTxt(p.nombre))) continue; x.personas.push({ id: uid(), nombre: p.nombre, ...(p.dni ? { nif: famNif(p.dni) } : {}), relacion: RELACIONES[p.relacion] ? p.relacion : "extrano", inscrita: !!p.inscrita, porcentaje: p.porcentaje != null && p.porcentaje !== "" ? num(p.porcentaje) : "", edad: p.edad === "" || p.edad == null ? "" : num(p.edad), convivio2anios: !!p.convivia, discapacidad: num(p.discapacidad) || "", origen: "familia" }); n.personas++; }
  const hayB = new Set(x.bienes.map((b) => b.tipo + "|" + normTxt(b.descripcion)));
  for (const b of o.bienes || []) {
    if (!TIPO_BIEN[b.tipo] || hayB.has(b.tipo + "|" + normTxt(b.descripcion))) continue;
    const inm = b.tipo === "vivienda" || b.tipo === "inmueble", ine = inm ? muniDesdeTexto(b.municipio) : "", k = ine ? "" : muniKey(b.municipio);
    const nb = { id: uid(), tipo: b.tipo, descripcion: [b.descripcion, inm && b.municipio && !k && !ine ? b.municipio : ""].filter(Boolean).join(", "), valor: num(b.valor) || "", titularidad: ["privativo", "ganancial", "proindiviso"].includes(b.titularidad) ? b.titularidad : "privativo", porcentaje: b.titularidad === "proindiviso" ? num(b.porcentaje) || "" : "", municipio: k || "OTRO", origen: "familia" };
    if (ine) muniElegir(nb, ine);
    x.bienes.push(nb); n.bienes++;
  }
  const dd = o.deudas || {};
  if (dd.hipoteca && !num(x.deudas[0]?.importe)) { x.deudas[0] = { ...(x.deudas[0] || {}), concepto: "Hipoteca", importe: num(dd.hipoteca) }; n.campos++; }
  if (dd.otras && !num(x.deudas[1]?.importe)) { x.deudas[0] = x.deudas[0] || { concepto: "Hipoteca", importe: 0 }; x.deudas[1] = { concepto: "Otras deudas", importe: num(dd.otras) }; n.campos++; }
  if (dd.funeral && !num(x.gastos[0]?.importe)) { x.gastos[0] = { concepto: "Funeral", importe: num(dd.funeral) }; n.campos++; }
  x.despacho = x.despacho || {}; const k = { ...(o.contacto || {}) }; k.nombre = famNombrePropio(k.nombre);
  if (k.nombre && !x.despacho.cliente) x.despacho.cliente = k.nombre; if (k.tel && !x.despacho.tel) x.despacho.tel = k.tel; if (k.email && !x.despacho.email) x.despacho.email = k.email;
  x.familia = { recibido: hoy(), contacto: k, documentos: o.documentos || [], observaciones: o.observaciones || "", seguros: dd.seguros || "", testamento: c.testamento || "", municipio: c.municipio || "", consentimiento: !!o.consentimiento, origen: o.origen || "cuestionario", revisado: {} };
  anotar(x, `Datos recibidos de la familia${k.nombre ? " (" + k.nombre + ")" : ""}: ${plural(n.personas, "persona")}, ${plural(n.bienes, "bien", "bienes")}${c.testamento === "si" ? "; indican que hay testamento" : ""}`, "sistema");
  return n;
}
function recibirFamilia(o, destino) {
  let x = destino || DB.expedientes.find((q) => o.ref && q.despacho?.ref === o.ref), nuevo = false;
  if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(x ? licMotivoEdicion() : licMotivoBloqueo()); return; }
  if (!x) { x = { id: uid(), creado: hoy(), personas: [], bienes: [], deudas: [], gastos: [], tramites: {}, situ: {}, ajuar: "sts", enPlazo: true, fase: "encargo", despacho: { alta: hoy(), ref: o.ref || nuevaRef() }, bitacora: [] }; anotar(x, "Expediente abierto con los datos de la familia", "sistema"); DB.expedientes.unshift(x); nuevo = true; }
  const n = incorporarFamilia(x, o); guardar();
  go({ vista: "exp", id: x.id, sec: "herencia", sheet: null });
  toast(`${nuevo ? "Expediente creado" : "Datos incorporados"}: ${plural(n.personas, "persona")} y ${plural(n.bienes, "bien", "bienes")} para revisar`);
}
// ── Lo que la familia escribe a mano no se pierde: tarjeta «Para revisar» en el Resumen (H33) ──
// famRevisarItems(x) → [{ k, titulo, texto, accion?: { etiqueta, v } }] · se descartan con [data-famrev] (x.familia.revisado[k] = fecha)
function famRevisarItems(x) {
  const F = x.familia; if (!F) return [];
  const R = F.revisado || {}, L = [], situ = x.situ || {};
  const txt = [F.observaciones, F.seguros].join(" ");
  if (String(F.seguros || "").trim()) {
    const dec = /deceso/i.test(F.seguros) && !situ.decesos;
    L.push({ k: "seguros", titulo: "Seguros que indica la familia", texto: F.seguros.trim(), accion: dec ? { etiqueta: "Marcar «Tenía seguro de decesos»", v: "decesos" } : null, nota: /vida/i.test(F.seguros) ? "Si hay seguro de vida, anota el importe en cada beneficiario: computa en su Sucesiones." : "" });
  }
  if (/plan(es)? de pensiones/i.test(txt) && !situ.planPensiones) L.push({ k: "planes", titulo: "Mencionan un plan de pensiones", texto: "Tributa en el IRPF del beneficiario, no en Sucesiones.", accion: { etiqueta: "Marcar «Tenía planes de pensiones»", v: "planPensiones" } });
  if (String(F.observaciones || "").trim() && F.origen !== "calculadora") L.push({ k: "obs", titulo: "Comentario de la familia", texto: F.observaciones.trim() });
  if (F.testamento === "si" && !["usufructo", "porcentajes"].includes(x.testamento)) L.push({ k: "test", titulo: "Dicen que hay testamento", texto: "Pide la copia autorizada y ajusta el reparto en el asistente." });
  const sinMuni = (x.bienes || []).filter((b) => b.origen === "familia" && (b.tipo === "vivienda" || b.tipo === "inmueble") && (!b.municipio || b.municipio === "OTRO") && !b.muniIne);
  if (sinMuni.length) L.push({ k: "muni", titulo: plural(sinMuni.length, "inmueble sin municipio reconocido", "inmuebles sin municipio reconocido"), texto: "Elige el municipio en cada inmueble para calcular la plusvalía: " + sinMuni.map((b) => b.descripcion || TIPO_BIEN[b.tipo]?.[0] || "inmueble").join("; ") + "." });
  return L.filter((i) => !R[i.k]);
}
function famRevisarHTML(x) {
  const L = famRevisarItems(x); if (!L.length) return "";
  return `<div class="card fam-rev"><div class="fam-rev-h"><span class="ico gold">${I.info}</span><span><b>Para revisar</b><small>Lo que escribió la familia el ${fechaLarga(x.familia.recibido)}</small></span></div><ul>${L.map((i) => `<li><span class="t"><b>${esc(i.titulo)}</b><span>${i.k === "obs" || i.k === "seguros" ? "«" + esc(i.texto) + "»" : esc(i.texto)}</span>${i.nota ? `<small>${esc(i.nota)}</small>` : ""}</span><span class="a">${i.accion ? `<button class="btn sm" data-famrev="situ" data-v="${esc(i.accion.v)}">${esc(i.accion.etiqueta)}</button>` : ""}<button class="btn sm gray" data-famrev="${esc(i.k)}">Revisado</button></span></li>`).join("")}</ul></div>`;
}
function famRevisado(k, v) {
  const x = typeof exp === "function" ? exp() : null; if (!x || !x.familia) return;
  if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); return; }
  if (k === "situ") { x.situ = x.situ || {}; x.situ[v] = true; const t = (typeof TR_SITUACIONES !== "undefined" ? TR_SITUACIONES : []).find(([q]) => q === v); anotar(x, `Situación marcada con los datos de la familia: ${t ? t[1] : v}`, "sistema"); guardar(); render(); toast("Situación marcada: los trámites se han ajustado"); return; }
  x.familia.revisado = x.familia.revisado || {}; x.familia.revisado[k] = hoy(); guardar(); render();
}
const DOC_FAM = { defuncion: "Certificado de defunción", ultimas: "Últimas voluntades", testamento: "Testamento", seguros: "Certificado de seguros", libro: "Libro de familia", dni: "DNI de los herederos", escrituras: "Escrituras", ibi: "Recibo del IBI", bancos: "Extractos bancarios", renta: "Declaración de la renta" };
function tarjetaFamilia(x) {
  const F = x.familia; if (!F) return "";
  const k = F.contacto || {};
  return `<div class="card" style="margin-top:14px">${cardH("Recibidos el " + fechaCorta(F.recibido), "Datos aportados por la familia")}<div class="kv">${k.nombre ? `<span>Contacto</span><span>${esc(k.nombre)}${k.relacion ? " · " + esc(k.relacion) : ""}</span>` : ""}${k.tel ? `<span>Teléfono</span><span>${esc(k.tel)}</span>` : ""}${k.email ? `<span>Correo</span><span>${esc(k.email)}</span>` : ""}${F.testamento ? `<span>Testamento</span><span>${esc({ si: "Dicen que sí", no: "Dicen que no", nose: "No lo saben" }[F.testamento] || "")}</span>` : ""}${F.municipio ? `<span>Residencia</span><span>${esc(F.municipio)}</span>` : ""}<span>Documentos que tienen</span><span>${F.documentos.length ? esc(F.documentos.map((d) => DOC_FAM[d] || d).join(", ")) : "Ninguno"}</span>${F.seguros ? `<span>Seguros</span><span>${esc(F.seguros)}</span>` : ""}${F.observaciones ? `<span>Observaciones</span><span>${esc(F.observaciones)}</span>` : ""}<span>Consentimiento</span><span>${F.consentimiento ? "Dado en el cuestionario" : "No consta"}</span></div></div>`;
}
// Cuestionario para la familia: apagado desde la versión 1.2 (la entrada de datos es por documentos). Se conserva el código y lo recibido;
// si un expediente ya tiene respuesta de la familia, se sigue mostrando para revisarla.
const FAMILIA_CUESTIONARIO = false;
function franjaFamilia(x) { if (!FAMILIA_CUESTIONARIO) return (x.familia ? famRevisarHTML(x) : "") + (typeof lecFranjaHTML === "function" ? lecFranjaHTML(x) : ""); return famFranja(x) + famRevisarHTML(x); }
function famFranja(x) {
  const F = x.familia, env = x.familiaEnviado, l = familiaEnlace(x);
  if (F ? Date.now() - new Date(F.recibido + "T12:00:00") > 30 * 864e5 : !["encargo", "documentacion", undefined, ""].includes(x.fase)) return "";
  const paso = F ? 3 : env ? 2 : 1;
  const track = `<div class="ftrack" aria-hidden="true">${["Enviar", "La familia rellena", "Revisar"].map((t, i) => `<span class="${i + 1 < paso ? "ok" : i + 1 === paso ? "on" : ""}"><i>${i + 1 < paso ? I.tick : i + 1}</i>${t}</span>`).join("")}</div>`;
  let tit, sub, acts;
  if (F) {
    const np = (x.personas || []).filter((p) => p.origen === "familia").length, nb = (x.bienes || []).filter((b) => b.origen === "familia").length;
    tit = `La familia envió sus datos el ${fechaLarga(F.recibido)}`;
    sub = `${plural(np, "persona")} y ${plural(nb, "bien", "bienes")} aportados${F.documentos?.length ? ` · tienen ${plural(F.documentos.length, "documento")}` : ""}${F.contacto?.nombre ? ` · ${esc(F.contacto.nombre)}` : ""}`;
    acts = `<button class="btn sm gray" data-sec="herencia">Revisar datos</button><button class="btn sm gray" data-act="familia">Opciones</button>`;
  } else if (env) {
    tit = `Cuestionario enviado a la familia el ${fechaLarga(env)}`;
    sub = "Cuando te devuelvan el archivo, cárgalo aquí: se incorpora al expediente para que lo revises.";
    acts = `<label class="btn sm" style="position:relative;overflow:hidden;cursor:pointer">Cargar la respuesta<input type="file" id="f-fam" accept=".json,application/json" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><button class="btn sm gray" data-act="familia">Reenviar</button>`;
  } else if (x.familiaPreparado) {
    tit = "Cuestionario preparado, sin enviar";
    sub = `Copiaste el enlace o descargaste el cuestionario el ${fechaLarga(x.familiaPreparado)}. Cuando se lo hayas enviado a la familia, márcalo para que Mi día cuente los días de espera.`;
    acts = `<button class="btn sm" data-famx="marcar">Ya lo he enviado</button><button class="btn sm gray" data-act="familia">Opciones</button>`;
  } else {
    tit = "Pide los datos a la familia";
    sub = "Rellenan desde el móvil herederos, bienes, deudas y documentos. Tú solo revisas.";
    acts = `${l ? `<button class="btn sm" data-act="famWa">Enviar por WhatsApp</button>` : `<button class="btn sm" data-act="famFile">Descargar el cuestionario</button>`}<button class="btn sm gray" data-act="familia">Otras opciones</button>`;
  }
  return `<div class="card famcard"><span class="ico green">${I.person}</span><div class="ft"><b>${tit}</b><small>${sub}</small>${track}</div><div class="fa">${acts}</div></div>`;
}

// ── Migración: traer la cartera desde una hoja de cálculo (CSV guardado desde Excel o Google Sheets) ──
// Columnas reconocidas (con o sin acentos, en cualquier orden): referencia, cliente, causante, fallecimiento, comunidad, telefono, correo, abogado, fase, notas.
const IMP_COLS = { referencia: ["referencia", "ref", "expediente", "num", "numero"], cliente: ["cliente", "contacto", "heredero"], causante: ["causante", "fallecido", "difunto", "herencia de"], fecha: ["fallecimiento", "fecha fallecimiento", "fecha de fallecimiento", "defuncion", "fecha", "obito"], ccaa: ["comunidad", "comunidad autonoma", "ccaa", "territorio"], tel: ["telefono", "tel", "movil"], mail: ["correo", "email", "e-mail", "mail"], abogado: ["abogado", "responsable", "letrado"], fase: ["fase", "estado", "situacion"], notas: ["notas", "observaciones", "comentarios"] };
const impNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function impCSV(txt) {
  const sep = (txt.match(/;/g) || []).length >= (txt.match(/,/g) || []).length ? ";" : ",";
  const filas = []; let fila = [], campo = "", q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i]; if (q) { if (c === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') q = false; else campo += c; } else if (c === '"') q = true; else if (c === sep) { fila.push(campo); campo = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && txt[i + 1] === "\n") i++; fila.push(campo); campo = ""; if (fila.some((v) => v.trim())) filas.push(fila); fila = []; } else campo += c; }
  if (campo || fila.length) { fila.push(campo); if (fila.some((v) => v.trim())) filas.push(fila); }
  return filas;
}
const impFecha = (v) => { const s = String(v || "").trim(); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return s.slice(0, 10); m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; } return ""; };
function impCCAA(v) { const n = impNorm(v); if (!n) return ""; const T = typeof TERRITORIOS === "object" ? TERRITORIOS : []; const hit = T.find(([id, nom]) => impNorm(nom) === n || impNorm(id) === n) || T.find(([id, nom]) => impNorm(nom).includes(n) || n.includes(impNorm(nom).split(" ").pop())); return hit ? hit[0] : ""; }
function impFase(v) { const n = impNorm(v); if (!n) return "encargo"; const F = typeof FASES_EXP === "object" ? FASES_EXP : []; const hit = F.find(([id, nom]) => impNorm(nom) === n || id === n) || F.find(([id, nom]) => impNorm(nom).startsWith(n.slice(0, 5))); return hit ? hit[0] : (/cerr|archiv|termin/.test(n) ? "cerrado" : /firma|notar/.test(n) ? "firma" : /liquid|impuest/.test(n) ? "liquidacion" : /docu|recop/.test(n) ? "documentacion" : "encargo"); }
// Devuelve { filas: [{...}], avisos } sin tocar la base: la pantalla enseña lo que va a entrar y el abogado confirma
function impAnalizar(txt) {
  const F = impCSV(txt); if (F.length < 2) return { filas: [], avisos: ["La hoja no tiene filas de datos (la primera fila deben ser los títulos de las columnas)."] };
  const cab = F[0].map(impNorm); const idx = {};
  for (const [k, al] of Object.entries(IMP_COLS)) { const i = cab.findIndex((c) => al.includes(c)) ; if (i >= 0) idx[k] = i; else { const j = cab.findIndex((c) => al.some((a) => c.includes(a))); if (j >= 0) idx[k] = j; } }
  const avisos = []; if (idx.causante == null && idx.cliente == null) avisos.push("No se encuentra ninguna columna «causante» ni «cliente»: la hoja necesita al menos una de las dos.");
  const refs = new Set(DB.expedientes.map((x) => impNorm(x.despacho?.ref)));
  const filas = F.slice(1).map((r, n) => { const g = (k) => (idx[k] != null ? String(r[idx[k]] || "").trim() : ""); const fecha = impFecha(g("fecha")); const ccaa = impCCAA(g("ccaa")); const ref = g("referencia"); const dup = ref && refs.has(impNorm(ref)); return { n: n + 2, ref, cliente: g("cliente"), causante: g("causante"), fecha, fechaTxt: g("fecha"), ccaa, ccaaTxt: g("ccaa"), tel: g("tel"), mail: g("mail"), abogado: g("abogado"), fase: impFase(g("fase")), notas: g("notas"), dup, avisos: [g("fecha") && !fecha ? "fecha no reconocida" : "", g("ccaa") && !ccaa ? "comunidad no reconocida" : "", dup ? "la referencia ya existe: se omite" : ""].filter(Boolean) }; }).filter((f) => f.causante || f.cliente);
  return { filas, avisos, columnas: Object.keys(idx) };
}
function impAplicar(filas) {
  const D = despachoCfg(); let n = 0;
  for (const f of filas) { if (f.dup) continue; const abo = f.abogado ? (D.abogados || []).find((a) => impNorm(a.nombre).includes(impNorm(f.abogado).split(" ")[0])) : null;
    const x = { id: uid(), creado: hoy(), nombre: f.causante, fecha: f.fecha, ccaa: f.ccaa || D.ccaaDefecto || "", civil: "", testamento: "", personas: [], bienes: [], deudas: [], gastos: [], situ: {}, tramites: {}, ajuar: "sts", enPlazo: true, fase: f.fase, despacho: { ref: f.ref || (typeof nuevaRef === "function" ? nuevaRef() : ""), cliente: f.cliente, tel: f.tel, mail: f.mail, alta: hoy() }, responsable: abo ? abo.id : D.abogados?.[0]?.id, bitacora: [], importado: true };
    DB.expedientes.push(x); anotar(x, `Expediente importado desde la hoja del despacho${f.notas ? ": " + f.notas.slice(0, 200) : ""}`, "sistema"); n++; }
  guardar(); return n;
}
function impPlantillaCSV() { descargar("plantilla-expedientes-hereda.csv", new Blob(["\ufeff" + ["referencia;cliente;causante;fallecimiento;comunidad;telefono;correo;abogado;fase;notas", "EXP-2026-001;Mercedes Lebrón Guijarro;Alicia Guijarro Tamayo;12/03/2026;Madrid;600000000;mercedes@correo.es;;Documentación;Piso en Alcalá y dos cuentas", "EXP-2026-002;Rogelio Berrocal;Jaime Berrocal Bocanegra;02/02/2026;Andalucía;;;;Liquidación;"].join("\r\n")], { type: "text/csv;charset=utf-8" })); }
function impSheetHTML() {
  const S = ui.imp || {};
  if (!S.filas) return sheetHTML("Traer la cartera desde una hoja", `<p class="caption" style="margin:0 0 12px">Para no teclear cincuenta herencias: guarda tu Excel o Google Sheets como CSV y súbelo aquí. Hacen falta los títulos en la primera fila; se reconocen <b>referencia, cliente, causante, fallecimiento, comunidad, teléfono, correo, abogado, fase y notas</b>, en cualquier orden. Verás lo que va a entrar antes de confirmar; después completas cada expediente con sus documentos.</p>
    <label class="drop" data-drop="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><b>Elegir el archivo CSV</b><span>Excel: Archivo › Guardar como › «CSV UTF-8 (delimitado por comas)». Google Sheets: Archivo › Descargar › CSV.</span><input type="file" accept=".csv,text/csv,.txt" data-impcsv="1"></label>
    <p style="margin:14px 0 0"><button class="btn sm gray" data-act="impPlantilla">Descargar una plantilla de ejemplo</button></p>`, "Cerrar");
  const F = S.filas, ok = F.filter((f) => !f.dup);
  return sheetHTML("Revisar antes de importar", `<p class="caption" style="margin:0 0 10px">${plural(F.length, "fila", "filas")} con datos · ${plural(ok.length, "expediente nuevo", "expedientes nuevos")}${F.length - ok.length ? ` · ${F.length - ok.length} se omiten por referencia repetida` : ""}. Columnas reconocidas: ${S.columnas.join(", ") || "ninguna"}.</p>
    ${S.avisos.length ? `<ul class="lec-avisos">${S.avisos.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    <div class="tablewrap" style="margin-top:10px"><table class="tbl imp-tbl"><thead><tr><th>Fila</th><th>Referencia</th><th>Cliente</th><th>Causante</th><th>Fallecimiento</th><th>Comunidad</th><th>Fase</th><th></th></tr></thead><tbody>${F.map((f) => `<tr class="${f.dup ? "mute" : ""}"><td class="num">${f.n}</td><td class="mono">${esc(f.ref)}</td><td>${esc(f.cliente)}</td><td>${esc(f.causante)}</td><td>${f.fecha ? fechaCorta(f.fecha) : `<span class="chip warn">${esc(f.fechaTxt || "sin fecha")}</span>`}</td><td>${f.ccaa ? esc(nombreTerr(f.ccaa)) : `<span class="chip warn">${esc(f.ccaaTxt || "por indicar")}</span>`}</td><td>${esc((FASES_EXP.find(([k]) => k === f.fase) || [])[1] || f.fase)}</td><td>${f.avisos.map((a) => `<span class="chip ${f.dup ? "" : "warn"}">${esc(a)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>
    <div class="lec-acts"><button class="btn block" data-act="impAplicar" ${ok.length ? "" : "disabled"}>Importar ${plural(ok.length, "expediente")}</button><button class="btn block gray" data-act="impOtro">Elegir otro archivo</button></div>`, "Cerrar", "wide");
}
