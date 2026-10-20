#!/usr/bin/env python3
"""Embed the editable setup/import script in the portable app."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html';s=p.read_text()
start='/* BEGIN SETUP (source: app/scripts/setup.js) */\n';end='\n/* END SETUP */'
if start not in s:
 s=s.replace('/* ---------- Closet Lint shell behavior ---------- */',start+end+'\n\n/* ---------- Closet Lint shell behavior ---------- */')
a=s.index(start)+len(start);b=s.index(end,a)
p.write_text(s[:a]+(root/'app/scripts/setup.js').read_text()+s[b:])
