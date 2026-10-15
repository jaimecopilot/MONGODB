const c=db.getSiblingDB("curso_indices").ventas;
for(const x of c.getIndexes()){if(x.hidden)c.unhideIndex(x.name)}
print("[OK] Indices ocultos restaurados");
