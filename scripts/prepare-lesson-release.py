"""Unpack the pinned legacy assets without replacing current application source."""
from pathlib import Path
import hashlib
import io
import zipfile

EXPECTED='ccbaacba2caf347d0ee3502e181f4642d5f6f8355bda2a87e3cc64f28dd34c50'
ALLOWED={
    'index.html','profesori/index.html','assets/formula-x-portal.js',
    'assets/formula-x-lessons.css','assets/formula-x-lessons-core.js',
    'assets/formula-x-lesson-page.js','assets/formula-x-lesson-teacher.js',
    'lectii/romana/index.html','lectii/romana/harap-alb.html','lectii/romana/moara-cu-noroc.html',
    'cursuri/index.html','cursuri/app.js','cursuri/style.css','cursuri/lectie.html','cursuri/INTEGRARE-V48.md',
    'supabase/migrations/20261013_lessons_access.sql','docs/lectii-romana.md',
    'tests/lessons-access.cjs','tests/fixtures/v48-schema.sql',
    'assets/lessons/harap-alb.ab961091e73c78026604f1fe2c1667ec48e3b3ce548ac7a4db548719d96ef637.fxb',
    'assets/lessons/harap-alb/coperta.webp',
    'assets/lessons/moara-cu-noroc.1631e6d6b1db2d22f9a4fdcd29193a52d1fcc7e820fae8d3d387e38f74748f91.fxb',
    'assets/lessons/moara-cu-noroc/coperta.webp',
}

# The two legacy encrypted readers and their encrypted assets still come from
# the pinned package. Current application code always comes from this checkout.
CURRENT=(
 'index.html','profesori/index.html','assets/formula-x-portal.js',
 'assets/formula-x-lessons-core.js','assets/formula-x-lesson-page.js',
 'assets/formula-x-lesson-teacher.js','cursuri/index.html','cursuri/app.js',
 'cursuri/style.css','cursuri/lectie.html','cursuri/INTEGRARE-V48.md',
)

def install(data,root,expected=EXPECTED):
 root=Path(root)
 if len(data)>10*1024*1024 or hashlib.sha256(data).hexdigest()!=expected:
  raise ValueError('Release checksum or size mismatch')
 current={name:(root/name).read_bytes() for name in CURRENT if (root/name).is_file()}
 if any(name not in current for name in CURRENT if name!='cursuri/INTEGRARE-V48.md'):
  raise ValueError('Current application source is incomplete')
 with zipfile.ZipFile(io.BytesIO(data)) as release:
  if set(release.namelist())!=ALLOWED or len(release.namelist())!=len(ALLOWED):
   raise ValueError('Unexpected or duplicate release files')
  release.extractall(root)
 for name,contents in current.items():
  (root/name).write_bytes(contents)
 print('Preserved current homepage, teacher portal, library and lesson application source.')
