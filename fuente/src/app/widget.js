// ───────────────────── {{MARCA}} · calculadora de herencias para la web del despacho ─────────────────────
// El despacho genera aquí su calculadora (src/calculadora.html con su nombre, color y canales de contacto) y la publica en su web.
// Las familias calculan el Impuesto sobre Sucesiones con el motor real y piden que el despacho revise su caso por WhatsApp o correo.
// Nada pasa por un servidor: la calculadora es un archivo HTML autónomo; el preset viaja dentro del archivo.
// Ajustes guardados en despachoCfg().widget = { tel, email, web, privacidad, color, ccaa, localidad, url, iniciales }.
// Si tel, email, web o localidad están vacíos se usan los del contacto del despacho (despachoContacto()); la comunidad, la de la localidad.
// La configuración no depende del modo demostración: demoSalir() conserva lo que se cambie aquí (dmDespachoAlSalir).
const WG_COLORES = [["#0F2B4C", "Azul notarial"], ["#2C5A92", "Azul"], ["#1F6E6B", "Petróleo"], ["#2F5D46", "Verde"], ["#7A2E3B", "Granate"], ["#2A3340", "Grafito"]];
const WG_ARCHIVO = "calculadora-herencias.html";
const WG = { vista: "movil", t: 0, munis: null };
const WG_I = {
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.01"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  wide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M8 20.5h8"/></svg>',
};
function wgCfg() { const D = despachoCfg(); if (!D.widget || typeof D.widget !== "object") D.widget = {}; return D.widget; }
const wgTelWa = (t) => { let d = String(t || "").replace(/[^\d+]/g, ""); if (d.startsWith("+")) d = d.slice(1); else if (d.startsWith("00")) d = d.slice(2); else if (/^[6789]\d{8}$/.test(d)) d = "34" + d; return /^\d{8,15}$/.test(d) ? d : ""; };
const wgMailOk = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m || "").trim());
const wgUrlOk = (u) => /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(String(u || "").trim());
const wgColor = () => (/^#[0-9a-f]{6}$/i.test(wgCfg().color || "") ? wgCfg().color : WG_COLORES[0][0]);
// Valores efectivos: los de la calculadora o, si están vacíos, los del despacho
function wgEf() {
  const D = despachoCfg(), w = wgCfg(), c = typeof despachoContacto === "function" ? despachoContacto() : {};
  const localidad = String(w.localidad || "").trim() || c.localidad || "";
  return { nombre: D.nombre || "", colegio: D.colegio || "", localidad, tel: String(w.tel || "").trim() || D.tel || "", email: String(w.email || "").trim() || D.email || "", web: String(w.web || "").trim() || D.web || "", ccaa: w.ccaa !== undefined ? w.ccaa : wgCcaaDe(localidad) };
}
// Comunidad autónoma de una localidad (nombre exacto de municipio, sin acentos): «Málaga» → AND · «Las Palmas de Gran Canaria» → CAN
function wgCcaaDe(loc) {
  try {
    const n = normTxt(loc); if (!n || typeof MUNI_ES === "undefined") return "";
    const L = MUNI_ES.m.filter(([, nm]) => nm.split("/").some((a) => normTxt(a) === n));
    const cc = [...new Set(L.map(([i]) => MUNI_ES.provincias[i.slice(0, 2)]?.ccaa).filter(Boolean))];
    return cc.length === 1 && TERRITORIOS.some(([k]) => k === cc[0]) ? cc[0] : "";
  } catch (e) { return ""; }
}
function wgPreset() {
  const w = wgCfg(), E = wgEf();
  return {
    despacho: { nombre: E.nombre, colegio: E.colegio, localidad: E.localidad, tel: E.tel, email: E.email, web: E.web, privacidad: w.privacidad || "", color: wgColor(), logoIniciales: w.iniciales || "" },
    ccaaDefecto: E.ccaa || "",
    hereda: typeof hayWebPublica === "function" && hayWebPublica() ? webURL("/") : "",
  };
}
// Municipios en el formato compacto de la calculadora: { "29": ["Málaga", "AND", "Alameda|Alcaucín|…"] } (igual que CALC_MUNIS en build.py)
function wgMunis() {
  if (WG.munis) return WG.munis;
  if (typeof MUNI_ES === "undefined") return "{}";
  const g = {}; for (const [i, n] of MUNI_ES.m) (g[i.slice(0, 2)] = g[i.slice(0, 2)] || []).push(n);
  const o = {}; for (const k of Object.keys(MUNI_ES.provincias).sort()) { const p = MUNI_ES.provincias[k]; o[k] = [p.n, p.ccaa, (g[k] || []).join("|")]; }
  return (WG.munis = JSON.stringify(o));
}
function wgHTML(preset, conMunis = true) {
  if (typeof CALCULADORA_HTML !== "string") return "";
  return CALCULADORA_HTML.replace("/*__MUNIS__*/{}", () => (conMunis ? wgMunis() : "{}")).replace("/*__PRESET__*/", () => "PRESET = " + JSON.stringify(preset).replace(/</g, "\\u003c") + ";");
}
function wgCodigo(url) {
  const u = String(url || "").trim() || "https://www.tudespacho.es/" + WG_ARCHIVO, cierre = "<" + "/script>";
  return `<iframe id="hereda-calculadora" src="${esc(u)}" title="Calculadora de herencias" loading="lazy" style="display:block;width:100%;height:780px;border:0"></iframe>\n<script>addEventListener("message",function(e){var f=document.getElementById("hereda-calculadora");if(!f||e.source!==f.contentWindow||!e.data)return;if(e.data.hereda==="altura")f.style.height=e.data.h+"px";if(e.data.hereda==="arriba"&&f.getBoundingClientRect().top<0)f.scrollIntoView({behavior:"smooth"});});${cierre}`;
}
function wgAvisos() {
  const D = despachoCfg(), w = wgCfg(), E = wgEf(), A = [];
  if (typeof dmActivo === "function" && dmActivo()) A.push("Estás en el modo demostración: si no los cambias aquí, la calculadora sale con el nombre y la localidad del despacho ficticio. Lo que configures se conserva al salir de la demostración.");
  if (!String(D.nombre || "").trim()) A.push("Pon el nombre del despacho: aparece en la calculadora y en los mensajes que te llegan.");
  if (!wgTelWa(E.tel) && !wgMailOk(E.email)) A.push("Añade un WhatsApp o un correo: es por donde te llegarán las consultas.");
  else { if (E.tel && !wgTelWa(E.tel)) A.push("Revisa el teléfono de WhatsApp: no parece un número válido."); if (E.email && !wgMailOk(E.email)) A.push("Revisa el correo: no parece una dirección válida."); }
  if (!wgUrlOk(w.privacidad)) A.push("Añade la dirección de tu política de privacidad: la familia la ve antes de enviar sus datos (art. 13 RGPD).");
  if (w.url && !/^https:\/\//i.test(w.url)) A.push("La dirección donde publicas la calculadora debe empezar por https://.");
  return A;
}
function wgAvisosHTML() {
  const A = wgAvisos();
  return A.length ? `<div class="wg-avisos">${A.map((a) => `<div class="wg-aviso"><span class="wg-ai warn">${WG_I.warn}</span><span>${esc(a)}</span></div>`).join("")}</div>`
    : `<div class="wg-avisos"><div class="wg-aviso ok"><span class="wg-ai">${WG_I.ok}</span><span>Lista para publicar. Las consultas te llegarán ${[wgTelWa(wgEf().tel) ? "por WhatsApp" : "", wgMailOk(wgEf().email) ? "por correo" : ""].filter(Boolean).join(" y ")}.</span></div></div>`;
}
const wgCampo = (id, k, label, v, attrs, hint) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" data-wgk="${k}" value="${esc(v || "")}" ${attrs || ""}>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
function wgFilaAjustes() {
  return `<button class="row" data-wg="abrir"><span class="ico green">${WG_I.calc}</span><span class="t"><b>Calculadora de herencias para tu web</b><small>Las familias calculan su herencia en tu web y te piden que la revises</small></span>${I.chev}</button>`;
}
function wgSheet() {
  const D = despachoCfg(), w = wgCfg(), c = wgColor(), propio = !WG_COLORES.some(([h]) => h.toLowerCase() === c.toLowerCase()), E = wgEf();
  const dePh = (v, ej) => v ? `placeholder="${esc(v)} (el del despacho)"` : `placeholder="${ej}"`;
  if (!heredaParteYRepintar("calculadora") || !heredaParteYRepintar("municipios")) return sheetHTML("Calculadora para tu web", `<p class="lead" aria-busy="true">${PARTES.cfg ? "Cargando la calculadora…" : "La calculadora no está incluida en esta versión."}</p>`, "Cerrar"); // partes.js
  clearTimeout(WG.t); WG.t = setTimeout(wgPreview, 0);
  return sheetHTML("Calculadora para tu web", `<div class="wg">
    <p class="lead">Una calculadora de herencias con tu nombre y tus colores para la web del despacho. Las familias calculan lo que pagaría cada heredero por Sucesiones y, si quieren, te piden que revises su caso por WhatsApp o por correo.</p>
    <div class="wg-grid">
      <div class="wg-form">
        <div class="sectitle" style="margin-top:4px">Tu despacho</div>
        <div class="group">
          ${wgCampo("wg-nombre", "nombre", "Nombre del despacho", D.nombre, 'placeholder="Ej.: Zambrano Abogados" autocomplete="organization"')}
          ${wgCampo("wg-tel", "tel", "WhatsApp del despacho", w.tel, `type="tel" inputmode="tel" ${dePh(D.tel, "Ej.: 600 123 456")}`, "Las familias te escriben a este número con el resumen del cálculo.")}
          ${wgCampo("wg-email", "email", "Correo para recibir las consultas", w.email, `type="email" ${dePh(D.email, "consultas@tudespacho.es")}`)}
          ${wgCampo("wg-web", "web", "Web del despacho", w.web, `type="url" ${dePh(D.web, "https://www.tudespacho.es")}`)}
          ${wgCampo("wg-loc", "localidad", "Localidad que aparece bajo el nombre", w.localidad, dePh(despachoContacto().localidad, "Ej.: Madrid"))}
          ${wgCampo("wg-priv", "privacidad", "Página de tu política de privacidad", w.privacidad, 'type="url" placeholder="https://www.tudespacho.es/privacidad"')}
          <div class="field"><label for="wg-ccaa">Comunidad que aparece elegida</label><select id="wg-ccaa" data-wgk="ccaa"><option value="">Ninguna (la elige la familia)</option>${TERRITORIOS.filter(([k]) => k !== "EST").map(([k, n]) => `<option value="${k}" ${E.ccaa === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>${w.ccaa === undefined && E.ccaa ? `<span class="hint">La del despacho (${esc(E.localidad)}). Cámbiala si tus clientes son de otra comunidad.</span>` : ""}</div>
        </div>
        <div class="sectitle">Color</div>
        <div class="group"><div class="field"><div class="wg-sw" role="group" aria-label="Color de la calculadora">${WG_COLORES.map(([h, n]) => `<button type="button" class="wg-c" data-wg="color" data-c="${h}" style="--c:${h}" aria-pressed="${h.toLowerCase() === c.toLowerCase()}" aria-label="${n}" title="${n}"></button>`).join("")}<label class="wg-c wg-cc" style="--c:${propio ? c : "transparent"}" data-on="${propio}" title="Otro color"><input type="color" data-wgk="color" value="${esc(c)}" aria-label="Otro color"><span>Otro</span></label></div>
          ${wgCampo("wg-ini", "iniciales", "Iniciales del logotipo", w.iniciales, 'maxlength="3" placeholder="Se calculan del nombre"')}</div></div>
        <div id="wg-avisos">${wgAvisosHTML()}</div>
      </div>
      <div class="wg-prev">
        <div class="wg-prevh"><span>Vista previa</span><div class="seg"><button type="button" data-wg="vista" data-v="movil" aria-pressed="${WG.vista === "movil"}">${WG_I.phone}Móvil</button><button type="button" data-wg="vista" data-v="ancho" aria-pressed="${WG.vista === "ancho"}">${WG_I.wide}Ancho</button></div></div>
        <div class="wg-frame ${WG.vista}"><iframe title="Vista previa de la calculadora" data-wgprev sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"></iframe></div>
        <p class="group-foot" style="margin-left:4px">Es la calculadora real: puedes probarla entera. En la vista previa no se buscan municipios.</p>
      </div>
    </div>
    <div class="sectitle">Ponla en tu web</div>
    <ol class="wg-pasos">
      <li><div><b>Descarga tu calculadora</b><span>Un único archivo con todo dentro. No usa servidores ni bases de datos.</span><button type="button" class="btn sm" data-wg="descargar">${I.dl}Descargar mi calculadora</button></div></li>
      <li><div><b>Súbela a tu web</b><span>En WordPress: <i>Medios › Añadir nuevo archivo</i>, y copia su dirección. Si te lleva la web otra persona, envíale el archivo. Después pega aquí la dirección:</span>
        <div class="group" style="margin-top:10px">${wgCampo("wg-url", "url", "Dirección de la calculadora en tu web", w.url, `type="url" placeholder="https://www.tudespacho.es/${WG_ARCHIVO}"`)}</div></div></li>
      <li><div><b>Insértala en una página</b><span>En WordPress, edita la página donde quieras mostrarla, añade un bloque <i>HTML personalizado</i> y pega este código. También puedes enlazarla desde un botón («Calcula tu herencia»).</span>
        <textarea class="wg-code" id="wg-code" readonly rows="5" aria-label="Código para insertar">${esc(wgCodigo(w.url))}</textarea>
        <div class="wg-acts"><button type="button" class="btn sm" data-wg="copiar">${WG_I.code}Copiar el código</button></div></div></li>
    </ol>
    <p class="group-foot">La calculadora funciona en el navegador de la familia y no envía nada por sí sola: los datos solo te llegan cuando la familia pulsa enviar en su WhatsApp o en su correo. Al final puede guardar un archivo con sus datos que cargas aquí (Ajustes › Importar un archivo) y se abre como expediente nuevo. Revisa que tu política de privacidad cubra estas consultas. Pie de la calculadora: «Con tecnología de {{MARCA}}».</p>
  </div>`, "Hecho", "wide");
}
function wgPreview() {
  const f = document.querySelector("[data-wgprev]"); if (!f) return;
  const html = wgHTML(wgPreset(), false), k = html.length + "|" + JSON.stringify(wgPreset());
  if (f.dataset.k === k) return; f.dataset.k = k; f.srcdoc = html;
}
function wgRefrescar() {
  const a = document.getElementById("wg-avisos"); if (a) a.innerHTML = wgAvisosHTML();
  const c = document.getElementById("wg-code"); if (c) c.value = wgCodigo(wgCfg().url);
  const col = wgColor().toLowerCase();
  document.querySelectorAll('[data-wg="color"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c.toLowerCase() === col)));
  const cc = document.querySelector(".wg-cc"); if (cc) { const propio = !WG_COLORES.some(([h]) => h.toLowerCase() === col); cc.dataset.on = String(propio); cc.style.setProperty("--c", propio ? col : "transparent"); }
  clearTimeout(WG.t); WG.t = setTimeout(wgPreview, 450);
}
function wgDescargar() {
  const html = wgHTML(wgPreset(), true); if (!html) { toast("No se pudo preparar la calculadora"); return; }
  descargar(WG_ARCHIVO, new Blob([html], { type: "text/html" }));
  const A = wgAvisos(); toast(A.length ? "Calculadora descargada. Revisa los avisos antes de publicarla" : "Calculadora descargada");
}
function wgClick(e) {
  const el = e.target.closest && e.target.closest("[data-wg]"); if (!el || el.tagName === "INPUT") return;
  e.preventDefault(); e.stopPropagation();
  const d = el.dataset, w = wgCfg();
  if (d.wg === "abrir") { ui.sheet = { tipo: "widget" }; render(); return; }
  if (d.wg === "color") { w.color = d.c; guardar(); wgRefrescar(); return; }
  if (d.wg === "vista") { WG.vista = d.v === "ancho" ? "ancho" : "movil"; const fr = document.querySelector(".wg-frame"); if (fr) fr.className = "wg-frame " + WG.vista; document.querySelectorAll('[data-wg="vista"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === WG.vista))); return; }
  if (d.wg === "descargar") { wgDescargar(); return; }
  if (d.wg === "copiar") { copiar(wgCodigo(w.url)); return; }
}
function wgCambio(e) {
  const t = e.target; if (!t || !t.dataset || !t.dataset.wgk) return;
  const k = t.dataset.wgk, v = t.value;
  if (k === "nombre") despachoCfg().nombre = v;
  else if (k === "iniciales") wgCfg().iniciales = v.trim().slice(0, 3).toUpperCase();
  else if (k === "color") { if (/^#[0-9a-f]{6}$/i.test(v)) wgCfg().color = v; }
  else wgCfg()[k] = k === "ccaa" ? v : v.trim();
  guardar(); wgRefrescar();
}
if (typeof document !== "undefined" && !window.__wgOyente) { window.__wgOyente = true; document.addEventListener("click", wgClick, true); document.addEventListener("input", wgCambio, true); document.addEventListener("change", wgCambio, true); }
