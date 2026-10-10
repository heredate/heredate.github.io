// Copia íntegra del programa tal como se cargó (para "Enviar a un compañero"); se captura antes de pintar nada.
const HTML_ORIGINAL = (() => { try { return "<!doctype html>\n" + document.documentElement.outerHTML; } catch (e) { return ""; } })();
// ───────────────────── Utilidades ─────────────────────
const grp = (n, d = 2) => { const neg = n < 0; const [i, f] = Math.abs(n || 0).toFixed(d).split("."); return (neg ? "−" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (f ? "," + f : ""); };
const eur = (n) => grp(n, 2) + " €"; const eur0 = (n) => grp(n, 0) + " €";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Fecha local del equipo (no UTC: entre las 00:00 y las 02:00 en España, toISOString() aún da el día anterior)
const isoLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoy = () => isoLocal();
const fechaLarga = (s) => s ? new Date(s + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "—";
const fechaCorta = (s) => s ? new Date(s + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
const dias = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const uid = () => Math.random().toString(36).slice(2, 9);
// Importes escritos a mano en los formatos habituales en España: «182.400», «182.400,50 €», «182 400», «1.234.567,8», «12,5 %»
// (y «1,234.56»). Devuelve NaN si no se entiende (letras, «1e9», varios signos). num() lo convierte en 0; numLeer() deja saber que no se entendió.
const numLeer = (v) => { if (typeof v === "number") return isFinite(v) ? v : NaN; if (v == null) return NaN; let s = String(v).replace(/[\s\u00a0\u202f\u2009']/g, "").replace(/^(€|eur)/i, "").replace(/(€|eur|euros|%)$/i, ""); if (!s) return NaN; const neg = /^[-−–]/.test(s); if (neg || s[0] === "+") s = s.slice(1); if (!/^[\d.,]*\d[\d.,]*$/.test(s)) return NaN; const p = s.lastIndexOf("."), c = s.lastIndexOf(","); let e = s, d = ""; if (p >= 0 && c >= 0) { const i = Math.max(p, c), otro = p > c ? "," : "."; e = s.slice(0, i); d = s.slice(i + 1); if (e.includes(s[i])) return NaN; e = e.split(otro).join(""); } else if (c >= 0) { if (s.indexOf(",") !== c) { if (!/^\d{1,3}(,\d{3})+$/.test(s)) return NaN; e = s.split(",").join(""); } else { e = s.slice(0, c); d = s.slice(c + 1); } } else if (p >= 0) { if (s.indexOf(".") !== p) { if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return NaN; e = s.split(".").join(""); } else if (/^\d{1,3}\.\d{3}$/.test(s)) e = s.replace(".", ""); else { e = s.slice(0, p); d = s.slice(p + 1); } } if (!/^\d*$/.test(e) || !/^\d*$/.test(d)) return NaN; const n = Number((e || "0") + (d ? "." + d : "")); return isFinite(n) ? (neg ? -n : n) : NaN; };
const num = (v) => { if (typeof v === "number") return isFinite(v) ? v : 0; if (v === "" || v == null) return 0; const n = numLeer(v); return isNaN(n) ? 0 : n; };
// En los campos: la cifra con formato; lo que no se entiende se enseña tal cual (con su aviso) en vez de vaciar el campo
// Porcentaje del causante en un bien en proindiviso: vacío o ilegible = 100 % (con aviso en el campo); 0 es 0 % (no 100 %); entre 0 y 100
const pctCausante = (v) => { const n = v === "" || v == null ? NaN : numLeer(v); return isNaN(n) ? 100 : Math.min(100, Math.max(0, n)); };
// Edad: número de 0 a 120 o «desconocida» (null). Nunca 0 por un texto ilegible (I2: convertía a un adulto en menor)
const edadNum = (v) => { if (v === "" || v == null) return null; const n = numLeer(String(v).replace(/\s*años?$/i, "")); return isNaN(n) || n < 0 || n > 120 ? null : n; };
const numStr = (v) => { if (v === "" || v == null) return ""; const n = numLeer(v); if (isNaN(n)) return String(v); if (!n) return typeof v === "string" && v.trim() ? "0" : ""; return n.toLocaleString("es-ES", { maximumFractionDigits: 2 }); };
const I = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l6 6 6-6"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  tax: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
  house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9H4z"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1"/><circle cx="16.5" cy="16" r="1"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
};
const TIPO_BIEN = { vivienda: ["Vivienda habitual", I.house], inmueble: ["Otro inmueble", I.house], cuenta: ["Cuenta o depósito", I.bank], valores: ["Acciones o fondos", I.chart], vehiculo: ["Vehículo", I.car], empresa: ["Empresa o negocio", I.brief], otro: ["Otro bien", I.box] };
const chipE = (e) => !e ? "" : e === "VERIFICADO" ? '<span class="chip V">VERIFICADO</span>' : e === "PENDIENTE" ? '<span class="chip P">PENDIENTE</span>' : '<span class="chip I">' + esc(e) + "</span>";
I.spark = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z"/></svg>';
I.send = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
I.stop = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
I.dl = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
I.camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
// Municipios con ordenanza: los de "introducir a mano" piden el porcentaje de bonificación
// Motivo por el que una ordenanza incorporada como datos no aplica sola la bonificación (requisito que el programa no conoce)
function ordManualMotivo(k) { const d = ORDENANZAS[k]?.datos; if (!d) return ""; if (d.bonifDesconocida) return "No hemos podido comprobar la bonificación de esta ordenanza: si la prevé, indica aquí el porcentaje."; const B = (Array.isArray(d.bonif) ? d.bonif.find((x) => x && (x.condicion || x.viviendaHeredero)) : d.bonif) || {}; return `La ordenanza da un ${Math.round((Number(B.pct) || 0) * 100)} % si se cumple: ${[B.condicion, B.viviendaHeredero ? "que el inmueble sea la vivienda habitual del heredero" : ""].filter(Boolean).join("; ")}. Si se cumple, indica aquí el porcentaje.`; }
const MANUAL_BONIF = ["OTRO", "HUELVA", "ALGECIRAS", "ROQUETAS", "EL_EJIDO", "SAN_FERNANDO", "TORREMOLINOS", "ESTEPONA", "MANRESA"];
const CCAA_ORD = (k) => ORDENANZAS[k].ccaa || "Andalucía";
const ORD_N = Object.keys(ORDENANZAS).length - 1, ORD_AND = Object.keys(ORDENANZAS).filter((k) => k !== "OTRO" && CCAA_ORD(k) === "Andalucía").length;
// Orden alfabético en español con un único Intl.Collator: localeCompare(…, "es") crea uno en cada comparación (lento al arrancar en el móvil)
const COLACION_ES = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator("es") : { compare: (a, b) => String(a).localeCompare(String(b), "es") };
const MUNICIPIOS = Object.entries(ORDENANZAS).filter(([k]) => k !== "OTRO").map(([k, o]) => [k, o.nombre]).sort((a, b) => COLACION_ES.compare(a[1], b[1])).concat([["OTRO", "Otro municipio"]]);
function optMunicipios(sel) {
  const orden = ["Andalucía"], grupos = {};
  for (const [k, t] of MUNICIPIOS) { if (k === "OTRO") continue; const g = CCAA_ORD(k); (grupos[g] = grupos[g] || []).push([k, t]); }
  const nombres = orden.concat(Object.keys(grupos).filter((g) => !orden.includes(g)).sort(COLACION_ES.compare));
  const op = ([k, t]) => `<option value="${k}" ${sel === k ? "selected" : ""}>${esc(t)}${ORDENANZAS[k].estadoTipo !== "VERIFICADO" ? " · en verificación" : ""}</option>`;
  return nombres.map((g) => `<optgroup label="${esc(g)}">${grupos[g].map(op).join("")}</optgroup>`).join("") + `<option value="OTRO" ${sel === "OTRO" ? "selected" : ""}>Otro municipio</option>`;
}
// Texto con formato mínimo (negritas, listas y párrafos) para las respuestas de la IA
function md(t) {
  const e = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  return e.split(/\n{2,}/).map((blk) => { const ls = blk.split("\n"); if (ls.every((l) => /^\s*([-•*]|\d+[.)])\s+/.test(l))) return "<ul>" + ls.map((l) => "<li>" + l.replace(/^\s*([-•*]|\d+[.)])\s+/, "") + "</li>").join("") + "</ul>"; return "<p>" + ls.join("<br>") + "</p>"; }).join("");
}
// Capacidades del visor de Claude (IA y descargas). Si no están, la app funciona igual sin ellas.
let SAMPLE = null, LIM = null, DL = null;
(async () => { try { if (!window.claude || !window.claude.use) return; const [s, d] = await Promise.all([window.claude.use("sample").catch(() => null), window.claude.use("downloads").catch(() => null)]); SAMPLE = s; DL = d; if (SAMPLE) LIM = await SAMPLE.limits().catch(() => null); render(); } catch (e) {} })();
// Word (.docx) mínimo generado en el propio dispositivo
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return (u) => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = t[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }; })();
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const u16 = (v) => [v & 255, (v >> 8) & 255], u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  for (const [name, str] of files) {
    const nm = enc.encode(name), data = enc.encode(str), crc = CRC(data);
    const head = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0)];
    parts.push(new Uint8Array(head), nm, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm);
    off += head.length + nm.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(csize), ...u32(off), 0, 0]);
  return new Blob([...parts, ...central, end], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
// El Word con estilos, membrete, pie, tablas y listas lo genera esrDocx (escritos.js); aquí queda la llamada única
function docx(texto, o) { return esrDocx(texto, o); }
async function descargar(nombre, data) {
  nombre = String(nombre).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").replace(/[\\/:*?"<>|]/g, "");
  if (DL) { try { await DL.save({ filename: nombre, data }); } catch (e) { if (e && e.code !== "declined") toast("No se pudo descargar"); } return; }
  try { const b = data instanceof Blob ? data : new Blob([data], { type: nombre.endsWith(".json") ? "application/json" : "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); } catch (e) { toast("No se pudo descargar"); }
}

// ───────────────────── Almacenamiento (solo en este dispositivo) ─────────────────────
const KEY = "cauce.v1";
let DB = { expedientes: [], modo: "profesional", tema: "claro" };
// null = datos legibles · "cifrado" = protegidos con contraseña · "danado" = no se pueden leer · "idb" = están en IndexedDB. Lo resuelve sgArranque (seguridad.js); nunca se sobrescriben.
let DB_BLOQUEO = null;
{ let s = null; try { DB_BLOQUEO = localStorage.getItem(KEY + ".enc") ? "cifrado" : null; if (!DB_BLOQUEO) s = localStorage.getItem(KEY); } catch (e) {}
  if (s) { try { const o = JSON.parse(s); if (!o || typeof o !== "object" || Array.isArray(o) || ("expedientes" in o && !Array.isArray(o.expedientes))) throw 0; if (o.f === "hereda+idb") DB_BLOQUEO = "idb"; /* los expedientes están en IndexedDB: los lee sgArranque (seguridad.js, I11) */ else DB = Object.assign(DB, o); } catch (e) { DB_BLOQUEO = "danado"; } } }
// Estética P6: el tema claro pasa a ser el de por defecto; se migra una sola vez (el grafito sigue en Ajustes → Apariencia)
// (solo en memoria: el guardar() del arranque lo persiste; aquí no se escribe nada por si los datos están dañados)
if (!DB_BLOQUEO && DB.temaV !== 2) { DB.tema = "claro"; DB.temaV = 2; }
const guardar = () => { if (typeof sgGuardar === "function") return sgGuardar(); if (DB_BLOQUEO) return; try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };

// ───────────────────── Ejemplos ─────────────────────
function ejemplo(tipo) {
  const base = { id: uid(), creado: hoy(), ajuar: "sts", enPlazo: true, aplicarEmpresa: false, tareas: {}, ejemplo: true, deudas: [], gastos: [] };
  if (tipo === "mad") return { ...base, nombre: "Hilario Chaparro Madueño", fecha: "2026-07-02", ccaa: "MAD", civil: "gananciales", testamento: "no",
    personas: [ { id: "p1", nombre: "Elvira Adame", relacion: "conyuge", edad: 72 }, { id: "p2", nombre: "Domingo Chaparro", relacion: "hijo", edad: 44, patrimonioPreexistente: 90000 }, { id: "p3", nombre: "Virginia Chaparro", relacion: "hijo", edad: 40, patrimonioPreexistente: 60000 } ],
    bienes: [ { id: "b1", tipo: "vivienda", descripcion: "Piso en Chamberí", valor: 520000, valorReferencia: 480000, titularidad: "ganancial", municipio: "MADRID", valorCatastralTotal: 210000, valorCatastralSuelo: 118000, fechaAdq: "1996-04-10", valorAdq: 150000 },
      { id: "b2", tipo: "cuenta", descripcion: "Cuentas en dos bancos", valor: 86000, titularidad: "ganancial" }, { id: "b3", tipo: "valores", descripcion: "Fondo de inversión", valor: 45000, titularidad: "privativo" } ],
    gastos: [{ concepto: "Funeral", importe: 4800 }] };
  if (tipo === "cat") return { ...base, nombre: "Gemma Masferrer", fecha: "2026-05-20", ccaa: "CAT", civil: "viudo", testamento: "porcentajes",
    personas: [ { id: "p1", nombre: "Albert Escarré", relacion: "hijo", edad: 51, pct: 50 }, { id: "p2", nombre: "Neus Escarré", relacion: "hijo", edad: 47, pct: 50 }, { id: "p3", nombre: "Arnau Pujadas", relacion: "sobrino", edad: 29, pct: 0 } ],
    bienes: [ { id: "b1", tipo: "vivienda", descripcion: "Pis a Gràcia", valor: 410000, valorReferencia: 395000, titularidad: "privativo", municipio: "OTRO", tipoManual: 30, bonifManual: 0, valorCatastralTotal: 160000, valorCatastralSuelo: 70000, fechaAdq: "1988-09-01", valorAdq: 60000 },
      { id: "b2", tipo: "cuenta", descripcion: "Compte d'estalvi", valor: 140000, titularidad: "privativo" }, { id: "b3", tipo: "otro", descripcion: "Colección de pintura", valor: 30000, titularidad: "privativo", legatarioId: "p3" } ],
    gastos: [{ concepto: "Funeral", importe: 5200 }] };
  if (tipo === "est") return { ...base, nombre: "Olga Puertas Nogales", fecha: "2026-07-15", ccaa: "AND", civil: "viudo", testamento: "porcentajes",
    despacho: { cliente: "Remedios Haro Puertas", ref: "EXP-2026-021", honModo: "pct", honPct: 1, honMin: 1200, provision: 800, notaria: 1400, registro: 320, otros: 150, docs: { defuncion: true, ultimas: true, testamento: true } },
    personas: [ { id: "p1", nombre: "Remedios Haro Puertas", relacion: "hijo", edad: 52, pct: 70, convivio2anios: true, empadronado: true }, { id: "p2", nombre: "Damián Puertas Lasheras", relacion: "sobrino", edad: 41, pct: 30, estirpe: "Aurelio Puertas Nogales" } ],
    bienes: [ { id: "b1", tipo: "vivienda", descripcion: "Piso en Pedregalejo, Málaga", valor: 340000, valorReferencia: 318000, titularidad: "privativo", municipio: "MALAGA", valorCatastralTotal: 118000, valorCatastralSuelo: 51000, fechaAdq: "1994-03-10", valorAdq: 95000 },
      { id: "b2", tipo: "inmueble", descripcion: "Apartamento en Torremolinos", valor: 190000, valorReferencia: 206000, titularidad: "privativo", municipio: "TORREMOLINOS", valorCatastralTotal: 72000, valorCatastralSuelo: 31000, fechaAdq: "2005-07-01", valorAdq: 150000 },
      { id: "b3", tipo: "cuenta", descripcion: "Cuentas y depósito a plazo", valor: 112000, titularidad: "privativo" }, { id: "b4", tipo: "valores", descripcion: "Cartera de fondos", valor: 64000, titularidad: "privativo" }, { id: "b5", tipo: "vehiculo", descripcion: "Turismo", valor: 9000, titularidad: "privativo" } ],
    gastos: [{ concepto: "Funeral", importe: 5200 }] };
  if (tipo === "mar") return { ...base, nombre: "Eduardo Escalona Cosano", fecha: "2026-08-04", ccaa: "AND", civil: "gananciales", testamento: "usufructo",
    despacho: { cliente: "Begoña Escalona Osuna", ref: "EXP-2026-014", honModo: "fijo", honFijo: 1800, honPct: 1, honMin: 900, provision: 600, notaria: 1600, registro: 250, otros: 120, docs: { defuncion: true, ultimas: true, testamento: true } },
    personas: [ { id: "p1", nombre: "Patricia Osuna", relacion: "conyuge", edad: 74, seguro: 30000 }, { id: "p2", nombre: "Begoña Escalona", relacion: "hijo", edad: 46 }, { id: "p3", nombre: "Amador Escalona", relacion: "hijo", edad: 43 }, { id: "p4", nombre: "Nieves Escalona", relacion: "hijo", edad: 38 } ],
    bienes: [ { id: "b1", tipo: "vivienda", descripcion: "Vivienda en Nueva Andalucía, Marbella", valor: 480000, valorReferencia: 452000, titularidad: "ganancial", municipio: "MARBELLA", valorCatastralTotal: 190000, valorCatastralSuelo: 95000, fechaAdq: "1999-05-20", valorAdq: 130000 },
      { id: "b2", tipo: "inmueble", descripcion: "Local comercial en San Pedro de Alcántara", valor: 160000, valorReferencia: 148000, titularidad: "privativo", municipio: "MARBELLA", valorCatastralTotal: 70000, valorCatastralSuelo: 30000, fechaAdq: "2008-02-11", valorAdq: 120000 },
      { id: "b3", tipo: "cuenta", descripcion: "Cuentas corrientes y depósito", valor: 120000, titularidad: "ganancial" }, { id: "b4", tipo: "valores", descripcion: "Fondo de inversión", valor: 60000, titularidad: "privativo" } ],
    gastos: [{ concepto: "Funeral", importe: 4500 }] };
  return { ...base, nombre: "Federico Porras Olivares", fecha: "2026-06-03", ccaa: "AND", civil: "soltero", testamento: "no",
    personas: [ { id: "p1", nombre: "Ernesto Porras", relacion: "hermano", edad: 68, convivio2anios: true }, { id: "p2", nombre: "Alicia Porras", relacion: "hermano", edad: 64 } ],
    bienes: [ { id: "b1", tipo: "vivienda", descripcion: "Piso en El Palo, Málaga", valor: 210000, valorReferencia: 198000, titularidad: "privativo", municipio: "MALAGA", valorCatastralTotal: 95000, valorCatastralSuelo: 38000, fechaAdq: "2004-06-01", valorAdq: 90000 },
      { id: "b2", tipo: "cuenta", descripcion: "Cuenta corriente", valor: 36000, titularidad: "privativo" }, { id: "b3", tipo: "vehiculo", descripcion: "Turismo", valor: 6000, titularidad: "privativo" } ],
    gastos: [{ concepto: "Funeral", importe: 4200 }] };
}

// ───────────────────── Cálculo del expediente ─────────────────────
function casoMotor(x) {
  const reparto = x.testamento === "usufructo" ? "usufructoUniversal" : x.testamento === "porcentajes" ? "porcentajes" : "intestado";
  const viv = (x.bienes || []).find((b) => b.tipo === "vivienda");
  const casado = x.civil === "gananciales" || x.civil === "separacion";
  return {
    fechaFallecimiento: x.fecha, ccaa: x.ccaa === "EST" && x.ccaaBienes ? x.ccaaBienes : x.ccaa, criterioVivienda: x.criterioVivienda || "DGT", viviendaA: x.viviendaA, noAplicarVivienda: !!x.noAplicarVivienda, ajuar: x.ajuar && x.ajuar !== "sts" ? x.ajuar : undefined, enPlazo: x.enPlazo !== false, conRequerimiento: x.requerimiento === true, aplicarEmpresa: !!x.aplicarEmpresa, reparto, ...(typeof casoMotorJur === "function" ? casoMotorJur(x) : {}), // C2 e I6 (control de calidad 07-10-2026): plazo derivado, recargo y vecindad civil, en diagnostico.js
    conyugeViviendaCatastral: casado && viv ? num(viv.valorCatastralTotal) : 0,
    bienes: (x.bienes || []).map((b) => ({ id: b.id, tipo: b.tipo === "vivienda" ? "inmueble" : b.tipo, esViviendaHabitual: b.tipo === "vivienda", valor: num(b.valor), valorReferencia: num(b.valorReferencia), titularidad: b.titularidad || "privativo", porcentaje: pctCausante(b.porcentaje), legatarioId: b.legatarioId || undefined, descripcion: b.descripcion, usoResidencial: b.usoResidencial == null ? undefined : !!b.usoResidencial, arrendadoOCedido: !!b.arrendadoOCedido, troncal: !!b.troncal || undefined, lineaTroncal: b.troncal ? b.lineaTroncal || undefined : undefined })),
    deudas: (x.deudas || []).map((d) => ({ importe: num(d.importe), ganancial: !!d.ganancial })),
    gastos: (x.gastos || []).map((g) => ({ importe: num(g.importe) })),
    seguros: (x.personas || []).filter((p) => num(p.seguro) > 0).map((p) => ({ beneficiarioId: p.id, importe: num(p.seguro) })),
    herederos: (x.personas || []).map((p) => ({ id: p.id, nombre: p.nombre || "Sin nombre", relacion: p.relacion, edad: edadNum(p.edad), inscrita: !!p.inscrita, registroPareja: p.registroPareja || undefined, medio: !!p.medio, separado: !!p.separado, requisitoLaboralEmpresa: !!p.requisitoLaboralEmpresa, lineaAsc: p.lineaAsc, discapacidad: num(p.discapacidad), patrimonioPreexistente: num(p.patrimonioPreexistente), convivio2anios: !!p.convivio2anios, renuncia: !!p.renuncia, pct: num(p.pct), estirpe: p.estirpe, donacionesPreviasBL: num(p.donaciones) })),
  };
}
// La pareja de hecho no inscrita se trata como extraño también en la plusvalía (auditoría 01-10-2026, C-5), igual que en el ISD
const titularPlus = (p) => ({ id: p.id, nombre: p.nombre, relacion: p.relacion === "pareja_hecho" && !p.inscrita ? "pareja_no_inscrita" : p.relacion, inscrita: !!p.inscrita, colectivoVulnerable: !!p.colectivoVulnerable, edad: p.edad, convivio2anios: !!p.convivio2anios, convivio1anio: p.convivio2anios ? true : undefined, empadronadoMunicipio: !!p.empadronado, empadronadoMunicipio1anio: !!p.empadronado, ingresosAnuales: p.ingresos === "" || p.ingresos == null ? null : num(p.ingresos) });
// tipoManual: número (admite «29,5»), entre 0 y el máximo legal del 30 % (art. 108.1 TRLRHL); vacío = tipo de la ordenanza o, sin ordenanza, el 30 %
const tipoManualNum = (v) => (v == null || String(v).trim() === "" ? undefined : Math.min(30, Math.max(0, num(v))));
const ineBien = (b) => b.muniIne || (b.municipio && b.municipio !== "OTRO" && typeof MUNI_CLAVES === "object" ? MUNI_CLAVES[b.municipio] || "" : "");
// G09: municipio (código INE y nombre) de cada inmueble urbano, para contar los festivos de su ayuntamiento en el plazo de la plusvalía
function inmueblesMuniExp(x) { return (x.bienes || []).filter((b) => b.tipo === "vivienda" || b.tipo === "inmueble").map((b) => ({ ine: ineBien(b), nombre: b.muniNombre || (ORDENANZAS[b.municipio] || {}).nombre || "" })).filter((b) => b.ine); }
function datosPlus(x, b, caudal) { return { municipio: b.municipio || "OTRO", ine: ineBien(b), tipoManual: tipoManualNum(b.tipoManual), bonifManual: Math.min(100, Math.max(0, num(b.bonifManual))), cuota: cuotaCausante({ titularidad: b.titularidad, porcentaje: pctCausante(b.porcentaje) }), valorCatastralTotal: num(b.valorCatastralTotal), valorCatastralSuelo: num(b.valorCatastralSuelo), adquisicion: { fecha: b.fechaAdq, valor: num(b.valorAdq) }, valorTransmision: Math.max(num(b.valor), num(b.valorReferencia)), esViviendaHabitual: b.tipo === "vivienda", esLocalAfecto: !!b.localAfecto, causanteEmpadronado: x.causanteEmpadronado === true ? true : undefined }; }
const plusCompleto = (b) => (b.tipo === "vivienda" || b.tipo === "inmueble") && num(b.valorCatastralTotal) && num(b.valorCatastralSuelo) && b.fechaAdq;
// ── Copia de los cálculos por expediente (I10). calcular() es una función pura del expediente (y del día): con 200 expedientes,
// cada pintado de la cartera lo repetía cientos de veces. La clave es la huella del JSON del expediente más la fecha de hoy, así
// que cualquier cambio en sus datos (venga de donde venga) da otra clave y se recalcula; no hace falta invalidar a mano.
// Los resultados se comparten: quien los use no debe modificarlos (nadie lo hace hoy; se comprueba en tools/qa/robustez.mjs).
const CALC = { memo: new Map(), max: 3000, aciertos: 0, fallos: 0, errores: new Map() };
function calcHuella(x) {
  let s; try { s = JSON.stringify(x); } catch (e) { return null; }
  if (s == null) return null;
  let a = 0x811c9dc5, b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = (Math.imul(b, 33) + c) | 0; }
  return (a >>> 0).toString(36) + "." + (b >>> 0).toString(36) + "." + s.length.toString(36);
}
// Devuelve f() guardado bajo «tipo + huella de x + hoy»; h permite reutilizar una huella ya calculada
function calcMemo(tipo, x, f, h) {
  const hu = h || calcHuella(x); if (!hu) return f();
  const k = tipo + "|" + hoy() + "|" + hu, M = CALC.memo;
  if (M.has(k)) { CALC.aciertos++; const v = M.get(k); M.delete(k); M.set(k, v); return v; }
  CALC.fallos++; const v = f(); M.set(k, v);
  if (M.size > CALC.max) M.delete(M.keys().next().value);
  return v;
}
function calcVaciar() { CALC.memo.clear(); }
// Un expediente con un dato imposible nunca debe tumbar la cartera (C1): si el cálculo falla, se trata como «faltan datos» y se anota el error
function calcular(x) {
  if (!x || typeof x !== "object") return null;
  const R = calcMemo("c", x, () => { try { const r = calcularBase(x); CALC.errores.delete(x.id); return r; } catch (e) { console.error("calcular", x.id, e); CALC.errores.set(x.id, String((e && e.message) || e)); return null; } });
  // R.plus guarda el bien: se apunta al objeto de este expediente (el resultado pudo calcularse con una copia idéntica)
  if (R && R.plus && Array.isArray(x.bienes)) for (const q of R.plus) { if (q.b && !x.bienes.includes(q.b)) { const nb = x.bienes.find((b) => b && b.id === q.b.id); if (nb) q.b = nb; } }
  return R;
}
function calcularBase(x) {
  if (!x.fecha || !x.ccaa || !(x.personas || []).length || !(x.bienes || []).length) return null;
  const isd = calcularISD(casoMotor(x));
  for (const t of legadosSinBien(x)) isd.alertas.unshift(t);
  const plus = (x.bienes || []).filter(plusCompleto).map((b) => {
    const adj = b.adjudicadoA && (x.personas || []).find((p) => p.id === b.adjudicadoA && !p.renuncia);
    const leg = b.legatarioId && (x.personas || []).find((p) => p.id === b.legatarioId && !p.renuncia); // I8: legado a persona quitada o que renuncia → vuelve a la masa
    const titulares = leg ? [{ heredero: titularPlus(leg), fraccion: 1 }] : adj ? [{ heredero: titularPlus(adj), fraccion: 1 }] : (x.personas || []).filter((p) => !p.renuncia).map((p) => ({ heredero: titularPlus(p), fraccion: (isd.derechos[p.id] || []).reduce((s, d) => s + (d.tipo === "pleno" ? d.fraccion : d.tipo === "usufructo" ? d.fraccion * pctUsufructoVitalicio(num(p.edad) || 40) : d.fraccion * (1 - pctUsufructoVitalicio(num(persona(x, d.usufructuarioId).edad) || 40))), 0) })).filter((t) => t.fraccion > 0);
    const r = calcularPlusvalia({ inmueble: datosPlus(x, b), titulares, fecha: x.fecha, caudalTotal: isd.masa.bruto });
    if ((b.municipio || "OTRO") === "OTRO") {
      // Municipio sin ordenanza incorporada. Tipo, por orden: el introducido a mano; el que el ayuntamiento comunica a Hacienda para 2026
      // (capitales y municipios de más de 50.000 habitantes); o el máximo legal del 30 % (art. 108.1 TRLRHL). Coeficientes máximos (art. 107.4)
      // y bonificación solo si se introduce: la cifra es la máxima posible y la real será igual o menor.
      if (b.muniNombre) r.municipio = b.muniNombre;
      const pv = typeof muniProv === "function" ? muniProv(b.muniIne) : null;
      const manual = r.fuenteTipo === "manual", hac = r.fuenteTipo === "hacienda";
      const foral = !!(pv && ["ALA", "BIZ", "GIP", "NAV"].includes(pv.ccaa)), F = r.foral; // régimen foral que aplica el motor (tipo máximo, coeficientes y exención propios)
      const bon = num(b.bonifManual) > 0, tPc = grp(r.tipo * 100, r.tipo * 100 % 1 ? 2 : 0), pcN = (v) => grp(v, v % 1 ? 2 : 0);
      r.estimacion = { municipio: b.muniNombre || "", manual, hacienda: hac, bonifManual: num(b.bonifManual), foral, bop: pv && pv.bop ? pv.bop : null, prov: pv ? pv.n : "" };
      r.alertas = [...(r.alertas || [])];
      if (manual) r.alertas.unshift(`${num(b.tipoManual) > 30 ? `El tipo introducido (${grp(num(b.tipoManual), 2)} %) supera el máximo legal: se aplica el 30 % (art. 108.1 TRLRHL). ` : ""}Tipo (${pcN(Math.min(30, num(b.tipoManual)))} %) y bonificación (${pcN(num(b.bonifManual))} %) introducidos a mano según la ordenanza de ${b.muniNombre || "el municipio"}; coeficientes limitados al máximo legal (${F ? "tabla foral de " + F.nombre : "art. 107.4 TRLRHL"}).`);
      else if (hac) r.alertas.unshift(`Tipo del ${tPc} %: el que el Ayuntamiento de ${b.muniNombre || r.hacienda.nombre} comunica al Ministerio de Hacienda para 2026. Coeficientes máximos legales (art. 107.4 TRLRHL)${bon ? ` y bonificación del ${pcN(num(b.bonifManual))} % introducida a mano` : " y sin bonificación: Hacienda no publica las bonificaciones, así que la cuota real será igual o menor si la ordenanza prevé alguna para herencias"}.`);
      else r.alertas.unshift(`Estimación prudente con el tipo máximo legal (${F ? `${pcN(F.tipoMax * 100)} %, ${F.normaTipo}` : "30 %, art. 108.1 TRLRHL"}), los coeficientes máximos (${F ? "tabla foral de " + F.nombre : "art. 107.4 TRLRHL"})${F && F.exencion ? ", la exención legal de las herencias entre ascendientes, descendientes y cónyuges" : ""} y ${bon ? `la bonificación del ${pcN(num(b.bonifManual))} % introducida a mano` : "sin bonificación"}: ${b.muniNombre ? `consulta la ordenanza fiscal de ${b.muniNombre}` : "identifica el municipio y consulta su ordenanza fiscal"}${pv && pv.bop ? ` (${pv.bop.nombre})` : ""} e introduce el tipo y la bonificación reales.`);
      r.estadoTipo = manual ? "INTRODUCIDO" : hac ? "VERIFICADO" : "ESTIMADO";
      if (!manual && !bon) r.porTitular = r.porTitular.map((q) => q.exento ? q : ({ ...q, norma: hac ? "Sin bonificación: Hacienda no publica las de cada ordenanza (introdúcela en la ficha del bien si la hay)" : "Sin bonificación en la estimación: la ordenanza no está incorporada (introduce la suya en la ficha del bien)", estado: "ESTIMADO" }));
      // El motor ya aplica el régimen foral y añade su aviso (norma, tipo máximo, coeficientes pendientes de cotejo): aquí solo se marca como pendiente
      if (foral) r.estadoTipo = "PENDIENTE";
    }
    return { b, r };
  });
  const plazos = calcularPlazos(x.fecha, { autonomo: !!x.autonomo, hayInmuebles: (x.bienes || []).some((b) => b.tipo === "vivienda" || b.tipo === "inmueble"), hayVehiculos: (x.bienes || []).some((b) => b.tipo === "vehiculo"), hayConyuge: (x.personas || []).some((p) => p.relacion === "conyuge"), ccaa: x.ccaa, ine: x.muniPlazos || "", inmuebles: inmueblesMuniExp(x) });
  return { isd, plus, plazos, totalPlus: plus.reduce((s, p) => s + p.r.total, 0) };
}
// Auditoría r5 (H9): legados leídos del testamento (persona.notaLegado) sin ningún bien marcado como legado a esa persona. Antes la nota se
// guardaba y no se mostraba en ningún sitio: el bien legado se repartía entre los herederos y el legatario no recibía nada, sin aviso.
function legadosSinBien(x) {
  const B = (x && x.bienes) || [];
  return ((x && x.personas) || []).filter((p) => p && p.notaLegado && !p.renuncia && !B.some((b) => b && b.legatarioId === p.id)).map((p) => {
    const dinero = /\b(?:euros?|€|cantidad|metálico)\b/i.test(p.notaLegado);
    return `${p.nombre}: el testamento le lega «${String(p.notaLegado).slice(0, 120)}», pero ningún bien del expediente está marcado como legado a su favor, así que el cálculo lo reparte entre los herederos. ${dinero ? "Es un legado de dinero: el programa no lo descuenta solo; réstalo de la cuenta con que se pague y añade ese importe como bien legado." : "Márcalo en la ficha del bien («Legado a»)."}`;
  });
}
const persona = (x, id) => (x.personas || []).find((p) => p.id === id) || { nombre: "—", relacion: "extrano" };
const nombreTerr = (id) => (TERRITORIOS.find((t) => t[0] === id) || [id, id])[1];

// ───────────────────── Documentos ─────────────────────
const REV = (t) => `⟦REVISIÓN OBLIGATORIA POR ABOGADO: ${t}⟧`;
function docTexto(x, R, tipo) {
  // Escritos de escritos.js (escritura, cuaderno, renuncia, 790, familia, Catastro, plusvalía); los demás, aquí. Los huecos «[dato]» pasan a «⟦dato⟧».
  const ES = { escritura: esrEscritura, cuaderno: esrCuaderno, renuncia: esrRenuncia, solicitud790: esrSolicitud790, cartaFamilia: esrCartaFamilia, catastro: esrCatastro, plusvalia: esrPlusvalia, aplazamiento: typeof apEscrito === "function" ? apEscrito : null }[tipo];
  const t0 = esrHuecos(ES ? ES(x, R) : docTexto0(x, R, tipo));
  return x.testamento === "nose" && tipo !== "certificados" && t0 ? REV("aún no consta si hay testamento: este borrador se ha preparado como si no lo hubiera. Confírmalo con el certificado de últimas voluntades antes de usarlo.") + "\n\n" + t0 : t0;
}
function docTexto0(x, R, tipo) {
  const hs = (x.personas || []).filter((p) => !p.renuncia);
  const menoresC = hs.some((h) => h.edad !== "" && h.edad != null && num(h.edad) < 18);
  const lugar = (typeof despachoContacto === "function" ? despachoContacto().localidad : DB.despacho && DB.despacho.localidad) || "[localidad]", F = "[fecha de firma]", F2 = F;
  // Membrete del despacho para los escritos que firma el abogado (contacto de Ajustes; lo que falte no se inventa)
  const KD = typeof despachoContacto === "function" ? despachoContacto() : { nombre: DB.despacho?.nombre || "", linea: "", postal: "", nif: "" };
  const membrete = KD.nombre || KD.linea ? `${KD.nombre}${KD.nombre && KD.linea ? "\n" : ""}${KD.linea}\n\n` : "";
  const causante = x.nombre || "[nombre del causante]";
  // Género (P10, H36): tratamiento y concordancia si consta persona.genero / x.generoCausante; si no, redacción neutra sin barras
  const cG = gnCaus(x), trC = gnTrat(cG), falC = gnO(cG, "fallecido", "fallecida", "que falleció");
  const relP = (p) => gnRel(p), unico = (p) => gnO(p, "heredero único", "heredera única", "única persona heredera");
  const fm = fechaLarga(x.fecha);
  const pl = Object.fromEntries(R.plazos.map((p) => [p.id, p]));
  // Datos de identificación que ya constan en el expediente (Listo para firmar): se usan; lo que falta queda como hueco
  const nifC = x.nifCausante || "[NIF]", domC = x.domicilioCausante || "[domicilio]", nifP = (p) => (p && p.nif) || "[NIF]", domP = (p) => (p && p.domicilio) || "[domicilio]";
  const tN = x.firma?.tNotario || "[notario]", tF = x.firma?.tFecha ? fechaLarga(x.firma.tFecha) : "[fecha]", tP = x.firma?.tProtocolo || "[protocolo]";
  const vecR = R.isd.vecindad, vecT = vecR && !vecR.supuesta ? (vecR.id === "comun" ? "común" : (typeof VECINDADES === "object" && VECINDADES[vecR.id]) || vecR.id) : "[vecindad]";
  const firmas = hs.map((h) => `Fdo.: ${h.nombre}`).join("\n");
  if (tipo === "liquidacion") return docLiquidacion(x, R);
  if (tipo === "notaria") {
    const d = x.despacho || {}; const E = estrategia(x); const ab = (DB.despacho?.abogados || []).find((a) => a.id === x.responsable);
    const derechos = (id) => (R.isd.derechos[id] || []).map((q) => `${q.tipo === "pleno" ? "pleno dominio" : q.tipo === "usufructo" ? "usufructo" : "nuda propiedad"} ${grp(q.fraccion * 100, q.fraccion * 100 % 1 ? 2 : 0)} %`).join(" y ") || "sin derechos en el reparto";
    const docsN = docsNecesarios(x);
    return `${membrete}NOTA PARA LA NOTARÍA\nEscritura de aceptación y adjudicación de herencia\n\nReferencia: ${d.ref || "[referencia]"}${DB.despacho?.nombre ? " · " + DB.despacho.nombre : ""}${ab ? "\nAbogado responsable: " + ab.nombre : ""}\nFecha: ${fechaLarga(hoy())}\n\n1. CAUSANTE\n${trC}${causante}, con NIF ${x.nifCausante || "[NIF]"}, ${falC} el ${fm}. Estado civil: ${({ gananciales: gnEC(cG, "casado_gananciales"), separacion: gnEC(cG, "casado_separacion"), pareja: "pareja de hecho", viudo: gnEC(cG, "viudo"), soltero: gnO(cG, "soltero o divorciado", "soltera o divorciada", "soltería o divorcio") })[x.civil] || "[estado civil]"}. Último domicilio: ${domC}. Vecindad civil: ${vecT}. Residencia a efectos fiscales: ${nombreTerr(x.ccaa)}.\n\n2. TÍTULO SUCESORIO\n${x.testamento === "no" ? `Sucesión intestada: acta de notoriedad de declaración de herederos autorizada por el notario ${tN} el ${tF}, número ${tP} (arts. 55 y 56 de la Ley del Notariado).` : x.testamento === "nose" ? REV("pendiente del certificado de últimas voluntades para conocer el título sucesorio.") : `Testamento otorgado ante el notario ${tN} el ${tF}, número de protocolo ${tP}.`}\n\n3. HEREDEROS Y LEGATARIOS\n${(x.personas || []).map((p) => `- ${p.nombre || "[nombre]"}, ${gnRel(p)}${p.edad !== "" && p.edad != null ? ", " + p.edad + " años" : ""}, NIF ${nifP(p)}: ${p.renuncia ? "RENUNCIA a la herencia" : derechos(p.id)}.`).join("\n")}\n\n4. INVENTARIO\n${(x.bienes || []).map((b) => `- ${TIPO_BIEN[b.tipo][0]}: ${b.descripcion || "[descripción]"}. Titularidad: ${b.titularidad === "ganancial" ? "ganancial" : b.titularidad === "proindiviso" ? num(b.porcentaje) + " %" : "privativa"}. Valor declarado ${eur(num(b.valor))}${num(b.valorReferencia) ? `; valor de referencia ${eur(num(b.valorReferencia))}` : ""}.${b.tipo === "vivienda" || b.tipo === "inmueble" ? ` Referencia catastral ${b.refCatastral || "[RC]"}.` + " Finca registral [finca], Registro de la Propiedad de [registro]." : ""}${b.legatarioId ? " Legado a " + (persona(x, b.legatarioId).nombre || "[legatario]") + "." : ""}`).join("\n")}\n\nDeudas deducibles: ${eur(R.isd.masa.deudas)}. Gastos de última enfermedad y entierro: ${eur(R.isd.masa.gastos)}.${R.isd.masa.gananciales ? `\n\n5. LIQUIDACIÓN DE LA SOCIEDAD DE GANANCIALES\nBienes gananciales por ${eur(R.isd.masa.gananciales)}; corresponde al cónyuge viudo la mitad, ${eur(R.isd.masa.mitadViudo)}, que no forma parte de la herencia.` : ""}\n\n${R.isd.masa.gananciales ? 6 : 5}. ADJUDICACIÓN PROPUESTA\n${(() => { const C = typeof cuadroParticion === "function" ? cuadroParticion(x, R) : null; return C && (C.hayAdjudicaciones || C.excesos.length) ? `${C.adjudicaciones.map((a) => `- ${a.aNombre}: ${a.b.descripcion || TIPO_BIEN[a.b.tipo][0]} (${a.tipo === "legado" ? "legado" : "adjudicado entero"}, ${eur0(a.v)}).`).join("\n")}${C.proindiviso.length ? `\n- En proindiviso según los derechos de cada uno: ${C.proindiviso.map((b) => b.descripcion || TIPO_BIEN[b.tipo][0]).join(", ")}.` : ""}${C.compensaciones.length ? `\n- Compensaciones en dinero: ${cpTxtCompensaciones(C)}.\n- ${C.excesos.map((e) => `Exceso de ${e.nombre}: ${eur(e.exceso)} · ${e.txtCoste} · coste ${eur(e.trib.coste)}`).join("\n- ")}` : ""}\n\n` : ""; })()}${E && E.LT && E.LT.aplica && !(x.bienes || []).some((b) => b.adjudicadoA) ? E.LT.L.map((l) => `- ${l.p.nombre}: ${[...l.bienes.map((b) => b.descripcion || TIPO_BIEN[b.tipo][0]), l.dinero > 1 ? "dinero por " + eur0(l.dinero) : ""].filter(Boolean).join(", ")} (le corresponde ${eur0(l.objetivo)}; se adjudica ${eur0(l.total)}).`).join("\n") + (E.LT.excesos.length ? "\n" + REV("hay excesos de adjudicación: " + E.LT.excesos.map((e) => `${e.p.nombre} ${eur0(e.importe)}`).join("; ") + ". Prever la compensación en metálico y su tributación.") : "") : (x.bienes || []).some((b) => b.adjudicadoA) ? "" : "Adjudicación pro indiviso según las cuotas del título sucesorio" + (E && E.LT && !E.LT.aplica ? ". " + E.LT.motivo : ".")}\n\n${R.isd.masa.gananciales ? 7 : 6}. DOCUMENTACIÓN QUE SE APORTA\n${docsN.map(([id, tt]) => `- ${tt}: ${d.docs?.[id] ? "aportado" : "PENDIENTE"}`).join("\n")}\n\n${R.isd.masa.gananciales ? 8 : 7}. IMPUESTOS\nImpuesto sobre Sucesiones (${R.isd.territorio}): ${R.isd.herederos.map((h) => `${h.nombre} ${eur(h.aIngresar)}`).join("; ")}. Total ${eur(R.isd.total)}.\nPlusvalía municipal estimada: ${eur(R.totalPlus)}.\nPara inscribir, el Registro exigirá la presentación de las autoliquidaciones (art. 254 de la Ley Hipotecaria).\n\n${R.isd.masa.gananciales ? 9 : 8}. PUNTOS A REVISAR ANTES DE LA FIRMA\n${[...R.isd.alertas, ...(menoresC ? ["Hay herederos menores: valorar defensor judicial (art. 163 CC) o aprobación judicial de la partición."] : [])].map((a) => "- " + a).join("\n") || "- Sin observaciones."}\n\n${REV("comprobar los datos con la documentación original antes de enviarlos a la notaría.")}`;
  }
  if (tipo === "recibi") {
    const pp = plusPorHeredero(R); const F = fondos(x, R);
    return `LIQUIDACIÓN FINAL DE LA HERENCIA Y RECIBÍ\n\nHerencia de ${causante}, ${falC} el ${fm}.\nReferencia: ${x.despacho?.ref || "[referencia]"}\n\n1. LO QUE RECIBE CADA HEREDERO\n${R.isd.herederos.map((h) => { const pl = pp[h.nombre] || 0; return `${h.nombre} (${relP(h)})\n   Valor adquirido: ${eur(h.valorAdquirido)}\n   Impuesto sobre Sucesiones: ${eur(h.aIngresar)}\n   Plusvalía municipal: ${eur(pl)}${(() => { const C = typeof cuadroParticion === "function" ? cuadroParticion(x, R) : null, e = C && C.excesos.find((q) => q.id === h.id), pa = C ? C.compensaciones.filter((c) => c.de.id === h.id) : [], co = C ? C.compensaciones.filter((c) => c.a.id === h.id) : []; return `${pa.map((c) => `\n   Compensación que paga a ${c.aNombre}: ${eur(c.importe)}`).join("")}${co.map((c) => `\n   Compensación que recibe de ${c.deNombre}: ${eur(c.importe)}`).join("")}${e ? `\n   Impuesto del exceso de adjudicación: ${eur(e.trib.coste)} (${e.txtCoste})` : ""}\n   Neto después de impuestos: ${eur(h.valorAdquirido - h.aIngresar - pl - (e ? e.trib.coste : 0))}`; })()}`; }).join("\n\n")}\n\n2. CUENTA DE FONDOS DEL CLIENTE\nProvisión de fondos recibida: ${eur(F.prov)}\nSuplidos pagados por cuenta de los herederos: ${eur(F.sup)}\nHonorarios aplicados: ${eur(F.hon)}\nDevoluciones ya hechas: ${eur(F.dev)}\nSaldo a favor de los herederos: ${eur(F.saldo)}\n\n${F.M.length ? "Detalle de movimientos:\n" + [...F.M].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((m) => `- ${fechaCorta(m.fecha)} · ${MOV_T[m.tipo][0]} · ${m.concepto} · ${eur(num(m.importe))}`).join("\n") + "\n\n" : ""}3. RECIBÍ\nLos abajo firmantes declaran haber recibido los bienes y cantidades que les corresponden según esta liquidación${F.saldo > 0 ? `, así como el saldo de ${eur(F.saldo)} de la provisión de fondos` : ""}, y la documentación original del expediente.\n\nEn ${lugar}, a ${F2}.\n\n${hs.map((h) => `Fdo.: ${h.nombre}\nNIF: ${nifP(h)}`).join("\n\n")}\n\n${REV("comprobar las cifras con los justificantes de pago de impuestos y suplidos antes de firmar.")}`;
  }
  if (tipo === "banco") return `${hs[0]?.nombre || "[remitente]"}\n${hs[0]?.domicilio || "[dirección]"} · [correo] · [teléfono]\n\n[ENTIDAD BANCARIA]\nOficina [número] / Departamento de Testamentarías\n[dirección]\n\nEn ${lugar}, a ${F}.\n\nAsunto: fallecimiento de su cliente ${trC}${causante} (NIF ${nifC}). Solicitud de certificado de posiciones, de movimientos y de requisitos de testamentaría.\n\nMuy señores nuestros:\n\nLes comunicamos que su cliente ${trC}${causante}, con NIF ${nifC} y último domicilio en ${domC}, falleció el ${fm}, como acredita el certificado de defunción adjunto.\n\nNos dirigimos a ustedes ${hs.map((h) => `${gnTrat(h)}${h.nombre} (NIF ${nifP(h)}), ${relP(h)} del causante`).join("; ")}, en calidad de llamados a la herencia. Esta comunicación y las solicitudes que contiene son actos de mera conservación y administración provisional (art. 999 del Código Civil) y no suponen aceptación de la herencia.\n\nSolicitamos:\n\n1. Certificado de posiciones a la fecha del fallecimiento (${fm}) de todos los productos de los que el causante fuera titular, cotitular, autorizado o beneficiario, con el tipo de titularidad y los demás titulares: cuentas y depósitos, valores y fondos, planes de pensiones y seguros, préstamos y tarjetas, avales y cajas de seguridad.\n\n2. Movimientos de todas las cuentas desde un año antes del fallecimiento hasta la fecha de emisión, y copia de los contratos.\n\n3. Que se mantengan únicamente los cargos necesarios para conservar el patrimonio (IBI, comunidad, suministros y seguro de la vivienda) y se den de baja las demás domiciliaciones, tarjetas y accesos a la banca a distancia del causante.\n\n4. Que nos indiquen por escrito la documentación que exigen para reconocer la condición de herederos y entregar los saldos, si admiten un documento privado de partición firmado por todos los herederos o exigen escritura pública, y las comisiones que aplicarán.\n\n5. Que el Impuesto sobre Sucesiones pueda pagarse, en su momento, con cargo a los fondos del causante depositados en la entidad.\n\nAtentamente,\n\n${firmas}\n\nDocumentos que se adjuntan: 1. Certificado de defunción. 2. Certificado de últimas voluntades. 3. Copia del testamento o de la declaración de herederos (se aportará en cuanto se obtenga). 4. DNI de cada firmante. 5. Libro de familia, si hace falta acreditar el parentesco.\n\n${REV("no disponer de fondos más allá de la conservación: pagar deudas propias o retirar saldos puede suponer aceptación tácita (art. 999 CC) e impedir después renunciar. Si alguien puede renunciar por deudas, esta carta debe firmarla solo quien vaya a aceptar.")}`;
  if (tipo === "prorroga") return `A LA OFICINA GESTORA DEL IMPUESTO SOBRE SUCESIONES · ${nombreTerr(x.ccaa)}\n\nAsunto: solicitud de prórroga del plazo de presentación del Impuesto sobre Sucesiones y Donaciones (art. 68 del RD 1629/1991). Causante: ${causante}, NIF ${nifC}.\n\n${hs.map((h) => `${gnTrat(h)}${h.nombre}, con NIF ${nifP(h)} y domicilio en ${domP(h)}, ${relP(h)} del causante,`).join("\n")}\n\nEXPONEN\n\nPrimero. ${trC}${causante} falleció el ${fm}, siendo su último domicilio y residencia habitual ${domC}. Se acompaña certificado de defunción.\n\nSegundo. El plazo de seis meses para presentar el impuesto vence el ${fechaLarga(pl.isd?.limite)}. Esta solicitud se presenta dentro de los cinco primeros meses, que terminan el ${fechaLarga(pl.prorroga_isd?.limite)}.\n\nTercero. Los llamados a la herencia son: ${hs.map((h) => `${h.nombre} (${relP(h)})`).join(", ")}.\n\nCuarto. Situación y valor aproximado de los bienes:\n${(x.bienes || []).map((b) => `- ${TIPO_BIEN[b.tipo][0]}: ${b.descripcion || ""}, valor aproximado ${eur0(Math.max(num(b.valor), num(b.valorReferencia)))}.`).join("\n")}\nValor total aproximado del caudal del causante: ${eur0(R.isd.masa.bruto)}.\n\nQuinto. Motivos: [motivos, por ejemplo: pendiente de obtener certificados bancarios y la copia del testamento].\n\nSOLICITAN que se conceda la prórroga del plazo de presentación por seis meses adicionales (art. 68 RISD)${x.ccaa === "AND" ? ", mediante el modelo 659 de la Agencia Tributaria de Andalucía" : ""}. Conocen que la prórroga devenga intereses de demora y que, si en un mes no se notifica acuerdo expreso, se entiende concedida.\n\nEn ${lugar}, a ${F}.\n\n${firmas}\n\n${REV("comprobar si la comunidad exige formulario propio o vía telemática y si algún beneficio fiscal exige presentar dentro del plazo voluntario (en Madrid, la de los grupos I y II no lo exige; la del grupo III se pierde solo por lo declarado tras un requerimiento).")}`;
  if (tipo === "acuerdo") return `ACUERDO DE COHEREDEROS PARA LA GESTIÓN DE LA HERENCIA DE ${trC}${causante}\n\nEn ${lugar}, a ${F}.\n\nREUNIDOS: ${hs.map((h) => `${gnTrat(h)}${h.nombre}, mayor de edad, con NIF ${nifP(h)}`).join("; ")}, todos ellos llamados a la herencia de ${trC}${causante}, ${falC} el ${fm}.\n\nACUERDAN\n\nPrimero. Coordinación. Designan a [nombre de quien coordina] para que coordine los trámites de la herencia: solicitar certificados, recabar información de bancos y organismos, reunir la documentación y relacionarse con el abogado y la notaría. Este encargo no incluye facultades para disponer de bienes, aceptar o renunciar en nombre de otros ni firmar la partición.\n\nSegundo. Gastos. Los gastos comunes (certificados, tasas, notaría, registro, honorarios profesionales y conservación de los bienes) se reparten en proporción a la cuota de cada uno en la herencia (arts. 393 y 1064 del Código Civil). El coordinador podrá anticipar gastos de hasta [importe] € sin consulta previa; por encima, necesitará la conformidad de todos.\n\nTercero. Reembolsos y cuentas. Quien adelante gastos comunes tiene derecho a que los demás le reembolsen su parte. El coordinador rendirá cuentas por escrito a todos los coherederos al menos una vez al mes.\n\nCuarto. Información. Todos los coherederos tendrán acceso a la misma información y documentación.\n\nQuinto. Revocación. Este acuerdo puede revocarse en cualquier momento por decisión de la mayoría de los coherederos, comunicada por escrito.\n\n${firmas}\n\n${REV("confirmar que ningún firmante tiene intención de renunciar: participar en actos de gestión puede interpretarse como aceptación tácita.")}`;
  if (tipo === "certificados") return `CÓMO PEDIR LOS CERTIFICADOS DE ÚLTIMAS VOLUNTADES Y DE SEGUROS\n\n1. Espera 15 días hábiles desde el fallecimiento. Puedes pedirlos a partir del ${fechaLarga(pl.ultimas_voluntades?.desde)}.\n\n2. Ten a mano el certificado de defunción (la funeraria suele facilitarlo; si no, se pide gratis al Registro Civil).\n\n3. Rellena el modelo 790-006 (tasa del Ministerio de Justicia): datos del fallecido (nombre, DNI, fecha y lugar de fallecimiento) y del solicitante. Hay uno por certificado.\n\n4. Paga la tasa en el banco o por internet.\n\n5. Preséntalo:\n   · Por internet, en la sede electrónica del Ministerio de Justicia, con Cl@ve o certificado digital.\n   · En persona, en las gerencias territoriales del Ministerio de Justicia, con cita previa.\n   · Por correo, al Registro General de Actos de Última Voluntad.\n\n6. Qué te dirá cada uno:\n   · Últimas voluntades: si hay testamento, de qué fecha y ante qué notario. Con eso pides la copia autorizada al notario.\n   · Seguros: qué seguros de vida o accidentes tenía y con qué compañías. No dice quién es el beneficiario: hay que preguntar a cada aseguradora.\n\n7. Si no hay testamento, el siguiente paso es la declaración de herederos ante notario.\n\n${REV("importe actual de la tasa y dirección postal vigente del Registro General.")}`;
  if (tipo === "informe") {
    const m = R.isd.masa; const P = esDespacho() ? presupuesto(x, R) : null;
    const der = (id) => (R.isd.derechos[id] || []).map((d) => `${d.tipo === "pleno" ? "propiedad" : d.tipo === "usufructo" ? "usufructo" : "nuda propiedad"} del ${grp(d.fraccion * 100, d.fraccion * 100 % 1 ? 1 : 0)} %`).join(" y ");
    const prox = R.plazos.filter((p) => p.limite && !p.informativo && !x.tareas?.[p.id] && p.limite >= hoy()).sort((a, b) => a.limite.localeCompare(b.limite)).slice(0, 5);
    const falta = esDespacho() ? docsNecesarios(x).filter(([id]) => !x.despacho?.docs?.[id]) : [];
    return `${membrete}INFORME SOBRE LA HERENCIA DE ${causante.toUpperCase()}\n\nPreparado el ${fechaLarga(hoy())}.\n\n1. QUÉ FORMA LA HERENCIA\n\n${(x.bienes || []).map((b) => `· ${b.descripcion || TIPO_BIEN[b.tipo][0]}: ${eur0(Math.max(num(b.valor), num(b.valorReferencia)))}${b.titularidad === "ganancial" ? " (bien ganancial: la mitad es del cónyuge viudo)" : b.titularidad === "proindiviso" ? ` (el fallecido tenía el ${num(b.porcentaje)} %)` : ""}`).join("\n")}\n\nDe todo ello, pertenecía al fallecido ${eur0(m.bruto)}. Restadas las deudas (${eur0(m.deudas)}) y los gastos de funeral (${eur0(m.gastos)}), la herencia neta es de ${eur0(m.neto)}.\n\n2. QUIÉN RECIBE QUÉ\n\n${R.isd.notasReparto.join(" ")}\n\n${R.isd.herederos.map((h) => `· ${h.nombre} (${relP(h)}): ${der(h.id) || "recibe un legado"}, con un valor fiscal de ${eur0(h.valorAdquirido)}.`).join("\n")}\n\n3. IMPUESTOS\n\nImpuesto sobre Sucesiones (${R.isd.territorio}):\n${R.isd.herederos.map((h) => `· ${h.nombre}: ${eur(h.aIngresar)}`).join("\n")}\nTotal: ${eur(R.isd.total)}.\n\n${R.plus.length ? `Plusvalía municipal:\n${R.plus.map(({ b, r }) => `· ${b.descripcion || "Inmueble"} (${r.municipio}): ${eur(r.total)}`).join("\n")}\nTotal: ${eur(R.totalPlus)}. Las bonificaciones de la plusvalía hay que solicitarlas expresamente al ayuntamiento dentro de plazo.` : "Plusvalía municipal: pendiente de completar los datos catastrales de los inmuebles."}\n\nEl Impuesto sobre Sucesiones hay que presentarlo aunque salga a pagar 0 €.\n\n4. PRÓXIMOS PLAZOS\n\n${prox.map((p) => `· ${p.nombre}: antes del ${fechaLarga(p.limite)}.`).join("\n") || "· Sin plazos inmediatos."}\n${falta.length ? `\n5. DOCUMENTACIÓN QUE NECESITAMOS\n\n${falta.map(([, t]) => "· " + t).join("\n")}\n` : ""}${P ? `\n${falta.length ? "6" : "5"}. PRESUPUESTO\n\nHonorarios: ${eur(P.honorarios)} más IVA (${eur(P.iva)}). Suplidos orientativos de notaría, registro y certificados: ${eur(P.suplidos)}. Impuestos estimados: ${eur(P.impuestos)}. Total que conviene prever: ${eur(P.total + P.impuestos)}.\n` : ""}\nEste informe es una estimación hecha con la normativa vigente a la fecha del fallecimiento y los datos disponibles hoy. Las cifras definitivas dependen de los valores y documentos que se aporten.\n\n${REV("revisar cifras, reparto y alertas antes de entregarlo: " + (R.isd.alertas.slice(0, 3).join(" ") || "sin alertas del motor."))}`;
  }
  if (tipo === "unico") {
    const h = hs[0] || { nombre: "[heredero]", relacion: "extrano" };
    const inm = (x.bienes || []).filter((b) => b.tipo === "vivienda" || b.tipo === "inmueble");
    return `AL REGISTRO DE LA PROPIEDAD DE [LOCALIDAD] NÚMERO [..]\n\n${gnTrat(h)}${h.nombre}, mayor de edad, con DNI ${h.nif || "[número]"} y domicilio en ${domP(h)}, como ${relP(h)} y ${unico(h)} de ${trC}${causante}, ${falC} el ${fm},\n\nEXPONE\n\nPrimero. Que ${trC}${causante} falleció el ${fm}, ${x.testamento === "no" || x.testamento === "nose" ? `sin haber otorgado testamento, habiendo sido declarada única persona heredera quien suscribe por acta de notoriedad autorizada por la notaría de [residencia], a cargo de ${tN}, el ${tF}, número ${tP}` : `bajo testamento otorgado ante la notaría de [residencia], a cargo de ${tN}, el ${tF}, número ${tP}, en el que instituye única persona heredera a quien suscribe`}.\n\nSegundo. Que en la herencia figuran las siguientes fincas inscritas a nombre del causante:\n${inm.map((b, i) => `${i + 1}. ${b.descripcion || "Inmueble"}. Finca registral [número], tomo [..], libro [..], folio [..]. Referencia catastral: ${b.refCatastral || "[referencia]"}.`).join("\n") || "[relación de fincas]"}\n\nTercero. Que acepta la herencia y, al ser ${unico(h)}, solicita la inscripción a su favor mediante instancia privada con firma legitimada o ratificada, conforme al art. 14 de la Ley Hipotecaria y al art. 79 del Reglamento Hipotecario.\n\nSe acompañan: certificado de defunción, certificado del Registro General de Actos de Última Voluntad, ${x.testamento === "no" || x.testamento === "nose" ? "copia autorizada del acta de declaración de herederos" : "copia autorizada del testamento"}, justificante de presentación del Impuesto sobre Sucesiones y de la comunicación de la plusvalía municipal.\n\nSOLICITA que se practique la inscripción de las fincas descritas a su favor.\n\nEn ${lugar}, a ${F}.\n\nFdo.: ${h.nombre}\n\n${REV("solo cabe si hay un único heredero y ningún legitimario distinto de él, y la firma debe legitimarse ante notario o ratificarse ante el registrador.")}`;
  }
  if (tipo === "encargo") {
    const d = x.despacho || {}; const P = presupuesto(x, R);
    return `${membrete}HOJA DE ENCARGO PROFESIONAL Y PRESUPUESTO\n\nReferencia: ${d.ref || "[referencia]"}\nEn ${lugar}, a ${F}.\n\nDE UNA PARTE, ${(() => { const ab = (DB.despacho?.abogados || []).find((a) => a.id === x.responsable); return ab ? `${gnTrat(ab)}${ab.nombre}, ${gnAbogado(ab)}` : "[nombre], profesional de la abogacía"; })()}, con número de colegiación [número] del ${DB.despacho?.colegio || "Ilustre Colegio de Abogados de [colegio]"}, ${DB.despacho?.nombre ? "del despacho " + DB.despacho.nombre + ", " : ""}${KD.nif ? "con NIF " + KD.nif + ", " : ""}con despacho en ${KD.postal || "[dirección]"}${KD.tel ? ", teléfono " + KD.tel : ""}${KD.email ? " y correo " + KD.email : ""} (en adelante, el despacho).\n\nDE OTRA, ${(() => { const pc = (x.personas || []).find((p) => d.cliente && p.nombre === d.cliente); return pc ? gnTrat(pc) : ""; })()}${d.cliente || "[cliente]"}, con DNI ${d.nif || "[número]"} y domicilio en ${d.domicilio || "[domicilio]"}, ${hs.length > 1 ? "actuando en su nombre y, en su caso, en el de los demás coherederos que firman al pie" : "en su propio nombre"} (en adelante, el cliente).\n\n1. OBJETO DEL ENCARGO\nTramitación de la herencia de ${trC}${causante}, ${falC} el ${fm}, que comprende:\n· Estudio del título sucesorio y de la situación familiar y patrimonial.\n· ${x.testamento === "no" || x.testamento === "nose" ? "Preparación del acta de declaración de herederos ante notario." : "Obtención y análisis de la copia del testamento."}\n· Inventario y valoración de los bienes, deudas y gastos.\n· Cuaderno particional y coordinación de la escritura de aceptación y partición.\n· Autoliquidación del Impuesto sobre Sucesiones (${nombreTerr(x.ccaa)}) de cada heredero y de la plusvalía municipal de los inmuebles.\n· Inscripción en el Registro de la Propiedad, cambio de titularidad en Catastro y gestiones con las entidades bancarias.\nNo incluye procedimientos judiciales, reclamaciones frente a terceros ni recursos contra liquidaciones, que se presupuestarán aparte.\n\n2. HONORARIOS\n${P.modo === "fijo" ? `Importe cerrado de ${eur(P.honorarios)}` : `${grp(num(d.honPct ?? 1), 2)} % del valor del caudal del causante, con un mínimo de ${eur(num(d.honMin ?? 900))}; con los datos actuales, ${eur(P.honorarios)}`}, más IVA (21 %): ${eur(P.iva)}.\n${P.provision ? `Provisión de fondos a la firma: ${eur(P.provision)}, a cuenta de la liquidación final.\n` : ""}\n3. SUPLIDOS (orientativos, se facturan por su importe real)\n· Notaría: ${eur(P.notaria)}\n· Registro de la Propiedad: ${eur(P.registro)}\n· Certificados, tasas y otros: ${eur(P.otros)}\n\n4. IMPUESTOS A CARGO DE LOS HEREDEROS (estimación)\n· Impuesto sobre Sucesiones: ${eur(R.isd.total)}\n· Plusvalía municipal: ${eur(R.totalPlus)}\n\n5. OBLIGACIONES DEL CLIENTE\nFacilitar la documentación solicitada y comunicar cualquier dato relevante (otros bienes, deudas, donaciones previas o seguros).\n\n6. CONFLICTO DE INTERESES\nEl despacho actúa para los coherederos firmantes mientras exista acuerdo entre ellos. Si surge un conflicto de intereses entre coherederos, el despacho lo comunicará y podrá cesar en la defensa de todos o de alguno, conforme a las normas deontológicas.\n\n7. RESPONSABILIDAD CIVIL\nEl despacho tiene suscrito un seguro de responsabilidad civil profesional con [aseguradora], póliza [número].\n\n8. DESISTIMIENTO\nSi este encargo se contrata a distancia o fuera del despacho, el cliente puede desistir en 14 días naturales sin indicar el motivo (arts. 102 y siguientes del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios), abonando solo los servicios ya prestados a su petición expresa.\n\n9. PROTECCIÓN DE DATOS\nEl despacho tratará los datos personales del cliente y de los herederos para prestar el servicio encargado, conforme al Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018. [Completar con la información del despacho.]\n\nFirmado en prueba de conformidad.\n\nEl despacho\n\n${[d.cliente || "El cliente", ...hs.map((h) => h.nombre).filter((n) => n && n !== d.cliente)].map((n) => "Fdo.: " + n).join("\n")}\n\n${REV("comprobar el contenido mínimo que exigen la Ley Orgánica 5/2024 del Derecho de Defensa y las normas del Colegio, y adaptar los honorarios y la cláusula de protección de datos del despacho.")}`;
  }
  return "";
}

const esDespacho = () => true;
function proximoPlazo(x, R) { return R ? R.plazos.filter((p) => p.limite && !x.tareas?.[p.id] && !p.informativo).sort((a, b) => a.limite.localeCompare(b.limite))[0] : null; }
function estadoExp(x) {
  const R = calcular(x); if (!R) return { R, nivel: "neutral", txt: "Datos incompletos" };
  const p = proximoPlazo(x, R); if (!p) return { R, nivel: "ok", txt: "Sin plazos pendientes" };
  const q = dias(hoy(), p.limite);
  return { R, p, q, nivel: q < 0 ? "bad" : q < 30 ? "warn" : "ok", txt: q < 0 ? `Vencido: ${p.nombre.toLowerCase()}` : `${p.nombre} · ${q} días` };
}
function docsNecesarios(x) {
  const L = [["defuncion", "Certificado de defunción", "Registro Civil o funeraria"], ["ultimas", "Certificado de últimas voluntades", "Ministerio de Justicia, a partir de 15 días hábiles"], ["seguros", "Certificado de contratos de seguros de fallecimiento", "Ministerio de Justicia"]];
  if (x.testamento === "no" || x.testamento === "nose") L.push(["declaracion", "Acta notarial de declaración de herederos" + (x.testamento === "nose" ? " (si no hay testamento)" : ""), "Notaría del último domicilio o residencia habitual del fallecido, de donde esté la mayor parte de sus bienes o del lugar del fallecimiento, o de un distrito colindante (art. 55 Ley del Notariado)"], ["testigos", "Dos testigos que conocieran al fallecido y a la familia", "Para el acta de declaración de herederos"]); else L.push(["testamento", "Copia autorizada del último testamento", "Notaría que lo autorizó"]);
  L.push(["padron_causante", "Certificado de empadronamiento del fallecido", "Acredita la residencia de los últimos cinco años"], ["renta", "Última declaración de la renta del fallecido", "Para la renta del año del fallecimiento"]);
  L.push(["dni", "DNI de todos los herederos", (x.personas || []).filter((p) => !p.renuncia).map((p) => p.nombre).join(", ")], ["libro", "Libro de familia", "Para acreditar el parentesco"]);
  if (x.civil === "gananciales" || x.civil === "separacion") L.push(["matrimonio", "Certificado de matrimonio", x.civil === "separacion" ? "Y capitulaciones matrimoniales" : "Acredita el régimen de gananciales"]);
  if (x.civil === "pareja") L.push(["pareja", "Certificado del registro de parejas de hecho", "Para aplicar la equiparación fiscal"]);
  for (const b of x.bienes || []) {
    const n = b.descripcion || TIPO_BIEN[b.tipo][0];
    if (b.tipo === "vivienda" || b.tipo === "inmueble") L.push(["esc_" + b.id, `Escritura o nota simple · ${n}`, "Registro de la Propiedad"], ["ibi_" + b.id, `Último recibo del IBI · ${n}`, "Valor catastral total y del suelo"], ["vref_" + b.id, `Valor de referencia a la fecha del fallecimiento · ${n}`, "Sede Electrónica del Catastro"]);
    if (b.tipo === "cuenta") L.push(["cert_" + b.id, `Certificado de saldos a la fecha del fallecimiento · ${n}`, "Entidad bancaria"]);
    if (b.tipo === "valores") L.push(["cert_" + b.id, `Certificado de posición y valoración · ${n}`, "Entidad o gestora"]);
    if (b.tipo === "vehiculo") L.push(["veh_" + b.id, `Permiso de circulación y ficha técnica · ${n}`, "Para valorarlo con las tablas de Hacienda"]);
    if (b.tipo === "empresa") L.push(["emp_" + b.id, `Estatutos, cuentas y certificado de participaciones · ${n}`, "Para la reducción por empresa familiar"]);
  }
  if ((x.deudas || []).some((d) => num(d.importe) > 0)) L.push(["deudas", "Certificado de deuda pendiente a la fecha del fallecimiento", "Hipoteca y préstamos"]);
  if ((x.gastos || []).some((g) => num(g.importe) > 0)) L.push(["facturas", "Facturas del funeral y de la última enfermedad", "Son deducibles"]);
  if ((x.personas || []).some((p) => num(p.seguro) > 0)) L.push(["polizas", "Certificados de las aseguradoras de vida", "Importe cobrado por cada beneficiario"]);
  if ((x.personas || []).some((p) => num(p.discapacidad) > 0)) L.push(["discap", "Certificado de discapacidad del heredero", "Para la reducción por discapacidad"]);
  if ((x.personas || []).some((p) => num(p.donaciones) > 0)) L.push(["donac", "Escrituras de donaciones de los últimos 4 años", "Se acumulan al impuesto"]);
  if ((x.personas || []).some((p) => p.convivio2anios)) L.push(["padron", "Certificado de empadronamiento histórico", "Acredita la convivencia para vivienda y plusvalía"]);
  if ((x.personas || []).some((p) => p.renuncia)) L.push(["renuncia", "Escritura de renuncia a la herencia", "Ante notario (art. 1008 CC)"]);
  return L;
}
function presupuesto(x, R) {
  const d = x.despacho || {};
  const modo = d.honModo || "fijo";
  const base = R ? R.isd.masa.bruto : 0;
  // H27 (P10): sin importes inventados. Lo que el despacho no ha escrito cuenta 0 y se marca «por completar» (porCompletar);
  // las cifras orientativas solo aparecen como sugerencia en el formulario (presupuestoSugerido), nunca en los totales.
  const dado = (v) => v !== undefined && v !== null && v !== "";
  const porCompletar = [];
  if (modo === "fijo" ? !dado(d.honFijo) : !dado(d.honPct)) porCompletar.push("honorarios");
  for (const k of ["notaria", "registro", "otros"]) if (!dado(d[k])) porCompletar.push(k);
  const honorarios = modo === "fijo" ? num(d.honFijo) : Math.max(num(d.honMin), base * num(d.honPct) / 100);
  const iva = honorarios * 0.21;
  const notaria = num(d.notaria), registro = num(d.registro), otros = num(d.otros);
  const suplidos = notaria + registro + otros;
  return { modo, honorarios, iva, suplidos, notaria, registro, otros, provision: num(d.provision ?? 0), total: honorarios + iva + suplidos, impuestos: R ? R.isd.total + R.totalPlus : 0, porCompletar, completo: !porCompletar.length };
}
// Cifras orientativas para los marcadores del formulario (no se suman a nada)
function presupuestoSugerido(x) {
  const intest = x.testamento === "no" || x.testamento === "nose";
  return { honFijo: 1500, honPct: 1, honMin: 900, notaria: intest ? 1900 : 1500, registro: 250, otros: 100 };
}
const CHATS = {};
function contextoIA(x) {
  const R = calcular(x);
  const pers = (x.personas || []).map((p) => `- ${p.nombre || "Sin nombre"}: ${RELACIONES[p.relacion].label}, ${p.edad || "?"} años${p.renuncia ? ", renuncia" : ""}${p.convivio2anios ? ", convivía con el fallecido" : ""}${num(p.discapacidad) ? ", discapacidad " + p.discapacidad + " %" : ""}`).join("\n");
  const bienes = (x.bienes || []).map((b) => `- ${TIPO_BIEN[b.tipo][0]}: ${b.descripcion || ""}, valor ${eur0(Math.max(num(b.valor), num(b.valorReferencia)))}, ${b.titularidad || "privativo"}${b.municipio && b.municipio !== "OTRO" ? ", municipio " + (ORDENANZAS[b.municipio]?.nombre || b.municipio) : ""}`).join("\n");
  const plazos = R ? R.plazos.map((p) => `- ${p.nombre}: ${p.limite ? "antes del " + p.limite : "desde " + p.desde}${x.tareas?.[p.id] ? " (hecho)" : ""}`).join("\n") : "";
  return `EXPEDIENTE (hoy es ${hoy()})\nFallecido: ${x.nombre || "sin nombre"}, falleció el ${x.fecha}, residencia fiscal: ${nombreTerr(x.ccaa)}. Estado civil: ${x.civil}. Testamento: ${x.testamento}.\nHerederos:\n${pers}\nBienes:\n${bienes}\n\nCÁLCULO DEL MOTOR {{MARCA}} ${VERSION}:\n${informe(x).slice(0, 9000)}\n\nPLAZOS:\n${plazos}`;
}
const REGLAS_IA = (x) => `Eres el asistente de {{MARCA}}, una aplicación española para tramitar herencias. ${esDespacho() ? "Hablas con un abogado o gestor: puedes usar lenguaje técnico y citar artículos." : "Hablas con una familia que acaba de perder a alguien: sé cálido, claro y breve, sin jerga; si usas un término legal, explícalo."}
Reglas:
1. Usa SOLO las cifras del expediente y del cálculo que te doy. No inventes importes, fechas ni normas. Si falta un dato, dilo y explica qué documento lo aporta.
2. Aplica el Derecho español vigente (Código Civil, Ley 29/1987 del Impuesto sobre Sucesiones y la normativa de la comunidad indicada). Cita el artículo cuando lo sepas con seguridad.
3. No das asesoramiento jurídico definitivo: para decisiones (aceptar, renunciar, cómo repartir, vender) explica opciones y consecuencias, y recomienda confirmarlo con el abogado colegiado del expediente.
4. Responde en español, en párrafos cortos o listas con guiones, en menos de 220 palabras salvo que se pida más. Usa **negrita** solo para cifras clave.

${contextoIA(x)}`;
async function iaEnviar(q) {
  const x = exp(); if (!x || !SAMPLE || !q.trim()) return;
  const c = CHATS[x.id] = CHATS[x.id] || { turns: [], busy: false };
  if (c.busy) return;
  c.turns.push({ role: "user", content: q.trim() }); c.busy = true; c.live = ""; c.err = ""; c.ctl = new AbortController();
  render(); scrollChat();
  try {
    const turns = c.turns.slice(-10);
    const { text } = await SAMPLE([{ role: "user", content: REGLAS_IA(x) }, { role: "assistant", content: "Entendido. Tengo el expediente delante." }, ...turns], { cache: false, signal: c.ctl.signal, onText: ({ text }) => { c.live = text; const n = document.getElementById("ia-live"); if (n) { n.innerHTML = md(text); scrollChat(); } } });
    c.turns.push({ role: "assistant", content: text });
  } catch (e) {
    if (e && e.text) c.turns.push({ role: "assistant", content: e.text + "\n\n(respuesta interrumpida)" });
    c.err = !e || e.code === "cancelled" ? "" : ["not_granted", "sampling_disabled", "not_declared", "capability_disabled"].includes(e.code) ? "La IA no está disponible en esta vista." : e.code === "rate_limited" ? "Demasiadas preguntas seguidas. Prueba en un momento." : "No se pudo responder. Inténtalo de nuevo.";
    if (!c.turns.length || c.turns[c.turns.length - 1].role === "user") { if (!e || e.code === "cancelled") c.turns.pop(); }
  }
  c.busy = false; c.live = ""; render(); scrollChat();
}
function scrollChat() { const b = document.querySelector(".sheet .body"); if (b) b.scrollTop = b.scrollHeight; }
async function iaAuditar() {
  const x = exp(); if (!x || !SAMPLE) return;
  const A = ui.audit = { id: x.id, busy: true, items: null, err: "" }; render();
  try {
    const r = await SAMPLE.json(`${REGLAS_IA(x)}\n\nTAREA: Revisa el expediente como lo haría un abogado sucesorista con experiencia antes de presentar. Busca riesgos, datos que faltan, oportunidades de ahorro fiscal legítimo, incoherencias y plazos críticos. Responde SOLO con un array JSON de 3 a 8 objetos {"nivel":"alto"|"medio"|"bajo","titulo":string (máx. 70 caracteres),"detalle":string (máx. 240 caracteres),"accion":string (máx. 120 caracteres)} ordenados de mayor a menor importancia.`, { modelTier: "complex" });
    A.items = Array.isArray(r) ? r.filter((i) => i && i.titulo).slice(0, 8) : [];
  } catch (e) { A.err = e && ["not_granted", "sampling_disabled"].includes(e.code) ? "La IA no está disponible en esta vista." : "No se pudo completar la revisión. Inténtalo de nuevo."; }
  A.busy = false; if (ui.audit === A) render();
}
async function iaLeerDoc(file) {
  const x = objetivo(); if (!x || !SAMPLE || !ui.sheet || ui.sheet.tipo !== "bien") return;
  const b = x.bienes.find((q) => q.id === ui.sheet.id); if (!b) return;
  ui.leyendo = true; render();
  try {
    const r = await SAMPLE.json('La imagen es un documento español de un inmueble: un recibo del IBI, una escritura, una nota simple o una certificación catastral. Extrae los datos que aparezcan y responde SOLO con este JSON (null si no aparece; importes como número sin puntos de miles): {"tipoDocumento":string,"direccion":string|null,"municipio":string|null,"referenciaCatastral":string|null,"valorCatastralTotal":number|null,"valorCatastralSuelo":number|null,"fechaAdquisicion":"AAAA-MM-DD"|null,"precioAdquisicion":number|null}', { images: file, modelTier: "default" });
    const n = []; const put = (k, v, t) => { if (v != null && v !== "" && !isNaN(Number(v))) { b[k] = Number(v); n.push(t); } };
    put("valorCatastralTotal", r.valorCatastralTotal, "valor catastral"); put("valorCatastralSuelo", r.valorCatastralSuelo, "valor del suelo"); put("valorAdq", r.precioAdquisicion, "precio de compra");
    if (r.fechaAdquisicion && /^\d{4}-\d{2}-\d{2}$/.test(r.fechaAdquisicion)) { b.fechaAdq = r.fechaAdquisicion; n.push("fecha de compra"); }
    if (!b.descripcion && r.direccion) { b.descripcion = String(r.direccion).slice(0, 80); n.push("dirección"); }
    if (r.municipio) { const k = String(r.municipio).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]+/g, "_").replace(/^_|_$/g, ""); const m = MUNICIPIOS.find(([id, nm]) => id === k || nm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === String(r.municipio).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); if (m) { b.municipio = m[0]; n.push("municipio"); } }
    if (r.referenciaCatastral) b.refCatastral = String(r.referenciaCatastral).slice(0, 30);
    persistir(); toast(n.length ? "Leído: " + n.slice(0, 3).join(", ") + (n.length > 3 ? "…" : "") + ". Revísalo." : "No se encontraron datos en la imagen");
  } catch (e) { toast(e && e.code === "images_unavailable" ? "Esta vista no admite imágenes" : "No se pudo leer el documento"); }
  ui.leyendo = false; render();
}

const DOC_TIT = { escritura: "Borrador de escritura de herencia", solicitud790: "Solicitud de certificados (modelo 790)", cartaFamilia: "Carta a la familia: documentos pendientes", catastro: "Cambio de titular en el Catastro (modelo 900D)", plusvalia: "Declaración de plusvalía municipal", liquidacion: "Propuesta de liquidación", notaria: "Nota para la notaría", recibi: "Liquidación final y recibí", banco: "Carta al banco", prorroga: "Solicitud de prórroga", aplazamiento: "Solicitud de aplazamiento o fraccionamiento", acuerdo: "Acuerdo entre herederos", certificados: "Guía de certificados", cuaderno: "Cuaderno particional", informe: "Informe para el cliente", unico: "Instancia de heredero único", renuncia: "Borrador de escritura de renuncia", encargo: "Hoja de encargo y presupuesto" };
function informe(x) {
  const R = calcular(x); if (!R) return "";
  const L = [`{{MARCA}} · informe · motor ${VERSION}`, `${x.nombre || "Herencia"} · ${nombreTerr(x.ccaa)} · fallecimiento ${x.fecha}`, `Caudal del fallecido ${eur(R.isd.masa.bruto)} · neto ${eur(R.isd.masa.neto)} · ajuar ${eur(R.isd.masa.ajuar)}`, ""];
  for (const h of R.isd.herederos) { L.push(`${h.nombre} (${RELACIONES[h.relacion].label}, grupo ${h.grupo}) · recibe ${eur(h.valorAdquirido)} · paga ${eur(h.aIngresar)}`); for (const t of h.traza) L.push(`   ${t.paso}: ${eur(t.valor)}${t.norma ? " [" + t.norma + (t.estado ? " · " + t.estado : "") + "]" : ""}`); }
  for (const p of R.plus) L.push(`Plusvalía ${p.b.descripcion}: ${eur(p.r.total)} (método ${p.r.metodo})`);
  if (R.isd.alertas.length) L.push("", "Para revisar:", ...R.isd.alertas.map((a) => "- " + a));
  if (R.isd.pendientes.length) L.push("", "Parámetros pendientes de cotejo:", ...R.isd.pendientes.map((a) => "- " + a));
  return L.join("\n");
}
async function copiar(t) { try { await navigator.clipboard.writeText(t); toast("Copiado"); } catch { const ta = document.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;inset:10% 5%;z-index:99;width:90%;height:70%"; document.body.appendChild(ta); ta.select(); toast("Selecciona y copia el texto"); setTimeout(() => ta.remove(), 15000); } }

