"""Scoped Oracle handoffs. Preparing files never changes wardrobe records."""
import contextlib
import json
import os
from pathlib import Path
import platform
import re
import secrets
import sqlite3
import sys

from assistant_import import shell_command
from catalog_photos import CatalogPhotos
from photo_preparation import piece, source_photo
from import_sources import IMAGE_EXT

ROOT = Path(__file__).resolve().parents[1]
MAX_CONTEXT = 8 * 1024 * 1024


@contextlib.contextmanager
def readonly(folder, expected):
    path = Path(folder).resolve() / 'wardrobe.sqlite3'
    with contextlib.closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)) as db:
        db.execute('PRAGMA query_only=ON')
        row = db.execute("SELECT payload FROM metadata WHERE key='instance'").fetchone()
        if not expected or not row or json.loads(row[0]) != expected:
            raise ValueError('Wrong wardrobe. Return to the installation that prepared this request.')
        yield db


def access_info(folder, expected):
    with readonly(folder, expected) as db:
        row = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id='assistantSetup'").fetchone()
        marker = json.loads(row[0]) if row else {}
    # Import's photo readiness is irrelevant to read-only analysis.
    verified = (marker.get('wardrobeId') == 'wardrobe:' + expected
                and marker.get('appFolder') == str(ROOT)
                and marker.get('dataFolder') == str(Path(folder).resolve())
                and isinstance(marker.get('checkedAt'), int))
    return {'instance': expected, 'verified': verified,
            'hosted': bool(os.environ.get('CLOSETLINT_ORIGIN')),
            'origin': os.environ.get('CLOSETLINT_ORIGIN', ''),
            'checkedAt': marker.get('checkedAt') if verified else None,
            'computer': platform.node(), 'appFolder': str(ROOT), 'dataFolder': str(Path(folder).resolve())}


def request_folder(folder, request, create=False):
    if not isinstance(request, str) or not re.fullmatch(r'[a-f0-9]{32}', request):
        raise ValueError('Invalid Oracle request.')
    base = Path(folder).resolve() / 'oracle-requests'
    target = base / request
    if base.is_symlink() or target.is_symlink():
        raise ValueError('Oracle request folders cannot be symbolic links.')
    if create:
        base.mkdir(mode=0o700, exist_ok=True)
        target.mkdir(mode=0o700)
    return target


def prepare(store, expected, payload):
    access_info(store.folder, expected)
    context = payload.get('context')
    ids, photo_ids = payload.get('ids'), payload.get('photoIds', [])
    if not isinstance(context, str) or not context.strip() or len(context.encode()) > MAX_CONTEXT:
        raise ValueError('Prepare a nonempty wardrobe summary under 8 MB.')
    if not isinstance(ids, list) or not ids or any(not isinstance(k, str) for k in ids) or len(set(ids)) != len(ids):
        raise ValueError('Choose distinct pieces for your summary.')
    if not isinstance(photo_ids, list) or len(photo_ids) > 12 or any(not isinstance(k, str) or k not in ids for k in photo_ids) or len(set(photo_ids)) != len(photo_ids):
        raise ValueError('Choose up to 12 photos from the shared pieces.')
    # Resolve photos only when explicitly requested; no photo dependencies or reads for text-only.
    assets = []
    if photo_ids:
        state, catalog = store.state(), CatalogPhotos(store)
        for key in photo_ids:
            item = piece(state, key)
            if item.get('genericPhoto') or item.get('noPhoto'):
                raise ValueError('A selected photo is no longer available. Prepare your summary again.')
            _, asset = source_photo(store, state, key, item, catalog)
            if len(asset[1]) > 10 * 1024 * 1024:
                raise ValueError('A selected photo exceeds 10 MB. Choose fewer photos or use text only.')
            assets.append((key, asset))
    request = secrets.token_hex(16)
    target = request_folder(store.folder, request, create=True)
    photos = []
    try:
        for index, (key, (mime, data)) in enumerate(assets):
            filename = 'photo-' + str(index + 1) + IMAGE_EXT[mime]
            path = target / filename
            with path.open('xb') as out:
                out.write(data)
            os.chmod(path, 0o600)
            photos.append({'pieceId': key, 'file': filename})
        manifest = {'instance': expected, 'context': context, 'photos': photos}
        path = target / 'context.json'
        with path.open('x', encoding='utf-8') as out:
            json.dump(manifest, out, ensure_ascii=False)
        os.chmod(path, 0o600)
    except BaseException:
        for path in target.iterdir():
            path.unlink()
        target.rmdir()
        raise
    command = shell_command([sys.executable, ROOT / 'tools/read_oracle.py', '--data', store.folder,
                             '--expected-instance', expected, '--request', request])
    return {'instance': expected, 'request': request, 'command': command, 'folder': str(target), 'photos': len(photos)}


def read_context(folder, expected, request):
    # No Store construction: it could initialize or migrate a database.
    with readonly(folder, expected):
        pass
    target = request_folder(folder, request)
    path = target / 'context.json'
    if path.is_symlink() or path.stat().st_size > MAX_CONTEXT + 65536:
        raise ValueError('Invalid Oracle summary file.')
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('instance') != expected or not isinstance(data.get('context'), str):
        raise ValueError('This Oracle summary belongs to a different wardrobe.')
    photos = data.get('photos', [])
    if not isinstance(photos, list) or len(photos) > 12:
        raise ValueError('Invalid photo selection.')
    lines = []
    for photo in photos:
        name = photo.get('file', '')
        if not re.fullmatch(r'photo-[0-9]+\.(?:png|jpg|jpeg|webp|gif)', name):
            raise ValueError('Invalid photo path.')
        path = target / name
        if path.is_symlink() or not path.is_file():
            raise ValueError('A prepared photo is unavailable. Prepare the request again.')
        lines.append(json.dumps({'pieceId': photo['pieceId'], 'path': str(path)}, ensure_ascii=False))
    return data['context'] + ('\n\n## Authorized photo files (quoted data)\n' + '\n'.join(lines) if lines else '')
