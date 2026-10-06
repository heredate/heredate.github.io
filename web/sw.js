// Hereda+ · service worker. Red primero (con conexión, siempre lo último publicado) y copia local sin conexión.
// Versión: build.py sustituye 202610061136 por la versión de la construcción (así cada publicación cambia este archivo
// y el navegador detecta la actualización). En desarrollo se usa ?v= del registro.
// Cada versión tiene su propia caché. La nueva NO se activa sola: espera a que la app (seguridad.js) pida «activar»
// cuando el usuario pulsa «Actualizar», o a que se cierren todas las pestañas.
const BUILD = "202610061136";
const V = BUILD.indexOf("__") === 0 ? (new URL(self.location.href).searchParams.get("v") || "dev") : BUILD;
const CACHE = "hereda-" + V;
const ESENCIAL = ["/Claude/app/"];
const OPCIONAL = ["/Claude/", "/Claude/manifest.webmanifest", "/Claude/favicon.png", "/Claude/icons/icon-192.png", "/Claude/icons/icon-512.png", "/Claude/icons/apple-touch-icon.png"];
const fresco = (u) => new Request(u, { cache: "reload" });

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(ESENCIAL.map(fresco));                     // sin la app no hay versión nueva
    await Promise.all(OPCIONAL.map((u) => fetch(fresco(u)).then((r) => (r.ok && !r.redirected ? c.put(u, r) : null)).catch(() => null)));
  }));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && (k.indexOf("hereda-") === 0 || k.indexOf("app-v") === 0)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.hereda === "version" && e.ports && e.ports[0]) e.ports[0].postMessage({ version: V });
  if (d.hereda === "activar") self.skipWaiting();
});
// Clave de caché: las páginas se guardan por ruta, sin ?consulta ni #fragmento (la calculadora y el cuestionario leen
// su configuración en el navegador), y /app se normaliza a /app/.
function clave(u, pagina) {
  if (!pagina) return u.href;
  let p = u.pathname; if (!/\.[a-z0-9]+$/i.test(p) && !p.endsWith("/")) p += "/";
  return u.origin + p;
}
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || r.headers.has("range")) return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname === "/Claude/sw.js") return;
  const pagina = r.mode === "navigate" || (r.headers.get("accept") || "").indexOf("text/html") >= 0;
  const k = clave(u, pagina);
  e.respondWith((async () => {
    try {
      const res = await fetch(r);
      // Solo respuestas correctas, propias y sin redirección (una redirección guardada rompe la navegación sin conexión)
      if (res.ok && res.type === "basic" && !res.redirected && !/no-store/i.test(res.headers.get("cache-control") || "")) {
        const copia = res.clone(); caches.open(CACHE).then((c) => c.put(k, copia)).catch(() => {});
      }
      return res;
    } catch (err) {
      const c = await caches.open(CACHE);
      const m = (await c.match(k)) || (await caches.match(k));
      if (m) return m;
      // Sin conexión y sin copia: solo la propia app cae en la app; la calculadora, el cuestionario o una imagen nunca reciben la app
      if (pagina && (u.pathname === "/app" || u.pathname.indexOf("/app/") === 0)) { const a = await c.match(u.origin + "/app/"); if (a) return a; }
      return Response.error();
    }
  })());
});
