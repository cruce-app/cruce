# Spec Delta

## ADDED Requirements

### Requirement: Pruebas de la cola sin conexión
La cola de cambios pendientes de un cruce SHALL tener pruebas, con un repositorio falso y sin red real, del orden de envío, de un corte de red a mitad del envío, de un cambio que la base rechaza, de un cruce que se cerró mientras había pendientes, de editar o eliminar sin red y de abrir la app de nuevo con la cola guardada. Cada prueba MUST revisar lo que se ve en pantalla, lo que llega a la base y lo que queda guardado en el teléfono.

#### Scenario: Corte a mitad del envío
- **WHEN** hay tres gastos pendientes y la red se cae después de enviar el primero
- **THEN** el primero está en la base, los otros dos siguen en la cola en el mismo orden (también en el teléfono) y la app sigue sin conexión

#### Scenario: Cruce cerrado con pendientes
- **WHEN** Joan anotó sin red en su cruce con Jesús y en el de Ana, y Jesús desvinculó antes de que volviera la red
- **THEN** al volver la red el gasto del cruce con Ana llega a la base, el del cruce con Jesús sale de la cola y deja de verse, y no queda nada pendiente
