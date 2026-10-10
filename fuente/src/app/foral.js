// ───────────────────── {{MARCA}} · derecho civil foral en la ficha (ronda 4, 07-10-2026) ─────────────────────
// Sin testamento, Aragón, Navarra y el País Vasco reparten aparte los bienes troncales: los que vuelven a la familia de la que proceden.
// El programa no puede saber qué bienes lo son: el abogado los marca en la ficha del bien (y su línea de procedencia) y, si hace falta, la
// línea de cada pariente. El cálculo está en el motor (repartoIntestadoForal); aquí solo se pintan los campos y la ley aplicable.
// Prefijo: fr.
const FR_TRONCAL = {
  ARA: { inm: false, t: "Recibido gratis de ascendientes o de colaterales hasta el sexto grado, o que estuvo en la familia las dos generaciones anteriores (arts. 527-528 CDFA)." },
  NAV: { inm: true, t: "Inmueble recibido a título lucrativo de parientes hasta el cuarto grado, o por permuta de otro troncal (ley 306 del Fuero Nuevo)." },
  VASCO: { inm: true, t: "Bien raíz del infanzonado o tierra llana de Bizkaia, de Aramaio o de Llodio, con parientes tronqueros (arts. 61-63 Ley 5/2015)." },
};
const frVec = (x) => { const R = typeof calcular === "function" ? calcular(x) : null; return (R && R.isd && R.isd.vecindad && R.isd.vecindad.id) || null; };
const frSinTestamento = (x) => !["usufructo", "porcentajes"].includes(x.testamento);
const frHayTroncales = (x) => (x.bienes || []).some((b) => b && b.troncal);
// Interruptor «Bien troncal» y su línea de procedencia, en la ficha del bien
function frTroncalBienHTML(x, b) {
  const v = frVec(x), C = FR_TRONCAL[v];
  if (!C || !frSinTestamento(x)) return "";
  const inm = b.tipo === "vivienda" || b.tipo === "inmueble";
  if (C.inm && !inm && !b.troncal) return "";
  return `<div class="row toggle"><span class="t"><b>Bien troncal</b><small>${esc(C.t)} Sin descendientes, va a la familia de procedencia.</small></span><label class="switch"><input type="checkbox" data-bn="troncal" ${b.troncal ? "checked" : ""}><span></span></label></div>
      ${b.troncal ? `<div class="field"><label for="b-lt">Procede de la familia</label><select id="b-lt" data-bn="lineaTroncal"><option value="" ${!b.lineaTroncal ? "selected" : ""}>Sin indicar</option><option value="paterna" ${b.lineaTroncal === "paterna" ? "selected" : ""}>Del padre (línea paterna)</option><option value="materna" ${b.lineaTroncal === "materna" ? "selected" : ""}>De la madre (línea materna)</option></select><span class="hint">Decide qué parientes lo heredan. Si no consta y hace falta, el reparto no se calcula hasta indicarlo.</span></div>` : ""}`;
}
// Línea del pariente: la de los abuelos (siempre) y, con bienes troncales, la del padre o la madre, medio hermanos, sus hijos, tíos y primos
function frLineaPersonaHTML(x, p) {
  const troncal = FR_TRONCAL[frVec(x)] && frHayTroncales(x) && frSinTestamento(x);
  const pide = p.relacion === "abuelo" || (troncal && (p.relacion === "padre" || p.relacion === "tio" || p.relacion === "primo" || ((p.relacion === "hermano" || p.relacion === "sobrino") && p.medio)));
  if (!pide) return "";
  const [a, b] = p.relacion === "padre" ? ["Padre", "Madre"] : ["Paterna", "Materna"];
  const ayuda = p.relacion === "abuelo" ? "" : `<span class="hint">${p.relacion === "padre" ? "Indica si es el padre o la madre: decide" : p.relacion === "hermano" ? "Indica si es hermano solo de padre (paterna) o solo de madre (materna): decide" : p.relacion === "sobrino" ? "Indica si su progenitor era medio hermano por parte de padre (paterna) o de madre (materna): decide" : "Indica si es pariente por parte de padre (paterna) o de madre (materna): decide"} quién hereda los bienes troncales.</span>`;
  return `<div class="field"><label>${p.relacion === "padre" ? "Es el padre o la madre" : "Línea"}</label><div class="seg" style="margin-top:6px"><button data-plin="paterna" aria-pressed="${p.lineaAsc === "paterna"}">${a}</button><button data-plin="materna" aria-pressed="${p.lineaAsc === "materna"}">${b}</button></div>${ayuda}</div>`;
}
// Ley que rige el reparto sin testamento, en claro, encabezando las notas del reparto
function frLeyRepartoHTML(R) {
  const L = R && R.isd && R.isd.leyReparto; if (!L) return "";
  return `<li><i class="dot gold"></i><span><b>Ley aplicable sin testamento: ${esc(L)}.</b> La decide la vecindad civil del causante.</span></li>`;
}
