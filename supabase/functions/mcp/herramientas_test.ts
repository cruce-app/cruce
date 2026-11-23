// Cada herramienta contra un doble de la base (datos_memoria.ts). Los casos salen de las specs herramientas-claude y
// conexion-claude del cambio mcp-cruce.
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { DatosEnMemoria } from "./datos_memoria.ts";
import type { CruceFila, ResumenParche } from "./datos.ts";
import { anotarGasto, MENSAJES, verCruces, verMovimientos, verParche, verParches } from "./herramientas.ts";

const JOAN = "10000000-0000-0000-0000-000000000001";
const JESUS = "10000000-0000-0000-0000-000000000002";
const ANA = "10000000-0000-0000-0000-000000000003";
const PEDRO = "10000000-0000-0000-0000-000000000005";
const CON_JESUS = "d1000000-0000-0000-0000-000000000001";
const CON_ANA = "d1000000-0000-0000-0000-000000000002";
const CON_PEDRO = "d1000000-0000-0000-0000-000000000003";
const AJENO = "d1000000-0000-0000-0000-0000000000ff";

function cruce(id: string, otra: string, nombre: string, usuario: string, extra: Partial<CruceFila> = {}): CruceFila {
  return {
    ledger_id: id,
    partner_id: otra,
    partner_name: nombre,
    partner_username: usuario,
    partner_deleted: false,
    closed_at: null,
    default_other_percent: 50,
    ...extra,
  };
}

/** Joan, con cruces con Jesús y Ana, y el de Pedro cerrado; en el de Jesús, el ejemplo canónico. */
function mundoDeJoan(): DatosEnMemoria {
  const datos = new DatosEnMemoria(JOAN, "Joan", [
    cruce(CON_JESUS, JESUS, "Jesús", "jesus"),
    cruce(CON_ANA, ANA, "Ana", "ana"),
    cruce(CON_PEDRO, PEDRO, "Pedro", "pedro", { closed_at: "2026-11-01T00:00:00Z" }),
  ]);
  datos.guardar({
    id: "m1",
    ledger_id: CON_JESUS,
    kind: "expense",
    payer_id: JOAN,
    amount: 60_000,
    concept: "Cena",
    category: "comida",
    split_type: "equal",
    other_share_percent: 50,
    occurred_at: "2026-11-20T01:00:00Z",
  });
  datos.guardar({
    id: "m2",
    ledger_id: CON_JESUS,
    kind: "expense",
    payer_id: JESUS,
    amount: 100_000,
    concept: "Mercado",
    category: "mercado",
    split_type: "equal",
    other_share_percent: 50,
    occurred_at: "2026-11-21T15:00:00Z",
  });
  // Eliminado: no cuenta ni aparece.
  datos.guardar({
    id: "m3",
    ledger_id: CON_JESUS,
    kind: "expense",
    payer_id: JOAN,
    amount: 999_000,
    concept: "Error",
    category: "otro",
    split_type: "equal",
    other_share_percent: 50,
    occurred_at: "2026-11-22T15:00:00Z",
    deleted_at: "2026-11-22T16:00:00Z",
  });
  return datos;
}

const reloj = { ahora: () => new Date("2026-11-22T18:30:00Z"), nuevoId: () => "nuevo-id" };

// ─────────────────────────────────────────────────────────────
// ver_cruces
// ─────────────────────────────────────────────────────────────

Deno.test("ver_cruces: el ejemplo canónico desde Joan es «Le debes $20.000 a Jesús»", async () => {
  const r = await verCruces(mundoDeJoan());
  assertStringIncludes(r.texto, "Le debes $20.000 a Jesús");
  const conJesus = r.datos.cruces.find((c) => c.cruce_id === CON_JESUS)!;
  assertEquals(conJesus.frase, "Le debes $20.000 a Jesús");
  assertEquals(conJesus.neto, -20_000);
});

Deno.test("ver_cruces: devuelve los tres, cada uno con su frase, y el de Pedro cerrado", async () => {
  const r = await verCruces(mundoDeJoan());
  assertEquals(r.datos.cruces.map((c) => [c.con, c.usuario, c.abierto, c.frase]), [
    ["Jesús", "jesus", true, "Le debes $20.000 a Jesús"],
    ["Ana", "ana", true, "Están a paz y salvo"],
    ["Pedro", "pedro", false, "Están a paz y salvo"],
  ]);
  assertStringIncludes(r.texto, "Cruce con Pedro (@pedro), cerrado: Están a paz y salvo");
  assertStringIncludes(r.texto, "Cruce con Jesús (@jesus), abierto: Le debes $20.000 a Jesús");
});

Deno.test("ver_cruces: sin cruces lo dice", async () => {
  const r = await verCruces(new DatosEnMemoria(JOAN, "Joan", []));
  assertEquals(r.texto, "Aún no tienes cruces.");
  assertEquals(r.datos.cruces, []);
});

// ─────────────────────────────────────────────────────────────
// ver_movimientos
// ─────────────────────────────────────────────────────────────

Deno.test("ver_movimientos: primero el mercado y después la cena; el eliminado no aparece", async () => {
  const r = await verMovimientos(mundoDeJoan(), { cruce_id: CON_JESUS });
  assert(!r.error);
  assertEquals(r.datos!.movimientos.map((m) => m.concepto), ["Mercado", "Cena"]);
  const mercado = r.datos!.movimientos[0];
  assertEquals(mercado.detalle, "Pagó Jesús, a medias: Joan le debe $50.000");
  assertEquals(mercado.monto, 100_000);
  assertEquals(mercado.le_toca_a_quien_no_pago, 50_000);
  assertEquals(mercado.tipo, "gasto");
  assertEquals(mercado.categoria, "Mercado");
  assertEquals(mercado.fecha, "2026-11-21");
  assert(r.texto.indexOf("Mercado") < r.texto.indexOf("Cena"));
  assertStringIncludes(r.texto, "Pagó Jesús, a medias: Joan le debe $50.000");
  assert(!r.texto.includes("Error"));
});

Deno.test("ver_movimientos: la fecha se cuenta en Bogotá", async () => {
  const r = await verMovimientos(mundoDeJoan(), { cruce_id: CON_JESUS });
  // La cena fue el 20 nov a la 1:00 UTC: en Bogotá todavía era el 19.
  assertEquals(r.datos!.movimientos[1].fecha, "2026-11-19");
});

Deno.test("ver_movimientos: 20 por defecto y hasta 100", async () => {
  const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
  for (let i = 0; i < 130; i++) {
    datos.guardar({
      id: `m${i}`,
      ledger_id: CON_JESUS,
      kind: "expense",
      payer_id: JOAN,
      amount: 1_000 + i,
      concept: `Gasto ${i}`,
      category: "otro",
      split_type: "equal",
      other_share_percent: 50,
      occurred_at: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
    });
  }
  assertEquals((await verMovimientos(datos, { cruce_id: CON_JESUS })).datos!.movimientos.length, 20);
  assertEquals((await verMovimientos(datos, { cruce_id: CON_JESUS, limite: 100 })).datos!.movimientos.length, 100);
  assertEquals((await verMovimientos(datos, { cruce_id: CON_JESUS, limite: 500 })).datos!.movimientos.length, 100);
  assertEquals((await verMovimientos(datos, { cruce_id: CON_JESUS, limite: 0 })).datos!.movimientos.length, 1);
  assertEquals((await verMovimientos(datos, { cruce_id: CON_JESUS })).datos!.movimientos[0].concepto, "Gasto 129");
});

Deno.test("ver_movimientos: un cruce ajeno responde igual que uno que no existe", async () => {
  const r = await verMovimientos(mundoDeJoan(), { cruce_id: AJENO });
  assertEquals(r, { texto: "No encontré ese cruce.", error: true });
  const raro = await verMovimientos(mundoDeJoan(), { cruce_id: "no-es-un-id" });
  assertEquals(raro, { texto: "No encontré ese cruce.", error: true });
});

Deno.test("ver_movimientos: un pago para saldar se nombra como tal", async () => {
  const datos = mundoDeJoan();
  datos.guardar({
    id: "s1",
    ledger_id: CON_JESUS,
    kind: "settlement",
    payer_id: JOAN,
    amount: 20_000,
    concept: "Saldar cuentas",
    category: "otro",
    split_type: "full_other",
    other_share_percent: 100,
    occurred_at: "2026-11-22T17:00:00Z",
  });
  const r = await verMovimientos(datos, { cruce_id: CON_JESUS });
  assertEquals(r.datos!.movimientos[0].tipo, "pago para saldar");
  assertEquals(r.datos!.movimientos[0].detalle, "Pago para saldar: Joan le pagó $20.000 a Jesús");
});

// ─────────────────────────────────────────────────────────────
// ver_parches y ver_parche
// ─────────────────────────────────────────────────────────────

const SANTA_MARTA = "a1000000-0000-0000-0000-000000000001";
const P = { jo: "p-joan", j: "p-jesus", a: "p-ana", c: "p-carlos" };

function santaMarta(): ResumenParche {
  return {
    parche_id: SANTA_MARTA,
    name: "Santa Marta",
    status: "open",
    expense_count: 3,
    my_participant_id: P.jo,
    people: [
      { participant_id: P.jo, name: "Joan", is_me: true, has_app: true, deleted: false, net: 47_000 },
      { participant_id: P.j, name: "Jesús", is_me: false, has_app: true, deleted: false, net: 125_000 },
      { participant_id: P.a, name: "Ana", is_me: false, has_app: true, deleted: false, net: 0 },
      { participant_id: P.c, name: "Carlos", is_me: false, has_app: false, deleted: false, net: -172_000 },
    ],
    transfers: [
      { from_id: P.c, to_id: P.j, amount: 125_000 },
      { from_id: P.c, to_id: P.jo, amount: 47_000 },
    ],
  };
}

function conParches(): DatosEnMemoria {
  const datos = mundoDeJoan();
  datos.parches = [{ id: SANTA_MARTA, name: "Santa Marta", status: "open", created_at: "2026-10-23T00:00:00Z" }];
  datos.resumenes = { [SANTA_MARTA]: santaMarta() };
  return datos;
}

Deno.test("ver_parches: nombre, estado y tu saldo con la frase de la app", async () => {
  const r = await verParches(conParches());
  assertEquals(r.datos.parches, [{
    parche_id: SANTA_MARTA,
    nombre: "Santa Marta",
    estado: "Abierto",
    abierto: true,
    personas: 4,
    neto: 47_000,
    frase: "Te deben $47.000",
  }]);
  assertStringIncludes(r.texto, "Santa Marta · Abierto · 4 personas · Te deben $47.000");
});

Deno.test("ver_parches: sin parches lo dice", async () => {
  const r = await verParches(mundoDeJoan());
  assertEquals(r.texto, "Aún no tienes parches.");
});

Deno.test("ver_parche: los saldos de los cuatro y el mismo «Para saldar» de la app", async () => {
  const r = await verParche(conParches(), { parche_id: SANTA_MARTA });
  assert(!r.error);
  assertEquals(r.datos!.para_saldar.map((t) => t.frase), ["Carlos le paga $125.000 a Jesús", "Carlos te paga $47.000"]);
  assertEquals(r.datos!.saldos.map((s) => [s.nombre, s.frase]), [
    ["Joan", "Te deben $47.000 · a tu favor"],
    ["Jesús", "Le deben $125.000"],
    ["Ana", "A paz y salvo"],
    ["Carlos", "Debe $172.000"],
  ]);
  assertEquals(r.datos!.tu_saldo, "Te deben en el parche");
  assertStringIncludes(r.texto, "Carlos (sin la app): Debe $172.000");
  assertStringIncludes(r.texto, "Joan (tú): Te deben $47.000 · a tu favor");
  assertStringIncludes(r.texto, "Para saldar:\n- Carlos le paga $125.000 a Jesús\n- Carlos te paga $47.000");
});

Deno.test("ver_parche: con todos en $0 no hay «Para saldar»", async () => {
  const datos = conParches();
  const resumen = santaMarta();
  resumen.status = "closed";
  resumen.people = resumen.people.map((p) => ({ ...p, net: 0 }));
  resumen.transfers = [];
  datos.resumenes[SANTA_MARTA] = resumen;
  const r = await verParche(datos, { parche_id: SANTA_MARTA });
  assertEquals(r.datos!.estado, "A paz y salvo");
  assertEquals(r.datos!.tu_saldo, "Todos quedaron a paz y salvo");
  assertStringIncludes(r.texto, "Nadie le debe nada a nadie.");
  assert(!r.texto.includes("Para saldar"));
});

Deno.test("ver_parche: quien no es del parche no ve nada", async () => {
  const r = await verParche(mundoDeJoan(), { parche_id: SANTA_MARTA });
  assertEquals(r, { texto: "No encontré ese parche.", error: true });
});

// ─────────────────────────────────────────────────────────────
// anotar_gasto
// ─────────────────────────────────────────────────────────────

Deno.test("anotar_gasto: «pagué la cena de $60.000 a medias con Jesús»", async () => {
  const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
  const r = await anotarGasto(datos, {
    cruce_id: CON_JESUS,
    monto: 60_000,
    concepto: "  Cena ",
    quien_pago: "yo",
    reparto: "a_medias",
    categoria: "comida",
  }, reloj);
  assert(!r.error);
  assertEquals(datos.movimientosGuardados.length, 1);
  const guardado = datos.movimientosGuardados[0];
  assertEquals(guardado.id, "nuevo-id");
  assertEquals(guardado.kind, "expense");
  assertEquals(guardado.payer_id, JOAN);
  assertEquals(guardado.amount, 60_000);
  assertEquals(guardado.concept, "Cena");
  assertEquals(guardado.category, "comida");
  assertEquals([guardado.split_type, guardado.other_share_percent], ["equal", 50]);
  assertEquals(guardado.occurred_at, "2026-11-22T18:30:00.000Z");
  assert(!("created_by" in guardado), "created_by lo pone la base");
  assertEquals(r.datos!.saldo, "Jesús te debe $30.000");
  assertStringIncludes(r.texto, "Jesús te debe $30.000");
  assertStringIncludes(r.texto, "Pagó Joan, a medias: Jesús le debe $30.000");
});

Deno.test("anotar_gasto: pagó la otra persona, todo es del otro, con fecha (mediodía de Bogotá)", async () => {
  const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
  const r = await anotarGasto(datos, {
    cruce_id: CON_JESUS,
    monto: 45_000,
    concepto: "Taxi",
    quien_pago: "la_otra_persona",
    reparto: "todo_del_otro",
    categoria: "transporte",
    fecha: "2026-11-20",
  }, reloj);
  assert(!r.error);
  const guardado = datos.movimientosGuardados[0];
  assertEquals(guardado.payer_id, JESUS);
  assertEquals([guardado.split_type, guardado.other_share_percent], ["full_other", 100]);
  assertEquals(guardado.occurred_at, "2026-11-20T17:00:00.000Z");
  assertEquals(r.datos!.saldo, "Le debes $45.000 a Jesús");
});

Deno.test("anotar_gasto: sin reparto usa el del cruce (70 %)", async () => {
  const datos = new DatosEnMemoria(JOAN, "Joan", [
    cruce(CON_JESUS, JESUS, "Jesús", "jesus", { default_other_percent: 70 }),
  ]);
  await anotarGasto(datos, { cruce_id: CON_JESUS, monto: 10_000, concepto: "Almuerzo", quien_pago: "yo" }, reloj);
  const guardado = datos.movimientosGuardados[0];
  assertEquals([guardado.split_type, guardado.other_share_percent], ["percentage", 70]);
  assertEquals(guardado.category, "otro");
});

Deno.test("anotar_gasto: el reparto por defecto de 50 y de 100 se guarda como a medias y todo del otro", async () => {
  for (const [porDefecto, esperado] of [[50, "equal"], [100, "full_other"]] as const) {
    const datos = new DatosEnMemoria(JOAN, "Joan", [
      cruce(CON_JESUS, JESUS, "Jesús", "jesus", { default_other_percent: porDefecto }),
    ]);
    await anotarGasto(datos, { cruce_id: CON_JESUS, monto: 10_000, concepto: "X", quien_pago: "yo" }, reloj);
    assertEquals(datos.movimientosGuardados[0].split_type, esperado);
  }
});

Deno.test("anotar_gasto: un porcentaje pedido se guarda como porcentaje", async () => {
  const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
  await anotarGasto(datos, {
    cruce_id: CON_JESUS,
    monto: 10_000,
    concepto: "Regalo",
    quien_pago: "yo",
    reparto: "porcentaje",
    porcentaje_otro: 30,
  }, reloj);
  const guardado = datos.movimientosGuardados[0];
  assertEquals([guardado.split_type, guardado.other_share_percent], ["percentage", 30]);
});

Deno.test("anotar_gasto: monto fuera de rango no guarda nada", async () => {
  for (const monto of [1_500_000_000, 0, -5, 1000.5, 1_000_000_000]) {
    const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
    const r = await anotarGasto(datos, { cruce_id: CON_JESUS, monto, concepto: "Cena", quien_pago: "yo" }, reloj);
    assertEquals(r, { texto: "El monto debe ser de $1 a $999.999.999.", error: true });
    assertEquals(datos.movimientosGuardados.length, 0);
  }
  const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
  for (const monto of [1, 999_999_999]) {
    const r = await anotarGasto(datos, { cruce_id: CON_JESUS, monto, concepto: "Borde", quien_pago: "yo" }, reloj);
    assert(!r.error, `${monto} sí se puede anotar`);
  }
});

Deno.test("anotar_gasto: concepto vacío o de más de 80 caracteres no guarda nada", async () => {
  for (const concepto of ["", "   ", "x".repeat(81), "ñ".repeat(81)]) {
    const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
    const r = await anotarGasto(datos, { cruce_id: CON_JESUS, monto: 1_000, concepto, quien_pago: "yo" }, reloj);
    assertEquals(r, { texto: "El concepto debe tener de 1 a 80 caracteres.", error: true });
    assertEquals(datos.movimientosGuardados.length, 0);
  }
  const datos = new DatosEnMemoria(JOAN, "Joan", [cruce(CON_JESUS, JESUS, "Jesús", "jesus")]);
  const r = await anotarGasto(datos, {
    cruce_id: CON_JESUS,
    monto: 1_000,
    concepto: "😀".repeat(80),
    quien_pago: "yo",
  }, reloj);
  assert(!r.error, "80 caracteres (aunque sean emojis) sí caben, como char_length en la base");
});

Deno.test("anotar_gasto: cruce cerrado no guarda nada", async () => {
  const datos = mundoDeJoan();
  const antes = datos.movimientosGuardados.length;
  const r = await anotarGasto(datos, { cruce_id: CON_PEDRO, monto: 10_000, concepto: "Cena", quien_pago: "yo" }, reloj);
  assertEquals(r, { texto: "Este cruce está cerrado: ya no acepta gastos.", error: true });
  assertEquals(datos.movimientosGuardados.length, antes);
});

Deno.test("anotar_gasto: si el cruce se cierra entre leer y escribir, la base lo rechaza con el mismo mensaje", async () => {
  const datos = mundoDeJoan();
  datos.cerrarAlInsertar.add(CON_JESUS);
  const r = await anotarGasto(datos, { cruce_id: CON_JESUS, monto: 10_000, concepto: "Cena", quien_pago: "yo" }, reloj);
  assertEquals(r, { texto: "Este cruce está cerrado: ya no acepta gastos.", error: true });
});

Deno.test("anotar_gasto: un cruce ajeno responde «No encontré ese cruce.»", async () => {
  const datos = mundoDeJoan();
  const antes = datos.movimientosGuardados.length;
  const r = await anotarGasto(datos, { cruce_id: AJENO, monto: 10_000, concepto: "Cena", quien_pago: "yo" }, reloj);
  assertEquals(r, { texto: "No encontré ese cruce.", error: true });
  assertEquals(datos.movimientosGuardados.length, antes);
});

Deno.test("anotar_gasto: otro error de la base no se muestra tal cual", async () => {
  const datos = mundoDeJoan();
  datos.errorAlInsertar = { message: "detalle interno de postgres" };
  const r = await anotarGasto(datos, { cruce_id: CON_JESUS, monto: 10_000, concepto: "Cena", quien_pago: "yo" }, reloj);
  assertEquals(r, { texto: MENSAJES.noSePudoAnotar, error: true });
});

Deno.test("anotar_gasto: porcentaje y fecha inválidos", async () => {
  const datos = mundoDeJoan();
  const base = { cruce_id: CON_JESUS, monto: 10_000, concepto: "Cena", quien_pago: "yo" as const };
  assertEquals(await anotarGasto(datos, { ...base, reparto: "porcentaje", porcentaje_otro: 120 }, reloj), {
    texto: MENSAJES.porcentaje,
    error: true,
  });
  assertEquals(await anotarGasto(datos, { ...base, reparto: "porcentaje" }, reloj), {
    texto: MENSAJES.porcentaje,
    error: true,
  });
  assertEquals(await anotarGasto(datos, { ...base, fecha: "20/11/2026" }, reloj), {
    texto: MENSAJES.fecha,
    error: true,
  });
  assertEquals(await anotarGasto(datos, { ...base, fecha: "2026-02-30" }, reloj), {
    texto: MENSAJES.fecha,
    error: true,
  });
});
