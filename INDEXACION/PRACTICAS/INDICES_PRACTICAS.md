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


---

# Laboratorio 2 — Índices compuestos, orden de campos y ESR

## Qué vamos a hacer

La persona responsable de ventas quiere **las diez ventas pagadas más recientes que superan los 500 euros**. Nuestra tarea no es copiar índices al azar. Vamos a escribir la consulta, comprobar que los resultados cumplen el encargo, elegir dos índices candidatos y comparar el trabajo real que exigen.

**Duración:** esta actividad no está limitada a una cifra fija de minutos. Avanza cuando hayas comprendido el resultado de cada paso.

### Requisitos y advertencias

Debes tener el repositorio del curso en tu ordenador, Docker en funcionamiento y la instancia `mongo-indices` preparada.

Esta práctica **continúa la anterior**: allí cargaste 200.000 ventas y ejecutaste `03_crear_indices.js`. Si acabas de empezar en un entorno limpio, abre la práctica 1 y sigue sus pasos de preparación, carga y creación de índices **antes** de continuar.

**Nunca vuelvas a ejecutar `01_cargar_ventas.js` a mitad de esta práctica**: borrarías la colección y perderías sus índices, cambiando el experimento.

## PASO 1 — Comprobar que estamos trabajando en el lugar correcto

Abre PowerShell, Terminal o Bash **en la carpeta del repositorio** y ejecuta:

```bash
docker compose ps
```

Debes ver el servicio `mongo-indices` en ejecución. Si está detenido:

```bash
docker compose up -d --wait mongo-indices
```

No necesitas entrar a mano en `mongosh` para estos primeros pasos: pasaremos expresiones mediante `--eval` desde la terminal.

Comprueba el número de ventas:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'db.getSiblingDB("curso_indices").ventas.countDocuments({})'
```

**Resultado esperado:** `200000` si mantuviste la carga de la primera práctica. Si aparece cero, aún no hay datos. Si aparece otro número que tú preparaste, puedes continuar, pero no compares tus cifras absolutas con las de un compañero con 200.000 ventas.

## PASO 2 — Confirmar que los campos existen

Pide a MongoDB un documento de ejemplo:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.findOne({estado:"pagada"}))'
```

Localiza `estado`, `fecha` e `importe`. Observa que:

- `estado` es una cadena con valores como `pagada`.
- `fecha` es una fecha almacenada como tipo fecha.
- `importe` es numérico, de modo que podemos hacer comparaciones mayores/menores.

**No avances si alguno de esos campos no aparece**: puede que estés en otra base de datos o que uses un conjunto de documentos diferente.

## PASO 3 — Traducir el pedido de negocio a una consulta

El encargo tiene cuatro partes:

| Requisito | Expresión MongoDB |
|---|---|
| Solo pagadas | `estado:"pagada"` |
| Importe superior a 500 | `importe:{$gt:500}` |
| Más recientes primero | `sort({fecha:-1})` |
| Solo diez | `limit(10)` |

Para no confundir la consulta con el comando de Docker, la ejecutaremos como archivo en el paso siguiente. Antes, intenta leer mentalmente esta expresión:

```javascript
db.ventas
  .find({estado:"pagada",importe:{$gt:500}})
  .sort({fecha:-1})
  .limit(10)
```

Si dices «busca todas las ventas y luego imprime las que quiera», todavía falta precisión: la consulta filtra por **dos condiciones** y ordena antes de limitar.

## PASO 4 — Contar cuántas ventas cumplen las condiciones

Ejecuta en tu terminal:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'print(db.getSiblingDB("curso_indices").ventas.countDocuments({estado:"pagada",importe:{$gt:500}}))'
```

La cifra representa todas las ventas pagadas que superan el umbral. **No tienen por qué ser solo diez**: el límite de diez se aplica después, cuando pidamos una lista de las más recientes.

Escribe el número obtenido: __________.

¿Por qué hacemos esta comprobación? Si apenas hubiera tres documentos que cumplen la condición, elegir un índice para ordenar millones de candidatos sería una preocupación muy distinta a la de una colección con miles de coincidencias.

## PASO 5 — Reconocer el índice que ya existe

El archivo `lab/03_crear_indices.js` crea, entre otros, este índice:

```javascript
{estado:1,fecha:-1,importe:1}
```

Su nombre en nuestro proyecto es `ix_esr`. Comprueba su existencia:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.getIndexes().filter(x=>x.name==="ix_esr"))'
```

Deberías ver una definición que contiene `estado`, `fecha` e `importe`, en ese orden. Si la salida es `[]`, el índice no existe. Vuelve a los pasos de la práctica anterior: probablemente no ejecutaste `03_crear_indices.js` o recargaste después las ventas.

## PASO 6 — Comparar orden ESR y ERS

Vamos a utilizar un script nuevo:

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/15_compuestos_guiado.js
```

**Antes de ejecutarlo**, comprende qué hará:

1. Verificará que existe la colección y el índice `ix_esr`.
2. Creará el índice alternativo `ix_ers_practica` con `{estado:1,importe:1,fecha:-1}`.
3. Ejecutará **la misma consulta** dos veces, una obligando a usar cada índice mediante `hint`.
4. Comprobará que ambas variantes devuelven diez ventas que cumplen los filtros y que las fechas están ordenadas de manera descendente. Si varias ventas comparten fecha, **los identificadores concretos pueden variar legítimamente**: la consulta no ha establecido cómo resolver los empates.
5. Imprimirá un resumen de `executionStats` para poder comparar el trabajo efectuado.

El script no borra las ventas. Añade un índice de laboratorio, que puedes consultar o eliminar más tarde.

### Cómo leer el resultado

Busca dos bloques etiquetados `ESR` y `ERS`. En cada uno anota:

| Dato | ESR | ERS |
|---|---:|---:|
| `nReturned` | ____ | ____ |
| `totalDocsExamined` | ____ | ____ |
| `totalKeysExamined` | ____ | ____ |
| ¿Aparece una etapa `SORT`? | ____ | ____ |
| `executionTimeMillis` | ____ | ____ |

**Importante:** no te he dado números fijos de tiempo; no sería riguroso prometerlos. Los valores obtenidos son los de tu ejecución, no una puntuación a aprobar.

## PASO 7 — Entender la diferencia sin memorizar la sigla

El índice ESR agrupa primero por `estado`, dentro de ese grupo organiza `fecha` en orden descendente y deja `importe` como tercera clave. Eso facilita recuperar documentos ya ordenados por fecha cuando conoces el estado, aunque el rango de importes no se pueda reducir tan eficazmente como cuando aparece antes.

El índice ERS agrupa por `estado` y después por `importe`. Puede localizar un rango de importes más directamente, pero el orden global por `fecha` entre distintos importes puede requerir una ordenación adicional.

**Pregunta clave:** ¿cuál ha examinado menos claves? ¿Cuál evita una operación de ordenación adicional? ¿Es el mismo índice el mejor en ambas métricas? Elige según los datos y el uso, no según un eslogan.

## PASO 8 — Comprobar que ningún índice ha cambiado la respuesta

El script confirma que **ambas variantes obedecen la consulta**: diez ventas pagadas, con importe superior a 500, en orden descendente de fecha.

¿Por qué importa esa comprobación? Porque una optimización **no puede cambiar el significado de la consulta**. Debe seguir representando «diez ventas pagadas de más de 500 euros, ordenadas de más reciente a más antigua». Eso no garantiza que el límite seleccione los mismos identificadores entre ventas empatadas en fecha.

**Sutileza importante:** varias ventas pueden compartir exactamente la misma fecha. `sort({fecha:-1})` no especifica qué venta debe aparecer primero dentro de un empate. Si los dos planes eligen documentos diferentes con la misma fecha límite, eso no demuestra pérdida de datos ni un error de índice. Para un orden total estable podrías pedir `sort({fecha:-1,numero:1})`, pero entonces también tendrías que estudiar índices que incluyan ese segundo campo de ordenación. Lo haremos en una práctica posterior.

## PASO 9 — Errores habituales

- **El script dice que falta `ix_esr`:** ejecuta la práctica anterior hasta el paso de creación de índices.
- **Dice que no hay ventas:** completa la carga de datos; no crees índices sobre una colección vacía fingiendo un experimento de 200.000 registros.
- **Aparece otra cantidad de resultados:** comprueba el estado y el filtro por importe, y que consultaste el servidor correcto.
- **Hay una operación `SORT` en ERS:** no es un fallo del script; es precisamente una característica posible del plan.
- **El tiempo cambia al repetirlo:** es normal; por eso usamos también los contadores de documentos y claves.
- **Falló la creación del índice:** revisa el texto del error y el espacio disponible. No borres todos los índices ni la colección para solucionar un error que no comprendes.

## PASO 10 — Retomar el control

Al terminar, puedes examinar los dos índices:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.getIndexes().filter(x=>["ix_esr","ix_ers_practica"].includes(x.name)))'
```

No borres `ix_esr` porque forma parte de los ejercicios siguientes. Si deseas eliminar exclusivamente el índice creado para la comparación:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'db.getSiblingDB("curso_indices").ventas.dropIndex("ix_ers_practica")'
```

Después puedes detener `mongo-indices` con `docker compose stop mongo-indices`. Si vas a continuar, déjalo funcionando.

## Actividad de comprensión

Explica, con un ejemplo de tus ventas, cómo responderías a alguien que afirma:

> «Siempre hay que poner primero el campo más selectivo y dejar la fecha al final».

Tu respuesta debe distinguir igualdad, rango, ordenación y el volumen de candidatos. No se acepta como justificación repetir simplemente «porque lo dice ESR».

**Siguiente tema:** un índice multikey para un campo que contiene una lista de etiquetas, y por qué ese índice es distinto de uno sobre un valor escalar.


---

# Laboratorio 3 — Buscar etiquetas de ventas y palabras dentro de descripciones

## Qué aprenderás y por qué importa

La primera práctica localizaba una venta mediante un número. Pero una tienda también puede pedir «todas las ventas etiquetadas como urgentes» o «descripciones que hablen de café». Son problemas distintos de la búsqueda exacta por número.

El objetivo es comprender cómo MongoDB busca valores dentro de arrays, qué significa un índice multikey y por qué un índice de texto clásico no equivale a buscar un campo por igualdad.

### Paso 1. Verificar datos y conexión

Abre PowerShell o Bash dentro de la carpeta del repositorio. Si detuviste MongoDB:

```bash
docker compose up -d --wait mongo-indices
```

Comprueba que la colección `curso_indices.ventas` contiene datos:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'print(db.getSiblingDB("curso_indices").ventas.countDocuments({}))'
```

Si devuelve cero, vuelve a la primera práctica y carga las ventas ficticias. No continúes interpretando una búsqueda sobre datos inexistentes.

### Paso 2. Observar qué significa tener un array

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.findOne({numero:1}))'
```

Localiza la propiedad `etiquetas`. En el conjunto sintético tiene varios valores, por ejemplo una etiqueta general y otra que indica si la venta procede de la web. Algunos documentos incluyen `urgente`.

**Pregunta previa:** ¿crees que `etiquetas` es una cadena única como `"web,urgente"` o una lista de valores separados? La diferencia es importante: MongoDB reconoce sus elementos como valores independientes dentro de un array.

### Paso 3. Consultar un valor contenido en la lista

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'print(db.getSiblingDB("curso_indices").ventas.countDocuments({etiquetas:"urgente"}))'
```

La consulta no pide que el array sea exactamente igual a `"urgente"`. Pide documentos donde ese valor aparezca como elemento del campo array. Anota el número de coincidencias: ______.

### Paso 4. Verificar que existe el índice multikey

En la primera práctica, `03_crear_indices.js` creó `ix_etiquetas`:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.getIndexes().filter(i=>i.name==="ix_etiquetas"))'
```

Deberías observar la clave `etiquetas:1`. Como el campo contiene arrays en nuestros documentos, el índice funciona como multikey.

Ahora ejecuta una consulta forzando el índice **solo para estudiar el plan**:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.find({etiquetas:"urgente"}).hint("ix_etiquetas").limit(3).explain("executionStats").executionStats)'
```

Busca `nReturned`, `totalDocsExamined` y `totalKeysExamined`. Pueden existir más claves que resultados: los arrays contribuyen a las entradas del índice. No confundas eso con documentos duplicados almacenados.

### Paso 5. Comprender por qué dos condiciones pueden pertenecer a elementos diferentes

Imagina la siguiente venta:

```javascript
{
  productos: [
    { sku: "SKU10", cantidad: 1 },
    { sku: "SKU20", cantidad: 3 }
  ]
}
```

Si buscamos por `productos.sku:"SKU10"` y `productos.cantidad:3` como dos condiciones independientes, cada condición puede satisfacerse en elementos distintos de ese array.

Para expresar que **el mismo elemento** debe tener ambas propiedades, usamos:

```javascript
{
  productos: {
    $elemMatch: { sku: "SKU10", cantidad: 3 }
  }
}
```

**La segunda consulta no debería encontrar el documento mostrado**, porque el producto SKU10 tiene cantidad 1 y no 3. Este ejemplo demuestra una diferencia de significado, no simplemente un truco para optimizar rendimiento.

### Paso 6. Probar la distinción sin alterar las ventas

Este experimento utiliza una colección temporal diferente de `ventas`. Entra en `mongosh`:

```bash
docker compose exec mongo-indices mongosh --quiet
```

Dentro de `mongosh` introduce estas instrucciones de una en una:

```javascript
const d = db.getSiblingDB("curso_indices");
d.productos_ejemplo.drop();
d.productos_ejemplo.insertOne({
  _id: 1,
  productos: [
    {sku:"SKU10",cantidad:1},
    {sku:"SKU20",cantidad:3}
  ]
});
```

La llamada `drop()` elimina **solo la colección de prueba `productos_ejemplo`**. No afecta a `ventas`. Ahora comprueba:

```javascript
d.productos_ejemplo.find({
  "productos.sku":"SKU10",
  "productos.cantidad":3
}).toArray()
```

Observa que la primera consulta puede encontrar el documento: la existencia de SKU10 y la existencia de cantidad 3 se verifican sin obligar a que correspondan al mismo elemento.

Después:

```javascript
d.productos_ejemplo.find({
  productos:{$elemMatch:{sku:"SKU10",cantidad:3}}
}).toArray()
```

El resultado debe ser un array vacío. **Si entiendes por qué las salidas difieren, ya has comprendido la razón de utilizar `$elemMatch`.**

Puedes salir de `mongosh` escribiendo `exit`.

### Paso 7. Pasar de etiquetas a palabras de una descripción

Ahora queremos buscar ventas cuya descripción incluya el término `cafe`. No lo buscamos como valor exacto del campo completo.

Comprueba primero que hay descripciones de café:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.findOne({descripcion:"cafe premium en grano"}))'
```

La primera práctica crea también un índice de tipo `text` sobre `descripcion`. Comprueba su existencia mediante `getIndexes()` antes de utilizar el operador `$text`.

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'print(db.getSiblingDB("curso_indices").ventas.countDocuments({$text:{$search:"cafe"}}))'
```

**Resultado esperado:** una cifra positiva. MongoDB busca el término mediante el mecanismo de búsqueda textual clásico. Esto no es lo mismo que `find({descripcion:"cafe"})`, que busca igualdad del valor completo.

### Paso 8. Interpretar una puntuación textual

Si quieres observar la puntuación de coincidencia:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.find({$text:{$search:"cafe"}},{descripcion:1,score:{$meta:"textScore"}}).sort({score:{$meta:"textScore"}}).limit(3).toArray())'
```

Busca `descripcion` y `score`. La puntuación sirve para ordenar relevancia textual según el mecanismo disponible; **no es una nota de calidad humana ni un porcentaje de certeza**.

### Paso 9. Resolver errores sin improvisar

- **El operador `$text` dice que falta índice:** todavía no has ejecutado `03_crear_indices.js`, o recargaste ventas posteriormente.
- **`getIndexes()` devuelve solo `_id_`:** estás en la línea base de la primera práctica. Crea primero los índices.
- **La búsqueda de café devuelve cero:** examina una descripción real y revisa la configuración de idioma del índice; no supongas que cualquier búsqueda literal funciona igual.
- **`$elemMatch` no devuelve el documento:** en este ejemplo es el resultado correcto, no un error de MongoDB.

### Tu explicación final

Redacta por qué estas tres consultas no son equivalentes:

```javascript
{ etiquetas: "urgente" }
{ descripcion: "cafe" }
{ $text: { $search: "cafe" } }
```

Y explica qué diferencia de significado introduce `$elemMatch` cuando el campo contiene documentos anidados en un array.

---

# Laboratorio 4 — Distancias, coordenadas e índice hashed

## Propósito

La empresa tiene puntos de entrega y quiere responder «¿cuáles están cerca de esta dirección?». También necesita recuperar rápidamente ventas de un grupo concreto mediante una consulta por igualdad.

A primera vista ambos problemas parecen búsquedas, pero requieren estructuras distintas: `2dsphere` para determinadas consultas geográficas y `hashed` para igualdad sobre un valor transformado.

### Paso 1. Preparar los datos

En la terminal de tu ordenador:

```bash
docker compose up -d --wait mongo-indices
```

Abre `mongosh` dentro del contenedor:

```bash
docker compose exec mongo-indices mongosh --quiet
```

A partir de este punto, los fragmentos JavaScript se escriben dentro de `mongosh`, no en PowerShell.

### Paso 2. Crear tres ubicaciones conocidas

```javascript
const d = db.getSiblingDB("curso_indices");
d.puntos_entrega_clase.drop();
d.puntos_entrega_clase.insertMany([
  {
    nombre:"Sol",
    ubicacion:{type:"Point",coordinates:[-3.7038,40.4168]}
  },
  {
    nombre:"Retiro",
    ubicacion:{type:"Point",coordinates:[-3.6833,40.4153]}
  },
  {
    nombre:"Barcelona",
    ubicacion:{type:"Point",coordinates:[2.1700,41.3800]}
  }
]);
```

`drop()` borra exclusivamente la colección de ejemplo `puntos_entrega_clase`. Las coordenadas están escritas como **longitud primero, latitud después**. Son puntos aproximados utilizados para explicar la consulta; no constituyen una aplicación de navegación real.

### Paso 3. Crear el índice apropiado

```javascript
d.puntos_entrega_clase.createIndex(
  {ubicacion:"2dsphere"},
  {name:"ix_puntos_esfera"}
);
```

El término `2dsphere` declara el tipo geoespacial adecuado para la geometría usada. Es diferente de un índice normal `{ubicacion:1}`, que no comprende por sí solo las operaciones sobre puntos terrestres.

### Paso 4. Buscar puntos próximos

```javascript
d.puntos_entrega_clase.find({
  ubicacion:{
    $near:{
      $geometry:{
        type:"Point",
        coordinates:[-3.7038,40.4168]
      },
      $maxDistance:3500
    }
  }
}).toArray()
```

Léela de fuera hacia dentro: buscar documentos, filtrar por ubicación cercana a un punto de referencia y exigir una distancia máxima aproximada de 3.500 metros.

**Resultado esperado:** Sol y Retiro; no Barcelona. Si la consulta encuentra también Barcelona, examina si intercambiaste las coordenadas o utilizaste una distancia absurda.

### Paso 5. Demostrar qué problema NO resuelve el índice

Esta consulta no puede decirte automáticamente qué ruta debe seguir un repartidor, cuánto tráfico existe o cuánto tardará en llegar. El índice ayuda a buscar puntos próximos **geométricamente**. Calcular un trayecto por calles es otra aplicación y necesita otra información.

Anota: ¿qué diferencia hay entre «a 2 km en línea recta» y «a 2 km por carretera»?

### Paso 6. Conocer los índices hashed

La colección de ventas incluye `idGrupo`. El archivo `03_crear_indices.js` añade un índice hashed sobre ese campo. Comprueba que existe:

```javascript
d.ventas.getIndexes().filter(x=>x.name==="ix_grupo_hash")
```

Si aparece la definición con `"hashed"`, realiza una búsqueda por igualdad:

```javascript
d.ventas.find({idGrupo:809}).hint("ix_grupo_hash").limit(3).toArray()
```

Debes ver ventas cuyo `idGrupo` sea 809. Ahora explica por qué este índice **no está pensado para recorrer de forma ordenada los grupos 800 a 900**: el hash representa valores sin conservar necesariamente su proximidad numérica original.

### Paso 7. Interpretar el plan

```javascript
d.ventas.find({idGrupo:809})
  .hint("ix_grupo_hash")
  .limit(3)
  .explain("executionStats")
```

Observa si el plan usa un índice y cuántas claves/documentos examina. `hint` se utiliza en esta demostración para estudiar un índice concreto. No es una recomendación de forzar siempre un acceso en producción.

### Paso 8. Cerrar y justificar

Sal de `mongosh` escribiendo `exit`. Resume:
- qué pregunta resolvió `2dsphere`;
- qué significado tienen las coordenadas;
- qué pregunta resuelve bien `hashed`;
- por qué ninguna de las dos estructuras sustituye automáticamente a un índice ordenado convencional por número.

**Error habitual:** confundir «hashed» con contraseña cifrada. Un índice hashed organiza claves mediante un cálculo hash; no protege por sí mismo secretos personales.


---

# Laboratorio 5 — Impedir duplicados y caducar sesiones: índices unique y TTL

## Dos problemas que no son simplemente «buscar rápido»

La empresa tiene dos necesidades nuevas. Quiere impedir que un mismo correo electrónico aparezca repetido entre las cuentas de un ejercicio, y quiere que ciertos registros de sesión desaparezcan cuando llegue su fecha de caducidad. Son reglas sobre **integridad** y **ciclo de vida de datos**.

No debemos deducir que todo índice se crea solo para acelerar una consulta. Algunos índices también ayudan a aplicar reglas sobre qué datos pueden existir o cuándo deben eliminarse.

### Paso 1. Preparación y consecuencias

Abre PowerShell o Bash en la raíz del repositorio. Si la instancia está detenida, arráncala:

```bash
docker compose up -d --wait mongo-indices
```

Este ejercicio utiliza dos colecciones separadas de las ventas principales:
- `curso_indices.unicidad_demo` para la prueba de duplicados;
- `curso_indices.sesiones_demo` para probar caducidad.

El script que vas a ejecutar borra y recrea esas dos **colecciones didácticas**. No borra `curso_indices.ventas`. Asegúrate de no haber guardado en ellas datos propios que quieras conservar.

### Paso 2. Entender la regla de unicidad

El correo ficticio `unico@ejemplo.test` debe aparecer una sola vez. Dentro de `mongosh` podríamos crear el índice así:

```javascript
db.getSiblingDB("curso_indices").unicidad_demo.createIndex(
  {email:1},
  {unique:true}
)
```

No significa «el campo email es obligatorio para cualquier aplicación». Significa que MongoDB aplicará la semántica de unicidad de ese índice a los documentos de esa colección. Si el campo puede faltar o ser nulo, el diseño requiere reglas adicionales que estudiaremos por separado.

### Paso 3. Ejecutar una prueba que DEBE fallar

En tu terminal, ejecuta:

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/06_unique_ttl.js
```

El script:
1. Prepara `unicidad_demo`.
2. Crea un índice único por `email`.
3. Inserta un documento con correo `unico@ejemplo.test`.
4. Intenta insertar otro con el mismo correo.
5. Confirma que MongoDB **rechaza** el segundo intento, en vez de ocultar el error.

Busca el mensaje `E11000` o una confirmación equivalente de que el duplicado fue rechazado.

**Interpretación:** la primera inserción es correcta. La segunda debe fallar porque contradice la regla que definimos. No es una avería del contenedor.

### Paso 4. Explicar la diferencia entre resultado previsto y avería

Anota cuál de estas situaciones demostraría que todo funciona:
- A) Se insertan ambos correos idénticos y el script termina sin error.
- B) Se inserta el primero, se rechaza el segundo y el script confirma el rechazo.
- C) No se inserta ninguno porque la conexión a MongoDB está cortada.

La respuesta es **B**. La situación C no es una prueba de unicidad porque nunca llegamos a comprobar la regla de negocio.

### Paso 5. Preparar TTL

El mismo script crea `sesiones_demo` e introduce dos documentos:
- uno cuya fecha `expiraEn` ya pasó;
- otro con una fecha futura.

También crea:

```javascript
db.getSiblingDB("curso_indices").sesiones_demo.createIndex(
  {expiraEn:1},
  {expireAfterSeconds:0}
)
```

¿Por qué cero? Porque el campo almacena directamente **la fecha absoluta de caducidad**. El cero no significa que cualquier sesión desaparezca al insertarse; significa que queda elegible para eliminarse cuando se alcanza su fecha de expiración.

### Paso 6. ¿Por qué todavía vemos el registro vencido?

La eliminación no es instantánea: MongoDB utiliza un monitor TTL que funciona periódicamente. Si consultas la colección justo después de crearla y todavía ves el documento vencido, no concluyas inmediatamente que el índice no sirve.

Ejecuta una prueba con margen de espera:

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/07_ver_ttl.js
```

Ese archivo consulta periódicamente la colección y termina con un error si el registro vencido no desaparece dentro del límite previsto para el laboratorio. También verifica que el registro con fecha futura se conserva.

**Resultado esperado:** confirmación de que el vencido desapareció y el vigente permanece. Si no lo consigues, revisa que el servidor esté funcionando y que el campo sea de tipo fecha BSON.

### Paso 7. Comprobar directamente la colección

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").sesiones_demo.find().toArray())'
```

Deberías ver el documento vigente. Escribe qué campos te permiten concluir que no debería estar caducado.

### Paso 8. Por qué no debemos confiar en TTL para autorizar una sesión

Imagina que la aplicación comprueba «si el documento existe, la sesión está autorizada». Como el monitor puede tardar en eliminarlo, ese razonamiento es incorrecto: un registro puede existir un breve tiempo aunque su fecha ya haya pasado. La aplicación también debe comprobar la expiración cuando concede acceso.

**TTL es un mecanismo de limpieza automática, no una sustitución completa de la lógica de validez de una sesión.**

### Paso 9. Autocomprobación

1. ¿Por qué la segunda inserción duplicada debe producir un error?
2. Si el documento está caducado a las 10:30, ¿debe desaparecer exactamente a las 10:30:00?
3. ¿Qué ocurriría si `expiraEn` se almacena como una cadena y no como fecha?
4. ¿Cuál es la diferencia entre un índice unique y un índice TTL?

---

# Laboratorio 6 — Consultas cubiertas y mantenimiento de índices

## 6.1. Nuestro problema ahora es leer menos información

La empresa solicita una lista muy sencilla: identificadores de cliente e importes de sus ventas. No necesita las descripciones, etiquetas, productos ni información de ubicación.

Hasta ahora buscábamos el documento y después examinábamos si cumplía las condiciones. Un índice adecuado puede permitir responder una consulta pequeña **desde sus propias claves**, sin traer el documento completo.

### Paso 1. Entender la consulta y su proyección

Con la instancia `mongo-indices` en marcha, abre `mongosh`:

```bash
docker compose exec mongo-indices mongosh --quiet
```

Dentro de él:

```javascript
const c = db.getSiblingDB("curso_indices").ventas;
c.find(
  {clienteId:809},
  {_id:0,clienteId:1,importe:1}
).limit(3).toArray()
```

El primer objeto es el **filtro**, el segundo es la **proyección**: especifica los campos que queremos ver. `_id:0` excluye expresamente el identificador, que podría impedir una cobertura si el índice no lo contiene.

### Paso 2. Crear un índice que contenga lo necesario

```javascript
c.createIndex(
  {clienteId:1,importe:1},
  {name:"ix_cubierta_cliente_importe"}
)
```

Hemos elegido esos dos campos porque aparecen en el filtro y en la proyección. No hemos añadido la descripción ni las etiquetas porque la consulta no las necesita.

### Paso 3. Observar el coste

```javascript
const e = c.find(
  {clienteId:809},
  {_id:0,clienteId:1,importe:1}
).hint("ix_cubierta_cliente_importe")
 .limit(3)
 .explain("executionStats");
printjson({
  devueltos:e.executionStats.nReturned,
  documentosExaminados:e.executionStats.totalDocsExamined,
  clavesExaminadas:e.executionStats.totalKeysExamined
});
```

**Resultado esperado para esta consulta diseñada como cubierta:** `documentosExaminados` puede ser cero. No significa que no haya hecho trabajo; ha recorrido claves del índice.

### Paso 4. Romper deliberadamente la cobertura

Ahora pedimos un campo que el índice no contiene:

```javascript
const otro = c.find(
  {clienteId:809},
  {_id:0,clienteId:1,importe:1,descripcion:1}
).hint("ix_cubierta_cliente_importe")
 .limit(3)
 .explain("executionStats");
printjson({
  devueltos:otro.executionStats.nReturned,
  documentosExaminados:otro.executionStats.totalDocsExamined,
  clavesExaminadas:otro.executionStats.totalKeysExamined
});
```

Compara con el paso anterior. Al pedir `descripcion`, MongoDB puede necesitar recuperar documentos para obtener ese dato. Esa diferencia explica el sentido de `FETCH`.

**No concluyas que añadir todas las columnas al índice sería siempre mejor.** Índices más grandes ocupan espacio y requieren mantenimiento cuando cambian los datos.

### Paso 5. Hacer inventario de índices

```javascript
c.getIndexes()
```

Busca nombres, campos y opciones. Un índice puede existir sin que el optimizador lo utilice para la consulta que acabas de ejecutar. Esta lista no sustituye las estadísticas de `explain`.

### Paso 6. Ocultar un índice con intención pedagógica

Prueba a ocultar **solo el índice creado por ti en este laboratorio**:

```javascript
c.hideIndex("ix_cubierta_cliente_importe")
```

Si ahora intentas forzar su uso mediante `hint`, el motor puede rechazarlo porque el índice está oculto al planificador. No debemos interpretar eso como que el índice fue eliminado: sigue existiendo y debe mantenerse.

Vuelve a mostrarlo:

```javascript
c.unhideIndex("ix_cubierta_cliente_importe")
```

Comprueba con `getIndexes()` que el estado vuelve a ser visible.

### Paso 7. Una retirada controlada

Si has terminado y no vas a reutilizar este índice, puedes eliminar **solo** el que creaste aquí:

```javascript
c.dropIndex("ix_cubierta_cliente_importe")
```

Eso reduce el conjunto de índices disponibles, pero en una base real implicaría analizar qué consultas lo utilizan antes de borrar nada. No elimines `ix_numero` o `ix_esr`: siguen siendo parte del recorrido de aprendizaje.

### Paso 8. Tu conclusión

Explica con tus palabras:
- qué significa una proyección;
- por qué excluir `_id` puede resultar importante;
- qué demuestra `totalDocsExamined:0` y qué **no** demuestra;
- por qué ocultar no es lo mismo que eliminar;
- qué riesgos introduce acumular índices indiscriminadamente.

**Siguiente desafío:** repetir el experimento de índices simples con un millón de ventas, conservando idéntico filtro y registrando las métricas de ambos volúmenes.


---

# Laboratorio 7 — La misma búsqueda con 200.000 y un millón de ventas

## Qué queremos demostrar

Hemos dicho que un índice puede evitar que MongoDB examine enormes cantidades de documentos para encontrar uno. ¿Sigue siendo relevante cuando la colección pasa de 200.000 a **1.000.000 de ventas**?

Vamos a responder mediante una experiencia repetible. No vamos a utilizar cronómetros manuales ni proclamar que la consulta es «x veces más rápida». Recogeremos el número real de documentos y claves examinados antes y después de crear un índice.

Este laboratorio **se realiza al final** de las prácticas de índices porque el script de carga borra y recrea la colección `curso_indices.ventas`. No ejecutes la carga si deseas conservar los índices que preparaste para ejercicios anteriores.

### Paso 1. Conservar las observaciones anteriores

Antes de modificar datos, copia en tu cuaderno las métricas registradas en el Laboratorio 1 con 200.000 ventas:

| Métrica | Sin índice | Con índice |
|---|---:|---:|
| `nReturned` | ______ | ______ |
| `totalDocsExamined` | ______ | ______ |
| `totalKeysExamined` | ______ | ______ |
| `executionTimeMillis` | ______ | ______ |

Si no guardaste esos datos, no los inventes. Puedes repetir la primera práctica completa y anotar las cifras antes de pasar al millón.

**Lo importante:** registra valores medidos, no valores sugeridos por otra persona. El número 200.000 indica el volumen cargado, no que cualquier plan vaya a examinar exactamente esa cantidad.

### Paso 2. Comprobar recursos y servicio

Cargar un millón de documentos requiere más tiempo y espacio que cargar 200.000. Asegúrate de disponer de suficiente almacenamiento y memoria para Docker. Durante el proceso verás mensajes de progreso; no interpretes que una carga de muchos documentos está rota solo porque tarda más que la primera.

Desde tu terminal en la carpeta principal:

```bash
docker compose up -d --wait mongo-indices
docker compose ps
```

Si el servicio no arranca, consulta `docker compose logs --tail=80 mongo-indices`. No intentes medir consultas hasta que la instancia esté preparada.

### Paso 3. Recargar la colección con un millón de documentos

```bash
docker compose exec -T -e VENTAS=1000000 mongo-indices mongosh --quiet --file /lab/01_cargar_ventas.js
```

**Esta operación es destructiva para la colección de práctica.** Elimina `curso_indices.ventas` y la reconstruye con un millón de ventas sintéticas. Si estabas investigando un índice específico, tendrás que volver a crearlo cuando lo necesites.

Mientras se ejecuta, fíjate en los mensajes de avance. No cierres la terminal antes de que el proceso termine o informe de un error.

### Paso 4. Verificar que no estamos comparando una carga parcial

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'print(db.getSiblingDB("curso_indices").ventas.countDocuments({}))'
```

Esperamos `1000000`. Si la cifra es menor, revisa el paso de carga. No continúes: el experimento depende del tamaño de la colección.

Comprueba también que no existen índices secundarios:

```bash
docker compose exec -T mongo-indices mongosh --quiet --eval 'printjson(db.getSiblingDB("curso_indices").ventas.getIndexes())'
```

En una colección recién cargada por nuestro script debe encontrarse únicamente `_id_`. Si ves índices adicionales, la línea base se ha contaminado y el script `02_antes.js` lo señalará.

### Paso 5. Repetir la medición SIN índice secundario

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/02_antes.js
```

El script elige automáticamente una venta próxima al final de la colección. Con un millón de ventas, el valor buscado se ajusta al volumen, de modo que sigue siendo un documento existente.

Anota el plan y los contadores. No confundas que `nReturned` sea 1 con que el motor solo haya examinado 1 documento.

### Paso 6. Crear los índices de prácticas

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/03_crear_indices.js
```

El primer índice por `numero` ayuda a localizar la venta exacta; el script también prepara otros índices de las prácticas. Comprueba que aparece `ix_numero` en el listado.

**Pregúntate:** ¿por qué crear un índice tarda más sobre un millón de documentos que sobre veinte? Porque el servidor debe procesar un volumen mayor de datos y construir la nueva estructura.

### Paso 7. Repetir la medición CON índice

```bash
docker compose exec -T mongo-indices mongosh --quiet --file /lab/04_despues.js
```

Observa el cambio de plan y de documentos examinados. Para la búsqueda exacta por número, esperamos que un índice útil reduzca de manera drástica los documentos candidatos y que la operación encuentre la misma venta solicitada.

Completa tu segunda tabla:

| Métrica | 1.000.000 sin índice | 1.000.000 con índice |
|---|---:|---:|
| Documentos devueltos | ____ | ____ |
| Documentos examinados | ____ | ____ |
| Claves examinadas | ____ | ____ |
| Plan | ____ | ____ |
| Tiempo orientativo | ____ | ____ |

### Paso 8. Comparar volúmenes de forma razonada

Ahora ya tienes cuatro situaciones:
1. 200.000 documentos, sin índice.
2. 200.000 documentos, con índice.
3. 1.000.000 de documentos, sin índice.
4. 1.000.000 de documentos, con índice.

Responde:
- ¿Cómo cambia el trabajo de un `COLLSCAN` cuando la colección crece?
- ¿Cuántos documentos necesita examinar el caso indexado para una venta identificada de forma unívoca?
- ¿Por qué no debemos extrapolar automáticamente el mismo factor a los milisegundos?
- ¿Qué otros costes habremos añadido al crear índices sobre un millón de ventas?

**Solución comentada:** cuando el documento buscado está cerca del final y no existe un índice útil, el servidor puede verse obligado a inspeccionar una gran parte de la colección. Un índice selectivo permite dirigirse a pocas claves y documentos, pero también ocupa espacio y requiere trabajo de construcción y mantenimiento.

### Paso 9. Detectar un experimento inválido

Un compañero afirma que su índice funciona porque después de crearlo consiguió `nReturned:0` y `totalDocsExamined:0`. ¿Qué puede haber ocurrido?

**Respuesta:** quizá consultó una venta inexistente. No es correcto celebrar una consulta que no encontró el documento buscado. Primero debemos comprobar que estamos comparando **la misma necesidad de información** y que el resultado es correcto.

Otro compañero compara un filtro por `numero` sin índice con un filtro por `clienteId` tras indexarlo. Tampoco es una comparación limpia: cambió tanto el índice como la pregunta.

### Paso 10. Conservar o eliminar los datos

Si vas a seguir trabajando con otras prácticas, conserva el servicio y los datos. Puedes cerrar el shell o detener el contenedor:

```bash
docker compose stop mongo-indices
```

No ejecutes `down --volumes` por costumbre. Los datos del laboratorio son ficticios, pero debes comprender el efecto de eliminar volúmenes antes de hacerlo.

---

# Laboratorio 8 — Diseñar índices a partir de una necesidad comercial, no de una lista de tipos

## El encargo

Una empresa que vende productos en cuatro ciudades te pide mejorar tres pantallas:

- **Pantalla A:** localizar una venta por número cuando llama un cliente.
- **Pantalla B:** mostrar las últimas diez ventas pagadas cuyo importe supera 500 euros.
- **Pantalla C:** mostrar ventas de un cliente, pero únicamente número, fecha e importe.

No nos han pedido «crear tres índices». Nos han pedido **responder tres preguntas de negocio**. Tú deberás justificar qué índice elegirías y cuál podría tener un coste innecesario.

### Paso 1. Escribir las consultas antes de crear nada

Dentro de `mongosh` y después de seleccionar `curso_indices`:

```javascript
const c = db.getSiblingDB("curso_indices").ventas;
```

Para A:

```javascript
c.find({numero:199998})
```

Para B:

```javascript
c.find({estado:"pagada",importe:{$gt:500}})
 .sort({fecha:-1})
 .limit(10)
```

Para C:

```javascript
c.find(
  {clienteId:809},
  {_id:0,numero:1,fecha:1,importe:1}
).limit(20)
```

Lee cada comando en voz alta describiendo el filtro, la proyección, la ordenación y el límite. Si no puedes hacerlo, todavía no tiene sentido elegir índices.

### Paso 2. Elegir un índice candidato para A

La pantalla A utiliza una igualdad sobre un valor que identifica una venta concreta. El candidato natural es `{numero:1}`, con unicidad si esa es una regla real del dominio.

¿Por qué no incluir otros diez campos? Porque la consulta solo necesita localizar por número; mantener índices grandes puede añadir coste sin aportar valor para esta pregunta.

### Paso 3. Elegir un índice candidato para B

La pantalla B combina igualdad de estado, ordenación descendente por fecha y rango de importe. Podemos estudiar:

```javascript
{estado:1,fecha:-1,importe:1}
```

Este es un candidato ESR que trata de conservar la ordenación por fecha dentro de cada estado. También podemos comparar una alternativa ERS:

```javascript
{estado:1,importe:1,fecha:-1}
```

No afirmes que una es la mejor sin medir; la segunda puede reducir claves recorridas en un rango altamente selectivo, pero quizás requiera ordenar los resultados.

### Paso 4. Diseñar un índice para C y reflexionar sobre cobertura

La pantalla C filtra por cliente y proyecta número, fecha e importe. Un candidato podría ser:

```javascript
{clienteId:1,numero:1,fecha:1,importe:1}
```

Puede cubrir la consulta si la proyección y las demás condiciones lo permiten. Sin embargo, ¿merece la pena incorporar esos cuatro campos para una pantalla utilizada una vez al día? La respuesta depende de frecuencia, tamaño de los datos y coste de escritura.

Un índice que cubre una consulta no es automáticamente la mejor elección para toda la aplicación.

### Paso 5. Elaborar una propuesta defendible

Prepara una tabla:

| Pantalla | Índice candidato | Beneficio esperado | Coste o riesgo |
|---|---|---|---|
| A | ______ | ______ | ______ |
| B | ______ | ______ | ______ |
| C | ______ | ______ | ______ |

Cada fila debe contener una justificación concreta. No basta escribir `IXSCAN` como beneficio: explica qué parte del filtro u ordenación podría utilizarse desde el índice.

### Paso 6. Medir en MongoDB

Si ya existen los índices de los laboratorios anteriores, comprueba cuáles están disponibles mediante:

```javascript
c.getIndexes()
```

Luego ejecuta cada consulta con `explain("executionStats")`. Observa planes, documentos devueltos, claves examinadas, documentos examinados y etapas de ordenación.

Si todavía no existe un índice candidato, puedes crearlo **en el entorno de laboratorio**, ejecutar la consulta y comparar su plan. Documenta siempre qué índice acabas de crear para poder distinguir lo anterior de lo nuevo.

### Paso 7. Presentar conclusiones comprensibles

No entregues un JSON enorme sin explicación. Prepara un resumen para la persona responsable de la empresa:

- «La pantalla A busca una venta concreta. Un índice por número permite localizarla sin recorrer toda la colección».
- «La pantalla B es más compleja porque además de filtrar debe ordenar. Hemos medido dos estrategias y observado el trabajo de cada una».
- «La pantalla C solo necesita algunos campos. Una proyección adecuada puede evitar transferir datos innecesarios y un índice estudiado podría cubrir la consulta».

**Evaluación:** si alguien que no conoce `mongosh` puede entender qué problema resolviste, has completado la parte profesional del ejercicio. Si solo ve una lista de comandos, todavía falta tu explicación.
