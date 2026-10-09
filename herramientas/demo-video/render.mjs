import { chromium } from 'playwright';
import fs from 'fs';
const [,, from, to, out] = process.argv; const FPS = 30;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + process.cwd() + '/stage/index.html');
await p.evaluate(() => window.ready);
const N = Math.round(await p.evaluate(() => TOTAL) * FPS);
const end = Math.min(N, +to);
const t0 = Date.now();
for (let f = +from; f < end; f++) {
  await p.evaluate(([t, f]) => renderAt(t, f), [f / FPS, f]);
  await p.screenshot({ path: `${out}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
console.log('done', from, end, 'of', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
await b.close();
