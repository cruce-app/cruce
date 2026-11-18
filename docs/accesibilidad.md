# Accesibilidad: recorrido con VoiceOver

Lista para probar Cruce con VoiceOver en un iPhone de verdad (Cruce Test). El simulador no sirve: no tiene voz.

## Antes de empezar

- Ajustes del iPhone → Accesibilidad → VoiceOver → activado. Idioma de la voz: español.
- Atajo útil: Ajustes → Accesibilidad → Función rápida → VoiceOver (tres clics en el botón lateral lo prende y lo apaga).
- Gestos: deslizar a la derecha pasa al siguiente elemento, tocar dos veces activa, deslizar con tres dedos hace scroll.
- Ten al menos un cruce con movimientos y un parche.

Anota cualquier cosa que se oiga mal, se repita o no se pueda alcanzar.

## Recorrido

| # | Dónde | Qué hacer | Qué debería decir |
|---|---|---|---|
| 1 | Inicio de un cruce | Recorrer la tarjeta del saldo | La frase ("Jesús te debe"), el monto en pesos ("veinte mil pesos", no "dólares" ni "veinte punto cero") y otra vez "Jesús te debe" (no "Jesús le debe a tú"), y cuántos movimientos |
| 2 | Inicio | Los botones de arriba | "Ajustes del cruce", "Volver" (si hay varios cruces); ninguno dice solo "botón" |
| 3 | Inicio → historial | Una fila de un gasto | Concepto, quién pagó, "menos cincuenta mil pesos" o "más dieciocho mil pesos" y "a favor de Jesús" o "a tu favor"; sin "flecha" |
| 4 | Historial | Un chip de categoría | "Comida, botón"; el elegido dice "seleccionado" y no dice "marca de verificación" |
| 5 | Historial | Tocar un chip justo por encima o por debajo del borde (sin VoiceOver) | Lo elige igual |
| 6 | Nuevo movimiento | La tarjeta amarilla del monto | "Monto", el valor en pesos y que abre el teclado; cada tecla anuncia el monto nuevo |
| 7 | Nuevo movimiento | "Ahora" y "Después de esto" | Las dos frases completas, con quién le debe a quién |
| 8 | Saldar cuentas | La tarjeta del pago | "Tú pagas", el monto en pesos, "Jesús recibe", el antes y el después; sin "flecha" |
| 9 | Tus cruces (con dos o más) | Una fila | Nombre, @usuario, la frase del saldo y el saldo con "más" o "menos" en pesos; un cruce cerrado dice "Cerrado" |
| 10 | Ajustes de la cuenta | El switch "Sonidos" | "Sonidos, interruptor, activado"; tocar dos veces lo cambia. Sin VoiceOver, tocar la palabra "Sonidos" también lo cambia |
| 11 | Ajustes de la cuenta | "Invitar a alguien" y "Cerrar sesión" | Solo el texto y "botón", sin nombrar el ícono ni la flecha |
| 12 | Un parche | El saldo, "Para saldar" y un gasto | Quién le debe a quién en texto; el botón de compartir dice "Compartir y los del parche" |
| 13 | Ticket del parche | "Para saldar" | Cada frase de pago, sin "flecha" |
| 14 | Anotar un gasto del parche (Por consumo) | El botón de la caneca de un ítem | "Quitar el ítem" |
| 15 | Tengo un código | El campo | "Código" y, al escribir, a qué lleva el código |
| 16 | Sin conexión (modo avión) | La pantalla y, en un parche, un gasto sin enviar | "No pudimos sincronizar" y cuántos pendientes; en el parche, "Sin enviar" en la fila |
| 17 | Saldar cuando debes (Jesús llenó su Nequi) y "Para saldar" | La frase de cómo pagarle y "Copiar" | "Págale a Jesús por Nequi: 3 0 0, 1 2 3, 4 5 6 7" (dígito por dígito); el botón dice "Copiar el número de Nequi" (o "Copiar la llave") y después "Copiado", sin sonido ni vibración |

## Lo que se corrigió (cambio `calidad-cp12`)

- **Switches de Ajustes** (`Components/Controls.swift`, `NeoToggleStyle`): el switch era un botón sin nombre de 30 pt de alto, separado de su texto. Ahora toda la fila es el botón, se lee como interruptor con su nombre y su estado, y el área táctil es de al menos 44 pt.
- **Chips** (`Components/Controls.swift`, `Chip`): se ven de 34 pt pero reciben el toque en 44 pt, sin mover el layout. El check del chip elegido ya no se lee (lo dice "seleccionado").
- **Montos en pesos** (`Components/SpokenAmount.swift`, `Money.spoken`): el saldo del inicio, el de cada fila de "Tus cruces", el efecto de cada movimiento y el pago de Saldar se leen "20000 pesos", "más 18000 pesos" o "menos 50000 pesos", igual que el teclado de montos.
- **"Jesús → tú"** (`Screens/Home/HomeView.swift`, `DirectionLabel`): se leía "Jesús le debe a tú"; ahora "Jesús te debe" o "Le debes a Jesús".
- **Íconos decorativos ocultos:** flechas de "abre otra pantalla" e íconos de las acciones en Ajustes, la flecha del pago en Saldar, la flecha de `MovementRow`, las flechas de "Para saldar" en el ticket, la del onboarding y las viñetas de "¿Borrar tu cuenta?".

## Lo que ya estaba bien

Los botones de solo ícono usan `IconButton`, que exige un nombre y tiene al menos 44 pt. Las ilustraciones tienen su descripción o se esconden junto a un texto que dice lo mismo. La dirección de la deuda siempre va en texto, con signo y "a tu favor" o "a favor de…".

## Pendiente

- Los campos de texto de 40 pt de los parches (nombre de un ítem, monto de un ítem, nombre de alguien sin la app y los porcentajes) quedan así por el diseño.
- Los montos de los parches y de los tickets todavía se leen con `$`; si en el paso 12 o 13 suenan como dólares, se pasan a `Money.spoken` igual que los del cruce.
