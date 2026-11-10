"""Install the invitation UI after the legacy lesson bundle overwrites the teacher page."""
from pathlib import Path

portal = Path('profesori/index.html')
invite_html = Path('assets/fx-invite-group.html')
join_js = Path('assets/fx-invite-join.js')
teacher_js = Path('assets/fx-invite-profesor.js')
for required in (portal, invite_html, join_js, teacher_js):
    if not required.is_file():
        raise SystemExit(f'Missing invitation dependency: {required}')
page = portal.read_text(encoding='utf-8')
tag = '<script defer src="/assets/fx-invite-profesor.js?v=1"></script>'
if tag not in page:
    if '</body>' not in page:
        raise SystemExit('Missing end of teacher page')
    page = page.replace('</body>', tag + '\n</body>', 1)
    portal.write_text(page, encoding='utf-8')
target = Path('grup/index.html')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(invite_html.read_text(encoding='utf-8'), encoding='utf-8')
payment_js = Path('assets/fx-private-payments.js')
if not payment_js.is_file():
    raise SystemExit('Missing private payments script')
payment_tag = '<script defer src="/assets/fx-private-payments.js?v=1"></script>'
if payment_tag not in page:
    page = page.replace('</body>', payment_tag + '\n</body>', 1)
    portal.write_text(page, encoding='utf-8')

print('Automatic group invitations installed in teacher portal and /grup/')
