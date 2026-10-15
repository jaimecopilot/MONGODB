// Comprueba ejemplos adicionales empleados por la nueva edición docente.
// Solo crea y elimina colecciones con sufijo _test_lectivo en curso_indices.
const d=db.getSiblingDB("curso_indices");
const check=(ok,msg)=>{if(!ok)throw new Error("[FAIL] "+msg);print("[OK] "+msg);};

// Arrays de subdocumentos: la condición ha de cumplirse en el MISMO elemento.
const pedidos=d.productos_test_lectivo;pedidos.drop();
pedidos.insertMany([
 {_id:1,productos:[{sku:"SKU10",cantidad:1},{sku:"SKU20",cantidad:3}]},
 {_id:2,productos:[{sku:"SKU10",cantidad:3}]},
 {_id:3,productos:[{sku:"SKU30",cantidad:3}]}
]);
check(pedidos.find({"productos.sku":"SKU10","productos.cantidad":3}).count()===2,
 "Las dos condiciones sobre el array, sin elemMatch, alcanzan dos documentos");
check(pedidos.find({productos:{$elemMatch:{sku:"SKU10",cantidad:3}}}).count()===1,
 "elemMatch limita las condiciones a un mismo subdocumento");
pedidos.createIndex({"productos.sku":1,"productos.cantidad":1},{name:"ix_producto_compuesto"});
check(pedidos.find({productos:{$elemMatch:{sku:"SKU10",cantidad:3}}}).count()===1,
 "La semantica de elemMatch persiste con indice multikey");

// Collation: nombres iguales bajo reglas de comparación sin distinción de caso.
const nombres=d.nombres_test_lectivo;nombres.drop();
nombres.insertMany([{_id:1,nombre:"Ana"},{_id:2,nombre:"Carlos"},{_id:3,nombre:"Beatriz"}]);
check(nombres.find({nombre:"ana"}).count()===0,
 "Sin collation explicita la igualdad de nombres distingue el caso");
check(nombres.find({nombre:"ana"}).collation({locale:"es",strength:2}).count()===1,
 "Collation española de fuerza 2 encuentra Ana por ana");
nombres.createIndex({nombre:1},{name:"ix_nombre_es",collation:{locale:"es",strength:2}});
check(nombres.find({nombre:"ana"}).collation({locale:"es",strength:2}).hint("ix_nombre_es").count()===1,
 "La consulta con collation puede utilizar su indice");

// Unique sensible a collation.
const unicos=d.nombres_unicos_test_lectivo;unicos.drop();
unicos.createIndex({nombre:1},{unique:true,collation:{locale:"es",strength:2}});
unicos.insertOne({nombre:"Ana"});
let bloqueado=false;
try{unicos.insertOne({nombre:"ana"})}catch(e){bloqueado=e.code===11000;}
check(bloqueado,"Unique y collation rechazan Ana/ana como duplicados");

// Text index no equivale a igualdad.
const descripciones=d.descripciones_test_lectivo;descripciones.drop();
descripciones.insertMany([
 {_id:1,descripcion:"cafe premium en grano"},
 {_id:2,descripcion:"cafetera para oficina"},
 {_id:3,descripcion:"bicicleta urbana plegable"}
]);
check(descripciones.countDocuments({descripcion:"cafe"})===0,
 "Igualdad de texto completo no encuentra frase con mas palabras");
check(descripciones.countDocuments({descripcion:{$regex:"cafe",$options:"i"}})===2,
 "Regex busca secuencias de caracteres");
descripciones.createIndex({descripcion:"text"},{name:"ix_texto_clase",default_language:"spanish"});
check(descripciones.find({$text:{$search:"premium"}}).count()===1,
 "La busqueda de terminos mediante indice text encuentra premium");

// Partial unique con correos opcionales.
const correos=d.correos_test_lectivo;correos.drop();
correos.insertMany([{_id:1},{_id:2},{_id:3,email:"c@ejemplo.test"}]);
correos.createIndex({email:1},{unique:true,partialFilterExpression:{email:{$type:"string"}}});
correos.insertOne({_id:4});
let duplicado=false;
try{correos.insertOne({_id:5,email:"c@ejemplo.test"})}catch(e){duplicado=e.code===11000;}
check(duplicado,"Unique parcial permite ausencias pero rechaza email repetido");

// Crear índice unique sobre duplicados debe fallar sin eliminar los datos.
const corruptos=d.duplicados_test_lectivo;corruptos.drop();
corruptos.insertMany([{_id:1,codigo:"A"},{_id:2,codigo:"B"},{_id:3,codigo:"A"}]);
let falloConstruccion=false;
try{corruptos.createIndex({codigo:1},{unique:true})}catch(e){falloConstruccion=e.code===11000;}
check(falloConstruccion,"Construir indice unique con duplicados falla");
check(corruptos.countDocuments({})===3,"La coleccion conserva los registros para diagnosticar");
corruptos.updateOne({_id:3},{$set:{codigo:"C"}});
corruptos.createIndex({codigo:1},{unique:true});
check(corruptos.getIndexes().some(x=>x.unique===true),"Tras corregir el conflicto se crea unique");
print("[OK] EJEMPLOS AMPLIADOS DE LOS MANUALES VALIDADOS");
