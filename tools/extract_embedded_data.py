#!/usr/bin/env python3
"""Pull the four embedded data blocks out of a full app file into JSON files (private data!).

    python3 tools/extract_embedded_data.py full-app.html OUTDIR
"""
import json, os, re, sys
if len(sys.argv) != 3:
    print(__doc__); sys.exit(2)
s = open(sys.argv[1], encoding='utf8').read()
os.makedirs(sys.argv[2], exist_ok=True)
for bid in ('catalog', 'tags', 'bundles', 'pubdata'):
    m = re.search(r'<script type="application/json" id="%s">(.*?)</script>' % bid, s, re.S)
    if not m:
        print('missing', bid); continue
    data = json.loads(m.group(1).replace('<\\/', '</'))
    json.dump(data, open(os.path.join(sys.argv[2], bid + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(bid, 'ok')
