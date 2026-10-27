"""Private, resumable source uploads. These are not wardrobe pieces or photo assets."""
import hashlib
import json
import os
from pathlib import Path
import re

from storage import media_type

MAX_FILE = 10 * 1024 * 1024
MAX_BATCH = 100 * 1024 * 1024
IDENTIFIER = re.compile(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}')
IMAGE_EXT = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif'}


def identifier(value):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise ValueError('This import reference is invalid. Reopen the import and try again.')
    return value


def folder(store, expected, batch):
    with store.connect() as db:
        instance = store.meta(db, 'instance')
    if not expected or instance != expected:
        raise ValueError('The wardrobe changed. Return to the wardrobe where you started this import.')
    root = store.folder / 'imports'
    target = root / identifier(instance) / identifier(batch)
    for path in (root, target.parent, target, target / 'sources'):
        if path.is_symlink():
            raise ValueError('The import folder must not be a link to another folder.')
    return target


def safe_file(base, name):
    path = base / name
    if path.is_symlink() or not path.resolve().is_relative_to(base.resolve()):
        raise ValueError('The import file must stay in its upload folder.')
    return path


def read_state(base):
    path = safe_file(base, 'sources.json')
    if not path.exists():
        return {'files': [], 'draft': {}}
    if path.stat().st_size > 256 * 1024:
        raise ValueError('The saved import is too large to read.')
    return json.loads(path.read_text())


def write_state(base, state):
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = safe_file(base, 'sources.json')
    temporary = safe_file(base, 'sources.tmp')
    temporary.write_text(json.dumps(state, ensure_ascii=False))
    os.replace(temporary, target)


def result(base, state, batch):
    return {'batchId': batch, 'draft': state.get('draft', {}),
            'files': [{**entry, 'path': str(safe_file(base / 'sources', entry['file']))} for entry in state['files']]}


def get(store, expected, batch):
    base = folder(store, expected, batch)
    state = read_state(base)
    with store.connect() as db:
        row = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id=?", ('assistantImport:' + batch,)).fetchone()
    report = json.loads(row[0]).get('report', {}) if row else {}
    from assistant_import import saved_status
    status = saved_status(store, expected, batch)
    completed = bool(state.get('draft', {}).get('completed') or (status['request']['state'] == 'complete' if status['request'] else report.get('mode') == 'applied' and report.get('committed') is True))
    return {**result(base, state, batch), 'completed': completed}


def upload(store, expected, batch, source_id, name, data):
    identifier(source_id)
    base = folder(store, expected, batch)
    state = read_state(base)
    if not data or len(data) > MAX_FILE:
        raise ValueError('Choose a file under 10 MB.')
    if not isinstance(name, str) or not name or len(name) > 180 or re.search(r'[/\\\x00-\x1f]', name):
        raise ValueError('Use a filename without folders or control characters.')
    extension = Path(name).suffix.lower()
    if extension in ('.png', '.jpg', '.jpeg', '.webp', '.gif'):
        mime = media_type(data)
        if mime not in IMAGE_EXT:
            raise ValueError('This photo could not be read. Choose a JPEG, PNG, WebP, or GIF photo.')
        extension = IMAGE_EXT[mime]
    elif extension in ('.txt', '.csv', '.json'):
        data.decode('utf-8-sig')
        mime = 'text/plain'
    elif extension == '.pdf' and data.startswith(b'%PDF-'):
        mime = 'application/pdf'
    elif extension == '.zip' and data.startswith(b'PK\x03\x04'):
        mime = 'application/zip'  # Stored as source material; never extracted by this endpoint.
    else:
        raise ValueError('Choose JPEG, PNG, WebP, GIF, PDF, TXT, CSV, JSON, or ZIP files. For HEIC photos, export as JPEG first.')
    digest = hashlib.sha256(data).hexdigest()
    old = next((x for x in state['files'] if x['id'] == source_id), None)
    if old:
        if old['sha256'] != digest or old['name'] != name:
            raise ValueError('This upload reference is already in use. Remove it before choosing another file.')
        contents(store, expected, batch, source_id)
        return result(base, state, batch)  # Lost-response retry cannot duplicate or overwrite an upload.
    if len(state['files']) >= 50 or sum(x['size'] for x in state['files']) + len(data) > MAX_BATCH:
        raise ValueError('Use up to 50 files and 100 MB per import. Remove an upload or start a smaller batch.')
    sources = base / 'sources'
    sources.mkdir(parents=True, exist_ok=True, mode=0o700)
    filename = source_id + extension
    destination = safe_file(sources, filename)
    destination.write_bytes(data)
    state['files'].append({'id': source_id, 'name': name, 'file': filename, 'size': len(data), 'mime': mime,
                           'sha256': digest, 'role': 'item' if mime.startswith('image/') else 'reference',
                           'isolate': False, 'steering': ''})
    write_state(base, state)
    return result(base, state, batch)


def update(store, expected, batch, value):
    base = folder(store, expected, batch)
    state = read_state(base)
    if not isinstance(value, dict) or not isinstance(value.get('files', []), list):
        raise ValueError('The upload choices could not be saved.')
    choices = value.get('files', [])
    if len(choices) > 50 or any(not isinstance(x, dict) for x in choices):
        raise ValueError('The upload choices could not be saved.')
    for entry in state['files']:
        choice = next((x for x in choices if x.get('id') == entry['id']), None)
        if choice is None:
            continue
        steering = choice.get('steering', '')
        if not isinstance(steering, str) or len(steering) > 600:
            raise ValueError('Keep each photo note under 600 characters.')
        entry['role'] = 'item' if choice.get('role') == 'item' and entry['mime'].startswith('image/') else 'reference'
        entry['isolate'] = choice.get('isolate') is True and entry['role'] == 'item'
        entry['steering'] = steering.strip()
    draft = value.get('draft', {})
    if not isinstance(draft, dict):
        raise ValueError('The import choices could not be saved.')
    state['draft'] = {key: val for key, val in draft.items() if key in (
        'route', 'method', 'browserHelp', 'store', 'from', 'through', 'count', 'links', 'sourcePath',
        'page', 'pageKind', 'ownership', 'notes', 'completed', 'splitPacks', 'productPhotos') and isinstance(val, (str, int, bool)) and len(str(val)) <= 4000}
    write_state(base, state)
    return result(base, state, batch)


def remove(store, expected, batch, source_id):
    base = folder(store, expected, batch)
    state = read_state(base)
    entry = next((x for x in state['files'] if x['id'] == identifier(source_id)), None)
    if entry:
        state['files'].remove(entry)
        write_state(base, state)
        safe_file(base / 'sources', entry['file']).unlink(missing_ok=True)
    return result(base, state, batch)


def contents(store, expected, batch, source_id):
    base = folder(store, expected, batch)
    state = read_state(base)
    entry = next((x for x in state['files'] if x['id'] == identifier(source_id)), None)
    if not entry:
        raise ValueError('That upload is no longer available. Choose the file again.')
    path = safe_file(base / 'sources', entry['file'])
    if not path.is_file() or path.stat().st_size > MAX_FILE:
        raise ValueError('That upload is unavailable. Choose the file again.')
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != entry['sha256']:
        raise ValueError('That upload changed outside Closet Lint. Choose the original file again.')
    return entry['mime'], data
