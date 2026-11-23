// El servidor MCP de Cruce: registra las herramientas (herramientas.ts) y, si están empaquetadas, sus pantallas de
// MCP Apps. Se arma uno por petición (createMcpHandler, sin estado) con los Datos de quien conectó Claude.
import { McpServer } from "@modelcontextprotocol/server";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import type { Datos } from "./datos.ts";
import {
  abrirAnotar,
  anotarGasto,
  CATEGORIAS,
  type Rechazo,
  type Reloj,
  type Respuesta,
  verCruces,
  verMovimientos,
  verParche,
  verParches,
} from "./herramientas.ts";

export const ERROR_DE_LECTURA = "No pude leer tus cuentas de Cruce. Intenta de nuevo en un momento.";

const SOLO_LECTURA = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// Anotar es la única que escribe: se declara así para que Claude pida confirmación antes de usarla.
const ESCRIBE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

const INSTRUCCIONES = "Cruce lleva las cuentas compartidas de una persona con sus amigos. Un cruce es la cuenta de " +
  "dos personas, con un solo saldo; un parche es un grupo con inicio y fin (un viaje, una cena). Los montos son pesos " +
  "colombianos enteros ($30.000). Di siempre quién le debe a quién con la frase que devuelven las herramientas.";

type Resultado = Respuesta<unknown> | Rechazo;

/** El resultado de MCP: el texto completo siempre, y los mismos datos con estructura para las pantallas. */
function aMcp(r: Resultado) {
  return {
    content: [{ type: "text" as const, text: r.texto }],
    ...(r.error ? { isError: true } : { structuredContent: r.datos as Record<string, unknown> }),
  };
}

/** Corre una herramienta; un fallo de la base se registra y llega como un mensaje genérico. */
async function correr(nombre: string, f: () => Promise<Resultado>) {
  try {
    return aMcp(await f());
  } catch (error) {
    console.error(`${nombre} falló`, error);
    return aMcp({ texto: ERROR_DE_LECTURA, error: true });
  }
}

export interface OpcionesServidor {
  /** Las pantallas empaquetadas (ui_bundle.ts), por nombre de archivo: "cruces.html", "movimientos.html"… */
  pantallas?: Record<string, string>;
  reloj?: Reloj;
}

const relojReal: Reloj = { ahora: () => new Date(), nuevoId: () => crypto.randomUUID() };

export function crearServidor(datos: Datos, opciones: OpcionesServidor = {}): McpServer {
  const servidor = new McpServer({ name: "cruce", version: "1.0.0" }, { instructions: INSTRUCCIONES });
  const pantallas = opciones.pantallas ?? {};
  const reloj = opciones.reloj ?? relojReal;
  // Cada pantalla se registra como recurso una sola vez, aunque la usen varias herramientas.
  const recursos = new Set<string>();

  /**
   * Registra una herramienta con su pantalla si está empaquetada (MCP Apps: `_meta.ui.resourceUri` y el recurso
   * `ui://cruce/<archivo>` con el tipo text/html;profile=mcp-app). Sin pantalla, es una herramienta normal.
   */
  // deno-lint-ignore no-explicit-any
  function registrar(nombre: string, config: any, f: (entrada: any) => Promise<Resultado>, pantalla?: string) {
    const cb = (entrada: unknown) => correr(nombre, () => f(entrada));
    const html = pantalla ? pantallas[pantalla] : undefined;
    if (!pantalla || html === undefined) {
      servidor.registerTool(nombre, config, cb);
      return;
    }
    const uri = `ui://cruce/${pantalla}`;
    registerAppTool(servidor, nombre, { ...config, _meta: { ui: { resourceUri: uri } } }, cb);
    if (recursos.has(uri)) return;
    recursos.add(uri);
    registerAppResource(
      servidor,
      pantalla,
      uri,
      { description: config.title },
      () => Promise.resolve({ contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: html }] }),
    );
  }

  registrar(
    "ver_cruces",
    {
      title: "Ver tus cruces",
      description: "Lista los cruces de la persona (con quién, si está abierto o cerrado) y el saldo de cada uno en " +
        "palabras, por ejemplo «Jesús te debe $20.000». Devuelve el cruce_id que usan las demás herramientas.",
      inputSchema: z.object({}),
      annotations: SOLO_LECTURA,
    },
    () => verCruces(datos),
    "cruces.html",
  );

  registrar(
    "ver_movimientos",
    {
      title: "Ver los movimientos de un cruce",
      description:
        "Los movimientos vigentes de un cruce, del más reciente al más antiguo: fecha, concepto, categoría, " +
        "monto, quién pagó, cuánto le toca a quien no pagó y si es un gasto o un pago para saldar.",
      inputSchema: z.object({
        cruce_id: z.string().describe("El cruce_id que devuelve ver_cruces."),
        limite: z.number().optional().describe("Cuántos movimientos devolver: 20 por defecto, hasta 100."),
      }),
      annotations: SOLO_LECTURA,
    },
    (entrada) => verMovimientos(datos, entrada),
    "movimientos.html",
  );

  registrar("ver_parches", {
    title: "Ver tus parches",
    description: "Lista los parches de la persona (grupos con inicio y fin), si están abiertos o cerrados y su " +
      "saldo en cada uno. Devuelve el parche_id para ver_parche.",
    inputSchema: z.object({}),
    annotations: SOLO_LECTURA,
  }, () => verParches(datos));

  registrar("ver_parche", {
    title: "Ver un parche",
    description: "El detalle de un parche: el saldo de cada persona y el «Para saldar» (quién le paga a quién y " +
      "cuánto), igual que en la app.",
    inputSchema: z.object({ parche_id: z.string().describe("El parche_id que devuelve ver_parches.") }),
    annotations: SOLO_LECTURA,
  }, (entrada) => verParche(datos, entrada));

  registrar(
    "abrir_anotar",
    {
      title: "Abrir el formulario para anotar",
      description: "Muestra el formulario para que la persona anote un gasto en un cruce abierto (monto, concepto, " +
        "quién pagó, reparto y categoría). No anota nada: guardar lo hace anotar_gasto. Úsala cuando la persona " +
        "quiera llenar el gasto ella misma; sin pantallas, el texto dice qué datos pedirle.",
      inputSchema: z.object({ cruce_id: z.string().describe("El cruce_id que devuelve ver_cruces.") }),
      annotations: SOLO_LECTURA,
    },
    (entrada) => abrirAnotar(datos, entrada),
    "anotar.html",
  );

  registrar("anotar_gasto", {
    title: "Anotar un gasto en un cruce",
    description: "Anota un gasto en un cruce abierto, a nombre de la persona que conectó Claude. Confirma con ella " +
      "el monto, el concepto, quién pagó y el reparto antes de anotarlo. Sin reparto se usa el del cruce; sin fecha, " +
      "hoy. Devuelve el gasto y el saldo nuevo en palabras.",
    inputSchema: z.object({
      cruce_id: z.string().describe("El cruce_id que devuelve ver_cruces."),
      monto: z.number().describe("Pesos enteros, sin puntos ni decimales: 60000 para $60.000. De 1 a 999999999."),
      concepto: z.string().describe("De 1 a 80 caracteres, por ejemplo «Cena»."),
      quien_pago: z.enum(["yo", "la_otra_persona"]).describe(
        "«yo» si pagó quien conectó Claude; «la_otra_persona» si pagó la otra persona del cruce.",
      ),
      reparto: z.enum(["a_medias", "porcentaje", "todo_del_otro"]).optional().describe(
        "Cómo se reparte: a medias, un porcentaje para quien no pagó (porcentaje_otro) o todo es del otro " +
          "(un préstamo). Sin reparto se usa el del cruce.",
      ),
      porcentaje_otro: z.number().optional().describe(
        "Lo que le toca a quien no pagó, 0 a 100. Va con reparto «porcentaje» (o sin reparto); con otro reparto se rechaza.",
      ),
      categoria: z.enum(Object.keys(CATEGORIAS) as [keyof typeof CATEGORIAS, ...(keyof typeof CATEGORIAS)[]])
        .optional().describe("Comida, mercado, transporte, hogar, ocio, prestamo u otro (por defecto)."),
      fecha: z.string().optional().describe("AAAA-MM-DD; sin fecha es hoy."),
    }),
    annotations: ESCRIBE,
  }, (entrada) => anotarGasto(datos, entrada, reloj));

  return servidor;
}
