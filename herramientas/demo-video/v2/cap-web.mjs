import { open } from './common.mjs';
const { b, p, errs } = await open(1400, 1061, 2);
await p.mouse.move(1399, 1060);
for (const [n, v] of [['exp-cine', { vista: 'exp', id: 'dm-02', sec: 'resumen' }], ['midia-cine', { vista: 'radar' }]]) {
  await p.evaluate((v) => { go({ sheet: null, ...v }); scrollTo(0, 0); }, v);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `demo/v2/cap/${n}-2x.png` });
}
console.log(errs); await b.close();
