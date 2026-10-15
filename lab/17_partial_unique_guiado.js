// Practica nueva: unique parcial y transiciones de estado.
// Trabaja exclusivamente sobre curso_indices.cupones_verificacion.
const d=db.getSiblingDB("curso_indices"),c=d.cupones_verificacion;
function verificar(ok,mensaje){if(!ok)throw new Error("[ERROR] "+mensaje);print("[OK] "+mensaje);}
c.drop();
c.createIndex({codigo:1},{name:"ix_codigo_activo",unique:true,partialFilterExpression:{activo:true}});
verificar(c.getIndexes().some(x=>x.name==="ix_codigo_activo"),"Indice parcial unique creado");
c.insertOne({_id:1,codigo:"PROMO7",activo:true,descripcion:"Actual"});
c.insertOne({_id:2,codigo:"PROMO7",activo:false,descripcion:"Anterior"});
verificar(c.countDocuments({codigo:"PROMO7"})===2,"La repeticion entre activo e inactivo esta permitida");
let duplicado=false;
try{c.updateOne({_id:2},{$set:{activo:true}})}catch(e){duplicado=e.code===11000;}
verificar(duplicado,"Activar duplicado produce E11000");
verificar(c.findOne({_id:2}).activo===false,"La actualizacion denegada no altera el documento");
c.updateOne({_id:1},{$set:{activo:false}});
c.updateOne({_id:2},{$set:{activo:true}});
verificar(c.countDocuments({codigo:"PROMO7",activo:true})===1,"Hay un unico cupon activo");
verificar(c.findOne({_id:2}).activo===true,"Activacion permitida tras desactivar original");
print("[OK] INDICE PARCIAL UNIQUE VERIFICADO");
