#!/usr/bin/env python3
"""Unpack the app's "Full backup (data + photos)" zip into a folder you can serve locally.

    python3 tools/backup_to_local.py closet-full-backup-YYYY-MM-DD.zip OUTDIR [--html path/to/app.html]

Writes:
  OUTDIR/_blob/<32-hex id>         every photo and catalog photo bundle, named exactly as the app requests it
                                    (the app fetches "/_blob/<id>" with no extension)
  OUTDIR/db/<collection>/<doc>.json one file per database document, same layout as an ArtifactData export
  OUTDIR/db/_board.json             the board that was open when the backup was made
  OUTDIR/index.html                 a copy of --html if given

Then: cd OUTDIR && python3 -m http.server 8000  and open http://localhost:8000/
Without the Claude runtime the page has no database, so it opens read-only (or in public-snapshot
mode if the html has a baked "pubdata" block). Photos resolve because /_blob/<id> exists.
"""
import json, os, re, shutil, sys, zipfile

def main(argv):
    if len(argv) < 3:
        print(__doc__); return 2
    src, out = argv[1], argv[2]
    html = argv[argv.index('--html') + 1] if '--html' in argv else None
    os.makedirs(os.path.join(out, '_blob'), exist_ok=True)
    n_photos = 0
    with zipfile.ZipFile(src) as z:
        for name in z.namelist():
            m = re.match(r'^(photos|catalog-photos)/([0-9a-f]{32})(\.[a-z0-9]+)?$', name)
            if m:
                with z.open(name) as f, open(os.path.join(out, '_blob', m.group(2)), 'wb') as g:
                    shutil.copyfileobj(f, g)
                n_photos += 1
        data = json.loads(z.read('backup.json').decode('utf8'))
    cols = data.get('collections', {})
    n_docs = 0
    for col, docs in cols.items():
        d = os.path.join(out, 'db', col)
        os.makedirs(d, exist_ok=True)
        for doc_id, doc in (docs or {}).items():
            with open(os.path.join(d, doc_id + '.json'), 'w', encoding='utf8') as f:
                json.dump(doc, f, ensure_ascii=False, indent=1)
            n_docs += 1
    with open(os.path.join(out, 'db', '_board.json'), 'w', encoding='utf8') as f:
        json.dump(data.get('board'), f, ensure_ascii=False, indent=1)
    if html:
        shutil.copy(html, os.path.join(out, 'index.html'))
    print('photos:', n_photos, 'docs:', n_docs, 'collections:', sorted(cols))
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
