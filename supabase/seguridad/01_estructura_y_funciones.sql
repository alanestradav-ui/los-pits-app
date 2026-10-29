-- =====================================================================
-- LOS PITS APP · SEGURIDAD MULTI-TALLER · PASO 1 (no rompe nada)
-- Crea tablas y funciones nuevas. NO bloquea el acceso directo todavía,
-- así la versión actual de la app sigue funcionando mientras se prueba.
-- Es seguro ejecutarlo varias veces.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Talleres (clientes de la plataforma)
create table if not exists public.talleres (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  nombre        text not null default '',
  plan          text not null default 'Piloto',
  estado        text not null default 'activo' check (estado in ('activo', 'suspendido')),
  vence_el      date,
  max_usuarios  integer,
  contacto      text default '',
  telefono      text default '',
  canal         text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  creado_el     timestamptz not null default now()
);

-- Contraseñas cifradas (bcrypt). Nunca se envían a la app.
create table if not exists public.credenciales (
  tenant_id      text not null references public.talleres(id) on delete cascade,
  usuario        text not null,               -- nombre de usuario en minúsculas
  clave_hash     text not null,
  actualizado_el timestamptz not null default now(),
  primary key (tenant_id, usuario)
);

-- Sesiones activas (se guarda solo el hash del token)
create table if not exists public.app_sesiones (
  token_hash     text primary key,
  tenant_id      text not null references public.talleres(id) on delete cascade,
  usuario        text not null,
  es_admin       boolean not null default false,
  es_superadmin  boolean not null default false,
  creado_el      timestamptz not null default now(),
  ultimo_uso     timestamptz not null default now(),
  vence_el       timestamptz not null,
  agente         text
);
create index if not exists app_sesiones_tenant_idx on public.app_sesiones (tenant_id, usuario);

-- Registro de intentos de inicio de sesión (bloqueo por fuerza bruta)
create table if not exists public.login_intentos (
  id         bigserial primary key,
  tenant_id  text,
  usuario    text,
  exito      boolean not null,
  creado_el  timestamptz not null default now()
);
create index if not exists login_intentos_idx on public.login_intentos (tenant_id, usuario, creado_el);

-- Consultas al portal público del cliente (límite por IP)
create table if not exists public.portal_consultas (
  id         bigserial primary key,
  ip         text,
  creado_el  timestamptz not null default now()
);
create index if not exists portal_consultas_idx on public.portal_consultas (ip, creado_el);

-- Administradores de la plataforma (acceso al Panel SaaS y a todos los talleres)
create table if not exists public.admins_plataforma (
  tenant_id  text not null,
  usuario    text not null,
  primary key (tenant_id, usuario)
);

-- Papelera de la base: copia de cualquier registro que se borre de app_data
create table if not exists public.app_data_papelera (
  id          bigserial primary key,
  key         text,
  value       jsonb,
  updated_at  timestamptz,
  borrado_el  timestamptz not null default now()
);

-- Todas las tablas nuevas: sin acceso directo desde la app (solo vía funciones)
alter table public.talleres            enable row level security;
alter table public.credenciales        enable row level security;
alter table public.app_sesiones        enable row level security;
alter table public.login_intentos      enable row level security;
alter table public.portal_consultas    enable row level security;
alter table public.admins_plataforma   enable row level security;
alter table public.app_data_papelera   enable row level security;
revoke all on public.talleres, public.credenciales, public.app_sesiones, public.login_intentos,
              public.portal_consultas, public.admins_plataforma, public.app_data_papelera
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. DATOS INICIALES (no modifica datos existentes)
-- ---------------------------------------------------------------------
insert into public.talleres (id, nombre, plan, contacto, telefono)
values ('lospits', 'Los Pits Auto Center (Matriz)', 'Premium PRO', 'Alan Estrada', ''),
       ('pruebas', 'Pruebas Generales (Entorno Staging)', 'Pruebas / Desarrollo', 'Alan Estrada', '')
on conflict (id) do nothing;

-- Talleres registrados previamente en el Panel SaaS
insert into public.talleres (id, nombre, plan, estado, contacto, telefono)
select lower(w->>'codigo'),
       coalesce(w->>'nombre', ''),
       coalesce(w->>'plan', 'Piloto'),
       case when w->>'estado' = 'suspendido' then 'suspendido' else 'activo' end,
       coalesce(w->>'contactoNombre', ''),
       coalesce(w->>'telefono', '')
from public.app_data a, jsonb_array_elements(a.value::jsonb) w
where a.key = 'saas_workshops'
  and jsonb_typeof(a.value::jsonb) = 'array'
  and lower(coalesce(w->>'codigo', '')) ~ '^[a-z0-9][a-z0-9-]{1,39}$'
on conflict (id) do nothing;

insert into public.admins_plataforma (tenant_id, usuario)
values ('lospits', 'admin')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. FUNCIONES INTERNAS (no se pueden llamar desde la app)
-- ---------------------------------------------------------------------

create or replace function public._norm_usuario(t text)
returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(lower(coalesce(t, '')), '[._-]', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- Número tolerante: devuelve 0 si el texto no es numérico
create or replace function public._num(t text)
returns numeric language plpgsql immutable as $$
begin
  return coalesce(nullif(btrim(coalesce(t, '')), '')::numeric, 0);
exception when others then
  return 0;
end $$;

-- Taller dueño de una llave de usuarios ('lospits_usuarios' -> 'lospits', 'usuarios' -> 'lospits')
create or replace function public._tenant_de_llave_usuarios(p_key text)
returns text language sql immutable as $$
  select case
    when p_key = 'usuarios' then 'lospits'
    when p_key like '%\_usuarios' escape '\' and position('_' in p_key) = length(p_key) - 8
      then left(p_key, length(p_key) - 9)
    else null end
$$;

create or replace function public._lista_usuarios(p_tenant text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v jsonb;
begin
  select a.value::jsonb into v from public.app_data a where a.key = p_tenant || '_usuarios';
  if v is null and p_tenant = 'lospits' then
    select a.value::jsonb into v from public.app_data a where a.key = 'usuarios';
  end if;
  if v is null or jsonb_typeof(v) <> 'array' then return '[]'::jsonb; end if;
  return v;
end $$;

-- ¿El usuario fue eliminado (registro de eliminaciones)?
create or replace function public._usuario_eliminado(p_tenant text, p_usuario text)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare v jsonb; n text := lower(btrim(coalesce(p_usuario, ''))); e jsonb;
begin
  if n = 'admin' then return false; end if;
  select a.value::jsonb into v from public.app_data a where a.key = p_tenant || '_deleted_usuarios';
  if v is null then return false; end if;
  if jsonb_typeof(v) = 'string' then
    begin v := (v #>> '{}')::jsonb; exception when others then return false; end;
  end if;
  if jsonb_typeof(v) = 'array' then
    -- Formato antiguo (lista de nombres): no se usa para bloquear, porque incluye
    -- usuarios que después se volvieron a crear y hoy están activos.
    return false;
  elsif jsonb_typeof(v) = 'object' then
    e := v -> n;
    if e is null then return false; end if;
    return public._num(e->>'d') > public._num(e->>'r');
  end if;
  return false;
end $$;

create or replace function public._es_rol_admin(u jsonb)
returns boolean language sql immutable as $$
  select lower(btrim(coalesce(u->>'user', ''))) = 'admin'
      or lower(btrim(coalesce(u->>'rol', ''))) in ('admin', 'administrador', 'administradora')
      or coalesce(u->'permissions', '[]'::jsonb) ? 'configuracion'
$$;

-- Valida el token de sesión y devuelve la sesión
create or replace function public._sesion(p_token text)
returns public.app_sesiones language plpgsql security definer set search_path = public, extensions as $$
declare s public.app_sesiones; t public.talleres; u jsonb;
begin
  if p_token is null or length(p_token) < 40 then
    raise exception 'SESION_INVALIDA' using errcode = 'P0001';
  end if;
  select * into s from public.app_sesiones where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found or s.vence_el < now() then
    raise exception 'SESION_INVALIDA' using errcode = 'P0001';
  end if;
  if not s.es_superadmin then
    select * into t from public.talleres where id = s.tenant_id;
    if not found or t.estado <> 'activo' or (t.vence_el is not null and t.vence_el < current_date) then
      raise exception 'TALLER_SUSPENDIDO' using errcode = 'P0001';
    end if;
  end if;
  -- Cada 10 minutos: renovar la sesión y confirmar que el usuario sigue existiendo
  if s.ultimo_uso < now() - interval '10 minutes' then
    select e into u from jsonb_array_elements(public._lista_usuarios(s.tenant_id)) e
      where lower(btrim(e->>'user')) = s.usuario limit 1;
    if u is null or public._usuario_eliminado(s.tenant_id, s.usuario) then
      delete from public.app_sesiones where token_hash = s.token_hash;
      raise exception 'SESION_INVALIDA' using errcode = 'P0001';
    end if;
    update public.app_sesiones
       set ultimo_uso = now(),
           vence_el = greatest(vence_el, now() + interval '30 days'),
           es_admin = public._es_rol_admin(u)
     where token_hash = s.token_hash;
    s.es_admin := public._es_rol_admin(u);
  end if;
  return s;
end $$;

-- ¿La sesión puede leer/escribir esta llave?
create or replace function public._llave_permitida(s public.app_sesiones, p_key text)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare pref text;
begin
  if p_key is null or p_key = '' then return false; end if;
  if s.es_superadmin then return true; end if;
  if p_key like 'saas\_%' escape '\' then return false; end if;
  if left(p_key, length(s.tenant_id) + 1) = s.tenant_id || '_' then return true; end if;
  -- Llaves antiguas sin prefijo: solo pertenecen a Los Pits
  if s.tenant_id = 'lospits' then
    if position('_' in p_key) > 0 then
      pref := split_part(p_key, '_', 1);
      if exists (select 1 from public.talleres where id = pref) then return false; end if;
    end if;
    return true;
  end if;
  return false;
end $$;

-- Disparador: nunca guardar contraseñas en texto dentro de app_data
create or replace function public._proteger_claves()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_tenant text;
  v jsonb;
  e jsonb;
  out_arr jsonb := '[]'::jsonb;
  nombre text;
  anterior text;
  txt text;
begin
  v := new.value::jsonb;
  v_tenant := public._tenant_de_llave_usuarios(new.key);

  if v_tenant is not null and jsonb_typeof(v) = 'array'
     and exists (select 1 from public.talleres where id = v_tenant) then
    for e in select * from jsonb_array_elements(v) loop
      if jsonb_typeof(e) = 'object' then
        nombre := lower(btrim(coalesce(e->>'user', '')));
        anterior := lower(btrim(coalesce(e->>'renombradoDe', '')));
        -- Usuario renombrado: conservar su contraseña
        if nombre <> '' and anterior <> '' and anterior <> nombre
           and not exists (select 1 from public.credenciales where tenant_id = v_tenant and usuario = nombre) then
          update public.credenciales set usuario = nombre, actualizado_el = now()
           where tenant_id = v_tenant and usuario = anterior;
        end if;
        -- Contraseña nueva o cambiada
        if nombre <> '' and btrim(coalesce(e->>'pass', '')) <> '' then
          insert into public.credenciales (tenant_id, usuario, clave_hash)
          values (v_tenant, nombre, extensions.crypt(btrim(e->>'pass'), extensions.gen_salt('bf', 10)))
          on conflict (tenant_id, usuario) do update
            set clave_hash = case
                  when extensions.crypt(btrim(e->>'pass'), public.credenciales.clave_hash) = public.credenciales.clave_hash
                    then public.credenciales.clave_hash
                  else excluded.clave_hash end,
                actualizado_el = now();
        end if;
        e := e - 'pass' - 'passHash' - 'renombradoDe';
      end if;
      out_arr := out_arr || jsonb_build_array(e);
    end loop;
    new.value := out_arr;
  elsif v_tenant is not null and jsonb_typeof(v) = 'array' then
    -- Llave de usuarios de un taller no registrado: solo quitar contraseñas
    select coalesce(jsonb_agg(case when jsonb_typeof(x) = 'object' then x - 'pass' - 'passHash' - 'renombradoDe' else x end), '[]'::jsonb)
      into out_arr from jsonb_array_elements(v) x;
    new.value := out_arr;
  elsif new.key = 'saas_workshops' and jsonb_typeof(v) = 'array' then
    select coalesce(jsonb_agg(case when jsonb_typeof(x) = 'object' then x - 'pass' - 'adminPass' else x end), '[]'::jsonb)
      into out_arr from jsonb_array_elements(v) x;
    new.value := out_arr;
  elsif new.key ilike '%snapshot%' then
    -- Respaldos internos: borrar solo el texto de las contraseñas
    txt := v::text;
    if position('"pass"' in txt) > 0 then
      new.value := regexp_replace(txt, '"pass"\s*:\s*"(?:[^"\\]|\\.)*"', '"pass": ""', 'g')::jsonb;
    end if;
  end if;
  return new;
end $$;

-- Disparador: copiar a la papelera todo registro borrado
create or replace function public._respaldar_borrado()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.app_data_papelera (key, value, updated_at)
  values (old.key, old.value::jsonb, old.updated_at);
  return old;
end $$;

drop trigger if exists app_data_respaldar_borrado on public.app_data;
create trigger app_data_respaldar_borrado
  before delete on public.app_data
  for each row execute function public._respaldar_borrado();

-- ---------------------------------------------------------------------
-- 4. FUNCIONES PÚBLICAS (las usa la app)
-- ---------------------------------------------------------------------

create or replace function public.app_ping()
returns boolean language sql stable as $$ select true $$;

-- Inicio de sesión
create or replace function public.app_login(p_taller text, p_usuario text, p_clave text, p_agente text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_t text := lower(btrim(coalesce(p_taller, '')));
  v_in text := public._norm_usuario(p_usuario);
  v_clave text := btrim(coalesce(p_clave, ''));
  t public.talleres;
  e jsonb;
  u jsonb;
  nombre text;
  h text;
  fallos integer;
  v_token text;
  v_super boolean;
  v_admin boolean;
begin
  if v_t = '' or v_in = '' or v_clave = '' then
    return jsonb_build_object('ok', false, 'error', 'DATOS_INCOMPLETOS');
  end if;

  select count(*) into fallos from public.login_intentos
   where tenant_id = v_t and usuario = v_in and not exito and creado_el > now() - interval '15 minutes';
  if fallos >= 8 then
    return jsonb_build_object('ok', false, 'error', 'DEMASIADOS_INTENTOS');
  end if;

  select * into t from public.talleres where id = v_t;
  if found then
    for e in select * from jsonb_array_elements(public._lista_usuarios(v_t)) loop
      continue when jsonb_typeof(e) <> 'object';
      nombre := lower(btrim(coalesce(e->>'user', '')));
      continue when nombre = '';
      if public._norm_usuario(e->>'user') = v_in
         or (coalesce(e->>'nombreCompleto', '') <> '' and public._norm_usuario(e->>'nombreCompleto') = v_in) then
        select c.clave_hash into h from public.credenciales c where c.tenant_id = v_t and c.usuario = nombre;
        if h is not null then
          if extensions.crypt(v_clave, h) = h then u := e; exit; end if;
        elsif btrim(coalesce(e->>'pass', '')) <> '' and btrim(e->>'pass') = v_clave then
          -- Contraseña antigua en texto (antes de activar el paso 2)
          u := e; exit;
        end if;
      end if;
    end loop;
  end if;

  if u is not null and public._usuario_eliminado(v_t, u->>'user') then
    u := null;
  end if;

  insert into public.login_intentos (tenant_id, usuario, exito) values (v_t, v_in, u is not null);
  delete from public.login_intentos where creado_el < now() - interval '30 days';

  if u is null then
    perform pg_sleep(0.4);
    return jsonb_build_object('ok', false, 'error', 'CREDENCIALES_INVALIDAS');
  end if;

  nombre := lower(btrim(u->>'user'));
  v_super := exists (select 1 from public.admins_plataforma a where a.tenant_id = v_t and a.usuario = nombre);

  if not v_super and (t.estado <> 'activo' or (t.vence_el is not null and t.vence_el < current_date)) then
    return jsonb_build_object('ok', false, 'error', 'TALLER_SUSPENDIDO');
  end if;

  v_admin := public._es_rol_admin(u);
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.app_sesiones (token_hash, tenant_id, usuario, es_admin, es_superadmin, vence_el, agente)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_t, nombre, v_admin, v_super,
          now() + interval '30 days', left(coalesce(p_agente, ''), 300));
  delete from public.app_sesiones where vence_el < now();

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'taller', v_t,
    'tallerNombre', t.nombre,
    'canal', t.canal,
    'superadmin', v_super,
    'admin', v_admin,
    'usuario', u - 'pass' - 'passHash' - 'renombradoDe'
  );
end $$;

create or replace function public.app_logout(p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.app_sesiones where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  return true;
end $$;

-- Información de la sesión actual
create or replace function public.app_sesion_info(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s public.app_sesiones; t public.talleres;
begin
  s := public._sesion(p_token);
  select * into t from public.talleres where id = s.tenant_id;
  return jsonb_build_object('taller', s.tenant_id, 'usuario', s.usuario, 'admin', s.es_admin,
                            'superadmin', s.es_superadmin, 'canal', t.canal, 'tallerNombre', t.nombre);
end $$;

-- Leer llaves
create or replace function public.app_get(p_token text, p_keys text[])
returns table (key text, value jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare s public.app_sesiones;
begin
  s := public._sesion(p_token);
  return query
    select a.key, a.value::jsonb, a.updated_at
      from public.app_data a
     where a.key = any (p_keys) and public._llave_permitida(s, a.key);
end $$;

-- Fechas de modificación (sincronización incremental)
create or replace function public.app_versions(p_token text, p_keys text[])
returns table (key text, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare s public.app_sesiones;
begin
  s := public._sesion(p_token);
  return query
    select a.key, a.updated_at
      from public.app_data a
     where a.key = any (p_keys) and public._llave_permitida(s, a.key);
end $$;

-- Guardar una llave
create or replace function public.app_put(p_token text, p_key text, p_value jsonb)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare s public.app_sesiones; v_ts timestamptz := now();
begin
  s := public._sesion(p_token);
  if not public._llave_permitida(s, p_key) then
    raise exception 'LLAVE_NO_PERMITIDA' using errcode = 'P0001';
  end if;
  if public._tenant_de_llave_usuarios(p_key) is not null and not (s.es_admin or s.es_superadmin) then
    raise exception 'SIN_PERMISO' using errcode = 'P0001';
  end if;
  if p_key = 'saas_workshops' and not s.es_superadmin then
    raise exception 'SIN_PERMISO' using errcode = 'P0001';
  end if;
  insert into public.app_data (key, value, updated_at)
  values (p_key, p_value, v_ts)
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  return v_ts;
end $$;

-- Borrar llaves (solo administradores, solo llaves del propio taller; quedan en la papelera)
create or replace function public.app_delete(p_token text, p_keys text[])
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare s public.app_sesiones; n integer;
begin
  s := public._sesion(p_token);
  if not (s.es_admin or s.es_superadmin) then
    raise exception 'SIN_PERMISO' using errcode = 'P0001';
  end if;
  delete from public.app_data a
   where a.key = any (p_keys)
     and left(a.key, length(s.tenant_id) + 1) = s.tenant_id || '_'
     and public._tenant_de_llave_usuarios(a.key) is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 5. PANEL SAAS (solo administradores de la plataforma)
-- ---------------------------------------------------------------------

create or replace function public.saas_talleres(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s public.app_sesiones;
begin
  s := public._sesion(p_token);
  if not s.es_superadmin then raise exception 'SIN_PERMISO' using errcode = 'P0001'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'codigo', t.id, 'nombre', t.nombre, 'plan', t.plan, 'estado', t.estado,
      'venceEl', t.vence_el, 'maxUsuarios', t.max_usuarios, 'contactoNombre', t.contacto,
      'telefono', t.telefono, 'fechaRegistro', to_char(t.creado_el, 'YYYY-MM-DD'),
      'usuarios', jsonb_array_length(public._lista_usuarios(t.id)),
      'ultimoAcceso', (select max(x.ultimo_uso) from public.app_sesiones x where x.tenant_id = t.id)
    ) order by t.creado_el desc)
    from public.talleres t), '[]'::jsonb);
end $$;

-- Crear o actualizar un taller. Al crearlo se genera su usuario administrador.
create or replace function public.saas_guardar_taller(p_token text, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.app_sesiones;
  v_id text := lower(btrim(coalesce(p_datos->>'codigo', p_datos->>'id', '')));
  v_nuevo boolean;
  v_admin text := lower(btrim(coalesce(p_datos->>'adminUser', 'admin')));
  v_pass text := btrim(coalesce(p_datos->>'adminPass', ''));
begin
  s := public._sesion(p_token);
  if not s.es_superadmin then raise exception 'SIN_PERMISO' using errcode = 'P0001'; end if;
  if v_id !~ '^[a-z0-9][a-z0-9-]{1,39}$' then raise exception 'CODIGO_INVALIDO' using errcode = 'P0001'; end if;
  v_nuevo := not exists (select 1 from public.talleres where id = v_id);

  if v_nuevo then
    if length(v_pass) < 8 then raise exception 'CLAVE_DEBIL' using errcode = 'P0001'; end if;
    if v_admin = '' then v_admin := 'admin'; end if;
    -- No reutilizar un prefijo que ya tenga datos
    if exists (select 1 from public.app_data a where left(a.key, length(v_id) + 1) = v_id || '_') then
      raise exception 'CODIGO_EN_USO' using errcode = 'P0001';
    end if;
    insert into public.talleres (id, nombre, plan, estado, vence_el, max_usuarios, contacto, telefono)
    values (v_id,
            coalesce(nullif(btrim(p_datos->>'nombre'), ''), 'Taller ' || upper(v_id)),
            coalesce(nullif(p_datos->>'plan', ''), 'Piloto'),
            'activo',
            nullif(p_datos->>'venceEl', '')::date,
            nullif(p_datos->>'maxUsuarios', '')::integer,
            coalesce(p_datos->>'contactoNombre', ''),
            coalesce(p_datos->>'telefono', ''));
    insert into public.app_data (key, value, updated_at)
    values (v_id || '_usuarios', jsonb_build_array(jsonb_build_object(
              'user', v_admin, 'pass', v_pass, 'rol', 'admin',
              'permissions', '["dashboard","taller","carwash","parqueo","bodega","cafeteria","finanzas","repuestosFaltantes","configuracion","historial","tienda","cuentas","vehiculosVenta","clientesVehiculos","compras","accesorios"]'::jsonb,
              'nombreCompleto', coalesce(nullif(p_datos->>'contactoNombre', ''), 'Administrador del Taller'))),
            now());
  else
    update public.talleres set
      nombre       = coalesce(nullif(btrim(p_datos->>'nombre'), ''), nombre),
      plan         = coalesce(nullif(p_datos->>'plan', ''), plan),
      estado       = case when p_datos->>'estado' in ('activo', 'suspendido') then p_datos->>'estado' else estado end,
      vence_el     = case when p_datos ? 'venceEl' then nullif(p_datos->>'venceEl', '')::date else vence_el end,
      max_usuarios = case when p_datos ? 'maxUsuarios' then nullif(p_datos->>'maxUsuarios', '')::integer else max_usuarios end,
      contacto     = coalesce(p_datos->>'contactoNombre', contacto),
      telefono     = coalesce(p_datos->>'telefono', telefono)
    where id = v_id;
    if v_id = 'lospits' then
      update public.talleres set estado = 'activo', vence_el = null where id = 'lospits';
    elsif p_datos->>'estado' = 'suspendido' then
      -- Al suspender, cerrar las sesiones del taller
      delete from public.app_sesiones where tenant_id = v_id and not es_superadmin;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'nuevo', v_nuevo, 'codigo', v_id);
end $$;

-- ---------------------------------------------------------------------
-- 6. PORTAL PÚBLICO DEL CLIENTE (sin sesión, solo datos del cliente buscado)
-- ---------------------------------------------------------------------

create or replace function public._portal_llave(p_tenant text, p_base text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v jsonb;
begin
  select a.value::jsonb into v from public.app_data a where a.key = p_tenant || '_' || p_base;
  if v is null and p_tenant = 'lospits' then
    select a.value::jsonb into v from public.app_data a where a.key = p_base;
  end if;
  if v is not null and jsonb_typeof(v) = 'string' then
    begin v := (v #>> '{}')::jsonb; exception when others then v := null; end;
  end if;
  if v is null or jsonb_typeof(v) <> 'array' then return '[]'::jsonb; end if;
  return v;
end $$;

create or replace function public._solo_digitos(t text)
returns text language sql immutable as $$
  select right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 8)
$$;

create or replace function public._placa_norm(t text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public._portal_limite()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_ip text; n integer;
begin
  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'desconocida'), ',', 1);
  exception when others then v_ip := 'desconocida';
  end;
  select count(*) into n from public.portal_consultas where ip = v_ip and creado_el > now() - interval '10 minutes';
  if n >= 40 then raise exception 'DEMASIADAS_CONSULTAS' using errcode = 'P0001'; end if;
  insert into public.portal_consultas (ip) values (v_ip);
  delete from public.portal_consultas where creado_el < now() - interval '1 day';
end $$;

-- Busca al cliente SOLO por teléfono exacto (8 dígitos) o placa exacta
create or replace function public.portal_consultar(p_taller text, p_dato text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_t text := lower(btrim(coalesce(p_taller, '')));
  t public.talleres;
  v_tel text := '';
  v_placa text := '';
  v_nombre text := '';
  v_puntos integer := 0;
  r jsonb;
  ordenes jsonb;
  lavados jsonb;
  regalos jsonb;
  premios jsonb;
begin
  perform public._portal_limite();
  select * into t from public.talleres where id = v_t;
  if not found or t.estado <> 'activo' then
    return jsonb_build_object('ok', false, 'error', 'TALLER_NO_DISPONIBLE');
  end if;

  if length(regexp_replace(coalesce(p_dato, ''), '\D', '', 'g')) >= 8
     and coalesce(p_dato, '') ~ '^[\s\d+()-]+$' then
    v_tel := public._solo_digitos(p_dato);
  else
    v_placa := public._placa_norm(p_dato);
    if length(v_placa) < 5 then
      return jsonb_build_object('ok', false, 'error', 'DATO_INVALIDO');
    end if;
    -- Placa -> teléfono del dueño
    select public._solo_digitos(coalesce(nullif(v->>'clienteTelefono', ''), v->>'telefono', '')),
           coalesce(v->>'propietario', v->>'cliente', '')
      into v_tel, v_nombre
      from jsonb_array_elements(public._portal_llave(v_t, 'vehiculos')) v
     where public._placa_norm(v->>'placa') = v_placa limit 1;
    if coalesce(v_tel, '') = '' then
      select public._solo_digitos(o->>'telefono'), coalesce(o->>'cliente', '')
        into v_tel, v_nombre
        from jsonb_array_elements(public._portal_llave(v_t, 'ordenes')) o
       where position(v_placa in public._placa_norm(o->>'vehiculo')) > 0
          or public._placa_norm(o->>'placa') = v_placa
       order by o->>'fecha' desc nulls last limit 1;
    end if;
    v_tel := coalesce(v_tel, '');
  end if;

  if v_tel = '' and v_placa = '' then
    return jsonb_build_object('ok', false, 'error', 'NO_ENCONTRADO');
  end if;

  -- Nombre y puntos
  v_nombre := coalesce(v_nombre, '');
  if v_tel <> '' then
    select p into r
      from jsonb_array_elements(public._portal_llave(v_t, 'puntosRecompensas')) p
     where public._solo_digitos(p->>'telefono') = v_tel limit 1;
    if r is not null then
      v_puntos := public._num(r->>'puntos')::integer;
      if coalesce(r->>'nombre', '') <> '' then v_nombre := r->>'nombre'; end if;
    end if;
    if v_nombre = '' then
      select coalesce(c->>'nombre', '') into v_nombre
        from jsonb_array_elements(public._portal_llave(v_t, 'clientes')) c
       where public._solo_digitos(c->>'telefono') = v_tel limit 1;
      v_nombre := coalesce(v_nombre, '');
    end if;
  end if;
  v_puntos := coalesce(v_puntos, 0);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o->'id', 'fecha', o->'fecha', 'vehiculo', o->'vehiculo', 'estado', o->'estado',
           'trabajo', o->'trabajo', 'mecanico', o->'mecanico', 'total', o->'total',
           'fotos', coalesce(o->'fotos', '[]'::jsonb))
         order by o->>'fecha' desc nulls last), '[]'::jsonb)
    into ordenes
    from jsonb_array_elements(public._portal_llave(v_t, 'ordenes')) o
   where (v_tel <> '' and public._solo_digitos(o->>'telefono') = v_tel)
      or (v_placa <> '' and (position(v_placa in public._placa_norm(o->>'vehiculo')) > 0
                             or public._placa_norm(o->>'placa') = v_placa));

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c->'id', 'fecha', c->'fecha', 'vehiculo', c->'vehiculo', 'estado', c->'estado',
           'tipo', c->'tipo', 'lavador', c->'lavador', 'precio', c->'precio')
         order by c->>'fecha' desc nulls last), '[]'::jsonb)
    into lavados
    from jsonb_array_elements(public._portal_llave(v_t, 'carwash')) c
   where (v_tel <> '' and public._solo_digitos(c->>'telefono') = v_tel)
      or (v_placa <> '' and public._placa_norm(c#>>'{vehiculo,placa}') = v_placa);

  select coalesce(jsonb_agg(g order by g->>'fechaCreacion' desc), '[]'::jsonb) into regalos
    from jsonb_array_elements(public._portal_llave(v_t, 'regalosPasesReferidos')) g
   where v_tel <> '' and public._solo_digitos(g->>'clienteDonanteTelefono') = v_tel;

  premios := public._portal_llave(v_t, 'catalogoPremios');

  if coalesce(v_nombre, '') = '' and jsonb_array_length(ordenes) = 0 and jsonb_array_length(lavados) = 0 and v_puntos = 0 then
    return jsonb_build_object('ok', false, 'error', 'NO_ENCONTRADO');
  end if;

  return jsonb_build_object(
    'ok', true,
    'taller', jsonb_build_object('codigo', t.id, 'nombre', t.nombre),
    'cliente', jsonb_build_object('nombre', coalesce(nullif(v_nombre, ''), 'Cliente'),
                                  'telefono', v_tel, 'puntos', v_puntos),
    'ordenes', ordenes,
    'carwash', lavados,
    'regalos', regalos,
    'premios', premios);
end $$;

-- Donar puntos: solo con el teléfono exacto del cliente; el servidor descuenta los puntos
create or replace function public.portal_donar(p_taller text, p_telefono text, p_premio_id text,
                                               p_invitado_nombre text default '', p_invitado_telefono text default '')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_t text := lower(btrim(coalesce(p_taller, '')));
  v_tel text := public._solo_digitos(p_telefono);
  t public.talleres;
  lista jsonb;
  premios jsonb;
  premio jsonb;
  v_req integer;
  idx integer;
  cli jsonb;
  v_pts integer;
  regalo jsonb;
  v_rand text := upper(encode(extensions.gen_random_bytes(4), 'hex'));
  v_now text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  perform public._portal_limite();
  select * into t from public.talleres where id = v_t;
  if not found or t.estado <> 'activo' then return jsonb_build_object('ok', false, 'error', 'TALLER_NO_DISPONIBLE'); end if;
  if length(v_tel) < 8 then return jsonb_build_object('ok', false, 'error', 'DATO_INVALIDO'); end if;

  premios := public._portal_llave(v_t, 'catalogoPremios');
  if jsonb_array_length(premios) = 0 then
    premios := '[{"id":"p1","nombre":"Lavado Bronce","puntos":1000},{"id":"p2","nombre":"Encerado a Mano","puntos":1800},{"id":"p3","nombre":"Lavado de Motor o Chasis","puntos":2400},{"id":"p4","nombre":"Lavado Oro o Eliminación de Sarro","puntos":4500},{"id":"p5","nombre":"Pulido y Lustrado Completo","puntos":10000}]'::jsonb;
  end if;
  select p into premio from jsonb_array_elements(premios) p where p->>'id' = p_premio_id limit 1;
  if premio is null then return jsonb_build_object('ok', false, 'error', 'PREMIO_NO_EXISTE'); end if;
  v_req := public._num(coalesce(nullif(premio->>'puntos', ''), nullif(premio->>'puntosRequeridos', ''), '1000'))::integer;

  -- Bloquear la fila de puntos mientras se descuenta
  perform 1 from public.app_data where key = v_t || '_puntosRecompensas' for update;
  lista := public._portal_llave(v_t, 'puntosRecompensas');
  select (x.ord - 1)::integer, x.val into idx, cli
    from jsonb_array_elements(lista) with ordinality as x(val, ord)
   where public._solo_digitos(x.val->>'telefono') = v_tel limit 1;
  if cli is null then return jsonb_build_object('ok', false, 'error', 'NO_ENCONTRADO'); end if;
  v_pts := public._num(cli->>'puntos')::integer;
  if v_pts < v_req then
    return jsonb_build_object('ok', false, 'error', 'PUNTOS_INSUFICIENTES', 'puntos', v_pts);
  end if;

  cli := jsonb_set(cli, '{puntos}', to_jsonb(v_pts - v_req));
  cli := jsonb_set(cli, '{updatedAt}', to_jsonb(v_now));
  lista := jsonb_set(lista, array[idx::text], cli);
  insert into public.app_data (key, value, updated_at) values (v_t || '_puntosRecompensas', lista, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  regalo := jsonb_build_object(
    'id', 'gift_' || (extract(epoch from now()) * 1000)::bigint || '_' || v_rand,
    'codigoQR', 'REGALO-DONA-' || upper(to_hex((extract(epoch from now()) * 1000)::bigint)) || '-' || v_rand,
    'clienteDonanteTelefono', coalesce(cli->>'telefono', v_tel),
    'clienteDonanteNombre', coalesce(cli->>'nombre', ''),
    'servicioNombre', coalesce(premio->>'nombre', premio->>'titulo', 'Servicio'),
    'tipoRegalo', 'puntos_donados',
    'puntosConsumidos', v_req,
    'invitadoNombre', coalesce(nullif(btrim(p_invitado_nombre), ''), 'Amigo / Familiar'),
    'invitadoTelefono', left(btrim(coalesce(p_invitado_telefono, '')), 30),
    'estado', 'Pendiente',
    'fechaCreacion', v_now,
    'updatedAt', v_now,
    'fechaCanje', null,
    'canjeadoEn', null);

  insert into public.app_data (key, value, updated_at)
  values (v_t || '_regalosPasesReferidos', jsonb_build_array(regalo) || public._portal_llave(v_t, 'regalosPasesReferidos'), now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'regalo', regalo, 'puntos', v_pts - v_req);
end $$;

-- ---------------------------------------------------------------------
-- 7. PERMISOS DE EJECUCIÓN
-- ---------------------------------------------------------------------
revoke execute on function
  public._norm_usuario(text), public._num(text), public._tenant_de_llave_usuarios(text), public._lista_usuarios(text),
  public._usuario_eliminado(text, text), public._es_rol_admin(jsonb), public._sesion(text),
  public._llave_permitida(public.app_sesiones, text), public._proteger_claves(), public._respaldar_borrado(),
  public._portal_llave(text, text), public._solo_digitos(text), public._placa_norm(text), public._portal_limite()
  from public, anon, authenticated;

grant execute on function
  public.app_ping(), public.app_login(text, text, text, text), public.app_logout(text),
  public.app_sesion_info(text), public.app_get(text, text[]), public.app_versions(text, text[]),
  public.app_put(text, text, jsonb), public.app_delete(text, text[]),
  public.saas_talleres(text), public.saas_guardar_taller(text, jsonb),
  public.portal_consultar(text, text), public.portal_donar(text, text, text, text, text)
  to anon, authenticated;
