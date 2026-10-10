// Arranque real de la app en un móvil simulado: red «4G lenta» (150 ms, 1,6 Mbit/s) y CPU 4× más lenta. Mide primer pintado, LCP, cuándo pinta la app
// (primer .shell o .bv-over). Complementa a Lighthouse (que simula la red y la CPU a partir de una carga rápida) con una carga de verdad frenada.
// Uso: node tools/qa/servidor.mjs 8786 dist/publicar &   y   node tools/qa/arranque.mjs [url=http://127.0.0.1:8786/app/] [repeticiones=3]
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
const url = process.argv[2] || "http://127.0.0.1:8786/app/"; const N = Number(process.argv[3] || 3);
const b = await chromium.launch();
const R = [];
for (let i = 0; i < N; i++) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.addInitScript(() => {
    window.__m = {}; const t = () => Math.round(performance.now());
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__m.fcp = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
    const mo = new MutationObserver(() => { if (!window.__m.app && document.querySelector("#app .shell, .bv-over")) { window.__m.app = t(); requestAnimationFrame(() => setTimeout(() => { window.__m.appPintada = t(); })); } }); mo.observe(document, { childList: true, subtree: true });
  });
  const t0 = Date.now(); await p.goto(url, { waitUntil: "load" });
  await p.waitForFunction(() => window.__m.appPintada, null, { timeout: 60000 });
  await p.waitForTimeout(500);
  const m = await p.evaluate(() => window.__m); R.push(m); console.log(JSON.stringify(m));
  await ctx.close();
}
const med = (k) => { const v = R.map((r) => r[k]).filter((x) => x != null).sort((a, b) => a - b); return v[v.length >> 1]; };
console.log("mediana:", JSON.stringify({ fcp: med("fcp"), lcp: med("lcp"), app: med("app"), appPintada: med("appPintada") }));
await b.close();
