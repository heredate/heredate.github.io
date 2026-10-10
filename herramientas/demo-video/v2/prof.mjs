import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + process.cwd() + '/demo/stage2/index.html');
await p.evaluate(() => window.ready);
await p.evaluate(() => renderAt(21, 1));
for (const [name, css] of [['all', ''], ['noCA', '#world{filter:none!important}'], ['noDOF', '#dof{display:none!important}'], ['none', '#world{filter:none!important}#dof{display:none!important}'], ['nogrfx', '#world{filter:none!important}#dof{display:none!important}.blob{display:none}#leaks{display:none}']]) {
  await p.evaluate((css) => { let s = document.getElementById('xx'); if (!s) { s = document.createElement('style'); s.id = 'xx'; document.head.appendChild(s); } s.textContent = css; }, css);
  let t0 = Date.now(); for (let i = 0; i < 4; i++) { await p.evaluate((i) => renderAt(21 + i / 30, i), i); await p.screenshot({ type: 'jpeg', quality: 92 }); }
  console.log(name, (Date.now() - t0) / 4);
  t0 = Date.now(); for (let i = 0; i < 4; i++) { await p.evaluate((i) => renderAt(21 + i / 30, i), i); } console.log('  render only', (Date.now() - t0) / 4);
}
await b.close();
