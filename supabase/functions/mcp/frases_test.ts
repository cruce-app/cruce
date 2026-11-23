// Los mismos casos de LedgerStoreTests, ParcheStoreTests, ParcheBalanceCardTests y ParcheTicketTests (CruceCore).
import { assertEquals } from "@std/assert";
import {
  estadoParche,
  fraseCruce,
  fraseMiSaldoParche,
  fraseMovimiento,
  frasePagoParche,
  lineaSaldoParche,
  lista,
  saldoParche,
} from "./frases.ts";

Deno.test("Frase del cruce: el ejemplo canónico desde Joan y desde Jesús", () => {
  // Joan paga la cena de $60.000 a medias (+30.000) y Jesús el mercado de $100.000 a medias (−50.000): −20.000.
  assertEquals(fraseCruce(-20_000, "Jesús"), "Le debes $20.000 a Jesús");
  assertEquals(fraseCruce(20_000, "Joan"), "Joan te debe $20.000");
});

Deno.test("Frase del cruce en $0 y con montos grandes", () => {
  assertEquals(fraseCruce(0, "Jesús"), "Están a paz y salvo");
  assertEquals(fraseCruce(-15_000, "Ana"), "Le debes $15.000 a Ana");
  assertEquals(fraseCruce(1_800_000, "Ana"), "Ana te debe $1.800.000");
});

Deno.test("Saldo en el parche con tú y sin tú", () => {
  assertEquals(saldoParche(165_000, false), "Le deben $165.000");
  assertEquals(saldoParche(-110_000, false), "Debe $110.000");
  assertEquals(saldoParche(-110_000, true), "Debes $110.000");
  assertEquals(saldoParche(5_000, true), "Te deben $5.000");
  assertEquals(saldoParche(0, false), "A paz y salvo");
  assertEquals(saldoParche(0, true), "Estás a paz y salvo");
});

Deno.test("La fila de Saldos: a ti se te agrega a tu favor", () => {
  assertEquals(lineaSaldoParche(165_000, false), "Le deben $165.000");
  assertEquals(lineaSaldoParche(5_000, true), "Te deben $5.000 · a tu favor");
  assertEquals(lineaSaldoParche(-110_000, false), "Debe $110.000");
  assertEquals(lineaSaldoParche(-110_000, true), "Debes $110.000");
  assertEquals(lineaSaldoParche(0, false), "A paz y salvo");
});

Deno.test("Para saldar con tú: Le pagas, te paga y le paga", () => {
  assertEquals(
    frasePagoParche({ de: "Carlos", a: "Jesús", monto: 125_000, deEsTu: false, aEsTu: false }),
    "Carlos le paga $125.000 a Jesús",
  );
  assertEquals(
    frasePagoParche({ de: "Carlos", a: "Joan", monto: 47_000, deEsTu: false, aEsTu: true }),
    "Carlos te paga $47.000",
  );
  assertEquals(
    frasePagoParche({ de: "Carlos", a: "Jesús", monto: 125_000, deEsTu: true, aEsTu: false }),
    "Le pagas $125.000 a Jesús",
  );
});

Deno.test("Tu saldo en el parche", () => {
  assertEquals(fraseMiSaldoParche({ miNeto: 47_000, todosEnCero: false, saldado: false }), "Te deben en el parche");
  assertEquals(fraseMiSaldoParche({ miNeto: -172_000, todosEnCero: false, saldado: false }), "Debes en el parche");
  assertEquals(fraseMiSaldoParche({ miNeto: 0, todosEnCero: true, saldado: true }), "Todos quedaron a paz y salvo");
  assertEquals(fraseMiSaldoParche({ miNeto: 0, todosEnCero: false, saldado: true }), "Ya están a paz y salvo");
  assertEquals(fraseMiSaldoParche({ miNeto: 0, todosEnCero: false, saldado: false }), "Estás a paz y salvo");
});

Deno.test("Estado del parche: Abierto, Parche cerrado o A paz y salvo", () => {
  assertEquals(estadoParche("open", [47_000, -47_000]), "Abierto");
  assertEquals(estadoParche("open", [0, 0]), "Abierto");
  assertEquals(estadoParche("closed", [47_000, -47_000]), "Parche cerrado");
  assertEquals(estadoParche("closed", [0, 0]), "A paz y salvo");
});

Deno.test("Lista de nombres: Ana, Ana y Jesús, Ana, Jesús y Joan", () => {
  assertEquals(lista([]), "");
  assertEquals(lista(["Ana"]), "Ana");
  assertEquals(lista(["Ana", "Jesús"]), "Ana y Jesús");
  assertEquals(lista(["Ana", "Jesús", "Joan"]), "Ana, Jesús y Joan");
});

Deno.test("Un movimiento: quién pagó, el reparto y cuánto le toca a quien no pagó", () => {
  assertEquals(
    fraseMovimiento({ tipo: "expense", pagador: "Jesús", otro: "Joan", monto: 100_000, porcentajeOtro: 50 }),
    "Pagó Jesús, a medias: Joan le debe $50.000",
  );
  assertEquals(
    fraseMovimiento({ tipo: "expense", pagador: "Joan", otro: "Jesús", monto: 10_000, porcentajeOtro: 70 }),
    "Pagó Joan, 70 % para Jesús: Jesús le debe $7.000",
  );
  assertEquals(
    fraseMovimiento({ tipo: "expense", pagador: "Joan", otro: "Jesús", monto: 30_000, porcentajeOtro: 100 }),
    "Pagó Joan, todo es de Jesús: Jesús le debe $30.000",
  );
  assertEquals(
    fraseMovimiento({ tipo: "expense", pagador: "Joan", otro: "Jesús", monto: 30_000, porcentajeOtro: 0 }),
    "Pagó Joan, 0 % para Jesús: Jesús no le debe nada",
  );
  assertEquals(
    fraseMovimiento({ tipo: "settlement", pagador: "Joan", otro: "Jesús", monto: 20_000, porcentajeOtro: 100 }),
    "Pago para saldar: Joan le pagó $20.000 a Jesús",
  );
});
