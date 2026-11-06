#!/usr/bin/env python3
# Repara afisarea lectiei "Ultima noapte" in site-ul Formula X.
from pathlib import Path

root = Path(__file__).resolve().parent
core = root / "assets/formula-x-lessons-core.js"
page = root / "assets/formula-x-lesson-page.js"
app = root / "cursuri/app.js"
workflow = root / ".github/workflows/static.yml"
required = [core, page, app, workflow, root/"index.html", root/"lectii/romana/ultima-noapte.html"]
missing = [str(p.relative_to(root)) for p in required if not p.is_file()]
if missing:
    raise SystemExit("EROARE: lipsesc fisiere din Formula-X-SITE: " + ", ".join(missing) +
                     "\nCopiaza mai intai INTREG continutul folderului PUNE-IN-FORMULA-X-SITE in radacina proiectului.")

def edit(path, old, new):
    original = path.read_text(encoding="utf-8")
    if new in original:
        return None
    if old not in original:
        raise SystemExit("EROARE: structura din " + str(path.relative_to(root)) +
                         " nu corespunde. N-am modificat nimic.")
    return original.replace(old, new, 1)

changes = {}
entry = ("    {slug:'ultima-noapte',title:'Ultima noapte de dragoste, întâia noapte de război',"
         "author:'Camil Petrescu',cover:'/assets/lessons/ultima-noapte/coperta.webp',"
         "character:'Ștefan Gheorghidiu'},")
anchor = "    {slug:'moara-cu-noroc',title:'Moara cu noroc',author:'Ioan Slavici',cover:'/assets/lessons/moara-cu-noroc/coperta.webp',character:'Ghiță'},"
s = core.read_text(encoding="utf-8")
if entry not in s:
    if anchor not in s: raise SystemExit("Nu am gasit lista de lectii din assets/formula-x-lessons-core.js")
    s = s.replace(anchor, anchor+"\n"+entry,1)
old = "if(slug==='ion'||slug==='baltagul')return `/lectii/romana/${slug}.html`;"
new = "if(slug==='ion'||slug==='baltagul'||slug==='ultima-noapte')return `/lectii/romana/${slug}.html`;"
if new not in s:
    if old not in s: raise SystemExit("Nu am gasit legaturile catre paginile dedicate. Nicio modificare.")
    s = s.replace(old,new,1)
changes[core] = s

# Daca ramane in cache un link spre rendererul generic, redirectionam doar
# continutul structurat al acestei lectii, dupa verificarea accesului.
old = "      if(result.format==='text'){\n"
redirect = """      if(result.format==='text'){
        // FIX-ULTIMA-NOAPTE: JSON-ul acestei lectii are un renderer dedicat.
        if(slug==='ultima-noapte' && typeof result.body==='string'){
          try{
            const structured=JSON.parse(result.body);
            if(structured && structured.fx_format==='formula-x-ultima-noapte-v1'){
              const suffix=new URLSearchParams(location.search).get('editor')==='1'?'?editor=1':'';
              location.replace('/lectii/romana/ultima-noapte.html'+suffix);
              return;
            }
          }catch(_err){} // Continutul normal text ramane text.
        }
"""
s = page.read_text(encoding="utf-8")
if "FIX-ULTIMA-NOAPTE" not in s:
    if old not in s: raise SystemExit("Nu pot integra rendererul generic: fisier diferit. Nicio modificare.")
    s = s.replace(old,redirect,1)
changes[page] = s

route_old = "if(l.slug==='baltagul'||l.slug==='ion'){"
route_new = "if(l.slug==='baltagul'||l.slug==='ion'||l.slug==='ultima-noapte'){"
s = app.read_text(encoding="utf-8")
if route_new not in s:
    if route_old not in s: raise SystemExit("Nu pot integra cursuri/app.js: structura diferita.")
    s = s.replace(route_old,route_new,1)
changes[app] = s

# Deploy-ul actual extrage un pachet care inlocuieste cursuri/app.js.
# Pasul de mai jos restabileste ruta la fiecare publicare.
wf = workflow.read_text(encoding="utf-8")
step = ("      - name: Fix Ultima noapte in course-library routes\n"
        "        run: python scripts/fix-ultima-noapte-routes.py\n")
if step not in wf:
    anchor_wf = ("      - name: Install the current teacher editor on every lesson page\n"
                 "        run: python scripts/install-lesson-editor.py\n")
    if anchor_wf not in wf:
        raise SystemExit("Nu am gasit pasul de instalare din GitHub Actions. Nicio modificare.")
    wf = wf.replace(anchor_wf,anchor_wf+step,1)
changes[workflow] = wf

# Doar dupa toate validarile salvam fisierele.
for target,content in changes.items():
    if target.read_text(encoding="utf-8") != content:
        target.write_text(content, encoding="utf-8")
        print("ACTUALIZAT:", target.relative_to(root))
    else:
        print("DEJA BINE:", target.relative_to(root))
print("\nGATA! In GitHub Desktop apasa Commit to main si Push origin.")
print("Nu mai este nevoie sa rulezi SQL-ul: lectia exista deja in Supabase.")
