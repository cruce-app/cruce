// El servidor MCP completo (createMcpHandler) con un doble de la base: lo que Claude ve en tools/list, las
// anotaciones de escritura y lectura, la prueba de MCP Apps (tarea 2.1) y una llamada de punta a punta.
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { DatosEnMemoria } from "./datos_memoria.ts";
import { crearServidor } from "./servidor.ts";

const JOAN = "10000000-0000-0000-0000-000000000001";
const JESUS = "10000000-0000-0000-0000-000000000002";
const CON_JESUS = "d1000000-0000-0000-0000-000000000001";

function datos() {
  return new DatosEnMemoria(JOAN, "Joan", [{
    ledger_id: CON_JESUS,
    partner_id: JESUS,
    partner_name: "Jesús",
    partner_username: "jesus",
    partner_deleted: false,
    closed_at: null,
    default_other_percent: 50,
  }]);
}

const reloj = { ahora: () => new Date("2026-11-22T18:30:00Z"), nuevoId: () => crypto.randomUUID() };

/** Una petición JSON-RPC por Streamable HTTP, como la manda un cliente MCP sin sesión. */
async function rpc(
  handler: ReturnType<typeof createMcpHandler>,
  method: string,
  params: Record<string, unknown> = {},
) {
  const respuesta = await handler.fetch(
    new Request("http://localhost/functions/v1/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  assertEquals(respuesta.status, 200, await respuesta.clone().text());
  const cuerpo = await respuesta.text();
  // La respuesta puede llegar como JSON o como un evento SSE con el JSON en la línea data:.
  const json = cuerpo.trimStart().startsWith("{")
    ? cuerpo
    : cuerpo.split("\n").find((l) => l.startsWith("data:"))!.slice(5);
  return JSON.parse(json);
}

function manejador(pantallas: Record<string, string> = {}, d = datos()) {
  return createMcpHandler(() => crearServidor(d, { pantallas, reloj }));
}

type Herramienta = {
  name: string;
  annotations?: Record<string, boolean>;
  _meta?: { ui?: { resourceUri?: string } };
};

Deno.test("tools/list: las cinco herramientas, y solo anotar_gasto escribe", async () => {
  const { result } = await rpc(manejador(), "tools/list");
  const herramientas = result.tools as Herramienta[];
  assertEquals(herramientas.map((h) => h.name).sort(), [
    "anotar_gasto",
    "ver_cruces",
    "ver_movimientos",
    "ver_parche",
    "ver_parches",
  ]);
  for (const h of herramientas) {
    if (h.name === "anotar_gasto") {
      assertEquals(h.annotations?.readOnlyHint, false);
      assertEquals(h.annotations?.destructiveHint, false);
    } else {
      assertEquals(h.annotations?.readOnlyHint, true, `${h.name} es de solo lectura`);
    }
  }
});

Deno.test("Sin pantallas empaquetadas, ninguna herramienta declara _meta.ui", async () => {
  const { result } = await rpc(manejador(), "tools/list");
  for (const h of result.tools as Herramienta[]) assertEquals(h._meta?.ui, undefined);
});

Deno.test("MCP Apps (tarea 2.1): con la pantalla, ver_cruces declara _meta.ui.resourceUri y el recurso es mcp-app", async () => {
  const html = "<!doctype html><title>Tus cruces</title>";
  const h = manejador({ "cruces.html": html });
  const { result } = await rpc(h, "tools/list");
  const verCruces = (result.tools as Herramienta[]).find((t) => t.name === "ver_cruces")!;
  assertEquals(verCruces._meta?.ui?.resourceUri, "ui://cruce/cruces.html");
  const recurso = await rpc(h, "resources/read", { uri: "ui://cruce/cruces.html" });
  assertEquals(recurso.result.contents[0].mimeType, "text/html;profile=mcp-app");
  assertEquals(recurso.result.contents[0].text, html);
});

Deno.test("tools/call anotar_gasto y después ver_cruces, de punta a punta", async () => {
  const d = datos();
  const h = manejador({}, d);
  const anotado = await rpc(h, "tools/call", {
    name: "anotar_gasto",
    arguments: { cruce_id: CON_JESUS, monto: 60_000, concepto: "Cena", quien_pago: "yo", reparto: "a_medias" },
  });
  assert(!anotado.result.isError, JSON.stringify(anotado));
  assertStringIncludes(anotado.result.content[0].text, "Jesús te debe $30.000");
  assertEquals(anotado.result.structuredContent.saldo, "Jesús te debe $30.000");

  const cruces = await rpc(h, "tools/call", { name: "ver_cruces", arguments: {} });
  assertStringIncludes(cruces.result.content[0].text, "Cruce con Jesús (@jesus), abierto: Jesús te debe $30.000");
});

Deno.test("tools/call con un monto fuera de rango responde con el mensaje de la spec y no guarda nada", async () => {
  const d = datos();
  const r = await rpc(manejador({}, d), "tools/call", {
    name: "anotar_gasto",
    arguments: { cruce_id: CON_JESUS, monto: 1_500_000_000, concepto: "Cena", quien_pago: "yo" },
  });
  assertEquals(r.result.isError, true);
  assertEquals(r.result.content[0].text, "El monto debe ser de $1 a $999.999.999.");
  assertEquals(d.movimientosGuardados.length, 0);
});

Deno.test("Un fallo de la base no se muestra tal cual", async () => {
  const d = datos();
  d.misCruces = () => Promise.reject(new Error("detalle interno"));
  const r = await rpc(manejador({}, d), "tools/call", { name: "ver_cruces", arguments: {} });
  assertEquals(r.result.isError, true);
  assertEquals(r.result.content[0].text, "No pude leer tus cuentas de Cruce. Intenta de nuevo en un momento.");
});
