#!/usr/bin/env python3
"""Renderiza manuales Markdown a PDF A4 reproducibles, con validación de páginas."""
from pathlib import Path
import html
import re
import sys
import mistune
from weasyprint import HTML
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
SPECS=(
    ("INDEXACION","TEORIA","INDICES_TEORIA",40),
    ("INDEXACION","PRACTICAS","INDICES_PRACTICAS",66),
    ("SEGURIDAD","TEORIA","SEGURIDAD_TEORIA",33),
    ("SEGURIDAD","PRACTICAS","SEGURIDAD_PRACTICAS",56),
)
md=mistune.create_markdown(plugins=["table","strikethrough"])
CSS=r"""
@page { size: A4; margin: 15mm 15mm 13mm 15mm;
  @bottom-right { content: counter(page); font-size: 8pt; color: #60748c; } }
body { font-family: 'DejaVu Sans', sans-serif; color:#1a2a3a; font-size:9.25pt;
       line-height:1.39; margin:0; }
h1,h2,h3,h4 { color:#123b5e; break-after:avoid; line-height:1.18; }
h1 {font-size:22pt; margin:0 0 9pt;} h2 {font-size:17.2pt; margin:0 0 9pt;}
h3 {font-size:10.9pt; margin:10pt 0 4pt;} h4 {font-size:10pt; margin:8pt 0 3pt;}
p { margin: 5pt 0 7pt; }
ul,ol { padding-left:19pt; margin:5pt 0 8pt; }
li { margin:2pt 0; }
pre { background:#f1f5f9; border-left:3px solid #3876a8; padding:8pt;
      border-radius:3px; white-space: pre-wrap; overflow-wrap:anywhere; font-size:7.6pt;
      line-height:1.25; margin:8pt 0; break-inside:avoid; }
code {font-family: 'DejaVu Sans Mono', monospace; font-size:.90em; }
blockquote { margin:9pt 0; background:#eaf3fa; border-left:3px solid #2c75aa;
 padding:4pt 9pt; color:#294660; }
table { border-collapse:collapse; width:100%; font-size:8pt; margin:8pt 0; }
th,td { padding:4pt 5pt; border:1px solid #cfdae5; text-align:left; }
th { background:#eaf0f6; }
a {color:#1c689a; text-decoration:none; overflow-wrap:anywhere;}
.ficha {page-break-after:always; break-after:page; }
.ficha:last-child {page-break-after:auto; break-after:auto;}
.masthead {text-transform:uppercase; font-size:7.5pt; color:#55738f;
letter-spacing:.07em; border-bottom:1px solid #cfdbe6; margin-bottom:10pt; padding-bottom:5pt;}
"""

def build(label,out):
    original=label.read_text(encoding="utf-8")
    slices=re.split(r"(?m)^\s*---\s*$",original)
    parts=[p for p in slices if "<!-- Hoja didáctica" in p]
    if not parts: raise RuntimeError(f"{label}: faltan fichas didácticas")
    sections=[]
    for i,part in enumerate(parts,1):
        part=re.sub(r"<!-- Hoja didáctica[^>]*-->","",part)
        markup=md(part)
        sections.append(f'<section class="ficha"><div class="masthead">MongoDB 8.0 · {html.escape(label.stem)} · Ficha {i:02d}/{len(parts):02d}</div>{markup}</section>')
    page_html=f'<!doctype html><html lang="es"><meta charset="utf-8"><style>{CSS}</style><body>{"".join(sections)}</body></html>'
    out.parent.mkdir(parents=True,exist_ok=True)
    HTML(string=page_html,base_url=str(label.parent)).write_pdf(str(out))
    return len(parts),len(PdfReader(out).pages)

def main():
    dest=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT
    for folder,kind,name,expected in SPECS:
        src=ROOT/folder/kind/(name+".md")
        out=dest/folder/kind/(name+".pdf")
        units,pages=build(src,out)
        print(f"{name}: {units} fichas, {pages} páginas; objetivo {expected}")
        if units!=expected or pages!=expected:
            raise SystemExit(f"ERROR de paginación de {name}")
    for name in ("GUIA_DEL_FORMADOR",):
        src=ROOT/"DOCENCIA"/(name+".md")
        out=dest/"DOCENCIA"/(name+".pdf")
        out.parent.mkdir(parents=True,exist_ok=True)
        body=md(src.read_text(encoding="utf-8"))
        page_html=f'<!doctype html><html lang="es"><meta charset="utf-8"><style>{CSS}</style><body>{body}</body></html>'
        HTML(string=page_html,base_url=str(src.parent)).write_pdf(str(out))
        print(f"{name}: {len(PdfReader(out).pages)} páginas")

if __name__=="__main__": main()
