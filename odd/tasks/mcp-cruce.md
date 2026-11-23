# MCP de Cruce para Claude
Objetivo: que Joan y Jesús consulten y anoten sus cuentas de Cruce desde Claude, con pantallas dentro del chat. Cambio de OpenSpec `mcp-cruce` (propuesto, sin implementar). Rama prevista: `feat/mcp-cruce`; un PR para el servidor y la conexión, y otro para las pantallas.
Pruebas: pgTAP (`supabase test db --local`, Docker de Kiri en `~/.kiri/bin`), Deno (`deno test` en `supabase/functions/mcp`) y Go (`go test ./...` en `backend`).

## Specs

Las specs completas están en `openspec/changes/mcp-cruce/specs/` (`conexion-claude` y `herramientas-claude`). Diseño en `openspec/changes/mcp-cruce/design.md`.

- **S1 (alcance):** primera versión "Con anotar gastos": leer cruces y saldos, movimientos y parches con su "Para saldar", y anotar un gasto en un cruce abierto. Editar, borrar, saldar y anotar en parches quedan fuera.
- **S2 (servidor):** "TypeScript en Supabase, vamos con eso": Edge Function `mcp` por ambiente, OAuth 2.1 de Supabase Auth con registro automático y RLS con el token de la persona.
- **S3 (consentimiento):** "Sí, en Go y Fly": `GET /oauth/consent` y `GET /oauth/conexiones` en el backend de Go, con la clave anónima y nunca la `service_role`. Prod necesita `cruce-api-prod` en Fly.
- **S4 (pantallas):** MCP App con "saldo, movimientos y formulario para anotar", con el estilo de Cruce y la respuesta completa en texto para los clientes sin pantallas.
- **S6 (límite del token):** "Sí, limitarlo": con el token de una aplicación conectada, la base solo deja leer, anotar gastos y las funciones de lectura de las herramientas; quitar el acceso lo corta de inmediato; el consentimiento dice "Al permitir, vuelves a <sitio>.". Spec: `conexion-claude`, "Claude solo puede lo que dan las herramientas", "Sitio de regreso en el consentimiento" y "Quitar el acceso".
- **S7 (sin contraseñas):** "Sí, bloquearlas": nadie le pone ni le cambia la contraseña a una cuenta, en los tres ambientes. Spec: `conexion-claude`, "Nadie cambia la contraseña".
- **S5 (seguridad):** anotar es la única herramienta que escribe y se declara como tal; validación en el servidor y en la base; quitar el acceso desde "Tus conexiones".

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S2 | delegado (escritor acotado: T1, T2, T3 y 5.1/5.2) | hecho (1.1–1.3) | `d395502`, `3bc1deb` |
| T2 | S1, S2, S5 | delegado (mismo escritor) | hecho (2.1–2.7) | `4678467`, `25303ea`, `3bc1deb`, `e5ea2e8` |
| T3 | S3, S5 | delegado (mismo escritor) | 3.1 y 3.2 hechos; 3.3 a medias (sin Claude Code ni simulador) | `e344d3d` |
| T4 | S4 | delegado (escritor acotado: T4, 5.1 y 5.3) | hecho (4.1–4.3) | `0fd9963`, `402a94d` |
| T5 | S1–S5 | delegados | 5.2 y 5.3 hechos; 5.1 con la revisión de `ui_bundle.ts` y `actionlint` en verde, falta la CI en verde en el PR | `a5099a2`, `402a94d`, commit de docs de L5 |
| T6 | S1–S5 | verificador independiente (Riesgo: ítem 2, auth y permisos) | hecho: B1 y B2 corregidos y rechequeados | `58035a2`, `d942736`, `d51b37b` |
| T8 | S6, S7 | en línea (una unidad: migración, pgTAP y recorrido) | hecho (7.1) | `62907b3` |
| T9 | S6 | en línea (unas 20 líneas) | hecho (7.2) | `c98c910` |
| T10 | S6, S7 | verificador independiente (Riesgo: ítems 1, 2 y 3: `auth.users`, permisos y lo que la base acepta) | pendiente | — |
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
- **L6 (23 nov 2026), verificación independiente:** `4423e70` arregla la lista de herramientas de `scripts/mcp-local.sh` (22/22). El verificador pasó 59/59 pruebas propias, pgTAP 553, Deno 54, Go, Swift 407 y `actionlint`, con dos bloqueos:
  - **B1:** `anotar_gasto` ignoraba `porcentaje_otro` sin `reparto: "porcentaje"` o con «a medias». Arreglado en `58035a2`: sin reparto se anota por porcentaje; con otro reparto se rechaza sin guardar (escenario nuevo en la spec, Deno 56).
  - **B2:** sin `supabase/signing_keys.json`, `supabase start` no arranca. Arreglado en `d942736`: `scripts/llave-local.sh` (idempotente, probado en una copia aparte), usado en CLAUDE.md §4, los README y la CI.
  - **Decisión para Joan (seguridad):** el token OAuth es un token completo de la persona (PostgREST lo acepta para todo lo que la persona puede hacer, hasta que vence, una hora, aunque se quite el acceso) y el registro automático deja que cualquier cliente se llame «Claude». Propuesta: mostrar el host del `redirect_uri` en el consentimiento y un `db_pre_request` que limite los tokens con `client_id` a lecturas, `POST movements` y las funciones de lectura.
- **L7 (23 nov 2026), límite del token:** Joan: "Sí, limitarlo". La sonda local con un cliente registrado como «Claude» que vuelve a `https://evil.example/cb` mostró que el token OAuth editaba el perfil, ponía una contraseña a la cuenta (y se entraba con ella), cerraba las otras sesiones y seguía sirviendo contra PostgREST tras quitar el acceso; cambiar `aud` no lo limita. Joan: "Sí, bloquearlas" (las contraseñas, en toda la cuenta).
  - Supabase Auth le pone una contraseña bcrypt al azar a cada cuenta nueva: el trigger bloquea cambiarla, no tenerla.
  - PostgREST v16 exige `headers` en el DETAIL de `raise sqlstate 'PGRST'`; sin él responde 500 (PGRST121). pgTAP no lo ve: lo vio el recorrido por HTTP.
  - Para aprobar por la API hay que leer antes la solicitud (`GET /oauth/authorizations/{id}`) con la sesión; si no, `authorization not found`.
  - Evidencia: pgTAP 23 en rojo sin la migración (553) y en verde con ella (589); `scripts/mcp-local.sh` con las 11 revisiones nuevas en verde; Go en verde; el consentimiento en el navegador dice «Al permitir, vuelves a evil.example.».
- **L8 (23 nov 2026), verificador de T10:** todo pasó (atajos de ruta, upserts, GET a funciones volátiles, GraphQL, refresh tras quitar el acceso, sesión de la app idéntica a la base de comparación) salvo dos bloqueos, los dos ya presentes antes pero prometidos por la spec nueva:
  - **Realtime:** un token con el acceso quitado seguía recibiendo movimientos nuevos por `postgres_changes` hasta vencer. Arreglo: política restrictiva `movements_oauth_session` (Realtime lee con RLS y los claims del token). pgTAP en rojo (2 en vez de 0) y después en verde.
  - **`/signup` con contraseña:** con un correo sin cuenta, alguien creaba la cuenta con su contraseña (y una sesión, porque `enable_confirmations` estaba apagado) y entraba después de que la dueña se registrara con el código. Arreglo: `forget_new_password` (la contraseña al crear la cuenta se cambia por una al azar) y `enable_confirmations = true`. pgTAP en rojo y después en verde; `scripts/mcp-local.sh` sección 10 en verde. En la nube, "Confirm email" se revisa en 6.1.
  - pgTAP 595 en 23 archivos.
