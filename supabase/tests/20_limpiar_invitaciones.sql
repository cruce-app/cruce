-- Limpieza diaria (CP10): pg_cron borra las invitaciones vencidas hace más de 30 días sin canjear y los intentos
-- fallidos de más de un día. Una vencida reciente se conserva para que siga diciendo "venció" y no "no existe"; una
-- canjeada no se borra nunca; y quien tiene un cruce pendiente sin código recibe uno nuevo para ese mismo cruce.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create function pg_temp.as_user(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', '{"sub":"' || p_user || '","role":"authenticated"}', true);
$$;
-- cron.job solo existe con pg_cron: así, sin la extensión, la prueba falla en vez de abortar el archivo.
create function pg_temp.cron_job(p_name text) returns jsonb language plpgsql as $$
declare
  v_job jsonb;
begin
  if to_regclass('cron.job') is null then
    return null;
  end if;
  execute 'select jsonb_build_object(''schedule'', schedule, ''command'', command, ''active'', active)
             from cron.job where jobname = $1' into v_job using p_name;
  return v_job;
end $$;

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-000000000001', 'joan@example.com'),
  ('20000000-0000-0000-0000-000000000002', 'pedro@example.com'),
  ('20000000-0000-0000-0000-000000000003', 'carla@example.com'),
  ('20000000-0000-0000-0000-000000000004', 'jesus@example.com'),
  ('20000000-0000-0000-0000-000000000005', 'ana@example.com');
insert into public.profiles (id, display_name) values
  ('20000000-0000-0000-0000-000000000001', 'Joan'),
  ('20000000-0000-0000-0000-000000000002', 'Pedro'),
  ('20000000-0000-0000-0000-000000000003', 'Carla'),
  ('20000000-0000-0000-0000-000000000004', 'Jesús'),
  ('20000000-0000-0000-0000-000000000005', 'Ana');

-- Todos los códigos se generan antes de vencer ninguno: así un código al azar no puede reusar uno vencido de la prueba.
select pg_temp.as_user('20000000-0000-0000-0000-000000000001');
create temp table joan_code as select public.create_ledger_with_invite() as code;
select pg_temp.as_user('20000000-0000-0000-0000-000000000002');
create temp table pedro_code as select public.create_ledger_with_invite() as code;
create temp table pedro_ledger as select ledger_id from public.invites where code = (select code from pedro_code);
select pg_temp.as_user('20000000-0000-0000-0000-000000000003');
create temp table carla_code as select public.create_ledger_with_invite() as code;
select pg_temp.as_user('20000000-0000-0000-0000-000000000004');
select public.redeem_invite((select code from carla_code));

-- El de Joan venció ayer, el de Pedro hace 31 días y el de Carla, que Jesús canjeó, hace 60.
update public.invites set expires_at = now() - interval '1 day' where code = (select code from joan_code);
update public.invites set expires_at = now() - interval '31 days' where code = (select code from pedro_code);
update public.invites set expires_at = now() - interval '60 days', redeemed_at = now() - interval '61 days'
  where code = (select code from carla_code);

-- Ana tiene un intento fallido de hace 25 horas y otro de hace 2 horas.
insert into public.invite_attempts (user_id, attempted_at) values
  ('20000000-0000-0000-0000-000000000005', now() - interval '25 hours'),
  ('20000000-0000-0000-0000-000000000005', now() - interval '2 hours');

-- ─────────────────────────────────────────────────────────────
-- La limpieza
-- ─────────────────────────────────────────────────────────────
select has_function('public', 'cleanup_expired_invites', '{}'::name[], 'Existe la función de la limpieza');
select lives_ok('select public.cleanup_expired_invites()', 'La limpieza corre');

select is((select count(*) from public.invites where code = (select code from pedro_code)), 0::bigint,
  'Se borra la invitación que venció hace 31 días sin canjearse');
select is((select count(*) from public.invites where code = (select code from joan_code)), 1::bigint,
  'Se conserva la invitación que venció ayer');
select is(
  (select redeemed_by from public.invites where code = (select code from carla_code)),
  '20000000-0000-0000-0000-000000000004'::uuid,
  'Se conserva la invitación canjeada, aunque haya vencido hace 60 días');
select is(
  (select count(*) from public.invite_attempts
    where user_id = '20000000-0000-0000-0000-000000000005' and attempted_at < now() - interval '1 day'),
  0::bigint, 'Se borran los intentos fallidos de más de un día');
select is(
  (select count(*) from public.invite_attempts
    where user_id = '20000000-0000-0000-0000-000000000005' and attempted_at >= now() - interval '1 day'),
  1::bigint, 'Se conservan los intentos fallidos recientes');

-- ─────────────────────────────────────────────────────────────
-- Lo que ve quien escribe esos códigos
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('20000000-0000-0000-0000-000000000005');
select is(public.redeem_invite((select code from joan_code)) ->> 'error', 'expired',
  'El código que venció ayer sigue diciendo que venció');
select is(public.redeem_invite((select code from pedro_code)) ->> 'error', 'invalid',
  'El código borrado dice que no existe');

-- ─────────────────────────────────────────────────────────────
-- Pedro vuelve a invitar
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('20000000-0000-0000-0000-000000000002');
create temp table pedro_new as select public.create_ledger_with_invite() as code;
select is(
  (select ledger_id from public.invites where code = (select code from pedro_new) and expires_at > now()),
  (select ledger_id from pedro_ledger),
  'Pedro recibe un código vigente para su mismo cruce pendiente');
select is(
  (select count(*) from public.ledgers where created_by = '20000000-0000-0000-0000-000000000002'), 1::bigint,
  'Pedro sigue teniendo un solo cruce');
select pg_temp.as_user('20000000-0000-0000-0000-000000000005');
select is(public.redeem_invite((select code from pedro_new)) ->> 'ledger_id', (select ledger_id::text from pedro_ledger),
  'Ana se une al cruce de Pedro con el código nuevo');

-- ─────────────────────────────────────────────────────────────
-- Permisos y el trabajo diario
-- ─────────────────────────────────────────────────────────────
select ok(
  not has_function_privilege('anon', to_regprocedure('public.cleanup_expired_invites()'), 'execute')
  and not has_function_privilege('authenticated', to_regprocedure('public.cleanup_expired_invites()'), 'execute'),
  'Nadie la puede correr desde la app');
select is((select extnamespace::regnamespace::text from pg_extension where extname = 'pg_cron'), 'pg_catalog',
  'pg_cron está activo, en el esquema que pide Supabase');
select is(pg_temp.cron_job('limpiar-invitaciones'),
  '{"schedule": "0 8 * * *", "command": "select public.cleanup_expired_invites()", "active": true}'::jsonb,
  'La limpieza corre todos los días a las 08:00 UTC (3 a. m. en Bogotá)');

select * from finish();
rollback;
