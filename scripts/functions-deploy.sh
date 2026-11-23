#!/usr/bin/env bash
# Despliega la función `mcp` (el servidor MCP de Cruce) en un ambiente de la nube.
#
#   scripts/functions-deploy.sh testing             despliega en testing
#   scripts/functions-deploy.sh prod                pide escribir "prod" y después despliega
#   scripts/functions-deploy.sh --dry-run testing   solo muestra el comando, sin desplegar
#
# El identificador del proyecto sale de supabase/ambientes.env y va en --project-ref: el script no usa
# `supabase link` ni confía en el último vínculo. config.toml pone verify_jwt = false para la función (el
# descubrimiento de OAuth llega sin token); de todos modos se pasa --no-verify-jwt para que no dependa de eso.
# Antes, una sola vez, `supabase login`. Las funciones llegan primero a testing y después a prod.
set -euo pipefail

usage() {
    echo "Uso: scripts/functions-deploy.sh [--dry-run] <testing|prod>" >&2
}

dry_run=false
env=""
for arg in "$@"; do
    case "$arg" in
        --dry-run) dry_run=true ;;
        -h | --help)
            usage
            exit 0
            ;;
        testing | prod)
            if [[ -n "$env" ]]; then
                usage
                exit 2
            fi
            env="$arg"
            ;;
        *)
            usage
            exit 2
            ;;
    esac
done
if [[ -z "$env" ]]; then
    usage
    exit 2
fi

# Siempre desde la raíz del repo, para que el CLI encuentre supabase/.
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib/ambiente.sh
source scripts/lib/ambiente.sh

ref="$(project_ref_for "$env")"
comando=(supabase functions deploy mcp --project-ref "$ref" --no-verify-jwt --use-api)

echo "Ambiente: $env (proyecto $ref)."
if [[ "$dry_run" == true ]]; then
    echo "En seco, no se despliega nada. El comando sería:"
    echo "  ${comando[*]}"
    exit 0
fi

if ! command -v supabase >/dev/null 2>&1; then
    echo "Error: no está el CLI de Supabase. Instálalo con: brew install supabase/tap/supabase" >&2
    exit 1
fi

if [[ "$env" == "prod" ]]; then
    read -r -p "Vas a cambiar el servidor MCP de PROD. Escribe prod para seguir: " answer
    if [[ "$answer" != "prod" ]]; then
        echo "Cancelado: no se desplegó nada." >&2
        exit 1
    fi
fi

"${comando[@]}"
echo "Listo: la función mcp quedó en $env: https://$ref.supabase.co/functions/v1/mcp"
