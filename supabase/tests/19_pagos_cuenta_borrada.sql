-- Un pago a una cuenta borrada se confirma solo: nadie más lo puede confirmar y el parche quedaría sin saldar para
-- siempre. Los pagos nuevos ya se confirman al anotarlos (su lugar queda sin cuenta, como alguien sin la app); los que
-- estaban por confirmar cuando la persona borró su cuenta se confirman al borrarla.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.as_user(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', '{"sub":"' || p_user || '","role":"authenticated"}', true);
$$;
create function pg_temp.pid(p text) returns uuid language sql as $$
  select current_setting('t.' || p)::uuid
$$;

insert into auth.users (id, email) values
  ('19000000-0000-0000-0000-000000000001', 'joan@example.com'),
  ('19000000-0000-0000-0000-000000000002', 'jesus@example.com'),
  ('19000000-0000-0000-0000-000000000003', 'ana@example.com');
insert into public.profiles (id, display_name) values
  ('19000000-0000-0000-0000-000000000001', 'Joan'),
  ('19000000-0000-0000-0000-000000000002', 'Jesús'),
  ('19000000-0000-0000-0000-000000000003', 'Ana');

-- Parche Finca con Joan, Jesús y Ana.
select pg_temp.as_user('19000000-0000-0000-0000-000000000001');
select set_config('t.parche', public.create_parche('Finca')::text, true);
select set_config('t.jo', (select id::text from public.parche_participants where parche_id = pg_temp.pid('parche')), true);
select pg_temp.as_user('19000000-0000-0000-0000-000000000002');
select public.join_parche((select code from public.parches where id = pg_temp.pid('parche')));
select set_config('t.j', (select id::text from public.parche_participants
  where parche_id = pg_temp.pid('parche') and user_id = '19000000-0000-0000-0000-000000000002'), true);
select pg_temp.as_user('19000000-0000-0000-0000-000000000003');
select public.join_parche((select code from public.parches where id = pg_temp.pid('parche')));
select set_config('t.a', (select id::text from public.parche_participants
  where parche_id = pg_temp.pid('parche') and user_id = '19000000-0000-0000-0000-000000000003'), true);

-- Jesús le paga $30.000 a Joan y Ana le paga $10.000 a Jesús: los dos quedan por confirmar.
select pg_temp.as_user('19000000-0000-0000-0000-000000000002');
select public.record_parche_payment('19e00000-0000-0000-0000-000000000001', pg_temp.pid('parche'),
  pg_temp.pid('j'), pg_temp.pid('jo'), 30000);
select pg_temp.as_user('19000000-0000-0000-0000-000000000003');
select public.record_parche_payment('19e00000-0000-0000-0000-000000000002', pg_temp.pid('parche'),
  pg_temp.pid('a'), pg_temp.pid('j'), 10000);
select is(
  (select count(*) from public.parche_payments where parche_id = pg_temp.pid('parche') and confirmed_at is null),
  2::bigint, 'Antes de borrar la cuenta, los dos pagos están por confirmar');

-- Joan borra su cuenta.
select pg_temp.as_user('19000000-0000-0000-0000-000000000001');
select public.delete_my_account();

select isnt(
  (select confirmed_at from public.parche_payments where id = '19e00000-0000-0000-0000-000000000001'), null,
  'El pago a quien borró su cuenta queda confirmado');
select is(
  (select confirmed_at from public.parche_payments where id = '19e00000-0000-0000-0000-000000000002'), null,
  'Un pago entre otras dos personas sigue por confirmar');
select is(
  (select actor_id from public.parche_activity
    where payment_id = '19e00000-0000-0000-0000-000000000001' and kind = 'paymentConfirmed'),
  pg_temp.pid('jo'),
  'La confirmación queda en la actividad, firmada por el lugar de quien borró su cuenta');

-- Un pago nuevo a ese lugar se confirma al anotarlo, como con alguien sin la app.
select pg_temp.as_user('19000000-0000-0000-0000-000000000003');
select public.record_parche_payment('19e00000-0000-0000-0000-000000000003', pg_temp.pid('parche'),
  pg_temp.pid('a'), pg_temp.pid('jo'), 5000);
select isnt(
  (select confirmed_at from public.parche_payments where id = '19e00000-0000-0000-0000-000000000003'), null,
  'Un pago nuevo a una cuenta borrada se confirma al anotarlo');

-- Los pagos confirmados cuentan en el saldo: Jesús ya no le debe a Joan lo que le pagó.
select is(
  (select coalesce(sum(amount), 0) from public.parche_payments
    where parche_id = pg_temp.pid('parche') and to_id = pg_temp.pid('jo') and confirmed_at is not null),
  35000::bigint, 'Los dos pagos a la cuenta borrada cuentan en el saldo');

-- Un pago ya confirmado no cambia al borrar otra cuenta.
select pg_temp.as_user('19000000-0000-0000-0000-000000000002');
create temp table confirmed_before as
  select confirmed_at from public.parche_payments where id = '19e00000-0000-0000-0000-000000000001';
select public.delete_my_account();
select is(
  (select confirmed_at from public.parche_payments where id = '19e00000-0000-0000-0000-000000000001'),
  (select confirmed_at from confirmed_before),
  'Borrar la cuenta de quien pagó no cambia un pago que ya estaba confirmado');

select * from finish();
rollback;
