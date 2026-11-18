# Proposal

## Why

El CP12 pide dos cosas antes de abrir Cruce a más gente: confiar en la cola sin conexión de los movimientos (es la que evita perder o duplicar plata anotada sin señal) y poder usar la app con VoiceOver. La cola ya tiene 11 pruebas, pero no cubren el orden de envío con varios cambios, un corte de red a mitad del envío ni un cruce que se cerró mientras había pendientes. Una revisión de la accesibilidad en el código encontró un switch sin nombre, chips de 34 pt y montos que VoiceOver puede leer como dólares.

## What Changes

- **Pruebas de la cola sin conexión** (solo las que faltaban), con un repositorio falso que anota cada escritura, corta la red después de N escrituras y rechaza un movimiento o un cruce cerrado:
  - lo pendiente llega en el orden en que se anotó (guardar, guardar, eliminar, guardar);
  - si la red se cae a mitad del envío, lo enviado sale de la cola y el resto queda en orden, también en el teléfono;
  - la base rechaza uno de la cola: sale, los demás llegan y al recargar ya no se ve;
  - la otra persona cerró el cruce mientras había pendientes: lo de ese cruce sale de la cola y lo de otro cruce sí llega;
  - editar sin red un gasto que todavía no se envió: se ve la edición y a la base llega la última versión;
  - eliminar sin red un gasto que ya estaba en la base;
  - abrir la app de nuevo sin red y volver la red: la cola guardada llega una sola vez;
  - lo guardado de otra persona se borra del teléfono (una aserción más en la prueba que ya existía).
  No apareció ningún error: el código de `LedgerStore` no cambia.
- **Accesibilidad (sin cambiar el diseño):**
  - los switches de Ajustes ("Cuando alguien anote un gasto", "Sonidos") se leen con su nombre, como interruptor y con su estado, y se activan tocando toda la fila (antes el switch era un botón sin nombre de 30 pt de alto);
  - los chips (categorías, filtros del historial, personas y propina de los parches) se ven de 34 pt pero reciben el toque en 44 pt;
  - los montos principales (saldo del inicio, saldo de cada fila de "Tus cruces", efecto de cada movimiento y el pago de Saldar) se leen en pesos ("20000 pesos", "más 18000 pesos"), como el teclado de montos;
  - la etiqueta "Jesús → tú" del inicio se lee "Jesús te debe" (antes, "Jesús le debe a tú");
  - las flechas y los íconos decorativos que repiten lo que dice el texto ya no se leen.
- **`docs/accesibilidad.md`:** la lista de pasos para recorrer la app con VoiceOver en un iPhone y lo que se corrigió.

## Capabilities

### New Capabilities
- `accesibilidad`: cómo se usa la app con VoiceOver y con el dedo: nombres de los controles, área táctil e íconos decorativos.

### Modified Capabilities
- `presentacion-saldo`: los montos y la dirección de la deuda se oyen bien con VoiceOver.
- `pruebas-logica`: la cola sin conexión tiene pruebas del orden, los cortes de red y los rechazos.

## Impact

- **CruceCore:** solo pruebas (`LedgerQueueTests.swift`, nueva, y una aserción en `LedgerOfflineTests.swift`). Sin cambios en el código.
- **App:** `Controls.swift` (`NeoToggleStyle` y `Chip`), `SpokenAmount.swift` (nuevo, `Money.spoken`), `HomeView`, `MovementRow`, `CruceListView`, `SettleView`, Ajustes, el ticket del parche y el onboarding. Sin dependencias nuevas, sin cambios en la base ni en el backend.
- **Docs:** `docs/accesibilidad.md`.
