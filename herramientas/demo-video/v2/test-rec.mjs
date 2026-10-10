import { chromium } from 'playwright';
import { setup } from '../setup.mjs';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, timezoneId: 'Europe/Madrid' });
const p = await ctx.newPage();
await p.clock.setFixedTime(new Date('2026-10-09T09:41:00+02:00'));
await setup(p);
await p.addStyleTag({ content: '.dm-banner,.toast,.tm-root{display:none!important}' });
await p.evaluate(() => { go({ vista: 'radar', sheet: null }); });
await p.waitForTimeout(800);
console.log(await p.evaluate(() => document.querySelector('.ltitle').innerText));
await p.evaluate(() => { go({ vista: 'exp', id: 'dm-02', sec: 'resumen', sheet: null }); });
await p.waitForTimeout(900);
const cdp = await ctx.newCDPSession(p);
await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
const tab = await p.evaluate(() => { const b = [...document.querySelectorAll('.secnav button')].find(x => x.innerText.includes('Herederos')); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
console.log('tab', tab);
const t0 = Date.now(); const ts = [];
fs.mkdirSync('demo/v2/tst', { recursive: true });
let clicked = false;
for (let i = 0; i < 30; i++) {
  const a = Date.now(); await p.screenshot({ path: `demo/v2/tst/${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 80 }); ts.push(((a + Date.now()) / 2 - t0) * 0.1 | 0);
  if (!clicked && i == 1) { await p.mouse.click(...tab); clicked = true; }
}
console.log(ts.join(' '), 'real per shot', (Date.now() - t0) / 30);
await b.close();
