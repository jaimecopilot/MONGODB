#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${MONGO_ADMIN_PASSWORD:?Falta MONGO_ADMIN_PASSWORD}"
: "${LAB_READER_PASSWORD:?Falta LAB_READER_PASSWORD}"
: "${LAB_WRITER_PASSWORD:?Falta LAB_WRITER_PASSWORD}"
fail_if_succeeds() {
  local titulo="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "[ERROR] Era obligatorio que fallara: $titulo" >&2
    exit 1
  fi
  echo "[OK] Rechazo esperado: $titulo"
}
echo "[INFO] Crear usuarios y roles SCRAM"
docker compose exec -T -e LAB_READER_PASSWORD="$LAB_READER_PASSWORD" -e LAB_WRITER_PASSWORD="$LAB_WRITER_PASSWORD" mongo-seguridad \
  mongosh --quiet -u adminlab -p "$MONGO_ADMIN_PASSWORD" --authenticationDatabase admin --file /lab/seguridad-inicializar.js
fail_if_succeeds "sin autenticar: lectura privada" \
  docker compose exec -T mongo-seguridad mongosh --quiet --eval 'db.getSiblingDB("curso_seguridad").secretos.findOne()'
fail_if_succeeds "contraseña SCRAM incorrecta" \
  docker compose exec -T mongo-seguridad mongosh --quiet -u lectorlab -p clave-incorrecta --authenticationDatabase curso_seguridad --eval 'db.getSiblingDB("curso_seguridad").secretos.findOne()'
docker compose exec -T mongo-seguridad mongosh --quiet -u lectorlab -p "$LAB_READER_PASSWORD" --authenticationDatabase curso_seguridad \
  --eval 'if (!db.getSiblingDB("curso_seguridad").secretos.findOne({_id:"demo-1"})) throw new Error("Lector no lee");print("[OK] Lector autenticado puede leer");'
fail_if_succeeds "rol read: inserción denegada" \
  docker compose exec -T mongo-seguridad mongosh --quiet -u lectorlab -p "$LAB_READER_PASSWORD" --authenticationDatabase curso_seguridad \
    --eval 'db.getSiblingDB("curso_seguridad").secretos.insertOne({_id:"intento",texto:"prohibido"})'
docker compose exec -T mongo-seguridad mongosh --quiet -u escritorlab -p "$LAB_WRITER_PASSWORD" --authenticationDatabase curso_seguridad \
  --eval 'db.getSiblingDB("curso_seguridad").secretos.insertOne({_id:"permitido",texto:"ok"});print("[OK] Escritor con readWrite puede insertar");'
echo "[INFO] TLS: probar que no se permite conexion en texto claro"
fail_if_succeeds "servidor TLS rechaza conexion sin TLS" \
  docker compose exec -T mongo-tls mongosh --quiet --host localhost --eval 'db.adminCommand({ping:1})'
echo "[INFO] Certificado de CA valido"
docker compose exec -T mongo-tls mongosh --quiet --host localhost --tls --tlsCAFile /certs/ca.crt \
  --eval 'if(db.adminCommand({ping:1}).ok!==1) throw new Error("TLS fallo");print("[OK] Conexion TLS valida");'
echo "[INFO] Crear root para TLS mediante excepcion localhost, con TLS"
docker compose exec -T -e ADMIN_PASSWORD="$MONGO_ADMIN_PASSWORD" mongo-tls \
  mongosh --quiet --host localhost --tls --tlsCAFile /certs/ca.crt --file /lab/tls-administrador.js
X509_DN="$(openssl x509 -in certs/client.crt -noout -subject -nameopt RFC2253 | sed 's/^subject=//;s/^ *//')"
echo "[INFO] Registrar identidad de certificado ${X509_DN}"
docker compose exec -T -e X509_DN="$X509_DN" mongo-tls \
  mongosh --quiet --host localhost --tls --tlsCAFile /certs/ca.crt \
  -u admincert -p "$MONGO_ADMIN_PASSWORD" --authenticationDatabase admin --file /lab/tls-usuario-x509.js
echo "[INFO] Identificacion cliente mediante certificado X509"
docker compose exec -T mongo-tls \
  mongosh --quiet --host localhost --tls --tlsCAFile /certs/ca.crt \
  --tlsCertificateKeyFile /certs/client.pem --authenticationMechanism MONGODB-X509 \
  --authenticationDatabase '$external' \
  --eval 'if(!db.getSiblingDB("curso_cert").pruebas.findOne({_id:1})) throw new Error("No autorizado");print("[OK] Usuario X509 autentica y lee");'
fail_if_succeeds "certificado X509 solo lectura no inserta" \
  docker compose exec -T mongo-tls \
    mongosh --quiet --host localhost --tls --tlsCAFile /certs/ca.crt \
    --tlsCertificateKeyFile /certs/client.pem --authenticationMechanism MONGODB-X509 \
    --authenticationDatabase '$external' \
    --eval 'db.getSiblingDB("curso_cert").pruebas.insertOne({_id:2})'
echo "[OK] BANCO DE SEGURIDAD COMPLETO"
