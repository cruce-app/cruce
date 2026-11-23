// Un doble de Datos en memoria para las pruebas: se comporta como la base con RLS para quien conectó Claude
// (solo ve sus cruces y sus parches) y rechaza anotar en un cruce cerrado con la pista cruceClosed.
import type { CruceFila, Datos, ErrorBase, MovimientoFila, NuevoGasto, ParcheFila, ResumenParche } from "./datos.ts";
import { parte } from "./pesos.ts";

export interface MovimientoGuardado extends MovimientoFila {
  ledger_id: string;
  deleted_at: string | null;
}

export class DatosEnMemoria implements Datos {
  movimientosGuardados: MovimientoGuardado[] = [];
  /** Cruces que se cierran justo antes de insertar (para probar la carrera entre leer y escribir). */
  cerrarAlInsertar = new Set<string>();
  /** Si se pone, el insert falla con este error. */
  errorAlInsertar: ErrorBase | null = null;

  constructor(
    readonly miId: string,
    private readonly nombre: string,
    public cruces: CruceFila[],
    public parches: ParcheFila[] = [],
    public resumenes: Record<string, ResumenParche> = {},
  ) {}

  miNombre(): Promise<string> {
    return Promise.resolve(this.nombre);
  }

  misCruces(): Promise<CruceFila[]> {
    return Promise.resolve(structuredClone(this.cruces));
  }

  saldos(): Promise<Map<string, number>> {
    const netos = new Map<string, number>();
    for (const cruce of this.cruces) netos.set(cruce.ledger_id, 0);
    for (const m of this.movimientosGuardados) {
      if (m.deleted_at !== null || !netos.has(m.ledger_id)) continue;
      const signo = m.payer_id === this.miId ? 1 : -1;
      netos.set(m.ledger_id, netos.get(m.ledger_id)! + signo * m.owed_by_other);
    }
    return Promise.resolve(netos);
  }

  movimientos(cruceId: string, limite: number): Promise<MovimientoFila[]> {
    if (!this.cruces.some((c) => c.ledger_id === cruceId)) return Promise.resolve([]);
    const vigentes = this.movimientosGuardados
      .filter((m) => m.ledger_id === cruceId && m.deleted_at === null)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, limite);
    return Promise.resolve(structuredClone(vigentes));
  }

  misParches(): Promise<ParcheFila[]> {
    return Promise.resolve(structuredClone(this.parches));
  }

  resumenParche(parcheId: string): Promise<ResumenParche | null> {
    return Promise.resolve(this.resumenes[parcheId] ?? null);
  }

  anotarGasto(gasto: NuevoGasto): Promise<ErrorBase | null> {
    if (this.errorAlInsertar) return Promise.resolve(this.errorAlInsertar);
    const cruce = this.cruces.find((c) => c.ledger_id === gasto.ledger_id);
    if (!cruce) return Promise.resolve({ message: "new row violates row-level security policy" });
    if (this.cerrarAlInsertar.has(cruce.ledger_id)) cruce.closed_at = "2026-11-22T00:00:00Z";
    if (cruce.closed_at) return Promise.resolve({ message: "Este cruce está cerrado", hint: "cruceClosed" });
    this.movimientosGuardados.push({
      ...gasto,
      owed_by_other: parte(gasto.amount, gasto.other_share_percent),
      deleted_at: null,
    });
    return Promise.resolve(null);
  }

  /** Agrega un movimiento ya guardado (para armar los ejemplos). */
  guardar(m: Omit<MovimientoGuardado, "owed_by_other" | "deleted_at"> & { deleted_at?: string | null }) {
    this.movimientosGuardados.push({
      ...m,
      owed_by_other: parte(m.amount, m.other_share_percent),
      deleted_at: m.deleted_at ?? null,
    });
  }
}
