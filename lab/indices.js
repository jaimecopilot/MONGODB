// Banco de pruebas real sobre MongoDB Community 8.0.
// Modifica y elimina exclusivamente datos de la base docente curso_indices.
const n = Number(process.env.VENTAS || 200000);
if (!Number.isInteger(n) || n < 1000 || n > 1000000) throw new Error("VENTAS debe ser entero entre 1000 y 1000000");
const test = db.getSiblingDB("curso_indices");
const sales = test.ventas;
sales.drop();
function check(ok, detail) { if (!ok) throw new Error("FAIL: " + detail); print("[OK] " + detail); }
function resumen(label, e) {
  const s = e.executionStats;
  print("[INFO] " + label + " => " + JSON.stringify({
    nReturned:s.nReturned, totalKeysExamined:s.totalKeysExamined,
    totalDocsExamined:s.totalDocsExamined, executionTimeMillis:s.executionTimeMillis
  }));
}
function planContains(e, text) {
  return JSON.stringify(e.queryPlanner.winningPlan).includes(text);
}
print("[INFO] Generando " + n.toLocaleString("es-ES") + " ventas deterministas.");
const shops = ["Madrid","Barcelona","Sevilla","Bilbao"];
const categories = ["libros","informatica","hogar","deporte"];
const itemsPerBatch = 2000;
for (let start = 0; start < n; start += itemsPerBatch) {
  const documents = [];
  const end = Math.min(n,start+itemsPerBatch);
  for (let i=start;i<end;i++) {
    documents.push({
      _id:i+1, idVenta:i+1, numero:i+1, tienda:shops[i%4], categoria:categories[Math.floor(i/4)%4],
      estado:["pagada","pendiente","enviada","cancelada"][i%4],
      region:["centro","norte","sur","este","oeste"][i%5],
      etiquetas:["venta",i%3===0?"web":"tienda",i%11===0?"urgente":"normal"],
      idGrupo:i%10000,
      ubicacion:{type:"Point",coordinates:[-3.70+((i*7)%101)/10000,40.42+((i*11)%101)/10000]},
      clienteId:(i*37)%20000, clienteHash:i,
      fecha:new Date(Date.UTC(2025,0,1+(i%365))), importe:(i%10000)/10 + 0.95,
      tags: i%2===0 ? ["online","promocion"] : ["tienda","entrega"],
      descripcion: i%97===0 ? "reclamacion urgente del cliente" : i%8===0 ? "cafe premium en grano" : i%8===1 ? "bicicleta urbana plegable" : "compra habitual",
      productos:[{sku:"SKU"+(i%100),cantidad:(i%3)+1}]
    });
  }
  sales.insertMany(documents,{ordered:false});
  if ((start + itemsPerBatch) % 100000 === 0 || end === n) print("[INFO] Insertadas: " + end);
}
check(sales.estimatedDocumentCount()===n, "Se han cargado las ventas solicitadas");
const target=n-2;
const without=sales.find({idVenta:target}).explain("executionStats");
resumen("Sin indice",without);
check(planContains(without,"COLLSCAN"),"La consulta sin indice usa COLLSCAN");
check(without.executionStats.totalDocsExamined >= n-2, "Sin indice se examina aproximadamente toda la coleccion");
sales.createIndex({idVenta:1},{unique:true});
const withIndex=sales.find({idVenta:target}).explain("executionStats");
resumen("Indice simple",withIndex);
check(planContains(withIndex,"IXSCAN"),"La consulta por idVenta utiliza IXSCAN");
check(withIndex.executionStats.totalDocsExamined<=2,"El indice reduce drásticamente documentos examinados");
sales.createIndex({tienda:1,fecha:-1,importe:1},{name:"idx_esr_tienda_fecha_importe"});
const esr=sales.find({tienda:"Madrid",fecha:{$gte:new Date("2025-07-01")}}).sort({fecha:-1}).limit(5).explain("executionStats");
resumen("Compuesto ESR",esr);
check(planContains(esr,"IXSCAN"),"El compuesto ESR usa un indice");
check(!planContains(esr,"\"SORT\""),"El orden solicitado se resuelve sin etapa SORT independiente");
sales.createIndex({tags:1},{name:"idx_tags_multikey"});
const multi=sales.find({tags:"promocion"}).hint("idx_tags_multikey").limit(3).explain("executionStats");
resumen("Multikey",multi);
check(planContains(multi,"IXSCAN"),"El indice multikey recorre entradas de un array");
sales.createIndex({descripcion:"text"},{name:"idx_descripcion_texto"});
const textMatches=sales.find({$text:{$search:"reclamacion urgente"}}).limit(3).toArray();
check(textMatches.length===3,"Busqueda full-text encuentra documentos");
const textPlan=sales.find({$text:{$search:"reclamacion"}}).limit(3).explain("queryPlanner");
check(planContains(textPlan,"TEXT") || planContains(textPlan,"IXSCAN"),"El plan identifica la busqueda de texto");
sales.createIndex({clienteHash:"hashed"},{name:"idx_cliente_hashed"});
const hashed=sales.find({clienteHash:target}).hint("idx_cliente_hashed").explain("executionStats");
resumen("Hashed",hashed);
check(hashed.executionStats.nReturned===1 && planContains(hashed,"IXSCAN"),"El indice hashed sirve para igualdad");
sales.createIndex({clienteId:1,importe:1},{name:"idx_cubierto_cliente_importe"});
const covered=sales.find({clienteId:42},{_id:0,clienteId:1,importe:1})
  .hint("idx_cubierto_cliente_importe").limit(3).explain("executionStats");
resumen("Consulta cubierta",covered);
check(covered.executionStats.totalDocsExamined===0,"Consulta cubierta no requiere leer documentos");
const geo=test.puntos;
geo.drop();
geo.insertMany([
  {nombre:"Sol",ubicacion:{type:"Point",coordinates:[-3.7038,40.4168]}},
  {nombre:"Retiro",ubicacion:{type:"Point",coordinates:[-3.6833,40.4153]}},
  {nombre:"Barcelona",ubicacion:{type:"Point",coordinates:[2.17,41.38]}}
]);
geo.createIndex({ubicacion:"2dsphere"},{name:"idx_ubicacion_2dsphere"});
const nearby=geo.find({ubicacion:{$near:{$geometry:{type:"Point",coordinates:[-3.7038,40.4168]},$maxDistance:3500}}}).toArray();
check(nearby.length===2,"Indice geoespacial 2dsphere identifica los puntos próximos");
const unique=test.alumnos;
unique.drop();
unique.createIndex({email:1},{unique:true});
unique.insertOne({email:"persona@ejemplo.test"});
let duplicateFailed=false;
try {unique.insertOne({email:"persona@ejemplo.test"});} catch(err) {duplicateFailed = err.code===11000;}
check(duplicateFailed,"Indice unique impide duplicidad (E11000)");
const sessions=test.sesiones;
sessions.drop();
sessions.createIndex({expiraEn:1},{expireAfterSeconds:0});
sessions.insertMany([{_id:"expirada",expiraEn:new Date(Date.now()-60000)},{_id:"vigente",expiraEn:new Date(Date.now()+3600000)}]);
let expiredGone=false;
for(let attempt=0;attempt<50;attempt++) {
  if (sessions.countDocuments({_id:"expirada"})===0) {expiredGone=true;break;}
  sleep(1000);
}
check(expiredGone,"Monitor TTL elimina automaticamente el registro expirado");
check(sessions.countDocuments({_id:"vigente"})===1,"TTL conserva el registro que no ha expirado");
print("[OK] BANCO DE INDEXACION COMPLETO — " + n + " ventas");
