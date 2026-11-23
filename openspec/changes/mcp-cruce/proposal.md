# Proposal

## Why

Joan y Jesús quieren consultar y anotar sus cuentas de Cruce desde Claude ("¿cuánto me debe Jesús?", "anota que pagué
la cena de $60.000 a medias") sin abrir la app. Claude ya conecta servidores MCP remotos y muestra pantallas
interactivas dentro del chat (MCP Apps). Toda la lógica sensible de Cruce vive en Postgres con RLS, así que un servidor
MCP puede ser una capa delgada que actúa como la persona que lo conectó.

Decisiones de Joan (22 nov 2026): "Con anotar gastos"; "TypeScript en Supabase, vamos con eso"; la página de
consentimiento "en Go y Fly".

## What Changes

- **Servidor MCP remoto de Cruce** en una Edge Function de Supabase (TypeScript, Deno), uno por ambiente (local,
  testing y prod), con Streamable HTTP y sin estado.
- **Inicio de sesión con OAuth 2.1 de Supabase Auth**: se activa el servidor OAuth con registro automático de clientes
  (Claude usa "Register automatically"). Cada herramienta corre con el token de la persona, así que RLS decide qué ve
  y qué escribe, igual que en la app.
- **Página de consentimiento** en el backend de Go (`GET /oauth/consent`): entrar con el correo y el código de 6
  dígitos, ver qué aplicación pide acceso y aprobar o rechazar. Supabase no deja servir HTML desde Edge Functions. Una
  página `GET /oauth/conexiones` muestra las aplicaciones conectadas y deja quitarles el acceso.
- **Herramientas de lectura**: tus cruces con su saldo, los movimientos de un cruce, tus parches con su saldo y su
  "Para saldar".
- **Herramienta para anotar un gasto en un cruce abierto**: monto, concepto, quién pagó, reparto, categoría y fecha.
  Es la única que escribe.
- **MCP App**: tres pantallas dentro de Claude con el estilo de Cruce: el saldo de tus cruces, los movimientos de un
  cruce y el formulario para anotar un gasto.
- **Una función nueva en la base** para leer el saldo y el "Para saldar" de un parche como miembro. Las funciones
  actuales (`parche_balances` y `parche_settlement_plan`) no se pueden llamar desde fuera.
- **Prod del backend**: la app de Fly de prod (`cruce-api-prod`) se crea en este cambio, porque la página de
  consentimiento de prod vive ahí.

Fuera de este cambio: editar, borrar y saldar desde Claude, anotar en parches, el directorio público de conectores de
Claude y la página de consentimiento dentro de la app de iOS.

## Capabilities

### New Capabilities
- `conexion-claude`: conectar Claude a una cuenta de Cruce con OAuth (consentimiento, a quién se le da acceso, quitar
  el acceso y que cada ambiente tenga la suya).
- `herramientas-claude`: lo que Claude puede leer y anotar en Cruce y las pantallas que muestra dentro del chat.

### Modified Capabilities
<!-- Ninguna: las reglas de privacidad, movimientos y saldos no cambian; el servidor las usa tal como están. -->

## Impact

- **Código nuevo:** `supabase/functions/mcp/` (servidor, herramientas, formato de pesos y frases portados de
  CruceCore, pruebas de Deno) y `supabase/functions/mcp/ui/` (las pantallas, empaquetadas en un solo HTML cada una).
- **Backend de Go:** dos rutas nuevas con el HTML embebido (`embed`), sin paquetes nuevos. La clave anónima de cada
  ambiente llega por variable de entorno; la `service_role` nunca llega al navegador.
- **Base de datos:** una migración nueva (lectura de un parche para sus miembros) con su prueba pgTAP.
- **Configuración:** `supabase/config.toml` (`[auth.oauth_server]` activo con registro automático, `site_url` local,
  `[functions.mcp] verify_jwt = false`). En testing y prod, Joan activa el servidor OAuth, cambia el Site URL a la URL
  del backend y revisa que las claves de firma sean asimétricas (ES256 o RS256), que exige `@supabase/server`.
- **Dependencias nuevas (para aprobar):** en la función, `npm:@modelcontextprotocol/server@^2`,
  `npm:@supabase/server@1`, `npm:@supabase/middleware@1`, `npm:zod@^4` y `@modelcontextprotocol/ext-apps`; para
  empaquetar las pantallas, `vite` y `vite-plugin-singlefile`; en la página de consentimiento, `@supabase/supabase-js`
  desde un CDN con la versión fija. En la Mac, Deno (`brew install deno`).
- **CI:** un trabajo nuevo `functions` (`deno fmt --check`, `deno lint` y `deno test`) que corre solo si cambia
  `supabase/functions/**`.
- **Costo:** el servidor OAuth de Supabase no se cobra aparte (está en beta); quien conecta Claude cuenta como usuario
  activo del mes. La app de Fly de prod cuesta unos US$2 al mes.
