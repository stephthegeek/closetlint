#!/usr/bin/env python3
"""Embed the owner-selected control icon module in the portable app."""
from pathlib import Path
import argparse
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html';s=p.read_text()
start='/* BEGIN CONTROL ICONS (source: app/scripts/control-icons.js) */\n';end='\n/* END CONTROL ICONS */'
if start not in s:s=s.replace('function buttonText(',start+end+'\nfunction buttonText(',1)
a=s.index(start)+len(start);b=s.index(end,a)
result=s[:a]+(root/'app/scripts/control-icons.js').read_text()+s[b:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
 if result!=p.read_text():raise SystemExit('Control icons are out of sync')
else:p.write_text(result)
