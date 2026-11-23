// Si un error de Auth al revisar la sesión quiere decir que la persona ya no tiene acceso (401) o que Auth falló (503).
//
// El token puede tener una firma válida y aun así no servir: la cuenta se borró (Auth ya no encuentra al usuario) o
// el acceso se quitó en "Tus conexiones" (Auth borró la sesión de esa aplicación). auth-js convierte el 403
// session_not_found de Auth en AuthSessionMissingError (400).
export interface ErrorDeAuth {
  name: string;
  status?: number;
  code?: string;
  message: string;
}

const CODIGOS_SIN_ACCESO = new Set(["session_not_found", "user_not_found", "bad_jwt", "no_authorization"]);

export function sinAcceso(error: ErrorDeAuth): boolean {
  if (error.name === "AuthSessionMissingError") return true;
  if (error.code && CODIGOS_SIN_ACCESO.has(error.code)) return true;
  return error.status === 401 || error.status === 403 || error.status === 404;
}
