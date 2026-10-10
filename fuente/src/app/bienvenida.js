// ───────────────────── {{MARCA}} · bienvenida y primeros pasos (prefijo bv / BV_) ─────────────────────
// Primera apertura (base de datos sin expedientes y sin DB.bienvenida): capa a pantalla completa en cuatro pasos
// (Tu despacho · ¿Cómo quieres empezar? · Recorrido de 20 segundos · Listo), sobre document.body y con sus propios
// oyentes, como reunion.js. Se puede saltar en cualquier momento; teclado completo; claro y grafito; movimiento reducido.
// Después, tres marcas de ayuda de una sola vez (DB.tips): Mi día, primer expediente (pestaña Diagnóstico) y Partición.
// API: bvDebeMostrar() · bvAbrir() · bvCerrar() · bvTips() (llamar al final de cada render) · bvTipCerrar()
// Datos: DB.bienvenida = { fecha, camino (real|familia|demo|null), saltada? } · DB.tips = { radar, exp, particion: fecha }
// Escribe en despachoCfg(): nombre, colegio, localidad, abogados[0].nombre, yo, tarifaHora (la usa tiempos.js).

// Colegios de la Abogacía de España (83) con su denominación. Fuente: Consejo General de la Abogacía Española,
// https://www.abogacia.es/conocenos/consejo-general/colegios-y-consejos/ (consultado el 4-10-2026), que distingue «Colegio de Abogados de…»
// y «Colegio de la Abogacía de…». VERIFICADO para esa distinción. Tratamiento: «Ilustre» por defecto; «Real e Ilustre» (Zaragoza, REICAZ)
// y «Muy Ilustre» (Pamplona, MICAP) según sus propias siglas; Álava: «Ilustre Colegio de la Abogacía de Álava» (registro de colegios
// profesionales del Gobierno Vasco, euskadi.eus). PENDIENTE: el tratamiento exacto de cada colegio no se ha contrastado uno a uno con su web;
// por eso la denominación se puede corregir a mano en Ajustes y la bienvenida la enseña antes de guardarla.
// L = «de la Abogacía» · A = «de Abogados»
const BV_COLEGIOS_T = { "A Coruña": "A", Albacete: "L", "Alcalá de Henares": "A", Alcoy: "A", Alicante: "L", Almería: "L", Alzira: "A", Antequera: "A", "Álava": "L", "Ávila": "A", Badajoz: "A", Barcelona: "L", Bizkaia: "L", Burgos: "A", "Cáceres": "L", "Cádiz": "A", Cantabria: "L", Cartagena: "A", "Castellón": "A", Ceuta: "A", "Ciudad Real": "A", "Córdoba": "L", Cuenca: "L", Elche: "A", Estella: "A", Ferrol: "A", Figueres: "L", "Gijón": "L", Gipuzkoa: "L", Girona: "L", Granada: "A", Granollers: "A", Guadalajara: "L", Huelva: "A", Huesca: "L", "Illes Balears": "A", "Jaén": "A", "Jerez de la Frontera": "A", "La Rioja": "L", Lanzarote: "L", "Las Palmas": "A", "León": "L", Lleida: "L", Lorca: "A", Lucena: "A", Lugo: "A", Madrid: "L", "Málaga": "A", Manresa: "A", "Mataró": "A", Melilla: "A", Murcia: "L", Orihuela: "A", Ourense: "L", Oviedo: "A", Palencia: "A", Pamplona: "A", Pontevedra: "L", Reus: "L", Sabadell: "L", Salamanca: "A", "Sant Feliu de Llobregat": "A", "Santa Cruz de la Palma": "A", "Santa Cruz de Tenerife": "A", "Santiago de Compostela": "A", Segovia: "A", Sevilla: "A", Soria: "A", Sueca: "A", Tafalla: "A", "Talavera de la Reina": "L", Tarragona: "L", Terrassa: "A", Teruel: "A", Toledo: "A", Tortosa: "A", Tudela: "A", Valencia: "A", Valladolid: "L", Vic: "A", Vigo: "L", Zamora: "A", Zaragoza: "A" };
const BV_COLEGIOS = Object.keys(BV_COLEGIOS_T).sort(typeof COLACION_ES === "object" ? COLACION_ES.compare : (a, b) => a.localeCompare(b, "es"));
const BV_TRATAMIENTO = { Zaragoza: "Real e Ilustre", Pamplona: "Muy Ilustre" };
const BV_NO_CIUDAD = ["Álava", "Bizkaia", "Cantabria", "Gipuzkoa", "Illes Balears", "La Rioja", "Lanzarote"];
function bvColegioN(c) { return `${BV_TRATAMIENTO[c] || "Ilustre"} Colegio de ${BV_COLEGIOS_T[c] === "L" ? "la Abogacía" : "Abogados"} de ${c}`; }
// Colegio guardado (denominación completa) → nombre corto de la lista, también con la denominación genérica que usaban versiones anteriores
function bvColegioCorto(den) {
  const d = String(den || "").trim(); if (!d) return "";
  const c = BV_COLEGIOS.find((k) => bvColegioN(k) === d); if (c) return c;
  const m = /^Ilustre Colegio de la Abogacía de (.+)$/.exec(d); return m && BV_COLEGIOS_T[m[1]] ? m[1] : "";
}
// Versiones anteriores escribían «Ilustre Colegio de la Abogacía de X» para todos: se corrige a la denominación de la lista
function bvColegioMigrar(D) { const c = bvColegioCorto(D && D.colegio); if (c && D.colegio !== bvColegioN(c)) D.colegio = bvColegioN(c); }
const BV = { el: null, paso: 0, camino: null, prevFocus: null, overflow: "", tip: null, tipEl: null, tipOff: null };
const BV_PASOS = ["despacho", "camino", "recorrido", "listo"];
const bvMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const BV_SV = (d, w = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const BV_I = {
  real: BV_SV('<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.8 12h5.4M9.8 15.5h5.4"/>'),
  familia: BV_SV('<rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M10.5 18h3"/><circle cx="12" cy="9" r="2"/><path d="M9 14c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2"/>'),
  demo: BV_SV('<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8 20.5h8M12 16.5v4"/><path d="M10.2 8v5l4.2-2.5z"/>'),
  ok: BV_SV('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.4),
  x: BV_SV('<path d="M6 6l12 12M18 6L6 18"/>', 2),
};

// ── Cuándo se muestra ──
function bvDebeMostrar() {
  try { return !DB.bienvenida && !(DB.expedientes || []).length && !document.querySelector(".bv-over"); } catch (e) { return false; }
}

// ── Ilustraciones del recorrido (SVG en línea, sin imágenes) ──
function bvIlus(k) {
  const W = (b) => `<svg class="bv-il" viewBox="0 0 120 72" aria-hidden="true">${b}</svg>`;
  if (k === "dia") return W(`<rect x="8" y="8" width="104" height="56" rx="8" class="bv-il-p"/><circle cx="22" cy="23" r="4" class="bv-il-r"/><rect x="31" y="20" width="44" height="6" rx="3" class="bv-il-l"/><rect x="88" y="20" width="16" height="6" rx="3" class="bv-il-rt"/><circle cx="22" cy="37" r="4" class="bv-il-a"/><rect x="31" y="34" width="56" height="6" rx="3" class="bv-il-l"/><rect x="92" y="34" width="12" height="6" rx="3" class="bv-il-at"/><circle cx="22" cy="51" r="4" class="bv-il-b"/><rect x="31" y="48" width="36" height="6" rx="3" class="bv-il-l"/>`);
  if (k === "diag") return W(`<rect x="8" y="8" width="104" height="56" rx="8" class="bv-il-p"/><circle cx="34" cy="36" r="16" class="bv-il-ring"/><path d="M34 20a16 16 0 1 1-13.9 23.9" class="bv-il-ringf"/><text x="34" y="40" text-anchor="middle" class="bv-il-n">82</text><path d="M62 24l3 3 5-6" class="bv-il-ck"/><rect x="74" y="22" width="28" height="5" rx="2.5" class="bv-il-l"/><path d="M62 37l3 3 5-6" class="bv-il-ck"/><rect x="74" y="35" width="22" height="5" rx="2.5" class="bv-il-l"/><circle cx="66" cy="50" r="3.2" class="bv-il-a"/><rect x="74" y="48" width="30" height="5" rx="2.5" class="bv-il-l"/>`);
  if (k === "fam") return W(`<rect x="8" y="8" width="104" height="56" rx="8" class="bv-il-p"/><rect x="18" y="18" width="40" height="36" rx="5" class="bv-il-g"/><path d="M28 38l10-8 10 8v10H28z" class="bv-il-hs"/><circle cx="76" cy="27" r="5" class="bv-il-pp"/><path d="M68 42c1.2-4 4.2-6 8-6s6.8 2 8 6" class="bv-il-pl"/><circle cx="95" cy="30" r="4" class="bv-il-pp"/><path d="M89 43c1-3.2 3.3-4.8 6-4.8s5 1.6 6 4.8" class="bv-il-pl"/><rect x="66" y="49" width="38" height="5" rx="2.5" class="bv-il-gl"/>`);
  return W(`<rect x="8" y="8" width="104" height="56" rx="8" class="bv-il-p"/><rect x="22" y="15" width="44" height="44" rx="4" class="bv-il-doc"/><rect x="29" y="23" width="30" height="4" rx="2" class="bv-il-l"/><rect x="29" y="31" width="24" height="4" rx="2" class="bv-il-l"/><path d="M29 47c4-5 6-5 7-1s3 4 7-1" class="bv-il-sig"/><circle cx="88" cy="36" r="14" class="bv-il-okc"/><path d="M81 36.5l5 5 9-10" class="bv-il-okp"/>`);
}

// ── Pasos ──
function bvPaso1() {
  const D = despachoCfg(), a = D.abogados[0] || {};
  const nom = /^titular del despacho$/i.test(a.nombre || "") ? "" : a.nombre || "";
  bvColegioMigrar(D);
  const sel = bvColegioCorto(D.colegio);
  const otro = D.colegio && !sel;
  return `<p class="bv-kick">Bienvenida · ${bvPrueba()}</p><h2 class="bv-h" id="bv-h">Tu despacho</h2><p class="bv-sub">Cuatro datos que aparecen en los escritos y en los informes. Se cambian cuando quieras en Ajustes.</p>
    <div class="bv-form">
      <label class="bv-f bv-w2"><span>Nombre del despacho</span><input id="bv-nombre" value="${esc(D.nombre || "")}" placeholder="Ej.: Pérez Abogados" autocomplete="organization"></label>
      <label class="bv-f"><span>Colegio</span><select id="bv-colegio" aria-describedby="bv-col-den"><option value="">Elige tu colegio</option>${otro ? `<option value="${esc(D.colegio)}" selected>${esc(D.colegio)}</option>` : ""}${BV_COLEGIOS.map((c) => `<option value="${esc(c)}" ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join("")}</select><small id="bv-col-den">${D.colegio ? "Figurará como: " + esc(D.colegio) : "Figura en el pie de los escritos y del informe."}</small></label>
      <label class="bv-f"><span>Localidad para los escritos</span><input id="bv-localidad" value="${esc(D.localidad || "")}" placeholder="Ej.: Málaga" autocomplete="address-level2"></label>
      <label class="bv-f"><span>Tu nombre</span><input id="bv-yo" value="${esc(nom)}" placeholder="Nombre y apellidos" autocomplete="name"></label>
    </div>
    <p class="bv-sub" style="margin-top:14px">El teléfono, el correo, la dirección y la tarifa del despacho se añaden después en «Despacho y ajustes».</p>`;
}
function bvPaso2() {
  const C = [
    ["real", BV_I.real, "Con una herencia real", "El asistente pide causante, familia y bienes en unos diez minutos y calcula todo al momento.", "Asistente guiado"],
    ["documentos", BV_I.familia, "Con los documentos", "Arrastra el certificado de defunción, el testamento, las notas simples, el IBI, los DNI y los certificados del banco: el expediente se rellena con lo que se lea y tú apruebas cada dato.", "Lectura en tu ordenador, sin enviar nada"],
    ["demo", BV_I.demo, "Ver un despacho en marcha", "Catorce expedientes ficticios en todas las fases, con plazos, bancos, firmas y rentabilidad. Se quitan con un clic.", "Modo demostración"],
  ];
  return `<p class="bv-kick">Paso 2 de 4</p><h2 class="bv-h" id="bv-h">¿Cómo quieres empezar?</h2><p class="bv-sub">Puedes cambiar de idea después: todo está en Expedientes y en Ajustes.</p>
    <div class="bv-choices" role="radiogroup" aria-labelledby="bv-h">${C.map(([k, ic, t, s, m]) => `<button type="button" class="bv-ch" role="radio" aria-checked="${BV.camino === k}" data-bvc="${k}"><span class="bv-ch-ic">${ic}</span><span class="bv-ch-t"><b>${t}</b><small>${s}</small><em>${m}</em></span><span class="bv-ch-r" aria-hidden="true">${BV_I.ok}</span></button>`).join("")}</div>`;
}
function bvPaso3() {
  const T = [
    ["dia", "Expedientes", "Cada herencia es un expediente: la persona fallecida, sus herederos y sus bienes. La lista de la izquierda es tu despacho.", "Barra lateral"],
    ["diag", "Impuestos y reparto", "Sucesiones, plusvalía y partición calculados al momento, paso a paso y con el artículo de cada regla.", "Pestañas del expediente"],
    ["fam", "Trámites y plazos", "Qué hay que hacer, ante quién y hasta cuándo. Los plazos pasan a tu agenda y a tu calendario.", "Trámites y Agenda"],
    ["firma", "Documentos", "Sube los del caso y el expediente se rellena solo; de ahí salen cartas a bancos, cuaderno particional y paquete para la notaría con tu membrete.", "Documentos"],
  ];
  return `<p class="bv-kick">Paso 3 de 4 · 20 segundos</p><h2 class="bv-h" id="bv-h">Cuatro cosas, y poco más</h2><p class="bv-sub">Todo lo demás está a un clic en «Más», dentro de cada expediente, y en el botón de ayuda.</p>
    <div class="bv-tour">${T.map(([il, t, s, h], i) => `<div class="bv-card" style="--i:${i}">${bvIlus(il)}<b>${t}</b><p>${s}</p><span class="bv-kbd">${esc(h)}</span></div>`).join("")}</div>`;
}
function bvPaso4() {
  const D = despachoCfg(), a = D.abogados[0] || {};
  const nom = /^titular/i.test(a.nombre || "") ? "" : (a.nombre || "").split(" ")[0];
  const acc = { real: "Abrir el asistente", familia: "Preparar el cuestionario", demo: "Ver el despacho en marcha" }[BV.camino] || "Ir a Mi día";
  const que = { real: "Se abre el asistente del primer expediente. Si quieres, en su primera pantalla puedes pedir que una guía te acompañe.", documentos: "Se abrirá la ventana para arrastrar los documentos de la herencia; con ellos se crea el expediente.", demo: "Se cargan 14 expedientes ficticios. Para quitarlos: «Salir» en la franja superior." }[BV.camino] || "Mi día te espera vacío: crea tu primer expediente cuando quieras.";
  const fila = (k, v) => `<div class="bv-sum-r"><span>${k}</span><b>${v}</b></div>`;
  return `<div class="bv-done" aria-hidden="true">${BV_I.ok}</div><h2 class="bv-h bv-c" id="bv-h">Todo listo${nom ? ", " + esc(nom) : ""}</h2><p class="bv-sub bv-c">${esc(que)}</p>
    <div class="bv-sum">${fila("Despacho", esc(D.nombre || (BV.camino === "demo" ? "Márquez Collado Abogados (ficticio)" : "Sin nombre todavía")))}${fila("Colegio", esc(bvColegioCorto(D.colegio) || D.colegio || "—"))}${fila("Tarifa objetivo", num(D.tarifaHora) ? grp(num(D.tarifaHora), 0) + " €/hora" : "90 €/hora (por defecto)")}${fila("Prueba", esc(bvPrueba()))}</div>
    <div class="bv-final"><button type="button" class="bv-btn bv-pri bv-big" data-bv="fin">${acc}</button>${BV.camino ? `<button type="button" class="bv-link" data-bv="finDia">O ir a Mi día</button>` : ""}</div>
    <p class="bv-note">Los datos se guardan solo en este equipo. {{MARCA}} prepara; el criterio es del abogado.</p>`;
}
function bvPrueba() { try { const E = licEstado(); return E.tipo === "prueba" ? `${E.diasRestantes} días de prueba` : E.tipo === "licencia" ? "Licencia activa" : "Prueba terminada"; } catch (e) { return "30 días de prueba"; } }

// ── Montaje ──
function bvAbrir(opts = {}) {
  if (BV.el) bvCerrar(true);
  bvTipCerrar();
  BV.paso = opts.paso || 0; BV.camino = DB.bienvenida?.camino || null; BV.prevFocus = document.activeElement;
  const el = document.createElement("div"); el.className = "bv-over"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "bv-h"); el.tabIndex = -1;
  BV.el = el; document.body.appendChild(el);
  BV.overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
  el.addEventListener("click", bvClick); el.addEventListener("change", bvChange); el.addEventListener("keydown", bvKey);
  el.addEventListener("focusin", (e) => { const t = e.target; if (t && t.id === "bv-localidad" && t.dataset.auto) setTimeout(() => { try { if (document.activeElement === t && t.dataset.auto) t.select(); } catch (er) {} }, 0); });
  el.addEventListener("input", (e) => { if (e.target && e.target.id === "bv-localidad") delete e.target.dataset.auto; });
  bvPintar();
  requestAnimationFrame(() => el.classList.add("bv-vis"));
  return true;
}
function bvPintar() {
  const el = BV.el; if (!el) return;
  const p = BV_PASOS[BV.paso];
  const body = p === "despacho" ? bvPaso1() : p === "camino" ? bvPaso2() : p === "recorrido" ? bvPaso3() : bvPaso4();
  const ult = BV.paso === BV_PASOS.length - 1;
  el.innerHTML = `<div class="bv-glow" aria-hidden="true"></div>
    <header class="bv-bar"><span class="bv-brand"><span class="logo" aria-hidden="true">${LOGO_SVG}</span>{{MARCA}}</span><ol class="bv-steps" aria-label="Progreso">${BV_PASOS.map((q, i) => `<li class="${i < BV.paso ? "ok" : i === BV.paso ? "on" : ""}" aria-current="${i === BV.paso ? "step" : "false"}"><span class="bv-sr">Paso ${i + 1}${i < BV.paso ? ", hecho" : ""}</span></li>`).join("")}</ol><button type="button" class="bv-skip" data-bv="saltar">${ult ? "Cerrar" : "Saltar"}</button></header>
    <main class="bv-stage"><section class="bv-panel bv-p-${p}" key="${p}">${body}</section></main>
    ${ult ? "" : `<footer class="bv-foot ${p === "recorrido" ? "bv-wide" : ""}"><div class="bv-foot-in">${BV.paso ? `<button type="button" class="bv-btn bv-ghost" data-bv="atras">Atrás</button>` : "<span></span>"}${p === "camino" ? `<span class="bv-foot-r"><button type="button" class="bv-link" data-bv="despues">Decidir después</button><button type="button" class="bv-btn bv-pri" data-bv="sig" ${BV.camino ? "" : "disabled"}>Continuar</button></span>` : `<button type="button" class="bv-btn bv-pri" data-bv="sig">${p === "recorrido" ? "Entendido" : "Continuar"}</button>`}</div></footer>`}`;
  requestAnimationFrame(() => {
    if (!BV.el) return;
    const f = p === "despacho" ? el.querySelector("#bv-nombre") : p === "camino" ? el.querySelector('.bv-ch[aria-checked="true"]') || el.querySelector(".bv-ch") : p === "listo" ? el.querySelector('[data-bv="fin"]') : el.querySelector('[data-bv="sig"]');
    try { (f || el).focus({ preventScroll: true }); } catch (e) {}
    try { if (typeof acPase === "function") acPase(el); } catch (e) {} // acceso.js: escenario desplazable enfocable
  });
}
function bvGuardarDespacho() {
  if (!BV.el || !BV.el.querySelector("#bv-nombre")) return;
  const D = despachoCfg(), v = (id) => (BV.el.querySelector("#" + id)?.value || "").trim();
  const nombre = v("bv-nombre"), col = v("bv-colegio"), loc = dpSinRepetir(v("bv-localidad")), yo = v("bv-yo"), tar = num(v("bv-tarifa"));
  if (nombre) D.nombre = nombre;
  if (col) D.colegio = BV_COLEGIOS.includes(col) ? bvColegioN(col) : col;
  if (loc) D.localidad = loc;
  // Contacto (opcional): «Calle Larios 4, 2.º, 29005» → dirección + código postal
  const tel = v("bv-tel"), email = v("bv-email"), dir = v("bv-direccion");
  if (BV.el.querySelector("#bv-tel")) { D.tel = tel; D.email = email; const m = /^(.*?)[,\s]+(\d{5})\s*$/.exec(dir); if (m) { D.direccion = m[1].trim(); D.cp = m[2]; } else { D.direccion = dir; if (!dir) D.cp = D.cp || ""; } }
  if (yo) { D.abogados[0].nombre = yo; if (/^titular del despacho$/i.test(D.abogados[0].rol || "") || !D.abogados[0].rol) D.abogados[0].rol = "Titular"; }
  if (!D.yo || !D.abogados.some((a) => a.id === D.yo)) D.yo = D.abogados[0].id;
  if (tar > 0 && tar < 2000) D.tarifaHora = Math.round(tar);
  guardar();
}
function bvIr(n) {
  if (BV_PASOS[BV.paso] === "despacho") bvGuardarDespacho();
  BV.paso = Math.max(0, Math.min(BV_PASOS.length - 1, n));
  bvPintar();
}
function bvCerrar(silencioso) {
  const el = BV.el; if (!el) return;
  el.remove(); BV.el = null;
  document.documentElement.style.overflow = BV.overflow || "";
  if (!silencioso) try { if (BV.prevFocus && BV.prevFocus.focus && document.contains(BV.prevFocus)) BV.prevFocus.focus({ preventScroll: true }); } catch (e) {}
  BV.prevFocus = null;
}
function bvMarcar(extra) { DB.bienvenida = { fecha: hoy(), camino: BV.camino || null, ...(extra || {}) }; guardar(); }
function bvSaltar() { bvGuardarDespacho(); bvMarcar({ saltada: BV_PASOS[BV.paso] }); bvCerrar(); try { render(); } catch (e) {} }
function bvTerminar(camino) {
  bvGuardarDespacho(); bvMarcar(); bvCerrar(true);
  if (camino === "demo") { const n = demoCargar(); go({ vista: "radar", sheet: null }); toast(`Modo demostración: ${n} expedientes ficticios. Mayúsculas+D abre el guion`); return; }
  // M16: «Abrir el asistente» abre el asistente; la guía «Tu primer expediente» se ofrece aparte, en su portada
  if (camino === "real") { pkClick({ act: "nuevo" }); return; }
  if (camino === "documentos") { go({ vista: "inicio", sheet: { tipo: "lecNuevo" } }); if (typeof guAbrir === "function") setTimeout(() => guAbrir("leer"), 350); return; }
  go({ vista: "radar", sheet: null });
}

// ── Eventos de la capa ──
function bvClick(e) {
  const c = e.target.closest("[data-bvc]");
  if (c) { BV.camino = c.dataset.bvc; BV.el.querySelectorAll("[data-bvc]").forEach((b) => b.setAttribute("aria-checked", String(b === c))); const s = BV.el.querySelector('[data-bv="sig"]'); if (s) s.disabled = false; setTimeout(() => { if (BV.el && BV_PASOS[BV.paso] === "camino" && BV.camino === c.dataset.bvc) bvIr(BV.paso + 1); }, 220); return; }
  const b = e.target.closest("[data-bv]"); if (!b) return;
  const a = b.dataset.bv;
  if (a === "saltar") return bvSaltar();
  if (a === "atras") return bvIr(BV.paso - 1);
  if (a === "sig") return bvIr(BV.paso + 1);
  if (a === "despues") { BV.camino = null; return bvIr(BV.paso + 1); }
  if (a === "fin") return bvTerminar(BV.camino);
  if (a === "finDia") return bvTerminar(null);
}
function bvChange(e) {
  if (e.target.id === "bv-colegio") {
    const c = e.target.value, l = BV.el.querySelector("#bv-localidad"), h = BV.el.querySelector("#bv-col-den");
    if (h) h.textContent = c ? "Figurará como: " + (BV_COLEGIOS.includes(c) ? bvColegioN(c) : c) + ". Se puede corregir en Ajustes." : "Figura en el pie de los escritos y del informe.";
    // Autorrelleno de la localidad: queda seleccionado al entrar en el campo, para que lo que se escriba lo sustituya (antes salía «MálagaMálaga»)
    if (l && (!l.value.trim() || l.dataset.auto) && c && !BV_NO_CIUDAD.includes(c) && BV_COLEGIOS.includes(c)) { l.value = c; l.dataset.auto = "1"; }
  }
}
function bvKey(e) {
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); bvSaltar(); return; }
  if (e.key === "Tab") {
    const F = [...BV.el.querySelectorAll('button:not([disabled]),input,select,[tabindex="0"]')].filter((n) => n.offsetParent !== null);
    if (!F.length) return;
    const i = F.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); F[F.length - 1].focus(); }
    else if (!e.shiftKey && i === F.length - 1) { e.preventDefault(); F[0].focus(); }
    return;
  }
  const p = BV_PASOS[BV.paso];
  if (p === "camino" && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
    const L = [...BV.el.querySelectorAll("[data-bvc]")]; const i = L.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); L[(i + (/Up|Left/.test(e.key) ? L.length - 1 : 1)) % L.length].focus(); return;
  }
  if (e.key === "Enter" && p === "despacho" && e.target.tagName === "INPUT") { e.preventDefault(); bvIr(BV.paso + 1); }
}
// La paleta (⌘K) no debe abrirse por encima de la bienvenida
window.addEventListener("keydown", (e) => { if (BV.el && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); } }, true);

// ───────────────────── Marcas de ayuda de una sola vez ─────────────────────
const BV_TIPS = [
  { k: "radar", cuando: () => ui.vista === "radar", sel: ".rd-kpis", t: "Tu mañana en cuatro cifras", txt: "Vencidos, esta semana, bloqueados por terceros y parados. Pulsa una tarjeta para filtrar; cada fila trae su siguiente paso." },
  { k: "exp", cuando: () => ui.vista === "exp" && (ui.sec || "resumen") === "resumen" && !(typeof guActiva === "function" && guActiva()), sel: '[data-act="snMas"]', t: "Las herramientas de apoyo están en «Más»", txt: "Diagnóstico, estrategia fiscal, dos herencias, bancos y notaría, listo para firmar, normativa y encargo. Las seis pestañas de la izquierda son el trabajo de cada día." },
  { k: "particion", cuando: () => ui.vista === "exp" && ui.sec === "particion", sel: "select[data-padj]", t: "Adjudica cada bien", txt: "Elige a quién va cada bien: el cuadro recalcula haberes, compensaciones y plusvalía al momento." },
];
function bvVisible(n) { if (!n) return null; const r = n.getBoundingClientRect(); if (!r.width || !r.height || n.offsetParent === null) return null; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null; return r; }
function bvTips() {
  try {
    if (typeof ui !== "object") return;
    const bloqueado = BV.el || ui.sheet || ui.vista === "asist" || dmActivo() || document.querySelector(".rn-over") || (typeof PK === "object" && PK.abierta) || (typeof guActiva === "function" && guActiva());
    if (BV.tip) {
      const T = BV.tip, n = document.querySelector(T.sel);
      if (bloqueado || !T.cuando() || !bvVisible(n)) { bvTipCerrar(); } else { bvTipPos(); return; }
    }
    if (bloqueado) return;
    DB.tips = DB.tips || {};
    for (const T of BV_TIPS) {
      if (DB.tips[T.k] || !T.cuando()) continue;
      const n = document.querySelector(T.sel); if (!bvVisible(n)) continue;
      DB.tips[T.k] = hoy(); guardar();
      bvTipMostrar(T); return;
    }
  } catch (e) { /* las marcas de ayuda nunca deben romper el render */ }
}
function bvTipMostrar(T) {
  const el = document.createElement("div"); el.className = "bv-tip"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", T.t);
  el.innerHTML = `<i class="bv-tip-ar" aria-hidden="true"></i><b>${esc(T.t)}</b><p>${esc(T.txt)}</p><div class="bv-tip-f"><button type="button" class="bv-tip-ok">Entendido</button></div>`;
  document.body.appendChild(el);
  BV.tip = T; BV.tipEl = el;
  el.querySelector(".bv-tip-ok").addEventListener("click", (e) => { e.stopPropagation(); bvTipCerrar(); });
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); bvTipCerrar(); } });
  const on = () => bvTipPos(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on, { passive: true });
  BV.tipOff = () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  bvTipPos();
  requestAnimationFrame(() => el.classList.add("bv-tip-vis"));
}
function bvTipPos() {
  const el = BV.tipEl, T = BV.tip; if (!el || !T) return;
  const n = document.querySelector(T.sel), r = bvVisible(n); if (!r) { el.style.visibility = "hidden"; return; }
  el.style.visibility = "";
  const w = el.offsetWidth, h = el.offsetHeight, m = 12;
  const abajo = r.bottom + h + 14 < innerHeight || r.top < h + 14;
  const top = abajo ? r.bottom + 10 : r.top - h - 10;
  const cx = r.left + Math.min(r.width, 220) / 2;
  const left = Math.max(m, Math.min(innerWidth - w - m, cx - 28));
  el.style.top = Math.round(top) + "px"; el.style.left = Math.round(left) + "px";
  el.classList.toggle("bv-tip-up", !abajo);
  el.style.setProperty("--ax", Math.round(Math.max(14, Math.min(w - 14, cx - left))) + "px");
}
function bvTipCerrar() {
  if (BV.tipOff) BV.tipOff();
  if (BV.tipEl) BV.tipEl.remove();
  BV.tip = null; BV.tipEl = null; BV.tipOff = null;
}
// Abrir la bienvenida desde Ajustes ([data-bv="abrir"]), fuera de la propia capa
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest('[data-bv="abrir"]'); if (!b || (BV.el && BV.el.contains(b))) return;
  e.preventDefault(); e.stopPropagation();
  if (typeof ui === "object" && ui.sheet) { ui.sheet = null; render(); }
  bvAbrir();
}, true);
