-- Límite de los tokens de las aplicaciones conectadas (cambio mcp-cruce, design D10).
-- "Con un token emitido a una aplicación conectada (OAuth), la base SHALL aceptar solo lecturas, anotar un gasto en
-- movements y las funciones de lectura que usan las herramientas." Quitar el acceso corta el token de inmediato.
-- "Ponerle o cambiarle la contraseña a una cuenta MUST rechazarse." La app de iOS (sin client_id) no cambia.
-- La pre-request se prueba llamándola con los mismos ajustes que pone PostgREST (request.jwt.claims, request.method y
-- request.path); el recorrido de scripts/mcp-local.sh la prueba por HTTP con un token OAuth real.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Joan con la sesión de la app (sin client_id) o con la de Claude (client_id y session_id).
create function pg_temp.request(p_claims text, p_method text, p_path text) returns void language sql as $$
  select set_config('request.jwt.claims', coalesce(p_claims, ''), true),
         set_config('request.method', p_method, true),
         set_config('request.path', p_path, true);
$$;
create function pg_temp.app() returns text language sql as $$
  select '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated",'
      || '"session_id":"23000000-0000-0000-0000-00000000aaaa"}'
$$;
create function pg_temp.claude(p_session text default '23000000-0000-0000-0000-00000000c1a0') returns text
language sql as $$
  select '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated","client_id":"claude-cliente",'
      || '"session_id":' || coalesce('"' || p_session || '"', 'null') || '}'
$$;
create function pg_temp.guard(p_claims text, p_method text, p_path text) returns void language sql as $$
  select pg_temp.request(p_claims, p_method, p_path);
  select public.oauth_request_guard();
$$;

insert into auth.users (id, email) values
  ('23000000-0000-0000-0000-000000000001', 'joan@example.com'),
  ('23000000-0000-0000-0000-000000000002', 'jesus@example.com');
insert into public.profiles (id, display_name) values
  ('23000000-0000-0000-0000-000000000001', 'Joan'),
  ('23000000-0000-0000-0000-000000000002', 'Jesús');
insert into auth.sessions (id, user_id) values
  ('23000000-0000-0000-0000-00000000aaaa', '23000000-0000-0000-0000-000000000001'),
  ('23000000-0000-0000-0000-00000000c1a0', '23000000-0000-0000-0000-000000000001');

select set_config('request.jwt.claims', '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
create temp table joan_code as select public.create_ledger_with_invite() as code;
select set_config('request.jwt.claims', '{"sub":"23000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.redeem_invite((select code from joan_code));
select set_config('t.ledger', (
  select ledger_id::text from public.ledger_members where user_id = '23000000-0000-0000-0000-000000000002'), true);

-- ─────────────────────────────────────────────────────────────
-- Pre-request de PostgREST
-- ─────────────────────────────────────────────────────────────
select ok(
  (select rolconfig::text from pg_roles where rolname = 'authenticator')
    like '%pgrst.db_pre_request=public.oauth_request_guard%',
  'PostgREST corre oauth_request_guard antes de cada petición');

-- La app y las peticiones sin sesión no cambian.
select lives_ok($$select pg_temp.guard(pg_temp.app(), 'PATCH', '/profiles')$$, 'La app sigue editando el perfil');
select lives_ok($$select pg_temp.guard(pg_temp.app(), 'POST', '/rpc/delete_my_account')$$,
  'La app sigue pudiendo borrar la cuenta');
select lives_ok($$select pg_temp.guard(pg_temp.app(), 'DELETE', '/movements')$$, 'La app sigue borrando');
select lives_ok($$select pg_temp.guard(null, 'POST', '/rpc/preview_invite')$$, 'Sin sesión pasa igual que antes');
select lives_ok($$select pg_temp.guard('{"role":"anon"}', 'GET', '/profiles')$$, 'anon pasa igual que antes');

-- Lo que usan las herramientas del MCP.
select lives_ok($$select pg_temp.guard(pg_temp.claude(), 'GET', '/movements')$$, 'Claude lee movimientos');
select lives_ok($$select pg_temp.guard(pg_temp.claude(), 'HEAD', '/ledger_balances')$$, 'Claude lee con HEAD');
select lives_ok($$select pg_temp.guard(pg_temp.claude(), 'POST', '/movements')$$, 'Claude anota en movements');
select lives_ok($$select pg_temp.guard(pg_temp.claude(), 'POST', 'movements')$$, 'La ruta sin barra también sirve');
select lives_ok($$select pg_temp.guard(pg_temp.claude(), 'POST', '/rpc/my_cruces')$$, 'Claude llama a my_cruces');
select lives_ok($$select pg_temp.guard(pg_temp.claude(), 'POST', '/rpc/parche_summary')$$,
  'Claude llama a parche_summary');

-- Todo lo demás, rechazado.
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'PATCH', '/profiles')$$, 'appNotAllowed',
  'Claude no edita el perfil');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'POST', '/profiles')$$, 'appNotAllowed',
  'Claude no crea perfiles');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'PATCH', '/movements')$$, 'appNotAllowed',
  'Claude no edita movimientos');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'DELETE', '/movements')$$, 'appNotAllowed',
  'Claude no borra movimientos');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'PUT', '/movements')$$, 'appNotAllowed',
  'Claude no reemplaza movimientos');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'POST', '/rpc/delete_my_account')$$, 'appNotAllowed',
  'Claude no borra la cuenta');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'POST', '/rpc/create_ledger_with_invite')$$,
  'appNotAllowed', 'Claude no crea cruces');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'POST', '/rpc/save_parche_expense')$$,
  'appNotAllowed', 'Claude no escribe en parches');
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'POST', '/movements/x')$$, 'appNotAllowed',
  'Una ruta parecida no pasa');

-- Sin una sesión viva, el token no sirve ni para leer.
select throws_matching($$select pg_temp.guard(pg_temp.claude('23000000-0000-0000-0000-00000000dead'), 'GET', '/movements')$$,
  'accessRevoked', 'Una sesión que no existe no lee');
select throws_matching($$select pg_temp.guard(pg_temp.claude('no-es-un-uuid'), 'GET', '/movements')$$,
  'accessRevoked', 'Un session_id inválido no lee');
select throws_matching($$select pg_temp.guard(pg_temp.claude(null), 'GET', '/movements')$$,
  'accessRevoked', 'Sin session_id no lee');
delete from auth.sessions where id = '23000000-0000-0000-0000-00000000c1a0';
select throws_matching($$select pg_temp.guard(pg_temp.claude(), 'GET', '/movements')$$,
  'accessRevoked', 'Después de quitar el acceso, el mismo token ya no lee');
select lives_ok($$select pg_temp.guard(pg_temp.app(), 'GET', '/movements')$$,
  'Quitarle el acceso a Claude no toca la sesión de la app');
insert into auth.sessions (id, user_id) values
  ('23000000-0000-0000-0000-00000000c1a0', '23000000-0000-0000-0000-000000000001');

-- ─────────────────────────────────────────────────────────────
-- movements: una aplicación conectada solo anota gastos
-- ─────────────────────────────────────────────────────────────
select pg_temp.request(pg_temp.claude(), 'POST', '/movements');
set local role authenticated;
select lives_ok(
  $$insert into public.movements (id, ledger_id, payer_id, amount, concept, created_by)
    values ('23000000-0000-0000-0000-0000000000e1', current_setting('t.ledger')::uuid,
            '23000000-0000-0000-0000-000000000001', 60000, 'Cena', '23000000-0000-0000-0000-000000000001')$$,
  'Claude anota un gasto');
select throws_ok(
  $$insert into public.movements (ledger_id, kind, payer_id, amount, concept, split_type, other_share_percent, created_by)
    values (current_setting('t.ledger')::uuid, 'settlement', '23000000-0000-0000-0000-000000000002', 30000, 'Saldar',
            'full_other', 100, '23000000-0000-0000-0000-000000000001')$$,
  '42501', 'Una aplicación conectada solo puede anotar gastos.', 'Claude no anota un pago');
select throws_ok(
  $$update public.movements set amount = 1 where id = '23000000-0000-0000-0000-0000000000e1'$$,
  '42501', 'Una aplicación conectada solo puede anotar gastos.', 'Claude no edita un gasto (ni con un upsert)');
select throws_ok(
  $$update public.movements set deleted_at = now() where id = '23000000-0000-0000-0000-0000000000e1'$$,
  '42501', 'Una aplicación conectada solo puede anotar gastos.', 'Claude no borra un gasto');
select is((select amount from public.movements where id = '23000000-0000-0000-0000-0000000000e1'), 60000::bigint,
  'El gasto quedó como lo anotó');

-- La app sí edita, borra y salda.
select pg_temp.request(pg_temp.app(), 'PATCH', '/movements');
select lives_ok(
  $$update public.movements set amount = 50000 where id = '23000000-0000-0000-0000-0000000000e1'$$,
  'La app sigue editando gastos');
select lives_ok(
  $$insert into public.movements (ledger_id, kind, payer_id, amount, concept, split_type, other_share_percent, created_by)
    values (current_setting('t.ledger')::uuid, 'settlement', '23000000-0000-0000-0000-000000000002', 25000, 'Saldar',
            'full_other', 100, '23000000-0000-0000-0000-000000000001')$$,
  'La app sigue anotando pagos');
reset role;

-- ─────────────────────────────────────────────────────────────
-- auth.users: sin contraseñas
-- ─────────────────────────────────────────────────────────────
select throws_ok(
  $$update auth.users set encrypted_password = extensions.crypt('clave', extensions.gen_salt('bf'))
    where id = '23000000-0000-0000-0000-000000000001'$$,
  '42501', 'Cruce no usa contraseñas: se entra con un código por correo.', 'Nadie le pone contraseña a una cuenta');
select lives_ok(
  $$update auth.users set last_sign_in_at = now(), encrypted_password = encrypted_password
    where id = '23000000-0000-0000-0000-000000000001'$$,
  'Entrar (y cualquier otro cambio sin tocar la contraseña) sigue igual');
select lives_ok(
  $$insert into auth.users (id, email, encrypted_password)
    values ('23000000-0000-0000-0000-000000000003', 'ana@example.com', extensions.crypt('azar', extensions.gen_salt('bf')))$$,
  'Una cuenta nueva sigue naciendo con la contraseña al azar de Supabase Auth');
select isnt(
  (select encrypted_password::text from auth.users where id = '23000000-0000-0000-0000-000000000003'),
  (select extensions.crypt('azar', encrypted_password)::text from auth.users where id = '23000000-0000-0000-0000-000000000003'),
  'La contraseña con la que se crea una cuenta (por ejemplo con /signup) no sirve para entrar');
select ok(
  (select encrypted_password like '$2%' from auth.users where id = '23000000-0000-0000-0000-000000000003'),
  'La cuenta nueva queda con una contraseña al azar con el formato de Supabase Auth');

-- ─────────────────────────────────────────────────────────────
-- Realtime: lee movements con RLS y los claims del token, sin pasar por la pre-request
-- ─────────────────────────────────────────────────────────────
select pg_temp.request(pg_temp.claude(), 'GET', '/movements');
set local role authenticated;
select is((select count(*) from public.movements where ledger_id = current_setting('t.ledger')::uuid), 2::bigint,
  'Con el acceso vigente, Claude lee los movimientos');
reset role;
delete from auth.sessions where id = '23000000-0000-0000-0000-00000000c1a0';
set local role authenticated;
select is((select count(*) from public.movements where ledger_id = current_setting('t.ledger')::uuid), 0::bigint,
  'Después de quitar el acceso, el mismo token no lee movimientos (tampoco por Realtime)');
select pg_temp.request(pg_temp.app(), 'GET', '/movements');
select is((select count(*) from public.movements where ledger_id = current_setting('t.ledger')::uuid), 2::bigint,
  'La sesión de la app sigue leyendo');
select pg_temp.request(null, 'GET', '/movements');
select set_config('request.jwt.claims', '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.movements where ledger_id = current_setting('t.ledger')::uuid), 2::bigint,
  'Un token sin session_id ni client_id (como los de las pruebas) sigue leyendo');
reset role;

select * from finish();
rollback;
