# Spec Delta

## ADDED Requirements

### Requirement: Limpieza diaria de invitaciones vencidas
Una vez al día, la base SHALL borrar las invitaciones que vencieron hace más de 30 días sin canjearse. La limpieza MUST NOT borrar una invitación canjeada, sin importar su edad, ni una que venció hace 30 días o menos: esa MUST seguir respondiendo "Ese código ya venció. Pídele uno nuevo a quien te lo mandó."

#### Scenario: Código vencido hace más de 30 días
- **WHEN** pasa la limpieza diaria y el código de Pedro venció hace 31 días sin que nadie lo usara
- **THEN** la invitación ya no existe y quien lo escriba ve "Ese código no existe. Revisa que esté bien escrito."

#### Scenario: Código vencido hace poco
- **WHEN** pasa la limpieza diaria y el código de Joan venció ayer
- **THEN** la invitación se conserva y quien lo escriba ve "Ese código ya venció. Pídele uno nuevo a quien te lo mandó."

#### Scenario: Código canjeado hace mucho
- **WHEN** pasa la limpieza diaria y Jesús canjeó el código de Joan hace 60 días
- **THEN** la invitación se conserva con quién la canjeó y cuándo

### Requirement: Limpieza diaria de intentos fallidos
Una vez al día, la base SHALL borrar los intentos fallidos de canjear o ver un código de hace más de un día. La limpieza MUST NOT cambiar el límite de 5 intentos fallidos por hora.

#### Scenario: Intentos fallidos viejos
- **WHEN** pasa la limpieza diaria y Ana tiene un intento fallido de hace 25 horas y otro de hace 2 horas
- **THEN** se borra el de hace 25 horas y se conserva el de hace 2 horas

### Requirement: Volver a invitar después de la limpieza
Quien tiene un cruce pendiente cuyo código borró la limpieza SHALL recibir un código nuevo para ese mismo cruce al volver a invitar, sin crear otro cruce.

#### Scenario: Pedro vuelve a "Invitar"
- **WHEN** a Pedro le borraron el código vencido de su cruce pendiente y vuelve a "Invitar"
- **THEN** recibe un código `CRZ-` nuevo para ese mismo cruce y Ana se puede unir con él

### Requirement: La limpieza no es para la app
La limpieza MUST correr solo desde la base. Nadie, con sesión ni sin ella, MUST poder correrla llamando a la base desde la app.

#### Scenario: Llamarla directo
- **WHEN** alguien con sesión intenta correr la limpieza llamando a la base directo
- **THEN** la base lo rechaza por falta de permiso
