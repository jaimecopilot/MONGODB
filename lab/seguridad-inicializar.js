// Ejecutado conectado como administrador SCRAM en mongo-seguridad.
const claveLector = process.env.LAB_READER_PASSWORD;
const claveEscritor = process.env.LAB_WRITER_PASSWORD;
if (!claveLector || !claveEscritor) throw new Error("Faltan claves efimeras");
const d = db.getSiblingDB("curso_seguridad");
d.secretos.drop();
d.secretos.insertOne({ _id: "demo-1", texto: "registro autorizado", clasificacion: "docente" });
for (const u of ["lectorlab", "escritorlab"]) {
  if (d.getUser(u)) d.dropUser(u);
}
d.createUser({ user: "lectorlab", pwd: claveLector, roles: [{role: "read", db: "curso_seguridad"}] });
d.createUser({ user: "escritorlab", pwd: claveEscritor, roles: [{role: "readWrite", db: "curso_seguridad"}] });
print("[OK] Coleccion de prueba y cuentas SCRAM creadas");
