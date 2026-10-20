#!/usr/bin/env python3
"""Make a code-only copy of the app: empties the four embedded data blocks and changes nothing else.

    python3 tools/strip_embedded_data.py full-app.html app/closet-lint.html

Blocks emptied: pubdata -> null, catalog -> [], tags -> {}, bundles -> [].
Fails loudly if any block is missing or duplicated, so a changed file layout is noticed.
"""
import re, sys
BLOCKS = (('pubdata', 'null'), ('catalog', '[]'), ('tags', '{}'), ('bundles', '[]'))

def strip(s):
    for bid, empty in BLOCKS:
        pat = re.compile(r'(<script type="application/json" id="%s">).*?(</script>)' % bid, re.S)
        n = len(pat.findall(s))
        if n != 1:
            raise SystemExit('expected exactly one %s block, found %d' % (bid, n))
        s = pat.sub(lambda m: m.group(1) + empty + m.group(2), s, count=1)
    return s

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(2)
    out = strip(open(sys.argv[1], encoding='utf8').read())
    open(sys.argv[2], 'w', encoding='utf8').write(out)
    print('wrote', sys.argv[2], len(out), 'bytes')
