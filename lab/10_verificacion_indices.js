const c=db.getSiblingDB("curso_indices").ventas;
for(const nombre of ["ix_numero","ix_cliente","ix_estado_fecha","ix_etiquetas","ix_descripcion_texto","ix_grupo_hash"]){if(!c.getIndexes().some(x=>x.name===nombre))throw new Error("Falta "+nombre)}
print("[OK] Inventario de indices docentes");
