#!/usr/bin/env python3
"""Embed the maintained category visibility controls in the portable app."""
import argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html'
s=p.read_text()
a='/* BEGIN CATEGORIES (source: app/scripts/categories.js) */\n';b='/* END CATEGORIES */'
if a not in s:s=s.replace('function catSelect(it){',a+b+'\nfunction catSelect(it){',1)
i=s.index(a)+len(a);j=s.index(b,i)
s=s[:i]+(root/'app/scripts/categories.js').read_text()+s[j:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
    if s!=p.read_text():raise SystemExit('Category source is out of sync')
else:p.write_text(s)
