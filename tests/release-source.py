"""Regression: the pinned archive cannot restore the old redirects or editors."""
from pathlib import Path
import importlib.util
import io
import zipfile
import tempfile
import hashlib

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release',root/'scripts/prepare-lesson-release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
with tempfile.TemporaryDirectory() as directory:
 target=Path(directory)
 for name in release.CURRENT:
  p=target/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('CURRENT: '+name)
 data=io.BytesIO()
 with zipfile.ZipFile(data,'w') as archive:
  for name in release.ALLOWED:archive.writestr(name,'OLD: '+name)
 data=data.getvalue()
 release.install(data,target,hashlib.sha256(data).hexdigest())
 for name in release.CURRENT:assert (target/name).read_text()=='CURRENT: '+name,name
 assert (target/'lectii/romana/moara-cu-noroc.html').read_text().startswith('OLD:')
 try: release.install(data+b'changed',target)
 except ValueError:pass
 else:raise AssertionError('Invalid checksum accepted')
print('PASS: archive preserves all current application files; encrypted legacy reader retained; checksum enforced.')
