import { chromium } from 'playwright';
import { open } from './common.mjs';
const O = 'demo/v2/cap/';


const { b, ctx, p, errs } = await open();



const shots = [['radar', { vista: 'radar' }], ['expedientes', { vista: 'inicio' }], ['agenda', { vista: 'agenda' }], ['socio', { vista: 'socio' }], ['rent', { vista: 'rent' }], ['biblio', { vista: 'biblio' }]];
for (const sec of ['resumen', 'diagnostico', 'herencia', 'impuestos', 'estrategia', 'particion', 'tramites', 'terceros', 'documentos', 'firma', 'normativa'])
  shots.push(['dm02-' + sec, { vista: 'exp', id: 'dm-02', sec }]);
shots.push(['dm01-terceros', { vista: 'exp', id: 'dm-01', sec: 'terceros' }]);
shots.push(['dm03-firma', { vista: 'exp', id: 'dm-03', sec: 'firma' }]);
for (const [n, v] of shots) {
  await p.evaluate((v) => { go({ sheet: null, ...v }); scrollTo(0, 0); }, v);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: O + n + '.png' });
  await p.screenshot({ path: O + n + '-full.png', fullPage: true });
}
// reunión: todas las diapositivas
await p.evaluate(() => { go({ vista: 'exp', id: 'dm-02', sec: 'resumen', sheet: null }); reunionAbrir(exp()); });
await p.waitForTimeout(1500);
const n = await p.evaluate(() => RN.n);
for (let i = 0; i < n; i++) { await p.evaluate((i) => rnIr(i), i); await p.waitForTimeout(1600); await p.screenshot({ path: O + 'rn-' + i + '.png' }); }
await p.evaluate(() => reunionCerrar());
console.log('slides', n, errs);
await b.close();
