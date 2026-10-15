#!/usr/bin/env python3
"""Comprobaciones estructurales que no sustituyen revision pedagogica."""
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
BOOKS={
 "INDEXACION/TEORIA/INDICES_TEORIA.md":(8500,10),
 "INDEXACION/PRACTICAS/INDICES_PRACTICAS.md":(14000,18),
 "SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.md":(8000,10),
 "SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.md":(12000,18),
}
problems=[]
for name,(min_words,min_lessons) in BOOKS.items():
    file=ROOT/name
    if not file.is_file():
        problems.append("Falta "+name)
        continue
    data=file.read_text(encoding="utf-8")
    words=len(data.split())
    lessons=len(re.findall(r"(?m)^# (?:Unidad|Laboratorio) \d+",data))
    fences=data.count(chr(96)*3)
    if fences%2:problems.append(f"{name}: {fences} delimitadores de codigo impares")
    if words<min_words:problems.append(f"{name}: {words} palabras, minimo {min_words}")
    if lessons<min_lessons:problems.append(f"{name}: {lessons} unidades, minimo {min_lessons}")
    referenced=set(re.findall(r"(?:/lab/|lab/)([a-zA-Z0-9_-]+\.js)",data))
    missing=sorted(x for x in referenced if not (ROOT/"lab"/x).exists())
    if missing:problems.append(f"{name}: scripts ausentes: {missing}")
    for marker in ("Nivel de evidencia:", "fuente canónica:", "INFORME_AUDITORIA_Y_TRAZABILIDAD"):
        if marker.lower() in data.lower():
            problems.append(f"{name}: texto editorial interno: {marker}")
    print(f"[INFO] {name}: {words} palabras, {lessons} temas, {fences//2} bloques, {len(referenced)} scripts")
if problems:
    for problem in problems:print("[ERROR] "+problem,file=sys.stderr)
    sys.exit(1)
print("[OK] Estructura de los cuatro manuales comprobada")
