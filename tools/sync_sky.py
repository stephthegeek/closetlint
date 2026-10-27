#!/usr/bin/env python3
"""Embed the Sky scorer, configuration, interface, and styles into the portable app."""
import argparse
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/closet-lint.html'
def block(text,start,end,content,anchor):
    if start not in text:text=text.replace(anchor,start+end+'\n'+anchor,1)
    a=text.index(start)+len(start);b=text.index(end,a)
    return text[:a]+content+text[b:]
def synced(text):
    catalog={key:json.loads((root/'app/content/sky'/file).read_text())[key] for key,file in [('stars','stars.json'),('constellations','constellations.json')]}
    catalog['scoring']=json.loads((root/'app/content/sky/scoring.json').read_text())
    catalog['searchLinks']=json.loads((root/'app/content/sky/search-links.json').read_text())
    catalog['shareCopy']=json.loads((root/'app/content/sky/share-copy.json').read_text())
    config=json.dumps(catalog,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    js='var SKY_CATALOG='+config+';\n'+(root/'app/scripts/sky.js').read_text()+'\n'+(root/'app/scripts/sky-ui.js').read_text()
    text=block(text,'/* BEGIN SKY STYLES (source: app/styles/sky.css) */\n','\n/* END SKY STYLES */',(root/'app/styles/sky.css').read_text(),'</style>')
    return block(text,'/* BEGIN SKY (sources: app/scripts/sky.js, app/scripts/sky-ui.js, app/content/sky/) */\n','\n/* END SKY */',js,'/* BEGIN NAVIGATION (source: app/scripts/navigation.js) */')
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
s=p.read_text();out=synced(s)
if args.check:
    if out!=s:raise SystemExit('Sky embedded sources are out of sync; run python3 tools/sync_sky.py')
else:p.write_text(out)
