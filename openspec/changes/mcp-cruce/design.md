# Design

## Context

El motivo y el alcance están en `proposal.md`, y el comportamiento en las specs `conexion-claude` y
`herramientas-claude`. Estas son las restricciones que dan forma a la solución:

- **La lógica vive en Postgres con RLS.** Los movimientos se leen y se escriben directo en `movements` (la política
  "crear movimientos en mis cuentas", el trigger `movements_open_cruce` que rechaza un cruce cerrado con
  `hint = 'cruceClosed'` y `created_by default auth.uid()`). Los cruces salen de `my_cruces()` y el saldo de cada
  cruce, de la vista `ledger_balances`. En cambio, `parche_balances` y `parche_settlement_plan` existen pero están
  revocadas para `authenticated`.
- **Supabase Edge Functions no sirven HTML:** una respuesta `text/html` llega como `text/plain`. El servidor MCP solo
  habla JSON, así que sí puede vivir ahí, pero la página de consentimiento no.
- **El servidor OAuth 2.1 de Supabase Auth está en beta** y en todos los planes. La página de consentimiento la arma
  uno: Supabase redirige a `site_url + authorization_url_path` con `?authorization_id=…`, y la página usa
  `supabase.auth.oauth.getAuthorizationDetails`, `approveAuthorization` y `denyAuthorization`, que devuelven
  `redirect_url`. Solo hay scopes estándar (`openid`, `email`, `profile`, `phone`), no scopes propios.
- **`@supabase/server` exige claves de firma asimétricas** (ES256 o RS256) y rechaza los tokens HS256.
- **Claude** se conecta desde la nube de Anthropic por HTTPS en el puerto 443, registra el callback
  `https://claude.ai/api/mcp/auth_callback` y, con Supabase, usa la opción "Register automatically". Supabase no
  menciona soporte de Client ID Metadata Documents.
- **El backend de Go** usa solo la librería estándar, tiene una máquina siempre prendida en Fly (`cruce-api-testing`)
  y hoy solo recibe webhooks. Prod todavía no tiene app de Fly.
- **En la Mac hay Node 25 pero no Deno**; el Supabase CLI es 2.122, y la guía de Supabase pide 2.117 o más.

## Goals / Non-Goals

**Goals:**
- Una sola función `mcp` por ambiente con todas las herramientas y las pantallas.
- Cero lógica de saldo nueva: el saldo de un cruce sale de la base y la frase se arma igual que en CruceCore.
- Que nada del servidor tenga más permisos que la persona: sin `service_role` en la función ni en la página.

**Non-Goals:**
- Escribir en parches, editar, borrar o saldar desde Claude.
- Scopes finos (por ejemplo, "solo lectura"): Supabase no los tiene.
- Publicar en el directorio de conectores de Claude.
- Una web de Cruce más allá de las dos páginas de OAuth.

## Decisions

### D1. Servidor MCP en una Edge Function `mcp`, sin estado
`supabase/functions/mcp/index.ts` sigue la guía oficial de Supabase:
- `createMcpHandler` de `npm:@modelcontextprotocol/server@^2`, que arma un `McpServer` por petición sobre Streamable
  HTTP.
- `pipeline([withOAuthProtectedResource(), withSupabase<Database>({ auth: 'user' })], handler)`, con
  `npm:@supabase/middleware@1` y `npm:@supabase/server@1` (1.6.0 o más).
- `withSupabase` le da a cada herramienta un cliente con el token del usuario, así que RLS aplica.
- `[functions.mcp] verify_jwt = false` en `config.toml`, para que el descubrimiento (`/oauth-protected-resource`)
  llegue sin token.

*Alternativa descartada:* todo en Go en Fly. El SDK de Go no tiene el lado del servidor de OAuth ni el de MCP Apps
tan resueltos, y las pantallas igual son HTML y JS (decisión de Joan).

### D2. MCP Apps sobre el mismo servidor
- Las herramientas con pantalla declaran `_meta.ui.resourceUri` (`ui://cruce/cruces.html`, `ui://cruce/movimientos.html`
  y `ui://cruce/anotar.html`), y los recursos se registran con el tipo `RESOURCE_MIME_TYPE` de
  `@modelcontextprotocol/ext-apps/server` (`registerAppTool` y `registerAppResource`).
- La documentación de ext-apps usa el `McpServer` de `@modelcontextprotocol/sdk` (v1), y la guía de Supabase usa
  `@modelcontextprotocol/server` (v2). La tarea 2.1 prueba primero que los helpers funcionen con v2. Si no funcionan,
  se declaran a mano `_meta.ui` y el tipo del recurso, que es solo metadata del protocolo.

### D3. Pantallas en TypeScript sin framework, empaquetadas en un solo HTML
- `supabase/functions/mcp/ui/` es un proyecto de Vite con `vite-plugin-singlefile`: tres páginas, cada una con su JS
  y su CSS adentro. Usa la clase `App` de `@modelcontextprotocol/ext-apps` (`connect`, `ontoolresult` y
  `callServerTool`).
- El build escribe `supabase/functions/mcp/ui_bundle.ts`, que exporta cada HTML como texto. Ese archivo se versiona,
  para que la función no dependa de leer archivos al desplegarse, y la CI revisa que esté al día.
- Los colores, bordes y sombras se copian de `ios/Cruce/DesignSystem/` como variables CSS.
- No se cargan fuentes externas: el CSP no deja otros dominios. Se usa una pila de fuentes del sistema en negrita, y
  embeber Archivo queda como pregunta abierta.
- *Alternativa descartada:* React. Son tres pantallas pequeñas y React suma peso y dependencias.

### D4. Página de consentimiento y "Tus conexiones" en el backend de Go
- Dos rutas nuevas, `GET /oauth/consent` y `GET /oauth/conexiones`, con HTML, CSS y JS embebidos con `embed`.
- La configuración pública (`SUPABASE_URL` y `SUPABASE_ANON_KEY`) va en un `<script>` armado con `html/template`
  desde variables de entorno nuevas. La `service_role` que ya tiene el backend no se toca.
- El JS del navegador usa `@supabase/supabase-js` desde jsDelivr con la versión fija y con SRI:
  - entra con `signInWithOtp({ email, options: { shouldCreateUser: false } })` y `verifyOtp`, con el mismo código de
    6 dígitos que la app;
  - con sesión, llama a `getAuthorizationDetails` y después a `approveAuthorization` o `denyAuthorization`;
  - en "Tus conexiones", lista con `getUserGrants` y quita con `revokeGrant`.
- **Encabezados:** CSP (`script-src 'self' cdn.jsdelivr.net`, `connect-src` solo el Supabase del ambiente y
  `frame-ancestors 'none'`), `Referrer-Policy: no-referrer` y `Cache-Control: no-store`.
- **`shouldCreateUser: false`:** con un correo sin cuenta, la página dice "Ese correo no tiene cuenta en Cruce. Créala
  primero en la app." Así no aparecen cuentas sin perfil.
- *Alternativa descartada:* GitHub Pages, que es gratis y estático. Joan eligió Go y Fly.

### D5. Lectura de un parche con una función nueva
- La migración `<fecha>_mcp_lectura_parches.sql` crea `public.parche_summary(p_parche uuid) returns jsonb`
  (`security definer`, `search_path = ''`).
- Exige sesión viva (`require_session()`) y `is_parche_member(p_parche)`; si no, devuelve `null`, como un parche que no
  existe.
- Devuelve las personas (id, nombre, si son "tú" y su saldo) desde `parche_balances` y las transferencias desde
  `parche_settlement_plan`, así el "Para saldar" es el mismo de la app.
- Se da permiso solo a `authenticated`, con su prueba pgTAP (`22_mcp_lectura_parches.sql`).
- La lista de parches sale de `parches` con RLS, como la lee la app.

### D6. Pesos y frases portados de CruceCore
- `pesos.ts` y `frases.ts` reproducen `Money.format` (el punto de miles y el signo menos U+2212), la frase del cruce
  (`LedgerStore.phrase`) y las del parche (`ParcheBalanceCard`, `ParcheTicket.phrase`).
- Las pruebas de Deno repiten los casos de las pruebas de Swift (el ejemplo canónico, $0, montos grandes) para que no
  se separen.
- El saldo neto de un cruce sale de `ledger_balances`; la tarea 2.3 confirma desde qué miembro mide el neto la vista
  antes de armar la frase.

### D7. Anotar un gasto
1. Valida la entrada con zod: monto entero de 1 a 999.999.999, concepto de 1 a 80 después de quitar espacios,
   categoría, reparto y fecha. Lo inválido se devuelve como error de herramienta con el mensaje de la spec.
2. Busca el cruce en `my_cruces()`. Si no está, responde "No encontré ese cruce."; si está cerrado, "Este cruce está
   cerrado: ya no acepta gastos.". De ahí sale también el reparto por defecto.
3. Inserta en `movements` con el cliente del usuario:
   - `id` es `crypto.randomUUID()` y `kind = 'expense'`;
   - el reparto va como `equal`/50, `percentage`/n o `full_other`/100;
   - `occurred_at` es ahora, o el mediodía de Bogotá de la fecha pedida;
   - `created_by` lo pone la base.
4. Si la base responde `hint = 'cruceClosed'` (se cerró entre la lectura y la escritura), devuelve el mismo mensaje.
5. Devuelve el gasto y la frase del saldo nuevo, leída otra vez de la base.

La herramienta lleva `readOnlyHint: false` y `destructiveHint: false`; las de lectura, `readOnlyHint: true`.

### D8. Ambientes y despliegue
- **URLs:** la función está en `http://127.0.0.1:54321/functions/v1/mcp` (local) y en
  `https://<ref>.supabase.co/functions/v1/mcp` (testing y prod).
- **Despliegue:** `scripts/functions-deploy.sh testing|prod` despliega como `scripts/db-push.sh`; prod pide confirmación
  y nadie corre `supabase link` a mano. Lo corre Joan.
- **`site_url`:** local, `http://127.0.0.1:8088` (el backend local); testing, `https://cruce-api-testing.fly.dev`;
  prod, `https://cruce-api-prod.fly.dev`. Hoy se usa solo para redirecciones; los correos mandan el código, no un
  enlace.
- **Claves de firma:** en local se generan con `supabase gen signing-key` en un archivo fuera de git
  (`signing_keys_path`). En testing y prod, Joan pasa el proyecto a claves asimétricas en el panel (JWT Keys). La
  clave HS256 heredada sigue verificando las sesiones de la app mientras rota.

### D9. Pruebas
- **Deno** (`deno test`): pesos, frases, validación de anotar, el mapeo del reparto y de la categoría, y cada
  herramienta con un cliente de Supabase falso.
- **pgTAP:** `parche_summary` y el límite de los tokens (`23_limitar_tokens_oauth.sql`).
- **Go** (`go test`): las dos rutas devuelven HTML con CSP, la configuración pública y nunca la `service_role`.
- **Recorrido local** (`scripts/mcp-local.sh`): entra con un usuario de prueba por la API (código de mailpit), llama a
  la función con JSON-RPC y revisa el 401 sin token, `tools/list`, `ver_cruces` y `anotar_gasto` (también en un cruce
  cerrado). Al final conecta un cliente OAuth de verdad y revisa el límite del token y quitar el acceso.
- **A mano:** Claude Code contra local (`claude mcp add --transport http …`, que admite el callback en loopback), el
  servidor de ejemplo `basic-host` de ext-apps para las pantallas, y Claude web y escritorio contra testing.

### D10. Límite del token de una aplicación conectada
El token que Supabase Auth emite por OAuth es una sesión completa de la persona (con el claim `client_id`): probado en
local, sirve para editar el perfil por PostgREST, para ponerle una contraseña a la cuenta y entrar con ella, y sigue
sirviendo contra PostgREST después de quitar el acceso. Cambiar `aud` con el custom access token hook no lo limita:
Auth, PostgREST y la función lo aceptan igual. Por eso, en la base (`20261123100000_limitar_tokens_oauth.sql`):
- **Pre-request de PostgREST** (`oauth_request_guard`, en `pgrst.db_pre_request`): con `client_id`, solo GET, HEAD,
  POST a `movements` y a `rpc/my_cruces` y `rpc/parche_summary`; y la sesión del token tiene que existir en
  `auth.sessions`. Responde 403 (`appNotAllowed`) o 401 (`accessRevoked`). Sin `client_id` no hace nada.
- **Trigger en `movements`** (`movements_oauth_guard`): con `client_id`, solo se insertan gastos (ni pagos, ni
  ediciones, ni borrados; también cubre un upsert).
- **Política restrictiva de lectura en `movements`** (`movements_oauth_session`): Realtime no pasa por la
  pre-request, lee con RLS y los claims del token; con `client_id` y la sesión borrada no ve nada. `movements` es la
  única tabla de la publicación `supabase_realtime`; si se agrega otra, necesita la misma política.
- **Trigger en `auth.users`** (`block_password_change`): nadie cambia `encrypted_password` (Joan: "Sí, bloquearlas").
  Supabase Auth escribe esa tabla con su propio rol, sin los claims del token, así que el bloqueo es para todas las
  cuentas. Supabase Auth le pone una contraseña al azar a cada cuenta nueva: crear la cuenta sigue igual.
- **Contraseña al nacer** (`forget_new_password`): la contraseña con la que se crea una cuenta se cambia por una al
  azar. Con `/signup` alguien podía crear la cuenta de otra persona con su propia contraseña y entrar cuando ella se
  registrara con el código. Junto con "Confirm email" activo (`enable_confirmations = true`), `/signup` tampoco
  entrega una sesión antes de que la dueña del correo lo confirme.
- **Consentimiento:** "Al permitir, vuelves a <sitio>." con el host de `redirect_uri`; sin uno válido, la solicitud no
  se aprueba.

Alternativas descartadas: un rol de Postgres propio con el custom access token hook (no limita Supabase Auth, que es
por donde se pone la contraseña) y el hook de verificación de contraseña (no está en el plan gratis).

## Risks / Trade-offs

- **[El servidor OAuth de Supabase está en beta y puede cambiar]** → Versiones fijas, todo probado en testing antes
  de prod y la documentación en `supabase/README.md`.
- **[Prompt injection: un texto que Claude lea le pide anotar]** → Anotar es la única escritura, se declara como tal
  (Claude pide confirmación), se valida en el servidor y en la base, y no hay borrar ni editar.
- **[Un reintento de Claude anota dos veces]** → Se acepta. El gasto se ve y se borra desde la app.
- **[El token de OAuth es una sesión completa]** → D10. Lo que queda sin cubrir: otras rutas de Supabase Auth (cerrar
  las otras sesiones, cambiar `user_metadata`, que la app no lee, pedir un cambio de correo, que con "Secure email
  change" también tiene que confirmar el correo de antes, y registrar MFA si se activa TOTP en la nube).
- **["Confirm email" en la nube]** → Si está apagado en testing o prod, `/signup` entrega una sesión a quien registre
  un correo ajeno. Se revisa en la tarea 6.1.
- **[Sin contraseñas para nadie]** → Si algún día se quiere entrar con contraseña, se quita el trigger con una
  migración nueva.
- **[El registro automático deja que cualquier cliente se registre]** → La página siempre pide aprobar y muestra el
  nombre del cliente, y "Tus conexiones" deja quitarle el acceso.
- **[Pasar testing y prod a claves asimétricas]** → Supabase rota sin cortar las sesiones. Se hace primero en testing
  y se prueba la app de iOS antes de prod.
- **[Los saldos, nombres y Nequi pasan por Anthropic]** → Es la decisión de conectar. Solo se devuelve lo necesario
  y nunca correos.
- **[ext-apps con el SDK v2]** → La tarea 2.1 lo prueba primero; si falla, se declara `_meta.ui` a mano.
- **[Las pantallas dependen del cliente]** → Toda herramienta con pantalla también devuelve el texto completo.

## Migration Plan

1. **Local:** configuración, migración, función y backend; pruebas y recorrido local.
2. **Testing** (lo hace Joan, guiado):
   - claves asimétricas;
   - servidor OAuth con registro automático;
   - Site URL `https://cruce-api-testing.fly.dev` y redirección permitida;
   - `scripts/db-push.sh testing`, `scripts/functions-deploy.sh testing` y `fly deploy -a cruce-api-testing` con las
     variables nuevas;
   - agregar el conector en Claude y probar.
3. **Prod:** crear `cruce-api-prod` en Fly (secretos y webhook) y repetir el paso 2 contra prod.

**Vuelta atrás:** quitar el conector en Claude, borrar la función (`supabase functions delete mcp`) y desactivar el
servidor OAuth. La migración solo agrega una función, y las rutas nuevas del backend no tocan el webhook.

## Open Questions

- ¿Se embebe la fuente Archivo en las pantallas (unos 50 KB en base64), o basta la fuente del sistema? No cambia las
  specs.
- ¿Claude para iOS y Android muestra las pantallas de MCP Apps? Si no, el texto alcanza, y se verifica al probar en
  testing.
