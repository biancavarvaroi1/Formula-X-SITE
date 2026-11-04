#!/usr/bin/env python3
"""Fetch unmodified BAC 2027 PDFs, verify them, and host on Formula X."""
import io,json,re,zipfile,urllib.request,urllib.parse,html,time
from html.parser import HTMLParser
from pathlib import Path

MIRROR="https://profesorbun.ro/blog/modele-bac-2027-subiecte-bareme-oficiale"
SCHOOL="https://cnprsv.ro/?page_id=152"
OFFICIAL="https://subiecte.edu.ro/2027/bacalaureat/modeledesubiecte/"
class A(HTMLParser):
 def __init__(self):super().__init__();self.hrefs=[]
 def handle_starttag(self,tag,attrs):
  if tag=="a":
   d=dict(attrs)
   if d.get("href"):self.hrefs.append(d["href"])
def get(url,timeout=18):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; FormulaX-archive/1.0)"})
 with urllib.request.urlopen(req,timeout=timeout) as r:return r.read()
def anchors(url):
 try:
  s=get(url).decode("utf8","replace");p=A();p.feed(s)
  urls=[urllib.parse.urljoin(url,html.unescape(x)) for x in p.hrefs]
  print("HTML",url,"links:",len(urls),"PDF:",sum(".pdf" in x.lower() for x in urls),"ZIP:",sum(".zip" in x.lower() for x in urls),flush=True)
  print("Samples:",[x[:170] for x in urls if (".pdf" in x.lower() or ".zip" in x.lower())][:8],flush=True)
  return list(dict.fromkeys(urls))
 except Exception as e:
  print("UNAVAILABLE",url,str(e)[:180],flush=True);return []
js=Path("modele-2027/catalog.js").read_text(encoding="utf8")
m=re.search(r"window\.FORMULA_X_BAC_2027\s*=\s*(\[.*?\]);",js,re.S)
if not m:raise RuntimeError("Cannot read exact local 2027 catalogue")
models=json.loads(m.group(1))
needed={x.rsplit("/",1)[-1].lower():x.rsplit("/",1)[-1] for row in models for x in (row["subiect"],row["barem"])}
assert len(needed)==68, f"Expected 68 distinct PDFs, found {len(needed)}"
urls=anchors(MIRROR)+anchors(SCHOOL)
pdf_links={}
zip_links=[]
for url in urls:
 parsed=urllib.parse.urlparse(url)
 basename=urllib.parse.unquote(parsed.path.rsplit("/",1)[-1]).lower()
 if ".zip" in url.lower() or ".zip" in basename:zip_links.append(url)
 for key in needed:
  if key in urllib.parse.unquote(url).lower():pdf_links[key]=url
print("Linked PDFs:",len(pdf_links),"archive ZIPs:",len(zip_links),flush=True)
docs={}
for key,url in pdf_links.items():
 try:
  raw=get(url,timeout=25)
  if raw.startswith(b"%PDF-"):
   docs[key]=raw;print("PDF OK",key,len(raw),flush=True)
  else:print("Not a PDF",key,len(raw),flush=True)
 except Exception as e:print("PDF FAIL",key,str(e)[:100],flush=True)
# Recover missing PDFs from ZIPs published by a school archive.
for url in zip_links:
 if len(docs)==len(needed):break
 try:
  data=get(url,timeout=25)
  if not zipfile.is_zipfile(io.BytesIO(data)):continue
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   for item in z.infolist():
    key=Path(item.filename).name.lower()
    if key in needed and key not in docs:
     data=z.read(item)
     if data.startswith(b"%PDF-"):
      docs[key]=data
  print("Archive",url.rsplit("/",1)[-1],"matched",len(docs),flush=True)
 except Exception as e:print("ZIP FAIL",url,str(e)[:100],flush=True)
missing=set(needed)-set(docs)
if missing:
 print("MISSING:",sorted(missing),flush=True)
 raise RuntimeError(f"Missing {len(missing)} PDFs: not publishing broken links.")
out=Path("modele-2027/pdf");out.mkdir(exist_ok=True,parents=True)
for key,b in docs.items(): (out/needed[key]).write_bytes(b)
print("READY: all 68 PDFs verified and written to Formula X",flush=True)
