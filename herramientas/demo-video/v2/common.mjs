import { chromium } from 'playwright';
import { setup } from '../setup.mjs';
export const HIDE = '.dm-banner,.toast,.tm-root{display:none!important}';
export async function open(vw = 1600, vh = 1000, dpr = 2) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, timezoneId: 'Europe/Madrid', locale: 'es-ES' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-09T09:41:00+02:00'));
  await setup(p);
  await p.addStyleTag({ content: HIDE });
  return { b, ctx, p, errs };
}
