// ───────────────────── {{MARCA}} · tareas propias del despacho (prefijo tk/TK_) ─────────────────────
// Además de los trámites que el programa deduce del caso, el despacho apunta sus propias tareas en cada expediente
// («llamar a la gestoría», «revisar el cuaderno con el socio»), con responsable y fecha. Las que vencen en siete días
// o menos entran en Mi día del responsable; las atrasadas cuentan como acción crítica del expediente (no está «al día»).
// Guardado: x.tareasDespacho = [{ id, titulo, resp, fecha, hecha (ISO o null), creada (ISO), autor }]
// Eventos propios (captura en document): [data-tk] clic · formulario [data-tkf].
const TK_VENTANA = 7;

const tkLista = (x) => (Array.isArray(x && x.tareasDespacho) ? x.tareasDespacho : []);
const tkPendientes = (x) => tkLista(x).filter((t) => !t.hecha);
// Elementos para Mi día (radar.js los añade a los plazos del expediente). Puro: recibe la fecha de hoy y la base del radar.
function tkRadarItems(x, h, base) {
  const out = [];
  for (const t of tkPendientes(x)) {
    if (!t.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(t.fecha)) continue;
    const q = Math.round((new Date(t.fecha + "T12:00:00") - new Date(h + "T12:00:00")) / 864e5);
    if (q > TK_VENTANA) continue;
    out.push({ ...base, k: `k:${x.id}:${t.id}`, tipo: "tarea", titulo: t.titulo || "Tarea", detalle: "Tarea del despacho", dias: q, fecha: t.fecha, nivel: q < 0 ? "bad" : "warn", quien: "despacho", euros: 0, responsable: t.resp || base.responsable || "", accion: { texto: "Hecha", dataset: { tk: "hecha", x: x.id, id: t.id } } });
  }
  return out;
}
function tkNueva(x, titulo, resp, fecha, autor) {
  const t = { id: (typeof uid === "function" ? uid() : String(Date.now())), titulo: String(titulo || "").trim(), resp: resp || "", fecha: fecha || "", hecha: null, creada: new Date().toISOString(), autor: autor || "" };
  if (!t.titulo) return null;
  x.tareasDespacho = tkLista(x).concat(t);
  return t;
}

// ── Bloque del expediente (pestaña Trámites) ──
function tkBloqueHTML(x) {
  const D = despachoCfg(), P = tkPendientes(x).sort((a, b) => (a.fecha || "9").localeCompare(b.fecha || "9")), H = tkLista(x).filter((t) => t.hecha);
  const defResp = x.responsable || D.yo || "";
  const fila = (t) => {
    const v = t.fecha ? vence({ limite: t.fecha }) : null;
    return `<div class="row ${t.hecha ? "done" : ""}"><button class="st ${t.hecha ? "hecho" : ""}" data-tk="${t.hecha ? "reabrir" : "hecha"}" data-x="${esc(x.id)}" data-id="${esc(t.id)}" aria-label="${t.hecha ? "Marcar como pendiente" : "Marcar como hecha"}">${t.hecha ? I.tick : ""}</button><span class="t"><b>${esc(t.titulo)}</b><small>${esc(abogado(t.resp)?.nombre || "Sin responsable")}${t.fecha ? ` · <span class="due ${t.hecha ? "" : v.cls}">${t.hecha ? fechaCorta(t.fecha) : esc(v.txt)}</span>` : ""}${t.hecha ? ` · hecha el ${fechaCorta(String(t.hecha).slice(0, 10))}` : ""}</small></span>${avatar(t.resp)}<button class="tbtn" data-tk="borrar" data-x="${esc(x.id)}" data-id="${esc(t.id)}" aria-label="Quitar la tarea">${I.trash}</button></div>`;
  };
  return `<div class="sectitle flex tk-h"><b>Tareas del despacho</b><span>${P.length ? plural(P.length, "pendiente") : "Ninguna pendiente"}</span></div>
    <form class="card movform tk-form" data-tkf="${esc(x.id)}"><input name="titulo" placeholder="Nueva tarea: llamar a la gestoría, revisar el cuaderno…" aria-label="Tarea" maxlength="160"><select name="resp" aria-label="Responsable"><option value="">Sin responsable</option>${D.abogados.map((a) => `<option value="${esc(a.id)}" ${a.id === defResp ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select><input name="fecha" type="date" aria-label="Fecha límite"><button class="btn sm" type="submit">Añadir</button></form>
    ${P.length ? `<div class="group tk-list" style="--inset:54px;margin-top:10px">${P.map(fila).join("")}</div>` : ""}
    ${H.length ? `<details class="tk-hechas"><summary>${plural(H.length, "tarea hecha", "tareas hechas")}</summary><div class="group" style="--inset:54px">${H.slice(-30).reverse().map(fila).join("")}</div></details>` : ""}`;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest("[data-tk]") : null; if (!b) return;
    const app = document.getElementById("app"); if (!app || !app.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    const x = (DB.expedientes || []).find((q) => q.id === b.dataset.x); if (!x) return;
    const t = tkLista(x).find((q) => q.id === b.dataset.id); if (!t) return;
    if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); return; }
    if (b.dataset.tk === "hecha") { t.hecha = new Date().toISOString(); anotar(x, `Tarea hecha: ${t.titulo}`, "nota"); toast("Tarea hecha"); }
    else if (b.dataset.tk === "reabrir") { t.hecha = null; anotar(x, `Tarea reabierta: ${t.titulo}`, "nota"); }
    else if (b.dataset.tk === "borrar") { x.tareasDespacho = tkLista(x).filter((q) => q !== t); anotar(x, `Tarea quitada: ${t.titulo}`, "nota"); }
    guardar(); if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); render();
  }, true);
  document.addEventListener("submit", (e) => {
    const f = e.target && e.target.closest ? e.target.closest("[data-tkf]") : null; if (!f) return;
    e.preventDefault(); e.stopPropagation();
    const x = (DB.expedientes || []).find((q) => q.id === f.dataset.tkf); if (!x) return;
    if (typeof licPuedeEditar === "function" && !licPuedeEditar()) { toast(licMotivoEdicion()); return; }
    const titulo = f.elements.titulo.value.trim(); if (!titulo) { toast("Escribe la tarea"); f.elements.titulo.focus(); return; }
    const t = tkNueva(x, titulo, f.elements.resp.value, f.elements.fecha.value, despachoCfg().yo || "");
    anotar(x, `Tarea: ${t.titulo}${t.resp ? " · " + (abogado(t.resp)?.nombre || "") : ""}${t.fecha ? " · para el " + fechaCorta(t.fecha) : ""}`, "nota");
    guardar(); if (typeof rdRadarInvalidar === "function") rdRadarInvalidar(); render();
    setTimeout(() => document.querySelector(`[data-tkf="${x.id}"] [name="titulo"]`)?.focus(), 0);
  }, true);
}
