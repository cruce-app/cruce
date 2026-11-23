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

### Requirement: Aprobar o rechazar sin secretos
"Permitir" SHALL devolver al navegador a la aplicación con el código de autorización; "No permitir" SHALL devolverlo
sin acceso. La página MUST NOT usar ni recibir la clave `service_role`, y MUST NOT guardar tokens fuera del navegador.

#### Scenario: La página no expone secretos
- **WHEN** alguien abre `/oauth/consent` y revisa el HTML y el JS que recibe
- **THEN** encuentra solo la URL de Supabase y la clave anónima del ambiente

### Requirement: Quitar el acceso
El backend SHALL servir una página "Tus conexiones" (`/oauth/conexiones`) que, con la sesión iniciada, liste las
aplicaciones con acceso a la cuenta y deje quitarle el acceso a cada una con "Quitar acceso". Después de quitarlo, esa
aplicación MUST NOT poder leer ni anotar nada con los tokens que ya tenía, a más tardar cuando venza su token de acceso
(una hora), y MUST volver a pedir consentimiento para conectarse otra vez.

#### Scenario: Quitarle el acceso a Claude
- **WHEN** Jesús abre "Tus conexiones" y toca "Quitar acceso" en Claude
- **THEN** Claude deja de aparecer en la lista y, a más tardar en una hora, deja de poder leer y anotar en Cruce

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
