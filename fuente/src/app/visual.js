// ───────────────────── {{MARCA}} · visualizaciones ─────────────────────
// Monograma «H+» (icons/hereda-marca.svg): el travesaño de la H atraviesa el asta y se convierte en el brazo del «+». Decorativo: el nombre va al lado en texto.
const LOGO_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="logo-bg" d="M100.00 50.00 L99.92 68.84 L99.69 74.82 L99.31 79.12 L98.77 82.55 L98.07 85.43 L97.20 87.89 L96.17 90.03 L94.94 91.90 L93.53 93.53 L91.90 94.94 L90.03 96.17 L87.89 97.20 L85.43 98.07 L82.55 98.77 L79.12 99.31 L74.82 99.69 L68.84 99.92 L50.00 100.00 L31.16 99.92 L25.18 99.69 L20.88 99.31 L17.45 98.77 L14.57 98.07 L12.11 97.20 L9.97 96.17 L8.10 94.94 L6.47 93.53 L5.06 91.90 L3.83 90.03 L2.80 87.89 L1.93 85.43 L1.23 82.55 L0.69 79.12 L0.31 74.82 L0.08 68.84 L0.00 50.00 L0.08 31.16 L0.31 25.18 L0.69 20.88 L1.23 17.45 L1.93 14.57 L2.80 12.11 L3.83 9.97 L5.06 8.10 L6.47 6.47 L8.10 5.06 L9.97 3.83 L12.11 2.80 L14.57 1.93 L17.45 1.23 L20.88 0.69 L25.18 0.31 L31.16 0.08 L50.00 0.00 L68.84 0.08 L74.82 0.31 L79.12 0.69 L82.55 1.23 L85.43 1.93 L87.89 2.80 L90.03 3.83 L91.90 5.06 L93.53 6.47 L94.94 8.10 L96.17 9.97 L97.20 12.11 L98.07 14.57 L98.77 17.45 L99.31 20.88 L99.69 25.18 L99.92 31.16Z"/><path class="logo-m" d="M17.5 26h11v48h-11ZM44.5 26h11v48h-11ZM28.5 46.5H83.5v7H28.5ZM68.5 38.5h7v23h-7Z"/></svg>`;
const fmtK = (v) => (v < 0 ? "−" : "") + grp(Math.abs(v), 0) + " €";
const corta = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const pctTxt = (f) => grp(f * 100, f * 100 % 1 && f < 0.1 ? 1 : 0) + " %";

// ── Árbol familiar ──────────────────────────────────────────────
function derechoTxt(R, id) {
  const L = (R && R.isd.derechos[id]) || [];
  if (!L.length) return "";
  return L.map((d) => (d.tipo === "pleno" ? "" : d.tipo === "usufructo" ? "usufr. " : "nuda ") + pctTxt(d.fraccion)).join(" + ");
}
function arbol(x, R, opt = {}) {
  const P = x.personas || [];
  const W = 190, H = 70, GX = 18, GY = 44, S = W + GX;
  const hs = R ? Object.fromEntries(R.isd.herederos.map((h) => [h.id, h])) : {};
  const norm = (s) => String(s || "").trim().toLowerCase();
  const by = (...r) => P.filter((p) => r.includes(p.relacion));
  const conyuge = by("conyuge", "pareja_hecho", "pareja_no_inscrita")[0];
  const padres = by("padre").slice(0, 2), abuelos = by("abuelo");
  // Descendientes: nietos agrupados bajo su progenitor (estirpe)
  const hijosCols = by("hijo", "hijastro").map((p) => ({ p, kids: [] }));
  for (const n of by("nieto", "bisnieto")) {
    let c = hijosCols.find((c) => c.p && norm(n.estirpe) && norm(c.p.nombre) === norm(n.estirpe));
    if (!c) { c = hijosCols.find((c) => !c.p && c.g === norm(n.estirpe)); if (!c) { c = { p: null, g: norm(n.estirpe), label: n.estirpe || "Hijo/a", kids: [] }; hijosCols.push(c); } }
    c.kids.push(n);
  }
  const hermCols = by("hermano").map((p) => ({ p, kids: [] }));
  for (const n of by("sobrino")) {
    let c = hermCols.find((c) => c.p && norm(n.estirpe) && norm(c.p.nombre) === norm(n.estirpe));
    if (!c) { c = hermCols.find((c) => !c.p && c.g === norm(n.estirpe)); if (!c) { c = { p: null, g: norm(n.estirpe), label: n.estirpe || "Hermano/a", kids: [] }; hermCols.push(c); } }
    c.kids.push(n);
  }
  const tios = by("tio"), primos = by("primo");
  const otros = by("extrano", "suegro", "yerno").filter((p) => p !== conyuge);
  // Filas presentes
  const rowsUsed = new Set([0]);
  if (padres.length || tios.length) rowsUsed.add(-1);
  if (abuelos.length) rowsUsed.add(-2);
  if (hijosCols.length || hermCols.some((c) => c.kids.length) || otros.length) rowsUsed.add(1);
  if (hijosCols.some((c) => c.kids.length)) rowsUsed.add(2);
  const rows = [...rowsUsed].sort((a, b) => a - b);
  const Y = (r) => 26 + rows.indexOf(r) * (H + GY);
  const nodes = [], links = [];
  let cursor = 0;
  // Bloque izquierdo: hermanos y sobrinos
  const hermX = [];
  if (hermCols.length) {
    for (const c of hermCols) {
      const w = Math.max(1, c.kids.length);
      const cx = cursor + (w * S - GX) / 2;
      c.kids.forEach((k, i) => { const kx = cursor + i * S + W / 2; nodes.push({ p: k, x: kx, y: Y(1) }); links.push([cx, Y(0) + H, kx, Y(1)]); });
      nodes.push(c.p ? { p: c.p, x: cx, y: Y(0) } : { ghost: c.label, rel: c.g ? "Hermano/a premuerto" : "Progenitor sin indicar", sinDato: !c.g, x: cx, y: Y(0) });
      hermX.push(cx); cursor += w * S;
    }
    cursor += 28;
  }
  // Bloque central: causante, cónyuge, hijos y nietos
  const c0 = cursor;
  let hx = [];
  for (const c of hijosCols) {
    const w = Math.max(1, c.kids.length);
    const cx = cursor + (w * S - GX) / 2;
    c.kids.forEach((k, i) => { const kx = cursor + i * S + W / 2; nodes.push({ p: k, x: kx, y: Y(2) }); links.push([cx, Y(1) + H, kx, Y(2)]); });
    nodes.push(c.p ? { p: c.p, x: cx, y: Y(1) } : { ghost: c.label, rel: c.g ? "Hijo/a premuerto" : "Progenitor sin indicar", sinDato: !c.g, x: cx, y: Y(1) });
    hx.push(cx); cursor += w * S;
  }
  const minW = (conyuge ? 2 : 1) * S, spanKids = cursor - c0;
  if (spanKids < minW) { const d = (minW - spanKids) / 2; nodes.forEach((n) => { if (n.x >= c0 && n.y >= Y(1) && hx.length) n.x += d; }); links.forEach((l) => { if (l[0] >= c0 && hx.length) { l[0] += d; l[2] += d; } }); hx = hx.map((v) => v + d); cursor = c0 + minW; }
  const mid = hx.length ? (hx[0] + hx[hx.length - 1]) / 2 : c0 + (cursor - c0 - GX) / 2;
  const cauX = conyuge ? mid - S / 2 : mid, conX = mid + S / 2;
  nodes.push({ cau: true, x: cauX, y: Y(0) });
  if (conyuge) { nodes.push({ p: conyuge, x: conX, y: Y(0) }); links.push([cauX + W / 2, Y(0) + H / 2, conX - W / 2, Y(0) + H / 2, "sp" + (conyuge.relacion === "pareja_no_inscrita" ? " dash" : "")]); }
  for (const v of hx) links.push([mid, Y(0) + (conyuge ? H / 2 : H), v, Y(1)]);
  // Padres y abuelos sobre el causante
  const pX = padres.length === 2 ? [cauX - S / 2, cauX + S / 2] : [cauX];
  padres.forEach((p, i) => { nodes.push({ p, x: pX[i], y: Y(-1) }); });
  if (padres.length) { const pm = padres.length === 2 ? cauX : pX[0]; links.push([pm, Y(-1) + H, cauX, Y(0)]); for (const hv of hermX) links.push([pm, Y(-1) + H, hv, Y(0)]); }
  else if (hermX.length) { for (const hv of hermX) links.push([hv, Y(0), cauX, Y(0), "bro"]); }
  if (abuelos.length) {
    const pat = abuelos.filter((a) => a.lineaAsc !== "materna"), mat = abuelos.filter((a) => a.lineaAsc === "materna");
    const L = [...pat, ...mat]; const base = cauX - ((L.length - 1) * S) / 2;
    L.forEach((p, i) => { const ax = base + i * S; nodes.push({ p, x: ax, y: Y(-2) }); links.push([ax, Y(-2) + H, padres.length ? pX[i < pat.length ? 0 : pX.length - 1] : cauX, padres.length ? Y(-1) : Y(0)]); });
  }
  cursor = Math.max(cursor, cauX + W / 2 + GX, conyuge ? conX + W / 2 + GX : 0, ...nodes.map((n) => n.x + W / 2 + GX)) + 28;
  // Bloque derecho: tíos y primos
  if (tios.length || primos.length) {
    const tl = tios.length ? tios : [null];
    const w = Math.max(tl.length, primos.length);
    tl.forEach((t, i) => { const tx = cursor + i * S + W / 2; nodes.push(t ? { p: t, x: tx, y: Y(-1) } : { ghost: "Tío/a", rel: "Premuerto", x: tx, y: Y(-1) }); });
    primos.forEach((p, i) => { const px = cursor + i * S + W / 2; nodes.push({ p, x: px, y: Y(0) }); links.push([cursor + W / 2, Y(-1) + H, px, Y(0)]); });
    cursor += w * S + 28;
  }
  if (otros.length) {
    otros.forEach((p, i) => nodes.push({ p, x: cursor + i * S + W / 2, y: Y(rowsUsed.has(1) ? 1 : 0) }));
    cursor += otros.length * S;
  }
  // Normalizar a 0
  const minX = Math.min(...nodes.map((n) => n.x - W / 2)) - 4;
  const maxX = Math.max(...nodes.map((n) => n.x + W / 2)) + 4;
  const width = maxX - minX, height = Y(rows[rows.length - 1]) + H + 12;
  const sx = (v) => v - minX;
  const path = ([x1, y1, x2, y2, k]) => {
    if (k && k.startsWith("sp")) return `<path class="tlink sp" ${k.includes("dash") ? 'stroke-dasharray="4 4"' : ""} d="M${sx(x1)} ${y1}H${sx(x2)}"/>`;
    if (k === "bro") { const yb = y1 - 14; return `<path class="tlink" d="M${sx(x1)} ${y1}V${yb}H${sx(x2)}V${y2}"/>`; }
    const ym = (y1 + y2) / 2; return `<path class="tlink" d="M${sx(x1)} ${y1}C${sx(x1)} ${ym} ${sx(x2)} ${ym} ${sx(x2)} ${y2}"/>`;
  };
  const tot = R ? R.isd.herederos.reduce((s, h) => s + h.valorAdquirido, 0) || 1 : 1;
  const card = (n) => {
    const x0 = sx(n.x) - W / 2, y0 = n.y;
    if (n.cau) return `<g class="tnode cau" data-sec="herencia"><rect class="b" x="${x0}" y="${y0}" width="${W}" height="${H}" rx="12"/><text class="n" x="${x0 + 14}" y="${y0 + 22}">${esc(corta(x.nombre || "Causante", 24))}</text><text class="r" x="${x0 + 14}" y="${y0 + 39}">† ${x.fecha ? fechaCorta(x.fecha) : "fecha pendiente"}</text><text class="s tax" x="${x0 + 14}" y="${y0 + 56}">${R ? "Caudal " + fmtK(R.isd.masa.bruto) : "Causante"}</text></g>`;
    if (n.ghost) return `<g class="tnode off"><rect class="b" x="${x0}" y="${y0}" width="${W}" height="${H}" rx="12"/><text class="n" x="${x0 + 14}" y="${y0 + 22}">${esc(corta(n.ghost, 21))}</text><text class="r" x="${x0 + 14}" y="${y0 + 39}">${esc(n.rel)}</text><text class="r" x="${x0 + 14}" y="${y0 + 56}">${n.sinDato ? "Indica «Desciende de»" : "Representado por su estirpe"}</text></g>`; // r5 H12: sin «Desciende de» no se afirma un premuerto
    const p = n.p, h = hs[p.id], ren = p.renuncia;
    const cls = ren ? "ren" : h ? "" : "off";
    const l3 = ren ? "Renuncia" : h ? `${pctTxt(h.valorAdquirido / tot)}${derechoTxt(R, p.id).includes("usufr") ? " · usufructo" : ""}` : "No hereda";
    const l3b = h && !ren ? fmtK(h.aIngresar) : "";
    return `<g class="tnode ${cls}" data-editp="${p.id}"><title>${esc(p.nombre || "")} · ${esc(RELACIONES[p.relacion]?.label || "")}${h ? " · recibe " + eur0(h.valorAdquirido) + " · paga " + eur(h.aIngresar) : ""}</title><rect class="b" x="${x0}" y="${y0}" width="${W}" height="${H}" rx="12"/><text class="n" x="${x0 + 14}" y="${y0 + 22}">${esc(corta(p.nombre || "Sin nombre", 24))}</text><text class="r" x="${x0 + 14}" y="${y0 + 39}">${esc(RELACIONES[p.relacion]?.label || "")}${p.edad !== "" && p.edad != null ? " · " + p.edad + " años" : ""}</text><text class="s" x="${x0 + 14}" y="${y0 + 56}">${esc(l3)}</text>${l3b ? `<text class="s tax" x="${x0 + W - 12}" y="${y0 + 56}" text-anchor="end">${esc(l3b)}</text>` : ""}</g>`;
  };
  const svg = `<svg class="viz" viewBox="0 0 ${width} ${height}" style="min-width:${Math.round(Math.min(width, 1100) * 0.8)}px;max-width:${Math.round(width * (opt.zoom || 1.3))}px;margin:0 auto" role="img" aria-label="Árbol familiar">${links.map(path).join("")}${nodes.map(card).join("")}</svg>`;
  return `<div class="tree-wrap">${svg}</div>${opt.leyenda === false ? "" : `<div class="legend-inline"><span><i style="background:var(--gold-tint);box-shadow:inset 0 0 0 1px var(--gold)"></i>Causante</span><span><i style="background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--hair)"></i>Heredero · % de lo que se reparte · impuesto</span><span><i style="box-shadow:inset 0 0 0 1px var(--label-4)"></i>No hereda o premuerto</span><span><i style="box-shadow:inset 0 0 0 1px var(--red)"></i>Renuncia</span></div>`}`;
}

// ── Cronograma de trámites ─────────────────────────────────────
// Ventanas orientativas (días desde el fallecimiento) para los trámites sin plazo legal
const VENTANAS = { urgente: [0, 15], conocer: [15, 60], inventario: [30, 100], decidir: [60, 140], formalizar: [90, 180], titularidad: [150, 270], despues: [180, 400] };
function gantt(T, fecha, opt = {}) {
  const items = opt.plan ? T.filter((t) => t.limite || t.desde || VENTANAS[t.fase]) : T.filter((t) => t.limite || t.desde);
  if (!items.length || !fecha) return `<p class="caption">Sin plazos que mostrar todavía.</p>`;
  const h = hoy();
  const maxL = items.reduce((m, t) => (t.limite && t.limite > m ? t.limite : m), trMeses(fecha, 7));
  const end = [maxL, trMeses(fecha, opt.meses || 14)].sort()[0] > h ? [maxL, trMeses(fecha, opt.meses || 14)].sort()[0] : trMeses(h, 1);
  const total = Math.max(30, dias(fecha, end));
  const pos = (d) => Math.max(0, Math.min(100, (dias(fecha, d) / total) * 100));
  const ticks = []; for (let i = 0; i <= 24; i++) { const m = trMeses(fecha.slice(0, 8) + "01", i + 1); if (m > end) break; ticks.push(m); }
  const hp = h >= fecha && h <= end ? pos(h) : null;
  const tl = hp != null ? `<i class="tl" style="left:${hp}%"></i>` : "";
  const fases = TR_FASES.map((f) => ({ f, L: items.filter((t) => t.fase === f.id).sort((a, b) => (a.desde || a.limite || "").localeCompare(b.desde || b.limite || "")) })).filter((g) => g.L.length);
  const row = (t) => {
    const v = vence(t);
    const cls = t.st === "hecho" ? "hecho" : t.st === "na" ? "na" : t.st === "curso" ? "curso" : v.cls;
    let el;
    if (t.limite) {
      const a = pos(t.desde && t.desde > fecha ? t.desde : fecha), b = pos(t.limite);
      el = `<span class="bar ${cls}" style="left:${a}%;width:${Math.max(1.2, b - a)}%"></span>${t.limite > end ? `<span class="more">›</span>` : ""}`;
    } else if (t.desde) el = `<span class="ms ${cls}" style="left:${pos(t.desde)}%"></span>`;
    else { const [a0, b0] = VENTANAS[t.fase] || [0, 30]; const a = pos(trDias(fecha, a0)), b = pos(trDias(fecha, b0)); el = `<span class="bar plan ${t.st === "hecho" ? "hecho" : t.st === "curso" ? "curso" : ""}" style="left:${a}%;width:${Math.max(1.2, b - a)}%"></span>`; }
    return `<button class="gr ${cerrado(t) ? "done" : ""}" data-topen="${t.id}" title="${esc(t.titulo)} · ${esc(v.txt)}"><span class="lb">${esc(t.titulo)}</span><span class="track">${tl}${el}</span></button>`;
  };
  return `<div class="gantt"><div class="axis"><span></span><div class="ticks">${ticks.filter((m) => hp == null || Math.abs(pos(m) - hp) > 3).map((m, i) => `<span class="${i % 2 ? "odd" : ""}" style="left:${pos(m)}%">${mes(m)}${m.slice(5, 7) === "01" ? " " + m.slice(2, 4) : ""}</span>`).join("")}${hp != null ? `<i class="today" style="left:${hp}%"></i>` : ""}</div></div>
    ${fases.map(({ f, L }) => `<div class="grp"><b>${f.nombre}</b><span></span></div>${L.map(row).join("")}`).join("")}</div>`;
}

// ── Mapas ──────────────────────────────────────────────────────
const mapaCargando = () => `<div class="viz map" aria-busy="true" style="min-height:120px"></div>`; // partes.js: los mapas llegan aparte
function mapaES(o = {}) {
  if (!heredaParteYRepintar("mapas")) return mapaCargando();
  const M = MAPA_ES;
  const cc = Object.entries(M.ccaa).map(([k, d]) => {
    let c = "cc";
    if (o.estado && REGLAS[k] && REGLAS[k].estadoGlobal === "VERIFICADO") c += " v";
    if (o.heat && o.heat[k]) c += " h" + Math.min(3, o.heat[k]);
    if (o.resid === k) c += " on";
    return `<path class="${c}" d="${d}"><title>${esc(nombreTerr(k))}${o.estado && REGLAS[k] ? " · " + (REGLAS[k].estadoGlobal === "VERIFICADO" ? "normativa verificada" : "en verificación") : ""}${o.heat && o.heat[k] ? " · " + plural(o.heat[k], "expediente") : ""}</title></path>`;
  }).join("");
  const pins = (o.pins || []).filter((p) => M.pins[p.k]);
  const pinS = pins.map((p) => { const [x, y] = M.pins[p.k]; return `${p.main ? `<circle class="halo" cx="${x}" cy="${y}" r="20"/>` : ""}<circle class="ci ${p.main ? "m" : p.small ? "s" : ""}" cx="${x}" cy="${y}" r="${p.small ? 3.2 : p.main ? 7 : 6}"><title>${esc(p.label || p.k)}</title></circle>`; }).join("");
  const labels = pins.filter((p) => p.label && !p.small).slice(0, 6).map((p) => { const [x, y] = M.pins[p.k]; return `<text class="pl" x="${x + 12}" y="${y + 4}">${esc(p.label)}</text>`; }).join("");
  return `<svg class="viz map${o.crop ? "" : " es"}" viewBox="${o.crop || "60 40 860 660"}" role="img" aria-label="Mapa de España">${cc}<path class="bd" d="${M.borde}"/><path class="inset" d="${M.canarias}"/>${pinS}${labels}</svg>`;
}
function mapaAND(o = {}) {
  if (!heredaParteYRepintar("mapas")) return mapaCargando();
  const M = MAPA_AND;
  const pv = M.prov.map((p) => `<path class="cc ${o.provOn && o.provOn.includes(p.n) ? "on" : o.todo ? "v" : ""}" d="${p.d}"><title>${esc(p.n)}</title></path>`).join("");
  const provL = o.provNombres === false ? "" : M.prov.map((p) => `<text class="pl s" x="${p.c[0]}" y="${p.c[1]}" text-anchor="middle">${esc(p.n.toUpperCase())}</text>`).join("");
  const pins = (o.pins || []).filter((p) => M.pins[p.k]);
  const pinS = pins.map((p) => { const [x, y] = M.pins[p.k]; return `${p.main ? `<circle class="halo" cx="${x}" cy="${y}" r="18"/>` : ""}<circle class="ci ${p.main ? "m" : p.small ? "s" : ""}" cx="${x}" cy="${y}" r="${p.small ? 3.5 : p.main ? 7 : 6}"><title>${esc(p.label || p.k)}</title></circle>`; }).join("");
  const labels = pins.filter((p) => p.label && !p.small).slice(0, 8).map((p) => { const [x, y] = M.pins[p.k]; return `<text class="pl" x="${x + 11}" y="${y - 8}">${esc(p.label)}</text>`; }).join("");
  return `<svg class="viz map" viewBox="${o.crop || "40 40 880 460"}" role="img" aria-label="Mapa de Andalucía">${pv}${provL}${pinS}${labels}</svg>`;
}
function mapaExp(x, R) {
  if (!heredaParteYRepintar("mapas")) return mapaCargando();
  const inm = (x.bienes || []).filter((b) => (b.tipo === "vivienda" || b.tipo === "inmueble") && b.municipio && b.municipio !== "OTRO" && ORDENANZAS[b.municipio]);
  const pins = inm.map((b) => ({ k: b.municipio, label: ORDENANZAS[b.municipio].nombre, main: b.tipo === "vivienda" }));
  const terr = x.ccaa === "EST" ? x.ccaaBienes : x.ccaa;
  const soloAND = terr === "AND" && pins.every((p) => MAPA_AND.pins[p.k]);
  const plusBy = R ? Object.fromEntries(R.plus.map(({ b, r }) => [b.id, r])) : {};
  const leyenda = inm.length ? `<div class="group" style="margin-top:12px;--inset:54px">${inm.map((b) => { const r = plusBy[b.id]; const o = ORDENANZAS[b.municipio]; return `<button class="row" data-editb="${b.id}"><span class="ico ${b.tipo === "vivienda" ? "gold" : "brown"}">${I.house}</span><span class="t"><b>${esc(b.descripcion || TIPO_BIEN[b.tipo][0])}</b><small>${esc(o.nombre)} · tipo ${grp(o.tipo * 100, 0)} %${o.estadoTipo === "VERIFICADO" ? " · ordenanza verificada" : " · ordenanza en verificación"}</small></span><span class="v num">${r ? eur0(r.total) : "—"}</span></button>`; }).join("")}</div><p class="group-foot">A la derecha, la plusvalía municipal estimada de cada inmueble.</p>` : `<p class="caption" style="margin-top:10px">Indica el municipio de cada inmueble para situarlo y calcular su plusvalía.</p>`;
  let crop;
  if (soloAND && pins.length) { const P = pins.map((p) => MAPA_AND.pins[p.k]); const x0 = Math.min(...P.map((q) => q[0])), x1 = Math.max(...P.map((q) => q[0])), y0 = Math.min(...P.map((q) => q[1])), y1 = Math.max(...P.map((q) => q[1])); const w = Math.max(420, (x1 - x0) * 1.8), h = w * 0.56; const cx = (x0 + x1) / 2 + 30, cy = (y0 + y1) / 2 - 10; crop = `${Math.round(Math.max(0, Math.min(960 - w, cx - w / 2)))} ${Math.round(Math.max(0, Math.min(520 - h, cy - h / 2)))} ${Math.round(w)} ${Math.round(h)}`; }
  return (soloAND ? mapaAND({ pins, provOn: [], crop }) : mapaES({ resid: terr, pins })) + leyenda;
}

// ── De los bienes a lo que recibe la familia ───────────────────
function cascada(x, R) {
  const m = R.isd.masa;
  const otros = Math.max(0, m.brutoTotal - m.gananciales / 2 - m.bruto);
  const pasos = [["Bienes inventariados", m.brutoTotal, "t"]];
  if (m.mitadViudo) pasos.push(["Mitad de gananciales del viudo", -m.mitadViudo]);
  if (otros > 1) pasos.push(["Partes de otros copropietarios", -otros]);
  if (Math.abs(m.bruto - m.brutoTotal) > 1) pasos.push(["Caudal del causante", m.bruto, "s"]);
  if (m.deudas) pasos.push(["Deudas", -m.deudas]);
  if (m.gastos) pasos.push(["Funeral y última enfermedad", -m.gastos]);
  pasos.push(["Sucesiones", -R.isd.total]);
  if (R.totalPlus) pasos.push(["Plusvalía municipal", -R.totalPlus]);
  const final = m.neto - R.isd.total - R.totalPlus;
  pasos.push(["Neto para la familia", final, "t"]);
  const max = m.brutoTotal || 1; let run = 0;
  return `<div>${pasos.map(([n, v, k]) => {
    let a, w, col;
    if (k) { a = 0; w = Math.max(0, v) / max * 100; run = v; col = k === "t" ? (n.startsWith("Neto") ? "var(--gold)" : "var(--c5)") : "var(--c1)"; }
    else { const from = run, to = run + v; a = Math.min(from, to) / max * 100; w = Math.abs(v) / max * 100; run = to; col = /Sucesiones/.test(n) ? "var(--c4)" : /Plusvalía/.test(n) ? "var(--c6)" : "var(--label-3)"; }
    return `<div class="hbar"><span class="nm">${esc(n)}</span><span class="track" style="background:transparent;position:relative"><i style="position:absolute;left:${a}%;width:${Math.max(0.6, w)}%;background:${col};border-radius:4px;opacity:${k ? 1 : .85}"></i></span><span class="vv${k ? "" : ""}">${k ? `<b style="font-weight:600">${eur0(v)}</b>` : `<span style="color:var(--label-2)">${v < 0 ? "−" : "+"}${eur0(Math.abs(v))}</span>`}</span></div>`;
  }).join("")}</div>`;
}
function plusPorHeredero(R) {
  const o = {};
  for (const { r } of R.plus) for (const t of r.porTitular || []) o[t.heredero] = (o[t.heredero] || 0) + t.aIngresar;
  return o;
}
function barrasHerederos(R) {
  const pp = plusPorHeredero(R);
  const L = R.isd.herederos.map((h) => ({ h, isd: h.aIngresar, pl: pp[h.nombre] || 0, v: h.valorAdquirido }));
  const max = Math.max(1, ...L.map((q) => q.v));
  return L.map(({ h, isd, pl, v }) => { const neto = Math.max(0, v - isd - pl); return `<div class="hbar"><span class="nm">${esc(h.nombre)}<small>${RELACIONES[h.relacion].label} · grupo ${h.grupo}</small></span><span class="track"><i style="width:${neto / max * 100}%;background:var(--gold)"></i><i style="width:${isd / max * 100}%;background:var(--c4)"></i><i style="width:${pl / max * 100}%;background:var(--c6)"></i></span><span class="vv">${eur0(v)}<small>impuestos ${eur0(isd + pl)}</small></span></div>`; }).join("") +
    `<div class="legend-inline" style="margin-top:16px"><span><i style="background:var(--gold)"></i>Neto</span><span><i style="background:var(--c4)"></i>Sucesiones</span><span><i style="background:var(--c6)"></i>Plusvalía</span></div>`;
}

// ── Cartera: próximos 90 días ──────────────────────────────────
function carriles(est) {
  const h = hoy(), ini = trDias(h, -10), fin = trDias(h, 90), tot = dias(ini, fin);
  const pos = (d) => (dias(ini, d) / tot) * 100;
  const L = est.map((e) => ({ e, ev: e.T.filter((t) => !cerrado(t) && t.limite && !t.informativo && t.limite >= ini && t.limite <= fin) })).filter((q) => q.ev.length || q.e.nivel === "bad");
  if (!L.length) return `<p class="caption">Ningún vencimiento en los próximos 90 días.</p>`;
  const marks = [0, 30, 60, 90].map((d) => trDias(h, d));
  return `<div class="lanes"><div class="hd"><span></span><div class="sc">${marks.map((m, i) => `<span style="left:${pos(m)}%">${i ? "+" + i * 30 + " d" : "Hoy"}</span>`).join("")}</div></div>
    ${L.map(({ e, ev }) => `<div class="ln"><button class="nm" style="text-align:left" data-open="${e.x.id}">${esc(nombreExp(e.x))}<small>${esc(nombreTerr(e.x.ccaa))} · ${plural(ev.length, "plazo")}</small></button><div class="tr"><i style="position:absolute;left:${pos(h)}%;top:-3px;bottom:-3px;width:1px;background:var(--label-3)"></i>${ev.map((t) => { const v = vence(t); return `<button class="mk ${v.cls || "ok"}" style="left:${pos(t.limite)}%" data-open="${e.x.id}" data-go-t="${t.id}" title="${esc(t.titulo)} · ${esc(v.txt)}" aria-label="${esc(t.titulo)}"></button>`; }).join("")}</div></div>`).join("")}</div>`;
}

// ── Calendario mensual ─────────────────────────────────────────
function calendario(ym, eventos) {
  const d1 = new Date(ym + "-01T12:00:00");
  const off = (d1.getDay() + 6) % 7; const nd = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
  const h = hoy(); const cells = [];
  for (let i = 0; i < off; i++) cells.push(`<div class="d o"></div>`);
  for (let d = 1; d <= nd; d++) {
    const f = ym + "-" + String(d).padStart(2, "0");
    const ev = eventos.filter((e) => e.f === f);
    cells.push(`<div class="d ${f === h ? "t" : ""}"><span class="dn">${d}</span>${ev.slice(0, 3).map(({ t, x }) => { const v = vence(t); return `<button class="ev ${v.cls}" data-open="${x.id}" data-go-t="${t.id}" title="${esc(t.titulo)} · ${esc(nombreExp(x))}">${esc(t.titulo)}</button>`; }).join("")}${ev.length > 3 ? `<span class="caption" style="font-size:10.5px">+${ev.length - 3}</span>` : ""}</div>`);
  }
  while (cells.length % 7) cells.push(`<div class="d o"></div>`);
  return `<div class="cal">${["L", "M", "X", "J", "V", "S", "D"].map((d) => `<div class="dw">${d}</div>`).join("")}${cells.join("")}</div>`;
}
