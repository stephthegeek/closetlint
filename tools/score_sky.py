#!/usr/bin/env python3
"""Create a private sky scoring report using a read-only wardrobe connection."""
import argparse
import json
from pathlib import Path
import sqlite3
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True, help='Local wardrobe data folder')
    parser.add_argument('--date', required=True, help='Scoring date in your local time zone, YYYY-MM-DD')
    parser.add_argument('--out', type=Path, required=True, help='Private output folder; never the public source tree')
    parser.add_argument('--exclude-collection', action='append', default=[], help='Profile collection ID to omit from this report, such as an installed sample collection')
    args = parser.parse_args()
    source_root = Path(__file__).resolve().parents[1]
    output = args.out.resolve()
    if output == source_root or source_root in output.parents:
        parser.error('Keep personal scoring reports outside the source tree')
    database = (args.data / 'wardrobe.sqlite3').resolve()
    with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as db:
        db.execute('PRAGMA query_only=ON')
        db.execute('BEGIN')
        base = json.loads(db.execute("SELECT payload FROM metadata WHERE key='base'").fetchone()[0])
        collections = {key: {} for key in ('custom', 'edits', 'ratings', 'profile')}
        for col, record_id, payload in db.execute("SELECT collection,id,payload FROM documents WHERE collection IN ('custom','edits','ratings','profile')"):
            collections[col][record_id] = json.loads(payload)
        exclude_ids = set()
        for collection_id in args.exclude_collection:
            group = collections['profile'].get(collection_id)
            if not group or group.get('kind') != 'piece-collection':
                parser.error('Unknown piece collection: ' + collection_id)
            exclude_ids.update(group.get('ids', []))
        fields = set('id name title meta sub looks styles colors pattern details statement fits kind length material neckline functional wish fav wears stored hidden gone removed'.split())
        def piece(value):
            return {k: v for k, v in value.items() if k in fields}
        base = {'catalog': [piece(p) for p in base['catalog']], 'tags': {k: piece(v) for k, v in base['tags'].items()}}
        for col in ('custom', 'edits'):
            collections[col] = {k: piece(v) for k, v in collections[col].items()}
        # Keep only scoring inputs: no measurements, profile sizes, photos,
        # purchase records, URLs, or unrelated personal settings.
        cleanup = collections['profile'].get('cleanup', {}).get('map', {})
        collections['profile'] = {'cleanup': {'map': {k: piece(v) for k, v in cleanup.items()}}}
        collections['ratings'] = {k: {field: v for field, v in r.items() if field in ('ids', 'r', 'acc')} for k, r in collections['ratings'].items()}
    request = {'date': args.date, 'snapshot': {'base': base, 'collections': collections}, 'excludeIds': sorted(exclude_ids)}
    run = subprocess.run(['node', str(source_root / 'tools/sky_report.js')], input=json.dumps(request), text=True, capture_output=True, check=True)
    report = json.loads(run.stdout)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name, content in [('scores.json', json.dumps(report['result'], indent=2) + '\n'), ('index.html', report['html'])]:
        target = output / name
        target.write_text(content)
        target.chmod(0o600)
    result = report['result']
    print(json.dumps({'report': str(output / 'index.html'), 'date': args.date,
                      'scoringVersion': result['scoringVersion'],
                      'readings': {key: {'sign': reading['sign']['name'], 'signKind': reading['sign']['kind'], 'emerging': reading['sign']['emerging'], 'winner': next((c['name'] for c in reading['constellations'] if c['id'] == reading['winner']), None),
                                        'ready': reading['ready'], 'qualifyingCount': reading['qualifyingCount'], 'minimum': reading['minimum']}
                                   for key, reading in result['readings'].items()}}, indent=2))


if __name__ == '__main__':
    main()
