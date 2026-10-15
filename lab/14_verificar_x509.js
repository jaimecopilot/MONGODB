const b=db.getSiblingDB("curso_cert");
if(!b.pruebas.findOne({_id:1}))throw new Error("No puede leer con X509");
print("[OK] Acceso X509 a coleccion autorizada");
