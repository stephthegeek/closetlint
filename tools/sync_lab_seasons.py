#!/usr/bin/env python3
"""Keep the pure Lab season rules embedded in the portable app."""
from pathlib import Path
import argparse
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'app/closet-lint.html';text=p.read_text();start='/* BEGIN LAB SEASONS */\n';end='/* END LAB SEASONS */'
block=start+(ROOT/'app/scripts/lab-seasons.js').read_text()+'\n'+end+'\n'
if start in text:
    a=text.index(start);b=text.index(end,a)+len(end)+1;out=text[:a]+block+text[b:]
else:out=text.replace('var LAB_NEUTRAL=',block+'var LAB_NEUTRAL=',1)
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
    if out!=text:raise SystemExit('Run python3 tools/sync_lab_seasons.py')
else:p.write_text(out)
