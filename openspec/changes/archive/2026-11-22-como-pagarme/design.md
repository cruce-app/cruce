# Design

## Context

- `profiles` (revisado en `supabase/migrations/`): RLS "perfil propio o de mi pareja de cuenta" deja leer el perfil propio y el de quien comparte un cruce (abierto o cerrado), solo con sesión (`authenticated`). La app escribe con `update` directo solo las columnas con permiso (`grant update (display_name, avatar_color)`, `20261030100000_usuarios.sql`) y la política "editar mi perfil" solo deja la fila propia. `profiles_before_update` rechaza editar una lápida.
- `my_cruces()` (la versión de `20261030100000_usuarios.sql`) es `security invoker` y ya une el perfil de la otra persona.
- Los del parche no comparten perfil por RLS: el @usuario llega por el campo calculado `participant_username(parche_participants)` (`security definer`, solo si quien pregunta es del parche).
- `forget_account` (la versión de `20261117100000_pagos_cuenta_borrada.sql`) deja el perfil como lápida.

## Goals / Non-Goals

**Goals:**
- Guardar Nequi o llave con las reglas en la base (no solo en la app) y mostrarlos solo a quien ya ve el perfil.
- Que las versiones anteriores de la app sigan funcionando sin cambios.

**Non-Goals:**
- Abrir Nequi o un banco desde la app, o generar un QR de Bre-B.
- Más de un medio de pago por persona.
- Un interruptor de privacidad aparte: llenar el campo es el permiso (Joan, 18 nov 2026).

## Decisions

### 1. Dos columnas de texto con `check`, no un enum ni una tabla
`payment_kind text check (payment_kind in ('nequi','llave'))` y `payment_handle text`, con un `check` que exige las dos o ninguna y el formato de cada una (Nequi `^3[0-9]{9}$`; llave de 3 a 40 caracteres sin espacios en blanco). Un `check` es más fácil de ampliar que un enum (`alter type` no corre en una transacción con su uso) y una tabla aparte no aporta nada para un solo dato por persona.

### 2. Se edita con `update` directo, como el nombre y el color
`grant update (payment_kind, payment_handle) on profiles to authenticated`. La política "editar mi perfil" ya limita a la fila propia y `profiles_before_update` a una cuenta vigente. Así no hace falta una función nueva; los errores de formato los evita la app antes de enviar y el `check` es la red de seguridad.

### 3. Quién lo ve, sin abrir los perfiles
- Pareja de cruce: `my_cruces()` agrega `partner_payment_kind` y `partner_payment_handle` al final (se borra y se crea otra vez porque cambia la forma; las columnas de antes no cambian). Si la otra cuenta se borró, `null`.
- Los del parche: un campo calculado nuevo, `participant_payment(parche_participants) returns jsonb` (`{"kind","handle"}` o `null`), `security definer` como `participant_username`: solo si quien pregunta es del parche y el lugar tiene cuenta vigente. Sin permiso para `anon`.
- Alternativa descartada: ampliar la política de `profiles` a los del parche. Abriría también el resto del perfil a gente con quien no se comparte un cruce.

### 4. La lápida borra el dato
`forget_account` se recrea desde su última versión con `payment_kind = null, payment_handle = null` en el paso 4. Nada más cambia.

### 5. En la app, un tipo `PaymentMethod` en CruceCore
Valida y normaliza lo que se escribe (Nequi: quita espacios, guiones, puntos, paréntesis y un `+57`/`57` al principio), da el texto para mostrar ("300 123 4567"), para copiar (solo dígitos), para VoiceOver (dígitos por grupos) y las frases. Lo usan `Member` (la otra persona y quien usa la app), `Profile`, `ParcheParticipant` y `ParcheTicket`. Se decodifica con `decodeIfPresent`: lo guardado en el teléfono y una base sin la migración siguen leyéndose. Un dato que llegue de la base con un formato que la app no reconoce se ignora (no se muestra).

### 6. Frases (supuestos donde Joan no dio el texto)
- Saldar: "Págale a Jesús por Nequi: 300 123 4567" (Joan); con llave, "Págale a Jesús a su llave Bre-B: <llave>" (supuesto).
- "Para saldar" y el ticket personal (los ven terceros): "Nequi de Ana: 300 123 4567" o "Llave Bre-B de Ana: <llave>" (supuesto). En el ticket van en una sección "CÓMO PAGAR", solo en el de quien debe. El texto que acompaña la imagen al compartir no cambia.

### 7. Copiar
`UIPasteboard.general.string` con el número sin espacios (o la llave). No llama a `Feedback`: copiar no es uno de los seis momentos con sonido. El botón dice "Copiar" con ícono, mide al menos 44 pt y su `accessibilityLabel` dice qué copia; al tocarlo cambia a "Copiado".

## Risks / Trade-offs

- [La app nueva pide `participant_payment` y la base aún no lo tiene] → la migración se sube a testing y prod antes de instalar la app nueva, como con `participant_username`.
- [Un dato personal sale en un ticket que se comparte] → solo si la persona lo llenó (decisión de Joan) y el texto de Tu perfil lo avisa.
- [La sesión de una cuenta borrada sigue viva hasta una hora] → `profiles_before_update` ya rechaza editar la lápida.

## Migration Plan

1. `supabase db reset --local` y `supabase test db --local`.
2. Joan sube la migración con `scripts/db-push.sh testing` y la prueba en "Cruce Test"; después `scripts/db-push.sh prod`.
3. Volver atrás: una migración nueva que quite las columnas, el campo calculado y las columnas de `my_cruces()` (las versiones anteriores de la app no las leen).
