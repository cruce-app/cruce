# Spec Delta

## Purpose
Que cualquier persona pueda usar Cruce con VoiceOver y con el dedo: cada control dice qué hace, se alcanza con un toque cómodo y lo decorativo no estorba.

## ADDED Requirements

### Requirement: Cada control tiene nombre
Todo botón cuyo contenido sea solo un ícono SHALL tener un nombre en español que diga lo que hace ("Volver", "Ajustes del cruce", "Quitar el ítem"). Los switches SHALL leerse con su texto, como interruptor y con su estado ("Activado" o "Desactivado").

#### Scenario: Switch de sonidos
- **WHEN** Joan, con VoiceOver, llega al switch de "Sonidos" en Ajustes
- **THEN** VoiceOver dice "Sonidos", que es un interruptor y si está activado o desactivado, y tocar dos veces lo cambia

### Requirement: Área táctil de 44 pt
Todo control que se toca SHALL recibir el toque en un área de al menos 44 × 44 pt, aunque se dibuje más pequeño para respetar el diseño. Los campos de texto de 40 pt de los parches son la excepción conocida.

#### Scenario: Chip de categoría
- **WHEN** Joan toca justo por encima del borde de un chip de categoría de 34 pt
- **THEN** el chip queda elegido

#### Scenario: Switch por su texto
- **WHEN** Joan toca el texto "Sonidos" en Ajustes
- **THEN** el switch cambia, igual que si tocara el switch

### Requirement: Lo decorativo no se lee
Las flechas e íconos que repiten lo que ya dice el texto al lado (la flecha de "abre otra pantalla", la flecha de un pago, el ícono de una acción de Ajustes, el check de un chip elegido) MUST NOT leerse con VoiceOver. Las ilustraciones SHALL tener su descripción, o esconderse si al lado hay un texto que dice lo mismo.

#### Scenario: Fila de Ajustes
- **WHEN** Joan, con VoiceOver, llega a "Invitar a alguien"
- **THEN** VoiceOver dice "Invitar a alguien, botón", sin nombrar el ícono ni la flecha
