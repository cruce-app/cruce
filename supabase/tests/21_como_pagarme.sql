-- Cómo te pagan (cambio como-pagarme, S1 a S3): Nequi o llave (Bre-B) en el perfil, las dos columnas juntas o
-- ninguna. "Solo vos las editás. Las ven las mismas personas que hoy ven tu perfil: tu pareja de cruce y los del
-- parche. Sin sesión, nadie." "Al borrar la cuenta, el dato se borra con la lápida."
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

create function pg_temp.as_user(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', '{"sub":"' || p_user || '","role":"authenticated"}', true);
$$;
create function pg_temp.payment(p_user text) returns text language sql as $$
  select coalesce(payment_kind, '-') || ':' || coalesce(payment_handle, '-') from public.profiles where id = p_user::uuid
$$;
-- Lo que alguien del parche ve de cómo pagarle a esa persona (por su nombre en el parche).
create function pg_temp.parche_payment(p_name text) returns jsonb language sql as $$
  select public.participant_payment(pp) from public.parche_participants pp
  where pp.parche_id = current_setting('t.parche')::uuid and pp.display_name = p_name
$$;

insert into auth.users (id, email) values
  ('21000000-0000-0000-0000-000000000001', 'joan@example.com'),
  ('21000000-0000-0000-0000-000000000002', 'jesus@example.com'),
  ('21000000-0000-0000-0000-000000000003', 'ana@example.com'),
  ('21000000-0000-0000-0000-000000000004', 'pedro@example.com');
insert into public.profiles (id, display_name) values
  ('21000000-0000-0000-0000-000000000001', 'Joan'),
  ('21000000-0000-0000-0000-000000000002', 'Jesús'),
  ('21000000-0000-0000-0000-000000000003', 'Ana'),
  ('21000000-0000-0000-0000-000000000004', 'Pedro');

-- Joan y Jesús comparten un cruce. Santa Marta: lo crea Joan; Jesús y Ana entran; Carlos está sin la app.
-- Ana y Jesús no comparten un cruce; Pedro no comparte nada con nadie.
select pg_temp.as_user('21000000-0000-0000-0000-000000000001');
create temp table joan_code as select public.create_ledger_with_invite() as code;
select pg_temp.as_user('21000000-0000-0000-0000-000000000002');
select public.redeem_invite((select code from joan_code));
select pg_temp.as_user('21000000-0000-0000-0000-000000000001');
select set_config('t.parche', public.create_parche('Santa Marta')::text, true);
select public.add_parche_participant(current_setting('t.parche')::uuid, 'Carlos');
select pg_temp.as_user('21000000-0000-0000-0000-000000000002');
select public.join_parche((select code from public.parches where id = current_setting('t.parche')::uuid));
select pg_temp.as_user('21000000-0000-0000-0000-000000000003');
select public.join_parche((select code from public.parches where id = current_setting('t.parche')::uuid));

-- ─────────────────────────────────────────────────────────────
-- Las columnas y sus reglas
-- ─────────────────────────────────────────────────────────────
select has_column('public', 'profiles', 'payment_kind', 'profiles tiene payment_kind');
select has_column('public', 'profiles', 'payment_handle', 'profiles tiene payment_handle');
select is(pg_temp.payment('21000000-0000-0000-0000-000000000002'), '-:-', 'Un perfil arranca sin cómo le pagan');

-- Jesús, desde la app (rol authenticated, con RLS), guarda su Nequi.
select pg_temp.as_user('21000000-0000-0000-0000-000000000002');
set local role authenticated;
select lives_ok(
  $$update public.profiles set payment_kind = 'nequi', payment_handle = '3001234567'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  'Jesús guarda su Nequi');
select throws_ok(
  $$update public.profiles set payment_kind = 'nequi', payment_handle = '2001234567'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Un Nequi que no empieza por 3 se rechaza');
select throws_ok(
  $$update public.profiles set payment_kind = 'nequi', payment_handle = '300 123 4567'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Un Nequi se guarda sin espacios');
select throws_ok(
  $$update public.profiles set payment_kind = 'nequi', payment_handle = '300123456'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Un Nequi de 9 dígitos se rechaza');
select throws_ok(
  $$update public.profiles set payment_kind = 'nequi', payment_handle = '30012345678'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Un Nequi de 11 dígitos se rechaza');
select throws_ok(
  $$update public.profiles set payment_kind = 'llave', payment_handle = 'ab'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Una llave de menos de 3 caracteres se rechaza');
select throws_ok(
  $$update public.profiles set payment_kind = 'llave', payment_handle = 'mi llave'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Una llave con espacios se rechaza');
select throws_ok(
  $$update public.profiles set payment_kind = 'llave', payment_handle = ' @jesus'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Una llave con espacios en los extremos se rechaza');
select throws_ok(
  format($$update public.profiles set payment_kind = 'llave', payment_handle = %L
    where id = '21000000-0000-0000-0000-000000000002'$$, repeat('a', 41)),
  '23514', null, 'Una llave de más de 40 caracteres se rechaza');
select throws_ok(
  $$update public.profiles set payment_kind = 'daviplata', payment_handle = '3001234567'
    where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'Solo Nequi o llave');
select throws_ok(
  $$update public.profiles set payment_kind = null where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'El dato sin su tipo se rechaza (las dos o ninguna)');
select throws_ok(
  $$update public.profiles set payment_handle = null where id = '21000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'El tipo sin el dato se rechaza (las dos o ninguna)');
reset role;
select is(pg_temp.payment('21000000-0000-0000-0000-000000000002'), 'nequi:3001234567',
  'Los rechazos no cambian el Nequi guardado');

select pg_temp.as_user('21000000-0000-0000-0000-000000000003');
set local role authenticated;
select lives_ok(
  $$update public.profiles set payment_kind = 'llave', payment_handle = '@ana.r'
    where id = '21000000-0000-0000-0000-000000000003'$$,
  'Ana guarda su llave');
reset role;
select is(pg_temp.payment('21000000-0000-0000-0000-000000000003'), 'llave:@ana.r', 'Queda guardada');

-- ─────────────────────────────────────────────────────────────
-- Solo cada quien lo edita
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('21000000-0000-0000-0000-000000000001');
set local role authenticated;
update public.profiles set payment_kind = 'nequi', payment_handle = '3109998877'
  where id = '21000000-0000-0000-0000-000000000002';
reset role;
select is(pg_temp.payment('21000000-0000-0000-0000-000000000002'), 'nequi:3001234567',
  'Joan (su pareja de cruce) no cambia el Nequi de Jesús');
select ok(has_column_privilege('authenticated', 'public.profiles', 'payment_kind', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'payment_handle', 'UPDATE'),
  'La app los cambia con update (la política deja solo la fila propia)');
select ok(not has_column_privilege('anon', 'public.profiles', 'payment_handle', 'UPDATE'),
  'Sin sesión no se cambian');
select ok(has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'avatar_color', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE'),
  'Los permisos de antes no cambian (nombre y color sí, @usuario no)');

-- ─────────────────────────────────────────────────────────────
-- Quién lo ve: la pareja de cruce, los del parche y nadie más
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('21000000-0000-0000-0000-000000000001');
set local role authenticated;
select results_eq(
  $$select partner_name, partner_payment_kind, partner_payment_handle from public.my_cruces()$$,
  $$values ('Jesús'::text, 'nequi'::text, '3001234567'::text)$$,
  'Joan ve en my_cruces cómo pagarle a Jesús');
select results_eq(
  $$select partner_name, my_tike, partner_tike, partner_avatar, closed_at, default_other_percent, my_username,
           partner_username, partner_deleted
    from public.my_cruces()$$,
  $$values ('Jesús'::text, 'rosa'::text, 'verde'::text, 'violet'::text, null::timestamptz, 50::smallint, 'joan'::text,
            'jesus'::text, false)$$,
  'Las columnas de antes de my_cruces no cambian');
reset role;

select pg_temp.as_user('21000000-0000-0000-0000-000000000003');
select is(pg_temp.parche_payment('Jesús'), '{"kind": "nequi", "handle": "3001234567"}'::jsonb,
  'Ana ve el Nequi de Jesús en el parche aunque no compartan un cruce');
select is(pg_temp.parche_payment('Carlos'), null, 'Carlos (sin la app) no tiene');
select is(pg_temp.parche_payment('Joan'), null, 'Joan no lo llenó');
set local role authenticated;
select is((select count(*) from public.profiles where id = '21000000-0000-0000-0000-000000000002'), 0::bigint,
  'Ana no lee el perfil de Jesús directamente (sigue siendo solo de su pareja de cruce)');
select is(
  (select public.participant_payment(pp) from public.parche_participants pp
   where pp.parche_id = current_setting('t.parche')::uuid and pp.display_name = 'Ana'),
  '{"kind": "llave", "handle": "@ana.r"}'::jsonb,
  'Desde la app (con RLS), Ana ve el suyo en el parche');
reset role;

select pg_temp.as_user('21000000-0000-0000-0000-000000000004');
select is(pg_temp.parche_payment('Jesús'), null, 'Pedro (de fuera del parche) no lo ve');
set local role authenticated;
select is((select count(*) from public.profiles where payment_handle is not null), 0::bigint,
  'Pedro no lee el Nequi ni la llave de nadie');
reset role;

set local role anon;
select is((select count(*) from public.profiles), 0::bigint, 'Sin sesión no se lee ningún perfil');
reset role;
select ok(not has_function_privilege('anon', 'public.participant_payment(public.parche_participants)', 'execute'),
  'Sin sesión no se pide en el parche');

-- ─────────────────────────────────────────────────────────────
-- Dejarlo vacío y borrar la cuenta
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('21000000-0000-0000-0000-000000000003');
set local role authenticated;
select lives_ok(
  $$update public.profiles set payment_kind = null, payment_handle = null
    where id = '21000000-0000-0000-0000-000000000003'$$,
  'Ana deja vacío cómo le pagan');
reset role;
select is(pg_temp.payment('21000000-0000-0000-0000-000000000003'), '-:-', 'Y queda sin dato');

select pg_temp.as_user('21000000-0000-0000-0000-000000000002');
select public.delete_my_account();
select is(pg_temp.payment('21000000-0000-0000-0000-000000000002'), '-:-', 'Al borrar la cuenta, el dato se borra');

select pg_temp.as_user('21000000-0000-0000-0000-000000000001');
set local role authenticated;
select results_eq(
  $$select partner_deleted, partner_payment_kind, partner_payment_handle from public.my_cruces()$$,
  $$values (true, null::text, null::text)$$,
  'my_cruces ya no trae cómo pagarle a una cuenta borrada');
reset role;
select pg_temp.as_user('21000000-0000-0000-0000-000000000003');
select is(pg_temp.parche_payment('Cuenta borrada'), null, 'Ni el parche');

select * from finish();
rollback;
