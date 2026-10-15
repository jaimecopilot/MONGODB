# Informe de ejecución real — MongoDB Community 8.0

**Fecha:** 15 de octubre de 2026. **Ejecución GitHub Actions:** [38764992028](https://github.com/jaimecopilot/MONGODB/actions/runs/38764992028). **Commit:** `f41832536faa65f3d42bc6046b4ff911ca29a516`.

## Estado

| Job | Resultado |
|---|---|
| Índices con 200.000 ventas | **SUCCESS** |
| Índices con 1.000.000 de ventas | **SUCCESS** |
| Seguridad (SCRAM, permisos, TLS, X.509) | **SUCCESS** |

## Consultas medidas con `explain("executionStats")`

Los valores siguientes son observaciones de **una sola ejecución**, no un benchmark estadístico.

| Escenario | Ventas | Documentos examinados | Claves examinadas | `executionTimeMillis` |
|---|---:|---:|---:|---:|
| Sin índice (COLLSCAN), idVenta próxima al final | 200.000 | 200.000 | 0 | 77 ms |
| Con índice simple (IXSCAN), misma consulta | 200.000 | 1 | 1 | 1 ms |
| Sin índice (COLLSCAN), idVenta próxima al final | 1.000.000 | 1.000.000 | 0 | 413 ms |
| Con índice simple (IXSCAN), misma consulta | 1.000.000 | 1 | 1 | 3 ms |
| Índice compuesto ESR, con límite 5 | 1.000.000 | 5 | 5 | 0 ms |
| Multikey, con límite 3 y `hint` | 1.000.000 | 3 | 3 | 3 ms |
| Hashed, igualdad y `hint` | 1.000.000 | 1 | 1 | 0 ms |
| Consulta cubierta, con límite 3 y `hint` | 1.000.000 | **0** | 3 | 3 ms |

Los resultados de `executionTimeMillis` dependen de recursos, caches, planificación y carga. **La evidencia didáctica más robusta es la caída de documentos examinados de 1.000.000 a 1**, no una promesa genérica de aceleración.

Los siguientes controles también pasaron: búsqueda de texto, geoespacial 2dsphere, `unique` con duplicado rechazado por `E11000`, TTL (eliminación asincrónica de registro expirado y conservación de registro vigente).

## Seguridad: controles reales

- Sin credenciales se rechazó la lectura de una colección protegida.
- Una contraseña SCRAM errónea fue rechazada.
- Usuario con rol `read`: lectura permitida, escritura prohibida.
- Usuario con rol `readWrite`: inserción permitida.
- Instancia con `requireTLS`: conexión sin TLS rechazada, conexión validando la CA permitida.
- Se creó una identidad `$external` con sujeto `CN=alumno-x509,OU=Alumnos,O=MongoDBFormacion`.
- La autenticación X.509 con certificado firmado por la CA de laboratorio permitió leer, pero negó escribir.

No se han probado LDAP ni cifrado nativo en reposo: requieren un entorno de MongoDB Enterprise/Atlas y quedan **fuera del alcance de este banco Community**.

## Alcance de la validación

Validado: scripts y contenedores de este repositorio en los runners de GitHub, con tres jobs terminados satisfactoriamente.

**Pendiente de revisión independiente:** correspondencia literal y pedagógica de las cuatro guías PDF elaboradas en la conversación con cada paso del nuevo laboratorio. Este informe no constituye un certificado de auditoría completa de esos PDF.
