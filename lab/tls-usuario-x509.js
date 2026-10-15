// Ejecutado tras autenticar como admincert.
const dn = process.env.X509_DN;
if (!dn || !dn.includes("CN=alumno-x509")) throw new Error("DN certificado inesperado: " + dn);
const acceso = db.getSiblingDB("curso_cert");
acceso.pruebas.drop();
acceso.pruebas.insertOne({ _id:1, mensaje:"X509 funciona", prueba:"lectura de alumno" });
const externo = db.getSiblingDB("$external");
if (externo.getUser(dn)) externo.dropUser(dn);
externo.createUser({user:dn,roles:[{role:"read",db:"curso_cert"}]});
print("[OK] Identidad externa X509 registrada: " + dn);
