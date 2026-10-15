# MongoDB 8.0 · Índices y seguridad

Material docente redactado para quien **se inicia en MongoDB**, organizado en teoría, prácticas guiadas y código de laboratorio. Las explicaciones construyen los conceptos antes de presentar comandos; cada práctica indica en qué terminal trabajar, qué preparar, qué ejecutar, qué resultado observar y cómo interpretar los errores habituales.

## Manuales completos

| Capítulo | Teoría | Prácticas |
|---|---|---|
| **Índices** | [Leer PDF](INDEXACION/TEORIA/INDICES_TEORIA.pdf) · [Markdown](INDEXACION/TEORIA/INDICES_TEORIA.md) | [Leer PDF](INDEXACION/PRACTICAS/INDICES_PRACTICAS.pdf) · [Markdown](INDEXACION/PRACTICAS/INDICES_PRACTICAS.md) |
| **Seguridad** | [Leer PDF](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.pdf) · [Markdown](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.md) | [Leer PDF](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.pdf) · [Markdown](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.md) |

**Docencia:** [Guía del formador en PDF](DOCENCIA/GUIA_DEL_FORMADOR.pdf) · [Markdown](DOCENCIA/GUIA_DEL_FORMADOR.md).

Los capítulos desarrollan más actividades de las que caben en una sesión corta; el formador puede escoger un itinerario esencial y dejar las demás como trabajo autónomo o ampliación.

## Por dónde comenzar

**Índices:** empieza por el significado de documento, colección, filtro, ordenación y proyección. Sigue con el Laboratorio 1 para cargar ventas ficticias, medir un recorrido sin índice, crear el índice por número y repetir exactamente la misma búsqueda. Después realiza índices compuestos y ESR/ERS; continúa con arrays, texto, geoespacial, hashed, unique, parcial, TTL, cubiertas y diagnóstico.

**Seguridad:** distingue acceso de red, autenticación y autorización. Sigue el Laboratorio 1 para crear y utilizar cuentas con roles de lectura y escritura. Después prueba denegaciones, privilegios personalizados, TLS y certificados de cliente X.509. Los apartados de LDAP empresarial y cifrado nativo en reposo se estudian como características arquitectónicas, no como funciones demostradas en Community.

## El laboratorio Docker

Los documentos usan MongoDB Community 8.0. Las tres instancias están separadas para no confundir escenarios:

| Servicio | Finalidad | Puerto publicado en el ordenador |
|---|---|---|
| `mongo-indices` | Colecciones sintéticas para índices | `127.0.0.1:27017` |
| `mongo-seguridad` | Usuarios SCRAM, roles y denegaciones | `127.0.0.1:27018` |
| `mongo-tls` | Canal TLS y certificados X.509 | `127.0.0.1:27019` |

**Preparación local:** necesitas Docker Desktop o Docker Engine con Compose. En Windows puedes utilizar PowerShell para Docker y Bash (Git Bash/WSL) para generar certificados.

Desde la carpeta principal del proyecto:

```bash
# En PowerShell: Copy-Item .env.example .env
cp .env.example .env
# Abre .env en tu editor y sustituye las contraseñas de demostración.
docker compose up -d --wait mongo-indices
docker compose ps
```

Para iniciar las primeras prácticas de índices desde PowerShell o Bash:

```bash
docker compose exec -T -e VENTAS=200000 mongo-indices mongosh --quiet --file /lab/01_cargar_ventas.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/02_antes.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/03_crear_indices.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/04_despues.js
```

La carga de ventas **borra y recrea** `curso_indices.ventas`. Las demás prácticas usan también colecciones ficticias que pueden recrearse. Nunca ejecutes esos scripts en una base de datos real.

Las instancias utilizan volúmenes Docker persistentes con nombre. `docker compose stop` detiene los servicios sin borrar sus datos. **`docker compose down --volumes` elimina volúmenes y datos del laboratorio**; utiliza esta opción únicamente cuando quieras reinicializar conscientemente.

## Cómo se comprueban los ejemplos

Los archivos de `lab/` son scripts para `mongosh`. [GitHub Actions](https://github.com/jaimecopilot/MONGODB/actions) ejecuta pruebas sobre MongoDB real: búsquedas con 200.000 y un millón de ventas, recorrido de clase, índices compuestos, índices únicos parciales y permisos con SCRAM, TLS y X.509. Un test en verde confirma las condiciones **que ese test cubre**, no cada posible variante de todos los ejercicios.

Los PDF se generan desde los Markdown mediante [el generador](scripts/generar_manuales_pdf.py), con paginación natural A4 y controles de lectura. No se insertan fichas ni saltos de página para alcanzar un número artificial de páginas.

## Documentación oficial

[Índices de MongoDB 8.0](https://www.mongodb.com/docs/v8.0/indexes/) · [Explain](https://www.mongodb.com/docs/v8.0/reference/explain-results/) · [Autenticación](https://www.mongodb.com/docs/v8.0/core/authentication/) · [TLS](https://www.mongodb.com/docs/v8.0/tutorial/configure-ssl/) · [X.509](https://www.mongodb.com/docs/v8.0/tutorial/configure-x509-client-authentication/)
