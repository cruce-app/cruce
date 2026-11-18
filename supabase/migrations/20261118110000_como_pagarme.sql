-- Cruce · Cómo te pagan (cambio como-pagarme, S1 a S3)
-- "Dos columnas opcionales en `profiles`: `payment_kind`: `nequi` o `llave` (Bre-B). `payment_handle`: el número de
-- Nequi (10 dígitos que empiezan en 3) o la llave, con un máximo de caracteres."
--   - Van juntas: o las dos o ninguna. Nequi: 10 dígitos que empiezan en 3, sin espacios. Llave (supuesto): de 3 a 40
--     caracteres, sin espacios en blanco (la app quita los de los extremos antes de guardar).
--   - "Solo vos las editás": update directo de esas dos columnas; la política "editar mi perfil" deja solo la fila
--     propia y profiles_before_update rechaza una lápida.
--   - "Las ven las mismas personas que hoy ven tu perfil: tu pareja de cruce y los del parche. Sin sesión, nadie.":
--     my_cruces() (columnas nuevas al final; las de antes no cambian) y el campo calculado participant_payment para
--     los del parche (la política de profiles no se abre).
--   - "Al borrar la cuenta, el dato se borra con la lápida": forget_account lo deja en null.
-- Aditiva: no borra datos.

-- ─────────────────────────────────────────────────────────────
-- Columnas
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column payment_kind text constraint payment_kind_valid check (payment_kind in ('nequi', 'llave')),
  add column payment_handle text,
  add constraint payment_together check ((payment_kind is null) = (payment_handle is null)),
  add constraint payment_handle_format check (
    payment_kind is null
    or (payment_kind = 'nequi' and payment_handle ~ '^3[0-9]{9}$')
    or (payment_kind = 'llave' and char_length(payment_handle) between 3 and 40 and payment_handle !~ '\s')
  );

-- ─────────────────────────────────────────────────────────────
-- Los del parche
-- ─────────────────────────────────────────────────────────────

-- Cómo pagarle a alguien del parche con la app ({"kind", "handle"}), para quien está en ese parche. null si está sin la
-- app, si su cuenta se borró, si no lo llenó o si quien pregunta no es del parche. Es un campo calculado de PostgREST:
-- parche_participants(*, participant_payment). security definer porque RLS de profiles solo deja ver a la pareja de
-- cruce, como participant_username. Busca por id (no confía en el resto de la fila que llega).
create function public.participant_payment(p_participant public.parche_participants) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kind', pr.payment_kind, 'handle', pr.payment_handle)
  from public.parche_participants pp
  join public.profiles pr on pr.id = pp.user_id
  where pp.id = p_participant.id and public.is_parche_member(pp.parche_id)
    and pr.deleted_at is null and pr.payment_kind is not null
$$;

-- ─────────────────────────────────────────────────────────────
-- my_cruces(): las columnas de 20261030100000_usuarios.sql sin cambios y, al final, cómo pagarle a la otra persona
-- (null si borró su cuenta). Cambia la forma del resultado: hay que borrarla y crearla otra vez.
-- ─────────────────────────────────────────────────────────────

drop function public.my_cruces();

create function public.my_cruces()
returns table (
  ledger_id              uuid,
  partner_id             uuid,
  partner_name           text,
  my_tike                text,
  my_avatar              text,
  partner_tike           text,
  partner_avatar         text,
  linked_at              timestamptz,
  closed_at              timestamptz,
  default_other_percent  smallint,
  my_color               text,
  partner_color          text,
  my_username            text,
  partner_username       text,
  partner_deleted        boolean,
  partner_payment_kind   text,
  partner_payment_handle text
)
language sql stable security invoker set search_path = '' as $$
  select me.ledger_id,
         other.user_id,
         p.display_name,
         me.tike_variant::text,
         me.avatar_color::text,
         other.tike_variant::text,
         other.avatar_color::text,
         greatest(me.joined_at, other.joined_at),
         l.closed_at,
         l.default_other_percent,
         mp.avatar_color::text,
         p.avatar_color::text,
         mp.username,
         p.username,
         p.deleted_at is not null,
         case when p.deleted_at is null then p.payment_kind end,
         case when p.deleted_at is null then p.payment_handle end
  from public.ledger_members me
  join public.ledger_members other on other.ledger_id = me.ledger_id and other.user_id <> me.user_id
  join public.profiles p on p.id = other.user_id
  join public.profiles mp on mp.id = me.user_id
  join public.ledgers l on l.id = me.ledger_id
  where me.user_id = (select auth.uid())
  order by l.closed_at is not null, greatest(me.joined_at, other.joined_at) desc, me.ledger_id
$$;

-- ─────────────────────────────────────────────────────────────
-- forget_account: igual que en 20261117100000_pagos_cuenta_borrada.sql, salvo que la lápida también borra cómo le
-- pagan (paso 4).
-- ─────────────────────────────────────────────────────────────

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

  -- 4. El perfil queda como lápida: el @usuario queda libre de inmediato y cómo le pagaban se borra.
  update public.profiles
     set display_name = 'Cuenta borrada', username = null, avatar_color = null, payment_kind = null,
         payment_handle = null, deleted_at = now()
   where id = old.id and deleted_at is null;
  return old;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────

-- Solo estas dos columnas, además del nombre y el color que ya se editaban.
grant update (payment_kind, payment_handle) on public.profiles to authenticated;

revoke all on function public.forget_account() from public, anon, authenticated;
revoke all on function public.participant_payment(public.parche_participants) from public, anon;
revoke all on function public.my_cruces() from public, anon;
grant execute on function public.participant_payment(public.parche_participants) to authenticated;
grant execute on function public.my_cruces() to authenticated;
