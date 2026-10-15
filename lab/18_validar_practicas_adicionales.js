// Validacion adicional de ejercicios manuales: MongoDB Community 8.0.
// Colecciones exclusivas de esta prueba, sin modificar curso_indices.ventas.
// La finalidad es comprobar la semantica que estudia el alumno.
const d = db.getSiblingDB("curso_indices");
function comprobar(ok,mensaje){
  if(!ok) throw new Error("[ERROR] "+mensaje);
  print("[OK] "+mensaje);
}
function fresh(name){
  const c=d.getCollection("validacion_"+name);
  c.drop();
  return c;
}
// Indices sobre arrays: condiciones separadas vs $elemMatch.
{
  const c=fresh("arrays");
  c.insertMany([
    {_id:1,productos:[{sku:"SKU10",cantidad:1},{sku:"SKU20",cantidad:3}]},
    {_id:2,productos:[{sku:"SKU10",cantidad:3}]},
    {_id:3,productos:[{sku:"SKU30",cantidad:3}]}
  ]);
  comprobar(c.find({"productos.sku":"SKU10","productos.cantidad":3}).itcount()===2,
    "Dos condiciones separadas pueden cumplirse en diferentes elementos del array");
  comprobar(c.find({productos:{$elemMatch:{sku:"SKU10",cantidad:3}}}).itcount()===1,
    "$elemMatch exige coincidencia en el mismo elemento");
  c.createIndex({"productos.sku":1,"productos.cantidad":1},{name:"ix_productos_sku_cantidad"});
  comprobar(c.getIndexes().some(i=>i.name==="ix_productos_sku_cantidad"),
    "Indice multikey compuesto en campos del mismo array creado");
}
// Texto: igualdad de descripcion frente a indice de texto.
{
  const c=fresh("texto");
  c.insertMany([
    {_id:1,descripcion:"cafe premium en grano"},
    {_id:2,descripcion:"cafetera para oficina"},
    {_id:3,descripcion:"bicicleta urbana plegable"}
  ]);
  comprobar(c.countDocuments({descripcion:"cafe"})===0,
    "Igualdad de descripcion no busca un termino dentro de la cadena");
  c.createIndex({descripcion:"text"},{name:"ix_texto_clase",default_language:"spanish"});
  comprobar(c.countDocuments({$text:{$search:"premium"}})===1,
    "Busqueda de termino textual encuentra la descripcion correspondiente");
  comprobar(c.countDocuments({descripcion:{$regex:"cafe",$options:"i"}})===2,
    "Busqueda regex de subcadena no equivale a busqueda de terminos");
}
// Coordenadas GeoJSON y distancias en metros.
{
  const c=fresh("geo");
  c.insertMany([
    {_id:1,nombre:"Sol",ubicacion:{type:"Point",coordinates:[-3.7038,40.4168]}},
    {_id:2,nombre:"Retiro",ubicacion:{type:"Point",coordinates:[-3.6833,40.4153]}},
    {_id:3,nombre:"Barcelona",ubicacion:{type:"Point",coordinates:[2.1700,41.3800]}}
  ]);
  c.createIndex({ubicacion:"2dsphere"},{name:"ix_puntos_esfera"});
  const data=c.find({ubicacion:{$near:{
    $geometry:{type:"Point",coordinates:[-3.7038,40.4168]},
    $maxDistance:3500
  }}}).toArray();
  comprobar(data.length===2 && data[0].nombre==="Sol" && data[1].nombre==="Retiro",
    "Indice 2dsphere localiza puntos proximos y excluye Barcelona");
}
// Collation: minusculas/mayusculas, unicidad linguistica.
{
  const c=fresh("collation");
  c.insertOne({_id:1,nombre:"Ana"});
  comprobar(c.countDocuments({nombre:"ana"})===0,
    "Igualdad binaria no encuentra Ana buscando ana");
  comprobar(c.find({nombre:"ana"}).collation({locale:"es",strength:2}).itcount()===1,
    "Collation es de nivel 2 encuentra mayusculas y minusculas");
  c.createIndex({nombre:1},{name:"ix_nombre_es",collation:{locale:"es",strength:2}});
  const plan=c.find({nombre:"ana"}).collation({locale:"es",strength:2})
    .hint("ix_nombre_es").explain("executionStats");
  comprobar(plan.executionStats.nReturned===1,
    "La consulta con collation compatible puede usar el indice");
  const u=fresh("collation_unique");
  u.createIndex({nombre:1},{unique:true,collation:{locale:"es",strength:2}});
  u.insertOne({_id:1,nombre:"Ana"});
  let errorDuplicado=false;
  try{u.insertOne({_id:2,nombre:"ana"});}catch(e){errorDuplicado=e.code===11000;}
  comprobar(errorDuplicado,"Indice unique con collation rechaza Ana/ana");
}
// Proyeccion de consulta cubierta y necesidad de FETCH.
{
  const c=fresh("covered");
  c.insertMany([
    {_id:1,clienteId:809,importe:10,descripcion:"primera"},
    {_id:2,clienteId:809,importe:20,descripcion:"segunda"},
    {_id:3,clienteId:810,importe:30,descripcion:"tercera"}
  ]);
  c.createIndex({clienteId:1,importe:1},{name:"ix_cubierta_cliente_importe"});
  const stats1=c.find({clienteId:809},{_id:0,clienteId:1,importe:1})
    .hint("ix_cubierta_cliente_importe").explain("executionStats").executionStats;
  comprobar(stats1.nReturned===2 && stats1.totalDocsExamined===0,
    "Proyeccion cubierta devuelve dos ventas sin leer documentos");
  const stats2=c.find({clienteId:809},{_id:0,clienteId:1,importe:1,descripcion:1})
    .hint("ix_cubierta_cliente_importe").explain("executionStats").executionStats;
  comprobar(stats2.nReturned===2 && stats2.totalDocsExamined>0,
    "Pedir descripcion obliga a recuperar documentos");
}
// Unicidad de emails opcionales.
{
  const c=fresh("email_optional");
  c.insertMany([{_id:1,nombre:"A"},{_id:2,nombre:"B"},{_id:3,email:"c@ejemplo.test"}]);
  c.createIndex({email:1},{unique:true,partialFilterExpression:{email:{$type:"string"}}});
  c.insertOne({_id:4,nombre:"D"});
  let dup=false;
  try{c.insertOne({_id:5,email:"c@ejemplo.test"});}catch(e){dup=e.code===11000;}
  comprobar(dup && c.countDocuments({email:{$exists:false}})===3,
    "Indice unique parcial permite campos ausentes y rechaza email repetido");
}
// Agregacion, filtro, ordenacion, limite.
{
  const c=fresh("aggregate");
  c.insertMany([
    {_id:1,estado:"pagada",fecha:new Date("2025-01-01T00:00:00Z")},
    {_id:2,estado:"pagada",fecha:new Date("2025-01-03T00:00:00Z")},
    {_id:3,estado:"pagada",fecha:new Date("2025-01-02T00:00:00Z")},
    {_id:4,estado:"pendiente",fecha:new Date("2025-01-04T00:00:00Z")}
  ]);
  const res=c.aggregate([{$match:{estado:"pagada"}},{$sort:{fecha:-1}},{$limit:2}]).toArray();
  comprobar(res.length===2 && res[0]._id===2 && res[1]._id===3,
    "Pipeline match-sort-limit devuelve las pagadas mas recientes");
}
print("[OK] EJERCICIOS ADICIONALES COMPROBADOS SOBRE MONGODB REAL");