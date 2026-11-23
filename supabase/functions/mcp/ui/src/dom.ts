/// <reference lib="dom" />
// Arma elementos del DOM sin innerHTML: los nombres y conceptos vienen de la base (los escribe la gente), así que todo
// texto entra como nodo de texto y nunca como HTML.

export type Hijo = Node | string | null | undefined | false;

/** Un elemento con sus atributos (`true` pone el atributo vacío; `false` o `undefined`, nada) y sus hijos. */
export function h<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Record<string, string | boolean | undefined> = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    elemento.setAttribute(nombre, valor === true ? "" : valor);
  }
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    elemento.append(hijo);
  }
  return elemento;
}

/** Un botón con su acción. */
export function boton(texto: string, accion: () => void, principal = false): HTMLButtonElement {
  const b = h("button", { type: "button", class: principal ? "boton boton--principal" : "boton" }, texto);
  b.addEventListener("click", accion);
  return b;
}
