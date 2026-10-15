# Índices de MongoDB 8.0
## Unidad 1 — Encontrar una venta entre 200.000

### El problema, antes que el comando

Imagina que una empresa guarda 200.000 ventas. Un cliente solicita información sobre la venta número 199.998. El operador necesita localizarla, pero su base de datos no tiene un camino de búsqueda organizado por número. Como en una pila de carpetas desordenadas, el sistema puede verse obligado a examinar documentos sucesivamente. El cliente recibirá una respuesta correcta, pero el esfuerzo puede ser enorme.

Un **índice** es una estructura adicional que MongoDB mantiene ordenada por el valor de uno o varios campos y que permite localizar documentos sin examinar necesariamente toda la colección. No sustituye la colección ni almacena una segunda copia íntegra de cada venta.

### Primer documento de ejemplo

```javascript
{
  numero: 199998,
  clienteId: 809,
  estado: "pagada",
  importe: 84.50,
  fecha: ISODate("2025-07-01T00:00:00Z")
}
```

Un documento es una unidad de información. La colección `ventas` agrupa documentos similares. El campo `numero` identifica una venta, mientras `clienteId` identifica a su cliente. Los nombres de campos se escriben exactamente: `numero` no es lo mismo que `número`.

### Buscar no significa examinar solo un documento

```javascript
db.ventas.find({ numero: 199998 })
```

El filtro pide las ventas cuyo número sea exactamente 199.998. Aunque reciba un solo resultado, MongoDB puede haber examinado miles de documentos para encontrarlo. **Número de resultados** y **cantidad de trabajo del motor** son conceptos distintos.

Sin un índice útil, el plan puede incluir `COLLSCAN`: recorrer documentos de la colección. Eso no es siempre incorrecto; para una colección diminuta puede ser razonable. Para una búsqueda frecuente en 200.000 registros, conviene comprobar el coste.

### Crear un índice

```javascript
db.ventas.createIndex({ numero: 1 })
```

El valor `1` indica orden ascendente de la clave. El `-1` indica descendente. Al crear un índice sobre `numero`, MongoDB dispone de otro camino para localizar una venta. La misma consulta puede pasar a utilizar `IXSCAN`, un recorrido del índice. Si además necesita el documento completo, el plan puede incluir `FETCH`.

**Los índices tienen coste:** ocupan espacio y añaden trabajo a inserciones, actualizaciones y borrados. Por eso no tiene sentido crear índices para todos los campos sin conocer las consultas habituales de la aplicación.

### Cómo saber si sirvió: explain

```javascript
db.ventas.find({ numero: 199998 }).explain("executionStats")
```

Esta orden no crea índices. Nos muestra cómo se resuelve la consulta y qué trabajo ha realizado.

| Campo | Qué significa |
|---|---|
| `nReturned` | Cuántos documentos devolvió la búsqueda |
| `totalDocsExamined` | Cuántos documentos examinó el motor |
| `totalKeysExamined` | Cuántas claves del índice examinó |
| `executionTimeMillis` | Tiempo observado en esa ejecución, no una promesa de tiempo futuro |

Una consulta sin índice podría examinar casi 200.000 documentos y devolver uno. Con un índice apropiado podría examinar una sola clave y un documento. **No memorices cifras de tiempo:** la CPU, la caché y la carga cambian cada ejecución. Compara primero resultados y contadores de trabajo.

### Qué es una comparación válida

Para comprobar una mejora hay que repetir el mismo filtro, sobre los mismos datos, con la misma proyección y límite. Si antes consultas por número y después por cliente, no puedes atribuir la diferencia al índice.

El laboratorio de la unidad siguiente permite reproducir esta comparación: carga ventas ficticias, observa `COLLSCAN`, crea el índice y repite la búsqueda con `explain`.

### Comprueba que lo has comprendido

1. ¿Por qué una consulta que devuelve un registro puede tener un coste elevado?
2. ¿Cuál es la diferencia entre `COLLSCAN` e `IXSCAN`?
3. ¿Qué añade `FETCH` al recorrido de índice?
4. ¿Por qué no crearías diez índices solo porque puedas?
5. Si el número de documentos examinados baja de 200.000 a 1, ¿significa que siempre habrá la misma proporción de mejora en milisegundos?

**Respuesta razonada a la primera pregunta:** porque encontrar un resultado puede requerir comprobar muchos candidatos. La consulta puede ser correcta y al mismo tiempo innecesariamente costosa.

### Siguientes unidades

Se desarrollarán de forma independiente los índices compuestos, orden de campos, regla ESR, multikey, búsqueda de texto, geoespaciales, hashed, unique, TTL y mantenimiento. Cada concepto se presentará con un problema reconocible, un ejemplo mínimo, una ejecución guiada y un criterio para decidir cuándo usarlo.

Referencia: https://www.mongodb.com/docs/v8.0/reference/explain-results/


---

# Unidad 2 — Índices compuestos: cuando la pregunta tiene varias condiciones

## 1. La situación: no buscamos una venta, buscamos una lista útil

En la unidad anterior buscábamos una venta por su número. Ahora la responsable de una tienda nos pide algo diferente:

> «Enséñame las diez ventas pagadas más recientes cuyo importe sea superior a 500 euros».

En una aplicación de verdad, este tipo de consulta es habitual: combina un estado, un umbral económico, una ordenación y un límite. Es más exigente que recuperar una venta por un identificador exacto, porque MongoDB debe resolver **qué documentos interesan** y **en qué orden entregarlos**.

Una venta sintética del laboratorio contiene, entre otros, estos campos:

```javascript
{
  numero: 812,
  estado: "pagada",
  fecha: ISODate("2025-03-23T00:00:00Z"),
  importe: 812.95
}
```

No es importante memorizar ese ejemplo. Lo importante es identificar qué necesitamos pedir: estado igual a «pagada», importe mayor de 500, orden descendente por fecha y máximo diez resultados.

Esta consulta se expresa así:

```javascript
db.ventas
  .find({ estado: "pagada", importe: { $gt: 500 } })
  .sort({ fecha: -1 })
  .limit(10)
```

Léela paso a paso antes de continuar:

1. `find` selecciona documentos.
2. `estado: "pagada"` exige igualdad: el estado debe coincidir exactamente.
3. `importe: { $gt: 500 }` exige **rango**, no igualdad; `$gt` significa *greater than*, «mayor que».
4. `sort({ fecha: -1 })` quiere los más recientes primero; `-1` significa orden descendente.
5. `limit(10)` permite entregar como máximo diez documentos.

El resultado son diez ventas (si existen al menos diez), pero esa cifra no nos dice cuánto trabajo realizó MongoDB para encontrarlas y ordenarlas.

## 2. Qué es un índice compuesto

Un **índice compuesto** utiliza varios campos, en un orden concreto. Por ejemplo:

```javascript
db.ventas.createIndex({ estado: 1, fecha: -1 })
```

Este índice no es equivalente a tener un índice independiente en `estado` y otro en `fecha`. Es una **única estructura** cuyas claves están organizadas primero por estado y, dentro de cada valor de estado, por fecha descendente.

Piensa en un archivador de tarjetas:

- Primero se agrupan las tarjetas por estado: canceladas, enviadas, pagadas, pendientes.
- Dentro de cada grupo se ordenan de la fecha más reciente a la más antigua.
- Si pides «pagadas» y las últimas fechas, puedes dirigirte al grupo apropiado y recorrerlo ya ordenado.

Una representación conceptual sería:

```text
ESTADO       FECHA
cancelada    2025-12-30
cancelada    2025-12-28
...
pagada       2025-12-31
pagada       2025-12-30
pagada       2025-12-29
...
pendiente    2025-12-31
```

Este esquema es una **explicación conceptual**, no un volcado de las páginas internas del índice MongoDB.

### Por qué importa el orden de los campos

Compara estas dos definiciones:

```javascript
{ estado: 1, fecha: -1 }
{ fecha: -1, estado: 1 }
```

Tienen los mismos campos, pero no organizan la información del mismo modo. La primera agrupa por estado y después ordena fechas; la segunda agrupa primero por fecha, independientemente del estado. Eso cambia las consultas que aprovechan mejor el índice.

**Conclusión que conviene recordar:** en un índice compuesto importa **qué campos elegimos, en qué orden se colocan y para qué consultas se utilizarán**.

## 3. El prefijo izquierdo: por qué no vale cualquier combinación

Un índice `{ estado: 1, fecha: -1, importe: 1 }` posee varios prefijos útiles:

- `{ estado: 1 }`
- `{ estado: 1, fecha: -1 }`
- La clave completa `{ estado: 1, fecha: -1, importe: 1 }`

¿Por qué llamamos a esto «prefijos»? Porque todas esas combinaciones **comienzan por el primer campo y avanzan hacia la derecha sin saltar posiciones**.

Piensa en una agenda ordenada por «país, ciudad, apellido». Encontrar todas las personas de España resulta natural. Encontrar las de España, Madrid también. Encontrar solamente todas las personas apellidadas García, sin conocer país ni ciudad, ya no aprovecha esa misma organización de la misma forma.

Por tanto, un índice que empieza por `estado` es una buena opción para consultas que filtran por estado, pero **no debemos asumir que es igual de eficiente** al consultar exclusivamente por importe.

Hay matices: MongoDB puede escoger otros planes o incluso recorrer un índice completo en algunos casos. La regla del prefijo no significa «prohibido usarlo» sino «la estructura ordenada no proporciona el mismo acceso selectivo si omites sus primeros campos».

## 4. E, S y R: tres exigencias distintas

La pauta conocida como **ESR** ayuda a decidir el orden de campos en muchos índices compuestos. No es una fórmula mágica. Son iniciales de tres conceptos:

| Letra | Significado | En nuestro ejemplo |
|---|---|---|
| **E** | *Equality* (igualdad) | `estado: "pagada"` |
| **S** | *Sort* (ordenación) | `sort({ fecha: -1 })` |
| **R** | *Range* (rango) | `importe: { $gt: 500 }` |

Con ese criterio, un índice candidato es:

```javascript
db.ventas.createIndex(
  { estado: 1, fecha: -1, importe: 1 },
  { name: "ix_esr" }
)
```

Léelo así: organizamos primero por el estado exacto; dentro de las pagadas podemos recorrer fechas de más reciente a más antigua; y además incorporamos el importe como tercera parte de la clave.

**Cuidado importante:** colocar `importe` después de `fecha` no significa que MongoDB pueda saltar de golpe a todas las ventas superiores a 500 sin inspeccionar otras claves del mismo grupo. Al priorizar la ordenación por fecha, el rango final puede requerir examinar más entradas del índice y filtrar importes. Esa es la contrapartida que hay que medir.

## 5. ¿Y si el rango es más importante que la ordenación?

Podríamos crear el índice en otro orden:

```javascript
db.ventas.createIndex(
  { estado: 1, importe: 1, fecha: -1 },
  { name: "ix_ers_practica" }
)
```

Ahora primero agrupamos por estado, y dentro de cada estado ordenamos por importe. Es más fácil localizar directamente importes superiores a un umbral. Pero las fechas quedan organizadas **dentro de cada valor de importe**, no necesariamente de forma global entre todas las ventas que cumplen el rango.

Eso puede obligar al motor a ordenar los resultados con una operación adicional, que en `explain` puede aparecer como una etapa `SORT`. Ordenar no es necesariamente malo, pero consume recursos y, en consultas grandes, puede volverse caro.

Esta variante a veces se llama **ERS**, como contraste con ESR. **No elijas una por su nombre**: piensa si tu consulta necesita recuperar un conjunto pequeño mediante el rango o entregar pocos resultados ya ordenados. El optimizador puede escoger distintos planes según datos, índices disponibles y estadísticas.

## 6. ¿Qué indica realmente una etapa SORT?

Ordenar los documentos es una operación lógica. Un índice adecuado puede suministrarlos en el orden solicitado, y entonces el plan no necesita una etapa de ordenación independiente. En otros casos, MongoDB debe reunir candidatos y ordenarlos antes de entregar los primeros diez.

Una etapa `SORT` no demuestra por sí sola un problema grave. Debemos preguntarnos:

- ¿Cuántos candidatos hay que ordenar?
- ¿Cuántas claves y documentos se examinan?
- ¿Hay que recuperar documentos con `FETCH`?
- ¿De verdad devuelve las diez ventas solicitadas, en orden correcto?

**No compares solo milisegundos**. En un ordenador con caché caliente, una ordenación adicional puede parecer barata; con más volumen o carga, la situación puede cambiar.

## 7. Qué significa comparar ESR y ERS de manera limpia

Para investigar el orden de índices, mantenemos:

1. La **misma colección** y el mismo número de documentos.
2. El **mismo filtro** por estado e importe.
3. La **misma ordenación** por fecha.
4. El **mismo límite** de diez resultados.

Solo variamos el índice utilizado. Para controlar la comparación podemos emplear `hint("ix_esr")` y `hint("ix_ers_practica")`. `hint` le pide al motor que pruebe un índice concreto; aquí sirve como instrumento de aprendizaje, **no como recomendación de forzar siempre planes en producción**.

En las prácticas se prepararán ambos índices, se repetirá la consulta y se comprobará que los resultados son los mismos, aunque el plan y las cantidades examinadas puedan ser diferentes.

## 8. Preguntas para pensar antes de la práctica

**Pregunta A.** Dispones de `{ estado: 1, fecha: -1 }`. ¿Por qué resulta natural filtrar por `estado` y ordenar por `fecha`, pero no necesariamente buscar solo por `fecha`?

**Pregunta B.** ¿Por qué un índice `{ estado: 1, importe: 1, fecha: -1 }` puede ayudar con un filtro de importes, pero aun así necesitar una ordenación adicional por fecha?

**Pregunta C.** Si ambos índices devuelven las mismas diez ventas, ¿cómo decidirías cuál hizo menos trabajo?

**Pregunta D.** ¿Sería justo comparar ESR con diez resultados y ERS con cien? Explica tu razonamiento.

### Respuestas orientativas

- **A:** el primer índice está agrupado por estado, así que sin fijar el primer campo la organización por fecha no equivale a una ordenación global simple.
- **B:** al recorrer múltiples importes, las fechas se encuentran dentro de bloques con valores diferentes de importe; no forman necesariamente una única secuencia descendente.
- **C:** observaría claves/documentos examinados, presencia de ordenación y las necesidades de la aplicación, además del tiempo medido en varias ejecuciones.
- **D:** no; habría cambiado también el trabajo pedido. La comparación debe mantener el mismo filtro, ordenación y límite.

### Puente hacia la práctica

No es necesario memorizar «ESR siempre es mejor». Debes poder defender la elección: **qué campo filtra por igualdad, qué campo ordena, cuál representa un rango, y qué sacrificio aceptas**. El laboratorio siguiente hará visibles estas decisiones.

**Fuente para ampliar:** https://www.mongodb.com/docs/v8.0/tutorial/equality-sort-range-rule/


---

# Unidad 3. Cardinalidad, selectividad y coste: por qué algunos índices ayudan poco

## 3.1. Un problema distinto del número de venta

El índice por número de venta parecía una elección obvia: un número identifica una sola venta. Ahora el equipo comercial pregunta «¿cuántas ventas están pagadas?». Podríamos pensar que cualquier campo usado en un filtro merece un índice. Pero `estado` solo toma cuatro valores en nuestra colección sintética: `pagada`, `pendiente`, `enviada` y `cancelada`. Cada uno aparece muchas veces.

Si existen 200.000 documentos distribuidos entre cuatro estados, filtrar uno de ellos podría seleccionar en torno a 50.000 documentos. No es lo mismo que buscar un número que identifica uno solo.

Llamamos **cardinalidad** al número de valores distintos que aparece en un campo. El campo `numero` tiene cardinalidad muy alta: prácticamente cada documento contiene un valor diferente. `estado` tiene cardinalidad baja: se repiten pocos valores. La cardinalidad, sin embargo, **no basta por sí sola para juzgar un índice**. También importa cuántos documentos devuelve una consulta concreta, su ordenación, el límite y si necesita leer otros campos.

## 3.2. Selectividad: qué fracción sobrevive al filtro

Piensa en una criba. Si lanzamos 200.000 ventas y el filtro `numero:199998` deja pasar una, selecciona una fracción diminuta. Si el filtro `estado:"pagada"` deja pasar 50.000, mantiene una cuarta parte.

Al hablar de **selectividad**, nos referimos a lo restrictivo que resulta el filtro. No confundas los conceptos:

- **Cardinalidad** caracteriza los valores posibles del campo en los datos.
- **Selectividad** caracteriza cuántos documentos deja pasar una condición de búsqueda determinada.

Un campo con pocos valores puede contener uno extraordinariamente raro. Por ejemplo, `estado:"en_revision_legal"` podría existir solo en diez ventas aunque `estado` tenga unos pocos estados en total. Ese valor concreto sí sería muy selectivo.

MongoDB puede decidir que para una consulta de baja selectividad resulta poco ventajoso utilizar cierto índice, especialmente si después debe recuperar gran cantidad de documentos. El optimizador elige un plan entre los disponibles; no está obligado a usar el índice que a nosotros nos parezca más bonito.

## 3.3. ¿Cómo medimos el problema?

Ejecutamos la misma consulta y observamos `explain("executionStats")`:

```javascript
db.ventas.find({ estado: "pagada" }).explain("executionStats")
```

Lo primero es comprobar `nReturned`. Si devuelve aproximadamente una cuarta parte de toda la colección, el usuario está pidiendo un conjunto grande. Aun con un índice por `estado`, MongoDB deberá hacer trabajo para producir todos esos documentos.

Ahora añadimos una segunda condición:

```javascript
db.ventas.find({
  estado: "pagada",
  numero: 199998
}).explain("executionStats")
```

Aquí el número reduce el conjunto de candidatos a un máximo de uno. La combinación de filtros y los índices disponibles importan más que el nombre del campo aislado.

**Pregunta diagnóstica:** si quieres devolver 50.000 documentos completos, ¿sería realista esperar `totalDocsExamined=1`? Evidentemente no. Un índice no cambia el hecho de que el cliente ha pedido muchos documentos.

## 3.4. Leer resultados y leer candidatos

Es fácil confundir `nReturned` con `totalDocsExamined`. Si una consulta devuelve 10.000 ventas y examina 10.000 documentos, la relación entre ambos números puede ser razonable. Si devuelve una y examina 200.000, merece investigación.

No interpretes esos contadores con una regla mecánica de «cuanto menor, mejor». Considera también `totalKeysExamined`, el coste de ordenación y el volumen de información retornada.

Para explicar una consulta a otra persona usa este orden:
1. **Qué necesitaba la aplicación.**
2. **Qué devolvió MongoDB y si era correcto.**
3. **Qué camino utilizó el motor.**
4. **Cuántos candidatos examinó.**
5. **Qué alternativa medirías y qué costes introduciría.**

## 3.5. El precio invisible de escribir

Imaginemos que la empresa recibe 500 ventas cada segundo. Cada inserción actualiza la colección y los índices que correspondan. Si añadimos decenas de índices por campos apenas consultados, aumentamos el trabajo de escritura, el espacio utilizado y la planificación de mantenimiento.

No hay una respuesta universal como «tres índices por colección». El presupuesto de índices depende del patrón de uso, tamaño de documentos, frecuencia de escritura, memoria disponible y consultas críticas. El buen diseño busca un equilibrio.

**Ejercicio razonado:** una aplicación consulta por `numero` miles de veces al día, por `clienteId` cientos de veces y por `colorDeEtiqueta` una vez al trimestre. ¿Cuál estudiarías primero? La respuesta se apoya en las consultas reales: el índice por número probablemente es prioritario; para el campo raramente consultado primero medirías si merece la pena mantenerlo.

---

# Unidad 4. Índices multikey: buscar dentro de listas

## 4.1. Cuando un campo deja de contener un único valor

Hasta ahora teníamos campos como `estado`, que contiene una cadena, o `importe`, que contiene un número. En la práctica también existen **arrays**: listas de valores dentro de un documento. Una venta puede tener etiquetas como estas:

```javascript
{
  numero: 348,
  etiquetas: ["venta", "web", "urgente"]
}
```

La empresa pregunta: «¿Qué ventas contienen la etiqueta `urgente`?». No está preguntando por una cadena completa que represente el array, sino por **la presencia de un elemento dentro de una lista**.

MongoDB permite expresarlo de una forma directa:

```javascript
db.ventas.find({ etiquetas: "urgente" })
```

En el conjunto de datos preparado, unas ventas incluyen esa etiqueta y otras no. Como el campo contiene un array, MongoDB puede crear automáticamente un **índice multikey** cuando indexamos dicho campo:

```javascript
db.ventas.createIndex({ etiquetas: 1 })
```

No existe una palabra `multikey` dentro del comando: MongoDB reconoce que está indexando valores de arrays.

## 4.2. ¿Qué significa «varias claves»?

Imagina una ficha comercial que contiene tres etiquetas: `venta`, `web` y `urgente`. Para facilitar la búsqueda de cualquier etiqueta, el índice puede representar distintas entradas derivadas de los elementos del array. El documento no se duplica en la colección; lo que crece son las entradas asociadas al índice.

Eso explica dos hechos que a menudo sorprenden:
- El número de **claves** examinadas puede ser superior al número de **documentos** devueltos.
- Cambiar el contenido de una lista indexada puede implicar actualizar varias entradas.

No interpretes automáticamente `totalKeysExamined > nReturned` como un error. En un índice multikey es normal que los arrays participen en varias claves.

## 4.3. Dos condiciones en un array: una trampa frecuente

Si un array almacena documentos, por ejemplo:

```javascript
productos: [
  { sku: "SKU10", cantidad: 1 },
  { sku: "SKU20", cantidad: 3 }
]
```

podríamos querer encontrar ventas que contengan **un mismo producto** con SKU10 y cantidad 3. Un filtro ingenuo sobre `productos.sku` y `productos.cantidad` puede satisfacer cada condición en elementos diferentes del array. Esto significa que podríamos aceptar la venta aunque SKU10 tenga cantidad 1 y quien tenga cantidad 3 sea SKU20.

Para indicar que las dos condiciones deben cumplirse dentro **del mismo elemento**, MongoDB ofrece `$elemMatch`:

```javascript
db.ventas.find({
  productos: {
    $elemMatch: { sku: "SKU10", cantidad: 3 }
  }
})
```

Antes de crear índices, debemos comprender la semántica de la consulta. **Un índice no puede corregir una pregunta formulada de manera equivocada.**

## 4.4. Limitaciones de los compuestos multikey

MongoDB impone restricciones cuando un índice compuesto incluiría varios campos que son arrays en un mismo documento. La razón es estructural: combinar independientemente listas podría generar demasiadas combinaciones de claves y ambigüedades en la indexación.

No conviertas esto en «los índices multikey no se pueden combinar». Sí se pueden crear índices compuestos que involucren un campo array y otros campos escalares cuando se respetan las restricciones. Lo importante es revisar el esquema real antes de crear uno.

## 4.5. Cómo observar un multikey

En la salida de `explain` de un plan con índice, busca propiedades como `isMultiKey` en los lugares pertinentes del plan, junto a las etapas `IXSCAN`. No dependas de que todas las versiones impriman exactamente el mismo árbol de campos: los detalles del plan pueden cambiar.

Ejercicio de interpretación: si `etiquetas:"urgente"` encuentra 18.000 ventas, ¿es seguro que el índice hará que MongoDB examine solo una clave? No. Podría necesitar recorrer muchas entradas de índice porque `urgente` aparece en muchas ventas.

**Comprobación:** diferencia entre una lista de valores, una lista de subdocumentos y un campo escalar. Explica para qué sirve `$elemMatch` sin usar la expresión «hace más rápido».

---

# Unidad 5. Búsqueda de texto: encontrar palabras, no números exactos

## 5.1. Una consulta que no es igualdad

Una venta puede contener una descripción como `cafe premium en grano`. Si consultas `descripcion:"cafe"`, MongoDB busca un valor completo igual a la cadena `cafe`, no necesariamente un documento cuya descripción contiene esa palabra.

La búsqueda textual plantea un problema distinto: el cliente quiere documentos relacionados con **términos**, no solo cadenas idénticas. Para mostrarlo en el laboratorio tenemos descripciones como `cafe premium en grano`, `bicicleta urbana plegable` o `reclamacion urgente del cliente`.

Un índice textual clásico se define así:

```javascript
db.ventas.createIndex(
  { descripcion: "text" },
  { name: "ix_descripcion_texto", default_language: "spanish" }
)
```

La clave `"text"` indica el tipo de índice. La opción de idioma influye en el procesamiento lingüístico. Eso significa que no debemos confundir búsqueda textual con una simple búsqueda de subcadenas de caracteres.

## 5.2. Consultar términos

```javascript
db.ventas.find({
  $text: { $search: "cafe" }
})
```

El operador `$text` pide búsqueda textual sobre la colección, cuando existe un índice adecuado. No hay que esperar que funcione como una comparación exacta de texto completo.

El sistema puede procesar palabras considerando reglas lingüísticas, como formas y términos frecuentes. Para comprender por qué un resultado aparece y otro no, revisa el idioma y los términos almacenados. Nunca expliques que «busca cualquier secuencia de letras en cualquier lugar»: esa es una descripción equivocada.

## 5.3. Relevancia y textScore

Si muchos documentos contienen términos relacionados, puede interesarnos cuál es más relevante para la búsqueda. MongoDB permite proyectar la puntuación textual:

```javascript
db.ventas.find(
  { $text: { $search: "cafe" } },
  { descripcion: 1, score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

La puntuación ayuda a ordenar coincidencias según el mecanismo textual disponible. **No es una probabilidad de verdad** ni indica la intención real del cliente: representa un cálculo de relevancia para esa consulta.

### Búsqueda textual clásica frente a sistemas de búsqueda más amplios

Los índices `text` de MongoDB Community permiten determinados escenarios de búsqueda de términos. No debes atribuirles automáticamente las capacidades de un motor especializado moderno: analizadores complejos, tolerancia avanzada a errores, búsqueda semántica o ciertas funciones de MongoDB Search son temas diferentes y dependen del producto y despliegue.

## 5.4. Costes y decisiones

Un índice textual consume almacenamiento y añade trabajo de actualización cuando cambian descripciones. Puede ser útil para un buscador sencillo dentro de una colección. Pero si la aplicación necesita un motor de búsqueda muy sofisticado, tendremos que estudiar otras opciones. El ejercicio introductorio pretende comprender la diferencia entre igualdad textual, términos indexados y relevancia, no evaluar todos los motores de búsqueda del mercado.

**Preguntas:** ¿por qué no basta `descripcion:"cafe"` para encontrar `cafe premium`? ¿Qué información aporta `textScore` y qué no puede demostrar?

---

# Unidad 6. Índices geoespaciales: buscar por cercanía

## 6.1. Del catálogo al mapa

Ahora imaginemos una aplicación que muestra puntos de entrega cerca del usuario. Un documento puede almacenar coordenadas geográficas. El reto no consiste en ordenar palabras, sino en responder «¿qué lugares están a menos de cierta distancia de este punto?».

Para datos GeoJSON, un punto se representa así:

```javascript
{
  nombre: "Punto A",
  ubicacion: {
    type: "Point",
    coordinates: [-3.7038, 40.4168]
  }
}
```

**Orden decisivo:** las coordenadas son [longitud, latitud]. Invertirlas puede colocar el punto en una región completamente diferente. La longitud es el eje este-oeste y la latitud el eje norte-sur.

## 6.2. Qué aporta 2dsphere

Para trabajar con geometrías GeoJSON sobre una esfera terrestre aproximada, MongoDB ofrece índices `2dsphere`:

```javascript
db.puntos.createIndex({ ubicacion: "2dsphere" })
```

Ese índice ayuda a resolver determinadas consultas espaciales, como encontrar puntos cercanos a una coordenada.

```javascript
db.puntos.find({
  ubicacion: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-3.7038, 40.4168]
      },
      $maxDistance: 3500
    }
  }
})
```

El valor `3500` de `$maxDistance` se expresa en metros en esta consulta GeoJSON: solicitamos ubicaciones próximas dentro de aproximadamente 3,5 kilómetros. La cercanía sobre la superficie no equivale a tiempo de viaje por calles y carreteras. Un puente, un río o una montaña pueden alterar el trayecto real.

## 6.3. Qué validar antes de culpar al índice

Si obtienes resultados extraños, primero revisa:
- El orden longitud/latitud.
- El tipo GeoJSON `Point` y la estructura `coordinates`.
- La unidad de la distancia.
- La existencia del índice `2dsphere`.
- Si los puntos ficticios representan coordenadas realistas para el caso estudiado.

No confundas índices `2d` para coordenadas planas con los `2dsphere` para ubicaciones geográficas. El tipo de dato y la consulta deben corresponderse con el modelo espacial elegido.

## 6.4. Decisiones de diseño

Una empresa de mensajería podría indexar la ubicación de sus centros de distribución para buscar el más cercano a un cliente. Eso no resuelve automáticamente la ruta óptima de reparto. El índice contesta consultas espaciales sobre los datos almacenados; optimizar recorridos con múltiples paradas y restricciones es otro problema.

**Pregunta de transferencia:** ¿qué fallaría si una aplicación intercambia latitud y longitud? ¿Por qué un punto situado a 2 kilómetros en línea recta no garantiza un trayecto de 2 kilómetros?
