# MongoDB 8.0 — Nueva edición pedagógica desde cero

**Estado de esta rama: manuscritos en construcción, no material aprobado.**

Se han descartado íntegramente los cuatro manuales anteriores. Esta rama **no reutiliza sus fichas, párrafos ni PDF**. Los nuevos textos parten de un problema real, explican el mecanismo antes del comando y presentan prácticas guiadas para alguien que empieza.

## Primera entrega redactada

- [Índices · Teoría: qué es un índice, COLLSCAN, IXSCAN y explain](INDEXACION/TEORIA/INDICES_TEORIA.md).
- [Índices · Práctica: carga de ventas, línea base y comparación antes/después](INDEXACION/PRACTICAS/INDICES_PRACTICAS.md).
- [Seguridad · Teoría: autenticación, autorización, RBAC y mínimo privilegio](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.md).
- [Seguridad · Práctica: conexiones anónimas, cuentas read/readWrite y denegaciones](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.md).

Los cuatro textos son **las primeras unidades**, no los cuatro libros terminados. Se han eliminado de esta rama los PDF anteriores y la guía docente anterior porque dejaron de corresponder al contenido. No se volverán a generar PDF finales hasta disponer de capítulos sustantivos y revisados.

## Contenido que debe incorporarse antes de publicar

**Índices — teoría y prácticas:** índice simple, compuesto, orden de claves y prefijos, igualdad/rango/ordenación (ESR), análisis de planes y métricas, multikey, búsqueda de texto, geoespacial, hashed, unique, TTL, consultas cubiertas, criterios de diseño, mantenimiento y evaluación con hasta un millón de ventas.

**Seguridad — teoría y prácticas:** redes y acceso, SCRAM, usuarios y base de autenticación, roles RBAC y mínimo privilegio, operaciones denegadas y permitidas, TLS, certificados de servidor, autenticación X.509, gestión de secretos, cifrado en reposo, LDAP como capacidad empresarial obsoleta en MongoDB 8.0, endurecimiento y errores frecuentes.

El temario debe abordarse de manera progresiva. Cada práctica debe contener: qué objetivo persigue, requisitos concretos, consola en que escribir, comando, explicación, resultado esperado, interpretación, fallos habituales, recuperación y preguntas de comprobación.

## Código de laboratorio

El laboratorio Docker que funciona en `main` se conserva por ahora para comprobar los ejemplos. **Que los scripts estén validados no demuestra que los nuevos manuales completos existan:** la edición de contenidos sigue en curso.

Para acceder a los manuales anteriores, existe el historial Git de `main`; no forman parte de esta nueva rama.
