"""Keep the title and tag review embedded in the portable app."""
from pathlib import Path
import argparse
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html';text=p.read_text()
for label,source,before in [('TIDY DETAILS','app/scripts/tidy-details.js','/* ---------- Closet Lint shell behavior ---------- */'),('TIDY DETAILS STYLES','app/styles/tidy-details.css','/* END LIVE THEMES */')]:
 start=f'/* BEGIN {label} (source: {source}) */\n';end=f'/* END {label} */'
 if start not in text:text=text.replace(before,(before+'\n\n'+start+end if label.endswith('STYLES') else start+end+'\n\n'+before),1)
 a=text.index(start)+len(start);b=text.index(end,a);text=text[:a]+(root/source).read_text()+text[b:]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
if parser.parse_args().check:
 if text!=p.read_text():raise SystemExit('Run python3 tools/sync_tidy_details.py')
else:p.write_text(text)
