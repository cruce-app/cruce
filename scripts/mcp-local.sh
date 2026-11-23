#!/usr/bin/env bash
# Recorre el servidor MCP de Cruce contra Supabase local, como lo haría Claude después de conectarse:
#
#   scripts/mcp-local.sh
#
# Crea personas de prueba nuevas en cada corrida (correos con la hora, en example.com): Joan, Jesús, Pedro y Ana. Entran
# por la API de Auth con el código de 6 dígitos que atrapa mailpit, igual que la app, y arman el ejemplo canónico:
# Joan paga la cena de $60.000 a medias y Jesús el mercado de $100.000 a medias (Joan le debe $20.000 a Jesús); el
# cruce de Joan con Pedro queda cerrado y Ana no tiene cruces con nadie. Después llama a la función `mcp` con JSON-RPC
# por Streamable HTTP y revisa el 401 sin token, tools/list, ver_cruces, ver_movimientos, ver_parche, anotar_gasto,
# el cruce cerrado, lo ajeno y la cuenta borrada.
#
# Necesita `supabase start` desde la raíz del repo (con mailpit, el runtime de funciones y la clave ES256 de
# supabase/signing_keys.json; ver supabase/README.md). Solo toca la base local.
# ok y falla solo escriben una línea: «prueba && ok … || falla …» no corre los dos.
# shellcheck disable=SC2015
set -euo pipefail

cd "$(dirname "$0")/.."

api="http://127.0.0.1:54321"
mailpit="http://127.0.0.1:54324"
mcp="$api/functions/v1/mcp"

if ! command -v supabase >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
    echo "Error: hacen falta el CLI de Supabase y python3." >&2
    exit 1
fi
anon="$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
if [[ -z "$anon" ]]; then
    echo "Error: Supabase local no está corriendo. Corre 'supabase start' desde la raíz del repo." >&2
    exit 1
fi

fallas=0
ok() { echo "  ok    $1"; }
falla() {
    echo "  FALLA $1" >&2
    fallas=$((fallas + 1))
}
# json <expresión de Python sobre `d`>: lee JSON de la entrada y escribe el resultado.
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

# entrar <correo>: pide el código, lo lee en mailpit y escribe "<access_token> <user_id>".
entrar() {
    local correo="$1" id codigo
    curl -sf -X POST "$api/auth/v1/otp" -H "apikey: $anon" -H 'content-type: application/json' \
        -d "{\"email\":\"$correo\"}" >/dev/null
    for _ in $(seq 1 20); do
        id="$(curl -sf "$mailpit/api/v1/search?query=to:$correo" | json 'd["messages"][0]["ID"] if d["messages"] else ""')"
        [[ -n "$id" ]] && break
        sleep 0.5
    done
    if [[ -z "$id" ]]; then
        echo "Error: no llegó el correo de $correo a mailpit." >&2
        exit 1
    fi
    codigo="$(curl -sf "$mailpit/api/v1/message/$id" | python3 -c \
        'import json,re,sys; print(re.search(r"\b(\d{6})\b", json.load(sys.stdin)["Text"]).group(1))')"
    curl -sf -X POST "$api/auth/v1/verify" -H "apikey: $anon" -H 'content-type: application/json' \
        -d "{\"type\":\"email\",\"email\":\"$correo\",\"token\":\"$codigo\"}" |
        json 'd["access_token"] + " " + d["user"]["id"]'
}

# rest <token> <método> <ruta> [cuerpo]: llama a PostgREST como esa persona.
rest() {
    local token="$1" metodo="$2" ruta="$3" cuerpo="${4:-}" salida estado
    salida="$(curl -s -w '\n%{http_code}' -X "$metodo" "$api/rest/v1/$ruta" -H "apikey: $anon" \
        -H "Authorization: Bearer $token" -H 'content-type: application/json' -H 'Prefer: return=representation' \
        ${cuerpo:+-d "$cuerpo"})"
    estado="${salida##*$'\n'}"
    if [[ "$estado" != 2* ]]; then
        echo "Error: $metodo $ruta respondió $estado: ${salida%$'\n'*}" >&2
        exit 1
    fi
    echo "${salida%$'\n'*}"
}

# mcp_rpc <token> <método> [params]: una petición JSON-RPC a la función; escribe el JSON de la respuesta.
mcp_rpc() {
    local token="$1" metodo="$2" params="${3:-}"
    [[ -n "$params" ]] || params='{}'
    curl -s -X POST "$mcp" -H "Authorization: Bearer $token" -H 'content-type: application/json' \
        -H 'accept: application/json, text/event-stream' -H 'mcp-protocol-version: 2025-06-18' \
        -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$metodo\",\"params\":$params}" |
        python3 -c 'import sys
cuerpo = sys.stdin.read().strip()
if not cuerpo.startswith("{"):
    cuerpo = next(l[5:] for l in cuerpo.splitlines() if l.startswith("data:"))
print(cuerpo)'
}

# texto_de <respuesta de tools/call>: el texto de la herramienta (con "ERROR: " si es un error de herramienta).
texto_de() { json '("ERROR: " if d["result"].get("isError") else "") + d["result"]["content"][0]["text"]'; }

sufijo="$(date +%s)"
echo "Personas de prueba (sufijo $sufijo)…"
read -r joan joan_id < <(entrar "mcp-joan-$sufijo@example.com")
read -r jesus jesus_id < <(entrar "mcp-jesus-$sufijo@example.com")
read -r pedro pedro_id < <(entrar "mcp-pedro-$sufijo@example.com")
read -r ana ana_id < <(entrar "mcp-ana-$sufijo@example.com")
if [[ -z "${joan_id:-}" || -z "${jesus_id:-}" || -z "${pedro_id:-}" || -z "${ana_id:-}" ]]; then
    echo "Error: no se pudo entrar con las personas de prueba." >&2
    exit 1
fi
rest "$joan" POST profiles "{\"id\":\"$joan_id\",\"display_name\":\"Joan\"}" >/dev/null
rest "$jesus" POST profiles "{\"id\":\"$jesus_id\",\"display_name\":\"Jesús\"}" >/dev/null
rest "$pedro" POST profiles "{\"id\":\"$pedro_id\",\"display_name\":\"Pedro\"}" >/dev/null
rest "$ana" POST profiles "{\"id\":\"$ana_id\",\"display_name\":\"Ana\"}" >/dev/null

# Cruce de Joan con Jesús (abierto) y con Pedro (cerrado).
codigo="$(rest "$joan" POST rpc/create_ledger_with_invite '{}' | json 'd')"
rest "$jesus" POST rpc/redeem_invite "{\"p_code\":\"$codigo\"}" >/dev/null
con_jesus="$(rest "$jesus" POST rpc/my_cruces '{}' | json 'd[0]["ledger_id"]')"
codigo="$(rest "$joan" POST rpc/create_ledger_with_invite '{}' | json 'd')"
rest "$pedro" POST rpc/redeem_invite "{\"p_code\":\"$codigo\"}" >/dev/null
con_pedro="$(rest "$pedro" POST rpc/my_cruces '{}' | json 'd[0]["ledger_id"]')"
rest "$joan" POST rpc/close_cruce "{\"p_ledger\":\"$con_pedro\"}" >/dev/null

# El ejemplo canónico.
rest "$joan" POST movements "{\"ledger_id\":\"$con_jesus\",\"payer_id\":\"$joan_id\",\"amount\":60000,\
\"concept\":\"Cena\",\"category\":\"comida\",\"occurred_at\":\"2026-11-20T01:00:00Z\"}" >/dev/null
rest "$jesus" POST movements "{\"ledger_id\":\"$con_jesus\",\"payer_id\":\"$jesus_id\",\"amount\":100000,\
\"concept\":\"Mercado\",\"category\":\"mercado\",\"occurred_at\":\"2026-11-21T15:00:00Z\"}" >/dev/null

# Un parche de Joan y Jesús: Joan pagó $90.000 a medias, así que Jesús le paga $45.000.
parche="$(rest "$joan" POST rpc/create_parche '{"p_name":"Santa Marta","p_display_name":"Joan"}' | json 'd')"
codigo_parche="$(rest "$joan" GET "parches?id=eq.$parche&select=code" | json 'd[0]["code"]')"
rest "$jesus" POST rpc/join_parche "{\"p_code\":\"$codigo_parche\",\"p_display_name\":\"Jesús\"}" >/dev/null
p_joan="$(rest "$joan" GET "parche_participants?parche_id=eq.$parche&user_id=eq.$joan_id&select=id" | json 'd[0]["id"]')"
p_jesus="$(rest "$joan" GET "parche_participants?parche_id=eq.$parche&user_id=eq.$jesus_id&select=id" | json 'd[0]["id"]')"
rest "$joan" POST rpc/save_parche_expense "{\"p_id\":\"$(python3 -c 'import uuid;print(uuid.uuid4())')\",\
\"p_parche_id\":\"$parche\",\"p_concept\":\"Hospedaje\",\"p_base_amount\":90000,\"p_tip_percent\":0,\
\"p_amount\":90000,\"p_spent_on\":\"2026-11-21T20:00:00Z\",\"p_split_method\":\"equal\",\
\"p_payers\":[{\"participant_id\":\"$p_joan\",\"amount\":90000}],\
\"p_shares\":[{\"participant_id\":\"$p_joan\",\"amount\":45000,\"input\":1},\
{\"participant_id\":\"$p_jesus\",\"amount\":45000,\"input\":1}]}" >/dev/null

echo "Servidor MCP ($mcp):"

# 1. Sin token: 401 con WWW-Authenticate hacia los metadatos del recurso protegido.
encabezados="$(curl -s -o /dev/null -D - -X POST "$mcp" -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')"
if grep -q '^HTTP/[0-9.]* 401' <<<"$encabezados" &&
    grep -qi '^www-authenticate: Bearer resource_metadata="[^"]*/functions/v1/mcp/oauth-protected-resource"' <<<"$encabezados"; then
    ok "sin token: 401 con WWW-Authenticate"
else
    falla "sin token no respondió 401 con WWW-Authenticate"
fi
# Un token con la firma cambiada (como uno de otro ambiente, firmado con otra clave): 401.
# (Se cambia un carácter del medio de la firma: el último puede codificar los mismos bytes.)
firma="${joan##*.}"
cambiado="${firma:0:10}$([[ "${firma:10:1}" == A ]] && echo B || echo A)${firma:11}"
estado="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$mcp" -H "Authorization: Bearer ${joan%.*}.$cambiado" \
    -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')"
[[ "$estado" == "401" ]] && ok "token con otra firma: 401" || falla "token con otra firma respondió $estado"
metadatos="$(curl -s "$mcp/oauth-protected-resource")"
if [[ "$(json 'd["authorization_servers"][0]' <<<"$metadatos")" == "$api/auth/v1" ]]; then
    ok "los metadatos nombran el servidor de autorización local"
else
    falla "metadatos inesperados: $metadatos"
fi

# 2. tools/list: cinco herramientas y solo anotar_gasto escribe.
lista="$(mcp_rpc "$joan" tools/list | json \
    '" ".join(sorted(t["name"] + ("=escribe" if not t["annotations"]["readOnlyHint"] else "") for t in d["result"]["tools"]))')"
if [[ "$lista" == "anotar_gasto=escribe ver_cruces ver_movimientos ver_parche ver_parches" ]]; then
    ok "tools/list: $lista"
else
    falla "tools/list: $lista"
fi

# 3. ver_cruces: el ejemplo canónico y el de Pedro cerrado.
cruces="$(mcp_rpc "$joan" tools/call '{"name":"ver_cruces","arguments":{}}' | texto_de)"
if grep -q "Cruce con Jesús (@[a-z0-9._]*), abierto: Le debes \$20.000 a Jesús" <<<"$cruces" &&
    grep -q "Cruce con Pedro (@[a-z0-9._]*), cerrado: Están a paz y salvo" <<<"$cruces"; then
    ok "ver_cruces: «Le debes \$20.000 a Jesús» y el de Pedro cerrado"
else
    falla "ver_cruces: $cruces"
fi

# 4. ver_movimientos: primero el mercado, después la cena; un cruce ajeno no se ve.
movimientos="$(mcp_rpc "$joan" tools/call "{\"name\":\"ver_movimientos\",\"arguments\":{\"cruce_id\":\"$con_jesus\"}}" | texto_de)"
if grep -q "Mercado.*Pagó Jesús, a medias: Joan le debe \$50.000" <<<"$movimientos" &&
    [[ "$(grep -n Mercado <<<"$movimientos" | cut -d: -f1)" -lt "$(grep -n Cena <<<"$movimientos" | cut -d: -f1)" ]]; then
    ok "ver_movimientos: el mercado primero"
else
    falla "ver_movimientos: $movimientos"
fi
ajeno="$(mcp_rpc "$ana" tools/call "{\"name\":\"ver_movimientos\",\"arguments\":{\"cruce_id\":\"$con_jesus\"}}" | texto_de)"
[[ "$ajeno" == "ERROR: No encontré ese cruce." ]] && ok "Ana no ve el cruce de Joan y Jesús" || falla "cruce ajeno: $ajeno"

# 5. ver_parche: el "Para saldar" de la app; quien no es del parche no ve nada.
detalle="$(mcp_rpc "$joan" tools/call "{\"name\":\"ver_parche\",\"arguments\":{\"parche_id\":\"$parche\"}}" | texto_de)"
grep -q "^- Jesús te paga \$45.000$" <<<"$detalle" && ok "ver_parche: «Jesús te paga \$45.000»" || falla "ver_parche: $detalle"
parche_ajeno="$(mcp_rpc "$ana" tools/call "{\"name\":\"ver_parche\",\"arguments\":{\"parche_id\":\"$parche\"}}" | texto_de)"
[[ "$parche_ajeno" == "ERROR: No encontré ese parche." ]] && ok "Ana no ve el parche" || falla "parche ajeno: $parche_ajeno"
parches="$(mcp_rpc "$joan" tools/call '{"name":"ver_parches","arguments":{}}' | texto_de)"
grep -q "Santa Marta · Abierto · 2 personas · Te deben \$45.000" <<<"$parches" && ok "ver_parches" || falla "ver_parches: $parches"

# 6. anotar_gasto: queda a nombre de Joan y responde con el saldo nuevo (−20.000 + 30.000).
anotado="$(mcp_rpc "$joan" tools/call "{\"name\":\"anotar_gasto\",\"arguments\":{\"cruce_id\":\"$con_jesus\",\
\"monto\":60000,\"concepto\":\"Cena con Claude\",\"quien_pago\":\"yo\",\"reparto\":\"a_medias\",\"categoria\":\"comida\"}}" | texto_de)"
if grep -q "Saldo con Jesús: Jesús te debe \$10.000." <<<"$anotado"; then
    ok "anotar_gasto: «Jesús te debe \$10.000»"
else
    falla "anotar_gasto: $anotado"
fi
autor="$(rest "$jesus" GET "movements?ledger_id=eq.$con_jesus&concept=eq.Cena%20con%20Claude&select=created_by,payer_id,split_type" |
    json 'd[0]["created_by"] + " " + d[0]["payer_id"] + " " + d[0]["split_type"] if d else "nada"')"
[[ "$autor" == "$joan_id $joan_id equal" ]] && ok "Jesús ve el gasto, anotado y pagado por Joan" || falla "el gasto en la base: $autor"

# 7. Lo que no se puede anotar.
cerrado="$(mcp_rpc "$joan" tools/call "{\"name\":\"anotar_gasto\",\"arguments\":{\"cruce_id\":\"$con_pedro\",\
\"monto\":10000,\"concepto\":\"Cena\",\"quien_pago\":\"yo\"}}" | texto_de)"
[[ "$cerrado" == "ERROR: Este cruce está cerrado: ya no acepta gastos." ]] && ok "cruce cerrado: no se anota" || falla "cruce cerrado: $cerrado"
grande="$(mcp_rpc "$joan" tools/call "{\"name\":\"anotar_gasto\",\"arguments\":{\"cruce_id\":\"$con_jesus\",\
\"monto\":1500000000,\"concepto\":\"Cena\",\"quien_pago\":\"yo\"}}" | texto_de)"
[[ "$grande" == "ERROR: El monto debe ser de \$1 a \$999.999.999." ]] && ok "monto fuera de rango" || falla "monto: $grande"
ajeno="$(mcp_rpc "$ana" tools/call "{\"name\":\"anotar_gasto\",\"arguments\":{\"cruce_id\":\"$con_jesus\",\
\"monto\":10000,\"concepto\":\"Cena\",\"quien_pago\":\"yo\"}}" | texto_de)"
[[ "$ajeno" == "ERROR: No encontré ese cruce." ]] && ok "Ana no anota en el cruce de Joan y Jesús" || falla "anotar ajeno: $ajeno"
cuantos="$(rest "$jesus" GET "movements?ledger_id=eq.$con_jesus&select=id" | json 'len(d)')"
[[ "$cuantos" == "3" ]] && ok "en el cruce quedan 3 movimientos" || falla "movimientos en el cruce: $cuantos"

# 8. Una cuenta borrada ya no entra, aunque su token siga vigente.
rest "$ana" POST rpc/delete_my_account '{}' >/dev/null
estado="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$mcp" -H "Authorization: Bearer $ana" \
    -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')"
[[ "$estado" == "401" ]] && ok "cuenta borrada: 401" || falla "cuenta borrada respondió $estado"

if ((fallas > 0)); then
    echo "Fallaron $fallas revisiones." >&2
    exit 1
fi
echo "Listo: el servidor MCP local responde como dice la spec."
