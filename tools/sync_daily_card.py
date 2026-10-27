#!/usr/bin/env python3
"""Embed the separately developed daily-card feature in the portable HTML."""
import argparse
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def block(text, start, end, value, anchor):
    if start not in text:
        text = text.replace(anchor, start + end + '\n' + anchor, 1)
    a = text.index(start) + len(start)
    b = text.index(end, a)
    return text[:a] + value + text[b:]

def synced(text):
    lines = json.dumps(json.loads((ROOT / 'app/content/linty/daily-lines.json').read_text()), ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    js = 'var DAILY_LINES=' + lines + ';\n' + (ROOT / 'app/scripts/daily-card.js').read_text() + '\n' + (ROOT / 'app/scripts/daily-card-ui.js').read_text()
    text = block(text, '/* BEGIN DAILY CARD STYLES */\n', '\n/* END DAILY CARD STYLES */', (ROOT / 'app/styles/daily-card.css').read_text(), '</style>')
    return block(text, '/* BEGIN DAILY CARD */\n', '\n/* END DAILY CARD */', js, '/* BEGIN SKY (sources:')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'app/closet-lint.html'
    text = path.read_text()
    result = synced(text)
    if args.check:
        if result != text:
            raise SystemExit('Daily card sources are out of sync; run python3 tools/sync_daily_card.py')
    else:
        path.write_text(result)
