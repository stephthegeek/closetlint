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

# The setup sheet styles are editable independently of the portable HTML.
style_start='/* BEGIN SETUP STYLES (source: app/styles/setup.css) */\n'
style_end='\n/* END SETUP STYLES */'
s=p.read_text()
if style_start not in s:
 marker='/* END LIVE THEMES */'
 s=s.replace(marker,marker+'\n\n'+style_start+style_end,1)
a=s.index(style_start)+len(style_start);b=s.index(style_end,a)
p.write_text(s[:a]+(root/'app/styles/setup.css').read_text()+s[b:])
