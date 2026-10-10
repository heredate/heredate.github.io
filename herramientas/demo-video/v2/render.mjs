// node demo/v2/render.mjs RAWDIR range A B   |   node demo/v2/render.mjs RAWDIR frames f1,f2,...
// Graba cada fotograma; si la cámara va rápida, varias submuestras (obturador de 180°) que post.py promedia.
import { chromium } from 'playwright';
import fs from 'fs';
const [raw, mode, a, bb] = process.argv.slice(2); const FPS = 30, SHUT = .5;
fs.mkdirSync(raw, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + process.cwd() + '/demo/stage2/index.html');
await p.evaluate(() => window.ready);
const N = Math.round(await p.evaluate(() => TOTAL) * FPS);
let list = mode === 'frames' ? a.split(',').map(Number) : []; if (mode === 'range') for (let f = +a; f < Math.min(N, +bb); f++) list.push(f);
const log = fs.createWriteStream(`${raw}/params-${list[0]}.jsonl`, { flags: 'a' });
const t0 = Date.now(); let subs = 0;
for (const f of list) {
  const T = f / FPS;
  const sp = await p.evaluate((T) => speedAt(T), T);
  const n = sp < 4 ? 1 : Math.min(10, Math.ceil(sp / 3.2) + 1);
  let post = null;
  for (let i = 0; i < n; i++) {
    const Ti = n === 1 ? T : T + (i / (n - 1) - .5) * SHUT / FPS;
    await p.evaluate(([t, f]) => renderAt(t, f), [Ti, f]);
    if (i === Math.floor(n / 2) || n === 1) post = await p.evaluate(() => window.POST);
    await p.screenshot({ path: `${raw}/f${String(f).padStart(5, '0')}_${i}.jpg`, type: 'jpeg', quality: 95 });
  }
  subs += n;
  log.write(JSON.stringify({ f, n, ...post }) + '\n');
}
log.end();
console.log('done', list[0], list[list.length - 1], 'frames', list.length, 'shots', subs, ((Date.now() - t0) / 1000).toFixed(0) + 's', errs.slice(0, 5));
await b.close();
