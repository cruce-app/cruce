// La frontera entre las herramientas y la base. Las herramientas solo hablan con esta interfaz; en la función la
// implementa datos_supabase.ts con el cliente de la persona (RLS aplica), y en las pruebas, un doble en memoria.

/** Una fila de my_cruces(), con lo que usan las herramientas. */
export interface CruceFila {
  ledger_id: string;
  partner_id: string;
  partner_name: string;
  partner_username: string | null;
  partner_deleted: boolean;
  closed_at: string | null;
  default_other_percent: number;
}

/** Un movimiento vigente de un cruce (columnas de `movements`). */
export interface MovimientoFila {
  id: string;
  kind: "expense" | "settlement";
  payer_id: string;
  amount: number;
  concept: string;
  category: Categoria;
  split_type: TipoReparto;
  other_share_percent: number;
  owed_by_other: number;
  occurred_at: string;
}

/** Un parche de quien pregunta (tabla `parches`, con RLS). */
export interface ParcheFila {
  id: string;
  name: string;
  status: "open" | "closed";
  created_at: string;
}

/** Lo que devuelve parche_summary(uuid). */
export interface ResumenParche {
  parche_id: string;
  name: string;
  status: "open" | "closed";
  expense_count: number;
  my_participant_id: string | null;
  people: {
    participant_id: string;
    name: string;
    is_me: boolean;
    has_app: boolean;
    deleted: boolean;
    net: number;
  }[];
  transfers: { from_id: string; to_id: string; amount: number }[];
}

export type Categoria = "comida" | "mercado" | "transporte" | "hogar" | "ocio" | "prestamo" | "otro";
export type TipoReparto = "equal" | "percentage" | "full_other";

/** El gasto que se inserta en `movements`. `created_by` lo pone la base (auth.uid()). */
export interface NuevoGasto {
  id: string;
  ledger_id: string;
  kind: "expense";
  payer_id: string;
  amount: number;
  concept: string;
  category: Categoria;
  split_type: TipoReparto;
  other_share_percent: number;
  occurred_at: string;
}

/** Un error de la base, con la pista (`hint`) que ponen los triggers (por ejemplo `cruceClosed`). */
export interface ErrorBase {
  message: string;
  hint?: string | null;
}

/** Lo que las herramientas necesitan leer y escribir. Toda lectura es de quien conectó Claude. */
export interface Datos {
  /** El id de quien conectó Claude (el `sub` del token). */
  readonly miId: string;
  /** Su nombre en el perfil. */
  miNombre(): Promise<string>;
  misCruces(): Promise<CruceFila[]>;
  /** El neto de cada cruce desde quien pregunta (ledger_balances, su fila), por ledger_id. */
  saldos(): Promise<Map<string, number>>;
  /** Los movimientos vigentes de un cruce, del más reciente al más antiguo. */
  movimientos(cruceId: string, limite: number): Promise<MovimientoFila[]>;
  misParches(): Promise<ParcheFila[]>;
  /** null si no es del parche o el parche no existe. */
  resumenParche(parcheId: string): Promise<ResumenParche | null>;
  /** Inserta el gasto; devuelve el error de la base, si lo hubo. */
  anotarGasto(gasto: NuevoGasto): Promise<ErrorBase | null>;
}
