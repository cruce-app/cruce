# Tasks

## 1. Base: limpieza diaria

- [x] 1.1 pgTAP `20_limpiar_invitaciones.sql` (rojo antes de la migración): borra una invitación vencida hace 31 días; conserva una vencida hace un día (y canjearla sigue diciendo `expired`) y una canjeada vieja; borra los intentos de más de un día y conserva los recientes; quien tiene un cruce pendiente con el código borrado recibe uno nuevo para ese cruce y otra persona se une con él; la función no la puede correr `anon` ni `authenticated`; el trabajo `limpiar-invitaciones` está en `cron.job` a las `0 8 * * *`. Sin la migración fallan las pruebas 1-3, 6, 9 y 13-15 (8 de 15)
- [x] 1.2 Migración `20261118100000_limpiar_invitaciones.sql`: `pg_cron`, `public.cleanup_expired_invites()` y `cron.schedule`. Se verifica con `supabase db reset --local` y `supabase test db --local` (20 archivos, 499 pruebas en verde, 18 nov 2026)
- [x] 1.3 `supabase/README.md`: la limpieza diaria y la fila de `20_limpiar_invitaciones.sql` en la tabla de pruebas

## 2. Nube

- [x] 2.1 Subir la migración a testing (`scripts/db-push.sh testing`) y ver el trabajo `limpiar-invitaciones` en Integrations → Cron (aplicada sin errores el 18 nov 2026; `cron.schedule` crea el trabajo)
- [x] 2.2 Al día siguiente, revisar en testing que la última corrida quedó en `succeeded` (`cron.job_run_details`): del 18 al 22 nov 2026, cinco corridas a las 08:00 UTC, todas `succeeded`
- [x] 2.3 Subir la migración a prod (`scripts/db-push.sh prod`, que respalda antes; aplicada el 18 nov 2026)

## Workflow follow-up

- Actualizar la sección 2 de `CLAUDE.md` y marcar el CP10 en `docs/ROADMAP.md` (lo hace quien integra el cambio).
- Archivar con `openspec archive limpiar-invitaciones` cuando la migración esté en la nube.
