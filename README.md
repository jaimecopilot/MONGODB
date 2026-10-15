# MongoDB 8.0 · Indexación y seguridad

Curso práctico de **tres horas** sobre MongoDB Community 8.0. Los manuales completos permiten estudiar también los contenidos de ampliación.

## Material del alumno

| Capítulo | Teoría | Prácticas |
|---|---|---|
| **4 · Indexación** | [PDF](INDEXACION/TEORIA/INDICES_TEORIA.pdf) · [Markdown](INDEXACION/TEORIA/INDICES_TEORIA.md) | [PDF](INDEXACION/PRACTICAS/INDICES_PRACTICAS.pdf) · [Markdown](INDEXACION/PRACTICAS/INDICES_PRACTICAS.md) |
| **6 · Seguridad** | [PDF](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.pdf) · [Markdown](SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.md) | [PDF](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.pdf) · [Markdown](SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.md) |

Los Markdown son las fuentes editables y los PDF son la versión preparada para descargar e imprimir.

## Material del formador

[Guía del formador (PDF)](DOCENCIA/GUIA_DEL_FORMADOR.pdf) · [Markdown](DOCENCIA/GUIA_DEL_FORMADOR.md). Contiene preparación del entorno, desarrollo de la sesión y actividades recomendadas.

## Laboratorio

- [`lab/`](lab/): scripts JavaScript para `mongosh`. Los archivos numerados siguen el recorrido de las prácticas.
- [`compose.yaml`](compose.yaml): instancias de MongoDB para índices, autenticación y TLS.
- [`scripts/`](scripts/): certificados de demostración y otras utilidades de instalación.
- [GitHub Actions](../../actions/workflows/laboratorios.yml): pruebas automáticas de cinco recorridos (200.000 ventas, 1.000.000 ventas, itinerario de clase, scripts de prácticas y seguridad).

### Preparación local

Instala Docker Desktop o Docker Engine con Compose. Desde la carpeta del repositorio:

```bash
# En PowerShell: Copy-Item .env.example .env
cp .env.example .env
# Edita .env y sustituye las contraseñas de demostración.
docker compose up -d --wait mongo-indices mongo-seguridad
docker compose ps
```

Práctica de índices, por orden:

```bash
docker compose exec -T -e VENTAS=200000 mongo-indices mongosh --quiet --file /lab/01_cargar_ventas.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/02_antes.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/03_crear_indices.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/04_despues.js
```

La ampliación de TLS requiere generar certificados de laboratorio (Bash mediante WSL o Git Bash en Windows):

```bash
bash scripts/generar-certificados.sh
docker compose up -d --wait mongo-tls
```

Estos scripts modifican **solo datos ficticios de laboratorio**. Los servicios publican sus puertos en `127.0.0.1`. No uses el laboratorio en servidores reales ni reutilices sus contraseñas o certificados en producción.

## Generación de PDF

Los PDF se obtienen del Markdown mediante [el generador](scripts/generar_manuales_pdf.py). Un [workflow](.github/workflows/publicar-manuales.yml) los actualiza automáticamente al cambiar los materiales y comprueba el número de páginas.

## Documentación oficial

[Índices](https://www.mongodb.com/docs/v8.0/indexes/) · [Autenticación](https://www.mongodb.com/docs/v8.0/core/authentication/) · [TLS](https://www.mongodb.com/docs/v8.0/tutorial/configure-ssl/) · [X.509](https://www.mongodb.com/docs/v8.0/tutorial/configure-x509-client-authentication/)
