-- Límite de los tokens de las aplicaciones conectadas (cambio mcp-cruce, design D10).
--
-- El token que Supabase Auth le da a una aplicación conectada por OAuth (Claude) es una sesión completa de la persona:
-- sin esto, sirve para todo lo que ella puede hacer en la API, no solo para lo que hacen las herramientas del MCP.
-- Esos tokens traen el claim client_id; los de la app de iOS no, y para ellos nada cambia.
--
--   - oauth_request_guard: pre-request de PostgREST. Con client_id, la sesión tiene que seguir viva (quitar el acceso
--     la borra, así el token deja de servir de inmediato) y solo pasan las lecturas (GET y HEAD), anotar en movements
--     y las dos funciones de lectura que usan las herramientas (my_cruces y parche_summary).
--   - movements_oauth_guard: con client_id, en movements solo se insertan gastos; nada de pagos, ediciones ni borrados
--     (cubre también un upsert, que llega como POST).
--   - movements_oauth_session: política restrictiva de lectura en movements. Realtime no pasa por la pre-request: lee
--     con RLS y los claims del token. Con client_id y la sesión borrada, no se ve ningún movimiento.
--   - Sin contraseñas, porque Cruce no las usa (se entra con un código por correo):
--     - block_password_change: nadie le pone ni le cambia la contraseña a una cuenta. Así un token de una aplicación
--       no se convierte en una forma de entrar con correo y contraseña.
--     - forget_new_password: la contraseña con la que nace una cuenta se cambia por una al azar que nadie conoce. Supabase
--       Auth ya le pone una al azar a cada cuenta por código; esto cubre /signup con una contraseña elegida, que si no
--       dejaría a alguien entrar a la cuenta de otra persona que todavía no se ha creado la suya.

-- ─────────────────────────────────────────────────────────────
-- Claims de la petición
-- ─────────────────────────────────────────────────────────────

-- oauth_client_id() → el client_id del token de la petición, o null si no es de una aplicación conectada.
create function public.oauth_client_id() returns text
language sql stable set search_path = '' as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'client_id', '')
$$;

-- oauth_session_alive() → false solo si el token es de una aplicación conectada y su sesión ya no existe (se quitó el
-- acceso o se borró la cuenta). security definer para leer auth.sessions, que el rol de la petición no ve.
create function public.oauth_session_alive() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_session uuid;
begin
  if v_claims is null or nullif(v_claims ->> 'client_id', '') is null then
    return true;
  end if;
  begin
    v_session := (v_claims ->> 'session_id')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return v_session is not null and exists (select 1 from auth.sessions where id = v_session);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Pre-request de PostgREST
-- ─────────────────────────────────────────────────────────────

create function public.oauth_request_guard() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_method text := upper(coalesce(current_setting('request.method', true), ''));
  v_path text := ltrim(coalesce(current_setting('request.path', true), ''), '/');
begin
  if v_claims is null or nullif(v_claims ->> 'client_id', '') is null then
    return;
  end if;

  -- Quitar el acceso (o borrar la cuenta) borra la sesión: el token deja de servir aunque no haya vencido.
  if not public.oauth_session_alive() then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'accessRevoked',
        'message', 'Esta aplicación ya no tiene acceso a Cruce.',
        'hint', 'accessRevoked')::text,
      detail = json_build_object('status', 401, 'headers', json_build_object())::text;
  end if;

  if v_method in ('GET', 'HEAD') then
    return;
  end if;
  if v_method = 'POST' and v_path in ('movements', 'rpc/my_cruces', 'rpc/parche_summary') then
    return;
  end if;

  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'appNotAllowed',
      'message', 'Una aplicación conectada solo puede leer y anotar gastos en Cruce.',
      'hint', 'appNotAllowed')::text,
    detail = json_build_object('status', 403, 'headers', json_build_object())::text;
end;
$$;

-- PostgREST la llama como el rol de la petición, con o sin sesión.
revoke all on function public.oauth_request_guard() from public;
grant execute on function public.oauth_request_guard() to anon, authenticated;
revoke all on function public.oauth_client_id() from public;
grant execute on function public.oauth_client_id() to anon, authenticated;
revoke all on function public.oauth_session_alive() from public;
grant execute on function public.oauth_session_alive() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'public.oauth_request_guard';
notify pgrst, 'reload config';

-- ─────────────────────────────────────────────────────────────
-- movements: una aplicación conectada solo anota gastos
-- ─────────────────────────────────────────────────────────────

create function public.movements_oauth_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.oauth_client_id() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.kind = 'expense' then
    return new;
  end if;
  raise exception 'Una aplicación conectada solo puede anotar gastos.'
    using errcode = '42501', hint = 'appNotAllowed';
end;
$$;

revoke all on function public.movements_oauth_guard() from public, anon, authenticated;

create trigger movements_oauth_guard
  before insert or update or delete on public.movements
  for each row execute function public.movements_oauth_guard();

-- Realtime (postgres_changes) lee movements con RLS y los claims del token: una política restrictiva corta el token
-- de una aplicación apenas se le quita el acceso. (select …) la evalúa una vez por consulta, no por fila.
create policy movements_oauth_session on public.movements
  as restrictive for select to authenticated
  using ((select public.oauth_session_alive()));

-- ─────────────────────────────────────────────────────────────
-- auth.users: sin contraseñas
-- ─────────────────────────────────────────────────────────────

-- Supabase Auth escribe auth.users con su propio rol: el trigger corre para cualquier camino (la API, el panel o el
-- servidor OAuth). Una cuenta nueva trae una contraseña al azar que nadie conoce; lo que se rechaza es cambiarla.
create function public.block_password_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Cruce no usa contraseñas: se entra con un código por correo.'
    using errcode = '42501', hint = 'passwordsDisabled';
end;
$$;

revoke all on function public.block_password_change() from public, anon, authenticated;

create trigger block_password_change
  before update of encrypted_password on auth.users
  for each row
  when (new.encrypted_password is distinct from old.encrypted_password)
  execute function public.block_password_change();

-- security definer para usar pgcrypto (en extensions), que el rol de Supabase Auth no ve.
create function public.forget_new_password() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.encrypted_password := extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'));
  return new;
end;
$$;

revoke all on function public.forget_new_password() from public, anon, authenticated;

create trigger forget_new_password
  before insert on auth.users
  for each row
  when (coalesce(new.encrypted_password, '') <> '')
  execute function public.forget_new_password();
