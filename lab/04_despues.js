const c=db.getSiblingDB("curso_indices").ventas;
const n=c.estimatedDocumentCount();
const e=c.find({numero:n-2}).explain("executionStats");
printjson({nReturned:e.executionStats.nReturned,totalDocsExamined:e.executionStats.totalDocsExamined,totalKeysExamined:e.executionStats.totalKeysExamined,executionTimeMillis:e.executionStats.executionTimeMillis,plan:e.queryPlanner.winningPlan});
if(e.executionStats.totalDocsExamined!==1)throw new Error("El indice por numero no redujo la busqueda");
const cliente=c.find({clienteId:809}).hint("ix_cliente").explain("executionStats");
printjson({consulta:"clienteId",totalDocsExamined:cliente.executionStats.totalDocsExamined,totalKeysExamined:cliente.executionStats.totalKeysExamined});
print("[OK] Comparacion antes/despues completada");
