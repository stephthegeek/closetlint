#!/usr/bin/env python3
"""Keep the outfit naming engine embedded in the portable app."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html'
s=p.read_text();start='/* BEGIN OUTFIT NAMING */\n';end='/* END OUTFIT NAMING */'
a=s.index(start)+len(start);b=s.index(end,a)
out=s[:a]+(root/'app/scripts/outfit-naming.js').read_text()+'\n'+s[b:]
if '--check' in sys.argv:
    if out!=s:raise SystemExit('Run python3 tools/sync_outfit_naming.py')
else:p.write_text(out)
