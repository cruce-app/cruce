-- Lectura de un parche para el MCP de Cruce (cambio mcp-cruce, design D5).
--
-- El servidor MCP actúa con el token de la persona, así que solo puede llamar lo que la app puede llamar. El saldo de
-- cada persona y el "Para saldar" salen de parche_balances y parche_settlement_plan, que son ayudas internas (revocadas
-- para authenticated). parche_summary las envuelve para quien es del parche: el "Para saldar" es el mismo de la app.
--
-- Quien no es del parche, o pide uno que no existe, recibe null (no se distingue uno ajeno de uno inexistente). Sin
-- sesión o con una cuenta borrada, require_session() lanza notAuthenticated o accountDeleted.
--
-- Forma del resultado:
--   { parche_id, name, status ('open' | 'closed'), expense_count, my_participant_id,
--     people:    [{ participant_id, name, is_me, has_app, deleted, net }]   en el orden del parche
--     transfers: [{ from_id, to_id, amount }]                               en el orden del plan }
-- net > 0: al participante le deben; net < 0: debe.

create function public.parche_summary(p_parche uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me     uuid;
  v_result jsonb;
begin
  perform public.require_session();
  if not public.is_parche_member(p_parche) then
    return null;
  end if;
  v_me := public.my_parche_participant_id(p_parche);

  select jsonb_build_object(
           'parche_id', p.id,
           'name', p.name,
           'status', p.status::text,
           'expense_count', (select count(*) from public.parche_expenses e
                              where e.parche_id = p.id and e.deleted_at is null),
           'my_participant_id', v_me,
           'people', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'participant_id', pp.id,
                      'name', pp.display_name,
                      'is_me', pp.id = v_me,
                      'has_app', pp.user_id is not null,
                      'deleted', pp.account_deleted_at is not null,
                      'net', b.net)
                    order by b."position")
             from public.parche_balances(p.id) as b
             join public.parche_participants pp on pp.id = b.participant_id), '[]'::jsonb),
           'transfers', coalesce((
             select jsonb_agg(jsonb_build_object('from_id', t.from_id, 'to_id', t.to_id, 'amount', t.amount)
                    order by t.ord)
             from public.parche_settlement_plan(p.id) with ordinality as t(from_id, to_id, amount, ord)), '[]'::jsonb))
    into v_result
    from public.parches p
   where p.id = p_parche;
  return v_result;
end $$;

revoke all on function public.parche_summary(uuid) from public, anon;
grant execute on function public.parche_summary(uuid) to authenticated;
