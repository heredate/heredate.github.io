// Lighthouse de la app (escritorio y móvil) con el Chromium de Playwright.
// Uso desde la raíz, con la app construida (python3 src/build.py) y servida CON compresión, como en producción:
//   node tools/qa/servidor.mjs 8786 dist/publicar &      (python3 -m http.server no comprime: mediría 3,2 MB en vez de ~0,6)
//   node tools/qa/lighthouse.mjs [url=http://127.0.0.1:8786/app/] [--json salida.json] [--veces N] [--solo mobile|desktop]
// --veces N: repite cada medición N veces y da la mediana (en una máquina compartida las tareas largas varían mucho de una pasada a otra)
// Requiere (cd tools/qa && npm install). Navegador: CHROME_PATH, o el Chromium de Playwright en /opt/pw-browsers.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
const args = process.argv.slice(2);
const URL_APP = args.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8786/app/";
const i = args.indexOf("--json"), SALIDA = i >= 0 ? args[i + 1] : null;
const iv = args.indexOf("--veces"), VECES = iv >= 0 ? Math.max(1, Number(args[iv + 1]) || 1) : 1;
const is = args.indexOf("--solo"), SOLO = is >= 0 ? args[is + 1] : "";
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const aqui = new URL("./", import.meta.url).pathname;
let chrome = process.env.CHROME_PATH;
if (!chrome) { const d = "/opt/pw-browsers"; const c = existsSync(d) ? readdirSync(d).filter((n) => /^chromium-\d+$/.test(n)).sort().pop() : null; if (c) chrome = `${d}/${c}/chrome-linux/chrome`; }
if (!chrome) { console.error("No encuentro Chromium: indica CHROME_PATH"); process.exit(2); }
mkdirSync(aqui + "salida", { recursive: true });
const res = {};
for (const modo of ["desktop", "mobile"].filter((m) => !SOLO || m === SOLO)) {
  const pasadas = [];
  for (let v = 0; v < VECES; v++) {
    const out = `${aqui}salida/lh-${modo}${VECES > 1 ? "-" + (v + 1) : ""}.json`;
    const flags = [URL_APP, "--output=json", `--output-path=${out}`, "--quiet", `--chrome-flags=--headless=new --no-sandbox`, "--only-categories=performance,accessibility,best-practices"];
    if (modo === "desktop") flags.push("--preset=desktop");
    execFileSync(aqui + "node_modules/.bin/lighthouse", flags, { env: { ...process.env, CHROME_PATH: chrome }, stdio: "inherit" });
    const d = JSON.parse(readFileSync(out, "utf8"));
    const cat = Object.fromEntries(Object.entries(d.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const num = Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"].map((k) => [k, d.audits[k].numericValue]));
    const met = Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"].map((k) => [k, d.audits[k].displayValue]));
    const fallos = [];
    for (const [k, v] of Object.entries(d.categories)) for (const r of v.auditRefs) { const a = d.audits[r.id]; if (a.score !== null && a.score < 1 && r.weight > 0) fallos.push(`${k}: ${r.id} (${a.displayValue || a.score})`); }
    pasadas.push({ cat, num, met, fallos });
    if (VECES > 1) console.log(`  ${modo} pasada ${v + 1}: ${JSON.stringify(cat)} ${JSON.stringify(met)}`);
  }
  const cat = Object.fromEntries(Object.keys(pasadas[0].cat).map((k) => [k, mediana(pasadas.map((p) => p.cat[k]))]));
  const fmt = (k, v) => (k === "cumulative-layout-shift" ? String(Math.round(v * 1000) / 1000) : k === "total-blocking-time" ? `${Math.round(v / 10) * 10} ms` : `${(v / 1000).toFixed(1)} s`);
  const met = VECES > 1 ? Object.fromEntries(Object.keys(pasadas[0].num).map((k) => [k, fmt(k, mediana(pasadas.map((p) => p.num[k])))])) : pasadas[0].met;
  const fallos = pasadas[pasadas.length - 1].fallos;
  res[modo] = { categorias: cat, metricas: met, pendiente: fallos, ...(VECES > 1 ? { pasadas: pasadas.map((p) => p.cat.performance) } : {}) };
  console.log(`\n${modo}${VECES > 1 ? ` (mediana de ${VECES})` : ""}: ${JSON.stringify(cat)}\n  ${JSON.stringify(met)}\n  ${fallos.join("\n  ") || "sin auditorías pendientes"}`);
}
if (SALIDA) writeFileSync(SALIDA, JSON.stringify({ fecha: new Date().toISOString(), url: URL_APP, ...res }, null, 1));
