-- Un pago a una cuenta borrada se confirma solo.
--
-- En un parche, un pago cuenta en el saldo cuando lo confirma quien lo recibe. Un pago nuevo a una cuenta borrada ya se
-- confirma al anotarlo: su lugar queda sin cuenta (user_id en null), igual que alguien sin la app. Pero los que estaban
-- por confirmar cuando la persona borró su cuenta quedaban así para siempre, y el parche no se podía saldar.
--
-- 1. forget_account confirma los pagos por confirmar que iban a sus lugares, y firma esa confirmación en la actividad
--    con su lugar (borrada desde el panel no hay sesión y quedaba sin autor).
-- 2. Los que ya quedaron colgados (cuentas borradas antes de esta migración) se confirman ahora.

-- Igual que en cuenta_borrada_guardas.sql, salvo el paso 2c.
create or replace function public.forget_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- 1. Cruces: los completos y abiertos se cierran como al desvincular; el pendiente (solo él) se borra con su código.
  update public.ledgers l set closed_at = now(), closed_by = old.id
   where l.closed_at is null
     and exists (select 1 from public.ledger_members m where m.ledger_id = l.id and m.user_id = old.id)
     and (select count(*) from public.ledger_members m where m.ledger_id = l.id) = 2;
  delete from public.ledgers l
   where l.created_by = old.id
     and (select count(*) from public.ledger_members m where m.ledger_id = l.id) < 2;

  -- 2. Propuestas de pasar al cruce por confirmar con alguno de sus lugares: quedan rechazadas (con su aviso).
  update public.parche_cruce_transfers t set status = 'rejected', responded_at = now()
   where t.status = 'pending'
     and exists (select 1 from public.parche_participants pp
                 where pp.user_id = old.id and pp.id in (t.from_id, t.to_id));

  -- 2b. Ese aviso lo firma su lugar en el parche (sin sesión, desde el panel, quedaba sin autor).
  update public.parche_activity a set actor_id = pp.id
    from public.parche_participants pp
   where a.kind = 'debtRejectedForCruce' and a.actor_id is null and a.created_at = now()
     and pp.parche_id = a.parche_id and pp.user_id = old.id
     and pp.id in (a.participant_id, a.other_participant_id);

  -- 2c. Los pagos por confirmar a sus lugares quedan confirmados (nadie más los puede confirmar), y la confirmación en
  --     la actividad la firma su lugar.
  update public.parche_payments p set confirmed_at = now()
    from public.parche_participants pp
   where p.confirmed_at is null and pp.id = p.to_id and pp.user_id = old.id;
  update public.parche_activity a set actor_id = a.other_participant_id
    from public.parche_participants pp
   where a.kind = 'paymentConfirmed' and a.created_at = now()
     and pp.id = a.other_participant_id and pp.user_id = old.id;

  -- 3. Sus lugares en los parches: "Cuenta borrada", con sus gastos y pagos. Después la llave pone user_id en null.
  update public.parche_participants set display_name = 'Cuenta borrada', account_deleted_at = now()
   where user_id = old.id;

  -- 4. El perfil queda como lápida: el @usuario queda libre de inmediato.
  update public.profiles
     set display_name = 'Cuenta borrada', username = null, avatar_color = null, deleted_at = now()
   where id = old.id and deleted_at is null;
  return old;
end $$;

revoke all on function public.forget_account() from public, anon, authenticated;

-- Los que ya quedaron colgados. Desde una migración no hay sesión: la actividad queda firmada por el lugar borrado.
update public.parche_payments p set confirmed_at = now()
  from public.parche_participants pp
 where p.confirmed_at is null and pp.id = p.to_id and pp.account_deleted_at is not null;
update public.parche_activity a set actor_id = a.other_participant_id
  from public.parche_participants pp
 where a.kind = 'paymentConfirmed' and a.actor_id is null and a.created_at = now()
   and pp.id = a.other_participant_id and pp.account_deleted_at is not null;
