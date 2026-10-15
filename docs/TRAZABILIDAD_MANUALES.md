# Correspondencia entre manuales de MongoDB y laboratorios validados

Edición de auditoría: 15 de octubre de 2026.

Los cuatro manuales (teoría/prácticas de los capítulos de indexación y seguridad) se distribuyen también como PDF y Markdown editables. **El repositorio guarda la infraestructura y los scripts ejecutables; que una guía cite un comando no demuestra por sí solo que cada variante se haya ejecutado.**

## Ruta docente de indexación

1. Preparar `.env` a partir de `.env.example` y ejecutar `docker compose up -d --wait mongo-indices`.
2. `docker compose exec -T mongo-indices mongosh --quiet --file /lab/01_cargar_ventas.js` — carga sintética y SOLO índice `_id` sobre `curso_indices.ventas`. Acepta `-e VENTAS=1000000`.
3. `docker compose exec -T mongo-indices mongosh --quiet --file /lab/02_antes.js` — primera medición sin índice secundario.
4. `docker compose exec -T mongo-indices mongosh --quiet --file /lab/03_crear_indices.js` — índice simple y colección de otros índices didácticos.
5. `docker compose exec -T mongo-indices mongosh --quiet --file /lab/04_despues.js` — segunda medición con mismo patrón de consulta.
6. `docker compose exec -T mongo-indices mongosh --quiet --file /lab/05_tipos.js` — ejemplos multikey, texto, geoespacial y hashed.
7. Ejecutar los scripts `06_unique_ttl.js` y `07_ver_ttl.js`, en ese orden, para comprobar duplicados y eliminación asíncrona.

El dataset combina el esquema del benchmark (`idVenta`, `tienda`, `categoria`, `tags`, `clienteHash`) y los campos de las unidades teóricas (`numero`, `estado`, `region`, `etiquetas`, `idGrupo`, `ubicacion`). Hay 20.000 clientes sintéticos. La recarga elimina únicamente la colección `curso_indices.ventas` y **destruye los índices secundarios de esa colección**: repetir el laboratorio exige respetar el orden de pasos.

## Seguridad

La cuenta administradora inicial se llama `adminlab` y se autentica en `admin`; los usuarios `lectorlab` y `escritorlab` se crean en `curso_seguridad` con roles `read` y `readWrite`. Las contraseñas proceden de `.env` o de variables efímeras de GitHub Actions: **no hay credenciales públicas aptas para uso real**.

- `lab/08_configurar_seguridad.js` carga la rutina de creación de usuarios.
- `lab/09_comprobar_readonly.js` comprueba lectura exitosa e inserción denegada al lector.
- `scripts/generar-certificados.sh` genera una CA y certificados TLS temporales.
- `scripts/probar-seguridad.sh` prueba conexión anónima rechazada, contraseña incorrecta, permisos, TLS obligatorio, X.509 y denegación de escritura.

**X.509 está soportado en MongoDB Community 8.0.** LDAP (obsoleto desde MongoDB 8.0) y el cifrado nativo del motor WiredTiger en reposo para despliegues autogestionados son funcionalidades de Enterprise y no se simulan como pruebas superadas de Community.

## Qué certifican los workflows

El workflow `.github/workflows/laboratorios.yml` tiene cinco jobs:

- 200.000 ventas: banco integral de índices.
- 1.000.000 ventas: mismo banco a volumen alto.
- Seguridad: SCRAM, RBAC, TLS, X.509.
- Recorrido progresivo de clase: datos SIN índices secundarios, COLLSCAN y creación posterior de índices.
- Secuencia literal de índices: 01/00/02/03/04/05/06/07/10/12 en orden.

La ejecución [38768081929](https://github.com/jaimecopilot/MONGODB/actions/runs/38768081929) acabó con los cinco jobs en **SUCCESS**. Puedes reproducir los jobs desde [Actions](https://github.com/jaimecopilot/MONGODB/actions).

## Limitaciones de la revisión

El éxito de CI no equivale a que todos los 32 laboratorios de índices y los 27 de seguridad estén automatizados. Hay actividades de extensión (p. ej., `partial`, `indexStats`, `hideIndex`, modificación de roles, Compass, LDAP) que deben distinguirse como ampliación y ensayarse antes de impartirlas. Los PDF auditados incluyen esa indicación en las fichas.

Ningún tiempo de `executionTimeMillis` se garantiza en otro equipo: deben compararse el plan y los documentos/índices examinados para la misma consulta, con el mismo conjunto de datos.
