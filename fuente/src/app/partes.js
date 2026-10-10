// ───────────────────── {{MARCA}} · partes que se cargan bajo demanda (rendimiento en el móvil) ─────────────────────
// En la app publicada (app/index.html), lo que no hace falta para arrancar no va dentro del HTML: la calculadora para la web del despacho,
// el cuestionario y la carpeta de la familia, la lista de los 8.132 municipios, la biblioteca normativa y los mapas. Están en app/partes/
// (build.py) y se piden al usarlos y, sin prisa, cuando el navegador queda libre tras arrancar. El service worker las guarda con la app,
// así que también funcionan sin conexión. El archivo único (dist/Hereda-piloto.html) y la versión para Claude las llevan dentro:
// ahí heredaParte() resuelve al momento.
// Mientras una parte no ha llegado, las variables tienen un valor vacío (BIBLIO.pendiente, MUNI_ES.m = [], MAPA_ES = null…) y quien
// las pinta llama a heredaParteYRepintar(): al llegar, se vuelve a pintar.
const PARTES_LISTAS = {
  municipios: () => MUNI_ES.m.length > 0,
  biblioteca: () => !BIBLIO.pendiente,
  mapas: () => !!MAPA_ES && !!MAPA_AND,
  carpeta: () => typeof CARPETA_HTML === "string",
  familia: () => typeof FAMILIA_HTML === "string",
  calculadora: () => typeof CALCULADORA_HTML === "string",
};
const PARTES = { prom: {}, cfg: typeof HEREDA_PARTES === "object" && HEREDA_PARTES ? HEREDA_PARTES : null };
function heredaParteLista(n) { try { return !!PARTES_LISTAS[n](); } catch (e) { return false; } }
function heredaParte(n) {
  if (heredaParteLista(n)) return Promise.resolve(true);
  if (PARTES.prom[n]) return PARTES.prom[n];
  const url = PARTES.cfg && PARTES.cfg.archivos && PARTES.cfg.archivos[n];
  if (!url || typeof document === "undefined") return Promise.resolve(false);
  return (PARTES.prom[n] = new Promise((res) => {
    const s = document.createElement("script"); s.src = url; s.async = true;
    s.onload = () => res(heredaParteLista(n));
    s.onerror = () => { delete PARTES.prom[n]; s.remove(); res(false); };
    document.head.appendChild(s);
  }));
}
const heredaPartes = (L) => Promise.all(L.map(heredaParte)).then((r) => r.every(Boolean));
// Para quien pinta: true si ya está; si no, la pide y repinta al llegar
function heredaParteYRepintar(n) {
  if (heredaParteLista(n)) return true;
  heredaParte(n).then((ok) => { if (ok && typeof render === "function") { try { render(); } catch (e) {} } });
  return false;
}
// Precarga en segundo plano, una a una, cuando el navegador está libre (no compite con el primer pintado)
function heredaPartesPrecargar() {
  if (!PARTES.cfg) return;
  const L = ["municipios", "biblioteca", "mapas", "carpeta", "familia", "calculadora"];
  const ocioso = (f) => (typeof requestIdleCallback === "function" ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 300));
  const sig = () => { const n = L.shift(); if (n) heredaParte(n).then(() => ocioso(sig)); };
  setTimeout(() => ocioso(sig), 3000);
}
// Copia íntegra para «Enviar a un compañero»: el HTML tal como se cargó más las partes, dentro (funciona sin servidor)
async function heredaHTMLCompleto() {
  if (!PARTES.cfg) return HTML_ORIGINAL;
  if (!/data-nucleo=/.test(HTML_ORIGINAL) && Object.keys(PARTES_LISTAS).every(heredaParteLista)) return HTML_ORIGINAL; // ya es una copia completa
  const leer = (u) => fetch(u).then((r) => (r.ok ? r.text() : Promise.reject(new Error(u)))).catch(() => null);
  const L = Object.keys(PARTES_LISTAS), N = PARTES.cfg.nucleo || [];
  const [txt, nuc] = await Promise.all([Promise.all(L.map((n) => leer(PARTES.cfg.archivos[n]))), Promise.all(N.map(leer))]);
  if (txt.some((t) => t == null) || nuc.some((t) => t == null)) return "";
  const ab = "<" + "script>", ce = "<" + "/script>", fin = "<" + "/body>"; // partidas: la etiqueta de cierre literal cerraría el script de la app
  const dentro = (t) => ab + "\n" + t.replace(/<\/(script)/gi, "<\\/$1") + "\n" + ce;
  let h = HTML_ORIGINAL.replace(/<script data-nucleo-cargador>[\s\S]*?<\/script>/, ""); // el cargador del núcleo sobra: el núcleo va dentro
  // Los dos scripts del núcleo (app/nucleo, con defer) vuelven a ir dentro, en su sitio
  N.forEach((u, i) => { const k = (/nucleo\/(\w+)\.js/.exec(u) || [])[1]; h = h.replace(new RegExp("<script[^>]*data-nucleo=\"" + k + "\"[^>]*>\\s*" + "<" + "/script>"), () => dentro(nuc[i])); });
  const i = h.lastIndexOf(fin); if (i < 0) return "";
  return h.slice(0, i) + txt.map(dentro).join("\n") + "\n" + h.slice(i);
}
if (typeof window !== "undefined") {
  if (PARTES.cfg) { if (document.readyState === "complete") heredaPartesPrecargar(); else window.addEventListener("load", heredaPartesPrecargar); } // el núcleo se carga tras el primer pintado: el «load» puede haber pasado ya
  // El lector deduce la comunidad por el municipio: necesita la lista de municipios antes de leer
  if (typeof lecLeerArchivos === "function") { const f = lecLeerArchivos; window.lecLeerArchivos = async function (...a) { await heredaParte("municipios"); return f.apply(this, a); }; }
  // Descargas que usan una parte: se espera a tenerla (la primera vez, sin conexión y sin service worker, avisan si no llega)
  const conPartes = (nombre, L, aviso) => { const f = window[nombre]; if (typeof f !== "function") return; window[nombre] = async function (...a) { if (!(await heredaPartes(L))) { if (typeof toast === "function") toast(aviso); return false; } return f.apply(this, a); }; };
  conPartes("descargarCuestionario", ["familia", "municipios"], "No se pudo cargar el cuestionario: comprueba la conexión");
  conPartes("carpetaDescargar", ["carpeta"], "No se pudo cargar la plantilla de la carpeta: comprueba la conexión");
}
