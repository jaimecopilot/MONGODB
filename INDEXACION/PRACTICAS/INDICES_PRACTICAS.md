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
