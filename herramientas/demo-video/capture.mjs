import { chromium } from 'playwright';
import { setup } from './setup.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await setup(p);
await p.addStyleTag({ content: '.dm-banner,.toast{display:none!important}' });
const shots = [
  ['radar', { vista: 'radar' }],
  ['expedientes', { vista: 'inicio' }],
  ['agenda', { vista: 'agenda' }],
  ['socio', { vista: 'socio' }],
  ['rent', { vista: 'rent' }],
  ['biblio', { vista: 'biblio' }],
];
for (const sec of ['resumen', 'diagnostico', 'herencia', 'impuestos', 'estrategia', 'particion', 'tramites', 'terceros', 'documentos', 'firma', 'normativa'])
  shots.push(['dm02-' + sec, { vista: 'exp', id: 'dm-02', sec }]);
shots.push(['dm01-terceros', { vista: 'exp', id: 'dm-01', sec: 'terceros' }]);
shots.push(['dm03-firma', { vista: 'exp', id: 'dm-03', sec: 'firma' }]);
shots.push(['dm03-particion', { vista: 'exp', id: 'dm-03', sec: 'particion' }]);
for (const [n, v] of shots) {
  await p.evaluate((v) => { if (typeof reunionCerrar === 'function' && RN?.el) reunionCerrar(); go({ sheet: null, ...v }); }, v);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `demo/cap/${n}.png` });
  await p.screenshot({ path: `demo/cap/${n}-full.png`, fullPage: true });
}
// Modo reunión (para la familia)
await p.evaluate(() => { go({ vista: 'exp', id: 'dm-02', sec: 'resumen', sheet: null }); reunionAbrir(exp()); });
await p.waitForTimeout(1200);
await p.screenshot({ path: 'demo/cap/reunion.png' });
// Búsqueda Ctrl K
await p.evaluate(() => { if (RN?.el) reunionCerrar(); go({ vista: 'radar', sheet: null }); });
await p.waitForTimeout(500);
await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
await p.screenshot({ path: 'demo/cap/pk-0.png' });
await p.keyboard.type('Marbella', { delay: 60 }); await p.waitForTimeout(600);
await p.screenshot({ path: 'demo/cap/pk-1.png' });
console.log(errs);
await b.close();
