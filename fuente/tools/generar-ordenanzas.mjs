// Vuelca src/ordenanzas-datos.json dentro de src/motor.mjs (entre los marcadores __ORD_DATOS_INICIO__/__ORD_DATOS_FIN__) y añade las claves D_<ine> a src/municipios-claves.json.
// Uso: node tools/generar-ordenanzas.mjs   (build.py lo ejecuta antes de las pruebas)
import fs from "node:fs";
const root = new URL("../", import.meta.url).pathname;
const datos = JSON.parse(fs.readFileSync(root + "src/ordenanzas-datos.json", "utf8"));
const errores = [];
const vistos = new Set();
for (const d of datos) {
  const w = (m) => errores.push(`${d.ine || "?"} ${d.nombre || "?"}: ${m}`);
  if (!/^\d{5}$/.test(String(d.ine || ""))) w("ine inválido"); if (vistos.has(d.ine)) w("ine repetido"); vistos.add(d.ine);
  if (!d.nombre) w("sin nombre");
  if (d.noLocalizado) continue;
  if (!(Number(d.tipo) >= 0 && Number(d.tipo) <= 0.30)) w("tipo fuera de 0-0.30");
  if (!d.fuente || !d.fuente.url) w("sin fuente.url");
  if (!["V", "P"].includes(d.estado)) w("estado debe ser V o P");
  if (d.coeficientes && (!Array.isArray(d.coeficientes) || d.coeficientes.length !== 21 || d.coeficientes.some((c) => !(c >= 0 && c <= 0.5)))) w("coeficientes: 21 valores entre 0 y 0.5");
  // bonif: un objeto o, si la ordenanza da porcentajes distintos según el parentesco, una lista de objetos (se aplica el primero cuyo parentesco coincide)
  for (const B of d.bonif ? (Array.isArray(d.bonif) ? d.bonif : [d.bonif]) : []) { if (!B || typeof B !== "object") { w("bonif: elemento vacío"); continue; } if (!["DAC", "DACP", "todos", "C", "CP", "CD", "CDP", "DAC1", "DACP1", "D1"].includes(B.parentesco)) w("bonif.parentesco no reconocido"); if (B.pctResto != null && !(B.pctResto >= 0 && B.pctResto <= 0.95)) w("bonif.pctResto fuera de 0-0.95"); if (B.pct != null && !(B.pct >= 0 && B.pct <= 0.95)) w("bonif.pct fuera de 0-0.95"); if (B.tramos && (!["suelo", "total"].includes(B.tramos.base) || !Array.isArray(B.tramos.tramos))) w("bonif.tramos mal formados"); if (B.pct == null && !B.tramos) w("bonif sin pct ni tramos"); }
}
if (errores.length) { console.error("ordenanzas-datos.json con errores:\n" + errores.join("\n")); process.exit(1); }
const motorP = root + "src/motor.mjs"; let motor = fs.readFileSync(motorP, "utf8");
const ini = motor.indexOf("// __ORD_DATOS_INICIO__"), fin = motor.indexOf("// __ORD_DATOS_FIN__");
if (ini < 0 || fin < 0) { console.error("marcadores no encontrados en motor.mjs"); process.exit(1); }
// En la app solo viaja lo que calcula y lo que se enseña: sin los no localizados (siguen en el JSON del repositorio) y con las notas acortadas
const enApp = datos.filter((d) => !d.noLocalizado).map((d) => ({ ...d, notas: d.notas && d.notas.length > 360 ? d.notas.slice(0, 357).replace(/\s+\S*$/, "") + "…" : d.notas }));
motor = motor.slice(0, ini) + "// __ORD_DATOS_INICIO__\nexport const ORDENANZAS_DATOS = " + JSON.stringify(enApp) + ";\n" + motor.slice(fin);
fs.writeFileSync(motorP, motor);
const clavesP = root + "src/municipios-claves.json"; const claves = JSON.parse(fs.readFileSync(clavesP, "utf8"));
for (const k of Object.keys(claves)) if (k.startsWith("D_")) delete claves[k];
for (const d of datos) if (!d.noLocalizado && !Object.values(claves).includes(d.ine)) claves["D_" + d.ine] = d.ine;
fs.writeFileSync(clavesP, JSON.stringify(claves, null, 0).replace(/,"/g, ',\n"').replace("{", "{\n").replace("}", "\n}"));
console.log(`ordenanzas declarativas: ${datos.filter((d) => !d.noLocalizado).length} (${datos.filter((d) => d.noLocalizado).length} no localizadas)`);
