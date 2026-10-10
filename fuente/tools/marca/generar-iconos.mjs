// Genera los iconos de la app a partir del monograma «H+» (icons/hereda-marca.svg): favicon.png (64), icons/apple-touch-icon.png (180,
// sin transparencia), icons/icon-192.png e icons/icon-512.png (superelipse con esquinas transparentes) e icons/maskable-512.png
// (fondo a sangre y la marca dentro de la zona segura del 80 %). Uso desde la raíz: node tools/marca/generar-iconos.mjs
import { readFileSync } from "node:fs";
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const raiz = new URL("../../", import.meta.url).pathname;
const svg = readFileSync(raiz + "icons/hereda-marca.svg", "utf8");
const sq = svg.match(/<path d="([^"]+)" fill="url\(#g\)"\/>/)[1], marca = svg.match(/<path d="([^"]+)" fill="#FFFFFF"\/>/)[1];
const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#284A75"/><stop offset="1" stop-color="#1A3352"/></linearGradient></defs>`;
const conForma = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${grad}<path d="${sq}" fill="url(#g)"/><path d="${marca}" fill="#fff"/></svg>`;
const aSangre = (escala) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${grad}<rect width="100" height="100" fill="url(#g)"/><g transform="translate(50 50) scale(${escala}) translate(-50 -50)"><path d="${marca}" fill="#fff"/></g></svg>`;
const b = await chromium.launch();
const hacer = async (archivo, lado, contenido) => {
  const p = await b.newPage({ viewport: { width: lado, height: lado } });
  await p.setContent(`<html><body style="margin:0;background:transparent">${contenido.replace("<svg ", `<svg width="${lado}" height="${lado}" `)}</body></html>`);
  await p.screenshot({ path: raiz + archivo, omitBackground: true, clip: { x: 0, y: 0, width: lado, height: lado } }); await p.close();
  console.log("✔", archivo, lado);
};
await hacer("favicon.png", 64, conForma);
await hacer("icons/icon-192.png", 192, conForma);
await hacer("icons/icon-512.png", 512, conForma);
await hacer("icons/apple-touch-icon.png", 180, aSangre(1.08));
await hacer("icons/maskable-512.png", 512, aSangre(0.82));
await b.close();
