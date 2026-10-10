// ───────────────────── {{MARCA}} · normativa aplicada y biblioteca ─────────────────────
// BIBLIO (src/biblioteca.json): normas estatales, autonómicas por territorio y ordenanzas municipales, con URL verificada.
const PATRON_EST = {
  CC: /\bCC\b|C[óo]digo Civil/, LISD: /Ley 29\/1987|\bLISD\b/, RISD: /RD 1629\/1991|\bRISD\b|Reglamento del Impuesto/, LGT: /\bLGT\b|Ley 58\/2003|General Tributaria/,
  TRLRHL: /TRLRHL|RDLeg 2\/2004/, ITPAJD: /ITPAJD|RDLeg 1\/1993/, IRPF: /Ley 35\/2006|\bIRPF\b/, LIP: /Ley 19\/1991/, LH: /\bLH\b|Ley Hipotecaria/, RH: /\bRH\b|Reglamento Hipotecario/,
  LN: /Ley del Notariado/, RN: /Reglamento Notarial|\bRN\b/, LRC: /Ley 20\/2011|Registro Civil/, LJV: /Ley 15\/2015|Jurisdicci[óo]n Voluntaria/, LEC: /\bLEC\b|Ley 1\/2000/,
  LCS: /Ley 50\/1980|\bLCS\b|Contrato de Seguro/, "L20-2005": /Ley 20\/2005/, TRLCI: /RDLeg 1\/2004|Ley del Catastro/, LOPDGDD: /LO 3\/2018|LOPDGDD/, LGSS: /\bLGSS\b|RDLeg 8\/2015/,
  PBC: /Ley 10\/2010/, LODD: /LO 5\/2024|Derecho de Defensa/, EGAE: /RD 135\/2021|Estatuto General de la Abogac/, "L11-2021": /Ley 11\/2021/, "UE-650-2012": /650\/2012/,
};
const BASE_EST = ["CC", "LISD", "RISD", "LGT"];
const numLey = (s) => (String(s).match(/(\d+\/\d{4})/) || [])[1];
function enlaceArt(norma, frag) {
  const m = String(frag).match(/arts?\.\s*(\d+)/i); if (!m || !norma.articulos) return null;
  const a = norma.articulos.find((q) => q.ancla && String(q.art).split(/[-\s,y.]/)[0] === m[1]);
  return a ? norma.url + a.ancla : null;
}
function citasExp(x, R, T, E) {
  const C = [];
  const push = (ctx, texto) => { if (!texto) return; for (const f of String(texto).split(/\s·\s|;\s/)) if (f.trim()) C.push({ ctx, f: f.trim() }); };
  if (R) {
    push("Normativa del impuesto", R.isd.norma);
    for (const h of R.isd.herederos) for (const t of h.traza) if (t.norma) push(`Sucesiones · ${h.nombre} · ${t.paso}`, t.norma);
    for (const n of R.isd.notasReparto || []) push("Reparto", n);
    for (const a of R.isd.alertas || []) push("Aviso del cálculo", a);
    for (const { b, r } of R.plus) for (const t of r.porTitular || []) if (t.norma) push(`Plusvalía · ${b.descripcion || "Inmueble"}`, t.norma);
  }
  for (const t of T || []) if (t.norma) push(`Trámite · ${t.titulo}`, t.norma);
  for (const p of (E && E.P) || []) if (p.norma) push(`Estrategia · ${p.titulo}`, p.norma);
  return C;
}
function normativaExp(x, R, T) {
  if (!heredaParteYRepintar("biblioteca")) return `<div class="card empty" aria-busy="true"><b>Cargando la biblioteca normativa…</b></div>`;
  const E = R ? estrategia(x) : null;
  const C = citasExp(x, R, T, E);
  const uniq = (L) => { const s = new Set(); return L.filter((c) => { const k = c.ctx + "|" + c.f; if (s.has(k)) return false; s.add(k); return true; }); };
  const est = BIBLIO.estatal.map((n) => ({ n, usos: uniq(C.filter((c) => PATRON_EST[n.id] && PATRON_EST[n.id].test(c.f))) })).filter((q) => q.usos.length || BASE_EST.includes(q.n.id));
  const terr = x.ccaa === "EST" ? x.ccaaBienes || "EST" : x.ccaa;
  const aut = (BIBLIO.autonomica[terr] || []).map((n) => { const k = numLey(n.nombre); return { n, usos: k ? uniq(C.filter((c) => c.f.includes(k))) : [] }; });
  const munis = [...new Set((x.bienes || []).filter((b) => esInm(b) && b.municipio && b.municipio !== "OTRO").map((b) => b.municipio))];
  const mun = munis.flatMap((m) => (BIBLIO.municipal[m] || []).map((n) => ({ n, muni: m, usos: uniq(C.filter((c) => c.ctx.startsWith("Plusvalía") && /OF|ordenanza/i.test(c.f) && (x.bienes || []).some((b) => b.municipio === m && c.ctx.includes(b.descripcion || "Inmueble")))) })));
  return { est, aut, mun, terr, total: C.length };
}
const tagN = (e) => e === "VERIFICADO" ? '<span class="tag V">Enlace verificado</span>' : '<span class="tag P">Enlace en revisión</span>';
function tarjetaNorma({ n, usos }, abierta) {
  const max = 8;
  return `<details class="norma" ${abierta ? "open" : ""}><summary><span class="ico q">${I.law}</span><span class="t"><b>${esc(n.nombre)}</b><small>${[n.rango || n.fecha || "", usos.length ? `${plural(usos.length, "aplicación", "aplicaciones")} en este expediente` : ""].filter(Boolean).map(esc).join(" · ")}</small></span>${tagN(n.estado)}</summary>
    <div class="nb">${usos.length ? `<ul class="usos">${usos.slice(0, max).map((u) => { const l = enlaceArt(n, u.f); return `<li><span class="u-c">${esc(u.ctx)}</span><span class="u-f">${l ? `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(u.f)}</a>` : esc(u.f)}</span></li>`; }).join("")}${usos.length > max ? `<li class="caption">y ${usos.length - max} más</li>` : ""}</ul>` : `<p class="caption">Norma de referencia del procedimiento.</p>`}
    ${(n.articulos || []).length ? `<div class="arts">${n.articulos.map((a) => a.ancla ? `<a class="art" href="${esc(n.url + a.ancla)}" target="_blank" rel="noopener">art. ${esc(a.art)} · ${esc(a.tema)}</a>` : `<span class="art off">art. ${esc(a.art)} · ${esc(a.tema)}</span>`).join("")}</div>` : ""}
    <a class="btn sm gray" href="${esc(n.url)}" target="_blank" rel="noopener">${I.ext}Texto oficial</a>${n.nota ? `<p class="caption" style="margin-top:8px"><b>Lo que hemos comprobado:</b> ${esc(n.nota)}</p>` : ""}</div></details>`;
}
function tNormativa(x, R, T) {
  const N = normativaExp(x, R, T);
  const col = (tit, sub, L) => `<div class="sectitle flex"><b>${tit}</b><span>${sub}</span></div><div class="grid" style="gap:8px">${L.length ? L.map((q, i) => tarjetaNorma(q, i === 0)).join("") : `<p class="caption">Sin normas de este nivel para el expediente.</p>`}</div>`;
  return `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${kpi("Estatal", N.est.length, "normas aplicadas")}${kpi("Autonómica", N.aut.length, esc(nombreTerr(N.terr)))}${kpi("Municipal", N.mun.length, plural(new Set(N.mun.map((m) => m.muni)).size, "ayuntamiento"))}${kpi("Referencias", N.total, "citas en cálculos, trámites y estrategia")}</div>
    <p class="lead" style="margin:18px 2px 0">Cada cifra, trámite y propuesta del expediente con la norma que la sostiene y el enlace al texto oficial consolidado.</p>
    ${col("Estatal", "Boletín Oficial del Estado", N.est)}
    ${col("Autonómica", esc(nombreTerr(N.terr)), N.aut)}
    ${col("Municipal", "Ordenanzas del impuesto sobre el incremento de valor de los terrenos", N.mun.map((m) => ({ ...m, n: { ...m.n, rango: `${ORDENANZAS[m.muni]?.nombre || m.muni}${m.n.fecha ? " · " + m.n.fecha : ""}` } })))}
    <p class="foot-note">Biblioteca normativa revisada el ${fechaLarga(BIBLIO.actualizado)}. Los enlaces llevan al texto consolidado; la vigencia a la fecha del fallecimiento la confirma el abogado.</p>`;
}
function vBiblio() {
  heredaParteYRepintar("biblioteca"); // partes.js; mientras llega, la lista sale vacía y se repinta sola
  const q = (ui.bq || "").toLowerCase();
  const f = (n) => !q || (n.nombre + " " + (n.materias || []).join(" ") + " " + (n.articulos || []).map((a) => a.tema).join(" ")).toLowerCase().includes(q);
  const nivel = ui.bn || "novedades";
  let body;
  if (nivel === "novedades") body = vNovedades();
  else if (nivel === "estatal") body = BIBLIO.estatal.filter(f).map((n) => tarjetaNorma({ n, usos: [] })).join("");
  else if (nivel === "autonomica") body = Object.entries(BIBLIO.autonomica).map(([k, L]) => { const M = L.filter(f); return M.length ? `<div class="sectitle">${esc(nombreTerr(k))}</div><div class="grid" style="gap:8px">${M.map((n) => tarjetaNorma({ n, usos: [] })).join("")}</div>` : ""; }).join("");
  else body = Object.entries(BIBLIO.municipal).map(([k, L]) => { const M = L.filter(f); return M.length ? `<div class="sectitle">${esc(ORDENANZAS[k]?.nombre || k)}${ORDENANZAS[k] ? ` · tipo ${grp(ORDENANZAS[k].tipo * 100, ORDENANZAS[k].tipo * 100 % 1 ? 2 : 0)} %` : ""}</div><div class="grid" style="gap:8px">${M.map((n) => tarjetaNorma({ n: { ...n, rango: n.fecha || "" }, usos: [] })).join("")}</div>` : ""; }).join("");
  const cuenta = { estatal: BIBLIO.estatal.length, autonomica: Object.values(BIBLIO.autonomica).reduce((s, L) => s + L.length, 0), municipal: Object.values(BIBLIO.municipal).reduce((s, L) => s + L.length, 0) };
  return `<div class="topbar"><button class="tbtn back-m" data-act="home">${I.back}Expedientes</button><span class="crumbs"><b>Normativa</b></span><span class="mid">Normativa</span><span class="tbtns">${typeof ayBotonHTML === "function" ? ayBotonHTML() : ""}</span></div>
  <div class="page view"><p class="greet">Revisada el ${fechaLarga(BIBLIO.actualizado)}</p><div class="headrow"><h1 class="ltitle">Normativa</h1><div class="search" style="width:280px">${I.search}<input id="b-q" aria-label="Buscar en la normativa" placeholder="Buscar ley, artículo o materia" value="${esc(ui.bq || "")}" autocomplete="off"></div></div>
  <p class="lsub">Textos consolidados y ordenanzas en los que se basan los cálculos de {{MARCA}}.</p>
  <div class="seg" style="margin:4px 0 18px"><button data-bn="novedades" aria-pressed="${nivel === "novedades"}">Novedades · ${NOV_NORMA.length}</button><button data-bn="estatal" aria-pressed="${nivel === "estatal"}">Estatal · ${cuenta.estatal}</button><button data-bn="autonomica" aria-pressed="${nivel === "autonomica"}">Autonómica · ${cuenta.autonomica}</button><button data-bn="municipal" aria-pressed="${nivel === "municipal"}">Municipal · ${cuenta.municipal}</button></div>
  ${body ? `<div class="stack-list">${body}</div>` : `<div class="card empty"><b>Ninguna norma coincide con «${esc(ui.bq || "")}».</b><p>Prueba con el número de la ley, el artículo o una materia: «plusvalía», «reducción», «ajuar».</p></div>`}</div>`;
}

// ───────────────────── Vigilancia normativa ─────────────────────
// Novedades: cambios de normas con fecha y ámbito; se cruzan con la cartera para decir a qué expedientes afectan.
// Auditoría r5 (H11): la ronda 4 cambió cifras (Baleares grupo III, tope de Galicia, ordenanzas de plusvalía) sin subir la versión: los expedientes
// abiertos cambiaban de importe sin el aviso «Recalculado por un cambio de normativa» y el informe seguía diciendo 2026-09-28.3.
const NORMA_V = "2026-10-08.1"; // cambia cada vez que se actualizan tipos, bonificaciones o reglas del motor
const NOV_NORMA = [
  { f: "2026-10-08", amb: "autonomica", k: "BAL", t: "Baleares: bonificación del grupo III corregida en el programa", d: "Desde el 26-07-2025 (Ley 6/2025), 60 % a hermanos, sobrinos y tíos si no hay descendientes del causante y 35 % al resto del grupo III; entre el 26-11-2023 y esa fecha, 50 % y 25 % (Ley 11/2023). Antes el programa daba el 50 % a todo el grupo III, también a los afines." },
  { f: "2026-10-08", amb: "autonomica", k: "GAL", t: "Galicia: tope de 1.500.000 € en la reducción del grupo I", d: "Menores de 21 años: 1.000.000 € más 100.000 € por cada año menos de 21, con un máximo de 1.500.000 € (art. 6.Dos D. Leg. 1/2011); antes el programa no aplicaba el tope. Desde el 01-01-2026 la reducción es única entre el mismo causante y heredero (Ley 5/2025)." },
  { f: "2026-10-08", amb: "autonomica", k: "EXT", desde: "2026-08-05", t: "Extremadura: los sobrinos pueden asimilarse a hijos", d: "Desde el 05-08-2026 (Ley 2/2026, art. 20 ter D. Leg. 1/2018), los sobrinos de un causante sin descendientes pueden aplicar los beneficios de los grupos I y II si cumplen los requisitos de «especial vinculación». El programa no lo aplica de oficio: calcula la cuota sin el beneficio y avisa para que se compruebe." },
  { f: "2026-10-08", amb: "autonomica", k: "VAL", desde: "2026-06-01", t: "Comunitat Valenciana: bonificación para hermanos, sobrinos y tíos", d: "25 % de la cuota desde el 01-06-2026 y 50 % desde el 01-06-2027 para colaterales de segundo y tercer grado por consanguinidad (art. 12 bis Ley 13/1997, en la redacción de la Ley 5/2025)." },
  { f: "2026-09-28", amb: "municipal", k: "MADRID", t: "Madrid: bonificación de la plusvalía por vivienda habitual", d: "Los tramos vigentes son 95, 85, 70 y 40 % según el valor catastral del suelo (60.000, 100.000 y 138.000 €). Se corrige la escala 95/90/75/45 %, que procedía de una propuesta de 2021 no aprobada." },
  { f: "2026-03-27", amb: "municipal", k: "MALAGA", desde: "2026-03-27", t: "Málaga modifica la bonificación por herencia", d: "Nuevos tramos por valor catastral y convivencia de dos años (BOP 26/03/2026). Los fallecimientos anteriores se rigen por la versión previa." },
  { f: "2026-02-10", amb: "municipal", k: "MOTRIL", desde: "2026-02-10", t: "Motril: nueva bonificación de la plusvalía", d: "95 % en primer grado, cónyuge o pareja con dos años de convivencia (BOP Granada 09/02/2026)." },
  { f: "2026-01-28", amb: "estatal", k: "EST", rango: ["2026-01-01", "2026-01-27"], t: "Coeficientes de la plusvalía: decae el RDL 16/2025", d: "El Congreso no lo convalidó. Sus coeficientes solo rigieron del 1 al 27 de enero de 2026; desde el 28 vuelven los del RDL 8/2023 (art. 107.4 TRLRHL)." },
  { f: "2026-01-08", amb: "municipal", k: "BURGOS", t: "Burgos publica su nueva ordenanza de plusvalía", d: "BOP 08/01/2026. Porcentajes de bonificación pendientes de cotejo: introducirlos a mano." },
  { f: "2026-01-01", amb: "municipal", k: "HUESCA", desde: "2026-01-01", t: "Huesca suprime la plusvalía", d: "Ordenanza derogada con efectos desde el 1 de enero de 2026: los fallecimientos desde esa fecha no pagan el impuesto." },
  { f: "2026-01-01", amb: "municipal", k: "ZARAGOZA", desde: "2026-01-01", t: "Zaragoza amplía la bonificación por herencia", d: "95 % también en una segunda vivienda, garaje o trastero con suelo hasta 200.000 €; 65 % en otros inmuebles (antes 50 %)." },
  { f: "2025-12-26", amb: "municipal", k: "VITORIA", t: "Vitoria-Gasteiz: ordenanzas fiscales de 2026", d: "BOTHA 26/12/2025. Bonificación del 95 al 10 % según los ingresos del heredero, si es su vivienda habitual." },
  { f: "2025-12-24", amb: "municipal", k: "GRANADA", t: "Granada: 50 % en cualquier inmueble heredado", d: "Exige autoliquidar e ingresar en plazo; la pareja de hecho no está incluida (BOP 24/12/2025)." },
  { f: "2025-12-15", amb: "municipal", k: "VALLADOLID", t: "Valladolid: ordenanzas fiscales de 2026", d: "BOP 15/12/2025. 95 % a ascendientes, descendientes y cónyuge; resto de requisitos en revisión." },
  { f: "2025-12-10", amb: "municipal", k: "DONOSTIA", t: "Donostia-San Sebastián: nueva ordenanza de plusvalía", d: "BOG 10/12/2025. 95 % si el inmueble es la vivienda habitual del heredero." },
  { f: "2025-09-26", amb: "municipal", k: "SORIA", t: "Soria fija coeficientes propios", d: "BOPSO 26/09/2025, corregido el 06/10/2025. Bonificación del 25 % en la vivienda habitual." },
  { f: "2025-05-12", amb: "municipal", k: "TARRAGONA", t: "Tarragona: bonificación por vivienda habitual", d: "95 % con suelo hasta 15.000 € y 50 % por encima; se pierde si se vende en dos años (BOPT 12/05/2025)." },
  { f: "2025-01-01", amb: "municipal", k: "CARTAGENA", desde: "2025-01-01", t: "Cartagena sube la bonificación al 95 %", d: "Vivienda habitual; antes 92 %. El resto de inmuebles mantiene el 10 % (BORM 11/12/2024)." },
  { f: "2025-01-01", amb: "municipal", k: "OVIEDO", desde: "2025-01-01", t: "Oviedo: nueva bonificación por vivienda habitual", d: "95 % con suelo hasta 46.000 € y 60 % hasta 70.000 €; convivencia de un año." },
];
const abierto = (x) => x.fase !== "cerrado";
// H54: un cambio solo es novedad para un expediente si se publicó el día del fallecimiento (devengo) o después.
// Lo anterior ya regía al fallecer y el cálculo lo aplica desde el principio: no se avisa.
function afectados(n) {
  return DB.expedientes.filter((x) => {
    if (!abierto(x)) return false;
    if (x.fecha && n.f < x.fecha) return false;
    if (n.rango) return x.fecha && x.fecha >= n.rango[0] && x.fecha <= n.rango[1] && (x.bienes || []).some(esInm);
    if (n.amb === "municipal") return (x.bienes || []).some((b) => esInm(b) && b.municipio === n.k) && (!n.desde || !x.fecha || x.fecha >= n.desde);
    if (n.amb === "autonomica") return (x.ccaa === "EST" ? x.ccaaBienes : x.ccaa) === n.k;
    return true;
  });
}
function vigilar() {
  let n = 0;
  for (const x of DB.expedientes) {
    let R; try { R = calcular(x); } catch (e) { R = null; } if (!R) continue;
    const s = { v: NORMA_V, isd: Math.round(R.isd.total * 100) / 100, plus: Math.round(R.totalPlus * 100) / 100 };
    if (x.snap && x.snap.v !== NORMA_V && abierto(x)) {
      const di = s.isd - (x.snap.isd || 0), dp = s.plus - (x.snap.plus || 0);
      if (Math.abs(di) >= 1 || Math.abs(dp) >= 1) {
        x.avisos = x.avisos || [];
        x.avisos.push({ f: hoy(), isd: [x.snap.isd, s.isd], plus: [x.snap.plus, s.plus], visto: false });
        anotar(x, `Recalculado por un cambio de normativa: ${[Math.abs(di) >= 1 ? `Sucesiones ${di > 0 ? "+" : "−"}${eur0(Math.abs(di))}` : "", Math.abs(dp) >= 1 ? `plusvalía ${dp > 0 ? "+" : "−"}${eur0(Math.abs(dp))}` : ""].filter(Boolean).join(", ")}`, "sistema");
        n++;
      }
    }
    x.snap = s;
  }
  guardar();
  return n;
}
// Mientras la versión normativa no cambia, la foto se actualiza con cada cálculo: así un aviso solo recoge el efecto de la norma, no las ediciones del abogado.
function snapAct(x, R) { if (!R || (x.snap && x.snap.v !== NORMA_V)) return; const s = { v: NORMA_V, isd: Math.round(R.isd.total * 100) / 100, plus: Math.round(R.totalPlus * 100) / 100 }; if (!x.snap || x.snap.isd !== s.isd || x.snap.plus !== s.plus) { x.snap = s; guardar(); } }
const avisosPend = (x) => (x.avisos || []).filter((a) => !a.visto);
function avisoExp(x) {
  const A = avisosPend(x); if (!A.length) return "";
  const a = A[A.length - 1], di = a.isd[1] - a.isd[0], dp = a.plus[1] - a.plus[0];
  const txt = [Math.abs(di) >= 1 ? `Sucesiones pasa de ${eur(a.isd[0])} a ${eur(a.isd[1])}` : "", Math.abs(dp) >= 1 ? `la plusvalía pasa de ${eur(a.plus[0])} a ${eur(a.plus[1])}` : ""].filter(Boolean).join(" y ");
  const nov = NOV_NORMA.filter((n) => afectados(n).includes(x)).slice(0, 2).map((n) => n.t).join(". ");
  return `<div class="infobar warn-bar" style="margin-bottom:14px"><span class="ico orange">${I.law}</span><span><b>La normativa ha cambiado desde el último cálculo.</b> ${esc(txt.charAt(0).toUpperCase() + txt.slice(1))}.${nov ? ` ${esc(nov)}.` : ""}</span><button class="btn sm gray" data-act="avisoVisto" style="margin-left:auto;flex:none">Entendido</button></div>`;
}
function bloqueVigilancia() {
  const hace = isoLocal(new Date(Date.now() - 365 * 864e5));
  const N = NOV_NORMA.filter((n) => n.f >= hace).map((n) => ({ n, X: afectados(n) })).filter((q) => q.X.length);
  const conAviso = DB.expedientes.filter((x) => avisosPend(x).length);
  if (!N.length && !conAviso.length) return "";
  const X = new Set([...N.flatMap((q) => q.X), ...conAviso]);
  return `<div class="card vig" style="margin-top:14px">${cardH("Vigilancia normativa", `${plural(N.length || conAviso.length, "cambio afecta", "cambios afectan")} a ${plural(X.size, "expediente")} de la cartera`, `<button class="btn sm gray" data-act="biblioNov">Ver novedades</button>`)}
    <div class="group" style="--inset:54px;box-shadow:none;background:none">${N.slice(0, 3).map(({ n, X }) => `<div class="row"><span class="ico ${n.amb === "estatal" ? "blue" : "q"}">${I.law}</span><span class="t"><b>${esc(n.t)}</b><small>${fechaCorta(n.f)} · ${X.slice(0, 3).map((x) => esc(x.despacho?.ref || nombreExp(x))).join(", ")}${X.length > 3 ? ` y ${X.length - 3} más` : ""}</small></span></div>`).join("")}</div></div>`;
}
function vNovedades() {
  return NOV_NORMA.map((n) => { const X = afectados(n); return `<div class="card nov"><div class="nov-h"><span class="kick">${fechaLarga(n.f)} · ${n.amb === "estatal" ? "Estatal" : n.amb === "autonomica" ? esc(nombreTerr(n.k)) : esc(ORDENANZAS[n.k]?.nombre || n.k)}</span>${X.length ? `<span class="tag warn">${plural(X.length, "expediente afectado", "expedientes afectados")}</span>` : ""}</div><b class="nov-t">${esc(n.t)}</b><p class="caption" style="margin:4px 0 0">${esc(n.d)}</p>${X.length ? `<div class="chips" style="margin-top:10px">${X.map((x) => `<button class="chip" data-open="${x.id}">${esc(x.despacho?.ref || nombreExp(x))}</button>`).join("")}</div>` : ""}</div>`; }).join("");
}
