// Prueba del esquema multi-despacho con PGlite (PostgreSQL en WebAssembly).
// Uso: npm i @electric-sql/pglite && node supabase/pruebas/rls.test.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";
const db = new PGlite();
let ok = 0, ko = 0;
const eq = (n, got, exp) => { const p = JSON.stringify(got) === JSON.stringify(exp); p ? ok++ : ko++; console.log(`${p ? "✔" : "✘"} ${n}${p ? "" : `: ${JSON.stringify(got)} (esperado ${JSON.stringify(exp)})`}`); };
const falla = async (n, fn) => { try { await fn(); ko++; console.log(`✘ ${n}: no falló`); } catch { ok++; console.log(`✔ ${n}`); } };
// Simulación de Supabase: rol authenticated y auth.uid() leído del JWT
await db.exec(`create role authenticated nologin; create schema auth; grant usage on schema auth to authenticated;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
await db.exec(readFileSync(new URL("../migrations/0001_esquema_despachos.sql", import.meta.url), "utf8"));
const U = { ana: "00000000-0000-0000-0000-00000000000a", bea: "00000000-0000-0000-0000-00000000000b", carlos: "00000000-0000-0000-0000-00000000000c", dani: "00000000-0000-0000-0000-00000000000d" };
const como = async (u) => { await db.exec(`reset role; set request.jwt.claim.sub = '${u}'; set role authenticated;`); };
const q = async (sql, p) => (await db.query(sql, p)).rows;

// Ana crea el despacho 1 y Bea el despacho 2
await como(U.ana); const d1 = (await q(`select crear_despacho('Pérez Abogados', 'Ana Pérez') d`))[0].d;
await como(U.bea); const d2 = (await q(`select crear_despacho('Ruiz Legal', 'Bea Ruiz') d`))[0].d;
// Ana da de alta a Carlos como colaborador y a Dani como lectura
await como(U.ana);
await q(`insert into miembros (despacho_id, user_id, nombre, rol) values ($1, $2, 'Carlos', 'colaborador'), ($1, $3, 'Dani', 'lectura')`, [d1, U.carlos, U.dani]);
const e1 = (await q(`insert into expedientes (despacho_id, ref, causante, datos) values ($1, 'EXP-2026-001', 'Causante uno', '{"x":1}') returning id`, [d1]))[0].id;
await q(`insert into movimientos (despacho_id, expediente_id, tipo, concepto, importe) values ($1, $2, 'provision', 'Provisión', 600)`, [d1, e1]);
await q(`insert into bitacora (despacho_id, expediente_id, texto) values ($1, $2, 'Expediente abierto')`, [d1, e1]);
await como(U.bea);
await q(`insert into expedientes (despacho_id, ref, causante) values ($1, 'EXP-2026-001', 'Causante de otro despacho')`, [d2]);

// Aislamiento entre despachos
await como(U.ana); eq("Ana ve solo su expediente", (await q(`select ref, causante from expedientes`)).map((r) => r.causante), ["Causante uno"]);
await como(U.bea); eq("Bea no ve el expediente de Ana", (await q(`select causante from expedientes`)).map((r) => r.causante), ["Causante de otro despacho"]);
eq("Bea no ve los movimientos de Ana", (await q(`select * from movimientos`)).length, 0);
await falla("Bea no puede crear expedientes en el despacho de Ana", () => q(`insert into expedientes (despacho_id, ref) values ($1, 'X')`, [d1]));
eq("Bea no puede modificar un expediente de Ana (0 filas)", (await db.query(`update expedientes set causante = 'hackeado' where id = $1`, [e1])).affectedRows, 0);
await falla("Nadie apunta un documento de su despacho a un expediente ajeno", async () => { await q(`insert into documentos (despacho_id, expediente_id, nombre, ruta) values ($1, $2, 'x.pdf', 'x')`, [d2, e1]); });
// Roles dentro del despacho
await como(U.carlos);
eq("El colaborador ve el expediente", (await q(`select count(*)::int n from expedientes`))[0].n, 1);
await q(`update expedientes set fase = 'documentacion' where id = $1`, [e1]);
eq("El colaborador puede cambiar la fase y sube la versión", (await q(`select fase, version from expedientes where id = $1`, [e1]))[0], { fase: "documentacion", version: 2 });
eq("El colaborador no puede borrar (0 filas)", (await db.query(`delete from expedientes where id = $1`, [e1])).affectedRows, 0);
eq("El colaborador no lee la auditoría", (await q(`select * from auditoria`)).length, 0);
await falla("Nadie firma una anotación en nombre de otro", () => q(`insert into bitacora (despacho_id, expediente_id, texto, autor) values ($1, $2, 'x', $3)`, [d1, e1, U.ana]));
await como(U.dani);
eq("Lectura ve el expediente", (await q(`select count(*)::int n from expedientes`))[0].n, 1);
await falla("Lectura no puede crear movimientos", () => q(`insert into movimientos (despacho_id, expediente_id, tipo, concepto, importe) values ($1, $2, 'suplido', 'x', 10)`, [d1, e1]));
eq("Lectura no puede editar (0 filas)", (await db.query(`update expedientes set causante = 'x' where id = $1`, [e1])).affectedRows, 0);
await falla("Lectura no puede darse de alta como titular", () => q(`insert into miembros (despacho_id, user_id, nombre, rol) values ($1, $2, 'Dani', 'titular')`, [d1, U.dani]));
// Auditoría
await como(U.ana);
const A = await q(`select tabla, accion, usuario from auditoria order by id`);
eq("La auditoría registra alta y cambio de fase", A.filter((a) => a.tabla === "expedientes").map((a) => a.accion), ["INSERT", "UPDATE"]);
eq("La auditoría guarda quién cambió la fase", A.find((a) => a.accion === "UPDATE").usuario, U.carlos);
await falla("El titular no puede reescribir la auditoría", () => q(`update auditoria set accion = 'X'`).then((r) => { throw 0; }).catch(async () => { const n = (await db.query(`update auditoria set accion = 'X'`)).affectedRows; if (n === 0) throw new Error("bloqueado"); }));
eq("El titular puede borrar su expediente", (await db.query(`delete from expedientes where id = $1`, [e1])).affectedRows, 1);
await como(U.bea); eq("El expediente de Bea sigue intacto", (await q(`select count(*)::int n from expedientes`))[0].n, 1);
console.log(`\n${ok} correctas · ${ko} fallidas`); process.exit(ko ? 1 : 0);
