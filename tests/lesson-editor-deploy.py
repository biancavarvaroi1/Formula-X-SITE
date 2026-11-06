"""Check the deployed output, including pages replaced by the old release."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import re
import tempfile


def verify(root):
    pages = [root / "lectii/romana" / f"{slug}.html" for slug in ("harap-alb", "moara-cu-noroc", "ion", "baltagul")]
    pages += [root / "cursuri/lectie.html", root / "lectii/matematica/progresii.html"]
    editor = hashlib.sha256((root / "assets/fx-editor-all.js").read_bytes()).hexdigest()[:16]
    for path in pages:
        text = path.read_text()
        assert text.count("/assets/fx-editor-all.js") == 1, path
        assert f"/assets/fx-editor-all.js?v={editor}" in text, path
        scripts = re.findall(r'<script\b[^>]*src=["\']([^"\']+)', text)
        renderer = next((i for i, src in enumerate(scripts) if "formula-x-lesson-page" in src), None)
        if renderer is not None:
            assert next(i for i, src in enumerate(scripts) if "fx-editor-all" in src) < renderer, path
        if path.stem in ("ion", "baltagul"):
            assert "fx_open_lesson" in text, f"Protected access must remain in {path}"
    for name in ("formula-x-lessons-core", "formula-x-lesson-teacher"):
        version = hashlib.sha256((root / "assets" / f"{name}.js").read_bytes()).hexdigest()[:16]
        targets = [root / "profesori/index.html"] if name.endswith("teacher") else [root / "cursuri/index.html", root / "profesori/index.html"]
        for path in targets:
            assert f"{name}.js?v={version}" in path.read_text(), path
    print(f"PASS: {len(pages)} deployed lesson routes, editor dependencies, cache versions and private gates.")


def fixture_test(source):
    spec = importlib.util.spec_from_file_location("installer", source / "scripts/install-lesson-editor.py")
    installer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(installer)
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        (root / "assets").mkdir()
        for name in ("fx-editor-all", "formula-x-lessons-core", "formula-x-lesson-teacher"):
            (root / "assets" / f"{name}.js").write_text("/* current source */")
        page = root / "lectii/romana/moara-cu-noroc.html"
        page.parent.mkdir(parents=True)
        page.write_text('<html><head><script defer src="/assets/vendor/supabase.js"></script><script defer src="/assets/formula-x-lessons-core.js?v=old"></script><script defer src="/assets/formula-x-lesson-page.hash.js"></script></head><body data-lesson="moara-cu-noroc"></body></html>')
        installer.install(root)
        once = page.read_text()
        installer.install(root)
        assert page.read_text() == once, "Repeated builds must not duplicate editor scripts"
        assert once.index("/cursuri/config.js") < once.index("fx-editor-all.js") < once.index("formula-x-lesson-page.hash.js")
    print("PASS: release installation order and repeat-build idempotence.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    root = parser.parse_args().root.resolve()
    fixture_test(Path(__file__).resolve().parents[1])
    verify(root)
