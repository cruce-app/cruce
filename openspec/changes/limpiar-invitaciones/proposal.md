# Proposal

## Why

Cada vez que alguien abre "Invitar" y su código `CRZ-` vence, la invitación vieja se queda en `invites` para siempre, y cada código que no sirve deja una fila en `invite_attempts` aunque el límite solo mira la última hora. Las dos tablas crecen sin que nadie las lea. El CP10 pide limpiarlas una vez al día, y Joan aceptó el plan el 18 nov 2026: hacerlo con `pg_cron` dentro de Supabase, no con el backend de Go.

## What Changes

- **Limpieza diaria** con `pg_cron`, a las 08:00 UTC (3 a. m. en Bogotá), que llama a una función interna de la base.
- **Invitaciones:** se borran solo las que vencieron hace más de 30 días y nunca se canjearon. Una vencida hace menos de 30 días se conserva, para que "Tengo un código" siga diciendo "Ese código ya venció" y no "Ese código no existe" con un código reciente.
- **Las canjeadas no se tocan nunca:** son el registro de quién se unió y cuándo, y además marcan qué cruce ya estuvo completo.
- **Intentos fallidos:** se borran las filas de `invite_attempts` de hace más de un día. El límite de 5 por hora solo mira la última hora, así que no cambia.
- **Un cruce pendiente sigue sirviendo:** si a quien invitó le borraron su código viejo, al volver a "Invitar" recibe un código nuevo para ese mismo cruce, como hoy con un código vencido.
- **Fuera de este cambio:** el recordatorio mensual y "Recordarme saldar" esperan al CP9 (push).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities
- `vinculacion`: las invitaciones vencidas hace más de 30 días sin canjear y los intentos fallidos de más de un día se borran una vez al día; las canjeadas y las vencidas recientes se conservan.

## Impact

- Base de datos: una migración nueva y aditiva (`20261118100000_limpiar_invitaciones.sql`) que activa la extensión `pg_cron`, crea `public.cleanup_expired_invites()` (sin permiso de ejecución para `anon` ni `authenticated`) y programa el trabajo `limpiar-invitaciones` en `cron.job`.
- Pruebas: `supabase/tests/20_limpiar_invitaciones.sql` (pgTAP).
- App y backend de Go: sin cambios. Las versiones anteriores de la app no notan nada: un código borrado tenía más de 30 días vencido y ya no servía.
- Nube: la migración se sube a testing y a prod con `scripts/db-push.sh`; en la nube hay que confirmar que el trabajo aparece en Integrations → Cron.
