#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs
rm -f certs/*.crt certs/*.key certs/*.pem certs/*.csr certs/*.srl certs/*.cnf
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 2 -keyout certs/ca.key -out certs/ca.crt -subj "/O=MongoDBFormacion/CN=CA-Docente" >/dev/null 2>&1
cat > certs/server.cnf <<'EOF'
[req]
distinguished_name = dn
prompt = no
req_extensions = req_ext
[dn]
O = MongoDBFormacion
OU = Servidores
CN = mongo-tls
[req_ext]
subjectAltName = @alt_names
[alt_names]
DNS.1 = mongo-tls
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF
openssl req -new -newkey rsa:2048 -nodes -sha256 -keyout certs/server.key -out certs/server.csr -config certs/server.cnf >/dev/null 2>&1
openssl x509 -req -days 2 -sha256 -in certs/server.csr -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial -out certs/server.crt -extfile certs/server.cnf -extensions req_ext >/dev/null 2>&1
cat certs/server.key certs/server.crt > certs/server.pem
openssl req -new -newkey rsa:2048 -nodes -sha256 -keyout certs/client.key -out certs/client.csr -subj "/O=MongoDBFormacion/OU=Alumnos/CN=alumno-x509" >/dev/null 2>&1
openssl x509 -req -days 2 -sha256 -in certs/client.csr -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial -out certs/client.crt >/dev/null 2>&1
cat certs/client.key certs/client.crt > certs/client.pem
openssl verify -CAfile certs/ca.crt certs/server.crt certs/client.crt
# Únicamente en laboratorio efímero: lectura de PEM por UID mongodb en Docker.
# No reproducir esta gestion de permisos de claves privadas en produccion.
chmod 644 certs/ca.crt certs/server.pem certs/client.pem
echo "[OK] Certificados de prueba creados; ignorados por Git"
