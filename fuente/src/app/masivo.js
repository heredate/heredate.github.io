// ───────────────────── {{MARCA}} · acciones masivas en la tabla de Expedientes (prefijo ma/MA_) ─────────────────────
// Casillas en la tabla de la cartera (escritorio) y una barra para cambiar de una vez el responsable o la fase de los
// marcados. Cada cambio se anota en la bitácora de cada expediente con el mismo texto que el cambio individual
// («Fase: A → B», «Responsable: X»), de modo que el tiempo por fase y la auditoría lo recogen igual.
// Selección: ui.maSel = { id: true } (solo en memoria). Ganchos en despacho.js: maTh(), maTd(id), maBarraHTML(ids visibles).
const maSel = () => (ui.maSel = ui.maSel || {});
const maIds = () => Object.keys(maSel()).filter((id) => (DB.expedientes || []).some((x) => x.id === id));
function maCasilla(on, attrs, label) { return `<button type="button" class="st ma-ck ${on ? "hecho" : ""}" role="checkbox" aria-checked="${on}" aria-label="${esc(label)}" ${attrs}>${on ? I.tick : ""}</button>`; }
function maTh(ids) { const S = maSel(), todos = ids.length && ids.every((id) => S[id]); return `<th class="ma-c">${maCasilla(todos, `data-masel="*" data-ids="${esc(ids.join(","))}"`, "Marcar todos")}</th>`; }
function maTd(id) { return `<td class="ma-c">${maCasilla(!!maSel()[id], `data-masel="${esc(id)}"`, "Marcar este expediente")}</td>`; }
function maBarraHTML() {
  const ids = maIds(); if (!ids.length) return "";
  const D = despachoCfg();
  return `<div class="card ma-bar" role="region" aria-label="Acciones sobre los marcados"><b>${plural(ids.length, "expediente marcado", "expedientes marcados")}</b>
    <label class="ma-f"><span>Responsable</span><select data-mas="resp"><option value="" selected disabled>Cambiar a…</option>${D.abogados.map((a) => `<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join("")}<option value="__none">Sin asignar</option></select></label>
    <label class="ma-f"><span>Fase</span><select data-mas="fase"><option value="" selected disabled>Pasar a…</option>${FASES_EXP.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></label>
    <button class="btn sm gray" data-masel="none">Quitar la marca</button></div>`;
}
// Aplica el cambio; devuelve cuántos expedientes cambiaron (puro salvo anotar, que se pasa)
function maAplicar(xs, ids, campo, valor, anotarFn, nombreDe) {
  let n = 0;
  for (const x of xs) {
    if (!ids.includes(x.id)) continue;
    if (campo === "fase") { if ((x.fase || "encargo") === valor) continue; anotarFn(x, `Fase: ${nombreDe.fase(x.fase || "encargo")} → ${nombreDe.fase(valor)}`, "fase"); x.fase = valor; n++; }
    if (campo === "resp") { const v = valor === "__none" ? "" : valor; if ((x.responsable || "") === v) continue; anotarFn(x, `Responsable: ${v ? nombreDe.abogado(v) : "sin asignar"}`, "sistema"); x.responsable = v; n++; }
  }
  return n;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest("[data-masel]") : null; if (!b) return;
    const app = document.getElementById("app"); if (!app || !app.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    const S = maSel(), v = b.dataset.masel;
    if (v === "none") ui.maSel = {};
    else if (v === "*") { const ids = (b.dataset.ids || "").split(",").filter(Boolean); const todos = ids.every((id) => S[id]); for (const id of ids) { if (todos) delete S[id]; else S[id] = true; } }
    else if (S[v]) delete S[v]; else S[v] = true;
    render();
  }, true);
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.dataset || !t.dataset.mas) return;
    e.stopPropagation();
    if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); render(); return; }
    const ids = maIds(); if (!ids.length || !t.value) return;
    const n = maAplicar(DB.expedientes, ids, t.dataset.mas, t.value, anotar, { fase: faseN, abogado: (id) => abogado(id)?.nombre || "" });
    if (n) { guardar(); if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); }
    toast(n ? `${plural(n, "expediente actualizado", "expedientes actualizados")}` : "No había nada que cambiar");
    render();
  }, true);
}
