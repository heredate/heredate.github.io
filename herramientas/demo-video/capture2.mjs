import { chromium } from 'playwright';
import { setup } from './setup.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await setup(p);
await p.addStyleTag({ content: '.dm-banner,.toast{display:none!important}' });
await p.evaluate(() => { go({ vista: 'exp', id: 'dm-02', sec: 'resumen', sheet: null }); reunionAbrir(exp()); });
await p.waitForTimeout(1200);
for (let i = 0; i < 8; i++) { await p.screenshot({ path: `demo/cap/reunion-${i}.png` }); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900); }
await b.close();
