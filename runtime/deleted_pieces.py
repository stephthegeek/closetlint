"""Explicit permanent deletion. Normal piece deletion remains recoverable."""
import base64
import copy
import datetime as dt
import hashlib
import json
import re
import uuid
from storage import COLLECTIONS, WriteConflict, encode, write_version

LEDGER = 'permanentDeletions'
HEX = re.compile(r'(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])')


def mentions(value):
    return set(HEX.findall(encode(value)))


def values(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for key, child in value.items():
            yield key
            yield from values(child)
    elif isinstance(value, list):
        for child in value:
            yield from values(child)


def load(db, store):
    cols = {col: {} for col in COLLECTIONS}
    for col, key, payload in db.execute('SELECT collection,id,payload FROM documents'):
        cols[col][key] = json.loads(payload)
    return {'collections': cols, 'base': store.meta(db, 'base'),
            'board': store.meta(db, 'board'), 'instance': store.meta(db, 'instance')}


def pieces(state):
    cols, base = state['collections'], state['base']
    profile = cols['profile']
    result = {p['id']: dict(p) for p in base['catalog']}
    result.update({'c-' + key: dict(value) for key, value in cols['custom'].items()})
    for key, item in result.items():
        item.update(base['tags'].get(key, {}))
        item.update(profile.get('cleanup', {}).get('map', {}).get(key, {}))
        edit = cols['edits'].get(key, {})
        item.update(edit)
        mapped = profile.get('photoMap', {}).get('map', {}).get(key)
        if not key.startswith('c-') and not item.get('photoId') and not edit.get('noPhoto') and mapped:
            item['photoId'] = mapped[0]
    return result


def protections(state, items):
    cols = state['collections']
    contexts = [('Saved outfit', cols['outfits']), ('Outfit wear history', cols['outfitHistory']),
                ('Trip plan', cols['trips']), ('Saved draft', cols['drafts']),
                ('Current board or draft', state['board'])]
    uses = [(label, set(values(value))) for label, value in contexts]
    result = {}
    for key, item in items.items():
        if not item.get('removed'):
            continue
        reasons = [label for label, ids in uses if key in ids]
        if item.get('wears') or item.get('wearLog'):
            reasons.append('Wear history')
        # A collection is also deliberate saved work, unlike an old Lab rating.
        if any(key in (c.get('ids') or []) for c in cols['profile'].values()
               if isinstance(c, dict) and c.get('kind') == 'piece-collection' and not c.get('deleted')):
            reasons.append('Collection')
        result[key] = reasons
    return result


def ledger(db):
    row = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id=?", (LEDGER,)).fetchone()
    return json.loads(row[0]) if row else {'ids': {}, 'receipts': {}}


def guard_write(db, col, key, value):
    if col == 'profile' and key == LEDGER:
        raise ValueError('Permanent deletion records cannot be edited here.')
    log = ledger(db)
    gone = log.get('ids', {})
    if not gone:
        return
    piece_id = 'c-' + key if col == 'custom' else key if col == 'edits' else None
    if piece_id in gone:
        raise WriteConflict('This piece was permanently deleted. Refresh Closet Lint; it cannot be restored from this tab.')
    if value is not None:
        erased = {asset for receipt in log.get('receipts', {}).values() for asset in receipt.get('removedAssetIds', [])}
        for asset in mentions(value) & erased:
            if not db.execute('SELECT 1 FROM assets WHERE id=?', (asset,)).fetchone():
                raise WriteConflict('A photo in this work was permanently deleted. Refresh Closet Lint or add the photo again.')
    if value is not None and col in ('board', 'outfits', 'outfitHistory', 'trips', 'drafts') and set(values(value)) & set(gone):
        raise WriteConflict('This work includes a permanently deleted piece. Refresh Closet Lint before saving.')


def check_instance(state, instance):
    if not instance or instance != state['instance']:
        raise ValueError('The wardrobe changed. Reopen Deleted pieces in your original wardrobe.')


def selection(ids):
    if not isinstance(ids, list) or not 1 <= len(ids) <= 200 or any(not isinstance(key, str) or not 1 <= len(key) <= 200 for key in ids) or len(set(ids)) != len(ids):
        raise ValueError('Select between 1 and 200 deleted pieces.')
    return sorted(ids)


def inventory(store, instance):
    with store.connect() as db:
        db.execute('BEGIN')
        state = load(db, store)
        check_instance(state, instance)
        items = pieces(state)
        return {'pieces': [{'id': key, 'reasons': reason} for key, reason in protections(state, items).items()]}


def catalog_id(uri):
    match = re.fullmatch(r'data:image/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\s]+)', uri)
    if not match:
        raise ValueError('An older photo bundle could not be checked. Nothing was deleted.')
    return hashlib.sha256(base64.b64decode(re.sub(r'\s', '', match[1]), validate=True)).hexdigest()[:32]


def plan(db, store, state, ids):
    items = pieces(state)
    protected = protections(state, items)
    if any(key not in protected for key in ids):
        raise WriteConflict('A selected piece was restored or removed. Review Deleted pieces again.')
    if any(protected[key] for key in ids):
        raise WriteConflict('A selected piece is used in saved work or wear history. Nothing was deleted.')
    remaining = copy.deepcopy(state)
    cols, base = remaining['collections'], remaining['base']
    chosen = set(ids)
    original_refs = set()
    for key in ids:
        original_refs.update(mentions(items[key]))
        # Include superseded views in the record layers, not just the effective main photo.
        original_refs.update(mentions(state['collections']['edits'].get(key, {})))
        original_refs.update(mentions(next((p for p in state['base']['catalog'] if p['id']==key), {})))
        original_refs.update(mentions(state['base']['tags'].get(key, {})))
        if key.startswith('c-'):
            original_refs.update(mentions(cols['custom'].pop(key[2:], {})))
        cols['edits'].pop(key, None)
        base['tags'].pop(key, None)
    base['catalog'] = [p for p in base['catalog'] if p['id'] not in chosen]
    for field in ('photoMap', 'cleanup'):
        mapping = cols['profile'].get(field, {}).get('map', {})
        for key in ids:
            original_refs.update(mentions(mapping.pop(key, None)))
    # Preserve every other durable asset reference, including cutout sources and photo URLs.
    roots = copy.deepcopy(remaining)
    roots['base']['bundles'] = []
    roots['collections']['profile'].pop(LEDGER, None)
    keep = mentions(roots)
    # A retained piece may use a deleted catalog piece's photograph by its logical key.
    aliases = set()
    for item in pieces(remaining).values():
        aliases.update(item.get(field) for field in ('photoFrom', 'photoOf') if isinstance(item.get(field), str))
    for key in chosen & aliases:
        keep.update(mentions(items[key]))
    bundles = {}
    for key in base['bundles']:
        row = db.execute('SELECT mime,data FROM assets WHERE id=?', (key,)).fetchone()
        if not row or row[0] != 'application/json':
            raise ValueError('An older photo bundle is unavailable. Nothing was deleted.')
        value = json.loads(row[1])
        if not isinstance(value, dict) or any(not isinstance(v, str) for v in value.values()):
            raise ValueError('An older photo bundle could not be checked. Nothing was deleted.')
        bundles[key] = (value, len(row[1]))
    edited, removed_uris, retained_uris = {}, set(), set()
    for key, (value, size) in bundles.items():
        updated = dict(value)
        # A bundle mentioned outside the catalog must remain intact for that reference.
        if key not in keep:
            for piece_id in chosen - aliases:
                uri = updated.get(piece_id)
                if uri is not None and catalog_id(uri) not in keep:
                    removed_uris.add(uri)
                    del updated[piece_id]
        if updated != value:
            edited[key] = encode(updated).encode() if updated else None
        retained_uris.update(updated.values())
    removed_uris -= retained_uris
    assets = {key: (mime, size) for key, mime, size in db.execute('SELECT id,mime,length(data) FROM assets')}
    direct = {key for key in original_refs - keep if key in assets and assets[key][0].startswith('image/')}
    shared = {key for key in original_refs & keep if key in assets and assets[key][0].startswith('image/')}
    old_bundle_ids = set(edited)
    freed = sum(assets[key][1] for key in direct | old_bundle_ids) - sum(len(data) for data in edited.values() if data)
    token = write_version({'state': state, 'ids': ids, 'direct': sorted(direct),
                           'bundles': {k: hashlib.sha256(encode(v[0]).encode()).hexdigest() for k, v in bundles.items()}})
    summary = {'pieceCount': len(ids), 'photoCount': len(direct) + len(removed_uris),
               'photoBytes': max(0, freed), 'sharedPhotoCount': len(shared), 'token': token}
    return remaining, direct, edited, {catalog_id(uri) for uri in removed_uris}, summary


def preview(store, instance, ids):
    ids = selection(ids)
    with store.connect() as db:
        db.execute('BEGIN')
        state = load(db, store)
        check_instance(state, instance)
        return plan(db, store, state, ids)[-1]


def apply(store, instance, ids, token, request, confirm):
    ids = selection(ids)
    if not isinstance(request, str) or not re.fullmatch(r'[A-Za-z0-9_-]{16,80}', request) or confirm != 'delete-permanently':
        raise ValueError('Review and confirm permanent deletion first.')
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        state = load(db, store)
        check_instance(state, instance)
        log = ledger(db)
        prior = log.get('receipts', {}).get(request)
        if prior:
            if prior['ids'] != ids or prior['token'] != token:
                raise ValueError('This deletion receipt belongs to another selection.')
            return prior
        remaining, direct, edits, catalog_removed, summary = plan(db, store, state, ids)
        if not isinstance(token, str) or token != summary['token']:
            raise WriteConflict('Your wardrobe changed since this review. Check the updated counts before deleting.')
        # Write the edited catalog/bundles and remove only the selected piece records together.
        base = remaining['base']
        for old_id, data in edits.items():
            if data:
                new_id = uuid.uuid4().hex
                db.execute('INSERT INTO assets VALUES (?,?,?)', (new_id, 'application/json', data))
                base['bundles'] = [new_id if key == old_id else key for key in base['bundles']]
            else:
                base['bundles'] = [key for key in base['bundles'] if key != old_id]
        for key in ids:
            db.execute("DELETE FROM documents WHERE collection='edits' AND id=?", (key,))
            if key.startswith('c-'):
                db.execute("DELETE FROM documents WHERE collection='custom' AND id=?", (key[2:],))
            log.setdefault('ids', {})[key] = request
        for key in ('cleanup', 'photoMap'):
            value = remaining['collections']['profile'].get(key)
            if value != state['collections']['profile'].get(key):
                db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('profile', key, encode(value)))
        store.put_meta(db, 'base', base)
        for key in direct | set(edits):
            db.execute('DELETE FROM assets WHERE id=?', (key,))
        result = {**summary, 'ids': ids, 'request': request,
                  'removedAssetIds': sorted(direct | set(edits)),
                  'cacheIds': sorted(direct) + ['catalog-' + key for key in sorted(catalog_removed)],
                  'deletedAt': dt.datetime.now(dt.timezone.utc).isoformat()}
        log.setdefault('receipts', {})[request] = result
        db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('profile', LEDGER, encode(log)))
        store.bump(db)
        return result
