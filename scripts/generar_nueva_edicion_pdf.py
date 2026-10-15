#!/usr/bin/env python3
"""Crea PDF docentes a partir de Markdown escrito desde cero. No rellena páginas."""
from pathlib import Path
import html
import re
import sys

import mistune
from pypdf import PdfReader
from weasyprint import HTML

REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO / "NUEVA_EDICION"
BOOKS = (
    ("INDEXACION_TEORIA", "Teoría de indexación"),
    ("INDEXACION_PRACTICAS", "Prácticas de indexación"),
    ("SEGURIDAD_TEORIA", "Teoría de seguridad"),
    ("SEGURIDAD_PRACTICAS", "Prácticas de seguridad"),
    ("GUIA_DEL_FORMADOR", "Guía del formador"),
)
MARKDOWN = mistune.create_markdown(plugins=["table", "strikethrough"])

CSS = r"""
@page {
  size: A4;
  margin: 18mm 17mm 17mm;
  @bottom-left { content: "MongoDB 8.0 · Material de formación"; color: #61758b; font: 8pt "DejaVu Sans"; }
  @bottom-right { content: counter(page); color: #61758b; font: 8pt "DejaVu Sans"; }
}
html { font-family: "DejaVu Sans", sans-serif; }
body {
  font-size: 10.2pt; line-height: 1.49; color: #24374b; margin: 0;
  overflow-wrap: break-word;
}
h1, h2, h3 {color: #153d5f; line-height: 1.22; break-after: avoid;}
h1 { font-size: 21pt; margin: 5mm 0 5mm; }
h2 { font-size: 15pt; margin: 10mm 0 4mm; break-before: page; }
h3 { font-size: 11.5pt; margin: 7mm 0 2mm; }
h4 {color: #335e7c; font-size:10.4pt; break-after:avoid;}
p { margin: 0 0 4.2mm; }
ul,ol {margin: 0 0 4mm; padding-left: 6mm;}
li {margin: 1.8mm 0;}
strong {color: #1c405e;}
code {font-family: "DejaVu Sans Mono", monospace; font-size: 0.88em; color: #12436d;}
pre {
  background: #f0f5f9;
  border-left: 2.5pt solid #3b7b9f;
  padding: 3mm;
  font-size: 8.0pt;
  line-height: 1.32;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  margin: 3mm 0 5mm;
  break-inside: avoid;
}
pre code {font-size: 1em; color: #1a2f42;}
blockquote {
  background: #eef5fa;
  border-left: 2.5pt solid #699cbf;
  padding: 3mm 4mm;
  margin: 3mm 0 5mm;
}
blockquote p:last-child { margin-bottom: 0; }
table {
 border-collapse:collapse; width:100%; font-size: 8.6pt;
 margin: 4mm 0 5mm;
}
th,td {border:0.6pt solid #bdcad7; padding: 2.3mm; vertical-align:top;}
th {background:#e8eff4;}
tr { break-inside: avoid; }
a {color:#245a8d; text-decoration:none;}
hr {border:none; border-top:0.6pt solid #a7c1d4; margin:6mm 0;}
"""

def render(source, destination, title):
    raw=source.read_text(encoding="utf-8")
    if "Hoja didáctica" in raw or "Edición contrastada" in raw:
        raise ValueError(f"Contenido anterior encontrado en {source}")
    chapter_count=len(re.findall(r"(?m)^##\s+", raw))
    if chapter_count < 7 and "FORMADOR" not in source.name:
        raise ValueError(f"Manual incompleto ({chapter_count} capítulos): {source}")
    body=MARKDOWN(raw)
    layout=f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{html.escape(title)}</title><style>{CSS}</style></head><body>{body}</body></html>'
    HTML(string=layout, base_url=str(source.parent)).write_pdf(str(destination))
    pages=len(PdfReader(destination).pages)
    if pages < (4 if "FORMADOR" in source.name else 12):
        raise ValueError(f"PDF sospechosamente corto: {source} tiene {pages} páginas")
    print(f"{source.name}: {chapter_count} secciones, {len(raw.split())} palabras, {pages} páginas")
    return pages

def main():
    for stem, title in BOOKS:
        render(SOURCE / f"{stem}.md", SOURCE / f"{stem}.pdf", title)

if __name__ == "__main__":
    main()
