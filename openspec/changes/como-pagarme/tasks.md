# Tasks

## 1. Base de datos

- [ ] 1.1 pgTAP `21_como_pagarme.sql` (rojo antes de la migración): la dueña guarda y borra su Nequi o llave; Nequi y llave inválidos se rechazan; las dos o ninguna; otro usuario no lo cambia; la pareja lo ve en `my_cruces`; alguien del parche lo ve en `participant_payment`; un extraño no lo ve; `anon` no lo lee; borrar la cuenta lo borra y `my_cruces` devuelve null
- [ ] 1.2 Migración `20261118110000_como_pagarme.sql`: columnas y `check`, permiso de edición, `my_cruces()` con las columnas nuevas al final, `participant_payment` y `forget_account` con la lápida. Se verifica con `supabase db reset --local` y `supabase test db --local` (los 20 archivos de antes siguen en verde)
- [ ] 1.3 `supabase/README.md`: la fila de `21_como_pagarme.sql`

## 2. CruceCore

- [ ] 2.1 `PaymentMethod` (validar, normalizar, mostrar, copiar, VoiceOver y frases) con pruebas de Swift Testing
- [ ] 2.2 `Member`, `Profile` y `ParcheParticipant` con `paymentMethod`; `CruceRemote` y `ParcheRemote` lo leen (con y sin los campos nuevos: lo de antes sigue decodificando); pruebas
- [ ] 2.3 `AccountDirectory.updatePaymentMethod` (y el doble en memoria, que lo borra al borrar la cuenta), `SessionStore.updatePaymentMethod` y `LedgerStore.partnerPaymentMethod` (solo cuando debes); pruebas
- [ ] 2.4 `ParcheTicket`: `paymentLine(for:in:)` para "Para saldar" y `paymentLines` en el ticket personal de quien debe; el del parche sin cambios; pruebas
- [ ] 2.5 `swift test` y `swift format lint --strict` en verde

## 3. App

- [ ] 3.1 `SupabaseAccountDirectory`: leer y guardar `payment_kind` y `payment_handle`
- [ ] 3.2 Tu perfil: sección "Cómo te pagan"
- [ ] 3.3 Saldar: "Págale a … por Nequi: …" con el botón de copiar (sin sonido)
- [ ] 3.4 Detalle del parche ("Para saldar") y ticket personal ("CÓMO PAGAR")
- [ ] 3.5 `-screen` nuevas (`profilePayment`, `settlePayment`, `parchePaymentInfo`, `parcheTicketPayment`) y datos de ejemplo; `xcodegen` y `xcodebuild` de `Cruce`, `Cruce Test` y `Cruce Prod`

## 4. Documentación

- [ ] 4.1 `CLAUDE.md` (§2, §3, §5 y §6) y `docs/ROADMAP.md` (decisión "Cómo pagarle a cada quien")

## 5. Nube y prueba en el teléfono

- [ ] 5.1 Joan sube la migración a testing (`scripts/db-push.sh testing`) y la prueba en "Cruce Test"
- [ ] 5.2 Joan sube la migración a prod (`scripts/db-push.sh prod`)

## Workflow follow-up

- Archivar con `openspec archive como-pagarme` cuando la migración esté en la nube y probada.
