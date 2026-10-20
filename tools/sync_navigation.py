#!/usr/bin/env python3
"""Embed the editable routing module in the portable app."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html';s=p.read_text()
start='/* BEGIN NAVIGATION (source: app/scripts/navigation.js) */\n';end='\n/* END NAVIGATION */'
if start not in s:
 s=s.replace('initShell();\nwireBoard();',start+end+'\n\ninitShell();\nwireBoard();')
a=s.index(start)+len(start);b=s.index(end,a)
p.write_text(s[:a]+(root/'app/scripts/navigation.js').read_text()+s[b:])
