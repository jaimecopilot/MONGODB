const b=db.getSiblingDB("curso_seguridad");
if(!b.secretos.findOne({_id:"demo-1"}))throw new Error("No puede leer");
let denegado=false;
try{b.secretos.insertOne({_id:"intento-prohibido",valor:1});}catch(e){denegado=e.code===13||/not authorized|Unauthorized/i.test(e.message)}
if(!denegado)throw new Error("ERROR: lector pudo escribir");
print("[OK] Lector lee y no puede insertar");
