-- Lectura de un parche para el MCP (cambio mcp-cruce, design D5): parche_summary(uuid) le da a quien es del parche
-- las personas, su saldo y el mismo "Para saldar" de la app (parche_settlement_plan). "Alguien que no está en un parche
-- MUST NOT ver nada de él." Sin sesión, anon y una cuenta borrada tampoco ven nada.
-- Se actúa como el rol authenticated con request.jwt.claims, igual que una petición real.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ─────────────────────────────────────────────────────────────
-- Ayudas
-- ─────────────────────────────────────────────────────────────
create function pg_temp.pid(p text) returns uuid language sql as $$
  select current_setting('t.' || p)::uuid
$$;
create function pg_temp.lines(variadic p text[]) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'participant_id', current_setting('t.' || p[i]), 'amount', p[i + 1]::bigint) order by i), '[]'::jsonb)
  from generate_series(1, array_length(p, 1), 2) as i
$$;
create function pg_temp.shares(variadic p text[]) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'participant_id', current_setting('t.' || p[i]), 'amount', p[i + 1]::bigint,
    'input', nullif(p[i + 2], '')::int) order by i), '[]'::jsonb)
  from generate_series(1, array_length(p, 1), 3) as i
$$;
create function pg_temp.items(variadic p text[]) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'amount', p[i]::bigint,
    'participant_ids', (select jsonb_agg(current_setting('t.' || n)) from unnest(string_to_array(p[i + 1], ',')) as n))
    order by i), '[]'::jsonb)
  from generate_series(1, array_length(p, 1), 2) as i
$$;
create function pg_temp.error_hint(p_sql text) returns text language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return v_hint;
end $$;
create function pg_temp.as_user(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', '{"sub":"' || p_user || '","role":"authenticated"}', true);
$$;
-- Lo que ve quien hace la petición, como texto: "Joan:47000:tú, Jesús:125000, …:sin la app".
create function pg_temp.people_text() returns text language sql as $$
  select string_agg(p ->> 'name' || ':' || (p ->> 'net')
           || case when (p ->> 'is_me')::boolean then ':tú' else '' end
           || case when not (p ->> 'has_app')::boolean then ':sin la app' else '' end
           || case when (p ->> 'deleted')::boolean then ':borrada' else '' end,
         ', ' order by ord)
  from jsonb_array_elements(public.parche_summary(current_setting('t.parche')::uuid) -> 'people')
    with ordinality as e(p, ord)
$$;

-- ─────────────────────────────────────────────────────────────
-- Datos, creados como postgres (sin RLS)
-- ─────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('22000000-0000-0000-0000-000000000001', 'joan@example.com'),
  ('22000000-0000-0000-0000-000000000002', 'jesus@example.com'),
  ('22000000-0000-0000-0000-000000000003', 'ana@example.com'),
  ('22000000-0000-0000-0000-000000000005', 'pedro@example.com');
insert into public.profiles (id, display_name) values
  ('22000000-0000-0000-0000-000000000001', 'Joan'),
  ('22000000-0000-0000-0000-000000000002', 'Jesús'),
  ('22000000-0000-0000-0000-000000000003', 'Ana'),
  ('22000000-0000-0000-0000-000000000005', 'Pedro');

select set_config('t.parche', 'a2200000-0000-0000-0000-000000000001', true);
select set_config('t.c', 'c2200000-0000-0000-0000-000000000004', true);

-- ─────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────
select ok(has_function_privilege('authenticated', 'public.parche_summary(uuid)', 'execute'),
  'Con sesión (authenticated) se puede leer el resumen de un parche');
select ok(not has_function_privilege('anon', 'public.parche_summary(uuid)', 'execute'),
  'Sin sesión (anon) no se puede leer el resumen de un parche');

-- ─────────────────────────────────────────────────────────────
-- Santa Marta, igual que MockParches: Joan, Jesús, Ana y Carlos (sin la app)
-- ─────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.as_user('22000000-0000-0000-0000-000000000001');
select public.create_parche('Santa Marta', 'Joan', pg_temp.pid('parche'));
select set_config('t.jo', public.my_parche_participant_id(pg_temp.pid('parche'))::text, true);
select set_config('t.code', (select code from public.parches where id = pg_temp.pid('parche')), true);
select pg_temp.as_user('22000000-0000-0000-0000-000000000002');
select public.join_parche(current_setting('t.code'), 'Jesús');
select set_config('t.j', public.my_parche_participant_id(pg_temp.pid('parche'))::text, true);
select pg_temp.as_user('22000000-0000-0000-0000-000000000003');
select public.join_parche(current_setting('t.code'), 'Ana');
select set_config('t.a', public.my_parche_participant_id(pg_temp.pid('parche'))::text, true);
select pg_temp.as_user('22000000-0000-0000-0000-000000000001');
select public.add_parche_participant(pg_temp.pid('parche'), 'Carlos', pg_temp.pid('c'));
-- En una sola transacción todos entran con el mismo now(): se ordenan como en MockParches (Joan, Jesús, Ana, Carlos).
reset role;
alter table public.parche_participants disable trigger parche_participants_before_update;
update public.parche_participants set joined_at = now() - make_interval(hours => 72 - n)
  from (values (pg_temp.pid('jo'), 0), (pg_temp.pid('j'), 1), (pg_temp.pid('a'), 2), (pg_temp.pid('c'), 3)) as o(id, n)
  where parche_participants.id = o.id;
alter table public.parche_participants enable trigger parche_participants_before_update;
set local role authenticated;
select pg_temp.as_user('22000000-0000-0000-0000-000000000001');

-- Almuerzo en Taganga: por consumo con 10 % de propina, pagado por Ana.
select public.save_parche_expense('e2200000-0000-0000-0000-000000000001', pg_temp.pid('parche'),
  'Almuerzo en Taganga', 200000, 10, 220000, '2026-10-25 13:00:00+00', 'items',
  pg_temp.lines('a', '220000'),
  pg_temp.shares('jo', '33000', '', 'j', '110000', '', 'a', '55000', '', 'c', '22000', ''),
  pg_temp.items('30000', 'jo', '100000', 'j', '50000', 'a', '20000', 'c'));
-- Hospedaje: $600.000 por partes iguales entre los 4; Jesús puso $400.000 y Joan $200.000.
select public.save_parche_expense('e2200000-0000-0000-0000-000000000002', pg_temp.pid('parche'),
  'Hospedaje', 600000, 0, 600000, '2026-10-23 20:00:00+00', 'shares',
  pg_temp.lines('j', '400000', 'jo', '200000'),
  pg_temp.shares('jo', '150000', '1', 'j', '150000', '1', 'a', '150000', '1', 'c', '150000', '1'));
-- Taxi al aeropuerto entre Joan, Jesús y Ana, pagado por Joan.
select public.save_parche_expense('e2200000-0000-0000-0000-000000000003', pg_temp.pid('parche'),
  'Taxi al aeropuerto', 45000, 0, 45000, '2026-10-26 09:00:00+00', 'equal',
  pg_temp.lines('jo', '45000'),
  pg_temp.shares('jo', '15000', '1', 'j', '15000', '1', 'a', '15000', '1'));

-- El plan de la app, leído como postgres (la función es interna), para compararlo con el que recibe Joan.
reset role;
create temp table app_plan as
  select coalesce(jsonb_agg(jsonb_build_object('from_id', p.from_id, 'to_id', p.to_id, 'amount', p.amount)
           order by p.ord), '[]'::jsonb) as plan
  from public.parche_settlement_plan(current_setting('t.parche')::uuid) with ordinality as p(from_id, to_id, amount, ord);
grant select on app_plan to authenticated;
set local role authenticated;

-- ─────────────────────────────────────────────────────────────
-- Un miembro ve el parche
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('22000000-0000-0000-0000-000000000001');
select is(public.parche_summary(pg_temp.pid('parche')) ->> 'name', 'Santa Marta', 'Joan ve el nombre del parche');
select is(public.parche_summary(pg_temp.pid('parche')) ->> 'status', 'open', 'Joan ve que el parche está abierto');
select is((public.parche_summary(pg_temp.pid('parche')) ->> 'expense_count')::int, 3,
  'Joan ve cuántos gastos vigentes tiene el parche');
select is(pg_temp.people_text(), 'Joan:47000:tú, Jesús:125000, Ana:0, Carlos:-172000:sin la app',
  'Joan ve a los cuatro en el orden del parche, con su saldo y quién es él');
select is(public.parche_summary(pg_temp.pid('parche')) -> 'transfers', (select plan from app_plan),
  'El "Para saldar" que ve Joan es el mismo de la app (parche_settlement_plan)');
select is(jsonb_array_length(public.parche_summary(pg_temp.pid('parche')) -> 'transfers'), 2,
  'Para saldar: Carlos le paga a Jesús y a Joan');

select pg_temp.as_user('22000000-0000-0000-0000-000000000002');
select is(pg_temp.people_text(), 'Joan:47000, Jesús:125000:tú, Ana:0, Carlos:-172000:sin la app',
  'Jesús ve el mismo parche, con él marcado como tú');

-- ─────────────────────────────────────────────────────────────
-- Quien no es del parche no ve nada
-- ─────────────────────────────────────────────────────────────
select pg_temp.as_user('22000000-0000-0000-0000-000000000005');
select is(public.parche_summary(pg_temp.pid('parche')), null, 'Pedro no es del parche: recibe null');
select is(public.parche_summary('a2200000-0000-0000-0000-0000000000ff'), null,
  'Un parche que no existe también da null (igual que uno ajeno)');

-- Con el rol authenticated pero sin sub: no hay sesión.
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is(pg_temp.error_hint($$select public.parche_summary(current_setting('t.parche')::uuid)$$), 'notAuthenticated',
  'Sin sesión no se lee nada (notAuthenticated)');

set local role anon;
select throws_ok($$select public.parche_summary(current_setting('t.parche')::uuid)$$, '42501',
  null, 'anon no puede llamar a parche_summary');

-- ─────────────────────────────────────────────────────────────
-- Una cuenta borrada no ve nada, aunque su sesión siga viva
-- ─────────────────────────────────────────────────────────────
reset role;
delete from auth.users where id = '22000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.as_user('22000000-0000-0000-0000-000000000003');
select is(pg_temp.error_hint($$select public.parche_summary(current_setting('t.parche')::uuid)$$), 'accountDeleted',
  'Ana borró su cuenta: con su sesión vieja no lee el parche (accountDeleted)');

select pg_temp.as_user('22000000-0000-0000-0000-000000000001');
select is(pg_temp.people_text(), 'Joan:47000:tú, Jesús:125000, Cuenta borrada:0:sin la app:borrada, Carlos:-172000:sin la app',
  'Joan ve el lugar de Ana como "Cuenta borrada", sin que cambie ningún saldo');
select is(public.parche_summary(pg_temp.pid('parche')) -> 'transfers', (select plan from app_plan),
  'El "Para saldar" no cambia porque Ana borró su cuenta');

select * from finish();
rollback;
