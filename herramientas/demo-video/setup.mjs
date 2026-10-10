// Prepara la app real: bienvenida completada, despacho de demostración cargado, tema grafito (azul noche)
export async function setup(p) {
  await p.goto('http://localhost:8765/app/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { DB.tema = 'grafito'; aplicarTema(); });
  await p.fill('input[placeholder^="Ej.: Zambrano"]', 'Macías Naranjo Abogados');
  await p.fill('input[placeholder="Ej.: Málaga"]', 'Málaga');
  await p.fill('input[placeholder="Nombre y apellidos"]', 'Margarita Macías');
  await p.getByRole('button', { name: 'Continuar' }).click(); await p.waitForTimeout(500);
  await p.getByText('Ver un despacho en marcha').click(); await p.waitForTimeout(300);
  for (let k = 0; k < 6; k++) {
    const c = p.getByRole('button', { name: /^(Continuar|Empezar|Entrar|Entendido|Ir al despacho|Ver el despacho|Abrir el despacho|Listo|Comenzar)/ });
    if (!(await c.count()) || !(await c.last().isEnabled())) break;
    await p.screenshot({ path: `demo/x/setup-${k}.png` });
    await c.last().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(700);
  }
  await p.evaluate(() => { DB.tema = 'grafito'; aplicarTema(); });
}
