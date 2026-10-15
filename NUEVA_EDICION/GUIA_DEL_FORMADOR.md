# Guía del formador · MongoDB 8.0: índices y seguridad

**Sesión presencial:** 180 minutos.  
**Perfil de entrada:** participantes sin experiencia anterior con índices ni seguridad de MongoDB. Pueden haber utilizado bases de datos, pero esta planificación no da por supuesto el manejo de `mongosh`.  
**Materiales:** cuatro manuales independientes: teoría/prácticas de indexación y teoría/prácticas de seguridad.

## 1. Qué debe comprender el alumno antes de terminar

El objetivo no es cubrir todas las opciones de MongoDB. Al finalizar, cada participante debe poder explicar y ejecutar cinco ideas:

1. Documento, colección, consulta e índice no significan lo mismo.
2. Un acceso sin índice puede examinar una colección entera; un índice adecuado reduce trabajo en una consulta concreta.
3. `explain("executionStats")` permite justificar la diferencia mediante plan, claves y documentos examinados.
4. Un usuario autenticado no tiene necesariamente permiso para escribir.
5. TLS protege el canal; SCRAM o X.509 identifican al cliente; RBAC decide las operaciones.

Se han eliminado deliberadamente objetivos que exigirían configurar LDAP o cifrado Enterprise en MongoDB Community.

## 2. Preparación obligatoria del docente

**No utilices la sesión para descargar la imagen por primera vez.** Hazlo antes y prueba los comandos en el equipo que vas a utilizar.

Desde la raíz del repositorio:

```bash
# PowerShell: Copy-Item .env.example .env
cp .env.example .env
# Edita .env y asigna contraseñas de prueba distintas.
docker compose up -d --wait mongo-indices mongo-seguridad
docker compose ps
```

Comprobar que el laboratorio de indexación arranca y carga datos:

```bash
docker compose exec -T -e VENTAS=200000 mongo-indices mongosh --quiet --file /lab/01_cargar_ventas.js
docker compose exec -T mongo-indices mongosh --quiet --file /lab/02_antes.js
```

**Importante:** no ejecutes aún `03_crear_indices.js` sobre la instancia que usarás para la demostración inicial; el contraste necesita partir de la colección sin índices secundarios. Si lo ejecutaste por error, reinicia las ventas mediante el paso de carga.

Preparar las cuentas de seguridad, con contraseña introducida mediante prompt:

```bash
docker compose exec mongo-seguridad mongosh --username adminlab --authenticationDatabase admin --password --file /lab/08_configurar_seguridad.js
```

Comprueba que `lectorlab` puede leer y que su escritura es rechazada usando las actividades del cuaderno. Si no funciona con usuarios y contraseñas del fichero `.env`, no inicies la sesión sin haberlo corregido.

## 3. Propuesta de secuencia docente

| Minutos | Lo que hace el formador | Lo que demuestra el alumno |
|---|---|---|
| 0–15 | Dibuja documento, colección, consulta y servidor; diferencia terminal y `mongosh` | Identifica dónde ejecutar cada comando |
| 15–35 | Muestra 200.000 ventas ya cargadas; enseña `findOne` y `getIndexes` | Sabe que existe `_id_` pero no índice sobre `numero` |
| 35–60 | Ejecuta `explain()` antes del índice y después de crearlo | Completa una tabla con `nReturned`, `totalDocsExamined` y `totalKeysExamined` |
| 60–80 | Construye con el grupo un índice compuesto por cliente y fecha | Justifica prefijos compuestos sin memorizar ESR |
| 80–100 | Explica con ejemplos breves multikey, texto y TTL | Reconoce un array, búsqueda por palabras y caducidad asíncrona |
| 100–115 | Presenta red, autenticación, autorización y cifrado como capas distintas | Distingue cuatro preguntas de seguridad |
| 115–145 | Conecta sin usuario, como lector y como escritor | Observa lectura denegada, lectura permitida y escritura rechazada |
| 145–165 | Muestra TLS y X.509 conceptualmente; opcionalmente usa demostración ya preparada | Explica por qué un canal cifrado no concede escritura |
| 165–180 | Evaluación breve y puesta en común de resultados | Justifica qué cambió y qué pruebas respaldan su explicación |

Estos tiempos pertenecen únicamente a la guía del formador. Los cuadernos completos contienen ampliaciones para estudio autónomo: no son 195 páginas que deban leerse dentro de las tres horas.

## 4. Estrategia pedagógica

**Explicar → predecir → ejecutar → observar → justificar.** No intercambies los pasos. Por ejemplo, antes de crear un índice, pregunta si el grupo espera que la búsqueda sin índice examine un documento o una parte grande de la colección. Después del experimento, haz que comparen su predicción con el contador real.

Para un principiante, una orden como `docker compose exec -T ...` no es autoexplicativa. Descompón sus componentes y señala la frontera entre terminal y `mongosh`. No continúes hasta que todos puedan repetir la orden básica y encuentren `curso_indices.ventas`.

Las prácticas de seguridad incluyen errores intencionados. Explica con antelación que `Unauthorized` puede ser **la respuesta correcta**. Evita que el grupo intente solventar la falta de permisos utilizando `root`, porque destruiría la evidencia de protección.

## 5. Tres comprobaciones de aprendizaje durante el curso

**Primera:** cada alumno explica qué significa que una consulta devuelva 1 documento pero examine 200.000. Si lo interpreta como «hay 200.000 resultados», vuelve a documento, filtro y plan.

**Segunda:** el grupo propone un índice para «últimas cinco ventas de un cliente». Debe justificar por qué aparece primero el cliente y después la fecha.

**Tercera:** un lector autenticado recibe rechazo al insertar. El alumno tiene que explicar que no falló necesariamente la contraseña: puede ser una denegación correcta del rol.

## 6. Mantener el laboratorio bajo control

El servicio de índices no tiene autenticación y se restringe a loopback. Solo admite datos ficticios. La instancia de seguridad tiene autenticación; la de TLS requiere certificados generados previamente.

La carga de ventas borra y recrea `curso_indices.ventas`. Si el docente necesita repetir la demostración, deberá reiniciar también la medición inicial. No se deben ejecutar scripts de demostración sobre datos reales.

Las funciones de LDAP autogestionado y de cifrado nativo en reposo no se prueban en MongoDB Community. Se explican sus propósitos y requisitos de edición sin sustituirlos por simulaciones.

## 7. Criterios para evaluar respuestas

Considera suficiente una respuesta cuando identifica **la operación**, **el dato o rol relevante** y **la evidencia observada**.

No basta decir «el índice acelera». Es mejor: «con la misma búsqueda por número se pasó de un escaneo de muchos documentos a utilizar claves del índice y examinar uno».

No basta decir «el usuario no puede entrar». Es mejor: «el usuario lector sí se autenticó y pudo leer, pero una inserción fue rechazada porque su rol no autoriza escrituras».

### Recursos de consulta

- [Índices de MongoDB 8.0](https://www.mongodb.com/docs/v8.0/indexes/)
- [Resultados de explain](https://www.mongodb.com/docs/v8.0/reference/explain-results/)
- [Autenticación](https://www.mongodb.com/docs/v8.0/core/authentication/)
