# Design

## Context

La cola sin conexión vive en `LedgerStore` (CruceCore) y ya se prueba con `FailingLedgerRepository`, que solo sabe "sin red" o "con red". La app ya tenía mucho trabajo de accesibilidad (etiquetas en `IconButton`, `DirectionLabel`, montos del teclado con `AmountEntry.spokenValue`), así que la revisión buscó lo que faltaba y no rehízo lo que ya estaba. Ver proposal.md para el porqué.

## Goals / Non-Goals

**Goals:**
- Probar los casos de la cola que no tenían prueba, por la interfaz pública de `LedgerStore`.
- Corregir lo que la revisión encontró sin mover nada del diseño.

**Non-Goals:**
- Escuchar VoiceOver de verdad: eso queda en la lista de `docs/accesibilidad.md` para Joan, en un iPhone.
- Leer en pesos todos los montos de la app: solo los principales del cruce. Los de parches y tickets quedan para después si el recorrido con VoiceOver muestra que se oyen mal.
- Cambiar los campos de texto de 40 pt de los parches (ítems, nombre de alguien sin la app): crecer cambiaría el diseño.

## Decisions

- **Un repositorio falso con guion (`ScriptedLedgerRepository`) en vez de ampliar `FailingLedgerRepository`.** Anota cada escritura que llega, corta la red después de N escrituras y rechaza por movimiento o por cruce. Ampliar el que ya existía obligaba a tocar las 11 pruebas que lo usan. Vive en el archivo de pruebas nuevo.
- **Área táctil de 44 pt sin cambiar el dibujo.** En `Chip`, un relleno vertical transparente agranda la forma que recibe el toque (`contentShape`) y un relleno negativo igual devuelve el tamaño original al layout: el chip se ve de 34 pt y las filas no se mueven. Alternativa descartada: `frame(minHeight: 44)`, que separa más las filas de chips.
- **El switch es toda la fila.** `NeoToggleStyle` envuelve el texto y el switch en un solo botón, con el rasgo de interruptor (`isToggle`, iOS 17) y el valor "Activado" o "Desactivado". Antes, VoiceOver leía el texto por un lado y un botón sin nombre por otro.
- **Montos en pesos con la misma regla del teclado.** `Money.spoken` (en la app) usa `AmountEntry.spokenValue`: dígitos sin puntos y "pesos", con "más" o "menos" si el monto lleva signo. Así VoiceOver no depende de cómo lea el `$` y el punto según el idioma del teléfono. Se pone como `accessibilityLabel` del texto del monto; las vistas que combinan sus hijos lo usan solo.
- **`DirectionLabel` acepta la frase hablada.** El inicio le pasa "Jesús te debe" o "Le debes a Jesús"; sin ella sigue diciendo "Jesús le debe a Ana".

## Risks / Trade-offs

- [El área táctil ampliada de los chips dentro de un `ScrollView` horizontal puede quedar recortada por el borde del scroll] → El relleno es de 5 pt arriba y abajo y las filas ya tienen 2 pt de margen; queda como paso en la lista de prueba en el teléfono.
- [Que VoiceOver lea "20000 pesos" como "veinte mil pesos" depende de la voz en español] → Es la misma regla que ya usa el teclado de montos, probada así; queda en la lista para confirmarlo.
