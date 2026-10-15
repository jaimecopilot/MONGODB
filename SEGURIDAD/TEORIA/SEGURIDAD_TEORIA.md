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


---

# Unidad 5. TLS: proteger lo que viaja por la red

## 5.1. Una contraseña válida no protege por sí sola el canal

Un empleado puede identificarse correctamente y tener permisos adecuados, pero si cliente y servidor intercambian datos por una conexión insegura, existe otro tipo de riesgo. La pregunta ya no es «¿quién eres?» sino «¿puede un tercero interpretar o manipular la comunicación?».

**TLS** es un protocolo que protege la comunicación en tránsito y permite a un cliente verificar la identidad del servidor mediante certificados. Cuando el canal TLS se establece correctamente, los datos enviados por él quedan protegidos mediante mecanismos criptográficos adecuados para la conexión.

No es un mecanismo de cifrado de los archivos almacenados en disco. Si alguien copia un volumen donde están los datos, TLS no resuelve ese problema por sí solo.

## 5.2. ¿Qué aporta un certificado?

Un certificado digital vincula una identidad a una clave pública y contiene información para comprobar su validez y su emisor. Se utiliza junto con una clave privada asociada, que debe protegerse.

En una configuración básica:
1. El servidor MongoDB presenta su certificado.
2. El cliente comprueba, entre otras cosas, que confía en la autoridad que lo firmó y que el nombre del servidor coincide con los datos adecuados del certificado.
3. Si las comprobaciones son satisfactorias, el protocolo permite establecer un canal protegido.
4. Después siguen siendo relevantes la autenticación y la autorización necesarias para las operaciones.

La verificación del nombre importa: confiar en una autoridad no debería servir para aceptar indiscriminadamente cualquier servidor que presente cualquier certificado expedido por ella.

## 5.3. La función de una autoridad de certificación

Una **CA** o autoridad certificadora firma certificados. Para una demostración local podemos crear una CA temporal y firmar con ella un certificado de servidor y otro de cliente.

En el proyecto existe `scripts/generar-certificados.sh`, que prepara archivos de ejemplo dentro de `certs/`. Esa carpeta no se publica con claves privadas en Git. No debes copiar esa gestión simplificada de material criptográfico a una infraestructura de producción: allí se requieren procesos de custodia, renovación, revocación, permisos de archivos y confianza adecuados.

El nombre `server.pem` en un ejemplo puede incluir el certificado de servidor y su clave privada. El archivo `ca.crt` permite al cliente verificar la cadena de confianza. Confundir esos dos archivos puede llevar a errores de conexión.

## 5.4. «Requiere TLS» y «autenticado» no son lo mismo

La instancia del laboratorio `mongo-tls` está configurada con `--tlsMode requireTLS`. Esto significa que exige el protocolo TLS para conexiones de red a esa instancia.

Pero un cliente que consigue establecer un canal TLS todavía puede necesitar autenticarse para acceder a documentos protegidos. Por ejemplo, una orden de comprobación de disponibilidad `ping` puede responder sin demostrar que el cliente posee permisos para consultar datos.

De aquí surge una distinción que usaremos en las prácticas:

| Prueba | Qué puede demostrar | Qué NO demuestra |
|---|---|---|
| Conexión sin TLS rechazada | El servidor exige TLS | Que los usuarios tengan roles correctos |
| Conexión TLS y CA válida | El canal puede establecerse y el servidor es verificable | Que el cliente pueda leer secretos |
| Lectura autenticada permitida | La cuenta tiene permiso de lectura | Que también pueda modificar datos |
| Inserción denegada al lector | Se aplica una restricción de escritura | Que TLS está configurado correctamente |

No uses una sola prueba para afirmar que están verificadas todas las capas de seguridad.

## 5.5. Qué sucede si la conexión TLS falla

Los errores pueden aparecer por razones diferentes:
- No se pasó `--tls` aunque el servidor lo exige.
- El cliente no confía en la autoridad que firmó el certificado.
- El certificado está caducado o no es válido para el nombre solicitado.
- El archivo de clave/certificado es incorrecto o no puede leerse.
- La configuración de servidor y cliente no tiene opciones compatibles.

La forma pedagógica de resolverlo no consiste en añadir opciones de «no validar certificados» hasta que funcione. Eso desactiva precisamente una propiedad que queremos aprender a conservar.

---

# Unidad 6. X.509: identificar al cliente por su certificado

## 6.1. La misma palabra «certificado», dos usos

Hasta ahora el certificado servía principalmente para que el cliente verificara al servidor al establecer TLS. MongoDB también puede utilizar certificados de **cliente** para autenticar identidades mediante el mecanismo `MONGODB-X509`.

Son dos preguntas distintas:
- **¿Es legítimo este servidor?** El cliente verifica el certificado presentado por el servidor en la conexión TLS.
- **¿Quién es este cliente?** El servidor puede autenticarlo utilizando la identidad indicada por un certificado del cliente, cuando está configurado para ello.

No basta con tener un archivo `.pem`. Hay que entender si corresponde al servidor o al cliente, si está firmado por una CA de confianza, qué nombre representa y qué privilegios tiene esa identidad dentro de MongoDB.

## 6.2. Nombre distinguido y base $external

La identidad de un certificado X.509 se expresa mediante campos de un **nombre distinguido** (*Distinguished Name* o DN). En el laboratorio se utiliza un sujeto de demostración similar a:

```text
CN=alumno-x509,OU=Alumnos,O=MongoDBFormacion
```

Ese sujeto no es una contraseña; identifica la entidad representada por el certificado. MongoDB utiliza la base especial `$external` para identidades autenticadas con mecanismos externos como X.509.

La cuenta de certificado necesita roles, igual que una cuenta basada en contraseña. Que el cliente demuestre poseer una clave privada válida no le concede automáticamente permiso para modificar cualquier colección.

## 6.3. Una prueba completa

Para demostrar X.509 de manera rigurosa, el laboratorio deberá verificar estas condiciones:

1. Se ha creado una CA local y un certificado de servidor válido para los nombres usados en la conexión.
2. La instancia se inicia exigiendo TLS.
3. Un cliente puede verificar la CA y establecer el canal.
4. Se registra el DN del alumno como usuario de `$external` con un rol de lectura sobre `curso_cert`.
5. El cliente se conecta con su certificado y el mecanismo `MONGODB-X509`.
6. La cuenta puede leer el documento de prueba.
7. La misma identidad recibe una denegación cuando intenta insertar.

La última prueba es importante: vuelve a demostrar que **autenticación y autorización están separadas**.

## 6.4. ¿X.509 está disponible en Community?

La autenticación X.509 de clientes puede demostrarse en MongoDB Community 8.0. Esto no significa que todas las funciones empresariales de identidad, auditoría y cifrado de MongoDB estén presentes en Community. Hay que verificar las capacidades concretas, no inferirlas por la mera presencia de TLS o certificados.

---

# Unidad 7. LDAP, cifrado en reposo y controles operativos

## 7.1. LDAP: qué necesidad atendía

En organizaciones grandes, gestionar cuentas individuales por separado en cada sistema puede resultar complejo. Los directorios centralizados permiten que distintas aplicaciones se integren con una infraestructura común de identidades y grupos.

LDAP es un protocolo utilizado históricamente en esos entornos. MongoDB ofrece capacidades de integración empresarial, pero en MongoDB 8.0 la integración LDAP está marcada como obsoleta. **No la vamos a representar como un laboratorio ejecutable sobre nuestra imagen Community.**

Para un alumno principiante, la lección no es aprender a configurar un servidor LDAP ficticio a base de comandos que fallarán. Es distinguir:
- Cuentas locales de una base MongoDB.
- Autenticación mediante un directorio corporativo.
- Autorización mediante roles que deben seguir definirse apropiadamente.

La integración con identidad corporativa puede facilitar administración centralizada, pero no elimina la necesidad de diseñar permisos de acceso a datos.

## 7.2. Cifrado en reposo: otra superficie de amenaza

Ya aprendimos que TLS protege datos en tránsito. ¿Qué ocurre cuando MongoDB escribe archivos en un disco o un volumen? Si una copia del almacenamiento cae en manos no autorizadas, podemos necesitar cifrado **en reposo**.

Hay mecanismos diferentes que no deben confundirse:

1. **Cifrado del sistema de archivos, disco o volumen:** depende del sistema operativo o proveedor de almacenamiento. Puede proteger bloques almacenados según su configuración y gestión de claves.
2. **Cifrado nativo en reposo de MongoDB autogestionado:** mecanismo propio de determinadas ediciones empresariales, con requisitos de configuración y gestión de claves.
3. **Cifrado a nivel de campo o aplicación:** puede atender necesidades específicas de datos sensibles y modelos de acceso; requiere un diseño diferente.

Un volumen Docker no es una garantía de cifrado. Que la aplicación conecte por TLS no demuestra que los archivos locales estén cifrados.

## 7.3. Protección de secretos

Las contraseñas y las claves privadas no deberían colocarse dentro del código de ejemplos destinado a publicarse. Para un laboratorio efímero se puede utilizar un archivo `.env` ignorado por Git y certificados temporales generados localmente. Esa solución simplifica la clase, pero no representa una política completa de secretos para producción.

Una empresa necesita decisiones sobre custodia, rotación, acceso, revocación y recuperación de claves. Un archivo de certificado válido pero mal protegido puede ser una vía de acceso no autorizado.

## 7.4. Copias de seguridad y restauración

La seguridad también incluye **disponibilidad e integridad**. Una copia de seguridad no sirve de mucho si nadie ha comprobado que puede restaurarla. Las copias deben protegerse frente a lectura y modificación no autorizadas, y deben encajar con los objetivos de recuperación de la organización.

La clase no realizará una auditoría de continuidad de negocio, pero debes comprender la diferencia entre:
- Tener una copia que alguien dice haber creado.
- Tener una copia verificada mediante una restauración.
- Tener procedimientos para recuperar el servicio y controlar quién puede acceder a las copias.

## 7.5. Registros y auditoría de operaciones

Los mensajes de `mongod` ayudan a investigar errores de inicio, fallos de conexión y otros sucesos operativos. No equivalen por sí solos a un sistema completo de auditoría empresarial que registre todas las acciones con el alcance exigido por una política regulatoria.

No confundas:
- Un log que dice «el servidor se inició».
- Una prueba que muestra que una operación fue denegada.
- Una política de auditoría que demuestra qué actores realizaron acciones sensibles a lo largo del tiempo.

La primera es un dato de operación, la segunda es una prueba de permisos y la tercera exige mecanismos, configuración y conservación de evidencias específicos.

## 7.6. Una arquitectura segura se defiende por capas

Para cerrar el capítulo, imagina una aplicación de ventas con dos cuentas: una para consultar y otra para registrar pedidos. La base contiene información personal y debe estar protegida ante conexiones externas no deseadas.

Una respuesta responsable incluiría:
- limitar el acceso a los puertos según necesidades reales;
- exigir identidad a las cuentas;
- aplicar mínimo privilegio a cada proceso;
- proteger comunicaciones con TLS;
- gestionar secretos y certificados con procedimientos adecuados;
- estudiar el cifrado del almacenamiento y las copias;
- supervisar errores y operaciones sensibles;
- comprobar restauraciones y actualizar el software cuando corresponda.

Ninguna medida sustituye por completo a las otras. La seguridad no es un único interruptor de «activado».

### Preguntas de cierre

1. Una conexión a través de TLS funciona, pero el cliente no puede insertar. ¿Qué control debes investigar?
2. Un administrador ha escrito una contraseña en un script publicado. ¿Qué riesgo existe aunque la base requiera autenticación?
3. ¿Por qué el cifrado de un volumen no equivale automáticamente a cifrar cada dato antes de enviarlo a la aplicación?
4. ¿Qué demostrarías con una prueba positiva y negativa de `lectorlab`?
5. ¿Por qué no sería correcto afirmar que la práctica ha validado LDAP o el cifrado nativo en reposo en Community?

La práctica avanzada comenzará comprobando TLS como canal, continuará con la identidad X.509 y terminará con una operación de lectura permitida y una escritura denegada. Los detalles empresariales se estudiarán como arquitectura, no como resultados inventados.
