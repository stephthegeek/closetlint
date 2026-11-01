#!/usr/bin/env python3
"""Embed existing-piece photo preparation in the portable app."""
import argparse
from pathlib import Path
root = Path(__file__).resolve().parents[1]
page = root / 'app/closet-lint.html'
text = page.read_text()
for label, source, before in (
    ('PHOTO PREPARATION', 'app/scripts/photo-preparation.js', '/* ---------- Closet Lint shell behavior ---------- */'),
    ('PHOTO PREPARATION STYLES', 'app/styles/photo-preparation.css', '/* END LIVE THEMES */'),
):
    start, end = f'/* BEGIN {label} (source: {source}) */\n', f'/* END {label} */'
    if start not in text:
        inserted = before + '\n\n' + start + end if label.endswith('STYLES') else start + end + '\n\n' + before
        text = text.replace(before, inserted, 1)
    i = text.index(start) + len(start)
    j = text.index(end, i)
    text = text[:i] + (root / source).read_text() + text[j:]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
if parser.parse_args().check:
    if text != page.read_text():
        raise SystemExit('Photo preparation source is out of sync')
else:
    page.write_text(text)
