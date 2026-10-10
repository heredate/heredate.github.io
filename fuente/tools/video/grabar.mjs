// Graba el vídeo de demostración de Hereda+ con la app real (Playwright, Chromium), fotograma a fotograma.
// Flujo: despacho de demostración → «Desde documentos» → se arrastran los 26 documentos ficticios del caso 1 → propuestas leídas →
// expediente calculado → Impuestos (Sucesiones y plusvalía) → Mi día → cifras del 650 → informe en PDF.
// El cursor y los rótulos se dibujan dentro de la página (no son subtítulos añadidos después); los clics son clics reales.
// Todos los datos son ficticios (despacho de demostración y documentos de tools/ejemplos).
//
// Por qué fotograma a fotograma: en un equipo cargado, grabar en tiempo real da 4 o 5 fotogramas por segundo. Aquí el reloj de la página
// es virtual (page.clock): cada fotograma avanza 1/30 s los temporizadores, requestAnimationFrame y las animaciones CSS (se pausan y se
// colocan en su instante con la API de animaciones web) y después se captura a 1920 x 1080. El resultado es fluido aunque la captura sea lenta.
//
// Uso (desde la raíz, con la app construida y servida):
//   python3 src/build.py && python3 -m http.server 8807 &
//   node tools/ejemplos/generar.mjs
//   node tools/video/grabar.mjs [puerto] [--sin-rotulos]      (el póster de la portada lo hace tools/video/poster.mjs)
// Deja tools/video/salida/cuadros[-limpio]/00000.jpg… (30 por segundo) y marcas[-limpio].json (segundo de cada escena).
// Después: node tools/video/montar.mjs
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(new URL("../..", import.meta.url).pathname);
const PUERTO = process.argv.find((a) => /^\d+$/.test(a)) || "8807";
const ROTULOS = !process.argv.includes("--sin-rotulos");
const SUF = ROTULOS ? "" : "-limpio";
const SAL = path.join(RAIZ, "tools/video/salida");
const CASO = path.join(RAIZ, "tools/ejemplos/salida/caso1-testamento-malaga");
if (!fs.existsSync(CASO)) { console.error("Faltan los documentos de ejemplo: node tools/ejemplos/generar.mjs"); process.exit(1); }
fs.mkdirSync(SAL, { recursive: true });
const FPS = 30, DT = 1000 / FPS;

// 1440 x 810 CSS a escala 4/3 = 1920 x 1080 reales: la interfaz se ve un tercio más grande que en una pantalla de 1920.
// La escala se fuerza en el propio Chromium (no se emula): así cada captura sale a 1920 x 1080 reales.
const b = await chromium.launch({ args: ["--force-device-scale-factor=1.3333333", "--window-size=1440,810", "--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars"] });
const ctx = await b.newContext({ viewport: null, locale: "es-ES", timezoneId: "Europe/Madrid", colorScheme: "light" });
const pg = await ctx.newPage();
// Reloj virtual: miércoles 7 de octubre de 2026 a las 9:40 (el saludo dice «Buenos días»). Corre solo hasta que empieza la captura.
await pg.clock.install({ time: new Date("2026-10-07T09:40:00+02:00") });
const cdp = await ctx.newCDPSession(pg);
const CUAD = path.join(SAL, "cuadros" + SUF); fs.rmSync(CUAD, { recursive: true, force: true }); fs.mkdirSync(CUAD);
let n = 0; const marcas = {};
const marca = (k) => { marcas[k] = n / FPS; console.log(k.padEnd(14), marcas[k].toFixed(2), `(${new Date().toTimeString().slice(0, 8)})`); };
pg.on("pageerror", (e) => console.log("ERROR de página:", e.message));
const real = (ms) => new Promise((r) => setTimeout(r, ms));

// Un fotograma: 1/30 s de reloj virtual, animaciones CSS en su instante y captura
const SEEK = () => { const now = performance.now();
  for (const a of document.getAnimations()) { try {
    if (a.__v0 === undefined) { a.__v0 = now; a.pause(); }
    const t = now - a.__v0, end = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
    if (Number.isFinite(end) && t >= end) a.finish(); else a.currentTime = t;
  } catch (e) {} } };
async function cuadro() {
  await pg.clock.runFor(DT);
  await pg.evaluate(SEEK);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true });
  fs.writeFileSync(path.join(CUAD, String(n++).padStart(5, "0") + ".jpg"), Buffer.from(data, "base64"));
}
const espera = async (ms) => { for (let t = 0; t < ms - 1; t += DT) await cuadro(); };
// Esperar a que algo ocurra sin grabar (la lectura con OCR, el PDF): el reloj virtual avanza mientras el trabajo real termina
async function sinGrabar(cond, maxS = 900) { const t0 = Date.now(); while (!(await pg.evaluate(cond))) { if (Date.now() - t0 > maxS * 1000) throw new Error("Tiempo agotado: " + cond); await pg.clock.runFor(120); await real(40); } }

await pg.goto(`http://127.0.0.1:${PUERTO}/app/`);
await pg.waitForFunction(() => typeof go === "function" && typeof demoCargar === "function", null, { timeout: 60000 });
await real(800);

// ── Capa de grabación: cursor, pulsación, rótulos, tarjetas de título y visor del PDF (con los tokens de la app)
await pg.evaluate((ROTULOS) => {
  const css = `
  .toast{bottom:118px!important}
  #vd-cur{position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;width:26px;height:26px;transform:translate(720px,520px);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.28)) drop-shadow(0 3px 8px rgba(0,0,0,.16));transition:opacity .3s}
  #vd-cur svg{display:block}
  .vd-pulso{position:fixed;z-index:2147483645;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(24,25,28,.14);box-shadow:0 0 0 1.5px rgba(24,25,28,.22);animation:vdp .55s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes vdp{from{transform:scale(.3);opacity:1}to{transform:scale(1.25);opacity:0}}
  #vd-rot{position:fixed;left:50%;bottom:30px;z-index:2147483643;pointer-events:none;transform:translate(-50%,14px);opacity:0;transition:opacity .45s cubic-bezier(.32,.72,0,1),transform .6s cubic-bezier(.32,.72,0,1);
    background:rgba(24,25,28,.94);color:#fff;border-radius:16px;padding:15px 24px 16px;box-shadow:0 0 0 1px rgba(255,255,255,.06),0 18px 50px -14px rgba(0,0,0,.45);display:flex;align-items:baseline;gap:14px;max-width:min(980px,calc(100vw - 80px));white-space:nowrap}
  #vd-rot.on{opacity:1;transform:translate(-50%,0)}
  #vd-rot i{font:600 13px/1 var(--font-sans);font-style:normal;color:rgba(255,255,255,.6);font-variant-numeric:tabular-nums;letter-spacing:.02em}
  #vd-rot b{font:600 21px/1.25 var(--font-sans);letter-spacing:-.012em}
  #vd-rot span{font:400 17px/1.25 var(--font-sans);color:rgba(255,255,255,.72)}
  .vd-card{position:fixed;inset:0;z-index:2147483642;background:#F5F5F2;display:grid;place-items:center;text-align:center;transition:opacity .7s cubic-bezier(.32,.72,0,1)}
  .vd-card .in{transform:translateY(0);transition:transform .9s cubic-bezier(.32,.72,0,1)}
  .vd-card .lg{width:58px;height:58px;border-radius:15px;background:#1F3A5F;color:#fff;display:grid;place-items:center;margin:0 auto 26px;font:700 23px/1 var(--font-sans);letter-spacing:-.04em}
  .vd-card h1{font:600 64px/1.04 var(--font-display);letter-spacing:-.025em;color:#18191C;margin:0 0 18px}
  .vd-card p{font:400 22px/1.45 var(--font-sans);color:#4B4D53;margin:0}
  .vd-card .k{font:600 15px/1 var(--font-sans);color:#1F3A5F;margin:0 0 18px}
  .vd-card .pie{position:absolute;bottom:40px;left:0;right:0;font:500 14px/1 var(--font-sans);color:#65676D}
  .vd-card .cta{display:inline-flex;gap:12px;margin-top:34px}
  .vd-card .cta span{display:inline-flex;align-items:center;height:52px;padding:0 26px;border-radius:999px;font:600 18px/1 var(--font-sans)}
  .vd-card .cta .a{background:#18191C;color:#fff}.vd-card .cta .b{box-shadow:inset 0 0 0 1px #CFCEC8;color:#18191C}
  .vd-arr{position:fixed;left:0;top:0;z-index:2147483644;pointer-events:none;width:210px;transform:translate(-260px,600px)}
  .vd-arr .pl{position:absolute;width:150px;height:190px;border-radius:8px;background:#fff;box-shadow:0 0 0 1px rgba(24,25,28,.1),0 10px 30px -8px rgba(24,25,28,.35)}
  .vd-arr .pl:nth-child(1){transform:rotate(-7deg) translate(-8px,6px)}.vd-arr .pl:nth-child(2){transform:rotate(4deg) translate(10px,2px)}
  .vd-arr .pl.top{padding:16px 14px;display:flex;flex-direction:column;gap:7px}
  .vd-arr .pl.top i{display:block;height:6px;border-radius:3px;background:#E3E2DD}.vd-arr .pl.top i.c{width:60%}.vd-arr .pl.top i.h{height:9px;width:72%;background:#CFCEC8;margin-bottom:6px}
  .vd-arr .n{position:absolute;left:18px;top:206px;background:#1F3A5F;color:#fff;border-radius:999px;padding:7px 12px;font:600 14px/1 var(--font-sans);white-space:nowrap;box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}
  .vd-pdf{position:fixed;inset:0;z-index:2147483641;background:rgba(24,25,28,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;gap:28px;opacity:0;transition:opacity .5s}
  .vd-pdf.on{opacity:1}
  .vd-pdf canvas{height:calc(100vh - 150px);width:auto;border-radius:3px;background:#fff;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);transform:translateY(24px) scale(.97);transition:transform .8s cubic-bezier(.32,.72,0,1)}
  .vd-pdf.on canvas{transform:none}
  .vd-pdf .nom{position:absolute;top:22px;left:0;right:0;text-align:center;color:#fff;font:500 14px/1 var(--font-sans);opacity:.85}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const cur = document.createElement("div"); cur.id = "vd-cur";
  cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M5 2.5v19.2l4.9-4.6 3.1 7.2 3.3-1.4-3.1-7.1h6.8z" fill="#18191C" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.documentElement.appendChild(cur);
  const rot = document.createElement("div"); rot.id = "vd-rot"; document.documentElement.appendChild(rot);
  const VD = window.VD = { x: 720, y: 520 };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // Todas las animaciones van con requestAnimationFrame y performance.now: con el reloj virtual avanzan fotograma a fotograma
  VD.mover = (x, y, ms = 900, extra) => {
    const x0 = VD.x, y0 = VD.y, t0 = performance.now();
    const cx = (x0 + x) / 2 + (y - y0) * 0.12, cy = (y0 + y) / 2 - (x - x0) * 0.06; // curva leve, como la de una mano
    const paso = () => { const k = Math.min(1, (performance.now() - t0) / ms), e = ease(k), u = 1 - e;
      VD.x = u * u * x0 + 2 * u * e * cx + e * e * x; VD.y = u * u * y0 + 2 * u * e * cy + e * e * y;
      cur.style.transform = `translate(${VD.x - 5}px,${VD.y - 2.5}px)`; if (extra) extra(VD.x, VD.y);
      if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  VD.pulso = () => { const p = document.createElement("div"); p.className = "vd-pulso"; p.style.left = VD.x + "px"; p.style.top = VD.y + "px"; document.documentElement.appendChild(p); setTimeout(() => p.remove(), 700); };
  VD.rotulo = (n, t, s) => { if (!ROTULOS) return; const pon = () => { rot.innerHTML = (n ? `<i>${n}</i>` : "") + `<b>${t}</b>` + (s ? `<span>${s}</span>` : ""); rot.classList.add("on"); };
    if (rot.classList.contains("on")) { rot.classList.remove("on"); setTimeout(pon, 380); } else pon(); };
  VD.sinRotulo = () => rot.classList.remove("on");
  VD.cursor = (on) => { cur.style.opacity = on ? 1 : 0; };
  VD.scroll = (el, a, ms = 1400) => { const d = el.scrollTop, t0 = performance.now(); const paso = () => { const k = Math.min(1, (performance.now() - t0) / ms); el.scrollTop = d + (a - d) * ease(k); if (k < 1) requestAnimationFrame(paso); }; requestAnimationFrame(paso); };
  // Destino de un desplazamiento: dónde quedaría el elemento arriba del todo (sin depender de coordenadas)
  VD.destino = (el, sel, margen = 24) => { const r = typeof sel === "string" ? el.querySelector(sel) : sel; if (!r) return el.scrollTop; const antes = el.scrollTop; r.scrollIntoView({ block: "start" }); const a = el.scrollTop; el.scrollTop = antes; return Math.max(0, a - margen); };
  VD.tarjeta = (html, pie) => { const c = document.createElement("div"); c.className = "vd-card"; c.innerHTML = `<div class="in">${html}</div>` + (pie ? `<div class="pie">${pie}</div>` : ""); document.documentElement.appendChild(c); return c; };
}, ROTULOS);
const VD = (f, ...a) => pg.evaluate(f, ...a);
const centro = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); if (!r) throw new Error("No está en pantalla: " + sel); return [r.x + r.width / 2, r.y + r.height / 2]; };
// Lleva el cursor dibujado a un elemento (en tiempo virtual) y deja el ratón real en ese punto
const ir = async (sel, ms = 900, dx = 0, dy = 0) => { const [x, y] = await centro(sel); await VD(([x, y, ms]) => VD.mover(x, y, ms), [x + dx, y + dy, ms]); await espera(ms + DT); await pg.mouse.move(x + dx, y + dy); return [x + dx, y + dy]; };
const clic = async (sel, ms = 900, pausa = 170) => { const [x, y] = await ir(sel, ms); await espera(pausa); await VD(() => VD.pulso()); await pg.mouse.click(x, y); };
const desplaza = async (sc, destino, ms) => { await VD(([sc, d, ms]) => { const el = sc ? document.querySelector(sc) : document.scrollingElement; VD.scroll(el, typeof d === "number" ? d : VD.destino(el, d.sel, d.margen ?? 24) + (d.mas || 0), ms); }, [sc, destino, ms]); await espera(ms + DT); };
const rotulo = (n, t, s) => VD(([n, t, s]) => VD.rotulo(n, t, s), [n, t, s]);

// ── Preparación (sin grabar): despacho de demostración, reconocedor de texto ya cargado, portada
await pg.evaluate(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); if (typeof dmGuionCerrar === "function") dmGuionCerrar(); go({ vista: "inicio", sheet: null }); });
await real(500);
// Precarga del reconocedor (OCR) con una foto del caso: así la lectura del vídeo va a su ritmo normal y no al de la primera vez
await pg.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); try { await lecTexto(new File([bin], "precarga.jpg", { type: "image/jpeg" })); } catch (e) {} },
  fs.readFileSync(path.join(CASO, "12-dni-carmen-ruiz-lopez.jpg")).toString("base64"));
await pg.evaluate(() => { go({ vista: "inicio", sheet: null }); window.scrollTo(0, 0); VD.cursor(false); VD.tarjeta(`<div class="lg">H+</div><h1>La herencia, lista en una tarde.</h1><p>Los documentos rellenan el expediente. Nada sale del despacho.</p>`, "Despacho y datos ficticios"); });
await real(600);
// Desde aquí el reloj solo avanza fotograma a fotograma
await pg.clock.pauseAt(new Date((await pg.evaluate(() => Date.now())) + 1000));

// ── 1. Título
marca("inicio");
await espera(3400);
await VD(() => { const c = document.querySelector(".vd-card"); c.style.opacity = 0; setTimeout(() => c.remove(), 800); VD.cursor(true); });
await espera(900);
marca("portada");
await rotulo("1", "Un despacho con sus herencias en curso", "Hereda+ en el navegador, sin instalar nada");
await espera(2200);

// ── 2. Desde documentos
await clic('.headacts [data-act="lecNuevo"]', 1100);
await espera(900);
marca("lector");
await rotulo("2", "Arrastra los documentos del cliente", "PDF, Word, fotos del móvil o escaneos");
await espera(1000);
// Montón de 26 documentos que llega desde fuera de la ventana, como al arrastrar desde una carpeta
const [zx, zy] = await centro(".lec-sheet label.drop");
await VD(([zx, zy]) => {
  const a = document.createElement("div"); a.className = "vd-arr"; a.innerHTML = '<div class="pl"></div><div class="pl"></div><div class="pl top"><i class="h"></i><i></i><i></i><i class="c"></i><i></i><i class="c"></i></div><div class="n">26 documentos</div>'; document.documentElement.appendChild(a);
  VD.x = -60; VD.y = zy + 120; window.VD_ARR = a;
  VD.mover(zx - 40, zy - 10, 1700, (x, y) => { a.style.transform = `translate(${x - 120}px,${y - 150}px)`; if (x > zx - 520) document.querySelector(".lec-sheet label.drop")?.classList.add("over"); });
}, [zx, zy]);
await espera(1700 + DT);
await pg.mouse.move(zx - 40, zy - 10);
await espera(450);
// Suelta: evento «drop» real con los archivos, el mismo que produce el sistema al arrastrar
const archivos = fs.readdirSync(CASO).filter((f) => !f.startsWith("_")).sort().map((f) => ({ n: f, b: fs.readFileSync(path.join(CASO, f)).toString("base64") }));
marca("suelta");
await pg.evaluate((L) => {
  const MIME = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", txt: "text/plain", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const dt = new DataTransfer(); for (const f of L) dt.items.add(new File([Uint8Array.from(atob(f.b), (c) => c.charCodeAt(0))], f.n, { type: MIME[f.n.split(".").pop().toLowerCase()] || "" }));
  const z = document.querySelector(".lec-sheet label.drop"); VD.pulso();
  window.VD_ARR.style.transition = "opacity .25s, transform .25s"; window.VD_ARR.style.opacity = 0; setTimeout(() => window.VD_ARR.remove(), 300);
  z.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
}, archivos);
await espera(1300);
await VD(() => { VD.mover(1180, 470, 900); VD.rotulo("3", "Se leen en este ordenador", "Sin IA y sin enviar nada a ningún servidor"); });
// Unos segundos de la lectura en marcha; el resto se espera sin grabar y el montaje pone un fundido
for (let i = 0; i < 6; i++) { await espera(700); await pg.clock.runFor(300); await real(150); }
marca("corte");
await sinGrabar(() => !!document.querySelector(".lec-sheet .lec-row"));
await real(300); await pg.clock.runFor(400);
marca("leido");
await espera(500);
await rotulo("4", "26 documentos reconocidos", "Cada uno con su tipo y su archivo de origen");
await espera(2600);
// Propuestas: desplazamiento suave hasta los datos leídos
const SC = ".lec-sheet .body";
await desplaza(SC, { sel: ".lec-row", margen: 24 }, 2600);
marca("propuestas");
await rotulo("5", "Cada dato, con el documento del que sale", "Lo dudoso va sin marcar. Tú decides qué entra.");
await ir(".lec-sheet .lec-row:nth-of-type(2)", 900, -150, 0);
await espera(1700);
await desplaza(SC, await VD((sc) => document.querySelector(sc).scrollTop + 520, SC), 2200);
await espera(1100);
// Personas propuestas
await desplaza(SC, await VD((sc) => { const el = document.querySelector(sc); const h = [...el.querySelectorAll("*")].find((e) => e.children.length === 0 && /^(Personas|Herederos)/.test(e.textContent.trim()) && VD.destino(el, e, 0) > el.scrollTop + 200); return h ? VD.destino(el, h, 20) : el.scrollTop + 800; }, SC), 2000);
await espera(1800);
// Botón de cargar
await pg.locator('[data-act="lecAplicar"]').first().scrollIntoViewIfNeeded();
await espera(300);
await rotulo("6", "Cargar lo marcado en el expediente", "");
await clic('[data-act="lecAplicar"]', 1000, 300);
await espera(1300);
marca("expediente");
await rotulo("7", "El expediente queda calculado", "Caudal, herederos, Sucesiones y plusvalía, con lo leído señalado");
await ir("main .kpis .kpi:nth-child(2)", 1200, 95, -42);
await espera(3000);
// Qué hacer en este expediente
await desplaza(null, 380, 1600);
await espera(1800);
await desplaza(null, 0, 900);

// ── 3. Impuestos
await VD(() => VD.sinRotulo());
await clic('.secnav [data-sec="impuestos"]', 1000);
await espera(900);
marca("impuestos");
await rotulo("8", "Sucesiones y plusvalía, paso a paso", "Cada cifra con su norma: ley autonómica, ordenanza y artículo");
await espera(1800);
await desplaza(null, 520, 2400);
await espera(1600);
await desplaza(null, 1100, 2200);
await espera(1800);
await desplaza(null, 0, 900);

// ── 4. Mi día
await VD(() => VD.sinRotulo());
await clic('.sitem[data-act="rdMiDia"]', 1100);
await espera(1000);
marca("midia");
await rotulo("9", "Cada mañana, qué hacer hoy", "Lo vencido, lo de esta semana y lo que espera a terceros");
await espera(2600);
await desplaza(null, 430, 2200);
await espera(2400);
await desplaza(null, 0, 1000);

// ── 5. Cifras del 650 del expediente nuevo
await VD(() => VD.sinRotulo());
const idNuevo = await pg.evaluate(() => DB.expedientes.find((x) => !x.demo).id);
await clic(`.sitem[data-open="${idNuevo}"]`, 1100);
await espera(900);
await clic('.secnav [data-act="snMas"]', 900);
await espera(500);
await clic('.sn-menu [data-sec="despacho"]', 800);
await espera(600);
await clic('[data-sub="650"]', 900);
await espera(700);
marca("m650");
await rotulo("10", "Las cifras del modelo 650, listas para copiar", "Una ficha por heredero, en el orden del formulario");
await espera(2200);
await desplaza(null, 420, 2200);
await espera(2200);
await desplaza(null, 0, 900);

await VD(() => VD.sinRotulo());
// ── 6. Informe en PDF: el mismo archivo que se descarga, abierto con el lector de PDF local (pdf.js)
await pg.evaluate(() => { window.__pdf = null; window.pdfDescargar = (n, bytes) => { window.__pdf = { n, bytes }; return n; }; });
await clic('[data-act="informePdf"]', 1000);
await sinGrabar(() => !!window.__pdf, 60);
marca("pdf");
await pg.evaluate(() => { window.__pdfListo = false; (async () => {
  const pdfjs = await import("/lib/pdf.min.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = "/lib/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: window.__pdf.bytes.slice() }).promise;
  const ov = document.createElement("div"); ov.className = "vd-pdf"; ov.innerHTML = `<div class="nom">Informe de cálculo · Antonio Jiménez Soler · ${doc.numPages} páginas</div>`;
  for (let i = 1; i <= Math.min(2, doc.numPages); i++) { const p = await doc.getPage(i); const v = p.getViewport({ scale: 2.2 }); const c = document.createElement("canvas"); c.width = v.width; c.height = v.height; await p.render({ canvasContext: c.getContext("2d"), viewport: v }).promise; ov.appendChild(c); }
  document.documentElement.appendChild(ov); window.__pdfOv = ov; window.__pdfListo = true;
})().catch((e) => { console.error(e); window.__pdfListo = "error"; }); });
await sinGrabar(() => window.__pdfListo, 120);
await VD(() => { VD.cursor(false); window.__pdfOv.classList.add("on"); VD.rotulo("11", "Informe en PDF con el membrete del despacho", "Masa, reparto, Sucesiones paso a paso y plusvalía"); });
await espera(5200);

// ── 7. Cierre
await VD(() => { VD.sinRotulo(); const c = VD.tarjeta(`<div class="lg">H+</div><p class="k">Hereda+ · software de sucesiones para despachos</p><h1>La herencia, lista en una tarde.</h1><p>Tú revisas, decides y firmas.</p><div class="cta"><span class="a">Probar 30 días</span><span class="b">heredate.github.io</span></div>`, "Sin IA · Los datos no salen del despacho · Datos de este vídeo ficticios"); c.style.opacity = 0; requestAnimationFrame(() => requestAnimationFrame(() => { c.style.opacity = 1; })); });
await espera(800);
marca("cierre");
await espera(4200);
marca("fin");
await ctx.close(); await b.close();
fs.writeFileSync(path.join(SAL, `marcas${SUF}.json`), JSON.stringify({ fps: FPS, ...marcas }, null, 1));
console.log(`Grabado: ${n} fotogramas (${(n / FPS).toFixed(1)} s) en ${CUAD}`);
