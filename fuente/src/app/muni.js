// ───────────────────── Municipios de España (INE, 8.132) ─────────────────────
// MUNI_ES = { provincias: { "29": { n, ccaa, bop: { nombre, url, estado? } } }, m: [[ine, nombre], ...] }
// MUNI_CLAVES = { CLAVE_ORDENANZA: ine }
const MUNI_INE_KEY = Object.fromEntries(Object.entries(typeof MUNI_CLAVES === "object" ? MUNI_CLAVES : {}).map(([k, i]) => [i, k]));
let MUNI_IDX = null;
function muniIdx() {
  if (!MUNI_ES.m.length) { heredaParteYRepintar("municipios"); return []; } // partes.js: la lista llega aparte en la app publicada
  if (!MUNI_IDX) MUNI_IDX = MUNI_ES.m.map(([ine, n]) => { const pv = MUNI_ES.provincias[ine.slice(0, 2)] || {}; return { ine, n, pn: pv.n || "", q: normTxt(n), alt: n.split("/").map(normTxt), qp: normTxt(pv.n || "") }; });
  return MUNI_IDX;
}
const muniProv = (ine) => MUNI_ES.provincias[String(ine || "").slice(0, 2)] || null;
const muniPorIne = (ine) => muniIdx().find((m) => m.ine === ine) || null;
const muniOrd = (ine) => MUNI_INE_KEY[ine] || "";
const MUNI_TOTAL = MUNI_ES.n || MUNI_ES.m.length;

// Búsqueda: primero coincidencias al inicio del nombre, luego al inicio de una palabra y luego dentro.
// "ronda malaga" filtra por provincia; los municipios con ordenanza incorporada van antes a igual coincidencia.
function muniBuscar(q, max = 12) {
  const n = normTxt(q); if (!n) return [];
  const L = muniIdx(), out = [];
  const puntua = (m, t) => (m.alt.includes(t) ? 0 : m.alt.some((a) => a.startsWith(t)) ? 1 : (" " + m.q).includes(" " + t) ? 2 : m.q.includes(t) ? 3 : 9);
  for (const m of L) {
    let s = puntua(m, n);
    if (s === 9) { // ¿la última palabra (o las últimas) es la provincia?
      const w = n.split(" ");
      for (let k = 1; k < w.length && s === 9; k++) { const a = w.slice(0, -k).join(" "), p = w.slice(-k).join(" "); if (m.qp.startsWith(p)) { const s2 = puntua(m, a); if (s2 < 9) s = s2 + 0.5; } }
    }
    if (s < 9) out.push({ m, s: s - (muniOrd(m.ine) ? 0.25 : 0) });
  }
  return out.sort((a, b) => a.s - b.s || a.m.n.localeCompare(b.m.n, "es")).slice(0, max).map((o) => o.m);
}
// "Ronda (Málaga)", "Ronda, Málaga" o "Ronda" (si es único) -> código INE
function muniDesdeTexto(t) {
  const s = String(t || "").trim(); if (!s) return "";
  const mm = /^(.*?)\s*[(,]\s*([^()]+?)\)?\s*$/.exec(s);
  const nom = normTxt(mm ? mm[1] : s), pv = mm ? normTxt(mm[2]) : "";
  const c = muniIdx().filter((m) => m.q === nom || m.alt.includes(nom));
  const f = pv ? c.filter((m) => m.qp === pv || m.qp.startsWith(pv)) : c;
  return f.length === 1 ? f[0].ine : c.length === 1 ? c[0].ine : "";
}
// Municipio de un bien: por INE si lo tiene; si no, el de su ordenanza
function muniDeBien(b) {
  const ine = b.muniIne || (b.municipio && b.municipio !== "OTRO" ? MUNI_CLAVES[b.municipio] : "");
  const m = ine ? muniPorIne(ine) : null;
  if (m) return { ine, nombre: m.n, prov: m.pn, pv: muniProv(ine), key: b.municipio && b.municipio !== "OTRO" ? b.municipio : muniOrd(ine) };
  if (b.municipio && b.municipio !== "OTRO" && ORDENANZAS[b.municipio]) return { ine: "", nombre: ORDENANZAS[b.municipio].nombre, prov: "", pv: null, key: b.municipio };
  return b.muniNombre ? { ine: "", nombre: b.muniNombre, prov: "", pv: null, key: "" } : null;
}
function muniElegir(b, ine) {
  const m = muniPorIne(ine); if (!m) return;
  b.muniIne = ine; b.muniNombre = m.n; b.municipio = muniOrd(ine) || "OTRO";
}
// Chip de estado: ordenanza incorporada (verificada o en revisión), tipo oficial comunicado a Hacienda para 2026, o sin datos (máximo legal)
const muniHac = (ine) => (typeof haciendaIIVTNU === "function" ? haciendaIIVTNU(ine) : null);
const muniEtiqueta = (key, ine) => key ? (ORDENANZAS[key]?.estadoTipo === "VERIFICADO" ? `<span class="mtag ok" title="Tipo, coeficientes y bonificaciones de la ordenanza cotejados con el boletín oficial">Ordenanza incorporada · verificada</span>` : `<span class="mtag rev" title="Ordenanza incorporada; algún dato está pendiente de cotejo con el boletín oficial">Ordenanza incorporada · en revisión</span>`)
  : muniHac(ine) ? `<span class="mtag ok" title="Tipo de gravamen que el ayuntamiento comunica al Ministerio de Hacienda para 2026; coeficientes máximos legales; la bonificación se introduce a mano">Tipo oficial · Hacienda 2026</span>`
  : `<span class="mtag no" title="Se calcula el máximo posible: tipo del 30 %, coeficientes máximos y sin bonificación, hasta que introduzcas los de su ordenanza">Sin ordenanza · cálculo máximo</span>`;
const MUNI_FORAL = ["ALA", "BIZ", "GIP", "NAV"];
function muniResultados(q) {
  const R = muniBuscar(q);
  if (!MUNI_ES.m.length && !heredaParteYRepintar("municipios")) return `<p class="mhint" aria-busy="true">Cargando los municipios…</p>`;
  if (!normTxt(q)) return `<p class="mhint">Los ${grp(MUNI_TOTAL, 0)} municipios de España. Escribe el nombre; puedes añadir la provincia («Ronda Málaga»).</p>`;
  if (!R.length) return `<p class="mhint">Ningún municipio coincide con «${esc(q)}».</p>`;
  return R.map((m) => `<button type="button" class="mopt" data-muni="${m.ine}"><span><b>${esc(m.n)}</b><small>${esc(m.pn)}</small></span>${muniEtiqueta(muniOrd(m.ine), m.ine)}</button>`).join("");
}
// Campo de municipio de la hoja del bien
function muniCampo(x, b) {
  const M = muniDeBien(b), editar = ui.muniEdit === b.id || !M;
  if (editar) return `<div class="field muni"><label for="b-mq">Municipio del inmueble</label><div class="search msearch">${I.search}<input id="b-mq" autocomplete="off" placeholder="Buscar entre los ${grp(MUNI_TOTAL, 0)} municipios" value=""></div><div class="mres" id="b-mres" role="listbox">${muniResultados("")}</div>${M ? `<button class="btn sm gray" data-act="muniCancelar" style="margin-top:8px">Mantener ${esc(M.nombre)}</button>` : ""}</div>`;
  const pv = M.pv;
  return `<div class="field muni"><label>Municipio del inmueble</label><div class="mcard"><span class="t"><b>${esc(M.nombre)}</b><small>${esc([M.prov, pv ? nombreTerr(pv.ccaa) : ""].filter(Boolean).join(" · "))}</small></span>${muniEtiqueta(M.key, M.ine)}<button class="btn sm gray" data-act="muniCambiar">Cambiar</button></div></div>`;
}
// Municipio sin ordenanza incorporada: estimación prudente (tipo máximo legal del 30 %, art. 108.1 TRLRHL; coeficientes máximos, art. 107.4;
// sin bonificación) con un clic para introducir el tipo y la bonificación reales de su ordenanza. En los territorios forales, el tope es el de su norma foral (motor: PLUSVALIA_FORAL).
function muniBop(M) { const bop = M && M.pv && M.pv.bop; return bop && bop.url ? `<a href="${esc(bop.url)}" target="_blank" rel="noopener">${esc(bop.nombre || "boletín oficial de la provincia")} ↗</a>` : "el boletín oficial de la provincia"; }
function muniManualHTML(x, b) {
  const M = muniDeBien(b), nom = M ? M.nombre : "", manual = b.tipoManual != null && String(b.tipoManual).trim() !== "";
  const H = M && M.ine ? muniHac(M.ine) : null, pre2026 = H && x.fecha && x.fecha < "2026-01-01";
  const abierto = manual || ui.muniManual === b.id || num(b.bonifManual) > 0;
  const foral = M && M.pv && MUNI_FORAL.includes(M.pv.ccaa);
  const RF = foral && typeof regimenPlusvalia === "function" ? regimenPlusvalia(M.ine) : null;
  const aviso = foral ? `<p class="mest-foral">${esc(nom)} está en territorio foral (${esc(M.pv.n)}): la plusvalía se rige por la norma foral${RF ? ` (${esc(RF.norma)})` : ""}, con sus propios coeficientes y tipos. El cálculo aplica el tipo máximo foral${RF ? ` del ${grp(RF.tipoMax * 100, 0)} %` : ""} y los coeficientes máximos forales${RF && RF.exencion ? "; las herencias entre ascendientes, descendientes y cónyuges están exentas por ley" : ""}. Coeficientes pendientes de cotejo: cifra orientativa.</p>` : "";
  const hacLink = `<a href="${esc(HACIENDA_IIVTNU_URL)}" target="_blank" rel="noopener">consulta de información impositiva municipal de Hacienda ↗</a>`;
  const tH = H ? grp(H.tipos[20] * 100, H.tipos[20] * 100 % 1 ? 2 : 0) : "";
  if (!abierto) {
    if (H && !pre2026) return `<div class="mest" id="b-mest"><span class="ico green">${I.tick}</span><div><b>Tipo oficial de ${esc(nom)}${H.tipos.every((t) => t === H.tipos[0]) ? `: ${tH} %` : " (varía con los años de tenencia)"}</b>
    <p>Es el tipo que el Ayuntamiento comunica al Ministerio de Hacienda para 2026. Se aplican los coeficientes máximos legales (art. 107.4 TRLRHL). Hacienda no publica las bonificaciones: si la ordenanza (${muniBop(M)}) prevé una para herencias de cónyuge, hijos o padres, introdúcela y la cuota bajará.</p>${aviso}
    <button type="button" class="btn sm" data-act="muniManual">Introducir la bonificación</button></div></div>`;
    return `<div class="mest" id="b-mest"><span class="ico gold">${I.info}</span><div><b>Cálculo máximo${nom ? `; consulta la ordenanza de ${esc(nom)}` : ""}</b>
    <p>${nom ? `La ordenanza de plusvalía de ${esc(nom)} no está incorporada.` : "Sin municipio, no se conoce la ordenanza."} Se calcula con el tipo del 30 % (máximo legal, art. 108.1 TRLRHL), los coeficientes máximos (art. 107.4 TRLRHL) y sin bonificación, así que la cifra real será igual o menor. ${H && pre2026 ? `Para 2026, ${esc(nom)} comunica a Hacienda un tipo del ${tH} %; el fallecimiento es anterior y la ordenanza pudo cambiar. ` : ""}El tipo de cada municipio de más de 1.000 habitantes está en la ${hacLink}${nom ? `; la ordenanza fiscal, en ${muniBop(M)}` : ""}.</p>${aviso}
    <button type="button" class="btn sm" data-act="muniManual">Introducir el tipo y la bonificación</button></div></div>`;
  }
  return `<div class="mest on" id="b-mest"><span class="ico ${manual || H ? "green" : "gold"}">${manual || H ? I.tick : I.info}</span><div><b>${manual ? `Tipo y bonificación de la ordenanza${nom ? " de " + esc(nom) : ""}` : H && !pre2026 ? `Tipo oficial de ${esc(nom)} (Hacienda 2026) y bonificación` : `Datos de la ordenanza${nom ? " de " + esc(nom) : ""}`}</b>
    <p>${nom ? `Consúltalos en la ordenanza fiscal del impuesto (${muniBop(M)})${H ? "" : ` o, el tipo (municipios de más de 1.000 habitantes), en la ${hacLink}`}.` : ""} Los coeficientes se limitan al máximo legal (art. 107.4 TRLRHL).</p>${aviso}</div></div>
    <div class="field"><label for="b-t">Tipo de gravamen de la ordenanza (%)</label><input id="b-t" inputmode="decimal" data-bn="tipoManual" value="${numStr(b.tipoManual)}" placeholder="${H && !pre2026 ? `${tH} (Hacienda 2026)` : "30 (máximo legal)"}"><span class="hint">Entre 0 y 30 %. Vacío: ${H && !pre2026 ? "el tipo comunicado a Hacienda para 2026" : "se usa el 30 %"}.</span></div>
    <div class="field"><label for="b-bo">Bonificación por herencia a cónyuge, descendientes o ascendientes (%)</label><input id="b-bo" inputmode="decimal" data-bn="bonifManual" value="${numStr(b.bonifManual)}" placeholder="0"><span class="hint">La de la ordenanza para transmisiones por causa de muerte (el art. 108.4 TRLRHL permite hasta el 95 %). Revisa sus requisitos.</span></div>
    ${manual || num(b.bonifManual) ? `<button type="button" class="btn sm gray" data-act="muniMaxLegal">${H && !pre2026 ? "Volver al tipo de Hacienda sin bonificación" : "Volver a la estimación con el máximo legal"}</button>` : ""}`;
}
