# Tasks

## 1. Cola sin conexión (CruceCore)

- [x] 1.1 Listar lo que hace la cola (`save`, `delete`, `settle`, `flush`, `load`, `retrySync`, `restore`, `networkChanged`, `reset`, `FileLedgerLocalStore`) y ubicar la prueba que cubre cada cosa en `LedgerOfflineTests`, `LedgerStoreTests` y `PartialSettlementTests`.
- [x] 1.2 Agregar `LedgerQueueTests` con `ScriptedLedgerRepository`: orden de envío, corte de red a mitad del envío, un rechazo en medio de la cola, cruce cerrado con pendientes, editar un pendiente, eliminar sin red un gasto ya enviado y abrir de nuevo con la cola guardada. Agregar a `restoreOtherUserIsIgnored` que lo de otra persona se borra del teléfono. Verificar con `swift test` (las 7 pasan sin cambiar `LedgerStore`: no apareció ningún error).

## 2. Accesibilidad (app)

- [x] 2.1 `NeoToggleStyle`: toda la fila es el botón, con rasgo de interruptor, valor y al menos 44 pt. Verificar compilando y con la captura de `-screen settings` igual al diseño.
- [x] 2.2 `Chip`: área táctil de 44 pt sin cambiar el layout y check decorativo oculto. Verificar con la captura de `-screen history` y `-screen add`.
- [x] 2.3 `Money.spoken` y montos en pesos en el saldo del inicio, "Tus cruces", `MovementRow` y Saldar; "Jesús te debe" en `DirectionLabel`. Verificar compilando.
- [x] 2.4 Esconder flechas e íconos decorativos (Ajustes, Saldar, ticket del parche, onboarding, `MovementRow`, viñetas de borrar la cuenta). Verificar compilando.
- [x] 2.5 `swift format lint --strict` y `xcodebuild` del esquema `Cruce` en verde.

## 3. Documentación

- [x] 3.1 `docs/accesibilidad.md`: pasos para recorrer la app con VoiceOver en un iPhone y la lista de lo corregido.
- [ ] 3.2 Joan recorre la lista con VoiceOver en un iPhone (Cruce Test) y anota lo que se oiga mal.

## Workflow follow-up

- Actualizar la sección 2 de `CLAUDE.md` y el CP12 en `docs/ROADMAP.md`.
- Archivar con `openspec archive calidad-cp12` después del recorrido con VoiceOver.
