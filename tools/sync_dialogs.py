#!/usr/bin/env python3
"""Keep shared modal dismissal embedded in the portable app."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
page = root / 'app/closet-lint.html'
text = page.read_text()
start = '/* BEGIN DIALOGS (source: app/scripts/dialogs.js) */\n'
end = '\n/* END DIALOGS */'
a = text.index(start) + len(start)
b = text.index(end, a)
source = (root / 'app/scripts/dialogs.js').read_text()
if '--check' in sys.argv:
    if text[a:b] != source:
        raise SystemExit('Run python3 tools/sync_dialogs.py')
else:
    page.write_text(text[:a] + source + text[b:])
