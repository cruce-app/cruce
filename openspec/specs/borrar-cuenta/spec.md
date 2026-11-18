# borrar-cuenta Specification

## Purpose
Dejar que cada persona borre su cuenta sin descuadrar las cuentas que compartía con otros en sus cruces y parches.

## Requirements

### Requirement: Borrar mi cuenta
Tu perfil SHALL tener "Borrar mi cuenta". Antes de borrar, la app MUST pedir confirmación con lo que pasa: se borran el nombre, el @usuario, el color y el correo; los cruces se cierran y la otra persona conserva el historial; en los parches el lugar queda como "Cuenta borrada". Al confirmar, la app MUST cerrar la sesión y borrar lo guardado en el teléfono, como "Cerrar sesión". Sin conexión MUST mostrar un error y no borrar nada.

#### Scenario: Joan borra su cuenta
- **WHEN** Joan toca "Borrar mi cuenta" y confirma
- **THEN** la app vuelve al onboarding y en el teléfono no queda nada de Joan

#### Scenario: Se arrepiente
- **WHEN** Joan toca "Borrar mi cuenta" y luego "Cancelar"
- **THEN** no cambia nada

### Requirement: Qué se borra
Al borrar una cuenta, la base SHALL borrar su usuario de Auth (correo y sesiones) y dejar su perfil como "Cuenta borrada", sin @usuario ni color. El @usuario MUST quedar libre de inmediato. Si la persona vuelve con el mismo correo, MUST ser una cuenta nueva: no recupera cruces, parches ni nombre.

#### Scenario: El @usuario queda libre
- **WHEN** Joan, que era "joan", borra su cuenta
- **THEN** Ana puede elegir "joan" en ese momento

#### Scenario: Vuelve con el mismo correo
- **WHEN** Joan borra su cuenta y entra otra vez con el mismo correo
- **THEN** la app le pide el nombre como a alguien nuevo y no tiene cruces ni parches

### Requirement: Cruces de una cuenta borrada
Al borrar una cuenta, la base SHALL cerrar sus cruces abiertos como al desvincular y borrar su cruce pendiente con su código `CRZ-`. La otra persona MUST conservar el cruce cerrado con todo su historial y su saldo, con la otra persona como "Cuenta borrada" y su avatar en gris, apagado, en vez de su color.

#### Scenario: Jesús ve la cuenta borrada
- **WHEN** Joan borra su cuenta y Jesús recarga
- **THEN** Jesús ve en "Cerrados" su cruce con "Cuenta borrada", en gris, con los mismos movimientos y el mismo saldo de antes

### Requirement: Parches de una cuenta borrada
Al borrar una cuenta, su lugar en cada parche SHALL quedar con el nombre "Cuenta borrada", con sus gastos y pagos, y el saldo de cada persona del parche MUST NOT cambiar. Ese lugar MUST NOT tener código `SOY-` ni poder reclamarse, MUST NOT mostrarse como "sin la app" y MUST verse en gris, apagado, en vez de su color. Las propuestas de pasar al cruce que lo incluían y seguían por confirmar SHALL quedar rechazadas. Si había creado el parche, lo SHALL poder cerrar cualquiera del parche con la app.

#### Scenario: El parche sigue cuadrando
- **WHEN** Joan, que pagó la cena de Santa Marta, borra su cuenta
- **THEN** el gasto sigue pagado por "Cuenta borrada" y los saldos de Jesús, Ana y Carlos son los mismos

#### Scenario: El lugar se ve apagado
- **WHEN** Jesús abre el parche después de que Joan borró su cuenta
- **THEN** "Cuenta borrada" aparece con su avatar en gris, en los del parche, en los saldos y en los tickets

### Requirement: Pagos a una cuenta borrada
Un pago al lugar de una cuenta borrada SHALL contar como confirmado, porque nadie más lo puede confirmar: los que estaban por confirmar se confirman al borrar la cuenta, con la confirmación en la actividad a nombre de "Cuenta borrada", y uno nuevo se confirma al anotarlo. Un pago que ese lugar le hizo a otra persona MUST seguir esperando que esa persona lo confirme.

#### Scenario: Un pago por confirmar a la cuenta borrada
- **WHEN** Jesús anotó que le pagó $30.000 a Joan, Joan no lo había confirmado y Joan borra su cuenta
- **THEN** el pago queda confirmado, cuenta en el saldo de Jesús y la actividad dice "Cuenta borrada confirmó: …"

#### Scenario: Un pago nuevo a la cuenta borrada
- **WHEN** después de que Joan borró su cuenta, Ana anota que le pagó $5.000 a "Cuenta borrada"
- **THEN** el pago cuenta de una vez, sin quedar por confirmar

### Requirement: Un lugar solo queda libre si la cuenta ya no existe
La base MUST rechazar que el lugar de alguien con la app en un parche pase a no tener cuenta, salvo cuando esa cuenta ya no existe en Auth.

#### Scenario: Nadie suelta un lugar ajeno
- **WHEN** alguien intenta dejar sin cuenta el lugar de Jesús, que sigue teniendo su cuenta
- **THEN** la base lo rechaza con "Ese lugar ya es de alguien"
