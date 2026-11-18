-- Cruce · limpieza diaria de invitaciones vencidas (CP10)
-- Una vez al día, pg_cron borra:
--   - las invitaciones que vencieron hace más de 30 días y nadie canjeó. Una vencida reciente se conserva, porque
--     "Tengo un código" distingue "venció" de "no existe" solo porque la fila sigue ahí (check_invite);
--   - los intentos fallidos de más de un día. El límite de 5 por hora solo mira la última hora.
-- Las invitaciones canjeadas no se borran nunca: son el registro de quién se unió y marcan qué cruce ya estuvo completo
-- (create_ledger_with_invite no reusa un cruce con una invitación canjeada). Un cruce pendiente sin código sigue
-- sirviendo: al volver a invitar, create_ledger_with_invite le genera uno nuevo, igual que con un código vencido.
-- Aditiva: no cambia ninguna función ni tabla de la app.

-- ─────────────────────────────────────────────────────────────
-- pg_cron
-- ─────────────────────────────────────────────────────────────

-- Como dice la guía de Supabase Cron (https://supabase.com/docs/guides/cron/install), con "if not exists" para que
-- no falle si ya se activó desde el panel. La guía agrega dos "grant ... to postgres", pero en Supabase el script que
-- corre al crear la extensión ya le da esos permisos a postgres; repetirlos deja permisos que dependen de esos y hacen
-- fallar un "create extension if not exists" posterior ("dependent privileges exist", probado en local).
create extension if not exists pg_cron with schema pg_catalog;

-- ─────────────────────────────────────────────────────────────
-- La limpieza
-- ─────────────────────────────────────────────────────────────

-- Solo la llama el trabajo de pg_cron; nadie la corre desde la app.
create function public.cleanup_expired_invites() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.invites
    where redeemed_at is null
      and expires_at < now() - interval '30 days';

  delete from public.invite_attempts
    where attempted_at < now() - interval '1 day';
end $$;

revoke all on function public.cleanup_expired_invites() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Todos los días a las 08:00 UTC (3 a. m. en Bogotá)
-- ─────────────────────────────────────────────────────────────

-- Programar con un nombre que ya existe reemplaza el trabajo (https://supabase.com/docs/guides/cron/quickstart),
-- así que correr la migración otra vez no lo duplica.
select cron.schedule('limpiar-invitaciones', '0 8 * * *', 'select public.cleanup_expired_invites()');
