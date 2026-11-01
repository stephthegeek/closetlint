#!/usr/bin/env python3
"""Embed the recent-wear component in the portable app."""
from pathlib import Path
import argparse
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html';text=p.read_text()
start='/* BEGIN RECENT WEARS (source: app/scripts/recent-wears.js) */\n';end='\n/* END RECENT WEARS */'
a=text.index(start)+len(start);b=text.index(end,a)
result=text[:a]+(root/'app/scripts/recent-wears.js').read_text()+text[b:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
 if result!=text:raise SystemExit('Recent wears are out of sync')
else:p.write_text(result)
