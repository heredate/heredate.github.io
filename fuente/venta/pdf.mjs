// Genera los PDF del material comercial con Chromium (Playwright): one-pager (A4, 1 página), dossier para el despacho (A4, 8 páginas)
// y charla para el Colegio (diapositivas 1280 x 720). Cada HTML define su tamaño de página con @page; la letra es la de la marca (venta.css).
// Uso (desde la raíz):  node venta/pdf.mjs [one-pager|dossier-despacho|charla-colegio]  ·  con --png deja además una imagen de cada página
// en tools/qa/salida/venta/ para revisarla.
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ = path.resolve(AQUI, "..");
const DOCS = { "one-pager": 1, "dossier-despacho": 8, "charla-colegio": 12 }; // páginas esperadas
const pedidos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const PNG = process.argv.includes("--png");
const b = await chromium.launch();
let mal = 0;
for (const [nombre, paginas] of Object.entries(DOCS)) {
  if (pedidos.length && !pedidos.includes(nombre)) continue;
  const html = path.join(AQUI, nombre + ".html"); if (!fs.existsSync(html)) { console.log("✗ falta", html); mal++; continue; }
  const pg = await b.newPage();
  await pg.goto("file://" + html, { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  // La letra de la marca tiene que haber cargado (si no, el PDF saldría con la del sistema)
  const fuentes = await pg.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family));
  const pdf = path.join(AQUI, nombre + ".pdf");
  await pg.emulateMedia({ media: "print" });
  await pg.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  await pg.close();
  const info = execFileSync("pdfinfo", [pdf]).toString(); const n = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
  const emb = execFileSync("pdffonts", [pdf]).toString();
  const ok = n === paginas && /Hereda|Inter|SourceSerif/i.test(emb) && fuentes.length >= 1;
  if (!ok) mal++;
  console.log(`${ok ? "✓" : "✗"} ${nombre}.pdf · ${n} página${n === 1 ? "" : "s"} (esperadas ${paginas}) · ${(fs.statSync(pdf).size / 1024).toFixed(0)} KB · letra: ${[...new Set(fuentes)].join(", ") || "¡la del sistema!"}`);
  if (PNG) { const out = path.join(RAIZ, "tools/qa/salida/venta"); fs.mkdirSync(out, { recursive: true }); execFileSync("pdftoppm", ["-r", "70", "-png", pdf, path.join(out, nombre)]); }
}
await b.close();
process.exit(mal ? 1 : 0);
