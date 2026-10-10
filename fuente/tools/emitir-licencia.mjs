#!/usr/bin/env node
// Emite códigos de licencia firmados (ECDSA P-256) para la app.
//
//   node tools/emitir-licencia.mjs --despacho "Ruiz Abogados" --plan despacho --usuarios 5 --pagado-hasta 2027-01-03   (vale hasta el 10-01-2027: +7 días de cortesía)
//   node tools/emitir-licencia.mjs --despacho "Ruiz Abogados" --plan despacho --hasta 2027-10-31                     (fecha de fin exacta)
//   node tools/emitir-licencia.mjs --clave-publica            (muestra la clave pública a incrustar en la app)
//   node tools/emitir-licencia.mjs --verificar HRD1-...        (comprueba un código y muestra su contenido)
//
// La primera vez crea tools/clave-privada.pem (o la ruta de --clave / HRD_CLAVE).
// Formato del código: "HRD1-" + base64url(JSON) + "." + base64url(firma r||s de 64 bytes).
// Se firma el texto "HRD1-" + base64url(JSON) con SHA-256.
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP_LIC = join(AQUI, "..", "src", "app", "licencia.js");
const REGISTRO = process.env.HRD_REGISTRO || join(AQUI, "licencias-emitidas.csv");
const PREFIJO = "HRD1-";
const PLANES = { individual: 1, despacho: 5, "despacho+": 15, fundador: 5 }; // Fundador = plan Despacho (hasta 5), precio fijo

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const salir = (msg) => { console.error("Error: " + msg); process.exit(1); };

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) salir(`argumento inesperado: ${a}`);
    const k = a.slice(2), v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}

function fechaValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function clavePublicaRaw(priv) {
  const jwk = createPublicKey(priv).export({ format: "jwk" });
  return { jwk, raw: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")])) };
}

function cargarClave(ruta) {
  if (!existsSync(ruta)) {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    writeFileSync(ruta, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    const { jwk, raw } = clavePublicaRaw(privateKey);
    console.error(`\nClave nueva creada en ${ruta}. Guárdala en lugar seguro: sin ella no se pueden emitir códigos válidos.`);
    console.error(`Clave pública (pegar en src/app/licencia.js, const LIC_CLAVE):\n  ${raw}\nJWK: ${JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y })}\n`);
  }
  const priv = createPrivateKey(readFileSync(ruta));
  if (priv.asymmetricKeyType !== "ec" || priv.asymmetricKeyDetails?.namedCurve !== "prime256v1") salir("la clave privada no es ECDSA P-256");
  return priv;
}

// Avisa si la app lleva incrustada otra clave pública (los códigos no funcionarían en ella)
function comprobarApp(raw) {
  if (!existsSync(APP_LIC)) return;
  const m = readFileSync(APP_LIC, "utf8").match(/const LIC_CLAVE = "([A-Za-z0-9_-]+)"/);
  if (m && m[1] !== raw) console.error(`\nAVISO: src/app/licencia.js lleva otra clave pública (${m[1].slice(0, 12)}…).\nLos códigos emitidos con esta clave NO se aceptarán en la app. Cambia LIC_CLAVE por:\n  ${raw}\n`);
}

function decodificar(codigo) {
  const c = String(codigo).replace(/\s+/g, "");
  if (!c.startsWith(PREFIJO) || c.split(".").length !== 2) salir("formato de código no reconocido");
  const [cuerpo, firma] = c.split(".");
  return { cuerpo, firma: Buffer.from(firma, "base64url"), payload: JSON.parse(Buffer.from(cuerpo.slice(PREFIJO.length), "base64url").toString("utf8")) };
}

const o = args(process.argv.slice(2));
const rutaClave = resolve(o.clave || process.env.HRD_CLAVE || join(AQUI, "clave-privada.pem"));
const priv = cargarClave(rutaClave);
const pub = clavePublicaRaw(priv);
comprobarApp(pub.raw);

if (o["clave-publica"]) {
  console.log(pub.raw);
  console.error(`JWK: ${JSON.stringify({ kty: pub.jwk.kty, crv: pub.jwk.crv, x: pub.jwk.x, y: pub.jwk.y })}`);
  process.exit(0);
}

if (o.verificar) {
  const { cuerpo, firma, payload } = decodificar(o.verificar);
  const ok = verify("sha256", Buffer.from(cuerpo), { key: createPublicKey(priv), dsaEncoding: "ieee-p1363" }, firma);
  console.log(JSON.stringify(payload, null, 2));
  console.log(ok ? "Firma válida." : "FIRMA NO VÁLIDA con esta clave.");
  process.exit(ok ? 0 : 2);
}

// ── Emitir
if (!o.despacho || typeof o.despacho !== "string" || !o.despacho.trim()) salir('falta --despacho "Nombre del despacho"');
if (!(o.plan in PLANES)) salir(`--plan debe ser uno de: ${Object.keys(PLANES).join(", ")}`);
// --pagado-hasta AAAA-MM-DD: último día del periodo pagado; el código vale 7 días más de cortesía (condiciones, cláusula 11.5)
if (o["pagado-hasta"] !== undefined) {
  if (o.hasta) salir("usa --pagado-hasta o --hasta, no los dos");
  if (!fechaValida(o["pagado-hasta"])) salir("--pagado-hasta debe ser una fecha AAAA-MM-DD");
  const d = new Date(o["pagado-hasta"] + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 7); o.hasta = d.toISOString().slice(0, 10);
}
if (!o.hasta || !fechaValida(o.hasta)) salir("--pagado-hasta (o --hasta) debe ser una fecha AAAA-MM-DD");
const emitida = o.emitida || hoyLocal();
if (!fechaValida(emitida)) salir("--emitida debe ser una fecha AAAA-MM-DD");
if (o.hasta < emitida) salir("--hasta es anterior a la fecha de emisión");
const max = PLANES[o.plan];
let usuarios = o.usuarios === undefined ? max : Number(o.usuarios);
if (usuarios !== null && (!Number.isInteger(usuarios) || usuarios < 1)) salir("--usuarios debe ser un número entero positivo");
if (max !== null && usuarios > max) salir(`el plan ${o.plan} admite hasta ${max} usuario(s)`);
const id = o.id || `HRD-${emitida.slice(2, 4)}${emitida.slice(5, 7)}-${randomBytes(3).toString("hex").toUpperCase()}`;

const payload = { id, despacho: o.despacho.trim(), plan: o.plan, usuarios, hasta: o.hasta, emitida };
const cuerpo = PREFIJO + b64u(JSON.stringify(payload));
const firma = sign("sha256", Buffer.from(cuerpo), { key: priv, dsaEncoding: "ieee-p1363" });
const codigo = cuerpo + "." + b64u(firma);

if (!existsSync(REGISTRO)) writeFileSync(REGISTRO, "id;emitida;despacho;plan;usuarios;hasta;codigo\n");
appendFileSync(REGISTRO, [id, emitida, `"${payload.despacho.replace(/"/g, '""')}"`, o.plan, usuarios ?? "sin límite", o.hasta, codigo].join(";") + "\n");

console.error(`Licencia ${id} · ${payload.despacho} · plan ${o.plan} · ${usuarios === null ? "sin límite de usuarios" : usuarios + " usuario(s)"} · válida hasta ${o.hasta}`);
console.log(codigo);
