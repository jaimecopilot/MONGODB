// Laboratorio 2 para principiantes: elige indices ESR y ERS para la MISMA consulta.
// Se ejecuta despues de 01_cargar_ventas.js y 03_crear_indices.js.
// Crea solamente ix_ers_practica; no modifica ni borra documentos.
const ventas=db.getSiblingDB("curso_indices").ventas;
function comprobar(condicion,mensaje){
 if(!condicion)throw new Error("[ERROR] "+mensaje);
 print("[OK] "+mensaje);
}
function mostrar(nombre,estadisticas,resultados){
 const e=estadisticas.executionStats;
 const plan=JSON.stringify(estadisticas.queryPlanner.winningPlan);
 print("\n=== "+nombre+" ===");
 printjson({
   documentosEntregados:e.nReturned,
   documentosExaminados:e.totalDocsExamined,
   clavesExaminadas:e.totalKeysExamined,
   tiempoOrientativoMs:e.executionTimeMillis,
   usaIndice:plan.includes("IXSCAN"),
   requiereSORT:plan.includes('"SORT"'),
   numerosMuestra:resultados.map(v=>v.numero),
   fechasMuestra:resultados.map(v=>v.fecha.toISOString().slice(0,10))
 });
 return plan;
}
const cantidad=ventas.estimatedDocumentCount();
comprobar(cantidad>=1000,"La colección contiene ventas: "+cantidad);
comprobar(ventas.getIndexes().some(x=>x.name==="ix_esr"),
 "Existe ix_esr: primero estado, luego fecha, despues importe");
const filtro={estado:"pagada",importe:{$gt:500}};
const orden={fecha:-1};
const limite=10;
const totalCoincidencias=ventas.countDocuments(filtro);
comprobar(totalCoincidencias>=limite,
 "Hay suficientes ventas pagadas mayores de 500: "+totalCoincidencias);
ventas.createIndex({estado:1,importe:1,fecha:-1},{name:"ix_ers_practica"});
comprobar(ventas.getIndexes().some(x=>x.name==="ix_ers_practica"),
 "Creado ix_ers_practica: estado, importe, fecha");
function estudiar(nombreIndice){
 // hint se usa SOLO para comparar dos opciones de forma controlada.
 const cursor=()=>ventas.find(filtro).sort(orden).limit(limite).hint(nombreIndice);
 const datos=cursor().toArray();
 comprobar(datos.length===limite,"El indice "+nombreIndice+" devuelve 10 documentos");
 for(let i=0;i<datos.length;i++){
   comprobar(datos[i].estado==="pagada"&&datos[i].importe>500,
     nombreIndice+": documento "+(i+1)+" cumple ambos filtros");
   if(i>0)comprobar(datos[i-1].fecha.getTime()>=datos[i].fecha.getTime(),
     nombreIndice+": fechas "+i+"/"+(i+1)+" en orden descendente");
 }
 const e=cursor().explain("executionStats");
 const plan=mostrar(nombreIndice,e,datos);
 comprobar(e.executionStats.nReturned===limite,
   nombreIndice+": explain confirma 10 documentos");
 comprobar(plan.includes("IXSCAN"),nombreIndice+": se recorre un indice");
 return {datos,e,plan};
}
const esr=estudiar("ix_esr");
const ers=estudiar("ix_ers_practica");
comprobar(!esr.plan.includes('"SORT"'),
 "Con igualdad de estado, ix_esr entrega fechas en orden sin etapa SORT independiente");
print("\n[REFLEXION] ESR prioriza el orden cronologico; ERS prioriza el rango de importe.");
print("[REFLEXION] Si fechas iguales empatan, los IDs concretos pueden diferir sin violar la consulta.");
print("[REFLEXION] Compara claves/documentos examinados y si hay SORT. Los ms no son universales.");
print("[OK] LABORATORIO DE INDICES COMPUESTOS COMPLETADO");
