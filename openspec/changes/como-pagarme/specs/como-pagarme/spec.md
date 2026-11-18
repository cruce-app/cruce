# Spec Delta

## Purpose
Que quien debe sepa cómo pagarle a cada persona: su Nequi o su llave Bre-B, guardados en su perfil y visibles donde se salda.

## ADDED Requirements

### Requirement: Cómo te pagan en el perfil
El perfil SHALL poder guardar cómo le pagan a la persona: Nequi o llave (Bre-B), con el número o la llave. Es opcional y las dos partes MUST ir juntas: o las dos o ninguna. Un Nequi MUST tener 10 dígitos y empezar por 3; se guarda sin espacios y se muestra "300 123 4567". Supuesto: una llave tiene de 3 a 40 caracteres, sin espacios (los de los extremos se quitan al guardar).

#### Scenario: Guardar un Nequi
- **WHEN** Jesús elige Nequi y escribe "300 123 4567"
- **THEN** su perfil queda con Nequi 3001234567 y la app lo muestra "300 123 4567"

#### Scenario: Nequi inválido
- **WHEN** Jesús escribe "2001234567" o "300 123"
- **THEN** la app dice "Tu Nequi debe tener 10 dígitos y empezar por 3." y la base también lo rechaza

#### Scenario: Llave inválida
- **WHEN** Ana elige llave y escribe "ab" o "mi llave"
- **THEN** la app dice "Tu llave debe tener de 3 a 40 caracteres, sin espacios." y la base también la rechaza

#### Scenario: Dejarlo vacío
- **WHEN** Jesús borra el dato y guarda
- **THEN** su perfil queda sin Nequi ni llave

### Requirement: Solo cada quien edita cómo le pagan
"Solo vos las editás." Solo la persona dueña del perfil SHALL poder guardar o borrar su Nequi o su llave; nadie más MUST poder cambiarlos. Una cuenta borrada MUST NOT poder editarlos.

#### Scenario: Otro intenta cambiarlo
- **WHEN** Joan intenta cambiar el Nequi de Jesús
- **THEN** el Nequi de Jesús no cambia

### Requirement: Quién ve cómo te pagan
"Las ven las mismas personas que hoy ven tu perfil: tu pareja de cruce y los del parche. Sin sesión, nadie." La lista de cruces SHALL traer cómo pagarle a la otra persona y la lectura de un parche, cómo pagarle a cada uno con la app. Alguien sin cruce ni parche en común MUST NOT verlo, ni nadie sin sesión. Quien está sin la app no tiene este dato.

#### Scenario: La pareja de cruce
- **WHEN** Joan carga sus cruces y Jesús guardó su Nequi
- **THEN** Joan ve el Nequi de Jesús

#### Scenario: Los del parche
- **WHEN** Ana está en el parche "Santa Marta" con Jesús, sin compartir un cruce, y abre el parche
- **THEN** Ana ve el Nequi de Jesús

#### Scenario: Un extraño o sin sesión
- **WHEN** alguien sin cruce ni parche con Jesús, o una petición sin sesión, intenta leer su Nequi
- **THEN** no lo ve

### Requirement: Borrar la cuenta borra cómo te pagan
"Al borrar la cuenta, el dato se borra con la lápida." La lista de cruces de la otra persona MUST traerlo vacío.

#### Scenario: Jesús borra su cuenta
- **WHEN** Jesús, que tenía su Nequi guardado, borra su cuenta
- **THEN** su perfil queda sin Nequi y Joan ya no lo ve en su cruce

### Requirement: Sección "Cómo te pagan" en Tu perfil
Tu perfil SHALL tener una sección "Cómo te pagan" para elegir Nequi o llave y escribir el dato, que se puede dejar vacía, con el texto "Lo ven tus cruces y los del parche, y sale en los tickets." Llenarlo basta como permiso para que salga en los tickets; no hay otro interruptor. Sin conexión, la app MUST mostrar un error y conservar el dato anterior.

#### Scenario: Ver la sección
- **WHEN** Jesús abre Tu perfil
- **THEN** ve "Cómo te pagan" con Nequi y llave, el campo y "Lo ven tus cruces y los del parche, y sale en los tickets."

### Requirement: Cómo pagarle al saldar un cruce
En Saldar, cuando quien usa la app debe y la otra persona guardó cómo le pagan, la app SHALL mostrar "Págale a Jesús por Nequi: 300 123 4567" con un botón para copiar el número. Supuesto, con llave: "Págale a Jesús a su llave Bre-B: <llave>". Si le deben a quien usa la app, o la otra persona no lo llenó, MUST NOT mostrarse.

#### Scenario: Joan le debe a Jesús
- **WHEN** Joan le debe $50.000 a Jesús, Jesús guardó su Nequi 3001234567 y Joan abre Saldar
- **THEN** ve "Págale a Jesús por Nequi: 300 123 4567" y un botón que copia 3001234567

#### Scenario: Le deben a quien usa la app
- **WHEN** Jesús le debe a Joan y Joan abre Saldar
- **THEN** no ve cómo pagarle a Jesús

### Requirement: Cómo pagarle en "Para saldar"
En el detalle de un parche, cada transferencia de "Para saldar" SHALL mostrar cómo pagarle a quien recibe, si lo guardó: "Nequi de Ana: 300 123 4567" (o "Llave Bre-B de Ana: <llave>"), con un botón para copiarlo.

#### Scenario: Ana recibe
- **WHEN** en "Para saldar" Jesús le paga a Ana y Ana guardó su Nequi
- **THEN** debajo de esa transferencia dice "Nequi de Ana: 300 123 4567" con el botón para copiarlo

### Requirement: Cómo pagar en el ticket personal
"Ticket personal: quien debe ve a quién y cómo pagarle. El ticket del parche no cambia." El ticket personal de quien debe SHALL incluir, por cada persona a quien le paga y que guardó cómo le pagan, "Nequi de Ana: 300 123 4567". El ticket de quien no debe y el ticket del parche MUST NOT incluirlo.

#### Scenario: Ticket de Carlos
- **WHEN** Carlos le debe a Ana en "Santa Marta", Ana guardó su Nequi y se genera el ticket de Carlos
- **THEN** el ticket dice "Nequi de Ana: 300 123 4567"

#### Scenario: Ticket del parche
- **WHEN** se genera el ticket del parche
- **THEN** no tiene cómo pagarle a nadie

### Requirement: Copiar sin sonido
Copiar el Nequi o la llave MUST NOT sonar ni vibrar. Para VoiceOver, el botón SHALL decir qué copia y el Nequi SHALL leerse por grupos de dígitos.

#### Scenario: Copiar el Nequi
- **WHEN** Joan toca el botón de copiar en Saldar
- **THEN** el número queda copiado, sin sonido ni vibración
