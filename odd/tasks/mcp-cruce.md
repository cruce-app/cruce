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
| T1 | S2 | delegado (escritor acotado: T1, T2, T3 y 5.1/5.2) | hecho (1.1–1.3) | `d395502`, `3bc1deb` |
| T2 | S1, S2, S5 | delegado (mismo escritor) | hecho (2.1–2.7) | `4678467`, `25303ea`, `3bc1deb`, `e5ea2e8` |
| T3 | S3, S5 | delegado (mismo escritor) | 3.1 y 3.2 hechos; 3.3 a medias (sin Claude Code ni simulador) | `e344d3d` |
| T4 | S4 | delegado (escritor acotado: T4, 5.1 y 5.3) | hecho (4.1–4.3) | `0fd9963`, `402a94d` |
| T5 | S1–S5 | delegados | 5.2 y 5.3 hechos; 5.1 con la revisión de `ui_bundle.ts` y `actionlint` en verde, falta la CI en verde en el PR | `a5099a2`, `402a94d`, commit de docs de L5 |
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
- **L4 (23 nov 2026), escritor de T1–T3 y 5.1/5.2:**
  - **T1:** pgTAP `22_mcp_lectura_parches.sql` en rojo (`function parche_summary(uuid) does not exist`, 16/16) y en verde con `20261122100000_mcp_lectura_parches.sql`: `supabase test db --local` 553 en 22 archivos. `config.toml` con el servidor OAuth, registro automático, `site_url` 8088, `[functions.mcp] verify_jwt = false` y `signing_keys_path` (clave ES256 en `.gitignore`); un token nuevo dice `alg: ES256`. Los metadatos responden en `/auth/v1/.well-known/oauth-authorization-server` (con `registration_endpoint`); la forma `/.well-known/oauth-authorization-server/auth/v1` de la tarea da 404 en Kong local. Con la clave nueva, la `ANON_KEY` local cambia y la HS256 vieja ya no sirve en PostgREST: hay que copiar la nueva en `ios/Config.xcconfig` (documentado en `supabase/README.md`).
  - **T2:** rojo de Deno (módulos faltantes) y verde: 46 pruebas (`pesos`, `frases`, herramientas con un doble de `Datos` y el servidor completo con `createMcpHandler`). Prueba 2.1: `registerAppTool` y `registerAppResource` de ext-apps 2.0.4 funcionan con el servidor v2 (`_meta.ui.resourceUri` y `text/html;profile=mcp-app`, también en vivo con un `ui_bundle.ts` de prueba). Las pantallas solo se declaran si `ui_bundle.ts` las trae (hoy vacío). `ledger_balances.net` es positivo cuando la otra persona le debe a esa fila. `scripts/mcp-local.sh` en verde contra local (401 con `WWW-Authenticate`, firma cambiada 401, `tools/list`, ver_cruces «Le debes $20.000 a Jesús», movimientos, parche, anotar con `created_by` de quien conectó, cruce cerrado, monto, lo ajeno y cuenta borrada 401).
  - **Desvíos:** las herramientas usan una frontera `Datos` con un doble en memoria en vez de un cliente de Supabase falso; la validación de anotar va en el manejador (no en el esquema de zod) para devolver los mensajes exactos de la spec; el método es `listGrants` (no `getUserGrants`); la función revisa la sesión con `auth.getUser()` en cada petición, así una cuenta borrada o un acceso quitado reciben 401 de inmediato (no "a más tardar en una hora"). Ese chequeo devolvía 503 con un acceso quitado (auth-js lo convierte en `AuthSessionMissingError` 400): rojo y verde en `acceso_test.ts`, `e5ea2e8`.
  - **T3:** Go en rojo (`undefined: ConsentConfig`, `cfg.SupabaseAnonKey`) y en verde: gofmt, vet, staticcheck y 15 pruebas de `httpapi`. Recorrido sin Claude Code, con un cliente OAuth de prueba registrado por la API y el navegador contra el backend local: correo sin cuenta, código equivocado, "Claude (prueba local) quiere ver…", Permitir → callback con `code`, cambio por un token ES256 y `ver_cruces` con él, ya aprobado → vuelve solo, "Tus conexiones" → Quitar acceso → el MCP da 401 y pide consentimiento otra vez, No permitir → `access_denied`, `authorization_id` inventado → "Esta solicitud ya no sirve…". Sin errores de CSP. Falta 3.3 con Claude Code de verdad y el gasto en el simulador.
  - **5.1/5.2:** trabajo `functions` en `ci.yml` y clave de prueba para el trabajo `supabase`; `actionlint` 1.7.7 sin errores. `scripts/functions-deploy.sh` con `bash -n`, shellcheck y `--dry-run` de testing y prod. Falta la CI en verde en el PR y la revisión de `ui_bundle.ts` (la agrega quien haga las pantallas).
- **L5 (23 nov 2026), escritor de T4, 5.1 (resto) y 5.3:**
  - **4.3 (primero las pruebas):** rojo de Deno (`abrirAnotar` y `partner_color` no existían, `datos.abierto`/`saldo` faltaban en `ver_movimientos`; 10 errores de tipos) y después 2 fallas esperadas mientras `ui_bundle.ts` seguía vacío («Con las pantallas empaquetadas…» y «…no cargan nada de otros dominios»). Verde: 54 pruebas. `abrir_anotar` (solo lectura) devuelve el formulario y el texto «Para anotar un gasto con Jesús necesito…»; cerrado o ajeno, los mensajes de anotar. `ver_cruces` trae `color` (null si la cuenta se borró) y `ver_movimientos` `abierto`, `neto` y `saldo`. Cada pantalla se registra una vez.
  - **4.1:** `ui/` con `@modelcontextprotocol/ext-apps` 2.0.4, `vite` 8.3.8 y `vite-plugin-singlefile` 2.3.4 (fijos, con `package-lock.json`); `npm run build` escribe `ui_bundle.ts` (unos 240 KB por página, casi todo zod y el cliente de MCP Apps). Dos builds seguidos dan el mismo `ui_bundle.ts`, también en Linux con Node 22 (Docker). `deno check` revisa también `ui/src` (usa los tipos de `herramientas.ts`); `deno fmt` y `deno lint` lo incluyen.
  - **4.2:** las tres pantallas en `basic-host` de ext-apps (main, `ea3e9d0`) contra la función local, con un proxy en el scratch que pone el token (basic-host no manda `Authorization`): Tus cruces («Jesús te debe $10.000», «a tu favor», Pedro en «Cerrados»), movimientos, formulario (vacío → «El monto debe ser de $1 a $999.999.999.»; $45.000, Taxi, pagó Jesús, a medias, Transporte → «Gasto anotado» y «Le debes $12.500 a Jesús») y un cruce cerrado («Este cruce está cerrado: ya no acepta gastos.»). Capturas a 390 px (iframe de 356) y a 320 px de iframe; sin errores de CSP. Después de anotar, la pantalla le avisa a Claude con `updateModelContext`.
  - **5.1:** `ci.yml` (`functions`): `deno check index.ts ui/src/*.ts`, `setup-node` 22, `npm ci`, `npm run build` y `git diff --exit-code -- ../ui_bundle.ts`; el filtro nombra también `supabase/functions/mcp/ui/**`. `actionlint` sin errores. Falta verla en verde en GitHub.
  - **5.3:** `CLAUDE.md` (§2 fila del MCP y 553 pgTAP en 22 archivos, §3, §4 «Servidor MCP (Claude)», §6, §8 y la CI), `supabase/README.md` (herramientas, pantallas y cómo regenerar), `backend/README.md` (la app de prod) y `docs/ROADMAP.md` (sección «MCP de Cruce para Claude»).
  - **Pendiente fuera de lo permitido:** `scripts/mcp-local.sh` espera cinco herramientas y ahora hay seis: su revisión de `tools/list` falla (todo lo demás pasa). Una copia en el scratch con la lista nueva y revisiones de las pantallas pasó entera. Falta cambiar esa línea (y, si se quiere, agregar las revisiones de `_meta.ui`).
  - **Ojo:** después de `scripts/mcp-local.sh`, pgTAP `07` y `15` fallan por los @usuario de prueba (`joan9` en vez de `joan`); con `supabase db reset --local`, 553 en verde.
