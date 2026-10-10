// ───────────────────── Escáner de documentos con la cámara (prefijo scn) ─────────────────────
// Convierte la cámara del móvil, la tableta o la webcam del despacho (o una foto ya hecha) en un escáner: detecta el papel en tiempo real,
// dispara solo cuando el documento está quieto, corrige la perspectiva, recorta, endereza y deja el papel blanco y el texto negro. Varias
// páginas por documento (miniaturas, reordenar, borrar, ajustar las esquinas a mano) y, al terminar, un PDF que se archiva en el expediente y
// se lee con el reconocimiento de texto del lector. Sin inteligencia artificial y sin librerías: visión por ordenador clásica (umbral de Otsu,
// regiones conexas, envolvente convexa, ajuste de bordes por gradiente y homografía) sobre los píxeles, en el propio navegador.
// Las funciones de cálculo son puras (vectores de píxeles) y se prueban en Node (src/test-lector.mjs).
// API: scnAbrir({ expId, tramiteId }) · scnDetectar(rgba, w, h) · scnEnderezar(...) · scnRealzar(...) · scnPdf(paginas) · scnPrepararFoto(lienzo)
//      scnBotonHTML(tramiteId) (botón «Escanear con la cámara» para las zonas de subida)

// ── Utilidades de imagen (puras) ──
const scnClamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
// Luminancia de un RGBA
function scnLuma(rgba, w, h) { const g = new Uint8Array(w * h); for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8; return g; }
// «Papel»: claro y poco saturado (el papel es blanco o crema; la mesa, la madera o la tela tienen color o son oscuras)
function scnPapel(rgba, w, h) { const g = new Uint8Array(w * h); for (let i = 0, j = 0; j < g.length; i += 4, j++) { const r = rgba[i], v = rgba[i + 1], b = rgba[i + 2]; const mx = r > v ? (r > b ? r : b) : v > b ? v : b, mn = r < v ? (r < b ? r : b) : v < b ? v : b; g[j] = scnClamp(((r * 77 + v * 150 + b * 29) >> 8) - 0.7 * (mx - mn)); } return g; }
// Desenfoque de caja separable (suma móvil): dos pasadas ≈ gaussiano. Sumas enteras y bordes aparte: rápido también en el móvil
function scnCaja(g, w, h, r) {
  if (r < 1) return g;
  const t = new Uint8Array(w * h), o = new Uint8Array(w * h), k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const f = y * w; let s = 0, n = 0;
    for (let x = 0; x < r && x < w; x++) { s += g[f + x]; n++; }
    for (let x = 0; x < w; x++) { const b = x + r; if (b < w) { s += g[f + b]; n++; } const a = x - r - 1; if (a >= 0) { s -= g[f + a]; n--; } t[f + x] = n === k ? (s / k) | 0 : (s / n) | 0; }
  }
  const S = new Int32Array(w), N = new Int32Array(w);
  for (let y = 0; y < r && y < h; y++) { const f = y * w; for (let x = 0; x < w; x++) { S[x] += t[f + x]; N[x]++; } }
  for (let y = 0; y < h; y++) {
    const b = y + r, a = y - r - 1, fb = b * w, fa = a * w, f = y * w;
    if (b < h) for (let x = 0; x < w; x++) { S[x] += t[fb + x]; N[x]++; }
    if (a >= 0) for (let x = 0; x < w; x++) { S[x] -= t[fa + x]; N[x]--; }
    for (let x = 0; x < w; x++) o[f + x] = (S[x] / N[x]) | 0;
  }
  return o;
}
// Umbral de Otsu con las medias de las dos clases
function scnOtsu(g) {
  const H = new Float64Array(256); for (let i = 0; i < g.length; i++) H[g[i]]++;
  const n = g.length; let sum = 0; for (let v = 0; v < 256; v++) sum += v * H[v];
  let sB = 0, wB = 0, best = -1, t = 127, m0 = 0, m1 = 255;
  for (let v = 0; v < 256; v++) { wB += H[v]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += v * H[v]; const mB = sB / wB, mF = (sum - sB) / wF; const q = wB * wF * (mB - mF) * (mB - mF); if (q > best) { best = q; t = v; m0 = mB; m1 = mF; } }
  return { t, m0, m1 };
}
// Envolvente convexa (cadena monótona), en sentido horario en coordenadas de pantalla
function scnEnvolvente(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const scnArea = (Q) => { let a = 0; for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
// Esquinas en orden: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda
function scnOrdenar(Q) {
  const cx = Q.reduce((s, p) => s + p[0], 0) / Q.length, cy = Q.reduce((s, p) => s + p[1], 0) / Q.length;
  const S = Q.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)); // de −π a π: empieza arriba-izquierda en pantalla
  let k = 0; for (let i = 1; i < 4; i++) if (S[i][0] + S[i][1] < S[k][0] + S[k][1]) k = i;
  return [0, 1, 2, 3].map((i) => S[(k + i) % 4]);
}
// Cuadrilátero de área máxima inscrito en la envolvente (arranque por los extremos de las diagonales y mejora corner a corner)
function scnCuadrilatero(H) {
  if (H.length < 4) return null;
  const arg = (f) => H.reduce((b, p) => (f(p) > f(b) ? p : b), H[0]);
  let Q = [arg((p) => -p[0] - p[1]), arg((p) => p[0] - p[1]), arg((p) => p[0] + p[1]), arg((p) => p[1] - p[0])];
  if (new Set(Q).size < 4) return null;
  for (let it = 0; it < 6; it++) {
    let cambio = false;
    for (let k = 0; k < 4; k++) { let mejor = scnArea(Q), pk = Q[k]; for (const p of H) { const R = Q.slice(); R[k] = p; const a = scnArea(R); if (a > mejor + 1e-9 && scnConvexo(R)) { mejor = a; pk = p; } } if (pk !== Q[k]) { Q[k] = pk; cambio = true; } }
    if (!cambio) break;
  }
  return scnOrdenar(Q);
}
function scnConvexo(Q) { let s = 0; for (let i = 0; i < 4; i++) { const a = Q[i], b = Q[(i + 1) % 4], c = Q[(i + 2) % 4]; const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(z) < 1e-9) return false; if (!s) s = Math.sign(z); else if (Math.sign(z) !== s) return false; } return true; }
// Ángulos interiores en grados
const scnAngulos = (Q) => Q.map((b, i) => { const a = Q[(i + 3) % 4], c = Q[(i + 1) % 4]; const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI; });
// Recta por mínimos cuadrados totales: { p: punto, d: dirección unitaria }
function scnRecta(P) {
  const n = P.length; let mx = 0, my = 0; for (const p of P) { mx += p[0]; my += p[1]; } mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0; for (const p of P) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy); return { p: [mx, my], d: [Math.cos(th), Math.sin(th)] };
}
function scnCorte(a, b) { const den = a.d[0] * b.d[1] - a.d[1] * b.d[0]; if (Math.abs(den) < 1e-6) return null; const t = ((b.p[0] - a.p[0]) * b.d[1] - (b.p[1] - a.p[1]) * b.d[0]) / den; return [a.p[0] + t * a.d[0], a.p[1] + t * a.d[1]]; }

// ── Detección del documento ──
// Entrada: RGBA a resolución reducida (unos 360-720 px de lado mayor). Salida: { esquinas: [[x,y]×4] en píxeles de esa imagen, conf 0-1,
// area: fracción de la imagen, borde: true si el papel toca el borde de la imagen } o null si no hay un papel claro.
// Dos candidatos, y gana el que mejor encaja con lo que se ve:
//  1. Región clara: «papel» (claro y poco saturado) desenfocado → umbral de Otsu → mayor región conexa cerca del centro → crecimiento con un
//     umbral más bajo que no cruza bordes fuertes (recupera la parte del papel en sombra) → envolvente convexa → cuadrilátero de área máxima.
//  2. Rectas: gradiente (Sobel) → transformada de Hough orientada (cada punto de borde vota solo las rectas casi perpendiculares a su
//     gradiente, con un peso que se satura para que un borde largo y suave pese más que la letra) → cuadriláteros con dos pares de rectas.
//     Encuentra el papel cuando el fondo es casi tan claro como él (mesa blanca), cuando hay más papeles debajo o reflejos.
// En los dos, cada lado se ajusta al borde real por el gradiente y se cortan las cuatro rectas. La puntuación de un cuadrilátero (scnPuntuar)
// es la fracción de cada lado donde dentro es más claro que fuera (el borde del papel), con la geometría (convexo, ángulos, tamaño).
function scnMapas(rgba, w, h) {
  const n = w * h, L = new Uint8Array(n), P = new Uint8Array(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const r = rgba[i], v = rgba[i + 1], b = rgba[i + 2]; const l = (r * 77 + v * 150 + b * 29) >> 8; L[j] = l;
    const mx = r > v ? (r > b ? r : b) : v > b ? v : b, mn = r < v ? (r < b ? r : b) : v < b ? v : b; const p = l - 0.7 * (mx - mn); P[j] = p < 0 ? 0 : p;
  }
  return { L, P };
}
// Muestreo bilineal acotado a la imagen
function scnMuestra(L, w, h) { return (x, y) => { if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001; if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001; const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0; return (L[i] * (1 - fx) + L[i + 1] * fx) * (1 - fy) + (L[i + w] * (1 - fx) + L[i + w + 1] * fx) * fy; }; }
const scnCentro = (Q) => [(Q[0][0] + Q[1][0] + Q[2][0] + Q[3][0]) / 4, (Q[0][1] + Q[1][1] + Q[2][1] + Q[3][1]) / 4];
// Puntuación 0-1 de un cuadrilátero: en cada lado, fracción de puntos con el interior al menos «um» niveles más claro que el exterior. Los
// lados pegados al borde de la imagen (papel cortado) no cuentan: valen la media de los demás, y hacen falta dos lados vistos
function scnPuntuar(lum, w, h, Q, um) {
  const [cx, cy] = scnCentro(Q); const L = [], visto = [];
  for (let k = 0; k < 4; k++) {
    const a = Q[k], b = Q[(k + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    let nn = [-u[1], u[0]]; if (((a[0] + b[0]) / 2 - cx) * nn[0] + ((a[1] + b[1]) / 2 - cy) * nn[1] < 0) nn = [-nn[0], -nn[1]];
    const d = Math.max(2, Math.min(4, len * 0.012)); let si = 0, tot = 0;
    for (let s = 1; s < 24; s++) {
      const t = 0.07 + 0.86 * s / 24, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const xo = x + nn[0] * d, yo = y + nn[1] * d; if (xo < 0.5 || yo < 0.5 || xo > w - 1.5 || yo > h - 1.5) continue;
      tot++; if (lum(x - nn[0] * d, y - nn[1] * d) - lum(xo, yo) >= um) si++;
    }
    visto.push(tot >= 8); L.push(tot ? si / tot : 0);
  }
  const V = L.filter((_, k) => visto[k]); if (V.length < 2) return { p: 0, lados: L };
  const media = V.reduce((s, v) => s + v, 0) / V.length, min = Math.min(...V);
  return { p: 0.45 * media + 0.55 * min, lados: L.map((v, k) => (visto[k] ? v : media)), vistos: V.length };
}
// Geometría aceptable: convexo, ángulos de 35° a 145°, lados no diminutos, dentro de la imagen (con margen)
function scnGeometriaOk(Q, w, h) {
  if (!Q || Q.some((p) => !p || !isFinite(p[0]) || !isFinite(p[1]) || p[0] < -0.04 * w || p[1] < -0.04 * h || p[0] > 1.04 * w || p[1] > 1.04 * h)) return false;
  if (!scnConvexo(Q)) return false;
  if (scnAngulos(Q).some((a) => a < 35 || a > 145)) return false;
  return Math.min(...Q.map((p, k) => Math.hypot(Q[(k + 1) % 4][0] - p[0], Q[(k + 1) % 4][1] - p[1]))) >= Math.min(w, h) * 0.1;
}
// Ajuste fino de cada lado al borde real (gradiente de luminancia, de dentro claro a fuera oscuro) y corte de las cuatro rectas
function scnAjustar(lum, w, h, Q, umbral) {
  const [cx, cy] = scnCentro(Q);
  const R = Math.max(3, Math.round(Math.hypot(w, h) * 0.025));
  const lados = [];
  for (let k = 0; k < 4; k++) {
    const a = Q[k], b = Q[(k + 1) % 4]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    let nn = [-u[1], u[0]]; const mxp = (a[0] + b[0]) / 2, myp = (a[1] + b[1]) / 2; if ((mxp - cx) * nn[0] + (myp - cy) * nn[1] < 0) nn = [-nn[0], -nn[1]]; // normal hacia fuera
    const pts = [], M = 28; let enBorde = 0;
    for (let s = 1; s < M; s++) {
      const tt = 0.08 + 0.84 * s / M, bx = a[0] + (b[0] - a[0]) * tt, by = a[1] + (b[1] - a[1]) * tt;
      if (bx <= 1.5 || by <= 1.5 || bx >= w - 2.5 || by >= h - 2.5) { enBorde++; continue; }
      let dm = 0, vm = -1e9; for (let d = -R; d <= R; d += 0.5) { const qx = bx + nn[0] * d, qy = by + nn[1] * d; const v = lum(qx - nn[0] * 1.5, qy - nn[1] * 1.5) - lum(qx + nn[0] * 1.5, qy + nn[1] * 1.5); if (v > vm) { vm = v; dm = d; } }
      if (vm > umbral) pts.push([bx + nn[0] * dm, by + nn[1] * dm]);
    }
    let ln = null;
    if (pts.length >= 8) { ln = scnRecta(pts); for (let it = 0; it < 2; it++) { const res = pts.map((p) => Math.abs((p[0] - ln.p[0]) * ln.d[1] - (p[1] - ln.p[1]) * ln.d[0])); const lim = Math.max(1, [...res].sort((x, y) => x - y)[Math.floor(res.length * 0.7)] * 2); const B = pts.filter((p, i) => res[i] <= lim); if (B.length >= 6) ln = scnRecta(B); } }
    lados.push(ln && pts.length >= (M - 1 - enBorde) * 0.35 ? ln : { p: a, d: u });
  }
  const Q2 = [0, 1, 2, 3].map((k) => scnCorte(lados[(k + 3) % 4], lados[k]));
  if (Q2.every(Boolean) && scnConvexo(Q2) && Q2.every((p, k) => Math.hypot(p[0] - Q[k][0], p[1] - Q[k][1]) < R * 2.5)) return Q2.map((p) => [Math.max(0, Math.min(w - 1, p[0])), Math.max(0, Math.min(h - 1, p[1]))]);
  return Q.map((p) => [Math.max(0, Math.min(w - 1, p[0])), Math.max(0, Math.min(h - 1, p[1]))]);
}
// Candidato 1: la región clara más grande y centrada
function scnRegion(P, w, h) {
  const n = w * h;
  const f = scnCaja(scnCaja(P, w, h, 1), w, h, 2);
  const { t, m0, m1 } = scnOtsu(f);
  if (m1 - m0 < 14) return null; // sin contraste entre papel y fondo
  const lab = new Int32Array(n).fill(-1); const pila = new Int32Array(n);
  let mejor = null, nc = 0;
  for (let s0 = 0; s0 < n; s0++) {
    if (lab[s0] !== -1 || f[s0] <= t) continue;
    let sp = 0, area = 0, sx = 0, sy = 0; pila[sp++] = s0; lab[s0] = nc;
    while (sp) { const i = pila[--sp]; const x = i % w, y = (i / w) | 0; area++; sx += x; sy += y;
      if (x > 0 && lab[i - 1] === -1 && f[i - 1] > t) { lab[i - 1] = nc; pila[sp++] = i - 1; } if (x < w - 1 && lab[i + 1] === -1 && f[i + 1] > t) { lab[i + 1] = nc; pila[sp++] = i + 1; }
      if (y > 0 && lab[i - w] === -1 && f[i - w] > t) { lab[i - w] = nc; pila[sp++] = i - w; } if (y < h - 1 && lab[i + w] === -1 && f[i + w] > t) { lab[i + w] = nc; pila[sp++] = i + w; } }
    if (area > n * 0.03) { const cx = sx / area / w - 0.5, cy = sy / area / h - 0.5; const sc = area * (1 - 0.9 * Math.hypot(cx, cy)); if (!mejor || sc > mejor.sc) mejor = { id: nc, area, sc }; }
    nc++;
  }
  if (!mejor) return null;
  // Crecimiento: umbral bajo (mitad entre el fondo y el de Otsu), sin cruzar píxeles de borde fuerte; solo el contorno siembra
  const reg = new Uint8Array(n); let sp = 0;
  for (let i = 0; i < n; i++) if (lab[i] === mejor.id) { reg[i] = 1; if (i < w || i >= n - w || f[i - 1] <= t || f[i + 1] <= t || f[i - w] <= t || f[i + w] <= t) pila[sp++] = i; }
  const tb = (m0 + t) / 2, gmax = 0.2 * (m1 - m0);
  while (sp) { const i = pila[--sp]; const x = i % w, y = (i / w) | 0;
    if (f[i] <= t) { const gx = x > 0 && x < w - 1 ? Math.abs(f[i + 1] - f[i - 1]) : 0, gy = y > 0 && y < h - 1 ? Math.abs(f[i + w] - f[i - w]) : 0; if ((gx > gy ? gx : gy) > gmax) continue; }
    if (x > 0 && !reg[i - 1] && f[i - 1] > tb) { reg[i - 1] = 1; pila[sp++] = i - 1; } if (x < w - 1 && !reg[i + 1] && f[i + 1] > tb) { reg[i + 1] = 1; pila[sp++] = i + 1; }
    if (i >= w && !reg[i - w] && f[i - w] > tb) { reg[i - w] = 1; pila[sp++] = i - w; } if (i + w < n && !reg[i + w] && f[i + w] > tb) { reg[i + w] = 1; pila[sp++] = i + w; } }
  // Contorno: el primer y el último píxel de la región en cada fila y en cada columna (basta para la envolvente convexa)
  const P2 = [];
  for (let y = 0; y < h; y++) { const f0 = y * w; let a = -1, b = -1; for (let x = 0; x < w; x++) if (reg[f0 + x]) { if (a < 0) a = x; b = x; } if (a >= 0) { P2.push([a, y]); if (b !== a) P2.push([b, y]); } }
  for (let x = 0; x < w; x++) { let a = -1, b = -1; for (let y = 0; y < h; y++) if (reg[y * w + x]) { if (a < 0) a = y; b = y; } if (a >= 0) { P2.push([x, a]); if (b !== a) P2.push([x, b]); } }
  const Q = scnCuadrilatero(scnEnvolvente(P2)); if (!Q) return null;
  return { Q, contraste: m1 - m0 };
}
// Candidato 2: rectas de Hough sobre el gradiente
function scnHough(lum, L, w, h, um) {
  const n = w * h, mag = new Uint16Array(n), GX = new Int16Array(n), GY = new Int16Array(n), H = new Uint32Array(256);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1];
    const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
    const m = (gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy); mag[i] = m; GX[i] = gx; GY[i] = gy; H[m > 1023 ? 255 : m >> 2]++;
  }
  let acu = 0, p80 = 0; for (; p80 < 255; p80++) { acu += H[p80]; if (acu >= n * 0.8) break; }
  const tau = Math.max(36, p80 * 4);
  const NT = 90, D = Math.ceil(Math.hypot(w, h)), NR = 2 * D + 1, acc = new Float32Array(NT * NR);
  const C = new Float32Array(NT), S = new Float32Array(NT); for (let k = 0; k < NT; k++) { C[k] = Math.cos(k * Math.PI / NT); S[k] = Math.sin(k * Math.PI / NT); }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, m = mag[i]; if (m < tau) continue;
    const wgt = m > 3 * tau ? 3 : m / tau; let a = Math.atan2(GY[i], GX[i]); if (a < 0) a += Math.PI; const k0 = Math.round(a / Math.PI * NT);
    for (let dk = -3; dk <= 3; dk++) { const k = (k0 + dk + NT) % NT; acc[k * NR + Math.round(x * C[k] + y * S[k]) + D] += wgt; }
  }
  // Picos (máximos locales), los 18 más votados
  const minV = Math.min(w, h) * 0.22, picos = [];
  for (let k = 0; k < NT; k++) for (let r = 2; r < NR - 2; r++) {
    const v = acc[k * NR + r]; if (v < minV) continue; let max = true;
    for (let dk = -2; dk <= 2 && max; dk++) { const kk = (k + dk + NT) % NT, rr = (k + dk < 0 || k + dk >= NT) ? NR - 1 - r : r; for (let dr = -5; dr <= 5; dr++) { const q = rr + dr; if ((dk || dr) && q >= 0 && q < NR && acc[kk * NR + q] > v) { max = false; break; } } }
    if (max) picos.push({ k, rho: r - D, v });
  }
  picos.sort((a, b) => b.v - a.v); const R = picos.slice(0, 18);
  // Rectas como { p, d } (punto y dirección) para cortarlas; pares casi paralelos y separados
  const recta = (q) => { const c = C[q.k], s = S[q.k]; return { p: [c * q.rho, s * q.rho], d: [-s, c] }; };
  const dang = (a, b) => { const x = Math.abs(a.k - b.k) % NT; return Math.min(x, NT - x) * 180 / NT; };
  const pares = [];
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    if (dang(R[i], R[j]) > 24) continue;
    const ri = recta(R[i]), rj = recta(R[j]); const sep = Math.abs((rj.p[0] - ri.p[0]) * ri.d[1] - (rj.p[1] - ri.p[1]) * ri.d[0]);
    if (sep >= Math.min(w, h) * 0.12) pares.push([R[i], R[j], ri, rj]);
  }
  let mejor = null; const area = n;
  for (let a = 0; a < pares.length; a++) for (let b = a + 1; b < pares.length; b++) {
    const A = pares[a], B = pares[b]; if (Math.min(dang(A[0], B[0]), dang(A[0], B[1]), dang(A[1], B[0])) < 35) continue;
    const Q0 = [scnCorte(A[2], B[2]), scnCorte(B[2], A[3]), scnCorte(A[3], B[3]), scnCorte(B[3], A[2])]; if (Q0.some((p) => !p)) continue;
    const Q = scnOrdenar(Q0); if (!scnGeometriaOk(Q, w, h)) continue;
    const ar = scnArea(Q) / area; if (ar < 0.04 || ar > 0.985) continue;
    const s = scnPuntuar(lum, w, h, Q, um); const p = s.p * (0.75 + 0.25 * Math.min(1, ar / 0.35));
    if (s.p >= 0.45 && (!mejor || p > mejor.pp)) mejor = { Q, pp: p };
  }
  return mejor && mejor.Q;
}
function scnDetectar(rgba, w, h) {
  const n = w * h; if (n < 400) return null;
  const { L, P } = scnMapas(rgba, w, h);
  const Lb = scnCaja(L, w, h, 1), lum = scnMuestra(Lb, w, h);
  // Umbral de «más claro dentro» según la luz de la escena (de noche, los saltos son pequeños)
  let suma = 0; for (let i = 0; i < n; i += 7) suma += Lb[i]; const brillo = suma / Math.ceil(n / 7); const um = Math.max(3, Math.min(8, brillo * 0.05));
  const cands = [];
  const evaluar = (Q, origen) => {
    if (!Q) return null; const Qa = scnAjustar(lum, w, h, Q, Math.max(4, um)); if (!scnGeometriaOk(Qa, w, h)) return null;
    const s = scnPuntuar(lum, w, h, Qa, um); const c = { Q: Qa, p: s.p, lados: s.lados, origen, area: scnArea(Qa) / n }; cands.push(c); return c;
  };
  const reg = scnRegion(P, w, h); const c1 = reg && evaluar(reg.Q, "region");
  if (!c1 || c1.p < 0.82) evaluar(scnHough(lum, Lb, w, h, um), "rectas");
  if (!cands.length) return null;
  // Gana la mejor puntuación; a igualdad (±0,06), la mayor (el papel entero y no un recuadro de dentro)
  cands.sort((a, b) => (Math.abs(a.p - b.p) <= 0.06 ? b.area - a.area : b.p - a.p));
  const m = cands[0]; if (m.p < 0.3 || m.area < 0.04) return null;
  const Q = m.Q; const borde = Q.some(([x, y]) => x <= 1.5 || y <= 1.5 || x >= w - 2.5 || y >= h - 2.5);
  return { esquinas: Q, conf: Math.round(Math.min(1, m.p) * 100) / 100, area: Math.round(m.area * 1000) / 1000, borde, origen: m.origen };
}

// ── Homografía y corrección de perspectiva ──
// Matriz 3×3 (vector de 9) que lleva los puntos «de» a «a» (4 pares), por eliminación de Gauss
function scnHomografia(de, a) {
  const A = [], B = [];
  for (let i = 0; i < 4; i++) { const [x, y] = de[i], [u, v] = a[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v); }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const k = A[r][c] / A[c][c]; if (!k) continue; for (let j = c; j < 8; j++) A[r][j] -= k * A[c][j]; B[r] -= k * B[c]; }
  }
  return [...B.map((b, i) => b / A[i][i]), 1];
}
const scnAplicarH = (H, x, y) => { const z = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z]; };
// Proporción real (ancho/alto) del rectángulo fotografiado, a partir de sus cuatro esquinas en la foto y del centro óptico (el de la imagen):
// método de Zhang y He (2007, «Whiteboard scanning and image enhancement»), que estima a la vez la distancia focal. null si la perspectiva es
// demasiado débil para estimarla (entonces vale la media de los lados) o si el resultado no tiene sentido
function scnProporcion(Q, w, h) {
  const c = [(w - 1) / 2, (h - 1) / 2]; const P = Q.map(([x, y]) => [x - c[0], y - c[1], 1]); const [m1, m2, m4, m3] = P; // m1 arriba-izq, m2 arriba-der, m3 abajo-izq, m4 abajo-der
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], pe = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const k2 = pe(cr(m1, m4), m3) / pe(cr(m2, m4), m3), k3 = pe(cr(m1, m4), m2) / pe(cr(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]), n3 = m3.map((v, i) => k3 * v - m1[i]);
  const L = Math.max(w, h); let f2 = null;
  if (Math.abs(n2[2]) > 1e-6 && Math.abs(n3[2]) > 1e-6) { f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2]); if (!(f2 > 0) || Math.sqrt(f2) < L * 0.3 || Math.sqrt(f2) > L * 8) f2 = null; }
  // Un solo punto de fuga (móvil inclinado de frente, lados paralelos dos a dos en la foto): la focal no se puede calcular; se toma la típica
  // de un móvil o una webcam (gran angular de unos 26 mm equivalentes: 0,75 del lado mayor)
  if (f2 == null) { if (Math.abs(n2[2]) < 1e-6 && Math.abs(n3[2]) < 1e-6) return null; f2 = (0.75 * L) ** 2; }
  const r = Math.sqrt((n2[0] ** 2 + n2[1] ** 2 + f2 * n2[2] ** 2) / (n3[0] ** 2 + n3[1] ** 2 + f2 * n3[2] ** 2));
  return r > 0.25 && r < 4 ? r : null;
}
// Tamaño de salida para un cuadrilátero (en píxeles de la imagen de origen): ancho y alto medios de los lados opuestos; se ajusta a la
// proporción A4 o de tarjeta (DNI) si está cerca (la perspectiva deforma un poco la proporción), y se limita el lado mayor
function scnTamSalida(Q, max = 2400, min = 0, dims) {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.max(d(Q[0], Q[1]), d(Q[3], Q[2])), H = Math.max(d(Q[0], Q[3]), d(Q[1], Q[2]));
  // Con perspectiva fuerte, la media de los lados acorta el lado que se aleja: si se conoce la imagen, se usa la proporción real estimada
  const pr = dims ? scnProporcion(Q, dims[0], dims[1]) : null; if (pr) { const a = Math.sqrt(W * H); W = a * Math.sqrt(pr); H = a / Math.sqrt(pr); }
  const r = H / W;
  for (const ref of [Math.SQRT2, 1 / Math.SQRT2, 1.585, 1 / 1.585]) if (Math.abs(r - ref) / ref < 0.09) { if (ref > 1) H = W * ref; else W = H / ref; break; }
  const k = Math.min(Math.max(1, min / Math.min(W, H)), max / Math.max(W, H)); return [Math.max(8, Math.round(W * k)), Math.max(8, Math.round(H * k))];
}
// Endereza: RGBA de origen (sw×sh) + cuadrilátero → RGBA de W×H (interpolación bilineal)
function scnEnderezar(src, sw, sh, Q, W, H) {
  const M = scnHomografia([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]], Q); const out = new Uint8ClampedArray(W * H * 4);
  if (!M) return out;
  for (let y = 0; y < H; y++) {
    // Por fila: numeradores y denominador lineales en x
    let nx = M[1] * y + M[2], ny = M[4] * y + M[5], nz = M[7] * y + M[8];
    for (let x = 0; x < W; x++, nx += M[0], ny += M[3], nz += M[6]) {
      let fx = nx / nz, fy = ny / nz; const o = (y * W + x) * 4;
      if (fx < 0) fx = 0; else if (fx > sw - 1.001) fx = sw - 1.001; if (fy < 0) fy = 0; else if (fy > sh - 1.001) fy = sh - 1.001;
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, i = (y0 * sw + x0) * 4, j = i + sw * 4;
      const w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
      out[o] = src[i] * w00 + src[i + 4] * w10 + src[j] * w01 + src[j + 4] * w11;
      out[o + 1] = src[i + 1] * w00 + src[i + 5] * w10 + src[j + 1] * w01 + src[j + 5] * w11;
      out[o + 2] = src[i + 2] * w00 + src[i + 6] * w10 + src[j + 2] * w01 + src[j + 6] * w11;
      out[o + 3] = 255;
    }
  }
  return out;
}
// Giro de 90/180/270 grados (sentido horario) de un RGBA
function scnGirar(src, w, h, g) {
  g = ((g % 360) + 360) % 360; if (!g) return { d: src, w, h };
  const W = g === 180 ? w : h, H = g === 180 ? h : w; const out = new Uint8ClampedArray(W * H * 4); const s32 = new Uint32Array(src.buffer, src.byteOffset, w * h), o32 = new Uint32Array(out.buffer);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = s32[y * w + x]; if (g === 90) o32[x * W + (h - 1 - y)] = v; else if (g === 180) o32[(h - 1 - y) * W + (w - 1 - x)] = v; else o32[(w - 1 - x) * W + y] = v; }
  return { d: out, w: W, h: H };
}

// ── Realce «documento escaneado» ──
// Fondo de iluminación: máximo por bloques (el papel es lo más claro de cada zona), máximo 3×3 entre bloques (salta bloques llenos de tinta o
// fotos), suavizado; cada píxel se divide por su fondo (quita sombras y luz amarilla) y una curva deja el papel en blanco puro y el texto negro.
// Modos: documento (gris), color (fondo blanco conservando sellos y firmas de color), gris (solo contraste), bn (blanco y negro), original.
function scnFondo(g, w, h) {
  const B = Math.max(8, Math.round(Math.max(w, h) / 40)), gw = Math.ceil(w / B), gh = Math.ceil(h / B);
  let G = new Float32Array(gw * gh);
  for (let by = 0; by < gh; by++) for (let bx = 0; bx < gw; bx++) { const H = new Uint32Array(64); let n = 0; for (let y = by * B; y < Math.min(h, by * B + B); y += 2) for (let x = bx * B; x < Math.min(w, bx * B + B); x += 2) { H[g[y * w + x] >> 2]++; n++; } let a = 0, v = 63; for (; v > 0; v--) { a += H[v]; if (a >= n * 0.06) break; } G[by * gw + bx] = v * 4 + 2; } // percentil 94: el blanco del papel sin el brillo suelto
  const mx = new Float32Array(gw * gh); for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let m = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw && G[yy * gw + xx] > m) m = G[yy * gw + xx]; } mx[y * gw + x] = m; }
  // suavizado 3×3 dos veces
  for (let it = 0; it < 2; it++) { const s = new Float32Array(gw * gh); for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let a = 0, c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) { a += mx[yy * gw + xx]; c++; } } s[y * gw + x] = a / c; } mx.set(s); }
  G = mx;
  return (x, y) => { const fx = Math.max(0, Math.min(gw - 1.001, x / B - 0.5)), fy = Math.max(0, Math.min(gh - 1.001, y / B - 0.5)); const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, i = y0 * gw + x0; const x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1); return (G[i] * (1 - ax) + G[y0 * gw + x1] * ax) * (1 - ay) + (G[y1 * gw + x0] * (1 - ax) + G[y1 * gw + x1] * ax) * ay; };
}
function scnRealzar(rgba, w, h, modo = "documento") {
  if (modo === "original") return rgba;
  const out = new Uint8ClampedArray(rgba.length); const g = scnLuma(rgba, w, h);
  if (modo === "gris") { const e = lecEstirar(g).g; for (let i = 0, j = 0; j < e.length; i += 4, j++) { out[i] = out[i + 1] = out[i + 2] = e[j]; out[i + 3] = 255; } return out; }
  if (modo === "bn") { const e = lecUmbralAdaptativo(lecEstirar(g).g, w, h, 0.18); for (let i = 0, j = 0; j < e.length; i += 4, j++) { out[i] = out[i + 1] = out[i + 2] = e[j]; out[i + 3] = 255; } return out; }
  const fondo = scnFondo(g, w, h);
  // «luz»: solo se iguala la iluminación (sin sombras ni papel amarillento), sin curva de contraste: para fotos de poca resolución, donde la
  // curva engorda las letras; el lector estira y binariza después
  if (modo === "luz") { const fila = new Float32Array(w); for (let y = 0; y < h; y++) { if (y % 4 === 0) for (let x = 0; x < w; x++) fila[x] = fondo(x, y); for (let x = 0; x < w; x++) { const i = y * w + x, v = Math.min(255, g[i] * 255 / Math.max(24, fila[x])); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; } } return out; }
  // Normalizado y punto negro (percentil 1 del normalizado)
  const N = new Uint8Array(w * h); const Hh = new Uint32Array(256);
  const B = Math.max(8, Math.round(Math.max(w, h) / 40)); const fila = new Float32Array(w);
  for (let y = 0; y < h; y++) { if (y % 4 === 0 || y === 0) for (let x = 0; x < w; x++) fila[x] = fondo(x, y); for (let x = 0; x < w; x++) { const i = y * w + x; const v = Math.min(255, g[i] * 255 / Math.max(24, fila[x])); N[i] = v; Hh[v | 0]++; } }
  let neg = 0, a = 0; for (; neg < 255; neg++) { a += Hh[neg]; if (a >= w * h * 0.004) break; } neg = Math.min(neg, 150);
  const blanco = 232, curva = new Uint8Array(256); for (let v = 0; v < 256; v++) { const t = Math.max(0, Math.min(1, (v - neg) / (blanco - neg))); curva[v] = Math.round(255 * Math.pow(t, 1.35)); }
  if (modo === "color") {
    for (let y = 0; y < h; y++) { if (y % 4 === 0) for (let x = 0; x < w; x++) fila[x] = fondo(x, y); for (let x = 0; x < w; x++) { const i = y * w + x, o = i * 4; const k = 255 / Math.max(24, fila[x]); for (let c = 0; c < 3; c++) out[o + c] = curva[Math.min(255, rgba[o + c] * k) | 0]; out[o + 3] = 255; } }
    return out;
  }
  for (let i = 0, o = 0; i < N.length; i++, o += 4) { const v = curva[N[i]]; out[o] = out[o + 1] = out[o + 2] = v; out[o + 3] = 255; }
  void B; return out;
}

// ── Orientación del texto (0, 90, 180 o 270 grados) sobre una imagen binarizada (0 = tinta) ──
// 90/270: las líneas de texto dan un perfil de filas muy «a rayas» y uno de columnas plano; si es al revés, el texto está de lado.
// 180: en castellano hay muchas más letras con trazo por encima de la altura de la «x» (b, d, f, h, k, l, t, mayúsculas, cifras y tildes) que
// por debajo (g, j, p, q, y): en cada línea se compara la tinta por encima y por debajo de su franja central. Devuelve el giro (horario) que
// endereza la imagen y la confianza.
function scnPerfil(b, w, h, filas) { const P = new Float64Array(filas ? h : w); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (b[y * w + x] < 128) P[filas ? y : x]++; return P; }
// Fracción de filas (o columnas) en blanco dentro de la zona con tinta: entre renglones hay filas vacías; entre columnas casi nunca
const scnHuecos = (P) => { let a = 0, z = P.length - 1, mx = 0; for (const v of P) if (v > mx) mx = v; if (!mx) return 0; while (a < z && P[a] <= mx * 0.02) a++; while (z > a && P[z] <= mx * 0.02) z--; let n = 0; for (let i = a; i <= z; i++) if (P[i] <= mx * 0.02) n++; return n / (z - a + 1); };
function scnArribaAbajo(b, w, h) {
  const P = scnPerfil(b, w, h, true); const max = Math.max(...P); if (!max) return { r: 0.5, lineas: 0 };
  let arriba = 0, abajo = 0, lineas = 0;
  for (let y = 0; y < h;) {
    if (P[y] <= max * 0.04) { y++; continue; }
    let y2 = y; while (y2 < h && P[y2] > max * 0.04) y2++;
    const alto = y2 - y; if (alto >= 4 && alto < h * 0.2) {
      let pk = 0; for (let k = y; k < y2; k++) pk = Math.max(pk, P[k]);
      let c0 = y; while (c0 < y2 && P[c0] < pk * 0.45) c0++; let c1 = y2 - 1; while (c1 > c0 && P[c1] < pk * 0.45) c1--;
      let A = 0, D = 0; for (let k = y; k < c0; k++) A += P[k]; for (let k = c1 + 1; k < y2; k++) D += P[k];
      if (A + D > 0 && c1 - c0 >= 2) { arriba += A; abajo += D; lineas++; }
    }
    y = y2;
  }
  return { r: arriba + abajo ? arriba / (arriba + abajo) : 0.5, lineas };
}
// Copia sin trazos largos horizontales ni verticales (bordes de tabla, marcos, subrayados): solo la tinta de las letras
function scnSoloLetras(b, w, h) {
  const o = new Uint8Array(b), Lh = Math.max(12, w * 0.05), Lv = Math.max(12, h * 0.05);
  for (let y = 0; y < h; y++) { let ini = -1; for (let x = 0; x <= w; x++) { const t = x < w && b[y * w + x] < 128; if (t && ini < 0) ini = x; else if (!t && ini >= 0) { if (x - ini >= Lh) for (let k = ini; k < x; k++) o[y * w + k] = 255; ini = -1; } } }
  for (let x = 0; x < w; x++) { let ini = -1; for (let y = 0; y <= h; y++) { const t = y < h && b[y * w + x] < 128; if (t && ini < 0) ini = y; else if (!t && ini >= 0) { if (y - ini >= Lv) for (let k = ini; k < y; k++) o[k * w + x] = 255; ini = -1; } } }
  return o;
}
function scnOrientacion(b, w, h) {
  b = scnSoloLetras(b, w, h);
  const hf = scnHuecos(scnPerfil(b, w, h, true)), hc = scnHuecos(scnPerfil(b, w, h, false));
  const lado = hc > Math.max(0.12, hf * 1.6); // texto de lado: las filas vacías están en las columnas
  let B = b, W = w, H = h;
  if (lado) { const o = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[x * h + (h - 1 - y)] = b[y * w + x]; B = o; W = h; H = w; } // girada 90° en sentido horario
  // En páginas de texto la proporción es muy clara (derecha ≈ 0,85-1; boca abajo ≈ 0-0,2). En fotos de tarjetas (DNI) con ruido ronda 0,3-0,6:
  // ahí no se gira nada
  const q = scnArribaAbajo(B, W, H);
  const conf = q.lineas < 6 ? 0 : Math.min(1, Math.abs(q.r - 0.5) * 2.5);
  const invertida = q.lineas >= 6 && q.r < 0.3, derecha = q.lineas >= 6 && q.r > 0.7;
  if (!lado) return { giro: invertida ? 180 : 0, conf: invertida ? conf : Math.max(conf, 0.5), lineas: q.lineas };
  if (!invertida && !derecha) return { giro: 90, conf: 0.3, lineas: q.lineas }; // de lado; el sentido, dudoso
  return { giro: invertida ? 270 : 90, conf, lineas: q.lineas };
}

// ── Doble página (libro de familia abierto, escritura fotocopiada a dos caras): busca el lomo, una franja vertical central casi sin tinta
// con texto a ambos lados. Devuelve la x de corte o 0. Las tarjetas (DNI) y los documentos apaisados normales no se parten: el lomo debe
// estar limpio de arriba abajo y cada mitad debe tener al menos 6 líneas de texto.
function scnDoblePagina(b, w, h) {
  if (w < h * 1.15 || w > h * 2.2) return 0;
  // Perfil de columnas sin los trazos verticales largos (el borde del lomo, las líneas de las tablas): solo la tinta del texto
  const C = new Float64Array(w), L = Math.max(6, h * 0.04);
  for (let x = 0; x < w; x++) { let run = 0, n = 0; for (let y = 0; y <= h; y++) { if (y < h && b[y * w + x] < 128) run++; else { if (run && run < L) n += run; run = 0; } } C[x] = n; }
  let mejor = 0, xm = 0;
  const media = C.reduce((s, v) => s + v, 0) / w; if (!media) return 0;
  const K = Math.max(3, Math.round(w * 0.015)); // el lomo con sus márgenes ocupa bastante más del 3 % del ancho
  for (let x = Math.round(w * 0.38); x <= Math.round(w * 0.62); x++) { let s = 0; for (let k = -K; k <= K; k++) s += C[Math.max(0, Math.min(w - 1, x + k))]; const v = 1 - s / (2 * K + 1) / media; if (v > mejor) { mejor = v; xm = x; } }
  if (mejor < 0.9) return 0;
  // Renglones de cada mitad: tramos de filas con tinta separados por filas en blanco
  const mitad = (x0, x1) => { const P = new Float64Array(h); for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) if (b[y * w + x] < 128) P[y]++; const mx = Math.max(...P); let n = 0, dentro = false, ini = 0; for (let y = 0; y <= h; y++) { const t = y < h && P[y] > mx * 0.05; if (t && !dentro) { dentro = true; ini = y; } else if (!t && dentro) { dentro = false; if (y - ini >= 3 && y - ini < h * 0.2) n++; } } return n; };
  return mitad(0, xm) >= 6 && mitad(xm, w) >= 6 ? xm : 0;
}

// ── PDF mínimo de imágenes JPEG (sin librerías) ──
// paginas: [{ jpeg: Uint8Array, w, h, gris? }]. Cada página a la proporción de su imagen, con 595 pt (A4) del lado corto.
function scnPdf(paginas, titulo = "Escaneo") {
  const enc = new TextEncoder(); const partes = []; const offs = []; let pos = 0;
  const add = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; partes.push(b); pos += b.length; };
  const obj = (n, cuerpo) => { offs[n] = pos; add(`${n} 0 obj\n`); for (const c of [].concat(cuerpo)) add(c); add("\nendobj\n"); };
  add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const np = paginas.length, kids = paginas.map((_, i) => `${4 + i * 3} 0 R`).join(" ");
  const esc = (s) => String(s).replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, "?");
  obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${np} >>`);
  obj(3, `<< /Producer (Hereda+ escaner) /Title (${esc(titulo)}) >>`);
  paginas.forEach((p, i) => {
    const n = 4 + i * 3; const corto = 595.28; const k = corto / Math.min(p.w, p.h); const PW = +(p.w * k).toFixed(2), PH = +(p.h * k).toFixed(2);
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> /ProcSet [/PDF /ImageB /ImageC] >> /Contents ${n + 1} 0 R >>`);
    const cs = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`; obj(n + 1, [`<< /Length ${cs.length} >>\nstream\n`, cs, "\nendstream"]);
    obj(n + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /${p.gris ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, "\nendstream"]);
  });
  const xref = pos, total = 4 + np * 3;
  add(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let i = 1; i < total; i++) add(`${String(offs[i]).padStart(10, "0")} 00000 n \n`);
  add(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(pos); let o = 0; for (const b of partes) { out.set(b, o); o += b.length; } return out;
}
// ¿El JPEG tiene una sola componente (gris)? Marcador SOF: el byte de componentes
function scnJpegGris(b) { for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xff) return false; const m = b[i + 1]; if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return b[i + 9] === 1; i += 2 + ((b[i + 2] << 8) | b[i + 3]); } return false; }

// ───────────── Navegador: lienzos, fotos y procesado de una página ─────────────
function scnLienzo(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const scnCtx = (c) => c.getContext("2d", { willReadFrequently: true });
// Píxeles de una imagen, vídeo o lienzo, con el lado mayor limitado
function scnDatos(src, maxLado) {
  const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
  const k = Math.min(1, maxLado / Math.max(sw, sh)); const c = scnLienzo(sw * k, sh * k); const x = scnCtx(c);
  x.imageSmoothingQuality = "high"; // al reducir mucho (foto de 1920 px a 360), sin suavizado de calidad salen dientes de sierra que confunden los bordes
  x.drawImage(src, 0, 0, c.width, c.height); return { d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, c };
}
function scnACanvas(d, w, h) { const c = scnLienzo(w, h); const x = scnCtx(c); const im = x.createImageData(w, h); im.data.set(d); x.putImageData(im, 0, 0); return c; }
const scnJpeg = (c, q = 0.85) => new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", q));
// Esquinas normalizadas (0-1) ↔ píxeles
const scnNorm = (Q, w, h) => Q.map(([x, y]) => [x / (w - 1 || 1), y / (h - 1 || 1)]);
const scnPx = (Q, w, h) => Q.map(([x, y]) => [x * (w - 1), y * (h - 1)]);
const SCN_ENTERA = [[0, 0], [1, 0], [1, 1], [0, 1]];
// Detección sobre una imagen ya dibujada: devuelve esquinas normalizadas o null
// Se busca a 360 px (como en el bucle de la cámara: los umbrales del gradiente están pensados para esa escala) y, si se pide más, las esquinas
// se afinan sobre la imagen grande ajustando cada lado a su borde (scnAfinar)
function scnDetectarEn(src, maxLado = 640) {
  const D0 = scnDatos(src, Math.min(360, maxLado)); const r = scnDetectar(D0.d, D0.w, D0.h); if (!r || r.conf < 0.35) return null;
  let q = scnNorm(r.esquinas, D0.w, D0.h);
  if (maxLado > 400) { const D = scnDatos(src, maxLado); const f = scnAfinar(D.d, D.w, D.h, scnPx(q, D.w, D.h)); if (f) q = scnNorm(f, D.w, D.h); }
  return { q, conf: r.conf, area: r.area, borde: r.borde };
}
// Afinado de un cuadrilátero ya encontrado sobre una imagen mayor: cada lado se ajusta a su borde; se acepta si cuadra y no se ha ido lejos
function scnAfinar(rgba, w, h, Q) {
  const { L } = scnMapas(rgba, w, h); const Lb = scnCaja(L, w, h, 1), lum = scnMuestra(Lb, w, h);
  let s = 0; for (let i = 0; i < Lb.length; i += 7) s += Lb[i]; const um = Math.max(3, Math.min(8, s / Math.ceil(Lb.length / 7) * 0.05));
  const Qa = scnAjustar(lum, w, h, Q, Math.max(4, um)); if (!scnGeometriaOk(Qa, w, h)) return null;
  const lejos = Math.max(...Qa.map((p, k) => Math.hypot(p[0] - Q[k][0], p[1] - Q[k][1]))) > Math.hypot(w, h) * 0.02;
  return !lejos && scnPuntuar(lum, w, h, Qa, um).p >= 0.3 ? Qa : null;
}
// Giro automático: orientación del texto sobre una versión reducida y binarizada
function scnGiroAuto(d, w, h) {
  const red = lecReducir(scnLuma(d, w, h), w, h, 900); const b = lecUmbralAdaptativo(lecEstirar(red.g).g, red.w, red.h);
  const o = scnOrientacion(b, red.w, red.h); return o.giro && o.conf >= 0.5 ? o.giro : 0;
}
// Página: { orig: Blob, ow, oh, quad (normalizado), auto, giro (null = automático), modo } → { res: Blob (JPEG), rw, rh, mini (dataURL) }
async function scnProcesar(p) {
  const bmp = await createImageBitmap(p.orig); const D = scnDatos(bmp, 3200); if (bmp.close) bmp.close();
  // Las capturas de vídeo dejan el papel a unos 1.000 px: se amplía al enderezar (una sola interpolación) para que el texto se lea bien
  const Q = scnPx(p.quad || SCN_ENTERA, D.w, D.h); const [W, H] = scnTamSalida(Q, 2400, 1600, p.quad ? [D.w, D.h] : null);
  let d = scnEnderezar(D.d, D.w, D.h, Q, W, H), w = W, h = H;
  if (p.giro == null) p.giroAuto = scnGiroAuto(d, w, h);
  const g = p.giro != null ? p.giro : p.giroAuto || 0;
  if (g) { const r = scnGirar(d, w, h, g); d = r.d; w = r.w; h = r.h; }
  d = scnRealzar(d, w, h, p.modo || "documento");
  const c = scnACanvas(d, w, h); p.res = await scnJpeg(c, p.modo === "color" || p.modo === "original" ? 0.85 : 0.8); p.rw = w; p.rh = h;
  const k = 220 / Math.max(w, h), m = scnLienzo(w * k, h * k); scnCtx(m).drawImage(c, 0, 0, m.width, m.height); p.mini = m.toDataURL("image/jpeg", 0.7);
  return p;
}
// Una foto subida al lector (ya decodificada en un lienzo): si se ve el papel con fondo alrededor, se recorta y endereza; si es una doble
// página, se parte. Devuelve { paginas: [lienzo], aviso } (sin cambios si no hay un documento claro: un escaneo plano o una captura)
function scnPrepararFoto(c) {
  const det = scnDetectarEn(c, 640); const avisos = [];
  let out = c, pequena = false;
  if (det && det.area < 0.9 && det.conf >= 0.45) {
    const D = scnDatos(c, 3200); const Q = scnPx(det.q, D.w, D.h); const [W, H] = scnTamSalida(Q, 2600, 1700, [D.w, D.h]); // las fotos pequeñas se amplían al enderezarlas (una sola interpolación)
    const nat = scnTamSalida(Q, 1e9, 0, [D.w, D.h]); pequena = Math.min(...nat) < 900; // poca resolución: el realce engorda las letras y las líneas; se deja el contraste al lector
    let d = scnEnderezar(D.d, D.w, D.h, Q, W, H); d = scnRealzar(d, W, H, pequena ? "luz" : "documento"); out = scnACanvas(d, W, H);
    avisos.push("Se ha localizado el documento en la foto y se ha corregido la perspectiva antes de leerlo.");
  }
  // Doble página: se busca el lomo sobre una versión binarizada
  const red = lecReducir(scnLuma(scnCtx(out).getImageData(0, 0, out.width, out.height).data, out.width, out.height), out.width, out.height, 1000);
  const x = scnDoblePagina(lecUmbralAdaptativo(lecEstirar(red.g).g, red.w, red.h), red.w, red.h);
  if (x) {
    const X = Math.round(x * out.width / red.w); const a = scnLienzo(X, out.height), b = scnLienzo(out.width - X, out.height);
    scnCtx(a).drawImage(out, 0, 0); scnCtx(b).drawImage(out, -X, 0);
    avisos.push("La foto tiene dos páginas: se han separado y leído por orden.");
    return { paginas: [a, b], aviso: avisos.join(" "), pequena };
  }
  return { paginas: [out], aviso: avisos.join(" "), pequena };
}

// ───────────── Interfaz del escáner ─────────────
// Capa propia sobre la app (no pasa por render()): vista de cámara con el marco del documento, disparo automático o manual, bandeja de
// páginas y editor de esquinas. Sin cámara o sin permiso: fotos con <input capture>, con el mismo procesado.
const SCN = { abierto: false };
const SCN_MODOS = [["documento", "Documento"], ["color", "Color"], ["gris", "Gris"], ["bn", "Blanco y negro"], ["original", "Original"]];
const SCN_ESQ = ["superior izquierda", "superior derecha", "inferior derecha", "inferior izquierda"];
function scnBotonHTML(tramiteId) { return `<button type="button" class="btn sm gray scn-abrir" data-scn-abrir="${esc(tramiteId || "")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>Escanear con la cámara</button>`; }
const scnHayCamara = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && (window.isSecureContext !== false);
const scnDoc = () => SCN.docs[SCN.docs.length - 1];
const scnTotal = () => SCN.docs.reduce((s, d) => s + d.length, 0);
function scnAnunciar(t) { const n = SCN.el && SCN.el.querySelector(".scn-vivo"); if (n && n.textContent !== t) n.textContent = t; }

async function scnAbrir(o = {}) {
  if (SCN.abierto) return;
  Object.assign(SCN, { abierto: true, expId: o.expId || "", tramiteId: o.tramiteId || "", docs: [[]], vista: "camara", auto: true, modo: "documento", stream: null, quietos: 0, armado: true, ult: null, suave: null, quietoDesde: 0, perdidos: 0, editando: null, conf: false, volver: document.activeElement, urls: [], linterna: false, coste: 30, intervalo: 90 });
  const el = document.createElement("div"); el.className = "scn"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Escanear documentos");
  SCN.el = el; document.body.appendChild(el); document.documentElement.classList.add("scn-on");
  el.addEventListener("click", scnClic); el.addEventListener("change", scnCambio); document.addEventListener("keydown", scnTecla, true); // el teclado, aunque el foco se haya perdido
  SCN.alCambiarTam = () => { if (SCN.editando) scnAjustarLienzo(); }; window.addEventListener("resize", SCN.alCambiarTam);
  // La cámara se apaga en cuanto la app pasa a segundo plano (batería y privacidad) y se vuelve a encender al volver
  SCN.alOcultar = () => { if (!SCN.abierto) return; if (document.hidden) { if (SCN.stream) { scnParar(); SCN.pausada = true; } } else if (SCN.pausada) { SCN.pausada = false; if (SCN.vista === "camara" && !SCN.editando) scnCamara(); } };
  document.addEventListener("visibilitychange", SCN.alOcultar); window.addEventListener("pagehide", scnParar);
  el.addEventListener("pointerdown", scnArrastreIni); el.addEventListener("pointermove", scnArrastre); el.addEventListener("pointerup", scnArrastreFin); el.addEventListener("pointercancel", scnArrastreFin);
  scnPintar();
  if (scnHayCamara()) await scnCamara(); else { SCN.vista = "foto"; SCN.motivo = window.isSecureContext === false ? "La cámara solo funciona en una conexión segura (https)." : "Este navegador no da acceso a la cámara."; scnPintar(); }
}
// Plataforma, para explicar dónde se da el permiso de la cámara
function scnPlataforma() { const u = navigator.userAgent || ""; return /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(u) ? "android" : "escritorio"; }
function scnMotivo(e) {
  const n = e && e.name;
  if (n === "NotAllowedError" || n === "SecurityError") {
    const pl = scnPlataforma();
    return pl === "ios" ? "No hay permiso para usar la cámara. En el iPhone o el iPad: Ajustes › Safari › Cámara › Preguntar o Permitir (o, en la barra de la dirección, «aA» › Ajustes del sitio web › Cámara) y pulsa «Reintentar». Mientras tanto, puedes hacer la foto con la cámara."
      : pl === "android" ? "No hay permiso para usar la cámara. Toca el icono que hay junto a la dirección › Permisos › Cámara › Permitir y pulsa «Reintentar». Mientras tanto, puedes hacer la foto con la cámara."
      : "No hay permiso para usar la cámara. Puedes darlo en el icono del candado, junto a la dirección, y pulsar «Reintentar», o elegir fotos ya hechas.";
  }
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No se encuentra ninguna cámara en este equipo.";
  if (n === "NotReadableError" || n === "AbortError") return "La cámara la está usando otra aplicación (una videollamada o la propia cámara). Ciérrala y pulsa «Reintentar».";
  return "No se ha podido abrir la cámara.";
}
async function scnCamara() {
  try {
    const pedir = (video) => navigator.mediaDevices.getUserMedia({ audio: false, video });
    try { SCN.stream = await pedir({ facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1920 } }); }
    catch (e) { if (e && (e.name === "OverconstrainedError" || e.name === "NotReadableError")) SCN.stream = await pedir(true); else throw e; } // cámaras que no admiten la resolución pedida
    if (!SCN.abierto) { scnParar(); return; }
    SCN.vista = "camara"; SCN.motivo = ""; scnPintar();
    const v = SCN.el.querySelector("video"); v.srcObject = SCN.stream; await v.play().catch(() => {});
    const tr = SCN.stream.getVideoTracks()[0]; try { const cap = tr.getCapabilities ? tr.getCapabilities() : {}; SCN.hayLinterna = !!cap.torch; } catch (e) { SCN.hayLinterna = false; }
    scnPintar(true); SCN.t = 0; scnEnganchar(SCN.el.querySelector("video"));
  } catch (e) {
    SCN.vista = "foto"; SCN.motivo = scnMotivo(e); SCN.reintentar = true;
    scnPintar();
  }
}
function scnParar() { if (SCN.stream) for (const t of SCN.stream.getTracks()) t.stop(); SCN.stream = null; cancelAnimationFrame(SCN.raf); const v = SCN.el && SCN.el.querySelector("video"); if (v) { try { v.pause(); } catch (e) {} v.srcObject = null; } }
function scnCerrar() {
  scnParar(); SCN.abierto = false; for (const u of SCN.urls) URL.revokeObjectURL(u); SCN.urls = []; window.removeEventListener("resize", SCN.alCambiarTam); document.removeEventListener("keydown", scnTecla, true);
  document.removeEventListener("visibilitychange", SCN.alOcultar); window.removeEventListener("pagehide", scnParar);
  if (SCN.el) SCN.el.remove(); SCN.el = null; document.documentElement.classList.remove("scn-on");
  const v = SCN.volver; if (v && v.isConnected && v.focus) v.focus();
}
// Bucle de detección. Con requestVideoFrameCallback solo se trabaja cuando llega una imagen nueva de la cámara (si no lo hay,
// requestAnimationFrame). Se detecta a 360 px de lado mayor y como mucho unas 10 veces por segundo; si el móvil va justo, menos (el intervalo
// se adapta a lo que tarda cada detección: como mucho el 40 % del tiempo), para que la vista previa siga fluida.
function scnEnganchar(v) {
  if (!v || v._scn) return; v._scn = true;
  if (typeof v.requestVideoFrameCallback === "function") { const f = () => { if (!SCN.abierto || !v.isConnected) return; scnBucle(v); v.requestVideoFrameCallback(f); }; v.requestVideoFrameCallback(f); }
  else { const f = () => { if (!SCN.abierto || !v.isConnected) return; scnBucle(v); SCN.raf = requestAnimationFrame(f); }; SCN.raf = requestAnimationFrame(f); }
}
// Brillo medio (0-255) de la imagen reducida, por muestreo
function scnBrillo(d) { let s = 0, n = 0; for (let i = 0; i < d.length; i += 64) { s += d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29; n++; } return n ? s / n / 256 : 128; }
const SCN_QUIETO_MS = 750; // tiempo con el documento quieto antes del disparo automático
function scnBucle(v) {
  const ahora = performance.now();
  if (!v || SCN.vista !== "camara" || SCN.editando || v.readyState < 2 || !v.videoWidth || ahora - SCN.t < SCN.intervalo || SCN.disparando) return;
  const previa = SCN.t; SCN.t = ahora;
  const D = scnDatos(v, 360); const r = scnDetectar(D.d, D.w, D.h); const ok = r && r.conf >= 0.45 && r.area >= 0.05;
  const coste = performance.now() - ahora; SCN.coste = SCN.coste * 0.8 + coste * 0.2; SCN.intervalo = Math.max(90, Math.min(400, SCN.coste * 2.5));
  const q = ok ? scnNorm(r.esquinas, D.w, D.h) : null;
  const dist = (a, b) => Math.max(...a.map((p, k) => Math.hypot(p[0] - b[k][0], p[1] - b[k][1])));
  // Estabilidad: el documento lleva quieto (movimiento entre detecciones < 1,2 % de la imagen) desde SCN.quietoDesde; un fallo suelto de la
  // detección no la reinicia
  if (q) {
    const mov = SCN.ult ? dist(q, SCN.ult) : 1;
    if (mov < 0.012) { if (!SCN.quietoDesde) SCN.quietoDesde = previa || ahora; SCN.quietos++; } else { SCN.quietoDesde = 0; SCN.quietos = 0; } // quieto desde la detección anterior
    if (SCN.capturado && dist(q, SCN.capturado) > 0.09) SCN.armado = true;
    // Suavizado temporal del marco que se dibuja (sin retraso cuando el documento se mueve de verdad)
    SCN.suave = SCN.suave && dist(q, SCN.suave) < 0.05 ? SCN.suave.map((p, k) => [p[0] * 0.45 + q[k][0] * 0.55, p[1] * 0.45 + q[k][1] * 0.55]) : q;
  } else if (SCN.perdidos >= 1) { SCN.quietoDesde = 0; SCN.quietos = 0; }
  SCN.perdidos = q ? 0 : SCN.perdidos + 1; if (SCN.perdidos > 6) SCN.armado = true; // se retiró la página: el siguiente documento puede dispararse
  SCN.ult = q || (SCN.perdidos > 3 ? null : SCN.ult); if (!SCN.ult) SCN.suave = null;
  scnMarco(SCN.ult ? SCN.suave : null, v.videoWidth, v.videoHeight);
  // Guía: «acércate», «aléjate», «más luz»
  // El papel se sale de la imagen si dos esquinas o más tocan el borde (un lado cortado); con una sola, como mucho falta la punta: se dispara
  const borde = q && q.filter(([x, y]) => x < 0.012 || y < 0.012 || x > 0.988 || y > 0.988).length >= 2;
  // Tamaño suficiente: un 18 % de la imagen o, para una tarjeta (DNI) en un móvil en vertical, que ocupe el 60 % del ancho o del alto
  const grande = q && (r.area >= 0.18 || Math.max(Math.max(...q.map((p) => p[0])) - Math.min(...q.map((p) => p[0])), Math.max(...q.map((p) => p[1])) - Math.min(...q.map((p) => p[1]))) >= 0.6);
  const oscuro = scnBrillo(D.d) < 58;
  const estable = SCN.quietoDesde ? ahora - SCN.quietoDesde : 0;
  const listo = SCN.auto && SCN.armado && q && grande && !borde;
  const anillo = SCN.el.querySelector(".scn-disp"); if (anillo) anillo.style.setProperty("--p", listo ? Math.min(1, estable / SCN_QUIETO_MS) : 0);
  SCN.guia = !q ? (oscuro ? "luz" : "buscar") : borde ? "aleja" : !grande ? "acerca" : "ok";
  scnAnunciar(!q ? (oscuro ? `Hace falta más luz${SCN.hayLinterna ? ": enciende la linterna" : ": acércate a una ventana o enciende una lámpara"}` : "Busca el documento: colócalo sobre una superficie que contraste")
    : borde ? "Aléjate un poco: el documento se sale de la imagen" : !grande ? "Acércate un poco al documento"
    : !SCN.auto ? "Documento detectado. Pulsa el disparador" : !SCN.armado ? "Página capturada. Pasa a la siguiente" : estable < SCN_QUIETO_MS ? (oscuro ? "Poca luz. No te muevas…" : "Documento detectado. No te muevas…") : "Capturando");
  if (listo && estable >= SCN_QUIETO_MS && SCN.quietos >= 2) scnDisparar();
}
function scnMarco(q, vw, vh) {
  const pol = SCN.el && SCN.el.querySelector(".scn-marco polygon"); if (!pol) return;
  const svg = pol.ownerSVGElement; if (svg.getAttribute("viewBox") !== `0 0 ${vw} ${vh}`) svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
  if (!q) { pol.setAttribute("points", ""); svg.classList.remove("ok"); return; }
  pol.setAttribute("points", q.map(([x, y]) => `${(x * vw).toFixed(1)},${(y * vh).toFixed(1)}`).join(" ")); svg.classList.toggle("ok", SCN.guia === "ok" && SCN.quietos >= 2);
}
async function scnDisparar(manual) {
  const v = SCN.el && SCN.el.querySelector("video"); if (!v || !v.videoWidth || SCN.disparando) return;
  SCN.disparando = true;
  try {
    const c = scnLienzo(v.videoWidth, v.videoHeight); scnCtx(c).drawImage(v, 0, 0);
    // Disparo automático: se confirma en la imagen que se va a guardar que el documento sigue ahí y en su sitio (en un móvil lento pasan unos
    // cientos de milisegundos entre la última detección y el disparo: si se ha retirado o movido, no se guarda una foto de la mesa)
    const vis = SCN.suave || SCN.ult;
    const dif = (d, f) => d && vis ? f(...d.q.map((p, k) => Math.hypot(p[0] - vis[k][0], p[1] - vis[k][1]))) : 0;
    const det = scnDetectarEn(c, 720);
    const lejos = dif(det, Math.max) >= 0.06; // no coincide del todo con lo que se veía: se usan las esquinas que se veían
    const movido = det && vis && dif(det, (...a) => a.reduce((s, v) => s + v, 0) / a.length) >= 0.12; // otro sitio: el papel se ha movido
    if (!manual && (!det || movido)) { SCN.quietoDesde = 0; SCN.quietos = 0; return; }
    const fl = SCN.el.querySelector(".scn-flash"); if (fl) { fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on"); }
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
    // Esquinas: la detección a 720 px de la imagen capturada (más precisa) si coincide con lo que se veía; si no, lo que se veía (suavizado)
    const q = det && !lejos ? det.q : vis || (det ? det.q : null);
    // Si la cámara hace fotos con más resolución que el vídeo (Chrome en Android, ImageCapture), se usa la foto: el texto pequeño se lee mejor
    const foto = await scnFotoAlta(v);
    const df = foto && scnDetectarEn(foto, 720);
    if (df && df.area >= 0.12) await scnAnadir(foto, df.q); else await scnAnadir(c, q);
    SCN.capturado = q || SCN_ENTERA; SCN.armado = false; SCN.quietos = 0; SCN.quietoDesde = 0;
  } finally { SCN.disparando = false; }
}
// Foto a la resolución del sensor (ImageCapture.takePhoto) solo si gana al menos un 40 % de resolución al vídeo; con tiempo máximo y, ante
// cualquier fallo, nada (se usa la imagen del vídeo). Devuelve un lienzo o null
async function scnFotoAlta(v) {
  try {
    const tr = SCN.stream && SCN.stream.getVideoTracks()[0]; if (!tr || typeof ImageCapture !== "function" || SCN.sinFoto) return null;
    const tope = (ms) => new Promise((r) => setTimeout(() => r(null), ms));
    const ic = new ImageCapture(tr); const cap = await Promise.race([ic.getPhotoCapabilities(), tope(700)]);
    const max = cap && cap.imageWidth && cap.imageWidth.max; if (!max || max < Math.max(v.videoWidth, v.videoHeight) * 1.4) { SCN.sinFoto = true; return null; }
    const b = await Promise.race([ic.takePhoto({ imageWidth: Math.min(max, 4032) }), tope(3000)]); if (!b) return null;
    const img = await createImageBitmap(b); const D = scnDatos(img, 3200); if (img.close) img.close(); return D.c;
  } catch (e) { SCN.sinFoto = true; return null; }
}
// Nueva página a partir de un lienzo: se guarda el original (JPEG) y se procesa en segundo plano
async function scnAnadir(c, q) {
  const orig = await scnJpeg(c, 0.9);
  const p = { orig, ow: c.width, oh: c.height, quad: q || null, auto: q || null, giro: null, modo: SCN.modo, id: Math.random().toString(36).slice(2, 9) };
  scnDoc().push(p); p.proc = scnProcesar(p).catch((e) => { console.error(e); p.error = true; }).then(() => { if (SCN.abierto) scnPintarBandeja(); });
  scnPintarBandeja(); scnAnunciar(`Página ${scnDoc().length} capturada${q ? "" : " (sin bordes detectados: se guarda entera; puedes ajustar las esquinas)"}`);
}
// Fotos elegidas (galería, ordenador o la cámara del sistema)
async function scnFotos(files) {
  for (const f of files) {
    try {
      scnOcupado(`Preparando ${f.name}…`);
      const img = await lecImagen(f); const D = scnDatos(img, 3200); if (img.close) img.close();
      const det = scnDetectarEn(D.c, 720); await scnAnadir(D.c, det && det.area < 0.97 ? det.q : null);
    } catch (e) { console.error(e); scnAnunciar(`No se ha podido abrir ${f.name}`); }
  }
  scnOcupado("");
}
// Aviso «trabajando» sobre la vista, sin repintarla (el vídeo sigue)
function scnOcupado(t) {
  SCN.ocupado = t; if (!SCN.el) return; let o = SCN.el.querySelector(".scn-ocupado");
  if (!t) { if (o) o.remove(); return; }
  if (!o) { o = document.createElement("div"); o.className = "scn-ocupado"; o.setAttribute("role", "status"); SCN.el.appendChild(o); }
  o.innerHTML = `<span class="scn-spin" aria-hidden="true"></span>${esc(t)}`;
}
// ── Pintado ──
function scnPintar(conservarVideo) {
  const el = SCN.el; if (!el) return;
  const n = scnTotal(), nd = SCN.docs.filter((d) => d.length).length;
  const cab = `<header class="scn-cab"><button type="button" class="scn-x" data-scn="cerrar" aria-label="Cerrar el escáner"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><h2>${SCN.editando ? "Ajustar la página" : "Escanear documentos"}</h2><span class="scn-luz"></span><span class="scn-cuenta">${n ? (nd > 1 ? `${nd} documentos · ` : "") + plural(n, "página") : ""}</span></header>`;
  const conf = SCN.conf ? scnConfHTML() : "";
  if (SCN.editando) { el.innerHTML = cab + scnEditorHTML() + conf; scnAjustarLienzo(); scnFoco(); return; }
  if (SCN.vista === "camara" && conservarVideo && el.querySelector("video")) { scnPintarBandeja(); scnPintarControles(); return; }
  const fotoInputs = `<label class="btn scn-fbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Hacer una foto<input type="file" accept="image/*,.heic,.heif" capture="environment" data-scn-foto="1"></label><label class="btn gray scn-fbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>Elegir fotos<input type="file" accept="image/*,.heic,.heif" multiple data-scn-foto="1"></label>`;
  const escena = SCN.vista === "camara"
    ? `<div class="scn-esc"><video playsinline muted autoplay aria-label="Imagen de la cámara"></video><svg class="scn-marco" viewBox="0 0 16 9" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><polygon points=""/></svg><div class="scn-flash" aria-hidden="true"></div></div>`
    : `<div class="scn-esc scn-sin"><div class="scn-sin-in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>${SCN.vista === "foto" && SCN.stream === null && SCN.motivo ? (() => { const i = SCN.motivo.indexOf(". "); return i > 0 ? `<p><b>${esc(SCN.motivo.slice(0, i + 1))}</b></p><p class="scn-sub">${esc(SCN.motivo.slice(i + 2))}</p>` : `<p><b>${esc(SCN.motivo)}</b></p>`; })() : "<p><b>Abriendo la cámara…</b></p>"}${SCN.motivo && SCN.reintentar ? `<button type="button" class="btn gray sm scn-reint" data-scn="reintentar">Reintentar</button>` : ""}${SCN.motivo ? `<p class="scn-sub">Haz una foto de cada página, de frente y con buena luz, o elige fotos ya hechas (también HEIC del iPhone). Se localiza el papel, se endereza y se deja como un escaneo.</p><div class="scn-facts">${fotoInputs}</div>` : ""}</div></div>`;
  el.innerHTML = `${cab}${escena}<div class="scn-pie"><div class="scn-bandeja" role="list" aria-label="Páginas escaneadas"></div><div class="scn-ctrl"></div></div><p class="scn-vivo" aria-live="polite"></p>${conf}`;
  scnPintarBandeja(); scnPintarControles(); scnOcupado(SCN.ocupado); scnFoco();
}
const scnConfHTML = () => `<div class="scn-conf" role="alertdialog" aria-modal="true" aria-label="Descartar lo escaneado"><p><b>¿Descartar ${plural(scnTotal(), "página escaneada", "páginas escaneadas")}?</b> Todavía no se ha guardado nada.</p><span><button type="button" class="btn sm gray" data-scn="seguir">Seguir escaneando</button><button type="button" class="btn sm danger-solid" data-scn="descartar">Descartar</button></span></div>`;
function scnPintarControles() {
  const c = SCN.el && SCN.el.querySelector(".scn-ctrl"); if (!c) return; const n = scnTotal();
  const cam = SCN.vista === "camara";
  c.innerHTML = `<div class="scn-izq">${cam ? `<label class="scn-ic" title="Elegir fotos"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg><span>Fotos</span><input type="file" accept="image/*,.heic,.heif" multiple data-scn-foto="1" aria-label="Elegir fotos"></label><button type="button" class="scn-ic" data-scn="auto" aria-pressed="${SCN.auto}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/></svg><span>${SCN.auto ? "Automático" : "Manual"}</span></button>` : ""}</div>
    ${cam ? `<button type="button" class="scn-disp" data-scn="disparar" aria-label="Capturar la página"><span></span></button>` : `<span></span>`}
    <div class="scn-der"><button type="button" class="btn scn-fin" data-scn="terminar" ${n ? "" : "disabled"} aria-label="${n ? `Guardar ${plural(n, "página")} y leerlas` : "Guardar (todavía no hay páginas)"}">Guardar${n ? ` <b class="scn-n">${n}</b>` : ""}</button></div>`;
}
function scnPintarBandeja() {
  const b = SCN.el && SCN.el.querySelector(".scn-bandeja"); if (!b) return;
  // Linterna (si la cámara la tiene) en la cabecera: en la barra de abajo, a 390 px, no cabe todo al alcance del pulgar
  const luz = SCN.el.querySelector(".scn-luz"); if (luz) luz.innerHTML = SCN.vista === "camara" && SCN.hayLinterna ? `<button type="button" class="scn-x scn-lint" data-scn="linterna" aria-pressed="${!!SCN.linterna}" aria-label="Linterna"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 6H9zM9 9l1 12h4l1-12"/></svg></button>` : "";
  let k = 0;
  b.innerHTML = SCN.docs.map((D, di) => (di && D.length ? `<span class="scn-sep" role="presentation">Doc. ${di + 1}</span>` : "") + D.map((p, i) => { k++; return `<button type="button" role="listitem" class="scn-mini${p.res ? "" : " cargando"}" data-scn-ed="${di}:${i}" aria-label="Página ${i + 1}${SCN.docs.length > 1 ? " del documento " + (di + 1) : ""}: ajustar, girar o borrar">${p.mini ? `<img src="${p.mini}" alt="">` : `<span class="scn-spin" aria-hidden="true"></span>`}<b>${i + 1}</b></button>`; }).join("")).join("")
    // «Otro documento», al final de las miniaturas: las páginas que se capturen después irán en un PDF aparte
    + (scnDoc().length ? `<button type="button" role="listitem" class="scn-mini scn-nuevo" data-scn="nuevo" title="Las páginas siguientes forman otro documento" aria-label="Otro documento: las páginas siguientes van en un PDF aparte"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M12 11v6M9 14h6"/></svg><span>Otro doc.</span></button>` : "");
  const cu = SCN.el.querySelector(".scn-cuenta"); const n = scnTotal(), nd = SCN.docs.filter((d) => d.length).length; if (cu) cu.textContent = n ? (nd > 1 ? `${nd} documentos · ` : "") + plural(n, "página") : "";
  scnPintarControles();
}
function scnFoco() { if (!SCN.el) return; if (SCN.conf) { const b = SCN.el.querySelector('[data-scn="seguir"]'); if (b) b.focus(); return; } if (!SCN.el.contains(document.activeElement)) { const b = SCN.el.querySelector(SCN.editando ? ".scn-h" : '.scn-disp, .scn-fbtn input, [data-scn="cerrar"]'); if (b) (b.tagName === "INPUT" ? b.parentElement : b).focus?.(); } }
// ── Editor de una página: esquinas arrastrables (ratón, dedo o flechas del teclado), giro, modo, orden y borrado ──
function scnEditorHTML() {
  const [di, i] = SCN.editando; const p = SCN.docs[di][i]; if (!p) return "";
  if (!p.url) { p.url = URL.createObjectURL(p.orig); SCN.urls.push(p.url); }
  const q = p.quad || SCN_ENTERA; const ver = SCN.verRes && p.res;
  if (ver && !p.urlRes) { p.urlRes = URL.createObjectURL(p.res); SCN.urls.push(p.urlRes); }
  const D = SCN.docs[di];
  return `<div class="scn-ed"><div class="scn-lienzo">${ver ? `<img src="${p.urlRes}" alt="Resultado de la página ${i + 1}">` : `<img src="${p.url}" alt="Foto original de la página ${i + 1}"><svg class="scn-poli" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><polygon points="${q.map(([x, y]) => `${x * 1000},${y * 1000}`).join(" ")}"/></svg>${q.map(([x, y], k) => `<button type="button" class="scn-h" data-scn-h="${k}" style="left:${x * 100}%;top:${y * 100}%" aria-label="Esquina ${SCN_ESQ[k]}. Muévela con las flechas; con Mayúsculas, más deprisa"></button>`).join("")}<div class="scn-lupa" aria-hidden="true"></div>`}</div></div>
  <div class="scn-edbar">
    <div class="scn-seg" role="group" aria-label="Ver"><button type="button" data-scn="verEsq" aria-pressed="${!ver}">Esquinas</button><button type="button" data-scn="verRes" aria-pressed="${!!ver}" ${p.res ? "" : "disabled"}>Resultado</button></div>
    <label class="scn-sel"><span>Acabado</span><select data-scn-modo="1">${SCN_MODOS.map(([k, t]) => `<option value="${k}" ${p.modo === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <button type="button" class="scn-ic" data-scn="girar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg><span>Girar</span></button>
    <button type="button" class="scn-ic" data-scn="detectar" ${p.auto ? "" : "disabled"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/></svg><span>Detectado</span></button>
    <button type="button" class="scn-ic" data-scn="entera"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1"/></svg><span>Página entera</span></button>
    <button type="button" class="scn-ic" data-scn="izq" ${i ? "" : "disabled"} aria-label="Mover la página antes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>Antes</span></button>
    <button type="button" class="scn-ic" data-scn="der" ${i < D.length - 1 ? "" : "disabled"} aria-label="Mover la página después"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><span>Después</span></button>
    <button type="button" class="scn-ic peligro" data-scn="borrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg><span>Borrar</span></button>
    <button type="button" class="btn scn-fin" data-scn="hecho">Hecho</button>
  </div><p class="scn-vivo" aria-live="polite"></p>`;
}
// La foto del editor, tan grande como quepa (ancho y alto) sin deformarla: las esquinas se colocan en porcentaje sobre ella
function scnAjustarLienzo() {
  const ed = SCN.el && SCN.el.querySelector(".scn-ed"), l = ed && ed.querySelector(".scn-lienzo"), p = scnPagina(); if (!l || !p) return;
  const ar = SCN.verRes && p.res ? p.rw / p.rh : p.ow / p.oh; const cs = getComputedStyle(ed);
  const W = ed.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), H = ed.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let w = W, h = W / ar; if (h > H) { h = H; w = H * ar; } l.style.width = Math.max(40, Math.floor(w)) + "px"; l.style.height = Math.max(40, Math.floor(h)) + "px";
}
function scnPagina() { const e = SCN.editando; return e ? SCN.docs[e[0]][e[1]] : null; }
function scnReprocesar(p) { p.res = null; p.urlRes = null; p.proc = scnProcesar(p).catch((e) => { console.error(e); }).then(() => { if (SCN.abierto && !SCN.editando) scnPintarBandeja(); else if (SCN.abierto && SCN.verRes) scnPintar(); }); }
function scnMoverEsquina(k, x, y) {
  const p = scnPagina(); if (!p) return; const q = (p.quad || SCN_ENTERA).map((v) => v.slice()); q[k] = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  if (!scnConvexo(q)) return; p.quad = q; p.cambiado = true;
  const l = SCN.el.querySelector(".scn-lienzo"); const h = l.querySelector(`[data-scn-h="${k}"]`); if (h) { h.style.left = q[k][0] * 100 + "%"; h.style.top = q[k][1] * 100 + "%"; }
  const pol = l.querySelector("polygon"); if (pol) pol.setAttribute("points", q.map(([a, b]) => `${a * 1000},${b * 1000}`).join(" "));
}
function scnArrastreIni(e) { const h = e.target.closest && e.target.closest(".scn-h"); if (!h) return; e.preventDefault(); h.setPointerCapture(e.pointerId); SCN.arr = { k: Number(h.dataset.scnH), id: e.pointerId }; h.focus(); h.classList.add("on"); }
function scnArrastre(e) {
  if (!SCN.arr || e.pointerId !== SCN.arr.id) return;
  const l = SCN.el.querySelector(".scn-lienzo"); const r = l.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  scnMoverEsquina(SCN.arr.k, x, y);
  // Lupa: la zona de la esquina ampliada, por encima del dedo
  const lupa = l.querySelector(".scn-lupa"), img = l.querySelector("img"); if (lupa && img) { lupa.style.display = "block"; lupa.style.left = x * 100 + "%"; lupa.style.top = y * 100 + "%"; lupa.style.backgroundImage = `url("${img.src}")`; lupa.style.backgroundSize = `${r.width * 3}px ${r.height * 3}px`; lupa.style.backgroundPosition = `${-(x * r.width * 3) + 45}px ${-(y * r.height * 3) + 45}px`; }
}
function scnArrastreFin(e) { if (!SCN.arr || e.pointerId !== SCN.arr.id) return; SCN.arr = null; const l = SCN.el.querySelector(".scn-lienzo"); if (l) { const lupa = l.querySelector(".scn-lupa"); if (lupa) lupa.style.display = "none"; l.querySelectorAll(".scn-h.on").forEach((h) => h.classList.remove("on")); } }
function scnTecla(e) {
  if (!SCN.abierto || !SCN.el) return;
  if (e.target && e.target.closest && e.target.closest(".lec-clave")) return;
  if (!SCN.el.contains(e.target) && e.key !== "Escape" && e.key !== "Tab") return;
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (SCN.conf) { SCN.conf = false; scnPintar(true); } else if (SCN.editando) scnAccion("hecho"); else scnAccion("cerrar"); return; }
  const h = e.target.closest && e.target.closest(".scn-h");
  if (h && /^Arrow/.test(e.key)) { e.preventDefault(); const k = Number(h.dataset.scnH), p = scnPagina(); const d = e.shiftKey ? 0.03 : 0.004; const [x, y] = (p.quad || SCN_ENTERA)[k]; scnMoverEsquina(k, x + (e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0), y + (e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0)); return; }
  if (e.key === "Tab" && SCN.el) { const F = [...SCN.el.querySelectorAll('button:not([disabled]), select, input[type=file], [tabindex="0"]')].filter((n) => n.offsetParent !== null || n.type === "file"); const vis = F.map((n) => (n.type === "file" ? n.parentElement : n)).filter((n) => n && n.offsetParent !== null); if (!vis.length) return; const a = vis.indexOf(document.activeElement); if (e.shiftKey && a <= 0) { e.preventDefault(); vis[vis.length - 1].focus(); } else if (!e.shiftKey && a === vis.length - 1) { e.preventDefault(); vis[0].focus(); } }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("label.scn-ic, label.scn-fbtn")) { e.preventDefault(); const i = e.target.querySelector("input"); if (i) i.click(); }
}
function scnCambio(e) {
  const t = e.target;
  if (t.dataset.scnFoto && t.files && t.files.length) { const F = [...t.files]; t.value = ""; scnFotos(F); return; }
  if (t.dataset.scnModo) { const p = scnPagina(); if (p) { p.modo = t.value; SCN.modo = t.value; scnReprocesar(p); scnAnunciar(`Acabado: ${SCN_MODOS.find((m) => m[0] === t.value)[1]}`); } }
}
function scnClic(e) {
  const b = e.target.closest("[data-scn], [data-scn-ed]"); if (!b || b.disabled) return;
  if (b.dataset.scnEd) { const [di, i] = b.dataset.scnEd.split(":").map(Number); SCN.editando = [di, i]; SCN.verRes = false; scnPintar(); return; }
  scnAccion(b.dataset.scn);
}
async function scnAccion(a) {
  const p = scnPagina();
  if (a === "cerrar") { if (!scnTotal()) { scnCerrar(); return; } SCN.conf = true; if (!SCN.el.querySelector(".scn-conf")) SCN.el.insertAdjacentHTML("beforeend", scnConfHTML()); scnFoco(); return; }
  if (a === "seguir") { SCN.conf = false; const cf = SCN.el.querySelector(".scn-conf"); if (cf) cf.remove(); scnFoco(); return; }
  if (a === "descartar") { scnCerrar(); return; }
  if (a === "disparar") { scnDisparar(true); return; }
  if (a === "reintentar") { SCN.motivo = ""; SCN.vista = "camara"; scnPintar(); await scnCamara(); return; }
  if (a === "auto") { SCN.auto = !SCN.auto; SCN.armado = true; scnPintarControles(); scnAnunciar(SCN.auto ? "Disparo automático activado" : "Disparo manual"); return; }
  if (a === "linterna") { SCN.linterna = !SCN.linterna; try { await SCN.stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: SCN.linterna }] }); } catch (e) { SCN.linterna = false; } scnPintarBandeja(); return; }
  if (a === "nuevo") { if (scnDoc().length) SCN.docs.push([]); scnPintarBandeja(); scnAnunciar(`Documento ${SCN.docs.length}: las páginas siguientes van en un documento nuevo`); return; }
  if (a === "terminar") { scnTerminar(); return; }
  if (!p) return;
  const [di, i] = SCN.editando; const D = SCN.docs[di];
  if (a === "verEsq" || a === "verRes") { SCN.verRes = a === "verRes"; scnPintar(); return; }
  if (a === "girar") { p.giro = (((p.giro != null ? p.giro : p.giroAuto || 0) + 90) % 360); scnReprocesar(p); scnAnunciar(`Girada ${p.giro} grados`); if (SCN.verRes) { SCN.verRes = false; scnPintar(); } return; }
  if (a === "detectar") { p.quad = p.auto; p.cambiado = true; scnPintar(); return; }
  if (a === "entera") { p.quad = null; p.cambiado = true; scnPintar(); return; }
  if (a === "izq" || a === "der") { const j = a === "izq" ? i - 1 : i + 1; [D[i], D[j]] = [D[j], D[i]]; SCN.editando = [di, j]; scnPintar(); scnAnunciar(`Ahora es la página ${j + 1}`); return; }
  if (a === "borrar") { D.splice(i, 1); if (!D.length && SCN.docs.length > 1) SCN.docs.splice(di, 1); SCN.editando = null; scnVolverCamara(); scnAnunciar("Página borrada"); return; }
  if (a === "hecho") { if (p.cambiado) { p.cambiado = false; scnReprocesar(p); } SCN.editando = null; scnVolverCamara(); return; }
}
async function scnVolverCamara() {
  scnPintar();
  if (SCN.vista === "camara" && SCN.stream) { const v = SCN.el.querySelector("video"); if (v && !v.srcObject) { v.srcObject = SCN.stream; await v.play().catch(() => {}); } scnEnganchar(v); }
}
// ── Terminar: un PDF por documento, que se archiva y se lee ──
async function scnTerminar() {
  const docs = SCN.docs.filter((d) => d.length); if (!docs.length) return;
  SCN.editando = null; scnParar(); SCN.vista = "fin"; SCN.ocupado = "Preparando el PDF…"; scnPintar();
  const ahora = new Date(); const sello = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")} ${String(ahora.getHours()).padStart(2, "0")}.${String(ahora.getMinutes()).padStart(2, "0")}`;
  const files = [];
  for (let k = 0; k < docs.length; k++) {
    const P = docs[k]; for (const p of P) { await p.proc; if (!p.res) await scnProcesar(p); }
    const pags = []; for (const p of P) { const b = new Uint8Array(await p.res.arrayBuffer()); pags.push({ jpeg: b, w: p.rw, h: p.rh, gris: scnJpegGris(b) }); }
    const nombre = `Escaneo ${sello}${docs.length > 1 ? ` (${k + 1})` : ""}.pdf`;
    const f = new File([scnPdf(pags, nombre.replace(/\.pdf$/, ""))], nombre, { type: "application/pdf", lastModified: Date.now() });
    try { Object.defineProperty(f, "_scn", { value: { paginas: P.map((p) => p.res) }, enumerable: false }); } catch (e) {}
    files.push(f);
  }
  const { expId, tramiteId } = SCN; scnCerrar();
  if (expId) archivoGuardar(files, expId, tramiteId || "");
  else if (typeof lecNuevoDesdeArchivos === "function") lecNuevoDesdeArchivos(files);
}
// Apertura desde cualquier botón [data-scn-abrir] de la app (portada «Desde documentos» o Documentos del expediente)
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("click", (e) => {
  const b = e.target && e.target.closest && e.target.closest("[data-scn-abrir]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const x = typeof ui !== "undefined" && ui.vista === "exp" && typeof exp === "function" ? exp() : null;
  if (!x && typeof licPuedeCrear === "function" && !licPuedeCrear()) { toast(licMotivoBloqueo()); return; }
  scnAbrir({ expId: x ? x.id : "", tramiteId: b.dataset.scnAbrir || "" });
}, true);
