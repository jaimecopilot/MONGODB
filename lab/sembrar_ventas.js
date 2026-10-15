// Carga de datos docentes SIN índices secundarios: punto de partida para la clase.
// Modifica y elimina exclusivamente datos de la base docente curso_indices.
const n = Number(process.env.VENTAS || 200000);
if (!Number.isInteger(n) || n < 1000 || n > 1000000) throw new Error("VENTAS debe ser entero entre 1000 y 1000000");
const test = db.getSiblingDB("curso_indices");
const sales = test.ventas;
sales.drop(); // Solo curso_indices.ventas en el servidor docente.
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
      _id:i+1, idVenta:i+1, tienda:shops[i%4], categoria:categories[Math.floor(i/4)%4],
      clienteId:i%10000, clienteHash:i,
      fecha:new Date(Date.UTC(2025,0,1+(i%365))), importe:(i%10000)/10 + 0.95,
      tags: i%2===0 ? ["online","promocion"] : ["tienda","entrega"],
      descripcion: i%97===0 ? "reclamacion urgente del cliente" : "compra habitual",
      productos:[{sku:"SKU"+(i%100),cantidad:(i%3)+1}]
    });
  }
  sales.insertMany(documents,{ordered:false});
  if ((start + itemsPerBatch) % 100000 === 0 || end === n) print("[INFO] Insertadas: " + end);
}
check(sales.estimatedDocumentCount()===n, "Se han cargado las ventas solicitadas");

check(sales.getIndexes().length===1,"Coleccion empieza solo con indice _id");
print("[OK] CARGA DIDACTICA SIN INDICES SECUNDARIOS COMPLETADA");
