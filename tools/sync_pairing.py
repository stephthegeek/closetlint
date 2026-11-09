"""Keep pairing preferences embedded in the portable app."""
from pathlib import Path
import argparse
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html';s=p.read_text()
start='/* BEGIN LAB PAIRING (source: app/scripts/lab-pairing.js) */\n';end='/* END LAB PAIRING */'
if start not in s:s=s.replace('function labBlock(o){',start+end+'\nfunction labBlock(o){',1)
a=s.index(start)+len(start);b=s.index(end,a);out=s[:a]+(root/'app/scripts/lab-pairing.js').read_text()+s[b:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
    if out!=s:raise SystemExit('Run python3 tools/sync_pairing.py')
else:p.write_text(out)
