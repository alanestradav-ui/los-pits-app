-- =====================================================================
-- LOS PITS APP · SEGURIDAD MULTI-TALLER · PASO 2 (BLOQUEO)
-- Ejecutar SOLO cuando la nueva versión de la app ya esté publicada.
-- 1) Cifra las contraseñas existentes y las quita de los datos.
-- 2) Activa el disparador que impide volver a guardar contraseñas en texto.
-- 3) Cierra el acceso directo a la tabla app_data (solo vía funciones).
-- No borra ningún registro. Es seguro ejecutarlo varias veces.
-- =====================================================================

-- 1. Migrar contraseñas en texto -> credenciales cifradas
insert into public.credenciales (tenant_id, usuario, clave_hash)
select t.id, lower(btrim(e->>'user')), extensions.crypt(btrim(e->>'pass'), extensions.gen_salt('bf', 10))
from public.talleres t
join public.app_data a on a.key = t.id || '_usuarios'
cross join lateral jsonb_array_elements(case when jsonb_typeof(a.value::jsonb) = 'array' then a.value::jsonb else '[]'::jsonb end) e
where jsonb_typeof(e) = 'object'
  and btrim(coalesce(e->>'user', '')) <> ''
  and btrim(coalesce(e->>'pass', '')) <> ''
on conflict (tenant_id, usuario) do nothing;

-- Los Pits: usuarios que solo existen en la llave antigua sin prefijo
insert into public.credenciales (tenant_id, usuario, clave_hash)
select 'lospits', lower(btrim(e->>'user')), extensions.crypt(btrim(e->>'pass'), extensions.gen_salt('bf', 10))
from public.app_data a
cross join lateral jsonb_array_elements(case when jsonb_typeof(a.value::jsonb) = 'array' then a.value::jsonb else '[]'::jsonb end) e
where a.key = 'usuarios'
  and not exists (select 1 from public.app_data b where b.key = 'lospits_usuarios')
  and jsonb_typeof(e) = 'object'
  and btrim(coalesce(e->>'user', '')) <> ''
  and btrim(coalesce(e->>'pass', '')) <> ''
on conflict (tenant_id, usuario) do nothing;

-- 2. Disparador que cifra/quita contraseñas en cada escritura
drop trigger if exists app_data_proteger_claves on public.app_data;
create trigger app_data_proteger_claves
  before insert or update on public.app_data
  for each row execute function public._proteger_claves();

-- Pasar todas las llaves con contraseñas por el disparador (solo quita el texto de las claves)
update public.app_data set value = value
where key = 'usuarios' or key like '%\_usuarios' escape '\' or key = 'saas_workshops' or key ilike '%snapshot%';

-- 3. Cerrar el acceso directo a app_data
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_data' loop
    execute format('drop policy %I on public.app_data', p.policyname);
  end loop;
end $$;

alter table public.app_data enable row level security;
revoke all on public.app_data from anon, authenticated;

-- Sin políticas para anon/authenticated = sin acceso directo.
-- El dueño de la tabla (usado por las funciones SECURITY DEFINER) conserva el acceso.
