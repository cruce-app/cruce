## ADDED Requirements

### Requirement: Ver tus cruces y su saldo
Claude SHALL poder listar los cruces de quien lo conectó: con quién (nombre y @usuario), si está abierto o cerrado y el
saldo con la misma frase de la app: "Jesús te debe $20.000", "Le debes $20.000 a Jesús" o "Están a paz y salvo". El
saldo MUST calcularse con los movimientos vigentes, como en la app, y los montos MUST ir en el formato de la app
(`$30.000`). Quién le debe a quién MUST ir siempre en palabras, nunca solo con un signo o un color.

#### Scenario: El ejemplo canónico
- **WHEN** Joan le pregunta a Claude cuánto le debe Jesús, después de la cena de $60.000 que pagó Joan y el mercado de $100.000 que pagó Jesús, los dos a medias
- **THEN** la herramienta devuelve "Le debes $20.000 a Jesús" para el cruce con Jesús

#### Scenario: Varios cruces
- **WHEN** Joan tiene cruces con Jesús y con Ana, y el de Pedro cerrado
- **THEN** la herramienta devuelve los tres, cada uno con su frase, y el de Pedro marcado como cerrado

### Requirement: Ver los movimientos de un cruce
Claude SHALL poder ver los movimientos vigentes de un cruce de quien lo conectó, del más reciente al más antiguo, con
fecha, concepto, categoría, monto, quién pagó, cuánto le toca a quien no pagó y si es un gasto o un pago para saldar.
Devuelve por defecto los 20 más recientes y hasta 100 si se piden. Los movimientos eliminados MUST NOT aparecer. Un
cruce ajeno MUST responder igual que uno que no existe: "No encontré ese cruce."

#### Scenario: Los últimos movimientos
- **WHEN** Joan le pide a Claude los últimos movimientos con Jesús
- **THEN** la herramienta devuelve primero el mercado de $100.000 ("Pagó Jesús, a medias: Joan le debe $50.000") y después la cena

#### Scenario: Un cruce ajeno
- **WHEN** Ana pide los movimientos del cruce de Joan y Jesús por su identificador
- **THEN** la herramienta responde "No encontré ese cruce." y no devuelve movimientos

### Requirement: Ver tus parches
Claude SHALL poder listar los parches de quien lo conectó (nombre, abierto o cerrado y su saldo en el parche, con la
misma frase de la app) y ver el detalle de uno: el saldo de cada persona del parche y el "Para saldar" (quién le paga
a quién y cuánto), igual al que muestra la app. Alguien que no está en un parche MUST NOT ver nada de él.

#### Scenario: El "Para saldar" de un parche
- **WHEN** Joan pide el detalle del parche Santa Marta
- **THEN** la herramienta devuelve los saldos de los cuatro y las mismas transferencias de "Para saldar" que muestra la app

### Requirement: Anotar un gasto en un cruce
Claude SHALL poder anotar un gasto en un cruce abierto de quien lo conectó, con monto en pesos enteros, concepto, quién
pagó (quien conectó Claude o la otra persona), reparto, categoría y fecha (hoy si no se dice). El reparto es "a
medias", un porcentaje de 0 a 100 para quien no pagó o "todo es del otro"; sin reparto, SHALL usar el del cruce. El
gasto SHALL quedar anotado por quien conectó Claude y SHALL devolver el gasto y la frase del saldo nuevo.

#### Scenario: Anotar a medias
- **WHEN** Joan le dice a Claude "anota que pagué la cena de $60.000 a medias con Jesús"
- **THEN** queda un gasto de $60.000, "Cena", pagado por Joan, a medias y anotado por Joan, y la herramienta responde con el saldo nuevo en palabras

#### Scenario: Reparto por defecto del cruce
- **WHEN** el cruce de Joan y Jesús tiene reparto por defecto de 70 % y Joan no dice el reparto
- **THEN** el gasto queda con 70 % para quien no pagó

### Requirement: Qué no se puede anotar
Anotar MUST rechazarse sin guardar nada cuando el monto no es un entero de $1 a $999.999.999 ("El monto debe ser de $1
a $999.999.999."), el concepto está vacío o pasa de 80 caracteres ("El concepto debe tener de 1 a 80 caracteres."), el
cruce está cerrado ("Este cruce está cerrado: ya no acepta gastos.") o el cruce no es de quien conectó Claude ("No
encontré ese cruce.").

#### Scenario: Cruce cerrado
- **WHEN** Joan intenta anotar en su cruce con Pedro, que está cerrado
- **THEN** no se guarda nada y la herramienta responde "Este cruce está cerrado: ya no acepta gastos."

#### Scenario: Monto fuera de rango
- **WHEN** Claude intenta anotar $1.500.000.000
- **THEN** no se guarda nada y la herramienta responde "El monto debe ser de $1 a $999.999.999."

#### Scenario: Porcentaje con otro reparto
- **WHEN** Claude pide anotar "a medias" y también un porcentaje para quien no pagó
- **THEN** no se guarda nada y la herramienta responde que el porcentaje solo va con el reparto por porcentaje; un
  porcentaje sin reparto se anota como reparto por porcentaje

### Requirement: Solo anotar escribe
Anotar un gasto SHALL ser la única herramienta que escribe y SHALL declararse como una que escribe, para que Claude
pida confirmación antes de usarla. Las demás MUST declararse de solo lectura.

#### Scenario: Lista de herramientas
- **WHEN** Claude pide la lista de herramientas de Cruce
- **THEN** solo anotar un gasto aparece como herramienta que escribe

### Requirement: Pantallas de Cruce dentro de Claude
En los clientes de Claude que muestran pantallas de MCP (MCP Apps), ver tus cruces, ver los movimientos de un cruce y
anotar un gasto SHALL mostrar una pantalla con el estilo de Cruce: la tarjeta de saldo de cada cruce, la lista de
movimientos y un formulario para anotar con monto, concepto, quién pagó, reparto y categoría. Guardar desde el
formulario SHALL usar la misma herramienta de anotar, con las mismas reglas y mensajes.

#### Scenario: Tus cruces en Claude
- **WHEN** Joan pregunta en Claude (web o escritorio) cómo va con sus cruces
- **THEN** ve dentro del chat una tarjeta por cruce con "Jesús te debe $20.000" o la frase que corresponda

#### Scenario: Anotar desde el formulario
- **WHEN** Joan llena el formulario con $45.000, "Taxi", pagó Jesús, a medias, Transporte, y toca "Anotar"
- **THEN** el gasto queda guardado igual que si lo anotara Claude, y la pantalla muestra el saldo nuevo

### Requirement: Pantallas seguras y con respaldo en texto
En los clientes sin pantallas, las mismas herramientas SHALL devolver la información completa en texto. Las pantallas
MUST NOT cargar recursos de otros dominios y SHALL verse bien desde 320 px de ancho.

#### Scenario: Cliente sin pantallas
- **WHEN** Joan usa Cruce desde un cliente que no muestra pantallas de MCP
- **THEN** recibe sus cruces con las mismas frases en texto

