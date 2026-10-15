// Recorrido de clase separado del banco integral: parte sin indices.
const d=db.getSiblingDB("curso_indices");
const c=d.ventas;
function ok(x,m) { if(!x)throw new Error("FAIL: "+m); print("[OK] "+m); }
function info(label,e){print("[INFO] "+label+" "+JSON.stringify({nReturned:e.executionStats.nReturned,totalDocsExamined:e.executionStats.totalDocsExamined,totalKeysExamined:e.executionStats.totalKeysExamined,executionTimeMillis:e.executionStats.executionTimeMillis}));}
const count=c.countDocuments({});
ok(count===200000,"Volumen docente: 200000");
ok(c.getIndexes().length===1,"Linea base solo con _id");
const filter={idVenta:count-2};
const initial=c.find(filter).explain("executionStats");
info("Sin indice",initial);
ok(JSON.stringify(initial.queryPlanner.winningPlan).includes("COLLSCAN"),"COLLSCAN inicial");
c.createIndex({idVenta:1},{name:"idx_idVenta",unique:true});
const after=c.find(filter).explain("executionStats");
info("Con indice simple",after);
ok(JSON.stringify(after.queryPlanner.winningPlan).includes("IXSCAN"),"IXSCAN tras crear indice");
ok(after.executionStats.totalDocsExamined===1,"Una lectura de documento");
c.createIndex({clienteId:1,fecha:-1},{name:"idx_cliente_fecha"});
ok(c.find({clienteId:42}).sort({fecha:-1}).limit(5).toArray().length>0,"Consulta compuesta cliente-fecha");
c.createIndex({tienda:1,fecha:-1,importe:1},{name:"idx_esr_aula"});
const esr=c.find({tienda:"Madrid",fecha:{$gte:ISODate("2025-07-01")}}).sort({fecha:-1}).limit(5).explain("executionStats");
ok(JSON.stringify(esr.queryPlanner.winningPlan).includes("IXSCAN"),"Recorrido compuesto ESR");
c.createIndex({tags:1},{name:"idx_tags_aula"});
ok(c.find({tags:"promocion"}).hint("idx_tags_aula").limit(1).hasNext(),"Multikey array");
c.createIndex({descripcion:"text"},{name:"idx_texto_aula"});
ok(c.find({$text:{$search:"reclamacion"}}).limit(1).hasNext(),"Busqueda text");
const u=d.integridad_aula;u.drop();u.createIndex({email:1},{unique:true});u.insertOne({email:"test@ejemplo.test"});
let dup=false;try{u.insertOne({email:"test@ejemplo.test"});}catch(e){dup=e.code===11000;}ok(dup,"Unique rechaza duplicado");
const ttl=d.ttl_aula;ttl.drop();ttl.createIndex({expiraEn:1},{expireAfterSeconds:0});
ttl.insertOne({_id:"expirada",expiraEn:new Date(Date.now()-60000)});
let gone=false;for(let i=0;i<50;i++){if(ttl.countDocuments({_id:"expirada"})===0){gone=true;break;}sleep(1000);}
ok(gone,"TTL expira de forma asincrona");
print("[OK] RECORRIDO DIDACTICO VALIDADO");