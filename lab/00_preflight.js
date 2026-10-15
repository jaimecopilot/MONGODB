const c=db.getSiblingDB("curso_indices").ventas;
if(c.estimatedDocumentCount()===0)throw new Error("Ejecuta 01_cargar_ventas.js primero");
print("[OK] "+c.estimatedDocumentCount()+" ventas; indices: "+JSON.stringify(c.getIndexes().map(x=>x.name)));
