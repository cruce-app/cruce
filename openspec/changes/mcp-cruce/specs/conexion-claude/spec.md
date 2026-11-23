## ADDED Requirements

### Requirement: Conectar Claude con OAuth
El servidor MCP de Cruce SHALL pedir OAuth 2.1 (código de autorización con PKCE S256) con Supabase Auth como servidor
de autorización. Una petición sin token o con un token inválido MUST recibir un 401 con `WWW-Authenticate` que apunte
a los metadatos del recurso protegido. El servidor SHALL aceptar el registro automático de clientes, porque Claude se
registra solo ("Register automatically").

#### Scenario: Claude sin sesión
- **WHEN** Claude llama al servidor MCP de testing sin token
- **THEN** recibe un 401 con `WWW-Authenticate: Bearer resource_metadata="…"`, y los metadatos nombran el servidor de autorización de testing

### Requirement: Una conexión por ambiente
Cada ambiente (local, testing y prod) SHALL tener su propio servidor MCP, con su propio servidor de autorización. Un
token de un ambiente MUST NOT servir en otro.

#### Scenario: Token de otro ambiente
- **WHEN** Claude llama al servidor de prod con un token emitido por testing
- **THEN** recibe un 401 y no ve ningún dato

### Requirement: Página de consentimiento
El backend de cada ambiente SHALL servir la página de consentimiento a la que Supabase Auth redirige
(`/oauth/consent?authorization_id=…`). Sin sesión, la página SHALL pedir el correo y el código de 6 dígitos, como la
app, y después volver a la misma autorización. Con sesión, SHALL mostrar "<aplicación> quiere ver tus cruces y
parches y anotar gastos en tus cruces.", con "Permitir" y "No permitir".

#### Scenario: Primera conexión
- **WHEN** Joan agrega el conector de Cruce en Claude y no tiene sesión en la página
- **THEN** la página le pide su correo, él escribe el código que le llega, ve "Claude quiere ver tus cruces y parches y anotar gastos en tus cruces." y, al tocar "Permitir", vuelve a Claude conectado

#### Scenario: No permitir
- **WHEN** Joan toca "No permitir"
- **THEN** vuelve a Claude sin acceso y Claude no puede leer nada de Cruce

#### Scenario: Código equivocado
- **WHEN** Joan escribe un código que no sirve
- **THEN** la página dice "Ese código no sirve. Revisa el correo o pide otro." y sigue en el mismo paso

#### Scenario: Correo sin cuenta
- **WHEN** alguien escribe en la página un correo que no tiene cuenta en Cruce
- **THEN** la página dice "Ese correo no tiene cuenta en Cruce. Créala primero en la app." y no crea ninguna cuenta

#### Scenario: Autorización vencida o desconocida
- **WHEN** alguien abre la página con un `authorization_id` vencido o inventado
- **THEN** la página dice "Esta solicitud ya no sirve. Vuelve a conectar Cruce desde Claude." y no aprueba nada

### Requirement: Sitio de regreso en el consentimiento
Cualquier aplicación se puede registrar sola con el nombre que quiera. Por eso, junto a la pregunta, la página de
consentimiento SHALL decir "Al permitir, vuelves a <sitio>.", con el sitio de la dirección de regreso que registró la
aplicación, para que se note cuando una aplicación dice ser Claude y no lo es.

#### Scenario: Una aplicación que dice ser Claude
- **WHEN** una aplicación que se registró como "Claude" pide acceso y vuelve a `https://evil.example/cb`
- **THEN** la página dice "Claude quiere ver tus cruces y parches y anotar gastos en tus cruces." y "Al permitir, vuelves a evil.example.", así Joan ve que no es Claude

### Requirement: Aprobar o rechazar sin secretos
"Permitir" SHALL devolver al navegador a la aplicación con el código de autorización; "No permitir" SHALL devolverlo
sin acceso. La página MUST NOT usar ni recibir la clave `service_role`, y MUST NOT guardar tokens fuera del navegador.

#### Scenario: La página no expone secretos
- **WHEN** alguien abre `/oauth/consent` y revisa el HTML y el JS que recibe
- **THEN** encuentra solo la URL de Supabase y la clave anónima del ambiente

### Requirement: Quitar el acceso
El backend SHALL servir una página "Tus conexiones" (`/oauth/conexiones`) que, con la sesión iniciada, liste las
aplicaciones con acceso a la cuenta y deje quitarle el acceso a cada una con "Quitar acceso". Después de quitarlo, esa
aplicación MUST NOT poder leer ni anotar nada con los tokens que ya tenía, ni por el servidor MCP ni directo contra la
base, y MUST volver a pedir consentimiento para conectarse otra vez.

#### Scenario: Quitarle el acceso a Claude
- **WHEN** Jesús abre "Tus conexiones" y toca "Quitar acceso" en Claude
- **THEN** Claude deja de aparecer en la lista y deja de poder leer y anotar en Cruce de inmediato, aunque su token no haya vencido

### Requirement: Claude actúa como quien lo conectó
Todo lo que Claude lee o anota por el servidor MCP SHALL hacerse con la identidad de la persona que aprobó el acceso,
con las mismas reglas que la app: ve solo sus cruces y sus parches, y lo que anota queda como anotado por ella. Una
cuenta borrada MUST NOT poder leer ni anotar, aunque su token siga vigente.

#### Scenario: Un tercero
- **WHEN** Ana conecta Claude a su cuenta y le pide el saldo de Joan y Jesús
- **THEN** Claude no ve ese cruce

#### Scenario: Cuenta borrada
- **WHEN** Jesús borra su cuenta con Claude conectado
- **THEN** las herramientas de Cruce ya no le devuelven datos ni le dejan anotar

### Requirement: Claude solo puede lo que dan las herramientas
Con un token emitido a una aplicación conectada (OAuth), la base SHALL aceptar solo lecturas, anotar un gasto en
`movements` y las funciones de lectura que usan las herramientas. Todo lo demás MUST rechazarse sin cambiar nada:
editar el perfil, editar o borrar movimientos, anotar un pago, borrar la cuenta, crear o vincular cruces y escribir en
parches. Las peticiones de la app de iOS, con la sesión normal, no cambian.

#### Scenario: Una aplicación intenta cambiar el perfil
- **WHEN** una aplicación conectada usa su token para cambiar el nombre del perfil de Joan directo contra la base
- **THEN** la base lo rechaza y el nombre no cambia

#### Scenario: Una aplicación intenta anotar un pago
- **WHEN** una aplicación conectada usa su token para guardar un movimiento de pago (`settlement`) en un cruce
- **THEN** la base lo rechaza y no se guarda nada

### Requirement: Nadie cambia la contraseña
Cruce no usa contraseñas: se entra con un código por correo. Ponerle o cambiarle la contraseña a una cuenta MUST
rechazarse, también con el token de una aplicación conectada, para que ese token no se pueda convertir en una forma
de entrar con correo y contraseña. Entrar con el código por correo, crear una cuenta y borrarla no cambian.

#### Scenario: Una aplicación intenta ponerle contraseña a la cuenta
- **WHEN** una aplicación conectada usa su token para ponerle una contraseña a la cuenta de Joan
- **THEN** Supabase Auth lo rechaza y nadie puede entrar a la cuenta de Joan con correo y esa contraseña
