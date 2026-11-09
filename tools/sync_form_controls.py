#!/usr/bin/env python3
"""Embed the opt-in shared form controls in the portable app."""
from pathlib import Path
import argparse
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html'
s=p.read_text()
for label,name,anchor in [('FORM CONTROL STYLES','app/styles/form-controls.css','</style>'),('FORM CONTROLS','app/scripts/form-controls.js','/* BEGIN CATEGORIES (source:')]:
    start=f'/* BEGIN {label} (source: {name}) */\n'
    end=f'/* END {label} */'
    if start not in s:
        at=s.index(anchor)
        s=s[:at]+start+end+'\n\n'+s[at:]
    a=s.index(start)+len(start);b=s.index(end,a)
    s=s[:a]+(root/name).read_text()+s[b:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
    if s!=p.read_text():raise SystemExit('Shared form controls need synchronization')
else:p.write_text(s)
