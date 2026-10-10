// node demo/v2/preview.mjs OUTDIR t1 t2 ...  → fotogramas + QA
import { chromium } from 'playwright';
import fs from 'fs';
const [out, ...ts] = process.argv.slice(2); const times = ts.map(Number);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/demo/stage2/index.html');
await p.evaluate(() => window.ready);
console.log('TOTAL', await p.evaluate(() => TOTAL));
let i = 0;
for (const t of times) {
  const t0 = Date.now();
  await p.evaluate(([t, f]) => renderAt(t, f), [t, Math.round(t * 30)]);
  const q = await p.evaluate((t) => [qa(t), speedAt(t)], t);
  await p.screenshot({ path: `${out}/p${String(i++).padStart(2, '0')}_${t}.jpg`, type: 'jpeg', quality: 85 });
  console.log(t, 'speed', q[1].toFixed(1), q[0].join(' | '), (Date.now() - t0) + 'ms');
}
console.log(errs.slice(0, 10));
await b.close();
