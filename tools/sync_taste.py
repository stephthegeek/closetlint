#!/usr/bin/env python3
"""Embed the editable My taste analysis and styles into the portable app."""
import argparse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def synced(text):
    for name, source, anchor in [('MY TASTE', 'app/scripts/taste.js', None), ('MY TASTE STYLES', 'app/styles/taste.css', '</style>')]:
        start = f'/* BEGIN {name} (source: {source}) */\n'
        end = f'/* END {name} */'
        if start not in text:
            assert anchor in text
            text = text.replace(anchor, start + end + '\n' + anchor, 1)
        a = text.index(start) + len(start)
        b = text.index(end, a)
        text = text[:a] + (ROOT / source).read_text() + text[b:]
    return text
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'app/closet-lint.html'
    before = path.read_text()
    after = synced(before)
    if args.check:
        if before != after:
            raise SystemExit('My taste sources are out of sync; run python3 tools/sync_taste.py')
    else:
        path.write_text(after)
