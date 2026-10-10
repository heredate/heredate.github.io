// Minificado prudente de los scripts del núcleo de la app publicada (app/nucleo/*.js): quita comentarios, sangrías y espacios que
// sobran, sin tocar nombres ni la estructura del código. Rendimiento móvil: menos bytes que descargar y que leer al arrancar.
// Seguro por construcción: trabaja sobre los tokens de un analizador de JavaScript (acorn), conserva un salto de línea donde lo había (la
// inserción automática de punto y coma no cambia) y, al terminar, vuelve a analizar el resultado y exige la misma secuencia de tokens; si algo
// no cuadra, deja el archivo como estaba.
// Uso: node tools/minificar.mjs archivo.js [...]   (lo llama src/build.py; sin acorn en la máquina, no minifica y lo dice;
//      HEREDA_SIN_MINIFICAR=1 python3 src/build.py lo desactiva, para depurar)
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const RUTAS = [process.env.ACORN, "/opt/node-tools/node_modules/acorn/dist/acorn.mjs", new URL("./qa/node_modules/acorn/dist/acorn.mjs", import.meta.url).pathname].filter(Boolean);
if (process.env.HEREDA_SIN_MINIFICAR) { console.log("minificar: desactivado (HEREDA_SIN_MINIFICAR)"); process.exit(0); }
let acorn = null;
for (const r of RUTAS) { if (fs.existsSync(r)) { acorn = await import(pathToFileURL(r).href); break; } }
if (!acorn) { console.log("minificar: no encuentro acorn; los scripts se publican sin minificar"); process.exit(0); }
const PAL = new RegExp("[A-Za-z0-9_$\\u0080-\\uffff]");
const SALTO = new RegExp("[\\n\\r\\u2028\\u2029]");
const tokens = (src) => { const T = []; acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", onToken: T, allowHashBang: true }); return T; };
function minificar(src) {
  const T = tokens(src); const O = []; let ult = "", prev = null;
  for (const t of T) {
    if (t.type.label === "eof") break;
    const s = src.slice(t.start, t.end);
    if (prev && t.start > prev.end) {
      const hueco = src.slice(prev.end, t.start);
      if (SALTO.test(hueco)) { O.push("\n"); ult = "\n"; }
      else {
        const a = ult, b = s[0];
        // Un espacio solo donde quitarlo uniría dos tokens: palabras o números seguidos, «+ +», «- -», «/ /», «1 .x», «< !--»
        if ((PAL.test(a) && PAL.test(b)) || ((a === "+" || a === "-") && b === a) || (a === "/" && (b === "/" || b === "*")) || (/[0-9]/.test(a) && b === ".") || (a === "<" && b === "!")) { O.push(" "); ult = " "; }
      }
    }
    O.push(s); ult = s[s.length - 1]; prev = t;
  }
  const out = O.join("") + "\n";
  // Comprobación: mismos tokens, en el mismo orden
  const A = T.filter((t) => t.type.label !== "eof"), B = tokens(out).filter((t) => t.type.label !== "eof");
  if (A.length !== B.length) throw new Error(`distinto número de tokens (${A.length} frente a ${B.length})`);
  for (let i = 0; i < A.length; i++) if (A[i].type.label !== B[i].type.label || src.slice(A[i].start, A[i].end) !== out.slice(B[i].start, B[i].end)) throw new Error(`token ${i} distinto: ${src.slice(A[i].start, A[i].end).slice(0, 40)}`);
  return out;
}
let antes = 0, despues = 0;
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8");
  try { const m = minificar(src); fs.writeFileSync(f, m); antes += src.length; despues += m.length; }
  catch (e) { console.log(`minificar: ${f} se deja sin minificar (${e.message})`); }
}
console.log(`minificar: ${Math.round(antes / 1024)} KB → ${Math.round(despues / 1024)} KB`);
