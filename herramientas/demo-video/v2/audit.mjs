import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('console', m => errs.push(m.text()));
await p.goto('file://' + process.cwd() + '/demo/stage2/index.html');
await p.evaluate(() => window.ready);
console.log(await p.evaluate(() => {
  const o = ['TOTAL ' + TOTAL.toFixed(1)];
  SHOTS.forEach((s) => {
    const end = s.next ? s.dur - s.next.xf : s.dur;
    o.push(`${(s.id || s.card).padEnd(7)} t0=${s.t0.toFixed(1).padStart(6)} dur=${s.dur} ` + (s.hls || []).map((h) => (Math.min(h.b - .35, end) - (h.a + .6)).toFixed(1)).join(' '));
  });
  // rótulos que siguen visibles cuando la cámara se mueve hacia otra región
  CAPS.forEach((c) => { const nx = CAPS.find((d) => d.A > c.A); if (nx && nx.s !== c.s && nx.A - c.B < .15) o.push('  cambio de lado justo: ' + c.h); });
  return o.join('\n');
}));
// QA de solapes: barrido a 4 fps
const bad = [];
const T = await p.evaluate(() => TOTAL);
for (let t = 0; t < T; t += .25) { await p.evaluate(([t]) => renderAt(t, 0), [t]); const q = await p.evaluate(() => qa()); if (q.length) bad.push(t.toFixed(2) + ' ' + q.join(' | ')); }
console.log('QA', bad.length ? bad.join('\n') : 'ok', errs.slice(0, 5));
await b.close();
