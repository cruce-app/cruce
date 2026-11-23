# MCP de Cruce para Claude
Objetivo: que Joan y Jesús consulten y anoten sus cuentas de Cruce desde Claude, con pantallas dentro del chat. Cambio de OpenSpec `mcp-cruce` (propuesto, sin implementar). Rama prevista: `feat/mcp-cruce`; un PR para el servidor y la conexión, y otro para las pantallas.
Pruebas: pgTAP (`supabase test db --local`, Docker de Kiri en `~/.kiri/bin`), Deno (`deno test` en `supabase/functions/mcp`) y Go (`go test ./...` en `backend`).

## Specs

Las specs completas están en `openspec/changes/mcp-cruce/specs/` (`conexion-claude` y `herramientas-claude`). Diseño en `openspec/changes/mcp-cruce/design.md`.

- **S1 (alcance):** primera versión "Con anotar gastos": leer cruces y saldos, movimientos y parches con su "Para saldar", y anotar un gasto en un cruce abierto. Editar, borrar, saldar y anotar en parches quedan fuera.
- **S2 (servidor):** "TypeScript en Supabase, vamos con eso": Edge Function `mcp` por ambiente, OAuth 2.1 de Supabase Auth con registro automático y RLS con el token de la persona.
- **S3 (consentimiento):** "Sí, en Go y Fly": `GET /oauth/consent` y `GET /oauth/conexiones` en el backend de Go, con la clave anónima y nunca la `service_role`. Prod necesita `cruce-api-prod` en Fly.
- **S4 (pantallas):** MCP App con "saldo, movimientos y formulario para anotar", con el estilo de Cruce y la respuesta completa en texto para los clientes sin pantallas.
- **S5 (seguridad):** anotar es la única herramienta que escribe y se declara como tal; validación en el servidor y en la base; quitar el acceso desde "Tus conexiones".

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S2 | en línea (base: `parche_summary`, config OAuth y claves ES256) | pendiente | — |
| T2 | S1, S2, S5 | en línea (función `mcp` y herramientas) | pendiente | — |
| T3 | S3, S5 | en línea (rutas de Go) | pendiente | — |
| T4 | S4 | en línea (pantallas) | pendiente | — |
| T5 | S1–S5 | en línea (CI, scripts y documentación) | pendiente | — |
| T6 | S1–S5 | verificador independiente (Riesgo: ítem 2, auth y permisos) | pendiente | — |
| T7 | S1–S5 | Joan, en la nube (testing y prod) | pendiente | — |

Ruta: en línea, porque las unidades dependen unas de otras (la función necesita la base y la página de consentimiento para probarse). T6 es obligatorio: el cambio toca autenticación y permisos.

## Log

- **L1 (22 nov 2026), Joan:** "Listo ahora quiero que hagamos dos cosas, puedes averiguar que tan demoradas y costosas son de hacer quiero hacer un servidor MCP para cruce y un MCP interactivo para claude tambien de cruce, puedes averiguar todo sobre esto porfa". Después: "Con anotar gastos", "TypeScript en Supabase, vamos con eso", "Se puede hacer con el backend en go con fly?" y "Sí, en Go y Fly".
- **L2 (22 nov 2026):** hallazgos de la investigación:
  - Supabase Edge Functions no sirven HTML (lo convierten en `text/plain`), por eso la página de consentimiento va en Go.
  - El servidor OAuth de Supabase está en beta, en todos los planes y sin costo aparte.
  - `@supabase/server` exige claves de firma asimétricas.
  - `parche_balances` y `parche_settlement_plan` están revocadas para `authenticated`, por eso hace falta `parche_summary`.
  - Supabase no menciona Client ID Metadata Documents, así que Claude usa "Register automatically".
  - Estimación: de 6 a 11 días de trabajo.
- **L3 (22 nov 2026):** cambio de OpenSpec `mcp-cruce` propuesto y validado con `--strict`. Siguiente paso: el visto bueno de Joan a los artefactos y a las dependencias nuevas; después, la rama `feat/mcp-cruce` y T1.
