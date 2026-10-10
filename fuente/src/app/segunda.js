// ───────────────────── {{MARCA}} · Dos herencias: proyección de la segunda herencia ─────────────────────
// En la mayoría de las familias los dos progenitores fallecen con pocos años de diferencia. Cómo se reparte la
// primera herencia (usufructo universal, renuncia del viudo, adjudicación de la vivienda…) cambia lo que el viudo
// deja después y, con ello, el impuesto de la segunda. Este módulo lo cuantifica con el mismo motor (calcular):
// construye para cada escenario el expediente del segundo fallecimiento y compara el coste fiscal de las dos herencias.
// No inventa reglas: la consolidación del dominio al extinguirse el usufructo (art. 51.2 RISD) se ESTIMA y va marcada PENDIENTE.
const SH_ANIOS = [5, 10, 15, 20], SH_REVAL = [0, 1, 2, 3], SH_UMBRAL = 50; // por debajo de 50 € los escenarios se consideran equivalentes
const SH_DESC = ["hijo", "nieto", "bisnieto"];
const shEsViudo = (p) => ["conyuge", "pareja_hecho"].includes(p.relacion);
const shEsHijo = (p) => SH_DESC.includes(p.relacion);
const shClon = (o) => JSON.parse(JSON.stringify(o));
const shR2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const shInm = (b) => b.tipo === "vivienda" || b.tipo === "inmueble";
const shValor = (b) => (shInm(b) ? Math.max(num(b.valor), num(b.valorReferencia)) : num(b.valor));
const shCC = (b) => cuotaCausante({ titularidad: b.titularidad || "privativo", porcentaje: pctCausante(b.porcentaje) });
const shEdad = (p) => (p && p.edad !== "" && p.edad != null && !isNaN(num(p.edad)) ? num(p.edad) : 40);
// Suma n años a una fecha AAAA-MM-DD (29 de febrero → 1 de marzo, como hace Date).
function shAddAnios(f, n) { const d = new Date(f + "T12:00:00"); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); }
function shEstado() { if (!ui.sh) ui.sh = { anios: 10, reval: 0 }; return ui.sh; }
// Controles data-sh: shSet(clave, valor) desde el manejador de clic del integrador.
function shSet(k, v) { const s = shEstado(); v = Number(v); if (k === "anios") s.anios = SH_ANIOS.includes(v) ? v : 10; if (k === "reval") s.reval = SH_REVAL.includes(v) ? v : 0; return s; }
const SH_NOMBRES = { A: "Como está planteado", B: "Usufructo universal al viudo", C: "Todo a los hijos", D: "El viudo se queda la vivienda" };

// ── Escenarios de la primera herencia ─────────────────────────
function shEscenarios(x, viudo) {
  const L = [{ k: "A", x1: shClon(x) }];
  if (viudo.renuncia) return L; // el viudo ya renunció: no hay reparto alternativo que probar
  if (x.testamento !== "usufructo") { const y = shClon(x); y.testamento = "usufructo"; L.push({ k: "B", x1: y }); }
  { const y = shClon(x); y.testamento = "no"; y.personas.find((p) => p.id === viudo.id).renuncia = true; L.push({ k: "C", x1: y }); }
  const viv = (x.bienes || []).find((b) => b.tipo === "vivienda" && !b.legatarioId);
  if (viv && viv.adjudicadoA !== viudo.id) { const y = shClon(x); for (const b of y.bienes) { if (b.id === viv.id) b.adjudicadoA = viudo.id; else if (b.adjudicadoA === viudo.id) delete b.adjudicadoA; } L.push({ k: "D", x1: y }); }
  return L;
}

// ── Qué le queda al viudo tras la primera herencia ─────────────
// Su mitad de gananciales (no es herencia) + lo que recibe en pleno dominio (pro indiviso, adjudicado o legado).
// El usufructo se extingue al fallecer: no pasa a la segunda herencia (art. 513.1.º CC).
function shPatrimonioViudo(x1, R1, viudo, conmuta, C) {
  const m = R1.isd.masa, der = R1.isd.derechos[viudo.id] || [], hv = R1.isd.herederos.find((h) => h.id === viudo.id);
  const fPleno = viudo.renuncia ? 0 : der.filter((d) => d.tipo === "pleno").reduce((s, d) => s + d.fraccion, 0);
  const fUsu = viudo.renuncia || conmuta ? 0 : der.filter((d) => d.tipo === "usufructo").reduce((s, d) => s + d.fraccion, 0);
  const pctU = pctUsufructoVitalicio(shEdad(viudo));
  const porId = Object.fromEntries((x1.personas || []).map((p) => [p.id, p]));
  const items = (x1.bienes || []).map((b) => {
    const V = shValor(b), cc = shCC(b);
    const propio = b.titularidad === "ganancial" ? 0.5 : 0;
    let heredado = 0;
    if (!viudo.renuncia) {
      if (b.legatarioId) heredado = b.legatarioId === viudo.id ? cc : 0;
      else if (b.adjudicadoA && porId[b.adjudicadoA] && !porId[b.adjudicadoA].renuncia) heredado = b.adjudicadoA === viudo.id ? cc : 0;
      else heredado = fPleno * cc;
    }
    const usuf = fUsu && !b.legatarioId && !b.adjudicadoA ? fUsu * cc : 0;
    return { b, V, cc, propio, heredado, usuf, q: propio + heredado, valor: (propio + heredado) * V, valorUsuf: usuf * V * pctU };
  });
  const legadosViudo = items.filter((i) => i.b.legatarioId === viudo.id).reduce((s, i) => s + i.cc * i.V, 0);
  // Haber en pleno dominio: si conmuta el usufructo, todo lo adquirido (valor fiscal) se convierte en capital
  const haber = viudo.renuncia ? 0 : conmuta && hv ? hv.valorAdquirido : fPleno * m.netoReparto + legadosViudo;
  const enEspecie = items.reduce((s, i) => s + i.heredado * i.V, 0);
  // Ajuste en dinero: positivo, recibe dinero además de los bienes; negativo, paga su parte de deudas y gastos o compensa un exceso
  let ajuste = shR2(haber - enEspecie), faltante = 0, dinero = 0;
  // Con adjudicaciones, el dinero que paga o cobra el viudo es la compensación del cuadro único (cuadroParticion)
  const eC = C && C.H.find((h) => h.id === viudo.id);
  if (eC && Math.abs(eC.dif) >= 1) ajuste = shR2(-eC.dif);
  if (ajuste < -0.5) {
    let resto = -ajuste;
    for (const i of items.filter((i) => i.b.tipo === "cuenta" || i.b.tipo === "valores")) { const u = Math.min(resto, i.valor); i.valor -= u; i.q = i.V ? i.valor / i.V : 0; resto -= u; if (resto <= 0.005) break; }
    faltante = shR2(Math.max(0, resto));
  } else if (ajuste > 0.5) dinero = ajuste;
  const total = shR2(items.reduce((s, i) => s + i.valor, 0) + dinero);
  return { items, fPleno, fUsu, pctU, haber: shR2(haber), ajuste, faltante, dinero, total, mitadGananciales: m.mitadViudo, usufructo: shR2(items.reduce((s, i) => s + i.valorUsuf, 0)) };
}

// ── Expediente de la segunda herencia ──────────────────────────
function shCasoSegunda(x, x1, R1, P, viudo, hijos, anios, reval) {
  const fac = Math.pow(1 + reval, anios), f2 = shAddAnios(x.fecha, anios);
  const revalua = (b) => ["vivienda", "inmueble", "valores", "empresa", "otro"].includes(b.tipo);
  const pp1 = typeof plusPorHeredero === "function" ? plusPorHeredero(R1) : {};
  const bienes = [];
  for (const i of P.items) {
    if (i.q < 1e-6 || i.valor < 0.5) continue;
    const b = i.b, esc = (v) => shR2(v * (revalua(b) ? fac : 1));
    if (shInm(b)) {
      const tramos = [{ cuota: i.propio, fecha: b.fechaAdq, valorAdq: num(b.valorAdq), origen: "mitad de gananciales" }, { cuota: i.heredado, fecha: x.fecha, valorAdq: i.V, origen: "heredado en la primera herencia" }].filter((t) => t.cuota > 1e-6);
      bienes.push({ id: "s-" + b.id, tipo: b.tipo, descripcion: b.descripcion, valor: esc(num(b.valor)), valorReferencia: num(b.valorReferencia) ? esc(num(b.valorReferencia)) : "", titularidad: i.q > 0.9999 ? "privativo" : "proindiviso", porcentaje: shR2(i.q * 100),
        municipio: b.municipio, muniIne: b.muniIne, muniNombre: b.muniNombre, tipoManual: b.tipoManual, bonifManual: b.bonifManual, valorCatastralTotal: b.valorCatastralTotal, valorCatastralSuelo: b.valorCatastralSuelo, localAfecto: b.localAfecto,
        fechaAdq: tramos[0] ? tramos[0].fecha : b.fechaAdq, valorAdq: num(b.valorAdq), shTramos: tramos });
    } else bienes.push({ id: "s-" + b.id, tipo: b.tipo, descripcion: b.descripcion, valor: esc(i.valor), titularidad: "privativo" });
  }
  if (P.dinero > 0.5) bienes.push({ id: "s-dinero", tipo: "cuenta", descripcion: "Dinero recibido en la partición", valor: shR2(P.dinero), titularidad: "privativo" });
  const personas = hijos.map((p) => {
    const h1 = R1.isd.herederos.find((h) => h.id === p.id);
    const q = { ...p, edad: p.edad === "" || p.edad == null ? "" : num(p.edad) + anios, renuncia: false, patrimonioPreexistente: shR2(num(p.patrimonioPreexistente) + (h1 ? h1.valorAdquirido - h1.aIngresar - (pp1[h1.nombre] || 0) : 0)) };
    delete q.seguro; delete q.pct; delete q.donaciones; return q;
  });
  return { id: "sh-" + viudo.id, nombre: viudo.nombre || "Cónyuge viudo", fecha: f2, ccaa: x.ccaa, ccaaBienes: x.ccaaBienes, civil: "viudo", testamento: "no", personas, bienes, deudas: [], gastos: shClon(x.gastos || []), ajuar: x.ajuar || "sts", enPlazo: true, aplicarEmpresa: !!x.aplicarEmpresa, noAplicarVivienda: !!x.noAplicarVivienda, causanteEmpadronado: x.causanteEmpadronado, criterioVivienda: "DGT", tareas: {}, proyeccion: true, vecindadCivil: x.vecindadCivil, isla: x.isla };
}
// Plusvalía de la segunda herencia por tramos de adquisición: la mitad de gananciales conserva su fecha de compra;
// lo heredado se adquirió al primer fallecimiento por su valor entonces. Misma función del motor que calcular().
function shPlusSegunda(x2, R2) {
  const out = []; let total = 0;
  for (const b of x2.bienes.filter(plusCompleto)) {
    const titulares = (x2.personas || []).filter((p) => !p.renuncia).map((p) => ({ heredero: titularPlus(p), fraccion: (R2.isd.derechos[p.id] || []).reduce((s, d) => s + (d.tipo === "pleno" ? d.fraccion : 0), 0) })).filter((t) => t.fraccion > 0);
    const tramos = (b.shTramos || [{ cuota: shCC(b), fecha: b.fechaAdq, valorAdq: num(b.valorAdq) }]).map((t) => {
      const inm = datosPlus(x2, b); inm.cuota = t.cuota; inm.adquisicion = { fecha: t.fecha, valor: t.valorAdq };
      try { return { t, r: calcularPlusvalia({ inmueble: inm, titulares, fecha: x2.fecha, caudalTotal: R2.isd.masa.bruto }) }; } catch (e) { return null; }
    }).filter(Boolean);
    const tot = shR2(tramos.reduce((s, q) => s + q.r.total, 0)); total += tot;
    const porTitular = {}; for (const q of tramos) for (const pt of q.r.porTitular) porTitular[pt.heredero] = shR2((porTitular[pt.heredero] || 0) + pt.aIngresar);
    out.push({ b, total: tot, tramos, porTitular, municipio: tramos[0]?.r.municipio || "" });
  }
  return { plus: out, total: shR2(total) };
}
// Consolidación del dominio al extinguirse el usufructo (art. 51.2 RISD): el nudo propietario tributa por el valor del
// usufructo no liquidado, con el tipo medio efectivo de la primera herencia. ESTIMACIÓN: tipo medio efectivo de cada hijo
// como si hubiera heredado en pleno dominio (cuota a pagar / base imponible del escenario «todo a los hijos»). PENDIENTE.
function shConsolidacion(R1, viudo, teo, conmuta) {
  if (conmuta || !teo) return { total: 0, detalle: [] };
  const m = R1.isd.masa, det = [];
  for (const h of R1.isd.herederos) {
    const nuda = (h.derechos || []).filter((d) => d.tipo === "nuda" && d.usufructuarioId === viudo.id).reduce((s, d) => s + d.fraccion, 0);
    if (nuda <= 0) continue;
    const valor = shR2(nuda * pctUsufructoVitalicio(shEdad(viudo)) * m.netoReparto);
    const th = teo.isd.herederos.find((q) => q.id === h.id);
    const tipo = th && th.baseImponible > 0 ? th.aIngresar / th.baseImponible : 0;
    det.push({ id: h.id, nombre: h.nombre, valor, tipo, cuota: shR2(valor * tipo) });
  }
  return { total: shR2(det.reduce((s, d) => s + d.cuota, 0)), detalle: det };
}

// ── Motor del módulo ───────────────────────────────────────────
const _cacheSH = new Map();
function segundaHerencia(x, R, opts = {}) {
  const s = shEstado(), anios = opts.anios ?? s.anios, revalPct = opts.revalorizacion ?? s.reval, reval = revalPct / 100;
  if (!R) return { aplicable: false, motivo: "Faltan datos para calcular la herencia: completa fecha, comunidad, herederos y bienes." };
  const viudo = (x.personas || []).find(shEsViudo);
  const hijos = (x.personas || []).filter(shEsHijo);
  if (!viudo) return { aplicable: false, motivo: "No hay cónyuge ni pareja en el expediente: la herencia se transmite una sola vez y no hay segunda herencia que proyectar." };
  if (!hijos.length) return { aplicable: false, motivo: "No hay descendientes: sin una segunda transmisión a los hijos no hay dos repartos que comparar." };
  const key = JSON.stringify([x.fecha, x.ccaa, x.ccaaBienes, x.civil, x.testamento, x.personas, x.bienes, x.deudas, x.gastos, x.ajuar, x.enPlazo, x.aplicarEmpresa, x.noAplicarVivienda, x.causanteEmpadronado, anios, revalPct]);
  if (_cacheSH.has(key)) return _cacheSH.get(key);
  let out;
  try { out = segundaHerencia0(x, R, viudo, hijos, anios, reval, revalPct); } catch (e) { out = { aplicable: false, motivo: "No se ha podido proyectar la segunda herencia con estos datos." }; }
  if (_cacheSH.size > 40) _cacheSH.clear();
  _cacheSH.set(key, out); return out;
}
function segundaHerencia0(x, R, viudo, hijos, anios, reval, revalPct) {
  const terr = x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa;
  const E = shEscenarios(x, viudo);
  // Referencia para el tipo medio de la consolidación: los hijos heredan todo en pleno dominio
  let teo = null; { const y = shClon(x); y.testamento = "no"; y.personas.find((p) => p.id === viudo.id).renuncia = true; teo = calcular(y); }
  const escenarios = [];
  for (const e of E) {
    const R1 = calcular(e.x1); if (!R1) continue;
    const der = R1.isd.derechos[viudo.id] || [];
    const conmuta = der.some((d) => d.tipo === "usufructo") && (e.x1.bienes || []).some((b) => b.adjudicadoA === viudo.id);
    const C1 = typeof cuadroParticion === "function" ? cuadroParticion(e.x1, R1) : null;
    const P = shPatrimonioViudo(e.x1, R1, viudo, conmuta, C1);
    const x2 = shCasoSegunda(x, e.x1, R1, P, viudo, hijos, anios, reval);
    const R2 = x2.bienes.length ? calcular(x2) : null;
    const PL2 = R2 ? shPlusSegunda(x2, R2) : { plus: [], total: 0 };
    const C = shConsolidacion(R1, viudo, teo, conmuta);
    // Coste del exceso de adjudicación (AJD/TPO): el mismo cálculo que Partición, Firma y el Diagnóstico
    const otros = C1 ? C1.coste : 0;
    const primera = { isd: R1.isd.total, plus: R1.totalPlus, otros, exceso: C1 ? C1.totalExceso : 0, excesoPendiente: !!(C1 && C1.pendiente), otrosNota: C1 && C1.excesos.length ? "Exceso de adjudicación: " + C1.excesos.map((q) => `${eur0(q.exceso)} · ${q.txtCoste}`).join("; ") : "", cuadro: C1, total: shR2(R1.isd.total + R1.totalPlus + otros) };
    const segunda = { isd: R2 ? R2.isd.total : 0, plus: PL2.total, consolidacion: C.total, total: shR2((R2 ? R2.isd.total : 0) + PL2.total + C.total), herederos: R2 ? R2.isd.herederos.map((h) => ({ id: h.id, nombre: h.nombre, aIngresar: h.aIngresar, plus: PL2.plus.reduce((s, q) => s + (q.porTitular[h.nombre] || 0), 0), valorAdquirido: h.valorAdquirido })) : [], plusDetalle: PL2.plus, alertas: R2 ? R2.isd.alertas : [] };
    escenarios.push({ k: e.k, nombre: SH_NOMBRES[e.k], descripcion: shDescripcion(e.k, x, e.x1, R1, P, viudo, hijos, terr), x1: e.x1, R1, x2, R2, patrimonioViudo: P, conmuta, consolidacion: C, primera, segunda, total: shR2(primera.total + segunda.total), ahorroVsBase: 0 });
  }
  const base = escenarios.find((e) => e.k === "A") || escenarios[0];
  for (const e of escenarios) e.ahorroVsBase = shR2(base.total - e.total);
  let mejor = escenarios.reduce((m, e) => (!m || e.total < m.total - 0.5 ? e : m), null);
  if (mejor && base.total - mejor.total < SH_UMBRAL) mejor = base;
  // K3 (control de calidad 07-10-2026): «menor coste» solo si el escenario gana a todos los demás por más del umbral; si no, los que quedan
  // dentro del umbral son equivalentes (las diferencias de céntimos vienen del redondeo de cada cuota, no de la estrategia)
  const minimo = Math.min(...escenarios.map((e) => e.total));
  const equivalentes = escenarios.filter((e) => e.total - minimo < SH_UMBRAL);
  const mejorClaro = escenarios.length > 1 && equivalentes.length === 1 && equivalentes[0] === mejor;
  const f2 = shAddAnios(x.fecha, anios);
  const notas = [
    `Segunda herencia proyectada al ${fechaLarga(f2)} (${anios} años después del primer fallecimiento) con la normativa vigente hoy: no se anticipan cambios legales.`,
    `Valores de hoy${revalPct ? ` con una revalorización del ${revalPct} % anual en inmuebles, valores y empresas (no en cuentas ni vehículos)` : ", sin revalorización"}; valores catastrales sin actualizar. Edades de los hijos ${anios} años mayores.`,
    `El patrimonio del viudo se compone de su mitad de gananciales y de lo que recibe en la primera herencia. No constan bienes privativos propios del viudo: si los tiene, la segunda herencia será mayor en todos los escenarios.`,
    "El usufructo se extingue al fallecer el usufructuario y no forma parte de su herencia (art. 513.1.º CC, VERIFICADO). Los nudos propietarios consolidan el dominio y tributan por el valor del usufructo con el tipo medio de la primera liquidación (art. 51.2 RD 1629/1991): aquí se estima con el tipo medio efectivo de cada hijo; PENDIENTE de modelar en detalle. La consolidación no está sujeta a plusvalía municipal (criterio DGT, PENDIENTE de cotejo).",
    "En la segunda herencia los hijos heredan por partes iguales en pleno dominio y se suponen hijos comunes. Gastos de entierro iguales a los de la primera; sin deudas. El patrimonio previo de cada hijo incluye lo que recibe neto en la primera herencia.",
    "En la plusvalía de la segunda herencia, la mitad de gananciales conserva la fecha de compra original y la parte heredada cuenta desde el primer fallecimiento, por su valor de entonces.",
  ];
  return { aplicable: true, x, viudo, hijos, anios, reval: revalPct, fecha2: f2, mejorClaro, equivalentes, hoy: { isd: R.isd.total, plus: R.totalPlus, total: shR2(R.isd.total + R.totalPlus) }, escenarios, base, mejor, notas };
}
function shDescripcion(k, x, x1, R1, P, viudo, hijos, terr) {
  const n = viudo.nombre || "el cónyuge viudo", nh = hijos.length, hs = nh === 1 ? "el hijo" : "los hijos";
  const rep = R1.isd.notasReparto[0] || "";
  if (k === "A") return `${x.testamento === "usufructo" ? `Testamento de usufructo universal: ${n} recibe el usufructo de toda la herencia y ${hs} la nuda propiedad.` : x.testamento === "porcentajes" ? `Reparto según el testamento: ${n} recibe el ${grp(P.fPleno * 100, 0)} % en pleno dominio.` : viudo.renuncia ? `${n} ha renunciado: ${hs} reciben toda la herencia y ${n} conserva solo su mitad de gananciales.` : `Sin testamento: ${n} recibe el usufructo del tercio de mejora y ${hs} el resto (art. 834 CC).`}`;
  if (k === "B") return `${n} conserva el uso y disfrute de todos los bienes mientras viva; ${hs} reciben la nuda propiedad y tributan hoy solo por ella (el usufructo vale el ${grp(P.pctU * 100, 0)} % por la edad de ${n}). Al fallecer, el usufructo se extingue sin pasar por la segunda herencia.`;
  if (k === "C") return `${n} renuncia pura y simplemente ante notario: ${hs} reciben toda la herencia en pleno dominio. ${n} conserva su mitad de gananciales (${eur0(P.mitadGananciales)}), que no es herencia, y eso es lo único que dejará después.`;
  return `${n} se adjudica la vivienda entera (su mitad de gananciales más la parte del causante) en pago de su haber${P.fUsu || x1.testamento !== "porcentajes" ? ", conmutando su usufructo (arts. 839-840 CC)" : ""}; ${hs} reciben el resto. La vivienda completa formará la segunda herencia.`;
}
// Qué implica y riesgos de cada escenario (texto con fuente y estado)
function shTextos(e, S) {
  const v = S.viudo.nombre || "el viudo", P = e.patrimonioViudo, x = S.x, terr = x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa;
  const conv = S.hijos.some((p) => p.convivio2anios);
  const implica = [], riesgos = [];
  if (e.k === "A") {
    implica.push(`Es la situación de partida del expediente: ${e.R1.isd.notasReparto[0] || "reparto según el título sucesorio."}`);
    if (P.fUsu) implica.push(`El usufructo de ${v} (${eur0(P.usufructo)}) se extingue a su fallecimiento y no se hereda; los hijos consolidan el dominio.`);
    riesgos.push({ t: "Los riesgos son los propios del expediente (ver «Para revisar» en el resumen).", n: "", s: "" });
    if (P.fUsu) riesgos.push({ t: `Consolidación del dominio al fallecer ${v}: ${eur0(e.consolidacion.total)} estimados.`, n: "art. 51.2 RD 1629/1991", s: "PENDIENTE" });
  }
  if (e.k === "B") {
    implica.push(`${v} mantiene el control económico de todo el patrimonio (vivienda, cuentas, rentas) sin depender de los hijos; los hijos tributan hoy por el ${grp((1 - P.pctU) * 100, 0)} % del valor.`);
    implica.push("Al segundo fallecimiento no hay herencia sobre esos bienes: solo la consolidación del dominio, que tributa por el usufructo con el tipo medio de la primera liquidación.");
    if (x.testamento !== "usufructo") riesgos.push({ t: "Tras el fallecimiento solo cabe si el testamento lo dispone; pactarlo ahora entre herederos es una cesión de derechos que tributa aparte. Sirve como referencia para el testamento del viudo o de otros clientes.", n: "art. 1000 CC · art. 28 Ley 29/1987", s: "VERIFICADO" });
    riesgos.push({ t: "Necesita cautela socini: si un hijo exige su legítima estricta libre de usufructo, pierde lo que exceda de ella.", n: "art. 820.3 CC", s: "VERIFICADO" });
    riesgos.push({ t: "Para vender o hipotecar hace falta el acuerdo de usufructuario y nudos propietarios.", n: "arts. 480 y 489 CC", s: "VERIFICADO" });
    riesgos.push({ t: `Consolidación del dominio al fallecer ${v}: ${eur0(e.consolidacion.total)} estimados.`, n: "art. 51.2 RD 1629/1991", s: "PENDIENTE" });
  }
  if (e.k === "C") {
    implica.push(`Los hijos reciben hoy toda la herencia en pleno dominio y ${v} deja de ser heredero: su patrimonio queda en ${eur0(P.total)}.`);
    implica.push("La segunda herencia es la más pequeña posible y no hay usufructo que consolidar.");
    riesgos.push({ t: "La renuncia es irrevocable y solo vale ante notario, antes de cualquier acto de aceptación.", n: "arts. 997, 999 y 1008 CC", s: "VERIFICADO" });
    riesgos.push({ t: `${v} pierde el usufructo legal y la protección de la vivienda: dependerá de los hijos para seguir en ella.`, n: "arts. 834 y 1406.4.º CC", s: "VERIFICADO" });
    riesgos.push({ t: "Quien recibe la parte renunciada tributa con el parentesco del renunciante si es más gravoso; entre cónyuge e hijos (grupo II) no cambia.", n: "art. 28 Ley 29/1987 · art. 58 RD 1629/1991", s: "VERIFICADO" });
    if (S.hijos.some((p) => shEdad(p) < 18)) riesgos.push({ t: "Hay hijos menores: la renuncia de sus representantes exige autorización judicial.", n: "art. 166 CC", s: "VERIFICADO" });
  }
  if (e.k === "D") {
    implica.push(`Protege el techo de ${v}: la vivienda pasa a ser suya en pleno dominio y puede venderla o hipotecarla sin contar con los hijos.`);
    implica.push(`Concentra la segunda herencia en la vivienda: los hijos tributarán por ella entera al segundo fallecimiento${conv ? "; la reducción por vivienda habitual se aplica porque algún hijo convive" : "; sin hijo conviviente no hay reducción por vivienda habitual (según la comunidad)"}.`);
    { const CD = e.primera.cuadro, eV = CD && CD.excesos.find((q) => q.id === S.viudo.id);
      if (eV) riesgos.push({ t: `Exceso de adjudicación de ${eur0(eV.exceso)}: ${cpTxtCompensaciones(CD)}. ${eV.txtCoste}.${eV.falta > 0.5 ? ` Su dinero disponible (${eur0(eV.liquido)}) no alcanza: faltan ${eur0(eV.falta)}.` : ""}`, n: CD.T.ajdNorma + " · art. 1062 CC", s: eV.trib.estado });
      else if (P.dinero > 0.5) implica.push(`La vivienda cabe en su parte: además recibe ${eur0(P.dinero)} en dinero.`); }
    if (x.testamento === "usufructo") riesgos.push({ t: "Conmutar un usufructo universal testamentario sin autorización del testador se ha calificado como permuta, con tributación propia.", n: "arts. 839-840 CC · art. 57 RD 1629/1991 · jurisprudencia TS", s: "PENDIENTE" });
    else riesgos.push({ t: "La conmutación del usufructo legal se liquida como adquisición en pleno dominio: la cuota total apenas cambia, aunque su distribución entre herederos puede variar.", n: "art. 57 RD 1629/1991", s: "PENDIENTE" });
    riesgos.push({ t: "Si la vivienda tenía reducción por vivienda habitual en la primera herencia, adjudicarla a un solo heredero cambia quién la aplica; en Andalucía es criterio litigioso.", n: "Res. DGT 2/1999 · STSJ Andalucía 1011/2026", s: "PENDIENTE" });
  }
  return { implica, riesgos };
}

// ── Vista: pestaña «Dos herencias» ─────────────────────────────
const SH_COL = { i1: "var(--c4)", p1: "var(--c6)", x1: "var(--c5)", i2: "color-mix(in srgb,var(--c4) 50%,var(--panel))", p2: "color-mix(in srgb,var(--c6) 50%,var(--panel))", c2: "repeating-linear-gradient(135deg,color-mix(in srgb,var(--c4) 50%,var(--panel)) 0 4px,var(--panel) 4px 7px)" };
function shControles(S) {
  const s = shEstado();
  const seg = (k, vals, fmt) => `<div class="seg" role="group" aria-label="${k === "anios" ? "Años hasta el segundo fallecimiento" : "Revalorización anual"}">${vals.map((v) => `<button data-sh="${k}" data-v="${v}" aria-pressed="${s[k] === v}">${fmt(v)}</button>`).join("")}</div>`;
  return `<div class="sh-ctl"><div><span class="kick">Segundo fallecimiento dentro de</span>${seg("anios", SH_ANIOS, (v) => v + " años")}</div><div><span class="kick">Revalorización anual</span>${seg("reval", SH_REVAL, (v) => v + " %")}</div></div>`;
}
function shBarras(S) {
  const max = Math.max(1, ...S.escenarios.map((e) => e.total));
  const seg = (v, cls, t) => v > 0.5 ? `<i class="${cls}" style="width:${v / max * 100}%" title="${esc(t)}: ${eur0(v)}"></i>` : "";
  return `<div class="sh-bars">${S.escenarios.map((e) => `<div class="sh-bar ${e === S.mejor ? "best" : ""}"><div class="sh-bn"><b>${esc(e.nombre)}</b>${e === S.mejor && S.mejorClaro ? `<span class="tag gold">El que menos paga en total</span>` : S.escenarios.length > 1 && !S.mejorClaro && S.equivalentes.includes(e) ? `<span class="tag I">Coste equivalente</span>` : ""}${e.k === "A" ? `<span class="tag I">Actual</span>` : ""}</div><div class="sh-bt">${seg(e.primera.isd, "i1", "Sucesiones, primera herencia")}${seg(e.primera.plus, "p1", "Plusvalía, primera herencia")}${seg(e.primera.otros, "x1", "Exceso de adjudicación (AJD/TPO), primera herencia")}${seg(e.segunda.isd, "i2", "Sucesiones, segunda herencia")}${seg(e.segunda.plus, "p2", "Plusvalía, segunda herencia")}${seg(e.segunda.consolidacion, "c2", "Consolidación del usufructo (estimación)")}</div><div class="sh-bv num"><b>${eur0(e.total)}</b>${e.k !== "A" ? `<small class="${e.ahorroVsBase > 0.5 ? "down" : e.ahorroVsBase < -0.5 ? "up" : ""}">${Math.abs(e.ahorroVsBase) < 0.5 ? "igual" : (e.ahorroVsBase > 0 ? "−" : "+") + eur0(Math.abs(e.ahorroVsBase))}</small>` : `<small>referencia</small>`}</div></div>`).join("")}</div>
    <div class="legend-inline sh-leg"><span><i style="background:${SH_COL.i1}"></i>Sucesiones · primera</span><span><i style="background:${SH_COL.p1}"></i>Plusvalía · primera</span>${S.escenarios.some((e) => e.primera.otros > 0.5) ? `<span><i style="background:${SH_COL.x1}"></i>Exceso (AJD/TPO) · primera</span>` : ""}<span><i style="background:${SH_COL.i2}"></i>Sucesiones · segunda</span><span><i style="background:${SH_COL.p2}"></i>Plusvalía · segunda</span><span><i style="background:${SH_COL.c2}"></i>Consolidación del usufructo</span></div>`;
}
function shTabla(S) {
  const c = (v) => `<td class="n">${v > 0.5 || v < -0.5 ? eur0(v) : "—"}</td>`;
  return `<div class="tablewrap card sh-tw" style="padding:0"><table class="grid-t sh-t"><thead><tr><th>Escenario</th><th class="n">Sucesiones<small>primera</small></th><th class="n">Plusvalía<small>primera</small></th><th class="n">Exceso<small>AJD/TPO</small></th><th class="n">Sucesiones<small>segunda</small></th><th class="n">Plusvalía<small>segunda</small></th><th class="n">Consolidación<small>estimada</small></th><th class="n">Total</th><th class="n">Frente a la actual</th></tr></thead><tbody>
    ${S.escenarios.map((e) => `<tr class="${e === S.mejor ? "on" : ""}"><td><b>${esc(e.nombre)}</b><small>${e.k === "A" ? "situación actual" : "escenario"}${e.primera.exceso ? ` · exceso de adjudicación ${eur0(e.primera.exceso)}` : ""}</small></td>${c(e.primera.isd)}${c(e.primera.plus)}${e.primera.exceso ? `<td class="n">${eur0(e.primera.otros)}${e.primera.excesoPendiente ? "<small>en verificación</small>" : ""}</td>` : c(0)}${c(e.segunda.isd)}${c(e.segunda.plus)}${c(e.segunda.consolidacion)}<td class="n"><b>${eur0(e.total)}</b></td><td class="n ${e.ahorroVsBase > 0.5 ? "down" : e.ahorroVsBase < -0.5 ? "up" : ""}">${e.k === "A" ? "—" : Math.abs(e.ahorroVsBase) < 0.5 ? "igual" : (e.ahorroVsBase > 0 ? "ahorra " : "paga ") + eur0(Math.abs(e.ahorroVsBase)) + (e.ahorroVsBase > 0 ? "" : " más")}</td></tr>`).join("")}</tbody></table></div>`;
}
function shTarjeta(e, S) {
  const P = e.patrimonioViudo, T = shTextos(e, S), v = S.viudo.nombre || "Viudo";
  const items = P.items.filter((i) => i.valor > 0.5).map((i) => `<div class="sh-it"><span>${esc(i.b.descripcion || TIPO_BIEN[i.b.tipo][0])}<small>${i.q > 0.9999 ? "entero" : grp(i.q * 100, i.q * 100 % 1 ? 1 : 0) + " %"}${i.propio && i.heredado ? " · mitad propia + herencia" : i.propio ? " · mitad de gananciales" : " · herencia"}</small></span><b class="num">${eur0(i.valor)}</b></div>`).join("");
  const extra = `${P.dinero > 0.5 ? `<div class="sh-it"><span>Dinero de la partición<small>ajuste de su haber</small></span><b class="num">${eur0(P.dinero)}</b></div>` : ""}${P.usufructo > 0.5 ? `<div class="sh-it dim"><span>Usufructo vitalicio<small>se extingue: no se transmite</small></span><b class="num">${eur0(P.usufructo)}</b></div>` : ""}${(() => { const eV = e.primera.cuadro && e.primera.cuadro.excesos.find((q) => q.id === S.viudo.id); return eV ? `<div class="sh-it warn"><span>Compensación que paga en dinero<small>exceso de adjudicación${P.faltante > 0.5 ? ` · le faltan ${eur0(P.faltante)} de liquidez` : ""}</small></span><b class="num">−${eur0(eV.paga)}</b></div>` : ""; })()}`;
  const H2 = e.segunda.herederos.map((h) => `<div class="sh-it"><span>${esc(h.nombre)}<small>recibe ${eur0(h.valorAdquirido)}</small></span><b class="num">${eur0(h.aIngresar + h.plus)}<small>${h.plus > 0.5 ? `Sucesiones ${eur0(h.aIngresar)} · plusvalía ${eur0(h.plus)}` : "Sucesiones"}</small></b></div>`).join("");
  return `<details class="lever sh-card ${e === S.mejor && S.escenarios.length > 1 ? "si" : ""}" ${e.k === "A" || e === S.mejor ? "open" : ""}><summary><span class="lx">${e.k}</span><span style="min-width:0"><h4>${esc(e.nombre)}</h4><small>${esc(e.descripcion)}</small></span><span class="sv">${eur0(e.total)}<small>${e.k === "A" ? "dos herencias, hoy" : e.ahorroVsBase > 0.5 ? `ahorra ${eur0(e.ahorroVsBase)}` : e.ahorroVsBase < -0.5 ? `paga ${eur0(-e.ahorroVsBase)} más` : "igual que la actual"}</small></span></summary>
    <div class="lb"><div class="sh-grid">
      <div><div class="sh-h">Primera herencia · hoy</div><div class="kv sm sh-kv"><span>Sucesiones</span><span>${eur(e.primera.isd)}</span><span>Plusvalía</span><span>${eur(e.primera.plus)}</span>${e.primera.otros ? `<span>${esc(e.primera.otrosNota)}</span><span>${eur(e.primera.otros)}</span>` : ""}<span class="b">Total</span><span class="b">${eur(e.primera.total)}</span></div></div>
      <div><div class="sh-h">Lo que queda a ${esc(v)}</div><div class="sh-items">${items || `<div class="sh-it dim"><span>Sin bienes conocidos</span><b>0 €</b></div>`}${extra}<div class="sh-it tot"><span>Patrimonio que transmitirá</span><b class="num">${eur0(P.total)}</b></div></div></div>
      <div><div class="sh-h">Segunda herencia · ${fechaLarga(S.fecha2).replace(/^\d+ de /, "")}</div>${e.R2 ? `<div class="sh-items">${H2}<div class="sh-it tot"><span>Sucesiones y plusvalía</span><b class="num">${eur0(e.segunda.isd + e.segunda.plus)}</b></div>${e.segunda.consolidacion > 0.5 ? `<div class="sh-it"><span>Consolidación del usufructo<small>estimación · art. 51.2 RISD ${tagE("PENDIENTE")}</small></span><b class="num">${eur0(e.segunda.consolidacion)}</b></div>` : ""}</div>` : `<p class="caption">${esc(v)} no tendría bienes conocidos: no habría segunda herencia que liquidar.${e.segunda.consolidacion > 0.5 ? ` Solo la consolidación del usufructo: ${eur0(e.segunda.consolidacion)} estimados.` : ""}</p>`}</div>
    </div>
    <div class="sh-grid2"><div><div class="sh-h">Qué implica</div>${T.implica.map((t) => `<p>${esc(t)}</p>`).join("")}</div><div><div class="sh-h">Riesgos y cautelas</div><ul class="sh-r">${T.riesgos.map((r) => `<li>${esc(r.t)}${r.n ? ` <span class="sh-n">${esc(r.n)} ${tagE(r.s)}</span>` : ""}</li>`).join("")}</ul></div></div>
    ${e.segunda.plusDetalle.length ? `<p class="caption sh-pl">Plusvalía de la segunda herencia por tramos: ${e.segunda.plusDetalle.map((q) => `${esc(q.b.descripcion || "Inmueble")}: ${q.tramos.map((t) => `${grp(t.t.cuota * 100, 0)} % ${t.t.origen || ""} (${t.r.notaCoef}, ${eur0(t.r.total)})`).join("; ")}`).join(" · ")}.</p>` : ""}
    </div></details>`;
}
function tSegunda(x, R) {
  const S = segundaHerencia(x, R);
  if (!S.aplicable) return `<div class="card empty sh-empty"><b>Dos herencias</b>${esc(S.motivo)}<p class="caption" style="margin:12px 0 0">Esta sección compara cómo repartir la primera herencia entre el viudo y los hijos y qué impuestos suman las dos herencias.</p></div>`;
  const A = S.base, ah = S.mejor && S.mejor !== A ? S.mejor.ahorroVsBase : 0;
  return `<div class="sh-hero"><p class="sh-lead">Cuando fallezca ${esc(S.viudo.nombre || "el cónyuge viudo")}, lo que reciba hoy volverá a heredarse. Cómo se reparta ahora decide cuánto pagarán los hijos dos veces.</p>
    <div class="hero-save sh-stats"><div><div class="kick">Primera herencia · hoy</div><b>${eur0(A.primera.total)}</b><small>Sucesiones ${eur0(A.primera.isd)} · plusvalía ${eur0(A.primera.plus)}${A.primera.otros ? ` · exceso ${eur0(A.primera.otros)}` : ""}</small></div><div><div class="kick">Segunda herencia · dentro de ${S.anios} años</div><b>${eur0(A.segunda.total)}</b><small>con el reparto actual · ${plural(S.hijos.length, "heredero")}</small></div><div class="${ah > 0.5 ? "g" : ""}"><div class="kick">Ahorro a dos herencias</div><b>${ah > 0.5 ? eur0(ah) : "—"}</b><small>${ah > 0.5 ? `con «${esc(S.mejor.nombre)}»` : "el reparto actual es el que menos paga o las diferencias son mínimas"}</small></div></div></div>
    ${shControles(S)}
    <div class="card" style="margin-top:14px">${cardH("Coste fiscal de las dos herencias", `${S.escenarios.length} ${S.escenarios.length === 1 ? "escenario" : "escenarios"} · primera herencia hoy y segunda dentro de ${S.anios} años`)}${shBarras(S)}</div>
    <div class="sectitle flex"><b>Las cifras</b><span>Normativa vigente hoy · valores de hoy</span></div>${shTabla(S)}
    <div class="sectitle flex"><b>Cada escenario</b><span>Qué queda al viudo y qué pagan los hijos después</span></div><div class="grid" style="gap:10px">${S.escenarios.map((e) => shTarjeta(e, S)).join("")}</div>
    <div class="sectitle">Supuestos de la proyección</div><div class="group"><ul class="notes">${S.notas.map((n) => `<li><i class="dot gold"></i><span>${esc(n)}</span></li>`).join("")}</ul></div>
    <p class="foot-note">Proyección orientativa con la normativa vigente hoy: no anticipa cambios legales ni de valor. La consolidación del dominio está estimada. Las decisiones sobre el reparto las toma el abogado con la familia.</p>`;
}
// Tarjeta compacta para el Resumen
function shResumen(x, R) {
  const S = segundaHerencia(x, R); if (!S.aplicable) return "";
  const A = S.base, ah = S.mejor && S.mejor !== A ? S.mejor.ahorroVsBase : 0;
  return `<button class="card sh-res" data-sec="segunda"><div class="card-h" style="margin-bottom:10px"><div><div class="k">Coste a dos herencias</div><h3>Hoy ${eur0(A.primera.total)} · dentro de ${S.anios} años ${eur0(A.segunda.total)}</h3></div><span class="link">Ver ›</span></div><div class="sh-res-b">${shMiniBarra(A, S)}</div><p class="caption" style="margin:10px 0 0">${ah > 0.5 ? `Ahorro a dos herencias (hoy y la segunda): <b style="color:var(--gold)">${eur0(ah)}</b> con «${esc(S.mejor.nombre)}».` : "El reparto actual es el que menos paga en total, o las diferencias son mínimas."}</p></button>`;
}
function shMiniBarra(e, S) {
  const max = Math.max(1, ...S.escenarios.map((q) => q.total));
  const seg = (v, cls) => v > 0.5 ? `<i class="${cls}" style="width:${v / max * 100}%"></i>` : "";
  return `<div class="sh-bt">${seg(e.primera.isd, "i1")}${seg(e.primera.plus, "p1")}${seg(e.primera.otros, "x1")}${seg(e.segunda.isd, "i2")}${seg(e.segunda.plus, "p2")}${seg(e.segunda.consolidacion, "c2")}</div>`;
}
// Bloques para el informe PDF (pdf.js)
function shParaInforme(x, R) {
  const S = segundaHerencia(x, R); if (!S.aplicable) return [];
  const E0 = (n) => eur0(n || 0); // tabla de escenarios en euros enteros (K3, control de calidad 07-10-2026)
  const E = (n) => eur(n || 0).replace(/ €$/, " €");
  const bl = [];
  bl.push({ tipo: "h", texto: "Proyección de la segunda herencia" });
  bl.push({ tipo: "p", texto: `Al fallecer ${S.viudo.nombre || "el cónyuge viudo"}, lo que recibe hoy volverá a heredarse. Se compara el coste fiscal de las dos herencias según cómo se reparta la primera. Segunda herencia proyectada al ${fechaLarga(S.fecha2)} con la normativa vigente hoy y valores de hoy${S.reval ? ` revalorizados un ${S.reval} % anual` : ""}.` });
  const hayEx = S.escenarios.some((e) => e.primera.otros > 0.5);
  bl.push({ tipo: "tabla", cabecera: ["Escenario", "ISD 1.ª", "Plusv. 1.ª", ...(hayEx ? ["Exceso"] : []), "ISD 2.ª", "Plusv. 2.ª", "Consolid.", "Total"], filas: S.escenarios.map((e) => [e.nombre + (e === S.mejor && S.mejorClaro ? " (menor coste)" : S.escenarios.length > 1 && !S.mejorClaro && S.equivalentes.includes(e) ? " (coste equivalente)" : ""), E0(e.primera.isd), E0(e.primera.plus), ...(hayEx ? [E0(e.primera.otros)] : []), E0(e.segunda.isd), E0(e.segunda.plus), E0(e.segunda.consolidacion), E0(e.total)]), alinear: ["l", "r", "r", ...(hayEx ? ["r"] : []), "r", "r", "r", "r"] });
  bl.push({ tipo: "p", texto: `ISD: Impuesto sobre Sucesiones. Plusv.: plusvalía municipal.${hayEx ? " Exceso: AJD o TPO del exceso de adjudicación, mismo cálculo que el cuadro de partición." : ""} Consolid.: consolidación del dominio al extinguirse el usufructo (estimación). 1.ª: primera herencia, hoy; 2.ª: segunda herencia. Importes redondeados al euro; las diferencias de menos de ${SH_UMBRAL} € se consideran coste equivalente.` });
  for (const e of S.escenarios) {
    const T = shTextos(e, S), P = e.patrimonioViudo;
    bl.push({ tipo: "h", texto: `${e.k}. ${e.nombre}` });
    bl.push({ tipo: "p", texto: e.descripcion });
    bl.push({ tipo: "fila", etiqueta: `Patrimonio que transmitirá ${S.viudo.nombre || "el viudo"}`, valor: E(P.total) });
    if (P.usufructo > 0.5) bl.push({ tipo: "fila", etiqueta: "Usufructo vitalicio (se extingue, no se transmite)", valor: E(P.usufructo) });
    if (e.primera.cuadro && e.primera.cuadro.excesos.length) bl.push({ tipo: "fila", etiqueta: "Exceso de adjudicación", valor: `${E(e.primera.exceso)} · coste ${E(e.primera.otros)}` });
    if (P.faltante > 0.5) bl.push({ tipo: "fila", etiqueta: "Compensación que no cubre su dinero", valor: E(P.faltante) });
    bl.push({ tipo: "fila", etiqueta: "Coste de las dos herencias", valor: E(e.total), negrita: true });
    if (e.k !== "A") bl.push({ tipo: "fila", etiqueta: "Frente al reparto actual", valor: (e.ahorroVsBase >= 0 ? "ahorra " : "paga de más ") + E(Math.abs(e.ahorroVsBase)) });
    bl.push({ tipo: "lista", items: [...T.implica, ...T.riesgos.map((r) => r.t + (r.n ? ` (${r.n}${r.s === "PENDIENTE" ? ", pendiente de cotejo" : ""})` : ""))] });
  }
  bl.push({ tipo: "h", texto: "Supuestos" });
  bl.push({ tipo: "lista", items: S.notas });
  bl.push({ tipo: "nota", texto: "Proyección orientativa con la normativa vigente hoy. La consolidación del dominio al extinguirse el usufructo (art. 51.2 RD 1629/1991) está estimada y pendiente de modelar en detalle. Las decisiones sobre el reparto corresponden al abogado con la familia." });
  return bl;
}
