"""Prepare and review photos for existing pieces; never import or retag a piece."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

from storage import decode, encode, media_type, validate_piece
from import_sources import folder, identifier, safe_file, IMAGE_EXT
from catalog_photos import CatalogPhotos
from photo_environment import environment

MAX_ZIP = 100 * 1024 * 1024
PHOTO_KEYS = ('photoId', 'photoFrom', 'photoOf', 'photos', 'noPhoto', 'ar', 'bg', 'genericPhoto')


def digest(value):
    return hashlib.sha256(encode(value).encode()).hexdigest()


def read_json(path):
    if path.stat().st_size > 256 * 1024:
        raise ValueError('The photo request is too large.')
    return decode(path.read_bytes())


def write_json(base, name, value):
    target = safe_file(base, name)
    temporary = safe_file(base, name + '.tmp')
    temporary.write_text(encode(value), encoding='utf-8')
    os.replace(temporary, target)


def location(store, instance, request):
    return folder(store, instance, 'photos-' + identifier(request))


def state_from(db, store):
    cols = {c: {} for c in ('custom', 'edits', 'profile')}
    for col, key, payload in db.execute("SELECT collection,id,payload FROM documents WHERE collection IN ('custom','edits','profile')"):
        cols[col][key] = decode(payload)
    return {'collections': cols, 'base': store.meta(db, 'base')}


def piece(state, key):
    cols = state['collections']
    source = cols['custom'].get(key[2:]) if key.startswith('c-') else next((p for p in state['base']['catalog'] if p['id'] == key), None)
    if source is None:
        raise ValueError('A selected piece no longer exists. Choose your pieces again.')
    value = {**source, **state['base']['tags'].get(key, {})}
    value.update(cols['profile'].get('cleanup', {}).get('map', {}).get(key, {}))
    edit = cols['edits'].get(key, {})
    value.update(edit)
    mapped = cols['profile'].get('photoMap', {}).get('map', {}).get(key)
    if not key.startswith('c-') and not value.get('photoId') and not edit.get('noPhoto') and mapped:
        value.update(photoId=mapped[0], ar=mapped[1], noPhoto=False)
    if value.get('removed'):
        raise ValueError('A selected piece was deleted. Its photos have not changed.')
    return value


def photo_stamp(value):
    return digest({k: value[k] for k in PHOTO_KEYS if k in value})


def source_photo(store, state, key, item, catalog):
    photo_id = item.get('photoId')
    if photo_id and any(p.get('photoId') == photo_id and p.get('kind') == 'carelabel' for p in item.get('photos', [])):
        raise ValueError('Choose a product photo as the main photo first; care labels are not product photos.')
    asset = store.asset(photo_id) if photo_id else None
    if not photo_id and not item.get('noPhoto'):
        urls = catalog.refresh(state['base']['bundles'])
        url = urls.get(item.get('photoFrom') or key) or urls.get(item.get('photoOf'))
        if url:
            photo_id = url.rsplit('/', 1)[-1]
            asset = catalog.asset(photo_id)
    if not asset or asset[0] not in IMAGE_EXT:
        raise ValueError('Each selected piece needs a saved main photo. Add one, then try again.')
    return photo_id, asset


def create(store, instance, request, ids, notes=None):
    base = location(store, instance, request)
    if not isinstance(ids, list) or not 1 <= len(ids) <= 50 or any(not isinstance(k, str) for k in ids) or len(set(ids)) != len(ids):
        raise ValueError('Select between 1 and 50 different existing pieces.')
    notes = notes or {}
    if not isinstance(notes, dict) or any(k not in ids or not isinstance(v, str) or len(v) > 600 for k, v in notes.items()):
        raise ValueError('Keep each photo note under 600 characters.')
    saved = safe_file(base, 'request.json')
    if saved.exists():
        previous = read_json(saved)
        if [p['id'] for p in previous['pieces']] != ids or previous['notes'] != notes:
            raise ValueError('This photo request already belongs to another selection. Start a new request.')
        return info(store, instance, request)
    state = store.state()
    catalog, entries, sources = CatalogPhotos(store), [], {}
    for key in ids:
        item = piece(state, key)
        photo_id, asset = source_photo(store, state, key, item, catalog)
        filename = 'source-' + photo_id + IMAGE_EXT[asset[0]]
        sources[filename] = asset[1]
        entries.append({'id': key, 'name': item.get('name', 'Piece'), 'colors': item.get('colors', []),
                        'note': notes.get(key, ''), 'source': filename, 'original': photo_id,
                        'sourceSha256': hashlib.sha256(asset[1]).hexdigest(),
                        'stamp': photo_stamp(item), 'ar': item.get('ar', 1)})
    if sum(map(len, sources.values())) > MAX_ZIP:
        raise ValueError('These photos are too large for one request. Select fewer pieces.')
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name, data in sources.items():
        safe_file(base, name).write_bytes(data)
    write_json(base, 'request.json', {'requestId': request, 'instance': instance, 'pieces': entries, 'notes': notes})
    return info(store, instance, request)


def info(store, instance, request):
    base = location(store, instance, request)
    value = read_json(safe_file(base, 'request.json'))
    # Return only the small photo request; tags, history, and unrelated records stay private.
    with store.connect() as db:
        row = db.execute('SELECT payload FROM metadata WHERE key=?', ('photoPreparation:' + request,)).fetchone()
    return {**value, 'folder': str(base), 'saved': decode(row[0]) if row else None}


def source_zip(store, instance, request):
    value = info(store, instance, request)
    base = location(store, instance, request)
    target = io.BytesIO()
    public = {k: value[k] for k in ('requestId', 'instance', 'pieces')}
    public['pieces'] = [{k: p[k] for k in ('id', 'name', 'colors', 'note', 'source')} for p in value['pieces']]
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('request.json', encode(public))
        for name in sorted({p['source'] for p in value['pieces']}):
            z.writestr(name, safe_file(base, name).read_bytes())
    return target.getvalue()


def filename(name):
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,179}', name) or name in ('request.json', 'review.json') or name.startswith(('source-', 'prepared-')):
        raise ValueError('Returned photos need simple filenames without folders, such as blue-socks.png.')
    return name


def manifest(base, request):
    value = read_json(safe_file(base, 'results.json'))
    if not isinstance(value, dict) or value.get('requestId') != request['requestId'] or value.get('instance') != request['instance']:
        raise ValueError('These photos belong to a different request or wardrobe.')
    rows = value.get('photos')
    if not isinstance(rows, list) or not 1 <= len(rows) <= len(request['pieces']):
        raise ValueError('Return one photo or an explanation for each requested piece.')
    allowed = {p['id'] for p in request['pieces']}
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) - {'id', 'file', 'note'} or not isinstance(row.get('id'), str) or row['id'] not in allowed or row['id'] in seen:
            raise ValueError('Results must contain each existing piece ID at most once, with photo fields only.')
        seen.add(row['id'])
        if 'file' in row:
            filename(row['file'])
        if not isinstance(row.get('note', ''), str) or len(row.get('note', '')) > 1000:
            raise ValueError('Keep photo explanations short.')
        if not row.get('file') and not row.get('note'):
            raise ValueError('Include a photo or explain why it could not be prepared.')
    return value


def receive(store, instance, request, data):
    base = location(store, instance, request)
    original = info(store, instance, request)
    if original['saved']:
        raise ValueError('This request is already saved. Start a new request to change photos again.')
    if len(data) > MAX_ZIP:
        raise ValueError('Choose a photo ZIP under 100 MB.')
    # Validate the whole archive before touching the staged request.
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z, tempfile.TemporaryDirectory() as temporary:
            stage = Path(temporary)
            members = [m for m in z.infolist() if not m.is_dir()]
            if len(members) > 51 or len({m.filename for m in members}) != len(members) or sum(m.file_size for m in members) > MAX_ZIP:
                raise ValueError('The photo ZIP is too large or has duplicate filenames.')
            for member in members:
                name = filename(member.filename)
                if member.file_size > 32 * 1024 * 1024 or (member.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError('The photo ZIP contains an invalid file.')
                (stage / name).write_bytes(z.read(member))
            value = manifest(stage, original)
            for row in value['photos']:
                if row.get('file'):
                    media_type(safe_file(stage, row['file']).read_bytes())
            for row in value['photos']:
                if row.get('file'):
                    safe_file(base, row['file']).write_bytes((stage / row['file']).read_bytes())
            write_json(base, 'results.json', value)
    except (zipfile.BadZipFile, KeyError, OSError) as error:
        raise ValueError('Could not read this photo ZIP. Include results.json and the individual photos.') from error
    return review(store, instance, request)


def normalize(base):
    from piece_import import prepare_image
    request = read_json(safe_file(base, 'request.json'))
    value = manifest(base, request)
    rows = []
    for row in value['photos']:
        if not row.get('file'):
            rows.append(row)
            continue
        path = safe_file(base, row['file'])
        photo, (mime, data), _, _ = prepare_image({'file': path.name, 'kind': 'recast'}, base.resolve())
        name = 'prepared-' + photo['photoId'] + IMAGE_EXT[mime]
        safe_file(base, name).write_bytes(data)
        rows.append({'id': row['id'], 'note': row.get('note', ''), 'file': name,
                     'photo': photo, 'sha256': hashlib.sha256(data).hexdigest(), 'mime': mime})
    value = {'photos': rows}
    value['token'] = digest(value)
    write_json(base, 'review.json', value)


def review(store, instance, request):
    base = location(store, instance, request)
    value = info(store, instance, request)
    if value['saved'] or not safe_file(base, 'results.json').exists():
        return {**value, 'photos': []}
    manifest(base, value)
    config = environment(store.folder)
    python = config['python'] if config else sys.executable
    try:
        result = subprocess.run([python, str(Path(__file__).resolve()), '--normalize', str(base)], capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ValueError('Photo checking could not finish. Check optional photo tools setup, then retry.') from error
    if result.returncode:
        try:
            message = decode(result.stdout)['error']
        except (ValueError, KeyError):
            message = 'Photo checking failed. Check optional photo tools setup, then retry.'
        raise ValueError(message)
    checked = read_json(safe_file(base, 'review.json'))
    return {**value, **checked}


def image(store, instance, request, key, prepared=False):
    base = location(store, instance, request)
    value = info(store, instance, request)
    rows = read_json(safe_file(base, 'review.json'))['photos'] if prepared else value['pieces']
    row = next((p for p in rows if p['id'] == key), None)
    if not row:
        raise ValueError('Photo not found in this request.')
    data = safe_file(base, row['file'] if prepared else row['source']).read_bytes()
    return media_type(data), data


def apply(store, instance, request, token, ids):
    base = location(store, instance, request)
    original = info(store, instance, request)
    if not isinstance(ids, list) or not ids or any(not isinstance(k, str) for k in ids) or len(set(ids)) != len(ids):
        raise ValueError('Choose the photos you want to save.')
    selection = sorted(ids)
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if store.meta(db, 'instance') != instance:
            raise ValueError('The wardrobe changed. No photos were saved.')
        row = db.execute('SELECT payload FROM metadata WHERE key=?', ('photoPreparation:' + request,)).fetchone()
        if row:
            receipt = decode(row[0])
            if receipt['ids'] != selection or receipt['token'] != token:
                raise ValueError('This request was already saved with a different selection.')
            return receipt
        checked = read_json(safe_file(base, 'review.json'))
        if not token or token != checked['token']:
            raise ValueError('The prepared photos changed. Check and review them again before saving.')
        sources = {p['id']: p for p in original['pieces']}
        candidates = {p['id']: p for p in checked['photos'] if p.get('photo')}
        if any(key not in candidates or key not in sources for key in selection):
            raise ValueError('Choose only reviewed photos from this request.')
        state = state_from(db, store)
        for key in selection:
            item, candidate, source = piece(state, key), candidates[key], sources[key]
            if photo_stamp(item) != source['stamp']:
                raise ValueError('The photos for ' + item.get('name', 'a piece') + ' changed. Start a new photo request for it; no photos were saved.')
            data = safe_file(base, candidate['file']).read_bytes()
            if hashlib.sha256(data).hexdigest() != candidate['sha256'] or media_type(data) != candidate['mime']:
                raise ValueError('A reviewed photo changed. Check the photos again; no photos were saved.')
            original_data = safe_file(base, source['source']).read_bytes()
            if hashlib.sha256(original_data).hexdigest() != source['sourceSha256']:
                raise ValueError('A source photo changed in the request folder. Start a new request; no photos were saved.')
            photos = list(item.get('photos', []))
            if not any(p['photoId'] == source['original'] for p in photos):
                photos.insert(0, {'photoId': source['original'], 'ar': source['ar'], 'kind': 'unclassified'})
            if not any(p['photoId'] == candidate['photo']['photoId'] for p in photos):
                photos.append(candidate['photo'])
            if len(photos) > 12 or sum(p.get('kind') != 'carelabel' for p in photos) > 10:
                raise ValueError('The photo gallery for ' + item.get('name', 'a piece') + ' is full. Remove an unused photo, then retry.')
            # Patch the latest edits, never a stale copy of tags or history.
            edit = {**state['collections']['edits'].get(key, {}), 'photos': photos,
                    'photoId': candidate['photo']['photoId'], 'ar': candidate['photo']['ar'],
                    'noPhoto': False, 'bg': '', 'genericPhoto': False}
            validate_piece(edit)
            db.execute('INSERT OR IGNORE INTO assets VALUES (?,?,?)', (source['original'], media_type(original_data), original_data))
            db.execute('INSERT OR IGNORE INTO assets VALUES (?,?,?)', (candidate['photo']['photoId'], candidate['mime'], data))
            db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('edits', key, encode(edit)))
        receipt = {'ids': selection, 'token': token, 'saved': len(selection)}
        store.put_meta(db, 'photoPreparation:' + request, receipt)
        store.bump(db)
    return receipt


if __name__ == '__main__':
    try:
        if len(sys.argv) != 3 or sys.argv[1] != '--normalize':
            raise ValueError('Use the photo review in Closet Lint to save prepared photos.')
        normalize(Path(sys.argv[2]).resolve())
    except Exception as error:
        print(encode({'error': str(error)}))
        sys.exit(1)
