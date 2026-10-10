// Servidor estático de pruebas con compresión (brotli o gzip), como sirven la app Netlify y GitHub Pages.
// python3 -m http.server no comprime: con él Lighthouse mide 3,2 MB de HTML en lugar de lo que de verdad viaja.
// Uso desde la raíz del repositorio: node tools/qa/servidor.mjs [puerto=8786] [carpeta=dist/publicar]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
import { extname, join, normalize } from "node:path";
const PUERTO = Number(process.argv[2] || 8786);
const RAIZ = normalize(process.argv[3] || "dist/publicar");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".pdf": "application/pdf", ".wasm": "application/wasm", ".txt": "text/plain; charset=utf-8" };
const COMPRIMIBLE = /^(text\/|application\/(json|manifest\+json)|image\/svg)/;
const cache = new Map();
createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let f = join(RAIZ, normalize(ruta).replace(/^(\.\.[/\\])+/, ""));
    try { if ((await stat(f)).isDirectory()) f = join(f, "index.html"); } catch (e) { res.writeHead(404); res.end("No encontrado"); return; }
    const tipo = TIPOS[extname(f)] || "application/octet-stream";
    const cuerpo = await readFile(f);
    const acepta = String(req.headers["accept-encoding"] || "");
    const cab = { "Content-Type": tipo, "Cache-Control": /\.(woff2|png|svg|jpg)$/.test(f) ? "public, max-age=31536000, immutable" : "no-cache", "X-Content-Type-Options": "nosniff" };
    if (COMPRIMIBLE.test(tipo) && cuerpo.length > 1024 && /\b(br|gzip)\b/.test(acepta)) {
      const enc = /\bbr\b/.test(acepta) ? "br" : "gzip", k = f + "|" + enc + "|" + cuerpo.length;
      if (!cache.has(k)) cache.set(k, enc === "br" ? brotliCompressSync(cuerpo, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }) : gzipSync(cuerpo, { level: 9 }));
      res.writeHead(200, { ...cab, "Content-Encoding": enc, Vary: "Accept-Encoding" }); res.end(cache.get(k)); return;
    }
    res.writeHead(200, cab); res.end(cuerpo);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PUERTO, "127.0.0.1", () => console.log(`Sirviendo ${RAIZ} en http://127.0.0.1:${PUERTO}/ (con compresión)`));
