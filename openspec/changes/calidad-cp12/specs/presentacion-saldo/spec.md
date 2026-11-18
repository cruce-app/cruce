# Spec Delta

## ADDED Requirements

### Requirement: El saldo se oye bien con VoiceOver
Con VoiceOver, los montos principales (el saldo del inicio, el saldo de cada cruce en "Tus cruces", el efecto de cada movimiento y el pago de Saldar) SHALL leerse en pesos, sin el signo `$` ni el punto de los miles, y con "más" o "menos" cuando llevan signo. La dirección de la deuda SHALL oírse como una frase en español correcta, nunca como "le debe a tú".

#### Scenario: Inicio a favor
- **WHEN** Jesús le debe $20.000 a Joan y Joan recorre la tarjeta del saldo con VoiceOver
- **THEN** oye "Jesús te debe", "20000 pesos" (veinte mil pesos) y "Jesús te debe" en lugar de "Jesús → tú"

#### Scenario: Fila de un movimiento a favor del otro
- **WHEN** Joan, con VoiceOver, llega a la fila del mercado de $100.000 que pagó Jesús a medias
- **THEN** oye "menos 50000 pesos" y "a favor de Jesús"
