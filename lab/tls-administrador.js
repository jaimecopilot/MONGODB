// Primera cuenta creada con excepcion localhost (todavia no existen usuarios).
const p = process.env.ADMIN_PASSWORD;
if (!p) throw new Error("Falta ADMIN_PASSWORD");
db.getSiblingDB("admin").createUser({user:"admincert",pwd:p,roles:["root"]});
print("[OK] Usuario inicial TLS creado via excepcion localhost");
