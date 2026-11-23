# Proposal

## Why

Hoy Cruce dice cuánto se debe y a quién, pero no cómo pagarle: cada vez hay que preguntar "¿a qué Nequi te mando?". Joan aprobó el plan el 18 nov 2026 ("Sí, propónlo"): guardar en el perfil cómo le pagan a cada quien y mostrarlo donde se salda.

## What Changes

- **Dato en el perfil:** "Dos columnas opcionales en `profiles`: `payment_kind`: `nequi` o `llave` (Bre-B). `payment_handle`: el número de Nequi (10 dígitos que empiezan en 3) o la llave, con un máximo de caracteres." Van juntas: o las dos o ninguna.
- **Quién lo ve:** "Solo vos las editás. Las ven las mismas personas que hoy ven tu perfil: tu pareja de cruce y los del parche. Sin sesión, nadie." "`my_cruces` y la lectura de parches lo devuelven."
- **Borrar la cuenta:** "Al borrar la cuenta, el dato se borra con la lápida."
- **Tu perfil:** "Una sección nueva, \"Cómo te pagan\", donde elegís Nequi o llave y escribís el dato. Se puede dejar vacía." Debajo: "Lo ven tus cruces y los del parche, y sale en los tickets."
- **Saldar, en el cruce:** "Saldar, en el cruce: cuando debés, \"Págale a Jesús por Nequi: 300 123 4567\", con un botón para copiar."
- **Para saldar, en el parche:** "\"Para saldar\", en el parche: cada transferencia muestra cómo pagarle a quien recibe."
- **Tickets:** "Ticket personal: quien debe ve a quién y cómo pagarle. El ticket del parche no cambia."
- **Permiso:** llenar el campo basta para que salga en los tickets que se comparten (Joan: "Sí, basta"). No hay un interruptor aparte.
- **Copiar** no suena ni vibra: no es uno de los seis momentos con sonido.

## Capabilities

### New Capabilities
- `como-pagarme`: cómo le pagan a cada persona (Nequi o llave Bre-B): dónde se guarda y se edita, quién lo ve, qué pasa al borrar la cuenta y dónde aparece (Saldar, "Para saldar" y el ticket personal).

### Modified Capabilities

(ninguna: las capacidades de perfil, saldar y tickets no cambian sus requisitos; lo nuevo vive en `como-pagarme`)

## Impact

- Base de datos: una migración aditiva (`20261118110000_como_pagarme.sql`): dos columnas en `profiles` con sus reglas, permiso de edición solo para esas columnas, `my_cruces()` con `partner_payment_kind` y `partner_payment_handle` al final (las de antes no cambian), el campo calculado `participant_payment` para los del parche y `forget_account` que borra el dato.
- Pruebas: `supabase/tests/21_como_pagarme.sql` (pgTAP) y pruebas de Swift Testing en CruceCore.
- App: `PaymentMethod` en CruceCore (validar y mostrar), `Member`, `Profile`, `ParcheParticipant`, la lectura de `my_cruces` y de parches, `SessionStore.updatePaymentMethod`, Tu perfil, Saldar, el detalle del parche y el ticket personal.
- Versiones anteriores de la app: no leen las columnas nuevas y siguen igual.
- Nube: la migración se sube con `scripts/db-push.sh testing` y `prod` (lo hace Joan).
