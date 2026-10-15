const c=db.getSiblingDB("curso_indices").ventas;
function test(cond,desc){if(!cond)throw new Error(desc);print("[OK] "+desc)}
test(c.find({etiquetas:"web"}).limit(1).hasNext(),"Multikey en etiquetas");
test(c.find({$text:{$search:"cafe"}}).limit(1).hasNext(),"Busqueda textual cafe");
c.createIndex({ubicacion:"2dsphere"},{name:"ix_ubicacion"});
test(c.find({ubicacion:{$near:{$geometry:{type:"Point",coordinates:[-3.700,40.420]},$maxDistance:20000}}}).limit(1).hasNext(),"Geoespacial 2dsphere");
test(c.find({idGrupo:809}).hint("ix_grupo_hash").limit(1).hasNext(),"Indice hashed igualdad");
