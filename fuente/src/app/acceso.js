// ───────────────────── {{MARCA}} · pase de accesibilidad tras cada repintado (prefijo ac) ─────────────────────
// Completa lo que las plantillas no dicen, sin tocar su marcado ni sus atributos data-*:
//  1. Controles sin nombre accesible (interruptores, casillas, deslizadores): toman el texto de su fila.
//  2. Zonas con desplazamiento propio y nada enfocable dentro (tablas anchas, árbol, hojas de solo lectura): se pueden
//     enfocar para desplazarlas con el teclado (WCAG 2.1.1) y se anuncian como región con su título.
// Idempotente y tolerante: nunca lanza.
const AC_DESPL = ".tablewrap,.tree-wrap,.sc-tw,.sheet .body,.imp-scroll,.gantt-wrap,.rn-scroll,.cal-wrap,.bv-stage";
const AC_ENFOCABLE = "a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1']),summary";
// El nombre se da con aria-labelledby (apuntando al texto visible de la fila), nunca con aria-label: así el selector con
// que ui.js recupera el foco tras repintar (rdClave: data-*, name, aria-label, type) no cambia entre un pintado y otro.
let AC_N = 0;
function acEtiquetaFila(n) {
  const sw = n.closest("label.switch"), base = (sw && sw.parentElement) || n.parentElement || n;
  const f = base.closest(".row,.field,.lever,li,tr,.lec-row,.rn-opt,label:not(.switch),.fx,.sim-row,.opt");
  if (!f) return null;
  const c = f.querySelector(".t b,.t,b,strong,.k,label:not(.switch),span:not(.switch):not(:empty)");
  return c && c.textContent.trim() ? c : null;
}
function acNombre(n) {
  if (n.getAttribute("aria-label") || n.getAttribute("aria-labelledby") || n.title) return true;
  try { if (n.labels && [...n.labels].some((l) => l.textContent.trim())) return true; } catch (e) {}
  return false;
}
function acPase(root) {
  try {
    root = root || document.getElementById("app"); if (!root) return;
    for (const n of root.querySelectorAll("input:not([type=hidden]),select,textarea")) {
      if (acNombre(n)) continue;
      const e = acEtiquetaFila(n);
      if (e) { if (!e.id) e.id = "ac-n" + ++AC_N; n.setAttribute("aria-labelledby", e.id); }
      else if (n.placeholder) n.title = n.placeholder;
    }
    for (const z of root.querySelectorAll(AC_DESPL)) {
      const desborda = z.scrollWidth > z.clientWidth + 1 || z.scrollHeight > z.clientHeight + 1;
      if (!desborda || z.hasAttribute("tabindex") || z.querySelector(AC_ENFOCABLE)) continue;
      z.setAttribute("tabindex", "0");
      if (!z.getAttribute("role")) z.setAttribute("role", "region");
      if (!z.getAttribute("aria-label")) {
        const h = z.closest(".sheet") ? z.closest(".sheet").getAttribute("aria-label") : (z.closest(".card,section,.page") || root).querySelector("h1,h2,h3,.card-h h3,.sectitle b,.ltitle");
        z.setAttribute("aria-label", (typeof h === "string" ? h : h && h.textContent.trim()) || "Contenido desplazable");
      }
    }
  } catch (e) {}
}
