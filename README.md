# MongoDB — indexación y seguridad reproducibles

Laboratorios docentes para MongoDB Community **8.0** con Docker Compose y validación automática en **GitHub Actions**. Los contenedores existen únicamente durante los ejercicios y sus datos son desechables.

## Pruebas reales

**Indexación:** carga determinista de 200.000 y 1.000.000 de documentos de ventas; `COLLSCAN` antes de crear el índice; `IXSCAN` después; índices simples, compuestos (ESR), multikey (array), texto, geoespaciales 2dsphere, hashed y únicos; consultas cubiertas; TTL y su eliminación asíncrona.

**Seguridad:** autenticación SCRAM, rechazo de conexiones no autenticadas y contraseñas erróneas, rol `read` y rol `readWrite`, cifrado TLS obligatorio, certificado de cliente X.509 y autorización de solo lectura de ese certificado.

**Limitaciones:** LDAP y el cifrado *nativo* de MongoDB en reposo requieren **Enterprise/Atlas**; no se simulan fraudulentamente sobre Community. Desde MongoDB 8.0, LDAP está obsoleto. El cifrado del disco del host no prueba el cifrado nativo de MongoDB.

## Ejecutar en GitHub (sin instalar Docker)

Abre **Actions → Laboratorios MongoDB 8.0**. En cada ejecución verás tres jobs independientes: 200.000 ventas, 1.000.000 ventas y seguridad. Los jobs emiten `[OK]`, `[INFO]` y las métricas `totalDocsExamined`, `totalKeysExamined` y `executionTimeMillis`. Solo un job en verde demuestra que **esa ejecución** ha pasado.

El archivo de workflow es [`.github/workflows/laboratorios.yml`](.github/workflows/laboratorios.yml).

## Ejecutar localmente

Necesitas Docker Desktop o Docker Engine, Docker Compose v2 y OpenSSL. Para generar certificados desde Windows utiliza WSL o Git Bash. En el directorio del repositorio:

```bash
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
# Edita .env: nunca utilices contraseñas reales
bash scripts/generar-certificados.sh
docker compose up -d --wait
docker compose exec -T -e VENTAS=200000 mongo-indices mongosh --quiet --file /lab/indices.js
# Exporta las tres claves de .env al entorno de tu terminal, para el script siguiente:
export MONGO_ADMIN_PASSWORD="..." LAB_READER_PASSWORD="..." LAB_WRITER_PASSWORD="..."
bash scripts/probar-seguridad.sh
docker compose down --volumes
```

Los puertos externos 27017, 27018 y 27019 se asignan exclusivamente a **127.0.0.1**. No abras los puertos a la red ni ejecutes los scripts sobre datos reales: modifican y eliminan colecciones de las bases de laboratorio.

Los certificados TLS son **efímeros** y duran dos días; `certs/` y `.env` se excluyen de Git. El permiso de lectura de los archivos PEM está simplificado para un contenedor efímero docente; **no es un procedimiento de custodia de claves privadas para producción**.

## Cómo interpretar las mediciones

La evidencia principal es la comparación, para **la misma consulta**, del plan (`COLLSCAN` / `IXSCAN`) y el número de documentos y claves examinados. `executionTimeMillis` varía por caché, CPU y carga del runner. No se exige una ganancia temporal absoluta. `TTL` funciona de manera asíncrona: su eliminación no es instantánea; en el laboratorio se acelera el monitor a un segundo.

## Materiales del curso

Estos tests sirven para contrastar los cuatro manuales (teoría/prácticas de indexación y seguridad) generados aparte. La existencia del repositorio **no certifica** por sí sola la correspondencia de cada párrafo y ejercicio de esos PDF con el código: esa auditoría requiere una revisión adicional y los resultados de Actions.

Referencias oficiales:
- [Índices](https://www.mongodb.com/docs/v8.0/indexes/)
- [Autenticación](https://www.mongodb.com/docs/v8.0/core/authentication/)
- [TLS](https://www.mongodb.com/docs/v8.0/tutorial/configure-ssl/)
- [X.509](https://www.mongodb.com/docs/v8.0/tutorial/configure-x509-client-authentication/)


## Material lectivo — PDF y Markdown

Los **cuatro manuales docentes** y la guía del formador forman parte del repositorio. Los Markdown son el material editable; los PDF se generan y versionan mediante [Publicar manuales PDF](.github/workflows/publicar-manuales.yml), con control automático de páginas.

| Capítulo | Teoría | Prácticas |
|---|---|---|
| 4 — Indexación | [PDF](INDEXACION/TEORIA/INDICES_TEORIA.pdf) · [MD](INDEXACION/TEORIA/INDICES_TEORIA.md) | [PDF](INDEXACION/PRACTICAS/INDICES_PRACTICAS.pdf) · [MD](INDEXACION/PRACTICAS/INDICES_PRACTICAS.md) |
| 6 — Seguridad | [PDF](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.pdf) · [MD](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.md) | [PDF](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.pdf) · [MD](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.md) |

- [Guía del formador en PDF](DOCENCIA/GUIA_DEL_FORMADOR.pdf) · [Markdown](DOCENCIA/GUIA_DEL_FORMADOR.md).
- [Auditoría y trazabilidad en PDF](DOCENCIA/INFORME_AUDITORIA_Y_TRAZABILIDAD.pdf) · [Markdown](DOCENCIA/INFORME_AUDITORIA_Y_TRAZABILIDAD.md).
- [Trazabilidad ejecutable de los laboratorios](docs/TRAZABILIDAD_MANUALES.md).

Para regenerar los PDF: ejecutar `python scripts/generar_manuales_pdf.py` después de instalar las dependencias del workflow. Los PDF del repositorio son compilaciones reproducibles a partir del Markdown revisado. La maquetación puede variar respecto a entregas previas fuera de GitHub.
