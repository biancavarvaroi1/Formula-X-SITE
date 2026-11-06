#!/usr/bin/env python3
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'cursuri/app.js'
s=p.read_text(encoding='utf-8')
old="if(l.slug==='baltagul'||l.slug==='ion'){"
new="if(l.slug==='baltagul'||l.slug==='ion'||l.slug==='ultima-noapte'){"
if new not in s:
    if old not in s: raise SystemExit("Nu s-a gasit ruta cursurilor in versiunea de deploy")
    p.write_text(s.replace(old,new,1),encoding='utf-8')
print('Ruta Ultima noapte este activa in biblioteca de cursuri.')
