/// <reference lib="dom" />
// Las vistas de las pantallas: reciben los datos con estructura que devuelven las herramientas (los mismos tipos de
// herramientas.ts) y arman el DOM. No hablan con Claude: lo que hace cada botón lo decide pantalla.ts (Acciones).
import type { CruceVista, FormularioVista, MovimientosVista, MovimientoVista } from "../../herramientas.ts";
import { formatoPesos } from "../../pesos.ts";
import { boton, h } from "./dom.ts";

/** Lo que devuelve anotar_gasto en structuredContent. */
export interface Anotado {
  gasto: MovimientoVista;
  saldo: string;
  neto: number;
}

/** Lo que pueden hacer los botones. Sin herramientas del servidor (el anfitrión no las deja llamar), no hay botones. */
export interface Acciones {
  verCruces?: () => void;
  verMovimientos?: (cruceId: string) => void;
  abrirAnotar?: (cruceId: string) => void;
  /** Llama a anotar_gasto; devuelve el mensaje de error de la herramienta, tal cual, o null si quedó anotado. */
  anotar?: (entrada: Record<string, unknown>) => Promise<string | null>;
}

const COLORES: Record<string, string> = {
  yellow: "var(--amarillo)",
  violet: "var(--violeta)",
  green: "var(--verde)",
  peach: "var(--durazno)",
  pink: "var(--rosado)",
  lime: "var(--lima)",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** "2026-11-21" → "21 nov 2026". */
function fechaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return `${dia} ${MESES[mes - 1] ?? ""} ${anio}`;
}

/** Las iniciales del avatar, como en la app: "Jo", "Je". */
function iniciales(nombre: string): string {
  const letras = [...nombre.trim()].slice(0, 2).join("");
  return letras.charAt(0).toUpperCase() + letras.slice(1);
}

/** La clase de la carpeta según el saldo: verde si te deben, rosada si debes y neutra en $0. */
function claseSaldo(neto: number): string {
  if (neto > 0) return "a-favor";
  if (neto < 0) return "en-contra";
  return "";
}

/** Quién le debe a quién nunca va solo con el color: "a tu favor" o "a favor de Jesús". */
function aFavor(neto: number, otraPersona: string): HTMLElement | null {
  if (neto === 0) return null;
  return h("span", { class: "chip" }, neto > 0 ? "a tu favor" : `a favor de ${otraPersona}`);
}

function carpeta(pestana: string, clase: string, ...hijos: (Node | null)[]): HTMLElement {
  return h(
    "section",
    { class: `carpeta ${clase}`.trim() },
    h("div", { class: "carpeta__pestana etiqueta" }, pestana),
    h("div", { class: "carpeta__cuerpo" }, ...hijos),
  );
}

function acciones(...botones: (HTMLButtonElement | null | undefined | false)[]): HTMLElement | null {
  const presentes = botones.filter((b): b is HTMLButtonElement => Boolean(b));
  return presentes.length > 0 ? h("div", { class: "acciones" }, ...presentes) : null;
}

export function vistaCargando(): HTMLElement {
  return h("p", { class: "secundario" }, "Cargando tus cuentas de Cruce…");
}

/** Un rechazo o un error: el mensaje de la herramienta, tal cual. */
export function vistaError(mensaje: string, a: Acciones): HTMLElement {
  return h(
    "div",
    { class: "formulario" },
    h("p", { class: "aviso", role: "alert" }, mensaje),
    acciones(a.verCruces && boton("Tus cruces", a.verCruces)),
  );
}

// ─── Tus cruces ───

function tarjetaCruce(c: CruceVista, a: Acciones): HTMLElement {
  const avatar = h("span", { class: "avatar", "aria-hidden": "true" }, iniciales(c.con));
  avatar.style.background = (c.color && COLORES[c.color]) || "var(--neutro)";
  return carpeta(
    `Con ${c.con}`,
    `${claseSaldo(c.neto)} ${c.abierto ? "" : "cerrado"}`,
    h(
      "div",
      { class: "persona" },
      avatar,
      h(
        "div",
        {},
        h("p", { class: "persona__nombre" }, c.con),
        c.usuario ? h("p", { class: "secundario" }, `@${c.usuario}`) : null,
      ),
    ),
    h("p", { class: "frase" }, c.frase),
    aFavor(c.neto, c.con),
    c.abierto ? null : h("span", { class: "chip" }, "Cerrado: ya no acepta gastos"),
    acciones(
      a.verMovimientos && boton("Movimientos", () => a.verMovimientos!(c.cruce_id)),
      c.abierto && a.abrirAnotar && boton("Anotar un gasto", () => a.abrirAnotar!(c.cruce_id), true),
    ),
  );
}

export function vistaCruces(datos: { cruces: CruceVista[] }, a: Acciones): HTMLElement {
  const abiertos = datos.cruces.filter((c) => c.abierto);
  const cerrados = datos.cruces.filter((c) => !c.abierto);
  return h(
    "div",
    { class: "formulario" },
    h("h1", { class: "titulo" }, "Tus cruces"),
    datos.cruces.length === 0 ? h("p", { class: "secundario" }, "Aún no tienes cruces.") : null,
    ...abiertos.map((c) => tarjetaCruce(c, a)),
    cerrados.length > 0 ? h("h2", { class: "etiqueta" }, "Cerrados") : null,
    ...cerrados.map((c) => tarjetaCruce(c, a)),
  );
}

// ─── Movimientos de un cruce ───

function filaMovimiento(m: MovimientoVista): HTMLElement {
  const meta = [fechaLegible(m.fecha), m.categoria];
  if (m.tipo === "pago para saldar") meta.push("Pago para saldar");
  return h(
    "li",
    { class: "movimiento" },
    h(
      "div",
      { class: "movimiento__arriba" },
      h("span", { class: "movimiento__concepto" }, m.concepto),
      h("span", { class: "movimiento__monto" }, formatoPesos(m.monto)),
    ),
    h("span", { class: "secundario" }, meta.join(" · ")),
    h("span", { class: "movimiento__detalle" }, m.detalle),
  );
}

export function vistaMovimientos(datos: MovimientosVista, a: Acciones): HTMLElement {
  return h(
    "div",
    { class: "formulario" },
    h("h1", { class: "titulo" }, `Movimientos con ${datos.con}`),
    carpeta(
      "Saldo",
      `${claseSaldo(datos.neto)} ${datos.abierto ? "" : "cerrado"}`,
      h("p", { class: "frase" }, datos.saldo),
      aFavor(datos.neto, datos.con),
      datos.abierto ? null : h("span", { class: "chip" }, "Cerrado: ya no acepta gastos"),
    ),
    datos.movimientos.length === 0 ? h("p", { class: "secundario" }, `Aún no hay movimientos con ${datos.con}.`) : h(
      "ul",
      { class: "lista", "aria-label": "Movimientos, del más reciente al más antiguo" },
      ...datos.movimientos.map(filaMovimiento),
    ),
    acciones(
      datos.abierto && a.abrirAnotar && boton("Anotar un gasto", () => a.abrirAnotar!(datos.cruce_id), true),
      a.verCruces && boton("Tus cruces", a.verCruces),
    ),
  );
}

// ─── Anotar un gasto ───

let siguienteId = 0;

/** Un grupo de opciones de una sola elección (radios con forma de botón). */
function opciones(
  etiqueta: string,
  nombre: string,
  valores: { valor: string; texto: string }[],
  elegido: string,
): HTMLFieldSetElement {
  return h(
    "fieldset",
    { class: "campo" },
    h("legend", { class: "campo__etiqueta" }, etiqueta),
    h(
      "div",
      { class: "opciones" },
      ...valores.map((v) =>
        h(
          "label",
          { class: "opcion" },
          h("input", { type: "radio", name: nombre, value: v.valor, checked: v.valor === elegido }),
          h("span", {}, v.texto),
        )
      ),
    ),
  );
}

function elegido(formulario: HTMLFormElement, nombre: string): string {
  return (formulario.querySelector(`input[name="${nombre}"]:checked`) as HTMLInputElement | null)?.value ?? "";
}

/** Solo los dígitos del monto, sin ceros a la izquierda (hasta 12, para que el tope lo diga la herramienta). */
function digitos(texto: string): string {
  return texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
}

export function vistaFormulario(f: FormularioVista, a: Acciones): HTMLElement {
  const id = `f${siguienteId++}`;
  const monto = h("input", {
    id: `${id}-monto`,
    type: "text",
    inputmode: "numeric",
    autocomplete: "off",
    placeholder: "$0",
  });
  monto.addEventListener("input", () => {
    const d = digitos(monto.value);
    monto.value = d ? formatoPesos(Number(d)) : "";
  });
  const concepto = h("input", {
    id: `${id}-concepto`,
    type: "text",
    autocomplete: "off",
    placeholder: "Cena, taxi, mercado…",
  });

  const porDefecto = f.porcentaje_por_defecto;
  const repartoInicial = porDefecto === 50 ? "a_medias" : porDefecto === 100 ? "todo_del_otro" : "porcentaje";
  const porcentaje = h("input", {
    id: `${id}-porcentaje`,
    type: "number",
    inputmode: "numeric",
    min: "0",
    max: "100",
    step: "1",
    value: repartoInicial === "porcentaje" ? String(porDefecto) : "",
  });
  const campoPorcentaje = h(
    "div",
    { class: repartoInicial === "porcentaje" ? "campo" : "campo oculto" },
    h("label", { class: "campo__etiqueta", for: porcentaje.id }, "Le toca a quien no pagó (%)"),
    porcentaje,
  );

  const aviso = h("p", { class: "aviso oculto", role: "alert" });
  const anotar = h("button", { type: "submit", class: "boton boton--principal" }, "Anotar");
  if (!a.anotar) anotar.disabled = true;

  const formulario = h(
    "form",
    { class: "formulario", novalidate: true },
    h(
      "div",
      { class: "monto" },
      h("label", { class: "etiqueta", for: monto.id }, "Monto"),
      monto,
    ),
    h(
      "div",
      { class: "campo" },
      h("label", { class: "campo__etiqueta", for: concepto.id }, "Concepto"),
      concepto,
    ),
    opciones("¿Quién pagó?", `${id}-pago`, [
      { valor: "yo", texto: `${f.yo} (tú)` },
      { valor: "la_otra_persona", texto: f.con },
    ], "yo"),
    opciones("Reparto", `${id}-reparto`, [
      { valor: "a_medias", texto: "A medias" },
      { valor: "porcentaje", texto: "Porcentaje" },
      { valor: "todo_del_otro", texto: "Todo es del otro" },
    ], repartoInicial),
    campoPorcentaje,
    opciones("Categoría", `${id}-categoria`, f.categorias.map((c) => ({ valor: c.id, texto: c.nombre })), "otro"),
    aviso,
    anotar,
  );

  formulario.addEventListener("change", () => {
    campoPorcentaje.classList.toggle("oculto", elegido(formulario, `${id}-reparto`) !== "porcentaje");
  });

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!a.anotar || anotar.disabled) return;
    const reparto = elegido(formulario, `${id}-reparto`);
    const entrada: Record<string, unknown> = {
      cruce_id: f.cruce_id,
      // Vacío es 0: el mensaje del monto lo da la herramienta, igual que si anotara Claude.
      monto: Number(digitos(monto.value) || "0"),
      concepto: concepto.value,
      quien_pago: elegido(formulario, `${id}-pago`),
      reparto,
      categoria: elegido(formulario, `${id}-categoria`),
    };
    if (reparto === "porcentaje" && porcentaje.value.trim() !== "") entrada.porcentaje_otro = Number(porcentaje.value);
    anotar.disabled = true;
    anotar.textContent = "Anotando…";
    aviso.classList.add("oculto");
    const error = await a.anotar(entrada);
    if (error === null) return;
    aviso.textContent = error;
    aviso.classList.remove("oculto");
    anotar.disabled = false;
    anotar.textContent = "Anotar";
  });

  return h(
    "div",
    { class: "formulario" },
    h("h1", { class: "titulo" }, "Anotar un gasto"),
    h("p", { class: "secundario" }, `Con ${f.con} · Saldo de hoy: ${f.saldo}`),
    formulario,
  );
}

/** Después de anotar: el gasto y el saldo nuevo en palabras. */
export function vistaAnotado(r: Anotado, cruceId: string, con: string, a: Acciones): HTMLElement {
  return h(
    "div",
    { class: "formulario" },
    h("h1", { class: "titulo" }, "Gasto anotado"),
    carpeta(
      `Saldo con ${con}`,
      claseSaldo(r.neto),
      h(
        "div",
        { class: "movimiento__arriba" },
        h("span", { class: "movimiento__concepto" }, `${r.gasto.concepto} · ${r.gasto.categoria}`),
        h("span", { class: "movimiento__monto" }, formatoPesos(r.gasto.monto)),
      ),
      h("p", { class: "movimiento__detalle" }, r.gasto.detalle),
      h("p", { class: "frase" }, r.saldo),
      aFavor(r.neto, con),
    ),
    acciones(
      a.abrirAnotar && boton("Anotar otro", () => a.abrirAnotar!(cruceId), true),
      a.verMovimientos && boton("Movimientos", () => a.verMovimientos!(cruceId)),
      a.verCruces && boton("Tus cruces", a.verCruces),
    ),
  );
}
