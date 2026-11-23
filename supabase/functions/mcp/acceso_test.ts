// Cuándo la función responde 401 aunque el token tenga una firma válida: la cuenta se borró o el acceso se quitó.
import { assertEquals } from "@std/assert";
import { sinAcceso } from "./acceso.ts";

Deno.test("Cuenta borrada o acceso quitado: 401", () => {
  // auth-js convierte el 403 session_not_found de Auth en AuthSessionMissingError (400).
  assertEquals(sinAcceso({ name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" }), true);
  assertEquals(sinAcceso({ name: "AuthApiError", status: 403, code: "session_not_found", message: "x" }), true);
  assertEquals(sinAcceso({ name: "AuthApiError", status: 403, code: "user_not_found", message: "x" }), true);
  assertEquals(sinAcceso({ name: "AuthApiError", status: 401, message: "x" }), true);
  assertEquals(sinAcceso({ name: "AuthApiError", status: 404, message: "x" }), true);
});

Deno.test("Auth caído o lento: no es un 401", () => {
  assertEquals(sinAcceso({ name: "AuthRetryableFetchError", status: 0, message: "fetch failed" }), false);
  assertEquals(sinAcceso({ name: "AuthApiError", status: 500, message: "x" }), false);
  assertEquals(sinAcceso({ name: "AuthApiError", status: 502, message: "x" }), false);
});
