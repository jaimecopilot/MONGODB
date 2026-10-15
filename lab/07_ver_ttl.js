const t=db.getSiblingDB("curso_indices").sesiones_demo;
let borrado=false;for(let i=0;i<50;i++){if(t.countDocuments({_id:"expirado"})===0){borrado=true;break;}sleep(1000)}
if(!borrado)throw new Error("TTL no completo dentro del tiempo maximo de la prueba");
if(t.countDocuments({_id:"vigente"})!==1)throw new Error("TTL elimino documento no caducado");
print("[OK] TTL: el expirado se elimino y el vigente se conserva");
