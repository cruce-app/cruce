# Spec Delta

## Purpose
Un solo tope para todos los montos que se escriben: 9 dígitos, con el teclado de Cruce y con el del sistema.

## MODIFIED Requirements

### Requirement: Captura de montos desde el teclado
El monto escrito en el teclado numérico SHALL convertirse a pesos ignorando cualquier carácter que no sea un dígito y aceptando como máximo 9 dígitos ($999.999.999); los dígitos de más MUST ignorarse. Una entrada vacía MUST equivaler a $0.

#### Scenario: Escribir un monto
- **WHEN** se escribe "6" y luego "000" en el teclado de monto
- **THEN** el monto mostrado es `$6.000`

#### Scenario: Un cero de más
- **WHEN** se pega "$1.000.000.000" en un monto
- **THEN** el monto es `$100.000.000`: solo cuentan los primeros 9 dígitos
