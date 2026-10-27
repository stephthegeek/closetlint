"""Local wardrobe storage. Standard library only; no wardrobe data belongs in source."""
import contextlib
import base64
import binascii
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import stat
import struct
import uuid
import zipfile

COLLECTIONS = ('edits', 'custom', 'outfits', 'views', 'measurements', 'profile',
               'ratings', 'blocks', 'trips', 'drafts', 'wishrank')
ASSET_ID = re.compile(r'[0-9a-f]{32}\Z')
MAX_ARCHIVE = 512 * 1024 * 1024
MAX_JSON = 32 * 1024 * 1024
MAX_ASSET = 32 * 1024 * 1024
UNSAFE_KEYS = {'__proto__', 'constructor', 'prototype'}


def validate_json(value):
    """Bound recursive data and reject keys unsafe for JavaScript object merges."""
    pending = [(value, 0)]
    count = 0
    while pending:
        item, depth = pending.pop()
        count += 1
        if depth > 48 or count > 500000:
            raise ValueError('Wardrobe data is too deeply nested or complex')
        if isinstance(item, (dict, list)) and count + len(pending) + len(item) > 500000:
            raise ValueError('Wardrobe data is too large or complex')
        if isinstance(item, dict):
            if any(not isinstance(k, str) or k in UNSAFE_KEYS for k in item):
                raise ValueError('Wardrobe data contains an unsafe object key')
            pending.extend((v, depth + 1) for v in item.values())
        elif isinstance(item, list):
            pending.extend((v, depth + 1) for v in item)
    encode(value)


def decode(data):
    try:
        def object_pairs(pairs):
            result = {}
            for key, value in pairs:
                if key in UNSAFE_KEYS or key in result:
                    raise ValueError('JSON contains duplicate or unsafe object keys')
                result[key] = value
            return result
        value = json.loads(data, object_pairs_hook=object_pairs)
        validate_json(value)
        return value
    except (RecursionError, UnicodeError) as error:
        raise ValueError('Invalid or excessively nested JSON') from error


def validate_piece(record):
    """Validate common piece fields; retain legacy string tags for migration."""
    if not isinstance(record, dict):
        raise ValueError('Invalid wardrobe piece')
    for key in ('name', 'meta', 'sub', 'size', 'sizeKind', 'source', 'url', 'photoId', 'photoFrom', 'fitsLike'):
        if key in record and not isinstance(record[key], str):
            raise ValueError('Invalid piece text field: ' + key)
    for key in ('colors', 'seasons', 'styles', 'looks', 'fits', 'stretch', 'neckline', 'pattern', 'material', 'details', 'shoefeat', 'eartags', 'jfeat', 'jmetal', 'lens'):
        if key in record and not (isinstance(record[key], str) or isinstance(record[key], list) and all(isinstance(v, str) for v in record[key])):
            raise ValueError('Invalid piece tags: ' + key)
    if 'laundry' in record and not isinstance(record['laundry'], bool):
        raise ValueError('Invalid laundry status')
    if 'care' in record:
        care = record['care']
        if not isinstance(care, dict) or any(k in care and (not isinstance(care[k], str) or len(care[k]) > (1000 if k == 'note' else 100)) for k in ('wash', 'dry', 'note')):
            raise ValueError('Invalid care instructions')
    # Retain the legacy archive ceiling so existing galleries/backups remain readable.
    # New photo additions and assistant imports use a ten-view product limit.
    if 'photos' in record and (not isinstance(record['photos'], list) or len(record['photos']) > 12 or any(not isinstance(p, dict) or not isinstance(p.get('photoId'), str) or not ASSET_ID.fullmatch(p['photoId']) for p in record['photos'])):
        raise ValueError('Invalid piece photo list')


def validate_board(board):
    if not isinstance(board, dict) or not isinstance(board.get('pieces'), list) or len(board['pieces']) > 1000 or any(not isinstance(p, dict) or not isinstance(p.get('id'), str) for p in board['pieces']):
        raise ValueError('Board must contain a list of pieces with IDs')


def require_safe_pillow():
    import PIL
    try:
        version = tuple(int(p) for p in PIL.__version__.split('.')[:3])
    except ValueError:
        version = ()
    if version < (13, 0, 0):
        raise ValueError('Photo tools need Pillow 13.0.0 or newer. Update the optional photo environment before processing images.')


def encode(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def doc_key(collection, doc_id):
    if collection not in COLLECTIONS or not isinstance(doc_id, str) or not doc_id or doc_id in UNSAFE_KEYS or len(doc_id) > 512 or any(c in doc_id for c in '/\\\x00'):
        raise ValueError('Invalid collection or record ID')


def validate_base(base):
    if not isinstance(base, dict) or not isinstance(base.get('catalog'), list) or not isinstance(base.get('tags'), dict) or not isinstance(base.get('bundles'), list):
        raise ValueError('Full backup must include catalog, tags and bundle IDs')
    if any(not isinstance(p, dict) or not isinstance(p.get('id'), str) for p in base['catalog']):
        raise ValueError('Invalid catalog pieces')
    if len({p['id'] for p in base['catalog']}) != len(base['catalog']):
        raise ValueError('Duplicate catalog piece IDs')
    for piece in base['catalog']:
        doc_key('custom', piece['id'])
        validate_piece(piece)
    for record_id, tags in base['tags'].items():
        doc_key('edits', record_id)
        validate_piece(tags)
    if any(not isinstance(x, str) or not ASSET_ID.fullmatch(x) for x in base['bundles']):
        raise ValueError('Invalid photo bundle ID')
    return {key: base[key] for key in ('catalog', 'tags', 'bundles')}


def extract_base(html_path):
    text = Path(html_path).read_text(encoding='utf-8')
    base = {}
    for key in ('catalog', 'tags', 'bundles'):
        match = re.search(r'<script\b[^>]*\bid=[\"\']' + key + r'[\"\'][^>]*>(.*?)</script>', text, re.S | re.I)
        if not match:
            raise ValueError('Source HTML is missing ' + key)
        base[key] = decode(match.group(1))
    return validate_base(base)


def media_type(data):
    if len(data) > MAX_ASSET:
        raise ValueError('Photo is too large')
    mime, width, height = None, 0, 0
    if len(data) >= 33 and data.startswith(b'\x89PNG\r\n\x1a\n') and data[8:16] == b'\x00\x00\x00\rIHDR':
        mime = 'image/png'
        width, height = struct.unpack('>II', data[16:24])
    elif len(data) >= 13 and data.startswith((b'GIF87a', b'GIF89a')):
        mime = 'image/gif'
        width, height = struct.unpack('<HH', data[6:10])
    elif data.startswith(b'\xff\xd8\xff'):
        pos = 2
        while pos + 4 <= len(data):
            if data[pos] != 255:
                break
            while pos < len(data) and data[pos] == 255:
                pos += 1
            if pos >= len(data):
                break
            marker = data[pos]; pos += 1
            if marker in (0xD9, 0xDA):
                break
            if marker == 0x01 or 0xD0 <= marker <= 0xD7:
                continue
            if pos + 2 > len(data):
                break
            length = int.from_bytes(data[pos:pos+2], 'big')
            if length < 2 or pos + length > len(data):
                break
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF) and length >= 8:
                height, width = struct.unpack('>HH', data[pos+3:pos+7]); mime = 'image/jpeg'
                break
            pos += length
    elif len(data) >= 30 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        kind = data[12:16]
        if kind == b'VP8X':
            width, height = (1 + int.from_bytes(data[24:27], 'little'), 1 + int.from_bytes(data[27:30], 'little'))
        elif kind == b'VP8 ' and data[23:26] == b'\x9d\x01\x2a':
            width, height = (int.from_bytes(data[26:28], 'little') & 0x3fff, int.from_bytes(data[28:30], 'little') & 0x3fff)
        elif kind == b'VP8L' and data[20] == 0x2f:
            bits = int.from_bytes(data[21:25], 'little')
            width, height = ((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
        mime = 'image/webp'
    if mime:
        if not width or not height or width * height > 40_000_000 or max(width, height) > 20000:
            raise ValueError('Photo dimensions are invalid or exceed the 40 megapixel limit')
        return mime
    try:
        value = decode(data)
        if isinstance(value, dict):
            for image in value.values():
                if not isinstance(image, str):
                    raise ValueError('Invalid photo bundle')
                match = re.fullmatch(r'data:(image/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\s]+)', image)
                if not match or media_type(base64.b64decode(re.sub(r'\s', '', match[2]), validate=True)) != match[1]:
                    raise ValueError('Photo bundles must contain supported raster photos')
            return 'application/json'
    except (ValueError, UnicodeError, binascii.Error):
        pass
    raise ValueError('Unsupported photo or photo bundle format')


def references(value):
    """Collect explicit photo fields, not unrelated 32-character identifiers."""
    found = set()
    if isinstance(value, dict):
        photo = value.get('photoId')
        if isinstance(photo, str) and ASSET_ID.fullmatch(photo):
            found.add(photo)
        for child in value.values():
            found.update(references(child))
    elif isinstance(value, list):
        for child in value:
            found.update(references(child))
    return found


def validate_payload(payload, asset_ids):
    validate_json(payload)
    if not isinstance(payload, dict) or payload.get('kind') != 'full-backup':
        raise ValueError('Choose a full backup, not a partial data export')
    base = validate_base(payload.get('base'))
    if payload.get('formatVersion', 0) not in (0, 1):
        raise ValueError('Unsupported backup format version')
    cols = payload.get('collections')
    if not isinstance(cols, dict) or set(cols) != set(COLLECTIONS):
        raise ValueError('Full backup must contain all eleven collections')
    for col, records in cols.items():
        if not isinstance(records, dict):
            raise ValueError('Invalid collection')
        for record_id, record in records.items():
            doc_key(col, record_id)
            if not isinstance(record, dict):
                raise ValueError('Invalid wardrobe record')
            if col in ('custom', 'edits'):
                validate_piece(record)
            if col == 'outfits' and 'pieces' in record:
                validate_board(record)
    board = payload.get('board')
    if board is not None:
        validate_board(board)
    required = references([cols, base, board]) | set(base['bundles'])
    photo_map = cols['profile'].get('photoMap', {}).get('map', {})
    if isinstance(photo_map, dict):
        for entry in photo_map.values():
            if isinstance(entry, list) and entry and isinstance(entry[0], str) and ASSET_ID.fullmatch(entry[0]):
                required.add(entry[0])
    missing = required - set(asset_ids)
    if missing:
        raise ValueError(f'Backup is missing {len(missing)} referenced photo file(s)')
    encode(payload)  # Reject non-finite numbers before any write.
    return {'collections': len(cols), 'records': sum(len(v) for v in cols.values()),
            'catalogPieces': len(base['catalog']), 'photos': len(asset_ids),
            'hasBoard': bool(board), 'formatVersion': payload.get('formatVersion', 0)}


class Archive:
    def __init__(self, path):
        self.zip = zipfile.ZipFile(path)
        try:
            infos = self.zip.infolist()
            if len(infos) > 20000 or len({i.filename for i in infos}) != len(infos) or sum(i.file_size for i in infos) > MAX_ARCHIVE:
                raise ValueError('Backup is too large or has duplicate entries')
            if any(i.flag_bits & 1 for i in infos):
                raise ValueError('Encrypted backups are not supported')
            if any(stat.S_ISLNK(i.external_attr >> 16) for i in infos):
                raise ValueError('Symlinks are not supported in backups')
            self.assets = {}
            for info in infos:
                name = info.filename
                if name in ('backup.json', 'README.txt'):
                    if info.file_size > MAX_JSON:
                        raise ValueError('Backup metadata is too large')
                    continue
                match = re.fullmatch(r'(?:photos|catalog-photos)/([0-9a-f]{32})(?:\.[a-z0-9]+)?', name)
                if not match or info.file_size > MAX_ASSET or match[1] in self.assets:
                    raise ValueError('Invalid or duplicate backup file')
                self.assets[match[1]] = name
            self.payload = decode(self.zip.read('backup.json'))
            self.summary = validate_payload(self.payload, self.assets)
            # Force CRC and content validation before showing a restore preview.
            for asset_id in self.assets:
                media_type(self.read_asset(asset_id))
        except BaseException:
            self.zip.close()
            raise

    def read_asset(self, asset_id):
        return self.zip.read(self.assets[asset_id])

    def close(self):
        self.zip.close()


class Folder:
    """Import the verified legacy backup folder; read it, never modify it."""
    def __init__(self, folder):
        folder = Path(folder).resolve()
        if any(not (folder / name).resolve().is_relative_to(folder) for name in ('backup.json', 'index.html')):
            raise ValueError('Backup metadata must stay inside the import folder')
        if (folder / 'backup.json').stat().st_size > MAX_JSON or (folder / 'index.html').stat().st_size > MAX_ARCHIVE:
            raise ValueError('Backup folder metadata is too large')
        self.payload = decode((folder / 'backup.json').read_text())
        self.payload['base'] = extract_base(folder / 'index.html')
        self.assets = {p.name: p for p in (folder / '_blob').iterdir() if p.is_file() and ASSET_ID.fullmatch(p.name)}
        if any(not p.resolve().is_relative_to(folder) or p.stat().st_size > MAX_ASSET for p in self.assets.values()):
            raise ValueError('Backup photos must stay inside the import folder and size limits')
        if sum(p.stat().st_size for p in self.assets.values()) > MAX_ARCHIVE:
            raise ValueError('Backup folder is too large')
        self.summary = validate_payload(self.payload, self.assets)
        for asset_id in self.assets:
            media_type(self.read_asset(asset_id))

    def read_asset(self, asset_id):
        return self.assets[asset_id].read_bytes()


class Store:
    def __init__(self, folder):
        self.folder = Path(folder).resolve()
        self.folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = self.folder / 'wardrobe.sqlite3'
        with self.connect() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS documents(collection TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(collection,id));
                CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);
                CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, payload TEXT NOT NULL);
            ''')
            defaults = {'instance': uuid.uuid4().hex, 'revision': 0,
                        'base': {'catalog': [], 'tags': {}, 'bundles': []}, 'board': None}
            for key, value in defaults.items():
                db.execute('INSERT OR IGNORE INTO metadata VALUES (?,?)', (key, encode(value)))
        os.chmod(self.path, 0o600)

    @contextlib.contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=60)
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def meta(db, key):
        return json.loads(db.execute('SELECT payload FROM metadata WHERE key=?', (key,)).fetchone()[0])

    @staticmethod
    def put_meta(db, key, value):
        db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)', (key, encode(value)))

    def bump(self, db):
        self.put_meta(db, 'revision', self.meta(db, 'revision') + 1)

    def state(self):
        with self.connect() as db:
            db.execute('BEGIN')
            result = {'collections': {c: {} for c in COLLECTIONS}}
            for col, record_id, payload in db.execute('SELECT collection,id,payload FROM documents'):
                result['collections'][col][record_id] = json.loads(payload)
            for key in ('base', 'board', 'revision', 'instance'):
                result[key] = self.meta(db, key)
            result['photos'] = db.execute('SELECT count(*) FROM assets').fetchone()[0]
            return result

    def set_record(self, col, record_id, record):
        doc_key(col, record_id)
        if not isinstance(record, dict):
            raise ValueError('Record must be an object')
        validate_json(record)
        if col in ('custom', 'edits'):
            validate_piece(record)
        if col == 'outfits' and 'pieces' in record:
            validate_board(record)
        data = encode(record)
        if len(data.encode()) > 2 * 1024 * 1024:
            raise ValueError('Record is too large')
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', (col, record_id, data))
            self.bump(db)

    def delete_record(self, col, record_id):
        doc_key(col, record_id)
        with self.connect() as db:
            db.execute('DELETE FROM documents WHERE collection=? AND id=?', (col, record_id))
            self.bump(db)

    def set_board(self, board):
        validate_json(board)
        validate_board(board)
        if len(encode(board).encode()) > 4 * 1024 * 1024:
            raise ValueError('Board is too large')
        with self.connect() as db:
            self.put_meta(db, 'board', board)
            self.bump(db)

    def upload(self, data):
        if not data or len(data) > MAX_ASSET:
            raise ValueError('Photo is empty or too large')
        mime = media_type(data)
        if not mime.startswith('image/'):
            raise ValueError('Upload must be a photo')
        asset_id = uuid.uuid4().hex
        with self.connect() as db:
            db.execute('INSERT INTO assets VALUES (?,?,?)', (asset_id, mime, data))
            self.bump(db)
        return asset_id

    def asset(self, asset_id):
        if not ASSET_ID.fullmatch(asset_id):
            return None
        with self.connect() as db:
            return db.execute('SELECT mime,data FROM assets WHERE id=?', (asset_id,)).fetchone()

    def snapshot(self):
        folder = self.folder / 'recovery'
        folder.mkdir(exist_ok=True, mode=0o700)
        path = folder / ('before-restore-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S-') + uuid.uuid4().hex[:8] + '.sqlite3')
        with self.connect() as db, sqlite3.connect(path) as dest:
            db.backup(dest)
        os.chmod(path, 0o600)
        return path

    def restore(self, source, *, replace=False):
        validate_payload(source.payload, source.assets)
        existing = self.state()
        occupied = any(existing['collections'].values()) or existing['base']['catalog'] or existing['photos'] or existing['board']
        if occupied and not replace:
            raise ValueError('This wardrobe already has data; replacement must be explicit')
        recovery = self.snapshot() if occupied else None
        # Documents, catalog, photos and board change together, or not at all.
        with self.connect() as db:
            db.execute('DELETE FROM documents')
            db.execute('DELETE FROM assets')
            for col, records in source.payload['collections'].items():
                db.executemany('INSERT INTO documents VALUES (?,?,?)', [(col, key, encode(value)) for key, value in records.items()])
            for asset_id in source.assets:
                data = source.read_asset(asset_id)
                db.execute('INSERT INTO assets VALUES (?,?,?)', (asset_id, media_type(data), data))
            self.put_meta(db, 'base', validate_base(source.payload['base']))
            self.put_meta(db, 'board', source.payload.get('board'))
            self.bump(db)
        return recovery

    def export(self, target):
        # One read transaction makes the manifest and assets a consistent snapshot.
        with self.connect() as db:
            db.execute('BEGIN')
            cols = {c: {} for c in COLLECTIONS}
            for col, record_id, payload in db.execute('SELECT collection,id,payload FROM documents'):
                cols[col][record_id] = json.loads(payload)
            payload = {'app': 'closet-lint', 'kind': 'full-backup', 'formatVersion': 1,
                       'exportedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'collections': cols,
                       'board': self.meta(db, 'board'), 'base': self.meta(db, 'base')}
            asset_ids = [r[0] for r in db.execute('SELECT id FROM assets')]
            validate_payload(payload, asset_ids)
            with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_STORED) as archive:
                archive.writestr('backup.json', encode(payload))
                archive.writestr('README.txt', 'Private Closet Lint full backup. Includes all collections, catalog, tags, photos and the open outfit board. Restore through the local app. Keep this file private.\n')
                extensions = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'application/json': '.json'}
                for asset_id, mime, data in db.execute('SELECT id,mime,data FROM assets'):
                    directory = 'catalog-photos' if mime == 'application/json' else 'photos'
                    archive.writestr(f'{directory}/{asset_id}{extensions[mime]}', data)
            return {'records': sum(map(len, cols.values())), 'photos': len(asset_ids)}

    def verification(self):
        state = self.state()
        with self.connect() as db:
            hashes = {key: hashlib.sha256(data).hexdigest() for key, data in db.execute('SELECT id,data FROM assets')}
            integrity = db.execute('PRAGMA integrity_check').fetchone()[0]
        return {'collections': {key: len(value) for key, value in state['collections'].items()},
                'photos': state['photos'], 'catalogPieces': len(state['base']['catalog']),
                'integrity': integrity, 'assetHashes': hashes}
