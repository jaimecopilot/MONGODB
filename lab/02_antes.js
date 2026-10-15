const c=db.getSiblingDB("curso_indices").ventas;
if(c.getIndexes().length!==1)throw new Error("Para linea base ejecuta 01_cargar_ventas.js");
const n=c.estimatedDocumentCount();
const e=c.find({numero:n-2}).explain("executionStats");
printjson({etapa:e.queryPlanner.winningPlan, nReturned:e.executionStats.nReturned,totalDocsExamined:e.executionStats.totalDocsExamined,totalKeysExamined:e.executionStats.totalKeysExamined,executionTimeMillis:e.executionStats.executionTimeMillis});
if(e.executionStats.totalDocsExamined<n-2)throw new Error("Se esperaba COLLSCAN con casi toda la coleccion");
print("[OK] Linea base sin indices secundarios");
