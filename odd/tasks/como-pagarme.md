# Cómo pagarme (Nequi o llave en el perfil)
Objetivo: que quien debe sepa cómo pagarle a cada quien. Rama `feat/como-pagarme` (worktree `../cruce-worktrees/como-pagarme`), un PR. Cambio de OpenSpec `como-pagarme`.
Pruebas: pgTAP (`supabase test db --local`, Docker de Kiri en `~/.kiri/bin`) y Swift Testing (`swift test` en `ios/Packages/CruceCore`).

## Specs

- **S1 (dato):** dos columnas opcionales en `profiles`: `payment_kind` (`nequi` o `llave`, Bre-B) y `payment_handle` (el número o la llave). Las dos van juntas: o ambas o ninguna. Nequi: 10 dígitos que empiezan en 3 (se guarda sin espacios y se muestra "300 123 4567"). Llave: texto sin espacios al principio ni al final, con un máximo de caracteres (supuesto: de 3 a 40).
- **S2 (quién lo ve):** "Solo vos las editás. Las ven las mismas personas que hoy ven tu perfil: tu pareja de cruce y los del parche. Sin sesión, nadie." `my_cruces` y la lectura de parches lo devuelven. Quien está sin la app no tiene este dato.
- **S3 (borrar la cuenta):** "Al borrar la cuenta, el dato se borra con la lápida."
- **S4 (Tu perfil):** una sección "Cómo te pagan" (Nequi o llave), opcional, con el texto "Lo ven tus cruces y los del parche, y sale en los tickets." Llenar el campo basta como permiso para que salga en los tickets (decisión de Joan, 18 nov 2026: "Sí, basta").
- **S5 (Saldar, en el cruce):** cuando debes, "Págale a Jesús por Nequi: 300 123 4567", con un botón para copiar. Solo si la otra persona lo llenó.
- **S6 (Para saldar, en el parche):** cada transferencia muestra cómo pagarle a quien recibe, si lo llenó.
- **S7 (ticket personal):** el ticket de quien debe muestra a quién y cómo pagarle. El ticket del parche no cambia.
- **S8 (sin sonido):** copiar no suena ni vibra (solo seis momentos llevan sonido).

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1–S8 | delegada (un escritor, por el respaldo de contexto: la sesión principal ya es larga) | hecha; en testing y prod, probada en "Cruce Test" | `bd059b4` (base), `52212a6` (CruceCore), `66f5a63` (app), docs en el commit siguiente |
| T2 | S1–S8 | verificador independiente (Risk: item 2, dato personal y RLS) | hecha; sin bloqueos | — |

## Log

- **L1 (18 nov 2026), Joan:** "Sí, propónlo" (plan: Nequi o llave en el perfil, en Saldar, en "Para saldar" y en el ticket personal) y, sobre si llenar el campo basta como permiso para los tickets, "Sí, basta".
- **L2 (18 nov 2026), escritor de T1:** cambio de OpenSpec `como-pagarme` (capacidad nueva `como-pagarme`, sin archivar).
  - RED: `supabase test db --local` con `21_como_pagarme.sql` antes de la migración: 0 de 38 (la columna `payment_kind` no existe); los 20 archivos de antes, 499 en verde. `swift build --build-tests` antes de implementar: no compila (`PaymentMethod` no existe, `MockParches.withPayments` no existe).
  - GREEN: `supabase db reset --local` y `supabase test db --local`: 21 archivos, 537 pruebas en verde. `swift test`: 407 pruebas en 40 suites. `swift format lint --strict`: sin errores. `xcodebuild` de `Cruce`, `Cruce Test` y `Cruce Prod` (simulador genérico): BUILD SUCCEEDED. `openspec validate --all --strict`: 32 de 32.
  - Supuestos (marcados en la spec): llave de 3 a 40 caracteres sin espacios (se quitan los de los extremos); con llave, Saldar dice "Págale a Jesús a su llave Bre-B: …"; en "Para saldar" y el ticket, "Nequi de Ana: 300 123 4567" o "Llave Bre-B de Ana: …"; el texto que acompaña la imagen del ticket no cambia; un Nequi se puede escribir con espacios, guiones, puntos, paréntesis o +57.
  - Siguiente: T2 (verificador) y, después, Joan sube la migración con `scripts/db-push.sh testing` y `prod`.
- **L3 (18 nov 2026), verificador de T2:** S1 a S8 pasan, sin bloqueos. Probó con SQL dentro de `begin … rollback`: un desconocido no lo ve por `profiles`, `my_cruces()` ni `participant_payment` (tampoco con filas falsas); `anon` no ve nada; nadie edita el de otro; borrar la cuenta lo deja en null. `my_cruces()` conserva sus 15 columnas y sus permisos. `supabase test db --local`: 537 en verde; `swift test`: 407 en verde. Avisos: la pareja de un cruce cerrado lo sigue viendo (igual que el resto del perfil hoy); una cuenta borrada con la sesión viva (hasta una hora) puede leer el de su expareja por `my_cruces()` (ya pasaba con el nombre); emojis compuestos cuentan distinto en la app y en la base; el teléfono lo guarda en la caché como los nombres.
- **L4 (18 nov 2026):** PR #4 fusionado en main (`9c3f24b`; la CI falló una vez por una caída de GitHub y pasó al volver a correrla). Joan subió `20261118110000_como_pagarme.sql` a testing y a prod con `scripts/db-push.sh` ("Listo, ya quedó en prod"). Falta: probarlo en "Cruce Test" (tarea 5.1) y archivar `como-pagarme`.
- **L5 (22 nov 2026), Joan:** "Listo probamos en cruce test y funciono perfecto". Tarea 5.1 hecha; cambio archivado en `openspec/changes/archive/2026-11-22-como-pagarme` (spec nueva `openspec/specs/como-pagarme`). Feature cerrada.
