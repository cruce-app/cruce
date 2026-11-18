# movimientos Specification

## Purpose
Registrar los gastos y pagos entre las dos personas, con los datos necesarios para calcular el saldo y mostrar el historial.

## Requirements

### Requirement: Datos de un movimiento
Cada movimiento SHALL registrar quién pagó, el monto, el concepto, la fecha, la categoría, el reparto y quién lo anotó. Un movimiento es un gasto o un pago para saldar.

#### Scenario: Guardar un gasto
- **WHEN** Joan anota "Prueba" por $6.000, pagado por él, a medias, en Comida
- **THEN** se confirma "¡Gasto guardado!" con `+$3.000 a tu favor` y el saldo antes y después del gasto

### Requirement: Categorías
La categoría de un movimiento SHALL ser una de: Comida, Mercado, Transporte, Hogar, Ocio, Préstamo u Otro.

#### Scenario: Filtrar el historial por categoría
- **WHEN** se elige una categoría en el historial
- **THEN** solo se listan los movimientos de esa categoría

### Requirement: Historial agrupado por día
El historial SHALL listar los movimientos del más reciente al más antiguo, agrupados por día, y permitir filtrar por quién pagó y por categoría.

#### Scenario: Movimientos de hoy y de ayer
- **WHEN** hay movimientos de hoy y de ayer
- **THEN** aparecen bajo los encabezados "HOY · …" y "AYER · …"

### Requirement: Eliminar un movimiento
Eliminar un movimiento SHALL pedir confirmación, mostrando cómo queda el saldo si se elimina. Un movimiento eliminado MUST dejar de contar en el saldo. Eliminar SHALL ser un borrado suave: el movimiento se conserva marcado con el momento en que se eliminó y MUST NOT volver a aparecer en el inicio, el historial ni el detalle, ni poder editarse.

#### Scenario: Confirmar la eliminación
- **WHEN** se elimina un gasto de $6.000 a medias pagado por Joan
- **THEN** el saldo de Joan baja $3.000 y el movimiento desaparece del historial

#### Scenario: El movimiento eliminado se conserva marcado
- **WHEN** se elimina un movimiento y luego se vuelven a cargar los movimientos de la cuenta
- **THEN** el movimiento sigue registrado con la fecha y hora en que se eliminó, y no aparece en el inicio ni en el historial

#### Scenario: Eliminar el único movimiento
- **WHEN** la cuenta tiene un solo movimiento y se elimina
- **THEN** el inicio muestra el estado vacío, igual que una cuenta sin movimientos

### Requirement: Quien paga pertenece a la cuenta
El pagador de un movimiento MUST ser uno de los dos miembros de la cuenta.

#### Scenario: Pagador ajeno
- **WHEN** se intenta registrar un movimiento cuyo pagador no es miembro de la cuenta
- **THEN** la operación falla con "Quien pagó no pertenece a esta cuenta"

### Requirement: Un movimiento no cambia de cuenta ni de autor
Al editar un movimiento, su cuenta, quién lo anotó y cuándo se anotó MUST NOT cambiar. Sacar un gasto de la vista del otro solo es posible con el borrado suave, que deja aviso.

#### Scenario: Mover un gasto a otra cuenta
- **WHEN** Joan intenta pasar un gasto de su cuenta con Jesús a otra cuenta
- **THEN** la operación falla y el gasto sigue visible para Jesús

### Requirement: Eliminar deslizando en el historial
En el historial, deslizar una fila hacia la izquierda SHALL mostrar "Eliminar". Tocarlo SHALL abrir la misma confirmación que eliminar desde el detalle, con cómo queda el saldo, y solo al confirmar se elimina (borrado suave). En un cruce cerrado el historial MUST NOT ofrecer eliminar.

#### Scenario: Eliminar un gasto desde el historial
- **WHEN** Joan desliza la fila de un gasto de $6.000 a medias que pagó él, toca "Eliminar" y confirma
- **THEN** el gasto desaparece del historial y el saldo de Joan baja $3.000

#### Scenario: Cancelar
- **WHEN** Joan desliza una fila, toca "Eliminar" y luego cancela
- **THEN** el movimiento sigue en el historial

### Requirement: Los movimientos se guardan en la nube
Anotar, editar, eliminar (borrado suave) y saldar SHALL guardarse en la base de datos del cruce abierto. Al recargar, la otra persona del cruce SHALL ver los mismos movimientos y el mismo saldo. Los movimientos MUST seguir ahí después de cerrar y abrir la app.

#### Scenario: Joan anota y Jesús recarga
- **WHEN** Joan anota una cena de $60.000 a medias en su cruce con Jesús, y Jesús recarga su inicio
- **THEN** Jesús ve la cena y "Le debes $30.000 a Joan", y Joan ve "Jesús te debe $30.000"

#### Scenario: Cerrar y abrir la app
- **WHEN** Joan anota un gasto, cierra la app y la vuelve a abrir
- **THEN** el gasto sigue en su historial

#### Scenario: Eliminar se ve en los dos
- **WHEN** Jesús elimina un gasto que anotó Joan y Joan recarga
- **THEN** el gasto ya no cuenta en el saldo de ninguno de los dos

### Requirement: Recargar los movimientos
El inicio de un cruce y "Tus cruces" SHALL recargar los movimientos al deslizar hacia abajo. La app SHALL recargarlos también al volver al primer plano.

#### Scenario: Deslizar para recargar
- **WHEN** Jesús desliza hacia abajo en su inicio después de que Joan anotó un gasto
- **THEN** el gasto aparece y el saldo se actualiza

### Requirement: Guardar no duplica
Guardar el mismo movimiento más de una vez (por ejemplo, al reintentar después de un error de red) MUST dejar un solo movimiento en la base.

#### Scenario: Reintento
- **WHEN** la app guarda un gasto y vuelve a guardarlo con el mismo identificador
- **THEN** la base tiene un solo movimiento con esos datos

### Requirement: La deuda de un parche se ve en el cruce
El movimiento que crea "pasar al cruce" al cerrar un parche SHALL aparecer en el historial y en el saldo del cruce de esas dos personas.

#### Scenario: Pasar la deuda de un parche
- **WHEN** al cerrar el parche Santa Marta, Joan pasa a su cruce con Jesús los $47.000 que Jesús le debe
- **THEN** el cruce de Joan y Jesús muestra el movimiento "Parche Santa Marta" y el saldo cambia en $47.000

### Requirement: Los cambios de la otra persona aparecen solos
Mientras la app está abierta, un movimiento que la otra persona anota, edita o elimina en un cruce SHALL aparecer en el historial y el saldo de ese cruce en pocos segundos, sin deslizar para recargar. Aplicar un cambio MUST NOT duplicar un movimiento que ya estaba.

#### Scenario: Jesús anota mientras Joan mira
- **WHEN** Joan tiene abierto el inicio de su cruce con Jesús y Jesús anota un mercado de $100.000 a medias
- **THEN** en menos de 10 segundos el inicio de Joan muestra el mercado y el saldo cambia en $50.000, sin tocar nada

#### Scenario: Eco de lo propio
- **WHEN** Joan anota un gasto y le llega el cambio de ese mismo gasto
- **THEN** el gasto aparece una sola vez

#### Scenario: Borrado de la otra persona
- **WHEN** Jesús elimina un gasto mientras Joan mira su inicio
- **THEN** el gasto deja de contar en el saldo de Joan sin recargar

### Requirement: Reconectar al volver
Al volver la app al primer plano, la app SHALL recargar los movimientos y volver a escuchar los cambios de cada cruce.

#### Scenario: Volver a la app
- **WHEN** Joan deja la app en segundo plano, Jesús anota un gasto y Joan vuelve a la app
- **THEN** Joan ve el gasto y los cambios siguientes aparecen solos

### Requirement: Anotar sin conexión
Sin red, anotar, editar, eliminar y saldar SHALL cambiar el cruce en el teléfono y quedar en una cola de pendientes guardada en el teléfono. La app SHALL mostrar que está sin conexión y cuántos movimientos faltan por enviar.

#### Scenario: Modo avión
- **WHEN** Joan, en modo avión, anota una cena de $60.000 a medias
- **THEN** la cena aparece en su inicio con "Jesús te debe $30.000", la app dice "Sin conexión" y hay 1 movimiento pendiente por sincronizar

### Requirement: Enviar lo pendiente al volver la red
Al volver la red, la app SHALL enviar sola la cola de pendientes, en el orden en que se hicieron. "Reintentar" SHALL enviarla también. Lo enviado MUST NOT duplicarse en la base, y lo pendiente MUST NOT desaparecer de la pantalla mientras no se haya enviado.

#### Scenario: Vuelve la red
- **WHEN** Joan anotó dos gastos en modo avión y vuelve la red
- **THEN** los dos gastos llegan a la base una sola vez, el contador de pendientes vuelve a 0 y Jesús los ve

#### Scenario: Recargar sin red
- **WHEN** Joan desliza para recargar mientras sigue sin red
- **THEN** los gastos pendientes siguen en su inicio

### Requirement: Abrir la app sin red
La app SHALL guardar en el teléfono los movimientos de cada cruce y la cola de pendientes. Al abrir la app sin red, SHALL mostrar lo último guardado; los pendientes MUST seguir en la cola para enviarse después.

#### Scenario: Cerrar y abrir sin red
- **WHEN** Joan anota un gasto sin red, cierra la app y la vuelve a abrir todavía sin red
- **THEN** ve sus movimientos y el gasto pendiente, y cuando vuelve la red el gasto se envía

### Requirement: Lo guardado en el teléfono es de quien entró
Cerrar sesión SHALL borrar del teléfono los movimientos y la cola guardados. La app MUST NOT mostrarle a una persona lo guardado de otra.

#### Scenario: Otra persona entra en el mismo iPhone
- **WHEN** Joan cierra sesión y Jesús entra en ese iPhone
- **THEN** Jesús no ve los movimientos que Joan tenía guardados en el teléfono
