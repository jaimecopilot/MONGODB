# Auditoría técnica, editorial y trazabilidad con GitHub Actions

**Material de referencia:** cuatro Markdown de la edición anterior (40, 33, 66 y 56 páginas en PDF). **Código:** [jaimecopilot/MONGODB](https://github.com/jaimecopilot/MONGODB), rama de validación `docs/auditoria-manuales`.

## 1. Hallazgos corregidos

1. Los manuales y el repositorio habían divergido: la primera versión de los scripts en GitHub no contenía `numero`, `estado`, `region`, `etiquetas`, `idGrupo` ni `ubicacion` que se utilizan en teoría y prácticas. Se incorporaron como campos de **datos ficticios**, sin eliminar los campos nuevos (`idVenta`, `tienda`, `categoria`, `tags`, `clienteHash`). En el generador se usa una distribución repetible de 20.000 clientes.
2. Los ficheros invocados por los manuales (`01_cargar_ventas.js` a `14_verificar_x509.js`) no estaban en el repositorio. Se añadieron entradas específicas para los ejercicios de aula y un job de CI que las ejecuta **en orden** (secuencia esencial de índices).
3. Los ejemplos de instalación apuntaban a `docker-compose.yml`, `.env.ejemplo` y la subcarpeta `LABORATORIO`. El repositorio actual utiliza `compose.yaml`, `.env.example` y el directorio raíz.
4. Los manuales incluían usuarios y contraseñas fijos de un banco anterior: `rootlab`, `alumno_lab`, `editor_lab`. Se alinearon con las identidades de GitHub: `adminlab`, `lectorlab`, `escritorlab`. Para scripts de administración se usa la contraseña configurada como variable de entorno del contenedor; para actividades interactivas se solicita la clave sin publicarla en el comando.
5. El itinerario TLS incluía archivos `tls/servidor.crt`, perfil opcional de Compose y un generador Python que ya no están en el proyecto. Se corrigió a `scripts/generar-certificados.sh`, `certs/server.crt`, `certs/client.crt` y `scripts/probar-seguridad.sh`, tal como está comprobado en CI.
6. Se distinguieron los resultados reales de una sola ejecución de `executionTimeMillis` de conclusiones estructurales basadas en `totalDocsExamined`, `totalKeysExamined` y etapa de ejecución.
7. Se precisó que **X.509 funciona en Community**, mientras LDAP (obsoleto desde MongoDB 8.0) y cifrado nativo en reposo de MongoDB autogestionado pertenecen a otras capacidades de producto.
8. Se añadió la distinción explícita entre ejercicios automáticos probados y prácticas optativas que siguen sin ejecutarse individualmente.

## 2. Evidencia automatizada

En la primera edición CI de `main` terminaron con éxito los jobs de 200.000 ventas, 1.000.000 ventas y seguridad. En la rama de auditoría se añadieron el recorrido progresivo desde colección sin índices y los scripts literales del manual. Ver el [historial de ejecuciones](https://github.com/jaimecopilot/MONGODB/actions).

**Ejemplo de la primera ejecución real sobre 1.000.000 ventas:** mismo filtro por `idVenta` antes/después: escaneo de 1.000.000 documentos y 413 ms frente a 1 documento y 3 ms con índice simple. Estas cifras son observaciones, no resultados exigibles en otros equipos. Fuente: [INFORME_EJECUCION.md](https://github.com/jaimecopilot/MONGODB/blob/main/INFORME_EJECUCION.md).

## 3. Matriz de ejercicios de indexación

| Laboratorio | Tema | Alcance de la prueba |
|---|---|---|
| Índices 01 | Preparación Docker | Verificación principal en CI |
| Índices 02 | Carga repetible | Verificación principal en CI |
| Índices 03 | Estructura y distribución | CI parcial; falta contraste específico |
| Índices 04 | Línea base | Verificación principal en CI |
| Índices 05 | Búsqueda por número | Verificación principal en CI |
| Índices 06 | Índice simple cliente | Verificación principal en CI |
| Índices 07 | Comparar A/B | Verificación principal en CI |
| Índices 08 | Rangos numéricos | CI parcial; falta contraste específico |
| Índices 09 | Cardinalidad baja | CI parcial; falta contraste específico |
| Índices 10 | Ordenación TOP N | Verificación principal en CI |
| Índices 11 | Compuesto con prefijo | Verificación principal en CI |
| Índices 12 | Sin prefijo | CI parcial; falta contraste específico |
| Índices 13 | ESR | Verificación principal en CI |
| Índices 14 | ERS | Ampliación sin prueba individual |
| Índices 15 | Cubierta | Verificación principal en CI |
| Índices 16 | Plan de ejecución | Verificación principal en CI |
| Índices 17 | Hint | Verificación principal en CI |
| Índices 18 | Multikey etiquetas | Verificación principal en CI |
| Índices 19 | Multikey arrays anidados | CI parcial; falta contraste específico |
| Índices 20 | Texto clásico | Verificación principal en CI |
| Índices 21 | TextScore | CI parcial; falta contraste específico |
| Índices 22 | Geo 2dsphere | Verificación principal en CI |
| Índices 23 | Hashed | Verificación principal en CI |
| Índices 24 | Unique | Verificación principal en CI |
| Índices 25 | Unique compuesto | Ampliación sin prueba individual |
| Índices 26 | Parcial | Ampliación sin prueba individual |
| Índices 27 | TTL con fechas | Verificación principal en CI |
| Índices 28 | TTL conserva reciente | Verificación principal en CI |
| Índices 29 | Ocultar índice | Ampliación sin prueba individual |
| Índices 30 | IndexStats | CI parcial; falta contraste específico |
| Índices 31 | Inventario tamaño | CI parcial; falta contraste específico |
| Índices 32 | Caso integrador | CI parcial; falta contraste específico |

## 4. Matriz de ejercicios de seguridad

| Laboratorio | Tema | Alcance de la prueba |
|---|---|---|
| Seguridad 01 | Inventario Docker | Verificación principal en CI |
| Seguridad 02 | Arranque credenciales | Verificación principal en CI |
| Seguridad 03 | Anónimo denegado | Verificación principal en CI |
| Seguridad 04 | Admin login | Verificación principal en CI |
| Seguridad 05 | Crear colección | Verificación principal en CI |
| Seguridad 06 | Lector permitido | Verificación principal en CI |
| Seguridad 07 | AuthSource incorrecto | CI parcial; falta contraste específico |
| Seguridad 08 | Password incorrecto | Verificación principal en CI |
| Seguridad 09 | Insert denegado | Verificación principal en CI |
| Seguridad 10 | Update denegado | CI parcial; falta contraste específico |
| Seguridad 11 | Delete denegado | CI parcial; falta contraste específico |
| Seguridad 12 | Ver cuentas | CI parcial; falta contraste específico |
| Seguridad 13 | Crear auditor | Ampliación sin prueba individual |
| Seguridad 14 | Rol real | CI parcial; falta contraste específico |
| Seguridad 15 | Escritor permitido | Verificación principal en CI |
| Seguridad 16 | Revocar roles | Ampliación sin prueba individual |
| Seguridad 17 | Recuperar roles | Ampliación sin prueba individual |
| Seguridad 18 | Cadena de conexión | CI parcial; falta contraste específico |
| Seguridad 19 | Compass | Ampliación sin prueba individual |
| Seguridad 20 | Puerto sin publicar | CI parcial; falta contraste específico |
| Seguridad 21 | Logs | CI parcial; falta contraste específico |
| Seguridad 22 | Inspección certificados | Verificación principal en CI |
| Seguridad 23 | TLS | Verificación principal en CI |
| Seguridad 24 | Cliente X.509 | Verificación principal en CI |
| Seguridad 25 | LDAP conceptual | Ampliación sin prueba individual |
| Seguridad 26 | Reposo conceptual | Ampliación sin prueba individual |
| Seguridad 27 | Evaluación integral | CI parcial; falta contraste específico |

## 5. Lo que esta edición NO certifica

- No se ha automatizado cada uno de los 59 laboratorios ampliados o cada variante individual de consulta y usuario: la columna «parcial» distingue lo pendiente.
- No se ha probado conexión de Compass en interfaz gráfica ni integración LDAP real.
- No se ha probado cifrado nativo en reposo de MongoDB Enterprise sobre Community.
- No se han medido latencias con repetición estadística ni equiparado la rapidez de distintos runners.
- El material está orientado a **tres horas presenciales** con preparación previa; las páginas restantes son estudio y ampliación, no 195 páginas para leer en directo.

## 6. Condiciones antes del aula

Preparar Docker y el directorio de trabajo, cargar datos con `01_cargar_ventas.js`, conservar la línea de base con `02_antes.js` y comprobar que el job «Secuencia literal de scripts de índices del manual» está verde. Preparar los usuarios con `08_configurar_seguridad.js` y ensayar 09 (permiso read). La clave del éxito es que el alumnado pueda interpretar *por qué* se reducen documentos examinados y *por qué* una operación es denegada, no repetir comandos sin entenderlos.
