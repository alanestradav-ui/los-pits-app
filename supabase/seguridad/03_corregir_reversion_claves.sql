-- =====================================================================
-- 03 - Corrección: una lista de usuarios antigua guardada en un dispositivo
--      ya NO puede revertir contraseñas.
--      La contraseña solo se guarda si:
--        a) el usuario todavía no tiene contraseña registrada, o
--        b) la app marca el cambio explícito con "cambioClave": true
-- =====================================================================
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
  v_cambio boolean;
begin
  v := new.value::jsonb;
  v_tenant := public._tenant_de_llave_usuarios(new.key);

  if v_tenant is not null and jsonb_typeof(v) = 'array'
     and exists (select 1 from public.talleres where id = v_tenant) then
    for e in select * from jsonb_array_elements(v) loop
      if jsonb_typeof(e) = 'object' then
        nombre := lower(btrim(coalesce(e->>'user', '')));
        anterior := lower(btrim(coalesce(e->>'renombradoDe', '')));
        v_cambio := lower(coalesce(e->>'cambioClave', '')) in ('true', '1', 'si', 'sí');
        -- Usuario renombrado: conservar su contraseña
        if nombre <> '' and anterior <> '' and anterior <> nombre
           and not exists (select 1 from public.credenciales where tenant_id = v_tenant and usuario = nombre) then
          update public.credenciales set usuario = nombre, actualizado_el = now()
           where tenant_id = v_tenant and usuario = anterior;
        end if;
        -- Contraseña: solo si es un usuario sin contraseña o un cambio explícito
        if nombre <> '' and btrim(coalesce(e->>'pass', '')) <> '' then
          if not exists (select 1 from public.credenciales where tenant_id = v_tenant and usuario = nombre) then
            insert into public.credenciales (tenant_id, usuario, clave_hash)
            values (v_tenant, nombre, extensions.crypt(btrim(e->>'pass'), extensions.gen_salt('bf', 10)));
          elsif v_cambio then
            update public.credenciales
               set clave_hash = extensions.crypt(btrim(e->>'pass'), extensions.gen_salt('bf', 10)),
                   actualizado_el = now()
             where tenant_id = v_tenant and usuario = nombre
               and extensions.crypt(btrim(e->>'pass'), clave_hash) <> clave_hash;
          end if;
        end if;
        e := e - 'pass' - 'passHash' - 'renombradoDe' - 'cambioClave';
      end if;
      out_arr := out_arr || jsonb_build_array(e);
    end loop;
    new.value := out_arr;
  elsif v_tenant is not null and jsonb_typeof(v) = 'array' then
    -- Llave de usuarios de un taller no registrado: solo quitar contraseñas
    select coalesce(jsonb_agg(case when jsonb_typeof(x) = 'object' then x - 'pass' - 'passHash' - 'renombradoDe' - 'cambioClave' else x end), '[]'::jsonb)
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

revoke execute on function public._proteger_claves() from public, anon, authenticated;
