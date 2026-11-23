// Servidor MCP de Cruce (cambio mcp-cruce): Claude lo llama por Streamable HTTP, sin estado, después de conectarse
// con OAuth 2.1 de Supabase Auth.
//
// - withOAuthProtectedResource responde el descubrimiento (/oauth-protected-resource) sin token y le agrega a cada 401
//   el encabezado WWW-Authenticate que apunta a él.
// - withSupabase({ auth: "user" }) exige un token válido del ambiente (claves asimétricas, JWKS del proyecto) y arma
//   un cliente con ese token: RLS decide qué ve y qué anota, igual que en la app.
// - config.toml pone verify_jwt = false para esta función: el descubrimiento tiene que llegar sin token.
import { pipeline } from "@supabase/middleware";
import { withOAuthProtectedResource, withSupabase } from "@supabase/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { Database } from "./database.types.ts";
import { sinAcceso } from "./acceso.ts";
import { datosSupabase } from "./datos_supabase.ts";
import { crearServidor } from "./servidor.ts";
import { PANTALLAS } from "./ui_bundle.ts";

export default {
  fetch: pipeline(
    [withOAuthProtectedResource(), withSupabase<Database>({ auth: "user" })],
    async (req, { supabase, userClaims }) => {
      // Una cuenta borrada, o un acceso que se quitó en "Tus conexiones", deja de servir aunque el token siga vigente:
      // Auth ya no encuentra al usuario o la sesión. El 401 lleva WWW-Authenticate (withOAuthProtectedResource).
      const { error } = await supabase.auth.getUser();
      if (error) {
        const sinPermiso = sinAcceso(error);
        if (!sinPermiso) console.error("MCP: no se pudo revisar la sesión", error.status, error.message);
        return Response.json({ error: sinPermiso ? "invalid_token" : "temporarily_unavailable" }, {
          status: sinPermiso ? 401 : 503,
        });
      }
      // Con auth: "user", withSupabase siempre deja userClaims; si no, es un 401 como cualquier token inválido.
      if (!userClaims) return Response.json({ error: "invalid_token" }, { status: 401 });
      const miId = userClaims.id;
      const handler = createMcpHandler(
        () => crearServidor(datosSupabase(supabase, miId), { pantallas: PANTALLAS }),
        {
          onerror: (e) => console.error("MCP: la petición falló", e),
        },
      );
      return handler.fetch(req);
    },
  ),
};
