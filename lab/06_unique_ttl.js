const d=db.getSiblingDB("curso_indices");
const u=d.unicidad_demo;u.drop();u.createIndex({email:1},{unique:true});u.insertOne({email:"unico@ejemplo.test"});
let rechazo=false;try{u.insertOne({email:"unico@ejemplo.test"});}catch(e){rechazo=e.code===11000;}
if(!rechazo)throw new Error("Se esperaba E11000");
print("[OK] E11000: duplicado rechazado");
const t=d.sesiones_demo;t.drop();t.createIndex({expiraEn:1},{expireAfterSeconds:0});
t.insertMany([{_id:"expirado",expiraEn:new Date(Date.now()-60000)},{_id:"vigente",expiraEn:new Date(Date.now()+3600000)}]);
print("[OK] TTL definido; borrado eventual, no instantaneo");
