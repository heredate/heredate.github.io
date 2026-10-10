#!/usr/bin/env node
// Emite facturas en PDF de las licencias de Hereda+, con numeración correlativa por serie y año.
//
//   node tools/emitir-factura.mjs --cliente "Ruiz Abogados SLP" --nif B29000000 --domicilio "C/ Larios 1, 29005 Málaga" \
//        --plan despacho --desde 2026-10-01                        (mensual: periodo de un mes)
//   node tools/emitir-factura.mjs ... --plan individual --anual --desde 2026-10-01   (anual: 10 meses por 12)
//   node tools/emitir-factura.mjs ... --plan despacho --periodo trimestral --desde 2026-10-05   (3 meses; también semestral)
//   node tools/emitir-factura.mjs ... --base 64,50 --concepto "Diferencia por cambio a plan Despacho+ del 15/10 al 31/10/2026"
//   node tools/emitir-factura.mjs ... --irpf 15                     (solo si la asesoría confirma que procede la retención)
//   node tools/emitir-factura.mjs --rectifica H-2026-0003 --motivo "Error en el NIF del cliente"   (anula la H-2026-0003)
//   node tools/emitir-factura.mjs --pagada H-2026-0001 [--fecha-cobro 2026-10-10]   (anota el cobro)
//   node tools/emitir-factura.mjs --listar                         (muestra las facturas y las pendientes de cobro)
//   node tools/emitir-factura.mjs ... --prueba                     (borrador con marca de agua; no gasta número)
//
// Datos del emisor: tools/emisor.json (copiar de tools/emisor.ejemplo.json y rellenar).
// Registro de facturas: tools/facturas.csv. PDF: tools/facturas/<número>.pdf. Ninguno de los tres se sube a GitHub.
// Rutas alternativas: --emisor, --registro, --salida (o variables HRD_EMISOR, HRD_FACTURAS, HRD_SALIDA).
//
// El PDF se dibuja con las funciones de src/app/pdf.js (el mismo generador de la app), cargadas en un contexto aislado.
// No sustituye a un programa de facturación adaptado a VERI*FACTU: úsalo solo hasta la fecha en que esa obligación
// te alcance (1-7-2027 autónomos; 1-1-2027 sociedades, según el Real Decreto-ley 15/2025).
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PDF_JS = join(AQUI, "..", "src", "app", "pdf.js");
const MARCA = "Hereda+";
// Precios sin IVA. Anual = 10 mensualidades (página de contratación).
const PLANES = {
  individual: { nombre: "Individual", usuarios: 1, mes: 59, anio: 590 },
  despacho: { nombre: "Despacho", usuarios: 5, mes: 129, anio: 1290 },
  "despacho+": { nombre: "Despacho+", usuarios: 15, mes: 249, anio: 2490 },
  fundador: { nombre: "Fundador", usuarios: 5, mes: 49, anio: 490 },
};
const CAB = ["numero", "serie", "fecha", "cliente", "nif", "domicilio", "email", "concepto", "base", "iva_pct", "iva", "irpf_pct", "irpf", "total", "vencimiento", "forma_pago", "rectifica", "motivo", "licencia", "estado", "fecha_cobro", "archivo"];

const salir = (m) => { console.error("Error: " + m); process.exit(1); };
const aviso = (m) => console.error("Aviso: " + m);

// ── Argumentos
function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) salir(`argumento inesperado: ${a}`);
    const k = a.slice(2), v = argv[i + 1];
    if (v === undefined || (v.startsWith("--") && v.length > 2)) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}
const o = args(process.argv.slice(2));
const txt = (k) => (typeof o[k] === "string" ? o[k].trim() : "");

// ── Fechas (AAAA-MM-DD, sin husos)
const pad = (n) => String(n).padStart(2, "0");
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fechaOk = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const dia = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const deDia = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
const sumaDias = (s, n) => deDia(dia(s) + n);
function sumaMeses(s, n) { // mismo día n meses después; si no existe, último día del mes
  const y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 + n, d = +s.slice(8, 10);
  const Y = y + Math.floor(m / 12), M = ((m % 12) + 12) % 12, ult = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  return `${Y}-${pad(M + 1)}-${pad(Math.min(d, ult))}`;
}
const fEs = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

// ── Importes en céntimos
function cent(v) {
  const s = String(v).trim().replace(/\s|€/g, "");
  const n = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(n)) salir(`importe no válido: ${v}`);
  return Math.round(Number(n) * 100);
}
const porc = (c, p) => Math.round(c * p / 100); // redondeo al céntimo, mitad hacia arriba
function eur(c) {
  const neg = c < 0, a = Math.abs(c), e = Math.floor(a / 100), d = pad(a % 100);
  return (neg ? "−" : "") + String(e).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d + " €";
}
const num = (c) => (c / 100).toFixed(2);
const pct = (p) => String(p).replace(".", ",") + " %";

// ── NIF, NIE y CIF (comprobación del dígito o letra de control)
function nifValido(raw) {
  const s = String(raw).toUpperCase().replace(/[\s.-]/g, "").replace(/^ES/, "");
  const L = "TRWAGMYFPDXBNJZSQVHLCKE";
  if (/^\d{8}[A-Z]$/.test(s)) return L[+s.slice(0, 8) % 23] === s[8];
  if (/^[XYZ]\d{7}[A-Z]$/.test(s)) return L[+("XYZ".indexOf(s[0]) + s.slice(1, 8)) % 23] === s[8];
  if (/^[KLM]\d{7}[A-Z]$/.test(s)) return L[+s.slice(1, 8) % 23] === s[8];
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(s)) {
    const d = s.slice(1, 8).split("").map(Number);
    let sum = 0; d.forEach((x, i) => { if (i % 2) sum += x; else { const t = x * 2; sum += Math.floor(t / 10) + (t % 10); } });
    const c = (10 - (sum % 10)) % 10, ctrl = s[8];
    if ("PQRSNW".includes(s[0])) return ctrl === "JABCDEFGHI"[c];
    if ("ABEH".includes(s[0])) return ctrl === String(c);
    return ctrl === String(c) || ctrl === "JABCDEFGHI"[c];
  }
  return false;
}
const nifLimpio = (s) => String(s).toUpperCase().replace(/[\s.-]/g, "");

// ── Registro CSV (separador ;, comillas dobles)
const rutaRegistro = resolve(txt("registro") || process.env.HRD_FACTURAS || join(AQUI, "facturas.csv"));
const rutaSalida = resolve(txt("salida") || process.env.HRD_SALIDA || join(AQUI, "facturas"));
const rutaEmisor = resolve(txt("emisor") || process.env.HRD_EMISOR || join(AQUI, "emisor.json"));
const csvCampo = (v) => { const s = v == null ? "" : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function csvLeer() {
  if (!existsSync(rutaRegistro)) return [];
  const t = readFileSync(rutaRegistro, "utf8").replace(/^﻿/, "");
  const filas = []; let f = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; continue; }
    if (ch === '"') q = true; else if (ch === ";") { f.push(c); c = ""; } else if (ch === "\n") { f.push(c); filas.push(f); f = []; c = ""; } else if (ch !== "\r") c += ch;
  }
  if (c || f.length) { f.push(c); filas.push(f); }
  const [cab, ...resto] = filas;
  if (!cab || cab.join(";") !== CAB.join(";")) salir(`${rutaRegistro} no tiene la cabecera esperada. No lo edites a mano salvo la columna "estado".`);
  return resto.filter((r) => r.length > 1).map((r) => Object.fromEntries(CAB.map((k, i) => [k, r[i] ?? ""])));
}
function csvGuardar(filas) {
  mkdirSync(dirname(rutaRegistro), { recursive: true });
  const tmp = rutaRegistro + ".tmp";
  writeFileSync(tmp, "﻿" + [CAB.join(";"), ...filas.map((r) => CAB.map((k) => csvCampo(r[k])).join(";"))].join("\r\n") + "\r\n");
  renameSync(tmp, rutaRegistro);
}

// ── Órdenes que no emiten
if (o.listar) {
  const F = csvLeer();
  if (!F.length) { console.log("No hay facturas en " + rutaRegistro); process.exit(0); }
  let pend = 0;
  for (const r of F) {
    const p = r.estado === "pendiente" && Number(r.total) > 0;
    if (p) pend += Math.round(Number(r.total) * 100);
    console.log(`${r.numero.padEnd(12)} ${fEs(r.fecha)}  ${eur(Math.round(Number(r.total) * 100)).padStart(12)}  ${(r.estado || "").padEnd(9)} ${r.cliente}${p && r.vencimiento < hoy() ? "  ← VENCIDA" : ""}`);
  }
  console.log(`\nPendiente de cobro: ${eur(pend)}`);
  process.exit(0);
}
if (o.pagada) {
  const F = csvLeer(), r = F.find((x) => x.numero === String(o.pagada).trim());
  if (!r) salir(`no existe la factura ${o.pagada}`);
  const fc = txt("fecha-cobro") || hoy();
  if (!fechaOk(fc)) salir("--fecha-cobro debe ser AAAA-MM-DD");
  r.estado = "pagada"; r.fecha_cobro = fc; csvGuardar(F);
  console.log(`Factura ${r.numero} marcada como pagada el ${fEs(fc)}.`);
  process.exit(0);
}

// ── Emisor
// src/empresa.json es el único sitio con los datos del titular (también los usa build.py para las páginas legales).
// Si no hay tools/emisor.json, o le faltan campos, se completan con empresa.json (incluido el IBAN, que solo sale en las facturas).
const rutaEmpresa = join(AQUI, "..", "src", "empresa.json");
let EMP = {};
try { if (existsSync(rutaEmpresa)) EMP = JSON.parse(readFileSync(rutaEmpresa, "utf8")); } catch (e) { aviso(`src/empresa.json no es un JSON válido: ${e.message}`); }
const desdeEmpresa = { nombre: EMP.titular, nif: EMP.nif, domicilio: EMP.domicilio, email: EMP.email, web: EMP.web, iban: EMP.iban, titularCuenta: EMP.titular_cuenta, registroMercantil: EMP.registro };
if (!existsSync(rutaEmisor) && !EMP.titular) salir(`faltan los datos del emisor: rellena src/empresa.json (titular, nif, domicilio, email, iban) o copia tools/emisor.ejemplo.json como tools/emisor.json.`);
let E = {};
if (existsSync(rutaEmisor)) { try { E = JSON.parse(readFileSync(rutaEmisor, "utf8")); } catch (e) { salir(`${rutaEmisor} no es un JSON válido: ${e.message}`); } }
for (const [k, v] of Object.entries(desdeEmpresa)) if (v && (!E[k] || /\[.*\]/.test(String(E[k])))) E[k] = v;
const prueba = !!o.prueba;
const huecos = ["nombre", "nif", "domicilio", "email"].filter((k) => !E[k] || /\[.*\]/.test(E[k]));
if (huecos.length && !prueba) salir(`rellena en ${relative(process.cwd(), rutaEmisor)}: ${huecos.join(", ")} (o usa --prueba para un borrador)`);
if (!huecos.includes("nif") && !nifValido(E.nif)) (prueba ? aviso : salir)(`el NIF del emisor (${E.nif}) no supera la comprobación de la letra o dígito de control`);
const SERIE = String(E.serie || "H").toUpperCase(), SERIE_R = String(E.serieRectificativa || "R").toUpperCase();
if (SERIE === SERIE_R) salir("las facturas rectificativas necesitan una serie distinta de la ordinaria (art. 6.1.a del Reglamento de facturación)");

// ── Datos de la factura
const F = csvLeer();
const fecha = txt("fecha") || hoy();
if (!fechaOk(fecha)) salir("--fecha debe ser AAAA-MM-DD");
let fac;

if (o.rectifica) {
  const orig = F.find((x) => x.numero === String(o.rectifica).trim());
  if (!orig) salir(`no existe la factura ${o.rectifica} en ${rutaRegistro}`);
  if (orig.rectifica) salir("no se rectifica una rectificativa: rectifica la factura original o emite una nueva");
  const motivo = txt("motivo");
  if (!motivo) salir('falta --motivo "por qué se rectifica"');
  // Por defecto, anulación total (importes en negativo). Con --base se rectifica solo la diferencia.
  const base = o.base !== undefined ? cent(o.base) : -Math.round(Number(orig.base) * 100);
  fac = {
    serie: SERIE_R, rectificativa: true, cliente: orig.cliente, nif: orig.nif, domicilio: orig.domicilio, email: orig.email,
    concepto: txt("concepto") || (o.base !== undefined ? `Rectificación de la factura ${orig.numero}: ${orig.concepto}` : `Anulación de la factura ${orig.numero}: ${orig.concepto}`),
    base, ivaPct: Number(orig.iva_pct), irpfPct: Number(orig.irpf_pct) || 0, rectifica: orig.numero, fechaOrig: orig.fecha, motivo,
    licencia: orig.licencia, forma: orig.forma_pago, mencion: "",
  };
} else {
  const cliente = txt("cliente"), nif = nifLimpio(txt("nif")), domicilio = txt("domicilio");
  if (!cliente || !nif || !domicilio) salir('faltan datos del cliente: --cliente "Razón social" --nif B12345678 --domicilio "Calle, número, CP Localidad"');
  if (!nifValido(nif)) (o["forzar-nif"] ? aviso : salir)(`el NIF ${nif} no supera la comprobación de control${o["forzar-nif"] ? "" : " (si es correcto y extranjero, añade --forzar-nif)"}`);
  const plan = PLANES[String(o.plan || "").toLowerCase()];
  // --periodo trimestral | semestral | anual | mensual (por defecto, mensual; --anual equivale a --periodo anual)
  const PER = { mensual: [1, "mensual"], trimestral: [3, "pago trimestral"], semestral: [6, "pago semestral"], anual: [12, "pago anual"] };
  const perK = o.anual ? "anual" : String(o.periodo || "mensual").toLowerCase();
  if (!PER[perK]) salir("--periodo debe ser mensual, trimestral, semestral o anual");
  const anual = perK === "anual", [mesesPer, perTxt] = PER[perK];
  let concepto = txt("concepto"), base, desde = txt("desde"), hasta = txt("hasta");
  if (!plan && (!concepto || o.base === undefined)) salir(`--plan debe ser uno de: ${Object.keys(PLANES).join(", ")} (o indica --concepto y --base)`);
  if (desde && !fechaOk(desde)) salir("--desde debe ser AAAA-MM-DD");
  if (hasta && !fechaOk(hasta)) salir("--hasta debe ser AAAA-MM-DD");
  if (!desde && plan) desde = fecha;
  if (desde && !hasta) hasta = sumaDias(sumaMeses(desde, mesesPer), -1);
  if (desde && hasta < desde) salir("--hasta es anterior a --desde");
  if (plan) {
    const usuarios = o.usuarios !== undefined ? Number(o.usuarios) : plan.usuarios;
    if (!Number.isInteger(usuarios) || usuarios < 1 || usuarios > plan.usuarios) salir(`el plan ${plan.nombre} admite de 1 a ${plan.usuarios} usuario(s)`);
    base = o.base !== undefined ? cent(o.base) : (anual ? plan.anio : plan.mes * mesesPer) * 100;
    if (!concepto) concepto = `Licencia de uso ${MARCA} · plan ${plan.nombre} (${usuarios === 1 ? "1 usuario" : "hasta " + usuarios + " usuarios"}) · ${perTxt} · periodo del ${fEs(desde)} al ${fEs(hasta)}`;
  } else base = cent(o.base);
  if (base <= 0) salir("la base debe ser positiva (para corregir una factura usa --rectifica)");
  const ivaPct = o.iva !== undefined ? Number(String(o.iva).replace(",", ".")) : 21;
  if (!(ivaPct >= 0 && ivaPct <= 21)) salir("--iva debe estar entre 0 y 21");
  const mencion = txt("mencion");
  if (ivaPct === 0 && !mencion) salir('sin IVA hay que indicar el motivo: --mencion "Operación no sujeta / exenta / inversión del sujeto pasivo, art. ..." (art. 6.1.j y m del Reglamento de facturación)');
  const irpfPct = o.irpf === undefined || o.irpf === true ? (o.irpf === true ? 15 : 0) : Number(String(o.irpf).replace(",", "."));
  if (![0, 7, 15, 19].includes(irpfPct)) salir("--irpf debe ser 7, 15 o 19 (o no ponerlo)");
  fac = {
    serie: SERIE, rectificativa: false, cliente, nif, domicilio, email: txt("email"), concepto, base, ivaPct, irpfPct,
    licencia: txt("licencia"), forma: (txt("forma") || "transferencia").toLowerCase(), mencion,
  };
  if (!["transferencia", "sepa", "tarjeta"].includes(fac.forma)) salir("--forma debe ser transferencia, sepa o tarjeta");
}
if (!fac.rectificativa && fac.forma === "transferencia" && (!E.iban || /\[.*\]/.test(E.iban)) && !prueba) salir("para cobrar por transferencia, pon el IBAN en emisor.json");

// ── Número (serie-año-correlativo) y orden cronológico
const anio = fecha.slice(0, 4), pref = `${fac.serie}-${anio}-`;
const misma = F.filter((r) => r.numero.startsWith(pref));
const ultimo = misma.reduce((m, r) => Math.max(m, parseInt(r.numero.slice(pref.length), 10) || 0), 0);
const ultFecha = misma.reduce((m, r) => (r.fecha > m ? r.fecha : m), "");
if (ultFecha && fecha < ultFecha && !prueba) salir(`la última factura de la serie ${fac.serie} es del ${fEs(ultFecha)}; no emitas una con fecha anterior (numeración correlativa)`);
const numero = prueba ? `${pref}BORRADOR` : `${pref}${String(ultimo + 1).padStart(4, "0")}`;

// ── Cálculo
const iva = porc(fac.base, fac.ivaPct), irpf = porc(fac.base, fac.irpfPct), total = fac.base + iva - irpf;
const vDias = Number.isInteger(Number(o.vencimiento)) ? Number(o.vencimiento) : Number(E.vencimientoDias ?? 15);
const vencimiento = fac.rectificativa ? fecha : sumaDias(fecha, vDias);

// ── PDF con las primitivas de src/app/pdf.js
if (!existsSync(PDF_JS)) salir(`no encuentro ${PDF_JS}`);
const ctx = vm.createContext({});
vm.runInContext(readFileSync(PDF_JS, "utf8"), ctx, { filename: "pdf.js" });
const P = vm.runInContext("({ pdfT, pdfRect, pdfRaya, pdfMide, pdfCod, pdfEnsambla, pdfRGB, pdfN, pdfEsc, PDF_A4, PDF_C, PDF_F })", ctx);
const [PW, PH] = P.PDF_A4, X0 = 56.7, X1 = PW - 56.7, W = X1 - X0, C = P.PDF_C;
const ops = [];
const T = (x, y, t, f = "H", s = 9, c = C.tinta, al) => ops.push(P.pdfT(x, y, t, f, s, c, 0, al));
const ancho = (t, f, s) => P.pdfMide(P.pdfCod(t), f, s);
function parte(t, f, s, max) { // reparte un texto en líneas que caben en max puntos
  const L = []; let lin = "";
  for (const w of String(t).split(/\s+/).filter(Boolean)) {
    const prueba2 = lin ? lin + " " + w : w;
    if (ancho(prueba2, f, s) <= max || !lin) lin = prueba2; else { L.push(lin); lin = w; }
  }
  if (lin) L.push(lin);
  return L;
}

// Cabecera: emisor a la izquierda, título y número a la derecha
let y = PH - 62;
let sN = 15; while (sN > 10 && ancho(E.nombre || "", "HB", sN) > W * 0.55) sN -= 0.5;
T(X0, y, E.nombre || "[NOMBRE DEL EMISOR]", "HB", sN, C.marca);
let yE = y - 15;
for (const l of [`NIF ${E.nif || "[NIF]"}`, ...parte(E.domicilio || "[DOMICILIO]", "H", 8.6, W * 0.5), [E.email, E.web].filter(Boolean).join(" · "), E.registroMercantil || ""].filter(Boolean)) { T(X0, yE, l, "H", 8.6, C.gris); yE -= 11.5; }
T(X1, y, fac.rectificativa ? "FACTURA RECTIFICATIVA" : "FACTURA", "HB", fac.rectificativa ? 14 : 18, C.marca, "r");
let yR = y - 20;
for (const [k, v] of [["NÚMERO", numero], ["FECHA DE EXPEDICIÓN", fEs(fecha)], ...(fac.rectificativa ? [] : [["VENCIMIENTO", fEs(vencimiento)]])]) {
  T(X1, yR, k, "HB", 6.4, C.gris, "r"); T(X1, yR - 11, v, "H", 9.5, C.tinta, "r"); yR -= 24;
}
y = Math.min(yE, yR) - 4;
ops.push(P.pdfRaya(X0, y, X1, y, C.marca, 1.1), P.pdfRaya(X0, y - 2.4, X1, y - 2.4, C.marca, 0.35));

// Cliente
y -= 26;
T(X0, y, "CLIENTE", "HB", 6.6, C.gris); y -= 14;
T(X0, y, fac.cliente, "HB", 10.5); y -= 13;
for (const l of [`NIF ${fac.nif}`, ...parte(fac.domicilio, "H", 9, W * 0.6), fac.email || ""].filter(Boolean)) { T(X0, y, l, "H", 9, C.tinta); y -= 12; }

// Tabla de conceptos
y -= 16;
const cImp = X1, cDesc = X0 + 6, wDesc = W - 110;
ops.push(P.pdfRect(X0, y - 6, W, 20, C.tabla));
T(cDesc, y, "CONCEPTO", "HB", 7, C.gris); T(cImp - 6, y, "IMPORTE (SIN IVA)", "HB", 7, C.gris, "r");
y -= 24;
const lineas = parte(fac.concepto, "H", 9.5, wDesc);
lineas.forEach((l, i) => { T(cDesc, y - i * 13, l, "H", 9.5); });
T(cImp - 6, y, eur(fac.base), "H", 9.5, C.tinta, "r");
y -= lineas.length * 13 + 4;
ops.push(P.pdfRaya(X0, y, X1, y, C.linea, 0.5));

// Totales
y -= 20;
const xL = X1 - 230;
const fila = (k, v, neg) => { T(xL, y, k, neg ? "HB" : "H", neg ? 10.5 : 9.5, C.tinta); T(cImp - 6, y, v, neg ? "HB" : "H", neg ? 10.5 : 9.5, C.tinta, "r"); y -= 17; };
fila("Base imponible", eur(fac.base));
fila(fac.ivaPct ? `IVA (${pct(fac.ivaPct)})` : "IVA", eur(iva));
if (fac.irpfPct) fila(`Retención IRPF (${pct(fac.irpfPct)})`, eur(-irpf));
ops.push(P.pdfRaya(xL, y + 8, X1, y + 8, C.marca, 0.8));
y -= 4;
fila(fac.rectificativa ? "TOTAL RECTIFICADO" : "TOTAL FACTURA", eur(total), true);

// Notas y menciones
y -= 16;
const notas = [];
if (fac.rectificativa) notas.push(`Factura rectificativa de la factura n.º ${fac.rectifica}, de ${fEs(fac.fechaOrig)}. Motivo: ${fac.motivo}. (Art. 15 del Reglamento de facturación, RD 1619/2012.)`);
if (fac.mencion) notas.push(fac.mencion);
if (!fac.rectificativa) {
  const fp = { transferencia: `Transferencia bancaria a ${E.iban || "[IBAN]"}${E.titularCuenta ? " (titular: " + E.titularCuenta + ")" : ""}, indicando el número de factura, antes del ${fEs(vencimiento)}.`, sepa: `Adeudo directo SEPA según la orden de domiciliación firmada por el cliente, con cargo en torno al ${fEs(vencimiento)}.`, tarjeta: "Pagada con tarjeta a través de la plataforma de pago." }[fac.forma];
  notas.push("Forma de pago: " + fp);
}
if (fac.licencia) notas.push(`Código de licencia asociado: ${fac.licencia}.`);
notas.push(`Licencia de uso de software para profesionales, sujeta a las ${E.condiciones || "Condiciones generales de licencia y uso de " + MARCA}. Factura expedida en formato electrónico (PDF).`);
for (const n of notas) { for (const l of parte(n, "H", 8.4, W)) { T(X0, y, l, "H", 8.4, C.gris); y -= 11; } y -= 5; }
if (y < 90) aviso("el texto de la factura es muy largo; revisa el PDF");

// Pie
ops.push(P.pdfRaya(X0, 56, X1, 56, C.linea, 0.4));
T(X0, 44, [E.nombre, E.nif ? "NIF " + E.nif : ""].filter(Boolean).join(" · "), "H", 7.5, C.gris);
T(X1, 44, `${numero} · Página 1 de 1`, "H", 7.5, C.gris, "r");

let agua = "";
if (prueba) {
  const s = 84, tc = 6, b = P.pdfCod("BORRADOR"), w = P.pdfMide(b, "HB", s, tc) - tc, h = s * 0.7, c = 0.7071;
  agua = `BT ${P.pdfRGB(C.agua)} /${P.PDF_F.HB} ${s} Tf ${tc} Tc ${c} ${c} ${-c} ${c} ${P.pdfN(PW / 2 - c * w / 2 + c * h / 2)} ${P.pdfN(PH / 2 - c * w / 2 - c * h / 2)} Tm ${P.pdfEsc(b)} Tj 0 Tc ET\n`;
}
const bytes = P.pdfEnsambla([agua + ops.join("\n")], { Title: `${fac.rectificativa ? "Factura rectificativa" : "Factura"} ${numero}`, Author: E.nombre, Subject: fac.cliente, Creator: MARCA, Producer: MARCA });

// ── Guardar
mkdirSync(rutaSalida, { recursive: true });
const archivo = join(rutaSalida, `${numero}.pdf`);
if (!prueba && existsSync(archivo)) salir(`ya existe ${archivo}; revisa ${rutaRegistro}`);
writeFileSync(archivo, Buffer.from(bytes));
if (!prueba) {
  F.push({
    numero, serie: fac.serie, fecha, cliente: fac.cliente, nif: fac.nif, domicilio: fac.domicilio, email: fac.email || "", concepto: fac.concepto,
    base: num(fac.base), iva_pct: fac.ivaPct, iva: num(iva), irpf_pct: fac.irpfPct, irpf: num(irpf), total: num(total),
    vencimiento, forma_pago: fac.forma || "", rectifica: fac.rectifica || "", motivo: fac.motivo || "", licencia: fac.licencia || "",
    estado: fac.rectificativa ? "rectificativa" : fac.forma === "tarjeta" ? "pagada" : "pendiente", fecha_cobro: fac.forma === "tarjeta" && !fac.rectificativa ? fecha : "", archivo: relative(dirname(rutaRegistro), archivo),
  });
  if (fac.rectificativa && o.base === undefined) { const or = F.find((r) => r.numero === fac.rectifica); if (or && or.estado !== "pagada") or.estado = "anulada"; }
  csvGuardar(F);
}
console.error(`${prueba ? "Borrador" : "Factura"} ${numero} · ${fac.cliente} · base ${eur(fac.base)} · IVA ${eur(iva)}${irpf ? " · retención " + eur(-irpf) : ""} · total ${eur(total)}`);
console.log(archivo);
