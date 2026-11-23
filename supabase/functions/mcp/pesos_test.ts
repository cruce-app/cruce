// Los mismos casos de MoneyTests.swift (CruceCore), para que el formato no se separe del de la app.
import { assertEquals } from "@std/assert";
import { formatoPesos, parte } from "./pesos.ts";

Deno.test("El formato agrupa los miles con puntos", () => {
  const casos: [number, string][] = [
    [0, "$0"],
    [999, "$999"],
    [30_000, "$30.000"],
    [1_800_000, "$1.800.000"],
    [999_999_999, "$999.999.999"],
  ];
  for (const [valor, esperado] of casos) assertEquals(formatoPesos(valor), esperado);
});

Deno.test("Con signo usa el menos tipográfico (U+2212)", () => {
  assertEquals(formatoPesos(18_000, { conSigno: true }), "+$18.000");
  assertEquals(formatoPesos(-50_000, { conSigno: true }), "−$50.000");
  assertEquals(formatoPesos(0, { conSigno: true }), "$0");
});

Deno.test("Sin signo, un negativo se escribe por su magnitud", () => {
  assertEquals(formatoPesos(-20_000), "$20.000");
});

Deno.test("La parte de un monto redondea al peso más cercano, .5 hacia arriba", () => {
  assertEquals(parte(60_000, 50), 30_000);
  assertEquals(parte(100_000, 50), 50_000);
  assertEquals(parte(45_001, 50), 22_501);
  assertEquals(parte(1, 50), 1);
  assertEquals(parte(10_000, 70), 7_000);
  assertEquals(parte(10_000, 0), 0);
});
