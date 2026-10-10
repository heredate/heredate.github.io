// ───────────────────── PDF sin dependencias ─────────────────────
// PDF 1.4 síncrono con las 14 fuentes estándar (Times para el cuerpo, Helvetica para
// membrete, cabeceras y notas) y WinAnsiEncoding. API:
//   pdfDocumento({ titulo, subtitulo, despacho: { nombre, colegio, localidad, responsable }, ref, fecha, texto, bloques?, marcaAgua? }) -> Uint8Array
//   pdfDescargar(nombreArchivo, bytes)
// `texto` es el texto plano que genera docTexto(); `bloques` (opcional) añade contenido estructurado:
//   { tipo: "h"|"p"|"lista"|"tabla"|"nota"|"fila"|"firma"|"texto", texto, items, numerada, cabecera, filas, etiqueta, valor, negrita, nombres }
// Anchos AFM de WinAnsi 32..255, dos cifras en base 36 por glifo.
const PDF_AFM = {
  TR: "6y99bcdwdwn5lm509999dwfo6y996y7qdwdwdwdwdwdwdwdwdwdw7q7qfofofoccplk2ijijk2gzfgk2k299atk2gzopk2k2fgk2ijfggzk2k2q8k2k2gz997q99d1dw99ccdwccdwcc99dwdw7q7qdw7qlmdwdwdwdw99at7qdwdwk2dwdwccdc5kdcf16ydw6y99dwccrsdwdw99rsfg99op6ygz6y6y9999cccc9qdwrs99r8at99k26ycck26y99dwdwdwdw5kdw99l47odwfo99l499b4fo8c8c99dwcl6y998c8mdwkukukucck2k2k2k2k2k2opijgzgzgzgz99999999k2k2k2k2k2k2k2fok2k2k2k2k2k2fgdwccccccccccccijcccccccccc7q7q7q7qdwdwdwdwdwdwdwfodwdwdwdwdwdwdwdw",
  TB: "6y99ffdwdwrsn57q9999dwfu6y996y7qdwdwdwdwdwdwdwdwdwdw9999fufufudwpuk2ijk2k2ijgzlmlmatdwlmijq8k2lmgzlmk2fgijk2k2rsk2k2ij997q99g5dw99dwfgccfgcc99dwfg7q99fg7qn5fgdwfgfgccat99fgdwk2dwdwccay64ayeg6ydw6y99dwdwrsdwdw99rsfg99rs6yij6y6y9999dwdw9qdwrs99rsat99k26ycck26y99dwdwdwdw64dw99kr8cdwfu99kr99b4fu8c8c99fgf06y998c96dwkukukudwk2k2k2k2k2k2rsk2ijijijijatatatatk2k2lmlmlmlmlmfulmk2k2k2k2k2gzfgdwdwdwdwdwdwk2cccccccccc7q7q7q7qdwfgdwdwdwdwdwfudwfgfgfgfgdwfgdw",
  TI: "6y99bodwdwn5lm5y9999dwir6y996y7qdwdwdwdwdwdwdwdwdwdw9999iririrdwpkgzgzijk2gzgzk2k299ccijfgn5ijk2gzk2gzdwfgk2gzn5gzfgfgat7qatbqdw99dwdwccdwcc7qdwdw7q7qcc7qk2dwdwdwdwatat7qdwccijccccatb47nb4f16ydw6y99dwfgopdwdw99rsdw99q86yfg6y6y9999fgfg9qdwop99r8at99ij6yatfg6yatdwdwdwdw7ndw99l47odwir99l499b4ir8c8c99dwej6y998c8mdwkukukudwgzgzgzgzgzgzopijgzgzgzgz99999999k2ijk2k2k2k2k2irk2k2k2k2k2fggzdwdwdwdwdwdwdwijcccccccccc7q7q7q7qdwdwdwdwdwdwdwirdwdwdwdwdwccdwcc",
  H: "7q7q9vfgfgopij5b9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg7q7qg8g8g8fgs7ijijk2k2ijgzlmk27qdwijfgn5k2lmijlmk2ijgzk2ijq8ijijgz7q7q7qd1fg99fgfgdwfgfg7qfgfg6666dw66n5fgfgfgfg99dw7qfgdwk2dwdwdw9a789ag87qfg7q66fg99rsfgfg99rsij99rs7qgz7q7q666699999qfgrs99rsdw99q87qdwij7q99fgfgfgfg78fg99khaafgg899kh99b4g8999999fgex7q9999a5fgn6n6n6gzijijijijijijrsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgzfgfgfgfgfgfgopdwfgfgfgfg7q7q7q7qfgfgfgfgfgfgfgg8gzfgfgfgfgdwfgdw",
  HB: "7q99d6fgfgopk26m9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg9999g8g8g8gzr3k2k2k2k2ijgzlmk27qfgk2gzn5k2lmijlmk2ijgzk2ijq8ijijgz997q99g8fg99fggzfggzfg99gzgz7q7qfg7qopgzgzgzgzatfg99gzfglmfgfgdwat7satg87qfg7q7qfgdwrsfgfg99rsij99rs7qgz7q7q7q7qdwdw9qfgrs99rsfg99q87qdwij7q99fgfgfgfg7sfg99khaafgg899kh99b4g8999999gzfg7q9999a5fgn6n6n6gzk2k2k2k2k2k2rsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgzfgfgfgfgfgfgopfgfgfgfgfg7q7q7q7qgzgzgzgzgzgzgzg8gzgzgzgzgzfggzfg",
};
const PDF_F = { TR: "F1", TB: "F2", TI: "F3", H: "F4", HB: "F5" };
const PDF_FN = { F1: "Times-Roman", F2: "Times-Bold", F3: "Times-Italic", F4: "Helvetica", F5: "Helvetica-Bold" };
const PDF_AW = {};
const PDF_CP = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };
const PDF_SUST = { "−": "–", "‐": "-", "‑": "-", "‒": "–", "―": "—", "′": "'", "″": "\"", "‚": ",", "→": "->", "←": "<-", "⇒": "=>", "↔": "<->", "≥": ">=", "≤": "<=", "≠": "!=", "≈": "~", "✓": "v", "✔": "v", "✗": "x", "✘": "x", "⚠": "!", "★": "*", "☐": "[ ]", "☑": "[x]", "▪": "•", "◦": "•", "●": "•", "∙": "·", "⟦": "[", "⟧": "]", "〈": "<", "〉": ">", "\u202F": "\u00A0", "\u2007": "\u00A0", "\u2009": " ", "\u2002": " ", "\u2003": " ", "\u200B": "", "\u200D": "", "\uFEFF": "", "\t": "    ", "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "ı": "i", "ﬁ": "fi", "ﬂ": "fl", "ˮ": "\"", "ʼ": "’" };
const PDF_A4 = [595.28, 841.89];
// Paleta «notarial» (v10): tinta azul-negra #121C2A, azul notarial #0F2B4C para membrete y cabeceras, petróleo #1F6E6B solo en el filete fino
// del membrete, gris pizarra #5C6470, líneas #CFCAC0, huecos por rellenar en ámbar tostado #875A1A y nota de revisión en marfil cálido
const PDF_C = { tinta: [0.071, 0.11, 0.165], marca: [0.059, 0.169, 0.298], acento: [0.122, 0.431, 0.42], gris: [0.361, 0.392, 0.439], linea: [0.81, 0.792, 0.753], ambar: [0.529, 0.353, 0.102], notaT: [0.24, 0.18, 0.09], notaF: [0.973, 0.953, 0.906], notaB: [0.69, 0.53, 0.24], tabla: [0.918, 0.929, 0.945], agua: [0.918, 0.922, 0.93] };
const PDF_S = 11, PDF_LH = 15.4;
const PDF_PROD = "{{MARCA}}".indexOf("{{") ? "{{MARCA}}" : "Hereda+";
const PDF_ORD = /^((?:(?:Primer|Segund|Tercer|Cuart|Quint|Sext|Séptim|Octav|Noven|Décim)[oa]|(?:PRIMER|SEGUND|TERCER|CUART|QUINT|SEXT|SÉPTIM|OCTAV|NOVEN|DÉCIM)[OA]|[IVX]{1,5})\.)(?= |$)/;

// Unicode -> cadena binaria WinAnsi (un carácter por byte)
function pdfCod(s) {
  let o = "";
  for (const ch of String(s == null ? "" : s)) {
    const c = ch.codePointAt(0);
    if ((c > 31 && c < 127) || (c > 159 && c < 256)) o += ch;
    else if (PDF_CP[c]) o += String.fromCharCode(PDF_CP[c]);
    else if (ch in PDF_SUST) o += pdfCod(PDF_SUST[ch]);
    else if (c > 159) { const b = ch.normalize("NFD")[0]; o += b !== ch && b.codePointAt(0) < 256 ? pdfCod(b) : "?"; }
  }
  return o;
}
function pdfAnchos(f) { return PDF_AW[f] || (PDF_AW[f] = Array.from({ length: 224 }, (_, i) => parseInt(PDF_AFM[f].substr(2 * i, 2), 36))); }
function pdfMide(b, f, s, tc) { const a = pdfAnchos(f); let w = 0; for (let i = 0; i < b.length; i++) w += a[b.charCodeAt(i) - 32] || 0; return w * s / 1000 + (tc || 0) * b.length; }
const pdfN = (n) => String(Math.round(n * 100) / 100);
const pdfEsc = (b) => "(" + b.replace(/[\\()]/g, "\\$&") + ")";
const pdfRGB = (c, st) => c.map(pdfN).join(" ") + (st ? " RG" : " rg");
const pdfRect = (x, y, w, h, c) => `${pdfRGB(c)} ${pdfN(x)} ${pdfN(y)} ${pdfN(w)} ${pdfN(h)} re f`;
const pdfRaya = (x1, y1, x2, y2, c, w) => `${pdfRGB(c, 1)} ${pdfN(w)} w ${pdfN(x1)} ${pdfN(y1)} m ${pdfN(x2)} ${pdfN(y2)} l S`;
const pdfBase = (y, lh, s) => y - lh / 2 - s * 0.3;
const pdfNbsp = (t) => String(t).replace(/(\d) (€|%)/g, "$1\u00A0$2").replace(/\b(arts?|núm|nº|n\.º)\. ?(\d)/g, "$1.\u00A0$2").replace(/\b(D\.|D\.ª|D\.\/D\.ª) /g, "$1\u00A0").replace(/ (\d{1,2}\.) (?=\p{Lu})/gu, " $1\u00A0");
// K1: textos de cabecera y pie que no caben (nombres de despacho muy largos) se recortan con «…» o se parten en líneas, sin pisar lo de al lado
function pdfRecorta(t, f, s, w, tc) {
  t = String(t || ""); if (pdfMide(pdfCod(t), f, s, tc) <= w) return t;
  let a = 0, b = t.length; while (a < b) { const m = (a + b + 1) >> 1; if (pdfMide(pdfCod(t.slice(0, m).trimEnd() + "…"), f, s, tc) <= w) a = m; else b = m - 1; }
  return t.slice(0, a).trimEnd() + "…";
}
function pdfPartirEn(t, f, s, w, n) {
  const L = []; let cur = "";
  for (const p of String(t || "").split(/\s+/).filter(Boolean)) { const c = cur ? cur + " " + p : p; if (!cur || pdfMide(pdfCod(c), f, s) <= w) cur = c; else { L.push(cur); cur = p; } }
  if (cur) L.push(cur);
  if (L.length > n) { L[n - 1] = L.slice(n - 1).join(" "); L.length = n; }
  return L.map((l) => pdfRecorta(l, f, s, w));
}
// Texto de una sola línea; al: "l" | "r" (x es el borde derecho) | "c" (x es el centro)
function pdfT(x, y, t, f, s, c, tc, al) {
  const b = pdfCod(t), w = pdfMide(b, f, s, tc) - (tc || 0);
  if (al === "r") x -= w; else if (al === "c") x -= w / 2;
  return `BT ${pdfRGB(c || PDF_C.tinta)} /${PDF_F[f]} ${pdfN(s)} Tf ${tc ? pdfN(tc) + " Tc " : ""}${pdfN(x)} ${pdfN(y)} Td ${pdfEsc(b)} Tj${tc ? " 0 Tc" : ""} ET`;
}

// ── Texto enriquecido: trozos {t, f, c} -> palabras -> líneas ──
function pdfRuns(t, f, nb, fb, c) {
  t = pdfNbsp(t); f = f || "TR"; c = c || PDF_C.tinta; const R = [];
  const trozo = (s, ff) => s.split(/(\[[^\]]*\])/).forEach((p, i) => { if (p) R.push({ t: p, f: ff, c: i % 2 ? PDF_C.ambar : c }); });
  trozo(t.slice(0, nb || 0), fb || "TB"); trozo(t.slice(nb || 0), f);
  return R;
}
function pdfPalabras(runs) {
  const P = []; let cur = null;
  for (const r of runs) pdfCod(r.t).split(" ").forEach((p, i) => {
    if (i > 0 || !cur) { if (cur && cur.length) P.push(cur); cur = []; }
    if (p) cur.push({ b: p, f: r.f, c: r.c });
  });
  if (cur && cur.length) P.push(cur);
  return P;
}
function pdfParte(words, maxW, s) {
  const L = []; let line = [], lw = 0;
  const wOf = (wd) => wd.reduce((a, g) => a + pdfMide(g.b, g.f, s), 0);
  const cierra = () => { if (line.length) L.push(pdfUne(line, lw)); line = []; lw = 0; };
  for (let wd of words) {
    let ww = wOf(wd);
    maxW = Math.max(maxW, 12); // nunca un ancho nulo o negativo: el corte por caracteres no terminaría (P10)
    while (ww > maxW && wd.length) { // palabra más larga que la línea: se corta por caracteres
      cierra(); const pz = []; let acc = 0, rest = [];
      for (const g of wd) {
        if (rest.length) { rest.push(g); continue; }
        let k = 0; while (k < g.b.length && acc + pdfMide(g.b.slice(0, k + 1), g.f, s) <= maxW) k++;
        if (k === g.b.length) { pz.push(g); acc += pdfMide(g.b, g.f, s); continue; }
        if (!k && !pz.length) k = 1;
        if (k) pz.push({ ...g, b: g.b.slice(0, k) });
        rest.push({ ...g, b: g.b.slice(k) });
      }
      line = [pz]; lw = wOf(pz); cierra(); wd = rest.filter((g) => g.b); ww = wOf(wd);
    }
    if (!wd.length) continue;
    const sp = line.length ? pdfMide(" ", line[line.length - 1].slice(-1)[0].f, s) : 0;
    if (line.length && lw + sp + ww > maxW) cierra();
    lw += (line.length ? pdfMide(" ", line[line.length - 1].slice(-1)[0].f, s) : 0) + ww; line.push(wd);
  }
  cierra();
  return L;
}
function pdfUne(words, w) {
  const segs = [];
  words.forEach((wd, i) => wd.forEach((g, j) => {
    const t = g.b + (j === wd.length - 1 && i < words.length - 1 ? " " : ""), u = segs[segs.length - 1];
    if (u && u.f === g.f && u.c === g.c) u.b += t; else segs.push({ b: t, f: g.f, c: g.c });
  }));
  return { segs, w, n: words.length };
}
function pdfLinea(ln, x, y, s, W, just) {
  let tw = just && ln.n > 1 ? (W - ln.w) / (ln.n - 1) : 0;
  if (tw > s * 1.1 || tw < 0) tw = 0;
  let o = `BT ${pdfN(x)} ${pdfN(y)} Td ${tw ? pdfN(tw) + " Tw " : ""}`, f0, c0;
  for (const g of ln.segs) { if (g.f !== f0) o += `/${PDF_F[g.f]} ${pdfN(s)} Tf `; if (g.c !== c0) o += pdfRGB(g.c) + " "; f0 = g.f; c0 = g.c; o += pdfEsc(g.b) + " Tj "; }
  return o + (tw ? "0 Tw " : "") + "ET";
}
const pdfMay = (s) => { const l = String(s).replace(/\([^)]*\)/g, "").match(/\p{L}/gu) || []; return l.length < 3 ? 0 : l.filter((ch) => ch !== ch.toLowerCase()).length / l.length; };
// Longitud del arranque en negrita de un párrafo ("Primero. Coordinación.", "SOLICITAN", "Asunto:")
function pdfNegrita(t) {
  let m;
  if ((m = PDF_ORD.exec(t))) {
    const r = t.slice(m[0].length + 1), k = r.search(/\.\s+(?=\p{Lu})/u), fr = r.slice(0, k);
    return m[1].length + (k > 0 && k <= 60 && !/[:;]/.test(fr) && /\p{L}{3,}$/u.test(fr) ? k + 2 : 0);
  }
  if ((m = /^[A-ZÁÉÍÓÚÑÜ]{2,}(?: [A-ZÁÉÍÓÚÑÜ]+)*[.,:]?(?= )/.exec(t)) && m[0].replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "").length >= 4) return m[0].length;
  return 0;
}
const pdfEtq = (t) => { const m = /^[A-ZÁÉÍÓÚÑ¿][^:.[\]\d]{1,40}:(?= \S)/.exec(t); return m && m[0].split(" ").length <= 6 ? m[0].length : 0; };

// ── Análisis del texto plano en bloques ──
function pdfAnaliza(texto) {
  const L = String(texto || "").replace(/\r\n?/g, "\n").split("\n"), B = [];
  let i = 0, gap = false;
  while (i < L.length && !L[i].trim()) i++;
  if (i < L.length && L[i].trim().length > 3 && pdfMay(L[i]) >= 0.7 && !/[⟦|]/.test(L[i])) {
    const t = { t: "titulo", txt: L[i++].trim(), sub: [] };
    while (i < L.length && L[i].trim() && !/⟦REVISI|^\|/.test(L[i].trim())) t.sub.push(L[i++].trim());
    B.push(t);
  }
  const nota = (s) => { s = s.replace(/^\s*(REVISIÓN OBLIGATORIA POR ABOGADO|REVISAR)\s*:?\s*/i, "").trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const linea = (s, gap) => {
    const ind = /^\s{2,}/.test(s) ? 1 : 0, t = s.trim(), prev = B[B.length - 1];
    let m;
    if (/^\[REVISAR\b.*\]$/i.test(t)) return B.push({ t: "nota", txt: nota(t.slice(1, -1)) });
    if (/^Fdo\.?:/.test(t) || /^(El despacho|El cliente|Los herederos|El abogado|La abogada)$/.test(t)) return prev && prev.t === "firma" ? prev.celdas.push([t]) : B.push({ t: "firma", celdas: [[t]], gap });
    if (prev && prev.t === "firma" && !gap && t.length < 60) return prev.celdas[prev.celdas.length - 1].push(t);
    if (/^\|.*\|$/.test(t)) {
      if (/^\|[\s:|-]+\|$/.test(t)) return;
      const c = t.slice(1, -1).split("|").map((x) => x.trim());
      return prev && prev.t === "tabla" && !gap ? prev.filas.push(c) : B.push({ t: "tabla", cab: c, filas: [], gap });
    }
    const v = t.replace(/^[-·•–*]\s+/, ""), vi = v !== t ? 1 : ind;
    if ((m = /^(.+?)\s*\.{4,}\s*(\S.*)$/.exec(v)) || (m = /^([^:]{2,70}?):\s+([–−-]?\s?[\d.]+(?:,\d+)?\s?€)\.?$/.exec(v)) || (vi && (m = /^(.+?):?\s+([–−-]?[\d.]+,\d\d\s?€(?: \([^)]{1,40}\))?)$/.exec(v))))
      return B.push({ t: "fila", et: m[1], val: m[2], ind: vi, gap, src: t, dos: !/\.{4}/.test(v), neg: /^(total|coste|saldo|a pagar|a ingresar|neto|caudal neto)/i.test(m[1]) });
    if ((m = /^(\d{1,2}\.)\s+(.+)$/.exec(t)) && t.length <= 95 && pdfMay(m[2]) >= 0.85) return B.push({ t: "h", num: m[1], txt: m[2] });
    if (!ind && t.length <= 60 && !/[:[\]\d]/.test(t) && pdfMay(t) >= 0.9 && t.replace(/[^\p{L}]/gu, "").length >= 4) return B.push({ t: "hc", txt: t });
    if (t.length <= 60 && /^(PRIMER|SEGUND|TERCER|CUART|QUINT|SEXT|SÉPTIM|OCTAV|NOVEN|DÉCIM)A\. /.test(t)) return B.push({ t: "h2", txt: t });
    if ((m = /^([-·•–*])\s+(.+)$/.exec(t))) return B.push({ t: "li", mk: ind ? "–" : "•", txt: m[2], ind, gap });
    if ((m = /^[A-Z]\)\s+([^:]{1,40}:)?/.exec(t))) return B.push({ t: "p", txt: t, ind, gap, nb: m[0].length, kn: /:$/.test(t) });
    if ((m = /^(\d{1,2}\.|[a-z]\))\s+(.+)$/.exec(t))) return B.push({ t: "li", mk: m[1], txt: m[2], ind, gap });
    const p = { t: "p", txt: t, ind, gap };
    if (/^En [^,]{2,60}, a [^.]{2,50}\.$/.test(t)) { p.al = "r"; p.kn = 1; }
    if (/:$/.test(t) || (/,$/.test(t) && t.length < 40)) p.kn = 1;
    B.push(p);
  };
  for (; i < L.length; i++) {
    const s = L[i].replace(/\s+$/, "");
    if (!s.trim()) { gap = true; continue; }
    // Solo las notas ⟦REVISIÓN…⟧ van en recuadro; los datos por completar ⟦…⟧ siguen en la línea (se imprimen entre corchetes)
    const a = s.search(/⟦(REVISI|REVISAR)/);
    if (a >= 0) {
      let r = s.slice(a + 1);
      const cierre = (q) => { let d = 1; for (let k = 0; k < q.length; k++) { if (q[k] === "⟦") d++; else if (q[k] === "⟧" && --d === 0) return k; } return -1; };
      while (cierre(r) < 0 && i + 1 < L.length) r += " " + L[++i].trim();
      const z = cierre(r);
      if (s.slice(0, a).trim()) linea(s.slice(0, a), gap);
      B.push({ t: "nota", txt: nota(z >= 0 ? r.slice(0, z) : r) });
      if (z >= 0 && r.slice(z + 1).trim()) linea(r.slice(z + 1).trim(), false);
    } else linea(s, gap);
    gap = false;
  }
  const es = (k, t) => B[k] && B[k].t === t;
  // "Etiqueta: importe" suelto entre párrafos se queda como párrafo
  B.forEach((b, k) => { if (b.t === "fila" && b.dos && !b.ind && !es(k - 1, "fila") && !es(k + 1, "fila")) Object.assign(b, { t: "p", txt: b.src }); });
  // Etiquetas "Algo:" en negrita solo si todo el grupo de líneas las tiene
  for (let k = 0; k < B.length;) {
    const b = B[k]; let j = k + 1;
    if ((b.t !== "p" && b.t !== "li") || b.al) { k++; continue; }
    while (es(j, b.t) && !B[j].gap && !B[j].al && B[j].ind === b.ind) j++;
    const e = B.slice(k, j).map((x) => pdfEtq(x.txt)), ok = e.every(Boolean);
    B.slice(k, j).forEach((x, n) => { x.lab = ok ? e[n] : 0; });
    k = j;
  }
  // Listas numeradas: sangría común para "1." y "10."
  for (let k = 0; k < B.length;) {
    let j = k; const num = (x) => x && x.t === "li" && x.mk.length > 1 && x.ind === B[k].ind;
    if (!num(B[k])) { k++; continue; }
    while (num(B[j])) j++;
    const hw = Math.max(...B.slice(k, j).map((x) => pdfMide(pdfCod(x.mk), "TR", PDF_S)));
    B.slice(k, j).forEach((x) => { x.hw = hw; }); k = j;
  }
  B.forEach((b, k) => {
    // Una línea corta seguida de filas sangradas (heredero y su liquidación) va en negrita
    if (b.t === "p" && !b.ind && es(k + 1, "fila") && B[k + 1].ind && !B[k + 1].gap && b.txt.length < 90) { b.neg = 1; b.kn = 1; }
    // Las firmas nunca quedan solas en una página: arrastran el texto que las precede
    if (b.t === "firma") { let j = k - 1; while (j > 0 && B[j].kn && B[j].t === "p") j--; if (B[j] && /^(p|li)$/.test(B[j].t)) B[j].kn = 1; }
  });
  return B;
}
function pdfBloques(bl) {
  const B = [];
  for (const b of bl || []) {
    const t = b.tipo, tx = b.texto == null ? "" : String(b.texto);
    if (t === "texto") B.push(...pdfAnaliza(tx).map((x) => (x.t === "titulo" ? { t: "h", num: "", txt: x.txt } : x)));
    else if (t === "h") B.push({ t: "h", num: b.numero || "", txt: tx });
    else if (t === "p") B.push({ t: "p", txt: tx, gap: true, lit: 1 });
    else if (t === "nota") B.push({ t: "nota", txt: tx });
    else if (t === "fila") B.push({ t: "fila", et: b.etiqueta || "", val: String(b.valor == null ? "" : b.valor), neg: !!b.negrita, gap: !!b.separada });
    else if (t === "lista") (b.items || []).forEach((it, k) => B.push({ t: "li", mk: b.numerada ? k + 1 + "." : "•", txt: String(it), gap: !k }));
    else if (t === "tabla") B.push({ t: "tabla", cab: (b.cabecera || []).map(String), filas: (b.filas || []).map((f) => f.map((c) => (c == null ? "" : String(c)))), al: b.alinear, gap: true });
    else if (t === "firma") B.push({ t: "firma", celdas: (b.nombres || []).map((n) => ["Fdo.: " + n]), gap: true });
  }
  return B;
}

// ── Maquetación de cada bloque en piezas {h, draw(yTop)} ──
function pdfMaqueta(b, X0, W) {
  const S = PDF_S, LH = PDF_LH, X1 = X0 + W, out = { items: [], before: b.gap ? 7 : 2.5, kn: b.kn }, it = (h, draw) => out.items.push({ h, draw });
  const parrafo = (runs, x, w, al, s, lh, just) => pdfParte(pdfPalabras(runs), w, s).forEach((ln, k, A) => it(lh, (y) => pdfLinea(ln, al === "r" ? x + w - ln.w : al === "c" ? x + (w - ln.w) / 2 : x, pdfBase(y, lh, s), s, w, just && k < A.length - 1)));
  if (b.t === "titulo") {
    const tl = pdfParte(pdfPalabras([{ t: b.txt.toUpperCase(), f: "TB", c: PDF_C.tinta }]), W * 0.86, 13.5);
    tl.forEach((ln) => it(19, (y) => pdfLinea(ln, X0 + (W - ln.w) / 2, pdfBase(y, 19, 13.5), 13.5, 0)));
    b.sub.forEach((s, k) => { if (!k) it(4, () => ""); parrafo(pdfRuns(s, "TI", 0, "TI", PDF_C.gris), X0 + W * 0.08, W * 0.84, "c", 10.5, 14.5); });
    it(16, (y) => pdfRaya(X0 + W / 2 - 22, y - 9, X0 + W / 2 + 22, y - 9, PDF_C.marca, 0.8));
    Object.assign(out, { before: 0, after: 14, keep: 1, kn: 1 });
  } else if (b.t === "h") {
    const hang = b.num ? Math.max(17, pdfMide(pdfCod(b.num), "TB", S) + 6) : 0;
    pdfParte(pdfPalabras([{ t: b.txt, f: "TB", c: PDF_C.marca }]), W - hang, S).forEach((ln, k) => it(LH, (y) => (k || !b.num ? "" : pdfT(X0, pdfBase(y, LH, S), b.num, "TB", S, PDF_C.marca)) + " " + pdfLinea(ln, X0 + hang, pdfBase(y, LH, S), S, 0)));
    Object.assign(out, { before: 17, after: 5, keep: 1, kn: 1 });
  } else if (b.t === "hc") {
    it(LH, (y) => pdfT(X0 + W / 2, pdfBase(y, LH, S), b.txt, "TB", S, PDF_C.tinta, 2.4, "c"));
    Object.assign(out, { before: 16, after: 8, keep: 1, kn: 1 });
  } else if (b.t === "h2") {
    parrafo([{ t: b.txt, f: "TB", c: PDF_C.tinta }], X0, W, "l", S, LH);
    Object.assign(out, { before: 12, after: 3, keep: 1, kn: 1 });
  } else if (b.t === "p") {
    const x = X0 + (b.ind ? 18 : 0), w = W - (b.ind ? 18 : 0);
    parrafo(b.lit ? pdfRuns(b.txt) : pdfRuns(b.txt, b.neg ? "TB" : "TR", b.neg ? 0 : b.nb || pdfNegrita(b.txt) || b.lab), x, w, b.al, S, LH, !b.al);
  } else if (b.t === "li") {
    const x = X0 + (b.ind ? 18 : 0), bala = b.mk.length === 1, mb = pdfCod(b.mk), hang = bala ? 15 : Math.max(18, (b.hw || pdfMide(mb, "TR", S)) + 6), w = X1 - x - hang;
    pdfParte(pdfPalabras(pdfRuns(b.txt, "TR", b.lab)), w, S).forEach((ln, k, A) => it(LH, (y) => (k ? "" : pdfT(x + (bala ? 3 : 0), pdfBase(y, LH, S), b.mk, "TR", S, bala ? PDF_C.marca : PDF_C.tinta)) + " " + pdfLinea(ln, x + hang, pdfBase(y, LH, S), S, w, k < A.length - 1)));
    out.before = b.gap ? 6 : 2;
  } else if (b.t === "fila") {
    const f = b.neg ? "TB" : "TR", x = X0 + (b.ind ? 18 : 0), vb = pdfCod(pdfNbsp(b.val)), vw = pdfMide(vb, f, S), lh = 14.6;
    if (vw > (X1 - x) * 0.55) { // valor demasiado largo para ir a la derecha: etiqueta y valor como texto corrido (P10)
      const L = pdfParte(pdfPalabras(pdfRuns(`${b.et}: ${b.val}`, f)), X1 - x, S);
      L.forEach((ln) => it(lh, (y) => pdfLinea(ln, x, pdfBase(y, lh, S), S, 0)));
      out.before = b.gap ? 6 : 0.5;
      return out;
    }
    const A = pdfParte(pdfPalabras(pdfRuns(b.et, f)), X1 - x - vw - 30, S);
    A.forEach((ln, k) => it(lh, (y) => {
      const yb = pdfBase(y, lh, S); let o = pdfLinea(ln, x, yb, S, 0);
      if (k === A.length - 1) {
        const a = x + ln.w + 5, z = X1 - vw - 5;
        if (z - a > 6) o += ` q ${pdfRGB(PDF_C.gris, 1)} 0.75 w 1 J [0 2.7] 0 d ${pdfN(a)} ${pdfN(yb + 0.6)} m ${pdfN(z)} ${pdfN(yb + 0.6)} l S Q`;
        o += " " + pdfT(X1, yb, b.val, f, S, PDF_C.tinta, 0, "r");
      }
      return o;
    }));
    out.before = b.gap ? 6 : 0.5;
  } else if (b.t === "nota") {
    const pad = 11, s = 9.5, lh = 13.4, A = pdfParte(pdfPalabras(pdfRuns(b.txt, "H", 0, "HB", PDF_C.notaT)), W - 2 * pad - 3, s), n = A.length;
    A.forEach((ln, k) => {
      const top = k ? 0 : 25, bot = k === n - 1 ? 8 : 0, h = top + lh + bot;
      it(h, (y) => pdfRect(X0, y - h, W, h, PDF_C.notaF) + " " + pdfRect(X0, y - h, 2.6, h, PDF_C.notaB) + " " + (k ? "" : pdfT(X0 + pad + 3, y - 16, "REVISAR ANTES DE FIRMAR", "HB", 7.2, PDF_C.ambar, 1.1) + " ") + pdfLinea(ln, X0 + pad + 3, pdfBase(y - top, lh, s), s, 0));
    });
    Object.assign(out, { before: 10, after: 10, keep: 1 });
  } else if (b.t === "firma") {
    const cw = (W - 28) / 2;
    for (let k = 0; k < b.celdas.length; k += 2) {
      const fila = b.celdas.slice(k, k + 2).map((c) => c.map((t, j) => pdfParte(pdfPalabras(pdfRuns(t, j ? "TR" : "TR", 0, "TR", j ? PDF_C.gris : PDF_C.tinta)), cw, j ? 9.5 : 10.5)));
      const hc = (c) => c.reduce((a, ls, j) => a + ls.length * (j ? 12.5 : 14), 0), h = 44 + Math.max(...fila.map(hc)) + 8;
      it(h, (y) => fila.map((c, ci) => {
        const x = X0 + ci * (cw + 28); let yy = y - 42, o = pdfRaya(x, yy, x + Math.min(cw, 190), yy, PDF_C.gris, 0.5);
        yy -= 3;
        c.forEach((ls, j) => ls.forEach((ln) => { const s = j ? 9.5 : 10.5, lh = j ? 12.5 : 14; o += " " + pdfLinea(ln, x, pdfBase(yy, lh, s), s, 0); yy -= lh; }));
        return o;
      }).join(" "));
    }
    Object.assign(out, { before: 14, keep: b.celdas.length <= 6 });
  } else if (b.t === "tabla") {
    const R = [b.cab, ...b.filas], nc = Math.max(...R.map((r) => r.length)), pad = 5;
    let s = 9.5, lh = 12.6;
    const num = (c) => /^[–−-]?\s?[\d.]+(,\d+)?\s?(€|%)?$/.test(c.trim());
    const al = Array.from({ length: nc }, (_, j) => (b.al && b.al[j]) || (b.filas.length && b.filas.every((r) => !r[j] || num(r[j])) ? "r" : "l"));
    // Anchos (P10, H24): ninguna palabra de cabecera ni ninguna cifra se parte. Cada columna tiene un mínimo (su palabra más
    // larga; en las de cifras, la cifra entera) y el sobrante se reparte según el ancho natural. Si ni así cabe, se reduce
    // el cuerpo de letra de esa tabla (cabecera hasta 6 pt, cuerpo hasta 7 pt) antes que cortar.
    const capW = (t, f, sz) => pdfMide(pdfCod(t), f, sz);
    const palabras = (t) => String(t || "").split(/\s+/).filter(Boolean);
    let sH = 7.8, minW, natW;
    const medir = () => {
      minW = Array.from({ length: nc }, (_, j) => Math.max(30, Math.max(0, ...palabras(String(b.cab[j] || "").toUpperCase()).map((w) => capW(w, "HB", sH))), ...b.filas.map((r) => (al[j] === "r" ? capW(r[j] || "", "TR", s) : Math.max(0, ...palabras(r[j]).map((w) => capW(w, "TR", s)))))) + 2 * pad + 1);
      natW = Array.from({ length: nc }, (_, j) => Math.max(minW[j], Math.min(W * 0.55, Math.max(capW(String(b.cab[j] || "").toUpperCase(), "HB", sH), ...b.filas.map((r) => capW(r[j] || "", "TR", s))) + 2 * pad + 1)));
    };
    medir();
    for (let it = 0; it < 4; it++) { const tot = minW.reduce((x, v) => x + v, 0); if (tot <= W) break; const f = W / tot; sH = Math.max(6, sH * f); s = Math.max(7, s * f); lh = s * 1.33; medir(); }
    let cw;
    { const tMin = minW.reduce((x, v) => x + v, 0), extra = Math.max(0, W - tMin), hueco = natW.map((v, j) => v - minW[j]), tH = hueco.reduce((x, v) => x + v, 0);
      if (tH >= extra) cw = minW.map((v, j) => v + (tH ? (hueco[j] / tH) * extra : 0));
      else { const resto = extra - tH, tN = natW.reduce((x, v) => x + v, 0); cw = natW.map((v) => v + (v / tN) * resto); }
      if (tMin > W) cw = minW.map((v) => (v * W) / tMin); }
    const fila = (r, cab) => {
      const fs = cab ? sH : s;
      const cs = cw.map((w, j) => pdfParte(pdfPalabras(pdfRuns(cab ? String(r[j] || "").toUpperCase() : r[j] || "", cab ? "HB" : "TR", 0, "TB", cab ? PDF_C.marca : PDF_C.tinta)), w - 2 * pad, fs));
      const h = Math.max(1, ...cs.map((c) => c.length)) * lh + 2 * pad - 1;
      return { h, draw: (y) => (cab ? pdfRect(X0, y - h, W, h, PDF_C.tabla) + " " : "") + pdfRaya(X0, y - h, X1, y - h, cab ? PDF_C.marca : PDF_C.linea, cab ? 0.7 : 0.4) + cs.map((c, j) => { let x = X0 + cw.slice(0, j).reduce((a, v) => a + v, 0); return c.map((ln, k) => " " + pdfLinea(ln, al[j] === "r" ? x + cw[j] - pad - ln.w : x + pad, pdfBase(y - pad + 0.5 - k * lh, lh, fs), fs, 0)).join(""); }).join("") };
    };
    const cab = fila(b.cab, 1); out.items.push(cab); b.filas.forEach((r) => out.items.push(fila(r)));
    Object.assign(out, { before: 10, after: 10, rep: cab });
  }
  return out;
}

// ── Paginación con control de viudas/huérfanas y títulos que no quedan solos ──
function pdfPagina(laid, top1, topN, bot) {
  const pages = []; let ops, y, top;
  const nueva = () => { ops = []; pages.push(ops); y = pages.length === 1 ? top1 : topN; top = true; };
  const alto = (L, k) => L.items.slice(0, k).reduce((a, x) => a + x.h, 0);
  const gapDe = (i) => (laid[i - 1] && laid[i - 1].after != null ? laid[i - 1].after : laid[i].before);
  const need = (i, d) => { const L = laid[i]; if (!L) return 0; let h = alto(L, L.keep || (L.kn && L.items.length <= 4) ? 1e9 : L.rep ? 3 : 2); if (L.kn && d < 4 && laid[i + 1]) h += gapDe(i + 1) + need(i + 1, d + 1); return h; };
  const pon = (x) => { ops.push(x.draw(y)); y -= x.h; top = false; };
  nueva();
  laid.forEach((L, i) => {
    if (!L.items.length) return;
    let g = top ? 0 : gapDe(i);
    if (!top && y - g - need(i, 0) < bot) { nueva(); g = 0; }
    y -= g;
    const n = L.items.length;
    L.items.forEach((x, j) => {
      const cabe = y - x.h >= bot, viuda = !L.keep && j >= 2 && j === n - 2 && cabe && y - x.h - L.items[j + 1].h < bot;
      if ((!cabe || viuda) && !top) { nueva(); if (L.rep && j) pon(L.rep); }
      pon(x);
    });
  });
  return pages;
}

// ── Ensamblado del fichero ──
function pdfUtf16(s) { let h = "<FEFF"; for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase(); return h + ">"; }
function pdfEnsambla(conts, info) {
  const O = [], nf = Object.keys(PDF_FN).length, p0 = 3 + nf;
  O.push("<< /Type /Catalog /Pages 2 0 R /Lang (es-ES) /ViewerPreferences << /DisplayDocTitle true >> >>");
  O.push(`<< /Type /Pages /Count ${conts.length} /Kids [${conts.map((_, i) => `${p0 + 1 + 2 * i} 0 R`).join(" ")}] /MediaBox [0 0 ${PDF_A4.join(" ")}] /Resources << /ProcSet [/PDF /Text] /Font << ${Object.keys(PDF_FN).map((k, i) => `/${k} ${4 + i} 0 R`).join(" ")} >> >> >>`);
  const d = new Date(), z = (n) => String(n).padStart(2, "0");
  O.push(`<< ${Object.entries(info).filter(([, v]) => v).map(([k, v]) => `/${k} ${pdfUtf16(String(v))}`).join(" ")} /CreationDate (D:${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}) >>`);
  Object.values(PDF_FN).forEach((n) => O.push(`<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`));
  conts.forEach((c, i) => { O.push(`<< /Type /Page /Parent 2 0 R /Contents ${p0 + 2 + 2 * i} 0 R >>`); O.push(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`); });
  let s = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; const off = [];
  O.forEach((o, i) => { off.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xr = s.length;
  s += `xref\n0 ${O.length + 1}\n0000000000 65535 f \n${off.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${O.length + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xr}\n%%EOF\n`;
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
  return u;
}

// ── API ──
function pdfDocumento(o) {
  o = o || {}; const d = o.despacho || {}, [PW, PH] = PDF_A4, X0 = 79.4, X1 = PW - 68, W = X1 - X0, C = PDF_C;
  let B = o.texto ? pdfAnaliza(o.texto) : [];
  if (o.bloques) B = B.concat(pdfBloques(o.bloques));
  const t0 = B[0] && B[0].t === "titulo" ? B[0] : null;
  if (t0 && o.subtitulo && !t0.sub.length) t0.sub.push(o.subtitulo);
  if (!t0 && o.titulo && !o.texto) B.unshift({ t: "titulo", txt: o.titulo, sub: o.subtitulo ? [o.subtitulo] : [] });
  const titulo = o.titulo || (t0 ? t0.txt.charAt(0) + t0.txt.slice(1).toLowerCase() : "Documento");
  const fecha = o.fecha || new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const firma = String(d.nombre || "").trim();
  // Membrete de la primera página
  let m = [], yL = PH - 56;
  if (firma) {
    let s = 17; while (s > 11 && pdfMide(pdfCod(firma), "TB", s) > W * 0.6) s -= 0.5;
    // Si ni a 11 puntos cabe en el 60 % del ancho (la columna derecha es de la referencia y la fecha), se parte en hasta tres líneas
    for (const l of pdfPartirEn(firma, "TB", s, W * 0.6, 3)) { m.push(pdfT(X0, yL - s * 0.72, l, "TB", s, C.marca)); yL -= s + 2; }
    yL -= 4;
  }
  [d.colegio, d.localidad, d.responsable ? "Responsable: " + d.responsable : ""].filter(Boolean).forEach((t) => { m.push(pdfT(X0, yL - 7, pdfRecorta(t, "H", 8.2, W * 0.6), "H", 8.2, C.gris)); yL -= 11.5; });
  let yR = PH - 56;
  [["REFERENCIA", o.ref], ["FECHA", fecha]].filter((r) => r[1]).forEach(([k, v]) => { m.push(pdfT(X1, yR - 6, k, "HB", 6.3, C.gris, 1, "r")); m.push(pdfT(X1, yR - 18, v, "H", 9, C.tinta, 0, "r")); yR -= 28; });
  const yr = Math.min(yL, yR + 6) - 8;
  m.push(pdfRaya(X0, yr, X1, yr, C.marca, 1.1), pdfRaya(X0, yr - 2.4, X1, yr - 2.4, C.acento, 0.45));
  const pages = pdfPagina(B.map((b) => pdfMaqueta(b, X0, W)), yr - 28, PH - 74, 74);
  const der = pdfRecorta([titulo, o.ref ? "Ref. " + o.ref : ""].filter(Boolean).join("  ·  "), "H", 7.5, W * 0.48);
  const pie = pdfRecorta([firma, d.localidad].filter(Boolean).join(" · "), "H", 7.5, W - pdfMide(pdfCod("Página 999 de 999"), "H", 7.5) - 16);
  const firmaCab = firma ? pdfRecorta(firma.toUpperCase(), "HB", 7, W - pdfMide(pdfCod(der), "H", 7.5) - 16, 0.8) : "";
  let agua = "";
  if (o.marcaAgua) {
    const s = 84, tc = 6, b = pdfCod(String(o.marcaAgua).toUpperCase()), w = pdfMide(b, "HB", s, tc) - tc, h = s * 0.7, c = 0.7071;
    agua = `BT ${pdfRGB(C.agua)} /${PDF_F.HB} ${s} Tf ${tc} Tc ${c} ${c} ${-c} ${c} ${pdfN(PW / 2 - c * w / 2 + c * h / 2)} ${pdfN(PH / 2 - c * w / 2 - c * h / 2)} Tm ${pdfEsc(b)} Tj 0 Tc ET\n`;
  }
  const conts = pages.map((ops, i) => {
    const n = i + 1, hd = n === 1 ? m.join("\n") : [firmaCab ? pdfT(X0, PH - 40, firmaCab, "HB", 7, C.marca, 0.8) : "", pdfT(X1, PH - 40, der, "H", 7.5, C.gris, 0, "r"), pdfRaya(X0, PH - 47, X1, PH - 47, C.linea, 0.4)].join("\n");
    const ft = [pdfRaya(X0, 56, X1, 56, C.linea, 0.4), pie ? pdfT(X0, 44, pie, "H", 7.5, C.gris) : "", pdfT(X1, 44, `Página ${n} de ${pages.length}`, "H", 7.5, C.gris, 0, "r")].join("\n");
    return agua + hd + "\n" + ops.join("\n") + "\n" + ft;
  });
  return pdfEnsambla(conts, { Title: titulo, Author: firma || d.responsable, Subject: [titulo, o.ref].filter(Boolean).join(" · "), Creator: PDF_PROD, Producer: PDF_PROD });
}
function pdfDescargar(nombre, bytes) {
  const n = (String(nombre || "documento").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|-+$/g, "").slice(0, 90) || "documento") + ".pdf";
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a"); a.href = url; a.download = n; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return n;
}
