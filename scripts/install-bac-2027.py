#!/usr/bin/env python3
"""Install verified 2027 PDF models from Ministry's public ZIP archives."""
import io, re, os, sys, time, zipfile, urllib.request, urllib.parse, html, json
from pathlib import Path
from html.parser import HTMLParser
BASE = "https://subiecte.edu.ro/2027/bacalaureat/modeledesubiecte/"
NAMES = [
"Bac_2027_E_a_Limba_si_literatura_romana_modele",
"Bac_2027_E_a_Limba_si_literatura_romana__pt_minoritatea_maghiara_modele",
"Bac_2027_E_b_Limbi_materne_modele",
"Bac_2027_E_c_Istorie_model",
"Bac_2027_E_c_Matematica_modele",
"Bac_2027_E_d_Anatomie_Biologie_modele",
"Bac_2027_E_d_Chimie_modele",
"Bac_2027_E_d_Fizica_modele",
"Bac_2027_E_d_Geografie_model",
"Bac_2027_E_d_Informatica_modele",
"Bac_2027_E_d_Socio_umane_modele",
]
def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 FormulaX/2027"})
    with urllib.request.urlopen(req,timeout=35) as r: return r.read()
class Links(HTMLParser):
    def __init__(self): super().__init__();self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            d=dict(attrs)
            if d.get("href"):self.hrefs.append(d["href"])
def links(url):
    try:
        body=get(url).decode("utf-8","replace")
        h=Links();h.feed(body)
        matches=h.hrefs+re.findall(r'["\']([^"\']+\\.zip(?:\\?[^"\']*)?)["\']',body,re.I)
        return list(dict.fromkeys(urllib.parse.urljoin(url,html.unescape(x)) for x in matches))
    except Exception as e:print("SOURCE UNAVAILABLE",url,e,flush=True);return []
sources=[BASE, "https://subiecte.edu.ro/2027/bacalaureat/modeledesubiecte/index.html",
         "https://cnprsv.ro/?page_id=152"]
found=[]
for src in sources:found.extend(links(src))
found=list(dict.fromkeys(found))
print("Archive links discovered:",len(found),flush=True)
out=Path("modele-2027/pdf")
docs={}
for name in NAMES:
    simple=name.lower().replace("_","")
    matches=[u for u in found if simple in urllib.parse.unquote(u).lower().replace("_","")]
    candidates=matches+[urllib.parse.urljoin(BASE,name+".zip"),urllib.parse.urljoin(BASE,name+"/"),urllib.parse.urljoin(BASE,name+".ZIP")]
    data=None
    for url in dict.fromkeys(candidates):
        try:
            b=get(url)
            if zipfile.is_zipfile(io.BytesIO(b)):
                data=b;break
        except Exception as e:print("skip",url,type(e).__name__,flush=True)
    if data is None:raise RuntimeError("Missing official ZIP: "+name)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        pdfs=[i for i in z.infolist() if i.filename.lower().endswith(".pdf") and not i.is_dir()]
        if not pdfs:raise RuntimeError("No PDF in "+name)
        for i in pdfs:
            raw=z.read(i)
            if not raw.startswith(b"%PDF-"):raise RuntimeError("Invalid PDF "+i.filename)
            fn=Path(i.filename).name
            if fn in docs and docs[fn]!=raw:raise RuntimeError("Conflicting PDF "+fn)
            docs[fn]=raw
    print("Verified",name,len(pdfs),flush=True)
if len(docs)<60:raise RuntimeError("Too few PDFs; refusing partial release: "+str(len(docs)))
out.mkdir(parents=True,exist_ok=True)
for fn,b in docs.items(): (out/fn).write_bytes(b)
print("Verified and installed",len(docs),"PDFs",flush=True)
# Keep the user's prepared catalog and page layout; publish matching PDF paths only.
expected_file=Path("modele-2027/catalog.js")
catalog=expected_file.read_text()
if "didactika.ro" in catalog or "subiecte.edu.ro" in catalog:
    raise RuntimeError("New local PDF catalog is not installed; refusing public links")
for filename in re.findall(r'pdf/([^"\']+\\.pdf)',catalog):
    if filename not in docs:raise RuntimeError("Catalog PDF absent: "+filename)
