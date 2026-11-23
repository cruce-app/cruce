# Cruce · Supabase

Base de datos, inicio de sesión y tiempo real.

## Qué hay en la migración inicial

- **Tablas:** `profiles`, `ledgers` (la cuenta compartida), `ledger_members` (máximo 2 por cuenta; una persona puede estar en varias, una por pareja), `movements`, `invites` e `invite_attempts` (intentos fallidos de canje, solo para el límite).
- **Montos:** `bigint` en pesos enteros. `owed_by_other` se calcula sola: lo que quien no pagó le debe a quien pagó.
- **Saldo:** la vista `ledger_balances` suma los movimientos. `net > 0` significa que el otro le debe a ese usuario.
- **Regla de colores:** quien crea la cuenta queda con recibo `rosa` y avatar amarillo; quien se une, con `verde` y violeta.
- **Seguridad:** RLS en todas las tablas; cada persona solo ve las cuentas de las que es miembro.
- **Funciones para la app:**
  - `create_ledger_with_invite()` → crea la cuenta y devuelve un código tipo `CRZ-4821` (vence en 24 h).
  - `redeem_invite(p_code)` → une a la segunda persona. Devuelve `{"ok": true, "ledger_id": …, "inviter_name": …}` o `{"ok": false, "error": "invalid" | "own" | "too_many_attempts" | "already_linked", "message": …}`; máximo 5 intentos fallidos por hora.
  - Desde `20261027065544_vincular_cruces.sql` (CP4):
    - **Un cruce por pareja:** el trigger `ledger_members_one_cruce_per_pair` rechaza a dos personas que ya comparten un cruce ("Ya tienen un cruce entre los dos", `23505`), y las funciones lo avisan antes con `already_linked` ("Ya tienes un cruce con Joan"), sin contarlo como intento fallido.
    - `create_ledger_with_invite()` devuelve el código del **único cruce pendiente** de quien llama; si venció, genera otro para ese mismo cruce. Abrir la pantalla de invitar varias veces no crea cuentas vacías.
    - `preview_invite(p_code)` → `{"ok": true, "inviter_name": "Joan"}` o el mismo error que daría canjearlo. No une a nadie; los códigos inválidos cuentan para el límite de intentos.
    - `my_cruces()` → los cruces completos de quien llama (con quién, y colores y recibo de cada lado), del que se completó más recientemente al más viejo. Respeta RLS.
- **Eliminar** es un borrado suave (`deleted_at`), para poder avisarle al otro.
- **Limpieza diaria** (`20261118100000_limpiar_invitaciones.sql`, CP10): el trabajo `limpiar-invitaciones` de `pg_cron` corre todos los días a las 08:00 UTC (3 a. m. en Bogotá) y llama a `cleanup_expired_invites()`, que borra las invitaciones vencidas hace más de 30 días sin canjear y los intentos fallidos de más de un día. Las canjeadas y las vencidas recientes se conservan (así un código reciente sigue diciendo "venció" y no "no existe"). En la nube se ve en Integrations → Cron; las corridas quedan en `cron.job_run_details`.
- **Tiempo real** activado para `movements`.

## Aplicar

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`) y Docker Desktop abierto:

```bash
scripts/llave-local.sh   # una vez por Mac: la clave de firma local (ver "MCP de Cruce" abajo)
supabase start           # base local con Docker (la primera vez descarga varias imágenes)
supabase db reset        # aplica las migraciones en local
supabase test db         # corre las pruebas de supabase/tests
```

`config.toml` ya está en el repo; no hace falta `supabase init`.

## Ambientes

| Ambiente | Dónde | Identificador del proyecto |
|---|---|---|
| local | Docker (`supabase start`) | — |
| testing | Nube, Oregon | `pqdjiecynyjnianslikp` |
| prod | Nube | `xykjqysqfgsfqgslieds` |

- Los identificadores de los proyectos están en `supabase/ambientes.env` (versionado: no son secretos). Los scripts los leen con `scripts/lib/ambiente.sh`.
- Los scripts vinculan el proyecto del ambiente que nombras en cada corrida. **No uses `supabase link` y `supabase db push` a mano**: el vínculo guardado en `supabase/.temp` no dice a qué ambiente apunta.
- Las migraciones llegan siempre primero a testing y después a prod.

```bash
scripts/db-push.sh testing      # muestra las migraciones pendientes y las aplica en testing
scripts/db-push.sh prod         # pide escribir "prod", respalda prod y después aplica
scripts/backup-db.sh testing    # respaldo en backups/<fecha>_<hora>_testing/
scripts/backup-db.sh --local    # respaldo de la base local
```

Cada proyecto tiene su propia contraseña de la base: la pide el CLI, o la lee de `SUPABASE_DB_PASSWORD`. Antes, una sola vez, `supabase login`.

**Proyectos pausados:** en el plan gratis, Supabase pausa un proyecto tras una semana sin uso. Si testing no responde, reactívalo desde el panel (Project → Restore). Tarda unos minutos.

**Correo con el código:** El plan gratis de Supabase no deja editar la plantilla con su correo por defecto (que además trae un enlace, no el código), así que cada proyecto necesita SMTP propio.

1. **SMTP propio** (Authentication → Emails → SMTP Settings → Enable custom SMTP). Testing usa una cuenta de Gmail solo para Cruce con una contraseña de aplicación: host `smtp.gmail.com`, puerto `587`, usuario y remitente = la dirección completa, nombre `Cruce`. La contraseña la escribe el dueño en el panel; nunca va en el repo. Gmail permite unos 500 correos al día; con SMTP propio el límite de Supabase sube a 30 por hora y ya no está restringido a miembros de la organización.
2. **Plantilla:** pega `supabase/templates/codigo.html` en "Magic link or OTP" y en "Confirm signup" (pestaña Source), con el asunto `Tu código para entrar a Cruce`. Para copiarla sin dañar las tildes: `LANG=en_US.UTF-8 pbcopy < supabase/templates/codigo.html` (en Nushell: `with-env {LANG: "en_US.UTF-8"} { open --raw supabase/templates/codigo.html | pbcopy }`). El preview del panel muestra `{{ .Token }}` sin reemplazar; es normal.
3. **Email OTP Length** en `6` (Authentication → Sign In / Providers → Email).

### Crear prod (antes de la primera versión en TestFlight)

1. En el panel de Supabase, crea el proyecto `cruce-prod` en la misma organización y región que testing, y guarda la contraseña de la base en tu gestor de contraseñas.
2. Llena `PROD_PROJECT_REF` en `supabase/ambientes.env` con su identificador y súbelo en un commit.
3. `scripts/db-push.sh prod` para aplicar las migraciones (el primer respaldo sale vacío de datos).
4. Configura el SMTP propio y la plantilla del correo (ver arriba). Para prod conviene un proveedor transaccional (por ejemplo Resend) con un dominio propio verificado, en vez de Gmail.
5. En `ios/Config.xcconfig`, llena `SUPABASE_URL[config=Release]` con `https:/$()/<ref>.supabase.co` y `SUPABASE_ANON_KEY[config=Release]` con la clave anon de `supabase projects api-keys --project-ref <ref>`.
6. Compila el esquema `Cruce Prod` y entra con tu correo.

## MCP de Cruce: OAuth y la función `mcp`

Claude se conecta a Cruce con el servidor MCP de `supabase/functions/mcp/` (cambio `mcp-cruce`). Cada herramienta corre con el token de la persona que aprobó el acceso, así que RLS decide qué ve y qué anota, igual que en la app.

**El límite del token de Claude** (`20261123100000_limitar_tokens_oauth.sql`). Ese token es una sesión completa de la persona, así que la base lo limita: con `client_id`, PostgREST solo deja leer, anotar gastos en `movements` y llamar a `my_cruces` y `parche_summary`; quitar el acceso borra la sesión y el token deja de servir de inmediato; nadie le puede poner ni cambiar la contraseña a una cuenta (Cruce no las usa), y la contraseña con la que nace una cuenta se cambia por una al azar. Realtime también deja de mandarle movimientos al quitarle el acceso. En cada proyecto de la nube, "Confirm email" y "Secure email change" tienen que estar activos (Authentication → Sign In / Providers → Email), como `enable_confirmations` en local. `scripts/mcp-local.sh` lo prueba con un token OAuth de verdad.

**Clave de firma en local (una sola vez por Mac).** `@supabase/server` solo acepta tokens firmados con una clave asimétrica (ES256 o RS256), y `config.toml` la lee de `supabase/signing_keys.json`, que está en `.gitignore` y nunca se sube. Sin el archivo, `supabase start` no arranca. Desde la raíz del repo:

```bash
scripts/llave-local.sh                                 # crea el archivo con una clave ES256 (si ya hay una, no la cambia)
supabase stop && supabase start                        # Auth y PostgREST firman y verifican con ella
```

- Con la clave nueva, la `ANON_KEY` de `supabase status -o env` cambia (ahora es ES256) y la anterior (HS256) ya no sirve en PostgREST. Copia la nueva en `SUPABASE_ANON_KEY[config=Debug]` de `ios/Config.xcconfig`.
- Para revisar: un token nuevo (`/auth/v1/verify`) dice `"alg":"ES256"` en su encabezado, y `curl http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` muestra la clave pública.

**Servidor OAuth en local** (ya está en `config.toml`): `[auth.oauth_server]` activo con registro automático de clientes (`allow_dynamic_registration`, Claude usa "Register automatically") y la página de consentimiento en `site_url` + `/oauth/consent`, con `site_url = "http://127.0.0.1:8088"` (el backend de Go). `[functions.mcp] verify_jwt = false` deja pasar el descubrimiento sin token; la función revisa el token ella misma.

- Metadatos del servidor de autorización: `curl http://127.0.0.1:54321/auth/v1/.well-known/oauth-authorization-server` (trae `registration_endpoint`). En local, la forma con la ruta al final (`/.well-known/oauth-authorization-server/auth/v1`) responde 404 en Kong; la de arriba y `/auth/v1/.well-known/openid-configuration` sí responden.
- Metadatos del recurso protegido: `curl http://127.0.0.1:54321/functions/v1/mcp/oauth-protected-resource`.

**La función `mcp`.** La sirve `supabase start` en `http://127.0.0.1:54321/functions/v1/mcp` (Streamable HTTP, sin estado). Sin token responde 401 con `WWW-Authenticate: Bearer resource_metadata="…"`. Herramientas: `ver_cruces`, `ver_movimientos`, `ver_parches`, `ver_parche`, `abrir_anotar` (las cinco de solo lectura) y `anotar_gasto` (la única que escribe). `ver_cruces`, `ver_movimientos` y `abrir_anotar` declaran su pantalla de MCP Apps (`ui://cruce/cruces.html`, `movimientos.html` y `anotar.html`); todas devuelven también el texto completo. Con una cuenta borrada o un acceso quitado, responde 401 aunque el token siga vigente.

```bash
cd supabase/functions/mcp && deno fmt --check && deno lint && deno test   # pesos, frases y herramientas, sin base
scripts/mcp-local.sh                                                      # recorrido contra Supabase local (mailpit)
```

- **Las pantallas** están en `supabase/functions/mcp/ui/` (Vite y `vite-plugin-singlefile`, sin framework, con los tokens de `ios/Cruce/DesignSystem/` como variables CSS). Si cambias algo ahí, vuelve a empaquetar y sube `ui_bundle.ts` con el cambio: `cd supabase/functions/mcp/ui && npm ci && npm run build`. La CI revisa que el build no lo cambie.

- Si cambias el esquema de la base, regenera los tipos: `supabase gen types typescript --local > supabase/functions/mcp/database.types.ts`.
- El runtime local a veces no toma un cambio de la función de inmediato; `docker restart supabase_edge_runtime_cruce` lo fuerza.
- Para desplegarla en la nube: `scripts/functions-deploy.sh testing` (o `prod`, que pide confirmación). Antes, en el panel de ese proyecto: claves de firma asimétricas (JWT Keys), el servidor OAuth con registro automático (Authentication → OAuth Server) y el Site URL del backend de ese ambiente (`https://cruce-api-testing.fly.dev`).

## Pruebas

Son pruebas [pgTAP](https://pgtap.org) en `supabase/tests/`. Cada archivo corre en una transacción que se deshace al final, así que no dejan datos.

| Archivo | Qué prueba |
|---|---|
| `01_saldo.sql` | `owed_by_other` con cada reparto y el redondeo; el ejemplo canónico en `ledger_balances`; un borrado no cuenta |
| `02_reglas.sql` | Máximo dos personas, quien paga es miembro, saldar es "todo es del otro" |
| `03_vinculacion.sql` | `create_ledger_with_invite` y `redeem_invite`: formato, colores, vencimiento, códigos usados, propios e inexistentes, límite de 5 intentos fallidos por hora |
| `04_rls.sql` | Un tercero no ve ni escribe nada ajeno; nadie anota a nombre de otro ni se agrega como miembro directamente |
| `05_rls_endurecido.sql` | Las políticas son solo para `authenticated`, usan `(select auth.uid())` y tienen sus índices; sin sesión no se ve nada |
| `06_parches.sql` | Parches: crear, unirse, sin la app, repartos, pagos, reclamar lugar, cerrar, pasar al cruce y RLS |
| `07_vincular_cruces.sql` | Un solo cruce pendiente por persona, vista previa del código, el nombre al unirse, un cruce por pareja (también directo en la tabla), cruces con personas distintas, `my_cruces` (también con RLS) y el límite de intentos con la vista previa |
| `08_movimientos.sql` | Movimientos desde la app (rol `authenticated`): los dos del cruce editan y eliminan (borrado suave), nadie anota a nombre de otro, un tercero no ve ni toca nada (ni poniendo de pagador a un miembro) y guardar dos veces el mismo `id` deja una sola fila |
| `20_limpiar_invitaciones.sql` | La limpieza diaria: borra las invitaciones vencidas hace más de 30 días y los intentos de más de un día; conserva las vencidas recientes (siguen diciendo `expired`) y las canjeadas; quien tiene un cruce pendiente recibe un código nuevo para ese cruce; nadie la corre desde la app; el trabajo está en `cron.job` |
| `21_como_pagarme.sql` | Cómo te pagan (Nequi o llave Bre-B): cada quien guarda y borra el suyo; Nequi y llave inválidos y uno sin el otro se rechazan; nadie más lo cambia; la pareja lo ve en `my_cruces` y los del parche en `participant_payment`; un extraño y `anon` no lo ven; al borrar la cuenta se borra |
| `22_mcp_lectura_parches.sql` | `parche_summary` para el MCP: quien es del parche ve a las personas, su saldo y el mismo "Para saldar" de `parche_settlement_plan`; quien no es del parche y un parche que no existe dan `null`; sin sesión, `anon` y una cuenta borrada no leen nada |

Para actuar como una persona, las pruebas usan `set local role authenticated` y fijan `request.jwt.claims` con su `sub`, que es lo que lee `auth.uid()`.

## Pendiente para el punto 2

- Activar **Sign in with Apple** en Authentication → Providers.
- Configurar el Database Webhook hacia el backend de Go.
