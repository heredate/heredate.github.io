import { chromium } from 'playwright';
import { setup } from '../setup.mjs';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await setup(p);
await p.addStyleTag({ content: '.dm-banner,.toast,.tm-root{display:none!important}' });
const out = {};
const views = [['radar', { vista: 'radar' }], ['socio', { vista: 'socio' }], ['rent', { vista: 'rent' }], ['biblio', { vista: 'biblio' }], ['agenda', { vista: 'agenda' }]];
for (const sec of ['resumen', 'diagnostico', 'herencia', 'impuestos', 'particion', 'terceros', 'tramites'])
  views.push(['dm02-' + sec, { vista: 'exp', id: 'dm-02', sec }]);
views.push(['dm01-terceros', { vista: 'exp', id: 'dm-01', sec: 'terceros' }], ['dm03-firma', { vista: 'exp', id: 'dm-03', sec: 'firma' }]);
for (const [n, v] of views) {
  await p.evaluate((v) => { go({ sheet: null, ...v }); scrollTo(0, 0); }, v);
  await p.waitForTimeout(900);
  out[n] = await p.evaluate(() => {
    const r = [];
    const main = document.querySelector('.main') || document.body;
    const walk = (el, d) => {
      for (const c of el.children) {
        const b = c.getBoundingClientRect();
        if (b.width < 120 || b.height < 24) continue;
        const t = (c.innerText || '').replace(/\s+/g, ' ').slice(0, 70);
        r.push(`${'  '.repeat(d)}${c.tagName.toLowerCase()}.${[...c.classList].join('.')} [${Math.round(b.x)},${Math.round(b.y + scrollY)},${Math.round(b.width)},${Math.round(b.height)}] ${t}`);
        if (d < 4) walk(c, d + 1);
      }
    };
    walk(main, 0);
    return r.join('\n') + `\nDOCH ${document.documentElement.scrollHeight}`;
  });
}
const fixed = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && e.offsetWidth).map(e => e.tagName + '.' + e.className + ' ' + (e.innerText || '').slice(0, 30)).join('\n'));
fs.writeFileSync('demo/v2/dom.txt', Object.entries(out).map(([k, v]) => '=== ' + k + '\n' + v).join('\n') + '\n=== FIXED\n' + fixed);
await b.close();
