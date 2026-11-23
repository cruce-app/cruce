// Las frases de la app, portadas de CruceCore para que Claude diga lo mismo que el teléfono:
// - LedgerStore.phrase (el saldo de un cruce),
// - ParcheStore.balanceText, balanceLine, phrase y statusLabel (el parche, con "tú"),
// - ParcheDetail.myBalancePhrase (ParcheBalanceCard.swift) y ParcheTicket.list.
// Quién le debe a quién siempre va en palabras, nunca solo con un signo.
import { formatoPesos, parte } from "./pesos.ts";

/**
 * El saldo de un cruce desde quien pregunta. `neto` mide como `ledger_balances.net` para su fila:
 * positivo, la otra persona le debe; negativo, le debe a la otra persona.
 */
export function fraseCruce(neto: number, otraPersona: string): string {
  if (neto > 0) return `${otraPersona} te debe ${formatoPesos(neto)}`;
  if (neto < 0) return `Le debes ${formatoPesos(-neto)} a ${otraPersona}`;
  return "Están a paz y salvo";
}

/** "Le deben $165.000", "Debe $110.000" o "A paz y salvo"; con "tú" para quien pregunta. */
export function saldoParche(neto: number, esTu: boolean): string {
  const monto = formatoPesos(Math.abs(neto));
  if (neto > 0) return esTu ? `Te deben ${monto}` : `Le deben ${monto}`;
  if (neto < 0) return esTu ? `Debes ${monto}` : `Debe ${monto}`;
  return esTu ? "Estás a paz y salvo" : "A paz y salvo";
}

/** La fila de "Saldos": a quien pregunta, si le deben, se le agrega "a tu favor". */
export function lineaSaldoParche(neto: number, esTu: boolean): string {
  const texto = saldoParche(neto, esTu);
  return neto > 0 && esTu ? `${texto} · a tu favor` : texto;
}

/** Una transferencia de "Para saldar": "Ana le paga $45.000 a Jesús", "Ana te paga $45.000" o "Le pagas $45.000 a Jesús". */
export function frasePagoParche(
  t: { de: string; a: string; monto: number; deEsTu: boolean; aEsTu: boolean },
): string {
  const monto = formatoPesos(t.monto);
  if (t.deEsTu) return `Le pagas ${monto} a ${t.a}`;
  if (t.aEsTu) return `${t.de} te paga ${monto}`;
  return `${t.de} le paga ${monto} a ${t.a}`;
}

/**
 * "Te deben en el parche", "Debes en el parche", "Todos quedaron a paz y salvo" (hay gastos y todos en $0),
 * "Ya están a paz y salvo" (cerrado y en $0) o "Estás a paz y salvo".
 */
export function fraseMiSaldoParche(p: { miNeto: number; todosEnCero: boolean; saldado: boolean }): string {
  if (p.miNeto > 0) return "Te deben en el parche";
  if (p.miNeto < 0) return "Debes en el parche";
  if (p.todosEnCero) return "Todos quedaron a paz y salvo";
  return p.saldado ? "Ya están a paz y salvo" : "Estás a paz y salvo";
}

/** "Abierto", "Parche cerrado" o "A paz y salvo" (cerrado y todos en $0), igual que ParcheStore.statusLabel. */
export function estadoParche(estado: "open" | "closed", netos: number[]): string {
  if (estado === "closed" && netos.every((n) => n === 0)) return "A paz y salvo";
  return estado === "open" ? "Abierto" : "Parche cerrado";
}

/** "Ana", "Ana y Jesús" o "Ana, Jesús y Joan". */
export function lista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1];
}

/**
 * Un movimiento de un cruce en palabras: "Pagó Jesús, a medias: Joan le debe $50.000" o
 * "Pago para saldar: Joan le pagó $20.000 a Jesús".
 */
export function fraseMovimiento(
  m: { tipo: "expense" | "settlement"; pagador: string; otro: string; monto: number; porcentajeOtro: number },
): string {
  if (m.tipo === "settlement") return `Pago para saldar: ${m.pagador} le pagó ${formatoPesos(m.monto)} a ${m.otro}`;
  const reparto = m.porcentajeOtro === 50
    ? "a medias"
    : m.porcentajeOtro === 100
    ? `todo es de ${m.otro}`
    : `${m.porcentajeOtro} % para ${m.otro}`;
  const debe = parte(m.monto, m.porcentajeOtro);
  const deuda = debe > 0 ? `${m.otro} le debe ${formatoPesos(debe)}` : `${m.otro} no le debe nada`;
  return `Pagó ${m.pagador}, ${reparto}: ${deuda}`;
}
