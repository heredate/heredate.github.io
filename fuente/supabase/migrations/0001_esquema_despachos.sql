-- Hereda+ · esquema multi-despacho (Supabase / PostgreSQL 15+)
-- Cada fila pertenece a un despacho. La seguridad por filas (RLS) impide que un despacho vea datos de otro.
-- Hereda+ actúa como encargado del tratamiento (art. 28 RGPD): no hay ninguna política que dé acceso al proveedor.
-- Probado con PGlite: supabase/pruebas/rls.test.mjs

-- gen_random_uuid() es nativo desde PostgreSQL 13

-- ── Tipos ─────────────────────────────────────────────────────
create type rol_despacho as enum ('titular', 'abogado', 'colaborador', 'lectura');
create type fase_expediente as enum ('encargo', 'documentacion', 'liquidacion', 'firma', 'inscripcion', 'cerrado');
create type tipo_movimiento as enum ('provision', 'suplido', 'honorarios', 'devolucion');

-- ── Despachos y equipo ────────────────────────────────────────
create table despachos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(nombre) between 2 and 200),
  colegio text,
  localidad text,
  plan text not null default 'piloto',
  creado timestamptz not null default now()
);

create table miembros (
  despacho_id uuid not null references despachos(id) on delete cascade,
  user_id uuid not null,                       -- auth.users.id
  nombre text not null,
  rol rol_despacho not null default 'abogado',
  activo boolean not null default true,
  creado timestamptz not null default now(),
  primary key (despacho_id, user_id)
);
create index on miembros (user_id);

-- ── Funciones de acceso (security definer: evitan recursión de RLS) ──
create or replace function es_miembro(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros m where m.despacho_id = d and m.user_id = auth.uid() and m.activo)
$$;
create or replace function rol_en(d uuid) returns rol_despacho
language sql stable security definer set search_path = public as $$
  select m.rol from miembros m where m.despacho_id = d and m.user_id = auth.uid() and m.activo
$$;
create or replace function puede_editar(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(rol_en(d) in ('titular', 'abogado', 'colaborador'), false)
$$;
create or replace function es_titular(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(rol_en(d) = 'titular', false)
$$;

-- ── Clientes ──────────────────────────────────────────────────
create table clientes (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references despachos(id) on delete cascade,
  nombre text not null,
  nif text,                                    -- en producción: cifrado de columna con clave en KMS
  email text,
  telefono text,
  domicilio text,
  creado timestamptz not null default now()
);
create index on clientes (despacho_id);

-- ── Expedientes ───────────────────────────────────────────────
create table expedientes (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references despachos(id) on delete cascade,
  ref text not null,
  cliente_id uuid references clientes(id) on delete set null,
  responsable uuid,
  fase fase_expediente not null default 'encargo',
  causante text,
  fecha_fallecimiento date,
  ccaa text,
  datos jsonb not null default '{}'::jsonb,    -- el expediente completo de la app (personas, bienes, trámites…)
  version integer not null default 1,           -- control de concurrencia optimista
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (despacho_id, ref)
);
create index on expedientes (despacho_id, fase);

-- ── Documentos (el fichero va a Storage: <despacho_id>/<expediente_id>/<nombre>) ──
create table documentos (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references despachos(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  tramite_id text,
  nombre text not null,
  tipo text,
  tam bigint,
  categoria text,
  ruta text not null,
  subido_por uuid default auth.uid(),
  creado timestamptz not null default now()
);
create index on documentos (expediente_id);

-- ── Fondos del cliente ────────────────────────────────────────
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references despachos(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  tipo tipo_movimiento not null,
  concepto text not null,
  importe numeric(12,2) not null check (importe > 0),
  fecha date not null default current_date,
  creado_por uuid default auth.uid(),
  creado timestamptz not null default now()
);
create index on movimientos (expediente_id);

-- ── Bitácora visible en la app ────────────────────────────────
create table bitacora (
  id bigint generated always as identity primary key,
  despacho_id uuid not null references despachos(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  t timestamptz not null default now(),
  tipo text not null default 'nota',
  texto text not null,
  autor uuid default auth.uid()
);
create index on bitacora (expediente_id, t desc);

-- ── Registro de auditoría (solo inserción; lo lee el titular) ──
create table auditoria (
  id bigint generated always as identity primary key,
  despacho_id uuid not null,
  tabla text not null,
  registro_id text not null,
  accion text not null,
  usuario uuid,
  t timestamptz not null default now(),
  cambios jsonb
);
create index on auditoria (despacho_id, t desc);

create or replace function auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare fila jsonb; antes jsonb;
begin
  fila := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  antes := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  insert into auditoria (despacho_id, tabla, registro_id, accion, usuario, cambios)
  values ((fila->>'despacho_id')::uuid, tg_table_name, fila->>'id', tg_op, auth.uid(),
          case when tg_op = 'UPDATE' then jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(fila) k where fila->k is distinct from antes->k))
               else null end);
  return coalesce(new, old);
end $$;

create or replace function tocar_version() returns trigger language plpgsql as $$
begin new.version := old.version + 1; new.actualizado := now(); return new; end $$;
create trigger expedientes_version before update on expedientes for each row execute function tocar_version();

create trigger aud_expedientes after insert or update or delete on expedientes for each row execute function auditar();
create trigger aud_clientes after insert or update or delete on clientes for each row execute function auditar();
create trigger aud_documentos after insert or update or delete on documentos for each row execute function auditar();
create trigger aud_movimientos after insert or update or delete on movimientos for each row execute function auditar();

-- ── Seguridad por filas ───────────────────────────────────────
alter table despachos enable row level security;
alter table miembros enable row level security;
alter table clientes enable row level security;
alter table expedientes enable row level security;
alter table documentos enable row level security;
alter table movimientos enable row level security;
alter table bitacora enable row level security;
alter table auditoria enable row level security;

create policy despacho_ver on despachos for select using (es_miembro(id));
create policy despacho_editar on despachos for update using (es_titular(id)) with check (es_titular(id));

create policy miembros_ver on miembros for select using (es_miembro(despacho_id));
create policy miembros_alta on miembros for insert with check (es_titular(despacho_id));
create policy miembros_editar on miembros for update using (es_titular(despacho_id)) with check (es_titular(despacho_id));
create policy miembros_baja on miembros for delete using (es_titular(despacho_id));

-- Tablas de trabajo: ver los miembros; crear y editar titular, abogado y colaborador; borrar solo el titular
do $$ declare t text; begin
  foreach t in array array['clientes', 'expedientes', 'documentos', 'movimientos'] loop
    execute format('create policy %1$s_ver on %1$s for select using (es_miembro(despacho_id))', t);
    execute format('create policy %1$s_crear on %1$s for insert with check (puede_editar(despacho_id))', t);
    execute format('create policy %1$s_editar on %1$s for update using (puede_editar(despacho_id)) with check (puede_editar(despacho_id))', t);
    execute format('create policy %1$s_borrar on %1$s for delete using (es_titular(despacho_id))', t);
  end loop;
end $$;

-- Bitácora: se anota, no se edita ni se borra
create policy bitacora_ver on bitacora for select using (es_miembro(despacho_id));
create policy bitacora_anotar on bitacora for insert with check (puede_editar(despacho_id) and autor = auth.uid());

-- Auditoría: solo la lee el titular; nadie la modifica desde la API
create policy auditoria_ver on auditoria for select using (es_titular(despacho_id));

-- El expediente y sus hijos deben ser del mismo despacho
create or replace function mismo_despacho() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from expedientes e where e.id = new.expediente_id and e.despacho_id = new.despacho_id) then
    raise exception 'El expediente no pertenece a ese despacho';
  end if;
  return new;
end $$;
create trigger doc_mismo before insert or update on documentos for each row execute function mismo_despacho();
create trigger mov_mismo before insert or update on movimientos for each row execute function mismo_despacho();
create trigger bit_mismo before insert or update on bitacora for each row execute function mismo_despacho();

-- Alta de un despacho nuevo: quien lo crea queda como titular
create or replace function crear_despacho(p_nombre text, p_mi_nombre text) returns uuid
language plpgsql security definer set search_path = public as $$
declare d uuid;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  insert into despachos (nombre) values (p_nombre) returning id into d;
  insert into miembros (despacho_id, user_id, nombre, rol) values (d, auth.uid(), p_mi_nombre, 'titular');
  return d;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on clientes, expedientes, documentos, movimientos, miembros, despachos to authenticated;
grant select, insert on bitacora to authenticated;
grant select on auditoria to authenticated;
grant execute on function crear_despacho(text, text) to authenticated;
