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


---

# Unidad 2. La seguridad comienza antes de introducir la contraseña

## 2.1. Qué estamos protegiendo

Cuando hablamos de seguridad de una base de datos no queremos decir únicamente que la aplicación tenga una pantalla de inicio de sesión. Una base contiene información y soporta operaciones: consultar clientes, registrar pedidos, borrar registros, exportar informes o administrar usuarios. Cada una de esas acciones puede tener consecuencias diferentes.

Antes de configurar controles, enumera tres preguntas:
- **Qué datos existen.** No tiene la misma sensibilidad una lista de códigos de prueba que los datos personales o financieros de clientes reales.
- **Quién necesita operar.** Un proceso que registra ventas, una persona que consulta informes y un administrador no requieren los mismos poderes.
- **Qué puede salir mal.** Acceso desde una red no deseada, robo de credenciales, modificación accidental, error de configuración o pérdida de una copia de seguridad.

Si no hacemos estas preguntas, podemos configurar una contraseña segura y aun así permitir que cualquier cuenta elimine una colección completa.

## 2.2. El puerto no equivale al permiso

MongoDB escucha conexiones a través de una red. En Docker Compose publicamos puertos para que un cliente del ordenador pueda comunicarse con el contenedor.

En el laboratorio, las asignaciones son:

| Servicio | Puerto del ordenador | Uso |
|---|---|---|
| `mongo-indices` | `127.0.0.1:27017` | Ejercicios con datos ficticios |
| `mongo-seguridad` | `127.0.0.1:27018` | Autenticación y permisos |
| `mongo-tls` | `127.0.0.1:27019` | TLS y certificados |

`127.0.0.1` significa el equipo local o *loopback*. Limita la exposición de los puertos publicados en el host, pero **no constituye por sí mismo una política de autenticación**. Los contenedores conectados a la red de Docker pueden tener rutas internas diferentes; por eso también necesitamos diseñar controles en el servidor.

Una analogía: cerrar el acceso exterior al edificio no significa que cualquier persona dentro de él deba tener las llaves de todas las habitaciones.

## 2.3. Autenticación y autorización: el orden de las preguntas

Supongamos que el empleado `lectorlab` quiere consultar un documento.

1. Establece una conexión con el servidor.
2. Presenta credenciales para que MongoDB conozca su identidad.
3. El servidor determina qué roles tiene asociados.
4. Cuando solicita `find` sobre una colección, el servidor comprueba si sus privilegios permiten esa acción.
5. Si no tiene permiso, la operación se deniega; **no deberíamos modificar los roles solo para ocultar el error de clase**.

La autenticación no es algo que debamos repetir con cada documento visible al usuario: el servidor mantiene información de la identidad dentro de la sesión de conexión. La autorización se aplica a las operaciones que esa sesión intenta realizar.

## 2.4. Separar cuentas es separar responsabilidades

En una organización real puede haber una cuenta para una aplicación web, otra para procesos de integración, otra para copias de seguridad y cuentas diferenciadas de personas que administran el sistema.

En nuestra práctica reducimos este escenario a tres identidades para que se vea el principio:

- `adminlab` prepara datos y cuentas. No se utiliza como identidad normal de la aplicación.
- `lectorlab` puede realizar consultas sobre `curso_seguridad`, pero no escribir.
- `escritorlab` puede leer y modificar datos de esa base.

**Una cuenta que puede hacerlo todo hace imposible demostrar el mínimo privilegio.** Si conectamos todas las herramientas con `adminlab`, cualquier consulta funcionará, pero habremos aprendido poco sobre seguridad.

### Pregunta para comprobarlo

Una empresa necesita una pantalla que muestre ventas, pero nunca las modifique. ¿Qué ocurriría si usara un usuario con permiso para eliminar todas las bases? La pantalla podría funcionar normalmente; el problema está en las consecuencias de un fallo, una credencial robada o un uso indebido.

---

# Unidad 3. SCRAM: qué ocurre al identificarse con nombre de usuario y contraseña

## 3.1. No confundas una cuenta de MongoDB con un usuario del sistema operativo

MongoDB maneja sus propias identidades de base de datos. Una cuenta llamada `lectorlab` no tiene por qué existir como cuenta de Windows, macOS o Linux. El sistema operativo protege recursos del ordenador; MongoDB gestiona el acceso a sus operaciones y colecciones.

La instancia `mongo-seguridad` arranca con una cuenta administrativa definida a partir de variables del contenedor. Es una manera práctica de iniciar una base de pruebas desde cero. En una infraestructura empresarial, la provisión de credenciales y su custodia requieren mecanismos de secretos adecuados.

## 3.2. Qué significa SCRAM

SCRAM es una familia de mecanismos de autenticación basada en un intercambio de desafío y respuesta. La idea fundamental es que el cliente demuestra que conoce el secreto apropiado mediante un protocolo, en lugar de que el servidor deba confiar simplemente en que el nombre de usuario es verdadero.

No necesitas implementar SCRAM para comprender los ejemplos. Debes distinguir lo que hace:
- Ayuda a verificar **identidades mediante credenciales**.
- No determina por sí mismo si una cuenta puede insertar o borrar.
- No reemplaza la protección del canal de comunicación con TLS.
- No obliga a guardar contraseñas en texto claro dentro de scripts compartidos.

Una instrucción de conexión típica, lanzada en el contexto adecuado, tiene esta forma:

```bash
mongosh --username lectorlab --authenticationDatabase curso_seguridad --password
```

La opción `--password` sin escribir la contraseña en el comando solicita introducirla de forma interactiva. En el laboratorio la ejecutaremos dentro del contenedor, no suponiendo que todo el alumnado tiene `mongosh` instalado en el host.

## 3.3. Por qué importa authSource

MongoDB permite crear una identidad en una base de autenticación concreta. Esa base se especifica mediante `--authenticationDatabase` en `mongosh` o con `authSource` en una URI de conexión.

Ejemplo de dos datos que no hay que confundir:
- Datos que queremos leer: colección `secretos` de `curso_seguridad`.
- Base donde se reconoce la cuenta: también `curso_seguridad` para `lectorlab` en esta práctica, pero `admin` para `adminlab`.

Eso significa que una persona puede consultar una colección de una base mientras sus credenciales se autentican contra otra. **Base de datos de autenticación y base de datos consultada son conceptos diferentes**, aunque a veces coincidan.

Cuando una contraseña parece correcta pero el inicio de sesión falla, revisa la combinación de nombre, contraseña, servidor y base de autenticación. No cambies la cuenta a `root` como primera solución.

## 3.4. ¿Qué significa crear un usuario?

En `mongosh`, conectados con privilegios administrativos, podemos crear una identidad:

```javascript
const curso = db.getSiblingDB("curso_seguridad");
curso.createUser({
  user: "lectorlab",
  pwd: passwordPrompt(),
  roles: [{ role: "read", db: "curso_seguridad" }]
});
```

Cada elemento cumple una función:
- `user`: nombre de la identidad.
- `pwd`: credencial; `passwordPrompt()` pide introducirla sin dejarla escrita literalmente en el ejemplo.
- `roles`: lista de papeles autorizados.
- `role:"read"`: papel predefinido de lectura.
- `db:"curso_seguridad"`: ámbito en el que aplica ese rol.

Esta declaración no significa «el usuario está trabajando dentro de la colección». Significa que hemos registrado una cuenta de base de datos y asignado privilegios.

### Error previsible: «user already exists»

Si ejecutas dos veces la creación, quizá obtengas un error indicando que ya existe una cuenta con ese nombre. No es una anomalía misteriosa: el sistema ya tiene esa identidad. Puedes comprobarla con `curso.getUser("lectorlab")` mientras estás autorizado. Eliminarla o cambiar su contraseña es otra operación, que no debe realizarse sin saber si se está usando.

## 3.5. Credenciales fuera del repositorio

En ejemplos antiguos de cursos es frecuente ver comandos con `--password MiClave123`. Eso facilita copiar, pero puede exponer secretos en historiales de terminal, archivos compartidos o listas de procesos. En este curso evitamos incluir contraseñas reales. Los valores de `.env.example` son únicamente ejemplos y deben reemplazarse.

Un repositorio público puede contener instrucciones de instalación y nombres ficticios de usuarios. No debería publicar las claves privadas de certificados ni contraseñas reutilizables.

---

# Unidad 4. Roles, privilegios y RBAC con operaciones concretas

## 4.1. El permiso no se concede «para todo MongoDB»

En MongoDB los roles reúnen privilegios sobre recursos. Un recurso puede ser una base de datos, una colección u otro ámbito apropiado. Los privilegios describen acciones permitidas.

Para un principiante resulta útil empezar con dos roles predefinidos:

| Acción | `read` | `readWrite` |
|---|---|---|
| `find` sobre datos autorizados | Permitido | Permitido |
| `insertOne` | Denegado | Permitido |
| `updateOne` | Denegado | Permitido |
| `deleteOne` | Denegado | Permitido |

Esta tabla supone que hablamos de la base de datos a la que se concedió el rol; no afirma que esos nombres autoricen todas las colecciones de todos los servidores del mundo.

El resultado práctico no depende de si la operación la inicia una aplicación de C#, una consola `mongosh` o una herramienta gráfica. MongoDB aplica su política en el servidor.

## 4.2. Principio de mínimo privilegio

El mínimo privilegio no consiste en impedir trabajar a las personas. Consiste en otorgar **el permiso necesario para la tarea y no más**.

Si el departamento de informes solo necesita consultar ventas, asignarle `readWrite` puede parecer inocuo mientras nadie pulse «borrar». El riesgo aparece cuando una herramienta tiene un fallo, un script equivocado se ejecuta, o alguien consigue apropiarse de esa cuenta. El daño posible aumenta con sus privilegios.

Una buena pregunta de diseño es: «¿qué operaciones necesita realizar este proceso de verdad, y en qué colecciones?». No preguntes únicamente «¿con qué cuenta deja de dar error?».

## 4.3. Diferencias entre denegación y fallo técnico

Considera tres mensajes posibles:
1. No existe una conexión de red con el servidor.
2. El servidor rechaza la autenticación.
3. El usuario se autentica, pero la inserción obtiene una denegación de autorización.

Tienen causas diferentes. El primer caso puede deberse a un contenedor parado o a un puerto incorrecto; el segundo a credenciales o base de autenticación equivocadas; el tercero, a la definición de roles. La solución debe actuar sobre la causa real.

**No eleves privilegios para resolver problemas de red.** Tampoco reinicies bases de datos para resolver un filtro mal escrito.

## 4.4. Diseñar una prueba positiva y una negativa

Para demostrar que una política funciona no basta con comprobar que un administrador puede leer.

Una prueba convincente contiene:
- **Caso positivo:** `lectorlab` se identifica y lee un documento conocido.
- **Caso negativo:** el mismo lector intenta insertar y MongoDB lo deniega.
- **Caso de contraste:** `escritorlab` puede insertar porque su rol sí incluye escritura.

Con los tres resultados es posible demostrar que las identidades y los permisos importan. Una prueba que únicamente ejecutara todas las operaciones como `adminlab` no serviría para enseñar RBAC.

## 4.5. Riesgos del uso de roles personalizados

MongoDB permite construir roles más precisos, pero eso añade responsabilidad. Si defines un rol para leer exclusivamente una colección, debes comprobar la lista real de acciones y recursos concedidos. Un rol que parece inocente por su nombre puede contener privilegios adicionales.

Por eso, cuando estudiemos roles personalizados, no concluiremos que una cuenta es segura porque se llama `soloLectura`: inspeccionaremos qué permisos contiene.

### Actividad de diseño

Define tres tareas: consultar una factura, registrar una venta y administrar cuentas. ¿Por qué no deberían compartir la misma identidad? Propón un rol mínimo para cada una y explica qué operación negativa ensayarías para verificarlo.
