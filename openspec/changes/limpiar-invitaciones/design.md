# Design

## Context

Lo que hay hoy (revisado en `supabase/migrations/`):

- `invites` (`code` como llave, `ledger_id`, `created_by`, `expires_at` a 24 h, `redeemed_by`, `redeemed_at`). `check_invite` (la versión de `20261030100000_usuarios.sql`) distingue "no existe" de "venció" solo porque la fila vencida sigue ahí: si no la encuentra dice `invalid`; si la encuentra y `expires_at <= now()`, dice `expired`.
- `create_ledger_with_invite()` (`20261027065544_vincular_cruces.sql`) busca el cruce pendiente de quien llama con tres condiciones: lo creó esa persona, tiene un solo miembro y **ninguna invitación canjeada** apunta a él. Si lo encuentra, devuelve su código vigente; si no hay vigente (vencido o borrado, da igual), genera otro para ese mismo cruce. Al generar, borra una invitación vencida y sin canjear que tenga el mismo código al azar. Ninguna condición depende de que exista una invitación sin canjear, así que borrar las viejas no cambia qué cruce se reusa.
- `invite_attempts` (`user_id`, `attempted_at`) la escriben `check_invite`, `preview_parche_code`, `join_parche` y `claim_parche_place`; `code_attempts_exhausted()` solo cuenta la última hora.
- No hay ningún trabajo programado en la base. El backend de Go solo recibe webhooks.

## Goals / Non-Goals

**Goals:**
- Que `invites` e `invite_attempts` no crezcan sin límite.
- Que ningún mensaje de "Tengo un código" cambie para un código de los últimos 30 días.

**Non-Goals:**
- Borrar cruces pendientes viejos (un cruce de un solo miembro sin código). Se reusa la próxima vez que esa persona invita, así que no se acumulan: hay a lo sumo uno por persona.
- Limpiar los códigos `PCH-` y `SOY-`: viven en `parches` y `parche_participants`, no vencen.
- Guardar un historial de lo que se borró.

## Decisions

### 1. `pg_cron` en la base, no el backend de Go
La limpieza es un `delete` sobre dos tablas; con `pg_cron` corre dentro de Postgres sin red, sin la llave `service_role` y sin depender de que la máquina de Fly.io esté prendida. Joan lo eligió así el 18 nov 2026.
- Alternativa descartada: un `time.Ticker` en Go con la llave `service_role`. Agrega un secreto y un camino de red para algo que la base hace sola.
- La extensión se crea como dice la guía de Supabase Cron (https://supabase.com/docs/guides/cron/install): `create extension pg_cron with schema pg_catalog`, con `if not exists` para que la migración no falle si ya se activó desde el panel. Se omiten los dos `grant ... to postgres` de la guía: en Supabase el script que corre al crear la extensión ya se los da a `postgres`, y repetirlos deja permisos dependientes que hacen fallar un `create extension if not exists` posterior con "dependent privileges exist" (probado en local).

### 2. Una función interna que hace la limpieza
`public.cleanup_expired_invites()` es `security definer` con `search_path = ''`, sin permiso de ejecución para `public`, `anon` ni `authenticated`. El trabajo de `pg_cron` solo la llama (`select public.cleanup_expired_invites()`), así que la regla vive en un lugar que se puede probar con pgTAP sin esperar al reloj.
- Borra de `invites` donde `redeemed_at is null and expires_at < now() - interval '30 days'`.
- Borra de `invite_attempts` donde `attempted_at < now() - interval '1 day'`.

### 3. Los umbrales: 30 días y un día
- 30 días para las invitaciones: un código se manda por chat y la otra persona puede tardar en abrirlo; un mes cubre ese caso con margen y sigue diciendo "venció".
- Un día para los intentos: el límite mira una hora; un día deja margen para revisar un abuso reciente.

### 4. El trabajo se programa por nombre
`cron.schedule('limpiar-invitaciones', '0 8 * * *', ...)`: según la guía (https://supabase.com/docs/guides/cron/quickstart), programar otra vez con el mismo nombre reemplaza el trabajo, así que correr la migración dos veces (o un `db reset`) no lo duplica. `pg_cron` usa la hora UTC: 08:00 UTC son las 3 a. m. en Bogotá (UTC−5), cuando nadie está invitando.

## Risks / Trade-offs

- [En la nube `pg_cron` no se ha probado en este proyecto] → La migración usa la forma de la guía de Supabase; después de `scripts/db-push.sh testing` se revisa en Integrations → Cron que el trabajo exista y, al día siguiente, que su última corrida quedó en `succeeded` (`cron.job_run_details`).
- [Un código borrado puede volver a salir al azar para otra persona] → Ya pasaba con los vencidos (se reusan al generar). Quien tenga un código de hace más de 30 días ve "no existe" o, con mala suerte, la vista previa de otra persona; la vista previa muestra el nombre y el @usuario antes de unirse.
- [`cron.job_run_details` crece con una fila por día] → Una fila diaria es poco; si llega a pesar, se limpia con otro trabajo.

## Migration Plan

1. Local: `supabase db reset --local` y `supabase test db --local`.
2. Testing: `scripts/db-push.sh testing`; revisar el trabajo en el panel.
3. Prod: `scripts/db-push.sh prod` (respalda antes).
4. Para deshacerlo: `select cron.unschedule('limpiar-invitaciones')` en una migración nueva. No hace falta quitar la extensión.
