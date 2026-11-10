"""Attach phone-install metadata after all legacy/deployment HTML generation."""
from pathlib import Path
import argparse
import hashlib
import re

START = '<!-- Formula X phone installation -->'
END = '<!-- /Formula X phone installation -->'
BLOCK = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\s*', re.S)
SKIP = {'.git', '.github', '.openai', 'node_modules', 'tests', 'scripts', 'supabase', 'docs', 'dist'}


def install(root: Path):
    versions = {
        suffix: hashlib.sha256((root / 'assets' / f'formula-x-install.{suffix}').read_bytes()).hexdigest()[:16]
        for suffix in ('js', 'css')
    }
    changed = 0
    for page in sorted(root.rglob('*.html')):
        if any(part in SKIP for part in page.relative_to(root).parts):
            continue
        before = page.read_text(encoding='utf-8')
        html = BLOCK.sub('', before)
        if not re.search(r'</head\s*>', html, re.I):
            continue
        tags = [START]
        if not re.search(r'<link\b[^>]*\brel=[\"\']manifest[\"\']', html, re.I):
            tags.append('<link rel="manifest" href="/manifest.webmanifest">')
        if not re.search(r'<link\b[^>]*\brel=[\"\']apple-touch-icon[\"\']', html, re.I):
            tags.append('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">')
        for name, value in (
            ('apple-mobile-web-app-capable', 'yes'),
            ('mobile-web-app-capable', 'yes'),
            ('apple-mobile-web-app-title', 'Formula X'),
            ('apple-mobile-web-app-status-bar-style', 'default'),
            ('theme-color', '#081229'),
        ):
            if not re.search(r'<meta\b[^>]*\bname=[\"\']' + re.escape(name) + r'[\"\']', html, re.I):
                tags.append(f'<meta name="{name}" content="{value}">')
        tags.extend([
            f'<link rel="stylesheet" href="/assets/formula-x-install.css?v={versions["css"]}">',
            f'<script defer src="/assets/formula-x-install.js?v={versions["js"]}"></script>',
            END,
        ])
        html = re.sub(r'</head\s*>', lambda match: '\n'.join(tags) + '\n' + match[0], html, count=1, flags=re.I)
        if html != before:
            page.write_text(html, encoding='utf-8')
            changed += 1
    print(f'Formula X phone installation: {changed} HTML pages updated.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path.cwd())
    install(parser.parse_args().root.resolve())
