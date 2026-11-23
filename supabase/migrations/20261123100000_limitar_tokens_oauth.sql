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
--   - block_password_change: nadie le pone ni le cambia la contraseña a una cuenta, porque Cruce no usa contraseñas
--     (se entra con un código por correo). Así un token de una aplicación no se convierte en una forma de entrar con
--     correo y contraseña. Supabase Auth le pone una contraseña al azar a cada cuenta nueva: crearla sigue igual.
--
-- La pre-request solo cubre la API de datos (PostgREST); Realtime no pasa por ella (ver los riesgos del design).

-- ─────────────────────────────────────────────────────────────
-- Claims de la petición
-- ─────────────────────────────────────────────────────────────

-- oauth_client_id() → el client_id del token de la petición, o null si no es de una aplicación conectada.
create function public.oauth_client_id() returns text
language sql stable set search_path = '' as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'client_id', '')
$$;

-- ─────────────────────────────────────────────────────────────
-- Pre-request de PostgREST
-- ─────────────────────────────────────────────────────────────

-- security definer para leer auth.sessions, que el rol de la petición no ve.
create function public.oauth_request_guard() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_method text := upper(coalesce(current_setting('request.method', true), ''));
  v_path text := ltrim(coalesce(current_setting('request.path', true), ''), '/');
  v_session uuid;
begin
  if v_claims is null or nullif(v_claims ->> 'client_id', '') is null then
    return;
  end if;

  -- Quitar el acceso (o borrar la cuenta) borra la sesión: el token deja de servir aunque no haya vencido.
  begin
    v_session := (v_claims ->> 'session_id')::uuid;
  exception when invalid_text_representation then
    v_session := null;
  end;
  if v_session is null or not exists (select 1 from auth.sessions where id = v_session) then
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
