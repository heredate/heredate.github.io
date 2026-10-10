// Genera src/mapas.js desde es-atlas (npm i es-atlas topojson-client d3-geo) · node src/herramientas/mapas-generar.mjs
import fs from "fs";
import * as topojson from "topojson-client";
import { geoPath, geoConicConformal, geoMercator } from "d3-geo";
const ar = JSON.parse(fs.readFileSync("node_modules/es-atlas/es/autonomous_regions.json"));
const pr = JSON.parse(fs.readFileSync("node_modules/es-atlas/es/provinces.json"));
const objA = Object.keys(ar.objects); const objP = Object.keys(pr.objects);
console.error("objects", objA, objP);
const regions = topojson.feature(ar, ar.objects.autonomous_regions);
const provs = topojson.feature(pr, pr.objects.provinces);
console.error(regions.features.slice(0, 3).map((f) => [f.id, f.properties]));
const W = 960, H = 720;
const pen = { type: "FeatureCollection", features: regions.features.filter((f) => String(f.id).padStart(2, "0") !== "05") };
const can = { type: "FeatureCollection", features: regions.features.filter((f) => String(f.id).padStart(2, "0") === "05") };
const projP = geoConicConformal().parallels([36, 43]).rotate([3.5, 0]).fitExtent([[20, 20], [W - 20, H - 20]], pen);
const projC = geoConicConformal().parallels([27.5, 29]).rotate([15.5, 0]).fitExtent([[40, H - 150], [330, H - 30]], can);
const esCan = (f) => String(f.id).padStart(2, "0") === "05";
const pathP = geoPath(projP), pathC = geoPath(projC);
const path = (f) => (esCan(f) ? pathC(f) : pathP(f));
path.centroid = (f) => (esCan(f) ? pathC.centroid(f) : pathP.centroid(f));
const proj = (ll) => projP(ll);
const r1 = (d) => d.replace(/(\d+\.\d{1})\d+/g, "$1");
const CODE = { "01": "AND", "02": "ARA", "03": "AST", "04": "BAL", "05": "CAN", "06": "CANT", "07": "CYL", "08": "CLM", "09": "CAT", "10": "VAL", "11": "EXT", "12": "GAL", "13": "MAD", "14": "MUR", "15": "NAV", "16": "PV", "17": "RIO", "18": "CEU", "19": "MEL" };
const ccaa = {};
for (const f of regions.features) { const k = CODE[String(f.id).padStart(2, "0")]; if (k && k !== "PV") ccaa[k] = r1(path(f)); }
console.error('pv', provs.features.slice(0,2).map(f=>[f.id,f.properties]));
const PVP = { "01": "ALA", "48": "BIZ", "20": "GIP" };
for (const f of provs.features) { const k = PVP[String(f.id).padStart(2, "0")]; if (k) ccaa[k] = r1(pathP(f)); }
const borde = r1(pathP(topojson.mesh(ar, ar.objects.autonomous_regions, (a, b) => a !== b)));
const canarias = `M24 ${H - 166}H346V${H - 18}H24Z`;
// Andalucía: provincias
const ANDP = { "04": "Almería", "11": "Cádiz", "14": "Córdoba", "18": "Granada", "21": "Huelva", "23": "Jaén", "29": "Málaga", "41": "Sevilla" };
const andFeats = provs.features.filter((f) => ANDP[String(f.id).padStart(2, "0")]);
const andFC = { type: "FeatureCollection", features: andFeats };
const W2 = 960, H2 = 520;
const proj2 = geoConicConformal().parallels([36, 38.5]).rotate([4.5, 0]).fitExtent([[16, 16], [W2 - 16, H2 - 16]], andFC);
const path2 = geoPath(proj2);
const andalucia = andFeats.map((f) => ({ n: ANDP[String(f.id).padStart(2, "0")], d: r1(path2(f)), c: path2.centroid(f).map((v) => Math.round(v)) }));
const PUNTOS = { MALAGA: [36.7213, -4.4214], MARBELLA: [36.5101, -4.8825], MIJAS: [36.5957, -4.6373], FUENGIROLA: [36.5398, -4.6247], VELEZ_MALAGA: [36.7806, -4.1003], TORREMOLINOS: [36.6219, -4.4996], BENALMADENA: [36.5989, -4.5168], ESTEPONA: [36.4276, -5.1463], RINCON_DE_LA_VICTORIA: [36.7169, -4.2769], ANTEQUERA: [37.0194, -4.5603], RONDA: [36.7423, -5.1671], ALHAURIN_DE_LA_TORRE: [36.663, -4.5616], NERJA: [36.7581, -3.8757], SEVILLA: [37.3891, -5.9845], CORDOBA: [37.8882, -4.7794], GRANADA: [37.1773, -3.5986], ALMERIA: [36.834, -2.4637], CADIZ: [36.5271, -6.2886], HUELVA: [37.2614, -6.9447], JAEN: [37.7796, -3.7849], JEREZ: [36.685, -6.1261], ALGECIRAS: [36.1408, -5.4562], DOS_HERMANAS: [37.2835, -5.9209], ROQUETAS: [36.7642, -2.6148], EL_EJIDO: [36.7762, -2.8146], SAN_FERNANDO: [36.4759, -6.1985], MOTRIL: [36.7458, -3.5175], MADRID: [40.4168, -3.7038] };
const pinsES = {}, pinsAND = {};
for (const [k, [lat, lon]] of Object.entries(PUNTOS)) { const p = proj([lon, lat]); if (p) pinsES[k] = p.map((v) => Math.round(v)); const q = proj2([lon, lat]); if (q && k !== "MADRID") pinsAND[k] = q.map((v) => Math.round(v)); }
const centro = {}; for (const [k, d] of Object.entries(ccaa)) { const f = regions.features.find((x) => CODE[String(x.id).padStart(2, "0")] === k) || provs.features.find((x) => PVP[String(x.id).padStart(2, "0")] === k); centro[k] = (PVP[String(f.id).padStart(2, "0")] && !CODE[String(f.id).padStart(2,"0")]?.length ? pathP.centroid(f) : path.centroid(f)).map((v) => Math.round(v)); }
const out = `// Mapas generados desde es-atlas (IGN) con proyección cónica conforme · no editar a mano\nconst MAPA_ES = ${JSON.stringify({ w: W, h: H, ccaa, borde, canarias: r1(canarias || ""), pins: pinsES, centro })};\nconst MAPA_AND = ${JSON.stringify({ w: W2, h: H2, prov: andalucia, pins: pinsAND })};\n`;
fs.writeFileSync("/home/claude/cauce-web/src/mapas.js", out);
console.error("KB", Math.round(out.length / 1024), Object.keys(ccaa).length, Object.keys(pinsES).length);
