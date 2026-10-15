#!/usr/bin/env python3
"""Genera PDF de lectura fiel a los Markdown docentes, sin páginas ficticias."""
from pathlib import Path
import re
import sys
import mistune
from pypdf import PdfReader
from weasyprint import HTML

ROOT = Path(__file__).resolve().parents[1]
MANUALS = [
    Path("INDEXACION/TEORIA/INDICES_TEORIA.md"),
    Path("INDEXACION/PRACTICAS/INDICES_PRACTICAS.md"),
    Path("SEGURIDAD/TEORIA/SEGURIDAD_TEORIA.md"),
    Path("SEGURIDAD/PRACTICAS/SEGURIDAD_PRACTICAS.md"),
    Path("DOCENCIA/GUIA_DEL_FORMADOR.md"),
]
CSS = r"""
@page {
 size: A4; margin: 19mm 18mm 18mm 18mm;
 @bottom-left {content:"MongoDB 8.0 · Formación";font-size:8pt;color:#65778a;}
 @bottom-right {content:counter(page);font-size:9pt;color:#526578;}
}
body {font-family:"DejaVu Sans",sans-serif;color:#203044;font-size:9.6pt;line-height:1.52;}
h1,h2,h3,h4 {color:#153a57;line-height:1.22;break-after:avoid;}
h1 {font-size:20pt;margin:14pt 0 14pt;}
h1:not(:first-child) {break-before:page;}
h2 {font-size:14.5pt;margin:18pt 0 9pt;border-bottom:1px solid #c5d6e4;padding-bottom:5pt;}
h3 {font-size:11.4pt;margin:15pt 0 6pt;}
h4 {font-size:10pt;margin:12pt 0 4pt;}
p {margin:4pt 0 8pt;orphans:3;widows:3;}
strong {color:#152e47;}
ol,ul {padding-left:22pt;margin:5pt 0 9pt;}
li {padding-left:2pt;margin:3pt 0;}
li p {margin:2pt 0;}
pre {background:#edf4f9;border-left:3px solid #3275a5;padding:9pt;
  font-size:8.0pt;line-height:1.34;white-space:pre-wrap;overflow-wrap:anywhere;
  break-inside:avoid; margin:9pt 0 11pt; border-radius:3px;}
code {font-family:"DejaVu Sans Mono",monospace;font-size:0.9em;overflow-wrap:anywhere;}
pre code {font-size:inherit;}
blockquote {background:#f0f5fa;border-left:3px solid #3575a4;padding:8pt 11pt;
  color:#274760;margin:11pt 0;break-inside:avoid;}
blockquote p {margin:1pt 0;}
table {border-collapse:collapse;width:100%;font-size:8.4pt;margin:10pt 0;}
thead {display:table-header-group;}
tr {break-inside:avoid;}
th,td {border:1px solid #d0dae4;padding:6pt 7pt;text-align:left;vertical-align:top;overflow-wrap:anywhere;}
th {background:#e8f0f7;color:#173d5b;font-weight:bold;}
a {color:#17608b;text-decoration:none;overflow-wrap:anywhere;}
hr {border:0;border-top:1px solid #b4c4d2;margin:19pt 0;}
"""

def build(src, target):
    raw = src.read_text(encoding="utf-8")
    if len(raw.strip().split()) < 1100 and "GUIA_" not in src.name:
        raise RuntimeError("Manual incompleto: "+str(src))
    engine = mistune.create_markdown(plugins=["table","strikethrough","url"])
    html_body = engine(raw)
    title = re.search(r"^# (.+)$", raw, flags=re.M)
    title = title.group(1) if title else src.stem
    document = (
        "<!doctype html><html lang='es'><head><meta charset='utf-8'>"
        "<title>"+title+"</title><style>"+CSS+"</style></head><body>"
        +html_body+"</body></html>"
    )
    target.parent.mkdir(parents=True,exist_ok=True)
    HTML(string=document,base_url=str(src.parent)).write_pdf(str(target))
    pdf=PdfReader(str(target))
    n=len(pdf.pages)
    if n < 2:
        raise RuntimeError("Solo "+str(n)+" paginas en "+str(target))
    if any(float(page.mediabox.width)<580 or float(page.mediabox.width)>620 for page in pdf.pages):
        raise RuntimeError("Formato no A4 en "+str(target))
    text="".join((page.extract_text() or "") for page in pdf.pages)
    if len(text)<len(re.sub(r"(?s)"+chr(96)+chr(96)+chr(96)+r".*?"+chr(96)+chr(96)+chr(96),"",raw))*0.42:
        raise RuntimeError("Posible perdida sustancial de texto en PDF "+str(target))
    print(f"[OK] {target} - {n} paginas - {len(raw.split())} palabras",flush=True)
    return n

def main():
    dest=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT
    for path in MANUALS:
        src=ROOT/path
        if not src.exists():
            if src.name=="GUIA_DEL_FORMADOR.md":
                print("[INFO] Guia no disponible; no generar archivo",flush=True)
                continue
            raise RuntimeError(f"No existe {path}")
        build(src,dest/path.with_suffix(".pdf"))

if __name__=="__main__":
    main()
