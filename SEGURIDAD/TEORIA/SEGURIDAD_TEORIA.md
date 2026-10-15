# Seguridad de MongoDB 8.0
## Unidad 1 — Identificarse no significa tener permiso para todo

### Un ejemplo fuera de la informática

Un empleado entra en un hospital con su tarjeta. La tarjeta demuestra **quién es**, pero no le permite consultar cualquier historia clínica ni modificar todos los registros. Para esas operaciones necesita permisos concretos.

La misma separación existe en MongoDB:

- **Autenticación:** ¿quién eres? Por ejemplo, usuario y contraseña mediante SCRAM.
- **Autorización:** ¿qué puedes hacer? Por ejemplo, consultar documentos sin poder modificarlos.
- **Red:** ¿puede llegar el cliente al servidor?
- **TLS:** ¿viaja protegida la información entre cliente y servidor?

Son preguntas distintas. Tener una contraseña válida no concede todos los permisos, y TLS no convierte a alguien en administrador.

### Nuestro laboratorio protegido

El proyecto utiliza un servidor `mongo-seguridad` separado del servidor de índices. Su base de datos de ejemplo es `curso_seguridad` y contiene una colección `secretos` con un documento completamente ficticio. Hay tres identidades de práctica:

| Cuenta | Finalidad | Permisos |
|---|---|---|
| `adminlab` | Preparar el entorno | Administración |
| `lectorlab` | Consultar un registro | Rol `read` |
| `escritorlab` | Añadir registros | Rol `readWrite` |

El usuario lector puede recuperar un documento, pero debe recibir un error al intentar insertarlo. **En este caso, el error es una prueba satisfactoria:** demuestra que MongoDB aplica una restricción.

### Cómo funcionan los roles

MongoDB utiliza control de acceso basado en roles, conocido como **RBAC**. Un rol reúne permisos; a cada cuenta se le asignan roles adecuados a sus tareas.

El principio de **mínimo privilegio** significa conceder solo lo imprescindible. Si una aplicación necesita mostrar informes, una cuenta administrativa tendría demasiados privilegios. Ante un error de autorización, no deberíamos responder concediendo `root` indiscriminadamente: primero hay que comprobar la operación necesaria.

### ¿Qué es la base de autenticación?

Una cuenta se crea asociada a una base de datos de autenticación. Por eso en una conexión aparece `--authenticationDatabase` o el concepto `authSource`. Si una cuenta está creada en `curso_seguridad`, autenticarla contra otra base puede fallar aunque el nombre y la contraseña sean correctos.

### Dos errores de causa distinta

**Caso A:** alguien intenta leer sin haberse autenticado. El servidor rechaza la consulta.

**Caso B:** una cuenta válida con rol `read` intenta insertar. El servidor también rechaza la operación, pero ahora **la identidad sí es válida**: falta autorización para escribir.

La práctica guiada reproduce ambos casos. Aprenderás a distinguirlos por su causa, no solo por el mensaje de error.

### Protección del canal y los datos

TLS crea un canal cifrado y permite validar la identidad del servidor con certificados. La autenticación X.509 puede identificar clientes mediante certificados cuando está configurada. Ni TLS ni X.509 sustituyen la comprobación de roles. El cifrado en reposo es otra cuestión: protege información almacenada frente a determinadas amenazas y sus mecanismos dependen del producto y de la infraestructura.

En MongoDB 8.0, la integración LDAP está obsoleta; las capacidades empresariales que no están en MongoDB Community no se presentarán como si pudieran probarse en nuestro contenedor gratuito.

### Comprueba tu comprensión

1. ¿Qué control actúa si alguien introduce bien su contraseña, pero no puede insertar?
2. ¿Por qué no deberíamos utilizar `adminlab` como cuenta de una aplicación que solo lee?
3. ¿Por qué un error `Unauthorized` puede ser el resultado correcto de una práctica?
4. ¿En qué se diferencia proteger la conexión con TLS de asignar el rol `read`?

**Respuesta a la pregunta 1:** la autorización. La autenticación identificó a la cuenta, pero el rol no permite esa acción.
