# Prácticas de seguridad de MongoDB 8.0
## Laboratorio 1 — Un lector puede consultar, pero no escribir

**Objetivo:** comprobar tres situaciones reales: lectura anónima rechazada; lectura autorizada al usuario `lectorlab`; intento de inserción rechazado para el mismo usuario.

### Paso 1 — Saber qué servidor utilizaremos

Este laboratorio usa `mongo-seguridad`, **no** `mongo-indices`. Se trata de dos instancias de MongoDB diferentes dentro del mismo proyecto. La base de datos se llama `curso_seguridad` y su colección de práctica, `secretos`.

Abre PowerShell o Terminal en la raíz del repositorio (debe existir `compose.yaml`). Si no has preparado `.env`, copia `.env.example` y cambia las contraseñas de demostración `MONGO_ADMIN_PASSWORD`, `LAB_READER_PASSWORD` y `LAB_WRITER_PASSWORD`. No uses contraseñas personales.

PowerShell:
```powershell
Copy-Item .env.example .env
```

Bash:
```bash
cp .env.example .env
```

### Paso 2 — Arrancar la instancia protegida

En PowerShell o Bash, no dentro de `mongosh`:

```bash
docker compose up -d --wait mongo-seguridad
docker compose ps
```

Comprueba que `mongo-seguridad` aparece en ejecución. Si cambias la contraseña en `.env` después de haber creado la instancia con otros datos persistentes, eso no actualiza automáticamente al usuario existente. Consulta con el formador antes de eliminar volúmenes.

### Paso 3 — Entrar como administrador

```bash
docker compose exec mongo-seguridad mongosh --username adminlab --authenticationDatabase admin --password
```

Introduce la clave de `MONGO_ADMIN_PASSWORD` cuando se solicite. Ahora estás dentro de `mongosh`. Confirma la conexión:

```javascript
db.adminCommand({ping:1})
```

Debe aparecer `ok:1`. Esto demuestra que el servidor responde, **no** que todas las cuentas ya existan.

### Paso 4 — Preparar un documento ficticio

Todavía dentro de `mongosh`:

```javascript
const curso = db.getSiblingDB("curso_seguridad")
curso.secretos.insertOne({
  _id: "demo-1",
  texto: "registro autorizado",
  clasificacion: "docente"
})
```

`getSiblingDB` selecciona otra base de datos sin cerrar tu conexión. `insertOne` crea un documento. Si aparece error de identificador duplicado, quizás realizaste antes la práctica: comprueba `curso.secretos.findOne({_id:"demo-1"})` y evita repetir la inserción.

### Paso 5 — Crear los usuarios con permisos diferentes

Con la conexión administrativa:

```javascript
curso.createUser({
  user:"lectorlab",
  pwd:passwordPrompt(),
  roles:[{role:"read",db:"curso_seguridad"}]
})
```

Introduce la contraseña reservada para el lector. Después:

```javascript
curso.createUser({
  user:"escritorlab",
  pwd:passwordPrompt(),
  roles:[{role:"readWrite",db:"curso_seguridad"}]
})
```

**Importante:** si los usuarios ya existen, MongoDB lo indicará. No los borres automáticamente; consulta al formador o comprueba su existencia con `curso.getUser("lectorlab")`.

`read` permite consultar documentos; `readWrite` permite además modificarlos en esa base de datos.

### Paso 6 — Intentar leer sin credenciales

Escribe `exit` para abandonar `mongosh`. De nuevo en PowerShell o Bash:

```bash
docker compose exec mongo-seguridad mongosh
```

Dentro del nuevo `mongosh` anónimo:

```javascript
db.getSiblingDB("curso_seguridad").secretos.findOne({_id:"demo-1"})
```

**Resultado esperado:** error de autorización. El hecho de poder establecer una conexión no equivale a tener permiso para leer. Anota el mensaje y explica qué control ha actuado. Después escribe `exit`.

### Paso 7 — Leer como usuario autorizado

Desde PowerShell o Bash:

```bash
docker compose exec mongo-seguridad mongosh --username lectorlab --authenticationDatabase curso_seguridad --password
```

Escribe la contraseña del lector. Dentro de `mongosh`:

```javascript
db.getSiblingDB("curso_seguridad").secretos.findOne({_id:"demo-1"})
```

**Resultado esperado:** aparece el documento con el texto `registro autorizado`. Esta vez se han cumplido dos condiciones: la identidad del lector es válida y su rol permite leer.

### Paso 8 — Provocar la denegación correcta

Sin salir de la sesión del lector, ejecuta:

```javascript
db.getSiblingDB("curso_seguridad").secretos.insertOne({
  _id:"prohibido",
  texto:"el lector no deberia poder crear esto"
})
```

**Resultado esperado:** error `Unauthorized` o equivalente. Esta es precisamente la protección que queríamos demostrar.

Si la inserción funciona, has encontrado un problema en la preparación: comprueba qué usuario está conectado y los roles que le fueron asignados. No continúes fingiendo que el ejercicio ha pasado.

### Paso 9 — Contrastar con el usuario escritor

Sal con `exit`. Conecta con la cuenta que sí debe escribir:

```bash
docker compose exec mongo-seguridad mongosh --username escritorlab --authenticationDatabase curso_seguridad --password
```

Dentro de `mongosh`:

```javascript
db.getSiblingDB("curso_seguridad").secretos.insertOne({
  _id:"permitido",
  texto:"el escritor si puede insertar"
})
```

**Resultado esperado:** inserción confirmada.

### Paso 10 — Registrar la evidencia y cerrar

| Prueba | Resultado correcto | Resultado observado |
|---|---|---|
| Anónimo intenta leer | Denegado | ____ |
| Lector intenta leer | Permitido | ____ |
| Lector intenta insertar | Denegado | ____ |
| Escritor intenta insertar | Permitido | ____ |

Explica por escrito por qué **no** sería correcto resolver la tercera prueba dando al lector permisos administrativos.

Sal de `mongosh` y detén el servicio desde la terminal:

```bash
docker compose stop mongo-seguridad
```

Esto conserva los datos del contenedor. No utilices `down --volumes` sin comprender que elimina volúmenes y datos de laboratorio.

**Siguiente práctica:** cifrado TLS y certificados X.509, comenzando por la diferencia entre canal seguro e identidad del cliente.
