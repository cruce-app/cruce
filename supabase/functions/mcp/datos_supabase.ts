// Datos con el cliente de Supabase de la persona que conectó Claude (lo arma withSupabase con su token): RLS decide
// qué ve y qué escribe, igual que en la app. Nunca se usa la service_role.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";
import type { CruceFila, Datos, ErrorBase, MovimientoFila, NuevoGasto, ParcheFila, ResumenParche } from "./datos.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un error de lectura: la herramienta lo convierte en un mensaje genérico, sin mostrar el detalle. */
function fallo(donde: string, error: { message: string }): never {
  throw new Error(`${donde}: ${error.message}`);
}

export function datosSupabase(cliente: SupabaseClient<Database>, miId: string): Datos {
  return {
    miId,

    async miNombre() {
      const { data, error } = await cliente.from("profiles").select("display_name").eq("id", miId).single();
      if (error) fallo("profiles", error);
      return data.display_name;
    },

    async misCruces(): Promise<CruceFila[]> {
      const { data, error } = await cliente.rpc("my_cruces");
      if (error) fallo("my_cruces", error);
      return (data ?? []).map((c) => ({
        ledger_id: c.ledger_id,
        partner_id: c.partner_id,
        partner_name: c.partner_name,
        partner_username: c.partner_username ?? null,
        partner_color: c.partner_color,
        partner_deleted: c.partner_deleted,
        closed_at: c.closed_at ?? null,
        default_other_percent: c.default_other_percent,
      }));
    },

    async saldos() {
      // net de la fila de quien pregunta: positivo, la otra persona le debe (ver ledger_balances en init.sql).
      const { data, error } = await cliente.from("ledger_balances").select("ledger_id, net").eq("user_id", miId);
      if (error) fallo("ledger_balances", error);
      const netos = new Map<string, number>();
      for (const fila of data ?? []) {
        if (fila.ledger_id) netos.set(fila.ledger_id, Number(fila.net ?? 0));
      }
      return netos;
    },

    async movimientos(cruceId: string, limite: number): Promise<MovimientoFila[]> {
      const { data, error } = await cliente
        .from("movements")
        .select(
          "id, kind, payer_id, amount, concept, category, split_type, other_share_percent, owed_by_other, occurred_at",
        )
        .eq("ledger_id", cruceId)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) fallo("movements", error);
      return (data ?? []).map((m) => ({ ...m, owed_by_other: Number(m.owed_by_other ?? 0) }));
    },

    async misParches(): Promise<ParcheFila[]> {
      const { data, error } = await cliente
        .from("parches")
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false });
      if (error) fallo("parches", error);
      return data ?? [];
    },

    async resumenParche(parcheId: string) {
      // Un id que no es un uuid es como un parche que no existe (la base respondería con un error de tipo).
      if (!UUID.test(parcheId)) return null;
      const { data, error } = await cliente.rpc("parche_summary", { p_parche: parcheId });
      if (error) fallo("parche_summary", error);
      return (data ?? null) as unknown as ResumenParche | null;
    },

    async anotarGasto(gasto: NuevoGasto): Promise<ErrorBase | null> {
      const { error } = await cliente.from("movements").insert(gasto);
      return error ? { message: error.message, hint: error.hint } : null;
    },
  };
}
