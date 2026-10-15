const d=db.getSiblingDB("curso_indices"), c=d.ventas;
c.createIndex({numero:1},{name:"ix_numero",unique:true});
c.createIndex({clienteId:1},{name:"ix_cliente"});
c.createIndex({estado:1,fecha:-1},{name:"ix_estado_fecha"});
c.createIndex({estado:1,fecha:-1,importe:1},{name:"ix_esr"});
c.createIndex({etiquetas:1},{name:"ix_etiquetas"});
c.createIndex({descripcion:"text"},{name:"ix_descripcion_texto",default_language:"spanish"});
c.createIndex({idGrupo:"hashed"},{name:"ix_grupo_hash"});
print("[OK] Indices de aula: "+JSON.stringify(c.getIndexes().map(x=>x.name)));
