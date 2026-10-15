# Prácticas de índices — MongoDB 8.0
## Laboratorio 1 — Una misma venta, dos formas de encontrarla

**Objetivo:** encontrar una venta concreta entre 200.000 documentos, medir la búsqueda sin índice y repetirla después de crearlo. Si nunca has utilizado Docker ni `mongosh`, puedes seguir los pasos sin adivinar qué consola utilizar.

### Antes de empezar: las tres piezas del laboratorio

- **Terminal:** PowerShell en Windows o Terminal en macOS/Linux. Aquí se escriben las órdenes `docker compose`.
- **Contenedor:** entorno aislado que ejecuta MongoDB. En este curso el servicio se llama `mongo-indices`.
- **mongosh:** consola que interpreta instrucciones de MongoDB. La ejecutaremos *dentro* del contenedor; no tienes que instalarla aparte.

Trabajaremos solo con documentos sintéticos; el archivo de carga **borra y recrea** la colección `curso_indices.ventas`. No uses estos scripts sobre bases de datos personales o empresariales.

### Paso 1 — Descargar el proyecto

Abre https://github.com/jaimecopilot/MONGODB, pulsa **Code → Download ZIP** y descomprímelo. Abre PowerShell o Terminal en su carpeta principal. Debes ver `compose.yaml` y `.env.example`. Si no los ves, probablemente has abierto una carpeta equivocada. En PowerShell puedes comprobarlo con `Get-ChildItem`; en Bash, con `ls`.

### Paso 2 — Preparar las variables locales

En PowerShell:

```powershell
Copy-Item .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

Abre `.env` y cambia `MONGO_ADMIN_PASSWORD` por una contraseña **solo para este laboratorio**. Aunque el servidor de índices no requiera autenticación, Docker Compose procesa la configuración de los otros servicios. No publiques `.env`.

### Paso 3 — Arrancar MongoDB

En la **terminal de tu ordenador**, no en MongoDB:

```bash
docker compose up -d --wait mongo-indices
docker compose ps
```

`up` crea o inicia el contenedor; `-d` lo deja funcionando en segundo plano; `--wait` comprueba que esté listo. La lista de `docker compose ps` debería mostrar `mongo-indices` en ejecución.

**Si Docker no responde:** abre Docker Desktop y comprueba que esté iniciado. Si recibes un mensaje de puerto ocupado, puede existir otro MongoDB local en el puerto 27017. No detengas servicios desconocidos: consulta al formador.

### Paso 4 — Crear 200.000 ventas

```bash
docker compose exec -T -e VENTAS=200000 mongo-indices mongosh --quiet --file /lab/01_cargar_ventas.js
```

La instrucción `exec` entra en un contenedor que ya existe. `VENTAS=200000` indica la cantidad de registros. `--file` indica a `mongosh` qué script ejecutar. La carpeta `/lab` está **dentro del contenedor** y corresponde a la carpeta `lab` del proyecto.

Espera a que aparezca la confirmación final. Puedes comprobar el número de registros con:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'db.getSiblingDB("curso_indices").ventas.countDocuments({})'
```

**Resultado esperado:** `200000`. Si obtienes cero, vuelve a leer los mensajes de la carga antes de continuar.

### Paso 5 — Ver que la venta existe

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.findOne({numero:199998}))'
```

Debe aparecer un documento con `numero: 199998`. ¿Por qué hemos hecho esto? Para separar dos preguntas: **¿es correcto el resultado?** y **¿cuánto cuesta obtenerlo?**. La primera ya tiene respuesta. Ahora investigaremos la segunda.

### Paso 6 — Medir ANTES del índice

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/02_antes.js
```

Este script se niega a trabajar si ya existen índices secundarios, para que no confundas un resultado preparado de antemano con la línea base.

Busca en su salida `COLLSCAN` y los contadores `nReturned`, `totalDocsExamined` y `totalKeysExamined`. Escribe los valores:

- Documentos encontrados: ______
- Documentos examinados: ______
- Claves examinadas: ______
- Etapa de búsqueda: ______

**Interpretación esperada:** encontrar una venta puede requerir examinar una parte enorme de la colección. No supongas que `nReturned=1` significa «se leyó un documento».

### Paso 7 — Crear el índice

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/03_crear_indices.js
```

Este script crea `ix_numero`, un índice único ascendente sobre `numero`, además de otros índices que servirán para clases posteriores. La instrucción esencial que aprenderemos es:

```javascript
db.ventas.createIndex({numero:1},{name:"ix_numero",unique:true})
```

`unique` exige que los números no se repitan. Esa restricción protege la integridad y es distinta del beneficio de búsqueda.

### Paso 8 — Medir DESPUÉS del índice

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/04_despues.js
```

Compara la salida con el paso 6. El script verificará que ahora la búsqueda por `numero` examina un documento. En el plan debes poder identificar `IXSCAN`.

| Dato | Antes | Después |
|---|---|---|
| Documentos encontrados | ___ | ___ |
| Documentos examinados | ___ | ___ |
| Claves examinadas | ___ | ___ |
| Plan predominante | ___ | ___ |

**Pregunta esencial:** si devolvemos la misma venta, ¿qué hemos ganado? Respuesta: podemos haber reducido enormemente el esfuerzo de localización. Los milisegundos son orientativos y dependen del ordenador.

### Paso 9 — Si algo no coincide

- `02_antes.js` informa de índices previos: ejecutaste el laboratorio antes. Repite el paso 4 para recuperar una colección sin índices; recuerda que la carga borra datos docentes e índices secundarios.
- No aparece el documento: comprueba que cargaste 200.000 ventas y buscaste por `numero`, sin tilde.
- `04_despues.js` falla: comprueba que completaste el paso 7 y que utilizas el mismo servicio `mongo-indices`.
- Error de conexión: ejecuta `docker compose ps` y después `docker compose logs --tail=80 mongo-indices`.

### Paso 10 — Conclusión y cierre

Escribe tres frases: (1) qué consulta hiciste; (2) qué trabajo realizó antes del índice; (3) qué cambió después. No basta con afirmar «el índice es más rápido».

Cuando termines:

```bash
docker compose stop mongo-indices
```

Este comando detiene el contenedor. No uses `docker compose down --volumes` salvo que quieras destruir los datos y volúmenes del laboratorio.

**Autoevaluación:** ¿qué ocurriría si ejecutaras la carga del paso 4 después de haber creado el índice? ¿Por qué es importante respetar el orden de esta práctica?
