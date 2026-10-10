import { open } from './common.mjs';
import fs from 'fs';
import crypto from 'crypto';
const R = 0.07, OUT = 'demo/v2/seq/';
const only = process.argv[2];
const { b, ctx, p, errs } = await open();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Animation.enable');
const man = fs.existsSync(OUT + 'man.json') ? JSON.parse(fs.readFileSync(OUT + 'man.json')) : {};
const center = (sel, txt) => p.evaluate(([sel, txt]) => {
  const e = [...document.querySelectorAll(sel)].find(x => !txt || x.innerText.trim().startsWith(txt));
  if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
}, [sel, txt]);
const rects = (sels) => p.evaluate((sels) => Object.fromEntries(sels.map(s => { const e = document.querySelector(s); if (!e) return [s, null]; const r = e.getBoundingClientRect(); return [s, [r.x, r.y + scrollY, r.width, r.height].map(Math.round)]; })), sels);
let mouse = [];
async function mv(ms, xy) { mouse.push([ms, xy[0], xy[1], 'm']); await p.mouse.move(xy[0], xy[1]); }
async function ck(ms, xy) { mouse.push([ms, xy[0], xy[1], 'c']); await p.mouse.move(xy[0], xy[1]); await p.mouse.down(); await p.mouse.up(); }
async function rec(name, steps, total, extra) {
  if (only && only !== name) return;
  fs.rmSync(OUT + name, { recursive: true, force: true }); fs.mkdirSync(OUT + name, { recursive: true });
  mouse = [];
  await cdp.send('Animation.setPlaybackRate', { playbackRate: R });
  const t0 = Date.now(); let si = 0; const fr = []; let last = null;
  while (true) {
    const a = Date.now();
    const buf = await p.screenshot({ type: 'jpeg', quality: 92, caret: 'initial' });
    const ms = Math.round(((a + Date.now()) / 2 - t0) * R);
    const h = crypto.createHash('md5').update(buf).digest('hex');
    if (h !== last) { const f = String(fr.length).padStart(3, '0') + '.jpg'; fs.writeFileSync(OUT + name + '/' + f, buf); fr.push([ms, f]); last = h; }
    const app = (Date.now() - t0) * R;
    while (si < steps.length && steps[si][0] <= app) { await steps[si][1](steps[si][0]); si++; }
    if (app > total && si >= steps.length) break;
  }
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
  await p.waitForTimeout(400);
  man[name] = { frames: fr, mouse, ...(extra ? await extra() : {}) };
  console.log(name, fr.length, 'frames', JSON.stringify(mouse));
  fs.writeFileSync(OUT + 'man.json', JSON.stringify(man, null, 1));
}
const go = (v) => p.evaluate((v) => { if (typeof RN === 'object' && RN.el) reunionCerrar(); go({ sheet: null, ...v }); scrollTo(0, 0); }, v).then(() => p.waitForTimeout(1200));
const park = () => p.mouse.move(1590, 990);

// 1 · Resumen → Herederos y bienes (pestaña)
await go({ vista: 'exp', id: 'dm-02', sec: 'resumen' }); await park();
let tab = await center('.secnav button', 'Herederos');
await rec('tabher', [[0, (ms) => mv(ms, tab)], [450, (ms) => ck(ms, tab)]], 1300);

// 2 · Herederos → Más ▾ → Diagnóstico
await go({ vista: 'exp', id: 'dm-02', sec: 'herencia' }); await park();
const mas = await center('.secnav button', 'Más');
await rec('diag', [[0, (ms) => mv(ms, mas)], [400, (ms) => ck(ms, mas)],
  [1150, async (ms) => { const d = await center('.sn-menu button, .sn-menu a, [role=menu] button', 'Diagnóstico'); console.log('menu item', d); if (d) await mv(ms, d); }],
  [1550, async (ms) => { const d = await center('.sn-menu button, .sn-menu a, [role=menu] button', 'Diagnóstico'); if (d) await ck(ms, d); else await p.evaluate(() => go({ sec: 'diagnostico' })); }]], 2900);

// 3 · Partición: Inventario → Cuadro de partición
await go({ vista: 'exp', id: 'dm-02', sec: 'particion' }); await park();
const cuadro = await center('.pnav button, .pnav a', '4');
console.log('cuadro', cuadro);
await rec('part', [[0, (ms) => mv(ms, cuadro)], [450, (ms) => ck(ms, cuadro)]], 1500, async () => ({ rects: await rects(['.pbody', '.pbody .phead', '.pbody .card', '.pbody .tablewrap', '.pbody table']) }));
await p.screenshot({ path: 'demo/v2/cap/part4.png' });

// 4 · Terceros: pasar por «Enviar por WhatsApp»
await go({ vista: 'exp', id: 'dm-01', sec: 'terceros' }); await park();
const wa = await center('.tc-fam button', 'Enviar por WhatsApp');
console.log('wa', wa);
await rec('wa', [[0, (ms) => mv(ms, wa)]], 1300);

// 5 · Reunión: «Para la familia» y diapositivas 1, 3, 4, 5
await go({ vista: 'exp', id: 'dm-02', sec: 'resumen' }); await park();
const fam = await center('.headacts button', 'Para la familia');
await rec('rn0', [[0, (ms) => mv(ms, fam)], [450, async (ms) => { await ck(ms, fam); await p.waitForTimeout(50); if (!(await p.evaluate(() => !!RN.el))) await p.evaluate(() => reunionAbrir(exp())); }]], 2600);
await park();
for (const k of [1, 3, 4, 5]) await rec('rn' + k, [[0, () => p.evaluate((k) => rnIr(k), k)]], 1900);
await p.evaluate(() => reunionCerrar());

// 6 · Ctrl K y «Marbella», letra a letra
await go({ vista: 'radar' }); await park();
const word = 'Marbella';
const st = [[0, () => p.keyboard.press('Control+k')]];
[...word].forEach((ch, i) => st.push([700 + i * 170, () => p.keyboard.type(ch)]));
await rec('pk', st, 700 + word.length * 170 + 700, async () => ({ rects: await rects(['.pk', '.pk-box', '.pk-list', '.pk ul', '[role=dialog]', '[role=listbox]']) }));
await p.keyboard.press('Escape');

// cabecera pegajosa al desplazar Impuestos
await go({ vista: 'exp', id: 'dm-02', sec: 'impuestos' });
await p.evaluate(() => scrollTo(0, 1400)); await p.waitForTimeout(700);
await p.screenshot({ path: 'demo/v2/cap/dm02-impuestos-scrolled.png' });
console.log('sticky', await rects(['.topbar', '.sn-wrap']), await p.evaluate(() => [...document.querySelectorAll('.sn-wrap,.topbar')].map(e => e.getBoundingClientRect().y)));
console.log(errs);
await b.close();
