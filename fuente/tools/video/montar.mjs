// Monta los vídeos de demostración a partir de las grabaciones de tools/video/grabar.mjs (necesita ffmpeg).
//   node tools/video/grabar.mjs 8807                 → salida/cuadros/ y marcas.json
//   node tools/video/poster.mjs 8807                 → salida/poster.png (expediente calculado, sin cursor ni rótulo)
//   node tools/video/montar.mjs [--solo-horizontal | --solo-vertical]
// Resultado en video/: hereda-demo.mp4 (H.264, ≤ 12 MB), hereda-demo.webm (VP9), hereda-demo-poster.jpg y -1600/-960.webp,
// hereda-demo-vertical.mp4 (1080 x 1920, 30 s, para LinkedIn y WhatsApp) y su póster.
// La espera de la lectura (escaneos y fotos por OCR) no se graba entera: se ven unos segundos y se pasa al resultado con un fundido.
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(new URL("../..", import.meta.url).pathname);
const SAL = path.join(RAIZ, "tools/video/salida");
const DEST = path.join(RAIZ, "video");
fs.mkdirSync(DEST, { recursive: true });
const ff = (args) => { console.log("ffmpeg", args.filter((a) => !/^-(hide_banner|y)$/.test(a)).join(" ").slice(0, 220)); execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" }); };
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const MB = (f) => (fs.statSync(f).size / 1048576).toFixed(2) + " MB";
const solo = process.argv.find((a) => a.startsWith("--solo-")) || "";
// Fotogramas de tools/video/grabar.mjs (30 por segundo, ya en su tiempo) → vídeo intermedio casi sin pérdida
function intermedio(suf) {
  const M = JSON.parse(fs.readFileSync(path.join(SAL, `marcas${suf}.json`), "utf8"));
  const dir = path.join(SAL, "cuadros" + suf), out = path.join(SAL, `bruto${suf}.mp4`);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(path.join(SAL, `marcas${suf}.json`)).mtimeMs) return out;
  ff(["-framerate", String(M.fps || 30), "-i", path.join(dir, "%05d.jpg"), "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", out]);
  return out;
}

// Tramos de la grabación: [inicio, fin] en segundos; entre la suelta de documentos y el resultado, fundido corto
function tramos(m) {
  return [[m.inicio, m.corte], [m.leido, m.fin]];
}
const XF = 0.5; // duración del fundido

if (!solo || solo === "--solo-horizontal") {
  const m = JSON.parse(fs.readFileSync(path.join(SAL, "marcas.json"), "utf8"));
  const brutoH = intermedio("");
  const [[a0, a1], [b0, b1]] = tramos(m);
  const largo = (a1 - a0) + (b1 - b0) - XF;
  console.log(`Vídeo horizontal: ${largo.toFixed(1)} s`);
  const filtro = `[0:v]fps=30,setpts=PTS-STARTPTS[a];[1:v]fps=30,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${XF}:offset=${(a1 - a0 - XF).toFixed(3)},format=yuv420p[v]`;
  const mp4 = path.join(DEST, "hereda-demo.mp4");
  // H.264 High, CRF con tope de bitrate para quedar por debajo de 12 MB; +faststart para empezar a reproducir antes de bajar el archivo entero
  const tope = Math.floor((11.2 * 8 * 1024) / largo); // kbit/s
  ff(["-ss", a0.toFixed(3), "-t", (a1 - a0).toFixed(3), "-i", brutoH, "-ss", b0.toFixed(3), "-t", (b1 - b0).toFixed(3), "-i", brutoH, "-filter_complex", filtro, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-maxrate", tope + "k", "-bufsize", tope * 2 + "k", "-profile:v", "high", "-tune", "stillimage", "-threads", "2", "-movflags", "+faststart", mp4]);
  console.log("  ", mp4, MB(mp4), dur(mp4).toFixed(1) + " s");
  const webm = path.join(DEST, "hereda-demo.webm");
  // VP9 con calidad constante y tope de bitrate (≈ 75 % del MP4): si no, en pantallas de texto sale mayor que el H.264
  ff(["-i", mp4, "-c:v", "libvpx-vp9", "-crf", "40", "-b:v", "430k", "-deadline", "good", "-cpu-used", "5", "-row-mt", "1", "-an", webm]);
  console.log("  ", webm, MB(webm));
  // Póster: el expediente ya calculado, sin cursor ni rótulos (captura de la toma limpia); si no existe, un fotograma del vídeo
  const png = path.join(SAL, "poster.png");
  const tp = (a1 - a0 - XF) + (m.expediente - b0) - 0.15;
  const src = fs.existsSync(png) ? ["-i", png] : ["-ss", tp.toFixed(2), "-i", mp4];
  ff([...src, "-frames:v", "1", "-vf", "scale=1920:1080:flags=lanczos", "-q:v", "3", path.join(DEST, "hereda-demo-poster.jpg")]);
  ff([...src, "-frames:v", "1", "-vf", "scale=1600:-2:flags=lanczos", "-c:v", "libwebp", "-quality", "80", path.join(DEST, "hereda-demo-poster-1600.webp")]);
  ff([...src, "-frames:v", "1", "-vf", "scale=960:-2:flags=lanczos", "-c:v", "libwebp", "-quality", "78", path.join(DEST, "hereda-demo-poster-960.webp")]);
  for (const f of ["hereda-demo-poster.jpg", "hereda-demo-poster-1600.webp", "hereda-demo-poster-960.webp"]) console.log("  ", f, MB(path.join(DEST, f)));
}

// ── Versión vertical (1080 x 1920, 30 s): recortes de la grabación sin rótulos dentro de un marco con el texto grande arriba
if (!solo || solo === "--solo-vertical") {
  // Misma grabación que la horizontal: los recortes dejan fuera la franja de los rótulos (abajo), que aquí van en grande arriba
  const m = JSON.parse(fs.readFileSync(path.join(SAL, "marcas.json"), "utf8"));
  const bruto = intermedio("");
  // Cada escena: desde (s), duración, recorte en píxeles del vídeo 1920 x 1080 (proporción 5:4) y texto
  const E = [
    { t: m.lector + 1.6, d: 4.4, c: [900, 40, 1000, 800], k: "1", h: "Arrastra los documentos del cliente.", s: "PDF, Word, fotos del móvil o escaneos." },
    { t: m.leido + 0.3, d: 4.0, c: [900, 40, 1000, 800], k: "2", h: "Se leen en tu ordenador.", s: "Sin IA. Nada se envía a ningún servidor." },
    { t: m.propuestas + 0.2, d: 4.4, c: [900, 40, 1000, 800], k: "3", h: "Cada dato, con el documento del que sale.", s: "Tú marcas qué entra en el expediente." },
    { t: m.expediente + 0.6, d: 4.4, c: [390, 100, 1065, 852], k: "4", h: "El expediente, calculado.", s: "Sucesiones y plusvalía, con su norma." },
    { t: m.midia + 0.5, d: 4.2, c: [390, 100, 1065, 852], k: "5", h: "Cada mañana, qué hacer hoy.", s: "Lo vencido, lo de la semana y lo que espera a terceros." },
    { t: m.pdf + 0.9, d: 3.8, c: [300, 90, 1063, 850], k: "6", h: "Informe en PDF, con tu membrete.", s: "Tú revisas, decides y firmas." },
  ];
  const INTRO = 3.0, CIERRE = 4.2;
  const fuente = (f) => "data:font/woff2;base64," + fs.readFileSync(path.join(RAIZ, "fonts", f)).toString("base64");
  const CSS = `@font-face{font-family:S;src:url(${fuente("inter-var-latin.woff2")});font-weight:400 700}@font-face{font-family:D;src:url(${fuente("source-serif-4-var-latin.woff2")});font-weight:450 650}
    *{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;background:transparent}
    .bg{position:absolute;inset:0;background:#F5F5F2}
    .hole{position:absolute;left:40px;top:640px;width:1000px;height:800px;border-radius:28px;box-shadow:0 0 0 2000px #F5F5F2,0 0 0 1px rgba(24,25,28,.08)}
    .sh{position:absolute;left:40px;top:640px;width:1000px;height:800px;border-radius:28px;box-shadow:0 40px 90px -30px rgba(24,25,28,.35)}
    .top{position:absolute;left:72px;right:72px;top:150px}
    .lg{display:flex;align-items:center;gap:16px;font:650 34px/1 S;color:#18191C;letter-spacing:-.01em;margin-bottom:64px}
    .lg i{width:56px;height:56px;border-radius:15px;background:#1F3A5F;color:#fff;display:grid;place-items:center;font:700 22px/1 S;font-style:normal;letter-spacing:-.04em}
    .k{font:600 30px/1 S;color:#1F3A5F;margin-bottom:22px;font-variant-numeric:tabular-nums}
    h1{font:600 70px/1.04 D;letter-spacing:-.024em;color:#18191C;text-wrap:balance}
    p{font:400 34px/1.35 S;color:#4B4D53;margin-top:22px;text-wrap:pretty}
    .pie{position:absolute;left:72px;right:72px;bottom:120px;display:flex;justify-content:space-between;align-items:center}
    .pie b{font:600 32px/1 S;color:#fff;background:#18191C;border-radius:999px;padding:24px 34px}
    .pie span{font:500 28px/1.3 S;color:#65676D;text-align:right}
    .full{position:absolute;inset:0;background:#F5F5F2;display:flex;flex-direction:column;justify-content:center;padding:0 80px}
    .full h1{font-size:104px}.full p{font-size:40px}.full .lg{margin-bottom:90px}
    .full .cta{display:flex;flex-direction:column;gap:22px;margin-top:80px;align-items:flex-start}
    .full .cta b{font:600 38px/1 S;color:#fff;background:#18191C;border-radius:999px;padding:30px 44px}
    .full .cta span{font:500 34px/1 S;color:#18191C;box-shadow:inset 0 0 0 2px #CFCEC8;border-radius:999px;padding:28px 40px}
    .full small{position:absolute;bottom:110px;left:80px;right:80px;font:500 28px/1.4 S;color:#65676D}`;
  const tmp = path.join(SAL, "vertical"); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const png = async (html, f, transparente) => { await pg.setContent(`<style>${CSS}</style>${html}`); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: f, omitBackground: !!transparente }); };
  const pie = `<div class="pie"><b>Probar 30 días</b><span>Hereda+<br>heredate.github.io</span></div>`;
  await png(`<div class="full"><div class="lg"><i>H+</i>Hereda+</div><h1>La herencia, lista en una tarde.</h1><p>Software de sucesiones para despachos de abogados.</p><small>Despacho y datos ficticios.</small></div>`, path.join(tmp, "intro.png"));
  await png(`<div class="full"><div class="lg"><i>H+</i>Hereda+</div><h1>Los documentos rellenan el expediente.</h1><p>Sin IA. Los datos no salen del despacho.</p><div class="cta"><b>Probar 30 días</b><span>heredate.github.io</span></div></div>`, path.join(tmp, "cierre.png"));
  for (const [i, e] of E.entries()) {
    await png(`<div class="sh"></div><div class="hole"></div><div class="top"><div class="lg"><i>H+</i>Hereda+</div><div class="k">${e.k} / 6</div><h1>${e.h}</h1><p>${e.s}</p></div>${pie}`, path.join(tmp, `m${i}.png`), true);
  }
  await b.close();
  // Cada escena por separado (mismo formato), después se unen con fundidos
  const partes = [];
  const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30"];
  ff(["-loop", "1", "-t", String(INTRO), "-i", path.join(tmp, "intro.png"), "-vf", "format=yuv420p", ...enc, path.join(tmp, "p-intro.mp4")]); partes.push([path.join(tmp, "p-intro.mp4"), INTRO]);
  for (const [i, e] of E.entries()) {
    const [x, y, w, h] = e.c; const f = path.join(tmp, `p${i}.mp4`);
    ff(["-ss", e.t.toFixed(2), "-t", String(e.d), "-i", bruto, "-loop", "1", "-t", String(e.d), "-i", path.join(tmp, `m${i}.png`),
      "-filter_complex", `color=c=0xF5F5F2:s=1080x1920:r=30:d=${e.d}[bg];[0:v]fps=30,crop=${w}:${h}:${x}:${y},scale=1000:800:flags=lanczos,setpts=PTS-STARTPTS[v];[bg][v]overlay=40:640:shortest=1[a];[a][1:v]overlay=0:0:shortest=1,format=yuv420p[o]`,
      "-map", "[o]", "-an", ...enc, f]);
    partes.push([f, e.d]);
  }
  ff(["-loop", "1", "-t", String(CIERRE), "-i", path.join(tmp, "cierre.png"), "-vf", "format=yuv420p", ...enc, path.join(tmp, "p-cierre.mp4")]); partes.push([path.join(tmp, "p-cierre.mp4"), CIERRE]);
  // Fundidos encadenados
  const X = 0.35; let fc = "", prev = "0:v", off = 0;
  partes.forEach(([, d], i) => { if (!i) { off = d - X; return; } const o = i === partes.length - 1 ? "v" : `x${i}`; fc += `[${prev}][${i}:v]xfade=transition=fade:duration=${X}:offset=${off.toFixed(3)}[${o}];`; prev = o; off += d - X; });
  const vert = path.join(DEST, "hereda-demo-vertical.mp4");
  ff([...partes.flatMap(([f]) => ["-i", f]), "-filter_complex", fc.replace(/;$/, ""), "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "2500k", "-bufsize", "5000k", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", vert]);
  console.log("  ", vert, MB(vert), dur(vert).toFixed(1) + " s");
  ff(["-ss", String(INTRO + 4.4 + 4.0 + 2.0), "-i", vert, "-frames:v", "1", "-q:v", "3", path.join(DEST, "hereda-demo-vertical-poster.jpg")]);
}
