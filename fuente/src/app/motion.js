// ───────────────────── {{MARCA}} · capa de movimiento v7 (prefijo mo/MO_) ─────────────────────
// Transiciones de vista, apertura/cierre de hojas, contadores, barras desde cero, sombras de scroll y estados vacíos.
// Aditiva: el integrador llama a moAntes() antes de render0() y a moDespues() después. Sin enlazar, la app queda como estaba.
// Nunca lanza: todo va en try/catch y tolera la ausencia de cualquier elemento.
const MO_ = { key: null, pstep: null, hadSheet: false, ghost: null, prog: null, io: null, raf: 0, t: 0, tg: 0, jobs: [],
  reduce: (() => { try { return window.matchMedia("(prefers-reduced-motion: reduce)"); } catch (e) { return { matches: false }; } })() };
const moQuieto = () => !!(MO_.reduce && MO_.reduce.matches);
const moApp = () => document.getElementById("app");
function moKey() { try { const u = typeof ui === "object" && ui ? ui : {}; return [u.vista, u.id, u.sec, u.paso, u.tv, u.sub, u.dsub, u.av, u.bn, u.cv].join("|"); } catch (e) { return ""; } }

// Antes de reconstruir el DOM: recuerda si había hoja (y guarda sus nodos para animar el cierre) y el progreso del asistente.
function moAntes() {
  try {
    const app = moApp(); if (!app) return;
    const sh = app.querySelector(".sheet"), sc = app.querySelector(".scrim"), pg = app.querySelector(".wiz .progress i");
    MO_.hadSheet = !!sh;
    MO_.ghost = sh && !sh.querySelector("iframe") && !moQuieto() ? { sh, sc } : null;
    MO_.prog = pg ? pg.style.width : null;
    if (MO_.io) { try { MO_.io.disconnect(); } catch (e) {} MO_.io = null; }
    if (MO_.raf) { cancelAnimationFrame(MO_.raf); MO_.raf = 0; }
    for (const j of MO_.jobs) { try { j.tn.data = j.orig; j.el.style.minWidth = ""; } catch (e) {} }
    MO_.jobs = [];
  } catch (e) {}
}

// Después de reconstruir: decide qué se anima según lo que ha cambiado (vista, paso de partición, hoja).
function moDespues() {
  try {
    const html = document.documentElement, app = moApp(); if (!app) return;
    html.classList.add("mo");
    const k = moKey(), nav = k !== MO_.key; MO_.key = k;
    let ps = null; try { ps = ui.pstep; } catch (e) {}
    const paso = !nav && ps !== MO_.pstep; MO_.pstep = ps;
    const sh = app.querySelector(".sheet"), has = !!sh, abre = has && !MO_.hadSheet;
    html.classList.toggle("mo-nav", nav && !html.dataset.vt); html.classList.toggle("mo-step", paso); html.classList.toggle("mo-sheet", abre);
    if (MO_.hadSheet && !has) moCerrarFantasma();
    MO_.hadSheet = has; MO_.ghost = null;
    clearTimeout(MO_.t); MO_.t = setTimeout(() => html.classList.remove("mo-nav", "mo-step", "mo-sheet"), 700);
    moVacios();
    if (!moQuieto()) { if (nav || abre) moBarras(nav ? app : sh); if (nav) moContar(app); moProgreso(app); }
    moSombras(app);
    moIndicador(app); moPulso(app);
    // Al cambiar de vista, si el foco se ha perdido (estaba en lo que se repintó), pasa al contenido: el siguiente Tab sigue
    // desde ahí y el lector de pantalla anuncia la vista nueva (y no salta al cronómetro flotante del final del documento).
    if (nav) { const a = document.activeElement; if (!a || a === document.body) { const m = app.querySelector(".main > .page, .wiz"); if (m) { if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1"); try { m.focus({ preventScroll: true }); } catch (e) {} } } }
  } catch (e) {}
}

// Arriba: suave si estamos cerca, inmediato si hay mucho recorrido (no se ve pasar el contenido antiguo).
function moTop() {
  try { if (window.scrollY > 0 && window.scrollY < 600 && !moQuieto()) window.scrollTo({ top: 0, behavior: "smooth" }); else window.scrollTo(0, 0); } catch (e) { try { window.scrollTo(0, 0); } catch (e2) {} }
}

// Cierre de hoja: los nodos salientes se cuelgan del body, inertes, y se animan hacia fuera.
function moCerrarFantasma() {
  const g = MO_.ghost; if (!g || !g.sh) return;
  try {
    document.querySelectorAll("body > .mo-ghost").forEach((n) => n.remove());
    for (const n of [g.sc, g.sh]) { if (!n) continue; n.classList.add("mo-ghost", "mo-out"); n.setAttribute("aria-hidden", "true"); n.removeAttribute("role"); n.removeAttribute("aria-modal"); n.querySelectorAll("input,select,textarea,button,a").forEach((x) => { x.tabIndex = -1; }); document.body.appendChild(n); }
    clearTimeout(MO_.tg); MO_.tg = setTimeout(() => document.querySelectorAll("body > .mo-ghost").forEach((n) => n.remove()), 320);
  } catch (e) { try { document.querySelectorAll("body > .mo-ghost").forEach((n) => n.remove()); } catch (e2) {} }
}

// Barra de progreso del asistente: crece desde el valor anterior en vez de aparecer ya llena.
function moProgreso(app) {
  try {
    const pg = app.querySelector(".wiz .progress i"); if (!pg || MO_.prog == null || MO_.prog === pg.style.width) return;
    const nw = pg.style.width; pg.style.transition = "none"; pg.style.width = MO_.prog;
    requestAnimationFrame(() => { pg.style.transition = ""; pg.style.width = nw; });
  } catch (e) {}
}

// Barras y anillos: parten de cero y crecen cuando entran en pantalla (IntersectionObserver, una sola instancia).
const MO_BARRAS = ".pb .bar i,.sr-b i,.cmp-r .t i,.pt-b > span,.pinv .pi-b i,.pstack,.prow-bar,.pl-bar,.fm-b > span,.mbar i,.hbar .track i,.gantt .bar";
function moBarras(root) {
  try {
    const bars = [...root.querySelectorAll(MO_BARRAS)].slice(0, 160), rings = [...root.querySelectorAll(".ring .fg")].slice(0, 8);
    if (!bars.length && !rings.length) return;
    for (const b of bars) b.classList.add("mo-b0");
    for (const r of rings) { const c = r.getAttribute("stroke-dasharray"); if (c) { r.dataset.moC = c; r.style.strokeDashoffset = c; } }
    const fin = (el) => requestAnimationFrame(() => requestAnimationFrame(() => { try { if (el.classList.contains("mo-b0")) el.classList.add("mo-b1"); else if (el.dataset.moC) el.style.strokeDashoffset = ""; } catch (e) {} }));
    if (typeof IntersectionObserver !== "function") { [...bars, ...rings].forEach(fin); return; }
    // Se observa el contenedor de cada barra: una barra a escala 0 no tiene área y el observador nunca la daba por visible
    const dueno = new Map();
    for (const el of [...bars, ...rings]) { const o = (bars.includes(el) && el.parentElement) || el; if (!dueno.has(o)) dueno.set(o, []); dueno.get(o).push(el); }
    MO_.io = new IntersectionObserver((es, io) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); (dueno.get(e.target) || [e.target]).forEach(fin); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    [...dueno.keys()].forEach((el) => MO_.io.observe(el));
  } catch (e) {}
}

// Contador de cifras: 400 ms, curva de salida, números tabulares; se reserva el ancho para que nada baile.
const MO_CIFRAS = ".kpi b,.heir .top .amt,.fc-h .amt,.hero-save b,.tram-head .stats b,.next .days,.card .big,.card .mid,.pl-n b,.tile b,.hpills button b,.sim-tot b,.lever.si .sv";
const MO_RE = /^(\s*[−-]?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(\s*(?:€|%)?\s*)$/;
function moFmt(n, dec) { const [i, d] = n.toFixed(dec).split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? "," + d : ""); }
function moContar(root) {
  try {
    const jobs = [];
    for (const el of [...root.querySelectorAll(MO_CIFRAS)].slice(0, 28)) {
      // K4: los importes y porcentajes no se animan. Se comparan con su subtítulo («Sucesiones … · plusvalía …») y con otras cifras
      // de la pantalla; a medio contar (o en una captura o una impresión en ese momento) parecían errores. Solo cuentan los números enteros.
      if (/[€%]/.test(el.textContent || "")) continue;
      const tn = [...el.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.data)); if (!tn) continue;
      const m = MO_RE.exec(tn.data); if (!m) continue;
      const v = parseFloat(m[2].replace(/\./g, "") + (m[3] ? "." + m[3].slice(1) : "")); if (!v || !isFinite(v)) continue;
      jobs.push({ el, tn, v, dec: m[3] ? m[3].length - 1 : 0, pre: m[1], suf: m[4], orig: tn.data, w: 0 });
    }
    if (!jobs.length) return;
    for (const j of jobs) j.w = j.el.getBoundingClientRect().width; // una sola lectura de layout, luego solo escrituras
    for (const j of jobs) { if (j.w) j.el.style.minWidth = Math.ceil(j.w) + "px"; j.tn.data = j.pre + moFmt(j.v * 0.35, j.dec) + j.suf; }
    MO_.jobs = jobs;
    const t0 = performance.now(), D = 400;
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3);
      for (const j of MO_.jobs) { if (!j.el.isConnected) continue; j.tn.data = p >= 1 ? j.orig : j.pre + moFmt(j.v * (0.35 + 0.65 * e), j.dec) + j.suf; if (p >= 1) j.el.style.minWidth = ""; }
      if (p < 1) MO_.raf = requestAnimationFrame(paso); else { MO_.raf = 0; MO_.jobs = []; }
    };
    MO_.raf = requestAnimationFrame(paso);
  } catch (e) {}
}

// Antes de imprimir (o de una captura con Ctrl+P), las cifras que aún se estén contando quedan en su valor final
function moTerminarCuentas() { try { if (MO_.raf) { cancelAnimationFrame(MO_.raf); MO_.raf = 0; } for (const j of MO_.jobs) { try { j.tn.data = j.orig; j.el.style.minWidth = ""; } catch (e) {} } MO_.jobs = []; } catch (e) {} }
try { window.addEventListener("beforeprint", moTerminarCuentas); } catch (e) {}
// Sombras de scroll en tablas anchas (.tablewrap): clases mo-l / mo-r según quede contenido a cada lado.
function moSombras(root) {
  try {
    for (const w of root.querySelectorAll(".tablewrap")) {
      if (w.dataset.mo) continue; w.dataset.mo = "1";
      const upd = () => { try { w.classList.toggle("mo-l", w.scrollLeft > 2); w.classList.toggle("mo-r", w.scrollLeft + w.clientWidth < w.scrollWidth - 2); } catch (e) {} };
      w.addEventListener("scroll", upd, { passive: true }); requestAnimationFrame(upd);
    }
  } catch (e) {}
}

// Estados vacíos: sustituye avisos de texto suelto por disco tintado + título + una línea + una acción. Selectores tratados:
//  a) .tablewrap table.grid-t tbody vacío → cartera sin resultados · b) .board .col > p.board-empty → columna sin expedientes
//  c) p.caption "Sin resultados." (biblioteca) · d) "Sin movimientos…" · e) "Sin actividad registrada." · f) "Sin documentos…" (esqueleto si el archivo aún carga)
const MO_ICO = (n) => { try { return (typeof I === "object" && I && I[n]) || ""; } catch (e) { return ""; } };
const MO_ACC = { limpiar: "Borrar la búsqueda", concepto: "Anotar el primer movimiento", nota: "Anotar algo", subir: "Elegir archivos" };
const moEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const moVacioHTML = (ico, tit, txt, act, cls) => `<div class="mo-empty ${cls || ""}" data-mo="1"><span class="mo-disc">${MO_ICO(ico)}</span><b>${tit}</b>${txt ? `<span>${txt}</span>` : ""}${act ? `<button type="button" class="btn sm gray" data-mo-act="${act}">${MO_ACC[act]}</button>` : ""}</div>`;
function moVacios() {
  try {
    const app = moApp(); if (!app || app.querySelector("[data-mo]")) return; // idempotente
    const u = (() => { try { return ui; } catch (e) { return {}; } })();
    for (const tb of app.querySelectorAll(".tablewrap table.grid-t tbody")) {
      if (tb.children.length || tb.textContent.trim()) continue;
      const q = u.q || "";
      tb.closest(".tablewrap").insertAdjacentHTML("beforeend", moVacioHTML("search", q ? "Sin resultados" : "Sin expedientes", q ? `Ningún expediente coincide con «${moEsc(q)}».` : "Los expedientes de la cartera aparecerán aquí.", q ? "limpiar" : ""));
    }
    for (const p of app.querySelectorAll(".board .col > p.board-empty")) p.outerHTML = moVacioHTML("folder", "Nada en esta fase", "", "", "mini");
    let carga = false; try { carga = typeof ARCH === "object" && ARCH && ARCH.listo === false; } catch (e) {}
    for (const p of app.querySelectorAll("p.caption")) {
      const t = p.textContent.trim();
      if (/^Sin resultados\.?$/.test(t) && p.closest(".page")) { const q = u.bq || ""; p.outerHTML = moVacioHTML("search", "Sin resultados", q ? `Ninguna norma coincide con «${moEsc(q)}».` : "Ninguna norma coincide con la búsqueda.", q ? "limpiar" : ""); }
      else if (/^Sin movimientos/.test(t)) p.outerHTML = moVacioHTML("brief", "Sin movimientos", "Registra la provisión de fondos y cada pago hecho por cuenta del cliente.", document.getElementById("m-c") ? "concepto" : "");
      else if (/^Sin actividad registrada/.test(t)) p.outerHTML = moVacioHTML("doc", "Sin actividad", "Las anotaciones, cambios de fase y trámites quedan aquí con fecha y autor.", document.getElementById("n-t") ? "nota" : "", p.closest(".card") ? "mini" : "");
      else if (/^Sin documentos/.test(t)) p.outerHTML = carga ? `<div class="mo-skel" data-mo="1" aria-hidden="true" style="margin-top:14px"></div>` : moVacioHTML("folder", "Sin documentos", "Se clasifican solos por el nombre del archivo: DNI, defunción, testamento, bancos, inmuebles, impuestos.", app.querySelector(".drop input[type=file]") ? "subir" : "");
    }
  } catch (e) {}
}
// Acciones de los estados vacíos (los botones no llevan data-act, así que ui.js los ignora).
document.addEventListener("click", (e) => {
  try {
    const b = e.target && e.target.closest ? e.target.closest("[data-mo-act]") : null; if (!b) return;
    const a = b.dataset.moAct, $ = (id) => document.getElementById(id);
    if (a === "limpiar") { try { if (ui.vista === "biblio") ui.bq = ""; else ui.q = ""; } catch (err) {} if (typeof render === "function") render(); const s = $("h-q") || $("b-q") || $("s-q"); if (s) s.focus(); }
    else if (a === "concepto") { const i = $("m-c"); if (i) i.focus(); }
    else if (a === "nota") { const i = $("n-t"); if (i) i.focus(); }
    else if (a === "subir") { const i = document.querySelector("#app .drop input[type=file]"); if (i) i.click(); }
  } catch (err) {}
});

// ───────────────────── v9 · transiciones entre vistas, respuesta al gesto y salto al contenido ─────────────────────
// View Transitions API (Chrome/Edge 111+, Safari 18+): al cambiar de vista o de sección, la página se funde en ~¼ s y la
// marca de la pestaña activa se desliza hasta la nueva. Sin la API, o con «reducir movimiento», se pinta al momento como siempre.
// render() llama a moVT(render) al principio: si devuelve true, el repintado irá dentro de la transición (un fotograma después).
// Solo para gestos reales: el repintado programático sigue siendo síncrono.
MO_.vtPend = false; MO_.enVT = false; MO_.toque = null;
function moVTTipo(k, prev) {
  const a = String(k).split("|"), b = String(prev).split("|");
  return a[0] === b[0] && a[1] === b[1] && a[0] === "exp" ? "sec" : "vista";
}
function moVT(fn) {
  try {
    if (MO_.enVT) return false;
    if (MO_.vtPend) return true; // ya hay una en espera: pintará el estado más reciente
    if (typeof document.startViewTransition !== "function" || moQuieto() || document.hidden) return false;
    // Solo cuando la navegación la pide una persona (clic o tecla de verdad). Lo programático (guías, pruebas, go() desde
    // otro módulo) se pinta en el acto: quien llama puede contar con el DOM nuevo nada más volver.
    const ev = window.event; if (!ev || !ev.isTrusted || !/^(click|keydown|keyup|pointerup|submit)$/.test(ev.type)) return false;
    const k = moKey(); if (MO_.key == null || k === MO_.key) return false;
    const u = typeof ui === "object" && ui ? ui : {};
    const app = moApp(); if (!app || u.sheet || app.querySelector(".sheet")) return false; // las hojas tienen su propia animación
    if (u.vista === "asist" || String(MO_.key).indexOf("asist|") === 0) return false; // el asistente es de teclear: sus pasos tienen su propia entrada
    const html = document.documentElement; html.dataset.vt = moVTTipo(k, MO_.key);
    MO_.vtPend = true;
    const t = document.startViewTransition(() => { MO_.vtPend = false; MO_.enVT = true; try { fn(); } finally { MO_.enVT = false; } });
    const fin = () => { if (!MO_.vtPend) delete html.dataset.vt; };
    t.finished.then(fin, fin);
    return true;
  } catch (e) { MO_.vtPend = false; MO_.enVT = false; try { delete document.documentElement.dataset.vt; } catch (e2) {} return false; }
}

// Marca de la pestaña activa: un elemento propio (no un ::after) para que la transición pueda deslizarlo de una pestaña a otra.
function moIndicador(app) {
  try {
    for (const nav of app.querySelectorAll(".secnav")) {
      const b = nav.querySelector('[aria-current="page"]'); if (!b || b.querySelector(".sn-ind")) continue;
      b.insertAdjacentHTML("beforeend", '<i class="sn-ind" aria-hidden="true"></i>');
    }
  } catch (e) {}
}

// Respuesta al gesto: el repintado sustituye el DOM y las transiciones CSS no llegan a verse. Se recuerda el control pulsado
// (por sus atributos data-*, como hace el foco) y, tras repintar, el control nuevo recibe .mo-pulso durante un instante.
const MO_PULSO = '.st[data-tst],.switch input,[data-hecho],[data-tchk],.chk,input[type="checkbox"][data-lecsel],.seg button,.chip-r,.btn';
function moRecordar(e) {
  try {
    const t = e.target && e.target.closest ? e.target.closest(MO_PULSO) : null; if (!t || !moApp() || !moApp().contains(t)) { MO_.toque = null; return; }
    const c = typeof rdClave === "function" ? rdClave(t) : null; MO_.toque = c ? { ...c, t: performance.now() } : null;
  } catch (err) { MO_.toque = null; }
}
document.addEventListener("click", moRecordar, true);
document.addEventListener("change", moRecordar, true);
function moPulso(app) {
  try {
    const q = MO_.toque; if (!q || performance.now() - q.t > 1500 || moQuieto()) return;
    MO_.toque = null;
    const n = app.querySelectorAll(q.sel)[q.i]; if (!n) return;
    n.classList.add("mo-pulso"); setTimeout(() => { try { n.classList.remove("mo-pulso"); } catch (e) {} }, 700);
  } catch (e) {}
}

// Ir al contenido (primer elemento enfocable de la app): salta la barra lateral con el teclado.
document.addEventListener("click", (e) => {
  try {
    if (!e.target.closest || !e.target.closest("[data-mo-salto]")) return;
    const m = document.querySelector("#app .main .page, #app .wiz, #app main"); if (!m) return;
    if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1");
    m.focus({ preventScroll: false });
  } catch (err) {}
});
