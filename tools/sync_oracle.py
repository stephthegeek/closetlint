#!/usr/bin/env python3
"""Embed the read-only Closet Oracle without any AI provider dependency."""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def block(text, start, end, content, anchor):
    if start not in text:
        assert anchor in text
        text = text.replace(anchor, start + end + '\n\n' + anchor, 1)
    a = text.index(start) + len(start)
    b = text.index(end, a)
    return text[:a] + content + text[b:]

def synced(text):
    text = block(text, '/* BEGIN ORACLE STYLES (source: app/styles/oracle.css) */\n', '\n/* END ORACLE STYLES */', (ROOT / 'app/styles/oracle.css').read_text(), '</style>')
    return block(text, '/* BEGIN CLOSET ORACLE (source: app/scripts/oracle.js) */\n', '\n/* END CLOSET ORACLE */', (ROOT / 'app/scripts/oracle.js').read_text(), '/* BEGIN SETUP (source:')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'app/closet-lint.html'
    text = path.read_text()
    result = synced(text)
    if args.check:
        if result != text:
            raise SystemExit('Oracle sources are out of sync; run python3 tools/sync_oracle.py')
    else:
        path.write_text(result)
