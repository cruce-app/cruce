#!/usr/bin/env bash
# Crea la clave de firma ES256 de Supabase local (supabase/signing_keys.json) si todavía no existe.
# config.toml la necesita para que `supabase start` arranque; el archivo está en .gitignore y nunca se sube.
# Solo toca este archivo local: no habla con la nube. Correrlo otra vez no cambia una clave que ya existe.
set -euo pipefail

cd "$(dirname "$0")/.."
archivo=supabase/signing_keys.json

if [[ -s "$archivo" && "$(tr -d '[:space:]' < "$archivo")" != "[]" ]]; then
  echo "Ya hay una clave en $archivo; no se cambia."
  exit 0
fi

echo '[]' > "$archivo"   # el CLI necesita que el archivo exista
supabase gen signing-key --algorithm ES256 --yes
echo "Clave creada en $archivo. Si Supabase ya estaba prendido: supabase stop && supabase start."
