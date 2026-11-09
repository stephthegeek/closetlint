#!/usr/bin/env python3
"""Embed the maintained Deleted pieces interface in the portable app."""
import argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1];p=root/'app/closet-lint.html';s=p.read_text()
a='/* BEGIN DELETED PIECES (source: app/scripts/deleted-pieces.js) */\n';b='/* END DELETED PIECES */'
if a not in s:
 i=s.index('function openDeleted(){');j=s.index('/* ---------- item form (edit + add) ---------- */',i)
 s=s[:i]+a+b+'\n\n'+s[j:]
i=s.index(a)+len(a);j=s.index(b,i);s=s[:i]+(root/'app/scripts/deleted-pieces.js').read_text()+s[j:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
if parser.parse_args().check:
 if s!=p.read_text():raise SystemExit('Deleted pieces source is out of sync')
else:p.write_text(s)
