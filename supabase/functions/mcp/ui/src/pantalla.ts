/// <reference lib="dom" />
// Conecta una pantalla con Claude (clase App de MCP Apps): muestra el resultado de la herramienta que la abrió
// (ontoolresult) y, si el anfitrión deja llamar herramientas, los botones llaman a ver_cruces, ver_movimientos,
// abrir_anotar y anotar_gasto (callServerTool), con las mismas reglas y mensajes que cuando las llama Claude.
import { App, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { CruceVista, FormularioVista, MovimientosVista } from "../../herramientas.ts";
import {
  type Acciones,
  type Anotado,
  vistaAnotado,
  vistaCargando,
  vistaCruces,
  vistaError,
  vistaFormulario,
  vistaMovimientos,
} from "./vistas.ts";

export type Tipo = "cruces" | "movimientos" | "anotar";

/** Lo que usamos de un resultado de herramienta (CallToolResult de MCP). */
interface Resultado {
  content?: { type: string; text?: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

const SIN_CONEXION = "No pude hablar con Cruce. Intenta de nuevo en un momento.";

const raiz = document.getElementById("raiz") as HTMLElement;
const app = new App({ name: "Cruce", version: "1.0.0" });

function mostrar(vista: HTMLElement) {
  raiz.replaceChildren(vista);
  globalThis.scrollTo?.(0, 0);
}

function textoDe(r: Resultado): string {
  return r.content?.find((c) => c.type === "text")?.text ?? SIN_CONEXION;
}

async function llamar(nombre: string, entrada: Record<string, unknown>): Promise<Resultado> {
  try {
    return await app.callServerTool({ name: nombre, arguments: entrada });
  } catch (error) {
    console.error(`${nombre} falló`, error);
    return { isError: true, content: [{ type: "text", text: SIN_CONEXION }] };
  }
}

/** Los botones solo existen si el anfitrión deja que la pantalla llame herramientas del servidor. */
function acciones(): Acciones {
  if (!app.getHostCapabilities()?.serverTools) return {};
  return {
    verCruces: () => abrir("cruces", "ver_cruces", {}),
    verMovimientos: (cruceId) => abrir("movimientos", "ver_movimientos", { cruce_id: cruceId }),
    abrirAnotar: (cruceId) => abrir("anotar", "abrir_anotar", { cruce_id: cruceId }),
  };
}

async function abrir(tipo: Tipo, herramienta: string, entrada: Record<string, unknown>) {
  mostrar(vistaCargando());
  mostrarResultado(tipo, await llamar(herramienta, entrada));
}

function mostrarResultado(tipo: Tipo, r: Resultado) {
  const a = acciones();
  if (r.isError || !r.structuredContent) {
    mostrar(vistaError(textoDe(r), a));
    return;
  }
  const datos = r.structuredContent;
  if (tipo === "cruces") mostrar(vistaCruces(datos as { cruces: CruceVista[] }, a));
  if (tipo === "movimientos") mostrar(vistaMovimientos(datos as MovimientosVista, a));
  if (tipo === "anotar") mostrarFormulario(datos as FormularioVista, a);
}

function mostrarFormulario(f: FormularioVista, a: Acciones) {
  const conAnotar: Acciones = app.getHostCapabilities()?.serverTools
    ? {
      ...a,
      anotar: async (entrada) => {
        const r = await llamar("anotar_gasto", entrada);
        if (r.isError || !r.structuredContent) return textoDe(r);
        mostrar(vistaAnotado(r.structuredContent as Anotado, f.cruce_id, f.con, a));
        avisarAClaude(textoDe(r));
        return null;
      },
    }
    : a;
  mostrar(vistaFormulario(f, conAnotar));
}

/** Le cuenta a Claude que se anotó desde la pantalla, para que no lo vuelva a anotar. Si no se puede, no pasa nada. */
function avisarAClaude(texto: string) {
  if (!app.getHostCapabilities()?.updateModelContext) return;
  app.updateModelContext({ content: [{ type: "text", text: `Desde la pantalla de Cruce: ${texto}` }] })
    .catch((error) => console.error("updateModelContext falló", error));
}

function aplicarMargenes(contexto: McpUiHostContext) {
  const m = contexto.safeAreaInsets;
  if (!m) return;
  raiz.style.paddingTop = `calc(var(--esp-l) + ${m.top}px)`;
  raiz.style.paddingRight = `calc(var(--esp-pantalla) + ${m.right}px)`;
  raiz.style.paddingBottom = `calc(var(--esp-xxl) + ${m.bottom}px)`;
  raiz.style.paddingLeft = `calc(var(--esp-pantalla) + ${m.left}px)`;
}

/** Arranca la pantalla: espera el resultado de la herramienta que la abrió. */
export function iniciar(tipo: Tipo) {
  mostrar(vistaCargando());
  app.ontoolresult = (r) => mostrarResultado(tipo, r as Resultado);
  app.onhostcontextchanged = aplicarMargenes;
  app.connect()
    .then(() => {
      const contexto = app.getHostContext();
      if (contexto) aplicarMargenes(contexto);
    })
    .catch((error) => {
      console.error("No se pudo conectar con el anfitrión", error);
      mostrar(vistaError(SIN_CONEXION, {}));
    });
}
