// Prueba de navegador de la auditoría civil y de plusvalía de 10-10-2026 (auditoria/civil-plusvalia.md): partición con exceso evitable y TPO por
// comunidad (P-1, art. 1061 CC y art. 7.2.B TRLITPAJD), colación (P-2, arts. 1035-1047 CC), indignidad (arts. 756, 761 y 929 CC), ley aplicable
// (Reglamento (UE) 650/2012) y el despacho de demostración entero sin errores de consola.
// Uso: construir (python3 src/build.py), servir dist/publicar-gh (node tools/qa/servidor.mjs 8797 dist/publicar-gh) y ejecutar desde fuente/:
//   node tools/qa/civil.mjs [url=http://127.0.0.1:8797/app/]   (PLAYWRIGHT=/ruta/a/playwright/index.mjs; PW_EXE=/ruta/al/chromium si hace falta)
const PW = process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const URL_APP = process.argv[2] || "http://127.0.0.1:8797/app/";
let ok = 0, ko = 0;
const check = (n, c, extra = "") => { if (c) ok++; else ko++; console.log(`${c ? "✔" : "✘"} ${n}${!c && extra ? " · " + extra : ""}`); };
const b = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
const p = await (await b.newContext({ viewport: { width: 1366, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => { if (m.type() === "error" && !/favicon|service worker|sw\.js/i.test(m.text())) errores.push(m.text()); });
const ev = (f, a) => p.evaluate(f, a), espera = (ms = 250) => p.waitForTimeout(ms);
await p.goto(URL_APP); await espera(1200);
await ev(() => { if (document.querySelector(".bv-over")) bvSaltar(); demoCargar(); ui.sheet = null; render(); });
await espera(400);

// ── 1 · Despacho de demostración: todas las secciones y los seis pasos de la partición de cada expediente ──
const ids = await ev(() => DB.expedientes.map((x) => x.id));
const secs = await ev(() => SECCIONES().map((s) => s[0]));
for (const id of ids) {
  for (const sec of secs) { await ev(([i, s]) => { go({ vista: "exp", id: i, sec: s, sheet: null }); }, [id, sec]); await espera(60); }
  for (let k = 0; k < 6; k++) { await ev(([i, kk]) => { go({ vista: "exp", id: i, sec: "particion", sheet: null }); ui.pstep = kk; render(); }, [id, k]); await espera(40); }
}
check(`Despacho de demostración (${ids.length} expedientes × ${secs.length} secciones + 6 pasos de partición): sin errores de consola`, errores.length === 0, errores.slice(0, 3).join(" | "));

// ── 2 · Partición: P-1 y P-2 de la auditoría con el cálculo de la app ──
const R = await ev(() => {
  const base = (ccaa, bienes, personas, x = {}) => ({ id: "t" + Math.random(), fecha: "2026-06-01", ccaa, civil: "viudo", testamento: "no", ajuar: "cero", enPlazo: true, situ: {}, tareas: {}, tramites: {}, personas, bienes, deudas: [], gastos: [], ...x });
  const hijos = [{ id: "A", nombre: "Ana", relacion: "hijo", edad: 45 }, { id: "B", nombre: "Blas", relacion: "hijo", edad: 41 }];
  const pisos = [{ id: "v1", tipo: "vivienda", valor: 200000, titularidad: "privativo", adjudicadoA: "A" }, { id: "v2", tipo: "inmueble", valor: 200000, titularidad: "privativo", adjudicadoA: "A" }];
  const p1 = cuadroParticion(base("MAD", pisos, hijos)), p1c = cuadroParticion(base("CAT", pisos, hijos));
  const p5 = cuadroParticion(base("MAD", [{ id: "c", tipo: "cuenta", valor: 240000, titularidad: "privativo" }], [{ ...hijos[0], donacionColacionable: 60000 }, hijos[1]]));
  const ind = calcular(base("MAD", [{ id: "c", tipo: "cuenta", valor: 300000, titularidad: "privativo" }], [{ ...hijos[0], indigno: true }, hijos[1], { id: "N", nombre: "Nora", relacion: "nieto", edad: 20, estirpe: "Ana" }]));
  const est = calcular(base("EST", [{ id: "c", tipo: "cuenta", valor: 100000, titularidad: "privativo" }], hijos, { ccaaBienes: "MAD" }));
  return { p1Evit: p1.H.find((h) => h.id === "A").evitable, p1Coste: p1.coste, p1cCoste: p1c.coste, p5Ana: p5.H.find((h) => h.id === "A").haber, p5Blas: p5.H.find((h) => h.id === "B").haber,
    indA: (ind.isd.derechos.A || []).length, indN: (ind.isd.derechos.N || []).reduce((s, d) => s + d.fraccion, 0), est: est.isd.alertas.some((a) => /650\/2012/.test(a)) };
});
check("P-1 · dos pisos al mismo heredero: exceso evitable 200.000 (art. 1061 CC)", Math.abs(R.p1Evit - 200000) < 1, R.p1Evit);
check("P-1 · coste del exceso en Madrid: TPO 6 % = 12.000 (antes 0 €)", Math.abs(R.p1Coste - 12000) < 1, R.p1Coste);
check("P-1 · en Cataluña, escala del 10 % = 20.000 (antes 0 €)", Math.abs(R.p1cCoste - 20000) < 1, R.p1cCoste);
check("P-2 · colación: Ana 90.000 y Blas 150.000 (arts. 1035 y 1047 CC)", Math.abs(R.p5Ana - 90000) < 1 && Math.abs(R.p5Blas - 150000) < 1, `${R.p5Ana} / ${R.p5Blas}`);
check("Indignidad en la app: el indigno no hereda y su hija le representa (arts. 756, 761 y 929 CC)", R.indA === 0 && Math.abs(R.indN - 0.5) < 1e-9, `${R.indA} / ${R.indN}`);
check("Residente fuera de España: aviso del Reglamento (UE) 650/2012", R.est);

// ── 3 · Pantallas nuevas: explicación del exceso, colación en el paso de cuotas, campos de la ficha y elección de ley ──
const nuevo = await ev(() => {
  const x = { id: "qa-civil", nombre: "QA civil", fecha: "2026-06-01", ccaa: "MAD", civil: "viudo", testamento: "no", ajuar: "cero", enPlazo: true, situ: {}, tareas: {}, tramites: {}, deudas: [], gastos: [],
    personas: [{ id: "A", nombre: "Ana", relacion: "hijo", edad: 45, donacionColacionable: 60000 }, { id: "B", nombre: "Blas", relacion: "hijo", edad: 41 }],
    bienes: [{ id: "v1", tipo: "vivienda", descripcion: "Piso A", valor: 200000, titularidad: "privativo", adjudicadoA: "A" }, { id: "v2", tipo: "inmueble", descripcion: "Piso B", valor: 200000, titularidad: "privativo", adjudicadoA: "A" }, { id: "c", tipo: "cuenta", valor: 60000, titularidad: "privativo" }] };
  DB.expedientes.push(x); go({ vista: "exp", id: x.id, sec: "particion", sheet: null }); ui.pstep = 3; render();
  const t3 = document.querySelector(".pbody").innerText; ui.pstep = 2; render(); const t2 = document.querySelector(".pbody").innerText;
  go({ vista: "exp", id: x.id, sec: "herencia", sheet: { tipo: "persona", id: "A" } }); const sh = document.querySelector(".sheet").innerHTML;
  x.ccaa = "EST"; x.ccaaBienes = "MAD"; go({ vista: "exp", id: x.id, sec: "herencia", sheet: null }); const her = document.querySelector("#lg-pi") != null;
  return { t3: /Inevitable y evitable/.test(t3) && /TPO/.test(t3), t2: /colación/i.test(t2), sh: /data-p="indigno"/.test(sh) && /data-p="donacionColacionable"/.test(sh) && /data-p="dispensaColacion"/.test(sh), her };
});
check("Paso 3 de la partición: explica inevitable frente a evitable y el TPO", nuevo.t3);
check("Paso 2 de la partición: muestra la colación", nuevo.t2);
check("Ficha de la persona: indignidad, donación colacionable y dispensa", nuevo.sh);
check("Herederos y bienes: elección de ley (art. 22 Reglamento 650/2012) para el residente fuera", nuevo.her);
check("Sin errores de consola en todo el recorrido", errores.length === 0, errores.slice(0, 3).join(" | "));
await b.close();
console.log(`\n${ok} correctas · ${ko} fallidas`);
process.exit(ko ? 1 : 0);
