"""Attach pre-enrollment navigation AFTER the verified release is extracted."""
from pathlib import Path
import re, html

button = "<div id=\"fx-bianca-preinscrieri\" style=\"margin:16px 0 20px;padding:16px 18px;border:1px solid #ead0e0;border-radius:16px;background:#fff5fa;color:#60334f;text-align:left\"><strong style=\"display:block;font-size:16px;color:#78305d\">O posibilă nouă grupă de Română · BAC 2027</strong><p style=\"margin:6px 0 12px;font-size:14px;line-height:1.5;color:#604c59\">Vrei să continui pregătirea cu Bianca Varvaroi? Trimite o cerere gratuită din contul tău Formula X, fără obligații de plată.</p><a href=\"/preinscriere-bianca.html\" style=\"display:inline-block;padding:12px 17px;border-radius:10px;background:#a83d83;color:#fff;font-weight:750;text-decoration:none;line-height:1.35\">Mă preînscriu la noua grupă →</a></div>"
home=Path('index.html')
source=home.read_text(encoding='utf-8')
if 'id="fx-bianca-preinscrieri"' not in source:
    heading=re.compile(r'<h([1-6])\b[^>]*>(.*?)</h\1\s*>',re.I|re.S)
    matches=[m for m in heading.finditer(source) if ' '.join(html.unescape(re.sub(r'<[^>]*>','',m.group(2))).split()).casefold()=='bianca varvaroi']
    if not matches:
        # Preserve the existing homepage if the mentor heading markup changes.
        # Place the campaign directly after the known heading, or before the body end.
        closing=re.search(r'</body\s*>',source,re.I)
        if not closing: raise RuntimeError('Homepage has no closing body')
        offset=closing.start()
    else: offset=matches[0].end()
    source=source[:offset]+button+source[offset:]
    home.write_text(source,encoding='utf-8')

# Supplement the static mentor-section link with explicit links on both views.
source=home.read_text(encoding='utf-8')
updated=re.sub(r'(/assets/fx-bianca-home-link\.js)(?:\?v=\d+)?(?=["\'])',r'\g<1>?v=3',source)
if updated!=source:
    source=updated
    home.write_text(source,encoding='utf-8')
if '/assets/fx-bianca-home-link.js' not in source:
    source,n=re.subn(r'</body\s*>',lambda m:'<script defer src="/assets/fx-bianca-home-link.js?v=3"></script>'+m.group(0),source,count=1,flags=re.I)
    if n!=1: raise RuntimeError('Homepage has no closing body')
    home.write_text(source,encoding='utf-8')
assert '/assets/fx-bianca-home-link.js?v=3' in source

portal=Path('profesori/index.html')
source=portal.read_text(encoding='utf-8')
if 'id="fx-bianca-preinscrieri-profesor"' not in source:
    logout=re.search(r'<button\b[^>]*\bid=["\']logoutBtn["\'][^>]*>',source,re.I)
    if not logout: raise RuntimeError('Professor navigation anchor not found')
    link='<a id="fx-bianca-preinscrieri-profesor" href="/profesori/preinscrieri.html" class="btn btn-soft" hidden style="display:none">Preînscrieri Română</a>'
    source=source[:logout.start()]+link+source[logout.start():]
    source=re.sub(r'</body\s*>',lambda m:'<script src="/assets/fx-preinscrieri-nav.js?v=1" defer></script>'+m.group(0),source,count=1,flags=re.I)
    portal.write_text(source,encoding='utf-8')
for path in ('preinscriere-bianca.html','profesori/preinscrieri.html','assets/fx-preinscrieri.js','assets/fx-preinscrieri.css'):
    if not Path(path).is_file(): raise RuntimeError('Missing '+path)
assert '/preinscriere-bianca.html' in home.read_text(encoding='utf-8')
assert '/profesori/preinscrieri.html' in portal.read_text(encoding='utf-8')
print('Formula X: pre-enrollment navigation verified.')
