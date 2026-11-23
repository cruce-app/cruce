# Tasks

## 1. Base y configuración local

- [x] 1.1 pgTAP `22_mcp_lectura_parches.sql` (rojo antes de la migración): un miembro recibe de `parche_summary` las personas, sus saldos y el mismo "Para saldar" que `parche_settlement_plan`; quien no es del parche, `anon` y una cuenta borrada reciben `null` o un error. Se verifica con `supabase test db --local`
- [x] 1.2 Migración `<fecha>_mcp_lectura_parches.sql` con `public.parche_summary(uuid)` y su permiso solo para `authenticated`. Se verifica con `supabase db reset --local` y `supabase test db --local` en verde (los 21 archivos de antes siguen igual)
- [x] 1.3 `supabase/config.toml`: `[auth.oauth_server] enabled = true` y `allow_dynamic_registration = true`, `site_url = "http://127.0.0.1:8088"` y su redirección, `[functions.mcp] verify_jwt = false` y `signing_keys_path` hacia una clave ES256 fuera de git (`supabase gen signing-key`; el archivo va en `.gitignore`). Se verifica con `curl http://127.0.0.1:54321/.well-known/oauth-authorization-server/auth/v1` (responde con el registro dinámico) y con un token nuevo que dice `alg: ES256`

## 2. Servidor MCP (Edge Function `mcp`)

- [x] 2.1 Prueba inicial: la función con `createMcpHandler` (`@modelcontextprotocol/server@^2`), `@supabase/server` y una herramienta con `_meta.ui` registrada con `@modelcontextprotocol/ext-apps/server`. Si los helpers no sirven con v2, se declara `_meta.ui` a mano (design D2). Se verifica con `supabase functions serve`: sin token, 401 con `WWW-Authenticate`; con token, `tools/list` muestra `_meta.ui.resourceUri`
- [x] 2.2 `pesos.ts` y `frases.ts` con pruebas de Deno que repiten los casos de Swift (ejemplo canónico, $0, U+2212, frases de cruce y de parche). Se verifica con `deno test` en verde
- [x] 2.3 `ver_cruces`: `my_cruces()` + `ledger_balances`, con la frase de la app (primero se confirma desde qué miembro mide el neto la vista). Pruebas con un cliente falso; se verifica también contra local con el ejemplo canónico ("Le debes $20.000 a Jesús" desde Joan)
- [x] 2.4 `ver_movimientos` (vigentes, del más reciente al más antiguo, 20 por defecto y hasta 100) y "No encontré ese cruce." para un cruce ajeno. Pruebas de Deno y contra local
- [x] 2.5 `ver_parches` y `ver_parche` (con `parche_summary`). Pruebas de Deno y, contra local, el "Para saldar" de un parche de ejemplo igual al de la app
- [x] 2.6 `anotar_gasto` (design D7): validación con los mensajes de la spec, reparto por defecto del cruce, cruce cerrado o ajeno, respuesta con el saldo nuevo y anotaciones de escritura. Pruebas de Deno de cada caso y, contra local, un gasto que la app muestra y que `created_by` deja a nombre de quien conectó
- [x] 2.7 `scripts/mcp-local.sh`: entra con un usuario de prueba (código de mailpit), llama a la función con JSON-RPC y revisa el 401, `tools/list`, `ver_cruces`, `anotar_gasto` y el cruce cerrado. Se verifica corriéndolo contra Supabase local en verde

## 3. Página de consentimiento (backend de Go)

- [x] 3.1 Pruebas de Go (rojo primero): `GET /oauth/consent` y `GET /oauth/conexiones` responden HTML con CSP, `Referrer-Policy`, `Cache-Control: no-store`, la URL y la clave anónima del ambiente y nunca la `service_role`; `SUPABASE_ANON_KEY` llega en la configuración. Se verifica con `go test ./...`
- [x] 3.2 Las rutas, la configuración y el HTML/JS embebidos: correo y código (`shouldCreateUser: false`), "<aplicación> quiere ver tus cruces y parches y anotar gastos en tus cruces.", "Permitir"/"No permitir" y los mensajes de la spec (código que no sirve, correo sin cuenta y solicitud vencida); "Tus conexiones" con "Quitar acceso". Se verifica con `gofmt`, `go vet`, `staticcheck` y `go test` en verde
- [ ] 3.3 Recorrido local completo: `claude mcp add --transport http cruce-local http://127.0.0.1:54321/functions/v1/mcp`, autorizar en `http://127.0.0.1:8088/oauth/consent` con el código de mailpit, pedir el saldo, anotar un gasto que aparece en el simulador y quitar el acceso en "Tus conexiones"

## 4. Pantallas (MCP App)

- [x] 4.1 Proyecto `supabase/functions/mcp/ui/` (Vite + `vite-plugin-singlefile`, sin framework) que genera `ui_bundle.ts` con `cruces.html`, `movimientos.html` y `anotar.html`, y los tokens de `DesignSystem/` como variables CSS. Se verifica con `npm run build` y un `ui_bundle.ts` regenerado sin cambios
- [x] 4.2 Las tres pantallas con la clase `App` (`ontoolresult` y `callServerTool`): tarjetas de saldo, lista de movimientos y formulario de anotar con los mismos mensajes de error; sin recursos de otros dominios y bien desde 320 px. Se verifica en `basic-host` de ext-apps contra la función local, con capturas
- [x] 4.3 `ver_cruces`, `ver_movimientos` y una herramienta `abrir_anotar` declaran su pantalla y siguen devolviendo el texto completo. Se verifica con `tools/list` y en `basic-host`

## 5. CI, scripts y documentación

- [ ] 5.1 `.github/workflows/ci.yml`: trabajo `functions` (si cambia `supabase/functions/**` o el propio `ci.yml`) con `deno fmt --check`, `deno lint`, `deno test` y la revisión de que `ui_bundle.ts` está al día. Se verifica con `actionlint` y con la CI en verde en el PR
- [x] 5.2 `scripts/functions-deploy.sh testing|prod` (como `db-push.sh`: prod pide confirmación y no se usa `supabase link` a mano). Se verifica con `bash -n` y con una corrida en seco que imprime el comando
- [x] 5.3 Documentación: `CLAUDE.md` (§2, §3, §4, §6 y §8), `supabase/README.md` (OAuth, claves de firma, la función y su despliegue), `backend/README.md` (rutas y variables nuevas, y la app de prod) y `docs/ROADMAP.md`

## 7. Límite del token de Claude

- [x] 7.1 Migración `20261123100000_limitar_tokens_oauth.sql`: pre-request de PostgREST para tokens con `client_id` (lecturas, anotar gastos, `my_cruces` y `parche_summary`, y sesión viva), trigger de `movements` (solo gastos) y trigger de `auth.users` (sin contraseñas). Se verifica con `23_limitar_tokens_oauth.sql` y con `scripts/mcp-local.sh` usando un token OAuth de verdad
- [x] 7.2 El consentimiento dice "Al permitir, vuelves a <sitio>." y no deja aprobar sin una dirección de regreso válida. Se verifica con `go test` y en el navegador con un cliente registrado como "Claude" que vuelve a `evil.example`

## 6. Nube (con Joan)

- [ ] 6.1 Testing: claves asimétricas en el panel (y la app de iOS sigue entrando), servidor OAuth con registro automático, Site URL `https://cruce-api-testing.fly.dev`, `scripts/db-push.sh testing`, `scripts/functions-deploy.sh testing` y `fly deploy -a cruce-api-testing` con `SUPABASE_ANON_KEY`. Se verifica con el 401 de la función y con la página de consentimiento abierta
- [ ] 6.2 Joan y Jesús conectan Cruce en Claude (web o escritorio) contra testing: ven sus cruces, anotan un gasto que aparece en "Cruce Test", ven las pantallas y quitan el acceso
- [ ] 6.3 Prod: crear `cruce-api-prod` en Fly (secretos y webhook de `movements`), repetir 6.1 contra prod y conectar Claude a la cuenta real

## Workflow follow-up

- Después de 6.3, archivar `mcp-cruce` (crea las specs `conexion-claude` y `herramientas-claude`).
