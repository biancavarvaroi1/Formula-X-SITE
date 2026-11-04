#!/usr/bin/env python3
"""Install user-supplied BAC 2027 PDFs in static Pages build, with checksum and link integrity checks."""
from pathlib import Path
import base64, hashlib, io, json, re, zipfile

ROOT=Path(__file__).resolve().parents[1]
PARTS=ROOT/'.github'/'bac2027-source'
EXPECTED_SHA256='6798173a3a39b07558986f39996f0f51e10e71f38161e83971bc8a56dd54137c'
chunks=sorted(PARTS.glob('part-*.bin'))
if len(chunks)!=17:
    raise RuntimeError(f'BAC 2027 archive incomplete: {len(chunks)} of 17 parts found')
payload=base64.b64decode(b''.join(p.read_bytes() for p in chunks),validate=True)
actual_sha256=hashlib.sha256(payload).hexdigest()
if actual_sha256!=EXPECTED_SHA256:
    raise RuntimeError('BAC 2027 archive SHA-256 mismatch')
catalog=(ROOT/'modele-2027'/'catalog.js').read_text(encoding='utf-8')
match=re.search(r'window\.FORMULA_X_BAC_2027\s*=\s*(\[.*?\]);', catalog, re.S)
if not match:
    raise RuntimeError('BAC 2027 catalog missing')
models=json.loads(match.group(1))
if len(models)!=35:
    raise RuntimeError(f'Expected 35 models, found {len(models)}')
refs={model[k] for model in models for k in ('subiect','barem')}
if len(refs)!=68:
    raise RuntimeError(f'Expected 68 unique PDF references, got {len(refs)}')
if any(not ref.startswith('pdf/') or '..' in ref for ref in refs):
    raise RuntimeError('Unexpected PDF link in catalog')
with zipfile.ZipFile(io.BytesIO(payload)) as archive:
    source_paths=set(archive.namelist())
    required={'modele-2027/'+ref for ref in refs}
    missing=required-source_paths
    if missing:
        raise RuntimeError('PDF links with missing files: '+', '.join(sorted(missing)))
    for item in sorted(required):
        raw=archive.read(item)
        if not raw.startswith(b'%PDF-'):
            raise RuntimeError('Invalid PDF: '+item)
        dest=ROOT/item
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(raw)
    print(f'BAC 2027 ready: {len(models)} models, {len(required)} local PDFs, SHA256 verified',flush=True)
