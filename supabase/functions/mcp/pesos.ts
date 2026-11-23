// Pesos colombianos enteros, igual que Money en CruceCore (ios/Packages/CruceCore/Sources/CruceCore/Domain/Money.swift).
// Nunca se usan decimales.

/** Signo menos tipográfico (U+2212), no el guion. */
export const SIGNO_MENOS = "−";

/** El monto más grande que se puede anotar: 9 dígitos ($999.999.999), igual que Money.maxDigits. */
export const MONTO_MAXIMO = 999_999_999;

/** Formato de la app: `$30.000`, `$1.800.000`, `+$18.000`, `−$50.000`. */
export function formatoPesos(valor: number, opciones: { conSigno?: boolean } = {}): string {
  const digitos = String(Math.abs(Math.trunc(valor)));
  const grupos: string[] = [];
  for (let fin = digitos.length; fin > 0; fin -= 3) {
    grupos.unshift(digitos.slice(Math.max(0, fin - 3), fin));
  }
  const cuerpo = "$" + grupos.join(".");
  if (!opciones.conSigno || valor === 0) return cuerpo;
  return (valor > 0 ? "+" : SIGNO_MENOS) + cuerpo;
}

/** Parte de un monto según un porcentaje, al peso más cercano (.5 hacia arriba): igual que Money.share y owed_by_other. */
export function parte(monto: number, porcentaje: number): number {
  return Math.floor((monto * porcentaje + 50) / 100);
}
