#!/usr/bin/env python3
"""Embed manual laundry and care controls in the portable app."""
import argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'app/closet-lint.html'
s=p.read_text()
a='/* BEGIN LAUNDRY (source: app/scripts/laundry.js) */\n'
b='/* END LAUNDRY */'
if a not in s:
    s=s.replace('/* ---------- Closet Lint shell behavior ---------- */',a+b+'\n\n/* ---------- Closet Lint shell behavior ---------- */',1)
i=s.index(a)+len(a);j=s.index(b,i)
s=s[:i]+(ROOT/'app/scripts/laundry.js').read_text()+s[j:]
args=argparse.ArgumentParser();args.add_argument('--check',action='store_true');options=args.parse_args()
if options.check:
    if s!=p.read_text():raise SystemExit('Laundry source is out of sync')
else:p.write_text(s)
