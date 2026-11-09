#!/usr/bin/env python3
"""Embed the shared loading indicator in the portable app."""
import argparse
from pathlib import Path
root = Path(__file__).resolve().parents[1]
page = root / 'app/closet-lint.html'
text = page.read_text()
start = '/* BEGIN LOADING STATUS (source: app/scripts/loading-status.js) */\n'
end = '/* END LOADING STATUS */'
if start not in text:
    anchor = '/* BEGIN PHOTO FETCH (source:'
    assert anchor in text
    text = text.replace(anchor, start + end + '\n\n' + anchor, 1)
i = text.index(start) + len(start)
j = text.index(end, i)
text = text[:i] + (root / 'app/scripts/loading-status.js').read_text() + text[j:]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
if parser.parse_args().check:
    if text != page.read_text():
        raise SystemExit('Loading indicator source is out of sync')
else:
    page.write_text(text)
