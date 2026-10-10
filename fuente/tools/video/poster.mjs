// Póster del vídeo y de la portada: el expediente del caso 1 recién creado desde sus 26 documentos, sin cursor ni rótulos, a 1920 x 1080.
// Uso (con la app servida): node tools/video/poster.mjs [puerto]  →  tools/video/salida/poster.png (montar.mjs lo convierte en JPG y WebP)
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
const RAIZ = path.resolve(new URL("../..", import.meta.url).pathname);
const PUERTO = process.argv.find((a) => /^\d+$/.test(a)) || "8807";
const CASO = path.join(RAIZ, "tools/ejemplos/salida/caso1-testamento-malaga");
const b = await chromium.launch({ args: ["--force-device-scale-factor=1.3333333", "--window-size=1440,810", "--force-color-profile=srgb", "--hide-scrollbars"] });
const ctx = await b.newContext({ viewport: null, locale: "es-ES", timezoneId: "Europe/Madrid", colorScheme: "light" });
const pg = await ctx.newPage();
await pg.clock.install({ time: new Date("2026-10-07T09:40:00+02:00") });
await pg.goto(`http://127.0.0.1:${PUERTO}/app/`);
await pg.waitForFunction(() => typeof demoCargar === "function" && typeof lecNuevoDesdeArchivos === "function", null, { timeout: 60000 });
await pg.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); if (typeof dmGuionCerrar === "function") dmGuionCerrar(); go({ vista: "inicio", sheet: null }); });
const L = fs.readdirSync(CASO).filter((f) => !f.startsWith("_")).sort().map((f) => ({ n: f, b: fs.readFileSync(path.join(CASO, f)).toString("base64") }));
await pg.evaluate((L) => { const M = { pdf: "application/pdf", jpg: "image/jpeg", txt: "text/plain" }; lecNuevoDesdeArchivos(L.map((f) => new File([Uint8Array.from(atob(f.b), (c) => c.charCodeAt(0))], f.n, { type: M[f.n.split(".").pop()] || "" }))); }, L);
await pg.waitForSelector(".lec-sheet .lec-row", { timeout: 900000 });
await pg.click('[data-act="lecAplicar"]');
await pg.waitForTimeout(3500); // que se vaya el aviso «datos cargados»
await pg.mouse.move(5, 400);
fs.mkdirSync(path.join(RAIZ, "tools/video/salida"), { recursive: true });
await pg.screenshot({ path: path.join(RAIZ, "tools/video/salida/poster.png") });
await b.close();
console.log("Póster: tools/video/salida/poster.png");
