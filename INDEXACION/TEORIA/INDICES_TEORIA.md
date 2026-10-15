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
