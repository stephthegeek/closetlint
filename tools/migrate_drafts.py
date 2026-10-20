"""One-time, transactional conversion of legacy boards to saved outfits."""
import argparse
import json
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Store, encode


def migrate(store):
    with store.connect() as db:
        count = db.execute("SELECT count(*) FROM documents WHERE collection='drafts'").fetchone()[0]
    if not count:
        return {'converted': 0, 'outfits': [], 'recovery': None}
    recovery = store.snapshot()
    result = []
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        drafts = list(db.execute("SELECT id,payload FROM documents WHERE collection='drafts' ORDER BY id"))
        existing = {key: json.loads(value) for key, value in db.execute("SELECT id,payload FROM documents WHERE collection='outfits'")}
        names = {str(doc.get('name', '')).casefold() for doc in existing.values()}
        for draft_id, payload in drafts:
            draft = json.loads(payload)
            if not isinstance(draft.get('pieces'), list):
                raise ValueError('A legacy board has invalid pieces; nothing migrated')
            doc = {key: value for key, value in draft.items() if key not in ('id', 'at')}
            base_name = str(doc.get('name') or 'Recovered outfit').strip() or 'Recovered outfit'
            name, suffix = base_name, 2
            while name.casefold() in names:
                name = f'{base_name} ({suffix})'
                suffix += 1
            names.add(name.casefold())
            doc['name'] = name
            doc['updatedAt'] = draft.get('at') or int(time.time() * 1000)
            key, suffix = 'recovered-' + draft_id, 2
            while key in existing:
                key = f'recovered-{draft_id}-{suffix}'
                suffix += 1
            db.execute("INSERT INTO documents VALUES ('outfits',?,?)", (key, encode(doc)))
            # Delete only after the entire original document has been copied successfully.
            db.execute("DELETE FROM documents WHERE collection='drafts' AND id=?", (draft_id,))
            existing[key] = doc
            result.append({'id': key, 'name': name, 'pieces': len(doc['pieces'])})
        store.bump(db)
    return {'converted': len(result), 'outfits': result, 'recovery': str(recovery)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', required=True)
    args = parser.parse_args()
    print(json.dumps(migrate(Store(args.data)), indent=2))
