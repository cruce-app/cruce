# Tasks

## 1. Base: limpieza diaria

- [ ] 1.1 pgTAP `20_limpiar_invitaciones.sql` (rojo antes de la migración): borra una invitación vencida hace 31 días; conserva una vencida hace un día (y canjearla sigue diciendo `expired`) y una canjeada vieja; borra los intentos de más de un día y conserva los recientes; quien tiene un cruce pendiente con el código borrado recibe uno nuevo para ese cruce y otra persona se une con él; la función no la puede correr `anon` ni `authenticated`; el trabajo `limpiar-invitaciones` está en `cron.job` a las `0 8 * * *`
- [ ] 1.2 Migración `20261118100000_limpiar_invitaciones.sql`: `pg_cron`, `public.cleanup_expired_invites()` y `cron.schedule`. Se verifica con `supabase db reset --local` y `supabase test db --local` (todo en verde)
- [ ] 1.3 `supabase/README.md`: la limpieza diaria y la fila de `20_limpiar_invitaciones.sql` en la tabla de pruebas

## 2. Nube

- [ ] 2.1 Subir la migración a testing (`scripts/db-push.sh testing`) y ver el trabajo `limpiar-invitaciones` en Integrations → Cron
- [ ] 2.2 Al día siguiente, revisar en testing que la última corrida quedó en `succeeded` (`cron.job_run_details`)
- [ ] 2.3 Subir la migración a prod (`scripts/db-push.sh prod`, que respalda antes)

## Workflow follow-up

- Actualizar la sección 2 de `CLAUDE.md` y marcar el CP10 en `docs/ROADMAP.md` (lo hace quien integra el cambio).
- Archivar con `openspec archive limpiar-invitaciones` cuando la migración esté en la nube.
