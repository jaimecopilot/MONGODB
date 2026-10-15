const d=db.getSiblingDB("curso_seguridad");
if(!d.getUser("lectorlab"))throw new Error("Falta lectorlab");
if(!d.secretos.findOne({_id:"demo-1"}))throw new Error("Falta documento preparado");
print("[OK] Cuenta y datos de seguridad preparados");
