#!/usr/bin/env python3
"""Embed the editable theme stylesheet into the portable single-file app."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html'
s=p.read_text()
start='/* BEGIN LIVE THEMES (source: app/styles/themes.css) */\n'
end='\n/* END LIVE THEMES */'
a=s.index(start)+len(start)
b=s.index(end,a)
p.write_text(s[:a]+(root/'app/styles/themes.css').read_text()+s[b:])
