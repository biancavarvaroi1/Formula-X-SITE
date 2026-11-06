"""Attach the current editor after the verified legacy release is unpacked."""
from pathlib import Path
import argparse
import hashlib
import re


def install(root: Path):
    versions = {}
    for name in ("fx-editor-all", "formula-x-lessons-core", "formula-x-lesson-teacher"):
        source = root / "assets" / f"{name}.js"
        versions[name] = hashlib.sha256(source.read_bytes()).hexdigest()[:16]

    def script(name):
        return f'<script defer src="/assets/{name}.js?v={versions[name]}"></script>'

    lessons = set((root / "lectii").glob("*/*.html"))
    lessons.update((root / "assets/lectii").glob("*/*.html"))
    generic = root / "cursuri/lectie.html"
    if generic.exists():
        lessons.add(generic)
    pages = lessons | {root / "index.html"}
    pages.update((root / "cursuri").glob("*.html"))
    pages.update((root / "profesori").glob("*.html"))
    changed = 0
    for path in sorted(pages):
        if not path.exists():
            continue
        text = before = path.read_text(encoding="utf-8")
        if path in lessons and not re.search(r'src=["\'][^"\']*fx-editor-all\.js', text):
            dependencies = ""
            if "supabase.js" not in text and "supabase-js" not in text:
                dependencies += '<script defer src="/assets/vendor/supabase.js"></script>'
            if "/cursuri/config.js" not in text and not re.search(r'src=["\']config\.js', text):
                dependencies += '<script defer src="/cursuri/config.js"></script>'
            dependencies += script("fx-editor-all")
            renderer = re.search(r'<script\b[^>]*src=["\'][^"\']*formula-x-lesson-page[^"\']*["\'][^>]*>\s*</script>', text)
            if renderer:
                text = text[:renderer.start()] + dependencies + text[renderer.start():]
            elif "</head>" in text:
                text = text.replace("</head>", dependencies + "</head>", 1)
            else:
                raise ValueError(f"Missing head in lesson: {path.relative_to(root)}")
        for name, version in versions.items():
            text = re.sub(
                rf'((?:src=["\'])[^"\']*/{re.escape(name)}\.js)(?:\?[^"\']*)?(["\'])',
                lambda match: f'{match[1]}?v={version}{match[2]}', text,
            )
        if path in lessons:
            # Uploaded lesson images use this same project's Storage endpoint.
            text = text.replace("img-src 'self' blob:;", "img-src 'self' blob: https://vooflhvdoutjplfbnahl.supabase.co;")
        if text != before:
            path.write_text(text, encoding="utf-8")
            changed += 1
    print(f"Teacher editor installed on {len(lessons)} lesson pages; {changed} HTML files updated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    install(parser.parse_args().root.resolve())
