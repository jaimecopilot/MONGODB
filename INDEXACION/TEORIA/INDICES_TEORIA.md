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
